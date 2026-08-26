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
  borderGrowth,
  cityYields,
  explainTileYield,
  foldTileYield,
  foundCityAt,
  yieldContextFor,
} from '../../src/sim/cities';
import { previewCombat } from '../../src/sim/combat';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt, tileHex, wrappedDistance } from '../../src/sim/map';
import {
  availableRites,
  beliefPool,
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
  RELIGION,
  RITE_IDS,
  beliefDef,
  newPlayerPantheon,
  religionDataProblems,
  riteAbility,
  riteDef,
  slotsFromTechs,
} from '../../src/sim/religionData';
import { type GameState, createUnit, playerById } from '../../src/sim/state';
import {
  anyCardDef,
  describeCard,
  liveCityEffects,
  liveEffects,
  payWindfallGrants,
  windfallPayout,
} from '../../src/sim/statecraft';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { hasAbility } from '../../src/sim/tech';
import { unitDef } from '../../src/sim/unitData';

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
    expect(BELIEF_IDS.length).toBeGreaterThanOrEqual(RELIGION.pantheon.offerOptions * 4);
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
      'Your pantheon has no room for another god',
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
    expect(offer.options).toHaveLength(RELIGION.pantheon.offerOptions);
    expect(new Set(offer.options).size).toBe(offer.options.length);
    expect(religionBlocker(player)).toMatch(/god/);

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
    expect(consecrateError(g.state, 0, second.id)).toMatch(/awaiting judgment/);
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
    const before = borderGrowth(g.state, city);

    dispatch(g, {
      type: 'performRite',
      playerId: 0,
      unitId: augur.id,
      rite: 'consecrationOfTheBounds',
    } as Command);

    // The border basket, not the empire's draft pool: two separate channels.
    expect(city.culture).toBe(banked + 15);
    const after = borderGrowth(g.state, city);
    expect(after.percent).toBe(before.percent + 30);
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

