export interface Belief {
    id: string;
    content: string;
    confidence: number;
    source: 'perception' | 'inference' | 'llm';
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    metadata: Record<string, unknown>;
}
export interface BeliefUpdate {
    action: 'add' | 'update' | 'remove';
    belief: Partial<Belief> & {
        content?: string;
    };
}
//# sourceMappingURL=belief.d.ts.map