/**
 * **The totals line of the Council screen, and the change a held card would
 * make** (`src/ui/councilTotals.ts`), read off a real board.
 *
 * Since stage 2 the totals are the whole council's impact list, folded
 * (`explainCouncil`), and a plate is a share of them (`councilPlate`). The
 * sweep over the card data is `councilFigures.test.ts`; these check the small
 * readings themselves: nine whole figures in the board's order, no change
 * between an arrangement and itself, a state left exactly as it was, and the
 * government's plate read by the same method as every other card's.
 */
import { describe, expect, it } from 'vitest';

import { snapshotState } from '../../src/sim/game';
import { bumpRevision, playerById } from '../../src/sim/state';
import { COUNCIL_VOICES, councilChange, councilFigures, explainCouncil, foldImpactVoices } from '../../src/ui/councilTotals';
import { governmentLive } from '../../src/ui/orderLive';
import { stage } from '../../src/ui/statecraftStaging';
import { found, game } from '../sim/statecraftHelpers';

describe('the totals line of the Council screen', () => {
  it('reads nine whole figures off a real board, in the board’s order, renown last', () => {
    const g = game();
    const figures = councilFigures(foldImpactVoices(explainCouncil(g.state, 0)));
    expect(Object.keys(figures)).toEqual([...COUNCIL_VOICES]);
    expect(COUNCIL_VOICES[COUNCIL_VOICES.length - 1]).toBe('renown');
    for (const voice of COUNCIL_VOICES) expect(Number.isInteger(figures[voice]), voice).toBe(true);
  });

  it('rounds each figure once, as the line prints it', () => {
    const exact = { food: 12.5, production: 2.4, gold: -3.5, science: 0, culture: 7.49, faith: 0, happiness: 1.6, authority: 0, renown: 4.6 };
    expect(councilFigures(exact)).toEqual({ food: 13, production: 2, gold: -4, science: 0, culture: 7, faith: 0, happiness: 2, authority: 0, renown: 5 });
  });

  it('finds no change between an arrangement and itself, and leaves the state as it was', () => {
    const g = game();
    const before = snapshotState(g.state);
    const slots = stage(playerById(g.state, 0)!.statecraft.slots);
    const change = councilChange(g.state, 0, slots, slots);
    for (const voice of COUNCIL_VOICES) expect(change[voice], voice).toBe(0);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('reads the government’s plate with its law set aside, as a share of the totals', () => {
    const g = game();
    found(g.state, 0);
    playerById(g.state, 0)!.statecraft.government = 'tyranny';
    bumpRevision(g.state);
    const council = foldImpactVoices(explainCouncil(g.state, 0));
    const live = governmentLive(g.state, 0, 'tyranny', undefined, council);
    // Tyranny's law is +5 authority capacity.
    expect(live.plate?.kind).toBe('pays');
    if (live.plate?.kind === 'pays') expect(live.plate.figures).toContainEqual({ voice: 'authority', amount: 5 });
  });
});
