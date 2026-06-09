import { NextResponse } from "next/server";
import { prisma } from "../../../../src/db";
import { requireCurrentUser } from "../../../../src/server/permissions";
import type { AvailabilityStatus, RecurringSchedule } from "../../../../src/types";

function toRecurring(row: {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
  notes: string | null;
  isActive: boolean;
}): RecurringSchedule {
  return {
    id: row.id,
    userId: row.userId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    notes: row.notes ?? "",
    isActive: row.isActive,
  };
}

export async function GET() {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const schedules = await prisma.recurringAvailability.findMany({
    where: { userId: access.access.userId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ schedules: schedules.map(toRecurring) });
}

export async function POST(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
    notes?: string;
  } | null;

  const dayOfWeek = body?.dayOfWeek;
  const startTime = body?.startTime?.trim();
  const endTime = body?.endTime?.trim();
  const status: AvailabilityStatus =
    (["available", "maybe", "unavailable"] as AvailabilityStatus[]).find((s) => s === body?.status) ?? "available";

  if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: "Valid dayOfWeek (0-6) is required" }, { status: 400 });
  }
  if (!startTime || !endTime) {
    return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
  }

  const schedule = await prisma.recurringAvailability.upsert({
    where: {
      userId_dayOfWeek_startTime: {
        userId: access.access.userId,
        dayOfWeek,
        startTime,
      },
    },
    update: { endTime, status, notes: body?.notes?.trim() || null },
    create: {
      userId: access.access.userId,
      dayOfWeek,
      startTime,
      endTime,
      status,
      notes: body?.notes?.trim() || null,
    },
  });

  return NextResponse.json({ schedule: toRecurring(schedule) }, { status: 201 });
}
