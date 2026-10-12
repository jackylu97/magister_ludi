/**
 * The commission chips and card counters (batch C). No jsdom in this suite
 * (see `holdingsRail.test.ts`), so the pure halves are exercised against a
 * real game and the mounting is read from the sources:
 *
 *   1. **what the chips say** — one per seated commission in chair order, the
 *      count in words, a ring that fills, "Fulfilled · reward paid" on the
 *      turn after the goal is met and nothing the turn after that, and nothing
 *      at all for a commission on the shelf;
 *   2. **the card counter** — the same counters the chip prints, and the paused
 *      note on an unseated card;
 *   3. **where it is mounted** — under the dock, above the holdings card (which
 *      moves down by the chips' height), never in the top bar, and disposed
 *      through `gameDisposers`.
 */

import { describe, expect, it } from 'vitest';
import { uiSource } from './sourceHelpers';

import { createGame } from '../../src/sim/game';
import { settleCampBounty } from '../../src/sim/camps';
import { runCommissions } from '../../src/sim/commissions';
import { type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { slotOrderAt, unslotOrderAt } from '../../src/sim/statecraft';
import type { OrderId } from '../../src/sim/statecraftData';
import {
  FULFILLED_WORDS,
  chipCountWords,
  chipName,
  chipRing,
  chipsFingerprint,
  commissionChips,
} from '../../src/ui/commissionRail';
import { STANDING_NOTE, commissionCounters, commissionStanding } from '../../src/ui/commissionGoal';
import { counterFigure } from '../../src/ui/goalCounter';
import { found } from '../sim/statecraftHelpers';

const FRONTIER = 'dominionClearTheFrontier' as OrderId;
const STRONGROOM = 'theStrongroom' as OrderId;

function solo(): GameState {
  return createGame({
    seed: 5,
    sizeName: 'duel',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    barbarians: true,
  }).state;
}

function seat(state: GameState, id: OrderId): number {
  const player = playerById(state, 0)!;
  if (!player.statecraft.orders.includes(id)) player.statecraft.orders.push(id);
  const index = player.statecraft.slots.findIndex((slot) => slot === null);
  slotOrderAt(state, player, id, index);
  bumpRevision(state);
  return index;
}

function clearCamp(state: GameState): void {
  const unit = state.units.find((u) => u.ownerId === 0)!;
  settleCampBounty(state, 0, { col: unit.col, row: unit.row });
}

describe('the chips', () => {
  it('show nothing with no commission seated', () => {
    const state = solo();
    expect(commissionChips(state, 0)).toEqual([]);
  });

  it('show one chip per seated commission, in chair order, with the count in words', () => {
    const state = solo();
    found(state, 0);
    seat(state, FRONTIER);
    seat(state, STRONGROOM);
    clearCamp(state);
    playerById(state, 0)!.gold = 500;
    const chips = commissionChips(state, 0);
    expect(chips.map((chip) => chip.card)).toEqual([FRONTIER, STRONGROOM]);
    expect(chips[0]!.name).toBe('Clear the Frontier');
    expect(chips[0]!.line).toBe('dominion');
    expect(chipCountWords(chips[0]!)).toBe('1 / 2 camps cleared');
    expect(chipRing(chips[0]!)).toBe(50);
    expect(chipCountWords(chips[1]!)).toBe('500 / 2000 gold in the treasury');
    expect(chipRing(chips[1]!)).toBe(25);
  });

  it('drop a commission taken out of its chair, whose card keeps the count', () => {
    const state = solo();
    found(state, 0);
    const index = seat(state, FRONTIER);
    clearCamp(state);
    unslotOrderAt(playerById(state, 0)!, index);
    expect(commissionChips(state, 0)).toEqual([]);
    expect(commissionStanding(state, 0, FRONTIER)).toBe('held');
    expect(commissionCounters(state, 0, FRONTIER).map(counterFigure)).toEqual(['1 / 2']);
    expect(STANDING_NOTE.held).toMatch(/^Not seated\. Progress is kept/);
  });

  it('read "Fulfilled · reward paid" the turn after the goal is met, and are gone after that', () => {
    const state = solo();
    found(state, 0);
    seat(state, FRONTIER);
    clearCamp(state);
    clearCamp(state);
    runCommissions(state);
    // The resolution has run; the turn moves on as `applyEndTurn` moves it.
    state.turn += 1;
    const chips = commissionChips(state, 0);
    expect(chips).toHaveLength(1);
    expect(chips[0]!.fulfilled).toBe(true);
    expect(chipCountWords(chips[0]!)).toBe(FULFILLED_WORDS);
    expect(FULFILLED_WORDS).toBe('Fulfilled · reward paid');
    expect(chipRing(chips[0]!)).toBe(100);
    expect(commissionStanding(state, 0, FRONTIER)).toBe('fulfilled');
    state.turn += 1;
    expect(commissionChips(state, 0)).toEqual([]);
  });

  it('fingerprint the count, the seat and the fulfilment', () => {
    const state = solo();
    found(state, 0);
    seat(state, FRONTIER);
    const before = chipsFingerprint(commissionChips(state, 0), 0);
    expect(chipsFingerprint(commissionChips(state, 0), 1)).not.toBe(before);
    clearCamp(state);
    expect(chipsFingerprint(commissionChips(state, 0), 0)).not.toBe(before);
  });

  it('strip the "Commission:" prefix from a chip’s name only', () => {
    expect(chipName('Commission: Clear the Frontier')).toBe('Clear the Frontier');
    expect(chipName('The Strongroom')).toBe('The Strongroom');
  });
});

describe('where the chips live', () => {
  it('mounts the rail under the dock, registers its disposer, and redraws with the HUD', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('else hudDockEl.after(commissionRail.root);');
    expect(main).toContain('gameDisposers.push(() => commissionRail?.dispose());');
    expect(main).toContain('commissionRail?.render();');
    expect(main).toContain('openAt: (card) => statecraft?.openAt(card),');
  });

  it('moves the holdings card down by the chips’ height and hides with the left column', () => {
    const css = uiSource('style.css');
    const holdings = css.slice(css.indexOf('#hud-holdings {'));
    expect(holdings.slice(0, holdings.indexOf('}'))).toContain('var(--hud-commissions-h)');
    expect(css).toContain('body:has(.city-mode:not([hidden])) #hud-commissions,');
  });

  it('puts nothing in the top bar', () => {
    expect(uiSource('topBar.ts')).not.toContain('commission');
  });

  it('listens only on its own chips, never on the window or the document', () => {
    const rail = uiSource('commissionRail.ts');
    expect(rail).not.toContain('window.addEventListener');
    expect(rail).not.toContain('document.addEventListener');
  });
});
