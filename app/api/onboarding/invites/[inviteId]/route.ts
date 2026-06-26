import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";
import { UpdateInviteSchema } from "../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../src/server/validation";
import type { OnboardingInvite } from "../../../../../src/types";

function toInvite(invite: {
  id: string;
  token: string;
  label: string;
  status: "open" | "used" | "disabled";
  createdAt: Date;
  usedByUserId: string | null;
}): OnboardingInvite {
  return {
    id: invite.id,
    token: invite.token,
    label: invite.label,
    createdByRole: "operations",
    createdAt: invite.createdAt.toISOString(),
    status: invite.status,
    memberId: invite.usedByUserId ?? undefined,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ inviteId: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { inviteId } = await context.params;
  const parsed = await parseBody(UpdateInviteSchema, request);
  if ("error" in parsed) return parsed.error;

  const { status } = parsed.data;

  try {
    const invite = await prisma.onboardingInvite.update({
      where: { id: inviteId },
      data: { status },
    });

    return Response.json({ invite: toInvite(invite) });
  } catch (error) {
    return handleApiError(error);
  }
}
