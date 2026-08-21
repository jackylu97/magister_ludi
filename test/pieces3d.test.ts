import { describe, expect, it } from 'vitest';
import { Box3, InstancedMesh, Matrix4, MeshToonMaterial, Quaternion, Vector3 } from 'three';

import {
  BoardGeometry,
  MINI_SCULPTS,
  PIECE_SHAPE_IDS,
  pieceHeightFor,
  pieceShapeFor,
} from '../src/render3d/board3d';
import { VIEW3D } from '../src/render3d/lookData';
import { UnitLayer, pieceColors, pieceMaterials } from '../src/render3d/pieces';
import { MaterialLibrary } from '../src/render3d/toon';
import { createMap } from '../src/sim/map';
import { type GameState, newGame } from '../src/sim/state';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../src/sim/unitData';

/**
 * The sculpted miniatures: one board piece per unit type, all standing on the
 * same round base.
 *
 * Three properties are worth a test and the rest is taste. Totality — every unit
 * type in `units.json` has a sculpt and no sculpt is orphaned — because the
 * failure mode of a missing one is an invisible unit rather than a crash.
 * Base-origin — `minY === 0` — because the whole placement convention in this
 * renderer is "put it on the tile top" and a sculpt whose origin drifted would
 * float or sink on every hill. And the height bands, because a set of toys is a
 * set only while the toys are the same size, and nothing else in the codebase
 * would notice a spear growing by half.
 */

const PIECES = VIEW3D.pieces;

function geometry(): BoardGeometry {
  return new BoardGeometry();
}

function boundsOf(board: BoardGeometry, id: (typeof PIECE_SHAPE_IDS)[number]): Box3 {
  const piece = board.pieces[id];
  piece.geometry.computeBoundingBox();
  return piece.geometry.boundingBox!;
}

describe('the sculpt roster', () => {
  it('gives every unit type in units.json a sculpt', () => {
    const board = geometry();
    for (const type of UNIT_TYPE_IDS) {
      const shape = pieceShapeFor(type);
      expect(MINI_SCULPTS[shape], `no sculpt registered for ${type}`).toBeDefined();
      expect(board.pieces[shape]?.geometry, `no geometry built for ${type}`).toBeDefined();
    }
    board.dispose();
  });

  it('leaves no sculpt without a unit standing on it', () => {
    const claimed = new Set(UNIT_TYPE_IDS.map((type) => pieceShapeFor(type)));
    for (const id of PIECE_SHAPE_IDS) {
      expect(claimed.has(id), `${id} is sculpted but nothing stands on it`).toBe(true);
    }
  });

  it('builds non-empty, de-indexed, flat-shaded geometry for each', () => {
    const board = geometry();
    for (const id of PIECE_SHAPE_IDS) {
      const piece = board.pieces[id];
      const position = piece.geometry.getAttribute('position');
      expect(position.count, id).toBeGreaterThan(0);
      // Whole triangles, no index: `flatten` de-indexes so the toon material
      // gets per-face normals, which is the entire faceted look.
      expect(piece.geometry.getIndex()).toBeNull();
      expect(position.count % 3, id).toBe(0);
      expect(piece.geometry.getAttribute('normal').count).toBe(position.count);
      // Small enough to stay hand-made. The whole roster is a rounding error
      // against one downloaded model, which is the point of the primitives-only
      // rule this renderer is built on.
      expect(position.count / 3, id).toBeLessThan(400);
    }
    board.dispose();
  });

  it('stands every sculpt on its own base, origin at the table', () => {
    const board = geometry();
    for (const id of PIECE_SHAPE_IDS) {
      const box = boundsOf(board, id);
      expect(box.min.y, `${id} does not sit on y = 0`).toBeCloseTo(0, 6);
      // The base disc is the widest thing down at the table, so the footprint
      // is the base's footprint whatever the piece is carrying above it.
      const baseWidth = PIECES.base.radius * 1.07 * 2;
      expect(box.max.x - box.min.x, `${id} footprint`).toBeGreaterThanOrEqual(baseWidth - 1e-6);
      expect(box.max.z - box.min.z, `${id} footprint`).toBeGreaterThanOrEqual(baseWidth - 1e-6);
    }
    board.dispose();
  });

  it('keeps every sculpt inside its size class', () => {
    const board = geometry();
    for (const id of PIECE_SHAPE_IDS) {
      const want = PIECES.heights[MINI_SCULPTS[id].cls];
      const top = boundsOf(board, id).max.y;
      expect(top / want, `${id} stands ${top.toFixed(3)} against a class of ${want}`).toBeGreaterThan(0.94);
      expect(top / want, `${id} stands ${top.toFixed(3)} against a class of ${want}`).toBeLessThan(1.06);
    }
    board.dispose();
  });

  it('orders the size classes the way the art direction says', () => {
    // Infantry sit in the band the whole board was proportioned around; a
    // polearm carries its point higher; a rider higher still; and the siege
    // engines are shorter than any of them and wider than all of them.
    expect(PIECES.heights.foot).toBeGreaterThan(0.88);
    expect(PIECES.heights.foot).toBeLessThan(1.02);
    expect(PIECES.heights.polearm).toBeGreaterThan(PIECES.heights.foot);
    expect(PIECES.heights.mounted).toBeGreaterThan(PIECES.heights.polearm);
    expect(PIECES.heights.siege).toBeLessThan(PIECES.heights.foot);

    const board = geometry();
    const catapult = boundsOf(board, 'catapult');
    expect(catapult.max.x - catapult.min.x).toBeGreaterThan(catapult.max.y);
    board.dispose();
  });

  it('reads a visual height off the sculpt rather than off a constant', () => {
    for (const type of UNIT_TYPE_IDS) {
      expect(pieceHeightFor(type)).toBe(PIECES.heights[MINI_SCULPTS[pieceShapeFor(type)].cls]);
    }
    expect(pieceHeightFor('catapult')).toBeLessThan(pieceHeightFor('knight'));
  });
});

describe('miniature inks', () => {
  it('groups every sculpt so each part can take its own colour', () => {
    const board = geometry();
    for (const id of PIECE_SHAPE_IDS) {
      const piece = board.pieces[id];
      expect(piece.parts.length, id).toBeGreaterThan(0);
      expect(piece.geometry.groups.length, id).toBe(piece.parts.length);
      // Every group is a whole run of triangles, and together they cover the
      // geometry exactly — a gap here is an unpainted (black) region.
      let covered = 0;
      for (const [i, group] of piece.geometry.groups.entries()) {
        expect(group.materialIndex).toBe(i);
        expect(group.start).toBe(covered);
        expect(group.count % 3).toBe(0);
        covered += group.count;
      }
      expect(covered).toBe(piece.geometry.getAttribute('position').count);
      // Player colour first, always: the figure and its base are the ownership
      // signal, and the equipment is fixed material colour.
      expect(piece.parts[0]).toBe('body');
    }
    board.dispose();
  });

  it('paints the body in the player colour and the rest from the palette', () => {
    const board = geometry();
    const crimson = 0xb35843;
    for (const id of PIECE_SHAPE_IDS) {
      const piece = board.pieces[id];
      const colors = pieceColors(piece, crimson);
      expect(colors).toHaveLength(piece.parts.length);
      expect(colors[0]).toBe(crimson);
      for (const [i, part] of piece.parts.entries()) {
        if (part === 'body') continue;
        expect(colors[i]).toBe(PIECES.colors[part]);
        expect(colors[i]).not.toBe(crimson);
      }
    }
    board.dispose();
  });

  it('hands a walking copy the same material set as its resting instance', () => {
    const board = geometry();
    const library = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
    const knight = board.pieces.knight;
    const material = pieceMaterials(library, knight, 0x1f8a85);
    expect(Array.isArray(material)).toBe(true);
    const list = material as MeshToonMaterial[];
    expect(list).toHaveLength(knight.parts.length);
    expect(list[0]!.color.getHex()).toBe(0x1f8a85);

    // A single-group sculpt would get a bare material, not an array of one —
    // three treats the two differently and only the array walks the groups.
    const plain = pieceMaterials(library, { geometry: knight.geometry, parts: ['body'] }, 0x1f8a85);
    expect(Array.isArray(plain)).toBe(false);
    board.dispose();
  });
});

describe('the units layer in pieces style', () => {
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

  it('instances one bucket per sculpt and outlines every one of them', () => {
    const board = geometry();
    const layer = new UnitLayer();
    const types: UnitTypeId[] = ['warrior', 'knight', 'trebuchet'];
    layer.build(state(types), board, new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000), new Quaternion(), false, null);

    const meshes = layer.group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
    const drawn = new Set(meshes.map((m) => m.geometry));
    for (const type of types) {
      expect(drawn.has(board.pieces[pieceShapeFor(type)].geometry), type).toBe(true);
    }
    // One lit mesh and one inverted-hull shell per sculpt, and nothing else on
    // a board where nobody is hurt: no HP bars, and no blob shadow — the base
    // disc casts a real one. See the `pieces.ts` docblock.
    expect(meshes).toHaveLength(types.length * 2);
    expect(drawn.has(board.blob)).toBe(false);
    expect(drawn.has(board.standee)).toBe(false);
    for (const mesh of meshes) {
      expect(mesh.geometry.getAttribute('aHullNormal')).toBeDefined();
    }
    layer.dispose();
    board.dispose();
  });

  it('rides the HP bar over the sculpt that unit actually is', () => {
    const board = geometry();
    const game = state(['catapult', 'knight']);
    // Both on one tile, so the only thing that can separate their bars is the
    // height of the sculpt under them — a different tile would bring the board's
    // own hashed height jitter into the comparison.
    for (const unit of game.units) {
      unit.hp = 50;
      unit.col = 3;
      unit.row = 2;
    }
    const layer = new UnitLayer();
    layer.build(game, board, new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000), new Quaternion(), false, null);

    const bars = layer.group.children.filter(
      (c): c is InstancedMesh => c instanceof InstancedMesh && c.geometry === board.bar,
    );
    expect(bars.length).toBeGreaterThan(0);
    const tops = bars.flatMap((mesh) => {
      const out: number[] = [];
      const matrix = new Matrix4();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        out.push(new Vector3().setFromMatrixPosition(matrix).y);
      }
      return out;
    });
    // The knight's bar is higher than the catapult's, because the knight is.
    expect(Math.max(...tops) - Math.min(...tops)).toBeCloseTo(
      pieceHeightFor('knight') - pieceHeightFor('catapult'),
      5,
    );
    layer.dispose();
    board.dispose();
  });

  it('honours the style switch by leaving the sprite path unused without art', () => {
    // `units.style` decides whether the renderer ever *loads* the billboards;
    // the layer itself falls back to the sculpt for anything with no artwork,
    // which is what keeps a half-loaded sprite set from blanking the board.
    expect(VIEW3D.units.style).toBe('pieces');
    const board = geometry();
    const layer = new UnitLayer();
    layer.build(
      state(['warrior']),
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
      { materialFor: () => null, any: false } as never,
    );
    const meshes = layer.group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
    expect(meshes.map((m) => m.geometry)).toEqual([
      board.pieces.warrior.geometry,
      board.pieces.warrior.geometry,
    ]);
    layer.dispose();
    board.dispose();
  });
});
