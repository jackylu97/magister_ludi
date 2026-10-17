/**
 * **The Expansionist land cards** (batch E3 of
 * `docs/plans/expansionist-build-triage.md`). `expansionist.test.ts` checks the
 * rows against the sheet; this file checks what the cards do:
 *
 *   · The Woodland Bands: the open-ground price in the woods, and a defence line
 *     read off the hex the piece stands on (the triage's reading 28);
 *   · The Prospectors: the record of who struck a seam (reading 26);
 *   · The Watercourses and The Water Courts: water passed along farms, which
 *     the Irrigation renewal and a farm's placement both read (reading 22);
 *   · The Landscape Garden: a tended hex beside a town that holds a wonder
 *     (reading 25);
 *   · The Common Domain: a town's own reach (reading 21);
 *   · The Mountain Terraces: workable mountains (reading 20);
 *   · The Raising of the Land and The Coming of the Water: the lasting marks
 *     (reading 23);
 *   · The Age of Improvement: an amplifier on improved hexes only (reading 24);
 *   · the one writer of each new tile field, and the words of all ten.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../../src/sim/commands';
import {
  assignableTiles,
  foundCityAt,
  realiseItem,
  refreshCityDerived,
  withinWorkRadius,
  workRadiusOf,
} from '../../../src/sim/cities';
import { prospectAt, improvementErrorAt } from '../../../src/sim/improvements';
import { type Tile, raiseImprovement, tileHex, tileIndex, wrappedDistance } from '../../../src/sim/map';
import { moveProfile, tileMoveCost } from '../../../src/sim/pathfind';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  cardCombatLines,
  describeCard,
  explainCardCityYields,
  stripRefs,
} from '../../../src/sim/statecraft';
import { type OrderId } from '../../../src/sim/statecraftData';
import { computeFreshwater, neighborInDirection, setRiverEdge } from '../../../src/sim/water';
import { explainTileYield, foldTile, yieldContextFor } from '../../../src/sim/yields/hex';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Takes every card out of this seat's chairs. */
function unseat(state: GameState, playerId: number): void {
  playerById(state, playerId)!.statecraft.slots = [];
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

/** Hands a hex to a town, as its borders growing there would. */
function own(state: GameState, city: City, tile: Tile): void {
  state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
  bumpRevision(state);
}

/** What one source pays on a hex, for seat 0, in one voice. */
function paid(state: GameState, tile: Tile, source: string, voice: 'food' | 'production' | 'culture' | 'science'): number {
  return explainTileYield(tile, yieldContextFor(state, 0))
    .filter((line) => line.source === source)
    .reduce((sum, line) => sum + line[voice], 0);
}

const said = (id: string): string[] => describeCard(id as never).map((clause) => stripRefs(clause.text));

describe('the Expansionist batch E3: The Woodland Bands', () => {
  it('prices a step into forest or jungle at the open-ground cost, civilians included', () => {
    const state = bareState();
    const tile = at(state, 5, 5);
    tile.feature = 'forest';
    const worker = createUnit(state, 0, 'worker', 4, 5);
    bumpRevision(state);
    expect(tileMoveCost(tile, moveProfile(state, worker))).toBe(2);
    slot(state, 0, 'theWoodlandBands');
    expect(tileMoveCost(tile, moveProfile(state, worker))).toBe(1);
    tile.feature = 'jungle';
    tile.hills = true;
    bumpRevision(state);
    // The hill still costs its climb: only the woods' own price goes.
    const plain = { ...tile, feature: 'none' as const };
    expect(tileMoveCost(tile, moveProfile(state, worker))).toBe(tileMoveCost(plain));
  });

  it('pays +2 to a defender standing in the woods, and nothing to an attacker there', () => {
    const state = bareState();
    slot(state, 0, 'theWoodlandBands');
    const wood = at(state, 5, 5);
    wood.feature = 'forest';
    const soldier = createUnit(state, 0, 'warrior', 5, 5);
    bumpRevision(state);
    const strength = (side: 'attack' | 'defend', tile: Tile): number =>
      cardCombatLines(state, {
        unit: soldier,
        side,
        tile,
        vsBarbarians: false,
        vsCity: false,
        targetHp: 100,
        targetMaxHp: 100,
      }).reduce((sum, line) => sum + line.amount, 0);
    expect(strength('defend', wood)).toBe(2);
    // Attacking out of the woods: the row is a defence line (reading 28).
    expect(strength('attack', at(state, 6, 5))).toBe(0);
    // Defending on open ground pays nothing.
    soldier.col = 7;
    expect(strength('defend', at(state, 7, 5))).toBe(0);
  });
});

describe('the Expansionist batch E3: The Prospectors', () => {
  it('records the empire whose survey struck the seam, and nothing for a barren survey', () => {
    const state = bareState();
    town(state, 3, 3, 3);
    const rich = at(state, 4, 3);
    rich.hills = true;
    rich.vein = 'iron';
    const barren = at(state, 3, 4);
    barren.hills = true;
    const worker = createUnit(state, 0, 'worker', 4, 3);
    bumpRevision(state);
    prospectAt(state, worker, rich);
    expect(rich.resource).toBe('iron');
    expect(rich.surfacedBy).toBe(0);
    worker.col = 3;
    worker.row = 4;
    prospectAt(state, worker, barren);
    expect(barren.surveyed).toBe(true);
    expect(barren.surfacedBy).toBeUndefined();
  });
});

/**
 * A river farm, a farm beside it and a farm beside that one, all seat 0's, on
 * a row of dry grassland. The river runs along the river farm's west edge.
 */
function riverFarms(): { state: GameState; city: City; river: Tile; near: Tile; far: Tile } {
  const state = bareState(16, 10);
  const city = town(state, 3, 6, 6);
  const river = at(state, 6, 4);
  const near = neighborInDirection(state.map, river, 0)!;
  const far = neighborInDirection(state.map, near, 0)!;
  setRiverEdge(state.map, river, 3);
  computeFreshwater(state.map);
  for (const tile of [river, near, far]) {
    own(state, city, tile);
    raiseImprovement(tile, 'farm', state.turn);
  }
  bumpRevision(state);
  return { state, city, river, near, far };
}

describe('the Expansionist batch E3: water along the farms', () => {
  it('The Watercourses: the river farm and the farm beside it gain +2, and the second is watered', () => {
    const { state, river, near, far } = riverFarms();
    expect(river.freshwater).toBe(true);
    expect(near.freshwater).toBe(false);
    expect(paid(state, near, 'Irrigation', 'food')).toBe(0);
    slot(state, 0, 'theWatercourses');
    const source = 'Order · The Watercourses';
    expect(paid(state, river, source, 'production')).toBe(2);
    expect(paid(state, near, source, 'production')).toBe(2);
    expect(paid(state, far, source, 'production')).toBe(0);
    // Watered one step and no further: the Irrigation renewal follows.
    expect(paid(state, near, 'Irrigation', 'food')).toBe(1);
    expect(paid(state, far, 'Irrigation', 'food')).toBe(0);
  });

  it('The Water Courts: water passes along the whole chain of farms', () => {
    const { state, near, far } = riverFarms();
    slot(state, 0, 'theWaterCourts');
    expect(paid(state, near, 'Irrigation', 'food')).toBe(1);
    expect(paid(state, far, 'Irrigation', 'food')).toBe(1);
    // A gap in the chain stops the water.
    const { state: broken, near: gap, far: cut } = riverFarms();
    slot(broken, 0, 'theWaterCourts');
    delete gap.improvement;
    delete gap.improvedOn;
    bumpRevision(broken);
    expect(paid(broken, cut, 'Irrigation', 'food')).toBe(0);
  });

  it('lets a farm be placed on dry desert beside a watered farm', () => {
    const { state, city, far } = riverFarms();
    const desert = neighborInDirection(state.map, far, 0)!;
    desert.terrain = 'desert';
    own(state, city, desert);
    expect(improvementErrorAt(state, 0, desert, 'farm')).toMatch(/fresh water/);
    slot(state, 0, 'theWaterCourts');
    expect(improvementErrorAt(state, 0, desert, 'farm')).toBeNull();
  });
});

describe('the Expansionist batch E3: The Landscape Garden', () => {
  it('pays a tended hex beside the centre of a town that holds a world wonder', () => {
    const state = bareState();
    const city = town(state, 4, 4, 4);
    slot(state, 0, 'theLandscapeGarden');
    const tended = neighborInDirection(state.map, at(state, 4, 4), 0)!;
    raiseImprovement(tended, 'forestGarden', state.turn);
    bumpRevision(state);
    const source = 'Order · The Landscape Garden';
    expect(paid(state, tended, source, 'culture')).toBe(0);
    realiseItem(state, city, { kind: 'building', id: 'pyramids' });
    bumpRevision(state);
    expect(paid(state, tended, source, 'culture')).toBe(3);
  });
});

describe('the Expansionist batch E3: a town\'s reach and its mountains', () => {
  it('The Common Domain: a town of ten works and buys one ring further out', () => {
    const state = bareState(20, 12);
    const city = town(state, 8, 6, 9);
    slot(state, 0, 'theCommonDomain');
    const centre = at(state, 8, 6);
    const outer = state.map.tiles.find(
      (tile) => wrappedDistance(state.map, tileHex(centre), tileHex(tile)) === 4,
    )!;
    expect(workRadiusOf(state, city)).toBe(3);
    expect(withinWorkRadius(state, city, outer.col, outer.row)).toBe(false);
    city.population = 10;
    bumpRevision(state);
    expect(workRadiusOf(state, city)).toBe(4);
    expect(withinWorkRadius(state, city, outer.col, outer.row)).toBe(true);
    own(state, city, outer);
    expect(assignableTiles(state, city)).toContain(outer);
    // Below ten again, the hex is out of reach at the next assignment.
    city.population = 9;
    bumpRevision(state);
    expect(assignableTiles(state, city)).not.toContain(outer);
  });

  it('The Mountain Terraces: the mountains in a town\'s borders are worked, and pay', () => {
    const state = bareState();
    const city = town(state, 4, 4, 4);
    const peak = neighborInDirection(state.map, at(state, 4, 4), 0)!;
    peak.terrain = 'mountain';
    bumpRevision(state);
    expect(assignableTiles(state, city)).not.toContain(peak);
    slot(state, 0, 'theMountainTerraces');
    expect(assignableTiles(state, city)).toContain(peak);
    const yieldOf = foldTile(peak, yieldContextFor(state, 0));
    expect(yieldOf.science).toBe(2);
    expect(yieldOf.production).toBe(1);
    // When the card leaves, the mountain is no longer a citizen's seat.
    unseat(state, 0);
    expect(assignableTiles(state, city)).not.toContain(peak);
  });
});

describe('the Expansionist batch E3: the lasting marks', () => {
  it('The Raising of the Land: an engineer\'s act raises the town\'s improved and tended hexes, once', () => {
    const state = bareState();
    const city = town(state, 4, 4, 4);
    slot(state, 0, 'theRaisingOfTheLand');
    const farm = neighborInDirection(state.map, at(state, 4, 4), 0)!;
    const garden = neighborInDirection(state.map, at(state, 4, 4), 3)!;
    const bare = neighborInDirection(state.map, at(state, 4, 4), 1)!;
    raiseImprovement(farm, 'farm', state.turn);
    raiseImprovement(garden, 'forestGarden', state.turn);
    bumpRevision(state);
    const act = (): void => {
      state.recruited.push('bezalel');
      const engineer = createUnit(state, 0, 'greatPerson', city.col, city.row, 'bezalel');
      const result = applyCommand(state, { type: 'greatPersonAct', playerId: 0, unitId: engineer.id });
      expect(result.ok, result.ok ? '' : result.error).toBe(true);
    };
    act();
    expect(farm.marks).toEqual(['raised']);
    expect(garden.marks).toEqual(['raised']);
    expect(bare.marks).toBeUndefined();
    expect(paid(state, farm, 'Raised land', 'food')).toBe(1);
    expect(paid(state, farm, 'Raised land', 'production')).toBe(1);
    // A second act raises nothing twice; a hex built on since is raised now.
    raiseImprovement(bare, 'farm', state.turn);
    bumpRevision(state);
    act();
    expect(farm.marks).toEqual(['raised']);
    expect(bare.marks).toEqual(['raised']);
    // The mark stays when the card leaves, and pays only while a work stands.
    unseat(state, 0);
    expect(paid(state, farm, 'Raised land', 'food')).toBe(1);
    delete farm.improvement;
    delete farm.improvedOn;
    bumpRevision(state);
    expect(paid(state, farm, 'Raised land', 'food')).toBe(0);
  });

  it('The Coming of the Water: an Aqueduct waters the farms that stand when it is finished', () => {
    const state = bareState();
    const city = town(state, 4, 4, 6);
    slot(state, 0, 'theComingOfTheWater');
    const farm = neighborInDirection(state.map, at(state, 4, 4), 0)!;
    const later = neighborInDirection(state.map, at(state, 4, 4), 3)!;
    raiseImprovement(farm, 'farm', state.turn);
    bumpRevision(state);
    realiseItem(state, city, { kind: 'building', id: 'granary' });
    expect(farm.marks).toBeUndefined();
    realiseItem(state, city, { kind: 'building', id: 'aqueduct' });
    expect(farm.marks).toEqual(['aqueductWater']);
    expect(paid(state, farm, 'Aqueduct water', 'food')).toBe(1);
    raiseImprovement(later, 'farm', state.turn);
    bumpRevision(state);
    expect(later.marks).toBeUndefined();
  });
});

describe('the Expansionist batch E3: The Age of Improvement', () => {
  it('doubles the Orders\' lines on improved hexes, and not on tended ones or in a town\'s ledger', () => {
    const state = bareState();
    const city = town(state, 4, 4, 4);
    const mine = neighborInDirection(state.map, at(state, 4, 4), 0)!;
    mine.hills = true;
    raiseImprovement(mine, 'mine', state.turn);
    const garden = neighborInDirection(state.map, at(state, 4, 4), 3)!;
    raiseImprovement(garden, 'forestGarden', state.turn);
    const field = neighborInDirection(state.map, at(state, 4, 4), 1)!;
    raiseImprovement(field, 'farm', state.turn);
    slot(state, 0, 'theRopeStretchers');
    slot(state, 0, 'theTendedCountry');
    slot(state, 0, 'theManors');
    const total = (tile: Tile): number => foldTile(tile, yieldContextFor(state, 0)).production;
    const mineBefore = total(mine);
    const gardenBefore = total(garden);
    const ledgerBefore = explainCardCityYields(state, city).reduce((sum, line) => sum + line.production, 0);
    // Each of the three really pays before the amplifier is seated.
    expect(paid(state, mine, 'Order · The Rope Stretchers', 'production')).toBe(1);
    expect(paid(state, garden, 'Order · The Tended Country', 'production')).toBe(2);
    expect(ledgerBefore).toBe(1);
    slot(state, 0, 'theAgeOfImprovement');
    // The Rope Stretchers' +1 on the mine, once more.
    expect(total(mine)).toBe(mineBefore + 1);
    // The Tended Country's +2 on a tended work is not doubled.
    expect(total(garden)).toBe(gardenBefore);
    // The Manors count improved hexes for the town, and are not doubled.
    expect(explainCardCityYields(state, city).reduce((sum, line) => sum + line.production, 0)).toBe(
      ledgerBefore,
    );
  });
});

/** The simulation's sources, read as text (the `slateRegister.test.ts` idiom). */
const SIM_SOURCES = import.meta.glob('../../../src/sim/**/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

describe('the Expansionist batch E3: the two new tile fields', () => {
  it('writes `Tile.marks` only in `markHex`, and `Tile.surfacedBy` only in `prospectAt`', () => {
    const marks: string[] = [];
    const surfaced: string[] = [];
    for (const [path, text] of Object.entries(SIM_SOURCES)) {
      if (/\.marks\s*(=[^=]|\.(push|splice)\()/.test(text)) marks.push(path.replace('../../../', ''));
      if (/\.surfacedBy\s*=[^=]/.test(text)) surfaced.push(path.replace('../../../', ''));
    }
    expect(marks).toEqual(['src/sim/map.ts']);
    expect(surfaced).toEqual(['src/sim/improvements.ts']);
  });
});

describe('the Expansionist batch E3: the words', () => {
  it('prints all ten cards in plain words', () => {
    expect(said('theWoodlandBands')).toEqual([
      'your units pay only the open-ground cost to enter forest or jungle',
      '+2 combat strength while standing in forest or jungle',
    ]);
    expect(said('theProspectors')).toEqual([
      '+3 production on every hex with a Mine over a seam you surfaced',
    ]);
    expect(said('theWatercourses')).toEqual([
      '+2 production on every hex with a Farm that is beside a river or beside a Farm and beside a river',
      'your farms beside one of your farms on a river count as having fresh water',
    ]);
    expect(said('theLandscapeGarden')).toEqual([
      "+3 culture on every tended hex that is beside a great person's work or beside a city that holds a wonder",
    ]);
    expect(said('theCommonDomain')).toEqual([
      'citizens may work owned hexes one ring beyond the usual reach in every city of 10 or more citizens',
    ]);
    expect(said('theRaisingOfTheLand')).toEqual([
      'a great engineer spending themselves on their boon gives every improved or tended hex in the borders of the city where it happens +1 food, +1 production for the rest of the game',
    ]);
    expect(said('theAgeOfImprovement')).toEqual([
      'what your other Orders pay on improved hexes is +100% more',
    ]);
    expect(said('theWaterCourts')).toEqual([
      'your farms joined to a farm on fresh water by a chain of your farms count as having fresh water',
    ]);
    expect(said('theComingOfTheWater')).toEqual([
      'completing an Aqueduct gives every hex with a Farm in the borders of the city where it happens +1 food for the rest of the game',
    ]);
    expect(said('theMountainTerraces')).toEqual([
      'your cities may work the mountains in their borders',
      '+1 production, +2 science on every mountain hex',
    ]);
  });
});

