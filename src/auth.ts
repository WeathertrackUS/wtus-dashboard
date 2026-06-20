import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Account, NextAuthOptions, Profile, User } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./db";
import { resolveSafeRedirectUrl } from "./server/safe-redirect";

const wtusAuthIssuer = process.env.WTUS_AUTH_ISSUER?.trim() || "https://auth.weathertrackus.com";
const wtusAuthClientSecret =
  process.env.WTUS_DASHBOARD_OIDC_CLIENT_SECRET?.trim() ||
  process.env.AUTH_SECRET?.trim() ||
  "";
const discordGuildId = process.env.DISCORD_GUILD_ID;

type DiscordGuild = {
  id?: string;
};

type DiscordProfile = {
  username?: string;
};

async function syncDiscordUser(user: User, account: Account, profile?: Profile) {
  if (!user.id || account.provider !== "discord") return;

  const discordUserId = account.providerAccountId;
  const discordProfile = profile as DiscordProfile | undefined;
  const discordUsername = typeof discordProfile?.username === "string" ? discordProfile.username : null;
  const guildVerified = await isDiscordGuildMember(account.access_token);
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { onboardingStatus: true, status: true },
  });
  const isOnboarded = existingUser?.onboardingStatus === "verified" && existingUser.status === "active";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      discordUserId,
      discordHandle: discordUsername,
      discordServerVerified: guildVerified,
      onboardingStatus: isOnboarded ? "verified" : "pending",
      status: isOnboarded ? "active" : "invited",
    },
  });

  await prisma.discordAccount.upsert({
    where: { discordUserId },
    update: {
      userId: user.id,
      discordUsername,
    },
    create: {
      userId: user.id,
      discordUserId,
      discordUsername,
    },
  });
}

async function isDiscordGuildMember(accessToken?: string) {
  if (!discordGuildId || !accessToken) return false;

  const response = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return false;

  const guilds = (await response.json()) as DiscordGuild[];
  return guilds.some((guild) => guild.id === discordGuildId);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: "https://discord.com/api/oauth2/authorize?scope=identify+email+guilds",
    }),
    {
      id: "wtus-auth",
      name: "WTUS Auth",
      type: "oauth",
      issuer: wtusAuthIssuer,
      clientId: "wtus-dashboard",
      clientSecret: wtusAuthClientSecret,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      checks: [],
      idToken: true,
      profile(profile) {
        const typedProfile = profile as {
          sub?: string;
          name?: string;
          preferred_username?: string;
          email?: string;
          picture?: string;
        };

        return {
          id: typedProfile.sub ?? typedProfile.email ?? "wtus-auth-user",
          name:
            typedProfile.name ??
            typedProfile.preferred_username ??
            typedProfile.email ??
            "WTUS Member",
          email: typedProfile.email ?? null,
          image: typedProfile.picture ?? null,
        };
      },
    },
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      return resolveSafeRedirectUrl(url, baseUrl);
    },
    async signIn({ account, profile, user }) {
      if (account?.provider !== "discord") return true;

      const existingUser = user.id
        ? await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true },
          })
        : null;

      if (existingUser) await syncDiscordUser(user, account, profile);

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const member = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            discordUserId: true,
            discordHandle: true,
            discordServerVerified: true,
            onboardingStatus: true,
            status: true,
            globalRoles: {
              select: {
                role: {
                  select: { key: true },
                },
              },
            },
          },
        });
        session.user.discordUserId = member?.discordUserId ?? undefined;
        session.user.discordHandle = member?.discordHandle ?? undefined;
        session.user.discordServerVerified = member?.discordServerVerified ?? false;
        session.user.onboardingStatus = member?.onboardingStatus ?? "pending";
        session.user.status = member?.status ?? "invited";
        session.user.globalRoles = member?.globalRoles.map((assignment) => assignment.role.key) ?? [];
      }
      return session;
    },
  },
  events: {
    async linkAccount({ user, account }) {
      if (account.provider === "discord") await syncDiscordUser(user, account);
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "database",
  },
  secret: process.env.AUTH_SECRET,
};
