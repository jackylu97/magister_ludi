/**
 * Religion v1: the augur and the pantheon (design ledger, Entry XXVIII;
 * `docs/deprecated/religion.md` is the ratified design).
 *
 * Faith is the **third draft currency**. Culture drafts Orders (slottable
 * posture), faith drafts **beliefs** (permanent identity) — and, unlike culture,
 * it does not draft directly: it buys the *agent* who does the drafting. That
 * one indirection is the whole design. **An agent is one deed** (Entry LVIII,
 * the faith rework of 2026-09-02) — an augur is one rite *or* one god, a prophet
 * is a founding *or* a proclamation *or* a belief — and every one of them costs
 * more faith than the last, so "what is this prophet for" is a question asked
 * once, answered once, and never taken back.
 *
 * That one-charge rule replaced a ladder of partial spends (three rites out of
 * an augur, two acts out of a prophet) and it is worth saying why: a piece with
 * three charges makes the *first* act nearly free and the last one agonising,
 * which is the opposite of the decision the price ladder was built to pose. One
 * charge puts the whole price on every deed.
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
 * (`docs/deprecated/religion.md`'s scope ruling). Pantheons are native and never convert
 * away, which is exactly why this half ships alone and needs no spread
 * machinery: every belief here applies in every city its empire owns, always.
 */

import {
  type City,
  type GameState,
  type Player,
  type Religion,
  type ReligionId,
  type TimedEffect,
  type Unit,
  cityReligion,
  convertCitizen,
  followerCount,
  foundedReligion,
  playerById,
  realPlayers,
  removeUnit,
  unconvertCitizen,
  unitById,
} from './state';
import {
  type UnitCostLine,
  type WonderCompletion,
  capitalCityOf,
  cityAt,
  foldUnitCost,
  nearestOwnedCity,
  refreshCityDerived,
  refreshTileDerived,
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
  LIVE_RITE_IDS,
  RELIGION,
  beliefDef,
  isBeliefId,
  isPantheonBeliefId,
  isRiteId,
  poolBeliefs,
  riteAbility,
  riteCost,
  riteDef,
  slotsFromTechs,
} from './religionData';
import {
  cardAmplifier,
  cardPantheonSlots,
  cardPeriodicOffers,
  cardPressureRule,
  cardPressureSources,
  drawOrderOffer,
  drawWithoutReplacement,
  offerSize,
  payWindfallGrants,
  religionFounder,
  settleCultureWindfall,
  timedEffectIsLive,
  windfallPayout,
} from './statecraft';
import { hasAbility, hasTech } from './tech';
import { type TechId, eraNumeral, highestAge, techDef } from './techData';
import type { BuildingId } from './buildingData';
import {
  PLACED_BUILDING,
  buildingRitePay,
  cityKeepsRelics,
} from './buildingEffects';
import type { PressureRuleId } from './statecraftData';
import { type ImprovementId, workForFamily } from './improvementData';
import { improvementErrorAt } from './improvements';
import { nextFloat } from './rng';
import { RULES } from './rulesData';
import { awardBeadOccasion } from './beads';
import { awardOccasion } from './triumphs';
import { unitDef, unitMaxHp } from './unitData';

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

/** One place at the fire: the god standing in it, or what is keeping it shut. */
export interface PantheonPlace {
  /** The god here, or `null` for a place nobody has named. */
  belief: BeliefId | null;
  /** The technology that would open this place, or `null` when it is already open. */
  awaits: TechId | null;
}

/**
 * Every place at the fire in the order the tree opens them — the ones filled,
 * the ones standing empty, and the ones a technology has yet to open.
 *
 * `pantheonSlots` answers "how many may I hold", which is the whole of what the
 * *rules* need; a sheet drawing the pantheon needs the shape as well, and the
 * third place existing-but-shut is the fact it exists to print. Derived here
 * rather than on the screen for `poolTechName`'s reason: which technology opens
 * which place is `RELIGION.pantheon.slotsFromTech`, and a screen holding a copy
 * would be a second table that disagrees with the data the day it is retuned.
 *
 * A god held beyond the open places (a card's slot withdrawn, a hand-edited
 * save) still gets a place, because a god you hold is a god that pays.
 */
export function pantheonPlaces(state: GameState, playerId: number): PantheonPlace[] {
  const player = playerById(state, playerId);
  if (!player) return [];
  const held = player.pantheon.beliefs;
  const open = Math.max(held.length, pantheonSlots(state, playerId));
  const places: PantheonPlace[] = [];
  for (let index = 0; index < open; index++) {
    places.push({ belief: held[index] ?? null, awaits: null });
  }
  for (const [tech, slots] of Object.entries(RELIGION.pantheon.slotsFromTech)) {
    if (player.techsResearched.includes(tech as TechId)) continue;
    for (let index = 0; index < Math.max(0, Math.floor(slots ?? 0)); index++) {
      places.push({ belief: null, awaits: tech as TechId });
    }
  }
  return places;
}

/**
 * The gods still drawable: every row in the table **nobody in the world** holds,
 * in file order.
 *
 * A **declined** god goes back in the bag and a held one leaves it, which is the
 * ratified rule and the honest one: declining is not a decision about the god,
 * it is a decision about the two beside it. `livePool`'s shape (`statecraft.ts`)
 * without the retirement, because a pantheon has no ages.
 *
 * **A god belongs to one world** (user ruling, 2026-08-29). A belief another
 * empire keeps is gone from every other empire's bag — the rule
 * `state.contested` states for a Triumph, one system over, and the reason this
 * takes the state at all. Two pantheons that both keep Keeper of the Hearth are
 * two empires with the same identity, which is the one thing a pantheon is for;
 * and once the pool is world-unique, a *recast* is a real decision rather than a
 * reshuffle, because what is on the table depends on what rivals have already
 * taken.
 *
 * Swept over `realPlayers` in **array order** — never a Map, and never
 * `state.players`, because the wild keeps no gods and a seat that is not a
 * nation has no identity to defend.
 */
export function beliefPool(state: GameState, player: Player): BeliefId[] {
  const held = new Set<BeliefId>(player.pantheon.beliefs);
  for (const other of realPlayers(state)) {
    if (other.id === player.id) continue;
    for (const id of other.pantheon.beliefs) held.add(id);
  }
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

// `augurHasActed` stood here until 2026-09-06 — "a rite is the augur's whole
// turn", read off `movesLeft`. The faith ladder took the consecration over and
// the verb refuses always (`consecrateError` below), so the sentence had no
// reader left: a rule nothing asks is a rule that quietly stops being true. The
// reading it made is one line (`unit.movesLeft <= 0`) and every other piece in
// the game makes it, so a returning verb writes it again rather than inheriting
// a function whose docblock outlived the rule.

/**
 * Why this augur cannot consecrate — **always**, since the faith ladder took the
 * consecration over (`docs/fewer-things.md` §3, ruled 2026-09-06).
 *
 * The verb is **retired, not deleted**, and the distinction is the whole of why
 * this function still exists and still opens with the ownership clauses. A
 * command in an old log has to be *refused*, not crash; a piece already standing
 * on a board has to have a sentence beside its greyed row; and a reducer arm
 * that had been deleted would have taken the exhaustiveness idiom's guarantee
 * with it. So the gate stands, the refusals a player would think of are asked in
 * their old order so a hand-edited log still gets the honest sentence, and the
 * last one is the design's: a god arrives when the bank crosses a rung
 * (`openFaithLadder`), not when a piece is walked to a town and spent.
 *
 * `consecrateAt` is untouched below it and unreachable, which is deliberate:
 * the day the design wants an agent-bought god back, this clause comes out and
 * nothing else moves.
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
  return 'Your gods arrive on their own, once your faith is deep enough';
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
    options: drawWithoutReplacement(
      state,
      beliefPool(state, player),
      offerSize(state, player.id, 'belief'),
    ),
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

// --- the faith ladder -------------------------------------------------------

/**
 * What the `n`-th rung of the faith ladder asks of the bank. `n` is the number
 * already climbed, so the first consecration is `faithRungCost(0)`.
 *
 * `draftCost`'s arithmetic exactly, one currency over — `base + linear·n +
 * n^exp`, floored — and it is the same function for the same reason: a bank of
 * whole numbers wants a whole threshold, and two ladders that disagreed about
 * how a threshold is shaped would be two systems to retune. The numbers are
 * `RELIGION.ladder` and what they were chosen to reproduce is in
 * `FaithLadderConfig`: the augur's old price ladder, without the errand.
 */
export function faithRungCost(rungs: number): number {
  const n = Math.max(0, Math.floor(rungs));
  const ladder = RELIGION.ladder;
  return Math.floor(ladder.costBase + ladder.costLinear * n + n ** ladder.costExponent);
}

/** What this empire's next consecration asks. The fold of the curve and its rungs. */
export function nextFaithRungCost(player: Player): number {
  return faithRungCost(player.pantheon.rungs);
}

/**
 * The technology that would open the **next** place at the fire, or `null` when
 * the tree has none left to open.
 *
 * The first shut place `pantheonPlaces` lists, which walks
 * `RELIGION.pantheon.slotsFromTech` in its own key order — Divination's two,
 * then The High Temple's third. Off that list rather than off a second walk of
 * the table, so "what opens the next place" and the place drawn on the sheet
 * can never name two different technologies.
 */
export function nextPantheonTech(state: GameState, playerId: number): TechId | null {
  for (const place of pantheonPlaces(state, playerId)) {
    if (place.awaits !== null) return place.awaits;
  }
  return null;
}

/**
 * Where this empire stands on the faith ladder — one reading, four states, for
 * every surface that answers "when is my next god".
 *
 * Four states and no fifth, because there are exactly four things that can be
 * true of the next place at the fire and a screen that folded any two of them
 * together would lie about one:
 *
 *   · **`waiting`** — a hand is already dealt and unanswered. The bank is not
 *     the question; the player is.
 *   · **`open`** — a place stands empty and the ladder is charging for it. The
 *     rung, its price, what is banked, and how long the current rate needs.
 *   · **`closed`** — every place the tree has opened is filled and a further
 *     technology would open another. The player is not saving, they are
 *     researching.
 *   · **`full`** — the pantheon holds every place it will ever hold.
 *
 * **The rate is the caller's**, and deliberately: what an empire gathers a turn
 * is `civYields`' fold of every town — the same figure the top bar prints — and
 * folding it a second time here would be a second answer to a question the
 * interface has already asked. So the surface hands in the number it is already
 * showing, and this composes.
 *
 * Exact figures, one rounding: `turns` is whole because a partial turn buys
 * nothing, and everything else is the bank's own arithmetic. `nextRungWords`
 * below is the one sentence both surfaces print.
 */
export type NextRung =
  | { kind: 'waiting' }
  | {
      kind: 'open';
      /** Which place this would be — the gods held, plus one. */
      rung: number;
      /** What the ladder asks of the bank, `faithRungCost`'s own figure. */
      cost: number;
      /** Faith banked now. */
      banked: number;
      /** Faith a turn, as the caller reads it. */
      perTurn: number;
      /** Whole turns at that rate — `0` when the bank already covers it, `null` when nothing gathers. */
      turns: number | null;
    }
  | { kind: 'closed'; tech: TechId }
  | { kind: 'full' };

export function explainNextRung(state: GameState, playerId: number, perTurn: number): NextRung {
  const player = playerById(state, playerId);
  if (!player) return { kind: 'full' };
  if (player.pantheon.pending !== undefined) return { kind: 'waiting' };
  if (!hasOpenBeliefSlot(state, playerId)) {
    const tech = nextPantheonTech(state, playerId);
    return tech === null ? { kind: 'full' } : { kind: 'closed', tech };
  }
  const cost = nextFaithRungCost(player);
  const banked = Math.max(0, Math.floor(player.faithPool));
  const owing = Math.max(0, cost - banked);
  return {
    kind: 'open',
    rung: player.pantheon.beliefs.length + 1,
    cost,
    banked,
    perTurn,
    turns: owing === 0 ? 0 : perTurn > 0 ? Math.ceil(owing / perTurn) : null,
  };
}

/**
 * The reading as the one sentence every surface prints — "Next god: 56 faith ·
 * 31 banked · about 4 turns".
 *
 * Beside the reading rather than on either screen, for `riteGrantWords`'
 * reason turned the right way round: the faith chip's card and the Religion
 * sheet's empty place answer the same question, and two compositions of one
 * reading is how two surfaces come to disagree about a threshold. A figure is
 * never composed by the interface — this is where it is written, once.
 *
 * "about", because the rate is this turn's and the next town changes it.
 */
export function nextRungWords(reading: NextRung): string {
  if (reading.kind === 'waiting') return 'A god is waiting to be named';
  if (reading.kind === 'full') return 'The pantheon is full';
  if (reading.kind === 'closed') return `${techDef(reading.tech).name} opens the next place`;
  const parts = [`Next god: ${reading.cost} faith`, `${reading.banked} banked`];
  if (reading.turns === 0) parts.push('enough is gathered');
  else if (reading.turns !== null) {
    parts.push(reading.turns === 1 ? 'about a turn' : `about ${reading.turns} turns`);
  }
  return parts.join(' · ');
}

/**
 * Would the ladder deal this empire a consecration right now, and at what price?
 * `null` when it would not.
 *
 * `planDraft`'s shape — the pure half of "would this empire consecrate" — and it
 * carries every clause the phase would otherwise inline, so a screen counting
 * down to the next god and the phase that deals it cannot disagree:
 *
 *   · **the bank covers the rung.** Faith already banked, never faith owing:
 *     the ladder is a threshold reached, the culture meter's discipline.
 *   · **a slot is open** (`hasOpenBeliefSlot`), which is where "three rungs and
 *     no fourth" actually comes from: the pantheon has three slots, the third
 *     of them opens at The High Temple, and the ladder never learns the number.
 *   · **an offer is not already outstanding**, `settleDraft`'s rule for
 *     `discoveryClaimError`'s reason — a second hand dealt on top of the first
 *     would silently destroy it.
 *   · **the bag is not empty**, which is `consecrateError`'s last clause: a
 *     draft with nothing to deal is an End Turn blocker nobody could clear.
 */
export function planFaithRung(state: GameState, player: Player): { rung: number; cost: number } | null {
  if (player.pantheon.pending !== undefined) return null;
  if (!hasOpenBeliefSlot(state, player.id)) return null;
  if (beliefPool(state, player).length === 0) return null;
  const cost = nextFaithRungCost(player);
  if (player.faithPool < cost) return null;
  return { rung: player.pantheon.rungs + 1, cost };
}

/**
 * The ladder's phase: every empire whose faith has reached the next rung is
 * dealt a consecration.
 *
 * **A rung is not spent here.** The offer opens, carrying the price it was
 * quoted (`BeliefOffer.rungCost`), and the bank is charged by the *pick* —
 * which is the one place the ladder and the culture meter differ, and
 * deliberately: culture fills a meter that a draft empties, and faith is a bank
 * the player also spends on units and buildings, so a threshold that emptied it
 * the instant it was crossed would take the choice away rather than offer one.
 * A pick is a command, so the charge is as log-determined as the draw.
 *
 * Called from `openPeriodicOffers` — the religion phase — rather than being a
 * phase of its own, because it is the same beat: an offer dealt from
 * `state.rng` at the end of a resolution, on a board that has already grown,
 * built and banked this turn, blocking End Turn until it is answered. The wild
 * is skipped by `realPlayers` for `runStatecraft`'s reason.
 *
 * At most one rung an empire a turn, `openPeriodicOffers`' rule for its reason:
 * `planFaithRung` refuses while an offer is outstanding, and it has just made
 * one. A bank deep enough for two rungs climbs the second next turn.
 */
export function openFaithLadder(state: GameState): void {
  for (const player of realPlayers(state)) {
    const plan = planFaithRung(state, player);
    if (!plan) continue;
    const offer = drawBeliefOffer(state, player);
    // **The rung is paid at the deal** (the user, 2026-09-06, evening: "it
    // should auto-draft a pantheon once you reach the requisite faith — it
    // subtracts that amount from your faith total"). The docblock above
    // described the earlier reading, in which the pick paid; the reading now
    // is the culture meter's — the threshold spends what it crossed — and the
    // rung is climbed the moment the hand is dealt. `rungCost` stays on the
    // offer as the record of what was paid (and as the tell that this is the
    // ladder's hand, which `rerollError` reads), and the pick charges nothing.
    player.faithPool = Math.max(0, player.faithPool - plan.cost);
    player.pantheon.rungs += 1;
    offer.rungCost = plan.cost;
    offer.rerolls = 0;
    player.pantheon.pending = offer;
  }
}

/**
 * A consecration **paid by something other than the bank** — Stonehenge's
 * completion grant, and nothing else today (`CompletionGrant`, ruled
 * 2026-09-06: the stones leave an augur behind and hand over a god instead).
 *
 * `openFaithLadder`'s deal with the ladder taken out of it, and the two
 * differences are the whole of what "free" means here: **no rung is quoted**, so
 * `settleBeliefChoice` charges the pick nothing and `PlayerPantheon.rungs` does
 * not move — a god the stones gave is not a rung climbed, which is that field's
 * own docblock and the reason it counts rungs rather than gods. The empire's
 * next *paid* god therefore costs exactly what it would have cost anyway.
 *
 * Every other clause `planFaithRung` asks is asked here and in its order, and
 * for its reasons: a place has to be open, a hand already dealt must not be
 * destroyed by a second, and an empty bag is an End Turn blocker nobody could
 * clear. `false` says the grant did not land, which `payCompletionGrants` reports
 * as `done: false` rather than silently paying nothing.
 *
 * The pool is asked **before** the draw, `planFaithRung`'s discipline: an empty
 * bag must not spend the generator.
 */
export function openFreeRung(state: GameState, player: Player): boolean {
  if (player.pantheon.pending !== undefined) return false;
  if (!hasOpenBeliefSlot(state, player.id)) return false;
  if (beliefPool(state, player).length === 0) return false;
  player.pantheon.pending = drawBeliefOffer(state, player);
  return true;
}

// --- the reroll -------------------------------------------------------------

/**
 * What a reroll would cost, as the ordered lines the price is the fold of.
 *
 * `explainPurchaseCost`'s shape and rule 5's discipline: every line carries the
 * **difference** it makes to the running figure, so the sum of the list *is* the
 * price and no surface adds a total beside it. Three lines at most, in the order
 * a player would ask them —
 *
 *   1. what a fresh hand costs at all (`RerollConfig.base`);
 *   2. what the age adds, named by its numeral, and absent in an age whose
 *      multiplier is one;
 *   3. what the rerolls already taken add, absent for the first.
 *
 * The arithmetic is multiplicative and the print is additive, which is the same
 * bargain a purchase's currency conversion strikes: the rounding happens once,
 * at the end, and each line says how much of the total it is answerable for.
 *
 * A **belief** hand is not priced here: it has its own ladder
 * (`explainBeliefRerollCost` — the first asking free, then rising per asking on
 * that hand, reset with the next), separate from this lifetime count (the
 * user, 2026-09-06, evening). `rerollError` decides which question is being
 * asked by which hand is on the table.
 */
export interface RerollPrice {
  lines: UnitCostLine[];
  total: number;
}

export function explainRerollCost(state: GameState, playerId: number): RerollPrice {
  const player = playerById(state, playerId);
  const spec = RELIGION.reroll;
  const taken = Math.max(0, Math.floor(player?.statecraft.rerollsTaken ?? 0));
  const age = player ? highestAge(player.techsResearched) : 1;
  const multiplier = spec.ageMultiplier[age - 1] ?? 1;

  const base = Math.floor(spec.base);
  const aged = Math.floor(spec.base * multiplier);
  const full = Math.floor(spec.base * multiplier * spec.exponent ** taken);

  const lines: UnitCostLine[] = [{ source: 'A fresh hand', amount: base }];
  if (aged !== base) lines.push({ source: `Æra ${eraNumeral(age)}`, amount: aged - base });
  if (full !== aged) {
    lines.push({
      source: `${taken} reroll${taken === 1 ? '' : 's'} already taken`,
      amount: full - aged,
    });
  }
  return { lines, total: foldUnitCost(lines) };
}

/** What this empire's next reroll of an Order draft costs. The fold. */
export function nextRerollCost(state: GameState, playerId: number): number {
  return explainRerollCost(state, playerId).total;
}

/**
 * What asking **this belief hand** again would cost — the pantheon's or a
 * prophet's, the same reading.
 *
 * The first asking on a hand is free and prints as such (an empty list, a
 * total of nothing); each one after is the reroll sheet's base, the age's
 * multiplier, and the per-asking exponent raised to the askings this hand has
 * already had **less one** — the free one is not a step on the ladder. The
 * count is the offer's own (`BeliefOffer.rerolls`) and dies with the hand,
 * which is what "prophet re-rolls reset per roll" means; the Order draft's
 * lifetime count is not consulted and does not move.
 */
export function explainBeliefRerollCost(state: GameState, playerId: number): RerollPrice {
  const player = playerById(state, playerId);
  const offer = player?.pantheon.pending;
  const asked = Math.max(0, Math.floor(offer?.rerolls ?? 0));
  if (!player || !offer || asked === 0) return { lines: [], total: 0 };
  const spec = RELIGION.reroll;
  const age = highestAge(player.techsResearched);
  const multiplier = spec.ageMultiplier[age - 1] ?? 1;
  const base = Math.floor(spec.base);
  const aged = Math.floor(spec.base * multiplier);
  const full = Math.floor(spec.base * multiplier * spec.exponent ** (asked - 1));
  const lines: UnitCostLine[] = [{ source: 'Asking the gods again', amount: base }];
  if (aged !== base) lines.push({ source: `Æra ${eraNumeral(age)}`, amount: aged - base });
  if (full !== aged) {
    lines.push({
      source: `${asked - 1} paid asking${asked - 1 === 1 ? '' : 's'} on this hand`,
      amount: full - aged,
    });
  }
  return { lines, total: foldUnitCost(lines) };
}

/** What asking this belief hand again costs. The fold; nothing on the first asking. */
export function nextBeliefRerollCost(state: GameState, playerId: number): number {
  return explainBeliefRerollCost(state, playerId).total;
}

/**
 * Which draft a reroll would redeal — `'order'`, `'belief'`, or `null` when
 * there is nothing on the table.
 *
 * **One command, two hands**, and the precedence is the Order draft's because it
 * is the one that costs something: an empire holding both is being asked to
 * spend faith, and a verb that quietly rerolled the free hand instead would be
 * a button that did something other than what its own price said.
 */
export function rerollKindFor(player: Player): 'order' | 'belief' | null {
  if (player.statecraft.pendingOrder !== undefined) return 'order';
  if (player.pantheon.pending !== undefined) return 'belief';
  return null;
}

/**
 * Why this empire cannot reroll, or `null` when it can.
 *
 * `orderSkipError`'s sibling, and the whole of the rule the button greys itself
 * with — so a control a player can press is a command the reducer takes, and
 * the sentence they read on a refusal is this one.
 *
 * The clauses, in the order a player would meet them: is there a hand at all ·
 * has this empire the door open (`RerollConfig.ability` — Chronology's Long
 * Count, which lost the Magister's die in the same pass and gained this) · can
 * the bank pay. A **belief** hand — the ladder's or a prophet's — skips the
 * door: its first asking is free, and every asking after is priced on the
 * hand's own ladder (`explainBeliefRerollCost`), which the bank must cover.
 */
/**
 * **Is the reroll's door open to this empire at all?** — the question a surface
 * asks before it draws a button, as opposed to `rerollError`'s "may this be
 * pressed right now".
 *
 * The two are different decisions and the interface needs both: a bank that
 * cannot pay is drawn **greyed with the price on it**, because the rising cost
 * is the mechanism and a player has to see it coming; a technology nobody has
 * researched draws **nothing**, because a control for a rule the empire has not
 * met yet is a question it cannot answer. A caller that told them apart by
 * reading the refusal's words would break the day a sentence was reworded.
 */
export function rerollDoorOpen(state: GameState, playerId: number): boolean {
  return hasAbility(state, playerId, RELIGION.reroll.ability);
}

export function rerollError(state: GameState, playerId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const kind = rerollKindFor(player);
  if (kind === null) return `${player.name} has no draft waiting to be answered`;
  // **A belief hand — the ladder's or a prophet's — asks nothing the first
  // time and faith after that**, rising per asking on this hand and reset with
  // the next (the user, 2026-09-06, evening: "once you are shown your options,
  // you get one free re-roll … prophet re-rolls reset per roll, and are
  // entirely separate from order drafts"). No door: the pantheon opens in Æra
  // I, before the Long Count, and a free asking that waited on a later tech
  // would not be free. The Order draft's clauses follow, for the Order draft.
  if (kind === 'belief') {
    const price = nextBeliefRerollCost(state, playerId);
    if (price <= 0) return null;
    if (player.faithPool < price) {
      return `Asking again costs ${price} faith and ${player.name} has ${Math.floor(player.faithPool)}`;
    }
    return null;
  }
  if (!rerollDoorOpen(state, playerId)) {
    return 'Your calendars cannot yet call for a second reading';
  }
  const price = nextRerollCost(state, playerId);
  if (player.faithPool < price) {
    return `A second reading asks ${price} faith and ${player.name} has ${Math.floor(player.faithPool)}`;
  }
  return null;
}

/** What a reroll did, for the line the interface announces it in. */
export interface RerollOutcome {
  kind: 'order' | 'belief';
  /** Faith the bank gave up. Nought for a belief hand. */
  paid: number;
  /** Rerolls this empire has taken once this one is counted. */
  taken: number;
}

/**
 * Deals the hand again. Validates nothing — `rerollError` is the rule.
 *
 * **The hand is spent, and a new one is drawn in its place.** An offer is drawn
 * once from `state.rng` and spent by a command (CLAUDE.md); this is the third
 * way to spend one, beside a pick and a pass, and it obeys the doctrine for the
 * same reason they do — the draw happens inside the command, so a replay deals
 * the same cards to the same seat and nothing here is a function of when
 * somebody looked at a screen.
 *
 * Three things it deliberately does **not** touch:
 *
 *   · **`orderSkips`.** A reroll is not a pass: the pity a pass banks is the
 *     price of giving a hand up, and paying faith to see another one is the
 *     opposite bargain. The next hand is dealt with exactly the pity the last
 *     one was.
 *   · **the meter.** The culture that dealt the first hand stays spent, and the
 *     draft is still the same tier — a reroll buys cards, never a rung.
 *   · **a belief hand's price.** The free reroll raises no count and empties no
 *     bank, and it carries the ladder's quoted rung over to the new hand so an
 *     empire cannot reroll its way out of paying for the god it takes.
 *
 * The **tally** is `SlottedOrder.rerollsSeen`, raised on every card in a slot at
 * the moment the faith is paid — the shrine engine's count (the order pass, §9
 * question 3). On the slot record rather than on the player, so a card that was
 * benched while the rerolls happened counts none of them, which is the same
 * bargain `recordScalingOccasion` strikes for every other growing card.
 */
export function settleReroll(state: GameState, player: Player): RerollOutcome | null {
  const kind = rerollKindFor(player);
  if (kind === null) return null;

  if (kind === 'belief') {
    const old = player.pantheon.pending!;
    const religion = foundedReligion(state, player.id);
    const pool = old.pool;
    let offer: BeliefOffer;
    if (pool !== undefined) {
      if (!religion) return null;
      offer = drawPoolBeliefOffer(state, player, religion, pool);
    } else {
      offer = drawBeliefOffer(state, player);
    }
    // The offer's own facts travel with it: the rung the ladder quoted is still
    // the rung the pick pays. (`givenBack` travelled here too until the field
    // went with the last of the recast — see `BeliefOffer`.)
    if (old.rungCost !== undefined) offer.rungCost = old.rungCost;
    // **The hand's own count, and the hand's own price** — see `rerollError`.
    // The first asking on any belief hand is free; every one after costs the
    // belief ladder's price for that asking, read *before* the count moves.
    // Nothing here touches the Order draft's lifetime count or the chairs'
    // tally: a god asked again is not an Order asked again.
    const paid = nextBeliefRerollCost(state, player.id);
    player.faithPool = Math.max(0, player.faithPool - paid);
    offer.rerolls = (old.rerolls ?? 0) + 1;
    player.pantheon.pending = offer;
    return { kind, paid, taken: player.statecraft.rerollsTaken };
  }

  const sc = player.statecraft;
  const paid = nextRerollCost(state, player.id);
  player.faithPool = Math.max(0, player.faithPool - paid);
  sc.rerollsTaken += 1;
  for (const slot of sc.slots) {
    if (slot === null) continue;
    slot.rerollsSeen = (slot.rerollsSeen ?? 0) + 1;
  }
  sc.pendingOrder = drawOrderOffer(state, player);
  return { kind, paid, taken: sc.rerollsTaken };
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
 *
 * **The ladder's rung is paid here**, and only when the offer says so
 * (`BeliefOffer.rungCost`): the offer is the ladder's own record of what it
 * quoted, so an augur's hand, a prophet's and a founding's second all cost the
 * bank nothing and the one shape that charges is the one that opened on a
 * threshold. Floored at nothing, because faith is a bank the player may spend
 * between the deal and the pick — the End Turn blocker keeps that window inside
 * one turn, and an empire that emptied it meanwhile pays what it has rather
 * than going into debt no other pool in this game can go into.
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
  // The ladder's rung was paid and climbed when the hand was dealt
  // (`openFaithLadder`, since the evening of 2026-09-06); the pick charges
  // nothing. `rungCost` on the offer is the record of what was paid, not a bill.
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
    else religion.enhancer.push(id);
    refreshBeliefDerived(state, player);
    payBeliefDebt(state, player);
    return { id, name: beliefDef(id).name };
  }
  player.pantheon.beliefs.push(id);
  refreshBeliefDerived(state, player);
  // A God Named. It takes the `state` **only** for this — the belief itself is a
  // fact about the player alone — and that is a fair price for putting the
  // triumph in the mechanism rather than in the reducer, where an AI naming a
  // god would earn nothing.
  awardOccasion(state, player.id, 'beliefConsecrated');
  payBeliefDebt(state, player);
  return { id, name: beliefDef(id).name };
}

/**
 * Deals the next draft an empire is **owed**, if it is owed one — the founding's
 * second offer, and nothing else today (Entry LVIII).
 *
 * **The moment an offer opens is the moment it is drawn**, and this function is
 * that doctrine applied to a debt. A founding grants two belief drafts off one
 * prophet; both come out of the same bag, so dealing them together would put the
 * same belief on two tables and leave the second hand offering a belief the
 * religion had already taken. The second hand therefore opens the instant the
 * first is answered — which is a *command*, so the draw is as log-determined as
 * every other draft in the game and no seat can affect it by when it looks at a
 * screen.
 *
 * Three ways the debt is simply forgiven rather than carried, all of them the
 * same condition read through `drawableBeliefPool`: the religion is gone, the
 * ladder has no rung open, or the bag for that rung is empty. A debt that
 * outlived its ability to be paid would be a `pending` offer nobody could ever
 * deal and an End Turn blocker nobody could ever clear — `riteError`'s
 * empty-hand refusal, one system over.
 *
 * The key is deleted the moment the debt reaches zero, so an empire that has
 * answered everything serialises exactly like one that was never asked.
 */
function payBeliefDebt(state: GameState, player: Player): void {
  const owed = player.pantheon.owed ?? 0;
  if (owed <= 0) {
    delete player.pantheon.owed;
    return;
  }
  const religion = foundedReligion(state, player.id);
  const pool = religion === undefined ? null : drawableBeliefPool(state, player.id, religion);
  if (religion === undefined || pool === null) {
    delete player.pantheon.owed;
    return;
  }
  player.pantheon.pending = drawPoolBeliefOffer(state, player, religion, pool);
  if (owed > 1) player.pantheon.owed = owed - 1;
  else delete player.pantheon.owed;
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
//
// **A rite is a city's verb** (`docs/fewer-things.md` §3, ruled 2026-09-06).
//
// It was an augur's: call the piece for forty faith, walk it one to three
// hexes, aim it, spend it — four to six clicks for something worth under one
// percent of a voice on the user's turn-92 board. The failure was the errand
// rather than the figures, so the errand is gone. The empire is still what is
// *taught* a rite (`ABILITY_TECH`, the same five nodes the augur's rites sat
// on); the **town** is what performs one, out of the empire's faith bank, and
// keeps it for ten turns.
//
// Three rules, and each is one line below:
//
//   · **the tree is the only gate** (the user, 2026-09-06: "have the rites
//     unlock in the tech tree where they used to be") — a town performs any
//     rite its empire has been taught; no building opens the verb. The Chapel
//     is a *bonus* (`ritePays`: a rite performed in a town holding one pays
//     culture too), never a door — the door was a misreading of the ruling and
//     left the whole subsystem behind one uncommon wildcard card;
//   · **one rite at a time, per town** — the seal *is* the rite's ten turns
//     (`cityRite`), so there is no second clock to keep and nothing to tick;
//   · **the price is the faith ladder's rung for the age you stand in**
//     (`riteCost`), which is the ruled default: 40 in Æra I, rising a rung an
//     age.

/**
 * Every rite this empire has been taught, in table order.
 *
 * The withdrawn rows are out by construction (`LIVE_RITE_IDS`): Recasting the
 * Omens is the faith reroll's job now and The Preaching is the prophet's, and a
 * pool that still dealt them would be a pool disagreeing with the table.
 */
export function availableRites(state: GameState, playerId: number): RiteId[] {
  return LIVE_RITE_IDS.filter((id) => hasAbility(state, playerId, riteAbility(id)));
}

/**
 * **What a rite costs this empire**, in faith, right now.
 *
 * One reading — the button, the refusal and the charge are the same figure, the
 * discipline `explainPurchaseCost` keeps for a price tag. The age is the
 * empire's own highest technology (`highestAge`), which is the same band
 * `explainUnitCost` reads and the same one the reroll's multiplier reads, so a
 * realm that has just opened an era pays the era's price for everything at
 * once.
 */
export function riteCostFor(state: GameState, playerId: number): number {
  const player = playerById(state, playerId);
  if (!player) return riteCost(1);
  return riteCost(highestAge(player.techsResearched));
}

/**
 * **The rite this town is keeping**, or `null` — the whole of "one at a time".
 *
 * Derived off `City.timed`, never stored, and the reading is the ordinary
 * comparison every timed effect in this game is read by (`timedEffectIsLive`):
 * the seal *is* the blessing, so there is no `sealedUntil` beside it, nothing to
 * clear when it lapses and no phase that could clear it twice. A town whose rite
 * ran out this turn may perform another this turn, which is exactly what "ten
 * turns" means.
 *
 * It answers the rite's **id** rather than a boolean because every surface that
 * asks wants to say *which* — the panel prints its name and its turns left, and
 * the refusal names it too.
 *
 * A withdrawn row hanging on an old save is skipped: it is not a rite the town
 * may be said to be keeping, and refusing a fresh one on the strength of a
 * blessing the design has taken out would be a save punishing a player for the
 * turn it was made on.
 */
export function cityRite(state: GameState, city: City): RiteId | null {
  for (const entry of city.timed ?? []) {
    if (!timedEffectIsLive(state, entry)) continue;
    if (!isRiteId(entry.card)) continue;
    if (riteDef(entry.card).retired === true) continue;
    return entry.card;
  }
  return null;
}

/** How many turns are left of the rite this town is keeping, or `0`. */
export function cityRiteTurnsLeft(state: GameState, city: City): number {
  let left = 0;
  for (const entry of city.timed ?? []) {
    if (!timedEffectIsLive(state, entry)) continue;
    if (!isRiteId(entry.card)) continue;
    if (riteDef(entry.card).retired === true) continue;
    left = Math.max(left, entry.expiresTurn - state.turn);
  }
  return left;
}

/**
 * Why this city cannot perform this rite, or `null` when it can.
 *
 * **The** gate: the city panel greys its rite rows with exactly it, so an
 * offered row is a command the reducer takes and the sentence on a refusal is
 * the reducer's own. The refusals in the order a player would think of them: is
 * this my town, has it the door, do I know this rite, is the town already
 * keeping one, and can I pay for it.
 */
export function riteError(
  state: GameState,
  playerId: number,
  cityId: number,
  rite: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const city = state.cities.find((row) => row.id === cityId);
  if (!city) return `No city with id ${String(cityId)}`;
  if (city.ownerId !== playerId) return `${city.name} does not belong to player ${playerId}`;
  if (!isRiteId(rite)) return `There is no rite called "${String(rite)}"`;
  const def = riteDef(rite);
  if (def.retired === true) return `${def.name} is no longer performed`;
  if (!hasAbility(state, playerId, riteAbility(rite))) {
    return `${def.name} is not known to ${player.name}`;
  }
  const held = cityRite(state, city);
  if (held !== null) return `${city.name} is already keeping ${riteDef(held).name}`;
  const cost = riteCostFor(state, playerId);
  if (player.faithPool < cost) {
    return `${def.name} asks ${cost} faith and ${player.name} has ${Math.floor(player.faithPool)}`;
  }
  return null;
}

/** What performing a rite did, for the announcement and the chronicle. */
export interface RitePerformance {
  rite: RiteId;
  name: string;
  /** The town that is keeping it. */
  city: City;
  /** The faith actually taken out of the bank. */
  cost: number;
  /** The turn the blessing runs out — absolute, and nothing ticks it. */
  expiresTurn: number;
  /**
   * How many turns the blessing runs, amplifiers folded in.
   *
   * `expiresTurn` minus the turn it was stamped on, carried rather than left to
   * be subtracted by whoever announces it: the row's printed `duration` is *not*
   * the answer once Chichen Itza is standing, and a caller that quoted the row
   * would promise ten turns and deliver fifteen.
   */
  turns: number;
  /**
   * Culture this town's own shelves paid for the saying of it — the Chapel's
   * five, banked into the draft basket. Zero for a town whose door pays nothing.
   */
  chapelCulture: number;
  /**
   * Wonders a rider's hammers finished, in the order they completed.
   *
   * Empty on every rite that finished nothing, which is all of them until a card
   * rides the `rite` occasion — so a caller that has never heard of it is
   * unaffected.
   */
  wonders: WonderCompletion[];
}

/**
 * Performs one rite in one town. Validates nothing — `riteError` is the rule and
 * the command asks it first.
 *
 * The order is the arithmetic and each step is a rule:
 *
 *   1. **the faith is taken first**, so nothing downstream can read a bank that
 *      has not paid yet — a rider on the `rite` occasion that counted banked
 *      faith would otherwise count the price it is about to cost;
 *   2. **the blessing is stamped**, ten turns from *this* turn as an absolute
 *      expiry (`TimedEffect`), amplifiers folded in once at the stamp;
 *   3. **the riders fire**, on the `rite` occasion, so a card may pay for the
 *      *act* of performing one;
 *   4. **the town's own shelves pay** — the Chapel's culture, after the riders
 *      because it is neither a grant nor a law: a rider is the empire's and
 *      reaches every rite in the realm, and this is a fact about one town;
 *   5. **the town is re-seated** (`refreshCityDerived`, the rite's own entry in
 *      that helper's register):
 *      a lasting tile line and a lasting count were just hung on it, so what its
 *      citizens are worth has changed before the turn ends.
 *
 * There is deliberately **no instant half**. A rite used to pay a citizen, a
 * purse of beakers, a lump of coin — the windfall that made it worth the errand
 * — and the errand is gone. What is left is the season, which is the thing the
 * ruling is about.
 */
export function performRiteAt(
  state: GameState,
  player: Player,
  city: City,
  rite: RiteId,
): RitePerformance {
  const def = riteDef(rite);
  const cost = riteCostFor(state, player.id);
  player.faithPool = Math.max(0, player.faithPool - cost);

  const expiresTurn = stampRite(state, player.id, rite, def, city) ?? state.turn;
  const wonders = payRiteRiders(state, player, city);
  const chapelCulture = payRiteBuildings(state, player, city);
  refreshCityDerived(state, city);

  return {
    rite,
    name: def.name,
    city,
    cost,
    expiresTurn,
    turns: expiresTurn - state.turn,
    chapelCulture,
    wonders,
  };
}

/**
 * What the buildings of the town this rite was performed in pay their empire —
 * the Chapel's five culture.
 *
 * Paid through `settleCultureWindfall`, the one settlement culture reaches the
 * draft basket by, so a chapel's culture fills a pool and may open a draft
 * exactly as a rite's border culture once did. Read through `buildingEffects.ts`,
 * so this module has never heard of a chapel; `refreshCityDerived` is not owed
 * anything because culture is the realm's basket and no town's yield moved.
 *
 * Returns what was paid, for the report.
 */
function payRiteBuildings(state: GameState, player: Player, city: City): number {
  if (city.ownerId !== player.id) return 0;
  const paid = buildingRitePay(city);
  if (paid <= 0) return 0;
  player.culturePool += paid;
  settleCultureWindfall(state, player);
  return paid;
}

/**
 * Hangs a rite's lasting effects on a town, and answers when they run out.
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
 * performed would be faith spent on nothing.
 */
function stampRite(
  state: GameState,
  playerId: number,
  rite: RiteId,
  def: RiteDef,
  city: City,
): number | null {
  if (def.duration === undefined || def.effects.length === 0) return null;
  const percent = cardAmplifier(state, playerId, 'riteDuration');
  const turns = Math.floor((Math.max(1, Math.floor(def.duration)) * (100 + percent)) / 100);
  const expiresTurn = state.turn + Math.max(1, turns);
  const list = city.timed ?? [];
  for (const effect of def.effects) list.push({ card: rite, effect, expiresTurn });
  city.timed = list;
  return expiresTurn;
}

/**
 * Takes whatever rite a town is keeping off it — the one thing that ends a
 * blessing early, and the prophet's empire-wide word is the only caller.
 *
 * A **splice of the live entries that name a rite**, not a broom: an expired
 * entry is already inert and `pruneTimedEffects` owns the dead paper. Withdrawn
 * rows are left where they are for `cityRite`'s reason — they are not a rite the
 * town is keeping, so they are not a rite anything may take away.
 */
function clearCityRite(state: GameState, city: City): void {
  const timed = city.timed;
  if (!timed) return;
  const kept = timed.filter(
    (entry) =>
      !(
        timedEffectIsLive(state, entry) &&
        isRiteId(entry.card) &&
        riteDef(entry.card).retired !== true
      ),
  );
  if (kept.length === timed.length) return;
  if (kept.length === 0) delete city.timed;
  else city.timed = kept;
}

/**
 * The riders a *performed rite* pays out.
 *
 * There is no card in the table riding on this occasion today; the occasion
 * exists because a rite is unambiguously one of Entry XVIII's moments and a
 * vocabulary that could not name it would be a vocabulary with a hole in it.
 *
 * **Grants only, deliberately.** A `percent` rider scales an occasion's own
 * figure, and a rite has no figure at all any more — it is a season, not a
 * purse. The percentage arm is left unread on this occasion and said so here;
 * the heal arm is unread too, because a rite is no longer said over a piece.
 */
function payRiteRiders(state: GameState, player: Player, city: City): WonderCompletion[] {
  const wonders: WonderCompletion[] = [];
  const payout = windfallPayout(state, player.id, 'rite');
  if (payout.grants.length === 0) return wonders;
  const at = { col: city.col, row: city.row };
  for (const touched of payWindfallGrants(state, player, payout, at)) {
    // A rider's hammers may finish a wonder, and the news goes out the same way
    // every other completion does. See `RitePerformance.wonders`.
    const done = settleProductionWindfall(state, touched);
    if (done?.wonder) wonders.push(done.wonder);
    refreshCityDerived(state, touched);
  }
  return wonders;
}

/**
 * What a rite would do, in one sentence, for the panel's payoff preview.
 *
 * The row's own ratified text and its length, and nothing composed here: a rite
 * is a bag of ordinary `CardEffect`s now, so the *clauses* are `describeCard`'s
 * job on every surface that prints them and this is only the one-line summary
 * beside the button. `null` when the row says nothing at all, which no live row
 * does.
 */
export function ritePreview(rite: RiteId): string | null {
  const def = riteDef(rite);
  if (def.duration === undefined) return def.text ?? null;
  const turns = `lasts ${def.duration} turns`;
  return def.text ? `${def.text} · ${turns}` : turns;
}

// --- the prophet's empire-wide rite ------------------------------------------

/**
 * Why this prophet cannot say this rite over the whole realm, or `null`.
 *
 * The fourth of a prophet's acts (ruled 2026-09-06): **one of the five city
 * rites, cast on every city at once**, for one charge and one price.
 *
 * Three of the town gate's five clauses are deliberately **not** asked here:
 *
 *   · **no Chapel is needed.** The door is what lets a *town* say a rite on its
 *     own account; a prophet says it over the realm, and a realm with no chapels
 *     anywhere is exactly the realm this act is for;
 *   · **no town is refused for keeping one already.** The prophet's word takes
 *     over from whatever a town was keeping (`clearCityRite`) — an act that
 *     skipped half a realm because half a realm was busy would be an act nobody
 *     could plan;
 *   · **there is no target.** It lands everywhere the empire owns.
 *
 * What *is* asked: the prophet's own four questions (`prophetProblem`), that the
 * realm knows the rite, that it has a town to say it over at all, and the price
 * — **paid once**, not once a town.
 */
export function empireRiteError(
  state: GameState,
  playerId: number,
  unitId: number,
  rite: unknown,
): string | null {
  const problem = prophetProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  const player = playerById(state, playerId)!;
  if (!isRiteId(rite)) return `There is no rite called "${String(rite)}"`;
  const def = riteDef(rite);
  if (def.retired === true) return `${def.name} is no longer performed`;
  if (!hasAbility(state, playerId, riteAbility(rite))) {
    return `${def.name} is not known to ${player.name}`;
  }
  if (!state.cities.some((city) => city.ownerId === playerId)) {
    return `${player.name} has no city to bless`;
  }
  const cost = riteCostFor(state, playerId);
  if (player.faithPool < cost) {
    return `${def.name} asks ${cost} faith and ${player.name} has ${Math.floor(player.faithPool)}`;
  }
  return null;
}

/** What a prophet's empire-wide rite did, for the announcement. */
export interface EmpireRitePerformance {
  rite: RiteId;
  name: string;
  /** Every town it landed on, in `state.cities` order. */
  cities: City[];
  cost: number;
  expiresTurn: number;
  turns: number;
  /** True when the prophet was spent by this act's last charge. */
  prophetSpent: boolean;
}

/**
 * Says one rite over every town of the realm, and spends one of the prophet's
 * charges. Validates nothing — `empireRiteError` is the rule.
 *
 * **The price is paid once**, before anything is stamped, for `performRiteAt`'s
 * reason exactly. Then `state.cities` in array order — never a distance sort,
 * because an outcome may only depend on an order the state carries (hard rule 2)
 * — each town losing whatever it was keeping and taking this instead, and each
 * re-seated through the one helper every mid-turn yield mutation goes through.
 *
 * The **town's own shelves are not paid**: the Chapel's culture is what a town
 * gets for saying a rite itself, and a prophet saying one over the realm is not
 * forty chapels each holding a service. Stated rather than omitted.
 */
export function empireRiteAt(
  state: GameState,
  player: Player,
  unit: Unit,
  rite: RiteId,
): EmpireRitePerformance {
  const def = riteDef(rite);
  const cost = riteCostFor(state, player.id);
  player.faithPool = Math.max(0, player.faithPool - cost);

  const cities: City[] = [];
  let expiresTurn = state.turn;
  for (const city of state.cities) {
    if (city.ownerId !== player.id) continue;
    clearCityRite(state, city);
    const until = stampRite(state, player.id, rite, def, city);
    if (until !== null) expiresTurn = until;
    refreshCityDerived(state, city);
    cities.push(city);
  }
  const prophetSpent = spendCharge(state, unit);
  return {
    rite,
    name: def.name,
    cities,
    cost,
    expiresTurn,
    turns: expiresTurn - state.turn,
    prophetSpent,
  };
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
  // **The third holder** (2026-08-28): what the empire itself is carrying that
  // runs out — Crassus' bill. The same broom, because it is the same shape: an
  // expired effect is already inert, so deleting it changes no outcome.
  for (const player of state.players) sweep(state, player);
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
  // **The faith ladder**, run from here rather than from a phase of its own:
  // it is the same beat as the calendar's hand — an offer dealt from
  // `state.rng` at the end of a resolution, on a board that has already grown,
  // built and banked. First in the function because it is the older debt (the
  // bank crossed its threshold during *this* turn's `collectYields`), and the
  // two cannot tread on each other: they fill different fields and each refuses
  // while its own is occupied.
  openFaithLadder(state);
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
    enhancer: [],
    foundedTurn: state.turn,
  };
  state.religions.push(religion);
  // **The First Faith** — a bead occasion the Triumph table has no word for, so
  // it is hooked here rather than at `awardOccasion` (design ledger Entry VI).
  // In the *mechanism* beside the register write, for `awardFoundingTriumphs`'
  // reason: an AI that founds a faith earns what a player would.
  awardBeadOccasion(state, player.id, 'religionFounded');
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
  const held = new Set<BeliefId>([...religion.follower, ...religion.enhancer]);
  return poolBeliefs(pool).filter((id) => !held.has(id));
}

/** How many beliefs of this pool a religion may hold at once. Data (`pools`). */
export function poolSlots(pool: ReligionBeliefPool): number {
  const pools = RELIGION.pools;
  return Math.max(0, Math.floor(pool === 'follower' ? pools.followerSlots : pools.enhancerSlots));
}

/** How many this religion currently holds. */
export function poolHeld(religion: Religion, pool: ReligionBeliefPool): number {
  return (pool === 'follower' ? religion.follower : religion.enhancer).length;
}

/**
 * The next rung of a religion's belief **ladder**, or `null` when it is full —
 * the one rule the ruled caps of Entry LVIII are stated as.
 *
 * The ruling is "three follower beliefs, two enhancer beliefs, in total". The
 * shape it is built in is a *ladder* rather than two independent allowances:
 * every prophet spent on a belief fills the follower house first, and only when
 * that house is full does the same act start drawing enhancers. So there is one
 * verb (`gainBelief`), one question ("is a rung open"), and the whole of the
 * pacing lives in two numbers in `data/religion.json`.
 *
 * **This is an interpretation, and it is written here so it can be re-ruled in
 * one place.** The user ruled the caps and ruled that a founding drafts twice
 * and that a later prophet drafts a follower belief; what happens *after* the
 * third follower was left unstated. This is the reading: the same act keeps
 * going, one house along. The alternatives are a second verb for enhancers
 * (which is the verb this rework deleted) and an enhancer draft available from
 * the start (which would strand the Theology gate). Changing the reading means
 * changing this function and the two sentences `gainBeliefError` prints.
 *
 * Deliberately a **pure function of the religion**: the technology gate belongs
 * to the *draft*, not to the ladder, and keeping it out of here is what lets one
 * function answer for the offer, the refusal sentence and the screen alike.
 */
export function nextBeliefPool(religion: Religion): ReligionBeliefPool | null {
  if (poolHeld(religion, 'follower') < poolSlots('follower')) return 'follower';
  if (poolHeld(religion, 'enhancer') < poolSlots('enhancer')) return 'enhancer';
  return null;
}

/**
 * The next rung a draft could actually be **dealt from**, or `null`.
 *
 * `nextBeliefPool` plus the two things that are about the world rather than
 * about the religion: the enhancer house waits on Theology (`ENHANCER_TECH`,
 * unchanged by this rework), and a bag with nothing left in it deals no hand.
 *
 * Asked by everything that opens one of these drafts — the founding, its second
 * offer, and `gainBeliefAt` — so an offer that opens is an offer with cards on
 * it. `gainBeliefError` asks the same three questions separately, because a
 * refusal owes the player *which* of them it was.
 */
function drawableBeliefPool(
  state: GameState,
  playerId: number,
  religion: Religion,
): ReligionBeliefPool | null {
  const pool = nextBeliefPool(religion);
  if (pool === null) return null;
  if (pool === 'enhancer' && !hasTech(state, playerId, ENHANCER_TECH)) return null;
  if (religionBeliefPool(religion, pool).length === 0) return null;
  return pool;
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

/** Is this piece an apostle — a unit whose charges are the small preacher's? */
export function isApostle(unit: Unit): boolean {
  return unitDef(unit.type).proclaims === true;
}

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
  return agentProblem(state, playerId, unitId, isProphet, 'prophet');
}

/**
 * `prophetProblem`'s twin for the small preacher, and the same five questions.
 *
 * A second entry point rather than a widened first one, because the *sentence*
 * is the whole point of the function: a player who pressed a row on an apostle
 * and was told "a Worker is no prophet" would be reading about a piece that is
 * not on the screen.
 */
function apostleProblem(state: GameState, playerId: number, unitId: number): string | null {
  return agentProblem(state, playerId, unitId, isApostle, 'apostle');
}

/**
 * The five questions, asked once, with the piece's own word in the refusal.
 *
 * `is` is the roster **marker** (`prophesies`, `proclaims`), never a type name —
 * so a third preacher is a data row and this function is unchanged — and `noun`
 * is what a player calls the thing, because a refusal is a sentence.
 */
function agentProblem(
  state: GameState,
  playerId: number,
  unitId: number,
  is: (unit: Unit) => boolean,
  noun: string,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== playerId) return `Unit ${unit.id} does not belong to player ${playerId}`;
  if (!is(unit)) return `A ${unitDef(unit.type).name} is no ${noun}`;
  if ((unit.chargesLeft ?? 0) < 1) return `That prophet has nothing left to give`;
  if (unit.movesLeft <= 0) return `Unit ${unit.id} has no movement left`;
  if (player.pantheon.pending !== undefined) {
    return `${player.name} still has a belief waiting to be chosen`;
  }
  return null;
}

/**
 * The verbs a prophet's charges may be spent on, named as the interface names
 * them, so a row and a command cannot drift apart by a typo.
 *
 * **Two charges again, and the ladder is back — deliberately** (ruled
 * 2026-09-06). Entry LVIII gave the prophet one charge because a piece with
 * three made the first act nearly free and the last one agonising. Two is a
 * different shape and it is the one the ruling asks for: the two acts that
 * settle what a faith *is* — founding it on stones, drawing it another belief —
 * take the **whole** piece, and the two that merely spend its voice — a
 * proclamation, a rite said over the realm — take **one**. So the question the
 * price ladder poses is still asked once and answered once ("what is this
 * prophet for"), and a prophet kept for its voice gets to use it twice.
 *
 * Which is which is not a field: it is which routine the act ends with —
 * `spendProphet` for the whole piece, `spendCharge` for one — and that is
 * stated on both.
 */
export type ProphetVerbName =
  | 'plantHolySite'
  | 'gainBelief'
  | 'proclaim'
  // The fourth since the fewer-things pass, and the one that replaced the
  // redraft: **one of the five city rites, said over every town at once**. It is
  // the prophet's answer to a realm with no chapels and to a realm with forty.
  | 'empireRite';

/**
 * Spends the whole prophet on the act it just performed, and the piece leaves
 * the board with whatever it was still carrying.
 *
 * One function rather than a `removeUnit` line in each of the four verbs, for
 * the reason `prophetProblem` is one function: a rule about the piece stated
 * four times is a rule three of them will eventually disagree with. The charge
 * count is deliberately **not** zeroed on the way out — the unit is gone, and a
 * write to a removed piece is a fact nobody can read.
 */
function spendProphet(state: GameState, unit: Unit): void {
  removeUnit(state, unit.id);
}

/**
 * Spends one of an agent's charges, and lets go of a piece that emptied.
 *
 * Returns true when the piece left the board — which is the *exhaustion* rule,
 * not the consumption one: a one-charge prophet that proclaims is spent because
 * it has nothing left, and a two-charge prophet that proclaims walks away. The
 * day goes with the charge (`movesLeft = 0`): an act is the whole turn.
 *
 * **Both agents share it.** It was the prophet's alone and `performRiteAt` kept
 * a line-for-line copy of it, which is the shape this file spends its docblocks
 * refusing: two statements of "an act is the piece's whole turn" are two
 * statements one of them will eventually stop making. An augur's charge and a
 * prophet's are the same charge — three acts in a box — so they are spent by the
 * same four lines.
 */
function spendCharge(state: GameState, unit: Unit): boolean {
  const left = (unit.chargesLeft ?? 0) - 1;
  if (left <= 0) {
    removeUnit(state, unit.id);
    return true;
  }
  unit.chargesLeft = left;
  unit.movesLeft = 0;
  return false;
}

/**
 * Why this prophet cannot found a religion here, or `null` when it can.
 *
 * **Planting IS founding, and it is now the only planting there is** (Entry
 * LVIII). A prophet has one charge and one deed; raising a *second* holy site
 * was the deed that made the piece feel like a tool with a spare, and it is gone
 * — so this gate asks `foundReligionError` unconditionally rather than only when
 * the empire has founded nothing, and an empire that already has a faith is
 * refused in that function's own sentence.
 *
 * That puts all three founding refusals ("no gods", "already founded", "the
 * world is full") in front of a player who reaches for the ground, rather than
 * leaving them in a gate the command never asks.
 *
 * The holy sites an empire ends up with are therefore exactly one, plus whatever
 * it takes off somebody else — which is what makes the stones worth defending.
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
  const cannot = foundReligionError(state, playerId);
  if (cannot !== null) return cannot;
  const unit = unitById(state, unitId)!;
  const tile = getTileAt(state.map, unit.col, unit.row);
  if (!tile) return `Unit ${unit.id} is not on the map`;
  // The one case worth a sentence of its own: a bought prophet spawns on the
  // city centre, and `improvementErrorAt`'s refusal there — "Uruk stands on
  // (x, y)" — is a fact about the tile, not the answer a player standing on
  // the fix wants (user, 2026-08-28: "I have my first prophet and I can't
  // create a religion with it"). Named before the ground gate is asked, plain
  // voice, no digits — everything else still gets the reducer's own sentence.
  if (cityAt(state, tile.col, tile.row)) {
    return 'Move the prophet off the city centre to plant a holy site';
  }
  return improvementErrorAt(state, unit.ownerId, tile, HOLY_SITE);
}

/** The improvement a prophet plants, read off the table's own inverse. */
const HOLY_SITE: ImprovementId = workForFamily('prophet') ?? 'holySite';

/** What founding a religion did, for the announcement. */
export interface HolySitePlanting {
  religion: Religion;
  /**
   * Always true since Entry LVIII, and kept rather than deleted because every
   * surface that reads this report is *about* the founding — the toast, the
   * chronicle line, the world's watcher. A field that can only say one thing is
   * cheaper than four callers each re-deriving that a planting founds.
   */
  founded: boolean;
  /** The first of the founding's two drafts, or `null` if none could be dealt. */
  offer: BeliefOffer | null;
  col: number;
  row: number;
  /** True when the prophet was spent — always, now that it carries one charge. */
  prophetSpent: boolean;
}

/**
 * Founds a religion, plants its stones, and opens the founding's **two** drafts.
 * Validates nothing — `plantHolySiteError` is the rule.
 *
 * The order is the arithmetic and each step is a rule:
 *
 *   1. **the religion first**, because the site is the religion's anchor and a
 *      site standing for nobody's faith would press for nothing;
 *   2. **the stones**, through `tile.improvement` and `refreshTileDerived` — the
 *      same two lines `buildImprovementAt` and `greatPersonWorkAt` write, so a
 *      holy site pays its faith into the panel this instant;
 *   3. **the first draft**, dealt *after* the stones for `consecrateAt`'s reason
 *      exactly — the draw advances `state.rng`, and anything that could throw
 *      between the two would leave a prophet able to deal a second hand from a
 *      moved generator;
 *   4. **the debt for the second**, which is a *number* rather than a second
 *      dealt hand (user's ruling: "founding drafts a founder belief and one
 *      follower belief"). Both come out of the same bag at this stage of the
 *      ladder, so two hands dealt now would put the same belief on both tables;
 *      the second opens the instant the first is answered (`payBeliefDebt`).
 *      Owed only when a first was actually dealt — an empire that could not be
 *      offered one belief is not owed two.
 *   5. **the prophet**, whole. One charge, one deed (Entry LVIII), so there is
 *      no day left to spend because there is no prophet left to spend it.
 *
 * **The stones are the seat of the faith.** The `??=` is kept although a prophet
 * can no longer raise a second site: what `religionFounder` reads is *this* hex,
 * and the guard says out loud that nothing later moves it — a captured holy city
 * changes who a faith pays, never where its seat is.
 */
export function plantHolySiteAt(
  state: GameState,
  player: Player,
  unit: Unit,
  tile: Tile,
): HolySitePlanting {
  const religion = foundReligion(state, player);

  tile.improvement = HOLY_SITE;
  refreshTileDerived(state, tile);
  religion.holySite ??= { col: tile.col, row: tile.row };

  let offer: BeliefOffer | null = null;
  const pool = drawableBeliefPool(state, player.id, religion);
  if (pool !== null) {
    offer = drawPoolBeliefOffer(state, player, religion, pool);
    player.pantheon.pending = offer;
    player.pantheon.owed = 1;
  }

  spendProphet(state, unit);
  return { religion, founded: true, offer, col: tile.col, row: tile.row, prophetSpent: true };
}

/**
 * Why this prophet cannot draw another belief for its faith, or `null` when it
 * can — **the one belief-gaining verb** (Entry LVIII).
 *
 * It replaced `enhanceReligion`, and the deletion is the point: there were two
 * verbs for "give this religion another belief", one per house, and a player had
 * to know which house was open before pressing either. There is one now, and the
 * ladder decides which bag it draws from (`nextBeliefPool`).
 *
 * The refusals in the order a player would think of them, and each names *which*
 * rung it failed on, because "your faith is full" and "you need Theology" are
 * entirely different pieces of news for somebody holding an expensive prophet:
 *
 *   · is this my prophet, and has it a deed left (`prophetProblem`);
 *   · have I a religion at all;
 *   · is any rung open — the ladder, and nothing about the world;
 *   · if the rung is the enhancer house, do I hold Theology. **Unchanged by this
 *     rework**: the enhancer pool opens at `ENHANCER_TECH` exactly as it did,
 *     asked of the tree rather than of a constant, so a retuned tree moves it;
 *   · is the bag for that rung empty.
 */
export function gainBeliefError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  const problem = prophetProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  const religion = foundedReligion(state, playerId);
  if (!religion) return 'You have founded no religion to teach';
  const pool = nextBeliefPool(religion);
  if (pool === null) return `${religion.name} has all the beliefs it will hold`;
  if (pool === 'enhancer' && !hasTech(state, playerId, ENHANCER_TECH)) {
    return `Deepening a religion needs ${techDef(ENHANCER_TECH).name}`;
  }
  if (religionBeliefPool(religion, pool).length === 0) {
    return pool === 'follower'
      ? 'There are no beliefs left to choose'
      : 'There are no enhancements left to choose';
  }
  return null;
}

/** The technology that opens the enhancer pool. Named once, read twice. */
const ENHANCER_TECH: TechId = 'theology';

/**
 * Spends the whole prophet on one belief draft. Validates nothing —
 * `gainBeliefAt`'s gate is `gainBeliefError`.
 *
 * `plantHolySiteAt`'s closing steps in the same order and for the same reasons —
 * the draw, then the piece. **Which house it draws from is the ladder's answer**
 * and never the caller's: one verb, one rung, so the interface has one row and
 * `commands.ts` has one arm.
 */
export function gainBeliefAt(state: GameState, player: Player, unit: Unit): BeliefOffer {
  const religion = foundedReligion(state, player.id)!;
  const pool = drawableBeliefPool(state, player.id, religion)!;
  const offer = drawPoolBeliefOffer(state, player, religion, pool);
  player.pantheon.pending = offer;
  spendProphet(state, unit);
  return offer;
}

/**
 * Why this piece cannot proclaim here, or `null` when it can.
 *
 * The faith bomb, and the ruling that shaped it (user, 2026-08-27): it **only
 * converts**. There is no site, no lasting anchor and nothing to defend — which
 * is precisely what makes the choice between this charge and a holy site a real
 * one. A bomb converts; a site keeps.
 *
 * **Two pieces make this noise** since the apostle landed (2026-09-06), and one
 * gate serves both because it is one act: the apostle's is half the weight over
 * a little more than half the ground (`bombFigures` reads the piece), and every
 * refusal above the figures is identical. Asked of the two roster **markers**
 * rather than of two type names, so a third preacher is a data row.
 */
export function proclaimError(state: GameState, playerId: number, unitId: number): string | null {
  const unit = unitById(state, unitId);
  const problem =
    unit !== undefined && isApostle(unit)
      ? apostleProblem(state, playerId, unitId)
      : prophetProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  if (foundedReligion(state, playerId) === undefined) {
    return 'You have founded no religion to proclaim';
  }
  return null;
}

/** How far a proclamation reaches and what it presses. See `bombFigures`. */
export interface BombFigures {
  range: number;
  lump: number;
}

/**
 * The reach and the weight of one empire's faith bomb.
 *
 * `rules.religion`'s two numbers, **shifted by the enhancer pool** through the
 * one reader (`cardPressureRule`), asked in one place so the figure the preview
 * promises is the figure the command banks — `explainDiscoveryOption`'s rule,
 * and `stampRite`'s: a promise on a button is made by the function that keeps
 * it.
 */
function bombFigures(state: GameState, playerId: number, unit?: Unit): BombFigures {
  const rules = RULES.religion;
  const full: BombFigures = {
    range: Math.max(0, rules.bombRange + cardPressureRule(state, playerId, 'bombRange')),
    lump: Math.max(0, rules.bombLump + cardPressureRule(state, playerId, 'bombLump')),
  };
  if (unit === undefined || !isApostle(unit)) return full;
  // **The apostle's share**, taken after the riders rather than before them, so
  // an empire whose cards have made its prophets louder has made its apostles
  // louder in the same proportion — which is the ruled sentence ("half a
  // prophet's strength") read as a rule rather than as a number. The reach is
  // its own figure, because six hexes is not half of ten.
  const apostle = RELIGION.apostle;
  return {
    range: Math.max(0, Math.floor(apostle.proclaimRange)),
    lump: Math.max(0, Math.floor((full.lump * Math.max(0, apostle.proclaimPercent)) / 100)),
  };
}

/**
 * Proclaims. Validates nothing — `proclaimError` is the rule.
 *
 * **The bomb is a lump, and it lands now** (user, 2026-08-28): "an immediate
 * burst of pressure applied instantly, following the regular conversion rules,
 * just as a lump sum". So there is nothing left standing on the board when this
 * returns — no pulse, no anchor, no decay to wait out. `pressLump` is the whole
 * of it and the augur's Preaching calls the same function out of a smaller
 * purse, which is what keeps the two acts one rule.
 *
 * That instantaneity is the *point* of the ruling and not an optimisation: a
 * player who spends a prophet's whole charge beside a rival's town sees what it
 * bought before the turn ends, and a temple standing in that town is the one
 * number that decides whether it was enough.
 */
export function proclaimAt(state: GameState, player: Player, unit: Unit): ProclamationReport {
  const religion = foundedReligion(state, player.id)!;
  const { range, lump } = bombFigures(state, player.id, unit);
  const report = pressLump(state, religion, { col: unit.col, row: unit.row }, range, lump);
  spendCharge(state, unit);
  return report;
}

/** One town a proclamation would reach, and what it would do there. */
export interface ProclaimPreviewCity {
  cityId: number;
  population: number;
  /** Citizens the lump would turn, after this town's temple has had its say. */
  wouldConvert: number;
  /** True when those converts would leave this town following the faith. */
  wouldFollow: boolean;
}

/** What a proclamation would do, for the prophet's row. See `proclaimPreview`. */
export interface ProclaimPreview {
  range: number;
  lump: number;
  cities: ProclaimPreviewCity[];
}

/**
 * What this prophet's proclamation would do, town by town — the facts the
 * interface's sentence is made of ("Converts 3 cities within 10 hexes — Uruk,
 * Nippur, Ur").
 *
 * The *sentence* is the interface's and the *facts* are the simulation's, which
 * is `ritePreview`'s bargain read one verb over. Every figure comes from the
 * function that will pay it: the reach and the weight from `bombFigures`, the
 * town's share from `templeShare`, the converts from the same `perConvert`
 * division `pressLump` does — including the pressure the town has **already
 * banked**, because a bomb landing on a town nine faith from its next convert
 * buys one more citizen than the arithmetic on the lump alone would say.
 *
 * `null` when there is no prophet or no faith to proclaim; the panel prints
 * `proclaimError`'s blocker instead.
 *
 * It is a *forecast* and says so: the towns are the ones in range at the moment
 * it is asked, and a prophet that walks a hex before speaking gets a different
 * list.
 */
export function proclaimPreview(state: GameState, unitId: number): ProclaimPreview | null {
  const unit = unitById(state, unitId);
  if (!unit) return null;
  const religion = foundedReligion(state, unit.ownerId);
  if (!religion) return null;
  const { range, lump } = bombFigures(state, unit.ownerId, unit);
  const perConvert = Math.max(1, Math.floor(RULES.religion.pressurePerConvert));
  const cities: ProclaimPreviewCity[] = [];
  for (const { city, pressed } of lumpTargets(state, religion, unit, range, lump)) {
    const banked = (city.pressureBank?.[religion.id] ?? 0) + pressed;
    // What the converter would actually manage: the division, capped by the
    // citizens there are left to turn onto this faith. A town wholly converted
    // already has none, which is what stops the row promising six.
    const turnable = city.population - followerCount(city, religion.id);
    const wouldConvert = Math.max(0, Math.min(Math.floor(banked / perConvert), turnable));
    const majority = Math.floor(city.population / 2) + 1;
    cities.push({
      cityId: city.id,
      population: city.population,
      wouldConvert,
      wouldFollow: followerCount(city, religion.id) + wouldConvert >= majority,
    });
  }
  return { range, lump, cities };
}

// --- the apostle -------------------------------------------------------------
//
// **The small preacher** (`docs/tech-gifts.md` §7, ruled 2026-09-06). The
// prophet's price put a travelling agent out of reach for most of a game, so
// Theology opens a cheaper one: two charges, four movement, and three acts each
// worth one charge — a proclamation at half a prophet's weight, a laying-on of
// hands, and the relic it may leave in a town that has topped out a cathedral.
//
// It founds nothing, plants no stones and draws no belief. That is the whole of
// what keeps it from being a cheap prophet: an empire's *identity* still costs
// the expensive piece, and this one only carries it about.

/**
 * Why this apostle cannot mend the pieces beside it, or `null` when it can.
 *
 * **No clause about what is standing there**, deliberately, and it is
 * `purgeError`'s stated rule one piece over: an apostle spent on an empty ring
 * is a wasted charge exactly as a proclamation that reached nothing is, and a
 * refusal there would be the interface playing the turn for the player. The
 * preview says what it would touch.
 */
export function healAdjacentError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  return apostleProblem(state, playerId, unitId);
}

/** One piece an apostle's hands mended. See `HealingReport`. */
export interface HealedUnit {
  unitId: number;
  /** Hit points actually restored — zero for a piece that was already whole. */
  healed: number;
}

/** What a laying-on of hands did, for the announcement. */
export interface HealingReport {
  /** What each piece was mended, in `state.units` order. */
  units: HealedUnit[];
  /** True when the apostle was spent by this act's last charge. */
  apostleSpent: boolean;
}

/**
 * Mends every friendly piece on this hex and the six touching it, and spends one
 * of the apostle's charges. Validates nothing — `healAdjacentError` is the rule.
 *
 * Three rules, each a decision:
 *
 *   · **the ring of six plus the centre**, which is `keepHeal`'s reach and the
 *     reach every other "beside this piece" clause in the game already takes;
 *   · **its own seat only.** There are no allies, so "friendly" has one reading;
 *   · **`state.units` in array order**, never a distance sort, because an
 *     outcome may only depend on an order the state carries (hard rule 2).
 *
 * The cap is `unitMaxHp` — the **piece's** maximum, not the roster's, so a
 * stamped legion mends to the points its law gave it. It is the same cap the
 * rested heal keeps, which is what stops two mendings in one turn walking a
 * piece past its own ceiling.
 *
 * It mends **the apostle too**, which is useless and legal — a rule forbidding
 * it would be a rule nobody could discover (`riteUnitTarget`'s old argument,
 * kept).
 */
export function healAdjacentAt(state: GameState, player: Player, unit: Unit): HealingReport {
  const amount = Math.max(0, Math.floor(RELIGION.apostle.heal));
  const units: HealedUnit[] = [];
  const from = getTileAt(state.map, unit.col, unit.row);
  if (from) {
    const eye = tileHex(from);
    for (const other of state.units) {
      if (other.ownerId !== player.id) continue;
      const tile = getTileAt(state.map, other.col, other.row);
      if (!tile) continue;
      if (wrappedDistance(state.map, eye, tileHex(tile)) > 1) continue;
      const maxHp = unitMaxHp(other);
      const healed = Math.max(0, Math.min(maxHp, other.hp + amount) - other.hp);
      other.hp += healed;
      units.push({ unitId: other.id, healed });
    }
  }
  const apostleSpent = spendCharge(state, unit);
  return { units, apostleSpent };
}

/**
 * What a laying-on of hands would mend, piece by piece — the facts the
 * interface's sentence is made of.
 *
 * `proclaimPreview`'s bargain one act over: the *sentence* is the interface's
 * and the *facts* are the simulation's, and every figure comes from the function
 * that will pay it. A forecast, and it says so — an apostle that walks a hex
 * before laying on hands gets a different list.
 */
export function healAdjacentPreview(state: GameState, unitId: number): HealingReport | null {
  const unit = unitById(state, unitId);
  if (!unit || !isApostle(unit)) return null;
  const amount = Math.max(0, Math.floor(RELIGION.apostle.heal));
  const units: HealedUnit[] = [];
  const from = getTileAt(state.map, unit.col, unit.row);
  if (!from) return { units, apostleSpent: false };
  const eye = tileHex(from);
  for (const other of state.units) {
    if (other.ownerId !== unit.ownerId) continue;
    const tile = getTileAt(state.map, other.col, other.row);
    if (!tile) continue;
    if (wrappedDistance(state.map, eye, tileHex(tile)) > 1) continue;
    const maxHp = unitMaxHp(other);
    units.push({ unitId: other.id, healed: Math.max(0, Math.min(maxHp, other.hp + amount) - other.hp) });
  }
  return { units, apostleSpent: (unit.chargesLeft ?? 0) <= 1 };
}

/**
 * The row an apostle leaves behind, read off the table's own marker.
 *
 * `HOLY_SITE`'s trick one table over: the *rule* is "the placed row", the data
 * says which row that is (`PLACED_BUILDING`, `buildingEffects.ts`), and nothing
 * in this module compares a building id against a name.
 */
const RELIC: BuildingId | undefined = PLACED_BUILDING;

/**
 * Why this apostle cannot leave a relic here, or `null` when it can.
 *
 * The refusals in the order a player would think of them: is this my apostle and
 * has it a charge (`apostleProblem`), is it standing in one of my towns, has
 * that town finished the shelf a relic is kept in, and is there one there
 * already.
 *
 * **"One per cathedral" is read off the board**, never counted: a town has one
 * cathedral at most, so "this town has a cathedral and no relic" *is* the rule,
 * and there is no register to keep and nothing to fix up when a town changes
 * hands. The cathedral is asked of the marker every consecration already reads
 * (`BuildingDef.consecrated`) rather than of a name, so the day a second row
 * keeps relics it says so in JSON.
 */
export function placeRelicError(
  state: GameState,
  playerId: number,
  unitId: number,
): string | null {
  const problem = apostleProblem(state, playerId, unitId);
  if (problem !== null) return problem;
  if (RELIC === undefined) return 'There is no relic to leave';
  const unit = unitById(state, unitId)!;
  const city = cityAt(state, unit.col, unit.row);
  if (!city || city.ownerId !== playerId) {
    return 'A relic is left in one of your own cities';
  }
  if (!cityKeepsRelics(city)) return `${city.name} has no cathedral to keep a relic in`;
  if (city.buildings.includes(RELIC)) return `${city.name} already keeps a relic`;
  return null;
}

/** What leaving a relic did, for the announcement. */
export interface RelicPlacement {
  city: City;
  building: BuildingId;
  /** What it pays its town every turn, off the row that will pay it. */
  faith: number;
  /** True when the apostle was spent by this act's last charge. */
  apostleSpent: boolean;
}

/**
 * Leaves a relic in this town, and spends one of the apostle's charges.
 * Validates nothing — `placeRelicError` is the rule.
 *
 * The shelf is written straight into `City.buildings`, which is the one place a
 * town's stones are recorded, so what a relic pays is read by the ordinary fold
 * that reads a granary's — **and follows the stones**: a conqueror who takes the
 * town takes the relic and the faith with it, with no bookkeeping at all. There
 * is no completion, no claim and no grant, because nothing was built: `placed`
 * is exactly the marker that says so (`BuildingDef.placed`).
 *
 * `refreshCityDerived` is owed and paid — the town's faith moved mid-turn, and
 * this act joins that helper's register beside the rite's own entry (the note
 * on the helper is `cities.ts`'s to keep; the debt is written in
 * `docs/fewer-things-plan.md`).
 */
export function placeRelicAt(state: GameState, _player: Player, unit: Unit): RelicPlacement {
  const city = cityAt(state, unit.col, unit.row)!;
  const building = RELIC!;
  city.buildings.push(building);
  refreshCityDerived(state, city);
  const apostleSpent = spendCharge(state, unit);
  return {
    city,
    building,
    faith: Math.max(0, Math.floor(RELIGION.relicFaith)),
    apostleSpent,
  };
}

// --- the inquisitor ---------------------------------------------------------

/** Is this piece an inquisitor — a unit whose one charge is the Purge? */
export function isInquisitor(unit: Unit): boolean {
  return unitDef(unit.type).purges === true;
}

/**
 * The faith an empire's inquisitor **serves**, and therefore the one faith a
 * Purge spares — or `null` when the realm believes nothing.
 *
 * Two readings, in precedence, and the order is the ruling: the religion this
 * empire *founded*, and failing that the religion most of its towns *follow*
 * (`majorityReligion`). A realm that founded nothing and converted wholesale to
 * a neighbour's faith still has something to defend, and an inquisitor that
 * could not tell which faith that was would purge its own people.
 *
 * Derived every time it is asked, never stored — `majorityReligion`'s own rule,
 * for its reason: what a realm believes is a fact about the map this turn.
 */
export function servedReligion(state: GameState, playerId: number): ReligionId | null {
  const founded = foundedReligion(state, playerId);
  if (founded !== undefined) return founded.id;
  return majorityReligion(state, playerId);
}

/**
 * Why this inquisitor cannot purge here, or `null` when it can.
 *
 * **The** gate — the `purge` command refuses with this sentence and the panel
 * greys the row with exactly it. The refusals in the order a player would think
 * of them: is this my piece, is it an inquisitor, has it a charge left, has it a
 * day left, and is there a faith of mine to purge *for*.
 *
 * There is deliberately **no clause about what is in range**. A purge that
 * reached nothing is a wasted inquisitor, exactly as a proclamation that reached
 * nothing is a wasted prophet, and a refusal there would be the interface
 * playing the turn for the player. The preview says what it would touch.
 */
export function purgeError(state: GameState, playerId: number, unitId: number): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const unit = unitById(state, unitId);
  if (!unit) return `No unit with id ${String(unitId)}`;
  if (unit.ownerId !== playerId) return `Unit ${unit.id} does not belong to player ${playerId}`;
  if (!isInquisitor(unit)) return `A ${unitDef(unit.type).name} cannot purge`;
  if ((unit.chargesLeft ?? 0) < 1) return `That inquisitor has nothing left to give`;
  if (unit.movesLeft <= 0) return `Unit ${unit.id} has no movement left`;
  if (servedReligion(state, playerId) === null) {
    return `${player.name} follows no faith to purge for`;
  }
  return null;
}

/** One town a purge landed on. See `PurgeReport`. */
export interface PurgeStrip {
  cityId: number;
  /** Citizens who stopped following anything at all here. Zero is ordinary. */
  unfollowed: number;
}

/**
 * What a purge did, for the announcement — `CommandResult.purged`.
 *
 * `ProclamationReport`'s twin and it is carried out of the reducer for that
 * type's reason exactly: a strip is a **difference** that stops existing the
 * instant the command returns. By then the banks are empty and the
 * congregations are smaller, and a diff of two states could not tell an
 * inquisitor's work from a rival's bad turn.
 *
 * Every town in range is listed, including the ones that lost nobody, because
 * "Nippur held" is exactly the news a player who spent an inquisitor needs.
 */
export interface PurgeReport {
  /** The faith spared — the one this empire serves. See `servedReligion`. */
  religionId: ReligionId;
  cities: PurgeStrip[];
}

/**
 * The reach and the weight of a purge. `bombFigures`' twin, out of
 * `rules.religion`'s own pair.
 *
 * **No card rider reads these yet**, and that is a statement rather than an
 * omission: `cardPressureRule` names `bombRange` and `bombLump` because cards in
 * the table bend them, and a `PressureRuleId` nothing supplies would be a dial
 * with nothing on the other end. The day an Order sharpens the Holy Office, the
 * two ids join that union and this function grows the same `rule()` line
 * `bombFigures` has.
 */
function purgeFigures(): BombFigures {
  const rules = RULES.religion;
  return {
    range: Math.max(0, Math.floor(rules.purgeRange)),
    lump: Math.max(0, Math.floor(rules.purgeLump)),
  };
}

/**
 * Strips every **rival** faith off every town within reach, and spends the
 * inquisitor. Validates nothing — `purgeError` is the rule.
 *
 * The proclamation read backwards, and deliberately built out of the same three
 * parts so the two can never disagree about what banked faith is worth: the same
 * bank (`City.pressureBank`), the same convert price
 * (`religion.pressurePerConvert`), and one shared piece of bookkeeping
 * (`writeBank`). Where a bomb banks *for* one faith, this takes *from* every
 * other.
 *
 * Three rules, each a decision:
 *
 *   · **Every town in range, not only your own.** The bomb's rule, mirrored: an
 *     inquisitor walked to a rival's border town and emptied of every faith is
 *     the aggressive half of the Holy Office, and the piece that only ever
 *     tidied its own realm would be a chore rather than a march.
 *   · **A temple does not resist it.** `templeShare` is the defence against
 *     *pressure arriving*; a purge takes away what is already banked and turns
 *     back people who already believe. The building that answers an inquisitor
 *     is the one your own inquisitor is standing in.
 *   · **`state.cities` in array order**, never a distance sort, because an
 *     outcome may only depend on an order the state carries (hard rule 2).
 *
 * The town is re-seated through `refreshCityDerived` wherever a citizen actually
 * turned, for `pressLump`'s reason exactly — follower beliefs apply city-locally,
 * so a congregation that shrank at noon changes the panel before the turn ends.
 * Register entry 16's sibling, and it is asked of foreign towns too, which is
 * fine because the helper is idempotent and derived.
 */
export function purgeAt(state: GameState, player: Player, unit: Unit): PurgeReport {
  const spared = servedReligion(state, player.id)!;
  const { range, lump } = purgeFigures();
  const perConvert = Math.max(1, Math.floor(RULES.religion.pressurePerConvert));
  const cities: PurgeStrip[] = [];
  const here = getTileAt(state.map, unit.col, unit.row);
  if (here) {
    const eye = tileHex(here);
    for (const city of state.cities) {
      const tile = getTileAt(state.map, city.col, city.row);
      if (!tile) continue;
      if (wrappedDistance(state.map, eye, tileHex(tile)) > range) continue;
      let unfollowed = 0;
      for (const religion of state.religions) {
        if (religion.id === spared) continue;
        unfollowed += purgePressure(city, religion.id, lump, perConvert);
      }
      if (unfollowed > 0) refreshCityDerived(state, city);
      cities.push({ cityId: city.id, unfollowed });
    }
  }
  // One charge, so the piece goes with the act — the routine all three agents
  // share (`spendCharge`), rather than a fourth statement of the same rule.
  spendCharge(state, unit);
  return { religionId: spared, cities };
}

/**
 * What this inquisitor's purge would do, town by town — the facts the
 * interface's sentence is made of.
 *
 * `proclaimPreview`'s bargain: the *sentence* is the interface's and the *facts*
 * are the simulation's, and every figure comes from the function that will pay
 * it. It is a forecast and says so — an inquisitor that walks a hex before
 * speaking gets a different list.
 *
 * `null` when there is no inquisitor or no faith to purge for; the panel prints
 * `purgeError`'s blocker instead.
 */
export interface PurgePreview {
  range: number;
  lump: number;
  /** Towns in reach, each with what it would lose. `PurgeStrip`'s shape. */
  cities: PurgeStrip[];
}

export function purgePreview(state: GameState, unitId: number): PurgePreview | null {
  const unit = unitById(state, unitId);
  if (!unit) return null;
  const spared = servedReligion(state, unit.ownerId);
  if (spared === null) return null;
  const { range, lump } = purgeFigures();
  const perConvert = Math.max(1, Math.floor(RULES.religion.pressurePerConvert));
  const here = getTileAt(state.map, unit.col, unit.row);
  const cities: PurgeStrip[] = [];
  if (!here) return { range, lump, cities };
  const eye = tileHex(here);
  for (const city of state.cities) {
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile) continue;
    if (wrappedDistance(state.map, eye, tileHex(tile)) > range) continue;
    let unfollowed = 0;
    for (const religion of state.religions) {
      if (religion.id === spared) continue;
      // The same arithmetic `purgePressure` performs, read rather than done: the
      // deficit past the bank, divided by the convert price, capped by the
      // citizens there actually are to take off that congregation.
      const deficit = lump - (city.pressureBank?.[religion.id] ?? 0);
      if (deficit <= 0) continue;
      unfollowed += Math.min(
        Math.floor(deficit / perConvert),
        followerCount(city, religion.id),
      );
    }
    cities.push({ cityId: city.id, unfollowed });
  }
  return { range, lump, cities };
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
  const hasTemple = city.buildings.includes(TEMPLE);
  // One fill for the whole town rather than one per religion: which towns this
  // one is joined to by road is a fact about the board, not about a faith.
  const byRoad = roadReach(state, city);

  for (const religion of state.religions) {
    // **The tide is bent by whoever holds the seat**, not by whoever first
    // raised it (the 2026-08-28 ruling): the enhancer pool pays the holy city's
    // owner, so the pressure rules it carries — and the wonders that press —
    // are asked of `religionFounder`. A conqueror who takes a holy city takes
    // the reach of its faith with the stones. The capital line below follows
    // for the same reason: the seat of a faith is where its seat *is*.
    const founder = religionFounder(state, religion);
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

    // There is no proclamation line, and the absence is the 2026-08-28 ruling
    // rather than an omission: a faith bomb is a **lump** banked at the moment
    // it is made (`pressLump`), not a source that presses every turn until it
    // fades. The tide is the standing world; a bomb is an event.

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
    //
    // Through `templeShare`, which is the same arithmetic a proclamation's lump
    // is put through: a temple that turned away a slow tide but not a bomb would
    // be the one defensive building in the game with a hole in it.
    if (!hasTemple) continue;
    let subtotal = 0;
    for (let i = before; i < lines.length; i++) subtotal += lines[i]!.amount;
    if (subtotal === 0) continue;
    const after = templeShare(state, city, religion, subtotal, founder);
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

// --- the converter, shared by the phase and the bomb -------------------------

/**
 * Turns up to `count` citizens onto one religion, and answers how many actually
 * turned.
 *
 * `convertCitizen`'s loop, written once. The order is that function's docblock
 * and the whole of the rule — **the unconverted first, then the religion with
 * the fewest followers, ties by id** — and it stops the moment there is nobody
 * left to turn, which is only when the town already follows this faith to a
 * citizen.
 */
export function convertCitizens(
  city: City,
  religion: ReligionId,
  order: readonly ReligionId[],
  count: number,
): number {
  let turned = 0;
  while (turned < count) {
    if (!convertCitizen(city, religion, order)) break;
    turned += 1;
  }
  return turned;
}

/**
 * Banks one figure of pressure on one town for one religion and turns whoever it
 * pays for. Answers how many citizens turned.
 *
 * **The one converter, and there are exactly two callers**: `spreadReligion`,
 * once per religion per town per turn, and `pressLump`, once when a prophet or
 * an augur speaks. Writing it twice is how a bomb and a tide come to disagree
 * about what ten banked faith buys, and a source-reading test in
 * `test/sim/religion.test.ts` pins the pair — the same discipline
 * `assignCitizens` keeps for its two callers.
 *
 * Two properties are load-bearing and both were the phase's before they were
 * shared:
 *
 *   · **the remainder carries**, exactly as a food basket's does, so a town
 *     nine faith short is nine faith along next turn;
 *   · **the bank is capped just below the next convert** when there was nobody
 *     left to turn. A stored surplus would be a town that re-converts the
 *     instant a rival takes one citizen back.
 *
 * The key is **deleted** when a religion's bank empties, and the bank itself
 * when the last key goes, so a town nothing presses on serialises exactly like
 * one from before any of this existed. That bookkeeping is `writeBank`, which
 * the Purge shares — see `purgePressure`.
 *
 * The **inquisitor's Purge is deliberately not a third caller here** (Entry
 * LVIII). It is the mirror act, and folding it in as a signed `amount` would
 * have been two functions sharing a name: the carry, the cap and the convert
 * loop all read the wrong way round under a negative lump. What the two acts
 * genuinely share is the bank's bookkeeping, and that is what they share.
 */
function bankPressure(
  city: City,
  religion: ReligionId,
  order: readonly ReligionId[],
  amount: number,
  perConvert: number,
): number {
  const banked = (city.pressureBank?.[religion] ?? 0) + amount;
  const wanted = Math.floor(banked / perConvert);
  const turned = convertCitizens(city, religion, order, wanted);
  writeBank(city, religion, turned < wanted ? perConvert - 1 : banked - turned * perConvert);
  return turned;
}

/**
 * Writes one religion's banked pressure on one town — **the one place
 * `City.pressureBank` is shaped**, and the whole of what the tide and the Purge
 * share.
 *
 * The key is deleted when a religion's bank empties and the bank itself when the
 * last key goes, so a town nothing presses on serialises exactly like one from
 * before any of this existed. Floored at zero: a bank is a count of faith
 * *toward* a convert, and a negative one would be a debt no rule reads.
 */
function writeBank(city: City, religion: ReligionId, left: number): void {
  const bank = city.pressureBank ?? {};
  if (left > 0) bank[religion] = left;
  else delete bank[religion];
  if (Object.keys(bank).length > 0) city.pressureBank = bank;
  else delete city.pressureBank;
}

/**
 * Takes one lump of banked pressure away from one religion on one town, and
 * turns back whoever the deficit reaches. Answers how many citizens stopped
 * following.
 *
 * `bankPressure`'s mirror and the Purge's whole arithmetic (Entry LVIII, The
 * Holy Office). Said in the order it happens: the lump comes off the bank; if
 * the bank covered it there is nothing more to do, and if it did not, every
 * `pressurePerConvert` of the **deficit** takes one citizen off that
 * congregation and leaves them following nothing at all.
 *
 * Three rules, each a decision rather than an accident:
 *
 *   · **The citizen goes to nobody, not to the purger's faith.** An inquisitor
 *     unmakes belief; it does not preach. That is what keeps the Purge and the
 *     Preaching two different verbs — one clears the ground, the other takes it
 *     — and it is why the Holy Office is worth marching *before* a prophet
 *     rather than instead of one.
 *   · **The remainder does not carry.** A purge is an event, exactly as a
 *     proclamation is: nothing is left standing on the board when it returns,
 *     and a negative bank would be a debt every other reader would have to learn
 *     about. The bank is simply emptied.
 *   · **The spared faith is never touched**, which is the caller's loop rather
 *     than a clause here — this function is told one religion and strips it.
 */
function purgePressure(
  city: City,
  religion: ReligionId,
  lump: number,
  perConvert: number,
): number {
  const banked = (city.pressureBank?.[religion] ?? 0) - lump;
  if (banked >= 0) {
    writeBank(city, religion, banked);
    return 0;
  }
  writeBank(city, religion, 0);
  const wanted = Math.floor(-banked / perConvert);
  let turned = 0;
  while (turned < wanted && unconvertCitizen(city, religion)) turned += 1;
  return turned;
}

/**
 * What one town's Temple lets through of one figure of one religion's pressure.
 *
 * **The** temple rule, and it is shared for the reason the converter is: the
 * per-turn tide applies it in `explainPressure` and a proclamation applies it in
 * `pressLump`, and a temple that resisted a slow tide but not a bomb would be
 * the one defensive building in the game with a hole in it (user, 2026-08-28:
 * "the temple rule applied … so a temple resists the bomb").
 *
 * Twice for the faith the town already keeps, half for everybody else's, whole
 * percentage points, floored once. Shifted by the pressure rules of **whoever
 * holds the seat** of the pressing faith (`religionFounder`) — the 2026-08-28
 * ruling that a conqueror takes the reach of a faith with the stones.
 *
 * A town with no Temple gets its figure back untouched, which is why callers do
 * not ask whether there is one.
 */
export function templeShare(
  state: GameState,
  city: City,
  religion: Religion,
  amount: number,
  founder: number = religionFounder(state, religion),
): number {
  if (!city.buildings.includes(TEMPLE)) return amount;
  const rules = RULES.religion;
  const percent =
    cityReligion(city) === religion.id
      ? rules.templeOwnPercent + cardPressureRule(state, founder, 'templeOwnPercent')
      : rules.templeForeignPercent + cardPressureRule(state, founder, 'templeForeignPercent');
  return Math.max(0, Math.floor((amount * Math.max(0, percent)) / 100));
}

/** One town a proclamation reaches, and the figure it will actually bank there. */
interface LumpTarget {
  city: City;
  /** The lump after this town's Temple has had its say. See `templeShare`. */
  pressed: number;
}

/**
 * Every town within `range` of a proclamation, in `state.cities` order, each
 * with the figure the temple lets through.
 *
 * **Every** town, not every town of the speaker's — a bomb aimed at a rival's
 * capital is the whole reason the verb exists — and in the order the state
 * carries rather than in distance order, because an outcome may only depend on
 * an order a replay reproduces.
 *
 * Hoisted so `pressLump` and `proclaimPreview` walk the board by the same rule.
 */
function lumpTargets(
  state: GameState,
  religion: Religion,
  at: { col: number; row: number },
  range: number,
  lump: number,
): LumpTarget[] {
  const out: LumpTarget[] = [];
  const here = getTileAt(state.map, at.col, at.row);
  if (!here) return out;
  const eye = tileHex(here);
  const founder = religionFounder(state, religion);
  for (const city of state.cities) {
    const tile = getTileAt(state.map, city.col, city.row);
    if (!tile) continue;
    if (wrappedDistance(state.map, eye, tileHex(tile)) > range) continue;
    out.push({ city, pressed: templeShare(state, city, religion, lump, founder) });
  }
  return out;
}

/** One town a proclamation landed on. See `ProclamationReport`. */
export interface ProclamationConversion {
  cityId: number;
  /** Citizens that turned this instant. Zero for a town a temple held. */
  converted: number;
  /** True when the town follows the proclaimed faith now the dust has settled. */
  nowFollows: boolean;
}

/**
 * What a proclamation did, for the announcement — `CommandResult.proclaimed`.
 *
 * `arrivals`' argument in a third currency: it is a **difference** that stops
 * existing the instant the command returns. By then the citizens have turned,
 * the banks hold their remainders and nothing on the board says which towns a
 * prophet had just spoken to — a diff of two states could not tell a bomb's
 * six converts from a turn of ordinary tide.
 *
 * Every town in range is listed, including the ones a temple held to nothing,
 * because "Nippur resisted" is exactly the news a player who spent a whole
 * prophet's charge needs.
 */
export interface ProclamationReport {
  religionId: ReligionId;
  cities: ProclamationConversion[];
}

/**
 * Presses one lump of faith on every town in range, and turns whoever it pays
 * for — **the faith bomb, and the augur's Preaching out of a smaller purse**.
 *
 * The user's ruling of 2026-08-28, said in the order it happens: the lump is
 * *banked* (so a town already part-way to a convert gets the benefit of what it
 * had), the **temple** takes its share on the way in (`templeShare`), and the
 * phase's **own converter** runs on the spot (`bankPressure`) so a town may flip
 * this instant. Nothing is left standing afterwards — that is the difference
 * between this charge and a holy site, and the difference is the decision.
 *
 * `refreshCityDerived` for every town that turned a citizen, because a town's
 * banner is a fact about what its citizens are worth: follower beliefs apply
 * city-locally (`liveCityEffects`), so a conversion at noon changes the panel
 * before the turn ends. The register's rule, and this is entry 14 on it. It is
 * asked of **foreign** towns too — a bomb is aimed at somebody else's — which is
 * fine because the helper is idempotent and derived and the phase recomputes it.
 */
export function pressLump(
  state: GameState,
  religion: Religion,
  at: { col: number; row: number },
  range: number,
  lump: number,
): ProclamationReport {
  const order = state.religions.map((one) => one.id);
  const perConvert = Math.max(1, Math.floor(RULES.religion.pressurePerConvert));
  const cities: ProclamationConversion[] = [];
  for (const { city, pressed } of lumpTargets(state, religion, at, range, lump)) {
    const converted = bankPressure(city, religion.id, order, pressed, perConvert);
    if (converted > 0) refreshCityDerived(state, city);
    cities.push({
      cityId: city.id,
      converted,
      nowFollows: cityReligion(city) === religion.id,
    });
  }
  return { religionId: religion.id, cities };
}

/**
 * The tide, run for one turn — **one of two writers of `City.followers`** and of
 * `City.pressureBank`.
 *
 * The phase sits **before `collectYields`** and that is a rules decision like
 * every other position in the pipeline: a town that changes its banner this turn
 * pays its new majority's founder *this* turn, rather than a turn late. It is
 * also why the phase is early enough that nothing has yet been banked out of the
 * world it is about to change.
 *
 * Two things happen, per town in `state.cities` order and per religion in
 * founding order: **the bank fills** with every religion's pressure folded off
 * the board, and **citizens turn** — both through `bankPressure`, which is the
 * converter a proclamation also runs so the two can never disagree about what
 * ten banked faith buys. Its docblock carries the carry-and-cap rules.
 *
 * There is no broom any more, and the *absence* is the 2026-08-28 ruling: a
 * proclamation is a lump paid the instant it is made (`pressLump`), so there is
 * nothing standing on the board with an expiry to sweep. The one phase in this
 * module that still sweeps is `pruneTimedEffects`, over rites.
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
    for (const religion of state.religions) {
      bankPressure(city, religion.id, order, totals[religion.id] ?? 0, perConvert);
    }
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
