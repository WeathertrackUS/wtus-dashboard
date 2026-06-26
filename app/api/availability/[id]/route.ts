import { prisma } from "../../../../src/db";
import { requireCurrentUser } from "../../../../src/server/permissions";
import { apiError } from "../../../../src/server/api-response";
import { handleApiError } from "../../../../src/server/validation";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const { id } = await params;

  try {
    const window = await prisma.availabilityWindow.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!window) {
      return apiError("Availability window not found", 404);
    }

    if (window.userId !== access.access.userId) {
      return apiError("You can only delete your own availability", 403);
    }

    await prisma.availabilityWindow.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
