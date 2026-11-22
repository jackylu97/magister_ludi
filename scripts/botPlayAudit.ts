/**
 * Run one paired bot experiment. The report in docs/audit/bot-play-2026-11-21.md
 * lists the source revision for each policy and the map and seat assignments.
 */
import { writeFileSync } from 'node:fs';
import { aiConfigFor, clearSeatTuning, setAiTuning, type PersonaOverride } from '../src/ai/aiConfig';
import { driveBots } from '../src/ai/driver';
import { createGame } from '../src/sim/game';
import { leaderDef, type LeaderId } from '../src/sim/leaderData';
import { readEmpireRates } from '../src/sim/readings';
import { explainScore, foldScore } from '../src/sim/score';
import { citiesOf, realPlayers } from '../src/sim/state';
import { highestAge, techColumn } from '../src/sim/techData';

const groups: readonly (readonly LeaderId[])[] = [
  ['alexanderTheGreat', 'mansaMusa', 'sejongTheGreat'],
  ['mehmedTheConqueror', 'lorenzoDeMedici', 'jayavarmanVII'],
];
// Each trio covers all six decks. Rotate which leader takes the first starting position.
const mapSeats: Record<number, [number, number]> = {
  5: [0, 0], 42: [1, 1], 777: [0, 2],
  314: [1, 0], 2026: [0, 1], 13: [1, 2],
};
const newWorks = ['smelter', 'physicGarden', 'qanat', 'stoneCircle', 'cliffMonastery', 'paradiseGarden'];
const voices = ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const;
type Rates = Record<typeof voices[number], number>;
const zeroRates = (): Rates => ({ food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 });

const [policy, seedInput, limitInput, output, seat = 'all', mapSize = 'duel', roster = 'trio'] = process.argv.slice(2);
const seed = Number(seedInput), limit = Number(limitInput);
if (!['base','workers','fixed','income','target','research','capture','muster','combined'].includes(policy) ||
    !mapSeats[seed] || !Number.isSafeInteger(limit) || limit < 1 || !output ||
    !['six','trio'].includes(roster)) {
  throw Error('Pass policy, seed, turn limit, output file, optional seat index, map size and roster (trio or six).');
}
const [group, rotation] = mapSeats[seed];
const lineup = roster === 'six' ? groups.flat() : groups[group];
const players = lineup.map((_, index) => {
  const id = lineup[(index + rotation) % lineup.length];
  const leader = leaderDef(id);
  return { leader: id, name: leader.name, color: leader.colors.primary, persona: leader.persona, isHuman: false };
});
if (seat !== 'all' && (!Number.isInteger(Number(seat)) || Number(seat) < 0 || Number(seat) >= players.length)) {
  throw Error('The seat index must name a player in the test game.');
}
const game = createGame({ seed, sizeName: mapSize, players, barbarians: true });
const state = game.state;

function installOverrides(): void {
  // The fixed and target policies run on their own source revisions.
  if (policy === 'base' || policy === 'fixed' || policy === 'target' || policy === 'combined') return;
  for (const player of realPlayers(state)) {
    if (seat !== 'all' && Number(seat) !== player.id) continue;
    const ai = aiConfigFor(player.persona, player.id);
    const sheet: PersonaOverride = {
      workers: { improvements: [...new Set([...ai.workers.improvements, ...newWorks])] },
    };
    if (policy === 'income') {
      sheet.weights = {};
      const priorities = [
        ['scientific','science'], ['magisterial','culture'], ['commerce','gold'],
        ['devotion','faith'], ['expansionist','food'],
      ] as const;
      for (const [deck, voice] of priorities) {
        if (player.decks.includes(deck)) sheet.weights[voice] = ai.weights[voice].map(value => value * 1.25);
      }
    }
    if (policy === 'capture' && player.decks.includes('dominion')) sheet.military = { cityCaptureValue: 50 };
    if (policy === 'muster' && player.decks.includes('dominion')) sheet.war = { strikeForce: 2 };
    if (policy === 'research') sheet.research = { ageEntryValue: 1 };
    setAiTuning(sheet, { playerId: player.id });
  }
}

function ratesFor(id: number): Rates {
  const r = readEmpireRates(state, id);
  return {
    food: r.foodPerTurn ?? 0, production: r.productionPerTurn ?? 0, gold: r.goldPerTurn ?? 0,
    science: r.sciencePerTurn ?? 0, culture: r.culturePerTurn ?? 0, faith: r.faithPerTurn ?? 0,
  };
}
const totals = players.map(zeroRates);
const actions = players.map(() => ({ declarations: 0, attacks: 0, works: 0, newWorks: 0 }));
function snapshot() {
  return realPlayers(state).map(player => {
    const towns = citiesOf(state, player.id), rates = ratesFor(player.id);
    return {
      id: player.id, leader: player.leader, decks: player.decks, alive: !player.eliminated,
      techs: player.techsResearched.length, column: Math.max(0, ...player.techsResearched.map(techColumn)),
      age: highestAge(player.techsResearched), drafts: player.statecraft.drafts,
      captures: player.citiesCaptured ?? 0, cities: towns.length,
      pop: towns.reduce((n, city) => n + city.population, 0),
      score: foldScore(explainScore(state, player.id)), rates,
      rateTotal: voices.reduce((n, voice) => n + rates[voice], 0),
      cumulative: { ...totals[player.id] }, actions: { ...actions[player.id] },
    };
  });
}

const times: number[] = [];
const problems: { turn: number; message: string; detail?: unknown }[] = [];
const checkpoints: Record<number, ReturnType<typeof snapshot>> = {};
try {
  installOverrides();
  let completed = 0;
  while (completed < limit && state.winnerId === null) {
    const turn = state.turn, firstCommand = game.log.length;
    const start = performance.now();
    driveBots(game, { warn: (message, detail) => { problems.push({ turn, message, detail }); } });
    times.push(performance.now() - start);
    if (turn === state.turn) throw Error('The turn did not advance at turn ' + turn);
    completed++;
    for (const player of realPlayers(state)) {
      const rates = ratesFor(player.id);
      for (const voice of voices) totals[player.id][voice] += rates[voice];
    }
    for (const command of game.log.slice(firstCommand)) {
      const counts = actions[command.playerId];
      if (!counts) continue;
      if (command.type === 'declareWar') counts.declarations++;
      if (command.type === 'attack') counts.attacks++;
      if (command.type === 'buildImprovement') {
        counts.works++;
        if (newWorks.includes(command.improvement)) counts.newWorks++;
      }
    }
    if (completed === 50 || completed === 80 || completed === limit || state.winnerId !== null) {
      checkpoints[completed] = snapshot();
    }
  }
  const late = times.slice(-20).sort((a, b) => a - b);
  const result = {
    policy, seed, seat, mapSize, roster, turns: completed, winner: state.winnerId,
    warnings: problems.length, problems, lateMedianMs: late[Math.floor(late.length / 2)],
    lateP95Ms: late[Math.ceil(late.length * .95) - 1], checkpoints,
  };
  writeFileSync(output, JSON.stringify(result) + '\n');
} finally {
  clearSeatTuning();
}
