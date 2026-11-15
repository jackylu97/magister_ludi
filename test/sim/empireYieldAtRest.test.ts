/**
 * **The `empireYield` count read at rest** (bot batch BP9, fault 1).
 *
 * Money at Work and Bills of Exchange pay in every town by the gold the empire
 * makes each turn (`count: 'empireYield'`). Each town's count folds the whole
 * empire, so one reading of an empire of N towns used to fold it N times. In the
 * end check of bot pass 3 that was 70% of seed 7's turns 141 to 146.
 *
 * The fix is a scope, `readingAtRest` (`statecraft/evaluator.ts`). A reader at
 * rest (the `read…` verbs and every bot decision) asks inside it, and there the
 * count's fold is remembered on the economy clock. Outside it, the count folds
 * fresh, because a handler or a phase may have written a field that does not
 * move the clock. This file holds the three facts that make the change safe:
 *
 *   - the figure every town is paid is the same inside the scope and outside;
 *   - inside the scope the fold is remembered until the economy clock moves;
 *   - outside the scope a write that says nothing is seen at once.
 */

import { describe, expect, it } from 'vitest';

import { nextBotDecision } from '../../src/ai/bot';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { readCity, readEmpire } from '../../src/sim/readings';
import { setSlateShadow, slateShadow } from '../../src/sim/slate';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { explainCardCityYields, explainCardPercentYields } from '../../src/sim/statecraft';
import { readingAtRest } from '../../src/sim/statecraft/evaluator';
import type { OrderId } from '../../src/sim/statecraftData';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { at, bareState } from './improvementHelpers';

/** The sources the register below reads. */
const SOURCES = import.meta.glob(
  [
    '../../src/sim/readings.ts',
    '../../src/sim/statecraft/evaluator.ts',
    '../../src/ai/bot.ts',
    '../../src/sim/commands.ts',
    '../../src/sim/turn.ts',
    '../../src/sim/yields/empire.ts',
    '../../src/sim/yields/town.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

/** Puts a card in a chair for seat 0, the way the reading sees it. */
function slot(state: GameState, id: string): void {
  const sc = playerById(state, 0)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for seat 0, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * Four towns of seat 0 holding both cards, with Market Day paying the capital a
 * gold for every citizen so that the income is worth counting.
 */
function realm(): { state: GameState; towns: City[] } {
  const state = bareState(24, 12);
  const towns = [town(state, 3, 3, 4), town(state, 11, 3, 4), town(state, 19, 3, 4), town(state, 7, 9, 4)];
  slot(state, 'moneyAtWork');
  slot(state, 'billsOfExchange');
  slot(state, 'marketDay');
  towns[0]!.population = 60;
  bumpRevision(state);
  return { state, towns };
}

/** What Money at Work pays one town in science. */
function science(state: GameState, city: City): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === 'moneyAtWork')
    .reduce((sum, line) => sum + line.science, 0);
}

/** What Bills of Exchange adds to one town's production, in percent. */
function hammers(state: GameState, city: City): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === 'billsOfExchange' && line.yield === 'production')
    .reduce((sum, line) => sum + line.percent, 0);
}

/** The gold the empire makes each turn, as the count reads it. */
function goldMade(state: GameState): number {
  return Math.max(0, Math.floor(foldEmpireRates(state, 0).goldPerTurn));
}

describe('the empireYield count at rest (bot batch BP9)', () => {
  it('pays every town the same figure inside the scope and outside it', () => {
    const { state, towns } = realm();
    const made = goldMade(state);
    expect(made, 'an income of two helpings or more').toBeGreaterThanOrEqual(40);
    for (const city of towns) {
      const fresh = { science: science(state, city), hammers: hammers(state, city) };
      expect(fresh.science).toBe(Math.floor(made / 20));
      expect(fresh.hammers).toBe(Math.min(30, Math.floor(made / 10)));
      const rested = readingAtRest(() => ({ science: science(state, city), hammers: hammers(state, city) }));
      expect(rested, city.name).toEqual(fresh);
    }
    // And the town's own published list, which is read at rest, carries it.
    for (const city of towns) {
      const listed = readCity(state, city)
        .lines.filter((line) => line.card === 'moneyAtWork')
        .reduce((sum, line) => sum + line.science, 0);
      expect(listed, city.name).toBe(science(state, city));
    }
  });

  it('remembers the fold inside the scope until the economy clock moves', () => {
    const { state, towns } = realm();
    const [capital, other] = [towns[0]!, towns[1]!];
    const before = readingAtRest(() => science(state, other));
    // A write that announces nothing, as one inside a handler might be: the
    // capital grows by a hundred citizens and no clock moves.
    capital.population += 100;
    const after = Math.floor(goldMade(state) / 20);
    expect(after, 'the write moves the income').toBeGreaterThan(before);
    // Inside the scope the remembered fold answers, as it does for every other
    // reading on the economy clock.
    expect(readingAtRest(() => science(state, other))).toBe(before);
    // Outside the scope the count folds fresh, so a reader inside a write sees
    // the write at once.
    expect(science(state, other)).toBe(after);
    // The clock moves, and the scope reads the new books.
    bumpRevision(state);
    expect(readingAtRest(() => science(state, other))).toBe(after);
  });

  it('agrees with a fresh fold at every hit, under the shadow check', () => {
    const { state, towns } = realm();
    const was = slateShadow();
    setSlateShadow(true);
    try {
      readingAtRest(() => {
        for (const city of towns) {
          science(state, city);
          hammers(state, city);
        }
      });
      readEmpire(state, 0);
      // A bot decision is a reader at rest, and asks the count through every
      // town of the seat.
      nextBotDecision(state, 0);
    } finally {
      setSlateShadow(was);
    }
    expect(readEmpire(state, 0).totals.science).toBeGreaterThan(0);
  });

  it('is asked by the readings and by every bot decision, and by nothing in a write', () => {
    // The register, read off the source: the four readings of `readings.ts` and
    // the bot's one entry ask inside the scope, and the count reads the memo only
    // there.
    const read = (path: string): string => SOURCES[`../../${path}`]!;
    const readings = read('src/sim/readings.ts');
    expect(readings.match(/readingAtRest\(/g)?.length).toBe(4);
    const evaluator = read('src/sim/statecraft/evaluator.ts');
    expect(evaluator).toContain(
      'const rates = restDepth > 0 ? restingCutRates(state, playerId) : foldEmpireRates(state, playerId);',
    );
    expect(evaluator.match(/restDepth \+= 1/g)?.length).toBe(1);
    const bot = read('src/ai/bot.ts');
    expect(bot).toContain('return readingAtRest(() => decideNext(state, playerId, sitting));');
    // Nothing in the reducer, the phases or the yields folds opens the scope.
    for (const path of ['src/sim/commands.ts', 'src/sim/turn.ts', 'src/sim/yields/empire.ts', 'src/sim/yields/town.ts']) {
      expect(read(path), path).not.toContain('readingAtRest');
    }
  });
});
