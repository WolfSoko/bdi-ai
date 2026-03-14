import { describe, it, expect, beforeEach } from 'vitest';
import { GoalManager } from '../src/goalManager.js';

describe('GoalManager', () => {
  let gm: GoalManager;

  beforeEach(() => {
    gm = new GoalManager(false);
  });

  it('adds a goal', () => {
    const g = gm.addGoal('Write report', 0.9, 'report exists');
    expect(g.id).toBeTruthy();
    expect(g.description).toBe('Write report');
    expect(g.status).toBe('pending');
  });

  it('updates goal status', () => {
    const g = gm.addGoal('Test goal', 0.5, 'done');
    gm.updateStatus(g.id, 'active');
    expect(gm.getById(g.id)!.status).toBe('active');
  });

  it('returns active goals only', () => {
    gm.addGoal('Pending', 0.5, 'cond');
    const active = gm.addGoal('Active', 0.8, 'cond');
    gm.updateStatus(active.id, 'active');
    const achieved = gm.addGoal('Achieved', 0.3, 'cond');
    gm.updateStatus(achieved.id, 'achieved');

    const activeGoals = gm.getActiveGoals();
    expect(activeGoals.length).toBe(2); // pending + active
  });

  it('sorts goals by priority', () => {
    gm.addGoal('Low', 0.2, 'c');
    gm.addGoal('High', 0.9, 'c');
    gm.addGoal('Mid', 0.5, 'c');
    const sorted = gm.getByPriority();
    expect(sorted[0].priority).toBe(0.9);
    expect(sorted[2].priority).toBe(0.2);
  });

  it('checks goal achieved via beliefs', () => {
    const g = gm.addGoal('Write report', 0.9, 'report is complete');
    const beliefs = [
      { id: '1', content: 'The report is complete and submitted', confidence: 1.0, source: 'perception' as const, tags: [], metadata: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    expect(gm.checkAchieved(g, beliefs)).toBe(true);
  });

  it('marks overdue goals as failed', () => {
    const g = gm.addGoal('Overdue', 0.9, 'done', {
      deadline: new Date(Date.now() - 10000),
    });
    gm.updateStatus(g.id, 'active');
    gm.checkAllAchieved([]);
    expect(gm.getById(g.id)!.status).toBe('failed');
  });
});
