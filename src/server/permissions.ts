import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth";
import { prisma } from "../db";
import type { SectionKey } from "../types";

export type CurrentAccess = {
  userId: string;
  globalRoles: string[];
  sections: Array<{ section: SectionKey; role: "lead" | "member" }>;
};

export type AccessResult = { access: CurrentAccess } | { response: NextResponse };
type VerifiedDiscordResult =
  | {
      userId: string;
      user: {
        discordServerVerified: boolean;
        onboardingStatus: "pending" | "verified";
        status: "active" | "inactive" | "invited";
        globalRoles: Array<{ role: { key: string } }>;
        sectionMemberships: Array<{ role: "lead" | "member"; section: { key: SectionKey } }>;
      };
    }
  | { response: NextResponse };

export function isGlobalOperator(access: CurrentAccess) {
  return access.globalRoles.includes("owner") || access.globalRoles.includes("operations_lead");
}

export function canWorkInSection(access: CurrentAccess, section?: SectionKey) {
  if (isGlobalOperator(access)) return true;
  if (!section) return true;
  return access.sections.some((membership) => membership.section === section);
}

export async function requireCurrentUser(): Promise<AccessResult> {
  const result = await requireDiscordVerifiedUser();
  if ("response" in result) return result;

  const { userId, user } = result;
  if (user.onboardingStatus !== "verified" || user.status !== "active") {
    return { response: NextResponse.json({ error: "Dashboard onboarding required" }, { status: 403 }) };
  }

  return {
    access: {
      userId,
      globalRoles: user.globalRoles.map((assignment) => assignment.role.key),
      sections: user.sectionMemberships.map((membership) => ({
        section: membership.section.key,
        role: membership.role,
      })),
    },
  };
}

export async function requireDiscordVerifiedUser(): Promise<VerifiedDiscordResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      discordServerVerified: true,
      onboardingStatus: true,
      status: true,
      globalRoles: { select: { role: { select: { key: true } } } },
      sectionMemberships: {
        select: {
          role: true,
          section: { select: { key: true } },
        },
      },
    },
  });

  if (!user || !user.discordServerVerified) {
    return { response: NextResponse.json({ error: "Discord server verification required" }, { status: 403 }) };
  }

  return { userId, user };
}

export async function requireGlobalOperator(): Promise<AccessResult> {
  const result = await requireCurrentUser();
  if ("response" in result) return result;

  if (!isGlobalOperator(result.access)) {
    return { response: NextResponse.json({ error: "Owner or operations lead access required" }, { status: 403 }) };
  }

  return result;
}

export function deriveCreatedByRole(globalRoles: string[]): "owner" | "operations" {
  return globalRoles.includes("owner") ? "owner" : "operations";
}
