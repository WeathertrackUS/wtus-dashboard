import { prisma } from "../../../src/db";
import type { BotPlugin, PluginContext, BotEvent, WeatherAlertData } from "../../types";
import type { Scheduler } from "../../core/scheduler";
import { NwsApiSource } from "./sources/nws-api";
import { SpcSource } from "./sources/spc";

export interface WeatherSource {
  name: string;
  priority: number;
  poll(): Promise<WeatherAlertData[]>;
}

export class WeatherAlertsPlugin implements BotPlugin {
  name = "weather-alerts";
  private dispatcher!: PluginContext["dispatcher"];
  private sources: WeatherSource[] = [];

  async onLoad(ctx: PluginContext): Promise<void> {
    this.dispatcher = ctx.dispatcher;
    this.sources = [new NwsApiSource(), new SpcSource()];
  }

  registerSchedules(scheduler: Scheduler): void {
    scheduler.interval("weather-poll-nws", () => this.pollSources([this.sources[0]]), 2 * 60 * 1000);
    scheduler.interval("weather-poll-spc", () => this.pollSources([this.sources[1]]), 5 * 60 * 1000);
  }

  private async pollSources(sources: WeatherSource[]) {
    for (const source of sources) {
      try {
        const items = await source.poll();
        for (const item of items) {
          await this.processItem(source, item);
        }
      } catch (error) {
        console.error(`[WeatherAlerts] ${source.name} poll failed:`, error);
      }
    }
  }

  private async processItem(source: WeatherSource, item: WeatherAlertData) {
    const existing = await prisma.weatherAlertEvent.findUnique({
      where: {
        eventType_sourceEventId: {
          eventType: item.eventType,
          sourceEventId: item.sourceEventId,
        },
      },
    });

    const rawPayload = item.rawPayload != null ? JSON.parse(JSON.stringify(item.rawPayload)) : undefined;

    if (existing) {
      await prisma.weatherAlertSource.create({
        data: {
          eventId: existing.id,
          sourceName: source.name,
          sourcePriority: source.priority,
          rawPayload,
        },
      });
      await prisma.weatherAlertEvent.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), title: item.title },
      });
      return;
    }

    const event = await prisma.weatherAlertEvent.create({
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

    const botEvent: BotEvent = {
      type: "weather:alert",
      data: {
        eventId: event.id,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        severity: event.severity,
        affectedArea: event.affectedArea,
      },
      timestamp: new Date(),
    };

    await this.dispatcher.publish(botEvent);
  }
}

export default WeatherAlertsPlugin;
