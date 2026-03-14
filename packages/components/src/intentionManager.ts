import { v4 as uuidv4 } from 'uuid';
import type { Intention, IntentionStatus, Goal, Plan, ActionResult } from '@bdi-ai/models';
import { IntentionRepository } from '@bdi-ai/persistence';

export class IntentionManager {
  private intentions: Map<string, Intention> = new Map();
  private persist: boolean;

  constructor(persist = false) {
    this.persist = persist;
  }

  addIntention(goal: Goal, plan: Plan): Intention {
    // Avoid duplicate intentions for same goal
    for (const existing of this.intentions.values()) {
      if (existing.goal.id === goal.id && existing.status === 'active') {
        return existing;
      }
    }
    const intention: Intention = {
      id: uuidv4(),
      goal,
      plan,
      currentStepIndex: 0,
      status: 'active',
      createdAt: new Date(),
      executionHistory: [],
    };
    this.intentions.set(intention.id, intention);
    if (this.persist) IntentionRepository.save(intention);
    return intention;
  }

  getActive(): Intention[] {
    return Array.from(this.intentions.values()).filter(i => i.status === 'active');
  }

  getAll(): Intention[] {
    return Array.from(this.intentions.values());
  }

  advanceStep(intentionId: string, result?: ActionResult): void {
    const intention = this.intentions.get(intentionId);
    if (!intention) return;

    if (result) {
      const step = intention.plan.steps[intention.currentStepIndex];
      intention.executionHistory.push({
        stepId: step?.stepId ?? `step-${intention.currentStepIndex}`,
        result,
        timestamp: new Date(),
      });
    }

    intention.currentStepIndex++;
    if (intention.currentStepIndex >= intention.plan.steps.length) {
      this.complete(intentionId);
    } else {
      if (this.persist) IntentionRepository.save(intention);
    }
  }

  suspend(intentionId: string): void {
    this.setStatus(intentionId, 'suspended');
  }

  complete(intentionId: string): void {
    this.setStatus(intentionId, 'completed');
  }

  fail(intentionId: string, reason?: string): void {
    const intention = this.intentions.get(intentionId);
    if (intention) {
      intention.executionHistory.push({
        stepId: `failure-${intention.currentStepIndex}`,
        result: { success: false, error: reason },
        timestamp: new Date(),
      });
    }
    this.setStatus(intentionId, 'failed');
  }

  private setStatus(intentionId: string, status: IntentionStatus): void {
    const intention = this.intentions.get(intentionId);
    if (!intention) return;
    intention.status = status;
    if (this.persist) IntentionRepository.save(intention);
  }
}
