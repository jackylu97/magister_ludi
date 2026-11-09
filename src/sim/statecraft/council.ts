/**
 * **The council**: the chairs that a seat's Orders sit in.
 *
 * This file holds how many chairs a seat has and of which type, which card may
 * sit in which chair, the refusals and writes of the two slot commands, where a
 * malice sits, which chair a position card names (and so which chair counts
 * twice), and how the council is seated again after an adoption or a Doctrine.
 *
 * It is a separate file from `draft.ts` because the chairs are a system of their
 * own: the draft deals the cards, and the council seats them. Until batch S4 this
 * code sat in two places in `draft.ts`, about 1,300 lines apart.
 *
 * It has a function-level import cycle with `draft.ts` and with `evaluator.ts`,
 * the kind that CLAUDE.md allows. Every top-level value here is a function or a
 * literal, so the file can load in any order, and
 * `test/mapgen/moduleCycles.test.ts` loads it first to prove that.
 * `../statecraft.ts` re-exports its names.
 */

import { type MaliceId, MALICE_IDS, MALICE_RULES, isMaliceId, maliceDef } from '../maliceData';
import { type GameState, type HeldMalice, type Player, playerById } from '../state';
import {
  type ChairFit,
  type ChairType,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  type OrderSlotGrant,
  type SlotType,
  doctrineDef,
  governmentDef,
  isCharter,
  isOrderId,
  orderDef,
  orderFitsSlot,
  orderType,
  slotCount,
  slotLayout,
  slotSpread,
} from '../statecraftData';
import { bumpEconomy } from '../slate';
// Both of these files import this one back. Each name below is used only inside
// a function, so neither edge is read while the modules load.
import { cardActionRule, cardExtraChairs, sealTurnsFor } from './evaluator';
import {
  type PlayerStatecraft,
  type SlottedOrder,
  commissionFulfilledTurn,
  drawWithoutReplacement,
  holdsOrder,
  isSlotted,
  statecraftOf,
} from './draft';

// --- how many chairs, and of which type -------------------------------------

/**
 * The chair types this council has, Military first and Wildcard last.
 *
 * **THE slot-order contract**, stated once here because two systems now depend on
 * it (ruled 2026-09-06, `docs/history/fewer-things.md` §1's levers):
 *
 *   · this array and `PlayerStatecraft.slots` are **the same order, index for
 *     index** — `newPlayerStatecraft` and `adoptGovernmentAt` both build the
 *     slots to this list's length, so slot *i* is a chair of type
 *     `slotTypesOf()[i]`;
 *   · **the order is the order the screen draws**, top to bottom, and therefore
 *     the order a player counts in. "The first economic slot" is the
 *     lowest-indexed slot whose type here is `'economic'` — the *chair's* type
 *     and never the card's, so an economic Order placed in a Wildcard chair is
 *     not sitting in an economic slot;
 *   · rearranging is a **placement**, so a position is a decision a player made
 *     and a card may be paid for it (`CardSlotPositionEffect`, read through
 *     `orderAtSlotPosition`).
 *
 * A screen that grouped the chairs by flavour would break the second clause and
 * with it every position card; `src/ui/statecraftScreen.ts` draws them in this
 * order for that reason.
 */
export function slotTypesOf(sc: PlayerStatecraft): ChairType[] {
  const layout = slotLayout(sc.government);
  // **The array is the standing fact about how many chairs there are**, and the
  // government is the fact about what *kind* each of the first ones is. A card
  // may open more (`CardSlotRiderEffect`), and those are Wildcard chairs by
  // construction and appended at the end — so the contract above survives
  // untouched: chair *i* is still the same chair it was before the card was
  // taken, and no position card renumbers. Padded here rather than asked of the
  // law, because this function holds no state and no seat: `chairCount` is where
  // the card is read, and this is the one reading of what is already written
  // down.
  while (layout.length < sc.slots.length) layout.push('wildcard');
  // A card may close chairs too (batch DT11, Scutage), and the last ones go first.
  // Wildcard chairs come last in the layout, so what closes is a Wildcard chair.
  layout.length = sc.slots.length;
  return layout;
}

/**
 * **How many chairs this empire's council has** — its government's layout plus
 * whatever its law adds (`cardExtraChairs`).
 *
 * The one figure `PlayerStatecraft.slots` is ever built to, and therefore the
 * one place the card is read. Every other reading in the game asks the array:
 * `slotTypesOf` pads to its length, `slotOrderError` bounds on it, the screen
 * draws it. That is what makes a widened council a *fact about the state* rather
 * than a figure four readers have to remember to add.
 *
 * It never goes below the government's typed chairs (batch DT11, Scutage), so a
 * card that closes a chair closes a Wildcard one or nothing.
 */
export function chairCount(state: GameState, playerId: number, government: GovernmentId): number {
  // The chairs a commission won for the rest of the game (Dominion batch D6)
  // are counted with the law's, after the government's own.
  const won = Math.max(0, Math.floor(statecraftOf(state, playerId)?.chairsWon ?? 0));
  const chairs = slotCount(government) + cardExtraChairs(state, playerId) + won;
  return Math.max(typedChairsOf(government), chairs);
}

/**
 * **The chairs this seat would sit under a government it has not adopted**: that
 * government's layout, with the Wildcard chairs this seat's law adds on the end and
 * the ones its law closes off the end (batch DT20). This is what `adoptGovernmentAt`
 * would build, so an offer card and a bot pricing an offer read the council the
 * adoption really lays out. `slotTypesOf` answers the same question for the
 * government a seat already has, off its array.
 */
export function chairLayoutUnder(state: GameState, playerId: number, government: GovernmentId): ChairType[] {
  const want = chairCount(state, playerId, government);
  const layout = slotLayout(government);
  while (layout.length < want) layout.push('wildcard');
  layout.length = want;
  return layout;
}

/** How many of a government's chairs are Military, Economic or Civic. */
function typedChairsOf(government: GovernmentId): number {
  const spread = slotSpread(government);
  return spread.military + spread.economic + spread.civic;
}

// --- the fit: which card may sit in which chair -----------------------------

/** Every card fits every chair: the fit while `cardsFitAnyChair` holds. */
const fitsAnyChair: ChairFit = () => true;

/**
 * **Which chairs this seat's cards fit, now** (Magisterial batch MG12, The
 * Mixed Constitution; the triage's reading 24). The plain rule
 * (`orderFitsSlot`), unless the seat's law holds `cardsFitAnyChair`: then
 * every card of the seat fits every chair.
 *
 * The rule is read through the law (`cardActionRule`), so it holds exactly
 * while the card sits in a chair. The answer is a function, so a caller that
 * asks about many cards and chairs reads the law once. Every reader of a
 * seat's chairs asks this: the slot refusal (`slotOrderError`), the
 * re-seating (`adoptGovernmentAt`, `councilRefit`), the council screen, the
 * bots (`src/ai/council.ts`, `value.ts`) and the card stamp (`cardImpact.ts`).
 * The flair gallery's sample cards have no seat behind them, so it asks the
 * plain rule.
 */
export function chairFitFor(state: GameState, playerId: number): ChairFit {
  return cardActionRule(state, playerId, 'cardsFitAnyChair') ? fitsAnyChair : orderFitsSlot;
}

/** Does this card fit a chair of this type, for this seat now? `chairFitFor`, asked once. */
export function orderFitsSlotFor(
  state: GameState,
  playerId: number,
  order: OrderId,
  chair: ChairType,
): boolean {
  return chairFitFor(state, playerId)(order, chair);
}

/** This board with one seat's chairs replaced. Shallow, read-only, and never kept. */
function withSlots(
  state: GameState,
  playerId: number,
  slots: (SlottedOrder | null)[],
): GameState {
  return {
    ...state,
    players: state.players.map((seat) =>
      seat.id === playerId ? { ...seat, statecraft: { ...seat.statecraft, slots } } : seat,
    ),
  };
}

/**
 * **The fit this seat would have with one chair emptied**: the fit a card put
 * in that chair next is held to. It is `chairFitFor` unless the card in that
 * chair is the one that widens the fit. Emptying a chair never widens the fit,
 * so the law is read a second time only while the fit is wide. The bots' swap
 * (`reslotDecision`, `src/ai/council.ts`) asks it, and so does the council
 * screen's staging (`councilDiff`), to take that card out last.
 */
export function chairFitWithout(state: GameState, playerId: number, slotIndex: number): ChairFit {
  const fit = chairFitFor(state, playerId);
  if (fit === orderFitsSlot) return fit;
  const sc = statecraftOf(state, playerId);
  if (!sc) return fit;
  const slots = sc.slots.map((slot, index) => (index === slotIndex ? null : slot));
  return chairFitFor(withSlots(state, playerId, slots), playerId);
}

/**
 * **The council re-seated where it stands, by the fit it has now**, or `null`
 * when every seated card already fits its chair (Magisterial batch MG12; the
 * triage's reading 24 and question 2's recommended answer).
 *
 * A card can sit in a chair the plain rule refuses only while The Mixed
 * Constitution widens the fit. When the fit narrows again, the council is
 * re-seated at once by the ordinary rule, as an adoption re-seats it
 * (`reseatOrders`): a card that still fits its chair keeps it, the rest move
 * to free chairs that fit them, and a card that fits no free chair returns to
 * the collection with its progress. A card that keeps its chair keeps its
 * seal, because nothing happened to it. A card that moves loses its seal, as a
 * card a malice turns out does: the seal was a promise about the chair it
 * left. A chair a malice holds is never free.
 *
 * Pure: it reads the board and answers the new chairs. `settleCouncilFit`
 * writes them for a live seat. The council screen's staging and the card
 * stamp ask it of a shadow board.
 */
export function councilRefit(
  state: GameState,
  playerId: number,
): { slots: (SlottedOrder | null)[]; reseated: OrderId[]; returned: OrderId[] } | null {
  const player = playerById(state, playerId);
  if (!player) return null;
  const sc = player.statecraft;
  const fit = chairFitFor(state, playerId);
  const layout = slotTypesOf(sc);
  const misfit = sc.slots.some(
    (slot, index) => slot !== null && isOrderId(slot.card) && !fit(slot.card, layout[index] ?? 'wildcard'),
  );
  if (!misfit) return null;
  const held = layout.map((_, index) => maliceAt(player, index) !== null);
  return reseatOrders(sc.slots, layout, held, state.turn, fit, true);
}

/**
 * **Re-seats a live council whose fit has narrowed** (Magisterial batch MG12):
 * writes `councilRefit`'s chairs and announces the write. Answers the cards
 * that went back to the collection, in their old seat order.
 *
 * Called by every writer that can take a card out of a chair, after the card
 * has left: the unslot command (`applyUnslotOrder`, `commands.ts`), a malice
 * taking a chair (`seatMalice`), a commission leaving its chair
 * (`runCommissions`, `commissions.ts`), an adoption (`adoptGovernmentAt`, for
 * a card that found no chair in the new council) and a council that shrinks
 * (`refitSlots`). It does nothing unless a seated card no longer fits its
 * chair, which happens only once the card that widened the fit has left.
 * `test/sim/decks/magisterialConstitution.test.ts` pins the list against
 * every writer of the chairs.
 */
export function settleCouncilFit(state: GameState, player: Player): OrderId[] {
  const seating = councilRefit(state, player.id);
  if (seating === null) return [];
  player.statecraft.slots = seating.slots;
  bumpEconomy(state);
  return seating.returned;
}

// --- the slots: a card into a chair, and out again --------------------------

/**
 * Why this card cannot go in this slot, or `null` when it can.
 *
 * Five refusals, and each is a rule rather than a guard: the player must hold
 * the card, the slot must exist, the card must not already be slotted, the slot
 * must be free, and the **card must fit the chair** (`orderFitsSlot`, batch C2):
 * a Wildcard chair takes any card, a typed chair takes a card of its own type
 * or an unsorted one, and a Wildcard card fits only a Wildcard chair. The fit
 * is the one the seat's council grants now (`chairFitFor`, Magisterial batch
 * MG12): while The Mixed Constitution sits in a chair, every card fits every
 * chair. The card itself is seated by the plain rule, because its rule holds
 * only once it sits.
 *
 * There is deliberately no "swap" that empties an occupied slot: an occupied
 * slot is a sealed slot most of the time, and a verb that silently broke a seal
 * would be the one thing entry-locking exists to prevent. Unslot, then slot.
 */
export function slotOrderError(
  state: GameState,
  playerId: number,
  cardId: unknown,
  slotIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const sc = player.statecraft;
  if (!isOrderId(cardId)) return `"${String(cardId)}" is not a known Order`;
  if (!holdsOrder(sc, cardId)) return `${player.name} does not hold ${orderDef(cardId).name}`;
  // **A charter is never seated** (D1a, `CharterSpec`): its grant was written
  // on the pick, and a chair spent on it would be a chair spent on nothing.
  if (isCharter(cardId)) return `${orderDef(cardId).name} is a charter and never sits in a chair`;
  // A fulfilled commission has paid its reward and has nothing left to do.
  if (commissionFulfilledTurn(sc, cardId) !== undefined) {
    return `${orderDef(cardId).name} is fulfilled and never sits in a chair again`;
  }
  if (!Number.isInteger(slotIndex)) {
    return `slotOrder needs an integer slotIndex, got ${String(slotIndex)}`;
  }
  const index = slotIndex as number;
  const layout = slotTypesOf(sc);
  if (index < 0 || index >= layout.length) {
    return `${governmentDef(sc.government).name} has ${layout.length} slot(s), not ${index + 1}`;
  }
  if (isSlotted(sc, cardId)) return `${orderDef(cardId).name} is already slotted`;
  const held = sc.slots[index];
  if (held) return `Slot ${index + 1} already holds ${orderDef(held.card).name}`;
  // **The chair a malice sits in is not empty**, whatever the slots array says
  // (batch G3). It is asked here rather than left to the `held` line above
  // because a malice is not a `SlottedOrder` — it holds the chair from
  // `Player.malices` — and a refusal that said "slot 3 is empty" would be the
  // reducer contradicting the screen.
  const malice = maliceAt(player, index);
  if (malice !== null) return maliceChairRefusal(index, malice);
  const chair = layout[index]!;
  if (!chairFitFor(state, playerId)(cardId, chair)) return chairMisfitRefusal(cardId, index, chair);
  return null;
}

/** How a chair type reads in a refusal and on the screen. One table, one voice. */
export const SLOT_WORDS: Record<ChairType, string> = {
  military: 'military',
  economic: 'economic',
  civic: 'civic',
  wildcard: 'wildcard',
};

/** The same words with their article, for a sentence: "an economic", "a civic". */
const CHAIR_WITH_ARTICLE: Record<ChairType, string> = {
  military: 'a military',
  economic: 'an economic',
  civic: 'a civic',
  wildcard: 'a wildcard',
};

/**
 * **Why a card does not fit a chair**, in plain words: what kind of card it is,
 * which chairs it fits, and what kind of chair it was offered. The reducer's
 * refusal for a pair `orderFitsSlot` turns down, and so also the sentence the
 * council screen shows before the click.
 */
export function chairMisfitRefusal(cardId: OrderId, slotIndex: number, chair: ChairType): string {
  const name = orderDef(cardId).name;
  const type = orderType(cardId);
  const offered = `chair ${slotIndex + 1} is ${CHAIR_WITH_ARTICLE[chair]} chair`;
  if (type === 'wildcard') return `${name} is a wildcard card: it fits only a wildcard chair, and ${offered}`;
  // An unsorted card fits every chair, so it never reaches this sentence; the
  // line is here so the function answers honestly for any card it is handed.
  if (type === 'unsorted') return `${name} fits any chair`;
  return (
    `${name} is ${CHAIR_WITH_ARTICLE[type]} card: it fits ${CHAIR_WITH_ARTICLE[type]} chair ` +
    `or a wildcard chair, and ${offered}`
  );
}

/**
 * Puts a card in a slot and **seals it**. Validates nothing — the rule is
 * `slotOrderError`'s.
 *
 * The seal is an *entry* lock (Entry XV): it starts the moment the card goes in,
 * so a posture change is anticipated rather than reactive — which is what
 * simultaneous turns need, since a swap made in response to what somebody else
 * did this window would be a decision taken after seeing their move. Length is
 * `sealTurnsFor`, which is the empire's, so The Loose Rein is felt at the moment
 * it matters.
 */
export function slotOrderAt(
  state: GameState,
  player: Player,
  cardId: OrderId,
  slotIndex: number,
): SlotOutcome {
  const slot: SlottedOrder = {
    card: cardId,
    sealedUntil: state.turn + sealTurnsFor(state, player.id),
  };
  player.statecraft.slots[slotIndex] = slot;
  // **A slotted Order is the third source of `liveEffects`** (batch M3,
  // `slate.ts`), and the meters fold that walk — so the empire's contentment and
  // its writ are not what they were on the line above. The law's own memo is
  // dropped by the reducer beside this call (`forgetTheLaw`); this is the same
  // sentence said to the slate.
  bumpEconomy(state);
  // **The once-per-game grant, claimed here and settled by the caller.** Here,
  // because this is the one place a card goes into a slot and a flag written
  // anywhere else is a flag some future slotting path forgets; settled by the
  // caller, because "gain a great person" is a renown windfall and `renown.ts`
  // reads *this* module — the arrow only points one way, so the reducer above
  // both is what turns the claim into an offer.
  const granted: OrderSlotGrant[] = [];
  const onSlot = orderDef(cardId).onSlot ?? [];
  if (onSlot.length > 0 && !player.statecraft.grantedOnSlot.includes(cardId)) {
    player.statecraft.grantedOnSlot.push(cardId);
    granted.push(...onSlot);
  }
  return { slot, granted };
}

/**
 * What slotting a card did: the sealed slot, and whatever it handed over once.
 *
 * A shape rather than a second out-parameter, `RealisedItem`'s argument at a
 * smaller scale — two kinds of news exist and a third joins the shape.
 */
export interface SlotOutcome {
  slot: SlottedOrder;
  /** The `onSlot` grants that fired *this time*. Empty on every later slotting. */
  granted: OrderSlotGrant[];
}

/** Turns left on a slot's seal, or 0 when it is free to move. */
export function sealRemaining(state: GameState, slot: SlottedOrder | null): number {
  if (!slot) return 0;
  return Math.max(0, slot.sealedUntil - state.turn);
}

/**
 * Why this slot cannot be emptied, or `null` when it can.
 *
 * Unslotting after the seal expires is **free** (Entry XV) — there is no cost,
 * no cooldown and no second seal on the way out, because the friction the design
 * wants is on *committing*, not on retreating.
 */
export function unslotOrderError(
  state: GameState,
  playerId: number,
  slotIndex: unknown,
): string | null {
  const player = playerById(state, playerId);
  if (!player) return `No player with id ${String(playerId)}`;
  const sc = player.statecraft;
  if (!Number.isInteger(slotIndex)) {
    return `unslotOrder needs an integer slotIndex, got ${String(slotIndex)}`;
  }
  const index = slotIndex as number;
  if (index < 0 || index >= sc.slots.length) {
    return `${governmentDef(sc.government).name} has ${sc.slots.length} slot(s), not ${index + 1}`;
  }
  // **A malice is never taken out** (§4) — the whole of the punishment is that
  // it holds the chair. Asked before the emptiness check for `slotOrderError`'s
  // reason: the slots array says the chair is empty and it is not.
  const malice = maliceAt(player, index);
  if (malice !== null) return maliceChairRefusal(index, malice);
  const slot = sc.slots[index];
  if (!slot) return `Slot ${index + 1} is empty`;
  const left = sealRemaining(state, slot);
  if (left > 0) {
    return `${orderDef(slot.card).name} is sealed for ${left} more turn${left === 1 ? '' : 's'}`;
  }
  return null;
}

/** Empties a slot. The card stays in the collection — it is never lost. */
export function unslotOrderAt(player: Player, slotIndex: number): OrderId | null {
  const slot = player.statecraft.slots[slotIndex];
  if (!slot) return null;
  player.statecraft.slots[slotIndex] = null;
  return slot.card;
}

// --- where a malice sits ----------------------------------------------------

/**
 * **The seating rule** (`docs/wager.md` §4, batch G3), and it lives here rather
 * than in `wagers.ts` for one reason: it is a rule about *chairs*, and the chairs
 * are this file's. The wager decides who is punished; this decides where the
 * punishment sits.
 *
 * A malice is an Order with a bad face — it holds a chair, it pays its effect
 * through `liveEffects` like the Order beside it, and it cannot be moved. What
 * differs is every verb: nobody drafts one, nobody slots one, nobody takes one
 * out. So the state it lives in is `Player.malices` rather than
 * `PlayerStatecraft.slots`, and the chair it occupies is an index recorded on
 * the held row (`HeldMalice.chair`). Two readings follow from that and they are
 * the whole interface: `maliceAt` says which chair is taken, and the two slot
 * evaluators refuse it in one sentence.
 *
 * Why not a `SlottedOrder` with a malice id in it? Because `SlottedOrder.card`
 * is an `OrderId` in a dozen readings — the bot's appraisal, the position cards,
 * the staging layer, the screen's collection — and every one of them would have
 * had to learn that a chair might hold something that is not an Order. A chair
 * that is *taken* by something outside the array is one new question asked in
 * three places, which is the smaller change and the honest one.
 */

/** The malice sitting in this chair, or `null`. The one occupancy reading. */
export function maliceAt(player: Player, slotIndex: number): MaliceId | null {
  for (const held of player.malices) {
    if (held.chair !== slotIndex) continue;
    if (!isMaliceId(held.id)) continue;
    return held.id;
  }
  return null;
}

/** The refusal both slot verbs answer with. One sentence, one voice. */
export function maliceChairRefusal(slotIndex: number, malice: MaliceId): string {
  return `${maliceDef(malice).name} holds slot ${slotIndex + 1} and cannot be moved`;
}

/**
 * **Which chair a malice of this flavour takes** — the last one of its own
 * flavour, else the last wildcard, else nothing (§4).
 *
 * *Last* rather than first, and that is the rule the worksheet states: a player
 * arranges the chairs top-down and the position cards read the first of a
 * flavour, so taking the last does the least damage to an arrangement somebody
 * built on purpose. It still displaces whatever Order is sitting there — the
 * chair is what the punishment costs.
 *
 * A chair another malice already holds is not free: two malices are two chairs.
 * `null` is the ninth chair nobody has — see `HeldMalice.chair`.
 */
export function maliceChairFor(player: Player, chair: SlotType): number | null {
  const layout = slotTypesOf(player.statecraft);
  for (let index = layout.length - 1; index >= 0; index--) {
    if (layout[index] !== chair) continue;
    if (maliceAt(player, index) !== null) continue;
    return index;
  }
  // No chair of that flavour, or every one of them already carries a malice: a
  // wildcard takes anything, which is the same clause that makes a wildcard
  // chair worth what it is worth to an Order.
  for (let index = layout.length - 1; index >= 0; index--) {
    if (layout[index] !== 'wildcard') continue;
    if (maliceAt(player, index) !== null) continue;
    return index;
  }
  return null;
}

/** What seating one did, for the announcement and the screens it re-opens. */
export interface MaliceSeating {
  id: MaliceId;
  /** The chair it took, or `null` for the ninth chair nobody has. */
  chair: number | null;
  /** The Order it turned out into the hand, or `null`. Its seal is broken. */
  displaced: OrderId | null;
  /** The older malice this one replaced at the stacking cap, or `null`. */
  replaced: MaliceId | null;
}

/**
 * Seats one malice, displacing whatever sits in the chair it takes. Validates
 * nothing — the *whether* is the judgement's.
 *
 * The displaced Order goes back to the collection unsealed and **nothing is
 * refunded**, which is the ruling word for word: nothing was spent to slot it,
 * so there is nothing to give back. The seal is simply gone, which means the
 * player may put the card somewhere else this turn — the only mercy in the rule
 * and a deliberate one, since a spread wrecked by a card that cannot move is a
 * spread the player cannot answer.
 */
function seatMalice(state: GameState, player: Player, id: MaliceId, untilAge: number): MaliceSeating {
  const chair = maliceChairFor(player, maliceDef(id).chair);
  let displaced: OrderId | null = null;
  if (chair !== null) {
    const sitting = player.statecraft.slots[chair];
    if (sitting) {
      displaced = sitting.card;
      player.statecraft.slots[chair] = null;
    }
  }
  const held: HeldMalice = { id, untilAge };
  if (chair !== null) held.chair = chair;
  player.malices.push(held);
  // The eleventh source of `liveEffects` just changed, and so did the chairs the
  // third source is read out of — the same sentence `slotOrderAt` says to the
  // slate, said for a card nobody chose.
  bumpEconomy(state);
  // **If the card turned out was the one that widened the fit** (Magisterial
  // batch MG12, The Mixed Constitution), the council is re-seated at once by
  // the plain rule. It does nothing otherwise.
  settleCouncilFit(state, player);
  return { id, chair, displaced, replaced: null };
}

/**
 * **Deals this realm one malice and seats it** — the judgement's whole payment
 * (§4, called from `seatPendingMalices` in `wagers.ts`).
 *
 * Four rules in one call, in the order they are:
 *
 *   1. **the draw**, from `state.rng` over the deck minus everything this seat
 *      already carries — *"a seat never holds two copies of the same malice"*.
 *      Asked before the eviction below, deliberately: a card just worked off is
 *      not a card the same judgement may deal straight back;
 *   2. **the cap** (`rules.stack`, two): a third failure **replaces the oldest**
 *      rather than adding, so the punishment has a ceiling a player can see and
 *      the comeback is never arithmetically out of reach;
 *   3. **the renewal**: whatever survives is re-stamped to the age this new one
 *      names, because a seat that missed again has not worked anything off;
 *   4. **the seating**, `seatMalice` above.
 *
 * `null` only when the deck is exhausted — twelve rows against a cap of two, so
 * unreachable while the table has more rows than the cap, and an honest answer
 * rather than a throw if a designer ever cuts it to one.
 */
export function takeMalice(state: GameState, player: Player, untilAge: number): MaliceSeating | null {
  const candidates = MALICE_IDS.filter((id) => !player.malices.some((held) => held.id === id));
  const [drawn] = drawWithoutReplacement(state, candidates, 1);
  if (drawn === undefined) return null;

  let replaced: MaliceId | null = null;
  const cap = Math.max(1, Math.floor(MALICE_RULES.stack));
  while (player.malices.length >= cap) {
    const oldest = player.malices.shift();
    if (oldest !== undefined && isMaliceId(oldest.id)) replaced = oldest.id;
  }
  for (const held of player.malices) held.untilAge = untilAge;

  return { ...seatMalice(state, player, drawn, untilAge), replaced };
}

/**
 * **Sheds every malice whose term is up** — the other half of §4's clause, and
 * the reason the term is a stamp rather than a counter.
 *
 * Called at a judgement for a seat that **kept** what it staked: every malice
 * naming this age or an earlier one leaves the chair. A seat that missed keeps
 * its own through `takeMalice`'s renewal instead, so the two paths never both
 * touch one row.
 */
export function shedMalices(state: GameState, player: Player, age: number): MaliceId[] {
  const gone: MaliceId[] = [];
  player.malices = player.malices.filter((held) => {
    if (held.untilAge > age) return true;
    if (isMaliceId(held.id)) gone.push(held.id);
    return false;
  });
  if (gone.length > 0) bumpEconomy(state);
  return gone;
}

/**
 * **A malice survives an adoption and re-seats itself** (§4, ruled).
 *
 * The debt is owed to the next wager, not to the government that owed it, and a
 * realm that could shed a malice by adopting would have found the cheapest
 * comeback in the game. On an adoption the malices take their chairs in the new
 * layout **before** the Orders are re-seated (`reseatCouncil`), so a malice
 * never has to turn a re-seated card out.
 *
 * Every chair is forgotten first and then re-taken in seating order, because
 * `maliceChairFor` reads the chairs already taken and a stale index from the old
 * spread would either point at a chair that no longer exists or let two malices
 * claim one. Called on an adoption (through `reseatCouncil`) and by
 * `refitSlots`.
 */
export function reseatMalices(player: Player): void {
  for (const held of player.malices) delete held.chair;
  for (const held of player.malices) {
    if (!isMaliceId(held.id)) continue;
    const chair = maliceChairFor(player, maliceDef(held.id).chair);
    if (chair !== null) held.chair = chair;
  }
}

// --- the chair a position names, and the chair that counts twice ------------

/**
 * The index in `PlayerStatecraft.slots` of the `position`-th chair of a flavour,
 * counting from one in slot order, or -1 for a chair that does not exist.
 * An absent `slot` counts every chair, which is what "the first slot" means with no
 * flavour named.
 *
 * Position -1 is the last chair of the flavour **that no malice holds** (batch DT9,
 * The Arthashastra; the user's answer of 2026-11-06). A malice takes the last chair of
 * its own type, so without this a Wildcard malice would always stop the doubling. A
 * counted position still counts a chair a malice holds, because it names a place in
 * the council and the player arranged the cards around that place.
 *
 * See `slotTypesOf` for why the array's index is the position a player sees.
 */
export function chairIndexAtPosition(player: Player, position: number, slot?: ChairType): number {
  if (position !== -1 && position < 1) return -1;
  const sc = player.statecraft;
  const flavours = slotTypesOf(sc);
  if (position === -1) {
    for (let index = sc.slots.length - 1; index >= 0; index--) {
      if (slot !== undefined && flavours[index] !== slot) continue;
      if (maliceAt(player, index) === null) return index;
    }
    return -1;
  }
  let seen = 0;
  for (let index = 0; index < sc.slots.length; index++) {
    if (slot !== undefined && flavours[index] !== slot) continue;
    seen += 1;
    if (seen === position) return index;
  }
  return -1;
}

/**
 * The Order sitting in the `position`-th chair of a flavour, or `null` for a
 * chair that does not exist or stands empty. A chair a malice holds stands empty
 * here, because a malice is not in `PlayerStatecraft.slots`.
 *
 * The one reading of a slot's *position*, and the whole of what
 * `CardSlotPositionEffect` needs from the state.
 */
export function orderAtSlotPosition(
  player: Player,
  position: number,
  slot?: ChairType,
): OrderId | null {
  const index = chairIndexAtPosition(player, position, slot);
  if (index < 0) return null;
  const held = player.statecraft.slots[index];
  return held && isOrderId(held.card) ? held.card : null;
}

// --- seating the council again, after an adoption or a Doctrine -------------

/**
 * **Re-seats a council's cards in a new layout** (batch C2, on the user's
 * ruling of 2026-10-12 that adopting a government keeps the seated cards; the
 * order is `docs/plans/chairs-build.md`'s).
 *
 * **As many cards as possible keep the same chair** (the user, 2026-10-16:
 * *"lets have adoption keep as many slots the same as possible"*). First,
 * every card whose chair index still exists in the new layout, is not held by
 * a malice, and still fits the card stays exactly where it is. Then the cards
 * that had to move are placed in the free chairs, in four passes:
 *
 *   1. Wildcard cards take Wildcard chairs, because nothing else takes them;
 *   2. each typed card takes a chair of its own type;
 *   3. the typed cards left take the Wildcard chairs left;
 *   4. the unsorted cards take whatever chairs are left, typed chairs before
 *      Wildcard ones.
 *
 * Within a pass the cards keep their old seat order and take the free chairs
 * in index order. A chair a malice holds (`held`) is never free. A card that
 * fits no free chair is **returned**: it stays in the collection, unseated, and
 * its progress goes with it, because a card's tally lives on the card and never
 * on the chair. Staying comes first even when it costs another card its seat:
 * a typed card that stays in a Wildcard chair keeps it from a Wildcard card that
 * has to move, because the ruling keeps the cards where they are before it
 * places the rest.
 *
 * A re-seated card keeps its chair record, its periodic clock and its count of
 * rerolls included, because it never left a chair; only its seal is lifted, as
 * an adoption has always lifted every seal, so the player can re-lay the new
 * council at once.
 *
 * **The fit is a parameter** (Magisterial batch MG12, The Mixed Constitution;
 * the triage's reading 24). It is the plain rule unless the caller hands in
 * the one the seat's council granted (`chairFitFor`). The four passes place
 * cards by the plain rule, which every fit admits, and a fifth pass then
 * seats the cards still left in the first free chair the fit admits, in old
 * seat order. Under the plain rule the fifth pass seats nothing, because the
 * four passes have already tried every chair the plain rule allows. So under
 * the wide fit every card is re-seated while chairs remain.
 *
 * `keepSealInPlace` is for a re-seating where the chairs did not change
 * (`councilRefit`): a card that keeps its own chair keeps its seal, and only
 * a card that moves has its seal lifted.
 *
 * Pure: it reads the old chairs and answers the new ones. `reseatCouncil` is
 * where a game's council is written.
 */
export function reseatOrders(
  previous: readonly (SlottedOrder | null)[],
  layout: readonly ChairType[],
  held: readonly boolean[],
  turn: number,
  fit: ChairFit = orderFitsSlot,
  keepSealInPlace = false,
): { slots: (SlottedOrder | null)[]; reseated: OrderId[]; returned: OrderId[] } {
  const slots: (SlottedOrder | null)[] = layout.map(() => null);
  // The seated cards with the chair each sat in, in old seat order.
  const cards: { slot: SlottedOrder; was: number }[] = [];
  previous.forEach((slot, was) => {
    if (slot !== null && isOrderId(slot.card)) cards.push({ slot, was });
  });
  const seated = new Set<number>();
  const seat = (card: number, chair: number): void => {
    const { slot: old, was } = cards[card]!;
    slots[chair] =
      keepSealInPlace && chair === was ? { ...old } : { ...old, sealedUntil: Math.min(old.sealedUntil, turn) };
    seated.add(card);
  };
  // 0. Every card whose chair still exists, is free of a malice and still fits
  // it stays where it is. Each old chair held one card, so no two cards can
  // claim the same chair here.
  cards.forEach(({ slot, was }, card) => {
    if (was >= layout.length || held[was] === true) return;
    if (fit(slot.card, layout[was]!)) seat(card, was);
  });
  const firstFree = (admits: (chair: ChairType) => boolean): number => {
    for (let index = 0; index < layout.length; index++) {
      if (slots[index] !== null || held[index] === true) continue;
      if (admits(layout[index]!)) return index;
    }
    return -1;
  };
  const pass = (
    takes: (type: ReturnType<typeof orderType>) => boolean,
    admits: (type: ReturnType<typeof orderType>, chair: ChairType) => boolean,
  ): void => {
    cards.forEach(({ slot }, card) => {
      if (seated.has(card)) return;
      const type = orderType(slot.card);
      if (!takes(type)) return;
      const chair = firstFree((one) => admits(type, one));
      if (chair >= 0) seat(card, chair);
    });
  };
  const typed = (type: ReturnType<typeof orderType>): boolean =>
    type !== 'wildcard' && type !== 'unsorted';
  // 1. Wildcard cards first, because only a Wildcard chair takes them.
  pass((type) => type === 'wildcard', (_type, chair) => chair === 'wildcard');
  // 2. A typed card in a chair of its own type.
  pass(typed, (type, chair) => chair === type);
  // 3. The typed cards left, in the Wildcard chairs left.
  pass(typed, (_type, chair) => chair === 'wildcard');
  // 4. The unsorted cards, typed chairs before Wildcard ones.
  pass((type) => type === 'unsorted', (_type, chair) => chair !== 'wildcard');
  pass((type) => type === 'unsorted', (_type, chair) => chair === 'wildcard');
  // 5. Whatever is left, in the first free chair the fit admits. Only a fit
  // wider than the plain rule seats anything here (MG12).
  cards.forEach(({ slot }, card) => {
    if (seated.has(card)) return;
    const chair = firstFree((one) => fit(slot.card, one));
    if (chair >= 0) seat(card, chair);
  });

  const reseated: OrderId[] = [];
  const returned: OrderId[] = [];
  cards.forEach(({ slot }, card) => (seated.has(card) ? reseated : returned).push(slot.card));
  return { slots, reseated, returned };
}

/**
 * **Seats a council again after its chairs were laid out afresh**: the malices
 * first (`reseatMalices`), then the Orders that sat in `previous`, by
 * `reseatOrders`. Writes `player.statecraft.slots`, which the caller has already
 * built to the new council's length, and the malices' chairs.
 *
 * The one seating an adoption does. `adoptGovernmentAt` calls it on the live
 * player, and `cardImpact.ts` on a ghost to price a charter, so the stamp on a
 * government card and the adoption it prices seat the same cards. Both hand
 * in the fit the old council granted (`chairFitFor`, Magisterial batch MG12).
 */
export function reseatCouncil(
  player: Player,
  previous: readonly (SlottedOrder | null)[],
  turn: number,
  fit: ChairFit = orderFitsSlot,
): { reseated: OrderId[]; returned: OrderId[] } {
  reseatMalices(player);
  const layout = slotTypesOf(player.statecraft);
  const held = layout.map((_, index) => maliceAt(player, index) !== null);
  const seating = reseatOrders(previous, layout, held, turn, fit);
  player.statecraft.slots = seating.slots;
  return { reseated: seating.reseated, returned: seating.returned };
}

/**
 * **Re-fits a council to the chairs its law now opens**, keeping what is sitting
 * in the chairs that survive.
 *
 * The seam a card that widens a government has to have, and the one thing that
 * separates it from `adoptGovernmentAt`'s rebuild: an adoption is a *chapter
 * break* that lays the chairs out afresh and re-seats the cards that fit them
 * (`reseatOrders`), while a chair opened mid-reign changes nothing about the
 * chairs already occupied — the types are the same government's, index for
 * index, and the new one, a Wildcard chair, is appended. So this is a resize
 * and not a rebuild, and a player who takes The King's Friends does not lose
 * the council they arranged.
 *
 * **Shrinking returns cards to the collection**, as an adoption returns a card
 * that fits no chair left: a card cannot sit in a chair that no longer exists,
 * and `PlayerStatecraft.orders` is the collection it came from, so the row is
 * still held and still slottable the moment there is somewhere to put it.
 * Nothing is lost and nothing is sealed — a seal is a promise about a chair.
 *
 * Called wherever the law that opens chairs changes mid-reign:
 * `adoptGovernmentAt` builds to `chairCount` directly and needs nobody's help,
 * and the leaders' first cut called this from the card a figure had just
 * drafted. **That second seam is gone** (L6a, `docs/flags.md` (xxxx)): a
 * figure's abilities are ordinary effects live from turn one, so a `slotRider`
 * one of them carries is already in the law when a government is adopted and
 * there is no moment left at which a council's size changes under a standing
 * reign — **except the first one**. `newPlayerStatecraft` builds every seat's
 * council to the chiefdom's bare spread before the state exists to read a
 * figure's law through, so `newGame` calls this once per seat after the rosters
 * are placed (the register's one entry): Ibn Battuta's fourth chair is open on
 * turn one, and the two chairs of the chiefdom keep their flavours. The rule
 * that a chair opened mid-reign is a resize and never a rebuild is the part
 * worth keeping, and the next seam that grants or withdraws a `slotRider` calls
 * this too.
 *
 * **The register of mid-game seams:** `newGame` (above), the commission that wins
 * a chair (`commissions.ts`), and, since batch DT9, `applyChooseDoctrine`
 * (`commands.ts`), because a Doctrine that opens a chair (The Council of Ten, The
 * Arthashastra) opens it at once and moves no seated card. A chair count that
 * waited for the next adoption would also leave the screen and a replay reading
 * different councils.
 */
export function refitSlots(state: GameState, player: Player): OrderId[] {
  const sc = player.statecraft;
  const want = chairCount(state, player.id, sc.government);
  if (want === sc.slots.length) return [];
  const returned: OrderId[] = [];
  while (sc.slots.length > want) {
    const dropped = sc.slots.pop();
    if (dropped && isOrderId(dropped.card)) returned.push(dropped.card);
  }
  while (sc.slots.length < want) sc.slots.push(null);
  // **And the malices take their chairs again**, for `adoptGovernmentAt`'s
  // reason exactly: a chair index is read off the seating, and a council that
  // shrank under a malice would leave one pointing at a chair that no longer
  // exists. Cheap and idempotent on a council that only grew.
  reseatMalices(player);
  // A council that shrank can send a malice back to a chair with a card in it
  // (batch DT11, Scutage). A chair holds one thing, so the card returns to the
  // collection, as `seatMalice` turns a card out.
  for (const held of player.malices) {
    const sitting = held.chair === undefined ? null : sc.slots[held.chair];
    if (!sitting || !isOrderId(sitting.card)) continue;
    returned.push(sitting.card);
    sc.slots[held.chair!] = null;
  }
  // A chair opened or closed is a chair the meters read through — an Order's
  // lines come and go with it (batch M3, `slate.ts`).
  bumpEconomy(state);
  // **A chair that closed may have held the card that widened the fit**
  // (Magisterial batch MG12, The Mixed Constitution). Then the council is
  // re-seated at once by the plain rule, and what fits no chair is returned
  // with the rest.
  if (returned.length > 0) returned.push(...settleCouncilFit(state, player));
  return returned;
}

/**
 * **The council a seat's ghost would have with or without one Doctrine**: its chairs
 * resized by the Doctrine's own `slotRider` rows, and its malices seated again in them.
 * Writes nothing.
 *
 * For the two scratch boards that price a Doctrine (`ghostPair` in
 * `cardImpact.ts`, `deckPair` in `value.ts`), through `ghostSeatUnderDoctrine`
 * below. Without it, a ghost holding The
 * Arthashastra would read its "last Wildcard chair" one chair too early, and
 * would claim to double a card that the real command leaves where it sits. Added
 * chairs go on the end and taken ones come off the end, as `refitSlots` does, and
 * a ghost stops at the typed chairs, as `chairCount` does. A card that loses its
 * chair this way stays in the ghost's collection, so Scutage reads it off its chair.
 *
 * The malices move because `refitSlots` moves them (batch DT19c). The counted chair
 * skips a chair a malice holds, so a ghost with a malice at its old index would count
 * a card the real command turns out. A card under a re-seated malice leaves its chair,
 * as `refitSlots` returns it. The ghost's malices are copies, because the seating
 * writes their chairs.
 */
export function ghostCouncilUnderDoctrine(
  player: Player,
  id: DoctrineId,
  taking: boolean,
): { slots: (SlottedOrder | null)[]; malices: Player['malices'] } {
  const sc = player.statecraft;
  let extra = 0;
  for (const effect of doctrineDef(id).effects) {
    if (effect.kind === 'slotRider') extra += effect.extra ?? 1;
  }
  if (extra === 0) return { slots: sc.slots, malices: player.malices };
  const want = Math.max(typedChairsOf(sc.government), sc.slots.length + (taking ? extra : -extra));
  const slots = sc.slots.slice(0, want);
  while (slots.length < want) slots.push(null);
  const malices = player.malices.map((held) => ({ ...held }));
  reseatMalices({ ...player, statecraft: { ...sc, slots }, malices });
  for (const held of malices) {
    if (held.chair !== undefined) slots[held.chair] = null;
  }
  return { slots, malices };
}

/**
 * **A seat's ghost with or without one Doctrine**, and which side of the pair the
 * ghost is. The two scratch boards that price a Doctrine ask it (`ghostPair` in
 * `cardImpact.ts`, `deckPair` in `value.ts`), so the card stamp and the bots
 * build the same ghost.
 *
 *   - A Doctrine the seat holds: the ghost gives it up, so the ghost is the board
 *     `without` it and the real board is the board with it.
 *   - A Doctrine the seat does not hold: the ghost takes it, so the ghost is the
 *     board `with` it. The ghost stamps it with this turn, as taking it would
 *     (batch DT1), so a "from now on" rule does not read the towns already founded.
 *
 * Either way the chairs and the malices are the ones the command would leave
 * (`ghostCouncilUnderDoctrine`), because a Doctrine that opens a chair opens it at
 * once (batch DT9). Writes nothing: the ghost seat and its statecraft are new
 * objects, and the arrays they share with the real seat are not written.
 */
export function ghostSeatUnderDoctrine(
  player: Player,
  id: DoctrineId,
  turn: number,
): { seat: Player; side: 'with' | 'without' } {
  const sc = player.statecraft;
  if (sc.doctrines.includes(id)) {
    const { slots, malices } = ghostCouncilUnderDoctrine(player, id, false);
    return {
      seat: {
        ...player,
        malices,
        statecraft: { ...sc, doctrines: sc.doctrines.filter((held) => held !== id), slots },
      },
      side: 'without',
    };
  }
  const { slots, malices } = ghostCouncilUnderDoctrine(player, id, true);
  return {
    seat: {
      ...player,
      malices,
      statecraft: {
        ...sc,
        doctrines: [...sc.doctrines, id],
        doctrineTurns: { ...sc.doctrineTurns, [id]: turn },
        slots,
      },
    },
    side: 'with',
  };
}
