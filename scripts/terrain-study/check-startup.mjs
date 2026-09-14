// CPU-only generation/terrain profile. Run with node --cpu-prof for attribution.
// Small prop stand-ins isolate terrain construction from GLB/network loading.
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {BoxGeometry,MeshStandardMaterial} from 'three';
import {buildPaintedBoard} from '../../src/render3d/paintedBoard.js';
import {buildPaintedBoardAsync} from '../../src/render3d/paintedBoardAsync.js';
import {Worker as NodeWorker} from 'node:worker_threads';
function workerFactory() {
 const url=new URL('../../src/render3d/paintedBoard.worker.js',import.meta.url).href;
 const thread=new NodeWorker(`const {parentPort}=require('node:worker_threads');
 globalThis.self={postMessage:(message,transfer)=>parentPort.postMessage(message,transfer)};
 import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
 const adapter={onmessage:null,onerror:null,onmessageerror:null,postMessage:value=>thread.postMessage(value),terminate:()=>void thread.terminate()};
 thread.on('message',data=>adapter.onmessage?.({data}));thread.on('error',error=>adapter.onerror?.(error));
 return adapter;
}
const compiled=await build({entryPoints:['src/sim/mapgen.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {generateMap}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const start=performance.now(),map=generateMap(1,'standard'),generationMs=performance.now()-start;
const material=new MeshStandardMaterial({vertexColors:true}),geometry=new BoxGeometry(.3,.8,.3);
const asset={geometry,shoulderGeometry:geometry,material};
const assets={broadleaves:[asset,asset,asset],cypresses:[asset,asset],escarpments:[asset,asset,asset],limestone:asset,broadleaf:asset,rangeMaterial:material};
// Keep source material identities distinct, as they are in the production kit.
const allocated=[];
const mat=()=>{const m=material.clone();allocated.push(m);return m};
const materials={ground:Object.fromEntries(['grassland','plains','desert','tundra','snow','mountain','ocean','coast','lake','oasis','floodplain'].map(k=>[k,mat()])),
earth:mat(),mergedLand:mat(),mergedWater:mat(),mergedDetails:mat(),
water:Object.fromEntries(['river','bank','shallows','foam'].map(k=>[k,mat()])),
features:Object.fromEntries(['shrub','stone','fertile','bank','pool','shallow','reeds'].map(k=>[k,mat()]))};
const at=performance.now();
const result=process.argv.includes('--worker')?await buildPaintedBoardAsync(map,assets,materials,true,{workerFactory}):null;
const board=result?.board||buildPaintedBoard(map,assets,materials),boardMs=performance.now()-at;
const fingerprint=createHash('sha256'),seen=new Set();
board.group.traverse(object=>{
 const g=object.geometry;if(!g||seen.has(g))return;seen.add(g);
 for(const [name,a]of Object.entries(g.attributes)){
  fingerprint.update(name+':'+a.itemSize+':'+a.normalized+':'+a.array.constructor.name);
  fingerprint.update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));
 }
 if(g.index)fingerprint.update(new Uint8Array(g.index.array.buffer,g.index.array.byteOffset,g.index.array.byteLength));
});
console.log(JSON.stringify({seed:1,size:'standard',tiles:map.tiles.length,generationMs,boardMs,...(result?{worker:result.metrics}:{}),geometryMiB:board.geometryBytes/1048576,geometryHash:fingerprint.digest('hex'),notes:'CPU terrain build with small prop stand-ins; excludes real asset loading, GPU upload, shader compilation and saved-game replay'},null,2));
board.dispose();geometry.dispose();material.dispose();allocated.forEach(m=>m.dispose());
