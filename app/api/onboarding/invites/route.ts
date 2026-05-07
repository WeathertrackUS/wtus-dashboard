import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
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
    createdAt: invite.createdAt.toLocaleString(),
    status: invite.status,
    memberId: invite.usedByUserId ?? undefined,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { label?: string } | null;
  const invite = await prisma.onboardingInvite.create({
    data: {
      token: randomUUID(),
      label: body?.label?.trim() || "New member",
      status: "open",
    },
  });

  return NextResponse.json({ invite: toInvite(invite) }, { status: 201 });
}
