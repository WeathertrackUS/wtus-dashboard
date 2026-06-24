import { prisma } from "../db";
import { fetchLeantimeTasks } from "./leantime";
import type {
  AvailabilityWindow,
  LiveEvent,
  Member,
  OnboardingInvite,
  RecurringSchedule,
  ReminderPreference,
  SectionKey,
  SpecialRequest,
  Task,
  TemporaryCoverage,
  WorkSubmission,
  MemberDashboardData,
  OperatorDashboardData,
} from "../types";

/** Fetch only the data regular members are allowed to see */
export async function getMemberDashboardData(): Promise<MemberDashboardData> {
  const [members, taskResult, availability, recurringSchedules, liveEvents, coverage, workSubmissions] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sectionMemberships: { include: { section: true } },
      },
    }),
    fetchLeantimeTasks({ limit: 50 }),
    prisma.availabilityWindow.findMany({
      where: { endsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
      include: { section: true },
    }),
    prisma.recurringAvailability.findMany({
      where: { isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.liveEvent.findMany({
      orderBy: { startsAt: "desc" },
      include: {
        roles: true,
        assignments: { include: { section: true } },
      },
    }),
    prisma.temporaryRoleCoverage.findMany({
      orderBy: { startsAt: "asc" },
      include: { section: true },
    }),
    prisma.workSubmission.findMany({
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);

  return {
    members: members.map((member) => ({
      id: member.id,
      name: member.name ?? "Unnamed member",
      handle: member.handle ?? member.discordHandle ?? member.email ?? "member",
      sections: member.sectionMemberships.map((membership) => ({
        section: membership.section.key,
        role: membership.role,
      })),
    })),
    tasks: taskResult.configured ? taskResult.tasks : [],
    availability: availability.map<AvailabilityWindow>((window) => ({
      id: window.id,
      memberId: window.userId,
      status: window.status,
      helpRole: window.helpRole,
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
      notes: window.notes ?? "",
    })),
    recurringSchedules: recurringSchedules.map<RecurringSchedule>((s) => ({
      id: s.id,
      userId: s.userId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      notes: s.notes ?? "",
      isActive: s.isActive,
    })),
    liveEvents: liveEvents.map<LiveEvent>((event) => ({
      id: event.id,
      name: event.name,
      description: event.description ?? "",
      status: event.status,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString(),
      briefing: event.briefing ?? "",
      updates: [],
      roles: event.roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? "",
      })),
      assignments: event.assignments.map((assignment) => ({
        id: assignment.id,
        memberId: assignment.userId,
        roleId: assignment.liveEventRoleId,
        region: assignment.region ?? undefined,
        platform: assignment.platform ?? undefined,
        status: assignment.status,
        notes: assignment.notes ?? "",
      })),
    })),
    coverage: coverage.map<TemporaryCoverage>((item) => ({
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
    })),
    workSubmissions: workSubmissions.map<WorkSubmission>((submission) => ({
      id: submission.id,
      memberId: submission.userId,
      title: submission.title,
      workDate: submission.workDate.toISOString().slice(0, 10),
      platform: submission.platform,
      contentType: submission.contentType,
      memberRole: submission.memberRole,
      description: submission.description,
      assetUrl: submission.assetUrl ?? "",
      skills: submission.skills,
      notable: submission.notable,
    })),
  };
}

/** Fetch everything an operator (owner/operations_lead) is allowed to see */
export async function getOperatorDashboardData(): Promise<OperatorDashboardData> {
  const [base, invites, reminderPreferences, specialRequests] = await Promise.all([
    getMemberDashboardData(),
    prisma.onboardingInvite.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.reminderPreference.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    prisma.specialRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    ...base,
    invites: invites.map<Pick<OnboardingInvite, "id" | "label" | "createdByRole" | "createdAt" | "status" | "memberId">>((invite) => ({
      id: invite.id,
      label: invite.label,
      createdByRole: "operations",
      createdAt: invite.createdAt.toLocaleString(),
      status: invite.status,
      memberId: invite.usedByUserId ?? undefined,
    })),
    reminderPreferences: reminderPreferences.map<ReminderPreference>((preference) => ({
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
    })),
    specialRequests: specialRequests.map<SpecialRequest>((request) => ({
      id: request.id,
      memberId: request.targetUserId,
      createdById: request.createdById ?? undefined,
      title: request.title,
      prompt: request.prompt,
      role: request.role,
      platform: request.platform ?? undefined,
      dueAt: request.dueAt?.toISOString(),
      status: request.status,
      responseNote: request.responseNote ?? "",
      createdAt: request.createdAt.toLocaleString(),
    })),
  };
}

export function assertSectionKey(value: string): SectionKey {
  const sections: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];
  if (sections.includes(value as SectionKey)) return value as SectionKey;
  return "development";
}
