/** Record normal bot economies on a fixed six-leader roster without resuming mid-game. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setAiTuning } from '../src/ai/aiConfig';
import { driveBots } from '../src/ai/driver';
import { createGame, saveGame } from '../src/sim/game';
import { leaderDef, type LeaderId } from '../src/sim/leaderData';
import { readCurrentTown, readEmpireRates } from '../src/sim/readings';
import { explainScore, foldScore } from '../src/sim/score';
import { citiesOf, realPlayers } from '../src/sim/state';
import { highestAge, techColumn } from '../src/sim/techData';
import { isCombatant, unitDef } from '../src/sim/unitData';

const [seedInput, output, tuningPath] = process.argv.slice(2);
const tuning = tuningPath ? JSON.parse(readFileSync(tuningPath, 'utf8')) : null;
if (tuning !== null) setAiTuning(tuning);
const seed = Number(seedInput);
if (!Number.isSafeInteger(seed) || !output) throw Error('Pass an integer seed and an output directory.');
mkdirSync(output, { recursive: true });
const leaders: readonly LeaderId[] = [
  'alexanderTheGreat', 'mansaMusa', 'sejongTheGreat',
  'mehmedTheConqueror', 'lorenzoDeMedici', 'jayavarmanVII',
];
const voices = ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const;
const game = createGame({
  seed, sizeName: 'standard', barbarians: true,
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

function sample() {
  return realPlayers(state).map(player => {
    const rates = readEmpireRates(state, player.id);
    const towns = citiesOf(state, player.id);
    return {
      id: player.id, leader: player.leader, alive: !player.eliminated,
      score: foldScore(explainScore(state, player.id)),
      total: voices.reduce((sum, voice) => sum + rates[`${voice}PerTurn`], 0),
      rates, cumulative: cumulative[player.id],
      techs: player.techsResearched.length,
      column: Math.max(0, ...player.techsResearched.map(techColumn)),
      age: highestAge(player.techsResearched), drafts: player.statecraft.drafts,
      captures: player.citiesCaptured ?? 0,
      unitsLost: player.unitsLost ?? 0, enemiesKilled: player.enemiesKilled ?? 0, campsCleared: player.campsCleared ?? 0,
      military: state.units.filter(unit => unit.ownerId === player.id && isCombatant(unitDef(unit.type))).length,
      government: player.statecraft.government, orders: player.statecraft.orders,
      slots: player.statecraft.slots, commands: commandCounts[player.id],
      cities: towns.map(city => ({
        id: city.id, name: city.name, population: city.population, focus: city.focus,
        buildings: city.buildings, buildingTurns: city.buildingTurns,
        yields: readCurrentTown(state, city).total,
      })),
    };
  });
}

while (state.turn <= 100 && state.winnerId === null) {
  const turn = state.turn;
  const firstCommand = game.log.length;
  driveBots(game, { warn: (message, detail) => warnings.push({ turn, message, detail }) });
  if (state.turn === turn) throw Error(`The turn did not advance at ${turn}.`);
  for (const command of game.log.slice(firstCommand)) {
    const counts = commandCounts[command.playerId];
    if (counts) counts[command.type] = (counts[command.type] ?? 0) + 1;
  }
  for (const player of realPlayers(state)) {
    const rates = readEmpireRates(state, player.id);
    cumulative[player.id] += voices.reduce((sum, voice) => sum + rates[`${voice}PerTurn`], 0);
  }
  if ([20, 40, 60, 80, 90, 100].includes(turn) || state.winnerId !== null) {
    // City buildings and council arrays change in place. Each checkpoint owns its values.
    checkpoints[turn] = JSON.parse(JSON.stringify(sample()));
    writeFileSync(`${output}/${seed}-${turn}.save.json`, saveGame(game));
    console.error(`Finished seed ${seed}, turn ${turn}.`);
  }
}
writeFileSync(`${output}/${seed}.json`, JSON.stringify({
  seed, tuning, turn: state.turn, winner: state.winnerId, checkpoints, warnings,
}) + '\n');
