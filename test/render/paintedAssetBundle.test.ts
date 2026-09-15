/**
 * The vegetation kit is prepared once by `scripts/terrain-study/build_asset_bundle.mjs`
 * and shipped as one renderer-ready file. Two facts have to hold for that to be
 * safe, and they are pinned in two places, for the reason this suite cannot read
 * a binary: these tests own the *format* — that a bundle carries every attribute,
 * index, item size, array type and bound the live GLB path produces, and that a
 * missing, stale or malformed one costs nothing but the old path — while the
 * build script's own `--check` owns the *shipped file*, where both inputs are
 * bytes on disk and Node may read them.
 *
 * The comparison here is between the two live paths on the same scenes: the
 * fallback's output is described into a bundle, served back, and the geometry
 * that comes out must match attribute for attribute and species for species.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, BufferGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
// @ts-expect-error The shared study asset loader has no standalone declaration.
import { loadVegetation, describeVegetationBundle, VEGETATION_BUNDLE_VERSION, VEGETATION_BUNDLE_URL, VEGETATION_SPECIES } from '../../src/terrainStudy/vegetation.js';

afterEach(() => { vi.restoreAllMocks(); });

/** A sculpt with a leaf material, so the bake writes pigment, UV and canopy weight. */
function asset(): GLTF {
  const scene = new Group(), material = new MeshStandardMaterial();
  material.name = 'leaf0';
  scene.add(new Mesh(new BoxGeometry(.3, 1.4, .3), material));
  return { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, parser: undefined!, userData: {} };
}

/** Exactly what the build script writes: magic, header length, header, pad, data. */
function encodeBundle(described: { header: unknown; chunks: Uint8Array[]; bytes: number }): ArrayBuffer {
  const json = new TextEncoder().encode(JSON.stringify(described.header));
  const pad = (4 - ((8 + json.length) % 4)) % 4;
  const buffer = new ArrayBuffer(8 + json.length + pad + described.bytes);
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  for (const [i, letter] of [...'MLAB'].entries()) view.setUint8(i, letter.charCodeAt(0));
  view.setUint32(4, json.length, true);
  bytes.set(json, 8);
  let at = 8 + json.length + pad;
  for (const chunk of described.chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  return buffer;
}

/** `fetch` is spied on rather than stubbed: this suite's workers share a module graph. */
function serve(buffer: ArrayBuffer | null) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((async (url: string) => {
    expect(url).toBe(VEGETATION_BUNDLE_URL);
    return buffer
      ? { ok: true, status: 200, arrayBuffer: async () => buffer }
      : { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  }) as unknown as typeof fetch);
}

type Asset = { geometry: BufferGeometry; shoulderGeometry: BufferGeometry | null; material: MeshStandardMaterial };
type Kit = { broadleaves: Asset[]; cypresses: Asset[]; escarpments: Asset[]; limestone: Asset; materials: MeshStandardMaterial[] };
type Described = { header: { version: string; species: { name: string }[] }; chunks: Uint8Array[]; bytes: number };

const ordered = (kit: Kit): Asset[] => [...kit.broadleaves, ...kit.cypresses, ...kit.escarpments, kit.limestone];

/** Everything about a geometry a renderer can see, in a form `toEqual` compares. */
function describeGeometry(geometry: BufferGeometry | null) {
  if (!geometry) return null;
  return {
    attributes: Object.entries(geometry.attributes).map(([name, attribute]) => [
      name, attribute.itemSize, attribute.array.constructor.name, [...attribute.array],
    ]),
    index: geometry.index ? [geometry.index.array.constructor.name, [...geometry.index.array]] : null,
    boundingBox: geometry.boundingBox ? [geometry.boundingBox.min.toArray(), geometry.boundingBox.max.toArray()] : null,
  };
}

function release(kit: Kit): void {
  for (const asset of ordered(kit)) { asset.geometry.dispose(); asset.shoulderGeometry?.dispose(); }
  for (const material of kit.materials) material.dispose();
}

/** The fallback's own output, and a bundle describing it. */
async function prepared(): Promise<{ live: Kit; described: Described }> {
  vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => asset());
  serve(null);
  const live: Kit = await loadVegetation({ value: 0 }, null, null, { indexed: true });
  return { live, described: describeVegetationBundle(live) as Described };
}

describe('prepared vegetation bundle', () => {
  it('reproduces the live GLB path attribute for attribute, for every species', async () => {
    const { live, described } = await prepared();
    expect(ordered(live)).toHaveLength(VEGETATION_SPECIES.length);
    expect(described.header.version).toBe(VEGETATION_BUNDLE_VERSION);
    expect(described.header.species.map(row => row.name)).toEqual(VEGETATION_SPECIES.map((row: { name: string }) => row.name));

    serve(encodeBundle(described));
    const bundled: Kit = await loadVegetation({ value: 0 }, null, null, { indexed: true });
    for (const [i, species] of VEGETATION_SPECIES.entries()) {
      const a = ordered(live)[i], b = ordered(bundled)[i];
      expect(describeGeometry(b.geometry), `${species.name} geometry`).toEqual(describeGeometry(a.geometry));
      expect(describeGeometry(b.shoulderGeometry), `${species.name} shoulder`).toEqual(describeGeometry(a.shoulderGeometry));
      // The rock/foliage association travels in the species order, not the geometry.
      expect(bundled.materials.indexOf(b.material), `${species.name} material`).toBe(live.materials.indexOf(a.material));
    }
    release(live); release(bundled);
  });

  it('never asks for a bundle the renderer could not use', async () => {
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => asset());
    const asked = serve(null);
    const plain: Kit = await loadVegetation({ value: 0 }, null, null, { indexed: false });
    expect(asked).not.toHaveBeenCalled();
    expect(plain.broadleaves[0].geometry.index).toBeNull();
    release(plain);
  });

  it.each([
    ['a refused request', (buffer: ArrayBuffer) => { void buffer; return null; }],
    ['a bundle that is not one', (buffer: ArrayBuffer) => { new DataView(buffer).setUint8(0, 0x58); return buffer; }],
    ['a truncated bundle', (buffer: ArrayBuffer) => buffer.slice(0, 32)],
  ])('falls back on %s rather than failing the look', async (_name, spoil) => {
    const { live, described } = await prepared();
    serve(spoil(encodeBundle(described)));
    const fallen: Kit = await loadVegetation({ value: 0 }, null, null, { indexed: true });
    for (const [i, species] of VEGETATION_SPECIES.entries())
      expect(describeGeometry(ordered(fallen)[i].geometry), `${species.name}`).toEqual(describeGeometry(ordered(live)[i].geometry));
    release(live); release(fallen);
  });

  it.each([
    ['another version', (header: Described['header']) => { header.version = 'vegetation-0'; }],
    ['a species the renderer does not know', (header: Described['header']) => { header.species[4].name = 'cypress-sculpt-9'; }],
    ['a different kit', (header: Described['header']) => { header.species.pop(); }],
  ])('refuses a bundle naming %s, and builds nothing from it', async (_name, spoil) => {
    const { live, described } = await prepared();
    spoil(described.header);
    const refused = encodeBundle(described);
    serve(refused);
    const fallen: Kit = await loadVegetation({ value: 0 }, null, null, { indexed: true });
    // A refused header is a fallback, not a failure — and nothing the caller
    // receives is a view onto the bundle it refused.
    for (const asset of ordered(fallen))
      for (const geometry of [asset.geometry, asset.shoulderGeometry])
        for (const attribute of Object.values(geometry?.attributes ?? {}))
          expect(attribute.array.buffer).not.toBe(refused);
    expect(describeGeometry(ordered(fallen)[0].geometry)).toEqual(describeGeometry(ordered(live)[0].geometry));
    release(live); release(fallen);
  });
});
