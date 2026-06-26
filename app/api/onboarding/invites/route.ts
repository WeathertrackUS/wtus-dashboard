import { randomUUID } from "node:crypto";
import { prisma } from "../../../../src/db";
import { requireGlobalOperator } from "../../../../src/server/permissions";
import { CreateInviteSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";
import type { OnboardingInvite } from "../../../../src/types";

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

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateInviteSchema, request);
  if ("error" in parsed) return parsed.error;

  try {
    const invite = await prisma.onboardingInvite.create({
      data: {
        token: randomUUID(),
        label: parsed.data.label?.trim() || "New member",
        status: "open",
        createdByUserId: access.access.userId,
      },
    });

    return Response.json({ invite: toInvite(invite) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
