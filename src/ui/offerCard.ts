/**
 * The offer card: pick one of N, on parchment.
 *
 * Built for the discoveries (playable.md item 3) and deliberately shaped for the
 * thing after it. Entry XV's Statecraft draft is the same gesture at a different
 * scale — a hand of cards, chosen once every few turns — and the
 * shape of that gesture is *an offer of N options, each with a name, a line of
 * flavour and a stated payoff, exactly one of which is taken*. So this component
 * knows about options and nothing about ruins: no discovery id, no yield, no
 * city, no simulation type at all crosses its boundary. The caller renders its
 * own payoff line and hands over strings.
 *
 * Generic-ish, and no further
 * ---------------------------
 * It is emphatically not a framework. There is no reroll, no multi-select and no
 * disabled state; they can be added when there is a real second caller with real
 * requirements. What is shared today is the part that would otherwise be
 * rewritten badly: the modal's bones, the keyboard contract, focus handling, and
 * the ink/parchment language of the card itself.
 *
 * Modal, and it means it
 * ----------------------
 * This is the one screen in the interface that is genuinely blocking, and that is
 * a design decision rather than an oversight. Everything else here — the turn
 * splash, the notices, the panels — can be ignored or dismissed, because the
 * player can always come back to it. An offer cannot be come back to by any other
 * route: the boon sits on the empire until it is spent, and Esc would mean
 * "throw it away", which is not a thing the player asked for. So there is no
 * dismiss and no close button; the only way out is to choose, and the End Turn
 * blocker is what stops the player wandering off before they do.
 *
 * **A pass is a choice, never a dismiss** (the Statecraft draft, 2026-09-04).
 * `Offer.pass` puts a second answer on the sheet — "take none of these" — and
 * it is a *button that reports back to the caller*, which dispatches a command,
 * exactly as taking a card does. It is drawn in the foot beside View map and
 * spelled out in words, because the two are the opposite of one another and the
 * one thing this component may never do is let them be confused: View map keeps
 * the offer, a pass spends it. Nothing here decides that a pass is available —
 * an offer that carries no `pass` shows no such button, which is every offer but
 * the Order draft.
 *
 * Hidden is not dismissed
 * -----------------------
 * The one thing that *was* an oversight: a draft asks "which of these three",
 * and the answer depends on the board — which city is starving, where the
 * frontier is, whether that wonder is worth the hammers — and the sheet was over
 * the board (user, 2026-08-27). So there is now a **View map** control, and it is
 * emphatically not a dismiss:
 *
 *   · nothing is spent. The offer is still on the empire, still first in
 *     `firstBlocker`, still what End Turn stops on. Not one command is sent.
 *   · the sheet is put away and the *offer is kept*, so reopening deals the same
 *     cards in the same order with the same indices — which it must, because an
 *     offer is drawn once at the moment it opens (CLAUDE.md) and a redraw would
 *     make the deal a function of when somebody looked at a screen.
 *   · the return is *persistent and obvious*: the caller raises a pinned chip and
 *     End Turn's own blocker leads back here, which is the affordance this
 *     interface already uses for "you owe the turn something".
 *
 * Which is why Escape now does something here after years of doing nothing, and
 * why it still does not mean "throw it away": it means "let me look first".
 * `phaseAfter` is the whole of that distinction, written down as three states so
 * the difference between *hidden* and *gone* is a thing a test can hold still.
 *
 * Data is data
 * ------------
 * Every string arrives as a text node, never as markup: a city's name, a unit's
 * name and a line of flavour are all data, and data never gets to be HTML. That
 * is `turnSplash.ts`'s rule and it is the same rule here for the same reason.
 */

import { STAMP_TIMING, type StampReading, cardStampNode, playCardStamp, stampIsEmpty } from './cardStamp';
import { cardLineMarkUrl } from './cardLine';
import { setDescriptorText } from './keywords';
import { setYieldText } from './yieldMark';

// --- the back ---------------------------------------------------------------

/**
 * How long a card takes to come over, and how long between two of them.
 *
 * Milliseconds, and they are here rather than in `style.css` because the script
 * has to know when the last card has landed in order to take the backs down.
 * Two numbers in one place beat a duration in the stylesheet and a timeout in
 * the module that quietly disagree by 40ms and leave a back on the table.
 */
const DEAL_MS = 420;
const DEAL_STAGGER_MS = 110;

/**
 * Does this viewer want motion?
 *
 * Asked at the moment of dealing rather than cached, because the preference can
 * change while the page is up and the honest answer is the one that holds when
 * the cards are laid. Guarded for `matchMedia`'s absence, which is not a browser
 * this game runs in but is every test environment that ever renders a DOM.
 */
function wantsMotion(): boolean {
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * One card's back: the weave, the gilt rules and the neutral seal.
 *
 * Entry VII's card-back weave, and the reason it can be one element is that a
 * back has nothing to say. It is identical on every card in the hand — same
 * ink, same emblem, same rules — because a back that varied would be telling
 * you which card to turn over first, which is the one thing a deck must never
 * do. The emblem is `CARD_LINE_MARKS.none`, the lozenge seal the Statecraft
 * screen already stamps with, asked for through `cardLine.ts` like every other
 * card emblem; drawing a ninth seal for the back would have been a second deck.
 */
function cardBack(): HTMLElement {
  const back = element('span', 'card-back');
  back.setAttribute('aria-hidden', 'true');
  back.style.setProperty('--card-back-emblem', cardLineMarkUrl('none'));
  return back;
}

/** One thing a player may take. Strings only — see the module docblock. */
export interface OfferOption {
  /** The name on the card. "Star tablets". */
  title: string;
  /**
   * The payoff, stated as the exact number the empire will receive: "+20⚙ to
   * Uruk", "+15🔬", "A free Scout". The caller composes it, because glyphs are
   * the interface's table (`figures.ts`) and the amounts are the simulation's.
   *
   * It is set as the card's **eyebrow** — the small mono line at the top of the
   * frame — because on a Statecraft card that is what it is: "military order",
   * "permanent", "2 military · 1 economic". A discovery's `+20⚙ to Uruk` is the
   * same sentence about a different kind of gift.
   */
  payoff: string;
  /** One line of flavour, set in the name face. */
  flavor: string;
  /**
   * What this would finish on the spot — "completes Granary", "grows to 4",
   * "completes Mining" — or absent. The whole point of a windfall settling
   * instantly is worth saying *before* the choice, not after it.
   */
  note?: string;
  /**
   * The same, as **separate clauses** — one line each, and each able to say that
   * it is a promise the game has not made.
   *
   * `note` joins a card's clauses with a middle dot, which is right for three
   * short ones and wrong the moment one of them is *declared and not built*: a
   * struck-through half inside a joined string cannot be struck through at all,
   * and the card would be quietly claiming a rule it does not have. So a caller
   * with a `deferred` half hands over the list and the card rules each line on
   * its own.
   *
   * Strings, like everything else that crosses this boundary — the caller has
   * already turned a `CardClause` into text and a flag, and this component still
   * knows nothing about cards. `note` and `notes` are not exclusive; nothing
   * uses both today.
   */
  notes?: readonly { text: string; deferred?: boolean }[];
  /**
   * Why this payoff would be wasted, or absent. An empire with no cities has
   * nowhere to put a lump of food, and a card that quietly paid it nowhere
   * would be the interface keeping a secret.
   */
  warning?: string;
  /**
   * A last small line under the flavour: what this name actually was.
   *
   * The great-person card's kernel — "vizier, physician, the first architect
   * with a name" — and the register is Entry III's: the flavour is what the
   * person *said*, the footnote is why anybody remembers them. Set below the
   * flavour rather than inside it because they are two different voices, and a
   * card that ran them together would be putting an encyclopaedia entry in
   * italics.
   */
  footnote?: string;
  /**
   * The accent key this card is drawn in, reaching the DOM as `data-line` and
   * resolved to ink by one block of `style.css`. A **string**, not a `CardLine`:
   * the module docblock's rule holds, and the caller looks the key up in
   * `ui/cardLine.ts`, which is where the interface decides what a line looks
   * like. Absent is the neutral card, which is most of the good ones.
   */
  line?: string;
  /**
   * The emblem in the middle of the frame, as a ready CSS `url(…)` value for the
   * mask. A picture rather than an id, for the same boundary reason — see
   * `cardLineMarkUrl`.
   */
  emblem?: string;
  /**
   * What the accent *is*, in words — "The Wild Hunt". It becomes the card's
   * `title`, so the one thing a colour cannot do (say its own name) is done by
   * the platform's own tooltip rather than by a legend nobody would read.
   */
  lineName?: string;
  /**
   * What this card would be **worth**, for the stamp — and the one thing on this
   * face that is deliberately not shown while the offer is up.
   *
   * The choreography is the mock's (`docs/doctrine-ideas.md`, Part IV, the
   * design of record): during selection every card wears the small flourish and
   * **no digits at all**, because a hand of three figures is a hand that has
   * already chosen for the player. The pick reveals the taken card's number —
   * counted up, or thunked for a card that pays on an occasion — and the sheet
   * leaves a beat later.
   *
   * Still numbers and strings, so the module's boundary rule holds: the caller
   * has already turned an impact list into glyphs and integers (`stampReading`
   * in `cardStamp.ts`) and this component still knows nothing about cards.
   */
  stamp?: StampReading;
}

/** What the card is asking about. */
export interface Offer {
  /** The small caps line above the title. "an ancient ruin". */
  eyebrow: string;
  /** The heading. "The stones remember". */
  title: string;
  options: OfferOption[];
  /**
   * A **heavier frame** for a choice that cannot be taken back: the Doctrine
   * draft and the government triple wear it, an Order draft and a discovery do
   * not (Entry XV.b — the benders against the staples).
   *
   * A data attribute on the overlay rather than a second component, because the
   * card is the same card: same bones, same keyboard contract, same focus
   * handling, and one rule in `style.css` about what gilt means. A second
   * component would be the moment the two drifted on how Escape behaves.
   */
  weight?: 'heavy';
  /**
   * One line under the heading, for a choice that needs a sentence of its own —
   * "adopting swaps your slots and lifts every seal". Absent on most cards.
   */
  note?: string;
  /**
   * Why this hand is wider than the table deals — one composed line per source,
   * "+1 · Wonder · The Oracle".
   *
   * The interface's half of `explainOfferSize` (`src/sim/statecraft.ts`): the
   * size of an offer is a fold, and a fold that nobody prints is a card the
   * player paid for and cannot see working. Strings, like everything else that
   * crosses this boundary — the caller formats the sign and the sim supplies the
   * label, so no wording is invented here that the card does not already say.
   * Absent, or empty, on an offer dealt at the base size, which is most of them.
   */
  widening?: string[];
  /**
   * **The second answer**: take none of these.
   *
   * Present only on an offer that has one, which today is the Statecraft draft
   * (the ruling of 2026-09-04). It is a *choice* and not a dismiss — see the
   * module docblock — so it reports back to the caller, which dispatches a
   * command, exactly as a pick does; the offer is spent either way.
   *
   * Both strings, like everything else that crosses this boundary. The caller
   * writes what passing does and what it costs, because this component knows
   * nothing about drafts, rarity or pity and must not start guessing.
   */
  pass?: {
    /** The button's own words. "Pass — rarer cards next time". */
    label: string;
    /** The line beside it, in the foot's quiet voice. What it costs. */
    note: string;
  };
}

/**
 * Where an offer stands with this component: not held, held and on screen, or
 * held and put away while the player looks at the board.
 *
 * Three states rather than a boolean, because the difference between the last
 * two is the whole of what View map had to get right — a hidden sheet is still
 * an unanswered offer, and treating it as gone is the bug where a player looks
 * at their capital and finds the draft has evaporated.
 */
export type OfferPhase = 'none' | 'shown' | 'hidden';

/**
 * What can happen to an offer. `show` deals one; the rest act on one held.
 *
 * `'take'` is *answered*, not *a card was picked*: a pass spends the offer as
 * surely as a pick does, and a second event for it would be a second way to
 * reach the same state that some future reader has to keep in step with this
 * one.
 */
export type OfferEvent = 'show' | 'viewMap' | 'reopen' | 'take' | 'clear';

/**
 * The state machine, pure, and it *is* the component's own — `createOfferCard`
 * keeps its phase by running this rather than by setting flags beside it, which
 * is what makes asserting it here worth anything (this suite has no jsdom).
 *
 * The two rules that matter and would otherwise be an `if` somebody deletes:
 *
 *   · **`viewMap` from `'none'` is nothing at all.** Escape with no offer up
 *     must not put the interface into a state where a "Return to the offer" chip
 *     points at nothing.
 *   · **`viewMap` never becomes `'none'`.** Only taking a card and an explicit
 *     `clear` (a new game) end an offer. If hiding could end one, the boon would
 *     be thrown away by the key players press to close things.
 *
 * `reopen` from `'shown'` is idempotent rather than an error: the chip and the
 * End Turn blocker can both lead back here and pressing the second after the
 * first should simply leave the card where it is.
 */
export function phaseAfter(phase: OfferPhase, event: OfferEvent): OfferPhase {
  switch (event) {
    case 'show':
      return 'shown';
    case 'viewMap':
      return phase === 'none' ? 'none' : 'hidden';
    case 'reopen':
      return phase === 'none' ? 'none' : 'shown';
    case 'take':
    case 'clear':
      return 'none';
  }
}

export interface OfferCard {
  /**
   * Shows an offer and calls `onChoose` with the index taken. Replaces whatever
   * was showing, which cannot happen today — a player may hold only one offer at
   * a time (`discoveryClaimError`) — and is the right behaviour if it ever can.
   *
   * `onPass` is the second answer, and it is called for the same reason
   * `onChoose` is: the caller dispatches a command. It is only ever reachable on
   * an offer that carries `Offer.pass`, so a caller that gave one and no handler
   * has written a button that does nothing — pass both or neither.
   */
  show(offer: Offer, onChoose: (index: number) => void, onPass?: () => void): void;
  /** True while a card is up. `main.ts` asks, to keep hotkeys off the board. */
  readonly isOpen: boolean;
  /**
   * True while an offer is **held** — on screen or put away behind View map.
   *
   * The question `isOpen` cannot answer and the caller needs: whether to draw
   * the chip that leads back, and whether a fresh `show` would be re-dealing
   * something the player is already holding. See `OfferPhase`.
   */
  readonly isPending: boolean;
  /**
   * Puts the sheet away **without spending the offer**, and answers whether
   * there was one to put away. Escape and the View map button, and nothing else.
   */
  viewMap(): boolean;
  /** Deals the held offer again — same cards, same order, same indices. */
  reopen(): void;
  /** Takes the card down without choosing. For a new game, not for a player. */
  clear(): void;
  dispose(): void;
}

/**
 * The card's element builder, and its yield printer: the payoff line is composed
 * in `YIELD_GLYPH` by `main.ts` ("+20⚙ to Uruk") and the glyph in it is drawn
 * here. Same one-line seam as the city panel's and the star chart's — see
 * `src/ui/yieldMark.ts`.
 */
function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) setYieldText(node, text);
  return node;
}

/** The window the spread is being laid out in. */
export interface OfferStage {
  width: number;
  height: number;
}

export interface OfferSpread {
  /** Cards in the flanking row — what these numbers were computed for. */
  count: number;
  /** The sheet's width. */
  sheet: number;
  /** One flanking card's width. */
  card: number;
  /** One flanking card's min-height: the tarot proportion, or the room. */
  height: number;
  /** The emblem's side. */
  emblem: number;
  /** Type scale, 1 at the designed three. */
  scale: number;
  /** What the spread stands, overlay padding to overlay padding. */
  total: number;
}

/**
 * The stylesheet's own numbers, and they must stay the stylesheet's.
 *
 * Every one of these is a length in the `.offer-*` block; they are here because
 * the fit is arithmetic and arithmetic cannot be done in a selector. A change to
 * either side without the other is a spread that thinks it fits and does not —
 * which is what `test/ui/offerCard.test.ts` is for.
 */
const OVERLAY_PAD = 24;
const SHEET_PAD_X = 20;
const SHEET_PAD_Y = 38;
const GAP = 12;
/** The head: eyebrow, title, lede, the widening chips, the rule and its margin. */
const HEAD = 119;
/**
 * The View map control and its note, under the hand: a small button, its note,
 * and the margin above them.
 *
 * In the budget for the same reason `HEAD` is — the row's height is what is
 * *left*, and a strip added to the sheet without being subtracted here is a
 * spread that thinks it fits and does not.
 */
const FOOT = 38;
/** A hair of air at the foot, so "exactly fits" is never "exactly overflows". */
const SLACK = 10;

const CARD_MIN = 132;
const CARD_MAX = 300;
/** The card the type was drawn for: scale 1, emblem 56. */
const CARD_DESIGNED = 265;
/**
 * What a designed card's *content* stands, measured: title, clauses, emblem and
 * flavour at scale 1 in a 265-wide frame.
 *
 * The second half of the scale rule, and the one a width-only scale was missing.
 * A card's height is `max(the proportion, what is written on it)`, so a spread
 * squeezed vertically has to shrink the **writing** or the cards silently grow
 * past the room the arithmetic promised them. Content scales very nearly with
 * the type scale, so the ratio of the height granted to the height a full-size
 * card wants *is* the scale that makes it fit.
 */
const CONTENT_AT_ONE = 290;
const SCALE_MIN = 0.74;
const TAROT_RATIO = 1.55;
const HEIGHT_MIN = 210;
const HEIGHT_MAX = 400;
const SHEET_BASE = 880;
const SHEET_PER_CARD = 90;

function clamp(low: number, value: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * How big the cards are when there are `count` of them in the row.
 *
 * **The spread has to fit any size now** (user, 2026-08-27), because how many
 * cards an offer deals is a *fold* rather than a constant: the base is three,
 * The Oracle adds one to every Statecraft draft, the Leaning Tower adds one to
 * every draft of every kind, and a great person adds one on top of that. Five is
 * the cap (`rules.offers.max`) and five is what this lays out.
 *
 * Computed here rather than in `style.css`: a spread that overflows at
 * 1280×720 is exactly the sort of thing
 * that is quietly wrong on every offer at once, and a stylesheet cannot be asked
 * whether it fits. The stylesheet is handed the five numbers as custom
 * properties and does the drawing; this is the arithmetic, pure and testable
 * against a stage.
 *
 * The shape of the rule:
 *
 *   · **the sheet widens a little** per card past three, so five cards are not
 *     five slivers — but only to what the stage can hold.
 *   · **the card takes its share of what is left**, floored so it stays a card
 *     and capped so a hand of two is not two posters.
 *   · **the height is the tarot proportion, or the room there is** — whichever
 *     is smaller, which is what makes the whole spread fit at 720.
 *   · **the type and the emblem scale with the card**, so a narrow card is a
 *     small card rather than a normal card with the words falling out of it.
 */
export function offerSpread(count: number, stage: OfferStage): OfferSpread {
  const cards = Math.max(1, Math.round(count));
  const sheet = Math.min(
    SHEET_BASE + Math.max(0, cards - 3) * SHEET_PER_CARD,
    stage.width - OVERLAY_PAD * 2,
  );
  const share = clamp(
    CARD_MIN,
    Math.floor((sheet - SHEET_PAD_X * 2 - GAP * (cards - 1)) / cards),
    CARD_MAX,
  );
  const budget = stage.height - OVERLAY_PAD * 2 - SHEET_PAD_Y - HEAD - FOOT - SLACK;
  const height = clamp(HEIGHT_MIN, Math.min(Math.round(share * TAROT_RATIO), budget), HEIGHT_MAX);
  // A card is **portrait**, whatever the room allows: a hand of two on a short
  // window has the width for two posters and a poster is not a card from a deck.
  // So the height the budget granted is what the width is finally held to, and a
  // small window narrows the hand rather than flattening it.
  const card = Math.min(share, Math.round(height / 1.05));
  return {
    count: cards,
    sheet,
    card,
    height,
    emblem: clamp(28, Math.round(card * 0.21), 60),
    scale:
      Math.round(
        clamp(SCALE_MIN, Math.min(card / CARD_DESIGNED, height / CONTENT_AT_ONE), 1) * 100,
      ) / 100,
    total: OVERLAY_PAD * 2 + SHEET_PAD_Y + HEAD + height + FOOT,
  };
}

/** What the caller is told when the sheet is put away or brought back. */
export interface OfferCardOptions {
  /**
   * Called whenever the phase moves, with the phase it moved to.
   *
   * One callback rather than two, so the caller cannot wire up "hidden" and
   * forget "back": the chip that leads to a hidden offer has to come down again
   * when the offer is answered, and a `take` reports `'none'` here for exactly
   * that reason.
   */
  onPhase?: (phase: OfferPhase) => void;
}

export function createOfferCard(
  container: HTMLElement,
  options: OfferCardOptions = {},
): OfferCard {
  let choose: ((index: number) => void) | null = null;
  /** The pass's callback, held and dropped exactly as `choose` is. */
  let pass: (() => void) | null = null;
  /**
   * The offer being held, kept **whole** rather than re-derived on reopen.
   *
   * An offer is drawn once at the moment it opens (CLAUDE.md), and the cards
   * that came out of that draw are these. Re-asking the caller for them would
   * work today, because every generator reads the pending offer off the state
   * and nothing has been spent — and it would be one refactor away from a
   * redraw. Holding the array is the cheaper honesty.
   */
  let standing: {
    offer: Offer;
    onChoose: (index: number) => void;
    onPass?: () => void;
  } | null = null;
  let phase: OfferPhase = 'none';

  /** Runs the machine, does the DOM, and tells the caller where it landed. */
  function moveTo(event: OfferEvent): OfferPhase {
    phase = phaseAfter(phase, event);
    options.onPhase?.(phase);
    return phase;
  }
  /** The element focus should return to once the card is answered. */
  let restoreFocus: HTMLElement | null = null;
  /** The one timer that takes the backs off. Null whenever nothing is dealing. */
  let dealTimer: number | null = null;
  /**
   * The taken card's two loose ends: the timer that takes the sheet off after
   * the stamp has landed, and the canceller for the count itself.
   *
   * Both are cleared by `teardown`, which every ending goes through, so a
   * chained draft that replaces the sheet mid-count cannot leave a frame loop
   * running against a detached tree — the bug every animation in this interface
   * has already had once.
   */
  let exitTimer: number | null = null;
  let cancelStamp: (() => void) | null = null;
  /**
   * The hand on the table, as `offerSpread` needs to be asked about it. Kept so
   * a window resized *while* an offer is up is re-measured rather than left at
   * the size the spread was dealt at — the one screen a player cannot dismiss is
   * the last one that should be allowed to fall off the bottom of a shrunk
   * window.
   */
  let spreadOf: { count: number } | null = null;

  /**
   * Hands the stylesheet the four numbers and the count.
   *
   * The count is a custom property rather than a class because it is a
   * *quantity* — CSS reads it in the grid's `repeat()` — and the rest are
   * lengths the arithmetic in `offerSpread` decided. Nothing here draws; the
   * `.offer-*` block does all of it off these five.
   */
  function applySpread(): void {
    if (!spreadOf) return;
    const spread = offerSpread(spreadOf.count, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    container.style.setProperty('--offer-count', String(spread.count));
    container.style.setProperty('--offer-sheet', `${spread.sheet}px`);
    container.style.setProperty('--offer-card', `${spread.card}px`);
    container.style.setProperty('--offer-card-height', `${spread.height}px`);
    container.style.setProperty('--offer-emblem', `${spread.emblem}px`);
    container.style.setProperty('--offer-scale', String(spread.scale));
  }

  function onResize(): void {
    if (!container.hidden) applySpread();
  }

  /**
   * The hand is down: the backs come off and the flip class goes with them.
   *
   * Both, and in that order, because they are two different bits of state. The
   * class carries the animation and the `preserve-3d` context; the back is the
   * element that was covering the face. Leaving either behind is a visible bug
   * — a stuck `preserve-3d` costs a card its hover shadow, and a stuck back is
   * a card nobody can read.
   */
  function settleDeal(): void {
    for (const card of container.querySelectorAll<HTMLElement>('.offer-option.is-dealing')) {
      card.classList.remove('is-dealing');
      card.style.removeProperty('--deal-delay');
    }
    for (const back of container.querySelectorAll('.card-back')) back.remove();
  }

  /**
   * Takes the sheet off the screen. The DOM half of both endings, and of the
   * hiding — what differs between them is what is *kept*, which is `standing`
   * and the phase, and neither is touched here.
   */
  function teardown(): void {
    if (dealTimer !== null) {
      window.clearTimeout(dealTimer);
      dealTimer = null;
    }
    if (exitTimer !== null) {
      window.clearTimeout(exitTimer);
      exitTimer = null;
    }
    cancelStamp?.();
    cancelStamp = null;
    container.hidden = true;
    container.removeAttribute('data-weight');
    container.removeAttribute('data-settled');
    container.replaceChildren();
    spreadOf = null;
    if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus();
    restoreFocus = null;
  }

  function clear(): void {
    teardown();
    standing = null;
    choose = null;
    pass = null;
    moveTo('clear');
  }

  /**
   * Puts the sheet away and keeps the offer. **Nothing is spent** — see the
   * module docblock — so `standing` and `choose` both survive and `reopen` deals
   * the very same array back.
   */
  function viewMap(): boolean {
    if (phase !== 'shown') return false;
    teardown();
    moveTo('viewMap');
    return true;
  }

  function reopen(): void {
    if (standing === null) return;
    // Through `show`, so the spread is re-measured against the window as it is
    // *now*: a player who looked at the map may well have resized on the way.
    show(standing.offer, standing.onChoose, standing.onPass);
  }

  /**
   * The pick, and the one place the interface's timing and the reducer's part
   * company **on purpose**.
   *
   * The command is dispatched immediately — the callback runs on this tick, as
   * it always has, and nothing about the simulation's timing changes. What is
   * delayed is only the *visual exit*: the taken card's stamp is weighed in
   * front of the player (`playCardStamp`), the cards that were passed over fall
   * away, and the sheet comes off two seconds later. A pick whose card carries
   * no stamp behaves exactly as it did before, down to the frame.
   *
   * The reveal is abandoned rather than defended if the callback deals another
   * offer: `show` cancels the exit and replaces the sheet, which is the honest
   * behaviour — the next question is more interesting than the last answer's
   * flourish.
   */
  function take(index: number): void {
    const callback = choose;
    const option = standing?.offer.options[index];
    const stamp = option?.stamp;
    const card = container.querySelector<HTMLElement>(`.offer-option[data-index="${index}"]`);
    const stampNode = card?.querySelector<HTMLElement>('.card-stamp') ?? null;
    // Cleared *before* the callback, so a handler that re-opens a card (a second
    // ruin claimed by the same march) is not immediately torn down by this one.
    standing = null;
    choose = null;
    pass = null;
    if (stamp === undefined || stampNode === null || stampIsEmpty(stamp)) {
      teardown();
      moveTo('take');
      callback?.(index);
      return;
    }
    // The hand settles: the taken card holds the light, the rest fall away.
    settleDeal();
    for (const other of container.querySelectorAll<HTMLElement>('.offer-option')) {
      other.classList.add(other === card ? 'is-taken' : 'is-passed');
      (other as HTMLButtonElement).disabled = true;
    }
    container.dataset.settled = 'true';
    cancelStamp = playCardStamp(stampNode, stamp);
    exitTimer = window.setTimeout(() => {
      exitTimer = null;
      teardown();
    }, STAMP_TIMING.exitMs);
    moveTo('take');
    callback?.(index);
  }

  /**
   * The pass, and it is `take`'s sibling rather than `viewMap`'s.
   *
   * **It spends the offer.** `standing` and `pass` are dropped, the phase moves
   * to the same place a pick moves it to, and the caller dispatches a command —
   * everything View map deliberately does not do. There is no stamp and no
   * settle animation: nothing was taken, so there is no card to weigh, and the
   * sheet simply comes off before the callback runs.
   *
   * Cleared before the callback for `take`'s reason: a handler that deals the
   * next offer on this tick must not be torn down by the one it replaced.
   */
  function skip(): void {
    const callback = pass;
    if (callback === null) return;
    standing = null;
    choose = null;
    pass = null;
    teardown();
    moveTo('take');
    callback();
  }

  /**
   * Enter and Space are the buttons' own; the number keys are the shortcut a
   * player learns on the second offer. Esc is deliberately not bound — see the
   * module docblock: there is nothing to escape to.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (container.hidden) return;
    // Escape is "let me look first", never "throw it away" — see the module
    // docblock. Swallowed either way, so it cannot also reach the board's own
    // Escape and close a panel behind the sheet.
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      viewMap();
      return;
    }
    const digit = Number.parseInt(event.key, 10);
    if (Number.isInteger(digit) && digit >= 1) {
      // By the index the card *carries*, never by its position in the DOM: the
      // reducer is told an index into the offer, and a shortcut counted off the
      // laid-out row is a shortcut that picks the card next to the one the
      // ordinal names the first time a layout puts one somewhere else.
      const button = container.querySelector<HTMLButtonElement>(
        `.offer-option[data-index="${digit - 1}"]`,
      );
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        button.click();
      }
      return;
    }
    // Tab is left alone so the options cycle normally; everything else is
    // swallowed so a stray hotkey cannot drive the board behind a modal.
    if (event.key !== 'Tab') event.stopPropagation();
  }

  function show(offer: Offer, onChoose: (index: number) => void, onPass?: () => void): void {
    // A sheet still holding a landed stamp is on its way out; the next question
    // replaces it now rather than being drawn under a timer that will then take
    // the new card away with the old one.
    if (exitTimer !== null) {
      window.clearTimeout(exitTimer);
      exitTimer = null;
    }
    cancelStamp?.();
    cancelStamp = null;
    container.removeAttribute('data-settled');
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    choose = onChoose;
    pass = onPass ?? null;
    // Held from here until it is taken or a new game clears it — through View
    // map and back, which is the whole point of keeping it.
    standing = onPass === undefined ? { offer, onChoose } : { offer, onChoose, onPass };
    container.replaceChildren();

    const sheet = element('div', 'offer-sheet');
    const head = element('header', 'offer-head');
    head.append(
      element('p', 'eyebrow offer-eyebrow', offer.eyebrow),
      element('h2', 'offer-title', offer.title),
    );
    if (offer.note !== undefined) head.append(element('p', 'offer-lede', offer.note));
    // Why the hand is wider than the table deals, in the register the rest of
    // the interface states a source in: one small line per card that widened it.
    // Silent at the base size, which is the common case and wants no furniture.
    if (offer.widening !== undefined && offer.widening.length > 0) {
      const widening = element('p', 'offer-widening');
      for (const line of offer.widening) widening.append(element('span', 'offer-widening-line', line));
      head.append(widening);
    }
    sheet.append(head);
    // The frame is a data attribute on the overlay, so the weight is one CSS
    // rule and this component still knows nothing about what is being offered.
    if (offer.weight === undefined) container.removeAttribute('data-weight');
    else container.setAttribute('data-weight', offer.weight);

    const list = element('div', 'offer-options');

    /**
     * A **tarot** offer is one whose cards carry an emblem — the Statecraft
     * deck, and nothing else today.
     *
     * The distinction is the whole of how the two dressings stay one component.
     * A card with an emblem is a card from a deck: it wears the tall
     * five-by-eight frame, its type goes up top in the mono eyebrow, and the
     * drawing is the middle of it. A discovery's card has no deck and no line —
     * "the stones remember" is a thing that happened, not a thing that was
     * printed — so it keeps the plain face it has always had, name first. One
     * flag, read off the options themselves rather than declared by the caller,
     * because a caller that had to remember it is a caller that will forget.
     */
    const tarot = offer.options.some((option) => option.emblem !== undefined);
    if (tarot) list.dataset.face = 'tarot';

    /**
     * Is this hand *dealt*, or does it simply appear?
     *
     * A deck's cards are dealt face-down and turned over; an occasion's card is
     * not a card from a deck at all ("the stones remember" is a thing that
     * happened) and has no back. `tarot` is already exactly that distinction —
     * a card with an emblem belongs to a deck — so the back rides the same flag
     * rather than a second one a caller would have to remember.
     *
     * Motion off means the hand is face-up on the first frame: no back is built
     * at all, which is stronger than an animation that finishes instantly,
     * because there is then no moment where the face is hidden behind anything.
     */
    const dealing = tarot && wantsMotion();

    /**
     * One card face, top to bottom: the ordinal, the type in the mono eyebrow,
     * the emblem, the name, what it does, and the flavour at the foot.
     *
     * The order is the reading order *and* the accessible order — a card
     * announces as "1, military order, Blooded Spears, +3 combat against
     * barbarians" — which is why the eyebrow is a real element in the flow
     * rather than an absolutely-positioned decoration. On a plain face the
     * eyebrow is a payoff instead ("+20⚙ to Uruk"), which belongs *after* the
     * name it is the price of, so the two swap.
     */
    function face(option: OfferOption, index: number): HTMLButtonElement {
      const button = document.createElement('button');
      button.className = 'offer-option';
      button.type = 'button';
      // The accent and the emblem are the two halves of "this card belongs to a
      // line". Both are optional and both fail quietly to the neutral face.
      if (option.line !== undefined) button.dataset.line = option.line;
      if (option.lineName !== undefined) button.title = option.lineName;
      // The index the reducer is told, kept on the element so the digit
      // shortcuts below can stay right whatever order the cards are laid in.
      button.dataset.index = String(index);
      // The ordinal is the keyboard shortcut made visible, and it is a real part
      // of the card rather than a hint: a player who has seen three offers picks
      // by number without reading.
      button.append(element('span', 'offer-ordinal', String(index + 1)));
      if (tarot) button.append(element('span', 'offer-payoff', option.payoff));
      if (option.emblem !== undefined) {
        const emblem = element('span', 'offer-emblem');
        emblem.setAttribute('aria-hidden', 'true');
        emblem.style.setProperty('--line-mark', option.emblem);
        button.append(emblem);
      }
      button.append(element('span', 'offer-option-title', option.title));
      if (!tarot) button.append(element('span', 'offer-payoff', option.payoff));
      if (option.note !== undefined) {
        // A card's clauses joined into one line — a descriptor, so the things it
        // names come out bold. Never links: this whole face is a `<button>` and
        // the click picks the card. See the clause list below, and `keywords.ts`.
        const note = element('span', 'offer-note');
        setDescriptorText(note, option.note, { linked: false });
        button.append(note);
      }
      // The clause list, when the caller had one to give: a line each, and the
      // ones the game has not built greyed and struck through rather than
      // silently printed as promises. Same class the Statecraft screen's card
      // faces use, so a clause reads identically wherever it appears.
      if (option.notes !== undefined && option.notes.length > 0) {
        const list = element('span', 'offer-clauses');
        for (const clause of option.notes) {
          const line = element(
            'span',
            clause.deferred ? 'offer-clause is-deferred' : 'offer-clause',
          );
          // **Bold, never a link.** An option's face is a `<button>` and the
          // click picks the card — irreversibly — so a keyword inside it may
          // not also be clickable (the ruling's middle clause, and here it is a
          // safety rule rather than a style one). The words are still marked,
          // because the same thing is being named.
          setDescriptorText(line, clause.text, { linked: false });
          if (clause.deferred) line.title = 'Declared, and not built yet';
          list.append(line);
        }
        button.append(list);
      }
      if (option.warning !== undefined) {
        button.append(element('span', 'offer-warning', option.warning));
      }
      // The stamp's seat, **between the clauses and the flavour** (the design of
      // record). It is built wearing the flourish and never filled in here: the
      // number arrives on the pick and nowhere else.
      if (option.stamp !== undefined && !stampIsEmpty(option.stamp)) {
        button.append(cardStampNode());
      }
      // **Labelled, not merely italic** (copy pass, 2026-08-28 — the
      // Compendium's ruling applied wherever a flavour field is printed). The
      // clause list directly above is the card's rules, in the same column and
      // the same reading order, so an unlabelled sentence at the foot is read
      // as one more rule. Only the label is added; the line itself is still
      // exactly what the data row wrote. Absent for a card with no flavour, so
      // a discovery's plain face gains nothing.
      if (option.flavor.length > 0) {
        const flavor = element('span', 'offer-flavor');
        flavor.append(element('span', 'flavor-label', 'Flavour'));
        flavor.append(document.createTextNode(option.flavor));
        button.append(flavor);
      }
      if (option.footnote !== undefined) {
        button.append(element('span', 'offer-footnote', option.footnote));
      }
      // The back goes on last, so it is the last child and covers the face.
      // Only a deck's cards get one — see `dealing` — and the delay is the
      // card's own place in the row, so a hand is turned over rather than
      // revealed all at once.
      if (dealing) {
        button.classList.add('is-dealing');
        button.style.setProperty('--deal-delay', `${index * DEAL_STAGGER_MS}ms`);
        button.append(cardBack());
      }
      button.addEventListener('click', () => take(index));
      return button;
    }

    // One row, every card in the offer's own order. There was a card lifted out
    // of it and centred beneath — the draft's deepening — until the levelling
    // ruling of 2026-09-04 took the second half of that question away.
    spreadOf = { count: Math.max(1, offer.options.length) };
    applySpread();
    const row = element('div', 'offer-row');
    offer.options.forEach((option, index) => row.append(face(option, index)));
    list.append(row);
    sheet.append(list);
    // The controls on this sheet that are not cards. At the foot, after the
    // hand, because they are what you reach for *having read them* — and small
    // and quiet, because the decision is still the cards.
    //
    // **Two of them, and they are opposites**, which is why each carries its own
    // sentence rather than sharing one: View map keeps the offer and spends
    // nothing, and a pass spends it outright. A foot that said "nothing is
    // spent" over both would be a foot that lies about one of them.
    const foot = element('div', 'offer-foot');
    const look = document.createElement('button');
    look.className = 'offer-look';
    look.type = 'button';
    // It says "View map" rather than "Close": there is nothing to close, and a
    // player who read "Close" would reasonably believe the offer had gone with
    // it.
    look.append(element('span', 'offer-look-label', 'View map'));
    look.append(element('kbd', 'offer-look-key', 'Esc'));
    look.title = 'Look at the board. The offer waits — nothing is spent.';
    look.addEventListener('click', () => {
      viewMap();
    });
    foot.append(look);
    foot.append(element('p', 'offer-foot-note', 'the offer waits — nothing is spent'));
    if (offer.pass !== undefined) {
      // The second answer. A `<button>` of its own, in its own group, with the
      // words the caller wrote — never a keyboard shortcut, because the one
      // irreversible thing on this sheet that is not a card should take a
      // deliberate click rather than a stray key.
      const passFoot = element('div', 'offer-foot offer-foot-pass');
      const button = document.createElement('button');
      button.className = 'offer-pass';
      button.type = 'button';
      button.append(element('span', 'offer-look-label', offer.pass.label));
      button.title = offer.pass.note;
      button.addEventListener('click', () => {
        skip();
      });
      passFoot.append(button);
      passFoot.append(element('p', 'offer-foot-note', offer.pass.note));
      sheet.append(foot, passFoot);
    } else {
      sheet.append(foot);
    }
    container.append(sheet);
    container.hidden = false;
    moveTo('show');

    // The backs come off once the last card has landed.
    //
    // A timer rather than an `animationend` listener per card, for one reason:
    // a card whose animation never runs — an element hidden by an ancestor, a
    // browser that dropped the frame, a tab in the background when the offer
    // opened — never fires the event, and a back that is never taken down is a
    // card a player cannot read. The timer fires whatever happened. It is also
    // cancelled by `clear`, so a card taken down mid-deal leaves nothing behind
    // to run against a detached tree.
    if (dealing) {
      const last = offer.options.length - 1;
      dealTimer = window.setTimeout(() => {
        dealTimer = null;
        settleDeal();
      }, DEAL_MS + last * DEAL_STAGGER_MS + 40);
    }

    // The first option takes focus, so the card is answerable from the keyboard
    // the instant it appears and a screen reader is put inside it rather than
    // left on whatever the player last clicked.
    list.querySelector<HTMLButtonElement>('.offer-option')?.focus();
  }

  // Capturing, so the card sees a key before the board's own handlers do. That
  // is what makes it modal in practice: `controls.ts` binds on the window too.
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', onResize);

  return {
    show,
    get isOpen(): boolean {
      return !container.hidden;
    },
    get isPending(): boolean {
      return phase !== 'none';
    },
    viewMap,
    reopen,
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onResize);
      clear();
    },
  };
}
