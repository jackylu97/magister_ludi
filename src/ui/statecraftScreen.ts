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
  describeCard,
  draftCost,
  liveEffects,
  nextDraftCost,
  sealRemaining,
  slotOrderError,
  unslotOrderError,
} from '../sim/statecraft';
import {
  type CardId,
  type GovernmentId,
  type OrderId,
  type SlotType,
  cardDef,
  governmentDef,
  isOrderId,
  orderDef,
  orderFitsSlot,
  slotLayout,
} from '../sim/statecraftData';
import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';

/** How a slot type reads on the screen. Beside the union, one voice. */
const SLOT_LABEL: Record<SlotType, string> = {
  military: 'Military',
  economic: 'Economic',
  wildcard: 'Wildcard',
};

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

  /** The slot row: one seal per slot, typed, with its countdown. */
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
      button.append(element('span', 'sc-slot-type', SLOT_LABEL[type]));
      if (filled) {
        const level = sc.orders.find((owned) => owned.id === filled.card)?.level ?? 1;
        button.append(
          element(
            'span',
            'sc-slot-card',
            isOrderId(filled.card) ? orderDef(filled.card).name : String(filled.card),
          ),
        );
        if (level > 1) button.append(element('span', 'sc-level', `·${level}`));
        const left = sealRemaining(state, filled);
        const seal = element('span', left > 0 ? 'sc-seal sc-seal-set' : 'sc-seal');
        seal.append(element('span', 'sc-seal-glyph', SEAL_GLYPH));
        // Every number in this interface is tabular mono (the specimen's rule),
        // and a countdown is a number.
        seal.append(element('span', 'sc-seal-count', left > 0 ? String(left) : 'free'));
        button.append(seal);
        button.title =
          left > 0
            ? `Sealed for ${left} more turn${left === 1 ? '' : 's'}`
            : 'The seal has lifted — click to take it out';
      } else {
        button.append(element('span', 'sc-slot-empty', 'empty'));
        button.append(element('span', 'sc-seal sc-seal-ghost', SEAL_GLYPH));
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
      card.append(element('h4', 'sc-card-name', cardDef(id).name));
      card.append(clauseList(describeCard(id)));
      card.append(element('p', 'sc-flavor', cardDef(id).flavor));
      row.append(card);
    }
    block.append(row);
    return block;
  }

  /** The collection: every Order held, slotted ones marked. */
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
    const grid = element('div', 'sc-card-grid');
    const slotted = new Set(sc.slots.filter(Boolean).map((entry) => entry!.card));
    for (const owned of sc.orders) {
      const def = orderDef(owned.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sc-card sc-card-order sc-card-${def.slot}`;
      if (slotted.has(owned.id)) button.classList.add('sc-card-slotted');
      if (held === owned.id) button.classList.add('sc-card-held');
      const head = element('div', 'sc-card-head');
      head.append(element('h4', 'sc-card-name', def.name));
      head.append(element('span', 'sc-card-type', SLOT_LABEL[def.slot]));
      if (owned.level > 1) head.append(element('span', 'sc-level', `·${owned.level}`));
      button.append(head);
      // At the level the empire holds it, which is the whole of the upgrade
      // slot being legible: a deepened card reads as its scaled numbers here and
      // on the offer that deepened it, from one function.
      button.append(clauseList(describeCard(owned.id, owned.level)));
      button.append(element('p', 'sc-flavor', def.flavor));
      if (slotted.has(owned.id)) {
        button.append(element('p', 'sc-card-note', 'in a slot'));
        button.disabled = true;
      } else {
        button.addEventListener('click', () => take(owned.id));
      }
      grid.append(button);
    }
    block.append(grid);
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
