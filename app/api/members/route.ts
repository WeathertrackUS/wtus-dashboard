import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import type { Member, SectionKey } from "../../../src/types";

const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];
const globalRoleKeys = ["owner", "operations_lead", "member"] as const;

function toMember(user: {
  id: string;
  name: string | null;
  handle: string | null;
  discordHandle: string | null;
  email: string | null;
  discordUserId: string | null;
  onboardingStatus: "pending" | "verified";
  globalRoles: Array<{ role: { key: string } }>;
  sectionMemberships: Array<{ role: "lead" | "member"; section: { key: SectionKey } }>;
}): Member {
  return {
    id: user.id,
    name: user.name ?? "Unnamed member",
    handle: user.handle ?? user.discordHandle ?? user.email ?? "member",
    discordUserId: user.discordUserId ?? undefined,
    onboardingStatus: user.onboardingStatus,
    globalRoles: user.globalRoles.map((assignment) => assignment.role.key),
    sections: user.sectionMemberships.map((membership) => ({
      section: membership.section.key,
      role: membership.role,
    })),
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    handle?: string;
    globalRole?: string;
    section?: string;
    sectionRole?: "lead" | "member";
  } | null;

  const name = body?.name?.trim();
  const handle = body?.handle?.trim().replace(/^@/, "");
  const roleKey = globalRoleKeys.find((role) => role === body?.globalRole) ?? "member";
  const sectionKey = sectionKeys.find((section) => section === body?.section) ?? "nowcasting";
  const sectionRole = body?.sectionRole === "lead" ? "lead" : "member";

  if (!name || !handle) {
    return NextResponse.json({ error: "Name and handle are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const [globalRole, section] = await Promise.all([
      tx.globalRole.findUnique({ where: { key: roleKey } }),
      tx.section.findUnique({ where: { key: sectionKey } }),
    ]);
    const user = await tx.user.create({
      data: {
        name,
        handle,
        status: "invited",
        onboardingStatus: "pending",
      },
    });

    if (globalRole) {
      await tx.userGlobalRole.create({ data: { userId: user.id, roleId: globalRole.id } });
    }

    if (section) {
      await tx.sectionMembership.create({ data: { userId: user.id, sectionId: section.id, role: sectionRole } });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        globalRoles: { include: { role: true } },
        sectionMemberships: { include: { section: true } },
      },
    });
  });

  return NextResponse.json({ member: toMember(result) }, { status: 201 });
}
