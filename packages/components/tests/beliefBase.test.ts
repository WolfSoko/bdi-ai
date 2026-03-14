import { describe, it, expect, beforeEach } from 'vitest';
import { BeliefBase } from '../src/beliefBase.js';

describe('BeliefBase', () => {
  let bb: BeliefBase;

  beforeEach(() => {
    bb = new BeliefBase(false); // no persistence in tests
  });

  it('adds a belief', () => {
    const b = bb.addBelief('Sky is blue', 0.9, 'perception');
    expect(b.id).toBeTruthy();
    expect(b.content).toBe('Sky is blue');
    expect(b.confidence).toBe(0.9);
  });

  it('retrieves all beliefs', () => {
    bb.addBelief('Fact 1', 1.0);
    bb.addBelief('Fact 2', 0.5);
    expect(bb.getAll()).toHaveLength(2);
  });

  it('updates a belief', () => {
    const b = bb.addBelief('Initial', 1.0);
    const updated = bb.updateBelief(b.id, { confidence: 0.5 });
    expect(updated.confidence).toBe(0.5);
  });

  it('removes a belief', () => {
    const b = bb.addBelief('Temp', 1.0);
    bb.removeBelief(b.id);
    expect(bb.getAll()).toHaveLength(0);
  });

  it('queries beliefs by tag', () => {
    bb.addBelief('Tagged', 1.0, 'perception', ['important']);
    bb.addBelief('Untagged', 1.0, 'perception', []);
    expect(bb.queryBeliefs('important')).toHaveLength(1);
  });

  it('queries beliefs by min confidence', () => {
    bb.addBelief('High conf', 0.9);
    bb.addBelief('Low conf', 0.2);
    expect(bb.queryBeliefs(undefined, 0.5)).toHaveLength(1);
  });

  it('decays inference belief confidences', () => {
    const b = bb.addBelief('Inferred fact', 0.8, 'inference');
    bb.decayConfidences(0.1);
    expect(bb.getById(b.id)!.confidence).toBeCloseTo(0.7, 5);
  });

  it('applies belief updates', () => {
    bb.applyUpdates([
      { action: 'add', belief: { content: 'New fact', confidence: 0.8, source: 'llm', tags: [], metadata: {} } },
    ]);
    expect(bb.getAll()).toHaveLength(1);
    expect(bb.getAll()[0].content).toBe('New fact');
  });

  it('clamps confidence to [0, 1]', () => {
    const b1 = bb.addBelief('Too high', 1.5);
    const b2 = bb.addBelief('Too low', -0.5);
    expect(b1.confidence).toBe(1.0);
    expect(b2.confidence).toBe(0.0);
  });
});
