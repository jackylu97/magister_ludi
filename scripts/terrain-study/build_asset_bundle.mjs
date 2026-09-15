// node scripts/terrain-study/build_asset_bundle.mjs [--check]
//
// The vegetation kit is authored once and never changes at runtime, yet every
// load re-parsed nine GLBs, cloned and de-indexed their meshes, transformed the
// vertices, baked pigment against the cavity shading, wrote UV and canopy
// weights, merged, cut the escarpment shoulders, computed the range-foot weight
// and welded the result. That work is a pure function of the GLB bytes, so it
// runs here instead and the renderer downloads what it is going to use.
//
// The output is one self-describing file, `<version>.bundle`:
//
//   "MLAB"            4 bytes   magic
//   headerBytes       uint32le
//   header            JSON, the manifest: version, and for each species the
//                     attribute names, item sizes, array types, byte offsets,
//                     counts, index and bounding box
//   (pad to 4)
//   data              every attribute and index array, in header order
//
// The version is the filename and the header's own field, so an out-of-date
// renderer 404s or refuses and falls back to the authored GLBs — which are
// still shipped. **Re-run this script after editing any vegetation GLB**; it
// verifies itself against the live loader and `--check` verifies without
// writing.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  VEGETATION_SPECIES, VEGETATION_BUNDLE_VERSION, bakeVegetationScene, finishVegetation,
  describeVegetationBundle, readVegetationBundle,
} from '../../src/terrainStudy/vegetation.js';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', '..', 'public', 'terrain-study');
const out = join(assets, 'asset-bundle');
const file = join(out, `${VEGETATION_BUNDLE_VERSION}.bundle`);
const check = process.argv.includes('--check');

/** Exactly the loader's own preparation, driven off the files rather than the network. */
async function prepareFromGlb() {
  const loader = new GLTFLoader();
  const baked = [];
  for (const species of VEGETATION_SPECIES) {
    const bytes = readFileSync(join(assets, `${species.name}.glb`));
    const gltf = await new Promise((resolve, reject) =>
      loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
    baked.push(bakeVegetationScene(gltf.scene, species));
  }
  const kit = { broadleaves: baked.slice(0, 3), cypresses: baked.slice(3, 5), escarpments: baked.slice(5, 8), limestone: baked[8] };
  finishVegetation(kit, { indexed: true });
  return kit;
}

function encode({ header, chunks, bytes }) {
  const json = Buffer.from(JSON.stringify(header), 'utf8');
  const headStart = Buffer.alloc(8);
  headStart.write('MLAB', 0, 'ascii'); headStart.writeUInt32LE(json.length, 4);
  const pad = Buffer.alloc((4 - ((8 + json.length) % 4)) % 4);
  const data = Buffer.concat(chunks.map(chunk => Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)));
  assert.equal(data.length, bytes, 'bundle data length disagrees with the header');
  return Buffer.concat([headStart, json, pad, data]);
}

/** A bundle that does not reproduce the live loader is worse than no bundle. */
function verify(kit, buffer) {
  const read = readVegetationBundle(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const live = [...kit.broadleaves, ...kit.cypresses, ...kit.escarpments, kit.limestone];
  assert.equal(read.length, live.length);
  for (const [i, species] of VEGETATION_SPECIES.entries()) {
    for (const slot of ['geometry', 'shoulderGeometry']) {
      const a = live[i][slot], b = read[i][slot];
      if (!a) { assert.equal(b, null, `${species.name} ${slot} should be absent`); continue; }
      assert.deepEqual(Object.keys(b.attributes), Object.keys(a.attributes), `${species.name} ${slot} attribute names`);
      for (const [name, attribute] of Object.entries(a.attributes)) {
        const other = b.attributes[name];
        assert.equal(other.itemSize, attribute.itemSize, `${species.name} ${slot} ${name} itemSize`);
        assert.equal(other.array.constructor.name, attribute.array.constructor.name, `${species.name} ${slot} ${name} type`);
        assert.deepEqual([...other.array], [...attribute.array], `${species.name} ${slot} ${name} values`);
      }
      assert.equal(!!b.index, !!a.index, `${species.name} ${slot} index presence`);
      if (a.index) {
        assert.equal(b.index.array.constructor.name, a.index.array.constructor.name, `${species.name} ${slot} index type`);
        assert.deepEqual([...b.index.array], [...a.index.array], `${species.name} ${slot} index values`);
      }
      if (a.boundingBox) {
        assert.deepEqual(b.boundingBox.min.toArray(), a.boundingBox.min.toArray(), `${species.name} ${slot} bounds min`);
        assert.deepEqual(b.boundingBox.max.toArray(), a.boundingBox.max.toArray(), `${species.name} ${slot} bounds max`);
      }
    }
  }
  return read;
}

const kit = await prepareFromGlb();
const described = describeVegetationBundle(kit);
const buffer = encode(described);
verify(kit, buffer);

if (check) {
  const shipped = readFileSync(file);
  verify(kit, shipped);
  assert.ok(shipped.equals(buffer), `${file} is out of date — re-run build_asset_bundle.mjs`);
  console.log(`asset bundle ${VEGETATION_BUNDLE_VERSION} matches the live loader for all ${VEGETATION_SPECIES.length} species (${shipped.length} bytes)`);
} else {
  mkdirSync(out, { recursive: true });
  writeFileSync(file, buffer);
  let glb = 0;
  for (const species of VEGETATION_SPECIES) glb += readFileSync(join(assets, `${species.name}.glb`)).length;
  for (const [i, species] of VEGETATION_SPECIES.entries())
    console.log(`  ${species.name.padEnd(17)} ${String(described.header.species[i].geometry.attributes.position.count / 3).padStart(6)} verts` +
      (described.header.species[i].shoulderGeometry ? `  + shoulder ${described.header.species[i].shoulderGeometry.attributes.position.count / 3} verts` : ''));
  console.log(`wrote ${file}`);
  console.log(`${VEGETATION_SPECIES.length} GLB requests (${glb} bytes) -> 1 bundle request (${buffer.length} bytes)`);
}
