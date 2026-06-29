import { prisma } from "../../../../src/db";
import { requireDiscordVerifiedUser, deriveCreatedByRole } from "../../../../src/server/permissions";
import { CompleteOnboardingSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";
import { apiError } from "../../../../src/server/api-response";
import type { Member } from "../../../../src/types";

class InviteNotOpenError extends Error {
  constructor() {
    super("Invite is not open");
    this.name = "InviteNotOpenError";
  }
}

export async function POST(request: Request) {
  const access = await requireDiscordVerifiedUser();
  if ("response" in access) return access.response;

  if (access.user.onboardingStatus === "verified" && access.user.status === "active") {
    return apiError("Onboarding already completed", 409);
  }

  const parsed = await parseBody(CompleteOnboardingSchema, request);
  if ("error" in parsed) return parsed.error;

  const { token, name, handle, sections: sectionKeys } = parsed.data;
  const uniqueSectionKeys = [...new Set(sectionKeys)];

  const invitePreview = token
    ? await prisma.onboardingInvite.findUnique({
        where: { token },
        include: {
          createdBy: {
            include: { globalRoles: { include: { role: true } } },
          },
        },
      })
    : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (token) {
        const claim = await tx.onboardingInvite.updateMany({
          where: { token, status: "open" },
          data: {
            status: "used",
            usedByUserId: access.userId,
            usedAt: new Date(),
          },
        });
        if (claim.count !== 1) {
          throw new InviteNotOpenError();
        }
      }

      const sections = await tx.section.findMany({ where: { key: { in: uniqueSectionKeys } } });
      if (sections.length !== uniqueSectionKeys.length) {
        const found = new Set(sections.map((section) => section.key));
        const unknown = uniqueSectionKeys.filter((key) => !found.has(key));
        throw Object.assign(new Error(`Unknown sections: ${unknown.join(", ")}`), { statusCode: 400 });
      }

      const memberRole = await tx.globalRole.findUnique({ where: { key: "member" } });
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
        await tx.sectionMembership.upsert({
          where: { userId_sectionId: { userId: user.id, sectionId: section.id } },
          update: { role: "member" },
          create: { userId: user.id, sectionId: section.id, role: "member" },
        });
      }

      const memberSections = uniqueSectionKeys.map((section) => ({ section, role: "member" as const }));

      return {
        member: {
          id: user.id,
          name: user.name ?? name,
          handle: user.handle ?? handle,
          discordUserId: user.discordUserId ?? undefined,
          onboardingStatus: user.onboardingStatus,
          globalRoles: ["member"],
          sections: memberSections,
        } satisfies Member,
      };
    });

    const creatorRoles = invitePreview?.createdBy?.globalRoles.map((gr) => gr.role.key) ?? [];

    return Response.json({
      ...result,
      invite:
        token && invitePreview
          ? {
              id: invitePreview.id,
              token: invitePreview.token,
              label: invitePreview.label,
              createdByRole: deriveCreatedByRole(creatorRoles),
              createdAt: invitePreview.createdAt.toISOString(),
              status: "used" as const,
              memberId: result.member.id,
            }
          : undefined,
    });
  } catch (error) {
    if (error instanceof InviteNotOpenError) {
      return apiError("Invite is not open", 409);
    }
    if (error instanceof Error && "statusCode" in error && error.statusCode === 400) {
      return apiError(error.message, 400);
    }
    return handleApiError(error);
  }
}
