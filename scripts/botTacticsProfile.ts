/** Time one saved turn and preserve its slowest original planning decision. */
import { readFileSync, writeFileSync } from 'node:fs';
import { setAiTuning } from '../src/ai/aiConfig';
import { runBotTurn } from '../src/ai/driver';
import { askTheBot, frozenTally } from '../src/ai/frozenBoard';
import { unitTacticalTally } from '../src/ai/tactics/metrics';
import { tacticalTally } from '../src/ai/tactics/planner';
import { loadGame, snapshotState } from '../src/sim/game';

const [save, output, tuning] = process.argv.slice(2);
if (!save || !output) throw Error('Pass a saved game and output prefix.');
const game = loadGame(readFileSync(save, 'utf8'));
setAiTuning(tuning ? JSON.parse(readFileSync(tuning, 'utf8')) : { tactics: { enabled: 1 } });
const started = performance.now();
let longest = 0;
const rows: { ms: number; playerId: number; command: unknown }[] = [];
try {
  for (const step of runBotTurn(game, {
    ask: (state, playerId, sitting) => {
      if (performance.now() - started > 60_000) throw Error('The profiling window ended.');
      const start = performance.now();
      const answer = askTheBot(state, playerId, sitting);
      const ms = performance.now() - start;
      rows.push({ ms, playerId, command: answer?.command });
      if (ms > longest && answer && 'unitId' in answer.command) {
        longest = ms;
        writeFileSync(`${output}.position.json`, snapshotState(state));
        writeFileSync(`${output}.decision.json`, JSON.stringify(answer, null, 2));
      }
      return answer;
    },
    warn: message => { throw Error(message); },
  })) {
    if (step.decision.command.type === 'endTurn') console.log(`Finished seat ${step.playerId}.`);
  }
} finally {
  const report = { elapsedMs: performance.now() - started, rows, tactics: { ...tacticalTally }, perUnit: { ...unitTacticalTally }, planning: frozenTally };
  writeFileSync(`${output}.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${output}.state.json`, snapshotState(game.state));
  console.log(JSON.stringify({ ...report, rows: [...rows].sort((a, b) => b.ms - a.ms).slice(0, 8) }));
}
