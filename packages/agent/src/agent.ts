import 'dotenv/config';
import { BeliefBase, GoalManager, PlanLibrary, IntentionManager, Executor } from '@bdi-ai/components';
import type { ToolFn } from '@bdi-ai/components';
import { BeliefRevisionFunction, DeliberationEngine, PlanSelector } from '@bdi-ai/llm';
import { ReasoningLoop } from './reasoningLoop.js';
import type { CycleResult } from './reasoningLoop.js';
import type { Goal } from '@bdi-ai/models';

export interface BDIAgentConfig {
  model?: string;
  persist?: boolean;
  verbose?: boolean;
}

export interface RunConfig {
  cycles: number;
  cycleInterval?: number;
  perceptions?: string[];
  onCycle?: (result: CycleResult) => void;
}

export class BDIAgent {
  readonly name: string;
  readonly beliefBase: BeliefBase;
  readonly goalManager: GoalManager;
  readonly planLibrary: PlanLibrary;
  readonly intentionManager: IntentionManager;
  readonly executor: Executor;

  private loop: ReasoningLoop;
  private running = false;

  constructor(name: string, config: BDIAgentConfig = {}) {
    this.name = name;
    const persist = config.persist ?? true;

    this.beliefBase = new BeliefBase(persist);
    this.goalManager = new GoalManager(persist);
    this.planLibrary = new PlanLibrary(persist);
    this.intentionManager = new IntentionManager();
    this.executor = new Executor();

    const brf = new BeliefRevisionFunction();
    const deliberation = new DeliberationEngine();
    const planSelector = new PlanSelector();

    this.loop = new ReasoningLoop(
      this.beliefBase,
      this.goalManager,
      this.planLibrary,
      this.intentionManager,
      this.executor,
      brf,
      deliberation,
      planSelector
    );

    if (config.verbose) {
      this.loop.on((event, data) => {
        console.log(`[${this.name}] ${event}:`, JSON.stringify(data, null, 2));
      });
    }
  }

  registerTool(name: string, fn: ToolFn): void {
    this.executor.registerTool(name, fn);
  }

  addGoal(
    description: string,
    priority: number,
    options: { successCondition?: string; deadline?: Date } = {}
  ): Goal {
    return this.goalManager.addGoal(
      description,
      priority,
      options.successCondition ?? description,
      { deadline: options.deadline }
    );
  }

  onEvent(listener: (event: string, data: unknown) => void): void {
    this.loop.on(listener);
  }

  async runCycle(perception?: string): Promise<CycleResult> {
    return this.loop.runCycle(perception);
  }

  async start(config: RunConfig): Promise<void> {
    this.running = true;
    const { cycles, cycleInterval = 1000, perceptions = [], onCycle } = config;

    console.log(`\n[${this.name}] Starting BDI agent — ${cycles} cycles\n`);

    for (let i = 0; i < cycles && this.running; i++) {
      const perception = perceptions[i];
      const result = await this.loop.runCycle(perception);

      if (onCycle) onCycle(result);
      else this.printCycleResult(result);

      if (i < cycles - 1 && cycleInterval > 0) {
        await new Promise(r => setTimeout(r, cycleInterval));
      }
    }

    console.log(`\n[${this.name}] Agent completed ${cycles} cycles.\n`);
  }

  stop(): void {
    this.running = false;
  }

  private printCycleResult(result: CycleResult): void {
    console.log(
      `Cycle ${result.cycleNumber} | beliefs updated: ${result.beliefUpdates} | ` +
      `goals committed: ${result.goalsCommitted} | steps: ${result.stepsExecuted} | ` +
      `errors: ${result.errors.length}`
    );
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.error('  ERROR:', err);
      }
    }
  }
}
