import { describe, expect, it } from 'vitest';
import {
  BackSide,
  type BufferGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Quaternion,
  Vector3,
} from 'three';

import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { InstanceCollector } from '../../src/render3d/instances';
import { SPRITE_HEIGHT, buildSpriteUnit } from '../../src/render3d/pieces';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { createMap, getTileAt, type GameMap, type Tile } from '../../src/sim/map';
import { generateMap } from '../../src/sim/mapgen';
import { computeFreshwater, setRiverEdge } from '../../src/sim/water';

/**
 * The diorama dressing — clutter, reeds, snow, tints, contact shading — is all
 * placement arithmetic, and all of it has to be a pure function of the map. What
 * these tests actually protect is that property: two builds of the same map must
 * agree instance for instance, or a rebuild (founding a city, toggling shadows,
 * panning across the wrap seam) would make the grass jump.
 *
 * They are also where the draw-call budget is written down. Everything new is
 * instanced per kind, and a change that quietly splits a bucket — a colour
 * passed where a tint belongs, most likely — shows up here as a number rather
 * than as a frame-rate report from somebody's laptop.
 *
 * The last block covers the other half of the same pass: the paper standees the
 * sprite units became. The buffer arithmetic that prints one lives in
 * `test/sprites3d.test.ts`; what is here is the object it ends up inside.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, 0x000000);
}

interface BoardStats {
  drawCalls: number;
  instances: number;
  /** Instance count per geometry, so a kind can be found without a colour. */
  byGeometry: Map<BufferGeometry, number>;
  meshes: InstancedMesh[];
}

function statsFor(map: GameMap, geometry: BoardGeometry): BoardStats {
  const board = buildBoard(map, geometry, materials(), false);
  const meshes: InstancedMesh[] = [];
  const byGeometry = new Map<BufferGeometry, number>();
  let instances = 0;
  for (const child of board.group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    meshes.push(child);
    // Only the subjects are counted per geometry: an outline shell shares its
    // subject's geometry and would double every kind that has one. A shell is
    // the only back-faced thing on the board — see `MaterialLibrary.outline`.
    if (!Array.isArray(child.material) && child.material.side === BackSide) continue;
    byGeometry.set(child.geometry, (byGeometry.get(child.geometry) ?? 0) + child.count);
    instances += child.count;
  }
  return { drawCalls: board.drawCalls, instances, byGeometry, meshes };
}

/** Every instance matrix in a group, flattened, for a byte-level comparison. */
function matrixDigest(group: Group): number[] {
  const out: number[] = [];
  const matrix = new Matrix4();
  for (const child of group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    for (let i = 0; i < child.count; i++) {
      child.getMatrixAt(i, matrix);
      out.push(...matrix.elements);
    }
  }
  return out;
}

describe('board dressing', () => {
  it('rebuilds a generated map instance for instance', () => {
    const map = generateMap(4242, 'standard');
    const geometry = new BoardGeometry();
    const library = materials();
    const first = buildBoard(map, geometry, library, false);
    const second = buildBoard(map, geometry, library, false);
    expect(second.drawCalls).toBe(first.drawCalls);
    expect(matrixDigest(second.group)).toEqual(matrixDigest(first.group));
    first.dispose();
    second.dispose();
    geometry.dispose();
  });

  it('keeps every kind of dressing to one instanced draw', () => {
    const map = generateMap(4242, 'standard');
    const geometry = new BoardGeometry();
    const stats = statsFor(map, geometry);

    // One lit mesh per (geometry, colour set) — plus its outline shell, plus
    // the substrate and the table. The cap is deliberately generous; what it
    // catches is an accidental per-instance colour, which would run to
    // thousands. It rises with the resource table: every kind on the map is one
    // more shape in one more ink, so the ratified luxury pass (seventeen rows to
    // forty-one, most of them sharing the marker cairn) moved it again. A pair
    // per kind is the property this number is really guarding.
    expect(stats.drawCalls).toBeLessThan(160);
    // Nothing is drawn one instance at a time.
    const lit = stats.meshes.filter((mesh) => mesh.count > 1);
    expect(lit.length).toBeGreaterThan(10);
    geometry.dispose();
  });

  it('varies terrain and decoration by instance colour, not by bucket', () => {
    // A flat sheet of one terrain: every prism is the same colour, so it must
    // come back as exactly one lit mesh — and that mesh must carry a tint
    // attribute whose values are not all the same number.
    const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
    const geometry = new BoardGeometry();
    const stats = statsFor(map, geometry);

    const prisms = stats.meshes.filter((mesh) => mesh.geometry === geometry.prisms.land);
    // The lit mesh and its outline shell, and nothing else.
    expect(prisms.length).toBe(2);
    const tinted = prisms.find((mesh) => mesh.instanceColor !== null);
    expect(tinted).toBeDefined();
    const values = Array.from(tinted!.instanceColor!.array);
    expect(new Set(values).size).toBeGreaterThan(10);
    // A wobble, not a repaint: everything stays within the configured fraction.
    const reach = VIEW3D.decor.variation.terrainValue + VIEW3D.decor.variation.terrainHue;
    for (const value of values) expect(Math.abs(value - 1)).toBeLessThanOrEqual(reach * 1.05);
    geometry.dispose();
  });

  it('bakes contact shading into the prisms and nowhere else', () => {
    const geometry = new BoardGeometry();
    const prism = geometry.prisms.land;
    const colors = prism.getAttribute('color');
    expect(colors).toBeDefined();

    const position = prism.getAttribute('position');
    const height = VIEW3D.board.height.land - VIEW3D.board.floorY;
    let top = 1;
    let bottom = 1;
    for (let i = 0; i < position.count; i++) {
      if (position.getY(i) > height - 1e-6) top = Math.min(top, colors.getX(i));
      if (position.getY(i) < 1e-6) bottom = Math.min(bottom, colors.getX(i));
    }
    // The top face is untouched — a tile's colour is its terrain's colour —
    // and the buried base is darkened by the full configured amount.
    expect(top).toBeCloseTo(1);
    expect(bottom).toBeCloseTo(1 - VIEW3D.decor.ground.aoStrength);

    // Decorations are lit by the toon ramp alone; a stray colour attribute on
    // one would render it black under a vertex-coloured material.
    expect(geometry.pine.getAttribute('color')).toBeUndefined();
    expect(geometry.standee.getAttribute('color')).toBeUndefined();
    geometry.dispose();
  });

  it('scatters clutter by biome and never onto water', () => {
    const geometry = new BoardGeometry();
    const kinds: [Tile['terrain'], BufferGeometry][] = [
      ['grassland', geometry.tuft],
      ['desert', geometry.cactus],
      ['tundra', geometry.boulder],
    ];
    for (const [terrain, shape] of kinds) {
      const map = createMap({ width: 10, height: 8, terrain });
      const stats = statsFor(map, geometry);
      expect(stats.byGeometry.get(shape) ?? 0).toBeGreaterThan(0);
    }

    const sea = createMap({ width: 10, height: 8, terrain: 'ocean' });
    const wet = statsFor(sea, geometry);
    expect(wet.byGeometry.get(geometry.tuft) ?? 0).toBe(0);
    expect(wet.byGeometry.get(geometry.cactus) ?? 0).toBe(0);
    expect(wet.byGeometry.get(geometry.reeds) ?? 0).toBe(0);
    geometry.dispose();
  });

  it('grows reeds only where there is fresh water to grow in', () => {
    const geometry = new BoardGeometry();

    const dry = createMap({ width: 9, height: 7, terrain: 'grassland' });
    computeFreshwater(dry);
    expect(statsFor(dry, geometry).byGeometry.get(geometry.reeds) ?? 0).toBe(0);

    const wet = createMap({ width: 9, height: 7, terrain: 'grassland' });
    // A river down the middle. `setRiverEdge` writes both halves of the edge,
    // which is the invariant the renderer reads one side of.
    for (let row = 1; row < 6; row++) {
      const tile = getTileAt(wet, 4, row);
      if (tile) setRiverEdge(wet, tile, 0);
    }
    computeFreshwater(wet);
    expect(statsFor(wet, geometry).byGeometry.get(geometry.reeds) ?? 0).toBeGreaterThan(0);
    geometry.dispose();
  });

  it('caps every mountain with the peak’s own transform', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'mountain' });
    const geometry = new BoardGeometry();
    const stats = statsFor(map, geometry);
    const peaks = stats.byGeometry.get(geometry.peak) ?? 0;
    const snow = stats.byGeometry.get(geometry.snow) ?? 0;
    expect(peaks).toBe(map.tiles.length * 3);
    expect(snow).toBe(peaks);

    // Same matrices, so a cap can never slide off a hashed summit.
    const peakMesh = stats.meshes.find(
      (mesh) => mesh.geometry === geometry.peak && mesh.material instanceof MeshToonMaterial,
    );
    const snowMesh = stats.meshes.find((mesh) => mesh.geometry === geometry.snow);
    const a = new Matrix4();
    const b = new Matrix4();
    peakMesh!.getMatrixAt(7, a);
    snowMesh!.getMatrixAt(7, b);
    expect(b.elements).toEqual(a.elements);
    geometry.dispose();
  });

  it('bands the shore only where the land meets the sea', () => {
    const geometry = new BoardGeometry();
    const inland = createMap({ width: 8, height: 6, terrain: 'grassland' });
    expect(statsFor(inland, geometry).byGeometry.get(geometry.shoreRing) ?? 0).toBe(0);

    const map = generateMap(77, 'standard');
    expect(statsFor(map, geometry).byGeometry.get(geometry.shoreRing) ?? 0).toBeGreaterThan(0);
    geometry.dispose();
  });
});

describe('instance tints', () => {
  it('share a bucket with untinted instances of the same ink', () => {
    // The whole point of a tint: it must not be part of the instancing key, or
    // a per-tree colour would be a per-tree draw call.
    const geometry = new BoardGeometry();
    const collector = new InstanceCollector({ copyOffsets: [0] });
    collector.add(geometry.pine, [0x112233], new Matrix4());
    collector.add(geometry.pine, [0x112233], new Matrix4(), { tint: [1.05, 1, 0.95] });
    const group = new Group();
    const draws = collector.flush(group, materials(), false);
    // One lit mesh and one outline shell, holding both instances.
    expect(draws).toBe(2);
    const mesh = group.children[0] as InstancedMesh;
    expect(mesh.count).toBe(2);
    // Float32, so the multipliers come back rounded; the shape is what matters.
    const written = Array.from(mesh.instanceColor!.array);
    expect(written).toHaveLength(6);
    [1, 1, 1, 1.05, 1, 0.95].forEach((want, i) => expect(written[i]).toBeCloseTo(want));
    geometry.dispose();
  });

  it('leaves the attribute off entirely when nothing asked for one', () => {
    const geometry = new BoardGeometry();
    const collector = new InstanceCollector({ copyOffsets: [0] });
    collector.add(geometry.pine, [0x112233], new Matrix4());
    const group = new Group();
    collector.flush(group, materials(), false);
    expect((group.children[0] as InstancedMesh).instanceColor).toBeNull();
    geometry.dispose();
  });
});

/**
 * The paper standee, assembled.
 *
 * `buildSpriteUnit` is the one builder both the resting unit layer and the
 * walking animation go through, so what it returns is what a sprite unit *is* —
 * card, foot, shadow — standing still or mid-stride. These pin down the parts
 * and the proportion, which is the half of the fix the buffer arithmetic in
 * `sprites3d.ts` cannot cover.
 */
describe('paper standees', () => {
  /** The fixed camera's orientation, near enough: yawed east, tilted down. */
  function faceCamera(): Quaternion {
    return new Quaternion().setFromEuler(
      new Euler(-((90 - VIEW3D.camera.elevation) * Math.PI) / 180, Math.PI / 2, 0, 'YXZ'),
    );
  }

  function build(): { group: Group; geometry: BoardGeometry } {
    const geometry = new BoardGeometry();
    const group = buildSpriteUnit(
      geometry,
      materials(),
      new MeshBasicMaterial(),
      0xb35843,
      faceCamera(),
    );
    return { group, geometry };
  }

  it('stands a card in a foot over a blob shadow', () => {
    const { group, geometry } = build();
    const meshes = group.children as Mesh[];
    expect(meshes.map((m) => m.geometry)).toEqual([
      geometry.blob,
      geometry.standee,
      geometry.billboard,
    ]);

    // The foot carries its own inverted-hull shell, exactly like every carved
    // piece on the board — that outline is what makes it read as one of them.
    const base = meshes[1]!;
    expect(base.children).toHaveLength(1);
    expect((base.children[0] as Mesh).geometry).toBe(geometry.standee);
    expect(geometry.standee.getAttribute('aHullNormal')).toBeDefined();

    // Everything above the blob, so a depth-tested decal never fights a face.
    expect(base.position.y).toBeGreaterThan(meshes[0]!.position.y);
    expect(meshes[2]!.position.y).toBeGreaterThan(0);
    geometry.dispose();
  });

  it('turns the foot to lie along the card, not along the grid', () => {
    const camera = faceCamera();
    const geometry = new BoardGeometry();
    const group = buildSpriteUnit(
      geometry,
      materials(),
      new MeshBasicMaterial(),
      0xb35843,
      camera,
    );
    const base = group.children[1] as Mesh;

    const along = new Vector3(1, 0, 0).applyQuaternion(base.quaternion);
    const cardRight = new Vector3(1, 0, 0).applyQuaternion(camera).setY(0).normalize();
    expect(along.y).toBeCloseTo(0);
    expect(along.x).toBeCloseTo(cardRight.x);
    expect(along.z).toBeCloseTo(cardRight.z);
    geometry.dispose();
  });

  it('keeps the card slightly larger than a carved piece, not monumental', () => {
    // The whole proportion argument in one assertion. A standee reads as a
    // figure among figures; at twice the piece it reads as a statue, which is
    // what the first pass looked like beside the toy houses.
    expect(SPRITE_HEIGHT).toBeGreaterThan(VIEW3D.pieces.heights.foot);
    expect(SPRITE_HEIGHT).toBeLessThan(VIEW3D.pieces.heights.foot * 1.6);
    // And taller than the trees it walks past, but not by much.
    const pine = VIEW3D.decor.pine.trunkH + VIEW3D.decor.pine.coneH;
    expect(SPRITE_HEIGHT).toBeGreaterThan(pine);
    expect(SPRITE_HEIGHT).toBeLessThan(pine * 2);
  });

  it('sits the foot low enough for the figure to stand on the tile', () => {
    const base = VIEW3D.units.sprite.standee.base;
    const shelf = base.lift + base.thickness + base.collarThickness;
    // The card's bottom edge is inside the clip, which is what "slotted in"
    // means; if the lift cleared the shelf the card would hover over its stand.
    expect(VIEW3D.units.sprite.lift).toBeLessThan(shelf + base.tabHeight);
    expect(shelf).toBeLessThan(SPRITE_HEIGHT * 0.15);
  });
});
