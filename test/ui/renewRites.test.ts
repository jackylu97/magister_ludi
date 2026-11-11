/**
 * **End Turn's "Renew rites" prompt** (batch RT1, `docs/flags.md` (jjjjjjj)).
 *
 * The user: *"lets instead have a blocking 'renew rites' message in the 'end
 * turn' button that opens the rites menu when clicked; happens when a rite
 * expires. disappears after closing the faith menu (player doesn't have to
 * renew)."* No rite renews by itself.
 *
 * What this file checks:
 *
 *   1. **When it appears.** A rite in one of the seat's towns ended at the last
 *      turn change (`ritesEndedAt`, `src/sim/religion.ts`). The turn change is
 *      a real `endTurn`, so the check also covers the broom: the ended entry is
 *      still in `City.timed` on the next turn.
 *   2. **When it does not.** While the rite runs; for a rite that acts at once
 *      (the Votive Offering, the Restoring of the Host); in a town that has
 *      already started another rite; and on any later turn for the same expiry.
 *   3. **When it goes away.** Closing the faith screen answers it for the rest
 *      of the turn (`faithClosedOnTurn`). A new expiry on a later turn raises it
 *      again.
 *   4. **What a press does, and what closing does.** There is no document in
 *      this suite, so the wiring is read off the source: the press opens the
 *      faith screen on its Rites tab with the town in view, and a close of that
 *      screen reaches `noteFaithScreenClosed`.
 *   5. **The bot passes it**, and a headless seat still ends its turn.
 */

import { describe, expect, it } from 'vitest';

import { nextBotDecision } from '../../src/ai/bot';
import { driveSeat } from '../../src/ai/driver';
import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { createMap, getTileAt } from '../../src/sim/map';
import { cityRites, riteTimedEntries, ritesEndedAt } from '../../src/sim/religion';
import type { RiteId } from '../../src/sim/religionData';
import { type City, type GameState, bumpRevision } from '../../src/sim/state';
import { availableTechs } from '../../src/sim/tech';
import { resetVisibility } from '../../src/sim/visibility';
import { END_TURN_LABELS } from '../../src/ui/endTurnList';
import { allBlockers, firstBlocker } from '../../src/ui/turnBlockers';
import { createGame, newGame } from '../sim/newGameHelpers';
import { braceBody, uiSource } from './sourceHelpers';

// --- the board -------------------------------------------------------------------

/**
 * Two seats on a blank grassland board, each with one town that is building a
 * project (a project never leaves the queue, so no production prompt appears)
 * and each researching something.
 */
function board(): { state: GameState; home: City; rival: City } {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  const home = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
  const rival = foundCityAt(state, 1, getTileAt(state.map, 11, 7)!);
  for (const city of [home, rival]) city.queue = [{ kind: 'project', id: 'tithes' }];
  for (const player of state.players) {
    player.researching = availableTechs(state, player.id)[0] ?? null;
  }
  bumpRevision(state);
  return { state, home, rival };
}

/**
 * Hangs a rite on a town that ends at the next turn change: the entries the
 * stamp itself would write (`riteTimedEntries`), with the expiry brought in.
 */
function keepUntilNextTurn(state: GameState, city: City, rite: RiteId): void {
  const entries = riteTimedEntries(state, city.ownerId, rite)!;
  expect(entries.length, rite).toBeGreaterThan(0);
  for (const entry of entries) entry.expiresTurn = state.turn + 1;
  city.timed = [...(city.timed ?? []), ...entries];
  bumpRevision(state);
}

/** Ends the turn for both seats, so the phases run and the turn number moves. */
function nextTurn(state: GameState): void {
  for (const player of state.players) {
    expect(applyCommand(state, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
  }
}

/** The "Renew rites" item in this seat's list, if there is one. */
function renewItem(state: GameState, seat: number, faithClosedOnTurn?: number) {
  return allBlockers(state, seat, { faithClosedOnTurn }).find((item) => item.kind === 'renewRites');
}

// --- 1 · when it appears ------------------------------------------------------------

describe('Renew rites · when it appears', () => {
  it('is quiet while the rite runs, and rises the turn after it ends, naming the town', () => {
    const { state, home } = board();
    keepUntilNextTurn(state, home, 'riteOfTheHarvest');
    expect(cityRites(state, home)).toEqual(['riteOfTheHarvest']);
    expect(renewItem(state, 0)).toBeUndefined();

    const turn = state.turn;
    nextTurn(state);
    expect(state.turn).toBe(turn + 1);
    // The rite has stopped, and its entry is still on the town for this turn.
    expect(cityRites(state, home)).toEqual([]);
    expect(ritesEndedAt(state, home)).toEqual(['riteOfTheHarvest']);
    expect(renewItem(state, 0)).toEqual({ kind: 'renewRites', cityId: home.id });
  });

  it('is the seat’s own: a rival’s ended rite raises nothing here', () => {
    const { state, rival } = board();
    keepUntilNextTurn(state, rival, 'riteOfTheHarvest');
    nextTurn(state);
    expect(renewItem(state, 0)).toBeUndefined();
    expect(renewItem(state, 1)).toEqual({ kind: 'renewRites', cityId: rival.id });
  });

  it('is labelled "Renew rites", like the other blockers', () => {
    expect(END_TURN_LABELS.renewRites).toBe('Renew rites');
  });

  it('stands last, behind everything else the turn asks for', () => {
    const { state, home } = board();
    keepUntilNextTurn(state, home, 'riteOfTheHarvest');
    nextTurn(state);
    state.players[0]!.researching = null;
    home.queue = [];
    bumpRevision(state);
    const kinds = allBlockers(state, 0).map((item) => item.kind);
    expect(kinds[kinds.length - 1]).toBe('renewRites');
    expect(kinds).toContain('research');
    expect(kinds).toContain('cityProduction');
    expect(firstBlocker(state, 0)?.kind).not.toBe('renewRites');
  });
});

// --- 2 · when it does not ------------------------------------------------------------

describe('Renew rites · when it stays quiet', () => {
  it('never rises for a rite that acts at once: the Votive Offering and the Restoring of the Host', () => {
    for (const rite of ['votiveOffering', 'restoringOfTheHost'] as const) {
      const { state, home } = board();
      keepUntilNextTurn(state, home, rite);
      expect(cityRites(state, home), rite).toEqual([rite]);
      nextTurn(state);
      expect(ritesEndedAt(state, home), rite).toEqual([]);
      expect(renewItem(state, 0), rite).toBeUndefined();
    }
  });

  it('is quiet in a town that has started another rite since', () => {
    const { state, home } = board();
    keepUntilNextTurn(state, home, 'riteOfTheHarvest');
    nextTurn(state);
    expect(renewItem(state, 0)).toBeDefined();
    // The player starts a rite from the city screen: the town's one place is
    // taken again, so there is nothing to renew.
    const entries = riteTimedEntries(state, 0, 'riteOfTheHarvest')!;
    home.timed = [...(home.timed ?? []), ...entries];
    bumpRevision(state);
    expect(ritesEndedAt(state, home)).toEqual([]);
    expect(renewItem(state, 0)).toBeUndefined();
  });

  it('does not come back for the same expiry on a later turn', () => {
    const { state, home } = board();
    keepUntilNextTurn(state, home, 'riteOfTheHarvest');
    nextTurn(state);
    expect(renewItem(state, 0)).toBeDefined();
    // The player ends the turn without opening the faith screen at all.
    nextTurn(state);
    expect(ritesEndedAt(state, home)).toEqual([]);
    expect(renewItem(state, 0)).toBeUndefined();
  });
});

// --- 3 · when it goes away ------------------------------------------------------------

describe('Renew rites · closing the faith screen answers it', () => {
  it('is answered for the rest of the turn the faith screen was closed on', () => {
    const { state, home } = board();
    keepUntilNextTurn(state, home, 'riteOfTheHarvest');
    nextTurn(state);
    expect(renewItem(state, 0)).toBeDefined();
    // Closed with no rite started: the player does not have to renew.
    expect(renewItem(state, 0, state.turn)).toBeUndefined();
    expect(firstBlocker(state, 0, { faithClosedOnTurn: state.turn })).toBeNull();
  });

  it('rises again for a new expiry on a later turn, though the screen was closed before', () => {
    const { state, home } = board();
    keepUntilNextTurn(state, home, 'riteOfTheHarvest');
    nextTurn(state);
    const closedOn = state.turn;
    expect(renewItem(state, 0, closedOn)).toBeUndefined();
    // A second rite, started this turn, ends at the next turn change.
    keepUntilNextTurn(state, home, 'riteOfPlenty');
    nextTurn(state);
    expect(renewItem(state, 0, closedOn)).toEqual({ kind: 'renewRites', cityId: home.id });
  });
});

// --- 4 · the wiring ------------------------------------------------------------------

describe('Renew rites · the press and the close', () => {
  const controls = uiSource('controls.ts');
  const main = uiSource('main.ts');
  const faith = uiSource('religionScreen.ts');

  it('opens the faith screen on its Rites tab, with the town whose rite ended in view', () => {
    const focus = braceBody(controls, 'function focusBlocker(blocker: TurnBlocker): void {');
    const arm = focus.slice(focus.indexOf("case 'renewRites':"));
    expect(arm).toContain('onOpenRites?.(blocker.cityId)');
    expect(main).toContain('onOpenRites: (cityId) => religion?.openRitesFor(cityId)');
    // `openRitesFor` is the city screen's way in: it chooses the Rites tab and
    // brings the town's row into view.
    const open = braceBody(faith, 'openRitesFor(cityId: number): void {');
    expect(open).toContain("chooseFaithTab(seat, 'rites')");
    expect(open).toContain('pendingTown = cityId');
  });

  it('tells the board when the faith screen closes, and End Turn reads it', () => {
    // The sheet's shell runs `onClose` on every genuine close: ×, Escape, or a
    // press on the ground (`modalShell.ts`).
    const shell = faith.slice(faith.indexOf('const shell = createModalShell({'));
    expect(shell).toContain('options.onClose?.()');
    expect(main).toContain('onClose: () => controls.noteFaithScreenClosed()');
    const note = braceBody(controls, 'function noteFaithScreenClosed(): void {');
    expect(note).toContain('faithClosedTurns.set(localPlayerId, getGame().state.turn)');
    expect(note).toContain('repaint()');
    for (const reader of ['function endTurnBlocker(): TurnBlocker | null {', 'function endTurnBlockers(): TurnBlocker[] {']) {
      expect(braceBody(controls, reader), reader).toContain('faithClosedOnTurn: faithClosedTurns.get(localPlayerId)');
    }
  });
});

// --- 5 · the bot ---------------------------------------------------------------------

describe('Renew rites · the bot', () => {
  it('passes it without starting a rite, and its seat still ends the turn', () => {
    const game = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#d4502e' },
        { name: 'Teal', color: '#1f8a85' },
      ],
      barbarians: false,
    });
    const { state } = game;
    const settler = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'settler')!;
    const town = foundCityAt(state, 0, getTileAt(state.map, settler.col, settler.row)!);
    state.units = state.units.filter((unit) => unit.id !== settler.id);
    // A rite that ended at the last turn change: the reading is the comparison,
    // so the entry's expiry is this turn.
    const entries = riteTimedEntries(state, 0, 'riteOfTheHarvest')!;
    for (const entry of entries) entry.expiresTurn = state.turn;
    town.timed = entries;
    // No faith, so the bot's own spending cannot start a rite either.
    state.players[0]!.faithPool = 0;
    bumpRevision(state);
    const listed = allBlockers(state, 0);
    expect(listed[listed.length - 1]).toEqual({ kind: 'renewRites', cityId: town.id });

    // With nothing else owed, the prompt is the first blocker and the bot's
    // answer to it is to act on nothing it asks for.
    const alone = structuredClone(state);
    alone.units = alone.units.filter((unit) => unit.ownerId !== 0);
    const home = alone.cities.find((city) => city.id === town.id)!;
    home.queue = [{ kind: 'project', id: 'tithes' }];
    alone.players[0]!.researching = availableTechs(alone, 0)[0] ?? null;
    bumpRevision(alone);
    expect(firstBlocker(alone, 0)).toEqual({ kind: 'renewRites', cityId: town.id });
    expect(nextBotDecision(alone, 0)?.command.type).not.toBe('performRite');

    // And the whole seat, driven as the game drives it: it answers its units
    // and its town, sends no rite, and ends the turn.
    const before = game.log.length;
    const report = driveSeat(game, 0, { warn: () => {} });
    expect(report.ended).toBe(true);
    const sent = game.log.slice(before).map((command) => command.type);
    expect(sent[sent.length - 1]).toBe('endTurn');
    expect(sent).not.toContain('performRite');
  });
});
