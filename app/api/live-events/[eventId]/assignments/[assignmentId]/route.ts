import { NextResponse } from "next/server";
import { prisma } from "../../../../../../src/db";
import { isGlobalOperator, requireCurrentUser } from "../../../../../../src/server/permissions";
import type { LiveEventAssignment } from "../../../../../../src/types";

const statuses: LiveEventAssignment["status"][] = ["assigned", "active", "paused", "done"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string; assignmentId: string }> },
) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { assignmentId } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = statuses.find((item) => item === body?.status);

  if (!status) {
    return NextResponse.json({ error: "Unsupported assignment status" }, { status: 400 });
  }

  const existingAssignment = await prisma.liveEventAssignment.findUnique({
    where: { id: assignmentId },
    select: { userId: true },
  });

  if (!existingAssignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  if (!isGlobalOperator(access.access) && existingAssignment.userId !== access.access.userId) {
    return NextResponse.json({ error: "Assignment access required" }, { status: 403 });
  }

  const assignment = await prisma.liveEventAssignment.update({
    where: { id: assignmentId },
    data: { status },
  });

  const result: LiveEventAssignment = {
    id: assignment.id,
    memberId: assignment.userId,
    roleId: assignment.liveEventRoleId,
    region: assignment.region ?? undefined,
    platform: assignment.platform ?? undefined,
    status: assignment.status,
    notes: assignment.notes ?? "",
  };

  return NextResponse.json({ assignment: result });
}
