/**
 * The offer card: pick one of N, on parchment.
 *
 * Built for the discoveries (playable.md item 3) and deliberately shaped for the
 * thing after it. Entry XV's Statecraft draft is the same gesture at a different
 * scale — three new cards and an upgrade, chosen once every few turns — and the
 * shape of that gesture is *an offer of N options, each with a name, a line of
 * flavour and a stated payoff, exactly one of which is taken*. So this component
 * knows about options and nothing about ruins: no discovery id, no yield, no
 * city, no simulation type at all crosses its boundary. The caller renders its
 * own payoff line and hands over strings.
 *
 * Generic-ish, and no further
 * ---------------------------
 * It is emphatically not a framework. There is no reroll, no multi-select, no
 * disabled state, no upgrade slot — Statecraft will want at least the first and
 * the last, and they can be added when there is a real second caller with real
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
 * Data is data
 * ------------
 * Every string arrives as a text node, never as markup: a city's name, a unit's
 * name and a line of flavour are all data, and data never gets to be HTML. That
 * is `turnSplash.ts`'s rule and it is the same rule here for the same reason.
 */

import { cardLineMarkUrl } from './cardLine';
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
   * Why this payoff would be wasted, or absent. An empire with no cities has
   * nowhere to put a lump of food, and a card that quietly paid it nowhere
   * would be the interface keeping a secret.
   */
  warning?: string;
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
   * Marks the one option that **deepens** something the player already holds
   * rather than adding to the hand.
   *
   * The whole of what this component knows about the Statecraft draft, and it is
   * a fact about the *shape of the choice* rather than about Orders: a hand of
   * cards where one of them changes a card already on the table is a different
   * question — deepen, or widen — and it is laid out as one. See
   * `orderOfferLayout`.
   */
  emphasis?: 'deepen';
  /**
   * The two faces of a deepening: what the card says now, and what it would say
   * after. Only read on a `'deepen'` option.
   *
   * Both are composed by the caller from one function at two levels, so a
   * player is comparing the same sentence with itself rather than two
   * paraphrases. It is the one place in the interface two levels of a card are
   * shown at once, because "deepen or widen" is not a question anybody can
   * answer without both.
   */
  faces?: { before: string; after: string };
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
}

export interface OfferCard {
  /**
   * Shows an offer and calls `onChoose` with the index taken. Replaces whatever
   * was showing, which cannot happen today — a player may hold only one offer at
   * a time (`discoveryClaimError`) — and is the right behaviour if it ever can.
   */
  show(offer: Offer, onChoose: (index: number) => void): void;
  /** True while a card is up. `main.ts` asks, to keep hotkeys off the board. */
  readonly isOpen: boolean;
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

/**
 * Where the cards of an offer sit: the flanking row, and the one card in the
 * middle.
 *
 * **The user's note, and the fix.** A draft is three new Orders and one upgrade,
 * and the upgrade was simply the fourth cell of an `auto-fit` grid — which at
 * the sheet's width wraps to three across and then one card alone, left-aligned,
 * under them. It read as an afterthought, which is the opposite of what it is:
 * the upgrade is the *other half of the question*. So it comes out of the row
 * and is centred beneath it, in a frame of its own that shows both of its faces.
 *
 * Pure, and separated from the DOM for `splitYieldText`'s reason — this suite has
 * no jsdom, and "which card is in the middle" is exactly the sort of thing that
 * can be quietly wrong on every offer at once. It answers **indices**, never
 * options, because an index is what the reducer is told (`chooseOrder`'s
 * `optionIndex`) and re-deriving it from a reordered array is how a player picks
 * the card next to the one they clicked.
 *
 * Every other offer — a discovery's three, a Doctrine's three, the government
 * triple — has no such card and lays out as it always did: `centre` is `null`
 * and the row is the whole offer, in order.
 */
export interface OfferLayout {
  /** The flanking cards, in offer order. Indices into `options`. */
  row: number[];
  /** The centred card's index, or `null` when the offer has no such card. */
  centre: number | null;
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
/** The "or deepen what you already hold" rule and its own margin. */
const HINGE = 16;
/** The landscape upgrade card beneath the row, flavourless by design. */
const CENTRE = 226;
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
 * Computed here rather than in `style.css`, for `orderOfferLayout`'s reason one
 * scale up: a spread that overflows at 1280×720 is exactly the sort of thing
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
 *     is smaller. That is what makes the whole spread fit at 720 with an upgrade
 *     card beneath it, and it is why the budget has to know about the centre.
 *   · **the type and the emblem scale with the card**, so a narrow card is a
 *     small card rather than a normal card with the words falling out of it.
 */
export function offerSpread(
  count: number,
  stage: OfferStage,
  options?: { centre?: boolean },
): OfferSpread {
  const cards = Math.max(1, Math.round(count));
  const centre = options?.centre === true;
  const sheet = Math.min(
    SHEET_BASE + Math.max(0, cards - 3) * SHEET_PER_CARD,
    stage.width - OVERLAY_PAD * 2,
  );
  const share = clamp(
    CARD_MIN,
    Math.floor((sheet - SHEET_PAD_X * 2 - GAP * (cards - 1)) / cards),
    CARD_MAX,
  );
  const below = centre ? HINGE + CENTRE + GAP : 0;
  const budget = stage.height - OVERLAY_PAD * 2 - SHEET_PAD_Y - HEAD - below - SLACK;
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
    total: OVERLAY_PAD * 2 + SHEET_PAD_Y + HEAD + height + below,
  };
}

export function orderOfferLayout(options: readonly OfferOption[]): OfferLayout {
  // The *first* such card wins, and there is deliberately no support for two:
  // a draft has at most one upgrade (`OrderOffer.upgrade` is a single id), and
  // a second centred card would be a spread nobody has designed.
  const centre = options.findIndex((option) => option.emphasis === 'deepen');
  return {
    row: options.map((_option, index) => index).filter((index) => index !== centre),
    centre: centre === -1 ? null : centre,
  };
}

export function createOfferCard(container: HTMLElement): OfferCard {
  let choose: ((index: number) => void) | null = null;
  /** The element focus should return to once the card is answered. */
  let restoreFocus: HTMLElement | null = null;
  /** The one timer that takes the backs off. Null whenever nothing is dealing. */
  let dealTimer: number | null = null;
  /**
   * The hand on the table, as `offerSpread` needs to be asked about it. Kept so
   * a window resized *while* an offer is up is re-measured rather than left at
   * the size the spread was dealt at — the one screen a player cannot dismiss is
   * the last one that should be allowed to fall off the bottom of a shrunk
   * window.
   */
  let spreadOf: { count: number; centre: boolean } | null = null;

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
    const spread = offerSpread(
      spreadOf.count,
      { width: window.innerWidth, height: window.innerHeight },
      { centre: spreadOf.centre },
    );
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

  function clear(): void {
    if (dealTimer !== null) {
      window.clearTimeout(dealTimer);
      dealTimer = null;
    }
    container.hidden = true;
    container.removeAttribute('data-weight');
    container.replaceChildren();
    spreadOf = null;
    choose = null;
    if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus();
    restoreFocus = null;
  }

  function take(index: number): void {
    const callback = choose;
    // Cleared *before* the callback, so a handler that re-opens a card (a second
    // ruin claimed by the same march) is not immediately torn down by this one.
    clear();
    callback?.(index);
  }

  /**
   * Enter and Space are the buttons' own; the number keys are the shortcut a
   * player learns on the second offer. Esc is deliberately not bound — see the
   * module docblock: there is nothing to escape to.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (container.hidden) return;
    const digit = Number.parseInt(event.key, 10);
    if (Number.isInteger(digit) && digit >= 1) {
      // By the index the card *carries*, not by its position in the row: the
      // draft's deepen card is lifted out of the row and centred beneath it
      // (`orderOfferLayout`), and a shortcut counted off the DOM would have
      // started picking the card next to the one the ordinal names.
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

  function show(offer: Offer, onChoose: (index: number) => void): void {
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    choose = onChoose;
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
      button.className = option.emphasis === 'deepen' ? 'offer-option is-deepen' : 'offer-option';
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
      if (option.faces !== undefined) {
        // The deepening, both faces at once: what it says now, and what it would
        // say after. A row rather than two lines, so the change is read across
        // rather than hunted for.
        const faces = element('span', 'offer-faces');
        const before = element('span', 'offer-face');
        before.append(
          element('span', 'offer-face-label', 'now'),
          element('span', 'offer-face-text', option.faces.before),
        );
        const after = element('span', 'offer-face is-after');
        after.append(
          element('span', 'offer-face-label', 'deepened'),
          element('span', 'offer-face-text', option.faces.after),
        );
        faces.append(before, element('span', 'offer-face-arrow', '⟶'), after);
        button.append(faces);
      } else if (option.note !== undefined) {
        button.append(element('span', 'offer-note', option.note));
      }
      if (option.warning !== undefined) {
        button.append(element('span', 'offer-warning', option.warning));
      }
      button.append(element('span', 'offer-flavor', option.flavor));
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

    const layout = orderOfferLayout(offer.options);
    // The spread is measured for the *row*, because the upgrade card is not in
    // it — it is the thing beneath it, and what it costs the row is height
    // rather than width (`offerSpread`'s `centre`).
    spreadOf = { count: Math.max(1, layout.row.length), centre: layout.centre !== null };
    applySpread();
    const row = element('div', 'offer-row');
    for (const index of layout.row) row.append(face(offer.options[index]!, index));
    list.append(row);
    if (layout.centre !== null) {
      // The hinge between the two halves of the question, and the only place the
      // interface says the word out loud.
      list.append(element('p', 'offer-hinge', 'or deepen what you already hold'));
      const centre = element('div', 'offer-centre');
      centre.append(face(offer.options[layout.centre]!, layout.centre));
      list.append(centre);
    }
    sheet.append(list);
    container.append(sheet);
    container.hidden = false;

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
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onResize);
      clear();
    },
  };
}
