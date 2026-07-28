import { prisma } from "../../../src/db";
import { requirePermission } from "../../../src/server/permissions";
import { CreateAvailabilitySchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
import type { AvailabilityWindow } from "../../../src/types";

function toAvailability(window: {
  id: string;
  userId: string;
  status: string;
  helpRole: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
}): AvailabilityWindow {
  return {
    id: window.id,
    memberId: window.userId,
    status: window.status as AvailabilityWindow["status"],
    helpRole: window.helpRole,
    startsAt: window.startsAt.toISOString(),
    endsAt: window.endsAt.toISOString(),
    notes: window.notes ?? "",
  };
}

export async function POST(request: Request) {
  const parsed = await parseBody(CreateAvailabilitySchema, request);
  if ("error" in parsed) return parsed.error;

  const { memberId, status, helpRole, startsAt, endsAt, notes } = parsed.data;

  const access = await requirePermission("availability:create", { resourceOwnerId: memberId });
  if ("response" in access) return access.response;

  const startsAtDate = new Date(startsAt);
  const endsAtDate = new Date(endsAt);

  try {
    await prisma.availabilityWindow.updateMany({
      where: {
        userId: memberId,
        startsAt: { lt: endsAtDate },
        endsAt: { gt: startsAtDate },
      },
      data: { endsAt: startsAtDate },
    });

    const availability = await prisma.availabilityWindow.create({
      data: {
        userId: memberId,
        status,
        helpRole,
        startsAt: startsAtDate,
        endsAt: endsAtDate,
        notes: notes?.trim() || null,
      },
    });

    return Response.json({ availability: toAvailability(availability) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
