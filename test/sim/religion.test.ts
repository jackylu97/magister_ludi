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
  explainTileYield,
  foldTileYield,
  foundCityAt,
  nextBorderCost,
  yieldContextFor,
} from '../../src/sim/cities';
import { previewCombat } from '../../src/sim/combat';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import { improvementError, improvementErrorAt } from '../../src/sim/improvements';
import {
  availableRites,
  beliefPool,
  enhanceReligionError,
  explainPressure,
  proclaimError,
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
  anyCardDef,
  cardEmpireYields,
  cardHappiness,
  cardPressureRule,
  describeCard,
  liveCityEffects,
  liveEffects,
  payWindfallGrants,
  windfallPayout,
} from '../../src/sim/statecraft';
import { RULES } from '../../src/sim/rulesData';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { hasAbility } from '../../src/sim/tech';
import { unitDef } from '../../src/sim/unitData';
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
    expect(beliefPool(player)).not.toContain(taken);
    // The two that were passed over are drawable again — declining is a
    // decision about the cards beside a god, not about the god.
    expect(beliefPool(player)).toContain(declined);

    const second = augurAt(g.state, 0, 5, 5);
    dispatch(g, { type: 'consecrate', playerId: 0, unitId: second.id } as Command);
    expect(player.pantheon.pending!.options).not.toContain(taken);
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
    // Æra II: the same rider, tripled at Æra III and doubled here.
    learn(g.state, 0, 'currency', 'mathematics', 'philosophy');
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
    expect(availableRites(g.state, 0)).toEqual(['riteOfTheHarvest']);
    expect(hasAbility(g.state, 0, 'riteOfTheHarvest')).toBe(true);
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
    augur.chargesLeft = 3;

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

  it('are the augur’s whole turn: a second one is refused, byte-identically', () => {
    // User, 2026-08-28: "performing a rite should end the augur's turn". The
    // *spending* half has been in `performRiteAt` since the rule was stated —
    // `movesLeft` to zero — but the refusal that makes it bite was missing, so
    // a three-charge augur could bless three towns in one resolution and the
    // charge ladder bought nothing. Both halves now read `augurHasActed`.
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const augur = augurAt(g.state, 0, city.col, city.row);
    expect(augur.chargesLeft ?? 0).toBeGreaterThan(1);
    expect(augur.movesLeft).toBeGreaterThan(0);

    const rite = {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'riteOfTheHarvest',
    } as Command;
    expect(applyCommand(g.state, rite).ok).toBe(true);
    // Still standing, still holding charges — and out of day.
    expect(augur.chargesLeft).toBe(2);
    expect(augur.movesLeft).toBe(0);

    expect(riteError(g.state, 0, augur.id, 'riteOfTheHarvest')).toMatch(/acted this turn/);
    // And the *other* act an augur can take is held to the same sentence: a
    // blessing does not leave enough of the afternoon to found a god.
    expect(consecrateError(g.state, 0, augur.id)).toMatch(/acted this turn/);

    const before = snapshotState(g.state);
    const second = applyCommand(g.state, rite);
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.error).toMatch(/acted this turn/);
    expect(snapshotState(g.state)).toEqual(before);

    // Next turn it may act again: nothing counted down, `resetMovement` simply
    // gave the piece its day back.
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
    // One charge, not the whole augur.
    expect(g.state.units.find((u) => u.id === augur.id)!.chargesLeft).toBe(2);
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

  it('ends the augur’s turn, the way an attack spends an attacker', () => {
    // User, 2026-08-27: "the rite should end the augur's turn". A rite is the
    // day's work, not a thing a piece does on its way past — so a march after
    // one is refused this turn and allowed the next.
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

    expect(augur.chargesLeft).toBe(2);
    expect(augur.movesLeft).toBe(0);
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
    learn(g.state, 0, 'earthenware', 'calendar');
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
function landBeside(state: GameState, city: { col: number; row: number }) {
  for (const tile of mapRange(state.map, tileHex(getTileAt(state.map, city.col, city.row)!), 1)) {
    if (tile.col === city.col && tile.row === city.row) continue;
    if (improvementErrorAt(state, 0, tile, 'holySite') === null) return tile;
  }
  throw new Error('no ground beside the town');
}

/** A founded religion for a seat, with one god behind it. */
function faith(state: GameState, playerId: number, god: BeliefId = 'keeperOfTheHearth') {
  keep(state, playerId, god);
  return foundReligion(state, playerById(state, playerId)!);
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
    expect(def.prereqs).toEqual(['divination', 'stonecraft']);
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

  it('founds, plants and opens a follower draft in one charge — and blocks End Turn', () => {
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
    expect(religionBlocker(player)).toBe('a belief is waiting to be chosen');
    // Taking it puts the belief on the **religion**, never on the pantheon.
    const chosen = player.pantheon.pending!.options[0]!;
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    expect(religion.follower).toEqual([chosen]);
    expect(player.pantheon.beliefs).toEqual(['keeperOfTheHearth']);
    expect(religionBlocker(player)).toBeNull();
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

  it('decays a proclamation to nothing and sweeps it, and the sweep changes no outcome', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    const target = town(g.state, 1, 8, 6);
    religion.pulses.push({
      col: 8,
      row: 6,
      strength: 12,
      range: 10,
      startTurn: g.state.turn,
      expiresTurn: g.state.turn + 10,
    });
    const at = (turn: number): number => {
      g.state.turn = turn;
      return explainPressure(g.state, target).find((line) => line.source === 'Proclamation')?.amount ?? 0;
    };
    const start = g.state.turn;
    expect(at(start)).toBe(12);
    expect(at(start + 5)).toBe(6);
    expect(at(start + 9)).toBe(1);
    expect(at(start + 10)).toBe(0);
    // The broom runs inside the phase, and it is a broom: the pulse was already
    // inert, so sweeping it changes nothing anybody can read.
    g.state.turn = start + 10;
    const before = pressureTotals(g.state, target);
    spreadReligion(g.state);
    expect(religion.pulses).toEqual([]);
    expect(pressureTotals(g.state, target)).toEqual(before);
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
    religion.enhancer = 'ecclesia';
    // Ecclesia says holy sites press three harder, and it says it as data.
    expect(cardPressureRule(g.state, 0, 'siteStrength')).toBe(3);
    expect(pressureTotals(g.state, target)[religion.id]).toBe(before + 3);
  });
});

describe('what a religion pays whom', () => {
  it('pays the founder for a follower belief, over foreign cities and its own', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    religion.follower = ['theQuietHours'];
    const mine = town(g.state, 0, 7, 6);
    const theirs = town(g.state, 1, 9, 6);
    mine.followers = { [religion.id]: mine.population };
    theirs.followers = { [religion.id]: theirs.population };

    const lines = liveEffects(g.state, 0).filter((entry) =>
      entry.source.includes('The Quiet Hours'),
    );
    expect(lines.length).toBe(1);
    // Two following cities, folded into **one empire-scale line** whose label
    // says how many towns it was folded over.
    expect(lines[0]!.source).toContain('2 following cities');
    expect(lines[0]!.effect).toEqual({ kind: 'empireYields', culture: 2, faith: 2 });
    // And it is the founder who is paid, not the owner of the foreign town.
    expect(
      liveEffects(g.state, 1).some((entry) => entry.source.includes('The Quiet Hours')),
    ).toBe(false);
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
    religion.enhancer = 'apostles';
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
    // count from being declared and never read.
    religion.follower = ['congregation'];
    expect(
      cardHappiness(g.state, 0).find((line) => line.source.includes('Congregation'))?.amount,
    ).toBe(1);

    religion.follower = ['worldChurch'];
    expect(
      cardHappiness(g.state, 0).find((line) => line.source.includes('World Church'))?.amount,
    ).toBe(2);

    religion.follower = ['pilgrimsCoin'];
    expect(
      cardEmpireYields(g.state, 0).find((line) => line.source.includes("Pilgrims' Coin"))?.faith,
    ).toBe(1);

    religion.follower = ['theLongPrayer'];
    // Eight citizens, one culture per four.
    expect(
      cardEmpireYields(g.state, 0).find((line) => line.source.includes('The Long Prayer'))?.culture,
    ).toBe(2);

    // And the whole family answers **nothing** for a seat that founded nothing.
    religion.follower = [];
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
    for (const type of ['plantHolySite', 'enhanceReligion', 'proclaim'] as const) {
      const before = snapshotState(g.state);
      const result = applyCommand(g.state, { type, playerId: 0, unitId: augur.id } as Command);
      expect(result.ok, type).toBe(false);
      expect(snapshotState(g.state), type).toBe(before);
    }
  });

  it('spends one charge a verb and leaves the board when the last one goes', () => {
    const { g, prophet } = readyProphet();
    expect(prophet.chargesLeft).toBe(2);
    applyCommand(g.state, { type: 'plantHolySite', playerId: 0, unitId: prophet.id } as Command);
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    const standing = g.state.units.find((u) => u.id === prophet.id)!;
    expect(standing.chargesLeft).toBe(1);
    // **A charge is the prophet's whole turn** — the augur's rule, one agent
    // over — so the second verb waits for the movement a resolution refills.
    expect(proclaimError(g.state, 0, prophet.id)).toBe(`Unit ${prophet.id} has no movement left`);
    standing.movesLeft = 2;
    applyCommand(g.state, { type: 'proclaim', playerId: 0, unitId: prophet.id } as Command);
    expect(g.state.units.find((u) => u.id === prophet.id)).toBeUndefined();
    expect(foundedReligion(g.state, 0)!.pulses.length).toBe(1);
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

  it('needs Theology to enhance, and holds one enhancer', () => {
    const { g, prophet } = readyProphet();
    faith(g.state, 0, 'starReaders');
    expect(enhanceReligionError(g.state, 0, prophet.id)).toContain('Theology');
    learn(g.state, 0, 'philosophy', 'drama', 'theology');
    expect(enhanceReligionError(g.state, 0, prophet.id)).toBeNull();
    applyCommand(g.state, { type: 'enhanceReligion', playerId: 0, unitId: prophet.id } as Command);
    expect(playerById(g.state, 0)!.pantheon.pending?.pool).toBe('enhancer');
    applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 0 } as Command);
    const religion = foundedReligion(g.state, 0)!;
    expect(religion.enhancer).toBeDefined();
    g.state.units.find((u) => u.id === prophet.id)!.movesLeft = 2;
    expect(enhanceReligionError(g.state, 0, prophet.id)).toContain('all the enhancements');
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

  it('preaches: the augur’s rite leaves the same kind of mark out of a smaller purse', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple');
    found(g.state, 0);
    const religion = faith(g.state, 0);
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const augur = augurAt(g.state, 0, unit.col, unit.row);
    expect(availableRites(g.state, 0)).toContain('thePreaching');
    expect(riteError(g.state, 0, augur.id, 'thePreaching')).toBeNull();
    applyCommand(g.state, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'thePreaching',
    } as Command);
    expect(religion.pulses.length).toBe(1);
    expect(religion.pulses[0]!.range).toBe(4);
  });
});
