import { readFileSync } from 'fs';
import type { Plan } from '@bdi-ai/models';
import { PlanRepository } from '@bdi-ai/persistence';

export class PlanLibrary {
  private plans: Map<string, Plan> = new Map();
  private persist: boolean;

  constructor(persist = true) {
    this.persist = persist;
    if (persist) {
      this.loadFromDB();
    }
  }

  private loadFromDB(): void {
    const all = PlanRepository.findAll();
    for (const p of all) {
      this.plans.set(p.id, p);
    }
  }

  loadFromJSON(filePath: string): void {
    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as { plans: Plan[] };
    for (const plan of data.plans) {
      this.addPlan({ ...plan, source: 'library' });
    }
  }

  addPlan(plan: Plan): Plan {
    this.plans.set(plan.id, plan);
    if (this.persist) PlanRepository.save(plan);
    return plan;
  }

  findApplicable(goal: { description: string }): Plan[] {
    return Array.from(this.plans.values()).filter(plan => {
      try {
        const re = new RegExp(plan.goalPattern, 'i');
        return re.test(goal.description);
      } catch {
        return goal.description.toLowerCase().includes(plan.goalPattern.toLowerCase());
      }
    });
  }

  getById(id: string): Plan | undefined {
    return this.plans.get(id);
  }

  getAll(): Plan[] {
    return Array.from(this.plans.values());
  }
}
