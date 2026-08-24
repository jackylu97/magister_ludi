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
 * `loadSave`, and on a refusal it prints the sentence that came back. There is
 * no second opinion about versions here, and no path that reaches the live game
 * except through `onLoad`, which is only ever called with a game that replayed
 * to its last command.
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
import {
  SAVE_KEY_PREFIX,
  type SavePayload,
  type SaveSlot,
  type SaveStorage,
  deleteSave,
  exportFilename,
  listSaves,
  loadSave,
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
  } = options;

  let open = false;
  let restoreTo: HTMLElement | null = null;

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
   * **Validated before the question, always.** `loadSave` cannot touch the live
   * game (it builds a whole second one off to one side and returns it or
   * nothing), so there is no reason to ask a player to give up an afternoon for
   * a file that turns out to be from last month's build — they would answer yes
   * and then be told no. `confirmIn` is the row the question is asked in, and
   * `null` means there is nothing to ask about.
   */
  function adopt(json: string, confirmIn: HTMLElement | null): void {
    const result = loadSave(json);
    if (!result.ok) {
      fail(result.error, result.detail);
      return;
    }
    const hand = (): void => {
      close();
      onLoad(result.game, result.payload);
    };
    if (confirmIn !== null && abandonsGame()) {
      ask(confirmIn, 'Abandon the game in progress?', 'Load', hand);
      return;
    }
    hand();
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
      adopt(json, row);
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
      .then((text) => {
        // An imported file has no row of its own on the shelf, so one is made
        // for the question to be asked in — at the top, where the answer is
        // about the thing that just arrived rather than about anything listed.
        // Built before `adopt` so the question has somewhere to go; removed
        // again by the refresh that a refusal or a Cancel triggers.
        const row = document.createElement('div');
        row.className = 'save-row';
        list.prepend(row);
        adopt(text, row);
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
