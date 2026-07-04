import { prisma } from "../../../../../src/db";
import { requirePermission, deriveCreatedByRole } from "../../../../../src/server/permissions";
import { UpdateInviteSchema } from "../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../src/server/validation";
import { logInviteAudit } from "../../../../../src/server/audit";
import type { OnboardingInvite } from "../../../../../src/types";

function toInvite(invite: {
  id: string;
  label: string;
  status: "open" | "used" | "disabled";
  createdAt: Date;
  expiresAt: Date | null;
  usedByUserId: string | null;
  createdBy: { globalRoles: { role: { key: string } }[] } | null;
}): OnboardingInvite {
  const creatorRoles = invite.createdBy?.globalRoles.map((gr) => gr.role.key) ?? [];
  return {
    id: invite.id,
    label: invite.label,
    createdByRole: deriveCreatedByRole(creatorRoles),
    createdAt: invite.createdAt.toISOString(),
    status: invite.status,
    expiresAt: invite.expiresAt?.toISOString(),
    memberId: invite.usedByUserId ?? undefined,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ inviteId: string }> }) {
  const access = await requirePermission("invites:update");
  if ("response" in access) return access.response;

  const { inviteId } = await context.params;
  const parsed = await parseBody(UpdateInviteSchema, request);
  if ("error" in parsed) return parsed.error;

  const { status } = parsed.data;

  try {
    const invite = await prisma.onboardingInvite.update({
      where: { id: inviteId },
      data: { status },
      include: {
        createdBy: {
          include: { globalRoles: { include: { role: true } } },
        },
      },
    });

    if (status === "disabled") {
      logInviteAudit({ event: "invite.disabled", inviteId: invite.id, userId: access.access.userId });
    }

    return Response.json({ invite: toInvite(invite) });
  } catch (error) {
    return handleApiError(error);
  }
}
