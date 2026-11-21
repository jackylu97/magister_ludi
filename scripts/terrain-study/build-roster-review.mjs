// Export the production models at the scale and decoration used for review.
import {build} from 'esbuild';
import {writeFileSync, mkdtempSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

const work = mkdtempSync(join(tmpdir(), 'roster-review-'));
const bundle = join(work, 'pieces.mjs');
await build({entryPoints:['src/terrainStudy/primitiveUnitModels.js'],bundle:true,format:'esm',outfile:bundle});
const {createPrimitiveUnitScene} = await import(pathToFileURL(bundle));
globalThis.FileReader = class {
 async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};
const out = process.argv[2] ?? 'art/terrain-study/unit-roster-review';
mkdirSync(out, {recursive:true});
const models=['hypaspist','janissary','condottiere','qinCrossbowman','sparabara','hwacha','numidianCavalry','companyGuard','ballistaElephant','keshig'];
for(const id of [...models,'swordsman','horseman','catapult']){
 const scene = id === 'keshig' ? createPrimitiveUnitScene('xiongnuHorseArcher', {tier:2}) : createPrimitiveUnitScene(id, {tier:1});
 const data=await new GLTFExporter().parseAsync(scene,{binary:true});
 writeFileSync(join(models.includes(id)?out:work,id+'.glb'),Buffer.from(data));
}
console.log(work);
