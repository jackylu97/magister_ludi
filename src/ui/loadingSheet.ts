/**
 * **The loading sheet** — the one surface a press waits behind, whichever press
 * it was.
 *
 * Starting a world and resuming one used to say different things, and one of
 * them said nothing. A new game wrote the terrain worker's percentage into the
 * Begin button's own label; a save wrote "Preparing the world…" there and then
 * froze the tab for as long as the log took to replay. The user's ruling
 * (`docs/flags.md` (eeeee)): *one* sheet for both journeys, up from the press
 * until the board is actually on screen, saying what is happening in words a
 * first-time player already knows.
 *
 * What it is, and is not
 * ----------------------
 * It is a **report**, not a control. There is no Cancel (the ruling parks it),
 * so there is no × on the paper, Escape is swallowed rather than obeyed, and the
 * ground around the sheet is covered so that a press there has nothing to close.
 * That is a deliberate reading of the H5 contract rather than an exception to
 * it: the frame is still `modalShell.ts`'s — one `hidden` flag, one class, one
 * window listener bound and unbound in one place — and what the three doors do
 * is the sheet's own business, exactly as it is on every other sheet. A loading
 * report that could be dismissed would leave the player looking at a blank board
 * with no way to ask what happened to it.
 *
 * It is also **the page's, not a game's**. Every other sheet is built in `boot`
 * and torn down when `boot` runs again; this one is up *while* `boot` runs, so a
 * disposer swept at the top of `boot` would pull it down mid-load. It is built
 * at module scope beside the saves panel and the Compendium, for the same
 * reason they are: it belongs to the page and outlives every game on it.
 *
 * The four stages
 * ---------------
 * Named in the ruling, and each one is a real seam rather than a guess at a
 * fraction:
 *
 *   · **Opening the save** — the file parsed and its versions checked, and the
 *     worker asked. No bar: it is milliseconds, and a bar that jumps is worse
 *     than no bar.
 *   · **Replaying the game** — the log walked, one report per turn
 *     (`ReplayWatcher` in `sim/game.ts`), against the turn the file's label
 *     says it is heading for.
 *   · **Painting the world** — the terrain worker's own percentage, which the
 *     Begin button used to print.
 *   · **Placing the pieces** — the state handed to the layers, up until a frame
 *     has actually been presented (`first-board-frame`).
 *
 * A new world has no file and no log, so it walks the last two only.
 *
 * The fifth thing it can say
 * --------------------------
 * A save is a script (`saves.ts`), and a script the current rules will not run
 * is not a game. That refusal used to reach nobody: the walk stopped, the sheet
 * was lowered by the caller's `finally`, and the one sentence anybody was owed
 * went to a line at the foot of the title page — under the fold on a short
 * window, and nowhere near the row that had just been pressed. The player was
 * left looking at the stage the walk died on, or at a title screen that had
 * apparently done nothing (`docs/flags.md` (yyyyy), row 2).
 *
 * So the sheet has a **refusal** state. The stage list is *replaced* by it —
 * nothing further is going to happen, and a list of stages that will never be
 * reached is something to read past — and the sheet is then **sealed**: `finish`
 * is the caller's ordinary way out and no longer takes it down, because the one
 * thing a report must not do is disappear before it has been read. It comes down
 * when the player says so — Back to the title, or Escape. (Not the third door:
 * the ground around this paper is covered by a child element so that a press
 * beside it targets nothing, which is the rule that keeps a *running* load
 * undismissable, and a refusal is not worth a second ground.) That makes this
 * the one moment the loading sheet is a control rather than a report, which is
 * why Escape is obeyed here and swallowed everywhere else on it.
 */

import { type ModalShell, createModalShell } from './modalShell';

export type LoadingStageId = 'opening' | 'replaying' | 'painting' | 'placing';

/** Which press this is. The only thing that decides the stage list. */
export type LoadingJourney = 'new' | 'save';

/**
 * The stages a journey walks, in order.
 *
 * Pure, exported and pinned, because "the two file stages are absent on a new
 * world" is the whole of the ruling's shape and is not a thing to read out of
 * DOM glue.
 */
export function loadingStages(journey: LoadingJourney): LoadingStageId[] {
  return journey === 'save'
    ? ['opening', 'replaying', 'painting', 'placing']
    : ['painting', 'placing'];
}

/**
 * The words. A first-time player's (hard rule 7): nobody outside this repo
 * knows what a command log or a board hydration is, and both of them are "the
 * game coming back".
 */
export function loadingStageLabel(stage: LoadingStageId): string {
  switch (stage) {
    case 'opening':
      return 'Opening the save';
    case 'replaying':
      return 'Replaying the game';
    case 'painting':
      return 'Painting the world';
    case 'placing':
      return 'Placing the pieces';
  }
}

/** One stage's standing, for the mark in front of its line. */
export type LoadingStanding = 'done' | 'now' | 'waiting';

export interface LoadingRow {
  stage: LoadingStageId;
  label: string;
  standing: LoadingStanding;
  /** `0`–`1` while this stage is the one running, else `null`: no bar to draw. */
  fraction: number | null;
  /** "turn 84 of 121" and nothing else today. Empty where a stage counts nothing. */
  detail: string;
}

/**
 * The whole sheet as data, so what it says can be pinned without a browser
 * (there is no jsdom in this suite — `controls.test.ts`'s note).
 *
 * Everything before the running stage is done and everything after it is
 * waiting: a loading sequence only ever goes forwards, and a stage that
 * reported nothing is still finished once a later one has started.
 */
export function loadingRows(
  stages: readonly LoadingStageId[],
  current: LoadingStageId,
  fraction: number | null,
  detail: string,
): LoadingRow[] {
  const at = stages.indexOf(current);
  return stages.map((stage, index) => ({
    stage,
    label: loadingStageLabel(stage),
    standing: index < at ? 'done' : index === at ? 'now' : 'waiting',
    fraction: index === at ? fraction : null,
    detail: index === at ? detail : '',
  }));
}

/** "turn 84 of 121", or nothing at all when the file's label named no turn. */
export function replayDetail(turn: number, expected: number): string {
  if (expected <= 0) return `turn ${turn}`;
  return `turn ${turn} of ${Math.max(turn, expected)}`;
}

/**
 * A load that will not finish, as the sheet prints it.
 *
 * Two fields because two readers. `error` is the player's: `saves.ts`'s gate
 * wrote it, it is the same sentence the saves panel prints beside a broken row,
 * and there is exactly one of it per kind of refusal in this build. `detail` is
 * the developer's — the command the walk stopped at and the reducer's own
 * refusal of it, which `tryReplay` has always reported and which used to reach
 * the console and nothing else.
 */
export interface LoadRefusal {
  error: string;
  detail?: string;
}

/**
 * The sheet's own words for a save it could not open.
 *
 * The lead says what happened in the terms of the press that caused it — a save
 * was asked for and did not open — and the gate's sentence follows it unaltered,
 * because a second opinion about why a save is bad is a second place for the
 * answer to be wrong (`savesPanel.ts`'s docblock makes the same promise).
 */
export function refusalSentence(error: string): string {
  return `This save could not be opened: ${error}`;
}

/** What the one button on a refused sheet says. There is nowhere else to go. */
export const REFUSAL_WAY_OUT = 'Back to the title';

/**
 * What is on the paper: the stage list, or the refusal that replaces it.
 *
 * The same trick `loadingRows` plays, for the same reason — the sheet's words
 * are a pure reading of its state, so what a refused load actually says can be
 * asserted rather than grepped for. `draw` below is the one renderer of this and
 * decides nothing of its own.
 */
export type LoadingFace =
  | { kind: 'stages'; rows: LoadingRow[] }
  | { kind: 'refusal'; sentence: string; detail: string; wayOut: string };

export function loadingFace(
  stages: readonly LoadingStageId[],
  current: LoadingStageId,
  fraction: number | null,
  detail: string,
  refusal: LoadRefusal | null,
): LoadingFace {
  // A refusal replaces the list rather than joining it: nothing further is going
  // to happen, and stages that will never be reached are lines to read past.
  if (refusal !== null) {
    return {
      kind: 'refusal',
      sentence: refusalSentence(refusal.error),
      detail: refusal.detail ?? '',
      wayOut: REFUSAL_WAY_OUT,
    };
  }
  return { kind: 'stages', rows: loadingRows(stages, current, fraction, detail) };
}

export interface LoadingSheetOptions {
  overlay: HTMLElement;
  /** The element the stage rows are built into, rebuilt on every repaint. */
  body: HTMLElement;
  /**
   * The paper's two headings — the one a wait wears and the one a refusal does —
   * swapped by `hidden`, which is how every other pair of states on this
   * interface is swapped.
   *
   * Optional, and absent in the tests: the words of a heading are markup's
   * business (one of them carries an `em`), so they live in `index.html` beside
   * every other heading rather than being built here out of strings.
   */
  heads?: { loading: HTMLElement; refused: HTMLElement };
  /**
   * Where the keyboard goes when a refusal is dismissed.
   *
   * `modalShell`'s contract is that a sheet hands the keyboard back to the
   * control that opened it, and this sheet has no one such control — it is
   * raised by Begin, by Continue, by a shelf row and by the load list, and it is
   * raised *across* a boot that replaces half the page. So it asks, at the one
   * moment it is a control rather than a report, and takes `null` for an answer.
   */
  returnFocus?: () => HTMLElement | null;
}

export interface LoadingSheet {
  readonly isOpen: boolean;
  /** True while a refusal is on the paper — and so while `finish` will not act. */
  readonly isRefused: boolean;
  /** Raises the sheet at the first stage of this journey's list. */
  begin(journey: LoadingJourney): void;
  /** The log has reached a turn. Moves to (or stays on) *Replaying the game*. */
  replayed(turn: number, expected: number): void;
  /** The terrain worker's own percentage. `100` hands over to *Placing the pieces*. */
  painted(percent: number): void;
  /**
   * The load will not finish. The stage list is replaced by the refusal and the
   * sheet is sealed until the player dismisses it — raising it first if this
   * journey never got as far as raising it at all.
   */
  refuse(refusal: LoadRefusal): void;
  /** The board is up. Lowers the sheet — unless a refusal is standing on it. */
  finish(): void;
  dispose(): void;
}

export function createLoadingSheet(options: LoadingSheetOptions): LoadingSheet {
  const { overlay, body, heads } = options;

  let stages: LoadingStageId[] = loadingStages('new');
  let current: LoadingStageId = 'painting';
  let fraction: number | null = null;
  let detail = '';
  /** Presence is the whole of the refusal state, as `hidden` is the sheet's. */
  let refusal: LoadRefusal | null = null;

  /**
   * The one way off a refused sheet, built once rather than per repaint: it
   * holds the keyboard while the refusal is up, and an element rebuilt under a
   * focused button is a button the player is no longer on.
   */
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'btn btn-primary loading-refusal-out';
  backButton.textContent = REFUSAL_WAY_OUT;
  backButton.addEventListener('click', () => shell.close());

  function drawRefusal(said: Extract<LoadingFace, { kind: 'refusal' }>): void {
    const panel = document.createElement('div');
    panel.className = 'loading-refusal';

    const sentence = document.createElement('p');
    sentence.className = 'loading-refusal-sentence';
    sentence.textContent = said.sentence;
    panel.append(sentence);

    if (said.detail !== '') {
      // Where the walk stopped, in the mono voice everything technical on this
      // interface wears. It is on the paper rather than in the console alone
      // because the player is the one who can send it on to whoever can fix the
      // file, and nobody can be asked to open developer tools to read it.
      const where = document.createElement('p');
      where.className = 'loading-refusal-detail';
      where.textContent = said.detail;
      panel.append(where);
    }

    panel.append(backButton);
    body.replaceChildren(panel);
  }

  function draw(): void {
    const face = loadingFace(stages, current, fraction, detail, refusal);
    if (heads !== undefined) {
      heads.loading.hidden = face.kind === 'refusal';
      heads.refused.hidden = face.kind === 'stages';
    }
    if (face.kind === 'refusal') {
      drawRefusal(face);
      return;
    }
    const { rows } = face;
    const list = document.createElement('ol');
    list.className = 'loading-stages';
    for (const row of rows) {
      const item = document.createElement('li');
      item.className = `loading-stage is-${row.standing}`;

      const head = document.createElement('p');
      head.className = 'loading-stage-head';
      const mark = document.createElement('span');
      mark.className = 'loading-stage-mark';
      // A drawn mark rather than a word, so the three standings read at a
      // glance and the line beside them stays one length in every state.
      mark.textContent = row.standing === 'done' ? '✓' : row.standing === 'now' ? '›' : '·';
      mark.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'loading-stage-label';
      label.textContent = row.label;
      head.append(mark, label);
      if (row.detail !== '') {
        const said = document.createElement('span');
        said.className = 'loading-stage-detail';
        said.textContent = row.detail;
        head.append(said);
      }
      item.append(head);

      if (row.fraction !== null) {
        const track = document.createElement('div');
        track.className = 'loading-bar';
        const fill = document.createElement('div');
        fill.className = 'loading-bar-fill';
        fill.style.width = `${Math.round(Math.min(1, Math.max(0, row.fraction)) * 100)}%`;
        track.append(fill);
        item.append(track);
      }
      list.append(item);
    }
    body.replaceChildren(list);
  }

  const shell: ModalShell = createModalShell({
    overlay,
    body,
    // No × on the paper: the sheet reports, it does not ask. The shell wants an
    // element to bind and to hand the keyboard to, and a detached button is
    // exactly that — nothing the player can reach, and nothing to unbind wrong.
    closeButton: document.createElement('button'),
    draw,
    // Escape is swallowed, not obeyed, while the load is running: returning
    // `true` tells the shell the press was handled, which is the frame's own way
    // of saying "this sheet keeps its own key" — the Reliquary's ‹ › use the
    // same door. A refusal is the one state where there *is* something to
    // dismiss, so the key goes back to the shell and Escape closes it like any
    // other sheet.
    onKey: () => refusal === null,
    // Whichever door it was. Clearing here rather than in the button's own
    // handler is what makes Escape mean the same thing as pressing Back — and
    // the keyboard is handed back here for the same reason.
    onClose: () => {
      const dismissed = refusal !== null;
      refusal = null;
      if (dismissed) options.returnFocus?.()?.focus({ preventScroll: true });
    },
  });

  function move(stage: LoadingStageId, next: number | null, said: string): void {
    // A refusal is the end of the journey. A progress line still in flight when
    // the walk was refused — the worker's last report, or the fallback's —
    // must not put the stage list back over the sentence.
    if (refusal !== null) return;
    // Forwards only. A late progress line from a stage the load has already
    // walked past must not drag the sheet backwards.
    if (stages.indexOf(stage) < stages.indexOf(current)) return;
    current = stage;
    fraction = next;
    detail = said;
    shell.refresh();
  }

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    get isRefused(): boolean {
      return refusal !== null;
    },
    begin(journey): void {
      stages = loadingStages(journey);
      current = stages[0]!;
      fraction = null;
      detail = '';
      // A fresh press is a fresh sheet of paper: the last refusal was about a
      // save the player has already left behind.
      refusal = null;
      shell.open();
    },
    replayed(turn, expected): void {
      move(
        'replaying',
        expected > 0 ? Math.min(1, turn / Math.max(turn, expected)) : null,
        replayDetail(turn, expected),
      );
    },
    painted(percent): void {
      if (percent >= 100) move('placing', null, '');
      else move('painting', percent / 100, '');
    },
    refuse(said): void {
      refusal = said;
      // `open` on a sheet already up repaints and leaves the keyboard alone; on
      // one that was never raised it raises it. Both are wanted: a file can be
      // refused by the gate before a single stage has been reported, and that
      // refusal is owed the same sheet as one that died half-way through a walk.
      shell.open();
      backButton.focus({ preventScroll: true });
    },
    finish(): void {
      // The caller lowers the sheet in a `finally`, which is right for every
      // ordinary way out of a press and wrong for the one way out that still has
      // something to say. A refused sheet is dismissed by the player, at the
      // three doors `modalShell` already gives it.
      if (refusal !== null) return;
      shell.close();
    },
    dispose(): void {
      refusal = null;
      shell.dispose();
    },
  };
}
