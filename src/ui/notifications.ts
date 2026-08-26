/**
 * The notification channel: what the game has to *tell* the player, and the
 * memory of everything it has already told them.
 *
 * There are two voices in this interface and they were sharing one slot. A
 * **refusal** ("You have ended turn 12") belongs in the bottom-left context
 * card, because that is where the player is already looking when an order is
 * bounced — it is a reply to a gesture, and it goes back where the gesture came
 * from. **News** ("Granary completed in Uruk", "A barbarian camp menaces the
 * frontier") is the opposite: nobody asked for it, it can arrive while the
 * player is reading a city screen, and a line that whispers it into a corner and
 * fades in a beat and a half is a line that is missed. So news graduates to a
 * toast under the top bar and, permanently, to a log.
 *
 * This module is the half of that with no DOM in it — for `saves.ts`'s reason.
 * The log is a capped per-seat list with an unread count, and the sighting
 * watcher is a set difference over the local seat's knowledge; both are exactly
 * the kind of thing that goes quietly wrong and is invisible until it does, so
 * both are ordinary data structures the node-environment suite can drive.
 * `toasts.ts` and `notificationsPanel.ts` are the surfaces.
 *
 * The log is a courtesy, not a record
 * -----------------------------------
 * It is **view state**, in the same class as the selection and the skip set: it
 * is not in `GameState`, it is not in the save, it does not replay, and a new
 * game or a load starts it empty. A save's log is the *command* log
 * (`sim/game.ts`), which is the thing that is actually authoritative about what
 * happened; this list is a convenience for a player who looked away for a turn.
 * Two seats at one table therefore keep two logs, and switching chairs shows the
 * chair's own — the hot-seat harness rule (CLAUDE.md, hard rule 3): a seat may
 * only ever be told what that seat was told.
 */

import type { GameState } from '../sim/state';
import { HIDDEN, isVisibleTo, visibilityAt } from '../sim/visibility';
import type { CellRef } from './mapView';

/**
 * One thing a notification can make happen when it is clicked or tapped.
 *
 * A discriminated union rather than a bare `CellRef` because "pan the camera
 * there" is one *kind* of action and, eventually, not the only one — a future
 * entry might open a city panel or a tech instead of just looking at it. The
 * toast stack and the chronicle both take this whole, and the caller that
 * knows what to do with each kind (`main.ts`'s `runAction`) switches on
 * `kind` with a `never` default, so a new member of this union fails to
 * compile wherever it goes unhandled rather than silently doing nothing.
 *
 * `openStatecraft` is the second member and deliberately carries no cell: the
 * screen it opens is about the empire, not a hex, exactly as the `statecraft`
 * turn blocker takes no camera move either (`controls.ts`'s `focusBlocker`).
 * It exists for the one announcement that fires when the *first* draft a game
 * ever deals appears — see `showStatecraftOffer`'s caller in `main.ts` — so a
 * player who has never opened the screen is handed the door to it rather than
 * only a badge on a chip they have not learned to read yet.
 */
export type NotificationAction = { kind: 'pan'; cell: CellRef } | { kind: 'openStatecraft' };

/**
 * One thing that happened, as the player is told it.
 *
 * `action` is optional and is what makes an entry *navigable*: a completion, a
 * cleared camp, a sighted ruin all happened somewhere, and an entry that
 * carries a `pan` action can take the camera there when it is clicked. News
 * about the empire as a whole — a meter going under, an autosave warning — has
 * no action and is a plain line, which is why the field is optional rather
 * than a sentinel nobody can distinguish from a real one.
 */
export interface NotificationEntry {
  /** The turn it was announced on. Stamped by the caller, from the live state. */
  turn: number;
  text: string;
  action?: NotificationAction;
}

/**
 * Whether an entry should render as a control rather than plain text.
 *
 * Two things have to both be true — the entry has something to do (an
 * `action`) and the surface has something to do it with (a handler) — and
 * `toasts.ts` and `notificationsPanel.ts` each need exactly this test to
 * decide between a `<button>` and a `<div>`/`<p>`. Pulled out once, here,
 * rather than left as an inline `&&` in each of the two DOM modules: it is the
 * one piece of that decision with no DOM in it, so it is the one piece a test
 * can pin without a browser.
 */
export function isActionable(entry: NotificationEntry, hasHandler: boolean): boolean {
  return entry.action !== undefined && hasHandler;
}

/**
 * How many entries one seat keeps.
 *
 * A hundred is roughly a long session's worth of news, and the point of the cap
 * is that this list is unbounded otherwise: it grows on every completion, every
 * blow, every sighting, for as long as the tab is open. Oldest out first, which
 * is the only sensible end to drop from — the newest entry is the one the player
 * opened the panel to read.
 */
export const NOTIFICATION_CAP = 100;

export interface NotificationLog {
  /** Files an entry against one seat. Newest-first from then on. */
  push(seatId: number, entry: NotificationEntry): void;
  /** That seat's entries, **newest first** — panel order, so nothing reverses. */
  entries(seatId: number): readonly NotificationEntry[];
  /** How many have arrived for that seat since it last opened the panel. */
  unread(seatId: number): number;
  /** The panel opened: that seat has now seen everything it holds. */
  markRead(seatId: number): void;
  /** A new game, or a loaded one. Every seat's log and every unread count. */
  clear(): void;
  /** The cap this log was built with. Read by tests and by nothing else. */
  readonly cap: number;
}

export interface NotificationLogOptions {
  /** Entries kept per seat. Defaults to `NOTIFICATION_CAP`. */
  cap?: number;
}

/**
 * A per-seat log.
 *
 * Keyed by seat id in a `Map` rather than an array indexed by player id, because
 * this is view state and has no stake in the "player id === array index"
 * assumption the simulation's parallel arrays make (CLAUDE.md's trap). Nothing
 * about an *outcome* is decided by iterating it, so the map's order is nobody's
 * business — the only iteration is `clear`, which empties it.
 */
export function createNotificationLog(options: NotificationLogOptions = {}): NotificationLog {
  const cap = Math.max(1, options.cap ?? NOTIFICATION_CAP);
  const bySeat = new Map<number, NotificationEntry[]>();
  const unreadBySeat = new Map<number, number>();

  function listFor(seatId: number): NotificationEntry[] {
    let list = bySeat.get(seatId);
    if (!list) {
      list = [];
      bySeat.set(seatId, list);
    }
    return list;
  }

  return {
    cap,
    push(seatId, entry): void {
      const list = listFor(seatId);
      // Unshifted rather than pushed: the panel reads newest-first and so does
      // the toast stack, so the list is *stored* in the order it is read and
      // nothing downstream has to remember to reverse it.
      list.unshift(entry);
      if (list.length > cap) list.length = cap;
      // Clamped to what is actually there: a seat that has been away long
      // enough to overflow the cap cannot be owed more unread entries than the
      // log still holds, and a badge promising forty lines above a list of
      // twenty would be the interface counting things it has thrown away.
      unreadBySeat.set(seatId, Math.min((unreadBySeat.get(seatId) ?? 0) + 1, list.length));
    },
    entries(seatId): readonly NotificationEntry[] {
      return bySeat.get(seatId) ?? [];
    },
    unread(seatId): number {
      return unreadBySeat.get(seatId) ?? 0;
    },
    markRead(seatId): void {
      unreadBySeat.set(seatId, 0);
    },
    clear(): void {
      bySeat.clear();
      unreadBySeat.clear();
    },
  };
}

// --- sightings ---------------------------------------------------------------

/**
 * The three things a seat can *come to know about* without issuing an order for
 * it. Ruins and villages are ground; a camp is an occupation. See the fog split
 * in `render3d/sites3d.ts` — this module answers the same two questions the
 * renderer does, and deliberately with the same two rules.
 */
export type SightingKind = 'ruins' | 'village' | 'camp';

/** One thing the local seat has just learned is there. */
export interface Sighting {
  kind: SightingKind;
  col: number;
  row: number;
  /** The line the interface announces, written here so a test can pin it. */
  text: string;
}

/**
 * What each sighting says. Ruins and villages are a discovery — an invitation —
 * and read as one; a camp is a threat and reads as one.
 */
const SIGHTING_TEXT: Readonly<Record<SightingKind, string>> = {
  ruins: 'You sight ancient ruins.',
  village: 'You sight a tribal village.',
  camp: 'A barbarian camp menaces the frontier.',
};

export interface SightingWatcher {
  /**
   * Everything this seat has learned since the last poll or baseline, in map
   * order then camp order — arrays, never a set's iteration order, because a
   * player reading two lines should get them in the same order twice.
   */
  poll(state: GameState, seatId: number): Sighting[];
  /**
   * Takes the same reading and emits **nothing**: this seat now counts as
   * already told. The silent half, and the whole reason seat switching does not
   * produce a toast storm — see `createSightingWatcher`.
   */
  baseline(state: GameState, seatId: number): void;
  /** Forgets every seat. A new game, or a loaded one: nobody has seen anything. */
  reset(): void;
}

/**
 * The identity of a thing that can be sighted — what "the same one" means.
 *
 * A discovery site is identified by its kind and its hex, and that is enough
 * because `Tile.discovery` can only ever be *removed* (CLAUDE.md's trap): a ruin
 * a scout consumed never comes back, and no ruin is ever founded mid-game, so a
 * key that has been seen once can never legitimately arrive again.
 *
 * **A camp carries its founding turn**, and that is the whole of the "appearance
 * epoch" rule. Camps follow the *occupation* fog rule — drawn, and here
 * announced, only while the seat can see them right now — so a patrol that walks
 * past a camp, loses sight of it and comes back would re-announce the same camp
 * forever if identity were the hex alone. It is not: `(col, row, foundedTurn)`
 * is one camp for its whole life, and it is announced exactly once per seat. A
 * camp burnt out and a *new* camp mustered on the same hex ten turns later is a
 * different founding and is genuinely new news, so it announces again — which is
 * the reading a player wants, because it is a new threat on ground they thought
 * they had cleared.
 */
function sightingKey(sighting: Sighting, epoch: number): string {
  return `${sighting.kind}:${sighting.col},${sighting.row}:${epoch}`;
}

/**
 * The diff engine behind the sighting toasts.
 *
 * Deliberately a **monotone set of what has been announced** rather than a diff
 * of two consecutive snapshots, and the two differ in exactly the case that
 * matters: something that leaves the current reading and comes back. A snapshot
 * diff re-fires on the return; a told-set does not. Since "told" is per seat and
 * per identity (`sightingKey`), all three rules the design asks for fall out of
 * one structure:
 *
 *   · a ruin explored ⇒ announced once, ever, to that seat;
 *   · a camp seen ⇒ announced once per camp, however often it leaves sight;
 *   · a seat sitting down ⇒ `baseline`, which files everything currently known
 *     as told without saying any of it. That is the seat-switch rule: the new
 *     seat's whole world is already-known, so the next poll speaks only about
 *     what changed *while they were playing*.
 *
 * It is pure view-layer work: nothing here writes to the state, and the state
 * has no idea it is being watched. The reading is a scan of the map's tiles plus
 * the camps array, which is one property test per tile on a board of at most a
 * few tens of thousands — cheap enough to run after every command, which is
 * where it is called from (`controls.ts`'s `commit`).
 */
export function createSightingWatcher(): SightingWatcher {
  const toldBySeat = new Map<number, Set<string>>();

  function toldFor(seatId: number): Set<string> {
    let told = toldBySeat.get(seatId);
    if (!told) {
      told = new Set<string>();
      toldBySeat.set(seatId, told);
    }
    return told;
  }

  /**
   * Everything this seat currently knows is there, each with the epoch its
   * identity is keyed by. Sites first, in map order, then camps in `state.camps`
   * order — both arrays, so two polls of one state read the same way round.
   */
  function reading(state: GameState, seatId: number): { sighting: Sighting; epoch: number }[] {
    const found: { sighting: Sighting; epoch: number }[] = [];

    for (const tile of state.map.tiles) {
      const kind = tile.discovery;
      if (!kind) continue;
      // The *ground* rule: a chart remembers a coastline, and it remembers a
      // ruin. Explored is enough — a site the seat has walked past and left
      // behind is still a site they know about.
      if (visibilityAt(state, seatId, tile.col, tile.row) === HIDDEN) continue;
      found.push({
        sighting: { kind, col: tile.col, row: tile.row, text: SIGHTING_TEXT[kind] },
        epoch: 0,
      });
    }

    for (const camp of state.camps) {
      // The *occupation* rule: a camp is a thing that is there now. Remembered
      // ground says nothing about whether it still stands, so only a seat that
      // can see the hex right now is told about it.
      if (!isVisibleTo(state, seatId, camp.col, camp.row)) continue;
      found.push({
        sighting: { kind: 'camp', col: camp.col, row: camp.row, text: SIGHTING_TEXT.camp },
        epoch: camp.foundedTurn,
      });
    }

    return found;
  }

  return {
    poll(state, seatId): Sighting[] {
      const told = toldFor(seatId);
      const fresh: Sighting[] = [];
      for (const { sighting, epoch } of reading(state, seatId)) {
        const key = sightingKey(sighting, epoch);
        if (told.has(key)) continue;
        told.add(key);
        fresh.push(sighting);
      }
      return fresh;
    },
    baseline(state, seatId): void {
      const told = toldFor(seatId);
      for (const { sighting, epoch } of reading(state, seatId)) {
        told.add(sightingKey(sighting, epoch));
      }
    },
    reset(): void {
      toldBySeat.clear();
    },
  };
}
