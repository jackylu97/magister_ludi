import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';

import {
  BADGE_CELLS,
  BADGE_ICON_FILES,
  BADGE_LINES,
  type UnitBadges,
  badgeAtlasLayout,
  badgeAtlasSize,
  badgeCellOrigin,
  badgeCellRect,
  badgeCenterY,
  badgeDiscFlags,
  badgeHitRadius,
  badgeTopY,
  cssHex,
  fitInscription,
  hpBarY,
  paperRadiusFraction,
  rimInnerFraction,
} from '../../src/render3d/badges3d';
import {
  BoardGeometry,
  MODEL_CLASS_IDS,
  badgeClassFor,
  modelClassFor,
  pieceHeightFor,
} from '../../src/render3d/board3d';
import { atlasQuad, discRing } from '../../src/render3d/geometry';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { UnitLayer, badgeAnchors } from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { createMap } from '../../src/sim/map';
import { type GameState, barbarianPlayer, newGame } from '../../src/sim/state';
import { type UnitTypeId, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

/**
 * The floating unit badges.
 *
 * Everything here is arithmetic on `data/view3d.json` plus the instancing it
 * feeds, which is deliberately all of the badge system that *can* be tested off
 * a browser: the atlas itself needs a canvas. So what is held still here is the
 * part that would fail silently and invisibly — a cell rect that overlaps its
 * neighbour draws the wrong icon on the wrong unit, a rim that swallows its own
 * parchment leaves a disc of player colour, and a badge that does not follow a
 * unit into hiding leaves a tag hovering over an empty tile.
 */

const BADGE = VIEW3D.badges;

/** A stand-in for the rasterised atlas: the layer only ever wants a material. */
function fakeBadges(): UnitBadges {
  const material = new MeshBasicMaterial();
  const wildMaterial = new MeshBasicMaterial();
  return {
    material,
    wildMaterial,
    materialFor: (wild: boolean) => (wild ? wildMaterial : material),
  } as unknown as UnitBadges;
}

describe('the badge atlas layout', () => {
  it('tiles a count into a grid and sizes the canvas to match', () => {
    const layout = badgeAtlasLayout(8, 4, 128);
    expect(layout).toEqual({ cell: 128, columns: 4, rows: 2, width: 512, height: 256 });
    // A count that does not fill its last row still gets a whole row.
    expect(badgeAtlasLayout(9, 4, 64).rows).toBe(3);
    expect(badgeAtlasLayout(3, 4, 64).columns).toBe(3);
    // Degenerate asks are clamped rather than producing a zero-sized texture.
    expect(badgeAtlasLayout(1, 0, 32)).toEqual({
      cell: 32,
      columns: 1,
      rows: 1,
      width: 32,
      height: 32,
    });
  });

  it('gives every class a distinct cell that stays inside the atlas', () => {
    const layout = badgeAtlasSize();
    expect(layout.width).toBe(layout.columns * BADGE.atlasCell);
    const seen = new Set<string>();
    for (const cls of BADGE_CELLS) {
      const rect = badgeCellRect(cls);
      expect(rect.u1 - rect.u0).toBeCloseTo(1 / layout.columns, 10);
      expect(rect.v1 - rect.v0).toBeCloseTo(1 / layout.rows, 10);
      for (const v of [rect.u0, rect.u1, rect.v0, rect.v1]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      const key = `${rect.u0.toFixed(6)},${rect.v0.toFixed(6)}`;
      expect(seen.has(key), `${cls} shares a cell`).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(BADGE_CELLS.length);
  });

  /**
   * That every icon named actually exists, and that no icon exists unnamed.
   *
   * The one assertion in this file that touches the disk, and it earns the
   * exception: the badge atlas is the last thing in the renderer that *fetches*
   * anything, so its whole failure mode is a file that was renamed or never
   * added. `loadIcon` says so on the console and then draws a blank roundel,
   * which is a bug you find by noticing — exactly the shape of thing a gate
   * should catch instead. Both directions, because an orphan file is the other
   * half of the same mistake: a drawing somebody made for a class that was never
   * wired up looks identical, from the repository, to one that was.
   *
   * Read through Vite's raw glob rather than `node:fs`, the pattern the rest of
   * this suite uses and for the same reason: this project has no node typings
   * and a file read is not worth a dependency. Non-recursive, so the marginalia
   * in their own folder are not swept up.
   */
  it('has a file on disk for every badge cell, and no icon file with no cell', () => {
    const files = import.meta.glob('../../public/sprites/icons/*.svg', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const onDisk = new Set(Object.keys(files).map((path) => path.split('/').pop()!));
    const named = new Set(BADGE_CELLS.map((cls) => BADGE_ICON_FILES[cls].split('/').pop()!));
    expect([...named].sort()).toEqual([...onDisk].sort());
    // And each is a drawing rather than an empty file somebody touched.
    for (const [path, text] of Object.entries(files)) {
      expect(text, `${path} has no path data`).toContain('<path');
    }
  });

  /**
   * The eight cells the one-mark-per-row ruling appended, and the twelve that
   * did not move for them.
   *
   * Named on its own rather than left to the sweep above, because the *append*
   * is the load-bearing part: `BADGE_CELLS` decides texture coordinates, every
   * consumer re-derives its rectangle through `badgeCellRect` at build time, and
   * nothing anywhere writes an index down — so cells added on the end cost rows
   * of atlas and re-point nothing. A cell inserted in the middle would silently
   * draw a dozen units' badges off by one, which is the failure this assertion
   * holds still. It is the same claim the caravan's twelfth cell made, at eight
   * times the size: the first twelve are pinned in their old order, by name.
   *
   * Twenty in a four-wide atlas is exactly five rows, and that arithmetic is the
   * other half of the assertion — the layout has always been a function of the
   * count (`badgeAtlasLayout`), so the canvas grew two rows and nothing else
   * about the atlas changed.
   */
  it('appends the eight new marks and leaves the first twelve where they were', () => {
    expect(BADGE_CELLS.slice(0, 12)).toEqual([
      'settler',
      'worker',
      'melee',
      'ranged',
      'mounted',
      'mountedRanged',
      'siege',
      'scout',
      'greatPerson',
      'religious',
      'spear',
      'trader',
    ]);
    expect(BADGE_CELLS.slice(12)).toEqual([
      'warrior',
      'longswordsman',
      'pikeman',
      'compositeBowman',
      'crossbowman',
      'chariot',
      'knight',
      'trebuchet',
      // Religion v2's, appended in its turn and moving nothing before it — the
      // rule doing its job for the third time. See `BADGE_CELLS`.
      'prophet',
    ]);
    expect(BADGE_CELLS).toHaveLength(21);
    const layout = badgeAtlasSize();
    expect(layout.columns).toBe(4);
    expect(layout.rows).toBe(6);
    expect(layout.height).toBe(6 * BADGE.atlasCell);
    // And the twelve before them did not move: the rectangle of cell 0 is still
    // the top-left one, which is what `badgeCellRect` is asked for everywhere.
    expect(badgeCellRect(BADGE_CELLS[0]!).u0).toBe(0);
    expect(BADGE_ICON_FILES.trader).toBe('sprites/icons/trader.svg');
  });

  /**
   * The ruling itself: twenty unit types, twenty different drawings.
   *
   * The list is written out here rather than derived from `UNIT_TYPE_IDS`, and
   * that is deliberate in both directions. It is the *user's* list (2026-08-28,
   * "could we get unique badges for each unit type"), so it is the thing being
   * promised and belongs in the test as words; and deriving it would make this
   * assertion fail the day the simulation adds a roster row, which is precisely
   * the case `badgeClassFor`'s fallback exists to keep cheap — a new unit is a
   * data edit that gets a legible badge and, until somebody draws it one, not a
   * distinct one.
   *
   * `badgeClassFor` is asked rather than `badges.byUnitType`, because the table
   * is only the third of four clauses: the augur and the great person are
   * answered by the *rules* ahead of it, and a test that read the table would
   * miss the two rows most likely to break.
   */
  it('gives each of the twenty-one unit types a badge no other type wears', () => {
    const roster: UnitTypeId[] = [
      'warrior',
      'scout',
      'settler',
      'worker',
      'archer',
      'spearman',
      'horseman',
      'chariot',
      'chariotArcher',
      'swordsman',
      'catapult',
      'compositeBowman',
      'pikeman',
      'crossbowman',
      'knight',
      'longswordsman',
      'trebuchet',
      'trader',
      'augur',
      // Religion v2's second called piece. It wore the augur's own candle until
      // the prophet's verbs arrived; the ruling that it must not is on
      // `badgeClassFor`, and it is the *rules* clause rather than the art
      // table's — which is why this sweep asks `badgeClassFor` at all.
      'prophet',
      'greatPerson',
    ];
    const badges = new Map<string, UnitTypeId>();
    for (const type of roster) {
      const badge = badgeClassFor(type);
      expect(BADGE_CELLS, `${type} wears a class with no atlas cell`).toContain(badge);
      const taken = badges.get(badge);
      expect(taken, `${type} and ${String(taken)} share the ${badge} badge`).toBeUndefined();
      badges.set(badge, type);
    }
    expect(badges.size).toBe(21);
    // Twenty-one types, twenty-one cells: the set is exactly used up, so there
    // is no drawing in the atlas that no piece on the board can ever wear.
    expect(badges.size).toBe(BADGE_CELLS.length);
  });

  /**
   * The prophet's own clause, which is a *rules* clause and not the art table's.
   *
   * It reads `UnitDef.prophesies` — the row that says what the piece is — so it
   * survives the day the simulation gives a prophet `consecrates` as well, which
   * is exactly the fragility an entry in `badges.byUnitType` would have had. And
   * it sits ahead of the candle for the reason the laurel sits ahead of both: a
   * prophet that also consecrated would still be a prophet.
   */
  it('badges the prophet off its own row, ahead of the augur\'s candle', () => {
    expect(unitDef('prophet').prophesies).toBe(true);
    expect(badgeClassFor('prophet')).toBe('prophet');
    expect(badgeClassFor('augur')).toBe('religious');
    // The art table has nothing to say about either, which is the fence: what a
    // piece *does* is the simulation's fact.
    expect('prophet' in VIEW3D.badges.byUnitType).toBe(false);
    expect('augur' in VIEW3D.badges.byUnitType).toBe(false);
  });

  /**
   * The pairs the ruling was actually about, held one by one.
   *
   * The sweep above proves the twenty are *distinct*, which a set of twenty
   * randomly assigned marks would also do. What the user asked for is that the
   * ranks of one line differ — "warriors and swordsmen should have different
   * icons" — so each line's neighbours are named here, and the sentence that
   * would have to become false for the complaint to come back is written down
   * beside them.
   */
  it('separates every rank of every line, which is the complaint', () => {
    const pairs: [UnitTypeId, UnitTypeId][] = [
      ['warrior', 'swordsman'],
      ['swordsman', 'longswordsman'],
      ['warrior', 'longswordsman'],
      ['spearman', 'pikeman'],
      ['archer', 'compositeBowman'],
      ['compositeBowman', 'crossbowman'],
      ['archer', 'crossbowman'],
      ['horseman', 'chariot'],
      ['chariot', 'knight'],
      ['horseman', 'knight'],
      ['catapult', 'trebuchet'],
    ];
    for (const [a, b] of pairs) {
      expect(badgeClassFor(a), `${a} and ${b} still share a badge`).not.toBe(badgeClassFor(b));
    }
    // And the sculpts they share, which is why the badge had to carry it: three
    // of these pairs stand on one miniature apiece.
    expect(modelClassFor('warrior')).toBe(modelClassFor('swordsman'));
    expect(modelClassFor('horseman')).toBe(modelClassFor('chariot'));
    expect(modelClassFor('catapult')).toBe(modelClassFor('trebuchet'));
  });

  /**
   * The gallery's own row, which is the only place twenty marks can be judged.
   *
   * `BADGE_LINES` is a *partition* — every cell in exactly one line — and that
   * is the property worth holding still rather than the count: a twenty-first
   * badge added to the atlas and to no line would quietly stop appearing on
   * `flair.html`, which is where art is iterated (CLAUDE.md), and a cell listed
   * in two lines would be printed twice and nobody would notice either.
   *
   * The gallery reads this table to lay out its grids, so the assertion is
   * about the page as much as about the data — see `badgeFamily` in
   * `src/flairGallery/marks.ts`, which has no list of its own to go stale.
   */
  it('sorts every badge into exactly one line for the flair gallery', () => {
    const listed = BADGE_LINES.flatMap((line) => line.members);
    expect(listed).toHaveLength(BADGE_CELLS.length);
    expect([...listed].sort()).toEqual([...BADGE_CELLS].sort());
    expect(new Set(listed).size).toBe(listed.length);
    // Six lines, each with a name and a sentence: a line with no note is a row
    // of drawings on the page with nothing said about how they differ, which is
    // the one thing this page exists to say.
    expect(BADGE_LINES).toHaveLength(6);
    for (const line of BADGE_LINES) {
      expect(line.members.length, line.line).toBeGreaterThan(0);
      expect(line.line.length).toBeGreaterThan(0);
      expect(line.note.length).toBeGreaterThan(0);
    }
  });

  it('puts the first cell at the top-left of the canvas and at v = 1', () => {
    // The canvas is painted top-down and the texture is sampled bottom-up
    // (`flipY`), so these two have to disagree in exactly this way. If they ever
    // agree, every badge is showing the icon from the other row.
    const layout = badgeAtlasSize();
    expect(badgeCellOrigin(0, layout)).toEqual({ x: 0, y: 0 });
    expect(badgeCellRect(BADGE_CELLS[0]!).v1).toBe(1);
    expect(badgeCellOrigin(layout.columns, layout)).toEqual({ x: 0, y: layout.cell });
    expect(badgeCellRect(BADGE_CELLS[layout.columns]!).v1).toBeLessThan(1);
  });

  it('keeps the parchment inside the rim and the rim inside the disc', () => {
    const inner = rimInnerFraction();
    expect(inner).toBeGreaterThan(0);
    expect(inner).toBeLessThan(1);
    // The rim band is the data's width, expressed against the outer radius.
    expect((1 - inner) * (BADGE.diameter / 2)).toBeCloseTo(BADGE.rimWidth, 10);

    const paper = paperRadiusFraction();
    // Reaches under the rim's inner edge but never past the disc's outer one:
    // the first keeps the paper's soft edge covered, the second keeps the rim
    // from being painted over by its own parchment.
    expect(paper).toBeGreaterThan(0.5 * inner);
    expect(paper).toBeLessThan(0.5);
  });

  it('writes colours the way a canvas context reads them', () => {
    expect(cssHex(0x2f2b32)).toBe('#2f2b32');
    expect(cssHex(0x000000)).toBe('#000000');
    expect(cssHex(0xffffff)).toBe('#ffffff');
  });

  /**
   * The four flags on the disc material, which the atlas itself cannot be asked
   * for off a browser.
   *
   * `transparent` is the one that looks wrong and is not: nothing about a badge
   * blends, but a `renderOrder` only means anything in the pass three sorts by
   * it, and a badge that cannot claim an order is a badge the selection ring
   * paints over. The alpha test is what keeps that honest — every pixel that
   * survives it is fully opaque — and the two depth flags are the whole of
   * "a thing standing in the diorama", so a mountain still hides a badge.
   */
  it('puts the disc in the sorted pass without giving up the cutout or the depth', () => {
    expect(badgeDiscFlags()).toEqual({
      transparent: true,
      alphaTest: BADGE.alphaTest,
      depthTest: true,
      depthWrite: true,
    });
    // A cutout, not a fade: a cutoff of zero would keep every antialiased pixel
    // of the roundel's edge and put the sorting problem back.
    expect(BADGE.alphaTest).toBeGreaterThan(0);
  });
});

describe('where a badge floats', () => {
  it('stacks the disc clear of the unit and the bar clear of the disc', () => {
    const h = pieceHeightFor('warrior');
    expect(badgeCenterY(h)).toBeGreaterThan(h);
    // The disc's underside clears the sculpt by exactly the data's lift.
    expect(badgeCenterY(h) - BADGE.diameter / 2).toBeCloseTo(h + BADGE.lift, 10);
    expect(badgeTopY(h)).toBeCloseTo(badgeCenterY(h) + BADGE.diameter / 2, 10);
    expect(hpBarY(h)).toBeGreaterThan(badgeTopY(h));
    expect(hpBarY(h)).toBeCloseTo(badgeTopY(h) + VIEW3D.hpBar.lift, 10);
  });

  it('keeps the whole stack short enough to stay a tag rather than a mast', () => {
    // A badge that floated a piece-height over the piece would stop reading as
    // belonging to it. Half the unit's own height is the ceiling.
    for (const type of ['warrior', 'catapult', 'knight'] as UnitTypeId[]) {
      const h = pieceHeightFor(type);
      expect(hpBarY(h) - h, type).toBeLessThan(h);
      expect(badgeCenterY(h) - h, type).toBeLessThan(h * 0.6);
    }
  });

  it('tracks the model class rather than a constant', () => {
    // Two units of different classes must not have badges at the same height,
    // or a rider's tag sits inside its own horse's head.
    expect(badgeCenterY(pieceHeightFor('knight'))).toBeGreaterThan(
      badgeCenterY(pieceHeightFor('catapult')),
    );
    expect(badgeCenterY(pieceHeightFor('catapult'))).toBeLessThan(
      badgeCenterY(pieceHeightFor('warrior')),
    );
  });
});

describe('the badge shapes', () => {
  it('builds a rim ring at unit outer radius, flat and facing the camera', () => {
    const ring = discRing(0.8, 12);
    ring.computeBoundingBox();
    const box = ring.boundingBox!;
    expect(box.max.x).toBeCloseTo(0.5, 6);
    expect(box.min.x).toBeCloseTo(-0.5, 6);
    expect(box.max.z).toBe(0);
    expect(box.min.z).toBe(0);
    // Two triangles per segment, and every normal pointing at the eye.
    const position = ring.getAttribute('position');
    expect(position.count).toBe(12 * 6);
    const normal = ring.getAttribute('normal');
    for (let i = 0; i < normal.count; i++) expect(normal.getZ(i)).toBe(1);
    ring.dispose();
  });

  it('bakes the atlas rect into the quad it belongs to', () => {
    const quad = atlasQuad(0.25, 0.5, 0.5, 1);
    const uv = quad.getAttribute('uv');
    const us: number[] = [];
    const vs: number[] = [];
    for (let i = 0; i < uv.count; i++) {
      us.push(uv.getX(i));
      vs.push(uv.getY(i));
    }
    expect(Math.min(...us)).toBeCloseTo(0.25, 10);
    expect(Math.max(...us)).toBeCloseTo(0.5, 10);
    expect(Math.min(...vs)).toBeCloseTo(0.5, 10);
    expect(Math.max(...vs)).toBeCloseTo(1, 10);
    quad.dispose();
  });

  it('gives the board one quad per badge cell, each with its own coordinates', () => {
    // Walked over `BADGE_CELLS` and not `MODEL_CLASS_IDS`, which is the whole of
    // what the one-mark-per-row ruling changed here: there are twenty cells and
    // eight sculpts, and a quad missing for one of the twelve that is not a
    // sculpt draws that unit's badge with somebody else's texture coordinates.
    const board = new BoardGeometry();
    const seen = new Set<number>();
    for (const id of BADGE_CELLS) {
      const quad = board.badgeIcons[id];
      expect(quad, id).toBeDefined();
      const uv = quad.getAttribute('uv');
      seen.add(Math.round(uv.getX(0) * 1e6) * 1e3 + Math.round(uv.getY(0) * 1e3));
    }
    expect(seen.size).toBe(BADGE_CELLS.length);
    board.dispose();
  });
});

describe('badges in the units layer', () => {
  function state(types: UnitTypeId[]): GameState {
    const game = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#d4502e', isHuman: true }],
    });
    game.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
    // The board was replaced under this state; the fog grids were sized for the
    // old one. See `resetVisibility`.
    resetVisibility(game);
    game.tileOwner = new Array<number | null>(12 * 8).fill(null);
    game.cities = [];
    game.units = types.map((type, i) => ({
      id: i + 1,
      type,
      ownerId: 0,
      col: 1 + i * 2,
      row: 2,
      hp: unitDef(type).maxHp,
      movesLeft: 2,
      hasAttacked: false,
    }));
    return game;
  }

  function build(types: UnitTypeId[], selected: number | null = null, hurt = false) {
    const board = new BoardGeometry();
    const layer = new UnitLayer();
    const game = state(types);
    // HP bars are only built for a damaged unit, and the layer stack is one of
    // the things they take part in — see the draw-order test below.
    if (hurt) for (const unit of game.units) unit.hp = 1;
    layer.build(
      game,
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
      null,
      fakeBadges(),
      selected,
    );
    const meshes = layer.group.children.filter(
      (c): c is InstancedMesh => c instanceof InstancedMesh,
    );
    return { board, layer, meshes };
  }

  it('draws a disc and a rim for every unit, batched by badge and by player', () => {
    // Five units wearing three badges, all one player: three disc buckets, one
    // rim bucket. The whole point of the split — badge cost is flat in the unit
    // count and grows only with the variety on the board.
    //
    // Written with *repeats* rather than with five different rows, which it used
    // to be, because since the one-mark-per-row ruling five rows is five badges
    // and the batching would be invisible in the very case the batching is for:
    // an army is mostly copies of a few things. Two warriors, two archers and a
    // catapult is that army in miniature.
    const { board, layer, meshes } = build([
      'warrior',
      'warrior',
      'archer',
      'archer',
      'catapult',
    ]);
    const discs = meshes.filter((m) =>
      BADGE_CELLS.some((id) => board.badgeIcons[id] === m.geometry),
    );
    const rims = meshes.filter((m) => m.geometry === board.badgeRim);
    expect(discs).toHaveLength(3);
    expect(rims).toHaveLength(1);
    // Three wrap copies per unit, everywhere.
    expect(rims[0]!.count).toBe(5 * 3);
    expect(discs.reduce((sum, m) => sum + m.count, 0)).toBe(5 * 3);
    layer.dispose();
    board.dispose();
  });

  it('gives the roundel the atlas material and never an outline or a shadow', () => {
    const { board, layer, meshes } = build(['warrior']);
    const disc = meshes.find((m) => m.geometry === board.badgeIcons.warrior)!;
    expect(disc.material).toBeInstanceOf(MeshBasicMaterial);
    expect(disc.castShadow).toBe(false);
    expect(disc.receiveShadow).toBe(false);
    // A textured bucket is never given an inverted hull: exactly one mesh
    // carries the disc geometry, where an outlined shape would have two.
    expect(meshes.filter((m) => m.geometry === board.badgeIcons.warrior)).toHaveLength(1);
    layer.dispose();
    board.dispose();
  });

  /**
   * The layering the badges were losing.
   *
   * The hover and selection rings are depth-ignoring decals drawn after the
   * board, so until the badges claimed a draw order of their own the ring around
   * a unit painted straight over the tag naming it — most visibly on the one
   * unit the player had just selected. The fix must not spend either of the
   * properties that make a badge a thing in the diorama, so all three claims are
   * held here together: the order is above the rings, the depth test is still on
   * (a mountain in front of a unit hides its badge), and the HP bar stays above
   * the badge it is stacked on.
   */
  it('draws the badge over the interface rings and under the HP bar', () => {
    const { board, layer, meshes } = build(['warrior'], null, true);
    const disc = meshes.find((m) => m.geometry === board.badgeIcons.warrior)!;
    const rim = meshes.find((m) => m.geometry === board.badgeRim)!;
    const bars = meshes.filter((m) => m.geometry === board.bar);

    expect(disc.renderOrder).toBe(RENDER_ORDER.badge);
    // Both halves of one badge travel together, or a ring could land between
    // the parchment and the ring of player colour around it.
    expect(rim.renderOrder).toBe(RENDER_ORDER.badge);
    // A backing and a fill, both over the disc they are stacked on.
    expect(bars).toHaveLength(2);
    for (const bar of bars) expect(bar.renderOrder).toBe(RENDER_ORDER.hpBar);

    // The stack itself, in the order the interface reads bottom to top.
    expect(RENDER_ORDER.overlay).toBeLessThan(RENDER_ORDER.onTop);
    expect(RENDER_ORDER.onTop).toBeLessThan(RENDER_ORDER.badge);
    expect(RENDER_ORDER.badge).toBeLessThan(RENDER_ORDER.hpBar);
    layer.dispose();
    board.dispose();
  });

  it('keeps the rim depth-tested, so a mountain still hides a whole badge', () => {
    const { board, layer, meshes } = build(['warrior']);
    const rim = meshes.find((m) => m.geometry === board.badgeRim)!;
    const material = rim.material as MeshBasicMaterial;
    // The overlay material's depth-tested flavour, not the `onTop` one: a late
    // draw order is not the same thing as ignoring the board.
    expect(material.depthTest).toBe(true);
    expect(material.transparent).toBe(true);
    layer.dispose();
    board.dispose();
  });

  it('floats the badge over the unit at the height its class asks for', () => {
    const { board, layer, meshes } = build(['catapult']);
    const disc = meshes.find((m) => m.geometry === board.badgeIcons.siege)!;
    const piece = meshes.find((m) => m.geometry === board.pieces.siege.geometry)!;
    const matrix = new Matrix4();
    disc.getMatrixAt(0, matrix);
    const badgeY = new Vector3().setFromMatrixPosition(matrix).y;
    piece.getMatrixAt(0, matrix);
    const feetY = new Vector3().setFromMatrixPosition(matrix).y;
    expect(badgeY - feetY).toBeCloseTo(badgeCenterY(pieceHeightFor('catapult')), 6);
    layer.dispose();
    board.dispose();
  });

  it('splits the selected unit’s rim into its own brighter bucket', () => {
    const { board, layer, meshes } = build(['warrior', 'archer'], 1);
    const rims = meshes.filter((m) => m.geometry === board.badgeRim);
    // One bucket for the selection's lifted ink, one for everybody else.
    expect(rims).toHaveLength(2);
    expect(rims.map((m) => m.count).sort()).toEqual([3, 3]);
    layer.dispose();
    board.dispose();
  });

  /**
   * The wild's badge, which is the one badge on the board that is not a seat.
   *
   * The barbarian seat is a `Player` so that combat, stacking, movement and fog
   * need no second implementation (Entry XX) — and the price of that was a
   * barbarian warrior drawn exactly like a neighbour's (user, 2026-08-27:
   * "barbarian icons should have red tint … should look different than a player
   * unit"). What is held still here is the whole of the fix and each half of it
   * separately, because either half alone is wrong: a red rim on bone parchment
   * reads as "a player whose colour is red", and darkened parchment with a seat
   * rim reads as a rendering fault.
   */
  it('prints the wild’s badge on its own atlas, and rims it in oxblood', () => {
    const game = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    game.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
    resetVisibility(game);
    game.tileOwner = new Array<number | null>(12 * 8).fill(null);
    game.cities = [];
    const wild = barbarianPlayer(game)!;
    expect(wild).toBeDefined();
    game.units = [0, wild.id].map((ownerId, i) => ({
      id: i + 1,
      type: 'warrior' as UnitTypeId,
      ownerId,
      col: 1 + i * 2,
      row: 2,
      hp: unitDef('warrior').maxHp,
      movesLeft: 2,
      hasAttacked: false,
    }));

    const board = new BoardGeometry();
    const layer = new UnitLayer();
    const badges = fakeBadges();
    layer.build(
      game,
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
      null,
      badges,
    );
    const meshes = layer.group.children.filter(
      (c): c is InstancedMesh => c instanceof InstancedMesh,
    );

    // Two warriors, one class, and *two* disc buckets — because the two seats
    // print off two different atlases. One bucket would mean the wild was
    // wearing a nation's paper.
    const discs = meshes.filter((m) => m.geometry === board.badgeIcons.warrior);
    expect(discs).toHaveLength(2);
    const discMaterials = discs.map((m) => m.material);
    expect(discMaterials).toContain(badges.material);
    expect(discMaterials).toContain(badges.wildMaterial);

    // And two rims: the seat's own ink, and the wild's oxblood — which is a
    // colour no seat tincture can take, so the two can never collide.
    const rims = meshes.filter((m) => m.geometry === board.badgeRim);
    expect(rims).toHaveLength(2);
    const rimColors = rims.map((m) => (m.material as MeshBasicMaterial).color.getHex());
    expect(rimColors).toContain(BADGE.wildRimColor);
    expect(VIEW3D.players.fallbackOrder).not.toContain(BADGE.wildRimColor);
    // The darkened parchment is the half that says "not a seat"; the rim alone
    // would only say "a red one".
    expect(BADGE.wildPaperColor).not.toBe(BADGE.paperColor);
    expect(BADGE.wildInkColor).not.toBe(BADGE.inkColor);

    layer.dispose();
    board.dispose();
  });

  it('takes a unit’s badge off the board when the unit is hidden for a walk', () => {
    const { board, layer, meshes } = build(['warrior']);
    const disc = meshes.find((m) => m.geometry === board.badgeIcons.warrior)!;
    const rim = meshes.find((m) => m.geometry === board.badgeRim)!;
    const matrix = new Matrix4();
    // Read straight off element 0 — the matrix's own x scale — rather than
    // through `decompose`, which reports a *degenerate* matrix as unit scale
    // and would happily pass on a badge that was never hidden.
    const xScale = (mesh: InstancedMesh, i: number): number => {
      mesh.getMatrixAt(i, matrix);
      return matrix.elements[0]!;
    };

    layer.hide(1);
    for (const mesh of [disc, rim]) {
      for (let i = 0; i < mesh.count; i++) {
        expect(xScale(mesh, i), 'a hidden unit left its tag behind').toBe(0);
      }
    }

    layer.restore(1);
    // Back at full size, and at the diameter the data asks for: the badge is
    // built from a unit-sized quad and scaled by the instance matrix.
    expect(Math.abs(xScale(disc, 0))).toBeCloseTo(BADGE.diameter, 6);
    layer.dispose();
    board.dispose();
  });

  it('badges sprite units too, at the billboard’s own height', () => {
    // Sprite style swaps the sculpt for a card; the tag is unchanged and rides
    // the taller visual, which is the whole reason the height is a lookup.
    const board = new BoardGeometry();
    const layer = new UnitLayer();
    layer.build(
      state(['warrior']),
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
      { materialFor: () => new MeshBasicMaterial(), any: true } as never,
      fakeBadges(),
    );
    const meshes = layer.group.children.filter(
      (c): c is InstancedMesh => c instanceof InstancedMesh,
    );
    const disc = meshes.find((m) => m.geometry === board.badgeIcons.warrior);
    expect(disc, 'a billboard unit lost its badge').toBeDefined();
    // No sculpt in the buffer at all — only the badge and its rim.
    expect(meshes.some((m) => m.geometry === board.pieces.melee.geometry)).toBe(false);
    layer.dispose();
    board.dispose();
  });

  it('leaves the board untagged rather than broken when the atlas never arrives', () => {
    const board = new BoardGeometry();
    const layer = new UnitLayer();
    layer.build(
      state(['warrior']),
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
    );
    const meshes = layer.group.children.filter(
      (c): c is InstancedMesh => c instanceof InstancedMesh,
    );
    expect(meshes.some((m) => m.geometry === board.badgeRim)).toBe(false);
    // The sculpt, its outline shell and its x-ray ghost — and no badge.
    expect(meshes).toHaveLength(3);
    layer.dispose();
    board.dispose();
  });

  it('names a class for every unit type on the board', () => {
    // The badge is only meaningful while `modelClassFor` is total; a type that
    // fell out of the table would draw somebody else's icon.
    for (const cls of MODEL_CLASS_IDS) expect(BADGE_CELLS).toContain(cls);
    expect(modelClassFor('trebuchet')).toBe('siege');
    expect(modelClassFor('chariotArcher')).toBe('mountedRanged');
  });

  /**
   * Where a badge can be *clicked*, which has to be where it was drawn.
   *
   * `badgeAnchors` is the inverse of `UnitLayer.addBadge` and there is no
   * mechanism forcing the two to agree — they are two readings of the same three
   * numbers (the stack tally, the placement, the lift). A drift between them is
   * invisible on screen and shows up only as a badge that ignores clicks aimed
   * at it, so the agreement is asserted directly: every anchor is a badge the
   * layer actually put on the board, and there are exactly as many.
   */
  describe('the click targets', () => {
    /** Every badge instance the layer drew, as world positions. */
    function drawnBadges(board: BoardGeometry, meshes: InstancedMesh[]): Vector3[] {
      const matrix = new Matrix4();
      const positions: Vector3[] = [];
      for (const mesh of meshes) {
        if (!BADGE_CELLS.some((id) => board.badgeIcons[id] === mesh.geometry)) continue;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          positions.push(new Vector3().setFromMatrixPosition(matrix));
        }
      }
      return positions;
    }

    /**
     * Asserts the two sets of points are the same set, pairing them off.
     *
     * Matched by distance rather than by equality: an instance matrix has been
     * through a `Float32Array` and comes back a few parts in ten million off
     * what went in. The tolerance is four decimal places — thousands of times
     * finer than the badge radius the pairing has to distinguish, and thousands
     * of times coarser than the noise.
     */
    function expectSamePoints(
      anchors: readonly { x: number; y: number; z: number }[],
      drawn: Vector3[],
    ): void {
      expect(anchors).toHaveLength(drawn.length);
      const remaining = [...drawn];
      for (const anchor of anchors) {
        const at = remaining.findIndex(
          (p) => Math.hypot(p.x - anchor.x, p.y - anchor.y, p.z - anchor.z) < 1e-4,
        );
        expect(at, `no badge was drawn at ${anchor.x}, ${anchor.y}, ${anchor.z}`).toBeGreaterThan(
          -1,
        );
        remaining.splice(at, 1);
      }
      expect(remaining).toEqual([]);
    }

    /** The pieces-mode height lookup: no sprites, so every unit is a sculpt. */
    const heights = (type: UnitTypeId): number => pieceHeightFor(type);

    it('puts an anchor exactly where the layer drew each badge', () => {
      const game = state(['warrior', 'catapult', 'settler']);
      const board = new BoardGeometry();
      const layer = new UnitLayer();
      layer.build(
        game,
        board,
        new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
        new Quaternion(),
        false,
        null,
        fakeBadges(),
      );
      const meshes = layer.group.children.filter(
        (c): c is InstancedMesh => c instanceof InstancedMesh,
      );

      const anchors = badgeAnchors(game, 0, heights);
      // Three units, three copies of the cylinder apiece.
      expect(anchors).toHaveLength(9);
      expectSamePoints(anchors, drawnBadges(board, meshes));
      layer.dispose();
      board.dispose();
    });

    it('fans a stack the way the pieces are fanned', () => {
      // Two units on one tile: the layer spreads them around the centre, and the
      // tags go with them. The anchors have to use the *same* stack index, which
      // is the one number both sides could have counted differently.
      const game = state(['warrior', 'archer']);
      game.units[1]!.col = game.units[0]!.col;
      game.units[1]!.row = game.units[0]!.row;

      const board = new BoardGeometry();
      const layer = new UnitLayer();
      layer.build(
        game,
        board,
        new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
        new Quaternion(),
        false,
        null,
        fakeBadges(),
      );
      const meshes = layer.group.children.filter(
        (c): c is InstancedMesh => c instanceof InstancedMesh,
      );

      const anchors = badgeAnchors(game, 0, heights);
      expectSamePoints(anchors, drawnBadges(board, meshes));
      // And they really are two different targets: a stack whose badges landed
      // on one point would be a stack with one clickable unit.
      const first = anchors.filter((a) => a.unitId === 1);
      const second = anchors.filter((a) => a.unitId === 2);
      expect(Math.hypot(first[1]!.x - second[1]!.x, first[1]!.z - second[1]!.z)).toBeGreaterThan(
        0,
      );
      layer.dispose();
      board.dispose();
    });

    it('answers for one seat and never for another', () => {
      // A badge is a way to *select*, and there is nothing to select on somebody
      // else's piece: an enemy tag is not a candidate at all, which is what makes
      // a click on one fall through to the ordinary tile contract.
      const game = state(['warrior', 'archer']);
      game.units[1]!.ownerId = 1;

      expect(badgeAnchors(game, 0, heights).map((a) => a.unitId)).toEqual([1, 1, 1]);
      expect(badgeAnchors(game, 1, heights).map((a) => a.unitId)).toEqual([2, 2, 2]);
      expect(badgeAnchors(game, 2, heights)).toEqual([]);
    });

    it('offers each badge in all three copies of the cylinder', () => {
      const game = state(['warrior']);
      const period = wrapWidth(game.map);
      const xs = badgeAnchors(game, 0, heights)
        .map((a) => a.x)
        .sort((a, b) => a - b);
      expect(xs[1]! - xs[0]!).toBeCloseTo(period, 9);
      expect(xs[2]! - xs[1]!).toBeCloseTo(period, 9);
    });

    it('widens the target past the drawn disc, and never narrows it', () => {
      // The knob a mis-aimed click is forgiven by. It is a world radius, not a
      // pixel one — see `badgeHitRadius` — so this is the whole of what the data
      // decides; how many pixels that is at this zoom is the projection's answer.
      expect(badgeHitRadius()).toBeCloseTo((BADGE.diameter / 2) * BADGE.hitboxScale, 12);
      expect(badgeHitRadius()).toBeGreaterThanOrEqual(BADGE.diameter / 2);
      expect(BADGE.hitboxScale).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('the inscription fit step', () => {
  // `fitInscription` is `drawInscriptionCell`'s whole fit decision, held apart
  // from the canvas so it is testable with no font, no context, and no atlas
  // at all — the widths below stand in for `ctx.measureText`'s answer.
  const ICONS = VIEW3D.icons;

  it('leaves the size alone when every line already clears the usable width', () => {
    expect(fitInscription([40, 55], 100)).toBe(1);
    // Exactly at the edge is still "clears" — a line flush with the usable
    // width has not overrun the cell, so there is nothing to shrink for.
    expect(fitInscription([100], 100)).toBe(1);
  });

  it('shrinks by exactly the ratio that brings the widest line to the usable width', () => {
    // Two lines, one of them the one that decides the ratio — the narrower
    // line comes along under it and is never itself measured against the
    // usable width.
    expect(fitInscription([80, 200], 100)).toBeCloseTo(0.5, 12);
    expect(fitInscription([183], 107.52)).toBeCloseTo(107.52 / 183, 12);
  });

  it('declines to divide by zero or produce a negative or growing scale', () => {
    expect(fitInscription([], 100)).toBe(1);
    expect(fitInscription([0, 0], 100)).toBe(1);
    expect(fitInscription([50], 0)).toBe(1);
    expect(fitInscription([50], -10)).toBe(1);
  });

  it('fits the measured overrun from the bug report inside a 128px cell', () => {
    // "HIC SVNT" measured 162px and "DRACONES" measured 183px at
    // `inscriptionScale` 0.2 on a 128px cell — the exact numbers a centred
    // plate was losing ~28px off each end to. `inscriptionPad` reserves a
    // margin on top of the cell itself, so the usable width the fit step
    // targets is narrower than 128 still.
    const cell = 128;
    const usable = cell - 2 * cell * ICONS.inscriptionPad;
    const widths = [162, 183];
    const ratio = fitInscription(widths, usable);
    expect(ratio).toBeLessThan(1);
    const fitted = widths.map((w) => w * ratio);
    for (const width of fitted) expect(width).toBeLessThanOrEqual(usable + 1e-9);
    // And the fitted plate still clears the *cell*, not just the usable
    // fraction of it — the pad is slack on top of fitting, not instead of it.
    for (const width of fitted) expect(width).toBeLessThan(cell);
  });

  it('inscriptionPad is a fraction of the cell, not a pixel count', () => {
    expect(ICONS.inscriptionPad).toBeGreaterThan(0);
    expect(ICONS.inscriptionPad).toBeLessThan(0.5);
  });
});
