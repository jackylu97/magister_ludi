/**
 * **Dominion batch D3, "pillage and grant delivery"**
 * (`docs/plans/dominion-build-triage.md`). `dominion.test.ts` checks the nine
 * rows against the sheet; this file checks that the shapes the batch added do
 * what the cards say:
 *
 *   · a pillage counts a tally and a lifetime record, one each for every hex
 *     (The Captive Craftsmen, The Sagas), and never for the wild;
 *   · a grant's food and production land in the capital (The Plunder Trains),
 *     in every town (The Outriders) or in the nearest town with an Armoury
 *     (Armoury Guilds);
 *   · a pillage rider heals a mounted raider fully (The Yam), strikes the enemy
 *     towns within three hexes with one roll each (The Chevauchée), throws an
 *     ungarrisoned enemy town beside the hex into unrest (The Harrying) and
 *     burns the enemy works beside the hex, each a full pillage (The Horde).
 */

import { describe, expect, it } from 'vitest';

import { previewCombat, cityWallsStrength } from '../../../src/sim/combat';
import { foundCityAt, growthThreshold, tileOwnerPlayerId } from '../../../src/sim/cities';
import { pillageAt } from '../../../src/sim/improvements';
import { type Tile, createMap, getTileAt, raiseImprovement, tileNeighbors } from '../../../src/sim/map';
import { cloneRng, makeRng, nextRange } from '../../../src/sim/rng';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  describeCard,
  explainCardEmpireYields,
  explainCardCityYields,
  explainCardPercentYields,
  foldCardYields,
  payWindfallGrants,
  stripRefs,
  tallyOf,
  windfallPayout,
  windfallPayoutIsEmpty,
} from '../../../src/sim/statecraft';
import { type LeaderId } from '../../../src/sim/leaderData';
import { type OrderId } from '../../../src/sim/statecraftData';
import { unitMaxHp } from '../../../src/sim/unitData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { newGame } from '../newGameHelpers';

/** Two seats, and the wild, on a flat grassland rectangle, at war. */
function flat(leader?: LeaderId): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: true,
    players: [
      { name: 'A', color: '#a00', isHuman: true, ...(leader ? { leader } : {}) },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  const seats = realPlayers(state);
  openWar(state, seats[0]!.id, seats[1]!.id);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/**
 * Seat 1's town at (8, 5) with a farm on its hex (9, 5), and seat 0's raider
 * standing on the farm. Seat 0 holds a town of its own at (2, 2).
 */
function raid(
  type = 'warrior',
  leader?: LeaderId,
): { state: GameState; town: City; home: City; raider: Unit; farm: Tile } {
  const state = flat(leader);
  const home = foundCityAt(state, 0, at(state, 2, 2))!;
  const town = foundCityAt(state, 1, at(state, 8, 5))!;
  const farm = at(state, 9, 5);
  raiseImprovement(farm, 'farm' as never, state.turn);
  const raider = createUnit(state, 0, type as never, farm.col, farm.row);
  bumpRevision(state);
  return { state, town, home, raider, farm };
}

const wildId = (state: GameState): number => state.players.find((player) => player.barbarian === true)!.id;

/** The simulation's sources, read as text (the `slateRegister.test.ts` idiom). */
const SIM_SOURCES = import.meta.glob('../../../src/sim/**/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

describe('Dominion D3 — the pillage tally and record', () => {
  it('counts every pillage for The Captive Craftsmen and The Sagas', () => {
    const { state, raider, farm } = raid();
    slot(state, 0, 'theCaptiveCraftsmen');
    slot(state, 0, 'theSagas');
    const player = playerById(state, 0)!;
    expect(player.hexesPillaged).toBeUndefined();
    pillageAt(state, raider, farm);
    expect(player.hexesPillaged).toBe(1);
    expect(tallyOf(player.statecraft, 'theCaptiveCraftsmen' as OrderId)).toBe(1);
    bumpRevision(state);
    // +1 science at the empire per hex (the production is the capital's; see
    // the last test in this file).
    expect(foldCardYields(explainCardEmpireYields(state, 0)).science).toBe(1);
    // The Sagas: +1% for every three hexes, so one hex pays nothing yet.
    const home = state.cities.find((city) => city.ownerId === 0)!;
    const percent = (voice: string): number =>
      explainCardPercentYields(state, home)
        .filter((line) => line.yield === voice)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent('culture')).toBe(0);
    player.hexesPillaged = 7;
    bumpRevision(state);
    expect(percent('culture')).toBe(2);
    expect(percent('gold')).toBe(2);
    player.hexesPillaged = 300;
    bumpRevision(state);
    expect(percent('culture')).toBe(30);
  });

  /**
   * The coordinator's second condition: `Player.hexesPillaged` is written in
   * one place. The write is in `payPillage`, a helper `improvements.ts` does
   * not export, and only `pillageAt` calls it: once for the raid's own hex and
   * once for each hex The Horde burns. Read from the sources, so a second
   * writer anywhere under `src/sim` fails here.
   */
  it('writes the record in one place, reached only from the pillage verb', () => {
    const writes = Object.entries(SIM_SOURCES).flatMap(([path, text]) =>
      text
        .split('\n')
        .filter((line) => /\.hexesPillaged\s*(=[^=]|\+=)/.test(line))
        .map(() => path.slice(path.indexOf('src/sim/'))),
    );
    expect(writes).toEqual(['src/sim/improvements.ts']);
    const text = SIM_SOURCES['../../../src/sim/improvements.ts']!;
    const helper = text.indexOf('\nfunction payPillage(');
    const write = text.search(/\.hexesPillaged\s*(=[^=]|\+=)/);
    const next = text.indexOf('\nfunction ', helper + 1);
    const nextExport = text.indexOf('\nexport ', helper + 1);
    const end = Math.min(...[next, nextExport].filter((at) => at > 0), text.length);
    expect(helper).toBeGreaterThan(0);
    expect(write > helper && write < end).toBe(true);
    // The two calls, both inside `pillageAt`.
    const verb = text.indexOf('\nexport function pillageAt(');
    const verbEnd = text.indexOf('\n}\n', verb);
    const calls = [...text.matchAll(/[^\w]payPillage\(/g)].map((match) => match.index ?? -1);
    const outsideDefinition = calls.filter((at) => at !== helper + 9);
    expect(outsideDefinition).toHaveLength(2);
    for (const at of outsideDefinition) expect(at > verb && at < verbEnd).toBe(true);
  });

  /**
   * The coordinator's first condition: a barbarian's pillage pays no
   * card rider, moves no record or tally of a real empire, and runs none of
   * The Horde's, The Harrying's or The Chevauchée's extras. The wild holds no
   * cards in play, so the test puts all of them in the wild's own chairs as
   * well as in both seats', to show that the guard in `pillageAt` holds even
   * then.
   */
  it('counts nothing, pays nothing and spreads nothing for the wild', () => {
    const { state, farm, town } = raid();
    // Seat 1's other work beside the raid, which The Horde would burn.
    const beside = at(state, 9, 4);
    expect(tileNeighbors(state.map, farm)).toContain(beside);
    expect(tileOwnerPlayerId(state, beside.col, beside.row)).toBe(1);
    raiseImprovement(beside, 'farm' as never, state.turn);
    const wild = wildId(state);
    const cards = ['theCaptiveCraftsmen', 'theHorde', 'theHarrying', 'theChevauchee', 'thePlunderTrains'];
    for (const id of [0, 1, wild]) for (const card of cards) slot(state, id, card);
    const raider = createUnit(state, wild, 'warrior', farm.col, farm.row);
    raider.hp = 10;
    const books = (): string =>
      JSON.stringify(state.players.map((p) => [p.hexesPillaged, p.gold, p.statecraft.tallies]));
    const before = books();
    const rng = state.rng.state;
    const townHp = town.hp;
    const report = pillageAt(state, raider, farm);
    expect(farm.improvement).toBeUndefined();
    expect(books()).toBe(before);
    for (const player of state.players) expect(player.hexesPillaged).toBeUndefined();
    // No strike drew a roll or touched a wall, no town fell into unrest, and the
    // work beside the hex still stands.
    expect(state.rng.state).toBe(rng);
    expect(town.hp).toBe(townHp);
    expect(town.unrest).toBeUndefined();
    expect(beside.improvement).toBe('farm');
    expect(report.strikes).toBeUndefined();
    expect(report.unrest).toBeUndefined();
    expect(report.spread).toBeUndefined();
    // The wild keeps the bandage and nothing more.
    expect(raider.hp).toBe(10 + 25);
  });
});

describe('Dominion D3 — where a grant lands', () => {
  it('The Plunder Trains send their food and hammers to the capital, not the nearest town', () => {
    const { state, farm, home } = raid();
    // A second town of seat 0's, nearer the raid than the capital.
    const near = foundCityAt(state, 0, at(state, 11, 5))!;
    slot(state, 0, 'thePlunderTrains');
    const before = [home.hammerBasket, home.foodBasket, near.hammerBasket, near.foodBasket];
    // The delivery alone, before any basket settles (the next test settles).
    const payout = windfallPayout(state, 0, 'pillage', 25, 25, { actor: 'warrior' });
    payWindfallGrants(state, playerById(state, 0)!, payout, { col: farm.col, row: farm.row });
    expect(home.hammerBasket - before[0]!).toBe(30);
    expect(home.foodBasket - before[1]!).toBe(15);
    expect([near.hammerBasket, near.foodBasket]).toEqual([before[2], before[3]]);
  });

  it('settles the grain at once, so a capital it fills grows before the turn ends', () => {
    const { state, raider, farm, home } = raid();
    slot(state, 0, 'thePlunderTrains');
    const people = home.population;
    home.foodBasket = growthThreshold(people) - 10;
    pillageAt(state, raider, farm);
    expect(home.population).toBe(people + 1);
  });

  it('The Outriders pay every town for a camp cleared', () => {
    const state = flat();
    const a = foundCityAt(state, 0, at(state, 2, 2))!;
    const b = foundCityAt(state, 0, at(state, 10, 7))!;
    slot(state, 0, 'theOutriders');
    const before = [a.hammerBasket, b.hammerBasket];
    payWindfallGrants(state, playerById(state, 0)!, windfallPayout(state, 0, 'camp'), { col: 2, row: 3 });
    expect(a.hammerBasket - before[0]!).toBe(8);
    expect(b.hammerBasket - before[1]!).toBe(8);
  });

  it('Armoury Guilds pay the nearest town with an Armoury, at the fallen unit’s strength', () => {
    const state = flat();
    const near = foundCityAt(state, 0, at(state, 4, 4))!;
    const armoury = foundCityAt(state, 0, at(state, 12, 4))!;
    slot(state, 0, 'armouryGuilds');
    // With no Armoury anywhere the grant has no town to land in, so it pays
    // nothing and prints nothing.
    expect(windfallPayoutIsEmpty(windfallPayout(state, 0, 'death', 0, 0, { strength: 20 }))).toBe(true);
    armoury.buildings.push('armoury' as never);
    bumpRevision(state);
    const before = [near.hammerBasket, armoury.hammerBasket];
    const payout = windfallPayout(state, 0, 'death', 0, 0, { strength: 20 });
    payWindfallGrants(state, playerById(state, 0)!, payout, { col: 5, row: 4 });
    expect(near.hammerBasket).toBe(before[0]);
    expect(armoury.hammerBasket - before[1]!).toBe(20);
  });
});

describe('Dominion D3 — what a pillage can do', () => {
  it('The Yam heals a mounted raider fully, and a foot soldier only by the usual bandage', () => {
    const horse = raid('horseman');
    slot(horse.state, 0, 'theYam');
    horse.raider.hp = 10;
    pillageAt(horse.state, horse.raider, horse.farm);
    expect(horse.raider.hp).toBe(unitMaxHp(horse.raider));
    const foot = raid('warrior');
    slot(foot.state, 0, 'theYam');
    foot.raider.hp = 10;
    pillageAt(foot.state, foot.raider, foot.farm);
    expect(foot.raider.hp).toBe(10 + 25);
  });

  it('The Chevauchée strikes the enemy towns within three hexes, one roll each, and never takes one', () => {
    const { state, raider, farm, town } = raid();
    const far = foundCityAt(state, 1, at(state, 14, 8))!;
    slot(state, 0, 'theChevauchee');
    const before = town.hp;
    const farBefore = far.hp;
    // One roll for the one town in reach: the generator moves exactly one draw.
    const expected = cloneRng(state.rng);
    nextRange(expected, 0, 1);
    const report = pillageAt(state, raider, farm);
    expect(state.rng.state).toBe(expected.state);
    expect(town.hp).toBeLessThan(before);
    expect(town.hp).toBeGreaterThanOrEqual(1);
    expect(town.ownerId).toBe(1);
    expect(far.hp).toBe(farBefore);
    expect(report.strikes).toEqual([{ cityId: town.id, damage: before - town.hp }]);
  });

  it('rolls once for each town in reach, in founding order, and skips a town on its floor', () => {
    const { state, raider, farm, town } = raid();
    // A second enemy town three hexes from the raid, and a third on its floor.
    const second = foundCityAt(state, 1, at(state, 12, 5))!;
    const floored = foundCityAt(state, 1, at(state, 9, 8))!;
    floored.hp = 1;
    slot(state, 0, 'theChevauchee');
    const expected = cloneRng(state.rng);
    nextRange(expected, 0, 1);
    nextRange(expected, 0, 1);
    const report = pillageAt(state, raider, farm);
    expect(state.rng.state).toBe(expected.state);
    expect(report.strikes?.map((hit) => hit.cityId)).toEqual([town.id, second.id]);
    expect(floored.hp).toBe(1);
  });

  it('strikes the same way twice from the same board', () => {
    const run = (): number => {
      const { state, raider, farm, town } = raid();
      slot(state, 0, 'theChevauchee');
      pillageAt(state, raider, farm);
      return town.hp;
    };
    expect(run()).toBe(run());
  });

  it('reads a town’s walls the way a fight at the walls does', () => {
    const { state, town } = raid();
    const knight = createUnit(state, 0, 'knight', 7, 5);
    const view = previewCombat(state, knight.id, { col: town.col, row: town.row });
    if (!view.ok) throw new Error(view.error);
    expect(view.cityPhase).toBe('walls');
    expect(cityWallsStrength(state, town)).toBe(view.defenderStrength);
  });

  it('The Harrying throws an ungarrisoned enemy town beside the hex into unrest', () => {
    const bare = raid();
    slot(bare.state, 0, 'theHarrying');
    const report = pillageAt(bare.state, bare.raider, bare.farm);
    expect(bare.town.unrest).toBeDefined();
    expect(report.unrest).toEqual([bare.town.id]);
    // A garrison keeps the town calm.
    const guarded = raid();
    slot(guarded.state, 0, 'theHarrying');
    createUnit(guarded.state, 1, 'warrior', guarded.town.col, guarded.town.row);
    pillageAt(guarded.state, guarded.raider, guarded.farm);
    expect(guarded.town.unrest).toBeUndefined();
    // A town already in unrest keeps the record it has.
    const restless = raid();
    slot(restless.state, 0, 'theHarrying');
    restless.town.unrest = { target: 99, progress: 7, unguarded: 3 };
    pillageAt(restless.state, restless.raider, restless.farm);
    expect(restless.town.unrest).toEqual({ target: 99, progress: 7, unguarded: 3 });
  });

  it('The Horde burns every enemy work beside the hex, each a full pillage, for one movement and one heal', () => {
    const { state, raider, farm, town } = raid();
    slot(state, 0, 'theHorde');
    const enemy: Tile[] = [];
    for (const near of tileNeighbors(state.map, farm)) {
      if (tileOwnerPlayerId(state, near.col, near.row) !== 1) continue;
      if (near.col === town.col && near.row === town.row) continue;
      raiseImprovement(near, 'farm' as never, state.turn);
      enemy.push(near);
    }
    // A work on nobody's ground beside the raid is nobody's enemy, and stays.
    const wild = tileNeighbors(state.map, farm).find(
      (near) => tileOwnerPlayerId(state, near.col, near.row) === null,
    )!;
    raiseImprovement(wild, 'farm' as never, state.turn);
    bumpRevision(state);
    expect(enemy.length).toBeGreaterThan(0);
    const moves = raider.movesLeft;
    raider.hp = 10;
    const gold = playerById(state, 0)!.gold;
    const report = pillageAt(state, raider, farm);
    for (const tile of enemy) expect(tile.improvement).toBeUndefined();
    expect(wild.improvement).toBe('farm');
    expect(report.spread?.length).toBe(enemy.length);
    // Every hex burnt pays its own salvage and counts on the record.
    expect(playerById(state, 0)!.gold - gold).toBe(25 * (1 + enemy.length));
    expect(playerById(state, 0)!.hexesPillaged).toBe(1 + enemy.length);
    // One point of movement and one bandage, for the whole raid.
    expect(raider.movesLeft).toBe(moves - 1);
    expect(raider.hp).toBe(10 + 25);
  });
});

describe('Dominion D3 — the raider named on the occasion', () => {
  /**
   * `pillageAt` names the raider's type on the occasion since D3, for The Yam.
   * A rider that asks for a class and is handed no raider does not ride, so the
   * Mandekalu's own salvage rider (`data/units.json`: +100% on its own raids)
   * never paid before this batch. It pays now, and only for the Mandekalu.
   */
  it('wakes the Mandekalu’s own salvage rider', () => {
    const own = raid('mandekalu', 'mansaMusa');
    expect(pillageAt(own.state, own.raider, own.farm).gold).toBe(2 * 25);
    const other = raid('knight', 'mansaMusa');
    expect(pillageAt(other.state, other.raider, other.farm).gold).toBe(25);
  });
});

describe('Dominion D3 — the words', () => {
  it('describes each card in a first-time player’s words', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theOutriders')).toEqual([
      'claiming a ruin grants +8 production to every city',
      'clearing a barbarian camp grants +8 production to every city',
    ]);
    expect(said('armouryGuilds')).toEqual([
      'losing a unit grants production equal to its strength to your nearest city with an Armoury',
    ]);
    expect(said('thePlunderTrains')).toEqual([
      'pillaging grants +30 production to your capital',
      'pillaging grants +15 food to your capital',
    ]);
    expect(said('theYam')).toEqual(['for mounted units alone, pillaging heals the unit fully']);
    expect(said('theChevauchee')).toEqual([
      'pillaging strikes every enemy city within 3 hexes with 50% of the unit’s strength, and never takes it',
    ]);
    expect(said('theHorde')).toEqual(['pillaging also pillages every enemy improvement beside the hex']);
    expect(said('theHarrying')).toEqual([
      'pillaging throws each enemy city beside the hex that has no garrison into unrest',
    ]);
    expect(said('interiorLines')[0]).toBe('a step along a road costs 40% less movement');
  });

  it('pays the city yields of The Captive Craftsmen in the capital', () => {
    const { state, raider, farm, home } = raid();
    slot(state, 0, 'theCaptiveCraftsmen');
    pillageAt(state, raider, farm);
    bumpRevision(state);
    const production = explainCardCityYields(state, home).reduce((sum, line) => sum + line.production, 0);
    expect(production).toBe(1);
  });
});
