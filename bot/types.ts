import type { Client, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import type { EventDispatcher } from "./core/dispatcher";
import type { Scheduler } from "./core/scheduler";

export interface PluginContext {
  dispatcher: EventDispatcher;
  scheduler: Scheduler;
}

export interface BotPlugin {
  name: string;
  onLoad(ctx: PluginContext): Promise<void>;
  onReady?(client: Client): Promise<void>;
  registerCommands?(): RESTPostAPIChatInputApplicationCommandsJSONBody[];
  registerSchedules?(scheduler: Scheduler): void;
}

export interface BotEvent {
  type: string;
  data: unknown;
  timestamp: Date;
}

export interface WeatherAlertData {
  eventType: string;
  sourceEventId: string;
  sourceName: string;
  title: string;
  description?: string;
  severity?: string;
  affectedArea?: string;
  rawPayload?: unknown;
}
