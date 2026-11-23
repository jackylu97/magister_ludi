/** Compare the first changed attack before each pair of games diverges. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { previewCombat, previewCombatRisk } from '../src/sim/combat';
import { loadGame, snapshotState, type SaveFile } from '../src/sim/game';

const [root, beforeVariant = 'war-losses', afterVariant = 'ranked-attacks'] = process.argv.slice(2);
if (!root) throw Error('Pass the comparison directory.');
const schedule = JSON.parse(readFileSync(join(root, 'schedule.json'), 'utf8'));
const seeds = process.env.BOT_COMBAT_SEEDS?.split(',').map(Number);
const cases: unknown[] = [];
for (const { seed } of schedule.lineups) {
  if (seeds && !seeds.includes(seed)) continue;
  const files = [beforeVariant, afterVariant].map(variant => {
    const directory = join(root, variant, String(seed));
    const report = JSON.parse(readFileSync(join(directory, `${seed}.json`), 'utf8'));
    const checkpoint = Math.max(...Object.keys(report.checkpoints).map(Number));
    return JSON.parse(readFileSync(join(directory, `${seed}-${checkpoint}.save.json`), 'utf8')) as SaveFile;
  });
  assert.deepEqual(files[0]!.config, files[1]!.config);
  const limit = Math.min(files[0]!.log.length, files[1]!.log.length);
  let index = 0;
  while (index < limit && JSON.stringify(files[0]!.log[index]) === JSON.stringify(files[1]!.log[index])) index++;
  if (index === limit) {
    cases.push({ seed, sharedCommands: index, differentAttack: false });
    continue;
  }
  const before = loadGame(JSON.stringify({ ...files[0]!, log: files[0]!.log.slice(0, index) }));
  const state = before.state;
  const snapshot = snapshotState(state);
  const choices = files.map(file => {
    const command = file.log[index]!;
    if (command.type !== 'attack') return { command, preview: null };
    const unit = state.units.find(unit => unit.id === command.unitId)!;
    return {
      command, unit: { type: unit.type, hp: unit.hp, col: unit.col, row: unit.row },
      preview: previewCombat(state, unit.id, command.target),
      risk: previewCombatRisk(state, unit.id, command.target),
    };
  });
  assert.equal(snapshotState(state), snapshot);
  cases.push({ seed, turn: state.turn, sharedCommands: index, choices });
  console.log(`Compared seed ${seed}, first change at command ${index}, turn ${state.turn}.`);
}
const filename = process.argv.length > 3
  ? `first-attack-differences-${beforeVariant}-${afterVariant}.json`
  : 'first-attack-differences.json';
writeFileSync(join(root, filename), JSON.stringify(cases, null, 2) + '\n');
