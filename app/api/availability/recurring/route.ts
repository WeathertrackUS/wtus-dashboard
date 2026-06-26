import { prisma } from "../../../../src/db";
import { requireCurrentUser } from "../../../../src/server/permissions";
import { CreateRecurringScheduleSchema } from "../../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../../src/server/validation";
import type { RecurringSchedule } from "../../../../src/types";

function toRecurring(row: {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  isActive: boolean;
}): RecurringSchedule {
  return {
    id: row.id,
    userId: row.userId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status as RecurringSchedule["status"],
    notes: row.notes ?? "",
    isActive: row.isActive,
  };
}

export async function GET() {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  try {
    const schedules = await prisma.recurringAvailability.findMany({
      where: { userId: access.access.userId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return Response.json({ schedules: schedules.map(toRecurring) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const parsed = await parseBody(CreateRecurringScheduleSchema, request);
  if ("error" in parsed) return parsed.error;

  const { dayOfWeek, startTime, endTime, status, notes } = parsed.data;

  try {
    const schedule = await prisma.recurringAvailability.upsert({
      where: {
        userId_dayOfWeek_startTime: {
          userId: access.access.userId,
          dayOfWeek,
          startTime,
        },
      },
      update: { endTime, status, notes: notes?.trim() || null },
      create: {
        userId: access.access.userId,
        dayOfWeek,
        startTime,
        endTime,
        status,
        notes: notes?.trim() || null,
      },
    });

    return Response.json({ schedule: toRecurring(schedule) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
