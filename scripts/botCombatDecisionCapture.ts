/** Reproduce a saved bot game and capture the private board behind accepted unit decisions. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBotTurn } from '../src/ai/driver';
import { setAiTuning } from '../src/ai/aiConfig';
import { askTheBot } from '../src/ai/frozenBoard';
import type { BotDecision } from '../src/ai/decision';
import { createGame, snapshotState, type SaveFile } from '../src/sim/game';

const [savePath, turnText, playerText, unitText, output, tuningPath] = process.argv.slice(2);
const turn = Number(turnText);
const playerId = Number(playerText);
const unitId = Number(unitText);
if (!savePath || !output || !Number.isSafeInteger(turn) || turn < 1 ||
    !Number.isSafeInteger(playerId) || playerId < 0 || !Number.isSafeInteger(unitId) || unitId < 1) {
  throw Error('Pass save path, turn, player id, unit id and output directory. Use the same code and AI settings as the saved game.');
}
const saved = JSON.parse(readFileSync(savePath, 'utf8')) as SaveFile;
if (tuningPath) setAiTuning(JSON.parse(readFileSync(tuningPath, 'utf8')));
const game = createGame(saved.config);
// The driver may remap a command's unit ids, but keeps its candidate array.
// Match that object, not an explanation that another decision could share.
const asked = new Map<BotDecision['candidates'], string>();
const captures: { index: number; decision: BotDecision; state: string }[] = [];
while (game.state.turn <= turn && game.state.winnerId === null) {
  const before = game.state.turn;
  for (const step of runBotTurn(game, {
    warn: message => { throw Error(message); },
    ask: (state, seat, sitting) => {
      const answer = askTheBot(state, seat, sitting);
      if (state.turn === turn && seat === playerId && answer?.decision &&
          'unitId' in answer.command && answer.command.unitId === unitId) {
        asked.set(answer.decision.candidates, snapshotState(state));
      }
      return answer;
    },
  })) {
    if (!step.result.ok) continue;
    const privateState = asked.get(step.decision.candidates);
    if (privateState !== undefined) {
      const index = game.log.length - 1;
      assert.deepEqual(saved.log[index], step.decision.command);
      captures.push({ index, decision: step.decision, state: privateState });
    }
  }
  assert(game.state.turn > before || game.state.winnerId !== null, 'The reproduced game stalled.');
}
assert.deepEqual(game.log, saved.log.slice(0, game.log.length), 'The recorded game uses different code or AI settings.');
assert(captures.length > 0, 'No matching accepted decision was captured.');
mkdirSync(output, { recursive: true });
for (const capture of captures) writeFileSync(join(output, `position-${capture.index}.json`), capture.state + '\n');
writeFileSync(join(output, 'capture.json'), JSON.stringify({
  turn, playerId, unitId, acceptedPrefixMatched: true,
  positions: captures.map(({ index, decision }) => ({ index, decision, file: `position-${index}.json` })),
}, null, 2) + '\n');
console.log(`Captured ${captures.length} accepted decisions on the original private planning boards; the full command prefix matched.`);
