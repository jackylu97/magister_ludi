/**
 * The faith surfaces' shared fixture, and the source-reading tools two suites
 * use to check their wiring.
 *
 * A non-test module on purpose (CLAUDE.md): `faithLens.test.ts` and
 * `faithPlates.test.ts` are two readings of one world — the hover card and the
 * standing plates are the same three towns asked the same question — and
 * importing a `.test.ts` file to share the world would re-register its tests.
 * Two copies of the world would be worse: the whole claim these suites make is
 * that the card and the plate cannot disagree, and they can only make it against
 * *one* fixture.
 */

import { expect } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import {
  type GameState,
  type Religion,
  createUnit,
  newGame,
  removeUnit,
} from '../../src/sim/state';
import { foundReligion } from '../../src/sim/religion';
import { BELIEF_IDS } from '../../src/sim/religionData';
import { recomputeVisibility, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';

const SOURCE = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/main.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

/** One file's source with its comments taken out. `seatRoster.test.ts`'s. */
export function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export function sourceOf(file: string): string {
  const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return code(SOURCE[key!]!);
}

/** The body of one `function name(` in a module, braces balanced. */
export function fn(file: string, name: string): string {
  const text = sourceOf(file);
  const at = text.indexOf(`function ${name}(`);
  expect(`${file}:${name}`).toBe(at < 0 ? `${file}: no ${name}` : `${file}:${name}`);
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  throw new Error(`${file}'s ${name} never closes`);
}

/**
 * Three seats, three towns, two religions, and a seat-0 holy site pressing on
 * the near half of the world.
 *
 *   Uruk    (4,4)   seat 0's capital, watched — it is its own.
 *   Lagash  (10,6)  seat 1's capital, **watched** by a seat-0 scout standing
 *                   beside it.
 *   Nippur  (13,9)  seat 1's, **remembered**: a scout stood on it, was seen to,
 *                   and left. The sighting survives; the sight does not.
 *
 * Visibility is *driven* rather than written — a scout placed, a recompute, the
 * scout removed, a second recompute — because the rule under test is "what may
 * this seat read", and a hand-written grid would be the test agreeing with
 * itself about the very thing that is meant to be checked.
 *
 * **Two caravans reach the far town** (2026-08-28), and they are what carries a
 * source of each faith all the way out to it. It used to be a proclamation
 * standing over Nippur, and the ruling that made a proclamation an instant lump
 * deleted `Religion.pulses` outright — so the fixture needs a *standing*
 * long-range source, and a trade route is the surgical one: it is a fact about
 * two named towns and touches nothing else on the board (a road would have
 * joined every town to every other and rewritten three ledgers to fix one).
 * Both faiths get one, which is what keeps the leak test a filter doing work
 * rather than a world with nothing in it to leak.
 */
export function faithWorld(): { state: GameState; ours: Religion; theirs: Religion } {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Azure', color: '#2a4d8f', isHuman: true },
      { name: 'Crimson', color: '#8f2a2a', isHuman: false },
      { name: 'Verdant', color: '#2a8f4d', isHuman: false },
    ],
  });
  state.map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  computeFreshwater(state.map);
  foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
  state.cities[0]!.name = 'Uruk';
  foundCityAt(state, 1, getTileAt(state.map, 10, 6)!);
  state.cities[1]!.name = 'Lagash';
  foundCityAt(state, 1, getTileAt(state.map, 13, 9)!);
  state.cities[2]!.name = 'Nippur';

  const ours = found(state, 0);
  const theirs = found(state, 1);
  // **Named outright** rather than left to the generator. A religion's name is
  // drawn from `state.rng` at the founding, and every seeded draw in the game
  // moved when `newGame` began shuffling the bead decks off that same stream
  // (schema 37) — so a fixture that quoted a generated name was a fixture that
  // would break again the next time anything touched the opening rolls. What
  // these suites are about is what a *plate* says, not what a name generator
  // produces; `religionData.test.ts` is where the names themselves are pinned.
  ours.name = 'the Grain Cult';
  theirs.name = 'the Way of the Hearth';

  // Seat 0's holy site, on ground Uruk claimed — what its faith presses on the
  // near half of the world (`siteRange` 6).
  getTileAt(state.map, 5, 4)!.improvement = 'holySite';
  // Who follows what. Uruk is split — the case a count has to survive — and
  // Lagash flies Crimson's banner outright.
  state.cities[0]!.population = 5;
  state.cities[0]!.followers = { [ours.id]: 3, [theirs.id]: 1 };
  state.cities[1]!.population = 4;
  state.cities[1]!.followers = { [theirs.id]: 3 };
  state.cities[2]!.population = 3;
  state.cities[2]!.followers = { [theirs.id]: 2 };

  // A caravan of each faith standing on Nippur's ledger. `explainPressure` reads
  // the route off the *piece* — presence is the state, there is no register — so
  // this is exactly what the shuttle phase would have left behind.
  for (const [seat, from] of [
    [0, state.cities[0]!.id],
    [1, state.cities[1]!.id],
  ] as const) {
    const caravan = createUnit(state, seat, 'trader', 8 + seat, 8);
    caravan.trade = {
      from,
      to: state.cities[2]!.id,
      expiresTurn: state.turn + 20,
      outbound: true,
      autoResend: false,
    };
  }

  // A scout beside Lagash, and one on Nippur that then leaves.
  createUnit(state, 0, 'scout', 10, 5);
  const wanderer = createUnit(state, 0, 'scout', 13, 9);
  recomputeVisibility(state, 0);
  removeUnit(state, wanderer.id);
  recomputeVisibility(state, 0);
  return { state, ours, theirs };
}

/** Founds a faith for one seat, out of one god, the way the verb does. */
export function found(state: GameState, seat: number): Religion {
  const player = state.players[seat]!;
  player.pantheon.beliefs.push(BELIEF_IDS[0]!);
  return foundReligion(state, player);
}
