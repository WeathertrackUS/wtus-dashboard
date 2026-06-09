export class Scheduler {
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  interval(name: string, fn: () => void | Promise<void>, ms: number): void {
    this.clear(name);
    const id = setInterval(() => void Promise.resolve(fn()), ms);
    this.intervals.set(name, id);
  }

  timeout(name: string, fn: () => void | Promise<void>, ms: number): void {
    this.clear(name);
    const id = setTimeout(() => void Promise.resolve(fn()), ms);
    this.timeouts.set(name, id);
  }

  clear(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) clearInterval(interval);
    this.intervals.delete(name);
    const timeout = this.timeouts.get(name);
    if (timeout) clearTimeout(timeout);
    this.timeouts.delete(name);
  }

  clearAll(): void {
    for (const name of this.intervals.keys()) this.clear(name);
    for (const name of this.timeouts.keys()) this.clear(name);
  }
}
