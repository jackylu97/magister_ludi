/**
 * The load list: the one surface that shows a player what is on their save
 * shelf, and the only route by which a file becomes the game on screen.
 *
 * It is a screen rather than a card because it opens from two places that could
 * not share a card — the landing, which is the whole page while it is up, and
 * the ☰ menu, which is a popover that would have to hold a scrolling list
 * inside itself. One overlay above both, opened by either.
 *
 * Everything that could be wrong about a save is decided in `saves.ts`; this
 * file only ever *shows* the answer. It reads slots, it hands a picked file to
 * `loadSaveAsync` (`saves.ts`'s own gate, with the log walked in a worker), and
 * on a refusal it prints the sentence that came back. There is no second opinion
 * about versions here, and no path that reaches the live game except through
 * `onLoad`, which is only ever called with a game that replayed to its last
 * command.
 *
 * Asking first
 * ------------
 * Two of the three verbs here throw something away, so both ask, and both ask
 * *in the row* — the same shape the ☰ menu's Restart confirm uses, for the same
 * reason: nothing moves under the pointer, and Escape still closes the whole
 * surface. Loading over a game in progress is the one that has to ask about
 * something not on screen, so it says what it is abandoning rather than "are you
 * sure".
 */

import type { Game } from '../sim/game';
import { loadSaveAsync } from './gameLoader';
import { isLeaderId, leaderDef } from '../sim/leaderData';
import {
  SAVE_KEY_PREFIX,
  type SavePayload,
  type SaveSlot,
  type SaveStorage,
  deleteSave,
  exportFilename,
  listSaves,
  memorySaveStorage,
  slotSummary,
  storageKey,
} from './saves';

/**
 * The shelf this browser can actually give us.
 *
 * `localStorage` is not merely *sometimes empty* — reaching for the property at
 * all throws in a blocked or sandboxed origin, and a browser set to refuse site
 * data can throw on the first read rather than on the property. So it is probed
 * with a real read inside a try, and anything that objects gets a shelf that
 * lives for the tab instead (`memorySaveStorage`). Saving keeps working; only
 * persistence is gone, which is the half that could not have been faked.
 *
 * This lives here rather than in `saves.ts` because it is the one line of that
 * feature that genuinely needs a browser, and `saves.ts` is deliberately a file
 * with no window in it.
 */
export function openSaveStorage(): SaveStorage {
  try {
    const store = window.localStorage;
    store.getItem(`${SAVE_KEY_PREFIX}probe`);
    return store;
  } catch {
    console.warn('[magister-ludi] this browser will not store saves; they last for this tab only');
    return memorySaveStorage();
  }
}

export interface SavesPanel {
  readonly isOpen: boolean;
  /** Opens the list, rebuilt from the shelf as it is right now. */
  open(): void;
  close(): void;
  /** Re-reads the shelf while the list is up. Cheap; there are never many rows. */
  refresh(): void;
}

export interface SavesPanelOptions {
  /** The full-screen surface. Hidden with `hidden` while closed. */
  overlay: HTMLElement;
  /** Where the rows go. Emptied and rebuilt on every refresh. */
  list: HTMLElement;
  closeButton: HTMLElement;
  importButton: HTMLElement;
  /** A hidden `<input type="file">`; Import clicks it. */
  fileInput: HTMLInputElement;
  /** Shown instead of the list when the shelf is empty. */
  emptyNote: HTMLElement;
  /** Where a refusal is printed. Cleared on every open. */
  errorEl: HTMLElement;
  storage: SaveStorage;
  /**
   * Whether loading would throw away a game in progress. Asked afresh on every
   * click, because it changes the moment the first game boots.
   */
  abandonsGame: () => boolean;
  /**
   * A fully replayed game, ready to become the live one. Called once, at the end
   * of a successful load, and never with a partial anything (see `saves.ts`).
   */
  onLoad: (game: Game, payload: SavePayload) => void;
  /**
   * The loading sheet, for the half of a load that happens here.
   *
   * A file picked in this panel is parsed and replayed *before* the question
   * about abandoning the game in progress is asked (see `adopt`), so the long
   * half of that journey happens with the panel on screen and nothing else to
   * look at. The sheet is raised for it and handed on: `main.ts` raises it again
   * for the board half, and a sheet already up is repainted rather than
   * reopened, so the two halves read as one wait.
   */
  loading?: {
    begin(): void;
    replayed(turn: number, expected: number): void;
    finish(): void;
  };
}

/**
 * When a save was taken, in as few characters as will still tell two saves of
 * the same game apart.
 *
 * Today rather than a date when it is today's, because "16:42" is what
 * distinguishes this afternoon's four autosaves and a date does not. The
 * platform's own formatter, so it is the player's locale and not a convention
 * invented here.
 */
export function savedAtLabel(savedAt: number, now: number = Date.now()): string {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return '—';
  const when = new Date(savedAt);
  const sameDay = new Date(now).toDateString() === when.toDateString();
  const time = when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return `${when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${time}`;
}

/**
 * **How long ago, in a phrase** — the title screen's shelf (batch L7,
 * `docs/flags.md` (yyyy)).
 *
 * The load list asks a different question and keeps its own answer: it is a list
 * of *slots* and has to tell four autosaves from this afternoon apart, so it
 * prints a clock (`savedAtLabel`). The shelf on the title screen asks "which
 * world was I in", and for that the useful reading is the distance — today, two
 * days ago, last week. Past a fortnight it hands back to the date, because
 * "eleven weeks ago" is a number nobody converts.
 */
export function relativeWhen(savedAt: number, now: number = Date.now()): string {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return '—';
  const then = new Date(savedAt);
  const startOf = (at: Date): number => new Date(at).setHours(0, 0, 0, 0);
  const days = Math.round((startOf(new Date(now)) - startOf(then)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return savedAtLabel(savedAt, now);
}

/**
 * One row of the title screen's shelf: a world, named by who is playing it.
 *
 * **The figure, the seed, the turn and when** — the four things that tell one
 * saved world from another at a glance. A `SaveSlot` carries three of them; the
 * fourth is in the payload's config, on seat 0, so the file is read a second
 * time for it. That is deliberate and it is cheap: a shelf is never more than a
 * handful of rows, and the alternative is a field on `SaveSlot` that every save
 * written before leaders existed would not have.
 *
 * A seat under no figure falls back to the save's own name, which is what the
 * player called it (or "Autosave") — never an invented one.
 */
export interface RecentWorld {
  slot: SaveSlot;
  /** The figure seat 0 sits under, or the save's own name where there is none. */
  figure: string;
}

export function recentWorlds(storage: SaveStorage, limit = 4): RecentWorld[] {
  return listSaves(storage)
    .slice(0, limit)
    .map((slot) => ({ slot, figure: figureOf(storage, slot) }));
}

/** Who seat 0 is in a stored save, in the roster's own words. */
function figureOf(storage: SaveStorage, slot: SaveSlot): string {
  const json = storage.getItem(storageKey(slot.id));
  if (json === null) return slot.name;
  try {
    const payload = JSON.parse(json) as Partial<SavePayload>;
    const leader = payload.config?.players?.[0]?.leader;
    return isLeaderId(leader) ? leaderDef(leader).name : slot.name;
  } catch {
    return slot.name;
  }
}

/** Hands the player a file the browser saves wherever it saves things. */
export function downloadJson(filename: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // The object URL pins the blob in memory until it is revoked, and the click
  // above is synchronous only in the sense that the navigation has been *asked
  // for* — a revoke in the same tick can beat it. One frame is enough.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export function createSavesPanel(options: SavesPanelOptions): SavesPanel {
  const {
    overlay,
    list,
    closeButton,
    importButton,
    fileInput,
    emptyNote,
    errorEl,
    storage,
    abandonsGame,
    onLoad,
    loading,
  } = options;

  let open = false;
  let restoreTo: HTMLElement | null = null;
  /** A file is through the gate or on its way; see `adopt`. */
  let busy = false;

  function fail(message: string, detail?: string): void {
    errorEl.textContent = message;
    errorEl.hidden = false;
    // The index of the command that stopped the replay is a developer's
    // question, not a player's, so it goes where developers look.
    if (detail !== undefined) console.error(`[magister-ludi save] ${detail}`);
  }

  function clearError(): void {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  /**
   * Puts one file through the gate, asks about the game it would replace, and
   * only then hands it over.
   *
   * The single funnel for both routes in — a slot off the shelf and a file off
   * the disk — so an imported save is validated by exactly the same four checks
   * a stored one is. There is no cheaper path for anything.
   *
   * **Validated before the question, always.** `loadSaveAsync` cannot touch the
   * live game (it builds a whole second one off to one side and returns it or
   * nothing), so there is no reason to ask a player to give up an afternoon for
   * a file that turns out to be from last month's build — they would answer yes
   * and then be told no. `confirmIn` is the row the question is asked in, and
   * `null` means there is nothing to ask about.
   *
   * The wait is now visible, and has to be. The log walks in a worker, so the
   * panel stays live and a game a hundred turns deep takes seconds to come
   * back: the row says what it is doing for the duration, and no second row can
   * be picked while it does — the panel would otherwise hand `onLoad` two games
   * in a row and the second would boot over the first.
   */
  async function adopt(json: string, confirmIn: HTMLElement | null): Promise<void> {
    if (busy) return;
    busy = true;
    const restore = confirmIn === null ? null : waitIn(confirmIn);
    let result;
    loading?.begin();
    try {
      result = await loadSaveAsync(json, { onReplayTurn: loading?.replayed });
    } finally {
      busy = false;
      restore?.();
    }
    if (!result.ok) {
      // Nothing more is coming: the sheet comes down so the sentence is what is
      // on screen.
      loading?.finish();
      fail(result.error, result.detail);
      return;
    }
    const hand = (): void => {
      close();
      onLoad(result.game, result.payload);
    };
    if (confirmIn !== null && abandonsGame()) {
      // A question is not a wait. Down while it is asked, up again when the
      // answer is Load.
      loading?.finish();
      ask(confirmIn, 'Abandon the game in progress?', 'Load', hand);
      return;
    }
    // Left standing on purpose: `onLoad` boots into the same sheet.
    hand();
  }

  /**
   * Says what a row is doing while it does it, and hands back the way to undo
   * that.
   *
   * The same swap `ask` makes, for the same reason — the row is the one place
   * the player is looking — and it is undone rather than refreshed away,
   * because a refusal prints into the error line and leaves the list standing.
   * An imported file's row arrives empty, so this is also what fills it.
   */
  function waitIn(row: HTMLElement): () => void {
    const held = [...row.childNodes];
    const waiting = document.createElement('span');
    waiting.className = 'save-ask';
    waiting.textContent = 'Opening that game…';
    row.replaceChildren(waiting);
    return () => row.replaceChildren(...held);
  }

  /**
   * Swaps a row's contents for a question and its two answers.
   *
   * "No" simply rebuilds the list, which is both the cancel and the way a second
   * row's open question is closed by asking a first — there is only ever one
   * question up, because there is only ever one list.
   */
  function ask(row: HTMLElement, question: string, confirmLabel: string, onYes: () => void): void {
    row.replaceChildren();
    row.classList.add('is-asking');

    const text = document.createElement('span');
    text.className = 'save-ask';
    text.textContent = question;

    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'btn btn-primary';
    yes.textContent = confirmLabel;
    yes.addEventListener('click', onYes);

    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'btn btn-quiet';
    no.textContent = 'Cancel';
    no.addEventListener('click', () => refresh());

    row.append(text, yes, no);
    yes.focus();
  }

  function buildRow(slot: SaveSlot): HTMLElement {
    const row = document.createElement('div');
    row.className = 'save-row';

    /** The row itself is the button: the whole thing is one target, and it loads. */
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'save-pick';

    const head = document.createElement('span');
    head.className = 'save-head';
    const name = document.createElement('span');
    name.className = 'save-name';
    name.textContent = slot.name;
    const badge = document.createElement('span');
    badge.className = 'save-badge';
    // Only the two automatic slots are labelled. A named save is already named.
    badge.textContent = slot.kind === 'auto' ? 'auto' : slot.kind === 'quick' ? 'quick' : '';
    badge.hidden = slot.kind === 'named';
    const when = document.createElement('span');
    when.className = 'save-when';
    when.textContent = savedAtLabel(slot.savedAt);
    head.append(name, badge, when);

    const meta = document.createElement('span');
    meta.className = 'save-meta';
    meta.textContent = slotSummary(slot);

    pick.append(head, meta);
    pick.addEventListener('click', () => {
      clearError();
      const json = storage.getItem(storageKey(slot.id));
      if (json === null) {
        fail('That save is no longer there.');
        refresh();
        return;
      }
      void adopt(json, row);
    });

    const actions = document.createElement('span');
    actions.className = 'save-actions';

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'save-action';
    save.title = `Export “${slot.name}” as a file`;
    save.setAttribute('aria-label', `Export ${slot.name}`);
    save.textContent = '↓';
    save.addEventListener('click', () => {
      clearError();
      const json = storage.getItem(storageKey(slot.id));
      if (json === null) {
        fail('That save is no longer there.');
        refresh();
        return;
      }
      // The filename wants the payload's own name and turn, and the file on the
      // shelf is the payload — so it is read from the file rather than rebuilt
      // out of the row, which is a label and could disagree with it.
      let payload: SavePayload;
      try {
        payload = JSON.parse(json) as SavePayload;
      } catch {
        fail('That save could not be read.');
        return;
      }
      downloadJson(exportFilename(payload), json);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'save-action is-danger';
    remove.title = `Delete “${slot.name}”`;
    remove.setAttribute('aria-label', `Delete ${slot.name}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      clearError();
      ask(row, `Delete “${slot.name}”?`, 'Delete', () => {
        deleteSave(storage, slot.id);
        refresh();
      });
    });

    actions.append(save, remove);
    row.append(pick, actions);
    return row;
  }

  function refresh(): void {
    const slots = listSaves(storage);
    list.replaceChildren(...slots.map(buildRow));
    emptyNote.hidden = slots.length > 0;
  }

  // --- the file picker ------------------------------------------------------

  importButton.addEventListener('click', () => {
    clearError();
    // Cleared first: picking the same file twice in a row fires no `change`
    // otherwise, which reads as the button having quietly stopped working.
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    // Cleared here as well as on the Import button: the last refusal is about
    // the last file, and this is the moment a new one arrives however it got
    // picked.
    clearError();
    void file
      .text()
      .then(async (text) => {
        // An imported file has no row of its own on the shelf, so one is made
        // for the question to be asked in — at the top, where the answer is
        // about the thing that just arrived rather than about anything listed.
        // Built before `adopt` so the question has somewhere to go; removed
        // again by the refresh that a refusal or a Cancel triggers.
        const row = document.createElement('div');
        row.className = 'save-row';
        list.prepend(row);
        await adopt(text, row);
        if (!row.classList.contains('is-asking')) row.remove();
      })
      .catch(() => fail('That file could not be read.'));
  });

  // --- the surface ----------------------------------------------------------

  closeButton.addEventListener('click', () => close());

  // A click on the scrim, but never one that started inside the sheet: a drag
  // that ends outside is not a dismissal.
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) close();
  });

  /**
   * Escape, handled here rather than through `controls`.
   *
   * The one surface in the interface that can be up while the landing is — and
   * `controls` deliberately ignores the keyboard while the landing is up, so
   * there is no listener there to route this through. It is bound on the overlay
   * itself and the focus trap keeps focus inside, so it cannot steal the key
   * from anything else.
   */
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      overlay.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function openPanel(): void {
    if (open) return;
    open = true;
    restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    clearError();
    refresh();
    overlay.hidden = false;
    closeButton.focus();
  }

  function close(): void {
    if (!open) return;
    open = false;
    overlay.hidden = true;
    restoreTo?.focus();
    restoreTo = null;
  }

  return {
    get isOpen() {
      return open;
    },
    open: openPanel,
    close,
    refresh: () => {
      if (open) refresh();
    },
  };
}
