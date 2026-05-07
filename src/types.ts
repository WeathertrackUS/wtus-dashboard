export type RoleView = "owner" | "operations" | "member";

export type SectionKey =
  | "finance"
  | "forecasting"
  | "nowcasting"
  | "youtube"
  | "graphics"
  | "facebook"
  | "development"
  | "verification";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";
export type Priority = "low" | "normal" | "high" | "urgent";
export type AvailabilityStatus = "available" | "maybe" | "unavailable";
export type EventStatus = "planned" | "active" | "paused" | "ended";

export interface Member {
  id: string;
  name: string;
  handle: string;
  discordUserId?: string;
  onboardingStatus?: "pending" | "verified";
  globalRoles: string[];
  sections: Array<{ section: SectionKey; role: "lead" | "member" }>;
}

export interface OnboardingInvite {
  id: string;
  token: string;
  label: string;
  createdByRole: "owner" | "operations";
  createdAt: string;
  status: "open" | "used" | "disabled";
  memberId?: string;
}

export interface Task {
  id: string;
  title: string;
  section: SectionKey;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string;
  ownerId: string;
  due: string;
  notes: string;
}

export interface AvailabilityWindow {
  id: string;
  memberId: string;
  status: AvailabilityStatus;
  section?: SectionKey;
  helpRole: string;
  eventName?: string;
  startsAt: string;
  endsAt: string;
  notes: string;
}

export interface LiveEventRole {
  id: string;
  name: string;
  description: string;
}

export interface LiveEventAssignment {
  id: string;
  memberId: string;
  roleId: string;
  section?: SectionKey;
  region?: string;
  platform?: string;
  status: "assigned" | "active" | "paused" | "done";
  notes: string;
}

export interface LiveEvent {
  id: string;
  name: string;
  description: string;
  status: EventStatus;
  startsAt: string;
  endsAt?: string;
  briefing: string;
  roles: LiveEventRole[];
  assignments: LiveEventAssignment[];
}

export interface TemporaryCoverage {
  id: string;
  assigneeId: string;
  coveredForId?: string;
  scope: "global" | "section" | "live_event";
  section?: SectionKey;
  eventId?: string;
  coverageRole: string;
  reason: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "active" | "ended";
}
