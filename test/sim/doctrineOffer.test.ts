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
 *     26 Tier IV);
 *   · **the bag**: a seat is offered only the Doctrines of its own decks, and
 *     never one it already holds, and never one whose gate it fails (batch DT5);
 *   · **the deal**: one from each of the seat's decks, then a third from either
 *     (the interim rule, until the user rules the mix); a deck with nothing
 *     left gives its place to the rest of the bag; an empty bag deals nothing
 *     and spends no randomness, so no offer opens;
 *   · **the two answers**: take one, or pass for nothing, each refused
 *     byte-identically when there is nothing to answer;
 *   · **an offer outside an adoption** (Magisterial batch MG7): one helper,
 *     `openDoctrineOffer`, opens one at the current government's tier, never
 *     over a waiting offer and never from an empty bag;
 *   · **The Steppe Confederacy end to end**: mounted units are built half again
 *     as fast, and its combat line is in `dominionDoctrines.test.ts`. The border
 *     freeze's exemption and the negative-authority gate left the row in batch
 *     DT1, and stay in the engine, so they are tested here on a lent row;
 *   · **the bot** takes a Doctrine its effect scoring prices above nothing,
 *     and passes otherwise;
 *   · **the reward commands are gone**: the reducer knows none of them.
 *
 * Every deck gets Doctrines in batches DT2 to DT4, so nothing here assumes a deck
 * has none. A test that needs an empty bag makes one, by having the seat hold
 * what its bag offers. What a seat's bag holds is read from the data by the rule.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nextBotDecision } from '../../src/ai/bot';
import {
  borderCostFor,
  borderGrowth,
  doctrineOfferCanOpen,
  expandBorders,
  foundCityAt,
  openDoctrineOffer,
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
  hasStatecraftOffer,
  heldReligions,
  holdsTendedUnlock,
  liveEffects,
  nextDraftCost,
  statecraftBlocker,
} from '../../src/sim/statecraft';
import { rerollError, rerollKindFor } from '../../src/sim/religion';
import { RELIGION } from '../../src/sim/religionData';
import {
  type CardEffect,
  type DeckId,
  type DoctrineId,
  DECK_FILE_DOCTRINES,
  DECK_FILES,
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  GOVERNMENT_TIERS,
  type GovernmentId,
  ORDER_IDS,
  STATECRAFT,
  doctrineDef,
  governmentDef,
  governmentTierForDoctrineBand,
  governmentsAtTier,
  orderDef,
  poolDoctrines,
} from '../../src/sim/statecraftData';
import { ABILITY_TECH } from '../../src/sim/techData';
import { productionModifiers } from '../../src/sim/yields/town';
import { resetVisibility } from '../../src/sim/visibility';
import { at, bareState } from './improvementHelpers';
import { lendDoctrineEffects, stockDoctrines } from './statecraftHelpers';
import { createGame, newGame } from './newGameHelpers';

const STEPPE: DoctrineId = 'theSteppeConfederacy';
const CONSULAR: DoctrineId = 'theConsularRoads';
const MONARCHY: DoctrineId = 'theUniversalMonarchy';
const LANDSTURM: DoctrineId = 'theLandsturm';
const MARIAN: DoctrineId = 'theMarianReforms';
const SHANG: DoctrineId = 'theLawsOfLordShang';
const FORTRESS: DoctrineId = 'theFortressEmpire';
const SHARE: DoctrineId = 'theSoldiersShare';
const CENTURIONS: DoctrineId = 'centurions';
const PLUNDER: DoctrineId = 'thePlunderEconomy';
const STRATEGOI: DoctrineId = 'theStrategoi';
const COMBINED: DoctrineId = 'combinedArms';
const SCOURGE: DoctrineId = 'theScourgeOfGod';
// Retired by the user: The Servian Reforms in Dominion batch D9, the other two in
// batch DT1. Their rows stay in the file for saves, and no tier deals them.
const SERVIAN: DoctrineId = 'theServianReforms';
const MOBILISATION: DoctrineId = 'totalMobilisation';
const WEIGHT: DoctrineId = 'weightOfNumbers';

/** Dominion's live Doctrines of one sheet tier, in the order the data lists them. */
function dominionTier(band: number): readonly DoctrineId[] {
  return DECK_FILE_DOCTRINES.dominion.filter(
    (id) => doctrineDef(id).band === band && doctrineDef(id).retired !== true,
  );
}
const TIER_ONE = dominionTier(1);
const TIER_TWO = dominionTier(2);
const TIER_THREE = dominionTier(3);
const TIER_FOUR = dominionTier(4);

/** A government tier's live rows that belong to one deck. */
function poolOfDeck(tier: number, deck: DeckId): DoctrineId[] {
  return poolDoctrines(tier).filter((id) => doctrineDef(id).decks.includes(deck));
}

/**
 * What a seat's bag holds by the rule: the tier's live rows of its decks, less what
 * it holds, less what its gates shut (batch DT5). Written out here, row by row, so
 * the test does not read the bag's own code to check the bag.
 */
function bagByRule(state: GameState, seat: Player, tier: number): DoctrineId[] {
  return poolDoctrines(tier).filter((id) => {
    const def = doctrineDef(id);
    return (
      !seat.statecraft.doctrines.includes(id) &&
      def.decks.some((deck) => seat.decks.includes(deck)) &&
      (def.needsTendedWork !== true || holdsTendedUnlock(state, seat.id)) &&
      (def.needsReligion !== true || heldReligions(state, seat.id).length > 0)
    );
  });
}

/** Empties a seat's bag at this tier, by having it hold everything the bag offers. */
function holdWholeBag(game: Game, seat: Player, tier: number): void {
  seat.statecraft.doctrines.push(...doctrineBagFor(game.state, seat, tier));
  bumpRevision(game.state);
  expect(doctrineBagFor(game.state, seat, tier)).toEqual([]);
}

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
    // Tier IV's governments moved from 29 to 26 on 2026-10-17 (docs/flags.md
    // (ddddddd)), and its Doctrines with them.
    expect([1, 2, 3, 4].map(governmentTierForDoctrineBand)).toEqual([4, 10, 18, 26]);
    // The pairing is read off the live government tiers, so it is the ladder's.
    expect([1, 2, 3, 4].map(governmentTierForDoctrineBand)).toEqual([...GOVERNMENT_TIERS]);
    // No Tier 0 Doctrines (the user, 2026-10-15), and nothing past Tier IV.
    expect(governmentTierForDoctrineBand(0)).toBe(0);
    expect(governmentTierForDoctrineBand(5)).toBe(0);
    expect(governmentTierForDoctrineBand(1.5)).toBe(0);
  });

  it('folds the deck files’ Doctrines into the one table, each with its decks, its tier and the government tier that offers it', () => {
    const fromDecks = DECK_FILES.flatMap((file) => DECK_FILE_DOCTRINES[file]);
    const dominion = [
      STEPPE,
      CONSULAR,
      MONARCHY,
      MOBILISATION,
      LANDSTURM,
      MARIAN,
      SHANG,
      FORTRESS,
      SHARE,
      SERVIAN,
      CENTURIONS,
      PLUNDER,
      STRATEGOI,
      WEIGHT,
      COMBINED,
      SCOURGE,
    ];
    expect(DECK_FILE_DOCTRINES.dominion).toEqual(dominion);
    expect(fromDecks).toEqual(expect.arrayContaining(dominion));
    const retired: readonly DoctrineId[] = [SERVIAN, MOBILISATION, WEIGHT];
    for (const id of fromDecks) {
      expect(STATECRAFT.doctrines[id], id).toBeDefined();
      expect(DOCTRINE_IDS, id).toContain(id);
      const def = doctrineDef(id);
      // Every deck Doctrine is live but these three, each of which keeps its tier
      // and effects so that a save holding it reads the same.
      if (retired.includes(id)) expect(def.retired, id).toBe(true);
      else expect(def.retired, id).toBeUndefined();
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
      { kind: 'productionBonus', category: 'unit', percent: 50, modelClass: 'mounted' },
      {
        kind: 'combatLine',
        amount: 3,
        side: 'attack',
        when: { test: 'targetWounded' },
        class: { modelClass: 'mounted' },
      },
    ]);
  });

  it('sits Dominion’s live rows at the tiers the user’s review left them (3, 4, 3, 3)', () => {
    expect(TIER_ONE).toEqual([STEPPE, MARIAN, SHARE]);
    expect(TIER_TWO).toEqual([CONSULAR, SHANG, CENTURIONS, PLUNDER]);
    expect(TIER_THREE).toEqual([MONARCHY, STRATEGOI, COMBINED]);
    expect(TIER_FOUR).toEqual([LANDSTURM, FORTRESS, SCOURGE]);
  });

  it('pools a tier’s live Doctrines alone', () => {
    expect(poolOfDeck(4, 'dominion')).toEqual([...TIER_ONE]);
    expect(poolOfDeck(10, 'dominion')).toEqual([...TIER_TWO]);
    expect(poolOfDeck(18, 'dominion')).toEqual([...TIER_THREE]);
    expect(poolOfDeck(26, 'dominion')).toEqual([...TIER_FOUR]);
    expect(poolDoctrines(0)).toEqual([]);
    for (const tier of [4, 10, 18, 26]) {
      for (const id of poolDoctrines(tier)) {
        expect(doctrineDef(id).tier, id).toBe(tier);
        expect(doctrineDef(id).retired, id).toBeUndefined();
      }
    }
    // A retired row is in no pool, whichever tier it keeps.
    for (const id of [SERVIAN, MOBILISATION, WEIGHT]) {
      expect(poolDoctrines(doctrineDef(id).tier), id).not.toContain(id);
    }
  });
});

// --- the bag and the deal ------------------------------------------------------

describe('the Doctrine offer’s bag and deal', () => {
  it('offers a seat only the Doctrines of its own decks, and never one it holds', () => {
    // Taizong holds Dominion and Magisterial; Pachacuti Expansionist and Commerce.
    const g = duel('taizong', 'pachacuti');
    const taizong = playerById(g.state, 0)!;
    const pachacuti = playerById(g.state, 1)!;
    expect(taizong.decks).toContain('dominion');
    expect(pachacuti.decks).not.toContain('dominion');
    for (const tier of [4, 10, 18, 26]) {
      expect(doctrineBagFor(g.state, taizong, tier), `Taizong, tier ${tier}`).toEqual(bagByRule(g.state, taizong, tier));
      expect(doctrineBagFor(g.state, pachacuti, tier), `Pachacuti, tier ${tier}`).toEqual(bagByRule(g.state, pachacuti, tier));
      // Dominion's rows reach the seat holding that deck, and only that seat.
      const dominion = poolOfDeck(tier, 'dominion');
      expect(doctrineBagFor(g.state, taizong, tier)).toEqual(expect.arrayContaining(dominion));
      for (const id of dominion) expect(doctrineBagFor(g.state, pachacuti, tier), id).not.toContain(id);
    }
    const before = doctrineBagFor(g.state, taizong, 4);
    taizong.statecraft.doctrines.push(STEPPE);
    expect(doctrineBagFor(g.state, taizong, 4)).toEqual(before.filter((id) => id !== STEPPE));
  });

  it('deals nothing from an empty bag and spends no randomness', () => {
    const g = duel('taizong', 'pachacuti');
    const pachacuti = playerById(g.state, 1)!;
    holdWholeBag(g, pachacuti, 4);
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
      const ofDominion = new Set<DoctrineId>(poolOfDeck(4, 'dominion'));
      const ofMagisterial = new Set<DoctrineId>(poolOfDeck(4, 'magisterial'));
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
    // The seat holds everything its second deck offers, so only Dominion has rows
    // left: all three places are dealt from it.
    const g = duel('taizong', 'modu');
    const seat = playerById(g.state, 0)!;
    seat.statecraft.doctrines.push(
      ...doctrineBagFor(g.state, seat, 4).filter((id) => !doctrineDef(id).decks.includes('dominion')),
    );
    const offer = drawDoctrineOffer(g.state, seat, 4);
    expect(offer.options).toHaveLength(3);
    for (const id of offer.options) expect(doctrineDef(id).decks, id).toEqual(['dominion']);
    // And a bag smaller than the offer deals the bag.
    const small = duel('taizong', 'modu');
    const holder = playerById(small.state, 0)!;
    const bag = doctrineBagFor(small.state, holder, 4);
    holder.statecraft.doctrines.push(...bag.slice(0, -1));
    expect([...drawDoctrineOffer(small.state, holder, 4).options]).toEqual([bag[bag.length - 1]]);
  });
});

// --- the adoption and the two answers ------------------------------------------

describe('the adoption opens the offer, and the seat takes one or passes', () => {
  it('opens the offer of the adopted government’s tier, which blocks the turn until answered', () => {
    const g = duel('taizong', 'pachacuti');
    const taizong = playerById(g.state, 0)!;
    bankGovernment(taizong, 4);
    const bag = doctrineBagFor(g.state, taizong, 4);
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 }).ok).toBe(true);
    // Three of the bag, each once.
    const options = [...(taizong.statecraft.pendingDoctrine?.options ?? [])];
    expect(options).toHaveLength(3);
    expect(new Set(options).size).toBe(3);
    for (const id of options) expect(bag, id).toContain(id);
    expect(statecraftBlocker(taizong)).toBe('a Doctrine offer is waiting');
    // The other seat's bag is empty, so it is offered nothing and blocked by
    // nothing.
    const pachacuti = playerById(g.state, 1)!;
    holdWholeBag(g, pachacuti, 4);
    bankGovernment(pachacuti, 4);
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 1, choiceIndex: 0 }).ok).toBe(true);
    expect(pachacuti.statecraft.pendingDoctrine).toBeUndefined();
    expect(statecraftBlocker(pachacuti)).toBeNull();
    // The same at another tier.
    const later = duel('taizong', 'pachacuti');
    const seat = playerById(later.state, 0)!;
    holdWholeBag(later, seat, 10);
    bankGovernment(seat, 10);
    expect(adoptGovernmentAt(later.state, seat, 0)?.doctrines).toBeNull();
    expect(seat.statecraft.pendingDoctrine).toBeUndefined();
  });

  it('takes a Doctrine for good: held, out of every later offer, and the offer spent', () => {
    const g = duel('taizong', 'pachacuti');
    const taizong = playerById(g.state, 0)!;
    bankGovernment(taizong, 4);
    const bag = doctrineBagFor(g.state, taizong, 4);
    dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 });
    const taken = taizong.statecraft.pendingDoctrine!.options[0] as DoctrineId;
    // A wrong index is refused, and nothing moves. The offer holds three since
    // Dominion batch D7, so the first index past it is 3.
    expect(taizong.statecraft.pendingDoctrine!.options).toHaveLength(3);
    const before = snapshotState(g.state);
    expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 3 }).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
    expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(taizong.statecraft.doctrines).toEqual([taken]);
    expect(taizong.statecraft.pendingDoctrine).toBeUndefined();
    expect(statecraftBlocker(taizong)).toBeNull();
    expect(doctrineBagFor(g.state, taizong, 4)).toEqual(bag.filter((id) => id !== taken));
    // The turn it was taken is stamped, for a rule that says "from now on".
    expect(taizong.statecraft.doctrineTurns).toEqual({ [taken]: g.state.turn });
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
    const bag = doctrineBagFor(g.state, taizong, 4);
    dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 });
    // The pass costs nothing and banks nothing: no pity, no culture.
    const skips = taizong.statecraft.orderSkips;
    const culture = taizong.culturePool;
    expect(dispatch(g, { type: 'skipDoctrineOffer', playerId: 0 }).ok).toBe(true);
    expect(taizong.statecraft.pendingDoctrine).toBeUndefined();
    expect(taizong.statecraft.doctrines).toEqual([]);
    expect(taizong.statecraft.doctrineTurns).toBeUndefined();
    expect(taizong.statecraft.orderSkips).toBe(skips);
    expect(taizong.culturePool).toBe(culture);
    // A Doctrine passed on is not held, so it may be offered again later.
    expect(doctrineBagFor(g.state, taizong, 4)).toEqual(bag);
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

// --- an offer outside an adoption ----------------------------------------------

describe('a Doctrine offer outside an adoption (Magisterial batch MG7)', () => {
  // One helper opens it, for a building's Doctrine grant and for a
  // commission's Doctrine reward (Commission: The Golden Bull), at the
  // current government's tier.
  it('opens one of the current government’s tier, and never over a waiting offer', () => {
    const g = duel('taizong', 'pachacuti');
    const taizong = playerById(g.state, 0)!;
    taizong.statecraft.government = 'warChief';
    bumpRevision(g.state);
    const bag = doctrineBagFor(g.state, taizong, 4);
    expect(doctrineOfferCanOpen(g.state, taizong)).toBe(true);
    expect(openDoctrineOffer(g.state, taizong)).toBe(true);
    const options = [...(taizong.statecraft.pendingDoctrine?.options ?? [])];
    expect(options).toHaveLength(3);
    for (const id of options) expect(bag, id).toContain(id);
    // A second is refused while the first waits, and nothing moves.
    const before = snapshotState(g.state);
    expect(doctrineOfferCanOpen(g.state, taizong)).toBe(false);
    expect(openDoctrineOffer(g.state, taizong)).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('opens nothing from an empty bag, and spends no randomness', () => {
    const g = duel('taizong', 'pachacuti');
    // Seat 1's bag is empty.
    const pachacuti = playerById(g.state, 1)!;
    pachacuti.statecraft.government = 'warChief';
    holdWholeBag(g, pachacuti, 4);
    const before = snapshotState(g.state);
    expect(doctrineOfferCanOpen(g.state, pachacuti)).toBe(false);
    expect(openDoctrineOffer(g.state, pachacuti)).toBe(false);
    // The Chiefdom's tier deals nothing either.
    const taizong = playerById(g.state, 0)!;
    expect(taizong.statecraft.government).toBe('chiefdom');
    expect(openDoctrineOffer(g.state, taizong)).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });
});

// --- two offers at once ----------------------------------------------------------

describe('an Order hand and a Doctrine offer waiting at once (tidy batch Z1)', () => {
  /**
   * An adoption whose rider pays enough culture to open an Order hand before
   * the Doctrine draw, so both offers wait at once (found in Magisterial batch
   * MG7). A timed rider stands in for a card that pays culture at the
   * adoption; no dealt card does today.
   */
  function bothWaiting(): { g: Game; seat: Player } {
    const g = duel('taizong', 'pachacuti');
    const seat = playerById(g.state, 0)!;
    bankGovernment(seat, 4);
    seat.culturePool = nextDraftCost(g.state, seat) - 1;
    seat.timed = [
      ...(seat.timed ?? []),
      {
        card: 'theSedFestival' as never,
        effect: {
          kind: 'windfallRider',
          occasion: 'governmentAdopted',
          grant: { yield: 'culture', amount: 500 },
        } as CardEffect,
        expiresTurn: g.state.turn + 10,
      },
    ];
    bumpRevision(g.state);
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 }).ok).toBe(true);
    expect(seat.statecraft.pendingOrder?.options.length ?? 0).toBeGreaterThan(0);
    expect(seat.statecraft.pendingDoctrine?.options.length ?? 0).toBeGreaterThan(0);
    return { g, seat };
  }

  it('raises the Order hand first, as the offer card and the reroll do', () => {
    // The End Turn blocker, the offer card's chain (`showStatecraftOffer`,
    // `main.ts`) and the reroll all take the Order hand first. Once it is
    // answered, the same chain raises the Doctrine offer.
    const { seat } = bothWaiting();
    expect(statecraftBlocker(seat)).toBe('an Order draft is waiting');
    expect(hasStatecraftOffer(seat)).toBe(true);
    expect(rerollKindFor(seat)).toBe('order');
  });

  it('takes the Doctrine first and leaves the Order hand as it was', () => {
    const { g, seat } = bothWaiting();
    const hand = structuredClone(seat.statecraft.pendingOrder);
    const doctrine = seat.statecraft.pendingDoctrine!.options[0]!;
    expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(seat.statecraft.doctrines).toContain(doctrine);
    expect(seat.statecraft.pendingDoctrine).toBeUndefined();
    expect(seat.statecraft.pendingOrder).toEqual(hand);
    expect(statecraftBlocker(seat)).toBe('an Order draft is waiting');
    expect(rerollKindFor(seat)).toBe('order');
    const card = hand!.options[0]!;
    expect(dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(seat.statecraft.orders).toContain(card);
    expect(seat.statecraft.pendingOrder).toBeUndefined();
    expect(statecraftBlocker(seat)).toBeNull();
  });

  it('takes the Order first and leaves the Doctrine offer as it was', () => {
    const { g, seat } = bothWaiting();
    const offer = structuredClone(seat.statecraft.pendingDoctrine);
    expect(dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(seat.statecraft.pendingOrder).toBeUndefined();
    expect(seat.statecraft.pendingDoctrine).toEqual(offer);
    // The Doctrine offer is now the one the screens raise and the reroll redeals.
    expect(statecraftBlocker(seat)).toBe('a Doctrine offer is waiting');
    expect(rerollKindFor(seat)).toBe('doctrine');
    expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(seat.statecraft.doctrines).toContain(offer!.options[0]);
    expect(statecraftBlocker(seat)).toBeNull();
  });

  it('passes on either one without touching the other', () => {
    const first = bothWaiting();
    const hand = structuredClone(first.seat.statecraft.pendingOrder);
    expect(dispatch(first.g, { type: 'skipDoctrineOffer', playerId: 0 }).ok).toBe(true);
    expect(first.seat.statecraft.pendingOrder).toEqual(hand);
    const second = bothWaiting();
    const offer = structuredClone(second.seat.statecraft.pendingDoctrine);
    expect(dispatch(second.g, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    expect(second.seat.statecraft.pendingDoctrine).toEqual(offer);
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
  it('builds mounted units half again as fast, whatever authority stands at, and nothing else', () => {
    const { state, city } = flatEmpire();
    takeSteppe(state);
    expect(authorityOf(state, 0)).toBeGreaterThanOrEqual(0);
    expect(steppeLine(state, city, 'horseman')?.percent).toBe(50);
    overdraw(state);
    expect(steppeLine(state, city, 'horseman')?.percent).toBe(50);
    // A foot soldier is not mounted.
    expect(steppeLine(state, city, 'warrior')).toBeUndefined();
  });

  it('no longer lifts the border freeze', () => {
    const { state, city } = flatEmpire();
    overdraw(state);
    takeSteppe(state);
    expect(borderGrowth(state, city).frozen).toBe(true);
  });
});

/**
 * **The two shapes The Steppe Confederacy gave up in batch DT1**, on a lent row:
 * the border freeze's exemption, and a production bonus gated on negative
 * authority. The shapes stay in the engine (the triage's reading 9), and the user
 * may want them back.
 */
const BORDER_FREEZE_EXEMPT: readonly CardEffect[] = [
  { kind: 'meterRule', rule: 'borderFreezeExempt', value: 1 },
  {
    kind: 'conditionRule',
    when: { test: 'authorityNegative' },
    then: [{ kind: 'productionBonus', category: 'unit', percent: 50, modelClass: 'mounted' }],
  },
];

describe('the border freeze’s exemption and the negative-authority gate, on a lent row', () => {
  let restore: () => void = () => undefined;
  beforeEach(() => {
    restore = lendDoctrineEffects(STEPPE, BORDER_FREEZE_EXEMPT);
  });
  afterEach(() => restore());

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
    // The bot takes whichever it prices highest. The summary names the one it took.
    expect(decision.command.type).toBe('chooseDoctrine');
    const index = (decision.command as { optionIndex: number }).optionIndex;
    const chosen = taizong.statecraft.pendingDoctrine!.options[index]!;
    expect(decision.summary).toContain(doctrineDef(chosen).name);
  });

  it('passes when every Doctrine on the offer costs more than it pays', () => {
    // Every Tier I Doctrine's effects swapped for a pure cost (two points of
    // authority per town) for this test alone, and put back whatever happens.
    const defs = poolDoctrines(4).map((id) => doctrineDef(id) as { effects: CardEffect[] });
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

// --- the gates on the offer (batch DT5) ---------------------------------------

describe('the gates on the Doctrine offer (batch DT5)', () => {
  const GARDEN: DoctrineId = 'theGardenPeoples';
  /** The live rows behind each gate, so a row a later batch adds joins these tests. */
  const NEEDS_RELIGION = DOCTRINE_IDS.filter(
    (id) => doctrineDef(id).needsReligion === true && doctrineDef(id).retired !== true,
  );
  const NEEDS_TENDED = DOCTRINE_IDS.filter(
    (id) => doctrineDef(id).needsTendedWork === true && doctrineDef(id).retired !== true,
  );
  const GATED = [...NEEDS_RELIGION, ...NEEDS_TENDED];

  /** A government of this tier that the game still offers. */
  function governmentOfTier(tier: number): GovernmentId {
    const found = GOVERNMENT_IDS.find((id) => governmentDef(id).tier === tier && governmentDef(id).retired !== true);
    if (found === undefined) throw new Error(`no government at tier ${tier}`);
    return found;
  }

  /**
   * A board with two seats, each with a town and no religion. Seat 0 holds Devotion
   * and Expansionist, so it can be dealt both gates' rows. Seat 1 holds Devotion.
   */
  function board(): { state: GameState; seat: Player; rival: Player; home: City; away: City } {
    const state = bareState(30, 10);
    const seat = playerById(state, 0)!;
    const rival = playerById(state, 1)!;
    seat.decks = ['devotion', 'expansionist'];
    rival.decks = ['devotion', 'commerce'];
    const home = foundCityAt(state, 0, at(state, 5, 5));
    const away = foundCityAt(state, 1, at(state, 20, 5));
    bumpRevision(state);
    return { state, seat, rival, home, away };
  }

  /** A religion whose holy site stands on a town's centre, so the town's owner holds it. */
  function religionIn(state: GameState, city: City): void {
    at(state, city.col, city.row).improvement = 'holySite' as never;
    state.religions.push({
      id: state.religions.length,
      founderId: city.ownerId,
      name: `The Testament ${state.religions.length}`,
      pantheon: [],
      follower: [],
      enhancer: [],
      foundedTurn: state.turn,
      holySite: { col: city.col, row: city.row },
    } as never);
    bumpRevision(state);
  }

  /** Every bag this seat could be offered, one for each government tier. */
  const everyBag = (state: GameState, seat: Player): DoctrineId[] =>
    GOVERNMENT_TIERS.flatMap((tier) => doctrineBagFor(state, seat, tier));

  /** Has the seat hold every row of the tier that no gate shuts, so only gated rows are left. */
  function holdUngated(state: GameState, seat: Player, tier: number): void {
    seat.statecraft.doctrines.push(
      ...poolDoctrines(tier).filter(
        (id) =>
          !GATED.includes(id) &&
          !seat.statecraft.doctrines.includes(id) &&
          doctrineDef(id).decks.some((deck) => seat.decks.includes(deck)),
      ),
    );
    bumpRevision(state);
  }

  it('marks the rows of the plan that are built, each with one gate', () => {
    for (const id of ['thePatrimonyOfPeter', 'theImarets', 'theCanonsOfTheHolySepulchre', 'theMartyrsCrown', 'theTwoSanctuaries']) {
      expect(NEEDS_RELIGION, id).toContain(id);
    }
    expect(NEEDS_TENDED).toContain(GARDEN);
    for (const id of GATED) {
      const def = doctrineDef(id);
      expect(def.needsReligion === true && def.needsTendedWork === true, id).toBe(false);
    }
  });

  it('agrees with the rule row by row, gates included, at every tier', () => {
    const { state, seat, rival, home } = board();
    const check = (): void => {
      for (const tier of GOVERNMENT_TIERS) {
        expect(doctrineBagFor(state, seat, tier), `seat 0, tier ${tier}`).toEqual(bagByRule(state, seat, tier));
        expect(doctrineBagFor(state, rival, tier), `seat 1, tier ${tier}`).toEqual(bagByRule(state, rival, tier));
      }
    };
    check();
    religionIn(state, home);
    check();
    seat.statecraft.orders.push('theForestGardens' as never);
    bumpRevision(state);
    check();
  });

  it('offers a seat with no religion none of the rows that need one', () => {
    const { state, seat } = board();
    const bag = everyBag(state, seat);
    for (const id of NEEDS_RELIGION) expect(bag, id).not.toContain(id);
    // The gate takes those rows out and no others.
    expect(bag).toContain('theTheoricFund');
    expect(bag).toContain('theRitesOfZhou');
  });

  it('admits them when the seat holds a religion', () => {
    const { state, seat, home } = board();
    religionIn(state, home);
    const bag = everyBag(state, seat);
    for (const id of NEEDS_RELIGION) expect(bag, id).toContain(id);
  });

  it('admits them when the seat captures a holy city, and shuts them for the seat that lost it', () => {
    const { state, seat, rival, away } = board();
    religionIn(state, away);
    expect(everyBag(state, rival)).toEqual(expect.arrayContaining(NEEDS_RELIGION));
    for (const id of NEEDS_RELIGION) expect(everyBag(state, seat), id).not.toContain(id);
    // The town changes hands. Nothing else moves: `heldReligions` asks the board.
    away.ownerId = 0;
    bumpRevision(state);
    expect(everyBag(state, seat)).toEqual(expect.arrayContaining(NEEDS_RELIGION));
    for (const id of NEEDS_RELIGION) expect(everyBag(state, rival), id).not.toContain(id);
  });

  it('keeps a gated row out of the bag of a seat with a religion but not the deck', () => {
    const { state, seat, home } = board();
    seat.decks = ['dominion', 'expansionist'];
    religionIn(state, home);
    const bag = everyBag(state, seat);
    for (const id of NEEDS_RELIGION) expect(bag, id).not.toContain(id);
  });

  it('admits The Garden Peoples for a tended-work charter, seated or not', () => {
    const { state, seat } = board();
    const tier = doctrineDef(GARDEN).tier;
    expect(doctrineBagFor(state, seat, tier)).not.toContain(GARDEN);
    // In the collection, in no chair: a charter takes none.
    seat.statecraft.orders.push('theForestGardens' as never);
    bumpRevision(state);
    expect(seat.statecraft.slots.some((slot) => slot?.card === 'theForestGardens')).toBe(false);
    expect(doctrineBagFor(state, seat, tier)).toContain(GARDEN);
    // In a chair as well, by a direct write. It reads the same.
    seat.statecraft.slots.push({ card: 'theForestGardens' as never, sealedUntil: state.turn });
    bumpRevision(state);
    expect(doctrineBagFor(state, seat, tier)).toContain(GARDEN);
  });

  it('does not admit The Garden Peoples for a charter that opens no tended work', () => {
    const { state, seat } = board();
    const other = ORDER_IDS.find((id) => {
      const charter = orderDef(id).charter;
      return charter !== undefined && charter.unlocks.improvement === undefined;
    });
    expect(other).toBeDefined();
    seat.statecraft.orders.push(other!);
    bumpRevision(state);
    expect(doctrineBagFor(state, seat, doctrineDef(GARDEN).tier)).not.toContain(GARDEN);
  });

  it('does not admit The Garden Peoples for a religion, nor a religion’s rows for a charter', () => {
    const { state, seat, home } = board();
    seat.statecraft.orders.push('theForestGardens' as never);
    bumpRevision(state);
    for (const id of NEEDS_RELIGION) expect(everyBag(state, seat), id).not.toContain(id);
    seat.statecraft.orders = [];
    religionIn(state, home);
    expect(everyBag(state, seat)).not.toContain(GARDEN);
  });

  it('never deals a gated row to a seat that fails the gate, over many draws', () => {
    for (const tier of GOVERNMENT_TIERS) {
      const { state, seat } = board();
      for (let draw = 0; draw < 40; draw++) {
        const offer = drawDoctrineOffer(state, seat, tier);
        for (const id of offer.options) expect(GATED, `${id} at tier ${tier}`).not.toContain(id);
      }
    }
  });

  it('agrees with the draw: no offer can open while only gated rows are left', () => {
    const { state, seat, home } = board();
    const tier = doctrineDef('theImarets').tier;
    seat.statecraft.government = governmentOfTier(tier);
    holdUngated(state, seat, tier);
    expect(doctrineBagFor(state, seat, tier)).toEqual([]);
    expect(doctrineOfferCanOpen(state, seat)).toBe(false);
    const before = snapshotState(state);
    expect(openDoctrineOffer(state, seat)).toBe(false);
    expect(drawDoctrineOffer(state, seat, tier)).toEqual({ options: [] });
    // Nothing moved, the random number generator included.
    expect(snapshotState(state)).toBe(before);
    // The gate opens, and the question and the draw both change their answer.
    religionIn(state, home);
    expect(doctrineOfferCanOpen(state, seat)).toBe(true);
    expect(openDoctrineOffer(state, seat)).toBe(true);
    for (const id of seat.statecraft.pendingDoctrine!.options) expect(NEEDS_RELIGION, id).toContain(id);
  });

  it('opens no offer at an adoption while only gated rows are left', () => {
    const { state, seat } = board();
    const tier = doctrineDef('theImarets').tier;
    holdUngated(state, seat, tier);
    seat.statecraft.pendingGovernment = { tier, options: governmentsAtTier(tier) };
    const adopted = adoptGovernmentAt(state, seat, 0);
    expect(adopted?.doctrines).toBeNull();
    expect(seat.statecraft.pendingDoctrine).toBeUndefined();
    expect(statecraftBlocker(seat)).toBeNull();
  });

  it('lets a seat keep a gated Doctrine after it loses the religion, and never offers it again', () => {
    const { state, seat, home } = board();
    religionIn(state, home);
    const id: DoctrineId = 'theImarets';
    const tier = doctrineDef(id).tier;
    seat.statecraft.doctrines.push(id);
    bumpRevision(state);
    expect(doctrineBagFor(state, seat, tier)).not.toContain(id);
    home.ownerId = 1;
    bumpRevision(state);
    expect(heldReligions(state, seat.id)).toEqual([]);
    expect(seat.statecraft.doctrines).toContain(id);
    expect(liveEffects(state, seat.id).some((entry) => entry.card === id)).toBe(true);
    // The seat wins the town back: the row is still not offered, because it is held.
    home.ownerId = seat.id;
    bumpRevision(state);
    expect(heldReligions(state, seat.id)).toHaveLength(1);
    expect(doctrineBagFor(state, seat, tier)).not.toContain(id);
  });

  it('refuses a redraw that would deal an empty hand, and the seat may still answer the offer', () => {
    const { state, seat, home } = board();
    religionIn(state, home);
    const tier = doctrineDef('theImarets').tier;
    seat.statecraft.government = governmentOfTier(tier);
    seat.faithPool = 10_000;
    seat.techsResearched.push(ABILITY_TECH.get(RELIGION.reroll.ability)!);
    holdUngated(state, seat, tier);
    expect(openDoctrineOffer(state, seat)).toBe(true);
    expect(rerollError(state, 0)).toBeNull();
    // Turns are simultaneous, so the holy city can fall while the offer waits.
    home.ownerId = 1;
    bumpRevision(state);
    expect(rerollError(state, 0)).toBe('No other Doctrine can be offered to you now');
    const before = snapshotState(state);
    const refused = applyCommand(state, { type: 'rerollOffer', playerId: 0 });
    expect(refused.ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
    const taken = seat.statecraft.pendingDoctrine!.options[0] as DoctrineId;
    expect(applyCommand(state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(seat.statecraft.doctrines).toContain(taken);
  });

  it('offers the religion rows through the real command path once the seat holds a faith', () => {
    const { state, seat, home } = board();
    religionIn(state, home);
    const tier = doctrineDef('theImarets').tier;
    holdUngated(state, seat, tier);
    seat.statecraft.pendingGovernment = { tier, options: governmentsAtTier(tier) };
    const result = applyCommand(state, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const offer = seat.statecraft.pendingDoctrine!;
    expect(offer.options.length).toBeGreaterThan(0);
    for (const id of offer.options) expect(NEEDS_RELIGION, id).toContain(id);
    const taken = offer.options[0] as DoctrineId;
    expect(applyCommand(state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(seat.statecraft.doctrines).toContain(taken);
  });
});
