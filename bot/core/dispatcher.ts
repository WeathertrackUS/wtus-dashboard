import type { BotEvent } from "../types";

type EventHandler = (event: BotEvent) => void | Promise<void>;

export class EventDispatcher {
  private handlers = new Map<string, EventHandler[]>();

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  async publish(event: BotEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;
    await Promise.all(handlers.map((handler) => Promise.resolve(handler(event))));
  }

  removeAll(): void {
    this.handlers.clear();
  }
}
