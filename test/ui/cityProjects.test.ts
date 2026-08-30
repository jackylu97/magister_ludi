/**
 * The one thing the city panel had to *decide* when repeatable projects landed:
 * where a newly-pressed build row goes.
 *
 * A project never leaves the queue (Entry XXVI), so the panel's old rule —
 * append — would have put every future warrior behind a row that is never
 * reached, and the queue would have silently stopped the first time a player
 * pressed Tithes. `insertionIndex` is that decision extracted from the panel's
 * DOM, the way `stageRows` is (this suite has no jsdom), and it is worth
 * holding still because the failure it prevents is invisible from every other
 * angle: nothing errors, nothing is refused, the town just quietly builds
 * nothing but coin for the rest of the game.
 *
 * The rest of the file pins the two labels the panel and the star chart print
 * off the *rules* rather than off a hand-written string, so a retuned project
 * cost cannot leave a stale sentence behind it.
 */

import { describe, expect, it } from 'vitest';

import { PROJECT_IDS, projectDef, projectRate } from '../../src/sim/projectData';
import type { QueueItem } from '../../src/sim/state';
import { PROJECT_GLYPHS, PROJECT_SPOKEN } from '../../src/ui/figures';
import { insertionIndex } from '../../src/ui/cityPanel';

const WARRIOR: QueueItem = { kind: 'unit', id: 'warrior' };
const GRANARY: QueueItem = { kind: 'building', id: 'granary' };
const TITHES: QueueItem = { kind: 'project', id: 'tithes' };
const SCHOLARSHIP: QueueItem = { kind: 'project', id: 'scholarship' };

describe('a new build row goes in front of the standing order', () => {
  it('appends when nothing is standing', () => {
    expect(insertionIndex([])).toBe(0);
    expect(insertionIndex([WARRIOR])).toBe(1);
    expect(insertionIndex([WARRIOR, GRANARY])).toBe(2);
  });

  it('lands in front of a project at the back', () => {
    expect(insertionIndex([TITHES])).toBe(0);
    expect(insertionIndex([WARRIOR, TITHES])).toBe(1);
    expect(insertionIndex([WARRIOR, GRANARY, TITHES])).toBe(2);
  });

  it('lands in front of the whole trailing run, not just the last row', () => {
    // Two projects together is a player saying "mint coin, and then copy books,
    // when there is nothing else" — a warrior belongs in front of both.
    expect(insertionIndex([WARRIOR, TITHES, SCHOLARSHIP])).toBe(1);
    expect(insertionIndex([TITHES, SCHOLARSHIP])).toBe(0);
  });

  it('respects a project the player deliberately moved up', () => {
    // Moved to the front on purpose: the run that counts is the *trailing* one,
    // so this queue's new row still goes at the back, behind the granary and
    // behind the project the player put first. The panel does not second-guess
    // an arrangement the player made with the ↑ button.
    expect(insertionIndex([TITHES, WARRIOR, GRANARY])).toBe(3);
  });
});

describe('a project prints its rate from the table', () => {
  it('reads every bank the payout shape declares', () => {
    // The two glyph tables are typed `Record<keyof ProjectPayout, …>`, so this
    // is the runtime half of that: whatever the shape declares, both tables
    // have an entry for, and `projectRate` can therefore never drop a figure.
    for (const key of Object.keys(PROJECT_GLYPHS)) {
      expect(PROJECT_SPOKEN).toHaveProperty(key);
    }
    expect(Object.keys(PROJECT_GLYPHS)).toEqual(Object.keys(PROJECT_SPOKEN));
  });

  it('names something for every project the game ships', () => {
    for (const id of PROJECT_IDS) {
      const drawn = projectRate(id, PROJECT_GLYPHS);
      const spoken = projectRate(id, PROJECT_SPOKEN);
      expect(drawn.length, id).toBeGreaterThan(0);
      expect(spoken.length, id).toBeGreaterThan(0);
      // The spoken form carries no yield glyph at all: a screen reader given
      // one announces its Unicode name before the word it decorates.
      for (const glyph of Object.values(PROJECT_GLYPHS)) {
        expect(spoken.includes(glyph), `${id} spoken`).toBe(false);
      }
      // A **race project** pays no conversion at all — what it pays is a bead
      // and a boon, settled once at the claim (design ledger Entry VI) — so its
      // rate is said in words and there is no figure to find.
      if (projectDef(id).finishes === true) {
        expect(drawn, id).toBe('a bead');
        continue;
      }
      // And the drawn form is the figure beside its mark, off the same row the
      // cost comes from.
      expect(drawn).toContain(String(projectDef(id).pays.gold ?? projectDef(id).pays.science));
    }
  });
});
