/**
 * **The In play screen's pieces and figures** (stage 3 of the Council and In
 * play board, `docs/plans/ui-critique-2026-10-16.md`, from "Two tabs" to "The
 * Council and In play board is approved"). Core tier, on a short game dressed
 * with one piece of every kind (`inPlayHelpers.ts`). The slow file plays a long
 * game and checks every piece the bots come to hold.
 */

import { describe, expect, it } from 'vitest';

import { cardImpactWorlds } from '../../src/sim/cardImpact';
import { isTechId } from '../../src/sim/techData';
import { authorityOf, happinessOf } from '../../src/sim/meters';
import { readEmpire } from '../../src/sim/readings';
import {
  IN_PLAY_STACKS,
  allPieces,
  arrivalsOnTop,
  createInPlayArrivals,
  inPlayCount,
  inPlayLayout,
  readInPlay,
  roundToTotal,
  stackPieces,
} from '../../src/ui/inPlayPieces';
import {
  booksAgainstStamp,
  dressedBoard,
  inPlayGame,
  missingFromInPlay,
  sheetSums,
  totalsWithoutGap,
} from './inPlayHelpers';

const board = (): ReturnType<typeof dressedBoard> => dressedBoard(inPlayGame(30));

describe('what is in each stack comes from the rules’ own walk', () => {
  it('places every entry of the walk on the screen, or it is a technology', () => {
    const state = board();
    for (const player of state.players) {
      if (player.leader === undefined) continue;
      expect(missingFromInPlay(state, player.id), `seat ${player.id}`).toEqual([]);
    }
  });

  it('lays out five stacks, the crest and the government column, with one of every piece', () => {
    const layout = inPlayLayout(board(), 0);
    expect(layout.stacks.map((stack) => stack.id)).toEqual([...IN_PLAY_STACKS]);
    const forms = new Set(layout.stacks.flatMap((stack) => stack.entries.map((entry) => entry.form)));
    for (const form of ['wonder', 'belief', 'legacy', 'timed', 'malice']) expect(forms, form).toContain(form);
    expect(layout.crest).toHaveLength(2);
    expect(layout.leader).toBe('Pachacuti');
    expect(layout.government[0]!.form).toBe('government');
  });

  it('never makes a technology a piece', () => {
    const layout = inPlayLayout(board(), 0);
    const cards = [...layout.government, ...layout.crest, ...layout.stacks.flatMap((stack) => stack.entries)].map((entry) => entry.card);
    expect(cards.filter((card) => card !== null && isTechId(card))).toEqual([]);
  });

  it('puts the temporary piece that ends first on top, with the turn it ends on', () => {
    const temporary = inPlayLayout(board(), 0).stacks.find((stack) => stack.id === 'temporary')!.entries;
    expect(temporary.length).toBeGreaterThanOrEqual(2);
    const ends = temporary.map((entry) => entry.endsTurn!);
    expect(ends).toEqual([...ends].sort((a, b) => a - b));
  });

  it('counts the pieces in the five stacks for the door, and an empty chair is not one', () => {
    const layout = inPlayLayout(board(), 0);
    const pieces = layout.stacks.flatMap((stack) => stack.entries).filter((entry) => entry.form !== 'chair');
    expect(inPlayCount(layout)).toBe(pieces.length);
  });
});

describe('every figure is one reading by the card stamp’s method', () => {
  it('reads a piece on the books exactly as the fold of its card stamp', () => {
    const state = board();
    const layout = inPlayLayout(state, 0);
    for (const entry of [...layout.government, ...layout.crest, ...layout.stacks.flatMap((stack) => stack.entries)]) {
      if (entry.subject === null) continue;
      expect(booksAgainstStamp(state, 0, entry.subject), entry.key).toBeLessThan(1e-6);
    }
    for (const stack of IN_PLAY_STACKS) {
      expect(booksAgainstStamp(state, 0, { kind: 'pieces', pieces: stackPieces(layout, stack) }), stack).toBeLessThan(1e-6);
    }
  });

  it('makes the totals line the books with everything in force less the books with none of it', () => {
    const state = board();
    const layout = inPlayLayout(state, 0);
    const reading = readInPlay(state, 0, layout);
    const none = cardImpactWorlds(state, 0, { kind: 'pieces', pieces: allPieces(layout) })!.without;
    const real = readEmpire(state, 0).totals;
    const bare = readEmpire(none, 0).totals;
    for (const voice of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      expect(reading.total[voice], voice).toBeCloseTo(real[voice] - bare[voice], 9);
    }
    expect(reading.total.happiness).toBeCloseTo(happinessOf(state, 0) - happinessOf(none, 0), 9);
    expect(reading.total.authority).toBeCloseTo(authorityOf(state, 0) - authorityOf(none, 0), 9);
  });

  it('makes a piece’s figure what the totals line loses without it', () => {
    const state = board();
    for (const stack of inPlayLayout(state, 0).stacks) {
      for (const entry of stack.entries) {
        if (entry.piece === null) continue;
        expect(totalsWithoutGap(state, 0, entry.key), entry.key).toBeLessThan(1e-6);
      }
    }
  });

  it('rounds the council’s cards against the Council screen’s own line', () => {
    const state = board();
    const layout = inPlayLayout(state, 0);
    const reading = readInPlay(state, 0, layout);
    for (const entry of layout.stacks[0]!.entries) {
      if (entry.form !== 'order') continue;
      const own = reading.figures.get(entry.key)!;
      for (const figure of reading.plates.get(entry.key)!) {
        const exact = Math.round(reading.council[figure.voice]) - Math.round(reading.council[figure.voice] - own[figure.voice]);
        expect(figure.amount, `${entry.key} ${figure.voice}`).toBe(exact);
      }
    }
  });
});

describe('a total clicked: the sheet of sources', () => {
  it('adds up to the empire’s own figure, for the six yields and both meters', () => {
    for (const sum of sheetSums(board(), 0)) expect(sum.rows, sum.voice).toBe(sum.empire);
  });

  it('rounds a list to a total, moving no row by more than one', () => {
    // A tie goes to the first.
    expect(roundToTotal([1.4, 2.4, 3.4], 7)).toEqual([2, 2, 3]);
    expect(roundToTotal([10.5, -3.5], 7)).toEqual([11, -4]);
    expect(roundToTotal([], 0)).toEqual([]);
    const amounts = [12.7, -4.2, 0.6, 30.1];
    const out = roundToTotal(amounts, 39);
    expect(out.reduce((sum, value) => sum + value, 0)).toBe(39);
    out.forEach((value, index) => expect(Math.abs(value - amounts[index]!)).toBeLessThan(1));
  });
});

describe('the arrival', () => {
  it('learns what is there first, then names a wonder or a belief new since, until it is seen', () => {
    const before = inPlayGame(30);
    const after = board();
    const arrivals = createInPlayArrivals();
    expect(arrivals.note(0, inPlayLayout(before, 0))).toEqual([]);
    const arrived = arrivals.note(0, inPlayLayout(after, 0));
    expect(arrived.some((key) => key.startsWith('wonder:'))).toBe(true);
    expect(arrived.some((key) => key.startsWith('belief:'))).toBe(true);
    // Only wonders and beliefs arrive.
    expect(arrived.every((key) => key.startsWith('wonder:') || key.startsWith('belief:'))).toBe(true);
    expect(arrivals.fresh(0).size).toBe(arrived.length);
    // Another seat is its own.
    expect(arrivals.fresh(1).size).toBe(0);
    arrivals.seen(0);
    expect(arrivals.fresh(0).size).toBe(0);
  });

  it('puts the arrivals on top of their stack, in the order they came', () => {
    const wonders = inPlayLayout(board(), 0).stacks.find((stack) => stack.id === 'wonders')!.entries;
    const last = wonders[wonders.length - 1]!;
    expect(arrivalsOnTop(wonders, new Set([last.key]))[0]!.key).toBe(last.key);
    expect(arrivalsOnTop(wonders, new Set()).map((entry) => entry.key)).toEqual(wonders.map((entry) => entry.key));
  });

  it('drops an arrival that leaves before it is seen', () => {
    const arrivals = createInPlayArrivals();
    arrivals.note(0, inPlayLayout(inPlayGame(30), 0));
    arrivals.note(0, inPlayLayout(board(), 0));
    expect(arrivals.fresh(0).size).toBeGreaterThan(0);
    arrivals.note(0, inPlayLayout(inPlayGame(30), 0));
    expect(arrivals.fresh(0).size).toBe(0);
  });
});
