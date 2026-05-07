import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import { isGlobalOperator, requireCurrentUser } from "../../../src/server/permissions";
import type { AvailabilityStatus, AvailabilityWindow, SectionKey } from "../../../src/types";

const statuses: AvailabilityStatus[] = ["available", "maybe", "unavailable"];
const sectionKeys: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];

function parseWindowDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const normalized = value.toLowerCase() === "now" ? new Date() : new Date(value);
  return Number.isNaN(normalized.getTime()) ? fallback : normalized;
}

function toAvailability(window: {
  id: string;
  userId: string;
  status: AvailabilityStatus;
  helpRole: string;
  eventName: string | null;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  section: { key: SectionKey } | null;
}): AvailabilityWindow {
  return {
    id: window.id,
    memberId: window.userId,
    status: window.status,
    section: window.section?.key,
    helpRole: window.helpRole,
    eventName: window.eventName ?? undefined,
    startsAt: window.startsAt.toISOString(),
    endsAt: window.endsAt.toISOString(),
    notes: window.notes ?? "",
  };
}

export async function POST(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as {
    memberId?: string;
    status?: string;
    section?: string;
    helpRole?: string;
    eventName?: string;
    startsAt?: string;
    endsAt?: string;
    notes?: string;
  } | null;

  const memberId = body?.memberId?.trim();
  const helpRole = body?.helpRole?.trim();
  const status = statuses.find((item) => item === body?.status) ?? "available";
  const sectionKey = sectionKeys.find((key) => key === body?.section);
  const startsAt = parseWindowDate(body?.startsAt, new Date());
  const endsAt = parseWindowDate(body?.endsAt, new Date(startsAt.getTime() + 60 * 60 * 1000));

  if (!memberId || !helpRole) {
    return NextResponse.json({ error: "Member and help role are required" }, { status: 400 });
  }

  if (!isGlobalOperator(access.access) && memberId !== access.access.userId) {
    return NextResponse.json({ error: "You can only update your own availability" }, { status: 403 });
  }

  const section = sectionKey ? await prisma.section.findUnique({ where: { key: sectionKey } }) : null;
  const availability = await prisma.availabilityWindow.create({
    data: {
      userId: memberId,
      status,
      sectionId: section?.id,
      helpRole,
      eventName: body?.eventName?.trim() || null,
      startsAt,
      endsAt,
      notes: body?.notes?.trim() || null,
    },
    include: { section: true },
  });

  return NextResponse.json({ availability: toAvailability(availability) }, { status: 201 });
}
