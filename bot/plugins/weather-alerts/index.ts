import type { BotPlugin, PluginContext, BotEvent, WeatherAlertData } from "../../types";
import type { Scheduler } from "../../core/scheduler";
import { NwsApiSource } from "./sources/nws-api";
import { SpcSource } from "./sources/spc";
import { ingestWeatherAlertItem } from "./ingest";

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
    const result = await ingestWeatherAlertItem(source, item);
    if (result.action !== "created") {
      return;
    }

    const botEvent: BotEvent = {
      type: "weather:alert",
      data: {
        eventId: result.event.eventId,
        eventType: result.event.eventType,
        title: result.event.title,
        description: result.event.description,
        severity: result.event.severity,
        affectedArea: result.event.affectedArea,
      },
      timestamp: new Date(),
    };

    await this.dispatcher.publish(botEvent);
  }
}

export default WeatherAlertsPlugin;
