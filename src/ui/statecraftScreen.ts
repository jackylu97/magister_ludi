/**
 * The Statecraft screen: your government, your slots, your Orders, your
 * Doctrines.
 *
 * The third full-screen overlay, and deliberately the *parchment* one. The star
 * chart is the table at night and the Abacus is the table in daylight; this is
 * the table covered in paper — a government's charter down the left with a row
 * of wax seals under it, and the collection spread out beside it like cards a
 * player is deciding between. It follows both of the others' shape exactly, and
 * since batch H5 it is built on the frame every parchment sheet shares
 * (`modalShell.ts`): `hidden` is the whole of the screen state, Escape closes it
 * and hands the keyboard back, the × and a press on the ground around the sheet
 * do the same, and opening it closes whatever else was up.
 *
 * The naming bible (Entry X) is load-bearing here and nowhere else in the
 * interface: the slottable cards are **Orders**, the permanent ones are
 * **Doctrines**, and the screen never says "policy" or "card" at the player.
 * The word "card" appears in this file only in identifiers. ("Civic" was on
 * the same list until the user made it the name of a card type, 2026-10-15.)
 *
 * Two panes, and the offices never leave
 * --------------------------------------
 * The user's note (2026-08-27): "you need to scroll far down to select an
 * order, then scroll back up to slot it". The screen used to be one column —
 * charter, offices, Doctrines, then sixty tall cards — and the two halves of its
 * only gesture were a page apart. It is now a **split**: the government's
 * offices are a fixed column on the left (the charter above them, the Doctrines
 * and the Confirm block below), and the hand scrolls in its own pane on the
 * right. A split rather than a sticky header because the office row is not a
 * *heading*, it is the other half of the click — a player picking a card is
 * looking at the offices the whole time, and a sticky bar tall enough to hold
 * card-shaped slots would have eaten the hand it was pinned above. On a short
 * viewport the hand scrolls and the offices do not move at all.
 *
 * An office was a **line** in that column until batch C1. It is a **chair**
 * now, as on the A3 board's council: the card in it is drawn as the A3 seated
 * card, with a plate under it naming the chair's type and carrying its seal.
 * Since batch C2 the chairs have types (Military, Economic, Civic, Wildcard),
 * and each chair is drawn in its type's ink: an empty chair keeps its ink, and
 * the Wildcard chair is purple. The chairs are built by `chairs.ts`, which the
 * flair gallery draws from as well.
 *
 * **The council is compact** (batch C2b): the seated card is drawn at three
 * quarters of the board's 120 × 186, three chairs to a row, so an eleven-chair
 * council is four rows (about 700px) rather than six rows of two (about
 * 1,300px). A strip that scrolled sideways was the other choice and was turned
 * down: seating a card means comparing it against every chair's type, and a
 * strip hides the chairs it has scrolled past. The column still scrolls on its
 * own when it must, and the collection beside it does not move.
 *
 * A hand is a working list
 * ------------------------
 * The cards in the collection are **compact**: the A3 row (the type's ink as a
 * stripe, the deck's suit, the rarity's small mark, the name, the deck and
 * tier) and then the clauses at reading size. The tarot proportion is a
 * *ceremony* and it stays where the ceremony is — the draft spread
 * (`offerCard.ts`), which is where a card is dealt and turned over. The hand is
 * where a player compares thirty of them, and thirty tarot plates is a scroll.
 * The card's frame is in its type's ink too. Since batch C1 an Order's face is
 * `suitFace.ts` (the suit shows the deck, the ink the type, the rank the
 * rarity), and `orderSuitFace` (`deckBadges.ts`) is where a row becomes one.
 *
 * A Doctrine wears a **heavier** frame — a gilt double rule — for the reason the
 * Doctrine offer does (`offerCard.ts`'s `weight`): adoption day is the one
 * irreversible thing a player does, and the two surfaces that show it agree on
 * what heavy looks like.
 *
 * The reveal is Confirm's
 * ------------------------
 * `docs/history/fewer-things.md` §1 ("The reveal") and §4, RULED 2026-09-06, in the
 * user's own words: *"don't show the yield until you confirm its placement in
 * the government — hit confirm, locking the card in its slot, aggregate yields
 * fire after hitting confirm"*. So a card laid in an office this session wears
 * the pending mark and no figure (`pendCardStamp`); a card the law already holds
 * wears its landed figure as it always did; and **Confirm is the scoring
 * ceremony** — the batch goes through, the fold runs in the evaluator's own
 * order (the base card lines, then the modifiers that read them), and the
 * aggregate counts up in its own band above the Doctrines while every card the
 * signature just made law lands its own stamp in the same beat.
 *
 * The aggregate's figure is `foldDeck` (`ledgerScreen.ts`) — the Ledger's
 * band-1 deck slice, which is the *banked* figure rather than a sum of eleven
 * marginal ghost-diffs. That function's docblock is where the reasoning lives;
 * what matters here is that the ceremony and the sheet read one function.
 *
 * Nothing is locked until you leave
 * ---------------------------------
 * The user's second note, and the reason `statecraftStaging.ts` exists:
 * "slots should only lock after leaving the menu". Slotting **seals** — the
 * reducer stamps `sealedUntil` the instant a card goes in — so laying out a
 * spread used to mean paying for each step of it as an experiment. Placing and
 * removing now edit a **local arrangement** and send nothing; the arrangement
 * becomes real on **Confirm**, or on leaving the screen by any door, which is
 * the same instruction said with the handle. **Revert** throws it away.
 *
 * The staging is per **seat** and is *discarded*, never committed, when the
 * chair changes: a hot-seat handover must not sign the previous player's law,
 * and `stagedSeat` is what makes that impossible rather than unlikely. The same
 * holds for `dispose` — the game it was an arrangement of no longer exists.
 *
 * One rule, one sentence
 * ----------------------
 * Every refusal a player can provoke here is the **reducer's own sentence**:
 * `placeError` and `removeError` (`statecraftStaging.ts`) *are* `slotOrderError`
 * and `unslotOrderError`, asked of the staged arrangement, and they are what
 * grey an office, what the tooltip says, what greys Confirm, and what the
 * reducer would answer if the command were sent anyway. There is no second
 * opinion in this file about what is legal.
 *
 * Ordered offices, and the word on one
 * ------------------------------------
 * `PlayerStatecraft.slots` is indexed by `slotLayout`, which lays the government's
 * chairs out grouped by type in `CHAIR_TYPES` order — so **the array index is
 * the position**, and this screen draws the column in array index order, which is
 * what makes "the first economic slot" a fact rather than an opinion (the Slot
 * order ruling, `docs/history/fewer-things.md` §1). The position word is printed on the
 * office line only when something in the empire's law could *read* a position —
 * `deckReadsSlotPosition`, which walks the slotted Orders' own effects for a
 * position-reading count. Today no card carries one and the word never shows; the
 * day batch A's shape lands, its member joins `POSITION_READING_COUNTS` and the
 * word appears wherever it now matters. A word printed unconditionally would be a
 * label for a rule the game does not have.
 *
 * Click, not drag
 * ---------------
 * Click a card in the collection to pick it up, click an office to put it down —
 * and click the card again to put it back. **A card already in an office is
 * picked up the same way**, which is the whole of rearranging: click it in the
 * collection, click another office of a flavour it fits, and the move is one more
 * unconfirmed placement through the same two staging verbs (`remove`, `place`).
 * The seal rules are untouched, because the refusal is `removeError`'s. Drag was
 * considered and dropped: it
 * needs a pointer, it needs a fallback for the keyboard anyway, and the gesture
 * this screen actually wants is *comparison* — hold one card against three
 * offices — which reads better as a selection than as a drag. The keyboard gets
 * the same two steps for free, because both halves are buttons.
 *
 * Derived, never stored
 * ---------------------
 * Nothing on this screen is state except the arrangement, which is a *proposal*
 * rather than a fact. The slot layout is `slotLayout(government)`, the seal
 * countdown is `sealedUntil − turn`, the collection is `statecraft.orders`, and
 * every number a card prints is `describeCard` at the level the empire holds it.
 */

import { commissionGoalNode } from './commissionGoal';
import { roundYield } from '../sim/yieldFormat';
import {
  type CardClause,
  type PlayerStatecraft,
  SLOT_WORDS,
  describeCard,
  draftExhausted,
  liveEffects,
  maliceAt,
  maliceChairRefusal,
  nextDraftCost,
  sealRemaining,
  slotTypesOf,
} from '../sim/statecraft';
import { maliceDef } from '../sim/maliceData';
import {
  type CardDefBase,
  type CardEffect,
  type CardId,
  type CountKind,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  type ChairType,
  CHAIR_TYPES,
  cardDef,
  doctrineDef,
  governmentDef,
  isDoctrineId,
  isOrderId,
  orderDef,
  orderFitsSlot,
} from '../sim/statecraftData';
import { chairMixOfLayout, chairMixWords, chairNode, chairWord, emptyChairNode } from './chairs';
import {
  cardStampNode,
  landCardStamp,
  pendCardStamp,
  playCardStamp,
  stampIsEmpty,
  stampReading,
} from './cardStamp';
import { DECK_LABEL, foldDeck, deckCaption } from './ledgerScreen';
import {
  type CardImpactSheet,
  type CardImpactSubject,
  cardImpactSheet,
  explainCardImpact,
} from '../sim/cardImpact';
import { CARD_LINE_NAME, cardLineMarkNode, lineOf } from './cardLine';
import {
  BAND_NUMERAL,
  DECK_SUIT,
  GENERIC_WORD,
  deckWord,
  doctrineFaceOf,
  orderChipsNode,
  orderSuitBadges,
  orderSuitFace,
} from './deckBadges';
import { dressSuitFace, suitGlyphNode, suitRowNode } from './suitFace';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import { createModalShell } from './modalShell';
import {
  type SlotCommand,
  type StagedSlots,
  changedOffices,
  diff,
  place,
  placeError,
  remove,
  removeError,
  sameChairs,
  stage,
  validate,
} from './statecraftStaging';
import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';
import { element } from './dom';

/**
 * The wax seal, and the empty slot's ghost of one.
 *
 * A glyph rather than an icon, for `figures.ts`' reason: the interface's
 * symbols are text so they inherit the type ramp and the ink colour, and an
 * empty slot showing the *same* shape at low contrast is what makes a row of
 * slots read as a row rather than as a list of unrelated boxes.
 */
const SEAL_GLYPH = '❖';

/**
 * The count shapes that read a **slot's position** — the register the position
 * word is gated on, and the whole of the gate.
 *
 * Empty today, and deliberately a list of the simulation's own `CountKind`
 * members rather than a boolean: the ruling is that a position word appears
 * *where a position engine could read it*, so what the screen has to know is
 * whether such a shape exists and whether this empire's law carries one. Batch A
 * adds the member (`docs/fewer-things-plan.md` row A, "the slot-position reader
 * over ordered slots"); adding it here is then the whole of the wiring, and the
 * compiler refuses a name the union does not have.
 */
const POSITION_READING_COUNTS: readonly CountKind[] = [];

/** Does this one effect read a slot's position? See the register above. */
function readsSlotPosition(effect: CardEffect): boolean {
  // Batch A shipped the position reader as a **modifier** (`slotPosition`),
  // not a count — "the Order in your first economic slot pays twice" reads a
  // chair, and a chair is not a thing an empire counts. The count list stays
  // for any future count that reads a position; today it is the modifier that
  // opens the word.
  if (effect.kind === 'slotPosition') return true;
  if (effect.kind !== 'pays' || effect.basis !== 'count' || effect.count === undefined) {
    return false;
  }
  return POSITION_READING_COUNTS.includes(effect.count);
}

/**
 * Does anything in this empire's law read a slot's position?
 *
 * Asked of the **slotted** Orders, because that is where a card's effects reach
 * the ledgers from (`liveEffects` walks `sc.slots`): a position reader sitting on
 * the bench changes nothing about what the offices are worth, and a column of
 * ordinals printed for a card nobody has slotted would be furniture.
 */
export function deckReadsSlotPosition(sc: PlayerStatecraft): boolean {
  for (const slot of sc.slots) {
    if (slot === null || !isOrderId(slot.card)) continue;
    for (const effect of orderDef(slot.card).effects) {
      if (readsSlotPosition(effect)) return true;
    }
  }
  return false;
}

/** `1st`, `2nd`, `3rd`, `11th` — the English rule, teens and all. */
function ordinal(rank: number): string {
  const teens = rank % 100;
  if (teens >= 11 && teens <= 13) return `${String(rank)}th`;
  return `${String(rank)}${['th', 'st', 'nd', 'rd'][rank % 10] ?? 'th'}`;
}

/**
 * What this office is called by **position**: "1st economic", "2nd wildcard".
 *
 * The rank is counted within the flavour and in array order, which is the
 * contract the sim's own reader will use — `slotLayout` groups by flavour and the
 * index is the position, so the topmost economic office is the first economic
 * office on every surface at once. Pure and exported, because an off-by-one here
 * would name every office one place too high and look perfectly reasonable.
 */
export function slotPositionWord(layout: readonly ChairType[], index: number): string {
  const type = layout[index];
  if (type === undefined) return '';
  let rank = 0;
  for (let at = 0; at <= index; at++) {
    if (layout[at] === type) rank++;
  }
  return `${ordinal(rank)} ${SLOT_WORDS[type]}`;
}

/**
 * The chair types a card fits, as a phrase: "a Military or Wildcard",
 * "an Economic or Wildcard", "a Military, Economic, Civic or Wildcard". The
 * article is the first word's.
 */
export function fitsWords(words: readonly string[]): string {
  if (words.length === 0) return 'no';
  const first = words[0]!;
  const article = /^[AEIOU]/.test(first) ? 'an' : 'a';
  if (words.length === 1) return `${article} ${first}`;
  return `${article} ${words.slice(0, -1).join(', ')} or ${words[words.length - 1]!}`;
}

export interface StatecraftScreen {
  readonly isOpen: boolean;
  open(): void;
  /**
   * Opens the sheet and brings this card into view in the collection, marked
   * for a moment. The commission chips' door (batch C).
   */
  openAt(card: OrderId): void;
  close(): void;
  toggle(): void;
  /** The state changed. Redraws if the screen is up; cheap enough to call always. */
  refresh(): void;
  dispose(): void;
}

export interface StatecraftScreenOptions {
  /** The full-screen overlay. Hidden with the `hidden` attribute while closed. */
  overlay: HTMLElement;
  /** The element the sheet's body is built into. */
  body: HTMLElement;
  /** The overlay's own × button. */
  closeButton: HTMLElement;
  /** The bar control that opens it, for the `aria-expanded` mirror. */
  trigger?: HTMLElement;
  /** The live game and the seat being looked at. Read on every draw. */
  getState: () => GameState;
  getPlayerId: () => number;
  /**
   * Sends the staged arrangement as one batch — every `unslotOrder`, then every
   * `slotOrder` (`statecraftStaging.ts`'s `diff` decides the order, because the
   * order is a rule rather than a convenience). Answers the refusal that stopped
   * the batch, or `null` when every command was taken.
   *
   * A batch rather than a command per gesture, because a gesture is no longer a
   * command: the screen never mutates state itself and now never sends until the
   * player has said so.
   */
  send: (commands: readonly SlotCommand[]) => string | null;
  /** Opens the banked government offer's card. */
  adopt?: () => void;
  /** Said in the manicule line — a refusal, in the reducer's own words. */
  onRefuse?: (message: string) => void;
  /** Called when this screen opens, so the others can close. */
  onOpen?: () => void;
}

/**
 * A card's clauses as a list, deferred ones struck through and said so.
 *
 * `linked` is the keyword ruling's middle clause (2026-08-28): a clause names
 * things, and the names are drawn bold either way — but a card face that is a
 * `<button>` picks the card when it is clicked, so a keyword inside one may not
 * be clickable as well. The caller knows which it built; `keywordsAllowedIn` is
 * the question it asks.
 */
function clauseList(clauses: readonly CardClause[], linked = true): HTMLElement {
  const list = element('ul', 'sc-clauses');
  for (const clause of clauses) {
    const item = element('li', clause.deferred ? 'sc-clause sc-clause-deferred' : 'sc-clause');
    setDescriptorText(item, clause.text, { linked });
    if (clause.deferred) item.title = 'Declared, and not built yet — see docs/deprecated/statecraft-cards.md';
    list.append(item);
  }
  return list;
}

/**
 * A wax stamp: the seal glyph and, when it is still set, the mono countdown.
 *
 * `sealRemaining` is the whole of the state; there is no countdown to tick (see
 * the seal trap in CLAUDE.md). An office holding a card this session merely
 * *staged* gets no stamp at all — nothing has sealed it, and a "free" chip on a
 * card the simulation has never seen would be the interface answering a question
 * about a thing that does not exist yet.
 */
function sealStamp(left: number): HTMLElement {
  const stamp = element('span', left > 0 ? 'sc-stamp sc-stamp-set' : 'sc-stamp');
  stamp.append(element('span', 'sc-stamp-glyph', SEAL_GLYPH));
  // Every number in this interface is tabular mono (the specimen's rule), and a
  // countdown is a number.
  stamp.append(element('span', 'sc-stamp-count', left > 0 ? String(left) : 'free'));
  stamp.title =
    left > 0
      ? `Sealed for ${left} more turn${left === 1 ? '' : 's'}`
      : 'The seal has lifted — click to take it out';
  return stamp;
}

/**
 * **A Doctrine's face**: the archetype thread's emblem and accent, the eyebrow,
 * the name and the clauses.
 *
 * It used to draw an Order as well, with the deck's emblem in place of the
 * thread's. Since batch C1 an Order wears the A3 face instead (`drawOrderFace`),
 * so this draws only the classes with no deck. A Doctrine carries `decks` too
 * (the empty list every row before the decks rework got), which is why the class
 * is decided by the caller and never read off the row's shape.
 *
 * **Compact**, and what that cost: the flavour line is off the hand's cards. It
 * is the one thing on a card that says nothing about what the card does, it is
 * a third of the card's height, and it is still read where it belongs — on the
 * offer that deals the card, which is the ceremony (`offerCard.ts`).
 *
 * `into` is filled rather than returned so the caller can decide whether the
 * card is an `<article>` or a `<button>`.
 */
function drawCardFace(
  into: HTMLElement,
  def: CardDefBase,
  eyebrow: string,
  clauses: readonly CardClause[],
): void {
  const id = lineOf(def);
  into.dataset.line = id;
  // The accent's own name, for the one thing a colour cannot do: say what it is.
  // The card's name alone where the thread has nothing to say.
  into.title = id === 'none' ? def.name : `${def.name} · ${CARD_LINE_NAME[id]}`;
  const head = element('div', 'sc-card-head');
  // The emblem is a **chip** in the eyebrow rather than a plate in the middle of
  // the card: the drawing is kept and the whitespace around it is what went.
  const emblem = cardLineMarkNode(id);
  emblem.classList.add('sc-card-emblem');
  head.append(emblem);
  head.append(element('span', 'sc-card-type', eyebrow));
  into.append(head);
  into.append(element('h4', 'sc-card-name', def.name));
  // A Doctrine's face is an `<article>` and an Order's is a `<button>`, which is
  // exactly the difference between "read this" and "pick this up" — and
  // therefore exactly the question the keyword rule asks.
  into.append(clauseList(clauses, keywordsAllowedIn(into)));
}

/**
 * **A deck's Doctrine on the shelf** (batch C3): `drawCardFace`'s shape, with
 * the deck's suit where the archetype thread's emblem would be, the deck and
 * tier in the eyebrow, and the deck's ink as the accent. A Doctrine takes no
 * chair, so it wears no chair ink. The offer draws the same face
 * (`doctrineFaceOf`).
 */
function drawDeckDoctrineFace(
  into: HTMLElement,
  id: DoctrineId,
  face: NonNullable<ReturnType<typeof doctrineFaceOf>>,
  clauses: readonly CardClause[],
): void {
  const def = doctrineDef(id);
  const decks = def.decks.map(deckWord).join(' · ');
  const tier = `Tier ${BAND_NUMERAL[def.band]}`;
  // Inked by its deck, as the offer draws it.
  into.dataset.line = face.line;
  into.title = `${def.name} · ${face.lineName}`;
  const head = element('div', 'sc-card-head');
  const emblem = suitGlyphNode(DECK_SUIT[def.decks[0]!]);
  emblem.classList.add('sc-card-emblem', 'sc-card-suit');
  head.append(emblem);
  head.append(element('span', 'sc-card-type', `${decks} · ${tier} · permanent`));
  into.append(head);
  into.append(element('h4', 'sc-card-name', def.name));
  into.append(clauseList(clauses, keywordsAllowedIn(into)));
}

/**
 * **An Order in the collection** (batch C1): the A3 row at its head, then the
 * charter's chip where the row is one, then the rules at reading size.
 *
 * The row is the board's: the type's ink as a stripe (and on the card's frame),
 * the deck's suit, the rarity's small mark, the name, and the deck and tier in
 * mono. A collection card is narrower than the board's list, so the marks and
 * the deck and tier share the first line and the name takes the second. The
 * rarity chip the collection used to print is gone, because the small mark says
 * the rarity; the charter keeps its chip, because "takes no chair" is the one
 * fact a player cannot read off the rules.
 */
function drawOrderFace(into: HTMLElement, id: OrderId, clauses: readonly CardClause[]): void {
  const def = orderDef(id);
  const face = orderSuitFace(id);
  into.classList.add('suit-entry');
  into.dataset.ink = face.ink;
  into.title = `${def.name} · ${face.caption}`;
  into.append(suitRowNode(face, def.name, true));
  const charter = orderSuitBadges(id);
  if (charter.length > 0) into.append(orderChipsNode(id, charter));
  into.append(clauseList(clauses, keywordsAllowedIn(into)));
}

export function createStatecraftScreen(options: StatecraftScreenOptions): StatecraftScreen {
  const { overlay, body, closeButton, trigger } = options;
  /**
   * The card in hand, or `null`. **Not state**: it is a fact about this
   * conversation — which card the player has picked up and not yet put down —
   * and it is cleared whenever the screen closes or the government changes.
   */
  let held: OrderId | null = null;
  /**
   * The arrangement the player is building, or `null` when there is nothing to
   * say beyond what the empire's law already says.
   *
   * A *proposal*, not state: it is a copy of `PlayerStatecraft.slots` with this
   * session's edits on it, and every question asked of it goes through the sim's
   * own evaluators (`statecraftStaging.ts`). It is re-taken from the live slots
   * on every draw while it is clean, so a seal that lifted between turns or a
   * card slotted by another route shows up immediately; once it is dirty it is
   * the player's and nothing overwrites it.
   */
  let staged: StagedSlots | null = null;
  /**
   * Whose arrangement it is. `-1` for nobody.
   *
   * The hot-seat guard, and the reason it is a field rather than an assumption:
   * an arrangement is a proposal by *one* player about *their* government, so
   * the chair changing throws it away rather than committing it. Every path that
   * could sign it — `commitStaging`, and therefore every close — checks this
   * first.
   */
  let stagedSeat = -1;
  /**
   * **The chairs the arrangement was laid out against**, one type per chair
   * (`slotTypesOf` when it was taken), or `null` with no arrangement.
   *
   * An arrangement is indexed by chair, so it means something only against the
   * chairs it was made for. An adoption can keep the count and change the types
   * (War Chief's five to Tyranny's five), and an arrangement carried across that
   * would put a card in a chair it does not fit. See `ensureStaging`.
   */
  let stagedChairs: readonly ChairType[] | null = null;
  /**
   * The cards **Confirm just made law**, waiting for their stamps to be played
   * once the redraw has put them back on the screen — and, with them, the
   * aggregate.
   *
   * **Not state**, and cleared the instant it is spent. It used to be the single
   * card that had just gone into an office; the reveal ruling moved the ceremony
   * from the drop to the signature (see the module docblock), so it is a list —
   * one signature can make three cards law, and they are weighed together
   * because that is what the aggregate is a fold of. A card already in force
   * reads its figure at rest (`landCardStamp`); a screen that replayed the
   * ceremony on every redraw would be a screen celebrating itself.
   */
  let justConfirmed: OrderId[] = [];
  /**
   * The counts still running, so the next draw can stop them.
   *
   * `playCardStamp` returns a canceller for the reason its docblock gives — a
   * timer left running against a detached tree is the bug every animation in
   * this interface has already had once — and this screen replaces its whole body
   * on every redraw, which a turn resolving mid-ceremony will do.
   */
  let counting: (() => void)[] = [];

  /** Stops every count still running. The start of a draw, and the way out. */
  function stopCounting(): void {
    for (const cancel of counting) cancel();
    counting = [];
  }

  /** Throws the arrangement away. Revert, seat changes, and the way out of a game. */
  function discardStaging(): void {
    staged = null;
    stagedSeat = -1;
    stagedChairs = null;
    held = null;
    justConfirmed = [];
  }

  /**
   * The arrangement this draw is about.
   *
   * Re-taken from the live slots whenever there is nothing staged, whenever the
   * seat has changed under it, and whenever **the chairs** have changed: their
   * number or the type of any one of them (`sameChairs`). An adoption rebuilds
   * the slots array and re-seats the cards that fit (`reseatCouncil`), and an
   * arrangement indexed into the old chairs would be putting cards in chairs
   * that no longer exist, or no longer take them.
   */
  function ensureStaging(sc: PlayerStatecraft, seat: number): StagedSlots {
    const chairs = slotTypesOf(sc);
    if (staged === null || stagedSeat !== seat || !sameChairs(stagedChairs, chairs)) {
      staged = stage(sc.slots);
      stagedSeat = seat;
      stagedChairs = chairs;
      held = null;
      return staged;
    }
    // Clean means "says exactly what the law says", so it costs nothing to
    // re-take it — and re-taking is what keeps a lifted seal current.
    if (changedOffices(sc.slots, staged) === 0) staged = stage(sc.slots);
    return staged;
  }

  /**
   * Signs the arrangement: the diff, as one batch, through the one seam.
   *
   * Called by Confirm and by **every** way out of the screen (the user's rule:
   * leaving locks it in). Silent and free when nothing was staged, which is the
   * common case — closing a screen you only read must not write a save.
   *
   * Validated once more against the live state before anything is sent, because
   * the game may have moved since the last draw (a turn resolved, a seal lifted,
   * another client played). If the batch is refused anyway — the one refusal an
   * evaluator cannot foresee is the reducer's seat guard, a seat that has ended
   * its turn — the caller's `send` reports it and the arrangement is re-synced
   * from the live state rather than left half-applied.
   *
   * Answers **the cards the signature made law** — every card this session
   * staged that is standing in an office afterwards. That is the ceremony's
   * guest list, and it is read back from the *live* slots rather than from the
   * proposal, so a batch the reducer stopped part-way celebrates only what
   * actually went through.
   */
  function commitStaging(): OrderId[] {
    const arrangement = staged;
    if (arrangement === null) return [];
    const state = options.getState();
    const seat = options.getPlayerId();
    // Somebody else's arrangement. Thrown away, never signed — see `stagedSeat`.
    if (stagedSeat !== seat) {
      discardStaging();
      return [];
    }
    const player = playerById(state, seat);
    if (!player) {
      discardStaging();
      return [];
    }
    const commands = diff(player.statecraft.slots, arrangement, seat);
    if (commands.length === 0) return [];
    const problem = validate(state, seat, arrangement);
    if (problem !== null) {
      options.onRefuse?.(problem);
      staged = stage(player.statecraft.slots);
      return [];
    }
    const proposed: OrderId[] = [];
    for (const entry of arrangement) {
      if (entry !== null && entry.staged) proposed.push(entry.card);
    }
    options.send(commands);
    // Whatever happened — every command taken, or a batch stopped part-way and
    // reported — the truth is now the live state's and the proposal is spent.
    const live = playerById(options.getState(), seat)?.statecraft.slots ?? [];
    staged = stage(live);
    return proposed.filter((card) => live.some((slot) => slot?.card === card));
  }

  function take(id: OrderId): void {
    held = held === id ? null : id;
    draw();
  }

  /**
   * Picks a card **out of its office** and into the hand — the first half of
   * rearranging.
   *
   * The same two verbs a fresh placement uses (`remove`, then `place` on the next
   * click), so a move is an unconfirmed placement like any other and Confirm
   * signs it as one batch. The refusal is `removeError`'s and nothing else: a
   * sealed card answers with the reducer's own sentence, countdown and all, which
   * is how the seal rules survive a gesture that never existed before.
   */
  function lift(id: OrderId): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const sc = playerById(state, seat)?.statecraft;
    if (!sc) return;
    const arrangement = ensureStaging(sc, seat);
    const index = arrangement.findIndex((entry) => entry?.card === id);
    if (index < 0) return;
    const problem = removeError(state, seat, arrangement, index);
    if (problem !== null) {
      options.onRefuse?.(problem);
      return;
    }
    staged = remove(arrangement, index);
    held = id;
    draw();
  }

  /**
   * A click on an office. Edits the arrangement; sends nothing.
   *
   * An occupied office is the *take it out* gesture, whether or not a card is in
   * hand: clicking a seal to lift it is the thing a player reaches for, and
   * making it depend on what else they were holding would be a mode. There is
   * deliberately no swap, because the reducer has none (see `SlotOrderCommand`).
   */
  function drop(index: number): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const sc = playerById(state, seat)?.statecraft;
    if (!sc) return;
    const arrangement = ensureStaging(sc, seat);
    // **A chair a malice holds answers even when the hand is empty** (batch G3).
    // The staged arrangement says the chair is null, so without this a click on
    // one would do nothing at all and the player would be left guessing why. The
    // sentence is the reducer's, like every other refusal on this screen.
    const player = playerById(state, seat);
    const malice = player === undefined ? null : maliceAt(player, index);
    if (malice !== null) {
      options.onRefuse?.(maliceChairRefusal(index, malice));
      return;
    }
    if (arrangement[index]) {
      const problem = removeError(state, seat, arrangement, index);
      if (problem !== null) {
        options.onRefuse?.(problem);
        return;
      }
      staged = remove(arrangement, index);
      draw();
      return;
    }
    if (held === null) return;
    const problem = placeError(state, seat, arrangement, held, index);
    if (problem !== null) {
      options.onRefuse?.(problem);
      return;
    }
    staged = place(arrangement, index, held, state.turn);
    // No ceremony here, deliberately: the figure is Confirm's (the reveal
    // ruling). What the office wears until then is the pending mark.
    held = null;
    draw();
  }

  /** The government's charter: what it is, what it is worth, what it opened. */
  function drawGovernment(sc: PlayerStatecraft): HTMLElement {
    const block = element('section', 'sc-government');
    const def = governmentDef(sc.government);
    block.append(element('p', 'eyebrow sc-eyebrow', 'your government'));
    block.append(element('h3', 'sc-gov-name', def.name));
    // Labelled, for the Compendium's stated reason (copy pass, 2026-08-28): the
    // charter's clauses follow immediately in the same column, and an
    // unlabelled italic above them reads as the first of them.
    const flavor = element('p', 'sc-flavor');
    flavor.append(element('span', 'flavor-label', 'Flavour'));
    flavor.append(document.createTextNode(def.flavor));
    block.append(flavor);
    const clauses = describeCard(sc.government);
    if (clauses.length === 0) {
      // The chiefdom, and the honest thing to say about it: it is where a game
      // starts rather than a thing anybody chose.
      block.append(element('p', 'sc-none', 'No signature — the fire, and whoever speaks last at it.'));
    } else {
      block.append(clauseList(clauses));
    }
    return block;
  }

  /** Tier, basket and the turns to the next draft. The ladder in one line. */
  function drawProgress(state: GameState, sc: PlayerStatecraft, seat: number): HTMLElement {
    const line = element('p', 'sc-progress');
    const player = playerById(state, seat)!;
    // The seat's own price, discounts included (Magisterial batch MG5, The
    // Open Door), so the meter and the line below print what the pool pays.
    const cost = nextDraftCost(state, player);
    // Rounded at the eye (batch X): the pool is exact, the meter reads whole.
    const banked = Math.max(0, roundYield(player.culturePool));
    line.append(element('span', 'sc-tier', `Tier ${sc.drafts}`));
    line.append(element('span', 'sc-sep', '·'));
    const meter = element('span', 'sc-meter', `${banked}/${cost}`);
    meter.setAttribute('data-glyph', 'culture');
    line.append(meter);
    // The bar is the same fold the number is, so a player reading either reads
    // the same fact.
    const track = element('span', 'sc-track');
    const fill = element('span', 'sc-track-fill');
    fill.style.width = `${Math.min(100, Math.round((banked / Math.max(1, cost)) * 100))}%`;
    track.append(fill);
    line.append(track);
    // Deliberately no "next draft in N turns": culture per turn is a fact about
    // every city's yield and would be a second implementation of `collectYields`
    // living on a screen. The top bar's culture chip quotes the rate, which is
    // where the rate belongs; this says how far there is to go.
    line.append(element('span', 'sc-sep', '·'));
    line.append(
      element('span', 'sc-next', `next tier costs ${cost}`),
    );
    return line;
  }

  /** The banked triple, said out loud until it is claimed. */
  function drawPendingGovernment(sc: PlayerStatecraft): HTMLElement | null {
    const offer = sc.pendingGovernment;
    if (!offer) return null;
    const banner = element('section', 'sc-banner');
    banner.append(
      element('p', 'sc-banner-title', 'A new charter is ready to be sworn.'),
      element(
        'p',
        'sc-banner-body',
        `Tier ${offer.tier} offers ${offer.options
          .map((id: GovernmentId) => governmentDef(id).name)
          .join(', ')} — adopting lays out new chairs, keeps your Orders in their chairs where they still fit, and lifts every seal.`,
      ),
    );
    if (options.adopt) {
      const button = element('button', 'btn btn-primary sc-banner-button', 'Choose a government');
      (button as HTMLButtonElement).type = 'button';
      button.addEventListener('click', () => options.adopt?.());
      banner.append(button);
    }
    return banner;
  }

  /**
   * **The exhausted pool** (D1a; the design doc's rule 7): the meter is full
   * and the seat's decks have no card left to deal, so no draft is charged and
   * the culture stays banked. Said here because the draft sheet never opens
   * for a hand that cannot be dealt — this is the honest face of an empty
   * shelf, and in D1a, with every pre-rework row retired and no new rows yet,
   * it is every seat's face.
   */
  function drawExhausted(state: GameState, seat: number): HTMLElement | null {
    const player = playerById(state, seat);
    if (!player || !draftExhausted(state, player)) return null;
    const banner = element('section', 'sc-banner sc-banner-exhausted');
    banner.append(element('p', 'sc-banner-title', 'Your decks are exhausted.'));
    banner.append(
      element(
        'p',
        'sc-banner-body',
        'The culture meter is full, but you already hold every card your decks can offer at your current band. ' +
          'No draft is charged; the culture stays banked until there is a card to deal.',
      ),
    );
    return banner;
  }

  /**
   * **The council**: one chair per slot, with what is in it and its seal.
   *
   * A chair is drawn as on the A3 board's council (batch C1, typed in C2): the
   * card in it as the A3 seated card, compact (see the module docblock), and a
   * plate under it naming the chair's type in its ink, with the seal beside
   * the plate. An empty chair is a dashed outline in its type's ink with the
   * ghost of a card in it and the type's mark inside the ghost, so the column
   * reads as a row of typed places before any of the words are read.
   *
   * **While a card is in hand**, the chairs it fits are lit and every empty
   * chair it does not fit is dimmed and says so. Both are the reducer's own
   * answer about the staged arrangement (`placeError`, which is
   * `slotOrderError`): the dimmed chair's tooltip is the reducer's sentence, and
   * clicking it says the same sentence in the manicule line (`drop`).
   */
  function drawSlots(
    state: GameState,
    sc: PlayerStatecraft,
    seat: number,
    arrangement: StagedSlots,
  ): HTMLElement {
    const block = element('section', 'sc-slots');
    // **`slotTypesOf` and never `slotLayout`**: the government lays out the
    // chairs it opens and the *law* may open more (`CardSlotRiderEffect`), which
    // `PlayerStatecraft.slots`' own length carries. A column drawn from the
    // government alone would simply not draw The King's Friends' chair.
    const layout = slotTypesOf(sc);
    // The seat itself, for the one thing that is not in the statecraft record: a
    // malice holds a chair from `Player.malices` (batch G3, `maliceAt`).
    const player = playerById(state, seat);
    block.append(element('p', 'eyebrow sc-eyebrow', `council · ${layout.length} chairs`));
    // The council's types in words, under the heading: the plates say each
    // chair's type, and this says the whole mix at a glance.
    block.append(element('p', 'sc-council-mix', chairMixWords(chairMixOfLayout(layout))));
    const row = element('div', 'sc-slot-row');
    // Whether the *position* of an office is a fact anything reads. See
    // `deckReadsSlotPosition` and the module docblock: the word is printed where
    // a position engine could read it, and nowhere else.
    const positions = deckReadsSlotPosition(sc);
    // **Array index order**, which is the position order — `slotLayout` groups the
    // chairs by type, so the topmost economic chair is the first economic chair
    // and the column and the sim agree without either being told.
    layout.forEach((type, index) => {
      const filled = arrangement[index] ?? null;
      // **The chair a malice holds** (batch G3, `docs/wager.md` §4). It is asked
      // of the *live* seat rather than of the arrangement, because nothing this
      // session does can move one: a malice is not staged, not slotted and not
      // unslottable, so the staging layer has nothing to say about it.
      const malice = player === undefined ? null : maliceAt(player, index);
      // The reducer's answer for the card in hand, asked once per chair: `null`
      // is a chair that takes it, and anything else is the sentence it refuses
      // with. Asked only of an empty chair, because an occupied chair's click is
      // the *take it out* gesture whatever is in hand.
      const empty = filled === null && malice === null;
      const refusal = held !== null && empty ? placeError(state, seat, arrangement, held, index) : null;
      let card: HTMLElement;
      if (malice !== null) {
        // **The bad face.** A chair a malice holds is not empty and is not
        // takeable: it is drawn struck through in vermilion, wears the malice's
        // own name, and says in the reducer's own sentence why it will not move
        // (`maliceChairRefusal` — the tooltip and the rejection are one string,
        // which is this screen's oldest promise).
        card = element('span', 'sc-chair-card sc-chair-malice');
        const struck = element('span', 'sc-slot-struck', '✕');
        struck.setAttribute('aria-hidden', 'true');
        card.append(struck, element('span', 'sc-slot-card', maliceDef(malice).name));
      } else if (filled) {
        // The card in the chair, as the A3 seated card: the same suit, ink and
        // rank it wears in the hand and in the collection beside it.
        card = element('span', 'sc-chair-card');
        const name = element('span', 'sc-slot-card suit-name', isOrderId(filled.card) ? orderDef(filled.card).name : String(filled.card));
        if (isOrderId(filled.card)) dressSuitFace(card, orderSuitFace(filled.card), 'seat', [name]);
        else card.append(name);
      } else {
        // An empty chair keeps its ink. With a card in hand that does not fit
        // it, it says so in two words; the reason is the tooltip, below.
        card = emptyChairNode(type, refusal !== null ? 'won’t fit' : 'empty');
      }
      const { button, foot, plate } = chairNode(type, card);
      // The one hint while a card is in hand, and it is the reducer's own answer
      // about the *staged* arrangement rather than a guess about the live one:
      // a chair this session emptied will take a card, and the highlight says
      // so before the arrangement is signed.
      if (held !== null && empty && refusal === null) button.classList.add('sc-slot-open');
      // An empty chair the card in hand does not fit: dimmed, and marked as
      // refusing for the reading that has no colour in it.
      if (refusal !== null) {
        button.classList.add('sc-slot-refuses');
        button.setAttribute('aria-disabled', 'true');
      }
      if (filled) button.classList.add('sc-slot-filled');
      // What this session changed about this office — a card put in, or one
      // taken out. Both are "unconfirmed", and both are drawn as such.
      const moved = (sc.slots[index]?.card ?? null) !== (filled?.card ?? null);
      if (moved) button.classList.add('sc-slot-staged');
      // The eyebrow, and only where it means something. Every number in this
      // interface is tabular mono, an ordinal included.
      if (positions) {
        plate.append(element('span', 'sc-slot-position', slotPositionWord(layout, index)));
      }
      if (malice !== null) {
        button.classList.add('sc-slot-malice');
        button.title = `${maliceChairRefusal(index, malice)} — ${maliceDef(malice).note}`;
      } else if (filled) {
        if (filled.staged) {
          // Nothing has sealed it — see `sealStamp`. The chair's rim says it is
          // unconfirmed and the Confirm block counts it.
          button.title = `${orderDef(filled.card).name} — unconfirmed`;
        } else {
          const stamp = sealStamp(sealRemaining(state, filled));
          button.title = stamp.title;
          foot.append(stamp);
        }
      } else if (held !== null) {
        // The refusal, before it is provoked: the same sentence the reducer
        // would answer with, so the tooltip and the rejection are one string.
        button.title = refusal ?? `Seat ${orderDef(held).name} in this ${chairWord(type)} chair`;
      } else {
        button.title = `An empty ${chairWord(type)} chair`;
      }
      button.addEventListener('click', () => drop(index));
      row.append(button);
    });
    block.append(row);
    // The other half of "which chair": the column lights what will take the
    // card (`sc-slot-open`, which is the reducer's own answer), and this says in
    // words what is in hand. A highlight with no sentence is a colour a player
    // has to guess the meaning of.
    if (held !== null) {
      const card = held;
      // Which chairs will take it, asked of `orderFitsSlot` rather than spelled
      // out — a military card fits military *or* wildcard, a wildcard card fits
      // only wildcard, and an unsorted card fits all four.
      const fits = CHAIR_TYPES.filter((type) => orderFitsSlot(card, type)).map((type) => chairWord(type));
      const hint = element('p', 'sc-hand');
      hint.append(element('span', 'sc-hand-name', orderDef(card).name));
      hint.append(
        element(
          'span',
          'sc-hand-say',
          `in hand — it fits ${fitsWords(fits)} chair. Seat it in an empty one, or click it again to put it back.`,
        ),
      );
      block.append(hint);
    }
    return block;
  }

  /**
   * **The aggregate** — what your cards pay you, in one figure per voice.
   *
   * The scoring ceremony's band (`docs/history/fewer-things.md` §4, RULED): it stands
   * quietly at rest and **counts up on Confirm**, which is the one moment the
   * number changed by something the player just did. The figure is
   * `foldDeck`, the Ledger's own deck slice, so the band and the sheet
   * cannot disagree — see the module docblock.
   *
   * It sits at the **head of the Confirm block**, which is the column's pinned
   * foot: the office column scrolls, and a ceremony that fired above the fold
   * would be a ceremony half the viewports never see. The figure is directly
   * over the button that fires it, which is also the plainest way to say what
   * the button is for.
   *
   * It is drawn whether or not there is a figure: a deck that pays nothing yet
   * says so, because that is the sentence a first draft is about to change and an
   * absent band would be one the player never sees change.
   */
  function drawAggregate(state: GameState, seat: number): HTMLElement {
    const block = element('section', 'sc-aggregate');
    block.append(element('p', 'eyebrow sc-eyebrow', DECK_LABEL));
    const reading = foldDeck(state, seat);
    if (stampIsEmpty(reading)) {
      // No seat at all rather than a seat wearing the flourish: a flourish means
      // "not weighed yet", and this one has been weighed and came to nothing.
      block.append(element('p', 'sc-none', 'Nothing yet. A card pays from the office it sits in.'));
      return block;
    }
    // No `data-line`: the aggregate is not a card and has no archetype, so the
    // stamp falls back to the sheet's own ink (`--stamp-ink`'s second term).
    const stamp = cardStampNode();
    block.append(stamp);
    if (justConfirmed.length > 0) counting.push(playCardStamp(stamp, reading));
    else landCardStamp(stamp, reading);
    // The whole band in words, for the reading that has no glyphs in it.
    block.title = deckCaption(reading);
    return block;
  }

  /**
   * Confirm, Revert, and the count of what is unconfirmed.
   *
   * The only place on this screen that writes to the simulation. Confirm is
   * greyed with nothing staged and greyed again when the arrangement would be
   * refused — with the reducer's own sentence printed under it, because a
   * disabled button that will not say why is the interface keeping a secret.
   */
  function drawCommit(
    state: GameState,
    sc: PlayerStatecraft,
    seat: number,
    arrangement: StagedSlots,
  ): HTMLElement {
    const block = element('div', 'sc-commit');
    block.append(drawAggregate(state, seat));
    const changes = changedOffices(sc.slots, arrangement);
    const problem = changes === 0 ? null : validate(state, seat, arrangement);
    const row = element('div', 'sc-commit-row');
    const confirm = element('button', 'btn btn-primary sc-confirm', 'Confirm') as HTMLButtonElement;
    confirm.type = 'button';
    confirm.disabled = changes === 0 || problem !== null;
    // The gilt rim: an arrangement that is real is a plain button, one that is
    // only proposed wears the same gilt the irreversible cards do. It cannot be
    // mistaken for saved.
    if (changes > 0) confirm.classList.add('is-unconfirmed');
    confirm.title =
      problem ?? (changes === 0 ? 'Nothing to confirm' : 'Seal the arrangement — this is what leaving does');
    confirm.addEventListener('click', () => {
      // **The ceremony is here and nowhere else** (the reveal ruling): the batch
      // goes through first, so the fold the aggregate counts is the fold of the
      // law as it now stands — base card lines, then the modifiers that read
      // them, in the evaluator's own order. Only then does the redraw play it.
      justConfirmed = commitStaging();
      draw();
    });
    row.append(confirm);
    const revert = element('button', 'btn btn-quiet sc-revert', 'Revert') as HTMLButtonElement;
    revert.type = 'button';
    revert.disabled = changes === 0;
    revert.title = 'Put the offices back the way the law has them';
    revert.addEventListener('click', () => {
      staged = stage(sc.slots);
      stagedSeat = seat;
      stagedChairs = slotTypesOf(sc);
      held = null;
      draw();
    });
    row.append(revert);
    block.append(row);
    if (changes > 0) {
      block.append(
        element(
          'p',
          'sc-commit-note',
          `${changes} unconfirmed change${changes === 1 ? '' : 's'}`,
        ),
      );
    }
    // The refusal wears `wanting` — a seal that has not lifted, an office that
    // will not take the card, is a condition this law has not met, and the user's
    // ruling of 2026-09-08 puts every such line in the one vermilion italic.
    // `sc-commit-problem` kept the layout and gave up its own colour for it.
    if (problem !== null) block.append(element('p', 'sc-commit-problem wanting', problem));
    return block;
  }

  /**
   * A card's stamp on this screen — and the one rule about **when** it is asked.
   *
   * Only for a card that is **in force**: an Order the law holds in an office,
   * and every adopted Doctrine. A held Order wears the flourish and a card staged
   * into an office wears the pending mark, and neither is a shortcut: a hand of
   * thirty figures is thirty questions the player did not ask, and every one of
   * them is a ghost-diff over every town this empire holds (`explainCardImpact`).
   * Asking a handful rather than a hand is the same bargain the yields lens
   * strikes — the reading happens when a hex's yield can change, never once a
   * frame. A Doctrine is inside that bargain rather than an exception to it:
   * there is at most one per charter sworn, so the whole shelf is a handful, and
   * every card on it is already paying.
   *
   * **Unconfirmed is not asked at all** (the reveal ruling), which is the strict
   * reading and also the cheap one: a figure that is never computed is a figure
   * that cannot leak onto a face.
   *
   * The figure itself is the sim's: a card the law already holds — an Order in
   * its office, a Doctrine adopted — reads as what giving it up would cost, which
   * is the same number as what it is paying.
   */
  function stampFor(state: GameState, seat: number, subject: CardImpactSubject) {
    const reading = stampReading(explainCardImpact(state, seat, subject, sheet ?? undefined));
    return stampIsEmpty(reading) ? null : reading;
  }

  /**
   * The Doctrines, permanent and slotless. Beneath the offices: there are few.
   *
   * A deck's Doctrine (batch C3) wears its deck's suit as its emblem and says
   * its deck and tier in the eyebrow, "Dominion · Tier I"; a pre-rework
   * Doctrine keeps its archetype thread's face (`drawCardFace`).
   *
   * Each face wears the standing stamp exactly as an Order in an office does
   * (the ruling of 2026-09-05, `docs/flags.md` note 6: "doctrines that give
   * yields should also give an indicator of the yields they're supplying"). It
   * is **landed**, never played — a Doctrine's ceremony was adoption day, and
   * the offer card counted it there (`main.ts`'s `pendingDoctrine` spread); a
   * screen that replayed the count every time it opened would be celebrating a
   * decision the player made an age ago. A Doctrine that pays nothing per turn
   * keeps the flourish, which is the honest reading and not an omission.
   */
  function drawDoctrines(state: GameState, seat: number, sc: PlayerStatecraft): HTMLElement {
    const block = element('section', 'sc-doctrines');
    block.append(element('p', 'eyebrow sc-eyebrow', 'doctrines · permanent'));
    if (sc.doctrines.length === 0) {
      block.append(
        element('p', 'sc-none', 'None yet. Adopting a government offers you Doctrines from your decks.'),
      );
      return block;
    }
    const row = element('div', 'sc-doctrine-row');
    for (const id of sc.doctrines) {
      const card = element('article', 'sc-card sc-card-doctrine');
      // A deck's Doctrine (batch C3) wears its deck; a pre-rework one, which
      // nothing deals any more, keeps its thread's face.
      const face = isDoctrineId(id) ? doctrineFaceOf(id) : null;
      if (face !== null) drawDeckDoctrineFace(card, id, face, describeCard(id));
      else drawCardFace(card, cardDef(id), 'permanent', describeCard(id));
      // The same seat the hand's cards keep, built whichever face it shows, so
      // a shelf of Doctrines is a column of one card shape rather than two.
      const stamp = cardStampNode();
      card.dataset.card = id;
      card.append(stamp);
      const reading = stampFor(state, seat, { kind: 'doctrine', id });
      if (reading) landCardStamp(stamp, reading);
      row.append(card);
    }
    block.append(row);
    return block;
  }

  /**
   * The collection: every Order held, grouped by the kind of slot it wants.
   *
   * Grouped rather than listed, because the question a player is asking of this
   * screen is almost always "what can go in *that*" — the groups are the same
   * three words the offices are labelled with, so the answer is found by
   * matching a heading rather than by reading sixty clauses. Within a group the
   * order is the collection's own (draw order), which is the only order that is
   * a fact rather than an opinion.
   *
   * What counts as "in a slot" is the **arrangement**, not the law: a card the
   * player has just staged is spoken for, and one they have just taken out is
   * back in the hand, whether or not either has been signed yet.
   *
   * What counts as **in force** is the law, and the two are told apart by the
   * arrangement's own `staged` flag — which is the reveal ruling in one line:
   * a card in an office the empire has signed reads its figure, and a card in an
   * office this session laid out reads `— on Confirm`. A card *moved* between
   * offices is staged too, and therefore waits with the rest; a move is a
   * placement like any other.
   */
  function drawCollection(
    state: GameState,
    seat: number,
    sc: PlayerStatecraft,
    arrangement: StagedSlots,
  ): HTMLElement {
    const block = element('section', 'sc-collection');
    block.append(
      element('p', 'eyebrow sc-eyebrow', `orders · ${sc.orders.length} held`),
    );
    if (sc.orders.length === 0) {
      block.append(
        element('p', 'sc-none', 'Your law is unwritten. Culture buys the first draft.'),
      );
      return block;
    }
    // The two halves of "in a slot": what the law holds, and what this session
    // has laid out and not signed. One walk, because an entry is exactly one of
    // the two and the flag says which.
    const inForce = new Set<OrderId>();
    const pending = new Set<OrderId>();
    for (const entry of arrangement) {
      if (entry === null) continue;
      (entry.staged ? pending : inForce).add(entry.card);
    }
    const slotted = new Set([...inForce, ...pending]);
    // **Grouped by deck since the decks rework** (D1a): the seat's own decks in
    // its order, then the cross-types and the generic rows — each card filed
    // once, under the first of its decks the seat holds (a cross-type of two
    // held decks files under the first). The M/E/W grouping went with the
    // spread; a group is a deck now, which is the badge the card was dealt
    // with. The finished grouping is D1c's.
    const decks = playerById(state, seat)?.decks ?? [];
    const groups: { key: string; name: string; owned: OrderId[] }[] = [];
    const filed = new Set<OrderId>();
    for (const deck of decks) {
      const owned = sc.orders.filter((id) => !filed.has(id) && orderDef(id).decks.includes(deck));
      for (const id of owned) filed.add(id);
      if (owned.length > 0) groups.push({ key: deck, name: deckWord(deck), owned });
    }
    const rest = sc.orders.filter((id) => !filed.has(id));
    if (rest.length > 0) groups.push({ key: 'generic', name: GENERIC_WORD, owned: rest });
    for (const { key, name, owned } of groups) {
      const group = element('div', `sc-group sc-group-${key}`);
      const heading = element('p', 'sc-group-head');
      // The deck's suit before its name (batch C1), the same suit its cards
      // wear; the generic shelf takes the seal a card of no deck wears.
      const suit = key === 'generic' ? 'seal' : DECK_SUIT[key as keyof typeof DECK_SUIT];
      const mark = suitGlyphNode(suit);
      mark.classList.add('sc-group-mark');
      heading.append(mark);
      heading.append(element('span', 'sc-group-name', name));
      heading.append(element('span', 'sc-group-count', String(owned.length)));
      group.append(heading);
      const grid = element('div', 'sc-card-grid');
      for (const id of owned) {
        const button = document.createElement('button');
        button.type = 'button';
        // **The shelf it is filed on does not decide its ink** (U1). The card's
        // ink is its type's (batch C1), set by `drawOrderFace` off the row
        // itself, and the group class stays on the heading alone.
        button.className = 'sc-card sc-card-order';
        if (slotted.has(id)) button.classList.add('sc-card-slotted');
        if (held === id) button.classList.add('sc-card-held');
        // The card's own face, from the one describer — the collection and the
        // offer that dealt it read identically because there is one reading of
        // a row and no second one to drift from it. The A3 row says the type,
        // the deck, the rarity and the tier (`drawOrderFace`).
        drawOrderFace(button, id, describeCard(id));
        // A commission carries its goal's counter on its face (batch C), and an
        // unseated one says its progress is kept.
        const goal = commissionGoalNode(state, seat, id);
        if (goal) button.append(goal);
        // The stamp's seat, always built and mostly wearing the flourish — see
        // `stampFor`. The element is the same one whichever face it shows, so a
        // card slotted and unslotted does not change height.
        const stamp = cardStampNode();
        button.dataset.card = id;
        button.append(stamp);
        if (pending.has(id)) {
          // **No figure until Confirm** (the reveal ruling). Nothing is even
          // asked of the simulation here — see `stampFor`.
          pendCardStamp(stamp);
          button.append(element('p', 'sc-card-note', 'in a slot · unconfirmed'));
          button.addEventListener('click', () => lift(id));
        } else if (inForce.has(id)) {
          const reading = stampFor(state, seat, { kind: 'order', id });
          if (reading) {
            // The count is played for the cards the signature just made law;
            // every other card in force is a standing fact and arrives landed.
            if (justConfirmed.includes(id)) counting.push(playCardStamp(stamp, reading));
            else landCardStamp(stamp, reading);
          }
          button.append(element('p', 'sc-card-note', 'in a slot'));
          // Rearranging: a card in an office is picked up the same way a benched
          // one is, and the refusal — a seal that has not lifted — is the
          // reducer's own (`lift`).
          button.addEventListener('click', () => lift(id));
        } else {
          button.addEventListener('click', () => take(id));
        }
        grid.append(button);
      }
      group.append(grid);
      block.append(group);
    }
    return block;
  }

  /**
   * The half of this draw's stamps that is a reading of the **real** board, taken
   * once and shared by every card on the sheet (`cardImpactSheet`, batch H18).
   *
   * A screen of a dozen cards is a dozen ghost-diffs, and one side of every one
   * of them is the empire as it actually stands — the same empire fold, the same
   * town contexts, the same meters, twelve times over. Its lifetime is **one
   * draw**, which is why it is set and let go in `draw` rather than kept: the
   * reducer mutates `GameState` in place, so a sheet held past the next command
   * would answer with a board the game has moved on from.
   */
  let sheet: CardImpactSheet | null = null;

  function draw(): void {
    sheet = cardImpactSheet(options.getState(), options.getPlayerId());
    try {
      paint();
    } finally {
      sheet = null;
    }
  }

  function paint(): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const player = playerById(state, seat);
    // The tree the last draw's counts were writing into is about to go.
    stopCounting();
    body.replaceChildren();
    if (!player) return;
    const sc = player.statecraft;
    const arrangement = ensureStaging(sc, seat);
    // A card in hand that is spoken for — staged, or slotted by another route —
    // is a card nobody is holding.
    if (held !== null && arrangement.some((entry) => entry?.card === held)) held = null;

    const banner = drawPendingGovernment(sc);
    if (banner) body.append(banner);
    // The exhausted pool (D1a): a fact a player has to be told, because it
    // blocks nothing and opens no card by itself.
    const dry = drawExhausted(state, seat);
    if (dry) body.append(dry);

    // The split: the offices on the left and never moving, the hand on the right
    // and scrolling in its own pane. See the module docblock.
    const split = element('div', 'sc-split');
    const column = element('aside', 'sc-column');
    // The column's own two parts: what scrolls when the viewport is short, and
    // the one block that must never be what scrolled off — a player cannot be
    // asked to go looking for the button that signs their law.
    const stack = element('div', 'sc-column-body');
    stack.append(drawGovernment(sc));
    stack.append(drawProgress(state, sc, seat));
    stack.append(drawSlots(state, sc, seat, arrangement));
    stack.append(drawDoctrines(state, seat, sc));
    column.append(stack);
    column.append(drawCommit(state, sc, seat, arrangement));
    split.append(column);

    const pane = element('div', 'sc-pane');
    pane.append(drawCollection(state, seat, sc, arrangement));
    // Spent by the draw that played it: the ceremony belongs to the signature,
    // and a list left set would replay it on the next redraw.
    justConfirmed = [];

    // The empire's law as one list, last, because it is the *answer* rather than
    // the arrangement: what is actually reaching the ledgers right now, from the
    // one evaluator every ledger reads (`liveEffects`). A player wondering why
    // their capital is at +30% finds it here and nowhere else — and it is the
    // **live** law, deliberately, which is the other half of why an unconfirmed
    // arrangement cannot be mistaken for a signed one.
    const live = liveEffects(state, seat);
    if (live.length > 0) {
      const block = element('section', 'sc-live');
      block.append(element('p', 'eyebrow sc-eyebrow', 'in force'));
      const list = element('ul', 'sc-live-list');
      const seen = new Set<CardId>();
      for (const entry of live) {
        if (seen.has(entry.card)) continue;
        seen.add(entry.card);
        list.append(element('li', 'sc-live-line', entry.source));
      }
      block.append(list);
      pane.append(block);
    }
    split.append(pane);
    body.append(split);
  }

  /**
   * The frame (`modalShell.ts`) — `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`, and the
   * disposer is the game's.
   *
   * What this screen adds to it is the two halves of *leaving locks it in* — the
   * user's rule. An opening throws away whatever the last visit proposed (it was
   * either signed on the way out or abandoned by a change of chair, so a fresh
   * sheet never inherits an arrangement), and a closing signs it. Both are hung
   * on the shell's hooks rather than written at each door precisely because
   * there are four doors — Escape, the ×, the table, and another screen opening
   * through `closePopovers`.
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    onShow: discardStaging,
    draw,
    onClose: () => {
      // A ceremony playing on a sheet nobody can see has nothing left to say.
      stopCounting();
      commitStaging();
      discardStaging();
    },
    /**
     * The game is going away (the landing screen). The arrangement is
     * **discarded**, not signed: it is a proposal about a government that is
     * about to stop existing, and `showLanding` has already closed the screen —
     * which is where a proposal about a game still being played gets signed.
     */
    onDispose: () => {
      stopCounting();
      discardStaging();
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    openAt(card: OrderId): void {
      shell.open();
      if (!shell.isOpen) return;
      const face = body.querySelector<HTMLElement>(`.sc-card[data-card="${card}"]`);
      if (!face) return;
      face.scrollIntoView({ block: 'center' });
      face.classList.add('sc-card-focus');
    },
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
