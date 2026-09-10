/**
 * **The evaluator** — the one switch on `CardEffect.kind`, and every reader
 * that filters its walk.
 *
 * `liveEffects` is the walk: the eleven sources a seat's law comes out of, folded
 * once and remembered on `state.revision` (`liveReading`). Every reader below
 * filters it and returns a **labelled list**; every consumer folds that list
 * into a breakdown it already had — rule 5 read at the scale of a card. Nothing
 * outside this file switches on `effect.kind`, which is the claim CLAUDE.md
 * makes about `statecraft.ts` and now makes about this file.
 *
 * Split out of `statecraft.ts` in batch E3b (`docs/flags.md` item pp,
 * `docs/audit/evaluations.md` §4b step 9: *files by layer, not by topic*). The
 * words moved to `describers.ts`, the ladder and its offers to `draft.ts`, and
 * `../statecraft.ts` is now an index that re-exports all three — so every
 * `from '../statecraft'` in the tree still resolves and not one line of the
 * evaluation moved. The parity fixtures are the gate.
 */

import {
  bestMeleeFor,
  capitalCityOf,
  cityAt,
  cityResources,
  cityTile,
  controlledResources,
  isCoastalCity,
  nearestOwnedCity,
  ownedTiles,
  realiseItem,
  resourceCopies,
  settleGrowthWindfall,
  spawnTileFor,
  tileOwnerCityId,
  tileOwnerPlayerId,
} from '../cities';
import { queueCategory } from '../yields/town';
import { foldEmpireRates } from '../yields/empire';
import { signedPlain as signed } from '../yieldFormat';
import {
  BUILDING_IDS,
  type BuildingId,
  type ProductionCategory,
  buildingDef,
  buildingPaysVoice,
  isBuildingId,
  isWonder,
} from '../buildingData';
import {
  type Family,
  type GreatPersonId,
  greatPersonDef,
  isGreatPersonId,
} from '../greatPeopleData';
import {
  type ImprovementId,
  improvementDef,
  isGreatPersonWork,
  workForFamily,
} from '../improvementData';
import { type ProjectId, type ProjectPayout } from '../projectData';
import { type Tile, getTileAt, neighborTiles, tileHex, wrappedDistance } from '../map';
import { authorityOf, happinessOf } from '../meters';
import type { ModifierStage } from '../yields/stages';
import {
  RELIGION,
  beliefDef,
  consecrationDef,
  isBeliefId,
  isConsecrationId,
  isRiteId,
  riteDef,
} from '../religionData';
// **A function-level edge back to `religion.ts`**, the documented kind (see this
// module's own docblock and `test/mapgen/moduleCycles.test.ts`): `cityRite` is
// the one reading of "what is this town keeping", it is called from inside
// `cityScopeAdmits` and nowhere at load time, and the alternative — a second
// walk of `City.timed` here — would be two answers to one question, which is
// exactly what the one-evaluator rule exists to prevent.
import { cityRite } from '../religion';
// The same edge, one system over: `settleRenownWindfall` is the one place renown
// is added, called from inside `payWindfallGrants` and never at load time.
import { settleRenownWindfall } from '../renown';
import { type CityYieldKey, type ResourceKind, resourceDef, resourceYield } from '../resourceData';
import { nextFloat } from '../rng';
import { connectedCities } from '../roads';
// A leaf, exactly as `roads.ts` beside it is, and it became one so this line
// could exist: `routeEndsHere` asks whether a caravan's road still describes the
// board, `routeYields.ts` imports this file for the lines a card puts on a
// caravan, and a question two hubs ask lives below both of them (`routes.ts`).
import { routeIsInternational, routeIsLive } from '../routes';
import {
  type City,
  type GameState,
  type Player,
  type Religion,
  type TimedEffect,
  type Unit,
  cityReligion,
  citiesOf,
  followerCount,
  playerById,
  realPlayers,
  slottedOrderCount,
  wondersHeldBy,
} from '../state';
import {
  type ActionRuleId,
  type AmplifierTarget,
  type CardPressureEffect,
  type PressureRuleId,
  type BehaviorRuleId,
  type CardBuildingYieldPercentEffect,
  type CardPeriodicEffect,
  type CardDefBase,
  type CardEffect,
  type CardFlagRuleId,
  type CardCityStatEffect,
  type CardHappinessEffect,
  type CardId,
  type CardLandfallEffect,
  type CardPaysEffect,
  type PayBasis,
  type CardRule,
  type CityRuleId,
  type CityScope,
  type CombatCondition,
  type CombatScale,
  type CountKind,
  type EmpireCondition,
  type MeterRuleId,
  type OfferRuleId,
  type OrderBeadOccasion,
  type RateSource,
  type SlotType,
  type TileCondition,
  type UnitFilter,
  type WindfallOccasion,
  STATECRAFT,
  cardDef,
  doctrineDef,
  governmentDef,
  isDoctrineId,
  isGovernmentId,
  isOrderId,
  orderDef,
} from '../statecraftData';
import { type TerrainId, isWaterTerrain } from '../terrainData';
import { type BeadGrantId, anyBeadDef, isBeadCardId } from '../beadData';
import { isMaliceId, maliceDef } from '../maliceData';
import { beadCapEffects } from '../beads';
import {
  type AbilityId,
  UNIT_UNLOCK_TECH,
  eraNumeral,
  highestAge,
  isTechId,
  techDef,
} from '../techData';
import {
  type ModelClass,
  type UnitStamp,
  type UnitTypeId,
  UNIT_TYPE_IDS,
  isCombatant,
  isExplorer,
  unitDef,
  unitMaxHp,
} from '../unitData';
import { isExploredBy, isVisibleTo } from '../visibility';
import { isCoastal } from '../water';
import { orderAtSlotPosition, settleCultureWindfall, tallyOf } from './draft';
import { tileConditionWords } from './describers';
import { statecraftOf } from './draft';
import { bumpEconomy } from '../slate';

const METER = STATECRAFT.meter;
const RESOURCE_KINDS: readonly ResourceKind[] = ['bonus', 'strategic', 'luxury'];

// --- what is live -----------------------------------------------------------

/** One effect, and the card it came from. The unit of the whole evaluator. */
export interface LiveCardEffect {
  /** Display label — "Order · Silk Roads", "Doctrine · River Kings". */
  source: string;
  card: CardId;
  effect: CardEffect;
}

/** How each class of card names itself on a breakdown line. One table, one voice. */
const CLASS_WORD = {
  government: 'Government',
  doctrine: 'Doctrine',
  order: 'Order',
  belief: 'Belief',
  rite: 'Rite',
  wonder: 'Wonder',
  building: 'Building',
  legacy: 'Legacy',
  religion: 'Religion',
  bead: 'Bead',
  tech: 'Technology',
  /**
   * **The malice** (batch G3, `docs/wager.md` §4) — a card a missed wager seats
   * in one of your own chairs. One word, like every other class, because the
   * whole design of the thing is that it is an Order with a bad face: the Ledger
   * prints "Malice · The Lean Years" beside "Order · Silk Roads" and the reader
   * needs no second vocabulary to know which is which. The *red* is the screen's
   * business; the class is this table's.
   */
  malice: 'Malice',
  /**
   * The Cathedral's patron (Entry LV). It is prefixed with the building's own
   * name on the line — "Cathedral · The Choir Loft" — because a player reading a
   * ledger has to know *which* stones are paying, and "Consecration · The Choir
   * Loft" names the ceremony rather than the thing.
   */
  consecration: 'Cathedral',
} as const;

/**
 * Any card by id, whichever of the **five** classes it is.
 *
 * `cardDef` (`statecraftData.ts`) answers for Statecraft's own three; this one
 * also answers for a pantheon belief and an augur's rite, which are written in
 * this vocabulary and read by this evaluator (ledger Entry XXVIII). It lives
 * here rather than down in the data module for one reason and it is worth
 * stating: the import between `statecraftData.ts` and `religionData.ts` is
 * **type-only in both directions**, which is what keeps a type cycle from
 * becoming a runtime one, and a lookup is a value.
 *
 * A raw id nothing knows is a hand-edited save, and it gets a card-shaped
 * nothing rather than a throw — a breakdown line is not the place to take a
 * whole frame down.
 *
 * **The cascade is walked once per id, ever** (batch 10 of
 * `docs/bot-priorities.md`). Every arm below is a question about the *tables*,
 * which are frozen at module load, so the answer for an id cannot change inside
 * a game — and the cascade was measured at a ninth of a late turn on its own,
 * because four of the ten arms are `hasOwnProperty` probes into four different
 * data tables and the evaluator asks them once per effect it pushes. The first
 * ask walks the arms and the rest read `CARD_DEFS`. Nothing else changes: the
 * arms are in the same order, so an id in two id spaces resolves to the same
 * class it always did.
 *
 * The one thing this asks of a caller: **the answer is shared, so do not write
 * to it.** Four of the arms used to hand back a freshly built object (a bead, a
 * great person, a technology, a building adapted into the card shape); they now
 * hand back the same one every time, and every reader in the game treats a card
 * def as the row it came from — read-only — which is why the adaptation is worth
 * doing once instead of per line.
 */
const CARD_DEFS = new Map<CardId, CardDefBase>();

export function anyCardDef(id: CardId): CardDefBase {
  const known = CARD_DEFS.get(id);
  if (known !== undefined) return known;
  const def = readCardDef(id);
  CARD_DEFS.set(id, def);
  return def;
}

/** `anyCardDef`'s cascade, walked once per id. See the docblock above. */
function readCardDef(id: CardId): CardDefBase {
  if (isBeliefId(id)) return beliefDef(id);
  if (isRiteId(id)) return riteDef(id);
  // The **tenth** class (Entry LV): a cathedral's patron. It is already a
  // `CardDefBase` on its row, so there is nothing to adapt — the arm exists so
  // that a breakdown line carrying a consecration id resolves to a name and a
  // `describeCard` like every other line, which is the whole reason `CardId` is
  // one id space.
  if (isConsecrationId(id)) return consecrationDef(id);
  if (isOrderId(id) || isDoctrineId(id) || isGovernmentId(id)) return cardDef(id);
  // The **eleventh** class (batch G3): a malice. It is already written in this
  // vocabulary on its own row, so the adaptation is one field — the row's `note`
  // is its plain-words sentence, exactly as a technology's is — and the arm
  // exists so that a breakdown line carrying a malice id resolves to a name and
  // a `describeCard` like every other line.
  if (isMaliceId(id)) {
    const def = maliceDef(id);
    return { name: def.name, flavor: def.flavor, effects: def.effects, note: def.note };
  }
  // The **seventh** class, and the one that walks: a great person's legacy is a
  // list of effects in this vocabulary on a row of another table
  // (`greatPeopleData.ts`), adapted into the card shape here rather than copied
  // into a second table that could disagree with it. Asked *before* the building
  // arm below, because the two id spaces are disjoint and the cheaper guard
  // should not have to prove it. A row with an **empty** legacy is a name whose
  // ratified text needs a shape that does not exist yet; it answers a
  // card-shaped nothing, which is exactly what it is worth to this evaluator.
  // The **eighth** class (the Bead Race): a bead's boon may carry a cap, and the
  // row is adapted into the card shape here for the great person's reason
  // exactly — one lookup, one label, one `describeCard`, rather than a parallel
  // evaluator for a fourth table. Asked before the building arm for its reason:
  // the id spaces are disjoint and the cheaper guard should not have to prove it.
  if (isBeadCardId(id)) {
    const { def } = anyBeadDef(id);
    const boon = 'boon' in def ? def.boon : undefined;
    return {
      name: def.name,
      flavor: 'flavor' in def ? def.flavor : '',
      effects: boon?.effects ?? [],
      deferred: def.deferred,
    };
  }
  if (isGreatPersonId(id)) {
    const def = greatPersonDef(id);
    return { name: def.name, flavor: def.epigram, effects: def.legacy, deferred: def.deferred };
  }
  // The **ninth** class (the tree pass of 2026-08-30): a technology's row may
  // carry effects in this vocabulary, and it is adapted here for the great
  // person's reason exactly — one lookup, one label, one `describeCard`, rather
  // than a parallel evaluator for a fifth table. Asked before the building arm
  // because the id spaces are disjoint and the cheaper guard should not have to
  // prove it. A node with no effects answers a card-shaped nothing, which is
  // what every ordinary technology is worth to this evaluator.
  if (isTechId(id)) {
    const def = techDef(id);
    return {
      name: def.name,
      flavor: def.flavor ?? '',
      effects: def.effects ?? [],
      deferred: def.deferred,
      note: def.note,
    };
  }
  // The sixth class, and the one whose table is not a card table at all: a
  // wonder's effects sit on its **building** row (`BuildingDef.effects`), so the
  // row is adapted into the card shape here rather than copied into a second
  // table that could disagree with it. An ordinary building has no effects and
  // answers an empty card, which is exactly what it is worth to this evaluator.
  if (isBuildingId(id)) {
    const def = buildingDef(id);
    // `deferred` and `note` come across with the effects, because they are the
    // same convention: a wonder whose ratified text needs a shape the vocabulary
    // lacks says so on its row exactly as a great person or an Order does, and
    // `describeCard` prints all three the same way for all seven classes.
    return {
      name: def.name,
      flavor: '',
      effects: def.effects ?? [],
      deferred: def.deferred,
      note: def.note,
    };
  }
  return { name: String(id), flavor: '', effects: [] };
}

/**
 * The recursion cut for `conditionRule`. See the module docblock: while an
 * empire condition is being evaluated, gated effects contribute nothing, so a
 * condition that asks about a meter cannot ask about itself.
 */
let conditionDepth = 0;

/**
 * The recursion cut for `CountKind`'s `empireYield`, and `conditionDepth`'s idiom
 * one question over: while this empire's books are being folded, a count that
 * asks what the books say answers nothing.
 *
 * `foldEmpireRates` prices every town, a town's price folds its cards, and a
 * card written on the empire's own science would otherwise ask for the answer it
 * is helping to compute. The cut is stated on the count and pinned by a fixture.
 */
let rateDepth = 0;

/**
 * The recursion cut for `CountKind`'s `authoritySurplus` — `rateDepth`'s idiom
 * one meter over.
 *
 * `explainAuthority` folds the cards that legislate capacity, and a card written
 * on the writ it is itself widening would otherwise ask for the answer it is
 * helping to compute. While the meter is being folded, the count answers nothing.
 * The cut is stated on the count and pinned by a fixture.
 */
let meterDepth = 0;

/** Which line of the empire's books each voice is read off. `empireYield`'s. */
const RATE_OF_VOICE: Record<CityYieldKey, keyof EmpireRates> = {
  food: 'foodPerTurn',
  production: 'productionPerTurn',
  gold: 'goldPerTurn',
  science: 'sciencePerTurn',
  culture: 'culturePerTurn',
  faith: 'faithPerTurn',
};

/**
 * What `liveEffects` last answered for one seat.
 *
 * Nothing here describes *when* the answer stops being true — that is the
 * board's business now, and `LiveSlate` below carries it for every seat at once.
 */
interface LiveReading {
  list: LiveCardEffect[];
  /** `effectsOfKind`'s narrowings of `list`, cut on first ask. */
  byKind: Map<string, readonly LiveCardEffect[]>;
}

/**
 * One board's remembered law, thrown away whole the moment the revision moves.
 *
 * Keyed `playerId * 2 + cut`, because there are two readings of one seat and
 * they differ: at `conditionDepth > 0` every gated clause contributes nothing
 * (the module docblock's cut), so an empire being *asked about* has a shorter
 * law than the same empire being paid. Two slots, never mixed.
 */
interface LiveSlate {
  revision: number;
  bySeat: Map<number, LiveReading>;
}

/**
 * The memo, and the reason it is a `WeakMap` on the state rather than a field of
 * it: **`snapshotState` is `JSON.stringify(state)`**, so anything hung on
 * `GameState` is in every save hash and every replay comparison in the suite. A
 * cache that changed a snapshot would not be a cache, it would be a rule. It is
 * `readings.ts`' bargain, one file over, and now its key as well.
 *
 * A restored state is a different object and starts with nothing remembered,
 * which is right: a memo that survived `restoreState` would be a memo of another
 * game.
 */
const LIVE_MEMO = new WeakMap<GameState, LiveSlate>();

/**
 * The remembered walk for one seat — **the** entry point, and the only thing in
 * the file that calls `buildLiveEffects`.
 *
 * Batch 10 of `docs/bot-priorities.md` measured 115,000–179,000 walks a turn at
 * t95 for at most two distinct answers per instant, which is what a memo is for.
 *
 * **Why there used to be a print.** Until batch E3a this memo was trusted on two
 * conditions checked per ask: `livePrint` read every input the walk reads —
 * turn, government, doctrines, slots, beliefs, one-of-a-kind buildings,
 * legacies, timed effects, beads, technologies, held religions — again as
 * values, position by position; and `gatesAgree` re-asked every empire condition
 * the build had consulted, because a gate reads a meter and a meter reads the
 * board, so no print of the walk's own inputs could stand in for one. The reason
 * was stated in its own docblock: *nothing in the simulation announces a
 * mutation*, and a counter somebody forgot to bump is a wrong yield rather than
 * a slow one. It was a fifth of what the evaluator cost (`docs/bot-priorities.md`
 * §batch 10), and it was O(everything the seat holds) on every one of the 54
 * `effectsOfKind` sites' asks (`docs/audit/evaluations.md` §3c).
 *
 * **Why it is gone.** Batch E2 gave the simulation the announcement it lacked:
 * `GameState.revision`, raised by `applyCommand` after every accepted command
 * and once by `runEndOfTurn` after each phase — the two ways the world moves at
 * all. So the key is `(state identity, state.revision, seat)`, the same two
 * integers and one object every other memo in the game uses (`readings.ts`,
 * `cardImpactSheet`, the Reliquary), and the gates come free: a meter that moved
 * moved because the board moved, and a board that moved raised the revision.
 *
 * **The contract, stated once and stated here.** *A reading is taken at rest;
 * whoever moves the state moves the revision.* Inside a command handler or
 * inside a phase the world is halfway moved and nothing here is asked from in
 * there. A caller that mutates the state by hand — a bench, a fixture — is a
 * writer, and calls `bumpRevision` the way a command does; `test/sim/benches.test.ts`
 * is the lint that says so, and the twenty-seven files E2 measured are why it
 * exists.
 */
function liveReading(state: GameState, playerId: number): LiveReading {
  let slate = LIVE_MEMO.get(state);
  if (slate === undefined || slate.revision !== state.revision) {
    slate = { revision: state.revision, bySeat: new Map<number, LiveReading>() };
    LIVE_MEMO.set(state, slate);
  }
  const key = playerId * 2 + (conditionDepth > 0 ? 1 : 0);
  const held = slate.bySeat.get(key);
  if (held !== undefined) return held;
  const fresh: LiveReading = { list: buildLiveEffects(state, playerId), byKind: new Map() };
  slate.bySeat.set(key, fresh);
  return fresh;
}

/**
 * **Throws this board's remembered law away, inside one beat of the world.**
 *
 * The counter is the announcement a *reader at rest* subscribes to, and the
 * whole of `liveReading`'s contract is stated over there: a command bumps it
 * once when it is finished, a phase once when it is done, and nothing else is
 * asked in between. This is the register of the places where that is not true —
 * where the simulation changes the law it is about to read in the same call —
 * and there are four:
 *
 *   · **`realiseItem` (`cities.ts`) putting a building in a town.** The stones
 *     go up *before* the row's completion grants are asked for, deliberately
 *     (see its own comment: a wonder hands over what it hands over because it
 *     now stands), and a wonder is the fifth source of this walk — so Stonehenge
 *     opening a place in the pantheon is the law reading a building raised three
 *     lines above it.
 *   · **`applyChooseDoctrine`, `applySlotOrder`, `applyAdoptGovernment`
 *     (`commands.ts`)** — a Doctrine taken, an Order slotted, a government
 *     adopted, each a source of this walk, each followed in the same command by
 *     a grant whose settlement reads it (`payMomentGrants` →
 *     `settleRenownWindfall` → `hasAbility`, which asks the cards since batch
 *     B1). Found by the replay test: a slate warmed before the command — by the
 *     bot's appraisal in the live game and by nobody in the replay — answered
 *     for the law as it was, and the two boards parted.
 *
 * It drops the slate rather than raising `GameState.revision` for one reason and
 * it is not taste: the revision is a **serialised field**, in every save hash
 * and every replay comparison in the suite, so a bump here would move the
 * canonical print of every board that ever finished a building. A cache-drop
 * moves nothing at all — which is what a cache is allowed to do.
 *
 * A new seam that changes a seat's holdings and then reads them **in the same
 * call** joins this register. One that merely changes them needs nothing: the
 * command or the phase it sits in announces it on the way out.
 */
export function forgetTheLaw(state: GameState): void {
  LIVE_MEMO.delete(state);
}

/**
 * Every effect currently reaching this empire, in one fixed order: the
 * government's signature, then its Doctrines in the order they were taken, then
 * the slotted Orders in **slot order**, then the malices seated among them
 * (batch G3 — beside the chairs, for the reason the source itself states), then
 * the pantheon's beliefs, then the
 * wonders this empire's cities hold, then the legacies of the great people it
 * has spent, then what it is carrying that runs out, then the caps its beads
 * pay, then **the technologies it holds** (the tenth source, the tree pass of
 * 2026-08-30 — a node's gift is sometimes a rule), then the religions whose holy
 * city it holds.
 *
 * **The** walk. Every reader below filters this and none of them repeats the
 * gating or the ordering — which is how "one evaluator" stays
 * true as the table grows. Slot order rather than collection order because a
 * slot is a position the player arranged, and a ledger that reordered itself
 * when a card was re-slotted would be a ledger that looks wrong for no reason.
 *
 * `conditionRule` is flattened *here*, so no reader ever sees one: a gated
 * clause either contributes its inner effects or contributes nothing, and it
 * carries its parent card's label either way.
 *
 * **The list is shared, and it is not yours to write to.** Since batch 10 it is
 * remembered per state and per seat (`liveReading`), so two readers a
 * microsecond apart get the same array rather than two builds of it; the type
 * says `readonly` because that is the only thing keeping the memo honest.
 */
export function liveEffects(state: GameState, playerId: number): readonly LiveCardEffect[] {
  return liveReading(state, playerId).list;
}

/**
 * The walk itself, once. Everything above this line is the memo's bookkeeping;
 * everything below it is the eleven sources, in the order the docblock names them.
 *
 * It keeps no notebook. Until batch E3a it threaded an `asked` record of every
 * empire condition it consulted out to `liveReading`, which re-asked exactly
 * those before trusting a remembered list; the revision answers that question
 * now, because a gate reads a meter, a meter reads the board, and a board that
 * moved raised the counter.
 */
function buildLiveEffects(state: GameState, playerId: number): LiveCardEffect[] {
  const sc = statecraftOf(state, playerId);
  if (!sc) return [];
  const list: LiveCardEffect[] = [];

  const push = (card: CardId, word: string, effects: readonly CardEffect[]): void => {
    pushEffects(state, playerId, list, card, word, effects, push);
  };

  push(sc.government, CLASS_WORD.government, governmentDef(sc.government).effects);
  for (const id of sc.doctrines) {
    if (!isDoctrineId(id)) continue;
    push(id, CLASS_WORD.doctrine, doctrineDef(id).effects);
  }
  for (const slot of sc.slots) {
    if (!slot || !isOrderId(slot.card)) continue;
    // **The row, and nothing but the row** (the levelling ruling of 2026-09-04).
    // There is no expansion point any more: a slotted Order's face is what its
    // data row prints, in this empire and in every other. What used to stand
    // here — the printed effects plus one copy of an authored increment per
    // level — is gone with the ladder, and so is the only line in the whole
    // evaluator that knew a holding could differ from a card.
    push(slot.card, CLASS_WORD.order, orderDef(slot.card).effects);
  }
  // **The eleventh source** (batch G3, `docs/wager.md` §4): the malices a missed
  // wager seated in this realm's chairs. Read off `Player.malices` in seating
  // order, which is the order they were dealt.
  //
  // It is here, immediately after the Orders and not at the foot of the walk
  // where every later source was added, and that is the one place this file
  // departs from "each source last in turn". The reason is the chairs: a malice
  // *occupies* one, the ledger beside it is a column of chairs, and a line
  // printed forty rows below the council it sits in would divorce the punishment
  // from the thing it costs. The order still never reshuffles itself — a malice
  // arrives at a judgement and leaves at one, and nothing moves it in between.
  const holder = playerById(state, playerId);
  for (const held of holder?.malices ?? []) {
    if (!isMaliceId(held.id)) continue;
    push(held.id, CLASS_WORD.malice, maliceDef(held.id).effects);
  }
  // **The fourth source** (ledger Entry XXVIII), and the whole of what religion
  // adds to this walk: a pantheon belief is a card of this vocabulary, held
  // permanently and empire-wide, and it joins the list rather than forking the
  // evaluator. Last, after the law, because that is the order they were built
  // in and an order that reshuffled itself would reorder every ledger.
  const pantheon = playerById(state, playerId)?.pantheon;
  for (const id of pantheon?.beliefs ?? []) {
    if (!isBeliefId(id)) continue;
    push(id, CLASS_WORD.belief, beliefDef(id).effects);
  }
  // **The fifth source** (the wonders framework, 2026-08-27): the wonders
  // standing in this empire's cities. Last, after the law and the gods, for the
  // reason the beliefs are last — the order they were built in, so no ledger
  // reshuffles itself.
  //
  // Asked of the **board** rather than of `state.wonders`, and that is the whole
  // of how a captured wonder changes sides: the claim register records who first
  // raised it and never moves, while the effects follow the city's `buildings`
  // list, so a conqueror inherits the walls, the granary and the Oracle together
  // — the same reading `City.timed` takes of a rite performed on a place.
  //
  // **A capstone is read from here too** (Entry LVIII, the endgame): a
  // `oncePerEmpire` row — the Magnum Opus and the three great works of the
  // Observatory — is one per *realm* exactly as a wonder is one per world, so
  // reading it from the empire's walk counts it once and its clauses may say
  // "every soldier you have" without being a granary's effect counted once per
  // granary. That is the whole of `cityBuildingEffects`' argument, answered at
  // one scale out; the two walks skip each other's rows, so nothing is read
  // twice.
  //
  // The guard is the empty register **or** a table that has any such row in it:
  // the walk is several per city per turn, and in a game where nobody has
  // finished anything one of a kind there is nothing here to sweep for.
  if (state.wonders.length > 0 || ONE_OF_A_KIND) {
    for (const city of state.cities) {
      if (city.ownerId !== playerId) continue;
      for (const id of city.buildings) {
        if (!oneOfAKind(id)) continue;
        push(id, isWonder(id) ? CLASS_WORD.wonder : CLASS_WORD.building, buildingDef(id).effects ?? []);
      }
    }
  }
  // **The sixth source** (`docs/great-people.md`): the legacies of every great
  // person this empire has spent — *they served you; their legacy remains*.
  // Last, after the law, the gods and the stones, for the reason each of those
  // is last in turn: it is the order they were acquired in, so no ledger
  // reshuffles itself.
  //
  // Read off `Player.legacies` and nowhere else. A person is on the board and
  // spent, or it is a line here — and, since the 2026-08-28 ruling, a **revoked**
  // record is a third state that contributes nothing. That is *one filter*, on
  // this line, and it is the whole of the revocation mechanism on the reading
  // side: the record stays in spend order, history is never spliced, and
  // Hypatia's "lost the first turn your happiness goes negative" is a rule with
  // a place rather than a sentence struck through on a card.
  for (const held of playerById(state, playerId)?.legacies ?? []) {
    if (held.revoked === true) continue;
    if (!isGreatPersonId(held.id)) continue;
    push(held.id, CLASS_WORD.legacy, greatPersonDef(held.id).legacy);
  }
  // **The eighth source**: what the empire itself is carrying that runs out —
  // Crassus' bill. `City.timed` and `Unit.timed`'s third holder, read through
  // the same `timedLive` walk, so an effect hung on a realm is an ordinary card
  // effect in every ledger it reaches. It is *here* rather than in
  // `liveCityEffects` because its subject is the realm: a town's rites are a
  // fact about a town and this is a fact about everybody.
  const seat = playerById(state, playerId);
  if (seat?.timed !== undefined) list.push(...timedLive(state, playerId, seat));
  // **The ninth source** (the Bead Race, design ledger Entry VI): the *caps* a
  // bead's boon granted — a permanent step in contentment, in authority
  // capacity, in route capacity. Read off `Player.beads` every time rather than
  // settled once when the bead was earned, which is what keeps a bead's cap an
  // ordinary card effect in every ledger it reaches instead of a number
  // somebody added to a meter. `beadCapEffects` answers `[]` for the
  // overwhelmingly common seat holding no bead that pays one.
  //
  // Last, after the law, the gods, the stones, the dead and the bill, for the
  // reason each of those is last in turn: it is the order they were acquired
  // in, so no ledger reshuffles itself. A bead is `CardId`'s eighth class and
  // is adapted here rather than in `anyCardDef` — a bead is not drafted and not
  // slotted; like every card since 2026-09-04 it is exactly what its row says.
  if (seat) {
    for (const held of beadCapEffects(seat)) {
      for (const effect of held.effects) {
        if (effect.kind === 'conditionRule') continue;
        list.push({ source: `${CLASS_WORD.bead} · ${held.name}`, card: held.id, effect });
      }
    }
  }
  // **The tenth source** (the tree pass of 2026-08-30): *the technologies you
  // hold*. A node's gift is sometimes a rule rather than a thing — the fallen
  // become verse, a seized town costs one authority less, settlers come
  // cheaper — and a technology is the most permanent card in the game: never
  // drafted, never slotted, never lost — and, like every card since 2026-09-04,
  // exactly what its row says.
  //
  // Walked in `techsResearched` order, which is the order they were learnt, so
  // no ledger reshuffles itself. The overwhelming majority of rows carry
  // nothing, and the `effects` guard is what keeps this a cheap walk in a game
  // where an empire ends holding fifty of them.
  for (const id of playerById(state, playerId)?.techsResearched ?? []) {
    if (!isTechId(id)) continue;
    const effects = techDef(id).effects;
    if (effects === undefined || effects.length === 0) continue;
    push(id, CLASS_WORD.tech, effects);
  }
  // **The seventh source** (`docs/religion-v2.md`, corrected by the user's
  // ruling of 2026-08-28): every religion whose **holy city this empire holds**.
  // Two things arrive together and they are two readings of one fact — that a
  // faith's seat is yours:
  //
  //   · its **enhancer** beliefs, pushed plainly, because they are ordinary
  //     cards of this vocabulary held by whoever holds the stones;
  //   · the **founder's trickle**, the standing payment for the followers it has
  //     in the world, written as data (`religion.json`) rather than as a rule so
  //     that doubling it is a card and not a branch.
  //
  // What is deliberately **not** here any more is the follower half. A follower
  // belief is city-local: it applies in every town that follows, to whoever owns
  // that town, and it reaches those towns through `liveCityEffects`. The fold
  // that used to sum it to the founder is gone rather than reworded, because a
  // fold and a city source would have been two answers to one question.
  //
  // Usually one religion, and a loop rather than a lookup because a conqueror
  // who takes a rival's holy city holds two — his own and the one he seized.
  // Walked in `state.religions` order, which is founding order, so no ledger
  // reshuffles itself.
  //
  // Last, after the law, the gods, the stones and the dead, for the reason each
  // of those is last in turn: it is the order they were acquired in.
  for (const mine of heldReligions(state, playerId)) {
    const word = `${CLASS_WORD.religion} · ${mine.name}`;
    for (const id of mine.enhancer) {
      if (!isBeliefId(id)) continue;
      push(id, CLASS_WORD.belief, beliefDef(id).effects);
    }
    // The amplifier is read off the list **already built** rather than through
    // `cardAmplifier`, and that is not an optimisation: `cardAmplifier` asks
    // `liveEffects`, and asking it from inside itself is a stack overflow. By
    // this line every other source has been pushed, including the enhancer that
    // carries Apostles, so the reading is complete without re-entering.
    let amplifier = 0;
    for (const entry of list) {
      if (entry.effect.kind !== 'effectAmplifier') continue;
      if (entry.effect.target !== 'founderTrickle') continue;
      amplifier += (entry.effect.percent ?? 0);
    }
    for (const effect of RELIGION.founderTrickle) {
      list.push({
        source: word,
        card: mine.enhancer[0] ?? mine.follower[0] ?? sc.government,
        effect: amplifyTrickle(effect, amplifier),
      });
    }
  }
  return list;
}

/**
 * Who a religion pays — **the owner of its holy city**, derived from the board
 * every time it is asked (user's ruling, 2026-08-28).
 *
 * The holy city is the town whose territory holds the hex the religion's *first*
 * holy site went up on (`Religion.holySite`). So the founder's trickle and the
 * enhancer beliefs follow the stones exactly as a wonder's effects follow the
 * city that holds it: **take a rival's holy city and you take what his faith
 * pays**, with no bookkeeping and nothing to transfer. `Religion.founderId` is
 * the history of who first raised it and never moves.
 *
 * Three ways the derivation falls back to `founderId`, and they are one rule
 * rather than three cases — *if there are no stones standing on owned ground,
 * the historical founder is paid*: the religion predates schema 29 and recorded
 * no hex, the site was **pillaged** (or chopped, or otherwise removed), or the
 * ground it stands on belongs to nobody (the holy city was razed and the borders
 * went with it). None of the three leaves a faith paying nobody, which would be
 * a trickle silently switched off.
 *
 * Derived and never stored, for `cityReligion`'s reason and `barbarianRoles`':
 * a stored payee is a second answer, and the first thing it does is disagree
 * with the map the turn a city changes hands.
 */
export function religionFounder(state: GameState, religion: Religion): number {
  const seat = religion.holySite;
  if (seat === undefined) return religion.founderId;
  const tile = getTileAt(state.map, seat.col, seat.row);
  if (!tile || tile.improvement !== HOLY_SITE) return religion.founderId;
  const owner = tileOwnerPlayerId(state, seat.col, seat.row);
  return owner === null ? religion.founderId : owner;
}

/**
 * The improvement a prophet plants, read off the improvement table's own
 * inverse rather than spelled here — `religion.ts` keeps the same constant by
 * the same call, and nothing in the simulation compares against `"holySite"`.
 */
const HOLY_SITE: ImprovementId = workForFamily('prophet') ?? 'holySite';

/**
 * The religions **this empire is paid by**: the ones whose holy city it holds.
 *
 * `foundedReligion`'s replacement everywhere the question is "what does my faith
 * pay me", and deliberately *not* its replacement where the question is "have I
 * founded one" — that is still a fact about history and still asks
 * `foundedReligion` (the gate on founding twice, the prophet's verbs).
 *
 * A list because a conqueror may hold two. Founding order, which `state.religions`
 * carries.
 */
export function heldReligions(state: GameState, playerId: number): Religion[] {
  const out: Religion[] = [];
  for (const religion of state.religions) {
    if (religionFounder(state, religion) === playerId) out.push(religion);
  }
  return out;
}

/**
 * The founder's trickle with Apostles folded in — **before anything is banked**,
 * which is `windfallPayout`'s discipline applied to a standing payment.
 *
 * It reaches the one figure a trickle row has (`pays` count's payout) and
 * nothing else, so a card that doubles what your followers pay you cannot
 * silently double a rule or a range. Zero amplification returns the row
 * untouched, so a game where nobody holds Apostles folds byte-identically to one
 * from before the card existed.
 */
function amplifyTrickle(effect: CardEffect, percent: number): CardEffect {
  if (percent === 0 || effect.kind !== 'pays' || effect.basis !== 'count') return effect;
  // A percentage payout carries `stage` and no `amount` — a figure this cannot
  // reach, and the one payout form the trickle was never written about.
  if (effect.stage !== undefined || effect.amount === undefined) return effect;
  // Exact since batch X: half again on a one-point trickle is a point and a half.
  return { ...effect, amount: (effect.amount * (100 + percent)) / 100 };
}

/**
 * What one religion's **follower** beliefs put into one town, as ordinary
 * city-scoped effects.
 *
 * The user's ruling of 2026-08-28 in one function, and it is Civ V's split said
 * plainly: a follower belief applies **city-locally**, in every city that
 * follows the faith, to whoever owns that city. A rival's faith in your town is
 * a bonus you did not choose, not a wound — which is what removes every reason
 * for religious war.
 *
 * There is no fold here and there is deliberately nothing clever. The belief's
 * clauses are pushed **as written**, through the same `pushEffects` walk every
 * other card takes, into the live list of the town in hand; every reader that
 * goes through `liveCityEffects` then reads them exactly as it reads a
 * Doctrine's or a wonder's. The fold this replaced (`followerBeliefLines`, which
 * turned "in every city that follows" into one empire-scale line for the
 * founder) is **deleted rather than reworded**: two ways of reading one belief
 * would have been two answers, and the first thing they would have done is
 * disagree the turn a following city changed hands.
 *
 * Which religion's beliefs is `cityReligion(city)` — the strict majority of the
 * citizens, derived — so a town that turns this turn pays its new faith's
 * beliefs this turn (`spreadReligion` sits before `collectYields` for exactly
 * that).
 *
 * The label carries the religion's name, so a city panel reading
 * "Religion · the Grain Cult · Feast Days" says whose faith is paying and what
 * for, even when the faith is somebody else's.
 */
export function followerBeliefEffects(state: GameState, city: City): LiveCardEffect[] {
  const followed = cityReligion(city);
  if (followed === null) return [];
  const religion = state.religions[followed];
  if (!religion) return [];
  const list: LiveCardEffect[] = [];
  const word = `${CLASS_WORD.religion} \u00b7 ${religion.name}`;
  const push = (card: CardId, label: string, effects: readonly CardEffect[]): void => {
    pushEffects(state, city.ownerId, list, card, label, effects, push);
  };
  for (const id of religion.follower) {
    if (!isBeliefId(id)) continue;
    push(id, word, beliefDef(id).effects);
  }
  return list;
}


/**
 * The recursion-safe walk one card's effects take into a live list.
 *
 * Extracted out of `liveEffects` so the **timed** sources can take exactly the
 * same walk — the `conditionRule` flattening, the label, the cut — instead of a
 * second one that could disagree about any of the three. `recur` is the caller's
 * own push, so a nested clause carries the parent's word.
 *
 * One walk for all three callers, and since batch E3a there is nothing else to
 * say: the notebook of gates it used to keep for `liveReading`'s benefit went
 * with the print it served.
 */
function pushEffects(
  state: GameState,
  playerId: number,
  list: LiveCardEffect[],
  card: CardId,
  word: string,
  effects: readonly CardEffect[],
  recur: (card: CardId, word: string, effects: readonly CardEffect[]) => void,
): void {
  // One line for the whole card, built once: every effect of one card carries
  // the identical label, and this used to be a template and an `anyCardDef` per
  // effect — a ninth of a late turn between them (batch 10).
  let source: string | undefined;
  for (const effect of effects) {
    if (effect.kind === 'conditionRule') {
      // The cut. Inside a condition's own evaluation every gate is closed, so
      // a meter that counts cards cannot count a card that asks about it.
      if (conditionDepth > 0) continue;
      if (!askCondition(state, playerId, effect.when)) continue;
      recur(card, word, effect.then);
      continue;
    }
    source ??= `${word} · ${anyCardDef(card).name}`;
    list.push({ source, card, effect });
  }
}

/**
 * One empire condition, asked under the cut.
 *
 * **The** place `conditionDepth` is raised, so the memo's re-ask and the walk's
 * first ask are the same question asked the same way — a second `try/finally`
 * somewhere else is a second reading of the module docblock's one rule.
 */
function askCondition(state: GameState, playerId: number, when: EmpireCondition): boolean {
  conditionDepth += 1;
  try {
    return empireConditionHolds(state, playerId, when);
  } finally {
    conditionDepth -= 1;
  }
}

/**
 * Is this timed effect still running? **The** reading, and it is a comparison.
 *
 * See `TimedEffect` (`state.ts`): an expiry is an absolute turn and nothing ever
 * ticks anything. Everything that shows or folds a rite asks this, so a swept
 * list and an unswept one are the same game.
 */
export function timedEffectIsLive(state: GameState, timed: TimedEffect): boolean {
  return state.turn < timed.expiresTurn;
}

/** How many turns a rite has left, for the label. Never negative. */
export function timedTurnsLeft(state: GameState, timed: TimedEffect): number {
  return Math.max(0, timed.expiresTurn - state.turn);
}

/**
 * The live effects a holder's own rites contribute, labelled with what they are
 * and how long they have left.
 *
 * `playerId` is whose empire the conditions are asked of — the *holder's owner*,
 * not the augur who performed the rite: a captured city's Omen Reading pays its
 * new owner (see `City.timed`).
 */
function timedLive(
  state: GameState,
  playerId: number,
  holder: { timed?: TimedEffect[] },
): LiveCardEffect[] {
  const timed = holder.timed;
  if (!timed || timed.length === 0) return [];
  const list: LiveCardEffect[] = [];
  for (const entry of timed) {
    if (!timedEffectIsLive(state, entry)) continue;
    // Which *kind* of blessing this is, asked of the id: an augur's rite and a
    // great person's parting gift both hang on a town or a piece by exactly the
    // same mechanism, and the only thing that differs is what to call it. One
    // question, in the one place the label is written.
    const kind = isGreatPersonId(entry.card) ? CLASS_WORD.legacy : CLASS_WORD.rite;
    const word = `${kind} · ${anyCardDef(entry.card).name} (${timedTurnsLeft(
      state,
      entry,
    )} turns left)`;
    // The label is already whole, so the walk is handed a word that produces it:
    // `pushEffects` writes `word · name`, and a rite's name is in the word.
    const push = (card: CardId, _word: string, effects: readonly CardEffect[]): void => {
      for (const nested of effects) {
        if (nested.kind === 'conditionRule') {
          pushEffects(state, playerId, list, card, _word, [nested], push);
          continue;
        }
        list.push({ source: word, card, effect: nested });
      }
    };
    push(entry.card, word, [entry.effect]);
  }
  return list;
}

/**
 * Every effect reaching **this city**: its empire's cards (which since the
 * wonders framework include the wonders standing anywhere in the empire — see
 * `liveEffects`, whose fifth source they are), then its own live rites.
 *
 * A wonder's *city-scoped* clause needs nothing special here: it says
 * `{ test: 'hasBuilding', building: <itself> }` and `cityScopeAdmits` answers
 * it off the town's own `buildings` list, which is true in exactly one city.
 *
 * The seam Entry XXVIII opens, and it is deliberately one function rather than a
 * flag on `liveEffects`: an empire's law is the same in every town and a rite is
 * not, so a reader that has a city in hand asks this and a reader that has only
 * a player asks `liveEffects`. Every city-scoped reader below was moved onto it
 * in one pass, which is what makes "a timed percentage is an ordinary
 * percentage" true rather than aspirational.
 */
export function liveCityEffects(state: GameState, city: City): LiveCardEffect[] {
  return [...liveEffects(state, city.ownerId), ...cityLocalEffects(state, city)];
}

/**
 * The cards that reach **this town and not its empire**: the buildings standing
 * in it, the rites hanging on it, and the follower beliefs of the faith it
 * follows.
 *
 * Split out of `liveCityEffects` so that a reader which sweeps the realm's towns
 * *itself* — `cardHappiness` is the one — can add the town-local half without
 * counting the empire's law once per city. The two halves are exactly
 * complementary: `liveEffects(owner) ++ cityLocalEffects(city)` is
 * `liveCityEffects(city)`, with no member in both.
 */
function cityLocalEffects(state: GameState, city: City): LiveCardEffect[] {
  return [
    ...cityBuildingEffects(state, city),
    ...timedLive(state, city.ownerId, city),
    ...followerBeliefEffects(state, city),
    ...consecrationEffects(state, city),
  ];
}

/**
 * What this town's **cathedral patron** contributes (design ledger Entry LV).
 *
 * The fourth city-local source, and the simplest one in the file: one card, held
 * permanently by one town, read off `City.consecration` — presence is the state,
 * so a town with no cathedral answers the empty list and pays for nothing.
 *
 * It is a source of `liveCityEffects` and **never of `liveEffects`**, for
 * `cityBuildingEffects`' reason exactly and one step stronger: a consecration is
 * a fact about *these stones*, so a second cathedral in a second town is a
 * second, independently rolled patron, and a dedication read from the empire's
 * end would pay every town for one town's saint. Because it is read off the
 * city, what it pays **follows the stones** — a captured cathedral pays its
 * captor from the turn the town changes hands, with no bookkeeping at all.
 *
 * Last of the four, after the buildings, the rites and the follower beliefs, for
 * the reason every source in this file is last in turn: it is the order they
 * were built in, so no ledger reshuffles itself.
 */
function consecrationEffects(state: GameState, city: City): LiveCardEffect[] {
  const id = city.consecration;
  if (id === undefined || !isConsecrationId(id)) return [];
  const def = consecrationDef(id);
  if (def.effects.length === 0) return [];
  const list: LiveCardEffect[] = [];
  const push = (card: CardId, label: string, effects: readonly CardEffect[]): void => {
    pushEffects(state, city.ownerId, list, card, label, effects, push);
  };
  // The bare class word, because `pushEffects` appends the card's own name — so
  // the line reads "Cathedral \u00b7 The Choir Loft". A religion's word carries the
  // faith's name as well because a belief's line has to say *which* faith; a
  // cathedral has only one thing to say.
  push(id, CLASS_WORD.consecration, def.effects);
  return list;
}

/**
 * Is exactly one of these standing anywhere it could matter — one per world (a
 * wonder) or one per realm (a capstone)?
 *
 * **The** line dividing `liveEffects`' fifth source from `cityBuildingEffects`,
 * asked by both so the division has one definition. A row that answers yes is
 * the empire's and its clauses may speak of the whole realm; a row that answers
 * no stands in every town that built one and belongs to the town's own walk.
 */
export function oneOfAKind(id: BuildingId): boolean {
  return isWonder(id) || buildingDef(id).oncePerEmpire === true;
}

/** Does the table hold any one-of-a-kind row at all? `liveEffects`' cheap guard. */
const ONE_OF_A_KIND = BUILDING_IDS.some((id) => buildingDef(id).oncePerEmpire === true);

/**
 * The effects the **ordinary buildings standing in this town** contribute.
 *
 * `BuildingDef.effects` promised this in so many words — "the day an ordinary
 * building wants a card effect it fills this in, and the evaluator will not
 * notice the difference" — and until the aqueduct wanted one (user, 2026-08-27:
 * "+15% surplus growth in city") the only reader was `liveEffects`' wonder
 * source, which is gated on `isWonder`. So the promise was half true: a row
 * could carry effects and nothing would read them.
 *
 * It is a source of `liveCityEffects` and **never of `liveEffects`**, and that
 * is the whole of the rule. A wonder is one per world and its clauses are
 * written to say which towns they reach (`{ test: 'hasBuilding' }` for "the one
 * it stands in"), so it belongs to the empire's walk; an ordinary building
 * stands in every town that built one, and a granary's effect landing on the
 * empire would be the same effect counted once per granary. The scope *is* the
 * building — `BuildingDef.cityStat`'s exact bargain one field over — so no row
 * here needs one and none of them carries one.
 *
 * Wonders are skipped rather than repeated: they arrive through `liveEffects`
 * already, and a wonder read from both ends would pay twice in its own city.
 * **So is a capstone** (`BuildingDef.oncePerEmpire`), for the identical reason
 * one scale in: a row an empire holds exactly one of is read by the empire's
 * walk, and reading it from both ends would pay it twice in the town it stands
 * in. `oneOfAKind` is the one predicate both walks ask, so the two can never
 * disagree about which rows they are dividing between them.
 */
function cityBuildingEffects(state: GameState, city: City): LiveCardEffect[] {
  const list: LiveCardEffect[] = [];
  const push = (card: CardId, word: string, effects: readonly CardEffect[]): void => {
    pushEffects(state, city.ownerId, list, card, word, effects, push);
  };
  for (const id of city.buildings) {
    if (oneOfAKind(id)) continue;
    const effects = buildingDef(id).effects;
    if (effects === undefined || effects.length === 0) continue;
    push(id, CLASS_WORD.building, effects);
  }
  return list;
}

/** Every effect reaching **this unit**: its empire's cards, then its own rites. */
export function liveUnitEffects(state: GameState, unit: Unit): LiveCardEffect[] {
  return [...liveEffects(state, unit.ownerId), ...timedLive(state, unit.ownerId, unit)];
}

/** One live list narrowed to one kind. The shape every reader below is built on. */
function pickKind<K extends CardEffect['kind']>(
  live: readonly LiveCardEffect[],
  kind: K,
): { source: string; card: CardId; effect: Extract<CardEffect, { kind: K }> }[] {
  const list: {
    source: string;
    card: CardId;
    effect: Extract<CardEffect, { kind: K }>;
  }[] = [];
  for (const entry of live) {
    if (entry.effect.kind !== kind) continue;
    list.push({
      source: entry.source,
      card: entry.card,
      effect: entry.effect as Extract<CardEffect, { kind: K }>,
    });
  }
  return list;
}

/**
 * Every live effect of one kind for an **empire**.
 *
 * The narrowing is cut once per (state, seat, kind) and kept beside the walk it
 * came from (`LiveReading.byKind`), which is the other half of batch 10's
 * measurement: with the walk remembered, *filtering* it was what a late turn was
 * spending its time on — twenty-eight kinds asked of the same hundred lines,
 * several times per town per turn. The remembered narrowing dies with the walk
 * it belongs to, so it cannot outlive its own inputs.
 *
 * `readonly` for `liveEffects`' reason: the answer is shared with every other
 * reader of the same kind, and every one of them folds it into a list of its
 * own.
 */
export function effectsOfKind<K extends CardEffect['kind']>(
  state: GameState,
  playerId: number,
  kind: K,
): readonly { source: string; card: CardId; effect: Extract<CardEffect, { kind: K }> }[] {
  const reading = liveReading(state, playerId);
  const known = reading.byKind.get(kind);
  if (known !== undefined) {
    return known as unknown as readonly {
      source: string;
      card: CardId;
      effect: Extract<CardEffect, { kind: K }>;
    }[];
  }
  const cut = pickKind(reading.list, kind);
  reading.byKind.set(kind, cut);
  return cut;
}

/** Every live effect of one kind for **one city**, its own rites included. */
function cityEffectsOfKind<K extends CardEffect['kind']>(
  state: GameState,
  city: City,
  kind: K,
): { source: string; card: CardId; effect: Extract<CardEffect, { kind: K }> }[] {
  return pickKind(liveCityEffects(state, city), kind);
}

// --- conditions -------------------------------------------------------------

/** How many cities this player holds. Walks `state.cities`, which is founding order. */
function cityCount(state: GameState, playerId: number): number {
  return citiesOf(state, playerId).length;
}

/**
 * Does this empire condition hold? See the module docblock for the recursion
 * cut that makes the two meter arms terminate.
 */
function empireConditionHolds(
  state: GameState,
  playerId: number,
  when: EmpireCondition,
): boolean {
  const test = when.test;
  switch (test) {
    case 'cityCountAtMost':
      return cityCount(state, playerId) <= when.value;
    case 'cityCountAtLeast':
      return cityCount(state, playerId) >= when.value;
    case 'authorityNegative':
      // Imported lazily through the function-level cycle documented at the top.
      return authorityReading(state, playerId) < 0;
    case 'authorityPositive':
      // The mirror, under the same recursion cut: an empire at exactly zero
      // satisfies neither arm, which is what "positive" and "negative" mean.
      return authorityReading(state, playerId) > 0;
    case 'happinessNegative':
      return happinessReading(state, playerId) < 0;
    case 'queueHolds': {
      // Read through `queueCategory` — the one place a queue row is sorted into
      // a category — so a wonder, a building and a project are told apart here
      // by exactly the rule production tells them apart by. `where: 'capital'`
      // narrows the sweep to one town; the default asks the realm.
      const only = when.where === 'capital' ? capitalCityOf(state, playerId)?.id : undefined;
      if (when.where === 'capital' && only === undefined) return false;
      for (const city of state.cities) {
        if (city.ownerId !== playerId) continue;
        if (only !== undefined && city.id !== only) continue;
        for (const row of city.queue) {
          if (queueCategory(row) === when.category) return true;
        }
      }
      return false;
    }
    case 'atWar':
      // **The register itself**, and nothing derived from it. `atWar` answers
      // *true* against the wild without looking (it has nothing to sign), so a
      // sweep of the seats asking that question would have opened The Arsenal
      // Law's forges on turn one and never closed them. A war is one row per
      // unordered pair, so "am I at war" is "does a row name me".
      return state.wars.some((war) => war.a === playerId || war.b === playerId);
    default: {
      const unhandled: never = test;
      void unhandled;
      return false;
    }
  }
}

/**
 * The two meter readings.
 *
 * Named wrappers rather than bare calls so that the *one* place this module
 * reaches into `meters.ts` is greppable — that edge is the function-level half
 * of the cycle the docblock describes, and the recursion cut above is what makes
 * it safe to take.
 */
function authorityReading(state: GameState, playerId: number): number {
  return authorityOf(state, playerId);
}

function happinessReading(state: GameState, playerId: number): number {
  return happinessOf(state, playerId);
}

// --- city scopes ------------------------------------------------------------

/**
 * Is a mountain within `radius` hexes of this town? One hex by default — the
 * town's own and the ring of six.
 *
 * The default keeps the ring walk it has always taken, and a named radius takes
 * `isFrontierCity`'s walk instead (`wrappedDistance` over the board, so the seam
 * of a wrapping map is not a wall). Two paths rather than one because the ring
 * of six is what almost every caller asks for and a map sweep for it would be
 * thirty-seven tiles of arithmetic per city per refresh to answer a question six
 * lookups answer.
 */
function isMountainAdjacent(state: GameState, city: City, radius = 1): boolean {
  const tile = getTileAt(state.map, city.col, city.row);
  if (!tile) return false;
  if (tile.terrain === 'mountain') return true;
  if (radius <= 1) {
    for (const neighbour of neighborTiles(state.map, tileHex(tile))) {
      if (neighbour.terrain === 'mountain') return true;
    }
    return false;
  }
  const eye = tileHex(tile);
  for (const other of state.map.tiles) {
    if (other.terrain !== 'mountain') continue;
    if (wrappedDistance(state.map, eye, tileHex(other)) <= radius) return true;
  }
  return false;
}

/**
 * Does a hex touching this town's own — or its own — carry this improvement?
 *
 * `isMountainAdjacent`'s reach exactly, asked of the works rather than of the
 * ground: the ring of six plus the centre, because a town founded *on* a shrine
 * is not further from it than its neighbour is. See the scope's docblock for why
 * it is the ring and not the work radius.
 */
function hasAdjacentImprovement(state: GameState, city: City, improvement: ImprovementId): boolean {
  const tile = getTileAt(state.map, city.col, city.row);
  if (!tile) return false;
  if (tile.improvement === improvement) return true;
  for (const neighbour of neighborTiles(state.map, tileHex(tile))) {
    if (neighbour.improvement === improvement) return true;
  }
  return false;
}

/**
 * Is this town's own hex, or one of the six touching it, this terrain?
 *
 * `hasAdjacentImprovement`'s reach asked of the ground rather than of what has
 * been built on it, and `isMountainAdjacent`'s ring of six with the terrain
 * named by the row instead of baked in — the mountain reading keeps its own
 * function because its rows spell a radius and this one never will. The centre
 * counts, for the reason it counts in every member of the family: a town founded
 * *in* the sand is not further from the desert than its neighbour is.
 */
function isTerrainBeside(state: GameState, city: City, terrain: TerrainId): boolean {
  const tile = getTileAt(state.map, city.col, city.row);
  if (!tile) return false;
  if (tile.terrain === terrain) return true;
  for (const neighbour of neighborTiles(state.map, tileHex(tile))) {
    if (neighbour.terrain === terrain) return true;
  }
  return false;
}

/**
 * Does a great person's work stand on this town's hex or on one of the six
 * touching it? `hasAdjacentImprovement` asked of the *family*.
 *
 * The marker is `ImprovementDef.greatPerson` (presence is the marker), which is
 * exactly what `TileCondition`'s `greatWork` reads one scale down — so the two
 * questions about the same five improvements have one answer, and a sixth work
 * added the day a great admiral lands joins both without either being touched.
 */
function hasAdjacentGreatWork(state: GameState, city: City): boolean {
  const tile = getTileAt(state.map, city.col, city.row);
  if (!tile) return false;
  if (tile.improvement !== undefined && isGreatPersonWork(tile.improvement)) return true;
  for (const neighbour of neighborTiles(state.map, tileHex(tile))) {
    if (neighbour.improvement !== undefined && isGreatPersonWork(neighbour.improvement)) {
      return true;
    }
  }
  return false;
}

/**
 * **THE** question "can this town drink" — the board's answer, or a card's.
 *
 * The one predicate `cityScopeAdmits`' `freshwater` and `notFreshwater` arms go
 * through, and the only reader of the `freshwater` rule (Cistern Works). It is a
 * predicate rather than two copies of `cityTile(...).freshwater` precisely so
 * that a card declaring the fact cannot be true for one arm and false for its
 * mirror — a River Kings penalty that still bit a town the aqueducts had already
 * watered would be the two halves of one sentence disagreeing.
 *
 * It answers about a **town** and nothing wider: a hex's own fresh water is
 * `TileCondition`'s `freshwater` and the renewal's `requiresFreshwater`, and a
 * cistern in the town square does not water the third ring.
 *
 * Exported since the dry-settle ruling (2026-09-03), whose whole point is that
 * the growth channel asks *this* question and not a copy of it: a town the
 * Cistern Works have watered must stop paying the penalty on the same turn it
 * stops being a `notFreshwater` city, or the two halves of one sentence
 * disagree. What an **aqueduct** does is a different question with a different
 * reading (`cityIsWatered`, `buildingEffects.ts`) — it feeds the people, not the
 * fields, and deliberately does not answer this.
 */
export function cityHasFreshwater(state: GameState, city: City): boolean {
  if (cityTile(state.map, city).freshwater) return true;
  return cardCityRule(state, city.ownerId, 'freshwater');
}

/** Does this empire hold a card declaring this fact about its cities? */
function cardCityRule(state: GameState, playerId: number, rule: CityRuleId): boolean {
  return cardRuleHolds(state, playerId, rule);
}

/** Default reach of the `frontier` scope, in hexes. */
const FRONTIER_RADIUS = 3;

/**
 * Is another civilization's ground within `radius` of this town?
 *
 * Asked of `tileOwner`, which is the board's own answer, and it counts *any*
 * other seat including the wild's — the wild owns no ground, so in practice this
 * is "a rival's border is close". A sweep of the disc rather than of the map,
 * because a frontier is a local fact and the disc is 37 tiles at radius 3.
 */
function isFrontierCity(state: GameState, city: City, radius: number): boolean {
  const centre = getTileAt(state.map, city.col, city.row);
  if (!centre) return false;
  const eye = tileHex(centre);
  for (const tile of state.map.tiles) {
    const owner = tileOwnerPlayerId(state, tile.col, tile.row);
    if (owner === null || owner === city.ownerId) continue;
    if (wrappedDistance(state.map, eye, tileHex(tile)) <= radius) return true;
  }
  return false;
}

/**
 * Does a scoped effect land in this city? Absent scope means every city.
 *
 * `scopeAdmits` in `resourceEffects.ts` widened from two words to a shape — one
 * evaluator for every scope a card can name, so a new scope is one arm here and
 * nothing in the card that wanted it.
 */
export function cityScopeAdmits(
  state: GameState,
  city: City,
  scope?: CityScope,
  viewerId?: number,
): boolean {
  if (!scope) return true;
  const test = scope.test;
  switch (test) {
    case 'coastal':
      return isCoastalCity(state, city);
    case 'freshwater':
      // Through the one predicate, so a card that declares the fact (Cistern
      // Works) and the river that supplies it are one answer. See it.
      return cityHasFreshwater(state, city);
    case 'notFreshwater':
      return !cityHasFreshwater(state, city);
    case 'mountainAdjacent':
      return isMountainAdjacent(state, city, scope.radius);
    case 'adjacentImprovement':
      return hasAdjacentImprovement(state, city, scope.improvement);
    case 'adjacentGreatWork':
      // The same ring of six and the same hex, asked of the improvement table's
      // own marker rather than of a name — so a sixth work joins for free.
      return hasAdjacentGreatWork(state, city);
    case 'onResourceKind': {
      // The centre's own hex, exactly as `onTerrain` is: where the settler
      // stopped, not what the borders later took in.
      const seat = cityTile(state.map, city);
      if (seat.resource === undefined) return false;
      return resourceDef(seat.resource).kind === scope.kind;
    }
    case 'queueHolds': {
      // The **front row**, because a city has one basket and it pays for
      // `queue[0]`: a wonder standing second is a plan rather than a building
      // site. Sorted through `queueCategory`, the one place a row is told what
      // it is, exactly as `EmpireCondition`'s arm does it one scale out.
      const front = city.queue[0];
      return front !== undefined && queueCategory(front) === scope.category;
    }
    case 'frontier':
      return isFrontierCity(state, city, scope.radius ?? FRONTIER_RADIUS);
    case 'captured':
      return city.captured;
    case 'capital':
      return capitalCityOf(state, city.ownerId)?.id === city.id;
    case 'notCapital':
      // The negation asked of the same answer, rather than of a second lookup:
      // a realm with no capital at all (none founded yet) has no city standing
      // here to ask about either, so the two arms cannot disagree.
      return capitalCityOf(state, city.ownerId)?.id !== city.id;
    case 'onHills':
      // The centre's own hex, exactly as `onTerrain` is. Hills are an overlay
      // and never a terrain — see the scope.
      return cityTile(state.map, city).hills;
    case 'populationAtLeast':
      return city.population >= scope.value;
    case 'populationAtMost':
      // Inclusive, exactly as its mirror is: "size 4 or less" reaches a town of
      // four, which is what the printed words say.
      return city.population <= scope.value;
    case 'holding': {
      // Asked across all three kinds, because a card may name a bonus resource
      // and a luxury in one breath (Quarrymen's Guild: stone or marble).
      for (const kind of RESOURCE_KINDS) {
        const held = cityResources(state, city, kind);
        if (scope.resources.some((id) => held.includes(id))) return true;
      }
      return false;
    }
    case 'holdingCategory': {
      const held = cityResources(state, city, scope.category as ResourceKind);
      return held.length > 0;
    }
    case 'hasBuilding':
      return city.buildings.includes(scope.building);
    case 'keepingRite':
      // Through `cityRite`, the one reading of what a town is keeping — itself
      // a comparison against `City.timed`'s absolute stamps, so the lamp goes
      // out on the turn the rite's own expiry passes and nothing ticks.
      return cityRite(state, city) !== null;
    case 'hasBuildingYielding':
      // Asked of what a row *does*, off its own six voices, so a retuned library
      // moves the scope with it. `wonder: true` is Hero of Alexandria's half.
      return city.buildings.some(
        (id) =>
          (scope.wonder !== true || isWonder(id)) &&
          (buildingDef(id)[scope.yields] ?? 0) > 0,
      );
    case 'onTerrain':
      // The centre's own hex and nothing wider. See the scope's docblock.
      return cityTile(state.map, city).terrain === scope.terrain;
    case 'terrainBeside':
      // The centre and the ring of six — `hasAdjacentImprovement`'s reach asked
      // of the ground, and never a border: what a town is *at the edge of* is
      // fixed the day the settler stops, where `terrainInBorders` moves with
      // culture. Petra's desert.
      return isTerrainBeside(state, city, scope.terrain);
    case 'terrainInBorders':
      // What the *borders* have taken in, which is a different question from
      // what the centre stands on and from what touches it. `ownedTiles` is the
      // board's own answer, so a hex that changes hands changes this with it.
      return ownedTiles(state, city).some((tile) => tile.terrain === scope.terrain);
    case 'hasImprovement':
      // `terrainInBorders` asked of what has been *built* rather than of the
      // ground, over the same sweep and for its reason: the quarry three hexes
      // out is this town's quarry, and the one over the border is not.
      return ownedTiles(state, city).some((tile) => tile.improvement === scope.improvement);
    case 'garrisoned':
      // Through the one sweep that answers "who is standing in this town"
      // (`garrisonOf`, which `CountKind`'s `garrison` counts), so a card that
      // asks whether there is a garrison and a card that counts one cannot
      // disagree. Boolean, so three spearmen admit it once.
      return garrisonOf(state, city).length > 0;
    case 'connected': {
      // The gold ledger's own fill, asked of the same board (`roads.ts`, the
      // leaf both readers can see). The capital is what the others are joined
      // *to*, so it is never in the list and never admits — see the scope.
      return connectedCities(state, city.ownerId).some((entry) => entry.city.id === city.id);
    }
    case 'newest': {
      // **Founding order**, which is `state.cities`' own order and the order
      // every other sweep in the simulation walks: the last entry this empire
      // owns is the newest town it holds. Asked of the town's *owner* rather
      // than of a viewer, exactly as `capital` is — a scope is a question about
      // whose realm this town belongs to, and a card read of somebody else's
      // city means that empire's newest.
      let newest: number | null = null;
      for (const town of state.cities) {
        if (town.ownerId === city.ownerId) newest = town.id;
      }
      return newest !== null && newest === city.id;
    }
    case 'follows': {
      // **"This town follows the religion this belief belongs to."** Since the
      // 2026-08-28 ruling a follower belief only ever reaches a town through
      // `followerBeliefEffects`, which pushes it into the live list of a city
      // that already follows the faith — so the subject the scope used to need a
      // `viewerId` for is the town in hand, and the clause is true by
      // construction there. Read of any other card it asks the only question
      // left with no religion named: does this place keep a faith at all.
      //
      // **Unless a reader names itself.** Cuius Regio is the first card whose
      // own text says *your* religion, and a viewer is how it says so: the town
      // must keep one of the faiths this empire is paid by (`heldReligions` —
      // the holy city's, so a conquered shrine moves the sentence with it).
      // Optional rather than required, because the follower pool has a town in
      // hand and no reader at all; absent is the wider reading above.
      if (viewerId === undefined) return cityReligion(city) !== null;
      const kept = cityReligion(city);
      if (kept === null) return false;
      return heldReligions(state, viewerId).some((religion) => religion.id === kept);
    }
    case 'all': {
      // Recursion into the same evaluator, which is the whole reason the
      // composite is a scope rather than a second field on every effect. The
      // viewer travels with it: a conjunction of "follows me" and "on the coast"
      // must mean the same "me" in both halves.
      for (const inner of scope.of) {
        if (!cityScopeAdmits(state, city, inner, viewerId)) return false;
      }
      return true;
    }
    case 'any': {
      // `all` inverted, and the viewer travels with it for that composite's
      // reason exactly. An empty list admits nothing — "any of none" — which is
      // the honest reading and the one that makes a mistyped row silent rather
      // than universal.
      for (const inner of scope.of) {
        if (cityScopeAdmits(state, city, inner, viewerId)) return true;
      }
      return false;
    }
    case 'routeEndsHere':
      // **`Unit.trade` is the route** — there is no register — so the question
      // is asked of the pieces, and only of the ones still paying: a lapsed
      // route is inert (`routeIsLive`) and a town it once ended at is not a
      // town caravans come to. Whoever *sent* it is not asked, exactly as
      // `cityRouteYields` does not ask: a foreign caravan in your market is a
      // caravan in your market.
      return state.units.some(
        (unit) => unit.trade?.to === city.id && routeIsLive(state, unit),
      );
    default: {
      const unhandled: never = test;
      void unhandled;
      return true;
    }
  }
}

/** What a scope says about where a line landed, for the label. */
function scopeNote(scope?: CityScope): string | null {
  if (!scope) return null;
  const test = scope.test;
  switch (test) {
    case 'connected':
      return 'joined to your capital';
    case 'coastal':
      return 'coastal city';
    case 'freshwater':
      return 'fresh water';
    case 'notFreshwater':
      return 'no fresh water';
    case 'mountainAdjacent':
      return scope.radius !== undefined && scope.radius > 1
        ? `mountain within ${scope.radius}`
        : 'mountain hold';
    case 'adjacentImprovement':
      return `beside a ${improvementDef(scope.improvement).name.toLowerCase()}`;
    case 'adjacentGreatWork':
      return "beside a great person's work";
    case 'onResourceKind':
      return `settled on ${scope.kind}`;
    case 'queueHolds':
      return `building a ${scope.category}`;
    case 'frontier':
      return 'near a rival';
    case 'captured':
      return 'captured city';
    case 'capital':
      return 'capital';
    case 'notCapital':
      return 'not the capital';
    case 'onHills':
      return 'hill city';
    case 'populationAtLeast':
      return `size ${scope.value}+`;
    case 'populationAtMost':
      return `size ${scope.value} or less`;
    case 'holding':
      return scope.resources.map((id) => resourceDef(id).name).join('/');
    case 'holdingCategory':
      return `${scope.category} seam`;
    case 'hasBuilding':
      return buildingDef(scope.building).name.toLowerCase();
    case 'keepingRite':
      return 'keeping a rite';
    case 'hasBuildingYielding':
      return scope.wonder === true ? `${scope.yields} wonder` : `${scope.yields} building`;
    case 'onTerrain':
      return `${scope.terrain} city`;
    case 'terrainBeside':
      return `on or beside ${scope.terrain}`;
    case 'terrainInBorders':
      return `${scope.terrain} in its borders`;
    case 'hasImprovement':
      return `${improvementDef(scope.improvement).name.toLowerCase()} in its borders`;
    case 'garrisoned':
      return 'a unit stationed there';
    case 'newest':
      return 'newest city';
    case 'follows':
      return 'follows this faith';
    case 'routeEndsHere':
      return 'a route ends here';
    case 'all':
      return scope.of.map((inner) => scopeNote(inner)).filter((note) => note !== null).join(' + ');
    case 'any':
      // The composite's own word, so a label reads "pasture or camp" where the
      // conjunction reads "pasture + camp".
      return scope.of.map((inner) => scopeNote(inner)).filter((note) => note !== null).join(' or ');
    default: {
      const unhandled: never = test;
      void unhandled;
      return null;
    }
  }
}

/** A label that says which line of a card this is. `resourceEffects`' `label`. */
function label(source: string, note: string | null): string {
  return note === null ? source : `${source} · ${note}`;
}

// --- counts and rates -------------------------------------------------------

/**
 * What a `pays` count counts, in one place.
 *
 * `city` is present for the city-scoped counts and ignored by the rest; a
 * city-scoped count asked with no city answers 0, which is the honest answer for
 * an empire-scale reader that has no town in hand.
 *
 * `card` is **whose** count this is, and it is here for exactly one member:
 * `tally` is the only question in the union whose answer belongs to the card
 * asking it rather than to the board, so the walk that already carries the card
 * for the label hands it in rather than every arm re-deriving it. Every other
 * arm ignores it.
 *
 * **Exported for one outside reader** (2026-09-04, the potential weight): the
 * bot's appraisal (`src/ai/value.ts`) prices a counted card by what the empire
 * *actually* counts today rather than by a nominal stand-in, and it asks this
 * rather than re-deriving forty arms of its own. That is a *reading* and not a
 * second evaluator — nothing outside this module switches on a `CountKind`, and
 * nothing outside it may — which is the same licence `explainCardCityYields` and the
 * rest of the exported folds already carry.
 */
export function countOf(
  state: GameState,
  playerId: number,
  card: CardId,
  effect: CardPaysEffect,
  city?: City,
): number {
  const count = effect.count;
  // **A row that names no count counts nothing.** `count` is one field of the
  // one `pays` shape (batch E5) and only `basis: 'count'` fills it, so a caller
  // handing over a flat row gets the honest answer rather than a throw — the
  // same silence a `tally` naming no occasion keeps.
  if (count === undefined) return 0;
  switch (count) {
    case 'uniqueLuxuries':
      // **"In this city" is the same question of narrower ground**, the modifier
      // `population` and `improvedBonusResources` already carry: Pilgrimage pays
      // a following town for the luxuries *it* holds, and an empire-wide count
      // would have paid every following town for the whole realm's silks.
      // `cityResources` is the uniqueness reading every city-scale resource
      // question takes (`resourceEffects.ts`).
      if (effect.within === 'city') return city ? cityResources(state, city, 'luxury').length : 0;
      return controlledResources(state, playerId, 'luxury').length;
    case 'luxuryCopies': {
      let total = 0;
      for (const id of controlledResources(state, playerId, 'luxury')) {
        total += resourceCopies(state, playerId, id);
      }
      return total;
    }
    case 'duplicateLuxuries': {
      // The **kinds** there is more than one seam of — Village Fairs. The same
      // sweep `luxuryCopies` takes, counting names instead of copies, which is
      // why it is a member here rather than a second traversal somewhere else.
      let total = 0;
      for (const id of controlledResources(state, playerId, 'luxury')) {
        if (resourceCopies(state, playerId, id) >= 2) total += 1;
      }
      return total;
    }
    case 'improvedBonusResources': {
      // **"In this city" is a different sweep of the same question** (the Temple
      // of Artemis). At empire scale the count is of *copies* — two improved
      // wheat fields are two — because that is what the ratified table means by
      // "improved bonus resources" across a realm. At town scale it is asked of
      // the town's own holdings (`cityResources`), which is the uniqueness
      // reading every city-scale resource question already takes
      // (`resourceEffects.ts`): two wheat fields in one city are one holding,
      // and the sweep is over that city's tiles rather than the whole map.
      return improvedResources(state, playerId, 'bonus', effect, city);
    }
    case 'improvedStrategicResources':
      // The same sweep with the other kind. See `improvedResources`.
      return improvedResources(state, playerId, 'strategic', effect, city);
    case 'cities':
      return cityCount(state, playerId);
    case 'population': {
      // **"In a city" is the same question of narrower ground** (the Republic's
      // culture per five citizens). `within: 'city'` is the modifier on the
      // count that `improvedBonusResources` already carries, and it means here
      // exactly what it means there: the sweep is over one town rather than the
      // realm, so a card written on it pays each town for its own citizens
      // instead of paying every town for the empire's.
      if (effect.within === 'city') return city?.population ?? 0;
      let total = 0;
      for (const town of state.cities) {
        if (town.ownerId === playerId) total += town.population;
      }
      return total;
    }
    case 'capitalPopulation':
      return capitalCityOf(state, playerId)?.population ?? 0;
    case 'garrison':
      return city ? garrisonOf(state, city).length : 0;
    case 'garrisonWatch': {
      if (!city) return 0;
      // A fortified unit is worth 1, plus 1 more per turn it has been dug in —
      // "the longer the watch, the steadier the town". An unfortified garrison
      // is not a watch and pays nothing.
      let total = 0;
      for (const unit of garrisonOf(state, city)) {
        if (unit.fortifiedTurns === undefined) continue;
        total += 1 + unit.fortifiedTurns;
      }
      return total;
    }
    case 'workedHills': {
      if (!city) return 0;
      let total = 0;
      for (const cell of city.workedTiles) {
        const tile = getTileAt(state.map, cell.col, cell.row);
        if (tile?.hills) total += 1;
      }
      return total;
    }
    case 'bankedFaith':
      return Math.max(0, Math.floor(playerById(state, playerId)?.faithPool ?? 0));
    case 'bankedGold':
      return Math.max(0, Math.floor(playerById(state, playerId)?.gold ?? 0));
    case 'visibleCamps': {
      let total = 0;
      for (const camp of state.camps) {
        if (isVisibleTo(state, playerId, camp.col, camp.row)) total += 1;
      }
      return total;
    }
    case 'scienceBuildings': {
      if (!city) return 0;
      // Omen Reading. "Buildings that supply science" is read off the building
      // rows — flat science or science per citizen — so a retune of the library
      // moves the rite with it, and a new science building joins for free.
      let total = 0;
      for (const id of city.buildings) {
        const def = buildingDef(id);
        if ((def.science ?? 0) > 0 || (def.sciencePerPop ?? 0) > 0) total += 1;
      }
      return total;
    }
    case 'buildingsOfKind': {
      // A named building, counted once per town that has raised it — the Circus
      // Maximus' barracks and Notre-Dame's temples. A row with no `building` is
      // a data error rather than "count everything": it would silently pay per
      // *city*, which is a count that already exists.
      const wanted = effect.building;
      if (wanted === undefined) return 0;
      if (effect.within === 'city') return city?.buildings.includes(wanted) ? 1 : 0;
      let total = 0;
      for (const town of state.cities) {
        if (town.ownerId !== playerId) continue;
        if (town.buildings.includes(wanted)) total += 1;
      }
      return total;
    }
    case 'buildingsInCity':
      return city ? city.buildings.length : 0;
    case 'workedTilesInCity':
      return city ? city.workedTiles.length : 0;
    case 'workedUnimprovedTiles': {
      // `workedHills`' loop with the other question asked of the hex, and the
      // question is asked through `tileConditionHolds` so the count and the 🌿
      // ladder's tile lines cannot disagree about what "unimproved" means.
      if (!city) return 0;
      let total = 0;
      for (const cell of city.workedTiles) {
        const tile = getTileAt(state.map, cell.col, cell.row);
        if (tile && tileConditionHolds(tile, { test: 'unimproved' })) total += 1;
      }
      return total;
    }
    case 'wonders':
      // `wondersHeldBy` (`state.ts`) since batch H6 — `beadCount` asked the same
      // three loops for a feat and a count that disagreed with itself between a
      // card and a bead is drift nothing would have caught. A wonder is one per
      // world, so the empire's own towns are the whole of the question, and a
      // captured wonder joins this count the turn the town changes hands (what a
      // wonder pays follows the stones).
      return wondersHeldBy(state, playerId);
    case 'revealedTiles': {
      // The seat's own monotone grid, counted whole. Anything above `HIDDEN`
      // has been walked past once, which is what "revealed" means everywhere
      // else in the game — the level is read as a number here rather than
      // through `isExploredBy` because the address is the index a sweep already
      // holds and there are four thousand of them.
      const grid = state.visibility[playerId];
      if (!grid) return 0;
      let total = 0;
      for (const level of grid) {
        if (level > 0) total += 1;
      }
      return total;
    }
    case 'roadHexes': {
      // The **builder's** mark, read off the one field a road is written on
      // (`Tile.road`, written by `layRoad` and by nothing else). An index sweep
      // for `revealedTiles`' reason: four thousand field reads, no addresses.
      // A decreed hex (`roadFree`) counts — only the maintenance ledger cares
      // who is billed, and The Long Roads is paid for the road, not the bill.
      let total = 0;
      for (const tile of state.map.tiles) {
        if (tile.road === playerId) total += 1;
      }
      return total;
    }
    case 'sightedCities': {
      // **Foreign** towns only: a seat's own cities are in its sightings too,
      // and a card that counted them would be paying twice for founding.
      let total = 0;
      for (const sighting of state.citySightings[playerId] ?? []) {
        if (sighting.ownerId !== playerId) total += 1;
      }
      return total;
    }
    case 'agesClosed':
      // The eras *behind* this empire. `highestAge` is 1-based and an empire in
      // the first age has closed nothing, so the floor at zero is the meaning
      // rather than a guard.
      return Math.max(0, highestAge(playerById(state, playerId)?.techsResearched ?? []) - 1);
    case 'unitsInField': {
      let total = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        if (!unitMatches(unit.type, effect.class)) continue;
        total += 1;
      }
      return total;
    }
    case 'buildingsOfCategory': {
      // `buildingsOfKind`'s sweep with the wider question — what a row is *for*
      // rather than which row it is. A line with no `category` is a data error
      // for that count's stated reason: it would silently pay per city.
      const wanted = effect.category;
      if (wanted === undefined) return 0;
      if (effect.within === 'city') {
        if (!city) return 0;
        let here = 0;
        for (const id of city.buildings) {
          if (buildingDef(id).category === wanted) here += 1;
        }
        return here;
      }
      let total = 0;
      for (const town of state.cities) {
        if (town.ownerId !== playerId) continue;
        for (const id of town.buildings) {
          if (buildingDef(id).category === wanted) total += 1;
        }
      }
      return total;
    }
    case 'buildingsOfCategories': {
      // `buildingsOfCategory` with a list rather than a word — The Long Count's
      // science *and* faith houses. An empty or absent list counts nothing, for
      // that count's stated reason: a question that never said which buildings
      // must not quietly answer "all of them".
      const wanted = effect.categories;
      if (wanted === undefined || wanted.length === 0) return 0;
      if (effect.within === 'city') {
        if (!city) return 0;
        let here = 0;
        for (const id of city.buildings) {
          if (wanted.includes(buildingDef(id).category)) here += 1;
        }
        return here;
      }
      let total = 0;
      for (const town of state.cities) {
        if (town.ownerId !== playerId) continue;
        for (const id of town.buildings) {
          if (wanted.includes(buildingDef(id).category)) total += 1;
        }
      }
      return total;
    }
    case 'empireYield': {
      // **The books, not the board** — and the one count that could feed itself,
      // cut the way `conditionRule` is cut. `foldEmpireRates` folds every town,
      // which folds the cards, which reaches this arm; while that fold is running
      // this count answers nothing, so a card written on the empire's gold cannot
      // be paid for the gold it is itself paying. See `CountKind`'s `empireYield`.
      const voice = effect.voice;
      if (voice === undefined) return 0;
      if (rateDepth > 0) return 0;
      rateDepth += 1;
      try {
        const rates = foldEmpireRates(state, playerId);
        return Math.max(0, Math.floor(rates[RATE_OF_VOICE[voice]] ?? 0));
      } finally {
        rateDepth -= 1;
      }
    }
    case 'rerollsWhileSlotted': {
      // The **chair's** counter, not the card's: the ruled sentence is "while
      // this Order is slotted", so a card benched and re-slotted starts a new
      // watch. Nothing writes `rerollsSeen` until batch C1 builds the reroll, so
      // this reads nought in every empire today — the honest answer for a thing
      // that has not happened yet.
      const sc = statecraftOf(state, playerId);
      if (!sc) return 0;
      let total = 0;
      for (const held of sc.slots) {
        if (held?.card !== card) continue;
        total += held.rerollsSeen ?? 0;
      }
      return total;
    }
    case 'defensiveBuildings': {
      if (!city) return 0;
      // A fortification is read off what a building *does* to its town — the
      // strength a besieger has to beat (`cityStat.defense`) or the bar it has
      // to empty (`cityHp`) — so a watchtower added to the table joins The Long
      // Watch for free and no list of names is kept anywhere.
      let total = 0;
      for (const id of city.buildings) {
        const def = buildingDef(id);
        const wall = def.cityStat?.stat === 'defense' && (def.cityStat.amount ?? 0) > 0;
        if (wall || (def.cityHp ?? 0) > 0) total += 1;
      }
      return total;
    }
    case 'discoveredCamps': {
      // `visibleCamps`' sibling on the monotone grid: a camp on ground this seat
      // has walked past counts until somebody burns it out. See the union.
      let total = 0;
      for (const camp of state.camps) {
        if (isExploredBy(state, playerId, camp.col, camp.row)) total += 1;
      }
      return total;
    }
    case 'tradeRoutes': {
      // Live routes this seat is running, counted off the board rather than
      // asked of `trade.ts` — which reads *this* module for its slot fold, so
      // the arrow only points one way. Expiry is the one comparison it is
      // everywhere else (`state.turn < expiresTurn`).
      let total = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        if (unit.trade === undefined) continue;
        if (state.turn >= unit.trade.expiresTurn) continue;
        total += 1;
      }
      return total;
    }
    case 'worldWonders':
      // The claim register, which is the one place a wonder is written down and
      // never moves — so this is exactly "how many marvels exist".
      return state.wonders.length;
    case 'foreignTradeRoutes': {
      // `tradeRoutes` and one more question of the same caravan, asked of the
      // board for that count's reason exactly. The far end is resolved fresh
      // every turn, so a partner that changes hands changes the count with it —
      // which is the same "what a wonder pays follows the stones" reading one
      // system over.
      let total = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        const route = unit.trade;
        if (route === undefined) continue;
        if (state.turn >= route.expiresTurn) continue;
        const partner = state.cities.find((city) => city.id === route.to);
        if (partner === undefined || partner.ownerId === playerId) continue;
        total += 1;
      }
      return total;
    }
    case 'tradePartnerEmpires': {
      // `foreignTradeRoutes`' sweep with the *partner* remembered instead of
      // tallied: three roads to one neighbour are one court reached. An array,
      // walked and searched — this is an outcome, and nothing in this game
      // iterates a keyed collection for one.
      const seats: number[] = [];
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        const route = unit.trade;
        if (route === undefined) continue;
        if (state.turn >= route.expiresTurn) continue;
        const partner = state.cities.find((entry) => entry.id === route.to);
        if (partner === undefined || partner.ownerId === playerId) continue;
        if (!seats.includes(partner.ownerId)) seats.push(partner.ownerId);
      }
      return seats.length;
    }
    case 'authoritySurplus': {
      // **The meter's own fold**, so the sheet and the helpings agree by
      // construction — and the cut, because a row paying `to: 'authority'` off
      // this count would ask the writ for the figure it is helping to compute.
      // `rateDepth`'s idiom one meter over; see the count.
      if (meterDepth > 0) return 0;
      meterDepth += 1;
      try {
        return Math.max(0, authorityReading(state, playerId));
      } finally {
        meterDepth -= 1;
      }
    }
    case 'goldSpent':
      // The almoner's ledger, read off the record rather than off the treasury:
      // coin that has gone leaves nothing on the board to sweep. See
      // `Player.goldSpent` for the seams that raise it.
      return Math.max(0, playerById(state, playerId)?.goldSpent ?? 0);
    case 'routeLength':
      // **Answered only where a road is in hand.** The caravan's own fold asks
      // this count with the two towns resolved (`routeYields.ts`); every other
      // reader has no road to measure and gets the honest nought, exactly as a
      // city-scoped count answers nought to a caller with no town.
      return 0;
    case 'internalTradeRoutes': {
      // `foreignTradeRoutes`' mirror over the same sweep of the same board — the
      // partner resolved fresh every turn, so a town that changes hands moves
      // from one count to the other with it.
      let total = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        const route = unit.trade;
        if (route === undefined) continue;
        if (state.turn >= route.expiresTurn) continue;
        const partner = state.cities.find((entry) => entry.id === route.to);
        if (partner === undefined || partner.ownerId !== playerId) continue;
        total += 1;
      }
      return total;
    }
    case 'slottedOrders':
      // The council: one helping per Order sitting in a chair. `slots` is the
      // chairs, which is the same table `perSlottedOrder` reads for its
      // multiplier — and the same table `beadCount` counted for itself until
      // batch H6 gave the two one `slottedOrderCount` (`state.ts`). It counted
      // *levels* until the levelling ruling of 2026-09-04 emptied the word of
      // meaning; a card is one card now.
      return slottedOrderCount(state, playerId);
    case 'unslottedOrders': {
      // The shelf: cards held and not sitting in a chair — an archive is a
      // shelf of decisions.
      const sc = playerById(state, playerId)?.statecraft;
      if (!sc) return 0;
      let total = 0;
      for (const id of sc.orders) {
        if (sc.slots.some((slotted) => slotted !== null && slotted.card === id)) continue;
        total += 1;
      }
      return total;
    }
    case 'slottedOrdersOfSlot':
      // The deck-readers' count. **The card's own flavour, never the chair's**
      // — a wildcard chair takes any card, so counting chairs would pay The
      // Synod for a spearman that happened to be sitting in one. Through
      // `slottedOrdersOfFlavour`, the one reading, so the Order screen and the
      // combat preview cannot disagree about what a council is made of.
      return slottedOrdersOfFlavour(state, playerId, effect.slot);
    case 'clearedCamps':
      // The one count answered off a **record** rather than off the board: a
      // camp that has been burnt out leaves nothing to sweep, which is exactly
      // what clearing one means. Written at the single seam that clears one.
      return Math.max(0, Math.floor(playerById(state, playerId)?.campsCleared ?? 0));
    case 'tally': {
      // **What this card has watched happen** — the growing cards' counter, and
      // the one member of the union that is not a question about the board at
      // all (see `CountKind`'s `tally`). Read off the empire's own books, for
      // *this* card: two growing cards watching one moment each keep their own
      // count, which is what makes the counter a fact about the holding.
      //
      // Raw, and divided by the row's own `per` in `helpings` where the line is
      // printed, so the remainder is kept rather than rounded away — the whole
      // point of storing the coin rather than the helpings.
      if (!isOrderId(card)) return 0;
      const sc = statecraftOf(state, playerId);
      return sc ? tallyOf(sc, card) : 0;
    }
    case 'followersHere': {
      // **The town's own congregation**, and the one count in the union that is
      // about a city's faith rather than about a founder's. `cityReligion` is
      // derived from the citizens, so this and the banner cannot disagree; a
      // town below a majority follows nothing and counts nothing, which is what
      // "the old gods" means everywhere else in this file.
      if (!city) return 0;
      const followed = cityReligion(city);
      if (followed === null) return 0;
      return followerCount(city, followed);
    }
    case 'followingCities':
    case 'followingForeign':
    case 'followingPop':
    case 'followingEmpires':
    case 'followingWithBuilding':
    case 'followingCitiesWithWonder':
    case 'followingBuildingsOfCategory':
      // **The tide, counted, in one sweep** (`docs/religion-v2.md`). Seven
      // readings of one question — which cities in the *world* follow the
      // religion this empire founded — so they share a body rather than
      // repeating the walk seven times with one line different. An empire that
      // has founded nothing counts nothing, which is the honest answer and not
      // a guard.
      return followingCount(state, playerId, count, effect);
    default: {
      const unhandled: never = count;
      void unhandled;
      return 0;
    }
  }
}

/**
 * The seven `following…` counts, over one sweep of `state.cities`.
 *
 * `cityReligion` is derived from the citizens, so this cannot disagree with the
 * banner a town flies; `state.cities` is founding order, which is what makes the
 * count an outcome the state's own order decides. **Empires** are counted
 * through a list rather than a `Set`, for the determinism rule — nothing in this
 * game iterates a `Set` — even though a count is order-blind, because the shape
 * of the loop is what the next person copies.
 *
 * "The religion this empire founded" became **the religions whose holy city this
 * empire holds** with the 2026-08-28 ruling, because these counts exist to size
 * the founder's trickle and the trickle follows the stones. A conqueror holding
 * two seats counts both tides; a founder who has lost his holy city counts
 * neither, which is the whole of what losing it costs.
 */
function followingCount(
  state: GameState,
  playerId: number,
  count: CountKind,
  effect: CardPaysEffect,
): number {
  const held = heldReligions(state, playerId);
  if (held.length === 0) return 0;
  const follows = (city: City): boolean => {
    const followed = cityReligion(city);
    return followed !== null && held.some((religion) => religion.id === followed);
  };
  let cities = 0;
  let foreign = 0;
  let population = 0;
  let withBuilding = 0;
  let withWonder = 0;
  let shelved = 0;
  const empires: number[] = [];
  for (const city of state.cities) {
    if (!follows(city)) continue;
    cities += 1;
    population += city.population;
    if (city.ownerId !== playerId) foreign += 1;
    if (effect.building !== undefined && city.buildings.includes(effect.building)) {
      withBuilding += 1;
    }
    // **The town, once, however many marvels stand in it** — the count is of
    // cities that hold one, so the walk stops at the first. Off the town's own
    // shelf rather than off `state.wonders`, which is what makes a captured
    // marvel change this count with the flag over it.
    if (city.buildings.some((id) => isWonder(id))) withWonder += 1;
    // **The buildings, not the towns**: every roof of the named shelf in every
    // following city. A line naming no category counts nothing, which is the
    // count's own stated answer for a question that never said which.
    if (effect.category !== undefined) {
      for (const id of city.buildings) {
        if (buildingDef(id).category === effect.category) shelved += 1;
      }
    }
    if (!empires.includes(city.ownerId)) empires.push(city.ownerId);
  }
  if (count === 'followingForeign') return foreign;
  if (count === 'followingPop') return population;
  if (count === 'followingEmpires') return empires.length;
  if (count === 'followingWithBuilding') return effect.building === undefined ? 0 : withBuilding;
  if (count === 'followingCitiesWithWonder') return withWonder;
  if (count === 'followingBuildingsOfCategory') return shelved;
  return cities;
}

/**
 * Improved seams of one kind, at whichever scale the line asks for.
 *
 * The body `improvedBonusResources` always had, lifted the day a second kind
 * wanted it (Shen Kuo's strategics), because the *reading* is the subtle part
 * and two copies of it would drift: at empire scale the count is of **copies**
 * — two improved wheat fields are two — and at town scale it is of **holdings**,
 * which is the uniqueness reading every city-scale resource question already
 * takes (`resourceEffects.ts`). One helper, so a card that names bonus seams and
 * one that names strategic seams can never disagree about what "improved" means.
 */
function improvedResources(
  state: GameState,
  playerId: number,
  kind: ResourceKind,
  effect: CardPaysEffect,
  city?: City,
): number {
  if (effect.within === 'city') {
    return city ? cityResources(state, city, kind).length : 0;
  }
  let total = 0;
  for (const id of controlledResources(state, playerId, kind)) {
    total += resourceCopies(state, playerId, id);
  }
  return total;
}

/** The combat units standing in a city, in `state.units` order. */
function garrisonOf(state: GameState, city: City): Unit[] {
  const list: Unit[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== city.ownerId) continue;
    if (unit.col !== city.col || unit.row !== city.row) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    list.push(unit);
  }
  return list;
}

/**
 * What a `pays` rate reads.
 *
 * The three `…PerTurn` sources are handed in by `collectYields`, which has just
 * computed them — asking the yields again here would be a second sweep of every
 * city and a second answer. The two meter sources are read live, and only their
 * **positive** part counts: "per point of positive happiness" is what the cards
 * say, and a conversion that paid a malus would be a card that rewards misery.
 */
export interface EmpireRates {
  faithPerTurn?: number;
  culturePerTurn?: number;
  goldPerTurn?: number;
  /** What the **capital** banked in faith this turn. Theocracy's tithe. */
  capitalFaithPerTurn?: number;
  /**
   * What the towns that **keep this empire's faith** banked in faith this turn.
   * Cuius Regio's, read off the same sweep for `capitalFaithPerTurn`'s reason.
   */
  followingFaithPerTurn?: number;
  /**
   * What the empire banked in **science** this turn — the great scholar's act
   * (`actGainOf`, `greatPeople.ts`), which pays a few turns of it.
   *
   * The one member of this reading that **no `RateSource` names**, and that is
   * deliberate rather than an omission: the ratified card table asks for gold,
   * culture and three shapes of faith, and a source declared for a card nobody
   * wrote would be exactly the dead vocabulary the register test refuses. What
   * the act needed was not a new card shape but the *same books* — "what am I
   * making per turn" answered once, by `foldEmpireRates`, so a great person's
   * beakers and a conversion's coin cannot disagree about what a turn is worth.
   * The day a card wants to convert science, it says `sciencePerTurn` in
   * `RateSource` and reads this field that already exists.
   */
  sciencePerTurn?: number;
  /**
   * What the empire's towns made in **food** and in **hammers** this turn — the
   * two voices that have no empire bank at all (`collectYields` has nowhere to
   * put them) and are therefore read rather than banked.
   *
   * `sciencePerTurn`'s siblings and here for its stated reason: no `RateSource`
   * names either, because a `pays` rate is quoted out of what an empire
   * *banked* and these are not banked anywhere. What wanted them is
   * `CountKind`'s `empireYield` — Horology's "science equal to your empire-wide
   * production" — which asks the books rather than sweeping the towns a second
   * time, so a periodic boon and a city's own sheet cannot disagree about what a
   * turn is worth.
   */
  productionPerTurn?: number;
  foodPerTurn?: number;
}

/**
 * What one turn of a voice is worth to this empire, as the exact figure.
 *
 * **Unfloored since batch X.** It used to floor every rate, on the reading that
 * a rate is a *count* of helpings; it is both — `helpings` divides it and floors
 * the quotient itself (so a count is unchanged), while a `fromRate` grant
 * multiplies it and used to throw away everything under a whole point. A fifth
 * of a turn's culture in an empire making four is 0.8, and 0.8 is what The
 * Natural Philosophers now pays.
 *
 * The two meters keep their own reading below: they are not yields.
 */
function rateOf(
  state: GameState,
  playerId: number,
  from: RateSource,
  rates: EmpireRates,
): number {
  switch (from) {
    case 'faithPerTurn':
      return Math.max(0, rates.faithPerTurn ?? 0);
    case 'capitalFaithPerTurn':
      return Math.max(0, rates.capitalFaithPerTurn ?? 0);
    case 'followingFaithPerTurn':
      return Math.max(0, rates.followingFaithPerTurn ?? 0);
    case 'culturePerTurn':
      return Math.max(0, rates.culturePerTurn ?? 0);
    case 'goldPerTurn':
      return Math.max(0, rates.goldPerTurn ?? 0);
    case 'happiness':
      return Math.max(0, happinessReading(state, playerId));
    case 'authority':
      return Math.max(0, authorityReading(state, playerId));
    default: {
      const unhandled: never = from;
      void unhandled;
      return 0;
    }
  }
}

/**
 * The counts that are asked **of a town** rather than of an empire.
 *
 * The register for the one reader that has to know the difference
 * (`cardHappiness`, which sums a city count across the realm). `countOf` answers
 * 0 for a city count with no city, so this is about *which question* rather than
 * about a guard — and it is a list rather than a chain of `||` so that a count
 * added to the union is added here beside it.
 */
export const CITY_SCOPED_COUNTS: readonly CountKind[] = [
  'garrison',
  'garrisonWatch',
  'workedHills',
  'scienceBuildings',
  'buildingsInCity',
  'workedTilesInCity',
  'workedUnimprovedTiles',
  'defensiveBuildings',
];

/**
 * Is *this line* asked of a town rather than of a realm?
 *
 * The register above says which counts can only ever be asked of a town;
 * `within: 'city'` is a **line** narrowing a count that could be asked either
 * way (the Temple of Artemis' bonus resources), so the question is about the
 * effect and not only about the `CountKind`. One predicate, so a reader that
 * sums across the empire's towns and one that is handed a single town agree
 * about which is which.
 */
function isCityScopedCount(effect: CardPaysEffect): boolean {
  if (effect.within === 'city') return true;
  return effect.count !== undefined && CITY_SCOPED_COUNTS.includes(effect.count);
}

/**
 * A `pays` row's basis, with the default spelt — batch E5's one reading of an
 * absent field.
 *
 * `'flat'` is the default because the four flat kinds are most of the table and
 * a row saying nothing is saying "the bag above" (`CardPaysEffect`). Read
 * wherever an arm asks "is this mine", so the default lives in one place rather
 * than in eleven `?? 'flat'`s that could drift apart.
 */
function basisOf(effect: CardPaysEffect): PayBasis {
  return effect.basis ?? 'flat';
}

/**
 * Does this row's helping pay one of the **six voices**, as a flat figure?
 *
 * The one question the count, mirror, share and rate bases all have to ask
 * before they touch `to`: a helping may pay a meter (`happiness`, `authority`)
 * or a percentage (`stage`), and neither of those belongs in a yield fold. Said
 * once, so the town's arm and the empire's cannot draw the line differently —
 * which is exactly what `pays.to !== 'yield'` did for them before E5.
 */
function paysAVoice(effect: CardPaysEffect): boolean {
  if (effect.stage !== undefined) return false;
  const to = effect.to;
  return to !== undefined && to !== 'happiness' && to !== 'authority';
}

/** How many helpings a count (or a rate) buys, capped where the design caps it. */
function helpings(total: number, per: number | undefined, max: number | undefined): number {
  const step = per === undefined || per <= 0 ? 1 : per;
  let count = Math.floor(total / step);
  if (max !== undefined) count = Math.min(count, max);
  return Math.max(0, count);
}

// --- flat yields ------------------------------------------------------------

/** One line of what a card pays, in all six voices. `ResourceYieldLine`'s twin. */
export interface CardYieldLine {
  card: CardId;
  source: string;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

function emptyLine(card: CardId, source: string): CardYieldLine {
  return { card, source, food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
}

export const VOICES: readonly CityYieldKey[] = [
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
];

/** True when a line pays nothing at all. Such lines are never in a list. */
function paysSomething(line: CardYieldLine): boolean {
  return VOICES.some((key) => line[key] !== 0);
}

/**
 * Every flat yield this empire's cards pay **this city**: the town `pays`
 * shapes a scope admits, then every city-scoped `pays` count payout.
 *
 * Folded into `foldCity` exactly as `cityResourceYields` is, and printed line
 * by line by the city panel — one list, one fold, rule 5.
 */
export function explainCardCityYields(state: GameState, city: City): CardYieldLine[] {
  const owner = city.ownerId;
  const list: CardYieldLine[] = [];

  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'pays')) {
    if (effect.where !== 'city' || basisOf(effect) !== 'flat') continue;
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    const line = emptyLine(card, label(source, scopeNote(effect.scope)));
    for (const key of VOICES) line[key] = (effect[key] ?? 0);
    if (paysSomething(line)) list.push(line);
  }

  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'pays')) {
    if (effect.basis !== 'count' || !paysAVoice(effect)) continue;
    if (effect.where === 'empire') continue;
    // **`capital` is a city line that lands in one town**, and it is read here
    // rather than in the empire fold because that is the only place a voice the
    // empire has no bank for can be paid at all: `collectYields` banks an empire
    // line as gold, science, culture or faith and drops food and production on
    // the floor, having no basket to put them in. The Guild Charter's hammers
    // are the first row to want one, so the seat of government is where they
    // land — one town, counted once, exactly as the card's own words say.
    if (effect.where === 'capital' && capitalCityOf(state, owner)?.id !== city.id) continue;
    const times = helpings(countOf(state, owner, card, effect, city), effect.per, effect.max);
    if (times === 0) continue;
    const line = emptyLine(card, label(source, `×${times}`));
    line[effect.to as CityYieldKey] = (effect.amount ?? 0) * times;
    if (paysSomething(line)) list.push(line);
  }

  // One voice paid again as another, off the buildings of one category — The
  // Curia's science out of its shrines. A **flat** line like the two above it, so
  // it lands before Entry XVII's percentages: a mirrored beaker is worth what a
  // library's beaker is worth, and staging it twice would be paying a science
  // bonus on faith. The sum is the buildings' own figures and never the town's
  // total — see `CardPaysEffect`.
  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'pays')) {
    if (effect.basis !== 'mirror' || effect.from === undefined || !paysAVoice(effect)) continue;
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    let mirrored = 0;
    for (const id of city.buildings) {
      const def = buildingDef(id);
      if (def.category !== effect.category) continue;
      mirrored += def[effect.from] ?? 0;
    }
    if (mirrored === 0) continue;
    const line = emptyLine(card, label(source, `${effect.from} → ${effect.to}`));
    line[effect.to as CityYieldKey] = mirrored;
    if (paysSomething(line)) list.push(line);
  }

  // **The deck reading itself**, last and off a snapshot of everything above it.
  // See `deckModifierLines`: the engines are computed from the fold *as it stood
  // before any engine spoke*, so two of them cannot amplify each other and their
  // order cannot change what either pays.
  for (const line of deckModifierLines(state, owner, list, city)) list.push(line);

  return list;
}

/**
 * **What the deck's engines add to a fold of card lines** — the additive
 * amplifier by voice (`cardYieldAmplifier`) and the position reader
 * (`slotPosition`), as their own labelled lines.
 *
 * One function over both folds, so "your Orders that give food give an
 * additional food" means the same thing to a town's sheet and to the empire's
 * books, and a third caller (the ground, `cardTileLines`) reads the same rules
 * through `tileAmplifierLines`.
 *
 * Three disciplines, all of them stated on the shapes and pinned by fixtures:
 *
 *   · **`base` is a snapshot.** Every engine reads the list as it stood before
 *     any engine spoke, so two amplifiers never compound and their order in the
 *     walk cannot change what either pays — `cardYieldConversions`' rule, one
 *     list over;
 *   · **the Orders' lines only, never its own.** The ruled sentence is *your
 *     Orders*; a government's signature, a wonder and a technology are not things
 *     a player arranged in a chair, and a card that read its own line would be an
 *     engine feeding itself;
 *   · **per line instance.** The flat is paid once per amplified line, which is
 *     what makes the additive form stack with a card that already dresses forty
 *     hexes — the user's stated reason for additive being the default.
 *
 * `city` is the town the fold belongs to, or absent for the empire's books; an
 * amplifier naming a `scope` is a fact about a town's ledger and pays nothing at
 * all in the empire fold, which is the honest reading rather than a guess about
 * where an empire line "is".
 */
function deckModifierLines(
  state: GameState,
  playerId: number,
  base: readonly CardYieldLine[],
  city?: City,
): CardYieldLine[] {
  const out: CardYieldLine[] = [];
  const live = city
    ? cityEffectsOfKind(state, city, 'cardYieldAmplifier')
    : effectsOfKind(state, playerId, 'cardYieldAmplifier');
  for (const { source, card, effect } of live) {
    if (effect.scope !== undefined && (!city || !cityScopeAdmits(state, city, effect.scope))) {
      continue;
    }
    const line = emptyLine(card, source);
    let instances = 0;
    for (const paid of base) {
      if (paid.card === card || !isOrderId(paid.card)) continue;
      let touched = false;
      for (const voice of VOICES) {
        if (effect.yield !== 'all' && effect.yield !== voice) continue;
        if (paid[voice] <= 0) continue;
        touched = true;
        line[voice] += (effect.amount ?? 0) + (paid[voice] * (effect.percent ?? 0)) / 100;
      }
      if (touched) instances += 1;
    }
    if (instances === 0 || !paysSomething(line)) continue;
    out.push({
      ...line,
      source: label(
        label(source, scopeNote(effect.scope)),
        `${instances} line${instances === 1 ? '' : 's'}`,
      ),
    });
  }

  const sc = statecraftOf(state, playerId);
  const positions = city
    ? cityEffectsOfKind(state, city, 'slotPosition')
    : effectsOfKind(state, playerId, 'slotPosition');
  for (const { source, card, effect } of positions) {
    if (!sc) continue;
    const seated = orderAtSlotPosition(sc, effect.position, effect.slot);
    // A chair that is empty, does not exist, or holds this very card pays
    // nothing: an engine that read its own line would be an engine feeding
    // itself, exactly as an amplifier that read its own would.
    if (seated === null || seated === card) continue;
    const extra = effect.factor - 1;
    if (extra === 0) continue;
    const line = emptyLine(card, label(source, orderDef(seated).name));
    for (const paid of base) {
      if (paid.card !== seated) continue;
      for (const voice of VOICES) {
        if (paid[voice] === 0) continue;
        line[voice] += paid[voice] * extra;
      }
    }
    if (paysSomething(line)) out.push(line);
  }
  return out;
}

/**
 * Every flat yield this empire's cards pay **the empire**, once: empire `pays`,
 * the empire-scoped `pays` count payouts, and every `pays` rate.
 *
 * Banked once per player by `collectYields` after every city has collected,
 * which is the whole difference between an empire line and a per-city one.
 * `rates` carries the turn's totals the phase has just computed — see
 * `EmpireRates` for why they are handed in rather than asked for again.
 *
 * **It may be handed a thunk instead** (batch H18), and that is the whole of
 * what `foldEmpireRates`'s docblock always promised: a rate reading prices
 * every town in the empire, and only the `pays` rate arm below reads one.
 * A caller with the turn's totals already in hand passes them; a caller that
 * would have to *take* the reading passes the taking, and an empire holding no
 * such card never pays for it. Resolved at most once, so two conversions read
 * one set of books exactly as they did when the reading was taken up front.
 */
export function explainCardEmpireYields(
  state: GameState,
  playerId: number,
  rates: EmpireRates | (() => EmpireRates) = {},
): CardYieldLine[] {
  const list: CardYieldLine[] = [];
  let taken: EmpireRates | undefined = typeof rates === 'function' ? undefined : rates;
  const reading = (): EmpireRates =>
    (taken ??= typeof rates === 'function' ? rates() : rates);

  for (const { source, card, effect } of effectsOfKind(state, playerId, 'pays')) {
    if (effect.where !== 'empire' || basisOf(effect) !== 'flat') continue;
    const line = emptyLine(card, source);
    for (const key of VOICES) line[key] = (effect[key] ?? 0);
    if (paysSomething(line)) list.push(line);
  }

  for (const { source, card, effect } of effectsOfKind(state, playerId, 'pays')) {
    if (effect.basis !== 'count' || !paysAVoice(effect)) continue;
    // `capital` is a **city** line (see `explainCardCityYields`), so it leaves here with
    // `city`: an empire fold that also paid it would pay it twice.
    if (effect.where === 'city' || effect.where === 'capital') continue;
    const times = helpings(countOf(state, playerId, card, effect), effect.per, effect.max);
    if (times === 0) continue;
    const line = emptyLine(card, label(source, `×${times}`));
    line[effect.to as CityYieldKey] = (effect.amount ?? 0) * times;
    if (paysSomething(line)) list.push(line);
  }

  for (const { source, card, effect } of effectsOfKind(state, playerId, 'pays')) {
    if (effect.basis !== 'rate' || effect.fromRate === undefined || !paysAVoice(effect)) continue;
    const times = helpings(
      rateOf(state, playerId, effect.fromRate, reading()),
      effect.per,
      undefined,
    );
    if (times === 0) continue;
    const line = emptyLine(card, label(source, `×${times}`));
    line[effect.to as CityYieldKey] = (effect.amount ?? 0) * times;
    if (paysSomething(line)) list.push(line);
  }

  // The deck's engines over the empire's own lines, off a snapshot of everything
  // above. See `deckModifierLines`; a scoped amplifier pays nothing here, an
  // empire line having no town to be scoped to.
  for (const line of deckModifierLines(state, playerId, list)) list.push(line);

  return list;
}

/**
 * A share of what this town already makes, paid again as another voice —
 * Thalassocracy's tenth of the harvest, minted.
 *
 * Its own function rather than a fourth loop inside `explainCardCityYields` because it
 * is the one card line that **reads the fold it joins**: the flats have to be
 * complete before a share of them can be taken, so it is asked at the end of
 * `explainCity` with that town's own total handed in. Handed in, never taken —
 * asking `foldCity` from here would call `explainCity`, which calls this, which
 * would ask again.
 *
 * See `CardPaysEffect` for why the flats are the honest reading of
 * "their food yield". The share is floored **per city** and per line: two
 * conversions on one town pay for two shares rather than rounding into a free
 * point, which is `explainCityBuildings`' per-entry floor read one table over.
 * Every line is computed off the **same** handed-in fold, so two conversions
 * never read each other and their order cannot change what either pays. A voice
 * standing at less than nothing pays nothing — a town in arrears is not a mint,
 * and a conversion that charged for a shortfall would be a second rule.
 */
export function cardYieldConversions(
  state: GameState,
  city: City,
  flats: Readonly<Record<CityYieldKey, number>>,
): CardYieldLine[] {
  const list: CardYieldLine[] = [];
  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'pays')) {
    if (effect.basis !== 'share' || effect.from === undefined || !paysAVoice(effect)) continue;
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    const paid = (Math.max(0, flats[effect.from]) * (effect.percent ?? 0)) / 100;
    if (paid === 0) continue;
    const line = emptyLine(card, label(source, `${effect.from} → ${effect.to}`));
    line[effect.to as CityYieldKey] = paid;
    if (paysSomething(line)) list.push(line);
  }
  return list;
}

/**
 * One share a card puts on **a class of buildings' own yields**, as the fold in
 * `cities.ts` needs to read it — the "faith buildings +50%" engine and the
 * doublers (`CardBuildingYieldPercentEffect`).
 *
 * `CardPercentLine`'s shape one ledger down, and the split is the same bargain
 * `TileLine` strikes with the tile chain: this module is the only one that knows
 * what a `CardEffect` looks like, and `cities.ts` is the only one that knows what
 * a building pays. So the card table hands over the *shares* and the building
 * fold applies them to the entries it already has in hand — no second reading of
 * `BuildingDef.yields` comes into existence, and `cities.ts` still switches on no
 * `kind`.
 *
 * `matches` is the selector, answered here so the caller never has to know what
 * `category` and `pays` mean together: see the shape for why a *faith building*
 * is read as "a row that pays faith" rather than off the seven-word category.
 */
export interface CardBuildingPercentLine {
  card: CardId;
  source: string;
  /** The share, in whole percent. */
  percent: number;
  /** Taken over the building's total including the ordinary shares. */
  appliedLast: boolean;
  /** Does this share reach that building? `category` and `pays`, folded. */
  matches: (id: BuildingId) => boolean;
  /** Which of the building's voices it raises. Absent means every one. */
  yield?: CityYieldKey | 'all';
}

/**
 * Every `buildingYieldPercent` this empire's cards put on **this town's**
 * shelves, in walk order — the ordinary shares first, then the ones taken last,
 * which is the order `cities.ts` applies them in.
 *
 * A city reading, because the scope is a question about a town and because a
 * building stands in one: the Synod raises the faith houses of every city and the
 * Heroic Epic's kin raise one, and both are this one list asked per town.
 */
export function cardBuildingPercents(state: GameState, city: City): CardBuildingPercentLine[] {
  const ordinary: CardBuildingPercentLine[] = [];
  const last: CardBuildingPercentLine[] = [];
  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'buildingYieldPercent')) {
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    if (effect.percent === 0) continue;
    const line: CardBuildingPercentLine = {
      card,
      source: label(source, scopeNote(effect.scope)),
      percent: effect.percent,
      appliedLast: effect.appliedLast === true,
      yield: effect.yield,
      matches: (id) => buildingMatchesYieldPercent(id, effect),
    };
    (line.appliedLast ? last : ordinary).push(line);
  }
  return [...ordinary, ...last];
}

/**
 * Which buildings a `buildingYieldPercent` reaches — the four selectors, folded.
 *
 * `category` is what a row is *for* (`BuildingDef.category`); `pays` is the voice
 * its row actually **pays**, which is what a card means by "your faith
 * buildings" — `CityScope`'s `hasBuildingYielding` asks the same question of a
 * town and answers it the same way, through the one reading of the phrase
 * (`buildingPaysVoice`, `buildingData.ts`). `building` names one row and
 * `wonder` names the marvels, the two the great-person pass added: see the shape
 * for why each earns a field rather than being said with a category.
 *
 * **Every selector a row names must hold** — one `&&` chain and no precedence, so
 * "the temples" and "the wonders that pay culture" are the same rule read with
 * different fields filled in. Naming none reaches every building the town has
 * raised, which is the honest reading of a card that named no class rather than a
 * guard.
 */
export function buildingMatchesYieldPercent(
  id: BuildingId,
  effect: CardBuildingYieldPercentEffect,
): boolean {
  if (effect.building !== undefined && effect.building !== id) return false;
  // The class the data declares, never a name and never an eighth category —
  // `CountKind`'s `wonders` asked of one row. Absent reaches the marvels too.
  if (effect.wonder === true && !isWonder(id)) return false;
  if (effect.category !== undefined && buildingDef(id).category !== effect.category) return false;
  return effect.pays === undefined || buildingPaysVoice(id, effect.pays);
}

/** Does this scope name **this** building — `hasBuilding` on it, alone or inside an `all`? */
function scopeNamesBuilding(scope: CityScope | undefined, id: BuildingId): boolean {
  if (scope === undefined) return false;
  if (scope.test === 'hasBuilding') return scope.building === id;
  if (scope.test === 'all') return scope.of.some((inner) => scopeNamesBuilding(inner, id));
  return false;
}

/**
 * **What the law adds to one building's own yield** — every town `pays` line
 * in this town whose scope names the building (a follower belief's science on
 * a temple, The Choir's culture, a legacy's faith), summed per voice.
 *
 * The user, 2026-09-07: *"the Synod — your faith buildings provide 50% more
 * yields — it should count my religion bonuses on my temples, and great
 * people improvements to temples."* A `buildingYieldPercent` used to take its
 * share of the building's **row** alone; a temple carrying two beliefs and an
 * Order was still "a temple" to it. The building's yield is its row plus what
 * the law put on it by name, and that is the figure the share is taken of.
 * These lines are banked once as the cards' own (`explainCardCityYields`); this
 * reading is only what the share is *over*, never a second banking. A line
 * that reaches the town by some other door (`hasBuildingYielding`, a
 * category `pays` mirror) is a fact about the town, not about the temple, and
 * is deliberately not here.
 */
export function cardLinesOnBuilding(
  state: GameState,
  city: City,
  id: BuildingId,
): Record<CityYieldKey, number> {
  const total: Record<CityYieldKey, number> = {
    food: 0,
    production: 0,
    gold: 0,
    science: 0,
    culture: 0,
    faith: 0,
  };
  for (const { effect } of cityEffectsOfKind(state, city, 'pays')) {
    if (effect.where !== 'city' || basisOf(effect) !== 'flat') continue;
    if (!scopeNamesBuilding(effect.scope, id)) continue;
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    for (const key of VOICES) total[key] += effect[key] ?? 0;
  }
  return total;
}

/** The fold of any list of card-yield lines. The only sum of them. */
export function foldCardYields(list: readonly CardYieldLine[]): Record<CityYieldKey, number> {
  const total: Record<CityYieldKey, number> = {
    food: 0,
    production: 0,
    gold: 0,
    science: 0,
    culture: 0,
    faith: 0,
  };
  for (const line of list) {
    for (const key of VOICES) total[key] += line[key];
  }
  return total;
}

// --- tile yields ------------------------------------------------------------

/**
 * One source's line on a **hex**, as `explainTileYield` needs to read it.
 *
 * THE shape that crosses into the tile chain, and it is carried on
 * `TileYieldContext` rather than looked up there for that chain's stated reason:
 * `explainTileYield` knows about a tile and a context and nothing else — no
 * `GameState`, no player, no card table. So the context carries the *answer*
 * ("this empire pays +1 food on a hex with a resource on it") and the tile chain
 * only has to ask whether the hex qualifies.
 *
 * Three producers now write one of these and they are deliberately the same
 * shape (Entry XXVII): a card's hex `pays` (`cardTileLines`, below), a
 * building's `tileYields` (`buildingTileLines`, `buildingEffects.ts`) and a
 * luxury's `improvementYields` (`resourceTileLines`, `resourceEffects.ts`). The
 * tile chain folds one list and has no idea which of the three a line came from,
 * which is exactly what makes a fourth producer a data row.
 */
export interface TileLine {
  source: string;
  on: TileCondition;
  /**
   * The card that wrote this line, for the producers that have one — every
   * hex `pays` clause reaching the ground through `tileLinesFrom`, and the
   * amplifier's helping beside it. A resource's line and a granary's water line
   * carry none: they are the seam's and the stones', not a card's.
   *
   * Carried for the Ledger, and the reason is the same one `CityYieldPercent`
   * grew a `card` for on the same day (`docs/flags.md`, ruling jj, and the
   * user's follow-up: *"the age 3 and onwards orders are not being counted in
   * the display total"*). The later Order pools lean on hex `pays` where the
   * early ones lean on town `pays`, and a card's food on a hex lands in the
   * hex's own breakdown — so the whole of a late deck was being credited to
   * **the land**. A line that cannot name its card cannot be credited to it.
   */
  card?: CardId;
  /**
   * A percentage on **what the hex's improvement already pays**, where the six
   * voices below are a flat addition. See `CardPaysEffect.percent`, which
   * carries the whole argument; absent on every producer but a card, because a
   * granary's water line and a luxury's signature both pay flats.
   *
   * Read in `explainTileYield` (`cities.ts`) as one more labelled line of the
   * breakdown, computed off the improvement's own entries, so the list still
   * folds to the total.
   */
  percent?: number;
  /**
   * A percentage on **what the hex's own ground already pays** — its terrain,
   * the hill or canopy over it, and the seam in it — where `percent` above
   * reaches the works. See `CardPaysEffect.basePercent`, which carries the
   * whole argument; absent on every producer but a card, for `percent`'s reason.
   *
   * Read in `explainTileYield` (`cities.ts`) as one more labelled line of the
   * breakdown, computed off the entries that came before the works.
   */
  basePercent?: number;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

/** The name this shape had when Statecraft was its only producer. */
export type CardTileLine = TileLine;

/**
 * Does this hex satisfy a tile condition? One evaluator, like every other.
 *
 * `paid` is **what the hex has been reckoned to pay so far**, handed in by the
 * one caller that has a breakdown in hand (`explainTileYield`) and read by the
 * one condition that asks about worth rather than about substance
 * (`TileCondition`'s `yields`). Every other caller — a building's `tileYields`,
 * a luxury's `improvementYields` — passes nothing and that condition answers no,
 * which is the honest reading rather than an omission: a granary cannot ask what
 * a hex is worth, because what a hex is worth is partly the granary.
 *
 * It is a **thunk rather than a reading**, and that is a performance decision
 * with teeth: this predicate is asked millions of times a turn, the fold behind
 * the answer is a walk of the hex's whole breakdown, and almost no game holds a
 * card that asks. So the caller hands in *how to get it* and the one arm that
 * wants it is the only thing that ever calls.
 */
export function tileConditionHolds(
  tile: Tile,
  on: TileCondition,
  paid?: () => Partial<Record<CityYieldKey, number>>,
): boolean {
  const test = on.test;
  switch (test) {
    case 'hasResource':
      return tile.resource !== undefined;
    case 'hills':
      return tile.hills;
    case 'feature':
      return tile.feature === on.feature;
    case 'anyFeature':
      // The `or` the composite does not have, said as a list — `resource`'s
      // reading one field over, asked of `Tile.feature`.
      return on.features.includes(tile.feature);
    case 'improved':
      return tile.improvement !== undefined;
    case 'unimproved':
      // `improved`'s mirror, asked of the same field: **presence is the state**,
      // so ground whose works were pillaged away is unimproved again — which is
      // the reading the 🌿 ladder's cards want.
      return tile.improvement === undefined;
    case 'water':
      return isWaterTerrain(tile.terrain);
    case 'improvement':
      return tile.improvement === on.improvement;
    case 'anyImprovement':
      // The `or` the composite does not have, said as a list — `anyFeature`'s
      // reading one field over, asked of `Tile.improvement`. Bare ground is
      // absent from the field and matches nothing, which is `unimproved`'s
      // reading of the same absence from the other side.
      return tile.improvement !== undefined && on.improvements.includes(tile.improvement);
    case 'greatWork':
      // Asked of the improvement table's own marker (`greatPerson`, presence is
      // the marker), never of a list of five names — so the sixth work joins
      // The Commonwealth with nothing here touched.
      return tile.improvement !== undefined && isGreatPersonWork(tile.improvement);
    case 'terrain':
      return tile.terrain === on.terrain;
    case 'resourceKind': {
      const id = tile.resource;
      if (id === undefined) return false;
      const def = resourceDef(id);
      if (def.kind !== on.kind) return false;
      // "a bonus resource **that provides food**" — asked of the resource's own
      // row rather than spelled into the belief, so retuning wheat retunes the
      // goddess with it.
      if (on.yields === undefined) return true;
      return resourceYield(id)[on.yields] > 0;
    }
    case 'resource':
      return tile.resource !== undefined && on.resources.includes(tile.resource);
    case 'freshwater':
      return tile.freshwater;
    case 'adjacentMountain':
      // Off the ground's own baked answer (`Tile.mountainAdjacent`), never off a
      // walk of the neighbours: this predicate has a tile and no map, which is
      // exactly why the mark exists. Absence is `false`, `resource`'s reading.
      return tile.mountainAdjacent === true;
    case 'yields':
      // **Off the breakdown the caller already built**, never off a second
      // reading of the ground. A caller with nothing to hand in answers no —
      // see the condition, and `CardRulePercentEffect.scope`'s bargain.
      return (paid?.()[on.yield] ?? 0) > 0;
    case 'all': {
      for (const inner of on.of) {
        if (!tileConditionHolds(tile, inner, paid)) return false;
      }
      return true;
    }
    default: {
      const unhandled: never = test;
      void unhandled;
      return false;
    }
  }
}

/**
 * Does this condition **read the fold** — ask what the hex already pays —
 * rather than the ground alone? `explainTileYield` lands the lines that do not
 * ask first and the lines that do second, so a belief's faith on a desert hex
 * is there to be read by an Order that pays on faith (the user, 2026-09-07).
 * The one reader is `yields`; `all` asks its parts.
 */
export function tileConditionReadsFold(on: TileCondition | undefined): boolean {
  if (on === undefined) return false;
  if (on.test === 'yields') return true;
  if (on.test === 'all') return on.of.some((inner) => tileConditionReadsFold(inner));
  return false;
}

/**
 * Every hex `pays` line this empire's cards put on the ground, for the context
 * a tile evaluation carries.
 *
 * Computed once per context rather than once per tile: `yieldContextFor` builds
 * it, and a city sweeping twenty hexes asks the card table once.
 */
export function cardTileLines(state: GameState, playerId: number): CardTileLine[] {
  // **Unscoped lines only.** A `scope` is a question about the *owning city*,
  // and this pass has no city in hand — the same reason a granary's water line
  // cannot be resolved here (`TileYieldContext.lines`). The scoped ones are
  // added by `scopedCardTileLines` from `cityContext`, which does.
  const found = hexRows(pickKind(liveEffects(state, playerId), 'pays')).filter(
    ({ effect }) => effect.scope === undefined,
  );
  const lines = tileLinesFrom(found);
  // The additive amplifier reaching the **ground** — the user's own reason for
  // additive being the default ("so it stacks with '+1 food on each resource
  // hex' hex by hex"). See `tileAmplifierLines`.
  for (const line of tileAmplifierLines(state, playerId, found)) lines.push(line);
  return lines;
}

/**
 * **The amplifier's helping on every hex an Order already dresses** — one more
 * line of the same shape, on the same condition, so the tile chain folds it with
 * everything else and has no idea an engine spoke.
 *
 * This is the clause that makes the additive form worth writing: *"your Orders
 * that give food give an additional food"* against a card paying +1🌾 on every
 * resource hex is +1🌾 on every resource hex again, hex by hex, and no
 * multiplication anywhere could have said that.
 *
 * Two cuts, both deliberate and both stated on `CardYieldAmplifierEffect`:
 *
 *   · **an amplifier naming a `scope` reaches no ground at all.** A scope is a
 *     question about a town and this pass has none in hand — a granary's water
 *     line cannot be resolved here for exactly the same reason;
 *   · **the scoped tile lines are not amplified either** (`scopedCardTileLines`).
 *     They already name which town they landed in, and a second scope question on
 *     one fold would be two answers to one question.
 *
 * The percentage variant is taken off the line's own printed figure and floored
 * per voice, exactly as it is in the ledger folds.
 */
function tileAmplifierLines(
  state: GameState,
  playerId: number,
  found: readonly {
    source: string;
    card: CardId;
    effect: CardPaysEffect & { on: TileCondition };
  }[],
): CardTileLine[] {
  const out: CardTileLine[] = [];
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'cardYieldAmplifier')) {
    if (effect.scope !== undefined) continue;
    for (const dressed of found) {
      if (dressed.card === card || !isOrderId(dressed.card)) continue;
      const line: CardTileLine = {
        source: label(source, tileConditionWords(dressed.effect.on)),
        // **The amplifier's own card, not the card it read.** The helping is
        // the engine's doing — it is what the engine is for — and a Ledger that
        // credited it to the dressed Order would be crediting the same slice
        // twice over on the day the two sit in different classes.
        card,
        on: dressed.effect.on,
        food: 0,
        production: 0,
        gold: 0,
        science: 0,
        culture: 0,
        faith: 0,
      };
      let touched = false;
      for (const voice of VOICES) {
        if (effect.yield !== 'all' && effect.yield !== voice) continue;
        const paid = dressed.effect[voice] ?? 0;
        if (paid <= 0) continue;
        touched = true;
        line[voice] += (effect.amount ?? 0) + (paid * (effect.percent ?? 0)) / 100;
      }
      if (touched && VOICES.some((voice) => line[voice] !== 0)) out.push(line);
    }
  }
  return out;
}

/**
 * The hex `pays` lines this empire's cards put on **one town's** ground — the
 * lines whose `scope` names which cities they land in.
 *
 * `timedCityTileLines`' sibling, and it joins `cityContext` for the same reason:
 * "the ground of the city that holds the Hanging Gardens" is a fact about one
 * town, and only a caller holding that town can resolve it. Petra's desert and
 * the Gardens' irrigated farms are both written `hasBuilding` on the wonder's
 * own row, so the answer follows the stones when a town changes hands.
 */
export function scopedCardTileLines(state: GameState, city: City): CardTileLine[] {
  return tileLinesFrom(
    hexRows(pickKind(liveEffects(state, city.ownerId), 'pays'))
      .filter(
        ({ effect }) =>
          effect.scope !== undefined && cityScopeAdmits(state, city, effect.scope),
      )
      // Labelled with where it landed, exactly as a scoped town `pays` line is.
      .map((entry) => ({ ...entry, source: label(entry.source, scopeNote(entry.effect.scope)) })),
  );
}

/**
 * The hex `pays` lines **this city's own rites** put on its ground — the fifth
 * producer of a `TileLine` (Entry XXVIII).
 *
 * A city's, not an empire's, and that is what makes Rite of Plenty say what it
 * says: "*that city's* worked resource tiles gain +1 gold". `cityContext`
 * (`cities.ts`) appends these beside the granary's, which is the one other
 * producer scoped to a single town — same seam, same argument, and the tile
 * chain still cannot tell any of the five apart.
 */
export function timedCityTileLines(state: GameState, city: City): CardTileLine[] {
  return tileLinesFrom(hexRows(pickKind(timedLive(state, city.ownerId, city), 'pays')));
}

/**
 * The hex `pays` lines the **faith this town follows** puts on its ground — the
 * sixth producer of a `TileLine` (the 2026-08-28 ruling).
 *
 * Harvest Blessing's whole home: *+1 food on every farm worked by a city that
 * follows*. It is a fact about **one town**, exactly as a rite's is, so it joins
 * `cityContext` beside `timedCityTileLines` rather than `yieldContextFor` — a
 * pass with only a player in hand does not know which of his towns keep which
 * faith, and one that does would still be answering for the wrong ones.
 *
 * A scope is asked here rather than assumed, because a follower row may narrow
 * further than "follows" (a farm in a *freshwater* following town); `follows`
 * itself is true by construction on a city these effects reached at all.
 */
export function followerCardTileLines(state: GameState, city: City): CardTileLine[] {
  return tileLinesFrom(
    hexRows(pickKind(followerBeliefEffects(state, city), 'pays'))
      .filter(({ effect }) => cityScopeAdmits(state, city, effect.scope))
      .map((entry) => ({ ...entry, source: label(entry.source, scopeNote(entry.effect.scope)) })),
  );
}

/**
 * The hex `pays` lines a town's **consecration** puts on its own ground — the
 * seventh producer of a `TileLine` (Entry LV's table, the Old Ways' chapel).
 *
 * `timedCityTileLines`' and `followerCardTileLines`' third sibling, and it joins
 * `cityContext` beside them for their reason exactly: a consecration is a fact
 * about **one cathedral in one town** (`City.consecration`, presence is the
 * state), so only a caller holding that town can resolve it, and an empire-wide
 * pass would pay every city for one chapel.
 *
 * It exists because the Green Cathedral is the first consecration whose gift is
 * on the *ground* rather than in the ledger: every row before it pays through
 * town `pays` and `productionBonus`, which `liveCityEffects` already reaches, so
 * a hex `pays` written on a consecration would have been read by nobody at all.
 * A dead clause is exactly what this file's register test exists to refuse.
 */
export function consecrationCardTileLines(state: GameState, city: City): CardTileLine[] {
  return tileLinesFrom(
    hexRows(pickKind(consecrationEffects(state, city), 'pays'))
      .filter(({ effect }) => cityScopeAdmits(state, city, effect.scope))
      .map((entry) => ({ ...entry, source: label(entry.source, scopeNote(entry.effect.scope)) })),
  );
}

/**
 * The rows of a `pays` list that speak about **the ground** — `where: 'hex'`.
 *
 * One filter, said once, because the seven producers of a `TileLine` all ask it
 * (batch E5: before the merge the question was a `kind` and `pickKind` answered
 * it). A row that names no condition reaches no hex at all and is dropped here
 * rather than defaulting to "every one" — the honest reading of a card that
 * never said which ground, and the same silence a `tally` with no occasion keeps.
 */
function hexRows<T extends { effect: CardPaysEffect }>(
  found: readonly T[],
): (T & { effect: CardPaysEffect & { on: TileCondition } })[] {
  return found.filter(
    (entry): entry is T & { effect: CardPaysEffect & { on: TileCondition } } =>
      entry.effect.where === 'hex' && entry.effect.on !== undefined,
  );
}

/** One list of hex `pays` effects turned into lines. The only such conversion. */
function tileLinesFrom(
  found: readonly {
    source: string;
    card?: CardId;
    effect: CardPaysEffect & { on: TileCondition };
  }[],
): CardTileLine[] {
  const list: CardTileLine[] = [];
  for (const { source, card, effect } of found) {
    const line: CardTileLine = {
      source,
      card,
      on: effect.on,
      food: (effect.food ?? 0),
      production: (effect.production ?? 0),
      gold: (effect.gold ?? 0),
      science: (effect.science ?? 0),
      culture: (effect.culture ?? 0),
      faith: (effect.faith ?? 0),
    };
    if (effect.percent !== undefined && effect.percent !== 0) {
      line.percent = effect.percent;
    }
    if (effect.basePercent !== undefined && effect.basePercent !== 0) {
      line.basePercent = effect.basePercent;
    }
    if (
      VOICES.some((key) => line[key] !== 0) ||
      line.percent !== undefined ||
      line.basePercent !== undefined
    ) {
      list.push(line);
    }
  }
  return list;
}

// --- percentages ------------------------------------------------------------

/** One percentage a card puts on a yield, and which of the two stages it joins. */
export interface CardPercentLine {
  card: CardId;
  source: string;
  yield: CityYieldKey;
  percent: number;
  stage: ModifierStage;
}

/**
 * Every percentage this empire's cards put on **this city's** yields — the
 * `percentYields` shapes a scope admits, plus every `pays` count that pays in
 * percentage points.
 *
 * These join the meters' and the luxuries' in `cityYieldPercents` (`cities.ts`),
 * which sums them **per stage** and applies the two sums once (Entry XVII).
 * Additive inside a stage, never multiplied afterwards: a card that is the
 * fourth source of a percentage on gold is a fourth line in one of two sums.
 *
 * `yield: 'all'` expands here rather than in the data, so The Hermit Crown is
 * one row and reads as six labelled lines — which is what a player folding the
 * panel's arithmetic in their head needs to see.
 */
export function explainCardPercentYields(state: GameState, city: City): CardPercentLine[] {
  const owner = city.ownerId;
  const list: CardPercentLine[] = [];

  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'percentYields')) {
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    const percent = effect.percent;
    if (percent === 0) continue;
    const stage: ModifierStage = effect.stage ?? 'city';
    const note = scopeNote(effect.scope);
    const keys = effect.yield === 'all' ? VOICES : [effect.yield];
    for (const key of keys) {
      list.push({ card, source: label(source, note), yield: key, percent, stage });
    }
  }

  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'pays')) {
    // `stage` is the discriminant between a count's two payout forms — present
    // iff the helping pays a percentage (`CardPaysEffect`).
    if (effect.basis !== 'count' || effect.stage === undefined || effect.to === undefined) continue;
    const times = helpings(countOf(state, owner, card, effect, city), effect.per, effect.max);
    if (times === 0) continue;
    const percent = (effect.percent ?? 0) * times;
    if (percent === 0) continue;
    list.push({
      card,
      source: label(source, `×${times}`),
      yield: effect.to as CityYieldKey,
      percent,
      stage: effect.stage,
    });
  }

  return list;
}

/** One percentage a card puts behind a category of build. */
export interface CardProductionLine {
  card: CardId;
  source: string;
  percent: number;
}

/**
 * The hammers this empire's cards put behind `category` — and behind *this
 * unit*, when the row narrows to one silhouette.
 *
 * The card half of `productionModifiers` (`cities.ts`), which folds these
 * together with the buildings' and the luxuries' into one `{ source, percent }`
 * list. There is no Conscription case anywhere in the simulation.
 */
export function cardProduction(
  state: GameState,
  city: City,
  category: ProductionCategory,
  unitType?: UnitTypeId,
  building?: BuildingId,
): CardProductionLine[] {
  const list: CardProductionLine[] = [];
  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'productionBonus')) {
    if (effect.category !== category) continue;
    // The named row, where `modelClass` names a silhouette: Mimar Sinan's
    // mosques. Asked of what the city is actually building, exactly as the
    // silhouette is, so a bonus naming a building is silent on everything else.
    if (effect.building !== undefined && effect.building !== building) continue;
    // And the wider narrowing: what the row is *for* rather than which row it
    // is — The Encyclopaedia's science buildings.
    if (effect.buildingCategory !== undefined) {
      if (building === undefined) continue;
      if (buildingDef(building).category !== effect.buildingCategory) continue;
    }
    // *Where* the hammers land, where `modelClass` is *what* they land on. The
    // town is already in hand — a production modifier is asked of one city's
    // queue — so the scope is the ordinary one and needs no second reading.
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    if (effect.modelClass !== undefined) {
      if (unitType === undefined) continue;
      if (unitDef(unitType).modelClass !== effect.modelClass) continue;
    }
    // The ordinary filter, beside the silhouette shorthand and never instead of
    // it — a row carrying both must satisfy both. "Ships" is three model classes
    // and one filter, which is the whole reason the field exists.
    if (effect.class !== undefined) {
      if (unitType === undefined) continue;
      if (!unitMatches(unitType, effect.class)) continue;
    }
    const percent = effect.percent;
    if (percent === 0) continue;
    list.push({ card, source, percent });
  }
  return list;
}

/** One card's flat rebate on this empire's payroll. See `cardUpkeepRebateLines`. */
export interface CardUpkeepLine {
  card: CardId;
  source: string;
  /** Gold this card takes off the army's bill this turn. Always positive. */
  gold: number;
}

/**
 * What this empire's cards take off its payroll **piece by piece** — The
 * Quartermasters' shilling a soldier, The Wintering Grounds' whole bill for an
 * army in the field.
 *
 * `cardRulePercent(…, 'unitUpkeep')`'s sibling and never its replacement: that
 * one is a share of the total and this one is a figure per soldier, which is the
 * only way to say "a knight costs one less" without saying something different
 * about a warrior. One line per card, so two rebates read as two reasons —
 * `explainUnitUpkeepRebate` (`upkeep.ts`) folds both lists into the ledger's
 * give-back lines and clamps the pair to the payroll.
 *
 * `costOf` is handed in rather than imported, and that is the whole reason this
 * function lives here at all: `upkeep.ts` reads *this* module, so the arrow
 * points one way and a `unitUpkeepOf` import here would close a cycle. What this
 * side owns is the card reading — which pieces a filter reaches, and whether the
 * hex one is standing on is home — and what the caller owns is the price.
 */
export function cardUpkeepRebateLines(
  state: GameState,
  playerId: number,
  costOf: (unit: Unit) => number,
): CardUpkeepLine[] {
  const list: CardUpkeepLine[] = [];
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'upkeepRebate')) {
    // `free` is not a figure and is deliberately not scaled: a deeper Wintering
    // Grounds cannot make an army more free than free. A flat rebate scales like
    // every other number in the vocabulary.
    const off = effect.free === true ? null : (effect.amount ?? 0);
    if (off !== null && off <= 0) continue;
    let gold = 0;
    for (const unit of state.units) {
      if (unit.ownerId !== playerId) continue;
      if (!unitMatches(unit.type, effect.class)) continue;
      if (effect.where === 'ownTerritory') {
        if (tileOwnerPlayerId(state, unit.col, unit.row) !== playerId) continue;
      }
      if (effect.where === 'foreignTerritory') {
        // `cardUnitStat`'s reading exactly: a hex nobody owns is outside your
        // borders, which is what makes a campaign the thing the card pays for.
        if (tileOwnerPlayerId(state, unit.col, unit.row) === playerId) continue;
      }
      const cost = costOf(unit);
      if (cost <= 0) continue;
      gold += off === null ? cost : Math.min(off, cost);
    }
    if (gold <= 0) continue;
    list.push({ card, source, gold });
  }
  return list;
}

/**
 * What this empire's cards **add** to its payroll, piece by piece — The Reckless
 * Levy's coin a soldier.
 *
 * `cardUpkeepRebateLines`' twin, and every clause of that function's docblock
 * holds here with the sign turned round: `costOf` is handed in so the arrow to
 * `upkeep.ts` stays one-way, the filters are the same two readings, and one line
 * per card means two levies read as two reasons.
 *
 * The one difference is the clamp, and it is a rule rather than an oversight: a
 * rebate is floored at what a piece costs, because a card that paid more than
 * the army did would be a mint, and a **charge has no ceiling** — an empire that
 * cannot carry its own levy goes into arrears and the creditors take a piece,
 * which is a rule the game already has (`disbandCandidate`). A piece the empire
 * pays nothing for is charged nothing all the same: the three exemptions are
 * facts about what an army is, and a levy makes an army dearer rather than
 * making a settler a soldier.
 */
export function cardUpkeepSurchargeLines(
  state: GameState,
  playerId: number,
  costOf: (unit: Unit) => number,
): CardUpkeepLine[] {
  const list: CardUpkeepLine[] = [];
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'upkeepSurcharge')) {
    const on = effect.amount;
    if (on <= 0) continue;
    let gold = 0;
    for (const unit of state.units) {
      if (unit.ownerId !== playerId) continue;
      if (!unitMatches(unit.type, effect.class)) continue;
      if (effect.where === 'ownTerritory') {
        if (tileOwnerPlayerId(state, unit.col, unit.row) !== playerId) continue;
      }
      if (effect.where === 'foreignTerritory') {
        if (tileOwnerPlayerId(state, unit.col, unit.row) === playerId) continue;
      }
      // Already on the payroll, or the levy is not what made it cost anything.
      if (costOf(unit) <= 0) continue;
      gold += on;
    }
    if (gold <= 0) continue;
    list.push({ card, source, gold });
  }
  return list;
}

/** One percentage a card puts on a named rule. */
export interface CardRuleLine {
  card: CardId;
  source: string;
  percent: number;
}

/**
 * The percentages this empire's cards put on one named rule.
 *
 * `resourceRulePercent`'s twin, over a union three members wider — a luxury
 * cannot make land cheaper or borders faster, and a card can. Six rules, six
 * consumers, one shape.
 */
export function cardRulePercent(
  state: GameState,
  playerId: number,
  rule: CardRule,
  city?: City,
): CardRuleLine[] {
  const list: CardRuleLine[] = [];
  // A **city** may be handed in, and then its own live rites join the empire's
  // law: Consecration of the Bounds is a `rulePercent` on `borderCulture` that
  // hangs on one town for twenty turns, and the borders channel must fold it
  // exactly as it folds a Doctrine's (Entry XXVIII). Every other caller passes
  // no city and reads what it always read.
  const live = city ? liveCityEffects(state, city) : liveEffects(state, playerId);
  for (const { source, card, effect } of pickKind(live, 'rulePercent')) {
    if (effect.rule !== rule) continue;
    // **A rate may be narrowed to a town** (Common Table: a following city keeps
    // a quarter of its basket). A scope is a question about a *city*, so a
    // caller with none in hand cannot answer it and the line does not apply —
    // the same reading `cardTileLines` takes of a scoped hex line, and the
    // reason `growthCarryover` now hands its town in.
    if (effect.scope !== undefined) {
      if (!city || !cityScopeAdmits(state, city, effect.scope)) continue;
    }
    const percent = effect.percent;
    if (percent === 0) continue;
    list.push({ card, source: label(source, scopeNote(effect.scope)), percent });
  }
  return list;
}

/**
 * Does this empire's law put a **scoped** percentage on this rule — a rate that
 * lands in some of its towns and not in others?
 *
 * The one question a realm-wide reader has to ask before it decides whether to
 * hoist (`explainHappiness`'s demand factor, batch GP2). A scoped rate is a
 * different number in each town, so a caller that folded it once would print one
 * figure for a realm the law treats as two; a caller that walked the towns
 * unconditionally would pay for a shape almost no game holds. This is how it
 * finds out which it is, in one pass over a list it already has in hand.
 *
 * Asked of the **empire's** law alone, never of a town's rites: a rite hangs on
 * one city and is therefore scoped by construction, and a reader that has decided
 * to walk asks `cardRulePercent` with the town anyway. Nothing says
 * `happinessDemand` on a rite today.
 */
export function cardRuleIsScoped(state: GameState, playerId: number, rule: CardRule): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'rulePercent')) {
    if (effect.rule !== rule) continue;
    if (effect.scope !== undefined && effect.percent !== 0) return true;
  }
  return false;
}

/** The fold of any list of rule percentages: summed, applied once. */
export function foldCardRulePercent(list: readonly CardRuleLine[]): number {
  let percent = 0;
  for (const line of list) percent += line.percent;
  return percent;
}

// --- the meters -------------------------------------------------------------

/** One line a card adds to a meter's ledger. */
export interface CardMeterLine {
  card: CardId;
  source: string;
  amount: number;
}

/**
 * The happiness this empire's cards supply, in walk order.
 *
 * A `per: 'city'` line is multiplied by the cities its scope admits — "cities of
 * 6+ gain +2 each" is one line saying how many qualified, because three lines
 * saying "Ur +2" would bury the ledger. A city-scoped `pays` count is summed
 * across the empire's towns for the same reason.
 *
 * **This function must never read a meter.** It is called *by* `explainHappiness`,
 * and a card line that asked how happy the empire was would be the recursion the
 * module docblock cuts one level up.
 *
 * **The empire's law is swept here; a town's own cards are swept beside it.**
 * This reader is empire-scoped by construction — it sweeps the realm's towns
 * itself rather than being handed one — so it walks `liveEffects` for the law
 * and then `cityLocalEffects` town by town for what only reaches one place: a
 * rite hanging on a city, and (since 2026-08-28) the **follower beliefs of the
 * faith that city follows**, which is how Feast Days pays a happiness a rival's
 * religion put in your town. The two walks are complementary by construction
 * (see `cityLocalEffects`), so nothing is counted twice.
 */
export function cardHappiness(state: GameState, playerId: number): CardMeterLine[] {
  const list: CardMeterLine[] = [];

  for (const { source, card, effect } of effectsOfKind(state, playerId, 'happiness')) {
    const each = effect.amount;
    if (each === 0) continue;
    // **A line that stands on a building is not the town's** — it is folded onto
    // the row it names by `buildingHappiness` (`buildingEffects.ts`), off the
    // list `cardBuildingHappiness` below hands over. Skipped here and counted
    // there, exactly once. See `CardHappinessEffect.building`.
    if (effect.building !== undefined) continue;
    if (effect.per !== 'city') {
      if (effect.scope !== undefined) continue;
      list.push({ card, source, amount: each });
      continue;
    }
    let towns = 0;
    for (const city of state.cities) {
      if (city.ownerId !== playerId) continue;
      if (cityScopeAdmits(state, city, effect.scope)) towns += 1;
    }
    if (towns === 0) continue;
    list.push({ card, source: label(source, `${towns} cities`), amount: each * towns });
  }

  for (const { source, card, effect } of effectsOfKind(state, playerId, 'pays')) {
    if (effect.basis !== 'count' || effect.to !== 'happiness') continue;
    const each = effect.amount ?? 0;
    if (each === 0) continue;
    let times = 0;
    // A count that is city-scoped is summed over the empire's towns; an
    // empire-scale one is asked once. `countOf` answers 0 for a city count with
    // no city, so the branch is about *which question*, not about a guard.
    if (isCityScopedCount(effect)) {
      for (const city of state.cities) {
        if (city.ownerId !== playerId) continue;
        times += helpings(countOf(state, playerId, card, effect, city), effect.per, effect.max);
      }
    } else {
      times = helpings(countOf(state, playerId, card, effect), effect.per, effect.max);
    }
    if (times === 0) continue;
    list.push({ card, source: label(source, `×${times}`), amount: each * times });
  }

  list.push(...cityLocalHappiness(state, playerId));
  return list;
}

/**
 * The happiness that reaches this empire **one town at a time** — a rite hanging
 * on a city, and the follower beliefs of the faith each of its cities follows.
 *
 * Summed per card so the ledger keeps its shape: three towns that all follow the
 * Grain Cult contribute one line labelled with the count, exactly as the
 * empire-scoped `per: 'city'` arm above does, because three lines saying
 * "Ur +1" would bury it.
 *
 * A `per: 'city'` clause and a bare one mean the same thing here and are read
 * the same way: the source *is* one town, so "in each such city" and "in this
 * city" are one sentence. The scope is still asked, because a follower belief
 * that names fresh water names it about the town it landed in.
 */
function cityLocalHappiness(state: GameState, playerId: number): CardMeterLine[] {
  const list: CardMeterLine[] = [];
  // Grouped by the label the line will carry, which already contains the card's
  // name and its source word — so two towns following two different religions
  // that happen to hold the same belief stay two lines, which is the honest
  // reading of "whose faith is paying". **An array, walked, never a `Map`**:
  // this list is an outcome, and nothing in this game iterates a keyed
  // collection for one.
  const totals: { card: CardId; source: string; amount: number; towns: number }[] = [];
  const add = (card: CardId, source: string, amount: number): void => {
    const held = totals.find((entry) => entry.source === source);
    if (held) {
      held.amount += amount;
      held.towns += 1;
      return;
    }
    totals.push({ card, source, amount, towns: 1 });
  };

  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const local = cityLocalEffects(state, city);
    for (const { source, card, effect } of pickKind(local, 'happiness')) {
      const each = effect.amount;
      if (each === 0) continue;
      // The empire walk's clause, said again here because the two walks are
      // complementary and a follower belief takes this road: Feast Days' temple
      // half is the building's line, not the town's.
      if (effect.building !== undefined) continue;
      if (!cityScopeAdmits(state, city, effect.scope)) continue;
      add(card, source, each);
    }
    for (const { source, card, effect } of pickKind(local, 'pays')) {
      if (effect.basis !== 'count' || effect.to !== 'happiness') continue;
      const each = effect.amount ?? 0;
      if (each === 0) continue;
      const times = helpings(countOf(state, playerId, card, effect, city), effect.per, effect.max);
      if (times === 0) continue;
      add(card, source, each * times);
    }
  }

  for (const entry of totals) {
    if (entry.amount === 0) continue;
    list.push({
      card: entry.card,
      source: entry.towns === 1 ? entry.source : label(entry.source, `${entry.towns} cities`),
      amount: entry.amount,
    });
  }
  return list;
}

/**
 * One happiness a card hangs on a **building standing in a named town**.
 *
 * `CardBuildingPercentLine`'s shape one meter over: a resolved fact, not an
 * effect — the scope has already been asked of the town, so the module that
 * folds it (`buildingEffects.ts`, a leaf with no evaluator behind it) needs no
 * opinion about what a `CityScope` is.
 */
export interface CardBuildingHappinessLine {
  card: CardId;
  source: string;
  /** The town it stands in. `City.id`, so the fold can find the walls. */
  cityId: number;
  building: BuildingId;
  amount: number;
}

/**
 * Every happiness this empire's cards put **on a building** rather than on a
 * town — Feast Days' *"Temples supply +1 happiness"*, and nothing else today.
 *
 * `cardHappiness`' complement, and the two are exhaustive by construction: that
 * one skips every `happiness` line carrying a `building` and this one takes
 * exactly those, so a line is counted once and the ledger's total is unchanged
 * by where it is attributed. Both walks are made — the empire's law
 * (`effectsOfKind`) and each town's own cards (`cityLocalEffects`, which is how
 * a follower belief reaches a city a rival converted) — for that function's
 * reason exactly.
 *
 * A **list**, per town and per card, never a total: the fold on the far side
 * prints "Uruk · Temple" as one line of the happiness ledger, and a number here
 * would have handed it a figure with no walls behind it. `state.cities` order,
 * which is founding order and the order every other sweep uses.
 */
export function cardBuildingHappiness(
  state: GameState,
  playerId: number,
): CardBuildingHappinessLine[] {
  const list: CardBuildingHappinessLine[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const seen: { source: string; card: CardId; effect: CardHappinessEffect }[] = [];
    for (const entry of effectsOfKind(state, playerId, 'happiness')) seen.push(entry);
    for (const entry of pickKind(cityLocalEffects(state, city), 'happiness')) seen.push(entry);
    for (const { source, card, effect } of seen) {
      const building = effect.building;
      if (building === undefined || effect.amount === 0) continue;
      if (!cityScopeAdmits(state, city, effect.scope)) continue;
      list.push({ card, source, cityId: city.id, building, amount: effect.amount });
    }
  }
  return list;
}

/**
 * The authority capacity this empire's cards supply.
 *
 * Capacity, never a discount on what a city costs — `resourceAuthority`'s rule,
 * and the reason a card that wants cities *cheaper* says so with a `meterRule`
 * instead. The two halves of the meter go on meaning what they meant.
 */
export function cardAuthority(state: GameState, playerId: number): CardMeterLine[] {
  const list: CardMeterLine[] = [];

  for (const { source, card, effect } of effectsOfKind(state, playerId, 'authority')) {
    const each = effect.amount;
    if (each === 0) continue;
    const towns = effect.per === 'city' ? cityCount(state, playerId) : 1;
    if (towns === 0) continue;
    list.push({
      card,
      source: effect.per === 'city' ? label(source, `${towns} cities`) : source,
      amount: each * towns,
    });
  }

  for (const { source, card, effect } of effectsOfKind(state, playerId, 'pays')) {
    if (effect.basis !== 'count' || effect.to !== 'authority') continue;
    const each = effect.amount ?? 0;
    if (each === 0) continue;
    const times = helpings(countOf(state, playerId, card, effect), effect.per, effect.max);
    if (times === 0) continue;
    list.push({ card, source: label(source, `×${times}`), amount: each * times });
  }

  return list;
}

/** The percentage points this empire's cards add to the positive happiness rungs. */
export function cardTierBoost(state: GameState, playerId: number): {
  lines: CardMeterLine[];
  points: number;
} {
  const lines: CardMeterLine[] = [];
  let points = 0;
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'happinessTierBoost')) {
    const amount = effect.points;
    if (amount === 0) continue;
    points += amount;
    lines.push({ card, source: label(source, 'happiness'), amount });
  }
  return { lines, points };
}

/**
 * What a card says about one constant of the two meters, or `null` when no card
 * says anything.
 *
 * `value` replaces and `delta` shifts, and a rule that gets both takes the
 * replacement first and then every shift — which is the only reading under which
 * Hegemony ("captured cities cost 2") and a future "+1 to every city's cost"
 * compose into something a player can predict.
 */
export function cardMeterRule(
  state: GameState,
  playerId: number,
  rule: MeterRuleId,
  base: number,
): number {
  let value = base;
  let replaced = false;
  for (const { effect } of effectsOfKind(state, playerId, 'meterRule')) {
    if (effect.rule !== rule) continue;
    if (effect.value !== undefined && !replaced) {
      value = effect.value;
      replaced = true;
    }
  }
  for (const { effect } of effectsOfKind(state, playerId, 'meterRule')) {
    if (effect.rule !== rule || effect.delta === undefined) continue;
    value += effect.delta;
  }
  return value;
}

/** Is a meter rule declared at all? The reading for a flag-shaped rule. */
export function cardMeterFlag(state: GameState, playerId: number, rule: MeterRuleId): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'meterRule')) {
    if (effect.rule === rule) return true;
  }
  return false;
}

// --- combat -----------------------------------------------------------------

/** Everything a strength line needs to know about the fight it is asked about. */
export interface CombatSituation {
  /** The unit whose owner's cards are being asked about. */
  unit: Unit;
  /** Which posture this side is in. */
  side: 'attack' | 'defend';
  /** The contested hex — where the defender stands. */
  tile: Tile;
  /** True when the other side is the wild. */
  vsBarbarians: boolean;
  /** True when the target is a city. */
  vsCity: boolean;
  /** The defender's hit points and maximum, for `targetBelowHalf`. */
  targetHp: number;
  targetMaxHp: number;
  /**
   * The type of the piece on the **other** side, or absent when that side is a
   * city (a town has no silhouette to be "vs mounted" about).
   *
   * `unit`'s mirror, and the field `combatLine.vsClass` reads. It is genuinely
   * the *other* side whichever side is asking — `planCombat` fills it with the
   * defender's type for the attacker's situation and the attacker's type for the
   * defender's — so one filter answers "against horse" for a card held by either
   * empire.
   */
  vsType?: UnitTypeId;
  /**
   * The **base strength** of the piece on the other side, or absent when that
   * side is a city.
   *
   * `vsType`'s sibling and filled from the same place by the same rule — the
   * defender's for the attacker's situation and the attacker's for the
   * defender's — so `strongerTarget` answers "am I outmatched" for a card held
   * by either empire. It is `UnitDef.combatStrength` and never the fold: a strength
   * line that read the ledger it is about to join would be a line inside its own
   * sum.
   */
  vsStrength?: number;
  /**
   * **Whose** the other side is — the seat `vsWiderEmpire` compares realms with.
   *
   * `vsType`'s sibling one question wider, and filled by the same rule from the
   * same place: the defender's owner for the attacker's situation and the
   * attacker's for the defender's, so a card is read for whichever empire holds
   * it. Unlike `vsType` and `vsStrength` it is present against a **city** too —
   * a town has no silhouette and no strength of that kind, but it certainly has
   * an owner, and "the wider empire" is exactly the sentence a player storming a
   * big neighbour's capital is making.
   */
  vsOwnerId?: number;
}

/** Does a combat condition hold for this situation? One evaluator. */
function combatConditionHolds(
  state: GameState,
  situation: CombatSituation,
  when: CombatCondition,
): boolean {
  const test = when.test;
  switch (test) {
    case 'always':
      return true;
    case 'vsBarbarians':
      return situation.vsBarbarians;
    case 'ownTerritory':
      return tileOwnerPlayerId(state, situation.tile.col, situation.tile.row) === situation.unit.ownerId;
    case 'foreignTerritory':
      return tileOwnerPlayerId(state, situation.tile.col, situation.tile.row) !== situation.unit.ownerId;
    case 'onHills':
      return situation.tile.hills;
    case 'vsCity':
      return situation.vsCity;
    case 'targetBelowHalf':
      return situation.targetMaxHp > 0 && situation.targetHp * 2 < situation.targetMaxHp;
    case 'capitalTerritory': {
      // `ownTerritory` narrowed to the capital's own borders, asked by tile id
      // rather than by owner so that a second city standing beside the first
      // does not lend its ground to the Walls of Uruk.
      const capital = capitalCityOf(state, situation.unit.ownerId);
      if (!capital) return false;
      return tileOwnerCityId(state, situation.tile.col, situation.tile.row) === capital.id;
    }
    case 'inCity': {
      // A town of this unit's own empire stands on the contested hex. Paired
      // with `side: 'defend'` on every row that wants it — see the condition.
      const here = cityAt(state, situation.tile.col, situation.tile.row);
      return here !== undefined && here.ownerId === situation.unit.ownerId;
    }
    case 'capturedCity': {
      // `inCity` and one more question of the same town, asked of the same
      // field `CityScope`'s `captured` asks of it.
      const here = cityAt(state, situation.tile.col, situation.tile.row);
      return here !== undefined && here.ownerId === situation.unit.ownerId && here.captured;
    }
    case 'onFeature':
      return situation.tile.feature === when.feature;
    case 'freshwater':
      return situation.tile.freshwater;
    case 'coastal':
      // The same predicate a coastal *city* is decided by — Entry I.b's one
      // evaluator, asked of a hex nobody has founded on.
      return isCoastal(state.map, situation.tile);
    case 'fortified':
      // A fact about the piece this line is being asked for, whichever posture
      // it is in: a dug-in unit that sallies is still dug in until the reducer
      // breaks the fortification, and `breakFortify` is what decides that.
      return situation.unit.fortifiedTurns !== undefined;
    case 'withinOfCity': {
      // A distance rather than a border: Deborah judges within sight of her own
      // people, which reaches ground nobody has claimed and stops short of a
      // colony's third ring. Measured off the contested hex, as every other
      // radius in the game is.
      const eye = tileHex(situation.tile);
      const reach = Math.max(0, Math.floor(when.hexes));
      for (const city of state.cities) {
        if (city.ownerId !== situation.unit.ownerId) continue;
        const seat = getTileAt(state.map, city.col, city.row);
        if (!seat) continue;
        if (wrappedDistance(state.map, eye, tileHex(seat)) <= reach) return true;
      }
      return false;
    }
    case 'followingTerritory': {
      // The banner rather than the border. The hex's *owning* city, its derived
      // `cityReligion`, against the faiths this empire is paid by — the same
      // three readings `CityScope`'s `follows` takes with a viewer named, so a
      // conquered holy city moves this line with it. A hex nobody owns has no
      // congregation and never satisfies it.
      const cityId = tileOwnerCityId(state, situation.tile.col, situation.tile.row);
      if (cityId === undefined) return false;
      const town = state.cities.find((entry) => entry.id === cityId);
      if (!town) return false;
      if (when.foreign === true && town.ownerId === situation.unit.ownerId) return false;
      const kept = cityReligion(town);
      if (kept === null) return false;
      return heldReligions(state, situation.unit.ownerId).some((faith) => faith.id === kept);
    }
    case 'strongerTarget':
      // Base against base — never the folded ledger, which would be a line
      // inside its own sum. A city has no such strength and never satisfies it,
      // which is `vsClass`' reading: nothing charges out of a town.
      return (
        situation.vsStrength !== undefined &&
        situation.vsStrength > unitDef(situation.unit.type).combatStrength
      );
    case 'vsWiderEmpire': {
      // `strongerTarget` one scale out: the two **realms** compared, not the two
      // pieces. Through `citiesOf`, the one town walk, so a town taken mid-war
      // moves the line the turn it changes hands. The wild holds none and
      // therefore never satisfies it — no clause needed.
      const them = situation.vsOwnerId;
      if (them === undefined || them === situation.unit.ownerId) return false;
      return cityCount(state, them) > cityCount(state, situation.unit.ownerId);
    }
    case 'beside':
      // The ring of six off this piece's own hex, through the sweep that already
      // answers "who is standing next to me" (`adjacentFriendlies`), narrowed by
      // the ordinary filter. A *question*, so three engines pay once.
      return adjacentFriendlies(state, situation.unit, when.class) > 0;
    case 'all': {
      // Recursion into the same evaluator, which is the whole reason the
      // composite is a condition rather than a second field on `combatLine` —
      // `CityScope`'s `all` one scale over, and the same reading.
      for (const inner of when.of) {
        if (!combatConditionHolds(state, situation, inner)) return false;
      }
      return true;
    }
    default: {
      const unhandled: never = test;
      void unhandled;
      return false;
    }
  }
}

/**
 * How many friendly combat units stand next to this one.
 *
 * `filter` narrows them to a silhouette — The Siege Train's engines — through
 * the same `unitMatches` predicate every other "which units" question in the
 * vocabulary asks. Absent counts every combatant, which is what the count's
 * first reader (`adjacentFriendlies` as a `CombatScale`) has always meant, so
 * one sweep answers the count and the `beside` condition alike.
 */
function adjacentFriendlies(state: GameState, unit: Unit, filter?: UnitFilter): number {
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return 0;
  let count = 0;
  for (const neighbour of neighborTiles(state.map, tileHex(from))) {
    for (const other of state.units) {
      if (other.id === unit.id) continue;
      if (other.ownerId !== unit.ownerId) continue;
      if (other.col !== neighbour.col || other.row !== neighbour.row) continue;
      if (!isCombatant(unitDef(other.type))) continue;
      if (!unitMatches(other.type, filter)) continue;
      count += 1;
    }
  }
  return count;
}

/** One strength line a card contributes, as `planCombat` needs it. */
export interface CardCombatLine {
  card: CardId;
  source: string;
  amount: number;
}

/**
 * Every flat strength this empire's cards give one side of one fight.
 *
 * The generalisation of `combat.ts`'s own "+2 vs barbarians": that line is a
 * `CombatBonusLine` with a label and a side, and so is every one of these —
 * `planCombat` pushes them into the list it already had, they are counted into
 * the two strengths, and the forecast card itemises them. A card that only ever
 * mattered in the reducer would be a card the player could not plan around.
 *
 * **Flat, and after the terrain multiplier**, exactly as the wild's tax is: a
 * fact about the opponent or the posture must not scale with the ground (see
 * `CombatBonusLine`).
 */
export function cardCombatLines(state: GameState, situation: CombatSituation): CardCombatLine[] {
  const owner = situation.unit.ownerId;
  const list: CardCombatLine[] = [];
  // **The one place a fight asks a *town's* cards.** Warrior Monks is a strength
  // line a *religion* puts on the walls of every city that follows it, and since
  // the 2026-08-28 ruling a follower belief reaches a town rather than an
  // empire — so the beliefs of whatever faith the town on the contested hex
  // keeps join the walk. Asked of the same `cityAt` lookup the `inCity`
  // condition asks, so a row written `inCity` and a row written for a following
  // city cannot disagree about which town they mean; the condition is still what
  // decides whose side it fights on, which is why a rival's monks do not defend
  // your assault on their gate.
  const here = cityAt(state, situation.tile.col, situation.tile.row);
  const live = here
    ? [...liveUnitEffects(state, situation.unit), ...followerBeliefEffects(state, here)]
    : liveUnitEffects(state, situation.unit);
  for (const { source, card, effect } of pickKind(live, 'combatLine')) {
    if (effect.side !== 'both' && effect.side !== situation.side) continue;
    // Which units the line reaches, asked of the same predicate `unitStat` asks
    // — the Alhambra's mounted +2. Of *this* piece, whichever side it is on, so
    // a line that pays both postures pays a knight in either.
    if (!unitMatches(situation.unit.type, effect.class)) continue;
    // And who it pays *against* — Lautaro's mounted. A line with `vsClass` never
    // fires at a city, which has no type at all: see `CardCombatLineEffect`.
    if (effect.vsClass !== undefined) {
      if (situation.vsType === undefined) continue;
      if (!unitMatches(situation.vsType, effect.vsClass)) continue;
    }
    if (!combatConditionHolds(state, situation, effect.when)) continue;
    const each = effect.amount;
    if (each === 0) continue;
    if (!effect.scaled) {
      list.push({ card, source, amount: each });
      continue;
    }
    const total = combatScaleCount(state, owner, situation.unit, effect.scaled);
    let amount = each * helpings(total, effect.scaled.per, undefined);
    if (effect.scaled.max !== undefined) {
      amount = Math.sign(amount) * Math.min(Math.abs(amount), effect.scaled.max);
    }
    if (amount === 0) continue;
    list.push({ card, source, amount });
  }
  return list;
}

/**
 * What a strength line's `scaled` clause counts. One arm each, no default.
 *
 * `countOf`'s much smaller cousin, and separate from it on purpose: a
 * `CombatScale` is asked of a *fight* — it has a piece in hand and no city — so
 * the two counts share nothing but the word "count", and folding them would mean
 * handing `countOf` a unit it has no use for.
 */
function combatScaleCount(
  state: GameState,
  playerId: number,
  unit: Unit,
  scale: CombatScale,
): number {
  const count = scale.count;
  switch (count) {
    case 'cities':
      return cityCount(state, playerId);
    case 'adjacentFriendlies':
      return adjacentFriendlies(state, unit);
    case 'greatPeopleOfFamily':
      return greatPeopleEarned(state, playerId, scale.family);
    case 'slottedOrdersOfSlot':
      // The War Council. Through the same reading the ledger's count takes
      // (`slottedOrdersOfFlavour`), so the spears a fight is worth and the coin
      // a Guild Charter pays are counting one council.
      return slottedOrdersOfFlavour(state, playerId, scale.slot);
    default: {
      const unhandled: never = count;
      void unhandled;
      return 0;
    }
  }
}

/**
 * Great people of one family this empire has **earned** — spent and standing
 * both.
 *
 * The two halves are where a name can be: `Player.legacies` is the roll of the
 * ones already given up to their act, and the board holds the ones still walking
 * (`Unit.person`). They never overlap — a person is consumed by its act and its
 * id is pushed onto the legacies in the same breath — so the sum is exactly "how
 * many has this realm ever been handed", which is what "earned this game" says.
 *
 * `GameState.recruited` is deliberately *not* the source: it is the world's
 * consumed roster and records no owner (see its docblock), so a count read off
 * it would pay The Empire for a rival's generals.
 */
function greatPeopleEarned(state: GameState, playerId: number, family?: Family): number {
  const player = playerById(state, playerId);
  if (!player) return 0;
  const admits = (id: GreatPersonId): boolean =>
    family === undefined || greatPersonDef(id).family === family;
  let total = 0;
  // **Revoked records still count.** "Earned this game" is what the line says,
  // and a general who is no longer heeded was still earned — the one place the
  // count and the effects read the same list differently, and it is stated on
  // `Player.legacies`.
  for (const held of player.legacies) {
    if (admits(held.id)) total += 1;
  }
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const person = unit.person;
    if (person === undefined) continue;
    if (admits(person)) total += 1;
  }
  return total;
}

/**
 * The percentage this empire's cards put on a unit's own strength, as one whole
 * signed figure.
 *
 * Master of Maps' drawback, and the one place a card multiplies a *strength*
 * rather than adding to it. It applies to the unit's base before any flat line
 * joins, so "−10% combat strength" is a fact about the army and not a discount
 * on the terrain bonus somebody else earned.
 *
 * `situation` is what lets a share name **one kind of fight** — the Statue of
 * Zeus' fifteen percent for storming a town. It is the same triple `planCombat`
 * already builds for `cardCombatLines`, asked through the same one evaluator, so
 * a percentage and a flat line cannot disagree about what "against a city"
 * means. A caller with no fight in hand passes none, and **a row carrying a
 * `when` pays nothing there** — see `CardUnitStatEffect.when`.
 */
export function cardCombatPercent(
  state: GameState,
  unit: Unit,
  situation?: CombatSituation,
): number {
  let percent = 0;
  for (const { effect } of effectsOfKind(state, unit.ownerId, 'unitStat')) {
    if (effect.stat !== 'combatPercent') continue;
    if (!unitMatches(unit.type, effect.class)) continue;
    if (effect.when !== undefined) {
      if (!situation) continue;
      if (!combatConditionHolds(state, situation, effect.when)) continue;
    }
    percent += effect.amount;
  }
  return percent;
}

// --- unit and city stats ----------------------------------------------------

/** Does this unit type pass a filter? Absent filter admits everything. */
export function unitMatches(type: UnitTypeId, filter?: UnitFilter): boolean {
  if (!filter) return true;
  const def = unitDef(type);
  if (filter.modelClass !== undefined && def.modelClass !== (filter.modelClass as ModelClass)) {
    return false;
  }
  // The list form of the same question — the Barracks' foot soldiers. Read
  // beside `modelClass` and never instead of it, so a row carrying both must
  // satisfy both (see `UnitFilter.modelClasses`). An **empty** list admits
  // nothing, which is the honest reading of a row that named no silhouette at
  // all rather than a guard that would quietly admit every piece.
  if (filter.modelClasses !== undefined && !filter.modelClasses.includes(def.modelClass)) {
    return false;
  }
  if (filter.category !== undefined && def.category !== filter.category) return false;
  if (filter.ranged !== undefined && (def.range !== undefined) !== filter.ranged) return false;
  // "Religious units", asked of the roster's own marker. Absent on every type
  // that digs, so `=== true` is the reading and `false` means "the ones that
  // do not pray" — which is how the Pyramids reach the worker without reaching
  // the augur standing beside it in the same `modelClass`.
  if (filter.consecrates !== undefined && (def.consecrates === true) !== filter.consecrates) {
    return false;
  }
  // "Scouts", asked of the roster's own marker (`isExplorer`) rather than of a
  // name — Wolf-Runners reaches the commando a later age adds without its row
  // being touched, exactly as `consecrates` reaches the prophet.
  if (filter.explores !== undefined && isExplorer(def) !== filter.explores) return false;
  // The named row, asked last because it is the narrowest thing the filter can
  // say — see `UnitFilter.type`. The *data* names a type here; no rule in
  // `src/sim/` does, which is the claim that has never moved.
  if (filter.type !== undefined && type !== filter.type) return false;
  return true;
}

/**
 * What this empire's cards add to one stat of one unit.
 *
 * Read through each stat's **single** evaluator, which is the promise this hook
 * makes: `fullMovement` is the only place a movement allowance is decided,
 * `sightOf` the only place a sight radius is, `healUnits` the only place a heal
 * is, and each of them adds this and nothing else. A card that wrote a unit's
 * movement into the unit would be a second answer that a save could disagree
 * with.
 *
 * `where: 'ownTerritory'` is asked of the hex the unit is standing on, which is
 * the only reading a per-turn allowance can have: Imperium's legions march
 * further because they set out from home.
 */
export function cardUnitStat(
  state: GameState,
  unit: Unit,
  stat: 'movement' | 'sight' | 'heal' | 'range',
): number {
  let total = 0;
  for (const { effect } of effectsOfKind(state, unit.ownerId, 'unitStat')) {
    if (effect.stat !== stat) continue;
    if (!unitMatches(unit.type, effect.class)) continue;
    if (effect.where === 'ownTerritory') {
      if (tileOwnerPlayerId(state, unit.col, unit.row) !== unit.ownerId) continue;
    }
    if (effect.where === 'foreignTerritory') {
      // `ownTerritory`'s mirror, asked of the same field: a hex nobody owns is
      // outside your borders, which is the reach `noHealAbroad` already takes
      // and what makes The Wintering Grounds bite on a campaign.
      if (tileOwnerPlayerId(state, unit.col, unit.row) === unit.ownerId) continue;
    }
    if (effect.where === 'embarked') {
      // On water is embarked: nothing else can be standing there, because
      // embarkation is the only way a piece reaches a water hex at all.
      const here = getTileAt(state.map, unit.col, unit.row);
      if (!here || !isWaterTerrain(here.terrain)) continue;
    }
    if (effect.where === 'fortified') {
      // **Presence is the state**, `path`'s and `sleeping`'s convention: a piece
      // that has dug in carries `fortifiedTurns` and one that has not carries no
      // key at all. The Alchemical Codex's extra mending, and it rides on the
      // *rested* rule the ordinary heal already keeps (`healUnits`) rather than
      // replacing it — a unit that dug in this turn spent no movement, so the
      // two agree by construction.
      if (unit.fortifiedTurns === undefined) continue;
    }
    total += effect.amount;
  }
  return total;
}

/**
 * Extra charges a unit of this type is **born** with — read by `createUnit`,
 * once, at the moment of the birth.
 *
 * At birth rather than on read, and that is the rule the card's text states:
 * "workers are built with +1 charge". A charge is spent, so a bonus computed on
 * read would give a worker its extra charge back every time the card was
 * re-slotted, and take it away mid-job when the card came out.
 *
 * `at` is the hex the piece is born on, which is what resolves *which town
 * raised it* — the one reading `CardUnitStatEffect.scope` has, and the reason
 * this is the only `unitStat` consumer that takes one. Cuius Regio's augurs are
 * charged by the faith of the city they were trained in, so a scoped line is
 * silent when no hex is passed and silent again when no town stands on it.
 */
export function cardExtraCharges(
  state: GameState,
  playerId: number,
  type: UnitTypeId,
  at?: { col: number; row: number },
): number {
  let total = 0;
  // Resolved once rather than per line: the birth hex does not move between
  // effects, and a town lookup per card would be a sweep of forty cities per
  // clause on a row that fires at every completion.
  const born = at ? cityAt(state, at.col, at.row) : undefined;
  for (const { effect } of effectsOfKind(state, playerId, 'unitStat')) {
    if (effect.stat !== 'charges') continue;
    if (!unitMatches(type, effect.class)) continue;
    // The scope asks about the town, and "my religion" asks about the empire
    // reading the card — the same `viewerId` a follower belief is admitted by.
    if (effect.scope !== undefined) {
      if (!born) continue;
      if (!cityScopeAdmits(state, born, effect.scope, playerId)) continue;
    }
    total += effect.amount;
  }
  return total;
}

/**
 * What this empire's law **stamps** on a piece born now — read by `createUnit`,
 * once, at the moment of the birth, and by nothing else.
 *
 * `cardExtraCharges`' argument for a second field, and the same one: a stamp is
 * a fact about a *moment*, so it is written into the unit rather than computed
 * on read. The Muster Roll's ten hit points belong to the levy that mustered
 * while the Order sat in its slot; unslotting it next year does not un-blood
 * them, and a bonus read live would have.
 *
 * It is deliberately **not** filtered by a `UnitFilter`: the ratified rows say
 * *newly created units*, and a stamp narrowed to a silhouette would be a
 * different card ("your spearmen are veterans") that nobody has ratified. The
 * day one is, the filter joins `CardUnitStampEffect` and is asked here beside
 * `unitMatches` like every other.
 *
 * It *is* narrowed by **where the piece was raised**, which is a different
 * question and the one the Terracotta Army asks ("units built in this city").
 * `at` is the birth hex, resolved to a town once for the same reason
 * `cardExtraCharges` resolves it once — the hex does not move between effects,
 * and a lookup per clause would sweep the realm's towns at every completion.
 *
 * Every figure is the card's own, and a stamp that comes out to nothing at all
 * is **not written** — see `createUnit`, where presence is the state.
 */
export function cardUnitStamp(
  state: GameState,
  playerId: number,
  at?: { col: number; row: number },
): UnitStamp {
  let hp = 0;
  let strength = 0;
  const born = at ? cityAt(state, at.col, at.row) : undefined;
  for (const { effect } of effectsOfKind(state, playerId, 'unitStamp')) {
    // A scoped stamp asks about the town the piece was raised in, and is silent
    // where there is no town at all — see `CardUnitStampEffect.scope`.
    if (effect.scope !== undefined) {
      if (!born) continue;
      if (!cityScopeAdmits(state, born, effect.scope, playerId)) continue;
    }
    if (effect.hp !== undefined) hp += effect.hp;
    if (effect.strength !== undefined) strength += effect.strength;
  }
  const stamp: UnitStamp = {};
  if (hp !== 0) stamp.hp = hp;
  if (strength !== 0) stamp.strength = strength;
  return stamp;
}

/**
 * A counted `cityStat` row read as the count it is asking — `payPeriodicBoon`'s
 * probe one ledger over, and here for that one's reason exactly: `countOf` is
 * the simulation's own answer to "how many of this does a town have", and a
 * second implementation of "citizens" beside it is how two cards start
 * disagreeing about one number. `within: 'city'` because the line lands in one
 * town and the count is that town's.
 */
function cityStatProbe(effect: CardCityStatEffect): CardPaysEffect {
  return {
    kind: 'pays',
    where: 'city',
    basis: 'count',
    count: effect.count,
    per: effect.per,
    max: effect.max,
    within: 'city',
  };
}

/** One line of what a card adds to a city's own defence or sight. */
export interface CardCityStatLine {
  card: CardId;
  source: string;
  amount: number;
}

/**
 * What this empire's cards add to one stat of one **city**.
 *
 * A list rather than a number, because a city's defence is quoted in a combat
 * forecast and a forecast that said "+11" with no reason would be the one thing
 * rule 5 forbids. `planCombat` folds it into the defender's strength and prints
 * the lines beside the walls.
 */
export function cardCityStat(
  state: GameState,
  city: City,
  stat: 'defense' | 'sight',
): CardCityStatLine[] {
  const list: CardCityStatLine[] = [];
  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'cityStat')) {
    if (effect.stat !== stat) continue;
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    const amount = effect.amount;
    if (amount === 0) continue;
    // **A counted line pays a helping at a time** — Siegecraft's walls by the
    // townsfolk (`CardCityStatEffect.count`). Asked through the simulation's own
    // count with this town in hand, so a card counting citizens for walls and a
    // card counting them for hammers read the same number; a row with no count
    // pays its flat once, which is every row written before the field existed.
    let times = 1;
    let note = scopeNote(effect.scope);
    if (effect.count !== undefined) {
      const probe = cityStatProbe(effect);
      times = helpings(countOf(state, city.ownerId, card, probe, city), effect.per, effect.max);
      if (times === 0) continue;
      note = note === null ? `×${times}` : `${note} · ×${times}`;
    }
    list.push({ card, source: label(source, note), amount: amount * times });
  }
  return list;
}

/** The fold of a city-stat list. The only sum of one. */
export function foldCityStat(list: readonly CardCityStatLine[]): number {
  let total = 0;
  for (const line of list) total += line.amount;
  return total;
}

// --- windfalls --------------------------------------------------------------

/**
 * What a windfall actually pays once its riders are on it.
 *
 * **A rider is part of the printed number.** Entry XVIII.5 says a one-time grant
 * pays its printed figure exactly — no city percentages, no meter tiers, no
 * Entry XVII staging — and that is unchanged: a rider does not multiply the
 * settlement afterwards, it *changes what is printed before anything is banked*.
 * A 20⚙ chop under The Woodwrights is a 40⚙ windfall, and 40 is what the
 * preview promises, what the basket receives and what the announcement says.
 * This function is the one place the composition happens, so there is exactly
 * one number and no path around it.
 *
 * Riders on one occasion **sum** their percentages before multiplying once —
 * Entry XVII's "additive within a stage" read at a different scale, and the only
 * reading under which two +100% riders are worth +200% rather than ×4.
 */
export interface WindfallPayout {
  /** The occasion's own figure with every percentage rider folded in. */
  amount: number;
  /** Extra voices the riders add outright, keyed by yield. */
  grants: { card: CardId; source: string; yield: CityYieldKey; amount: number }[];
  /** Hit points a rider restores to the acting unit. */
  heal: number;
  /**
   * Pieces a rider gifts outright, already **drawn** — Camp Followers'.
   *
   * The roll happens here, with every other figure on the payout, because Entry
   * XVIII.5's rule is that the whole thing is composed before anything is banked
   * and a draw made later would be a draw the preview could not have promised.
   * What is left for `payWindfallGrants` is only the delivery, through
   * `realiseItem` — the one completion routine.
   */
  units: { card: CardId; source: string; type: UnitTypeId }[];
  /**
   * True when a rider heals **the whole army** — The Empire's. A flag and not a
   * figure, because the ratified text is *heals all*: a number here would have
   * been a second, quieter rule about how much.
   */
  healAll: boolean;
  /**
   * Effects a rider hangs on the **empire** until an absolute turn — Crassus'
   * bill. Composed here with every other figure (Entry XVIII.5) and stamped by
   * `payWindfallGrants`, which is the only writer of `Player.timed`.
   */
  timed: { card: CardId; source: string; turns: number; effects: CardEffect[] }[];
  /**
   * **Renown** a rider banks on this occasion — Triumphs' twenty-five for taking
   * a town.
   *
   * A list beside the yields rather than a figure among them, because renown is
   * not one of the six voices: it has its own bucket and its own ledger, and it
   * is banked in `payWindfallGrants` through `settleRenownWindfall`, the one
   * place renown is ever added. Composed here with every other figure so the
   * era and the slotted count reach it exactly as they reach a yield grant.
   */
  renown: { card: CardId; source: string; amount: number }[];
  /**
   * **Lumps of faith a rider presses** where the occasion happened — The
   * Crusade's, pressed wherever its soldiers kill.
   *
   * Composed here with every other figure (Entry XVIII.5) and pressed in
   * `payWindfallGrants` through the presser its caller hands in — see that
   * function's `press` parameter for why the seam is injected rather than
   * imported. A payout carrying one on a caller that offered no presser presses
   * nothing, which is the same silence a grant with no city to receive it keeps.
   */
  pressure: { card: CardId; source: string; amount: number; range: number }[];
  /** Every rider that touched this payout, for the announcement. */
  lines: { card: CardId; source: string; note: string }[];
}

/**
 * Which side the occasion was against, where an occasion has a side.
 *
 * Today one question and one asker: a `kill` and a `death` know whether the
 * piece that fell belonged to the wild, and a rider carrying `vsBarbarians`
 * fires only when it did (Border Ballads). Passed rather than derived, because
 * by the time the riders are composed the fallen piece is off the board — the
 * caller is the only thing that still knows.
 */
export interface WindfallOccasionFacts {
  vsBarbarians?: boolean;
  /**
   * True when the town just taken held a wonder — The Empire's clause.
   *
   * `vsBarbarians`' sibling, passed for its reason exactly: the caller is the
   * only thing that still knows. A moment after the capture the stones are the
   * captor's own buildings and nothing can tell them from the ones he raised.
   */
  capturedWonder?: boolean;
  /**
   * True when the thing just finished was a **wonder** — Dinocrates' clause.
   *
   * `capturedWonder`'s sibling and passed for its reason exactly: the caller is
   * the one thing holding the row it has realised, and a moment later a wonder
   * is simply one more entry in a town's `buildings` list. Carried only by the
   * completion occasions, so a rider asking for it on any other pays nothing.
   */
  wonder?: boolean;
  /**
   * The population the town **grew to** — First Fruits' first citizen.
   *
   * The two facts above are passed because the caller is the only thing that
   * still knows; this one is passed because the *payout* has no town at all.
   * `windfallPayout` is asked of an empire and an occasion, and a growth is the
   * one occasion whose whole subject is a single city — so the figure travels
   * as a fact about the occasion rather than as a city handed to a function
   * that would then have to decide what to do with one on a chop.
   */
  population?: number;
}

/**
 * Composes the printed number for one occasion. `base` is what the occasion
 * pays with no cards at all; pass 0 for an occasion that has no figure of its
 * own (a death, a kill, a capture) and read the grants.
 *
 * `baseHeal` is the same idea for the *other* thing an occasion can pay
 * (2026-08-28): hit points the act itself restores, before a single card has
 * spoken. A pillage pays `improvements.pillageHeal` to whoever struck the works
 * and Scorched Earth adds to that; both arrive in `payout.heal` as one figure,
 * for exactly the reason the gold does — **the printed number is composed here
 * or it is composed twice**. It is deliberately *not* a `lines` entry: `lines`
 * is the register of what the **cards** did, and an occasion's own figure has
 * never appeared there (`base` does not either).
 *
 * **Batch X restates Entry XVIII.5.** The rule was "one printed figure"; it is
 * now *one exact banked figure, printed rounded*. Base and every rider still
 * compose before anything is banked — that was always the whole point, and it is
 * why a rider is a percentage on a running total rather than a second payment —
 * but the composition no longer floors, so a fifth of a turn's science and half
 * again on a one-point trickle are paid rather than swallowed. The surface
 * rounds the answer (`src/sim/yieldFormat.ts`); the pool keeps it.
 */
export function windfallPayout(
  state: GameState,
  playerId: number,
  occasion: WindfallOccasion,
  base = 0,
  baseHeal = 0,
  facts: WindfallOccasionFacts = {},
): WindfallPayout {
  const payout: WindfallPayout = {
    amount: base,
    grants: [],
    heal: baseHeal,
    units: [],
    healAll: false,
    timed: [],
    renown: [],
    pressure: [],
    lines: [],
  };
  let percent = 0;
  // The era multiplier (Entry XXVIII). **One** factor however many riders ask
  // for it, which is Entry XVII's "additive within a stage, applied once" read
  // at this scale: two cards that each say "×your era" agree rather than
  // compounding into ×era². Computed before the walk so a rider's own grant can
  // use the same figure the occasion's payout does.
  const era = highestAge(playerById(state, playerId)?.techsResearched ?? []);
  // The slotted-Order multiplier (War Chief). `perAge`'s sibling and hoisted
  // beside it for the same reason: **one** factor however many riders ask for
  // it, and computed before the walk so a rider's own grant multiplies by the
  // same count the occasion's figure does. Zero is a real answer — an empire
  // with an empty council rides no harder — and it makes every figure on this
  // payout zero, which drops the lines rather than printing noughts.
  const slotted = filledOrderSlots(state, playerId);
  let ageMultiplied = false;
  let slotMultiplied = false;
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'windfallRider')) {
    if (effect.occasion !== occasion) continue;
    // The occasion narrowed by who was on the other side of it. A rider that
    // asks for the wild and did not get it is simply not on this payout — the
    // same reading `combatLine`'s conditions take, one system over.
    if (effect.vsBarbarians === true && facts.vsBarbarians !== true) continue;
    // The same narrowing, one fact over: The Empire pays for a town with a
    // wonder in it and not for a town.
    if (effect.capturedWonder === true && facts.capturedWonder !== true) continue;
    // And the third: First Fruits pays for the citizen that makes a town two
    // people, not for a citizen. An occasion that carries no population at all
    // (every occasion but a growth) never satisfies it, which is what keeps a
    // row written onto the wrong occasion silent rather than universal.
    if (effect.atPopulation !== undefined && facts.population !== effect.atPopulation) continue;
    // And the fourth: Dinocrates pays for a wonder raised, not for a granary.
    // An occasion that carries no such fact never satisfies it.
    if (effect.wonder === true && facts.wonder !== true) continue;
    if (effect.perAge === true) {
      ageMultiplied = true;
      if (era > 1) payout.lines.push({ card, source, note: `×${era} (Æra ${eraNumeral(era)})` });
    }
    if (effect.perSlottedOrder === true) {
      slotMultiplied = true;
      // Noted only when it *changes* the figure, which is `perAge`'s rule for
      // Æra I exactly: a ×1 is not news, and a ×0 has already deleted every
      // line it would have annotated.
      const orders = slotted === 1 ? 'Order' : 'Orders';
      if (slotted > 1) payout.lines.push({ card, source, note: `×${slotted} (slotted ${orders})` });
    }
    if (effect.percent !== undefined) {
      const share = effect.percent;
      if (share !== 0) {
        percent += share;
        payout.lines.push({ card, source, note: `${share > 0 ? '+' : ''}${share}%` });
      }
    }
    const grant = effect.grant;
    if (!grant) continue;
    if (grant.heal !== undefined) {
      const heal = grant.heal;
      if (heal !== 0) {
        payout.heal += heal;
        payout.lines.push({ card, source, note: `heals ${heal}` });
      }
    }
    if (grant.healAll === true) {
      payout.healAll = true;
      payout.lines.push({ card, source, note: 'your units are healed' });
    }
    if (grant.timed !== undefined && grant.timed.effects.length > 0) {
      // The *turns* are the card's own and the effects travel untouched:
      // `timedLive` reads them the way it reads a rite's, because a bill is a
      // bill.
      const turns = Math.max(1, grant.timed.turns);
      payout.timed.push({ card, source, turns, effects: grant.timed.effects });
      payout.lines.push({ card, source, note: `for ${turns} turns` });
    }
    if (grant.renown !== undefined && grant.renown !== 0) {
      // Multiplied by the era and by the council exactly as a yield grant is —
      // two independent facts about the payout, composing as a product — and
      // composed here so the announcement and the pool see one figure.
      const amount =
        grant.renown *
        (effect.perAge === true ? era : 1) *
        (effect.perSlottedOrder === true ? slotted : 1);
      if (amount !== 0) {
        payout.renown.push({ card, source, amount });
        payout.lines.push({ card, source, note: `${signed(amount)} renown` });
      }
    }
    if (grant.pressure !== undefined && grant.pressure.amount !== 0) {
      // Multiplied by the era and by the council exactly as a yield grant is,
      // for that grant's reason: one printed figure, composed before anything is
      // banked. The *range* is not multiplied — it is a distance the row names
      // and not a payout.
      const amount =
        grant.pressure.amount *
        (effect.perAge === true ? era : 1) *
        (effect.perSlottedOrder === true ? slotted : 1);
      if (amount !== 0) {
        payout.pressure.push({ card, source, amount, range: grant.pressure.range });
        payout.lines.push({ card, source, note: `${signed(amount)} faith pressed` });
      }
    }
    if (grant.unit !== undefined) {
      // Drawn here, delivered later. `randomMilitary` is "one of the soldiers
      // this empire could raise today", which is what makes the gift keep pace
      // with the tree; the draw is `state.rng`, so a replay lands the same
      // spearman. A realm that can raise nothing at all is gifted nothing, and
      // says so by leaving the list empty.
      const roster = buildableMilitary(state, playerId);
      if (roster.length > 0) {
        const type = roster[Math.min(roster.length - 1, Math.floor(nextFloat(state.rng) * roster.length))]!;
        payout.units.push({ card, source, type });
        payout.lines.push({ card, source, note: `a ${unitDef(type).name} joins you` });
      }
    }
    if (grant.yield !== undefined && grant.amount !== undefined) {
      // **A figure quoted in turns** — The Lyceum's extra turn of culture. The
      // rate is read here, with every other figure on this payout, because Entry
      // XVIII.5's whole rule is that the number is composed once before anything
      // is banked: a preview that quoted one turn and a settlement that read the
      // rate again would be two answers to one sentence. Asked lazily, so an
      // occasion no such rider names never sweeps the empire's books.
      if (grant.fromRate !== undefined) {
        const turns = grant.amount;
        const rate = rateOf(state, playerId, grant.fromRate, foldEmpireRates(state, playerId));
        // **Exact** since batch X (Entry XVIII.5 restated: composed exactly,
        // banked exactly, rounded only where it is printed). It used to floor,
        // which quietly paid nothing at all for The Natural Philosophers' fifth
        // of a turn in an empire making four science.
        const amount = turns * rate;
        if (amount !== 0) {
          payout.grants.push({ card, source, yield: grant.yield, amount });
          payout.lines.push({ card, source, note: `${signed(amount)} ${grant.yield}` });
        }
        continue;
      }
      // A rider's own grant is multiplied by the era when *that rider* says so —
      // Rites of Blood pays fifteen faith a kill in Æra I and forty-five in Æra
      // III — which is a fact about the card and not about the occasion. The
      // slotted-Order count multiplies the same way and the two **compose as a
      // product**: a rider carrying both is ×era × slots, because they are two
      // independent facts about the payout rather than two competing scalings of
      // one.
      const amount =
        grant.amount *
        (effect.perAge === true ? era : 1) *
        (effect.perSlottedOrder === true ? slotted : 1);
      if (amount !== 0) {
        payout.grants.push({ card, source, yield: grant.yield, amount });
        payout.lines.push({ card, source, note: `${signed(amount)} ${grant.yield}` });
      }
    }
  }
  // Summed, then applied once — see the docblock. **Exact** since batch X: the
  // riders still compose into ONE figure before anything is banked (Entry
  // XVIII.5), and that figure is now the exact one rather than a floored one.
  // The era multiplies **last**, on the figure the percentages already reached,
  // so "×your era" is a fact about the money rather than a competitor to the
  // percentages.
  if (percent !== 0 && base !== 0) payout.amount = (base * (100 + percent)) / 100;
  if (ageMultiplied) payout.amount *= era;
  if (slotMultiplied) payout.amount *= slotted;
  return payout;
}

/**
 * The **military** types this empire could raise right now, in roster order.
 *
 * The pool Camp Followers' gift is drawn from, and it is deliberately "could
 * raise" rather than "has ever unlocked": a card that keeps pace with the tree
 * is the whole of what "a random military unit" means on a card that will be
 * held for two hundred turns.
 *
 * The tech gate is asked of `UNIT_UNLOCK_TECH` directly rather than through
 * `buildError` (`tech.ts`), which reads *this* module and may not be read back.
 * That costs the resource clause — a card may gift a swordsman to an empire
 * with no iron — and that is the honest trade rather than an oversight: a
 * *gift* is not a levy, nothing was spent on it, and the alternative is a
 * runtime cycle. Rows sold out of their own bank (the augur) and rows that are
 * *called* rather than built (a great person) are excluded, in their own
 * markers, so nothing here compares a type against a name.
 *
 * **Roster order**, which is file order, because a draw over it is a seeded
 * outcome and an outcome that depends on an order must depend on an order the
 * data itself carries (CLAUDE.md's iteration rule).
 */
function buildableMilitary(state: GameState, playerId: number): UnitTypeId[] {
  const techs = playerById(state, playerId)?.techsResearched ?? [];
  const list: UnitTypeId[] = [];
  for (const id of UNIT_TYPE_IDS) {
    const def = unitDef(id);
    if (def.category !== 'military') continue;
    if (def.purchase !== undefined) continue;
    if (def.greatWork === true) continue;
    const gate = UNIT_UNLOCK_TECH.get(id);
    if (gate !== undefined && !techs.includes(gate)) continue;
    list.push(id);
  }
  return list;
}

/**
 * How many of this empire's Order slots are **filled**.
 *
 * The non-null entries of `PlayerStatecraft.slots` — held-but-unslotted Orders
 * deliberately do not count, because slotting is the decision the government's
 * spread makes scarce and a card that pays for it has to pay for *that*. A
 * derived count and never a stored one, for `barbarianRoles`' reason: a number
 * on the player would have to be maintained by every path that slots, unslots,
 * or rebuilds the spread on adoption, and one missed path is a silent
 * miscount.
 */
export function filledOrderSlots(state: GameState, playerId: number): number {
  const sc = statecraftOf(state, playerId);
  if (!sc) return 0;
  let count = 0;
  for (const slot of sc.slots) {
    if (slot) count += 1;
  }
  return count;
}

/**
 * **The deck-readers' reading**: how many Orders this empire has in a chair
 * whose own flavour is `flavour`. Absent counts every one, which is
 * `filledOrderSlots` and answered by it.
 *
 * The one place "what kind of council is this" is decided, because two readers
 * ask it — `countOf`'s `slottedOrdersOfSlot` (The Guild Charter's coin, The
 * Synod's candles) and `combatScaleCount`'s (The War Council's spears) — and two
 * implementations of it would be two answers to the question a player is
 * looking at on one screen.
 *
 * **`OrderDef.slot`, never the chair's type** (the user's Senatus, verbatim:
 * *"not a wildcard slot filled, a wildcard card that is active"*). A wildcard
 * chair takes any card, so the chair says nothing about what was put in it; the
 * card's own flavour is the thing a player drafts toward. A reader therefore
 * **counts itself**, which is deliberate — the floor of a deck-reader is one
 * helping, and the card's whole promise is that the figure moves when a card
 * beside it is slotted.
 */
export function slottedOrdersOfFlavour(
  state: GameState,
  playerId: number,
  flavour?: SlotType,
): number {
  const sc = statecraftOf(state, playerId);
  if (!sc) return 0;
  let count = 0;
  for (const slot of sc.slots) {
    if (slot === null) continue;
    if (flavour !== undefined && orderDef(slot.card).slot !== flavour) continue;
    count += 1;
  }
  return count;
}

/**
 * The cadenced drafts this empire's cards open — Keeper of the Calendar's, and
 * nothing else today.
 *
 * A reader like every other, so the *phase* that opens the offer
 * (`openPeriodicOffers` in `religion.ts`) never touches a `CardEffect`. Which is
 * the point: the one-evaluator rule is not "religion has its own evaluator", it
 * is that this file is still the only file that knows what a `periodicOffer`
 * looks like.
 */
export function cardPeriodicOffers(
  state: GameState,
  playerId: number,
): { source: string; every: number; site: 'ruins' | 'village' }[] {
  const list: { source: string; every: number; site: 'ruins' | 'village' }[] = [];
  for (const { source, effect } of effectsOfKind(state, playerId, 'periodicOffer')) {
    if (effect.every <= 0) continue;
    list.push({ source, every: Math.floor(effect.every), site: effect.site });
  }
  return list;
}

/**
 * **What this empire's law hangs on a piece that has just come ashore** —
 * Admiralty's three turns, and nothing else today (`CardLandfallEffect`).
 *
 * A reader like every other, so the *walk* that lands the piece
 * (`advanceAlongPath`, `movement.ts`) never touches a `CardEffect`: it asks what
 * the law gives a landing and stamps whatever comes back. The card is carried
 * out with each row because the stamp is labelled with it — a `TimedEffect`
 * names the card that hung it, which is how the ledger says "Admiralty · 2 turns
 * left" without this file being asked again.
 *
 * A row is returned whatever it carries, including nothing at all: the caller
 * skips an empty bag, which is the honest reading of a row that promises nothing
 * rather than an empty list written onto a soldier.
 */
export function cardLandfallEffects(
  state: GameState,
  playerId: number,
): { card: CardId; source: string; effect: CardLandfallEffect }[] {
  const list: { card: CardId; source: string; effect: CardLandfallEffect }[] = [];
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'landfall')) {
    list.push({ card, source, effect });
  }
  return list;
}

/**
 * Musters the pieces this empire's cards raise **on a cadence** — The Standing
 * Levy's spear, and nothing else today.
 *
 * `openPeriodicOffers`' twin one currency over, and it is written the same way
 * on purpose: a phase reads a list this file produced, the cadence is the same
 * absolute `turn % every === 0` comparison, and the delivery goes through
 * `realiseItem` — the one routine that means "the city now has the thing" — so
 * a levied spearman is spawned by production's own convention and goes on no
 * payroll (`free`, exactly as a windfall's gift does).
 *
 * A seat with no capital, no buildable melee row, or nowhere to put the piece
 * simply raises nothing this turn. That is the same refusal a purchase and a
 * completion grant get, and it is silent for their reason: a town with a full
 * doorstep is not an error, it is a full doorstep.
 *
 * The wild is skipped for `runStatecraft`'s reason — it holds no cards — and
 * every sweep is in `realPlayers`, roster, then card order, so a replay
 * reproduces the musters in one fixed order.
 */
export function musterPeriodicUnits(state: GameState): void {
  for (const player of realPlayers(state)) {
    for (const { effect } of effectsOfKind(state, player.id, 'periodicMuster')) {
      const every = Math.floor(effect.every);
      if (every <= 0 || state.turn % every !== 0) continue;
      const seat = capitalCityOf(state, player.id);
      if (!seat) continue;
      const type = effect.unit === 'bestMelee' ? bestMeleeFor(state, player.id) : effect.unit;
      if (type === null) continue;
      const tile = spawnTileFor(state, seat, type);
      if (!tile) continue;
      // The row's own mark on the levy it raises — The Levée en Masse's point of
      // movement, kept for the rest of that piece's life. Handed to `realiseItem`
      // beside `free` and written by `createUnit`, the one writer of a stamp, so
      // a mustered conscript is stamped exactly where a completed warrior is.
      realiseItem(
        state,
        seat,
        { kind: 'unit', id: type, tile },
        { free: true, stamp: effect.stamp },
      );
    }
  }
}

/** The shortest a periodic clock can ever be. See `CardPeriodShortenEffect`. */
export const PERIODIC_FLOOR = 2;

/** The payout a periodic boon's *count* is asked with, and it is never read. */
export const PERIODIC_PROBE = { where: 'empire', to: 'authority', amount: 0 } as const;

/**
 * What one periodic Order's clock is **for this empire**, this instant —
 * `everyTurns` less every shortener it holds, floored at two.
 *
 * `shorten` is hoisted by the caller because it is a fact about the empire and
 * not about the card: one sweep of the law per seat per phase, `zocField`'s
 * bargain at the scale of a clock.
 */
function periodOf(everyTurns: number, shorten: number): number {
  return Math.max(PERIODIC_FLOOR, Math.floor(everyTurns) - shorten);
}

/**
 * **The periodic boons** — the calendar's own phase (`CardPeriodicEffect`).
 *
 * Two clocks, and which one a card is on is decided by whether it sits in a
 * chair:
 *
 *   · **a slotted Order** keeps an absolute stamp on its slot record
 *     (`SlottedOrder.nextFiresTurn`), so its cadence runs from the turn it was
 *     placed rather than from the world's calendar — which is what makes
 *     "slotting this is worth doing now" a real decision. A slot with no stamp is
 *     stamped on the first phase after the card is placed, and the stamp dies
 *     with the chair;
 *   · **anything else** — a technology's gift, a building's, a Doctrine's — is on
 *     the world's clock, `state.turn % period === 0`, which is `periodicMuster`'s
 *     and `periodicOffer`'s reading exactly. There is no chair to hang a stamp on
 *     and none is invented: a node held forever has nothing to date its cadence
 *     from but the calendar.
 *
 * **Nothing ticks.** The stamp is compared and re-stamped, never counted down;
 * `firePeriod` records the clock the stamp was made under, so a shortener slotted
 * or unslotted since moves the stamp by exactly the difference (see
 * `CardPeriodShortenEffect` — the rule and its symmetry) and no hook in the
 * reducer is needed.
 *
 * The boon is a **windfall**: its figure is composed once with every rider before
 * anything is banked (Entry XVIII.5), which is what makes "your boons pay more" a
 * `windfallRider` on the `periodic` occasion rather than a second rule.
 *
 * `bankRenown` is injected rather than imported, and that is the module boundary
 * doing its job: renown is added in exactly one place (`settleRenownWindfall`,
 * `renown.ts`) and that file reads *this* one, so the phase's caller — `turn.ts`,
 * which holds both — hands the seam in. A boon paying renown with no banker given
 * pays nothing, which is the honest answer for a caller that did not offer one.
 *
 * `realPlayers` order, then slot order, then walk order, so a replay reproduces
 * every firing in one fixed sequence. The wild is skipped for `runStatecraft`'s
 * reason: it holds no cards.
 */
export function runPeriodicBoons(
  state: GameState,
  bankRenown?: (state: GameState, player: Player, amount: number) => void,
): void {
  for (const player of realPlayers(state)) {
    const sc = player.statecraft;
    let shorten = 0;
    for (const { effect } of effectsOfKind(state, player.id, 'periodShorten')) {
      shorten += Math.floor(effect.turns);
    }
    // The chairs first, in slot order — the stamped clock.
    const seated = new Set<CardId>();
    for (const slot of sc.slots) {
      if (!slot || !isOrderId(slot.card)) continue;
      seated.add(slot.card);
      for (const effect of orderDef(slot.card).effects) {
        if (effect.kind !== 'periodic') continue;
        const period = periodOf(effect.everyTurns, shorten);
        if (slot.nextFiresTurn === undefined) {
          slot.nextFiresTurn = state.turn + period;
          slot.firePeriod = period;
          continue;
        }
        // The clock changed under an outstanding stamp: move it by the change and
        // by nothing else. Exact, symmetric, reversible — see the shape.
        if (slot.firePeriod !== undefined && slot.firePeriod !== period) {
          slot.nextFiresTurn += period - slot.firePeriod;
          slot.firePeriod = period;
        }
        if (state.turn < slot.nextFiresTurn) continue;
        payPeriodicBoon(state, player, slot.card, CLASS_WORD.order, effect, bankRenown);
        slot.nextFiresTurn = state.turn + period;
        slot.firePeriod = period;
      }
    }
    // Everything else, on the world's clock.
    for (const { source, card, effect } of effectsOfKind(state, player.id, 'periodic')) {
      if (seated.has(card)) continue;
      const period = periodOf(effect.everyTurns, shorten);
      if (state.turn % period !== 0) continue;
      payPeriodicBoon(state, player, card, source, effect, bankRenown);
    }
  }
}

/**
 * One boon, composed and banked — the half of `runPeriodicBoons` that is about
 * money rather than about clocks.
 *
 * The figure is a flat or a count, and the count is the simulation's own
 * (`countOf`) asked through a probe carrying the row's arguments — so a periodic
 * boon and a `pays` count line cannot disagree about how many faith houses an
 * empire has. Composed through `windfallPayout` before a coin moves, and banked
 * through `payWindfallGrants`, which is the one seam that pays a windfall.
 */
function payPeriodicBoon(
  state: GameState,
  player: Player,
  card: CardId,
  source: string,
  effect: CardPeriodicEffect,
  bankRenown?: (state: GameState, player: Player, amount: number) => void,
): void {
  const each = effect.amount ?? 1;
  let figure = Math.floor(effect.amount ?? 0);
  if (effect.count !== undefined) {
    const probe: CardPaysEffect = {
      kind: 'pays',
      basis: 'count',
      ...PERIODIC_PROBE,
      count: effect.count,
      per: effect.per,
      max: effect.max,
      building: effect.building,
      category: effect.category,
      categories: effect.categories,
      slot: effect.slot,
      voice: effect.voice,
      class: effect.class,
      tally: effect.tally,
    };
    figure = helpings(countOf(state, player.id, card, probe), effect.per, effect.max) * each;
  }
  const payout = windfallPayout(state, player.id, 'periodic', figure);
  if (effect.pays === 'renown') {
    if (payout.amount !== 0) bankRenown?.(state, player, payout.amount);
  } else if (payout.amount !== 0) {
    payout.grants.push({ card, source, yield: effect.pays, amount: payout.amount });
  }
  const touched = payWindfallGrants(state, player, payout);
  // The settlement register's own rule: a grant that filled a basket settles it
  // the instant it lands. `settleGrowthWindfall` settles the hammers too.
  for (const city of touched) settleGrowthWindfall(state, city);
  settleCultureWindfall(state, player);
}

/**
 * Pays a windfall's *grants* — the voices a rider adds outright — into the
 * empire's banks and the nearest city's baskets.
 *
 * `at` is where the occasion happened, which is what resolves "its nearest
 * city": the same `nearestOwnedCity` a discovery uses, so a Widow's Levy and a
 * grain cache name the same town. Returns which cities were touched, so the
 * caller can settle them (the windfall settlement register in CLAUDE.md).
 *
 * `realized`, if passed, collects the pieces that actually found a hex to
 * stand on — type and the city they arrived in — for a caller whose
 * announcement needs to name them (Camp Followers'). Optional and additive
 * only: every existing caller that does not pass it sees no change at all.
 *
 * `press` is the **faith seam, injected** — see the parameter. It keeps this the
 * one place a windfall is paid, which is the invariant that matters: a second
 * function that banked half a payout would be a second implementation of what an
 * occasion hands over.
 */
export function payWindfallGrants(
  state: GameState,
  player: Player,
  payout: WindfallPayout,
  at?: { col: number; row: number },
  realized?: { type: UnitTypeId; cityName: string }[],
  /**
   * How a lump of this empire's faith is pressed on the towns around `at` — The
   * Crusade's (`WindfallGrantSpec.pressure`).
   *
   * **Injected rather than imported**, and that is the module boundary doing its
   * job, exactly as `runPeriodicBoons`' `bankRenown` is: `pressLump` is the one
   * routine that presses a lump and it lives in `religion.ts`, which reads *this*
   * file — so the seam is handed in by the caller that holds both (`combat.ts`,
   * where a kill happens). A payout carrying a lump on a caller that offered no
   * presser presses nothing, which is the honest answer for a caller that did not
   * offer one.
   */
  press?: (amount: number, range: number, at: { col: number; row: number }) => void,
): City[] {
  const touched: City[] = [];
  // **The pieces first**, because a gifted soldier is a thing that arrives
  // somewhere and the yields are book-keeping. Delivered through `realiseItem`
  // — the one routine that means "the city now has the thing" — so the spawn
  // convention is production's own and this is not a second way to mint a unit.
  // A town with nowhere to put it keeps the gift undelivered rather than
  // stacking a piece on a full hex; `spawnTileFor` is the same refusal a
  // purchase gets.
  for (const gift of payout.units) {
    const city = at ? nearestOwnedCity(state, player.id, at) : capitalCityOf(state, player.id) ?? null;
    if (!city) continue;
    const tile = spawnTileFor(state, city, gift.type);
    if (!tile) continue;
    // `free`, because a windfall is by definition a thing nobody paid for: the
    // Levies' spearman and Camp Followers' stray go on no payroll. See
    // `Unit.freeUpkeep`, entry 2.
    realiseItem(state, city, { kind: 'unit', id: gift.type, tile }, { free: true });
    realized?.push({ type: gift.type, cityName: city.name });
  }
  for (const grant of payout.grants) {
    if (grant.yield === 'gold') player.gold += grant.amount;
    else if (grant.yield === 'science') player.sciencePool += grant.amount;
    else if (grant.yield === 'culture') player.culturePool += grant.amount;
    // The banks are a line of the meters too — see `collectYields` (batch M3).
    else if (grant.yield === 'faith') player.faithPool += grant.amount;
    else {
      const city = at ? nearestOwnedCity(state, player.id, at) : capitalCityOf(state, player.id) ?? null;
      if (!city) continue;
      if (grant.yield === 'food') city.foodBasket += grant.amount;
      else city.hammerBasket += grant.amount;
      if (!touched.includes(city)) touched.push(city);
    }
    bumpEconomy(state);
  }
  // **The whole army, made whole** — The Empire's. Written straight onto the
  // pieces rather than through `healUnits`, because that phase is the *rested*
  // rule and this is a windfall: a legion that marched into the breach this turn
  // is exactly the legion the clause is about. `state.units` order, so a replay
  // reproduces it.
  if (payout.healAll) {
    for (const unit of state.units) {
      if (unit.ownerId !== player.id) continue;
      unit.hp = unitMaxHp(unit);
    }
  }
  // **The only writer of `Player.timed`** — Crassus' bill, stamped at an
  // absolute turn like every other timed effect and swept by the same broom.
  // One entry per effect, `stampRite`'s shape, because every reader walks a flat
  // list and a nested one would be a second shape to unwrap.
  for (const hung of payout.timed) {
    const expiresTurn = state.turn + hung.turns;
    const list = player.timed ?? [];
    for (const effect of hung.effects) list.push({ card: hung.card, effect, expiresTurn });
    player.timed = list;
    // **What the realm is carrying is `liveEffects`' eighth source** (batch M3,
    // `slate.ts`) — Crassus' bill is an ordinary card effect in every ledger it
    // reaches, the meters' among them. Announced where it is hung.
    bumpEconomy(state);
  }
  // **The renown last**, and through `settleRenownWindfall` — the one place
  // renown is ever added, and the seam that opens a great-person offer the
  // moment the ladder fills. Last because that settlement can deal an offer, and
  // a deal is the loudest thing a windfall does: the coin, the pieces and the
  // bills should all be banked before the sheet comes up. One grant a line, so
  // two riders on one occasion read as two reasons in `explainRenown`.
  // **The lump**, before the renown and after the coin, for the timed bill's
  // reason: a conversion changes what a town is worth and the books above have
  // already been written. It needs the hex — a lump is pressed *somewhere* — so a
  // payout with no place to have happened presses nothing.
  if (payout.pressure.length > 0 && press && at) {
    for (const lump of payout.pressure) press(lump.amount, lump.range, at);
  }
  if (payout.renown.length > 0) {
    settleRenownWindfall(
      state,
      player,
      payout.renown.map((line) => ({ family: null, amount: line.amount })),
    );
  }
  return touched;
}

// --- the flag-shaped hooks --------------------------------------------------

/**
 * **Does this empire's law declare this rule?** The one flag-shaped reading.
 *
 * Four functions stood here before batch H6 — one per flag kind — and they were
 * the same six lines four times over: walk the live list, compare the id, answer
 * yes. The four kinds are one `rule` shape now (`CardRuleEffect`) and this is
 * the whole of what reads it.
 *
 * The **doors below stay four** and stay typed, because that half was never the
 * duplication: a seam that means "is a chop free" has no business being able to
 * ask whether the wild is passive, and a sub-union each is what refuses it at
 * compile time. Every one of them is one line onto this walk.
 */
function cardRuleHolds(state: GameState, playerId: number, rule: CardFlagRuleId): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'rule')) {
    if (effect.rule === rule) return true;
  }
  return false;
}

/** Does this empire hold a card declaring this action rule? */
export function cardActionRule(state: GameState, playerId: number, rule: ActionRuleId): boolean {
  return cardRuleHolds(state, playerId, rule);
}

/** Does this empire hold a card declaring this behaviour rule? */
export function cardBehaviorRule(
  state: GameState,
  playerId: number,
  rule: BehaviorRuleId,
): boolean {
  return cardRuleHolds(state, playerId, rule);
}

/**
 * Which **glass beads** this empire's standing cards mint on this occasion.
 *
 * The card half of the four Æra V bead Orders, and the whole of what this module
 * knows about them: it answers *which rows*, and `awardOrderBeads` (`beads.ts`)
 * answers *how a bead is earned*, which is `awardBead` and nothing else. The
 * evaluator's one-switch rule is kept exactly — `beadPerOccasion` is read here
 * and nowhere else in the game.
 *
 * `count` is the empire's own running total of this occasion, the one the seam
 * already keeps. A row asking for a **rhythm** (`every`) is paid only on a
 * multiple of it, and paid nothing at all where the seam counts nothing: a card
 * that promises a bead for every second deed and was handed no tally would
 * otherwise pay on the first, which is the card lying about itself. A row with
 * no rhythm ignores `count` altogether.
 *
 * File order, like every other fold here, so two Orders minting on one occasion
 * always resolve the same way.
 */
export function cardBeadOccasions(
  state: GameState,
  playerId: number,
  occasion: OrderBeadOccasion,
  count?: number,
): BeadGrantId[] {
  const minted: BeadGrantId[] = [];
  for (const { effect } of effectsOfKind(state, playerId, 'beadPerOccasion')) {
    if (effect.occasion !== occasion) continue;
    const every = Math.max(1, Math.floor(effect.every ?? 1));
    if (every > 1) {
      if (count === undefined || count <= 0 || count % every !== 0) continue;
    }
    minted.push(effect.bead);
  }
  return minted;
}

/** Does this empire hold a card declaring this offer rule? */
export function cardOfferRule(state: GameState, playerId: number, rule: OfferRuleId): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'offerRider')) {
    if (effect.rule === rule) return true;
  }
  return false;
}

/**
 * One line of what a card takes off a purchase price. See `CardPurchaseRiderEffect`.
 */
export interface CardPurchaseLine {
  card: CardId;
  source: string;
  percent: number;
}

/**
 * Every purchase rider this empire's cards put on **one thing for sale** — the
 * ordered lines `explainPurchaseCost` folds into its bank.
 *
 * A list rather than a number for rule 5's reason at the scale of a price tag:
 * the Religion screen prints the augur's price line by line, and a quarter off
 * with no name beside it is exactly the silence a breakdown exists to prevent.
 * The caller sums them and multiplies **once** — two riders on one purchase are
 * additive, as everything else in this game that stacks is.
 *
 * Two arguments where there was one, because Crassus and Jakob Fugger discount
 * "units and buildings" and a `UnitFilter` cannot name a granary: `kind` is what
 * the row's own `on` is matched against, and `type` is the unit's — required for
 * a unit, meaningless for a building. The filter is asked only of a unit, so a
 * building rider needs no vocabulary it does not have (see
 * `CardPurchaseRiderEffect`).
 */
export function cardPurchaseRiders(
  state: GameState,
  playerId: number,
  kind: 'unit' | 'building',
  type?: UnitTypeId,
): CardPurchaseLine[] {
  const list: CardPurchaseLine[] = [];
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'purchaseRider')) {
    const on = effect.on ?? 'unit';
    if (on !== 'all' && on !== kind) continue;
    if (kind === 'unit' && (type === undefined || !unitMatches(type, effect.class))) continue;
    const percent = effect.percent;
    if (percent === 0) continue;
    list.push({ card, source, percent });
  }
  return list;
}

/**
 * How many extra belief slots this empire's cards open — Stonehenge's one, and
 * Djenné's.
 *
 * A number rather than a list, because the consumer is a *count* and not a
 * ledger: `pantheonSlots` (`religion.ts`) is "how many gods may I hold", and
 * every reading of it — the consecration screen, `hasOpenBeliefSlot`, the offer
 * — folds the technologies' slots and these in one place.
 */
/**
 * Does one of this empire's cards open this building row?
 *
 * `unlocksBuilding`'s one *rule* reader, and the shape stopped being a
 * description the day buildings could be bought (Entry XXIX): The Gilded Court
 * really does hand over the Gilded Hall now. Asked by `isUnlocked` (`tech.ts`)
 * for a row that declares `unlockedByCard`, so availability stays one question
 * with one answer rather than a card gate beside a tech gate.
 *
 * **Two walks, because a follower belief is not the empire's law** (batch B3,
 * the four faith houses). `liveEffects` is the realm's own list and a follower
 * belief is never in it — it is pushed city-locally, into the live list of every
 * town that follows, whoever owns that town (`followerBeliefEffects`, and the
 * 2026-08-28 ruling it states). So a belief that hands over a Mosque would have
 * been invisible here, and the row would have been open to nobody at all.
 *
 * The answer the pool's own rule gives is the one written here: **the owner of a
 * following city may have the row**. The empire's law is asked first, and only a
 * realm whose law says nothing pays for the sweep of its own towns' beliefs — a
 * walk that is reached only for a row declaring `unlockedByCard`, and only when
 * nothing simpler has opened it.
 *
 * *Which* town may raise one is a second question and it is not this one:
 * `purchaseError` asks it of the town in hand (`cityBeliefUnlocksBuilding`,
 * `BuildingDef.followingOnly`), exactly as a wonder's site is asked there rather
 * than folded into availability.
 */
export function cardUnlocksBuilding(
  state: GameState,
  playerId: number,
  building: BuildingId,
): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'unlocksBuilding')) {
    if (effect.building === building) return true;
  }
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (cityBeliefUnlocksBuilding(state, city, building)) return true;
  }
  return false;
}

/**
 * Does the faith **this town keeps** open this building row?
 *
 * `cardUnlocksBuilding`'s town-scale half, and the one reading of "only in a
 * city that follows": a follower belief reaches a town through
 * `followerBeliefEffects`, which is asked of `cityReligion(city)` — the strict
 * majority of the citizens, derived — so a row this answers `true` for is a row
 * whose belief is in the house of the faith this town actually keeps. A town
 * that turns loses it the same turn, and a captured one carries it to its new
 * owner, both of which fall out of the walk rather than being written anywhere.
 *
 * Read in exactly one place — `purchaseError`, for a row that declares
 * `BuildingDef.followingOnly` — because it is a rule about *where a thing may be
 * raised*, which is the purchase's question and nobody else's. Nothing here
 * compares a building id or a religion against a name.
 */
export function cityBeliefUnlocksBuilding(
  state: GameState,
  city: City,
  building: BuildingId,
): boolean {
  for (const { effect } of followerBeliefEffects(state, city)) {
    if (effect.kind !== 'unlocksBuilding') continue;
    if (effect.building === building) return true;
  }
  return false;
}

/**
 * Does one of this empire's cards hand over this **verb**? The Muses' Call's
 * one clause.
 *
 * `cardUnlocksBuilding`'s sibling in every respect, one register over: that one
 * is asked by `isUnlocked` for a shelf and this one by `hasAbility` (`tech.ts`)
 * for a verb, so a door has one answer whether it was the tree that opened it
 * or the empire's own law. `CardGrantsAbilityEffect`'s docblock is where the
 * design reason lives; `hasAbility` is the one reader of this function, exactly
 * as `isUnlocked` is the one reader of that one.
 */
export function cardGrantsAbility(
  state: GameState,
  playerId: number,
  ability: AbilityId,
): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'grantsAbility')) {
    if (effect.ability === ability) return true;
  }
  return false;
}

/**
 * Does one of this empire's cards open this **roster** row?
 *
 * `cardUnlocksBuilding`'s twin one table over, asked by `isUnlocked` (`tech.ts`)
 * for a row that declares `UnitDef.unlockedByCard` — so a belief that hands over
 * a line of soldiers is one clause of the one availability question rather than
 * a gate of its own beside it.
 *
 * Holy Order is an **enhancer** belief, which is to say it pays the founder: the
 * effects reach this walk through `liveEffects` off the empire that holds the
 * holy site, and the Templars are that empire's to call and nobody else's. That
 * is the whole of the rule, and it is not written here — it is where every
 * founder-side clause already lives.
 */
export function cardUnlocksUnit(state: GameState, playerId: number, unit: UnitTypeId): boolean {
  for (const { effect } of effectsOfKind(state, playerId, 'unlocksUnit')) {
    if (effect.unit === unit) return true;
  }
  return false;
}

export function cardPantheonSlots(state: GameState, playerId: number): number {
  let total = 0;
  for (const { effect } of effectsOfKind(state, playerId, 'pantheonSlots')) {
    total += effect.amount;
  }
  return total;
}

/**
 * Does this empire's law make its **borders** exert a zone of control?
 *
 * The Great Wall's one clause, asked of an empire rather than of a hex, so
 * `zocField` resolves it once per sweep beside the units and the cities it
 * already walks. See the `borders` rule.
 */
/**
 * How far this empire's cards move one number of **the tide**, in all.
 *
 * The `meterRule` pattern one system over (`cardMeterRule`): every live
 * `pressureRule` naming this rule, summed, so
 * two enhancer beliefs that both widen a range are additive exactly as
 * everything else in this game that stacks is. Read in exactly one place —
 * `explainPressure` (`religion.ts`) — which is what keeps the whole enhancer
 * pool a table of JSON rows.
 *
 * The rules that are really switches (`routeBothWays`) are read as "is this
 * above zero"; the shape has no boolean, and inventing one for a single row
 * would be a second way to say the same thing.
 */
export function cardPressureRule(
  state: GameState,
  playerId: number,
  rule: PressureRuleId,
): number {
  let total = 0;
  for (const entry of effectsOfKind(state, playerId, 'pressureRule')) {
    if (entry.effect.rule !== rule) continue;
    total += entry.effect.delta;
  }
  return total;
}

/** One standing source of pressure a building projects. See `cardPressureSources`. */
export interface CardPressureSource {
  source: string;
  city: City;
  amount: number;
  range: number;
}

/**
 * Every **located** source of religious pressure this empire's buildings supply
 * — Hagia Sophia's, today.
 *
 * It walks the empire's towns rather than `liveEffects`, and that is the whole
 * reason it is a reader of its own: a pressure source presses *from somewhere*,
 * and `liveEffects` deliberately forgets which town a wonder stands in (its
 * clauses say so themselves through `hasBuilding`). A fold that had lost the
 * city could not answer "within eight hexes of what".
 *
 * It follows the stones like every other wonder reading: a captured Hagia Sophia
 * presses for its captor's faith the turn the town changes hands, because this
 * asks the town's `buildings` list and nothing else.
 */
export function cardPressureSources(state: GameState, playerId: number): CardPressureSource[] {
  const out: CardPressureSource[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const id of city.buildings) {
      for (const effect of buildingDef(id).effects ?? []) {
        if (effect.kind !== 'pressure') continue;
        const pressure: CardPressureEffect = effect;
        out.push({
          source: `${isWonder(id) ? CLASS_WORD.wonder : CLASS_WORD.building} · ${buildingDef(id).name}`,
          city,
          amount: pressure.amount,
          range: pressure.range,
        });
      }
    }
  }
  return out;
}

export function cardBorderZoc(state: GameState, playerId: number): boolean {
  return cardRuleHolds(state, playerId, 'borders');
}

/**
 * What this empire's cards add to one turn of one **project's** payout, summed
 * per voice — the Water Clock of Su Song's beakers on Scholarship.
 *
 * A bag rather than a list, because the consumer banks it into three pools and
 * there is no breakdown to print: the panel quotes a project's *rate*, and the
 * rate a rider changes is the rate the panel should quote (`projectRate` reads
 * this through `projectPays`). A flat addition to what comes out, never to the
 * hammers going in — see the shape's docblock for why that keeps Entry XXVI's
 * argument closed.
 */
export function cardProjectPays(
  state: GameState,
  playerId: number,
  project: ProjectId,
): ProjectPayout {
  const bag: ProjectPayout = {};
  for (const { effect } of effectsOfKind(state, playerId, 'projectRider')) {
    if (effect.project !== project) continue;
    for (const key of ['gold', 'science', 'faith', 'culture'] as const) {
      const amount = (effect.pays[key] ?? 0);
      if (amount !== 0) bag[key] = (bag[key] ?? 0) + amount;
    }
  }
  return bag;
}

/** One card's standing renown, as `explainRenown` prints it. See `cardRenownLines`. */
export interface CardRenownLine {
  card: CardId;
  source: string;
  family: Family | null;
  amount: number;
}

/**
 * Every card paying this empire renown **per turn** — the Council of Elders'
 * standing, and whatever else joins it.
 *
 * A *list*, for rule 5's reason at the scale of a count: `explainRenown`
 * (`renown.ts`) is the ordered ledger the HUD's hover prints verbatim, and a
 * government quietly adding three to a total nobody itemised is exactly the
 * silence that ledger exists to prevent. So this reader hands back lines and the
 * bucket's fold stays the only sum.
 *
 * The arithmetic is **printed into the source**, not left for the reader to do:
 * "in every city" is one line whose label says *how* it reached its figure
 * ("Government · Council of Elders · 1 per city × 3"), because a player checking
 * a hover against the ledger needs the multiplicand and the count, and three
 * identical one-renown lines would give them neither.
 *
 * A zero pays no line at all — an empire with no cities holds no counsel worth
 * recording — which is the same rule every other list in this file follows.
 */
/**
 * The payout a `renown` line's *count* is asked with, and it is never read.
 *
 * `countOf` takes a whole `CardPaysEffect` because that is the shape its
 * arguments live on (`building`, `category`, `class`, `within`), and a renown
 * line has none of them — it needs only the sweep. So the probe carries a
 * payout that satisfies the type and is discarded, rather than `countOf` growing
 * a second signature for callers that only want the number.
 */
const RENOWN_PROBE = { where: 'empire', to: 'authority', amount: 0 } as const;

export function cardRenownLines(state: GameState, playerId: number): CardRenownLine[] {
  const list: CardRenownLine[] = [];
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'renown')) {
    const each = effect.amount;
    if (each === 0) continue;
    const per = effect.per;
    const helpings =
      per === 'city'
        ? cityCount(state, playerId)
        : per === 'wonder'
          ? countOf(state, playerId, card, {
              kind: 'pays',
              basis: 'count',
              ...RENOWN_PROBE,
              count: 'wonders',
            })
          : per === 'buildingOfCategory'
            ? // Patrons' culture houses, through `countOf` — the one sweep that
              // answers "how many buildings of this shelf does the realm hold",
              // so a patron's renown and a Merchant League's coin are counting
              // one thing. A row naming no shelf counts nothing.
              effect.category === undefined
              ? 0
              : countOf(state, playerId, card, {
                  kind: 'pays',
                  basis: 'count',
                  ...RENOWN_PROBE,
                  count: 'buildingsOfCategory',
                  category: effect.category,
                })
            : 1;
    const amount = each * helpings;
    if (amount === 0) continue;
    // The multiplicand and the count, printed into the label — a hover that said
    // only the total would be the one thing `explainRenown` exists to prevent.
    // A shelf names itself, because "per building" would not say which.
    const word = per === 'buildingOfCategory' ? `${effect.category ?? ''} building` : per;
    list.push({
      card,
      source: per === undefined ? source : `${source} · ${each} per ${word} × ${helpings}`,
      family: effect.family ?? null,
      amount,
    });
  }
  return list;
}

/**
 * One share a card puts on **one town's** renown. See `CardCityRenownPercentEffect`.
 */
export interface CardCityRenownShare {
  card: CardId;
  source: string;
  percent: number;
}

/**
 * Every `cityRenownPercent` reaching this town — the Heroic Epic's half again.
 *
 * A list rather than a total, for `cardRenownLines`' reason exactly: the renown
 * hover is the ordered ledger a player checks, so each share arrives as its own
 * line with its own label and the fold stays the only sum. `explainCityRenown`
 * (`renown.ts`) is the one caller.
 */
export function cardCityRenownShares(state: GameState, city: City): CardCityRenownShare[] {
  const list: CardCityRenownShare[] = [];
  for (const { source, card, effect } of cityEffectsOfKind(state, city, 'cityRenownPercent')) {
    if (effect.percent === 0) continue;
    // **An empire-scoped share is not a town's** — it is taken once, over the
    // whole recurring trickle, by `cardEmpireRenownShares` below. Skipped here
    // and counted there, exactly once. See `CardCityRenownPercentEffect.where`.
    if (effect.where === 'empire') continue;
    if (!cityScopeAdmits(state, city, effect.scope)) continue;
    list.push({ card, source: label(source, scopeNote(effect.scope)), percent: effect.percent });
  }
  return list;
}

/**
 * Every `cityRenownPercent` this empire's law takes of the **whole** trickle —
 * Cult of Heroes' fifteen, and nothing else today.
 *
 * `cardCityRenownShares`' complement, and the two are exhaustive by
 * construction: that one skips `where: 'empire'` and this one takes only those,
 * so a row is read at exactly one scale. A list for that function's reason —
 * the renown hover is an ordered ledger and each share arrives as its own line
 * with its own label.
 *
 * Asked of the **empire** (`effectsOfKind`) rather than of a town, which is what
 * "+15% renown" means and what makes it answerable at all: the figure it is a
 * share of is the fold of every recurring line, and no town holds that.
 */
export function cardEmpireRenownShares(
  state: GameState,
  playerId: number,
): CardCityRenownShare[] {
  const list: CardCityRenownShare[] = [];
  for (const { source, card, effect } of effectsOfKind(state, playerId, 'cityRenownPercent')) {
    if (effect.percent === 0 || effect.where !== 'empire') continue;
    list.push({ card, source, percent: effect.percent });
  }
  return list;
}

/**
 * Every route `pays` line this empire's cards put **on a caravan** that left this
 * town — Silk Roads' coin and the Caravanserai's grain.
 *
 * Asked of the **origin**, which is the rule `routeYields.ts` keeps throughout: a
 * route belongs to the seat that sent it, and its law is that seat's law. The
 * `origin` scope is answered against that same town, so *"routes originating
 * here"* is an ordinary `CityScope` and the hub is a building rather than a
 * field.
 *
 * The **destination** is handed in beside it (`to`), because one clause asks
 * about the town at the far end — the Printing House's *"routes ending here"*.
 * It is still the origin's *empire* whose cards are walked: a route belongs to
 * the seat that sent it, so a rival's presses never print your books, and the
 * clause only ever narrows which of your own roads a line rides.
 *
 * Faith is not in the shape and is not here: nothing pays a caravan in it.
 */
export interface CardRouteLine {
  card: CardId;
  source: string;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  /** The bag is paid once per luxury at either end. `CardPaysEffect`'s. */
  perEndpointLuxury: boolean;
  /**
   * The bag is paid once per this many **hexes of the road's own length**, or
   * absent on a row that is not counted that way — Marco Polo's coin by the mile
   * (`CountKind`'s `routeLength`, batch GP2).
   *
   * **Carried rather than resolved**, `perEndpointLuxury`'s bargain exactly: this
   * module holds the law and the fold in `routeYields.ts` holds the two ends, and
   * only something holding both can answer how far apart they are. So the row's
   * `per` comes through as a number and the fold does the division.
   */
  perHexes?: number;
}

/**
 * One share a card takes of what a road already carries — The Silk Exchange's
 * doubled beakers. `CardPaysEffect.share`, resolved against this pair.
 */
export interface CardRouteShareLine {
  card: CardId;
  source: string;
  yield: CityYieldKey | 'all';
  percent: number;
}

export function cardRouteYieldLines(
  state: GameState,
  from: City,
  to?: City,
): CardRouteLine[] {
  const list: CardRouteLine[] = [];
  for (const { source, card, effect } of routeRows(state, from, to)) {
    if (!routeScopesAdmit(state, effect, from, to)) continue;
    const line: CardRouteLine = {
      card,
      source: label(source, routeScopeNote(effect)),
      food: effect.food ?? 0,
      production: effect.production ?? 0,
      gold: effect.gold ?? 0,
      science: effect.science ?? 0,
      culture: effect.culture ?? 0,
      // Carried rather than resolved: this module holds the origin and the fold
      // in `routeYields.ts` holds both ends, and only the pair can answer "how
      // many luxuries are on this road". See `CardPaysEffect`.
      perEndpointLuxury: effect.perEndpointLuxury === true,
      // The road's own length, carried the same way and for the same reason —
      // `per` is how many hexes buy one helping, and the fold that holds both
      // ends does the dividing. A row counted any other way carries nothing.
      ...(effect.basis === 'count' && effect.count === 'routeLength'
        ? { perHexes: effect.per === undefined || effect.per <= 0 ? 1 : effect.per }
        : {}),
    };
    if (line.food === 0 && line.production === 0 && line.gold === 0) {
      if (line.science === 0 && line.culture === 0) continue;
    }
    list.push(line);
  }
  return list;
}

/**
 * Every **share** this empire's cards take of what one road carries — the second
 * half of `cardRouteYieldLines`, kept apart from it for the reason the fold in
 * `routeYields.ts` keeps them apart: the flats go *on* the caravan and the share
 * is taken *of* what is on it, so a reader that mixed the two into one list
 * would have had to know which entries it had already multiplied.
 *
 * The same two scopes gate it, asked the same way, so a row that pays a road and
 * a row that raises one cannot disagree about which roads they mean.
 */
export function cardRouteShareLines(
  state: GameState,
  from: City,
  to?: City,
): CardRouteShareLine[] {
  const list: CardRouteShareLine[] = [];
  for (const { source, card, effect } of routeRows(state, from, to)) {
    if (effect.share === undefined) continue;
    if (!routeScopesAdmit(state, effect, from, to)) continue;
    for (const share of effect.share) {
      if (share.percent === 0) continue;
      list.push({
        card,
        source: label(source, routeScopeNote(effect)),
        yield: share.yield,
        percent: share.percent,
      });
    }
  }
  return list;
}

/**
 * Every route `pays` row that could speak about this road — the **empire's law**,
 * plus the **two towns' own shelves**.
 *
 * The empire's walk is the rule the whole module keeps: a route belongs to the
 * seat that sent it, so an Order, a Doctrine, a technology and a one-of-a-kind
 * house (the Caravanserai) are all read off the origin's owner. What it cannot
 * answer is a row on an **ordinary building**, whose effects reach
 * `liveCityEffects` and never the realm's — and "routes ending here pay science
 * and culture" is exactly such a row (the Printing House). A town's own shelves
 * are read where the town is in hand, which is `cityContext`'s argument for a
 * granary's tile lines at the scale of a road.
 *
 * Both ends, and the destination **only when the road is domestic**: a domestic
 * route's whole figure is banked by the town it ends at, so its presses are
 * paying their own empire's books; a foreign host's shelves are not the sender's
 * to harvest, which is the sentence the international fold already makes about
 * every other building rate. One-of-a-kind rows are skipped by
 * `cityBuildingEffects` itself, so nothing is counted twice.
 */
function routeRows(
  state: GameState,
  from: City,
  to?: City,
): { source: string; card: CardId; effect: CardPaysEffect }[] {
  const rows = [...effectsOfKind(state, from.ownerId, 'pays')];
  const shelves = [
    ...cityBuildingEffects(state, from),
    ...(to && to.ownerId === from.ownerId ? cityBuildingEffects(state, to) : []),
  ];
  for (const entry of pickKind(shelves, 'pays')) rows.push(entry);
  return rows.filter(({ effect }) => effect.where === 'route');
}

/**
 * Do this row's two ends admit this road? One question, both readers.
 *
 * A `destination` clause with **no destination in hand** admits nothing: the
 * caller with no far end is asking a question about the origin alone (a preview
 * of a road nobody has drawn yet), and a line that answered yes there would be a
 * line the preview promised and the caravan never paid.
 *
 * **The crossing is asked here too** (`CardPaysEffect.crossing`), and it takes
 * the destination clause's bargain for the destination clause's reason: it is a
 * fact about the *pair*, so a caller holding one end cannot answer it and is not
 * promised anything.
 */
function routeScopesAdmit(
  state: GameState,
  effect: { origin?: CityScope; destination?: CityScope; crossing?: 'domestic' | 'international' },
  from: City,
  to?: City,
): boolean {
  if (effect.origin !== undefined && !cityScopeAdmits(state, from, effect.origin)) return false;
  if (effect.destination !== undefined) {
    if (!to) return false;
    if (!cityScopeAdmits(state, to, effect.destination)) return false;
  }
  if (effect.crossing !== undefined) {
    if (!to) return false;
    const abroad = routeIsInternational(from, to);
    if (abroad !== (effect.crossing === 'international')) return false;
  }
  return true;
}

/** What a route row's ends say about where a line landed, for the label. */
function routeScopeNote(effect: {
  origin?: CityScope;
  destination?: CityScope;
  crossing?: 'domestic' | 'international';
}): string | null {
  const notes = [
    scopeNote(effect.origin),
    scopeNote(effect.destination),
    // The crossing reads as a word of its own on the ledger line, because it is
    // the one narrowing a player cannot check by looking at either town.
    effect.crossing === undefined ? null : effect.crossing === 'international' ? 'abroad' : 'at home',
  ].filter(
    (note): note is string => note !== null,
  );
  return notes.length === 0 ? null : notes.join(' + ');
}

/**
 * What an amplifier does to somebody else's number, as a whole signed percent.
 *
 * The Grand Bazaar's shape and the one hook that reaches *into* another
 * vocabulary: the flat happiness every luxury pays, what a duplicate copy is
 * worth, and — since the wonders pass — how long a blessing runs. The other
 * table goes on saying what it says; this scales the reading.
 */
export function cardAmplifier(
  state: GameState,
  playerId: number,
  target: AmplifierTarget,
): number {
  let percent = 0;
  for (const { effect } of effectsOfKind(state, playerId, 'effectAmplifier')) {
    if (effect.target !== target) continue;
    if (effect.percent === undefined) continue;
    percent += effect.percent;
  }
  return percent;
}

/**
 * The **flat step** an amplifier puts on somebody else's number, summed.
 *
 * `cardAmplifier`'s other dial (see `CardEffectAmplifierEffect`), and it is
 * asked wherever the amplified figure is quoted *per item*: the happiness one
 * luxury pays (Ea-nāṣir's malice — every luxury counts one fewer) and the gold
 * one connected city pays (Nanaivandak's two). A target whose figure is a
 * whole-ledger total never asks it, which is a fact about that target rather
 * than a rule here.
 *
 * **Applied before the share**, so a card carrying both is one arithmetic and
 * not an argument about order.
 */
export function cardAmplifierFlat(
  state: GameState,
  playerId: number,
  target: AmplifierTarget,
): number {
  let amount = 0;
  for (const { effect } of effectsOfKind(state, playerId, 'effectAmplifier')) {
    if (effect.target !== target) continue;
    if (effect.amount === undefined) continue;
    amount += effect.amount;
  }
  return amount;
}

/** What a newly founded city of this empire is founded with. */
export interface FoundingRider {
  /** Extra population beyond the first. */
  population: number;
  /** Buildings it opens with, in walk order. */
  buildings: BuildingId[];
  /** True when the new town is joined to the realm by road. See the shape. */
  roads: boolean;
}

/**
 * The founding rider for this empire's **next** city.
 *
 * `maxCities` is counted against cities the player currently holds, which is the
 * reading The Founders' Road's text asks for ("your first 5 cities") and the
 * only one that does not need a counter on the player: the fifth city is founded
 * while four stand, and a sixth is not.
 */
export function cardFoundingRider(state: GameState, playerId: number): FoundingRider {
  const rider: FoundingRider = { population: 0, buildings: [], roads: false };
  const held = cityCount(state, playerId);
  for (const { effect } of effectsOfKind(state, playerId, 'foundingRider')) {
    if (effect.maxCities !== undefined && held >= effect.maxCities) continue;
    if (effect.population !== undefined) rider.population += effect.population;
    if (effect.building !== undefined && !rider.buildings.includes(effect.building)) {
      rider.buildings.push(effect.building);
    }
    if (effect.roads === true) rider.roads = true;
  }
  return rider;
}

/**
 * How long slotting an Order seals it, for this empire.
 *
 * The `metaRule` hook's one consumer — a card that rewrites a rule of Statecraft
 * itself (Entry XV.b).
 *
 * **The table's figure is the same on every shelf**, and it stays that way: the
 * Æra III fork proposed a ten-turn seal from Government III on and the user
 * vetoed it (2026-09-05) — swapping a card in and out is skill, not a thing to
 * be priced out of the late game. See `StatecraftMeterConfig.sealTurns`.
 *
 * **A card's figure is read as a departure from the table's own**, and the
 * departures sum — Entry XVII's "additive within a stage, applied once" at the
 * scale of a rule. `min` used to be the fold, and it was right while the only
 * card that spoke *loosened* the seal (The Loose Rein's two turns); it silently
 * deleted the first card that tightened one, and Absolutism's ten-turn seal is a
 * **cost** it pays for six points of writ, so a fold that threw it away would
 * have made that card strictly better than its printed text. One card still
 * lands exactly on its own number — 5 + (2 − 5) is 2, and 5 + (10 − 5) is 10 —
 * which is what a player reads off the card either way.
 */
export function sealTurnsFor(state: GameState, playerId: number): number {
  let turns = METER.sealTurns;
  for (const { effect } of effectsOfKind(state, playerId, 'metaRule')) {
    if (effect.rule !== 'sealTurns') continue;
    turns += effect.value - METER.sealTurns;
  }
  return Math.max(0, turns);
}
