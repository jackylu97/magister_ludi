import { describe, expect, it } from 'vitest';

import {
  WAGER_DEAL_LEAD,
  WAGER_LINE_NAME,
  wagerDealHeadline,
  wagerFaces,
  wagerFigure,
  wagerTrackFraction,
} from '../../src/ui/wagerSheet';
import { WAGER_IDS, wagerDef } from '../../src/sim/wagerData';
import type { GameState, WagerDeal } from '../../src/sim/state';

/**
 * **The wager's two surfaces** — the deal sheet and the Abacus's standings band
 * (`docs/wager.md` §2/§11; the mock of 2026-09-09 is the spec of record).
 *
 * Pure builders and `?raw` source reading, no jsdom: this suite's discipline
 * (`beadsScreen.test.ts`'s). Everything that can be quietly wrong is a fold —
 * what a card's eyebrow says, how far along a track a figure sits, whether a
 * stake is marked — and the drawing is `append` calls that fail loudly.
 */

const SOURCES = import.meta.glob(
  [
    '../../src/ui/wagerSheet.ts',
    '../../src/ui/abacusScreen.ts',
    '../../src/ui/beadsScreen.ts',
    '../../src/ui/turnBlockers.ts',
    '../../src/main.ts',
    '../../index.html',
  ],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  for (const [path, text] of Object.entries(SOURCES)) {
    if (path.endsWith(name)) {
      expect(text.length, name).toBeGreaterThan(0);
      return text;
    }
  }
  throw new Error(`no source for ${name}`);
}

/** A table with three chosen cards and one seat that has staked the middle one. */
function board(staked: number | null): { state: GameState; deal: WagerDeal } {
  const dealt = ['solventRealm', 'academies', 'theChronicle'];
  const deal: WagerDeal = {
    age: 2,
    dealt,
    dealtOn: 40,
    opening: [{ playerId: 0, at: [0, 0, 0] }],
    claimed: [],
  };
  const state = {
    players: [
      {
        id: 0,
        name: 'Ada',
        wager: staked === null ? undefined : { age: 2, index: staked },
      },
    ],
    wagers: [deal],
  } as unknown as GameState;
  return { state, deal };
}

describe('the deal sheet', () => {
  it('names every thread the deck can be dealt under', () => {
    // A card whose thread had no word would print an empty eyebrow, which is the
    // one thing on the face a player uses to tell three cards apart at a glance.
    for (const id of WAGER_IDS) {
      const line = wagerDef(id).line;
      expect(WAGER_LINE_NAME[line], line).toBeTruthy();
    }
  });

  it('gives each card its thread, its family and its bar', () => {
    const { state, deal } = board(null);
    const faces = wagerFaces(state, 0, deal);
    expect(faces).toHaveLength(3);
    expect(faces[0]!.name).toBe(wagerDef('solventRealm').name);
    expect(faces[0]!.eyebrow).toBe('The Long Caravan · economic');
    expect(faces[0]!.bar).toBeGreaterThan(0);
    expect(faces[0]!.note).toBe(wagerDef('solventRealm').note);
    expect(faces.every((face) => !face.staked)).toBe(true);
  });

  it('marks the stake on the staked card and on no other', () => {
    const { state, deal } = board(1);
    const faces = wagerFaces(state, 0, deal);
    expect(faces.map((face) => face.staked)).toEqual([false, true, false]);
  });

  it('says a compound card asks all its clauses at once', () => {
    const deal: WagerDeal = {
      age: 2,
      dealt: ['capitalOfTheWorld'],
      dealtOn: 1,
      opening: [],
      claimed: [],
    };
    const state = { players: [{ id: 0, name: 'Ada' }], wagers: [deal] } as unknown as GameState;
    const face = wagerFaces(state, 0, deal)[0]!;
    expect(face.bar).toBe(3);
    expect(face.clauses).toContain('at once');
  });

  it('names the age in the masthead and puts no number in the prose', () => {
    // Hard rule 7, and the user's mark on the mock: the clock's mechanics are
    // not shown to the player, so there is no countdown here and no figure in a
    // sentence — the figures are beside their labels on the cards.
    expect(wagerDealHeadline({ age: 3 } as WagerDeal)).toContain('Æra III');
    expect(wagerDealHeadline({ age: 3 } as WagerDeal)).not.toMatch(/\d/);
    expect(WAGER_DEAL_LEAD).not.toMatch(/\d/);
  });

  it('has no "you stand at" line and no age-mechanics line', () => {
    // Both are marked absences on the mock, not omissions: every seat is at
    // nought on the deal turn by construction, and the countdown lives on the
    // top bar's age card alone.
    const sheet = source('wagerSheet.ts');
    expect(sheet).not.toContain('you stand at');
    expect(sheet).not.toContain('closes in');
    const html = source('index.html');
    const start = html.indexOf('id="wager-overlay"');
    const masthead = html.slice(start, html.indexOf('id="wager-body"', start));
    expect(masthead).not.toMatch(/countdown|closes|Æra/);
  });

  it('builds on the shell and binds no window listener of its own', () => {
    const sheet = source('wagerSheet.ts');
    expect(sheet).toContain('createModalShell({');
    expect(sheet).not.toContain("window.addEventListener('keydown'");
  });

  it('is registered for disposal like every other screen', () => {
    expect(source('main.ts')).toContain('gameDisposers.push(() => wagerSheet?.dispose());');
  });
});

describe('the track and the figure', () => {
  it('is a fraction of the bar, clamped at both ends', () => {
    expect(wagerTrackFraction(0, 10)).toBe(0);
    expect(wagerTrackFraction(5, 10)).toBe(0.5);
    expect(wagerTrackFraction(30, 10)).toBe(1);
    // A signed reading can stand below nought — the exchange of a losing war, a
    // treasury under water — and a bar drawn backwards is not a reading.
    expect(wagerTrackFraction(-4, 10)).toBe(0);
    expect(wagerTrackFraction(4, 0)).toBe(0);
  });

  it('follows the bar’s own precision', () => {
    // The one reading that is not a whole number is a ratio, and printing its
    // standing whole would show every seat at the same figure as the bar.
    expect(wagerFigure(12.4, 10)).toBe('12');
    expect(wagerFigure(2.63, 4.5)).toBe('2.6');
  });
});

describe('the Abacus, reworked', () => {
  const abacus = source('abacusScreen.ts');

  it('draws the band above the rods and keeps the rods', () => {
    expect(abacus).toContain('function drawWagerBand(');
    expect(abacus).toContain('abacusRodSlots(row.beads, threshold)');
  });

  it('ranks every seat and marks a bar that seat has met', () => {
    expect(abacus).toContain('abacus-wager-track');
    expect(abacus).toContain("line.classList.add('is-met')");
  });

  it('marks the stake on the local seat’s own card only', () => {
    // The secrecy rule kept by construction: a rival's stake is not in
    // `WagerBoard` at all, so the drawing could not leak one if it tried.
    const band = abacus.slice(abacus.indexOf('function drawWagerBand('));
    const body = band.slice(0, band.indexOf('\n  /**', 1));
    expect(body).toContain('board.face.staked');
    expect(body).not.toContain('row.staked');
  });

  it('names no first claimant', () => {
    // §11: a wager is a bar any number of seats may meet, so a seat that has met
    // it wears the mark on its own row and nothing names who got there first.
    expect(abacus).not.toContain('claimed by');
    expect(abacus).not.toContain('first to');
  });

  it('repaints the register when a wager is kept', () => {
    const refresh = abacus.slice(abacus.indexOf('    refresh: () => {'));
    const body = refresh.slice(0, refresh.indexOf('dispose:'));
    expect(body).toContain('if (open) drawRegister(rows());');
  });
});

describe('the deed sheet’s age draw, retired', () => {
  it('no longer raises itself on the age', () => {
    const beads = source('beadsScreen.ts');
    expect(beads).not.toContain('announceAge');
    expect(beads).not.toContain('drawBanner');
  });

  it('is the wager’s deal sheet that the age raises now', () => {
    const main = source('main.ts');
    const pump = main.slice(main.indexOf('function pumpBeadNews()'));
    const body = pump.slice(0, pump.indexOf('\n  }'));
    expect(body).toContain('wagerSheet.open()');
    expect(body).not.toContain('announceAge');
  });

  it('leaves the deed tables one press away', () => {
    // Nothing the banner listed was lost with it: the whole table is still drawn
    // and still reached three ways — the bead chip, an Abacus rod, and `V`.
    const beads = source('beadsScreen.ts');
    expect(beads).toContain('function drawAge(');
    expect(beads).toContain('function drawFeats(');
    expect(beads).toContain('function drawReckonings(');
    expect(source('main.ts')).toContain('onToggleBeads: () => beads?.toggle(),');
  });
});

describe('the blocker', () => {
  it('is the fifth offer and reads the simulation’s own rule', () => {
    const blockers = source('turnBlockers.ts');
    expect(blockers).toContain("{ kind: 'wager' }");
    expect(blockers).toContain('wagerBlocker(state, playerId)');
    // Below the four offers: all five can be outstanding at once and something
    // has to be last.
    expect(blockers.indexOf('wagerBlocker(state, playerId)')).toBeGreaterThan(
      blockers.indexOf('greatPersonBlocker(player)'),
    );
  });
});
