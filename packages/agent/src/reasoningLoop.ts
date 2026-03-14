import type { BeliefBase } from '@bdi-ai/components';
import type { GoalManager } from '@bdi-ai/components';
import type { PlanLibrary } from '@bdi-ai/components';
import type { IntentionManager } from '@bdi-ai/components';
import type { Executor } from '@bdi-ai/components';
import type { BeliefRevisionFunction } from '@bdi-ai/llm';
import type { DeliberationEngine } from '@bdi-ai/llm';
import type { PlanSelector } from '@bdi-ai/llm';
import type { Intention } from '@bdi-ai/models';

export interface CycleResult {
  cycleNumber: number;
  perceptionCount: number;
  beliefUpdates: number;
  goalsConsidered: number;
  goalsCommitted: number;
  stepsExecuted: number;
  errors: string[];
  timestamp: Date;
}

export interface PerceptionSource {
  getPercepts(): Promise<string[]>;
}

export class ReasoningLoop {
  private cycleCount = 0;
  private eventListeners: Array<(event: string, data: unknown) => void> = [];

  constructor(
    private beliefBase: BeliefBase,
    private goalManager: GoalManager,
    private planLibrary: PlanLibrary,
    private intentionManager: IntentionManager,
    private executor: Executor,
    private brf: BeliefRevisionFunction,
    private deliberation: DeliberationEngine,
    private planSelector: PlanSelector,
    private perceptionSource?: PerceptionSource
  ) {}

  on(listener: (event: string, data: unknown) => void): void {
    this.eventListeners.push(listener);
  }

  private emit(event: string, data: unknown): void {
    for (const listener of this.eventListeners) {
      listener(event, data);
    }
  }

  async runCycle(perception?: string): Promise<CycleResult> {
    this.cycleCount++;
    const result: CycleResult = {
      cycleNumber: this.cycleCount,
      perceptionCount: 0,
      beliefUpdates: 0,
      goalsConsidered: 0,
      goalsCommitted: 0,
      stepsExecuted: 0,
      errors: [],
      timestamp: new Date(),
    };

    this.emit('cycle:start', { cycle: this.cycleCount });

    // ── Step 1: Perceive ────────────────────────────────────────────────────
    let percepts: string[] = [];
    if (perception) {
      percepts = [perception];
    } else if (this.perceptionSource) {
      percepts = await this.perceptionSource.getPercepts();
    }
    result.perceptionCount = percepts.length;
    this.emit('perceive', { percepts });

    // ── Step 2: Belief Revision ─────────────────────────────────────────────
    for (const percept of percepts) {
      try {
        const updates = await this.brf.revise(this.beliefBase.getAll(), percept);
        this.beliefBase.applyUpdates(updates);
        result.beliefUpdates += updates.length;
        this.emit('belief:revised', { percept, updates });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`BeliefRevision: ${msg}`);
      }
    }

    // ── Step 3: Confidence Decay ────────────────────────────────────────────
    this.beliefBase.decayConfidences(0.01);

    // ── Step 4: Goal Evaluation ─────────────────────────────────────────────
    this.goalManager.checkAllAchieved(this.beliefBase.getAll());
    const activeGoals = this.goalManager.getActiveGoals();
    result.goalsConsidered = activeGoals.length;
    this.emit('goals:evaluated', { activeGoals: activeGoals.length });

    // ── Step 5: Deliberation ────────────────────────────────────────────────
    let goalIdsToCommit: string[] = [];
    try {
      goalIdsToCommit = await this.deliberation.filter(
        this.beliefBase.getAll(),
        activeGoals,
        this.intentionManager.getActive()
      );
      result.goalsCommitted = goalIdsToCommit.length;
      this.emit('deliberation:done', { committed: goalIdsToCommit });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Deliberation: ${msg}`);
    }

    // ── Step 6: Plan Selection + Intention Formation ─────────────────────────
    for (const goalId of goalIdsToCommit) {
      const goal = this.goalManager.getById(goalId);
      if (!goal) continue;
      try {
        const applicablePlans = this.planLibrary.findApplicable(goal);
        const plan = await this.planSelector.select(goal, applicablePlans, this.beliefBase.getAll());
        const intention = this.intentionManager.addIntention(goal, plan);
        this.goalManager.updateStatus(goalId, 'active');
        this.emit('intention:formed', { goal: goal.description, plan: plan.name, intentionId: intention.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`PlanSelection for ${goalId}: ${msg}`);
      }
    }

    // ── Step 7: Execute ─────────────────────────────────────────────────────
    const activeIntentions = this.intentionManager.getActive();
    for (const intention of activeIntentions) {
      const step = intention.plan.steps[intention.currentStepIndex];
      if (!step) {
        this.intentionManager.complete(intention.id);
        continue;
      }

      this.emit('step:executing', {
        intention: intention.id,
        step: step.description,
        stepIndex: intention.currentStepIndex,
      });

      try {
        const actionResult = await this.executor.executeStep(step, {
          beliefs: this.beliefBase.getAll(),
          goal: intention.goal,
        });

        result.stepsExecuted++;

        if (actionResult.success) {
          this.intentionManager.advanceStep(intention.id, actionResult);
          this.emit('step:success', { intention: intention.id, step: step.stepId, output: actionResult.output });
        } else {
          this.emit('step:failed', { intention: intention.id, step: step.stepId, error: actionResult.error });
          this.handleStepFailure(intention, step.onFailure, actionResult.error);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Execution ${intention.id}: ${msg}`);
        this.intentionManager.fail(intention.id, msg);
      }
    }

    this.emit('cycle:end', result);
    return result;
  }

  private handleStepFailure(
    intention: Intention,
    onFailure: 'abort' | 'retry' | 'continue',
    error?: string
  ): void {
    switch (onFailure) {
      case 'abort':
        this.intentionManager.fail(intention.id, error);
        break;
      case 'continue':
        this.intentionManager.advanceStep(intention.id);
        break;
      case 'retry':
        // Don't advance — step will retry next cycle
        break;
    }
  }

  getCycleCount(): number {
    return this.cycleCount;
  }
}
