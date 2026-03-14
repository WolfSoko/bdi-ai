import { v4 as uuidv4 } from 'uuid';
import type { Belief, BeliefUpdate } from '@bdi-ai/models';
import { BeliefRepository } from '@bdi-ai/persistence';

export class BeliefBase {
  private beliefs: Map<string, Belief> = new Map();
  private persist: boolean;

  constructor(persist = true) {
    this.persist = persist;
    if (persist) {
      this.loadFromDB();
    }
  }

  private loadFromDB(): void {
    const all = BeliefRepository.findAll();
    for (const b of all) {
      this.beliefs.set(b.id, b);
    }
  }

  addBelief(
    content: string,
    confidence = 1.0,
    source: Belief['source'] = 'perception',
    tags: string[] = [],
    metadata: Record<string, unknown> = {}
  ): Belief {
    const now = new Date();
    const belief: Belief = {
      id: uuidv4(),
      content,
      confidence: Math.min(1, Math.max(0, confidence)),
      source,
      tags,
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.beliefs.set(belief.id, belief);
    if (this.persist) BeliefRepository.save(belief);
    return belief;
  }

  updateBelief(id: string, patch: Partial<Omit<Belief, 'id' | 'createdAt'>>): Belief {
    const existing = this.beliefs.get(id);
    if (!existing) throw new Error(`Belief ${id} not found`);
    const updated: Belief = {
      ...existing,
      ...patch,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.beliefs.set(id, updated);
    if (this.persist) BeliefRepository.save(updated);
    return updated;
  }

  removeBelief(id: string): void {
    this.beliefs.delete(id);
    if (this.persist) BeliefRepository.delete(id);
  }

  queryBeliefs(tag?: string, minConfidence = 0): Belief[] {
    return Array.from(this.beliefs.values()).filter(b => {
      if (b.confidence < minConfidence) return false;
      if (tag && !b.tags.includes(tag)) return false;
      return true;
    });
  }

  getAll(): Belief[] {
    return Array.from(this.beliefs.values());
  }

  getById(id: string): Belief | undefined {
    return this.beliefs.get(id);
  }

  findByContent(content: string): Belief | undefined {
    return Array.from(this.beliefs.values()).find(b =>
      b.content.toLowerCase().includes(content.toLowerCase())
    );
  }

  applyUpdates(updates: BeliefUpdate[]): void {
    for (const update of updates) {
      if (update.action === 'add' && update.belief.content) {
        this.addBelief(
          update.belief.content,
          update.belief.confidence ?? 1.0,
          update.belief.source ?? 'llm',
          update.belief.tags ?? [],
          update.belief.metadata ?? {}
        );
      } else if (update.action === 'update' && update.belief.id) {
        try {
          this.updateBelief(update.belief.id, update.belief);
        } catch {
          // belief may not exist; skip
        }
      } else if (update.action === 'remove' && update.belief.id) {
        this.removeBelief(update.belief.id);
      }
    }
  }

  decayConfidences(rate = 0.01): void {
    for (const [id, belief] of this.beliefs) {
      if (belief.source === 'inference') {
        const newConfidence = Math.max(0, belief.confidence - rate);
        this.updateBelief(id, { confidence: newConfidence });
      }
    }
  }

  clear(): void {
    this.beliefs.clear();
    if (this.persist) BeliefRepository.deleteAll();
  }
}
