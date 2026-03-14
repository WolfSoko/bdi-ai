import type { PlanStep, ActionResult, Belief, Goal } from '@bdi-ai/models';

export type ToolFn = (params: Record<string, unknown>, context: ExecutionContext) => Promise<unknown>;

export interface ExecutionContext {
  beliefs: Belief[];
  goal: Goal;
}

export class Executor {
  private tools: Map<string, ToolFn> = new Map();

  constructor() {
    this.registerBuiltins();
  }

  private registerBuiltins(): void {
    this.registerTool('wait', async (params) => {
      const ms = (params.ms as number) ?? 1000;
      await new Promise(r => setTimeout(r, ms));
      return { waited: ms };
    });

    this.registerTool('logMessage', async (params) => {
      console.log('[Agent]', params.message);
      return { logged: true };
    });

    this.registerTool('noop', async () => {
      return { done: true };
    });
  }

  registerTool(name: string, fn: ToolFn): void {
    this.tools.set(name, fn);
  }

  async executeStep(step: PlanStep, context: ExecutionContext): Promise<ActionResult> {
    const start = Date.now();
    try {
      if (step.actionType === 'wait') {
        const ms = (step.parameters.ms as number) ?? 1000;
        await new Promise(r => setTimeout(r, ms));
        return { success: true, output: { waited: ms }, duration: Date.now() - start };
      }

      const tool = this.tools.get(step.actionName);
      if (!tool) {
        return {
          success: false,
          error: `Tool '${step.actionName}' not registered`,
          duration: Date.now() - start,
        };
      }

      const output = await tool(step.parameters, context);
      return { success: true, output, duration: Date.now() - start };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  }
}
