import type { BDIAgent } from '../agent.js';
import type { CycleResult } from '../reasoningLoop.js';
import { EventLog } from './eventLog.js';

export class Dashboard {
  private eventLog: EventLog;
  private cycleResults: CycleResult[] = [];

  constructor(private agent: BDIAgent) {
    this.eventLog = new EventLog();
    this.agent.onEvent((event, data) => {
      const level = event.includes('fail') || event.includes('error') ? 'error' : 'info';
      this.eventLog.add(event, data, level);
    });
  }

  onCycle(result: CycleResult): void {
    this.cycleResults.push(result);
    this.render(result);
  }

  private render(result: CycleResult): void {
    const beliefs = this.agent.beliefBase.getAll();
    const goals = this.agent.goalManager.getAll();
    const intentions = this.agent.intentionManager.getAll();

    console.log('\n' + '='.repeat(70));
    console.log(`  BDI AGENT: ${this.agent.name}  |  Cycle ${result.cycleNumber}`);
    console.log('='.repeat(70));

    // Beliefs
    console.log('\n BELIEFS:');
    for (const b of beliefs.slice(0, 5)) {
      const bar = '#'.repeat(Math.round(b.confidence * 10)) + '.'.repeat(10 - Math.round(b.confidence * 10));
      console.log(`  [${bar}] ${b.confidence.toFixed(2)}  ${b.content.slice(0, 60)}`);
    }

    // Goals
    console.log('\n GOALS:');
    for (const g of goals.slice(0, 5)) {
      const statusSymbol = { pending: 'o', active: '*', achieved: '+', failed: 'x', suspended: '-' }[g.status] ?? '?';
      console.log(`  ${statusSymbol} [${g.priority.toFixed(1)}] ${g.description.slice(0, 55)}`);
    }

    // Intentions
    console.log('\n INTENTIONS:');
    const activeIntentions = intentions.filter(i => i.status === 'active');
    if (activeIntentions.length === 0) {
      console.log('  (none active)');
    } else {
      for (const i of activeIntentions.slice(0, 3)) {
        const progress = `${i.currentStepIndex}/${i.plan.steps.length}`;
        console.log(`  > ${i.goal.description.slice(0, 40)} -- step ${progress}`);
      }
    }

    // Event Log
    console.log('\n RECENT EVENTS:');
    for (const entry of this.eventLog.getRecent(6)) {
      const time = entry.timestamp.toTimeString().slice(0, 8);
      console.log(`  [${time}] ${entry.event}`);
    }

    console.log('\n' + '-'.repeat(70));
    console.log(
      `  Updates: ${result.beliefUpdates} beliefs | ` +
      `${result.goalsCommitted} goals committed | ` +
      `${result.stepsExecuted} steps | ` +
      `${result.errors.length} errors`
    );
  }
}
