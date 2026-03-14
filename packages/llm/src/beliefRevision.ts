import { completeJSON } from './client.js';
import { BELIEF_REVISION_SYSTEM } from './prompts.js';
import type { Belief, BeliefUpdate } from '@bdi-ai/models';

export class BeliefRevisionFunction {
  async revise(currentBeliefs: Belief[], perception: string): Promise<BeliefUpdate[]> {
    if (!perception.trim()) return [];

    const userContent = `## Current Beliefs
${currentBeliefs.map(b => `- [${b.id.slice(0, 8)}] (conf: ${b.confidence.toFixed(2)}) ${b.content}`).join('\n') || 'No current beliefs.'}

## New Perception
${perception}

## Task
Analyze the perception and return belief updates as a JSON array.`;

    try {
      const updates = await completeJSON<BeliefUpdate[]>(BELIEF_REVISION_SYSTEM, userContent);
      return Array.isArray(updates) ? updates : [];
    } catch (err) {
      console.error('BeliefRevision error:', err);
      return [];
    }
  }
}
