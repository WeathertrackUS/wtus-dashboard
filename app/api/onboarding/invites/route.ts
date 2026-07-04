import { prisma } from "../../../../src/db";
import { requirePermission, deriveCreatedByRole } from "../../../../src/server/permissions";
import { CreateInviteSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";
import { generateInviteToken, hashToken } from "../../../../src/server/token";
import { inviteCreationLimiter } from "../../../../src/server/rate-limit";
import { logInviteAudit } from "../../../../src/server/audit";
import type { OnboardingInvite } from "../../../../src/types";

const DEFAULT_EXPIRY_DAYS = 30;

function toInvite(
  invite: {
    id: string;
    label: string;
    status: "open" | "used" | "disabled";
    createdAt: Date;
    expiresAt: Date | null;
    usedByUserId: string | null;
  },
  creatorGlobalRoles: string[],
  rawToken?: string
): OnboardingInvite {
  return {
    id: invite.id,
    ...(rawToken ? { token: rawToken } : {}),
    label: invite.label,
    createdByRole: deriveCreatedByRole(creatorGlobalRoles),
    createdAt: invite.createdAt.toISOString(),
    status: invite.status,
    expiresAt: invite.expiresAt?.toISOString(),
    memberId: invite.usedByUserId ?? undefined,
  };
}

export async function POST(request: Request) {
  const access = await requirePermission("invites:create");
  if ("response" in access) return access.response;

  if (!inviteCreationLimiter.allow(access.access.userId)) {
    logInviteAudit({ event: "invite.creation_rate_limited", userId: access.access.userId });
    return Response.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  const parsed = await parseBody(CreateInviteSchema, request);
  if ("error" in parsed) return parsed.error;

  try {
    const rawToken = generateInviteToken();
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);

    const invite = await prisma.onboardingInvite.create({
      data: {
        tokenHash,
        label: parsed.data.label?.trim() || "New member",
        status: "open",
        expiresAt,
        createdByUserId: access.access.userId,
      },
    });

    logInviteAudit({ event: "invite.created", inviteId: invite.id, userId: access.access.userId });

    return Response.json(
      { invite: toInvite(invite, access.access.globalRoles, rawToken) },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
