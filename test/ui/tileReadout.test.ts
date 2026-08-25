/**
 * What the two hover cards say about a hex.
 *
 * `describeTile` is the whole of the terrain/feature line on both surfaces — the
 * game's info panel and the mapgen inspection page — and it is pure, so it can
 * be asserted here without a DOM. What is worth asserting is exactly the thing
 * that would break silently: the card reads the feature **generically**, out of
 * `terrain.json`, so a feature added to the table has to arrive named and with
 * its yields already in the figure rather than as a blank row or an `undefined`.
 * The two arid features are the first ones to test that claim since jungle.
 *
 * The itemized breakdown and the occupant row are asked here for the same
 * reason and in the same way: `tileYieldLines` and `describeOccupant` are the
 * *text*, and the DOM half is three lines that turn a line into a node (the
 * split `splitYieldText` makes, and this suite has no jsdom).
 */

import { describe, expect, it } from 'vitest';

import {
  foldTileYield,
  tileYieldOf,
  yieldContextFor,
} from '../../src/sim/cities';
import { createMap, getTileAt, type Tile } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import {
  FEATURE_IDS,
  type FeatureId,
  TILE_YIELD_KEYS,
  emptyTileYield,
  readTileYield,
} from '../../src/sim/terrainData';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { tileIndex } from '../../src/sim/map';
import { foundCityAt } from '../../src/sim/cities';
import { YIELD_GLYPH, type YieldKey } from '../../src/ui/figures';
import {
  type TileYieldLine,
  describeOccupant,
  describeTile,
  tileYieldContributions,
  tileYieldLines,
} from '../../src/ui/tileReadout';

function tile(overrides: Partial<Tile> = {}): Tile {
  return {
    col: 3,
    row: 4,
    terrain: 'desert',
    feature: 'none',
    hills: false,
    elevation: 0.7,
    moisture: 0.2,
    riverEdges: 0,
    freshwater: false,
    ...overrides,
  } as Tile;
}

/** A two-seat state on a blank rectangle, nothing explored by anybody. */
function boardState(terrain: 'desert' | 'grassland' = 'grassland'): GameState {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    players: [
      { name: 'Crimson', color: '#a00', isHuman: true },
      { name: 'Cobalt', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 12, height: 10, terrain });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(12 * 10).fill(null);
  state.units = [];
  state.nextEntityId = 1;
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const found = getTileAt(state.map, col, row);
  if (!found) throw new Error(`no tile at ${col},${row}`);
  return found;
}

/** Sets one seat's view of one hex, without running a sight sweep over it. */
function see(state: GameState, seat: number, tile: Tile, level: number): void {
  state.visibility[seat]![tileIndex(state.map, tile.col, tile.row)] = level;
}

/**
 * The total a player would reach by reading the printed lines down the card:
 * start from the standing ground line (its unwritten voices are zeroes, which
 * is what "replaces" means), then add every signed line under it. Nothing here
 * asks the simulation — it re-folds the *text*, because "the fold visibly
 * equals the total" is a claim about what is on the screen.
 */
function foldPrinted(lines: readonly TileYieldLine[]): Record<YieldKey, number> {
  const total = emptyTileYield();
  for (const line of lines) {
    if (line.replaced) continue;
    const adds = line.parts.length > 0 && line.parts.every((part) => part.text.startsWith('+'));
    if (!adds) for (const key of TILE_YIELD_KEYS) total[key] = 0;
    for (const part of line.parts) total[part.key] += Number(part.text);
  }
  return total;
}

describe('describeTile', () => {
  it('names every feature in the table, with nothing left blank', () => {
    for (const feature of FEATURE_IDS as FeatureId[]) {
      const described = describeTile(tile({ feature }));
      expect(described.feature, feature).toBeTruthy();
      expect(described.feature, feature).not.toBe('undefined');
    }
  });

  it('reads the oasis and the floodplain as desert wearing a feature', () => {
    const oasis = describeTile(tile({ feature: 'oasis' }));
    expect(oasis.terrain).toBe('Desert');
    expect(oasis.feature).toBe('Oasis');
    expect(oasis.hills).toBe(false);

    const flood = describeTile(tile({ feature: 'floodplain' }));
    expect(flood.terrain).toBe('Desert');
    expect(flood.feature).toBe('Floodplain');
  });

  it('prints the feature yield the card would show, not the bare desert', () => {
    // The other half of the row. Desert pays nothing, so a card that fell back
    // to the terrain would print an em dash on the two hexes in the game that
    // most need a number on them.
    expect(tileYieldOf(tile())).toMatchObject({ food: 0, production: 0 });
    expect(tileYieldOf(tile({ feature: 'oasis' }))).toMatchObject({ food: 3, production: 1 });
    expect(tileYieldOf(tile({ feature: 'floodplain' }))).toMatchObject({ food: 2, production: 0 });
  });
});

/**
 * The itemization, which is rule 5 arriving at the surface it was written for:
 * the card no longer shows a total with no account of it.
 */
describe('tileYieldLines', () => {
  it('prints one line per contribution, in the order the rules resolve', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.feature = 'forest';
    hex.hills = true;
    hex.resource = 'gems';
    hex.improvement = 'mine';

    const lines = tileYieldLines(state, 0, hex);
    expect(lines.map((line) => line.source)).toEqual([
      'Grassland',
      'Forest',
      'Hills',
      'Gems',
      'Mine',
    ]);
    // The two algebras, made visible: what replaces is written plain, what adds
    // is signed. A card that signed an override would promise an addition the
    // fold never performs.
    expect(lines[2]!.figures).toBe(`2${YIELD_GLYPH.production}`);
    expect(lines[3]!.figures).toBe(`+2${YIELD_GLYPH.gold}`);
    expect(lines[4]!.figures).toBe(`+1${YIELD_GLYPH.production}`);
    // Ground a later override took over stays on the card, struck rather than
    // dropped — "forest, replaced by hills" is the sentence the entry is for.
    expect(lines.filter((line) => line.replaced).map((line) => line.source)).toEqual([
      'Grassland',
      'Forest',
    ]);
  });

  it('folds, as printed, to the total the card shows', () => {
    // The whole claim of an itemized card: read the lines down and you reach
    // the headline. Re-folded from the *text* of the lines rather than from the
    // list they were built from, over ground that exercises every shape —
    // nothing at all, a replacement, an override chain, adds on top.
    const state = boardState('desert');
    const cases: Partial<Tile>[] = [
      {},
      { terrain: 'grassland' },
      { terrain: 'grassland', feature: 'forest' },
      { terrain: 'grassland', feature: 'forest', hills: true },
      { terrain: 'grassland', resource: 'cotton' },
      { terrain: 'grassland', resource: 'wheat', improvement: 'farm' },
      { terrain: 'desert', feature: 'oasis' },
    ];
    for (const shape of cases) {
      const hex = at(state, 4, 4);
      Object.assign(hex, { terrain: 'desert', feature: 'none', hills: false }, shape);
      delete hex.resource;
      delete hex.improvement;
      Object.assign(hex, shape);
      const label = JSON.stringify(shape);
      const total = tileYieldOf(hex, yieldContextFor(state, 0));
      expect(foldPrinted(tileYieldLines(state, 0, hex)), label).toEqual(total);
      // And the list the total is folded from is the list that was printed.
      expect(foldTileYield(tileYieldContributions(state, 0, hex)), label).toEqual(total);
    }
  });

  it('itemizes the city centre on a hex a town stands on', () => {
    // The ratified example, read off the card: a 3🌾/2🪙 seam under a town is
    // the town's own floor with the ground's food and gold inherited on top.
    const state = boardState();
    at(state, 4, 4).resource = 'cotton';
    const city = foundCityAt(state, 0, at(state, 4, 4));
    see(state, 0, at(state, 4, 4), VISIBLE);

    const lines = tileYieldLines(state, 0, at(state, 4, 4));
    expect(lines.map((line) => line.source)).toEqual(['City centre', 'Inherited · Cotton']);
    expect(lines[0]!.figures).toBe(`2${YIELD_GLYPH.food} 2${YIELD_GLYPH.production}`);
    expect(lines[1]!.figures).toBe(`+1${YIELD_GLYPH.food} +2${YIELD_GLYPH.gold}`);
    expect(foldPrinted(lines)).toEqual(readTileYield({ food: 3, production: 2, gold: 2 }));

    // And a seat that has never seen the town reads the ground as ground: the
    // centre's yield is not a thing to be told about a city you do not know is
    // there.
    expect(tileYieldLines(state, 1, at(state, 4, 4)).map((line) => line.source)).toEqual([
      'Grassland',
      'Cotton',
    ]);
    expect(city.ownerId).toBe(0);
  });
});

/**
 * The occupant row: what is *planted* on the hex, each kind under the fog rule
 * its own kind obeys everywhere else in the game.
 */
describe('describeOccupant', () => {
  it('says nothing about bare ground', () => {
    const state = boardState();
    see(state, 0, at(state, 4, 4), VISIBLE);
    expect(describeOccupant(state, 0, at(state, 4, 4))).toBe('—');
  });

  it('names a site on ground the seat has explored, and not before', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.discovery = 'ruins';
    expect(describeOccupant(state, 0, hex)).toBe('—');

    // A site is *ground*, so it survives on a remembered hex — the same rule
    // the board draws it by (`sites3d.ts`).
    see(state, 0, hex, EXPLORED);
    expect(describeOccupant(state, 0, hex)).toBe('Ancient ruins — unclaimed');
    see(state, 0, hex, VISIBLE);
    expect(describeOccupant(state, 0, hex)).toBe('Ancient ruins — unclaimed');

    hex.discovery = 'village';
    expect(describeOccupant(state, 0, hex)).toBe('Tribal village — unclaimed');
  });

  it('names a camp only while it is watched', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    state.camps.push({ col: hex.col, row: hex.row, foundedTurn: 1 });

    see(state, 0, hex, EXPLORED);
    // An occupation, not ground: a remembered camp would be a banner a player
    // sends a warrior at ten turns after it burnt out.
    expect(describeOccupant(state, 0, hex)).toBe('—');
    see(state, 0, hex, VISIBLE);
    expect(describeOccupant(state, 0, hex)).toBe('Barbarian camp');
  });

  it('names a town, its owner and its star, live or remembered', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    const city = foundCityAt(state, 0, hex);
    city.name = 'Uruk';

    // Seat 1 has not seen it: the hex is ground.
    see(state, 1, hex, HIDDEN);
    expect(describeOccupant(state, 1, hex)).toBe('—');

    see(state, 1, hex, VISIBLE);
    // The star is the capital mark from `cityDisplayName`, the one formatter a
    // city's name reaches a player through.
    expect(describeOccupant(state, 1, hex)).toBe('Uruk ✶ — Crimson');

    // Out of sight, but remembered: named, and *marked* as a memory rather
    // than quoted as current.
    see(state, 1, hex, EXPLORED);
    state.citySightings[1] = [
      { cityId: city.id, col: hex.col, row: hex.row, name: 'Uruk', ownerId: 0 },
    ];
    expect(describeOccupant(state, 1, hex)).toBe('Uruk ✶ — Crimson · remembered');
  });

  it('outranks a camp and a site with the walls that stand over them', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.discovery = 'ruins';
    state.camps.push({ col: hex.col, row: hex.row, foundedTurn: 1 });
    foundCityAt(state, 0, hex).name = 'Uruk';
    see(state, 0, hex, VISIBLE);
    expect(describeOccupant(state, 0, hex)).toBe('Uruk ✶ — Crimson');
  });

  it('tells a spectator everything, which is the inspection page&apos;s reading', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.discovery = 'village';
    // Nothing explored by anybody, and the mapgen page still has to be able to
    // describe the ground it exists to inspect — the liberty its resource lens
    // already takes.
    expect(describeOccupant(state, 0, hex)).toBe('—');
    expect(describeOccupant(state, 0, hex, true)).toBe('Tribal village — unclaimed');
  });
});

describe('a line that pays nothing', () => {
  it('is written 0, with no mark naming a voice it says nothing about', () => {
    const state = boardState('desert');
    const lines = tileYieldLines(state, 0, at(state, 4, 4));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ source: 'Desert', figures: '0', parts: [] });
  });
});
