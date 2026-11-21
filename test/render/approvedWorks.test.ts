// @ts-expect-error Node supplies the test runner's filesystem outside the browser TS target.
import { readFile } from 'node:fs/promises';
import { BoxGeometry, BufferGeometry, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterEach, expect, it, vi } from 'vitest';
import { APPROVED_WORK_VIEWS, createApprovedWorksFixture } from '../../src/flairGallery/approvedWorksFixture';
import { APPROVED_WORK_IDS, APPROVED_WORKS, workGalleryPreviews } from '../../src/render3d/approvedWorkCatalog';
import { loadApprovedWork } from '../../src/render3d/approvedWorkArt';
import { cellCenter, directionDelta } from '../../src/render3d/layout';
import { PAINTED_WORK_ASSET_NAMES, PAINTED_WORK_IMPROVEMENTS, PaintedWorksLayer, type PaintedWorksAssets } from '../../src/render3d/paintedWorks';
import { createTileSurfaceSampler } from '../../src/render3d/paintedTileSurface';
import { IMPROVEMENT_IDS } from '../../src/sim/improvementData';
import { type GameMap, tileIndex } from '../../src/sim/map';
import { HIDDEN, VISIBLE } from '../../src/sim/visibility';
// @ts-expect-error The painted terrain kit is JavaScript.
import { prepareTerrainMap, WATER_LEVEL } from '../../src/terrainStudy/surface.js';
// @ts-expect-error The painted terrain kit is JavaScript.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';

afterEach(() => vi.restoreAllMocks());

it('resolves gameplay rows on the board and keeps only the pending works in the gallery overlay', () => {
  const state = createApprovedWorksFixture(), previews = workGalleryPreviews.get(state.map)!;
  for (const id of APPROVED_WORK_IDS) {
    const { col, row } = APPROVED_WORK_VIEWS[id], cell = tileIndex(state.map, col, row);
    if (IMPROVEMENT_IDS.some(rowId => rowId === id)) {
      expect(state.map.tiles[cell]!.improvement).toBe(id);
      expect(PAINTED_WORK_IMPROVEMENTS).toContain(id);
      expect(previews.has(cell)).toBe(false);
    } else {
      expect(state.map.tiles[cell]!.improvement).toBeUndefined();
      expect(previews.get(cell)).toBe(id);
    }
  }
});

it('loads the nine approved exports on sight, fits them to the painted hex and removes the intact model on pillage', async () => {
  const state = createApprovedWorksFixture(), map = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const loader = new GLTFLoader();
  const request = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async url => {
    const file = new URL(url).pathname.split('/').pop();
    const bytes = await readFile(`art/terrain-study/improvement-studies/${file}`);
    return loader.parseAsync(Uint8Array.from(bytes).buffer, '');
  });
  const material = new MeshStandardMaterial({ vertexColors: true }), box = new BoxGeometry();
  const assets = { ...Object.fromEntries(PAINTED_WORK_ASSET_NAMES.map(name => [name, box])), material } as PaintedWorksAssets;
  let ready!: () => void;
  const pending = new Promise<void>(resolve => { ready = resolve; });
  let hillfort: BufferGeometry | undefined;
  const layer = new PaintedWorksLayer(assets, () => undefined, undefined, ready, async id => {
    const geometry = await loadApprovedWork(id);
    if (id === 'hillfort') hillfort = geometry;
    return geometry;
  });
  const levels = state.visibility[0]!;
  const build = () => layer.build(state, map, levels);
  const meshes = (id: keyof typeof APPROVED_WORKS) => {
    const { col, row } = APPROVED_WORK_VIEWS[id], cell = tileIndex(state.map, col, row);
    return layer.group.children.filter((m): m is Mesh => m instanceof Mesh && m.userData.paintedWorksWrap === 0 && m.userData.paintedWorksCells.includes(cell));
  };
  try {
    levels.fill(HIDDEN); build();
    expect(request).not.toHaveBeenCalled();
    levels.fill(VISIBLE); build(); build(); await pending; build();
    expect(request).toHaveBeenCalledTimes(9);
    const matrix = new Matrix4();
    for (const id of APPROVED_WORK_IDS) {
      const mesh = meshes(id)[0]!;
      expect(mesh, id).toBeDefined();
      if (id === 'nazcaLines') {
        expect(mesh).not.toBeInstanceOf(InstancedMesh);
        const { col, row } = APPROVED_WORK_VIEWS[id], center = cellCenter(col, row);
        const [top, skirt] = terrainMesh(map.tiles[tileIndex(map, col, row)]) as BufferGeometry[];
        const height = createTileSurfaceSampler(top, center.x, center.z);
        const p = mesh.geometry.getAttribute('position'), colors = mesh.geometry.getAttribute('color');
        expect(p.count).toBeGreaterThan(400);
        expect(new Set(Array.from(colors.array)).size).toBeGreaterThan(2);
        for (let i = 0; i < p.count; i += 11) {
          const y = height(p.getX(i) - center.x, p.getZ(i) - center.z);
          expect(p.getY(i)).toBeCloseTo(y! + .009, 4);
        }
        top.dispose(); skirt.dispose();
        continue;
      }
      expect(mesh).toBeInstanceOf(InstancedMesh);
      expect(mesh.geometry.name).toBe(id);
      expect(mesh.material).toBe(material);
      (mesh as InstancedMesh).getMatrixAt(0, matrix);
      expect(new Vector3().setFromMatrixScale(matrix).x).toBeCloseTo(APPROVED_WORKS[id].scale);
      if (id === 'fishTraps') expect(matrix.elements[13]).toBeCloseTo(WATER_LEVEL + .003);
      if (id === 'hillfort') {
        expect(mesh.geometry).not.toBe(hillfort);
        const before = hillfort!.getAttribute('position'), after = mesh.geometry.getAttribute('position');
        let fitted = 0;
        for (let i = 0; i < before.count; i++) {
          if (before.getY(i) >= .13) expect(after.getY(i)).toBe(before.getY(i));
          else if (Math.abs(after.getY(i) - before.getY(i)) > .001) fitted++;
        }
        expect(fitted).toBeGreaterThan(0);
      }
      if (id === 'baray') {
        const towards = directionDelta(0);
        expect(Math.atan2(matrix.elements[8], matrix.elements[10])).toBeCloseTo(Math.atan2(towards.x, towards.z));
      }
    }
    const { col, row } = APPROVED_WORK_VIEWS.paradiseGarden;
    const garden = state.map.tiles[tileIndex(map, col, row)]!;
    garden.improvement = undefined;
    garden.damagedImprovement = { id: 'paradiseGarden', pillagedOn: state.turn };
    build();
    expect(meshes('paradiseGarden')).toHaveLength(0);
    expect(layer.entries.find(e => e.cell === tileIndex(map, col, row))?.damage).toBe('paradiseGarden');
    garden.damagedImprovement = undefined; garden.improvement = 'paradiseGarden';
    build();
    expect(meshes('paradiseGarden')[0]?.geometry.name).toBe('paradiseGarden');
    expect(request).toHaveBeenCalledTimes(9);
  } finally { layer.dispose(); box.dispose(); material.dispose(); }
});
