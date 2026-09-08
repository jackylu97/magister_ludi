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
  buildingProductionCost,
  growthThreshold,
  ownedTiles,
  refreshCityDerived,
  settleGrowthWindfall,
  settleProduction,
  tilePurchasePrice,
  unitProductionCost,
} from '../../src/sim/cities';
import {
  explainTileYield,
  foldTile,
  foldTileLines,
  yieldContextFor,
} from '../../src/sim/yields/hex';
import {
  cityYieldPercents,
  explainCity,
  foldCity,
  foldCityStages,
  productionModifiers,
} from '../../src/sim/yields/town';
import {
  explainEmpireCardYields,
  foldEmpireRates,
} from '../../src/sim/yields/empire';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { beadGrantDef } from '../../src/sim/beadData';
import { applyCombat, fortifyError, isCombatant, previewCombat } from '../../src/sim/combat';
import { type BuildingId, BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { chopFeatureAt, pillageAt, prospectAt } from '../../src/sim/improvements';
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
  explainCardEmpireYields,
  explainCardPercentYields,
  cardRulePercent,
  cardTileLines,
  scopedCardTileLines,
  tileConditionHolds,
  tileConditionReadsFold,
  cardBehaviorRule,
  cardCityStat,
  cityScopeAdmits,
  explainCardCityYields,
  cardLinesOnBuilding,
  cardProduction,
  cardYieldConversions,
  cardFoundingRider,
  foldCardYields,
  cardOfferRule,
  cardUnitStat,
  cardRenownLines,
  countOf,
  describeBuildingRow,
  describeCard,
  describeEffects,
  draftCost,
  drawDoctrineOffer,
  drawOrderOffer,
  drawOrderOptions,
  drawWeighted,
  drawWithoutReplacement,
  filledOrderSlots,
  liveEffects,
  livePool,
  drawablePool,
  musterPeriodicUnits,
  orderAtSlotPosition,
  payWindfallGrants,
  newPlayerStatecraft,
  orderChoiceError,
  orderDrawWeight,
  planDraft,
  rarityDrawWeight,
  runPeriodicBoons,
  sealRemaining,
  sealTurnsFor,
  slotTypesOf,
  settleCultureWindfall,
  slotOrderError,
  slottedOrdersOfFlavour,
  statecraftBlocker,
  stripRefs,
  tileConditionWords,
  unslotOrderError,
  windfallPayout,
} from '../../src/sim/statecraft';
import {
  type CardEffect,
  type CardEffectKind,
  type CardWindfallRiderEffect,
  type GovernmentId,
  type TileCondition,
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
import { nextFloat } from '../../src/sim/rng';
import { getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { isCoastal } from '../../src/sim/water';
import { arriveOnTile } from '../../src/sim/arrival';
import { closeWar, openWar } from '../../src/sim/wars';
import { foundReligion } from '../../src/sim/religion';
import type { CityYieldKey } from '../../src/sim/resourceData';
import {
  foundCityAt,
} from '../../src/sim/cities';
import {
  explainCardBuildingYields,
} from '../../src/sim/yields/town';
import { improvementDef } from '../../src/sim/improvementData';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { awardOccasion } from '../../src/sim/triumphs';
import { applyCommand } from '../../src/sim/commands';
import {
  greatPersonBlocker,
  greatPersonOfferPrice,
  greatPersonPurchaseError,
} from '../../src/sim/greatPeople';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import {
  explainUnitUpkeep,
  explainUnitUpkeepRebate,
  unitUpkeepTotal,
} from '../../src/sim/upkeep';
import { explainPurchaseCost, purchaseError } from '../../src/sim/purchase';
import { buildError, isUnlocked } from '../../src/sim/tech';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import {
  explainEmpireGold,
  explainRouteSlots,
  explainRouteYieldBetween,
  foldRouteYield,
  roadsBuiltBy,
  routeSlots,
} from '../../src/sim/trade';
import {
  SCHEMA_VERSION,
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { explainCityRenown, explainRenown, foldRenown } from '../../src/sim/renown';
import { unitDef, unitMaxHp } from '../../src/sim/unitData';
import { fullMovement } from '../../src/sim/units';
import { sightOf } from '../../src/sim/visibility';

// --- harness ----------------------------------------------------------------

/** Puts a card in the collection, as a draft would have. Test scaffolding only. */
function grant(sc: PlayerStatecraft, id: OrderId): void {
  if (!sc.orders.includes(id)) sc.orders.push(id);
}

/**
 * Slots a card, growing the spread if the government has no room — the tests
 * below are about what a card *does*, not about whether a chiefdom had a spare
 * economic slot, and every slot rule has its own test above.
 */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  grant(sc, id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  // **The bench announces itself** (batch E3a): a slotted card is the third
  // source of `liveEffects`, every reading in the game is remembered on
  // `GameState.revision`, and a hand that moves the board moves the counter
  // exactly as `applyCommand` does. See `test/sim/benches.test.ts`.
  bumpRevision(state);
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
    // make all tier 1 orders non-wildcard". The first option — several of the
    // chiefdom-pool Orders are wildcard-only (First Rites, Fire-Keepers, Hearth
    // Songs, First Fruits), and a starting government that could never play a
    // card its own pool deals is a draft that hands a seat a dead card.
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
      // **A retired row is out of this**, and The Auspicious Seal is the reason
      // the clause exists (schema 71): its whole face was a die of the Magister
      // handed over on first slotting, the dice are gone, and the row is kept
      // only so a save that holds it still loads. A withdrawn card has nothing
      // left to say and is not asked to say it.
      if (ORDER_IDS.includes(id as never) && orderDef(id as never).retired === true) continue;
      // An Order whose whole face is a **slot grant** speaks too — a card that
      // says something and carries no `CardEffect` at all. No live row does
      // today; the shape stands for the deck that wants it next.
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
      // Batch H6: `actionRule`, `behaviorRule`, `cityRule` and `zocRule` were
      // four names for one evaluation and are one `rule` shape now. The register
      // asks for the survivor; the four rules the live table names are still the
      // four rules it named.
      'meterRule', 'conditionRule', 'rule', 'cityStat', 'metaRule',
      'tileYield', 'renown', 'upkeepRebate',
      // The rebate's twin, built for The Reckless Levy on 2026-09-06: a coin
      // *added* to each soldier's keep, which the give-back vocabulary could not
      // say and the payroll percentage said as a number nobody could read.
      'upkeepSurcharge',
      // The user's card pass of 2026-09-03: Thalassocracy stopped being two
      // percentages and became a share of one voice paid again as another.
      'yieldConversion',
      // No longer the marked exception: buildings can be bought (Entry XXIX), so
      // `cardUnlocksBuilding` is read by `isUnlocked` and The Gilded Court
      // really does hand the Gilded Hall over.
      'unlocksBuilding',
      // Batch H3: the four Æra V bead Orders carried `effects: []` and were
      // being dealt paying nothing (`docs/audit/dead-code.md` §1.5). One shape
      // lights all four, and it is in this register the moment it is declared.
      'beadPerOccasion',
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
    // The hand is the whole offer: there is no fourth face since the levelling
    // ruling of 2026-09-04.
    expect(Object.keys(offer)).toEqual(['options']);
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

  it('deals only cards the empire does not already hold', () => {
    const g = game();
    const player = g.state.players[0]!;
    grant(player.statecraft, 'firstRites');
    // What holding a card buys since the levelling ruling of 2026-09-04: it
    // leaves the bag. There is no upgrade face for it to be rolled onto —
    // a draft can only ever widen.
    const offer = drawOrderOffer(g.state, player);
    expect(offer.options).not.toContain('firstRites');
  });

  it('deals the same hand from the same generator state', () => {
    const a = game(11);
    const b = game(11);
    expect(drawOrderOffer(a.state, a.state.players[0]!)).toEqual(
      drawOrderOffer(b.state, b.state.players[0]!),
    );
  });

  it('adds the card to the collection, once, and clears the offer', () => {
    const g = game();
    const player = g.state.players[0]!;
    const sc = player.statecraft;
    sc.pendingOrder = { options: ['firstRites'] };
    expect(dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command).ok).toBe(true);
    expect(sc.orders).toEqual(['firstRites']);
    expect(sc.pendingOrder).toBeUndefined();
    // A second deal of the same card cannot happen (`livePool` filters it out),
    // and if a hand-edited save contrives one the collection still holds it
    // once: the levelling ruling left no second copy to hold.
    sc.pendingOrder = { options: ['firstRites'] };
    dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    expect(sc.orders).toEqual(['firstRites']);
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
    // arrived with the playtest pass, so that the wildcard-only cards in the
    // chiefdom pool (First Rites, Fire-Keepers, Hearth Songs, First Fruits) are
    // cards an opening government can actually play. Blooded Spears is military,
    // so the economic slot still refuses it.
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
    expect(sc.orders).toContain('bloodedSpears');
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
    expect(sc.orders).toContain('bloodedSpears');
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
    // The live pool is the new government's cards and **nothing else** (user,
    // 2026-09-03). The chiefdom leftovers used to ride along; adopting now turns
    // the whole shelf over, and a chiefdom card never taken is gone for good.
    const pool = new Set(livePool(player.statecraft));
    expect([...pool].some((id) => orderDef(id).pool === 'governmentI')).toBe(true);
    expect([...pool].every((id) => orderDef(id).pool === 'governmentI')).toBe(true);
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
    expect(line.food).toBe(2);
    expect(line.kind).toBe('add');
    // A hex with no resource is untouched — the condition is the whole rule.
    const bare = getTileAt(g.state.map, city.col, city.row)!;
    delete bare.resource;
    expect(explainTileYield(bare, yieldContextFor(g.state, 0))).toHaveLength(before.length - 1);
  });

  it('foldCity — Wayside Shrines pays faith, and the fold is the sum of the list', () => {
    const g = game();
    const city = found(g.state, 0);
    const before = foldCity(g.state, city).faith;
    slot(g.state, 0, 'waysideShrines');
    expect(foldCity(g.state, city).faith).toBe(before + 1);
    // The collection is a list of ids since the levelling ruling of 2026-09-04:
    // holding a card twice is not a thing the state can say, so a second entry
    // is the same law read twice and pays once.
    g.state.players[0]!.statecraft.orders = ['waysideShrines'];
    expect(foldCity(g.state, city).faith).toBe(before + 1);
  });

  it('foldCity — a slotted Order pays its printed line, once', () => {
    const g = game();
    const city = found(g.state, 0);
    const before = foldCity(g.state, city).faith;
    // First Rites prints +1 faith in the capital and +1 more for each wildcard
    // Order in a slot. Only the capital line is a *city* line — the reader's
    // candle is an empire line, banked by `collectYields` — so this is the one
    // point. It printed a flat +2 until the synergy pass of 2026-09-05.
    slot(g.state, 0, 'firstRites');
    expect(foldCity(g.state, city).faith).toBe(before + 1);
    // Out of its office it pays nothing: an Order pays from a slot and nowhere
    // else, which is the clause the ladder never touched.
    g.state.players[0]!.statecraft.slots = [];
    bumpRevision(g.state);
    expect(foldCity(g.state, city).faith).toBe(before);
  });

  it('percentYields — a card joins the city stage rather than multiplying afterwards', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = g.state.players[0]!;
    player.statecraft.doctrines.push('riverKings');
    bumpRevision(g.state);
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
    // Batch F scoped the feast to the capital (`docs/history/orders-pass-3.md` §2, the
    // user's own re-cut), so the line is a per-city one and carries its count.
    expect(
      explainHappiness(g.state, 0).some((l) => l.source.startsWith('Order · Festival Days')),
    ).toBe(true);
    // Since the synergy pass of 2026-09-05 the writ line is a *count* — one
    // point per economic Order in a slot, at most four — so its label carries
    // the helping the way every other `countScaled` line does, and the card
    // counts itself: Provincial Governors alone is one point.
    expect(
      explainAuthority(g.state, 0).some((l) =>
        l.source.startsWith('Order · Provincial Governors'),
      ),
    ).toBe(true);
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(happyBefore + 4);
    expect(foldMeter(explainAuthority(g.state, 0))).toBe(writBefore + 1);
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
    const sightBefore = sightOf(g.state.map, scout, g.state);
    const warriorSight = sightOf(g.state.map, warrior, g.state);
    slot(g.state, 0, 'farRunners');
    // The cards pass of 2026-09-05: the runners stopped being a scout's card and
    // became the empire's eyes — **every** unit sees one hex further, and the
    // filter that used to be the whole of the rule is gone with the movement.
    expect(sightOf(g.state.map, scout, g.state)).toBe(sightBefore + 1);
    expect(sightOf(g.state.map, warrior, g.state)).toBe(warriorSight + 1);
    expect(cardUnitStat(g.state, warrior, 'movement')).toBe(0);
  });

  it('cityStat — Militia Levies raises the walls and is itemised', () => {
    const g = game();
    const city = found(g.state, 0);
    expect(cardCityStat(g.state, city, 'defense')).toEqual([]);
    slot(g.state, 0, 'militiaLevies');
    expect(cardCityStat(g.state, city, 'defense')).toEqual([
      { card: 'militiaLevies', source: 'Order · Militia Levies', amount: 4 },
    ]);
    expect(cardCityStat(g.state, city, 'sight')).toHaveLength(1);
    // One line, because the card prints one. It printed a second at level 2
    // until the levelling ruling of 2026-09-04; the reader that folded them is
    // unchanged and a row printing two clauses would still land as two lines.
    playerById(g.state, 0)!.statecraft.slots = [];
    bumpRevision(g.state);
    expect(cardCityStat(g.state, city, 'defense')).toEqual([]);
  });

  it('renown — the Council of Elders is a line per empire, with its arithmetic shown', () => {
    const g = game();
    const sc = playerById(g.state, 0)!.statecraft;
    // A government that says nothing about renown says nothing about renown.
    expect(cardRenownLines(g.state, 0)).toEqual([]);
    sc.government = 'councilOfElders';
    bumpRevision(g.state);
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
    expect(explainCardEmpireYields(g.state, 0).some((l) => l.card === 'saltTithes')).toBe(false);
  });

  it('rateConversion — The Tithe reads the turn’s rate, not the bank', () => {
    const g = game();
    found(g.state, 0);
    g.state.players[0]!.statecraft.doctrines.push('theTithe');
    bumpRevision(g.state);
    expect(explainCardEmpireYields(g.state, 0, { faithPerTurn: 7 }).find((l) => l.card === 'theTithe')?.gold).toBe(7);
    // Zero rate, no line — a card that pays nothing is not in the list.
    expect(explainCardEmpireYields(g.state, 0, { faithPerTurn: 0 }).some((l) => l.card === 'theTithe')).toBe(false);
  });

  it('rateConversion — the reading is taken only when a card asks for one', () => {
    // Batch H18. `foldEmpireRates` prices every town in the realm, only this arm
    // reads it, and `explainEmpireCardYields` is asked twice per card stamp,
    // once per Ledger open and once per top-bar refresh — so it hands the
    // *taking* of the reading in rather than the reading, and an empire holding
    // no such card never pays for a figure nothing looks at. What must not move
    // is the answer for an empire that does hold one.
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('shrine', 'temple');
    bumpRevision(g.state);
    refreshCityDerived(g.state, city);
    g.state.players[0]!.statecraft.doctrines.push('theTithe');
    bumpRevision(g.state);
    // The lazy form and the eager one, on the very same board: one list.
    expect(explainEmpireCardYields(g.state, 0)).toEqual(
      explainCardEmpireYields(g.state, 0, foldEmpireRates(g.state, 0)),
    );
    // And the thunk is resolved **once**, so two conversions read one set of
    // books exactly as they did when the reading was taken up front.
    let takings = 0;
    const lines = explainCardEmpireYields(g.state, 0, () => {
      takings += 1;
      return foldEmpireRates(g.state, 0);
    });
    expect(lines).toEqual(explainEmpireCardYields(g.state, 0));
    expect(takings).toBe(1);
    // An empire holding no such card never asks at all.
    g.state.players[0]!.statecraft.doctrines = [];
    bumpRevision(g.state);
    let asked = 0;
    explainCardEmpireYields(g.state, 0, () => {
      asked += 1;
      return {};
    });
    expect(asked).toBe(0);
  });

  it('windfallRider — The Woodwrights changes the printed number', () => {
    const g = game();
    g.state.players[0]!.statecraft.doctrines.push('woodwrights');
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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

  it('foundingRider — The Founders’ Road founds no hall, and pays every town its culture', () => {
    // Re-pinned by the user's card pass of 2026-09-03: the free Monument and its
    // first-five count are gone, and the road bought a culture line instead. So
    // `CardFoundingRiderEffect.maxCities` is a field **no live row carries** —
    // held for the day a card counts its first towns again, and read by
    // `cardFoundingRider` exactly as it was. What is pinned here is the row as
    // the user wrote it: nothing is founded with a building, and every town of
    // the realm is a culture better off.
    const g = game();
    g.state.players[0]!.statecraft.doctrines.push('foundersRoad');
    bumpRevision(g.state);
    expect(cardFoundingRider(g.state, 0).buildings).toEqual([]);
    const city = found(g.state, 0);
    expect(city.buildings).not.toContain('monument');
    const line = explainCardCityYields(g.state, city).find((l) => l.card === 'foundersRoad')!;
    expect(line.culture).toBe(1);
    // Every town, however many there are — the clause carries no scope at all.
    const second = foundCityAt(
      g.state,
      0,
      getTileAt(g.state.map, (city.col + 5) % g.state.map.width, city.row)!,
    )!;
    expect(explainCardCityYields(g.state, second).find((l) => l.card === 'foundersRoad')!.culture).toBe(1);
  });

  it('conditionRule — The Hermit Crown opens and closes with the city count', () => {
    const g = game();
    const city = found(g.state, 0);
    g.state.players[0]!.statecraft.doctrines.push('hermitCrown');
    bumpRevision(g.state);
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
    bumpRevision(g.state);
    expect(cityYieldPercents(g.state, city).some((l) => l.source.includes('Hermit'))).toBe(false);
  });

  it('actionRule, behaviorRule, offerRider, meterRule — the flag-shaped hooks', () => {
    const g = game();
    expect(cardActionRule(g.state, 0, 'freeChop')).toBe(false);
    g.state.players[0]!.statecraft.doctrines.push('burningWay');
    bumpRevision(g.state);
    expect(cardActionRule(g.state, 0, 'freeChop')).toBe(true);

    // The pact's one surviving clause since the user's card pass of 2026-09-03
    // — it was three named rules and is now one, so the hook is read through the
    // rule a live row still carries. `barbariansPassive` and `noCampClearing`
    // are held in the vocabulary with no row naming them; their verbs are pinned
    // further down, driven by a timed effect.
    expect(cardBehaviorRule(g.state, 0, 'barbarianKillsConvert')).toBe(false);
    g.state.players[0]!.statecraft.doctrines.push('wolfMothersPact');
    bumpRevision(g.state);
    expect(cardBehaviorRule(g.state, 0, 'barbarianKillsConvert')).toBe(true);

    expect(cardOfferRule(g.state, 0, 'discoveryClaimAll')).toBe(false);
    g.state.players[0]!.statecraft.doctrines.push('athenaeumOfTheRoad');
    bumpRevision(g.state);
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
    bumpRevision(g.state);
    const after = explainAuthority(g.state, 0).find((l) => l.source.includes('captured'))!;
    expect(after.value).toBeGreaterThan(before.value);
    // A captured city costs 4 since the authority rework (user, 2026-08-29).
    // Hegemony *sets* the price since the Æra III fork (2026-09-05) — the user's
    // own rewrite of the row — and one is the least the writ allows (`cityCosts`
    // floors it, Entry XIV.D.2), so a conquest is as cheap as any law can make it.
    expect(after.value).toBe(-1);
  });

  it('rulePercent — Manifest of the Steppe cheapens settlers and stops the ladder', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.unitsBuilt.settler = 3;
    const before = unitProductionCost(g.state, 0, 'settler');
    player.statecraft.doctrines.push('manifestOfTheSteppe');
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
    // v50: tree revision 4 — the user's hand-drawn tree transcribed. Fourteen
    // nodes renamed with their ids kept, three ids cut (`ancestorRites`,
    // `chivalry`, `fortification`) and three added, almost every prerequisite
    // re-hung, twelve columns and a truncated cost ladder — and, beside it, the
    // one-unit-a-turn purchase rule widened to one *per class*.
    // v55 (2026-09-03, the playtest notes): two table deletions — the Standing
    // Stones improvement and the Terraces — so a v54 log that built either has
    // no row to replay into.
    // v57 (war & diplomacy, phase two): deals exist. Two registers, four
    // verbs and a widened `proposePeace`, a luxury that may be lent across a
    // table, and one technology that hands over a verb it did not — so a v56
    // log knows no deal commands and replays into a different world.
    // v59 (the playtest nerf batch, 2026-09-03): The Greenwood Law leaves the
    // Government II pool and Athenaeum of the Road leaves tier 4 — the first
    // Doctrine ever withdrawn — while The Unbroken Land narrows to unimproved
    // forest and jungle. A v58 log names indices of triples dealt from bags
    // this build no longer holds.
    // v61 (the card-shapes pass, 2026-09-04): nine Orders join the Government
    // II and III pools, The Salt Road and Hearth Songs are retired out of
    // Government I and the chiefdom, and The Last Hunt pays a second voice —
    // four bags changed size, so a v60 log's `chooseOrder` names indices into
    // triples this build does not deal.
    // v67 (the synergy-density pass, 2026-09-05): eight rows stop being flat
    // and read the council beside them, Vanguard is retired out of Government I
    // and The Banner-Call and The Far Charts join Government II and III — three
    // bags changed size again, so a v66 log's first hand comes out different
    // from the same seed.
    // v68 (the cards pass, 2026-09-05): Government IV and Government V become
    // Order pools of their own — every rung of the ladder opens a shelf now —
    // and twenty-seven rows join them while eight leave the four pools below.
    // Every bag changed, so a v67 log's `chooseOrder` names indices into hands
    // this build does not deal.
    // v71 (faith's currency, 2026-09-06): The Auspicious Seal is retired with
    // the dice of the Magister it paid, so the Government III bag is one row
    // shorter and a v70 log's `chooseOrder` names indices into a hand this
    // build does not deal. Two fields joined the seat besides — the rerolls it
    // has taken, and the rungs of the faith ladder it has climbed.
    // 73 since batch D (2026-09-06): the buildings cut with chains — twelve
    // ordinary rows withdrawn, five uniques added, the chain field, the
    // Throne's per-unit rebate and the base beaker halved. 74 since batch C2
    // landed the rites beside it on the same day.
    // 75 since batch X (2026-09-06): yields are exact — no fold floors, every
    // bank and pool holds the fraction, so a v74 log banks different figures
    // from its second turn on. 76 since batch E landed the tree's own gifts the
    // same day: ten nodes hand over something else, a third conversion project
    // joined the queue's vocabulary, and a road step is an empire fact.
    expect(SCHEMA_VERSION).toBe(91);
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
    bumpRevision(g.state);
    slot(g.state, 0, 'firstRites');
    slot(g.state, 0, 'festivalDays');
    // Government, then Doctrines in the order taken, then slots in slot order.
    // First Rites carries two effects since the synergy pass — the capital's
    // candle and the wildcard reader — and both walk under the card's own name,
    // in the row's own order.
    expect(liveEffects(g.state, 0).map((e) => e.source)).toEqual([
      'Doctrine · The Great Litany',
      'Order · First Rites',
      'Order · First Rites',
      'Order · Festival Days',
      // Batch F: the feast is two clauses now — cheer in the capital and song
      // in every town — and both walk under the card's own name, in row order.
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
    bumpRevision(g.state);
    return { g, city };
  }

  it('the city’s flat lines fold to the difference the cards make', () => {
    const g = game(29);
    const city = found(g.state, 0);
    const before = foldCity(g.state, city);
    // Wayside Shrines rather than First Rites since the balance pass of
    // 2026-08-31: the capital's candles moved to First Rites and the flat "+1
    // faith in every city" it used to carry became a row of its own.
    slot(g.state, 0, 'waysideShrines');
    slot(g.state, 0, 'weightsAndMeasures');
    const lines = explainCardCityYields(g.state, city);
    // Batch F put the shrines' candles in the capital and counted them per
    // town held, so the line is a `countScaled` capital payout and lands after
    // the flat one — the fold below is the claim, not the order.
    expect(lines.map((line) => line.source)).toEqual([
      'Order · Weights & Measures',
      'Order · Wayside Shrines · ×1',
    ]);
    const after = foldCity(g.state, city);
    // The fold of the list is exactly the change in the total — no card pays
    // into a headline without a line saying so.
    const fold = foldCardYields(lines);
    expect(after.faith - before.faith).toBe(fold.faith);
    expect(after.gold - before.gold).toBe(fold.gold);
  });

  it('the two stages are applied once, in order, floored once', () => {
    const { g, city } = withCards();
    const sums = foldCityStages(g.state, city, city.queue[0]);
    // Recomputed from the printed lines: the panel's arithmetic and the
    // simulation's are one function (`foldStageSums`), and this asserts it by
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
    bumpRevision(g.state);
    player.statecraft.doctrines.push('riverKings');
    bumpRevision(g.state);
    const food = cityYieldPercents(g.state, city).filter(
      (line) => line.yield === 'food' && line.stage === 'city',
    );
    expect(food.length).toBeGreaterThanOrEqual(2);
    const summed = food.reduce((total, line) => total + line.percent, 0);
    expect(foldCityStages(g.state, city, city.queue[0]).food.city).toBe(summed);
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
    expect(foldTile(tile, ctx)).toEqual(foldTileLines(explainTileYield(tile, ctx)));
  });

  it('a windfall’s printed number is the fold of its own riders', () => {
    const g = game(29);
    g.state.players[0]!.statecraft.doctrines.push('woodwrights');
    bumpRevision(g.state);
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
      bumpRevision(g.state);
      // Slotted, not merely held: the whole of what this rider prices is the
      // scarce decision, so an Order in the pocket buys nothing.
      sc.slots = orders.map((id) => ({ card: id, sealedUntil: 0 }));
      bumpRevision(g.state);
      for (const id of orders) sc.orders.push(id);
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
    bumpRevision(g.state);
    sc.orders.push('bloodedSpears', 'campFollowers');
    sc.slots = [
      { card: 'bloodedSpears', sealedUntil: 0 },
      { card: 'campFollowers', sealedUntil: 0 },
    ];
    bumpRevision(g.state);
    // Æra II. Nothing on the table carries both flags on one rider today, so the
    // composition is pinned by lending War Chief's science rider the era for the
    // length of this test and handing it straight back — the alternative is a
    // product nobody checks until the first card that wants one.
    // An Æra-II empire. Re-read against the tree pass of 2026-08-30, which put
    // Currency in Æra II and Mathematics and Rhetoric in Æra III — one node of
    // the second age is all the era multiplier is being asked about.
    playerById(g.state, 0)!.techsResearched.push('currency' as never);
    bumpRevision(g.state);
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
    bumpRevision(g.state);
    player.statecraft.drafts = 20; // No draft threshold in the way of the arithmetic.
    player.statecraft.orders.push('bloodedSpears');
    player.statecraft.slots = [{ card: 'bloodedSpears', sealedUntil: 0 }];
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
      bumpRevision(g.state);
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
      city.hammerBasket = buildingProductionCost('monument') + 7;
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
    // **A rule held with no row naming it.** The user's card pass of 2026-09-03
    // cut Wolf-Mother's Pact back to its conversion clause, so nothing in the
    // data turns this on today — and the verb that reads it is unchanged, which
    // is exactly what makes restoring the clause a JSON row rather than a change
    // to the wild's own module. It is therefore driven here through
    // `Player.timed`, an ordinary source of live effects, so the reading stays
    // pinned while the vocabulary waits for a card.
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
    g.state.players[0]!.timed = [{
      card: 'wolfMothersPact',
      effect: { kind: 'rule', rule: 'barbariansPassive' },
      expiresTurn: g.state.turn + 10,
    }];
    bumpRevision(g.state);
    expect(nearestTarget(g.state, wild, raider)).toBeNull();
  });

  it('offerRider discoveryClaimAll — every option is paid, the chosen one first', () => {
    const g = game(41);
    const player = g.state.players[0]!;
    found(g.state, 0);
    player.statecraft.doctrines.push('athenaeumOfTheRoad');
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
 * **The levelling axe, and the skip** (user, 2026-09-04: *"no more upgrading
 * altogether, all cards are as is. Players are given an option to skip and
 * increase the rarity of their next draft"*).
 *
 * What stood here was the deepening ladder — an authored increment per row, a
 * ceiling, and a promise that an upgrade always changed something. All of it is
 * gone, and the promise this block holds in its place is the one the ruling
 * bought: **a card is what its row prints**, and a draft is take one or pass.
 *
 * Three things need pinning, and each is a way the other two could quietly stop
 * being true:
 *
 *   1. **the levels are gone from the reading** — no field, no clamp, no second
 *      face, and one description of a card wherever it is printed;
 *   2. **the draw is weighted and still guarantees the spread** — a rare card is
 *      rare among cards of its own office, and every hand of three still holds
 *      one military, one economic and one wildcard;
 *   3. **the pity is an absolute count** — a skip raises it, a pick zeroes it,
 *      nothing ticks it, and the hand a skip passed on is gone for good.
 */
describe('a card is what it prints', () => {
  it('carries no level, no ceiling and no second face anywhere in the table', () => {
    for (const id of ORDER_IDS) {
      const row = orderDef(id) as unknown as Record<string, unknown>;
      expect(row.upgrade, id).toBeUndefined();
      expect(row.maxLevel, id).toBeUndefined();
      expect(row.upgradable, id).toBeUndefined();
    }
    expect((STATECRAFT as unknown as Record<string, unknown>).maxOrderLevel).toBeUndefined();
  });

  it('describes a card the same way however it is asked', () => {
    // `describeCard` took a level until 2026-09-04, and the offer printed a
    // "now/deepened" pair off it. One reading now, and it is the row's — the
    // effects first, in the vocabulary's own words, and whatever the row adds
    // beside them (an `onSlot` gift) after.
    expect(describeCard.length).toBe(1);
    for (const id of ORDER_IDS) {
      const said = describeCard(id);
      const printed = describeEffects(orderDef(id).effects);
      expect(said.slice(0, printed.length), id).toEqual(printed);
    }
  });

  it('holds a card once, in a list of ids', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    grant(sc, 'firstRites');
    grant(sc, 'firstRites');
    expect(sc.orders).toEqual(['firstRites']);
  });
});

describe('the draw is weighted by rarity', () => {
  /** How the table weighs each rung, before any pity. */
  const WEIGHTS = STATECRAFT.rarityWeights;

  it('reads the ratified weights off the table, and the pity beside them', () => {
    // The sheet's proposal, ratified 2026-09-04. Pinned here because every
    // frequency below is a reading of these four numbers.
    expect(WEIGHTS).toEqual({ common: 4, uncommon: 2, rare: 1 });
    expect(STATECRAFT.skipPity).toEqual({ uncommon: 1, rare: 1 });
  });

  it('weighs a card by its row, and adds the pity to the two rungs that take it', () => {
    expect(rarityDrawWeight('common', 0)).toBe(4);
    expect(rarityDrawWeight('uncommon', 0)).toBe(2);
    expect(rarityDrawWeight('rare', 0)).toBe(1);
    // Three passes: the commons stand still and the rest close on them. That is
    // the whole of the promise — pity moves the top of the deck, never the floor.
    expect(rarityDrawWeight('common', 3)).toBe(4);
    expect(rarityDrawWeight('uncommon', 3)).toBe(5);
    expect(rarityDrawWeight('rare', 3)).toBe(4);
    // And a card asks through its own row.
    expect(orderDrawWeight('bloodedSpears', 0)).toBe(
      rarityDrawWeight(orderDef('bloodedSpears').rarity, 0),
    );
  });

  /**
   * The frequencies, **on named seeds**, over a bag built for the purpose.
   *
   * A deterministic pin rather than a statistical claim: the same seeds deal the
   * same hands forever, so what is asserted is *these draws*, and the count is
   * only the readable way to state it. The bag is one rare against three
   * commons of the same office, so the spread rule cannot reach in and pick for
   * the weights — every draw here is one sub-bag's.
   */
  it('deals a rare card about a thirteenth as often as three commons', () => {
    const g = game(5);
    // Chiefdom military rows: one of each rung is not on the table, so the bag
    // is assembled by hand out of ids and weighed by a function of the id.
    const bag: OrderId[] = ['bloodedSpears', 'farRunners', 'militiaLevies', 'campFollowers'];
    const weight = (id: OrderId): number => (id === 'campFollowers' ? 1 : 4);
    let rares = 0;
    for (let i = 0; i < 130; i++) {
      const [drawn] = drawWeighted(g.state, bag, 1, weight);
      if (drawn === 'campFollowers') rares += 1;
    }
    // Thirteen of a hundred and thirty, on seed 5, exactly — a number this
    // build produces and the next one must reproduce. Change the seed or the
    // weights and this moves; it is the pin, not a statistical claim.
    expect(rares).toBe(13);
  });

  it('deals nothing but the weighted card when everything else weighs nothing', () => {
    const g = game(3);
    const bag: OrderId[] = ['bloodedSpears', 'farRunners', 'militiaLevies'];
    const only = (id: OrderId): number => (id === 'militiaLevies' ? 1 : 0);
    for (let i = 0; i < 20; i++) {
      expect(drawWeighted(g.state, bag, 1, only)).toEqual(['militiaLevies']);
    }
  });

  it('spends exactly one roll per card it takes, weighted or not', () => {
    // The roll contract, unchanged by the weights (`drawWeighted`). Two draws
    // of two from the same seeded state must land in the same place as one draw
    // of four would have left the generator.
    const a = game(17);
    const b = game(17);
    const bag: OrderId[] = ['bloodedSpears', 'farRunners', 'militiaLevies', 'campFollowers'];
    drawWeighted(a.state, bag, 4, () => 1);
    drawWithoutReplacement(b.state, bag, 4);
    expect(nextFloat(a.state.rng)).toBe(nextFloat(b.state.rng));
  });

  it('keeps the military/economic/wildcard spread under weighting', () => {
    // The guarantee rides *inside* each sub-bag rather than around the hand, so
    // weighting cannot cost a hand its spread. Ten drafts, every one of them
    // one of each — and the pool is the chiefdom's, whose rarities are the
    // table's own.
    const g = game(41);
    const sc = g.state.players[0]!.statecraft;
    for (let i = 0; i < 10; i++) {
      const hand = drawOrderOptions(g.state, livePool(sc), 3, (id) => orderDrawWeight(id, 0));
      expect(hand, `draft ${i}`).toHaveLength(3);
      expect(new Set(hand.map((id) => orderDef(id).slot)), `draft ${i}`).toEqual(
        new Set(SLOT_TYPES),
      );
    }
  });

  it('deals a hand the pity has changed, from the same state', () => {
    // The pity is read at the deal (`drawOrderOffer`), so two empires on the
    // same seeded state with different skip counts are dealt different hands.
    const clean = game(23);
    const patient = game(23);
    patient.state.players[0]!.statecraft.orderSkips = 4;
    const a = drawOrderOffer(clean.state, clean.state.players[0]!);
    const b = drawOrderOffer(patient.state, patient.state.players[0]!);
    expect(a.options).not.toEqual(b.options);
  });
});

describe('passing on a draft', () => {
  it('spends the hand, raises the pity, and blocks nothing afterwards', () => {
    const g = game();
    const player = g.state.players[0]!;
    const sc = player.statecraft;
    sc.pendingOrder = { options: ['firstRites', 'saltTithes', 'bloodedSpears'] };
    expect(statecraftBlocker(player)).toBe('an Order draft is waiting');
    expect(dispatch(g, { type: 'skipOrderOffer', playerId: 0 } as Command).ok).toBe(true);
    // Gone, not re-dealt: an offer is drawn once and spent by a command, and a
    // pass is the second way to spend one.
    expect(sc.pendingOrder).toBeUndefined();
    expect(sc.orders).toEqual([]);
    expect(sc.orderSkips).toBe(1);
    expect(statecraftBlocker(player)).toBeNull();
  });

  it('counts consecutive passes and zeroes them on a pick', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    for (let i = 1; i <= 3; i++) {
      sc.pendingOrder = { options: ['firstRites'] };
      dispatch(g, { type: 'skipOrderOffer', playerId: 0 } as Command);
      expect(sc.orderSkips).toBe(i);
    }
    sc.pendingOrder = { options: ['firstRites'] };
    dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    expect(sc.orderSkips).toBe(0);
  });

  it('refuses a pass with no draft on the table, byte-identically', () => {
    const g = game();
    const before = snapshotState(g.state);
    const refused = dispatch(g, { type: 'skipOrderOffer', playerId: 0 } as Command);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toContain('no Statecraft draft to pass on');
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('refuses a pass from a seat whose turn is over, byte-identically', () => {
    const g = game();
    g.state.players[0]!.statecraft.pendingOrder = { options: ['firstRites'] };
    dispatch(g, { type: 'endTurn', playerId: 0 } as Command);
    const before = snapshotState(g.state);
    const refused = dispatch(g, { type: 'skipOrderOffer', playerId: 0 } as Command);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toContain('cannot pass on a draft');
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('replays byte-identically through a pass', () => {
    // The determinism claim, end to end: the pass is in the log, the culture it
    // spent stays spent, and the hand it threw away never comes back.
    const play = (g: ReturnType<typeof game>): void => {
      const sc = g.state.players[0]!.statecraft;
      sc.pendingOrder = drawOrderOffer(g.state, g.state.players[0]!);
      dispatch(g, { type: 'skipOrderOffer', playerId: 0 } as Command);
      sc.pendingOrder = drawOrderOffer(g.state, g.state.players[0]!);
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    };
    const a = game(31);
    const b = game(31);
    play(a);
    play(b);
    expect(snapshotState(a.state)).toEqual(snapshotState(b.state));
    expect(a.state.players[0]!.statecraft.orderSkips).toBe(0);
    expect(a.state.players[0]!.statecraft.orders).toHaveLength(1);
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
  it('buildingsOfCategory — a card pays per building of one category', () => {
    const g = game();
    const city = found(g.state, 0);
    // The Merchant League carried this count until the Æra III fork
    // (2026-09-05) made every tier-18 government a reader of its own chair; the
    // shape it declared is still read, from The Guild Compact's row, which is
    // the claim this test has always been making.
    slot(g.state, 0, 'theGuildCompact');
    const percent = (): number =>
      explainCardPercentYields(g.state, city)
        .filter((line) => line.card === 'theGuildCompact')
        .reduce((sum, line) => sum + line.percent, 0);
    // No production buildings: no line at all, rather than a line worth nothing.
    expect(percent()).toBe(0);
    city.buildings.push('workshop');
    bumpRevision(g.state);
    // Batch F raised the compact's step to three points a hall (balance turn §3).
    expect(percent()).toBe(3);
    // A building of another category is not a helping: the count is of the rows
    // that declare this category, read off `BuildingDef.category`.
    city.buildings.push('monument');
    bumpRevision(g.state);
    expect(percent()).toBe(3);
  });

  it('capitalFaithPerTurn — Theocracy tithes the capital and nowhere else', () => {
    const g = game();
    found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'theocracy';
    bumpRevision(g.state);
    const lines = explainCardEmpireYields(g.state, 0, { faithPerTurn: 100, capitalFaithPerTurn: 30 });
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
    // Eight buildings, four per side: the 2026-09-03 nerf pays a yield per TWO
    // buildings, and this claim needs a base of 2/2 so the charter's 50% still
    // floors to something a line can carry.
    from.buildings.push(
      'market', 'workshop', 'barracks', 'stoneWalls',
      'granary', 'library', 'monument', 'amphitheater',
    );
    bumpRevision(g.state);
    const before = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
    playerById(g.state, 0)!.statecraft.government = 'merchantLeague';
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
    bumpRevision(g.state);
    const after = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    const line = after.bonuses.find((b) => b.source.includes('The Empire'))!;
    expect(line.amount).toBe(1);
    // A scholar is not a general — the family is the whole of the rule.
    player.legacies.push({ id: 'imhotep', age: 1 });
    bumpRevision(g.state);
    const third = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    if (third.ok) {
      expect(third.bonuses.find((b) => b.source.includes('The Empire'))!.amount).toBe(1);
    }
  });

  it('renown per wonder — The Magisterium pays for the stones it holds', () => {
    const g = game();
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'theMagisterium';
    bumpRevision(g.state);
    expect(cardRenownLines(g.state, 0)).toEqual([]);
    city.buildings.push('pyramids');
    bumpRevision(g.state);
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
    bumpRevision(g.state);
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(before);
    city.buildings.push('palisade');
    bumpRevision(g.state);
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(before + 1);
  });

  it('discoveredCamps and vsBarbarians — Border Ballads pays for the wild twice over', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'borderBallads');
    expect(explainCardEmpireYields(g.state, 0).some((l) => l.card === 'borderBallads')).toBe(false);
    // A camp on ground this seat has walked past. `visibleCamps`' sibling: the
    // grid is monotone, so the count does not fall when the scout goes home.
    g.state.camps.push({ col: city.col, row: city.row, foundedTurn: 0 });
    expect(foldCardYields(explainCardEmpireYields(g.state, 0)).culture).toBe(2);
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
    // Batch F moved Silk Roads' coin **onto the road** (`docs/history/orders-pass-3.md`
    // §9's grammar: put yields on a thing, then multiply the thing), so The
    // Wayhouses carries the empire count this test was written against and the
    // caravan itself carries the coin.
    slot(g.state, 0, 'theWayhouses');
    expect(explainCardEmpireYields(g.state, 0).some((l) => l.card === 'theWayhouses')).toBe(false);
    const trader = createUnit(g.state, 0, 'warrior', from.col, from.row);
    trader.trade = { from: from.id, to: to.id, expiresTurn: g.state.turn + 10, outbound: true, autoResend: false };
    expect(foldCardYields(explainCardEmpireYields(g.state, 0)).gold).toBe(1);
    // A lapsed route is not a route: expiry is one comparison, here as everywhere.
    trader.trade.expiresTurn = g.state.turn;
    expect(explainCardEmpireYields(g.state, 0).some((l) => l.card === 'theWayhouses')).toBe(false);
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
    bumpRevision(g.state);
    city.population = 12;
    const line = explainCardCityYields(g.state, city).find((l) => l.card === 'republic')!;
    expect(line.culture).toBe(2);
    // Empire-wide it would have been the realm's whole population; `within` is
    // what makes it this town's.
    expect(explainCardEmpireYields(g.state, 0).some((l) => l.card === 'republic')).toBe(false);
  });

  it("foundingRider roads — The Founders' Road joins a new town to the realm", () => {
    const g = game();
    const first = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('foundersRoad');
    bumpRevision(g.state);
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
    bumpRevision(g2.state);
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
    bumpRevision(g.state);
    expect(isUnlocked(g.state, 0, 'building', 'gildedHall')).toBe(true);
    // Open, and still not buildable: it is bought or not at all.
    expect(buildError(g.state, 0, 'building', 'gildedHall', city)).toContain('bought');
    player.gold = 10000;
    expect(purchaseError(g.state, 0, city.id, { kind: 'building', id: 'gildedHall' }, 'gold')).toBeNull();
    const price = explainPurchaseCost(g.state, 0, city.id, { kind: 'building', id: 'gildedHall' }, 'gold')!;
    // The row's hammers at `goldPerHammer` — and "the row's hammers" means the
    // folded price since 2026-09-06 (`docs/flags.md` item y), age band included,
    // because the till converts what the basket would have paid.
    expect(price.total).toBe(
      buildingProductionCost('gildedHall') * RULES.production.goldPerHammer,
    );
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
    bumpRevision(g.state);
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
    // **At full health**, which is the whole of the user's card pass of
    // 2026-09-03: the pact lost its two other clauses and the convert stopped
    // arriving on one hit point. Its own maximum, not the roster's, so a stamped
    // raider is whole by the bar the renderer will draw for it.
    expect(after!.hp).toBe(unitMaxHp(after!));
  });

  it('noCampClearing — an empire at peace with the wild does not sack its villages', () => {
    // The second rule held with no row naming it (see `barbariansPassive`
    // above): the user's card pass of 2026-09-03 left Wolf-Mother's Pact with
    // its conversion clause alone, and `arriveOnTile` still asks. Driven
    // through `Player.timed` for that reading's reason exactly.
    const g = game();
    const player = playerById(g.state, 0)!;
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    g.state.camps.push({ col: tile.col, row: tile.row, foundedTurn: 0 });
    player.timed = [{
      card: 'wolfMothersPact',
      effect: { kind: 'rule', rule: 'noCampClearing' },
      expiresTurn: g.state.turn + 10,
    }];
    bumpRevision(g.state);
    expect(arriveOnTile(g.state, unit, tile).camp).toBeNull();
    expect(g.state.camps).toHaveLength(1);
    // Without the rule the same arrival burns it out — the rule is the card.
    delete player.timed;
    bumpRevision(g.state);
    expect(arriveOnTile(g.state, unit, tile).camp).not.toBeNull();
    expect(g.state.camps).toHaveLength(0);
  });

  /**
   * Re-aimed 2026-09-06 (schema 71, `docs/history/fewer-things.md` §1). This pinned the
   * once-per-game slot grant through The Auspicious Seal's die of the Magister:
   * slotted once it paid, unslotted and slotted again it did not. The dice are
   * gone from the game and the Seal is retired with them, so **no live row
   * carries an `onSlot` grant at all** — the machinery stays (`OrderSlotGrant`,
   * `PlayerStatecraft.grantedOnSlot`, the reducer's arm) because it is a shape
   * the deck may want again, and what is left to pin is that nothing fires it.
   */
  it('onSlot — no card in the deck carries a slot grant since the dice went', () => {
    for (const id of ORDER_IDS) {
      expect(orderDef(id).onSlot ?? [], id).toEqual([]);
    }
    const g = game();
    found(g.state, 0);
    keepTheRites(g.state);
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
    grant(sc, 'theAuspiciousSeal');
    const index = slotLayout(sc.government).indexOf('wildcard');
    expect(dispatch(g, {
      type: 'slotOrder', playerId: 0, cardId: 'theAuspiciousSeal', slotIndex: index,
    } as Command).ok).toBe(true);
    // The retired row still slots — a save that holds it keeps it — and the
    // once-flag stays empty, because there is no grant to pay.
    expect(sc.grantedOnSlot).toEqual([]);
  });

  it('offers Gov IV and Gov V at their rungs, and deals a Doctrine pool for each', () => {
    for (const tier of [29, 45]) {
      expect(governmentsAtTier(tier)).toHaveLength(3);
      expect(poolDoctrines(tier).length).toBeGreaterThanOrEqual(RULES.offers.doctrine);
      // **Every rung opens its own shelf** (the cards pass of 2026-09-05). Both
      // top rungs dealt Government III's pool until then, so adopting The Curia
      // or The Empire widened the council and offered nothing new to seat in it.
      for (const id of governmentsAtTier(tier)) {
        expect(poolOfGovernment(id)).toBe(tier === 29 ? 'governmentIV' : 'governmentV');
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
    bumpRevision(g.state);
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
    // The Æra III fork of 2026-09-05: each tier-18 government reads its own
    // dominant chair, so the signature moves when a card of its flavour is
    // slotted beside it.
    expect(said('merchantLeague')).toEqual([
      '+2 gold per economic Order you have in a slot',
      'trade routes pay +50% more',
      '+1 trade route',
    ]);
    expect(said('imperium')).toEqual([
      '+1 production per military Order you have in a slot',
      'all units: +1 movement',
      'capturing a city grants +50 gold',
      'capturing a city heals every one of your units',
    ]);
    expect(said('divineMandate')).toEqual([
      '+1 faith in your capital per wildcard Order you have in a slot',
      '+1 culture in your capital per wildcard Order you have in a slot',
      '+10% faith in every city of 6+',
    ]);

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
      // was struck from the doc's own deferred list on 2026-09-07 (batch E4a) —
      // there has been a Cathedral in the table since the buildings pass, so the
      // clause is an ordinary count and the row prints both halves.
      '+6 faith per Cathedral',
      'faith buildings supply science equal to their faith, in every city',
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

    // The user's card pass of 2026-09-03 cut the pact to one clause and the road
    // to the road — both cards print exactly what is left of them.
    expect(said('wolfMothersPact')).toEqual([
      'a barbarian you kill joins you at full health instead of dying',
    ]);
    expect(said('foundersRoad')).toEqual([
      'new cities are joined to your nearest city by road',
      '+1 culture in every city',
    ]);
    expect(said('gildedCourt')).toEqual([
      // The unlock clause carries the **building's own description** since the
      // playthrough note of 2026-09-05 — see `describeBuildingRow`, and the
      // charters' own block at the foot of this file.
      'unlocks the Gilded Hall — +6 gold, +2 culture; it is bought with gold and never built; ' +
        '+1 renown per turn, favouring merchants',
      // The 2026-09-02 rework: the writ dropped to one point and the card bought
      // a hex clause with the difference — the first `yields` condition, asked
      // of the breakdown the hex has already been reckoned to pay. The Æra III
      // fork (2026-09-05) dropped the writ altogether: two clauses, one identity.
      '+1 science, +1 culture on every hex that yields gold',
    ]);
    // The pillage heal was Scorched Earth's all along, and the balance pass of
    // 2026-08-31 gave the second half back to the doc's own sentence — which the
    // board cannot answer, so it is deferred rather than approximated.
    // The food half was **cut** on 2026-09-07 (batch E4a): the board keeps no
    // memory of a clearing, so the row prints the free axes and nothing else.
    expect(said('burningWay')).toEqual([
      'clearing a forest or jungle costs no worker charge',
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
    // The cards pass of 2026-09-05 rewrote this row: the Wayfarers' opener pays
    // for *looking* rather than for walking, so every unit sees one hex further
    // and every ruin claimed pays the realm.
    expect(said('farRunners')).toEqual([
      'all units: +1 sight',
      'claiming a ruin grants +10 culture',
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
      "+2 food in every city holding an improved luxury resource",
    ]);
    expect(said('saltTithes')).toEqual([
      "+3 gold per unique luxury",
    ]);
    expect(said('borderBallads')).toEqual([
      '+2 culture per barbarian camp you have found',
      'killing a barbarian unit grants +10 culture',
    ]);
    expect(said('silkRoads')).toEqual([
      "+5 gold on every trade route you send",
    ]);
    expect(said('festivalDays')).toEqual([
      "+4 happiness in your capital",
      "+2 culture in every city",
    ]);
    expect(said('ritesOfPassage')).toEqual(['completing a unit grants +10 faith']);
    // The Themes Build's rework (sheet 09, the user): the trickle replaces the
    // one-off laureate, and the five works are untouched.
    expect(said('theLaureate')).toEqual([
      "+2 renown per turn",
      "+3 science on every hex with an Academy",
      "+3 culture on every hex with a Landmark",
      "+3 production on every hex with a Manufactory",
      "+3 gold on every hex with a Customs House",
      "+3 production on every hex with a Citadel",
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
    bumpRevision(state);
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
    // Exact since batch X — a rebate is a yield line, not a price.
    expect(rebate[0]!.gold).toBe((gross * 30) / 100);
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
    bumpRevision(g.state);
    const rebate = explainUnitUpkeepRebate(g.state, 0);
    expect(rebate.reduce((sum, line) => sum + line.gold, 0)).toBe(gross);
  });

  it('The Curia pays science equal to what its faith buildings supply', () => {
    const g = game(307);
    const city = found(g.state, 0);
    govern(g.state, 0, 'theCuria');
    // Measured against the *same town under any other law*, so the shrine's own
    // science is on both sides of the comparison and what is left is the mirror.
    // The **flats**, not the staged figure: two laws are two writs, so the
    // empire stage differs between the two readings, and since batch X that
    // stage is no longer floored away (it used to be, which is the only reason
    // this comparison ever read as a bare addition).
    const under = (law: string): number => {
      govern(g.state, 0, law);
      return explainCity(g.state, city).flats.science;
    };
    // A granary is not a faith building: the clause reads the rows' own
    // category and their own faith, never the town's total.
    city.buildings.push('granary');
    bumpRevision(g.state);
    expect(under('theCuria')).toBe(under('chiefdom'));
    city.buildings.push('shrine');
    bumpRevision(g.state);
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
    expect(share.science).toBe((works.science * 50) / 100);
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
      buys: 'gold',
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

  it('The Academy sells a draft of scholars for faith, and moves no renown', () => {
    const g = game(321);
    found(g.state, 0);
    keepTheRites(g.state);
    const player = playerById(g.state, 0)!;
    player.faithPool = 10_000;
    // Under the opening law there is no such verb, and the two ladder purchases
    // are somebody else's law again — three purchases, three clauses.
    expect(greatPersonPurchaseError(g.state, 0, 'scholarDraft')).toContain('law does not let');
    player.statecraft.doctrines.push('theAcademyOfDeeds' as never);
    bumpRevision(g.state);
    expect(greatPersonPurchaseError(g.state, 0, 'scholarDraft')).toBeNull();
    expect(greatPersonPurchaseError(g.state, 0, 'faith')).toContain('law does not let');
    // And an id nobody sells is refused by name rather than by a cast.
    expect(greatPersonPurchaseError(g.state, 0, 'silver')).toContain('purchaseGreatPersonOffer needs');

    const price = greatPersonOfferPrice('scholarDraft');
    expect(price).toBe(RULES.greatPeople.scholarDraftFaith);
    const faith = player.faithPool;
    const renown = player.renownPool;
    const fed = { ...player.renownByFamily };
    const recruited = player.greatPeopleRecruited;
    expect(applyCommand(g.state, {
      type: 'purchaseGreatPersonOffer',
      playerId: 0,
      buys: 'scholarDraft',
    }).ok).toBe(true);

    // The faith bank pays, and **nothing on the ladder moves**: no renown
    // deducted, no threshold climbed, no family fed (the user, 2026-09-03:
    // "shouldn't scale the renown costs").
    expect(player.faithPool).toBe(faith - price);
    expect(player.gold).toBe(playerById(g.state, 1)!.gold);
    expect(player.renownPool).toBe(renown);
    expect(player.renownByFamily).toEqual(fed);
    expect(player.greatPeopleRecruited).toBe(recruited);

    // **A draft of scholars alone**, dealt where every other offer is dealt and
    // answered by the same command.
    const offer = player.greatPersonOffer!;
    expect(offer.options.length).toBeGreaterThan(0);
    for (const id of offer.options) expect(greatPersonDef(id).family).toBe('scholar');
    expect(greatPersonBlocker(player)).not.toBeNull();
    expect(g.state.units.some((u) => u.person !== undefined)).toBe(false);
    // One offer at a time, exactly as for the two ladder purchases.
    expect(greatPersonPurchaseError(g.state, 0, 'scholarDraft')).toContain('already has');
  });

  it('refuses a scholar draft nobody can pay for, byte-identically', () => {
    const g = game(323);
    found(g.state, 0);
    keepTheRites(g.state);
    const player = playerById(g.state, 0)!;
    player.statecraft.doctrines.push('theAcademyOfDeeds' as never);
    bumpRevision(g.state);
    player.faithPool = greatPersonOfferPrice('scholarDraft') - 1;
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, {
      type: 'purchaseGreatPersonOffer',
      playerId: 0,
      buys: 'scholarDraft',
    }).ok).toBe(false);
    // Not a roll of the rng spent, not a coin of faith: the gate only reads.
    expect(snapshotState(g.state)).toBe(before);

    // And the same when the family itself is spent — refused before the money,
    // which is the clause a narrowed draft needed of its own.
    player.faithPool = 10_000;
    for (const id of GREAT_PERSON_IDS) {
      if (greatPersonDef(id).family === 'scholar') g.state.recruited.push(id);
    }
    const spent = snapshotState(g.state);
    expect(greatPersonPurchaseError(g.state, 0, 'scholarDraft')).toContain('great scholar');
    expect(applyCommand(g.state, {
      type: 'purchaseGreatPersonOffer',
      playerId: 0,
      buys: 'scholarDraft',
    }).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(spent);
  });

  it('refuses the purchase to an empty treasury, byte-identically', () => {
    const g = game(319);
    found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'theCommonwealth' as never;
    bumpRevision(g.state);
    playerById(g.state, 0)!.gold = 0;
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, {
      type: 'purchaseGreatPersonOffer',
      playerId: 0,
      buys: 'gold',
    }).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });
});

describe('the doctrines’ deferred halves, built', () => {
  it('The Encyclopaedia hurries a science building and no other', () => {
    const g = game(331);
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('theEncyclopaedia' as never);
    bumpRevision(g.state);
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
    bumpRevision(g.state);
    expect(foldCardYields(explainCardEmpireYields(g.state, 0)).culture).toBe(0);
    // The claim register, which is where a wonder is written down once and
    // never moves — a rival's marvel counts exactly as your own does.
    g.state.wonders.push({ building: 'theOracle', playerId: 1, cityId: 0, turn: 1 });
    bumpRevision(g.state);
    expect(foldCardYields(explainCardEmpireYields(g.state, 0)).culture).toBe(1);
  });

  it('The Academy trades culture for science, both at the empire stage', () => {
    // The 2026-09-02 rework: the row kept its id and lost its Triumph doubling
    // outright, so nothing amplifies a Triumph's renown any more. What is left
    // is a plain bargain, and both halves are **empire**-stage percentages —
    // one sum, applied once, exactly as Entry XVII asks.
    const g = game(337);
    const city = found(g.state, 0);
    expect(explainCardPercentYields(g.state, city).some((l) => l.card === 'theAcademyOfDeeds')).toBe(false);
    playerById(g.state, 0)!.statecraft.doctrines.push('theAcademyOfDeeds' as never);
    bumpRevision(g.state);
    const lines = explainCardPercentYields(g.state, city).filter((l) => l.card === 'theAcademyOfDeeds');
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
    bumpRevision(g.state);

    // The user's card pass of 2026-09-03 narrowed the happiness half to the
    // towns of six or more, so a village pays nothing however open the gate is —
    // the scope and the condition are two separate refusals and both are pinned.
    expect(authorityOf(g.state, 0)).toBeGreaterThan(0);
    expect(city.population).toBeLessThan(6);
    expect(explainHappiness(g.state, 0).some((l) => l.source.includes('Bread'))).toBe(false);

    // A fresh empire has spare writ, so with a town big enough the gate is open
    // and the clause is a labelled line of the happiness fold rather than a
    // number added beside it.
    city.population = 6;
    bumpRevision(g.state);
    const open = explainHappiness(g.state, 0).filter((l) => l.source.includes('Bread'));
    expect(open.length).toBeGreaterThan(0);
    // Two, not three, since the cards pass of 2026-09-05 trimmed the strongest
    // early Doctrine.
    expect(foldMeter(open)).toBe(2 * g.state.cities.filter((c) => c.ownerId === 0).length);

    // Spend the writ past zero and the clause simply stops existing — a gate,
    // not a malus.
    for (let i = 0; i < 12; i++) {
      g.state.cities.push({ ...city, id: 700 + i, captured: true });
    }
    bumpRevision(g.state);
    expect(authorityOf(g.state, 0)).toBeLessThan(0);
    expect(explainHappiness(g.state, 0).some((l) => l.source.includes('Bread'))).toBe(false);

    // The gold half is unconditional and lands in every town's own breakdown.
    const gold = explainCardCityYields(g.state, city).find((l) => l.card === 'breadAndCircuses')!;
    expect(gold.gold).toBe(-2);
  });

  it('followingFaithPerTurn — Cuius Regio reads the faith of the towns that follow him', () => {
    // Replaced outright in the balance pass of 2026-09-02: the extra augur
    // charge is gone and the card is a **rate**, on Theocracy's precedent — 15%
    // of what the faithful towns bank, gained again as science, with the faith
    // itself untouched. The rate is a third reading of the calendar beside
    // `faithPerTurn` and `capitalFaithPerTurn`, so it earns a source of its own.
    const g = game(403);
    playerById(g.state, 0)!.statecraft.doctrines.push('cuiusRegio' as never);
    bumpRevision(g.state);
    const rate = (following: number): number =>
      foldCardYields(explainCardEmpireYields(g.state, 0, { followingFaithPerTurn: following })).science;
    // Below one helping it pays nothing, which is `helpings`' own reading and
    // not a clause of this card's.
    expect(rate(0)).toBe(0);
    expect(rate(19)).toBe(0);
    expect(rate(20)).toBe(3);
    expect(rate(60)).toBe(9);
    // Nothing else in the ledger moves: "converted" is read as *gained as*, so
    // the faith the towns banked is still theirs.
    expect(foldCardYields(explainCardEmpireYields(g.state, 0, { followingFaithPerTurn: 60 })).faith).toBe(0);
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
    slot(g.state, 0, 'clientKings');
    expect(cost()).toBe(base - 1);

    // A card that *sets* the price still composes with a shift — the set lands
    // first and the deltas ride on it — and the fold is floored at one: a free
    // conquest would make the meter free to whoever drafted twice. Hegemony is
    // the setter since the Æra III fork (2026-09-05).
    sc.doctrines.push('hegemony' as never);
    bumpRevision(g.state);
    expect(cost()).toBe(1);
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
    bumpRevision(g.state);
    const maps = lines().find((l) => l.source.includes('Master of Maps'));
    expect(maps?.value).toBe(-2);

    // And The Legion's point reaches the melee row and nothing else, through the
    // same shape with a class filter.
    player.statecraft.doctrines = [];
    bumpRevision(g.state);
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
      // The Æra III fork (2026-09-05) made this the Geomancy row: the eyes and
      // the legs stay, the strength stays as the trade, and what a surveyor
      // *finds* is now worth something.
      'surfacing a vein grants +25 science',
      'claiming a ruin grants +25 science',
      // Flat points on the one ledger (Entry XXXVII), where it used to be the
      // only percentage a card put on a strength.
      '-2 combat strength',
    ]);
    expect(said('theStandingLevy')).toEqual([
      'every 12 turns, the best melee unit you can build musters in your capital',
    ]);
    expect(said('theLegion')).toEqual([
      'melee units: +1 movement',
      '+1 combat strength for melee units',
      '+15% production toward melee units',
    ]);
    expect(said('breadAndCircuses')).toEqual([
      'while your authority is positive: +2 happiness in every city of 6+',
      '-2 gold in every city',
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
    // Moved to the second pool by the flag ruling of 2026-09-03 (the user:
    // "too strong in government 1").
    ['riverWardens', 'governmentII', 'economic'],
    ['theAlmanac', 'governmentI', 'wildcard'],
    ['villageFairs', 'governmentI', 'wildcard'],
    ['theMusterRoll', 'governmentI', 'military'],
    ['hillForts', 'governmentI', 'military'],
    ['thePilgrimsPurse', 'governmentI', 'wildcard'],
    ['charterTowns', 'governmentI', 'economic'],
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

  /** The row that ships inert — a design decision, written on the row. The
   * Bronze Mirror was deleted outright on 2026-09-03 (user: "remove the
   * bronze mirror from the game") — never offered, so no save can hold it.
   *
   * The Wolf-Standard joined it on 2026-09-05 for the same reason: a camp's
   * bounty reaches the treasury and the nearest town, and no scope on a
   * windfall payout can spread one across every city. */
  const RETIRED: readonly string[] = ['sanctuary', 'theWolfStandard'];

  it('seats every new row in its ratified pool and slot', () => {
    for (const [id, pool, slotType] of ADDED) {
      const def = orderDef(id);
      expect(def.pool, id).toBe(pool);
      expect(def.slot, id).toBe(slotType);
      expect(def.flavor, id).toBeTruthy();
      expect(def.text, id).toBeTruthy();
      // And a rarity, since the ruling of 2026-09-04: every row carries one,
      // taken from the worksheet's mark (`statecraftDocSync.test.ts` pins the
      // two together), because it is what the draw weighs the bag by.
      expect(['common', 'uncommon', 'rare'], id).toContain(def.rarity);
    }
  });

  it('keeps the deferred rows out of every pool sweep', () => {
    for (const id of RETIRED) {
      const def = orderDef(id as never);
      expect(def.retired, id).toBe(true);
      expect(def.effects, id).toEqual([]);
      // **No `deferred` any more** (batch E4a): both clauses were *cut* rather
      // than left labelled, which is what a withdrawn row with nothing built
      // means — the note says the row is out of the draw and why, and a promise
      // nobody intends to keep is not printed beside it.
      expect(def.deferred, id).toBeUndefined();
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
      explainCardCityYields(g.state, city).filter((l) => l.card === 'hearthSongs').length;
    // Inclusive at the threshold, exactly as `populationAtLeast` is. The figure
    // doubled in the user's card pass of 2026-09-03; the scope did not move.
    city.population = 4;
    expect(paid()).toBe(1);
    expect(foldCardYields(explainCardCityYields(g.state, city)).culture).toBe(2);
    city.population = 5;
    expect(paid()).toBe(0);
  });

  it('adjacentImprovement — The Pilgrim’s Purse pays the town next door to the shrine', () => {
    const g = game(802);
    const city = found(g.state, 0);
    slot(g.state, 0, 'thePilgrimsPurse');
    const faith = (): number => foldCardYields(explainCardCityYields(g.state, city)).faith;
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
    // Not the capital: the capital rides free and would hide the clause. And
    // not a hex on the shore either — the harbour outranks the fort by design
    // (`cityCosts`' ladder of returns), so a coastal hill town is priced as a
    // port and this card's line never prints. Asked of the ground rather than
    // assumed of a seed since the pangaea of 2026-09-03 put water beside most
    // of the opening ring.
    const hill = ownedTiles(g.state, city).find(
      (t) => (t.col !== city.col || t.row !== city.row) && !isCoastal(g.state.map, t),
    )!;
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
      (t) =>
        t.hills &&
        (t.col !== second.col || t.row !== second.row) &&
        !isCoastal(g.state.map, t),
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
    bumpRevision(g.state);
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
    for (const kind of ['unitStamp', 'rule', 'routeRider'] as CardEffectKind[]) {
      expect(used.has(kind), kind).toBe(true);
    }
  });

  it('prints every new row in the words the user ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('fireKeepers')).toEqual([
      "+1 faith in your capital per 2 population in your capital",
    ]);
    expect(said('wolfRunners')).toEqual([
      'scouts: +1 movement',
      'claiming a ruin grants +15 gold',
    ]);
    expect(said('hearthSongs')).toEqual(['+2 culture in every city of 4 or less']);
    expect(said('statuteLabour')).toEqual(['+1 production per 4 population in this city']);
    expect(said('riverWardens')).toEqual([
      // The garrison clause came off in the cards pass of 2026-09-05: a hidden
      // tax on a Ploughshare card, where the plain line is the line's floor.
      '+1 food on every hex with a Farm beside fresh water',
    ]);
    expect(said('theAlmanac')).toEqual([
      "+2 science in your capital",
      "+2 science in every city with a Library",
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
      "+3 culture in every city with a Temple",
      "+1 happiness in every city with a Temple",
    ]);
    // 2026-08-31: the ratified text asks for a mountain *inside the borders*,
    // which is a different question from one in the ring of six.
    expect(said('starGazers')).toEqual([
      "+15% science in every city with a mountain hex inside its borders",
    ]);
    expect(said('cisternWorks')).toEqual([
      "every city of yours counts as being on fresh water",
    ]);
    expect(said('ledgerKeepers')).toEqual([
      "+1 science, +1 culture on every trade route sent from every city with a Market",
      "+1 trade route",
    ]);
    expect(said('drumsOfWar')).toEqual(['newly created units gain +2 combat strength']);
    expect(said('theCartographers')).toEqual(['+1 science per 40 hexes you have revealed']);
    expect(said('theMasonsLodge')).toEqual([
      '+10% production toward buildings, in every city of 6+',
    ]);
    // "heals 15", not "heals a further 15": a kill pays no heal of its own, and
    // an increment on a number that does not exist is a card promising nothing.
    expect(said('theOathBound')).toEqual(['killing a unit heals 15']);
    // The withdrawn row says nothing at all: batch E4a cut the clause rather
    // than leaving it labelled, so there is no promise left to print.
    expect(said('sanctuary')).toEqual([]);
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
  it('unimproved + anyFeature — The Unbroken Land pays the standing woods and nothing else', () => {
    // The card paid on **every** bare hex until the nerf batch of 2026-09-03
    // narrowed it to the two wooded ones, which is `anyFeature` composed under
    // `all` with `unimproved`. Both halves are pinned here: the list decides
    // *which ground*, and `unimproved` still decides *whether anything stands
    // on it*.
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const paid = (): { food: number; production: number } => {
      const lines = explainTileYield(tile, yieldContextFor(g.state, 0)).filter(
        (entry) => entry.source === 'Order · The Unbroken Land',
      );
      // Rule 5: a fold of the list, never a figure computed beside it.
      return {
        food: lines.reduce((sum, entry) => sum + (entry.food ?? 0), 0),
        production: lines.reduce((sum, entry) => sum + (entry.production ?? 0), 0),
      };
    };
    slot(g.state, 0, 'theUnbrokenLand');
    tile.terrain = 'grassland';
    // Bare ground is no longer enough — the canopy is what the card is about.
    tile.feature = 'none';
    expect(paid()).toEqual({ food: 0, production: 0 });
    for (const feature of ['forest', 'jungle'] as const) {
      tile.feature = feature;
      expect(paid(), feature).toEqual({ food: 1, production: 1 });
    }
    // **Presence is the state**: build anything at all and the ladder stops
    // paying for the hex, which is the whole bargain the 🌿 cards strike.
    tile.feature = 'forest';
    tile.improvement = 'lumbermill';
    expect(paid()).toEqual({ food: 0, production: 0 });
  });

  it('connected — the road home is what Satrapies makes a town content about', () => {
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
        entry.source.startsWith('Technology · Satrapies'),
      );
      return line?.value ?? 0;
    };
    expect(cheer()).toBe(0);
    playerById(g.state, 0)!.techsResearched.push('theImperialPost');
    bumpRevision(g.state);
    expect(cheer()).toBe(1);
    // **Satrapies is the only node that cheers a joined town** since batch E:
    // Movable Type used to say the same sentence a second time and now says a
    // different one entirely (`docs/history/tech-gifts.md` §7 — the cheer out, two
    // percentages in), so the scope has one reader on the tree and the stacking
    // the worksheet once ruled deliberate has nothing to stack with.
    playerById(g.state, 0)!.techsResearched.push('movableType');
    bumpRevision(g.state);
    const cheering = explainHappiness(g.state, 0).filter((entry) =>
      /Technology · (Satrapies|Movable Type)/.test(entry.source),
    );
    expect(cheering.map((entry) => entry.value)).toEqual([1]);
    // What Movable Type says instead, read off the same scope: a share of what a
    // joined town learns and builds, and nothing at all in the capital the road
    // is measured from.
    const shares = (city: City): { yield: string; percent: number }[] =>
      cityYieldPercents(g.state, city)
        .filter((line) => line.source.startsWith('Technology · Movable Type'))
        .map((line) => ({ yield: line.yield, percent: line.percent }));
    expect(shares(second)).toEqual([
      { yield: 'science', percent: 10 },
      { yield: 'production', percent: 10 },
    ]);
    expect(shares(capital)).toEqual([]);
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
    // The science follows the scope, through the ordinary fold. Batch F made
    // the star-gazers a **share** rather than a flat (`docs/balance-turn.md` §3),
    // so the line joins Entry XVII's city stage instead of the flats — which is
    // where the claim about the scope now has to be read.
    const share = (): number =>
      explainCardPercentYields(g.state, city)
        .filter((line) => line.card === 'starGazers')
        .reduce((sum, line) => sum + line.percent, 0);
    slot(g.state, 0, 'starGazers');
    expect(share()).toBe(15);
    // And a mountain the borders have **not** taken in pays nothing: the scope
    // is about what a town owns, which is what makes it different from the ring
    // of six `mountainAdjacent` asks about.
    mine.terrain = was;
    const far = g.state.map.tiles.find(
      (tile) => g.state.tileOwner[tile.row * g.state.map.width + tile.col] === null,
    )!;
    far.terrain = 'mountain';
    expect(cityScopeAdmits(g.state, city, scope)).toBe(false);
    expect(share()).toBe(0);
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

  it('freeCitizens — The Scattered Hearths waives the first two of every town', () => {
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
    bumpRevision(g.state);
    const after = demandLine();
    // The label says who is being charged, because a line reading "5 citizens"
    // beside a cost for three is a ledger nobody can check. Two free rather
    // than three since the cards pass of 2026-09-05.
    expect(after.source).toContain('3 of 5 citizens');
    expect(after.value).toBeCloseTo((before.value * 3) / 5, 6);
    // A town of two or fewer asks for nothing at all.
    city.population = 2;
    expect(demandLine().value).toBeCloseTo(0, 9);
  });

  it('fromRate — The Lyceum pays a whole turn of culture, composed once', () => {
    const g = game();
    const city = found(g.state, 0);
    // Something that actually sings, so the rate is not zero and the grant is
    // not dropped as an empty line.
    city.buildings.push('monument');
    bumpRevision(g.state);
    slot(g.state, 0, 'theLyceum');
    const rate = foldEmpireRates(g.state, 0).culturePerTurn ?? 0;
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
    g.state.players[0]!.statecraft.orders = ['theLyceum'];
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
    ]);
    // Re-aimed by the synergy pass of 2026-09-05: the row reads the council's
    // wildcards now, and the reader is the card's second clause.
    expect(said('firstRites')).toEqual([
      '+1 faith in your capital',
      '+1 faith per wildcard Order you have in a slot',
    ]);
    expect(said('waysideShrines')).toEqual([
      "+1 faith in your capital per city you hold",
    ]);
    expect(said('commonGranary')).toEqual([
      "+2 food in every city holding an improved luxury resource",
    ]);
    expect(said('theOrchardTithe')).toEqual([
      "+2 food on every hex carrying a luxury resource",
    ]);
    // The ground half is unmoved; the synergy pass of 2026-09-05 hung the
    // Forge Levy's reader beside it, in the capital because a tile line's bag
    // is a printed number and cannot itself count a council.
    expect(said('oreTithes')).toEqual([
      "+2 production on every hex carrying a strategic resource",
      "+2 production in your capital per military Order you have in a slot",
    ]);
    expect(said('terracedHillsides')).toEqual([
      "+2 food on every hill hex",
    ]);
    expect(said('pilgrimRoads')).toEqual([
      "+1 faith per population in your capital",
      "+1 happiness per 50 banked faith (at most +5 happiness)",
    ]);
    expect(said('theLyceum')).toEqual([
      'completing a technology grants an extra turn of culture',
    ]);
    expect(said('censusRolls')).toEqual([
      '+1 happiness per 2 population in your capital',
    ]);
    expect(said('theUnbrokenLand')).toEqual([
      '+1 food, +1 production on every unimproved forest or jungle hex',
    ]);
    // Retired 2026-09-03 and still fully readable — the row stays for the saves
    // that hold it, and it goes on saying what it does.
    expect(said('theGreenwoodLaw')).toEqual([
      '+2 food, +2 production on every unimproved hex',
    ]);
    expect(said('theQuietFields')).toEqual([
      '+1 happiness per unimproved hex worked here',
    ]);
    expect(said('firstFruits')).toEqual([
      "+2 food on every hex carrying a resource",
    ]);
    expect(said('theOldWays')).toEqual([
      // Built 2026-09-02 (the user: "this is the payoff card"): a percentage on
      // the hex's **own ground** rather than on its works, computed off the
      // breakdown the tile chain already has — rule 5 at the scale of a hex.
      'the ground of every unimproved hex pays double',
    ]);
    expect(said('theGentleYoke')).toEqual([
      // Softened from -20% by the user's card pass of 2026-09-03; the writ half
      // was not touched.
      '-15% happiness demanded per citizen',
      // Back to 2 by the flag ruling of 2026-09-03: the ratified card asks it of
      // every *new* city, and a town remembers no founding turn. Batch E4a
      // **cut** that clause rather than going on promising it, so the reading
      // asked of every city is the whole card now and the note says so.
      '-2 authority capacity per city you hold',
    ]);
    expect(said('theScatteredHearths')).toEqual([
      'the citizens in every city who demand no happiness rises by 2',
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
    // One line per voice, and each of them the row's own share — the
    // `yield: 'all'` expansion, not six cards. Batch F raised it to fifteen.
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.percent).toBe(15);
    // A second work beside the same town is the same boolean.
    ring[1]!.improvement = 'landmark';
    for (const line of cityYieldPercents(g.state, city).filter((l) =>
      l.source.includes("The Master's Presence"),
    )) {
      expect(line.percent).toBe(15);
    }
  });

  it('queueHolds — The Wonder-Feasts feed the town with the scaffolding up', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'theWonderFeasts');
    const fed = (): number =>
      foldCardYields(explainCardCityYields(g.state, city).filter((l) => l.source.includes('Wonder-Feasts')))
        .food;
    expect(fed()).toBe(0);
    city.queue = [{ kind: 'building', id: 'stonehenge' }];
    expect(fed()).toBe(4);
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
    ).toBe(20);
  });

  it('productionBonus class — The Dry Docks say "ships", which no silhouette can', () => {
    const g = game();
    const city = found(g.state, 0);
    slot(g.state, 0, 'theDryDocks');
    // No harbour, no docks: the scope is the ordinary one.
    expect(cardProduction(g.state, city, 'unit', 'trireme')).toEqual([]);
    city.buildings.push('harbour');
    bumpRevision(g.state);
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
    const paid = explainCardEmpireYields(g.state, 0).find((line) => line.source.includes('The Last Hunt'));
    expect(paid?.culture).toBe(4);
    player.campsCleared = 4;
    expect(
      explainCardEmpireYields(g.state, 0).find((line) => line.source.includes('The Last Hunt'))?.culture,
    ).toBe(16);
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

  it('slottedOrders and unslottedOrders — the council read from both ends', () => {
    const g = game();
    found(g.state, 0);
    const sc = playerById(g.state, 0)!.statecraft;
    // Two on the shelf and nothing in a chair yet.
    grant(sc, 'theArchives');
    grant(sc, 'theAnnalsOfLaw');
    grant(sc, 'firstRites');
    const culture = (name: string): number =>
      explainCardEmpireYields(g.state, 0)
        .filter((line) => line.source.includes(name))
        .reduce((sum, line) => sum + line.culture, 0);
    // Nothing is slotted, so neither card is live at all.
    expect(culture('The Archives')).toBe(0);

    sc.slots.push({ card: 'theArchives', sealedUntil: g.state.turn });
    bumpRevision(g.state);
    // One chair: the Archives pay for themselves and nothing else.
    expect(culture('The Archives')).toBe(2);
    // Two left on the shelf, at two culture apiece — and the Annals must be
    // slotted to say so, which is what makes the card a decision.
    sc.slots.push({ card: 'theAnnalsOfLaw', sealedUntil: g.state.turn });
    bumpRevision(g.state);
    // Batch F: three culture a bench card, two a chair.
    expect(culture('The Annals of Law')).toBe(3);
    expect(culture('The Archives')).toBe(4);
    // **A third law moves the count** (the levelless re-cut of 2026-09-04). It
    // asked for levels until the ruling emptied the word, and what it asks now
    // is what its own sentence says: one culture for each Order in a slot.
    grant(sc, 'firstFruitsOffering');
    sc.slots.push({ card: 'firstFruitsOffering', sealedUntil: g.state.turn });
    bumpRevision(g.state);
    expect(culture('The Archives')).toBe(6);
    // And a card taken back out of its chair stops being counted.
    sc.slots.pop();
    expect(culture('The Archives')).toBe(4);
  });

  it('renown — The Laureate is a trickle now, and it joins the ledger it pays into', () => {
    const g = game();
    found(g.state, 0);
    expect(cardRenownLines(g.state, 0).some((l) => l.source.includes('The Laureate'))).toBe(false);
    slot(g.state, 0, 'theLaureate');
    const line = cardRenownLines(g.state, 0).find((l) => l.source.includes('The Laureate'));
    expect(line?.amount).toBe(2);
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
      'slottedOrders',
      'unslottedOrders',
      'clearedCamps',
    ]) {
      expect(counts.has(count), count).toBe(true);
    }
    expect(wheres.has('foreignTerritory')).toBe(true);
    expect(filtered).toBe(true);
    // The slot grant that is not an effect at all went with the dice (schema
    // 71): the shape stands and no live row asks for it.
  });

  it('prints every new row in the words the sheets ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theQuartermasters')).toEqual([
      'military units cost 1 less gold in maintenance',
    ]);
    expect(said('theWarChest')).toEqual([
      "military units cost 2 less gold in maintenance",
    ]);
    expect(said('forcedMarches')).toEqual([
      'melee units: +1 movement',
      'melee units: +1 movement inside your territory',
    ]);
    expect(said('theEscortedRoads')).toEqual(['trade routes pay +30% more']);
    // Raised by the card-shapes pass of 2026-09-04: the Wild Hunt's counter
    // card now pays like the payoff it always was, in both voices.
    expect(said('theLastHunt')).toEqual([
      "+4 culture per barbarian camp you have cleared",
      "+4 science per barbarian camp you have cleared",
    ]);
    expect(said('theSaintsFields')).toEqual([
      "+3 faith on every hex carrying a great person's work",
    ]);
    expect(said('theWayhouses')).toEqual([
      "+1 gold per trade route you run",
      "+3 culture per trade route you run",
    ]);
    expect(said('theProvisioners')).toEqual([
      '+1 happiness per trade route between your own cities',
    ]);
    expect(said('thePrizeGrounds')).toEqual([
      '+2 happiness in every city settled on a luxury resource',
    ]);
    expect(said('theCensusEternal')).toEqual([
      "+1 science per 2 population",
    ]);
    expect(said('theGroundskeepers')).toEqual([
      "+2 food, +2 production on every hex carrying a great person's work",
    ]);
    expect(said('theMastersPresence')).toEqual([
      "+15% all yields in every city beside a great person's work",
    ]);
    expect(said('theWonderFeasts')).toEqual([
      "+4 food in every city while it is building a wonder",
      "+20% production toward wonders",
    ]);
    expect(said('theMasterBuilders')).toEqual([
      "+25% production toward The Magnum Opus",
      "+25% production toward Cathedrals",
    ]);
    expect(said('theShipwrightShores')).toEqual([
      "+3 production in every coastal city",
      "+30% production toward ships, in every coastal city",
    ]);
    // Withdrawn on 2026-09-07 (the user: *remove, boring*), and its unbuilt
    // half cut with it — a row nobody will be dealt promises nothing.
    expect(said('theDryDocks')).toEqual([
      '+25% production toward ships, in every city with a Harbour',
    ]);
    expect(said('theWinteringGrounds')).toEqual([
      'all units cost no gold in maintenance outside your territory',
    ]);
    expect(said('theArchives')).toEqual([
      "+2 culture per Order you have placed in a slot",
    ]);
    expect(said('theAnnalsOfLaw')).toEqual([
      "+3 culture per Order you hold but have not placed in a slot",
    ]);
    // The Auspicious Seal's line went with the dice (schema 71): the row is
    // retired, its face says nothing the game still does, and `describeCard`
    // prints no clause for it.
    expect(said('theAuspiciousSeal')).toEqual([]);
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
    expect(explainCardCityYields(g.state, city).some((l) => l.card === 'quarrymensGuild')).toBe(false);
    // A quarry **inside the borders** — the sweep `terrainInBorders` takes,
    // asked of what has been built rather than of the ground. The centre's own
    // hex is the town's, so it is the one hex a test can be sure of.
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    tile.improvement = 'quarry';
    const line = explainCardCityYields(g.state, city).find((l) => l.card === 'quarrymensGuild')!;
    expect(line.production).toBe(4);
  });

  it('garrisoned — the scope still reads the pieces, and River Wardens no longer asks', () => {
    const g = game(903);
    const city = found(g.state, 0);
    // Clear the seat's opening pieces off the centre so the town is empty.
    g.state.units = g.state.units.filter((u) => u.col !== city.col || u.row !== city.row);
    // **The scope's own arm**, asked directly. It is carried by no live row
    // since the cards pass of 2026-09-05 took the garrison clause off River
    // Wardens (a hidden tax on a Ploughshare card), and it is held exactly as
    // `behaviorRule`'s two unclaimed rules are: the evaluator goes on
    // answering, so a card that wants a garrison again is a JSON row.
    const admits = (): boolean => cityScopeAdmits(g.state, city, { test: 'garrisoned' });
    expect(admits()).toBe(false);
    // A civilian is not a garrison — the scope reads the same sweep the
    // `garrison` count reads, and that one counts combatants.
    createUnit(g.state, 0, 'settler', city.col, city.row);
    expect(admits()).toBe(false);
    createUnit(g.state, 0, 'warrior', city.col, city.row);
    expect(admits()).toBe(true);
    // And the row itself is an **unscoped** ground line now, so it is read by
    // the empire-wide pass rather than by the one that resolves a town.
    g.state.units = g.state.units.filter((u) => u.col !== city.col || u.row !== city.row);
    slot(g.state, 0, 'riverWardens');
    expect(
      scopedCardTileLines(g.state, city).some((line) => line.source.includes('River Wardens')),
    ).toBe(false);
    expect(
      cardTileLines(g.state, 0).some((line) => line.source.includes('River Wardens')),
    ).toBe(true);
  });

  it('yields — The Gilded Court reads what the hex has been reckoned to pay', () => {
    const g = game(904);
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('gildedCourt' as never);
    bumpRevision(g.state);
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

    const bare = foldTileLines(explainTileYield(tile, yieldContextFor(g.state, 0)));
    slot(g.state, 0, 'theOldWays');
    const lines = explainTileYield(tile, yieldContextFor(g.state, 0));
    const doubled = foldTileLines(lines);
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
    // Border Wardens' flat half fell to +1 when the synergy pass of 2026-09-05
    // gave it a second, scaled line and folded Vanguard into it — a lone
    // Wardens is still the +2 this pass ratified. Vanguard's own row is
    // retired and keeps the number it was set to here.
    expect(amountOf('borderWardens')).toBe(1);
    expect(amountOf('vanguard')).toBe(2);
    expect(amountOf('siegeDoctrine')).toBe(4);
    expect(said('weightsAndMeasures')).toEqual(['+1 gold in every city']);
    expect(said('theTaxFarm')).toEqual([
      "+1 gold per 3 population",
    ]);
    expect(said('publicGranaries')).toEqual(['+15% of the stored food kept when a city grows']);
    expect(said('masterMasons')).toEqual([
      "completing a building grants +25 culture",
    ]);
    expect(said('theSaltRoad')).toEqual(['+1 gold on every hex carrying a strategic resource']);
    expect(said('spoilsOfTheWild')).toEqual(['clearing a barbarian camp pays +100%']);
    // Foreign Quarters is withdrawn and The Great Warring Tribes changed pool.
    expect(orderDef('foreignQuarters').retired).toBe(true);
    expect(doctrineDef('greatWarringTribes').tier).toBe(10);
    expect(doctrineDef('theAcademyOfDeeds').name).toBe('The Academy');
  });
});

// --- the playtest nerf batch of 2026-09-03 ----------------------------------

/**
 * The three rulings of the turn-75 playtest report (`docs/flags.md`, "Playtest
 * nerf batch"): two cards withdrawn and one narrowed.
 *
 * Same discipline as the passes above — a behavioural test per thing changed,
 * plus the member register, because the kind-level register cannot see a
 * `TileCondition` value: `anyFeature` is a *value inside* `tileYield`, a shape
 * that register already counts, so a list nobody wrote onto a row would be a
 * switch arm nothing reaches.
 */
describe('the playtest nerf batch of 2026-09-03', () => {
  it('retires The Greenwood Law from the Government II pool while keeping the row readable', () => {
    expect(orderDef('theGreenwoodLaw').retired).toBe(true);
    expect(orderDef('theGreenwoodLaw').note).toBeTruthy();
    for (const pool of ORDER_POOLS) expect(poolOrders(pool)).not.toContain('theGreenwoodLaw');
    // Still a card: a save that holds it slotted still replays, and it still
    // pays what it says.
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    tile.improvement = undefined;
    slot(g.state, 0, 'theGreenwoodLaw');
    const line = explainTileYield(tile, yieldContextFor(g.state, 0)).find(
      (entry) => entry.source === 'Order · The Greenwood Law',
    );
    expect(line?.food).toBe(2);
    expect(line?.production).toBe(2);
  });

  it('retires Athenaeum of the Road — the first Doctrine ever withdrawn', () => {
    expect(doctrineDef('athenaeumOfTheRoad').retired).toBe(true);
    expect(doctrineDef('athenaeumOfTheRoad').note).toBeTruthy();
    for (const tier of GOVERNMENT_TIERS) {
      expect(poolDoctrines(tier), `tier ${tier}`).not.toContain('athenaeumOfTheRoad');
    }
    // The sharp reading: hold every *other* Doctrine of its tier and the draft
    // has nothing left to deal. Were `poolDoctrines` still dealing the retired
    // row, this offer would be exactly one card long.
    const g = game();
    const player = playerById(g.state, 0)!;
    const tier = doctrineDef('athenaeumOfTheRoad').tier;
    player.statecraft.doctrines = DOCTRINE_IDS.filter(
      (id) => doctrineDef(id).tier === tier && id !== 'athenaeumOfTheRoad',
    );
    bumpRevision(g.state);
    expect(drawDoctrineOffer(g.state, player, tier).options).toEqual([]);
    // Still a card, and still says what it does — a save that adopted it
    // replays, and `anyCardDef` never meets an id it does not know.
    expect(describeCard('athenaeumOfTheRoad').map((clause) => stripRefs(clause.text))).toEqual([
      'a ruin you claim pays every option instead of one',
    ]);
  });

  it('reads the anyFeature list from a live row, and prints it in the card’s own words', () => {
    // The member register, narrowed to what this pass declared.
    const rows = [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS].map((id) => cardDef(id));
    expect(JSON.stringify(rows)).toContain('"test":"anyFeature"');
    // The describer says "or", because the list is alternatives — two adjectives
    // side by side would have read as both at once.
    expect(tileConditionWords({ test: 'anyFeature', features: ['forest', 'jungle'] })).toBe(
      'forest or jungle hex',
    );
    expect(
      tileConditionWords({
        test: 'all',
        of: [{ test: 'unimproved' }, { test: 'anyFeature', features: ['forest', 'jungle'] }],
      }),
    ).toBe('unimproved forest or jungle hex');
  });

  it('answers anyFeature off the hex’s own feature, and nothing else', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const woods: TileCondition = { test: 'anyFeature', features: ['forest', 'jungle'] };
    for (const feature of ['forest', 'jungle'] as const) {
      tile.feature = feature;
      expect(tileConditionHolds(tile, woods), feature).toBe(true);
    }
    for (const feature of ['none', 'oasis', 'floodplain'] as const) {
      tile.feature = feature;
      expect(tileConditionHolds(tile, woods), feature).toBe(false);
    }
    // An empty list admits nothing — a row that names no ground pays on none of
    // it, which is the reading that keeps a typo silent rather than universal.
    tile.feature = 'forest';
    expect(tileConditionHolds(tile, { test: 'anyFeature', features: [] })).toBe(false);
  });
});

// --- the draw, after the 9/3 ruling -----------------------------------------

/**
 * The two halves of the 2026-09-03 draft ruling: the pool is the current
 * government's alone, and a hand of three or more shows one of each slot type.
 *
 * Both are claims about a *generator*, so every one of these sweeps rather than
 * draws once — a spread rule that holds on the first hand and not the fortieth
 * is the failure worth catching, and the deals are cheap.
 */
describe('the Order draft', () => {
  /** Forty consecutive drafts from one game, which is one generator walked. */
  function drafts(g: ReturnType<typeof game>, count = 40): OrderId[][] {
    const player = g.state.players[0]!;
    const hands: OrderId[][] = [];
    for (let i = 0; i < count; i++) hands.push(drawOrderOffer(g.state, player).options);
    return hands;
  }

  it('deals the current government’s pool and nothing behind it', () => {
    for (const seed of [7, 11, 23, 41, 97]) {
      const g = game(seed);
      const player = g.state.players[0]!;
      player.statecraft.government = 'republic';
      bumpRevision(g.state);
      expect(poolOfGovernment(player.statecraft.government)).toBe('governmentII');
      for (const hand of drafts(g)) {
        for (const id of hand) expect(orderDef(id).pool, `${seed} ${id}`).toBe('governmentII');
      }
    }
  });

  it('shows one of every slot type in a hand of three', () => {
    // Every pool in the data stocks all three types, so the guarantee is
    // reachable from every government — which is why an unreachable one is
    // asserted here rather than assumed.
    for (const pool of ORDER_POOLS) {
      for (const type of SLOT_TYPES) {
        expect(poolOrders(pool).some((id) => orderDef(id).slot === type), `${pool} ${type}`).toBe(
          true,
        );
      }
    }
    for (const seed of [3, 13, 29, 53]) {
      for (const government of ['chiefdom', 'republic'] as const) {
        const g = game(seed);
        const player = g.state.players[0]!;
        player.statecraft.government = government;
        bumpRevision(g.state);
        for (const hand of drafts(g)) {
          expect(hand, `${seed} ${government}`).toHaveLength(3);
          const types = new Set(hand.map((id) => orderDef(id).slot));
          for (const type of SLOT_TYPES) {
            expect(types.has(type), `${seed} ${government} ${type} in ${hand.join()}`).toBe(true);
          }
        }
      }
    }
  });

  it('deals a legal hand from a pool with no military left in it', () => {
    const g = game(59);
    const player = g.state.players[0]!;
    const sc = player.statecraft;
    // Hold every military card the chiefdom has: the military sub-bag is empty,
    // the slot deals nothing and falls through to the open fill. A hand is still
    // three cards — an empty sub-bag is not a shorter hand.
    for (const id of poolOrders('chiefdom')) {
      if (orderDef(id).slot === 'military') grant(sc, id);
    }
    expect(livePool(sc).some((id) => orderDef(id).slot === 'military')).toBe(false);
    for (const hand of drafts(g, 20)) {
      expect(hand).toHaveLength(3);
      expect(new Set(hand).size).toBe(3);
      for (const id of hand) expect(orderDef(id).slot).not.toBe('military');
      const types = new Set(hand.map((id) => orderDef(id).slot));
      expect(types.has('economic')).toBe(true);
      expect(types.has('wildcard')).toBe(true);
    }
  });

  it('hands the cards back in the pool’s own file order, with no slot seam', () => {
    // The guaranteed picks are drawn military-economic-wildcard; a hand that
    // came back in draw order would read as a rule about which face is best.
    const g = game(67);
    const player = g.state.players[0]!;
    for (const hand of drafts(g, 20)) {
      const pool = livePool(player.statecraft);
      expect(hand).toEqual(pool.filter((id) => hand.includes(id)));
    }
  });

  it('deals the same forty hands from the same generator state', () => {
    for (const seed of [7, 31]) {
      expect(drafts(game(seed))).toEqual(drafts(game(seed)));
    }
  });

  it('keeps the plain uniform draw for a hand narrower than the spread', () => {
    // Nothing trims a draft today, so this is the rule stating its own
    // precondition: below three cards the guarantee cannot be honoured and the
    // draw is the old one, over the same pool.
    const g = game(71);
    const player = g.state.players[0]!;
    const pool = livePool(player.statecraft);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const hand = drawOrderOptions(g.state, pool, 2);
      expect(hand).toHaveLength(2);
      expect(hand).toEqual(pool.filter((id) => hand.includes(id)));
      seen.add(hand.map((id) => orderDef(id).slot).join('+'));
    }
    // A two-card hand is free to be two of a kind — the proof the guarantee is
    // off below three rather than quietly half-applied.
    expect([...seen].some((pair) => pair.split('+')[0] === pair.split('+')[1])).toBe(true);
  });
});

// --- the user's card pass of 2026-09-03 -------------------------------------

/**
 * The rows the user rewrote by hand in `docs/orders-and-doctrines.md`, and the
 * two shapes they needed: `yieldConversion` (a share of one voice a town makes,
 * paid again as another) and `CardWindfallRiderEffect.atPopulation` (a growth
 * narrowed to the citizen it was).
 *
 * One behavioural test per new shape, carried to the ledger it lands in — the
 * file's own claim, and the only kind of test that catches a shape declared and
 * never read. The rows whose *numbers* moved are pinned where their own passes
 * pinned them; what is here is what this pass could not check anywhere else.
 */
describe("the user's card pass of 2026-09-03", () => {
  /** Makes the hex beside a town open water, which is all "coastal" asks. */
  function putToSea(state: GameState, city: { col: number; row: number }): void {
    getTileAt(state.map, city.col + 1, city.row)!.terrain = 'coast';
    bumpRevision(state);
  }

  /**
   * A town with a harvest worth a tenth of: farms on its own ground, a granary,
   * and citizens enough to work them, grown the way the turn pipeline grows one
   * so the hexes are assigned rather than written.
   */
  function farmTown(state: GameState, city: City, size = 9): void {
    for (const tile of ownedTiles(state, city)) {
      if (tile.col === city.col && tile.row === city.row) continue;
      tile.improvement = 'farm';
    }
    city.buildings.push('granary');
    while (city.population < size) {
      city.foodBasket = growthThreshold(city.population) + 5;
      if (!settleGrowthWindfall(state, city)) break;
    }
    bumpRevision(state);
  }

  it('yieldConversion — Thalassocracy mints a tenth of what a coastal town grows', () => {
    const g = game(901);
    const city = found(g.state, 0);
    putToSea(g.state, city);
    farmTown(g.state, city);
    const player = playerById(g.state, 0)!;

    // Silent until the card is held, and then one **labelled** line: rule 5 at
    // the town, with both voices in the label so the coin says where it came
    // from.
    const flats = explainCity(g.state, city).flats;
    expect(flats.food).toBeGreaterThanOrEqual(10);
    expect(cardYieldConversions(g.state, city, flats)).toEqual([]);
    player.statecraft.doctrines.push('thalassocracy');
    bumpRevision(g.state);
    const lines = cardYieldConversions(g.state, city, flats);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.source).toContain('Thalassocracy');
    expect(lines[0]!.source).toContain('food → gold');
    expect(lines[0]!.gold).toBe(flats.food / 10);
    // **Per city**, on that town's own share, and exact since batch X — a tenth
    // of nine is nine tenths of a coin and the treasury keeps it. Only a town
    // making nothing at all is not a line.
    expect(cardYieldConversions(g.state, city, { ...flats, food: 9 })[0]!.gold).toBe(0.9);
    expect(cardYieldConversions(g.state, city, { ...flats, food: 0 })).toEqual([]);
    expect(cardYieldConversions(g.state, city, { ...flats, food: 10 })[0]!.gold).toBe(1);

    // And it is really in the fold the panel prints: the flats the town is
    // staged from carry the coin, and the harvest it was read off is untouched.
    const after = explainCity(g.state, city).flats;
    expect(after.food).toBe(flats.food);
    expect(after.gold).toBe(flats.gold + flats.food / 10);
  });

  it('yieldConversion — the scope is the whole of it: an inland town mints nothing', () => {
    // Seed 905: inland on the H9 board (seed 901's capital moved to the coast
    // when the start chooser learned to seat every capital near horses and
    // iron, 2026-09-06). The assertion below is what makes the seed honest.
    const g = game(905);
    const city = found(g.state, 0);
    farmTown(g.state, city);
    playerById(g.state, 0)!.statecraft.doctrines.push('thalassocracy');
    bumpRevision(g.state);
    // Inland on this bench — asserted rather than assumed, so a map change
    // cannot make this test pass by standing the town in a desert.
    expect(cityScopeAdmits(g.state, city, { test: 'coastal' })).toBe(false);
    const flats = explainCity(g.state, city).flats;
    expect(flats.food).toBeGreaterThanOrEqual(10);
    expect(cardYieldConversions(g.state, city, flats)).toEqual([]);
    expect(explainCity(g.state, city).flats.gold).toBe(flats.gold);
  });

  it('atPopulation — First Fruits pays for the first citizen and for no other', () => {
    const g = game(903);
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    slot(g.state, 0, 'firstFruitsOffering');

    // The rider is a filter on the occasion, so the payout itself is the place
    // to read it: a growth that reached two pays, and every other growth is not
    // on that payout at all.
    expect(windfallPayout(g.state, 0, 'growth', 0, 0, { population: 2 }).grants).toEqual([
      { card: 'firstFruitsOffering', source: 'Order · First Fruits', yield: 'faith', amount: 10 },
    ]);
    expect(windfallPayout(g.state, 0, 'growth', 0, 0, { population: 3 }).grants).toEqual([]);
    // An occasion that carries no population at all never satisfies it.
    expect(windfallPayout(g.state, 0, 'growth').grants).toEqual([]);
    expect(windfallPayout(g.state, 0, 'chop', 0, 0, { population: 2 }).grants).toEqual([]);

    // End to end, through the one growth-completion routine: the town's first
    // citizen banks the faith, and its second banks nothing.
    city.population = 1;
    const before = player.faithPool;
    city.foodBasket = growthThreshold(1) + 5;
    expect(settleGrowthWindfall(g.state, city)?.population).toBe(2);
    expect(player.faithPool).toBe(before + 10);
    city.foodBasket = growthThreshold(2) + 5;
    expect(settleGrowthWindfall(g.state, city)?.population).toBe(3);
    expect(player.faithPool).toBe(before + 10);
  });

  it('The Sacred Path pays the canopy in two voices', () => {
    const g = game(904);
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    const tile = ownedTiles(g.state, city).find((t) => t.col !== city.col || t.row !== city.row)!;
    const ctx = () => yieldContextFor(g.state, 0);

    tile.feature = 'forest';
    const bareForest = foldTileLines(explainTileYield(tile, ctx()));
    tile.feature = 'jungle';
    const bareJungle = foldTileLines(explainTileYield(tile, ctx()));

    player.statecraft.doctrines.push('theSacredPath');
    bumpRevision(g.state);
    const jungle = foldTileLines(explainTileYield(tile, ctx()));
    expect(jungle.culture).toBe(bareJungle.culture + 1);
    expect(jungle.faith).toBe(bareJungle.faith);
    tile.feature = 'forest';
    const forest = foldTileLines(explainTileYield(tile, ctx()));
    expect(forest.faith).toBe(bareForest.faith + 1);
    expect(forest.culture).toBe(bareForest.culture);
    // Bare ground is neither, and the card is silent on it.
    tile.feature = 'none';
    const open = explainTileYield(tile, ctx());
    expect(open.some((line) => line.source.includes('Sacred Path'))).toBe(false);
  });

  it('takes the three withdrawn rows out of every pool, and keeps them readable', () => {
    // The user's `[remove]` marks. A retired row keeps its effects and its name
    // so a save that holds it replays; `poolOrders`/`poolDoctrines` are the one
    // reader, so it is out of the draw, the upgrade roll and every screen at
    // once.
    for (const id of ['borderBallads', 'wolfRunners'] as OrderId[]) {
      expect(orderDef(id).retired, id).toBe(true);
      expect(orderDef(id).note, id).toBeTruthy();
      expect(poolOrders(orderDef(id).pool).includes(id), id).toBe(false);
      expect(describeCard(id).length, id).toBeGreaterThan(0);
    }
    // **Mountain Hold came back** (batch E4a). It was withdrawn for its unbuilt
    // half alone — the row was written for a mountain two hexes off and built
    // for one beside — and cutting that clause leaves a card that pays exactly
    // what it prints, so it is dealt again.
    expect(doctrineDef('mountainHold').retired).toBeUndefined();
    expect(poolDoctrines(10).includes('mountainHold' as never)).toBe(true);
    expect(describeCard('mountainHold').length).toBeGreaterThan(0);
    // And the second row the pass added is dealt. **First Fruits is not**: batch
    // F retired the first citizen's tithe (`docs/history/orders-pass-3.md` §2), so it is
    // out of every pool and readable, like the three above it.
    expect(poolOrders('chiefdom').includes('firstFruitsOffering' as never)).toBe(false);
    expect(describeCard('firstFruitsOffering').length).toBeGreaterThan(0);
    expect(poolDoctrines(10).includes('theSacredPath' as never)).toBe(true);
  });

  it('reads the shape this pass declared from at least one live card', () => {
    const used = new Set<CardEffectKind>();
    for (const id of [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS]) {
      for (const effect of cardDef(id).effects) used.add(effect.kind);
    }
    expect(used.has('yieldConversion')).toBe(true);
    // The member register: a field on an existing shape is invisible to the
    // kind-level one, so `atPopulation` is named here or nothing checks it.
    const riders = ORDER_IDS.flatMap((id) => orderDef(id).effects).filter(
      (effect) => effect.kind === 'windfallRider',
    );
    expect(riders.some((effect) => effect.atPopulation !== undefined)).toBe(true);
  });

  it('prints every changed and new row in the words the user ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('thalassocracy')).toEqual([
      '10% of the food in every coastal city is gained again as gold',
    ]);
    expect(said('theSacredPath')).toEqual([
      '+1 faith on every forest hex',
      '+1 culture on every jungle hex',
    ]);
    expect(said('firstFruitsOffering')).toEqual(['a city growing grants +10 faith']);
  });
});

// --- the card-shapes pass of 2026-09-04 -------------------------------------

/**
 * The rows the user ruled in `docs/history/card-shapes.md` — the deck-readers, the four
 * conversions, the two payoffs and the two retirements — and the five members of
 * the vocabulary they needed.
 *
 * Same discipline as the four passes above: **one behavioural test per new
 * member**, because the kind-level register only proves a *shape* is named by a
 * row — a `CountKind`, an `EmpireCondition` or a `CityScope` nobody reads would
 * sail straight through it — plus a register of its own naming exactly what this
 * pass declared, plus the printed sentence of every row that is new or changed.
 */
describe('the card-shapes pass of 2026-09-04', () => {
  /** The six voices, as a conversion reads them: a town's own fold of flats. */
  function flats(over: Partial<Record<CityYieldKey, number>> = {}): Record<CityYieldKey, number> {
    return { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0, ...over };
  }

  /** Empties the chair this card is sitting in, without touching the holding. */
  function unslot(state: GameState, playerId: number, id: string): void {
    const sc = playerById(state, playerId)!.statecraft;
    const index = sc.slots.findIndex((entry) => entry?.card === id);
    expect(index, id).toBeGreaterThanOrEqual(0);
    sc.slots[index] = null;
    bumpRevision(state);
  }

  /**
   * What this card pays the empire in one voice, or null when it pays none.
   *
   * A card that pays two voices is two lines (rule 5), so the voice picks the
   * line rather than being read off the first one that names the card.
   */
  function empireLine(state: GameState, playerId: number, name: string, voice: CityYieldKey) {
    const lines = explainCardEmpireYields(state, playerId).filter((entry) => entry.source.includes(name));
    if (lines.length === 0) return null;
    return lines.reduce((sum, line) => sum + line[voice], 0);
  }

  it('slottedOrdersOfSlot — The Guild Charter counts economic cards, and counts itself', () => {
    const g = game(940);
    found(g.state, 0);
    // Silent until it is in a chair — a card counts the council it sits on.
    expect(empireLine(g.state, 0, 'The Guild Charter', 'gold')).toBeNull();

    // **It counts itself**, which is the floor of every deck-reader and the
    // reason the family is worth drafting at all on the turn it lands.
    slot(g.state, 0, 'theGuildCharter');
    expect(slottedOrdersOfFlavour(g.state, 0, 'economic')).toBe(1);
    expect(empireLine(g.state, 0, 'The Guild Charter', 'gold')).toBe(3);

    // A second economic card moves the figure; a military one does not, which
    // is the whole of what "reads your deck" means.
    slot(g.state, 0, 'boundaryStones');
    expect(empireLine(g.state, 0, 'The Guild Charter', 'gold')).toBe(6);
    slot(g.state, 0, 'farRunners');
    expect(empireLine(g.state, 0, 'The Guild Charter', 'gold')).toBe(6);

    // And it falls again the instant the chair is emptied: the count is derived
    // from the slots every time it is asked, never banked.
    unslot(g.state, 0, 'boundaryStones');
    expect(empireLine(g.state, 0, 'The Guild Charter', 'gold')).toBe(3);
  });

  it('slottedOrdersOfSlot — First Rites reads wildcards, by the card and not the chair', () => {
    const g = game(940);
    found(g.state, 0);
    // **Batch F moved this reading off The Synod**, which is now a share on the
    // faith shelves (`docs/history/orders-pass-3.md` §9's ruled table). First Rites'
    // second clause is the same count on the same flavour, so the claim moves
    // with it rather than lapsing.
    slot(g.state, 0, 'firstRites');
    expect(empireLine(g.state, 0, 'First Rites', 'faith')).toBe(1);

    // **The card's own flavour, never the chair's.** A military card put into a
    // wildcard chair — which the slot rules allow — is still a military card,
    // and the reader does not read it.
    const sc = playerById(g.state, 0)!.statecraft;
    grant(sc, 'farRunners');
    sc.slots.push({ card: 'farRunners', sealedUntil: g.state.turn });
    bumpRevision(g.state);
    expect(slottedOrdersOfFlavour(g.state, 0, 'wildcard')).toBe(1);
    expect(empireLine(g.state, 0, 'First Rites', 'faith')).toBe(1);

    slot(g.state, 0, 'theVotiveTally');
    expect(slottedOrdersOfFlavour(g.state, 0, 'wildcard')).toBe(2);
    expect(empireLine(g.state, 0, 'First Rites', 'faith')).toBe(2);
    // An unnamed flavour counts the whole council — `filledOrderSlots`' answer.
    expect(slottedOrdersOfFlavour(g.state, 0)).toBe(filledOrderSlots(g.state, 0));
  });

  it("capital — The Guild Charter's hammers land in one town, and only there", () => {
    const g = game(942);
    const capital = found(g.state, 0);
    const second = foundCityAt(g.state, 0, getTileAt(g.state.map, capital.col + 4, capital.row)!);
    slot(g.state, 0, 'theGuildCharter');

    const hammers = (city: City): number => {
      const line = explainCardCityYields(g.state, city).find((entry) =>
        entry.source.includes('The Guild Charter'),
      );
      return line?.production ?? 0;
    };
    expect(hammers(capital)).toBe(2);
    expect(hammers(second)).toBe(0);
    // **Once**, which is the other half of the reading: the empire fold leaves
    // a capital line alone, or the same hammer would be paid twice — and the
    // empire has no basket for hammers anyway.
    expect(explainCardEmpireYields(g.state, 0).some((line) => line.production !== 0)).toBe(false);
  });

  it('slottedOrdersOfSlot — The War Council is spears, and batch F took the cap off', () => {
    const g = game(941);
    const mine =
      g.state.units.find((u) => u.ownerId === 0 && u.type === 'warrior') ??
      createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    const target = getTileAt(g.state.map, mine.col + 1, mine.row)!;
    // The ground is scenery here — the card is the subject — so it is made
    // passable rather than left to the seed.
    target.terrain = 'grassland';
    target.feature = 'none';
    target.hills = false;
    createUnit(g.state, 1, 'warrior', target.col, target.row);
    const spears = (): number => {
      const preview = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
      expect(preview.ok).toBe(true);
      if (!preview.ok) return 0;
      return preview.bonuses
        .filter((b) => b.source.includes('The War Council'))
        .reduce((sum, b) => sum + b.amount, 0);
    };
    expect(spears()).toBe(0);
    // It counts itself, exactly as the ledger's readers do.
    slot(g.state, 0, 'theWarCouncil');
    expect(spears()).toBe(1);
    slot(g.state, 0, 'farRunners');
    expect(spears()).toBe(2);
    slot(g.state, 0, 'theLongWatch');
    expect(spears()).toBe(3);
    // **No cap since batch F** (`docs/history/orders-pass-3.md` §9: the caps come off
    // Ore Tithes and the War Council), so a fourth soldier on the council is a
    // fourth point.
    slot(g.state, 0, 'militiaLevies');
    expect(slottedOrdersOfFlavour(g.state, 0, 'military')).toBe(4);
    expect(spears()).toBe(4);
  });

  it('atWar — The Arsenal Law opens the yards on a declaration and closes them on a peace', () => {
    // A bench of its own, because the shared one declares war on the first turn
    // and this card's whole face is the difference between war and peace.
    const g = createGame({
      seed: 944,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    const city = found(g.state, 0);
    city.buildings.push('barracks');
    bumpRevision(g.state);
    slot(g.state, 0, 'theArsenalLaw');
    const paid = (): number => {
      const lines = cardYieldConversions(g.state, city, flats({ production: 100 }));
      return lines.find((line) => line.source.includes('The Arsenal Law'))?.gold ?? 0;
    };

    // At peace the clause is not in the live list at all.
    expect(paid()).toBe(0);
    openWar(g.state, 0, 1);
    bumpRevision(g.state);
    expect(paid()).toBe(15);
    // **The wild is never in the register**, so a realm at peace with every
    // empire reads peace however many raiders are on the board.
    closeWar(g.state, 0, 1);
    bumpRevision(g.state);
    expect(paid()).toBe(0);

    // And the building is the other half of it: a town with no barracks pays
    // nothing even in the middle of a war.
    openWar(g.state, 0, 1);
    city.buildings = city.buildings.filter((id) => id !== 'barracks');
    bumpRevision(g.state);
    expect(paid()).toBe(0);
  });

  it('newest — The Charter of the Marches travels to the town you just founded', () => {
    const g = game(945);
    const capital = found(g.state, 0);
    slot(g.state, 0, 'theCharterOfTheMarches');
    const charter = (city: City): number => {
      const line = explainCardCityYields(g.state, city).find((entry) =>
        entry.source.includes('The Charter of the Marches'),
      );
      return line?.science ?? 0;
    };
    // One town in the realm: it is both the oldest and the newest.
    expect(charter(capital)).toBe(2);

    const tile = getTileAt(g.state.map, capital.col + 4, capital.row)!;
    tile.terrain = 'grassland';
    const march = foundCityAt(g.state, 0, tile);
    // The liberties move with the frontier — which is the decision the card is
    // about, and the reason it is a scope rather than a flag on a town.
    expect(charter(march)).toBe(2);
    expect(charter(capital)).toBe(0);
    expect(cityScopeAdmits(g.state, march, { test: 'newest' })).toBe(true);
    expect(cityScopeAdmits(g.state, capital, { test: 'newest' })).toBe(false);
  });

  it('found — founding a city pays the realm, through the one windfall routine', () => {
    const g = game(946);
    const capital = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    slot(g.state, 0, 'theCharterOfTheMarches');

    // The printed figure, composed once before anything is banked (Entry XVIII).
    expect(windfallPayout(g.state, 0, 'found').grants).toEqual([
      {
        card: 'theCharterOfTheMarches',
        source: 'Order · The Charter of the Marches',
        yield: 'culture',
        amount: 30,
      },
    ]);
    // And no other occasion carries it: the rider is written onto one moment.
    expect(windfallPayout(g.state, 0, 'growth').grants).toEqual([]);

    const before = player.culturePool;
    const drafts = player.statecraft.drafts;
    const tile = getTileAt(g.state.map, capital.col + 4, capital.row)!;
    tile.terrain = 'grassland';
    foundCityAt(g.state, 0, tile);
    // The bucket settles the instant it lands, which for culture means a draft:
    // the pool is what the thirty left after the ladder took its rung.
    expect(player.statecraft.drafts).toBe(drafts + 1);
    expect(player.culturePool).toBe(before + 30 - draftCost(drafts));
  });

  it('yieldConversion — the four new pairs, each with its own gate', () => {
    // Seed 905's town is inland, which The Salting Houses' half needs — the
    // same bench the Thalassocracy test uses, and for its reason.
    const g = game(905);
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    const paid = (name: string, voice: CityYieldKey, over: Partial<Record<CityYieldKey, number>>) =>
      cardYieldConversions(g.state, city, flats(over)).find((line) => line.source.includes(name))?.[
        voice
      ] ?? 0;

    // The Harvest Songs: every town, the whole harvest. It reads the food the
    // town makes rather than the surplus left after its citizens eat — the
    // departure the row's own `note` states, and the reason is that a surplus is
    // decided after every percentage that reads this line back.
    slot(g.state, 0, 'theHarvestSongs');
    expect(paid('The Harvest Songs', 'culture', { food: 40 })).toBe(6);
    expect(paid('The Harvest Songs', 'culture', { food: 9 })).toBe(1.35);

    // The Golden Scales: gold read again as science, everywhere.
    slot(g.state, 0, 'theGoldenScales');
    expect(paid('The Golden Scales', 'science', { gold: 40 })).toBe(8);

    // The Drafting Halls: the same shape gated on a building the town has built.
    slot(g.state, 0, 'theDraftingHalls');
    expect(paid('The Drafting Halls', 'science', { production: 40 })).toBe(0);
    city.buildings.push('library');
    bumpRevision(g.state);
    expect(paid('The Drafting Halls', 'science', { production: 40 })).toBe(8);

    // The Salting Houses: Thalassocracy's exact shape, one voice over — and the
    // coast is the whole of it.
    slot(g.state, 0, 'theSaltingHouses');
    expect(cityScopeAdmits(g.state, city, { test: 'coastal' })).toBe(false);
    expect(paid('The Salting Houses', 'production', { food: 40 })).toBe(0);
    getTileAt(g.state.map, city.col + 1, city.row)!.terrain = 'coast';
    expect(paid('The Salting Houses', 'production', { food: 40 })).toBe(4);
    // Two conversions on one town read the **same** handed-in fold, so neither
    // is paid on the other's output and their order cannot change either.
    expect(paid('The Harvest Songs', 'culture', { food: 40 })).toBe(6);
    expect(player.statecraft.orders.length).toBeGreaterThan(0);
  });

  it('retires The Salt Road and Hearth Songs without deleting either row', () => {
    for (const id of ['theSaltRoad', 'hearthSongs'] as OrderId[]) {
      // Out of the draw, by the one clause that reads `retired`.
      expect(orderDef(id).retired, id).toBe(true);
      expect(poolOrders(orderDef(id).pool).includes(id), id).toBe(false);
      const sc = newPlayerStatecraft();
      expect(livePool(sc).includes(id), id).toBe(false);
      // And still fully readable, which is what a save from before the cut
      // needs: the row keeps its name, its face and its effects.
      expect(cardDef(id).name, id).toBeTruthy();
      expect(describeCard(id).length, id).toBeGreaterThan(0);
    }
    // The replacements stand in their place, in the pools the user ruled.
    expect(orderDef('theGoldenScales').pool).toBe('governmentIII');
    expect(orderDef('theHarvestSongs').pool).toBe('governmentII');
  });

  it('reads every member this pass declared from at least one live card', () => {
    const scopes = new Set<string>();
    const counts = new Set<string>();
    const conditions = new Set<string>();
    const occasions = new Set<string>();
    const wheres = new Set<string>();
    const scales = new Set<string>();
    const walk = (effects: readonly CardEffect[]): void => {
      for (const effect of effects) {
        const scope = (effect as { scope?: { test?: string } }).scope;
        if (scope?.test !== undefined) scopes.add(scope.test);
        if (effect.kind === 'countScaled') {
          counts.add(effect.count);
          if (effect.pays.to === 'yield') wheres.add(effect.pays.where);
        }
        if (effect.kind === 'combatLine' && effect.scaled) scales.add(effect.scaled.count);
        if (effect.kind === 'windfallRider') occasions.add(effect.occasion);
        if (effect.kind === 'conditionRule') {
          conditions.add(effect.when.test);
          walk(effect.then);
        }
      }
    };
    for (const id of [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS]) walk(cardDef(id).effects);
    expect(counts.has('slottedOrdersOfSlot')).toBe(true);
    expect(scales.has('slottedOrdersOfSlot')).toBe(true);
    expect(conditions.has('atWar')).toBe(true);
    expect(scopes.has('newest')).toBe(true);
    expect(occasions.has('found')).toBe(true);
    // The payout member that was declared for three passes and read by nothing.
    expect(wheres.has('capital')).toBe(true);
  });

  it('prints every new row in the words the pass ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theWarCouncil')).toEqual([
      "+1 combat strength per military Order you have in a slot",
    ]);
    expect(said('theGuildCharter')).toEqual([
      "+3 gold per economic Order you have in a slot",
      "+2 production in your capital per economic Order you have in a slot",
    ]);
    expect(said('theSynod')).toEqual([
      "your buildings that supply faith pay +50% more, counted after every other bonus on them",
    ]);
    expect(said('theHarvestSongs')).toEqual([
      "15% of the food in every city is gained again as culture",
    ]);
    expect(said('theSaltingHouses')).toEqual([
      '10% of the food in every coastal city is gained again as production',
    ]);
    expect(said('theDraftingHalls')).toEqual([
      "20% of the production in every city with a Library is gained again as science",
    ]);
    expect(said('theGoldenScales')).toEqual([
      "20% of the gold in every city is gained again as science",
    ]);
    expect(said('theArsenalLaw')).toEqual([
      'while you are at war: 15% of the production in every city with a Barracks is gained ' +
        'again as gold',
    ]);
    expect(said('theCharterOfTheMarches')).toEqual([
      '+2 food, +2 production, +2 gold, +2 science, +2 culture, +2 faith in your newest city',
      'founding a city grants +30 culture',
    ]);
  });
});

// --- the synergy-density pass of 2026-09-05 ---------------------------------

/**
 * `docs/history/loop-review.md` section 4, and the user's marginalia on its table.
 *
 * The claim the pass is testing: a pool of flat numbers is a pool where no two
 * cards are better together than apart. Eight rows stopped being flat, three
 * joined, and **not one new `CardEffect` shape was added** — every row below is
 * written in the vocabulary the card-shapes pass left, which is why these are
 * behaviour tests rather than register tests. What is pinned here is that each
 * reworked row still folds through the *one* evaluator it always did, and that
 * the gates the new clauses hang on actually close.
 */
describe('the synergy-density pass of 2026-09-05', () => {
  /** The zero bag the conversions are asked against. */
  function bag(over: Partial<Record<CityYieldKey, number>> = {}): Record<CityYieldKey, number> {
    return { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0, ...over };
  }

  /** What one named card pays a town, in one voice. */
  function paidTo(state: GameState, city: City, name: string, yieldKey: CityYieldKey): number {
    return explainCardCityYields(state, city)
      .filter((line) => line.source.includes(name))
      .reduce((sum, line) => sum + line[yieldKey], 0);
  }

  it('Boundary Stones — the borders hurry only where a Monument stands', () => {
    const g = game(950);
    const city = found(g.state, 0);
    slot(g.state, 0, 'boundaryStones');
    const rate = (): number =>
      cardRulePercent(g.state, 0, 'borderCulture', city)
        .filter((line) => line.source.includes('Boundary Stones'))
        .reduce((sum, line) => sum + line.percent, 0);
    // A scope is a question about a *city*, so a town with no Monument is
    // simply not admitted — and the empire-wide reading, which has no town to
    // ask, cannot answer it at all.
    expect(rate()).toBe(0);
    expect(cardRulePercent(g.state, 0, 'borderCulture').length).toBe(0);
    city.buildings.push('monument');
    bumpRevision(g.state);
    expect(rate()).toBe(30);
  });

  it('First Rites — one candle in the capital, and one for every wildcard on the council', () => {
    const g = game(951);
    const capital = found(g.state, 0);
    slot(g.state, 0, 'firstRites');
    // The capital's own line is a city line and stays put.
    expect(paidTo(g.state, capital, 'First Rites', 'faith')).toBe(1);
    const read = (): number =>
      explainCardEmpireYields(g.state, 0)
        .filter((line) => line.source.includes('First Rites'))
        .reduce((sum, line) => sum + line.faith, 0);
    // It counts itself — the reader family's floor is one helping, never none.
    expect(read()).toBe(1);
    slot(g.state, 0, 'festivalDays');
    expect(read()).toBe(2);
    // A military card on the council is not a wildcard: the count is the
    // *card's* own flavour, never the chair's.
    slot(g.state, 0, 'bloodedSpears');
    expect(read()).toBe(2);
  });

  it('Border Wardens — the merged row, and Vanguard retired into it', () => {
    const g = game(952);
    const capital = found(g.state, 0);
    const mine = createUnit(g.state, 0, 'warrior', capital.col, capital.row);
    const target = getTileAt(g.state.map, capital.col + 1, capital.row)!;
    target.terrain = 'grassland';
    target.feature = 'none';
    target.hills = false;
    createUnit(g.state, 1, 'warrior', target.col, target.row);
    const wardens = (): number => {
      const preview = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
      expect(preview.ok).toBe(true);
      if (!preview.ok) return 0;
      return preview.bonuses
        .filter((b) => b.source.includes('Border Wardens'))
        .reduce((sum, b) => sum + b.amount, 0);
    };
    expect(wardens()).toBe(0);
    // Alone on the council it is the +2 the row printed before the merge: one
    // flat point and one helping of the ladder, because a reader counts itself.
    slot(g.state, 0, 'borderWardens');
    expect(wardens()).toBe(2);
    slot(g.state, 0, 'bloodedSpears');
    expect(wardens()).toBe(3);
    slot(g.state, 0, 'militiaLevies');
    expect(wardens()).toBe(4);
    // The cap is on the scaled line's own points, so a fourth soldier on the
    // council is a soldier on the council and nothing more.
    slot(g.state, 0, 'horseLords');
    expect(slottedOrdersOfFlavour(g.state, 0, 'military')).toBe(4);
    expect(wardens()).toBe(4);
    // Vanguard is out of the bag and keeps its face for the saves that hold it.
    expect(orderDef('vanguard').retired).toBe(true);
    expect(poolOrders('governmentI').includes('vanguard' as never)).toBe(false);
  });

  it('Harbour Dues — the Tide’s conversion, and it stops at the shore', () => {
    const g = game(953);
    const city = found(g.state, 0);
    slot(g.state, 0, 'harbourDues');
    const paid = (gold: number): number =>
      cardYieldConversions(g.state, city, bag({ gold })).find((line) =>
        line.source.includes('Harbour Dues'),
      )?.culture ?? 0;
    const shore = isCoastal(g.state.map, getTileAt(g.state.map, city.col, city.row)!);
    expect(paid(100)).toBe(shore ? 5 : 0);
    // Per city, on the town's own share — never on an empire total divided out
    // afterwards — and exact since batch X, so nineteen coins pay nineteen
    // twentieths rather than nothing.
    expect(paid(19)).toBe(shore ? 0.95 : 0);
    // And the scope is the whole of the gate: an inland town reads the same
    // hundred coins and pays nothing.
    expect(cityScopeAdmits(g.state, city, { test: 'coastal' })).toBe(shore);
  });

  it('Scholars’ Stipend — a Library then a University, both behind the fifth citizen', () => {
    const g = game(954);
    const city = found(g.state, 0);
    slot(g.state, 0, 'scholarsStipend');
    const paid = (): number => paidTo(g.state, city, "Scholars' Stipend", 'science');
    city.population = 5;
    expect(paid()).toBe(0);
    city.buildings.push('library');
    bumpRevision(g.state);
    expect(paid()).toBe(3);
    city.buildings.push('university');
    bumpRevision(g.state);
    expect(paid()).toBe(6);
    // Both lines carry the population gate; a village with a college is still
    // a village.
    city.population = 4;
    expect(paid()).toBe(0);
  });

  it('Ore Tithes — the seam’s hammer, and the Forge Levy’s reader beside it', () => {
    const g = game(955);
    const capital = found(g.state, 0);
    slot(g.state, 0, 'oreTithes');
    const hammers = (): number => paidTo(g.state, capital, 'Ore Tithes', 'production');
    // It is an **economic** card counting the **military** bench, so unlike
    // the readers that share their own flavour it does not count itself: an
    // empire with no war cards on the council reads nothing.
    expect(hammers()).toBe(0);
    slot(g.state, 0, 'bloodedSpears');
    expect(hammers()).toBe(2);
    slot(g.state, 0, 'militiaLevies');
    expect(hammers()).toBe(4);
    slot(g.state, 0, 'horseLords');
    expect(hammers()).toBe(6);
    // **No cap since batch F** — `docs/history/orders-pass-3.md` §9 takes it off this
    // row and off The War Council, and leaves it on the other three readers.
    slot(g.state, 0, 'farRunners');
    expect(slottedOrdersOfFlavour(g.state, 0, 'military')).toBe(4);
    expect(hammers()).toBe(8);
    // The ground half is untouched, and it is still an unscoped *tile* line —
    // the seam pays wherever it is, and only the reader landed in the capital.
    expect(orderDef('oreTithes').effects[0]!.kind).toBe('tileYield');
    expect(scopedCardTileLines(g.state, capital).length).toBe(0);
  });

  it('Provincial Governors — the writ is a count of the economic bench, capped at four', () => {
    const g = game(956);
    found(g.state, 0);
    const before = foldMeter(explainAuthority(g.state, 0));
    slot(g.state, 0, 'provincialGovernors');
    expect(foldMeter(explainAuthority(g.state, 0))).toBe(before + 1);
    slot(g.state, 0, 'saltTithes');
    slot(g.state, 0, 'commonGranary');
    slot(g.state, 0, 'boundaryStones');
    expect(foldMeter(explainAuthority(g.state, 0))).toBe(before + 4);
    // A fifth clerk is a clerk and nothing more.
    slot(g.state, 0, 'landGrants');
    expect(slottedOrdersOfFlavour(g.state, 0, 'economic')).toBe(5);
    expect(foldMeter(explainAuthority(g.state, 0))).toBe(before + 4);
  });

  it('The Banner-Call — both halves open on a war and close on a peace', () => {
    // A bench of its own: the shared one declares war on the first turn, and
    // this card's whole face is the difference between war and peace.
    const g = createGame({
      seed: 957,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    const city = found(g.state, 0);
    slot(g.state, 0, 'theBannerCall');
    const hammers = (): number =>
      cardProduction(g.state, city, 'unit', 'warrior')
        .filter((line) => line.source.includes('The Banner-Call'))
        .reduce((sum, line) => sum + line.percent, 0);
    const song = (): number =>
      windfallPayout(g.state, 0, 'kill').grants
        .filter((grant) => grant.yield === 'culture')
        .reduce((sum, grant) => sum + grant.amount, 0);
    expect(hammers()).toBe(0);
    expect(song()).toBe(0);
    openWar(g.state, 0, 1);
    bumpRevision(g.state);
    expect(hammers()).toBe(15);
    expect(song()).toBe(5);
    // The hammers are behind *units* and nothing else — the category is the
    // whole of that rule.
    expect(
      cardProduction(g.state, city, 'building', undefined, 'granary').some((line) =>
        line.source.includes('The Banner-Call'),
      ),
    ).toBe(false);
    closeWar(g.state, 0, 1);
    bumpRevision(g.state);
    expect(hammers()).toBe(0);
    expect(song()).toBe(0);
  });

  it('The Far Charts — the Wayfarers’ payoff, and the half that is not built', () => {
    const g = game(958);
    found(g.state, 0);
    slot(g.state, 0, 'theFarCharts');
    const seen = g.state.visibility[0]!.reduce((sum: number, bit: number) => sum + (bit > 0 ? 1 : 0), 0);
    const beakers = explainCardEmpireYields(g.state, 0)
      .filter((line) => line.source.includes('The Far Charts'))
      .reduce((sum, line) => sum + line.science, 0);
    expect(beakers).toBe(Math.floor(seen / 20));
    // The route half was **cut** on 2026-09-07 (batch E4a): how far a caravan
    // may be sent is a fact about the two towns it joins, and the law does not
    // reach that rule. The row's note says so; nothing is promised.
    expect(orderDef('theFarCharts').deferred).toBeUndefined();
    expect(orderDef('theFarCharts').note).toBeTruthy();
  });

  it('The Wolf-Standard — deferred whole, and out of every pool', () => {
    const def = orderDef('theWolfStandard');
    expect(def.retired).toBe(true);
    expect(def.effects).toEqual([]);
    // Batch E4a cut the clause with the row (the user: *remove*), so a
    // withdrawn card promises nothing.
    expect(def.deferred).toBeUndefined();
    expect(def.note).toBeTruthy();
    expect(poolOrders('governmentII').includes('theWolfStandard' as never)).toBe(false);
  });

  it('prints every changed and new row in the words the pass ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('boundaryStones')).toEqual([
      '+30% border expansion, in every city with a Monument',
    ]);
    expect(said('borderWardens')).toEqual([
      '+1 combat strength inside your territory',
      '+1 combat strength per military Order you have in a slot (at most +3) inside your territory',
    ]);
    expect(said('harbourDues')).toEqual([
      '5% of the gold in every coastal city is gained again as culture',
    ]);
    // "a University", not "an University": the row carries its own article,
    // which is the fix `indefinite`'s docblock named for the day a name broke
    // the vowel rule.
    expect(said('scholarsStipend')).toEqual([
      "+3 science in every city of 5+ with a Library",
      "+3 science in every city of 5+ with a University",
    ]);
    expect(said('provincialGovernors')).toEqual([
      '+1 authority capacity per economic Order you have in a slot (at most +4 authority capacity)',
    ]);
    expect(said('theBannerCall')).toEqual([
      'while you are at war: +15% production toward units; killing a unit grants +5 culture',
    ]);
    expect(said('theFarCharts')).toEqual(['+1 science per 20 hexes you have revealed']);
  });
});


/**
 * **The cards pass of 2026-09-05** (`docs/history/cards-pass-2.md`, ruled the same day):
 * the two late Order pools, the eight cuts, the eight modifications and the nine
 * rows written for the holes.
 *
 * What is pinned here is what the pass actually *decided*, rather than every row
 * it wrote: the **routing** (a rung that opens a shelf of its own is the whole
 * point of the pass), the **one** new vocabulary member, the two shapes that
 * were nearly bent and were not, and the words of the rows whose ratified text
 * had to be renamed or struck. The rest of the table is covered by the register
 * tests above, which walk every row of every pool.
 */
describe('the cards pass of 2026-09-05', () => {
  it('opens a shelf of its own at every rung of the ladder', () => {
    // The bug the pass was for: `poolOfGovernment` fell through to Government
    // III for every tier above eighteen, so a seat that reached the fourth rung
    // re-drew the shelf it had already emptied and adopting bought it nothing.
    for (const id of governmentsAtTier(29)) expect(poolOfGovernment(id), id).toBe('governmentIV');
    for (const id of governmentsAtTier(45)) expect(poolOfGovernment(id), id).toBe('governmentV');
    expect(ORDER_POOLS).toEqual([
      'chiefdom', 'governmentI', 'governmentII', 'governmentIII', 'governmentIV', 'governmentV',
    ]);
    // And the pools are stocked: a rung with nothing on it would deal an empty
    // hand rather than throw, which is exactly the silence this pass ended.
    expect(poolOrders('governmentIV').length).toBeGreaterThanOrEqual(RULES.offers.order);
    expect(poolOrders('governmentV').length).toBeGreaterThanOrEqual(RULES.offers.order);
  });

  it('turns the shelf over on adoption — the current pool alone, both new rungs', () => {
    const g = game(781);
    const sc = playerById(g.state, 0)!.statecraft;
    sc.government = 'theCuria';
    bumpRevision(g.state);
    const fourth = new Set(livePool(sc));
    expect(fourth.size).toBe(poolOrders('governmentIV').length);
    for (const id of fourth) expect(orderDef(id).pool, id).toBe('governmentIV');
    // The previous government's leftovers do not ride along (the ruling of
    // 2026-09-03, unchanged by this pass).
    expect(fourth.has('theFarCharts' as never)).toBe(false);
    sc.government = 'theEmpire';
    bumpRevision(g.state);
    for (const id of livePool(sc)) expect(orderDef(id).pool, id).toBe('governmentV');
  });

  it('takes the eight cuts out of every pool and leaves them readable', () => {
    const cut: OrderId[] = [
      'militiaLevies', 'horseLords', 'theMusterRoll', 'landGrants',
      'theShieldWall', 'theQuartermasters', 'theCommonPurse', 'publicGranaries',
    ] as never;
    for (const id of cut) {
      const def = orderDef(id);
      expect(def.retired, id).toBe(true);
      expect(def.note, id).toBeTruthy();
      // Still a card: a save that holds one slotted replays, which is the whole
      // reason a withdrawn row is marked rather than deleted.
      expect(def.effects.length, id).toBeGreaterThan(0);
      for (const pool of ORDER_POOLS) expect(poolOrders(pool).includes(id), id).toBe(false);
    }
  });

  it('roadHexes — The Long Roads pays for the hexes you paved, and nobody else’s', () => {
    const g = game(782);
    found(g.state, 0);
    slot(g.state, 0, 'theLongRoads');
    const coin = (): number =>
      explainCardEmpireYields(g.state, 0)
        .filter((line) => line.source.includes('The Long Roads'))
        .reduce((sum, line) => sum + line.gold, 0);
    expect(coin()).toBe(0);
    for (const tile of g.state.map.tiles.slice(0, 5)) tile.road = 0;
    // A road a rival laid is a rival's road: the count reads `Tile.road`, which
    // is the builder's own mark and the one field `layRoad` writes.
    for (const tile of g.state.map.tiles.slice(5, 9)) tile.road = 1;
    expect(coin()).toBe(5);
    // A decreed hex is still a road — only the maintenance ledger cares who is
    // billed for it.
    g.state.map.tiles[0]!.roadFree = true;
    expect(coin()).toBe(5);
  });

  it('The Founding Oath pays the capital, in every voice, and stops at three', () => {
    const g = game(783);
    const capital = found(g.state, 0);
    slot(g.state, 0, 'theFoundingOath');
    const paid = (city: typeof capital): number =>
      explainCardCityYields(g.state, city)
        .filter((line) => line.card === 'theFoundingOath')
        .reduce((sum, line) => sum + line.food + line.production + line.gold
          + line.science + line.culture + line.faith, 0);
    capital.buildings = ['monument'];
    bumpRevision(g.state);
    // Six voices, one helping: the payout names one voice, so "of every yield"
    // is six lines of the same count rather than a shape of its own.
    expect(paid(capital)).toBe(6);
    capital.buildings = ['monument', 'granary', 'shrine', 'barracks'];
    bumpRevision(g.state);
    expect(paid(capital)).toBe(18);
    // Somebody else's town counts nothing at all: `where: 'capital'` is the one
    // payout that lands in a single named town.
    const second = foundCityAt(
      g.state, 0,
      getTileAt(g.state.map, (capital.col + 5) % g.state.map.width, capital.row)!,
    )!;
    second.buildings = ['monument', 'granary'];
    bumpRevision(g.state);
    expect(paid(second)).toBe(0);
  });

  it('The Granary Laws convert in the big towns and are silent in the small ones', () => {
    const g = game(784);
    const city = found(g.state, 0);
    slot(g.state, 0, 'theGranaryLaws');
    const flats = { food: 30, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
    city.population = 7;
    expect(cardYieldConversions(g.state, city, flats)).toEqual([]);
    city.population = 8;
    const lines = cardYieldConversions(g.state, city, flats);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.science).toBe(6);
    expect(lines[0]!.source).toContain('food → science');
  });

  it('The Guild Compact stages its percent in the town whose forges it counted', () => {
    const g = game(785);
    const city = found(g.state, 0);
    slot(g.state, 0, 'theGuildCompact');
    const percent = (): number =>
      explainCardPercentYields(g.state, city)
        .filter((line) => line.card === 'theGuildCompact')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent()).toBe(0);
    city.buildings = ['workshop'];
    bumpRevision(g.state);
    expect(percent()).toBe(3);
    // Capped where the design caps it: the cap is on the count, so a sixth
    // production building pays nothing. Batch F raised both figures.
    city.buildings = ['workshop', 'watermill', 'smithy', 'forge'];
    bumpRevision(g.state);
    expect(percent()).toBe(12);
    for (const line of explainCardPercentYields(g.state, city)) {
      if (line.card !== 'theGuildCompact') continue;
      expect(line.stage).toBe('city');
      expect(line.yield).toBe('production');
    }
  });

  it('Far Runners pays for looking — every unit’s eyes, and the ruin', () => {
    const g = game(786);
    slot(g.state, 0, 'farRunners');
    // The rider is part of the printed number, on the occasion a ruin is
    // claimed (`discovery`) and on no other.
    expect(windfallPayout(g.state, 0, 'discovery', 20).grants).toEqual([
      { card: 'farRunners', source: 'Order · Far Runners', yield: 'culture', amount: 10 },
    ]);
    expect(windfallPayout(g.state, 0, 'camp', 20).grants).toEqual([]);
  });

  it('names the three rows whose ratified names were already taken', () => {
    // A card id is unique across the whole table — a belief, an Order and a
    // building share one id space — so a proposal that names a built row is a
    // rename rather than a second row with the same name.
    expect(orderDef('theConsistory').name).toBe('The Consistory');
    expect(orderDef('theGuildCompact').name).toBe('The Guild Compact');
    // *Star Readers* is a pantheon belief, which the proposal did not know.
    expect(orderDef('courtAstronomers').name).toBe('Court Astronomers');
    expect(cardDef('theSynod' as never).name).toBe('The Synod');
    expect(cardDef('theGuildCharter' as never).name).toBe('The Guild Charter');
  });

  it('prints the late rows, and says out loud which half was struck', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theLongRoads')).toEqual(['+1 gold per road hex you have laid']);
    expect(said('theConsistory')).toEqual([
      "your buildings that supply faith pay +100% more, counted after every other bonus on them",
    ]);
    // Withdrawn on 2026-09-07 (the user: *remove this altogether, not a strong
    // engine*), and its unbuilt half cut with it — so the row prints the one
    // clause it still pays whoever holds it in a save.
    expect(said('theGuildCompact')).toEqual([
      "+3% production per production building in this city (at most +15% production)",
    ]);
    expect(said('theHorseTribes')).toEqual([
      'mounted units: +1 movement',
      'mounted units gain +1 combat strength on flat ground — not built yet',
      'every stable pays +1 food — not built yet',
    ]);
    // **The deferred half became the card** (the user's ruling of 2026-09-06):
    // the levy is a coin on each soldier now rather than a share of the payroll,
    // so the row carries `upkeepSurcharge` — the flat rebate's twin — and prints
    // one clause where it used to print a percentage and an apology.
    expect(said('theRecklessLevy')).toEqual([
      "+50% production toward units",
      'all units cost 1 more gold in maintenance',
    ]);
    expect(said('theCongregation')).toEqual([
      '+1 culture per city that follows you',
      '+1 science per city that follows you',
    ]);
  });

  it('leaves the late Doctrines paying exactly what they print', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    // **Blitz was built** on 2026-09-07 (batch E4a): both halves are one `rule`
    // apiece — a kill hands the walking back, and the trench is forbidden — so
    // the row that had no stock half at all now has two and is dealt again.
    expect(doctrineDef('blitz').retired).toBeUndefined();
    expect(poolDoctrines(45).includes('blitz' as never)).toBe(true);
    expect(said('blitz')).toEqual([
      'a unit that kills gets its movement back for the rest of the turn',
      'your units cannot fortify',
    ]);
    // The other five ship their stock halves with the rest struck from the text
    // — a card prints only what it pays.
    for (const id of ['theSeaCharter', 'theRenaissanceCourt', 'absolutism', 'paxMagistri',
      'thePhilosophersStone'] as never[]) {
      expect(doctrineDef(id).effects.length, id).toBeGreaterThan(0);
      expect(doctrineDef(id).deferred, id).toBeUndefined();
      expect(describeCard(id).every((c) => !c.text.includes('not built yet')), id).toBe(true);
    }
    expect(said('thePhilosophersStone')).toEqual(['+25% production toward The Magnum Opus']);
    expect(said('theSeaCharter')).toEqual(['trade routes pay +50% more']);
  });
});

// --- the Æra III fork, 2026-09-05 -------------------------------------------

/**
 * The fork (`docs/history/age-three.md`, sections 1–3 with the user's marginalia).
 *
 * The claim the pass rests on: **each tier-18 government is a reader of its own
 * dominant chair**, so "which government" becomes "which deck". Every signature
 * below is asserted twice — once with an empty council and once with a card of
 * its own flavour in a slot — because a deck-reader that does not *move* is a
 * flat by another name.
 *
 * Beside that, the Pool III pass: three rows sharpened, three rows new, and the
 * one new occasion (`veinFound`), which is `prospect`'s other half and fires
 * only on a strike.
 *
 * **The seal is not here.** Section 3 proposed ten turns from Government III on
 * and the user vetoed it the same day — swapping a card in and out is skill —
 * so `sealTurnsFor` is untouched and the seal tests above still pin five.
 */
describe('the Æra III fork of 2026-09-05', () => {
  /** Puts a government on a seat. Adoption has its own tests above. */
  function rule(state: GameState, playerId: number, id: string): void {
    playerById(state, playerId)!.statecraft.government = id as never;
    bumpRevision(state);
  }

  it('Divine Mandate — the capital reads the wildcard bench, and the tithe rises', () => {
    const g = game(901);
    const capital = found(g.state, 0);
    rule(g.state, 0, 'divineMandate');
    const paid = (city: City, key: CityYieldKey): number =>
      explainCardCityYields(g.state, city)
        .filter((line) => line.card === 'divineMandate')
        .reduce((sum, line) => sum + line[key], 0);
    // An empty council pays nothing at all, and says so by having no line.
    expect(paid(capital, 'faith')).toBe(0);
    // A wildcard card in a chair is one helping of each voice; a military one is
    // none, because the count is the **card's** flavour and not the chair's.
    slot(g.state, 0, 'festivalDays');
    expect(paid(capital, 'faith')).toBe(1);
    expect(paid(capital, 'culture')).toBe(1);
    slot(g.state, 0, 'bloodedSpears');
    expect(paid(capital, 'faith')).toBe(1);
    slot(g.state, 0, 'waysideShrines');
    expect(paid(capital, 'faith')).toBe(2);
    // One town only: `where: 'capital'` is the payout that lands in a single
    // named city.
    const second = foundCityAt(
      g.state, 0,
      getTileAt(g.state.map, (capital.col + 5) % g.state.map.width, capital.row)!,
    )!;
    expect(paid(second, 'faith')).toBe(0);
    // And the second clause, which is the doc's own fallback: nothing in the
    // vocabulary can ask whether a town is content, so the tithe reads its size.
    const share = (city: City): number =>
      explainCardPercentYields(g.state, city)
        .filter((line) => line.card === 'divineMandate')
        .reduce((sum, line) => sum + line.percent, 0);
    capital.population = 5;
    expect(share(capital)).toBe(0);
    capital.population = 6;
    expect(share(capital)).toBe(10);
    for (const line of explainCardPercentYields(g.state, capital)) {
      if (line.card !== 'divineMandate') continue;
      expect(line.yield).toBe('faith');
      expect(line.stage).toBe('city');
    }
  });

  it('Imperium — every city reads the military bench', () => {
    const g = game(902);
    const capital = found(g.state, 0);
    const second = foundCityAt(
      g.state, 0,
      getTileAt(g.state.map, (capital.col + 5) % g.state.map.width, capital.row)!,
    )!;
    rule(g.state, 0, 'imperium');
    const hammers = (city: City): number =>
      explainCardCityYields(g.state, city)
        .filter((line) => line.card === 'imperium')
        .reduce((sum, line) => sum + line.production, 0);
    expect(hammers(capital)).toBe(0);
    slot(g.state, 0, 'bloodedSpears');
    // **Every** city, which is what makes the war economy a war economy: the
    // payout is `where: 'city'`, not the capital's.
    expect(hammers(capital)).toBe(1);
    expect(hammers(second)).toBe(1);
    slot(g.state, 0, 'festivalDays');
    expect(hammers(capital)).toBe(1);
    slot(g.state, 0, 'siegeDoctrine');
    expect(hammers(capital)).toBe(2);
    // The legs are unchanged, and they are the reason the government still
    // reads as Imperium.
    expect(cardUnitStat(g.state, createUnit(g.state, 0, 'warrior', 3, 3), 'movement')).toBe(1);
  });

  it('Imperium — a captured city pays the treasury and makes the army whole', () => {
    const g = game(903);
    found(g.state, 0);
    rule(g.state, 0, 'imperium');
    const player = playerById(g.state, 0)!;
    const hurt = createUnit(g.state, 0, 'warrior', 3, 3);
    hurt.hp = 1;
    const before = player.gold;
    // The conquest payoff the war path lacked, on the occasion The Triumphal Way
    // already rides. Both halves are one grant, composed before anything is
    // banked (Entry XVIII.5).
    const payout = windfallPayout(g.state, 0, 'capture');
    expect(payout.healAll).toBe(true);
    expect(payout.grants).toEqual([
      { card: 'imperium', source: 'Government · Imperium', yield: 'gold', amount: 50 },
    ]);
    payWindfallGrants(g.state, player, payout, { col: 3, row: 3 });
    expect(player.gold - before).toBe(50);
    expect(hurt.hp).toBe(unitMaxHp(hurt));
    // A town founded is not a town taken: the occasion is the capture and no
    // other.
    expect(windfallPayout(g.state, 0, 'found').grants).toEqual([]);
  });

  it('Merchant League — the economic bench, the routes, and one more of them', () => {
    const g = game(904);
    found(g.state, 0);
    rule(g.state, 0, 'merchantLeague');
    const coin = (): number => foldCardYields(
      explainCardEmpireYields(g.state, 0).filter((line) => line.card === 'merchantLeague'),
    ).gold;
    expect(coin()).toBe(0);
    slot(g.state, 0, 'weightsAndMeasures');
    expect(coin()).toBe(2);
    slot(g.state, 0, 'festivalDays');
    expect(coin()).toBe(2);
    slot(g.state, 0, 'silkRoads');
    expect(coin()).toBe(4);
    // The route the government *runs*, which no other tier-18 law hands over.
    const slots = explainRouteSlots(g.state, 0);
    expect(slots.some((line) => line.source.includes('Merchant League'))).toBe(true);
    expect(routeSlots(g.state, 0)).toBe(slots.reduce((sum, line) => sum + line.slots, 0));
  });

  it('The Iron Price — twenty a kill, and a pillage worth twice as much', () => {
    const g = game(905);
    found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('ironPrice' as never);
    bumpRevision(g.state);
    expect(windfallPayout(g.state, 0, 'kill').grants).toEqual([
      { card: 'ironPrice', source: 'Doctrine · The Iron Price', yield: 'culture', amount: 20 },
    ]);
    // A percentage on the occasion's own figure, where the row used to add a
    // flat beside it: the salvage is doubled, and the doubling is part of the
    // printed number.
    const salvage = windfallPayout(g.state, 0, 'pillage', 30);
    expect(salvage.amount).toBe(60);
    expect(salvage.grants).toEqual([]);
  });

  it('The Gilded Court — two clauses, one identity: the writ is gone', () => {
    const g = game(906);
    found(g.state, 0);
    const before = foldMeter(explainAuthority(g.state, 0));
    playerById(g.state, 0)!.statecraft.doctrines.push('gildedCourt' as never);
    bumpRevision(g.state);
    expect(foldMeter(explainAuthority(g.state, 0))).toBe(before);
    expect(
      doctrineDef('gildedCourt').effects.some((effect) => effect.kind === 'authority'),
    ).toBe(false);
  });

  it('Master of Maps — the Geomancy row pays for what a survey finds', () => {
    const g = game(907);
    found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('masterOfMaps' as never);
    bumpRevision(g.state);
    const beakers = (occasion: 'veinFound' | 'discovery' | 'prospect'): number =>
      windfallPayout(g.state, 0, occasion).grants
        .filter((grant) => grant.yield === 'science')
        .reduce((sum, grant) => sum + grant.amount, 0);
    expect(beakers('veinFound')).toBe(25);
    expect(beakers('discovery')).toBe(25);
    // **The asking pays nothing**: `prospect` is the survey, strike or barren,
    // and the row is written on the answer.
    expect(beakers('prospect')).toBe(0);
  });

  it('veinFound — the strike is fired from the survey, and only on a strike', () => {
    const g = game(908);
    found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.statecraft.doctrines.push('masterOfMaps' as never);
    bumpRevision(g.state);
    const hill = (col: number, row: number, seam: boolean) => {
      const tile = getTileAt(g.state.map, col, row)!;
      tile.hills = true;
      delete tile.surveyed;
      delete tile.resource;
      if (seam) tile.vein = 'richOre';
      else delete tile.vein;
      return tile;
    };

    // A barren hill: the assay is paid, the strike never happens, and the
    // Geomancy line is not on the report.
    const barren = hill(2, 2, false);
    const empty = createUnit(g.state, 0, 'worker', 2, 2);
    const before = player.sciencePool;
    const dry = prospectAt(g.state, empty, barren);
    expect(dry.struck).toBeNull();
    expect(player.sciencePool).toBe(before);

    // A seam: the ore surfaces and the occasion fires, into the empire's own
    // bank through the one grant routine.
    const struck = hill(3, 2, true);
    const digger = createUnit(g.state, 0, 'worker', 3, 2);
    const report = prospectAt(g.state, digger, struck);
    expect(report.struck).toBe('richOre');
    expect(struck.resource).toBe('richOre');
    expect(player.sciencePool - before).toBe(25);
    expect(report.lines.some((line) => line.card === 'masterOfMaps')).toBe(true);
  });

  it('Hegemony — the user’s rewrite: a cheap conquest, and ten turns of forges', () => {
    const g = game(909);
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('hegemony' as never);
    bumpRevision(g.state);
    // The row *sets* the price now rather than shifting it, and one is the
    // least the writ allows (`cityCosts` floors it).
    const seized = found(g.state, 1);
    seized.ownerId = 0;
    seized.captured = true;
    bumpRevision(g.state);
    expect(-explainAuthority(g.state, 0).find((l) => l.source.includes('captured'))!.value).toBe(1);

    // And the forges: a capture hangs an ordinary timed effect on the empire,
    // read by the ordinary evaluator and expiring by comparison.
    const player = playerById(g.state, 0)!;
    const payout = windfallPayout(g.state, 0, 'capture');
    expect(payout.timed).toHaveLength(1);
    payWindfallGrants(g.state, player, payout, { col: city.col, row: city.row });
    bumpRevision(g.state);
    const share = (): number =>
      explainCardPercentYields(g.state, city)
        .filter((line) => line.card === 'hegemony')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(share()).toBe(5);
    g.state.turn += 10;
    bumpRevision(g.state);
    expect(share()).toBe(0);
  });

  it('The Pilgrim Ways — the faith fork’s permanent pick', () => {
    const g = game(910);
    const city = found(g.state, 0);
    const theirs = found(g.state, 1);
    playerById(g.state, 0)!.statecraft.doctrines.push('thePilgrimWays' as never);
    bumpRevision(g.state);
    const paid = (key: CityYieldKey, rates = {}): number => foldCardYields(
      explainCardEmpireYields(g.state, 0, rates).filter((line) => line.card === 'thePilgrimWays'),
    )[key];
    // An empire that has founded nothing counts nothing — the honest answer
    // rather than a guard.
    expect(paid('faith')).toBe(0);
    const religion = foundReligion(g.state, playerById(g.state, 0)!);
    city.followers = { [religion.id]: city.population };
    expect(paid('faith')).toBe(2);
    expect(paid('culture')).toBe(0);
    // The tide, counted where it has reached: a foreign town that keeps your
    // faith pays the culture clause as well as the faith one.
    theirs.followers = { [religion.id]: theirs.population };
    expect(paid('faith')).toBe(4);
    expect(paid('culture')).toBe(1);
    // And the conversion Divine Mandate gave up, read off the turn's rate.
    expect(paid('culture', { faithPerTurn: 20 })).toBe(1 + 4);
  });

  it('The Natural Philosophers — the capital’s shelves, and a technology’s song', () => {
    const g = game(911);
    const capital = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('theNaturalPhilosophers' as never);
    bumpRevision(g.state);
    const beakers = (city: City): number =>
      explainCardCityYields(g.state, city)
        .filter((line) => line.card === 'theNaturalPhilosophers')
        .reduce((sum, line) => sum + line.science, 0);
    capital.buildings = [];
    bumpRevision(g.state);
    expect(beakers(capital)).toBe(0);
    capital.buildings = ['monument'];
    bumpRevision(g.state);
    expect(beakers(capital)).toBe(1);
    capital.buildings = ['monument', 'granary', 'shrine', 'barracks', 'library'];
    bumpRevision(g.state);
    expect(beakers(capital)).toBe(5);
    // Something that actually sings, so the share of a turn is not zero and the
    // grant is not dropped as an empty line.
    capital.buildings.push('amphitheater', 'forum', 'steleOfLaws');
    bumpRevision(g.state);
    // The technology's boon is a **share of a turn**, read off the empire's own
    // rate at the moment the node lands and composed once, before anything is
    // banked (Entry XVIII.5) — so the preview, the bank and the announcement are
    // one figure. Exact since batch X: a fifth of a turn is a fifth, not zero.
    const rate = foldEmpireRates(g.state, 0).culturePerTurn ?? 0;
    expect(rate).toBeGreaterThan(0);
    expect(windfallPayout(g.state, 0, 'tech').grants).toEqual([
      {
        card: 'theNaturalPhilosophers',
        source: 'Doctrine · The Natural Philosophers',
        yield: 'culture',
        amount: rate * 0.2,
      },
    ]);
    // The occasion is the whole of the gate.
    expect(windfallPayout(g.state, 0, 'kill').grants).toEqual([]);
  });

  it('The Deep Delving — the workings, and what a surfaced seam is worth', () => {
    const g = game(912);
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.doctrines.push('theDeepDelving' as never);
    bumpRevision(g.state);
    const tile = ownedTiles(g.state, city).find((t) => t.col !== city.col || t.row !== city.row)!;
    tile.feature = 'none';
    const hammers = (): number =>
      explainTileYield(tile, yieldContextFor(g.state, 0))
        .filter((line) => line.source.includes('Deep Delving'))
        .reduce((sum, line) => sum + line.production, 0);
    tile.improvement = 'farm';
    expect(hammers()).toBe(0);
    tile.improvement = 'quarry';
    expect(hammers()).toBe(1);
    tile.improvement = 'mine';
    expect(hammers()).toBe(1);
    // The seam's own line, on top of the workings': a mine on rich ore is what
    // a survey was for.
    tile.resource = 'richOre';
    expect(hammers()).toBe(3);
    // And the strike itself pays the treasury.
    expect(windfallPayout(g.state, 0, 'veinFound').grants).toEqual([
      { card: 'theDeepDelving', source: 'Doctrine · The Deep Delving', yield: 'gold', amount: 40 },
    ]);
  });

  it('seats the three new rows in the tier-18 pool, and leaves the seal alone', () => {
    const pool = poolDoctrines(18);
    for (const id of ['thePilgrimWays', 'theNaturalPhilosophers', 'theDeepDelving'] as never[]) {
      expect(pool.includes(id), id).toBe(true);
      expect(doctrineDef(id).tier, id).toBe(18);
      expect(doctrineDef(id).effects.length, id).toBeGreaterThan(0);
    }
    // Eleven rows at the fork, every line with a permanent pick.
    expect(pool.length).toBe(11);
    // Section 3's seal proposal was vetoed by the user (2026-09-05): a card you
    // want to slot in and out is skill expression, so every shelf still seals
    // for the table's own five turns.
    const g = game(913);
    expect(sealTurnsFor(g.state, 0)).toBe(STATECRAFT.meter.sealTurns);
    expect(STATECRAFT.meter.sealTurns).toBe(5);
  });

  it('moves the two rarity marks the pass ruled', () => {
    // The ○ mark is meant to be exactly the rule-changers: Cistern Works is the
    // best of them in Government II, and Mandate of Heaven is large rather than
    // rule-changing. The doc's marks are pinned against these by
    // `statecraftDocSync.test.ts`.
    // Batch F made the cistern an uncommon on the user's mark
    // (`docs/history/orders-pass-3.md` §9's ruled table), which is a move of the bag and
    // the reason this batch bumps the schema.
    expect(orderDef('cisternWorks').rarity).toBe('uncommon');
    expect(orderDef('mandateOfHeaven').rarity).toBe('uncommon');
  });

  it('prints every changed and new row in the words the fork ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('ironPrice')).toEqual([
      'killing a unit grants +20 culture',
      'pillaging pays +100%',
    ]);
    expect(said('hegemony')).toEqual([
      'the authority a captured city costs is 1',
      'capturing a city grants +5% production in every city for 10 turns',
    ]);
    expect(said('thePilgrimWays')).toEqual([
      '+2 faith per city that follows you',
      '+1 culture per foreign city that follows you',
      '+1 culture per 5 faith gained per turn',
    ]);
    expect(said('theNaturalPhilosophers')).toEqual([
      '+1 science in your capital per building in this city',
      "completing a technology grants 20% of a turn's culture",
    ]);
    expect(said('theDeepDelving')).toEqual([
      '+1 production on every hex with a Mine',
      '+1 production on every hex with a Quarry',
      'surfacing a vein grants +40 gold',
      '+2 production on every hex with a Mine carrying Rich Ore',
    ]);
  });
});

/**
 * **A card that opens a building says what the building does** — the
 * playthrough note of 2026-09-05 (`docs/flags.md`), which is a complaint about a
 * card that told a player the *name* of a thing and nothing else: "Unlocks the
 * Chapel." is a charter's whole ratified face, and a player deciding whether to
 * spend a slot on it could not know what a Chapel was.
 *
 * The composition is `describeBuildingRow`, the simulation's one reading of a
 * building row, and every claim below is about that being **one** describer: the
 * card face, the collection, the stamp's hover and the Compendium's shelf all
 * print it, so a re-cut building re-prints itself on all four in the same pass
 * and none of them can drift.
 */
describe('a charter carries the description of the building it opens', () => {
  /** Every card row that opens a building, whatever class it belongs to. */
  const OPENERS: { card: string; building: BuildingId }[] = [
    ...ORDER_IDS.flatMap((id) =>
      orderDef(id)
        .effects.filter((effect) => effect.kind === 'unlocksBuilding')
        .map((effect) => ({ card: id as string, building: effect.building })),
    ),
    ...DOCTRINE_IDS.flatMap((id) =>
      doctrineDef(id)
        .effects.filter((effect) => effect.kind === 'unlocksBuilding')
        .map((effect) => ({ card: id as string, building: effect.building })),
    ),
  ];

  it('finds the twelve rows that open one', () => {
    // Eleven charters and the Gilded Court's doctrine. A twelfth charter joins
    // this list by being a JSON row, and inherits every claim below.
    expect(OPENERS.length).toBe(12);
  });

  it('says every live clause the building’s own describer says', () => {
    for (const { card, building } of OPENERS) {
      const clause = describeCard(card as never)
        .map((entry) => entry.text)
        .find((text) => text.includes('unlocks the '));
      expect(clause, card).toBeDefined();
      // The building is **named as a keyword**, so a reader can open its page
      // from the card and the Compendium resolves the mark to a real entry.
      expect(clause, card).toContain(`[[building:${building}|`);
      // And every live clause of the row's own description is in the sentence,
      // word for word: the card does not paraphrase the building.
      const said = stripRefs(clause!);
      const row = describeBuildingRow(building).filter((entry) => entry.deferred !== true);
      expect(row.length, building).toBeGreaterThan(0);
      for (const entry of row) expect(said, `${card} → ${building}`).toContain(stripRefs(entry.text));
      // A deferred half is printed struck through where it is printed, and
      // there is no striking half of a sentence — so it stays out of this one.
      for (const entry of describeBuildingRow(building)) {
        if (entry.deferred !== true) continue;
        expect(said, `${card} → ${building}`).not.toContain(stripRefs(entry.text));
      }
      // Nothing leaks the mark's own syntax onto a surface (`stripRefs`, and
      // the sweep in `test/ui/keywords.test.ts`).
      expect(said, card).not.toContain('[[');
    }
  });

  it('composes at print time and leaves the ratified text alone', () => {
    // The data still says what was ratified — the description is **not** written
    // into the row, which is what makes a re-cut building re-print itself.
    expect(orderDef('ritesCharter').text).toBe('Unlocks the Chapel.');
    const said = describeCard('ritesCharter').map((entry) => stripRefs(entry.text));
    expect(said).toEqual(['unlocks the Chapel — +1 faith; a rite performed in this city pays +5 culture']);
  });

  it('reads the half of a building row that no card effect models', () => {
    // The eight fields `buildingEffects.ts` reads and the card vocabulary does
    // not: before this pass they reached a player only as prose in the row's own
    // `note`, or not at all. One row each, in the ledger's own terms.
    const words = (id: BuildingId): string =>
      describeBuildingRow(id)
        .map((entry) => stripRefs(entry.text))
        .join(' · ');
    expect(words('chapel')).toContain('a rite performed in this city pays +5 culture');
    expect(words('keep')).toContain('+5 healing');
    expect(words('assizeCourt')).toContain('15% less');
    expect(words('assayHouse')).toContain('costs 5% less');
    expect(words('cistern')).toContain('beside fresh water');
    expect(words('almshouse')).toContain('bought with faith');
    expect(words('gildedHall')).toContain('bought with gold and never built');
    // And the flat voices lead it, because that is what a building mostly is.
    // Two since batch D took a quarter off the ordinary flats
    // (`docs/balance-turn.md` §4a); the jar's shape is now its growth rebate.
    expect(describeBuildingRow('granary')[0]!.text).toBe('+2 food');
  });

  it('describes every building row in the game, not only the charters’', () => {
    for (const id of BUILDING_IDS) {
      const said = describeBuildingRow(id);
      expect(said.length, id).toBeGreaterThan(0);
      for (const clause of said) expect(stripRefs(clause.text), id).not.toContain('[[');
    }
    // The ungated line a building pays on the ground it works is the row's own,
    // not a technology's gift — the Lighthouse's food on water.
    expect(describeBuildingRow('lighthouse').map((entry) => entry.text)).toContain(
      '+1 food on every water hex',
    );
    // Every ungated ground line a row pays is stated, naming the hexes it lands
    // on in the card describer's own words for that condition. A **gated** line
    // belongs to the node that hands it over and is announced there
    // (`techGifts`), so nothing here promises one before it exists.
    for (const id of BUILDING_IDS) {
      const said = describeBuildingRow(id)
        .map((entry) => stripRefs(entry.text))
        .join(' · ');
      for (const line of buildingDef(id).tileYields ?? []) {
        const ground = `on every ${stripRefs(tileConditionWords(line.on))}`;
        if (line.requiresTech === undefined) expect(said, id).toContain(ground);
        else expect(said, `${id} ← ${line.requiresTech}`).not.toContain(ground);
      }
    }
  });
});

// --- the remembered walk ----------------------------------------------------

/**
 * Batch 10 of `docs/bot-priorities.md` in tests, re-aimed by batch E3a.
 *
 * `liveEffects` is asked six figures of times a turn late in a game and answers
 * at most two distinct lists per instant, so since batch 10 it remembers one per
 * seat per state (`liveReading`). A memo is a promise about *when it is wrong*,
 * and every test here is one way of being wrong.
 *
 * **What changed.** Until E3a the promise was kept by a print of everything the
 * seat holds, re-read on every ask, plus a re-ask of every gate the build
 * consulted. E2 gave the simulation `GameState.revision` — raised by
 * `applyCommand` on every accepted command and once per end-of-turn phase — and
 * the promise is now the counter's: *a reading is taken at rest; whoever moves
 * the state moves the revision*. So each case below moves the world and then
 * says so, exactly as a command does, and the gate case is the one that used to
 * need a notebook and now needs nothing at all.
 */
describe('the remembered walk', () => {
  /** The lines one seat's law puts on the table, as plain strings. */
  function lawOf(state: GameState, playerId: number): string[] {
    return liveEffects(state, playerId).map(
      (entry) => `${entry.source} :: ${JSON.stringify(entry.effect)}`,
    );
  }

  it('hands the same list back twice, and a fresh one when a card is slotted', () => {
    const { state } = game();
    found(state, 0);
    // The memo actually memoises: two asks with nothing between them are the
    // same array, not two builds of it.
    expect(liveEffects(state, 0)).toBe(liveEffects(state, 0));
    const before = lawOf(state, 0);
    slot(state, 0, 'theBannerCall');
    const after = lawOf(state, 0);
    expect(after.length).toBeGreaterThan(before.length);
    expect(after.slice(0, before.length)).toEqual(before);
  });

  it('holds one list per seat until the revision moves, and drops it when it does', () => {
    // The whole of the key, in one test: the state object, the revision, the
    // seat. A second seat is a second entry, not a second build of the first.
    const { state } = game();
    found(state, 0);
    const held = liveEffects(state, 0);
    expect(liveEffects(state, 1)).not.toBe(held);
    expect(liveEffects(state, 0)).toBe(held);
    bumpRevision(state);
    const fresh = liveEffects(state, 0);
    expect(fresh).not.toBe(held);
    // A fresh object, and the same answer: the memo is a cache and never a rule.
    expect(lawOf(state, 0)).toEqual(
      held.map((entry) => `${entry.source} :: ${JSON.stringify(entry.effect)}`),
    );
    expect(fresh).toBe(liveEffects(state, 0));
  });

  it('moves with an accepted command and stands still on a refused one', () => {
    // The counter is the simulation's own announcement, so the ordinary way a
    // list goes stale is a command — no bench, no bump, nothing hand-written.
    const g = game();
    found(g.state, 0);
    const held = liveEffects(g.state, 0);
    expect(dispatch(g, { type: 'fortify', playerId: 0, unitId: 99_999 }).ok).toBe(false);
    expect(liveEffects(g.state, 0)).toBe(held);
    expect(dispatch(g, { type: 'chooseResearch', playerId: 0, techId: 'mining' }).ok).toBe(true);
    expect(liveEffects(g.state, 0)).not.toBe(held);
  });

  it('drops a rite the turn it runs out', () => {
    const { state } = game();
    found(state, 0);
    const seat = playerById(state, 0)!;
    seat.timed = [
      { card: 'riteOfPlenty', effect: { kind: 'happiness', amount: 2 }, expiresTurn: state.turn + 1 },
    ];
    bumpRevision(state);
    expect(lawOf(state, 0).some((line) => line.includes('turns left'))).toBe(true);
    // An expiry is a comparison, never a countdown — so the turn moving is the
    // whole of what changes. In a real game the turn moves inside a phase and
    // the phase raises the counter; here the bench raises it.
    state.turn += 1;
    bumpRevision(state);
    expect(lawOf(state, 0).some((line) => line.includes('turns left'))).toBe(false);
  });

  it('drops a legacy the turn it is revoked', () => {
    const { state } = game();
    found(state, 0);
    const seat = playerById(state, 0)!;
    seat.legacies.push({ id: 'imhotep', age: 1 });
    bumpRevision(state);
    expect(lawOf(state, 0).some((line) => line.includes('Imhotep'))).toBe(true);
    // Revocation is a marking, never a deletion: the record stays in spend
    // order and the flag is the whole of the reading side.
    seat.legacies[0]!.revoked = true;
    bumpRevision(state);
    expect(lawOf(state, 0).some((line) => line.includes('Imhotep'))).toBe(false);
  });

  it('follows a gate that flipped with none of its own inputs changing', () => {
    const { state } = game();
    found(state, 0);
    // The Banner-Call pays while you are at war, and `state.wars` is nothing
    // the walk itself reads — it is reached through `empireConditionHolds`, off
    // a meter's own reading of the board. This was the case no print could
    // cover and the reason a build used to write down every gate it opened; the
    // counter covers it for nothing, because a meter that moved moved because
    // the board did.
    slot(state, 0, 'theBannerCall');
    const atWar = lawOf(state, 0);
    expect(atWar.some((line) => line.includes('Banner-Call'))).toBe(true);
    closeWar(state, 0, 1);
    bumpRevision(state);
    const atPeace = lawOf(state, 0);
    expect(atPeace.some((line) => line.includes('Banner-Call'))).toBe(false);
    openWar(state, 0, 1);
    bumpRevision(state);
    expect(lawOf(state, 0)).toEqual(atWar);
  });

  it('follows a wonder to the empire that takes the town it stands in', () => {
    const { state } = game();
    const city = found(state, 0)!;
    city.buildings.push('theOracle');
    bumpRevision(state);
    state.wonders.push({ building: 'theOracle', playerId: 0, cityId: city.id, turn: state.turn });
    bumpRevision(state);
    const held = lawOf(state, 0);
    expect(held.some((line) => line.startsWith('Wonder'))).toBe(true);
    expect(lawOf(state, 1).some((line) => line.startsWith('Wonder'))).toBe(false);
    // Pay follows the stones. The claim register never moves, so the walk's
    // reading of it is the owning town's `buildings`, town by town.
    city.ownerId = 1;
    bumpRevision(state);
    expect(lawOf(state, 0).some((line) => line.startsWith('Wonder'))).toBe(false);
    expect(lawOf(state, 1).some((line) => line.startsWith('Wonder'))).toBe(true);
  });

  it('keeps the memo out of the snapshot, and out of the next game', () => {
    const { state } = game();
    found(state, 0);
    const clean = snapshotState(state);
    void liveEffects(state, 0);
    void liveEffects(state, 1);
    // A cache that reached the snapshot would not be a cache, it would be a
    // rule — `snapshotState` is `JSON.stringify(state)` and every replay in the
    // suite compares it byte for byte.
    expect(snapshotState(state)).toBe(clean);
    // And it is keyed on the state object, so a second game of the same seed
    // reads its own board rather than the first one's answers — two boards at
    // the same revision are still two boards.
    const other = game().state;
    found(other, 0);
    expect(other.revision).toBe(state.revision);
    expect(liveEffects(other, 0)).not.toBe(liveEffects(state, 0));
    expect(lawOf(other, 0)).toEqual(lawOf(state, 0));
  });
});

describe('the memo’s key', () => {
  /**
   * The simulation's own text, read through Vite's raw glob — `cities.ts`'s
   * mid-turn refresh register one file over takes the same reading, and for the
   * same reason: this project has no node typings.
   */
  const SIM_SOURCE = import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const statecraftSource = (): string => {
    // The evaluator's own file since batch E3b split the module along its
    // layers; `statecraft.ts` is now the index that re-exports the three, and
    // `liveReading` lives with the walk it remembers.
    const key = Object.keys(SIM_SOURCE).find((path) =>
      path.endsWith('/statecraft/evaluator.ts'),
    )!;
    return SIM_SOURCE[key]!;
  };

  /** One function's body, comments stripped — a docblock is not a reading. */
  function bodyOf(name: string): string {
    const text = statecraftSource();
    const from = text.indexOf(`function ${name}(`);
    expect(`${name} found`).toBe(from === -1 ? `${name} missing` : `${name} found`);
    const end = text.indexOf('\n}', from);
    return text
      .slice(from, end === -1 ? undefined : end)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
  }

  it('keys the law on the board’s own revision', () => {
    // The whole of §3c, in one reading: the memo compares two integers and an
    // object identity, and nothing else. A walk of the seat's holdings in here
    // would be the print come back.
    const body = bodyOf('liveReading');
    expect(body).toMatch(/LIVE_MEMO\.get\(state\)/);
    expect(body).toMatch(/slate\.revision !== state\.revision/);
  });

  it('has no print of the walk’s inputs left in the file', () => {
    // `livePrint`, `printsAgree`, `gatesAgree` and the `asked` notebook they
    // needed are gone rather than unused — a second answer to "is this list
    // still true" is a second thing to keep in step with the walk.
    //
    // The *code*, not the prose: `liveReading`'s own docblock names all three,
    // because a docblock that cannot say what a thing used to be cannot explain
    // why it went.
    const code = statecraftSource()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    for (const name of ['livePrint', 'printsAgree', 'gatesAgree', 'AskedCondition']) {
      expect(`${name}: ${code.includes(name)}`).toBe(`${name}: false`);
    }
  });

  it('keeps the cut and the open reading in separate slots', () => {
    // Two readings of one seat: an empire being *asked about* has every gated
    // clause closed (the module docblock's cut), and an empire being paid does
    // not. One slot for both would answer a meter with the law and the law with
    // the meter's answer.
    expect(bodyOf('liveReading')).toMatch(/conditionDepth > 0/);
  });
});

// --- the engine shapes (batch A of `docs/fewer-things-plan.md`) --------------

/**
 * The seven shapes `docs/history/fewer-things.md` §4 and `docs/history/tech-gifts.md` §7 ruled,
 * proved by **fixtures** rather than by rows.
 *
 * No live card uses any of them — the rows are batches D through F — which is
 * the batch's own acceptance ("byte-identical: no row uses a shape yet") and the
 * reason every test here writes its own card. The fixtures are written by
 * swapping a real Order's `effects` for the length of one test and putting them
 * back, which is the only honest way to exercise the *slot* path: a periodic
 * card's clock lives on its chair, and a chair only ever holds a real row.
 */
describe('the engine shapes', () => {
  /** Runs `body` with these Orders wearing these effects, and puts them back. */
  function withCards(
    rows: readonly (readonly [OrderId, CardEffect[]])[],
    body: () => void,
  ): void {
    const held = rows.map(([id]) => [id, orderDef(id).effects] as const);
    try {
      for (const [id, effects] of rows) {
        (orderDef(id) as { effects: CardEffect[] }).effects = effects;
      }
      body();
    } finally {
      for (const [id, effects] of held) {
        (orderDef(id) as { effects: CardEffect[] }).effects = effects as CardEffect[];
      }
    }
  }

  /** Seats a card in the government's own chair `index`, sealed and free. */
  function seat(state: GameState, playerId: number, index: number, id: OrderId): void {
    const sc = playerById(state, playerId)!.statecraft;
    grant(sc, id);
    sc.slots[index] = { card: id, sealedUntil: state.turn };
    bumpRevision(state);
  }

  // --- 1. the amplifier by voice --------------------------------------------

  it('pays the additive amplifier once per line instance, and says how many lines', () => {
    withCards(
      [
        ['waysideShrines', [
          { kind: 'cityYields', food: 2 },
          { kind: 'cityYields', food: 5 },
        ]],
        ['theChoir', [{ kind: 'cardYieldAmplifier', yield: 'food', amount: 1 }]],
      ],
      () => {
        const g = game();
        const city = found(g.state, 0);
        seat(g.state, 0, 0, 'waysideShrines');
        seat(g.state, 0, 1, 'theChoir');
        const lines = explainCardCityYields(g.state, city);
        // Two food-paying lines on the other card, so the engine pays twice —
        // per line instance, which is the whole of what "additive" bought.
        const engine = lines.find((line) => line.card === 'theChoir')!;
        expect(engine.food).toBe(2);
        expect(engine.source).toContain('2 lines');
        expect(foldCardYields(lines).food).toBe(2 + 5 + 2);
      },
    );
  });

  it('never amplifies its own card, nor anything that is not an Order', () => {
    withCards(
      [['waysideShrines', [
        { kind: 'cityYields', food: 4 },
        { kind: 'cardYieldAmplifier', yield: 'food', amount: 3 },
      ]]],
      () => {
        const g = game();
        const city = found(g.state, 0);
        seat(g.state, 0, 0, 'waysideShrines');
        // A line of the same card, and a line of something that is not an Order
        // at all (an empire-timed effect labelled with the government).
        playerById(g.state, 0)!.timed = [
          {
            card: STARTING_GOVERNMENT,
            effect: { kind: 'cityYields', food: 6 },
            expiresTurn: g.state.turn + 50,
          },
        ];
        bumpRevision(g.state);
        const lines = explainCardCityYields(g.state, city);
        expect(lines.some((line) => line.source.includes('line'))).toBe(false);
        expect(foldCardYields(lines).food).toBe(4 + 6);
      },
    );
  });

  it('takes the multiplicative variant off what the other card printed', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'cityYields', faith: 9 }]],
        ['theChoir', [{ kind: 'cardYieldAmplifier', yield: 'faith', percent: 50 }]],
      ],
      () => {
        const g = game();
        const city = found(g.state, 0);
        seat(g.state, 0, 0, 'waysideShrines');
        seat(g.state, 0, 1, 'theChoir');
        const lines = explainCardCityYields(g.state, city);
        // Exact since batch X: half of nine is four and a half.
        expect(lines.find((line) => line.card === 'theChoir')!.faith).toBe(4.5);
      },
    );
  });

  it('reaches the ground hex by hex, and the empire once', () => {
    withCards(
      [
        ['waysideShrines', [
          { kind: 'tileYield', on: { test: 'hasResource' }, food: 1 },
          { kind: 'empireYields', gold: 3 },
        ]],
        ['theChoir', [{ kind: 'cardYieldAmplifier', yield: 'all', amount: 1 }]],
      ],
      () => {
        const g = game();
        found(g.state, 0);
        seat(g.state, 0, 0, 'waysideShrines');
        seat(g.state, 0, 1, 'theChoir');
        // One more line on the ground, on the *same* condition — so the helping
        // lands on every resource hex, which is the user's own reason for
        // additive being the default.
        const ground = cardTileLines(g.state, 0);
        const helping = ground.find((line) => line.source.includes('Choir'))!;
        expect(helping.on).toEqual({ test: 'hasResource' });
        expect(helping.food).toBe(1);
        // And once, in the empire's books.
        const empire = explainCardEmpireYields(g.state, 0);
        expect(empire.find((line) => line.card === 'theChoir')!.gold).toBe(1);
      },
    );
  });

  it('keeps a scoped amplifier out of the empire fold and off the ground', () => {
    withCards(
      [
        ['waysideShrines', [
          { kind: 'empireYields', gold: 3 },
          { kind: 'tileYield', on: { test: 'hills' }, production: 1 },
        ]],
        ['theChoir', [
          { kind: 'cardYieldAmplifier', yield: 'all', amount: 1, scope: { test: 'capital' } },
        ]],
      ],
      () => {
        const g = game();
        const city = found(g.state, 0);
        seat(g.state, 0, 0, 'waysideShrines');
        seat(g.state, 0, 1, 'theChoir');
        // An empire line lands in no town, and the ground pass holds no town —
        // both stated cuts on the shape.
        expect(explainCardEmpireYields(g.state, 0).some((line) => line.card === 'theChoir')).toBe(false);
        expect(cardTileLines(g.state, 0).some((line) => line.source.includes('Choir'))).toBe(false);
        void city;
      },
    );
  });

  it('does reach the capital’s own ledger, and says which town it landed in', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'cityYields', gold: 2 }]],
        ['theChoir', [
          { kind: 'cardYieldAmplifier', yield: 'gold', amount: 1, scope: { test: 'capital' } },
        ]],
      ],
      () => {
        const g = game();
        const city = found(g.state, 0);
        seat(g.state, 0, 0, 'waysideShrines');
        seat(g.state, 0, 1, 'theChoir');
        const paid = explainCardCityYields(g.state, city).find((line) => line.card === 'theChoir')!;
        expect(paid.gold).toBe(1);
        expect(paid.source).toContain('capital');
      },
    );
  });

  // --- 2. the building percent, and `appliedLast` ----------------------------

  it('raises a class of buildings, and takes the doubler over what the first share left', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'buildingYieldPercent', pays: 'faith', percent: 50 }]],
        ['theChoir', [
          { kind: 'buildingYieldPercent', pays: 'faith', percent: 100, appliedLast: true },
        ]],
      ],
      () => {
        const g = game();
        const city = found(g.state, 0);
        city.buildings.push('temple');
        bumpRevision(g.state);
        seat(g.state, 0, 0, 'waysideShrines');
        seat(g.state, 0, 1, 'theChoir');
        const lines = explainCardBuildingYields(g.state, city);
        // The Temple pays 2 faith. The ordinary share is half of that; the
        // doubler is taken over 2 + 1, which is the ruling ("applies to total
        // yields, including from other effects").
        expect(lines.map((line) => [line.source, line.faith])).toEqual([
          [`Order · ${orderDef('waysideShrines').name}`, 1],
          [`Order · ${orderDef('theChoir').name}`, 3],
        ]);
      },
    );
  });

  it('reads "a faith building" as a row that pays faith, and a category as what it is for', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'buildingYieldPercent', category: 'science', percent: 100 }]],
      ],
      () => {
        const g = game();
        const city = found(g.state, 0);
        city.buildings.push('library', 'temple');
        bumpRevision(g.state);
        city.population = 4;
        seat(g.state, 0, 0, 'waysideShrines');
        const lines = explainCardBuildingYields(g.state, city);
        // Only the Library, and its per-citizen beaker is in the base — the
        // ruled "per-citizen lines included".
        expect(lines).toHaveLength(1);
        // The Library pays two flat and half a beaker a citizen since batch D,
        // floored on its own — a doubling of 2 + 2.
        expect(lines[0]!.science).toBe(2 + 2);
        expect(lines[0]!.faith).toBe(0);
      },
    );
  });

  // --- 3. the `yields` tile test ---------------------------------------------

  it('asks what a hex is worth off the breakdown the caller built, and nothing else', () => {
    const g = game();
    const tile = getTileAt(g.state.map, g.state.units[0]!.col, g.state.units[0]!.row)!;
    const on: TileCondition = { test: 'yields', yield: 'faith' };
    expect(tileConditionHolds(tile, on, () => ({ faith: 1 }))).toBe(true);
    expect(tileConditionHolds(tile, on, () => ({ faith: 0 }))).toBe(false);
    // A caller with nothing to hand in answers no — the stated bargain.
    expect(tileConditionHolds(tile, on)).toBe(false);
  });

  it('reads a belief’s faith on the hex — the asking lines land after the paying ones', () => {
    // The user, 2026-09-07: "+1 faith on every hex that gives faith isn't
    // applying correctly to my desert tiles that have +1 faith from my
    // religion." The Sacred Ground pays on what the hex already pays; the
    // Desert Fathers put the faith there. Both are lines in one fold, and the
    // fold used to take its reading before either had spoken.
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    const tile = getTileAt(g.state.map, (city.col + 1) % g.state.map.width, city.row)!;
    tile.terrain = 'desert';
    tile.hills = false;
    tile.feature = 'none';
    delete tile.resource;
    delete tile.improvement;
    // Bare desert, nothing held: no faith, and The Sacred Ground alone has
    // nothing to pay on.
    slot(g.state, 0, 'theSacredGround');
    expect(explainTileYield(tile, yieldContextFor(g.state, 0)).some((l) => l.faith > 0)).toBe(false);
    // The belief lands first, the Order reads it: two faith, two named lines.
    player.pantheon.beliefs.push('desertFathers');
    bumpRevision(g.state);
    const lines = explainTileYield(tile, yieldContextFor(g.state, 0));
    const faith = lines.reduce((sum, l) => sum + l.faith, 0);
    expect(faith).toBe(2);
    expect(lines.some((l) => l.source.includes(orderDef('theSacredGround').name) && l.faith === 1)).toBe(true);
    // The asking line is the one the fold holds back; the paying line is not.
    expect(tileConditionReadsFold({ test: 'yields', yield: 'faith' })).toBe(true);
    expect(tileConditionReadsFold({ test: 'terrain', terrain: 'desert' })).toBe(false);
    expect(
      tileConditionReadsFold({ test: 'all', of: [{ test: 'terrain', terrain: 'desert' }, { test: 'yields', yield: 'faith' }] }),
    ).toBe(true);
  });

  // --- 4. the slot-position reader -------------------------------------------

  it('keeps the slots array and the layout in one order, index for index', () => {
    const g = game();
    const sc = playerById(g.state, 0)!.statecraft;
    expect(slotTypesOf(sc)).toHaveLength(sc.slots.length);
    seat(g.state, 0, 1, 'waysideShrines');
    // The chair's flavour, never the card's: Wayside Shrines is a wildcard row
    // sitting in the economic chair, and the position card is paid for where the
    // player put it.
    expect(slotTypesOf(sc)[1]).toBe('economic');
    expect(orderAtSlotPosition(sc, 1, 'economic')).toBe('waysideShrines');
    expect(orderAtSlotPosition(sc, 1, 'military')).toBeNull();
    expect(orderAtSlotPosition(sc, 1)).toBeNull();
    expect(orderAtSlotPosition(sc, 9, 'economic')).toBeNull();
  });

  it('pays the Order in the first economic chair twice over', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'cityYields', food: 3, gold: 2 }]],
        ['theChoir', [{ kind: 'slotPosition', slot: 'economic', position: 1, factor: 2 }]],
      ],
      () => {
        const g = game();
        const city = found(g.state, 0);
        seat(g.state, 0, 1, 'waysideShrines');
        seat(g.state, 0, 0, 'theChoir');
        const lines = explainCardCityYields(g.state, city);
        const again = lines.find((line) => line.card === 'theChoir')!;
        expect([again.food, again.gold]).toEqual([3, 2]);
        expect(again.source).toContain(orderDef('waysideShrines').name);
      },
    );
  });

  // --- 5. the periodic occasion and its shortener ----------------------------

  it('stamps an absolute turn, fires on it, and re-stamps — nothing ticks', () => {
    withCards(
      [['waysideShrines', [{ kind: 'periodic', everyTurns: 5, pays: 'gold', amount: 10 }]]],
      () => {
        const g = game();
        found(g.state, 0);
        const player = playerById(g.state, 0)!;
        seat(g.state, 0, 0, 'waysideShrines');
        g.state.turn = 1;
        const gold = player.gold;
        runPeriodicBoons(g.state);
        // The first phase after the placing stamps and pays nothing.
        expect(player.statecraft.slots[0]!.nextFiresTurn).toBe(6);
        expect(player.statecraft.slots[0]!.firePeriod).toBe(5);
        expect(player.gold).toBe(gold);
        g.state.turn = 5;
        runPeriodicBoons(g.state);
        expect(player.gold).toBe(gold);
        g.state.turn = 6;
        runPeriodicBoons(g.state);
        expect(player.gold).toBe(gold + 10);
        expect(player.statecraft.slots[0]!.nextFiresTurn).toBe(11);
      },
    );
  });

  it('moves an outstanding stamp by the change in period, both ways, and floors at two', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'periodic', everyTurns: 5, pays: 'gold', amount: 10 }]],
        ['theChoir', [{ kind: 'periodShorten', turns: 3 }]],
        ['statuteLabour', [{ kind: 'periodShorten', turns: 40 }]],
      ],
      () => {
        const g = game();
        found(g.state, 0);
        const player = playerById(g.state, 0)!;
        const sc = player.statecraft;
        seat(g.state, 0, 0, 'waysideShrines');
        g.state.turn = 1;
        runPeriodicBoons(g.state);
        expect(sc.slots[0]!.nextFiresTurn).toBe(6);
        // Slotting the shortener moves the stamp by the change and by nothing
        // else: five becomes two, so six becomes three.
        seat(g.state, 0, 1, 'theChoir');
        g.state.turn = 2;
        runPeriodicBoons(g.state);
        expect(sc.slots[0]!.nextFiresTurn).toBe(3);
        expect(sc.slots[0]!.firePeriod).toBe(2);
        // Taking it out again puts the stamp back — symmetric and reversible.
        sc.slots[1] = null;
        bumpRevision(g.state);
        runPeriodicBoons(g.state);
        expect(sc.slots[0]!.nextFiresTurn).toBe(6);
        expect(sc.slots[0]!.firePeriod).toBe(5);
        // The floor is on the period, never on the stamp: forty turns off a
        // five-turn clock is two, not minus thirty-five.
        seat(g.state, 0, 1, 'statuteLabour');
        runPeriodicBoons(g.state);
        expect(sc.slots[0]!.firePeriod).toBe(2);
        expect(sc.slots[0]!.nextFiresTurn).toBe(3);
      },
    );
  });

  it('sizes a boon by a count, and refuses to feed itself off the empire’s books', () => {
    withCards(
      [
        ['waysideShrines', [
          { kind: 'periodic', everyTurns: 2, pays: 'faith', count: 'cities', amount: 3 },
        ]],
        ['theChoir', [
          {
            kind: 'periodic',
            everyTurns: 2,
            pays: 'faith',
            count: 'empireYield',
            voice: 'production',
            amount: 1,
          },
        ]],
      ],
      () => {
        const g = game();
        found(g.state, 0);
        const player = playerById(g.state, 0)!;
        seat(g.state, 0, 0, 'waysideShrines');
        g.state.turn = 1;
        runPeriodicBoons(g.state);
        g.state.turn = 3;
        const faith = player.faithPool;
        runPeriodicBoons(g.state);
        expect(player.faithPool).toBe(faith + 3);
        // The ledger count: it reads the books, and reading the books reads the
        // cards, so the cut is what keeps it from being a loop with no answer.
        seat(g.state, 0, 1, 'theChoir');
        g.state.turn = 4;
        runPeriodicBoons(g.state);
        g.state.turn = 6;
        const before = player.faithPool;
        runPeriodicBoons(g.state);
        expect(player.faithPool - before).toBe(
          3 + Math.max(0, Math.floor(foldEmpireRates(g.state, 0).productionPerTurn ?? 0)),
        );
      },
    );
  });

  it('rides on the calendar for a card that has no chair', () => {
    const g = game();
    found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.timed = [
      {
        card: STARTING_GOVERNMENT,
        effect: { kind: 'periodic', everyTurns: 4, pays: 'science', amount: 7 },
        expiresTurn: 999,
      },
    ];
    bumpRevision(g.state);
    g.state.turn = 7;
    const banked = player.sciencePool;
    runPeriodicBoons(g.state);
    expect(player.sciencePool).toBe(banked);
    g.state.turn = 8;
    runPeriodicBoons(g.state);
    expect(player.sciencePool).toBe(banked + 7);
  });

  it('composes a boon’s riders into one printed figure before it is banked', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'periodic', everyTurns: 2, pays: 'gold', amount: 10 }]],
        ['theChoir', [
          { kind: 'windfallRider', occasion: 'periodic', percent: 100 } as CardWindfallRiderEffect,
        ]],
      ],
      () => {
        const g = game();
        found(g.state, 0);
        const player = playerById(g.state, 0)!;
        seat(g.state, 0, 0, 'waysideShrines');
        seat(g.state, 0, 1, 'theChoir');
        g.state.turn = 1;
        runPeriodicBoons(g.state);
        g.state.turn = 3;
        const gold = player.gold;
        runPeriodicBoons(g.state);
        expect(player.gold).toBe(gold + 20);
      },
    );
  });

  // --- 6. the city renown percent -------------------------------------------

  it('adds a share of one town’s own trickle, naming no family', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('library', 'market');
    bumpRevision(g.state);
    const plain = foldRenown(explainCityRenown(city));
    const raised = explainCityRenown(city, [{ source: 'Heroic Epic', percent: 50 }]);
    expect(foldRenown(raised)).toBe(plain + Math.floor((plain * 50) / 100));
    expect(raised[raised.length - 1]!.family).toBeNull();
    // A share of nothing is no line at all.
    expect(explainCityRenown(city, [{ source: 'X', percent: 0 }])).toHaveLength(2);
  });

  it('reads the share off a card, through the empire’s own ledger', () => {
    withCards(
      [['waysideShrines', [{ kind: 'cityRenownPercent', percent: 100 }]]],
      () => {
        const g = game();
        const city = found(g.state, 0);
        city.buildings.push('library');
        bumpRevision(g.state);
        const before = foldRenown(explainRenown(g.state, 0));
        seat(g.state, 0, 0, 'waysideShrines');
        expect(foldRenown(explainRenown(g.state, 0))).toBe(before + 1);
      },
    );
  });

  // --- 7. yields on the route itself -----------------------------------------

  it('puts a card’s yields on the caravan, where a doubler can find them', () => {
    withCards(
      [['waysideShrines', [{ kind: 'routeYield', food: 1, production: 2 }]]],
      () => {
        const g = game();
        const from = found(g.state, 0);
        const to = foundCityAt(
          g.state,
          0,
          getTileAt(g.state.map, (from.col + 5) % g.state.map.width, from.row)!,
        );
        const before = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
        seat(g.state, 0, 0, 'waysideShrines');
        const after = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
        expect(after.food).toBe(before.food + 1);
        expect(after.production).toBe(before.production + 2);
        // And the multiplier finds it: the line is on the route *before* the
        // amplifier reads the fold, which is the whole grammar of the pass.
        playerById(g.state, 0)!.statecraft.government = 'merchantLeague';
        bumpRevision(g.state);
        const doubled = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
        expect(doubled.production).toBe(
          after.production + Math.floor((after.production * 50) / 100),
        );
      },
    );
  });

  it('narrows a route line to the town the caravan left', () => {
    withCards(
      [['waysideShrines', [
        { kind: 'routeYield', gold: 4, origin: { test: 'hasBuilding', building: 'market' } },
      ]]],
      () => {
        const g = game();
        const from = found(g.state, 0);
        const to = foundCityAt(
          g.state,
          0,
          getTileAt(g.state.map, (from.col + 5) % g.state.map.width, from.row)!,
        );
        seat(g.state, 0, 0, 'waysideShrines');
        const shut = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
        from.buildings.push('market');
        bumpRevision(g.state);
        const open = foldRouteYield(explainRouteYieldBetween(g.state, from, to));
        // The market itself pays a caravan nothing in gold, so the whole
        // difference is the card's line.
        expect(open.gold - shut.gold).toBe(4);
      },
    );
  });

  // --- 8. the reroll tally ----------------------------------------------------

  it('counts the rerolls this chair has watched, and nought until batch C1 writes one', () => {
    const g = game();
    seat(g.state, 0, 0, 'waysideShrines');
    const sc = playerById(g.state, 0)!.statecraft;
    const probe: CardEffect = {
      kind: 'countScaled',
      count: 'rerollsWhileSlotted',
      pays: { to: 'yield', yield: 'faith', amount: 1, where: 'empire' },
    };
    expect(countOf(g.state, 0, 'waysideShrines', probe as never)).toBe(0);
    sc.slots[0]!.rerollsSeen = 3;
    expect(countOf(g.state, 0, 'waysideShrines', probe as never)).toBe(3);
    // The counter belongs to the chair: benching the card ends the watch.
    sc.slots[0] = null;
    bumpRevision(g.state);
    expect(countOf(g.state, 0, 'waysideShrines', probe as never)).toBe(0);
  });

  it('counts buildings across two categories at once', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('library', 'temple', 'market');
    bumpRevision(g.state);
    const probe = (categories?: string[]): CardEffect => ({
      kind: 'countScaled',
      count: 'buildingsOfCategories',
      categories: categories as never,
      pays: { to: 'yield', yield: 'faith', amount: 1, where: 'empire' },
    });
    expect(countOf(g.state, 0, 'waysideShrines', probe(['science', 'faith']) as never)).toBe(2);
    // A row that never said which buildings counts none of them.
    expect(countOf(g.state, 0, 'waysideShrines', probe() as never)).toBe(0);
  });

  // --- the register ----------------------------------------------------------

  it('words every one of the new shapes, with no clause left silent', () => {
    const fixtures: CardEffect[] = [
      { kind: 'cardYieldAmplifier', yield: 'food', amount: 1 },
      { kind: 'cardYieldAmplifier', yield: 'faith', percent: 50, scope: { test: 'capital' } },
      { kind: 'buildingYieldPercent', pays: 'faith', percent: 100, appliedLast: true },
      { kind: 'buildingYieldPercent', category: 'gold', percent: 50, yield: 'gold' },
      { kind: 'slotPosition', slot: 'economic', position: 1, factor: 2 },
      { kind: 'periodic', everyTurns: 10, pays: 'gold', amount: 25 },
      {
        kind: 'periodic',
        everyTurns: 15,
        pays: 'renown',
        count: 'buildingsOfCategories',
        categories: ['science', 'faith'],
      },
      { kind: 'periodic', everyTurns: 7, pays: 'science', count: 'empireYield', voice: 'production' },
      { kind: 'periodShorten', turns: 3 },
      { kind: 'cityRenownPercent', percent: 50 },
      { kind: 'routeYield', food: 1, production: 1, origin: { test: 'hasBuilding', building: 'market' } },
      {
        kind: 'countScaled',
        count: 'rerollsWhileSlotted',
        pays: { to: 'yield', yield: 'faith', amount: 1, where: 'city' },
      },
    ];
    for (const effect of fixtures) {
      const clauses = describeEffects([effect]);
      expect(clauses.length, effect.kind).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.text, effect.kind).toBeTruthy();
        // Every named thing is a keyword ref, and no surface prints a raw one.
        expect(stripRefs(clause.text).includes('[['), clause.text).toBe(false);
      }
    }
  });

  /**
   * **Which Orders carry an engine shape, in the data file's own row order.**
   *
   * Batch A declared the seven shapes and no row used one; batch F is the pass
   * that wrote them onto the cards (`docs/history/orders-pass-3.md` §9's grammar: put
   * yields on a thing, then multiply the thing). This list is therefore the
   * register the byte-identity claim became — a row that picks up an engine
   * without being written down here fails.
   *
   * The doublers on the **ground** (The Nets' Blessing, The Deep Seams, The
   * Broad Acres, The Salon) are deliberately absent: they are `tileYield`
   * percentages, a shape that predates batch A.
   */
  const ORDERS_USING_A_SHAPE: readonly string[] = [
    'silkRoads · routeYield',
    'ledgerKeepers · routeYield',
    'theSynod · buildingYieldPercent',
    'theConsistory · buildingYieldPercent',
    'theMusterRolls · slotPosition',
    'theHarvestHome · cardYieldAmplifier',
    'theReevesBell · periodic',
    'theFirstChair · slotPosition',
    'theScriveners · buildingYieldPercent',
    'theCountingHouses · buildingYieldPercent',
    'theAlmanacOfHours · periodShorten',
    'theFoundryDays · periodic',
    'theFoundryDays · empireYield',
    'theHighChancery · cardYieldAmplifier',
    'theVotiveTally · rerollsWhileSlotted',
    'theWorkshopsRule · buildingYieldPercent',
    'theWildChair · slotPosition',
    'theCantorsRule · cardYieldAmplifier',
    'theGoldenCenser · periodic',
    'theGoldenCenser · empireYield',
    'theExchangeCharter · buildingYieldPercent',
    'theTriumph · periodic',
    'theTriumph · empireYield',
    'theScholarsRule · cardYieldAmplifier',
    'theAssay · periodic',
    'theAssay · empireYield',
    'theJubilee · periodic',
    'theCompactOfChairs · slotPosition',
    'theCompactOfChairs · slotPosition',
    'theCompactOfChairs · slotPosition',
    'theLaureatesRule · cardYieldAmplifier',
    'theGreatClock · periodShorten',
    'theEncyclopaedists · periodic',
    'theEncyclopaedists · empireYield',
    'theCollegesRule · buildingYieldPercent',
  ];

  it('registers exactly which live rows use each shape batch A declared', () => {
    // **Batch A's byte-identity claim, spent.** A declared nothing, D gave two of
    // the shapes their first rows (the uniques) and E gave the rest theirs — so
    // the acceptance test that used to say *nobody uses one* is now the register
    // of *who does*. A row that quietly picks up an engine shape fails here and
    // has to be written down, which is what the claim was ever protecting.
    const NEW_KINDS = new Set<CardEffectKind>([
      'cardYieldAmplifier',
      'buildingYieldPercent',
      'slotPosition',
      'periodic',
      'periodShorten',
      'cityRenownPercent',
      'routeYield',
    ]);
    const NEW_COUNTS = new Set<string>([
      'buildingsOfCategories',
      'empireYield',
      'rerollsWhileSlotted',
    ]);
    const seen: string[] = [];
    const walk = (effects: readonly CardEffect[] | undefined, where: string): void => {
      for (const effect of effects ?? []) {
        if (NEW_KINDS.has(effect.kind)) seen.push(`${where} · ${effect.kind}`);
        if (effect.kind === 'countScaled' && NEW_COUNTS.has(effect.count)) {
          seen.push(`${where} · ${effect.count}`);
        }
        if (effect.kind === 'periodic' && effect.count !== undefined && NEW_COUNTS.has(effect.count)) {
          seen.push(`${where} · ${effect.count}`);
        }
        if (effect.kind === 'conditionRule') walk(effect.then, where);
      }
    };
    // **Batch F is the deck's turn.** The order pass wrote the engines onto the
    // cards, so the register is the list of which rows carry which shape — in
    // `ORDER_IDS` order, which is the data file's own. A row that quietly picks
    // one up fails here and has to be written down, which is what batch A's
    // byte-identity claim was ever protecting.
    for (const id of [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS]) walk(cardDef(id).effects, id);
    expect(seen).toEqual(ORDERS_USING_A_SHAPE);
    seen.length = 0;

    for (const id of BUILDING_IDS) walk(buildingDef(id).effects, id);
    for (const id of TECH_IDS) walk(techDef(id).effects, id);
    // In `BUILDING_IDS` then `TECH_IDS` order, which is the data files' own.
    expect(seen).toEqual([
      // Batch E — the Water Clock of Su Song, reworked around its own chime.
      'waterClockOfSuSong · periodShorten',
      'waterClockOfSuSong · periodic',
      'waterClockOfSuSong · empireYield',
      // Batch D — two of the five uniques.
      'caravanserai · routeYield',
      'heroicEpic · cityRenownPercent',
      // Batch E — the tree's own gifts (`docs/history/tech-gifts.md` §7).
      'theLongCount · periodic',
      'theLongCount · buildingsOfCategories',
      'horology · periodic',
      'horology · buildingsOfCategories',
      'theSilkRoad · routeYield',
    ]);
  });

  it('keeps the new slot fields absent until something writes one', () => {
    // Absence is nought, so a save from before this batch and a save from after
    // it serialise identically — which is what "no schema bump" means here.
    const g = game();
    seat(g.state, 0, 0, 'waysideShrines');
    expect(snapshotState(g.state)).not.toContain('nextFiresTurn');
    expect(snapshotState(g.state)).not.toContain('firePeriod');
    expect(snapshotState(g.state)).not.toContain('rerollsSeen');
  });
});

// --- batch F, the order pass ------------------------------------------------

/**
 * **The deck, gone over row by row** — `docs/history/orders-pass-3.md` §2 as the user
 * marked it and §9 as it rules, cut into `docs/fewer-things-plan.md` F.
 *
 * The pass retired twenty-four Orders, wrote thirty-four and re-priced every
 * surviving standalone off `docs/balance-turn.md` §3's marked numbers. Nothing
 * here is a new *shape*: batch A declared all seven and this is the pass that
 * puts them on cards.
 *
 * **The census after the pass**, by the role the doc's new column derives
 * (`statecraftDocSync.test.ts` owns the derivation and pins the column):
 *
 * ```
 *   pool             rows     E          P          S
 *   Chiefdom          10     1 (10%)    4 (40%)    5 (50%)
 *   Government I      28     3 (11%)    8 (29%)   17 (61%)
 *   Government II     49    13 (27%)   16 (33%)   20 (41%)
 *   Government III    42     4 (10%)   19 (45%)   19 (45%)
 *   Government IV     20     1 ( 5%)   10 (50%)    9 (45%)
 *   Government V      18     3 (17%)    8 (44%)    7 (39%)
 *   all              167    25 (15%)   65 (39%)   77 (46%)
 * ```
 *
 * Against the ruled 25 / 30 / 45 the standalones land on the number and the
 * engines are ten points light — the deck is payoff-heavy, which is what §9's
 * withdrawal of the line readers cost it and is a design decision for the next
 * markup rather than a bug. **Printed, never asserted**: a share is a thing the
 * user moves by striking rows, and a test that failed when they did would be a
 * test arguing with the designer.
 *
 * The rarity shares, for the same eye — the bag the draw weighs 4 · 2 · 1:
 *
 * ```
 *   Chiefdom        ● 70%   ◆ 20%   ○ 10%
 *   Government I    ● 39%   ◆ 57%   ○  4%
 *   Government II   ● 43%   ◆ 47%   ○ 10%
 *   Government III  ● 50%   ◆ 29%   ○ 21%
 *   Government IV   ● 10%   ◆ 55%   ○ 35%
 *   Government V    ●  6%   ◆ 22%   ○ 72%
 * ```
 *
 * Rarity climbs with the pool, which is the ruling ("rarity should correlate
 * with power/payoff") read up the ladder.
 */
describe('the order pass of 2026-09-06', () => {
  /** Every row the pass wrote or converted, in the data file's own order. */
  const TOUCHED: OrderId[] = [
    'commonGranary', 'saltTithes', 'fireKeepers', 'festivalDays', 'silkRoads', 'theAlmanac',
    'theBalladWeavers', 'theLaureate', 'theRecklessLevy', 'theTaxFarm', 'waysideShrines',
    'cisternWorks', 'lamplighters', 'ledgerKeepers', 'masterMasons', 'oreTithes',
    'pilgrimRoads', 'scholarsStipend', 'starGazers', 'terracedHillsides', 'theArchives',
    'theChoir', 'theGuildCharter', 'theHarvestSongs', 'theLastHunt', 'theOrchardTithe',
    'theReliquaryRolls', 'theShipwrightShores', 'theSynod', 'theTitheOfIron', 'theWarCouncil',
    'clientKings', 'firstFruits', 'mandateOfHeaven', 'provincialMints', 'quarrymensGuild',
    'theAnnalsOfLaw', 'theCensusEternal', 'theDraftingHalls', 'theGoldenScales',
    'theGranaryLaws', 'theGroundskeepers', 'theMasterBuilders', 'theMastersPresence',
    'theWarChest', 'theWayhouses', 'theWonderFeasts', 'tolerationEdicts',
    'assizeCourts', 'cathedralChapters', 'courtAstronomers', 'harbourmasters', 'patrons',
    'scholastics', 'theConsistory', 'theGrainFleet', 'theGuildOfMasons',
    'printingHouses', 'theSalon', 'theInquisition', 'theSilkExchange', 'theGuildCompact',
    'theMagistersCourt', 'universalSuffrage',
    'theMusterRolls', 'theHarvestHome', 'theReevesBell',
    'theFirstChair', 'theScriveners', 'theSacredGround', 'theAssayersRule',
    'theCountingHouses', 'theAlmanacOfHours', 'theFoundryDays', 'theNetsBlessing',
    'theHighChancery', 'theVotiveTally',
    'theWorkshopsRule', 'theWildChair', 'theCantorsRule', 'theGoldenCenser', 'theDeepSeams',
    'theExchangeCharter', 'theTriumph',
    'theScholarsRule', 'theExchequer', 'theAssay', 'theBroadAcres', 'theJubilee',
    'theCompactOfChairs', 'theLaureatesRule', 'theGreatClock', 'theEncyclopaedists',
    'theCollegesRule',
    'theGreatEnquiry', 'theLastLaurels', 'theSaltedEarth', 'theFinalProclamation',
  ] as OrderId[];

  /** The rows the pass withdrew, kept for saves. */
  const RETIRED: OrderId[] = [
    'firstFruitsOffering',
    'charterTowns', 'statuteLabour', 'theBellFounders', 'thePilgrimsPurse',
    'breadAlone', 'publicani', 'riverWardens', 'theLongRoads', 'theMasonsLodge',
    'theQuietFields',
    'frontierForts', 'garrisonState', 'theAlmonersBook', 'theCharterOfTheMarches',
    'theCongregation', 'theDryDocks', 'theFinishersArt', 'thePrizeGrounds',
    'theSaltingHouses', 'theWinteringGrounds',
    'theFactorHouses',
    'manufactories', 'titheBarns',
  ] as OrderId[];

  it('folds every row it touched, in a chair, without moving the state', () => {
    // The blunt claim, and the one that catches a row written against a shape
    // the evaluator cannot read: every card the pass wrote goes into a chair,
    // the whole ledger is folded around it, and the game is byte-identical
    // afterwards. `liveEffects` walking it is what proves the row is *live*.
    for (const id of TOUCHED) {
      const g = game(606);
      const city = found(g.state, 0);
      city.buildings.push('shrine', 'temple', 'library', 'market', 'workshop');
      bumpRevision(g.state);
      refreshCityDerived(g.state, city);
      const before = snapshotState(g.state);
      slot(g.state, 0, id);
      expect(liveEffects(g.state, 0).some((e) => e.card === id), id).toBe(
        orderDef(id).effects.length > 0,
      );
      const quote = explainCity(g.state, city);
      for (const key of CITY_YIELD_KEYS) expect(Number.isFinite(quote.flats[key]), id).toBe(true);
      const paid = foldCity(g.state, city);
      for (const key of CITY_YIELD_KEYS) expect(Number.isFinite(paid[key]), id).toBe(true);
      expect(foldMeter(explainHappiness(g.state, 0)), id).not.toBeNaN();
      expect(foldMeter(explainAuthority(g.state, 0)), id).not.toBeNaN();
      // The reading moved nothing: a fold is a question, never a turn.
      //
      // One field did move, and it is the bench's own signature: `revision`,
      // raised because *this* bench slotted a card by hand and announced it the
      // way a command does (batch E3a). So the two prints are compared as
      // boards, with the announcement taken out of both.
      const sc = playerById(g.state, 0)!.statecraft;
      sc.slots.pop();
      sc.orders.splice(sc.orders.indexOf(id), 1);
      const board = (print: string): string => print.replace(/"revision":\d+/, '"revision":0');
      expect(board(snapshotState(g.state)), id).toBe(board(before));
    }
  });

  it('says every touched row in words, with nothing left silent', () => {
    for (const id of TOUCHED) {
      const clauses = describeCard(id);
      const def = orderDef(id);
      // A row with no effect at all is one of the four deferred Æra V Orders,
      // and it still speaks — through its `deferred` line.
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.text, id).toBeTruthy();
        expect(stripRefs(clause.text).includes('[['), `${id}: ${clause.text}`).toBe(false);
      }
      expect(def.text, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
    }
  });

  it('withdraws every cut row from the pools and leaves it readable', () => {
    for (const id of RETIRED) {
      const def = orderDef(id);
      expect(def.retired, id).toBe(true);
      expect(poolOrders(def.pool).includes(id), id).toBe(false);
      expect(livePool(newPlayerStatecraft()).includes(id), id).toBe(false);
      // A withdrawn row keeps its face so a save that holds it still loads, and
      // says out loud that it is withdrawn.
      expect(def.name, id).toBeTruthy();
      expect(def.note, id).toContain('Retired');
      expect(describeCard(id).length, id).toBeGreaterThan(0);
    }
  });

  /**
   * Re-aimed by batch H3 (`docs/audit/orchestrator.md`). It used to pin the four
   * rows as **deferred whole** — the order pass's one debt in the data — and the
   * audit's finding was that a deferred row is still dealt, so four of the last
   * age's rare cards were paying nothing at all. The debt is paid: one shape
   * (`beadPerOccasion`), four deeds, and the test now pins what the rows say
   * rather than that they say nothing.
   */
  it('pays the four Æra V bead Orders on one shape, each on its own deed', () => {
    const deeds: Record<string, string> = {
      theGreatEnquiry: 'lastAgeTechnology',
      theLastLaurels: 'draftPassed',
      theSaltedEarth: 'cityRazed',
      theFinalProclamation: 'proclamationMade',
    };
    const minted = new Set<string>();
    for (const [id, occasion] of Object.entries(deeds)) {
      const def = orderDef(id as OrderId);
      expect(def.effects.length, id).toBe(1);
      const effect = def.effects[0]!;
      expect(effect.kind, id).toBe('beadPerOccasion');
      if (effect.kind !== 'beadPerOccasion') throw new Error('unreachable');
      expect(effect.occasion, id).toBe(occasion);
      // The bead is a **repeatable grant** row, which is the whole of what lets
      // one empire mint it more than once (`BeadGrantDef.repeatable`).
      expect(beadGrantDef(effect.bead).repeatable, id).toBe(true);
      minted.add(effect.bead);
      // Nothing is left struck through on a row that now does what it says.
      expect(def.deferred, id).toBeUndefined();
      // The note keeps the half that is still true — where the card is dealt and
      // where it is earned — and has dropped "Not built".
      expect(def.note, id).toContain('last age');
      expect(def.note, id).not.toContain('Not built');
      expect(def.pool, id).toBe('governmentV');
      expect(poolOrders('governmentV').includes(id as OrderId), id).toBe(true);
    }
    // One bead row each: four cards minting one bead between them would be four
    // cards a player could not tell apart on the rod.
    expect(minted.size).toBe(4);
  });

  it('takes the cap off exactly the two slot-flavour counts §9 named', () => {
    // "with the caps off Ore Tithes and the War Council" — and on nothing else,
    // which is the half a diff cannot show.
    const capped = (id: OrderId): (number | undefined)[] =>
      orderDef(id).effects.flatMap((effect) =>
        effect.kind === 'countScaled' && effect.count === 'slottedOrdersOfSlot'
          ? [effect.max]
          : effect.kind === 'combatLine' && effect.scaled?.count === 'slottedOrdersOfSlot'
            ? [effect.scaled.max]
            : [],
      );
    expect(capped('oreTithes')).toEqual([undefined]);
    expect(capped('theWarCouncil')).toEqual([undefined]);
    // The three readers that keep theirs.
    expect(capped('borderWardens')).toEqual([3]);
    expect(capped('provincialGovernors')).toEqual([4]);
    expect(capped('theGuildCharter')).toEqual([undefined, undefined]);
  });

  it('moves the three rarity marks that changed the bag', () => {
    // A rarity move is a move of the draw, which is why this batch is a schema.
    expect(orderDef('cisternWorks').rarity).toBe('uncommon');
    expect(orderDef('theConsistory').rarity).toBe('rare');
    expect(orderDef('theInquisition').rarity).toBe('rare');
  });
});

/**
 * **Batch G — cadence and chairs** (`docs/fewer-things-plan.md` row G;
 * `docs/history/fewer-things.md` §1 "The levers" and §6 item 9, ruled by the user on the
 * third pass, 2026-09-06). The last batch of the fewer-things pass and the one
 * that turns dials rather than writing rows: the deck was finished in batch F,
 * so the two numbers that say *how often a card arrives* and *how many can sit
 * down* are set against the finished deck.
 *
 * Both are pinned here, off the data, because both are rulings rather than
 * measurements — the pacing harness reports the turns a scripted empire drafts
 * on and asserts nothing about them (the user, 2026-09-06: "stop using scripted
 * bots for measuring changes"), so the ruled figures need a home that fails when
 * somebody edits the sheet.
 */
describe('the cadence and the chairs, as ruled on the third pass', () => {
  it('steepens the draft ladder to 12 + 6n + n^2.8', () => {
    // 2.25 → 2.8 (`docs/history/fewer-things.md` §1's lever table, RULED third pass):
    // "20 drafts by t92 → 14; opening drafts land on the same turns (4, 7, 11);
    // late gaps open to 8–10". The other three terms are untouched, and the
    // seal in particular is RULED untouched — a card slotted in and out is skill
    // expression (2026-09-05, re-ruled here).
    expect(STATECRAFT.meter).toEqual({
      costBase: 12,
      costLinear: 6,
      costExponent: 2.8,
      sealTurns: 5,
    });
    // The shape of the ruling, stated as arithmetic rather than as a story.
    // **The opening is untouched**: n^2.25 and n^2.8 are the same number at
    // n = 0 and n = 1, so the first two rungs are byte-identical and the third
    // is dearer by two culture — under a turn's income on any curve, which is
    // why §1 can promise "the opening drafts land on the same turns".
    const OLD = (n: number): number => Math.floor(12 + 6 * n + n ** 2.25);
    expect([0, 1, 2].map(draftCost)).toEqual([12, 19, 30]);
    expect([0, 1, 2].map(OLD)).toEqual([12, 19, 28]);
    // **The late rungs are where the cost lands** — the whole of "20 drafts by
    // t92 becomes 14". The old ladder asked 879 for the twentieth draft; this
    // one asks four and a half times that.
    expect(draftCost(19)).toBe(3932);
    expect(OLD(19)).toBe(879);
  });

  it('takes a quarter off the chairs at tiers 18, 29 and 45, and leaves the early ones alone', () => {
    /** A government's spread, M/E/W, as the doc's Slots column prints it. */
    const spread = (id: GovernmentId): [number, number, number] => {
      const slots = governmentDef(id).slots;
      return [slots.military, slots.economic, slots.wildcard];
    };
    const chairs = (id: GovernmentId): number => spread(id).reduce((sum, n) => sum + n, 0);

    // **Untouched**: the ruling names Government III and up, and the early
    // governments were never the crowded ones — three chairs, then five, then
    // seven, exactly as they stood.
    expect(chairs(STARTING_GOVERNMENT)).toBe(3);
    for (const id of governmentsAtTier(4)) expect(chairs(id), id).toBe(5);
    for (const id of governmentsAtTier(10)) expect(chairs(id), id).toBe(7);

    // **Cut a quarter**: 11 → 8, 13 → 10, 16 → 12. Each is `round(0.75 × old)`,
    // and each government's own M/E/W shape is apportioned off three quarters of
    // its old spread by largest remainder — so the Sultanate is still the
    // soldiers' government and the Merchant League still the counting-house.
    for (const id of governmentsAtTier(18)) expect(chairs(id), id).toBe(8);
    for (const id of governmentsAtTier(29)) expect(chairs(id), id).toBe(10);
    for (const id of governmentsAtTier(45)) expect(chairs(id), id).toBe(12);

    // The nine triples, before → after, printed here because they are the
    // ruling's own answer to "commensurately" and the doc table mirrors them
    // (`docs/orders-and-doctrines.md`, pinned by `statecraftDocSync.test.ts`).
    expect(spread('merchantLeague')).toEqual([1, 4, 3]); // 2/5/4
    expect(spread('imperium')).toEqual([4, 2, 2]); // 5/3/3
    expect(spread('divineMandate')).toEqual([2, 2, 4]); // 3/3/5
    expect(spread('theEstates')).toEqual([2, 4, 4]); // 3/5/5
    expect(spread('theSultanate')).toEqual([5, 2, 3]); // 6/3/4
    expect(spread('theCuria')).toEqual([3, 3, 4]); // 4/4/5
    expect(spread('theCommonwealth')).toEqual([2, 5, 5]); // 3/7/6
    expect(spread('theEmpire')).toEqual([5, 3, 4]); // 7/4/5
    expect(spread('theMagisterium')).toEqual([3, 4, 5]); // 4/5/7

    // **Every flavour keeps a chair** at the cut tiers, which is the half of the
    // ruling a total cannot express: "rounded, every group ≥ 1". The Council of
    // Elders' nought is older than this pass and sits at tier 4, untouched.
    for (const tier of [18, 29, 45]) {
      for (const id of governmentsAtTier(tier)) {
        for (const count of spread(id)) expect(count, id).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// --- the row's own age gate -------------------------------------------------

/**
 * **A row dealt only from its age** (`OrderDef.fromAge`; the user, 2026-09-06:
 * "the era 4 victory cards are showing in the game at age 3, that's a bug, they
 * should only show upon reaching age 4").
 *
 * Governments carry no age gate, so pool V opens whenever the tier ladder
 * says, and the four bead Orders were in an Æra III hand. The gate is the
 * row's and read by `drawablePool` alone: the government's whole shelf
 * (`livePool`) still lists them, the bag the draw deals from does not until
 * the empire's highest age reaches the row's.
 */
describe('an Order dealt only from its age', () => {
  const gated = ORDER_IDS.filter((id) => orderDef(id).fromAge !== undefined);

  it('is the four bead Orders of pool V, gated on the last age', () => {
    expect(gated.map((id) => orderDef(id).name).sort()).toEqual([
      'The Final Proclamation',
      'The Great Enquiry',
      'The Last Laurels',
      'The Salted Earth',
    ]);
    for (const id of gated) {
      expect(orderDef(id).pool, id).toBe('governmentV');
      expect(orderDef(id).fromAge, id).toBe(4);
    }
  });

  it('is on the government’s shelf and out of the bag until the age arrives', () => {
    const g = game();
    const sc = playerById(g.state, 0)!.statecraft;
    sc.government = 'theEmpire';
    bumpRevision(g.state);
    for (const id of gated) {
      expect(livePool(sc), id).toContain(id);
      expect(drawablePool(sc, 3), id).not.toContain(id);
      expect(drawablePool(sc, 4), id).toContain(id);
    }
    // And nothing else in the pool minds the age.
    expect(drawablePool(sc, 1)).toEqual(livePool(sc).filter((id) => !gated.includes(id)));
  });

  it('never deals one to an empire still in an earlier age', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const g = game(seed);
      const player = playerById(g.state, 0)!;
      player.statecraft.government = 'theEmpire';
      bumpRevision(g.state);
      const offer = drawOrderOffer(g.state, player);
      for (const id of offer.options) expect(gated, `seed ${seed}`).not.toContain(id);
    }
  });

  it('keeps the chair of a row already held, whatever the age says', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    player.statecraft.government = 'theEmpire';
    bumpRevision(g.state);
    slot(g.state, 0, gated[0]!);
    expect(player.statecraft.slots.map((s) => s?.card ?? null)).toContain(gated[0]);
    // Held rows leave every pool reading; the gate never touches the holding.
    expect(livePool(player.statecraft)).not.toContain(gated[0]);
  });
});

// --- a building's share counts what the law put on it -----------------------

/**
 * The user, 2026-09-07: *"the Synod — your faith buildings provide 50% more
 * yields — it should count my religion bonuses on my temples, and great people
 * improvements to temples."* A `buildingYieldPercent`'s share is taken of the
 * building's row **plus** every `cityYields` line whose scope names that
 * building (`cardLinesOnBuilding`), whoever wrote it — an Order, a belief, a
 * legacy. The lines themselves are banked once as the cards' own; the share
 * is what widens.
 */
describe('a building’s share counts what the law put on it', () => {
  it('takes the Synod’s half over the temple’s row and The Choir’s culture on it', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('temple');
    bumpRevision(g.state);
    slot(g.state, 0, 'theChoir');
    slot(g.state, 0, 'theSynod');
    const def = buildingDef('temple');
    const synod = explainCardBuildingYields(g.state, city).find((line) => line.card === 'theSynod')!;
    expect(synod).toBeDefined();
    // Half of the row's own culture plus The Choir's three — not half the row alone.
    expect(synod.culture).toBeCloseTo(((def.culture ?? 0) + 3) * 0.5, 10);
    expect(synod.faith).toBeCloseTo((def.faith ?? 0) * 0.5, 10);
    // The Choir's own line is banked once, unchanged.
    const choir = explainCardCityYields(g.state, city).find((line) => line.card === 'theChoir')!;
    expect(choir.culture).toBe(3);
  });

  it('reads a belief on the temple the same way, and nothing scoped to the town alone', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('temple');
    bumpRevision(g.state);
    const onIt = cardLinesOnBuilding(g.state, city, 'temple');
    expect(onIt.culture).toBe(0);
    slot(g.state, 0, 'theChoir');
    expect(cardLinesOnBuilding(g.state, city, 'temple').culture).toBe(3);
    // A monument's line is the monument's, not the temple's.
    expect(cardLinesOnBuilding(g.state, city, 'monument').culture).toBe(0);
  });
});

// --- batch E4a: the deferred rows, first half -------------------------------

/**
 * The clauses the audit of 2026-09-07 ruled *build*
 * (`docs/audit/deferred-rows.md`), one case per row.
 *
 * Each is a data row on a shape that already existed or on one field's worth of
 * new vocabulary, so what is pinned here is that the row **pays what its own
 * text says** on a real bench — not that a shape exists, which the register test
 * above already answers.
 */
describe('the deferred rows of batch E4a', () => {
  it('The Curia pays for every Cathedral the realm has raised', () => {
    const g = game(4101);
    const city = found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'theCuria';
    bumpRevision(g.state);
    const faith = (): number =>
      explainCardEmpireYields(g.state, 0)
        .filter((line) => line.card === 'theCuria')
        .reduce((sum, line) => sum + line.faith, 0);
    // No cathedral, no tithe — a count of nothing pays no line at all.
    expect(faith()).toBe(0);
    city.buildings.push('cathedral');
    bumpRevision(g.state);
    expect(faith()).toBe(6);
  });

  // The Siege Train's own strength line is pinned in `combat.test.ts`, beside
  // Castellany's: a condition about a fight is read where there is a fight.

  it('Blitz hands a killer its walking back, and forbids the trench', () => {
    const g = game(4102);
    const player = playerById(g.state, 0)!;
    const soldier = g.state.units.find(
      (u) => u.ownerId === 0 && isCombatant(unitDef(u.type)),
    )!;
    // The trench first, because it is a refusal and refusals are cheap to read.
    expect(fortifyError(soldier, g.state)).toBeNull();
    player.statecraft.doctrines.push('blitz');
    bumpRevision(g.state);
    expect(fortifyError(soldier, g.state)).toContain('cannot fortify');

    // And the kill. A wild piece is put next door and struck down; the attacker
    // ends the blow with a full purse instead of an empty one.
    const here = getTileAt(g.state.map, soldier.col, soldier.row)!;
    const there = neighborTiles(g.state.map, tileHex(here))
      .map((hex) => getTileAt(g.state.map, hex.col, hex.row)!)
      .find((tile) => !isWaterTerrain(tile.terrain) && !tile.hills)!;
    const wild = createUnit(g.state, 1, 'warrior', there.col, there.row);
    wild.hp = 1;
    soldier.movesLeft = fullMovement(soldier, g.state);
    applyCombat(g.state, soldier.id, { col: there.col, row: there.row });
    expect(g.state.units.some((u) => u.id === wild.id)).toBe(false);
    expect(soldier.movesLeft).toBe(fullMovement(soldier, g.state));
    // One blow a turn is untouched: what came back is the walking.
    expect(soldier.hasAttacked).toBe(true);
  });

  it('Patrons pays renown for the culture houses and for nothing else', () => {
    const g = game(4104);
    const city = found(g.state, 0);
    slot(g.state, 0, 'patrons');
    const paid = (): number =>
      cardRenownLines(g.state, 0)
        .filter((line) => line.card === 'patrons')
        .reduce((sum, line) => sum + line.amount, 0);
    expect(paid()).toBe(0);
    // A granary is not a culture house.
    city.buildings.push('granary');
    bumpRevision(g.state);
    expect(paid()).toBe(0);
    city.buildings.push('monument');
    bumpRevision(g.state);
    expect(paid()).toBe(3);
    city.buildings.push('amphitheater');
    bumpRevision(g.state);
    expect(paid()).toBe(6);
  });

  it('Triumphs banks renown for a town taken, through the one seam that pays it', () => {
    const g = game(4105);
    found(g.state, 0);
    keepTheRites(g.state);
    slot(g.state, 0, 'triumphs');
    const player = playerById(g.state, 0)!;
    const before = player.renownPool;
    const payout = windfallPayout(g.state, 0, 'capture');
    // Composed before anything is banked: the figure is on the payout, printed
    // as its own line, and the culture rider is beside it untouched.
    expect(payout.renown).toEqual([
      { card: 'triumphs', source: expect.stringContaining('Triumphs'), amount: 25 },
    ]);
    payWindfallGrants(g.state, player, payout);
    expect(player.renownPool - before).toBe(25);
  });
});

/**
 * The scope minted by the site ruling of 2026-09-08 (batch T1, flags (uu): "To
 * build petra, you only need to be settled on or adjacent to desert").
 *
 * One behavioural test for the new member and one register beside it, the
 * discipline every scope pass above keeps: the kind-level registers cannot see a
 * *value inside* a shape they already count, so a scope declared and read by
 * nothing would be a switch arm nobody reaches. This one is named by a
 * building's `requiresSite` rather than by a card, which is where the register
 * has to look for it.
 */
describe('terrainBeside — the third ring in the family', () => {
  it('admits the centre and the six around it, and nothing further out', () => {
    const g = game();
    const city = found(g.state, 0);
    const scope = { test: 'terrainBeside', terrain: 'desert' } as const;
    const centre = getTileAt(g.state.map, city.col, city.row)!;
    centre.terrain = 'grassland';
    const around = neighborTiles(g.state.map, tileHex(centre));
    for (const tile of around) tile.terrain = 'grassland';
    expect(cityScopeAdmits(g.state, city, scope)).toBe(false);

    // The ring of six admits it — this is the half `onTerrain` refused.
    around[0]!.terrain = 'desert';
    expect(cityScopeAdmits(g.state, city, scope)).toBe(true);
    expect(cityScopeAdmits(g.state, city, { test: 'onTerrain', terrain: 'desert' })).toBe(false);

    // And so does the centre itself, for the family's reason: a town founded in
    // the sand is not further from the desert than its neighbour is.
    around[0]!.terrain = 'grassland';
    centre.terrain = 'desert';
    expect(cityScopeAdmits(g.state, city, scope)).toBe(true);

    // Ground the borders may one day take in is not ground beside the town —
    // that is `terrainInBorders`, and a different question.
    centre.terrain = 'grassland';
    const far = getTileAt(g.state.map, city.col + 2, city.row)!;
    expect(around.includes(far)).toBe(false);
    far.terrain = 'desert';
    expect(cityScopeAdmits(g.state, city, scope)).toBe(false);
    expect(cityScopeAdmits(g.state, city, { test: 'terrainInBorders', terrain: 'desert' })).toBe(
      false,
    );
  });

  it('is named by a live row — Petra, which the ruling widened', () => {
    const named = new Set<string>();
    const note = (scope: unknown): void => {
      if (!scope || typeof scope !== 'object') return;
      const test = (scope as { test?: string }).test;
      if (test !== undefined) named.add(test);
      for (const inner of (scope as { of?: unknown[] }).of ?? []) note(inner);
    };
    for (const id of BUILDING_IDS) note(buildingDef(id).requiresSite);
    expect(named.has('terrainBeside')).toBe(true);
    // Petra's own row, so the ruling cannot be quietly moved off it.
    expect(buildingDef('petra').requiresSite).toEqual({
      test: 'terrainBeside',
      terrain: 'desert',
    });
  });
});
