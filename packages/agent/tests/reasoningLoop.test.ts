import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReasoningLoop } from '../src/reasoningLoop.js';
import { BeliefBase, GoalManager, PlanLibrary, IntentionManager, Executor } from '@bdi-ai/components';
import { BeliefRevisionFunction, DeliberationEngine, PlanSelector } from '@bdi-ai/llm';

// Mock LLM calls
vi.mock('@bdi-ai/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bdi-ai/llm')>();
  return {
    ...actual,
    BeliefRevisionFunction: class {
      async revise() { return []; }
    },
    DeliberationEngine: class {
      async filter() { return []; }
    },
    PlanSelector: class {
      async select() {
        return {
          id: 'test-plan',
          name: 'Test Plan',
          goalPattern: '.*',
          triggerCondition: '',
          steps: [],
          estimatedCost: 1.0,
          source: 'llm_generated',
        };
      }
    },
  };
});

describe('ReasoningLoop', () => {
  let loop: ReasoningLoop;
  let beliefBase: BeliefBase;
  let goalManager: GoalManager;

  beforeEach(() => {
    beliefBase = new BeliefBase(false);
    goalManager = new GoalManager(false);
    const planLibrary = new PlanLibrary(false);
    const intentionManager = new IntentionManager();
    const executor = new Executor();
    const brf = new BeliefRevisionFunction();
    const deliberation = new DeliberationEngine();
    const planSelector = new PlanSelector();

    loop = new ReasoningLoop(
      beliefBase,
      goalManager,
      planLibrary,
      intentionManager,
      executor,
      brf,
      deliberation,
      planSelector
    );
  });

  it('runs a cycle and returns a result', async () => {
    const result = await loop.runCycle('Test perception');
    expect(result.cycleNumber).toBe(1);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('increments cycle count', async () => {
    await loop.runCycle();
    await loop.runCycle();
    expect(loop.getCycleCount()).toBe(2);
  });

  it('emits events during cycle', async () => {
    const events: string[] = [];
    loop.on((event) => events.push(event));
    await loop.runCycle('Some input');
    expect(events).toContain('cycle:start');
    expect(events).toContain('cycle:end');
  });

  it('processes perceptions into belief updates', async () => {
    beliefBase.addBelief('Initial belief', 1.0);
    const result = await loop.runCycle('New perception');
    expect(result.perceptionCount).toBe(1);
  });

  it('handles cycles with no perceptions gracefully', async () => {
    const result = await loop.runCycle();
    expect(result.perceptionCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('executes steps for active intentions', async () => {
    const goal = goalManager.addGoal('Test goal', 0.9, 'done');
    goalManager.updateStatus(goal.id, 'active');

    const result = await loop.runCycle();
    expect(result).toBeDefined();
  });
});
