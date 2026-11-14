/**
 * **The bot's council**: how a seat answers an offer, and which chair each of
 * its cards sits in.
 *
 * This file holds how a bot answers an Order, Doctrine, belief or discovery
 * offer, which of its held cards it seats in which chair, and how it weighs the
 * faces of a government's charter. Each of these prices a card with the same
 * appraisal (`explainCard`, near the end of this file), so a draft, a slotting
 * and an adoption cannot disagree about what one card is worth.
 *
 * It is a separate file from `bot.ts` because these decisions are about one
 * thing: the cards a seat holds and the chairs they sit in. The towns, the units
 * and the banks in `bot.ts` do not need them. Until batch S5 this code sat in
 * two places in `bot.ts`: inside the section of the entry point, and in the
 * section of the offers.
 *
 * It has a function-level import cycle with `bot.ts`, the kind that CLAUDE.md
 * allows. This file calls `seatContext`, and the `cardWorth` closure in
 * `valueContext` calls `explainCard`. Both calls are inside functions, and
 * every top-level statement here is a function, so the two files can load in
 * either order. `test/sim/aiModuleCycles.test.ts` loads each one first to
 * prove that.
 */

// `bot.ts` imports this file back. Each name from it is used only inside a
// function, so neither edge is read while the modules load.
import { type BotSitting, seatContext } from './bot';
import {
  type Appraisal,
  type BotCandidate,
  type BotDecision,
  type ValueTerm,
  appraise,
  foldTerms,
  nest,
  round as round1,
  unweighed,
} from './decision';
import { delayTerm } from './prices';
import {
  type CardReading,
  type ValueContext,
  // Bot batch BP3: the chair a stamped Order is read in on its stamp's board.
  cardStampChair,
  explainCardEffects,
  // Bot batch BP6: what an offered Order adds to the Doctrines still to come,
  // and what an open commission is worth for a turn of its chair.
  explainCommissionChair,
  explainDoctrineProgress,
  explainEffects,
  onDraftWorth,
  // Batch DT11: what a card already pays with no chair, under Scutage.
  orderPaysOffItsChair,
  // Batch DT9: what a chair that counts twice reads again.
  orderReadAgain,
  // Magisterial batch MG17: what the seat's cards pay for a pass.
  passRiderTerms,
} from './value';
import { expectedBestOrder } from './wants';

import { commissionProgress, commissionRewardWaits } from '../sim/commissions';
import { discoveryDef } from '../sim/discoveryData';
import { seatName } from '../sim/leaderData';
import { readEmpireRates } from '../sim/readings';
import {
  beliefPool,
  nextBeliefRerollCost,
  religionBeliefPool,
  rerollError,
  rerollKindFor,
} from '../sim/religion';
import type { BeliefId } from '../sim/religionData';
import type { GameState, Player } from '../sim/state';
import {
  SLOT_WORDS,
  anyCardDef,
  cardRareWeight,
  // Magisterial batch MG12: the fit a seat's council grants.
  chairFitFor,
  chairFitWithout,
  chairLayoutUnder,
  chairReadingsAt,
  draftCostFor,
  expectedHandBags,
  heldReligions,
  isSlotted,
  neverSeatedError,
  sealRemaining,
  sealTurnsFor,
  slotOrderError,
  slotTypesOf,
  unslotOrderError,
} from '../sim/statecraft';
import {
  type CardId,
  type ChairType,
  type DeckId,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  DECK_WORDS,
  doctrineDef,
  isDoctrineId,
  isOrderId,
  orderDef,
} from '../sim/statecraftData';

// --- the chairs: which held card sits where ---------------------------------

/**
 * **The best held card into the scarcest office it fits** — the scored slotting
 * (P3), where the v1 took the first pair the rules would accept.
 *
 * First-fit is wrong in exactly one way, and it is the way that costs an empire
 * its whole deck: a wildcard office takes *any* card, so a first-fit walk put
 * the first Order it held into the wildcard and then had nowhere to put the
 * military card it drew next. Two decisions come out of that:
 *
 *   · **the office's scarcity** — how many cards this empire holds that could go
 *     in an office of that type. A wildcard fits everything, so it is the least
 *     scarce office there is and it is spent **last**; a military office that
 *     only one held card fits is spent first, because nothing else can use it;
 *   · **the card's worth** — `scoreCard`, the same appraisal the drafts use, so
 *     a slotting and a draft cannot disagree about what a card is worth.
 *
 * One command per call, like every other arm: the best pair goes in, and the
 * next call re-asks the question on a board where that office is full. That is
 * what keeps it monotone (a slot that was empty is not), and it is also what
 * makes it *correct* — the second-best pair is re-scored against the deck the
 * first one left behind rather than fixed in advance.
 *
 * `slotOrderError` is the whole gate. A pair it accepts is a pair the command
 * accepts, and the refusals it gives (sealed, already slotted, wrong office) are
 * printed on the rows rather than restated as clauses here.
 */
export function slottingDecision(
  state: GameState,
  player: Player,
  sitting?: BotSitting,
): BotDecision | null {
  const sc = player.statecraft;
  const ctx = seatContext(state, player, sitting);
  const layout = slotTypesOf(sc);
  // The fit this seat's council grants (Magisterial batch MG12): while The
  // Mixed Constitution sits, every card fits every chair.
  const fit = chairFitFor(state, player.id);
  // How many held cards each office could take. Asked once for the whole table
  // rather than per pair, and it is the *scarcity* the placement sorts on. A
  // card that can never sit (a Boon, a charter, a met commission) is not
  // counted, since it could fill no chair (batch BP2).
  const seatable = seatableOrders(player);
  const fits = new Map<ChairType, number>();
  for (const type of layout) {
    if (fits.has(type)) continue;
    fits.set(type, seatable.filter((id) => fit(id, type)).length);
  }
  const rows: BotCandidate[] = [];
  let best: { cardId: OrderId; slot: number; row: number; score: number } | null = null;

  for (const ownedId of sc.orders) {
    for (let slot = 0; slot < layout.length; slot++) {
      const type = layout[slot]!;
      const label = `${cardName(ownedId)} → slot ${slot + 1} (${SLOT_WORDS[type]})`;
      const refusal = slotOrderError(state, player.id, ownedId, slot);
      if (refusal !== null) {
        rows.push({ label, score: 0, chosen: false, terms: [], rejected: refusal });
        continue;
      }
      const terms = slotPairTerms(player, ctx, ownedId, slot, type, fits.get(type) ?? 1);
      const score = foldTerms(terms);
      rows.push({ label, score, chosen: false, terms });
      if (best === null || score > best.score) {
        best = { cardId: ownedId, slot, row: rows.length - 1, score };
      }
    }
  }
  if (best === null) return null;
  rows[best.row]!.chosen = true;
  const type = layout[best.slot]!;
  return {
    kind: 'draft',
    command: { type: 'slotOrder', playerId: player.id, cardId: best.cardId, slotIndex: best.slot },
    subject: seatName(state, player.id),
    summary:
      `Puts ${cardName(best.cardId)} into slot ${best.slot + 1}, the ${SLOT_WORDS[type]} office — ` +
      'a card outside a slot is paying nothing, and the office fewest cards fit is filled first.',
    candidates: rows,
  };
}

/**
 * **What one card in one office is worth** — the slotting scorer, shared by the
 * three arms that place a card so they cannot disagree about one placement
 * (batch 8 made it a function; it was `slottingDecision`'s inline arithmetic).
 *
 * **The scarcer office wins the card**, and it is a *division* rather than a
 * penalty for a reason: what is being compared is value per contested office. A
 * wildcard six of this empire's cards would fit is worth a sixth of what it
 * looks like, because five other cards could have taken it; a military office
 * only one card fits is worth the whole card. A card twice as good as anything
 * else can still take the wildcard, which is right — scarcity is a tie-break
 * with teeth, not a veto.
 *
 * **A chair that counts twice adds the second reading after the division** (batch
 * DT9, The Arthashastra). The second reading is only paid in this chair, so no
 * other chair competes for it and scarcity has nothing to say about it. That
 * sends the card with the most to read again here first, however many cards fit
 * a Wildcard chair, while a card that is only yes-or-no rules gains nothing and
 * still goes to its own type's chair.
 *
 * **Under Scutage a chair adds only what the card does not already pay** (batch
 * DT11), so its pay off the chair comes off the card's worth. A card of flat lines
 * then has less claim on a chair than one of percentages, riders or rules.
 */
function slotPairTerms(
  player: Player,
  ctx: ValueContext,
  cardId: OrderId,
  slot: number,
  type: ChairType,
  fits: number,
): ValueTerm[] {
  const scarcity = Math.max(1, fits);
  const terms: ValueTerm[] = [nest('what the card is worth', seatPrice(player, cardId, ctx))];
  // **A stamped card is read in a chair already** (bot batch BP3): its stamp is
  // the books with it seated against the books with it held and not seated. So
  // what it pays with no chair under Scutage is already out of that figure, and
  // the chair it is read in is the one its stamp put it in.
  const stampChair = cardStampChair(ctx, cardId);
  const benched = stampChair === null ? orderPaysOffItsChair(cardId, ctx) : 0;
  if (benched !== 0) terms.push({ label: 'what it pays with no chair', value: -benched });
  terms.push({
    label: `÷ ${scarcity} — cards of this empire's that would also fit a ${SLOT_WORDS[type]} office`,
    value: scarcity,
    op: 'div',
  });
  const readsNow = stampChair === null ? 1 : chairReadingsAt(ctx.state, player.id, stampChair);
  const again = chairReadingsAt(ctx.state, player.id, slot) - readsNow;
  if (again !== 0) {
    terms.push({ label: 'what this chair reads again', value: again * orderReadAgain(cardId, ctx) });
  }
  return terms;
}

/**
 * **What one held card is worth in a chair**: its price (`explainCard`), or for
 * an open commission its chair price (`explainCommissionChair`, bot batch BP6,
 * `docs/flags.md` (ooooooo) B12). The three chair arms read it (`slotPairTerms`)
 * and so does a new government's chair fill (`adoptionTable`).
 *
 * A commission pays nothing while it sits and its reward once, so a chair reads
 * it as an investment: the reward over the turns of the chair it takes. No live
 * commission carries effects of its own. If one did, they would be priced
 * beside the chair price, by the walk.
 */
function seatPrice(player: Player, id: OrderId, ctx: ValueContext): Appraisal {
  const chair = explainCommissionChair(id, ctx);
  if (chair === null) return explainCard(player, id, ctx);
  const own = orderDef(id).effects ?? [];
  if (own.length === 0) return chair;
  return appraise([nest('its own effects', explainEffects(own, ctx, id)), nest('what its goal pays for the chair', chair)]);
}

/**
 * **Does a held commission wait off its chair with its goal met?** (bot batch
 * BP6, B12.) A reached goal grows with no chair and is checked only while its
 * card sits, so the card should take a chair on the turn the goal is met, not
 * on the next turn the arrangement is looked at (`isReseatTurn`). Its chair
 * price then reads the whole reward (`explainCommissionChair`), so the swap
 * below finds it. One walk of the seat's few commissions, read off the board.
 */
function metCommissionWaits(state: GameState, player: Player, seatable: readonly OrderId[]): boolean {
  const sc = player.statecraft;
  for (const id of seatable) {
    const spec = orderDef(id).commission;
    if (spec === undefined || isSlotted(sc, id)) continue;
    const parts = commissionProgress(state, player.id, id);
    if (parts.length === 0 || !parts.every((part) => part.met)) continue;
    if (commissionRewardWaits(state, player, spec)) continue;
    return true;
  }
  return false;
}

/**
 * **The arrangement, improved once a turn** — batch 8 of
 * `docs/bot-priorities.md`, and the half of the slot arm that never existed.
 *
 * `slottingDecision` fills an **empty** chair, so a card that arrived after the
 * chairs were full stayed on the bench for the rest of the game however good it
 * was. This is the other move: the best **swap** — a held card off the bench for
 * a card sitting in an unsealed chair it would outscore — and it is greedy in
 * the plainest sense the ruling asked for. One improvement, the single best one,
 * and silence when there is no strictly better arrangement.
 *
 * Four things make it safe to run every turn:
 *
 *   · **strictly better** (`>`), never merely equal, so two cards of the same
 *     worth cannot trade chairs for ever;
 *   · **the same scorer as the drafts** (`slotPairTerms`), which is what makes
 *     the second half of the move predictable: this arm empties the chair, and
 *     `slottingDecision` — running before it, and asked again the moment the
 *     board changes — fills it with the best card the same fold can find, which
 *     is the card this arm emptied it for or something better;
 *   · **one move a turn**, and it is derived rather than remembered: a slot
 *     sealed *this* turn is a slot something has already put a card into, and
 *     while one exists this arm stands down (`sealedThisTurn`). No stored state,
 *     principle 3;
 *   · **the seal is the gate's**. `unslotOrderError` is the command's own rule
 *     and it is what refuses a sealed chair — a sealed chair is not a choice, so
 *     it is not this arm's business to restate why.
 *
 * The one clause asked here rather than of a gate is whether the bench card
 * *fits* the office, and it is asked with the simulation's own predicate
 * (`chairFitWithout`, the fit the seat would have with that chair emptied, and
 * so the one the scarcity count walks unless the card leaving is The Mixed
 * Constitution, Magisterial batch MG12). `slotOrderError` cannot be asked of
 * an occupied chair — it refuses on the occupant before it ever looks at the
 * fit — so the honest reading is the predicate underneath it, and the slotting
 * that follows is held to the whole gate as always. The gate's card half,
 * `neverSeatedError`, needs no chair, so the bench is only the cards it admits
 * (`seatableOrders`, batch BP2): a Boon, a charter or a met commission is
 * never named for a chair it cannot take.
 *
 * What the re-seating that follows The Mixed Constitution's unslot costs is in
 * the card's own price (Magisterial batch MG17, `widerFitWorth` in
 * `value.ts`): the council its wide fit seats, less the council the plain fit
 * would seat in the same chairs. A bench card takes its chair only when it is
 * worth more than that, so the bot does not lose the cards only the wide fit
 * seated for a card worth less than they are.
 *
 * **The swap is looked for once a seal's length, not every turn** (bot batch
 * BP3). Every card here is priced by its stamp, one sweep of the empire's towns
 * a card, and a seat holding thirty cards would pay thirty sweeps a turn to learn
 * on most turns that nothing beats what sits. A card seated now cannot leave its
 * chair for a seal's length anyway, so the arrangement is looked at on one turn
 * in each seal's length, a different turn for each seat (`isReseatTurn`). A chair
 * left empty is filled on any turn (`slottingDecision`), and so is a chair that
 * counts twice (`moveToCountedChair`).
 *
 * **A met commission off its chair is looked for on any turn** (bot batch BP6,
 * `docs/flags.md` (ooooooo) B12). A reached goal grows without a chair and is
 * checked only while its card sits, so the turn the goal is met is the turn the
 * card should sit. `metCommissionWaits` asks that of the seat's few
 * commissions, and the chair price then reads the whole reward
 * (`explainCommissionChair`), so the swap below finds it.
 */
export function reslotDecision(
  state: GameState,
  player: Player,
  sitting?: BotSitting,
): BotDecision | null {
  const sc = player.statecraft;
  if (sealedThisTurn(state, player)) return null;
  const ctx = seatContext(state, player, sitting);
  const layout = slotTypesOf(sc);
  const fit = chairFitFor(state, player.id);
  // Only the cards that may sit, for the scarcity count and for the bench
  // (batch BP2). See `seatableOrders`.
  const seatable = seatableOrders(player);
  const fits = new Map<ChairType, number>();
  for (const type of layout) {
    if (fits.has(type)) continue;
    fits.set(type, seatable.filter((id) => fit(id, type)).length);
  }
  const rows: BotCandidate[] = [];
  if (!isReseatTurn(state, player) && !metCommissionWaits(state, player, seatable)) {
    return moveToCountedChair(state, player, ctx, layout, fits, rows);
  }
  let best: { cardId: OrderId; slot: number; row: number; gain: number } | null = null;

  for (let slot = 0; slot < layout.length; slot++) {
    const seated = sc.slots[slot];
    if (!seated) continue;
    const type = layout[slot]!;
    const refusal = unslotOrderError(state, player.id, slot);
    if (refusal !== null) {
      rows.push({
        label: `${cardName(seated.card)} keeps slot ${slot + 1} (${SLOT_WORDS[type]})`,
        score: 0,
        chosen: false,
        terms: [],
        rejected: refusal,
      });
      continue;
    }
    // The fit the bench card is held to once this chair is empty, which is
    // narrower when the card leaving is the one that widened it (MG12).
    const fitHere = chairFitWithout(state, player.id, slot);
    const challengers = seatable.filter((ownedId) => !isSlotted(sc, ownedId) && fitHere(ownedId, type));
    // **A chair no bench card fits is not priced** (bot batch BP3): nothing could
    // take it, so the seated card's price would decide nothing, and a price is
    // a stamp, one sweep of the empire's towns.
    if (challengers.length === 0) {
      rows.push({
        label: `${cardName(seated.card)} keeps slot ${slot + 1} (${SLOT_WORDS[type]})`,
        score: 0,
        chosen: false,
        terms: [],
        rejected: 'no card on the bench fits this chair',
      });
      continue;
    }
    const sittingTerms = slotPairTerms(player, ctx, seated.card, slot, type, fits.get(type) ?? 1);
    const sittingScore = foldTerms(sittingTerms);
    rows.push({
      label: `${cardName(seated.card)} keeps slot ${slot + 1} (${SLOT_WORDS[type]})`,
      score: sittingScore,
      chosen: false,
      terms: sittingTerms,
    });
    for (const ownedId of challengers) {
      const terms = slotPairTerms(player, ctx, ownedId, slot, type, fits.get(type) ?? 1);
      const score = foldTerms(terms);
      rows.push({
        label: `${cardName(ownedId)} takes slot ${slot + 1} from ${cardName(seated.card)}`,
        score,
        chosen: false,
        terms,
      });
      const gain = score - sittingScore;
      // Strictly better, and by the same fold on both sides — the whole of the
      // ruling's idempotence: an arrangement nothing beats produces no command.
      if (gain <= 0) continue;
      if (best === null || gain > best.gain) {
        best = { cardId: ownedId, slot, row: rows.length - 1, gain };
      }
    }
  }
  if (best === null) return moveToCountedChair(state, player, ctx, layout, fits, rows);
  rows[best.row]!.chosen = true;
  const seated = sc.slots[best.slot]!;
  return {
    kind: 'draft',
    command: { type: 'unslotOrder', playerId: player.id, slotIndex: best.slot },
    subject: seatName(state, player.id),
    summary:
      `Empties slot ${best.slot + 1}: ${cardName(best.cardId)} is worth ${round1(best.gain)} a turn more to ` +
      `this empire than ${cardName(seated.card)}, and the chair is out of its seal.`,
    candidates: rows,
  };
}

/**
 * **A seated card moves into an empty chair that counts twice** (batch DT9, The
 * Arthashastra). The other arms cannot do this: `slottingDecision` seats only the
 * bench, and the swap above only trades a bench card for a seated one. So a seat
 * with no bench would leave the chair it took the card for standing empty.
 *
 * It empties the seated card's chair, and `slottingDecision` then seats the card.
 * A move is made only when the same scorer prefers the card in the new chair, so
 * `slottingDecision` agrees, and the card does not go straight back. Nothing is
 * moved into a chair that is held, so two cards cannot trade places for ever.
 */
function moveToCountedChair(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  layout: readonly ChairType[],
  fits: ReadonlyMap<ChairType, number>,
  rows: BotCandidate[],
): BotDecision | null {
  const sc = player.statecraft;
  // The chair that counts twice is never one a malice holds (`chairIndexAtPosition`).
  const chair = layout.findIndex(
    (_type, index) => sc.slots[index] === null && chairReadingsAt(state, player.id, index) > 1,
  );
  if (chair < 0) return null;
  const type = layout[chair]!;
  let best: { from: number; card: OrderId; gain: number; row: number } | null = null;
  for (let from = 0; from < sc.slots.length; from++) {
    const seated = sc.slots[from];
    if (!seated || unslotOrderError(state, player.id, from) !== null) continue;
    if (!chairFitWithout(state, player.id, from)(seated.card, type)) continue;
    const here = foldTerms(slotPairTerms(player, ctx, seated.card, from, layout[from]!, fits.get(layout[from]!) ?? 1));
    const terms = slotPairTerms(player, ctx, seated.card, chair, type, fits.get(type) ?? 1);
    const gain = foldTerms(terms) - here;
    rows.push({
      label: `${cardName(seated.card)} moves from slot ${from + 1} to slot ${chair + 1}, which counts twice`,
      score: foldTerms(terms),
      chosen: false,
      terms,
    });
    if (gain > 0 && (best === null || gain > best.gain)) {
      best = { from, card: seated.card, gain, row: rows.length - 1 };
    }
  }
  if (best === null) return null;
  rows[best.row]!.chosen = true;
  return {
    kind: 'draft',
    command: { type: 'unslotOrder', playerId: player.id, slotIndex: best.from },
    subject: seatName(state, player.id),
    summary:
      `Empties slot ${best.from + 1}: ${cardName(best.card)} is worth ${round1(best.gain)} a turn more ` +
      `in slot ${chair + 1}, the chair that counts twice.`,
    candidates: rows,
  };
}

/**
 * **The held Orders that may take a chair**, in the order the seat holds them
 * (bot pass 3, batch BP2; `docs/flags.md` (ooooooo) B5).
 *
 * A Boon, a charter and a fulfilled commission never sit. The reducer refuses
 * them with `neverSeatedError`, the card half of `slotOrderError`, and this
 * asks the same function, so the bot holds no second copy of the rule. The
 * re-seat arm used to name such a card as the one that should take a chair:
 * it emptied the chair, the slot arm could not seat the card, and the old card
 * went straight back (35 of 302 logged unseatings in the audit, one seat every
 * five turns for 80 turns). The scarcity counts and a new government's chairs
 * counted them too.
 */
function seatableOrders(player: Player): OrderId[] {
  const sc = player.statecraft;
  return sc.orders.filter((id) => neverSeatedError(sc, id) === null);
}

/**
 * **Is this the seat's turn to look for a better arrangement?** One turn in each
 * seal's length (`sealTurnsFor`), offset by the seat's id so the six seats do not
 * all look on the same turn. Derived from the turn and nothing stored, as
 * `sealedThisTurn` is. A council with no seal looks every turn. See
 * `reslotDecision`.
 */
function isReseatTurn(state: GameState, player: Player): boolean {
  const every = sealTurnsFor(state, player.id);
  if (every <= 1) return true;
  return (state.turn + player.id) % every === 0;
}

/**
 * Has this empire sealed a slot **this very turn**? A derived reading, never a
 * flag: a card slotted now carries `sealedUntil = turn + sealTurnsFor`, so a
 * slot whose seal has its full length left is a slot somebody has just filled.
 */
function sealedThisTurn(state: GameState, player: Player): boolean {
  const full = sealTurnsFor(state, player.id);
  if (full <= 0) return false;
  for (const slot of player.statecraft.slots) {
    // **Exactly** the full length, which is what a seal stamped this turn reads.
    // Not "at least": a hand-arranged board, or a card that lengthened the seal
    // after the stamp, can carry a longer one, and a slot nobody touched this
    // turn must not stand this arm down.
    if (slot && sealRemaining(state, slot) === full) return true;
  }
  return false;
}

// --- a charter's faces, compared --------------------------------------------

/**
 * **The charter's three faces, compared** (P3) — where the v1 took face zero and
 * said so.
 *
 * A government is two things at once and both are scored: a **signature** (its
 * own effects, through `scoreCard`, which is the same appraisal every other card
 * class gets) and a **slot layout**, which is worth whatever this empire's held
 * cards would pay from inside it. The second half is the whole reason the v1
 * refused the comparison — "comparing layouts is a valuation of a whole empire's
 * card collection" — and the answer is that the collection is right there and
 * already priced: the layout is walked scarcest-office-first, greedily, and each
 * office takes the best held card still unspent.
 *
 * Greedy rather than optimal, deliberately: an exact assignment is a matching
 * problem over a handful of chairs and cards, and the difference between greedy
 * and optimal there is smaller than the difference between either and the
 * face-zero it replaces. Every held card is available: an adoption re-seats the
 * cards that fit the new chairs and lifts every seal (`reseatCouncil`), so the
 * council can be laid out afresh and nothing has to be excluded for being
 * already slotted. The fit is the simulation's own (`chairFitFor`), so a
 * Wildcard card is only ever priced into a Wildcard chair, unless The Mixed
 * Constitution sits in the old council (Magisterial batch MG12).
 */
export function adoptionTable(
  state: GameState,
  player: Player,
  options: readonly GovernmentId[],
  sitting?: BotSitting,
): { index: number; candidates: BotCandidate[] } {
  const ctx = seatContext(state, player, sitting);
  // The fit the old council grants, as the adoption reads it (Magisterial
  // batch MG12): while The Mixed Constitution sits, every card fits every
  // chair of the new government too.
  const fit = chairFitFor(state, player.id);
  // The cards that may sit (batch BP2): a Boon, a charter or a met commission
  // fills no chair of the new government either. See `seatableOrders`.
  const seatable = seatableOrders(player);
  const candidates: BotCandidate[] = [];
  let index = 0;
  let bestScore = -Infinity;
  for (let option = 0; option < options.length; option++) {
    const id = options[option]!;
    // The chairs the adoption would lay out, the ones this seat's Doctrines add or
    // close included (The Council of Ten, Scutage).
    const layout = chairLayoutUnder(state, player.id, id);
    // Scarcest office first, so the wildcard is spent on whatever is left —
    // `slottingDecision`'s rule, applied to a layout this empire does not have
    // yet. Ties by the layout's own order, which is data order.
    const offices = layout
      .map((type, at) => ({
        type,
        at,
        fits: seatable.filter((id) => fit(id, type)).length,
      }))
      .sort((a, b) => a.fits - b.fits || a.at - b.at);
    const spent = new Set<OrderId>();
    const slotTerms: ValueTerm[] = [];
    for (const office of offices) {
      let take: { id: OrderId; worth: number } | null = null;
      for (const ownedId of seatable) {
        if (spent.has(ownedId)) continue;
        if (!fit(ownedId, office.type)) continue;
        const worth = seatPrice(player, ownedId, ctx).total;
        if (take === null || worth > take.worth) take = { id: ownedId, worth };
      }
      if (take === null) {
        slotTerms.push({
          label: `a ${SLOT_WORDS[office.type]} office with nothing held that fits it`,
          value: 0,
        });
        continue;
      }
      spent.add(take.id);
      slotTerms.push({
        label: `a ${SLOT_WORDS[office.type]} office, which ${cardName(take.id)} would fill`,
        value: take.worth,
      });
    }
    const terms: ValueTerm[] = [
      nest('the charter’s own signature', explainCard(player, id, ctx)),
      { label: `what its ${layout.length} slot(s) would pay`, value: foldTerms(slotTerms), parts: slotTerms },
    ];
    const score = foldTerms(terms);
    candidates.push({ label: cardName(id), score, chosen: false, terms });
    if (score > bestScore) {
      bestScore = score;
      index = option;
    }
  }
  if (candidates.length > 0) candidates[index]!.chosen = true;
  return { index, candidates };
}

// --- the offers -------------------------------------------------------------

/**
 * Which card of an Order draft this bot takes: **the best-scoring one**, in the
 * one currency. Since bot batch BP6 the deck adds only a tie-break and the
 * progress toward the Doctrines still to come (`deckTerms`).
 *
 * This replaces the v0's label-counting, which could not tell +1💰 from +6💰
 * (see `scoreCard`). Ties go to the first index, which is draw order and
 * therefore part of the log.
 *
 * **The pass is priced** (batch 6 of `docs/bot-priorities.md`), and until it was
 * this arm carried a written-down non-delivery: *"pricing that trade needs a
 * reading of the bag the appraisal does not have"*. It has one now. The draft
 * plan's estimator (`expectedBestOrder`, `value.ts`) answers *what is the best
 * card a hand dealt from this pool would hold* over the real draw — the live
 * pool, the M/E/W guarantee, the rarity weights and the pity — and the pass is
 * the **difference one more rung of pity makes** to that, discounted by how long
 * the next meter takes to fill (re-folded 2026-09-09):
 *
 *     skip = (E[best at pity + 1] − E[best at pity]) × delayDiscount(next draft)
 *
 * It is a candidate in the same table as the cards, folded from printed terms
 * like every other, and it wins exactly when it outscores all of them. The
 * subtraction is the whole of the fix: the next hand is dealt either way, so
 * crediting a pass with all of it made a pass beat almost any card — seven hands
 * passed in a hundred and twenty turns where a person passes none.
 *
 * The pity is not free and the arithmetic knows it: `skipOrderOffer` spends the
 * hand on the table, so what the pass gives up is the very card the best
 * candidate is worth, and the comparison is between the two.
 */
export function orderDecision(state: GameState, player: Player, sitting?: BotSitting): BotDecision {
  const playerId = player.id;
  const offer = player.statecraft.pendingOrder;
  if (offer === undefined) {
    return {
      kind: 'draft',
      command: { type: 'chooseOrder', playerId, optionIndex: 0 },
      subject: seatName(state, player.id),
      summary: 'Takes the first option: there is no offer to read.',
      candidates: [],
    };
  }
  const ctx = seatContext(state, player, sitting);
  // The index is the *offer's*, so the list keeps its holes: `pickCard` skips an
  // absent option without shifting what an index names.
  const ids: (OrderId | undefined)[] = [...offer.options];
  const picked = pickCard(player, ids, ctx);
  const taken = ids[picked.index];
  const pass = skipCandidate(state, player, ctx);
  const best = picked.candidates.find((candidate) => candidate.chosen) ?? null;
  const candidates = [...picked.candidates, pass];
  if (best === null || pass.score > best.score) {
    if (best !== null) best.chosen = false;
    pass.chosen = true;
    return {
      kind: 'draft',
      command: { type: 'skipOrderOffer', playerId },
      subject: seatName(state, player.id),
      summary:
        `Passes the whole hand — one more rung of pity on the next deal is worth ` +
        `${round1(pass.score)} against ${round1(best?.score ?? 0)} for the best card on the table.`,
      candidates,
    };
  }
  return {
    kind: 'draft',
    command: { type: 'chooseOrder', playerId, optionIndex: picked.index },
    subject: seatName(state, player.id),
    summary:
      taken === undefined
        ? 'Takes the first option: there is no card to read.'
        : `Drafts ${cardName(taken)}, the best of ${picked.candidates.length} on what each would pay.`,
    candidates,
  };
}

/**
 * **The pass, as a candidate** — what one more rung of pity is worth, and
 * nothing else.
 *
 * **Re-folded 2026-09-09** (the user: *"sounds like we're valuing orders
 * incorrectly?"* — yes). This used to credit a pass with the *whole* of the next
 * hand, which is a comparison a card on the table can hardly ever win: the next
 * hand comes either way. What a pass actually buys is the **difference** the pity
 * makes to it — `expectedBestOrder(pool, size, skips + 1)` less the same estimate
 * at the pity this empire already has (`skipPity` raises the uncommon and rare
 * weights of the next deal, schema 63) — and what it costs is the whole card
 * forgone, which is the candidate it is compared against. So a pass wins exactly
 * when every card on the table is worth less than one rung of pity, and the bot
 * that passed seven hands in a hundred and twenty turns passes almost none.
 *
 * The estimator is the draft plan's own (`expectedBestOrder`), asked twice of the
 * pool this hand came out of. Two crudenesses ride along and both are the plan's,
 * said once more rather than fixed here: the pool it reads is the *live* one, so
 * the cards on the table are still in it (a pass does not remove them from the
 * bag — a skipped hand's cards can be dealt again), and the replacement a full
 * government would have to bench is not charged, because a pass benches nothing.
 *
 * The discount is unchanged: the pity is only collected at the *next* deal, so it
 * waits for the meter exactly as the hand did.
 *
 * **What the seat's pass riders pay is added** (Magisterial batch MG17), read
 * at this hand's own price (`passRiderTerms`, `value.ts`): The Unwritten
 * Chapter's science, for one. A rider that deals a free hand at once (The
 * Second Sitting, for a hand the seat paid culture for) changes what a pass
 * is: the next hand is dealt now, with the pity the pass raised, and is not
 * waited for. So the pass is then worth that hand's expected best card in
 * full, with no delay, and the pity is not counted again: picking from the
 * free hand spends it. No free hand opens while a Doctrine offer waits or
 * while the decks have nothing left to deal (`freeDraftCanOpen`'s clauses).
 */
function skipCandidate(state: GameState, player: Player, ctx: ValueContext): BotCandidate {
  const sc = player.statecraft;
  // The seat's own bags (the decks rework, D1a) — the standing hand's positions,
  // since one is on the table, and the pity read twice over the same shape.
  const bags = expectedHandBags(state, player);
  // The two readings below price the same cards, and a card's score is dear. Nothing
  // moves between them, so each card is priced once for this call.
  const scored = new Map<OrderId, number>();
  const score = (id: OrderId): number => {
    const held = scored.get(id);
    if (held !== undefined) return held;
    // A whole pool, so walked rather than stamped (bot batch BP3, `CardReading`).
    // Priced as the hand on the table is, with its deck terms (bot batch BP6).
    const fresh = explainDraftCard(player, id, ctx, 'walk').total;
    scored.set(id, fresh);
    return fresh;
  };
  const rare = cardRareWeight(state, player.id);
  const pitied = expectedBestOrder(bags, sc.orderSkips + 1, score, rare);
  const asIs = expectedBestOrder(bags, sc.orderSkips, score, rare);
  // The next draft's own wait: the whole of the next threshold over what the
  // meter fills at, because a pass spends the culture already banked for this one.
  // The threshold is the seat's own price, discounts included (Magisterial
  // batch MG5, `draftCostFor`).
  const rate = readEmpireRates(state, player.id).culturePerTurn ?? 0;
  const delay = draftCostFor(state, player, sc.drafts + 1) / Math.max(1, rate);
  const riders = passRiderTerms(ctx, sc.pendingOrder?.price);
  const freeHand = riders.freeHand && sc.pendingDoctrine === undefined && bags.length > 0;
  const terms: ValueTerm[] = freeHand
    ? [
        {
          label:
            `a free hand dealt at once — its best card is worth about ${round1(pitied)}, ` +
            `with ${sc.orderSkips + 1} pass${sc.orderSkips + 1 === 1 ? '' : 'es'} of pity`,
          value: pitied,
        },
      ]
    : [
        {
          label:
            `what one more pass of pity adds to the next hand — ${round1(pitied)} with ` +
            `${sc.orderSkips + 1} banked against ${round1(asIs)} with ${sc.orderSkips}`,
          value: pitied - asIs,
        },
        delayTerm(delay, ctx, 'the meter has to fill again'),
      ];
  for (const term of riders.terms) terms.push(term);
  return { label: 'pass the hand', score: foldTerms(terms), chosen: false, terms };
}

/**
 * **The best-scoring Doctrine of an adoption's offer, or a pass** (batch C3:
 * *"the bots take a Doctrine, priced by the existing effect scoring, or
 * pass"*). The offer is read through the same appraisal a draft is
 * (`pickCard`), and the best Doctrine is taken when it scores above nothing.
 * When none does — every Doctrine on the table costs this empire more than it
 * pays — the offer is passed: a pass costs nothing and buys nothing, and a
 * Doctrine is held for the whole game, so the bar is only that it is worth
 * holding.
 */
export function doctrineDecision(state: GameState, player: Player, sitting?: BotSitting): BotDecision {
  const playerId = player.id;
  const options = player.statecraft.pendingDoctrine?.options ?? [];
  const picked = pickCard(player, options, seatContext(state, player, sitting));
  const best = picked.candidates.find((candidate) => candidate.chosen) ?? null;
  if (options.length === 0 || best === null || best.score <= 0) {
    return {
      kind: 'draft',
      command: { type: 'skipDoctrineOffer', playerId },
      subject: seatName(state, player.id),
      summary:
        options.length === 0
          ? 'Passes: there is no Doctrine on the offer.'
          : 'Passes on the Doctrine offer: none of them is worth holding for the rest of the game.',
      candidates: picked.candidates,
    };
  }
  return {
    kind: 'draft',
    command: { type: 'chooseDoctrine', playerId, optionIndex: picked.index },
    subject: seatName(state, player.id),
    summary: `Takes ${cardName(options[picked.index]!)}, the best-scoring of the ${options.length} offered.`,
    candidates: picked.candidates,
  };
}

/**
 * The best-scoring god of a Consecrate's hand, or a follower bag's — **or the
 * free redeal, when the hand is a poor one** (batch H12).
 *
 * The reroll is the one verb in Statecraft this bot had never asked for, and the
 * ruling of 2026-09-07 (item i) is what made it worth asking: the pantheon's hand
 * **pays its rung at the deal**, and the *first* asking on any belief hand is free
 * (`explainBeliefRerollCost`). So a bad hand costs nothing to send back, and a
 * bot that never sent one back was leaving a free draw on the table every time
 * the ladder dealt it three gods it did not want.
 *
 * **The bar is the pool's own mean**, and it is deliberately the simplest honest
 * one. A fresh hand is several draws out of the same bag, so what it deals is at
 * *least* as good as one draw — the mean — and usually better; taking the redeal
 * only when the best card on the table falls below that mean is therefore a
 * comparison this bot cannot lose on average, without an expectation-of-the-
 * maximum over a bag whose draw weights are not the Order table's
 * (`expectedBestOrder` is typed to Orders and reads `orderDrawWeight`).
 * Deliberately not tuned by a knob: a free redeal of a below-average hand is not
 * a matter of taste.
 *
 * It fires **at most once per hand** by construction, which is what keeps the
 * driver's loop finite: `settleReroll` raises `BeliefOffer.rerolls`, the second
 * asking costs faith, and this arm only ever asks while the asking is free.
 */
export function beliefDecision(state: GameState, player: Player, sitting?: BotSitting): BotDecision {
  const playerId = player.id;
  const offer = player.pantheon.pending;
  const options = offer?.options ?? [];
  const ctx = seatContext(state, player, sitting);
  const picked = pickCard(player, options, ctx);
  const redeal = beliefRedeal(state, player, ctx, picked);
  if (redeal !== null) return redeal;
  return {
    kind: 'draft',
    command: { type: 'chooseBelief', playerId, optionIndex: picked.index },
    subject: seatName(state, player.id),
    summary:
      options.length === 0
        ? 'Takes the first option: there is no offer to read.'
        : `Takes ${cardName(options[picked.index]!)} — the best-scoring belief on offer.`,
    candidates: picked.candidates,
  };
}

/**
 * **Ask the gods again, for nothing** — `beliefDecision`'s other half, or `null`
 * when this hand is worth taking (or when asking again is not free).
 *
 * Every clause is the simulation's own, and the first two are the **belief
 * hand's own facts**: there is a hand on the table (`pantheon.pending`), and
 * `nextBeliefRerollCost` says this asking is free. `rerollError` is then the
 * gate the command is held to.
 *
 * The third clause is not about this hand and is the one worth reading twice.
 * `rerollOffer` is **one verb over four hands** and it answers the heaviest one
 * on the table (`rerollKindFor`): an Order draft, then a Doctrine draft, then
 * the belief hand, then a name. So a seat holding a Doctrine *and* a belief hand
 * that sent this command would be buying a **Doctrine** redeal, for faith, off
 * an arm that has decided nothing about Doctrines. This clause is what stops
 * that, and it is stated as "hold the redeal while a heavier hand stands"
 * rather than as "the verb happens to name us", because the precedence is the
 * interface's to change and the refusal is not.
 *
 * Holding costs nothing, which is why holding is the honest answer rather than
 * answering the Doctrine first: `firstBlocker` raises the *same* four hands in
 * the *same* order (`rerollKindFor`'s docblock says so out loud), and
 * `nextBotDecision` answers one blocker per step. A seat holding both therefore
 * takes its Doctrine on this step and reaches this arm on the next, with the
 * belief hand untouched and its first asking still free. The clause is a guard,
 * not a forfeit — but it *is* load-bearing, because nothing stops a caller
 * asking `beliefDecision` on a state the blocker loop has not walked down to.
 */
function beliefRedeal(
  state: GameState,
  player: Player,
  ctx: ValueContext,
  picked: { index: number; candidates: BotCandidate[] },
): BotDecision | null {
  const offer = player.pantheon.pending;
  if (offer === undefined || offer.options.length === 0) return null;
  if (nextBeliefRerollCost(state, player.id) > 0) return null;
  if (rerollKindFor(player) !== 'belief') return null;
  if (rerollError(state, player.id) !== null) return null;

  const pool = redealBag(state, player);
  if (pool.length === 0) return null;
  let sum = 0;
  for (const id of pool) sum += scoreCard(player, id, ctx);
  const mean = sum / pool.length;
  const best = picked.candidates.reduce((top, candidate) => Math.max(top, candidate.score), 0);
  if (best >= mean) return null;

  const candidates: BotCandidate[] = [
    ...picked.candidates.map((candidate) => ({ ...candidate, chosen: false })),
    {
      label: 'ask again — the first asking is free',
      score: mean,
      chosen: true,
      terms: [
        {
          label: `the mean of the ${pool.length} gods still in the bag, which a fresh hand deals at least`,
          value: mean,
        },
      ],
    },
  ];
  return {
    kind: 'draft',
    command: { type: 'rerollOffer', playerId: player.id },
    subject: seatName(state, player.id),
    summary:
      `Asks the gods again — the first asking on a hand is free, and the best god on this table is ` +
      `worth ${round1(best)} against ${round1(mean)} for an average draw from the bag.`,
    candidates,
  };
}

/**
 * **The bag the redeal would draw from** — the pantheon's own (`beliefPool`) or
 * the founded faith's remaining follower/enhancer rows (`religionBeliefPool`),
 * whichever hand is on the table.
 *
 * The simulation's two readings, asked rather than reimplemented: which one it is
 * is `BeliefOffer.pool`'s answer, exactly as `settleReroll` reads it when it
 * deals the replacement.
 */
function redealBag(state: GameState, player: Player): readonly BeliefId[] {
  const pool = player.pantheon.pending?.pool;
  if (pool === undefined) return beliefPool(state, player);
  const mine = heldReligions(state, player.id)[0];
  return mine === undefined ? [] : religionBeliefPool(mine, pool);
}

/**
 * Three boons from a ruin, and the bot takes the first one.
 *
 * The one offer this bot does not score, and it says so out loud rather than
 * pretending: a ruin's boons are a technology, a lump of gold and a piece, and
 * comparing those needs a valuation of the whole empire that nothing here has.
 * The candidates are still listed, so a reader can see exactly what was passed
 * over.
 */
export function discoveryDecision(state: GameState, player: Player): BotDecision {
  const offer = player.pendingDiscovery;
  const options = offer?.options ?? [];
  const decision: BotDecision = {
    kind: 'draft',
    command: { type: 'chooseDiscovery', playerId: player.id, optionIndex: 0 },
    subject: seatName(state, player.id),
    summary: 'Takes the first boon offered — this bot does not appraise a ruin’s three at all.',
    candidates: unweighed(options.map((id) => discoveryDef(id).name)),
  };
  if (offer !== undefined) decision.focus = { col: offer.col, row: offer.row };
  return decision;
}

/** The highest-scoring id of a plain list of options, ties to the first. */
function pickCard(
  player: Player,
  options: readonly (OrderId | DoctrineId | BeliefId | undefined)[],
  ctx: ValueContext,
): { index: number; candidates: BotCandidate[] } {
  const candidates: BotCandidate[] = [];
  let bestIndex = 0;
  let bestScore = -Infinity;
  let bestCandidate: BotCandidate | null = null;
  for (let index = 0; index < options.length; index++) {
    const id = options[index];
    if (id === undefined) continue;
    // A draft: the card's own price and the two small deck terms (bot batch BP6).
    const appraisal = explainDraftCard(player, id, ctx);
    const candidate: BotCandidate = {
      label: cardName(id),
      score: appraisal.total,
      chosen: false,
      terms: appraisal.terms,
    };
    if (appraisal.total > bestScore) {
      bestScore = appraisal.total;
      bestIndex = index;
      bestCandidate = candidate;
    }
    candidates.push(candidate);
  }
  if (bestCandidate !== null) bestCandidate.chosen = true;
  return { index: bestIndex, candidates };
}

// --- what one card is worth to the seat -------------------------------------

/**
 * How much this bot likes one card: **what it pays this empire**, in the one
 * currency.
 *
 * The valuation is `explainCardEffects` (`value.ts`), which reads magnitudes off
 * the row rather than counting labels. Since bot batch BP3 the effects term is
 * the card's stamp, the sim's own reading of the empire's books with the card
 * in place, plus what a stamp cannot see (`CardReading`).
 *
 * **No deck term** (bot batch BP6, `docs/flags.md` (ooooooo) B1). Until BP6 this
 * added 14 points (`score.synergyBonus`) for each held card of the card's deck,
 * with a seated card counted twice and no cap. The audit found that the bonus
 * decided 42% of Order picks and was 60% of a typical offered card's price
 * (`docs/audit/bot-pass-3-card-values.md`, fault 1), so two-deck seats held one
 * deck only, and commissions worth nothing were drafted. The user asked why a
 * greedy pick on correct prices would need it, and ruled it out. A seating, a
 * re-seating and a new government's chairs read this price alone. A draft reads
 * `explainDraftCard`, which adds two small deck terms.
 */
export function scoreCard(
  player: Player,
  id: CardId,
  ctx: ValueContext,
  reading: CardReading = 'stamp',
): number {
  return explainCard(player, id, ctx, reading).total;
}

/**
 * `scoreCard`'s arithmetic, labelled. See `decision.ts`.
 *
 * **Stamped unless a caller says otherwise** (bot batch BP3): an offer, a chair
 * and a council are decisions about this card, and the bot takes the card's
 * stamp as its pay now (`explainCardEffects`). A caller that prices a whole pool
 * asks for the walk (`CardReading`).
 */
export function explainCard(player: Player, id: CardId, ctx: ValueContext, reading: CardReading = 'stamp') {
  const def = anyCardDef(id);
  // The card is handed to the reader, not only its effects: a growing card's
  // count is a fact about *this holding* (`CountKind`'s `tally`), so an
  // appraisal that did not say which card it was reading would price a counter
  // twelve occasions deep exactly as it prices an empty one.
  // **`explainCardEffects`, not `explainEffects`** (batch F2 of
  // `docs/fewer-things-plan.md`): a row whose whole text is a multiplier on the
  // deck or on the shelves is priced by the difference the board itself reads
  // (`V(deck ∪ card) − V(deck)`), and every other row by the same walk as ever.
  const terms: ValueTerm[] = [
    nest('what its effects are worth', explainCardEffects(id, def.effects ?? [], ctx, reading)),
  ];
  // What drafting it hands over (Dominion batch D5): a card whose whole text
  // is a unit on the draft has no effects to price. A card the seat already
  // holds has handed its unit over, so the term is left out. Otherwise the
  // slotting scorer, which reads this appraisal too, would seat a card that
  // does nothing in a chair.
  const alreadyDrafted = isOrderId(id) && player.statecraft.orders.includes(id);
  const drafted = alreadyDrafted ? 0 : onDraftWorth(id, ctx);
  if (drafted !== 0) terms.push({ label: 'what drafting it hands over', value: drafted });
  return appraise(terms);
}

/**
 * **What one card is worth as a pick in a draft**: its own price
 * (`explainCard`) and the deck terms (`deckTerms`). The arms that take a card
 * into the collection read this: the Order, Doctrine and belief offers
 * (`pickCard`), the pass's estimate of the next hand (`skipCandidate`) and the
 * culture price's estimate of it (the `cardWorth` closure in `bot.ts`). So
 * the hand on the table and the hand it is compared with are priced alike.
 */
export function explainDraftCard(
  player: Player,
  id: CardId,
  ctx: ValueContext,
  reading: CardReading = 'stamp',
): Appraisal {
  const own = explainCard(player, id, ctx, reading);
  const deck = deckTerms(player, id, ctx, own.total);
  return deck.length === 0 ? own : appraise([...own.terms, ...deck]);
}

/**
 * **The deck terms of a pick** (bot batch BP6, `docs/flags.md` (ooooooo) B1).
 * Empty for a card of no deck (a common Order, a belief) and for an Order the
 * seat already holds, which is not being drafted.
 *
 * The ruled version, the default:
 *
 *   · **a tie-break** of at most `score.deck.tieBreak` (2) points: the points
 *     times the share of the seat's held cards (Orders and Doctrines) that
 *     share a deck with this one. Two cards that pay the same break toward the
 *     deck the seat holds more of, and no price moves by more than that;
 *   · **the progress toward the Doctrines still to come**, for an Order: what
 *     the card adds to a Doctrine of the seat's decks whose pay counts the
 *     seat's Orders (`explainDoctrineProgress`, `value.ts`). It is the one
 *     thing a single card's price cannot see.
 *
 * The cautious version, when `score.deck.sharePerCard` is above nought: the
 * card gains that share of its own price for each held card of its decks, at
 * most `score.deck.shareCap`, in place of both terms above. A card worth
 * nothing or less gains nothing. It is the audit's first fix, kept behind the
 * knob so the two versions can be measured side by side.
 */
function deckTerms(player: Player, id: CardId, ctx: ValueContext, own: number): ValueTerm[] {
  const decks = decksOf(id);
  if (decks.length === 0) return [];
  if (isOrderId(id) && player.statecraft.orders.includes(id)) return [];
  const knobs = ctx.ai.score.deck;
  const words = decks.map((deck) => DECK_WORDS[deck]).join(' or ');
  const shared = heldOfDecks(player, decks);
  if (knobs.sharePerCard > 0) {
    const share = Math.min(Math.max(0, knobs.shareCap), knobs.sharePerCard * shared);
    if (share <= 0 || own <= 0) return [];
    return [
      {
        label:
          `the deck share: ${shared} held card${shared === 1 ? '' : 's'} of the ${words} deck × ` +
          `${round1(knobs.sharePerCard * 100)}% of the card's own ${round1(own)}, at most ${round1(knobs.shareCap * 100)}%`,
        value: share * own,
      },
    ];
  }
  const terms: ValueTerm[] = [];
  const held = heldCards(player);
  if (shared > 0 && held > 0 && knobs.tieBreak !== 0) {
    terms.push({
      label: `the deck tie-break: ${shared} of the ${held} cards held are of the ${words} deck × ${round1(knobs.tieBreak)}`,
      value: (knobs.tieBreak * shared) / held,
    });
  }
  if (isOrderId(id)) {
    const progress = explainDoctrineProgress(id, ctx);
    if (progress !== null) terms.push(nest('progress toward the Doctrines its decks still offer', progress));
  }
  return terms;
}

/** A card's own printed name, for a candidate row. */
export function cardName(id: CardId): string {
  return anyCardDef(id).name;
}

/**
 * **The decks a card calls home**, or none.
 *
 * `decks` is a field on `OrderDef` and `DoctrineDef` rather than on
 * `CardDefBase`, because the other card classes (beliefs, rites, legacies,
 * malices, a leader's abilities) are not dealt from a deck. So the reading asks
 * the two classes that have one and answers nothing for the rest. A common
 * Order (no deck, in every seat's pool) belongs to no deck and gets no deck
 * term.
 */
function decksOf(id: CardId): readonly DeckId[] {
  if (isOrderId(id)) return orderDef(id).decks;
  if (isDoctrineId(id)) return doctrineDef(id).decks;
  return [];
}

/**
 * **The held cards that share a deck with the named decks**: each Order held,
 * seated or not, and each Doctrine taken, once. A card of two decks shares with
 * either, as the draw's pool does (`ordersForDecks`).
 */
function heldOfDecks(player: Player, decks: readonly DeckId[]): number {
  const sc = player.statecraft;
  const shares = (id: CardId): boolean => decksOf(id).some((deck) => decks.includes(deck));
  let count = 0;
  for (const id of sc.orders) if (shares(id)) count += 1;
  for (const id of sc.doctrines) if (shares(id)) count += 1;
  return count;
}

/** Every card the seat holds that the tie-break counts: its Orders and its Doctrines. */
function heldCards(player: Player): number {
  return player.statecraft.orders.length + player.statecraft.doctrines.length;
}
