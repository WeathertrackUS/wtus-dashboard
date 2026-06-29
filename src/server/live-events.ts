import type { LiveEvent, LiveEventUpdate } from "../types";

type LiveEventUpdateRecord = {
  id: string;
  body: string;
  createdAt: Date;
  createdBy?: { name: string | null; handle: string | null; discordHandle: string | null } | null;
};

type LiveEventRecord = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  briefing: string | null;
  roles: Array<{ id: string; name: string; description: string | null }>;
  assignments: Array<{
    id: string;
    userId: string;
    liveEventRoleId: string;
    region: string | null;
    platform: string | null;
    status: string;
    notes: string | null;
  }>;
  updates?: LiveEventUpdateRecord[];
};

function mapLiveEventUpdateRecord(update: LiveEventUpdateRecord): LiveEventUpdate {
  const author = update.createdBy;
  const createdBy = author
    ? author.name ?? author.handle ?? author.discordHandle ?? undefined
    : undefined;

  return {
    id: update.id,
    body: update.body,
    createdAt: update.createdAt.toISOString(),
    createdBy,
  };
}

export function mapLiveEventRecord(event: LiveEventRecord): LiveEvent {
  return {
    id: event.id,
    name: event.name,
    description: event.description ?? "",
    status: event.status as LiveEvent["status"],
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString(),
    briefing: event.briefing ?? "",
    updates: (event.updates ?? []).map(mapLiveEventUpdateRecord),
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
      status: assignment.status as LiveEvent["assignments"][number]["status"],
      notes: assignment.notes ?? "",
    })),
  };
}

export const LIVE_EVENT_UPDATES_FETCH_LIMIT = 50;

export const liveEventDetailInclude = {
  roles: true,
  assignments: true,
  updates: {
    orderBy: { createdAt: "desc" as const },
    take: LIVE_EVENT_UPDATES_FETCH_LIMIT,
    include: {
      createdBy: { select: { name: true, handle: true, discordHandle: true } },
    },
  },
} as const;
