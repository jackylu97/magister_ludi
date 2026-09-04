/**
 * The eleven charters (the user's ruling of 2026-09-04, `docs/flags.md` queue
 * item 6 — the sheet's proposed additions, second half).
 *
 * A charter is an Order that opens a **building** while it stands in a slot, and
 * the mechanism is the Gilded Court's (`cardUnlocksBuilding`). Two claims earn a
 * file rather than a paragraph in `statecraft.test.ts`:
 *
 *   1. **The charter half is one rule, eleven times.** The register below walks
 *      the rows themselves — every charter names a real building, every charter
 *      building is opened by exactly one charter, every one of them is shut
 *      again when the card leaves the spread — so a twelfth charter is a JSON
 *      row and a charter that opens nothing fails here.
 *   2. **The building half is nine different rules**, each landing in a
 *      different ledger: the hit points in `cityMaxHp`, the heal in
 *      `buildingAdjacentHeal`, the discount in `explainPurchaseCost`, the
 *      crowding in `explainHappiness`, the faith bank in `purchaseError`, the
 *      rite's culture in `performRiteAt`. One test each, carried to the ledger
 *      it touches — `statecraft.test.ts`' one-card-per-hook-family discipline at
 *      the scale of a building.
 *
 * The bench is `aiAppraisal.test.ts`' blank board rather than a generated map,
 * and for its reason: every claim here is about *one town on ground somebody
 * arranged*, and a mapgen retune would arrange it differently every time.
 */

import { describe, expect, it } from 'vitest';

import {
  type BuildingId,
  BUILDING_IDS,
  buildingDef,
  isBuildingId,
} from '../../src/sim/buildingData';
import {
  buildingAdjacentHeal,
  buildingCrowdingRelief,
  buildingPurchaseDiscount,
  buildingRitePay,
  cityIsWatered,
  foldBuildingCityStat,
} from '../../src/sim/buildingEffects';
import { cityMaxHp } from '../../src/sim/combat';
import {
  cityContext,
  explainGrowthPercent,
  explainTileYield,
  foldTileYield,
  foundCityAt,
  refreshCityDerived,
} from '../../src/sim/cities';
import { explainHappiness } from '../../src/sim/meters';
import { type Tile, createMap, getTileAt } from '../../src/sim/map';
import { explainPurchaseCost, purchaseError } from '../../src/sim/purchase';
import { performRiteAt } from '../../src/sim/religion';
import {
  cardCityYields,
  cardPercentYields,
  cardYieldConversions,
  cityScopeAdmits,
  foldCardYields,
} from '../../src/sim/statecraft';
import { type OrderId, ORDER_IDS, orderDef } from '../../src/sim/statecraftData';
import {
  type City,
  type GameState,
  createUnit,
  newGame,
  playerById,
} from '../../src/sim/state';
import { buildError, isUnlocked } from '../../src/sim/tech';
import { resetVisibility } from '../../src/sim/visibility';

// --- the bench --------------------------------------------------------------

/** A blank grassland board with two seats and nothing standing on it. */
function bench(): GameState {
  const width = 20;
  const height = 12;
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** The seat's capital, founded first, so `capitalCityOf` names it. */
function capitalOf(state: GameState, playerId = 0): City {
  return foundCityAt(state, playerId, at(state, 4, 5));
}

/** Slots a charter, growing the spread the way `statecraft.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
}

/** Takes every card back out of the spread. */
function clearSlots(state: GameState, playerId: number): void {
  playerById(state, playerId)!.statecraft.slots = [];
}

/** Raises buildings in a town the way a completed queue row would leave it. */
function raise(state: GameState, city: City, ...ids: BuildingId[]): void {
  city.buildings.push(...ids);
  refreshCityDerived(state, city);
}

/** Every charter row: the Order, and the building it opens. */
const CHARTERS: { order: OrderId; building: BuildingId }[] = ORDER_IDS.flatMap((id) =>
  orderDef(id)
    .effects.filter((effect) => effect.kind === 'unlocksBuilding')
    .map((effect) => ({ order: id, building: effect.building })),
);

/** The two rows a technology also names — opened *early* rather than only. */
const ALSO_ON_THE_TREE: readonly BuildingId[] = ['mint', 'observatory'];

// --- the register -----------------------------------------------------------

describe('the charters as a family', () => {
  it('ships eleven of them, each opening one real building row', () => {
    expect(CHARTERS.length).toBe(11);
    for (const { order, building } of CHARTERS) {
      expect(isBuildingId(building), `${order} → ${building}`).toBe(true);
      // A row a card opens must say so on its own row, or `isUnlocked` never
      // asks the cards at all and the building is buildable from turn one —
      // `unlockedByCard`'s original failure, and the one way a charter can be
      // written and be worth nothing.
      expect(buildingDef(building).unlockedByCard, building).toBe(true);
    }
  });

  it('opens each charter building from exactly one charter', () => {
    const opened = CHARTERS.map((entry) => entry.building);
    expect(new Set(opened).size).toBe(opened.length);
    // And every row carrying the marker is opened by one of them: a building
    // marked `unlockedByCard` that no card names is a row nobody can ever build.
    // The Gilded Hall's Court is a *doctrine*, so it is the one row named from
    // outside this list.
    for (const id of BUILDING_IDS) {
      if (buildingDef(id).unlockedByCard !== true || id === 'gildedHall') continue;
      expect(opened, id).toContain(id);
    }
  });

  it('marks every charter uncommon, in the pool its worksheet block named', () => {
    const pools: Record<string, string> = {
      ritesCharter: 'governmentI',
      vigilCharter: 'governmentI',
      scrivenersCharter: 'governmentII',
      coinCharter: 'governmentII',
      waterwrightsCharter: 'governmentII',
      theSenatus: 'governmentII',
      toolmakersCharter: 'governmentII',
      mintCharter: 'governmentIII',
      almshouseCharter: 'governmentIII',
      stargazersCharter: 'governmentIII',
      justicesCharter: 'governmentIII',
    };
    expect(Object.keys(pools).length).toBe(CHARTERS.length);
    for (const [id, pool] of Object.entries(pools)) {
      const def = orderDef(id as OrderId);
      expect(def.pool, id).toBe(pool);
      // ◆ on the worksheet. `statecraftDocSync` pins the two sides against each
      // other; this pins the user's own mark, so a silent retune shows here too.
      expect(def.rarity, id).toBe('uncommon');
      expect(def.retired, id).not.toBe(true);
    }
  });

  it('opens its building only while slotted, and shuts again when it comes out', () => {
    const state = bench();
    for (const { order, building } of CHARTERS) {
      clearSlots(state, 0);
      expect(isUnlocked(state, 0, 'building', building), `${building} before`).toBe(false);
      slot(state, 0, order);
      expect(isUnlocked(state, 0, 'building', building), `${building} slotted`).toBe(true);
    }
    clearSlots(state, 0);
    for (const { building } of CHARTERS) {
      expect(isUnlocked(state, 0, 'building', building), `${building} after`).toBe(false);
    }
  });

  it('leaves a copy already raised standing when the charter is unslotted', () => {
    const state = bench();
    const city = capitalOf(state);
    slot(state, 0, 'ritesCharter');
    expect(buildError(state, 0, 'building', 'chapel', city)).toBeNull();
    raise(state, city, 'chapel');
    clearSlots(state, 0);
    // The town keeps it and it keeps paying — only *raising another* is refused.
    expect(city.buildings).toContain('chapel');
    expect(buildingRitePay(city)).toBe(5);
    // And the refusal sends the player to the **deck**, not to the tree: nine of
    // the eleven stand on no node at all, so "needs a technology" would be false.
    expect(buildError(state, 0, 'building', 'chapel', city)).toContain('in one of your slots');
    // The two that stand on a node as well name both ways in.
    expect(buildError(state, 0, 'building', 'mint', city)).toContain('Paper Money');
    expect(buildError(state, 0, 'building', 'mint', city)).toContain('in one of your slots');
  });

  it('opens the Mint and the Observatory early without closing their technologies', () => {
    // The one decision in the batch worth its own pin (see `docs/orders-and-
    // doctrines.md`): rather than ship a second row called "Mint", the charter
    // opens the row the tree already names. So the card is a way in **early**,
    // and the node still opens it in its own age.
    const state = bench();
    const player = playerById(state, 0)!;
    for (const building of ALSO_ON_THE_TREE) {
      expect(isUnlocked(state, 0, 'building', building)).toBe(false);
    }
    slot(state, 0, 'mintCharter');
    expect(isUnlocked(state, 0, 'building', 'mint')).toBe(true);
    clearSlots(state, 0);
    expect(isUnlocked(state, 0, 'building', 'mint')).toBe(false);
    player.techsResearched.push('paperMoney');
    expect(isUnlocked(state, 0, 'building', 'mint')).toBe(true);
    // The Gilded Hall is the row no node names: nothing falls through for it.
    expect(isUnlocked(state, 0, 'building', 'gildedHall')).toBe(false);
  });
});

// --- the buildings ----------------------------------------------------------

describe('what each charter building does', () => {
  it('Chapel — a rite performed in the town pays its empire culture', () => {
    const bare = bench();
    const plainCity = capitalOf(bare);
    const plainSeat = playerById(bare, 0)!;
    plainSeat.culturePool = 0;
    const plainAugur = createUnit(bare, 0, 'augur', plainCity.col, plainCity.row);
    performRiteAt(bare, plainSeat, plainAugur, 'omenReading', {
      col: plainCity.col,
      row: plainCity.row,
    });
    const plain = plainSeat.culturePool;

    const state = bench();
    const city = capitalOf(state);
    const seat = playerById(state, 0)!;
    raise(state, city, 'chapel');
    seat.culturePool = 0;
    const augur = createUnit(state, 0, 'augur', city.col, city.row);
    const done = performRiteAt(state, seat, augur, 'omenReading', {
      col: city.col,
      row: city.row,
    });
    expect(buildingRitePay(city)).toBe(5);
    // It says so in the rite's own report, folded into the one grant list.
    expect(done.grants).toContainEqual({ label: 'Culture', amount: 5 });
    // And it is on top of whatever the rite itself paid, not instead of it.
    expect(seat.culturePool).toBe(plain + 5);
  });

  it('Chapel — pays nothing for a rite said somewhere else', () => {
    const state = bench();
    const city = capitalOf(state);
    const seat = playerById(state, 0)!;
    raise(state, city, 'chapel');
    seat.culturePool = 0;
    // Four hexes out: the augur is standing in no town and blessing none.
    const away = at(state, 12, 5);
    const augur = createUnit(state, 0, 'augur', away.col, away.row);
    performRiteAt(state, seat, augur, 'blessingOfArms', { col: away.col, row: away.row });
    expect(seat.culturePool).toBe(0);
  });

  it('Keep — the walls hold longer, and friends beside them mend faster', () => {
    const state = bench();
    const city = capitalOf(state);
    const before = cityMaxHp(city);
    raise(state, city, 'keep');
    expect(cityMaxHp(city)).toBe(before + 25);
    // The heal is a list, like everything else `buildingEffects.ts` answers, so
    // a wounded column can be told which walls mended it.
    expect(buildingAdjacentHeal(city)).toEqual([{ source: 'Keep', amount: 5 }]);
    expect(foldBuildingCityStat(buildingAdjacentHeal(city))).toBe(5);
  });

  it('Scriptorium — flat beakers always, the share only with an academy in the borders', () => {
    const state = bench();
    const city = capitalOf(state);
    raise(state, city, 'scriptorium');
    expect(buildingDef('scriptorium').science).toBe(2);
    // No academy anywhere: the clause is written and lands nowhere.
    const dry = cardPercentYields(state, city).filter((line) => line.source.includes('Scriptorium'));
    expect(dry).toEqual([]);
    // One inside the borders, and it lands. `hasImprovement` sweeps `ownedTiles`,
    // so this is the town's own ground and not its neighbour's.
    at(state, 4, 5).improvement = 'academy';
    refreshCityDerived(state, city);
    const line = cardPercentYields(state, city).find((entry) => entry.source.includes('Scriptorium'));
    expect(line?.yield).toBe('science');
    expect(line?.percent).toBe(10);
  });

  it('Assay House — the town’s purchases cost less, in the price’s own lines', () => {
    const state = bench();
    const city = capitalOf(state);
    playerById(state, 0)!.gold = 10000;
    const item = { kind: 'unit', id: 'warrior' } as const;
    const list = explainPurchaseCost(state, 0, city.id, item, 'gold')!;
    raise(state, city, 'assayHouse');
    expect(buildingPurchaseDiscount(city)).toEqual([{ source: 'Assay House', amount: -5 }]);
    const cheaper = explainPurchaseCost(state, 0, city.id, item, 'gold')!;
    // The discount is a **line** of the list, so the fold is still the price.
    expect(cheaper.total).toBe(cheaper.lines.reduce((sum, line) => sum + line.amount, 0));
    expect(cheaper.total).toBeLessThan(list.total);
    expect(cheaper.lines[cheaper.lines.length - 1]!.source).toContain('Assay House');
    // And it is a fact about the *town*: the seat's other city pays list price.
    const other = foundCityAt(state, 0, at(state, 10, 5));
    expect(explainPurchaseCost(state, 0, other.id, item, 'gold')!.total).toBe(list.total);
    // The row's own words are "with gold", so the faith bank is untouched: an
    // augur called out of the pool never passes the assayers.
    const augur = { kind: 'unit', id: 'augur' } as const;
    const faith = explainPurchaseCost(state, 0, city.id, augur, 'faith')!;
    expect(faith.lines.some((line) => line.source.includes('Assay House'))).toBe(false);
  });

  it('Cistern — the town counts as watered, and its desert feeds it', () => {
    const state = bench();
    // Founded off fresh water, on a flat board with no rivers, so the dry-settle
    // line is there to be lifted.
    const city = capitalOf(state);
    expect(cityIsWatered(city)).toBe(false);
    expect(explainGrowthPercent(state, city).some((line) => line.source === 'No fresh water'))
      .toBe(true);
    raise(state, city, 'cistern');
    expect(cityIsWatered(city)).toBe(true);
    expect(explainGrowthPercent(state, city).some((line) => line.source === 'No fresh water'))
      .toBe(false);
    // And the ground: a desert hex the town works pays one more food, through
    // the tile chain a building's `tileYields` land in.
    const desert = at(state, 5, 5);
    desert.terrain = 'desert';
    const withOne = foldTileYield(explainTileYield(desert, cityContext(state, city))).food;
    city.buildings.length = 0;
    refreshCityDerived(state, city);
    const without = foldTileYield(explainTileYield(desert, cityContext(state, city))).food;
    expect(withOne).toBe(without + 1);
  });

  it('Cistern — ships the farms half struck through, not bent', () => {
    // The one deferral of the batch, and it is on the row in the player's own
    // words: what waters a *town* and what waters a *hex* are two questions, and
    // only the town's is answered.
    expect(buildingDef('cistern').deferred?.length).toBe(1);
    expect(buildingDef('cistern').deferred![0]).toMatch(/irrigation|water/i);
  });

  it('Assembly Hall — one helping per wildcard Order in the spread', () => {
    const state = bench();
    const city = capitalOf(state);
    slot(state, 0, 'theSenatus');
    expect(buildError(state, 0, 'building', 'assemblyHall', city)).toBeNull();
    raise(state, city, 'assemblyHall');
    // The Senatus is itself a wildcard Order, so the floor is one helping —
    // exactly as every other deck-reader's is.
    const one = foldCardYields(cardCityYields(state, city));
    expect(one.science).toBe(1);
    expect(one.culture).toBe(1);
    slot(state, 0, 'almshouseCharter');
    const two = foldCardYields(cardCityYields(state, city));
    expect(two.science).toBe(2);
    expect(two.culture).toBe(2);
    // A military Order is not a wildcard one — the card's own slot flavour,
    // never the chair it sits in.
    slot(state, 0, 'vigilCharter');
    expect(foldCardYields(cardCityYields(state, city)).science).toBe(2);
  });

  it('Assembly Hall — refuses a town that is not the seat of government', () => {
    const state = bench();
    capitalOf(state);
    slot(state, 0, 'theSenatus');
    const second = foundCityAt(state, 0, at(state, 10, 5));
    expect(cityScopeAdmits(state, second, { test: 'capital' })).toBe(false);
    // The refusal names the *place*, not the flag.
    expect(buildError(state, 0, 'building', 'assemblyHall', second)).toContain(
      'seat of your government',
    );
  });

  it('Smithy — one hammer per military Order in the spread', () => {
    const state = bench();
    const city = capitalOf(state);
    raise(state, city, 'smithy');
    slot(state, 0, 'vigilCharter');
    expect(foldCardYields(cardCityYields(state, city)).production).toBe(1);
    slot(state, 0, 'justicesCharter');
    expect(foldCardYields(cardCityYields(state, city)).production).toBe(2);
    slot(state, 0, 'ritesCharter');
    expect(foldCardYields(cardCityYields(state, city)).production).toBe(2);
  });

  it('The Mint Charter — a Mint town pays a tenth of its gold again as culture', () => {
    const state = bench();
    const city = capitalOf(state);
    const other = foundCityAt(state, 0, at(state, 10, 5));
    slot(state, 0, 'mintCharter');
    raise(state, city, 'mint');
    const flats = { food: 0, production: 0, gold: 40, science: 0, culture: 0, faith: 0 };
    expect(foldCardYields(cardYieldConversions(state, city, flats)).culture).toBe(4);
    // Scoped to the town holding one, so the seat's other city is paid nothing.
    expect(foldCardYields(cardYieldConversions(state, other, flats)).culture).toBe(0);
  });

  it('Almshouse — the faith bank opens for civilians and stays shut for soldiers', () => {
    const state = bench();
    const city = capitalOf(state);
    playerById(state, 0)!.faithPool = 10000;
    const worker = { kind: 'unit', id: 'worker' } as const;
    const warrior = { kind: 'unit', id: 'warrior' } as const;
    expect(purchaseError(state, 0, city.id, worker, 'faith')).toContain('bought with gold');
    raise(state, city, 'almshouse');
    expect(buildingDef('almshouse').faithPurchases).toBe('civilian');
    expect(purchaseError(state, 0, city.id, worker, 'faith')).toBeNull();
    // The soldier is still a gold purchase: the word on the row is the whole of
    // the narrowing, and it is the roster's own `isCivilian`.
    expect(purchaseError(state, 0, city.id, warrior, 'faith')).toContain('bought with gold');
    // The Reliquary's word is the wider one and sells both.
    raise(state, city, 'reliquary');
    expect(purchaseError(state, 0, city.id, warrior, 'faith')).toBeNull();
  });

  it('The Stargazers’ Charter — beakers for an Observatory, more with a peak within two hexes', () => {
    const state = bench();
    const city = capitalOf(state);
    slot(state, 0, 'stargazersCharter');
    raise(state, city, 'observatory');
    expect(foldCardYields(cardCityYields(state, city)).science).toBe(1);
    // The radius is the row's own number, and the default is still the ring of
    // six every clause written before it reads — so both are checked on one
    // board. A peak two hexes out admits the charter's clause and not `beside`.
    expect(cityScopeAdmits(state, city, { test: 'mountainAdjacent', radius: 2 })).toBe(false);
    at(state, 6, 5).terrain = 'mountain';
    expect(cityScopeAdmits(state, city, { test: 'mountainAdjacent', radius: 2 })).toBe(true);
    expect(cityScopeAdmits(state, city, { test: 'mountainAdjacent' })).toBe(false);
    const line = cardPercentYields(state, city).find((entry) =>
      entry.source.includes('Stargazers'),
    );
    expect(line?.yield).toBe('science');
    expect(line?.percent).toBe(10);
  });

  it('Assize Court — forgives a share of its own town’s crowding, as a gain line', () => {
    const state = bench();
    const city = capitalOf(state);
    city.population = 20;
    refreshCityDerived(state, city);
    const crowded = explainHappiness(state, 0).find(
      (line) => line.source === `${city.name} crowding`,
    )!;
    expect(crowded.value).toBeLessThan(0);
    raise(state, city, 'assizeCourt');
    expect(buildingCrowdingRelief(city)).toBe(15);
    const relief = explainHappiness(state, 0).find((line) =>
      line.source.includes('the justices sit'),
    )!;
    // A gain against the full cost, so the ledger still prints what the town
    // asked for beside what the court took off it.
    expect(relief.part).toBe('gain');
    expect(relief.value).toBeCloseTo(-crowded.value * 0.15, 6);
    // The crowding line itself is untouched — nothing is quietly made smaller.
    const after = explainHappiness(state, 0).find(
      (line) => line.source === `${city.name} crowding`,
    )!;
    expect(after.value).toBe(crowded.value);
  });
});
