/** Replay the final saves from a bot comparison and check its recorded economy. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readWarExchange } from '../src/ai/warLedger';
import { loadGame, saveGame, snapshotState } from '../src/sim/game';
import { explainScore, foldScore } from '../src/sim/score';
import { citiesOf, realPlayers } from '../src/sim/state';
import { isCombatant, unitDef } from '../src/sim/unitData';
import { sampleEmpireIncome } from './botAuditReadings';

const [root, ...requestedVariants] = process.argv.slice(2);
if (!root) throw Error('Pass the comparison directory and optional variant names.');
const variants = requestedVariants.length ? requestedVariants : ['baseline', 'war-losses', 'ranked-attacks'];
const output = requestedVariants.length ? `replay-audit-${variants.join('-')}.json` : 'replay-audit.json';
const schedule = JSON.parse(readFileSync(join(root, 'schedule.json'), 'utf8'));
const results: unknown[] = [];
for (const variant of variants) {
  for (const { seed } of schedule.lineups) {
    const directory = join(root, variant, String(seed));
    const report = JSON.parse(readFileSync(join(directory, `${seed}.json`), 'utf8'));
    const checkpoint = Math.max(...Object.keys(report.checkpoints).map(Number));
    const saved = readFileSync(join(directory, `${seed}-${checkpoint}.save.json`), 'utf8');
    const game = loadGame(saved);
    const state = game.state;
    const before = snapshotState(state);
    assert.equal(saveGame(game), saved, `${variant}/${seed}: save changed on load`);
    assert.equal(state.turn, report.turn);
    assert.equal(state.winnerId, report.winner);
    const players = realPlayers(state);
    const seats = players.map(player => {
      const recorded = report.checkpoints[checkpoint].find((row: { id: number }) => row.id === player.id);
      const income = sampleEmpireIncome(state, player.id);
      assert.deepEqual(income.rates, recorded.rates, `${variant}/${seed}/${player.id}: income`);
      assert.equal(income.total, recorded.total);
      assert.equal(foldScore(explainScore(state, player.id)), recorded.score);
      assert.equal(player.techsResearched.length, recorded.techs);
      assert.equal(player.citiesCaptured ?? 0, recorded.captures);
      assert.equal(citiesOf(state, player.id).length, recorded.cities.length);
      const units = state.units.filter(unit => unit.ownerId === player.id);
      assert.equal(units.filter(unit => isCombatant(unitDef(unit.type))).length, recorded.military);
      const roster: Record<string, number> = {};
      for (const unit of units) roster[unit.type] = (roster[unit.type] ?? 0) + 1;
      return {
        id: player.id, leader: player.leader, roster, unitsGained: player.unitsGained,
        exchanges: players.filter(enemy => enemy.id !== player.id).map(enemy => ({
          enemy: enemy.leader, exchange: readWarExchange(state, player, enemy),
        })),
      };
    });
    assert.equal(snapshotState(state), before, `${variant}/${seed}: the diagnostic changed state`);
    results.push({ variant, seed, checkpoint, metricsMatched: true, diagnosticReadOnly: true, seats });
    writeFileSync(join(root, output), JSON.stringify(results, null, 2) + '\n');
    console.log(`Verified ${variant}/${seed} at turn ${checkpoint}.`);
  }
}
