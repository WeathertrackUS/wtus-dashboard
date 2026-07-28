import { prisma } from "../../../../src/db";
import { requirePermission } from "../../../../src/server/permissions";
import { apiError } from "../../../../src/server/api-response";
import { handleApiError } from "../../../../src/server/validation";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const window = await prisma.availabilityWindow.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!window) {
      return apiError("Availability window not found", 404);
    }

    const access = await requirePermission("availability:delete", { resourceOwnerId: window.userId });
    if ("response" in access) return access.response;

    await prisma.availabilityWindow.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
