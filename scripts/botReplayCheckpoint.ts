/** Read an earlier checkpoint from accepted commands without rerunning bot choices. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyCommand } from '../src/sim/commands';
import { loadGame, snapshotState, type SaveFile } from '../src/sim/game';
import { explainScore, foldScore } from '../src/sim/score';
import { citiesOf, newGame, realPlayers } from '../src/sim/state';
import { isCombatant, unitDef } from '../src/sim/unitData';
import { sampleEmpireIncome } from './botAuditReadings';

const [savePath, reportPath, turnText, output] = process.argv.slice(2);
const turn = Number(turnText);
if (!savePath || !reportPath || !output || !Number.isSafeInteger(turn) || turn < 1) {
  throw Error('Pass a save, its audit report, a completed turn and an output directory.');
}
const saved = JSON.parse(readFileSync(savePath, 'utf8')) as SaveFile;
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const state = newGame(saved.config);
const owners = new Map(state.cities.map(city => [city.id, city.ownerId]));
const losses = realPlayers(state).map(() => 0);
let length = 0;
while (length < saved.log.length && state.turn <= turn && state.winnerId === null) {
  const result = applyCommand(state, saved.log[length]!);
  assert(result.ok, `Replay command ${length} was refused.`);
  length++;
  for (const city of state.cities) {
    const before = owners.get(city.id);
    if (before !== undefined && before !== city.ownerId && losses[before] !== undefined) losses[before]!++;
    owners.set(city.id, city.ownerId);
  }
}
assert.equal(state.turn, turn + 1, 'The saved log must contain the whole requested turn.');
const prefix = { ...saved, log: saved.log.slice(0, length) };
assert.equal(snapshotState(loadGame(JSON.stringify(prefix)).state), snapshotState(state));
const seats = realPlayers(state).map(player => {
  const { rates, total } = sampleEmpireIncome(state, player.id);
  return {
    id: player.id, leader: player.leader, alive: !player.eliminated,
    score: foldScore(explainScore(state, player.id)), total, rates,
    techs: player.techsResearched.length, drafts: player.statecraft.drafts,
    captures: player.citiesCaptured ?? 0, citiesLost: losses[player.id],
    unitsLost: player.unitsLost ?? 0,
    military: state.units.filter(unit => unit.ownerId === player.id && isCombatant(unitDef(unit.type))).length,
    cities: citiesOf(state, player.id).map(city => ({ id: city.id })),
  };
});
// An existing checkpoint provides an independent check of the replayed totals.
const recorded = report.checkpoints[String(turn)];
if (recorded) for (const seat of seats) {
  const original = recorded.find((row: { id: number }) => row.id === seat.id);
  assert(original, `Missing recorded seat ${seat.id}.`);
  for (const [key, value] of Object.entries(seat)) {
    assert.deepEqual(value, key === 'cities' ? original.cities.map((city: { id: number }) => ({ id: city.id })) : original[key], key);
  }
}
mkdirSync(output, { recursive: true });
writeFileSync(join(output, `${report.seed}-${turn}.save.json`), JSON.stringify(prefix));
writeFileSync(join(output, `${report.seed}.json`), JSON.stringify({
  metricVersion: report.metricVersion, seed: report.seed, tuning: report.tuning, scenario: report.scenario,
  turn: state.turn, winner: state.winnerId, checkpoints: { [turn]: seats },
  warnings: report.warnings.filter((row: { turn: number }) => row.turn <= turn),
  // Search counters cannot be reconstructed from accepted commands.
  planning: null, tactics: null,
  decisions: (report.decisions ?? []).filter((row: { index: number }) => row.index < length),
  replayedCheckpoint: { savePath, reportPath, acceptedCommands: length, matchesExistingCheckpoint: Boolean(recorded) },
}) + '\n');
console.log(JSON.stringify({ turn, acceptedCommands: length, matchesExistingCheckpoint: Boolean(recorded) }));
