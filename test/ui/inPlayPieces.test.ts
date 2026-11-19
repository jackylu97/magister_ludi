/**
 * **The In play screen's pieces and figures** (stage 3 of the Council and In
 * play board, `docs/plans/ui-critique-2026-10-16.md`, from "Two tabs" to "The
 * Council and In play board is approved"). Core tier, on a short game dressed
 * with one piece of every kind (`inPlayHelpers.ts`). The slow file plays a long
 * game and checks every piece the bots come to hold.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, type BuildingId, isWonder } from '../../src/sim/buildingData';
import { cardImpactWorlds } from '../../src/sim/cardImpact';
import type { WonderCompletion } from '../../src/sim/cities';
import { TRIUMPH_IDS, triumphDef } from '../../src/sim/triumphData';
import type { TriumphAward } from '../../src/sim/triumphs';
import { wonderPlateReading, wonderTriumphPairs } from '../../src/ui/wonderPlate';
import { isTechId } from '../../src/sim/techData';
import { bumpRevision } from '../../src/sim/state';
import { authorityOf, happinessOf } from '../../src/sim/meters';
import { readEmpire } from '../../src/sim/readings';
import { renownPerTurn } from '../../src/sim/renown';
import {
  BREAKDOWN_WORDS,
  IN_PLAY_STACKS,
  allPieces,
  arrivalsOnTop,
  createInPlayArrivals,
  inPlayBreakdown,
  inPlayCount,
  inPlayLayout,
  piecesFigures,
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

  it('shows one Assembly Hall for the council chair and leaves local buildings to their towns', () => {
    const state = board();
    const town = state.cities.find(city => city.ownerId === 0)!;
    town.buildings.push('assemblyHall', 'library');
    bumpRevision(state);
    const entries = inPlayLayout(state, 0).stacks.flatMap(stack => stack.entries);
    const halls = entries.filter(entry => entry.card === 'assemblyHall');
    expect(halls).toHaveLength(1);
    expect(halls[0]!.link).toEqual({ kind: 'city', cityId: town.id });
    expect(entries.some(entry => entry.card === 'library')).toBe(false);
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
    // Renown each turn (stage 7): the fold the `renown` phase banks, over every family.
    expect(reading.total.renown).toBeCloseTo(renownPerTurn(state, 0) - renownPerTurn(none, 0), 9);
    expect(reading.books.renown).toBe(renownPerTurn(state, 0));
  });

  // The user, 2026-11-19: "lets add renown to the in-play and orders yield
  // screen, cards should show additional renown that they generate".
  it('shows renown each turn on a piece that pays it, and splits the sheet’s figure by family', () => {
    const state = board();
    const layout = inPlayLayout(state, 0);
    const reading = readInPlay(state, 0, layout);
    const entries = [...layout.government, ...layout.crest, ...layout.stacks.flatMap((stack) => stack.entries)];
    for (const entry of entries) {
      const own = reading.figures.get(entry.key);
      if (own === undefined) continue;
      const shown = reading.plates.get(entry.key)!.find((figure) => figure.voice === 'renown');
      // A plate shows renown exactly when the piece moves it by a whole figure or more.
      if (Math.abs(own.renown) >= 1) expect(shown, entry.key).toBeDefined();
      if (own.renown === 0) expect(shown, entry.key).toBeUndefined();
    }
    const sheet = inPlayBreakdown(state, 0, layout, reading, 'renown');
    expect(sheet.empire).toBe(Math.round(renownPerTurn(state, 0)));
    const families = sheet.sections.find((section) => section.heading === BREAKDOWN_WORDS.byFamily);
    if (sheet.empire !== 0) {
      expect(families).toBeDefined();
      // Another cut of the same figure: never added in again, and it adds up on its own.
      for (const row of families!.rows) expect(row.alone, row.label).toBe(true);
      expect(families!.rows.reduce((sum, row) => sum + row.amount, 0)).toBe(sheet.empire);
    }
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

describe('the wonder plate’s reading (frame A1)', () => {
  it('reads a wonder the seat holds: its piece, what it pays each turn, its town and the turn', () => {
    const state = board();
    const wonders = inPlayLayout(state, 0).stacks.find((stack) => stack.id === 'wonders')!.entries;
    const piece = wonders.find((entry) => entry.form === 'wonder')!;
    const reading = wonderPlateReading(state, 0, piece.card as BuildingId, piece.cityId!, 74)!;
    expect(reading.entry.key).toBe(piece.key);
    expect(reading.town).toBe(state.cities.find((city) => city.id === piece.cityId)!.name);
    expect(reading.turn).toBe(74);
    const own = piecesFigures(state, 0, piece.subject!);
    for (const figure of reading.plate) expect(figure.amount, figure.voice).toBe(Math.round(own[figure.voice]));
  });

  it('reads nothing for a wonder the seat does not hold', () => {
    const state = board();
    const held = new Set(state.cities.filter((city) => city.ownerId === 0).flatMap((city) => city.buildings));
    const other = BUILDING_IDS.find((id) => isWonder(id) && !held.has(id))!;
    expect(wonderPlateReading(state, 0, other, state.cities[0]!.id, 74)).toBeNull();
  });

  it('carries the Triumph it is handed as its renown line, and none without one', () => {
    const state = board();
    const piece = inPlayLayout(state, 0).stacks.find((stack) => stack.id === 'wonders')!.entries.find((entry) => entry.form === 'wonder')!;
    const award = { id: MARVEL, name: triumphDef(MARVEL).name, pays: 12.5, family: null, playerId: 0, turn: 74 } as TriumphAward;
    expect(wonderPlateReading(state, 0, piece.card as BuildingId, piece.cityId!, 74, award)!.triumph).toEqual({ name: award.name, pays: 12.5 });
    expect(wonderPlateReading(state, 0, piece.card as BuildingId, piece.cityId!, 74)!.triumph).toBeNull();
  });
});

// The Triumph a finished wonder earns, found by its trigger, and one that is not.
const MARVEL = TRIUMPH_IDS.find((id) => triumphDef(id).when.kind === 'wonderCompleted')!;
const OTHER = TRIUMPH_IDS.find((id) => triumphDef(id).when.kind !== 'wonderCompleted' && triumphDef(id).deferred === undefined)!;

describe('which Triumph goes on which plate (the user, 2026-11-19: one page for a wonder)', () => {
  const wonder = (building: string, playerId: number): WonderCompletion =>
    ({ building, name: building, cityId: 1, playerId, turn: 74, refunds: [] }) as unknown as WonderCompletion;
  const award = (id: typeof MARVEL, playerId: number): TriumphAward => ({ id, name: triumphDef(id).name, pays: triumphDef(id).pays, family: null, playerId, turn: 74 });

  it('pairs the seat’s own wonders, in order, with its own Triumphs for a finished wonder', () => {
    const first = wonder('a', 0);
    const second = wonder('b', 0);
    const marvels = [award(MARVEL, 0), award(MARVEL, 0)];
    const pairs = wonderTriumphPairs({ wonders: [first, second], triumphs: [award(OTHER, 0), marvels[0]!, marvels[1]!] }, 0);
    expect(pairs).toEqual([
      [first, marvels[0]],
      [second, marvels[1]],
    ]);
    expect(pairs[0]![1]).toBe(marvels[0]);
  });

  it('leaves every other Triumph, and another seat’s wonders and Triumphs, alone', () => {
    const theirs = wonder('a', 1);
    expect(wonderTriumphPairs({ wonders: [theirs], triumphs: [award(MARVEL, 1)] }, 0)).toEqual([]);
    expect(wonderTriumphPairs({ wonders: [wonder('a', 0)], triumphs: [award(OTHER, 0)] }, 0)).toEqual([]);
    // A Triumph with no wonder to pair keeps its page.
    expect(wonderTriumphPairs({ triumphs: [award(MARVEL, 0)] }, 0)).toEqual([]);
    expect(wonderTriumphPairs({}, 0)).toEqual([]);
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
