/**
 * **Dominion batch D12, five small automatic rules** (`docs/plans/dominion-
 * themes-triage.md`, the D12 section). `dominion.test.ts` checks the rows
 * against the sheet, and `test/fixtures/cardText.json` pins their words. This
 * file checks that each new shape and each card does what its text says:
 *
 *   · Commission: Harry the Border: the `pillageRewards` amplifier with a
 *     `class`, read on the pillage moment against the raider (reading 2);
 *   · The Gathering Host: the `militaryGained` tally (reading 20);
 *   · The Soldier-Farmers and the sight gate on the three resource tests, in
 *     hex lines and in counts of hexes (readings 4, 21 and 29);
 *   · The Marshalate: a flat step on the general's aura, scaled by a count,
 *     added before The Strategoi's share (reading 22);
 *   · Rally to the Standard: the `rallyToGeneral` rule and its range, read
 *     where a gained unit is placed (readings 23 and 42).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, raiseFreeUnit, realiseItem, spawnTileFor, tileOwnerPlayerId } from '../../../src/sim/cities';
import { generalAuraLines } from '../../../src/sim/combat';
import { runCommissions } from '../../../src/sim/commissions';
import { pillageAt } from '../../../src/sim/improvements';
import {
  type Tile,
  createMap,
  getTileAt,
  neighborTiles,
  raiseImprovement,
  tileHex,
  wrappedDistance,
} from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  describeCard,
  explainCardPercentYields,
  groundFactsFor,
  slotOrderAt,
  slotOrderError,
  slotTypesOf,
  stripRefs,
  tallyOf,
  tileConditionHolds,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { type DoctrineId, type OrderId, orderDef, orderFitsSlot } from '../../../src/sim/statecraftData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { cityContext, explainTileYield } from '../../../src/sim/yields/hex';
import { newGame } from '../newGameHelpers';

const HARRY = 'dominionHarryTheBorder' as OrderId;
const HOST = 'theGatheringHost' as OrderId;
const FARMERS = 'dominionTheSoldierFarmers' as OrderId;
const MARCH = 'theMarchRevenues' as OrderId;
const MARSHALATE = 'dominionTheMarshalate' as OrderId;
const RALLY = 'rallyToTheStandard' as OrderId;
const PLUNDER_TRAINS = 'thePlunderTrains' as OrderId;
const HORDE = 'theHorde' as OrderId;
const PLUNDER_ECONOMY = 'thePlunderEconomy' as DoctrineId;
const STRATEGOI = 'theStrategoi' as DoctrineId;

/** Two seats and the wild on a flat grassland rectangle, the two seats at war unless told otherwise. */
function flat(war = true, width = 20, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: true,
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
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  if (war) {
    const seats = realPlayers(state);
    openWar(state, seats[0]!.id, seats[1]!.id);
  }
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

function seat(state: GameState, id: number): Player {
  return playerById(state, id)!;
}

/** Puts an Order in a chair for seat 0, the way the reading sees it. */
function slot(state: GameState, id: OrderId): void {
  const sc = seat(state, 0).statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Holds a Doctrine for seat 0. */
function hold(state: GameState, id: DoctrineId): void {
  seat(state, 0).statecraft.doctrines.push(id);
  bumpRevision(state);
}

/** Seats a commission for seat 0 in the first empty chair it fits, through the slot verb. */
function seatCommission(state: GameState, id: OrderId): void {
  const player = seat(state, 0);
  if (!player.statecraft.orders.includes(id)) player.statecraft.orders.push(id);
  const chairs = slotTypesOf(player.statecraft);
  const index = player.statecraft.slots.findIndex(
    (held, chair) => held === null && orderFitsSlot(id, chairs[chair]!),
  );
  expect(index, 'an empty chair').toBeGreaterThanOrEqual(0);
  expect(slotOrderError(state, 0, id, index)).toBeNull();
  slotOrderAt(state, player, id, index);
  bumpRevision(state);
}

/** A great general of seat 0's standing on a hex. */
function general(state: GameState, col: number, row: number, owner = 0): Unit {
  const unit = createUnit(state, owner, 'greatPerson', col, row, 'hannibal');
  bumpRevision(state);
  return unit;
}

/** What one card's lines pay on a hex worked by `city`, read off the hex's own breakdown. */
function cardOnHex(state: GameState, city: City, tile: Tile, card: OrderId): { production: number; gold: number } {
  const total = { production: 0, gold: 0 };
  for (const line of explainTileYield(tile, cityContext(state, city))) {
    if (line.card !== card) continue;
    total.production += line.production;
    total.gold += line.gold;
  }
  return total;
}

/** One card's percentage on a voice in a town. */
function percentPaid(state: GameState, city: City, card: OrderId, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** Seat 1's town at (8, 5), and farms on the hexes `cols` of row 5 that it owns. */
function enemyFarms(state: GameState, cols: number[]): Tile[] {
  foundCityAt(state, 1, at(state, 8, 5));
  const farms = cols.map((col) => at(state, col, 5));
  for (const farm of farms) raiseImprovement(farm, 'farm' as never, state.turn);
  bumpRevision(state);
  return farms;
}

/** Seat 0 meets Harry the Border by burning four farms with a foot soldier. */
function meetHarry(state: GameState): void {
  seatCommission(state, HARRY);
  // Seat 1's town at (8, 5) owns the ring around it; four farms on it.
  const farms = enemyFarms(state, [7, 9]);
  const more = [at(state, 8, 4), at(state, 8, 6)];
  for (const farm of more) raiseImprovement(farm, 'farm' as never, state.turn);
  bumpRevision(state);
  for (const farm of [...farms, ...more]) {
    const raider = createUnit(state, 0, 'warrior', farm.col, farm.row);
    bumpRevision(state);
    pillageAt(state, raider, farm);
  }
  expect(tallyOf(seat(state, 0).statecraft, HARRY)).toBe(4);
  expect(runCommissions(state).map((report) => report.card)).toEqual([HARRY]);
  bumpRevision(state);
}

describe('Dominion D12 — Commission: Harry the Border', () => {
  it('asks for four hexes pillaged, and leaves a share on pillage yields for mounted units', () => {
    const def = orderDef(HARRY);
    expect(def.commission?.goals).toEqual([{ kind: 'counted', occasion: 'hexPillaged', count: 4 }]);
    expect(def.commission?.reward).toEqual([
      {
        lasting: [
          { kind: 'effectAmplifier', target: 'pillageRewards', percent: 50, class: { modelClass: 'mounted' } },
        ],
      },
    ]);
  });

  it('pays a mounted raider half again on the base plunder and on every rider’s yields, a Doctrine’s included', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 0, at(state, 2, 8));
    slot(state, PLUNDER_TRAINS);
    hold(state, PLUNDER_ECONOMY);
    const strength = 48;
    const before = (actor: string) => windfallPayout(state, 0, 'pillage', 25, 25, { actor: actor as never, strength });
    const plainHorse = before('horseman');
    meetHarry(state);
    const horse = windfallPayout(state, 0, 'pillage', 25, 25, { actor: 'horseman', strength });
    const foot = windfallPayout(state, 0, 'pillage', 25, 25, { actor: 'warrior', strength });
    // The base plunder: half again for the horse, untouched for the foot.
    expect(plainHorse.amount).toBe(25);
    expect(horse.amount).toBe(37.5);
    expect(foot.amount).toBe(25);
    // Every yield grant, the Order's and the Doctrine's, once each.
    expect(horse.grants.map((grant) => grant.amount)).toEqual(plainHorse.grants.map((grant) => grant.amount * 1.5));
    expect(foot.grants.map((grant) => grant.amount)).toEqual(plainHorse.grants.map((grant) => grant.amount));
    expect(horse.grants.some((grant) => grant.card === PLUNDER_ECONOMY)).toBe(true);
    // The heal is not a yield.
    expect(horse.heal).toBe(25);
    // The card is named once on the payout's lines, and only when it raised something.
    expect(horse.lines.filter((line) => line.card === HARRY)).toHaveLength(1);
    expect(foot.lines.some((line) => line.card === HARRY)).toBe(false);
  });

  it('pays nothing more while the card is seated and not yet met', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    seatCommission(state, HARRY);
    expect(windfallPayout(state, 0, 'pillage', 25, 25, { actor: 'horseman' }).amount).toBe(25);
  });

  it('banks the raised salvage through the pillage verb, and on every hex The Horde spreads to', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    meetHarry(state);
    slot(state, HORDE);
    // A fresh farm to raid on seat 1's ground, and a farm on every hex of
    // seat 1's beside it but the town's own.
    const target = at(state, 9, 5);
    raiseImprovement(target, 'farm' as never, state.turn);
    const near = neighborTiles(state.map, tileHex(target)).filter(
      (tile) => tileOwnerPlayerId(state, tile.col, tile.row) === 1 && !(tile.col === 8 && tile.row === 5),
    );
    for (const tile of near) raiseImprovement(tile, 'farm' as never, state.turn);
    bumpRevision(state);
    expect(near.length).toBeGreaterThan(0);
    const raider = createUnit(state, 0, 'horseman', target.col, target.row);
    bumpRevision(state);
    const gold = seat(state, 0).gold;
    const report = pillageAt(state, raider, target);
    expect(report.spread?.length).toBe(near.length);
    expect(seat(state, 0).gold - gold).toBe(37.5 * (1 + near.length));
  });
});

describe('Dominion D12 — The Gathering Host counts military units gained', () => {
  it('counts a land military unit, free or levied, and not a civilian or a ship', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, HOST);
    const counted = (): number => tallyOf(seat(state, 0).statecraft, HOST);
    expect(raiseFreeUnit(state, city, 'warrior')).not.toBeNull();
    expect(counted()).toBe(1);
    expect(raiseFreeUnit(state, city, 'worker')).not.toBeNull();
    expect(counted()).toBe(1);
    // A conscript counts (the ruling of 2026-10-16).
    realiseItem(state, city, { kind: 'unit', id: 'spearman', tile: at(state, 5, 4) }, { untrained: true });
    expect(counted()).toBe(2);
    // A ship does not (reading 20).
    realiseItem(state, city, { kind: 'unit', id: 'trireme', tile: at(state, 3, 4) }, { free: true });
    expect(counted()).toBe(2);
  });
});

describe('Dominion D12 — the sight gate and The Soldier-Farmers', () => {
  it('pays +1 production and +1 gold on each resource hex of a garrisoned town, at war or at peace, once its owner can see the resource', () => {
    for (const war of [false, true]) {
      const state = flat(war);
      const city = foundCityAt(state, 0, at(state, 4, 4))!;
      const wheat = at(state, 5, 4);
      const copper = at(state, 3, 4);
      const bare = at(state, 4, 5);
      wheat.resource = 'wheat' as never;
      copper.resource = 'copper' as never;
      slot(state, FARMERS);
      // No garrison, no pay.
      expect(cardOnHex(state, city, wheat, FARMERS)).toEqual({ production: 0, gold: 0 });
      createUnit(state, 0, 'warrior', city.col, city.row);
      bumpRevision(state);
      expect(cardOnHex(state, city, wheat, FARMERS)).toEqual({ production: 1, gold: 1 });
      expect(cardOnHex(state, city, bare, FARMERS)).toEqual({ production: 0, gold: 0 });
      // Copper is hidden until Mining (reading 4): the card pays nothing on it.
      expect(seat(state, 0).techsResearched).not.toContain('mining');
      expect(cardOnHex(state, city, copper, FARMERS)).toEqual({ production: 0, gold: 0 });
      seat(state, 0).techsResearched.push('mining' as never);
      bumpRevision(state);
      expect(cardOnHex(state, city, copper, FARMERS)).toEqual({ production: 1, gold: 1 });
    }
  });

  it('answers the three resource tests only for a resource the asking empire can see, and from the tile alone with no ground facts', () => {
    const state = flat(false);
    const tile = at(state, 6, 6);
    tile.resource = 'copper' as never;
    const tests = [
      { test: 'hasResource' },
      { test: 'resourceKind', kind: 'strategic' },
      { test: 'resource', resources: ['copper'] },
    ] as const;
    for (const on of tests) {
      // The omniscient reading.
      expect(tileConditionHolds(tile, on as never), on.test).toBe(true);
      expect(tileConditionHolds(tile, on as never, undefined, undefined, state.turn, groundFactsFor(state, 0)), on.test).toBe(false);
    }
    seat(state, 0).techsResearched.push('mining' as never);
    bumpRevision(state);
    for (const on of tests) {
      expect(tileConditionHolds(tile, on as never, undefined, undefined, state.turn, groundFactsFor(state, 0)), on.test).toBe(true);
    }
  });

  it('counts only the strategic resources the empire can see inside its borders (The March Revenues, reading 29)', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    at(state, 5, 4).resource = 'copper' as never;
    slot(state, MARCH);
    expect(percentPaid(state, city, MARCH, 'production')).toBe(0);
    seat(state, 0).techsResearched.push('mining' as never);
    bumpRevision(state);
    expect(percentPaid(state, city, MARCH, 'production')).toBe(3);
  });
});

describe('Dominion D12 — The Marshalate', () => {
  it('adds +1 to the aura for each great general gained, at most +5, before The Strategoi doubles it', () => {
    const state = flat(false);
    const soldier = createUnit(state, 0, 'warrior', 4, 4);
    general(state, 5, 4);
    const base = RULES.greatPeople.generalAuraStrength;
    const aura = (): number => generalAuraLines(state, soldier)[0]!.amount;
    slot(state, MARSHALATE);
    seat(state, 0).greatPeopleByFamily = {};
    bumpRevision(state);
    expect(aura()).toBe(base);
    seat(state, 0).greatPeopleByFamily = { general: 2 };
    bumpRevision(state);
    expect(aura()).toBe(base + 2);
    seat(state, 0).greatPeopleByFamily = { general: 9 };
    bumpRevision(state);
    expect(aura()).toBe(base + 5);
    // Reading 22: (3 + 5) × 2.
    hold(state, STRATEGOI);
    expect(aura()).toBe((base + 5) * 2);
  });

  it('counts only great generals, not great people of another family', () => {
    const state = flat(false);
    const soldier = createUnit(state, 0, 'warrior', 4, 4);
    general(state, 5, 4);
    slot(state, MARSHALATE);
    seat(state, 0).greatPeopleByFamily = { scholar: 4 } as never;
    bumpRevision(state);
    expect(generalAuraLines(state, soldier)[0]!.amount).toBe(RULES.greatPeople.generalAuraStrength);
  });
});

describe('Dominion D12 — Rally to the Standard', () => {
  /** Seat 0's town at (2, 6) on a wide board, so a hex ten away is ten away both ways round. */
  function board(): { state: GameState; city: City } {
    const state = flat(false, 32, 14);
    const city = foundCityAt(state, 0, at(state, 2, 6))!;
    slot(state, RALLY);
    return { state, city };
  }

  function distance(state: GameState, a: { col: number; row: number }, b: { col: number; row: number }): number {
    return wrappedDistance(state.map, tileHex(at(state, a.col, a.row)), tileHex(at(state, b.col, b.row)));
  }

  function placed(state: GameState, id: number | null): Unit {
    expect(id).not.toBeNull();
    return state.units.find((unit) => unit.id === id)!;
  }

  it('puts a military unit gained on the first free hex beside the nearest great general within ten hexes', () => {
    const { state, city } = board();
    const far = general(state, 9, 6);
    const near = general(state, 6, 6);
    expect(distance(state, city, near)).toBeLessThan(distance(state, city, far));
    const unit = placed(state, raiseFreeUnit(state, city, 'warrior'));
    expect(distance(state, unit, near)).toBe(1);
    const first = neighborTiles(state.map, tileHex(at(state, near.col, near.row)))[0]!;
    expect({ col: unit.col, row: unit.row }).toEqual({ col: first.col, row: first.row });
  });

  it('leaves a civilian in its town', () => {
    const { state, city } = board();
    general(state, 6, 6);
    const worker = placed(state, raiseFreeUnit(state, city, 'worker'));
    expect({ col: worker.col, row: worker.row }).toEqual({ col: city.col, row: city.row });
  });

  it('does nothing when the nearest general stands more than ten hexes away, or belongs to another empire', () => {
    const { state, city } = board();
    const far = general(state, 14, 6);
    expect(distance(state, city, far)).toBeGreaterThan(10);
    general(state, 4, 6, 1);
    const unit = placed(state, raiseFreeUnit(state, city, 'warrior'));
    expect({ col: unit.col, row: unit.row }).toEqual({ col: city.col, row: city.row });
  });

  it('skips a hex with a discovery, a camp or another empire’s piece on it, and falls back to the town when none is free', () => {
    const { state, city } = board();
    const lead = general(state, 8, 6);
    const ring = neighborTiles(state.map, tileHex(at(state, lead.col, lead.row)));
    ring[0]!.discovery = 'antiquity' as never;
    state.camps.push({ col: ring[1]!.col, row: ring[1]!.row } as never);
    createUnit(state, 1, 'worker', ring[2]!.col, ring[2]!.row);
    bumpRevision(state);
    const unit = placed(state, raiseFreeUnit(state, city, 'warrior'));
    expect({ col: unit.col, row: unit.row }).toEqual({ col: ring[3]!.col, row: ring[3]!.row });
    // Fill the rest with seat 0's own soldiers: no free hex, so the town.
    for (const tile of ring.slice(4)) createUnit(state, 0, 'warrior', tile.col, tile.row);
    bumpRevision(state);
    const next = placed(state, raiseFreeUnit(state, city, 'spearman'));
    expect({ col: next.col, row: next.row }).toEqual({ col: city.col, row: city.row });
  });

  it('places a bought unit beside the general too, even when the town hex is taken (reading 42)', () => {
    const { state, city } = board();
    const lead = general(state, 6, 6);
    createUnit(state, 0, 'warrior', city.col, city.row);
    bumpRevision(state);
    const tile = spawnTileFor(state, city, 'warrior', { onCityHexOnly: true });
    expect(tile).not.toBeNull();
    expect(distance(state, tile!, lead)).toBe(1);
  });

  it('says the range and the kind of unit in its words', () => {
    const words = describeCard(RALLY)
      .map((clause) => stripRefs(clause.text))
      .join(' | ');
    expect(words).toBe(
      'a military unit you gain appears beside your nearest great general instead of in its city, if that general stands within 10 hexes of the city',
    );
  });
});
