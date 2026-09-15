import { beforeAll, describe, expect, it, afterEach } from 'vitest';
import { BoxGeometry, BufferGeometry, DirectionalLight, Material, Mesh, MeshStandardMaterial, OrthographicCamera, Scene } from 'three';
import { buildPaintedBoard, type PaintedBoard, type PaintedBoardMaterials, type PaintedVegetationAssets } from '../../src/render3d/paintedBoard.js';
// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { separatePaintedShadows } from '../../src/render3d/paintedShadows.js';
import { createMap } from '../../src/sim/map';

/**
 * The reveal frame, pinned (audit finding #19).
 *
 * Two questions used to share one answer: how much detail the colour pass draws,
 * and how much the static sun's depth pass bakes. They are not the same question
 * — the far batches cast no shadow at all, so the bake must always see near
 * geometry, while the zoom alone decides what the player sees. These tests hold
 * the seam between them: the bake raises near geometry only inside the shadow
 * pass, a charted hex merely changing its wash still costs no bake, and a hex
 * crossing into the charted world gets one immediately, in every wrap copy.
 */

// The register test below reads a source file; Node imports stay behind a
// variable specifier so the project's type surface remains vite/client.
const FS_SPECIFIER = 'node:fs';
let readFileSync: (path: URL, encoding: string) => string;
beforeAll(async () => {
  const fs = (await import(/* @vite-ignore */ FS_SPECIFIER)) as { readFileSync: typeof readFileSync };
  readFileSync = fs.readFileSync;
});

const boards: PaintedBoard[] = [], disposables: (BufferGeometry | Material)[] = [];
afterEach(() => { boards.splice(0).forEach(board => board.dispose()); disposables.splice(0).forEach(item => item.dispose()); });

function fixture(width = 24, height = 3) {
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
  const board = buildPaintedBoard(map, assets, materials); boards.push(board);
  const casters = () => {
    const meshes: Mesh[] = [];
    board.group.traverseVisible(object => { if (object instanceof Mesh && object.castShadow) meshes.push(object); });
    return meshes;
  };
  const drawn = () => {
    const meshes: Mesh[] = [];
    board.group.traverseVisible(object => { if (object instanceof Mesh) meshes.push(object); });
    return meshes;
  };
  return { map, board, casters, drawn };
}

/** The look's own wiring, over a scriptable shadow map: one sun, one counter light. */
function rig(board: PaintedBoard) {
  const scene = new Scene(), camera = new OrthographicCamera();
  camera.layers.enable(2);
  scene.add(board.group);
  const sun = new DirectionalLight(), counters = new DirectionalLight();
  sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true;
  const seen: { light: DirectionalLight; casters: number; drawn: number }[] = [];
  const map = {
    enabled: true, autoUpdate: false, needsUpdate: true,
    render(lights: DirectionalLight[], _scene?: Scene, _camera?: OrthographicCamera): void {
      for (const light of lights) {
        if (!light.shadow.autoUpdate && !light.shadow.needsUpdate) continue;
        let casters = 0, drawn = 0;
        board.group.traverseVisible(object => { if (object instanceof Mesh) { drawn++; if (object.castShadow) casters++; } });
        seen.push({ light, casters, drawn });
        light.shadow.needsUpdate = false;
      }
      this.needsUpdate = false;
    },
  };
  const controller = separatePaintedShadows({ shadowMap: map }, sun, counters, (active: boolean) => board.setBakeDetail(active));
  return {
    sun, counters, seen, controller,
    bake(): void { sun.shadow.needsUpdate = true; map.needsUpdate = true; map.render([sun, counters], scene, camera); },
  };
}

describe('the reveal frame: shadow detail apart from colour detail', () => {
  it('bakes near geometry while the overview keeps its far colour LOD', () => {
    const { board, drawn } = fixture();
    board.applyFog(null);
    board.updateDetail(10);
    const far = drawn().length;
    const near = (board.setBakeDetail(true), drawn().length);
    board.setBakeDetail(false);
    expect(near).toBeGreaterThan(far);

    const shadows = rig(board);
    shadows.bake();
    // The depth pass saw the near board; the colour pass, whose render list
    // Three builds before any shadow map, is back at the far LOD it asked for.
    expect(shadows.seen[0]!.light).toBe(shadows.sun);
    expect(shadows.seen[0]!.drawn).toBe(near);
    expect(shadows.seen[0]!.casters).toBeGreaterThan(0);
    expect(drawn()).toHaveLength(far);
    shadows.controller.dispose();
  });

  it('leaves a play-zoom frame exactly where it found it', () => {
    const { board, drawn } = fixture();
    board.applyFog(null);
    board.updateDetail(40);
    const before = drawn();
    const shadows = rig(board);
    shadows.bake();
    expect(shadows.seen[0]!.drawn).toBe(before.length);
    expect(drawn()).toEqual(before);
    shadows.controller.dispose();
  });

  it('costs no bake when charted ground only changes its wash, and one when it is first charted', () => {
    const { map, board } = fixture();
    const hidden = new Uint8Array(map.tiles.length);
    board.applyFog(hidden);
    const dark = board.shadowRevision;

    const charted = new Uint8Array(map.tiles.length).fill(2);
    board.applyFog(charted);
    const lit = board.shadowRevision;
    expect(lit).toBeGreaterThan(dark);

    // Remembered ⇄ visible, twice around: the same silhouettes, so the cached
    // depth map still tells the truth and nothing may ask for another bake.
    for (const level of [1, 2, 1, 2]) {
      board.applyFog(new Uint8Array(map.tiles.length).fill(level));
      expect(board.shadowRevision).toBe(lit);
    }
    // One hex crossing out of the dark is a new caster, and must be rebaked.
    const one = new Uint8Array(map.tiles.length); one[5] = 2;
    board.applyFog(one);
    expect(board.shadowRevision).toBeGreaterThan(lit);
  });

  it('gives a newly charted hex its shadow on the very frame it is revealed', () => {
    const { map, board } = fixture();
    const levels = new Uint8Array(map.tiles.length); levels[0] = 2;
    board.applyFog(levels);
    board.updateDetail(10);
    const shadows = rig(board);
    shadows.bake();
    const sunlit = () => shadows.seen.filter(entry => entry.light === shadows.sun);
    const before = sunlit()[0]!.casters;
    expect(before).toBeGreaterThan(0);

    const scouted = new Uint8Array(map.tiles.length); scouted[0] = 2;
    for (const cell of [12, 13, 14, 36, 37]) scouted[cell] = 2;
    const revision = board.shadowRevision;
    board.applyFog(scouted);
    expect(board.shadowRevision).toBeGreaterThan(revision);
    shadows.bake();
    expect(sunlit()).toHaveLength(2);
    expect(sunlit()[1]!.casters).toBeGreaterThan(before);
    shadows.controller.dispose();
  });

  it('raises and drops all three wrap copies together, seam included', () => {
    const { board } = fixture(40, 2);
    board.applyFog(null);
    board.updateDetail(10);
    const copies = board.group.children;
    expect(copies).toHaveLength(3);
    const perCopy = () => copies.map(copy => {
      let count = 0;
      copy.traverseVisible(object => { if (object instanceof Mesh) count++; });
      return count;
    });
    const far = perCopy();
    board.setBakeDetail(true);
    const near = perCopy();
    board.setBakeDetail(false);
    expect(perCopy()).toEqual(far);
    expect(new Set(near).size).toBe(1);
    expect(near[0]).toBeGreaterThan(far[0]!);
  });

  it('keeps a suppressed hex suppressed through a bake, and still reports the change', () => {
    const { board, casters } = fixture();
    board.applyFog(null);
    board.updateDetail(10);
    // A city founded, a wood felled: the caller invalidates on the `true`, and
    // the hex's own props go on being discarded by the shader in both passes.
    expect(board.suppressTile(3, 2)).toBe(true);
    expect(board.suppressTile(3, 2)).toBe(false);
    expect(board.isCellVisible(3, 2)).toBe(false);
    board.setBakeDetail(true);
    expect(board.isCellVisible(3, 2)).toBe(false);
    expect(casters().length).toBeGreaterThan(0);
    board.setBakeDetail(false);
    expect(board.isCellVisible(3, 2)).toBe(false);
  });

  it('never lifts a wholly uncharted batch into the bake', () => {
    const { map, board, drawn } = fixture();
    board.applyFog(new Uint8Array(map.tiles.length));
    board.updateDetail(10);
    expect(drawn()).toHaveLength(0);
    board.setBakeDetail(true);
    expect(drawn()).toHaveLength(0);
    board.setBakeDetail(false);
  });

  it('answers a disposed board’s bake with no visibility writes at all', () => {
    const { board } = fixture();
    board.applyFog(null);
    board.dispose();
    expect(board.setBakeDetail(true)).toBe(false);
  });

  it('keeps the sun’s own invalidations: a new fit, and a new time of day', () => {
    // A source register: `setDaylight` moves the sun, `fitShadows` refits its
    // camera, and both end at `invalidateShadows` — otherwise dusk would be
    // painted over shadows cast at noon.
    const source = readFileSync(new URL('../../src/render3d/paintedLook.js', import.meta.url), 'utf8');
    const fit = source.slice(source.indexOf('function fitShadows'), source.indexOf('function invalidateShadows'));
    expect(fit).toContain('invalidateShadows()');
    const daylight = source.slice(source.indexOf('function setDaylight'), source.indexOf('setDaylight(key)'));
    expect(daylight).toContain('fitShadows()');
    expect(source).toContain('setBakeDetail(fn){bakeDetail=fn}');
  });
});
