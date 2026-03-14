import type { BDIAgent } from '@bdi-ai/agent';
import { createWebServer } from './server.js';
import { AgentBridge } from './bridge.js';

export { AgentBridge } from './bridge.js';
export type { AgentState, ClientMessage } from './bridge.js';
export { createWebServer } from './server.js';
export type { ServerHandle } from './server.js';

export interface WebUIOptions {
  port?: number;
  host?: string;
}

export interface WebUI {
  url: string;
  bridge: AgentBridge;
  close: () => void;
}

export async function startWebUI(agent: BDIAgent, options: WebUIOptions = {}): Promise<WebUI> {
  const { port = 3100, host = 'localhost' } = options;

  const server = await createWebServer(port, host);
  const bridge = new AgentBridge(agent, server.broadcast, server.wss);

  const url = `http://${host}:${port}`;
  console.log(`\n  BDI Web Dashboard: ${url}\n`);

  return { url, bridge, close: server.close };
}
