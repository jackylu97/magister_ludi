/**
 * The Statecraft screen: your government, your slots, your Orders, your
 * Doctrines.
 *
 * The third full-screen overlay, and deliberately the *parchment* one. The star
 * chart is the table at night and the Abacus is the table in daylight; this is
 * the table covered in paper — a government's charter at the top, a row of wax
 * seals under it, and the collection spread out below like cards a player is
 * deciding between. It follows both of the others' shape exactly: `hidden` is
 * the whole of the screen state, Escape closes it and hands the keyboard back,
 * the × and a click on the ground around the sheet do the same, and opening it
 * closes whatever else was up.
 *
 * The naming bible (Entry X) is load-bearing here and nowhere else in the
 * interface: the slottable cards are **Orders**, the permanent ones are
 * **Doctrines**, and the screen never says "policy", "civic" or "card" at the
 * player. The word "card" appears in this file only in identifiers.
 *
 * One rule, one sentence
 * ----------------------
 * Every refusal a player can provoke here is the **reducer's own sentence**:
 * `slotOrderError` and `unslotOrderError` are what grey a slot, what the tooltip
 * says, and what the reducer would answer if the command were sent anyway. So a
 * slot a player can drop a card on is a command the simulation takes, and a slot
 * they cannot is one that explains itself. There is no second opinion in this
 * file about what is legal.
 *
 * Click, not drag
 * ---------------
 * Click a card in the collection to pick it up, click a slot to put it down —
 * and click the card again to put it back. Drag was considered and dropped: it
 * needs a pointer, it needs a fallback for the keyboard anyway, and the gesture
 * this screen actually wants is *comparison* — hold one card against three slots
 * — which reads better as a selection than as a drag. The keyboard gets the same
 * two steps for free, because both halves are buttons.
 *
 * A deck, and it looks like one
 * -----------------------------
 * Orders and Doctrines are **cards**, and after a playtest they are drawn as
 * cards: a tall five-by-eight frame, the type in the mono eyebrow at the head,
 * a drawn emblem in the middle, the clauses under it and the flavour at the
 * foot. Three things carry the archetype line's accent — the frame rule, the
 * emblem and the eyebrow — so a hand reads as coloured at a glance without any
 * of the colour landing on the parchment itself. The table of what a line looks
 * like is `cardLine.ts`; the drawings are `src/art/lineMarks.ts`; this file
 * knows only that a card has a face and asks for one.
 *
 * A Doctrine wears a **heavier** frame — a double rule in gilt — for the reason
 * the Doctrine offer does (`offerCard.ts`'s `weight`): adoption day is the one
 * irreversible thing a player does, and the two surfaces that show it agree on
 * what heavy looks like.
 *
 * Derived, never stored
 * ---------------------
 * Nothing on this screen is state. The slot layout is `slotLayout(government)`,
 * the seal countdown is `sealedUntil − turn`, the collection is
 * `statecraft.orders`, and every number a card prints is `describeCard` at the
 * level the empire holds it. The one thing this file *does* keep is which card
 * the player has in hand, which is a fact about a conversation and not about the
 * game — `turnBlockers.ts`'s skip set, one screen over.
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
  slotOrderError,
  unslotOrderError,
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
import { CARD_LINE_NAME, cardLineMarkNode, lineOf, slotMarkNode } from './cardLine';
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
  /** Sends a command. The screen never mutates state itself. */
  slot: (cardId: OrderId, slotIndex: number) => void;
  unslot: (slotIndex: number) => void;
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

/** A card's clauses as a list, deferred ones struck through and said so. */
function clauseList(clauses: readonly CardClause[]): HTMLElement {
  const list = element('ul', 'sc-clauses');
  for (const clause of clauses) {
    const item = element('li', clause.deferred ? 'sc-clause sc-clause-deferred' : 'sc-clause');
    item.textContent = clause.text;
    if (clause.deferred) item.title = 'Declared, and not built yet — see docs/statecraft-cards.md';
    list.append(item);
  }
  return list;
}

/**
 * A wax stamp: the seal glyph and, when it is still set, the mono countdown.
 *
 * Stamped *over* the frame rather than laid out inside it — a seal is something
 * pressed onto a finished card, and the interface says so by putting it across
 * the corner at an angle. `sealRemaining` is the whole of the state; there is no
 * countdown to tick (see the seal trap in CLAUDE.md).
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
 * One builder rather than three, because the three uses of it differ only in
 * what goes in the eyebrow: an Order says its slot type, a Doctrine says
 * "permanent", the charter says nothing. Everything else — the accent, the
 * emblem, the name in the name face, the clauses, the flavour at the foot — is
 * the same card, and a second copy of it is how a Doctrine and an Order come to
 * disagree about where a card's name sits.
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
  level = 1,
): void {
  const id = lineOf(def);
  into.dataset.line = id;
  // The accent's own name, for the one thing a colour cannot do: say what it is.
  into.title = id === 'none' ? def.name : `${def.name} · ${CARD_LINE_NAME[id]}`;
  const head = element('div', 'sc-card-head');
  head.append(element('span', 'sc-card-type', eyebrow));
  if (level > 1) head.append(element('span', 'sc-level', `·${level}`));
  into.append(head);
  const emblem = cardLineMarkNode(id);
  emblem.classList.add('sc-card-emblem');
  into.append(emblem);
  into.append(element('h4', 'sc-card-name', def.name));
  into.append(clauseList(clauses));
  into.append(element('p', 'sc-flavor', def.flavor));
}

export function createStatecraftScreen(options: StatecraftScreenOptions): StatecraftScreen {
  const { overlay, body, closeButton, trigger } = options;
  /**
   * The card in hand, or `null`. **Not state**: it is a fact about this
   * conversation — which card the player has picked up and not yet put down —
   * and it is cleared whenever the screen closes or the government changes.
   */
  let held: OrderId | null = null;

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function setExpanded(): void {
    trigger?.setAttribute('aria-expanded', String(isOpen()));
  }

  function take(id: OrderId): void {
    held = held === id ? null : id;
    draw();
  }

  function drop(index: number): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const sc = playerById(state, seat)?.statecraft;
    if (!sc) return;
    // An occupied slot is the *unslot* gesture, whether or not a card is in
    // hand: clicking a seal to take it off is the thing a player reaches for,
    // and making it depend on what else they were holding would be a mode.
    if (sc.slots[index]) {
      const problem = unslotOrderError(state, seat, index);
      if (problem !== null) {
        options.onRefuse?.(problem);
        return;
      }
      options.unslot(index);
      draw();
      return;
    }
    if (held === null) return;
    const problem = slotOrderError(state, seat, held, index);
    if (problem !== null) {
      options.onRefuse?.(problem);
      return;
    }
    options.slot(held, index);
    held = null;
    draw();
  }

  /** The government's charter: what it is, what it is worth, what it opened. */
  function drawGovernment(sc: PlayerStatecraft): HTMLElement {
    const block = element('section', 'sc-government');
    const def = governmentDef(sc.government);
    block.append(element('p', 'eyebrow sc-eyebrow', 'your government'));
    block.append(element('h3', 'sc-gov-name', def.name));
    block.append(element('p', 'sc-flavor', def.flavor));
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
   * The slot row: one card-shaped place per slot, typed, with its seal.
   *
   * An empty slot is drawn as the **outline of a card** with its office's mark
   * ghosted inside it, rather than as a labelled box: a row of slots is a row of
   * places a card goes, and the shape is what says so before any of the words
   * are read. A filled slot is the card itself at thumbnail size, stamped.
   */
  function drawSlots(state: GameState, sc: PlayerStatecraft, seat: number): HTMLElement {
    const block = element('section', 'sc-slots');
    const layout = slotLayout(sc.government);
    block.append(element('p', 'eyebrow sc-eyebrow', `${layout.length} slots`));
    const row = element('div', 'sc-slot-row');
    layout.forEach((type, index) => {
      const filled = sc.slots[index] ?? null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sc-slot sc-slot-${type}`;
      const takeable = held !== null && filled === null && orderFitsSlot(held, type);
      if (takeable) button.classList.add('sc-slot-open');
      if (filled) button.classList.add('sc-slot-filled');
      button.append(element('span', 'sc-slot-type', SLOT_WORDS[type]));
      if (filled) {
        const level = sc.orders.find((owned) => owned.id === filled.card)?.level ?? 1;
        // A slotted card keeps its own accent, so the row of slots is the same
        // hand of colours the collection below it is.
        button.dataset.line = isOrderId(filled.card) ? lineOf(orderDef(filled.card)) : 'none';
        if (isOrderId(filled.card)) {
          const emblem = cardLineMarkNode(lineOf(orderDef(filled.card)));
          emblem.classList.add('sc-slot-emblem');
          button.append(emblem);
        }
        button.append(
          element(
            'span',
            'sc-slot-card',
            isOrderId(filled.card) ? orderDef(filled.card).name : String(filled.card),
          ),
        );
        if (level > 1) button.append(element('span', 'sc-level', `·${level}`));
        const left = sealRemaining(state, filled);
        const stamp = sealStamp(left);
        button.title = stamp.title;
        button.append(stamp);
      } else {
        const ghost = slotMarkNode(type);
        ghost.classList.add('sc-slot-ghost');
        button.append(ghost);
        button.append(element('span', 'sc-slot-empty', 'empty'));
        // The refusal, before it is provoked: the same sentence the reducer
        // would answer with, so the tooltip and the rejection are one string.
        if (held !== null) {
          button.title = slotOrderError(state, seat, held, index) ?? `Slot ${orderDef(held).name} here`;
        }
      }
      button.addEventListener('click', () => drop(index));
      row.append(button);
    });
    block.append(row);
    // The other half of "which slot": the row highlights what will take the card
    // (`sc-slot-open`, which is the reducer's own answer), and this says in words
    // what is in hand and what to do with it. A highlight with no sentence is a
    // colour a player has to guess the meaning of.
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

  /** The Doctrines, permanent and slotless. A row rather than a grid: there are three. */
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
   * three words the slots above are labelled with, so the answer is found by
   * matching a heading rather than by reading sixty clauses. Within a group the
   * order is the collection's own (draw order), which is the only order that is
   * a fact rather than an opinion.
   */
  function drawCollection(sc: PlayerStatecraft): HTMLElement {
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
    const slotted = new Set(sc.slots.filter(Boolean).map((entry) => entry!.card));
    for (const type of SLOT_TYPES) {
      const owned = sc.orders.filter((entry) => orderDef(entry.id).slot === type);
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
      for (const entry of owned) {
        const def = orderDef(entry.id);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `sc-card sc-card-order sc-card-${def.slot}`;
        if (slotted.has(entry.id)) button.classList.add('sc-card-slotted');
        if (held === entry.id) button.classList.add('sc-card-held');
        // At the level the empire holds it, which is the whole of the upgrade
        // slot being legible: a deepened card reads as its scaled numbers here
        // and on the offer that deepened it, from one function.
        drawCardFace(
          button,
          def,
          SLOT_WORDS[def.slot],
          describeCard(entry.id, entry.level),
          entry.level,
        );
        if (slotted.has(entry.id)) {
          button.append(element('p', 'sc-card-note', 'in a slot'));
          button.disabled = true;
        } else {
          button.addEventListener('click', () => take(entry.id));
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
    // A card in hand that has since been slotted (by a hotkey, or by another
    // client) is a card nobody is holding.
    if (held !== null && sc.slots.some((entry) => entry?.card === held)) held = null;

    const banner = drawPendingGovernment(sc);
    if (banner) body.append(banner);
    const head = element('div', 'sc-head-row');
    head.append(drawGovernment(sc));
    head.append(drawProgress(state, sc, seat));
    body.append(head);
    body.append(drawSlots(state, sc, seat));
    body.append(drawDoctrines(sc));
    body.append(drawCollection(sc));

    // The empire's law as one list, last, because it is the *answer* rather than
    // the arrangement: what is actually reaching the ledgers right now, from the
    // one evaluator every ledger reads (`liveEffects`). A player wondering why
    // their capital is at +30% finds it here and nowhere else.
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
      body.append(block);
    }
  }

  function open(): void {
    if (isOpen()) return;
    options.onOpen?.();
    overlay.hidden = false;
    setExpanded();
    draw();
    closeButton.focus();
  }

  function close(): void {
    if (!isOpen()) return;
    overlay.hidden = true;
    held = null;
    setExpanded();
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
    dispose(): void {
      closeButton.removeEventListener('click', close);
      overlay.removeEventListener('click', onOverlayClick);
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.hidden = true;
      body.replaceChildren();
    },
  };
}
