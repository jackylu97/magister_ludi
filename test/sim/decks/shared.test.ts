/**
 * **Batch S: the shared cards between two approved decks** (`docs/plans/
 * deck-implementation.md`). Every shared card whose two decks are among
 * Commerce, Dominion, Expansionist and Devotion is in `data/decks/common.json`,
 * and the new shapes the batch added are pinned here by what they do:
 *
 *   · a strength line counted on the treasury (War Bonds, `bankedGold`);
 *   · a `beside` condition that counts pieces that do not fight, and a unit
 *     filter for religious units (The Oriflamme; it also fixed The Escorted
 *     Roads' ship line, which never paid);
 *   · a strength line on ground that does not follow your religion (The
 *     Crusader Orders, `notFollowingTerritory`);
 *   · a city scope for "follows (or does not follow) its owner's religion"
 *     (Convert It or Tax It, `ownersFaith`);
 *   · a windfall occasion for laying down an improvement, with a filter naming
 *     the improvement (The Flood Festival, `improvementBuilt`);
 *   · a rule that claims a cleared camp's ground (The Barbarian Frontier,
 *     `campClaimsGround`);
 *   · a purchase that requires a building, and a charter's gold-only unit
 *     (The Chartered Company's Company Guard).
 *
 * The rest reuse shapes the deck batches built, and are pinned more lightly.
 */

import { describe, expect, it } from 'vitest';

import { claimClearedCampGround } from '../../../src/sim/camps';
import { foundCityAt } from '../../../src/sim/cities';
import { type Game, createGame } from '../../../src/sim/game';
import { buildImprovementAt } from '../../../src/sim/improvements';
import {
  type Tile,
  getTileAt,
  mapRange,
  neighborTiles,
  tileHex,
  tileIndex,
  wrappedDistance,
} from '../../../src/sim/map';
import { isPassable } from '../../../src/sim/pathfind';
import { purchaseError, purchaseItemAt } from '../../../src/sim/purchase';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  type CombatSituation,
  cardCityCostDelta,
  cardCityStat,
  cardCombatLines,
  explainCardCityYields,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { DECK_FILE_ORDERS, type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { TECH_IDS } from '../../../src/sim/techData';
import { buildError, isUnlocked } from '../../../src/sim/tech';
import { unitStampStrength } from '../../../src/sim/unitData';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';

function duel(seed = 11): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ana', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

/** Seat 0's first town, on the tile its first unit stands on. */
function capital(g: Game): City {
  const unit = g.state.units.find((u) => u.ownerId === 0)!;
  const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!);
  bumpRevision(g.state);
  return city;
}

/** Walks every piece off the town's own hex, so the counter may sell a unit there. */
function clearTown(state: GameState, city: City): void {
  const centre = getTileAt(state.map, city.col, city.row)!;
  const aside = neighborTiles(state.map, tileHex(centre)).find((tile) => isPassable(tile))!;
  for (const unit of state.units) {
    if (unit.col !== city.col || unit.row !== city.row) continue;
    unit.col = aside.col;
    unit.row = aside.row;
  }
  bumpRevision(state);
}

/** A passable, unowned tile exactly `distance` hexes from `from`. */
function landAt(state: GameState, from: City, distance: number): Tile {
  const centre = getTileAt(state.map, from.col, from.row)!;
  const tile = mapRange(state.map, tileHex(centre), distance).find(
    (one) =>
      wrappedDistance(state.map, tileHex(centre), tileHex(one)) === distance &&
      isPassable(one) &&
      state.tileOwner[tileIndex(state.map, one.col, one.row)] === null,
  );
  expect(tile, `no free land ${distance} hexes out`).toBeDefined();
  return tile!;
}

/** Seats these cards for seat 0, each in a chair of its own. */
function seat(state: GameState, ids: readonly string[]): void {
  const player = playerById(state, 0)!;
  player.statecraft.orders = [...(ids as OrderId[])];
  player.statecraft.slots = ids.map((card) => ({ card: card as OrderId, sealedUntil: 0 }));
  bumpRevision(state);
}

/** A religion founded by seat 0, its holy site on `city`'s own hex. */
function foundReligion(state: GameState, city: City): number {
  getTileAt(state.map, city.col, city.row)!.improvement = 'holySite' as never;
  state.religions.push({
    id: state.religions.length,
    founderId: 0,
    name: 'The Testament',
    pantheon: [],
    follower: [],
    enhancer: [],
    foundedTurn: state.turn,
    holySite: { col: city.col, row: city.row },
  } as never);
  const religion = state.religions.length - 1;
  city.followers = { [religion]: city.population };
  bumpRevision(state);
  return religion;
}

function fight(unit: Unit, tile: Tile): CombatSituation {
  return {
    unit,
    side: 'attack',
    tile,
    vsBarbarians: false,
    vsCity: false,
    targetHp: 100,
    targetMaxHp: 100,
  };
}

function strength(state: GameState, situation: CombatSituation, card: string): number {
  return cardCombatLines(state, situation)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.amount, 0);
}

// --- the shelf ---------------------------------------------------------------

describe('the shared cards of the four approved decks', () => {
  const COMMON = DECK_FILE_ORDERS.common;

  it('keeps every shared row in the shared file under its old id', () => {
    const live = [
      'theHolyArmy',
      'commonRitesOfPassage',
      'theSacredHost',
      'theCrusaderOrders',
      'theBarbarianFrontier',
      'theOriflamme',
      'theFloodFestival',
      'theRoadGarrisons',
      'convertItOrTaxIt',
      'warBonds',
      'professionalSoldiers',
      'theCharteredCompany',
      'lettersOfMarque',
      'commonTheTithe',
    ];
    for (const id of live) {
      expect(COMMON, id).toContain(id);
      expect(orderDef(id as OrderId).decks, id).toHaveLength(2);
      expect(orderIsDealt(id as OrderId), `${id} is not dealt`).toBe(true);
    }
    // The Holy Army moved out of the Devotion file, keeping its id.
    expect(DECK_FILE_ORDERS.devotion).not.toContain('theHolyArmy');
    expect(orderDef('theHolyArmy' as OrderId).decks).toEqual(['dominion', 'devotion']);
  });

  it('retires the two shared cuts and defers Mercenary Contracts with its reason', () => {
    for (const id of ['frontierGarrisons', 'harvestOfferings']) {
      expect(orderDef(id as OrderId).retired, id).toBe(true);
      expect(orderIsDealt(id as OrderId), id).toBe(false);
    }
    const hire = orderDef('mercenaryContracts' as OrderId);
    expect(hire.deferred?.length).toBeGreaterThan(0);
    expect(hire.note).toMatch(/^Not built yet/);
    expect(orderIsDealt('mercenaryContracts' as OrderId)).toBe(false);
  });

  it('turns the two purchase discounts into gold, ruling (qqqqqq) 1', () => {
    for (const id of ['lettersOfMarque', 'commonTheTithe']) {
      const kinds = orderDef(id as OrderId).effects.map((effect) => effect.kind);
      expect(kinds, id).not.toContain('purchaseRider');
      expect(kinds, id).toContain('percentYields');
    }
  });
});

// --- strength ----------------------------------------------------------------

describe('War Bonds: strength counted on the treasury', () => {
  it('pays one point a hundred and fifty gold, up to five', () => {
    const g = duel();
    const city = capital(g);
    seat(g.state, ['warBonds']);
    const soldier = createUnit(g.state, 0, 'warrior' as never, city.col, city.row);
    const here = fight(soldier, getTileAt(g.state.map, city.col, city.row)!);
    const player = playerById(g.state, 0)!;
    player.gold = 100;
    bumpRevision(g.state);
    expect(strength(g.state, here, 'warBonds')).toBe(0);
    player.gold = 300;
    bumpRevision(g.state);
    expect(strength(g.state, here, 'warBonds')).toBe(2);
    player.gold = 100_000;
    bumpRevision(g.state);
    expect(strength(g.state, here, 'warBonds')).toBe(5);
  });
});

describe('The Oriflamme: strength beside a religious unit', () => {
  it('pays a soldier beside an apostle, and nothing without one', () => {
    const g = duel();
    const city = capital(g);
    seat(g.state, ['theOriflamme']);
    const centre = getTileAt(g.state.map, city.col, city.row)!;
    const soldier = createUnit(g.state, 0, 'warrior' as never, city.col, city.row);
    const here = fight(soldier, centre);
    expect(strength(g.state, here, 'theOriflamme')).toBe(0);
    const next = neighborTiles(g.state.map, tileHex(centre)).find((tile) => isPassable(tile))!;
    createUnit(g.state, 0, 'apostle' as never, next.col, next.row);
    bumpRevision(g.state);
    expect(strength(g.state, here, 'theOriflamme')).toBe(4);
  });

  it('also lights The Escorted Roads’ ship line, which counted only fighters before', () => {
    const g = duel();
    capital(g);
    seat(g.state, ['commonTheEscortedRoads']);
    const sea = g.state.map.tiles.find(
      (tile) => !isPassable(tile) && neighborTiles(g.state.map, tileHex(tile)).some((n) => isPassable(n)),
    )!;
    const shore = neighborTiles(g.state.map, tileHex(sea)).find((n) => isPassable(n))!;
    const ship = createUnit(g.state, 0, 'trireme' as never, sea.col, sea.row);
    createUnit(g.state, 0, 'trader' as never, shore.col, shore.row);
    bumpRevision(g.state);
    expect(strength(g.state, fight(ship, sea), 'commonTheEscortedRoads')).toBe(2);
  });
});

describe('The Crusader Orders', () => {
  it('fights harder on ground that does not follow your religion', () => {
    const g = duel();
    const home = capital(g);
    const religion = foundReligion(g.state, home);
    const far = foundCityAt(g.state, 0, landAt(g.state, home, 5));
    seat(g.state, ['theCrusaderOrders']);
    const ground = getTileAt(g.state.map, far.col, far.row)!;
    const soldier = createUnit(g.state, 0, 'warrior' as never, far.col, far.row);
    far.followers = {};
    bumpRevision(g.state);
    expect(strength(g.state, fight(soldier, ground), 'theCrusaderOrders')).toBe(3);
    far.followers = { [religion]: far.population };
    bumpRevision(g.state);
    expect(strength(g.state, fight(soldier, ground), 'theCrusaderOrders')).toBe(0);
  });

  it('presses your religion on a city you capture, and only on that city', () => {
    const g = duel();
    capital(g);
    seat(g.state, ['theCrusaderOrders']);
    const payout = windfallPayout(g.state, 0, 'capture');
    expect(payout.pressure.map((lump) => [lump.amount, lump.range])).toEqual([[30, 0]]);
  });
});

// --- towns -------------------------------------------------------------------

describe('Convert It or Tax It: the owner’s religion, asked of a captured town', () => {
  it('taxes a captured town of another faith and relieves one of yours', () => {
    const g = duel();
    const home = capital(g);
    const religion = foundReligion(g.state, home);
    const taken = foundCityAt(g.state, 0, landAt(g.state, home, 5));
    taken.captured = true;
    seat(g.state, ['convertItOrTaxIt']);
    const paid = (): number[] => {
      const lines = explainCardCityYields(g.state, taken).filter((line) => line.card === 'convertItOrTaxIt');
      return [lines.reduce((s, l) => s + l.gold, 0), lines.reduce((s, l) => s + l.faith, 0)];
    };
    taken.followers = {};
    bumpRevision(g.state);
    expect(paid()).toEqual([3, 2]);
    expect(cardCityCostDelta(g.state, taken)).toBe(0);
    taken.followers = { [religion]: taken.population };
    bumpRevision(g.state);
    expect(paid()).toEqual([0, 0]);
    expect(cardCityCostDelta(g.state, taken)).toBe(-1);
    // A town the empire founded itself is not captured and is paid nothing.
    expect(explainCardCityYields(g.state, home).filter((l) => l.card === 'convertItOrTaxIt')).toEqual([]);
  });
});

describe('The Road Garrisons', () => {
  it('feeds and walls a garrisoned town joined to the capital by road', () => {
    const g = duel();
    const home = capital(g);
    const town = foundCityAt(g.state, 0, landAt(g.state, home, 4));
    const centre = getTileAt(g.state.map, home.col, home.row)!;
    for (const tile of mapRange(g.state.map, tileHex(centre), 6)) if (isPassable(tile)) tile.road = 0;
    seat(g.state, ['theRoadGarrisons']);
    const food = (): number =>
      explainCardCityYields(g.state, town)
        .filter((line) => line.card === 'theRoadGarrisons')
        .reduce((sum, line) => sum + line.food, 0);
    const walls = (): number =>
      cardCityStat(g.state, town, 'defense')
        .filter((line) => line.card === 'theRoadGarrisons')
        .reduce((sum, line) => sum + line.amount, 0);
    expect([food(), walls()]).toEqual([0, 0]);
    createUnit(g.state, 0, 'warrior' as never, town.col, town.row);
    bumpRevision(g.state);
    expect([food(), walls()]).toEqual([3, 5]);
  });
});

describe('The Holy Army: a holy site and a citadel side by side', () => {
  it('pays both hexes, and neither alone', () => {
    const g = duel();
    const home = capital(g);
    seat(g.state, ['theHolyArmy']);
    const centre = getTileAt(g.state.map, home.col, home.row)!;
    const ring = neighborTiles(g.state.map, tileHex(centre)).filter((tile) => isPassable(tile));
    const site = ring[0]!;
    const fort = ring.find(
      (tile) => tile !== site && wrappedDistance(g.state.map, tileHex(site), tileHex(tile)) === 1,
    )!;
    const pays = (tile: Tile): number[] => {
      const lines = explainTileYield(tile, yieldContextFor(g.state, 0)).filter(
        (line) => line.card === 'theHolyArmy',
      );
      return [lines.reduce((s, l) => s + l.faith, 0), lines.reduce((s, l) => s + l.culture, 0)];
    };
    site.improvement = 'holySite' as never;
    bumpRevision(g.state);
    expect(pays(site)).toEqual([0, 0]);
    fort.improvement = 'citadel' as never;
    bumpRevision(g.state);
    expect(pays(site)).toEqual([2, 2]);
    expect(pays(fort)).toEqual([2, 2]);
  });
});

// --- occasions ---------------------------------------------------------------

describe('Rites of Passage and The Sacred Host', () => {
  it('pays faith for a soldier completed, bought ones included, and not for a settler', () => {
    const g = duel();
    const city = capital(g);
    seat(g.state, ['commonRitesOfPassage']);
    expect(windfallPayout(g.state, 0, 'unitCompletion', 0, 0, { actor: 'warrior' as never }).grants).toEqual([
      expect.objectContaining({ yield: 'faith', amount: 12 }),
    ]);
    expect(windfallPayout(g.state, 0, 'unitCompletion', 0, 0, { actor: 'settler' as never }).grants).toEqual([]);
    // End to end: the completion seam now hands the unit's type down.
    const player = playerById(g.state, 0)!;
    player.gold = 10_000;
    clearTown(g.state, city);
    const before = player.faithPool;
    purchaseItemAt(g.state, player, city, { kind: 'unit', id: 'warrior' as never }, 'gold');
    expect(player.faithPool - before).toBe(12);
  });

  it('opens faith purchases of soldiers in Temple towns, and pays faith for a kill', () => {
    const g = duel();
    const city = capital(g);
    seat(g.state, ['theSacredHost']);
    const player = playerById(g.state, 0)!;
    player.faithPool = 10_000;
    clearTown(g.state, city);
    const ask = (): string | null =>
      purchaseError(g.state, 0, city.id, { kind: 'unit', id: 'warrior' }, 'faith');
    expect(ask()).not.toBeNull();
    city.buildings.push('temple' as never);
    bumpRevision(g.state);
    expect(ask()).toBeNull();
    expect(windfallPayout(g.state, 0, 'kill').grants).toEqual([
      expect.objectContaining({ yield: 'faith', amount: 10 }),
    ]);
  });
});

describe('The Flood Festival: faith for each hex of burned country', () => {
  it('pays when a worker lays burned country down, and not for a farm', () => {
    const g = duel();
    const city = capital(g);
    seat(g.state, ['theFloodFestival']);
    const centre = getTileAt(g.state.map, city.col, city.row)!;
    const [first, second] = neighborTiles(g.state.map, tileHex(centre)).filter((tile) => isPassable(tile));
    const player = playerById(g.state, 0)!;
    const before = player.faithPool;
    const worker = createUnit(g.state, 0, 'worker' as never, first!.col, first!.row);
    buildImprovementAt(g.state, worker, first!, 'burnedCountry' as never);
    expect(player.faithPool - before).toBe(5);
    const other = createUnit(g.state, 0, 'worker' as never, second!.col, second!.row);
    buildImprovementAt(g.state, other, second!, 'farm' as never);
    expect(player.faithPool - before).toBe(5);
  });
});

describe('The Barbarian Frontier: a cleared camp’s ground', () => {
  it('claims the camp and its unowned ring for a town within five hexes', () => {
    const g = duel();
    const home = capital(g);
    const camp = landAt(g.state, home, 5);
    expect(claimClearedCampGround(g.state, 0, camp)).toBeNull();
    seat(g.state, ['theBarbarianFrontier']);
    expect(claimClearedCampGround(g.state, 0, camp)?.id).toBe(home.id);
    for (const tile of mapRange(g.state.map, tileHex(camp), 1)) {
      expect(g.state.tileOwner[tileIndex(g.state.map, tile.col, tile.row)], `${tile.col},${tile.row}`).toBe(
        home.id,
      );
    }
  });

  it('claims nothing for a camp further than five hexes from every town', () => {
    const g = duel();
    const home = capital(g);
    seat(g.state, ['theBarbarianFrontier']);
    const camp = landAt(g.state, home, 7);
    expect(claimClearedCampGround(g.state, 0, camp)).toBeNull();
    expect(g.state.tileOwner[tileIndex(g.state.map, camp.col, camp.row)]).toBeNull();
  });
});

// --- units -------------------------------------------------------------------

describe('Professional Soldiers', () => {
  it('stamps three points on a bought unit and none on a built one', () => {
    const g = duel();
    const city = capital(g);
    seat(g.state, ['professionalSoldiers']);
    const bought = createUnit(g.state, 0, 'warrior' as never, city.col, city.row, undefined, undefined, 'gold');
    const built = createUnit(g.state, 0, 'warrior' as never, city.col, city.row);
    expect(unitStampStrength(bought)).toBe(3);
    expect(unitStampStrength(built)).toBe(0);
  });
});

describe('The Chartered Company: the Company Guard', () => {
  it('opens the unit from its column, for gold only, in a town with a Barracks', () => {
    const g = duel();
    const city = capital(g);
    const player = playerById(g.state, 0)!;
    player.techsResearched = [...TECH_IDS];
    player.gold = 100_000;
    clearTown(g.state, city);
    expect(isUnlocked(g.state, 0, 'unit', 'companyGuard')).toBe(false);
    // A charter sits in the collection and takes no chair.
    player.statecraft.orders = ['theCharteredCompany' as OrderId];
    bumpRevision(g.state);
    expect(isUnlocked(g.state, 0, 'unit', 'companyGuard')).toBe(true);
    const ask = (currency: string): string | null =>
      purchaseError(g.state, 0, city.id, { kind: 'unit', id: 'companyGuard' }, currency);
    expect(ask('gold')).toMatch(/Barracks/);
    city.buildings.push('barracks' as never);
    bumpRevision(g.state);
    expect(ask('gold')).toBeNull();
    expect(ask('faith')).not.toBeNull();
    // Never trained.
    expect(buildError(g.state, 0, 'unit', 'companyGuard', city)).not.toBeNull();
  });
});
