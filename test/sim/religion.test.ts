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
 * that follows the number into `foldCity` / `planCombat` / `borderGrowth` can
 * see the difference.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import {
  mirrorRowFor,
  explainUnitCost,
  foldUnitCost,
  foundCityAt,
  growthCarryover,
  realiseItem,
} from '../../src/sim/cities';
import {
  cityContext,
  explainTileYield,
  foldTileLines,
  yieldContextFor,
} from '../../src/sim/yields/hex';
import {
  cityYieldPercents,
  explainCity,
  foldCity,
} from '../../src/sim/yields/town';
import { buildingHappiness } from '../../src/sim/buildingEffects';
import { explainRenown, renownPerTurn } from '../../src/sim/renown';
import { applyCombat, inquisitorAuraLines, previewCombat } from '../../src/sim/combat';
import { fullMovement } from '../../src/sim/units';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import {
  getTileAt,
  mapRange,
  neighborTiles,
  tileHex,
  tileIndex,
  wrappedDistance,
} from '../../src/sim/map';
import { DISCOVERY_IDS, discoveryDef } from '../../src/sim/discoveryData';
import { settleDiscovery } from '../../src/sim/discoveries';
import { improvementError, improvementErrorAt } from '../../src/sim/improvements';
import {
  availableRites,
  beliefPool,
  explainNextRung,
  faithRungCost,
  gainBeliefError,
  nextRungWords,
  pantheonPlaces,
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
  cityRite,
  cityRiteTurnsLeft,
  empireRiteAt,
  empireRiteError,
  healAdjacentAt,
  healAdjacentError,
  openPeriodicOffers,
  placeRelicAt,
  placeRelicError,
  riteCostFor,
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
  explainPurchaseCost,
  purchaseError,
  purchaseItemAt,
} from '../../src/sim/purchase';
import { buildError, isUnlocked } from '../../src/sim/tech';

/** The one thing faith sells. Named once, so the shape reads out of the way. */
const AUGUR: PurchasableItem = { kind: 'unit', id: 'augur' };
import {
  type BeliefId,
  BELIEF_IDS,
  ENHANCER_BELIEF_IDS,
  FOLLOWER_BELIEF_IDS,
  LIVE_RITE_IDS,
  RELIGION,
  RITE_IDS,
  beliefDef,
  isPantheonBeliefId,
  religionDataProblems,
  riteAbility,
  riteCost,
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
  bumpRevision,
} from '../../src/sim/state';
import {
  type CardYieldLine,
  anyCardDef,
  explainCardCityYields,
  cardCombatLines,
  explainCardEmpireYields,
  cardBuildingHappiness,
  cardCityRenownShares,
  cardLinesOnBuilding,
  cardHappiness,
  cardCityStat,
  cardPressureRule,
  cardProduction,
  cardRulePercent,
  foldCityStat,
  describeCard,
  cardFoundingRider,
  consecrationCardTileLines,
  followerCardTileLines,
  stripRefs,
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
import { isCombatant, unitDef, unitMaxHp, unitStampStrength } from '../../src/sim/unitData';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { openEveryWar } from './warHelpers';

// --- harness ----------------------------------------------------------------

function game(seed = 7) {
  const made = createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  // The two seats are at war from the first turn (schema 56): several rows here
  // — God of the Forge, Blessing of Arms, The Crusade, the inquisitor's aura —
  // are strength lines, and since the war ruling a blow between two empires at
  // peace is refused before a strength is folded. See `test/sim/warHelpers.ts`.
  openEveryWar(made.state);
  return made;
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
      bumpRevision(state);
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
  bumpRevision(state);
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

  it('teaches each live rite through its own technology, as an ability', () => {
    // A **withdrawn** row is taught by nobody and says so: the two the pass cut
    // keep their `tech` for readability and their abilities have left the tree
    // with them, which is what `LIVE_RITE_IDS` is for.
    for (const id of LIVE_RITE_IDS) {
      const tech = riteDef(id).tech;
      expect(techDef(tech).unlocks.abilities ?? [], id).toContain(riteAbility(id));
    }
    for (const id of RITE_IDS) {
      if (LIVE_RITE_IDS.includes(id)) continue;
      const tech = riteDef(id).tech;
      expect(techDef(tech).unlocks.abilities ?? [], id).not.toContain(id);
    }
  });
});

// --- the augur, withdrawn ---------------------------------------------------

describe('the augur is withdrawn, and the row is kept for replay', () => {
  it('is refused by the production queue and by its own bank, byte-identically', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    playerById(g.state, 0)!.faithPool = 500;
    const before = snapshotState(g.state);
    expect(buildError(g.state, 0, 'unit', 'augur')).toBe('Augurs are no longer called');
    expect(purchaseError(g.state, 0, city.id, AUGUR, 'faith')).toBe(
      'A Augur is no longer called',
    );
    applyCommand(g.state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'augur' }],
    } as Command);
    applyCommand(g.state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: AUGUR,
      currency: 'faith',
    } as Command);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('says so on the row rather than deleting it, so an old save still reads', () => {
    // The marker, not a name: `buildError` and `purchaseError` ask the row.
    expect(unitDef('augur').retired).toBe(true);
    expect(unitDef('augur').consecrates).toBe(true);
    expect(unitDef('prophet').retired).toBeUndefined();
  });
});

// --- consecration, retired --------------------------------------------------

describe('consecrate', () => {
  it('opens no slots at all before Divination, and two after', () => {
    const g = game();
    expect(pantheonSlots(g.state, 0)).toBe(0);
    learn(g.state, 0, 'divination');
    expect(pantheonSlots(g.state, 0)).toBe(2);
  });

  it('is refused always — the faith ladder deals the gods now', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const augur = augurAt(g.state, 0, 5, 5);
    expect(consecrateError(g.state, 0, augur.id)).toBe(
      'Your gods arrive on their own, once your faith is deep enough',
    );
    // And the piece questions are still asked first, so a hand-edited log gets
    // the honest sentence rather than the retirement's.
    expect(consecrateError(g.state, 1, augur.id)).toContain('does not belong to player 1');
    const worker = createUnit(g.state, 0, 'worker', 5, 5);
    expect(consecrateError(g.state, 0, worker.id)).toBe('A Worker cannot consecrate');
  });

  it('leaves the state byte-identical when the retired verb is sent', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const augur = augurAt(g.state, 0, 5, 5);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'consecrate', playerId: 0, unitId: augur.id } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('refuses an index off the end of an offer, byte-identically', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.pantheon.pending = { options: beliefPool(g.state, player).slice(0, 3) };
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'chooseBelief', playerId: 0, optionIndex: 9 } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('blocks End Turn while a hand is outstanding', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    expect(religionBlocker(player)).toBeNull();
    player.pantheon.pending = { options: beliefPool(g.state, player).slice(0, 3) };
    expect(religionBlocker(player)).toBeTruthy();
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
  });

  it('pays a flat city yield through foldCity (Sacred Fire)', () => {
    const g = game();
    const city = found(g.state, 0);
    const before = foldCity(g.state, city).faith;
    keep(g.state, 0, 'sacredFire');
    expect(foldCity(g.state, city).faith).toBe(before + 1);
  });

  it('scopes a city yield to a building (The Standing Stones)', () => {
    const g = game();
    const city = found(g.state, 0);
    keep(g.state, 0, 'theStandingStones');
    const bare = foldCity(g.state, city).culture;
    city.buildings.push('monument');
    bumpRevision(g.state);
    expect(foldCity(g.state, city).culture).toBeGreaterThan(bare);
  });

  it('scopes a tile line by terrain (Desert Fathers)', () => {
    const g = game();
    keep(g.state, 0, 'desertFathers');
    const ctx = yieldContextFor(g.state, 0)!;
    const desert = { ...getTileAt(g.state.map, 4, 4)!, terrain: 'desert' as const };
    const grass = { ...desert, terrain: 'grassland' as const };
    expect(foldTileLines(explainTileYield(desert, ctx)).faith).toBe(1);
    expect(foldTileLines(explainTileYield(grass, ctx)).faith).toBe(0);
    // And it says so in the breakdown, with a rule-5 label.
    expect(explainTileYield(desert, ctx).some((line) => line.source.startsWith('Belief ·'))).toBe(
      true,
    );
  });

  it('pays the Winter Mother on every tundra hex, wooded or bare (re-cut 2026-09-06)', () => {
    // The user: "tundra religious belief should give +1 faith on all tundra,
    // not just tundra forest". The row is one tile line now — +1🌾 +1🕯 on the
    // terrain — so the `all` composition this test used to demonstrate lives
    // in `statecraft.test.ts`'s condition fixtures instead.
    const g = game();
    keep(g.state, 0, 'winterMother');
    const ctx = yieldContextFor(g.state, 0)!;
    const base = getTileAt(g.state.map, 4, 4)!;
    const tundra = { ...base, terrain: 'tundra' as const, feature: 'none' as const };
    const wooded = { ...tundra, feature: 'forest' as const };
    const grass = { ...tundra, terrain: 'grassland' as const };
    expect(foldTileLines(explainTileYield(tundra, ctx)).faith).toBe(1);
    expect(foldTileLines(explainTileYield(wooded, ctx)).faith).toBe(1);
    expect(foldTileLines(explainTileYield(grass, ctx)).faith).toBe(0);
  });

  it('merges two lines from the same source into one entry (Winter Mother, tundra forest)', () => {
    // Winter Mother paid two `tileYield` lines until 2026-09-06 — food on any
    // tundra hex, faith on a wooded one — and since the user's re-cut ("+1
    // faith on all tundra") it pays one line carrying both voices. The user's
    // rule the test still pins either way: one card is one entry, carrying
    // every voice it pays, so the breakdown shows exactly one "Belief · Winter
    // Mother" line with both voices, never two entries under the same name.
    const g = game();
    keep(g.state, 0, 'winterMother');
    const ctx = yieldContextFor(g.state, 0)!;
    const base = getTileAt(g.state.map, 4, 4)!;
    const wooded = { ...base, terrain: 'tundra' as const, feature: 'forest' as const };
    const before = foldTileLines(explainTileYield(wooded, ctx));
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
    expect(foldTileLines(list)).toEqual(before);
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
    const foodOf = (tile: typeof base): number => foldTileLines(explainTileYield(tile, ctx)).food;
    // Wheat is a bonus resource that feeds; stone is a bonus resource that does
    // not, and the belief reads the resource's own row rather than a list.
    expect(foodOf(wheat) - foodOf({ ...wheat })).toBe(0);
    expect(
      foldTileLines(explainTileYield(wheat, ctx)).food -
        foldTileLines(explainTileYield(wheat, undefined)).food,
    ).toBe(1);
    expect(
      foldTileLines(explainTileYield(stone, ctx)).food -
        foldTileLines(explainTileYield(stone, undefined)).food,
    ).toBe(0);
    expect(foodOf(bare)).toBe(foldTileLines(explainTileYield(bare, undefined)).food);
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
    const bare = foldCity(g.state, city).science;
    // An augur *in the town* with a rite left in it, which is the whole of the
    // card's text — the reason to keep one home.
    const augur = augurAt(g.state, 0, city.col, city.row);
    expect(foldCity(g.state, city).science).toBeGreaterThanOrEqual(bare);
    augur.chargesLeft = 0;
    expect(foldCity(g.state, city).science).toBe(bare);
  });

  it('rides a windfall in the money of the era (Rites of Blood)', () => {
    const g = game();
    keep(g.state, 0, 'ritesOfBlood');
    const player = playerById(g.state, 0)!;
    const before = player.faithPool;
    // Æra I: the printed twenty-five (batch B2 — the user's mark of 2026-09-08).
    payWindfallGrants(g.state, player, windfallPayout(g.state, 0, 'kill'));
    expect(player.faithPool - before).toBe(25);
    // Æra II: the same rider, doubled. One node of the second age is all the era
    // multiplier is being asked about — re-read against the four-age tree of
    // 2026-08-30, which put Mathematics and Rhetoric into Æra III.
    learn(g.state, 0, 'currency');
    const mid = player.faithPool;
    payWindfallGrants(g.state, player, windfallPayout(g.state, 0, 'kill'));
    expect(player.faithPool - mid).toBe(25 * 2);
  });

  it('opens a cadenced draft on the turn the calendar names (Keeper of the Calendar)', () => {
    const g = game();
    found(g.state, 0);
    keep(g.state, 0, 'keeperOfTheCalendar');
    const player = playerById(g.state, 0)!;

    // Ten turns since batch B2 (the user's mark of 2026-09-08), and the figure
    // is the row's — read off the data rather than written here, so a retune of
    // the almanac retunes the test with it.
    const every = beliefDef('keeperOfTheCalendar').effects.find(
      (effect) => effect.kind === 'periodicOffer',
    )!.every;
    expect(every).toBe(10);

    g.state.turn = every - 1;
    openPeriodicOffers(g.state);
    expect(player.pendingDiscovery).toBeUndefined();

    g.state.turn = every;
    openPeriodicOffers(g.state);
    expect(player.pendingDiscovery).toBeDefined();
    expect(player.pendingDiscovery!.options.length).toBeGreaterThan(0);

    // One at a time: a second sweep on the same turn deals nothing on top of it.
    const held = JSON.stringify(player.pendingDiscovery);
    openPeriodicOffers(g.state);
    expect(JSON.stringify(player.pendingDiscovery)).toBe(held);
  });

  it('stands the calendar’s free unit in the capital, off the offer’s own hex', () => {
    // The user's clarification of 2026-09-08: *"upon choosing a free unit, spawn
    // it in the capital"*. It already did, and this is the pin: the almanac
    // stamps the offer with the seat of government's own hex
    // (`openPeriodicOffers`), and `payDiscovery`'s unit arm stands the piece at
    // `grantTileFor` from **that** hex — so the two halves of "where did this
    // happen" are one field and there is no second rule about where a find lands.
    const g = game();
    const seat = found(g.state, 0);
    keep(g.state, 0, 'keeperOfTheCalendar');
    const player = playerById(g.state, 0)!;
    g.state.turn = 10;
    openPeriodicOffers(g.state);
    const offer = player.pendingDiscovery!;
    expect(offer.col).toBe(seat.col);
    expect(offer.row).toBe(seat.row);

    // A find that hands over a piece: forced, because the draw is seeded and the
    // question is where the piece stands rather than which one was dealt.
    const escort = DISCOVERY_IDS.find((id) => discoveryDef(id).effect.kind === 'unit')!;
    offer.options = [escort];
    const before = g.state.units.length;
    settleDiscovery(g.state, player, 0);
    expect(g.state.units.length).toBe(before + 1);
    const piece = g.state.units[g.state.units.length - 1]!;
    // On the capital's hex, or on the first free hex beside it when the seat is
    // occupied — which is `grantTileFor`'s answer and not a second one.
    const stood = getTileAt(g.state.map, piece.col, piece.row)!;
    const home = getTileAt(g.state.map, seat.col, seat.row)!;
    expect(wrappedDistance(g.state.map, tileHex(stood), tileHex(home))).toBeLessThanOrEqual(1);
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
    bumpRevision(g.state);
    g.state.turn = 20;
    openPeriodicOffers(g.state);
    expect(wild.pendingDiscovery).toBeUndefined();
  });
});

// --- rites, end to end ------------------------------------------------------

/**
 * **A rite is a city's verb** (`docs/history/fewer-things.md` §3, ruled 2026-09-06).
 *
 * The user's complaint was the errand — call an augur, walk it, aim it, spend it
 * — so the errand is gone and the town says the rite itself, out of the empire's
 * faith bank, for ten turns. Four rules and each has a test below: the Chapel is
 * the door, one rite at a time, the price is the ladder's rung for the age, and
 * every refusal leaves the state byte-identical.
 */
describe('rites', () => {
  /** A town with the door, and a bank deep enough to say anything. */
  function town(...techs: string[]) {
    const g = game();
    learn(g.state, 0, 'divination', ...techs);
    const city = found(g.state, 0);
    city.buildings.push('chapel');
    bumpRevision(g.state);
    const player = playerById(g.state, 0)!;
    player.faithPool = 1000;
    return { g, city, player };
  }

  it('are known only where the tree teaches them, and the withdrawn two are gone', () => {
    const g = game();
    expect(availableRites(g.state, 0)).toEqual([]);
    learn(g.state, 0, 'divination');
    // Divination teaches two now: Recasting the Omens is withdrawn (the faith
    // reroll does that job) and its ability has left the tree with it.
    expect(availableRites(g.state, 0)).toEqual(['riteOfTheHarvest', 'omenReading']);
    expect(hasAbility(g.state, 0, 'riteOfTheHarvest')).toBe(true);
    expect(hasAbility(g.state, 0, 'omenReading')).toBe(true);
    // The rows are kept so a save naming one still resolves to a card.
    expect(riteDef('recastingTheOmens').retired).toBe(true);
    expect(riteDef('thePreaching').retired).toBe(true);
    expect(LIVE_RITE_IDS).not.toContain('recastingTheOmens');
    expect(anyCardDef('thePreaching').name).toBe('The Preaching');
  });

  it('need the door — the Chapel, asked of the marker and never of a name', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    playerById(g.state, 0)!.faithPool = 1000;
    // **The tree is the only gate** (the user, 2026-09-06: "have the rites
    // unlock in the tech tree where they used to be"). C2 first made the Chapel
    // a door and the rite subsystem sat behind one uncommon wildcard card; the
    // door is gone the same day. A bare town that knows the rite may say it.
    expect(city.buildings).not.toContain('chapel');
    expect(riteError(g.state, 0, city.id, 'omenReading')).toBeNull();
    // The Chapel is the rite's *bonus*, never its gate: a rite performed where
    // one stands pays culture too (`ritePays`), and that is the whole of the
    // row's business with rites.
    expect(buildingDef('chapel').ritePays).toBeGreaterThan(0);
    expect((buildingDef('chapel') as { ritesDoor?: boolean }).ritesDoor).toBeUndefined();
  });

  it('cost the faith ladder’s rung for the age this empire stands in', () => {
    const { g, city, player } = town();
    // Æra I: the ladder's first rung, which is what a first god costs.
    expect(riteCostFor(g.state, 0)).toBe(RELIGION.rite.costByAge[0]);
    expect(riteCost(1)).toBe(40);
    expect(riteCost(2)).toBe(56);
    expect(riteCost(3)).toBe(72);
    expect(riteCost(4)).toBe(90);
    // A fifth age nobody has priced pays what the fourth does.
    expect(riteCost(9)).toBe(90);

    player.faithPool = 1000;
    const before = player.faithPool;
    performRiteAt(g.state, player, city, 'omenReading');
    expect(player.faithPool).toBe(before - 40);
  });

  it('rise a rung when the empire enters an age', () => {
    const { g } = town();
    expect(riteCostFor(g.state, 0)).toBe(40);
    // Theology is an Æra III node, so holding it prices a rite at the third rung.
    learn(g.state, 0, 'theology');
    expect(riteCostFor(g.state, 0)).toBe(72);
  });

  it('refuse a bank that cannot pay, and say what it holds', () => {
    const { g, city, player } = town();
    player.faithPool = 12;
    expect(riteError(g.state, 0, city.id, 'omenReading')).toBe(
      'Omen Reading asks 40 faith and Ada has 12',
    );
  });

  it('The Vigil keeps the lamp lit for exactly as long as the rite runs', () => {
    // The belief waited on "the rule that asks a city whether it is keeping a
    // rite", which is `cityRite` — a town fact since the rites became a city's
    // verbs (batch C2) — and batch E4a lifted it to a `CityScope`. So the god is
    // an ordinary scoped line read by the ordinary evaluator, and it stops
    // paying on the turn the rite's own absolute stamp passes: nothing ticks and
    // nothing is stored.
    //
    // **A percentage since batch B2** (the user's mark of 2026-09-08): the two
    // flats became ten percent of each voice, which joins `cityYieldPercents`
    // with Entry XVII's city stage like every other share rather than being a
    // multiplication of its own.
    const { g, city, player } = town();
    keep(g.state, 0, 'courtAugurs');
    const lit = (): number =>
      cityYieldPercents(g.state, city)
        .filter((line) => line.source.includes('The Vigil'))
        .reduce((sum, line) => sum + line.percent, 0);
    const voices = (): string[] =>
      cityYieldPercents(g.state, city)
        .filter((line) => line.source.includes('The Vigil'))
        .map((line) => line.yield);
    expect(lit()).toBe(0);
    performRiteAt(g.state, player, city, 'omenReading');
    bumpRevision(g.state);
    expect(lit()).toBe(20);
    expect(voices().sort()).toEqual(['culture', 'science']);
    // Both stand at the **city** stage, which is Entry XVII.5's default and what
    // a belief on one town means: the global stage is spent sparingly.
    for (const line of cityYieldPercents(g.state, city)) {
      if (!line.source.includes('The Vigil')) continue;
      expect(line.stage).toBe('city');
    }
    g.state.turn += 10;
    bumpRevision(g.state);
    expect(cityRite(g.state, city)).toBeNull();
    expect(lit()).toBe(0);
  });

  it('are one at a time — the seal is the rite’s own ten turns', () => {
    const { g, city, player } = town();
    performRiteAt(g.state, player, city, 'omenReading');
    expect(cityRite(g.state, city)).toBe('omenReading');
    expect(cityRiteTurnsLeft(g.state, city)).toBe(10);
    expect(riteError(g.state, 0, city.id, 'riteOfTheHarvest')).toBe(
      `${city.name} is already keeping Omen Reading`,
    );
    // …and the moment it runs out, another may be said. Nothing was ticked.
    g.state.turn += 10;
    expect(cityRite(g.state, city)).toBeNull();
    expect(riteError(g.state, 0, city.id, 'riteOfTheHarvest')).toBeNull();
  });

  it('refuse everything they should, byte-identically', () => {
    const { g, city, player } = town();
    const other = found(g.state, 1);
    const before = snapshotState(g.state);
    // Not my town · no such rite · a withdrawn rite · a rite I have not learnt.
    expect(riteError(g.state, 0, other.id, 'omenReading')).toContain('does not belong');
    expect(riteError(g.state, 0, city.id, 'nonsense')).toContain('no rite called');
    expect(riteError(g.state, 0, city.id, 'thePreaching')).toBe(
      'The Preaching is no longer performed',
    );
    expect(riteError(g.state, 0, city.id, 'blessingOfArms')).toBe(
      'Blessing of Arms is not known to Ada',
    );
    expect(riteError(g.state, 0, 9999, 'omenReading')).toContain('No city with id');
    for (const rite of ['omenReading', 'nonsense', 'thePreaching', 'blessingOfArms']) {
      applyCommand(g.state, {
        type: 'performRite',
        playerId: 0,
        cityId: other.id,
        rite,
      } as unknown as Command);
    }
    expect(player.faithPool).toBe(1000);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('refuse a seat that has ended its turn', () => {
    const { g, city } = town();
    g.state.turnEnded[0] = true;
    const result = applyCommand(g.state, {
      type: 'performRite',
      playerId: 0,
      cityId: city.id,
      rite: 'omenReading',
    } as Command);
    expect(result.ok).toBe(false);
  });

  // --- what each of the five does -------------------------------------------

  it('food — every hex the town works that feeds it feeds it one more', () => {
    const { g, city, player } = town();
    const before = foldCity(g.state, city).food;
    performRiteAt(g.state, player, city, 'riteOfTheHarvest');
    const after = foldCity(g.state, city).food;
    expect(after).toBeGreaterThan(before);
    // And it is a line on the ground, not a flat on the town: a hex that feeds
    // reads one higher through the tile chain itself.
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const ctx = cityContext(g.state, city);
    const paid = foldTileLines(explainTileYield(tile, ctx));
    expect(paid.food).toBeGreaterThan(foldTileLines(explainTileYield(tile)).food);
  });

  it('gold — a worked hex with a seam in it pays a coin more', () => {
    const { g, city, player } = town('currency', 'theWheel', 'mining');
    const tile = g.state.map.tiles.find(
      (t) => t.resource !== undefined && tileIndex(g.state.map, t.col, t.row) >= 0,
    );
    performRiteAt(g.state, player, city, 'riteOfPlenty');
    expect(cityRite(g.state, city)).toBe('riteOfPlenty');
    if (tile) {
      const ctx = cityContext(g.state, city);
      const withRite = foldTileLines(explainTileYield(tile, ctx)).gold;
      delete city.timed;
      const without = foldTileLines(explainTileYield(tile, cityContext(g.state, city))).gold;
      expect(withRite).toBe(without + 1);
    }
  });

  it('science — every building standing in the town adds a beaker', () => {
    const { g, city, player } = town('earthenware', 'letters');
    city.buildings.push('library');
    bumpRevision(g.state);
    // The **flats**, since batch X: the empire stage multiplies both readings
    // and is no longer floored away, so "two more beakers" is a claim about the
    // fold rather than about the staged figure.
    const before = explainCity(g.state, city).flats.science;
    performRiteAt(g.state, player, city, 'omenReading');
    // The Chapel and the Library are two shelves, so two beakers.
    expect(explainCity(g.state, city).flats.science).toBe(before + city.buildings.length);
  });

  it('culture — luxuries sing, and the bounds walk outward faster', () => {
    const { g, city, player } = town('earthenware');
    performRiteAt(g.state, player, city, 'consecrationOfTheBounds');
    const lines = cardRulePercent(g.state, 0, 'borderCulture', city).filter(
      (entry) => entry.card === 'consecrationOfTheBounds',
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]!.percent).toBe(30);
  });

  it('military — the town is harder to storm while the rite runs', () => {
    const { g, city, player } = town('mining', 'bronzeWorking');
    const before = foldCityStat(cardCityStat(g.state, city, 'defense'));
    performRiteAt(g.state, player, city, 'blessingOfArms');
    expect(foldCityStat(cardCityStat(g.state, city, 'defense'))).toBe(before + 5);
    // And it runs out on the turn it names, like everything else timed.
    g.state.turn += 10;
    expect(foldCityStat(cardCityStat(g.state, city, 'defense'))).toBe(before);
  });

  it('pays the Chapel’s culture for the saying of it', () => {
    const { g, city, player } = town();
    player.culturePool = 0;
    const done = performRiteAt(g.state, player, city, 'omenReading');
    expect(done.chapelCulture).toBe(5);
    expect(player.culturePool).toBe(5);
  });

  it('stamps an absolute expiry, and the report carries the turns it runs', () => {
    const { g, city, player } = town();
    const done = performRiteAt(g.state, player, city, 'omenReading');
    expect(done.turns).toBe(10);
    expect(done.expiresTurn).toBe(g.state.turn + 10);
    expect(city.timed!.every((entry) => entry.expiresTurn === done.expiresTurn)).toBe(true);
  });
});

// --- the prophet's rite over the realm ---------------------------------------

describe('a prophet says a rite over every town', () => {
  function ready() {
    const g = game();
    learn(g.state, 0, 'divination');
    const first = found(g.state, 0);
    const second = foundCityAt(g.state, 0, getTileAt(g.state.map, first.col + 3, first.row)!);
    const player = playerById(g.state, 0)!;
    player.faithPool = 1000;
    const prophet = createUnit(g.state, 0, 'prophet', first.col, first.row);
    return { g, first, second, player, prophet };
  }

  it('needs no chapel anywhere, and lands on every town at one price', () => {
    const { g, first, second, player, prophet } = ready();
    expect(first.buildings).not.toContain('chapel');
    expect(empireRiteError(g.state, 0, prophet.id, 'omenReading')).toBeNull();
    const before = player.faithPool;
    const done = empireRiteAt(g.state, player, prophet, 'omenReading');
    expect(done.cities.map((city) => city.id)).toEqual([first.id, second.id]);
    // One price, not one a town.
    expect(player.faithPool).toBe(before - 40);
    expect(cityRite(g.state, first)).toBe('omenReading');
    expect(cityRite(g.state, second)).toBe('omenReading');
  });

  it('takes over from whatever a town was keeping, so it is still one at a time', () => {
    const { g, first, player, prophet } = ready();
    first.buildings.push('chapel');
    bumpRevision(g.state);
    performRiteAt(g.state, player, first, 'riteOfTheHarvest');
    expect(cityRite(g.state, first)).toBe('riteOfTheHarvest');
    empireRiteAt(g.state, player, prophet, 'omenReading');
    expect(cityRite(g.state, first)).toBe('omenReading');
    const live = first.timed!.filter((entry) => entry.card === 'riteOfTheHarvest');
    expect(live).toHaveLength(0);
  });

  it('spends one charge of two, and refuses a rite the realm has not learnt', () => {
    const { g, player, prophet } = ready();
    expect(prophet.chargesLeft).toBe(2);
    expect(empireRiteError(g.state, 0, prophet.id, 'blessingOfArms')).toBe(
      'Blessing of Arms is not known to Ada',
    );
    const done = empireRiteAt(g.state, player, prophet, 'omenReading');
    expect(done.prophetSpent).toBe(false);
    expect(playerById(g.state, 0)!.id).toBe(0);
    expect(g.state.units.find((u) => u.id === prophet.id)!.chargesLeft).toBe(1);
  });

  it('refuses a bank that cannot pay, byte-identically', () => {
    const { g, player, prophet } = ready();
    player.faithPool = 3;
    const before = snapshotState(g.state);
    expect(
      applyCommand(g.state, {
        type: 'empireRite',
        playerId: 0,
        unitId: prophet.id,
        rite: 'omenReading',
      } as Command).ok,
    ).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });
});

// --- the apostle -------------------------------------------------------------

describe('the apostle', () => {
  function ready() {
    const g = game();
    learn(g.state, 0, 'divination', 'philosophy', 'theology');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 1000;
    const apostle = createUnit(g.state, 0, 'apostle', city.col, city.row);
    return { g, city, player, apostle };
  }

  it('is on the roster with two charges, four movement and its own marker', () => {
    const def = unitDef('apostle');
    expect(def.charges).toBe(2);
    expect(def.movement).toBe(4);
    expect(def.category).toBe('civilian');
    expect(def.proclaims).toBe(true);
    expect(def.prophesies).toBeUndefined();
    // Theology's own list names it, and only that node's.
    expect(techDef('theology').unlocks.units ?? []).toContain('apostle');
  });

  it('proclaims at half a prophet’s weight, over six hexes', () => {
    const { g, apostle } = ready();
    const player = playerById(g.state, 0)!;
    keep(g.state, 0, BELIEF_IDS[0]!);
    foundReligion(g.state, player);
    const preview = proclaimPreview(g.state, apostle.id)!;
    expect(preview.range).toBe(RELIGION.apostle.proclaimRange);
    expect(preview.lump).toBe(Math.floor((RULES.religion.bombLump * 50) / 100));
    // The prophet's own figures are untouched by the apostle's share.
    const prophet = createUnit(g.state, 0, 'prophet', apostle.col, apostle.row);
    expect(proclaimPreview(g.state, prophet.id)!.lump).toBe(RULES.religion.bombLump);
    expect(proclaimPreview(g.state, prophet.id)!.range).toBe(RULES.religion.bombRange);
  });

  it('lays on hands: mends every friendly piece on its hex and the six touching it', () => {
    const { g, apostle } = ready();
    const player = playerById(g.state, 0)!;
    const beside = createUnit(g.state, 0, 'warrior', apostle.col + 1, apostle.row);
    const far = createUnit(g.state, 0, 'warrior', apostle.col + 4, apostle.row);
    beside.hp = 40;
    far.hp = 40;
    expect(healAdjacentError(g.state, 0, apostle.id)).toBeNull();
    const done = healAdjacentAt(g.state, player, apostle);
    expect(beside.hp).toBe(40 + RELIGION.apostle.heal);
    expect(far.hp).toBe(40);
    expect(done.units.some((row) => row.unitId === beside.id && row.healed === 25)).toBe(true);
    // One charge of two.
    expect(done.apostleSpent).toBe(false);
    expect(g.state.units.find((u) => u.id === apostle.id)!.chargesLeft).toBe(1);
  });

  it('never mends past a piece’s own maximum', () => {
    const { g, apostle } = ready();
    const player = playerById(g.state, 0)!;
    const whole = createUnit(g.state, 0, 'warrior', apostle.col, apostle.row);
    healAdjacentAt(g.state, player, apostle);
    expect(whole.hp).toBe(unitMaxHp(whole));
  });

  it('leaves a relic in a cathedral town, one per cathedral, paying faith a turn', () => {
    const { g, city, player, apostle } = ready();
    expect(placeRelicError(g.state, 0, apostle.id)).toBe(
      `${city.name} has no cathedral to keep a relic in`,
    );
    city.buildings.push('cathedral');
    bumpRevision(g.state);
    expect(placeRelicError(g.state, 0, apostle.id)).toBeNull();

    const before = foldCity(g.state, city).faith;
    const done = placeRelicAt(g.state, player, apostle);
    expect(done.building).toBe('relic');
    expect(city.buildings).toContain('relic');
    expect(foldCity(g.state, city).faith).toBe(before + RELIGION.relicFaith);
    // The row's own figure and the religion table's are one number.
    expect(buildingDef('relic').faith).toBe(RELIGION.relicFaith);
    // And a second one is refused.
    const second = createUnit(g.state, 0, 'apostle', city.col, city.row);
    expect(placeRelicError(g.state, 0, second.id)).toBe(`${city.name} already keeps a relic`);
  });

  it('never builds and never buys the relic, and says so both ways', () => {
    const { g, city } = ready();
    expect(buildingDef('relic').placed).toBe(true);
    expect(isUnlocked(g.state, 0, 'building', 'relic')).toBe(false);
    expect(buildError(g.state, 0, 'building', 'relic')).toBe(
      'Relic is neither built nor bought — it is placed',
    );
    expect(
      purchaseError(g.state, 0, city.id, { kind: 'building', id: 'relic' }, 'gold'),
    ).toBe('Relic is neither built nor bought — it is placed');
  });

  it('refuses a relic in somebody else’s town, byte-identically', () => {
    const { g, apostle } = ready();
    const theirs = found(g.state, 1);
    theirs.buildings.push('cathedral');
    bumpRevision(g.state);
    apostle.col = theirs.col;
    apostle.row = theirs.row;
    const before = snapshotState(g.state);
    expect(placeRelicError(g.state, 0, apostle.id)).toBe(
      'A relic is left in one of your own cities',
    );
    expect(
      applyCommand(g.state, { type: 'placeRelic', playerId: 0, unitId: apostle.id } as Command).ok,
    ).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('is refused every act when it is not an apostle, in the piece’s own words', () => {
    const { g } = ready();
    const worker = createUnit(g.state, 0, 'worker', 5, 5);
    expect(healAdjacentError(g.state, 0, worker.id)).toBe('A Worker is no apostle');
    expect(placeRelicError(g.state, 0, worker.id)).toBe('A Worker is no apostle');
  });
});

// --- timed effects ----------------------------------------------------------

describe('timed effects', () => {
  /** A blessed town: the door, a library to count, and a full bank. */
  function blessed() {
    const g = game();
    learn(g.state, 0, 'divination', 'earthenware', 'letters');
    const city = found(g.state, 0);
    city.buildings.push('chapel');
    bumpRevision(g.state);
    playerById(g.state, 0)!.faithPool = 1000;
    return { g, city };
  }

  it('run out on the exact turn they name, and not the one before', () => {
    const { g, city } = blessed();
    city.buildings.push('library');
    bumpRevision(g.state);
    const bare = explainCity(g.state, city).flats.science;

    performRiteAt(g.state, playerById(g.state, 0)!, city, 'omenReading');
    const expires = city.timed![0]!.expiresTurn;
    expect(expires).toBe(g.state.turn + 10);

    // Live on the last turn before the expiry… (the flats, for batch X's reason
    // above: the stage multiplies both sides.)
    g.state.turn = expires - 1;
    expect(explainCity(g.state, city).flats.science).toBe(bare + city.buildings.length);
    // …and inert on the expiry itself. A comparison, never a countdown.
    g.state.turn = expires;
    expect(explainCity(g.state, city).flats.science).toBe(bare);
  });

  it('are swept without changing any answer — a broom, not a clock', () => {
    const { g, city } = blessed();
    performRiteAt(g.state, playerById(g.state, 0)!, city, 'omenReading');
    const expires = city.timed![0]!.expiresTurn;

    g.state.turn = expires;
    const beforeSweep = foldCity(g.state, city).science;
    pruneTimedEffects(g.state);
    expect(foldCity(g.state, city).science).toBe(beforeSweep);
    // The key is *deleted*, so a town whose blessings have run out serialises
    // exactly like one that was never blessed.
    expect('timed' in city).toBe(false);
  });

  it('leave a still-live effect alone when the broom passes', () => {
    const { g, city } = blessed();
    performRiteAt(g.state, playerById(g.state, 0)!, city, 'omenReading');
    pruneTimedEffects(g.state);
    expect(city.timed).toHaveLength(1);
  });

  it('fold into the same lists a card does, never into a channel of their own', () => {
    const { g, city } = blessed();
    const empireOnly = liveEffects(g.state, 0).length;
    const before = liveCityEffects(g.state, city).length;
    performRiteAt(g.state, playerById(g.state, 0)!, city, 'omenReading');
    // The empire's own walk is unchanged — a rite is a fact about a town.
    expect(liveEffects(g.state, 0)).toHaveLength(empireOnly);
    // And the city's walk is what it was plus this one.
    expect(liveCityEffects(g.state, city)).toHaveLength(before + 1);
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
      type: 'performRite', playerId: 0, cityId: city.id, rite: 'riteOfTheHarvest',
    } as Command);
    expect(snapshotState(g.state)).toEqual(before);
  });
});

// --- what the interface reads ----------------------------------------------

describe('the panel’s reading', () => {
  it('gives every live rite a preview, and says how long it runs', () => {
    for (const id of LIVE_RITE_IDS) {
      const preview = ritePreview(id);
      expect(preview, id).not.toBeNull();
      expect(preview!.length, id).toBeGreaterThan(0);
      expect(preview!, id).toContain('lasts 10 turns');
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
const SIM_SOURCE = {
  ...import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  // The yields layer, since batch E3b split it out of `cities.ts` — the hex's
  // own file is where `cityContext` lives now.
  ...import.meta.glob('../../src/sim/yields/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
} as Record<string, string>;

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
    // **Batch B2's two**, both read in exactly one place and both asserted end
    // to end above: the roster row Holy Order opens (`cardUnlocksUnit`, through
    // `isUnlocked`) and the empire-wide renown share (`cardEmpireRenownShares`,
    // through `explainRenown`). A shape declared and never used is a shape
    // nobody has tested.
    expect(used.has('unlocksUnit')).toBe(true);
    expect(used.has('cityRenownPercent')).toBe(true);
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
    // **Tree revision 4 (2026-09-02, the user's redraw) cut Ancestor Rites**,
    // and the temple is what caught what fell: it hangs off Epic Poetry alone
    // now — the verse a people keeps and the roof they keep it under — and it
    // has taken the great-person gate the cut node used to carry. So the faith
    // line still runs off itself, one rung shorter: Divination → … → The High
    // Temple → Rhetoric → Theology.
    expect(def.prereqs).toEqual(['epicPoetry']);
    expect(def.unlocks.units ?? []).toContain('prophet');
    expect(def.unlocks.buildings ?? []).toContain('temple');
    // The Preaching went with the fewer-things pass: a prophet makes that noise
    // now, and makes it louder.
    expect(def.unlocks.abilities ?? []).not.toContain('thePreaching');
    // The great-person gate moved a rung DOWN the line on 2026-09-05 (the first
    // full playthrough: renown was answered too early, and the poets keeping
    // the roll of names reads better than the temple). `settleRenownWindfall`
    // asks `ABILITY_TECH`, so the move is one JSON row — pinned here so the
    // temple never quietly takes it back.
    expect(def.unlocks.abilities ?? []).not.toContain('ancestorRites');
    expect(techDef('epicPoetry').unlocks.abilities ?? []).toContain('ancestorRites');
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
    // `cost` is optional since batch B2 — a row that mirrors another carries
    // none — so the prophet's own figure is asserted present before it is used.
    expect(spec.cost).toBeDefined();
    expect(price.total).toBe(spec.cost);
    expect(explainPurchaseCost(g.state, 0, city.id, PROPHET, 'gold')).toBeNull();

    // The ladder is the prophet's own, not the augur's: six augurs must not
    // make the first prophet dearer.
    const player = playerById(g.state, 0)!;
    player.augursPurchased = 6;
    expect(explainPurchaseCost(g.state, 0, city.id, PROPHET, 'faith')!.total).toBe(spec.cost);
    player.prophetsPurchased = 1;
    expect(explainPurchaseCost(g.state, 0, city.id, PROPHET, 'faith')!.total).toBe(
      spec.cost! + spec.increment!,
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
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
    bumpRevision(g.state);

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

    // **And the lump has exactly two callers**, in two files: the prophet's
    // proclamation here, and The Crusade's kill at the battle seam
    // (`payBattleRiders`, `combat.ts` — the file that holds both the fight and
    // the faith, which is why the presser is handed *down* to the one place a
    // windfall is paid rather than imported by it). A third way to press a lump
    // joins this pin or it is a second implementation of what a lump does.
    expect(source.match(/\bpressLump\(/g)?.length).toBe(2);
    expect(body('proclaimAt')).toContain('pressLump(');
    const fight = simSource('combat.ts');
    expect(fight.match(/\bpressLump\(/g)?.length).toBe(1);
    const riders = fight.slice(fight.indexOf('function payBattleRiders('));
    expect(riders.slice(0, riders.indexOf('\n}\n'))).toContain('pressLump(');
  });

  it('lets a wonder press for the empire that holds the stones', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    const target = town(g.state, 1, 8, 6);
    expect(pressureTotals(g.state, target)[religion.id]).toBe(0);
    seat.buildings.push('hagiaSophia');
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
    bumpRevision(g.state);
    const mine = town(g.state, 0, 7, 6);
    const theirs = town(g.state, 1, 9, 6);
    const quiet = town(g.state, 1, 5, 8);
    mine.followers = { [religion.id]: mine.population };
    theirs.followers = { [religion.id]: theirs.population };

    // The founder's own following town is paid in **its own** ledger.
    const paid = (city: City): CardYieldLine | undefined =>
      explainCardCityYields(g.state, city).find((line) => line.source.includes('The Quiet Hours'));
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
        explainCardEmpireYields(g.state, seat).some((line) => line.source.includes('The Quiet Hours')),
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
    bumpRevision(g.state);
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
    expect(simSource('yields/hex.ts')).toContain('...followerCardTileLines(state, city),');

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
    bumpRevision(g.state);
    const theirs = town(g.state, 1, 9, 6);
    theirs.followers = { [religion.id]: theirs.population };
    theirs.buildings.push('temple');
    bumpRevision(g.state);
    // Two clauses, both landing in the one town that follows — and since batch
    // B2 they land in two ledgers, which is the whole of the user's mark: the
    // town's half is the card's line, and the temple's half is filed **under the
    // temple** (`CardHappinessEffect.building`) so a share of a temple's worth
    // would have one figure to take.
    expect(
      cardHappiness(g.state, 1)
        .filter((line) => line.source.includes('Feast Days'))
        .reduce((sum, line) => sum + line.amount, 0),
    ).toBe(1);
    const onTheTemple = buildingHappiness(
      g.state,
      1,
      cardBuildingHappiness(g.state, 1),
    ).filter((line) => line.source.includes('Feast Days'));
    expect(onTheTemple).toHaveLength(1);
    expect(onTheTemple[0]!.amount).toBe(1);
    // The line names the walls it stands in as well as the law that put it
    // there — a thing in a named town, which is what the ledger is for.
    expect(onTheTemple[0]!.source).toContain(theirs.name);
    expect(onTheTemple[0]!.source).toContain('Temple');
    // **Counted once**: the empire's own two ledgers between them are still the
    // two the belief pays, and neither says the other's half.
    expect(cardHappiness(g.state, 1).some((line) => line.source.includes('Temple'))).toBe(false);
    expect(cardHappiness(g.state, 0).some((line) => line.source.includes('Feast Days'))).toBe(
      false,
    );
    expect(
      buildingHappiness(g.state, 0, cardBuildingHappiness(g.state, 0)).some((line) =>
        line.source.includes('Feast Days'),
      ),
    ).toBe(false);
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
    bumpRevision(g.state);

    const trickleFor = (playerId: number): number =>
      explainCardEmpireYields(g.state, playerId)
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
    bumpRevision(g.state);
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
    bumpRevision(g.state);
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
      explainCardEmpireYields(g.state, 0)
        .filter((line) => line.source.startsWith(`Religion · ${religion.name}`))
        .reduce((sum, line) => sum + line.faith, 0);
    expect(faithOf()).toBe(1);

    // Apostles doubles the trickle **before anything is banked**, and reaches
    // the trickle alone.
    religion.enhancer = ['apostles'];
    bumpRevision(g.state);
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
    bumpRevision(g.state);

    // Every one of the five counts is asked by a row, which is what stops a
    // count from being declared and never read. All four rows live in the
    // **enhancer** pool since the 2026-08-28 ruling: a world-scale count is a
    // question about a founder, and a follower belief is a fact about a town.
    // **Congregation** — one happiness per three following towns, up to five
    // (batch B2). Five towns follow, so one helping.
    religion.enhancer = ['congregation'];
    bumpRevision(g.state);
    expect(
      cardHappiness(g.state, 0).find((line) => line.source.includes('Congregation'))?.amount,
    ).toBe(1);

    // **World Church** — a *percentage* of culture per following empire since
    // batch B2, which is a `countScaled` paying `to: 'percent'` at the empire
    // stage (Divine Inspiration's shape) rather than a flat happiness. Two
    // empires follow, so thirty points.
    religion.enhancer = ['worldChurch'];
    bumpRevision(g.state);
    const church = cityYieldPercents(g.state, following[0]!).filter((line) =>
      line.source.includes('World Church'),
    );
    expect(church).toHaveLength(1);
    expect(church[0]!.percent).toBe(30);
    expect(church[0]!.yield).toBe('culture');
    expect(church[0]!.stage).toBe('empire');
    expect(cardHappiness(g.state, 0).some((line) => line.source.includes('World Church'))).toBe(
      false,
    );

    // **Pilgrims' Coin** — four gold for every following town in the world
    // (batch B2), where it once asked for a temple and paid faith. Five follow.
    religion.enhancer = ['pilgrimsCoin'];
    bumpRevision(g.state);
    expect(
      explainCardEmpireYields(g.state, 0).find((line) => line.source.includes("Pilgrims' Coin"))?.gold,
    ).toBe(20);

    religion.enhancer = ['theLongPrayer'];
    bumpRevision(g.state);
    // Eight citizens, one culture per four.
    expect(
      explainCardEmpireYields(g.state, 0).find((line) => line.source.includes('The Long Prayer'))?.culture,
    ).toBe(2);

    // And the whole family answers **nothing** for a seat that holds no holy
    // city — which is what the tide's counts are asked of now.
    religion.enhancer = [];
    bumpRevision(g.state);
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

  it('is used up entirely by the founding — both charges, one deed', () => {
    // Two charges since the fewer-things pass, and the founding still takes the
    // **whole** piece: the acts that settle what a faith is are what the price
    // ladder poses a question about, and the two that merely spend its voice
    // (a proclamation, a rite over the realm) take one charge each.
    const { g, prophet } = readyProphet();
    expect(prophet.chargesLeft).toBe(2);
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
    // **One charge of two**, so the prophet walks away — and its day goes with
    // the charge, which is what stops a second proclamation on the same turn.
    const left = g.state.units.find((u) => u.id === prophet.id)!;
    expect(left.chargesLeft).toBe(1);
    expect(left.movesLeft).toBe(0);
    expect(proclaimError(g.state, 0, prophet.id)).toBe(
      `Unit ${prophet.id} has no movement left`,
    );
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
    bumpRevision(g.state);
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

  it('no longer redrafts a pool at all — the verb is gone from the union', () => {
    // The redraft went with the fewer-things pass and the empire rite took its
    // charge; an old log naming it is refused and changes nothing.
    const { g, prophet } = readyProphet();
    faith(g.state, 0, 'starReaders');
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, {
      type: 'redraftBeliefs',
      playerId: 0,
      unitId: prophet.id,
      pool: 'follower',
    } as unknown as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
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

  it('preaches: the apostle presses half the lump out of the same purse', () => {
    const g = game();
    learn(g.state, 0, 'divination', 'stonecraft', 'theHighTemple', 'philosophy', 'theology');
    const seat = found(g.state, 0);
    seat.population = 8;
    const religion = faith(g.state, 0);
    const apostle = createUnit(g.state, 0, 'apostle', seat.col, seat.row);
    expect(proclaimError(g.state, 0, apostle.id)).toBeNull();
    const result = applyCommand(g.state, {
      type: 'proclaim',
      playerId: 0,
      unitId: apostle.id,
    } as Command);
    expect(result.ok).toBe(true);
    // Half of the prophet's sixty against ten a convert: three citizens of
    // eight, which is not a majority — the cheap lever, and it is the *same*
    // lever the prophet's charge pulls (`pressLump`), reported through the same
    // field of the same result.
    expect(seat.followers?.[religion.id]).toBe(3);
    expect(cityReligion(seat)).toBeNull();
    expect(result.ok && result.proclaimed?.cities).toContainEqual({
      cityId: seat.id,
      converted: 3,
      nowFollows: false,
    });
    // Nothing is left standing on the board.
    expect(seat.pressureBank).toBeUndefined();
    // And one charge of two is gone: the apostle walks away.
    expect(g.state.units.find((u) => u.id === apostle.id)!.chargesLeft).toBe(1);
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

// --- the ratified rows of the Themes Build (Entry LVIII, phase 4) ------------

/**
 * The religion rows the theme sheets ratified, and the one member of the combat
 * vocabulary they needed.
 *
 * `statecraft.test.ts`' discipline on this side of the table: one behavioural
 * test per row, plus the printed sentence, plus the seventh `TileLine`
 * producer's wiring read off the source — `cityContext` is private by design, so
 * "a consecration's ground line is folded in" is a claim about the module rather
 * than about a number.
 */
describe('the ratified religion rows', () => {
  it('followingTerritory — The Crusade fights harder among a foreign congregation', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    const theirs = town(g.state, 1, 9, 6);
    theirs.followers = { [religion.id]: theirs.population };

    // A hex of the following town's own ground, with somebody standing on it.
    const target = getTileAt(g.state.map, theirs.col, theirs.row + 1)!;
    createUnit(g.state, 1, 'warrior', target.col, target.row);
    const mine = createUnit(g.state, 0, 'warrior', theirs.col, theirs.row + 2);
    const plain = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(plain.ok).toBe(true);
    if (!plain.ok) return;
    const before = plain.attackerStrength;

    religion.enhancer = ['theCrusade'];
    bumpRevision(g.state);
    const crusading = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(crusading.ok).toBe(true);
    if (!crusading.ok) return;
    // Two since the rework of batch E4b (the user's own words): the belief
    // bought the spread with the difference.
    expect(crusading.attackerStrength - before).toBe(2);

    // **The banner, not the border.** The same fight over a town that has since
    // stopped following pays nothing at all.
    theirs.followers = {};
    const lapsed = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(lapsed.ok).toBe(true);
    if (!lapsed.ok) return;
    expect(lapsed.attackerStrength).toBe(before);
  });

  it('The Crusade presses a lump of faith wherever its soldiers kill', () => {
    // **The spread half** (batch E4b, the user's own words: *killing units
    // spreads your faith*). It is a `windfallRider` on the kill, whose grant is a
    // lump — `bankPressure`'s third caller, and a lump rather than a tide because
    // the tide is what a holy site radiates every turn from where it stands and
    // this happened once, in a place, because somebody did it.
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    religion.enhancer = ['theCrusade'];
    bumpRevision(g.state);
    // A foreign town near the field, keeping nobody's faith.
    const theirs = town(g.state, 1, 9, 6);
    theirs.followers = {};
    theirs.pressureBank = {};

    // A kill on the doorstep. The blow is struck through the one evaluator, so
    // what is on trial is the seam and not a hand-called routine.
    const target = getTileAt(g.state.map, theirs.col, theirs.row + 1)!;
    const victim = createUnit(g.state, 1, 'warrior', target.col, target.row);
    victim.hp = 1;
    const mine = createUnit(g.state, 0, 'warrior', theirs.col, theirs.row + 2);
    mine.movesLeft = fullMovement(mine, g.state);
    applyCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(g.state.units.some((u) => u.id === victim.id)).toBe(false);

    // The lump landed on the town within reach: either it banked pressure or it
    // turned a citizen outright, which is what `pressLump` does in one pass.
    const banked = (theirs.pressureBank?.[religion.id] ?? 0) + (theirs.followers[religion.id] ?? 0);
    expect(banked).toBeGreaterThan(0);
  });

  it('presses nothing for an empire that has founded no religion', () => {
    // The honest silence: the lump is *this empire's own faith*, read through
    // `heldReligions`, so a seat with no holy city of its own presses nothing
    // and the kill is an ordinary kill.
    const g = game();
    town(g.state, 0, 6, 6);
    const theirs = town(g.state, 1, 9, 6);
    theirs.followers = {};
    theirs.pressureBank = {};
    const before = JSON.stringify({ f: theirs.followers, p: theirs.pressureBank });

    const target = getTileAt(g.state.map, theirs.col, theirs.row + 1)!;
    const victim = createUnit(g.state, 1, 'warrior', target.col, target.row);
    victim.hp = 1;
    const mine = createUnit(g.state, 0, 'warrior', theirs.col, theirs.row + 2);
    mine.movesLeft = fullMovement(mine, g.state);
    applyCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(JSON.stringify({ f: theirs.followers, p: theirs.pressureBank })).toBe(before);
  });

  it("The Crusade's line stops at your own towns, which is what foreign means", () => {
    const g = game();
    const mineTown = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    religion.enhancer = ['theCrusade'];
    bumpRevision(g.state);
    mineTown.followers = { [religion.id]: mineTown.population };
    const target = getTileAt(g.state.map, mineTown.col, mineTown.row + 1)!;
    createUnit(g.state, 1, 'warrior', target.col, target.row);
    const mine = createUnit(g.state, 0, 'warrior', mineTown.col, mineTown.row + 2);
    const preview = previewCombat(g.state, mine.id, { col: target.col, row: target.row });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.bonuses.some((line) => line.source.includes('The Crusade'))).toBe(false);
  });

  it('The Green Cathedral is the seventh producer of a hex line', () => {
    const g = game();
    const city = town(g.state, 0, 6, 6);
    expect(consecrationCardTileLines(g.state, city)).toEqual([]);
    city.consecration = 'theGreenCathedral';
    const lines = consecrationCardTileLines(g.state, city);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.on).toEqual({ test: 'unimproved' });
    expect(lines[0]!.faith).toBe(1);
    expect(lines[0]!.culture).toBe(1);
    expect(lines[0]!.source).toContain('The Green Cathedral');
    // A consecration is a fact about **one** cathedral in one town, so a second
    // town of the same empire is untouched.
    expect(consecrationCardTileLines(g.state, town(g.state, 0, 9, 6))).toEqual([]);
    // Wired into the one place a town's own ground lines are gathered.
    expect(simSource('yields/hex.ts')).toContain('...consecrationCardTileLines(state, city),');
  });

  it('The Stone Hoard pays a mine or a quarry that stands on a seam, and bare rock nothing', () => {
    // Batch B2, the user's mark of 2026-09-08: the row was Lord of the Hoard's
    // mine-on-a-luxury and is now *"a Mine **or** Quarry carrying a resource"*.
    // The id is forever and the name follows the data, which is why the belief
    // is still `lordOfTheHoard` in every save that keeps it.
    const g = game();
    const city = town(g.state, 0, 6, 6);
    keep(g.state, 0, 'lordOfTheHoard');
    expect(beliefDef('lordOfTheHoard').name).toBe('The Stone Hoard');
    const tile = getTileAt(g.state.map, city.col, city.row + 1)!;
    const paid = (): { culture: number; faith: number } | undefined => {
      const line = explainTileYield(tile, yieldContextFor(g.state, 0)).find((entry) =>
        entry.source.includes('The Stone Hoard'),
      );
      return line === undefined ? undefined : { culture: line.culture, faith: line.faith };
    };

    // Bare works pay nothing, and a bare seam pays nothing: the condition is
    // both halves under one `all`.
    tile.improvement = 'mine';
    delete tile.resource;
    expect(paid()).toBeUndefined();
    delete tile.improvement;
    tile.resource = 'iron';
    expect(paid()).toBeUndefined();

    // A **mine** on a seam, and — the widening — a **quarry** on one. Iron is a
    // strategic seam, not a luxury: the old row would have paid neither.
    tile.improvement = 'mine';
    expect(paid()).toEqual({ culture: 1, faith: 1 });
    tile.improvement = 'quarry';
    expect(paid()).toEqual({ culture: 1, faith: 1 });
    // A third row of works is not on the list and is not admitted by it.
    tile.improvement = 'farm';
    expect(paid()).toBeUndefined();
  });

  it('keeps The Living Rock readable after withdrawing it from every pool', () => {
    // Retired in batch B2 (the user's mark: *REMOVE*). `retired` is the
    // discipline the whole card system keeps — the row stays so a save that
    // named it still loads and still pays, and it simply stops being dealt.
    expect(beliefDef('theLivingRock').retired).toBe(true);
    const g = game();
    // Out of the pantheon's own bag — the third pool's `retired` clause, which
    // `beliefPool` did not have until a pantheon row was withdrawn.
    expect(beliefPool(g.state, playerById(g.state, 0)!)).not.toContain('theLivingRock');
    // And it still pays a religion that already keeps it.
    const city = town(g.state, 0, 6, 6);
    keep(g.state, 0, 'theLivingRock');
    const tile = getTileAt(g.state.map, city.col, city.row + 1)!;
    tile.improvement = 'mine';
    tile.resource = 'iron';
    const paid = explainTileYield(tile, yieldContextFor(g.state, 0)).find((line) =>
      line.source.includes('The Living Rock'),
    );
    expect(paid?.culture).toBe(1);
  });

  it('The Promised Land sends its settlers out one citizen heavier', () => {
    const g = game();
    town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    const plain = cardFoundingRider(g.state, 0);
    religion.enhancer = ['thePromisedLand'];
    bumpRevision(g.state);
    const blessed = cardFoundingRider(g.state, 0);
    expect(blessed.population - plain.population).toBe(1);
  });

  it('prints the new rows in the words the sheets ratified', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    // Re-cut in batch E4b (the user's own words: *killing units spreads your
    // faith · +2 combat in foreign cities following your religion*): the
    // strength half bought the spread with the difference.
    expect(said('theCrusade')).toEqual([
      '+2 combat strength inside foreign cities that follow your religion',
      'killing a unit spreads your religion to every city within 3 hexes',
    ]);
    // Withdrawn on 2026-09-07 (the user: *remove, not needed* — a new town is
    // converted in a turn or two anyway), and the faith clause cut with it, so
    // the row prints only what it still pays whoever holds it in a save.
    expect(said('thePromisedLand')).toEqual([
      'new cities start 1 population larger',
    ]);
    // The widened condition in the describer's own words: one qualifier made of
    // the whole list, with the article on the first name only — `anyFeature`'s
    // bargain one field over.
    expect(said('lordOfTheHoard')).toEqual([
      '+1 culture, +1 faith on every hex with a Mine or Quarry carrying a resource',
    ]);
    expect(said('theGreenCathedral')).toEqual([
      '+1 culture, +1 faith on every unimproved hex',
    ]);
  });
});

/**
 * **Batch B2 — the beliefs balance pass** (`docs/beliefs.md`, the user's marks
 * of 2026-09-08).
 *
 * A case per row the pass moved, and each of them reads the *data* for its
 * figure wherever a figure is a dial: the point of the worksheet is that the
 * numbers move again next week, and a test that restated one would fail the
 * retune instead of checking it. What is pinned here is the **shape** — which
 * ledger a clause lands in, and what it is a share of.
 */
describe('the beliefs balance pass', () => {
  it('Star Readers reads its beakers off the row, and pays only beside a peak', () => {
    const g = game();
    const flat = town(g.state, 0, 6, 6);
    keep(g.state, 0, 'starReaders');
    const row = beliefDef('starReaders').effects.find(
      (effect) => effect.kind === 'pays' && effect.where === 'city',
    ) as { science?: number };
    const printed = row.science;
    expect(printed).toBe(4);
    const paid = (city: typeof flat): number =>
      explainCardCityYields(g.state, city)
        .filter((line) => line.card === 'starReaders')
        .reduce((sum, line) => sum + line.science, 0);
    // The scope is the town's doorstep and nothing else — `CityScope`'s
    // `mountainAdjacent` reads the ring of six's own terrain, so the fixture
    // raises a peak next door rather than setting a flag.
    expect(paid(flat)).toBe(0);
    const seat = getTileAt(g.state.map, flat.col, flat.row)!;
    neighborTiles(g.state.map, tileHex(seat))[0]!.terrain = 'mountain';
    bumpRevision(g.state);
    expect(paid(flat)).toBe(printed);
  });

  it('Vineyard Rites pays a plantation and nothing else it works', () => {
    const g = game();
    const city = town(g.state, 0, 6, 6);
    keep(g.state, 0, 'vineyardRites');
    const tile = getTileAt(g.state.map, city.col, city.row + 1)!;
    const paid = (): { food: number; culture: number } | undefined => {
      const line = explainTileYield(tile, yieldContextFor(g.state, 0)).find((entry) =>
        entry.source.includes('Vineyard Rites'),
      );
      return line === undefined ? undefined : { food: line.food, culture: line.culture };
    };
    delete tile.improvement;
    expect(paid()).toBeUndefined();
    tile.improvement = 'farm';
    expect(paid()).toBeUndefined();
    tile.improvement = 'plantation';
    expect(paid()).toEqual({ food: 1, culture: 1 });
  });

  it('Cult of Heroes takes its share of the whole trickle, once, and feeds no family', () => {
    const g = game();
    const city = town(g.state, 0, 6, 6);
    // Something recurring to be a share *of*: a building whose row pays renown.
    const paying = BUILDING_IDS.find((id) => (buildingDef(id).renown?.perTurn ?? 0) > 0)!;
    city.buildings.push(paying);
    bumpRevision(g.state);
    const before = renownPerTurn(g.state, 0);
    expect(before).toBeGreaterThan(0);

    keep(g.state, 0, 'cultOfHeroes');
    const percent = beliefDef('cultOfHeroes').effects.find(
      (effect) => effect.kind === 'cityRenownPercent',
    )!.percent;
    const share = explainRenown(g.state, 0).filter((line) =>
      line.source.includes('Cult of Heroes'),
    );
    expect(share).toHaveLength(1);
    expect(share[0]!.amount).toBe((before * percent) / 100);
    expect(share[0]!.perTurn).toBe(true);
    // **No family**: the pool grows and the feed record that weights the draw
    // does not, which is `resourceRenown`'s construction and the town-scoped
    // share's.
    expect(share[0]!.family).toBeNull();
    expect(renownPerTurn(g.state, 0)).toBe(before + share[0]!.amount);

    // And it is **not** a town's share: `explainCityRenown`'s list is untouched,
    // so the two readings of `cityRenownPercent` never both fire.
    expect(cardCityRenownShares(g.state, city)).toEqual([]);
  });

  it('Cathedrals of the Sky is a line on the temple, so a temple’s share reaches it', () => {
    // The user's mark: *"modify, so that this is affected by temple
    // multipliers"*. The shape that does it is E4a/H17's `cardLinesOnBuilding` —
    // a `cityYields` whose scope **names** the building is folded into that
    // building's own figure, and a `buildingYieldPercent` is then taken over the
    // widened figure rather than over the row alone.
    const g = game();
    const city = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    religion.follower = ['cathedralsOfTheSky'];
    city.followers = { [religion.id]: city.population };
    city.buildings.push('temple');
    bumpRevision(g.state);

    const onIt = cardLinesOnBuilding(g.state, city, 'temple');
    expect(onIt.science).toBe(2);
    expect(onIt.culture).toBe(2);
    // The temple's own row pays faith and nothing else, so what the belief put
    // on it is the whole of the shelf's science.
    expect(buildingDef('temple').science).toBe(0);

    // Banked once as the card's own — this reading is only what a share would be
    // *over*, never a second banking.
    const banked = explainCardCityYields(g.state, city)
      .filter((line) => line.card === 'cathedralsOfTheSky')
      .reduce((sum, line) => sum + line.science + line.culture, 0);
    expect(banked).toBe(4);
    // And a town that does not follow, or has no temple, is not lit at all.
    const bare = town(g.state, 0, 9, 6);
    bumpRevision(g.state);
    expect(cardLinesOnBuilding(g.state, bare, 'temple').science).toBe(0);
  });

  it('Feast Days pays the town once and the temple once, in two ledgers', () => {
    // The double-count guard: a clause moved into a building's ledger must leave
    // the town's.
    const g = game();
    const city = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    religion.follower = ['feastDays'];
    city.followers = { [religion.id]: city.population };
    city.buildings.push('temple');
    bumpRevision(g.state);
    const asTown = cardHappiness(g.state, 0)
      .filter((line) => line.source.includes('Feast Days'))
      .reduce((sum, line) => sum + line.amount, 0);
    const asShelf = buildingHappiness(g.state, 0, cardBuildingHappiness(g.state, 0))
      .filter((line) => line.source.includes('Feast Days'))
      .reduce((sum, line) => sum + line.amount, 0);
    expect(asTown).toBe(1);
    expect(asShelf).toBe(1);
    // The row that pays no happiness of its own is still lit by the card, which
    // is the clause the zero test had to move for.
    expect(buildingDef('temple').happiness ?? 0).toBe(0);
    // And a town with no temple pays the town half alone.
    const noTemple = town(g.state, 0, 9, 6);
    noTemple.followers = { [religion.id]: noTemple.population };
    bumpRevision(g.state);
    expect(
      buildingHappiness(g.state, 0, cardBuildingHappiness(g.state, 0)).some(
        (line) => line.source.includes(noTemple.name) && line.source.includes('Feast Days'),
      ),
    ).toBe(false);
  });

  it('reads Choirs and Tithe Houses off their own rows', () => {
    // Swapped by the pass (culture per four, gold per three). The claim is that
    // each row still pays its own voice at its own step, read from the data.
    const g = game();
    const city = town(g.state, 0, 6, 6);
    city.population = 12;
    const religion = faith(g.state, 0);
    religion.follower = ['choirs', 'titheHouses'];
    city.followers = { [religion.id]: city.population };
    bumpRevision(g.state);
    const step = (id: 'choirs' | 'titheHouses'): number => {
      const effect = beliefDef(id).effects.find((entry) => entry.kind === 'pays');
      return effect !== undefined && effect.kind === 'pays' ? (effect.per ?? 1) : 1;
    };
    expect(step('choirs')).toBe(4);
    expect(step('titheHouses')).toBe(3);
    const paid = (card: string, voice: 'culture' | 'gold'): number =>
      explainCardCityYields(g.state, city)
        .filter((line) => line.card === card)
        .reduce((sum, line) => sum + line[voice], 0);
    expect(paid('choirs', 'culture')).toBe(Math.floor(12 / step('choirs')));
    expect(paid('titheHouses', 'gold')).toBe(Math.floor(12 / step('titheHouses')));
  });

  it('shifts Itinerant Preachers’ reach and Ecclesia’s stones off the data', () => {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    siteAt(g.state, seat, 6, 6);
    religion.holySite = { col: 6, row: 6 };
    const plain = cardPressureRule(g.state, 0, 'cityRange');
    religion.enhancer = ['itinerantPreachers'];
    bumpRevision(g.state);
    expect(cardPressureRule(g.state, 0, 'cityRange') - plain).toBe(5);

    // Ecclesia's second half is a hex line on the stones, and the figure is the
    // row's own.
    religion.enhancer = ['ecclesia'];
    bumpRevision(g.state);
    const stones = getTileAt(g.state.map, 6, 6)!;
    const paid = explainTileYield(stones, yieldContextFor(g.state, 0)).find((line) =>
      line.source.includes('Ecclesia'),
    );
    expect(paid?.faith).toBe(3);
  });
});

/**
 * **The Holy Order, built** (batch B2 — `docs/religion-v2.md` §Deferred, the
 * user's mark of 2026-09-08: *"knights templar: takes the strength of your most
 * powerful available cavalry unit. costs 0.8x the production cost in faith and
 * gain +3 combat strength in cities who follow the religion"*).
 *
 * Four claims and one shape between them: the row is opened by the belief and by
 * nothing else, its strength and its price are both the best horse this empire
 * can raise, and the belief's own strength line reaches it and no other piece.
 */
describe('the Knights Templar', () => {
  /** A founder with a holy site, a town to buy in, and a full faith bank. */
  function order(enhancer: BeliefId[] = ['holyOrder']) {
    const g = game();
    const seat = town(g.state, 0, 6, 6);
    const religion = faith(g.state, 0);
    siteAt(g.state, seat, 6, 6);
    religion.holySite = { col: 6, row: 6 };
    religion.enhancer = enhancer;
    seat.followers = { [religion.id]: seat.population };
    const player = playerById(g.state, 0)!;
    player.faithPool = 5000;
    // A horse the age has taught: The Wheel opens the chariot. Without one the
    // mirror answers `null` and the bank refuses the sale — which is the rule,
    // and is pinned below. (The bench used to pass with no horse at all because
    // the mirror read the cataphract, a row that awaits a technology the tree
    // does not have; that is the clause `mirrorRowFor` gained on landing.)
    learn(g.state, 0, 'theWheel');
    bumpRevision(g.state);
    return { g, seat, religion, player };
  }

  const TEMPLAR: PurchasableItem = { kind: 'unit', id: 'knightsTemplar' };

  it('measures no row that awaits a technology, and sells nothing with no horse taught', () => {
    // The cataphract carries `awaitsTech` and no node gates it, so `isUnlocked`
    // cannot refuse it; the mirror must, or an order called on the first turn
    // would ride out a strength-22 cataphract (found landing batch B2).
    const { g, seat } = order();
    expect(unitDef('cataphract').awaitsTech).toBe(true);
    expect(mirrorRowFor(g.state, 0, 'knightsTemplar')).toBe('chariot');
    // And an empire the age has taught no horse at all has nothing to mirror:
    // the price is null and the bank refuses rather than selling one cheap.
    const bare = playerById(g.state, 0)!;
    bare.techsResearched = bare.techsResearched.filter((id) => id !== 'theWheel');
    bumpRevision(g.state);
    expect(mirrorRowFor(g.state, 0, 'knightsTemplar')).toBeNull();
    expect(purchaseError(g.state, 0, seat.id, TEMPLAR, 'faith')).not.toBeNull();
  });

  it('is opened by the belief and by nothing else — no tree, no queue, no gold', () => {
    // The row carries `unlockedByCard` and no node names it, so `isUnlocked`'s
    // clause is the whole gate: shut for an empire without the belief, open for
    // the founder that holds it. `docs/religion-v2.md` deferred exactly this.
    const shut = order([]);
    expect(isUnlocked(shut.g.state, 0, 'unit', 'knightsTemplar')).toBe(false);
    expect(purchaseError(shut.g.state, 0, shut.seat.id, TEMPLAR, 'faith')).toContain(
      'not open to',
    );

    const open = order();
    expect(isUnlocked(open.g.state, 0, 'unit', 'knightsTemplar')).toBe(true);
    expect(purchaseError(open.g.state, 0, open.seat.id, TEMPLAR, 'faith')).toBeNull();
    // A rival empire holds no such law and is refused, which is the founder-side
    // rule said in the one place it is enforced.
    town(open.g.state, 1, 9, 6);
    const theirs = open.g.state.cities.find((c) => c.ownerId === 1)!;
    expect(purchaseError(open.g.state, 1, theirs.id, TEMPLAR, 'faith')).not.toBeNull();

    // Bought or not at all: the queue refuses it and so does the treasury.
    expect(buildError(open.g.state, 0, 'unit', 'knightsTemplar')).not.toBeNull();
    expect(purchaseError(open.g.state, 0, open.seat.id, TEMPLAR, 'gold')).toContain('faith');
  });

  it('is priced as a share of the best horse this empire could raise', () => {
    const { g, seat } = order();
    const horse = mirrorRowFor(g.state, 0, 'knightsTemplar');
    expect(horse).not.toBeNull();
    const share = unitDef('knightsTemplar').mirrors!.costPercent;
    expect(share).toBe(80);

    const price = explainPurchaseCost(g.state, 0, seat.id, TEMPLAR, 'faith')!;
    const hammers = foldUnitCost(explainUnitCost(g.state, 0, horse!));
    expect(price.currency).toBe('faith');
    expect(price.total).toBe(Math.floor((hammers * share) / 100));
    // Rule 5: the fold **is** the price, and the list says which row it was
    // measured against.
    expect(foldUnitCost(price.lines)).toBe(price.total);
    expect(price.lines[0]!.source).toContain(unitDef(horse!).name);

    // And the price follows the roster: a better horse is a dearer order, with
    // no figure on the row edited.
    learn(g.state, 0, 'militantOrders');
    const later = mirrorRowFor(g.state, 0, 'knightsTemplar')!;
    const dearer = explainPurchaseCost(g.state, 0, seat.id, TEMPLAR, 'faith')!;
    expect(dearer.total).toBe(
      Math.floor((foldUnitCost(explainUnitCost(g.state, 0, later)) * share) / 100),
    );
  });

  it('is stamped as strong as that horse on the day it is called', () => {
    const { g, seat, player } = order();
    const horse = mirrorRowFor(g.state, 0, 'knightsTemplar')!;
    purchaseItemAt(g.state, player, seat, TEMPLAR, 'faith');
    const piece = g.state.units.find((unit) => unit.type === 'knightsTemplar')!;
    // The row's own figure plus its stamp is the horse's, and the stamp is a
    // labelled line rather than a rewritten row (hard rule 5).
    expect(unitDef('knightsTemplar').combatStrength + unitStampStrength(piece)).toBe(
      unitDef(horse).combatStrength,
    );
    expect(isCombatant(unitDef('knightsTemplar'))).toBe(true);

    // **Nothing rewrites it**: a knight researched afterwards does not re-arm the
    // order already in the field, and the next one called is a knight's equal.
    learn(g.state, 0, 'militantOrders');
    const later = mirrorRowFor(g.state, 0, 'knightsTemplar')!;
    expect(unitDef(later).combatStrength).toBeGreaterThan(unitDef(horse).combatStrength);
    expect(unitStampStrength(piece)).toBe(
      unitDef(horse).combatStrength - unitDef('knightsTemplar').combatStrength,
    );
    // The first rides out, so the second has a doorstep to stand on.
    piece.col = seat.col + 3;
    g.state.turn += 1;
    purchaseItemAt(g.state, player, seat, TEMPLAR, 'faith');
    const second = g.state.units.filter((unit) => unit.type === 'knightsTemplar')[1]!;
    expect(unitDef('knightsTemplar').combatStrength + unitStampStrength(second)).toBe(
      unitDef(later).combatStrength,
    );
  });

  it('fights better where the faith is kept, and lends that to nobody else', () => {
    const { g, seat, player } = order();
    purchaseItemAt(g.state, player, seat, TEMPLAR, 'faith');
    const templar = g.state.units.find((unit) => unit.type === 'knightsTemplar')!;
    const ordinary = createUnit(g.state, 0, 'warrior', seat.col, seat.row);
    const home = getTileAt(g.state.map, seat.col, seat.row)!;
    const away = getTileAt(g.state.map, seat.col + 3, seat.row)!;
    const holy = (unit: typeof templar, tile: typeof home): number =>
      cardCombatLines(g.state, {
        unit,
        side: 'attack',
        tile,
        vsBarbarians: false,
        vsCity: false,
        targetHp: 10,
        targetMaxHp: 10,
      })
        .filter((line) => line.source.includes('Holy Order'))
        .reduce((sum, line) => sum + line.amount, 0);
    expect(holy(templar, home)).toBe(3);
    // Out on open ground, where no town keeps the faith: nothing.
    expect(holy(templar, away)).toBe(0);
    // And the line names the row, so the empire's other soldiers are untouched.
    expect(holy(ordinary, home)).toBe(0);
  });
});

// --- the ladder, as the sheets read it --------------------------------------

/**
 * The faith ladder's **reading**, and the free rung the standing stones pay for
 * (`docs/flags.md`, rulings of 2026-09-06 evening, items b and c).
 *
 * Two claims, and neither is about the phase — `openFaithLadder` has its own
 * tests one file up. This is the half the *interfaces* stand on:
 *
 *   1. `explainNextRung` answers the same question the phase answers, in four
 *      states a screen can draw, off the ladder's own figures. A surface that
 *      composed a threshold itself is a surface that will one day quote a price
 *      the pick does not charge.
 *   2. Stonehenge hands over a **god, not an agent**, and the god costs nothing:
 *      the offer opens carrying no `rungCost`, so `settleBeliefChoice` spends no
 *      faith and climbs no rung — which is `PlayerPantheon.rungs`' own rule that
 *      a wonder's god is not a rung, applied rather than restated.
 */
describe('the faith ladder as a reading', () => {
  it('says what the next god costs, what is banked, and how long at this rate', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 10;

    const rung = explainNextRung(g.state, 0, 6);
    expect(rung.kind).toBe('open');
    if (rung.kind !== 'open') throw new Error('unreachable');
    // The ladder's own figure, never a second curve.
    expect(rung.cost).toBe(faithRungCost(player.pantheon.rungs));
    expect(rung.banked).toBe(10);
    expect(rung.rung).toBe(1);
    expect(rung.turns).toBe(Math.ceil((rung.cost - 10) / 6));
    expect(nextRungWords(rung)).toBe(
      `Next god: ${rung.cost} faith · 10 banked · about ${rung.turns} turns`,
    );
  });

  it('says nothing about turns when nothing is gathering, and says so when it is enough', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 4;
    expect(nextRungWords(explainNextRung(g.state, 0, 0))).toBe(
      `Next god: ${faithRungCost(0)} faith · 4 banked`,
    );
    player.faithPool = faithRungCost(0) + 5;
    expect(nextRungWords(explainNextRung(g.state, 0, 3))).toContain('enough is gathered');
  });

  it('names the technology that opens the next place, and calls a full pantheon full', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    // Both of Divination's places filled, with the High Temple still unlearnt:
    // the ladder is not the answer here, the tree is.
    const pool = beliefPool(g.state, player);
    player.pantheon.beliefs.push(pool[0]!, pool[1]!);
    bumpRevision(g.state);
    const shut = explainNextRung(g.state, 0, 5);
    expect(shut).toEqual({ kind: 'closed', tech: 'theHighTemple' });
    expect(nextRungWords(shut)).toBe(`${techDef('theHighTemple').name} opens the next place`);

    // And with every place the tree opens filled, there is nothing left to say
    // but that.
    learn(g.state, 0, 'theHighTemple');
    player.pantheon.beliefs.push(pool[2]!);
    bumpRevision(g.state);
    expect(nextRungWords(explainNextRung(g.state, 0, 5))).toBe('The pantheon is full');
  });

  it('stands aside while a hand is already dealt', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    openPeriodicOffers(g.state);
    expect(player.pantheon.pending).toBeDefined();
    expect(nextRungWords(explainNextRung(g.state, 0, 5))).toBe('A god is waiting to be named');
  });

  it('lists every place the tree will ever open, shut ones included', () => {
    const g = game();
    found(g.state, 0);
    learn(g.state, 0, 'divination');
    const places = pantheonPlaces(g.state, 0);
    expect(places).toHaveLength(3);
    expect(places.filter((place) => place.awaits === null)).toHaveLength(2);
    expect(places[2]).toEqual({ belief: null, awaits: 'theHighTemple' });
  });
});

describe('the standing stones hand over a god, not an agent', () => {
  it('opens a consecration the pick pays nothing for', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 12;

    const realised = realiseItem(g.state, city, { kind: 'building', id: 'stonehenge' });
    expect(realised.grants?.map((grant) => grant.grant)).toEqual(['faithRung']);
    expect(realised.grants?.[0]?.done).toBe(true);

    const offer = player.pantheon.pending!;
    expect(offer.options.length).toBeGreaterThan(0);
    // **No quote, so no charge**: the stones paid, and the bank is untouched.
    expect(offer.rungCost).toBeUndefined();
    const rungs = player.pantheon.rungs;
    dispatch(g, { type: 'chooseBelief', playerId: 0, optionIndex: 0 });
    expect(player.faithPool).toBe(12);
    expect(player.pantheon.rungs).toBe(rungs);
    expect(player.pantheon.beliefs).toHaveLength(1);
    // And no piece was left standing anywhere.
    expect(g.state.units.some((unit) => unit.type === 'augur')).toBe(false);
  });

  it('opens a place with its own slot, and fills it, on a seat with no tree behind it', () => {
    const g = game();
    const city = found(g.state, 0);
    // No Divination at all: the wonder's own `pantheonSlots` line is what opens
    // the place, and `realiseItem` pushes the building **before** it asks for
    // the grants — so the stones raise a place and name it in one beat.
    const realised = realiseItem(g.state, city, { kind: 'building', id: 'stonehenge' });
    expect(realised.grants?.[0]?.done).toBe(true);
    expect(playerById(g.state, 0)!.pantheon.pending).toBeDefined();
  });

  it('says the grant did not land when a hand is already waiting', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'divination');
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    openPeriodicOffers(g.state);
    const dealt = player.pantheon.pending!;
    expect(dealt).toBeDefined();

    // An offer is a decision the seat owes the game, so the one it is holding is
    // kept and the stones report that they named nobody — `doctrineDraft`'s
    // clause, and the reason a second hand is never dealt on top of a first.
    const realised = realiseItem(g.state, city, { kind: 'building', id: 'stonehenge' });
    expect(realised.grants?.[0]?.done).toBe(false);
    expect(player.pantheon.pending).toBe(dealt);
  });

  it('never names the retired agent on the row', () => {
    const grants = buildingDef('stonehenge').onComplete ?? [];
    expect(grants.some((grant) => grant.grant === 'unit')).toBe(false);
  });
});
