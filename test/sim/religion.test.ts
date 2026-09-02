/**
 * Religion v1: the augur, the pantheon, the rites, and the timed effects they
 * hang (design ledger, Entry XXVIII).
 *
 * Four concerns in one file, deliberately, because they are one system and the
 * interesting failures are between them: the purchase (a validation matrix and a
 * price ladder), the draft (determinism, without-replacement, the slot gate),
 * every rite carried **end to end** into the ledger it touches, and the timed
 * subsystem's two claims — that a rite's effect is read by the *same* evaluator
 * a slotted Order is, and that it stops on the exact turn it says it will.
 *
 * The rites are tested end to end rather than by asserting what was stamped,
 * which is the same argument `statecraft.test.ts` makes for the hook families:
 * an effect that is declared and never read fails as silence, and only a test
 * that follows the number into `cityYields` / `planCombat` / `borderGrowth` can
 * see the difference.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import {
  borderCostFor,
  borderGrowth,
  cityYields,
  growthCarryover,
  explainTileYield,
  foldTileYield,
  foundCityAt,
  nextBorderCost,
  yieldContextFor,
} from '../../src/sim/cities';
import { inquisitorAuraLines, previewCombat } from '../../src/sim/combat';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import { improvementError, improvementErrorAt } from '../../src/sim/improvements';
import {
  availableRites,
  beliefPool,
  gainBeliefError,
  explainPressure,
  proclaimError,
  proclaimPreview,
  foundReligion,
  foundReligionError,
  maxReligions,
  pressureTotals,
  religionBeliefPool,
  spreadReligion,
  consecrateError,
  hasOpenBeliefSlot,
  isAugur,
  liveTimedEffects,
  openPeriodicOffers,
  pantheonSlots,
  performRiteAt,
  plantHolySiteError,
  nextBeliefPool,
  purgeError,
  purgePreview,
  pruneTimedEffects,
  religionBlocker,
  riteError,
  ritePreview,
} from '../../src/sim/religion';
import {
  type PurchasableItem,
  bankOf,
  explainPurchaseCost,
  purchaseItemAt,
} from '../../src/sim/purchase';

/** The one thing faith sells. Named once, so the shape reads out of the way. */
const AUGUR: PurchasableItem = { kind: 'unit', id: 'augur' };
import {
  type BeliefId,
  BELIEF_IDS,
  ENHANCER_BELIEF_IDS,
  FOLLOWER_BELIEF_IDS,
  RELIGION,
  RITE_IDS,
  beliefDef,
  newPlayerPantheon,
  isPantheonBeliefId,
  religionDataProblems,
  riteAbility,
  riteDef,
  slotsFromTechs,
} from '../../src/sim/religionData';
import {
  type City,
  type GameState,
  cityReligion,
  convertCitizen,
  createUnit,
  foundedReligion,
  playerById,
  shrinkFollowers,
  unconvertedCitizens,
} from '../../src/sim/state';
import {
  type CardYieldLine,
  anyCardDef,
  cardCityYields,
  cardCombatLines,
  cardEmpireYields,
  cardHappiness,
  cardPressureRule,
  cardProduction,
  describeCard,
  followerCardTileLines,
  heldReligions,
  liveCityEffects,
  liveEffects,
  payWindfallGrants,
  religionFounder,
  windfallPayout,
} from '../../src/sim/statecraft';
import { RULES } from '../../src/sim/rulesData';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { hasAbility } from '../../src/sim/tech';
import { isCombatant, unitDef } from '../../src/sim/unitData';
import { buildingDef } from '../../src/sim/buildingData';

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

/** A city for a player, on the tile their first unit is standing on. */
function found(state: GameState, playerId: number) {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

/** Hands a seat a technology, the way a completed research would. */
function learn(state: GameState, playerId: number, ...techs: string[]): void {
  const player = playerById(state, playerId)!;
  for (const tech of techs) {
    if (!player.techsResearched.includes(tech as never)) {
      player.techsResearched.push(tech as never);
    }
  }
}

/** An augur standing on a tile, with full charges. Scaffolding, not a purchase. */
function augurAt(state: GameState, playerId: number, col: number, row: number) {
  return createUnit(state, playerId, 'augur', col, row);
}

/** A combat forecast, narrowed. `previewCombat` answers a refusal or a card. */
function forecast(state: GameState, unitId: number, col: number, row: number) {
  const preview = previewCombat(state, unitId, { col, row });
  if (!preview.ok) throw new Error(`no forecast: ${preview.error}`);
  return preview;
}

/** Gives a seat a god outright — the offer machinery has its own tests. */
function keep(state: GameState, playerId: number, id: BeliefId): void {
  playerById(state, playerId)!.pantheon.beliefs.push(id);
}

// --- the table --------------------------------------------------------------

describe('the religion table', () => {
  it('has no problems to report', () => {
    expect(religionDataProblems(TECH_IDS)).toEqual([]);
  });

  it('names every belief and every rite once, and never twice across the card table', () => {
    const all = [...BELIEF_IDS, ...RITE_IDS];
    expect(new Set(all).size).toBe(all.length);
    // A `CardId` is unique across all five classes, which is what lets one
    // breakdown line carry one string. `anyCardDef` is the lookup that spans
    // them; a collision would show up as a belief resolving to an Order.
    for (const id of all) expect(anyCardDef(id).name.length).toBeGreaterThan(0);
  });

  it('gives every belief a description the screen can print', () => {
    for (const id of BELIEF_IDS) {
      const clauses = describeCard(id);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) expect(clause.text.length, id).toBeGreaterThan(0);
    }
  });

  it('holds enough gods to fill an offer many times over', () => {
    expect(BELIEF_IDS.length).toBeGreaterThanOrEqual(RULES.offers.belief * 4);
  });

  it('teaches each rite through its own technology, as an ability', () => {
    for (const id of RITE_IDS) {
      const tech = riteDef(id).tech;
      expect(techDef(tech).unlocks.abilities ?? [], id).toContain(riteAbility(id));
    }
  });
});

// --- buying an augur --------------------------------------------------------

describe('the augur is bought, never built', () => {
  it('refuses the production queue outright, with the bank named', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'augur' }],
    } as Command);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/bought with faith/);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('prices the first at the printed figure and each later one a step higher', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    const spec = unitDef('augur').purchase!;

    const first = explainPurchaseCost(g.state, 0, city.id, AUGUR, 'faith')!;
    expect(first.currency).toBe('faith');
    expect(first.total).toBe(spec.cost);
    expect(first.lines).toHaveLength(1);

    player.augursPurchased = 2;
    const third = explainPurchaseCost(g.state, 0, city.id, AUGUR, 'faith')!;
    expect(third.total).toBe(spec.cost + 2 * spec.increment!);
    // Rule 5 for a price: the fold of the printed lines *is* the figure.
    expect(third.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(third.total);
    expect(third.lines[1]!.source).toMatch(/2 already called/);
  });

  it('answers null when faith is asked for a thing it does not sell', () => {
    const g = game();
    const city = found(g.state, 0);
    // Faith sells exactly what the table prices in faith. A warrior is bought
    // with coin like everything else, so the faith bank has no figure for it.
    expect(
      explainPurchaseCost(g.state, 0, city.id, { kind: 'unit', id: 'warrior' }, 'faith'),
    ).toBeNull();
    // And gold has no figure for the augur, for the mirror reason.
    expect(explainPurchaseCost(g.state, 0, city.id, AUGUR, 'gold')).toBeNull();
  });

  it('refuses every way it can, and each refusal leaves the state byte-identical', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 1000;

    const cases: { why: string; command: Command; match: RegExp }[] = [
      {
        why: 'no such player',
        command: { type: 'purchaseItem', playerId: 9, cityId: city.id, item: { kind: 'unit', id: 'augur' }, currency: 'faith' } as Command,
        match: /No player/,
      },
      {
        why: 'somebody else’s city',
        command: { type: 'purchaseItem', playerId: 1, cityId: city.id, item: { kind: 'unit', id: 'augur' }, currency: 'faith' } as Command,
        match: /does not belong/,
      },
      {
        why: 'no such city',
        command: { type: 'purchaseItem', playerId: 0, cityId: 999, item: { kind: 'unit', id: 'augur' }, currency: 'faith' } as Command,
        match: /No city/,
      },
      {
        why: 'a thing this game has never heard of',
        command: { type: 'purchaseItem', playerId: 0, cityId: city.id, item: { kind: 'unit', id: 'dragon' }, currency: 'faith' } as unknown as Command,
        match: /for sale/,
      },
      {
        why: 'faith asked for a thing the treasury sells',
        command: { type: 'purchaseItem', playerId: 0, cityId: city.id, item: { kind: 'unit', id: 'warrior' }, currency: 'faith' } as Command,
        match: /bought with gold, not faith/,
      },
      {
        why: 'the wrong bank',
        command: { type: 'purchaseItem', playerId: 0, cityId: city.id, item: { kind: 'unit', id: 'augur' }, currency: 'gold' } as Command,
        match: /bought with faith, not gold/,
      },
      {
        why: 'the technology',
        command: { type: 'purchaseItem', playerId: 0, cityId: city.id, item: { kind: 'unit', id: 'augur' }, currency: 'faith' } as Command,
        match: /need Divination/,
      },
    ];

    for (const testCase of cases) {
      const before = snapshotState(g.state);
      const result = applyCommand(g.state, testCase.command);
      expect(result.ok, testCase.why).toBe(false);
      expect(result.ok === false && result.error, testCase.why).toMatch(testCase.match);
      expect(snapshotState(g.state), testCase.why).toEqual(before);
    }
  });

  it('refuses a pool that does not cover the price, and says what it holds', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    playerById(g.state, 0)!.faithPool = 39;
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'unit', id: 'augur' },
      currency: 'faith',
    } as Command);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/costs 40 faith; Ada has 39/);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('refuses a seat that has ended its turn', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    playerById(g.state, 0)!.faithPool = 100;
    dispatch(g, { type: 'endTurn', playerId: 0 });
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'unit', id: 'augur' },
      currency: 'faith',
    } as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('charges the pool, climbs the ladder and puts a full augur in the city', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 100;

    expect(dispatch(g, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'unit', id: 'augur' },
      currency: 'faith',
    } as Command).ok).toBe(true);

    expect(player.faithPool).toBe(60);
    expect(player.augursPurchased).toBe(1);
    const augur = g.state.units.find((u) => u.type === 'augur')!;
    expect(augur.ownerId).toBe(0);
    // It stands where a *built* one would: on the city tile if that hex has
    // room for another civilian, otherwise the first neighbour that has — the
    // one spawn convention, since the purchase and the production queue were
    // put through one completion routine (`realiseItem`). The opening town has
    // a worker on its own tile, so this augur is next door, and that is the
    // rule rather than an accident.
    expect(
      wrappedDistance(
        g.state.map,
        tileHex(getTileAt(g.state.map, augur.col, augur.row)!),
        tileHex(getTileAt(g.state.map, city.col, city.row)!),
      ),
    ).toBeLessThanOrEqual(1);
    // Born through `createUnit`, so it can act this turn: full movement, its
    // charges, an unspent attack.
    expect(augur.chargesLeft).toBe(unitDef('augur').charges);
    expect(augur.movesLeft).toBe(unitDef('augur').movement);
    expect(isAugur(augur)).toBe(true);

    // The second one is dearer, from this instant.
    expect(explainPurchaseCost(g.state, 0, city.id, AUGUR, 'faith')!.total).toBe(55);
    expect(bankOf(player, 'faith')).toBe(60);
  });

  it('is called into the city the command names, not the capital', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    // A second town four hexes off, so the two cannot be confused.
    const far = foundCityAt(g.state, 0, getTileAt(g.state.map, 10, 10)!);
    purchaseItemAt(g.state, player, far, { kind: 'unit', id: 'augur' }, 'faith');
    const augur = g.state.units.find((u) => u.type === 'augur')!;
    expect([augur.col, augur.row]).toEqual([far.col, far.row]);
  });
});

// --- consecration -----------------------------------------------------------

describe('consecrate', () => {
  it('opens no slots at all before Divination, and two after', () => {
    const g = game();
    expect(pantheonSlots(g.state, 0)).toBe(0);
    learn(g.state, 0, 'divination');
    expect(pantheonSlots(g.state, 0)).toBe(RELIGION.pantheon.slotsFromTech.divination);
    // Derived, never stored: the pantheon carries only what was taken.
    expect(newPlayerPantheon()).toEqual({ beliefs: [] });
    expect(slotsFromTechs(['divination'])).toBe(2);
  });

  it('refuses without a slot, with the sentence the panel prints', () => {
    const g = game();
    const augur = augurAt(g.state, 0, 5, 5);
    expect(consecrateError(g.state, 0, augur.id)).toBe(
      'Your pantheon has no room for another belief',
    );
    learn(g.state, 0, 'divination');
    expect(consecrateError(g.state, 0, augur.id)).toBeNull();
    keep(g.state, 0, BELIEF_IDS[0]!);
    keep(g.state, 0, BELIEF_IDS[1]!);
    expect(hasOpenBeliefSlot(g.state, 0)).toBe(false);
    expect(consecrateError(g.state, 0, augur.id)).toMatch(/no room/);
  });

  it('refuses a piece that is not an augur, and somebody else’s augur', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const worker = g.state.units.find((u) => u.ownerId === 0 && u.type === 'worker');
    if (worker) expect(consecrateError(g.state, 0, worker.id)).toMatch(/cannot consecrate/);
    const theirs = augurAt(g.state, 1, 6, 6);
    expect(consecrateError(g.state, 0, theirs.id)).toMatch(/does not belong/);
  });

  it('spends the whole augur however many rites are left in it', () => {
    for (const charges of [3, 2, 1]) {
      const g = game();
      learn(g.state, 0, 'divination');
      const augur = augurAt(g.state, 0, 5, 5);
      augur.chargesLeft = charges;
      expect(dispatch(g, { type: 'consecrate', playerId: 0, unitId: augur.id } as Command).ok).toBe(
        true,
      );
      expect(g.state.units.some((u) => u.id === augur.id), `${charges} charges`).toBe(false);
    }
  });

  it('deals three gods without replacement, and blocks End Turn until answered', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const augur = augurAt(g.state, 0, 5, 5);
    dispatch(g, { type: 'consecrate', playerId: 0, unitId: augur.id } as Command);

    const player = playerById(g.state, 0)!;
    const offer = player.pantheon.pending!;
    expect(offer.options).toHaveLength(RULES.offers.belief);
    expect(new Set(offer.options).size).toBe(offer.options.length);
    expect(religionBlocker(player)).toMatch(/belief/);

    expect(dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 1 } as Command).ok).toBe(
      true,
    );
    expect(player.pantheon.beliefs).toEqual([offer.options[1]]);
    // Deleted, not undefined: a seat that has answered serialises exactly like
    // one that never had an offer.
    expect('pending' in player.pantheon).toBe(false);
    expect(religionBlocker(player)).toBeNull();
  });

  it('never offers a god already held, and returns a declined one to the bag', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const first = augurAt(g.state, 0, 5, 5);
    dispatch(g, { type: 'consecrate', playerId: 0, unitId: first.id } as Command);
    const player = playerById(g.state, 0)!;
    const dealt = [...player.pantheon.pending!.options];
    dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);

    const taken = dealt[0]!;
    const declined = dealt[1]!;
    expect(beliefPool(g.state, player)).not.toContain(taken);
    // The two that were passed over are drawable again — declining is a
    // decision about the cards beside a god, not about the god.
    expect(beliefPool(g.state, player)).toContain(declined);

    const second = augurAt(g.state, 0, 5, 5);
    dispatch(g, { type: 'consecrate', playerId: 0, unitId: second.id } as Command);
    expect(player.pantheon.pending!.options).not.toContain(taken);
  });

  it('never offers a god a rival empire already keeps', () => {
    // **A god belongs to one world** (2026-08-29). The bag is not this seat's
    // own holdings subtracted from the table — it is the table minus every
    // pantheon in play, swept in `realPlayers` order.
    const g = game();
    learn(g.state, 0, 'divination');
    learn(g.state, 1, 'divination');
    const mine = playerById(g.state, 0)!;
    const theirs = playerById(g.state, 1)!;

    const rival = BELIEF_IDS.filter(isPantheonBeliefId)[0]!;
    keep(g.state, 1, rival);
    expect(beliefPool(g.state, mine)).not.toContain(rival);
    // And it is gone from the *hand*, not merely from a list nobody deals off.
    const augur = augurAt(g.state, 0, 5, 5);
    dispatch(g, { type: 'consecrate', playerId: 0, unitId: augur.id } as Command);
    expect(mine.pantheon.pending!.options).not.toContain(rival);

    // The rival's own bag still holds it — a god you keep is yours, and the
    // exclusion is about *other* seats.
    expect(beliefPool(g.state, theirs)).not.toContain(rival);
    expect(theirs.pantheon.beliefs).toEqual([rival]);
  });

  it('refuses a second offer while one is outstanding', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const first = augurAt(g.state, 0, 5, 5);
    dispatch(g, { type: 'consecrate', playerId: 0, unitId: first.id } as Command);
    const second = augurAt(g.state, 0, 5, 5);
    expect(consecrateError(g.state, 0, second.id)).toMatch(/waiting to be chosen/);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, {
      type: 'consecrate',
      playerId: 0,
      unitId: second.id,
    } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('refuses an index off the end, byte-identically', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const augur = augurAt(g.state, 0, 5, 5);
    dispatch(g, { type: 'consecrate', playerId: 0, unitId: augur.id } as Command);
    for (const optionIndex of [-1, 3, 1.5, 'one' as unknown as number]) {
      const before = snapshotState(g.state);
      const result = applyCommand(g.state, {
        type: 'chooseBelief',
        playerId: 0,
        optionIndex,
      } as Command);
      expect(result.ok, String(optionIndex)).toBe(false);
      expect(snapshotState(g.state), String(optionIndex)).toEqual(before);
    }
  });

  it('deals the same three gods from the same generator state', () => {
    const draw = (): string[] => {
      const g = game(4242);
      learn(g.state, 0, 'divination');
      const augur = augurAt(g.state, 0, 5, 5);
      dispatch(g, { type: 'consecrate', playerId: 0, unitId: augur.id } as Command);
      return [...playerById(g.state, 0)!.pantheon.pending!.options];
    };
    expect(draw()).toEqual(draw());
  });
});

// --- beliefs through the shared evaluator -----------------------------------

describe('a belief is an effect source, not a second evaluator', () => {
  it('joins the one walk, labelled as a Belief', () => {
    const g = game();
    keep(g.state, 0, 'sacredFire');
    const live = liveEffects(g.state, 0);
    const line = live.find((entry) => entry.card === 'sacredFire');
    expect(line).toBeDefined();
    expect(line!.source).toBe('Belief · Sacred Fire');
    expect(line!.level).toBe(1);
  });

  it('pays a flat city yield through cityYields (Sacred Fire)', () => {
    const g = game();
    const city = found(g.state, 0);
    const before = cityYields(g.state, city).faith;
    keep(g.state, 0, 'sacredFire');
    expect(cityYields(g.state, city).faith).toBe(before + 1);
  });

  it('scopes a city yield to a building (The Standing Stones)', () => {
    const g = game();
    const city = found(g.state, 0);
    keep(g.state, 0, 'theStandingStones');
    const bare = cityYields(g.state, city).culture;
    city.buildings.push('monument');
    expect(cityYields(g.state, city).culture).toBeGreaterThan(bare);
  });

  it('scopes a tile line by terrain (Desert Fathers)', () => {
    const g = game();
    keep(g.state, 0, 'desertFathers');
    const ctx = yieldContextFor(g.state, 0)!;
    const desert = { ...getTileAt(g.state.map, 4, 4)!, terrain: 'desert' as const };
    const grass = { ...desert, terrain: 'grassland' as const };
    expect(foldTileYield(explainTileYield(desert, ctx)).faith).toBe(1);
    expect(foldTileYield(explainTileYield(grass, ctx)).faith).toBe(0);
    // And it says so in the breakdown, with a rule-5 label.
    expect(explainTileYield(desert, ctx).some((line) => line.source.startsWith('Belief ·'))).toBe(
      true,
    );
  });

  it('composes two tile conditions with `all` (Winter Mother)', () => {
    const g = game();
    keep(g.state, 0, 'winterMother');
    const ctx = yieldContextFor(g.state, 0)!;
    const base = getTileAt(g.state.map, 4, 4)!;
    const tundra = { ...base, terrain: 'tundra' as const, feature: 'none' as const };
    const wooded = { ...tundra, feature: 'forest' as const };
    expect(foldTileYield(explainTileYield(tundra, ctx)).faith).toBe(0);
    expect(foldTileYield(explainTileYield(wooded, ctx)).faith).toBe(1);
  });

  it('merges two lines from the same source into one entry (Winter Mother, tundra forest)', () => {
    // Winter Mother pays two `tileYield` lines — food on any tundra hex, faith
    // on a wooded one — and both hold on a tundra forest. The user's rule: one
    // card is one line, carrying every voice it pays, so the breakdown must
    // show exactly one "Belief · Winter Mother" entry with both voices summed,
    // not two entries under the same name.
    const g = game();
    keep(g.state, 0, 'winterMother');
    const ctx = yieldContextFor(g.state, 0)!;
    const base = getTileAt(g.state.map, 4, 4)!;
    const wooded = { ...base, terrain: 'tundra' as const, feature: 'forest' as const };
    const before = foldTileYield(explainTileYield(wooded, ctx));
    const list = explainTileYield(wooded, ctx);
    const winterMotherLines = list.filter((entry) => entry.source === 'Belief · Winter Mother');
    expect(winterMotherLines).toHaveLength(1);
    expect(winterMotherLines[0]).toMatchObject({
      source: 'Belief · Winter Mother',
      kind: 'add',
      food: 1,
      faith: 1,
    });
    // The fold is untouched by the merge — it was always a sum.
    expect(foldTileYield(list)).toEqual(before);
  });

  it('keeps two different sources on one tile as two entries (Winter Mother + Spirits of the Wood)', () => {
    // Spirits of the Wood pays culture on any forest, so a tundra forest under
    // both beliefs earns two *different* voices from two *different* cards —
    // those must stay separate lines, only same-source lines merge.
    const g = game();
    keep(g.state, 0, 'winterMother');
    keep(g.state, 0, 'spiritsOfTheWood');
    const ctx = yieldContextFor(g.state, 0)!;
    const base = getTileAt(g.state.map, 4, 4)!;
    const wooded = { ...base, terrain: 'tundra' as const, feature: 'forest' as const };
    const list = explainTileYield(wooded, ctx);
    const cardLines = list.filter((entry) => entry.source.startsWith('Belief ·'));
    expect(cardLines.map((entry) => entry.source).sort()).toEqual([
      'Belief · Spirits of the Wood',
      'Belief · Winter Mother',
    ]);
    const winter = cardLines.find((entry) => entry.source === 'Belief · Winter Mother')!;
    expect(winter).toMatchObject({ food: 1, faith: 1 });
    const spirits = cardLines.find((entry) => entry.source === 'Belief · Spirits of the Wood')!;
    expect(spirits).toMatchObject({ culture: 1 });
  });

  it('narrows a tile line by resource kind and the voice it pays (Goddess of the Harvest)', () => {
    const g = game();
    keep(g.state, 0, 'goddessOfTheHarvest');
    const ctx = yieldContextFor(g.state, 0)!;
    const base = getTileAt(g.state.map, 4, 4)!;
    const wheat = { ...base, resource: 'wheat' as const };
    const stone = { ...base, resource: 'stone' as const };
    const bare = { ...base, resource: undefined };
    const foodOf = (tile: typeof base): number => foldTileYield(explainTileYield(tile, ctx)).food;
    // Wheat is a bonus resource that feeds; stone is a bonus resource that does
    // not, and the belief reads the resource's own row rather than a list.
    expect(foodOf(wheat) - foodOf({ ...wheat })).toBe(0);
    expect(
      foldTileYield(explainTileYield(wheat, ctx)).food -
        foldTileYield(explainTileYield(wheat, undefined)).food,
    ).toBe(1);
    expect(
      foldTileYield(explainTileYield(stone, ctx)).food -
        foldTileYield(explainTileYield(stone, undefined)).food,
    ).toBe(0);
    expect(foodOf(bare)).toBe(foldTileYield(explainTileYield(bare, undefined)).food);
  });

  it('adds a strength line to every fight (God of the Forge)', () => {
    const g = game();
    const mine = createUnit(g.state, 0, 'warrior', 4, 4);
    const theirs = createUnit(g.state, 1, 'warrior', 5, 4);
    const before = forecast(g.state, mine.id, theirs.col, theirs.row);
    keep(g.state, 0, 'godOfTheForge');
    const after = forecast(g.state, mine.id, theirs.col, theirs.row);
    expect(after.attackerStrength).toBe(before.attackerStrength + 1);
    expect(after.bonuses.some((line) => line.source.includes('God of the Forge'))).toBe(true);
  });

  it('feeds a city-stage percent off a count (Court Augurs)', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    keep(g.state, 0, 'courtAugurs');
    const bare = cityYields(g.state, city).science;
    // An augur *in the town* with a rite left in it, which is the whole of the
    // card's text — the reason to keep one home.
    const augur = augurAt(g.state, 0, city.col, city.row);
    expect(cityYields(g.state, city).science).toBeGreaterThanOrEqual(bare);
    augur.chargesLeft = 0;
    expect(cityYields(g.state, city).science).toBe(bare);
  });

  it('rides a windfall in the money of the era (Rites of Blood)', () => {
    const g = game();
    keep(g.state, 0, 'ritesOfBlood');
    const player = playerById(g.state, 0)!;
    const before = player.faithPool;
    // Æra I: the printed fifteen.
    payWindfallGrants(g.state, player, windfallPayout(g.state, 0, 'kill'));
    expect(player.faithPool - before).toBe(15);
    // Æra II: the same rider, doubled. One node of the second age is all the era
    // multiplier is being asked about — re-read against the four-age tree of
    // 2026-08-30, which put Mathematics and Rhetoric into Æra III.
    learn(g.state, 0, 'currency');
    const mid = player.faithPool;
    payWindfallGrants(g.state, player, windfallPayout(g.state, 0, 'kill'));
    expect(player.faithPool - mid).toBe(15 * 2);
  });

  it('opens a cadenced draft on the turn the calendar names (Keeper of the Calendar)', () => {
    const g = game();
    found(g.state, 0);
    keep(g.state, 0, 'keeperOfTheCalendar');
    const player = playerById(g.state, 0)!;

    g.state.turn = 19;
    openPeriodicOffers(g.state);
    expect(player.pendingDiscovery).toBeUndefined();

    g.state.turn = 20;
    openPeriodicOffers(g.state);
    expect(player.pendingDiscovery).toBeDefined();
    expect(player.pendingDiscovery!.options.length).toBeGreaterThan(0);

    // One at a time: a second sweep on the same turn deals nothing on top of it.
    const held = JSON.stringify(player.pendingDiscovery);
    openPeriodicOffers(g.state);
    expect(JSON.stringify(player.pendingDiscovery)).toBe(held);
  });

  it('leaves the wild out of the cadence', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      barbarians: true,
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const wild = g.state.players.find((p) => p.barbarian)!;
    wild.pantheon.beliefs.push('keeperOfTheCalendar');
    g.state.turn = 20;
    openPeriodicOffers(g.state);
    expect(wild.pendingDiscovery).toBeUndefined();
  });
});

// --- rites, end to end ------------------------------------------------------

describe('rites', () => {
  it('are known only where the tree teaches them', () => {
    const g = game();
    expect(availableRites(g.state, 0)).toEqual([]);
    learn(g.state, 0, 'divination');
    // Divination teaches **three** since the re-cut of 2026-09-02 gathered the
    // worksheet's "first rites" onto the faith door: the augur's first rite, the
    // omen read for beakers, and the one that recasts what the augur before it
    // named. The order is the tree's own.
    expect(availableRites(g.state, 0)).toEqual([
      'riteOfTheHarvest',
      'omenReading',
      'recastingTheOmens',
    ]);
    expect(hasAbility(g.state, 0, 'riteOfTheHarvest')).toBe(true);
    expect(hasAbility(g.state, 0, 'recastingTheOmens')).toBe(true);
    expect(hasAbility(g.state, 0, 'omenReading')).toBe(true);
  });

  it('refuse everything they should, byte-identically', () => {
    const g = game();
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);

    // The technology.
    expect(riteError(g.state, 0, augur.id, 'riteOfTheHarvest')).toMatch(/not known/);
    learn(g.state, 0, 'divination');
    expect(riteError(g.state, 0, augur.id, 'riteOfTheHarvest')).toBeNull();

    // A rite nobody has heard of.
    expect(riteError(g.state, 0, augur.id, 'nonsense')).toMatch(/no rite called/);
    // A piece that performs none.
    const settler = g.state.units.find((u) => u.ownerId === 0 && u.type === 'settler');
    if (settler) expect(riteError(g.state, 0, settler.id, 'riteOfTheHarvest')).toMatch(/no rites/);
    // Out of reach: two hexes is not beside.
    expect(riteError(g.state, 0, augur.id, 'riteOfTheHarvest', { col: city.col + 3, row: city.row })).toMatch(
      /where the augur stands, or beside it/,
    );
    // An empty augur.
    augur.chargesLeft = 0;
    expect(riteError(g.state, 0, augur.id, 'riteOfTheHarvest')).toMatch(/no rites left/);
    augur.chargesLeft = 1;

    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'nonsense',
    } as unknown as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('is the augur’s one deed: the piece is spent, and a second rite has nobody to ask', () => {
    // Entry LVIII: an augur carries **one** charge, so a rite is not merely the
    // piece's turn — it is the piece. What used to be "three blessings over
    // three turns" is three augurs' worth of faith, which is the whole of what
    // the price ladder was built to ask.
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    expect(augur.chargesLeft).toBe(1);
    expect(augur.movesLeft).toBeGreaterThan(0);

    const rite = {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'riteOfTheHarvest',
    } as Command;
    expect(applyCommand(g.state, rite).ok).toBe(true);
    // Gone from the board, exactly as a worker that spends its last charge is.
    expect(g.state.units.find((u) => u.id === augur.id)).toBeUndefined();

    const before = snapshotState(g.state);
    const second = applyCommand(g.state, rite);
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.error).toMatch(/No unit with id/);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('holds an augur that spent its day to the *next* turn, both acts alike', () => {
    // The half of `augurHasActed` the one-charge rework did not delete: an augur
    // that walked its whole allowance to reach a town blesses it next turn. It
    // is the bargain every other piece makes with its movement, and it is what
    // keeps a bought augur from being walked to a front and spent in one breath.
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    augur.movesLeft = 0;

    expect(riteError(g.state, 0, augur.id, 'riteOfTheHarvest')).toMatch(/acted this turn/);
    // And the *other* act an augur can take is held to the same sentence.
    faith(g.state, 0, 'starReaders');
    expect(consecrateError(g.state, 0, augur.id)).toMatch(/acted this turn/);

    const before = snapshotState(g.state);
    const refused = applyCommand(g.state, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'riteOfTheHarvest',
    } as Command);
    expect(refused.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);

    // Next turn it may act: nothing counted down, `resetMovement` simply gave
    // the piece its day back.
    for (const player of g.state.players) {
      dispatch(g, { type: 'endTurn', playerId: player.id });
    }
    expect(augur.movesLeft).toBeGreaterThan(0);
    expect(riteError(g.state, 0, augur.id, 'riteOfTheHarvest')).toBeNull();
  });

  it('reach one hex, and default to where the augur stands', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const beside = augurAt(g.state, 0, city.col + 1, city.row);
    // No target named: the augur's own hex, which holds no city — so it must
    // name the town beside it.
    expect(riteError(g.state, 0, beside.id, 'riteOfTheHarvest')).toMatch(/needs one of your cities/);
    expect(
      riteError(g.state, 0, beside.id, 'riteOfTheHarvest', { col: city.col, row: city.row }),
    ).toBeNull();
  });

  it('Rite of the Harvest grants a citizen and re-seats the town', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    const before = city.population;
    const worked = city.workedTiles.length;

    expect(ritePreview(g.state, augur.id, 'riteOfTheHarvest')).toMatch(/\+1 pop/);
    expect(dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'riteOfTheHarvest',
    } as Command).ok).toBe(true);

    expect(city.population).toBe(before + 1);
    // The citizen is *placed*, not merely counted: the mid-turn register's whole
    // point (`refreshCityDerived`).
    expect(city.workedTiles.length).toBe(worked + 1);
    // The one charge, which is the whole augur (Entry LVIII).
    expect(g.state.units.find((u) => u.id === augur.id)).toBeUndefined();
  });

  it('Omen Reading banks beakers now and sharpens the scribes for twenty turns', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'earthenware', 'letters');
    const city = found(g.state, 0);
    city.buildings.push('library');
    const augur = augurAt(g.state, 0, city.col, city.row);
    const player = playerById(g.state, 0)!;
    const pool = player.sciencePool;
    const before = cityYields(g.state, city).science;

    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'omenReading',
    } as Command);

    // The instant half, settled through the research bucket's own routine.
    expect(player.sciencePool - pool).toBe(15);
    // The lasting half, read by the same fold a card's `countScaled` is.
    expect(cityYields(g.state, city).science).toBe(before + 1);
    expect(liveTimedEffects(g.state, city)).toHaveLength(1);
    expect(liveTimedEffects(g.state, city)[0]!.expiresTurn).toBe(g.state.turn + 20);
    // And it labels itself, with the turns left on it.
    const live = liveCityEffects(g.state, city).find((entry) => entry.card === 'omenReading');
    expect(live!.source).toMatch(/^Rite · Omen Reading \(20 turns left\)$/);
  });

  it('Consecration of the Bounds fills the border basket and speeds it', () => {
    const g = game();
    learn(g.state, 0, 'husbandry', 'earthenware', 'stonecraft');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    const banked = city.culture;
    const cost = borderCostFor(g.state, city);
    const before = borderGrowth(g.state, city);

    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'consecrationOfTheBounds',
    } as Command);

    // The border basket, not the empire's draft pool: two separate channels.
    // And it is **spent on the spot** since 2026-08-27 — fifteen culture covers
    // the first rung, so the tile is taken and the remainder stays banked toward
    // the next one (`settleBorderWindfall`, the register's entry 14).
    expect(city.tilesClaimed).toBe(1);
    expect(city.culture).toBe(banked + 15 - cost);
    const after = borderGrowth(g.state, city);
    expect(after.percent).toBe(before.percent + 30);
  });

  it('claims two tiles at once when the gift covers two rungs, and carries the rest', () => {
    // The user's rule read to its end: "reset the counter (with overflow) if it
    // exceeds the culture needed". Fifteen alone buys one rung; a town that had
    // already banked toward the next one buys both in the same instant, because
    // a gift is not accrual and the phase's one-tile-per-turn is a rate limit on
    // accrual.
    const g = game();
    learn(g.state, 0, 'husbandry', 'earthenware', 'stonecraft');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    const first = borderCostFor(g.state, city);
    city.culture = first;
    city.tilesClaimed = 0;
    const second = nextBorderCost(1);

    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'consecrationOfTheBounds',
    } as Command);

    expect(city.tilesClaimed).toBe(2);
    expect(city.culture).toBe(first + 15 - first - second);
  });

  it('merely banks a gift that covers nothing', () => {
    // The other side of the same rule: a town whose next rung is out of reach
    // keeps every point, exactly as it did before the seam existed.
    const g = game();
    learn(g.state, 0, 'husbandry', 'earthenware', 'stonecraft');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    // Far up the curve, where fifteen culture is not close to a tile.
    city.tilesClaimed = 12;
    city.culture = 0;

    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'consecrationOfTheBounds',
    } as Command);

    expect(city.tilesClaimed).toBe(12);
    expect(city.culture).toBe(15);
  });

  it('takes the augur off the board, so there is nothing left to march', () => {
    // User, 2026-08-27: "the rite should end the augur's turn" — and since Entry
    // LVIII it ends rather more than that. A rite is the day's work *and* the
    // piece, so the march after one is refused because there is nobody to order.
    const g = game();
    learn(g.state, 0, 'husbandry', 'earthenware', 'stonecraft');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    expect(augur.movesLeft).toBeGreaterThan(0);

    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'consecrationOfTheBounds',
    } as Command);

    expect(g.state.units.find((u) => u.id === augur.id)).toBeUndefined();
    expect(
      applyCommand(g.state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: augur.id,
        target: { col: city.col + 1, row: city.row },
      } as Command).ok,
    ).toBe(false);
  });

  it('reports what it paid as labelled lines, and how long the blessing runs', () => {
    // The toast's raw material. Written beside each payment rather than derived
    // from which report fields came back non-null.
    const g = game();
    learn(g.state, 0, 'husbandry', 'earthenware', 'stonecraft');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    const player = g.state.players[0]!;
    const done = performRiteAt(g.state, player, augur, 'consecrationOfTheBounds');
    expect(done.grants).toEqual([{ label: 'Culture to the bounds', amount: 15 }]);
    expect(done.turns).toBe(riteDef('consecrationOfTheBounds').duration);
    expect(done.bordersClaimed).toHaveLength(1);
    expect(done.name).toBe(riteDef('consecrationOfTheBounds').name);
    expect(done.city).toBe(city);
  });

  it('Blessing of Arms heals a unit whole and pays five turns of strength', () => {
    const g = game();
    learn(g.state, 0, 'mining', 'earthenware', 'bronzeWorking');
    const warrior = createUnit(g.state, 0, 'warrior', 4, 4);
    const theirs = createUnit(g.state, 1, 'warrior', 5, 4);
    warrior.hp = 40;
    const augur = augurAt(g.state, 0, 4, 4);
    const before = forecast(g.state, warrior.id, theirs.col, theirs.row);

    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'blessingOfArms',
      target: { col: 4, row: 4 },
    } as Command);

    expect(warrior.hp).toBe(unitDef('warrior').maxHp);
    const after = forecast(g.state, warrior.id, theirs.col, theirs.row);
    expect(after.attackerStrength).toBe(before.attackerStrength + 5);
    expect(after.bonuses.some((line) => line.source.includes('Blessing of Arms'))).toBe(true);
    expect(liveTimedEffects(g.state, warrior)[0]!.expiresTurn).toBe(g.state.turn + 5);
    // The **combatant** on the hex, not the augur standing beside it.
    expect(liveTimedEffects(g.state, augur)).toEqual([]);
  });

  it('Rite of Plenty pays coin now and enriches this town’s seams after', () => {
    const g = game();
    // Currency keeps the feast since the re-cut of 2026-09-02 pruned Calendar —
    // the rite pays coin, so it belongs on the node that invents it.
    learn(g.state, 0, 'earthenware', 'currency');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    const player = playerById(g.state, 0)!;
    const gold = player.gold;

    // A seam inside the town's own rings, so the tile line has somewhere to land.
    const seam = getTileAt(g.state.map, city.col + 1, city.row)!;
    seam.resource = 'wheat';

    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'riteOfPlenty',
    } as Command);

    expect(player.gold - gold).toBe(25);
    // The tile line is the **city's**, so it reaches the hex only through that
    // city's own context — the granary's rule, one producer over.
    const empire = yieldContextFor(g.state, 0)!;
    expect((empire.lines ?? []).some((line) => line.source.includes('Rite of Plenty'))).toBe(false);
    expect(cityYields(g.state, city)).toBeDefined();
    const live = liveCityEffects(g.state, city).find((entry) => entry.card === 'riteOfPlenty');
    expect(live).toBeDefined();
  });

  it('spends the augur on its last rite, exactly as a worker is spent', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    augur.chargesLeft = 1;
    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'riteOfTheHarvest',
    } as Command);
    expect(g.state.units.some((u) => u.id === augur.id)).toBe(false);
  });
});

// --- recasting the omens ----------------------------------------------------

/**
 * The rite that gives a god back (user ruling, 2026-08-29).
 *
 * Two halves and both are here: the *give-back* is a rite like any other — one
 * charge, the augur's whole turn, refused before anything mutates — and the
 * *offer* it opens is Entry XV's shape for the fifth time, answered by the same
 * `chooseBelief` that answers a Consecrate. What is worth pinning is the seam
 * between them: the slot count is restored by the pick rather than counted
 * anywhere, and the bag the hand comes out of is the one thing that makes a
 * recast different from a Consecrate.
 */
describe('recasting the omens', () => {
  /** A seat with Divination, an augur, and one god already named. */
  function ready(seed = 7) {
    const g = game(seed);
    learn(g.state, 0, 'divination');
    learn(g.state, 1, 'divination');
    const augur = augurAt(g.state, 0, 5, 5);
    const player = playerById(g.state, 0)!;
    return { g, augur, player };
  }

  const RECAST = 'recastingTheOmens' as const;
  const GODS = BELIEF_IDS.filter(isPantheonBeliefId);

  it('gives the god back, deals a hand without it, and spends the augur', () => {
    const { g, augur, player } = ready();
    const given = GODS[0]!;
    const rival = GODS[1]!;
    keep(g.state, 0, given);
    keep(g.state, 1, rival);

    expect(
      dispatch(g, { type: 'performRite', playerId: 0, unitId: augur.id, rite: RECAST, belief: given } as Command)
        .ok,
    ).toBe(true);

    // The god is out of the pantheon, and the slot it held is empty until the
    // pick fills it.
    expect(player.pantheon.beliefs).toEqual([]);
    const offer = player.pantheon.pending!;
    expect(offer.options).toHaveLength(RULES.offers.belief);
    expect(new Set(offer.options).size).toBe(offer.options.length);
    // **A reroll that re-offers the same god is not a reroll** — deliberately
    // the opposite of a prophet's redraft, which puts a pool back in the bag.
    expect(offer.options).not.toContain(given);
    // And the world's rule still holds: a rival's god is nobody else's.
    expect(offer.options).not.toContain(rival);
    // The offer says what it was dealt in place of, so the card has a line.
    expect(offer.givenBack).toBe(given);
    // The one charge, which is the whole augur — and the hand is still on the
    // seat: the piece paying for it is gone and the decision is not.
    expect(g.state.units.some((u) => u.id === augur.id)).toBe(false);
  });

  it('takes the augur’s last charge like every other rite', () => {
    const { g, augur } = ready();
    keep(g.state, 0, GODS[0]!);
    augur.chargesLeft = 1;
    expect(
      dispatch(g, { type: 'performRite', playerId: 0, unitId: augur.id, rite: RECAST, belief: GODS[0]! } as Command)
        .ok,
    ).toBe(true);
    expect(g.state.units.some((u) => u.id === augur.id)).toBe(false);
    // The hand is still on the seat: the piece paying for it is gone and the
    // decision is not.
    expect(playerById(g.state, 0)!.pantheon.pending).toBeDefined();
  });

  it('restores the count through the ordinary pick, which appends', () => {
    const { g, augur, player } = ready();
    keep(g.state, 0, GODS[0]!);
    keep(g.state, 0, GODS[1]!);
    dispatch(g, { type: 'performRite', playerId: 0, unitId: augur.id, rite: RECAST, belief: GODS[0]! } as Command);
    expect(player.pantheon.beliefs).toEqual([GODS[1]!]);
    const dealt = [...player.pantheon.pending!.options];
    expect(dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 1 } as Command).ok).toBe(true);
    expect(player.pantheon.beliefs).toEqual([GODS[1]!, dealt[1]!]);
    expect('pending' in player.pantheon).toBe(false);
    expect(religionBlocker(player)).toBeNull();
  });

  it('refuses every way it should, byte-identically', () => {
    // **A seat with nothing to give back.** The first refusal, and the one a
    // player meets before they have a pantheon at all.
    const empty = ready();
    expect(riteError(empty.g.state, 0, empty.augur.id, RECAST, undefined, GODS[0]!)).toMatch(
      /no belief to give back/,
    );

    const { g, augur, player } = ready();
    keep(g.state, 0, GODS[0]!);

    // A belief the seat does not hold, and a missing one, are one sentence.
    expect(riteError(g.state, 0, augur.id, RECAST, undefined, GODS[1]!)).toMatch(
      /one of your own beliefs/,
    );
    expect(riteError(g.state, 0, augur.id, RECAST)).toMatch(/one of your own beliefs/);
    expect(riteError(g.state, 0, augur.id, RECAST, undefined, 'notAGod')).toMatch(
      /one of your own beliefs/,
    );

    // Every one of them leaves the state exactly as it was.
    const before = snapshotState(g.state);
    for (const belief of [undefined, GODS[1]!, 'notAGod']) {
      expect(
        applyCommand(g.state, {
          type: 'performRite',
          playerId: 0,
          unitId: augur.id,
          rite: RECAST,
          belief,
        } as Command).ok,
      ).toBe(false);
    }
    expect(snapshotState(g.state)).toBe(before);

    // **An offer already outstanding.** The augur's own gate, and it is the
    // same sentence a second Consecrate gives.
    dispatch(g, { type: 'performRite', playerId: 0, unitId: augur.id, rite: RECAST, belief: GODS[0]! } as Command);
    const second = augurAt(g.state, 0, 5, 5);
    keep(g.state, 0, GODS[1]!);
    expect(riteError(g.state, 0, second.id, RECAST, undefined, GODS[1]!)).toMatch(
      /waiting to be chosen/,
    );
    const held = snapshotState(g.state);
    expect(
      applyCommand(g.state, {
        type: 'performRite',
        playerId: 0,
        unitId: second.id,
        rite: RECAST,
        belief: GODS[1]!,
      } as Command).ok,
    ).toBe(false);
    expect(snapshotState(g.state)).toBe(held);
    expect(player.pantheon.pending!.givenBack).toBe(GODS[0]!);
  });

  it('refuses a recast that could deal nothing, rather than opening a hand nobody can answer', () => {
    // The deadlock this clause exists to prevent: an empty offer is a `pending`
    // no `chooseBelief` can spend and no End Turn can clear.
    const { g, augur } = ready();
    for (const id of GODS) keep(g.state, 0, id);
    expect(riteError(g.state, 0, augur.id, RECAST, undefined, GODS[0]!)).toMatch(
      /no other beliefs left/,
    );
  });

  it('replays byte for byte', () => {
    // The whole verb through the log alone: the give-back is a splice, the hand
    // is dealt from `state.rng` at the moment the offer opens, and the pick
    // names an index into it.
    const play = () => {
      const { g, augur } = ready(21);
      keep(g.state, 0, GODS[0]!);
      keep(g.state, 1, GODS[1]!);
      dispatch(g, {
        type: 'performRite',
        playerId: 0,
        unitId: augur.id,
        rite: RECAST,
        belief: GODS[0]!,
      } as Command);
      dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
      return g;
    };
    const first = play();
    const second = play();
    expect(snapshotState(second.state)).toBe(snapshotState(first.state));
    expect(playerById(first.state, 0)!.pantheon.beliefs).toHaveLength(1);
    expect(playerById(first.state, 0)!.pantheon.beliefs[0]).not.toBe(GODS[0]!);
    expect(playerById(first.state, 0)!.pantheon.beliefs[0]).not.toBe(GODS[1]!);
  });

  it('is a rite the table itself calls a redraw, and pays no bucket', () => {
    const def = riteDef(RECAST);
    expect(def.redraws).toBe('pantheon');
    expect(def.grant).toBeUndefined();
    // The sentence a player reads is the row's own prose, not a second wording
    // composed in the interface (hard rule 7).
    expect(def.note).toBeTruthy();
    const { g, augur } = ready();
    expect(ritePreview(g.state, augur.id, RECAST)).toBe(def.note);
  });
});

// --- timed effects ----------------------------------------------------------

describe('timed effects', () => {
  it('run out on the exact turn they name, and not the one before', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'earthenware', 'letters');
    const city = found(g.state, 0);
    city.buildings.push('library');
    const augur = augurAt(g.state, 0, city.col, city.row);
    const bare = cityYields(g.state, city).science;

    performRiteAt(g.state, playerById(g.state, 0)!, augur, 'omenReading');
    const expires = city.timed![0]!.expiresTurn;
    expect(expires).toBe(g.state.turn + 20);

    // Live on the last turn before the expiry…
    g.state.turn = expires - 1;
    expect(cityYields(g.state, city).science).toBe(bare + 1);
    // …and inert on the expiry itself. A comparison, never a countdown.
    g.state.turn = expires;
    expect(cityYields(g.state, city).science).toBe(bare);
  });

  it('are swept without changing any answer — a broom, not a clock', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'earthenware', 'letters');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    performRiteAt(g.state, playerById(g.state, 0)!, augur, 'omenReading');
    const expires = city.timed![0]!.expiresTurn;

    g.state.turn = expires;
    const beforeSweep = cityYields(g.state, city).science;
    pruneTimedEffects(g.state);
    expect(cityYields(g.state, city).science).toBe(beforeSweep);
    // The key is *deleted*, so a town whose blessings have run out serialises
    // exactly like one that was never blessed.
    expect('timed' in city).toBe(false);
  });

  it('leave a still-live effect alone when the broom passes', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'earthenware', 'letters');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    performRiteAt(g.state, playerById(g.state, 0)!, augur, 'omenReading');
    pruneTimedEffects(g.state);
    expect(city.timed).toHaveLength(1);
  });

  it('fold into the same lists a card does, never into a channel of their own', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'earthenware', 'letters');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    const empireOnly = liveEffects(g.state, 0).length;
    performRiteAt(g.state, playerById(g.state, 0)!, augur, 'omenReading');
    // The empire's own walk is unchanged — a rite is a fact about a town.
    expect(liveEffects(g.state, 0)).toHaveLength(empireOnly);
    // And the city's walk is the empire's plus this one.
    expect(liveCityEffects(g.state, city)).toHaveLength(empireOnly + 1);
  });
});

// --- the log ----------------------------------------------------------------

describe('determinism', () => {
  it('leaves a refused rite, purchase and consecration unobservable', () => {
    const g = game();
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    const before = snapshotState(g.state);
    // Every one of the four commands, each refused for a different reason.
    applyCommand(g.state, {
      type: 'purchaseItem', playerId: 0, cityId: city.id, item: { kind: 'unit', id: 'augur' }, currency: 'faith',
    } as Command);
    applyCommand(g.state, { type: 'consecrate', playerId: 0, unitId: augur.id } as Command);
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    applyCommand(g.state, {
      type: 'performRite', playerId: 0, unitId: augur.id, rite: 'riteOfTheHarvest',
    } as Command);
    expect(snapshotState(g.state)).toEqual(before);
  });
});

// --- what the interface reads ----------------------------------------------

describe('the panel’s reading', () => {
  it('gives every rite a preview or an honest silence', () => {
    const g = game();
    learn(g.state, 0, ...RITE_IDS.map((id) => riteDef(id).tech));
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    createUnit(g.state, 0, 'warrior', city.col, city.row);
    for (const id of RITE_IDS) {
      const preview = ritePreview(g.state, augur.id, id);
      expect(preview, id).not.toBeNull();
      expect(preview!.length, id).toBeGreaterThan(0);
    }
  });

  it('names each belief’s axis, and every axis is one the screen knows', () => {
    for (const id of BELIEF_IDS) {
      expect(beliefDef(id).axis, id).toBeTruthy();
    }
  });
});

// --- pacing -----------------------------------------------------------------


// --- religion v2: the prophet, the religion and the tide --------------------

/**
 * Religion v2 (`docs/religion-v2.md`, ratified 2026-08-27).
 *
 * Six concerns, and they are one system: the technology that opens it, the
 * founding and its three refusals, the **citizen model** (which is the whole of
 * "a city follows a religion"), every pressure source with its number, the
 * prophet's four verbs, and what a follower belief pays whom.
 *
 * The tide is tested by **running the phase**, not by asserting what was
 * banked: a pressure line that is computed and never converts anybody is exactly
 * the silence the pass exists to avoid, and only a timeline can see the
 * difference between "the number is right" and "the town turns when the design
 * says it does".
 */

/** A town for a player at a chosen hex. Scaffolding — founding has its own tests. */
function town(state: GameState, playerId: number, col: number, row: number) {
  return foundCityAt(state, playerId, getTileAt(state.map, col, row)!);
}

/** A prophet standing on a tile, with full charges. Scaffolding, not a purchase. */
function prophetAt(state: GameState, playerId: number, col: number, row: number) {
  return createUnit(state, playerId, 'prophet', col, row);
}

/** Plants a holy site on a hex and books it to a city, the way a prophet would. */
function siteAt(state: GameState, city: { id: number }, col: number, row: number): void {
  const tile = getTileAt(state.map, col, row)!;
  tile.improvement = 'holySite';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
}

/**
 * A hex beside this town a prophet could actually plant on — land, unimproved,
 * and inside the town's own bounds. A holy site is an improvement like any
 * other, so the fixture has to find ground the way a player would.
 */
function landBeside(
  state: GameState,
  city: { col: number; row: number },
  ...avoid: { col: number; row: number }[]
) {
  for (const tile of mapRange(state.map, tileHex(getTileAt(state.map, city.col, city.row)!), 1)) {
    if (tile.col === city.col && tile.row === city.row) continue;
    if (avoid.some((hex) => hex.col === tile.col && hex.row === tile.row)) continue;
    if (improvementErrorAt(state, 0, tile, 'holySite') === null) return tile;
  }
  throw new Error('no ground beside the town');
}

/** A founded religion for a seat, with one god behind it. */
function faith(state: GameState, playerId: number, god: BeliefId = 'keeperOfTheHearth') {
  keep(state, playerId, god);
  return foundReligion(state, playerById(state, playerId)!);
}

/**
 * The simulation's own text, through Vite's raw glob — `cities.test.ts`'s
 * pattern, and here for its reason: `cityContext` is deliberately private, so
 * "the sixth tile-line producer is wired in" is a claim about the source.
 */
const SIM_SOURCE = import.meta.glob('../../src/sim/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function simSource(file: string): string {
  const key = Object.keys(SIM_SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return SIM_SOURCE[key!]!;
}

describe('the religion v2 table', () => {
  it('gives every follower and enhancer belief words, or says what is missing', () => {
    for (const id of [...FOLLOWER_BELIEF_IDS, ...ENHANCER_BELIEF_IDS]) {
      const clauses = describeCard(id);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) expect(clause.text.length, id).toBeTruthy();
      // A row with nothing to say says **why**, and the card prints it struck
      // through — Entry XV.b's rule, which is why five follower rows ship with
      // no effects rather than with a shape that nearly fits.
      if (beliefDef(id).effects.length === 0) {
        expect(clauses.some((clause) => clause.deferred), id).toBe(true);
      }
    }
  });

  it('keeps one id space across all three pools', () => {
    const all = [...BELIEF_IDS, ...FOLLOWER_BELIEF_IDS, ...ENHANCER_BELIEF_IDS, ...RITE_IDS];
    expect(new Set(all).size).toBe(all.length);
    for (const id of all) expect(anyCardDef(id).name.length, id).toBeGreaterThan(0);
    // And the pantheon's bag is still only the pantheon's: a Consecrate must
    // never deal a follower belief.
    for (const id of FOLLOWER_BELIEF_IDS) expect(isPantheonBeliefId(id), id).toBe(false);
  });

  it('reads both new shapes from a live row — the register', () => {
    // `statecraft.test.ts`'s register, one table over: a shape declared and
    // never used is a shape nobody has tested. Both of these are read in exactly
    // one place (`explainPressure`) and both are asserted end to end above — the
    // enhancer's shift and Hagia Sophia's projection.
    const used = new Set<string>();
    for (const id of [...ENHANCER_BELIEF_IDS, ...FOLLOWER_BELIEF_IDS, ...BELIEF_IDS]) {
      for (const effect of beliefDef(id).effects) used.add(effect.kind);
    }
    for (const effect of buildingDef('hagiaSophia').effects ?? []) used.add(effect.kind);
    expect(used.has('pressureRule')).toBe(true);
    expect(used.has('pressure')).toBe(true);
  });

  it('holds enough of each pool to fill an offer several times over', () => {
    expect(FOLLOWER_BELIEF_IDS.length).toBeGreaterThanOrEqual(RULES.offers.belief * 3);
    expect(ENHANCER_BELIEF_IDS.length).toBeGreaterThanOrEqual(RULES.offers.belief * 3);
  });
});

describe('The High Temple', () => {
  it('is the node that hands over the prophet, the temple and a third god', () => {
    const def = techDef('theHighTemple' as never);
    expect(def.age).toBe(2);
    // Re-cut again on 2026-09-02: Standing Stones is pruned and the faith line
    // hangs off itself — Divination → Ancestor Rites → The High Temple, the
    // middle rung added by the chain pass so the line lays out as a line rather
    // than as three siblings sharing one column.
    expect(def.prereqs).toEqual(['divination', 'ancestorRites']);
    expect(def.unlocks.units ?? []).toContain('prophet');
    expect(def.unlocks.buildings ?? []).toContain('temple');
    expect(def.unlocks.abilities ?? []).toContain('thePreaching');
    // The temple **moved**: Philosophy was where it stood on the shipped tree,
    // and a building unlocked twice would be a building whose gate depends on
    // which node the player happened to take first.
    expect(techDef('philosophy').unlocks.buildings ?? []).not.toContain('temple');
    // And the slot is a JSON row, not a code change — `slotsFromTechs`' rule.
    expect(slotsFromTechs(['divination'] as never)).toBe(2);
    expect(slotsFromTechs(['divination', 'theHighTemple'] as never)).toBe(3);
  });

  it('opens the prophet on its own faith ladder, and never to gold', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    const city = found(g.state, 0);
    const PROPHET: PurchasableItem = { kind: 'unit', id: 'prophet' };
    const spec = unitDef('prophet').purchase!;
    const price = explainPurchaseCost(g.state, 0, city.id, PROPHET, 'faith')!;
    expect(price.total).toBe(spec.cost);
    expect(explainPurchaseCost(g.state, 0, city.id, PROPHET, 'gold')).toBeNull();

    // The ladder is the prophet's own, not the augur's: six augurs must not
    // make the first prophet dearer.
    const player = playerById(g.state, 0)!;
    player.augursPurchased = 6;
    expect(explainPurchaseCost(g.state, 0, city.id, PROPHET, 'faith')!.total).toBe(spec.cost);
    player.prophetsPurchased = 1;
    expect(explainPurchaseCost(g.state, 0, city.id, PROPHET, 'faith')!.total).toBe(
      spec.cost + spec.increment!,
    );
  });

  it('climbs the prophet ladder when one is bought, and not the augur’s', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    purchaseItemAt(g.state, player, city, { kind: 'unit', id: 'prophet' }, 'faith');
    expect(player.prophetsPurchased).toBe(1);
    expect(player.augursPurchased).toBe(0);
    expect(g.state.units.some((u) => u.type === 'prophet')).toBe(true);
  });
});

describe('founding a religion', () => {
  it('refuses an empire with no gods, and the refusal leaves the state byte-identical', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    found(g.state, 0);
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const prophet = prophetAt(g.state, 0, unit.col, unit.row);
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'plantHolySite',
      playerId: 0,
      unitId: prophet.id,
    } as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('refuses once the world holds every religion it will', () => {
    const g = game();
    // Two real seats: two thirds of two, rounded up, is two.
    expect(maxReligions(g.state)).toBe(2);
    faith(g.state, 0);
    faith(g.state, 1, 'starReaders');
    keep(g.state, 0, 'godOfTheForge');
    // A third seat's would be the third religion, and there is no room.
    const third = game();
    expect(foundReligionError(g.state, 0)).toBe('Ada has already founded a religion');
    void third;
    const g2 = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
        { name: 'Cleo', color: '#4caf50' },
      ],
    });
    // Three seats: two thirds rounded up is two, so the third empire is refused.
    expect(maxReligions(g2.state)).toBe(2);
    faith(g2.state, 0);
    faith(g2.state, 1, 'starReaders');
    keep(g2.state, 2, 'godOfTheForge');
    expect(foundReligionError(g2.state, 2)).toBe('The world has all the religions it will hold');
  });

  it('generates the same name from the same generator state, out of its own axes', () => {
    const a = game(11);
    const b = game(11);
    keep(a.state, 0, 'keeperOfTheHearth');
    keep(b.state, 0, 'keeperOfTheHearth');
    const one = foundReligion(a.state, playerById(a.state, 0)!);
    const two = foundReligion(b.state, playerById(b.state, 0)!);
    expect(one.name).toBe(two.name);
    expect(one.name.length).toBeGreaterThan(0);
    // Made out of the pantheon it was founded on: a hearth god names a hearth
    // faith, whichever pattern the generator picked.
    const hearth = RELIGION.names.epithets.hearth ?? [];
    expect(hearth.some((word) => one.name.includes(word))).toBe(true);
    // The pantheon is a **copy**: a fourth god later does not rename the faith.
    keep(a.state, 0, 'starReaders');
    expect(one.pantheon).toEqual(['keeperOfTheHearth']);
  });

  it('founds, plants and opens TWO drafts in one act — and blocks End Turn', () => {
    // Entry LVIII's founding: one prophet, one deed, **two** beliefs. The second
    // hand is *drawn when the first is answered* rather than dealt alongside it,
    // because both come out of the same bag — so the pin worth having is that
    // the second offer never re-offers what the first pick took.
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    found(g.state, 0);
    keep(g.state, 0, 'keeperOfTheHearth');
    // Off the town's own hex: a holy site is an improvement like any other and
    // a city tile takes none (`improvementErrorAt`), which is the refusal a
    // prophet standing in the gates gets.
    const seat = g.state.cities.find((city) => city.ownerId === 0)!;
    const ground = landBeside(g.state, seat);
    const prophet = prophetAt(g.state, 0, ground.col, ground.row);
    const result = applyCommand(g.state, {
      type: 'plantHolySite',
      playerId: 0,
      unitId: prophet.id,
    } as Command);
    expect(result.ok).toBe(true);
    const religion = foundedReligion(g.state, 0)!;
    expect(religion.founderId).toBe(0);
    expect(ground.improvement).toBe('holySite');
    const player = playerById(g.state, 0)!;
    expect(player.pantheon.pending?.pool).toBe('follower');
    expect(player.pantheon.owed).toBe(1);
    expect(religionBlocker(player)).toBe('a belief is waiting to be chosen');

    // The first pick puts the belief on the **religion**, never on the pantheon
    // — and opens the second hand on the spot.
    const first = player.pantheon.pending!.options[0]!;
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    expect(religion.follower).toEqual([first]);
    expect(player.pantheon.beliefs).toEqual(['keeperOfTheHearth']);
    // Owed nothing more, and holding the second hand.
    expect(player.pantheon.owed).toBeUndefined();
    const second = player.pantheon.pending!;
    expect(second.pool).toBe('follower');
    expect(second.options).not.toContain(first);
    expect(religionBlocker(player)).toBe('a belief is waiting to be chosen');

    const taken = second.options[0]!;
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    expect(religion.follower).toEqual([first, taken]);
    expect(religionBlocker(player)).toBeNull();
    // And the prophet is gone: one charge, one deed, two beliefs.
    expect(g.state.units.find((u) => u.id === prophet.id)).toBeUndefined();
  });

  it('refuses a second founding, so a prophet can never raise a second site', () => {
    // Entry LVIII: planting IS founding, and there is no later planting. The
    // refusal is `foundReligionError`'s own sentence, asked unconditionally.
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    found(g.state, 0);
    keep(g.state, 0, 'keeperOfTheHearth');
    const seat = g.state.cities.find((city) => city.ownerId === 0)!;
    const ground = landBeside(g.state, seat);
    const first = prophetAt(g.state, 0, ground.col, ground.row);
    expect(applyCommand(g.state, { type: 'plantHolySite', playerId: 0, unitId: first.id } as Command).ok).toBe(true);
    // Both of the founding's drafts answered, so the refusal below is the
    // *founding* one rather than the pending-offer one every prophet verb
    // shares.
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);

    const elsewhere = landBeside(g.state, seat, ground);
    const second = prophetAt(g.state, 0, elsewhere.col, elsewhere.row);
    expect(plantHolySiteError(g.state, 0, second.id)).toMatch(/already founded a religion/);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'plantHolySite', playerId: 0, unitId: second.id } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('tells a bought prophet standing on the city centre to move, not the ground’s own sentence', () => {
    // The bug report (user, 2026-08-28): "I have my first prophet and I can't
    // create a religion with it." A bought prophet spawns on the town's own
    // hex, where `improvementErrorAt` would refuse with "Uruk stands on
    // (x, y)" — true, but not the useful thing, and it never surfaces
    // anywhere but a greyed row's hover. `plantHolySiteError` now names the
    // fix before it ever asks the ground.
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    found(g.state, 0);
    const seat = g.state.cities.find((city) => city.ownerId === 0)!;
    // No gods yet, and this prophet's charge would found the religion — the
    // exact shape of the report. The city-centre sentence still wins: this
    // prophet has nothing to found *with*, and the fix is the same move
    // either way.
    keep(g.state, 0, 'keeperOfTheHearth');
    const prophet = prophetAt(g.state, 0, seat.col, seat.row);
    expect(plantHolySiteError(g.state, 0, prophet.id)).toBe(
      'Move the prophet off the city centre to plant a holy site',
    );
  });

  it('still leads with a founding refusal on the city centre, when there is one', () => {
    // Precedence: the empire-wide question (no gods to found on) is asked
    // before the ground is, so a player with no pantheon yet reads that
    // refusal rather than being told to walk to ground that would not help
    // them either.
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    found(g.state, 0);
    const seat = g.state.cities.find((city) => city.ownerId === 0)!;
    const prophet = prophetAt(g.state, 0, seat.col, seat.row);
    expect(plantHolySiteError(g.state, 0, prophet.id)).toBe(
      'You have no gods to found a religion on',
    );
  });

  it('renames a religion, and refuses a name that is not one', () => {
    const g = game();
    faith(g.state, 0);
    expect(applyCommand(g.state, {
      type: 'renameReligion',
      playerId: 0,
      name: '  The Long Quiet  ',
    } as Command).ok).toBe(true);
    expect(foundedReligion(g.state, 0)!.name).toBe('The Long Quiet');
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, {
      type: 'renameReligion',
      playerId: 0,
      name: '   ',
    } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });
});

describe('the citizen model', () => {
  it('banks pressure and turns one citizen per printed cost, unconverted first', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    // Far enough that only the site presses: the founder's own capital converts
    // itself on turn one and would otherwise be a second source three hexes on.
    siteAt(g.state, seat, 10, 6);
    const target = town(g.state, 1, 12, 6);
    target.population = 4;

    const per = RULES.religion.pressurePerConvert;
    const site = RULES.religion.siteStrength;
    spreadReligion(g.state);
    expect(target.pressureBank?.[religion.id]).toBe(site);
    expect(target.followers).toBeUndefined();
    spreadReligion(g.state);
    // Two turns of six is twelve: one citizen turns and two carry.
    expect(target.followers?.[religion.id]).toBe(1);
    expect(target.pressureBank?.[religion.id]).toBe(2 * site - per);
  });

  it('converts a size-4 town under one holy site in five turns — the tuning', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    siteAt(g.state, seat, 10, 6);
    const target = town(g.state, 1, 12, 6);
    target.population = 4;

    for (let turn = 0; turn < 4; turn++) spreadReligion(g.state);
    // Two of four is not a majority: the town still follows nothing.
    expect(cityReligion(target)).toBeNull();
    spreadReligion(g.state);
    expect(target.followers?.[religion.id]).toBe(3);
    expect(cityReligion(target)).toBe(religion.id);
  });

  it('converts a road-joined town in eight turns — the tuning, the other lever', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    seat.followers = { [religion.id]: seat.population };
    const target = town(g.state, 1, 12, 6);
    target.population = 4;
    // A paved line between the two, and nothing else: six hexes is well beyond
    // a following city's own reach, so the road is the whole of the pressure.
    for (let col = 7; col <= 11; col++) getTileAt(g.state.map, col, 6)!.road = 0;
    expect(
      explainPressure(g.state, target).find((line) => line.source === 'Road')?.amount,
    ).toBe(RULES.religion.roadStrength);

    for (let turn = 0; turn < 7; turn++) spreadReligion(g.state);
    expect(cityReligion(target)).toBeNull();
    spreadReligion(g.state);
    expect(cityReligion(target)).toBe(religion.id);
  });

  it('takes from the smallest congregation once nobody is unconverted', () => {
    const g = game();
    const first = faith(g.state, 0);
    const second = faith(g.state, 1, 'starReaders');
    const target = town(g.state, 0, 8, 6);
    target.population = 3;
    target.followers = { [first.id]: 1, [second.id]: 2 };
    // A third religion would be a third row; two is what this world holds.
    convertCitizen(target, second.id, [first.id, second.id]);
    expect(target.followers).toEqual({ [second.id]: 3 });
  });

  it('gives a grown citizen to nobody, and takes a starved one from the largest', () => {
    const g = game();
    const first = faith(g.state, 0);
    const second = faith(g.state, 1, 'starReaders');
    const city = town(g.state, 0, 8, 6);
    city.population = 3;
    city.followers = { [first.id]: 1, [second.id]: 2 };
    expect(cityReligion(city)).toBe(second.id);

    // Growth: the new mouth believes nothing, so the majority is lost.
    city.population = 4;
    expect(unconvertedCitizens(city)).toBe(1);
    expect(cityReligion(city)).toBeNull();

    // Starvation: the largest congregation gives one up.
    city.population = 3;
    shrinkFollowers(city, [first.id, second.id]);
    expect(city.followers).toEqual({ [first.id]: 1, [second.id]: 1 });
  });
});

describe('the pressure ledger', () => {
  it('names every source with its own number, and folds to the total', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    siteAt(g.state, seat, 6, 6);
    const target = town(g.state, 1, 8, 6);

    const lines = explainPressure(g.state, target);
    const site = lines.find((line) => line.source === 'Holy site')!;
    expect(site.amount).toBe(RULES.religion.siteStrength);
    expect(site.religion).toBe(religion.id);
    // The fold is the total, which is what `pressureTotals` answers with.
    const totals = pressureTotals(g.state, target);
    expect(totals[religion.id]).toBe(
      lines.filter((line) => line.religion === religion.id).reduce((sum, line) => sum + line.amount, 0),
    );
  });

  it('pays a founder’s own capital for its own faith, and a following neighbour for the tide', () => {
    const g = game();
    const capital = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    capital.followers = { [religion.id]: capital.population };
    const near = town(g.state, 0, 7, 6);

    const own = explainPressure(g.state, capital);
    expect(own.find((line) => line.source === 'Your capital')?.amount).toBe(
      RULES.religion.capitalStrength,
    );
    const beside = explainPressure(g.state, near);
    expect(beside.find((line) => line.source === 'Nearby city')?.amount).toBe(
      RULES.religion.cityStrength,
    );
  });

  it('doubles a town’s own faith at its temple and halves everybody else’s', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const mine = faith(g.state, 0);
    const theirs = faith(g.state, 1, 'starReaders');
    siteAt(g.state, seat, 6, 6);
    const other = town(g.state, 1, 9, 6);
    other.followers = { [theirs.id]: other.population };
    siteAt(g.state, other, 9, 6);

    const target = town(g.state, 1, 8, 6);
    target.population = 4;
    target.followers = { [theirs.id]: 3 };
    expect(cityReligion(target)).toBe(theirs.id);

    const bare = pressureTotals(g.state, target);
    target.buildings.push('temple');
    const walled = pressureTotals(g.state, target);
    // Its own faith is doubled and the rival's halved — one multiplication,
    // taken once, carried as the difference so the list still sums.
    expect(walled[theirs.id]).toBe(Math.floor((bare[theirs.id]! * RULES.religion.templeOwnPercent) / 100));
    expect(walled[mine.id]).toBe(Math.floor((bare[mine.id]! * RULES.religion.templeForeignPercent) / 100));
    const lines = explainPressure(g.state, target).filter((line) => line.source === 'Temple');
    expect(lines.length).toBe(2);
  });

  /**
   * The faith bomb, ruled 2026-08-28: **"an immediate burst of pressure applied
   * instantly, following the regular conversion rules, just as a lump sum"**.
   *
   * Every one of these follows the lump end to end rather than asserting what
   * was banked — the tide's own discipline — because the whole of the ruling is
   * that a town *turns* while the player is still looking at it.
   */
  function bombWorld(population: number) {
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    const target = town(g.state, 1, 8, 6);
    target.population = population;
    const prophet = prophetAt(g.state, 0, 7, 6);
    return { g, religion, target, prophet };
  }

  function proclaim(g: ReturnType<typeof game>, prophetId: number) {
    const result = applyCommand(g.state, {
      type: 'proclaim',
      playerId: 0,
      unitId: prophetId,
    } as Command);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    return result;
  }

  it('lands the whole lump at once: a size-seven town follows the turn it is bombed', () => {
    const { g, religion, target, prophet } = bombWorld(7);
    expect(target.followers).toBeUndefined();

    const result = proclaim(g, prophet.id);
    // 60 banked against 10 a convert is six citizens, and six of seven is a
    // majority — the town changes its banner inside the command.
    expect(target.followers?.[religion.id]).toBe(6);
    expect(cityReligion(target)).toBe(religion.id);
    // The lump divided exactly, so nothing carries.
    expect(target.pressureBank).toBeUndefined();

    // And the news the interface says it with. See `ProclamationReport`.
    expect(result.proclaimed?.religionId).toBe(religion.id);
    expect(result.proclaimed?.cities).toContainEqual({
      cityId: target.id,
      converted: 6,
      nowFollows: true,
    });
  });

  it('leaves nothing standing behind it — the lump is the whole act', () => {
    const { g, religion, target, prophet } = bombWorld(7);
    proclaim(g, prophet.id);
    // No pulse, no decay, no lingering source. What the next turn presses is
    // what the *board* presses — here the speaker's own town, three hexes off
    // and newly converted by the same lump — and there is no 'Proclamation'
    // line anywhere in the ledger any more.
    const lines = explainPressure(g.state, target);
    expect(lines.every((line) => line.source !== 'Proclamation')).toBe(true);
    expect(pressureTotals(g.state, target)[religion.id]).toBe(RULES.religion.cityStrength);
  });

  it('lets a Temple blunt the bomb, exactly as it blunts the tide', () => {
    const { g, religion, target, prophet } = bombWorld(7);
    target.buildings.push('temple');
    proclaim(g, prophet.id);
    // 75% of 60 is 45: four citizens of seven — a majority, which is the point
    // of the re-cut's retune. The worksheet rules the Temple at "foreign
    // religious pressure −25%" where it used to turn away half, and the number
    // is quoted as *what gets through*, so a smaller number is a stronger
    // temple. The one defensive building in the game, and it holds against an
    // event exactly as it holds against a tide (`templeShare`, shared by both).
    expect(target.followers?.[religion.id]).toBe(4);
    expect(RULES.religion.templeForeignPercent).toBe(75);
  });

  it('does not reach a town one hex past its range', () => {
    const { g, prophet } = bombWorld(7);
    const far = town(g.state, 1, 18, 6);
    far.population = 7;
    const here = tileHex(getTileAt(g.state.map, prophet.col, prophet.row)!);
    const there = tileHex(getTileAt(g.state.map, far.col, far.row)!);
    expect(wrappedDistance(g.state.map, here, there)).toBe(RULES.religion.bombRange + 1);

    const result = proclaim(g, prophet.id);
    expect(far.followers).toBeUndefined();
    expect(far.pressureBank).toBeUndefined();
    // Out of range is *absent* from the report, not a zero in it: the list is
    // the towns the proclamation reached.
    expect(result.proclaimed?.cities.some((one) => one.cityId === far.id)).toBe(false);
    expect(cityReligion(far)).toBeNull();
  });

  it('banks on a town that already follows, and caps rather than hoards', () => {
    const { g, religion, target, prophet } = bombWorld(3);
    target.followers = { [religion.id]: 3 };
    expect(cityReligion(target)).toBe(religion.id);

    const result = proclaim(g, prophet.id);
    // The lump is banked regardless — the bomb does not ask who agrees — but
    // there is nobody left to turn, so the converter takes none and the bank is
    // capped just below the next convert. `bankPressure`'s rule, and it is the
    // phase's: a stored surplus of fifty would be a town that snapped back the
    // instant a rival took one citizen.
    expect(target.followers?.[religion.id]).toBe(3);
    expect(target.pressureBank?.[religion.id]).toBe(RULES.religion.pressurePerConvert - 1);
    expect(result.proclaimed?.cities).toContainEqual({
      cityId: target.id,
      converted: 0,
      nowFollows: true,
    });
  });

  it('adds the lump to what a town had already banked, and carries the rest', () => {
    const { g, religion, target, prophet } = bombWorld(9);
    // The lump is **banked**, not counted: a town nine faith along keeps those
    // nine on the other side of the bomb, ready for the next turn of ordinary
    // tide. That is `bankPressure`'s carry, and it is the only reason the bomb
    // goes through the phase's converter rather than doing its own arithmetic.
    const carried = RULES.religion.pressurePerConvert - 1;
    target.pressureBank = { [religion.id]: carried };
    proclaim(g, prophet.id);
    expect(target.followers?.[religion.id]).toBe(6);
    expect(target.pressureBank?.[religion.id]).toBe(carried);
  });

  it('previews the bomb town by town, and the preview is what the command pays', () => {
    const { g, religion, target, prophet } = bombWorld(7);
    const guarded = town(g.state, 1, 9, 6);
    guarded.population = 7;
    guarded.buildings.push('temple');

    const preview = proclaimPreview(g.state, prophet.id)!;
    expect(preview.range).toBe(RULES.religion.bombRange);
    expect(preview.lump).toBe(RULES.religion.bombLump);
    expect(preview.cities).toContainEqual({
      cityId: target.id,
      population: 7,
      wouldConvert: 6,
      wouldFollow: true,
    });
    // The guarded town takes a quarter off rather than half since the re-cut of
    // 2026-09-02 retuned `templeForeignPercent`, so four of its seven turn.
    expect(preview.cities).toContainEqual({
      cityId: guarded.id,
      population: 7,
      wouldConvert: 4,
      wouldFollow: true,
    });

    // A promise on a button is kept by the function that made it.
    proclaim(g, prophet.id);
    expect(target.followers?.[religion.id]).toBe(6);
    expect(guarded.followers?.[religion.id]).toBe(4);
  });

  it('refuses a preview to a prophet with no faith to proclaim', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const prophet = prophetAt(g.state, 0, 7, 6);
    expect(proclaimPreview(g.state, prophet.id)).toBeNull();
  });

  it('turns citizens through one converter, shared by the phase and the bomb', () => {
    // The claim the ruling turns on: "write it as one shared helper so the two
    // cannot drift". `bankPressure` is the converter — the division, the carry
    // and the cap — and it is *declared* once and *called* twice, by the phase
    // and by the lump. `convertCitizen` (the one-citizen rule, `state.ts`) is
    // reached from exactly one place in this module.
    const source = simSource('religion.ts');
    expect(source.match(/\bconvertCitizen\(/g)?.length).toBe(1);
    expect(source.match(/\bbankPressure\(/g)?.length).toBe(3);
    const body = (name: string): string => {
      const from = source.indexOf(`function ${name}(`);
      expect(from).toBeGreaterThan(-1);
      return source.slice(from, source.indexOf('\n}\n', from));
    };
    expect(body('spreadReligion')).toContain('bankPressure(');
    expect(body('pressLump')).toContain('bankPressure(');
    expect(body('convertCitizens')).toContain('convertCitizen(');
    // And the temple is one rule too, for the same reason.
    expect(source.match(/\btempleShare\(/g)?.length).toBe(3);

    // **The Purge is deliberately not a third caller** (Entry LVIII). It is the
    // mirror act, and a signed `amount` through `bankPressure` would have been
    // two functions sharing a name — the carry, the cap and the convert loop all
    // read the wrong way round under a negative lump. What the two genuinely
    // share is the *bank's own bookkeeping*, so `writeBank` is what is declared
    // once and called from both, and `unconvertCitizen` is `convertCitizen`'s
    // sibling in `state.ts` for the same reason `convertCitizen` lives there.
    expect(source.match(/\bpurgePressure\(/g)?.length).toBe(2);
    expect(body('purgeAt')).toContain('purgePressure(');
    expect(body('bankPressure')).toContain('writeBank(');
    expect(body('purgePressure')).toContain('writeBank(');
    expect(source.match(/\bunconvertCitizen\(/g)?.length).toBe(1);
    expect(body('purgePressure')).toContain('unconvertCitizen(');
  });

  it('lets a wonder press for the empire that holds the stones', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    const target = town(g.state, 1, 8, 6);
    expect(pressureTotals(g.state, target)[religion.id]).toBe(0);
    seat.buildings.push('hagiaSophia');
    const lines = explainPressure(g.state, target);
    expect(lines.find((line) => line.source === 'Wonder')?.amount).toBe(4);
  });

  it('reads an enhancer belief’s shift through the one rule reader', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    siteAt(g.state, seat, 6, 6);
    const target = town(g.state, 1, 8, 6);
    const before = pressureTotals(g.state, target)[religion.id]!;
    religion.enhancer = ['ecclesia'];
    // Ecclesia says holy sites press three harder, and it says it as data.
    expect(cardPressureRule(g.state, 0, 'siteStrength')).toBe(3);
    expect(pressureTotals(g.state, target)[religion.id]).toBe(before + 3);
  });
});

describe('what a religion pays whom', () => {
  it('pays a follower belief into every following city and into no empire', () => {
    // **The 2026-08-28 ruling.** A follower belief applies city-locally: every
    // town that follows gets all of them, whoever owns the town — and the
    // founder gets nothing for them at all.
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    religion.follower = ['theQuietHours'];
    const mine = town(g.state, 0, 7, 6);
    const theirs = town(g.state, 1, 9, 6);
    const quiet = town(g.state, 1, 5, 8);
    mine.followers = { [religion.id]: mine.population };
    theirs.followers = { [religion.id]: theirs.population };

    // The founder's own following town is paid in **its own** ledger.
    const paid = (city: City): CardYieldLine | undefined =>
      cardCityYields(g.state, city).find((line) => line.source.includes('The Quiet Hours'));
    expect(paid(mine)?.faith).toBe(1);
    expect(paid(mine)?.culture).toBe(1);
    // And so is the rival's, out of a faith he did not choose.
    expect(paid(theirs)?.faith).toBe(1);
    expect(paid(theirs)?.culture).toBe(1);
    // The label says whose faith is paying, which is the only way a foreign
    // town's owner can tell where the gift came from.
    expect(paid(theirs)?.source).toContain(religion.name);
    // A town of the rival's that follows nothing is paid nothing.
    expect(paid(quiet)).toBeUndefined();

    // **Neither empire is paid the belief.** The fold that used to sum it to the
    // founder is gone, so there is no empire-scale line at either end.
    for (const seat of [0, 1]) {
      expect(
        liveEffects(g.state, seat).some((entry) => entry.source.includes('The Quiet Hours')),
        `seat ${seat}`,
      ).toBe(false);
      expect(
        cardEmpireYields(g.state, seat).some((line) => line.source.includes('The Quiet Hours')),
        `seat ${seat}`,
      ).toBe(false);
    }
  });

  it('pays the four city-local rows into the town that follows', () => {
    // The four rows that shipped **deferred** because the founder's fold could
    // not read a scoped shape. City-local evaluation is the shape they wanted,
    // and each is now a plain data row read by the ordinary evaluator.
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    religion.follower = ['harvestBlessing', 'guildOfTheFaithful', 'commonTable', 'warriorMonks'];
    const theirs = town(g.state, 1, 9, 6);
    theirs.followers = { [religion.id]: theirs.population };
    const quiet = town(g.state, 1, 5, 8);

    // **Harvest Blessing** — a hex line, through the sixth `TileLine` producer.
    // The producer is asked directly and the wiring is read off the source,
    // because `cityContext` is private by design: a tile chain that could be
    // handed a city from outside would be a second way to build a context.
    const farmLine = followerCardTileLines(g.state, theirs).find(
      (line) => line.on.test === 'improvement' && line.on.improvement === 'farm',
    );
    expect(farmLine?.food).toBe(1);
    expect(farmLine?.source).toContain('Harvest Blessing');
    expect(followerCardTileLines(g.state, quiet)).toEqual([]);
    expect(simSource('cities.ts')).toContain('...followerCardTileLines(state, city),');

    // **Guild of the Faithful** — a production bonus, scoped, read by the
    // ordinary `cardProduction`.
    expect(
      cardProduction(g.state, theirs, 'building').find((line) =>
        line.source.includes('Guild of the Faithful'),
      )?.percent,
    ).toBe(10);
    expect(cardProduction(g.state, quiet, 'building')).toEqual([]);

    // **Common Table** — the growth channel's own rate, narrowed to a town.
    expect(growthCarryover(g.state, theirs, 100)).toBe(25);
    expect(growthCarryover(g.state, quiet, 100)).toBe(0);

    // **Warrior Monks** — a strength line on the walls of a following city,
    // whoever owns them.
    const defender = createUnit(g.state, 1, 'warrior', theirs.col, theirs.row);
    const seat = getTileAt(g.state.map, theirs.col, theirs.row)!;
    const monks = (unit: typeof defender, tile: typeof seat): number =>
      cardCombatLines(g.state, {
        unit,
        side: 'defend',
        tile,
        vsBarbarians: false,
        vsCity: false,
        targetHp: 10,
        targetMaxHp: 10,
      })
        .filter((line) => line.source.includes('Warrior Monks'))
        .reduce((sum, line) => sum + line.amount, 0);
    expect(monks(defender, seat)).toBe(5);
    // Not out in the field, and not in a town that keeps no faith.
    const field = getTileAt(g.state.map, theirs.col + 2, theirs.row)!;
    expect(monks(defender, field)).toBe(0);
    const elsewhere = createUnit(g.state, 1, 'warrior', quiet.col, quiet.row);
    expect(monks(elsewhere, getTileAt(g.state.map, quiet.col, quiet.row)!)).toBe(0);
  });

  it('pays happiness into the owner of a following town, not into the founder', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    religion.follower = ['feastDays'];
    const theirs = town(g.state, 1, 9, 6);
    theirs.followers = { [religion.id]: theirs.population };
    theirs.buildings.push('temple');
    // Two clauses, both landing in the one town that follows.
    expect(
      cardHappiness(g.state, 1)
        .filter((line) => line.source.includes('Feast Days'))
        .reduce((sum, line) => sum + line.amount, 0),
    ).toBe(2);
    expect(cardHappiness(g.state, 0).some((line) => line.source.includes('Feast Days'))).toBe(
      false,
    );
  });

  it('pays the founder’s half to whoever holds the holy city, and moves it on capture', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    siteAt(g.state, seat, 6, 6);
    religion.holySite = { col: 6, row: 6 };
    const theirs = town(g.state, 1, 9, 6);
    theirs.followers = { [religion.id]: theirs.population };
    religion.enhancer = ['apostles'];

    const trickleFor = (playerId: number): number =>
      cardEmpireYields(g.state, playerId)
        .filter((line) => line.source.startsWith(`Religion · ${religion.name}`))
        .reduce((sum, line) => sum + line.faith, 0);

    expect(religionFounder(g.state, religion)).toBe(0);
    expect(heldReligions(g.state, 0).map((one) => one.id)).toEqual([religion.id]);
    expect(trickleFor(0)).toBe(2);
    expect(trickleFor(1)).toBe(0);
    // Apostles is an enhancer, so it reaches the seat that holds the stones.
    expect(liveEffects(g.state, 0).some((entry) => entry.source.includes('Apostles'))).toBe(true);

    // **The holy city changes hands.** Nothing is transferred: the derivation
    // asks the board, and the board now says the town is Bors'.
    seat.ownerId = 1;
    expect(religionFounder(g.state, religion)).toBe(1);
    expect(heldReligions(g.state, 0)).toEqual([]);
    expect(trickleFor(0)).toBe(0);
    // Bors is paid for the one following city that is not his — Ada has none
    // left, so the count is of Ada's old town, which he now owns. What matters
    // is that the enhancer went with the seat.
    expect(liveEffects(g.state, 1).some((entry) => entry.source.includes('Apostles'))).toBe(true);
    expect(liveEffects(g.state, 0).some((entry) => entry.source.includes('Apostles'))).toBe(false);

    // **The pantheon does not move.** It is native to the empire that
    // consecrated it (the 2026-08-26 ruling) and is read off `Player.pantheon`,
    // which a conquest never touches.
    const god = beliefDef('keeperOfTheHearth').name;
    expect(liveEffects(g.state, 0).some((entry) => entry.source.includes(god))).toBe(true);
    expect(liveEffects(g.state, 1).some((entry) => entry.source.includes(god))).toBe(false);
  });

  it('falls back to the historical founder when the stones are gone', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    siteAt(g.state, seat, 6, 6);
    religion.holySite = { col: 6, row: 6 };
    seat.ownerId = 1;
    expect(religionFounder(g.state, religion)).toBe(1);
    // Pillaged: the improvement goes, and with it the seat of the faith.
    delete getTileAt(g.state.map, 6, 6)!.improvement;
    expect(religionFounder(g.state, religion)).toBe(0);
    // A religion from before schema 29 recorded no hex at all, and reads the
    // same way.
    delete religion.holySite;
    expect(religionFounder(g.state, religion)).toBe(0);
  });

  it('pays the founder’s trickle per foreign following city, and doubles it for Apostles', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    const mine = town(g.state, 0, 7, 6);
    const theirs = town(g.state, 1, 9, 6);
    mine.followers = { [religion.id]: mine.population };
    theirs.followers = { [religion.id]: theirs.population };

    const trickle = liveEffects(g.state, 0).filter(
      (entry) => entry.source === `Religion · ${religion.name}`,
    );
    expect(trickle.length).toBe(RELIGION.founderTrickle.length);
    // One faith per **foreign** following city: the founder's own town is not
    // a foreigner, so one of the two counts.
    const faithOf = (): number =>
      cardEmpireYields(g.state, 0)
        .filter((line) => line.source.startsWith(`Religion · ${religion.name}`))
        .reduce((sum, line) => sum + line.faith, 0);
    expect(faithOf()).toBe(1);

    // Apostles doubles the trickle **before anything is banked**, and reaches
    // the trickle alone.
    religion.enhancer = ['apostles'];
    expect(faithOf()).toBe(2);
  });

  it('counts the tide five ways, through the beliefs that ask for each count', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    // Five following towns across two empires, so every count has something to
    // say: three of mine, two of theirs, eight citizens between them, one temple.
    const following = [
      town(g.state, 0, 7, 6),
      town(g.state, 0, 7, 7),
      town(g.state, 0, 5, 6),
      town(g.state, 1, 9, 6),
      town(g.state, 1, 9, 7),
    ];
    for (const city of following) city.followers = { [religion.id]: city.population };
    following[0]!.population = 4;
    following[0]!.followers = { [religion.id]: 4 };
    following[3]!.buildings.push('temple');

    // Every one of the five counts is asked by a row, which is what stops a
    // count from being declared and never read. All four rows live in the
    // **enhancer** pool since the 2026-08-28 ruling: a world-scale count is a
    // question about a founder, and a follower belief is a fact about a town.
    religion.enhancer = ['congregation'];
    expect(
      cardHappiness(g.state, 0).find((line) => line.source.includes('Congregation'))?.amount,
    ).toBe(1);

    religion.enhancer = ['worldChurch'];
    expect(
      cardHappiness(g.state, 0).find((line) => line.source.includes('World Church'))?.amount,
    ).toBe(2);

    religion.enhancer = ['pilgrimsCoin'];
    expect(
      cardEmpireYields(g.state, 0).find((line) => line.source.includes("Pilgrims' Coin"))?.faith,
    ).toBe(1);

    religion.enhancer = ['theLongPrayer'];
    // Eight citizens, one culture per four.
    expect(
      cardEmpireYields(g.state, 0).find((line) => line.source.includes('The Long Prayer'))?.culture,
    ).toBe(2);

    // And the whole family answers **nothing** for a seat that holds no holy
    // city — which is what the tide's counts are asked of now.
    religion.enhancer = [];
    expect(liveEffects(g.state, 1).some((entry) => entry.source.startsWith('Religion'))).toBe(
      false,
    );
  });
});

describe('the prophet’s four verbs', () => {
  function readyProphet(seed = 5) {
    const g = game(seed);
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    found(g.state, 0);
    keep(g.state, 0, 'keeperOfTheHearth');
    const seat = g.state.cities.find((city) => city.ownerId === 0)!;
    const ground = landBeside(g.state, seat);
    return { g, prophet: prophetAt(g.state, 0, ground.col, ground.row) };
  }

  it('refuses every verb to a piece that is not a prophet, byte-identically', () => {
    const { g } = readyProphet();
    const augur = augurAt(g.state, 0, 6, 6);
    for (const type of ['plantHolySite', 'gainBelief', 'proclaim'] as const) {
      const before = snapshotState(g.state);
      const result = applyCommand(g.state, { type, playerId: 0, unitId: augur.id } as Command);
      expect(result.ok, type).toBe(false);
      expect(snapshotState(g.state), type).toBe(before);
    }
  });

  it('is used up entirely by the founding — one charge, one deed', () => {
    // Entry LVIII: a prophet carries one charge and founding spends the piece.
    const { g, prophet } = readyProphet();
    expect(prophet.chargesLeft).toBe(1);
    const result = applyCommand(g.state, {
      type: 'plantHolySite',
      playerId: 0,
      unitId: prophet.id,
    } as Command);
    expect(result.ok).toBe(true);
    expect(foundedReligion(g.state, 0)).toBeDefined();
    expect(g.state.units.find((u) => u.id === prophet.id)).toBeUndefined();
    // Everything else the founding owed still happened: the stones, the first
    // draft, and the debt for the second.
    expect(playerById(g.state, 0)!.pantheon.pending?.pool).toBe('follower');
    expect(playerById(g.state, 0)!.pantheon.owed).toBe(1);
  });

  it('walks one belief ladder: three follower beliefs, then two enhancers', () => {
    // The ruled caps of Entry LVIII, and the interpretation `nextBeliefPool`
    // carries: one verb, and the ladder decides which house it draws from.
    const { g, prophet } = readyProphet();
    const religion = faith(g.state, 0, 'starReaders');
    expect(RELIGION.pools.followerSlots).toBe(3);
    expect(RELIGION.pools.enhancerSlots).toBe(2);
    expect(nextBeliefPool(religion)).toBe('follower');

    /** One prophet, one belief — spent from the seat, answered on the spot. */
    const drawOne = (): void => {
      const seat = g.state.cities.find((city) => city.ownerId === 0)!;
      const piece = prophetAt(g.state, 0, seat.col, seat.row);
      expect(gainBeliefError(g.state, 0, piece.id), String(religion.follower.length)).toBeNull();
      expect(
        applyCommand(g.state, { type: 'gainBelief', playerId: 0, unitId: piece.id } as Command).ok,
      ).toBe(true);
      expect(g.state.units.find((u) => u.id === piece.id)).toBeUndefined();
      applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    };

    // Three follower beliefs, one prophet each — and the enhancer house is not
    // reached while the follower house has room, whatever the tree says.
    learn(g.state, 0, 'philosophy', 'drama', 'theology');
    drawOne();
    drawOne();
    drawOne();
    expect(religion.follower.length).toBe(3);
    expect(religion.enhancer.length).toBe(0);
    expect(nextBeliefPool(religion)).toBe('enhancer');

    // Then two enhancers, by the same verb.
    drawOne();
    drawOne();
    expect(religion.enhancer.length).toBe(2);
    expect(new Set([...religion.follower, ...religion.enhancer]).size).toBe(5);

    // And the ladder is finished: the sixth prophet is refused by the cap.
    expect(nextBeliefPool(religion)).toBeNull();
    const seat = g.state.cities.find((city) => city.ownerId === 0)!;
    const spare = prophetAt(g.state, 0, seat.col, seat.row);
    expect(gainBeliefError(g.state, 0, spare.id)).toBe(
      `${religion.name} has all the beliefs it will hold`,
    );
    const before = snapshotState(g.state);
    expect(
      applyCommand(g.state, { type: 'gainBelief', playerId: 0, unitId: spare.id } as Command).ok,
    ).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
    void prophet;
  });

  it('is used up by a proclamation, and the report says what it did', () => {
    const { g, prophet } = readyProphet();
    const religion = faith(g.state, 0, 'starReaders');
    const spoke = applyCommand(g.state, {
      type: 'proclaim',
      playerId: 0,
      unitId: prophet.id,
    } as Command);
    // The proclamation is an *act*, not a thing left on the board: what it did
    // comes back on the result and nothing on the religion records it.
    expect(spoke.ok && spoke.proclaimed?.religionId).toBe(religion.id);
    // One charge, one deed: the piece is gone, so there is no second verb to
    // refuse — the refusal is simply that there is no such unit.
    expect(g.state.units.find((u) => u.id === prophet.id)).toBeUndefined();
    expect(proclaimError(g.state, 0, prophet.id)).toBe(`No unit with id ${prophet.id}`);
  });

  it('leaves the board when a proclamation takes its last charge', () => {
    const { g, prophet } = readyProphet();
    faith(g.state, 0, 'starReaders');
    prophet.chargesLeft = 1;
    expect(
      applyCommand(g.state, { type: 'proclaim', playerId: 0, unitId: prophet.id } as Command).ok,
    ).toBe(true);
    expect(g.state.units.find((u) => u.id === prophet.id)).toBeUndefined();
  });

  it('refuses a proclamation from an empire with no religion', () => {
    const { g, prophet } = readyProphet();
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'proclaim',
      playerId: 0,
      unitId: prophet.id,
    } as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('still gates the enhancer rung on Theology, and says so on the ladder', () => {
    // Unchanged by the rework (Entry LVIII): the enhancer pool opens at
    // `ENHANCER_TECH`. What changed is *when the rung is reached* — the follower
    // house has to be full first — so the gate is asked of the rung rather than
    // of a verb of its own.
    const { g } = readyProphet();
    const religion = faith(g.state, 0, 'starReaders');
    // Fill the follower house by hand, so the ladder's next rung is the gated
    // one and nothing else is in the way.
    religion.follower = religionBeliefPool(religion, 'follower').slice(0, 3);
    expect(religion.follower.length).toBe(3);
    expect(nextBeliefPool(religion)).toBe('enhancer');

    const seat = g.state.cities.find((city) => city.ownerId === 0)!;
    const piece = prophetAt(g.state, 0, seat.col, seat.row);
    expect(gainBeliefError(g.state, 0, piece.id)).toContain('Theology');
    const before = snapshotState(g.state);
    expect(
      applyCommand(g.state, { type: 'gainBelief', playerId: 0, unitId: piece.id } as Command).ok,
    ).toBe(false);
    expect(snapshotState(g.state)).toBe(before);

    learn(g.state, 0, 'philosophy', 'drama', 'theology');
    expect(gainBeliefError(g.state, 0, piece.id)).toBeNull();
    applyCommand(g.state, { type: 'gainBelief', playerId: 0, unitId: piece.id } as Command);
    expect(playerById(g.state, 0)!.pantheon.pending?.pool).toBe('enhancer');
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    // **A list, and it accumulates.** `Religion.enhancer` was a scalar until the
    // 2026-08-28 pass, and with two slots a second pick silently overwrote the
    // first.
    expect(religion.enhancer.length).toBe(1);
  });

  it('replays a prophet’s charges byte for byte', () => {
    // The whole subsystem the 2026-08-28 pass touched, through the log alone:
    // founding spends `state.rng` on a name, each draft spends it on a hand,
    // and the holy site is recorded on the religion rather than derived twice.
    const play = () => {
      const g = game(11);
      learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple', 'philosophy', 'drama', 'theology');
      found(g.state, 0);
      keep(g.state, 0, 'keeperOfTheHearth');
      const seat = g.state.cities.find((city) => city.ownerId === 0)!;
      const ground = landBeside(g.state, seat);
      const prophet = prophetAt(g.state, 0, ground.col, ground.row);
      dispatch(g, { type: 'plantHolySite', playerId: 0, unitId: prophet.id } as Command);
      dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
      // The founding's *second* draft opened the moment the first was answered
      // (`payBeliefDebt`), so this pick is the debt being paid — and it is part
      // of what has to replay identically.
      dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
      // The founding took the first prophet with it, so a third belief is a
      // second prophet's — which is the shape of the log this now replays.
      const second = prophetAt(g.state, 0, seat.col, seat.row);
      dispatch(g, { type: 'gainBelief', playerId: 0, unitId: second.id } as Command);
      dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
      return g;
    };
    const first = play();
    const second = play();
    expect(snapshotState(second.state)).toBe(snapshotState(first.state));
    const religion = foundedReligion(first.state, 0)!;
    // The seat of the faith is recorded, and it is where the stones actually
    // stand — which is what `religionFounder` reads the board for.
    expect(religion.holySite).toBeDefined();
    const stones = getTileAt(first.state.map, religion.holySite!.col, religion.holySite!.row)!;
    expect(stones.improvement).toBe('holySite');
    expect(religionFounder(first.state, religion)).toBe(0);
    // Two from the founding, one from the second prophet — and none of them an
    // enhancer, because the follower house was not full.
    expect(religion.follower.length).toBe(3);
    expect(religion.enhancer.length).toBe(0);
  });

  it('redrafts a pool, returns what it held, and never touches the pantheon', () => {
    const { g, prophet } = readyProphet();
    const religion = faith(g.state, 0, 'starReaders');
    religion.follower = ['feastDays'];
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, {
      type: 'redraftBeliefs',
      playerId: 0,
      unitId: prophet.id,
      pool: 'pantheon',
    } as unknown as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);

    applyCommand(g.state, {
      type: 'redraftBeliefs',
      playerId: 0,
      unitId: prophet.id,
      pool: 'follower',
    } as Command);
    expect(religion.follower).toEqual([]);
    // One charge, one deed (Entry LVIII): a redraft takes the prophet too.
    expect(g.state.units.find((u) => u.id === prophet.id)).toBeUndefined();
    const offer = playerById(g.state, 0)!.pantheon.pending!;
    expect(offer.pool).toBe('follower');
    // The belief given back is in the bag again — a declined god's rule.
    expect(religionBeliefPool(religion, 'follower')).toContain('feastDays');
    expect(playerById(g.state, 0)!.pantheon.beliefs).toEqual(['keeperOfTheHearth', 'starReaders']);
    void offer;
  });

  it('plants nothing but a holy site, and lets nobody else plant one', () => {
    const { g, prophet } = readyProphet();
    // A prophet asked for a farm is refused by the symmetric clause, and so is
    // a worker asked for a holy site.
    expect(improvementError(g.state, prophet.id, 'farm')).toBe(
      'Prophets leave a work behind, not a farm',
    );
    const worker = createUnit(g.state, 0, 'worker', prophet.col, prophet.row);
    expect(improvementError(g.state, worker.id, 'holySite')).toBe(
      'A worker cannot build a holy site',
    );
    // And an **augur**, whose charges are rites rather than spadework, plants
    // nothing at all — the fourth reading of the one symmetric clause.
    const augur = augurAt(g.state, 0, prophet.col, prophet.row);
    expect(improvementError(g.state, augur.id, 'farm')).toBe('A augur builds nothing');
  });

  it('preaches: the augur’s rite presses the same lump out of a smaller purse', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    const seat = found(g.state, 0);
    seat.population = 5;
    const religion = faith(g.state, 0);
    const augur = augurAt(g.state, 0, seat.col, seat.row);
    expect(availableRites(g.state, 0)).toContain('thePreaching');
    expect(riteError(g.state, 0, augur.id, 'thePreaching')).toBeNull();
    const result = applyCommand(g.state, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'thePreaching',
    } as Command);
    expect(result.ok).toBe(true);
    // 20 against 10 a convert: two citizens of five, which is not a majority —
    // the cheap lever, and it is the *same* lever the prophet's charge pulls
    // (`pressLump`), reported through the same field of the same result.
    expect(seat.followers?.[religion.id]).toBe(2);
    expect(cityReligion(seat)).toBeNull();
    expect(result.ok && result.proclaimed?.cities).toContainEqual({
      cityId: seat.id,
      converted: 2,
      nowFollows: false,
    });
    // Nothing is left standing on the board.
    expect(seat.pressureBank).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

/**
 * **The Holy Office's inquisitor** (ledger Entry LVIII, phase 2).
 *
 * Three claims, and each is the mirror of something the prophet already does:
 * the Purge is a lump like a proclamation and takes where that gives; the piece
 * is one charge like every other religious agent; and the aura is the general's
 * read one agent over, folded into `planCombat` as a flat labelled line.
 */
describe('the inquisitor', () => {
  /** A seat with a faith, a rival's faith, and an inquisitor between them. */
  function ready(seed = 5) {
    const g = game(seed);
    const mine = town(g.state, 0, 6, 6);
    const theirs = town(g.state, 1, 8, 6);
    const ours = faith(g.state, 0, 'keeperOfTheHearth');
    const rival = faith(g.state, 1, 'starReaders');
    const piece = createUnit(g.state, 0, 'inquisitor', 7, 6);
    return { g, mine, theirs, ours, rival, piece };
  }

  it('carries one charge and is bought out of the faith bank', () => {
    expect(unitDef('inquisitor').charges).toBe(1);
    expect(unitDef('inquisitor').purges).toBe(true);
    expect(unitDef('inquisitor').purchase?.currency).toBe('faith');
    expect(unitDef('inquisitor').purchase?.exclusive).toBe(true);
    // A civilian, like the other two agents: it does not fight, it stiffens.
    expect(isCombatant(unitDef('inquisitor'))).toBe(false);
  });

  it('strips every rival faith’s bank, spares its own, and spends the piece', () => {
    const { g, mine, theirs, ours, rival, piece } = ready();
    // Both faiths have banked something on both towns.
    mine.pressureBank = { [ours.id]: 7, [rival.id]: 9 };
    theirs.pressureBank = { [rival.id]: 30 };

    const result = applyCommand(g.state, { type: 'purge', playerId: 0, unitId: piece.id } as Command);
    expect(result.ok).toBe(true);
    // The rival's banks are gone from every town in reach; ours is untouched.
    expect(mine.pressureBank?.[ours.id]).toBe(7);
    expect(mine.pressureBank?.[rival.id]).toBeUndefined();
    expect(theirs.pressureBank?.[rival.id]).toBeUndefined();
    // One charge, one deed.
    expect(g.state.units.find((u) => u.id === piece.id)).toBeUndefined();
    // And the report names the faith it spared and every town it reached.
    expect(result.ok && result.purged?.religionId).toBe(ours.id);
    expect(result.ok && result.purged?.cities.map((city) => city.cityId).sort()).toEqual(
      [mine.id, theirs.id].sort(),
    );
  });

  it('turns believers back to nobody when the bank does not cover the lump', () => {
    const { g, theirs, rival, piece } = ready();
    theirs.population = 8;
    theirs.followers = { [rival.id]: 8 };
    // Nothing banked, so the whole lump is a deficit: 60 against 10 a convert.
    expect(RULES.religion.purgeLump).toBe(60);
    expect(RULES.religion.pressurePerConvert).toBe(10);

    const result = applyCommand(g.state, { type: 'purge', playerId: 0, unitId: piece.id } as Command);
    expect(result.ok).toBe(true);
    // Six of the eight, and they follow **nothing** — an inquisitor unmakes
    // belief, it does not preach, which is what keeps this and the Preaching
    // two verbs.
    expect(theirs.followers?.[rival.id]).toBe(2);
    expect(unconvertedCitizens(theirs)).toBe(6);
    expect(result.ok && result.purged?.cities).toContainEqual({
      cityId: theirs.id,
      unfollowed: 6,
    });
    // And nothing is left standing: no negative bank to carry.
    expect(theirs.pressureBank).toBeUndefined();
  });

  it('reaches half as far as a proclamation, and the preview promises what it pays', () => {
    const { g, theirs, rival, piece } = ready();
    expect(RULES.religion.purgeRange).toBe(5);
    expect(RULES.religion.purgeRange * 2).toBe(RULES.religion.bombRange);
    theirs.population = 8;
    theirs.followers = { [rival.id]: 8 };

    const preview = purgePreview(g.state, piece.id)!;
    expect(preview.range).toBe(5);
    const promised = preview.cities.find((city) => city.cityId === theirs.id)!;
    applyCommand(g.state, { type: 'purge', playerId: 0, unitId: piece.id } as Command);
    // The promise on the row is kept by the function that keeps it.
    expect(unconvertedCitizens(theirs)).toBe(promised.unfollowed);
  });

  it('refuses a purge from an empire with no faith to purge for, byte-identically', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const piece = createUnit(g.state, 0, 'inquisitor', 7, 6);
    expect(purgeError(g.state, 0, piece.id)).toMatch(/no faith to purge for/);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'purge', playerId: 0, unitId: piece.id } as Command).ok).toBe(
      false,
    );
    expect(snapshotState(g.state)).toBe(before);
  });

  it('stiffens the soldiers beside it, on both sides and never itself', () => {
    const g = game();
    const soldier = createUnit(g.state, 0, 'warrior', 6, 6);
    const piece = createUnit(g.state, 0, 'inquisitor', 7, 6);
    const amount = RULES.religion.inquisitorAuraStrength;
    expect(amount).toBe(2);

    expect(inquisitorAuraLines(g.state, soldier)).toEqual([
      { source: unitDef('inquisitor').name, amount },
    ]);
    // A civilian gets nothing, the inquisitor included — an aura that made the
    // bearer harder to kill would be a rule about hiding.
    expect(inquisitorAuraLines(g.state, piece)).toEqual([]);
    // One's own side only.
    const foreign = createUnit(g.state, 1, 'warrior', 7, 7);
    expect(inquisitorAuraLines(g.state, foreign)).toEqual([]);
    // Radius one: two hexes away is out of reach, where a general's is not.
    const far = createUnit(g.state, 0, 'warrior', 9, 6);
    expect(inquisitorAuraLines(g.state, far)).toEqual([]);
    // Auras do not stack: a second inquisitor is worth nothing.
    createUnit(g.state, 0, 'inquisitor', 6, 5);
    expect(inquisitorAuraLines(g.state, soldier)).toHaveLength(1);
  });

  it('folds that aura into the forecast on whichever side is standing beside it', () => {
    const g = game();
    const attacker = createUnit(g.state, 0, 'warrior', 6, 6);
    createUnit(g.state, 1, 'warrior', 7, 6);
    const plain = previewCombat(g.state, attacker.id, { col: 7, row: 6 });
    expect(plain.ok).toBe(true);
    const before = plain.ok ? plain.attackerStrength : 0;

    createUnit(g.state, 0, 'inquisitor', 6, 5);
    const guarded = previewCombat(g.state, attacker.id, { col: 7, row: 6 });
    expect(guarded.ok).toBe(true);
    if (!guarded.ok) return;
    // A flat labelled point total, folded into the strength like every other —
    // never a term in a multiplier (Entry XXXVII).
    expect(guarded.attackerStrength - before).toBe(RULES.religion.inquisitorAuraStrength);
    expect(
      guarded.bonuses.some((line) => line.source === 'Inquisitor' && line.side === 'attacker'),
    ).toBe(true);
  });
});
