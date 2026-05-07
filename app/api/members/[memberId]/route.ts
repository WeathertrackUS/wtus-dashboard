import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import type { Member, SectionKey } from "../../../../src/types";

const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];

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

export async function PATCH(request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    handle?: string;
    discordUserId?: string;
    sections?: unknown;
  } | null;

  const name = body?.name?.trim();
  const handle = body?.handle?.trim().replace(/^@/, "");
  const discordUserId = body?.discordUserId?.trim();
  const selectedSections = Array.isArray(body?.sections)
    ? body.sections.filter((section): section is SectionKey => typeof section === "string" && sectionKeys.includes(section as SectionKey))
    : [];

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: memberId },
      data: {
        name: name || undefined,
        handle: handle || undefined,
        discordUserId: discordUserId || null,
      },
    });

    const sections = await tx.section.findMany({ where: { key: { in: selectedSections } } });
    await tx.sectionMembership.deleteMany({
      where: {
        userId: memberId,
        role: "member",
      },
    });

    for (const section of sections) {
      await tx.sectionMembership.upsert({
        where: { userId_sectionId: { userId: memberId, sectionId: section.id } },
        update: {},
        create: { userId: memberId, sectionId: section.id, role: "member" },
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: memberId },
      include: {
        globalRoles: { include: { role: true } },
        sectionMemberships: { include: { section: true } },
      },
    });
  });

  return NextResponse.json({ member: toMember(result) });
}
