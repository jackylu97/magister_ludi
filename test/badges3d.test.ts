import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';

import {
  BADGE_CELLS,
  type UnitBadges,
  badgeAtlasLayout,
  badgeAtlasSize,
  badgeCellOrigin,
  badgeCellRect,
  badgeCenterY,
  badgeTopY,
  cssHex,
  hpBarY,
  paperRadiusFraction,
  rimInnerFraction,
} from '../src/render3d/badges3d';
import { BoardGeometry, MODEL_CLASS_IDS, modelClassFor, pieceHeightFor } from '../src/render3d/board3d';
import { atlasQuad, discRing } from '../src/render3d/geometry';
import { VIEW3D } from '../src/render3d/lookData';
import { UnitLayer } from '../src/render3d/pieces';
import { MaterialLibrary } from '../src/render3d/toon';
import { createMap } from '../src/sim/map';
import { type GameState, newGame } from '../src/sim/state';
import { type UnitTypeId, unitDef } from '../src/sim/unitData';

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
  return { material: new MeshBasicMaterial() } as unknown as UnitBadges;
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

  it('gives the board one quad per class, each with its own coordinates', () => {
    const board = new BoardGeometry();
    const seen = new Set<number>();
    for (const id of MODEL_CLASS_IDS) {
      const quad = board.badgeIcons[id];
      expect(quad, id).toBeDefined();
      const uv = quad.getAttribute('uv');
      seen.add(Math.round(uv.getX(0) * 1e6) * 1e3 + Math.round(uv.getY(0) * 1e3));
    }
    expect(seen.size).toBe(MODEL_CLASS_IDS.length);
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
    }));
    return game;
  }

  function build(types: UnitTypeId[], selected: number | null = null) {
    const board = new BoardGeometry();
    const layer = new UnitLayer();
    layer.build(
      state(types),
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

  it('draws a disc and a rim for every unit, batched by class and by player', () => {
    // Five units across three classes, all one player: three disc buckets, one
    // rim bucket. The whole point of the split — badge cost is flat in the unit
    // count and grows only with the variety on the board.
    const { board, layer, meshes } = build([
      'warrior',
      'swordsman',
      'archer',
      'catapult',
      'trebuchet',
    ]);
    const discs = meshes.filter((m) =>
      MODEL_CLASS_IDS.some((id) => board.badgeIcons[id] === m.geometry),
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
    const disc = meshes.find((m) => m.geometry === board.badgeIcons.melee)!;
    expect(disc.material).toBeInstanceOf(MeshBasicMaterial);
    expect(disc.castShadow).toBe(false);
    expect(disc.receiveShadow).toBe(false);
    // A textured bucket is never given an inverted hull: exactly one mesh
    // carries the disc geometry, where an outlined shape would have two.
    expect(meshes.filter((m) => m.geometry === board.badgeIcons.melee)).toHaveLength(1);
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

  it('takes a unit’s badge off the board when the unit is hidden for a walk', () => {
    const { board, layer, meshes } = build(['warrior']);
    const disc = meshes.find((m) => m.geometry === board.badgeIcons.melee)!;
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
    const disc = meshes.find((m) => m.geometry === board.badgeIcons.melee);
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
    expect(meshes).toHaveLength(2);
    layer.dispose();
    board.dispose();
  });

  it('names a class for every unit type on the board', () => {
    // The badge is only meaningful while `modelClassFor` is total; a type that
    // fell out of the table would draw somebody else's icon.
    for (const cls of MODEL_CLASS_IDS) expect(BADGE_CELLS).toContain(cls);
    expect(modelClassFor('trebuchet')).toBe('siege');
    expect(modelClassFor('chariot')).toBe('mountedRanged');
  });
});
