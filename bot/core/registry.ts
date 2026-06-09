import type { Client } from "discord.js";
import type { BotPlugin, PluginContext } from "../types";
import { EventDispatcher } from "./dispatcher";
import { Scheduler } from "./scheduler";

export class PluginRegistry {
  private plugins = new Map<string, BotPlugin>();
  private dispatcher = new EventDispatcher();
  private scheduler = new Scheduler();

  register(plugin: BotPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  async loadAll(): Promise<void> {
    const ctx: PluginContext = {
      dispatcher: this.dispatcher,
      scheduler: this.scheduler,
    };
    for (const plugin of this.plugins.values()) {
      await plugin.onLoad(ctx);
    }
  }

  async readyAll(client: Client): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onReady) await plugin.onReady(client);
    }
    for (const plugin of this.plugins.values()) {
      if (plugin.registerSchedules) plugin.registerSchedules(this.scheduler);
    }
  }

  getAllCommands() {
    const commands = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.registerCommands) {
        commands.push(...plugin.registerCommands());
      }
    }
    return commands;
  }

  getDispatcher(): EventDispatcher {
    return this.dispatcher;
  }

  getScheduler(): Scheduler {
    return this.scheduler;
  }

  shutdown(): void {
    this.scheduler.clearAll();
    this.dispatcher.removeAll();
  }
}
