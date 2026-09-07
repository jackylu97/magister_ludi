/**
 * The Reliquary: **the honored dead, and what they still pay you.**
 *
 * `docs/doctrine-ideas.md`, "The Reliquary is a SCREEN" (re-ruled 2026-09-03).
 * It fixes a real and quiet gap: a legacy reaches the empire's ledger through
 * `liveEffects`' sixth source and appears on **no surface at all** once the
 * ceremony is over — a player three ages in has six permanent abilities and no
 * way to be reminded what any of them are. The renown chip is the door, because
 * renown → great people → their legacies is the path the player already walks.
 *
 * The sibling it is built from, and where it stops
 * -----------------------------------------------
 * The Statecraft / Religion / Trade / Bead sheets, in the family sense: the same
 * overlay classes, the same keyboard contract (`hidden` is the whole of the
 * screen state, Escape closes it, the × and a click on the ground do the same),
 * and it joins the capped-overlay rule in `style.css` as the seventh id — the
 * block's own comment invites exactly this, and a second block that agreed today
 * would be two blocks the first time either was touched.
 *
 * It is **lighter** than its four siblings and deliberately so: it splits into
 * nothing, it scrolls nothing, and it is ≈30rem wide rather than 1240px. There
 * is only one thing on it and it is one card at a time. A player is not
 * comparing legacies — they cannot change any of them — they are *remembering*
 * one, and a grid of six thumbnails would be a filing cabinet where a pile of
 * cards is wanted.
 *
 * The flip-through, and the stack under it
 * ----------------------------------------
 * One full tarot face over two visible under-cards, ‹ › on either side, and
 * "N of M · the legacies in force" beneath. The stack is drawn rather than
 * implied because the count alone does not say *pile*, and the pile is the
 * whole metaphor the ceremony hands over to: the card descends into something.
 *
 * Newest first. A person spent this turn is the one the player has just been
 * shown and the one they are most likely to have come looking for, and it costs
 * nothing — `Player.legacies` is in spend order, so the roll is that order read
 * backwards and no second ordering is stored anywhere.
 *
 * Derived, never stored
 * ---------------------
 * Nothing on this screen is state of its own. The roll is `Player.legacies`, the
 * words are `describeCard`, the figure is `explainCardImpact` (the ghost-diff,
 * read at rest — the backward reading the evaluator already does for a card in
 * force), the accent and the emblem are `greatPersonFace.ts`'s. The one thing
 * this file keeps is which card is face up, which is a fact about a conversation
 * and not about the game (`statecraftScreen.ts`'s held card, four screens over).
 *
 * The one thing on it that is not a memory
 * ----------------------------------------
 * A rail of **calls** at the foot (`ReliquaryCall`, batch H3): the purchases The
 * Commonwealth, The Magisterium and The Academy open at the great-person ladder,
 * which the simulation has answered since those cards were written and which no
 * screen in the game had ever offered. It is a foot rail rather than a second
 * subject — the pile is still what the screen is for — and it draws nothing at
 * all under a law that opens nothing, so the ordinary empire sees the screen it
 * always saw.
 *
 * What is deliberately **not** here: the lifetime "has produced" tally. It is
 * phase 2 and it needs a schema field (`docs/doctrine-ideas.md`), and a dash
 * standing in for it would be a number the screen does not have, printed as
 * though it did. The line is omitted whole.
 *
 * Pure builders, because this suite has no jsdom
 * ----------------------------------------------
 * `beadsScreen.ts`'s discipline: everything that can be *quietly wrong* — which
 * cards are in the roll, in what order, what the count line says, whether a
 * revoked record is still drawn — is a pure function exported above the DOM.
 * Drawing them is a page of `append` calls that fail loudly or not at all.
 */

import { type GameState, playerById } from '../sim/state';
import { type GreatPersonFace, greatPersonFace } from './greatPersonFace';
import { type GreatPersonId, isGreatPersonId } from '../sim/greatPeopleData';
import {
  OFFER_PURCHASE_IDS,
  type OfferPurchaseId,
  greatPersonOfferBank,
  greatPersonOfferPrice,
  greatPersonPurchaseError,
  greatPersonPurchaseOpen,
} from '../sim/greatPeople';
import { YIELD_GLYPH } from './figures';
import { setYieldText } from './yieldMark';
import { cardStampNode, landCardStamp } from './cardStamp';
import { keywordsAllowedIn, setDescriptorText } from './keywords';

/**
 * One card in the roll: the face, plus the one fact the face itself cannot
 * carry — whether this empire still heeds it.
 *
 * `revoked` rides the *record*, not the person: revocation is a mark on
 * `LegacyRecord` (`state.ts` — history is never deleted), so the same name in
 * two empires can be heeded in one and struck in the other.
 */
export interface ReliquaryCard {
  face: GreatPersonFace;
  /** The empire's era when this person was spent — the record's own stamp. */
  age: number;
  revoked: boolean;
}

/** What the screen says when nobody has served yet. Plain words, no numbers. */
export const RELIQUARY_EMPTY =
  'No one has been called yet. Renown gathers, a name is offered, and whoever you spend leaves something behind.';

/** The band a struck legacy wears. Upper-cased in the stylesheet, not here. */
export const REVOKED_BAND = 'Revoked';

/**
 * The roll, **newest first** — see the module docblock.
 *
 * A **revoked** record is in it, and that is the whole ruling: revocation is a
 * mark, the roll of who served this empire never shrinks, and a card the player
 * cannot find any more is a card they will believe is still paying. It is drawn
 * greyed with a band across it instead.
 *
 * `isGreatPersonId` guards the lookup for `state.ts`'s stated reason — a
 * hand-edited save is the one thing that can put an unknown id here — and an
 * unknown name is skipped rather than thrown over, because a reference screen
 * that cannot open is worse than a reference screen missing a row.
 */
export function reliquaryRoll(state: GameState, playerId: number): ReliquaryCard[] {
  const player = playerById(state, playerId);
  if (!player) return [];
  const roll: ReliquaryCard[] = [];
  for (let at = player.legacies.length - 1; at >= 0; at -= 1) {
    const record = player.legacies[at]!;
    if (!isGreatPersonId(record.id)) continue;
    roll.push({
      face: greatPersonFace(state, playerId, record.id),
      age: record.age,
      revoked: record.revoked === true,
    });
  }
  return roll;
}

/**
 * "3 of 7 · the legacies in force" — the mock's own line.
 *
 * Ordinal, so it is one-based; the count is the roll's length and includes the
 * struck ones, because they are cards in the pile whether or not they still
 * speak. Empty answers with the empty sentence's own silence rather than
 * "0 of 0".
 */
export function reliquaryCount(index: number, total: number): string {
  if (total <= 0) return '';
  const at = Math.min(Math.max(index, 0), total - 1);
  return `${at + 1} of ${total} · the legacies in force`;
}

/**
 * The index the arrows land on, wrapped.
 *
 * A pile wraps: there is no first or last card in a pile, and an arrow that
 * greyed out at the end would be a control that stops working for a reason the
 * player has to reconstruct. Pure, because off-by-one at the wrap is exactly the
 * sort of thing that is quietly wrong forever.
 */
export function reliquaryStep(index: number, total: number, direction: number): number {
  if (total <= 0) return 0;
  return (((index + direction) % total) + total) % total;
}

/**
 * One purchase the empire's law has opened at the great-person ladder, drawn as
 * a control at the foot of this screen.
 *
 * **The draft the cards promised and no screen offered** (`docs/audit/
 * orchestrator.md`, "What surprised me"): `purchaseGreatPersonOffer` has been
 * built in the simulation since The Commonwealth was written, and until now
 * nothing anywhere constructed the command — three live signature clauses that
 * did nothing at all. It belongs *here* rather than on the offer card, because
 * the offer card only exists when a hand has already been dealt and this is how
 * a hand is dealt early; and here rather than on the Statecraft sheet, because
 * the renown chip is the door a player already walks — renown, then a name, then
 * what the name left behind.
 *
 * Every figure is the simulation's: `greatPersonOfferPrice` says what it costs,
 * `greatPersonOfferBank` says which coin, and a refusal is
 * `greatPersonPurchaseError`'s own sentence rather than a rule restated here.
 * The interface supplies the glyph and the verb, exactly as it does on the
 * reroll (`rerollControl`, `main.ts`).
 */
export interface ReliquaryCall {
  purchase: OfferPurchaseId;
  /** The button's words, the price included. "Call a name — 250💰". */
  label: string;
  /** The line beneath: what it deals, or the reducer's refusal. */
  note: string;
  /** True when the law is open and the bank is not. Greyed, never hidden. */
  disabled: boolean;
}

/**
 * What each purchase is **called**, and what taking it does.
 *
 * The interface's words, like the glyph — the simulation says which bank, what
 * it costs and what it deals, and never how to say it. Two sentences at most and
 * no number in either: the figure is on the button.
 *
 * The two halves of the ladder ruling are the whole difference between the
 * notes. A ladder purchase buys a **rung**: the renown pool is spent covering it
 * and the next recruitment is dearer. The Academy's scholars buy the **hand**:
 * the pool is not touched and the threshold does not move.
 */
const CALL_WORDS: Record<OfferPurchaseId, { verb: string; note: string }> = {
  gold: {
    verb: 'Call a name',
    note: 'The renown you still owe is covered and a hand of names opens at once. The pool is spent for it, so the call after this one asks for more.',
  },
  faith: {
    verb: 'Call a name',
    note: 'The renown you still owe is covered and a hand of names opens at once. The pool is spent for it, so the call after this one asks for more.',
  },
  scholarDraft: {
    verb: 'Call for scholars',
    note: 'A hand of great scholars, dealt on the spot. Your renown is not touched and the next call is no dearer for it.',
  },
};

/**
 * Every call this empire may be offered, in the register's own order.
 *
 * A closed law draws **nothing** and an open one draws a control whatever the
 * bank holds — `greatPersonPurchaseOpen`'s two silences (`greatPeople.ts`). Pure,
 * because "which buttons does a Commonwealth see" is exactly the sort of thing
 * that is quietly wrong forever.
 */
export function reliquaryCalls(state: GameState, playerId: number): ReliquaryCall[] {
  const calls: ReliquaryCall[] = [];
  if (!playerById(state, playerId)) return calls;
  for (const purchase of OFFER_PURCHASE_IDS) {
    if (!greatPersonPurchaseOpen(state, playerId, purchase)) continue;
    const words = CALL_WORDS[purchase];
    const glyph = YIELD_GLYPH[greatPersonOfferBank(purchase)];
    const label = `${words.verb} — ${greatPersonOfferPrice(purchase)}${glyph}`;
    const problem = greatPersonPurchaseError(state, playerId, purchase);
    calls.push({
      purchase,
      label,
      note: problem ?? words.note,
      disabled: problem !== null,
    });
  }
  return calls;
}

export interface ReliquaryScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /** The state changed. Redraws if the screen is up; cheap enough to call always. */
  refresh(): void;
  /** Puts this name face up the next time the screen is drawn. The ceremony's hand-off. */
  showPerson(id: GreatPersonId): void;
  dispose(): void;
}

export interface ReliquaryScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  onOpen?: () => void;
  /**
   * A call was bought. The screen dispatches nothing itself — `controls.ts`'s
   * discipline one sheet over: a screen names the verb and `main.ts` is the only
   * place a command is constructed.
   */
  onCall?: (purchase: OfferPurchaseId) => void;
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * One full tarot face, in the very classes the offer card deals.
 *
 * `offer-option` inside an `offer-options[data-face='tarot']` host, which is not
 * a borrowing so much as the point: the card a player was dealt and the card
 * they keep are **the same card**, and the only way to guarantee that across two
 * files is for the second one to ask for the first one's rules by name. The two
 * things a standing card must not do — respond to a hover as though it could be
 * picked, and carry a pick's cursor — are turned off in one small block in
 * `style.css` rather than by forking the face.
 *
 * An `<article>`, not a `<button>`: nothing here is a choice, so the keywords in
 * a clause are live links (`keywordsAllowedIn` answers off the tag, which is the
 * ruling's own instrument).
 */
export function drawReliquaryCard(card: ReliquaryCard): HTMLElement {
  const { face } = card;
  const article = document.createElement('article');
  article.className = card.revoked ? 'offer-option rel-card is-revoked' : 'offer-option rel-card';
  article.dataset.line = face.line;
  article.title = face.lineName;

  if (card.revoked) {
    // Across the face, in vermilion, and drawn **over** the card rather than
    // instead of it: the record is history and history is still readable.
    const band = element('span', 'rel-revoked-band', REVOKED_BAND);
    article.append(band);
  }

  const head = element('span', 'rel-card-head');
  head.append(element('span', 'offer-payoff', face.eyebrow));
  head.append(element('span', 'rel-tier-mark', face.tierMark));
  article.append(head);

  const emblem = element('span', 'offer-emblem');
  emblem.setAttribute('aria-hidden', 'true');
  emblem.style.setProperty('--line-mark', face.emblem);
  article.append(emblem);

  article.append(element('span', 'offer-option-title', face.name));

  // **The legacy is the headline** — the inversion, kept here too: what the card
  // *is* on this screen is the thing that is still paying, not the burst that is
  // long spent. A name that leaves no legacy says so plainly rather than showing
  // an empty column.
  const linked = keywordsAllowedIn(article);
  const clauses = element('span', 'offer-clauses');
  if (face.legacy.length === 0) {
    clauses.append(element('span', 'offer-clause is-deferred', 'They left no legacy.'));
  } else {
    for (const clause of face.legacy) {
      const line = element('span', clause.deferred ? 'offer-clause is-deferred' : 'offer-clause');
      setDescriptorText(line, clause.text, { linked });
      if (clause.deferred) line.title = 'Declared, and not built yet';
      clauses.append(line);
    }
  }
  article.append(clauses);

  // The stamp **at rest**: written landed, never played. A screen that replayed
  // the count every time an arrow was pressed would be a screen celebrating
  // itself (`landCardStamp`'s own docblock, and its second caller).
  //
  // A **struck** legacy goes back to the flourish, dimmed. That is not a
  // decoration: a revoked record contributes nothing to any ledger
  // (`explainCardImpact` prices it as a card *not held*, which is what it is),
  // so a figure printed here would be what this legacy would pay if it were
  // heeded again — and it never will be. The flourish is the vocabulary's own
  // way of saying "no number is true here", and the band above says why.
  if (card.revoked) {
    const stamp = cardStampNode();
    stamp.classList.add('is-struck');
    article.append(stamp);
  } else if (face.stamp !== null) {
    const stamp = cardStampNode();
    landCardStamp(stamp, face.stamp);
    article.append(stamp);
  }

  // The deed, small and quiet, under the number. It is the footnote the
  // inversion made it (`greatPersonFace.ts`'s `deedFootnote`).
  article.append(element('span', 'rel-deed', face.deed));

  const flavor = element('span', 'offer-flavor');
  flavor.append(element('span', 'flavor-label', 'Flavour'));
  flavor.append(document.createTextNode(face.flavor));
  article.append(flavor);
  return article;
}

export function createReliquaryScreen(options: ReliquaryScreenOptions): ReliquaryScreen {
  const { overlay, body, closeButton, trigger } = options;
  /** Which card is face up. A fact about a conversation, not about the game. */
  let at = 0;
  /** A name to land on the next time the screen draws — the ceremony's hand-off. */
  let wanted: GreatPersonId | null = null;

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function setExpanded(): void {
    trigger?.setAttribute('aria-expanded', String(isOpen()));
  }

  function draw(flip: boolean): void {
    const roll = reliquaryRoll(options.getState(), options.getPlayerId());
    body.replaceChildren();
    if (wanted !== null) {
      const found = roll.findIndex((card) => card.face.id === wanted);
      if (found >= 0) at = found;
      wanted = null;
    }
    if (roll.length === 0) {
      at = 0;
      body.append(element('p', 'rel-empty', RELIQUARY_EMPTY));
      // **The calls are drawn on an empty screen too**, and that is the case
      // that matters most: an empire that has just adopted The Commonwealth has
      // no legacies yet and its whole signature clause lives on this rail.
      drawCalls();
      return;
    }
    at = Math.min(Math.max(at, 0), roll.length - 1);

    const browser = element('div', 'rel-browser');
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'rel-arrow';
    back.textContent = '‹';
    back.setAttribute('aria-label', 'The card before');
    back.addEventListener('click', () => step(-1));
    browser.append(back);

    const stack = element('div', 'rel-stack');
    // Two under-cards, drawn only when there is more than one to be under: a
    // pile of one is a card, and a shadow implying otherwise would be a lie the
    // count line directly beneath it contradicts.
    if (roll.length > 1) {
      const under2 = element('span', 'rel-under rel-under-2');
      under2.setAttribute('aria-hidden', 'true');
      stack.append(under2);
    }
    if (roll.length > 2) {
      const under1 = element('span', 'rel-under rel-under-1');
      under1.setAttribute('aria-hidden', 'true');
      stack.append(under1);
    }
    const host = element('div', 'offer-options rel-face');
    host.dataset.face = 'tarot';
    const card = drawReliquaryCard(roll[at]!);
    if (flip) card.classList.add('is-flipping');
    host.append(card);
    stack.append(host);
    browser.append(stack);

    const forward = document.createElement('button');
    forward.type = 'button';
    forward.className = 'rel-arrow';
    forward.textContent = '›';
    forward.setAttribute('aria-label', 'The card after');
    forward.addEventListener('click', () => step(1));
    browser.append(forward);
    body.append(browser);

    const count = element('p', 'rel-count', reliquaryCount(at, roll.length));
    count.setAttribute('aria-live', 'polite');
    body.append(count);
    drawCalls();
  }

  /**
   * The rail of calls at the foot — see `ReliquaryCall`.
   *
   * Below the pile rather than above it, because the pile is what the screen is
   * for and this is a verb the law happens to allow; and drawn as decorated
   * buttons in plain ink rather than as foot links (the user's ruling of
   * 2026-09-06, item (r): a control meant to be taken sometimes for optimal play
   * is a button). A refused call is **greyed with the refusal on it** rather
   * than dropped, for the reroll's reason exactly: a price nobody can see is a
   * plan nobody can make.
   */
  function drawCalls(): void {
    const calls = reliquaryCalls(options.getState(), options.getPlayerId());
    if (calls.length === 0) return;
    const rail = element('div', 'rel-calls');
    for (const call of calls) {
      const line = element('div', 'rel-call-line');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'offer-pass offer-reroll rel-call';
      // Through the printer, never as text: the label carries the bank's glyph.
      const label = element('span', 'offer-look-label');
      setYieldText(label, call.label);
      button.append(label);
      button.title = call.note;
      button.disabled = call.disabled;
      button.addEventListener('click', () => options.onCall?.(call.purchase));
      line.append(button);
      line.append(element('p', 'rel-call-note', call.note));
      rail.append(line);
    }
    body.append(rail);
  }

  function step(direction: number): void {
    const roll = reliquaryRoll(options.getState(), options.getPlayerId());
    at = reliquaryStep(at, roll.length, direction);
    draw(true);
  }

  function open(): void {
    if (isOpen()) return;
    options.onOpen?.();
    overlay.hidden = false;
    setExpanded();
    draw(false);
    closeButton.focus();
  }

  function close(): void {
    if (!isOpen()) return;
    overlay.hidden = true;
    setExpanded();
    trigger?.focus();
  }

  /**
   * Escape closes, and ‹ › walk the pile.
   *
   * The arrow keys are claimed only while the screen is up — the board reads
   * them too, and a screen that swallowed them while hidden would be the leaked
   * listener of Entry LVII wearing a different costume. Capturing, like every
   * other parchment sheet's, so the board never sees the key underneath.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  }

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
      if (isOpen()) draw(false);
    },
    showPerson(id: GreatPersonId): void {
      wanted = id;
      if (isOpen()) draw(false);
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
