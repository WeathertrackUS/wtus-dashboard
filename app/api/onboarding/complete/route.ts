import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { requireCurrentUser } from "../../../../src/server/permissions";
import type { Member, SectionKey } from "../../../../src/types";

const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];

function cleanSections(value: unknown): SectionKey[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SectionKey => typeof item === "string" && sectionKeys.includes(item as SectionKey));
}

export async function POST(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    name?: string;
    handle?: string;
    sections?: unknown;
  } | null;

  const token = body?.token?.trim();
  const name = body?.name?.trim();
  const handle = body?.handle?.trim().replace(/^@/, "");
  const selectedSections = cleanSections(body?.sections);

  if (!token || !name || !handle) {
    return NextResponse.json({ error: "Missing required onboarding fields" }, { status: 400 });
  }

  const invite = await prisma.onboardingInvite.findUnique({ where: { token } });
  if (!invite || invite.status !== "open") {
    return NextResponse.json({ error: "Invite is not open" }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const memberRole = await tx.globalRole.findUnique({ where: { key: "member" } });
    const sections = await tx.section.findMany({ where: { key: { in: selectedSections } } });
    const user = await tx.user.update({
      where: { id: access.access.userId },
      data: {
        name,
        handle,
        discordHandle: handle,
        onboardingStatus: "verified",
        status: "active",
      },
    });

    if (memberRole) {
      await tx.userGlobalRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: memberRole.id } },
        update: {},
        create: { userId: user.id, roleId: memberRole.id },
      });
    }

    for (const section of sections) {
      await tx.sectionMembership.upsert({
        where: { userId_sectionId: { userId: user.id, sectionId: section.id } },
        update: { role: "member" },
        create: { userId: user.id, sectionId: section.id, role: "member" },
      });
    }

    await tx.onboardingInvite.update({
      where: { id: invite.id },
      data: {
        status: "used",
        usedByUserId: user.id,
        usedAt: new Date(),
      },
    });

    return {
      member: {
        id: user.id,
        name: user.name ?? name,
        handle: user.handle ?? handle,
        discordUserId: user.discordUserId ?? undefined,
        onboardingStatus: user.onboardingStatus,
        globalRoles: ["member"],
        sections: selectedSections.map((section) => ({ section, role: "member" as const })),
      } satisfies Member,
      invite: {
        id: invite.id,
        token: invite.token,
        label: invite.label,
        createdByRole: "operations" as const,
        createdAt: invite.createdAt.toLocaleString(),
        status: "used" as const,
        memberId: user.id,
      },
    };
  });

  return NextResponse.json(result);
}
