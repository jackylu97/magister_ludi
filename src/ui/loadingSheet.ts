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

export interface LoadingSheetOptions {
  overlay: HTMLElement;
  /** The element the stage rows are built into, rebuilt on every repaint. */
  body: HTMLElement;
}

export interface LoadingSheet {
  readonly isOpen: boolean;
  /** Raises the sheet at the first stage of this journey's list. */
  begin(journey: LoadingJourney): void;
  /** The log has reached a turn. Moves to (or stays on) *Replaying the game*. */
  replayed(turn: number, expected: number): void;
  /** The terrain worker's own percentage. `100` hands over to *Placing the pieces*. */
  painted(percent: number): void;
  /** The board is up. Lowers the sheet. Safe on a sheet already down. */
  finish(): void;
  dispose(): void;
}

export function createLoadingSheet(options: LoadingSheetOptions): LoadingSheet {
  const { overlay, body } = options;

  let stages: LoadingStageId[] = loadingStages('new');
  let current: LoadingStageId = 'painting';
  let fraction: number | null = null;
  let detail = '';

  function draw(): void {
    const rows = loadingRows(stages, current, fraction, detail);
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
    // Escape is swallowed, not obeyed. Returning `true` tells the shell the
    // press was handled, which is the frame's own way of saying "this sheet
    // keeps its own key" — the Reliquary's ‹ › use the same door.
    onKey: () => true,
  });

  function move(stage: LoadingStageId, next: number | null, said: string): void {
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
    begin(journey): void {
      stages = loadingStages(journey);
      current = stages[0]!;
      fraction = null;
      detail = '';
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
    finish(): void {
      shell.close();
    },
    dispose(): void {
      shell.dispose();
    },
  };
}
