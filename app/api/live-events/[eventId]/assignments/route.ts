import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";
import type { LiveEventAssignment } from "../../../../../src/types";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { eventId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    memberId?: string;
    roleId?: string;
    region?: string;
    platform?: string;
    notes?: string;
  } | null;

  const memberId = body?.memberId?.trim();
  const roleId = body?.roleId?.trim();

  if (!memberId || !roleId) {
    return NextResponse.json({ error: "Member and event role are required" }, { status: 400 });
  }

  const assignment = await prisma.liveEventAssignment.create({
    data: {
      liveEventId: eventId,
      userId: memberId,
      liveEventRoleId: roleId,
      region: body?.region?.trim() || null,
      platform: body?.platform?.trim() || null,
      notes: body?.notes?.trim() || null,
      status: "assigned",
      assignedById: access.access.userId,
    },
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

  return NextResponse.json({ assignment: result }, { status: 201 });
}
