import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, BufferGeometry, Color, InstancedMesh, Material, Mesh, MeshStandardMaterial, ShaderLib } from 'three';
import { buildPaintedBoard, type PaintedBoard, type PaintedBoardMaterials, type PaintedVegetationAssets } from '../../src/render3d/paintedBoard.js';
import { createMap } from '../../src/sim/map';

const boards: PaintedBoard[] = [], disposables: (BufferGeometry | Material)[] = [];
function fixture(width = 4, height = 3) {
  const map = createMap({ width, height, terrain: 'grassland' });
  map.tiles.forEach(tile => { tile.feature = 'forest'; });
  const mat = (color = '#799741') => { const m = new MeshStandardMaterial({ color, vertexColors: true }); disposables.push(m); return m; };
  const materials: PaintedBoardMaterials = {
    ground: Object.fromEntries(['grassland', 'plains', 'desert', 'tundra', 'snow', 'mountain', 'ocean', 'coast', 'lake', 'oasis', 'floodplain'].map(k => [k, mat()])),
    earth: mat('#948653'), mergedLand: mat('#ffffff'), mergedWater: mat('#ffffff'), mergedDetails: mat('#ffffff'),
    water: { river: mat('#8198d0'), bank: mat(), shallows: mat(), foam: mat() },
    features: { shrub: mat(), stone: mat(), fertile: mat(), bank: mat(), pool: mat(), shallow: mat(), reeds: mat() },
  };
  const geometry = new BoxGeometry(.3, .8, .3); disposables.push(geometry);
  const asset = { geometry, shoulderGeometry: geometry, material: mat() };
  const assets: PaintedVegetationAssets = { broadleaves: [asset, asset, asset], cypresses: [asset, asset], escarpments: [asset, asset, asset], limestone: asset, broadleaf: asset, rangeMaterial: mat() };
  function build(shadows = true) { const board = buildPaintedBoard(map, assets, materials, shadows); boards.push(board); return board; }
  return { map, materials, assets, build };
}
afterEach(() => {
  boards.splice(0).forEach(board => board.dispose()); disposables.splice(0).forEach(item => item.dispose());
  vi.restoreAllMocks();
});

/** Every mesh of a built board, in build order, so identities can be compared. */
function meshesOf(board: PaintedBoard): Mesh[] {
  const meshes: Mesh[] = [];
  board.group.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
  return meshes;
}

describe('production painted board', () => {
  it('shares canonical terrain across three translated wrap copies and picks every cell', () => {
    const { map, build } = fixture();
    const original = JSON.stringify(map), board = build();
    expect(JSON.stringify(map)).toBe(original);
    expect(board.group.children.map(copy => copy.position.x)).toEqual([-board.wrapWidth, 0, board.wrapWidth]);
    expect(board.pickMeshes).toHaveLength(3);
    expect(new Set(board.pickMeshes.map(mesh => mesh.geometry)).size).toBe(1);
    const cells = board.pickMeshes[0]!.geometry.getAttribute('paintedCell');
    expect([...new Set(Array.from(cells.array))].sort((a, b) => a - b)).toEqual(map.tiles.map((_, i) => i));
    expect(board.treedCells).toEqual(map.tiles.map((_, i) => i));
    board.group.traverse(object => {
      expect(object.matrixAutoUpdate).toBe(false);
      expect(object.matrixWorldAutoUpdate).toBe(false);
    });
  });

  it('changes fog and clearing independently without replacing terrain or instance buffers', () => {
    const { map, build } = fixture(), board = build();
    const meshes: Mesh[] = []; board.group.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
    const geometry = meshes.map(mesh => mesh.geometry);
    const matrices = meshes.filter(mesh => mesh instanceof InstancedMesh).map(mesh => mesh.instanceMatrix);
    const fog = board.fogTexture, initialVersion = fog.version;
    expect(board.isCellVisible(0)).toBe(false);
    expect(board.applyFog(new Array(map.tiles.length).fill(2))).toBe(map.tiles.length);
    expect(board.suppressTile(0, 1)).toBe(true);
    expect(board.isCellVisible(0, 0)).toBe(true);
    expect(board.isCellVisible(0, 1)).toBe(false);
    expect(board.isCellVisible(0, 2)).toBe(true);
    expect(board.suppressTile(0, 2)).toBe(true);
    expect(board.isCellVisible(0, 2)).toBe(false);
    board.applyFog([]); expect(board.isCellVisible(0)).toBe(false);
    board.unsuppressTile(0); expect(board.isCellVisible(0, 2)).toBe(false);
    board.applyFog([1]); expect(board.isCellVisible(0, 2)).toBe(true);
    expect(Array.from(fog.image.data!.slice(0, 8))).toEqual([127, 0, 0, 0, 0, 0, 0, 0]);
    const unchangedVersion = fog.version;
    expect(board.applyFog([1])).toBe(0);
    expect(board.unsuppressTile(0)).toBe(false);
    expect(fog.version).toBe(unchangedVersion);
    expect(fog.version).toBeGreaterThan(initialVersion);
    expect(meshes.map(mesh => mesh.geometry)).toEqual(geometry);
    expect(meshes.filter(mesh => mesh instanceof InstancedMesh).map(mesh => mesh.instanceMatrix)).toEqual(matrices);
    board.applyFog(null); expect(board.isCellVisible(1)).toBe(true);
  });

  it('reserves prop footprints reversibly without replacing terrain or exposing hidden cells', () => {
    const {build} = fixture(), board = build();
    const geometry = board.pickMeshes.map(mesh => mesh.geometry);
    board.applyFog(null); board.suppressTile(1, 1);
    expect(board.reserveFootprints(new Map([[0, .54], [1, .72]]))).toBe(2);
    expect(board.fogTexture.image.data![2]).toBe(Math.round(.54 * 255));
    expect(board.fogTexture.image.data![5]).toBe(1);
    expect(board.reserveFootprints(new Map([[0, .54], [1, .72]]))).toBe(0);
    board.applyFog(new Array(12).fill(0));
    expect(board.isCellVisible(0)).toBe(false);
    expect(board.reserveFootprints(new Map())).toBe(2);
    expect(board.fogTexture.image.data![2]).toBe(0);
    expect(board.fogTexture.image.data![5]).toBe(1);
    expect(board.pickMeshes.map(mesh => mesh.geometry)).toEqual(geometry);
    board.group.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const distances = object.geometry.getAttribute('paintedReservationDistance');
      expect(distances).toBeDefined();
      if (!(object instanceof InstancedMesh)) expect(Array.from(distances.array).every(value => value === 0)).toBe(true);
    });
  });

  it('keeps the shadow depth cache when charted terrain only changes its fog wash', () => {
    const {map, build} = fixture(), board = build();
    board.applyFog(new Array(map.tiles.length).fill(2));
    const revision = board.shadowRevision;
    board.applyFog(new Array(map.tiles.length).fill(1));
    expect(board.shadowRevision).toBe(revision);
    board.applyFog(new Array(map.tiles.length).fill(0));
    expect(board.shadowRevision).toBeGreaterThan(revision);
  });

  it('switches the world’s shadows on the board it already built', () => {
    const {map, build} = fixture(), board = build();
    // A lived-in board: charted, with a town's clutter suppressed and a prop
    // footprint reserved. None of it may move because a checkbox did.
    board.applyFog(new Array(map.tiles.length).fill(2));
    board.suppressTile(1, 2);
    board.reserveFootprints(new Map([[0, .54]]));
    const meshes = meshesOf(board), picks = [...board.pickMeshes];
    const geometry = meshes.map(mesh => mesh.geometry);
    const matrices = meshes.filter(mesh => mesh instanceof InstancedMesh).map(mesh => mesh.instanceMatrix);
    const materials = meshes.map(mesh => mesh.material as Material);
    const depths = meshes.map(mesh => mesh.customDepthMaterial);
    const casting = meshes.filter(mesh => mesh.castShadow);
    const fog = Array.from(board.fogTexture.image.data!), bytes = board.geometryBytes;
    const versions = materials.map(material => material.version);
    expect(casting.length).toBeGreaterThan(0);

    const built = vi.spyOn(BufferGeometry.prototype, 'setAttribute');
    const freed = vi.spyOn(BufferGeometry.prototype, 'dispose');
    expect(board.setShadows(false)).toBe(true);
    expect(meshes.filter(mesh => mesh.castShadow)).toEqual([]);
    // Idempotent, and never a second walk for the state it is already in.
    expect(board.setShadows(false)).toBe(false);
    expect(board.setShadows(true)).toBe(true);
    expect(meshes.filter(mesh => mesh.castShadow)).toEqual(casting);
    // Not one vertex built or freed, and every buffer still the same object.
    expect([built.mock.calls.length, freed.mock.calls.length]).toEqual([0, 0]);
    expect(meshesOf(board)).toEqual(meshes);
    expect(meshes.map(mesh => mesh.geometry)).toEqual(geometry);
    expect(meshes.filter(mesh => mesh instanceof InstancedMesh).map(mesh => mesh.instanceMatrix)).toEqual(matrices);
    expect(meshes.map(mesh => mesh.material)).toEqual(materials);
    expect(meshes.map(mesh => mesh.customDepthMaterial)).toEqual(depths);
    expect(board.pickMeshes).toEqual(picks);
    expect(board.geometryBytes).toBe(bytes);
    // The fog wash, the suppression grade and the reservation are all where the
    // toggle found them.
    expect(Array.from(board.fogTexture.image.data!)).toEqual(fog);
    expect(board.isCellVisible(1, 2)).toBe(false);
    // Whether a program samples a shadow map is a compile-time fact for three,
    // so the colour materials are told to recompile. Depth is not: it never
    // sampled one.
    expect(materials.map(material => material.version > versions[materials.indexOf(material)]!)).not.toContain(false);
  });

  it('remembers what each batch casts, so a board built dark lights up correctly', () => {
    const { build } = fixture();
    const lit = build(true), dark = build(false);
    expect(meshesOf(dark).filter(mesh => mesh.castShadow)).toEqual([]);
    dark.setShadows(true);
    // Far-LOD clones and water never cast, whichever way the board was built.
    const names = (board: PaintedBoard): string[] =>
      meshesOf(board).map((mesh, i) => `${i}:${mesh.castShadow}:${mesh.visible}`);
    expect(names(dark)).toEqual(names(lit));
  });

  it('carries the cast fact, not the live flag, through an exported board', () => {
    const { build } = fixture();
    const lit = build(true).exportBatches().map(batch => batch.castShadow);
    const dark = build(false).exportBatches().map(batch => batch.castShadow);
    expect(dark).toEqual(lit);
    expect(lit).toContain(true);
  });

  it('gives terrain, foliage and their shadow passes the same cell ownership in every wrap', () => {
    const { build, materials, assets } = fixture();
    materials.mergedLand.onBeforeCompile = shader => { shader.uniforms.approvedPaint = { value: new Color('#799741') }; };
    const board = build();
    expect(assets.broadleaf.geometry.getAttribute('paintedCell')).toBeUndefined();
    let instances = 0;
    board.group.traverse(object => {
      if (!(object instanceof Mesh)) return;
      expect(object.geometry.getAttribute('paintedCell')).toBeDefined();
      expect(object.geometry.getAttribute('paintedSuppress')).toBeDefined();
      expect(object.customDepthMaterial).toBeDefined();
      if (object instanceof InstancedMesh) {
        instances++;
        expect(object.geometry.getAttribute('paintedCell').count).toBe(object.count);
      }
    });
    expect(instances).toBeGreaterThan(0);
    const mesh = board.pickMeshes[0]!;
    // Invoke the shader hooks against Three's real shader source; this catches
    // lost clone hooks and missing shadow discard without needing a GPU.
    const compile = (material: Material, source: typeof ShaderLib.standard) => {
      const shader = { uniforms: {}, vertexShader: source.vertexShader, fragmentShader: source.fragmentShader };
      material.onBeforeCompile(shader as Parameters<Material['onBeforeCompile']>[0], undefined!); return shader;
    };
    const color = compile(mesh.material as Material, ShaderLib.standard);
    expect(color.uniforms).toHaveProperty('approvedPaint');
    expect(color.uniforms).toHaveProperty('paintedFog');
    expect(color.fragmentShader).toContain('vPaintedFog.x < .1');
    // The remembered register, both halves: the sun turned down inside the
    // painterly composition, and the cool shift mixed back out by the lit
    // weight afterwards. See `paintedFogLook.ts`.
    expect(color.fragmentShader).toContain('float paintedSun = mix(paintedFogShadowedSun, 1.0, paintedLit);');
    expect(color.fragmentShader).toContain('outgoingLight = mix(paintedCool, outgoingLight, paintedLit);');
    expect(color.vertexShader).not.toContain('paintedOtherUv');
    const depth = compile(mesh.customDepthMaterial!, ShaderLib.depth);
    expect(depth.vertexShader).toContain('texture2D(paintedFog, paintedUv)');
    expect(depth.fragmentShader).toContain('vPaintedFog.y + .1 >= vPaintedFog.z');
    expect(depth.fragmentShader).toContain('if (vPaintedReserved > .5) discard;');
    expect(color.fragmentShader).toContain('if (vPaintedReserved > .5) discard;');
  });

  it('preserves all terrain and feature variants and keeps full geometry for shadow baking', () => {
    const { map, build } = fixture(5, 3);
    const kinds = ['grassland', 'plains', 'desert', 'tundra', 'snow', 'mountain', 'ocean', 'coast', 'lake'] as const;
    map.tiles.forEach((tile, i) => { tile.terrain = kinds[i % kinds.length]!; tile.feature = 'none'; });
    map.tiles[0]!.hills = true; map.tiles[1]!.feature = 'forest'; map.tiles[2]!.feature = 'oasis'; map.tiles[3]!.feature = 'jungle'; map.tiles[4]!.feature = 'floodplain';
    const board = build();
    expect(board.renderMap.tiles.map(tile => tile.terrain)).toEqual(map.tiles.map(tile => tile.terrain));
    const peaks = board.pickMeshes.filter(mesh => mesh.userData.paintedPickOnly);
    expect(peaks.length).toBeGreaterThan(0);
    for (const peak of peaks) {
      const cell = peak.geometry.getAttribute('paintedCell').getX(0);
      expect(peak.userData.paintedCellVisible(cell, 0)).toBe(false);
      board.applyFog(null);
      expect(peak.userData.paintedCellVisible(cell, 0)).toBe(true);
      board.suppressTile(cell, 2);
      expect(peak.userData.paintedCellVisible(cell, 2)).toBe(false);
      expect(peak.userData.paintedCellVisible(cell, 0)).toBe(true);
      board.applyFog([]);
    }
    const cells = new Set(board.pickMeshes.flatMap(mesh => Array.from(mesh.geometry.getAttribute('paintedCell').array)));
    expect(cells.size).toBe(map.tiles.length);
    const land = board.pickMeshes.find(mesh => mesh.geometry.boundingBox!.max.y > .05)!;
    board.applyFog(null);
    board.updateDetail(10); expect(land.visible).toBe(false);
    board.setBakeDetail(true); expect(land.visible).toBe(true);
    board.setBakeDetail(false); expect(land.visible).toBe(false);
    board.updateDetail(30); expect(land.visible).toBe(true);
    board.dispose(); expect(board.applyFog([2])).toBe(0);
  });

  it('shares river visibility between the two banks, including the wrap seam, without sharing land', () => {
    const { map, build } = fixture();
    map.tiles[0]!.riverEdges = 1 << 3; map.tiles[3]!.riverEdges = 1;
    const board = build();
    let shared = 0;
    for (const mesh of board.pickMeshes) {
      const owner = mesh.geometry.getAttribute('paintedCell'), other = mesh.geometry.getAttribute('paintedOther');
      if (!other) continue;
      for (let i = 0; i < owner.count; i++) {
        if (owner.getX(i) === other.getX(i)) continue;
        shared++;
        expect(new Set([owner.getX(i), other.getX(i)])).toEqual(new Set([0, 3]));
        expect(mesh.geometry.getAttribute('position').getY(i)).toBeCloseTo(.04);
      }
    }
    expect(shared).toBeGreaterThan(0);
  });

  it('keeps every approved prop at overview while bounding batches to a portion of the map', () => {
    const { build } = fixture(40, 2), board = build();
    board.applyFog(null);
    const visibleProps = () => {
      const props: InstancedMesh[] = [];
      board.group.traverseVisible(object => { if (object instanceof InstancedMesh) props.push(object); });
      return props;
    };
    const near = visibleProps().reduce((count, mesh) => count + mesh.count, 0);
    board.updateDetail(10);
    const distant = visibleProps();
    expect(distant.reduce((count, mesh) => count + mesh.count, 0)).toBe(near);
    expect(near).toBe(board.instanceCount);
    // Whole-map prop bounds intersected both adjacent wrap copies even when
    // only a narrow fringe was onscreen, submitting all their hidden trees.
    expect(Math.max(...distant.map(mesh => mesh.boundingSphere!.radius))).toBeLessThan(20);
    for (const mesh of distant) {
      expect(mesh.geometry.getAttribute('paintedCell').array).toBeInstanceOf(Uint16Array);
      expect(mesh.geometry.getAttribute('paintedSuppress').array).toBeInstanceOf(Uint8Array);
    }
  });

  it('culls wholly hidden batches through zoom and shadow baking, then restores the same buffers', () => {
    const {map, build} = fixture(24, 2), board = build();
    const visible = () => {
      const meshes: Mesh[] = [];
      board.group.traverseVisible(object => { if (object instanceof Mesh) meshes.push(object); });
      return meshes;
    };
    expect(visible()).toHaveLength(0);
    board.applyFog(null);
    const full = visible(), geometry = full.map(mesh => mesh.geometry);
    const levels = new Uint8Array(map.tiles.length); levels[0] = 2;
    board.applyFog(levels);
    expect(visible().length).toBeGreaterThan(0);
    expect(visible().length).toBeLessThan(full.length);
    const near = visible();
    for (const mesh of near) expect(Array.from(mesh.geometry.getAttribute('paintedCell').array)).toContain(0);
    board.updateDetail(10);
    expect(visible().length).toBeGreaterThan(0);
    board.setBakeDetail(true);
    expect(visible()).toEqual(near);
    board.setBakeDetail(false);
    board.applyFog([]);
    for (const [pixels, baking] of [[10, false], [10, true], [40, false]] as const) {
      board.updateDetail(pixels); board.setBakeDetail(baking);
      expect(visible()).toHaveLength(0);
    }
    board.setBakeDetail(false);
    board.applyFog(null);
    expect(visible()).toEqual(full);
    expect(visible().map(mesh => mesh.geometry)).toEqual(geometry);
  });

  it('retains a shared river batch when only the bank across a chunk or wrap boundary is charted', () => {
    const {map, build} = fixture(12, 2);
    for (const [a,b] of [[5,6], [11,0]]) {
      map.tiles[a]!.riverEdges = 1;
      map.tiles[b]!.riverEdges = 1 << 3;
    }
    const board = build();
    for (const cell of [0,6]) {
      const levels = new Uint8Array(map.tiles.length); levels[cell] = 1;
      board.applyFog(levels);
      const otherBank = board.pickMeshes.filter(mesh => {
        const owner = mesh.geometry.getAttribute('paintedCell'), other = mesh.geometry.getAttribute('paintedOther');
        return other && !Array.from(owner.array).includes(cell) && Array.from(other.array).includes(cell);
      });
      expect(otherBank).toHaveLength(3);
      for (const pixels of [40,10]) {
        board.updateDetail(pixels);
        expect(otherBank.every(mesh => mesh.visible)).toBe(true);
      }
    }
    board.applyFog([]);
    expect(board.pickMeshes.every(mesh => !mesh.visible)).toBe(true);
  });

  it('combines overview land into spatial regions while preserving close picking chunks', () => {
    const {map, build} = fixture(40, 2), board = build();
    board.applyFog(null);
    const close = board.pickMeshes.filter(mesh => mesh.parent === board.group.children[1]);
    expect(close).toHaveLength(7);
    board.updateDetail(10);
    const far = board.group.children[1]!.children.filter((mesh): mesh is Mesh =>
      mesh instanceof Mesh && !(mesh instanceof InstancedMesh) && mesh.visible && mesh.geometry.hasAttribute('turfWeight'));
    expect(far).toHaveLength(3);
    const cells = far.flatMap(mesh => [...new Set(Array.from(mesh.geometry.getAttribute('paintedCell').array))]);
    expect(cells.sort((a,b) => a-b)).toEqual(map.tiles.map((_,i) => i));
    expect(far.every(mesh => !mesh.castShadow)).toBe(true);
    board.setBakeDetail(true);
    expect(close.every(mesh => mesh.visible && mesh.castShadow)).toBe(true);
    expect(far.every(mesh => !mesh.visible)).toBe(true);
    board.setBakeDetail(false);
    expect(far.every(mesh => mesh.visible)).toBe(true);
  });
});
