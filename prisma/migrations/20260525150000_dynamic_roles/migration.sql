-- Dynamic role mapping and dispatch rules for weather alert routing
CREATE TABLE "DiscordRoleMapping" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "discordRoleId" TEXT NOT NULL,
  "sectionKey" "SectionKey",
  "globalRoleKey" "GlobalRoleKey",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscordRoleMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DispatchRule" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "channelId" TEXT,
  "pingRoleIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "pingUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DispatchRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscordRoleMapping_guildId_discordRoleId_key" ON "DiscordRoleMapping"("guildId", "discordRoleId");
CREATE INDEX "DispatchRule_eventType_idx" ON "DispatchRule"("eventType");
