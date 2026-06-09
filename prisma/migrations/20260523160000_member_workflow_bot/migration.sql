-- Member workflow, reminder preferences, portfolio submissions, and special requests
CREATE TYPE "ReminderFrequency" AS ENUM ('daily', 'weekly', 'event_only', 'special_request_only', 'none');
CREATE TYPE "WorkSubmissionType" AS ENUM ('social_graphic', 'forecast_discussion', 'radar_post', 'spc_explainer', 'wpc_explainer', 'nhc_explainer', 'model_graphic', 'recap_graphic', 'video_clip', 'other');
CREATE TYPE "SpecialRequestStatus" AS ENUM ('open', 'accepted', 'declined', 'cancelled');

CREATE TABLE "ReminderPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "frequency" "ReminderFrequency" NOT NULL DEFAULT 'daily',
  "sendClearForDay" BOOLEAN NOT NULL DEFAULT true,
  "taskReminders" BOOLEAN NOT NULL DEFAULT true,
  "liveEventReminders" BOOLEAN NOT NULL DEFAULT true,
  "specialRequestReminders" BOOLEAN NOT NULL DEFAULT true,
  "preferredDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferredTimes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferredPlatforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferredContentTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkSubmission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "workDate" TIMESTAMP(3) NOT NULL,
  "platform" TEXT NOT NULL,
  "contentType" "WorkSubmissionType" NOT NULL,
  "memberRole" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "assetUrl" TEXT,
  "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpecialRequest" (
  "id" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "createdById" TEXT,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "platform" TEXT,
  "dueAt" TIMESTAMP(3),
  "status" "SpecialRequestStatus" NOT NULL DEFAULT 'open',
  "responseNote" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpecialRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReminderPreference_userId_key" ON "ReminderPreference"("userId");
CREATE INDEX "WorkSubmission_userId_workDate_idx" ON "WorkSubmission"("userId", "workDate");
CREATE INDEX "SpecialRequest_targetUserId_status_idx" ON "SpecialRequest"("targetUserId", "status");

ALTER TABLE "ReminderPreference" ADD CONSTRAINT "ReminderPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkSubmission" ADD CONSTRAINT "WorkSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpecialRequest" ADD CONSTRAINT "SpecialRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpecialRequest" ADD CONSTRAINT "SpecialRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
