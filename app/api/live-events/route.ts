import { prisma } from "../../../src/db";
import { requireGlobalOperator } from "../../../src/server/permissions";
import { CreateLiveEventSchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
import type { LiveEvent } from "../../../src/types";

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateLiveEventSchema, request);
  if ("error" in parsed) return parsed.error;

  const { name, description, startsAt, briefing } = parsed.data;

  try {
    const liveEvent = await prisma.liveEvent.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: "active",
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        briefing: briefing?.trim() || null,
        createdById: access.access.userId,
      },
      include: { roles: true, assignments: true },
    });

    const event: LiveEvent = {
      id: liveEvent.id,
      name: liveEvent.name,
      description: liveEvent.description ?? "",
      status: liveEvent.status as LiveEvent["status"],
      startsAt: liveEvent.startsAt.toISOString(),
      endsAt: liveEvent.endsAt?.toISOString(),
      briefing: liveEvent.briefing ?? "",
      updates: [],
      roles: liveEvent.roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? "",
      })),
      assignments: [],
    };

    return Response.json({ event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
