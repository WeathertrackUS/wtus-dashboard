import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import { requireCurrentUser } from "../../../src/server/permissions";
import type { AvailabilityStatus, AvailabilityWindow } from "../../../src/types";

const statuses: AvailabilityStatus[] = ["available", "maybe", "unavailable"];

function parseWindowDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function toAvailability(window: {
  id: string;
  userId: string;
  status: AvailabilityStatus;
  helpRole: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
}): AvailabilityWindow {
  return {
    id: window.id,
    memberId: window.userId,
    status: window.status,
    helpRole: window.helpRole,
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
    helpRole?: string;
    startsAt?: string;
    endsAt?: string;
    notes?: string;
  } | null;

  const memberId = body?.memberId?.trim();
  const helpRole = body?.helpRole?.trim() || "General";
  const status = statuses.find((item) => item === body?.status) ?? "available";
  const startsAt = parseWindowDate(body?.startsAt, new Date());
  const endsAt = parseWindowDate(body?.endsAt, new Date(startsAt.getTime() + 60 * 60 * 1000));

  if (!memberId) {
    return NextResponse.json({ error: "Member is required" }, { status: 400 });
  }

  if (memberId !== access.access.userId) {
    return NextResponse.json({ error: "You can only update your own availability" }, { status: 403 });
  }

  // Close existing windows that overlap with the new time range, keep non-overlapping ones
  await prisma.availabilityWindow.updateMany({
    where: {
      userId: memberId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    data: { endsAt: startsAt },
  });

  const availability = await prisma.availabilityWindow.create({
    data: {
      userId: memberId,
      status,
      helpRole,
      startsAt,
      endsAt,
      notes: body?.notes?.trim() || null,
    },
  });

  return NextResponse.json({ availability: toAvailability(availability) }, { status: 201 });
}
