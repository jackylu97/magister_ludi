// node scripts/terrain-study/bake_northstar_units.mjs
//
// Reads the unit models that `build_northstar_units.py` wrote to
// art/terrain-study/northstar-units and writes them as one JSON file,
// src/terrainStudy/northStarUnitData.json. The renderer builds a piece when it
// first needs one and cannot wait for a download, so the models are data in
// the bundle and not files to fetch. Run this again after the Blender script.
//
// For each model the file holds, for each vertex: its place (in units of
// 1/10000), its colour (linear, in 1/1000), which colour it takes (0 its own,
// 1 the seat's first, 2 the seat's second) and how it moves when the piece
// idles (in 1/1000; see the Blender script). Equal vertices are stored once.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '..', '..', 'art', 'terrain-study', 'northstar-units');
const target = join(here, '..', '..', 'src', 'terrainStudy', 'northStarUnitData.json');
const loader = new GLTFLoader();
const models = {};
for (const file of readdirSync(source).filter(name => name.endsWith('.glb')).sort()) {
  const bytes = readFileSync(join(source, file));
  const gltf = await new Promise((resolve, reject) =>
    loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
  gltf.scene.updateMatrixWorld(true);
  const seen = new Map(), position = [], color = [], owner = [], idle = [], index = [];
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const p = g.attributes.position, marks = g.attributes.color, c = o.material.color;
    const role = o.material.name.startsWith('Owner') ? 1 : o.material.name.startsWith('Trim') ? 2 : 0;
    for (let i = 0; i < p.count; i++) {
      const row = [
        Math.round(p.getX(i) * 1e4), Math.round(p.getY(i) * 1e4), Math.round(p.getZ(i) * 1e4),
        Math.round(c.r * 1e3), Math.round(c.g * 1e3), Math.round(c.b * 1e3), role,
        ...(marks ? [marks.getX(i), marks.getY(i), marks.getZ(i)] : [0, 0, 0]).map(v => Math.round(v * 1e3)),
      ];
      const key = row.join(',');
      let at = seen.get(key);
      if (at === undefined) {
        at = seen.size; seen.set(key, at);
        position.push(row[0], row[1], row[2]); color.push(row[3], row[4], row[5]); owner.push(row[6]); idle.push(row[7], row[8], row[9]);
      }
      index.push(at);
    }
  });
  models[file.replace(/\.glb$/, '')] = { triangles: index.length / 3, position, color, owner, idle, index };
  console.log(file, index.length / 3, 'triangles', seen.size, 'vertices');
}
writeFileSync(target, JSON.stringify(models) + '\n');
console.log('wrote', target);
