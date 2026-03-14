import { getDatabase } from './database.js';
import type { Belief } from '@bdi-ai/models';
import type { Goal } from '@bdi-ai/models';
import type { Plan } from '@bdi-ai/models';
import type { Intention } from '@bdi-ai/models';

// node:sqlite returns null-prototype objects; cast rows via this helper
function toPlain(row: unknown): Record<string, unknown> {
  return Object.assign({}, row) as Record<string, unknown>;
}

// ─── Belief Repository ───────────────────────────────────────────────────────

export const BeliefRepository = {
  save(belief: Belief): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO beliefs (id, content, confidence, source, tags, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      belief.id,
      belief.content,
      belief.confidence,
      belief.source,
      JSON.stringify(belief.tags),
      JSON.stringify(belief.metadata),
      belief.createdAt.toISOString(),
      belief.updatedAt.toISOString()
    );
  },

  findById(id: string): Belief | undefined {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM beliefs WHERE id = ?').get(id);
    return row ? rowToBelief(toPlain(row)) : undefined;
  },

  findAll(): Belief[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM beliefs').all() as unknown[];
    return rows.map(r => rowToBelief(toPlain(r)));
  },

  delete(id: string): void {
    getDatabase().prepare('DELETE FROM beliefs WHERE id = ?').run(id);
  },

  deleteAll(): void {
    getDatabase().prepare('DELETE FROM beliefs').run();
  },
};

function rowToBelief(row: Record<string, unknown>): Belief {
  return {
    id: row.id as string,
    content: row.content as string,
    confidence: row.confidence as number,
    source: row.source as Belief['source'],
    tags: JSON.parse(row.tags as string),
    metadata: JSON.parse(row.metadata as string),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// ─── Goal Repository ─────────────────────────────────────────────────────────

export const GoalRepository = {
  save(goal: Goal): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO goals (id, description, priority, status, success_condition, preconditions, deadline, parent_goal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      goal.id,
      goal.description,
      goal.priority,
      goal.status,
      goal.successCondition,
      JSON.stringify(goal.preconditions),
      goal.deadline?.toISOString() ?? null,
      goal.parentGoalId ?? null
    );
  },

  findById(id: string): Goal | undefined {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    return row ? rowToGoal(toPlain(row)) : undefined;
  },

  findAll(): Goal[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM goals').all() as unknown[];
    return rows.map(r => rowToGoal(toPlain(r)));
  },

  findByStatus(status: string): Goal[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM goals WHERE status = ?').all(status) as unknown[];
    return rows.map(r => rowToGoal(toPlain(r)));
  },

  delete(id: string): void {
    getDatabase().prepare('DELETE FROM goals WHERE id = ?').run(id);
  },
};

function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    description: row.description as string,
    priority: row.priority as number,
    status: row.status as Goal['status'],
    successCondition: row.success_condition as string,
    preconditions: JSON.parse(row.preconditions as string),
    deadline: row.deadline ? new Date(row.deadline as string) : undefined,
    parentGoalId: row.parent_goal_id as string | undefined,
  };
}

// ─── Plan Repository ─────────────────────────────────────────────────────────

export const PlanRepository = {
  save(plan: Plan): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO plans (id, name, goal_pattern, trigger_condition, steps, estimated_cost, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      plan.id,
      plan.name,
      plan.goalPattern,
      plan.triggerCondition,
      JSON.stringify(plan.steps),
      plan.estimatedCost,
      plan.source
    );
  },

  findById(id: string): Plan | undefined {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    return row ? rowToPlan(toPlain(row)) : undefined;
  },

  findAll(): Plan[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM plans').all() as unknown[];
    return rows.map(r => rowToPlan(toPlain(r)));
  },

  delete(id: string): void {
    getDatabase().prepare('DELETE FROM plans WHERE id = ?').run(id);
  },
};

function rowToPlan(row: Record<string, unknown>): Plan {
  return {
    id: row.id as string,
    name: row.name as string,
    goalPattern: row.goal_pattern as string,
    triggerCondition: row.trigger_condition as string,
    steps: JSON.parse(row.steps as string),
    estimatedCost: row.estimated_cost as number,
    source: row.source as Plan['source'],
  };
}

// ─── Intention Repository ─────────────────────────────────────────────────────

export const IntentionRepository = {
  save(intention: Intention): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO intentions (id, goal_id, plan_id, current_step_index, status, created_at, execution_history)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      intention.id,
      intention.goal.id,
      intention.plan.id,
      intention.currentStepIndex,
      intention.status,
      intention.createdAt.toISOString(),
      JSON.stringify(intention.executionHistory.map(h => ({
        ...h,
        timestamp: h.timestamp.toISOString(),
      })))
    );
  },

  findAll(): Array<{ id: string; goalId: string; planId: string; currentStepIndex: number; status: string; createdAt: Date; executionHistory: unknown[] }> {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM intentions').all() as unknown[];
    return rows.map(r => {
      const row = toPlain(r);
      return {
        id: row.id as string,
        goalId: row.goal_id as string,
        planId: row.plan_id as string,
        currentStepIndex: row.current_step_index as number,
        status: row.status as string,
        createdAt: new Date(row.created_at as string),
        executionHistory: JSON.parse(row.execution_history as string),
      };
    });
  },

  delete(id: string): void {
    getDatabase().prepare('DELETE FROM intentions WHERE id = ?').run(id);
  },

  deleteAll(): void {
    getDatabase().prepare('DELETE FROM intentions').run();
  },
};
