import { prisma } from "../../../../src/db";
import { liveEventDetailInclude, mapLiveEventRecord } from "../../../../src/server/live-events";
import { requireGlobalOperator } from "../../../../src/server/permissions";
import { PatchLiveEventSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const { eventId } = await context.params;
  const parsed = await parseBody(PatchLiveEventSchema, request);
  if ("error" in parsed) return parsed.error;

  const { name, description, briefing, update } = parsed.data;

  try {
    const liveEvent = await prisma.$transaction(async (tx) => {
      await tx.liveEvent.findUniqueOrThrow({
        where: { id: eventId },
        select: { id: true },
      });

      if (name !== undefined || description !== undefined || briefing !== undefined) {
        await tx.liveEvent.update({
          where: { id: eventId },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description: description.trim() || null }),
            ...(briefing !== undefined && { briefing: briefing.trim() || null }),
          },
        });
      }

      if (update !== undefined) {
        await tx.liveEventUpdate.create({
          data: {
            liveEventId: eventId,
            body: update,
            createdById: access.access.userId,
          },
        });
      }

      return tx.liveEvent.findUniqueOrThrow({
        where: { id: eventId },
        include: liveEventDetailInclude,
      });
    });

    return Response.json({ event: mapLiveEventRecord(liveEvent) });
  } catch (error) {
    return handleApiError(error);
  }
}
