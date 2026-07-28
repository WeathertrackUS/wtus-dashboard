import { prisma } from "../../../../../src/db";
import { requirePermission } from "../../../../../src/server/permissions";
import { apiError } from "../../../../../src/server/api-response";
import { handleApiError } from "../../../../../src/server/validation";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const schedule = await prisma.recurringAvailability.findUnique({ where: { id } });
    if (!schedule) {
      return apiError("Schedule not found", 404);
    }

    const access = await requirePermission("recurring:delete", { resourceOwnerId: schedule.userId });
    if ("response" in access) return access.response;

    await prisma.recurringAvailability.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
