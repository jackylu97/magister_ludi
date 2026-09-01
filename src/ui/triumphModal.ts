/**
 * The Triumph sheet: **you did a notable thing, and here is what it paid.**
 *
 * The user's ruling (playtest, 2026-08-27): *"a modal that describes the
 * achieved triumph, the amount of renown awarded, and a proceed button"*. A
 * triumph already had a chronicle line and a toast, and a toast is the wrong
 * volume for it — the toast stack is where a caravan comes home and a scout
 * spots a ruin, and a Triumph happens perhaps fifteen times in a game. It is a
 * proclamation, so it wears the proclamation dress: the turn card's `gilt-frame`
 * double rule, the display face for the name, and the laurel the renown chip
 * carries (`meterMark.ts`).
 *
 * The toast **stays**. This sheet is the moment; the chronicle is the record,
 * and a player who proceeded past a sheet while looking at the board is entitled
 * to find the line again in the log.
 *
 * Modal, and it is the mild kind
 * ------------------------------
 * `offerCard.ts` is the blocking screen in this interface, and this deliberately
 * is not it: an offer is a *decision* with nothing behind it, and this is news.
 * So there is exactly one control, it is affirmative ("Proceed"), and **Enter and
 * Escape both do the same thing** — there is no second answer for Escape to
 * mean. What it does not do is dismiss on any stray click, the way the turn
 * splash does: the splash is a two-second card that repeats every turn, and this
 * one is worth having read.
 *
 * A queue, not a stack
 * --------------------
 * One resolution can award several Triumphs (a wonder finished the same turn the
 * third city was founded), and two sheets at once say less than one. `show`
 * appends; the sheet holds the head of the queue until Proceed, then re-renders
 * for the next. `n of m` appears the moment there is more than one, so a player
 * pressing Enter knows something else is behind it.
 *
 * The plate
 * ---------
 * `<figure class="triumph-plate">` is a **reserved slot** for the splash art the
 * user has asked for later, and it is `hidden` — not merely empty — for every
 * row that names no `art`. Nothing else in this file is about art, and nothing
 * about the layout depends on the plate being there, so the day a row gains a
 * picture is the day the picture appears.
 *
 * Data is data: every string arrives as a text node (`turnSplash.ts`'s rule).
 */

import { renownMarkNode } from './meterMark';

/** One Triumph, as this sheet needs to read it. `triumphData.ts`'s row, flattened. */
export interface TriumphNews {
  /** "The Third Hearth". */
  name: string;
  /**
   * **What you did to earn it** — `TriumphDef.text`, the row's cause line.
   *
   * The sheet's answer to the playtest complaint that a Triumph arrives titled
   * and unexplained (user, 2026-08-28). It sits directly under the name because
   * it is the sentence the sheet exists to say; the epigram, which used to sit
   * there and read as the explanation, is now labelled Flavour beneath it.
   */
  text: string;
  /** The row's own sentence. Flavour, and labelled as such. */
  epigram: string;
  /** Renown paid — already banked by the time anybody sees this sheet. */
  pays: number;
  /**
   * The splash art for this Triumph, or `null`. No row names one today; the
   * plate below is the slot that waits for the first that does.
   */
  art?: string | null;
}

/**
 * One sheet, as data — everything on it except the DOM that draws it.
 *
 * Split out because this suite has no jsdom (`controls.test.ts`'s note, and
 * every UI pass before this one), and the three rules on this sheet that can be
 * *quietly wrong* are all in here: whether the plate is shown, whether there is
 * a counter, and how the figure reads. Drawing them is a dozen `append` calls
 * that fail loudly or not at all.
 */
export interface TriumphFace {
  name: string;
  /** The cause, in the row's own words. Never empty — the table validates it. */
  text: string;
  epigram: string;
  /** "+10". Always signed, always positive — no Triumph takes renown away. */
  pays: string;
  /** The art the plate shows, or `null`, in which case the plate is hidden. */
  plate: string | null;
  /** "1 of 3", or `null` when this sheet is the only one waiting. */
  counter: string | null;
}

/**
 * What the sheet at the head of a queue of `queued` says.
 *
 * `queued` counts the head, so `1` is the ordinary case and gets no counter:
 * "1 of 1" is furniture, and a player pressing Proceed on the last sheet does
 * not need to be told it was the last.
 */
export function triumphFace(news: TriumphNews, queued: number): TriumphFace {
  return {
    name: news.name,
    text: news.text,
    epigram: news.epigram,
    pays: `+${news.pays}`,
    // An empty string is no art. A row that named `""` would otherwise draw an
    // empty frame, which is worse than the slot the sheet already hides.
    plate: typeof news.art === 'string' && news.art.length > 0 ? news.art : null,
    counter: queued > 1 ? `1 of ${queued}` : null,
  };
}

export interface TriumphModal {
  /**
   * Queues these Triumphs and raises the sheet if it is not already up. An
   * empty list does nothing at all, which is what almost every turn hands it.
   */
  show(awards: readonly TriumphNews[]): void;
  readonly isOpen: boolean;
  /** Drops the whole queue and takes the sheet down. Called on a new game. */
  clear(): void;
  dispose(): void;
}

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface TriumphModalOptions {
  /**
   * The last sheet was proceeded past and the screen is clear.
   *
   * The seam other news waits on. A Triumph and a bead can land in the same
   * resolution and two sheets at once say less than one, so `main.ts` holds the
   * Bead Race's own sheet until this fires. Announced rather than polled for the
   * reason every other report in this interface is: a poll would have to run on
   * a frame, and this happens perhaps fifteen times in a game.
   */
  onClosed?: () => void;
}

export function createTriumphModal(
  container: HTMLElement,
  options: TriumphModalOptions = {},
): TriumphModal {
  /** The head is what is on screen; the rest are waiting behind it. */
  let queue: TriumphNews[] = [];
  /** Where focus goes back to once the last sheet is proceeded past. */
  let restoreFocus: HTMLElement | null = null;

  function clear(): void {
    // Read before the emptying: `clear` is also how a new game takes a standing
    // sheet down, and news held behind one has to be released either way.
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

  function render(): void {
    const news = queue[0];
    if (!news) return;
    const face = triumphFace(news, queue.length);
    container.replaceChildren();

    const sheet = element('div', 'triumph-sheet gilt-frame');
    sheet.append(element('p', 'triumph-eyebrow', 'Triumph'));

    const crest = element('div', 'triumph-crest');
    crest.append(renownMarkNode());
    sheet.append(crest);

    sheet.append(element('h2', 'triumph-name', face.name));
    // The cause first, because it is what a player who has just been handed a
    // sheet is asking. Then the epigram, **labelled** — the Compendium's ruling
    // (2026-08-27) applied here for exactly its stated reason: a sentence in
    // this voice sitting under a rule is read as a second rule.
    sheet.append(element('p', 'triumph-text', face.text));
    const flavor = element('p', 'triumph-epigram');
    flavor.append(element('span', 'flavor-label', 'Flavour'));
    flavor.append(document.createTextNode(face.epigram));
    sheet.append(flavor);

    // The slot, and nothing more. Hidden rather than absent so the reserved
    // space is a thing in the tree a later pass fills.
    const plate = element('figure', 'triumph-plate');
    if (face.plate === null) {
      plate.hidden = true;
    } else {
      const image = document.createElement('img');
      image.src = face.plate;
      image.alt = '';
      plate.append(image);
    }
    sheet.append(plate);

    // The figure, in the tabular mono every number in this interface is set in.
    // "+10" and the word apart, because the word is not a number.
    const pays = element('p', 'triumph-pays');
    pays.append(element('span', 'triumph-pays-figure', face.pays));
    pays.append(element('span', 'triumph-pays-word', 'renown'));
    sheet.append(pays);

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

  function show(awards: readonly TriumphNews[]): void {
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
  // it — `controls.ts` binds on the window too, and `main.ts` reports this as a
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
