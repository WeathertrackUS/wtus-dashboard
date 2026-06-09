-- Weather alert event tracking with multi-source dedup
CREATE TABLE "WeatherAlertEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sourceEventId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT,
  "affectedArea" TEXT,
  "rawData" JSONB,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "WeatherAlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeatherAlertSource" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourcePriority" INTEGER NOT NULL DEFAULT 0,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rawPayload" JSONB,
  CONSTRAINT "WeatherAlertSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeatherAlertEvent_eventType_sourceEventId_key" ON "WeatherAlertEvent"("eventType", "sourceEventId");
CREATE INDEX "WeatherAlertEvent_eventType_idx" ON "WeatherAlertEvent"("eventType");
CREATE INDEX "WeatherAlertSource_eventId_idx" ON "WeatherAlertSource"("eventId");

ALTER TABLE "WeatherAlertSource" ADD CONSTRAINT "WeatherAlertSource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeatherAlertEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
