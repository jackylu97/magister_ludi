/**
 * Religion v1: the augur and the pantheon (design ledger, Entry XXVIII;
 * `docs/religion.md` is the ratified design).
 *
 * Faith is the **third draft currency**. Culture drafts Orders (slottable
 * posture), faith drafts **beliefs** (permanent identity) — and, unlike culture,
 * it does not draft directly: it buys the *agent* who does the drafting. That
 * one indirection is the whole design. An augur is three rites or one god, and
 * it costs more every time, so "when do I spend faith on a god rather than on
 * three good turns" is a real question with no dominant answer.
 *
 * What this module is, and what it deliberately is not
 * ----------------------------------------------------
 * It is the **rules**: what an augur costs, when Consecrate is legal, what a
 * rite does, when a belief offer may be dealt and how long a rite lasts. It is
 * emphatically *not* a second evaluator. A belief's effects and a rite's lasting
 * effects are ordinary `CardEffect`s read by `statecraft.ts`, which is still the
 * only module in the game that switches on `effect.kind`. Nothing below reads
 * one. That is the same claim `resourceEffects.ts` makes for luxuries, made a
 * third time, and it is what keeps eighteen beliefs and five rites a data table.
 *
 * The three shapes, and their precedents
 * --------------------------------------
 *   · **The purchase** is `explainUnitCost`'s shape in a different bank
 *     (`explainPurchaseCost`): an ordered list of labelled lines whose fold is
 *     the price, so the number on the button is the number the pool is charged.
 *     Currency-agnostic, because the M9 gold purchases are the same transaction.
 *   · **The draft** is `drawOrderOffer`'s shape (`consecrateAt` /
 *     `settleBeliefChoice`): dealt from `state.rng` at the moment the offer
 *     opens, stored on the player, and spent by a command naming an **index**.
 *     Entry XV's doctrine, inherited for the third time rather than reinvented.
 *   · **The rite** is Entry XVIII's windfall plus one new thing — a bag of
 *     effects that hangs on a city or a unit for a stated number of turns
 *     (`TimedEffect`). The instant half settles into its bucket through the same
 *     `settle…Windfall` helpers a chop and a ruin use; the lasting half is read
 *     by the same evaluators a slotted Order is.
 *
 * Timed effects, said precisely
 * -----------------------------
 * An expiry is an **absolute turn** and the reading is a comparison
 * (`timedEffectIsLive`). Nothing decrements. `pruneTimedEffects` is a broom, not
 * a clock: deleting nothing would change no outcome, and that property is the
 * whole reason the subsystem is safe under simultaneous turns, where a phase can
 * in principle be reordered under you. It is `SlottedOrder.sealedUntil`'s lesson
 * — the seal that taught this codebase not to tick anything — applied to a
 * thing that hangs on a *town* rather than on a card.
 *
 * What is not here (and why the file does not pretend otherwise)
 * -------------------------------------------------------------
 * Prophets, founder/follower/enhancer pools, founding a religion, spread,
 * conversion and the Religious Mandate doctrine are the **Age 2–3 pass**
 * (`docs/religion.md`'s scope ruling). Pantheons are native and never convert
 * away, which is exactly why this half ships alone and needs no spread
 * machinery: every belief here applies in every city its empire owns, always.
 */

import {
  type City,
  type GameState,
  type Player,
  type Religion,
  type ReligionId,
  type ReligionPulse,
  type TimedEffect,
  type Unit,
  cityReligion,
  convertCitizen,
  foundedReligion,
  playerById,
  realPlayers,
  removeUnit,
  unitById,
} from './state';
import {
  type WonderCompletion,
  capitalCityOf,
  cityAt,
  nearestOwnedCity,
  refreshCityDerived,
  refreshTileDerived,
  settleBorderWindfall,
  settleGrowthWindfall,
  settlePopulationWindfall,
  settleProductionWindfall,
  tileOwnerField,
} from './cities';
import { drawDiscoveryOffer } from './discoveries';
import { type Tile, getTileAt, neighborTiles, tileHex, tileIndex, wrappedDistance } from './map';
import {
  type BeliefAxis,
  type BeliefId,
  type BeliefOffer,
  type ReligionBeliefPool,
  type RiteDef,
  type RiteId,
  BELIEF_IDS,
  RELIGION,
  beliefDef,
  isBeliefId,
  isPantheonBeliefId,
  isRiteId,
  poolBeliefs,
  riteAbility,
  riteDef,
  slotsFromTechs,
} from './religionData';
import {
  cardAmplifier,
  cardPantheonSlots,
  cardPeriodicOffers,
  cardPressureRule,
  cardPressureSources,
  drawWithoutReplacement,
  offerSize,
  payWindfallGrants,
  settleCultureWindfall,
  timedEffectIsLive,
  windfallPayout,
} from './statecraft';
import { hasAbility, hasTech, settleResearchWindfall } from './tech';
import { type TechId, techDef } from './techData';
import type { BuildingId } from './buildingData';
import type { PressureRuleId } from './statecraftData';
import { type ImprovementId, workForFamily } from './improvementData';
import { improvementErrorAt } from './improvements';
import { nextFloat } from './rng';
import { RULES } from './rulesData';
import { awardOccasion } from './triumphs';
import { isCombatant, unitDef } from './unitData';

// --- the pantheon's slots ---------------------------------------------------

/**
 * How many gods this empire may hold: the technologies it holds, **plus every
 * live `pantheonSlots` card** — Stonehenge's, and the Great Mosque of Djenné's.
 *
 * **Never stored.** Divination opens two (two, so early synergy exists at all),
 * and the High Temple's third is a row in `data/religion.json` rather than a
 * code change. A counter on the player would be a second answer that disagrees
 * with the tree the moment a save is replayed against a retuned table — and it
 * would disagree with the *stones* the moment a wonder changed hands, which is
 * why a wonder's slot is folded here rather than granted when it is finished.
 *
 * One fold, so "how many gods may I hold" has one answer: `hasOpenBeliefSlot`,
 * the consecration screen and the offer all ask this. Floored at zero, because
 * a card that took a slot away must not make an empire owe one back.
 */
export function pantheonSlots(state: GameState, playerId: number): number {
  const player = playerById(state, playerId);
  if (!player) return 0;
  return Math.max(0, slotsFromTechs(player.techsResearched) + cardPantheonSlots(state, playerId));
}

/** Gods held. The other half of "is there room". */
export function beliefsHeld(player: Player): readonly BeliefId[] {
  return player.pantheon.beliefs;
}

/** Is a slot open for another god? */
export function hasOpenBeliefSlot(state: GameState, playerId: number): boolean {
  const player = playerById(state, playerId);
  if (!player) return false;
  return player.pantheon.beliefs.length < pantheonSlots(state, playerId);
}

/**
 * The gods still drawable: every row in the table this empire does not already
 * hold, in **file order**.
 *
 * A **declined** god goes back in the bag and a held one leaves it, which is the
 * ratified rule and the honest one: declining is not a decision about the god,
 * it is a decision about the two beside it. `livePool`'s shape (`statecraft.ts`)
 * without the retirement, because a pantheon has no ages.
 */
export function beliefPool(player: Player): BeliefId[] {
  const held = new Set<BeliefId>(player.pantheon.beliefs);
  // **The pantheon's bag alone.** `isBeliefId` spans all three pools now, so a
  // filter that asked it would have offered a Consecrate the enhancer pool;
  // `BELIEF_IDS` is the pantheon's own list, which is what a god is drawn from.
  return BELIEF_IDS.filter((id) => !held.has(id) && isPantheonBeliefId(id));
}

// --- buying an agent --------------------------------------------------------

/**
 * Buying an augur lives in `purchase.ts` now (M9, ledger Entry XXIX).
 *
 * It was written here, in the religion pass, as `explainUnitCost`'s shape in a
 * bank — currency-agnostic in shape and faith-funded in fact, "because the M9
 * gold purchases are the same transaction". They are, and they arrived, so the
 * transaction moved to a module of its own rather than growing a second one:
 * `explainPurchaseCost`, `purchaseError` and `purchaseItemAt` are the same three
 * functions, one bank wider. The augur's own rule did not change and is still a
 * fact about its roster row — `purchase: { currency: "faith", exclusive: true }`
 * — which is what makes `buildError` refuse the production queue and what keeps
 * gold away from it without gold knowing what an augur is.
 */


// --- consecration -----------------------------------------------------------

/** Is this piece an augur — a unit whose charges are rites? */
export function isAugur(unit: Unit): boolean {
  return unitDef(unit.type).consecrates === true;
}

/**
 * True when this augur has already spent its day — the one reading of "a rite is
 * the augur's whole turn" (user, 2026-08-27, restated in the 8/28 playtest as
 * "performing a rite should end the augur's turn").
 *
 * `performRiteAt` has zeroed `movesLeft` since the rule was first stated, but
 * *spending* the turn and *refusing the next act* are two halves of one rule and
 * only the first half had been written: an augur with two charges could perform
 * two rites in one resolution, which is precisely the sprint the charge ladder
 * exists to prevent. Both gates below ask this, so the second rite and the
 * consecration after a rite are refused by the same sentence.
 *
 * `movesLeft`, rather than a flag of its own, because that is already the
 * game's word for "this piece has acted": a worker's verbs refuse on it
 * (`improvementError`), an attack spends it, and reading it here means the augur
 * that walked its whole allowance to reach a town blesses it *next* turn — the
 * same bargain every other piece on the board makes with its movement. It needs
 * no phase to clear it; `resetMovement` already does, which is the
 * `TimedEffect` discipline applied to a thing that lasts exactly one turn.
 */
export function augurHasActed(unit: Unit): boolean {
  return unit.movesLeft <= 0;
}

/**
 * Why this augur cannot consecrate, or `null` when it can.
 *
 * **Consecrate spends the whole unit, whatever it has left.** That is the
 * anti-spam structure (`docs/religion.md`): an augur is *either* three rites *or*
 * one god, so a player who has already spent two charges is giving up much less
 * than one who has spent none, and the choice is a real one at every point on
 * that curve. There is therefore no charge clause here at all — only a slot one,
 * and the turn clause every act of an augur's now shares (`augurHasActed`).
 *
 * The blocker sentence for a full pantheon is the one the unit panel prints, so
 * a greyed row and a refused command say the same thing.
 */
export function consecrateError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== playerId) return `Unit ${unit.id} does not belong to player ${playerId}`;
  if (!isAugur(unit)) return `A ${unitDef(unit.type).name} cannot consecrate`;
  // Held to the rite's own rule (`augurHasActed`): an augur that blessed a town
  // this turn does not then go and found a god with what is left of the day.
  // Consecration spends the whole piece either way, so this is not about
  // charges — it is about the turn, and it is the same sentence the rite gives.
  if (augurHasActed(unit)) return `The augur has acted this turn`;
  if (player.pantheon.pending !== undefined) {
    return `${player.name} still has a belief waiting to be chosen`;
  }
  if (!hasOpenBeliefSlot(state, playerId)) {
    return 'Your pantheon has no room for another belief';
  }
  if (beliefPool(player).length === 0) return 'There are no beliefs left to choose';
  return null;
}

/**
 * Deals one belief offer: `offerSize` gods from the pool, without replacement.
 *
 * `drawOrderOffer`'s draw exactly — the shared `drawWithoutReplacement`, over a
 * candidate list in file order, spending the generator once per card whether or
 * not the bag was long enough. A pool shorter than the offer hands back what it
 * has, which is the honest answer for a late pantheon.
 *
 * **How many is asked of `offerSize`**, the one evaluator all four drafts share
 * (`statecraft.ts`), at the moment the offer opens. Three is what the table says
 * and a rider is what changes it, so the wonder that widens every draft widens
 * this one with nothing written here.
 */
export function drawBeliefOffer(state: GameState, player: Player): BeliefOffer {
  return {
    options: drawWithoutReplacement(state, beliefPool(player), offerSize(state, player.id, 'belief')),
  };
}

/**
 * Spends the augur and opens the offer. Validates nothing — `consecrateError` is
 * the rule and the command asks it first.
 *
 * The unit goes **first**, for `claimDiscoveryAt`'s reason exactly: the draw
 * below advances `state.rng`, and a throw between the two that left the augur
 * standing would be an augur that can deal a second hand from a moved generator.
 * Spend, then deal.
 */
export function consecrateAt(state: GameState, player: Player, unit: Unit): BeliefOffer {
  removeUnit(state, unit.id);
  const offer = drawBeliefOffer(state, player);
  player.pantheon.pending = offer;
  return offer;
}

/**
 * Why this player cannot take this option, or `null` when they can.
 *
 * `orderChoiceError`'s shape, refusal for refusal: the offer card is built from
 * exactly the offer this answers `null` about, so a god a player can click is a
 * command the reducer takes.
 */
export function beliefChoiceError(
  state: GameState,
  playerId: number,
  optionIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const offer = player.pantheon.pending;
  if (!offer) return `${player.name} has no belief waiting to be chosen`;
  if (!Number.isInteger(optionIndex)) {
    return `chooseBelief needs an integer optionIndex, got ${String(optionIndex)}`;
  }
  const index = optionIndex as number;
  if (index < 0 || index >= offer.options.length) {
    return `Option ${index} is not one of the ${offer.options.length} offered`;
  }
  // Only reachable from a hand-edited save or a retuned table under a live game.
  if (!isBeliefId(offer.options[index])) return `Option ${index} names no known belief`;
  return null;
}

/** What a pick did, for the announcement. */
export interface BeliefChoice {
  id: BeliefId;
  name: string;
}

/**
 * Takes one god and clears the offer. Validates nothing — `beliefChoiceError` is
 * the rule.
 *
 * The offer is cleared **before** the belief is added, and the key is *deleted*
 * rather than set to `undefined`, both for `settleOrderChoice`'s reasons: a
 * reader that saw `pending` during the addition would see a decision that had in
 * fact already been made, and a player who has answered must serialise
 * identically to one who never had an offer.
 */
export function settleBeliefChoice(
  state: GameState,
  player: Player,
  optionIndex: number,
): BeliefChoice | null {
  const offer = player.pantheon.pending;
  if (!offer) return null;
  const id = offer.options[optionIndex];
  if (id === undefined || !isBeliefId(id)) return null;
  delete player.pantheon.pending;
  // **Which shelf it goes on is the offer's own answer.** One field, one
  // command, three drafts: an offer that names a pool is a prophet's and lands
  // on the religion; one that names none is an augur's and lands on the
  // pantheon. A pooled pick that arrives with no religion to hold it is dropped
  // rather than thrown on, which is only reachable from a hand-edited save.
  const pool = offer.pool;
  if (pool !== undefined) {
    const religion = foundedReligion(state, player.id);
    if (!religion) return null;
    if (pool === 'follower') religion.follower.push(id);
    else religion.enhancer = id;
    refreshBeliefDerived(state, player);
    return { id, name: beliefDef(id).name };
  }
  player.pantheon.beliefs.push(id);
  refreshBeliefDerived(state, player);
  // A God Named. It takes the `state` **only** for this — the belief itself is a
  // fact about the player alone — and that is a fair price for putting the
  // triumph in the mechanism rather than in the reducer, where an AI naming a
  // god would earn nothing.
  awardOccasion(state, player.id, 'beliefConsecrated');
  return { id, name: beliefDef(id).name };
}

/**
 * Re-seats every town of one empire after a belief is taken.
 *
 * `settleResearchWindfall`'s shape and its argument exactly: a belief is an
 * **empire-wide fact about what ground is worth** — Ecclesia pays a holy site's
 * hex, Desert Fathers pays every dune — so the citizen who should move is in
 * whichever town stands on the seam, and the register's rule is that a mid-turn
 * yield mutation refreshes rather than waiting for the phase. It is the
 * sixteenth entry in `refreshCityDerived`'s register.
 *
 * Idempotent and derived, like every entry in that register, so the end-of-turn
 * `collectYields` recomputes it and agrees.
 */
function refreshBeliefDerived(state: GameState, player: Player): void {
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    refreshCityDerived(state, city);
  }
}

// --- rites ------------------------------------------------------------------

/** Every rite this empire has been taught, in table order. */
export function availableRites(state: GameState, playerId: number): RiteId[] {
  return (Object.keys(RELIGION.rites) as RiteId[]).filter((id) =>
    hasAbility(state, playerId, riteAbility(id)),
  );
}

/**
 * The hex a rite is aimed at: the one named, or the augur's own.
 *
 * Defaulting to the augur's tile is the whole of "target: the city the augur
 * stands in **or adjacent to**" read from the player's side — an augur standing
 * in Uruk aims at Uruk by saying nothing.
 */
function riteAimAt(unit: Unit, target?: { col: number; row: number }): { col: number; row: number } {
  return target ?? { col: unit.col, row: unit.row };
}

/** The city a `city` rite would land on, or `null`. */
export function riteCityTarget(
  state: GameState,
  unit: Unit,
  target?: { col: number; row: number },
): City | null {
  const aim = riteAimAt(unit, target);
  const city = cityAt(state, aim.col, aim.row);
  return city && city.ownerId === unit.ownerId ? city : null;
}

/**
 * The unit a `unit` rite would land on, or `null`.
 *
 * A **combatant first**, then anything of the actor's own on the hex, and the
 * order is the design rather than a tie-break: stacking allows one military and
 * one civilian piece per tile (`rules.stacking`), and a Blessing of Arms aimed
 * at a hex holding a warrior and a worker is aimed at the warrior. The augur may
 * bless itself, which is useless and legal — a rule forbidding it would be a
 * rule nobody could discover.
 */
export function riteUnitTarget(
  state: GameState,
  unit: Unit,
  target?: { col: number; row: number },
): Unit | null {
  const aim = riteAimAt(unit, target);
  let fallback: Unit | null = null;
  for (const other of state.units) {
    if (other.ownerId !== unit.ownerId) continue;
    if (other.col !== aim.col || other.row !== aim.row) continue;
    if (isCombatant(unitDef(other.type))) return other;
    if (fallback === null) fallback = other;
  }
  return fallback;
}

/**
 * Why this augur cannot perform this rite here, or `null` when it can.
 *
 * **The** gate, and the unit panel greys its rite rows with exactly it, so an
 * offered row is a command the reducer takes and the sentence on a refusal is
 * the reducer's own. The refusals in the order a player would think of them: is
 * this my augur, does it have a rite left, has it already acted today, do I know
 * this one, is the target in reach, and is there anything there to bless.
 *
 * Reach is **one hex**, measured on the map's own wrapped distance, and it is
 * the same rule for both target kinds: a rite is a thing you walk up to.
 */
export function riteError(
  state: GameState,
  playerId: number,
  unitId: number,
  rite: unknown,
  target?: { col: number; row: number },
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== playerId) return `Unit ${unit.id} does not belong to player ${playerId}`;
  if (!isAugur(unit)) return `A ${unitDef(unit.type).name} performs no rites`;
  if ((unit.chargesLeft ?? 0) < 1) return `That augur has no rites left`;
  // The other half of "a rite is the augur's whole turn". `performRiteAt` spends
  // the movement; this refuses the act that would have followed it, which is
  // what makes an augur three rites over three turns rather than three in one.
  if (augurHasActed(unit)) return `The augur has acted this turn`;
  if (!isRiteId(rite)) return `There is no rite called "${String(rite)}"`;
  const def = riteDef(rite);
  if (!hasAbility(state, playerId, riteAbility(rite))) {
    return `${def.name} is not known to ${player.name}`;
  }

  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return `Unit ${unit.id} is not on the map`;
  const aim = riteAimAt(unit, target);
  const to = getTileAt(state.map, aim.col, aim.row);
  if (!to) return `(${aim.col}, ${aim.row}) is off the map`;
  if (wrappedDistance(state.map, tileHex(from), tileHex(to)) > 1) {
    return `${def.name} must be performed where the augur stands, or beside it`;
  }

  // **A rite that leaves a proclamation needs a faith to proclaim.** Asked of
  // the grant's own shape rather than of the rite's id, so the second such rite
  // inherits the refusal without this function learning its name.
  if (def.grant.pulse !== undefined && foundedReligion(state, playerId) === undefined) {
    return `${def.name} needs a religion to preach`;
  }

  if (def.target === 'here') {
    // The third target, and it asks nothing further: a proclamation is made on
    // the ground, and the reach test above is the whole of where.
    return null;
  }
  if (def.target === 'city') {
    if (riteCityTarget(state, unit, target) === null) {
      return `${def.name} needs one of your cities to bless`;
    }
    return null;
  }
  if (riteUnitTarget(state, unit, target) === null) {
    return `${def.name} needs one of your units to bless`;
  }
  return null;
}

/** One thing a rite paid, as a player reads it. See `RitePerformance.grants`. */
export interface RiteGrantLine {
  /** "Science", "Culture to the bounds", "Population" — the destination. */
  label: string;
  /** The figure paid. Whole, printed, and already what the basket received. */
  amount: number;
}

/** What performing a rite did, for the announcement and the chronicle. */
export interface RitePerformance {
  rite: RiteId;
  name: string;
  /** The town it landed on, or `null` for a rite aimed at a piece. */
  city: City | null;
  /** The piece it landed on, or `null`. */
  unit: Unit | null;
  /** The population the town reached, when the rite granted a citizen. */
  population: number | null;
  /** The technology the beakers completed, or `null`. */
  research: string | null;
  /** True when the augur was spent by this rite's last charge. */
  augurSpent: boolean;
  /** The turn the lasting half runs out, or `null` for a pure windfall. */
  expiresTurn: number | null;
  /**
   * How many turns the blessing runs, amplifiers folded in, or `null` for a
   * pure windfall.
   *
   * `expiresTurn` minus the turn it was stamped on, carried rather than left to
   * be subtracted by whoever announces it: the row's printed `duration` is *not*
   * the answer once Chichen Itza is standing, and a caller that quoted the row
   * would promise twenty turns and deliver thirty.
   */
  turns: number | null;
  /**
   * What the rite actually paid, one labelled line per destination.
   *
   * The `explainUnitCost` shape for the third time: a caller that has to say
   * what happened folds the list rather than switching on which fields of this
   * report happen to be non-null. Every figure is the **paid** one — Entry
   * XVIII.5's printed number, riders folded in by `windfallPayout` before
   * anything was banked — so an announcement and the basket agree by
   * construction.
   *
   * Empty is impossible for a rite with a grant and ordinary for one that is
   * pure blessing.
   */
  grants: RiteGrantLine[];
  /**
   * The tiles a rite's border culture claimed **this instant**, or empty.
   *
   * The user's rule (2026-08-27): "should instantaneously add the tile and reset
   * the counter (with overflow) if it exceeds the culture needed". It is a list
   * rather than a count because fifteen culture can cover two rungs, and because
   * the interface wants to know *which* hexes lit up.
   */
  bordersClaimed: { col: number; row: number }[];
  /**
   * Wonders this rite's hammers finished, in the order they completed.
   *
   * The gap the wonders framework left and named (`GameState.wonders`'s ledger
   * entry: "a rite's hammers can complete a wonder correctly but carry no toast
   * out"). The *rule* was always right — a Rite of the Forge that covers the
   * front of a queue completes it through `settleProductionWindfall`, which is
   * `advanceProduction`'s own routine — but the completion is news to **every**
   * seat, and the one thing that could say so was being dropped on the floor.
   *
   * Empty on every rite that finished nothing, which is almost all of them, so a
   * caller that has never heard of it is unaffected.
   */
  wonders: WonderCompletion[];
}

/**
 * Performs one rite. Validates nothing — `riteError` is the rule and the command
 * asks it first.
 *
 * The order is the arithmetic and each step is a rule:
 *
 *   1. **the lasting half is stamped first**, so a rite whose windfall settles a
 *      queue does so under the effects it just granted. Twenty turns from *this*
 *      turn, as an absolute expiry (`TimedEffect`).
 *   2. **the instant half is paid**, through the bucket's own `settle…Windfall`
 *      helper — never by writing into a basket and hoping a phase notices.
 *      Entry XVIII: the moment of the gift is the moment of the payoff.
 *   3. **the riders fire**, on the `rite` occasion, so a card may pay for the
 *      *act* of performing one.
 *   4. **the charge is spent**, and an augur that empties is removed from the
 *      board exactly as a worker is. That is the one place the two agents share
 *      a rule rather than a field, and it is deliberate: three acts in a box.
 *   5. **the rite is the augur's turn** (user, 2026-08-27: "the rite should end
 *      the augur's turn"). Every remaining movement point is spent, the way an
 *      attack spends an attacker and a build spends a worker — a rite is the
 *      day's work, not something a piece does on its way past. In the
 *      *mechanism* rather than in the reducer, for `buildImprovementAt`'s stated
 *      reason: an AI that performs one gets it without having to remember. Only
 *      a surviving augur is written to, because a spent one has left the board.
 *      The *refusal* that makes this bite is `augurHasActed`, asked by both
 *      gates — spending the movement here and refusing the next act there are
 *      one rule in two halves, and for a while only this half existed.
 */
export function performRiteAt(
  state: GameState,
  player: Player,
  unit: Unit,
  rite: RiteId,
  target?: { col: number; row: number },
): RitePerformance {
  const def = riteDef(rite);
  const city = def.target === 'city' ? riteCityTarget(state, unit, target) : null;
  const blessed = def.target === 'unit' ? riteUnitTarget(state, unit, target) : null;

  const expiresTurn = stampRite(state, player.id, rite, def, city, blessed);
  const paid = payRiteGrant(state, player, def, city, blessed, { col: unit.col, row: unit.row });
  const wonders = payRiteRiders(state, player, unit);
  wonders.unshift(...paid.wonders);

  const left = (unit.chargesLeft ?? 0) - 1;
  const augurSpent = left <= 0;
  if (augurSpent) {
    removeUnit(state, unit.id);
  } else {
    unit.chargesLeft = left;
    unit.movesLeft = 0;
  }

  return {
    rite,
    name: def.name,
    city,
    unit: blessed,
    population: paid.population,
    research: paid.research,
    augurSpent,
    expiresTurn,
    turns: expiresTurn === null ? null : expiresTurn - state.turn,
    grants: paid.grants,
    bordersClaimed: paid.bordersClaimed,
    wonders,
  };
}

/**
 * Hangs a rite's lasting effects on its target, and answers when they run out.
 *
 * One `TimedEffect` per effect rather than one carrying a list, because every
 * reader walks a flat list of `{ card, effect }` and a nested one would be a
 * second shape for the evaluator to unwrap. The array is created lazily so a
 * city that has never been blessed serialises exactly as it did before this
 * system existed (`City.timed`'s convention).
 *
 * **The `riteDuration` amplifier is read here, once, at the stamp** — Chichen
 * Itza's fifty percent. It lengthens the *duration* before the expiry is
 * computed, and the expiry is still an absolute turn nobody ever ticks
 * (`TimedEffect`): a blessing that got longer the day a wonder finished would be
 * re-deriving a fact the state already wrote down, and one that got shorter the
 * day the wonder was captured would be a countdown wearing a comparison's
 * clothes. Floored once, and never below a single turn — an amplifier may
 * lengthen a blessing or shorten it, but a rite that expired the instant it was
 * performed would be a charge spent on nothing.
 */
function stampRite(
  state: GameState,
  playerId: number,
  rite: RiteId,
  def: RiteDef,
  city: City | null,
  unit: Unit | null,
): number | null {
  if (def.duration === undefined || def.effects.length === 0) return null;
  const holder: { timed?: TimedEffect[] } | null = def.target === 'city' ? city : unit;
  if (!holder) return null;
  const percent = cardAmplifier(state, playerId, 'riteDuration');
  const turns = Math.floor((Math.max(1, Math.floor(def.duration)) * (100 + percent)) / 100);
  const expiresTurn = state.turn + Math.max(1, turns);
  const list = holder.timed ?? [];
  for (const effect of def.effects) list.push({ card: rite, effect, expiresTurn });
  holder.timed = list;
  return expiresTurn;
}

/** What a rite's instant half completed, for the report. */
interface RiteGrantResult {
  population: number | null;
  research: string | null;
  /** One labelled line per destination paid. See `RitePerformance.grants`. */
  grants: RiteGrantLine[];
  /** Hexes the border culture took on the spot. See `RitePerformance`. */
  bordersClaimed: { col: number; row: number }[];
  /** Wonders the rite's hammers finished. See `RitePerformance.wonders`. */
  wonders: WonderCompletion[];
}

/**
 * Pays a rite's instant half into the buckets it names.
 *
 * **One arm per destination**, each writing its own labelled line into
 * `RiteGrantLine[]` as it pays, and the destinations are why `RiteGrantSpec` is a
 * bag of names rather than a bag of yields: a rite's culture fills a *city's
 * border basket* while its science fills the *empire's* research pool, and those
 * are two different channels (Entry XVII) that a `CityYieldKey` could not tell
 * apart. Each arm goes through the settlement helper its bucket already has, so
 * a rite that finishes a granary finishes it by exactly the code an end-of-turn
 * granary is finished by.
 *
 * Every figure is Entry XVIII.5-immune: printed, unmodified, whole.
 */
function payRiteGrant(
  state: GameState,
  player: Player,
  def: RiteDef,
  city: City | null,
  unit: Unit | null,
  at: { col: number; row: number },
): RiteGrantResult {
  const grant = def.grant;
  const result: RiteGrantResult = {
    population: null,
    research: null,
    grants: [],
    bordersClaimed: [],
    wonders: [],
  };
  // One line per destination, written beside the payment rather than derived
  // afterwards from which report fields came back non-null: the arm that knows
  // what it paid is the arm that says so.
  const said = (label: string, amount: number): void => {
    result.grants.push({ label, amount });
  };

  if (grant.gold !== undefined) {
    player.gold += grant.gold;
    said('Gold', grant.gold);
  }
  if (grant.faith !== undefined) {
    player.faithPool += grant.faith;
    said('Faith', grant.faith);
  }
  if (grant.science !== undefined) {
    player.sciencePool += grant.science;
    said('Science', grant.science);
    result.research = settleResearchWindfall(state, player)?.name ?? null;
  }
  if (grant.culture !== undefined) {
    player.culturePool += grant.culture;
    said('Culture', grant.culture);
    settleCultureWindfall(state, player);
  }
  if (grant.healFully === true && unit) unit.hp = unitDef(unit.type).maxHp;
  if (grant.pulse !== undefined) {
    // **A rite leaves the same kind of mark a prophet does**, out of a smaller
    // purse: the row's own figures, shifted by the enhancer pool through the one
    // reader, and an absolute expiry nobody ticks. It is written straight onto
    // the religion because a pulse belongs to a faith rather than to a place —
    // `spreadReligion` is its broom, exactly as it is the bomb's.
    const religion = foundedReligion(state, player.id);
    if (religion) {
      const turns = Math.max(
        1,
        grant.pulse.turns + cardPressureRule(state, player.id, 'pulseTurns'),
      );
      religion.pulses.push({
        col: at.col,
        row: at.row,
        strength: Math.max(0, grant.pulse.strength),
        range: Math.max(0, grant.pulse.range + cardPressureRule(state, player.id, 'bombRange')),
        startTurn: state.turn,
        expiresTurn: state.turn + turns,
      });
      said('Preaching', grant.pulse.strength);
    }
  }

  if (city) {
    if (grant.borderCulture !== undefined) {
      // The border basket, **not** the draft pool: a consecrated boundary walks
      // outward, it does not buy a card. The two are separate channels and this
      // is the one rite that names the quieter one.
      //
      // And it is spent **now**. `settleBorderWindfall` is the border bucket's
      // own completion routine (Entry XVIII's fifth seam) — `expandBorders`'
      // choice and `expandBorders`' claim, run at the moment of the gift — so a
      // rite that covers the next rung moves the bounds before the command
      // returns, with the remainder left banked toward the rung after. A rite
      // that covers nothing simply adds, which is what it always did.
      city.culture += grant.borderCulture;
      said("Culture to the bounds", grant.borderCulture);
      const grew = settleBorderWindfall(state, city);
      if (grew) {
        for (const tile of grew.tiles) {
          result.bordersClaimed.push({ col: tile.col, row: tile.row });
        }
      }
      refreshCityDerived(state, city);
    }
    if (grant.production !== undefined) {
      city.hammerBasket += grant.production;
      // The completion is *read* rather than discarded: a rite that covers the
      // front of a queue holding a wonder has just taken it off the board for
      // everybody, and `ProductionCompletion.wonder` is the report that says so.
      const done = settleProductionWindfall(state, city);
      if (done?.wonder) result.wonders.push(done.wonder);
      said('Production', grant.production);
    }
    if (grant.food !== undefined) {
      city.foodBasket += grant.food;
      settleGrowthWindfall(state, city);
      said('Food', grant.food);
    }
    if (grant.population !== undefined) {
      result.population = settlePopulationWindfall(state, city, grant.population);
      said('Population', grant.population);
    }
    // Even a rite that granted nothing to this town has changed what it is worth
    // — a lasting tile line was stamped a moment ago — so the panel is re-seated
    // through the one helper every mid-turn mutation goes through. Idempotent,
    // like every entry in that register.
    refreshCityDerived(state, city);
  }
  return result;
}

/**
 * The riders a *performed rite* pays out.
 *
 * There is no card in the table riding on this occasion today; the occasion
 * exists because a rite is unambiguously one of Entry XVIII's moments and a
 * vocabulary that could not name it would be a vocabulary with a hole in it.
 *
 * **Grants only, deliberately.** A `percent` rider scales an occasion's own
 * figure, and a rite has no single figure — it pays a citizen here, beakers
 * there, coin somewhere else. Rather than pick one voice to be "the" figure and
 * silently ignore the rest, the percentage arm is left unread on this occasion
 * and said so here. The day a card wants one, the honest fix is a marker on the
 * rite's own row naming its headline voice, not a guess in this function.
 */
function payRiteRiders(state: GameState, player: Player, unit: Unit): WonderCompletion[] {
  const wonders: WonderCompletion[] = [];
  const payout = windfallPayout(state, player.id, 'rite');
  if (payout.heal > 0) {
    unit.hp = Math.min(unitDef(unit.type).maxHp, unit.hp + payout.heal);
  }
  if (payout.grants.length === 0) return wonders;
  const at = { col: unit.col, row: unit.row };
  for (const city of payWindfallGrants(state, player, payout, at)) {
    // A rider's hammers may finish a wonder exactly as the rite's own may, and
    // the news goes out the same way. See `RitePerformance.wonders`.
    const done = settleProductionWindfall(state, city);
    if (done?.wonder) wonders.push(done.wonder);
    refreshCityDerived(state, city);
  }
  return wonders;
}

/**
 * What a rite would do, in one sentence, for the panel's payoff preview.
 *
 * Every figure comes from the row that will pay it and every *completion* from
 * the plan that will settle it, which is `explainDiscoveryOption`'s rule: a
 * promise on a button is made by the function that keeps it. `null` when the
 * rite cannot be performed at all — the panel prints the blocker instead.
 */
export function ritePreview(
  state: GameState,
  unitId: number,
  rite: RiteId,
  target?: { col: number; row: number },
): string | null {
  const unit = unitById(state, unitId);
  if (!unit) return null;
  const def = riteDef(rite);
  const city = def.target === 'city' ? riteCityTarget(state, unit, target) : null;
  const blessed = def.target === 'unit' ? riteUnitTarget(state, unit, target) : null;
  const parts: string[] = [];
  const grant = def.grant;
  if (grant.population !== undefined && city) {
    parts.push(`+${grant.population} pop to ${city.name}`);
  }
  if (grant.science !== undefined) parts.push(`+${grant.science} science`);
  if (grant.gold !== undefined) parts.push(`+${grant.gold} gold`);
  if (grant.faith !== undefined) parts.push(`+${grant.faith} faith`);
  if (grant.culture !== undefined) parts.push(`+${grant.culture} culture`);
  if (grant.borderCulture !== undefined && city) {
    parts.push(`+${grant.borderCulture} culture toward ${city.name}'s borders`);
  }
  if (grant.production !== undefined && city) parts.push(`+${grant.production} production`);
  if (grant.food !== undefined && city) parts.push(`+${grant.food} food`);
  if (grant.healFully === true && blessed) parts.push(`heals the ${unitDef(blessed.type).name} fully`);
  if (grant.pulse !== undefined) {
    parts.push(
      `spreads your religion ${grant.pulse.range} hexes for ${grant.pulse.turns} turns`,
    );
  }
  if (def.duration !== undefined) parts.push(`lasts ${def.duration} turns`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

// --- timed effects ----------------------------------------------------------

/** The live rites hanging on one holder, for a panel that lists them. */
export function liveTimedEffects(
  state: GameState,
  holder: { timed?: TimedEffect[] },
): TimedEffect[] {
  return (holder.timed ?? []).filter((entry) => timedEffectIsLive(state, entry));
}

/**
 * Sweeps every rite that has run out.
 *
 * **A broom, not a clock.** Every reader compares `state.turn` against
 * `expiresTurn` (`timedEffectIsLive`), so an expired effect is already inert and
 * deleting it changes no outcome whatsoever — which is exactly the property that
 * makes this phase safe to place anywhere, skip, or run twice. It exists so a
 * long game's save does not accumulate dead paper, and so a panel listing a
 * town's blessings does not have to filter a list that only ever grows.
 *
 * It is **first** in the pipeline, so the turn's arithmetic is done over a list
 * with nothing dead in it, and the key is *deleted* when the list empties, so a
 * town whose blessings have all run out serialises identically to one that was
 * never blessed (`City.timed`'s convention).
 */
export function pruneTimedEffects(state: GameState): void {
  for (const city of state.cities) sweep(state, city);
  for (const unit of state.units) sweep(state, unit);
}

function sweep(state: GameState, holder: { timed?: TimedEffect[] }): void {
  const timed = holder.timed;
  if (!timed) return;
  const live = timed.filter((entry) => timedEffectIsLive(state, entry));
  if (live.length === timed.length) return;
  if (live.length === 0) delete holder.timed;
  else holder.timed = live;
}

// --- the cadenced draft -----------------------------------------------------

/**
 * Opens the drafts a cadence owes — Keeper of the Calendar's almanac, and
 * nothing else today.
 *
 * A phase rather than a rider, because its occasion is the *calendar*: nothing
 * happened to trigger it. The cadence is read off the card
 * (`cardPeriodicOffers`, which is where the `CardEffect` is interpreted — never
 * here) and compared against `state.turn`, absolutely, so an empire that takes
 * the belief on turn 19 is offered on turn 20 and no counter exists to be
 * skipped or double-ticked.
 *
 * Three exclusions, each with a precedent:
 *
 *   · **the wild** is skipped through `realPlayers`, exactly as
 *     `advanceResearch` and `runStatecraft` skip it: it has no screen to be
 *     asked on, so an offer on that seat would hang forever behind a blocker
 *     nobody can answer.
 *   · **an empire already holding an unanswered offer** is skipped, which is
 *     `discoveryClaimError`'s "one at a time" — a second hand dealt on top of
 *     the first would silently destroy it. The calendar simply misses them, and
 *     comes round again.
 *   · **at most one offer per empire per turn**, for the same reason.
 *
 * The generator is spent only when an offer is actually opened, which is
 * conditional on the state alone and therefore replays identically —
 * `claimDiscoveryAt` takes the same liberty for the same reason.
 */
export function openPeriodicOffers(state: GameState): void {
  for (const player of realPlayers(state)) {
    if (player.pendingDiscovery !== undefined) continue;
    for (const cadence of cardPeriodicOffers(state, player.id)) {
      if (state.turn % cadence.every !== 0) continue;
      // Where the find is *said* to have happened: the empire's seat of
      // government, or its nearest town to it. The site matters because two of
      // the three discovery shapes need one — a free unit stands somewhere, and
      // "the nearest owned city" is nearest to something.
      const seat = capitalCityOf(state, player.id) ?? nearestOwnedCity(state, player.id, { col: 0, row: 0 });
      if (!seat) continue;
      player.pendingDiscovery = {
        kind: cadence.site,
        col: seat.col,
        row: seat.row,
        options: drawDiscoveryOffer(state, cadence.site, offerSize(state, player.id, 'discovery')),
      };
      break;
    }
  }
}

// --- what religion owes the player ------------------------------------------

/**
 * Why this empire cannot end its turn yet, or `null`.
 *
 * `statecraftBlocker`'s twin, and the same debt in a different currency: a
 * belief offer sits on the empire until it is spent, no other seat can take it,
 * and the reducer refuses a `chooseBelief` from a seat that has ended its turn —
 * so a player who pressed past it would have to wait a whole resolution to
 * answer a card already on screen.
 */
export function religionBlocker(player: Player): string | null {
  return player.pantheon.pending !== undefined ? 'a belief is waiting to be chosen' : null;
}

/** Is anything religious waiting to be answered? The dock button's badge. */
export function hasReligionOffer(player: Player): boolean {
  return player.pantheon.pending !== undefined;
}

// --- the religion -----------------------------------------------------------

/** Is this piece a prophet — a unit whose charges found and spread a faith? */
export function isProphet(unit: Unit): boolean {
  return unitDef(unit.type).prophesies === true;
}

/**
 * How many religions this world will hold at all.
 *
 * The user's ruling of 2026-08-27: two thirds of the seats in the lobby, rounded
 * **up**. It is written as two integers (`rules.religion.maxReligions`) rather
 * than as `0.667`, so the ceiling is exact arithmetic on whole numbers and a
 * five-seat game is four everywhere, forever, on every machine — the same reason
 * every percentage in this game is whole points.
 *
 * Counted over `realPlayers`, which is the register for "who counts": the wild
 * is a seat and never a nation, and a solo game whose share was computed over
 * three players including the barbarians would hand out one religion too many.
 */
export function maxReligions(state: GameState): number {
  const share = RULES.religion.maxReligions;
  const seats = realPlayers(state).length;
  const denominator = Math.max(1, Math.floor(share.denominator));
  return Math.ceil((seats * Math.floor(share.numerator)) / denominator);
}

/**
 * Why this empire cannot found a religion, or `null` when it can.
 *
 * Three refusals and each is a ruling:
 *
 *   · **no gods** — identity is the pantheon (`docs/religion-v2.md`), so a realm
 *     that has consecrated nothing has nothing to found a faith *out of*;
 *   · **already founded** — one religion per empire, ever. Unreachable from the
 *     verb, which only asks this when the register holds no row for the seat,
 *     and written down anyway so that "ever" is a sentence somewhere rather than
 *     an accident of one caller's ordering;
 *   · **the world is full** — `maxReligions`, and the sentence a player reads is
 *     about the world rather than about them.
 */
export function foundReligionError(state: GameState, playerId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (player.pantheon.beliefs.length === 0) {
    return 'You have no gods to found a religion on';
  }
  if (foundedReligion(state, playerId) !== undefined) {
    return `${player.name} has already founded a religion`;
  }
  if (state.religions.length >= maxReligions(state)) {
    return 'The world has all the religions it will hold';
  }
  return null;
}

/**
 * A generated name, drawn from `state.rng` at the moment of founding.
 *
 * **Never a historical faith and never a fixed roster** (user, 2026-08-27: "keep
 * religions fluid"). The name is made out of the pantheon's *axes*, so an empire
 * that consecrated the Hearth Mother and the Standing Stones is named after
 * hearth and stone and looks like what it is made of.
 *
 * Three draws, in this order and never reordered: the pattern, then one epithet,
 * then the second. The order is the seed's — a replay of the same log deals the
 * same name — which is why the two-axis pattern is filtered *out* before the
 * pattern is drawn rather than being drawn and rejected: a rejection would spend
 * the generator a different number of times for a one-god religion than for a
 * two-god one, and the whole game after it would shift.
 */
export function generateReligionName(state: GameState, pantheon: readonly BeliefId[]): string {
  const axes: BeliefAxis[] = [];
  for (const id of pantheon) {
    const axis = beliefDef(id).axis;
    if (!axes.includes(axis)) axes.push(axis);
  }
  if (axes.length === 0) axes.push('none');
  const { epithets, patterns } = RELIGION.names;
  const usable = patterns.filter((pattern) => axes.length >= 2 || !pattern.includes('{1}'));
  const shape = usable[Math.floor(nextFloat(state.rng) * usable.length)] ?? patterns[0] ?? '{0}';
  const pick = (axis: BeliefAxis): string => {
    const bag = epithets[axis] ?? epithets.none ?? ['Quiet'];
    return bag[Math.floor(nextFloat(state.rng) * bag.length)] ?? 'Quiet';
  };
  const first = pick(axes[0]!);
  const second = axes.length >= 2 ? pick(axes[1]!) : first;
  return shape.replace('{0}', first).replace('{1}', second);
}

/**
 * Founds a religion. Validates nothing — `foundReligionError` is the rule.
 *
 * **The one writer of `GameState.religions`**, from the one verb, which is the
 * discipline `claimWonder` keeps for a wonder and `captureUnit` for a change of
 * hands. The id is the row's index, so founding order *is* id order and every
 * tie in the spread is broken by an order the state carries.
 *
 * The pantheon is **copied** rather than aliased: a religion is what its founder
 * believed at the moment it was founded, and an empire that consecrates a fourth
 * god afterwards has not renamed its faith.
 */
export function foundReligion(state: GameState, player: Player): Religion {
  const pantheon = [...player.pantheon.beliefs];
  const religion: Religion = {
    id: state.religions.length,
    founderId: player.id,
    name: generateReligionName(state, pantheon),
    pantheon,
    follower: [],
    foundedTurn: state.turn,
    pulses: [],
  };
  state.religions.push(religion);
  return religion;
}

/**
 * Why this prophet cannot rename its empire's religion, or `null`.
 *
 * **Pure prose, and the only command in the game that is.** The name is
 * generated so that a religion has one at all; renaming is a courtesy, it
 * changes no rule, and it is refused for exactly two reasons — you have no
 * religion, or what you typed is not a name.
 */
export function renameReligionError(
  state: GameState,
  playerId: number,
  name: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  if (foundedReligion(state, playerId) === undefined) {
    return `${player.name} has founded no religion`;
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return 'A religion needs a name';
  }
  if (name.trim().length > RELIGION_NAME_LIMIT) {
    return `A religion's name is at most ${RELIGION_NAME_LIMIT} letters`;
  }
  return null;
}

/** How long a religion's name may be. Long enough for a phrase, short enough for a banner. */
export const RELIGION_NAME_LIMIT = 40;

/** Renames a religion. Validates nothing — `renameReligionError` is the rule. */
export function renameReligionAt(state: GameState, playerId: number, name: string): void {
  const religion = foundedReligion(state, playerId);
  if (religion) religion.name = name.trim();
}

// --- the prophet's pools ----------------------------------------------------

/** The beliefs of one pool this religion does not already hold, in file order. */
export function religionBeliefPool(religion: Religion, pool: ReligionBeliefPool): BeliefId[] {
  const held = new Set<BeliefId>([
    ...religion.follower,
    ...(religion.enhancer === undefined ? [] : [religion.enhancer]),
  ]);
  return poolBeliefs(pool).filter((id) => !held.has(id));
}

/** How many beliefs of this pool a religion may hold at once. Data (`pools`). */
export function poolSlots(pool: ReligionBeliefPool): number {
  const pools = RELIGION.pools;
  return Math.max(0, Math.floor(pool === 'follower' ? pools.followerSlots : pools.enhancerSlots));
}

/** How many this religion currently holds. */
export function poolHeld(religion: Religion, pool: ReligionBeliefPool): number {
  return pool === 'follower' ? religion.follower.length : religion.enhancer === undefined ? 0 : 1;
}

/**
 * Deals one offer from a religion's pool.
 *
 * `drawBeliefOffer`'s twin, one bag over and with the bag written on the offer
 * so that one `chooseBelief` can answer for all three drafts. **How many** is
 * `offerSize`'s, at the moment the offer opens (Entry XXXI), so the wonder that
 * widens every draft widens this one with nothing written here.
 */
export function drawPoolBeliefOffer(
  state: GameState,
  player: Player,
  religion: Religion,
  pool: ReligionBeliefPool,
): BeliefOffer {
  return {
    options: drawWithoutReplacement(
      state,
      religionBeliefPool(religion, pool),
      offerSize(state, player.id, 'belief'),
    ),
    pool,
  };
}

// --- the prophet's four verbs ----------------------------------------------

/**
 * The questions every one of a prophet's verbs asks first — is this my piece, is
 * it a prophet, has it a charge, has it a day left, and is it already holding a
 * decision it owes the game.
 *
 * One function, so four refusals cannot drift, and in the order a player would
 * think of them. The **pending offer** clause is `consecrateError`'s and for its
 * reason: a second hand dealt on top of the first would silently destroy it.
 */
function prophetProblem(state: GameState, playerId: number, unitId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== playerId) return `Unit ${unit.id} does not belong to player ${playerId}`;
  if (!isProphet(unit)) return `A ${unitDef(unit.type).name} is no prophet`;
  if ((unit.chargesLeft ?? 0) < 1) return `That prophet has nothing left to give`;
  if (unit.movesLeft <= 0) return `Unit ${unit.id} has no movement left`;
  if (player.pantheon.pending !== undefined) {
    return `${player.name} still has a belief waiting to be chosen`;
  }
  return null;
}

/**
 * Why this prophet cannot plant a holy site here, or `null` when it can.
 *
 * **A holy site needs a religion**, so an empire that has founded none is asked
 * `foundReligionError` instead — the verb founds one on the way. That is what
 * puts all three founding refusals ("no gods", "the world is full") in front of
 * a player who reaches for the ground, rather than leaving them in a gate the
 * command never asks.
 *
 * The ground's half is delegated whole to `improvementErrorAt`, exactly as
 * `greatPersonWorkError` delegates it: a work stands anywhere its planter can
 * stand, which for a holy site is any hex of your own that is not water and not
 * a mountain.
 */
export function plantHolySiteError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  const problem = prophetProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  if (foundedReligion(state, playerId) === undefined) {
    const cannot = foundReligionError(state, playerId);
    if (cannot !== null) return cannot;
  }
  const unit = unitById(state, unitId)!;
  const tile = getTileAt(state.map, unit.col, unit.row);
  if (!tile) return `Unit ${unit.id} is not on the map`;
  return improvementErrorAt(state, unit.ownerId, tile, HOLY_SITE);
}

/** The improvement a prophet plants, read off the table's own inverse. */
const HOLY_SITE: ImprovementId = workForFamily('prophet') ?? 'holySite';

/** What planting a holy site did, for the announcement. */
export interface HolySitePlanting {
  religion: Religion;
  /** True when this charge founded the religion as well as planting the stones. */
  founded: boolean;
  /** The draft this opened, or `null`. */
  offer: BeliefOffer | null;
  col: number;
  row: number;
  /** True when the prophet was spent by this charge. */
  prophetSpent: boolean;
}

/**
 * Founds a religion where there is none, plants the stones, and opens whatever
 * draft the religion is still owed. Validates nothing — `plantHolySiteError` is
 * the rule.
 *
 * The order is the arithmetic and each step is a rule:
 *
 *   1. **the religion first**, because the site is the religion's anchor and a
 *      site standing for nobody's faith would press for nothing;
 *   2. **the stones**, through `tile.improvement` and `refreshTileDerived` — the
 *      same two lines `buildImprovementAt` and `greatPersonWorkAt` write, so a
 *      holy site pays its faith into the panel this instant;
 *   3. **the draft**, if a follower slot is open. It is dealt *after* the stones
 *      for `consecrateAt`'s reason exactly — the draw advances `state.rng`, and
 *      anything that could throw between the two would leave a prophet able to
 *      deal a second hand from a moved generator;
 *   4. **the charge**, and a prophet that empties leaves the board exactly as a
 *      worker does;
 *   5. **the day**, spent whole. Planting is the turn's work.
 */
export function plantHolySiteAt(
  state: GameState,
  player: Player,
  unit: Unit,
  tile: Tile,
): HolySitePlanting {
  const existing = foundedReligion(state, player.id);
  const founded = existing === undefined;
  const religion = existing ?? foundReligion(state, player);

  tile.improvement = HOLY_SITE;
  refreshTileDerived(state, tile);

  let offer: BeliefOffer | null = null;
  if (poolHeld(religion, 'follower') < poolSlots('follower')) {
    offer = drawPoolBeliefOffer(state, player, religion, 'follower');
    player.pantheon.pending = offer;
  }

  const left = (unit.chargesLeft ?? 0) - 1;
  const prophetSpent = left <= 0;
  if (prophetSpent) removeUnit(state, unit.id);
  else {
    unit.chargesLeft = left;
    unit.movesLeft = 0;
  }
  return { religion, founded, offer, col: tile.col, row: tile.row, prophetSpent };
}

/**
 * Why this prophet cannot draw an enhancer belief, or `null` when it can.
 *
 * Theology is the gate the design names, asked of the tree rather than of a
 * constant here — `hasTech`, so a retuned tree moves the verb with it.
 */
export function enhanceReligionError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  const problem = prophetProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  const religion = foundedReligion(state, playerId);
  if (!religion) return 'You have founded no religion to enhance';
  if (!hasTech(state, playerId, ENHANCER_TECH)) {
    return `Enhancing a religion needs ${techDef(ENHANCER_TECH).name}`;
  }
  if (poolHeld(religion, 'enhancer') >= poolSlots('enhancer')) {
    return `${religion.name} has all the enhancements it will hold`;
  }
  if (religionBeliefPool(religion, 'enhancer').length === 0) {
    return 'There are no enhancements left to choose';
  }
  return null;
}

/** The technology that opens the enhancer pool. Named once, read twice. */
const ENHANCER_TECH: TechId = 'theology';

/**
 * Spends a charge on an enhancer draft. Validates nothing —
 * `enhanceReligionError` is the rule.
 *
 * `plantHolySiteAt`'s three closing steps in the same order and for the same
 * reasons: the draw, then the charge, then the day.
 */
export function enhanceReligionAt(
  state: GameState,
  player: Player,
  unit: Unit,
): BeliefOffer {
  const religion = foundedReligion(state, player.id)!;
  const offer = drawPoolBeliefOffer(state, player, religion, 'enhancer');
  player.pantheon.pending = offer;
  const left = (unit.chargesLeft ?? 0) - 1;
  if (left <= 0) removeUnit(state, unit.id);
  else {
    unit.chargesLeft = left;
    unit.movesLeft = 0;
  }
  return offer;
}

/**
 * Why this prophet cannot proclaim here, or `null` when it can.
 *
 * The faith bomb, and the ruling that shaped it (user, 2026-08-27): it **only
 * converts**. There is no site, no lasting anchor and nothing to defend — which
 * is precisely what makes the choice between this charge and a holy site a real
 * one. A bomb converts; a site keeps.
 */
export function proclaimError(state: GameState, playerId: number, unitId: number): string | null {
  const problem = prophetProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  if (foundedReligion(state, playerId) === undefined) {
    return 'You have founded no religion to proclaim';
  }
  return null;
}

/**
 * Leaves a proclamation on the hex the prophet stands on. Validates nothing —
 * `proclaimError` is the rule.
 *
 * The pulse's reach, strength and life are `rules.religion`'s, **shifted by the
 * enhancer pool** through the one reader (`cardPressureRule`), and its expiry is
 * an absolute turn nobody ever ticks. `startTurn` is the decay's denominator and
 * not a counter: a pulse that had to be told each turn how far it had come would
 * be the clock `TimedEffect` exists to refuse.
 */
export function proclaimAt(state: GameState, player: Player, unit: Unit): ReligionPulse {
  const religion = foundedReligion(state, player.id)!;
  const rules = RULES.religion;
  const pulse: ReligionPulse = {
    col: unit.col,
    row: unit.row,
    strength: Math.max(0, rules.bombStrength + cardPressureRule(state, player.id, 'bombStrength')),
    range: Math.max(0, rules.bombRange + cardPressureRule(state, player.id, 'bombRange')),
    startTurn: state.turn,
    expiresTurn:
      state.turn + Math.max(1, rules.bombTurns + cardPressureRule(state, player.id, 'pulseTurns')),
  };
  religion.pulses.push(pulse);
  const left = (unit.chargesLeft ?? 0) - 1;
  if (left <= 0) removeUnit(state, unit.id);
  else {
    unit.chargesLeft = left;
    unit.movesLeft = 0;
  }
  return pulse;
}

/**
 * Why this prophet cannot redraft this pool, or `null` when it can.
 *
 * **The pantheon is never redrafted**, and it is not in the union of pools this
 * command accepts at all — identity is not a decision you take back
 * (`docs/religion-v2.md`).
 */
export function redraftError(
  state: GameState,
  playerId: number,
  unitId: number,
  pool: unknown,
): string | null {
  const problem = prophetProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  const religion = foundedReligion(state, playerId);
  if (!religion) return 'You have founded no religion to redraft';
  if (pool !== 'follower' && pool !== 'enhancer') {
    return `There is no belief pool called "${String(pool)}"`;
  }
  if (poolHeld(religion, pool) === 0) {
    return `${religion.name} holds no ${pool} belief to give back`;
  }
  return null;
}

/**
 * Gives one pool's beliefs back and deals a fresh offer. Validates nothing —
 * `redraftError` is the rule.
 *
 * The beliefs are returned **before** the draw, so the bag they came out of is
 * whole again and a redraft may honestly re-offer what was just given up —
 * `beliefPool`'s "a declined god goes back in the bag", one system over.
 */
export function redraftAt(
  state: GameState,
  player: Player,
  unit: Unit,
  pool: ReligionBeliefPool,
): BeliefOffer {
  const religion = foundedReligion(state, player.id)!;
  if (pool === 'follower') religion.follower = [];
  else delete religion.enhancer;
  const offer = drawPoolBeliefOffer(state, player, religion, pool);
  player.pantheon.pending = offer;
  const left = (unit.chargesLeft ?? 0) - 1;
  if (left <= 0) removeUnit(state, unit.id);
  else {
    unit.chargesLeft = left;
    unit.movesLeft = 0;
  }
  return offer;
}

// --- the tide ---------------------------------------------------------------

/**
 * One holy site standing on the board, and whose faith it presses for.
 *
 * Derived from the ground every sweep and never stored: the site is an
 * *improvement*, so who it presses for is whoever owns the hex — which is what
 * makes a captured holy site change sides with the town around it, and what
 * makes pillaging one the single way to hurt a religion (`docs/religion-v2.md`).
 */
export interface HolySite {
  col: number;
  row: number;
  religion: ReligionId;
}

/**
 * Every holy site on the board, in map order.
 *
 * **Hoisted for one sweep**, `zocField`'s and `tileOwnerField`'s bargain: the
 * spread phase asks once and hands the list to forty towns, where asking per
 * town would be forty passes over four thousand hexes. A caller with no list —
 * a panel asking about one city — gets a fresh one, which is correct and costs a
 * single pass.
 */
export function holySites(state: GameState): HolySite[] {
  const out: HolySite[] = [];
  if (state.religions.length === 0) return out;
  const owners = tileOwnerField(state);
  for (let index = 0; index < state.map.tiles.length; index++) {
    const tile = state.map.tiles[index]!;
    if (tile.improvement !== HOLY_SITE) continue;
    const owner = owners.at(index);
    if (owner === null) continue;
    const religion = foundedReligion(state, owner);
    if (!religion) continue;
    out.push({ col: tile.col, row: tile.row, religion: religion.id });
  }
  return out;
}

/**
 * The cities joined to this one by **road**, in `state.cities` order.
 *
 * A flood fill over paved hexes and the towns standing on them, hoisted for one
 * question and never stored — `connectedCities`' bargain, one rule wider: that
 * function answers "which of *my* towns reach my capital", and belief does not
 * care whose road it is walking on. A town is a junction whether or not anybody
 * paved its centre, which is what lets two empires' networks meet at a gate.
 */
function roadReach(state: GameState, from: City): City[] {
  const { map } = state;
  const start = getTileAt(map, from.col, from.row);
  const out: City[] = [];
  if (!start) return out;
  const cityAtIndex = new Map<number, City>();
  for (const city of state.cities) cityAtIndex.set(tileIndex(map, city.col, city.row), city);
  const seen = new Uint8Array(map.tiles.length);
  const frontier: Tile[] = [start];
  seen[tileIndex(map, start.col, start.row)] = 1;
  while (frontier.length > 0) {
    const tile = frontier.pop()!;
    for (const neighbour of neighborTiles(map, tileHex(tile))) {
      const index = tileIndex(map, neighbour.col, neighbour.row);
      if (seen[index] === 1) continue;
      const paved = neighbour.road !== undefined;
      const town = cityAtIndex.get(index);
      if (!paved && town === undefined) continue;
      seen[index] = 1;
      // A town is where a road ends, not a hex a road runs through: the fill
      // stops at a foreign gate rather than treating every city as a junction
      // onto whatever is paved on the other side of it. It is still *reached*,
      // which is the whole of what pressure asks.
      if (town !== undefined) {
        if (town.id !== from.id) out.push(town);
        if (!paved) continue;
      }
      frontier.push(neighbour);
    }
  }
  // Sorted into `state.cities` order rather than fill order, because a fill's
  // order is an artefact of the frontier and an outcome may only depend on an
  // order the state carries.
  const ordered: City[] = [];
  for (const city of state.cities) {
    if (out.includes(city)) ordered.push(city);
  }
  return ordered;
}

/** One labelled contribution to one religion's pull on one town. Rule 5, for a tide. */
export interface PressureLine {
  religion: ReligionId;
  /** Player-facing, and plain: "Holy site", "Road", "Proclamation". */
  source: string;
  /** The faith this line presses. Whole, and already what the bank receives. */
  amount: number;
}

/**
 * What every religion presses on this town this turn, as an ordered list whose
 * fold is the figure the bank receives.
 *
 * **The** reading of the tide (hard rule 5 at the scale of a faith), and it is
 * derived from the board with nothing stored: sites, following neighbours,
 * roads, caravans, proclamations, a temple's resistance, the founder's capital
 * and whatever the stones supply. Recomputed every turn by the `spreadReligion`
 * phase and by any surface that wants to explain a banner.
 *
 * Two orderings are load-bearing and neither is negotiable. The **religions** are
 * walked in `state.religions` order, which is founding order, so a fold is the
 * same on every machine. The **temple's line is last** within each religion,
 * because it is a percentage of everything above it — the one multiplication in
 * the whole tide, taken once, floored once, and carried as the *difference* it
 * makes so that the list still sums to the total (`explainUnitCost`'s discipline
 * for the fourth time).
 *
 * `sites` is the hoisted sweep. Absent means "ask the board", which is what a
 * panel does and what a test does.
 */
export function explainPressure(
  state: GameState,
  city: City,
  sites: readonly HolySite[] = holySites(state),
): PressureLine[] {
  const lines: PressureLine[] = [];
  if (state.religions.length === 0) return lines;
  const rules = RULES.religion;
  const here = getTileAt(state.map, city.col, city.row);
  if (!here) return lines;
  const eye = tileHex(here);
  const current = cityReligion(city);
  const hasTemple = city.buildings.includes(TEMPLE);
  // One fill for the whole town rather than one per religion: which towns this
  // one is joined to by road is a fact about the board, not about a faith.
  const byRoad = roadReach(state, city);

  for (const religion of state.religions) {
    const founder = religion.founderId;
    const rule = (id: PressureRuleId, base: number): number =>
      base + cardPressureRule(state, founder, id);
    const before = lines.length;
    const say = (source: string, amount: number): void => {
      if (amount > 0) lines.push({ religion: religion.id, source, amount });
    };

    // **The anchor.** A site is the strongest thing on the board and the only
    // one a rival can take away.
    const siteRange = rule('siteRange', rules.siteRange);
    const siteStrength = rule('siteStrength', rules.siteStrength);
    let fromSites = 0;
    for (const site of sites) {
      if (site.religion !== religion.id) continue;
      const tile = getTileAt(state.map, site.col, site.row);
      if (!tile) continue;
      if (wrappedDistance(state.map, eye, tileHex(tile)) > siteRange) continue;
      fromSites += siteStrength;
    }
    say('Holy site', fromSites);

    // **The slow tide**, and the caravan's other cargo. A following city is a
    // source; whose it is does not matter, which is what makes a faith spread
    // through a rival's realm without anybody marching.
    const cityRange = rule('cityRange', rules.cityRange);
    const cityStrength = rule('cityStrength', rules.cityStrength);
    const roadStrength = rule('roadStrength', rules.roadStrength);
    let fromCities = 0;
    for (const other of state.cities) {
      if (other.id === city.id) continue;
      if (cityReligion(other) !== religion.id) continue;
      const tile = getTileAt(state.map, other.col, other.row);
      if (!tile) continue;
      if (wrappedDistance(state.map, eye, tileHex(tile)) > cityRange) continue;
      fromCities += cityStrength;
    }
    say('Nearby city', fromCities);

    let fromRoads = 0;
    for (const other of byRoad) {
      if (cityReligion(other) !== religion.id) continue;
      fromRoads += roadStrength;
    }
    say('Road', fromRoads);

    const routeStrength = rule('routeStrength', rules.routeStrength);
    const bothWays = rule('routeBothWays', 0) > 0;
    let fromRoutes = 0;
    for (const unit of state.units) {
      const route = unit.trade;
      if (route === undefined) continue;
      if (state.turn >= route.expiresTurn) continue;
      const partner =
        route.to === city.id ? route.from : bothWays && route.from === city.id ? route.to : null;
      if (partner === null) continue;
      const origin = state.cities.find((town) => town.id === partner);
      if (!origin || cityReligion(origin) !== religion.id) continue;
      fromRoutes += routeStrength;
    }
    say('Trade route', fromRoutes);

    // **The proclamation**, decaying to nothing at its absolute expiry. Nothing
    // ticks it: the share is computed from the two turns it carries.
    let fromPulses = 0;
    for (const pulse of religion.pulses) {
      const span = pulse.expiresTurn - pulse.startTurn;
      if (span <= 0 || state.turn >= pulse.expiresTurn) continue;
      const tile = getTileAt(state.map, pulse.col, pulse.row);
      if (!tile) continue;
      if (wrappedDistance(state.map, eye, tileHex(tile)) > pulse.range) continue;
      fromPulses += Math.floor((pulse.strength * (pulse.expiresTurn - state.turn)) / span);
    }
    say('Proclamation', fromPulses);

    // **A founder's capital does not drift.** The seat of the faith holds itself.
    if (capitalCityOf(state, founder)?.id === city.id) {
      say('Your capital', rule('capitalStrength', rules.capitalStrength));
    }

    // The stones. `cardPressureSources` keeps the town each one presses from,
    // which is what `liveEffects` deliberately forgets.
    let fromWonders = 0;
    for (const source of cardPressureSources(state, founder)) {
      const tile = getTileAt(state.map, source.city.col, source.city.row);
      if (!tile) continue;
      if (wrappedDistance(state.map, eye, tileHex(tile)) > source.range) continue;
      fromWonders += source.amount;
    }
    say('Wonder', fromWonders);

    // **The temple is the defence, and there is no other.** Twice for the faith
    // the town already keeps, half for everybody else's — the design's answer to
    // "how do I resist a conversion" that needs no combat and no unit. Last, and
    // carried as a difference, so the list still sums to the total.
    if (!hasTemple) continue;
    let subtotal = 0;
    for (let i = before; i < lines.length; i++) subtotal += lines[i]!.amount;
    if (subtotal === 0) continue;
    const percent =
      current === religion.id
        ? rule('templeOwnPercent', rules.templeOwnPercent)
        : rule('templeForeignPercent', rules.templeForeignPercent);
    const after = Math.max(0, Math.floor((subtotal * Math.max(0, percent)) / 100));
    if (after !== subtotal) {
      lines.push({ religion: religion.id, source: 'Temple', amount: after - subtotal });
    }
  }
  return lines;
}

/** The building a town defends its faith with. Named once, read twice. */
const TEMPLE: BuildingId = 'temple';

/**
 * The fold of `explainPressure`, by religion id — one entry per religion in
 * founding order, and zero for the ones pressing nothing.
 *
 * A plain array indexed by id, because an id *is* an index into
 * `state.religions` and a sweep already holds the address. Totals are floored at
 * zero: a temple may cut a faith's pull, never turn it into a push.
 */
export function pressureTotals(
  state: GameState,
  city: City,
  sites?: readonly HolySite[],
): number[] {
  const totals = new Array<number>(state.religions.length).fill(0);
  for (const line of explainPressure(state, city, sites)) {
    totals[line.religion] = (totals[line.religion] ?? 0) + line.amount;
  }
  for (let i = 0; i < totals.length; i++) totals[i] = Math.max(0, totals[i]!);
  return totals;
}

/**
 * The tide, run for one turn — **the only writer of `City.followers`** and of
 * `City.pressureBank`.
 *
 * The phase sits **before `collectYields`** and that is a rules decision like
 * every other position in the pipeline: a town that changes its banner this turn
 * pays its new majority's founder *this* turn, rather than a turn late. It is
 * also why the phase is early enough that nothing has yet been banked out of the
 * world it is about to change.
 *
 * Three things happen, in this order, per town in `state.cities` order:
 *
 *   1. **the bank fills** — every religion's pressure, folded off the board;
 *   2. **citizens turn** — one per `pressurePerConvert` banked, taken from the
 *      unconverted first and otherwise from the smallest congregation
 *      (`convertCitizen`, whose docblock is the rule);
 *   3. **the bank is capped** when nobody is left to turn, so a town that has
 *      wholly converted does not sit banking a reserve that would flip it back
 *      the instant a rival's first citizen arrived. The remainder below one
 *      convert always carries, exactly as a food basket's does.
 *
 * And a **broom** at the end: proclamations whose absolute expiry has passed are
 * swept. An expired pulse presses nothing whether it is swept or not
 * (`explainPressure` compares), which is precisely the property that makes the
 * sweep safe to place anywhere, skip, or run twice — `pruneTimedEffects`' rule,
 * for the second time.
 */
export function spreadReligion(state: GameState): void {
  if (state.religions.length === 0) return;
  const order = state.religions.map((religion) => religion.id);
  const perConvert = Math.max(1, Math.floor(RULES.religion.pressurePerConvert));
  const sites = holySites(state);
  // **Every town is measured against the same board, and then every town is
  // moved.** Two passes rather than one, and it is the pipeline's own rule read
  // at the scale of a phase (`turn.ts`: "a rule is applied to the empire, not to
  // a city, so no city can ever be a turn ahead of its neighbour because it was
  // founded first"). A single pass would have let a town that converted early in
  // `state.cities` order press on its neighbour *in the same turn* — deterministic,
  // but a tide that runs faster along founding order than against it.
  const measured = state.cities.map((city) => pressureTotals(state, city, sites));
  for (const [index, city] of state.cities.entries()) {
    const totals = measured[index]!;
    const bank = city.pressureBank ?? {};
    for (const religion of state.religions) {
      const gained = totals[religion.id] ?? 0;
      const banked = (bank[religion.id] ?? 0) + gained;
      let left = banked;
      while (left >= perConvert) {
        if (!convertCitizen(city, religion.id, order)) {
          // Nobody left to turn. The bank is capped just below the next convert
          // rather than allowed to grow — a stored surplus would be a town that
          // re-converts instantly the moment a rival takes one citizen back.
          left = perConvert - 1;
          break;
        }
        left -= perConvert;
      }
      if (left > 0) bank[religion.id] = left;
      else delete bank[religion.id];
    }
    // Deleted when empty, so a town nothing presses on serialises exactly like
    // one from before any of this existed.
    if (Object.keys(bank).length > 0) city.pressureBank = bank;
    else delete city.pressureBank;
  }
  for (const religion of state.religions) {
    const live = religion.pulses.filter((pulse) => state.turn < pulse.expiresTurn);
    if (live.length !== religion.pulses.length) religion.pulses = live;
  }
}

/**
 * The religion most of this empire's **towns** follow, or `null`.
 *
 * Derived, never stored, and counted in towns rather than in citizens: "what
 * does this realm believe" is a question about places, and a future Doctrine or
 * bead race asks it of the map. Ties are broken by founding order, which is the
 * order `state.religions` carries.
 */
export function majorityReligion(state: GameState, playerId: number): ReligionId | null {
  if (state.religions.length === 0) return null;
  const counts = new Array<number>(state.religions.length).fill(0);
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const followed = cityReligion(city);
    if (followed === null) continue;
    counts[followed] = (counts[followed] ?? 0) + 1;
  }
  let best: ReligionId | null = null;
  let most = 0;
  for (const religion of state.religions) {
    const count = counts[religion.id] ?? 0;
    if (count > most) {
      best = religion.id;
      most = count;
    }
  }
  return best;
}
