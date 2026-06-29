-- CreateTable
CREATE TABLE "LiveEventUpdate" (
    "id" TEXT NOT NULL,
    "liveEventId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveEventUpdate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LiveEventUpdate" ADD CONSTRAINT "LiveEventUpdate_liveEventId_fkey" FOREIGN KEY ("liveEventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveEventUpdate" ADD CONSTRAINT "LiveEventUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
