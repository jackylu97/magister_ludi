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
 *   3. **where it is mounted** — under the empire panel, at most four chips
 *      (three on a short window) and then "+N more", never in the top bar,
 *      and disposed through `gameDisposers` (batch UX3).
 */

import { describe, expect, it } from 'vitest';
import { uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

import { settleCampBounty } from '../../src/sim/camps';
import { runCommissions } from '../../src/sim/commissions';
import { type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { slotOrderAt, unslotOrderAt } from '../../src/sim/statecraft';
import type { OrderId } from '../../src/sim/statecraftData';
import {
  CHIP_CAP,
  FULFILLED_WORDS,
  SHORT_WINDOW_CHIP_CAP,
  SHORT_WINDOW_PX,
  capChips,
  chipCap,
  chipCountWords,
  chipName,
  chipRing,
  chipsFingerprint,
  commissionChips,
  moreWords,
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
    // The A3 face's ink and suit (batch C1): Clear the Frontier is a Dominion
    // commission, typed Wildcard on its deck's sheet; The Strongroom's deck is
    // not sorted yet, so it borrows the Wildcard ink too.
    expect(chips[0]!.ink).toBe('wildcard');
    expect(chips[0]!.suits).toEqual(['swords']);
    expect(chips[1]!.ink).toBe('wildcard');
    expect(chips[1]!.suits).toEqual(['coins']);
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

describe('the cap', () => {
  it('shows at most four chips, and three on a window under 720 px tall (spec §6 and §10)', () => {
    expect(CHIP_CAP).toBe(4);
    expect(SHORT_WINDOW_CHIP_CAP).toBe(3);
    expect(SHORT_WINDOW_PX).toBe(720);
    expect(chipCap(900)).toBe(4);
    expect(chipCap(720)).toBe(4);
    expect(chipCap(719)).toBe(3);
  });

  it('folds a fifth chip or more into one “+N more” line', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    expect(capChips(five, 4)).toEqual({ shown: ['a', 'b', 'c', 'd'], more: 1 });
    expect(capChips(five, 3)).toEqual({ shown: ['a', 'b', 'c'], more: 2 });
    expect(moreWords(2)).toBe('+2 more');
  });

  it('draws no “+N more” line at or under the cap', () => {
    expect(capChips(['a', 'b', 'c', 'd'], 4)).toEqual({ shown: ['a', 'b', 'c', 'd'], more: 0 });
    expect(capChips([], 4)).toEqual({ shown: [], more: 0 });
  });

  it('opens Statecraft from the “+N more” line, and re-reads the cap with the window’s height', () => {
    const rail = uiSource('commissionRail.ts');
    expect(rail).toContain("button.addEventListener('click', () => openAll());");
    expect(rail).toContain('const cap = chipCap(window.innerHeight);');
    expect(rail).toContain('cap === drawnCap');
    expect(uiSource('main.ts')).toContain('openAll: () => statecraft?.open(),');
  });
});

describe('where the chips live', () => {
  it('mounts the rail after the empire drawer, registers its disposer, and redraws with the HUD', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('else empireDrawerEl.after(commissionRail.root);');
    expect(main).toContain('gameDisposers.push(() => commissionRail?.dispose());');
    expect(main).toContain('commissionRail?.render();');
    expect(main).toContain('openAt: (card) => statecraft?.openAt(card),');
  });

  it('hangs under the empire panel, as wide as it, and hides with the left column', () => {
    const css = uiSource('style.css');
    const rail = css.slice(css.indexOf('\n#hud-commissions {'));
    const body = rail.slice(0, rail.indexOf('}'));
    // The panel's bottom (12px under the bar, 56 tall) plus 10px: 120px at the
    // bar's 42px.
    expect(body).toContain('top: calc(var(--topbar-h) + 12px + var(--empire-panel-h) + 10px);');
    expect(body).toContain('left: 14px;');
    expect(body).toContain('width: var(--empire-panel-w);');
    expect(css).toContain('--commission-chip-h: 38px;');
    expect(css).toContain('--commission-chip-gap: 6px;');
    expect(css).toContain('body:has(.city-mode:not([hidden])) #hud-commissions,');
    // Nothing moves down by the chips' height any more: the column below them
    // is empty.
    expect(css).not.toContain('--hud-commissions-h');
    expect(uiSource('commissionRail.ts')).not.toContain('--hud-commission-count');
  });

  it('opens each chip’s detail card to its right, 260 px wide', () => {
    const css = uiSource('style.css');
    const pop = css.slice(css.indexOf('\n.commission-pop {'));
    const body = pop.slice(0, pop.indexOf('}'));
    expect(body).toContain('left: calc(100% + 8px);');
    expect(body).toContain('width: 260px;');
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
