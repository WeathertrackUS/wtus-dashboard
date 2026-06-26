import { prisma } from "../../../../../src/db";
import { requireCurrentUser } from "../../../../../src/server/permissions";
import { apiError } from "../../../../../src/server/api-response";
import { handleApiError } from "../../../../../src/server/validation";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { id } = await params;

  try {
    const schedule = await prisma.recurringAvailability.findUnique({ where: { id } });
    if (!schedule) {
      return apiError("Schedule not found", 404);
    }
    if (schedule.userId !== access.access.userId) {
      return apiError("You can only delete your own schedules", 403);
    }

    await prisma.recurringAvailability.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
