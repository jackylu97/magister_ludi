/**
 * `openingFocus` — the boot camera's pure half (2026-08-30, the boot-camera
 * ruling). No renderer, no DOM: it is asked what cell a fresh game's opening
 * camera should look at, and answers with a `CellRef`.
 */

import { describe, expect, it } from 'vitest';

import { createGame } from '../../src/sim/game';
import type { GameState } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { openingFocus } from '../../src/ui/openingFocus';

function freshState(): GameState {
  const game = createGame({
    seed: 20260830,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Blaise', color: '#2e6ad4', isHuman: true },
    ],
  });
  return game.state;
}

describe('openingFocus', () => {
  it('picks the seat’s founder — the settler, not just any unit', () => {
    const state = freshState();
    const founder = state.units.find(
      (unit) => unit.ownerId === 0 && unitDef(unit.type).foundsCity,
    );
    expect(founder).toBeDefined();

    const focus = openingFocus(state, 0);
    expect(focus).toEqual({ col: founder!.col, row: founder!.row });
  });

  it('answers the same for the other seat, off its own founder', () => {
    const state = freshState();
    const founder = state.units.find(
      (unit) => unit.ownerId === 1 && unitDef(unit.type).foundsCity,
    );
    expect(founder).toBeDefined();

    const focus = openingFocus(state, 1);
    expect(focus).toEqual({ col: founder!.col, row: founder!.row });
  });

  it('falls back to the seat’s first unit when none founds a city', () => {
    const state = freshState();
    // A hand-built state where the seat's only unit cannot found a city —
    // exactly what a scenario with no settler would leave behind.
    const stripped: GameState = {
      ...state,
      units: state.units
        .filter((unit) => unit.ownerId === 0)
        .filter((unit) => !unitDef(unit.type).foundsCity)
        .map((unit, index) => ({ ...unit, col: 5 + index, row: 5 })),
    };
    expect(stripped.units.length).toBeGreaterThan(0);

    const focus = openingFocus(stripped, 0);
    expect(focus).toEqual({ col: stripped.units[0].col, row: stripped.units[0].row });
  });

  it('falls back to the map centre for a seat with no units at all', () => {
    const state = freshState();
    const empty: GameState = { ...state, units: [] };
    const focus = openingFocus(empty, 0);
    expect(focus).toEqual({
      col: Math.floor(state.map.width / 2),
      row: Math.floor(state.map.height / 2),
    });
  });
});
