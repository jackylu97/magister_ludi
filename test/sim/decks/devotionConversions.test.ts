/**
 * **A conversion as a moment** (batch DV6 of
 * `docs/plans/devotion-themes-triage.md`, feature F). `devotion.test.ts` checks
 * the rows against the sheet. This file checks what the batch changed on a
 * small board:
 *
 *   · the moment (reading 3): a foreign town that turns to a religion pays
 *     the empire the religion pays, with the town, its citizens, and the
 *     first time it turns. A town of the empire's own pays nothing;
 *   · the queue (reading 4): the moment is paid when the pressing that
 *     turned the town ends, after the tide's sweep or at the end of a lump,
 *     and a town pays it at most once a turn for each religion;
 *   · Pentecost (reading 25): the moment presses a proclamation's base lump
 *     within four hexes, and the towns it turns are paid in their turn;
 *   · The Mass Baptisms (reading 26): science and culture the first time a
 *     town turns, so a town lost and won back pays once;
 *   · two empires that both hold Pentecost and turn the same towns back and
 *     forth: the chain ends, and the same board plays out the same way twice;
 *   · The Mission's tally (tidy batch Z1): a town counts at most once a turn
 *     for each religion, read off the moment's stamp.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { type Command, applyCommand } from '../../../src/sim/commands';
import { snapshotState } from '../../../src/sim/game';
import { getTileAt } from '../../../src/sim/map';
import { pressLump, spreadReligion } from '../../../src/sim/religion';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  bumpRevision,
  cityReligion,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { describeCard, stripRefs, windfallPayout } from '../../../src/sim/statecraft';
import { type OrderId, orderDef, orderIsDealt, ordersForDecks } from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

const PENTECOST = 'pentecost' as OrderId;
const BAPTISMS = 'theMassBaptisms' as OrderId;
const MISSION_HOUSES = 'missionHouses' as OrderId;
const MISSION = 'theMission' as OrderId;

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, card: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for a seat, with an empty queue. */
function town(state: GameState, owner: number, col: number, row: number, population = 4): City {
  const city = foundCityAt(state, owner, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * A religion founded by the town's owner, whose holy site is this town's
 * centre. The owner holds the site, so the religion pays it. Every citizen of
 * the given towns follows it.
 */
function religionAt(state: GameState, site: City, followers: readonly City[]): number {
  const tile = getTileAt(state.map, site.col, site.row)!;
  tile.improvement = 'holySite' as never;
  state.religions.push({
    id: state.religions.length,
    founderId: site.ownerId,
    name: `The Testament ${state.religions.length}`,
    pantheon: [],
    follower: [],
    enhancer: [],
    foundedTurn: state.turn,
    holySite: { col: site.col, row: site.row },
  } as never);
  const religion = state.religions.length - 1;
  for (const city of followers) city.followers = { [religion]: city.population };
  bumpRevision(state);
  return religion;
}

/**
 * Counts the moments paid to a seat. A rider that pays one gold each time is
 * hung on the seat as a timed effect, as a card's bill is, so it is live
 * without a chair. The answer is the gold gained since the call.
 */
function momentCounter(state: GameState, playerId: number): () => number {
  const player = playerById(state, playerId)!;
  player.timed = [
    ...(player.timed ?? []),
    {
      card: PENTECOST,
      effect: { kind: 'windfallRider', occasion: 'townConverted', grant: { yield: 'gold', amount: 1 } },
      expiresTurn: state.turn + 100,
    },
  ];
  bumpRevision(state);
  const start = player.gold;
  return () => player.gold - start;
}

/** The describer's clauses for a card, keyword marks stripped. */
function words(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

// --- the rows -----------------------------------------------------------------

describe('the two rows', () => {
  it('deals Pentecost and The Mass Baptisms to a Devotion seat at Tier III', () => {
    const mine = ordersForDecks(['devotion']);
    for (const id of [PENTECOST, BAPTISMS]) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(mine, id).toContain(id);
      expect(orderDef(id).band, id).toBe(3);
      expect(orderDef(id).type, id).toBe('civic');
    }
    expect(orderDef(PENTECOST).rarity).toBe('rare');
    expect(orderDef(BAPTISMS).rarity).toBe('uncommon');
  });

  it('prints both rows through the describers in plain words', () => {
    expect(words(PENTECOST)).toEqual([
      'a foreign city turning to your religion spreads your religion to every city within 4 hexes',
    ]);
    expect(words(BAPTISMS)).toEqual([
      'a foreign city turning to your religion for the first time grants science equal to 20 times its population',
      'a foreign city turning to your religion for the first time grants culture equal to 20 times its population',
    ]);
  });
});

// --- the moment ---------------------------------------------------------------

describe('the conversion moment', () => {
  /** Seat 0's holy city at (3, 5), and a town of seat 1's at (10, 5) that follows nothing. */
  function board(): { state: GameState; home: City; abroad: City; religion: number } {
    const state = bareState(30, 10);
    const home = town(state, 0, 3, 5);
    const abroad = town(state, 1, 10, 5);
    const religion = religionAt(state, home, [home]);
    return { state, home, abroad, religion };
  }

  function proclaim(state: GameState, playerId: number, col: number, row: number): void {
    const prophet = createUnit(state, playerId, 'prophet', col, row);
    bumpRevision(state);
    const result = applyCommand(state, { type: 'proclaim', playerId, unitId: prophet.id } as Command);
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
  }

  it('carries the town, its citizens, and the first time it turns', () => {
    const { state, abroad } = board();
    slot(state, 0, BAPTISMS);
    const first = windfallPayout(state, 0, 'townConverted', 0, 0, {
      townId: abroad.id,
      population: 5,
      firsts: ['conversion'],
    });
    expect(first.grants.map((grant) => [grant.yield, grant.amount])).toEqual([
      ['science', 100],
      ['culture', 100],
    ]);
    // Not the first time: The Mass Baptisms does not ride.
    const again = windfallPayout(state, 0, 'townConverted', 0, 0, { townId: abroad.id, population: 5 });
    expect(again.grants).toEqual([]);
  });

  it('pays the empire the religion pays when a proclamation turns a foreign town', () => {
    const { state, abroad, religion } = board();
    slot(state, 0, BAPTISMS);
    const count = momentCounter(state, 0);
    const seat = playerById(state, 0)!;
    const science = seat.sciencePool;
    proclaim(state, 0, 8, 5);
    expect(cityReligion(abroad)).toBe(religion);
    // Paid once, inside the command: twenty times the town's four citizens.
    expect(count()).toBe(1);
    expect(seat.sciencePool - science).toBe(80);
    expect(abroad.convertedOn).toEqual({ [religion]: state.turn });
  });

  it('pays nothing for a town of your own that turns', () => {
    const state = bareState(30, 10);
    const rivalSeat = town(state, 1, 24, 5);
    const rival = religionAt(state, rivalSeat, [rivalSeat]);
    const home = town(state, 0, 3, 5);
    const mine = religionAt(state, home, [home]);
    // A town of seat 0's that follows seat 1's religion.
    const own = town(state, 0, 10, 5);
    own.followers = { [rival]: own.population };
    bumpRevision(state);
    slot(state, 0, BAPTISMS);
    const count = momentCounter(state, 0);
    const science = playerById(state, 0)!.sciencePool;
    proclaim(state, 0, 8, 5);
    expect(cityReligion(own)).toBe(mine);
    expect(count()).toBe(0);
    expect(playerById(state, 0)!.sciencePool).toBe(science);
    expect(own.convertedOn).toBeUndefined();
  });

  it('pays The Mass Baptisms once, so a town lost and won back pays nothing more', () => {
    const state = bareState(40, 10);
    const home = town(state, 0, 3, 5);
    const mine = religionAt(state, home, [home]);
    const rivalSeat = town(state, 1, 30, 5);
    const rival = religionAt(state, rivalSeat, [rivalSeat]);
    const abroad = town(state, 1, 16, 5);
    slot(state, 0, BAPTISMS);
    const count = momentCounter(state, 0);
    const seat = playerById(state, 0)!;
    const science = seat.sciencePool;
    const lump = RULES.religion.bombLump;
    pressLump(state, state.religions[mine]!, { col: abroad.col, row: abroad.row }, 0, lump);
    expect(cityReligion(abroad)).toBe(mine);
    expect(seat.sciencePool - science).toBe(80);
    // Seat 1 wins it back, and a turn later seat 0 turns it again.
    pressLump(state, state.religions[rival]!, { col: abroad.col, row: abroad.row }, 0, lump);
    expect(cityReligion(abroad)).toBe(rival);
    state.turn += 1;
    bumpRevision(state);
    pressLump(state, state.religions[mine]!, { col: abroad.col, row: abroad.row }, 0, lump);
    expect(cityReligion(abroad)).toBe(mine);
    // The moment came twice, and The Mass Baptisms paid only the first time.
    expect(count()).toBe(2);
    expect(seat.sciencePool - science).toBe(80);
  });

  it('pays a town at most once a turn for each religion', () => {
    const state = bareState(40, 10);
    const home = town(state, 0, 3, 5);
    const mine = religionAt(state, home, [home]);
    const rivalSeat = town(state, 1, 30, 5);
    const rival = religionAt(state, rivalSeat, [rivalSeat]);
    const abroad = town(state, 1, 16, 5);
    const count = momentCounter(state, 0);
    const lump = RULES.religion.bombLump;
    const at = { col: abroad.col, row: abroad.row };
    pressLump(state, state.religions[mine]!, at, 0, lump);
    expect(count()).toBe(1);
    // Turned away and back in the same turn: the town turned, and no moment.
    pressLump(state, state.religions[rival]!, at, 0, lump);
    pressLump(state, state.religions[mine]!, at, 0, lump);
    expect(cityReligion(abroad)).toBe(mine);
    expect(count()).toBe(1);
    expect(abroad.convertedOn).toEqual({ [mine]: state.turn });
    // The stamp is a turn and nothing counts it down: the next turn pays again.
    state.turn += 1;
    bumpRevision(state);
    pressLump(state, state.religions[rival]!, at, 0, lump);
    pressLump(state, state.religions[mine]!, at, 0, lump);
    expect(count()).toBe(2);
    expect(abroad.convertedOn).toEqual({ [mine]: state.turn });
  });

  it('counts a town toward The Mission at most once a turn for each religion (tidy batch Z1)', () => {
    // This changes reading 39 of the Devotion build (batch DV6,
    // `docs/plans/devotion-themes-triage.md`). Reading 39 said the stamp
    // limits the moment but not the tally. Since tidy batch Z1 the
    // `foreignCityConverted` tally reads the same stamp (`City.convertedOn`),
    // so a town that turns, turns away and turns again in one turn counts once.
    // Before Z1 it counted twice, and one town could meet The Mission's goal
    // of two.
    const state = bareState(40, 10);
    const home = town(state, 0, 3, 5);
    const mine = religionAt(state, home, [home]);
    const rivalSeat = town(state, 1, 30, 5);
    const rival = religionAt(state, rivalSeat, [rivalSeat]);
    const abroad = town(state, 1, 16, 5);
    slot(state, 0, MISSION);
    const tally = (): number =>
      playerById(state, 0)!.statecraft.tallies.find((row) => row.card === MISSION)?.count ?? 0;
    const lump = RULES.religion.bombLump;
    const at = { col: abroad.col, row: abroad.row };
    pressLump(state, state.religions[mine]!, at, 0, lump);
    expect(cityReligion(abroad)).toBe(mine);
    expect(tally()).toBe(1);
    // Turned away and back in the same turn: the town turned again, and the
    // tally stays where it was.
    pressLump(state, state.religions[rival]!, at, 0, lump);
    pressLump(state, state.religions[mine]!, at, 0, lump);
    expect(cityReligion(abroad)).toBe(mine);
    expect(tally()).toBe(1);
    // A town won back on a later turn counts again.
    state.turn += 1;
    bumpRevision(state);
    pressLump(state, state.religions[rival]!, at, 0, lump);
    pressLump(state, state.religions[mine]!, at, 0, lump);
    expect(cityReligion(abroad)).toBe(mine);
    expect(tally()).toBe(2);
  });

  it('is paid after the tide’s sweep', () => {
    const { state, abroad, religion } = board();
    slot(state, 0, BAPTISMS);
    const count = momentCounter(state, 0);
    // Enough of the faith banked in the town to turn its four citizens.
    abroad.pressureBank = { [religion]: 4 * RULES.religion.pressurePerConvert };
    bumpRevision(state);
    const science = playerById(state, 0)!.sciencePool;
    spreadReligion(state);
    expect(cityReligion(abroad)).toBe(religion);
    expect(count()).toBe(1);
    expect(playerById(state, 0)!.sciencePool - science).toBe(80);
  });
});

// --- Pentecost ----------------------------------------------------------------

describe('Pentecost', () => {
  it('presses a proclamation’s base lump within four hexes, whatever changes a proclamation', () => {
    const state = bareState(30, 10);
    slot(state, 0, PENTECOST);
    const lumps = (): { amount: number; range: number }[] =>
      windfallPayout(state, 0, 'townConverted', 0, 0, { townId: 1, population: 4 }).pressure.map(
        (lump) => ({ amount: lump.amount, range: lump.range }),
      );
    expect(lumps()).toEqual([{ amount: RULES.religion.bombLump, range: 4 }]);
    // Mission Houses makes a proclamation press harder. This is not one.
    slot(state, 0, MISSION_HOUSES);
    expect(lumps()).toEqual([{ amount: RULES.religion.bombLump, range: 4 }]);
  });

  /**
   * Seat 0's holy city at (2, 5); seat 1's towns at (14, 5), within a
   * proclamation's reach of a prophet at (5, 5), and at (18, 5), past that
   * reach and within four hexes of the first.
   */
  function board(): { state: GameState; near: City; far: City; religion: number } {
    const state = bareState(40, 10);
    const home = town(state, 0, 2, 5);
    const near = town(state, 1, 14, 5);
    const far = town(state, 1, 18, 5);
    const religion = religionAt(state, home, [home]);
    return { state, near, far, religion };
  }

  function proclaimAt(state: GameState): void {
    const prophet = createUnit(state, 0, 'prophet', 5, 5);
    bumpRevision(state);
    const result = applyCommand(state, { type: 'proclaim', playerId: 0, unitId: prophet.id } as Command);
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
  }

  it('turns the towns around a town that turned, and pays their moments in turn', () => {
    const bare = board();
    proclaimAt(bare.state);
    expect(cityReligion(bare.near)).toBe(bare.religion);
    expect(cityReligion(bare.far)).toBeNull();

    const { state, near, far, religion } = board();
    slot(state, 0, PENTECOST);
    const count = momentCounter(state, 0);
    proclaimAt(state);
    expect(cityReligion(near)).toBe(religion);
    expect(cityReligion(far)).toBe(religion);
    // The town the proclamation turned, then the town Pentecost turned.
    expect(count()).toBe(2);
  });

  it('presses each religion its holder is paid by', () => {
    // Seat 0 holds the holy cities of two religions, at (2, 5) and (2, 8).
    const { state, near, far, religion } = board();
    const second = town(state, 0, 2, 8);
    const other = religionAt(state, second, [second]);
    slot(state, 0, PENTECOST);
    const count = momentCounter(state, 0);
    proclaimAt(state);
    // The proclamation turns the near town to the first religion. Its moment
    // presses both religions around it, the first and then the second, so
    // the far town turns to each in founding order and ends on the second.
    // That moment turns the near town to the second too.
    expect(cityReligion(far)).toBe(other);
    expect(cityReligion(near)).toBe(other);
    expect(near.convertedOn).toEqual({ [religion]: state.turn, [other]: state.turn });
    expect(far.convertedOn).toEqual({ [religion]: state.turn, [other]: state.turn });
    // One moment for each pair of town and religion, and no more.
    expect(count()).toBe(4);
  });
});

// --- two empires, one chain ---------------------------------------------------

describe('two empires that both hold Pentecost', () => {
  /**
   * Seat 0's holy city at (5, 5) and seat 1's at (45, 5), each far from the
   * front. At the front, four towns of four citizens in a row: seat 1's Q1 at
   * column 21 and P1 at 25, seat 0's P0 at 23 and Q0 at 27. Each follows its
   * owner's religion. Both seats hold Pentecost and The Mass Baptisms.
   *
   * The banks stand as if the tide had built up for some turns: forty of
   * seat 0's faith in P1 and forty of seat 1's in P0. So the next sweep turns
   * P1 to seat 0's religion and P0 to seat 1's, and both moments are queued.
   * Each Pentecost lump then turns the other side's towns, and turns its own
   * side's back. Without the limit of once a turn for each town and
   * religion, the lumps would turn the same towns back and forth for ever.
   */
  function front(): {
    state: GameState;
    towns: { q1: City; p0: City; p1: City; q0: City };
    faiths: { zero: number; one: number };
  } {
    const state = bareState(50, 10);
    const h0 = town(state, 0, 5, 5);
    const h1 = town(state, 1, 45, 5);
    const q1 = town(state, 1, 21, 5);
    const p0 = town(state, 0, 23, 5);
    const p1 = town(state, 1, 25, 5);
    const q0 = town(state, 0, 27, 5);
    const zero = religionAt(state, h0, [h0, p0, q0]);
    const one = religionAt(state, h1, [h1, q1, p1]);
    for (const seat of [0, 1]) {
      slot(state, seat, PENTECOST);
      slot(state, seat, BAPTISMS);
    }
    p1.pressureBank = { [zero]: 40 };
    p0.pressureBank = { [one]: 40 };
    bumpRevision(state);
    return { state, towns: { q1, p0, p1, q0 }, faiths: { zero, one } };
  }

  it('turn the same towns back and forth, and the chain ends', () => {
    const { state, towns, faiths } = front();
    const paid = [momentCounter(state, 0), momentCounter(state, 1)];
    const science = [0, 1].map((seat) => playerById(state, seat)!.sciencePool);
    spreadReligion(state);
    // Each pair of town and religion was queued once and paid once: seat 0
    // for P1 and Q1, seat 1 for P0 and Q0.
    expect(paid.map((count) => count())).toEqual([2, 2]);
    expect(towns.p1.convertedOn).toEqual({ [faiths.zero]: state.turn });
    expect(towns.q1.convertedOn).toEqual({ [faiths.zero]: state.turn });
    expect(towns.p0.convertedOn).toEqual({ [faiths.one]: state.turn });
    expect(towns.q0.convertedOn).toEqual({ [faiths.one]: state.turn });
    // Each was a first, so The Mass Baptisms paid twenty times four citizens
    // for each of them.
    expect([0, 1].map((seat) => playerById(state, seat)!.sciencePool - science[seat]!)).toEqual([160, 160]);
    // Where the chain left the front, in the order the moments were paid:
    // P0's moment turned Q0, P1's turned Q1 and P0 and P1 back, Q0's turned
    // P0 and P1 once more, and Q1's turned them back to seat 0's religion.
    expect(cityReligion(towns.q1)).toBe(faiths.zero);
    expect(cityReligion(towns.p0)).toBe(faiths.zero);
    expect(cityReligion(towns.p1)).toBe(faiths.zero);
    expect(cityReligion(towns.q0)).toBe(faiths.one);
  });

  it('plays out the same way twice, through the end of the turn', () => {
    const run = (): string => {
      const { state } = front();
      for (const seat of [0, 1]) {
        const result = applyCommand(state, { type: 'endTurn', playerId: seat } as Command);
        expect(result.ok, result.ok ? '' : result.error).toBe(true);
      }
      return snapshotState(state);
    };
    const once = run();
    const twice = run();
    expect(twice).toBe(once);
    // The chain ran: every front town carries a stamp of the turn that ended.
    const world = JSON.parse(once) as { cities: { convertedOn?: Record<string, number> }[] };
    expect(world.cities.filter((city) => city.convertedOn !== undefined)).toHaveLength(4);
  });
});
