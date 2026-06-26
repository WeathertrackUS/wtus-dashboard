import { prisma } from "../../../src/db";
import { requireGlobalOperator } from "../../../src/server/permissions";
import { CreateCoverageSchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
import type { TemporaryCoverage } from "../../../src/types";

function toCoverage(item: {
  id: string;
  assigneeUserId: string;
  coveredUserId: string | null;
  scope: string;
  section: { key: string } | null;
  liveEventId: string | null;
  coverageRole: string;
  reason: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
}): TemporaryCoverage {
  return {
    id: item.id,
    assigneeId: item.assigneeUserId,
    coveredForId: item.coveredUserId ?? undefined,
    scope: item.scope as TemporaryCoverage["scope"],
    section: item.section?.key as TemporaryCoverage["section"],
    eventId: item.liveEventId ?? undefined,
    coverageRole: item.coverageRole,
    reason: item.reason ?? "",
    startsAt: item.startsAt.toISOString(),
    endsAt: item.endsAt.toISOString(),
    status: item.status as TemporaryCoverage["status"],
  };
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateCoverageSchema, request);
  if ("error" in parsed) return parsed.error;

  const { assigneeId, coveredForId, scope, section, eventId, coverageRole, reason, startsAt, endsAt } = parsed.data;

  const startsAtDate = new Date(startsAt);
  const endsAtDate = new Date(endsAt);

  try {
    const [sectionRecord, liveEvent] = await Promise.all([
      scope === "section" && section ? prisma.section.findUnique({ where: { key: section } }) : null,
      scope === "live_event" && eventId ? prisma.liveEvent.findUnique({ where: { id: eventId } }) : null,
    ]);

    const coverage = await prisma.temporaryRoleCoverage.create({
      data: {
        assigneeUserId: assigneeId.trim(),
        coveredUserId: coveredForId?.trim() || null,
        scope,
        sectionId: sectionRecord?.id,
        liveEventId: liveEvent?.id,
        coverageRole: coverageRole.trim(),
        reason: reason?.trim() || null,
        startsAt: startsAtDate,
        endsAt: endsAtDate,
        status: "active",
        createdById: access.access.userId,
      },
      include: { section: true },
    });

    return Response.json({ coverage: toCoverage(coverage) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
