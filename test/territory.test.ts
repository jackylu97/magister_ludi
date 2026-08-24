import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../src/sim/commands';
import {
  borderCostFor,
  borderGrowth,
  collectYields,
  expandBorders,
  explainTilePurchase,
  foldTilePrice,
  foundCityAt,
  gameProgress,
  nextBorderCost,
  purchasableTiles,
  ringOf,
  tilePurchaseError,
  tilePurchasePrice,
} from '../src/sim/cities';
import { createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../src/sim/game';
import {
  type GameMap,
  type Tile,
  createMap,
  getTileAt,
  neighborTiles,
  tileHex,
  tileIndex,
} from '../src/sim/map';
import {
  authorityOf,
  borderFactor,
  borderFreezePercent,
  bordersFrozen,
  meterEffects,
  tierPercent,
} from '../src/sim/meters';
import { RULES } from '../src/sim/rulesData';
import { type City, type GameState, newGame } from '../src/sim/state';
import { TECH_IDS } from '../src/sim/techData';
import { runEndOfTurn } from '../src/sim/turn';
import { resetVisibility } from '../src/sim/visibility';

const CITIES = RULES.cities;
const BUY = CITIES.tilePurchase;
const WRIT = RULES.meters.authority;

/**
 * Territory & gold (playable.md item 2): **authority owns land**.
 *
 * Two halves that answer to one meter. Culture creeps a city's borders outward
 * on Civ 6's cost curve, sped by a solvent writ and frozen outright by an
 * overdrawn one; gold buys a frontier tile outright, at a price the same freeze
 * bars and the same luxuries discount.
 *
 * Everything is asserted against `data/rules.json` rather than against the
 * numbers in it today — `BUY.perPriorPurchase`, not `5` — with two deliberate
 * exceptions, both of them tuning claims the design signed off on and would want
 * to hear about if they moved: the four opening rungs of the cost curve, and the
 * monument band.
 */

/** A two-player state on blank grassland, quiet and unowned. */
function flatState(width = 20, height = 14): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/**
 * Spends authority until the empire's writ reads exactly `target`.
 *
 * Done by planting throwaway cities on the far side of the board rather than by
 * writing a number anywhere: authority is a pure function of the board (see the
 * `meters.ts` docblock), so the only honest way to put an empire in deficit is
 * to over-extend it. Each extra city costs `foundedCity`.
 */
function overextendTo(state: GameState, playerId: number, target: number): void {
  const planted: City[] = [];
  let row = 1;
  while (authorityOf(state, playerId) > target) {
    planted.push(foundCityAt(state, playerId, at(state.map, state.map.width - 2, row)));
    row += 3;
    if (row >= state.map.height) throw new Error('ran out of board to over-extend on');
  }
  // A city costs 2 and a monument supplies 1, so the cities alone can overshoot
  // the target by one. Trimming with monuments is the same board-only lever.
  for (const town of planted) {
    if (authorityOf(state, playerId) >= target) break;
    town.buildings.push('monument');
  }
  expect(authorityOf(state, playerId)).toBe(target);
}

/**
 * The undiscounted asking price for a ring, worked out from `rules.json` — the
 * ring's base scaled by this player's progress and rounded, with no escalation
 * and no luxuries. The formula the evaluator is checked against, written once.
 */
function ringPrice(state: GameState, playerId: number, ring: number): number {
  const base = BUY.ringBase[Math.min(ring, BUY.ringBase.length - 1)]!;
  const scaled = base * (1 + BUY.progressFactor * gameProgress(state, playerId));
  return Math.round(scaled / BUY.roundTo) * BUY.roundTo;
}

// --- A. the culture curve ---------------------------------------------------

describe('the border cost curve', () => {
  it('is Civ 6 shaped: base + mult · n ^ exp, floored, and strictly rising', () => {
    for (const claimed of [0, 1, 2, 3, 7, 15]) {
      expect(nextBorderCost(claimed)).toBe(
        Math.floor(
          CITIES.borderCostBase + CITIES.borderCostLinear * claimed ** CITIES.borderCostExponent,
        ),
      );
    }
    for (let claimed = 0; claimed < 20; claimed++) {
      expect(nextBorderCost(claimed + 1)).toBeGreaterThan(nextBorderCost(claimed));
    }
  });

  it('opens on the rungs the monument band was tuned against', () => {
    // The one place a border number is written down rather than derived: these
    // four are the schedule the tuning claim below is measured on, and a
    // designer who retunes the curve should have to come here and say so.
    expect([0, 1, 2, 3].map(nextBorderCost)).toEqual([10, 16, 24, 35]);
  });

  it('counts expansions, not owned tiles: the founding ring is free', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 6));
    // Seven tiles owned — the centre and its ring — and nothing claimed yet, so
    // the very first tile culture buys is still the opening rung.
    expect(city.tilesClaimed).toBe(0);
    expect(borderCostFor(state, city)).toBe(nextBorderCost(0));
  });
});

describe('a monument buys three or four tiles by the early game', () => {
  /**
   * The tuning target, measured rather than asserted from taste (user, item 2:
   * "a city with a single monument should acquire 3–4 tiles by the early game,
   * ~turn 25–30 at quick pace").
   *
   * The fixture is a capital that has its monument from turn one, on flat
   * grassland so that nothing but the curve is moving: `baseCulturePerCity` 1
   * plus the monument's 2 is a flat 3 culture a turn, and the writ sits at
   * palace 4 + monument 1 − a free capital = +5, which is the first bonus rung.
   *
   * The arithmetic that follows, and which the run below has to reproduce:
   * banking 3 a turn against 10 · 16 · 24 · 35 claims the first tile on turn 4
   * with 2 over, the second on turn 9, the third on turn 17 and the fourth on
   * turn 29. A real capital spends its opening five or six turns building the
   * monument, which slides the whole schedule later by about that much and lands
   * the *third* tile inside the window instead — which is why the assertion is a
   * band of 3–4 across turns 25–30 rather than a number.
   *
   * The +10% the writ puts on the accrual is worth nothing at 3 culture a turn,
   * and that is deliberate and not a bug: the accrual is floored once, exactly
   * as `cityYields` floors a barracks' hammers, so a bonus on three is three. A
   * monument town is not meant to sprint; the writ's tier is felt by cities that
   * actually make culture, and the test below proves it on one that does.
   */
  it('claims its third and fourth tiles inside turns 25–30', () => {
    const state = flatState(24, 18);
    const city = foundCityAt(state, 0, at(state.map, 8, 8));
    city.buildings.push('monument');

    expect(authorityOf(state, 0)).toBe(
      WRIT.palaceCapacity + RULES.meters.authority.capital * -1 + 1 - WRIT.capital,
    );
    expect(tierPercent(authorityOf(state, 0))).toBeGreaterThan(0);

    const claimedOn: number[] = [];
    let claimed = 0;
    for (let turn = 1; turn <= 40; turn++) {
      runEndOfTurn(state);
      state.turn += 1;
      if (city.tilesClaimed > claimed) {
        claimed = city.tilesClaimed;
        claimedOn.push(turn);
      }
    }

    // The schedule the docblock works out by hand, reproduced by the pipeline.
    expect(claimedOn.slice(0, 4)).toEqual([4, 9, 17, 29]);

    // And the claim the user asked for, as a band over the window: three or
    // four tiles on every turn from 25 to 30. Read off the same schedule so
    // that a curve change has to move this line, not just the one above.
    for (const turn of [25, 26, 27, 28, 29, 30]) {
      const byThen = claimedOn.filter((on) => on <= turn).length;
      expect(byThen, `turn ${turn}`).toBeGreaterThanOrEqual(3);
      expect(byThen, `turn ${turn}`).toBeLessThanOrEqual(4);
    }
  });

  it('slides later, but stays in the band, when the monument is built first', () => {
    // The honest version: the city has to pay for the monument before it pays
    // for any ground. Six turns of 1 culture, then 3 a turn — which is the
    // "about five or six turns later" the band is drawn wide enough to hold.
    const state = flatState(24, 18);
    const city = foundCityAt(state, 0, at(state.map, 8, 8));

    let claimed = 0;
    const claimedOn: number[] = [];
    for (let turn = 1; turn <= 40; turn++) {
      if (turn === 6) city.buildings.push('monument');
      runEndOfTurn(state);
      state.turn += 1;
      if (city.tilesClaimed > claimed) {
        claimed = city.tilesClaimed;
        claimedOn.push(turn);
      }
    }
    const byThirty = claimedOn.filter((on) => on <= 30).length;
    expect(byThirty, claimedOn.join(',')).toBeGreaterThanOrEqual(3);
    expect(byThirty, claimedOn.join(',')).toBeLessThanOrEqual(4);
  });
});

describe('the writ and the borders', () => {
  it('puts the freeze at any deficit at all, one point below balance', () => {
    expect(borderFreezePercent(1)).toBe(0);
    expect(borderFreezePercent(0)).toBe(0);
    expect(borderFreezePercent(-1)).toBe(-100);
    // Four points before the first malus rung of the tier ladder is reached.
    expect(tierPercent(-1)).toBe(0);
  });

  it('multiplies accrual by the writ, summed then applied once and floored', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 6));
    // A city that actually makes culture, so the tier is not lost to the floor
    // — a +10% on three culture is three, and that is the design (see
    // `borderGrowth`). Ten or more is where the writ starts paying.
    city.buildings.push('monument', 'temple', 'amphitheater', 'monastery', 'shrine');

    const growth = borderGrowth(state, city);
    expect(growth.frozen).toBe(false);
    expect(growth.percent).toBe(tierPercent(authorityOf(state, 0)));
    expect(growth.percent).toBeGreaterThan(0);
    expect(growth.perTurn).toBe(Math.floor(growth.base * (1 + growth.percent / 100)));
    expect(growth.perTurn).toBeGreaterThan(growth.base);
    // And the accrual is what the pipeline actually banks.
    const before = city.culture;
    collectYields(state);
    expect(city.culture - before).toBe(growth.perTurn);
  });

  it('freezes accrual, expansion and the clock at −1, and not at 0', () => {
    const state = flatState(30, 20);
    const city = foundCityAt(state, 0, at(state.map, 6, 6));
    city.buildings.push('monument');

    // Exactly balanced: still growing. The boundary is `< 0`, not `≤ 0`.
    overextendTo(state, 0, 0);
    expect(bordersFrozen(meterEffects(state, 0))).toBe(false);
    expect(borderFactor(meterEffects(state, 0))).toBe(1);
    const balanced = borderGrowth(state, city);
    expect(balanced.frozen).toBe(false);
    expect(balanced.perTurn).toBeGreaterThan(0);
    expect(balanced.turns).not.toBeNull();

    // One city more and the writ is overdrawn.
    foundCityAt(state, 0, at(state.map, state.map.width - 5, 11));
    expect(authorityOf(state, 0)).toBeLessThan(0);
    expect(bordersFrozen(meterEffects(state, 0))).toBe(true);

    const frozen = borderGrowth(state, city);
    expect(frozen.frozen).toBe(true);
    expect(frozen.perTurn).toBe(0);
    // A labelled state, not a silent zero: the base is still reported, so a
    // panel can say "3 culture, frozen" rather than printing nothing.
    expect(frozen.base).toBeGreaterThan(0);
    expect(frozen.percent).toBe(-100 + tierPercent(authorityOf(state, 0)));
    expect(frozen.turns).toBeNull();

    // Nothing accrues...
    const banked = city.culture;
    collectYields(state);
    expect(city.culture).toBe(banked);

    // ...and a basket that was already full is not spent either.
    city.culture = borderCostFor(state, city) * 3;
    const claimed = city.tilesClaimed;
    expandBorders(state);
    expect(city.tilesClaimed).toBe(claimed);
  });

  it('leaves the empire culture pool alone: the writ owns land, not civics', () => {
    const state = flatState(30, 20);
    const city = foundCityAt(state, 0, at(state.map, 6, 6));
    city.buildings.push('monument');
    overextendTo(state, 0, 0);
    foundCityAt(state, 0, at(state.map, state.map.width - 5, 11));
    expect(bordersFrozen(meterEffects(state, 0))).toBe(true);

    const pool = state.players[0]!.culturePool;
    collectYields(state);
    expect(state.players[0]!.culturePool).toBeGreaterThan(pool);
    expect(city.culture).toBe(0);
  });

  it('discounts the culture cost for a border-cost luxury and never below one', () => {
    // Furs' `rulePercent: borderCost` is the same −10% on both ladders; that it
    // reaches the *gold* price is asserted under "what a tile costs".
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 6));
    const plain = borderCostFor(state, city);

    const seam = at(state.map, 6, 5);
    seam.terrain = 'tundra';
    seam.feature = 'forest';
    seam.resource = 'furs';
    seam.improvement = 'camp';
    state.players[0]!.techsResearched.push('fletching');

    const discounted = borderCostFor(state, city);
    expect(discounted).toBeLessThan(plain);
    expect(discounted).toBe(Math.max(1, Math.floor(plain * 0.9)));
  });
});

// --- B. gold ----------------------------------------------------------------

describe('what a tile costs', () => {
  it('folds to exactly the sum of its lines, and never below one', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 6));
    const cell = { col: 8, row: 6 };
    const lines = explainTilePurchase(state, 0, city.id, cell);
    expect(tilePurchasePrice(state, 0, city.id, cell)).toBe(foldTilePrice(lines));
    expect(lines.length).toBeGreaterThan(0);
    expect(tilePurchasePrice(state, 0, city.id, cell)).toBeGreaterThan(0);
  });

  it('charges the outer ring more than the near ones', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 8, 8));
    const near = { col: 9, row: 8 };
    const mid = { col: 10, row: 8 };
    const far = { col: 11, row: 8 };
    expect(ringOf(state, city, near)).toBe(1);
    expect(ringOf(state, city, mid)).toBe(2);
    expect(ringOf(state, city, far)).toBe(3);

    expect(tilePurchasePrice(state, 0, city.id, near)).toBe(ringPrice(state, 0, 1));
    expect(tilePurchasePrice(state, 0, city.id, mid)).toBe(ringPrice(state, 0, 2));
    expect(tilePurchasePrice(state, 0, city.id, far)).toBe(ringPrice(state, 0, 3));
    // The near rings are one price and the outer one dearer, which is the whole
    // shape: the table says so, and the tags say what the table says.
    expect(BUY.ringBase[3]!).toBeGreaterThan(BUY.ringBase[2]!);
    expect(tilePurchasePrice(state, 0, city.id, near)).toBe(
      tilePurchasePrice(state, 0, city.id, mid),
    );
    expect(tilePurchasePrice(state, 0, city.id, far)).toBeGreaterThan(
      tilePurchasePrice(state, 0, city.id, mid),
    );
  });

  it('scales with how far the world has come, rounded to a tidy figure', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 8, 8));
    const cell = { col: 9, row: 8 };
    const opening = tilePurchasePrice(state, 0, city.id, cell);

    // Progress is this player's own share of the tree, starting techs included.
    const player = state.players[0]!;
    expect(gameProgress(state, 0)).toBeCloseTo(player.techsResearched.length / TECH_IDS.length, 10);

    // Half the tree learned. The band is asserted, not a hard-coded price: what
    // is pinned is that the era term is `1 + progressFactor · progress` and that
    // the tag is a round multiple of `roundTo`.
    const half = TECH_IDS.slice(0, Math.floor(TECH_IDS.length / 2));
    player.techsResearched = [...half];
    const later = tilePurchasePrice(state, 0, city.id, cell);
    expect(later).toBeGreaterThan(opening);
    expect(later % BUY.roundTo).toBe(0);
    expect(later).toBe(
      Math.round((BUY.ringBase[1]! * (1 + BUY.progressFactor * gameProgress(state, 0))) / BUY.roundTo) *
        BUY.roundTo,
    );

    // The whole tree: the base times `1 + progressFactor`, and no further.
    player.techsResearched = [...TECH_IDS];
    expect(gameProgress(state, 0)).toBe(1);
    expect(tilePurchasePrice(state, 0, city.id, cell)).toBe(
      Math.round((BUY.ringBase[1]! * (1 + BUY.progressFactor)) / BUY.roundTo) * BUY.roundTo,
    );
  });

  it('escalates per player, not per city, and only on tiles actually bought', () => {
    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 6, 6));
    const second = foundCityAt(state, 0, at(state.map, 14, 6));
    const cellA = { col: 8, row: 6 };
    const cellB = { col: 16, row: 6 };
    const opening = tilePurchasePrice(state, 0, first.id, cellA);
    expect(tilePurchasePrice(state, 0, second.id, cellB)).toBe(opening);

    state.players[0]!.tilesPurchased = 3;
    const dearer = opening + BUY.perPriorPurchase * 3;
    // Both cities, because the ladder belongs to the empire.
    expect(tilePurchasePrice(state, 0, first.id, cellA)).toBe(dearer);
    expect(tilePurchasePrice(state, 0, second.id, cellB)).toBe(dearer);
    // The other player has bought nothing and pays the opening price.
    expect(tilePurchasePrice(state, 1, first.id, cellA)).toBe(opening);

    const lines = explainTilePurchase(state, 0, first.id, cellA);
    expect(lines.some((line) => line.source.includes('Bought 3 before'))).toBe(true);
  });

  it('takes furs off the gold price too, on a line that names them', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 6));
    const cell = { col: 8, row: 6 };
    // The tech first: `fletching` is what lets a camp stand on the furs,
    // and it also moves this player's `gameProgress`. Granting it before the
    // baseline is read is what keeps this a test of the discount rather than of
    // the era term underneath it.
    state.players[0]!.techsResearched.push('fletching');
    const plain = tilePurchasePrice(state, 0, city.id, cell);

    const seam = at(state.map, 6, 5);
    seam.terrain = 'tundra';
    seam.feature = 'forest';
    seam.resource = 'furs';
    seam.improvement = 'camp';

    const discounted = tilePurchasePrice(state, 0, city.id, cell);
    expect(discounted).toBe(Math.max(1, Math.floor(plain * 0.9)));
    const lines = explainTilePurchase(state, 0, city.id, cell);
    expect(lines.some((line) => line.source.includes('Furs') && line.amount < 0)).toBe(true);
    // Rule 5: the discounted total is still the fold of the printed list.
    expect(foldTilePrice(lines)).toBe(discounted);
  });
});

describe('buying ground', () => {
  /** A capital with a full treasury and a frontier to spend it on. */
  function ready(): { state: GameState; city: City; cell: { col: number; row: number } } {
    const state = flatState(24, 18);
    const city = foundCityAt(state, 0, at(state.map, 8, 8));
    state.players[0]!.gold = 1000;
    return { state, city, cell: { col: 10, row: 8 } };
  }

  function buy(
    state: GameState,
    cityId: number,
    cell: { col: number; row: number },
    playerId = 0,
  ): ReturnType<typeof applyCommand> {
    return applyCommand(state, { type: 'purchaseTile', playerId, cityId, ...cell } as Command);
  }

  it('claims the tile, charges the price and climbs the ladder', () => {
    const { state, city, cell } = ready();
    const price = tilePurchasePrice(state, 0, city.id, cell);
    const purse = state.players[0]!.gold;

    expect(buy(state, city.id, cell)).toEqual({ ok: true });
    expect(state.tileOwner[tileIndex(state.map, cell.col, cell.row)]).toBe(city.id);
    expect(state.players[0]!.gold).toBe(purse - price);
    expect(state.players[0]!.tilesPurchased).toBe(1);
  });

  it('does not make the next culture tile dearer: the two ladders are separate', () => {
    const { state, city, cell } = ready();
    const before = borderCostFor(state, city);
    expect(buy(state, city.id, cell)).toEqual({ ok: true });
    expect(city.tilesClaimed).toBe(0);
    expect(borderCostFor(state, city)).toBe(before);
  });

  it('re-seats the citizens at once, so the panel is not a turn stale', () => {
    const { state, city, cell } = ready();
    city.population = 3;
    // A tile plainly better than the flat grassland around it.
    const prize = at(state.map, cell.col, cell.row);
    prize.resource = 'wheat';
    expect(buy(state, city.id, cell)).toEqual({ ok: true });
    expect(city.workedTiles.some((c) => c.col === cell.col && c.row === cell.row)).toBe(true);
  });

  it('prices the sale at exactly what the evaluator quoted', () => {
    // Rule 5 at the till: the tag the overlay paints is the charge.
    const { state, city, cell } = ready();
    const offers = purchasableTiles(state, city);
    const offer = offers.find((o) => o.col === cell.col && o.row === cell.row);
    expect(offer).toBeDefined();
    expect(offer!.error).toBeNull();
    const purse = state.players[0]!.gold;
    expect(buy(state, city.id, cell)).toEqual({ ok: true });
    expect(purse - state.players[0]!.gold).toBe(offer!.price);
  });

  describe('refuses, byte-identically, when', () => {
    /** Runs a refusal and proves the state did not move by so much as a byte. */
    function refuse(
      state: GameState,
      cityId: number,
      cell: { col: number; row: number },
      playerId = 0,
    ): string {
      const before = snapshotState(state);
      const result = applyCommand(state, {
        type: 'purchaseTile',
        playerId,
        cityId,
        ...cell,
      } as Command);
      expect(result.ok).toBe(false);
      expect(snapshotState(state)).toBe(before);
      return result.ok ? '' : result.error;
    }

    it('the seat is not real', () => {
      const { state, city, cell } = ready();
      expect(refuse(state, city.id, cell, 7)).toContain('7');
    });

    it('the seat has already ended its turn', () => {
      const { state, city, cell } = ready();
      expect(applyCommand(state, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
      expect(refuse(state, city.id, cell)).toContain('ended turn');
    });

    it('there is no such city', () => {
      const { state, cell } = ready();
      expect(refuse(state, 999, cell)).toContain('999');
    });

    it('the city is somebody else\'s', () => {
      const { state, city, cell } = ready();
      state.players[1]!.gold = 1000;
      expect(refuse(state, city.id, cell, 1)).toContain('does not belong');
    });

    it('the tile is off the map', () => {
      const { state, city } = ready();
      expect(refuse(state, city.id, { col: 3, row: -4 })).toContain('No tile');
    });

    it('the tile is water', () => {
      const { state, city, cell } = ready();
      at(state.map, cell.col, cell.row).terrain = 'coast';
      expect(refuse(state, city.id, cell)).toContain('sea');
    });

    it('the tile is already owned — by anyone, including this city', () => {
      const { state, city } = ready();
      const mine = { col: 9, row: 8 };
      expect(refuse(state, city.id, mine)).toContain('already owns');

      const rival = foundCityAt(state, 1, at(state.map, 14, 8));
      const theirs = neighborTiles(state.map, tileHex(at(state.map, 14, 8)))[0]!;
      expect(state.tileOwner[tileIndex(state.map, theirs.col, theirs.row)]).toBe(rival.id);
      expect(refuse(state, city.id, { col: theirs.col, row: theirs.row })).toContain(
        'already owned',
      );
    });

    it('the tile is outside the city\'s work radius', () => {
      const { state, city } = ready();
      expect(refuse(state, city.id, { col: 13, row: 8 })).toContain('Too far');
    });

    it('the tile does not touch the empire', () => {
      // Inside the radius, unowned, land — and an island: the ring-2 and ring-3
      // hexes beyond a city's opening ring are not all frontier.
      const { state, city } = ready();
      expect(refuse(state, city.id, { col: 11, row: 8 })).toContain('Not next to your territory');
    });

    it('the writ is overdrawn — land follows the writ', () => {
      const { state, city, cell } = ready();
      overextendTo(state, 0, 0);
      // Balanced is still solvent...
      expect(tilePurchaseError(state, 0, city.id, cell)).toBeNull();
      // ...and one city more is not.
      foundCityAt(state, 0, at(state.map, state.map.width - 5, 15));
      expect(authorityOf(state, 0)).toBeLessThan(0);
      expect(refuse(state, city.id, cell)).toContain('frozen');
    });

    it('the treasury will not cover it', () => {
      const { state, city, cell } = ready();
      state.players[0]!.gold = tilePurchasePrice(state, 0, city.id, cell) - 1;
      expect(refuse(state, city.id, cell)).toContain('gold');
    });
  });

  it('offers every frontier hex, priced, with the unaffordable ones greyed', () => {
    const { state, city, cell } = ready();
    state.players[0]!.gold = 0;
    const offers = purchasableTiles(state, city);
    expect(offers.length).toBeGreaterThan(0);
    // Every offer is unowned land inside the radius that touches the empire...
    for (const offer of offers) {
      expect(state.tileOwner[tileIndex(state.map, offer.col, offer.row)]).toBeNull();
      expect(offer.price).toBeGreaterThan(0);
    }
    // ...and with an empty purse every one of them says so rather than vanishing.
    expect(offers.every((offer) => offer.error !== null)).toBe(true);
    expect(offers.find((o) => o.col === cell.col && o.row === cell.row)?.error).toContain('gold');

    // In tile-index order, so the overlay is a pure function of the board.
    const indices = offers.map((o) => tileIndex(state.map, o.col, o.row));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it('says nothing about a frozen empire\'s tiles except why', () => {
    const { state, city } = ready();
    overextendTo(state, 0, 0);
    foundCityAt(state, 0, at(state.map, state.map.width - 5, 15));
    const offers = purchasableTiles(state, city);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((offer) => offer.error?.includes('frozen') === true)).toBe(true);
  });
});

describe('purchases in the log', () => {
  /**
   * A real game, played to a real treasury, spent on real ground.
   *
   * Nothing is hand-fed: the gold comes from the luxuries the capital works, so
   * every byte of the final state is reachable from `{config, log}` alone —
   * which is the whole point of the test. Seed 1 is chosen because its capital
   * has something worth selling in its rings; the assertion below that the
   * treasury actually filled is what stops the test quietly passing on a map
   * where nobody could afford anything.
   */
  it('replays byte-identically, purchases and all', () => {
    const game = createGame({
      seed: 1,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#a00', isHuman: true }],
    });
    const founder = game.state.units.find((unit) => unit.type === 'settler')!;
    expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(
      true,
    );
    const city = game.state.cities[0]!;

    let bought = 0;
    for (let turn = 0; turn < 45; turn++) {
      const offer = purchasableTiles(game.state, city).find((one) => one.error === null);
      if (offer) {
        expect(
          dispatch(game, {
            type: 'purchaseTile',
            playerId: 0,
            cityId: city.id,
            col: offer.col,
            row: offer.row,
          } as Command).ok,
        ).toBe(true);
        bought += 1;
      }
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }
    expect(game.state.players[0]!.gold).toBeGreaterThan(0);
    expect(bought).toBeGreaterThan(1);
    expect(game.state.players[0]!.tilesPurchased).toBe(bought);

    // Same config, same commands, same bytes — with the purchases in the log.
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
    // And through a save file, which is the same claim one layer out.
    expect(snapshotState(loadGame(saveGame(game)).state)).toBe(snapshotState(game.state));
  });

  it('carries the purchase counter through a save', () => {
    const state = flatState();
    expect(state.players[0]!.tilesPurchased).toBe(0);
    state.players[0]!.tilesPurchased = 4;
    const round = JSON.parse(JSON.stringify(state)) as GameState;
    expect(round.players[0]!.tilesPurchased).toBe(4);
  });
});
