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

export function isGlobalOperator(access: CurrentAccess) {
  return access.globalRoles.includes("owner") || access.globalRoles.includes("operations_lead");
}

export function canWorkInSection(access: CurrentAccess, section?: SectionKey) {
  if (isGlobalOperator(access)) return true;
  if (!section) return true;
  return access.sections.some((membership) => membership.section === section);
}

export async function requireCurrentUser(): Promise<AccessResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      discordServerVerified: true,
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

export async function requireGlobalOperator(): Promise<AccessResult> {
  const result = await requireCurrentUser();
  if ("response" in result) return result;

  if (!isGlobalOperator(result.access)) {
    return { response: NextResponse.json({ error: "Owner or operations lead access required" }, { status: 403 }) };
  }

  return result;
}
