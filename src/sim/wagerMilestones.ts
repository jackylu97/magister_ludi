import { countedLuxuries } from './cities';
import { foldLedgerClass, ledgerBagOfEmpire } from './ledgerFold';
import { readEmpire, readWagerMetric } from './readings';
import { CITY_YIELD_KEYS } from './resourceData';
import { cityReturnLegYields, explainRouteYield, explainRouteSenderYield, liveRouteCities, routeIsInternational, foldRouteYield, type RouteYieldLine } from './routeYields';
import { explainScore, foldScore, standingArmyStrength, rivalUnitsAndCampsDefeated } from './score';
import { nextInt } from './rng';
import { citiesOf, realPlayers, tileOwnerField, type GameState } from './state';
import { currentWagerAge, currentWagerSeat, wagerMetricText, WAGER_METRICS, WAGER_GROUPS, MILESTONE_RULES,
  type WagerMetric, type WagerAge, type WagerMark, type WagerMarks } from './wagerMilestoneData';

export function openMilestoneAge(state: GameState, age: number): void {
  const book = state.wagerBook;
  if (!book || state.winnerId !== null || age < 1 || age > 4 || currentWagerAge(state)?.age === age) return;
  const previous = currentWagerAge(state);
  if (previous && previous.closed === undefined) closeMilestoneAge(state);
  const dealt: WagerMetric[] = [];
  if (age > 1 && book.setup.mode === 'calibrated') {
    const groups = Object.values(WAGER_GROUPS).map((group) =>
      group.filter((id) => !previous?.dealt.includes(id as WagerMetric)));
    while (dealt.length < 2) {
      const pool = groups.splice(nextInt(state.rng, 0, groups.length), 1)[0]!;
      dealt.push(pool[nextInt(state.rng, 0, pool.length)] as WagerMetric);
    }
  }
  book.ages.push({ age: age as WagerAge, opened: state.turn, dealt,
    seats: realPlayers(state).map((player) => ({
      playerId: player.id, reached: [], scienceCulture: 0, faithGold: 0, purchases: 0, buildings: 0,
    })),
  });
  for (const seat of currentWagerAge(state)!.seats) seat.opening = wagerMetricSnapshot(state, seat.playerId);
}

function wagerMetricSnapshot(state: GameState, playerId: number): Record<WagerMetric, number> {
  return Object.fromEntries(WAGER_METRICS.map((key) =>
    [key, wagerMetricNow(state, playerId, key)])) as Record<WagerMetric, number>;
}

export function wagerMetricNow(state: GameState, playerId: number, metric: WagerMetric): number {
  const seat = currentWagerSeat(state, playerId);
  switch (metric) {
    case 'score': {
      const setup = state.wagerBook?.setup;
      return foldScore(explainScore(state, playerId, setup?.mode === 'calibrated' ? setup.calibration.weights : undefined));
    }
    case 'scienceCulture': case 'faithGold': case 'purchases': case 'buildings':
      return seat?.[metric] ?? 0;
    case 'sixYields': {
      const totals = readEmpire(state, playerId).totals;
      return CITY_YIELD_KEYS.reduce((sum, key) => sum + totals[key], 0);
    }
    case 'population': return citiesOf(state, playerId).reduce((n, city) => n + city.population, 0);
    case 'cityProduction': return readEmpire(state, playerId).towns.reduce((n, town) => Math.max(n, town.total.production), 0);
    case 'improvements': {
      const owner = tileOwnerField(state);
      return state.map.tiles.reduce((n, tile, index) => n + Number(tile.improvement !== undefined && owner.at(index) === playerId), 0);
    }
    case 'luxuries': return countedLuxuries(state, playerId).length;
    case 'routeYields': {
      const lines: RouteYieldLine[] = [];
      for (const unit of state.units) {
        if (unit.ownerId !== playerId || !unit.trade) continue;
        const pair = liveRouteCities(state, unit);
        if (!pair) continue;
        lines.push(...(routeIsInternational(pair.from, pair.to)
          ? explainRouteSenderYield(state, unit) : explainRouteYield(state, unit)));
      }
      for (const city of citiesOf(state, playerId)) lines.push(...cityReturnLegYields(state, city));
      const sum = foldRouteYield(lines);
      return CITY_YIELD_KEYS.reduce((n, key) => n + sum[key], 0);
    }
    case 'peopleYields': return foldLedgerClass(ledgerBagOfEmpire(state, playerId), 'people');
    case 'armyStrength': return standingArmyStrength(state, playerId);
  }
}
function marksFor(state: GameState, playerId: number, metric: WagerMetric): WagerMarks {
  const setup = state.wagerBook?.setup;
  const age = currentWagerAge(state)!.age;
  if (setup?.mode !== 'calibrated') throw new Error('Wager marks have not been calibrated.');
  const marks = age === 1 ? setup.calibration.marks[1].score : setup.calibration.marks[age][metric];
  const percent = setup.humanMarksPercent ?? ((state.tier ?? 0) >= MILESTONE_RULES.higherMarksTier ? MILESTONE_RULES.higherMarksPercent : 0);
  return marks.map((n) => state.players[playerId]?.isHuman ? n * (100 + percent) / 100 : n) as WagerMarks;
}
export function milestoneOffer(state: GameState, playerId: number) {
  const age = currentWagerAge(state);
  const seat = currentWagerSeat(state, playerId);
  if (!age || !seat || state.wagerBook?.setup.mode !== 'calibrated') return null;
  const metrics: WagerMetric[] = [...age.dealt, 'score'];
  return { age: age.age, opened: age.opened, closed: age.closed, pick: seat.pick && { ...seat.pick }, reached: seat.reached.map((entry) => ({ ...entry })),
    options: metrics.map((metric) => ({ metric, ...wagerMetricText(metric), now: seat.closing?.readings[metric] ?? readWagerMetric(state, playerId, metric), marks: marksFor(state, playerId, metric) })),
  };
}
export function milestonePickNeeded(state: GameState, playerId: number): boolean {
  const age = currentWagerAge(state);
  const seat = currentWagerSeat(state, playerId);
  return state.wagerBook?.setup.mode === 'calibrated' && !!age && age.closed === undefined && age.age > 1 && !!seat && !seat.pick;
}
export function pickMilestoneError(state: GameState, playerId: number, index: number, mark?: number, offeredAge?: number): string | null {
  if (!milestonePickNeeded(state, playerId)) return 'This seat has no wager to choose.';
  if (offeredAge !== currentWagerAge(state)?.age) return 'This wager offer has expired.';
  if (!Number.isInteger(index) || index < 0 || index > 2) return 'Choose one of the offered wagers.';
  if (mark !== 0 && mark !== 1 && mark !== 2) return 'Choose a low, middle or high mark.';
  return null;
}
export function pickMilestone(state: GameState, playerId: number, index: number, mark: WagerMark): void {
  const age = currentWagerAge(state)!;
  currentWagerSeat(state, playerId)!.pick = { metric: age.dealt[index] ?? 'score', mark };
}
export function payMilestones(state: GameState, pay: (playerId: number, metric: WagerMetric, mark: WagerMark, beads: number) => void): void {
  const age = currentWagerAge(state);
  if (!age || age.closed !== undefined || state.wagerBook?.setup.mode !== 'calibrated') return;
  for (const player of realPlayers(state)) {
    if (player.eliminated) continue;
    const seat = currentWagerSeat(state, player.id)!;
    const metric = age.age === 1 ? 'score' : seat.pick?.metric;
    if (!metric || seat.reached.length === (age.age === 1 ? 3 : 1)) continue;
    const value = wagerMetricNow(state, player.id, metric);
    const marks = marksFor(state, player.id, metric);
    for (const mark of [0, 1, 2] as const) {
      if (age.age > 1 && seat.pick?.mark !== mark) continue;
      if (value < marks[mark] || seat.reached.some((entry) => entry.mark === mark)) continue;
      seat.reached.push({ mark, turn: state.turn });
      pay(player.id, metric, mark, age.age === 1 ? 1 : mark + 1);
    }
  }
}

export function closeMilestoneAge(state: GameState): void {
  const age = currentWagerAge(state);
  if (!age || age.closed !== undefined) return;
  for (const seat of age.seats) {
    const readings = wagerMetricSnapshot(state, seat.playerId);
    seat.closing = { readings, army: readings.armyStrength, defeats: rivalUnitsAndCampsDefeated(state, seat.playerId),
      scoreLines: explainScore(state, seat.playerId).map(({ label, count, value }) => ({ label, count, value })) };
  }
  age.closed = state.turn;
}
