// Real terrain/GLB validation. node scripts/terrain-study/check-settlements.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {Color,Mesh,MeshBasicMaterial,Raycaster,Vector3,DoubleSide} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareTerrainMap,centre} from '../../src/terrainStudy/surface.js';
import {terrainMesh} from '../../src/terrainStudy/terrainMesh.js';
import {surfacePatch} from '../../src/terrainStudy/surfacePatch.js';
import {farmPaint} from '../../src/terrainStudy/farmPaint.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const compiled=await build({stdin:{contents:`export {generateMap} from './src/sim/mapgen';export {createSettlementPlan} from './src/terrainStudy/settlementPlan.js';export {resourceFamilies,resourceDefinitions} from './src/terrainStudy/resourceCatalog.js';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {generateMap,createSettlementPlan,resourceFamilies,resourceDefinitions}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
assert.deepEqual(Object.keys(resourceFamilies).sort(),Object.keys(resourceDefinitions).sort(),'every game resource needs an art family');
let samples=0,paintedFieldSamples=0,uncultivatedHillSamples=0,maxNearError=0,maxFarClearance=0;
for(const seed of [1,2,3]){
 const raw=generateMap(seed,'standard'),before=JSON.stringify(raw),map=prepareTerrainMap(raw),plan=createSettlementPlan(map);
 assert.equal(JSON.stringify(raw),before,'art fixtures must not alter game data');
 for(const site of ['city','hillFarm','farm','pasture','mine','plantation','quarry','camp','boats'])assert.ok(plan.sites[site],`seed ${seed} missing review ${site}`);
 assert.ok(plan.sites.hillFarm.hills);
 const selected=[plan.sites.hillFarm,plan.sites.farm,...map.tiles.filter(t=>t.hills&&!['ocean','coast','lake','mountain'].includes(t.terrain)&&t.feature!=='oasis').filter((_,i)=>i%17===0).slice(0,18)];
 for(const tile of selected){
  const c=centre(tile),[near,side]=terrainMesh(tile),[far,farSide]=terrainMesh(tile,{distant:true});
  const shape=[[-.49,-.44],[.43,-.48],[.51,.35],[-.42,.46]].map(([x,z])=>[x+c.x,z+c.z]);
  const patch=surfacePatch(near,shape,new Color('#b9a56d'));
  const material=new MeshBasicMaterial({side:DoubleSide}),a=new Mesh(near,material),b=new Mesh(patch,material),distant=new Mesh(far,material),ray=new Raycaster();
  for(let x=-.35;x<=.35;x+=.10)for(let z=-.3;z<=.3;z+=.10){
   ray.set(new Vector3(c.x+x,5,c.z+z),new Vector3(0,-1,0));
   const ground=ray.intersectObject(a)[0],mark=ray.intersectObject(b)[0],low=ray.intersectObject(distant)[0];
   assert.ok(ground&&mark&&low,'field unexpectedly has a hole');
   const error=Math.abs(mark.point.y-ground.point.y-.007),clearance=mark.point.y-low.point.y;
   assert.ok(error<.00001,`field floats or clips: ${error}`);
   assert.ok(clearance>.0001&&clearance<.016,`distant terrain clips or floats under fields: ${clearance}`);
   maxNearError=Math.max(maxNearError,error);maxFarClearance=Math.max(maxFarClearance,clearance);samples++;
  }
  if(tile===plan.sites.hillFarm||tile===plan.sites.farm){
   // The final piece is the small farmhouse yard, which may sit beside the
   // hill. Check the cultivated area independently from that local clearing.
   const parts=farmPaint(tile,near),paint=mergeGeometries(parts.slice(0,-1)),field=new Mesh(paint,material);
   for(let x=-.62;x<=.62;x+=.124)for(let z=-.42;z<=.42;z+=.105){
    ray.set(new Vector3(c.x+x,5,c.z+z),new Vector3(0,-1,0));
    const hit=ray.intersectObject(field)[0],ground=ray.intersectObject(a)[0],farGround=ray.intersectObject(distant)[0];
    assert.ok(ground&&farGround,'missing ground under farm');
    if(tile.hills&&ground.faceIndex*3<near.userData.plateVertexCount){
     assert.ok(!hit,'hill crops spill onto the surrounding flat ground');
     uncultivatedHillSamples++;continue;
    }
    assert.ok(hit,'farm has a hole in its cultivated footprint');
    assert.ok(hit.point.y-ground.point.y>=.0059&&hit.point.y-ground.point.y<.014,'painted farm has gained 3D relief or clips its surface');
    assert.ok(hit.point.y>farGround.point.y,'painted farm clips distant terrain');
    paintedFieldSamples++;
   }
   paint.dispose();parts.forEach(g=>g.dispose());
  }
  [near,side,far,farSide,patch].forEach(g=>g.dispose());material.dispose();
 }
}
assert.ok(uncultivatedHillSamples>0,'hill checks must include uncultivated flat ground');
const assetStats={};
for(const name of ['horse','cattle','bison','deer','elephant','beaver','house','temple','bell-tower','mine','camp','quarry','fishing-boat','resource-shrub','city-house','city-loggia','civic-sanctum','city-spire','city-dome']){
 const bytes=fs.readFileSync(`public/terrain-study/settlements/${name}.glb`),{scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let triangles=0;
 scene.traverse(o=>{if(!o.isMesh)return;assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3});
 assert.ok(triangles>0&&triangles<15000);assetStats[name]=triangles;
}
console.log(JSON.stringify({resourceTypes:Object.keys(resourceFamilies).length,seeds:3,surfaceSamples:samples,paintedFieldSamples,uncultivatedHillSamples,maxNearError,maxFarClearance,assetTriangles:assetStats},null,2));
