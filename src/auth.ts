import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "./db";
import { resolveSafeRedirectUrl } from "./server/safe-redirect";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [],
  callbacks: {
    async redirect({ url, baseUrl }) {
      return resolveSafeRedirectUrl(url, baseUrl);
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
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "database",
  },
  secret: process.env.AUTH_SECRET,
};
