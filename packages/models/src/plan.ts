export type OnFailure = 'abort' | 'retry' | 'continue';

export interface PlanStep {
  stepId: string;
  actionType: 'tool_call' | 'llm_reason' | 'wait';
  actionName: string;
  parameters: Record<string, unknown>;
  description: string;
  onFailure: OnFailure;
}

export interface Plan {
  id: string;
  name: string;
  goalPattern: string;
  triggerCondition: string;
  steps: PlanStep[];
  estimatedCost: number;
  source: 'library' | 'llm_generated';
}
