import { prisma } from "../../../../src/db";
import { requirePermission } from "../../../../src/server/permissions";
import { UpdateSpecialRequestSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";
import { apiError } from "../../../../src/server/api-response";
import type { SpecialRequestStatus } from "../../../../src/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;

  try {
    const existing = await prisma.specialRequest.findUnique({ where: { id: requestId } });
    if (!existing) return apiError("Special request not found", 404);

    const access = await requirePermission("special_requests:update", { resourceOwnerId: existing.targetUserId });
    if ("response" in access) return access.response;

    const parsed = await parseBody(UpdateSpecialRequestSchema, request);
    if ("error" in parsed) return parsed.error;

    const { status, responseNote } = parsed.data;

    const newStatus = (status as SpecialRequestStatus) ?? existing.status;
    const specialRequest = await prisma.specialRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        responseNote: responseNote?.trim() || existing.responseNote,
        respondedAt: newStatus === "accepted" || newStatus === "declined" ? new Date() : existing.respondedAt,
      },
    });

    return Response.json({
      specialRequest: {
        id: specialRequest.id,
        memberId: specialRequest.targetUserId,
        createdById: specialRequest.createdById ?? undefined,
        title: specialRequest.title,
        prompt: specialRequest.prompt,
        role: specialRequest.role,
        platform: specialRequest.platform ?? undefined,
        dueAt: specialRequest.dueAt?.toISOString(),
        status: specialRequest.status as SpecialRequestStatus,
        responseNote: specialRequest.responseNote ?? "",
        createdAt: specialRequest.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
