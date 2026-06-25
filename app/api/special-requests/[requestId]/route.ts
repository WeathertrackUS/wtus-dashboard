import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { requireCurrentUser, isGlobalOperator } from "../../../../src/server/permissions";
import type { SpecialRequestStatus } from "../../../../src/types";

const statuses: SpecialRequestStatus[] = ["open", "accepted", "declined", "cancelled"];

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { requestId } = await params;
  const existing = await prisma.specialRequest.findUnique({ where: { id: requestId } });
  if (!existing) return NextResponse.json({ error: "Special request not found" }, { status: 404 });
  if (existing.targetUserId !== access.access.userId && !isGlobalOperator(access.access)) {
    return NextResponse.json({ error: "You cannot update this request" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { status?: string; responseNote?: string } | null;
  const status = statuses.find((item) => item === body?.status) ?? existing.status;
  const specialRequest = await prisma.specialRequest.update({
    where: { id: requestId },
    data: {
      status,
      responseNote: body?.responseNote?.trim() || existing.responseNote,
      respondedAt: status === "accepted" || status === "declined" ? new Date() : existing.respondedAt,
    },
  });

  return NextResponse.json({
    specialRequest: {
      id: specialRequest.id,
      memberId: specialRequest.targetUserId,
      createdById: specialRequest.createdById ?? undefined,
      title: specialRequest.title,
      prompt: specialRequest.prompt,
      role: specialRequest.role,
      platform: specialRequest.platform ?? undefined,
      dueAt: specialRequest.dueAt?.toISOString(),
      status: specialRequest.status,
      responseNote: specialRequest.responseNote ?? "",
      createdAt: specialRequest.createdAt.toISOString(),
    },
  });
}
