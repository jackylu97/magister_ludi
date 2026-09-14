import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Box3,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3,Quaternion} from 'three';
const compiled=await build({stdin:{contents:`export {generateMap} from './src/sim/mapgen';export {prepareTerrainMap,centre} from './src/terrainStudy/surface.js';export {terrainMesh} from './src/terrainStudy/terrainMesh.js';export {createSettlementPlan} from './src/terrainStudy/settlementPlan.js';export {createUnitPlan} from './src/terrainStudy/unitPlan.js';export {packUnitAsset} from './src/terrainStudy/unitAssets.js';export {createPrimitiveUnitScene} from './src/terrainStudy/primitiveUnitModels.js';export * from './src/terrainStudy/unitCatalog.js';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {generateMap,prepareTerrainMap,centre,terrainMesh,createSettlementPlan,createUnitPlan,packUnitAsset,createPrimitiveUnitScene,unitDefinitions,unitExamples,unitArtSpecs,unitLines,greatPersonFamilies}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const mapped=Object.values(unitLines).flatMap(l=>l.types);
assert.equal(new Set(mapped).size,mapped.length,'unit is assigned to two lines');
assert.deepEqual(mapped.sort(),Object.keys(unitDefinitions).sort(),'every current unit ID needs an explicit art mapping');
assert.equal(unitArtSpecs.warrior.line,unitArtSpecs.swordsman.line);
assert.notEqual(unitArtSpecs.swordsman.line,unitArtSpecs.spearman.line,'infantry and anti-cavalry cannot share one broad melee silhouette');
assert.notEqual(unitArtSpecs.horseman.line,unitArtSpecs.warElephant.line,'the elephant must not become a horse');
const assets={},assetReport={};
let wagonWheels=[],wagonBed=[];
function inspectAsset(name,options){
 const scene=createPrimitiveUnitScene(name,options);
 const roleTriangles={fixed:0,owner:0};scene.traverse(o=>{
  if(!o.isMesh)return;
  for(const key of ['position','normal'])assert.ok([...o.geometry.attributes[key].array].every(Number.isFinite));
  const role=o.material.name.startsWith('Owner')?'owner':'fixed';roleTriangles[role]+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
  if(role==='owner')assert.ok(Math.abs(o.material.color.r-o.material.color.g)<.07,'owner mask is pre-coloured and will distort faction tint');
 });
 // The wagon is intentionally lower than upright chess pawns.
 const minHeight=name==='trader'?.4:.75;
 const bb=new Box3().setFromObject(scene);assert.ok(Math.abs(bb.min.y)<.01,'sculpture soles must be near zero');assert.ok(bb.max.y<1.4&&bb.max.y>minHeight,`${name} is not at tabletop scale`);
 if(name==='trader'){
  scene.traverse(o=>{
   if(!o.isMesh||!o.name.startsWith('Caravan enamel wheel'))return;
   const p=o.geometry.attributes.position,vertices=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));
   const low=Math.min(...vertices.map(v=>v.y));
   wagonWheels.push(vertices.filter(v=>v.y<low+.00001).map(v=>v.clone().add(new Vector3(0,-bb.min.y,0))));
  });
  assert.equal(wagonWheels.length,4,'the caravan needs four actual wheel contacts');
  for(const wheel of wagonWheels)assert.ok(wheel.every(v=>v.y<.002),'caravan must stand on its wheels');
  const bed=new Box3().setFromObject(scene.getObjectByName('Caravan ivory floor'));
  // A hill crest between the wheels must stay below the actual carriage bed.
  // Its underside is clearance, not another set of ground-support contacts.
  for(let x=0;x<5;x++)for(let z=0;z<5;z++)wagonBed.push(new Vector3(bed.min.x+(bed.max.x-bed.min.x)*x/4,bed.min.y-bb.min.y,bed.min.z+(bed.max.z-bed.min.z)*z/4));
 }
 assert.ok(roleTriangles.fixed>0&&roleTriangles.owner>0,'faction cloth and fixed material must both exist');
 // The live kit uses simple chess silhouettes; the mounted study is shelved.
 assert.ok(roleTriangles.fixed+roleTriangles.owner<3000,'unit exceeds its geometry budget');
 const model=packUnitAsset(scene);assert.ok(model.contacts.length>=4,'need actual ground contacts');
 return {model,report:{...roleTriangles,height:bb.max.y,procedural:true,contacts:model.contacts.length}};
}
for(const name of unitExamples){
 const {model,report}=inspectAsset(name);assets[name]=model;assetReport[name]=report;
}
const familyReport={scholar:assetReport.greatPerson};
const familyShapes=new Set([Array.from(assets.greatPerson.fixed.attributes.position.array).join(',')]);
for(const family of Object.keys(greatPersonFamilies).filter(f=>f!=='scholar')){
 const {model,report}=inspectAsset('greatPerson',{family});familyReport[family]=report;
 // Family changes can reuse the staged pose only if the actual plinth
 // contact geometry is identical. Their role emblems must still differ.
 assert.deepEqual(model.contacts,assets.greatPerson.contacts,`${family} changed great-person ground support`);
 const shape=Array.from(model.fixed.attributes.position.array).join(',');
 assert.ok(!familyShapes.has(shape),`${family} has no distinct role geometry`);familyShapes.add(shape);
 for(const role of ['fixed','owner'])model[role].dispose();
}
let samples=0,hillPieces=0,maxClearance=0,wagonBedSamples=0;
for(const seed of [1,2,3]){
 const raw=generateMap(seed,'standard'),before=JSON.stringify(raw),map=prepareTerrainMap(raw),settlements=createSettlementPlan(map),plan=createUnitPlan(map,settlements,assets);
 assert.equal(JSON.stringify(raw),before,'unit preview must not change the actual map');
 assert.deepEqual(Object.keys(plan.byType).sort(),[...unitExamples].sort(),'missing an example on this seed');
 assert.equal(plan.entries.size,unitExamples.length,'examples must use distinct tiles');
 const repeat=createUnitPlan(map,settlements,assets);
 for(const piece of plan.entries.values()){
  const {type,tile,x,z,y,quaternion}=piece,again=repeat.byType[type],q=new Quaternion().fromArray(quaternion);
  assert.deepEqual([x,z,y,quaternion,tile.col,tile.row],[again.x,again.z,again.y,again.quaternion,again.tile.col,again.tile.row]);
  assert.ok(!tile.discovery&&!settlements.entries.get(tile)?.site&&!settlements.entries.get(tile)?.city,'unit fixture overlaps a landmark');
  if(tile.hills)hillPieces++;
  const [top,side]=terrainMesh(tile),mat=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(top,mat),ray=new Raycaster(),c=centre(tile);
  // Independent raycasts against visible terrain validate the real contact
  // points, including samples across the circular base, after pose fitting.
  for(const p of assets[type].contacts){
   const v=new Vector3(...p).applyQuaternion(q).add(new Vector3(c.x+x,y,c.z+z));
   ray.set(new Vector3(v.x,5,v.z),new Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];assert.ok(hit,'sole extends off the tile');
   const clearance=v.y-hit.point.y;assert.ok(clearance>=-.00002,`${type} sole intersects visible terrain: ${clearance}`);
   assert.ok(clearance<.037,`${type} floats above visible terrain: ${clearance}`);maxClearance=Math.max(maxClearance,clearance);samples++;
  }
  if(type==='trader'){
   for(const [kind,probes]of [['wheel',wagonWheels.flat()],['bed',wagonBed]])for(const p of probes){
    const v=p.clone().applyQuaternion(q).add(new Vector3(c.x+x,y,c.z+z));
    ray.set(new Vector3(v.x,5,v.z),new Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];assert.ok(hit,'wagon extends off the tile');
    const clearance=v.y-hit.point.y;assert.ok(clearance>=-.00002,`wagon ${kind} intersects terrain: ${clearance}`);
    if(kind==='wheel')assert.ok(clearance<.037,'caravan wheel floats above the terrain');
    else wagonBedSamples++;
   }
  }
  top.dispose();side.dispose();mat.dispose();
 }
}
assert.ok(hillPieces>=1,'review must include pieces on actual hill surfaces');
console.log(JSON.stringify({rosterIds:mapped.length,masters:unitExamples.length,seeds:3,terrainSamples:samples,wagonBedSamples,hillPieces,maxClearance,assets:assetReport,greatPersonFamilies:familyReport},null,2));
