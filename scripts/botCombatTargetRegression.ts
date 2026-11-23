/** Check a recorded stale attack against its original private and live boards. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { applyNextStep, freezeBoard, planSeat, startPlanRun } from '../src/ai/frozenBoard';
import { applyCommand } from '../src/sim/commands';
import { previewCombatRisk } from '../src/sim/combat';
import { loadGame, restoreState, snapshotState, type SaveFile } from '../src/sim/game';

const [savePath, positionPath, indexText, output] = process.argv.slice(2);
const index = Number(indexText);
if (!savePath || !positionPath || !output || !Number.isSafeInteger(index) || index < 0) {
  throw Error('Pass the save, original private planning snapshot, command index and output path.');
}
const saved = JSON.parse(readFileSync(savePath, 'utf8')) as SaveFile;
const command = saved.log[index];
assert(command?.type === 'attack', 'The recorded command must be an attack.');
const privateState = restoreState(readFileSync(positionPath, 'utf8'));
const live = loadGame(JSON.stringify({ ...saved, log: saved.log.slice(0, index) })).state;
assert.equal(privateState.turn, live.turn);
const privateBefore = snapshotState(privateState);
const expected = previewCombatRisk(privateState, command.unitId, command.target);
const actual = previewCombatRisk(live, command.unitId, command.target);
assert(expected.ok && actual.ok, 'The attack must be legal on both boards.');
let asked = false;
const plan = planSeat(freezeBoard(privateState), command.playerId, {
  ask: () => {
    if (asked) return null;
    asked = true;
    return { command, decision: null };
  },
  warn: message => { throw Error(message); },
});
assert.equal(plan.steps.length, 1);
assert.equal(snapshotState(privateState), privateBefore);
const before = snapshotState(live);
const run = startPlanRun(plan);
let dispatched = false;
const landed = applyNextStep(live, run, one => {
  dispatched = true;
  return applyCommand(live, one);
});
assert.equal(landed, null);
assert.equal(dispatched, false);
assert.equal(run.cut, 'combat');
assert.equal(run.guards.accepted, 0);
assert.equal(run.guards.refused, 0);
assert.equal(snapshotState(live), before);
writeFileSync(output, JSON.stringify({
  index, turn: live.turn, command,
  expectedCombat: plan.steps[0]!.combat,
  privateForecast: expected, liveForecast: actual,
  cut: run.cut, reason: run.error, dispatched, stateUnchanged: true,
}, null, 2) + '\n');
console.log(`Stopped the stale attack at command ${index} before dispatch; both boards stayed unchanged.`);
