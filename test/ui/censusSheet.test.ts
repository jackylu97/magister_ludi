import { describe, expect, it } from 'vitest';

import {
  CENSUS_FOOT,
  CENSUS_STAT_WORDS,
  censusPage,
  censusRankMark,
} from '../../src/ui/censusSheet';
import { CENSUS_STATS } from '../../src/sim/census';
import type { CensusRecord, GameState } from '../../src/sim/state';
import { triumphDef } from '../../src/sim/triumphData';
import { RULES } from '../../src/sim/rulesData';
import { braceBody, uiSource } from './sourceHelpers';

/**
 * **The census's two surfaces** — the sheet and the Abacus's memory of it
 * (`docs/wager.md` §10/§11; the mock of 2026-09-09's third and fourth sheets are
 * the spec of record).
 *
 * Pure builders and `?raw` source reading, no jsdom: this suite's discipline
 * (`wagerSheet.test.ts`'s, and `beadsScreen.test.ts`' before it). Everything
 * that can be quietly wrong is a fold — the masthead's sentence, the order of
 * the rows, how long a track is, which row is lifted, whether the Triumph block
 * is drawn — and the drawing is `append` calls that fail loudly.
 *
 * Three of the user's marks on the mock are pinned here as *absences*, because
 * an absence is exactly the kind of ruling that comes back by accident: no
 * "flavour" label on the taker, no age-progression line in the masthead, and no
 * second Triumph sheet on top of this one.
 */

/** A census of four seats on one figure, with the middle seat's own row lifted. */
function board(leaderId: number | null): { state: GameState; record: CensusRecord } {
  const record: CensusRecord = {
    turn: 42,
    stat: 'science',
    rows: [
      { playerId: 1, figure: 41 },
      { playerId: 0, figure: 33 },
      { playerId: 2, figure: 23 },
      { playerId: 3, figure: 0 },
    ],
    leaderId,
    taker: 'Hipparchus',
  };
  const state = {
    players: [
      { id: 0, name: 'Ada', color: '#a00' },
      { id: 1, name: 'Bors', color: '#0a0' },
      { id: 2, name: 'Cleo', color: '#00a' },
      { id: 3, name: 'Dag', color: '#aa0' },
    ],
  } as unknown as GameState;
  return { state, record };
}

// --- 1. the page ------------------------------------------------------------

describe('the census page', () => {
  it('reads the record, in the order the clerks wrote it', () => {
    const { state, record } = board(1);
    const page = censusPage(state, 0, record)!;
    expect(page.turn).toBe(42);
    expect(page.rows.map((row) => row.name)).toEqual(['Bors', 'Ada', 'Cleo', 'Dag']);
    expect(page.rows.map((row) => row.rank)).toEqual(['i', 'ii', 'iii', 'iv']);
  });

  it('says who took it and what was measured — and labels neither as flavour', () => {
    const { state, record } = board(1);
    const page = censusPage(state, 0, record)!;
    expect(page.takerLine).toBe('Hipparchus has taken the census of the world’s');
    expect(page.statWord).toBe('science');
    expect(page.statRate).toBe(' a turn');
    // The user's mark of 2026-09-09: **no "flavour" label** on the taker's name.
    expect(page.takerLine.toLowerCase()).not.toContain('flavour');
  });

  it('lifts the local seat’s row and nobody else’s', () => {
    const { state, record } = board(1);
    expect(censusPage(state, 0, record)!.rows.filter((row) => row.you).map((row) => row.name)).toEqual(
      ['Ada'],
    );
    expect(censusPage(state, 2, record)!.rows.filter((row) => row.you).map((row) => row.name)).toEqual(
      ['Cleo'],
    );
  });

  it('scales every track to the leading figure, and never backwards', () => {
    const { state, record } = board(1);
    const page = censusPage(state, 0, record)!;
    expect(page.rows.map((row) => Math.round(row.fraction * 100))).toEqual([100, 80, 56, 0]);

    // A signed reading — a treasury in the red — clamps to nothing rather than
    // drawing a track the wrong way.
    record.rows = [
      { playerId: 0, figure: 4 },
      { playerId: 1, figure: -9 },
    ];
    const red = censusPage(state, 0, record)!;
    expect(red.rows[1]!.fraction).toBe(0);
  });

  it('draws no track at all on a page of noughts', () => {
    const { state, record } = board(null);
    record.rows = record.rows.map((row) => ({ ...row, figure: 0 }));
    const page = censusPage(state, 0, record)!;
    expect(page.rows.every((row) => row.fraction === 0)).toBe(true);
    expect(page.rows.every((row) => !row.leader)).toBe(true);
  });

  it('skips a census measured on a figure this build no longer knows', () => {
    // A save is a save: half a page is a worse answer than a blank screen, but a
    // *wrong* page is worse than either, so a record naming a retired figure is
    // skipped whole.
    const { state, record } = board(1);
    record.stat = 'somethingRetired';
    expect(censusPage(state, 0, record)).toBeNull();
  });
});

// --- 2. the Triumph, inside the sheet ---------------------------------------

describe('the Triumph inside the sheet', () => {
  it('is drawn on the leader’s own sheet and on nobody else’s', () => {
    const { state, record } = board(0);
    const mine = censusPage(state, 0, record)!;
    expect(mine.triumph).not.toBeNull();
    expect(mine.triumph!.pays).toBe(RULES.census.renown);
    expect(mine.triumph!.name).toBe(triumphDef('censusLeader').name);
    expect(mine.triumph!.text).toBe(triumphDef('censusLeader').text);
    // A rival's renown is not news that belongs on a page about the world.
    expect(censusPage(state, 1, record)!.triumph).toBeNull();
    expect(censusPage(state, 0, board(null).record)!.triumph).toBeNull();
  });

  it('marks the leader’s row', () => {
    const { state, record } = board(1);
    const page = censusPage(state, 0, record)!;
    expect(page.rows.filter((row) => row.leader).map((row) => row.name)).toEqual(['Bors']);
  });

  it('raises no second sheet, and the suppression is a marker on the row', () => {
    // The user, 2026-09-09: "let's not show both a triumph modal for winning the
    // census and the census modal". `reportTriumphs` keeps its chronicle line —
    // the log is the record — and skips the *sheet* for a row that says so.
    const controls = uiSource('controls.ts');
    const body = braceBody(controls, 'function reportTriumphs(');
    expect(body).toContain('announce(');
    expect(body).toContain('triumphDef(triumph.id).quiet === true');
    // And it is a marker, never a name: nothing anywhere compares an id.
    expect(controls).not.toContain("'censusLeader'");
    expect(uiSource('censusSheet.ts')).not.toContain("'censusLeader'");
  });
});

// --- 3. the words -----------------------------------------------------------

describe('the words', () => {
  it('names every figure the world can measure', () => {
    for (const stat of CENSUS_STATS) {
      const words = CENSUS_STAT_WORDS[stat];
      expect(words, stat).toBeDefined();
      expect(words.word.length, stat).toBeGreaterThan(0);
      // Hard rule 7: no digits in prose, and no identifiers.
      expect(/\d/.test(words.word), stat).toBe(false);
      expect(words.word, stat).toBe(words.word.toLowerCase());
    }
  });

  it('counts the ranks the way the mock does', () => {
    expect([1, 2, 3, 4, 5, 8, 9, 10].map(censusRankMark)).toEqual([
      'i',
      'ii',
      'iii',
      'iv',
      'v',
      'viii',
      'ix',
      'x',
    ]);
  });

  it('sends the reader to the Abacus for the last one', () => {
    expect(CENSUS_FOOT).toContain('Abacus');
  });
});

// --- 4. the sheet, the blocker and the band ---------------------------------

describe('the sheet', () => {
  it('is the twelfth on the shell, with its overlay and its disposer', () => {
    const sheet = uiSource('censusSheet.ts');
    expect(sheet).toContain('createModalShell(');
    const html = uiSource('index.html');
    expect(html).toContain('id="census-overlay"');
    expect(html).toContain('class="statecraft-overlay"');
    expect(html).toContain('id="census-close"');
    expect(html).toContain('id="census-body"');
    expect(uiSource('main.ts')).toContain('gameDisposers.push(() => censusSheet?.dispose());');
  });

  it('sends the dismissal down one path and one path only', () => {
    // Every door — the ×, Escape, the ground, "Close the book" — reaches the
    // shell's `onClose`, which is where the command is sent. Two writers would
    // be one refusal the reducer never had to see.
    const sheet = uiSource('censusSheet.ts');
    expect(sheet).toContain("close.addEventListener('click', () => shell.close())");
    expect(sheet).toContain('onClose: () => {\n      options.dismiss();');
    expect(uiSource('main.ts')).toContain("type: 'dismissCensus'");
  });

  it('carries no age-progression line in its masthead', () => {
    // The user's mark of 2026-09-09: the clock's mechanics are not shown to the
    // player, and the top bar's age card is the one place the deadline lives.
    const html = uiSource('index.html');
    const overlay = html.slice(html.indexOf('id="census-overlay"'));
    const head = overlay.slice(0, overlay.indexOf('census-body'));
    expect(head).not.toContain('Æra');
    expect(head.toLowerCase()).not.toContain('closes in');
    expect(uiSource('censusSheet.ts')).not.toContain('eraWord');
  });
});

describe('the blocker', () => {
  it('is the sixth and reads the simulation’s own rule', () => {
    const blockers = uiSource('turnBlockers.ts');
    expect(blockers).toContain("{ kind: 'census' }");
    expect(blockers).toContain('censusBlocker(state, playerId)');
    // Below the fifth: all six can be outstanding at once and something has to
    // be last, and a page of figures waits behind every open decision.
    expect(blockers.indexOf('censusBlocker(state, playerId)')).toBeGreaterThan(
      blockers.indexOf('wagerBlocker(state, playerId)'),
    );
    expect(uiSource('main.ts')).toContain("census: 'Read the census'");
  });
});

describe('the Abacus band', () => {
  it('keeps the last census readable, off the record and not a second store', () => {
    const abacus = uiSource('abacusScreen.ts');
    expect(abacus).toContain('function drawCensusBand(');
    expect(braceBody(abacus, 'function drawRegister(')).toContain('drawCensusBand()');
    // The band reads the same fold the sheet does, handed in as a closure — the
    // screen has never known about the simulation.
    expect(abacus).toContain('census?: () => CensusPage | null');
    const main = uiSource('main.ts');
    expect(main).toContain('censusPage(game.state, controls.localPlayerId(), record)');
    expect(main).toContain('lastCensus(game.state)');
  });

  it('marks the leader’s row rather than re-awarding anything', () => {
    const band = braceBody(uiSource('abacusScreen.ts'), 'function drawCensusBand(');
    expect(band).toContain('row.leader');
    expect(band).not.toContain('renown');
  });

  it('has a style for every class it draws', () => {
    const css = uiSource('style.css');
    for (const rule of [
      '.census-title',
      '.census-taker',
      '.census-stat',
      '.census-ranking',
      '.census-row',
      '.census-row.is-you',
      '.census-track',
      '.census-figure',
      '.census-triumph',
      '.census-close-book',
      '.census-foot',
      '.abacus-census',
      '.abacus-census-row',
      '.abacus-census-mark',
    ]) {
      expect(css, rule).toContain(`${rule} {`);
    }
  });
});
