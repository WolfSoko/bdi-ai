import 'dotenv/config';
import { BDIAgent, Dashboard } from '@bdi-ai/agent';

async function main() {
  console.log('=== Task Management BDI Agent ===\n');

  const agent = new BDIAgent('TaskBot', {
    model: 'claude-sonnet-4-6',
    persist: true,
    verbose: false,
  });

  // Load plan library
  agent.planLibrary.loadFromJSON('plans/taskManagement.json');
  agent.planLibrary.loadFromJSON('plans/dailyPlanning.json');

  // Register domain tools
  agent.registerTool('createFile', async (params) => {
    console.log(`  [Tool] Creating file: ${params.path}`);
    return { created: true, path: params.path };
  });

  agent.registerTool('sendEmail', async (params) => {
    console.log(`  [Tool] Sending email to: ${params.to}`);
    return { sent: true, to: params.to };
  });

  agent.registerTool('scheduleTask', async (params) => {
    console.log(`  [Tool] Scheduling: ${params.task}`);
    return { scheduled: true, task: params.task };
  });

  agent.registerTool('logMessage', async (params) => {
    console.log(`  [Tool] ${params.message}`);
    return { logged: true };
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

  // Create dashboard
  const dashboard = new Dashboard(agent);

  // Run agent
  await agent.start({
    cycles: 10,
    cycleInterval: 2000,
    perceptions: [
      'Manager sent urgent email: report deadline moved to Wednesday',
      'New task added: prepare slides for Friday presentation',
      'Email inbox now at 8 unread after auto-archive',
      'Standup meeting completed, notes shared',
      'Report draft v1 created by team member',
    ],
    onCycle: (result) => dashboard.onCycle(result),
  });

  console.log('\n=== Task Agent Complete ===');
  console.log('Check bdi_state.db for persisted state.');
}

main().catch(console.error);
