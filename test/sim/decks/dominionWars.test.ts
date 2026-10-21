/**
 * **Dominion batch D6, "captures, commissions and the end of a war"**
 * (`docs/plans/dominion-build-triage.md`). `dominion.test.ts` checks the rows
 * against the sheet. This file checks that the shapes the batch added do what
 * the cards say:
 *
 *   · each war keeps the towns each side took and the hexes each side pillaged,
 *     and the peace pays on them (War Reparations, Danegeld);
 *   · the end of a war, by peace or by destruction, is a moment a commission
 *     counts, with a floor on the towns taken (Commission: A Victor's Peace),
 *     and its reward is a Wildcard chair for the rest of the game;
 *   · a counted goal keeps the towns it counted, so a reward reads them and
 *     builds in the one that met it (Take the City, The Grand Campaign, The
 *     Captured Marvel), and a floor on the town's citizens;
 *   · whose original capital a town was (Hold the Capitals, The Captured
 *     Marvel);
 *   · a citizens reward (Commission: Clear the Frontier), to the capital or the
 *     smallest towns;
 *   · Spolia's production kept until an Opus is begun;
 *   · a capture amplifier (Vae Victis) and a capture measure that scales renown
 *     (Looted Art).
 */

import { describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { settleCampBounty } from '../../../src/sim/camps';
import { foundCityAt, releaseOpusBanks } from '../../../src/sim/cities';
import { applyCombat, handOverCity } from '../../../src/sim/combat';
import {
  commissionFigure,
  commissionGoalMeasure,
  commissionGoalTown,
  runCommissions,
} from '../../../src/sim/commissions';
import { settlePeacePair } from '../../../src/sim/diplomacy';
import { pillageAt } from '../../../src/sim/improvements';
import { type Tile, createMap, getTileAt, raiseImprovement } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  adoptGovernmentAt,
  describeCard,
  recordScalingOccasion,
  slotOrderAt,
  slotOrderError,
  slotTypesOf,
  stripRefs,
  tallyOf,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type DoctrineId,
  type OrderId,
  chairsAtTier,
  doctrineDef,
  governmentsAtTier,
  orderDef,
  orderFitsSlot,
} from '../../../src/sim/statecraftData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar, warBetween, warSpoils } from '../../../src/sim/wars';
import { newGame } from '../newGameHelpers';

const OPUS = { kind: 'building', id: 'theMagnumOpus' } as City['queue'][number];

/** Two seats on a flat grassland rectangle, at war unless told otherwise. */
function flat(war = true): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: true,
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 20, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(20 * 12).fill(null);
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

/** Re-reads the board after a write the test made by hand. */
function touch(state: GameState): void {
  bumpRevision(state);
}

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = seat(state, playerId).statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  touch(state);
}

/** Seats a commission in the first empty chair it fits, through the slot verb. */
function seatCommission(state: GameState, id: string): number {
  const player = seat(state, 0);
  const card = id as OrderId;
  if (!player.statecraft.orders.includes(card)) player.statecraft.orders.push(card);
  const chairs = slotTypesOf(player.statecraft);
  const index = player.statecraft.slots.findIndex(
    (held, chair) => held === null && orderFitsSlot(card, chairs[chair]!),
  );
  expect(index, 'an empty chair').toBeGreaterThanOrEqual(0);
  expect(slotOrderError(state, 0, card, index)).toBeNull();
  slotOrderAt(state, player, card, index);
  touch(state);
  return index;
}

/**
 * Seat 0 takes `town` with a warrior standing beside it. The town is left on
 * one hit point first, so the blow takes it.
 */
function take(state: GameState, town: City): void {
  town.hp = 1;
  const striker = createUnit(state, 0, 'warrior', town.col - 1, town.row);
  touch(state);
  expect(applyCombat(state, striker.id, { col: town.col, row: town.row }).ok).toBe(true);
  expect(town.ownerId).toBe(0);
  touch(state);
}

/** Signs the peace between seats 0 and 1 the way the second signature does. */
function peace(state: GameState): void {
  const war = warBetween(state, 0, 1);
  expect(war).toBeDefined();
  settlePeacePair(state, war!);
  touch(state);
}

describe('Dominion D6 — the war keeps a record, and the peace pays on it', () => {
  it('records each town taken by force and each hex pillaged, side by side', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    const capital = foundCityAt(state, 1, at(state, 16, 9))!;
    const a = foundCityAt(state, 1, at(state, 6, 4))!;
    const b = foundCityAt(state, 1, at(state, 11, 8))!;
    a.population = 3;
    b.population = 4;
    take(state, a);
    take(state, b);
    const farm = at(state, capital.col - 1, capital.row);
    raiseImprovement(farm, 'farm' as never, state.turn);
    const raider = createUnit(state, 0, 'warrior', farm.col, farm.row);
    touch(state);
    pillageAt(state, raider, farm);
    const war = warBetween(state, 0, 1)!;
    expect(war.taken).toEqual([
      { by: 0, cityId: a.id },
      { by: 0, cityId: b.id },
    ]);
    expect(war.pillaged).toEqual([{ by: 0, hexes: 1 }]);
    expect(warSpoils(state, war, 0)).toEqual({ towns: 2, population: 7, hexes: 1 });
    expect(warSpoils(state, war, 1)).toEqual({ towns: 0, population: 0, hexes: 0 });
    // A town given back no longer counts (the triage's reading 31).
    handOverCity(state, b, 1);
    expect(warSpoils(state, war, 0)).toEqual({ towns: 1, population: 3, hexes: 1 });
  });

  it('War Reparations pays twenty gold and ten culture for each citizen of the towns taken', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 1, at(state, 16, 9));
    const a = foundCityAt(state, 1, at(state, 6, 4))!;
    const b = foundCityAt(state, 1, at(state, 11, 8))!;
    a.population = 3;
    b.population = 4;
    slot(state, 0, 'dominionWarReparations');
    take(state, a);
    take(state, b);
    const player = seat(state, 0);
    // A draft waiting keeps the culture in the pool where the test can read it.
    player.statecraft.pendingOrder = { options: [] };
    const gold = player.gold;
    const culture = player.culturePool;
    peace(state);
    expect(warBetween(state, 0, 1)).toBeUndefined();
    expect(player.gold - gold).toBe(140);
    expect(player.culturePool - culture).toBe(70);
  });

  it('Danegeld pays forty gold and forty culture for each of their hexes pillaged in that war', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    const town = foundCityAt(state, 1, at(state, 12, 6))!;
    slot(state, 0, 'danegeld');
    for (const col of [town.col - 1, town.col + 1]) {
      const farm = at(state, col, town.row);
      raiseImprovement(farm, 'farm' as never, state.turn);
      const raider = createUnit(state, 0, 'warrior', farm.col, farm.row);
      touch(state);
      pillageAt(state, raider, farm);
    }
    const player = seat(state, 0);
    player.statecraft.pendingOrder = { options: [] };
    const gold = player.gold;
    const culture = player.culturePool;
    peace(state);
    expect(player.gold - gold).toBe(80);
    expect(player.culturePool - culture).toBe(80);
  });

  it('the peace pays nothing to a side that took and pillaged nothing', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 1, at(state, 12, 6));
    slot(state, 1, 'dominionWarReparations');
    slot(state, 1, 'danegeld');
    const other = seat(state, 1);
    const gold = other.gold;
    peace(state);
    expect(other.gold).toBe(gold);
  });
});

describe('Dominion D6 — Commission: A Victor’s Peace', () => {
  it('is met by a peace after taking two towns, and adds a Wildcard chair for the rest of the game', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 1, at(state, 16, 9));
    const a = foundCityAt(state, 1, at(state, 6, 4))!;
    const b = foundCityAt(state, 1, at(state, 11, 8))!;
    seatCommission(state, 'dominionAVictorsPeace');
    const player = seat(state, 0);
    const sc = player.statecraft;
    take(state, a);
    take(state, b);
    peace(state);
    expect(tallyOf(sc, 'dominionAVictorsPeace' as OrderId)).toBe(1);
    const chairs = sc.slots.length;
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual(['dominionAVictorsPeace']);
    expect(reports[0]!.lines).toEqual(['one more Wildcard chair']);
    expect(sc.chairsWon).toBe(1);
    expect(sc.slots).toHaveLength(chairs + 1);
    expect(sc.slots[chairs]).toBeNull();
    // The council screen draws `slotTypesOf`, so the new chair shows as a
    // Wildcard chair with no new control.
    expect(slotTypesOf(sc)[chairs]).toBe('wildcard');
    // And it survives an adoption.
    sc.pendingGovernment = { tier: 4, options: [...governmentsAtTier(4)] };
    expect(adoptGovernmentAt(state, player, 0)).not.toBeNull();
    expect(sc.slots).toHaveLength(chairsAtTier(4) + 1);
    expect(slotTypesOf(sc)[sc.slots.length - 1]).toBe('wildcard');
  });

  it('is not met by a peace after taking one town', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 1, at(state, 16, 9));
    const a = foundCityAt(state, 1, at(state, 6, 4))!;
    seatCommission(state, 'dominionAVictorsPeace');
    take(state, a);
    peace(state);
    expect(tallyOf(seat(state, 0).statecraft, 'dominionAVictorsPeace' as OrderId)).toBe(0);
    expect(runCommissions(state)).toEqual([]);
  });

  it('is met by destroying the empire after taking two of its towns', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    const a = foundCityAt(state, 1, at(state, 6, 4))!;
    const b = foundCityAt(state, 1, at(state, 11, 8))!;
    seatCommission(state, 'dominionAVictorsPeace');
    take(state, a);
    take(state, b);
    expect(seat(state, 1).eliminated).toBe(true);
    expect(tallyOf(seat(state, 0).statecraft, 'dominionAVictorsPeace' as OrderId)).toBe(1);
  });
});

describe('Dominion D6 — a goal keeps the towns it counted', () => {
  it('Take the City’s D6 row counts only a town of five or more, and builds a Barracks in it', () => {
    // Since Dominion batch D10 Take the City asks for eight citizens and its
    // reward is an institution (`dominionThemeCards.test.ts`). No row uses a
    // building reward or a goal-scaled payout on a single capture now, so the
    // D6 row is borrowed for this test and put back afterwards.
    const def = orderDef('dominionTakeTheCity' as OrderId);
    const kept = def.commission;
    def.commission = {
      goals: [{ kind: 'counted', occasion: 'cityCaptured', count: 1, minPopulation: 5 }],
      reward: [
        { yield: 'culture', amount: 23, fromGoal: 'population' },
        { yield: 'science', amount: 23, fromGoal: 'population' },
        { building: 'barracks' },
      ],
    };
    try {
      expect(
        describeCard('dominionTakeTheCity' as OrderId)
          .map((clause) => stripRefs(clause.text))
          .join(' | '),
      ).toContain('and a free Barracks in that city');
      const state = flat();
      foundCityAt(state, 0, at(state, 2, 2));
      foundCityAt(state, 1, at(state, 16, 9));
      const small = foundCityAt(state, 1, at(state, 6, 4))!;
      const big = foundCityAt(state, 1, at(state, 11, 8))!;
      small.population = 4;
      big.population = 6;
      seatCommission(state, 'dominionTakeTheCity');
      const sc = seat(state, 0).statecraft;
      take(state, small);
      expect(tallyOf(sc, 'dominionTakeTheCity' as OrderId)).toBe(0);
      take(state, big);
      expect(tallyOf(sc, 'dominionTakeTheCity' as OrderId)).toBe(1);
      expect(commissionGoalTown(state, 0, 'dominionTakeTheCity' as OrderId)?.id).toBe(big.id);
      seat(state, 0).statecraft.pendingOrder = { options: [] };
      const reports = runCommissions(state);
      expect(reports[0]!.lines).toEqual([
        '+138 culture',
        '+138 science',
        `a free Barracks in ${big.name}`,
      ]);
      expect(big.buildings).toContain('barracks');
      expect(small.buildings).not.toContain('barracks');
    } finally {
      def.commission = kept;
    }
  });

  it('The Grand Campaign pays ten times the citizens of the three towns it counted', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 1, at(state, 18, 10));
    const towns = [
      foundCityAt(state, 1, at(state, 6, 3))!,
      foundCityAt(state, 1, at(state, 11, 6))!,
      foundCityAt(state, 1, at(state, 6, 9))!,
    ];
    towns[0]!.population = 2;
    towns[1]!.population = 3;
    towns[2]!.population = 4;
    seatCommission(state, 'dominionTheGrandCampaign');
    for (const town of towns) take(state, town);
    expect(commissionGoalMeasure(state, 0, 'dominionTheGrandCampaign' as OrderId, 'population')).toBe(9);
    seat(state, 0).statecraft.pendingOrder = { options: [] };
    const reports = runCommissions(state);
    expect(reports[0]!.lines).toEqual(expect.arrayContaining(['+90 science', '+90 culture']));
  });

  it('The Captured Marvel counts another empire’s original capital or a world wonder, and not your own capital', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    const theirs = foundCityAt(state, 1, at(state, 11, 8))!;
    expect(home.originalCapitalOf).toBe(0);
    expect(theirs.originalCapitalOf).toBe(1);
    foundCityAt(state, 0, at(state, 16, 2));
    seatCommission(state, 'dominionTheCapturedMarvel');
    const sc = seat(state, 0).statecraft;
    // Your own first town, handed over and taken back, is not another
    // empire's original capital.
    handOverCity(state, home, 1);
    take(state, home);
    expect(tallyOf(sc, 'dominionTheCapturedMarvel' as OrderId)).toBe(0);
    theirs.population = 5;
    theirs.buildings.push('stonehenge' as never);
    take(state, theirs);
    expect(tallyOf(sc, 'dominionTheCapturedMarvel' as OrderId)).toBe(1);
    seat(state, 0).statecraft.pendingOrder = { options: [] };
    const reports = runCommissions(state);
    expect(reports[0]!.lines).toEqual(
      expect.arrayContaining(['+100 science', '+100 culture', '+200 science', '+200 culture']),
    );
  });

  it('Hold the Capitals counts only other empires’ original capitals', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    const theirs = foundCityAt(state, 1, at(state, 11, 8))!;
    foundCityAt(state, 1, at(state, 16, 2));
    expect(commissionFigure(state, 0, 'originalCapitalsHeld')).toBe(0);
    handOverCity(state, home, 1);
    take(state, home);
    expect(commissionFigure(state, 0, 'originalCapitalsHeld')).toBe(0);
    take(state, theirs);
    expect(commissionFigure(state, 0, 'originalCapitalsHeld')).toBe(1);
  });
});

describe('Dominion D6 — citizens as a reward', () => {
  it('Battle Honours grants two citizens in the capital', () => {
    // Clear the Frontier's reward until Dominion batch D9, when the two
    // commissions traded rewards.
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    seatCommission(state, 'dominionBattleHonours');
    for (let kill = 0; kill < 6; kill++) recordScalingOccasion(state, 0, 'unitKilled');
    const before = capital.population;
    const reports = runCommissions(state);
    expect(reports[0]!.lines).toEqual(expect.arrayContaining([`+2 citizens in ${capital.name}`]));
    expect(capital.population).toBe(before + 2);
  });

  it('can send the citizens to the smallest towns instead, ties to the earlier town', () => {
    const state = flat(false);
    const a = foundCityAt(state, 0, at(state, 2, 2))!;
    const b = foundCityAt(state, 0, at(state, 8, 2))!;
    const c = foundCityAt(state, 0, at(state, 14, 2))!;
    a.population = 5;
    b.population = 2;
    c.population = 2;
    createUnit(state, 0, 'warrior', 3, 3);
    // The reward shape The Wide Country will use, tried on a row for the test.
    const spec = orderDef('dominionClearTheFrontier' as OrderId).commission!;
    const before = spec.reward;
    spec.reward = [{ citizens: 2, citizensTo: { smallest: 2 } }];
    try {
      seatCommission(state, 'dominionClearTheFrontier');
      for (let index = 0; index < 2; index++) settleCampBounty(state, 0, { col: 3, row: 3 });
      // The camps' own bounty may feed the nearest town, so the reward is
      // measured from here.
      const before = [a.population, b.population, c.population];
      runCommissions(state);
      expect([a.population, b.population, c.population]).toEqual([before[0], before[1]! + 2, before[2]! + 2]);
      expect(describeCard('dominionClearTheFrontier' as OrderId)[1]!.text).toBe(
        'Reward: +2 citizens in each of your 2 smallest cities',
      );
    } finally {
      spec.reward = before;
    }
  });
});

describe('Dominion D6 — Spolia keeps the production until an Opus is begun', () => {
  it('banks half the taken Opus when you raise none, and releases it when you do', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    const theirs = foundCityAt(state, 1, at(state, 11, 8))!;
    foundCityAt(state, 1, at(state, 16, 2));
    theirs.queue = [OPUS];
    theirs.hammerBasket = 80;
    slot(state, 0, 'dominionSpolia');
    const basket = home.hammerBasket;
    take(state, theirs);
    const player = seat(state, 0);
    expect(player.opusBank).toBe(40);
    expect(home.hammerBasket).toBe(basket);
    // Nothing moves while no town raises the Opus.
    releaseOpusBanks(state);
    expect(player.opusBank).toBe(40);
    home.queue = [OPUS];
    releaseOpusBanks(state);
    expect(player.opusBank).toBeUndefined();
    expect(home.hammerBasket).toBe(basket + 40);
  });
});

describe('Dominion D6 — Vae Victis and Looted Art', () => {
  /** Seat 1's town at (11, 8) with a wonder and an Academy in its borders. */
  function marvel(state: GameState): City {
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 1, at(state, 16, 2));
    const town = foundCityAt(state, 1, at(state, 11, 8))!;
    town.population = 4;
    town.buildings.push('stonehenge' as never);
    raiseImprovement(at(state, 12, 8), 'academy' as never, state.turn);
    touch(state);
    return town;
  }

  /**
   * What taking the marvel town pays seat 0 with these cards seated: the
   * science and renown gained, the Opus production kept, and how many timed
   * effects Hegemony hung. The capture's own Triumph pays renown too, so a test
   * compares two runs rather than reading one.
   */
  function takeMarvel(cards: string[]): { science: number; renown: number; kept: number; hung: number } {
    const state = flat();
    const town = marvel(state);
    town.queue = [OPUS];
    town.hammerBasket = 80;
    for (const id of cards) slot(state, 0, id);
    const player = seat(state, 0);
    player.researching = null;
    delete player.researchQueue;
    const science = player.sciencePool;
    const renown = player.renownPool;
    take(state, town);
    return {
      science: player.sciencePool - science,
      renown: player.renownPool - renown,
      kept: player.opusBank ?? 0,
      hung: (player.timed ?? []).filter((entry) => entry.card === 'dominionHegemony').length,
    };
  }

  it('Looted Art grants 20 renown for each great-person work and wonder inside the town', () => {
    // A wonder and an Academy: two, so 40 renown.
    expect(takeMarvel(['lootedArt']).renown - takeMarvel([]).renown).toBe(40);
  });

  it('Vae Victis pays an Order’s capture yields, renown and Opus production twice', () => {
    const cards = ['carriedOffScholars', 'lootedArt', 'dominionSpolia', 'dominionHegemony'];
    const once = takeMarvel(cards);
    const twice = takeMarvel(['vaeVictis', ...cards]);
    // Carried-Off Scholars: ten science for each of four citizens, twice.
    expect(once.science).toBe(40);
    expect(twice.science).toBe(80);
    // Looted Art's 40 renown, twice.
    expect(twice.renown - once.renown).toBe(40);
    // Spolia: half of 80 hammers, twice, kept for the Opus.
    expect(once.kept).toBe(40);
    expect(twice.kept).toBe(80);
    // A timed effect is not doubled: Hegemony hangs its +30% once.
    expect(twice.hung).toBe(once.hung);
  });

  it('Vae Victis does not scale a Doctrine’s capture rider', () => {
    const state = flat();
    const doctrine = doctrineDef('theUniversalMonarchy' as DoctrineId);
    const effects = doctrine.effects;
    doctrine.effects = [
      ...effects,
      { kind: 'windfallRider', occasion: 'capture', grant: { yield: 'gold', amount: 10 } },
    ];
    try {
      seat(state, 0).statecraft.doctrines.push('theUniversalMonarchy' as DoctrineId);
      slot(state, 0, 'vaeVictis');
      const payout = windfallPayout(state, 0, 'capture', 0, 0, {});
      expect(payout.grants.map((grant) => grant.amount)).toEqual([10]);
    } finally {
      doctrine.effects = effects;
      touch(state);
    }
  });
});

describe('Dominion D6 — words and the bot', () => {
  it('prints every new and reworked card in its own words', () => {
    const words = (id: string): string =>
      describeCard(id as OrderId)
        .map((clause) => stripRefs(clause.text))
        .join(' | ');
    expect(words('dominionWarReparations')).toContain(
      'making peace grants gold equal to 20 times the citizens of the cities you took from that empire in that war and still hold',
    );
    expect(words('danegeld')).toContain(
      "making peace grants +40 gold for each of that empire's hexes you pillaged in that war",
    );
    expect(words('dominionAVictorsPeace')).toBe(
      'Commission. Goal: end 1 war by making peace or by destroying the other empire, after taking 2 or more of its cities in that war, while this card is seated | ' +
        'Reward: one more Wildcard chair for the rest of the game | then this card leaves its chair and is never seated again',
    );
    // Since Dominion batch D10: eight citizens, and an institution for the
    // captures after it. The D6 words are pinned by the borrowed row above.
    expect(words('dominionTakeTheCity')).toContain('capture 1 city of 8 or more citizens');
    expect(words('dominionTakeTheCity')).toContain(
      'for the rest of the game, capturing a city grants +250 science for each age you have reached',
    );
    expect(words('dominionTheGrandCampaign')).toContain("science equal to 10 times those cities' total population");
    expect(words('dominionTheCapturedMarvel')).toContain('+200 science for each world wonder in it');
    expect(words('vaeVictis')).toBe('what your Orders pay for capturing a city is paid twice');
    expect(words('lootedArt')).toBe(
      'capturing a city grants +20 renown for each great-person work and wonder inside its borders',
    );
    for (const id of [
      'dominionWarReparations',
      'danegeld',
      'dominionAVictorsPeace',
      'dominionTakeTheCity',
      'vaeVictis',
      'lootedArt',
    ]) {
      for (const clause of describeCard(id as OrderId)) {
        expect(stripRefs(clause.text), id).not.toContain('[[');
        expect(clause.deferred, id).not.toBe(true);
      }
    }
  });

  it('prices Vae Victis by the capture riders the seat has seated', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    const player = seat(state, 0);
    const worth = (): number => scoreCard(player, 'vaeVictis' as OrderId, valueContext(state, player));
    const alone = worth();
    slot(state, 0, 'carriedOffScholars');
    expect(worth()).toBeGreaterThan(alone);
  });
});
