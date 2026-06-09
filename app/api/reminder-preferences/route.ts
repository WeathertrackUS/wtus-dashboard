import { NextResponse } from "next/server";
import { prisma } from "../../../src/db";
import { requireCurrentUser } from "../../../src/server/permissions";
import type { ReminderFrequency, ReminderPreference } from "../../../src/types";

const frequencies: ReminderFrequency[] = ["daily", "weekly", "event_only", "special_request_only", "none"];

function toArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function mapPreference(preference: Awaited<ReturnType<typeof prisma.reminderPreference.upsert>>): ReminderPreference {
  return {
    id: preference.id,
    memberId: preference.userId,
    frequency: preference.frequency,
    sendClearForDay: preference.sendClearForDay,
    taskReminders: preference.taskReminders,
    liveEventReminders: preference.liveEventReminders,
    specialRequestReminders: preference.specialRequestReminders,
    preferredDays: preference.preferredDays,
    preferredTimes: preference.preferredTimes,
    preferredPlatforms: preference.preferredPlatforms,
    preferredContentTypes: preference.preferredContentTypes,
    notes: preference.notes ?? "",
  };
}

export async function POST(request: Request) {
  const access = await requireCurrentUser();
  if ("response" in access) return access.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const memberId = String(body?.memberId || access.access.userId);
  const canEditTarget = memberId === access.access.userId || access.access.globalRoles.includes("owner") || access.access.globalRoles.includes("operations_lead");
  if (!canEditTarget) return NextResponse.json({ error: "You can only edit your own reminders" }, { status: 403 });

  const frequency = frequencies.find((item) => item === body?.frequency) ?? "daily";
  const preference = await prisma.reminderPreference.upsert({
    where: { userId: memberId },
    update: {
      frequency,
      sendClearForDay: Boolean(body?.sendClearForDay),
      taskReminders: Boolean(body?.taskReminders),
      liveEventReminders: Boolean(body?.liveEventReminders),
      specialRequestReminders: Boolean(body?.specialRequestReminders),
      preferredDays: toArray(body?.preferredDays),
      preferredTimes: toArray(body?.preferredTimes),
      preferredPlatforms: toArray(body?.preferredPlatforms),
      preferredContentTypes: toArray(body?.preferredContentTypes),
      notes: String(body?.notes || "").trim() || null,
    },
    create: {
      userId: memberId,
      frequency,
      sendClearForDay: Boolean(body?.sendClearForDay),
      taskReminders: Boolean(body?.taskReminders),
      liveEventReminders: Boolean(body?.liveEventReminders),
      specialRequestReminders: Boolean(body?.specialRequestReminders),
      preferredDays: toArray(body?.preferredDays),
      preferredTimes: toArray(body?.preferredTimes),
      preferredPlatforms: toArray(body?.preferredPlatforms),
      preferredContentTypes: toArray(body?.preferredContentTypes),
      notes: String(body?.notes || "").trim() || null,
    },
  });

  return NextResponse.json({ preference: mapPreference(preference) });
}
