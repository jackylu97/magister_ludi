import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, OrthographicCamera, Scene, Texture, TextureLoader, type WebGLRenderer } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createPaintedLook } from '../../src/render3d/paintedLook.js';
// @ts-expect-error The shared study asset loader has no standalone declaration.
import { loadVegetation } from '../../src/terrainStudy/vegetation.js';
// @ts-expect-error The shared study asset loader has no standalone declaration.
import { loadSettlementAssets } from '../../src/terrainStudy/settlementAssets.js';

afterEach(() => { vi.restoreAllMocks(); });

/** Track allocation and disposal without a GPU, including temporary GLB copies. */
function resources() {
  const geometries = new Set<BufferGeometry>(), materials = new Set<MeshStandardMaterial>();
  const setAttribute = BufferGeometry.prototype.setAttribute;
  vi.spyOn(BufferGeometry.prototype, 'setAttribute').mockImplementation(function (this: BufferGeometry, name, attribute) {
    geometries.add(this); return setAttribute.call(this, name, attribute);
  });
  const setValues = MeshStandardMaterial.prototype.setValues;
  vi.spyOn(MeshStandardMaterial.prototype, 'setValues').mockImplementation(function (this: MeshStandardMaterial, values) {
    materials.add(this); return setValues.call(this, values);
  });
  const geometryDisposals = vi.spyOn(BufferGeometry.prototype, 'dispose');
  const materialDisposals = vi.spyOn(MeshStandardMaterial.prototype, 'dispose');
  function expectReleased(): void {
    for (const geometry of geometries) expect(geometryDisposals.mock.contexts.filter(value => value === geometry)).toHaveLength(1);
    for (const material of materials) expect(materialDisposals.mock.contexts.filter(value => value === material)).toHaveLength(1);
  }
  return { geometries, materials, expectReleased, geometryDisposals, materialDisposals };
}

function asset(malformed = false): GLTF {
  const scene = new Group(), material = new MeshStandardMaterial();
  material.name = 'leaf0';
  const mesh = new Mesh(new BoxGeometry(.3, 1, .3), material);
  if (malformed) Object.defineProperty(material, 'color', { get() { throw new Error('invalid pigment'); } });
  scene.add(mesh);
  return { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, parser: undefined!, userData: {} };
}

describe('painted asset lifecycle', () => {
  it('releases successful and late GLB batches when another request fails', async () => {
    const owned = resources(), failure = new Error('grove download failed');
    let finishLate!: (gltf: GLTF) => void;
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(url => {
      if (url.endsWith('grove-sculpt-0.glb')) return Promise.reject(failure);
      if (url.endsWith('limestone.glb')) return new Promise(resolve => { finishLate = resolve; });
      return Promise.resolve(asset());
    });
    let rejected = false;
    const loading = loadVegetation({ value: 0 }, null, null).catch((error: unknown) => { rejected = true; return error; });
    await Promise.resolve(); await Promise.resolve();
    expect(rejected).toBe(false);
    finishLate(asset());
    expect(await loading).toBe(failure);
    expect(owned.geometries.size).toBeGreaterThan(8);
    owned.expectReleased();
  });

  it('releases source objects and temporary copies when GLB processing throws', async () => {
    const owned = resources();
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(url => Promise.resolve(asset(url.endsWith('grove-sculpt-0.glb'))));
    await expect(loadVegetation({ value: 0 }, null, null)).rejects.toThrow('invalid pigment');
    owned.expectReleased();
  });

  it('transfers live output geometry and shared materials on successful loading', async () => {
    const owned = resources();
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => asset());
    const loaded = await loadVegetation({ value: 0 }, null, null);
    const outputs = [...loaded.broadleaves, ...loaded.cypresses, ...loaded.escarpments, loaded.limestone];
    const geometries = new Set<BufferGeometry>();
    for (const output of outputs) {
      geometries.add(output.geometry);
      if (output.shoulderGeometry) geometries.add(output.shoulderGeometry);
    }
    expect(geometries.size).toBe(12);
    for (const geometry of geometries) {
      expect(owned.geometryDisposals.mock.contexts).not.toContain(geometry);
      expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
      geometry.dispose();
    }
    for (const material of loaded.materials as MeshStandardMaterial[]) {
      expect(owned.materialDisposals.mock.contexts).not.toContain(material);
      material.dispose();
    }
    owned.expectReleased();
  });

  it('loads only the requested city kit and cleans up a partial and late failure', async () => {
    const owned = resources(), failure = new Error('city unavailable');
    let finishLate!: (gltf: GLTF) => void;
    const request = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(url => {
      if (url.endsWith('city-house.glb')) return Promise.reject(failure);
      if (url.endsWith('city-spire.glb')) return new Promise(resolve => { finishLate = resolve; });
      return Promise.resolve(asset());
    });
    let settled = false;
    const loading = loadSettlementAssets({register(){}}, null, {names:['city-house','city-loggia','city-spire','city-loggia']})
      .catch((error: unknown) => { settled = true; return error; });
    await Promise.resolve(); await Promise.resolve();
    expect(settled).toBe(false);
    expect(request.mock.calls.map(([url]) => url)).toEqual(['city-house','city-loggia','city-spire'].map(name => `/terrain-study/settlements/${name}.glb`));
    finishLate(asset());
    expect(await loading).toBe(failure);
    owned.expectReleased();
  });

  it('releases city source geometry when its pigment processing fails', async () => {
    const owned = resources();
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => asset(true));
    await expect(loadSettlementAssets({register(){}}, null, {names:['city-house']})).rejects.toThrow('invalid pigment');
    owned.expectReleased();
  });

  it.each(['flocking texture', 'GLB', 'city GLB'] as const)('rolls back a look after a failed %s load', async stage => {
    const owned = resources(), textures: Texture[] = [], failure = new Error('asset unavailable');
    const disposedTextures: Texture[] = [];
    vi.spyOn(TextureLoader.prototype, 'loadAsync').mockImplementation(async url => {
      if (stage === 'flocking texture' && url.includes('flocking')) throw failure;
      const texture = new Texture<HTMLImageElement>(); textures.push(texture);
      texture.addEventListener('dispose', () => { disposedTextures.push(texture); });
      return texture;
    });
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async url => {
      if (stage !== 'city GLB' || url.includes('/settlements/')) throw failure;
      return asset();
    });
    const scene = new Scene(), camera = new OrthographicCamera(), environment = new Texture();
    scene.environment = environment; scene.environmentIntensity = .42; scene.background = new Color('#345678');
    camera.layers.enable(5);
    const background = scene.background, layers = camera.layers.mask;
    const renderer = {
      capabilities: { getMaxAnisotropy: () => 4 }, toneMapping: 3,
      shadowMap: { type: 2, autoUpdate: true, needsUpdate: false },
    } as unknown as WebGLRenderer;
    await expect(createPaintedLook(renderer, scene, camera)).rejects.toBe(failure);
    expect(textures).toHaveLength(stage === 'flocking texture' ? 1 : 3);
    expect(disposedTextures).toEqual(textures);
    owned.expectReleased();
    expect(scene.environment).toBe(environment);
    expect(scene.environmentIntensity).toBe(.42);
    expect(scene.background).toBe(background);
    expect(scene.children).toEqual([]);
    expect(camera.layers.mask).toBe(layers);
    expect(renderer.toneMapping).toBe(3);
    expect(renderer.shadowMap).toEqual({ type: 2, autoUpdate: true, needsUpdate: false });
    environment.dispose();
  });
});
