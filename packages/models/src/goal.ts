export type GoalStatus = 'pending' | 'active' | 'achieved' | 'failed' | 'suspended';

export interface Goal {
  id: string;
  description: string;
  priority: number;
  preconditions: string[];
  successCondition: string;
  deadline?: Date;
  status: GoalStatus;
  parentGoalId?: string;
}
