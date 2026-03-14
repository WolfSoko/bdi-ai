import { v4 as uuidv4 } from 'uuid';
import type { Goal, GoalStatus, Belief } from '@bdi-ai/models';
import { GoalRepository } from '@bdi-ai/persistence';

export class GoalManager {
  private goals: Map<string, Goal> = new Map();
  private persist: boolean;

  constructor(persist = true) {
    this.persist = persist;
    if (persist) {
      this.loadFromDB();
    }
  }

  private loadFromDB(): void {
    const all = GoalRepository.findAll();
    for (const g of all) {
      this.goals.set(g.id, g);
    }
  }

  addGoal(
    description: string,
    priority: number,
    successCondition: string,
    options: {
      preconditions?: string[];
      deadline?: Date;
      parentGoalId?: string;
    } = {}
  ): Goal {
    const goal: Goal = {
      id: uuidv4(),
      description,
      priority: Math.min(1, Math.max(0, priority)),
      successCondition,
      preconditions: options.preconditions ?? [],
      deadline: options.deadline,
      parentGoalId: options.parentGoalId,
      status: 'pending',
    };
    this.goals.set(goal.id, goal);
    if (this.persist) GoalRepository.save(goal);
    return goal;
  }

  updateStatus(goalId: string, status: GoalStatus): void {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);
    goal.status = status;
    if (this.persist) GoalRepository.save(goal);
  }

  getById(id: string): Goal | undefined {
    return this.goals.get(id);
  }

  getAll(): Goal[] {
    return Array.from(this.goals.values());
  }

  getActiveGoals(): Goal[] {
    return Array.from(this.goals.values()).filter(g =>
      g.status === 'active' || g.status === 'pending'
    );
  }

  getByPriority(): Goal[] {
    return this.getActiveGoals().sort((a, b) => b.priority - a.priority);
  }

  checkAchieved(goal: Goal, beliefs: Belief[]): boolean {
    const beliefContents = beliefs.map(b => b.content.toLowerCase());
    const condition = goal.successCondition.toLowerCase();
    return beliefContents.some(c => c.includes(condition) || condition.includes(c));
  }

  checkAllAchieved(beliefs: Belief[]): void {
    for (const goal of this.goals.values()) {
      if (goal.status === 'active' || goal.status === 'pending') {
        if (this.checkAchieved(goal, beliefs)) {
          this.updateStatus(goal.id, 'achieved');
        }
        if (goal.deadline && goal.deadline < new Date() && goal.status !== 'achieved') {
          this.updateStatus(goal.id, 'failed');
        }
      }
    }
  }
}
