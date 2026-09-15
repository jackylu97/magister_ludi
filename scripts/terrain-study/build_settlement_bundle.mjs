// node scripts/terrain-study/build_settlement_bundle.mjs [--check]
//
// The settlement kit's half of the contract `build_asset_bundle.mjs` set for the
// vegetation: twenty-eight authored GLBs, each cloned and de-indexed, its
// vertices transformed into world space, its material masks baked down to a
// colour attribute, a UV projected, and the whole thing merged and welded — all
// of it a pure function of the GLB bytes, all of it repeated on every load.
//
// The output is one self-describing file, `<version>.bundle`, in the same shape:
//
//   "MLAB"            4 bytes   magic
//   headerBytes       uint32le
//   header            JSON, the manifest: version, and for each asset the
//                     attribute names, item sizes, array types, byte offsets,
//                     counts, index and bounding box
//   (pad to 4)
//   data              every attribute and index array, in header order
//
// The version is the filename and the header's own field, so an out-of-date
// renderer 404s or refuses and falls back to the authored GLBs — which are still
// shipped. **Re-run this script after editing any settlement GLB**; it verifies
// itself against the live loader and `--check` verifies without writing.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  SETTLEMENT_ASSET_NAMES, SETTLEMENT_BUNDLE_VERSION, bakeSettlementScene,
  describeSettlementBundle, readSettlementBundle,
} from '../../src/terrainStudy/settlementAssets.js';

const here = dirname(fileURLToPath(import.meta.url));
const assetDir = join(here, '..', '..', 'public', 'terrain-study', 'settlements');
const out = join(here, '..', '..', 'public', 'terrain-study', 'asset-bundle');
const file = join(out, `${SETTLEMENT_BUNDLE_VERSION}.bundle`);
const check = process.argv.includes('--check');

/** Exactly the loader's own preparation, driven off the files rather than the network. */
async function prepareFromGlb() {
  const loader = new GLTFLoader();
  const kit = {};
  for (const name of SETTLEMENT_ASSET_NAMES) {
    const bytes = readFileSync(join(assetDir, `${name}.glb`));
    const gltf = await new Promise((resolve, reject) =>
      loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
    kit[name] = bakeSettlementScene(gltf.scene, name);
  }
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
  const read = readSettlementBundle(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  assert.equal(read.size, SETTLEMENT_ASSET_NAMES.length);
  for (const name of SETTLEMENT_ASSET_NAMES) {
    const a = kit[name], b = read.get(name);
    assert.ok(b, `${name} missing from the bundle`);
    assert.deepEqual(Object.keys(b.attributes), Object.keys(a.attributes), `${name} attribute names`);
    for (const [attributeName, attribute] of Object.entries(a.attributes)) {
      const other = b.attributes[attributeName];
      assert.equal(other.itemSize, attribute.itemSize, `${name} ${attributeName} itemSize`);
      assert.equal(other.array.constructor.name, attribute.array.constructor.name, `${name} ${attributeName} type`);
      assert.deepEqual([...other.array], [...attribute.array], `${name} ${attributeName} values`);
    }
    assert.equal(!!b.index, !!a.index, `${name} index presence`);
    if (a.index) {
      assert.equal(b.index.array.constructor.name, a.index.array.constructor.name, `${name} index type`);
      assert.deepEqual([...b.index.array], [...a.index.array], `${name} index values`);
    }
    if (a.boundingBox) {
      assert.deepEqual(b.boundingBox.min.toArray(), a.boundingBox.min.toArray(), `${name} bounds min`);
      assert.deepEqual(b.boundingBox.max.toArray(), a.boundingBox.max.toArray(), `${name} bounds max`);
    }
  }
  return read;
}

const kit = await prepareFromGlb();
const described = describeSettlementBundle(kit);
const buffer = encode(described);
verify(kit, buffer);

if (check) {
  const shipped = readFileSync(file);
  verify(kit, shipped);
  assert.ok(shipped.equals(buffer), `${file} is out of date — re-run build_settlement_bundle.mjs`);
  console.log(`settlement bundle ${SETTLEMENT_BUNDLE_VERSION} matches the live loader for all ${SETTLEMENT_ASSET_NAMES.length} assets (${shipped.length} bytes)`);
} else {
  mkdirSync(out, { recursive: true });
  writeFileSync(file, buffer);
  let glb = 0;
  for (const name of SETTLEMENT_ASSET_NAMES) glb += readFileSync(join(assetDir, `${name}.glb`)).length;
  for (const [i, name] of SETTLEMENT_ASSET_NAMES.entries())
    console.log(`  ${name.padEnd(20)} ${String(described.header.kit[i].geometry.attributes.position.count / 3).padStart(6)} verts`);
  console.log(`wrote ${file}`);
  console.log(`${SETTLEMENT_ASSET_NAMES.length} GLB requests (${glb} bytes) -> 1 bundle request (${buffer.length} bytes)`);
}
