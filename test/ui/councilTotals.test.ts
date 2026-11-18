/**
 * **The totals line of the Council screen, and the change a held card would
 * make** (`src/ui/councilTotals.ts`; stage 1 of the Council and In play board,
 * frames N4 and CH), read off a real board.
 *
 * The source pins (the head reads `foldDeck`, the change is measured once per
 * chair) are in `ordersScreen.test.ts`. These check the readings themselves:
 * eight whole figures in the board's order, no change between an arrangement
 * and itself, and a state left exactly as it was.
 */
import { describe, expect, it } from 'vitest';

import { playerById } from '../../src/sim/state';
import { COUNCIL_VOICES, councilChange, councilFigures, foldDeckMeters, governmentPays } from '../../src/ui/councilTotals';
import { foldDeck } from '../../src/ui/ledgerScreen';
import { stage } from '../../src/ui/statecraftStaging';
import { game } from '../sim/statecraftHelpers';

describe('the totals line of the Council screen', () => {
  it('reads eight whole figures off a real board, in the board’s order', () => {
    const g = game();
    const figures = councilFigures(foldDeck(g.state, 0), foldDeckMeters(g.state, 0));
    expect(Object.keys(figures)).toEqual([...COUNCIL_VOICES]);
    for (const voice of COUNCIL_VOICES) expect(Number.isInteger(figures[voice]), voice).toBe(true);
  });

  it('finds no change between an arrangement and itself, and leaves the state as it was', () => {
    const g = game();
    const before = JSON.stringify(g.state);
    const slots = stage(playerById(g.state, 0)!.statecraft.slots);
    const change = councilChange(g.state, 0, slots, slots);
    for (const voice of COUNCIL_VOICES) expect(change[voice], voice).toBe(0);
    expect(JSON.stringify(g.state)).toBe(before);
  });

  it('reads the government’s own pay as figures, each in one voice and never a nought', () => {
    const g = game();
    for (const figure of governmentPays(g.state, 0)) {
      expect(COUNCIL_VOICES).toContain(figure.voice);
      expect(figure.amount).not.toBe(0);
    }
  });
});
