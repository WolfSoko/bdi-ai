import { v4 as uuidv4 } from 'uuid';
import { completeJSON } from './client.js';
import { PLAN_SELECTOR_SYSTEM } from './prompts.js';
import type { Goal, Plan, Belief } from '@bdi-ai/models';

export class PlanSelector {
  async select(goal: Goal, applicablePlans: Plan[], beliefs: Belief[]): Promise<Plan> {
    if (applicablePlans.length === 0) {
      return this.generatePlan(goal, beliefs);
    }

    const userContent = `## Goal to Achieve
ID: ${goal.id}
Description: "${goal.description}"
Priority: ${goal.priority}
Success Condition: ${goal.successCondition}

## Available Plans
${applicablePlans.map(p => `### ${p.name} (id: ${p.id})
- Pattern: ${p.goalPattern}
- Trigger: ${p.triggerCondition}
- Cost: ${p.estimatedCost}
- Steps: ${p.steps.length}`).join('\n\n')}

## Current Beliefs
${beliefs.map(b => `- ${b.content}`).join('\n') || 'No beliefs.'}

## Task
Select the best plan from the available plans, or generate a new one if none fits well.
Return the complete plan JSON (either the selected plan or a newly generated one).`;

    try {
      const plan = await completeJSON<Plan>(PLAN_SELECTOR_SYSTEM, userContent);
      if (!plan.id) plan.id = uuidv4();
      if (!plan.source) plan.source = 'llm_generated';
      return plan;
    } catch (err) {
      console.error('PlanSelector error:', err);
      // Return best matching plan by cost
      return applicablePlans.sort((a, b) => a.estimatedCost - b.estimatedCost)[0];
    }
  }

  private async generatePlan(goal: Goal, beliefs: Belief[]): Promise<Plan> {
    const userContent = `## Goal to Achieve
Description: "${goal.description}"
Priority: ${goal.priority}
Success Condition: ${goal.successCondition}

## Current Beliefs
${beliefs.map(b => `- ${b.content}`).join('\n') || 'No beliefs.'}

## Available Plans
None - you must generate a new plan.

## Task
Generate a new step-by-step plan to achieve this goal. Return the complete plan as JSON.`;

    try {
      const plan = await completeJSON<Plan>(PLAN_SELECTOR_SYSTEM, userContent);
      if (!plan.id) plan.id = uuidv4();
      plan.source = 'llm_generated';
      return plan;
    } catch (err) {
      console.error('PlanSelector generate error:', err);
      // Emergency fallback plan
      return {
        id: uuidv4(),
        name: `Plan for: ${goal.description}`,
        goalPattern: '.*',
        triggerCondition: 'always',
        steps: [
          {
            stepId: 's1',
            actionType: 'tool_call',
            actionName: 'logMessage',
            parameters: { message: `Working on: ${goal.description}` },
            description: 'Log goal progress',
            onFailure: 'continue',
          },
        ],
        estimatedCost: 1.0,
        source: 'llm_generated',
      };
    }
  }
}
