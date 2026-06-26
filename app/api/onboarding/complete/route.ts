import { prisma } from "../../../../src/db";
import { requireDiscordVerifiedUser, deriveCreatedByRole } from "../../../../src/server/permissions";
import { CompleteOnboardingSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";
import { apiError } from "../../../../src/server/api-response";
import type { Member } from "../../../../src/types";

export async function POST(request: Request) {
  const access = await requireDiscordVerifiedUser();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CompleteOnboardingSchema, request);
  if ("error" in parsed) return parsed.error;

  const { token, name, handle, sections: selectedSections } = parsed.data;

  try {
    const invite = token
      ? await prisma.onboardingInvite.findUnique({
          where: { token },
          include: {
            createdBy: {
              include: { globalRoles: { include: { role: true } } },
            },
          },
        })
      : null;
    if (token && (!invite || invite.status !== "open")) {
      return apiError("Invite is not open", 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      const memberRole = await tx.globalRole.findUnique({ where: { key: "member" } });
      const sectionKeys = selectedSections.map((s) => s.section);
      const sections = await tx.section.findMany({ where: { key: { in: sectionKeys } } });
      const user = await tx.user.update({
        where: { id: access.userId },
        data: {
          name: name.trim(),
          handle: handle.trim().replace(/^@/, ""),
          discordHandle: handle.trim().replace(/^@/, ""),
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
        const membership = selectedSections.find((s) => s.section === section.key);
        await tx.sectionMembership.upsert({
          where: { userId_sectionId: { userId: user.id, sectionId: section.id } },
          update: { role: membership?.role ?? "member" },
          create: { userId: user.id, sectionId: section.id, role: membership?.role ?? "member" },
        });
      }

      const usedInvite = invite
        ? await tx.onboardingInvite.update({
            where: { id: invite.id },
            data: {
              status: "used",
              usedByUserId: user.id,
              usedAt: new Date(),
            },
          })
        : null;

      const creatorRoles = invite?.createdBy?.globalRoles.map((gr) => gr.role.key) ?? [];

      return {
        member: {
          id: user.id,
          name: user.name ?? name,
          handle: user.handle ?? handle,
          discordUserId: user.discordUserId ?? undefined,
          onboardingStatus: user.onboardingStatus,
          globalRoles: ["member"],
          sections: selectedSections.map((s) => ({ section: s.section, role: s.role })),
        } satisfies Member,
        invite: usedInvite
          ? {
              id: usedInvite.id,
              token: usedInvite.token,
              label: usedInvite.label,
              createdByRole: deriveCreatedByRole(creatorRoles),
              createdAt: usedInvite.createdAt.toISOString(),
              status: "used" as const,
              memberId: user.id,
            }
          : undefined,
      };
    });

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
