import { completeJSON } from './client.js';
import { DELIBERATION_SYSTEM } from './prompts.js';
import type { Belief, Goal, Intention } from '@bdi-ai/models';

interface DeliberationResult {
  selectedGoalIds: string[];
  reasoning: string;
}

export class DeliberationEngine {
  async filter(
    beliefs: Belief[],
    desires: Goal[],
    currentIntentions: Intention[]
  ): Promise<string[]> {
    if (desires.length === 0) return [];

    const activeGoalIds = new Set(currentIntentions.map(i => i.goal.id));

    const userContent = `## Current Beliefs
${beliefs.map(b => `- (conf: ${b.confidence.toFixed(2)}) ${b.content}`).join('\n') || 'No beliefs.'}

## Desires (Goals)
${desires.map(g => `- [${g.id}] Priority: ${g.priority.toFixed(2)} | Status: ${g.status} | "${g.description}"
  Success: ${g.successCondition}${g.deadline ? ` | Deadline: ${g.deadline.toISOString()}` : ''}`).join('\n')}

## Current Intentions (already being pursued)
${currentIntentions.length > 0
  ? currentIntentions.map(i => `- Goal: "${i.goal.description}" | Plan: ${i.plan.name} | Step: ${i.currentStepIndex + 1}/${i.plan.steps.length}`).join('\n')
  : 'None'}

## Task
Select which goals to commit to this cycle. Return JSON.`;

    try {
      const result = await completeJSON<DeliberationResult>(DELIBERATION_SYSTEM, userContent);
      const ids = result.selectedGoalIds ?? [];
      // Filter out goals already actively being pursued
      return ids.filter(id => !activeGoalIds.has(id));
    } catch (err) {
      console.error('Deliberation error:', err);
      // Fallback: pick highest priority goal not in intentions
      const available = desires.filter(g => !activeGoalIds.has(g.id));
      return available.slice(0, 1).map(g => g.id);
    }
  }
}
