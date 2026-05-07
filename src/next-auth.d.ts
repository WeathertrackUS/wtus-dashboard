import type { GlobalRoleKey } from "./generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      discordUserId?: string;
      discordHandle?: string;
      discordServerVerified: boolean;
      onboardingStatus: "pending" | "verified";
      status: "active" | "inactive" | "invited";
      globalRoles: GlobalRoleKey[];
    };
  }
}
