/**
 * The Statecraft screen: your government, your slots, your Orders, your
 * Doctrines.
 *
 * The third full-screen overlay, and deliberately the *parchment* one. The star
 * chart is the table at night and the Abacus is the table in daylight; this is
 * the table covered in paper — a government's charter down the left with a row
 * of wax seals under it, and the collection spread out beside it like cards a
 * player is deciding between. It follows both of the others' shape exactly:
 * `hidden` is the whole of the screen state, Escape closes it and hands the
 * keyboard back, the × and a click on the ground around the sheet do the same,
 * and opening it closes whatever else was up.
 *
 * The naming bible (Entry X) is load-bearing here and nowhere else in the
 * interface: the slottable cards are **Orders**, the permanent ones are
 * **Doctrines**, and the screen never says "policy", "civic" or "card" at the
 * player. The word "card" appears in this file only in identifiers.
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
 * An office is a **line** rather than a card-shaped hole for the same reason: in
 * a fixed column the name of what is in it has to be readable, and a row can
 * carry the office, the card, its accent and its seal on one line at any slot
 * count. It keeps the line's emblem, so it is still visibly the same object as
 * the card in the hand that fills it.
 *
 * A hand is a working list
 * ------------------------
 * The cards in the collection are **compact**: the mono eyebrow, the emblem
 * shrunk to a chip beside it, the name, and the clauses at reading size. The
 * tarot proportion is a *ceremony* and it stays where the ceremony is — the
 * draft spread (`offerCard.ts`), which is where a card is dealt and turned over.
 * The hand is where a player compares thirty of them, and thirty tarot plates is
 * a scroll. Three things still carry the archetype line's accent — the frame
 * rule, the emblem chip and the eyebrow — so a hand reads as coloured at a
 * glance without any of the colour landing on the parchment itself. The table of
 * what a line looks like is `cardLine.ts`; the drawings are `src/art/lineMarks.ts`.
 *
 * A Doctrine wears a **heavier** frame — a gilt double rule — for the reason the
 * Doctrine offer does (`offerCard.ts`'s `weight`): adoption day is the one
 * irreversible thing a player does, and the two surfaces that show it agree on
 * what heavy looks like.
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
 * Click, not drag
 * ---------------
 * Click a card in the collection to pick it up, click an office to put it down —
 * and click the card again to put it back. Drag was considered and dropped: it
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

import {
  type CardClause,
  type PlayerStatecraft,
  SLOT_WORDS,
  describeCard,
  draftCost,
  liveEffects,
  nextDraftCost,
  sealRemaining,
} from '../sim/statecraft';
import {
  type CardDefBase,
  type CardId,
  type GovernmentId,
  type OrderId,
  SLOT_TYPES,
  cardDef,
  governmentDef,
  isOrderId,
  orderDef,
  orderFitsSlot,
  slotLayout,
} from '../sim/statecraftData';
import {
  cardStampNode,
  landCardStamp,
  playCardStamp,
  stampIsEmpty,
  stampReading,
} from './cardStamp';
import { explainCardImpact } from '../sim/cardImpact';
import { CARD_LINE_NAME, cardLineMarkNode, lineOf, slotMarkNode } from './cardLine';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import {
  type SlotCommand,
  type StagedSlots,
  changedOffices,
  diff,
  place,
  placeError,
  remove,
  removeError,
  stage,
  validate,
} from './statecraftStaging';
import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';

/**
 * The wax seal, and the empty slot's ghost of one.
 *
 * A glyph rather than an icon, for `figures.ts`' reason: the interface's
 * symbols are text so they inherit the type ramp and the ink colour, and an
 * empty slot showing the *same* shape at low contrast is what makes a row of
 * slots read as a row rather than as a list of unrelated boxes.
 */
const SEAL_GLYPH = '❖';

export interface StatecraftScreen {
  readonly isOpen: boolean;
  open(): void;
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

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
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
 * The face every card on this screen wears, whichever class it is.
 *
 * One builder rather than three, because the two uses of it differ only in what
 * goes in the eyebrow: an Order says its slot type, a Doctrine says "permanent".
 * Everything else — the accent, the emblem chip, the name in the name face, the
 * clauses — is the same card, and a second copy of it is how a Doctrine and an
 * Order come to disagree about where a card's name sits.
 *
 * **Compact**, and what that cost: the flavour line is off the hand's cards. It
 * is the one thing on a card that says nothing about what the card does, it is
 * a third of the card's height, and it is still read where it belongs — on the
 * offer that deals the card, which is the ceremony (`offerCard.ts`).
 *
 * `into` is filled rather than returned so the caller can decide whether the
 * card is an `<article>` or a `<button>`, which is the one real difference
 * between a Doctrine (nothing to do to it) and an Order (pick it up).
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
  into.title = id === 'none' ? def.name : `${def.name} · ${CARD_LINE_NAME[id]}`;
  const head = element('div', 'sc-card-head');
  // The emblem is a **chip** in the eyebrow rather than a plate in the middle of
  // the card: the drawing is kept (it is how a line is recognised) and the
  // whitespace around it is what went.
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
   * The card that has just gone into an office, waiting for its stamp to be
   * played once the redraw has put it back on the screen.
   *
   * **Not state**, and cleared the instant it is spent: slotting is the moment a
   * held card stops being a guess and starts paying, so it is the one gesture on
   * this screen that earns the count-up. A card already in an office reads its
   * figure at rest (`landCardStamp`) — a screen that replayed the ceremony on
   * every redraw would be a screen celebrating itself.
   */
  let justSlotted: OrderId | null = null;

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function setExpanded(): void {
    trigger?.setAttribute('aria-expanded', String(isOpen()));
  }

  /** Throws the arrangement away. Revert, seat changes, and the way out of a game. */
  function discardStaging(): void {
    staged = null;
    stagedSeat = -1;
    held = null;
    justSlotted = null;
  }

  /**
   * The arrangement this draw is about.
   *
   * Re-taken from the live slots whenever there is nothing staged, whenever the
   * chair has changed under it, and whenever the government's spread no longer
   * has the same number of offices — an adoption rebuilds the slots array (the
   * amnesty; see the seal trap in CLAUDE.md) and an arrangement indexed into the
   * old spread would be putting cards in offices that no longer exist.
   */
  function ensureStaging(sc: PlayerStatecraft, seat: number): StagedSlots {
    if (staged === null || stagedSeat !== seat || staged.length !== sc.slots.length) {
      staged = stage(sc.slots);
      stagedSeat = seat;
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
   */
  function commitStaging(): void {
    const arrangement = staged;
    if (arrangement === null) return;
    const state = options.getState();
    const seat = options.getPlayerId();
    // Somebody else's arrangement. Thrown away, never signed — see `stagedSeat`.
    if (stagedSeat !== seat) {
      discardStaging();
      return;
    }
    const player = playerById(state, seat);
    if (!player) {
      discardStaging();
      return;
    }
    const commands = diff(player.statecraft.slots, arrangement, seat);
    if (commands.length === 0) return;
    const problem = validate(state, seat, arrangement);
    if (problem !== null) {
      options.onRefuse?.(problem);
      staged = stage(player.statecraft.slots);
      return;
    }
    options.send(commands);
    // Whatever happened — every command taken, or a batch stopped part-way and
    // reported — the truth is now the live state's and the proposal is spent.
    staged = stage(playerById(options.getState(), seat)?.statecraft.slots ?? []);
  }

  function take(id: OrderId): void {
    held = held === id ? null : id;
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
    justSlotted = held;
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
    const cost = nextDraftCost(player);
    const banked = Math.max(0, Math.floor(player.culturePool));
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
      element('span', 'sc-next', `next tier costs ${draftCost(sc.drafts)}`),
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
          .join(', ')} — adopting swaps your slots, lifts every seal, and opens a Doctrine.`,
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
   * The offices: one line per slot, typed, with what is in it and its seal.
   *
   * A line rather than a card-shaped hole — see the module docblock. An empty
   * office keeps the office's mark, ghosted, so the column still reads as a row
   * of *places a card goes* before any of the words are read.
   */
  function drawSlots(
    state: GameState,
    sc: PlayerStatecraft,
    seat: number,
    arrangement: StagedSlots,
  ): HTMLElement {
    const block = element('section', 'sc-slots');
    const layout = slotLayout(sc.government);
    block.append(element('p', 'eyebrow sc-eyebrow', `${layout.length} slots`));
    const row = element('div', 'sc-slot-row');
    layout.forEach((type, index) => {
      const filled = arrangement[index] ?? null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sc-slot sc-slot-${type}`;
      // The one hint while a card is in hand, and it is the reducer's own answer
      // about the *staged* arrangement rather than a guess about the live one:
      // an office this session emptied will take a card, and the highlight says
      // so before the arrangement is signed.
      const takeable = held !== null && filled === null && placeError(state, seat, arrangement, held, index) === null;
      if (takeable) button.classList.add('sc-slot-open');
      if (filled) button.classList.add('sc-slot-filled');
      // What this session changed about this office — a card put in, or one
      // taken out. Both are "unconfirmed", and both are drawn as such.
      const moved = (sc.slots[index]?.card ?? null) !== (filled?.card ?? null);
      if (moved) button.classList.add('sc-slot-staged');
      const text = element('span', 'sc-slot-text');
      text.append(element('span', 'sc-slot-type', SLOT_WORDS[type]));
      if (filled) {
        // A slotted card keeps its own accent, so the column of offices is the
        // same hand of colours the collection beside it is.
        button.dataset.line = isOrderId(filled.card) ? lineOf(orderDef(filled.card)) : 'none';
        if (isOrderId(filled.card)) {
          const emblem = cardLineMarkNode(lineOf(orderDef(filled.card)));
          emblem.classList.add('sc-slot-emblem');
          button.append(emblem);
        }
        const name = element('span', 'sc-slot-card', isOrderId(filled.card) ? orderDef(filled.card).name : String(filled.card));
        text.append(name);
        button.append(text);
        if (filled.staged) {
          // Nothing has sealed it — see `sealStamp`. The office's rim says it is
          // unconfirmed and the Confirm block counts it.
          button.title = `${orderDef(filled.card).name} — unconfirmed`;
        } else {
          const stamp = sealStamp(sealRemaining(state, filled));
          button.title = stamp.title;
          button.append(stamp);
        }
      } else {
        const ghost = slotMarkNode(type);
        ghost.classList.add('sc-slot-ghost');
        button.append(ghost);
        text.append(element('span', 'sc-slot-empty', 'empty'));
        button.append(text);
        // The refusal, before it is provoked: the same sentence the reducer
        // would answer with, so the tooltip and the rejection are one string.
        if (held !== null) {
          button.title =
            placeError(state, seat, arrangement, held, index) ?? `Slot ${orderDef(held).name} here`;
        }
      }
      button.addEventListener('click', () => drop(index));
      row.append(button);
    });
    block.append(row);
    // The other half of "which office": the column highlights what will take the
    // card (`sc-slot-open`, which is the reducer's own answer), and this says in
    // words what is in hand. A highlight with no sentence is a colour a player
    // has to guess the meaning of.
    if (held !== null) {
      const card = held;
      // Which offices will take it, asked of `orderFitsSlot` rather than spelled
      // out — a military card fits military *or* wildcard, and a wildcard card
      // fits only wildcard, so a hand-written "X or wildcard" says "wildcard or
      // wildcard" for a third of the deck.
      const fits = SLOT_TYPES.filter((type) => orderFitsSlot(card, type)).map(
        (type) => SLOT_WORDS[type],
      );
      const hint = element('p', 'sc-hand');
      hint.append(element('span', 'sc-hand-name', orderDef(card).name));
      hint.append(
        element(
          'span',
          'sc-hand-say',
          `in hand — drop it in an empty ${fits.join(' or ')} slot, or click it again to put it back`,
        ),
      );
      block.append(hint);
    }
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
      commitStaging();
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
    if (problem !== null) block.append(element('p', 'sc-commit-problem', problem));
    return block;
  }

  /** The Doctrines, permanent and slotless. Beneath the offices: there are few. */
  function drawDoctrines(sc: PlayerStatecraft): HTMLElement {
    const block = element('section', 'sc-doctrines');
    block.append(element('p', 'eyebrow sc-eyebrow', 'doctrines · permanent'));
    if (sc.doctrines.length === 0) {
      block.append(
        element('p', 'sc-none', 'None yet. A Doctrine is taken on the day a government is sworn.'),
      );
      return block;
    }
    const row = element('div', 'sc-doctrine-row');
    for (const id of sc.doctrines) {
      const card = element('article', 'sc-card sc-card-doctrine');
      drawCardFace(card, cardDef(id), 'permanent', describeCard(id));
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
   */
  /**
   * A card's stamp on this screen — and the one rule about **when** it is asked.
   *
   * Only for a card in an office. A held card wears the flourish, and that is
   * not a shortcut: a hand of thirty figures is thirty questions the player did
   * not ask, and every one of them is a ghost-diff over every town this empire
   * holds (`explainCardImpact`). Asking a handful rather than a hand is the same
   * bargain the yields lens strikes — the reading happens when a hex's yield can
   * change, never once a frame.
   *
   * The figure itself is the sim's whichever way round the card sits: a card
   * *staged* into an office is not in force yet, so the reading is what slotting
   * it would be worth; a card the law already holds reads as what taking it out
   * would cost. Both are the same number, which is why the screen can print one.
   */
  function stampFor(state: GameState, seat: number, id: OrderId) {
    const reading = stampReading(explainCardImpact(state, seat, { kind: 'order', id }));
    return stampIsEmpty(reading) ? null : reading;
  }

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
    const slotted = new Set(arrangement.filter(Boolean).map((entry) => entry!.card));
    for (const type of SLOT_TYPES) {
      const owned = sc.orders.filter((id) => orderDef(id).slot === type);
      if (owned.length === 0) continue;
      const group = element('div', `sc-group sc-group-${type}`);
      const heading = element('p', 'sc-group-head');
      const mark = slotMarkNode(type);
      mark.classList.add('sc-group-mark');
      heading.append(mark);
      heading.append(element('span', 'sc-group-name', SLOT_WORDS[type]));
      heading.append(element('span', 'sc-group-count', String(owned.length)));
      group.append(heading);
      const grid = element('div', 'sc-card-grid');
      for (const id of owned) {
        const def = orderDef(id);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `sc-card sc-card-order sc-card-${def.slot}`;
        if (slotted.has(id)) button.classList.add('sc-card-slotted');
        if (held === id) button.classList.add('sc-card-held');
        // The card's own face, from the one describer — the collection and the
        // offer that dealt it read identically because there is one reading of
        // a row and no second one to drift from it.
        drawCardFace(button, def, SLOT_WORDS[def.slot], describeCard(id));
        // The stamp's seat, always built and mostly wearing the flourish — see
        // `stampFor`. The element is the same one whichever face it shows, so a
        // card slotted and unslotted does not change height.
        const stamp = cardStampNode();
        button.dataset.card = id;
        button.append(stamp);
        if (slotted.has(id)) {
          const reading = stampFor(state, seat, id);
          if (reading) {
            // The count is played only for the office it just went into; every
            // other slotted card is a standing fact and arrives landed.
            if (justSlotted === id) playCardStamp(stamp, reading);
            else landCardStamp(stamp, reading);
          }
          button.append(element('p', 'sc-card-note', 'in a slot'));
          button.disabled = true;
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

  function draw(): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const player = playerById(state, seat);
    body.replaceChildren();
    if (!player) return;
    const sc = player.statecraft;
    const arrangement = ensureStaging(sc, seat);
    // A card in hand that is spoken for — staged, or slotted by another route —
    // is a card nobody is holding.
    if (held !== null && arrangement.some((entry) => entry?.card === held)) held = null;

    const banner = drawPendingGovernment(sc);
    if (banner) body.append(banner);

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
    stack.append(drawDoctrines(sc));
    column.append(stack);
    column.append(drawCommit(state, sc, seat, arrangement));
    split.append(column);

    const pane = element('div', 'sc-pane');
    pane.append(drawCollection(state, seat, sc, arrangement));
    // Spent by the draw that played it: the ceremony belongs to the gesture, and
    // a flag left set would replay it on the next redraw.
    justSlotted = null;

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

  function open(): void {
    if (isOpen()) return;
    options.onOpen?.();
    overlay.hidden = false;
    setExpanded();
    // A fresh sheet of paper: whatever the last visit proposed is either signed
    // (it closed) or thrown away (the chair changed), so an opening screen never
    // inherits an arrangement.
    discardStaging();
    draw();
    closeButton.focus();
  }

  /**
   * Leaving locks it in — the user's rule, and it is enforced here rather than
   * at each door, because every door in the interface (Escape, the ×, a click on
   * the table, another screen opening, `closePopovers`) comes through this one
   * function. The overlay is hidden *first* so a repaint provoked by the batch
   * cannot draw a screen that is on its way out.
   */
  function close(): void {
    if (!isOpen()) return;
    overlay.hidden = true;
    setExpanded();
    commitStaging();
    discardStaging();
    trigger?.focus();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  // A click on the ground around the sheet closes it, exactly as the chart and
  // the Abacus do — the overlay itself is the target only when the sheet was
  // missed.
  const onOverlayClick = (event: MouseEvent): void => {
    if (event.target === overlay) close();
  };

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', onOverlayClick);
  window.addEventListener('keydown', onKeyDown, true);

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    open,
    close,
    toggle(): void {
      if (isOpen()) close();
      else open();
    },
    refresh(): void {
      if (isOpen()) draw();
    },
    /**
     * The game is going away (the landing screen). The arrangement is
     * **discarded**, not signed: it is a proposal about a government that is
     * about to stop existing, and `showLanding` has already closed the screen —
     * which is where a proposal about a game still being played gets signed.
     */
    dispose(): void {
      closeButton.removeEventListener('click', close);
      overlay.removeEventListener('click', onOverlayClick);
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.hidden = true;
      discardStaging();
      body.replaceChildren();
    },
  };
}
