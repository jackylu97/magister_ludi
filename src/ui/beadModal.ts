/**
 * The bead sheet: **a deed was done, and a bead went onto the wire.**
 *
 * `triumphModal.ts` is the pattern and the precedent, and this is deliberately
 * the same object one system over — the turn card's `gilt-frame` double rule,
 * the display face for the name, one affirmative control, Enter and Escape both
 * meaning "proceed" because there is no second answer for Escape to mean, a
 * queue rather than a stack. Three sheets that announce news must not look like
 * three different games, which is the argument the Beads screen already makes
 * against the Statecraft sheet.
 *
 * Why a bead earns a sheet at all
 * -------------------------------
 * The Bead Race is the game's **one victory condition** (design ledger Entry
 * VI), and a bead was a toast: the same volume as a caravan coming home. A
 * Triumph pays renown and happens perhaps fifteen times; a bead is a twentieth
 * of the game. The toast and the chronicle line **stay** — `reportBeads` writes
 * both, and for a rival's bead they are the whole of the news, exactly as a
 * rival's Triumph gets no sheet. This is the local seat's moment.
 *
 * The abacus flip
 * ---------------
 * The centrepiece is one rod of the Abacus, drawn with the Beads screen's own
 * vocabulary (`abacusRodSlots`, `beadChipNode`, the four family inks) rather
 * than a second drawing of the same object: the wire, the beads already
 * settled, the empty slots, the golden slot at the threshold. The bead that was
 * just earned **slides down the wire and clacks into its slot**.
 *
 * The motion is one CSS animation on one chip (`.bead-chip.is-arriving`) and
 * the *decision* to run it is in the face: `arriving` is the slot that moves,
 * and it is `null` when the reader has asked for less motion — so the collapsed
 * version is not a second render path, it is the same render with nothing
 * marked. The stylesheet's `prefers-reduced-motion` rule is the belt to that
 * brace, for a viewer whose preference changes while a sheet stands.
 *
 * Data is data: every string arrives as a text node (`turnSplash.ts`'s rule),
 * and the one clause that may name a thing goes through `setDescriptorText`.
 */

import {
  type BeadCardId,
  type BeadFamily,
  type BeadKind,
  BEAD_RULES,
} from '../sim/beadData';
import type { EarnedBead } from '../sim/state';
import {
  type RodSlot,
  BEAD_FAMILY_MARK,
  abacusRodSlots,
  beadCardFace,
  beadChipNode,
} from './beadsScreen';
import { figure } from './figures';
import { setDescriptorText } from './keywords';

/**
 * One bead award, as this sheet needs to read it. `BeadAward`'s fields plus the
 * one thing the award does not carry: the rod it landed on.
 */
export interface BeadNews {
  id: BeadCardId;
  /** "The Long Count". */
  name: string;
  kind: BeadKind;
  family: BeadFamily;
  /**
   * What the boon paid, in the **settlement's own** plain sentences
   * (`BeadAward.boon`) — already banked and already stripped of keyword marks
   * by `payBoon`, so this sheet never re-derives what a windfall did. Empty for
   * a bead that pays nothing.
   */
  boon: readonly string[];
  /**
   * The seat's rod **the instant this bead landed** — every bead up to and
   * including this one. Not `Player.beads` itself: a resolution that pays two
   * beads has to draw two rods, one bead apart, or the second sheet shows the
   * first bead arriving. See `beadRodsFor`, which is where that slicing lives.
   */
  rod: readonly EarnedBead[];
}

/** One sheet, as data — everything on it except the DOM that draws it. */
export interface BeadAwardFace {
  /** "a bead", or "a reckoning" for the age's own measure. */
  eyebrow: string;
  name: string;
  family: BeadFamily;
  /** "quest · Æra III · domination". The row's class, its deck and its family. */
  line: string;
  /** What the deed asked, in the row's own player-facing words (`def.text`). */
  deed: string;
  /** What it paid. Plain sentences, already banked; empty pays nothing. */
  boon: string[];
  /** The whole rod, threshold-long, with the golden slot on the end. */
  slots: RodSlot[];
  /**
   * Which slot the new bead slides into, or `null` for no motion at all — a
   * reader who has asked for less of it, or a rod so full the bead has landed
   * past the last drawn slot.
   */
  arriving: number | null;
  /** "7 of 20 beads". The rod, counted. */
  tally: string;
  /** "1 of 3", or `null` when this sheet is the only one waiting. */
  counter: string | null;
}

/**
 * The rod each award in one batch landed on.
 *
 * `Player.beads` is append-only (`beads.ts`), so a batch of *this seat's*
 * awards from one resolution is the tail of it: the first of them landed at
 * `rod.length - batch.length`, and each sheet wants the prefix ending at its
 * own bead. Pure, and separate from the face for exactly that reason — it is
 * arithmetic about a list, and getting it wrong shows two sheets animating the
 * same chip.
 */
export function beadRodsFor(
  batch: readonly unknown[],
  rod: readonly EarnedBead[],
): EarnedBead[][] {
  const first = Math.max(0, rod.length - batch.length);
  const rods: EarnedBead[][] = [];
  for (let i = 0; i < batch.length; i++) {
    rods.push(rod.slice(0, Math.min(rod.length, first + i + 1)));
  }
  return rods;
}

/**
 * What the sheet at the head of a queue of `queued` says.
 *
 * `queued` counts the head, so `1` is the ordinary case and gets no counter —
 * `triumphFace`'s rule, and for its reason.
 *
 * `still` is the reader's motion preference, and it lands here rather than in
 * the renderer so that "reduced motion collapses to the settled state" is a
 * property this suite can test without a DOM.
 */
export function beadAwardFace(
  news: BeadNews,
  queued: number,
  options: { still?: boolean } = {},
): BeadAwardFace {
  // The words come off the Beads screen's own face builder: one row, one set of
  // sentences, whichever surface prints them.
  const card = beadCardFace(news.id);
  const family = BEAD_FAMILY_MARK[news.family].word.toLowerCase();
  const slots = abacusRodSlots(news.rod, BEAD_RULES.threshold);
  const landed = news.rod.length - 1;
  const settled = slots[landed]?.kind === 'bead';
  return {
    eyebrow: news.kind === 'reckoning' ? 'a reckoning' : 'a bead',
    name: news.name,
    family: news.family,
    line: `${card.eyebrow} · ${family}`,
    deed: card.deed,
    boon: [...news.boon],
    slots,
    arriving: options.still === true || !settled ? null : landed,
    tally: `${figure(news.rod.length)} of ${figure(BEAD_RULES.threshold)} beads`,
    counter: queued > 1 ? `1 of ${queued}` : null,
  };
}

export interface BeadModal {
  /**
   * Queues these awards and raises the sheet if it is not already up. An empty
   * list does nothing at all, which is what almost every turn hands it.
   */
  show(awards: readonly BeadNews[]): void;
  readonly isOpen: boolean;
  /** Drops the whole queue and takes the sheet down. Called on a new game. */
  clear(): void;
  dispose(): void;
}

export interface BeadModalOptions {
  /**
   * The last sheet was proceeded past.
   *
   * The seam the *age-opening* announcement waits on: a world moment and a
   * personal one can land in the same resolution, and two surfaces at once say
   * less than one. See `main.ts`, which pumps its pending bead news from here.
   */
  onClosed?: () => void;
}

/**
 * Does this viewer want animation suppressed? `controls.ts`'s reading, and read
 * at the moment of use for its reason: the setting can change while the page is
 * open, and this is one media query per sheet.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createBeadModal(
  container: HTMLElement,
  options: BeadModalOptions = {},
): BeadModal {
  /** The head is what is on screen; the rest are waiting behind it. */
  let queue: BeadNews[] = [];
  /** Where focus goes back to once the last sheet is proceeded past. */
  let restoreFocus: HTMLElement | null = null;

  function clear(): void {
    const wasUp = queue.length > 0 || !container.hidden;
    queue = [];
    container.replaceChildren();
    container.hidden = true;
    const back = restoreFocus;
    restoreFocus = null;
    back?.focus({ preventScroll: true });
    if (wasUp) options.onClosed?.();
  }

  /** Proceeds past the head. The next sheet, or nothing left to say. */
  function proceed(): void {
    queue.shift();
    if (queue.length === 0) {
      clear();
      return;
    }
    render();
  }

  /** The rod: settled beads, the empty slots after them, the golden one last. */
  function drawWire(face: BeadAwardFace): HTMLElement {
    const wire = element('div', 'bead-rod-wire bead-award-wire');
    face.slots.forEach((slot, index) => {
      if (slot.kind === 'golden') {
        const golden = element('span', 'bead-slot is-golden');
        golden.title = 'The golden bead — only the Magnum Opus mints it';
        wire.append(golden);
        return;
      }
      if (slot.kind === 'empty') {
        wire.append(element('span', 'bead-slot is-empty'));
        return;
      }
      const chip = beadChipNode(slot.family!);
      // The one moving part on the sheet, and it moves because the face said
      // which slot — never because this loop worked out the last bead itself.
      if (index === face.arriving) chip.classList.add('is-arriving');
      wire.append(chip);
    });
    return wire;
  }

  function render(): void {
    const news = queue[0];
    if (!news) return;
    const face = beadAwardFace(news, queue.length, { still: prefersReducedMotion() });
    container.replaceChildren();

    const sheet = element('div', 'triumph-sheet bead-sheet gilt-frame');
    sheet.style.setProperty('--bead-ink', `var(${BEAD_FAMILY_MARK[face.family].ink})`);
    sheet.append(element('p', 'triumph-eyebrow', face.eyebrow));

    // The crest is a bead, at the size a crest wants: the laurel is renown's
    // mark and this system does not pay in renown.
    const crest = element('div', 'bead-award-crest');
    crest.append(beadChipNode(face.family));
    sheet.append(crest);

    sheet.append(element('h2', 'triumph-name', face.name));
    sheet.append(element('p', 'eyebrow bead-award-line', face.line));

    // What the deed asked. A bead row names no thing today, but it goes through
    // the one renderer anyway (Entry XLII) — unlinked, because a click that
    // opened the Compendium from under a sheet would take the sheet away.
    const deed = element('p', 'triumph-text');
    setDescriptorText(deed, face.deed, { linked: false });
    sheet.append(deed);

    const abacus = element('figure', 'bead-award-abacus');
    abacus.append(drawWire(face));
    abacus.append(element('figcaption', 'bead-award-tally', face.tally));
    sheet.append(abacus);

    // What it paid — the settlement's own sentences, in the order it paid them.
    if (face.boon.length > 0) {
      const paid = element('ul', 'bead-award-boons');
      for (const line of face.boon) paid.append(element('li', 'bead-award-boon', line));
      sheet.append(paid);
    }

    const foot = element('div', 'triumph-foot');
    const button = document.createElement('button');
    button.className = 'triumph-proceed';
    button.type = 'button';
    button.append(element('span', 'triumph-proceed-label', 'Proceed'));
    button.append(element('kbd', 'triumph-proceed-key', 'Enter'));
    button.addEventListener('click', () => proceed());
    foot.append(button);
    if (face.counter !== null) {
      foot.append(element('p', 'triumph-queue', face.counter));
    }
    sheet.append(foot);

    container.append(sheet);
    container.hidden = false;
    button.focus({ preventScroll: true });
  }

  function show(awards: readonly BeadNews[]): void {
    if (awards.length === 0) return;
    const wasUp = queue.length > 0;
    queue.push(...awards);
    if (wasUp) {
      // Already showing one: the new arrivals join the back of the queue and
      // the head keeps the screen. Only the counter changes, so re-render it.
      render();
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    restoreFocus = active && active !== document.body ? active : null;
    render();
  }

  // Capturing, so the sheet answers a key before the board's own handlers see
  // it — the Triumph sheet's contract exactly, and `main.ts` reports this as a
  // blocking surface so that Escape here never also backs something out there.
  function onKeyDown(event: KeyboardEvent): void {
    if (container.hidden || queue.length === 0) return;
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    proceed();
  }
  window.addEventListener('keydown', onKeyDown, true);

  return {
    show,
    get isOpen(): boolean {
      return !container.hidden;
    },
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      clear();
    },
  };
}
