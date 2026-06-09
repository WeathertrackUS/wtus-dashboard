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
export type EventStatus = "planned" | "active" | "paused" | "ended" | "cancelled";
export type ReminderFrequency = "daily" | "weekly" | "event_only" | "special_request_only" | "none";
export type WorkSubmissionType =
  | "social_graphic"
  | "forecast_discussion"
  | "radar_post"
  | "spc_explainer"
  | "wpc_explainer"
  | "nhc_explainer"
  | "model_graphic"
  | "recap_graphic"
  | "video_clip"
  | "other";
export type SpecialRequestStatus = "open" | "accepted" | "declined" | "cancelled";

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
  assigneeIds: string[];
  ownerId: string;
  due: string;
  notes: string;
  comments?: TaskComment[];
  isRecurring: boolean;
  recurringPattern?: string;
  parentTaskId?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId?: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

export interface AvailabilityWindow {
  id: string;
  memberId: string;
  status: AvailabilityStatus;
  helpRole: string;
  startsAt: string;
  endsAt: string;
  notes: string;
}

export interface RecurringSchedule {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
  notes: string;
  isActive: boolean;
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
  duration?: string;
  briefing: string;
  updates: LiveEventUpdate[];
  roles: LiveEventRole[];
  assignments: LiveEventAssignment[];
}

export interface LiveEventUpdate {
  id: string;
  body: string;
  createdAt: string;
  createdBy?: string;
}

export interface TemporaryCoverage {
  id: string;
  assigneeId: string;
  coveredForId?: string;
  scope?: "global" | "section" | "live_event";
  section?: SectionKey;
  eventId?: string;
  coverageRole: string;
  reason: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "active" | "ended" | "cancelled";
}

export interface ReminderPreference {
  id: string;
  memberId: string;
  frequency: ReminderFrequency;
  sendClearForDay: boolean;
  taskReminders: boolean;
  liveEventReminders: boolean;
  specialRequestReminders: boolean;
  preferredDays: string[];
  preferredTimes: string[];
  preferredPlatforms: string[];
  preferredContentTypes: string[];
  notes: string;
}

export interface WorkSubmission {
  id: string;
  memberId: string;
  title: string;
  workDate: string;
  platform: string;
  contentType: WorkSubmissionType;
  memberRole: string;
  description: string;
  assetUrl: string;
  skills: string[];
  notable: boolean;
}

export interface SpecialRequest {
  id: string;
  memberId: string;
  createdById?: string;
  title: string;
  prompt: string;
  role: string;
  platform?: string;
  dueAt?: string;
  status: SpecialRequestStatus;
  responseNote: string;
  createdAt: string;
}
