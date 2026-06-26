import { prisma } from "../../../src/db";
import { requireCurrentUser } from "../../../src/server/permissions";
import { CreateReminderPreferenceSchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
import { apiError } from "../../../src/server/api-response";
import type { ReminderPreference } from "../../../src/types";

function mapPreference(preference: Awaited<ReturnType<typeof prisma.reminderPreference.upsert>>): ReminderPreference {
  return {
    id: preference.id,
    memberId: preference.userId,
    frequency: preference.frequency as ReminderPreference["frequency"],
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

  const parsed = await parseBody(CreateReminderPreferenceSchema, request);
  if ("error" in parsed) return parsed.error;

  const { memberId, frequency, sendClearForDay, taskReminders, liveEventReminders, specialRequestReminders, preferredDays, preferredTimes, preferredPlatforms, preferredContentTypes, notes } = parsed.data;
  const targetMemberId = memberId || access.access.userId;

  const canEditTarget = targetMemberId === access.access.userId || access.access.globalRoles.includes("owner") || access.access.globalRoles.includes("operations_lead");
  if (!canEditTarget) return apiError("You can only edit your own reminders", 403);

  try {
    const preference = await prisma.reminderPreference.upsert({
      where: { userId: targetMemberId },
      update: {
        frequency,
        sendClearForDay: sendClearForDay ?? true,
        taskReminders: taskReminders ?? true,
        liveEventReminders: liveEventReminders ?? true,
        specialRequestReminders: specialRequestReminders ?? true,
        preferredDays: preferredDays ?? [],
        preferredTimes: preferredTimes ?? [],
        preferredPlatforms: preferredPlatforms ?? [],
        preferredContentTypes: preferredContentTypes ?? [],
        notes: notes?.trim() || null,
      },
      create: {
        userId: targetMemberId,
        frequency,
        sendClearForDay: sendClearForDay ?? true,
        taskReminders: taskReminders ?? true,
        liveEventReminders: liveEventReminders ?? true,
        specialRequestReminders: specialRequestReminders ?? true,
        preferredDays: preferredDays ?? [],
        preferredTimes: preferredTimes ?? [],
        preferredPlatforms: preferredPlatforms ?? [],
        preferredContentTypes: preferredContentTypes ?? [],
        notes: notes?.trim() || null,
      },
    });

    return Response.json({ preference: mapPreference(preference) });
  } catch (error) {
    return handleApiError(error);
  }
}
