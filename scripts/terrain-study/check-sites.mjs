// Verify actual discovery inventory, fixture isolation and terrain attachment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {Box3,Mesh,MeshBasicMaterial,Raycaster,Vector3,DoubleSide} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareTerrainMap,centre,WATER_LEVEL} from '../../src/terrainStudy/surface.js';
import {terrainMesh} from '../../src/terrainStudy/terrainMesh.js';
import {createSiteLayout,footprintPoints} from '../../src/terrainStudy/siteLayout.js';
const compiled=await build({stdin:{contents:`export {generateMap} from './src/sim/mapgen';export {createSettlementPlan} from './src/terrainStudy/settlementPlan.js';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {generateMap,createSettlementPlan}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const counts={},assetStats={},ranges={};let pieces=0,samples=0,maxFoundation=0;
for(const name of fs.readdirSync('public/terrain-study/settlements').filter(n=>n.startsWith('site-'))){
 const b=fs.readFileSync('public/terrain-study/settlements/'+name),{scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const bb=new Box3().setFromObject(scene);assert.ok([...bb.min.toArray(),...bb.max.toArray()].every(Number.isFinite));
 let triangles=0;scene.traverse(o=>{if(o.isMesh){assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3}});
 assert.ok(triangles>0&&triangles<15000);assetStats[name]=triangles;
}
for(const seed of [1,2,3]){
 const raw=generateMap(seed,'standard'),before=JSON.stringify(raw),map=prepareTerrainMap(raw),plan=createSettlementPlan(map);
 assert.equal(JSON.stringify(raw),before,'preview metadata must not change simulation map');
 for(const t of map.tiles){
  const entry=plan.entries.get(t);
  if(t.discovery){assert.equal(entry.site,t.discovery);assert.ok(!entry.city&&!entry.improvement,'fixture replaces a discovery');assert.ok(plan.discoverySites[t.discovery].includes(t));}
  else assert.ok(!entry.site||entry.site==='barbarianCamp','invented a generated discovery');
 }
 const camp=plan.discoverySites.barbarianCamp?.[0];assert.ok(camp&&!camp.discovery&&!camp.resource,'camp fixture needs a clear tile');
 for(const [t,e]of plan.entries){
  if(!e.site)continue;
  counts[e.site]=(counts[e.site]||0)+1;
  const layout=createSiteLayout(t,e.site);assert.ok(layout.pieces.length>=({ruins:3,village:2,antiquity:1,wreck:1,barbarianCamp:3})[e.site],`seed ${seed} ${e.site} ${t.col},${t.row}: too few pieces ${layout.pieces.length}`);
  assert.deepEqual(layout,createSiteLayout(t,e.site),'site layout must be stable');
  if(e.site==='wreck'){assert.equal(t.terrain,'ocean');assert.equal(layout.pieces[0].y,WATER_LEVEL);continue}
  const c=centre(t),[top,side]=terrainMesh(t),mat=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(top,mat),ray=new Raycaster();
  for(const piece of layout.pieces){
   pieces++;maxFoundation=Math.max(maxFoundation,piece.y-piece.bottom);
   ranges[e.site]=Math.max(ranges[e.site]||0,piece.y-piece.bottom);
   for(const [x,z]of footprintPoints(piece)){
    ray.set(new Vector3(c.x+x,5,c.z+z),new Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];
    assert.ok(hit,`${e.site} crosses a land edge`);
    assert.ok(piece.y>=hit.point.y-.00001,`${e.site} clips a hill face`);
    assert.ok(piece.bottom<=hit.point.y+.00001,`${e.site} foundation floats`);samples++;
   }
  }
  top.dispose();side.dispose();mat.dispose();
 }
}
assert.deepEqual(Object.keys(counts).sort(),['antiquity','barbarianCamp','ruins','village','wreck']);
console.log(JSON.stringify({seeds:3,counts,pieces,terrainSamples:samples,maxFoundation,foundationByKind:ranges,assetTriangles:assetStats},null,2));
