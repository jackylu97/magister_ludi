/**
 * **What a bar says, after the board has actually moved.**
 *
 * `pieces3d.test.ts` proves the *geometry*: build the layer from a state and
 * every bar is its own unit's `hp / maxHp`. That is a claim about one build, and
 * the user's third report (2026-08-28, "the bar is incorrect when multiple units
 * are on screen — the health bar over the unit is incorrect") is about the path
 * a build is reached by — a command, a walk in flight, a turn resolution, a seat
 * change — which a one-shot build never exercises.
 *
 * So this file drives the sequence rather than the layer: real commands through
 * `applyCommand`, and the renderer's own order of operations around them, in
 * `RendererBeat` (`unitBarHelpers.ts`). The randomised sweep over that same
 * harness is the `.slow` sibling.
 *
 * Three things the sequence turned up, all of them a piece whose readout stops
 * agreeing with the unit sheet, and all fixed in the pass that added this file:
 *
 *   · **the walking copy carried no bar at all.** The resting piece is hidden
 *     for the length of a march and its bar goes with it (they are in one slot
 *     list), and `spawnWalker` built the sculpt and the badge but nothing else —
 *     so every wounded piece went blank-headed while it moved, and a turn
 *     resolution marches half an army at once.
 *   · **a hide could outlive the walk that put it there.** `stepAnimations`
 *     swept the walker *meshes*, so a walk whose mesh was never built left a
 *     piece hidden for the rest of the session, re-hidden by every rebuild.
 *   · **a hide could outlive the whole game**, because `setMap` cleared the
 *     walkers and not the hides, and a new game's ids start again at one.
 *
 * The fourth report ("the health bar was empty", same day) turned out not to be
 * any of those and not to be in the layer at all — the last describe block below
 * is the elimination, and `hpBarFillWidth` is what it left standing.
 */

import { describe, expect, it } from 'vitest';
import { Mesh, Quaternion } from 'three';

import { walkedPrefix } from '../../src/render/animation';
import { hpBarY } from '../../src/render3d/badges3d';
import { BoardGeometry, pieceHeightFor } from '../../src/render3d/board3d';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { VIEW3D } from '../../src/render3d/lookData';
import { buildHpBar, hpBarFill, hpBarFillWidth } from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { applyCommand } from '../../src/sim/commands';
import { getTileAt } from '../../src/sim/map';
import { findPath } from '../../src/sim/pathfind';
import { type GameState, barbarianPlayer, createUnit } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';

import {
  RendererBeat,
  WRAP_COPIES,
  allUnits,
  barComplaints,
  barInstances,
  barMeshes,
  flatState,
} from './unitBarHelpers';

const HP = VIEW3D.hpBar;
const ANIM = VIEW3D.animation;

const materials = (): MaterialLibrary => new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);

describe('the bar after a command the player actually issued', () => {
  it('says every unit\'s new health the frame after a fight between three neighbours', () => {
    const board = new BoardGeometry();
    const state = flatState();
    // Two of mine adjacent to one of theirs — the board the report describes.
    const left = createUnit(state, 0, 'warrior', 3, 3);
    const right = createUnit(state, 0, 'warrior', 3, 4);
    const foe = createUnit(state, 1, 'warrior', 4, 3);
    const beat = new RendererBeat(state, board, materials());
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);

    // `issueAttack`: skip whatever was sliding, dispatch, then let the loop draw.
    beat.skipAnimations();
    expect(
      applyCommand(state, {
        type: 'attack',
        playerId: 0,
        unitId: left.id,
        target: { col: foe.col, row: foe.row },
      }),
    ).toMatchObject({ ok: true });
    // Somebody was actually hurt, or this test is asserting nothing.
    expect(
      state.units.length < 3 || state.units.some((unit) => unit.hp < unitDef(unit.type).maxHp),
    ).toBe(true);
    beat.frame(1000);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);
    // And the bystander, who was in nobody's fight, is untouched.
    expect(state.units.find((unit) => unit.id === right.id)?.hp).toBe(unitDef('warrior').maxHp);

    beat.dispose();
    board.dispose();
  });

  it('keeps every bar honest across a march that spans a fresh blow', () => {
    const board = new BoardGeometry();
    const state = flatState();
    const walker = createUnit(state, 0, 'warrior', 2, 3);
    const hurt = createUnit(state, 0, 'warrior', 6, 3);
    const foe = createUnit(state, 1, 'warrior', 7, 3);
    hurt.hp = 55;
    const beat = new RendererBeat(state, board, materials());

    // `issueMove`: skip, dispatch, animate the walked prefix.
    beat.skipAnimations();
    const route = findPath(state, walker, getTileAt(state.map, 4, 3)!) ?? [];
    const from = { col: walker.col, row: walker.row };
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: walker.id,
        target: { col: 4, row: 3 },
      }),
    ).toMatchObject({ ok: true });
    const walked = walkedPrefix(route, { col: walker.col, row: walker.row });
    expect(walked.length).toBeGreaterThan(0);
    beat.animateMove(walker.id, from, walked, 0);

    // Mid-stride: the marcher owes no *resting* bar, and the two standing units do.
    beat.frame(10);
    expect(barComplaints(state, beat.units, board, beat.drawn())).toEqual([]);
    expect(beat.drawn().has(walker.id)).toBe(false);

    // A blow lands on somebody else while the march is still in flight. The
    // layer is rebuilt off the fingerprint under a standing hide.
    expect(
      applyCommand(state, {
        type: 'attack',
        playerId: 0,
        unitId: hurt.id,
        target: { col: foe.col, row: foe.row },
      }),
    ).toMatchObject({ ok: true });
    beat.frame(20);
    expect(barComplaints(state, beat.units, board, beat.drawn())).toEqual([]);

    // The walk ends. Everything comes back, at the health the state now holds.
    beat.frame(ANIM.msPerHex * walked.length + 1);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);

    beat.dispose();
    board.dispose();
  });
});

describe('the bar after a turn resolution', () => {
  /** `controls.standingOrders()`: what every piece was holding before the press. */
  function standingOrders(state: GameState) {
    return state.units
      .filter((unit) => unit.path && unit.path.length > 0)
      .map((unit) => ({
        id: unit.id,
        col: unit.col,
        row: unit.row,
        route: unit.path!.map((cell) => ({ col: cell.col, row: cell.row })),
      }));
  }

  it('draws the resolution\'s own health, marches and all', () => {
    const board = new BoardGeometry();
    const state = flatState();
    const marcher = createUnit(state, 0, 'warrior', 2, 3);
    const hurt = createUnit(state, 0, 'warrior', 6, 3);
    const other = createUnit(state, 0, 'warrior', 6, 5);
    const foe = createUnit(state, 1, 'warrior', 7, 3);
    hurt.hp = 40;
    other.hp = 70;
    const beat = new RendererBeat(state, board, materials());

    // A standing order the resolution will walk, and a fight before the press.
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: marcher.id,
        target: { col: 9, row: 3 },
      }),
    ).toMatchObject({ ok: true });
    beat.skipAnimations();
    beat.frame(0);
    expect(
      applyCommand(state, {
        type: 'attack',
        playerId: 0,
        unitId: hurt.id,
        target: { col: foe.col, row: foe.row },
      }),
    ).toMatchObject({ ok: true });
    beat.frame(1);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);

    // `endTurn`: orders captured, both seats end, then skip → animate → frames.
    const orders = standingOrders(state);
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toMatchObject({ ok: true });
    expect(applyCommand(state, { type: 'endTurn', playerId: 1 })).toMatchObject({ ok: true });
    beat.skipAnimations();
    let longest = 0;
    for (const order of orders) {
      const unit = state.units.find((candidate) => candidate.id === order.id);
      if (!unit) continue;
      const walked = walkedPrefix(order.route, { col: unit.col, row: unit.row });
      if (walked.length === 0) continue;
      beat.animateMove(unit.id, { col: order.col, row: order.row }, walked, 0);
      longest = Math.max(longest, Math.min(ANIM.maxMs, ANIM.msPerHex * walked.length));
    }
    expect(longest).toBeGreaterThan(0);

    // Beat one: the board is still marching. Everybody standing still is honest
    // — the healing the resolution just paid included.
    beat.frame(5);
    expect(barComplaints(state, beat.units, board, beat.drawn())).toEqual([]);
    // Beat two: the marches have run out and every piece is back on its tile.
    beat.frame(longest + 1);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);

    beat.dispose();
    board.dispose();
  });

  it('is honest for a seat that is not the one the marches belong to', () => {
    const board = new BoardGeometry();
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 3, 3);
    const theirs = createUnit(state, 1, 'warrior', 4, 3);
    mine.hp = 30;
    theirs.hp = 85;
    // Both seats watch the whole board, so the hot-seat swap changes only which
    // fog grid the layer filters through — never which unit is which.
    for (const grid of state.visibility) grid.fill(2);
    const beat = new RendererBeat(state, board, materials(), 0);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);

    beat.setSeat(1);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);

    beat.dispose();
    board.dispose();
  });
});

/**
 * The walking copy's bar. `buildHpBar` is what `spawnWalker` hangs on each wrap
 * copy, and it has to match the instanced pair exactly — same height, same
 * width, same fraction, backing first — or a wounded piece's readout would jump
 * or change value the moment it started moving.
 */
describe('a piece keeps its bar while it walks', () => {
  it('reads the same fill the resting bar does, and draws nothing at full health', () => {
    const state = flatState();
    const knight = createUnit(state, 0, 'knight', 3, 3);
    expect(hpBarFill(knight)).toBeNull();
    // 60 of a knight's 120, which is where a bar measured against a hundred
    // would say half again as much as it should.
    knight.hp = 60;
    expect(hpBarFill(knight)).toBeCloseTo(60 / unitDef('knight').maxHp, 12);
    expect(unitDef('knight').maxHp).not.toBe(100);
  });

  it('hangs the two quads where the resting bar hangs them', () => {
    const board = new BoardGeometry();
    const height = pieceHeightFor('warrior');
    const bar = buildHpBar(board, materials(), new Quaternion(), height, 0.25);
    const quads = bar.children.filter((child): child is Mesh => child instanceof Mesh);
    expect(quads).toHaveLength(2);

    // The identity camera makes world +x the bar's own left-to-right, so the
    // backing starts half a bar west of the piece and rides at `hpBarY`.
    const [backing, fill] = quads as [Mesh, Mesh];
    expect(backing.position.x).toBeCloseTo(-HP.width / 2, 9);
    expect(backing.position.y).toBeCloseTo(hpBarY(height), 9);
    expect(backing.scale.x).toBeCloseTo(HP.width, 9);
    expect(fill.position.y).toBeCloseTo(hpBarY(height), 9);
    expect(fill.scale.x).toBeCloseTo(HP.width * 0.25, 9);
    // The fill claims its own draw order, one above the backing's, so the walking
    // copy is layered by the same *statement* as the instanced pair rather than
    // by the order the two meshes happened to be built in. `pieces3d.test.ts`
    // pins the instanced half against reversed ids.
    expect(backing.renderOrder).toBe(RENDER_ORDER.hpBar);
    expect(fill.renderOrder).toBe(RENDER_ORDER.hpBarFill);
    // Never culled: a bar is a two-pixel sliver whose own bounding sphere is
    // smaller than the piece under it, and a fill culled while its backing
    // survived would read exactly as an empty bar.
    for (const quad of quads) expect(quad.frustumCulled).toBe(false);

    board.dispose();
  });
});

/**
 * The sequence `RendererBeat` copies, read back out of `renderer3d.ts`.
 *
 * A behavioural test over a copy is only worth the copy staying true, and the
 * failure mode of a drift is silent: the suite would go on proving the bar right
 * in a sequence the game no longer runs. So the copy names what it depends on
 * and this asserts each of those is still there — including the three fixes
 * above, each of which is a line whose absence nothing else would notice.
 */
describe('the sequence the bar audit copies is still the renderer\'s', () => {
  /**
   * The renderer's own text, through Vite's raw glob rather than `node:fs` —
   * this project has no node typings, and `test/ui/seatRoster.test.ts` reads its
   * sources the same way for the same reason.
   */
  const SOURCE = import.meta.glob('../../src/render3d/renderer3d.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const source = Object.values(SOURCE)[0]!;

  it('rebuilds the layer, re-applies the walks in flight, then stamps the hash', () => {
    const body = source.slice(source.indexOf('private rebuildUnits('));
    const build = body.indexOf('this.units.build(');
    const hide = body.indexOf('this.units.hide(unitId)');
    const stamp = body.indexOf('this.unitsSignature = signUnits(');
    expect(build).toBeGreaterThan(-1);
    expect(hide).toBeGreaterThan(build);
    expect(stamp).toBeGreaterThan(hide);
  });

  it('compares the fingerprint on every drawn frame and rebuilds when it moved', () => {
    expect(source).toMatch(
      /signUnits\(this\.state\) !== this\.unitsSignature\)\) \{\s*\n\s*this\.rebuildUnits\(\);/,
    );
  });

  it('ends a hide off the walk rather than off the walker mesh', () => {
    const body = source.slice(source.indexOf('private stepAnimations('));
    const head = body.slice(0, body.indexOf('\n  }'));
    // The sweep is seeded from the animations, so a walk with no mesh still
    // gives its piece back; the walker ids are folded in so a mesh with no walk
    // is still cleared.
    expect(head).toContain('this.animations.activeUnits()');
    expect(head).toContain('this.walkers.keys()');
    expect(head).toContain('this.units.restore(unitId)');
    // And the frame gate has to agree, or the sweep never runs for a walk that
    // never had a mesh.
    expect(source).toContain('this.animations.pending || this.walkers.size > 0');
  });

  it('clears the standing hides on a skip and on a new board alike', () => {
    const skip = source.slice(source.indexOf('skipAnimations(): void'));
    const clear = skip.indexOf('this.units.clearHidden()');
    expect(clear).toBeGreaterThan(-1);
    expect(skip.indexOf('this.rebuildUnits()')).toBeGreaterThan(clear);
    // A new map is a new game whose unit ids start again at one, so a hide left
    // over from the old one would take an innocent piece — and its bar — off the
    // new board.
    const setMap = source.slice(source.indexOf('private setMap('));
    expect(setMap.slice(0, setMap.indexOf('this.rebuildBoard('))).toContain(
      'this.units.clearHidden()',
    );
  });

  it('gives the walking copy a bar as well as a badge', () => {
    const body = source.slice(source.indexOf('private spawnWalker('));
    const head = body.slice(0, body.indexOf('private spawnFaller('));
    expect(head).toContain('buildHpBar(');
    // Both art paths — the sculpt and the standee — hang one.
    expect(head.match(/const bar = barFor\(\);/g) ?? []).toHaveLength(2);
  });
});

/**
 * **The fourth report: a bar with nothing in it** (user, 2026-08-28 — "it
 * happened off screen during a barbarian attack, and then when I went to the
 * unit, the health bar was empty").
 *
 * "Empty" is the backing drawn and the fill not, over a piece that is alive, and
 * there are only so many ways a board can do that. Each of these is one of them,
 * driven through the real layer:
 *
 *   · the fill *behind* its backing — pinned in `pieces3d.test.ts` against
 *     reversed mesh ids, now that the fill claims its own draw order;
 *   · the fill left zero-scaled by a hide the rebuild outlived, or restored to
 *     an as-built width rather than to the health the state now holds;
 *   · a fill *bucket* culled while its backing bucket, which has a different
 *     bounding sphere, was not;
 *   · the wild drawing its bars somewhere a nation's are not.
 *
 * And the one that was actually happening, which none of the above would ever
 * have caught: an exactly drawn fill for a piece at a few points of a hundred is
 * a sub-pixel quad, and a sub-pixel quad is not rasterised. See `hpBarFillWidth`.
 */
describe('the ways a bar can come up empty', () => {
  it('gives back the health the state holds now, not the one it was hidden at', () => {
    const board = new BoardGeometry();
    const state = flatState();
    const marcher = createUnit(state, 0, 'warrior', 2, 3);
    marcher.hp = 90;
    const beat = new RendererBeat(state, board, materials());

    // The piece marches: its resting instance — bar included — goes off the
    // board for the length of the walk.
    beat.skipAnimations();
    const route = findPath(state, marcher, getTileAt(state.map, 5, 3)!) ?? [];
    const from = { col: marcher.col, row: marcher.row };
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: marcher.id,
        target: { col: 5, row: 3 },
      }),
    ).toMatchObject({ ok: true });
    const walked = walkedPrefix(route, { col: marcher.col, row: marcher.row });
    expect(walked.length).toBeGreaterThan(0);
    beat.animateMove(marcher.id, from, walked, 0);
    beat.frame(10);
    expect(beat.drawn().has(marcher.id)).toBe(false);

    // A blow lands on *the hidden piece itself*, off screen. The fingerprint
    // moves, so the layer is rebuilt underneath a standing hide — and the
    // rebuild's own bar for it is zero-scaled the moment it is collected.
    marcher.hp = 12;
    beat.frame(20);
    expect(
      barInstances(beat.units, board).filter(
        (bar) => Math.abs(bar.width - hpBarFillWidth(12 / unitDef('warrior').maxHp)) < 1e-6,
      ),
    ).toHaveLength(0);

    // The walk ends. `restore` must put the instance back to *what the other
    // bits say* — which for a bar is the width the last rebuild collected, at
    // twelve points, not the ninety it was hidden at and not the full width of
    // its own backing.
    beat.frame(ANIM.msPerHex * walked.length + 1);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);
    const widths = barInstances(beat.units, board)
      .map((bar) => Math.round(bar.width * 1e6) / 1e6)
      .sort((a, b) => a - b);
    expect(new Set(widths).size).toBe(2);
    expect(widths[0]).toBeCloseTo(hpBarFillWidth(12 / unitDef('warrior').maxHp), 6);

    beat.dispose();
    board.dispose();
  });

  it('draws the new number when the fog lifts off a piece hurt under it', () => {
    const board = new BoardGeometry();
    const state = flatState();
    const hurt = createUnit(state, 0, 'warrior', 4, 4);
    hurt.hp = 70;
    for (const grid of state.visibility) grid.fill(2);
    const beat = new RendererBeat(state, board, materials(), 0);
    expect(barComplaints(state, beat.units, board, beat.drawn())).toEqual([]);

    // The seat loses sight of the hex — remembered ground, which draws no piece
    // at all and therefore owes no bar.
    state.visibility[0]!.fill(1);
    beat.frame(10);
    expect(beat.drawn().has(hurt.id)).toBe(false);
    expect(barInstances(beat.units, board)).toEqual([]);

    // The barbarian's blow lands while nobody is watching.
    hurt.hp = 8;
    beat.frame(20);
    expect(barInstances(beat.units, board)).toEqual([]);

    // And the eyes come back. One rebuild, off the fog signature, and the bar
    // says what the state says.
    state.visibility[0]!.fill(2);
    beat.frame(30);
    expect(barComplaints(state, beat.units, board, beat.drawn())).toEqual([]);
    const fill = Math.min(...barInstances(beat.units, board).map((bar) => bar.width));
    expect(fill).toBeCloseTo(hpBarFillWidth(8 / unitDef('warrior').maxHp), 6);

    beat.dispose();
    board.dispose();
  });

  it('never culls a bar bucket, so a fill cannot vanish while its backing stays', () => {
    const board = new BoardGeometry();
    const state = flatState();
    const near = createUnit(state, 0, 'warrior', 1, 1);
    const far = createUnit(state, 0, 'warrior', 14, 6);
    near.hp = 20;
    far.hp = 90;
    const beat = new RendererBeat(state, board, materials());

    // The backing bucket and the fill buckets hold *different* instances in
    // different places, so their bounding spheres differ — and a bucket that
    // could be culled at all is a bucket that can be culled on its own. Both
    // halves of every bar are exempt, exactly as the pieces are.
    const meshes = barMeshes(beat.units, board);
    expect(meshes.length).toBeGreaterThan(1);
    for (const mesh of meshes) expect(mesh.frustumCulled).toBe(false);

    // Still true after a rebuild the camera was nowhere near.
    far.hp = 30;
    beat.frame(10);
    for (const mesh of barMeshes(beat.units, board)) expect(mesh.frustumCulled).toBe(false);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);

    beat.dispose();
    board.dispose();
  });

  it('batches the wild\'s bars with everybody else\'s', () => {
    const board = new BoardGeometry();
    const state = flatState();
    const wild = barbarianPlayer(state)!;
    const mine = createUnit(state, 0, 'warrior', 3, 3);
    const theirs = createUnit(state, wild.id, 'warrior', 5, 3);
    mine.hp = 30;
    theirs.hp = 30;
    const beat = new RendererBeat(state, board, materials());

    // The wild's badge is a second print — darkened parchment, oxblood ink — and
    // its rim is a colour of its own, so both of those *do* take buckets a
    // nation's pieces never touch. A health bar is not heraldry: the ink is the
    // fraction's, not the seat's, so one backing and one fill carry the whole
    // board and a barbarian's bar cannot be drawn anywhere a nation's is not.
    expect(barMeshes(beat.units, board)).toHaveLength(2);
    expect(barComplaints(state, beat.units, board, allUnits(state))).toEqual([]);

    beat.dispose();
    board.dispose();
  });

  it('leaves the defender\'s bar alone while the wild marches on it', () => {
    const board = new BoardGeometry();
    const state = flatState();
    const wild = barbarianPlayer(state)!;
    const defender = createUnit(state, 0, 'warrior', 6, 3);
    const raider = createUnit(state, wild.id, 'warrior', 4, 3);
    defender.hp = 45;
    // The wild's seat is born with its turn ended — that is what stops the turn
    // waiting on it (`seatBarbarians`) — and its pieces are walked by the
    // resolution rather than by a command. Lifting the flag is how a test issues
    // the marches the resolution would have.
    state.turnEnded[wild.id] = false;
    const beat = new RendererBeat(state, board, materials());

    // The raider closes the last hex, keeping a move in hand for the blow. Its
    // own resting piece is hidden for the march; the hide is a fact about *that*
    // unit's slot list and must not reach a hex it is only walking toward.
    beat.skipAnimations();
    const route = findPath(state, raider, getTileAt(state.map, 5, 3)!) ?? [];
    const from = { col: raider.col, row: raider.row };
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: wild.id,
        unitId: raider.id,
        target: { col: 5, row: 3 },
      }),
    ).toMatchObject({ ok: true });
    const walked = walkedPrefix(route, { col: raider.col, row: raider.row });
    expect(walked.length).toBeGreaterThan(0);
    beat.animateMove(raider.id, from, walked, 0);

    beat.frame(10);
    expect(beat.drawn().has(raider.id)).toBe(false);
    expect(barComplaints(state, beat.units, board, beat.drawn())).toEqual([]);
    // The defender is standing still and still hurt, so its bar is on the board
    // in full — a backing and a fill, once per wrap copy.
    expect(barInstances(beat.units, board)).toHaveLength(2 * WRAP_COPIES);

    // And the blow itself, once the raider is in reach.
    beat.frame(ANIM.msPerHex * walked.length + 1);
    expect(
      applyCommand(state, {
        type: 'attack',
        playerId: wild.id,
        unitId: raider.id,
        target: { col: defender.col, row: defender.row },
      }),
    ).toMatchObject({ ok: true });
    beat.frame(ANIM.msPerHex * walked.length + 10);
    expect(barComplaints(state, beat.units, board, beat.drawn())).toEqual([]);

    beat.dispose();
    board.dispose();
  });
});
