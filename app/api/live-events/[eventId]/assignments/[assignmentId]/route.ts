import { prisma } from "../../../../../../src/db";
import { requirePermission } from "../../../../../../src/server/permissions";
import { UpdateAssignmentSchema } from "../../../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../../../src/server/validation";
import { apiError } from "../../../../../../src/server/api-response";
import type { LiveEventAssignment } from "../../../../../../src/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string; assignmentId: string }> },
) {
  const { assignmentId } = await context.params;

  const parsed = await parseBody(UpdateAssignmentSchema, request);
  if ("error" in parsed) return parsed.error;

  const { status } = parsed.data;

  if (!status) {
    return apiError("Unsupported assignment status", 400);
  }

  try {
    const existingAssignment = await prisma.liveEventAssignment.findUnique({
      where: { id: assignmentId },
      select: { userId: true },
    });

    if (!existingAssignment) {
      return apiError("Assignment not found", 404);
    }

    const access = await requirePermission("assignments:update", { resourceOwnerId: existingAssignment.userId });
    if ("response" in access) return access.response;

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
      status: assignment.status as LiveEventAssignment["status"],
      notes: assignment.notes ?? "",
    };

    return Response.json({ assignment: result });
  } catch (error) {
    return handleApiError(error);
  }
}
