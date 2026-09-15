/**
 * **The leaders' ground and their halls** — batch L3c, `docs/flags.md` (iiii),
 * spec of record `docs/leaders.md`.
 *
 * The six halves L2a could not say, and every one of them is a rule about a
 * *place* rather than about a card: what a farm below a peak pays, what a farm
 * that can drink pays, which hillside will take a farm at all, which grass gives
 * a column its horses back, which valley counts its own marvels and sells them
 * for faith, and which house learns from the people a realm has called.
 *
 * Each claim is stated twice — where the rule fires and where it does **not** —
 * because a rule that fires everywhere is not a card, it is a patch note. So:
 * one peak against two, a lake farm against a dry one, a hillside with the steps
 * cut against the same hillside in the next town, a column on the pastures
 * against a column one hex off them, a valley's own wonders against the realm's,
 * and a house with nobody called against a house with two.
 */

import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type Tile, createMap, getTileAt, tileNeighbors } from '../../src/sim/map';
import { markMountainAdjacency } from '../../src/sim/mapgen';
import { arriveOnTile } from '../../src/sim/arrival';
import { improvementErrorAt } from '../../src/sim/improvements';
import {
  HILLS_WAIVERS,
  improvementCountsAs,
  improvementDef,
} from '../../src/sim/improvementData';
import { explainPurchaseCost, purchaseError, purchaseItemAt } from '../../src/sim/purchase';
import { snapshotState } from '../../src/sim/game';
import { applyCommand } from '../../src/sim/commands';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  newGame,
  playerById,
} from '../../src/sim/state';
import { explainCardCityYields, explainCardPercentYields } from '../../src/sim/statecraft';
import { ABILITY_TECH, TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { fullMovement } from '../../src/sim/units';
import { computeFreshwater } from '../../src/sim/water';
import { resetVisibility } from '../../src/sim/visibility';
import { cityContext, explainTileYield } from '../../src/sim/yields/hex';
import { type LeaderId, leaderDef } from '../../src/sim/leaderData';

// --- the bench --------------------------------------------------------------

/**
 * `improvementHelpers`' blank rectangle with a **figure in the first seat**.
 *
 * Written here rather than widened over there because a leader is the whole
 * subject of this file and none of that file's claims has one: a bench that
 * seated Pachacuti for the chop tests would be a bench whose farms quietly pay
 * more than the table says.
 *
 * Every technology whose gift is a *thing*, and none whose gift is a **rule** —
 * that file's own derivation, and for its reason exactly: what is wanted is
 * "nothing is gated", not "seven rules of the world have been rewritten".
 */
function bench(first?: LeaderId, second?: LeaderId): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true, ...(first ? { leader: first } : {}) },
      { name: 'Bors', color: '#00a', ...(second ? { leader: second } : {}) },
    ],
  });
  state.map = createMap({ width: 14, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  const ruleNodes = new Set<TechId>(
    TECH_IDS.filter((id) => (techDef(id).effects ?? []).length > 0),
  );
  const ocean = ABILITY_TECH.get('oceanGoing');
  if (ocean !== undefined) ruleNodes.add(ocean);
  for (const player of state.players) {
    player.techsResearched = TECH_IDS.filter((id) => !ruleNodes.has(id));
  }
  computeFreshwater(state.map);
  markMountainAdjacency(state.map);
  bumpRevision(state);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/**
 * Re-derives the two baked neighbourhood facts the bench has just moved, and
 * **announces** it the way a command does (`bumpRevision`): the law is memoised
 * against the revision clock, so a bench that reached into the board without
 * saying so would be asking the evaluator about a world that no longer exists.
 */
function reground(state: GameState): void {
  computeFreshwater(state.map);
  markMountainAdjacency(state.map);
  bumpRevision(state);
}

/** What one hex pays a town of this empire's, as the breakdown rule 5 asks for. */
function hexLines(state: GameState, city: City, tile: Tile) {
  return explainTileYield(tile, cityContext(state, city));
}

/**
 * The one line a named **ability** put on a hex, or `undefined`.
 *
 * Asked of the line's own `card` rather than of its printed label, because the
 * label is the Ledger's business and a retitled figure should not break a claim
 * about what the ground pays. Since the second cut (L6a) the id on the line is
 * the *ability's* — a figure has two and they are folded apart — which is the
 * finer name and the one a breakdown should carry.
 */
function lineFrom(
  state: GameState,
  city: City,
  tile: Tile,
  card: string,
): { food: number; gold: number; faith: number } | undefined {
  return hexLines(state, city, tile).find((entry) => entry.card === card);
}

// --- Pachacuti · the farms below the peaks ----------------------------------

describe('Pachacuti’s farms mint a coin for each peak beside them', () => {
  /**
   * A city at (6, 6) with a farm at (6, 5), and as many mountains around that
   * farm as the claim wants. The peaks go down before the marks are re-derived,
   * which is the only order that works: `Tile.mountainsBeside` is baked output
   * and nothing in the game regenerates a tile mid-game.
   */
  function farmUnder(peaks: number): { state: GameState; city: City; farm: Tile } {
    const state = bench('pachacuti');
    const city = foundCityAt(state, 0, at(state, 6, 6));
    const farm = at(state, 6, 5);
    farm.improvement = 'farm';
    const ring = tileNeighbors(state.map, farm).filter(
      (tile) => !(tile.col === city.col && tile.row === city.row),
    );
    for (let i = 0; i < peaks; i++) ring[i]!.terrain = 'mountain';
    reground(state);
    refreshCityDerived(state, city);
    return { state, city, farm };
  }

  it('pays nothing where no mountain stands beside the farm', () => {
    const { state, city, farm } = farmUnder(0);
    expect(farm.mountainsBeside).toBeUndefined();
    expect(lineFrom(state, city, farm, 'goldOfThePeaks')).toBeUndefined();
  });

  it('pays one coin for one peak and two for two — the count is the helping', () => {
    for (const peaks of [1, 2, 3]) {
      const { state, city, farm } = farmUnder(peaks);
      expect(farm.mountainsBeside, `${peaks} peaks`).toBe(peaks);
      const line = lineFrom(state, city, farm, 'goldOfThePeaks');
      expect(line, `${peaks} peaks`).toBeDefined();
      expect(line!.gold, `${peaks} peaks`).toBe(peaks);
      // Gold and never food since the second cut: an Inca town is productive
      // with few citizens, and the coin is what the width is bought with.
      expect(line!.food, `${peaks} peaks`).toBe(0);
    }
  });

  it('is one labelled line and the fold of the list, never a total beside it', () => {
    // Hard rule 5. Three peaks are three coins *in one entry* — a player reads
    // one name and one number, and the breakdown still sums to the total.
    const { state, city, farm } = farmUnder(3);
    const lines = hexLines(state, city, farm);
    const mine = lines.filter((entry) => entry.card === 'goldOfThePeaks');
    expect(mine).toHaveLength(1);
    expect(mine[0]!.card).toBe('goldOfThePeaks');
  });

  it('pays a farm and nothing else standing under the same peaks', () => {
    const { state, city, farm } = farmUnder(2);
    // The same hex with the furrows taken out again is ordinary hillside.
    farm.improvement = undefined;
    refreshCityDerived(state, city);
    expect(lineFrom(state, city, farm, 'goldOfThePeaks')).toBeUndefined();
    // And a pasture under the same peaks is not a farm either.
    farm.improvement = 'pasture';
    refreshCityDerived(state, city);
    expect(lineFrom(state, city, farm, 'goldOfThePeaks')).toBeUndefined();
  });

  it('belongs to the seat that plays the figure, and to no other', () => {
    const state = bench('pachacuti');
    const mine = foundCityAt(state, 0, at(state, 4, 6));
    const theirs = foundCityAt(state, 1, at(state, 10, 6));
    for (const [city, paid] of [
      [mine, true],
      [theirs, false],
    ] as const) {
      const farm = at(state, city.col, city.row - 1);
      farm.improvement = 'farm';
      tileNeighbors(state.map, farm)[0]!.terrain = 'mountain';
      reground(state);
      refreshCityDerived(state, city);
      expect(lineFrom(state, city, farm, 'goldOfThePeaks') !== undefined, city.name).toBe(paid);
    }
  });
});

// --- Akhenaten · the farms that drink ---------------------------------------

describe('Akhenaten’s farms are paid for the water they drink', () => {
  /**
   * A farm at (6, 5) worked by a town at (6, 6), with whatever the claim wants
   * standing beside it. The lake is the case the card was deferred on: a lake is
   * a water *tile* whose neighbours drink from it, which is the same reading the
   * farm's own irrigation renewal takes of `Tile.freshwater`.
   */
  function farmBeside(what: 'lake' | 'river' | 'nothing'): {
    state: GameState;
    city: City;
    farm: Tile;
  } {
    const state = bench('akhenaten');
    const city = foundCityAt(state, 0, at(state, 6, 6));
    const farm = at(state, 6, 5);
    farm.improvement = 'farm';
    if (what === 'lake') tileNeighbors(state.map, farm)[0]!.terrain = 'lake';
    if (what === 'river') farm.riverEdges = 1;
    reground(state);
    refreshCityDerived(state, city);
    return { state, city, farm };
  }

  it('pays a farm that drinks from a lake exactly as one that drinks from the river', () => {
    const lake = farmBeside('lake');
    const river = farmBeside('river');
    expect(lake.farm.freshwater).toBe(true);
    expect(river.farm.freshwater).toBe(true);
    const byLake = lineFrom(lake.state, lake.city, lake.farm, 'nilesGift');
    const byRiver = lineFrom(river.state, river.city, river.farm, 'nilesGift');
    expect(byLake).toBeDefined();
    expect(byLake!.faith).toBe(1);
    expect(byRiver!.faith).toBe(byLake!.faith);
  });

  it('pays a dry farm nothing at all', () => {
    const { state, city, farm } = farmBeside('nothing');
    expect(farm.freshwater).toBe(false);
    expect(lineFrom(state, city, farm, 'nilesGift')).toBeUndefined();
  });

  it('pays the water and not the ground — bare land beside a lake is not a farm', () => {
    const { state, city, farm } = farmBeside('lake');
    farm.improvement = undefined;
    refreshCityDerived(state, city);
    expect(lineFrom(state, city, farm, 'nilesGift')).toBeUndefined();
  });
});

// --- the Terraces · Pachacuti's own field ------------------------------------

/**
 * **The Terraces, re-cut as a field** (batch L8, `docs/flags.md` (bbbbb); the
 * user, 2026-09-14: *"i was imagining that terraces would be a unique farm, not
 * a building in the city"*).
 *
 * L3c's claims here were about a hall that waived the farm's flat ground inside
 * one town's borders; every one of them is replaced by the claim the row makes
 * now, stated the same way — where the rule fires and where it does not. The
 * hall itself is retired and its waiver is gone, which is the last claim in the
 * block.
 */
describe('the Terraces are a farm of the hills alone', () => {
  /** A dry, bare hill inside a town's borders — the hex a farm always refused. */
  function dryHill(first: LeaderId | null = 'pachacuti') {
    // `null` is a seat under **no figure**, said as a value rather than as an
    // omitted argument: `undefined` would take the default and quietly test
    // Pachacuti twice.
    const state = bench(first ?? undefined);
    const city = foundCityAt(state, 0, at(state, 6, 6));
    const hill = at(state, 6, 5);
    hill.hills = true;
    reground(state);
    refreshCityDerived(state, city);
    return { state, city, hill };
  }

  /**
   * A dry desert **hillside** with one peak beside it, inside a town's borders
   * — the hex the second ruling is about (the user, 2026-09-14: *"let's have
   * terrace farms only be able to be built on hills"*): the hill is what the
   * row requires, and the peak beside it is what forgives the water.
   */
  function mountainFoot(first: LeaderId | null = 'pachacuti', hills = true) {
    const state = bench(first ?? undefined);
    const city = foundCityAt(state, 0, at(state, 6, 6));
    const foot = at(state, 6, 5);
    foot.terrain = 'desert';
    foot.hills = hills;
    const ring = tileNeighbors(state.map, foot).filter(
      (tile) => !(tile.col === city.col && tile.row === city.row),
    );
    ring[0]!.terrain = 'mountain';
    reground(state);
    refreshCityDerived(state, city);
    return { state, city, foot };
  }

  it('is cut into a bare hillside where a farm is refused for its flat ground', () => {
    const { state, hill } = dryHill();
    const refusal = improvementErrorAt(state, 0, hill, 'farm');
    expect(refusal).not.toBeNull();
    expect(refusal!.toLowerCase()).toContain('flat');
    expect(improvementErrorAt(state, 0, hill, 'terraces')).toBeNull();
  });

  it('is cut into a dry hillside at the foot of a peak, where a farm is refused for its water', () => {
    const { state, foot } = mountainFoot();
    expect(foot.freshwater ?? false).toBe(false);
    expect(foot.mountainsBeside).toBe(1);
    const refusal = improvementErrorAt(state, 0, foot, 'farm');
    expect(refusal).not.toBeNull();
    expect(refusal!.toLowerCase()).toContain('fresh water');
    expect(improvementErrorAt(state, 0, foot, 'terraces')).toBeNull();
  });

  it('is refused flat ground, even at the foot of a peak — a terrace is a thing of the hills', () => {
    // The row's `requiresHills` with no waiver: the peak forgives the water and
    // nothing else, so the flat valley floor beneath it takes a farm's rules
    // and a farm's refusal, never a terrace.
    const { state, foot } = mountainFoot('pachacuti', false);
    const refusal = improvementErrorAt(state, 0, foot, 'terraces');
    expect(refusal).not.toBeNull();
    expect(refusal!.toLowerCase()).toContain('hills');
    const valley = at(state, 6, 7);
    expect(valley.hills).toBe(false);
    expect(improvementErrorAt(state, 0, valley, 'terraces')!.toLowerCase()).toContain('hills');
  });

  it('is refused the ground no farm would take — the peak forgives water, not terrain', () => {
    // The mountain foot forgives the *water* and never the terrain list: open
    // sea under a peak is not terraced, which is the half of the ruling that
    // says the terrain must still be one the row names.
    const { state, foot } = mountainFoot();
    foot.terrain = 'ocean';
    reground(state);
    const refusal = improvementErrorAt(state, 0, foot, 'terraces');
    expect(refusal).not.toBeNull();
    expect(refusal!.toLowerCase()).toContain('ocean');
  });

  it('is nobody else’s to cut, however much they have researched', () => {
    // The figure's gate, and the sentence a rival is refused with: it names the
    // realm that may, because the technology is not what is in the way.
    const { state, hill } = dryHill('akhenaten');
    const refusal = improvementErrorAt(state, 0, hill, 'terraces');
    expect(refusal).not.toBeNull();
    expect(refusal).toBe(`Only ${leaderDef('pachacuti').name}'s realm may build terraces`);
    expect(refusal!).not.toMatch(/[0-9]/);
    // A seat under no figure at all is refused the same way.
    const plain = dryHill(null);
    expect(improvementErrorAt(plain.state, 0, plain.hill, 'terraces')).toBe(refusal);
  });

  it('pays two food where a farm pays one, and takes Irrigation’s renewal like a farm', () => {
    const state = bench('pachacuti');
    const city = foundCityAt(state, 0, at(state, 6, 6));
    const field = at(state, 6, 5);
    field.improvement = 'terraces';
    reground(state);
    refreshCityDerived(state, city);
    const terraced = hexLines(state, city, field).filter(
      (entry) => entry.source === improvementDef('terraces').name,
    );
    expect(terraced).toHaveLength(1);
    expect(terraced[0]!.food).toBe(2);
    expect(improvementDef('terraces').yields.food).toBe(
      (improvementDef('farm').yields.food ?? 0) + 1,
    );
    // The renewal is the farm's, row for row — the same technology, the same
    // water condition, the same helping.
    expect(improvementDef('terraces').upgrades).toEqual(improvementDef('farm').upgrades);
  });

  it('counts as a farm wherever the rules read one — the peaks pay it', () => {
    // Pachacuti's own gold of the peaks asks `{test: 'improvement', improvement:
    // 'farm'}`, and so does Akhenaten's fresh water. Neither card learned a
    // second name: the row's `countsAs` is the whole of it.
    const state = bench('pachacuti');
    const city = foundCityAt(state, 0, at(state, 6, 6));
    const field = at(state, 6, 5);
    field.improvement = 'terraces';
    const ring = tileNeighbors(state.map, field).filter(
      (tile) => !(tile.col === city.col && tile.row === city.row),
    );
    ring[0]!.terrain = 'mountain';
    reground(state);
    refreshCityDerived(state, city);
    const line = lineFrom(state, city, field, 'goldOfThePeaks');
    expect(line).toBeDefined();
    expect(line!.gold).toBe(1);
    expect(improvementCountsAs('terraces', 'farm')).toBe(true);
    // And never the other way round: a farm is not a terrace.
    expect(improvementCountsAs('farm', 'terraces')).toBe(false);
  });

  it('drinks for Akhenaten’s Nile beside a river, because it is a farm', () => {
    const state = bench('akhenaten');
    const city = foundCityAt(state, 0, at(state, 6, 6));
    const field = at(state, 6, 5);
    // The seat is Akhenaten's, so the ground is his; the row is Pachacuti's to
    // *build* and the card is about what stands on the hex, not who laid it.
    field.improvement = 'terraces';
    tileNeighbors(state.map, field)[0]!.terrain = 'lake';
    reground(state);
    refreshCityDerived(state, city);
    expect(field.freshwater).toBe(true);
    expect(lineFrom(state, city, field, 'nilesGift')).toBeDefined();
  });

  /**
   * **The command, and the log that replays it** (batch L8). The row is new, so
   * the schema note's claim is pinned here: the verb is accepted for the one
   * seat and refused for every other with the state **byte-identical** (hard
   * rule 1), and the same commands over the same config land on the same board.
   */
  it('is cut by the command, refused to a rival byte for byte, and replays', () => {
    /** A bench with a worker of `seat` standing on a dry, bare hill of its own. */
    function withWorker(first: LeaderId | null) {
      const state = bench(first ?? undefined);
      const city = foundCityAt(state, 0, at(state, 6, 6));
      const hill = at(state, 6, 5);
      hill.hills = true;
      reground(state);
      refreshCityDerived(state, city);
      const worker = createUnit(state, 0, 'worker', hill.col, hill.row);
      worker.movesLeft = fullMovement(worker, state);
      bumpRevision(state);
      return { state, hill, worker };
    }

    const cut = { type: 'buildImprovement', playerId: 0, improvement: 'terraces' };

    // The rival: refused, and the refusal changes nothing at all.
    const theirs = withWorker('akhenaten');
    const before = snapshotState(theirs.state);
    const refused = applyCommand(theirs.state, {
      ...cut,
      unitId: theirs.worker.id,
    } as never);
    expect(refused.ok).toBe(false);
    expect(refused.ok ? null : refused.error).toBe(
      `Only ${leaderDef('pachacuti').name}'s realm may build terraces`,
    );
    expect(snapshotState(theirs.state)).toEqual(before);

    // The figure's own seat: accepted, and the hillside is terraced.
    const mine = withWorker('pachacuti');
    const done = applyCommand(mine.state, { ...cut, unitId: mine.worker.id } as never);
    expect(done.ok).toBe(true);
    expect(mine.hill.improvement).toBe('terraces');

    // And the same bench under the same command lands on the same board.
    const again = withWorker('pachacuti');
    expect(applyCommand(again.state, { ...cut, unitId: again.worker.id } as never).ok).toBe(true);
    expect(snapshotState(again.state)).toEqual(snapshotState(mine.state));
  });

  it('leaves the hall on the bench, with its waiver gone from the farm', () => {
    // The row is kept for saves and the book's bench, and it is in no pool:
    // `retired` takes it out of every build list there is, and the farm's
    // `hillsIf` no longer names a town that has cut steps.
    expect(buildingDef('terraces').retired).toBe(true);
    expect(improvementDef('farm').hillsIf).toEqual(['freshwater', 'ownResource']);
    expect([...HILLS_WAIVERS]).toEqual(['freshwater', 'ownResource']);
    // A town holding the retired hall waives nothing: a bare dry hillside
    // refuses the farm exactly as it did before L3c.
    const { state, city, hill } = dryHill();
    city.buildings.push('terraces');
    reground(state);
    expect(improvementErrorAt(state, 0, hill, 'farm')).not.toBeNull();
  });
});

// --- the Horde Camp · the herds give a column its marching back ---------------

describe('the Horde Camp gives a column its marching back', () => {
  /**
   * A town at (6, 6) with a pasture at (6, 5), and a piece of the town's owner
   * standing on the pasture with its allowance nearly spent. `arriveOnTile` is
   * the one seam a piece comes to rest at, so it is what the claim is asked of.
   */
  function grazing(options: { camp?: boolean; type?: Unit['type']; ownerId?: number } = {}) {
    const state = bench('modu');
    const city = foundCityAt(state, 0, at(state, 6, 6));
    if (options.camp !== false) city.buildings.push('hordeCamp');
    const pasture = at(state, 6, 5);
    pasture.improvement = 'pasture';
    reground(state);
    refreshCityDerived(state, city);
    const unit = createUnit(state, options.ownerId ?? 0, options.type ?? 'warrior', 6, 5);
    unit.movesLeft = 0;
    bumpRevision(state);
    return { state, city, pasture, unit };
  }

  it('fills the allowance of a soldier that halts on the town’s pastures', () => {
    const { state, pasture, unit } = grazing();
    arriveOnTile(state, unit, pasture);
    expect(unit.movesLeft).toBe(fullMovement(unit, state));
    expect(unit.movesLeft).toBeGreaterThan(0);
  });

  it('fills nothing in a town that has not pitched the camp', () => {
    const { state, pasture, unit } = grazing({ camp: false });
    arriveOnTile(state, unit, pasture);
    expect(unit.movesLeft).toBe(0);
  });

  it('fills nothing on ground that is not the herds’', () => {
    const { state, pasture, unit } = grazing();
    // The same hex, the same town, the furrows instead of the grazing.
    pasture.improvement = 'farm';
    arriveOnTile(state, unit, pasture);
    expect(unit.movesLeft).toBe(0);
    // And bare ground beside it, which the town holds and has never worked.
    const bare = at(state, 6, 4);
    unit.col = bare.col;
    unit.row = bare.row;
    arriveOnTile(state, unit, bare);
    expect(unit.movesLeft).toBe(0);
  });

  it('fills a soldier’s allowance and never a worker’s', () => {
    const { state, pasture, unit } = grazing({ type: 'worker' });
    arriveOnTile(state, unit, pasture);
    expect(unit.movesLeft).toBe(0);
  });

  it('waters no rival’s horses', () => {
    const { state, pasture, unit } = grazing({ ownerId: 1 });
    arriveOnTile(state, unit, pasture);
    expect(unit.movesLeft).toBe(0);
  });

  it('cannot loop: the allowance is set, never added to', () => {
    const { state, pasture, unit } = grazing();
    arriveOnTile(state, unit, pasture);
    const once = unit.movesLeft;
    arriveOnTile(state, unit, pasture);
    expect(unit.movesLeft).toBe(once);
  });
});

// --- the Valley of Kings · its own marvels, and faith to hurry them ----------

describe('the Valley of Kings counts its own marvels', () => {
  /** Two towns of one empire, the valley cut in the first. */
  function twoTowns(): { state: GameState; valley: City; other: City } {
    const state = bench('akhenaten');
    const valley = foundCityAt(state, 0, at(state, 4, 6));
    const other = foundCityAt(state, 0, at(state, 10, 6));
    valley.buildings.push('valleyOfKings');
    reground(state);
    refreshCityDerived(state, valley);
    refreshCityDerived(state, other);
    return { state, valley, other };
  }

  /**
   * The **valley's own** share of this town's culture, in whole percent. Asked
   * of the card that wrote the line, so a wonder standing beside it that pays
   * culture of its own never lands in the figure this file is about.
   */
  function culturePercent(state: GameState, city: City): number {
    return explainCardPercentYields(state, city)
      .filter((line) => line.card === 'valleyOfKings' && line.yield === 'culture')
      .reduce((sum, line) => sum + line.percent, 0);
  }

  it('pays nothing in a valley with no wonder standing in it', () => {
    const { state, valley } = twoTowns();
    expect(culturePercent(state, valley)).toBe(0);
  });

  it('pays for the wonders raised in its own town and not for the realm’s', () => {
    const { state, valley, other } = twoTowns();
    other.buildings.push('pyramids', 'greatLibrary');
    reground(state);
    refreshCityDerived(state, other);
    // Two marvels in the realm, none in the valley.
    expect(culturePercent(state, valley)).toBe(0);

    valley.buildings.push('stonehenge');
    reground(state);
    refreshCityDerived(state, valley);
    expect(culturePercent(state, valley)).toBe(10);
    valley.buildings.push('theOracle');
    reground(state);
    refreshCityDerived(state, valley);
    expect(culturePercent(state, valley)).toBe(20);
  });

  it('is the valley’s alone — a town without it is paid nothing for its wonders', () => {
    const { state, other } = twoTowns();
    other.buildings.push('pyramids');
    reground(state);
    refreshCityDerived(state, other);
    expect(culturePercent(state, other)).toBe(0);
  });
});

describe('a wonder may be hurried along with faith in the valley', () => {
  function valleyTown(cut = true): { state: GameState; valley: City; other: City } {
    const state = bench('akhenaten');
    const valley = foundCityAt(state, 0, at(state, 4, 6));
    const other = foundCityAt(state, 0, at(state, 10, 6));
    if (cut) valley.buildings.push('valleyOfKings');
    reground(state);
    refreshCityDerived(state, valley);
    refreshCityDerived(state, other);
    playerById(state, 0)!.faithPool = 100000;
    playerById(state, 0)!.gold = 100000;
    return { state, valley, other };
  }

  const wonder = { kind: 'building', id: 'stonehenge' } as const;

  it('refuses the sale in a town that has not cut the valley', () => {
    const { state, valley } = valleyTown(false);
    const refused = purchaseError(state, 0, valley.id, wonder, 'faith');
    expect(refused).not.toBeNull();
    expect(refused!).toContain('must be built, not bought');
  });

  it('refuses the sale in the empire’s other towns', () => {
    const { state, other } = valleyTown();
    expect(purchaseError(state, 0, other.id, wonder, 'faith')).not.toBeNull();
  });

  it('refuses the treasury even in the valley — it is faith or it is hammers', () => {
    const { state, valley } = valleyTown();
    const refused = purchaseError(state, 0, valley.id, wonder, 'gold');
    expect(refused).not.toBeNull();
    expect(refused!).toContain('must be built, not bought');
  });

  it('sells it for faith in the valley, at the ordinary conversion of its hammers', () => {
    const { state, valley } = valleyTown();
    expect(purchaseError(state, 0, valley.id, wonder, 'faith')).toBeNull();
    const price = explainPurchaseCost(state, 0, valley.id, wonder, 'faith');
    expect(price).not.toBeNull();
    expect(price!.currency).toBe('faith');
    // The fold of the printed lines is the price — rule 5 at the till.
    expect(price!.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(price!.total);
    expect(price!.total).toBeGreaterThan(0);
    // And the conversion is a line of its own, so the sheet says which bank.
    expect(price!.lines.some((line) => line.source.includes('faith'))).toBe(true);
  });

  it('refuses a purse that cannot pay, and leaves the state byte-identical', () => {
    const { state, valley } = valleyTown();
    playerById(state, 0)!.faithPool = 0;
    const before = snapshotState(state);
    expect(purchaseError(state, 0, valley.id, wonder, 'faith')).not.toBeNull();
    expect(snapshotState(state)).toBe(before);
  });

  it('claims the wonder for the realm when it is bought, exactly as building it does', () => {
    const { state, valley } = valleyTown();
    const born = purchaseItemAt(state, playerById(state, 0)!, valley, wonder, 'faith');
    expect(born).not.toBeNull();
    expect(valley.buildings).toContain('stonehenge');
    // One per world: the register was written, so nobody may raise it again.
    expect(state.wonders.some((claim) => claim.building === 'stonehenge')).toBe(true);
    expect(purchaseError(state, 0, valley.id, wonder, 'faith')).not.toBeNull();
  });
});

// --- the House of Learning · what a realm's great people teach it ------------

describe('the House of Learning learns from the people the realm has called', () => {
  function house(called: number): { state: GameState; city: City } {
    const state = bench('almamun');
    const city = foundCityAt(state, 0, at(state, 6, 6));
    city.buildings.push('houseOfLearning');
    playerById(state, 0)!.greatPeopleRecruited = called;
    reground(state);
    refreshCityDerived(state, city);
    return { state, city };
  }

  /** What the house puts on this town's science, as the breakdown's own line. */
  function science(state: GameState, city: City): number {
    return explainCardCityYields(state, city)
      .filter((line) => line.card === 'houseOfLearning')
      .reduce((sum, line) => sum + line.science, 0);
  }

  it('teaches nothing in a realm that has called nobody', () => {
    const { state, city } = house(0);
    expect(science(state, city)).toBe(0);
  });

  it('teaches a beaker for every great person called', () => {
    for (const called of [1, 2, 5]) {
      const { state, city } = house(called);
      expect(science(state, city), `${called} called`).toBe(called);
    }
  });

  it('teaches only the towns that hold the house', () => {
    const { state } = house(3);
    const other = foundCityAt(state, 0, at(state, 10, 6));
    reground(state);
    refreshCityDerived(state, other);
    expect(science(state, other)).toBe(0);
  });

  it('goes on teaching after the person is spent — the count is the calling', () => {
    // `Player.greatPeopleRecruited` is written where a person is *picked* and
    // nothing lowers it, which is what "the realm has called" means: the scholar
    // whose academy is already planted is still somebody the house learnt from.
    const { state, city } = house(2);
    expect(science(state, city)).toBe(2);
    state.units = [];
    playerById(state, 0)!.legacies = [];
    reground(state);
    refreshCityDerived(state, city);
    expect(science(state, city)).toBe(2);
  });
});
