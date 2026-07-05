import { prisma } from "../../../src/db";
import { requirePermission, requireCurrentUser } from "../../../src/server/permissions";
import { CreateReminderPreferenceSchema } from "../../../src/server/schemas";
import { parseBody, handleApiError } from "../../../src/server/validation";
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
  const parsed = await parseBody(CreateReminderPreferenceSchema, request);
  if ("error" in parsed) return parsed.error;

  const { memberId, frequency, sendClearForDay, taskReminders, liveEventReminders, specialRequestReminders, preferredDays, preferredTimes, preferredPlatforms, preferredContentTypes, notes } = parsed.data;

  const user = await requireCurrentUser();
  if ("response" in user) return user.response;
  const effectiveMemberId = memberId || user.access.userId;

  const access = await requirePermission("reminders:create", { resourceOwnerId: effectiveMemberId });
  if ("response" in access) return access.response;

  try {
    const preference = await prisma.reminderPreference.upsert({
      where: { userId: effectiveMemberId },
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
        userId: effectiveMemberId,
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
