/**
 * The Deal panel: the two columns, the papers on the table, and the bargains
 * already running.
 *
 * `test/sim/deals.test.ts` covers the rules; this covers the surface, and what
 * a deal panel can be *quietly* wrong about is its own:
 *
 *   1. **Which side may put what on the table.** Every row comes out of the
 *      simulation's own gates (`openBordersError`, `capitalCityOf`), so an
 *      offered tick-box is a term the reducer takes — this interface's bargain
 *      everywhere a gate exists.
 *   2. **Why a row is greyed.** A refused row is drawn and disabled *with its
 *      reason*, and the reason has to name the thing that would lift it — the
 *      technology, the seat of government.
 *   3. **What a paper says.** One function turns terms into words
 *      (`termLines`), so a standing offer and a live bargain cannot drift about
 *      what was agreed.
 *   4. **Who may answer a paper.** Accept is the other seat's verb and Withdraw
 *      is the proposer's, and both carry the reducer's own refusals.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the panel itself is not
 * rendered: what is covered is the pure half — every decision above is a
 * function — and, through the source exactly as `diplomacyScreen.test.ts` reads
 * its rules, the wirings that span files.
 */

import { describe, expect, it } from 'vitest';
import { uiSource } from './sourceHelpers';

import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt, lendableCopies } from '../../src/sim/cities';
import { dealSideError, luxuryLendingBan } from '../../src/sim/diplomacy';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { improvementForResource } from '../../src/sim/improvementData';
import { RULES } from '../../src/sim/rulesData';
import { resourceDef } from '../../src/sim/resourceData';
import { type City, type GameState, playerById, bumpRevision } from '../../src/sim/state';
import { openWar } from '../../src/sim/wars';
import { resetVisibility } from '../../src/sim/visibility';
import {
  coinTermError,
  dealButtonLabel,
  dealFootSentence,
  dealPanel,
  diplomacyRows,
  draftError,
  hiddenLuxuriesLine,
  loanNote,
  loanSentence,
  loanTurnsMark,
  luxuryHold,
  luxuryRowShow,
  paperRunsLine,
  removeTerm,
  termItems,
  termLines,
} from '../../src/ui/diplomacyScreen';
import { newGame } from '../sim/newGameHelpers';

function bench(): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 14, height: 8, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(14 * 8).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function town(state: GameState, seat: number, col: number, row: number): City {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error('no tile');
  return foundCityAt(state, seat, tile);
}

/** Gives a seat a worked silk seam, so the panel has a luxury to offer. */
function giveSilk(state: GameState, city: City, col: number, row: number): void {
  const tile = getTileAt(state.map, col, row)!;
  tile.resource = 'silk';
  tile.improvement = 'plantation';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  // A bench writing the board by hand is a writer, and announces (the slate's
  // contract; `resourceCopies` reads off the economy clock since A1).
  bumpRevision(state);
}

describe('the two columns', () => {
  it('offers each empire its own luxuries, and marks the spares', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    giveSilk(state, mine, 2, 3);
    const model = dealPanel(state, 0, 1);
    expect(model.yours.luxuries.map((row) => row.label)).toEqual(['Silk']);
    expect(model.yours.luxuries[0]!.note).toBeNull();
    expect(model.yours.luxuries[0]!.copies).toBe(1);
    expect(model.theirs.luxuries).toEqual([]);

    giveSilk(state, mine, 4, 5);
    const spare = dealPanel(state, 0, 1);
    expect(spare.yours.luxuries[0]!.note).toBe('spare');
    expect(spare.yours.luxuries[0]!.copies).toBe(2);
  });

  it('carries what may actually be offered beside what is held', () => {
    // Batch R4, ruling 4 — "only trade away available copies". The row leads
    // with `spare` (`lendableCopies`, which is `dealSideError`'s own reading)
    // rather than with the held count, so the table can never quote a number the
    // reducer is about to refuse. No shipped luxury is spent by a unit today —
    // ivory went strategic — so the two agree on every row the game has; the
    // field exists because the rule is the reducer's, not this list's.
    const state = bench();
    const mine = town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    giveSilk(state, mine, 2, 3);
    giveSilk(state, mine, 4, 5);
    const model = dealPanel(state, 0, 1);
    expect(model.yours.luxuries[0]!.spare).toBe(2);
    expect(model.yours.luxuries[0]!.spare).toBe(model.yours.luxuries[0]!.copies);
  });

  it('offers no strategic resource at all, whatever an empire holds of it', () => {
    // Ivory is strategic since batch R3 (ruling 1), and the deal vocabulary
    // lends luxuries only (`isLendableResource`). A player will notice it gone,
    // so the column has to be the thing that never shows it rather than a
    // refusal after the fact.
    const state = bench();
    const mine = town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    const tile = getTileAt(state.map, 2, 3)!;
    tile.resource = 'ivory';
    tile.improvement = 'camp';
    state.tileOwner[tileIndex(state.map, 2, 3)] = mine.id;
    bumpRevision(state);
    expect(resourceDef('ivory').kind).toBe('strategic');
    expect(dealPanel(state, 0, 1).yours.luxuries).toEqual([]);
  });

  it('drops a lent seam out of the giver’s column and into the receiver’s', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    giveSilk(state, mine, 2, 3);
    applyCommand(state, {
      type: 'proposeDeal',
      playerId: 0,
      targetId: 1,
      give: { luxuries: ['silk'] },
      take: {},
    } as unknown as Command);
    applyCommand(state, {
      type: 'acceptDeal',
      playerId: 1,
      dealId: state.dealProposals[0]!.id,
    });
    const model = dealPanel(state, 0, 1);
    // The list *is* the gate: a seam already promised away is not in the
    // column at all, so there is nothing to grey.
    expect(model.yours.luxuries).toEqual([]);
    expect(model.theirs.luxuries.map((row) => row.label)).toEqual(['Silk']);
  });

  it('greys the right of way and names the technology, on both sides', () => {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    const shut = dealPanel(state, 0, 1);
    expect(shut.yours.openBorders.error).toContain('Writing');
    expect(shut.theirs.openBorders.error).toContain('Writing');

    playerById(state, 0)!.techsResearched.push('letters');
    bumpRevision(state);
    // One side is not enough, and the sentence says whose scribes are missing.
    expect(dealPanel(state, 0, 1).yours.openBorders.error).toContain('Bors');
    playerById(state, 1)!.techsResearched.push('letters');
    bumpRevision(state);
    const open = dealPanel(state, 0, 1);
    expect(open.yours.openBorders.error).toBeNull();
    expect(open.theirs.openBorders.error).toBeNull();
  });

  it('shows towns only on a war row, and never a seat of government', () => {
    const state = bench();
    town(state, 0, 3, 4);
    const capital = town(state, 1, 10, 4);
    const second = town(state, 1, 12, 6);

    const peaceRow = dealPanel(state, 0, 1);
    expect(peaceRow.peace).toBe(false);
    expect(peaceRow.theirs.cities).toEqual([]);

    openWar(state, 0, 1);
    const warRow = dealPanel(state, 0, 1);
    expect(warRow.peace).toBe(true);
    const names = warRow.theirs.cities.map((row) => row.label);
    expect(names).toContain(capital.name);
    expect(names).toContain(second.name);
    const seat = warRow.theirs.cities.find((row) => row.label === capital.name)!;
    expect(seat.error).toContain('seat of government');
    expect(seat.note).toBe('seat of government');
    expect(warRow.theirs.cities.find((row) => row.label === second.name)!.error).toBeNull();
  });

  it('says why nothing may be proposed while there is a war on', () => {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    expect(dealPanel(state, 0, 1).blocked).toBeNull();
    openWar(state, 0, 1);
    // A war row writes a *peace* paper, so the panel is not blocked — it is a
    // different paper, and the button below says so.
    expect(dealPanel(state, 0, 1).blocked).toBeNull();
    expect(dealButtonLabel(dealPanel(state, 0, 1), false)).toBe('Propose peace');
    expect(dealButtonLabel(dealPanel(state, 0, 1), true)).toBe('Propose peace');
  });
});

describe('what a paper says', () => {
  it('turns every term into one plain line, in the paper’s own order', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    expect(
      termLines(state, {
        gold: 40,
        goldPerTurn: 3,
        luxuries: ['silk'],
        strategics: ['iron'],
        openBorders: true,
        cities: [mine.id],
      }),
    ).toEqual(['40 gold', '3 gold a turn', 'Silk', 'Iron', 'Open borders', mine.name]);
  });

  it('says "Nothing" rather than printing an empty list', () => {
    expect(termLines(bench(), {})).toEqual(['Nothing']);
  });

  it('names a town that is no longer on the board honestly', () => {
    expect(termLines(bench(), { cities: [999] })).toEqual(['a town']);
  });
});

describe('the papers on the table', () => {
  function withPaper(): GameState {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    playerById(state, 0)!.gold = 100;
    bumpRevision(state);
    applyCommand(state, {
      type: 'proposeDeal',
      playerId: 0,
      targetId: 1,
      give: { gold: 40 },
      take: { goldPerTurn: 2 },
    } as unknown as Command);
    return state;
  }

  it('shows the proposer a withdrawal and the other seat an acceptance', () => {
    const state = withPaper();
    const mine = dealPanel(state, 0, 1).proposals;
    expect(mine).toHaveLength(1);
    expect(mine[0]!.mine).toBe(true);
    expect(mine[0]!.heading).toBe('You offer the Bors');
    expect(mine[0]!.withdrawError).toBeNull();
    expect(mine[0]!.acceptError).toBeNull();

    const theirs = dealPanel(state, 1, 0).proposals;
    expect(theirs).toHaveLength(1);
    expect(theirs[0]!.mine).toBe(false);
    expect(theirs[0]!.heading).toBe('The Ada offer you');
    expect(theirs[0]!.give).toEqual(['40 gold']);
    expect(theirs[0]!.take).toEqual(['2 gold a turn']);
    expect(theirs[0]!.acceptError).toBeNull();
  });

  it('greys Accept with the reducer’s own sentence when the board has moved', () => {
    const state = withPaper();
    playerById(state, 0)!.gold = 1;
    bumpRevision(state);
    expect(dealPanel(state, 1, 0).proposals[0]!.acceptError).toContain('not have that much coin');
  });

  it('lists a live bargain from each side, with the turns it has left', () => {
    const state = withPaper();
    applyCommand(state, {
      type: 'acceptDeal',
      playerId: 1,
      dealId: state.dealProposals[0]!.id,
    });
    const mine = dealPanel(state, 0, 1);
    expect(mine.proposals).toEqual([]);
    expect(mine.active).toHaveLength(1);
    expect(mine.active[0]!.turnsLeft).toBe(RULES.war.dealTurns);
    // The lump has already moved and is history; what stands is the tribute.
    expect(mine.active[0]!.give).toEqual(['Nothing']);
    expect(mine.active[0]!.take).toEqual(['2 gold a turn']);

    const theirs = dealPanel(state, 1, 0).active[0]!;
    expect(theirs.give).toEqual(['2 gold a turn']);
    expect(theirs.take).toEqual(['Nothing']);
  });
});

describe('the peace paper', () => {
  it('shows both seats the terms the peace button would sign', () => {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    playerById(state, 1)!.gold = 100;
    bumpRevision(state);
    openWar(state, 0, 1);
    expect(dealPanel(state, 0, 1).peacePaper).toBeNull();

    applyCommand(state, {
      type: 'proposePeace',
      playerId: 0,
      targetId: 1,
      give: {},
      take: { gold: 50 },
    } as unknown as Command);

    const mine = dealPanel(state, 0, 1).peacePaper!;
    expect(mine.mine).toBe(true);
    expect(mine.heading).toBe('You offer the Bors');
    expect(mine.give).toEqual(['Nothing']);
    expect(mine.take).toEqual(['50 gold']);

    // And the same paper from the other side of the table, the other way round.
    const theirs = dealPanel(state, 1, 0).peacePaper!;
    expect(theirs.mine).toBe(false);
    expect(theirs.heading).toBe('The Ada offer you');
    expect(theirs.give).toEqual(['50 gold']);
    expect(theirs.take).toEqual(['Nothing']);

    // **Only theirs may be sent home** (§12): the seat that wrote a paper takes
    // it back with the peace button's Withdraw face, and the gate says so in
    // the reducer's own words.
    expect(theirs.declineError).toBeNull();
    expect(mine.declineError).toContain('nothing to refuse');
  });

  it('goes away with the war it rode on', () => {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    openWar(state, 0, 1);
    applyCommand(state, {
      type: 'proposePeace',
      playerId: 0,
      targetId: 1,
      give: { goldPerTurn: 1 },
      take: {},
    } as unknown as Command);
    expect(dealPanel(state, 0, 1).peacePaper).not.toBeNull();
    applyCommand(state, { type: 'withdrawPeace', playerId: 0, targetId: 1 });
    expect(dealPanel(state, 0, 1).peacePaper).toBeNull();
  });
});

describe('the sentences', () => {
  it('explains the one thing a player cannot see: that a bargain lapses', () => {
    const sentence = dealFootSentence();
    expect(sentence).toContain('lapses');
    // Numbers never appear in written prose (hard rule 7): the countdown is on
    // the bargain's own row.
    expect(/\d/.test(sentence)).toBe(false);
  });
});

describe('the wiring that spans files', () => {
  // The sources come from the suite's shared glob (`sourceHelpers.ts`).
  const source = uiSource;

  it('sends every deal write as a command, and never touches the state itself', () => {
    const screen = source('diplomacyScreen.ts');
    expect(screen).not.toContain('applyCommand');
    expect(screen).not.toContain('dispatch(');
    // The panel's four writes all leave through the handed-in verbs.
    expect(screen).toContain('options.proposeDeal(');
    expect(screen).toContain('options.answerDeal(');
    expect(screen).toContain('options.withdrawDeal(');
    expect(screen).toContain('options.offerPeace(row.playerId, true, {');
  });

  it('wires all three bargain verbs through controls, from main', () => {
    const main = source('main.ts');
    expect(main).toContain('controls.proposeDealWith(');
    expect(main).toContain('controls.answerDealOf(');
    expect(main).toContain('controls.withdrawDealOf(');
    const controls = source('controls.ts');
    for (const type of ['proposeDeal', 'acceptDeal', 'declineDeal', 'withdrawDeal']) {
      expect(controls).toContain(`'${type}'`);
    }
  });

  it('keeps the draft out of the DOM, so a refresh does not sweep it away', () => {
    const screen = source('diplomacyScreen.ts');
    expect(screen).toContain('const drafts = new Map<number, DealDraft>()');
  });
});

describe('a seat under The Forbidden Silks (batch DT7)', () => {
  it('greys its own luxuries with the reducer’s sentence, and leaves the other side alone', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    const theirs = town(state, 1, 10, 4);
    giveSilk(state, mine, 2, 3);
    giveSilk(state, mine, 4, 5);
    // Their luxury is wine: had it been silk too, both sides would hold their
    // own and the luxury rule (batch SS4) would hide it.
    const vines = getTileAt(state.map, 9, 3)!;
    vines.resource = 'wine';
    vines.improvement = improvementForResource('wine')!;
    state.tileOwner[tileIndex(state.map, 9, 3)] = theirs.id;
    state.players[0]!.statecraft.doctrines.push('theForbiddenSilks' as never);
    bumpRevision(state);

    const model = dealPanel(state, 0, 1);
    const row = model.yours.luxuries[0]!;
    expect(row.error).toBe(luxuryLendingBan(state, 0));
    expect(row.error).toContain('The Forbidden Silks');
    expect(row.spare).toBe(0);
    expect(row.note).toBeNull();
    expect(model.theirs.luxuries[0]!.error).toBeNull();
    // The other seat's panel says the same of this seat's column.
    expect(dealPanel(state, 1, 0).theirs.luxuries[0]!.error).toBe(luxuryLendingBan(state, 0));
  });
});

// --- the luxury rule (batch SS4) ----------------------------------------------

/**
 * The luxury rule in the deal table (the user, 2026-11-16, ruled as option 1 in
 * `docs/plans/ui-critique-2026-10-16.md`): a luxury is not shown when both
 * sides have their own copy; it is shown greyed, with who lent it and the turns
 * left, when the other side has it only on loan; it is shown as usual when the
 * other side does not have it. A giver's borrowed copy cannot be lent on (the
 * ruling "A borrowed luxury cannot be lent on", `docs/flags.md`):
 * `dealSideError` asks `lendableCopies`, which counts only the copies the giver
 * owns, so a row whose only copy is borrowed is refused in the reducer's words,
 * with a line saying where the copy came from.
 */
describe('the luxury rule', () => {
  /** Three seats: Ada (0) and Bors (1) at the table, Cyd (2) a third empire. */
  function three(): GameState {
    const state = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00', isHuman: true },
        { name: 'Bors', color: '#00a', isHuman: true },
        { name: 'Cyd', color: '#0a0', isHuman: true },
      ],
    });
    state.map = createMap({ width: 14, height: 8, terrain: 'grassland' });
    resetVisibility(state);
    state.tileOwner = new Array<number | null>(14 * 8).fill(null);
    state.units = [];
    state.cities = [];
    state.camps = [];
    state.nextEntityId = 1;
    return state;
  }

  /** A live loan of one silk from `from` to `to`, for `turns` more turns. */
  function lend(state: GameState, from: number, to: number, turns: number): void {
    const [a, b] = from < to ? [from, to] : [to, from];
    const gives = { luxuries: ['silk' as const] };
    state.deals.push({
      id: 900 + state.deals.length,
      a,
      b,
      terms: { a: from === a ? gives : {}, b: from === b ? gives : {} },
      untilTurn: state.turn + turns,
    });
    bumpRevision(state);
  }

  function setUp(): { state: GameState; ada: City; bors: City; cyd: City } {
    const state = three();
    const ada = town(state, 0, 2, 2);
    const bors = town(state, 1, 7, 2);
    const cyd = town(state, 2, 11, 5);
    return { state, ada, bors, cyd };
  }

  const silk = <T extends { id?: string }>(rows: readonly T[]): T | undefined =>
    rows.find((row) => row.id === 'silk');

  it('hides a luxury both sides have their own copy of, in both columns', () => {
    const { state, ada, bors } = setUp();
    giveSilk(state, ada, 1, 2);
    giveSilk(state, bors, 8, 2);
    const model = dealPanel(state, 0, 1);
    expect(silk(model.yours.luxuries)).toBeUndefined();
    expect(silk(model.theirs.luxuries)).toBeUndefined();
    // The column's head still counts what the empire holds.
    expect(model.yours.stock).toEqual({ kinds: 1, copies: 1 });
  });

  it('greys a luxury the other side holds only on loan, with the lender and the turns left', () => {
    const { state, ada, cyd } = setUp();
    giveSilk(state, ada, 1, 2);
    giveSilk(state, cyd, 12, 5);
    lend(state, 2, 1, 4);
    const row = silk(dealPanel(state, 0, 1).yours.luxuries)!;
    expect(row.onLoan).toEqual({
      head: 'They have it only on loan',
      parts: [{ from: 'from the Cyd', turns: '4 turns left' }],
    });
    // Still chosen like any row the reducer accepts: the loan will end.
    expect(row.error).toBeNull();
    expect(row.borrowed).toBeUndefined();
  });

  it('says "from you" when the loan is the seat’s own, and words one turn as one', () => {
    const { state, ada } = setUp();
    giveSilk(state, ada, 1, 2);
    giveSilk(state, ada, 3, 3);
    lend(state, 0, 1, 1);
    const row = silk(dealPanel(state, 0, 1).yours.luxuries)!;
    expect(row.onLoan).toEqual({
      head: 'They have it only on loan',
      parts: [{ from: 'from you', turns: '1 turn left' }],
    });
    expect(row.error).toBeNull();
  });

  it('greys their column too when the seat holds the luxury only on loan', () => {
    const { state, bors, cyd } = setUp();
    giveSilk(state, bors, 8, 2);
    giveSilk(state, cyd, 12, 5);
    lend(state, 2, 0, 6);
    const row = silk(dealPanel(state, 0, 1).theirs.luxuries)!;
    expect(row.onLoan).toEqual({
      head: 'You have it only on loan',
      parts: [{ from: 'from the Cyd', turns: '6 turns left' }],
    });
    expect(row.error).toBeNull();
  });

  it('shows a luxury the other side does not have as an ordinary row', () => {
    const { state, ada } = setUp();
    giveSilk(state, ada, 1, 2);
    const row = silk(dealPanel(state, 0, 1).yours.luxuries)!;
    expect(row.onLoan).toBeUndefined();
    expect(row.borrowed).toBeUndefined();
    expect(row.error).toBeNull();
  });

  it('refuses a copy the giver only borrowed, in the reducer’s own words, and says where it came from', () => {
    // The user's ruling, "A borrowed luxury cannot be lent on" (`docs/flags.md`):
    // the reducer refuses it, and the chip says so with the reducer's sentence.
    const { state, cyd } = setUp();
    giveSilk(state, cyd, 12, 5);
    lend(state, 2, 0, 5);
    const refusal = dealSideError(state, 0, 1, { luxuries: ['silk'] }, false);
    expect(refusal).not.toBeNull();
    const row = silk(dealPanel(state, 0, 1).yours.luxuries)!;
    expect(row.error).toBe(refusal);
    expect(row.spare).toBe(0);
    expect(row.borrowed).toEqual({
      head: 'Your copy is on loan',
      parts: [{ from: 'from the Cyd', turns: '5 turns left' }],
    });
    // And from their side: the Bors' only silk is a loan from the Cyd, refused
    // to them in their own words.
    const back = dealPanel(state, 1, 0);
    const theirs = silk(back.theirs.luxuries)!;
    expect(theirs.error).toBe(dealSideError(state, 0, 1, { luxuries: ['silk'] }, false));
    expect(theirs.borrowed).toEqual({
      head: 'Their copy is on loan',
      parts: [{ from: 'from the Cyd', turns: '5 turns left' }],
    });
  });

  it('counts only the owned copy as one to give, beside a borrowed one', () => {
    // One own silk and one borrowed silk: Ada can use two and lend one.
    const { state, ada, cyd } = setUp();
    giveSilk(state, ada, 1, 2);
    giveSilk(state, cyd, 12, 5);
    lend(state, 2, 0, 5);
    const row = silk(dealPanel(state, 0, 1).yours.luxuries)!;
    expect(row.copies).toBe(2);
    expect(row.spare).toBe(1);
    expect(row.spare).toBe(lendableCopies(state, 0, 'silk'));
    expect(row.error).toBeNull();
    expect(dealSideError(state, 0, 1, { luxuries: ['silk'] }, false)).toBeNull();
    // Giving the own copy leaves the borrowed one, so it is a spare and not a
    // last copy, and the row carries no borrowed note (Ada owns one).
    expect(row.note).toBe('spare');
    expect(row.borrowed).toBeUndefined();
  });

  it('draws a refused chip that cannot be picked: a press shows the sentence and writes no term', () => {
    const screen = uiSource('diplomacyScreen.ts');
    const chip = screen.slice(screen.indexOf('function choiceChip('));
    const body = chip.slice(0, chip.indexOf('\n  }\n'));
    const refused = body.slice(body.indexOf('if (choice.error !== null) {'), body.indexOf('} else {', body.indexOf('if (choice.error !== null) {')));
    expect(refused).toContain("chip.setAttribute('aria-disabled', 'true');");
    expect(refused).toContain('refusal = { seatId: row.playerId, half, group, text: choice.error');
    expect(refused).not.toContain('write(');
  });

  it('splits a hold into its own copies and its loans, off the simulation’s two figures', () => {
    const { state, ada, cyd } = setUp();
    giveSilk(state, ada, 1, 2);
    giveSilk(state, cyd, 12, 5);
    lend(state, 2, 0, 3);
    expect(luxuryHold(state, 0, 'silk')).toEqual({ own: 1, loans: [{ lenderId: 2, turnsLeft: 3 }] });
    expect(luxuryHold(state, 1, 'silk')).toEqual({ own: 0, loans: [] });
    expect(luxuryRowShow({ own: 1, loans: [] })).toBe('hidden');
    expect(luxuryRowShow({ own: 0, loans: [{ lenderId: 2, turnsLeft: 3 }] })).toBe('onLoan');
    expect(luxuryRowShow({ own: 0, loans: [] })).toBe('open');
    // The words carry no identifier, and the turns are their own figure.
    const note = loanNote(state, 0, 1, 1, [{ lenderId: 2, turnsLeft: 3 }], 'receiver');
    expect(note.head).not.toMatch(/\d/);
  });

  it('draws a greyed row pressable, and a refused row with the reducer’s words', () => {
    const screen = uiSource('diplomacyScreen.ts');
    expect(screen).toContain("${choice.onLoan?' is-greyed':''}");
    expect(screen).toContain('const error = dealSideError(state, giverId, receiverId, { luxuries: [holding.id] }, war);');
    expect(screen).toContain('const note = choice.error !== null ? choice.error');
    // Greyed is a look, not a lock: only `error` disables the chip (batch SS6,
    // the chips). The chip is the only control that reads `onLoan`, and it
    // reads it for its look and its note, never for whether it can be pressed.
    const chip = screen.slice(screen.indexOf('function choiceChip('));
    const body = chip.slice(0, chip.indexOf('\n  }\n'));
    expect(body).toContain("if (choice.error !== null) {\n      chip.setAttribute('aria-disabled', 'true');");
    expect(body.match(/aria-disabled/g)).toHaveLength(1);
    expect(body).not.toMatch(/onLoan[^\n]*(disabled|aria-disabled)/);
  });

  it('carries the turns left for the chip, and names the luxuries it leaves off (batch SS6)', () => {
    const { state, ada, bors, cyd } = setUp();
    giveSilk(state, ada, 1, 2);
    giveSilk(state, ada, 3, 3);
    giveSilk(state, cyd, 12, 5);
    lend(state, 0, 1, 6);
    lend(state, 2, 1, 4);
    const row = silk(dealPanel(state, 0, 1).yours.luxuries)!;
    // Two loans to them: the chip prints the one that ends first.
    expect(row.onLoanTurns).toBe(4);
    expect(loanTurnsMark(row.onLoanTurns!)).toBe('4t');
    expect(loanSentence(row.onLoan!)).toBe(
      'They have it only on loan from you · 6 turns left; from the Cyd · 4 turns left',
    );
    // Bors with a copy of his own: silk leaves Ada's column, and the tray says so.
    giveSilk(state, bors, 8, 2);
    const model = dealPanel(state, 0, 1);
    expect(silk(model.yours.luxuries)).toBeUndefined();
    expect(model.yours.hidden).toEqual([resourceDef('silk').name]);
  });
});

describe('the treaty desk (batch SS6)', () => {
  it('splits a side into clauses with the keys that take each back, in termLines\' words', () => {
    const state = bench();
    const terms: Parameters<typeof termItems>[1] = { gold: 120, goldPerTurn: 4, luxuries: ['silk', 'wine'], openBorders: true };
    const items = termItems(state, terms);
    expect(items.map((item) => item.key)).toEqual(['gold', 'goldPerTurn', 'luxury:silk', 'luxury:wine', 'openBorders']);
    expect(items.map((item) => item.text)).toEqual(termLines(state, terms));
    expect(termItems(state, {})).toEqual([]);
    expect(termLines(state, {})).toEqual(['Nothing']);
  });

  it('lets a player read and remove a strategic loan from a counteroffer', () => {
    const terms: Parameters<typeof removeTerm>[0] = { strategics: ['iron', 'horses'] };
    expect(termItems(bench(), terms)).toEqual([
      { key: 'strategic:iron', text: 'Iron' },
      { key: 'strategic:horses', text: 'Horses' },
    ]);
    removeTerm(terms, 'strategic:iron');
    expect(termLines(bench(), terms)).toEqual(['Horses']);
    removeTerm(terms, 'strategic:horses');
    expect(terms).toEqual({});
  });

  it('takes a clause back by deleting the term, never by writing nothing', () => {
    const terms: Parameters<typeof removeTerm>[0] = { gold: 50, luxuries: ['silk', 'wine'], openBorders: true };
    removeTerm(terms, 'luxury:silk');
    expect(terms.luxuries).toEqual(['wine']);
    removeTerm(terms, 'luxury:wine');
    removeTerm(terms, 'gold');
    removeTerm(terms, 'openBorders');
    expect(terms).toEqual({});
  });

  it('says which luxuries are left off, as one plain line', () => {
    expect(hiddenLuxuriesLine([])).toBeNull();
    expect(hiddenLuxuriesLine(['Gold'])).toBe('Not shown: Gold. You both own it.');
    expect(hiddenLuxuriesLine(['Gold', 'Honey', 'Wine'])).toBe(
      'Not shown: Gold, Honey and Wine. You both own them.',
    );
  });

  it('runs the paper for the deal length only when a term lasts', () => {
    const turns = RULES.war.dealTurns;
    expect(paperRunsLine(90, false, {}, {})).toBe('Nothing on the table');
    expect(paperRunsLine(90, false, { gold: 40 }, {})).toBe('Paid once, on signing');
    expect(paperRunsLine(90, false, {}, { goldPerTurn: 3 })).toBe(`Runs ${turns} turns, to turn ${90 + turns}`);
    expect(paperRunsLine(90, true, {}, {})).toContain('peace');
  });

  it('greys a lump larger than the treasury with the reducer\'s sentence, and the whole draft with it', () => {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    playerById(state, 1)!.gold = 30;
    expect(coinTermError(state, 1, 0, 'gold', 30, false)).toBeNull();
    const refused = coinTermError(state, 1, 0, 'gold', 31, false);
    expect(refused).toBe(dealSideError(state, 1, 0, { gold: 31 }, false));
    expect(refused).not.toBeNull();
    expect(draftError(state, 0, 1, { give: {}, take: { gold: 31 } }, false)).toBe(refused);
    expect(draftError(state, 0, 1, { give: {}, take: { gold: 30 } }, false)).toBeNull();
  });

  it('counts the offers waiting on you, their papers and their standing peace, for the envelope', () => {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    playerById(state, 1)!.gold = 100;
    expect(diplomacyRows(state, 0)[0]!.waiting).toBe(0);
    const offer: Command = { type: 'proposeDeal', playerId: 1, targetId: 0, give: { gold: 10 }, take: {} };
    expect(applyCommand(state, offer).ok).toBe(true);
    expect(diplomacyRows(state, 0)[0]!.waiting).toBe(1);
    // Your own paper to them waits on them, not on you.
    expect(diplomacyRows(state, 1)[0]!.waiting).toBe(0);
  });

  it('draws the table\'s clauses through termItems, and Read opens their offer on the table', () => {
    const screen = uiSource('diplomacyScreen.ts');
    expect(screen).toContain("termItems(state, draft.give), 'give', draft)");
    expect(screen).toContain("termItems(state, draft.take), 'take', draft)");
    expect(screen).toContain('removeTerm(draft[half], item.key)');
    // Read, in the Standing and deals drawer, opens the offer the line names:
    // a bargain by its id, or their peace (`standingAndDeals`' `paper`).
    expect(screen).toContain('reading = { seatId: row.playerId, paper: item.paper };');
    expect(screen).toContain("waiting.push({ paper: 'peace', head, text });");
    expect(screen).toContain('waiting.push({ paper: proposal.id, head, text });');
    // The gold field reads its figure the way the old fields did.
    expect(screen).toContain('const amount = readAmount(input.value);');
  });
});
