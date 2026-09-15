/**
 * **The deck, per card, and the lifetime tally** — batch S2 (`docs/flags.md`
 * (bbbbbb); the ruling: *"`PlayerStatecraft.tallies` per voice, one add a turn
 * in `collectYields` from `ledgerFold`'s statecraft class, schema 117"*).
 *
 * Four claims, each of which could be false with every screen still drawing:
 *
 *   1. **The cards add to the class.** `explainDeckLedger`'s lines, summed per
 *      voice, are `explainLedger`'s deck figures exactly — on a bench with flats,
 *      a building percentage and a percentage-only card, so the per-card split
 *      of the *gain* is exercised and not just the flats.
 *   2. **One add a turn, and one writer.** A two-turn state's tally grows by
 *      exactly the second turn's reading; the writer is called from the head of
 *      the `collectYields` phase and from nowhere else, and no other file in
 *      `src/sim` writes the field (both read off the source).
 *   3. **A print older than the tally reads as zero** and the writer opens the
 *      list rather than throwing — the migration's one sentence.
 *   4. **The order is history.** Rows stand in the order the cards first paid,
 *      and a card that stops paying keeps its row where it was.
 *
 * Core tier: one duel board, a few cards written onto a seat, two resolutions.
 * The byte-for-byte replay is in the slow sibling.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, isWonder } from '../../src/sim/buildingData';
import {
  deckLinesOfCity,
  explainDeckLedger,
  explainLedger,
  foldDeckLedger,
  ledgerBagOfCity,
  recordDeckTally,
} from '../../src/sim/ledgerFold';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import type { ORDER_IDS } from '../../src/sim/statecraftData';
import { type GameState, bumpRevision, citiesOf, playerById } from '../../src/sim/state';
import { runEndOfTurn } from '../../src/sim/turn';
import { found, game } from './statecraftHelpers';

const SOURCES = import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** One file's source with its comments taken out — the prose explains the rules. */
function source(file: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${file}`));
  if (key === undefined) throw new Error(`${file} was not globbed`);
  return SOURCES[key]!.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * The Ledger suite's own bench: a town with a market, a library and a wonder,
 * and three Orders that reach the deck's slice three different ways — a flat
 * in every town, a percentage over a building, and a percentage alone.
 */
function bench(): { state: GameState; playerId: number } {
  const { state } = game();
  const city = found(state, 0);
  city.population = 5;
  city.buildings.push('monument', 'library');
  const wonder = BUILDING_IDS.find((id) => isWonder(id));
  if (wonder) city.buildings.push(wonder);
  const sc = playerById(state, 0)!.statecraft;
  for (const order of ['weightsAndMeasures', 'theScriveners', 'theLampKeptLit'] as (typeof ORDER_IDS)[number][]) {
    if (!sc.orders.includes(order)) sc.orders.push(order);
    sc.slots.push({ card: order, sealedUntil: state.turn });
  }
  bumpRevision(state);
  return { state, playerId: 0 };
}

describe('the deck, per card', () => {
  it('adds up, card by card, to the statecraft class of the Ledger — voice for voice', () => {
    const { state, playerId } = bench();
    const lines = explainDeckLedger(state, playerId);
    expect(lines.length).toBeGreaterThan(1);
    const total = foldDeckLedger(lines);
    for (const voice of explainLedger(state, playerId)) {
      expect(total[voice.key], voice.key).toBe(voice.byClass.deck);
    }
    // And something in it: a bench whose deck paid nothing would pin nothing.
    let paid = 0;
    for (const key of CITY_YIELD_KEYS) paid += Math.abs(total[key]);
    expect(paid).toBeGreaterThan(0);
  });

  it('splits one town the way the class split does', () => {
    const { state, playerId } = bench();
    const city = citiesOf(state, playerId)[0]!;
    const perCard = foldDeckLedger(deckLinesOfCity(state, city));
    const byClass = ledgerBagOfCity(state, city).deck;
    for (const key of CITY_YIELD_KEYS) expect(perCard[key], key).toBe(byClass[key]);
  });

  it('credits a percentage-only card with a share of the gain, by its card', () => {
    // The Lamp Kept Lit pays nothing but a quarter more science in the capital
    // (ruling jj). Its line here is the gain it supplied, filed under *its* id.
    const { state, playerId } = bench();
    const lamp = explainDeckLedger(state, playerId).find((line) => line.card === 'theLampKeptLit');
    expect(lamp, 'the lamp has a line').toBeDefined();
    expect(lamp!.paid.science).toBeGreaterThan(0);
  });
});

describe('the lifetime tally', () => {
  it('grows by exactly the turn’s reading, once a turn', () => {
    const { state, playerId } = bench();
    const sc = playerById(state, playerId)!.statecraft;
    expect(sc.yieldTallies).toEqual([]);

    runEndOfTurn(state);
    const afterOne = JSON.parse(JSON.stringify(sc.yieldTallies)) as typeof sc.yieldTallies;
    expect(afterOne.length).toBeGreaterThan(0);

    // What the deck pays now is what the second resolution will add: the phases
    // before `collectYields` move nothing on this bench.
    const second = explainDeckLedger(state, playerId);
    runEndOfTurn(state);
    const afterTwo = sc.yieldTallies;
    expect(afterTwo.length).toBeGreaterThanOrEqual(afterOne.length);
    for (const row of afterTwo) {
      const was = afterOne.find((one) => one.card === row.card);
      const added = second.find((one) => one.card === row.card);
      for (const key of CITY_YIELD_KEYS) {
        expect(row.paid[key], `${row.card} ${key}`).toBe(
          (was?.paid[key] ?? 0) + (added?.paid[key] ?? 0),
        );
      }
    }
  });

  it('keeps a row in the order it first paid, and keeps it when the card stops paying', () => {
    const { state, playerId } = bench();
    const sc = playerById(state, playerId)!.statecraft;
    runEndOfTurn(state);
    const order = sc.yieldTallies.map((row) => row.card);
    const first = sc.yieldTallies[0]!;
    const kept = { ...first.paid };
    // Bench the whole council: nothing pays next turn, nothing is removed.
    sc.slots = sc.slots.map(() => null);
    bumpRevision(state);
    expect(explainDeckLedger(state, playerId)).toEqual([]);
    runEndOfTurn(state);
    expect(sc.yieldTallies.map((row) => row.card)).toEqual(order);
    expect(sc.yieldTallies[0]!.paid).toEqual(kept);
  });

  it('is written from the head of the collectYields phase, and from nowhere else', () => {
    // The writer's one caller is the phase, before the banks.
    const turn = source('turn.ts');
    const phase = turn.slice(turn.indexOf('name: "collectYields"'), turn.indexOf('name: "growCities"'));
    const tally = phase.indexOf('recordDeckTally(state)');
    const banks = phase.indexOf('collectYields(state, report)');
    expect(tally).toBeGreaterThan(-1);
    expect(banks).toBeGreaterThan(tally);
    // And nobody else in the simulation calls it or writes the field.
    for (const [path, raw] of Object.entries(SOURCES)) {
      const file = path.slice(path.lastIndexOf('/') + 1);
      const text = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      const calls = (text.match(/\brecordDeckTally\(/g) ?? []).length;
      if (file === 'turn.ts') expect(calls, path).toBe(1);
      else if (file === 'ledgerFold.ts') expect(calls, path).toBe(1);
      else expect(calls, path).toBe(0);
      const writes = (text.match(/yieldTallies\s*=[^=]|yieldTallies\.(push|splice)\(/g) ?? [])
        .length;
      if (file !== 'ledgerFold.ts' && file !== 'draft.ts') expect(writes, path).toBe(0);
    }
  });

  it('reads a print older than the tally as nothing, and opens the list on the next turn', () => {
    const { state, playerId } = bench();
    const sc = playerById(state, playerId)!.statecraft;
    delete (sc as { yieldTallies?: unknown }).yieldTallies;
    expect(foldDeckLedger(sc.yieldTallies ?? [])).toEqual(foldDeckLedger([]));
    expect(() => recordDeckTally(state)).not.toThrow();
    expect(sc.yieldTallies.length).toBeGreaterThan(0);
  });
});
