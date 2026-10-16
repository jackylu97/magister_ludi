/**
 * **The Doctrine offer** (batch C3, `docs/plans/chairs-build.md`; the rulings
 * of 2026-10-15 and 2026-10-16 in `docs/plans/doctrines-governments-chairs.md`).
 *
 * Adopting a government opens a Doctrine offer of that government's Doctrine
 * tier, and the reward hands are gone. What this file checks:
 *
 *   · **the data model**: a deck's Doctrines live in its deck file, folded into
 *     the one Doctrine table; each row names its decks and its sheet tier (I to
 *     IV, `band` 1 to 4), and the government tier that offers it is derived
 *     from that, one to one (tier 4 offers Tier I, 10 Tier II, 18 Tier III and
 *     29 Tier IV);
 *   · **the bag**: a seat is offered only the Doctrines of its own decks, and
 *     never one it already holds;
 *   · **the deal**: one from each of the seat's decks, then a third from either
 *     (the interim rule, until the user rules the mix); a deck with nothing
 *     left gives its place to the rest of the bag; an empty bag deals nothing
 *     and spends no randomness, so no offer opens;
 *   · **the two answers**: take one, or pass for nothing, each refused
 *     byte-identically when there is nothing to answer;
 *   · **The Steppe Confederacy end to end**: negative authority no longer
 *     stops its holder's borders (the culture banks, the end-of-turn claim and
 *     a windfall claim), and while authority is negative its mounted units are
 *     built half again as fast;
 *   · **the bot** takes a Doctrine its effect scoring prices above nothing,
 *     and passes otherwise;
 *   · **the reward commands are gone**: the reducer knows none of them.
 */

import { describe, expect, it } from 'vitest';

import { nextBotDecision } from '../../src/ai/bot';
import {
  borderCostFor,
  borderGrowth,
  expandBorders,
  foundCityAt,
  settleBorderWindfall,
} from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type Game, dispatch, snapshotState } from '../../src/sim/game';
import { createMap, getTileAt } from '../../src/sim/map';
import { authorityOf } from '../../src/sim/meters';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import {
  adoptGovernmentAt,
  doctrineBagFor,
  drawDoctrineOffer,
  drawDoctrinePositions,
  statecraftBlocker,
} from '../../src/sim/statecraft';
import {
  type CardEffect,
  type DeckId,
  type DoctrineId,
  DECK_FILE_DOCTRINES,
  DECK_FILES,
  DOCTRINE_IDS,
  GOVERNMENT_TIERS,
  STATECRAFT,
  doctrineDef,
  governmentTierForDoctrineBand,
  governmentsAtTier,
  poolDoctrines,
} from '../../src/sim/statecraftData';
import { productionModifiers } from '../../src/sim/yields/town';
import { resetVisibility } from '../../src/sim/visibility';
import { stockDoctrines } from './statecraftHelpers';
import { createGame, newGame } from './newGameHelpers';

const STEPPE: DoctrineId = 'theSteppeConfederacy';
// Dominion batch D4's two Doctrines: a second at Tier I, and the first at Tier III.
const CONSULAR: DoctrineId = 'theConsularRoads';
const MONARCHY: DoctrineId = 'theUniversalMonarchy';
/** Dominion's Tier I Doctrines, in the order the data lists them. */
const TIER_ONE: readonly DoctrineId[] = [STEPPE, CONSULAR];

/** A duel between two named figures, so each seat holds that figure's two decks. */
function duel(first: string, second: string, seed = 11): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: first as never },
      { name: 'Bors', color: '#3a7fe8', leader: second as never },
    ],
  });
}

/** Banks this tier's government triple on the seat, as a draft reaching the rung does. */
function bankGovernment(player: Player, tier: number): void {
  player.statecraft.drafts = Math.max(player.statecraft.drafts, tier);
  player.statecraft.pendingGovernment = { tier, options: governmentsAtTier(tier) };
}

/** The retired tier-4 Doctrine rows, which a test may lend to a deck. */
const TIER_FOUR_RETIRED: readonly DoctrineId[] = DOCTRINE_IDS.filter(
  (id) => doctrineDef(id).retired === true && doctrineDef(id).tier === 4,
);

// --- the data model ------------------------------------------------------------

describe('the Doctrine data model', () => {
  it('pairs each Doctrine tier with one government tier, in order', () => {
    expect([1, 2, 3, 4].map(governmentTierForDoctrineBand)).toEqual([4, 10, 18, 29]);
    // The pairing is read off the live government tiers, so it is the ladder's.
    expect([1, 2, 3, 4].map(governmentTierForDoctrineBand)).toEqual([...GOVERNMENT_TIERS]);
    // No Tier 0 Doctrines (the user, 2026-10-15), and nothing past Tier IV.
    expect(governmentTierForDoctrineBand(0)).toBe(0);
    expect(governmentTierForDoctrineBand(5)).toBe(0);
    expect(governmentTierForDoctrineBand(1.5)).toBe(0);
  });

  it('folds the deck files’ Doctrines into the one table, each with its decks, its tier and the government tier that offers it', () => {
    const fromDecks = DECK_FILES.flatMap((file) => DECK_FILE_DOCTRINES[file]);
    expect(fromDecks).toEqual([STEPPE, CONSULAR, MONARCHY]);
    expect(DECK_FILE_DOCTRINES.dominion).toEqual([STEPPE, CONSULAR, MONARCHY]);
    for (const id of fromDecks) {
      expect(STATECRAFT.doctrines[id], id).toBeDefined();
      expect(DOCTRINE_IDS, id).toContain(id);
      const def = doctrineDef(id);
      expect(def.retired, id).toBeUndefined();
      expect(def.tier, id).toBe(governmentTierForDoctrineBand(def.band));
    }
    const steppe = doctrineDef(STEPPE);
    expect(steppe.name).toBe('The Steppe Confederacy');
    expect(steppe.decks).toEqual(['dominion']);
    expect(steppe.band).toBe(1);
    expect(steppe.tier).toBe(4);
    // The old rows stay, retired, for the Compendium and `anyCardDef`.
    const old = DOCTRINE_IDS.filter((id) => !fromDecks.includes(id));
    expect(old.length).toBeGreaterThan(40);
    for (const id of old) expect(doctrineDef(id).retired, id).toBe(true);
  });

  it('carries the two effects the sheet’s text asks for, and nothing else', () => {
    expect(doctrineDef(STEPPE).effects).toEqual([
      { kind: 'meterRule', rule: 'borderFreezeExempt', value: 1 },
      {
        kind: 'conditionRule',
        when: { test: 'authorityNegative' },
        then: [{ kind: 'productionBonus', category: 'unit', percent: 50, modelClass: 'mounted' }],
      },
    ]);
  });

  it('pools a tier’s live Doctrines alone', () => {
    expect(poolDoctrines(4)).toEqual([...TIER_ONE]);
    expect(poolDoctrines(18)).toEqual([MONARCHY]);
    for (const tier of [10, 29]) expect(poolDoctrines(tier), `tier ${tier}`).toEqual([]);
    expect(poolDoctrines(0)).toEqual([]);
  });
});

// --- the bag and the deal ------------------------------------------------------

describe('the Doctrine offer’s bag and deal', () => {
  it('offers a seat only the Doctrines of its own decks, and never one it holds', () => {
    // Taizong holds Dominion and Magisterial; Pachacuti Expansionist and Commerce.
    const g = duel('taizong', 'pachacuti');
    const taizong = playerById(g.state, 0)!;
    const pachacuti = playerById(g.state, 1)!;
    expect(doctrineBagFor(taizong, 4)).toEqual([...TIER_ONE]);
    expect(doctrineBagFor(pachacuti, 4)).toEqual([]);
    expect(doctrineBagFor(taizong, 18)).toEqual([MONARCHY]);
    for (const tier of [10, 29]) expect(doctrineBagFor(taizong, tier)).toEqual([]);
    taizong.statecraft.doctrines.push(STEPPE);
    expect(doctrineBagFor(taizong, 4)).toEqual([CONSULAR]);
  });

  it('deals nothing from an empty bag and spends no randomness', () => {
    const g = duel('taizong', 'pachacuti');
    const pachacuti = playerById(g.state, 1)!;
    const before = snapshotState(g.state);
    expect(drawDoctrineOffer(g.state, pachacuti, 4)).toEqual({ options: [] });
    expect(snapshotState(g.state)).toBe(before);
  });

  it('places one of the seat’s decks first, its other deck second, and either third', () => {
    const g = duel('taizong', 'modu');
    expect(drawDoctrinePositions(g.state, playerById(g.state, 0)!)).toEqual([
      { kind: 'deck', deck: 'dominion' },
      { kind: 'deck', deck: 'magisterial' },
      { kind: 'cross' },
    ]);
    // A seat under no figure holds every deck and samples two distinct ones.
    const rainbow = createGame({
      seed: 5,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    const positions = drawDoctrinePositions(rainbow.state, playerById(rainbow.state, 0)!);
    expect(positions).toHaveLength(3);
    const [a, b, c] = positions as [
      { kind: 'deck'; deck: DeckId },
      { kind: 'deck'; deck: DeckId },
      { kind: 'cross' },
    ];
    expect(a.kind).toBe('deck');
    expect(b.kind).toBe('deck');
    expect(a.deck).not.toBe(b.deck);
    expect(c).toEqual({ kind: 'cross' });
  });

  it('deals one Doctrine from each deck, then a third from either', () => {
    // Lend three retired tier-4 rows to Dominion and three to Magisterial, so
    // both of Taizong's decks have Doctrines of their own at tier 4.
    const dominionOnly = TIER_FOUR_RETIRED.slice(0, 3);
    const magisterialOnly = TIER_FOUR_RETIRED.slice(3, 6);
    expect(magisterialOnly).toHaveLength(3);
    const restoreA = stockDoctrines(dominionOnly, ['dominion']);
    const restoreB = stockDoctrines(magisterialOnly, ['magisterial']);
    try {
      const ofDominion = new Set<DoctrineId>([...TIER_ONE, ...dominionOnly]);
      const ofMagisterial = new Set<DoctrineId>(magisterialOnly);
      for (let seed = 1; seed <= 12; seed++) {
        const g = duel('taizong', 'modu', seed);
        const taizong = playerById(g.state, 0)!;
        const offer = drawDoctrineOffer(g.state, taizong, 4);
        expect(offer.options, `seed ${seed}`).toHaveLength(3);
        expect(new Set(offer.options).size, `seed ${seed}`).toBe(3);
        expect(ofDominion.has(offer.options[0]!), `seed ${seed}: ${offer.options[0]}`).toBe(true);
        expect(ofMagisterial.has(offer.options[1]!), `seed ${seed}: ${offer.options[1]}`).toBe(true);
        const third = offer.options[2]!;
        expect(ofDominion.has(third) || ofMagisterial.has(third), `seed ${seed}: ${third}`).toBe(true);
        // The same state deals the same offer.
        const twin = duel('taizong', 'modu', seed);
        expect(drawDoctrineOffer(twin.state, playerById(twin.state, 0)!, 4)).toEqual(offer);
      }
    } finally {
      restoreB();
      restoreA();
    }
  });

  it('gives a deck’s place to the rest of the bag when that deck has nothing left', () => {
    // Only Dominion has Doctrines here: all three places are dealt from it.
    const lent = TIER_FOUR_RETIRED.slice(0, 3);
    const restore = stockDoctrines(lent, ['dominion']);
    try {
      const g = duel('taizong', 'modu');
      const offer = drawDoctrineOffer(g.state, playerById(g.state, 0)!, 4);
      expect(offer.options).toHaveLength(3);
      for (const id of offer.options) expect(doctrineDef(id).decks, id).toEqual(['dominion']);
    } finally {
      restore();
    }
    // And a bag smaller than the offer deals the bag.
    const g = duel('taizong', 'modu');
    const dealt = drawDoctrineOffer(g.state, playerById(g.state, 0)!, 4).options;
    expect([...dealt].sort()).toEqual([...TIER_ONE].sort());
  });
});

// --- the adoption and the two answers ------------------------------------------

describe('the adoption opens the offer, and the seat takes one or passes', () => {
  it('opens the offer of the adopted government’s tier, which blocks the turn until answered', () => {
    const g = duel('taizong', 'pachacuti');
    const taizong = playerById(g.state, 0)!;
    bankGovernment(taizong, 4);
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 }).ok).toBe(true);
    expect([...(taizong.statecraft.pendingDoctrine?.options ?? [])].sort()).toEqual(
      [...TIER_ONE].sort(),
    );
    expect(statecraftBlocker(taizong)).toBe('a Doctrine offer is waiting');
    // Its own decks hold no Doctrine of the tier, so the other seat is offered
    // nothing and blocked by nothing.
    const pachacuti = playerById(g.state, 1)!;
    bankGovernment(pachacuti, 4);
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 1, choiceIndex: 0 }).ok).toBe(true);
    expect(pachacuti.statecraft.pendingDoctrine).toBeUndefined();
    expect(statecraftBlocker(pachacuti)).toBeNull();
    // A tier with no Doctrines yet opens nothing either.
    const later = duel('taizong', 'pachacuti');
    const seat = playerById(later.state, 0)!;
    bankGovernment(seat, 10);
    expect(adoptGovernmentAt(later.state, seat, 0)?.doctrines).toBeNull();
    expect(seat.statecraft.pendingDoctrine).toBeUndefined();
  });

  it('takes a Doctrine for good: held, out of every later offer, and the offer spent', () => {
    const g = duel('taizong', 'pachacuti');
    const taizong = playerById(g.state, 0)!;
    bankGovernment(taizong, 4);
    dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 });
    const [taken, left] = taizong.statecraft.pendingDoctrine!.options as [DoctrineId, DoctrineId];
    // A wrong index is refused, and nothing moves. The offer holds two since
    // Dominion batch D4, so the first index past it is 2.
    const before = snapshotState(g.state);
    expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 2 }).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
    expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(taizong.statecraft.doctrines).toEqual([taken]);
    expect(taizong.statecraft.pendingDoctrine).toBeUndefined();
    expect(statecraftBlocker(taizong)).toBeNull();
    expect(doctrineBagFor(taizong, 4)).toEqual([left]);
  });

  it('passes for nothing, and refuses both answers with nothing waiting or after the turn has ended', () => {
    const g = duel('taizong', 'pachacuti');
    const taizong = playerById(g.state, 0)!;
    for (const command of [
      { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 },
      { type: 'skipDoctrineOffer', playerId: 0 },
    ] as Command[]) {
      const before = snapshotState(g.state);
      const result = dispatch(g, command);
      expect(result.ok, command.type).toBe(false);
      if (!result.ok) expect(result.error, command.type).toContain('no Doctrine offer');
      expect(snapshotState(g.state), command.type).toBe(before);
    }
    bankGovernment(taizong, 4);
    dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 });
    // The pass costs nothing and banks nothing: no pity, no culture.
    const skips = taizong.statecraft.orderSkips;
    const culture = taizong.culturePool;
    expect(dispatch(g, { type: 'skipDoctrineOffer', playerId: 0 }).ok).toBe(true);
    expect(taizong.statecraft.pendingDoctrine).toBeUndefined();
    expect(taizong.statecraft.doctrines).toEqual([]);
    expect(taizong.statecraft.orderSkips).toBe(skips);
    expect(taizong.culturePool).toBe(culture);
    // A Doctrine passed on is not held, so it may be offered again later.
    expect(doctrineBagFor(taizong, 4)).toEqual([...TIER_ONE]);
  });

  it('refuses the reward commands, which left with the reward hands', () => {
    const g = duel('taizong', 'pachacuti');
    for (const type of ['openRewardHand', 'chooseReward', 'passReward']) {
      const before = snapshotState(g.state);
      const result = applyCommand(g.state, { type, playerId: 0, optionIndex: 0 } as unknown as Command);
      expect(result.ok, type).toBe(false);
      expect(snapshotState(g.state), type).toBe(before);
    }
    const seat = playerById(g.state, 0)!.statecraft as unknown as Record<string, unknown>;
    expect(seat.rewardHands).toBeUndefined();
    expect(seat.pendingReward).toBeUndefined();
  });
});

// --- The Steppe Confederacy, end to end ----------------------------------------

/**
 * A flat board with one town of seat 0's, founded by hand: `territory.test.ts`'s
 * bench, so authority is a function of the towns on it and nothing else.
 */
function flatEmpire(): { state: GameState; city: City } {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 30, height: 20, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 20).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  const city = foundCityAt(state, 0, getTileAt(state.map, 6, 6)!);
  city.buildings.push('monument');
  bumpRevision(state);
  return { state, city };
}

/** Founds towns on the far side of the board until seat 0's authority is negative. */
function overdraw(state: GameState): void {
  let row = 1;
  while (authorityOf(state, 0) >= 0) {
    foundCityAt(state, 0, getTileAt(state.map, state.map.width - 2, row)!);
    bumpRevision(state);
    row += 3;
    if (row >= state.map.height) throw new Error('ran out of board to over-extend on');
  }
}

/** Takes The Steppe Confederacy through the reducer, as an adoption's offer would hand it. */
function takeSteppe(state: GameState): void {
  state.players[0]!.statecraft.pendingDoctrine = { options: [STEPPE] };
  expect(applyCommand(state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
}

/** The Steppe's line among the hammers behind this unit, or `undefined`. */
function steppeLine(state: GameState, city: City, unit: 'horseman' | 'warrior') {
  return productionModifiers(state, city, { kind: 'unit', id: unit }).find((line) => line.card === STEPPE);
}

describe('The Steppe Confederacy, end to end', () => {
  it('lets the borders grow while authority is negative: the culture banks and the border claims', () => {
    const { state, city } = flatEmpire();
    overdraw(state);
    expect(authorityOf(state, 0)).toBeLessThan(0);
    const frozen = borderGrowth(state, city);
    expect(frozen.frozen).toBe(true);
    expect(frozen.perTurn).toBe(0);
    takeSteppe(state);
    const growth = borderGrowth(state, city);
    expect(growth.frozen).toBe(false);
    // The freeze's line goes with the freeze: the border grows at the rate
    // the rest of the law gives, here the culture as made.
    expect(growth.perTurn).toBe(growth.base);
    expect(growth.percent).toBe(0);
    // The end-of-turn claim spends a full basket, as it would unfrozen.
    city.culture = borderCostFor(state, city);
    const claimed = city.tilesClaimed;
    expandBorders(state);
    expect(city.tilesClaimed).toBe(claimed + 1);
    // And a border windfall claims too.
    city.culture = borderCostFor(state, city);
    expect(settleBorderWindfall(state, city)).not.toBeNull();
  });

  it('builds mounted units half again as fast while authority is negative, and nothing else', () => {
    const { state, city } = flatEmpire();
    takeSteppe(state);
    // Authority is positive with one town: the condition is not met.
    expect(authorityOf(state, 0)).toBeGreaterThanOrEqual(0);
    expect(steppeLine(state, city, 'horseman')).toBeUndefined();
    overdraw(state);
    expect(steppeLine(state, city, 'horseman')?.percent).toBe(50);
    // A foot soldier is not mounted.
    expect(steppeLine(state, city, 'warrior')).toBeUndefined();
  });
});

// --- the bot ---------------------------------------------------------------------

describe('the bot answers a Doctrine offer', () => {
  it('takes a Doctrine its scoring prices above nothing', () => {
    const g = duel('taizong', 'modu');
    const taizong = playerById(g.state, 0)!;
    bankGovernment(taizong, 4);
    dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 });
    const decision = nextBotDecision(g.state, 0)!;
    // The offer holds both Tier I Doctrines since Dominion batch D4, and the
    // bot takes whichever it prices higher. The summary names the one it took.
    expect(decision.command.type).toBe('chooseDoctrine');
    const index = (decision.command as { optionIndex: number }).optionIndex;
    const chosen = taizong.statecraft.pendingDoctrine!.options[index]!;
    expect(decision.summary).toContain(doctrineDef(chosen).name);
  });

  it('passes when every Doctrine on the offer costs more than it pays', () => {
    // Both Tier I Doctrines' effects swapped for a pure cost (two points of
    // authority per town) for this test alone, and put back whatever happens.
    const defs = TIER_ONE.map((id) => doctrineDef(id) as { effects: CardEffect[] });
    const saved = defs.map((def) => def.effects);
    for (const def of defs) {
      def.effects = [
        { kind: 'pays', where: 'empire', basis: 'count', to: 'authority', amount: -2, count: 'cities' } as CardEffect,
      ];
    }
    try {
      const g = duel('taizong', 'modu');
      const taizong = playerById(g.state, 0)!;
      bankGovernment(taizong, 4);
      dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 });
      const decision = nextBotDecision(g.state, 0)!;
      expect(decision.command).toEqual({ type: 'skipDoctrineOffer', playerId: 0 });
      expect(dispatch(g, decision.command).ok).toBe(true);
      expect(taizong.statecraft.doctrines).toEqual([]);
    } finally {
      defs.forEach((def, at) => {
        def.effects = saved[at]!;
      });
    }
  });
});
