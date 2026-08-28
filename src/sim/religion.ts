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
  type TimedEffect,
  type Unit,
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
  settleBorderWindfall,
  settleGrowthWindfall,
  settlePopulationWindfall,
  settleProductionWindfall,
} from './cities';
import { drawDiscoveryOffer } from './discoveries';
import { getTileAt, tileHex, wrappedDistance } from './map';
import {
  type BeliefId,
  type BeliefOffer,
  type RiteDef,
  type RiteId,
  BELIEF_IDS,
  RELIGION,
  beliefDef,
  isBeliefId,
  isRiteId,
  riteAbility,
  riteDef,
  slotsFromTechs,
} from './religionData';
import {
  cardAmplifier,
  cardPantheonSlots,
  cardPeriodicOffers,
  drawWithoutReplacement,
  offerSize,
  payWindfallGrants,
  settleCultureWindfall,
  timedEffectIsLive,
  windfallPayout,
} from './statecraft';
import { hasAbility, settleResearchWindfall } from './tech';
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
  return BELIEF_IDS.filter((id) => !held.has(id));
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
 * Why this augur cannot consecrate, or `null` when it can.
 *
 * **Consecrate spends the whole unit, whatever it has left.** That is the
 * anti-spam structure (`docs/religion.md`): an augur is *either* three rites *or*
 * one god, so a player who has already spent two charges is giving up much less
 * than one who has spent none, and the choice is a real one at every point on
 * that curve. There is therefore no charge clause here at all — only a slot one.
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
  if (player.pantheon.pending !== undefined) {
    return `${player.name} has a god still awaiting judgment`;
  }
  if (!hasOpenBeliefSlot(state, playerId)) {
    return 'Your pantheon has no room for another god';
  }
  if (beliefPool(player).length === 0) return 'There are no gods left to consecrate';
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
  if (!offer) return `${player.name} has no god awaiting consecration`;
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
  player.pantheon.beliefs.push(id);
  // A God Named. It takes the `state` **only** for this — the belief itself is a
  // fact about the player alone — and that is a fair price for putting the
  // triumph in the mechanism rather than in the reducer, where an AI naming a
  // god would earn nothing.
  awardOccasion(state, player.id, 'beliefConsecrated');
  return { id, name: beliefDef(id).name };
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
 * this my augur, does it have a rite left, do I know this one, is the target in
 * reach, and is there anything there to bless.
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
  const paid = payRiteGrant(state, player, def, city, blessed);
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
    parts.push(`+${grant.borderCulture} culture to ${city.name}'s bounds`);
  }
  if (grant.production !== undefined && city) parts.push(`+${grant.production} production`);
  if (grant.food !== undefined && city) parts.push(`+${grant.food} food`);
  if (grant.healFully === true && blessed) parts.push(`heals the ${unitDef(blessed.type).name} whole`);
  if (def.duration !== undefined) parts.push(`${def.duration} turns of blessing`);
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
  return player.pantheon.pending !== undefined ? 'a god is waiting to be named' : null;
}

/** Is anything religious waiting to be answered? The dock button's badge. */
export function hasReligionOffer(player: Player): boolean {
  return player.pantheon.pending !== undefined;
}
