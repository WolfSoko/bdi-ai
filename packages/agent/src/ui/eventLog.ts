export interface LogEntry {
  timestamp: Date;
  event: string;
  data: unknown;
  level: 'info' | 'success' | 'warning' | 'error';
}

export class EventLog {
  private entries: LogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries;
  }

  add(event: string, data: unknown, level: LogEntry['level'] = 'info'): void {
    this.entries.unshift({ timestamp: new Date(), event, data, level });
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
  }

  getRecent(n = 20): LogEntry[] {
    return this.entries.slice(0, n);
  }

  clear(): void {
    this.entries = [];
  }
}
