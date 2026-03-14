import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeliberationEngine } from '../src/deliberation.js';
import type { Belief, Goal, Intention } from '@bdi-ai/models';

// Mock the LLM client
vi.mock('../src/client.js', () => ({
  completeJSON: vi.fn().mockResolvedValue({
    selectedGoalIds: ['goal-1'],
    reasoning: 'Highest priority goal selected',
  }),
}));

describe('DeliberationEngine', () => {
  let engine: DeliberationEngine;
  let beliefs: Belief[];
  let goals: Goal[];

  beforeEach(() => {
    engine = new DeliberationEngine();
    beliefs = [
      {
        id: 'b1',
        content: 'It is morning',
        confidence: 1.0,
        source: 'perception',
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    goals = [
      {
        id: 'goal-1',
        description: 'Write report',
        priority: 0.9,
        status: 'pending',
        successCondition: 'report done',
        preconditions: [],
      },
      {
        id: 'goal-2',
        description: 'Check email',
        priority: 0.5,
        status: 'pending',
        successCondition: 'inbox empty',
        preconditions: [],
      },
    ];
  });

  it('returns goal IDs from LLM response', async () => {
    const result = await engine.filter(beliefs, goals, []);
    expect(result).toContain('goal-1');
  });

  it('filters out goals already in active intentions', async () => {
    const intention: Intention = {
      id: 'i1',
      goal: goals[0],
      plan: {
        id: 'p1',
        name: 'Plan',
        goalPattern: '.*',
        triggerCondition: '',
        steps: [],
        estimatedCost: 1,
        source: 'library',
      },
      currentStepIndex: 0,
      status: 'active',
      createdAt: new Date(),
      executionHistory: [],
    };
    const result = await engine.filter(beliefs, goals, [intention]);
    expect(result).not.toContain('goal-1');
  });

  it('returns empty array when no goals', async () => {
    const result = await engine.filter(beliefs, [], []);
    expect(result).toEqual([]);
  });
});
