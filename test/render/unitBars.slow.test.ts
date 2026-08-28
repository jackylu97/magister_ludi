/**
 * The health-bar invariant under a randomised game — `unitBars.test.ts`'s sweep.
 *
 * Slow by kind (a sweep over seeds), so it lives here rather than beside the
 * named sequences. What it buys over them is coverage of the *combinations*: a
 * fight that lands while three other pieces are mid-march, a resolution that
 * heals and marches and kills in one press, a stack that forms and breaks, the
 * seam, and the compaction of `state.units` behind every death. Sixty games of
 * three hundred moves each, auditing every drawn bar on two frames of every
 * step, is about ten thousand audits — which is the net a hand-written sequence
 * cannot cast.
 *
 * The claim is exactly the file next door's: **every drawn bar belongs to one
 * unit and says that unit's own `hp / maxHp`, and every unit that should be on
 * the board has a bar iff it is hurt.** Nothing about *when* — the audit runs
 * both mid-animation and after everything has settled, and expects the same
 * answer from both.
 */

import { describe, expect, it } from 'vitest';

import { walkedPrefix } from '../../src/render/animation';
import { BoardGeometry } from '../../src/render3d/board3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { applyCommand } from '../../src/sim/commands';
import { getTileAt } from '../../src/sim/map';
import { findPath } from '../../src/sim/pathfind';
import { makeRng, nextInt } from '../../src/sim/rng';
import { createUnit } from '../../src/sim/state';
import type { UnitTypeId } from '../../src/sim/unitData';

import { RendererBeat, barComplaints, flatState } from './unitBarHelpers';

/** Enough to walk every hex of a fourteen-wide board several times over. */
const GAMES = 60;
const STEPS = 300;
const ROSTER: UnitTypeId[] = ['warrior', 'spearman', 'archer'];

describe('the health bar under a randomised game', () => {
  it('never draws a bar that is not its own unit\'s fraction', () => {
    const board = new BoardGeometry();
    const materials = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
    const failures: string[] = [];

    for (let seed = 1; seed <= GAMES && failures.length === 0; seed++) {
      const state = flatState(seed, 14, 10);
      const rng = makeRng(seed * 104729 + 11);
      for (let i = 0; i < 5; i++) createUnit(state, 0, ROSTER[i % 3]!, 2 + i, 2 + (i % 3));
      for (let i = 0; i < 5; i++) createUnit(state, 1, ROSTER[i % 3]!, 8 + (i % 3), 3 + i);
      // Two civilians, so stacks form and the fan puts more than one bar on a hex.
      createUnit(state, 0, 'settler', 2, 6);
      createUnit(state, 0, 'worker', 3, 6);
      const beat = new RendererBeat(state, board, materials, 0);
      let now = 0;

      for (let step = 0; step < STEPS && failures.length === 0; step++) {
        // The seat watches everything: this is a test about health, not fog, and
        // a hidden piece would simply be one the audit expects nothing of.
        for (const grid of state.visibility) grid.fill(2);
        now += 1;
        beat.frame(now);

        const roll = nextInt(rng, 0, 100);
        const mine = state.units.filter((unit) => unit.ownerId === step % 2);
        const actor = mine[nextInt(rng, 0, Math.max(1, mine.length))];
        if (actor && roll < 45) {
          const foe = state.units.find(
            (unit) =>
              unit.ownerId !== actor.ownerId &&
              Math.abs(unit.col - actor.col) <= 1 &&
              Math.abs(unit.row - actor.row) <= 1,
          );
          if (foe) {
            beat.skipAnimations();
            applyCommand(state, {
              type: 'attack',
              playerId: actor.ownerId,
              unitId: actor.id,
              target: { col: foe.col, row: foe.row },
            });
            now += 10;
            beat.frame(now);
          }
        } else if (actor && roll < 85) {
          const target = getTileAt(
            state.map,
            nextInt(rng, 0, state.map.width),
            nextInt(rng, 0, state.map.height),
          );
          if (target) {
            const route = findPath(state, actor, target) ?? [];
            const from = { col: actor.col, row: actor.row };
            beat.skipAnimations();
            const moved = applyCommand(state, {
              type: 'moveUnit',
              playerId: actor.ownerId,
              unitId: actor.id,
              target: { col: target.col, row: target.row },
            });
            if (moved.ok) {
              const walked = walkedPrefix(route, { col: actor.col, row: actor.row });
              if (walked.length > 0) beat.animateMove(actor.id, from, walked, now);
            }
            now += 20;
            beat.frame(now);
          }
        } else {
          applyCommand(state, { type: 'endTurn', playerId: 0 });
          applyCommand(state, { type: 'endTurn', playerId: 1 });
          beat.skipAnimations();
          now += 50;
          beat.frame(now);
        }

        // Mid-animation, then again once every walk has run its course.
        let bad = barComplaints(state, beat.units, board, beat.drawn());
        if (bad.length > 0) failures.push(`seed ${seed} step ${step} mid: ${bad.join('; ')}`);
        now += 2000;
        beat.frame(now);
        bad = barComplaints(state, beat.units, board, beat.drawn());
        if (bad.length > 0) failures.push(`seed ${seed} step ${step} settled: ${bad.join('; ')}`);
      }
      beat.dispose();
    }

    expect(failures).toEqual([]);
    board.dispose();
  }, 120_000);
});
