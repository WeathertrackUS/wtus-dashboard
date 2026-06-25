import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";
import type { OnboardingInvite } from "../../../../../src/types";

const allowedStatuses = ["open", "disabled"] as const;

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
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = allowedStatuses.find((item) => item === body?.status);

  if (!status) {
    return NextResponse.json({ error: "Unsupported invite status" }, { status: 400 });
  }

  const invite = await prisma.onboardingInvite.update({
    where: { id: inviteId },
    data: { status },
  });

  return NextResponse.json({ invite: toInvite(invite) });
}
