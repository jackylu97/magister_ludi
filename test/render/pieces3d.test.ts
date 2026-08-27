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

import {
  BADGE_CELLS,
  BADGE_ICON_FILES,
  type TileIcons,
  type UnitBadges,
} from '../../src/render3d/badges3d';
import {
  BoardGeometry,
  MINI_SCULPTS,
  MODEL_CLASS_IDS,
  badgeClassFor,
  modelClassFor,
  pieceHeightFor,
} from '../../src/render3d/board3d';
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
} from '../../src/render3d/geometry';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { VIEW3D } from '../../src/render3d/lookData';
import {
  UnitLayer,
  buildSpriteUnit,
  pieceColors,
  pieceMaterials,
  signUnits,
} from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { createMap, tileIndex } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { UNIT_TYPE_IDS, type ModelClass, type UnitTypeId, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

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

/** A stand-in for the tile atlas: the layer only ever wants a material off it. */
const fakeIcons = {
  material: new MeshBasicMaterial({ depthTest: false, depthWrite: false }),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

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

  it('gives every class an icon cell and every icon cell an icon file', () => {
    // The two lists are written out separately on purpose — the atlas order
    // decides texture coordinates and must not follow a registry reorder — so
    // this is the seam that has to be nailed down.
    //
    // They used to be the same *set*. They are not any more, and the difference
    // is exactly one member: a great person stands on the settler's sculpt and
    // wears a badge of its own (`BadgeClass`), so the badge list is the sculpt
    // list plus `greatPerson` and nothing else. Written as a containment plus a
    // named exception rather than a sorted equality, so a tenth cell somebody
    // adds without deciding what it is fails here.
    for (const id of MODEL_CLASS_IDS) expect(BADGE_CELLS).toContain(id);
    expect(BADGE_CELLS).toContain('greatPerson');
    expect(BADGE_CELLS).toHaveLength(MODEL_CLASS_IDS.length + 1);
    for (const id of BADGE_CELLS) {
      expect(BADGE_ICON_FILES[id], `no icon file for ${id}`).toMatch(/^sprites\/icons\/.+\.svg$/);
    }
  });

  it('badges a great person as itself and never as the settler it is sculpted as', () => {
    // The whole of what `badgeClassFor` exists for. The sculpt is shared on
    // purpose — a great person *is* a civilian with a handcart — and the badge
    // is the one place the board can say it is not a settler.
    const greatPeople = UNIT_TYPE_IDS.filter((type) => unitDef(type).greatWork);
    expect(greatPeople.length).toBeGreaterThan(0);
    for (const type of greatPeople) {
      expect(modelClassFor(type)).toBe('settler');
      expect(badgeClassFor(type)).toBe('greatPerson');
    }
    // And nothing else takes it: every ordinary row still badges as its class.
    for (const type of UNIT_TYPE_IDS) {
      if (unitDef(type).greatWork) continue;
      expect(badgeClassFor(type)).toBe(modelClassFor(type));
    }
  });

  it('builds a badge quad for every cell, the great person included', () => {
    const board = geometry();
    const seen = new Set<unknown>();
    for (const id of BADGE_CELLS) {
      expect(board.badgeIcons[id], `no badge quad for ${id}`).toBeDefined();
      seen.add(board.badgeIcons[id]);
    }
    // Distinct geometries, because each bakes its own atlas rectangle: two
    // classes sharing one quad would be two classes wearing one icon.
    expect(seen.size).toBe(BADGE_CELLS.length);
    board.dispose();
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

// --- the worker charge badge -------------------------------------------------

/**
 * The small numeral boss at a worker's badge corner, naming `chargesLeft`.
 *
 * Built from `geometry.numeralMarkers` — the standing twin of the lens's flat
 * digits (`buildNumeralMarkers` in `board3d.ts`) — rather than a cell of the
 * badge atlas, so what is asserted here is the same shape of thing the yield
 * glyph tests hold still: which geometry got drawn, in which material's bucket,
 * for which unit.
 */
describe('the worker charge badge', () => {
  const fakeBadges = { material: new MeshBasicMaterial() } as unknown as UnitBadges;

  function state(units: { type: UnitTypeId; chargesLeft?: number }[]): GameState {
    const game = newGame({
      seed: 3,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#d4502e', isHuman: true }],
    });
    game.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
    resetVisibility(game);
    game.tileOwner = new Array<number | null>(12 * 8).fill(null);
    game.cities = [];
    game.units = units.map(({ type, chargesLeft }, i) => ({
      id: i + 1,
      type,
      ownerId: 0,
      col: 1 + i * 2,
      row: 2,
      hp: unitDef(type).maxHp,
      movesLeft: 2,
      hasAttacked: false,
      ...(chargesLeft === undefined ? {} : { chargesLeft }),
    }));
    return game;
  }

  it('bosses a worker\'s badge with the digit it has charges left', () => {
    const board = geometry();
    const layer = new UnitLayer();
    layer.build(
      state([{ type: 'worker', chargesLeft: 3 }]),
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
      null,
      fakeBadges,
      null,
      null,
      fakeIcons,
    );
    const boss = layer.group.children.find(
      (c): c is InstancedMesh => c instanceof InstancedMesh && c.geometry === board.numeralMarkers[3],
    );
    expect(boss).toBeDefined();
    expect(boss!.material).toBe(fakeIcons.standingMaterial);
    layer.dispose();
    board.dispose();
  });

  it('draws no boss for a unit that is not a builder', () => {
    const board = geometry();
    const layer = new UnitLayer();
    layer.build(
      state([{ type: 'warrior' }]),
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
      null,
      fakeBadges,
      null,
      null,
      fakeIcons,
    );
    const meshes = layer.group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
    expect(meshes.some((mesh) => board.numeralMarkers.includes(mesh.geometry))).toBe(false);
    layer.dispose();
    board.dispose();
  });

  it('draws no boss at all while the tile atlas has not loaded yet', () => {
    const board = geometry();
    const layer = new UnitLayer();
    layer.build(
      state([{ type: 'worker', chargesLeft: 3 }]),
      board,
      new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000),
      new Quaternion(),
      false,
      null,
      fakeBadges,
      // No `icons` argument: the atlas the boss is drawn from is not ready, so
      // there is nothing to draw it with — matching the badges themselves, which
      // stay off the board without their own atlas.
    );
    const meshes = layer.group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
    expect(meshes.some((mesh) => board.numeralMarkers.includes(mesh.geometry))).toBe(false);
    layer.dispose();
    board.dispose();
  });

  /**
   * `chargesLeft` has to move `signUnits`, or the rebuild that follows a
   * `layWorkerImprovement`/`chopFeature` command would never fire — see the
   * `CLAUDE.md` piece-fingerprint trap. Held still at the pure-function level
   * rather than through a full renderer, because the renderer itself is not
   * unit-tested (it needs a real WebGL context); `signUnits` is exactly the kind
   * of pure arithmetic this file already checks the rest of the layer with.
   */
  it('moves the units fingerprint when a worker spends a charge', () => {
    const before = state([{ type: 'worker', chargesLeft: 3 }]);
    const after = state([{ type: 'worker', chargesLeft: 2 }]);
    expect(signUnits(after)).not.toBe(signUnits(before));
  });

  it('leaves the fingerprint alone when nothing about a unit changed', () => {
    const a = state([{ type: 'worker', chargesLeft: 3 }]);
    const b = state([{ type: 'worker', chargesLeft: 3 }]);
    expect(signUnits(a)).toBe(signUnits(b));
  });

  /**
   * The other side of the fingerprint trap, and the answer to the question the
   * scout's movement buff raises: does a change to what a unit can *do* need a
   * rebuild?
   *
   * No, and it must not get one. The trap in `CLAUDE.md` is about properties
   * that are *visible* — position, health, owner — and a movement allowance is
   * not one of them: a scout with three points and a scout with none are the
   * same piece standing on the same hex, drawn identically. Every unit on the
   * board spends its allowance every turn, so a fingerprint that moved with
   * `movesLeft` would rebuild the whole units layer on every step of every
   * march — the one thing this renderer refuses to do — and it would do it to
   * redraw exactly what was already there.
   *
   * Pinned rather than left implicit because the natural mistake, on being told
   * "the scout's moves changed", is to add the field to the hash.
   */
  it('leaves the fingerprint alone when only a movement allowance changed', () => {
    const spent = state([{ type: 'scout' }]);
    const fresh = state([{ type: 'scout' }]);
    spent.units[0]!.movesLeft = 0;
    expect(fresh.units[0]!.movesLeft).not.toBe(spent.units[0]!.movesLeft);
    expect(signUnits(spent)).toBe(signUnits(fresh));
  });

  /**
   * `Unit.person` joins the hash, and the state docblock that asks for it is the
   * authority (`CLAUDE.md`'s piece-fingerprint trap, one more property).
   *
   * It is the one member of the hash that changes nothing drawn *today* — every
   * great person wears the one laurel badge and stands on the settler's sculpt —
   * and it is in anyway because it is the only thing that says which piece this
   * is. The three cases below are the whole contract: a person appearing moves
   * it, two different people differ, and two of the same do not.
   */
  it('moves the units fingerprint when a piece becomes somebody', () => {
    const anonymous = state([{ type: 'greatPerson' }]);
    const named = state([{ type: 'greatPerson' }]);
    named.units[0]!.person = GREAT_PERSON_IDS[0]!;
    expect(signUnits(named)).not.toBe(signUnits(anonymous));
  });

  it('tells two different great people apart', () => {
    const one = state([{ type: 'greatPerson' }]);
    const other = state([{ type: 'greatPerson' }]);
    one.units[0]!.person = GREAT_PERSON_IDS[0]!;
    other.units[0]!.person = GREAT_PERSON_IDS[1]!;
    expect(GREAT_PERSON_IDS[0]).not.toBe(GREAT_PERSON_IDS[1]);
    expect(signUnits(one)).not.toBe(signUnits(other));
  });

  it('leaves the fingerprint alone for two pieces that are the same person', () => {
    const a = state([{ type: 'greatPerson' }]);
    const b = state([{ type: 'greatPerson' }]);
    a.units[0]!.person = GREAT_PERSON_IDS[0]!;
    b.units[0]!.person = GREAT_PERSON_IDS[0]!;
    expect(signUnits(a)).toBe(signUnits(b));
  });

  /**
   * And nothing *else* new joined it. Written as a source read rather than as a
   * behaviour, because the failure this guards against is somebody adding a
   * field to the hash that moves on every step of every march — the one thing
   * the movement-allowance test above is about, generalised.
   */
  it('hashes exactly the seven properties the trap names', () => {
    // Read through Vite's raw glob rather than `node:fs` — the pattern
    // `test/sim/cities.test.ts` set for the same kind of assertion, and for the
    // same reason: this project has no node typings and a source read is not
    // worth a dependency.
    const modules = import.meta.glob('../../src/render3d/pieces.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const source = Object.values(modules)[0]!;
    const body = source.slice(
      source.indexOf('export function signUnits'),
      source.indexOf('/** Unit types as small integers'),
    );
    const hashed = [...body.matchAll(/h \^ ([A-Za-z_.()?]+)/g)].map((m) => m[1]);
    expect(hashed).toEqual([
      'unit.id',
      'unit.col',
      'unit.row',
      'unit.hp',
      'unit.ownerId',
      '(UNIT_TYPE_INDEX.get(unit.type)',
      'chargesLeft(unit)',
      'personIndex(unit)',
    ]);
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

/**
 * **A fight must not touch a bystander's bar** (user, 2026-08-26: "health bars
 * bugged... when there are 3 units adjacent to each other, the combat somehow
 * modifies the health bar of the third unit that wasn't involved").
 *
 * The claim under test is narrow and is the one a diff of two boards can make:
 * **each drawn bar belongs to exactly one unit, and says that unit's fraction.**
 * A bar is two instances — a full-width backing and a fill scaled to the
 * fraction — so "whose bar is this" is answered by its x position and "what does
 * it say" by the fill's width. Three units, one of them hurt, is the smallest
 * board on which a bar can land over the wrong head.
 */
/** The wrap copies every instanced visual is emitted in. See `copyOffsets`. */
const WRAP_COPIES = 3;

describe('the HP bar belongs to its own unit', () => {
  /** Three warriors in a row on blank grassland, adjacent. */
  function state(types: UnitTypeId[]): GameState {
    const game = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#d4502e', isHuman: true }],
    });
    game.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
    resetVisibility(game);
    game.tileOwner = new Array<number | null>(12 * 8).fill(null);
    game.cities = [];
    game.units = types.map((type, i) => ({
      id: i + 1,
      type,
      ownerId: 0,
      col: 1 + i,
      row: 2,
      hp: unitDef(type).maxHp,
      movesLeft: 2,
      hasAttacked: false,
    }));
    return game;
  }

  /** Every bar instance the layer drew, as `{ x, y, width }`. */
  function bars(layer: UnitLayer, board: ReturnType<typeof geometry>) {
    const out: { x: number; y: number; width: number }[] = [];
    const matrix = new Matrix4();
    const scale = new Vector3();
    const position = new Vector3();
    for (const child of layer.group.children) {
      if (!(child instanceof InstancedMesh) || child.geometry !== board.bar) continue;
      for (let i = 0; i < child.count; i++) {
        child.getMatrixAt(i, matrix);
        position.setFromMatrixPosition(matrix);
        scale.setFromMatrixScale(matrix);
        out.push({ x: position.x, y: position.y, width: scale.x });
      }
    }
    return out;
  }

  it('draws bars only over the units that are actually hurt', () => {
    const board = geometry();
    const game = state(['warrior', 'warrior', 'warrior']);
    // Three in a row, adjacent — the board the bug was seen on.
    game.units.forEach((unit, i) => {
      unit.col = 3 + i;
      unit.row = 2;
    });
    const layer = new UnitLayer();
    const library = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);

    // Nobody hurt: no bars at all.
    layer.build(game, board, library, new Quaternion(), false, null);
    expect(bars(layer, board)).toHaveLength(0);

    // The middle one takes a blow. One unit hurt is one bar — a backing and a
    // fill — over one column, and nothing over either neighbour. Every instance
    // is drawn three times, once per wrap copy (`copyOffsets`), so the counts
    // below are per-copy figures times WRAP_COPIES.
    game.units[1]!.hp = 40;
    layer.build(game, board, library, new Quaternion(), false, null);
    const drawn = bars(layer, board);
    expect(drawn).toHaveLength(2 * WRAP_COPIES);
    // One column: the backing and the fill share a left edge, and the three
    // copies are the same bar a period apart.
    expect(new Set(drawn.map((bar) => Math.round(bar.x * 1000))).size).toBe(WRAP_COPIES);
    // And the fill says 40/100 of the backing, not somebody else's fraction.
    const widths = drawn.map((bar) => bar.width).sort((a, b) => a - b);
    expect(widths[0]! / widths[widths.length - 1]!).toBeCloseTo(0.4, 5);

    layer.dispose();
    board.dispose();
  });

  it('takes the bar with the piece when a walk hides it', () => {
    const board = geometry();
    const game = state(['warrior', 'warrior', 'warrior']);
    game.units.forEach((unit, i) => {
      unit.col = 3 + i;
      unit.row = 2;
      unit.hp = 40;
    });
    const layer = new UnitLayer();
    const library = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
    layer.build(game, board, library, new Quaternion(), false, null);
    expect(bars(layer, board)).toHaveLength(6 * WRAP_COPIES);

    // The animation layer is drawing this one now. Its resting visual comes off
    // the board — **all** of it. A bar left standing over the hex a piece walked
    // out of is a bar the eye reads as belonging to whoever is standing next to
    // it, which is exactly the bug this pins.
    layer.hide(game.units[1]!.id);
    const left = bars(layer, board).filter((bar) => bar.width > 0);
    expect(left).toHaveLength(4 * WRAP_COPIES);

    layer.restore(game.units[1]!.id);
    expect(bars(layer, board).filter((bar) => bar.width > 0)).toHaveLength(6 * WRAP_COPIES);

    layer.dispose();
    board.dispose();
  });

  it('re-applies a standing hide to the bars across a rebuild', () => {
    const board = geometry();
    const game = state(['warrior', 'warrior', 'warrior']);
    game.units.forEach((unit, i) => {
      unit.col = 3 + i;
      unit.row = 2;
      unit.hp = 40;
    });
    const layer = new UnitLayer();
    const library = new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
    layer.build(game, board, library, new Quaternion(), false, null);
    layer.hide(game.units[1]!.id);

    // A blow lands somewhere else while the walk is still in flight: the layer
    // is rebuilt off the fingerprint, and `build` re-applies every standing
    // hide. The bar has to go back down with the rest of the piece.
    game.units[0]!.hp = 20;
    layer.build(game, board, library, new Quaternion(), false, null);
    expect(bars(layer, board).filter((bar) => bar.width > 0)).toHaveLength(4 * WRAP_COPIES);

    layer.dispose();
    board.dispose();
  });
});
