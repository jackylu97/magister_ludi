/**
 * Statecraft: the ladder, the commands, and every hook family end to end.
 *
 * Three concerns, deliberately in one file because they are one system and the
 * interesting failures are between them: a command matrix (every refusal
 * byte-identical), the draft's determinism (same seed and log ⇒ same offers),
 * and **one card per hook family carried all the way to the ledger it touches**
 * — which is the claim the whole vocabulary rests on and the only kind of test
 * that can catch a hook that was declared and never read.
 */

import { describe, expect, it } from 'vitest';

import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import type { Command } from '../../src/sim/commands';
import {
  cityStageSums,
  cityYieldPercents,
  cityYields,
  explainTileYield,
  foldTileYield,
  empireRateReading,
  growthThreshold,
  ownedTiles,
  settleGrowthWindfall,
  settleProduction,
  productionModifiers,
  tilePurchasePrice,
  tileYieldOf,
  unitProductionCost,
  yieldContextFor,
} from '../../src/sim/cities';
import { previewCombat } from '../../src/sim/combat';
import { buildingDef } from '../../src/sim/buildingData';
import { chopFeatureAt, pillageAt } from '../../src/sim/improvements';
import { nearestTarget } from '../../src/sim/barbarians';
import { settleDiscovery } from '../../src/sim/discoveries';
import { RULES } from '../../src/sim/rulesData';
import { recomputeVisibility, sightSources } from '../../src/sim/visibility';
import {
  authorityOf,
  explainAuthority,
  explainFoundingCost,
  explainHappiness,
  foldMeter,
  happinessOf,
} from '../../src/sim/meters';
import {
  type PlayerStatecraft,
  cardActionRule,
  cardEmpireYields,
  cardPercentYields,
  scopedCardTileLines,
  tileConditionHolds,
  cardBehaviorRule,
  cardCityStat,
  cityScopeAdmits,
  cardCityYields,
  cardProduction,
  cardFoundingRider,
  foldCardYields,
  cardOfferRule,
  cardUnitStat,
  cardRenownLines,
  describeCard,
  draftCost,
  drawOrderOffer,
  filledOrderSlots,
  isUpgradable,
  liveEffects,
  livePool,
  musterPeriodicUnits,
  payWindfallGrants,
  newPlayerStatecraft,
  orderChoiceError,
  planDraft,
  canDeepen,
  maxLevelOf,
  orderEffectsAtLevel,
  sealRemaining,
  sealTurnsFor,
  settleCultureWindfall,
  slotOrderError,
  statecraftBlocker,
  stripRefs,
  unslotOrderError,
  windfallPayout,
} from '../../src/sim/statecraft';
import {
  type CardEffectKind,
  type CardWindfallRiderEffect,
  type OrderId,
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  GOVERNMENT_TIERS,
  ORDER_IDS,
  ORDER_POOLS,
  SLOT_TYPES,
  STARTING_GOVERNMENT,
  STATECRAFT,
  cardDef,
  doctrineDef,
  governmentDef,
  governmentsAtTier,
  orderDef,
  poolDoctrines,
  poolOfGovernment,
  poolOrders,
  slotLayout,
} from '../../src/sim/statecraftData';
import { getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { arriveOnTile } from '../../src/sim/arrival';
import { foundCityAt } from '../../src/sim/cities';
import { improvementDef } from '../../src/sim/improvementData';
import { awardOccasion } from '../../src/sim/triumphs';
import { applyCommand } from '../../src/sim/commands';
import {
  greatPersonBlocker,
  greatPersonOfferPrice,
  greatPersonPurchaseError,
} from '../../src/sim/greatPeople';
import {
  explainUnitUpkeep,
  explainUnitUpkeepRebate,
  unitUpkeepTotal,
} from '../../src/sim/upkeep';
import { explainPurchaseCost, purchaseError } from '../../src/sim/purchase';
import { buildError, isUnlocked } from '../../src/sim/tech';
import {
  explainEmpireGold,
  explainRouteSlots,
  explainRouteYieldBetween,
  foldRouteYield,
  roadsBuiltBy,
  routeSlots,
} from '../../src/sim/trade';
import { SCHEMA_VERSION, type GameState, createUnit, playerById } from '../../src/sim/state';
import { unitDef, unitMaxHp } from '../../src/sim/unitData';
import { fullMovement } from '../../src/sim/units';
import { sightOf } from '../../src/sim/visibility';

// --- harness ----------------------------------------------------------------

/** Gives a player a card at a level, in the collection. Test scaffolding only. */
function grant(sc: PlayerStatecraft, id: OrderId, level = 1): void {
  const owned = sc.orders.find((entry) => entry.id === id);
  if (owned) owned.level = level;
  else sc.orders.push({ id, level });
}

/**
 * Slots a card, growing the spread if the government has no room — the tests
 * below are about what a card *does*, not about whether a chiefdom had a spare
 * economic slot, and every slot rule has its own test above.
 */
function slot(state: GameState, playerId: number, id: OrderId, level = 1): void {
  const sc = playerById(state, playerId)!.statecraft;
  grant(sc, id, level);
  sc.slots.push({ card: id, sealedUntil: state.turn });
}

/** A city for a player, on the tile their first unit is standing on. */
import { found, game, keepTheRites } from './statecraftHelpers';

// --- the table --------------------------------------------------------------

describe('the card table', () => {
  it('names every card once, across all three classes', () => {
    const all = [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS];
    expect(new Set(all).size).toBe(all.length);
  });

  it('opens on the one tier-0 government, and offers a fixed triple at each other tier', () => {
    expect(governmentDef(STARTING_GOVERNMENT).tier).toBe(0);
    expect(GOVERNMENT_IDS.filter((id) => governmentDef(id).tier === 0)).toHaveLength(1);
    // Entry XV: a fixed triple at each rung. Read off the rows, so a fourth
    // government at a tier is a data decision and this notices.
    //
    // The rungs were 3/7/15 until the pacing retune of 2026-08-27 (user: "I got
    // to tier 7 on turn 29, not even age 2 yet"). The *ratified* ladder is
    // 4/10/18/29/45 and is written down whole in `STATECRAFT.tierLadder`; this
    // list is the live half — the rungs a triple actually exists for — so it is
    // its first three, and Gov IV's rows will extend it by themselves.
    // Gov IV and Gov V were written on 2026-08-28, so the live ladder is now the
    // whole ratified one and the two lists agree end to end.
    expect(GOVERNMENT_TIERS).toEqual([4, 10, 18, 29, 45]);
    expect(STATECRAFT.tierLadder).toEqual([4, 10, 18, 29, 45]);
    expect(STATECRAFT.tierLadder.slice(0, GOVERNMENT_TIERS.length)).toEqual([...GOVERNMENT_TIERS]);
    for (const tier of GOVERNMENT_TIERS) {
      expect(governmentsAtTier(tier), `tier ${tier}`).toHaveLength(3);
    }
  });

  it('grows the slot spread monotonically up the ladder', () => {
    let last = slotLayout(STARTING_GOVERNMENT).length;
    for (const tier of GOVERNMENT_TIERS) {
      for (const id of governmentsAtTier(tier)) {
        expect(slotLayout(id).length, id).toBeGreaterThan(last);
      }
      last = Math.min(...governmentsAtTier(tier).map((id) => slotLayout(id).length));
    }
  });

  it('lays every pool out with enough cards to draft from, of every slot type', () => {
    for (const pool of ORDER_POOLS) {
      const cards = ORDER_IDS.filter((id) => orderDef(id).pool === pool);
      // Three new cards an offer, so a pool has to be able to fill one.
      expect(cards.length, pool).toBeGreaterThanOrEqual(RULES.offers.order);
      for (const type of SLOT_TYPES) {
        expect(cards.some((id) => orderDef(id).slot === type), `${pool}/${type}`).toBe(true);
      }
    }
  });

  it('fills every live Doctrine pool, and keeps the deferred one out of all of them', () => {
    for (const tier of GOVERNMENT_TIERS) {
      expect(poolDoctrines(tier).length, `tier ${tier}`).toBeGreaterThanOrEqual(
        RULES.offers.doctrine,
      );
    }
    // Religious Mandate awaits religion, a war state and the beads. It sits at
    // tier 0, which is not a live pool, so it can never be dealt.
    const dealt = new Set(GOVERNMENT_TIERS.flatMap((tier) => poolDoctrines(tier)));
    for (const id of DOCTRINE_IDS) {
      const def = doctrineDef(id);
      if (def.tier > 0) continue;
      expect(dealt.has(id), id).toBe(false);
      expect(def.deferred, id).toBeDefined();
    }
  });

  it('opens with a slot for every kind of card the chiefdom pool can deal', () => {
    // Playtest batch two, 8/27: "chiefdom should include 1 wildcard slot, or
    // make all tier 1 orders non-wildcard". The first option — two of the
    // eleven chiefdom-pool Orders are wildcard-only (First Rites, Border
    // Ballads), and a starting government that could never play a card its own
    // pool deals is a draft that hands a seat a dead card.
    const layout = slotLayout(STARTING_GOVERNMENT);
    expect(layout).toEqual(['military', 'economic', 'wildcard']);
    const pool = ORDER_IDS.filter((id) => orderDef(id).pool === 'chiefdom');
    for (const id of pool) {
      expect(layout.includes(orderDef(id).slot) || layout.includes('wildcard'), id).toBe(true);
    }
  });

  it('says out loud that a charge is granted at build time, not to the army', () => {
    // `cardExtraCharges` is read exactly once, by `createUnit`, so a worker
    // already in the field gains nothing when the Order is slotted — and the
    // clause has to say so. Playtest batch two, 8/27: "Tinker's guild should
    // read: newly created worker units gain +1 charge".
    expect(describeCard('tinkersGuild').map((clause) => clause.text)).toEqual([
      'newly created worker units gain +1 charge',
    ]);
  });

  it('states the two tier-3 rivals in the words they were ratified in', () => {
    // Playtest ruling, 8/27: both tier-3 alternatives to the Priest-King were
    // thin enough that nobody took them. Pinned as *sentences* rather than as
    // effect rows, because what the ruling settled was the printed card — the
    // rows are one of several ways to say it and the words are not.
    expect(describeCard('councilOfElders').map((clause) => clause.text)).toEqual([
      '+3 happiness',
      '+1 renown per turn in every city',
    ]);
    expect(describeCard('warChief').map((clause) => clause.text)).toEqual([
      '+1 combat strength per 2 cities you hold (at most +3)',
      'killing a unit grants +5 science for each Order you have in a slot',
      'killing a unit grants +5 culture for each Order you have in a slot',
    ]);
  });

  it('gives every card a name, a flavour line and at least one effect or a stated deferral', () => {
    for (const id of [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS]) {
      const def = cardDef(id);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      // The chiefdom is the one signature-less row: it is where a game starts,
      // not a thing a player chose.
      if (id === STARTING_GOVERNMENT) continue;
      // An Order whose whole face is a **slot grant** speaks too — The
      // Auspicious Seal hands over a die the first time it is placed and stands
      // for nothing afterwards, which is a card that says something and carries
      // no `CardEffect` at all.
      const granted = ORDER_IDS.includes(id as never) ? (orderDef(id as never).onSlot ?? []) : [];
      const hasSomething =
        def.effects.length > 0 || (def.deferred ?? []).length > 0 || granted.length > 0;
      expect(hasSomething, id).toBe(true);
    }
  });

  it('describes every card in words without leaving a clause silent', () => {
    for (const id of [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS]) {
      const def = cardDef(id);
      const clauses = describeCard(id);
      // One clause per effect at least — `describeEffect` has an arm for every
      // shape in the union and no silent default, so a new shape that nobody
      // wrote words for fails here rather than printing an empty card.
      const speaking = def.effects.filter(
        (effect) => effect.kind !== 'cityYields' || Object.keys(effect).length > 1,
      );
      if (speaking.length > 0) expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) expect(clause.text, id).toBeTruthy();
    }
  });

  it('reads every effect kind in the union from at least one live card', () => {
    // The register: a shape declared and never used is a shape nobody has
    // tested.
    const used = new Set<CardEffectKind>();
    const walk = (effects: readonly { kind: CardEffectKind; then?: unknown }[]): void => {
      for (const effect of effects) {
        used.add(effect.kind);
        const nested = (effect as { then?: { kind: CardEffectKind }[] }).then;
        if (nested) walk(nested);
      }
    };
    for (const id of [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS]) {
      walk(cardDef(id).effects as never);
    }
    const expected: CardEffectKind[] = [
      'cityYields', 'percentYields', 'productionBonus', 'rulePercent', 'happiness',
      'authority', 'happinessTierBoost', 'combatLine', 'unitStat', 'windfallRider',
      'foundingRider', 'countScaled', 'rateConversion', 'offerRider', 'effectAmplifier',
      'meterRule', 'conditionRule', 'actionRule', 'behaviorRule', 'cityStat', 'metaRule',
      'tileYield', 'renown', 'upkeepRebate',
      // No longer the marked exception: buildings can be bought (Entry XXIX), so
      // `cardUnlocksBuilding` is read by `isUnlocked` and The Gilded Court
      // really does hand the Gilded Hall over.
      'unlocksBuilding',
    ];
    for (const kind of expected) expect(used.has(kind), kind).toBe(true);
  });
});

// --- the ladder -------------------------------------------------------------

describe('the meter', () => {
  it('spends the culture pool and keeps the overflow', () => {
    const g = game();
    const player = g.state.players[0]!;
    const cost = draftCost(0);
    player.culturePool = cost + 9;
    expect(planDraft(player)).toEqual({
      cost,
      tier: 1,
      overflow: 9,
      offersGovernment: false,
    });
    settleCultureWindfall(g.state, player);
    expect(player.statecraft.drafts).toBe(1);
    expect(player.culturePool).toBe(9);
    expect(player.statecraft.pendingOrder).toBeDefined();
  });

  it('does not deal a second draft while one is unanswered', () => {
    const g = game();
    const player = g.state.players[0]!;
    // Enough for three drafts at once.
    player.culturePool = draftCost(0) + draftCost(1) + draftCost(2);
    settleCultureWindfall(g.state, player);
    expect(player.statecraft.drafts).toBe(1);
    // The culture is still there — nothing is destroyed, the ladder simply
    // waits for the decision it is owed.
    expect(player.culturePool).toBeGreaterThanOrEqual(draftCost(1));
  });

  it('banks a government offer at the ladder’s rungs without blocking the turn', () => {
    const g = game();
    const player = g.state.players[0]!;
    // Climbed to the *first rung*, whatever it is, rather than to a number
    // written here: the ladder is a pacing dial (4/10/18 since 2026-08-27) and a
    // test that restated it would fail the retune instead of checking it.
    const rung = GOVERNMENT_TIERS[0]!;
    for (let tier = 1; tier <= rung; tier++) {
      player.culturePool = draftCost(player.statecraft.drafts);
      settleCultureWindfall(g.state, player);
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    expect(player.statecraft.drafts).toBe(rung);
    expect(player.statecraft.pendingGovernment).toEqual({
      tier: rung,
      options: governmentsAtTier(rung),
    });
    // Bankable by design (Entry XV): it does not block End Turn.
    expect(statecraftBlocker(player)).toBeNull();
  });

  it('blocks the turn on an unanswered Order or Doctrine draft', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.culturePool = draftCost(0);
    settleCultureWindfall(g.state, player);
    expect(statecraftBlocker(player)).toBe('an Order draft is waiting');
    dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    expect(statecraftBlocker(player)).toBeNull();
  });

  it('leaves the wild out of the ladder', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    const wild = g.state.players.find((p) => p.barbarian)!;
    wild.culturePool = 10_000;
    dispatch(g, { type: 'endTurn', playerId: 0 });
    expect(wild.statecraft.drafts).toBe(0);
    expect(wild.statecraft.pendingOrder).toBeUndefined();
  });
});

// --- the draw ---------------------------------------------------------------

describe('the draft', () => {
  it('deals three new cards without replacement, from the live pool only', () => {
    const g = game();
    const player = g.state.players[0]!;
    const sc = player.statecraft;
    // Three, because three is what `rules.offers.order` says and nothing this
    // empire holds widens it. The size is a fold now — see `explainOfferSize`.
    const offer = drawOrderOffer(g.state, player);
    expect(offer.options).toHaveLength(3);
    expect(new Set(offer.options).size).toBe(3);
    const pool = new Set(livePool(sc));
    for (const id of offer.options) expect(pool.has(id), id).toBe(true);
    // Nothing to deepen on the opening draft.
    expect(offer.upgrade).toBeUndefined();
  });

  it('never re-offers a card already held', () => {
    const g = game();
    const player = g.state.players[0]!;
    const sc = player.statecraft;
    for (const id of ORDER_IDS.filter((id) => orderDef(id).pool === 'chiefdom')) grant(sc, id);
    // Every chiefdom card is held, so the live pool is empty and the draw hands
    // back what it has — the honest answer (see `drawWithoutReplacement`).
    expect(livePool(sc)).toEqual([]);
    expect(drawOrderOffer(g.state, player).options).toEqual([]);
  });

  it('rolls the upgrade target from the collection', () => {
    const g = game();
    const player = g.state.players[0]!;
    grant(player.statecraft, 'firstRites');
    const offer = drawOrderOffer(g.state, player);
    expect(offer.upgrade).toBe('firstRites');
  });

  it('deals the same hand from the same generator state', () => {
    const a = game(11);
    const b = game(11);
    expect(drawOrderOffer(a.state, a.state.players[0]!)).toEqual(
      drawOrderOffer(b.state, b.state.players[0]!),
    );
  });

  it('deepens a card rather than duplicating it', () => {
    const g = game();
    const player = g.state.players[0]!;
    const sc = player.statecraft;
    grant(sc, 'firstRites');
    sc.pendingOrder = { options: [], upgrade: 'firstRites' };
    expect(dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command).ok).toBe(true);
    expect(sc.orders).toEqual([{ id: 'firstRites', level: 2 }]);
  });

  it('refuses a pick that would take a holding past its ceiling', () => {
    const g = game();
    const player = g.state.players[0]!;
    const sc = player.statecraft;
    // The offer is where the cap bites (`canDeepen`), so a card at its ceiling
    // is never dealt as the upgrade face in the first place — see the ladder's
    // own block. Here: the pick that *is* dealt lands exactly one level deeper.
    sc.orders = [{ id: 'bloodedSpears', level: maxLevelOf('bloodedSpears') - 1 }];
    sc.pendingOrder = { options: [], upgrade: 'bloodedSpears' };
    expect(dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command).ok).toBe(
      true,
    );
    expect(sc.orders).toEqual([{ id: 'bloodedSpears', level: maxLevelOf('bloodedSpears') }]);
    expect(canDeepen(sc.orders[0]!)).toBe(false);
  });
});

// --- the commands -----------------------------------------------------------

describe('the command matrix', () => {
  /** Every refusal leaves the state byte-identical. The whole contract. */
  function refuses(g: ReturnType<typeof game>, command: Command, fragment: string): void {
    const before = snapshotState(g.state);
    const result = dispatch(g, command);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(fragment);
    expect(snapshotState(g.state)).toEqual(before);
  }

  it('refuses a pick with no draft outstanding', () => {
    const g = game();
    refuses(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command, 'no Statecraft draft');
  });

  it('refuses an option that was not dealt, and a non-integer index', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.culturePool = draftCost(0);
    settleCultureWindfall(g.state, player);
    refuses(g, { type: 'chooseOrder', playerId: 0, optionIndex: 9 } as Command, 'not one of the');
    refuses(g, { type: 'chooseOrder', playerId: 0, optionIndex: -1 } as Command, 'not one of the');
    refuses(g, { type: 'chooseOrder', playerId: 0, optionIndex: 1.5 } as Command, 'integer optionIndex');
  });

  it('refuses to slot a card the empire does not hold', () => {
    const g = game();
    refuses(
      g,
      { type: 'slotOrder', playerId: 0, cardId: 'firstRites', slotIndex: 0 } as Command,
      'does not hold',
    );
  });

  it('refuses a type mismatch with the reducer’s own sentence', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    // The chiefdom's layout is [military, economic, wildcard] — the third slot
    // arrived with the playtest pass, so that the two wildcard-only cards in the
    // chiefdom pool (First Rites, Border Ballads) are cards an opening
    // government can actually play. Blooded Spears is military, so the economic
    // slot still refuses it.
    expect(slotLayout(sc.government)).toEqual(['military', 'economic', 'wildcard']);
    grant(sc, 'bloodedSpears');
    refuses(
      g,
      { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 1 } as Command,
      'is military and slot 2 is economic',
    );
  });

  it('refuses a slot index the government does not have', () => {
    const g = game();
    grant(g.state.players[0]!.statecraft, 'bloodedSpears');
    refuses(
      g,
      { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 5 } as Command,
      'slot(s), not 6',
    );
  });

  it('refuses to double-slot a card, or to fill an occupied slot', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    grant(sc, 'bloodedSpears');
    grant(sc, 'campFollowers');
    expect(dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command).ok).toBe(true);
    refuses(
      g,
      { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 1 } as Command,
      'already slotted',
    );
    refuses(
      g,
      { type: 'slotOrder', playerId: 0, cardId: 'campFollowers', slotIndex: 0 } as Command,
      'already holds',
    );
  });

  it('refuses every Statecraft verb from a seat that has ended its turn', () => {
    const g = game();
    grant(g.state.players[0]!.statecraft, 'bloodedSpears');
    dispatch(g, { type: 'endTurn', playerId: 0 });
    for (const [command, fragment] of [
      [{ type: 'chooseOrder', playerId: 0, optionIndex: 0 }, 'cannot choose an Order'],
      [{ type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 }, 'cannot slot'],
      [{ type: 'unslotOrder', playerId: 0, slotIndex: 0 }, 'cannot unslot'],
      [{ type: 'adoptGovernment', playerId: 0, choiceIndex: 0 }, 'cannot adopt'],
      [{ type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }, 'cannot choose a Doctrine'],
    ] as [Command, string][]) {
      refuses(g, command, fragment);
    }
  });

  it('refuses an adoption with nothing banked, and a Doctrine with no draft', () => {
    const g = game();
    refuses(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command, 'no government offer');
    refuses(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command, 'no Doctrine draft');
  });

  it('agrees with its own error functions', () => {
    // The rule and the reducer are one function: the screen greys a slot with
    // exactly the sentence the reducer would refuse with.
    const g = game();
    expect(orderChoiceError(g.state, 0, 0)).toContain('no Statecraft draft');
    expect(slotOrderError(g.state, 0, 'firstRites', 0)).toContain('does not hold');
    expect(unslotOrderError(g.state, 0, 0)).toContain('is empty');
    expect(slotOrderError(g.state, 0, 'notACard', 0)).toContain('not a known Order');
  });
});

// --- seals ------------------------------------------------------------------

describe('seals', () => {
  it('seals a card on entry, for the empire’s own length', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    grant(sc, 'bloodedSpears');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);
    expect(sc.slots[0]).toEqual({
      card: 'bloodedSpears',
      sealedUntil: g.state.turn + STATECRAFT.meter.sealTurns,
    });
    expect(sealRemaining(g.state, sc.slots[0]!)).toBe(STATECRAFT.meter.sealTurns);
  });

  it('refuses to unslot a sealed card, and allows it the turn the seal lifts', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    grant(sc, 'bloodedSpears');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);
    const before = snapshotState(g.state);
    const refused = dispatch(g, { type: 'unslotOrder', playerId: 0, slotIndex: 0 } as Command);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toContain('sealed for 5 more turns');
    expect(snapshotState(g.state)).toEqual(before);

    g.state.turn = sc.slots[0]!.sealedUntil;
    expect(sealRemaining(g.state, sc.slots[0]!)).toBe(0);
    expect(dispatch(g, { type: 'unslotOrder', playerId: 0, slotIndex: 0 } as Command).ok).toBe(true);
    // The card is back in the collection, never lost.
    expect(sc.slots[0]).toBeNull();
    expect(sc.orders.map((o) => o.id)).toContain('bloodedSpears');
  });

  it('shortens the seal under The Loose Rein — the metaRule hook', () => {
    const g = game();
    expect(sealTurnsFor(g.state, 0)).toBe(STATECRAFT.meter.sealTurns);
    slot(g.state, 0, 'theLooseRein');
    expect(sealTurnsFor(g.state, 0)).toBe(2);
    const sc = g.state.players[0]!.statecraft;
    grant(sc, 'bloodedSpears');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);
    expect(sealRemaining(g.state, sc.slots[0]!)).toBe(2);
  });
});

// --- adoption ---------------------------------------------------------------

describe('adoption', () => {
  /** Climbs to the ladder's **first rung**, whatever the pacing dial says it is. */
  const FIRST_RUNG = GOVERNMENT_TIERS[0]!;

  function toFirstRung(g: ReturnType<typeof game>) {
    const player = g.state.players[0]!;
    for (let tier = 1; tier <= FIRST_RUNG; tier++) {
      player.culturePool = draftCost(player.statecraft.drafts);
      settleCultureWindfall(g.state, player);
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    return player;
  }

  it('swaps the spread, amnesties every seal, and opens a Doctrine draft', () => {
    const g = game();
    const player = toFirstRung(g);
    const sc = player.statecraft;
    // Slot something and seal it hard.
    grant(sc, 'bloodedSpears');
    dispatch(g, { type: 'slotOrder', playerId: 0, cardId: 'bloodedSpears', slotIndex: 0 } as Command);
    expect(sealRemaining(g.state, sc.slots[0]!)).toBeGreaterThan(0);

    const choice = sc.pendingGovernment!.options[1]!;
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 1 } as Command).ok).toBe(true);

    expect(sc.government).toBe(choice);
    // The new spread, all of it empty: the amnesty is total by construction.
    expect(sc.slots).toHaveLength(slotLayout(choice).length);
    expect(sc.slots.every((entry) => entry === null)).toBe(true);
    // The card is back in the collection, unsealed.
    expect(sc.orders.map((o) => o.id)).toContain('bloodedSpears');
    // The offer is spent, and the Doctrine draft is open and blocking.
    expect(sc.pendingGovernment).toBeUndefined();
    expect(sc.pendingDoctrine!.options).toHaveLength(3);
    expect(new Set(sc.pendingDoctrine!.options).size).toBe(3);
    for (const id of sc.pendingDoctrine!.options) {
      expect(poolDoctrines(FIRST_RUNG), id).toContain(id);
    }
    expect(statecraftBlocker(player)).toBe('a Doctrine draft is waiting');

    expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command).ok).toBe(true);
    expect(sc.doctrines).toHaveLength(1);
    expect(sc.pendingDoctrine).toBeUndefined();
  });

  it('opens the next Order pool on adoption', () => {
    const g = game();
    const player = toFirstRung(g);
    expect(poolOfGovernment(player.statecraft.government)).toBe('chiefdom');
    dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command);
    expect(poolOfGovernment(player.statecraft.government)).toBe('governmentI');
    // The live pool is the new government's cards plus the chiefdom leftovers.
    const pool = new Set(livePool(player.statecraft));
    expect([...pool].some((id) => orderDef(id).pool === 'governmentI')).toBe(true);
    expect([...pool].some((id) => orderDef(id).pool === 'chiefdom')).toBe(true);
    // And nothing from a pool two governments back — those retire.
    expect([...pool].every((id) => orderDef(id).pool !== 'governmentII')).toBe(true);
  });

  it('banks the offer until it is claimed', () => {
    const g = game();
    const player = toFirstRung(g);
    // Climb three more tiers without adopting.
    for (let i = 0; i < 3; i++) {
      player.culturePool = draftCost(player.statecraft.drafts);
      settleCultureWindfall(g.state, player);
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    expect(player.statecraft.drafts).toBe(FIRST_RUNG + 3);
    expect(player.statecraft.pendingGovernment!.tier).toBe(FIRST_RUNG);
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command).ok).toBe(true);
  });

  it('never offers a Doctrine twice in one game', () => {
    const g = game();
    const player = g.state.players[0]!;
    const seen = new Set<string>();
    for (const tier of GOVERNMENT_TIERS) {
      while (player.statecraft.drafts < tier) {
        player.culturePool = draftCost(player.statecraft.drafts);
        settleCultureWindfall(g.state, player);
        dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
      }
      dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command);
      for (const id of player.statecraft.pendingDoctrine?.options ?? []) {
        // Within a tier, without replacement; across tiers, pools do not overlap.
        expect(seen.has(id), id).toBe(false);
        seen.add(id);
      }
      dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command);
    }
    expect(player.statecraft.doctrines).toHaveLength(GOVERNMENT_TIERS.length);
    expect(new Set(player.statecraft.doctrines).size).toBe(GOVERNMENT_TIERS.length);
  });
});

// --- the hooks --------------------------------------------------------------

describe('every hook family, end to end', () => {
  it('tileYield — The Orchard Tithe is a line in the hex breakdown', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    // The luxury hex line, which the balance pass of 2026-08-31 moved off Common
    // Granary (now a fact about the *town*) and onto a row of its own.
    tile.resource = 'gems';
    const before = explainTileYield(tile, yieldContextFor(g.state, 0));
    slot(g.state, 0, 'theOrchardTithe');
    const after = explainTileYield(tile, yieldContextFor(g.state, 0));
    expect(after).toHaveLength(before.length + 1);
    const line = after[after.length - 1]!;
    expect(line.source).toBe('Order · The Orchard Tithe');
    expect(line.food).toBe(1);
    expect(line.kind).toBe('add');
    // A hex with no resource is untouched — the condition is the whole rule.
    const bare = getTileAt(g.state.map, city.col, city.row)!;
    delete bare.resource;
    expect(explainTileYield(bare, yieldContextFor(g.state, 0))).toHaveLength(before.length - 1);
  });

  it('cityYields — Wayside Shrines pays faith, and the fold is the sum of the list', () => {
    const g = game();
    const city = found(g.state, 0);
    const before = cityYields(g.state, city).faith;
    slot(g.state, 0, 'waysideShrines');
    expect(cityYields(g.state, city).faith).toBe(before + 1);
    // Wayside Shrines has no second face at all (the 2026-09-02 ladder), so a
    // level written into a save changes nothing — the reading clamps to the
    // printed row rather than inventing a number for it.
    g.state.players[0]!.statecraft.orders = [{ id: 'waysideShrines', level: 2 }];
    expect(cityYields(g.state, city).faith).toBe(before + 1);
  });

  it('cityYields — a deepened Order pays its printed line and its increment, as two lines', () => {
    const g = game();
    const city = found(g.state, 0);
    const before = cityYields(g.state, city).faith;
    // First Rites prints +2 faith in the capital and its authored increment is
    // +1 more of the same. Level 2 is 3, level 3 is 4 — and each level is one
    // more ordinary line in the breakdown rather than a bigger number.
    slot(g.state, 0, 'firstRites');
    expect(cityYields(g.state, city).faith).toBe(before + 2);
    const sc = g.state.players[0]!.statecraft;
    sc.orders = [{ id: 'firstRites', level: 2 }];
    expect(cityYields(g.state, city).faith).toBe(before + 3);
    sc.orders = [{ id: 'firstRites', level: 3 }];
    expect(cityYields(g.state, city).faith).toBe(before + 4);
    // The cap clamps rather than throwing: a save from before the ceiling reads
    // as the deepest face the row allows.
    sc.orders = [{ id: 'firstRites', level: 9 }];
    expect(cityYields(g.state, city).faith).toBe(before + 4);
  });

  it('percentYields — a card joins the city stage rather than multiplying afterwards', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = g.state.players[0]!;
    player.statecraft.doctrines.push('riverKings');
    const lines = cityYieldPercents(g.state, city);
    const food = lines.filter((line) => line.yield === 'food' && line.source.startsWith('Doctrine'));
    expect(food).toHaveLength(1);
    expect(food[0]!.stage).toBe('city');
    // Entry XVII: the line is in the list; the total is the fold of the list.
    // The sign follows the ground the town stands on.
    const wet = getTileAt(g.state.map, city.col, city.row)!.freshwater;
    expect(food[0]!.percent).toBe(wet ? 30 : -10);
  });

  it('productionBonus — Conscription is a labelled modifier line', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'conscription');
    const toward = { kind: 'unit', id: 'warrior' } as const;
    const lines = productionModifiers(g.state, city, toward);
    const mine = lines.find((line) => line.source === 'Order · Conscription')!;
    expect(mine.percent).toBe(50);
    expect(mine.stage).toBe('city');
    // Not behind a building — the category is the whole of the rule.
    const building = productionModifiers(g.state, city, { kind: 'building', id: 'granary' });
    expect(building.some((line) => line.source.includes('Conscription'))).toBe(false);
  });

  it('rulePercent — Land Grants cheapens ground and speeds the border', () => {
    const g = game();
    const city = found(g.state, 0);
    const cell = { col: (city.col + 2) % g.state.map.width, row: city.row };
    const before = tilePurchasePrice(g.state, 0, city.id, cell);
    slot(g.state, 0, 'landGrants');
    const after = tilePurchasePrice(g.state, 0, city.id, cell);
    expect(after).toBeLessThan(before);
    expect(after).toBe(Math.max(1, Math.floor((before * 75) / 100)));
  });

  it('happiness and authority — cards are lines in both ledgers', () => {
    const g = game();
    found(g.state, 0);
    const happyBefore = foldMeter(explainHappiness(g.state, 0));
    const writBefore = foldMeter(explainAuthority(g.state, 0));
    slot(g.state, 0, 'festivalDays');
    // Provincial Governors since the balance pass of 2026-08-31: Census Rolls
    // became The King's Table and pays happiness off the capital's rolls now,
    // so the flat writ line moved to the card that still carries one.
    slot(g.state, 0, 'provincialGovernors');
    expect(explainHappiness(g.state, 0).some((l) => l.source === 'Order · Festival Days')).toBe(true);
    expect(
      explainAuthority(g.state, 0).some((l) => l.source === 'Order · Provincial Governors'),
    ).toBe(true);
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(happyBefore + 4);
    expect(foldMeter(explainAuthority(g.state, 0))).toBe(writBefore + 3);
  });

  it('combatLine — Blooded Spears is a labelled line in the forecast', () => {
    const g = createGame({
      seed: 5,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    const wild = g.state.players.find((p) => p.barbarian)!;
    const mine = g.state.units.find((u) => u.ownerId === 0 && u.type === 'warrior')
      ?? createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    const target = getTileAt(g.state.map, mine.col + 1, mine.row)!;
    createUnit(g.state, wild.id, 'warrior', target.col, target.row);
    const before = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    if (!before.ok) return; // terrain rolled impassable on this seed; the rule is tested below
    slot(g.state, 0, 'bloodedSpears');
    const after = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    // **Two** lines since the 2026-08-28 cut: +1 always, and +2 more against the
    // wild — which is the card's own sentence, and three points in this fight.
    const lines = after.bonuses.filter((b) => b.source === 'Order · Blooded Spears');
    expect(lines.map((b) => b.amount).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(lines.every((b) => b.side === 'attacker')).toBe(true);
    expect(after.attackerStrength).toBe(before.attackerStrength + 3);
  });

  it('unitStat — Far Runners reaches the one evaluator for each stat', () => {
    const g = game();
    const scout = createUnit(g.state, 0, 'scout', g.state.units[0]!.col, g.state.units[0]!.row);
    const warrior = createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    const moveBefore = fullMovement(scout, g.state);
    const sightBefore = sightOf(g.state.map, scout, g.state);
    slot(g.state, 0, 'farRunners');
    expect(fullMovement(scout, g.state)).toBe(moveBefore + 1);
    expect(sightOf(g.state.map, scout, g.state)).toBe(sightBefore + 1);
    // The class filter is the whole of the rule: a warrior is untouched.
    expect(cardUnitStat(g.state, warrior, 'movement')).toBe(0);
  });

  it('cityStat — Militia Levies raises the walls and is itemised', () => {
    const g = game();
    const city = found(g.state, 0);
    expect(cardCityStat(g.state, city, 'defense')).toEqual([]);
    slot(g.state, 0, 'militiaLevies');
    expect(cardCityStat(g.state, city, 'defense')).toEqual([
      { card: 'militiaLevies', source: 'Order · Militia Levies', amount: 5 },
    ]);
    expect(cardCityStat(g.state, city, 'sight')).toHaveLength(1);
  });

  it('renown — the Council of Elders is a line per empire, with its arithmetic shown', () => {
    const g = game();
    const sc = playerById(g.state, 0)!.statecraft;
    // A government that says nothing about renown says nothing about renown.
    expect(cardRenownLines(g.state, 0)).toEqual([]);
    sc.government = 'councilOfElders';
    // No cities, no counsel: a zero pays no line rather than a line worth zero.
    expect(cardRenownLines(g.state, 0)).toEqual([]);
    const city = found(g.state, 0);
    expect(cardRenownLines(g.state, 0)).toEqual([
      {
        card: 'councilOfElders',
        // One line with the multiplicand and the count in it — not one line per
        // town for a reader to add up.
        source: 'Government · Council of Elders · 1 per city × 1',
        family: null,
        amount: 1,
      },
    ]);
    void city;
  });

  it('countScaled — Salt Tithes scales with what the empire holds, capped where capped', () => {
    const g = game();
    found(g.state, 0);
    slot(g.state, 0, 'saltTithes');
    // No luxuries: no line at all, rather than a line worth nothing.
    expect(cardEmpireYields(g.state, 0).some((l) => l.card === 'saltTithes')).toBe(false);
  });

  it('rateConversion — The Tithe reads the turn’s rate, not the bank', () => {
    const g = game();
    found(g.state, 0);
    g.state.players[0]!.statecraft.doctrines.push('theTithe');
    expect(cardEmpireYields(g.state, 0, { faithPerTurn: 7 }).find((l) => l.card === 'theTithe')?.gold).toBe(7);
    // Zero rate, no line — a card that pays nothing is not in the list.
    expect(cardEmpireYields(g.state, 0, { faithPerTurn: 0 }).some((l) => l.card === 'theTithe')).toBe(false);
  });

  it('windfallRider — The Woodwrights changes the printed number', () => {
    const g = game();
    g.state.players[0]!.statecraft.doctrines.push('woodwrights');
    const payout = windfallPayout(g.state, 0, 'chop', 20);
    // The rider is part of the printed number (Entry XVIII.5), not a
    // multiplication of a settled one.
    expect(payout.amount).toBe(40);
    expect(payout.grants).toEqual([
      { card: 'woodwrights', source: 'Doctrine · The Woodwrights', yield: 'culture', amount: 10 },
    ]);
    // Percentages on one occasion sum before multiplying once. Two riders on the
    // *chop* now, because Wolf-Mother's Pact stopped paying for camps when the
    // master list gave it the conversion instead.
    expect(windfallPayout(g.state, 0, 'chop', 20).amount).toBe(40);
    slot(g.state, 0, 'spoilsOfTheWild');
    expect(windfallPayout(g.state, 0, 'camp', 10).amount).toBe(20);
    g.state.players[0]!.statecraft.doctrines.push('burningWay');
    // The Burning Way pays no camp percentage either: a rider that does not name
    // this occasion is simply not on this payout.
    expect(windfallPayout(g.state, 0, 'camp', 10).amount).toBe(20);
  });

  it('foundingRider — Homestead Charters founds a bigger town', () => {
    const g = game();
    slot(g.state, 0, 'homesteadCharters');
    expect(cardFoundingRider(g.state, 0)).toEqual({ population: 1, buildings: [], roads: false });
    const city = found(g.state, 0);
    expect(city.population).toBe(2);
  });

  it('foundingRider — The Founders’ Road stops after its stated count', () => {
    const g = game();
    g.state.players[0]!.statecraft.doctrines.push('foundersRoad');
    expect(cardFoundingRider(g.state, 0).buildings).toEqual(['monument']);
    const city = found(g.state, 0);
    expect(city.buildings).toContain('monument');
    // Five cities held: the sixth is founded without one.
    for (let i = 0; i < 4; i++) g.state.cities.push({ ...city, id: 900 + i });
    expect(cardFoundingRider(g.state, 0).buildings).toEqual([]);
  });

  it('conditionRule — The Hermit Crown opens and closes with the city count', () => {
    const g = game();
    const city = found(g.state, 0);
    g.state.players[0]!.statecraft.doctrines.push('hermitCrown');
    const open = cityYieldPercents(g.state, city).filter((l) => l.source.includes('Hermit'));
    // `yield: 'all'` expands into one labelled line per voice.
    expect(open).toHaveLength(6);
    expect(open.every((l) => l.percent === 30 && l.stage === 'city')).toBe(true);
    // A **fifth** city closes the gate, and the clause simply stops existing.
    // The master-list cut of 2026-08-28 widened the crown from three cities to
    // four, so a fourth town is still a hermit's and the fifth is the one that
    // is not.
    for (let i = 0; i < 3; i++) g.state.cities.push({ ...city, id: 800 + i });
    expect(cityYieldPercents(g.state, city).some((l) => l.source.includes('Hermit'))).toBe(true);
    g.state.cities.push({ ...city, id: 899 });
    expect(cityYieldPercents(g.state, city).some((l) => l.source.includes('Hermit'))).toBe(false);
  });

  it('actionRule, behaviorRule, offerRider, meterRule — the flag-shaped hooks', () => {
    const g = game();
    expect(cardActionRule(g.state, 0, 'freeChop')).toBe(false);
    g.state.players[0]!.statecraft.doctrines.push('burningWay');
    expect(cardActionRule(g.state, 0, 'freeChop')).toBe(true);

    expect(cardBehaviorRule(g.state, 0, 'barbariansPassive')).toBe(false);
    g.state.players[0]!.statecraft.doctrines.push('wolfMothersPact');
    expect(cardBehaviorRule(g.state, 0, 'barbariansPassive')).toBe(true);

    expect(cardOfferRule(g.state, 0, 'discoveryClaimAll')).toBe(false);
    g.state.players[0]!.statecraft.doctrines.push('athenaeumOfTheRoad');
    expect(cardOfferRule(g.state, 0, 'discoveryClaimAll')).toBe(true);
  });

  it('meterRule — Hegemony reprices a captured city in the writ ledger', () => {
    const g = game();
    const city = found(g.state, 0);
    const second = found(g.state, 1);
    second.ownerId = 0;
    second.captured = true;
    void city;
    const before = explainAuthority(g.state, 0).find((l) => l.source.includes('captured'))!;
    g.state.players[0]!.statecraft.doctrines.push('hegemony');
    const after = explainAuthority(g.state, 0).find((l) => l.source.includes('captured'))!;
    expect(after.value).toBeGreaterThan(before.value);
    // A captured city costs 4 since the authority rework (user, 2026-08-29); Hegemony's delta makes it 3.
    expect(after.value).toBe(-3);
  });

  it('rulePercent — Manifest of the Steppe cheapens settlers and stops the ladder', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.unitsBuilt.settler = 3;
    const before = unitProductionCost(g.state, 0, 'settler');
    player.statecraft.doctrines.push('manifestOfTheSteppe');
    const after = unitProductionCost(g.state, 0, 'settler');
    expect(after).toBeLessThan(before);
    // The ladder is **not** stopped any more (the 2026-09-02 pass dropped that
    // clause for two points of settler movement), so the discount lands on the
    // escalated price rather than on the base one.
    expect(after).toBe(Math.max(1, Math.floor((before * 60) / 100)));
  });

  it('unitStat — Manifest of the Steppe puts two points of movement under a settler', () => {
    const g = game();
    const seat = g.state.units[0]!;
    const settler = createUnit(g.state, 0, 'settler', seat.col, seat.row);
    const warrior = createUnit(g.state, 0, 'warrior', seat.col, seat.row);
    const before = fullMovement(settler, g.state);
    g.state.players[0]!.statecraft.doctrines.push('manifestOfTheSteppe');
    expect(fullMovement(settler, g.state)).toBe(before + 2);
    // And nothing else: the filter names the settler's own silhouette.
    expect(cardUnitStat(g.state, warrior, 'movement')).toBe(0);
  });
});

// --- determinism ------------------------------------------------------------

describe('determinism', () => {
  it('round-trips a schema 40 save with Statecraft in it', () => {
    // Bumped to 32 by the master-list cut of 2026-08-28: no new field, but the
    // balance table moved under every replay (see the version's own entry).
    // v40: the Cathedral (Entry LV) — cost 340 and a consecration draw at completion
    // moved every replay that raised one.
    // v42: the faith rework of Entry LVIII — one-charge agents, the founding's
    // double draft and The Holy Office's tenants move every replay with a
    // prophet or an augur in it.
    // v44: the age-1 restoration and the deepened chains — Calendar is a node
    // again, Currency and Irrigation trade places, and Æra III/IV are re-chained,
    // so a v43 log aims research at a tree this build does not have.
    // v45: the endgame of Entry LVIII — the Magnum Opus, the three bead-paying
    // great works, the Long Count's die and Alchemy's closing bead. A v44 log
    // reaches a winner it never reached, and spends rolls it never spent.
    // v46: the card pools of Entry LVIII — nineteen new Orders, a Doctrine, two
    // beliefs and a sixth consecration join the bags a draft draws from, and The
    // Laureate's once-per-game great person becomes a renown trickle. A v45 log
    // names indices of hands this build does not deal.
    // v47: the timeline reshape and the column-formula costs — seventeen
    // prerequisite edges moved so every column earns its width, and every cost
    // is rewritten off the node's own column. A v46 log aims research at a tree
    // this build does not have, and pays prices it never paid.
    // v48: the user's balance pass — the authored Order deepening ladder, the
    // Order and Doctrine retunes, and the reworked luxury signatures. A v47 log
    // drafts from a deck this build does not deal, and deepens by numbers it
    // does not carry.
    // v49: the cost ladder re-anchored at the first *paid* tier — the root is
    // not a tier. Column 0 holds Agriculture alone and Agriculture is granted,
    // so every column now takes the price the column to its left used to carry
    // (Fletching 13 where it was 30) and a v48 log pays the wrong beakers from
    // the first technology anybody researches.
    expect(SCHEMA_VERSION).toBe(49);
    const g = game(19);
    const player = g.state.players[0]!;
    for (let turn = 0; turn < 12; turn++) {
      player.culturePool += 30;
      if (player.statecraft.pendingOrder) {
        dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
      }
      dispatch(g, { type: 'endTurn', playerId: 0 });
      dispatch(g, { type: 'endTurn', playerId: 1 });
    }
    // The pool is topped up outside the log, so a replay cannot reproduce the
    // drafts — what this pins is the *shape*: the field serialises, survives
    // JSON, and comes back identical.
    const text = snapshotState(g.state);
    expect(JSON.parse(text).schemaVersion).toBe(SCHEMA_VERSION);
    expect(JSON.parse(text).players[0].statecraft).toEqual(player.statecraft);
    // A player who has never drafted serialises as the opening state exactly.
    expect(JSON.parse(text).players[1].statecraft).toEqual(newPlayerStatecraft());
  });

  it('keeps the live-effect walk in one fixed order', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.statecraft.doctrines.push('greatLitany');
    slot(g.state, 0, 'firstRites');
    slot(g.state, 0, 'festivalDays');
    // Government, then Doctrines in the order taken, then slots in slot order.
    expect(liveEffects(g.state, 0).map((e) => e.source)).toEqual([
      'Doctrine · The Great Litany',
      'Order · First Rites',
      'Order · Festival Days',
    ]);
  });
});

// --- rule 5, with cards on the table ----------------------------------------

describe('rule 5 holds with cards active', () => {
  /**
   * The claim, restated for this vocabulary: **every total is the fold of its
   * own breakdown, and a card is a line in the breakdown rather than a
   * multiplication beside it.** These are identity tests — they recompute the
   * headline from the list the interface prints and demand the two agree — which
   * is the only kind that catches a hook that pays into a total without joining
   * the list.
   */
  function withCards(seat = 0) {
    const g = game(29);
    const city = found(g.state, seat);
    // One card of each shape that touches a yield, at once, so the folds are
    // exercised against a *stack* rather than a single line.
    slot(g.state, seat, 'firstRites');
    slot(g.state, seat, 'weightsAndMeasures');
    slot(g.state, seat, 'conscription');
    g.state.players[seat]!.statecraft.doctrines.push('hermitCrown');
    return { g, city };
  }

  it('the city’s flat lines fold to the difference the cards make', () => {
    const g = game(29);
    const city = found(g.state, 0);
    const before = cityYields(g.state, city);
    // Wayside Shrines rather than First Rites since the balance pass of
    // 2026-08-31: the capital's candles moved to First Rites and the flat "+1
    // faith in every city" it used to carry became a row of its own.
    slot(g.state, 0, 'waysideShrines');
    slot(g.state, 0, 'weightsAndMeasures');
    const lines = cardCityYields(g.state, city);
    expect(lines.map((line) => line.source)).toEqual([
      'Order · Wayside Shrines',
      'Order · Weights & Measures',
    ]);
    const after = cityYields(g.state, city);
    // The fold of the list is exactly the change in the total — no card pays
    // into a headline without a line saying so.
    const fold = foldCardYields(lines);
    expect(after.faith - before.faith).toBe(fold.faith);
    expect(after.gold - before.gold).toBe(fold.gold);
  });

  it('the two stages are applied once, in order, floored once', () => {
    const { g, city } = withCards();
    const sums = cityStageSums(g.state, city, city.queue[0]);
    // Recomputed from the printed lines: the panel's arithmetic and the
    // simulation's are one function (`stageSumsFor`), and this asserts it by
    // folding the list the panel would print.
    const printed = cityYieldPercents(g.state, city);
    for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      const expected = printed
        .filter((line) => line.yield === key)
        .reduce(
          (acc, line) => {
            if (line.stage === 'city') acc.city += line.percent;
            else acc.empire += line.percent;
            return acc;
          },
          { city: 0, empire: 0 },
        );
      // Production also carries the hammers behind *this build*, which join the
      // city stage rather than standing beside it.
      if (key !== 'production') expect(sums[key], key).toEqual(expected);
      else expect(sums[key].empire, key).toBe(expected.empire);
    }
  });

  it('a card’s percentage sums with the others rather than multiplying after them', () => {
    const g = game(29);
    const city = found(g.state, 0);
    const player = g.state.players[0]!;
    // Two sources of a city-stage percentage on the same yield.
    player.statecraft.doctrines.push('hermitCrown');
    player.statecraft.doctrines.push('riverKings');
    const food = cityYieldPercents(g.state, city).filter(
      (line) => line.yield === 'food' && line.stage === 'city',
    );
    expect(food.length).toBeGreaterThanOrEqual(2);
    const summed = food.reduce((total, line) => total + line.percent, 0);
    expect(cityStageSums(g.state, city, city.queue[0]).food.city).toBe(summed);
  });

  it('both meters stay the fold of their own ledgers', () => {
    const { g } = withCards();
    slot(g.state, 0, 'festivalDays');
    slot(g.state, 0, 'censusRolls');
    expect(happinessOf(g.state, 0)).toBe(foldMeter(explainHappiness(g.state, 0)));
    expect(authorityOf(g.state, 0)).toBe(foldMeter(explainAuthority(g.state, 0)));
  });

  it('a tile’s total stays the fold of its own breakdown', () => {
    const g = game(29);
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    tile.resource = 'wheat';
    slot(g.state, 0, 'commonGranary');
    const ctx = yieldContextFor(g.state, 0);
    expect(tileYieldOf(tile, ctx)).toEqual(foldTileYield(explainTileYield(tile, ctx)));
  });

  it('a windfall’s printed number is the fold of its own riders', () => {
    const g = game(29);
    g.state.players[0]!.statecraft.doctrines.push('woodwrights');
    slot(g.state, 0, 'campFollowers');
    const payout = windfallPayout(g.state, 0, 'chop', 20);
    // Every rider that touched it is named, so the announce line can say why a
    // chop paid forty.
    expect(payout.lines.map((line) => line.source)).toEqual([
      'Doctrine · The Woodwrights',
      'Doctrine · The Woodwrights',
    ]);
    expect(payout.amount).toBe(40);
    // And a rider on a different occasion is not on this one.
    expect(windfallPayout(g.state, 0, 'camp').grants.map((g2) => g2.yield)).toEqual(['food']);
  });

  it('perSlottedOrder — War Chief’s kill pays by the council he keeps', () => {
    const kill = (orders: OrderId[]) => {
      const g = game(29);
      const sc = playerById(g.state, 0)!.statecraft;
      sc.government = 'warChief';
      // Slotted, not merely held: the whole of what this rider prices is the
      // scarce decision, so an Order in the pocket buys nothing.
      sc.slots = orders.map((id) => ({ card: id, sealedUntil: 0 }));
      for (const id of orders) sc.orders.push({ id, level: 1 });
      expect(filledOrderSlots(g.state, 0)).toBe(orders.length);
      const payout = windfallPayout(g.state, 0, 'kill');
      return payout.grants.map((grant) => [grant.yield, grant.amount] as const);
    };
    // An empty council pays **nothing**, and pays it silently — the zero grants
    // are dropped rather than printed as noughts a player cannot act on.
    expect(kill([])).toEqual([]);
    expect(kill(['bloodedSpears'])).toEqual([
      ['science', 5],
      ['culture', 5],
    ]);
    expect(kill(['bloodedSpears', 'campFollowers', 'farRunners'])).toEqual([
      ['science', 15],
      ['culture', 15],
    ]);
  });

  it('perSlottedOrder composes with perAge as a product, not as a second percentage', () => {
    const g = game(29);
    const sc = playerById(g.state, 0)!.statecraft;
    sc.government = 'warChief';
    sc.orders.push({ id: 'bloodedSpears', level: 1 }, { id: 'campFollowers', level: 1 });
    sc.slots = [
      { card: 'bloodedSpears', sealedUntil: 0 },
      { card: 'campFollowers', sealedUntil: 0 },
    ];
    // Æra II. Nothing on the table carries both flags on one rider today, so the
    // composition is pinned by lending War Chief's science rider the era for the
    // length of this test and handing it straight back — the alternative is a
    // product nobody checks until the first card that wants one.
    // An Æra-II empire. Re-read against the tree pass of 2026-08-30, which put
    // Currency in Æra II and Mathematics and Rhetoric in Æra III — one node of
    // the second age is all the era multiplier is being asked about.
    playerById(g.state, 0)!.techsResearched.push('currency' as never);
    const rider = governmentDef('warChief').effects.find(
      (effect) => effect.kind === 'windfallRider' && effect.grant?.yield === 'science',
    ) as CardWindfallRiderEffect;
    rider.perAge = true;
    try {
      const payout = windfallPayout(g.state, 0, 'kill');
      // 5 × 2 slots × 2 æra = 20. The culture rider, which asked for neither
      // era nor anything else, is untouched at 5 × 2 — a multiplier is a fact
      // about *its own rider* and never about the payout.
      expect(payout.grants.map((grant) => [grant.yield, grant.amount])).toEqual([
        ['science', 20],
        ['culture', 10],
      ]);
      // Both multipliers are annotated, so the announcement can say why.
      expect(payout.lines.map((line) => line.note)).toEqual([
        '×2 (Æra II)',
        '×2 (slotted Orders)',
        '+20 science',
        '×2 (slotted Orders)',
        '+10 culture',
      ]);
    } finally {
      delete rider.perAge;
    }
  });

  it('perSlottedOrder pays into the empire’s banks, and only what it printed', () => {
    const g = game(29);
    const player = playerById(g.state, 0)!;
    player.statecraft.government = 'warChief';
    player.statecraft.drafts = 20; // No draft threshold in the way of the arithmetic.
    player.statecraft.orders.push({ id: 'bloodedSpears', level: 1 });
    player.statecraft.slots = [{ card: 'bloodedSpears', sealedUntil: 0 }];
    const science = player.sciencePool;
    const culture = player.culturePool;
    // Asking twice is asking once: the multiplier is a *reading* of the slots,
    // with no counter to tick and no draw to spend, which is what keeps a
    // preview free and a replay byte-identical.
    const before = snapshotState(g.state);
    expect(windfallPayout(g.state, 0, 'kill')).toEqual(windfallPayout(g.state, 0, 'kill'));
    expect(snapshotState(g.state)).toEqual(before);
    payWindfallGrants(g.state, player, windfallPayout(g.state, 0, 'kill'));
    expect(player.sciencePool - science).toBe(5);
    expect(player.culturePool - culture).toBe(5);
  });
});

// --- the hooks that change a verb rather than a number ----------------------

describe('the behavioural hooks, in the verbs they change', () => {
  /**
   * A flag test proves a card is *readable*; these prove it is *read*. Every one
   * of these hooks reaches into a verb rather than into a ledger, so the only
   * honest coverage is to run the verb twice and diff the world.
   */

  it('actionRule freeChop — a worker keeps its charge', () => {
    const g = game(41);
    const worker = createUnit(g.state, 0, 'worker', g.state.units[0]!.col, g.state.units[0]!.row);
    const tile = getTileAt(g.state.map, worker.col, worker.row)!;
    tile.feature = 'forest';
    delete tile.resource;
    const before = worker.chargesLeft!;
    g.state.players[0]!.statecraft.doctrines.push('burningWay');
    chopFeatureAt(g.state, worker, tile);
    expect(worker.chargesLeft).toBe(before);
    expect(tile.feature).toBe('none');
  });

  it('windfallRider chop — the timber banked is the printed number, riders folded in', () => {
    const plain = (doctrine?: 'woodwrights') => {
      const g = game(41);
      const city = found(g.state, 0);
      // The tier is pushed high so the ten culture the rider pays does **not**
      // cross a draft threshold: this test is about what the chop *grants*, and
      // the settlement that a grant can trigger has its own test above.
      g.state.players[0]!.statecraft.drafts = 20;
      if (doctrine) g.state.players[0]!.statecraft.doctrines.push(doctrine);
      const worker = createUnit(g.state, 0, 'worker', city.col, city.row);
      const tile = getTileAt(g.state.map, worker.col, worker.row)!;
      tile.feature = 'forest';
      delete tile.resource;
      city.hammerBasket = 0;
      city.queue = [];
      const cultureBefore = g.state.players[0]!.culturePool;
      chopFeatureAt(g.state, worker, tile);
      return { hammers: city.hammerBasket, culture: g.state.players[0]!.culturePool - cultureBefore };
    };
    const bare = plain();
    const wood = plain('woodwrights');
    expect(wood.hammers).toBe(bare.hammers * 2);
    expect(wood.culture).toBe(10);
  });

  it('windfallRider pillage — the salvage, the gold rider and the heal all land', () => {
    // **The base and the rider stack, in one composition** (2026-08-28). The raid
    // itself now pays `improvements.pillageHeal`; Scorched Earth's own heal is a
    // rider *on top of* that figure, exactly as its +10 gold is a rider on top of
    // the salvage. `windfallPayout` composes both before a coin or a hit point
    // moves, so what the card is worth is the difference between the two runs and
    // never a second multiplication.
    const g = game(41);
    const raider = createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    raider.hp = 40;
    const tile = getTileAt(g.state.map, raider.col, raider.row)!;
    tile.improvement = 'farm';
    slot(g.state, 0, 'scorchedEarth');
    const gold = g.state.players[0]!.gold;
    const raid = pillageAt(g.state, raider, tile);
    expect(g.state.players[0]!.gold).toBe(gold + RULES.improvements.pillageGold + 10);
    // The report carries the **salvage**; the rider's +10 is a grant paid beside
    // it into the same bank, which is `CampBounty.gold`'s reading exactly.
    expect(raid.gold).toBe(RULES.improvements.pillageGold);
    expect(raider.hp).toBe(40 + RULES.improvements.pillageHeal + 25);
    expect(raid.heal).toBe(RULES.improvements.pillageHeal + 25);
    // Capped at the type's maximum, like every other heal in the game — and the
    // report says what the bar moved by, not what was offered.
    raider.hp = 95;
    tile.improvement = 'farm';
    raider.movesLeft = 2;
    const second = pillageAt(g.state, raider, tile);
    expect(raider.hp).toBe(100);
    expect(second.heal).toBe(5);
  });

  it('pays the base heal with no card slotted at all', () => {
    // The half the riders used to be the only source of. A raid heals because it
    // is a raid; Scorched Earth only makes it heal *more*.
    const g = game(41);
    const raider = createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    raider.hp = 40;
    const tile = getTileAt(g.state.map, raider.col, raider.row)!;
    tile.improvement = 'farm';
    const raid = pillageAt(g.state, raider, tile);
    expect(raid.heal).toBe(RULES.improvements.pillageHeal);
    expect(raid.gold).toBe(RULES.improvements.pillageGold);
    expect(raid.warning).toBeNull();
  });

  it('windfallRider growth — Granary Levies pays the town that grew', () => {
    const g = game(41);
    const city = found(g.state, 0);
    slot(g.state, 0, 'granaryLevies');
    city.foodBasket = growthThreshold(city.population) + 5;
    city.hammerBasket = 0;
    city.queue = [];
    const before = city.population;
    settleGrowthWindfall(g.state, city);
    expect(city.population).toBe(before + 1);
    expect(city.hammerBasket).toBe(10);
  });

  it('actionRule doubleOverflow — the overflow doubles, and only the overflow', () => {
    const each = (card?: OrderId) => {
      const g = game(41);
      const city = found(g.state, 0);
      if (card) slot(g.state, 0, card);
      city.queue = [{ kind: 'building', id: 'monument' }];
      city.hammerBasket = buildingDef('monument').cost + 7;
      settleProduction(g.state, city);
      return city.hammerBasket;
    };
    expect(each()).toBe(7);
    expect(each('theCommonPurse')).toBe(14);
  });

  /**
   * The Standing Levy's rework (master-list cut, 2026-08-28). The card used to
   * be `actionRule unitJumpsQueue` — a unit finishing ahead of a building it
   * could outpace — and is now a **cadence**: a free melee unit in the capital
   * every ten turns. The queue-jumping rule is still in the vocabulary and no
   * live row declares it, which is why the behaviour it drove is no longer
   * pinned here.
   */
  it('periodicMuster — The Standing Levy raises a spear on the calendar, not on an occasion', () => {
    const g = game(41);
    const capital = found(g.state, 0);
    slot(g.state, 0, 'theStandingLevy');
    const mine = (): number => g.state.units.filter((u) => u.ownerId === 0).length;

    // An off-beat turn musters nothing: the cadence is `turn % every === 0` and
    // nothing anywhere counts down toward it.
    g.state.turn = 11;
    const quiet = mine();
    musterPeriodicUnits(g.state);
    expect(mine()).toBe(quiet);

    // The twelfth turn raises exactly one, in the seat of government (the
    // cadence went 10 → 12 in the balance pass of 2026-09-02).
    g.state.turn = 24;
    musterPeriodicUnits(g.state);
    expect(mine()).toBe(quiet + 1);
    const levied = g.state.units[g.state.units.length - 1]!;
    expect(unitDef(levied.type).modelClass).toBe('melee');
    // Nobody paid for it, so it goes on no payroll — a levy is a windfall's gift
    // by another name.
    expect(levied.freeUpkeep).toBe(true);
    // And it stands on its own capital's ground.
    expect(
      Math.abs(levied.col - capital.col) + Math.abs(levied.row - capital.row),
    ).toBeLessThanOrEqual(2);

    // A seat that does not hold the card is never mustered for.
    const other = game(41);
    found(other.state, 0);
    other.state.turn = 20;
    const before = other.state.units.filter((u) => u.ownerId === 0).length;
    musterPeriodicUnits(other.state);
    expect(other.state.units.filter((u) => u.ownerId === 0).length).toBe(before);
  });

  it('behaviorRule barbariansPassive — the wild stops choosing this seat', () => {
    const g = createGame({
      seed: 51,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    const wild = g.state.players.find((p) => p.barbarian)!;
    const mine = g.state.units.find((u) => u.ownerId === 0)!;
    const raider = createUnit(g.state, wild.id, 'warrior', mine.col, mine.row);
    recomputeVisibility(g.state, wild.id);
    // The wild can see this seat's pieces, so it has a target — until the pact.
    expect(nearestTarget(g.state, wild, raider)).not.toBeNull();
    g.state.players[0]!.statecraft.doctrines.push('wolfMothersPact');
    expect(nearestTarget(g.state, wild, raider)).toBeNull();
  });

  it('offerRider discoveryClaimAll — every option is paid, the chosen one first', () => {
    const g = game(41);
    const player = g.state.players[0]!;
    found(g.state, 0);
    player.statecraft.doctrines.push('athenaeumOfTheRoad');
    const gold = player.gold;
    const faith = player.faithPool;
    player.pendingDiscovery = {
      kind: 'ruins',
      col: g.state.cities[0]!.col,
      row: g.state.cities[0]!.row,
      options: ['tradersHoard', 'relicsOfTheOldFaith'],
    };
    const done = settleDiscovery(g.state, player, 0);
    // The settlement reported is still the card the player clicked.
    expect(done?.id).toBe('tradersHoard');
    // And both were paid.
    expect(player.gold).toBeGreaterThan(gold);
    expect(player.faithPool).toBeGreaterThan(faith);
  });

  it('effectAmplifier — The Grand Bazaar reaches into the luxury table', () => {
    const g = game(41);
    const city = found(g.state, 0);
    // A worked, improved luxury seam this city holds.
    const seam = ownedTiles(g.state, city).find((tile) => tile.col !== city.col)!;
    seam.resource = 'silk';
    seam.improvement = 'plantation';
    const before = explainHappiness(g.state, 0).find((line) => line.source.startsWith('Silk'));
    expect(before).toBeDefined();
    g.state.players[0]!.statecraft.doctrines.push('grandBazaar');
    const after = explainHappiness(g.state, 0).find((line) => line.source.startsWith('Silk'));
    // +50% on the flat per-unique figure, floored per line.
    expect(after!.value).toBe(Math.floor((before!.value * 150) / 100));
  });

  it('metaRule and cityStat reach the two rules nothing else can', () => {
    const g = game(41);
    const city = found(g.state, 0);
    // A card that rewrites Statecraft's own rule.
    expect(sealTurnsFor(g.state, 0)).toBe(5);
    slot(g.state, 0, 'theLooseRein');
    expect(sealTurnsFor(g.state, 0)).toBe(2);
    // A card that rewrites what a city is worth to storm and how far it sees.
    // The **city's** source, which is the last at that hex: `sightSources` walks
    // units first and then cities, and the opening roster is standing on the
    // capital. A `.find` here would measure a warrior's eyes.
    const citySight = (): number => {
      const sources = sightSources(g.state, 0).filter(
        (source) => source.tile.col === city.col && source.tile.row === city.row,
      );
      return sources[sources.length - 1]!.radius;
    };
    const sightBefore = citySight();
    slot(g.state, 0, 'militiaLevies');
    expect(citySight()).toBe(sightBefore + 1);
  });
});

/**
 * **The deepening ladder** (user, 2026-09-02: *"orders can only be deepened up
 * to level 3. Some cannot be upgraded"*).
 *
 * `scaleByLevel`'s blanket ×1.5 is gone and the increment is authored on the
 * row (`OrderDef.upgrade`), so the promise this block used to hold together —
 * *an upgrade always changes something* — is now a promise about **data**
 * rather than about arithmetic. It is asserted in both directions, because
 * either half alone is a way to hide the other:
 *
 *   1. a row carrying an increment must actually read differently at level 2;
 *   2. a row marked `upgradable: false` must carry no increment, and one
 *      carrying an increment must not be marked.
 *
 * The cap is the third leg: a card at its ceiling is not in the bag the upgrade
 * face is drawn from, so a draft can never offer a deepening the reading would
 * clamp away.
 */
describe('the deepening ladder', () => {
  /** True when this card's level-2 face reads differently from its level-1 face. */
  function deepens(id: OrderId): boolean {
    return JSON.stringify(describeCard(id, 1)) !== JSON.stringify(describeCard(id, 2));
  }

  it('reads level N as the printed face plus N−1 copies of the increment', () => {
    // Blooded Spears prints a point for everybody and two more against the
    // wild; its authored increment is the vs-barbarian point **alone**, which
    // is the whole reason the ladder was rewritten — the old multiplier grew
    // both clauses at once.
    const base = orderEffectsAtLevel('bloodedSpears', 1);
    expect(base).toEqual(orderDef('bloodedSpears').effects);
    const two = orderEffectsAtLevel('bloodedSpears', 2);
    expect(two).toHaveLength(base.length + 1);
    expect(two.slice(0, base.length)).toEqual(base);
    expect(two[base.length]).toEqual(orderDef('bloodedSpears').upgrade![0]);
    expect(orderEffectsAtLevel('bloodedSpears', 3)).toHaveLength(base.length + 2);
  });

  it('clamps a level above the ceiling rather than throwing', () => {
    const three = orderEffectsAtLevel('bloodedSpears', 3);
    expect(orderEffectsAtLevel('bloodedSpears', 4)).toEqual(three);
    expect(orderEffectsAtLevel('bloodedSpears', 99)).toEqual(three);
    // And below it: a save carrying 0 or a fraction reads as the printed face.
    expect(orderEffectsAtLevel('bloodedSpears', 0)).toEqual(orderDef('bloodedSpears').effects);
  });

  it('caps at three unless the row quotes its own ceiling', () => {
    expect(STATECRAFT.maxOrderLevel).toBe(3);
    for (const id of ORDER_IDS) expect(maxLevelOf(id), id).toBe(orderDef(id).maxLevel ?? 3);
    // The four rows whose ratified text states a ceiling of its own, derived
    // from the base, the increment and the words: "+1 gold, up to +6" from a
    // base of +3 is four levels; "+5%, up to 35%" from 15% is five.
    expect(maxLevelOf('silkRoads')).toBe(4);
    expect(maxLevelOf('publicGranaries')).toBe(5);
    expect(maxLevelOf('festivalDays')).toBe(3);
    expect(maxLevelOf('harbourDues')).toBe(3);
  });

  it('deepens every Order that is offerable as an upgrade', () => {
    const flat = ORDER_IDS.filter((id) => isUpgradable(id) && !deepens(id));
    expect(flat, `these read the same at level 2: ${flat.join(', ')}`).toEqual([]);
  });

  it('keeps the flag and the increment one decision', () => {
    for (const id of ORDER_IDS) {
      const def = orderDef(id);
      const authored = (def.upgrade ?? []).length > 0;
      expect(isUpgradable(id), `${id}: the flag and the increment disagree`).toBe(authored);
    }
    // Both halves of the table are real: nobody has quietly marked everything.
    expect(ORDER_IDS.filter((id) => isUpgradable(id)).length).toBeGreaterThan(0);
    expect(ORDER_IDS.filter((id) => !isUpgradable(id)).length).toBeGreaterThan(0);
  });

  /**
   * The rows whose ratified deepening changes a **parameter** rather than a
   * line — The Standing Levy's cadence, Pilgrim Roads' cap on what it may pay.
   *
   * Neither can be said as an increment: a second `periodicMuster` musters
   * twice rather than sooner, and a second capped `countScaled` pays past its
   * own cap. So they ship marked, with the ratified words in `deferred` rather
   * than bent into a shape that nearly fits (Entry XV.b) — and the register is
   * written down here so that giving one of them a face later costs a
   * deliberate edit to this list.
   */
  const PARAMETER_DEEPENERS: readonly string[] = ['theStandingLevy', 'pilgrimRoads'];

  it('says out loud which rows deepen a parameter it cannot say', () => {
    for (const id of PARAMETER_DEEPENERS) {
      expect(isUpgradable(id as OrderId), id).toBe(false);
      expect((orderDef(id as OrderId).deferred ?? []).length, id).toBeGreaterThan(0);
    }
  });

  it('never rolls an unupgradable card as the upgrade option', () => {
    const game = createGame({
      seed: 99,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
    });
    const player = game.state.players[0]!;
    const sc = newPlayerStatecraft();
    player.statecraft = sc;
    // An empire holding *only* switches has nothing to deepen, and the offer
    // says so by having no upgrade at all rather than by offering a no-op.
    sc.orders = ORDER_IDS.filter((id) => !isUpgradable(id)).map((id) => ({ id, level: 1 }));
    expect(sc.orders.length).toBeGreaterThan(0);
    expect(drawOrderOffer(game.state, player).upgrade).toBeUndefined();

    // Add one card that does deepen and it is the only thing that can be rolled,
    // however many times the bag is drawn from.
    const deepenable = ORDER_IDS.find((id) => isUpgradable(id))!;
    sc.orders.push({ id: deepenable, level: 1 });
    for (let draw = 0; draw < 40; draw++) {
      expect(drawOrderOffer(game.state, player).upgrade).toBe(deepenable);
    }
  });

  it('never rolls a card that has reached its ceiling', () => {
    const game = createGame({
      seed: 7,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
    });
    const player = game.state.players[0]!;
    const sc = newPlayerStatecraft();
    player.statecraft = sc;
    // One card, held at its ceiling: there is nothing left to deepen, and the
    // offer says so rather than dealing a face the reading would clamp away.
    sc.orders = [{ id: 'bloodedSpears', level: maxLevelOf('bloodedSpears') }];
    expect(canDeepen(sc.orders[0]!)).toBe(false);
    expect(drawOrderOffer(game.state, player).upgrade).toBeUndefined();
    // One level short of it, and it is the only thing in the bag.
    sc.orders = [{ id: 'bloodedSpears', level: maxLevelOf('bloodedSpears') - 1 }];
    expect(canDeepen(sc.orders[0]!)).toBe(true);
    expect(drawOrderOffer(game.state, player).upgrade).toBe('bloodedSpears');
  });
});

// --- the master-list cut of 2026-08-28 --------------------------------------

/**
 * The rows the user rewrote in `docs/orders-and-doctrines.md`, and the shapes
 * they needed.
 *
 * One behavioural test per **new shape** — the register test above only proves a
 * shape is *named* by a row, and a shape that is named and unread is exactly the
 * failure the vocabulary exists to prevent — plus the printed sentence of every
 * changed row, because the doc's sentence *is* the card and a row whose effects
 * drifted from its words is a card that lies.
 */
describe('the master-list cut of 2026-08-28', () => {
  it('buildingsOfCategory — the Merchant League pays per gold building', () => {
    const g = game();
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'merchantLeague';
    // No gold buildings: no line at all, rather than a line worth nothing.
    expect(cardEmpireYields(g.state, 0).some((l) => l.card === 'merchantLeague')).toBe(false);
    city.buildings.push('market');
    expect(foldCardYields(cardEmpireYields(g.state, 0)).gold).toBe(1);
    // A *second* market in a second town is a second helping: the count is of
    // buildings across the realm, which is what `buildingsOfKind` counts one
    // grade narrower.
    city.buildings.push('monument');
    expect(foldCardYields(cardEmpireYields(g.state, 0)).gold).toBe(1);
  });

  it('capitalFaithPerTurn — Theocracy tithes the capital and nowhere else', () => {
    const g = game();
    found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'theocracy';
    const lines = cardEmpireYields(g.state, 0, { faithPerTurn: 100, capitalFaithPerTurn: 30 });
    const paid = foldCardYields(lines);
    // Ten percent of the *capital's* thirty, twice over — and deliberately not
    // ten percent of the empire's hundred.
    expect(paid.science).toBe(3);
    expect(paid.culture).toBe(3);
  });

  it('routeYields — the charter is a line in the caravan breakdown, not a multiplication after it', () => {
    const g = game();
    const from = found(g.state, 0);
    const to = foundCityAt(g.state, 0, getTileAt(g.state.map, (from.col + 5) % g.state.map.width, from.row)!);
    from.buildings.push('market', 'workshop', 'barracks', 'granary', 'library', 'monument');
    const before = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
    playerById(g.state, 0)!.statecraft.government = 'merchantLeague';
    const after = explainRouteYieldBetween(g.state, from, to);
    // Rule 5: the extra is a line of the list the totals are the fold of.
    expect(after.some((line) => line.source.includes('cards'))).toBe(true);
    const paid = foldRouteYield(after);
    expect(paid.food).toBe(before.food + Math.floor((before.food * 50) / 100));
    expect(paid.production).toBe(before.production + Math.floor((before.production * 50) / 100));
  });

  it('greatPeopleOfFamily — The Empire scales with the generals it has earned', () => {
    const g = createGame({
      seed: 5,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    const wild = g.state.players.find((p) => p.barbarian)!;
    const player = playerById(g.state, 0)!;
    player.statecraft.government = 'theEmpire';
    const mine = g.state.units.find((u) => u.ownerId === 0 && u.type === 'warrior')
      ?? createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    const target = getTileAt(g.state.map, mine.col + 1, mine.row)!;
    createUnit(g.state, wild.id, 'warrior', target.col, target.row);
    const before = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    if (!before.ok) return;
    // No generals, no line: a zero pays nothing rather than a line worth zero.
    expect(before.bonuses.some((b) => b.source.includes('The Empire'))).toBe(false);
    // A general already **spent** counts: "earned this game" is the roll of who
    // has ever answered, which is the legacies plus whoever is still walking.
    // Asserted as the card's own labelled line rather than as a change in the
    // total — a legacy is itself a live card and moves the same total.
    player.legacies.push({ id: 'hannibal', age: 1 });
    const after = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    const line = after.bonuses.find((b) => b.source.includes('The Empire'))!;
    expect(line.amount).toBe(1);
    // A scholar is not a general — the family is the whole of the rule.
    player.legacies.push({ id: 'imhotep', age: 1 });
    const third = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    if (third.ok) {
      expect(third.bonuses.find((b) => b.source.includes('The Empire'))!.amount).toBe(1);
    }
  });

  it('renown per wonder — The Magisterium pays for the stones it holds', () => {
    const g = game();
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'theMagisterium';
    expect(cardRenownLines(g.state, 0)).toEqual([]);
    city.buildings.push('pyramids');
    expect(cardRenownLines(g.state, 0)).toEqual([
      {
        card: 'theMagisterium',
        source: 'Government · The Magisterium · 3 per wonder × 1',
        family: null,
        amount: 3,
      },
    ]);
  });

  it('defensiveBuildings — The Long Watch counts the walls, read off the rows', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'theLongWatch');
    const before = foldMeter(explainHappiness(g.state, 0));
    // A granary is not a fortification and a palisade is — decided by what the
    // row does to the town, never by a list of names.
    city.buildings.push('granary');
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(before);
    city.buildings.push('palisade');
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(before + 1);
  });

  it('discoveredCamps and vsBarbarians — Border Ballads pays for the wild twice over', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'borderBallads');
    expect(cardEmpireYields(g.state, 0).some((l) => l.card === 'borderBallads')).toBe(false);
    // A camp on ground this seat has walked past. `visibleCamps`' sibling: the
    // grid is monotone, so the count does not fall when the scout goes home.
    g.state.camps.push({ col: city.col, row: city.row, foundedTurn: 0 });
    expect(foldCardYields(cardEmpireYields(g.state, 0)).culture).toBe(2);
    // The kill rider fires only against the wild.
    expect(windfallPayout(g.state, 0, 'kill').grants).toEqual([]);
    expect(windfallPayout(g.state, 0, 'kill', 0, 0, { vsBarbarians: true }).grants).toEqual([
      { card: 'borderBallads', source: 'Order · Border Ballads', yield: 'culture', amount: 10 },
    ]);
  });

  it('tradeRoutes — Silk Roads counts the caravans that are actually running', () => {
    const g = game();
    const from = found(g.state, 0);
    const to = foundCityAt(g.state, 0, getTileAt(g.state.map, (from.col + 5) % g.state.map.width, from.row)!);
    slot(g.state, 0, 'silkRoads');
    expect(cardEmpireYields(g.state, 0).some((l) => l.card === 'silkRoads')).toBe(false);
    const trader = createUnit(g.state, 0, 'warrior', from.col, from.row);
    trader.trade = { from: from.id, to: to.id, expiresTurn: g.state.turn + 10, outbound: true, autoResend: false };
    expect(foldCardYields(cardEmpireYields(g.state, 0)).gold).toBe(3);
    // A lapsed route is not a route: expiry is one comparison, here as everywhere.
    trader.trade.expiresTurn = g.state.turn;
    expect(cardEmpireYields(g.state, 0).some((l) => l.card === 'silkRoads')).toBe(false);
  });

  it('buying or completing — Rites of Passage pays once for a warrior, however it was paid for', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    slot(g.state, 0, 'ritesOfPassage');
    expect(windfallPayout(g.state, 0, 'unitCompletion').grants[0]?.amount).toBe(10);
    // **One row covers both halves of the card**, because a bought thing is
    // realised through `realiseItem` exactly as a built one is and the
    // completion riders live inside that routine. A second `purchase` occasion
    // would have paid this card twice for one warrior — see `WindfallOccasion`.
    player.gold = 10000;
    const faith = player.faithPool;
    const bought = dispatch(g, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'unit', id: 'warrior' },
      currency: 'gold',
    } as unknown as Command);
    expect(bought.ok).toBe(true);
    expect(player.faithPool).toBe(faith + 10);
  });

  it('randomMilitary — Camp Followers gifts a piece, and the same piece on a replay', () => {
    const draw = (seed: number): { type: string; note: string } => {
      const g = game(seed);
      found(g.state, 0);
      slot(g.state, 0, 'campFollowers');
      const payout = windfallPayout(g.state, 0, 'camp');
      return { type: payout.units[0]!.type, note: payout.lines.map((l) => l.note).join('|') };
    };
    const first = draw(7);
    // Drawn from `state.rng` at the moment the payout is composed, so the same
    // seed and the same log land the same spearman.
    expect(draw(7)).toEqual(first);
    expect(unitDef(first.type as never).category).toBe('military');
    expect(first.note).toContain('joins you');

    // And it is *delivered*, through `realiseItem` — the one completion routine.
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'campFollowers');
    const before = g.state.units.length;
    const payout = windfallPayout(g.state, 0, 'camp');
    payWindfallGrants(g.state, playerById(g.state, 0)!, payout, { col: city.col, row: city.row });
    expect(g.state.units.length).toBe(before + 1);
  });

  it('population within a city — the Republic pays each town for its own citizens', () => {
    const g = game();
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'republic';
    city.population = 12;
    const line = cardCityYields(g.state, city).find((l) => l.card === 'republic')!;
    expect(line.culture).toBe(2);
    // Empire-wide it would have been the realm's whole population; `within` is
    // what makes it this town's.
    expect(cardEmpireYields(g.state, 0).some((l) => l.card === 'republic')).toBe(false);
  });

  it("foundingRider roads — The Founders' Road joins a new town to the realm", () => {
    const g = game();
    const first = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('foundersRoad');
    expect(cardFoundingRider(g.state, 0).roads).toBe(true);
    const far = getTileAt(g.state.map, (first.col + 5) % g.state.map.width, first.row)!;
    foundCityAt(g.state, 0, far);
    // Re-pinned by the user's ruling of 2026-08-28: it is a **survey** now, not
    // a straight line, so what this test can assert on generated ground is the
    // *shape* of the answer rather than which hexes it picked — every hex the
    // decree laid is maintenance-free, and the empire is billed for none of it.
    // The two cases that need a built board (the whole path across land, and
    // nothing at all across a strait) are pinned in `test/sim/trade.test.ts`,
    // where the road rules live.
    const decreed = g.state.map.tiles.filter((tile) => tile.road === 0);
    for (const tile of decreed) expect(tile.roadFree).toBe(true);
    expect(roadsBuiltBy(g.state, 0)).toBe(0);
    // The first city of a realm has nowhere to be joined to and is left alone.
    const g2 = game();
    g2.state.players[0]!.statecraft.doctrines.push('foundersRoad');
    const only = found(g2.state, 0);
    expect(getTileAt(g2.state.map, only.col, only.row)!.road).toBeUndefined();
  });

  it('unlocksBuilding — the Gilded Hall is opened by the Court and sold, never built', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    // Without the doctrine the row does not exist for this empire at all, which
    // is what `unlockedByCard` buys: an ungated building would otherwise be
    // available from turn one.
    expect(isUnlocked(g.state, 0, 'building', 'gildedHall')).toBe(false);
    player.statecraft.doctrines.push('gildedCourt');
    expect(isUnlocked(g.state, 0, 'building', 'gildedHall')).toBe(true);
    // Open, and still not buildable: it is bought or not at all.
    expect(buildError(g.state, 0, 'building', 'gildedHall', city)).toContain('bought');
    player.gold = 10000;
    expect(purchaseError(g.state, 0, city.id, { kind: 'building', id: 'gildedHall' }, 'gold')).toBeNull();
    const price = explainPurchaseCost(g.state, 0, city.id, { kind: 'building', id: 'gildedHall' }, 'gold')!;
    // The card's 500 gold is the row's 250 hammers at `goldPerHammer`.
    expect(price.total).toBe(buildingDef('gildedHall').cost * RULES.production.goldPerHammer);
  });

  it("barbarianKillsConvert — Wolf-Mother's Pact takes the fallen instead of burying them", () => {
    const g = createGame({
      seed: 5,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    const wild = g.state.players.find((p) => p.barbarian)!;
    g.state.players[0]!.statecraft.doctrines.push('wolfMothersPact');
    const mine = g.state.units.find((u) => u.ownerId === 0 && u.type === 'warrior')
      ?? createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    const target = getTileAt(g.state.map, mine.col + 1, mine.row)!;
    const raider = createUnit(g.state, wild.id, 'warrior', target.col, target.row);
    raider.hp = 1;
    const preview = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    if (!preview.ok) return;
    const result = dispatch(g, {
      type: 'attack', playerId: 0, unitId: mine.id, target: { col: target.col, row: target.row },
    } as unknown as Command);
    expect(result.ok).toBe(true);
    const after = g.state.units.find((u) => u.id === raider.id);
    // Not dead: standing, on its feet, and flying the killer's colours.
    expect(after).toBeDefined();
    expect(after!.ownerId).toBe(0);
    expect(after!.hp).toBeGreaterThan(0);
  });

  it("noCampClearing — Wolf-Mother's Pact does not sack its ally's villages", () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    g.state.camps.push({ col: tile.col, row: tile.row, foundedTurn: 0 });
    player.statecraft.doctrines.push('wolfMothersPact');
    expect(arriveOnTile(g.state, unit, tile).camp).toBeNull();
    expect(g.state.camps).toHaveLength(1);
    // Without the doctrine the same arrival burns it out — the rule is the card.
    player.statecraft.doctrines = [];
    expect(arriveOnTile(g.state, unit, tile).camp).not.toBeNull();
    expect(g.state.camps).toHaveLength(0);
  });

  it('onSlot — The Auspicious Seal pays one die, and never a second', () => {
    // The Laureate carried this machinery until the Themes Build's rework
    // (sheet 09, the user): its face is a renown trickle now, and the
    // once-per-game claim moved to The Auspicious Seal's die. The *mechanism* is
    // unchanged and is what this pins — `grantedOnSlot` is presence, and nothing
    // removes an entry.
    const g = game();
    found(g.state, 0);
    keepTheRites(g.state);
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
    grant(sc, 'theAuspiciousSeal');
    const before = player.dice;
    // Room for it: the chiefdom's wildcard slot takes anything.
    const index = slotLayout(sc.government).indexOf('wildcard');
    expect(dispatch(g, {
      type: 'slotOrder', playerId: 0, cardId: 'theAuspiciousSeal', slotIndex: index,
    } as Command).ok).toBe(true);
    expect(sc.grantedOnSlot).toEqual(['theAuspiciousSeal']);
    expect(player.dice).toBe(before + 1);

    // Empty the slot when the seal lifts and slot it again: no second die.
    g.state.turn = sc.slots[index]!.sealedUntil;
    expect(dispatch(g, { type: 'unslotOrder', playerId: 0, slotIndex: index } as Command).ok).toBe(true);
    expect(dispatch(g, {
      type: 'slotOrder', playerId: 0, cardId: 'theAuspiciousSeal', slotIndex: index,
    } as Command).ok).toBe(true);
    expect(sc.grantedOnSlot).toEqual(['theAuspiciousSeal']);
    expect(player.dice).toBe(before + 1);
  });

  it('offers Gov IV and Gov V at their rungs, and deals a Doctrine pool for each', () => {
    for (const tier of [29, 45]) {
      expect(governmentsAtTier(tier)).toHaveLength(3);
      expect(poolDoctrines(tier).length).toBeGreaterThanOrEqual(RULES.offers.doctrine);
      // Every one of them opens the last Order pool — the ladder's top rung has
      // no pool of its own, and `poolOfGovernment` says so rather than throwing.
      for (const id of governmentsAtTier(tier)) {
        expect(poolOfGovernment(id)).toBe('governmentIII');
      }
    }
    const g = game();
    const player = playerById(g.state, 0)!;
    // Straight to the fourth rung: the offer is a fact about the tier.
    player.statecraft.drafts = 28;
    player.culturePool = draftCost(28);
    settleCultureWindfall(g.state, player);
    dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    expect(player.statecraft.pendingGovernment?.options).toEqual(governmentsAtTier(29));
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command).ok).toBe(true);
    expect(player.statecraft.pendingDoctrine?.options.length).toBe(RULES.offers.doctrine);
    for (const id of player.statecraft.pendingDoctrine!.options) {
      expect(doctrineDef(id).tier).toBe(29);
    }
  });

  it('retires The Loose Rein from every pool while keeping the row readable', () => {
    expect(orderDef('theLooseRein').retired).toBe(true);
    for (const pool of ORDER_POOLS) expect(poolOrders(pool)).not.toContain('theLooseRein');
    // Still a card: a save that holds it slotted still replays, and it still
    // says what it does.
    expect(describeCard('theLooseRein').map((c) => c.text)).toEqual([
      'a newly placed Order is locked for 2 turns instead of 5',
    ]);
    const g = game();
    slot(g.state, 0, 'theLooseRein');
    expect(sealTurnsFor(g.state, 0)).toBe(2);
  });

  it('reads a seal card as a departure from the table, so a longer seal is a real cost', () => {
    const g = game();
    expect(sealTurnsFor(g.state, 0)).toBe(STATECRAFT.meter.sealTurns);
    playerById(g.state, 0)!.statecraft.doctrines.push('absolutism');
    expect(sealTurnsFor(g.state, 0)).toBe(10);
  });

  it('prints every changed row in the words the master list ratified', () => {
    // **Stripped**: a clause's `text` now marks the things it names
    // (`ref`/`stripRefs`, the keyword pass of 2026-08-28), and what the master
    // list ratified was the *words*. `stripRefs` is the guarantee that the marks
    // never change them, so this is the assertion that holds it.
    const said = (id: string): string[] =>
      describeCard(id as never).map((c) => stripRefs(c.text));

    expect(said('republic')).toEqual([
      '+1 culture per 5 population in this city',
      '-5% happiness demanded per citizen',
    ]);
    expect(said('tyranny')).toEqual([
      '+3 authority capacity',
      'pillaging pays +50%',
      // Built by the 2026-08-28 pass: unit maintenance exists now (`upkeep.ts`),
      // so the clause is a `rulePercent` on the eighth `CardRule` rather than a
      // sentence struck through.
      '-30% the gold your units cost in maintenance',
    ]);
    expect(said('theocracy')).toEqual([
      '+2 faith in every city',
      '+1 science per 10 faith your capital gains per turn',
      '+1 culture per 10 faith your capital gains per turn',
    ]);
    expect(said('merchantLeague')).toEqual([
      '+1 gold per gold building',
      'trade routes pay +50% more',
    ]);
    expect(said('imperium')).toEqual(['+3 authority capacity', 'all units: +1 movement']);

    expect(said('theEstates')).toEqual([
      '+1 happiness in every city',
      '+2 culture in every city of 8+',
    ]);
    expect(said('theSultanate')).toEqual([
      'all units: +1 movement',
      // +25%, not −20%: a negative production bonus toward units made The
      // Sultanate's units *slower* — the sign was the bug (2026-08-29). A fifth
      // off the price is a quarter more hammers behind it.
      '+25% production toward units',
      '+10% science in every captured city',
      '+10% culture in every captured city',
    ]);
    expect(said('theCuria')).toEqual([
      // Built by the 2026-08-28 pass: `mirrorYield` reads one voice off the
      // buildings of one category and pays it as another. The Cathedral half
      // still waits on the tree.
      'faith buildings supply science equal to their faith, in every city',
      '+3 faith per Cathedral — not built yet',
    ]);
    // Both halves built by the 2026-08-28 pass. A great person is still
    // *called* rather than bought — what the gold buys is the **recruitment**
    // (`purchaseGreatPersonOffer`) — and the works' half is the first
    // `tileYield` percentage, which reaches the improvement's own lines only.
    expect(said('theCommonwealth')).toEqual([
      'a great person waiting to be called may be bought with gold',
      "the works on every hex carrying a great person's work pay +50% more",
    ]);
    expect(said('theEmpire')).toEqual([
      '+6 authority capacity',
      '+1 combat strength per great general earned this game',
      // Built by the 2026-08-28 pass: a `windfallRider` narrowed by what stood
      // in the town (`WindfallOccasionFacts.capturedWonder`).
      'capturing a city with a wonder in it heals every one of your units',
    ]);
    expect(said('theMagisterium')).toEqual([
      '+1 card in every offer of every kind',
      '+3 renown per turn per wonder you hold',
      'a great person waiting to be called may be bought with faith',
    ]);

    expect(said('wolfMothersPact')).toEqual([
      'barbarians never attack you',
      'a barbarian you kill joins you instead of dying',
      'you can no longer clear a barbarian camp',
    ]);
    expect(said('foundersRoad')).toEqual([
      'new cities are founded with a Monument (first 5 cities)',
      'new cities are joined to your nearest city by road',
      // The master-list cut of 2026-08-28: the ratified text now promises the
      // *better* hall once one exists, and there is no amphitheatre row to
      // name — so the half is deferred on the row and printed as such.
      'an amphitheatre instead of the Monument, once one is unlocked — not built yet',
    ]);
    expect(said('gildedCourt')).toEqual([
      'unlocks the Gilded Hall',
      // The 2026-09-02 rework: the writ dropped to one point and the card bought
      // a hex clause with the difference — the first `yields` condition, asked
      // of the breakdown the hex has already been reckoned to pay.
      '+1 science, +1 culture on every hex that yields gold',
      '+1 authority capacity',
    ]);
    // The pillage heal was Scorched Earth's all along, and the balance pass of
    // 2026-08-31 gave the second half back to the doc's own sentence — which the
    // board cannot answer, so it is deferred rather than approximated.
    expect(said('burningWay')).toEqual([
      'clearing a forest or jungle costs no worker charge',
      '+1 food on every hex you have cleared of forest or jungle — not built yet',
    ]);
    expect(said('scorchedEarth')).toEqual([
      'pillaging heals a further 25',
      'pillaging grants +10 gold',
    ]);

    expect(said('bloodedSpears')).toEqual([
      '+1 combat strength',
      '+2 combat strength against barbarians',
    ]);
    expect(said('campFollowers')).toEqual([
      'clearing a barbarian camp grants +25 food',
      'clearing a barbarian camp grants a random military unit',
    ]);
    expect(said('farRunners')).toEqual([
      'scout units: +1 movement',
      'scout units: +1 sight',
      'civilian units: +2 movement while embarked',
      // The trader is its own model class as of 2026-08-28, and a filter that
      // says "civilian" no longer reaches it — so the row grants both, and the
      // card says both.
      'trader units: +2 movement while embarked',
    ]);
    expect(said('theLongWatch')).toEqual([
      // 2026-08-28: the user's correction — a unit standing in the city, whatever
      // its fortification, is the watch.
      '+1 happiness per combat unit standing in the city',
      '+1 happiness per fortification in this city',
    ]);
    expect(said('theWidowsLevy')).toEqual([
      'losing a unit grants +10 production',
      'losing a unit grants +40 gold',
    ]);
    // 2026-08-31: the granary is a fact about the **town** now — the luxury hex
    // line it used to carry is The Orchard Tithe's.
    expect(said('commonGranary')).toEqual([
      '+1 food in every city holding an improved luxury resource',
    ]);
    expect(said('saltTithes')).toEqual(['+2 gold per unique luxury']);
    expect(said('borderBallads')).toEqual([
      '+2 culture per barbarian camp you have found',
      'killing a barbarian unit grants +10 culture',
    ]);
    expect(said('silkRoads')).toEqual(['+3 gold per trade route you run']);
    expect(said('festivalDays')).toEqual(['+4 happiness']);
    expect(said('ritesOfPassage')).toEqual(['completing a unit grants +10 faith']);
    // The Themes Build's rework (sheet 09, the user): the trickle replaces the
    // one-off laureate, and the five works are untouched.
    expect(said('theLaureate')).toEqual([
      '+1 renown per turn',
      '+2 science on every hex with an Academy',
      '+2 culture on every hex with a Landmark',
      '+2 production on every hex with a Manufactory',
      '+2 gold on every hex with a Customs House',
      '+2 production on every hex with a Citadel',
    ]);

    // The beliefs the same pass touched, read by the same evaluator.
    expect(said('ladyOfTheHunt')).toEqual([
      '+1 food, +1 gold on every hex with a Camp',
      'clearing a barbarian camp grants +10 faith',
    ]);
    expect(said('lordOfTheSea')).toEqual(['+1 production, +1 gold on every hex with a Fishing Boat']);
  });
});

// --- the deferred halves the 2026-08-28 pass built --------------------------

/**
 * Six clauses that had shipped as `deferred:` sentences because the game had no
 * mechanism to say them, and now have one. Each is asserted where its fold
 * already lives — the treasury's ledger, a town's yields, a hex's breakdown, the
 * capture path — rather than through a second reading of the card.
 */
describe('the governments’ deferred halves, built', () => {
  /** Puts an empire under one government outright. Test scaffolding only. */
  function govern(state: GameState, playerId: number, id: string): void {
    playerById(state, playerId)!.statecraft.government = id as never;
  }

  it('Tyranny gives back a share of the payroll, as its own labelled line', () => {
    const g = game(301);
    found(g.state, 0);
    // An army worth paying for. `explainUnitUpkeep` is the gross list and stays
    // gross — the rebate is a line beside it, not a discount inside it.
    for (let i = 0; i < 4; i++) createUnit(g.state, 0, 'warrior', 3, 3);
    const gross = unitUpkeepTotal(g.state, 0);
    expect(gross).toBeGreaterThan(0);
    expect(explainUnitUpkeepRebate(g.state, 0)).toHaveLength(0);

    govern(g.state, 0, 'tyranny');
    const rebate = explainUnitUpkeepRebate(g.state, 0);
    expect(rebate).toHaveLength(1);
    expect(rebate[0]!.gold).toBe(Math.floor((gross * 30) / 100));
    // And it reaches the one list the treasury's figure is the fold of.
    const ledger = explainEmpireGold(g.state, 0);
    expect(ledger.some((line) => line.source.includes('Tyranny'))).toBe(true);
    expect(unitUpkeepTotal(g.state, 0)).toBe(gross);
  });

  it('The Standing Army pays nothing at all, and never mints', () => {
    const g = game(303);
    found(g.state, 0);
    for (let i = 0; i < 4; i++) createUnit(g.state, 0, 'warrior', 3, 3);
    const gross = unitUpkeepTotal(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('theStandingArmy' as never);
    const rebate = explainUnitUpkeepRebate(g.state, 0);
    expect(rebate.reduce((sum, line) => sum + line.gold, 0)).toBe(gross);
  });

  it('The Curia pays science equal to what its faith buildings supply', () => {
    const g = game(307);
    const city = found(g.state, 0);
    govern(g.state, 0, 'theCuria');
    // Measured against the *same town under any other law*, so the shrine's own
    // science is on both sides of the comparison and what is left is the mirror.
    const under = (law: string): number => {
      govern(g.state, 0, law);
      return cityYields(g.state, city).science;
    };
    // A granary is not a faith building: the clause reads the rows' own
    // category and their own faith, never the town's total.
    city.buildings.push('granary');
    expect(under('theCuria')).toBe(under('chiefdom'));
    city.buildings.push('shrine');
    const shrineFaith = buildingDef('shrine').faith ?? 0;
    expect(shrineFaith).toBeGreaterThan(0);
    expect(under('theCuria')).toBe(under('chiefdom') + shrineFaith);
  });

  it('The Commonwealth raises a great person’s works and nothing else on the hex', () => {
    const g = game(311);
    const city = found(g.state, 0);
    govern(g.state, 0, 'theCommonwealth');
    const tile = getTileAt(g.state.map, city.col + 1, city.row)!;
    const shareLine = (): (typeof lines)[number] | undefined => {
      const found = explainTileYield(tile, yieldContextFor(g.state, 0)).filter((line) =>
        line.source.includes('Commonwealth'),
      );
      return found[0];
    };
    let lines = explainTileYield(tile, yieldContextFor(g.state, 0));
    expect(shareLine()).toBeUndefined();
    // An ordinary improvement is not a work: the condition reads the
    // improvement table's own marker, never a list of five names.
    tile.improvement = 'farm';
    expect(shareLine()).toBeUndefined();

    tile.improvement = 'academy';
    lines = explainTileYield(tile, yieldContextFor(g.state, 0));
    const works = lines.find((line) => line.source === improvementDef('academy').name)!;
    const share = shareLine()!;
    // A share of the **works**, never of the ground: the terrain's own yields
    // are on the same list and are not what the card raised.
    expect(share.science).toBe(Math.floor((works.science * 50) / 100));
    // And it is a line of the breakdown, so the fold is still the total.
    expect(lines[lines.length - 1]).toStrictEqual(share);
  });

  it('The Empire heals the army when the town it took held a wonder', () => {
    const g = game(313);
    found(g.state, 0);
    govern(g.state, 0, 'theEmpire');
    const hurt = createUnit(g.state, 0, 'warrior', 3, 3);
    hurt.hp = 1;
    const player = playerById(g.state, 0)!;

    // A capture with no wonder in the town pays nothing at all.
    const plain = windfallPayout(g.state, 0, 'capture', 0, 0, {});
    expect(plain.healAll).toBe(false);
    const withWonder = windfallPayout(g.state, 0, 'capture', 0, 0, { capturedWonder: true });
    expect(withWonder.healAll).toBe(true);
    payWindfallGrants(g.state, player, withWonder, { col: 3, row: 3 });
    expect(hurt.hp).toBe(unitDef('warrior').maxHp);
  });

  it('The Commonwealth sells the recruitment, and no other law does', () => {
    const g = game(317);
    found(g.state, 0);
    keepTheRites(g.state);
    const player = playerById(g.state, 0)!;
    player.gold = 10_000;
    // Under the opening chiefdom there is no such verb at all.
    expect(greatPersonPurchaseError(g.state, 0, 'gold')).toContain('law does not let');
    govern(g.state, 0, 'theCommonwealth');
    expect(greatPersonPurchaseError(g.state, 0, 'gold')).toBeNull();
    // …and only out of the bank the law names.
    expect(greatPersonPurchaseError(g.state, 0, 'faith')).toContain('law does not let');

    const price = greatPersonOfferPrice('gold');
    const before = player.gold;
    expect(applyCommand(g.state, {
      type: 'purchaseGreatPersonOffer',
      playerId: 0,
      currency: 'gold',
    }).ok).toBe(true);
    expect(player.gold).toBe(before - price);
    // **One draft path**: the offer opened by exactly the code the ladder opens
    // one by, and it blocks End Turn like any other.
    expect(player.greatPersonOffer!.options.length).toBeGreaterThan(0);
    expect(greatPersonBlocker(player)).not.toBeNull();
    // Nothing was minted — a great person is still *called*.
    expect(g.state.units.some((u) => u.person !== undefined)).toBe(false);
    // And a second purchase is refused while the first is unanswered.
    expect(greatPersonPurchaseError(g.state, 0, 'gold')).toContain('already has');
  });

  it('refuses the purchase to an empty treasury, byte-identically', () => {
    const g = game(319);
    found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'theCommonwealth' as never;
    playerById(g.state, 0)!.gold = 0;
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, {
      type: 'purchaseGreatPersonOffer',
      playerId: 0,
      currency: 'gold',
    }).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });
});

describe('the doctrines’ deferred halves, built', () => {
  it('The Encyclopaedia hurries a science building and no other', () => {
    const g = game(331);
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('theEncyclopaedia' as never);
    // Read off `BuildingDef.category`, so a second science building is a JSON
    // row rather than an edit to the card.
    expect(buildingDef('library').category).toBe('science');
    const library = cardProduction(g.state, city, 'building', undefined, 'library');
    expect(library.reduce((sum, line) => sum + line.percent, 0)).toBe(50);
    expect(cardProduction(g.state, city, 'building', undefined, 'granary')).toHaveLength(0);
    // And a row with no building in hand is not a building at all.
    expect(cardProduction(g.state, city, 'building')).toHaveLength(0);
  });

  it('The Grand Tour counts the world’s wonders, seen or not', () => {
    const g = game(333);
    found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('theGrandTourII' as never);
    expect(foldCardYields(cardEmpireYields(g.state, 0)).culture).toBe(0);
    // The claim register, which is where a wonder is written down once and
    // never moves — a rival's marvel counts exactly as your own does.
    g.state.wonders.push({ building: 'theOracle', playerId: 1, cityId: 0, turn: 1 });
    expect(foldCardYields(cardEmpireYields(g.state, 0)).culture).toBe(1);
  });

  it('The Academy trades culture for science, both at the empire stage', () => {
    // The 2026-09-02 rework: the row kept its id and lost its Triumph doubling
    // outright, so nothing amplifies a Triumph's renown any more. What is left
    // is a plain bargain, and both halves are **empire**-stage percentages —
    // one sum, applied once, exactly as Entry XVII asks.
    const g = game(337);
    const city = found(g.state, 0);
    expect(cardPercentYields(g.state, city).some((l) => l.card === 'theAcademyOfDeeds')).toBe(false);
    playerById(g.state, 0)!.statecraft.doctrines.push('theAcademyOfDeeds' as never);
    const lines = cardPercentYields(g.state, city).filter((l) => l.card === 'theAcademyOfDeeds');
    expect(lines.map((l) => [l.yield, l.percent, l.stage])).toEqual([
      ['culture', -10, 'empire'],
      ['science', 20, 'empire'],
    ]);
    // And the doubling is gone with the rework: a Triumph pays its printed
    // renown and nothing folds onto it.
    const before = playerById(g.state, 0)!.renownPool;
    awardOccasion(g.state, 0, 'campCleared');
    const paid = playerById(g.state, 0)!.renownPool - before;
    const plain = game(337);
    found(plain.state, 0);
    const was = playerById(plain.state, 0)!.renownPool;
    awardOccasion(plain.state, 0, 'campCleared');
    expect(paid).toBe(playerById(plain.state, 0)!.renownPool - was);
  });
});

// --- the master-list cut of 2026-08-28, second pass --------------------------

/**
 * The rows the user rewrote in the second pass over
 * `docs/orders-and-doctrines.md`, and the three shapes they needed:
 * `authorityPositive` (an empire gate), `CardUnitStatEffect.scope` (a stat asked
 * of the town that trained the piece) and `periodicMuster` (a unit raised on the
 * calendar). One behavioural test each, plus the numbers that moved and could
 * only be checked by reading the ledger they land in.
 */
describe('the master-list cut of 2026-08-28, second pass', () => {
  it('authorityPositive — Bread and Circuses opens and closes with the writ', () => {
    const g = game(401);
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.statecraft.doctrines.push('breadAndCircuses' as never);

    // A fresh empire has spare writ, so the gate is open and the clause is a
    // labelled line of the happiness fold rather than a number added beside it.
    expect(authorityOf(g.state, 0)).toBeGreaterThan(0);
    const open = explainHappiness(g.state, 0).filter((l) => l.source.includes('Bread'));
    expect(open.length).toBeGreaterThan(0);
    expect(foldMeter(open)).toBe(3 * g.state.cities.filter((c) => c.ownerId === 0).length);

    // Spend the writ past zero and the clause simply stops existing — a gate,
    // not a malus.
    for (let i = 0; i < 12; i++) {
      g.state.cities.push({ ...city, id: 700 + i, captured: true });
    }
    expect(authorityOf(g.state, 0)).toBeLessThan(0);
    expect(explainHappiness(g.state, 0).some((l) => l.source.includes('Bread'))).toBe(false);

    // The gold half is unconditional and lands in every town's own breakdown.
    const gold = cardCityYields(g.state, city).find((l) => l.card === 'breadAndCircuses')!;
    expect(gold.gold).toBe(-1);
  });

  it('followingFaithPerTurn — Cuius Regio reads the faith of the towns that follow him', () => {
    // Replaced outright in the balance pass of 2026-09-02: the extra augur
    // charge is gone and the card is a **rate**, on Theocracy's precedent — 15%
    // of what the faithful towns bank, gained again as science, with the faith
    // itself untouched. The rate is a third reading of the calendar beside
    // `faithPerTurn` and `capitalFaithPerTurn`, so it earns a source of its own.
    const g = game(403);
    playerById(g.state, 0)!.statecraft.doctrines.push('cuiusRegio' as never);
    const rate = (following: number): number =>
      foldCardYields(cardEmpireYields(g.state, 0, { followingFaithPerTurn: following })).science;
    // Below one helping it pays nothing, which is `helpings`' own reading and
    // not a clause of this card's.
    expect(rate(0)).toBe(0);
    expect(rate(19)).toBe(0);
    expect(rate(20)).toBe(3);
    expect(rate(60)).toBe(9);
    // Nothing else in the ledger moves: "converted" is read as *gained as*, so
    // the faith the towns banked is still theirs.
    expect(foldCardYields(cardEmpireYields(g.state, 0, { followingFaithPerTurn: 60 })).faith).toBe(0);
  });

  it('capturedCityCost is a delta now, and two of them floor at one', () => {
    const g = game(405);
    const city = found(g.state, 0);
    const seized = found(g.state, 1);
    seized.ownerId = 0;
    seized.captured = true;
    void city;
    const cost = (): number =>
      -explainAuthority(g.state, 0).find((l) => l.source.includes('captured'))!.value;
    const base = RULES.meters.authority.capturedCity;
    expect(cost()).toBe(base);

    // One card shifts it by a point rather than replacing it, which is the whole
    // of the 2026-08-28 change: a *set* could not stack.
    const sc = playerById(g.state, 0)!.statecraft;
    sc.doctrines.push('hegemony' as never);
    expect(cost()).toBe(base - 1);

    // Two of them stack, and the fold is floored at one: a free conquest would
    // make the meter free to whoever drafted twice.
    slot(g.state, 0, 'clientKings');
    expect(cost()).toBe(Math.max(1, base - 2));
    expect(cost()).toBeGreaterThanOrEqual(1);
  });

  it('Master of Maps and The Legion move strength in flat points, not percent', () => {
    const g = createGame({
      seed: 407,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    const wild = g.state.players.find((p) => p.barbarian)!;
    const player = playerById(g.state, 0)!;
    const mine = g.state.units.find((u) => u.ownerId === 0 && u.type === 'warrior')
      ?? createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    const target = getTileAt(g.state.map, mine.col + 1, mine.row)!;
    createUnit(g.state, wild.id, 'warrior', target.col, target.row);
    const lines = (): { source: string; value: number }[] => {
      const preview = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
      return preview.ok ? preview.bonuses.map((b) => ({ source: b.source, value: b.amount })) : [];
    };
    if (lines().length === 0) return;

    // The map-makers' drawback is a labelled *point* line on the one ledger
    // (Entry XXXVII), never a multiplier on somebody else's terrain.
    player.statecraft.doctrines.push('masterOfMaps' as never);
    const maps = lines().find((l) => l.source.includes('Master of Maps'));
    expect(maps?.value).toBe(-2);

    // And The Legion's point reaches the melee row and nothing else, through the
    // same shape with a class filter.
    player.statecraft.doctrines = [];
    slot(g.state, 0, 'theLegion');
    expect(lines().find((l) => l.source.includes('Legion'))?.value).toBe(1);
  });

  it("The Legion's hammers are a labelled line of the melee row's own modifiers", () => {
    const g = game(409);
    const city = found(g.state, 0);
    const melee = { kind: 'unit' as const, id: 'warrior' as never };
    const ranged = { kind: 'unit' as const, id: 'archer' as never };
    expect(cardProduction(g.state, city, 'unit', 'warrior' as never)).toEqual([]);
    slot(g.state, 0, 'theLegion');
    const behind = cardProduction(g.state, city, 'unit', 'warrior' as never);
    expect(behind).toHaveLength(1);
    expect(behind[0]!.percent).toBe(15);
    // The filter is asked of what the town is actually building, so a bowman
    // gets nothing at all rather than a line worth zero.
    expect(cardProduction(g.state, city, 'unit', 'archer' as never)).toEqual([]);
    void melee;
    void ranged;
  });

  it('prints the reworked rows in the words the master list ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('masterOfMaps')).toEqual([
      'all units: +1 sight',
      'all units: +1 movement',
      // Flat points on the one ledger (Entry XXXVII), where it used to be the
      // only percentage a card put on a strength.
      '-2 combat strength',
    ]);
    expect(said('theStandingLevy')).toEqual([
      'every 12 turns, the best melee unit you can build musters in your capital',
      'deepening this Order bringing the muster 2 turns sooner — not built yet',
    ]);
    expect(said('theLegion')).toEqual([
      'melee units: +1 movement',
      '+1 combat strength for melee units',
      '+15% production toward melee units',
    ]);
    expect(said('breadAndCircuses')).toEqual([
      'while your authority is positive: +3 happiness in every city',
      '-1 gold in every city',
    ]);
  });
});

// --- the Chiefdom / Gov I / Gov II Orders pass, 2026-08-29 -------------------

/**
 * The twenty-one rows the user ratified in `docs/orders-candidates.md` for the
 * three pools drafted most, and the six shapes they needed:
 * `populationAtMost` and `adjacentImprovement` (two city scopes),
 * `duplicateLuxuries` (a count), `hillCityCost` (a meter rule), `unitStamp` (a
 * fact written onto a piece at its birth) and `cityRule` (a fact a card declares
 * true of a realm's towns). Plus `UnitFilter.explores`, which is a field on an
 * existing shape.
 *
 * One behavioural test per new shape, carried to the ledger it lands in — the
 * file's own claim, and the only kind of test that catches a shape declared and
 * never read. The rows themselves are pinned in words at the end.
 */
describe('the Orders pass of 2026-08-29', () => {
  /** Every id this pass added, with the pool and slot it was ratified into. */
  const ADDED: readonly [OrderId, string, string][] = [
    ['fireKeepers', 'chiefdom', 'wildcard'],
    ['wolfRunners', 'chiefdom', 'military'],
    ['hearthSongs', 'chiefdom', 'wildcard'],
    ['statuteLabour', 'governmentI', 'economic'],
    ['riverWardens', 'governmentI', 'economic'],
    ['theAlmanac', 'governmentI', 'wildcard'],
    ['villageFairs', 'governmentI', 'wildcard'],
    ['theMusterRoll', 'governmentI', 'military'],
    ['hillForts', 'governmentI', 'military'],
    ['thePilgrimsPurse', 'governmentI', 'wildcard'],
    ['charterTowns', 'governmentI', 'economic'],
    ['theBronzeMirror', 'governmentI', 'wildcard'],
    ['theChoir', 'governmentII', 'wildcard'],
    ['starGazers', 'governmentII', 'wildcard'],
    ['cisternWorks', 'governmentII', 'economic'],
    ['ledgerKeepers', 'governmentII', 'economic'],
    ['drumsOfWar', 'governmentII', 'military'],
    ['theCartographers', 'governmentII', 'wildcard'],
    ['theMasonsLodge', 'governmentII', 'economic'],
    ['theOathBound', 'governmentII', 'military'],
    ['sanctuary', 'governmentII', 'wildcard'],
  ] as never;

  /** The two rows that ship inert — a design decision, written on the row. */
  const RETIRED: readonly string[] = ['theBronzeMirror', 'sanctuary'];

  it('seats every new row in its ratified pool and slot', () => {
    for (const [id, pool, slotType] of ADDED) {
      const def = orderDef(id);
      expect(def.pool, id).toBe(pool);
      expect(def.slot, id).toBe(slotType);
      expect(def.flavor, id).toBeTruthy();
      expect(def.text, id).toBeTruthy();
      // No rarity yet: the user is holding that field until later, and a row
      // carrying one would be a dial the draw does not read.
      expect((def as unknown as Record<string, unknown>)["rarity"], id).toBeUndefined();
    }
  });

  it('keeps the two deferred rows out of every pool sweep', () => {
    for (const id of RETIRED) {
      const def = orderDef(id as never);
      expect(def.retired, id).toBe(true);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred, id).toBeDefined();
      expect(def.note, id).toBeTruthy();
      // `poolOrders` is the one reader of `retired`, so a withdrawn row is out
      // of the draw, the upgrade roll and every screen at once.
      expect(poolOrders(def.pool).includes(id as never), id).toBe(false);
    }
  });

  it('populationAtMost — Hearth Songs pays the villages and stops at the fifth citizen', () => {
    const g = game(801);
    const city = found(g.state, 0);
    slot(g.state, 0, 'hearthSongs');
    const paid = (): number =>
      cardCityYields(g.state, city).filter((l) => l.card === 'hearthSongs').length;
    // Inclusive at the threshold, exactly as `populationAtLeast` is.
    city.population = 4;
    expect(paid()).toBe(1);
    expect(foldCardYields(cardCityYields(g.state, city)).culture).toBe(1);
    city.population = 5;
    expect(paid()).toBe(0);
  });

  it('adjacentImprovement — The Pilgrim’s Purse pays the town next door to the shrine', () => {
    const g = game(802);
    const city = found(g.state, 0);
    slot(g.state, 0, 'thePilgrimsPurse');
    const faith = (): number => foldCardYields(cardCityYields(g.state, city)).faith;
    expect(faith()).toBe(0);
    // The ring of six, not the work radius: a shrine three hexes out is a
    // different sentence and this scope does not say it.
    const far = ownedTiles(g.state, city).find(
      (t) => Math.abs(t.col - city.col) + Math.abs(t.row - city.row) > 2,
    );
    if (far) {
      far.improvement = 'holySite';
      expect(faith()).toBe(0);
      delete far.improvement;
    }
    const near = getTileAt(g.state.map, city.col + 1, city.row)!;
    near.improvement = 'holySite';
    expect(faith()).toBe(5);
  });

  it('duplicateLuxuries — Village Fairs counts kinds, not copies', () => {
    const g = game(803);
    const city = found(g.state, 0);
    const seams = ownedTiles(g.state, city).filter((t) => t.col !== city.col || t.row !== city.row);
    slot(g.state, 0, 'villageFairs');
    const fairs = (): number =>
      foldMeter(explainHappiness(g.state, 0).filter((l) => l.source.includes('Village Fairs')));
    // One copy of a luxury is not a fair.
    seams[0]!.resource = 'silk';
    seams[0]!.improvement = 'plantation';
    expect(fairs()).toBe(0);
    // Two copies of one kind is one fair — the count is of *kinds* there is a
    // surplus of, which is what neither `uniqueLuxuries` nor `luxuryCopies` says.
    seams[1]!.resource = 'silk';
    seams[1]!.improvement = 'plantation';
    expect(fairs()).toBe(1);
    // A third copy of the same kind changes nothing; a second *kind* with two
    // copies is a second fair.
    seams[2]!.resource = 'silk';
    seams[2]!.improvement = 'plantation';
    expect(fairs()).toBe(1);
  });

  it('hillCityCost — Hill Forts prices a hill town a point cheaper, and says so in the preview', () => {
    const g = game(804);
    const city = found(g.state, 0);
    // Not the capital: the capital rides free and would hide the clause.
    const hill = ownedTiles(g.state, city).find((t) => t.col !== city.col || t.row !== city.row)!;
    hill.hills = true;
    hill.terrain = 'grassland';
    const second = foundCityAt(g.state, 0, hill)!;
    const lineFor = (): number =>
      explainAuthority(g.state, 0).find((l) => l.source.startsWith(second.name))!.value;
    const plain = lineFor();
    slot(g.state, 0, 'hillForts');
    expect(lineFor()).toBe(plain + 1);
    // And the *preview* of a town not yet founded reads the same rule, which is
    // the whole reason `cityCosts` is hoisted: a preview that disagreed with the
    // meter it previews is a preview that lies.
    const site = ownedTiles(g.state, second).find(
      (t) => t.hills && (t.col !== second.col || t.row !== second.row),
    );
    if (site) {
      const preview = explainFoundingCost(g.state, 0, site).find((l) => l.meter === 'authority')!;
      expect(preview.source.endsWith('on hills')).toBe(true);
    }
  });

  it('unitStamp — The Muster Roll blooods the levy it raised, and only that levy', () => {
    const g = game(805);
    found(g.state, 0);
    const before = createUnit(g.state, 0, 'warrior', 5, 5);
    expect(before.stamp).toBeUndefined();
    expect(unitMaxHp(before)).toBe(unitDef('warrior').maxHp);

    slot(g.state, 0, 'theMusterRoll');
    const after = createUnit(g.state, 0, 'warrior', 6, 5);
    expect(after.stamp).toEqual({ hp: 10 });
    expect(unitMaxHp(after)).toBe(unitDef('warrior').maxHp + 10);
    // Born at its own maximum, not at the roster's: a veteran does not start
    // wounded.
    expect(after.hp).toBe(unitMaxHp(after));
    // The piece already standing in the field gains nothing — a stamp is a fact
    // about a moment, which is what the printed words say.
    expect(before.stamp).toBeUndefined();

    // And unslotting the card does not un-blood it.
    playerById(g.state, 0)!.statecraft.slots = [];
    expect(unitMaxHp(after)).toBe(unitDef('warrior').maxHp + 10);
    expect(createUnit(g.state, 0, 'warrior', 7, 5).stamp).toBeUndefined();
  });

  it('cityRule — Cistern Works waters every town, and no hex at all', () => {
    const g = game(806);
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    tile.freshwater = false;
    expect(cityScopeAdmits(g.state, city, { test: 'freshwater' })).toBe(false);
    expect(cityScopeAdmits(g.state, city, { test: 'notFreshwater' })).toBe(true);

    slot(g.state, 0, 'cisternWorks');
    // Both halves of the sentence move together — the one predicate is what
    // stops a River Kings penalty from biting a town the aqueducts have watered.
    expect(cityScopeAdmits(g.state, city, { test: 'freshwater' })).toBe(true);
    expect(cityScopeAdmits(g.state, city, { test: 'notFreshwater' })).toBe(false);
    // The ground is untouched: a hex's own water is a different question, and
    // the row's note says so.
    expect(tile.freshwater).toBe(false);
  });

  it('the explorer filter — Wolf-Runners is quick for scouts and nobody else', () => {
    const g = game(807);
    found(g.state, 0);
    const scout = createUnit(g.state, 0, 'scout', 5, 5);
    const warrior = createUnit(g.state, 0, 'warrior', 6, 5);
    slot(g.state, 0, 'wolfRunners');
    expect(cardUnitStat(g.state, scout, 'movement')).toBe(1);
    expect(cardUnitStat(g.state, warrior, 'movement')).toBe(0);
  });

  it('Charter Towns founds with a Granary, and Homestead Charters still adds the citizen', () => {
    const g = game(808);
    slot(g.state, 0, 'charterTowns');
    expect(cardFoundingRider(g.state, 0)).toEqual({
      population: 0,
      buildings: ['granary'],
      roads: false,
    });
    const unit = g.state.units.find((u) => u.ownerId === 0 && u.type === 'settler')
      ?? g.state.units.find((u) => u.ownerId === 0)!;
    const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!)!;
    expect(city.buildings).toContain('granary');
  });

  it('routeRider — Ledger-Keepers widens the caravan fold by a labelled line', () => {
    const g = game(809);
    found(g.state, 0);
    const before = explainRouteSlots(g.state, 0);
    slot(g.state, 0, 'ledgerKeepers');
    const after = explainRouteSlots(g.state, 0);
    expect(after.length).toBe(before.length + 1);
    const line = after[after.length - 1]!;
    expect(line.source).toContain('Ledger-Keepers');
    expect(line.slots).toBe(1);
    expect(routeSlots(g.state, 0)).toBe(
      before.reduce((sum, l) => sum + l.slots, 0) + 1,
    );
  });

  it('reads every shape this pass declared from at least one live card', () => {
    // The register, narrowed to what this pass added — a shape declared and
    // never used is a shape nobody has tested.
    const used = new Set<CardEffectKind>();
    for (const id of ORDER_IDS) {
      for (const effect of orderDef(id).effects) used.add(effect.kind);
    }
    for (const kind of ['unitStamp', 'cityRule', 'routeRider'] as CardEffectKind[]) {
      expect(used.has(kind), kind).toBe(true);
    }
  });

  it('prints every new row in the words the user ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('fireKeepers')).toEqual([
      '+1 faith in your capital',
      '+1 happiness in your capital',
    ]);
    expect(said('wolfRunners')).toEqual([
      'scouts: +1 movement',
      'claiming a ruin grants +15 gold',
    ]);
    expect(said('hearthSongs')).toEqual(['+1 culture in every city of 4 or less']);
    expect(said('statuteLabour')).toEqual(['+1 production per 4 population in this city']);
    expect(said('riverWardens')).toEqual([
      // Reworked 2026-09-02: the wardens have to actually be there, which is
      // the first `garrisoned` scope and the first fact about the *pieces* a
      // city scope ever asked for.
      '+1 food on every hex with a Farm beside fresh water, ' +
        'in every city with a unit standing in it',
    ]);
    expect(said('theAlmanac')).toEqual([
      '+2 science in your capital',
      '+1 science in every city with a Library',
    ]);
    expect(said('villageFairs')).toEqual([
      '+1 happiness per luxury you hold two or more copies of',
    ]);
    expect(said('theMusterRoll')).toEqual(['newly created units gain +10 maximum health']);
    expect(said('hillForts')).toEqual([
      '+2 combat strength on hills',
      'the authority a city on hills costs falls by 1',
    ]);
    expect(said('thePilgrimsPurse')).toEqual(['+5 faith in every city beside a Holy Site']);
    expect(said('charterTowns')).toEqual(['new cities are founded with a Granary']);
    expect(said('theChoir')).toEqual([
      '+1 culture in every city with a Temple',
      '+1 happiness in every city with a Temple',
    ]);
    // 2026-08-31: the ratified text asks for a mountain *inside the borders*,
    // which is a different question from one in the ring of six.
    expect(said('starGazers')).toEqual([
      '+2 science in every city with a mountain hex inside its borders',
    ]);
    expect(said('cisternWorks')).toEqual(['every city of yours counts as being on fresh water']);
    expect(said('ledgerKeepers')).toEqual([
      '+1 gold in every city with a Market',
      '+1 trade route',
    ]);
    expect(said('drumsOfWar')).toEqual(['newly created units gain +2 combat strength']);
    expect(said('theCartographers')).toEqual(['+1 science per 40 hexes you have revealed']);
    expect(said('theMasonsLodge')).toEqual([
      '+10% production toward buildings, in every city of 6+',
    ]);
    // "heals 15", not "heals a further 15": a kill pays no heal of its own, and
    // an increment on a number that does not exist is a card promising nothing.
    expect(said('theOathBound')).toEqual(['killing a unit heals 15']);
    // The two deferred rows say what is missing and nothing else.
    expect(said('theBronzeMirror')).toEqual([
      'a luxury of your own make — bronze trinkets — worth +1 happiness in every city, ' +
        'and +1 more for each copper or tin you hold — not built yet',
    ]);
    expect(said('sanctuary')).toEqual([
      'your holy city is sacked rather than captured while it keeps your religion — not built yet',
    ]);
  });
});

// --- the balance pass of 2026-08-31 -----------------------------------------

/**
 * The rows the user rebalanced in `docs/orders-and-doctrines.md` (the fold of
 * 83358c2), and the five members of the vocabulary they needed.
 *
 * Same discipline as the two passes above: **one behavioural test per new
 * member**, because the kind-level register only proves a *shape* is named by a
 * row — a `TileCondition` value or a `CountKind` that nobody reads would sail
 * straight through it — plus a register of its own naming exactly what this pass
 * declared, plus the printed sentence of every row that changed.
 */
describe('the balance pass of 2026-08-31', () => {
  it('unimproved — The Unbroken Land pays bare ground and stops when it is worked', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const before = explainTileYield(tile, yieldContextFor(g.state, 0));
    slot(g.state, 0, 'theUnbrokenLand');
    const after = explainTileYield(tile, yieldContextFor(g.state, 0));
    expect(after).toHaveLength(before.length + 1);
    const line = after[after.length - 1]!;
    expect(line.source).toBe('Order · The Unbroken Land');
    expect(line.food).toBe(1);
    expect(line.production).toBe(1);
    // **Presence is the state**: build anything at all and the ladder stops
    // paying for the hex, which is the whole bargain the 🌿 cards strike.
    tile.improvement = 'farm';
    const worked = explainTileYield(tile, yieldContextFor(g.state, 0));
    expect(worked.some((entry) => entry.source === 'Order · The Unbroken Land')).toBe(false);
  });

  it('connected — the road home is what Empire-Building makes a town content about', () => {
    // The re-cut of 2026-09-02's one new `CityScope`, and the one whose answer
    // is a fact about the *board between* two towns. It is the gold ledger's own
    // fill (`connectedCities`), so a road that stops paying coin stops paying
    // contentment in the same instant.
    const g = game(931);
    const capital = found(g.state, 0);
    const second = foundCityAt(g.state, 0, getTileAt(g.state.map, capital.col + 4, capital.row)!);
    const scope = { test: 'connected' } as const;
    // A capital is never connected *to itself*: it is what connection is
    // measured from, exactly as `connectedCities` leaves it out of its own list.
    expect(cityScopeAdmits(g.state, capital, scope)).toBe(false);
    expect(cityScopeAdmits(g.state, second, scope)).toBe(false);

    // Pave the whole line between them and the fill reaches.
    for (let step = 1; step < 4; step++) {
      getTileAt(g.state.map, capital.col + step, capital.row)!.road = 0;
    }
    expect(cityScopeAdmits(g.state, second, scope)).toBe(true);
    expect(cityScopeAdmits(g.state, capital, scope)).toBe(false);

    // And the technology's clause folds into `explainHappiness` like any other:
    // one point, once, for the one town the road reaches.
    const cheer = (): number => {
      const line = explainHappiness(g.state, 0).find((entry) =>
        entry.source.startsWith('Technology · Empire-Building'),
      );
      return line?.value ?? 0;
    };
    expect(cheer()).toBe(0);
    playerById(g.state, 0)!.techsResearched.push('theImperialPost');
    expect(cheer()).toBe(1);
    // Movable Type says the same sentence a second time, and the worksheet rules
    // the double deliberate: the connectivity build stacks.
    playerById(g.state, 0)!.techsResearched.push('movableType');
    const both = explainHappiness(g.state, 0).filter((entry) =>
      /Technology · (Empire-Building|Movable Type)/.test(entry.source),
    );
    expect(both.map((entry) => entry.value)).toEqual([1, 1]);
  });

  it('terrainInBorders — Star-Gazers reads the borders, never the ring of six', () => {
    const g = game();
    const city = found(g.state, 0);
    const mine = ownedTiles(g.state, city).find((tile) => tile.terrain !== 'mountain')!;
    const scope = { test: 'terrainInBorders', terrain: 'mountain' } as const;
    expect(cityScopeAdmits(g.state, city, scope)).toBe(false);
    const was = mine.terrain;
    mine.terrain = 'mountain';
    expect(cityScopeAdmits(g.state, city, scope)).toBe(true);
    // The science follows the scope, through the ordinary `cityYields` fold.
    const before = cityYields(g.state, city).science;
    slot(g.state, 0, 'starGazers');
    expect(cityYields(g.state, city).science).toBe(before + 2);
    // And a mountain the borders have **not** taken in pays nothing: the scope
    // is about what a town owns, which is what makes it different from the ring
    // of six `mountainAdjacent` asks about.
    mine.terrain = was;
    const far = g.state.map.tiles.find(
      (tile) => g.state.tileOwner[tile.row * g.state.map.width + tile.col] === null,
    )!;
    far.terrain = 'mountain';
    expect(cityScopeAdmits(g.state, city, scope)).toBe(false);
    expect(cityYields(g.state, city).science).toBe(before);
  });

  it('workedUnimprovedTiles — The Quiet Fields counts the hexes the town works', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'theQuietFields');
    const cheer = (): number => {
      const line = explainHappiness(g.state, 0).find((entry) =>
        entry.source.startsWith('Order · The Quiet Fields'),
      );
      return line?.value ?? 0;
    };
    const worked = city.workedTiles
      .map((cell) => getTileAt(g.state.map, cell.col, cell.row)!)
      .filter((tile) => tile.improvement === undefined);
    expect(worked.length).toBeGreaterThan(0);
    expect(cheer()).toBe(worked.length);
    // A plough on one of them takes its point away — the count and the tile
    // lines ask the board the same question.
    worked[0]!.improvement = 'farm';
    expect(cheer()).toBe(worked.length - 1);
  });

  it('freeCitizens — The Scattered Hearths waives the first three of every town', () => {
    const g = game();
    const city = found(g.state, 0);
    city.population = 5;
    const demandLine = () =>
      explainHappiness(g.state, 0).find(
        (entry) => entry.source.startsWith(city.name) && entry.source.includes('citizens'),
      )!;
    const before = demandLine();
    expect(before.source).toContain('5 citizens');
    g.state.players[0]!.statecraft.doctrines.push('theScatteredHearths');
    const after = demandLine();
    // The label says who is being charged, because a line reading "5 citizens"
    // beside a cost for two is a ledger nobody can check.
    expect(after.source).toContain('2 of 5 citizens');
    expect(after.value).toBeCloseTo((before.value * 2) / 5, 6);
    // A town of three or fewer asks for nothing at all.
    city.population = 3;
    expect(demandLine().value).toBeCloseTo(0, 9);
  });

  it('fromRate — The Lyceum pays a whole turn of culture, composed once', () => {
    const g = game();
    const city = found(g.state, 0);
    // Something that actually sings, so the rate is not zero and the grant is
    // not dropped as an empty line.
    city.buildings.push('monument');
    slot(g.state, 0, 'theLyceum');
    const rate = empireRateReading(g.state, 0).culturePerTurn ?? 0;
    expect(rate).toBeGreaterThan(0);
    expect(windfallPayout(g.state, 0, 'tech').grants).toEqual([
      { card: 'theLyceum', source: 'Order · The Lyceum', yield: 'culture', amount: rate },
    ]);
    // The occasion is the whole of the gate: nothing else pays a turn of
    // anything.
    expect(windfallPayout(g.state, 0, 'kill').grants).toEqual([]);
    // The Lyceum has no second face since the 2026-09-02 ladder, so a level
    // written into a save changes nothing: the reading clamps to the printed
    // row rather than inventing a deeper Lyceum for it.
    g.state.players[0]!.statecraft.orders = [{ id: 'theLyceum', level: 2 }];
    expect(windfallPayout(g.state, 0, 'tech').grants[0]!.amount).toBe(rate);
  });

  it('reads every member this pass declared from at least one live card', () => {
    // The register, narrowed to what this pass added. The kind-level register
    // above cannot see any of these — they are *values inside* shapes it already
    // counts — so a member declared and never written onto a row would otherwise
    // be a switch arm nobody reaches.
    const rows = [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS].map((id) => cardDef(id));
    const json = JSON.stringify(rows);
    for (const member of [
      '"test":"unimproved"',
      '"test":"terrainInBorders"',
      '"count":"workedUnimprovedTiles"',
      '"rule":"freeCitizens"',
      '"fromRate":"culturePerTurn"',
    ]) {
      expect(json.includes(member), member).toBe(true);
    }
  });

  it('places every row this pass touched in the pool the doc puts it in', () => {
    // The Long Watch moved up a pool; the eight new Orders and the three new
    // Doctrines land where the master list's tables put them.
    const pool = (id: string): string => orderDef(id as never).pool;
    expect(pool('theLongWatch')).toBe('governmentI');
    expect(pool('waysideShrines')).toBe('governmentI');
    expect(pool('theUnbrokenLand')).toBe('governmentI');
    expect(pool('theOrchardTithe')).toBe('governmentII');
    expect(pool('theGreenwoodLaw')).toBe('governmentII');
    expect(pool('theQuietFields')).toBe('governmentII');
    expect(pool('firstFruits')).toBe('governmentIII');
    expect(pool('theOldWays')).toBe('governmentIII');
    expect(doctrineDef('theGentleYoke').tier).toBe(10);
    expect(doctrineDef('theScatteredHearths').tier).toBe(10);
    expect(doctrineDef('theWanderingCourt').tier).toBe(18);
    // Both halves of The Closed Realm are unbuilt, so it sits at tier 0 —
    // Religious Mandate's rung, which is not a live pool — rather than being
    // dealt into Pool IV as a card that does nothing.
    expect(doctrineDef('theClosedRealm').tier).toBe(0);
    // The Old Ways is **un-retired** by the balance pass of 2026-09-02 (the
    // user: "this is the payoff card"), so it is back in the bag — and Foreign
    // Quarters took its place as the withdrawn row, which keeps its row so a
    // save replays and leaves every pool.
    expect(poolOrders('governmentIII').includes('theOldWays' as never)).toBe(true);
    expect(poolOrders('governmentII').includes('foreignQuarters' as never)).toBe(false);
  });

  it('prints every changed and new row in the words the doc ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('mountainHold')).toEqual([
      '+15% production in every city beside a mountain',
      'every city beside a mountain: +5 city defence',
      'the bonus reaching a city with a mountain two hexes away, rather than only one — not built yet',
    ]);
    expect(said('firstRites')).toEqual(['+2 faith in your capital']);
    expect(said('waysideShrines')).toEqual(['+1 faith in every city']);
    expect(said('commonGranary')).toEqual([
      '+1 food in every city holding an improved luxury resource',
    ]);
    expect(said('theOrchardTithe')).toEqual([
      '+1 food on every hex carrying a luxury resource',
    ]);
    expect(said('oreTithes')).toEqual([
      '+1 production on every hex carrying a strategic resource',
    ]);
    expect(said('terracedHillsides')).toEqual(['+1 food on every hill hex']);
    expect(said('pilgrimRoads')).toEqual([
      '+1 faith per 3 population in your capital',
      '+1 happiness per 50 banked faith (at most +5 happiness)',
      // The ratified deepening raises a *cap*, which the vocabulary cannot say —
      // so the row is marked flat and says what it owes in its own words.
      'deepening this Order raising the happiness it may pay by 2 — not built yet',
    ]);
    expect(said('theLyceum')).toEqual([
      'completing a technology grants an extra turn of culture',
    ]);
    expect(said('censusRolls')).toEqual([
      '+1 happiness per 2 population in your capital',
    ]);
    expect(said('theUnbrokenLand')).toEqual([
      '+1 food, +1 production on every unimproved hex',
    ]);
    expect(said('theGreenwoodLaw')).toEqual([
      '+2 food, +2 production on every unimproved hex',
    ]);
    expect(said('theQuietFields')).toEqual([
      '+1 happiness per unimproved hex worked here',
    ]);
    expect(said('firstFruits')).toEqual(['+1 food on every hex carrying a resource']);
    expect(said('theOldWays')).toEqual([
      // Built 2026-09-02 (the user: "this is the payoff card"): a percentage on
      // the hex's **own ground** rather than on its works, computed off the
      // breakdown the tile chain already has — rule 5 at the scale of a hex.
      'the ground of every unimproved hex pays double',
    ]);
    expect(said('theGentleYoke')).toEqual([
      '-20% happiness demanded per citizen',
      '-3 authority capacity per city you hold',
    ]);
    expect(said('theScatteredHearths')).toEqual([
      'the citizens in every city who demand no happiness rises by 3',
      '-4 happiness in your capital',
    ]);
    expect(said('theWanderingCourt')).toEqual([
      '-15% all yields in your capital',
      '+3 food, +3 production, +3 science, +3 culture, +3 faith in every city but your capital',
      '+3 happiness in every city but your capital',
    ]);
    expect(said('theClosedRealm')).toEqual([
      'your happiness is held at +5 whatever your cities ask for — not built yet',
      'your units cannot attack outside your own territory — not built yet',
    ]);
  });
});

// --- the ratified cards of Entry LVIII (the Themes Build, phase 4) -----------

/**
 * The theme sheets' ratified rows, and the eight members of the vocabulary they
 * needed.
 *
 * Same discipline as the three passes above: **one behavioural test per new
 * member**, because the kind-level register only proves a *shape* is named by a
 * row — a `CityScope`, a `CountKind` or a `where` value nobody reads would sail
 * straight through it — plus a register of its own naming exactly what this pass
 * declared, plus the printed sentence of every row that is new or changed.
 */
describe('the ratified cards of the Themes Build', () => {
  it('upkeepRebate — The Quartermasters take a coin off each soldier, never past free', () => {
    const g = game();
    const seat = g.state.units.find((u) => u.ownerId === 0)!;
    for (let i = 0; i < 3; i++) createUnit(g.state, 0, 'warrior', seat.col, seat.row);
    const soldiers = explainUnitUpkeep(g.state, 0);
    expect(soldiers.length).toBeGreaterThan(0);
    expect(explainUnitUpkeepRebate(g.state, 0)).toEqual([]);

    slot(g.state, 0, 'theQuartermasters');
    const lines = explainUnitUpkeepRebate(g.state, 0);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.source).toContain('The Quartermasters');
    // A coin **per piece**, and never more than that piece costs: a card cannot
    // turn a payroll into a mint, which is the clamp `unitUpkeep`'s percentage
    // half has always had.
    expect(lines[0]!.gold).toBe(soldiers.reduce((sum, l) => sum + Math.min(1, l.gold), 0));
    expect(lines[0]!.gold).toBeLessThanOrEqual(unitUpkeepTotal(g.state, 0));

    // And the ledger reads it: the give-back is its **own** line beside the
    // gross charge, so a player sees the army's price and then the reason it
    // is lower.
    const ledger = explainEmpireGold(g.state, 0);
    expect(ledger.some((line) => line.source.includes('The Quartermasters'))).toBe(true);
    expect(ledger.some((line) => line.source.startsWith('Unit maintenance'))).toBe(true);
  });

  it('upkeepRebate free + unitStat outside — The Wintering Grounds keep an army in the field', () => {
    const g = game();
    const city = found(g.state, 0);
    const home = createUnit(g.state, 0, 'warrior', city.col, city.row);
    // Somewhere nobody owns: the far corner of a duel map is not anybody's third
    // ring. `foreignTerritory` reaches unclaimed ground, which is the reading
    // that makes the card about a campaign.
    const away = createUnit(g.state, 0, 'warrior', 1, 1);
    expect(cardUnitStat(g.state, home, 'heal')).toBe(0);
    expect(cardUnitStat(g.state, away, 'heal')).toBe(0);

    slot(g.state, 0, 'theWinteringGrounds');
    // The mending half was dropped in the balance pass of 2026-09-02: the card
    // is the payroll and nothing else now.
    expect(cardUnitStat(g.state, home, 'heal')).toBe(0);
    expect(cardUnitStat(g.state, away, 'heal')).toBe(0);
    // The payroll: only the piece standing abroad is forgiven, and it is
    // forgiven **whole**.
    const rebate = explainUnitUpkeepRebate(g.state, 0);
    expect(rebate).toHaveLength(1);
    expect(rebate[0]!.source).toContain('The Wintering Grounds');
    const abroad = explainUnitUpkeep(g.state, 0).filter((line) => line.unitId === away.id);
    expect(rebate[0]!.gold).toBe(abroad.reduce((sum, l) => sum + l.gold, 0));
  });

  it('onResourceKind — The Prize Grounds pay the town the settler planted on the vein', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const luxury = { test: 'onResourceKind', kind: 'luxury' } as const;
    expect(cityScopeAdmits(g.state, city, luxury)).toBe(false);
    tile.resource = 'gems';
    expect(cityScopeAdmits(g.state, city, luxury)).toBe(true);
    // The centre's own hex and nothing wider — `holdingCategory` is the other
    // question and a different card.
    const before = foldMeter(explainHappiness(g.state, 0));
    slot(g.state, 0, 'thePrizeGrounds');
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(before + 2);
  });

  it("adjacentGreatWork — The Master's Presence never stacks, however many works stand", () => {
    const g = game();
    const city = found(g.state, 0);
    const scope = { test: 'adjacentGreatWork' } as const;
    expect(cityScopeAdmits(g.state, city, scope)).toBe(false);
    const ring = neighborTiles(g.state.map, tileHex(getTileAt(g.state.map, city.col, city.row)!));
    ring[0]!.improvement = 'academy';
    expect(cityScopeAdmits(g.state, city, scope)).toBe(true);

    slot(g.state, 0, 'theMastersPresence');
    const lines = cityYieldPercents(g.state, city).filter((line) =>
      line.source.includes("The Master's Presence"),
    );
    // One line per voice, and each of them ten points — the `yield: 'all'`
    // expansion, not six cards.
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.percent).toBe(10);
    // A second work beside the same town is the same boolean.
    ring[1]!.improvement = 'landmark';
    for (const line of cityYieldPercents(g.state, city).filter((l) =>
      l.source.includes("The Master's Presence"),
    )) {
      expect(line.percent).toBe(10);
    }
  });

  it('queueHolds — The Wonder-Feasts feed the town with the scaffolding up', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'theWonderFeasts');
    const fed = (): number =>
      foldCardYields(cardCityYields(g.state, city).filter((l) => l.source.includes('Wonder-Feasts')))
        .food;
    expect(fed()).toBe(0);
    city.queue = [{ kind: 'building', id: 'stonehenge' }];
    expect(fed()).toBe(2);
    // **The front row only**: a wonder standing second is a plan, not a
    // building site.
    city.queue = [{ kind: 'unit', id: 'warrior' }, { kind: 'building', id: 'stonehenge' }];
    expect(fed()).toBe(0);
    // And the hammers, which are the card's other half and a plain category
    // bonus.
    city.queue = [{ kind: 'building', id: 'stonehenge' }];
    expect(
      cardProduction(g.state, city, 'wonder').find((l) => l.source.includes('Wonder-Feasts'))
        ?.percent,
    ).toBe(10);
  });

  it('productionBonus class — The Dry Docks say "ships", which no silhouette can', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'theDryDocks');
    // No harbour, no docks: the scope is the ordinary one.
    expect(cardProduction(g.state, city, 'unit', 'trireme')).toEqual([]);
    city.buildings.push('harbour');
    const hulls = cardProduction(g.state, city, 'unit', 'trireme');
    expect(hulls).toHaveLength(1);
    expect(hulls[0]!.percent).toBe(25);
    // A soldier is not a ship — the filter is the roster's own `category`, so
    // the day a fourth hull class is drawn it is quick without this row moving.
    expect(cardProduction(g.state, city, 'unit', 'warrior')).toEqual([]);
  });

  it('clearedCamps — The Last Hunt counts what the steppe no longer has', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    g.state.camps.push({ col: tile.col, row: tile.row, foundedTurn: 0 });
    expect(player.campsCleared).toBe(0);
    expect(arriveOnTile(g.state, unit, tile).camp).not.toBeNull();
    // Written at the one seam a camp stops existing, and never lowered.
    expect(player.campsCleared).toBe(1);

    slot(g.state, 0, 'theLastHunt');
    const paid = cardEmpireYields(g.state, 0).find((line) => line.source.includes('The Last Hunt'));
    expect(paid?.culture).toBe(2);
    player.campsCleared = 4;
    expect(
      cardEmpireYields(g.state, 0).find((line) => line.source.includes('The Last Hunt'))?.culture,
    ).toBe(8);
  });

  it('internalTradeRoutes — The Provisioners pay for the grain that never leaves', () => {
    const g = game();
    const mine = found(g.state, 0);
    const second = foundCityAt(g.state, 0, getTileAt(g.state.map, mine.col + 3, mine.row)!);
    const theirs = found(g.state, 1);
    slot(g.state, 0, 'theProvisioners');
    const happy = (): number =>
      explainHappiness(g.state, 0)
        .filter((line) => line.source.includes('The Provisioners'))
        .reduce((sum, line) => sum + line.value, 0);
    expect(happy()).toBe(0);

    const caravan = createUnit(g.state, 0, 'trader', mine.col, mine.row);
    const route = { from: mine.id, to: theirs.id, expiresTurn: g.state.turn + 10, outbound: true, autoResend: false };
    caravan.trade = { ...route };
    // A road to somebody else's town is `foreignTradeRoutes`, which is the
    // other count and a different card.
    expect(happy()).toBe(0);
    caravan.trade = { ...route, to: second.id };
    expect(happy()).toBe(1);
  });

  it('slottedOrderLevels and unslottedOrders — the council read from both ends', () => {
    const g = game();
    found(g.state, 0);
    const sc = playerById(g.state, 0)!.statecraft;
    // Two on the shelf and nothing in a chair yet.
    grant(sc, 'theArchives');
    grant(sc, 'theAnnalsOfLaw');
    grant(sc, 'firstRites');
    const culture = (name: string): number =>
      cardEmpireYields(g.state, 0)
        .filter((line) => line.source.includes(name))
        .reduce((sum, line) => sum + line.culture, 0);
    // Nothing is slotted, so neither card is live at all.
    expect(culture('The Archives')).toBe(0);

    sc.slots.push({ card: 'theArchives', sealedUntil: g.state.turn });
    // One chair, one level: the Archives pay for themselves and nothing else.
    expect(culture('The Archives')).toBe(1);
    // Two left on the shelf, at two culture apiece — and the Annals must be
    // slotted to say so, which is what makes the card a decision.
    sc.slots.push({ card: 'theAnnalsOfLaw', sealedUntil: g.state.turn });
    expect(culture('The Annals of Law')).toBe(2);
    expect(culture('The Archives')).toBe(2);
    // Deepening pays twice over, and the pun is the card: a deeper Archives
    // raises the *count* (three levels sit in chairs now) and `scaleByLevel`
    // raises what each level is worth (two culture, the vocabulary's
    // at-least-a-point-per-level rule). Three by two.
    grant(sc, 'theArchives', 2);
    expect(culture('The Archives')).toBe(6);
  });

  it('renown — The Laureate is a trickle now, and it joins the ledger it pays into', () => {
    const g = game();
    found(g.state, 0);
    expect(cardRenownLines(g.state, 0).some((l) => l.source.includes('The Laureate'))).toBe(false);
    slot(g.state, 0, 'theLaureate');
    const line = cardRenownLines(g.state, 0).find((l) => l.source.includes('The Laureate'));
    expect(line?.amount).toBe(1);
    // The court favours nobody in particular — an unfamilied trickle leaves the
    // draw as flat as it was.
    expect(line?.family ?? null).toBeNull();
    // And the rework's other half is untouched: the five works still pay.
    expect(orderDef('theLaureate').onSlot).toBeUndefined();
  });

  it('reads every shape this pass declared from at least one live card', () => {
    const used = new Set<CardEffectKind>();
    for (const id of ORDER_IDS) {
      for (const effect of orderDef(id).effects) used.add(effect.kind);
    }
    expect(used.has('upkeepRebate')).toBe(true);

    // The **member** register: a `CityScope`, a `CountKind`, a `where` and a
    // `UnitFilter` narrowing nobody names would pass the kind-level test above
    // while being read by nothing at all.
    const scopes = new Set<string>();
    const counts = new Set<string>();
    const wheres = new Set<string>();
    let filtered = false;
    const noteScope = (scope: unknown): void => {
      if (!scope || typeof scope !== 'object') return;
      const test = (scope as { test?: string }).test;
      if (test !== undefined) scopes.add(test);
      for (const inner of (scope as { of?: unknown[] }).of ?? []) noteScope(inner);
    };
    for (const id of ORDER_IDS) {
      for (const effect of orderDef(id).effects) {
        noteScope((effect as { scope?: unknown }).scope);
        if (effect.kind === 'countScaled') counts.add(effect.count);
        if (effect.kind === 'unitStat' && effect.where) wheres.add(effect.where);
        if (effect.kind === 'upkeepRebate' && effect.where) wheres.add(effect.where);
        if (effect.kind === 'productionBonus' && effect.class !== undefined) filtered = true;
      }
    }
    for (const scope of ['onResourceKind', 'adjacentGreatWork', 'queueHolds']) {
      expect(scopes.has(scope), scope).toBe(true);
    }
    for (const count of [
      'internalTradeRoutes',
      'slottedOrderLevels',
      'unslottedOrders',
      'clearedCamps',
    ]) {
      expect(counts.has(count), count).toBe(true);
    }
    expect(wheres.has('foreignTerritory')).toBe(true);
    expect(filtered).toBe(true);
    // And the slot grant that is not an effect at all.
    expect(orderDef('theAuspiciousSeal').onSlot).toEqual([{ grant: 'die' }]);
  });

  it('prints every new row in the words the sheets ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theQuartermasters')).toEqual([
      'military units cost 1 less gold in maintenance',
    ]);
    expect(said('theWarChest')).toEqual(['military units cost 3 less gold in maintenance']);
    expect(said('forcedMarches')).toEqual([
      'melee units: +1 movement',
      'melee units: +1 movement inside your territory',
    ]);
    expect(said('theEscortedRoads')).toEqual([
      'trade routes pay +30% more',
      'trade routes within 3 hexes of your soldiers cannot be plundered — nothing in the ' +
        'game can say where a route is safe, only what it pays — not built yet',
    ]);
    expect(said('theLastHunt')).toEqual([
      '+2 culture per barbarian camp you have cleared',
    ]);
    expect(said('theSaintsFields')).toEqual([
      "+3 faith on every hex carrying a great person's work",
    ]);
    expect(said('theWayhouses')).toEqual([
      '+2 gold per trade route you run',
      '+1 culture per trade route you run',
    ]);
    expect(said('theProvisioners')).toEqual([
      '+1 happiness per trade route between your own cities',
    ]);
    expect(said('thePrizeGrounds')).toEqual([
      '+2 happiness in every city settled on a luxury resource',
    ]);
    expect(said('theCensusEternal')).toEqual(['+1 science per 4 population']);
    expect(said('theGroundskeepers')).toEqual([
      "+1 food, +1 production on every hex carrying a great person's work",
    ]);
    expect(said('theMastersPresence')).toEqual([
      "+10% all yields in every city beside a great person's work",
    ]);
    expect(said('theWonderFeasts')).toEqual([
      '+2 food in every city while it is building a wonder',
      '+10% production toward wonders',
    ]);
    expect(said('theMasterBuilders')).toEqual([
      '-15% production toward The Magnum Opus',
      '-15% production toward Cathedrals',
    ]);
    expect(said('theShipwrightShores')).toEqual([
      '+1 production in every coastal city',
      '+30% production toward ships, in every coastal city',
    ]);
    expect(said('theDryDocks')).toEqual([
      '+25% production toward ships, in every city with a Harbour',
      'ships mend completely in a port — a heal that depends on where a piece is standing ' +
        'is a rule about a hex, and healing is a rule about a turn — not built yet',
    ]);
    expect(said('theWinteringGrounds')).toEqual([
      'all units cost no gold in maintenance outside your territory',
    ]);
    expect(said('theArchives')).toEqual([
      '+1 culture per level of the Orders you have placed in a slot',
    ]);
    expect(said('theAnnalsOfLaw')).toEqual([
      '+2 culture per Order you hold but have not placed in a slot',
    ]);
    expect(said('theAuspiciousSeal')).toEqual([
      'the first time this Order is placed in a slot, a die of the Magister is yours',
    ]);
    expect(said('theTriumphalWay')).toEqual([
      'capturing a city grants +5 happiness in every city for 10 turns',
    ]);
  });
});

// --- the balance pass of 2026-09-02 -----------------------------------------

/**
 * The user's balance pass over `docs/orders-and-doctrines.md`: the deepening
 * ladder (its own block, above), the retunes, and the four shapes the reworked
 * rows needed.
 *
 * One behavioural test per **new shape**, because the register test only proves
 * a shape is *named* by a row and a shape that is named and unread is exactly
 * the failure the vocabulary exists to prevent — plus the numbers that moved
 * and can only be checked by reading the ledger they land in.
 */
describe('the balance pass of 2026-09-02', () => {
  it('hasImprovement — Quarrymen\u2019s Guild asks for the quarry, not for the stone', () => {
    const g = game(902);
    const city = found(g.state, 0);
    slot(g.state, 0, 'quarrymensGuild');
    // Nothing has been dug: the scope is silent rather than generous.
    expect(cardCityYields(g.state, city).some((l) => l.card === 'quarrymensGuild')).toBe(false);
    // A quarry **inside the borders** — the sweep `terrainInBorders` takes,
    // asked of what has been built rather than of the ground. The centre's own
    // hex is the town's, so it is the one hex a test can be sure of.
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    tile.improvement = 'quarry';
    const line = cardCityYields(g.state, city).find((l) => l.card === 'quarrymensGuild')!;
    expect(line.production).toBe(4);
  });

  it('garrisoned — River Wardens want the wardens actually standing there', () => {
    const g = game(903);
    const city = found(g.state, 0);
    // Clear the seat's opening pieces off the centre so the town is empty.
    g.state.units = g.state.units.filter((u) => u.col !== city.col || u.row !== city.row);
    slot(g.state, 0, 'riverWardens');
    const named = (): boolean =>
      scopedCardTileLines(g.state, city).some((line) => line.source.includes('River Wardens'));
    expect(named()).toBe(false);
    // A civilian is not a garrison — the scope reads the same sweep the
    // `garrison` count reads, and that one counts combatants.
    createUnit(g.state, 0, 'settler', city.col, city.row);
    expect(named()).toBe(false);
    createUnit(g.state, 0, 'warrior', city.col, city.row);
    expect(named()).toBe(true);
  });

  it('yields — The Gilded Court reads what the hex has been reckoned to pay', () => {
    const g = game(904);
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('gildedCourt' as never);
    const ctx = yieldContextFor(g.state, 0);
    const paid = (tile: ReturnType<typeof getTileAt>): number =>
      explainTileYield(tile!, ctx).filter((l) => l.source.includes('Gilded Court')).length;

    // Grassland pays no gold, so the clause is silent on it.
    const dry = getTileAt(g.state.map, city.col, city.row)!;
    dry.terrain = 'grassland';
    dry.hills = false;
    dry.feature = 'none';
    delete dry.resource;
    expect(paid(dry)).toBe(0);

    // Coast pays a gold off its own terrain row, and the clause lands — off the
    // breakdown the chain has already built, never off a second reading.
    const wet = getTileAt(g.state.map, (city.col + 1) % g.state.map.width, city.row)!;
    wet.terrain = 'coast';
    wet.hills = false;
    wet.feature = 'none';
    delete wet.resource;
    expect(paid(wet)).toBe(1);
    const line = explainTileYield(wet, ctx).find((l) => l.source.includes('Gilded Court'))!;
    expect([line.science, line.culture, line.gold]).toEqual([1, 1, 0]);

    // A caller with no breakdown behind it answers no, which is the shape's
    // documented silence: a granary cannot ask what a hex is worth.
    expect(tileConditionHolds(wet, { test: 'yields', yield: 'gold' })).toBe(false);
  });

  it('basePercent — The Old Ways doubles the ground and never the works', () => {
    const g = game(905);
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    tile.terrain = 'grassland';
    tile.hills = false;
    tile.feature = 'none';
    delete tile.resource;
    delete tile.improvement;

    const bare = foldTileYield(explainTileYield(tile, yieldContextFor(g.state, 0)));
    slot(g.state, 0, 'theOldWays');
    const lines = explainTileYield(tile, yieldContextFor(g.state, 0));
    const doubled = foldTileYield(lines);
    // The share is **one labelled line**, and the list still folds to the total
    // (rule 5): what the hex pays is the sum of what the breakdown says.
    const share = lines.find((l) => l.source.includes('The Old Ways'))!;
    expect(share.food).toBe(bare.food);
    expect(doubled.food).toBe(bare.food * 2);
    expect(doubled.production).toBe(bare.production * 2);

    // Build anything at all and the clause stops: the condition is `unimproved`
    // and presence is the state, exactly as the rest of the ladder reads it.
    tile.improvement = 'farm';
    expect(
      explainTileYield(tile, yieldContextFor(g.state, 0)).some((l) =>
        l.source.includes('The Old Ways'),
      ),
    ).toBe(false);
  });

  it('moves every number the doc moved', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    const amountOf = (id: OrderId): number =>
      (orderDef(id).effects[0] as { amount: number }).amount;
    expect(amountOf('borderWardens')).toBe(2);
    expect(amountOf('vanguard')).toBe(2);
    expect(amountOf('siegeDoctrine')).toBe(4);
    expect(said('weightsAndMeasures')).toEqual(['+1 gold in every city']);
    expect(said('theTaxFarm')).toEqual(['+1 gold per 4 population']);
    expect(said('publicGranaries')).toEqual(['+15% of the stored food kept when a city grows']);
    expect(said('masterMasons')).toEqual(['completing a building grants +10 culture']);
    expect(said('theSaltRoad')).toEqual(['+1 gold on every hex carrying a strategic resource']);
    expect(said('spoilsOfTheWild')).toEqual(['clearing a barbarian camp pays +100%']);
    // Foreign Quarters is withdrawn and The Great Warring Tribes changed pool.
    expect(orderDef('foreignQuarters').retired).toBe(true);
    expect(doctrineDef('greatWarringTribes').tier).toBe(10);
    expect(doctrineDef('theAcademyOfDeeds').name).toBe('The Academy');
  });
});
