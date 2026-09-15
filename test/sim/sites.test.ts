/**
 * **The site reading** — `docs/flags.md` item (ttttt), 2026-09-15.
 *
 * The user: *"could we implement a map icon for recommended city settlement
 * locations, like in civ? hovering over it should give some indicator… It should
 * only appear in the settler lens."*
 *
 * The ruling's own words are "one reading, shared", and that is what this file
 * is written to pin. Four claims, each of which could be false while every
 * number on the board still added up:
 *
 *   1. **The total is the fold of the list** (rule 5). A line folded without
 *      being printed would balance and would be invisible, and the marker's
 *      whole promise is that the sentence under the cursor is the reason for the
 *      mark on the ground.
 *   2. **The gates belong to the sweep, not to the reading.** `rankSites` shows
 *      nothing on ground the rules refuse a city on and nothing on ground this
 *      seat has never charted; `explainSite` itself has no opinion about either,
 *      which is what lets the bot ask it about a hex it is only considering.
 *   3. **A seam pays the ledger only where the empire could be told about it**,
 *      and the *whole* list of seams is carried beside the nameable half — the
 *      two readers want opposite halves of the reveal gate and both are in the
 *      one reading.
 *   4. **The memo is the revision.** One sweep per revision, and a fresh one the
 *      moment the world moves.
 *
 * Core tier: a fold over one small board, plus the memo's identity check.
 */

import { describe, expect, it } from 'vitest';

import { getTileAt, mapRange, tileHex } from '../../src/sim/map';
import { readSites } from '../../src/sim/readings';
import { RULES } from '../../src/sim/rulesData';
import {
  explainSite,
  foldSite,
  rankSites,
  siteWorth,
} from '../../src/sim/sites';
import { foundingErrorAt } from '../../src/sim/cities';
import { EXPLORED, HIDDEN, isExploredBy } from '../../src/sim/visibility';
import { bumpRevision, playerById } from '../../src/sim/state';
import { foldTileLines, explainTileYield, yieldContextFor } from '../../src/sim/yields/hex';
import { game } from './statecraftHelpers';

/** A hex the seat's settler is standing beside, charted and legal to found on. */
function openGround(state: ReturnType<typeof game>['state']) {
  const settler = state.units.find((unit) => unit.ownerId === 0)!;
  const here = getTileAt(state.map, settler.col, settler.row)!;
  for (const tile of mapRange(state.map, tileHex(here), 3)) {
    if (foundingErrorAt(state, 0, tile) === null) return tile;
  }
  return here;
}

describe('the site reading', () => {
  it('folds its own list, and prints every line it folded', () => {
    const { state } = game();
    const site = explainSite(state, 0, openGround(state));
    expect(site.total).toBe(foldSite(site.lines));
    // Not vacuous: a site always prints the ground a young town would work, and
    // that line is the fold of the hexes it counted.
    expect(site.lines.length).toBeGreaterThan(0);
    expect(site.lines[0]!.label).toMatch(/ground a young town would work/);
  });

  it('counts the hexes a young town would have hands for, not the whole ring', () => {
    const { state } = game();
    const site = explainSite(state, 0, openGround(state));
    const ring = mapRange(state.map, tileHex(openGround(state)), RULES.sites.ringRadius).length;
    expect(site.ring).toHaveLength(ring);
    // The printed ground line is the best few of them, never all of them.
    expect(RULES.sites.workedHexes).toBeLessThan(ring);
    expect(site.lines[0]!.label).toContain(`${RULES.sites.workedHexes} hexes`);
  });

  it('weighs a hex through the rules’ one table, and the ring carries the answer', () => {
    const { state } = game();
    const site = explainSite(state, 0, openGround(state));
    for (const hex of site.ring) {
      const tile = getTileAt(state.map, hex.col, hex.row)!;
      // The weighing is the sim's, and the ring row already holds it — which is
      // exactly what stops the bot from applying a second table of its own.
      // Through the **seat's** own eyes, never the omniscient reading: that is
      // rule 5's ctx clause, and it is the difference this line would miss if it
      // asked `explainTileYield` with no context at all.
      expect(hex.worth).toBeCloseTo(
        siteWorth(foldTileLines(explainTileYield(tile, yieldContextFor(state, 0)))),
        6,
      );
      expect(hex.yields.food).toBeGreaterThanOrEqual(0);
    }
  });

  it('carries the whole list of seams beside the nameable half', () => {
    const { state } = game();
    const here = openGround(state);
    const ring = mapRange(state.map, tileHex(here), RULES.sites.ringRadius);
    // A seam nobody can name yet, planted on a ring hex that is not the centre.
    const seat = ring.find((tile) => tile.col !== here.col || tile.row !== here.row)!;
    seat.resource = 'iron';
    bumpRevision(state);
    const site = explainSite(state, 0, here);
    // It is *there* — the settler's own appraisal reads this half, because a
    // seam is worth holding whether or not the empire has heard of it.
    expect(site.seams.map((seam) => seam.id)).toContain('iron');
    // And it pays the printed ledger nothing until the empire can name it.
    expect(site.strategics).not.toContain('iron');
    expect(site.lines.map((line) => line.label).join(' ')).not.toMatch(/Iron in reach/);

    const player = playerById(state, 0)!;
    if (!player.techsResearched.includes('bronzePanoply')) {
      player.techsResearched.push('bronzePanoply');
    }
    bumpRevision(state);
    const seeing = explainSite(state, 0, here);
    expect(seeing.strategics).toContain('iron');
    expect(seeing.total).toBeGreaterThan(site.total);
  });

  it('has no opinion about foundability — that is the sweep’s', () => {
    const { state } = game();
    // A hex the rules refuse (a town's own) still reads as ground, because the
    // bot asks this of hexes it is only considering and a refusal is a different
    // question with a different answer.
    const settler = state.units.find((unit) => unit.ownerId === 0)!;
    const here = getTileAt(state.map, settler.col, settler.row)!;
    const site = explainSite(state, 0, here);
    expect(site.total).toBe(foldSite(site.lines));
    expect(site.ring.length).toBeGreaterThan(1);
  });
});

describe('the sweep', () => {
  it('recommends nothing the rules would refuse a city on', () => {
    const { state } = game();
    for (const candidate of rankSites(state, 0)) {
      const tile = getTileAt(state.map, candidate.col, candidate.row)!;
      expect(
        foundingErrorAt(state, 0, tile),
        `(${candidate.col},${candidate.row}) is recommended and refused`,
      ).toBeNull();
    }
  });

  it('recommends nothing on ground this seat has never charted', () => {
    const { state } = game();
    for (const candidate of rankSites(state, 0)) {
      expect(
        isExploredBy(state, 0, candidate.col, candidate.row),
        `(${candidate.col},${candidate.row}) is recommended and unseen`,
      ).toBe(true);
    }
    // And it is the chart that is doing it: black out the map and the list goes
    // empty, on a board where nothing else moved.
    expect(rankSites(state, 0).length).toBeGreaterThan(0);
    state.visibility[0]!.fill(HIDDEN);
    bumpRevision(state);
    expect(rankSites(state, 0)).toHaveLength(0);
  });

  it('shows no more than the board is allowed to mark, best first', () => {
    const { state } = game();
    state.visibility[0]!.fill(EXPLORED);
    bumpRevision(state);
    const ranked = rankSites(state, 0);
    expect(ranked.length).toBeLessThanOrEqual(RULES.ui.recommendedSites);
    expect(ranked.length).toBeGreaterThan(0);
    for (let index = 1; index < ranked.length; index++) {
      expect(ranked[index - 1]!.reading.total).toBeGreaterThanOrEqual(ranked[index]!.reading.total);
    }
    // And every one of them clears the floor: a recommendation of the least bad
    // hex on a bad continent is worse than no recommendation.
    for (const candidate of ranked) {
      expect(candidate.reading.total).toBeGreaterThanOrEqual(RULES.sites.scoreFloor);
    }
  });
});

describe('the memo is the revision', () => {
  it('sweeps once until the world moves, and again the moment it does', () => {
    const { state } = game();
    const held = readSites(state, 0);
    expect(readSites(state, 0)).toBe(held);
    bumpRevision(state);
    const fresh = readSites(state, 0);
    expect(fresh).not.toBe(held);
    // A fresh list and the same answer: the memo is a cache and never a rule.
    expect(fresh.map((row) => `${row.col},${row.row}`)).toEqual(
      held.map((row) => `${row.col},${row.row}`),
    );
  });
});
