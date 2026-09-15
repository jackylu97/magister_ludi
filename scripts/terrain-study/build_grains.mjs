// node scripts/terrain-study/build_grains.mjs
//
// The three grains are scalar noise fields: every shader that samples them reads
// `.r` and nothing else (painterly.js's paper tap, paintedLook's mineral/flock
// pigment, and the bump maps, which sample `.x`). They were authored as RGB
// PNGs, so two thirds of ~8.9 MB on the wire and of the uploaded RGBA8 texture
// carried channels no program can see.
//
// This step writes the red channel out as an 8-bit greyscale PNG. The renderer
// uploads those with `RedFormat`, so the sampled value is byte-identical while
// the file and the texture carry one channel. The authored RGB originals stay in
// `grain-source/` — outside `public/`, so they are not shipped — and this script
// is the only way the served PNGs are produced.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { decodePng, redChannel, encodeGreyPng } from './png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'grain-source');
const destination = join(here, '..', '..', 'public', 'terrain-study');

const verifyOnly = process.argv.includes('--check');
const names = readdirSync(source).filter(name => name.endsWith('.png')).sort();
let before = 0, after = 0;
for (const name of names) {
  const original = readFileSync(join(source, name));
  const image = decodePng(original);
  const red = redChannel(image);
  // What the renderer samples is the red channel, so that is what `--check`
  // compares; re-encoding to compare *bytes* would only assert that this
  // encoder has not changed, at ten times the cost in a core test.
  let encoded;
  if (verifyOnly) {
    encoded = readFileSync(join(destination, name));
    const shipped = decodePng(encoded);
    if (shipped.colorType !== 0 || shipped.depth !== 8) throw new Error(`${name} is shipped as colorType ${shipped.colorType} depth ${shipped.depth}, not 8-bit greyscale`);
    if (shipped.width !== image.width || shipped.height !== image.height) throw new Error(`${name} is shipped at ${shipped.width}x${shipped.height}, not ${image.width}x${image.height}`);
    if (!redChannel(shipped).equals(red)) throw new Error(`${name} is out of date — re-run build_grains.mjs`);
  } else {
    encoded = encodeGreyPng(image.width, image.height, red);
    // Re-read what was written: a grain that does not round-trip is a silent
    // pigment change everywhere, so the script refuses rather than ships it.
    const check = decodePng(encoded);
    if (check.channels !== 1 || !redChannel(check).equals(red)) throw new Error(`${name} did not round-trip`);
    writeFileSync(join(destination, name), encoded);
  }
  before += original.length; after += encoded.length;
  console.log(`${name}  ${image.width}x${image.height}  ${(original.length / 1048576).toFixed(2)} MB RGB -> ${(encoded.length / 1048576).toFixed(2)} MB grey  red sha256 ${createHash('sha256').update(red).digest('hex').slice(0, 16)}`);
}
console.log(`total ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB (${(100 * (1 - after / before)).toFixed(1)}% smaller)`);
