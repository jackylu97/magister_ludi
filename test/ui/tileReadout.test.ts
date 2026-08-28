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
  describeImprovement,
  describeOccupant,
  describeTile,
  describeWater,
  displayYieldLines,
  resourceRequirementOf,
  itemisedYieldLines,
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
      // `none` is the one row whose *name* is not a thing to tell anybody: bare
      // ground has no feature, and "Feature: None" is a label spending a line of
      // a small card to say nothing.
      if (feature === 'none') {
        expect(described.feature).toBeNull();
        continue;
      }
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
    // The hill is written *before* the canopy on a forested hill (user ruling,
    // 2026-08-27): both are overrides, and the last one standing is the hex's
    // yield, so ordering them this way is how "the feature wins" is expressed —
    // as an order in the derivation rather than a precedence clause somewhere
    // else. The card prints the list faithfully, so the order is visible here.
    expect(lines.map((line) => line.source)).toEqual([
      'Grassland',
      'Hills',
      'Forest',
      'Gems',
      'Mine',
    ]);
    // The two algebras, made visible: what replaces is written plain, what adds
    // is signed. A card that signed an override would promise an addition the
    // fold never performs.
    expect(lines[2]!.figures).toBe(`1${YIELD_GLYPH.food} 1${YIELD_GLYPH.production}`);
    expect(lines[3]!.figures).toBe(`+2${YIELD_GLYPH.gold}`);
    expect(lines[4]!.figures).toBe(`+1${YIELD_GLYPH.production}`);
    // Ground a later override took over is still *written* — this list is the
    // faithful print of `explainTileYield`'s derivation — and marked. What the
    // card does with it is `displayYieldLines`'s business, below.
    expect(lines.filter((line) => line.replaced).map((line) => line.source)).toEqual([
      'Grassland',
      'Hills',
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
 * The presentation fold: what a *player* is shown, as against the derivation the
 * simulation writes.
 *
 * Two rules, both pure, both about a small card's attention. `displayYieldLines`
 * drops the ground a later override took over — a forest on grassland is a
 * forest, not grassland with a correction printed over it — and
 * `itemisedYieldLines` drops the whole account when the fold left one line,
 * because a ledger of one entry restates the total above it.
 *
 * The claim worth pinning is that neither can change a number: the total is
 * still `foldTileYield` of the simulation's own list, and what these two do is
 * decide which of its lines are *typeset*.
 */
describe('displayYieldLines', () => {
  it('reads a forest on grassland as one base line, the forest', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.feature = 'forest';

    expect(tileYieldLines(state, 0, hex).map((line) => line.source)).toEqual([
      'Grassland',
      'Forest',
    ]);
    const shown = displayYieldLines(tileYieldLines(state, 0, hex));
    expect(shown.map((line) => line.source)).toEqual(['Forest']);
    // And it is written plain, as a base line is — the forest *is* the hex's
    // yield, not a signed addition to grass nobody is being shown.
    expect(shown[0]!.figures).toBe(`1${YIELD_GLYPH.food} 1${YIELD_GLYPH.production}`);
    // The fold of what is shown is still the tile's total: a dropped line is by
    // definition one a later override had already overwritten.
    expect(foldPrinted(shown)).toEqual(tileYieldOf(hex, yieldContextFor(state, 0)));
  });

  it('keeps one ground line however long the override chain is', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.feature = 'forest';
    hex.hills = true;
    hex.resource = 'gems';
    hex.improvement = 'mine';

    const shown = displayYieldLines(tileYieldLines(state, 0, hex));
    // Grassland and Hills both go; the Forest stands — it is the *last*
    // override, which is the whole of the rule the card obeys, and on a
    // forested hill the canopy is what a player sees and what the hex pays.
    // Everything sitting *on* the hex follows it in the order the rules
    // resolved.
    expect(shown.map((line) => line.source)).toEqual(['Forest', 'Gems', 'Mine']);
    expect(shown.every((line) => !line.replaced)).toBe(true);
    expect(foldPrinted(shown)).toEqual(tileYieldOf(hex, yieldContextFor(state, 0)));
  });

  it('never drops a line on ground that was never overridden', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.resource = 'wheat';
    hex.improvement = 'farm';
    const lines = tileYieldLines(state, 0, hex);
    expect(displayYieldLines(lines)).toEqual(lines);
  });
});

describe('itemisedYieldLines', () => {
  it('shows no account for a hex whose yield is only its ground', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    // Bare grassland: one line, and it would say exactly what the figure above
    // it already says.
    expect(itemisedYieldLines(tileYieldLines(state, 0, hex))).toEqual([]);

    // A forest on it is still one line *after* the fold, so still no account —
    // this is the case the fold above created and the rule has to cover.
    hex.feature = 'forest';
    expect(itemisedYieldLines(tileYieldLines(state, 0, hex))).toEqual([]);

    // Bare desert, which pays nothing at all, is the same answer: there is no
    // calculation to show, only a figure (and the card drops even that).
    expect(itemisedYieldLines(tileYieldLines(boardState('desert'), 0, at(boardState('desert'), 4, 4)))).toEqual([]);
  });

  it('itemizes as soon as anything sits on the ground', () => {
    const state = boardState();
    const hex = at(state, 4, 4);

    // A resource is a modifier — every kind of `add` is, which is the whole of
    // the rule: the card does not ask what sort of thing earned a line.
    hex.resource = 'cotton';
    expect(itemisedYieldLines(tileYieldLines(state, 0, hex)).map((line) => line.source)).toEqual([
      'Grassland',
      'Cotton',
    ]);

    // An improvement, on ground with no resource at all, is the same answer.
    delete hex.resource;
    hex.improvement = 'farm';
    expect(itemisedYieldLines(tileYieldLines(state, 0, hex)).map((line) => line.source)).toEqual([
      'Grassland',
      'Farm',
    ]);
  });

  it('itemizes a city centre only when the ground gave it something', () => {
    // The centre's inheritance is an `add` like any other, so a seam under a
    // town itemizes and a plain hex under one does not.
    const state = boardState();
    at(state, 4, 4).resource = 'cotton';
    foundCityAt(state, 0, at(state, 4, 4));
    see(state, 0, at(state, 4, 4), VISIBLE);
    expect(
      itemisedYieldLines(tileYieldLines(state, 0, at(state, 4, 4))).map((line) => line.source),
    ).toEqual(['City centre', 'Inherited · Cotton']);

    // Grassland is under the centre's own 2🌾/2⚙ floor, so it inherits nothing
    // and the centre is the only line there is: a figure, no account.
    const bare = boardState();
    foundCityAt(bare, 0, at(bare, 6, 6));
    see(bare, 0, at(bare, 6, 6), VISIBLE);
    const lines = tileYieldLines(bare, 0, at(bare, 6, 6));
    expect(lines.map((line) => line.source)).toEqual(['City centre']);
    expect(itemisedYieldLines(lines)).toEqual([]);
  });
});

/** The rows that simply are not drawn when they have nothing to say. */
describe('an empty row', () => {
  it('is null, not an em dash', () => {
    expect(describeImprovement(tile())).toBeNull();
    expect(describeImprovement(tile({ improvement: 'farm' }))).toContain('Farm');
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
    expect(describeOccupant(state, 0, at(state, 4, 4))).toBeNull();
  });

  it('names a site on ground the seat has explored, and not before', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.discovery = 'ruins';
    expect(describeOccupant(state, 0, hex)).toBeNull();

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
    expect(describeOccupant(state, 0, hex)).toBeNull();
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
    expect(describeOccupant(state, 1, hex)).toBeNull();

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
    expect(describeOccupant(state, 0, hex)).toBeNull();
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

/**
 * The two rows the playtest asked for (user, 2026-08-27), both pure and both the
 * *text* half of a card whose DOM half is three lines.
 *
 * They are here rather than in the panel because the thing that can be quietly
 * wrong is the sentence: a hex that is coastal and says nothing, a seam that
 * wants Mining and says nothing, a technology the empire already holds printed
 * in the alarm ink. None of those throws.
 */
describe('describeWater', () => {
  it('says nothing at all about dry inland ground', () => {
    const state = boardState();
    expect(describeWater(state, at(state, 4, 4))).toBeNull();
  });

  it('names the sea, the fresh water, and both when a hex has both', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    // Fresh water alone: the flag `computeFreshwater` sets, read through
    // `hasFreshWater` rather than off the field.
    hex.freshwater = true;
    expect(describeWater(state, hex)).toBe('Fresh water');

    // The sea is a fact about the *neighbours*, and `coast` specifically — a
    // lake is water a city cannot sail out of and speaks through fresh water.
    hex.freshwater = false;
    const beside = at(state, 5, 4);
    beside.terrain = 'coast';
    expect(describeWater(state, hex)).toBe('Coastal');

    hex.freshwater = true;
    expect(describeWater(state, hex)).toBe('Coastal · Fresh water');
  });

  it('is not fooled by a lake next door, which is not a coast', () => {
    const state = boardState();
    const hex = at(state, 4, 4);
    at(state, 5, 4).terrain = 'lake';
    expect(describeWater(state, hex)).toBeNull();
  });
});

describe('what a seam still wants', () => {
  /** A hex carrying a resource, revealed to seat 0 by having no gate at all. */
  function seam(state: GameState, resource: 'gems' | 'wheat'): Tile {
    const hex = at(state, 4, 4);
    hex.hills = resource === 'gems';
    hex.resource = resource;
    return hex;
  }

  it('names the improvement and its technology, in the words the tables use', () => {
    const state = boardState();
    const hex = seam(state, 'gems');
    // Seat 0 has not researched Mining: the line is a want, and the caller
    // paints a want vermilion.
    const want = resourceRequirementOf(state, 0, hex);
    expect(want).not.toBeNull();
    expect(want!.text).toBe('requires Mine (Mining)');
    expect(want!.held).toBe(false);
  });

  it('reads plain the moment the empire holds the technology', () => {
    const state = boardState();
    const hex = seam(state, 'gems');
    state.players[0]!.techsResearched.push('mining');
    const want = resourceRequirementOf(state, 0, hex);
    // Same sentence — it is still what has to be built — in the card's own ink.
    expect(want).toEqual({ text: 'requires Mine (Mining)', held: true });
  });

  it('goes quiet once the improvement is standing on it', () => {
    const state = boardState();
    const hex = seam(state, 'gems');
    state.players[0]!.techsResearched.push('mining');
    hex.improvement = 'mine';
    expect(resourceRequirementOf(state, 0, hex)).toBeNull();
  });

  it('says nothing about a hex with no resource on it', () => {
    const state = boardState();
    expect(resourceRequirementOf(state, 0, at(state, 4, 4))).toBeNull();
  });

  it('never leaks a resource this empire cannot yet name', () => {
    // `openedResource`'s first clause, and the reason it is not repeated in the
    // requirement: a gated resource has no row on this card at all, so a line
    // reading "requires Mine (Mining)" under a hex the card refuses to describe
    // would be the readout leaking the very thing the gate hides.
    const state = boardState();
    const hex = at(state, 4, 4);
    hex.hills = true;
    hex.resource = 'iron';
    expect(resourceRequirementOf(state, 0, hex)).toBeNull();

    state.players[0]!.techsResearched.push('bronzeWorking');
    expect(resourceRequirementOf(state, 0, hex)!.text).toBe('requires Mine (Mining)');
  });

  it('names each family off the improvement table, never off a written-down map', () => {
    // The inverse `improvementForResource` builds, read through: wheat is a
    // farm's and a farm needs Agriculture, and neither string is in the UI.
    const state = boardState();
    const hex = seam(state, 'wheat');
    expect(resourceRequirementOf(state, 0, hex)!.text).toBe('requires Farm (Agriculture)');
  });
});
