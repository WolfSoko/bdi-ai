import type { BDIAgent, CycleResult } from '@bdi-ai/agent';
import type { Belief, Goal, Intention } from '@bdi-ai/models';
import type { WebSocketServer } from 'ws';

export interface AgentState {
  agentName: string;
  beliefs: Belief[];
  goals: Goal[];
  intentions: Intention[];
  cycleCount: number;
  running: boolean;
  cycleInterval: number;
}

export interface ClientMessage {
  type: 'perception' | 'step' | 'start' | 'stop' | 'get-state';
  data?: Record<string, unknown>;
}

export class AgentBridge {
  private perceptionQueue: string[] = [];
  private cycleHistory: CycleResult[] = [];
  private events: Array<{ event: string; data: unknown; timestamp: string }> = [];
  private running = false;
  private cycleInterval = 3000;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private maxEvents = 200;

  constructor(
    private agent: BDIAgent,
    private broadcast: (type: string, data: unknown) => void,
    wss: WebSocketServer
  ) {
    // Forward all agent events to clients
    agent.onEvent((event, data) => {
      const entry = { event, data, timestamp: new Date().toISOString() };
      this.events.unshift(entry);
      if (this.events.length > this.maxEvents) {
        this.events.length = this.maxEvents;
      }
      broadcast('event', entry);
    });

    // Handle new client connections
    wss.on('connection', (ws) => {
      // Send full state on connect
      const stateMsg = JSON.stringify({ type: 'state', data: this.getState() });
      ws.send(stateMsg);

      const historyMsg = JSON.stringify({ type: 'history', data: this.cycleHistory });
      ws.send(historyMsg);

      const eventsMsg = JSON.stringify({ type: 'events', data: this.events.slice(0, 50) });
      ws.send(eventsMsg);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as ClientMessage;
          this.handleClientMessage(msg);
        } catch {
          // ignore malformed messages
        }
      });
    });
  }

  private handleClientMessage(msg: ClientMessage): void {
    switch (msg.type) {
      case 'perception':
        if (typeof msg.data?.text === 'string' && msg.data.text.trim()) {
          this.perceptionQueue.push(msg.data.text.trim());
          this.broadcast('perception-queued', { text: msg.data.text.trim(), queueLength: this.perceptionQueue.length });
        }
        break;

      case 'step':
        void this.runOneCycle();
        break;

      case 'start': {
        const interval = typeof msg.data?.interval === 'number' ? msg.data.interval : 3000;
        this.startAutoRun(interval);
        break;
      }

      case 'stop':
        this.stopAutoRun();
        break;

      case 'get-state':
        this.broadcast('state', this.getState());
        break;
    }
  }

  async runOneCycle(): Promise<CycleResult | undefined> {
    try {
      const perception = this.perceptionQueue.shift();
      this.broadcast('cycle:running', { perception: perception ?? null });
      const result = await this.agent.runCycle(perception);
      this.cycleHistory.push(result);
      this.broadcast('cycle', result);
      this.broadcast('state', this.getState());
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.broadcast('error', { error });
      return undefined;
    }
  }

  startAutoRun(intervalMs = 3000): void {
    if (this.running) return;
    this.running = true;
    this.cycleInterval = intervalMs;
    this.broadcast('status', { running: true, cycleInterval: intervalMs });
    this.scheduleNext();
  }

  stopAutoRun(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.broadcast('status', { running: false, cycleInterval: this.cycleInterval });
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      await this.runOneCycle();
      this.scheduleNext();
    }, this.cycleInterval);
  }

  getState(): AgentState {
    return {
      agentName: this.agent.name,
      beliefs: this.agent.beliefBase.getAll(),
      goals: this.agent.goalManager.getAll(),
      intentions: this.agent.intentionManager.getAll(),
      cycleCount: this.cycleHistory.length,
      running: this.running,
      cycleInterval: this.cycleInterval,
    };
  }
}
