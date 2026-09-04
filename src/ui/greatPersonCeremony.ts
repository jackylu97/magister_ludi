/**
 * The spend ceremony: **they served you; their legacy remains.**
 *
 * `docs/doctrine-ideas.md`, "The great person's three beats", with the
 * 2026-09-03 **inversion**: the LEGACY is the card's prominent content and the
 * animated reveal, and the act or work — the thing the player just clicked, the
 * thing that paid — is a small mono line that simply appears beneath it. The
 * permanent effect is the identity; the one-shot deed is the footnote.
 *
 * That is the right way round for a reason the mechanics already state: a legacy
 * reaches `liveEffects` only once the person is SPENT, so act, work and legacy
 * all pay at the same moment and the draft merely decided *who*. The burst is
 * the loud half and the forgettable one; the line that will still be paying in
 * forty turns is the half nobody was ever shown.
 *
 * Presentation only
 * -----------------
 * Nothing here sends a command, reads a result or touches a clock the simulation
 * keeps. It is raised from `controls.ts`'s `onGreatPersonSpent` — the moment a
 * `greatPersonAct` or `greatPersonWork` command came back accepted — and a
 * refused command raises nothing at all, because the callback fires after the
 * result is checked and nowhere else. The reducer's timing is untouched;
 * everything below is a `setTimeout` over a card.
 *
 * Where the deed's number comes from
 * ----------------------------------
 * From the **preview**, taken before the command and composed by the simulation's
 * own seams (`greatPersonActPreview` / `greatPersonWorkPreview` in
 * `controls.ts`, which read `actGainOf`, `agedActFactor`, `RULES.greatPeople`
 * and `improvementYieldDelta`). That is not a second arithmetic: `greatPeople.ts`
 * composes an act's figure once, before anything is banked (Entry XVIII.5 —
 * "the preview and the payout are one number"), and the piece is *gone* by the
 * time the command returns, so asking the board afterwards what it was about to
 * do would be the second implementation. `spendGreatPerson` already announces
 * off exactly this string for exactly this reason.
 *
 * The beats, and the mock they come from
 * --------------------------------------
 * `CEREMONY_TIMING` below, in milliseconds, taken off the published mock
 * ("A great person, spent"). The card rises, the legacy's figure counts, the
 * deed appears without ceremony, the card descends toward the renown chip — the
 * Reliquary's door — and the overlay closes. About four seconds end to end, and
 * a click anywhere cuts it short, because a player who has already read it
 * should never be waiting on an animation.
 *
 * `prefers-reduced-motion` is honoured the way every other animation in this
 * interface honours it (`cardStamp.ts`, `damageNumbers.ts`, `toasts.ts`): by
 * **arriving already landed** — the figure is simply there, the deed is simply
 * there, nothing rises and nothing descends — held briefly so the card can be
 * read, then taken down. Not a faster animation; none at all.
 */

import { type GreatPersonFace, greatPersonFace, legacyIsSilent } from './greatPersonFace';
import { cardStampNode, landCardStamp, playCardStamp } from './cardStamp';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import type { GameState } from '../sim/state';
import type { GreatPersonId } from '../sim/greatPeopleData';

/**
 * The mock's beats, in milliseconds, measured from the moment the overlay is
 * raised.
 *
 * Here rather than in `style.css` for `STAMP_TIMING`'s reason exactly: the
 * script has to know when each beat falls in order to schedule it, and a
 * duration in the stylesheet and a timer in the module that quietly disagree is
 * a card that descends over a number still counting. The stylesheet reads the
 * two *durations* back through custom properties.
 */
export const CEREMONY_TIMING = {
  /** The rise: the card comes up out of the board onto the scrim. */
  riseMs: 500,
  /** When the legacy's figure starts to count. After the rise has settled. */
  stampMs: 550,
  /** When the deed line appears. No count, no thunk — it is simply there. */
  deedMs: 1900,
  /** When the card starts down toward the renown chip. */
  descendMs: 3600,
  /** How long the descent takes. */
  descendDurationMs: 600,
  /** When the overlay comes down. The whole ceremony, end to end. */
  closeMs: 4300,
  /**
   * The reduced-motion hold: everything is already landed, and this is only how
   * long the finished card stands there to be read. Long enough for the two
   * lines that matter, short enough that it is never in the way.
   */
  reducedHoldMs: 1600,
} as const;

/**
 * What was spent, as the ceremony needs it. Strings and an id — no simulation
 * type crosses into the DOM half of this file, `offerCard.ts`'s boundary rule.
 *
 * `deed` is the preview line, composed by `controls.ts` before the command (see
 * the module docblock). `verb` is carried because the two read differently in
 * the sentence — an act *paid*, a work *stands*.
 */
export interface GreatPersonSpend {
  id: GreatPersonId;
  verb: 'act' | 'work';
  /** What the deed did, in the simulation's own figures. Never composed here. */
  deed: string;
}

/**
 * The deed in one line: what happened, in the interface's plainest voice.
 *
 * Two openings rather than one, because the two verbs are two kinds of event and
 * the sentence should say which: an act is a moment that paid, a work is a thing
 * that now stands on a hex. The figure inside is the preview's, untouched.
 */
export function deedLine(spend: GreatPersonSpend): string {
  return spend.verb === 'act' ? `the act paid ${spend.deed}` : `the work stands · ${spend.deed}`;
}

export interface GreatPersonCeremony {
  readonly isOpen: boolean;
  /** Raises the ceremony over the board. Replaces one already playing. */
  play(spend: GreatPersonSpend): void;
  /** Takes it down now — the click-anywhere dismissal, and the landing screen's. */
  close(): void;
  dispose(): void;
}

export interface GreatPersonCeremonyOptions {
  /** The overlay the whole thing is built into. Emptied on close. */
  overlay: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /**
   * Where the card descends to — the renown chip in the top bar, which is the
   * Reliquary's own door. Optional, and a page without one simply fades: the
   * gesture is "it went into the pile", and a pile that is not on screen has no
   * direction to be in.
   */
  target?: () => HTMLElement | null;
  /** The card has landed in the pile and the overlay is down. */
  onClosed?: () => void;
}

/** Does this viewer want motion? Asked at the moment the ceremony is played. */
function wantsMotion(): boolean {
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createGreatPersonCeremony(
  options: GreatPersonCeremonyOptions,
): GreatPersonCeremony {
  const { overlay } = options;
  const timers: number[] = [];
  /** The stamp's own canceller — a count left running against a detached tree. */
  let cancelStamp: () => void = () => undefined;

  function clearTimers(): void {
    for (const id of timers) window.clearTimeout(id);
    timers.length = 0;
    cancelStamp();
    cancelStamp = () => undefined;
  }

  function after(ms: number, run: () => void): void {
    timers.push(window.setTimeout(run, ms));
  }

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function close(): void {
    const wasUp = isOpen();
    clearTimers();
    overlay.replaceChildren();
    overlay.hidden = true;
    if (wasUp) options.onClosed?.();
  }

  /**
   * The card, top to bottom: the family and age in the mono eyebrow, the
   * emblem, the name, **the legacy**, its figure, the deed, the flavour.
   *
   * Built in the offer card's own tarot classes, inside an
   * `offer-options[data-face='tarot']` host — the card dealt and the card spent
   * are the same card, and the only way two files can promise that is for the
   * second to ask for the first's rules by name.
   */
  function build(face: GreatPersonFace, spend: GreatPersonSpend): {
    card: HTMLElement;
    stamp: HTMLElement | null;
    /** The line that arrives on its own beat — the deed, wherever it is sitting. */
    said: HTMLElement;
    /** When it arrives. See the two seats below. */
    saidAtMs: number;
  } {
    const host = element('div', 'offer-options gp-ceremony-host');
    host.dataset.face = 'tarot';
    const card = element('article', 'offer-option gp-ceremony-card');
    card.dataset.line = face.line;
    card.title = face.lineName;

    const head = element('span', 'gp-ceremony-head');
    head.append(element('span', 'offer-payoff', face.eyebrow));
    head.append(element('span', 'gp-ceremony-mark', face.tierMark));
    card.append(head);

    const emblem = element('span', 'offer-emblem');
    emblem.setAttribute('aria-hidden', 'true');
    emblem.style.setProperty('--line-mark', face.emblem);
    card.append(emblem);

    card.append(element('span', 'offer-option-title', face.name));

    const linked = keywordsAllowedIn(card);
    const clauses = element('span', 'offer-clauses');
    const words = deedLine(spend);
    // **A name that leaves no legacy still gets a ceremony**, with the deed
    // promoted into the headline's seat (the ruling's third clause). The card is
    // never empty: something happened, and the card is what says so. Promoted, it
    // arrives **where the number would have been weighed** rather than at the
    // deed's late beat — the card would otherwise stand wordless for two seconds
    // waiting for a footnote — and it arrives thunk-style, a fade with no count,
    // because a deed is a moment and not a rate (`cardStamp.ts`'s own argument
    // for the occasion face).
    const promoted = legacyIsSilent(face.legacy);
    // One element, two seats: the headline's when there is no legacy this build
    // actually keeps, the small mono footnote's when there is. Hidden until its
    // beat either way, and `hidden` rather than a class, so the reduced-motion
    // reading that shows it on the first frame is one assignment rather than a
    // second rule.
    const said = element(
      'span',
      promoted ? 'offer-clause gp-ceremony-promoted' : 'gp-ceremony-deed',
      words,
    );
    said.hidden = true;
    // Promoted, the deed goes **first**: it is the headline. Any deferred
    // clauses still print under it, struck through, because a promise the build
    // has not made is said out loud rather than quietly dropped.
    if (promoted) clauses.append(said);
    for (const clause of face.legacy) {
      const line = element('span', clause.deferred ? 'offer-clause is-deferred' : 'offer-clause');
      setDescriptorText(line, clause.text, { linked });
      if (clause.deferred) line.title = 'Declared, and not built yet';
      clauses.append(line);
    }
    card.append(clauses);

    // The legacy's figure, and only the legacy's: the deed is a one-time grant
    // and would be a per-turn lie in this seat (`cardStamp.ts` — counting to a
    // number that is true on no particular turn).
    let stamp: HTMLElement | null = null;
    if (!promoted && face.stamp !== null) {
      stamp = cardStampNode();
      card.append(stamp);
    }
    if (!promoted) card.append(said);

    const flavor = element('span', 'offer-flavor');
    flavor.append(element('span', 'flavor-label', 'Flavour'));
    flavor.append(document.createTextNode(face.flavor));
    card.append(flavor);

    host.append(card);
    overlay.replaceChildren(host);
    return {
      card,
      stamp,
      said,
      saidAtMs: promoted ? CEREMONY_TIMING.stampMs : CEREMONY_TIMING.deedMs,
    };
  }

  /**
   * Aims the descent at the renown chip.
   *
   * Two custom properties rather than an animation per target, because where the
   * chip is depends on the window: the keyframes translate by
   * `--gp-descend-x/y`, and this measures the gap between the card's centre and
   * the chip's. A page with no chip descends by nothing and simply fades, which
   * is the honest gesture when there is nowhere for it to go.
   */
  function aim(card: HTMLElement): void {
    const chip = options.target?.() ?? null;
    if (!chip) return;
    const from = card.getBoundingClientRect();
    const to = chip.getBoundingClientRect();
    if (from.width === 0 || to.width === 0) return;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    card.style.setProperty('--gp-descend-x', `${Math.round(dx)}px`);
    card.style.setProperty('--gp-descend-y', `${Math.round(dy)}px`);
  }

  function play(spend: GreatPersonSpend): void {
    clearTimers();
    const face = greatPersonFace(options.getState(), options.getPlayerId(), spend.id);
    const { card, stamp, said, saidAtMs } = build(face, spend);
    overlay.hidden = false;

    if (!wantsMotion()) {
      // Everything already landed: the figure is written, the deed is there, and
      // nothing moves. A brief hold so the card can be read, then down.
      card.dataset.phase = 'landed';
      if (stamp !== null && face.stamp !== null) landCardStamp(stamp, face.stamp);
      said.hidden = false;
      after(CEREMONY_TIMING.reducedHoldMs, close);
      return;
    }

    card.dataset.phase = 'rising';
    after(CEREMONY_TIMING.stampMs, () => {
      card.dataset.phase = 'weighing';
      if (stamp !== null && face.stamp !== null) cancelStamp = playCardStamp(stamp, face.stamp);
    });
    // The deed **appears**. No count and no thunk: it is a figure the player
    // already read on the button they pressed, and animating it twice would be
    // the interface insisting on a fact nobody disputed.
    after(saidAtMs, () => {
      said.hidden = false;
      card.dataset.phase = 'read';
    });
    after(CEREMONY_TIMING.descendMs, () => {
      aim(card);
      card.dataset.phase = 'descending';
    });
    after(CEREMONY_TIMING.closeMs, close);
  }

  // A click anywhere dismisses. On the overlay rather than the card, and without
  // a target test, because the whole surface is the dismissal: there is nothing
  // on this card to press, and a player who has read it is waiting on nothing.
  const onClick = (): void => close();
  overlay.addEventListener('click', onClick);

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    play,
    close,
    dispose(): void {
      overlay.removeEventListener('click', onClick);
      close();
    },
  };
}
