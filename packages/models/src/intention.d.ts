import type { Goal } from './goal.js';
import type { Plan } from './plan.js';
import type { ActionResult } from './action.js';
export type IntentionStatus = 'active' | 'suspended' | 'completed' | 'failed';
export interface Intention {
    id: string;
    goal: Goal;
    plan: Plan;
    currentStepIndex: number;
    status: IntentionStatus;
    createdAt: Date;
    executionHistory: Array<{
        stepId: string;
        result: ActionResult;
        timestamp: Date;
    }>;
}
//# sourceMappingURL=intention.d.ts.map