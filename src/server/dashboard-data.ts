import { prisma } from "../db";
import type { AvailabilityWindow, LiveEvent, Member, OnboardingInvite, SectionKey, Task, TemporaryCoverage } from "../types";

export async function getDashboardData() {
  const [members, tasks, availability, liveEvents, coverage, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        globalRoles: { include: { role: true } },
        sectionMemberships: { include: { section: true } },
      },
    }),
    prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: { section: true },
    }),
    prisma.availabilityWindow.findMany({
      orderBy: { startsAt: "asc" },
      include: { section: true },
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
    prisma.onboardingInvite.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    members: members.map<Member>((member) => ({
      id: member.id,
      name: member.name ?? "Unnamed member",
      handle: member.handle ?? member.discordHandle ?? member.email ?? "member",
      discordUserId: member.discordUserId ?? undefined,
      onboardingStatus: member.onboardingStatus,
      globalRoles: member.globalRoles.map((assignment) => assignment.role.key),
      sections: member.sectionMemberships.map((membership) => ({
        section: membership.section.key,
        role: membership.role,
      })),
    })),
    tasks: tasks.map<Task>((task) => ({
      id: task.id,
      title: task.title,
      section: task.section?.key ?? "development",
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId ?? "",
      ownerId: task.createdById ?? task.assigneeId ?? "",
      due: task.dueAt ? task.dueAt.toLocaleDateString() : "",
      notes: task.description ?? "",
    })),
    availability: availability.map<AvailabilityWindow>((window) => ({
      id: window.id,
      memberId: window.userId,
      status: window.status,
      section: window.section?.key,
      helpRole: window.helpRole,
      eventName: window.eventName ?? undefined,
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
      notes: window.notes ?? "",
    })),
    liveEvents: liveEvents.map<LiveEvent>((event) => ({
      id: event.id,
      name: event.name,
      description: event.description ?? "",
      status: event.status,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString(),
      briefing: event.briefing ?? "",
      roles: event.roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? "",
      })),
      assignments: event.assignments.map((assignment) => ({
        id: assignment.id,
        memberId: assignment.userId,
        roleId: assignment.liveEventRoleId,
        section: assignment.section?.key,
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
    invites: invites.map<OnboardingInvite>((invite) => ({
      id: invite.id,
      token: invite.token,
      label: invite.label,
      createdByRole: "operations",
      createdAt: invite.createdAt.toLocaleString(),
      status: invite.status,
      memberId: invite.usedByUserId ?? undefined,
    })),
  };
}

export function assertSectionKey(value: string): SectionKey {
  const sections: SectionKey[] = ["finance", "forecasting", "nowcasting", "youtube", "graphics", "facebook", "development", "verification"];
  if (sections.includes(value as SectionKey)) return value as SectionKey;
  return "development";
}
