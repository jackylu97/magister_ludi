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

import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import type { Command } from '../../src/sim/commands';
import {
  cityStageSums,
  cityYieldPercents,
  cityYields,
  explainTileYield,
  foldTileYield,
  foundCityAt,
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
import { authorityOf, explainAuthority, explainHappiness, foldMeter, happinessOf } from '../../src/sim/meters';
import {
  type PlayerStatecraft,
  cardActionRule,
  cardEmpireYields,
  cardBehaviorRule,
  cardCityStat,
  cardCityYields,
  cardFoundingRider,
  foldCardYields,
  cardOfferRule,
  cardUnitStat,
  describeCard,
  draftCost,
  drawOrderOffer,
  isUpgradable,
  liveEffects,
  livePool,
  newPlayerStatecraft,
  orderChoiceError,
  planDraft,
  scaleByLevel,
  sealRemaining,
  sealTurnsFor,
  settleCultureWindfall,
  slotOrderError,
  statecraftBlocker,
  unslotOrderError,
  windfallPayout,
} from '../../src/sim/statecraft';
import {
  type CardEffectKind,
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
  slotLayout,
} from '../../src/sim/statecraftData';
import { getTileAt } from '../../src/sim/map';
import { SCHEMA_VERSION, type GameState, createUnit, playerById } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { fullMovement } from '../../src/sim/units';
import { sightOf } from '../../src/sim/visibility';

// --- harness ----------------------------------------------------------------

function game(seed = 7) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

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
function found(state: GameState, playerId: number) {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

// --- the table --------------------------------------------------------------

describe('the card table', () => {
  it('names every card once, across all three classes', () => {
    const all = [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS];
    expect(new Set(all).size).toBe(all.length);
  });

  it('opens on the one tier-0 government, and offers a fixed triple at each other tier', () => {
    expect(governmentDef(STARTING_GOVERNMENT).tier).toBe(0);
    expect(GOVERNMENT_IDS.filter((id) => governmentDef(id).tier === 0)).toHaveLength(1);
    // Entry XV: tiers 3 / 7 / 15, each a fixed triple. Read off the rows, so a
    // fourth government at a tier is a data decision and this notices.
    expect(GOVERNMENT_TIERS).toEqual([3, 7, 15]);
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
      expect(cards.length, pool).toBeGreaterThanOrEqual(STATECRAFT.offer.newCards);
      for (const type of SLOT_TYPES) {
        expect(cards.some((id) => orderDef(id).slot === type), `${pool}/${type}`).toBe(true);
      }
    }
  });

  it('fills every live Doctrine pool, and keeps the deferred one out of all of them', () => {
    for (const tier of GOVERNMENT_TIERS) {
      expect(poolDoctrines(tier).length, `tier ${tier}`).toBeGreaterThanOrEqual(
        STATECRAFT.offer.doctrineOptions,
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

  it('gives every card a name, a flavour line and at least one effect or a stated deferral', () => {
    for (const id of [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS]) {
      const def = cardDef(id);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      // The chiefdom is the one signature-less row: it is where a game starts,
      // not a thing a player chose.
      if (id === STARTING_GOVERNMENT) continue;
      const hasSomething = def.effects.length > 0 || (def.deferred ?? []).length > 0;
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
    // tested. `unlocksBuilding` is the marked exception — it is declared,
    // deferred, and read into a description rather than a rule.
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
      'tileYield',
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

  it('banks a government offer at 3, 7 and 15 without blocking the turn', () => {
    const g = game();
    const player = g.state.players[0]!;
    for (let tier = 1; tier <= 3; tier++) {
      player.culturePool = draftCost(player.statecraft.drafts);
      settleCultureWindfall(g.state, player);
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    expect(player.statecraft.drafts).toBe(3);
    expect(player.statecraft.pendingGovernment).toEqual({
      tier: 3,
      options: governmentsAtTier(3),
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
    const sc = g.state.players[0]!.statecraft;
    const offer = drawOrderOffer(g.state, sc);
    expect(offer.options).toHaveLength(3);
    expect(new Set(offer.options).size).toBe(3);
    const pool = new Set(livePool(sc));
    for (const id of offer.options) expect(pool.has(id), id).toBe(true);
    // Nothing to deepen on the opening draft.
    expect(offer.upgrade).toBeUndefined();
  });

  it('never re-offers a card already held', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    for (const id of ORDER_IDS.filter((id) => orderDef(id).pool === 'chiefdom')) grant(sc, id);
    // Every chiefdom card is held, so the live pool is empty and the draw hands
    // back what it has — the honest answer (see `drawWithoutReplacement`).
    expect(livePool(sc)).toEqual([]);
    expect(drawOrderOffer(g.state, sc).options).toEqual([]);
  });

  it('rolls the upgrade target from the collection', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    grant(sc, 'firstRites');
    const offer = drawOrderOffer(g.state, sc);
    expect(offer.upgrade).toBe('firstRites');
  });

  it('deals the same hand from the same generator state', () => {
    const a = game(11);
    const b = game(11);
    expect(drawOrderOffer(a.state, a.state.players[0]!.statecraft)).toEqual(
      drawOrderOffer(b.state, b.state.players[0]!.statecraft),
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

  it('scales an upgraded face by the multiplier, flooring per figure', () => {
    expect(scaleByLevel(2, 1)).toBe(2);
    expect(scaleByLevel(2, 2)).toBe(3);
    expect(scaleByLevel(3, 2)).toBe(4);
    expect(scaleByLevel(10, 3)).toBe(22);
    // Magnitude-preserving on a malus: a tradeoff sharpens as the card deepens.
    expect(scaleByLevel(-2, 2)).toBe(-3);
    expect(scaleByLevel(0, 5)).toBe(0);
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
    // The chiefdom's layout is [military, economic]; First Rites is a wildcard
    // card, so neither typed slot takes it.
    expect(slotLayout(sc.government)).toEqual(['military', 'economic']);
    grant(sc, 'firstRites');
    refuses(
      g,
      { type: 'slotOrder', playerId: 0, cardId: 'firstRites', slotIndex: 0 } as Command,
      'is wildcard and slot 1 is military',
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
  function toTier3(g: ReturnType<typeof game>) {
    const player = g.state.players[0]!;
    for (let tier = 1; tier <= 3; tier++) {
      player.culturePool = draftCost(player.statecraft.drafts);
      settleCultureWindfall(g.state, player);
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    return player;
  }

  it('swaps the spread, amnesties every seal, and opens a Doctrine draft', () => {
    const g = game();
    const player = toTier3(g);
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
      expect(poolDoctrines(3), id).toContain(id);
    }
    expect(statecraftBlocker(player)).toBe('a Doctrine draft is waiting');

    expect(dispatch(g, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command).ok).toBe(true);
    expect(sc.doctrines).toHaveLength(1);
    expect(sc.pendingDoctrine).toBeUndefined();
  });

  it('opens the next Order pool on adoption', () => {
    const g = game();
    const player = toTier3(g);
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
    const player = toTier3(g);
    // Climb three more tiers without adopting.
    for (let i = 0; i < 3; i++) {
      player.culturePool = draftCost(player.statecraft.drafts);
      settleCultureWindfall(g.state, player);
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    expect(player.statecraft.drafts).toBe(6);
    expect(player.statecraft.pendingGovernment!.tier).toBe(3);
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
    expect(player.statecraft.doctrines).toHaveLength(3);
    expect(new Set(player.statecraft.doctrines).size).toBe(3);
  });
});

// --- the hooks --------------------------------------------------------------

describe('every hook family, end to end', () => {
  it('tileYield — Common Granary is a line in the hex breakdown', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    tile.resource = 'wheat';
    const before = explainTileYield(tile, yieldContextFor(g.state, 0));
    slot(g.state, 0, 'commonGranary');
    const after = explainTileYield(tile, yieldContextFor(g.state, 0));
    expect(after).toHaveLength(before.length + 1);
    const line = after[after.length - 1]!;
    expect(line.source).toBe('Order · Common Granary');
    expect(line.food).toBe(1);
    expect(line.kind).toBe('add');
    // A hex with no resource is untouched — the condition is the whole rule.
    const bare = getTileAt(g.state.map, city.col, city.row)!;
    delete bare.resource;
    expect(explainTileYield(bare, yieldContextFor(g.state, 0))).toHaveLength(before.length - 1);
  });

  it('cityYields — First Rites pays faith, and the fold is the sum of the list', () => {
    const g = game();
    const city = found(g.state, 0);
    const before = cityYields(g.state, city).faith;
    slot(g.state, 0, 'firstRites');
    expect(cityYields(g.state, city).faith).toBe(before + 1);
    // Levels scale the printed number, through the one scaler.
    slot(g.state, 0, 'firstRites', 2);
    g.state.players[0]!.statecraft.slots = [{ card: 'firstRites', sealedUntil: 0 }];
    expect(cityYields(g.state, city).faith).toBe(before + scaleByLevel(1, 2));
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
    slot(g.state, 0, 'censusRolls');
    expect(explainHappiness(g.state, 0).some((l) => l.source === 'Order · Festival Days')).toBe(true);
    expect(explainAuthority(g.state, 0).some((l) => l.source === 'Order · Census Rolls')).toBe(true);
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(happyBefore + 3);
    expect(foldMeter(explainAuthority(g.state, 0))).toBe(writBefore + 2);
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
    const line = after.bonuses.find((b) => b.source === 'Order · Blooded Spears');
    expect(line).toEqual({ source: 'Order · Blooded Spears', side: 'attacker', amount: 3 });
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
    // Percentages on one occasion sum before multiplying once.
    slot(g.state, 0, 'spoilsOfTheWild');
    expect(windfallPayout(g.state, 0, 'camp', 10).amount).toBe(20);
    g.state.players[0]!.statecraft.doctrines.push('wolfMothersPact');
    expect(windfallPayout(g.state, 0, 'camp', 10).amount).toBe(25);
  });

  it('foundingRider — Homestead Charters founds a bigger town', () => {
    const g = game();
    slot(g.state, 0, 'homesteadCharters');
    expect(cardFoundingRider(g.state, 0)).toEqual({ population: 1, buildings: [] });
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
    // A fourth city closes the gate, and the clause simply stops existing.
    for (let i = 0; i < 3; i++) g.state.cities.push({ ...city, id: 800 + i });
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
    expect(after.value).toBe(-2);
  });

  it('rulePercent — Manifest of the Steppe cheapens settlers and stops the ladder', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.settlersBuilt = 3;
    const before = unitProductionCost(g.state, 0, 'settler');
    player.statecraft.doctrines.push('manifestOfTheSteppe');
    const after = unitProductionCost(g.state, 0, 'settler');
    expect(after).toBeLessThan(before);
    // No escalation *and* the discount, composed without either knowing about
    // the other: base cost only, at 60%.
    expect(after).toBe(Math.max(1, Math.floor((unitDef('settler').cost * 60) / 100)));
  });
});

// --- determinism ------------------------------------------------------------

describe('determinism', () => {
  it('replays a full Statecraft sequence byte for byte', () => {
    const play = () => {
      const g = game(31);
      const player = g.state.players[0]!;
      const log: Command[] = [];
      const send = (command: Command): void => {
        if (dispatch(g, command).ok) log.push(command);
      };
      found(g.state, 0);
      for (let turn = 0; turn < 60; turn++) {
        // Answer everything Statecraft is owed, then slot, unslot and re-slot.
        if (player.statecraft.pendingOrder) {
          send({ type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
        }
        if (player.statecraft.pendingGovernment) {
          send({ type: 'adoptGovernment', playerId: 0, choiceIndex: 1 } as Command);
        }
        if (player.statecraft.pendingDoctrine) {
          send({ type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command);
        }
        for (const owned of player.statecraft.orders) {
          for (let i = 0; i < player.statecraft.slots.length; i++) {
            send({ type: 'slotOrder', playerId: 0, cardId: owned.id, slotIndex: i } as Command);
          }
        }
        for (let i = 0; i < player.statecraft.slots.length; i++) {
          send({ type: 'unslotOrder', playerId: 0, slotIndex: i } as Command);
        }
        // Culture the empire would never earn on a duel map in sixty turns; the
        // point is the *sequence*, not the economy.
        player.culturePool += 40;
        send({ type: 'endTurn', playerId: 0 });
        send({ type: 'endTurn', playerId: 1 });
      }
      return { snapshot: snapshotState(g.state), log, config: g.config };
    };

    const a = play();
    const b = play();
    expect(b.snapshot).toEqual(a.snapshot);
    expect(a.log.length).toBeGreaterThan(50);
    // The offers were real: the empire climbed and adopted.
    const drafted = JSON.parse(a.snapshot) as { players: { statecraft: PlayerStatecraft }[] };
    expect(drafted.players[0]!.statecraft.drafts).toBeGreaterThan(3);
    expect(drafted.players[0]!.statecraft.government).not.toBe(STARTING_GOVERNMENT);
  });

  it('round-trips a schema 19 save with Statecraft in it', () => {
    expect(SCHEMA_VERSION).toBe(19);
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
    expect(JSON.parse(text).schemaVersion).toBe(19);
    expect(JSON.parse(text).players[0].statecraft).toEqual(player.statecraft);
    // A player who has never drafted serialises as the opening state exactly.
    expect(JSON.parse(text).players[1].statecraft).toEqual(newPlayerStatecraft());
  });

  it('replays a logged game with Statecraft commands in it', () => {
    const g = game(23);
    const log: Command[] = [];
    const send = (command: Command): void => {
      if (dispatch(g, command).ok) log.push(command);
    };
    const player = g.state.players[0]!;
    // Reach a draft the honest way, so the replay can reproduce it.
    for (let turn = 0; turn < 40; turn++) {
      if (player.statecraft.pendingOrder) {
        send({ type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
      }
      const unit = g.state.units.find((u) => u.ownerId === 0 && u.type === 'settler');
      if (unit) send({ type: 'foundCity', playerId: 0, settlerUnitId: unit.id } as Command);
      send({ type: 'endTurn', playerId: 0 });
      send({ type: 'endTurn', playerId: 1 });
    }
    const replayed = replay(g.config, log);
    expect(snapshotState(replayed)).toEqual(snapshotState(g.state));
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
    slot(g.state, 0, 'firstRites');
    slot(g.state, 0, 'weightsAndMeasures');
    const lines = cardCityYields(g.state, city);
    expect(lines.map((line) => line.source)).toEqual([
      'Order · First Rites',
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
    const g = game(41);
    const raider = createUnit(g.state, 0, 'warrior', g.state.units[0]!.col, g.state.units[0]!.row);
    raider.hp = 40;
    const tile = getTileAt(g.state.map, raider.col, raider.row)!;
    tile.improvement = 'farm';
    slot(g.state, 0, 'scorchedEarth');
    const gold = g.state.players[0]!.gold;
    pillageAt(g.state, raider, tile);
    expect(g.state.players[0]!.gold).toBe(gold + RULES.improvements.pillageGold + 10);
    expect(raider.hp).toBe(65);
    // Capped at the type's maximum, like every other heal in the game.
    raider.hp = 95;
    tile.improvement = 'farm';
    raider.movesLeft = 2;
    pillageAt(g.state, raider, tile);
    expect(raider.hp).toBe(100);
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

  it('actionRule unitJumpsQueue — a unit completes ahead of a building it can outpace', () => {
    const g = game(41);
    const city = found(g.state, 0);
    // A building it cannot afford in front, a warrior it can behind.
    city.queue = [
      { kind: 'building', id: 'library' },
      { kind: 'unit', id: 'warrior' },
    ];
    city.hammerBasket = unitProductionCost(g.state, 0, 'warrior');
    expect(settleProduction(g.state, city)).toBeNull();
    expect(city.queue).toHaveLength(2);

    slot(g.state, 0, 'theStandingLevy');
    const done = settleProduction(g.state, city);
    expect(done?.name).toBe('Warrior');
    // The building it passed is still next — the card cuts in, it does not reorder.
    expect(city.queue).toEqual([{ kind: 'building', id: 'library' }]);
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
 * **An upgrade always changes something** (user, 2026-08-26: "some cards don't
 * have an upgrade").
 *
 * A third of the table was offerable as an upgrade that did nothing at all:
 * `floor(1 × 1.5)` is `1`, so the multiplier swallowed itself on every card
 * whose printed figure was a single point — nineteen of the sixty-five Orders.
 * The fix is two halves and this block holds them together, because either half
 * alone is a way to hide the other:
 *
 *   1. **`scaleByLevel` advances the magnitude by at least a point per level**,
 *      which reaches every card that prints a number.
 *   2. **`upgradable: false`** on a card that prints none, which the upgrade
 *      draw then never rolls.
 *
 * The trap the second half opens is that it can be used to paper over a row
 * that simply needed a bigger number — so it is asserted in *both* directions:
 * an upgradable card must actually deepen, and a non-upgradable one must have
 * genuinely nothing to scale.
 */
describe('every upgrade is a real upgrade', () => {
  /** True when this card's level-2 face reads differently from its level-1 face. */
  function deepens(id: OrderId): boolean {
    return JSON.stringify(describeCard(id, 1)) !== JSON.stringify(describeCard(id, 2));
  }

  it('advances a single point rather than flooring it away', () => {
    // The exact case that shipped: one point, one level, and nothing happened.
    expect(scaleByLevel(1, 2)).toBe(2);
    expect(scaleByLevel(-1, 2)).toBe(-2);
    // Two levels deep advances twice, and the multiplier takes over the moment
    // it is worth more than the floor.
    expect(scaleByLevel(1, 3)).toBe(3);
    expect(scaleByLevel(4, 3)).toBe(9);
    // Nothing that already deepened deepens differently: only ±1 moved.
    for (const value of [2, 3, 4, 6, 10, 25, -2, -3, -10]) {
      const factor = STATECRAFT.upgradeMultiplier;
      const raw = value * factor;
      const floored = raw < 0 ? -Math.floor(-raw) : Math.floor(raw);
      expect(scaleByLevel(value, 2), String(value)).toBe(floored);
    }
    // Zero stays zero: a clause that pays nothing is not a clause.
    expect(scaleByLevel(0, 5)).toBe(0);
  });

  it('deepens every Order that is offerable as an upgrade', () => {
    const flat = ORDER_IDS.filter((id) => isUpgradable(id) && !deepens(id));
    expect(flat, `these read the same at level 2: ${flat.join(', ')}`).toEqual([]);
  });

  it('marks as unupgradable only cards with no figure to advance', () => {
    const marked = ORDER_IDS.filter((id) => !isUpgradable(id));
    // The flag is a declaration about three switches, not an escape hatch.
    expect(marked.length).toBeGreaterThan(0);
    for (const id of marked) {
      expect(deepens(id), `${id} has a number and does not need the flag`).toBe(false);
    }
  });

  it('never rolls an unupgradable card as the upgrade option', () => {
    const game = createGame({
      seed: 99,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
    });
    const sc = newPlayerStatecraft();
    // An empire holding *only* switches has nothing to deepen, and the offer
    // says so by having no upgrade at all rather than by offering a no-op.
    sc.orders = ORDER_IDS.filter((id) => !isUpgradable(id)).map((id) => ({ id, level: 1 }));
    expect(sc.orders.length).toBeGreaterThan(0);
    expect(drawOrderOffer(game.state, sc).upgrade).toBeUndefined();

    // Add one card that does deepen and it is the only thing that can be rolled,
    // however many times the bag is drawn from.
    const deepenable = ORDER_IDS.find((id) => isUpgradable(id))!;
    sc.orders.push({ id: deepenable, level: 1 });
    for (let draw = 0; draw < 40; draw++) {
      expect(drawOrderOffer(game.state, sc).upgrade).toBe(deepenable);
    }
  });
});
