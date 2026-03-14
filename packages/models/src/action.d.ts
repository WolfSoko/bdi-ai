export interface ActionResult {
    success: boolean;
    output?: unknown;
    error?: string;
    duration?: number;
}
export interface Action {
    name: string;
    parameters: Record<string, unknown>;
    description?: string;
}
//# sourceMappingURL=action.d.ts.map