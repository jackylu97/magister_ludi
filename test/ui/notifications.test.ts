import { describe, expect, it } from 'vitest';

import { createMap, tileIndex } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
import {
  NOTIFICATION_CAP,
  type NotificationAction,
  createNotificationLog,
  createSightingWatcher,
  isActionable,
} from '../../src/ui/notifications';

/**
 * The notification channel's model half: the per-seat chronicle, and the diff
 * that turns "this seat now knows about that" into a line.
 *
 * Both are here rather than in a browser because both are ordinary data
 * structures with one interesting property each, and in both cases the failure
 * is silent. A log that miscounts unread entries shows a badge that lies; a diff
 * that re-fires shows the player the same camp every time a patrol wanders past
 * it, which is exactly the kind of thing that is charming for one turn and
 * unusable for fifty. `src/ui/notifications.ts` takes no DOM for that reason —
 * the same bargain `saves.ts` strikes with its storage.
 *
 * Four claims, kept apart because they fail for different reasons:
 *
 *   1. **The log is per seat, newest-first, capped, and counts unread.** A seat
 *      is only ever shown what that seat was shown (the hot-seat rule).
 *   2. **A sighting fires once.** Ruins and villages by hex; camps by *camp*,
 *      which is `(hex, foundedTurn)` — the appearance-epoch rule, and the whole
 *      reason the watcher keeps a told-set rather than diffing two snapshots.
 *   3. **The two fog rules are not interchangeable.** A ruin survives on
 *      remembered ground; a camp needs to be visible *now*. Same split as
 *      `sites3d.ts`, asked of the same helpers.
 *   4. **Sitting down is silent.** A baseline files everything as already-told
 *      and emits nothing, so a seat switch never opens with a toast storm.
 */

/** Sixteen by eight of flat grassland, two seats, nothing on it and nothing seen. */
function flatState(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 8, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  // The board was replaced under this state; the grids were sized for the old
  // one, and with no units left there is nothing to flood from. See
  // `resetVisibility`.
  resetVisibility(state);
  return state;
}

/** Sets one seat's level for one hex, without inventing a unit to justify it. */
function see(state: GameState, seatId: number, col: number, row: number, level: number): void {
  state.visibility[seatId]![tileIndex(state.map, col, row)] = level;
}

/** Puts a site on a hex. `undefined` takes it off, as a claim does. */
function site(state: GameState, col: number, row: number, kind: 'ruins' | 'village' | null): void {
  const tile = state.map.tiles[tileIndex(state.map, col, row)]!;
  if (kind === null) delete tile.discovery;
  else tile.discovery = kind;
}

describe('the chronicle', () => {
  it('reads newest first', () => {
    const log = createNotificationLog();
    log.push(0, { turn: 1, text: 'first' });
    log.push(0, { turn: 2, text: 'second' });
    log.push(0, { turn: 3, text: 'third' });
    expect(log.entries(0).map((entry) => entry.text)).toEqual(['third', 'second', 'first']);
  });

  it('keeps an action on the entries that carry one, and nothing on the rest', () => {
    const log = createNotificationLog();
    log.push(0, {
      turn: 4,
      text: 'Bought a tile for Uruk',
      action: { kind: 'pan', cell: { col: 3, row: 5 } },
    });
    log.push(0, { turn: 4, text: 'Your people murmur.' });
    const [murmur, bought] = log.entries(0);
    expect(murmur?.action).toBeUndefined();
    expect(bought?.action).toEqual({ kind: 'pan', cell: { col: 3, row: 5 } });
  });

  it('drops the oldest past the cap', () => {
    const log = createNotificationLog({ cap: 3 });
    for (let i = 1; i <= 5; i++) log.push(0, { turn: i, text: `line ${i}` });
    expect(log.entries(0).map((entry) => entry.text)).toEqual(['line 5', 'line 4', 'line 3']);
  });

  it('defaults to the shipped cap', () => {
    const log = createNotificationLog();
    expect(log.cap).toBe(NOTIFICATION_CAP);
    for (let i = 0; i < NOTIFICATION_CAP + 20; i++) log.push(0, { turn: 1, text: `l${i}` });
    expect(log.entries(0)).toHaveLength(NOTIFICATION_CAP);
  });

  it('counts unread since the last open, and stops at zero on open', () => {
    const log = createNotificationLog();
    expect(log.unread(0)).toBe(0);
    log.push(0, { turn: 1, text: 'a' });
    log.push(0, { turn: 1, text: 'b' });
    expect(log.unread(0)).toBe(2);
    log.markRead(0);
    expect(log.unread(0)).toBe(0);
    log.push(0, { turn: 2, text: 'c' });
    expect(log.unread(0)).toBe(1);
    // The entries are still all there: reading is not forgetting.
    expect(log.entries(0)).toHaveLength(3);
  });

  it('never claims more unread than it still holds', () => {
    const log = createNotificationLog({ cap: 3 });
    for (let i = 0; i < 10; i++) log.push(0, { turn: 1, text: `l${i}` });
    expect(log.unread(0)).toBe(3);
  });

  it('keeps one log per seat', () => {
    const log = createNotificationLog();
    log.push(0, { turn: 1, text: 'mine' });
    log.push(1, { turn: 1, text: 'theirs' });
    log.push(1, { turn: 1, text: 'theirs again' });
    expect(log.entries(0).map((entry) => entry.text)).toEqual(['mine']);
    expect(log.entries(1).map((entry) => entry.text)).toEqual(['theirs again', 'theirs']);
    expect(log.unread(0)).toBe(1);
    expect(log.unread(1)).toBe(2);
    // And reading one seat's does not read the other's.
    log.markRead(1);
    expect(log.unread(0)).toBe(1);
    expect(log.unread(1)).toBe(0);
  });

  it('empties every seat on a new game', () => {
    const log = createNotificationLog();
    log.push(0, { turn: 1, text: 'a' });
    log.push(1, { turn: 1, text: 'b' });
    log.clear();
    expect(log.entries(0)).toHaveLength(0);
    expect(log.entries(1)).toHaveLength(0);
    expect(log.unread(0)).toBe(0);
    expect(log.unread(1)).toBe(0);
  });

  it('answers for a seat that has never been written to', () => {
    const log = createNotificationLog();
    expect(log.entries(7)).toEqual([]);
    expect(log.unread(7)).toBe(0);
  });
});

describe('a notification action', () => {
  /**
   * A compile-time pin on `NotificationAction`, not a runtime assertion: if a
   * second kind is ever added to the union without a case here, this function
   * stops compiling. That is `main.ts`'s `runAction` in miniature — the same
   * `never`-typed default the reducer's own exhaustiveness check uses
   * (`sim/commands.ts`, `unhandledCommand`) — kept here so the union's shape is
   * pinned in the one suite that already owns it, rather than only where it is
   * consumed.
   */
  function describeKind(action: NotificationAction): string {
    // Aliased-discriminant idiom, matching `sim/commands.ts`'s `applyCommand`
    // and `main.ts`'s `runAction`: switching on `kind` still narrows `action`
    // in each case, and leaves `kind` as the `never` the default needs.
    const kind = action.kind;
    switch (kind) {
      case 'pan':
        return `pan to ${action.cell.col},${action.cell.row}`;
      case 'openStatecraft':
        return 'open Statecraft';
      case 'openGreatPerson':
        return 'open the great person offer';
      default: {
        const unhandled: never = kind;
        return unhandled;
      }
    }
  }

  it('is a pan for now, and carries the cell it pans to', () => {
    const action: NotificationAction = { kind: 'pan', cell: { col: 2, row: 9 } };
    expect(describeKind(action)).toBe('pan to 2,9');
  });

  it('is also an openStatecraft, which carries no cell', () => {
    const action: NotificationAction = { kind: 'openStatecraft' };
    expect(describeKind(action)).toBe('open Statecraft');
  });

  it('is also an openGreatPerson, which carries no cell either', () => {
    const action: NotificationAction = { kind: 'openGreatPerson' };
    expect(describeKind(action)).toBe('open the great person offer');
  });

  describe('isActionable', () => {
    it('needs both an action on the entry and a handler for it', () => {
      const withAction = {
        turn: 1,
        text: 'x',
        action: { kind: 'pan' as const, cell: { col: 0, row: 0 } },
      };
      const withoutAction = { turn: 1, text: 'x' };
      expect(isActionable(withAction, true)).toBe(true);
      // An entry with somewhere to go, but nobody to take it there (the frozen
      // 2D renderers' case, `toasts.ts`'s docblock) — still not a button.
      expect(isActionable(withAction, false)).toBe(false);
      // Plain news never becomes a button, handler or not.
      expect(isActionable(withoutAction, true)).toBe(false);
      expect(isActionable(withoutAction, false)).toBe(false);
    });
  });
});

describe('sighting a site', () => {
  it('announces a ruin the seat has explored, once', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    see(state, 0, 4, 4, VISIBLE);
    const watcher = createSightingWatcher();

    const first = watcher.poll(state, 0);
    expect(first).toEqual([
      { kind: 'ruins', col: 4, row: 4, text: 'You sight ancient ruins.' },
    ]);
    expect(watcher.poll(state, 0)).toEqual([]);
  });

  it('gives a village its own line', () => {
    const state = flatState();
    site(state, 2, 2, 'village');
    see(state, 0, 2, 2, VISIBLE);
    expect(createSightingWatcher().poll(state, 0)).toEqual([
      { kind: 'village', col: 2, row: 2, text: 'You sight a tribal village.' },
    ]);
  });

  it('says nothing about ground nobody has charted', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    expect(createSightingWatcher().poll(state, 0)).toEqual([]);
  });

  it('follows the GROUND rule: remembered is enough', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    // The scout walked past and moved on. A chart keeps a ruin the way it keeps
    // a coastline — see the two fog rules in `sites3d.ts`.
    see(state, 0, 4, 4, EXPLORED);
    expect(createSightingWatcher().poll(state, 0)).toHaveLength(1);
  });

  it('does not re-announce a ruin that has been claimed away', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    see(state, 0, 4, 4, VISIBLE);
    const watcher = createSightingWatcher();
    expect(watcher.poll(state, 0)).toHaveLength(1);
    // `claimDiscoveryAt`'s effect: the field is removed, and it can only ever be
    // removed (CLAUDE.md's trap).
    site(state, 4, 4, null);
    expect(watcher.poll(state, 0)).toEqual([]);
  });

  it('tells each seat about its own world', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    see(state, 0, 4, 4, VISIBLE);
    const watcher = createSightingWatcher();

    expect(watcher.poll(state, 0)).toHaveLength(1);
    // Seat 1 has seen nothing there, so it is told nothing.
    expect(watcher.poll(state, 1)).toEqual([]);
    // …until it does, at which point it gets the line seat 0 already had.
    see(state, 1, 4, 4, VISIBLE);
    expect(watcher.poll(state, 1)).toHaveLength(1);
  });
});

describe('sighting a camp', () => {
  it('follows the OCCUPATION rule: currently visible, never remembered', () => {
    const state = flatState();
    state.camps.push({ col: 6, row: 3, foundedTurn: 10 });
    see(state, 0, 6, 3, EXPLORED);
    const watcher = createSightingWatcher();
    // Remembered ground says nothing about whether the camp still stands, so a
    // seat that merely charted this hex is not told there is a camp on it.
    expect(watcher.poll(state, 0)).toEqual([]);

    see(state, 0, 6, 3, VISIBLE);
    expect(watcher.poll(state, 0)).toEqual([
      { kind: 'camp', col: 6, row: 3, text: 'A barbarian camp menaces the frontier.' },
    ]);
  });

  it('does not fire again when the same camp leaves sight and comes back', () => {
    const state = flatState();
    state.camps.push({ col: 6, row: 3, foundedTurn: 10 });
    see(state, 0, 6, 3, VISIBLE);
    const watcher = createSightingWatcher();
    expect(watcher.poll(state, 0)).toHaveLength(1);

    // The patrol wanders off; the hex falls back to remembered.
    see(state, 0, 6, 3, EXPLORED);
    expect(watcher.poll(state, 0)).toEqual([]);
    // And comes back. Same camp, same news, already told.
    see(state, 0, 6, 3, VISIBLE);
    expect(watcher.poll(state, 0)).toEqual([]);
  });

  it('fires for a DIFFERENT camp mustered on the same hex', () => {
    const state = flatState();
    state.camps.push({ col: 6, row: 3, foundedTurn: 10 });
    see(state, 0, 6, 3, VISIBLE);
    const watcher = createSightingWatcher();
    expect(watcher.poll(state, 0)).toHaveLength(1);

    // Burnt out (`removeCampAt`), and the wild musters again on the same ground
    // twenty turns later. That is a new threat on ground the player thought they
    // had cleared, and it is keyed by its founding turn, so it is news.
    state.camps = [{ col: 6, row: 3, foundedTurn: 30 }];
    expect(watcher.poll(state, 0)).toEqual([
      { kind: 'camp', col: 6, row: 3, text: 'A barbarian camp menaces the frontier.' },
    ]);
  });

  it('reads camps and sites in one pass, sites first', () => {
    const state = flatState();
    site(state, 1, 1, 'ruins');
    state.camps.push({ col: 6, row: 3, foundedTurn: 10 });
    see(state, 0, 1, 1, VISIBLE);
    see(state, 0, 6, 3, VISIBLE);
    // Map order then camp order — arrays, so two polls of one state read the
    // same way round (hard rule 2's habit, applied to a view-layer list).
    expect(createSightingWatcher().poll(state, 0).map((s) => s.kind)).toEqual(['ruins', 'camp']);
  });
});

describe('sitting down at a seat', () => {
  it('files everything currently known and says none of it', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    state.camps.push({ col: 6, row: 3, foundedTurn: 10 });
    see(state, 0, 4, 4, VISIBLE);
    see(state, 0, 6, 3, VISIBLE);

    const watcher = createSightingWatcher();
    // `baseline` returns nothing at all — it is not a poll whose result is
    // discarded, it is the silent half of the same reading.
    expect(watcher.baseline(state, 0)).toBeUndefined();
    expect(watcher.poll(state, 0)).toEqual([]);
  });

  it('still reports what changes after the baseline', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    see(state, 0, 4, 4, VISIBLE);
    const watcher = createSightingWatcher();
    watcher.baseline(state, 0);

    site(state, 9, 5, 'village');
    see(state, 0, 9, 5, VISIBLE);
    expect(watcher.poll(state, 0)).toEqual([
      { kind: 'village', col: 9, row: 5, text: 'You sight a tribal village.' },
    ]);
  });

  it('baselines one seat without silencing the other', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    see(state, 0, 4, 4, VISIBLE);
    see(state, 1, 4, 4, VISIBLE);
    const watcher = createSightingWatcher();
    watcher.baseline(state, 0);
    expect(watcher.poll(state, 0)).toEqual([]);
    expect(watcher.poll(state, 1)).toHaveLength(1);
  });

  it('forgets every seat on a new game', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    see(state, 0, 4, 4, VISIBLE);
    const watcher = createSightingWatcher();
    expect(watcher.poll(state, 0)).toHaveLength(1);

    // A new game, or a loaded one: nobody has been told anything about this
    // world. `controls.refresh` resets and immediately re-baselines, which is
    // why the *shipped* behaviour is still silence — but the reset itself has to
    // genuinely forget, or a second game on the same seed would open mute.
    watcher.reset();
    expect(watcher.poll(state, 0)).toHaveLength(1);
  });

  it('treats a hex nobody has charted as hidden, for any seat id', () => {
    const state = flatState();
    site(state, 4, 4, 'ruins');
    see(state, 0, 4, 4, HIDDEN);
    const watcher = createSightingWatcher();
    expect(watcher.poll(state, 0)).toEqual([]);
    // A seat that does not exist has no grid, and `visibilityAt` answers hidden
    // rather than throwing — the honest answer, and the one that keeps this a
    // pure read.
    expect(watcher.poll(state, 99)).toEqual([]);
  });
});
