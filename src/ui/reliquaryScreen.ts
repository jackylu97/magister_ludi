/**
 * The Reliquary: **the honored dead, and what they still pay you.**
 *
 * `docs/history/doctrine-ideas.md`, "The Reliquary is a SCREEN" (re-ruled 2026-09-03).
 * It fixes a real and quiet gap: a legacy reaches the empire's ledger through
 * `liveEffects`' sixth source and appears on **no surface at all** once the
 * ceremony is over — a player three ages in has six permanent abilities and no
 * way to be reminded what any of them are. The renown chip is the door, because
 * renown → great people → their legacies is the path the player already walks.
 *
 * The sibling it is built from, and where it stops
 * -----------------------------------------------
 * The Statecraft / Religion / Trade / Bead sheets, in the family sense: the same
 * overlay classes, and since batch H5 the same frame — `modalShell.ts`, where
 * `hidden` is the whole of the screen state and the ×, Escape and a press on the
 * ground arrive at one `close`. This is the shell's only user of `onKey`, for
 * the ‹ › that walk the pile. It wears `.statecraft-overlay` like every other
 * sheet, which is what the capped-overlay rule in `style.css` is scoped to now,
 * and then narrows its own width under its own id — the block's own comment
 * invites exactly that.
 *
 * Since batch SS3 it is a **full sheet**, laid out as the Reliquary board draws
 * it (`docs/plans/mockups/scholars-study/Reliquary.dc.html`; the user: "lets
 * have that be its own screen instead of a small popover"). Three columns and
 * a foot:
 *
 *   - **left**, the families: one row a family with its count, which shows only
 *     that family's cards in the pile and the fan, and under it the rest of the
 *     deck as a fan of small cards, each of which can be brought to the top;
 *   - **middle**, the desk: the card on top of its pile, larger than before and
 *     the same face, the ‹ › on either side, and the count under it;
 *   - **right**, renown against the next price, the odds of the next offer, and
 *     this turn's renown by town;
 *   - **the foot**, the calls the law allows.
 *
 * Still one card face up at a time: a player is not comparing legacies (they
 * cannot change any of them), they are *remembering* one.
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
 * The renown section
 * ------------------
 * Batch GP1 of 2026-11-12 (`docs/flags.md` item (mmmmmmm)) adds a section under
 * the pile: the pool against the next price, the odds of the next offer, and
 * this turn's renown with one line for each town. The renown figure on the top
 * bar opens this sheet, so this is where a player's "Renown tab" lives. A town's
 * line opens to its sources here, because the hover card cannot be clicked. The
 * readings are `renownTab.ts`'s. The sheet now scrolls when the pile and the
 * section do not fit.
 *
 * What is deliberately **not** here: the lifetime "has produced" tally. It is
 * phase 2 and it needs a schema field (`docs/history/doctrine-ideas.md`), and a dash
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
import { FAMILY_EMBLEM, type GreatPersonFace, greatPersonCard, greatPersonStamp } from './greatPersonFace';
import { FAMILIES, type Family, type GreatPersonId, isGreatPersonId } from '../sim/greatPeopleData';
import { seatName } from '../sim/leaderData';
import { cardLineMarkUrl } from './cardLine';
import { renownMarkNode } from './meterMark';
import { numberWords } from './numberWords';
import {
  OFFER_PURCHASE_IDS,
  type OfferPurchaseId,
  greatPersonOfferBank,
  greatPersonOfferPrice,
  greatPersonPurchaseError,
  greatPersonPurchaseOpen,
} from '../sim/greatPeople';
import { YIELD_GLYPH, figure, signedMeterFigure } from './figures';
import { setYieldText } from './yieldMark';
import { cardStampNode, landCardStamp } from './cardStamp';
import { fitGreatPersonCard, greatPersonCardNode } from './greatPersonCard';
import { element } from './dom';
import { createModalShell } from './modalShell';
import { renownThreshold } from '../sim/renown';
import {
  type RenownLedgerRow,
  foldRenownLedger,
  renownLedgerRows,
  renownOddsNode,
  renownOddsReading,
} from './renownTab';

/**
 * One card in the roll: the face, plus the one fact the face itself cannot
 * carry — whether this empire still heeds it.
 *
 * `revoked` rides the *record*, not the person: revocation is a mark on
 * `LegacyRecord` (`state.ts` — history is never deleted), so the same name in
 * two empires can be heeded in one and struck in the other.
 */
interface ReliquaryCard {
  /**
   * The face, **with no figure on it** — `greatPersonCard`'s half.
   *
   * The whole roll is built on every draw and only one card of it is face up, so
   * the figure is asked for that one card and nowhere else (`reliquaryStamped`,
   * batch H18). `face.stamp` is therefore `null` on every card in this list, and
   * means *not asked*.
   */
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
      // The words, the accent and the emblem — never the figure. See
      // `ReliquaryCard.face` and `reliquaryStamped`.
      face: greatPersonCard(record.id),
      age: record.age,
      revoked: record.revoked === true,
    });
  }
  return roll;
}

/**
 * The one card that is **face up**, with its figure asked for.
 *
 * The Reliquary's whole arithmetic, and batch H18's fix to it. `greatPersonFace`
 * asks `explainCardImpact` — a ghost-diff that prices every town in this empire
 * twice — and the roll used to ask it for every legacy in the pile on every
 * draw, which is once per open *and* once per press of an arrow. Only one card
 * is ever face up and the two under-cards are drawn edge-on with nothing on
 * them, so the pile was paying five or ten readings to print one.
 *
 * A **struck** record is handed back untouched, and that is the same ruling
 * `drawReliquaryCard` keeps one function down: a revoked legacy goes back to the
 * flourish, so there was never a figure to ask for. It was being priced anyway.
 */
export function reliquaryStamped(
  state: GameState,
  playerId: number,
  card: ReliquaryCard,
): ReliquaryCard {
  if (card.revoked) return card;
  return { ...card, face: { ...card.face, stamp: greatPersonStamp(state, playerId, card.face.id) } };
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

/** A family's name on the rail: "Merchants". The interface's word, not the data's. */
export const FAMILY_PLURAL: Readonly<Record<Family, string>> = {
  scholar: 'Scholars',
  artist: 'Artists',
  engineer: 'Engineers',
  merchant: 'Merchants',
  general: 'Generals',
};

/** One row of the families rail. */
export interface ReliquaryFamilyRow {
  family: Family;
  label: string;
  /** Cards of this family in the deck, struck ones included. */
  count: number;
}

/**
 * The families rail, after "The whole deck": the families that have cards, the
 * most first, and a tie to the family whose newest card is newer; then the
 * families with none, in the roster's own order, drawn dashed with "none yet"
 * (the board). Pure, because the order is the sort of thing that is quietly
 * wrong.
 */
export function reliquaryFamilies(roll: readonly ReliquaryCard[]): ReliquaryFamilyRow[] {
  const counts = new Map<Family, number>();
  const newest = new Map<Family, number>();
  roll.forEach((card, at) => {
    const family = card.face.family;
    counts.set(family, (counts.get(family) ?? 0) + 1);
    if (!newest.has(family)) newest.set(family, at);
  });
  const rows = FAMILIES.map((family) => ({
    family,
    label: FAMILY_PLURAL[family],
    count: counts.get(family) ?? 0,
  }));
  const held = rows
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || newest.get(a.family)! - newest.get(b.family)!);
  return [...held, ...rows.filter((row) => row.count === 0)];
}

/** The deck as one family sees it, or the whole deck for `null`. Newest first, as the roll is. */
export function reliquaryOfFamily(
  roll: readonly ReliquaryCard[],
  family: Family | null,
): ReliquaryCard[] {
  return family === null ? [...roll] : roll.filter((card) => card.face.family === family);
}

/**
 * The fan: the cards under the top one, in the order the arrows would turn them
 * up, at most `max` of them. Each keeps its place in the deck, so a click can
 * bring it to the top.
 */
export function reliquaryFan(
  deck: readonly ReliquaryCard[],
  at: number,
  max: number,
): { card: ReliquaryCard; index: number }[] {
  const fan: { card: ReliquaryCard; index: number }[] = [];
  for (let step = 1; step < deck.length && fan.length < max; step += 1) {
    const index = (at + step) % deck.length;
    fan.push({ card: deck[index]!, index });
  }
  return fan;
}

/**
 * The line beside the title: whose deck, and how many legacies still pay.
 * "Mansa Musa · five legacies in force". A struck legacy is in the deck but not
 * in force, so it is not counted here.
 */
export function reliquarySubtitle(seat: string, roll: readonly ReliquaryCard[]): string {
  const live = roll.filter((card) => !card.revoked).length;
  if (roll.length === 0) return `${seat} · no one called yet`;
  if (live === 0) return `${seat} · no legacy in force`;
  return `${seat} · ${numberWords(live)} ${live === 1 ? 'legacy' : 'legacies'} in force`;
}

/** The count under a family's pile: "1 of 2 · merchants". The whole deck keeps `reliquaryCount`. */
export function reliquaryFamilyCount(index: number, total: number, family: Family): string {
  if (total <= 0) return '';
  const at = Math.min(Math.max(index, 0), total - 1);
  return `${at + 1} of ${total} · ${FAMILY_PLURAL[family].toLowerCase()}`;
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
interface ReliquaryCall {
  purchase: OfferPurchaseId;
  /** The button's words. "Call a name". */
  label: string;
  /**
   * The price, on the face and in tabular mono — "250💰".
   *
   * Split from the label when the offer sheet's two answers became decorated
   * buttons (ruling r, 2026-09-07): a call wears the same face, and on that face
   * the words and the figure are two lines, because every number in this
   * interface is set in the mono and the words are not.
   */
  figure: string;
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
    const problem = greatPersonPurchaseError(state, playerId, purchase);
    calls.push({
      purchase,
      label: words.verb,
      figure: `${greatPersonOfferPrice(purchase)}${glyph}`,
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

interface ReliquaryScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /**
   * The board's own revision — `GameState.revision` (batch H18, re-keyed by E2).
   *
   * The key the face-up card's figure is remembered under, together with the
   * state object itself. It changes on exactly the occasions the answer can:
   * `applyCommand` raises it on every accepted command and `runEndOfTurn` once
   * after each phase, which are the two ways the world moves at all, so a figure
   * taken at one revision is the figure at that revision. The state object is in
   * the key beside it because a game *loaded* over this one is a different board
   * that may sit at the same number, and `restoreState` always builds a fresh
   * object.
   *
   * Optional, and a screen without one simply remembers nothing.
   */
  getRevision?: () => number;
  onOpen?: () => void;
  /**
   * A call was bought. The screen dispatches nothing itself — `controls.ts`'s
   * discipline one sheet over: a screen names the verb and `main.ts` is the only
   * place a command is constructed.
   */
  onCall?: (purchase: OfferPurchaseId) => void;
}

/**
 * **The great person card**, the very card the offer deals (Quiet Table, build
 * stage 2; the third pass's frame c4, approved: "Great"). A name you were dealt
 * and a name you keep are one card: `greatPersonCard.ts` draws both.
 *
 * An `<article>`, not a `<button>`: nothing here is a choice, so the keywords
 * in the legacy are live links (`keywordsAllowedIn`, asked by the card off the
 * tag it is given).
 *
 * The stamp sits in the card's seat **at rest**: written landed, never played.
 * A screen that replayed the count every time an arrow was pressed would be a
 * screen celebrating itself (`landCardStamp`'s own docblock).
 *
 * A **struck** legacy goes back to the flourish, dimmed, with the band across
 * the card. A revoked record contributes nothing to any ledger
 * (`explainCardImpact` prices it as a card *not held*, which is what it is), so
 * a figure printed here would be what this legacy would pay if it were heeded
 * again, and it never will be.
 */
function drawReliquaryCard(card: ReliquaryCard): HTMLElement {
  const { face } = card;
  const { card: article, seat } = greatPersonCardNode(face);
  article.classList.add('rel-card');
  if (card.revoked) article.classList.add('is-revoked');
  article.title = face.lineName;
  if (card.revoked) {
    // Across the face, in vermilion, and drawn **over** the card rather than
    // instead of it: the record is history and history is still readable.
    article.append(element('span', 'rel-revoked-band', REVOKED_BAND));
    const stamp = cardStampNode();
    stamp.classList.add('is-struck');
    seat.append(stamp);
  } else if (face.stamp !== null) {
    const stamp = cardStampNode();
    landCardStamp(stamp, face.stamp);
    seat.append(stamp);
  }
  return article;
}

/**
 * The line under the pile: the count, then what the person's charge was spent
 * on (the board: "1 of 4 · spent as a scholar: Write a Treatise, or Found an
 * Academy"). The deed is the footnote the inversion made it
 * (`greatPersonFace.ts`'s `deedFootnote`), and it stands under the card now
 * rather than on it.
 */
export function reliquaryDeskLine(count: string, deed: string): string {
  return count === '' ? '' : `${count} · ${deed}`;
}

export function createReliquaryScreen(options: ReliquaryScreenOptions): ReliquaryScreen {
  const { overlay, body, closeButton, trigger } = options;
  /** Which card is face up. A fact about a conversation, not about the game. */
  let at = 0;
  /** A name to land on the next time the screen draws — the ceremony's hand-off. */
  let wanted: GreatPersonId | null = null;

  /**
   * The figures already asked for, under the board they were asked about.
   *
   * `‹ ›` walk the pile, and a player walking back to a card they have already
   * looked at should not pay a second ghost-diff for a board that has not moved.
   * The key is `(the state object, the revision)` — see `getRevision` — and the
   * whole table is thrown away the moment either changes, so nothing here can
   * outlive the answer it belongs to. A screen given no revision remembers
   * nothing at all and simply asks every time, which is what it did before.
   */
  const stamped = new Map<GreatPersonId, ReliquaryCard>();
  let stampedState: GameState | null = null;
  let stampedAt = -1;
  /** Whose ledger those figures were read off. A seat hop is a different empire. */
  let stampedSeat = -1;

  /** The face-up card, its figure asked for once per card per board. */
  function withFigure(state: GameState, playerId: number, card: ReliquaryCard): ReliquaryCard {
    const revision = options.getRevision?.();
    if (revision === undefined) return reliquaryStamped(state, playerId, card);
    if (stampedState !== state || stampedAt !== revision || stampedSeat !== playerId) {
      stamped.clear();
      stampedState = state;
      stampedAt = revision;
      stampedSeat = playerId;
    }
    const known = stamped.get(card.face.id);
    if (known !== undefined) return known;
    const fresh = reliquaryStamped(state, playerId, card);
    stamped.set(card.face.id, fresh);
    return fresh;
  }

  /**
   * The towns whose renown line is open, by city id. A fact about this
   * conversation, like `at`: the sheet redraws on every arrow and refresh, and
   * a line the player opened should stay open.
   */
  const openTowns = new Set<number>();

  /**
   * The family the rail is showing, or `null` for the whole deck. A fact about
   * this conversation, like `at`.
   */
  let family: Family | null = null;

  /** At most this many small cards in the fan: the board's four, and one more. */
  const FAN_MAX = 5;

  function draw(flip: boolean): void {
    const state = options.getState();
    const playerId = options.getPlayerId();
    const roll = reliquaryRoll(state, playerId);
    body.replaceChildren();
    if (wanted !== null) {
      const found = roll.findIndex((card) => card.face.id === wanted);
      if (found >= 0) {
        family = null;
        at = found;
      }
      wanted = null;
    }
    // A family the deck no longer holds (a new game, a seat hop) is the whole deck.
    if (family !== null && !roll.some((card) => card.face.family === family)) family = null;
    const deck = reliquaryOfFamily(roll, family);
    at = deck.length === 0 ? 0 : Math.min(Math.max(at, 0), deck.length - 1);

    const subtitle = overlay.querySelector<HTMLElement>('.rel-subtitle');
    if (subtitle) subtitle.textContent = reliquarySubtitle(seatName(state, playerId), roll);

    const grid = element('div', 'rel-grid');
    grid.append(drawLeft(roll, deck), drawDesk(state, playerId, deck, flip), drawRenown());
    body.append(grid);
    // The cards fit their names and the desk card its legacy now that they are
    // on the page, and again once the card fonts have loaded.
    const cards = [...body.querySelectorAll<HTMLElement>('.gp-card')];
    for (const card of cards) fitGreatPersonCard(card);
    if (cards.length > 0) {
      void document.fonts?.ready.then(() => {
        for (const card of cards) if (card.isConnected) fitGreatPersonCard(card);
      });
    }
    // **The calls are drawn on an empty screen too**, and that is the case that
    // matters most: an empire that has just adopted The Commonwealth has no
    // legacies yet and its whole signature clause lives on this rail.
    drawCalls();
  }

  /** The left column: the families rail, then the rest of the deck as a fan. */
  function drawLeft(roll: readonly ReliquaryCard[], deck: readonly ReliquaryCard[]): HTMLElement {
    const column = element('div', 'rel-column rel-left');
    column.append(element('h3', 'rel-heading', 'The families'));
    const rail = element('div', 'rel-families');
    rail.setAttribute('role', 'group');
    rail.setAttribute('aria-label', 'Show one family');
    rail.append(familyButton('The whole deck', roll.length, family === null, null));
    for (const row of reliquaryFamilies(roll)) {
      rail.append(familyButton(row.label, row.count, family === row.family, row.family));
    }
    column.append(rail);

    column.append(element('h3', 'rel-heading is-spaced', 'The rest of the deck'));
    const fan = reliquaryFan(deck, at, FAN_MAX);
    if (fan.length === 0) {
      column.append(
        element(
          'p',
          'rel-caption',
          deck.length === 0 ? 'The deck is empty.' : 'No other card is in this deck yet.',
        ),
      );
      return column;
    }
    const spread = element('div', 'rel-fan');
    spread.setAttribute('role', 'group');
    spread.setAttribute('aria-label', 'The other cards, as a fan');
    // The board's fan of four: from -10 to 10 degrees, 44 px apart. More cards
    // close the gaps rather than widen the fan, so it stays in its column.
    const spreadDeg = 20;
    const gap = fan.length === 1 ? 0 : Math.min(44, 132 / (fan.length - 1));
    const first = 30 + (132 - gap * (fan.length - 1)) / 2;
    fan.forEach(({ card, index }, n) => {
      const t = fan.length === 1 ? 0.5 : n / (fan.length - 1);
      const mini = miniCard(card);
      mini.style.left = `${first + gap * n}px`;
      mini.style.top = `${18 + Math.round(Math.abs(t - 0.5) * 20)}px`;
      mini.style.transform = `rotate(${((t - 0.5) * spreadDeg).toFixed(1)}deg)`;
      mini.addEventListener('click', () => {
        at = index;
        draw(true);
      });
      spread.append(mini);
    });
    column.append(spread);
    column.append(element('p', 'rel-caption', 'Click a card to bring it to the top.'));
    return column;
  }

  /** One row of the families rail. A family with no card is dashed and does nothing. */
  function familyButton(
    label: string,
    count: number,
    pressed: boolean,
    which: Family | null,
  ): HTMLElement {
    const empty = which !== null && count === 0;
    const button = element('button', empty ? 'rel-family is-empty' : 'rel-family');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(pressed));
    if (pressed) button.classList.add('is-pressed');
    const mark = element('span', which === null ? 'rel-family-mark is-deck' : 'rel-family-mark');
    mark.setAttribute('aria-hidden', 'true');
    if (which !== null && !empty) {
      mark.style.setProperty('--line-mark', cardLineMarkUrl(FAMILY_EMBLEM[which]));
    }
    button.append(mark, element('span', 'rel-family-name', label));
    button.append(element('span', 'rel-family-count', empty ? 'none yet' : String(count)));
    if (empty) {
      button.setAttribute('aria-disabled', 'true');
      return button;
    }
    button.addEventListener('click', () => {
      family = which;
      at = 0;
      draw(true);
    });
    return button;
  }

  /** A small card in the fan: its name, its family's mark, and its emblem. */
  function miniCard(card: ReliquaryCard): HTMLElement {
    const { face } = card;
    const button = element('button', card.revoked ? 'rel-mini is-revoked' : 'rel-mini');
    button.type = 'button';
    button.dataset.line = face.line;
    button.setAttribute(
      'aria-label',
      `${face.name}, ${face.family}${card.revoked ? ', revoked' : ''}. Brings it to the top.`,
    );
    // The same card, as a thumbnail: the tab, the window and the name.
    button.append(greatPersonCardNode(face, { mini: true, inControl: true }).card);
    if (card.revoked) button.append(element('span', 'rel-mini-band', REVOKED_BAND));
    return button;
  }

  /** The middle column: the card on top of its pile, the arrows, and the count. */
  function drawDesk(
    state: GameState,
    playerId: number,
    deck: readonly ReliquaryCard[],
    flip: boolean,
  ): HTMLElement {
    const desk = element('div', 'rel-desk');
    if (deck.length === 0) {
      // An empty deck: a dashed outline holds the deck's place (the board).
      const place = element('div', 'rel-place');
      place.append(element('p', 'rel-empty', RELIQUARY_EMPTY));
      desk.append(place);
      return desk;
    }
    const browser = element('div', 'rel-browser');
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'rel-arrow';
    back.textContent = '‹';
    back.setAttribute('aria-label', 'The card before');
    back.addEventListener('click', () => step(-1));
    browser.append(back);

    const stack = element('div', 'rel-stack');
    // The edges of the cards under the top one, drawn only when there are cards
    // to be under: a pile of one is a card, and a shadow implying otherwise
    // would be a lie the count line directly beneath it contradicts.
    for (let edge = Math.min(4, deck.length - 1); edge >= 1; edge -= 1) {
      const under = element('span', `rel-under rel-under-${edge}`);
      under.setAttribute('aria-hidden', 'true');
      stack.append(under);
    }
    const host = element('div', 'rel-face');
    // The figure is asked for **here**, for this one card — see `reliquaryStamped`.
    const top = withFigure(state, playerId, deck[at]!);
    const card = drawReliquaryCard(top);
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
    desk.append(browser);

    const count = element(
      'p',
      'rel-count',
      reliquaryDeskLine(
        family === null ? reliquaryCount(at, deck.length) : reliquaryFamilyCount(at, deck.length, family),
        top.face.deed,
      ),
    );
    count.setAttribute('aria-live', 'polite');
    desk.append(count);
    return desk;
  }

  /**
   * The renown section, under the pile: the pool against the next price, the
   * odds of the next offer, and this turn's renown with one line for each town
   * (batch GP1 of 2026-11-12, `docs/flags.md` item (mmmmmmm)).
   *
   * A town's line is a `<details>`: it opens to the town's own sources. The
   * figures are `renownTab.ts`'s readings, and the total under the double rule
   * is the fold of the rows' lines (rule 5).
   */
  function drawRenown(): HTMLElement {
    const state = options.getState();
    const playerId = options.getPlayerId();
    const player = playerById(state, playerId);
    const section = element('section', 'rel-column rel-renown');
    section.setAttribute('aria-label', 'Renown');
    if (!player) return section;

    section.append(element('h3', 'rel-heading', 'The next great person'));
    const threshold = renownThreshold(state, player);
    const pool = element('p', 'rel-renown-pool');
    pool.append(renownMarkNode());
    const words = element('span', 'rel-renown-pool-words', 'Renown ');
    words.append(element('span', 'rel-renown-pool-figure is-strong', figure(player.renownPool)));
    words.append(document.createTextNode(' of '));
    words.append(element('span', 'rel-renown-pool-figure', figure(threshold)));
    words.append(document.createTextNode(' for the next name'));
    pool.append(words);
    section.append(pool);
    const bar = element('span', 'rel-renown-bar');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', `Renown: ${figure(player.renownPool)} of ${figure(threshold)}`);
    const fill = element('span', 'rel-renown-fill');
    const share = threshold <= 0 ? 1 : Math.min(1, Math.max(0, player.renownPool / threshold));
    fill.style.width = `${(share * 100).toFixed(1)}%`;
    bar.append(fill);
    section.append(bar);

    const odds = renownOddsReading(state, playerId);
    if (odds !== null) {
      section.append(element('h3', 'rel-heading is-small is-spaced', 'The odds of the next offer'));
      section.append(renownOddsNode(odds));
    }

    section.append(element('h3', 'rel-heading is-small is-spaced', 'Renown this turn'));
    const rows = renownLedgerRows(state, playerId);
    if (rows.length === 0) {
      section.append(
        element('p', 'rel-renown-empty', 'Nothing yet. Libraries, wonders and Triumphs pay renown.'),
      );
    } else {
      const list = element('ul', 'rel-ledger');
      for (const row of rows) list.append(drawLedgerRow(row));
      section.append(list);
      const total = element('div', 'rel-ledger-total ledger-total');
      total.append(element('span', 'rel-ledger-source', 'This turn'));
      total.append(element('span', 'rel-ledger-value', signedMeterFigure(foldRenownLedger(rows))));
      section.append(total);
      if (rows.some((row) => row.cityId !== undefined)) {
        section.append(element('p', 'rel-caption', 'Click a town to see its sources.'));
      }
    }
    return section;
  }

  /** One row of the ledger: a town that opens to its sources, or a line of its own. */
  function drawLedgerRow(row: RenownLedgerRow): HTMLElement {
    const item = element('li', 'rel-ledger-row');
    const head = (into: HTMLElement): void => {
      into.append(element('span', 'rel-ledger-source', row.source));
      into.append(element('span', 'rel-ledger-value', signedMeterFigure(row.amount)));
    };
    const cityId = row.cityId;
    if (cityId === undefined) {
      const line = element('div', 'rel-ledger-line');
      head(line);
      item.append(line);
      return item;
    }
    const fold = element('details', 'rel-ledger-town');
    fold.open = openTowns.has(cityId);
    fold.addEventListener('toggle', () => {
      if (fold.open) openTowns.add(cityId);
      else openTowns.delete(cityId);
    });
    const summary = element('summary', 'rel-ledger-line');
    head(summary);
    fold.append(summary);
    const sources = element('ul', 'rel-ledger-sources');
    for (const line of row.lines) {
      const source = element('li', 'rel-ledger-line');
      source.append(element('span', 'rel-ledger-source', line.source));
      source.append(element('span', 'rel-ledger-value', signedMeterFigure(line.amount)));
      sources.append(source);
    }
    fold.append(sources);
    item.append(fold);
    return item;
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
    // The sheet's foot, under the three columns (the board).
    const rail = element('div', 'rel-calls');
    for (const call of calls) {
      const line = element('div', 'rel-call-line');
      const button = document.createElement('button');
      button.type = 'button';
      // The offer sheet's own answer, one spelling of one control: a purchase is
      // a purchase wherever it is drawn, and this is the face ruling (r) gave the
      // reroll and the pass.
      button.className = 'btn offer-answer offer-answer-reroll rel-call';
      const label = element('span', 'offer-answer-label');
      label.textContent = call.label;
      button.append(label);
      // Through the printer, never as text: the figure carries the bank's glyph.
      const figure = element('span', 'offer-answer-figure');
      setYieldText(figure, call.figure);
      button.append(figure);
      button.title = call.note;
      button.disabled = call.disabled;
      button.addEventListener('click', () => options.onCall?.(call.purchase));
      line.append(button);
      // The note is what the call *does*, or — on a refused call, which is what
      // `disabled` means here — the reducer's sentence about what the bank has
      // not got. The second of those is a lack, so it wears `wanting`, the one
      // vermilion italic every surface says a lack in (the user, 2026-09-08);
      // the first is an explanation and stays quiet.
      line.append(
        element('p', call.disabled ? 'rel-call-note wanting' : 'rel-call-note', call.note),
      );
      rail.append(line);
    }
    body.append(rail);
  }

  function step(direction: number): void {
    const deck = reliquaryOfFamily(reliquaryRoll(options.getState(), options.getPlayerId()), family);
    at = reliquaryStep(at, deck.length, direction);
    draw(true);
  }

  /**
   * The frame (`modalShell.ts`) — `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`, and the
   * disposer is the game's.
   *
   * This sheet is the shell's one user of `onKey`: **‹ › walk the pile**. The
   * arrows are claimed only while the screen is up, because the board reads them
   * too and a screen that swallowed them while hidden would be the leaked
   * listener of Entry LVII wearing a different costume — which is exactly the
   * guarantee the shell's own `isOpen` check gives every key it hands on.
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    draw: () => draw(false),
    onKey: (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
      event.preventDefault();
      event.stopPropagation();
      step(event.key === 'ArrowLeft' ? -1 : 1);
      return true;
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    showPerson(id: GreatPersonId): void {
      wanted = id;
      if (shell.isOpen) draw(false);
    },
    dispose: shell.dispose,
  };
}
