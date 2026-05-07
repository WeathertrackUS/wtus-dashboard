import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./db";

const discordGuildId = process.env.DISCORD_GUILD_ID;

type DiscordGuild = {
  id?: string;
};

type DiscordProfile = {
  username?: string;
};

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
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "discord") return true;
      const discordUserId = account.providerAccountId;
      const discordProfile = profile as DiscordProfile | undefined;
      const discordUsername = typeof discordProfile?.username === "string" ? discordProfile.username : null;
      const guildVerified = await isDiscordGuildMember(account.access_token);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          discordUserId,
          discordHandle: discordUsername,
          discordServerVerified: guildVerified,
          onboardingStatus: guildVerified ? "verified" : "pending",
          status: guildVerified ? "active" : "invited",
          discordAccounts: {
            upsert: {
              where: { discordUserId },
              update: { discordUsername },
              create: { discordUserId, discordUsername },
            },
          },
        },
      });

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const member = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            discordServerVerified: true,
            globalRoles: {
              select: {
                role: {
                  select: { key: true },
                },
              },
            },
          },
        });
        session.user.discordServerVerified = member?.discordServerVerified ?? false;
        session.user.globalRoles = member?.globalRoles.map((assignment) => assignment.role.key) ?? [];
      }
      return session;
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
