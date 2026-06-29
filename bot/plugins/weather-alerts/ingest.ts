import { prisma } from "../../../src/db";
import type { WeatherAlertData } from "../../types";

export interface WeatherAlertSourceRef {
  name: string;
  priority: number;
}

export interface WeatherAlertDispatchPayload {
  eventId: string;
  eventType: string;
  title: string;
  description?: string;
  severity?: string;
  affectedArea?: string;
}

export type WeatherAlertIngestResult =
  | { action: "created"; event: WeatherAlertDispatchPayload }
  | { action: "updated"; eventId: string };

function serializeRawPayload(rawPayload: unknown) {
  return rawPayload != null ? JSON.parse(JSON.stringify(rawPayload)) : undefined;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

async function appendSourceAndRefreshEvent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  eventId: string,
  source: WeatherAlertSourceRef,
  item: WeatherAlertData,
  rawPayload: ReturnType<typeof serializeRawPayload>,
) {
  await tx.weatherAlertSource.create({
    data: {
      eventId,
      sourceName: source.name,
      sourcePriority: source.priority,
      rawPayload,
    },
  });
  await tx.weatherAlertEvent.update({
    where: { id: eventId },
    data: { lastSeenAt: new Date(), title: item.title },
  });
}

export async function ingestWeatherAlertItem(
  source: WeatherAlertSourceRef,
  item: WeatherAlertData,
): Promise<WeatherAlertIngestResult> {
  const rawPayload = serializeRawPayload(item.rawPayload);
  const lookupKey = {
    eventType: item.eventType,
    sourceEventId: item.sourceEventId,
  };

  return prisma.$transaction(async (tx) => {
    const existing = await tx.weatherAlertEvent.findUnique({
      where: { eventType_sourceEventId: lookupKey },
    });

    if (existing) {
      await appendSourceAndRefreshEvent(tx, existing.id, source, item, rawPayload);
      return { action: "updated", eventId: existing.id };
    }

    try {
      const event = await tx.weatherAlertEvent.create({
        data: {
          eventType: item.eventType,
          sourceEventId: item.sourceEventId,
          title: item.title,
          description: item.description,
          severity: item.severity,
          affectedArea: item.affectedArea,
          rawData: rawPayload,
          sources: {
            create: {
              sourceName: source.name,
              sourcePriority: source.priority,
              rawPayload,
            },
          },
        },
      });

      return {
        action: "created",
        event: {
          eventId: event.id,
          eventType: event.eventType,
          title: event.title,
          description: event.description ?? undefined,
          severity: event.severity ?? undefined,
          affectedArea: event.affectedArea ?? undefined,
        },
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const raced = await tx.weatherAlertEvent.findUnique({
        where: { eventType_sourceEventId: lookupKey },
      });
      if (!raced) {
        throw error;
      }

      await appendSourceAndRefreshEvent(tx, raced.id, source, item, rawPayload);
      return { action: "updated", eventId: raced.id };
    }
  });
}
