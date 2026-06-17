import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { isGlobalOperator, requireCurrentUser } from "../../../../src/server/permissions";
import type { Member, SectionKey } from "../../../../src/types";
import type { GlobalRoleKey } from "../../../../src/generated/prisma/enums";

const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];

const botSyncPort = process.env.DISCORD_BOT_SYNC_PORT ?? "3001";
const botSyncSecret = process.env.DISCORD_BOT_SYNC_SECRET;

function triggerDiscordSync(userId: string) {
  if (!botSyncSecret) return;
  fetch(`http://127.0.0.1:${botSyncPort}/sync-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, secret: botSyncSecret }),
  }).catch(() => {});
}

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

const OPERATOR_ONLY_FIELDS = ["globalRole", "section", "sectionRole", "sections", "discordUserId"] as const;

export async function PATCH(request: Request, context: { params: Promise<{ memberId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { memberId } = await context.params;
  if (!isGlobalOperator(access.access) && memberId !== access.access.userId) {
    return NextResponse.json({ error: "Account access required" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    handle?: string;
    discordUserId?: string;
    section?: string;
    sectionRole?: string | null;
    globalRole?: string;
    sections?: unknown;
  } | null;

  const isOperator = isGlobalOperator(access.access);

  if (!isOperator) {
    const attemptedPrivilegedFields = OPERATOR_ONLY_FIELDS.filter(
      (field) => body != null && field in body && (body as Record<string, unknown>)[field] !== undefined,
    );
    if (attemptedPrivilegedFields.length > 0) {
      return NextResponse.json(
        { error: `Not authorized to modify: ${attemptedPrivilegedFields.join(", ")}` },
        { status: 403 },
      );
    }
  }

  const name = body?.name?.trim();
  const handle = body?.handle?.trim().replace(/^@/, "");
  const selectedSections = Array.isArray(body?.sections)
    ? body.sections.filter((section): section is SectionKey => typeof section === "string" && sectionKeys.includes(section as SectionKey))
    : [];

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: memberId },
      data: {
        name: name || undefined,
        handle: handle || undefined,
      },
    });

    if (isOperator) {
      if (body?.discordUserId !== undefined) {
        await tx.user.update({
          where: { id: memberId },
          data: { discordUserId: body.discordUserId?.trim() || null },
        });
      }

      if (body?.globalRole !== undefined) {
        const globalRole = await tx.globalRole.findUnique({ where: { key: body.globalRole as GlobalRoleKey } });
        if (globalRole) {
          await tx.userGlobalRole.upsert({
            where: { userId_roleId: { userId: memberId, roleId: globalRole.id } },
            update: {},
            create: { userId: memberId, roleId: globalRole.id },
          });
        }
      }

      if (body?.section !== undefined && body?.sectionRole !== undefined) {
        const section = await tx.section.findUnique({ where: { key: body.section as SectionKey } });
        if (section) {
          if (body.sectionRole === null || body.sectionRole === "remove") {
            await tx.sectionMembership.deleteMany({
              where: { userId: memberId, sectionId: section.id },
            });
          } else {
            await tx.sectionMembership.upsert({
              where: { userId_sectionId: { userId: memberId, sectionId: section.id } },
              update: { role: body.sectionRole as "lead" | "member" },
              create: { userId: memberId, sectionId: section.id, role: body.sectionRole as "lead" | "member" },
            });
          }
        }
      } else if (body?.sections !== undefined) {
        const sectionsForMembership = await tx.section.findMany({ where: { key: { in: selectedSections } } });
        await tx.sectionMembership.deleteMany({
          where: { userId: memberId },
        });
        for (const section of sectionsForMembership) {
          await tx.sectionMembership.upsert({
            where: { userId_sectionId: { userId: memberId, sectionId: section.id } },
            update: {},
            create: { userId: memberId, sectionId: section.id, role: "member" },
          });
        }
      }
    }

    return tx.user.findUniqueOrThrow({
      where: { id: memberId },
      include: {
        globalRoles: { include: { role: true } },
        sectionMemberships: { include: { section: true } },
      },
    });
  });

  const hadRoleChange = isOperator && (body?.globalRole !== undefined || body?.section !== undefined || body?.sections !== undefined);
  if (hadRoleChange) triggerDiscordSync(memberId);

  return NextResponse.json({ member: toMember(result) });
}
