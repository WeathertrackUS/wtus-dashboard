import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import { requireGlobalOperator } from "../../../src/server/permissions";
import type { SectionKey, TemporaryCoverage } from "../../../src/types";

const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];
const scopes: TemporaryCoverage["scope"][] = ["global", "section", "live_event"];

function parseDate(value: string | undefined, fallback: Date) {
  if (!value || value.toLowerCase() === "now") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function toCoverage(item: {
  id: string;
  assigneeUserId: string;
  coveredUserId: string | null;
  scope: TemporaryCoverage["scope"];
  section: { key: SectionKey } | null;
  liveEventId: string | null;
  coverageRole: string;
  reason: string | null;
  startsAt: Date;
  endsAt: Date;
  status: TemporaryCoverage["status"];
}): TemporaryCoverage {
  return {
    id: item.id,
    assigneeId: item.assigneeUserId,
    coveredForId: item.coveredUserId ?? undefined,
    scope: item.scope,
    section: item.section?.key,
    eventId: item.liveEventId ?? undefined,
    coverageRole: item.coverageRole,
    reason: item.reason ?? "",
    startsAt: item.startsAt.toISOString(),
    endsAt: item.endsAt.toISOString(),
    status: item.status,
  };
}

export async function POST(request: Request) {
  const access = await requireGlobalOperator();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as {
    assigneeId?: string;
    coveredForId?: string;
    scope?: string;
    section?: string;
    eventId?: string;
    coverageRole?: string;
    reason?: string;
    startsAt?: string;
    endsAt?: string;
  } | null;

  const assigneeId = body?.assigneeId?.trim();
  const coverageRole = body?.coverageRole?.trim();
  const scope = scopes.find((item) => item === body?.scope) ?? "section";
  const sectionKey = sectionKeys.find((item) => item === body?.section);
  const startsAt = parseDate(body?.startsAt, new Date());
  const endsAt = parseDate(body?.endsAt, new Date(startsAt.getTime() + 8 * 60 * 60 * 1000));

  if (!assigneeId || !coverageRole) {
    return NextResponse.json({ error: "Member and coverage role are required" }, { status: 400 });
  }

  const [section, liveEvent] = await Promise.all([
    scope === "section" && sectionKey ? prisma.section.findUnique({ where: { key: sectionKey } }) : null,
    scope === "live_event" && body?.eventId ? prisma.liveEvent.findUnique({ where: { id: body.eventId } }) : null,
  ]);

  const coverage = await prisma.temporaryRoleCoverage.create({
    data: {
      assigneeUserId: assigneeId,
      coveredUserId: body?.coveredForId?.trim() || null,
      scope,
      sectionId: section?.id,
      liveEventId: liveEvent?.id,
      coverageRole,
      reason: body?.reason?.trim() || null,
      startsAt,
      endsAt,
      status: "active",
      createdById: access.access.userId,
    },
    include: { section: true },
  });

  return NextResponse.json({ coverage: toCoverage(coverage) }, { status: 201 });
}
