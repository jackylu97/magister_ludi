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

import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, newGame, playerById } from '../../src/sim/state';
import { openWar } from '../../src/sim/wars';
import { resetVisibility } from '../../src/sim/visibility';
import {
  dealButtonLabel,
  dealFootSentence,
  dealPanel,
  termLines,
} from '../../src/ui/diplomacyScreen';

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
    expect(model.theirs.luxuries).toEqual([]);

    giveSilk(state, mine, 4, 5);
    const spare = dealPanel(state, 0, 1);
    expect(spare.yours.luxuries[0]!.note).toBe('spare');
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
    // One side is not enough, and the sentence says whose scribes are missing.
    expect(dealPanel(state, 0, 1).yours.openBorders.error).toContain('Bors');
    playerById(state, 1)!.techsResearched.push('letters');
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
    expect(dealButtonLabel(dealPanel(state, 0, 1), false)).toBe('Offer this peace');
    expect(dealButtonLabel(dealPanel(state, 0, 1), true)).toBe('Nothing on the table');
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
        openBorders: true,
        cities: [mine.id],
      }),
    ).toEqual(['40 gold', '3 gold a turn', 'Silk', 'Open borders', mine.name]);
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
  const sources = import.meta.glob('../../src/{main,ui/controls,ui/diplomacyScreen}.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const source = (name: string): string => {
    const key = Object.keys(sources).find((k) => k.endsWith(`/${name}`));
    if (!key) throw new Error(`source not globbed: ${name}`);
    return sources[key]!;
  };

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
