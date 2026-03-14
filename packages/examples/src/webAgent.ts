import 'dotenv/config';
import { BDIAgent } from '@bdi-ai/agent';
import { startWebUI } from '@bdi-ai/web-ui';

async function main() {
  const agent = new BDIAgent('TaskBot', {
    persist: false,
    verbose: false,
  });

  // Load plan library
  agent.planLibrary.loadFromJSON('plans/taskManagement.json');
  agent.planLibrary.loadFromJSON('plans/dailyPlanning.json');

  // Register domain tools
  agent.registerTool('createFile', async (params) => {
    return { created: true, path: params.path };
  });

  agent.registerTool('sendEmail', async (params) => {
    return { sent: true, to: params.to };
  });

  agent.registerTool('scheduleTask', async (params) => {
    return { scheduled: true, task: params.task };
  });

  agent.registerTool('logMessage', async (params) => {
    return { logged: true, message: params.message };
  });

  // Seed initial world state
  agent.beliefBase.addBelief('It is Monday morning', 1.0);
  agent.beliefBase.addBelief('Project report is due Friday', 1.0);
  agent.beliefBase.addBelief('Inbox has 12 unread emails', 0.9);
  agent.beliefBase.addBelief('Team standup is at 10am', 0.8);

  // Add goals
  agent.addGoal('Complete project report', 0.9, {
    successCondition: 'report is complete and submitted',
  });

  agent.addGoal('Clear email inbox', 0.6, {
    successCondition: 'inbox has 0 unread messages',
  });

  agent.addGoal('Plan the day effectively', 0.7, {
    successCondition: 'daily plan is created with priorities',
  });

  // Start web UI
  const { url, bridge } = await startWebUI(agent, { port: 3100 });

  console.log(`  Dashboard ready at ${url}`);
  console.log('  Use the browser to send perceptions and control the agent.\n');
  console.log('  Press Ctrl+C to stop.\n');
}

main().catch(console.error);
