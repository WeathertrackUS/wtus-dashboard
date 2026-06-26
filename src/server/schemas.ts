import { z } from "zod";

export const SectionKeySchema = z.enum([
  "finance",
  "forecasting",
  "nowcasting",
  "youtube",
  "graphics",
  "facebook",
  "development",
  "verification",
]);

export const PrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const TaskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "blocked",
  "review",
  "done",
]);

export const AvailabilityStatusSchema = z.enum([
  "available",
  "maybe",
  "unavailable",
]);

export const EventStatusSchema = z.enum([
  "planned",
  "active",
  "paused",
  "ended",
  "cancelled",
]);

export const ReminderFrequencySchema = z.enum([
  "daily",
  "weekly",
  "event_only",
  "special_request_only",
  "none",
]);

export const WorkSubmissionTypeSchema = z.enum([
  "social_graphic",
  "forecast_discussion",
  "radar_post",
  "spc_explainer",
  "wpc_explainer",
  "nhc_explainer",
  "model_graphic",
  "recap_graphic",
  "video_clip",
  "other",
]);

export const SpecialRequestStatusSchema = z.enum([
  "open",
  "accepted",
  "declined",
  "cancelled",
]);

export const AssignmentStatusSchema = z.enum([
  "assigned",
  "active",
  "paused",
  "done",
]);

export const CoverageScopeSchema = z.enum([
  "global",
  "section",
  "live_event",
]);

export const InviteStatusSchema = z.enum(["open", "used", "disabled"]);

export const GlobalRoleKeySchema = z.enum(["owner", "operations_lead", "member"]);

export const SectionRoleSchema = z.enum(["lead", "member"]);

export const DayOfWeekSchema = z.number().int().min(0).max(6);

export const ISODateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: "Invalid date string" }
);

export const HHMMTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be valid HH:MM time (00:00-23:59)");

export const NonEmptyStringSchema = z.string().min(1, "This field is required");

export const OptionalStringSchema = z.string().optional();

export const CreateTaskSchema = z.object({
  title: NonEmptyStringSchema,
  section: SectionKeySchema.optional().default("development"),
  priority: PrioritySchema.optional().default("normal"),
  assigneeIds: z.array(z.string()).optional().default([]),
  due: ISODateStringSchema.optional(),
  notes: z.string().optional().default(""),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: OptionalStringSchema,
});

export const UpdateTaskSchema = z.object({
  title: NonEmptyStringSchema.optional(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  section: SectionKeySchema.optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  due: ISODateStringSchema.optional(),
  notes: z.string().optional(),
});

export const CreateMemberSchema = z.object({
  name: NonEmptyStringSchema,
  handle: NonEmptyStringSchema,
  globalRole: GlobalRoleKeySchema.optional().default("member"),
  section: SectionKeySchema.optional(),
  sectionRole: SectionRoleSchema.optional().default("member"),
});

export const UpdateMemberSchema = z.object({
  name: NonEmptyStringSchema.optional(),
  handle: NonEmptyStringSchema.optional(),
  discordUserId: z.string().nullable().optional(),
  section: SectionKeySchema.optional(),
  sectionRole: z.enum(["lead", "member", "remove"]).nullable().optional(),
  globalRole: GlobalRoleKeySchema.optional(),
  sections: z.array(SectionKeySchema).optional(),
});

export const CreateAvailabilitySchema = z
  .object({
    memberId: NonEmptyStringSchema,
    status: AvailabilityStatusSchema.optional().default("available"),
    helpRole: z.string().optional().default("General"),
    startsAt: ISODateStringSchema,
    endsAt: ISODateStringSchema,
    notes: z.string().optional().default(""),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const CreateRecurringScheduleSchema = z
  .object({
    dayOfWeek: DayOfWeekSchema,
    startTime: HHMMTimeSchema,
    endTime: HHMMTimeSchema,
    status: AvailabilityStatusSchema.optional().default("available"),
    notes: z.string().optional().default(""),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export const CreateLiveEventSchema = z.object({
  name: NonEmptyStringSchema,
  description: z.string().optional().default(""),
  startsAt: ISODateStringSchema.optional(),
  briefing: z.string().optional().default(""),
});

export const CreateAssignmentSchema = z.object({
  memberId: NonEmptyStringSchema,
  roleId: NonEmptyStringSchema,
  region: OptionalStringSchema,
  platform: OptionalStringSchema,
  notes: z.string().optional().default(""),
});

export const UpdateAssignmentSchema = z.object({
  status: AssignmentStatusSchema.optional(),
});

export const CreateSpecialRequestSchema = z.object({
  memberId: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  prompt: NonEmptyStringSchema,
  role: NonEmptyStringSchema,
  platform: OptionalStringSchema,
  dueAt: ISODateStringSchema.optional(),
});

export const UpdateSpecialRequestSchema = z.object({
  status: SpecialRequestStatusSchema.optional(),
  responseNote: z.string().optional(),
});

export const CreateWorkSubmissionSchema = z.object({
  memberId: z.string().optional(),
  title: NonEmptyStringSchema,
  workDate: ISODateStringSchema,
  platform: NonEmptyStringSchema,
  contentType: WorkSubmissionTypeSchema,
  memberRole: z.string().optional().default(""),
  description: z.string().optional().default(""),
  assetUrl: z.string().url("Invalid URL").optional(),
  skills: z.array(z.string()).optional().default([]),
  notable: z.boolean().optional().default(false),
});

export const CreateCoverageSchema = z
  .object({
    assigneeId: NonEmptyStringSchema,
    coveredForId: OptionalStringSchema,
    scope: CoverageScopeSchema.optional().default("section"),
    section: SectionKeySchema.optional(),
    eventId: OptionalStringSchema,
    coverageRole: NonEmptyStringSchema,
    reason: z.string().optional().default(""),
    startsAt: ISODateStringSchema,
    endsAt: ISODateStringSchema,
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const CreateInviteSchema = z.object({
  label: NonEmptyStringSchema,
});

export const UpdateInviteSchema = z.object({
  status: z.enum(["open", "disabled"]),
});

export const CompleteOnboardingSchema = z.object({
  token: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  handle: NonEmptyStringSchema,
  sections: z
    .array(
      z.object({
        section: SectionKeySchema,
        role: SectionRoleSchema,
      })
    )
    .optional()
    .default([]),
});

export const CreateReminderPreferenceSchema = z.object({
  memberId: NonEmptyStringSchema,
  frequency: ReminderFrequencySchema.optional().default("daily"),
  sendClearForDay: z.boolean().optional().default(true),
  taskReminders: z.boolean().optional().default(true),
  liveEventReminders: z.boolean().optional().default(true),
  specialRequestReminders: z.boolean().optional().default(true),
  preferredDays: z.array(z.string()).optional().default([]),
  preferredTimes: z.array(z.string()).optional().default([]),
  preferredPlatforms: z.array(z.string()).optional().default([]),
  preferredContentTypes: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
});

export const CreateCommentSchema = z.object({
  body: NonEmptyStringSchema,
});

export const CreateAlertChannelSchema = z.object({
  guildId: NonEmptyStringSchema,
  channelId: NonEmptyStringSchema,
  alertType: NonEmptyStringSchema,
  sectionId: z.string().nullable().optional(),
});

export const UpdateAlertChannelSchema = z.object({
  guildId: NonEmptyStringSchema.optional(),
  channelId: NonEmptyStringSchema.optional(),
  alertType: NonEmptyStringSchema.optional(),
  sectionId: z.string().nullable().optional(),
});

export const CreateDispatchRuleSchema = z.object({
  eventType: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  description: OptionalStringSchema,
  channelId: z.string().nullable().optional(),
  pingRoleIds: z.array(z.string()).optional().default([]),
  pingUserIds: z.array(z.string()).optional().default([]),
});

export const UpdateDispatchRuleSchema = z.object({
  eventType: NonEmptyStringSchema.optional(),
  name: NonEmptyStringSchema.optional(),
  description: z.string().nullable().optional(),
  channelId: z.string().nullable().optional(),
  pingRoleIds: z.array(z.string()).optional(),
  pingUserIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const CreateRoleMappingSchema = z.object({
  guildId: NonEmptyStringSchema,
  discordRoleId: NonEmptyStringSchema,
  sectionKey: SectionKeySchema.nullable().optional(),
  globalRoleKey: GlobalRoleKeySchema.nullable().optional(),
});

export const UpdateRoleMappingSchema = z.object({
  guildId: NonEmptyStringSchema.optional(),
  discordRoleId: NonEmptyStringSchema.optional(),
  sectionKey: SectionKeySchema.nullable().optional(),
  globalRoleKey: GlobalRoleKeySchema.nullable().optional(),
});

export const TaskQuerySchema = z.object({
  section: SectionKeySchema.optional(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  assigneeId: z.string().optional(),
  label: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});
