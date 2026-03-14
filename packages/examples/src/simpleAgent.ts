import 'dotenv/config';
import { BDIAgent } from '@bdi-ai/agent';

async function main() {
  console.log('=== Simple BDI Agent Demo ===\n');

  const agent = new BDIAgent('SimpleBot', {
    verbose: false,
    persist: false,
  });

  // Add some initial beliefs
  agent.beliefBase.addBelief('It is a productive Monday morning', 1.0);
  agent.beliefBase.addBelief('There are several tasks awaiting attention', 0.9);

  // Add goals
  agent.addGoal(
    'Plan the day effectively',
    0.8,
    { successCondition: 'daily plan is created' }
  );

  agent.addGoal(
    'Handle pending communications',
    0.6,
    { successCondition: 'all messages replied to' }
  );

  // Register a simple tool
  agent.registerTool('logMessage', async (params) => {
    console.log('  [Action]', params.message);
    return { done: true };
  });

  // Run 3 cycles with perceptions
  await agent.start({
    cycles: 3,
    cycleInterval: 500,
    perceptions: [
      'New email received from manager about project deadline',
      'Calendar reminder: team standup in 30 minutes',
      'Task list updated with 5 new items',
    ],
    onCycle: (result) => {
      console.log(`\n--- Cycle ${result.cycleNumber} Complete ---`);
      console.log(`  Belief updates: ${result.beliefUpdates}`);
      console.log(`  Goals committed: ${result.goalsCommitted}`);
      console.log(`  Steps executed: ${result.stepsExecuted}`);
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
      }

      // Show current beliefs
      const beliefs = agent.beliefBase.getAll();
      console.log(`\n  Current Beliefs (${beliefs.length}):`);
      for (const b of beliefs.slice(0, 3)) {
        console.log(`    - [${b.confidence.toFixed(2)}] ${b.content}`);
      }
    },
  });

  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
