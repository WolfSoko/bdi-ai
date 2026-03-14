export interface Perception {
  id: string;
  content: string;
  source: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}
