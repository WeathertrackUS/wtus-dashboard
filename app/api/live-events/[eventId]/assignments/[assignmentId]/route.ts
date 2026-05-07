import { NextResponse } from "next/server";
import { prisma } from "../../../../../../src/db";
import type { LiveEventAssignment } from "../../../../../../src/types";

const statuses: LiveEventAssignment["status"][] = ["assigned", "active", "paused", "done"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string; assignmentId: string }> },
) {
  const { assignmentId } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = statuses.find((item) => item === body?.status);

  if (!status) {
    return NextResponse.json({ error: "Unsupported assignment status" }, { status: 400 });
  }

  const assignment = await prisma.liveEventAssignment.update({
    where: { id: assignmentId },
    data: { status },
    include: { section: true },
  });

  const result: LiveEventAssignment = {
    id: assignment.id,
    memberId: assignment.userId,
    roleId: assignment.liveEventRoleId,
    section: assignment.section?.key,
    region: assignment.region ?? undefined,
    platform: assignment.platform ?? undefined,
    status: assignment.status,
    notes: assignment.notes ?? "",
  };

  return NextResponse.json({ assignment: result });
}
