import { describe, expect, it } from 'vitest';
import {
  Box3,
  type BufferGeometry,
  DoubleSide,
  FrontSide,
  GreaterDepth,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshToonMaterial,
  Quaternion,
  Texture,
  Vector3,
} from 'three';

import { BADGE_CELLS, BADGE_ICON_FILES } from '../src/render3d/badges3d';
import {
  BoardGeometry,
  MINI_SCULPTS,
  MODEL_CLASS_IDS,
  modelClassFor,
  pieceHeightFor,
} from '../src/render3d/board3d';
import {
  type MiniFactory,
  type MiniSpec,
  compositeBowmanMini,
  crossbowmanMini,
  knightMini,
  longswordsmanMini,
  pikemanMini,
  spearmanMini,
  trebuchetMini,
  warriorMini,
} from '../src/render3d/geometry';
import { RENDER_ORDER } from '../src/render3d/instances';
import { VIEW3D } from '../src/render3d/lookData';
import { UnitLayer, buildSpriteUnit, pieceColors, pieceMaterials } from '../src/render3d/pieces';
import { MaterialLibrary } from '../src/render3d/toon';
import { createMap, tileIndex } from '../src/sim/map';
import { type GameState, newGame } from '../src/sim/state';
import { UNIT_TYPE_IDS, type ModelClass, type UnitTypeId, unitDef } from '../src/sim/unitData';
import { resetVisibility } from '../src/sim/visibility';

/**
 * The sculpted miniatures: one board model per *class* of unit, all standing on
 * the same round base.
 *
 * The properties worth a test are the same ones as when there were fifteen
 * sculpts, retargeted at the eight classes that replaced them. Totality — every
 * unit type in `units.json` maps to a class that is sculpted, iconed, and
 * claimed by somebody — because the failure mode of a missing one is an
 * invisible unit rather than a crash. Base-origin — `minY === 0` — because the
 * whole placement convention in this renderer is "put it on the tile top" and a
 * sculpt whose origin drifted would float or sink on every hill. And the height
 * bands, because a set of toys is a set only while the toys are the same size.
 *
 * One test is new rather than retargeted: the eight per-type factories that lost
 * their seat in the registry are still built and measured here, because they are
 * kept deliberately (see the `geometry.ts` docblock) and a bench of sculpts
 * nothing exercises is a bench of sculpts that stops compiling in silence.
 */

const PIECES = VIEW3D.pieces;

function geometry(): BoardGeometry {
  return new BoardGeometry();
}

function boundsOf(board: BoardGeometry, id: ModelClass): Box3 {
  const piece = board.pieces[id];
  piece.geometry.computeBoundingBox();
  return piece.geometry.boundingBox!;
}

/**
 * How many `InstancedMesh`es one *piece* bucket puts on the board.
 *
 * Three passes over one geometry and one instance buffer, and naming the number
 * is the point: it is the draw-call price of a unit class, and the tests that
 * count meshes should fail loudly the day a fourth pass is added rather than
 * quietly absorbing it.
 *
 *   1. the lit sculpt          — `MeshToonMaterial`, the honest render.
 *   2. the inverted-hull shell — the ink outline.
 *   3. the x-ray ghost        — `MaterialLibrary.silhouette`, drawn only where
 *                               world geometry is in front of the piece.
 */
const MESHES_PER_PIECE_BUCKET = 3;

describe('the model-class roster', () => {
  it('gives every unit type in units.json a class model', () => {
    const board = geometry();
    for (const type of UNIT_TYPE_IDS) {
      const modelClass = modelClassFor(type);
      expect(MINI_SCULPTS[modelClass], `no sculpt registered for ${type}`).toBeDefined();
      expect(board.pieces[modelClass]?.geometry, `no geometry built for ${type}`).toBeDefined();
    }
    board.dispose();
  });

  it('gives every class an icon cell and every icon cell a class model', () => {
    // The two lists are written out separately on purpose — the atlas order
    // decides texture coordinates and must not follow a registry reorder — so
    // this is the seam that has to be nailed down.
    expect([...BADGE_CELLS].sort()).toEqual([...MODEL_CLASS_IDS].sort());
    for (const id of MODEL_CLASS_IDS) {
      expect(BADGE_ICON_FILES[id], `no icon file for ${id}`).toMatch(/^sprites\/icons\/.+\.svg$/);
    }
  });

  it('leaves no class model without a unit standing on it', () => {
    // The reserve is gone. `worker` was sculpted and iconed a milestone ahead of
    // the unit that would stand on it, and this test named it as the single
    // permitted exemption; M7 shipped the worker, so the exemption is spent and
    // the registry is now exhaustive in both directions.
    const claimed = new Set(UNIT_TYPE_IDS.map((type) => modelClassFor(type)));
    expect(modelClassFor('worker')).toBe('worker');
    for (const id of MODEL_CLASS_IDS) {
      expect(claimed.has(id), `${id} is sculpted but nothing stands on it`).toBe(true);
    }
  });

  it('collapses the roster rather than merely renaming it', () => {
    // The point of the consolidation, held still: several unit types share a
    // model, and the badge over the piece is what separates them. A day when
    // every type has its own class again is a day this whole design was undone
    // without anybody saying so.
    const classes = new Set(UNIT_TYPE_IDS.map((type) => modelClassFor(type)));
    expect(classes.size).toBeLessThan(UNIT_TYPE_IDS.length);
    expect(modelClassFor('catapult')).toBe(modelClassFor('trebuchet'));
    expect(modelClassFor('warrior')).toBe(modelClassFor('swordsman'));
    expect(modelClassFor('archer')).toBe(modelClassFor('crossbowman'));
    expect(modelClassFor('horseman')).toBe(modelClassFor('knight'));
    // The war chariot joined them when the Age I rework made it a melee shock
    // unit: it is a thing on wheels behind horses, and so is a knight at this
    // silhouette size. The *chariot archer* keeps the mountedRanged sculpt —
    // the one carrying a bow — which is the whole of how the two read apart.
    expect(modelClassFor('chariot')).toBe(modelClassFor('horseman'));
    // …but not everything: a settler must never be a swordsman.
    expect(modelClassFor('settler')).not.toBe(modelClassFor('warrior'));
    expect(modelClassFor('chariotArcher')).not.toBe(modelClassFor('horseman'));
  });

  it('builds non-empty, de-indexed, flat-shaded geometry for each', () => {
    const board = geometry();
    for (const id of MODEL_CLASS_IDS) {
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

  it('stands every class model on its own base, origin at the table', () => {
    const board = geometry();
    for (const id of MODEL_CLASS_IDS) {
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

  it('keeps every class model inside its size class', () => {
    const board = geometry();
    for (const id of MODEL_CLASS_IDS) {
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
    const siege = boundsOf(board, 'siege');
    expect(siege.max.x - siege.min.x).toBeGreaterThan(siege.max.y);
    board.dispose();
  });

  it('reads a visual height off the class model rather than off a constant', () => {
    for (const type of UNIT_TYPE_IDS) {
      expect(pieceHeightFor(type)).toBe(PIECES.heights[MINI_SCULPTS[modelClassFor(type)].cls]);
    }
    expect(pieceHeightFor('catapult')).toBeLessThan(pieceHeightFor('knight'));
    // A trebuchet is a catapult now, and that is the design rather than a bug:
    // the badge over it is what says which machine it is.
    expect(pieceHeightFor('trebuchet')).toBe(pieceHeightFor('catapult'));
  });
});

describe('the reserve sculpts', () => {
  /**
   * The per-type factories the class registry no longer calls.
   *
   * Kept whole because they are finished work in the set's proportions and the
   * day a class earns a split they are the split. Built here at the same spec
   * the board uses so they cannot quietly rot: an unbuildable sculpt in this
   * list is a sculpt somebody would otherwise discover the hard way.
   */
  const RESERVE: [string, MiniFactory, keyof typeof PIECES.heights][] = [
    ['warrior', warriorMini, 'foot'],
    ['compositeBowman', compositeBowmanMini, 'foot'],
    ['crossbowman', crossbowmanMini, 'foot'],
    ['longswordsman', longswordsmanMini, 'foot'],
    ['spearman', spearmanMini, 'polearm'],
    ['pikeman', pikemanMini, 'polearm'],
    ['knight', knightMini, 'mounted'],
    ['trebuchet', trebuchetMini, 'engine'],
  ];

  it('still builds every bench sculpt, on the base and in its size class', () => {
    for (const [name, build, cls] of RESERVE) {
      const spec: MiniSpec = {
        height: PIECES.heights[cls],
        baseRadius: VIEW3D.board.hexRadius * PIECES.base.radius,
        baseThickness: PIECES.base.thickness,
        tokenRadius: PIECES.tokenRadius,
      };
      const piece = build(spec);
      piece.geometry.computeBoundingBox();
      const box = piece.geometry.boundingBox!;
      expect(box.min.y, `${name} does not sit on y = 0`).toBeCloseTo(0, 6);
      expect(box.max.y / spec.height, name).toBeGreaterThan(0.94);
      expect(box.max.y / spec.height, name).toBeLessThan(1.06);
      expect(piece.parts[0], name).toBe('body');
      piece.geometry.dispose();
    }
  });
});

describe('miniature inks', () => {
  it('groups every class model so each part can take its own colour', () => {
    const board = geometry();
    for (const id of MODEL_CLASS_IDS) {
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
    for (const id of MODEL_CLASS_IDS) {
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
    const rider = board.pieces.mounted;
    const material = pieceMaterials(library, rider, 0x1f8a85);
    expect(Array.isArray(material)).toBe(true);
    const list = material as MeshToonMaterial[];
    expect(list).toHaveLength(rider.parts.length);
    expect(list[0]!.color.getHex()).toBe(0x1f8a85);

    // A single-group sculpt would get a bare material, not an array of one —
    // three treats the two differently and only the array walks the groups.
    const plain = pieceMaterials(library, { geometry: rider.geometry, parts: ['body'] }, 0x1f8a85);
    expect(Array.isArray(plain)).toBe(false);
    board.dispose();
  });

  /**
   * A dying piece is drawn by `Renderer3D.spawnFaller`, which takes the same
   * material set a walker gets and then *clones* it so the fade can be applied
   * to one corpse rather than to every piece of that colour on the board. That
   * clone-and-fade has to work for both shapes `pieceMaterials` returns — a bare
   * material for a one-group sculpt, an array for a multi-group one — which is
   * exactly the kind of thing a renderer test can pin down and a browser poke
   * can only fail to notice.
   */
  it('lets a dying piece fade a private clone of any sculpt’s materials', () => {
    const board = geometry();
    const library = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);

    for (const modelClass of Object.keys(board.pieces) as ModelClass[]) {
      const piece = board.pieces[modelClass];
      const shared = pieceMaterials(library, piece, 0xd4502e);
      const cloned = Array.isArray(shared)
        ? shared.map((material) => material.clone())
        : shared.clone();

      const list = (Array.isArray(cloned) ? cloned : [cloned]) as MeshToonMaterial[];
      const sharedList = (Array.isArray(shared) ? shared : [shared]) as MeshToonMaterial[];
      expect(list).toHaveLength(sharedList.length);

      for (let i = 0; i < list.length; i++) {
        const copy = list[i]!;
        copy.transparent = true;
        copy.depthWrite = false;
        copy.opacity = 0.5;
        // The clone carries the piece's ink, so the corpse is visibly the piece
        // that was standing there…
        expect(copy.color.getHex()).toBe(sharedList[i]!.color.getHex());
        // …and fading it leaves the shared library entry untouched, which is the
        // whole reason it is cloned: every other unit of this colour is drawn
        // from that one.
        expect(sharedList[i]!.opacity).toBe(1);
        expect(copy).not.toBe(sharedList[i]);
        copy.dispose();
      }
    }
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

  it('instances one bucket per class model and outlines every one of them', () => {
    const board = geometry();
    const layer = new UnitLayer();
    const types: UnitTypeId[] = ['warrior', 'knight', 'trebuchet'];
    layer.build(state(types), board, new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000), new Quaternion(), false, null);

    const meshes = layer.group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
    const drawn = new Set(meshes.map((m) => m.geometry));
    for (const type of types) {
      expect(drawn.has(board.pieces[modelClassFor(type)].geometry), type).toBe(true);
    }
    // One lit mesh, one inverted-hull shell and one x-ray ghost per *class*, and
    // nothing else on a board where nobody is hurt and no badge atlas has
    // loaded: no HP bars, and no blob shadow — the base disc casts a real one.
    // See the `pieces.ts` docblock. Three types, three classes here (melee,
    // mounted, siege).
    const classes = new Set(types.map((type) => modelClassFor(type)));
    expect(classes.size).toBe(3);
    expect(meshes).toHaveLength(classes.size * MESHES_PER_PIECE_BUCKET);
    expect(drawn.has(board.blob)).toBe(false);
    expect(drawn.has(board.standee)).toBe(false);
    for (const mesh of meshes) {
      expect(mesh.geometry.getAttribute('aHullNormal')).toBeDefined();
    }
    layer.dispose();
    board.dispose();
  });

  it('shares one bucket between two unit types of the same class', () => {
    const board = geometry();
    const layer = new UnitLayer();
    // A catapult and a trebuchet are one model with two badges. Both stand in
    // the same instanced mesh, which is the whole saving the consolidation buys.
    layer.build(
      state(['catapult', 'trebuchet']),
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
      null,
    );
    const meshes = layer.group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
    expect(meshes).toHaveLength(MESHES_PER_PIECE_BUCKET);
    expect(meshes[0]!.geometry).toBe(board.pieces.siege.geometry);
    // Three wrap copies apiece, in one buffer.
    expect(meshes[0]!.count).toBe(6);
    layer.dispose();
    board.dispose();
  });

  it('rides the HP bar over the model that unit actually is', () => {
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
    // The sculpt, its outline shell and its x-ray ghost: one geometry, three
    // passes. See `MESHES_PER_PIECE_BUCKET`.
    expect(meshes.map((m) => m.geometry)).toEqual(
      new Array<BufferGeometry>(MESHES_PER_PIECE_BUCKET).fill(board.pieces.melee.geometry),
    );
    layer.dispose();
    board.dispose();
  });
});

// --- the x-ray silhouette ---------------------------------------------------

/**
 * The occlusion ghost: what shows through the pine tree standing in front of a
 * unit.
 *
 * Everything worth asserting here is a *material flag* or a *mesh count*, and
 * that is not a limitation of testing in node — it is where the feature
 * actually lives. The visible result is one line of GPU state: an inverted depth
 * test. So the tests below pin the flags that produce it, the draw-call price of
 * producing it, and the two things it must not break — fog filtering and the
 * walk-hide — and the appearance itself is a browser-only check.
 */
describe('the x-ray silhouette', () => {
  function seatedState(types: UnitTypeId[]): GameState {
    const game = newGame({
      seed: 11,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#d4502e', isHuman: true },
        { name: 'B', color: '#3f639f' },
      ],
    });
    game.map = createMap({ width: 14, height: 10, terrain: 'grassland' });
    game.tileOwner = new Array<number | null>(14 * 10).fill(null);
    game.cities = [];
    game.units = types.map((type, i) => ({
      id: i + 1,
      type,
      ownerId: 0,
      col: 2 + i * 2,
      row: 3,
      hp: unitDef(type).maxHp,
      movesLeft: 2,
      hasAttacked: false,
    }));
    // The board was replaced under this state; the fog grids were sized for the
    // old one. See `resetVisibility` — and run it *after* the units, so the seat
    // is actually looking at them.
    resetVisibility(game);
    return game;
  }

  function build(game: GameState, levels: readonly number[] | null = null) {
    const board = geometry();
    const materials = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
    const layer = new UnitLayer();
    layer.build(game, board, materials, new Quaternion(), false, null, null, null, levels);
    const meshes = layer.group.children.filter(
      (c): c is InstancedMesh => c instanceof InstancedMesh,
    );
    return { board, materials, layer, meshes };
  }

  /** The ghost meshes: the ones drawn with a silhouette material. */
  function ghosts(meshes: InstancedMesh[]): InstancedMesh[] {
    return meshes.filter(
      (mesh) =>
        mesh.material instanceof MeshBasicMaterial && mesh.material.depthFunc === GreaterDepth,
    );
  }

  it('inverts the depth test, and writes no depth of its own', () => {
    const { layer, meshes, board } = build(seatedState(['warrior']));
    const ghost = ghosts(meshes)[0]!;
    const material = ghost.material as MeshBasicMaterial;

    // THE flag. `GreaterDepth` means a fragment survives only where the depth
    // buffer already holds something *nearer* — i.e. only where the piece is
    // occluded. The unit's own solid pass is opaque and has already written its
    // depth, so on every pixel where the piece is plainly visible this tests
    // equal rather than greater and draws nothing at all. That is why a unit
    // standing in the open costs this pass nothing, and why the solid render
    // stays honest: a mountain still hides the real piece.
    expect(material.depthFunc).toBe(GreaterDepth);
    expect(material.depthTest).toBe(true);
    // No depth write, for the reason every decal has none: a ghost must not
    // punch its own occluder out of the buffer for whatever is drawn next.
    expect(material.depthWrite).toBe(false);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(VIEW3D.units.silhouetteAlpha);
    expect(VIEW3D.units.silhouetteAlpha).toBeGreaterThan(0);
    expect(VIEW3D.units.silhouetteAlpha).toBeLessThan(1);
    // Flat player ink, not the sculpt's toon shading: a ghost is a position, not
    // a second view of the model.
    expect(material.map).toBeNull();
    expect(ghost.castShadow).toBe(false);
    expect(ghost.receiveShadow).toBe(false);
    layer.dispose();
    board.dispose();
  });

  it('sits above the board decals and below everything the interface says', () => {
    const { layer, meshes, board } = build(seatedState(['warrior']));
    expect(ghosts(meshes)[0]!.renderOrder).toBe(RENDER_ORDER.silhouette);
    // The slot is the statement: a ghost is information about a *piece*, so it
    // beats a territory tint, which is scenery — and it loses to everything from
    // `onTop` up, because a selection ring or a route dot must never be tinted
    // by a ghost lying under it.
    expect(RENDER_ORDER.silhouette).toBeGreaterThan(RENDER_ORDER.overlay);
    expect(RENDER_ORDER.silhouette).toBeLessThan(RENDER_ORDER.onTop);
    expect(RENDER_ORDER.silhouette).toBeLessThan(RENDER_ORDER.badge);
    layer.dispose();
    board.dispose();
  });

  it('costs one draw per existing piece bucket, not one per unit', () => {
    // Six units, two classes. The ghost is a second pass over the *same*
    // instance buffer, so the price is per bucket and a sixth warrior is free.
    const types: UnitTypeId[] = ['warrior', 'warrior', 'warrior', 'catapult', 'catapult', 'catapult'];
    const { layer, meshes, board } = build(seatedState(types));
    const classes = new Set(types.map((type) => modelClassFor(type)));
    expect(classes.size).toBe(2);

    expect(meshes).toHaveLength(classes.size * MESHES_PER_PIECE_BUCKET);
    const ghosted = ghosts(meshes);
    expect(ghosted).toHaveLength(classes.size);
    // The delta against a board with no silhouette at all: exactly +1 mesh per
    // piece bucket, and nothing else moved.
    expect(meshes.length - ghosted.length).toBe(classes.size * (MESHES_PER_PIECE_BUCKET - 1));

    for (const ghost of ghosted) {
      // All three passes over one geometry share one instance buffer, so they
      // share its length: three wrap copies of three units.
      const passes = meshes.filter((mesh) => mesh.geometry === ghost.geometry);
      expect(passes).toHaveLength(MESHES_PER_PIECE_BUCKET);
      for (const pass of passes) expect(pass.count).toBe(9);
    }
    layer.dispose();
    board.dispose();
  });

  it('shares one ghost material per player colour', () => {
    const materials = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
    const a = materials.silhouette(0x112233);
    const b = materials.silhouette(0x112233);
    const c = materials.silhouette(0x445566);
    // Cached like every other material here, which is what keeps a whole army in
    // one bucket: two units of one player share a ghost, two players do not.
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    materials.dispose();
  });

  it('is not given to badges, rims or HP bars', () => {
    const game = seatedState(['warrior']);
    game.units[0]!.hp = 40;
    const { layer, meshes, board } = build(game);
    // Only the sculpt ghosts. A badge is already drawn clear of the canopy, an
    // HP bar already ignores depth entirely, and a rim is player colour on a
    // disc — ghosting any of them would be a second copy of a readout that was
    // never occluded in the first place.
    expect(ghosts(meshes)).toHaveLength(1);
    expect(ghosts(meshes)[0]!.geometry).toBe(board.pieces.melee.geometry);
    layer.dispose();
    board.dispose();
  });

  it('is filtered by the seat exactly as the solid piece is', () => {
    const game = seatedState(['warrior']);
    // A second player's unit, far away and unwatched.
    game.units.push({
      id: 99,
      type: 'warrior',
      ownerId: 1,
      col: 12,
      row: 8,
      hp: 100,
      movesLeft: 2,
      hasAttacked: false,
    });
    const levels = game.visibility[0]!;
    expect(levels[tileIndex(game.map, 12, 8)]).toBe(0);

    const fogged = build(game, levels);
    // One class, one player drawn: the far warrior contributes neither a solid
    // pass nor a ghost. The ghost needs no fog rule of its own — it is created
    // by the same `add` the piece is, so a unit that was never added has no
    // silhouette to leak.
    expect(ghosts(fogged.meshes)).toHaveLength(1);
    fogged.layer.dispose();
    fogged.board.dispose();

    const omniscient = build(game, null);
    // Without fog both players are drawn, and each colour is its own bucket.
    expect(ghosts(omniscient.meshes)).toHaveLength(2);
    omniscient.layer.dispose();
    omniscient.board.dispose();
  });

  it('travels with the piece when a walk hides it', () => {
    const game = seatedState(['warrior']);
    const { layer, meshes, board } = build(game);
    const ghost = ghosts(meshes)[0]!;
    const before = new Matrix4();
    ghost.getMatrixAt(0, before);

    layer.hide(game.units[0]!.id);
    const hidden = new Matrix4();
    ghost.getMatrixAt(0, hidden);
    // A silhouette left hovering over an empty tile while its unit slid away
    // would be the most visible bug on the board, so hide moves all three passes
    // together (see `InstanceCollector.hide`).
    expect(hidden.elements.every((value) => value === 0 || value === 1)).toBe(true);
    expect(hidden.equals(before)).toBe(false);

    layer.restore(game.units[0]!.id);
    const restored = new Matrix4();
    ghost.getMatrixAt(0, restored);
    expect(restored.equals(before)).toBe(true);
    layer.dispose();
    board.dispose();
  });

  it('ghosts a billboard through its own cut-out, not as a rectangle', () => {
    const materials = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
    const map = new Texture();
    const ghost = materials.silhouette(0x112233, map);
    // The sprite path keeps the texture so `alphaTest` still cuts the figure
    // out — what shows through a pine is the shape of the soldier. Double-sided
    // like the sprite material it is ghosting, so it cannot vanish by ending up
    // back-facing.
    expect(ghost.map).toBe(map);
    expect(ghost.alphaTest).toBe(VIEW3D.units.sprite.alphaTest);
    expect(ghost.side).toBe(DoubleSide);
    expect(ghost.depthFunc).toBe(GreaterDepth);
    // The flat one is single-sided: drawing a solid sculpt's back faces too
    // would blend the shape over itself and double the alpha.
    expect(materials.silhouette(0x112233).side).toBe(FrontSide);
    materials.dispose();
  });

  it('gives a walking billboard the same ghost its resting one has', () => {
    const board = geometry();
    const materials = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
    const sprite = new MeshBasicMaterial({ map: new Texture(), alphaTest: 0.4 });
    const group = buildSpriteUnit(board, materials, sprite, 0x112233, new Quaternion());

    const found: InstancedMesh[] = [];
    group.traverse((child) => {
      const material = (child as { material?: unknown }).material;
      if (material instanceof MeshBasicMaterial && material.depthFunc === GreaterDepth) {
        found.push(child as unknown as InstancedMesh);
      }
    });
    // `buildSpriteUnit` is shared by the resting layer and by the walker
    // (`Renderer3D.spawnWalker`), so this one assertion covers both: a unit
    // looks identical standing still and mid-stride, ghost included.
    expect(found).toHaveLength(1);
    expect(found[0]!.renderOrder).toBe(RENDER_ORDER.silhouette);
    board.dispose();
    materials.dispose();
  });
});
