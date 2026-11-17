/**
 * **A borrowed luxury cannot be lent on** (`docs/flags.md`, the bullet "A
 * borrowed luxury cannot be lent on. Ruled 2026-11-17"; the user: *"yes, no
 * trading lent luxuries."*).
 *
 * The fault: `dealSideError` asked `availableCopies`, which counts the copies
 * lent in, so an empire that held silk only on loan could lend it to a third
 * empire. The giver kept its access and the receiver gained one, so one silk
 * served three empires. The rule: an empire lends only copies it owns. A
 * borrowed copy can be used and not lent.
 *
 * The tests here:
 *
 *   - the three-seat case from the ruling, through the reducer;
 *   - a copy of its own beside a borrowed one: the own copy may go, the
 *     borrowed one may not;
 *   - a paper written while the copy was owned is refused when it is signed
 *     after the own copy went elsewhere;
 *   - a deal already standing on a borrowed copy (a save from before the rule)
 *     resolves cleanly when the loan under it ends;
 *   - the invariant itself, over many seeded sequences of deals among three and
 *     four seats: the usable copies of a luxury never add up to more than the
 *     copies the ground supplies.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, lendableCopies, resourceCopies } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { lentCopiesAwayBy, lentCopiesToPlayer } from '../../src/sim/deals';
import { dealSideError, proposeDealError } from '../../src/sim/diplomacy';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, bumpRevision } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const NAMES = ['Ada', 'Bors', 'Cyd', 'Dag'];
const COLORS = ['#a00', '#00a', '#0a0', '#aa0'];
const TOWNS: readonly (readonly [number, number])[] = [
  [2, 2],
  [7, 2],
  [12, 2],
  [7, 6],
];

/** Flat grassland and a town for each seat, every seat a person at peace. */
function bench(seats: number): { state: GameState; towns: City[] } {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: NAMES.slice(0, seats).map((name, index) => ({ name, color: COLORS[index]!, isHuman: true })),
  });
  state.map = createMap({ width: 16, height: 9, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 9).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const towns = TOWNS.slice(0, seats).map(([col, row], seat) => foundCityAt(state, seat, at(state.map, col, row)));
  return { state, towns };
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A worked silk seam on a hex the town owns. */
function giveSilk(state: GameState, city: City, col: number, row: number): void {
  const tile = at(state.map, col, row);
  tile.resource = 'silk';
  tile.improvement = 'plantation';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  bumpRevision(state);
}

/** One seat offers silk to another, and the other signs. Both results. */
function lend(state: GameState, from: number, to: number): { proposed: string | null; signed: string | null } {
  const proposed = applyCommand(state, {
    type: 'proposeDeal',
    playerId: from,
    targetId: to,
    give: { luxuries: ['silk'] },
    take: {},
  } as unknown as Command);
  if (!proposed.ok) return { proposed: proposed.error, signed: null };
  const id = state.dealProposals[state.dealProposals.length - 1]!.id;
  const signed = applyCommand(state, { type: 'acceptDeal', playerId: to, dealId: id } as unknown as Command);
  return { proposed: null, signed: signed.ok ? null : signed.error };
}

const copies = (state: GameState, seats: number): number[] =>
  Array.from({ length: seats }, (_unused, seat) => resourceCopies(state, seat, 'silk'));

describe('a borrowed luxury cannot be lent on', () => {
  it('refuses a seat that holds its only silk on loan, and the copies stay one, one, nought', () => {
    const { state, towns } = bench(3);
    giveSilk(state, towns[2]!, 13, 2);
    expect(lend(state, 2, 0)).toEqual({ proposed: null, signed: null });
    expect(copies(state, 3)).toEqual([1, 0, 0]);

    // Ada holds the silk only on loan from Cyd. She may use it and not lend it.
    const before = JSON.stringify(state);
    const refused = lend(state, 0, 1);
    expect(refused.proposed).toBe('The Ada have silk only on loan, and a borrowed luxury cannot be lent to another empire');
    // A refused command leaves the state byte-identical (hard rule 1).
    expect(JSON.stringify(state)).toBe(before);
    expect(copies(state, 3)).toEqual([1, 0, 0]);
    expect(lendableCopies(state, 0, 'silk')).toBe(0);
    expect(dealSideError(state, 0, 1, { luxuries: ['silk'] }, false)).toBe(refused.proposed);
    // The words are a player's: no identifier and no figure.
    expect(refused.proposed).not.toMatch(/\d|[a-z][A-Z]/);
  });

  it('lends a copy of its own beside a borrowed one, and then refuses the borrowed one', () => {
    const { state, towns } = bench(3);
    giveSilk(state, towns[0]!, 1, 2);
    giveSilk(state, towns[2]!, 13, 2);
    expect(lend(state, 2, 0).signed).toBeNull();
    // Ada: her own silk and Cyd's.
    expect(resourceCopies(state, 0, 'silk')).toBe(2);
    expect(lendableCopies(state, 0, 'silk')).toBe(1);

    // Her own copy may go to Bors.
    expect(lend(state, 0, 1)).toEqual({ proposed: null, signed: null });
    expect(copies(state, 3)).toEqual([1, 1, 0]);
    // The silk she still uses is Cyd's, and that one stays with her.
    expect(lendableCopies(state, 0, 'silk')).toBe(0);
    expect(proposeDealError(state, 0, 1, { luxuries: ['silk'] }, {})).toContain('only on loan');
    expect(copies(state, 3)).toEqual([1, 1, 0]);
  });

  it('refuses at the signing a paper whose own copy has gone elsewhere since it was written', () => {
    const { state, towns } = bench(4);
    giveSilk(state, towns[0]!, 1, 2);
    giveSilk(state, towns[2]!, 13, 2);
    expect(lend(state, 2, 0).signed).toBeNull();
    // Ada writes to Bors while her own silk is still at home.
    const paper = applyCommand(state, {
      type: 'proposeDeal',
      playerId: 0,
      targetId: 1,
      give: { luxuries: ['silk'] },
      take: {},
    } as unknown as Command);
    expect(paper.ok).toBe(true);
    const toBors = state.dealProposals[state.dealProposals.length - 1]!.id;
    // Then lends her own silk to Dag, which Dag signs first.
    expect(lend(state, 0, 3).signed).toBeNull();
    // What is left to her is Cyd's silk, so Bors cannot sign.
    const signed = applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId: toBors } as unknown as Command);
    expect(signed.ok).toBe(false);
    if (!signed.ok) expect(signed.error).toContain('only on loan');
    expect(copies(state, 4)).toEqual([1, 0, 0, 1]);
  });

  it('resolves cleanly a deal that lent on a borrowed copy before the rule, when the loan under it ends', () => {
    // A save from before the rule: Cyd lent Ada silk, and Ada lent it on to Bors.
    // Written straight into the register, as the old reducer left it.
    const { state, towns } = bench(3);
    giveSilk(state, towns[2]!, 13, 2);
    const until = state.turn + RULES.war.dealTurns;
    state.deals.push(
      { id: 900, a: 0, b: 2, terms: { a: {}, b: { luxuries: ['silk'] } }, untilTurn: until - 5 },
      { id: 901, a: 0, b: 1, terms: { a: { luxuries: ['silk'] }, b: {} }, untilTurn: until },
    );
    bumpRevision(state);
    expect(copies(state, 3)).toEqual([1, 1, 0]);

    // Cyd's loan ends first. Ada's own count floors at nought, and Bors keeps
    // the copy Ada's deal names until that deal ends too.
    state.turn = until - 5;
    bumpRevision(state);
    expect(lentCopiesToPlayer(state, 0)).toEqual({});
    expect(lentCopiesAwayBy(state, 0)).toEqual({ silk: 1 });
    expect(copies(state, 3)).toEqual([0, 1, 1]);
    expect(lendableCopies(state, 0, 'silk')).toBe(0);
    expect(dealSideError(state, 0, 1, { luxuries: ['silk'] }, false)).toContain('no silk to lend');

    // And when Ada's deal ends, nobody is left holding a copy that is not there.
    state.turn = until;
    bumpRevision(state);
    expect(copies(state, 3)).toEqual([0, 0, 1]);
  });
});

/** A small seeded generator, so a failing sequence can be played again by its seed. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The silk seams on one seat's ground, counted off the board the test laid. */
function groundOf(state: GameState, seat: number): number {
  let total = 0;
  for (let index = 0; index < state.map.tiles.length; index++) {
    const tile = state.map.tiles[index]!;
    if (tile.resource !== 'silk' || tile.improvement !== 'plantation') continue;
    const owner = state.tileOwner[index];
    if (owner === null || owner === undefined) continue;
    if (state.cities.find((city) => city.id === owner)?.ownerId === seat) total += 1;
  }
  return total;
}

describe('the copies of a luxury add up', () => {
  for (const seats of [3, 4]) {
    it(`never exceed the copies the ground supplies, over seeded sequences of deals among ${seats} seats`, () => {
      let signed = 0;
      let refused = 0;
      let onLoan = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const random = mulberry(seed * 7919 + seats);
        const { state, towns } = bench(seats);
        // Each seat gets nought, one or two seams.
        for (let seat = 0; seat < seats; seat++) {
          const [col, row] = TOWNS[seat]!;
          const seams = Math.floor(random() * 3);
          for (let n = 0; n < seams; n++) giveSilk(state, towns[seat]!, col + (n === 0 ? -1 : 1), row);
        }
        let ground = 0;
        for (let seat = 0; seat < seats; seat++) ground += groundOf(state, seat);
        for (let step = 0; step < 24; step++) {
          // Now and then time passes, and the oldest deals run out.
          if (random() < 0.15) {
            state.turn += 1 + Math.floor(random() * 8);
            bumpRevision(state);
          }
          const from = Math.floor(random() * seats);
          const to = (from + 1 + Math.floor(random() * (seats - 1))) % seats;
          const result = lend(state, from, to);
          if (result.proposed === null && result.signed === null) signed += 1;
          else refused += 1;
          if (`${result.proposed ?? ''}${result.signed ?? ''}`.includes('only on loan')) onLoan += 1;
          // A paper that was refused at the signing is still on the table; take
          // it off, so the next paper between the pair may be written.
          state.dealProposals = [];
          const held = copies(state, seats);
          const total = held.reduce((sum, n) => sum + n, 0);
          expect({ seed, step, total: total <= ground }).toEqual({ seed, step, total: true });
          // And no seat has lent more copies than its own ground supplies.
          for (let seat = 0; seat < seats; seat++) {
            const own = groundOf(state, seat);
            expect({ seed, step, seat, over: (lentCopiesAwayBy(state, seat).silk ?? 0) > own }).toEqual({
              seed,
              step,
              seat,
              over: false,
            });
          }
        }
      }
      // The sequences really did sign deals and really did meet the rule.
      expect(signed).toBeGreaterThan(40);
      expect(refused).toBeGreaterThan(40);
      expect(onLoan).toBeGreaterThan(10);
    });
  }
});
