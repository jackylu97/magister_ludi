/** Record bot economies for a chosen roster without resuming mid-game. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setAiTuning, type PersonaOverride } from '../src/ai/aiConfig';
import { driveBots, runBotTurn } from '../src/ai/driver';
import { frozenTally } from '../src/ai/frozenBoard';
import type { BotDecision } from '../src/ai/decision';
import { createGame, saveGame } from '../src/sim/game';
import { leaderDef, type LeaderId } from '../src/sim/leaderData';
import { isWonder } from '../src/sim/buildingData';
import { readCurrentTown } from '../src/sim/readings';
import { explainScore, foldScore } from '../src/sim/score';
import { citiesOf, realPlayers } from '../src/sim/state';
import { highestAge, techColumn } from '../src/sim/techData';
import { isCombatant, unitDef } from '../src/sim/unitData';
import { sampleEmpireIncome } from './botAuditReadings';

const [seedInput, output, tuningPath, limitInput, scenarioPath] = process.argv.slice(2);
const decisionsThrough = Number(process.env.BOT_AUDIT_DECISIONS ?? 0);
const recordWars = process.env.BOT_AUDIT_WARS === '1';
const recordCombat = process.env.BOT_AUDIT_COMBAT === '1';
const limit = Number(limitInput ?? 100);
if (!Number.isSafeInteger(limit) || limit < 1) throw Error('The turn limit must be a positive integer.');
const tuning = tuningPath ? JSON.parse(readFileSync(tuningPath, 'utf8')) : null;
if (tuning !== null) setAiTuning(tuning);
interface Scenario {
  sizeName?: string;
  leaders?: LeaderId[];
  seatTuning?: Record<number, PersonaOverride>;
}
const scenario: Scenario = scenarioPath ? JSON.parse(readFileSync(scenarioPath, 'utf8')) : {};
for (const [seat, settings] of Object.entries(scenario.seatTuning ?? {})) {
  setAiTuning(settings, { playerId: Number(seat), afterPersona: true });
}
const seed = Number(seedInput);
if (!Number.isSafeInteger(seed) || !output) throw Error('Pass an integer seed and an output directory.');
mkdirSync(output, { recursive: true });
const leaders: readonly LeaderId[] = scenario.leaders ?? [
  'alexanderTheGreat', 'mansaMusa', 'sejongTheGreat',
  'mehmedTheConqueror', 'lorenzoDeMedici', 'jayavarmanVII',
];
const game = createGame({
  seed, sizeName: scenario.sizeName ?? 'standard', barbarians: true,
  players: leaders.map(id => {
    const leader = leaderDef(id);
    return { name: leader.name, leader: id, color: leader.colors.primary, persona: leader.persona, isHuman: false };
  }),
});
const state = game.state;
const checkpoints: Record<number, unknown> = {};
const warnings: { turn: number; message: string; detail?: unknown }[] = [];
const commandCounts = leaders.map(() => ({} as Record<string, number>));
const cumulative = leaders.map(() => 0);
const decisions: { index: number; turn: number; playerId: number; decision: BotDecision }[] = [];
const losses = leaders.map(() => 0);
const owners = new Map(state.cities.map(city => [city.id, city.ownerId]));

// Ownership changes are outcomes, so count them after accepted commands.
const report = (): void => {
  for (const city of state.cities) {
    const before = owners.get(city.id);
    if (before !== undefined && before !== city.ownerId && losses[before] !== undefined) losses[before]!++;
    owners.set(city.id, city.ownerId);
  }
};

function sample() {
  return realPlayers(state).map(player => {
    const { rates, total } = sampleEmpireIncome(state, player.id);
    const towns = citiesOf(state, player.id);
    return {
      id: player.id, leader: player.leader, alive: !player.eliminated,
      score: foldScore(explainScore(state, player.id)),
      total,
      rates, cumulative: cumulative[player.id],
      techs: player.techsResearched.length,
      column: Math.max(0, ...player.techsResearched.map(techColumn)),
      age: highestAge(player.techsResearched), drafts: player.statecraft.drafts,
      captures: player.citiesCaptured ?? 0,
      citiesLost: losses[player.id],
      unitsLost: player.unitsLost ?? 0, enemiesKilled: player.enemiesKilled ?? 0, campsCleared: player.campsCleared ?? 0,
      military: state.units.filter(unit => unit.ownerId === player.id && isCombatant(unitDef(unit.type))).length,
      government: player.statecraft.government, orders: player.statecraft.orders,
      doctrines: player.statecraft.doctrines, doctrineTurns: player.statecraft.doctrineTurns,
      slots: player.statecraft.slots, commands: commandCounts[player.id],
      cities: towns.map(city => ({
        id: city.id, name: city.name, population: city.population, focus: city.focus,
        buildings: city.buildings, buildingTurns: city.buildingTurns,
        wonders: city.buildings.filter(isWonder),
        yields: readCurrentTown(state, city).total,
      })),
    };
  });
}

while (state.turn <= limit && state.winnerId === null) {
  const turn = state.turn;
  const firstCommand = game.log.length;
  const warn = (message: string, detail?: unknown): void => { warnings.push({ turn, message, detail }); };
  if (turn <= decisionsThrough || recordWars || recordCombat) {
    // Keep the original frozen-board appraisal. Repricing a replay can give a different explanation.
    for (const step of runBotTurn(game, { warn, report })) {
      const economy = turn <= decisionsThrough && ['setCityProduction', 'purchaseItem', 'chooseResearch', 'chooseOrder', 'skipOrderOffer', 'slotOrder'].includes(step.decision.command.type);
      const combat = recordCombat && step.decision.kind === 'unitOrder';
      if (step.result.ok && (economy || combat || (recordWars && step.decision.kind === 'war'))) {
        const index = game.log.length - 1;
        assert.deepEqual(game.log[index], step.decision.command);
        decisions.push({ index, turn: step.turn, playerId: step.playerId, decision: step.decision });
      }
    }
  } else driveBots(game, { warn, report });
  if (state.turn === turn && state.winnerId === null) throw Error(`The turn did not advance at ${turn}.`);
  for (const command of game.log.slice(firstCommand)) {
    const counts = commandCounts[command.playerId];
    if (counts) counts[command.type] = (counts[command.type] ?? 0) + 1;
  }
  for (const player of realPlayers(state)) {
    cumulative[player.id] += sampleEmpireIncome(state, player.id).total;
  }
  if ([20, 40, 60, 80, 90, 100].includes(turn) || turn === limit || state.winnerId !== null) {
    // City buildings and council arrays change in place. Each checkpoint owns its values.
    checkpoints[turn] = JSON.parse(JSON.stringify(sample()));
    writeFileSync(`${output}/${seed}-${turn}.save.json`, saveGame(game));
    console.error(`Finished seed ${seed}, turn ${turn}.`);
  }
}
writeFileSync(`${output}/${seed}.json`, JSON.stringify({
  metricVersion: 2, seed, tuning, scenario, turn: state.turn, winner: state.winnerId, checkpoints, warnings,
  planning: structuredClone(frozenTally),
  ...(decisionsThrough > 0 || recordWars || recordCombat ? { decisions } : {}),
}) + '\n');
