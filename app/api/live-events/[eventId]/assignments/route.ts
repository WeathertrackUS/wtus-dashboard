import { prisma } from "../../../../../src/db";
import { requireGlobalOperator } from "../../../../../src/server/permissions";
import { CreateAssignmentSchema } from "../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../src/server/validation";
import type { LiveEventAssignment } from "../../../../../src/types";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { eventId } = await context.params;
  const parsed = await parseBody(CreateAssignmentSchema, request);
  if ("error" in parsed) return parsed.error;

  const { memberId, roleId, region, platform, notes } = parsed.data;

  try {
    const assignment = await prisma.liveEventAssignment.create({
      data: {
        liveEventId: eventId,
        userId: memberId.trim(),
        liveEventRoleId: roleId.trim(),
        region: region?.trim() || null,
        platform: platform?.trim() || null,
        notes: notes?.trim() || null,
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
      status: assignment.status as LiveEventAssignment["status"],
      notes: assignment.notes ?? "",
    };

    return Response.json({ assignment: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
