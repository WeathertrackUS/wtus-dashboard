import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { deriveCreatedByRole, requireGlobalOperator } from "../../../../src/server/permissions";
import type { OnboardingInvite } from "../../../../src/types";

function toInvite(
  invite: {
    id: string;
    token: string;
    label: string;
    status: "open" | "used" | "disabled";
    createdAt: Date;
    usedByUserId: string | null;
  },
  createdByGlobalRoles: string[],
): OnboardingInvite {
  return {
    id: invite.id,
    token: invite.token,
    label: invite.label,
    createdByRole: deriveCreatedByRole(createdByGlobalRoles),
    createdAt: invite.createdAt.toISOString(),
    status: invite.status,
    memberId: invite.usedByUserId ?? undefined,
  };
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as { label?: string } | null;
  const invite = await prisma.onboardingInvite.create({
    data: {
      token: randomUUID(),
      label: body?.label?.trim() || "New member",
      status: "open",
      createdByUserId: access.access.userId,
    },
  });

  return NextResponse.json({ invite: toInvite(invite, access.access.globalRoles) }, { status: 201 });
}
