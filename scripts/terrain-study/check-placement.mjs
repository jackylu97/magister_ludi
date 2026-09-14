// Independent raycasts through the final road/border meshes and source hills.
// Run: node scripts/terrain-study/check-placement.mjs
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3,Color} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const compiled=await build({stdin:{contents:`export {generateMap} from './src/sim/mapgen';export {prepareTerrainMap,isWater} from './src/terrainStudy/surface.js';export {terrainMesh} from './src/terrainStudy/terrainMesh.js';export {createTerritoriesPlan} from './src/terrainStudy/territoryPlan.js';export {createTerritoryStudy} from './src/terrainStudy/territoryStudy.js';export {createPlacementArt} from './src/terrainStudy/placementArt.js';export {createSettlementPlan} from './src/terrainStudy/settlementPlan.js';export {createRoadPlan} from './src/terrainStudy/roadPlan.js';export {createUnitPlan} from './src/terrainStudy/unitPlan.js';export {packUnitAsset} from './src/terrainStudy/unitAssets.js';export {createPrimitiveUnitScene} from './src/terrainStudy/primitiveUnitModels.js';export {unitExamples} from './src/terrainStudy/unitCatalog.js';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {generateMap,prepareTerrainMap,isWater,terrainMesh,createTerritoriesPlan,createTerritoryStudy,createPlacementArt,createSettlementPlan,createRoadPlan,createUnitPlan,packUnitAsset,createPrimitiveUnitScene,unitExamples}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const material=new MeshBasicMaterial({side:DoubleSide}),ray=new Raycaster(),reports=[];
const assets=Object.fromEntries(unitExamples.map(type=>[type,packUnitAsset(createPrimitiveUnitScene(type))]));
for(const seed of [1,2,3])for(const withUnits of [false,true]){
 const raw=generateMap(seed,'standard'),before=JSON.stringify(raw),map=prepareTerrainMap(raw);
 const settlement=createSettlementPlan(map),units=withUnits?createUnitPlan(map,settlement,assets):undefined,roads=createRoadPlan(map,settlement,units),territory=createTerritoriesPlan(map,createTerritoryStudy(map,roads.ownedTiles).territories),art=createPlacementArt(roads,territory,material);
 assert.equal(JSON.stringify(raw),before,'placement fixture mutated game data');
 assert.ok(roads.paths.length&&territory.loops.length,'empty placement review');
 const surfaces=[],paint=[];
 for(const t of art.tiles){
  assert.ok(!isWater(t),'placement geometry must stay on land');
  const [top,side]=terrainMesh(t);side.dispose();surfaces.push(top);
  art.tile(t,top,{push:(_,g)=>paint.push(g)});
 }
 const groundGeometry=mergeGeometries(surfaces),paintGeometry=mergeGeometries(paint);
 const ground=new Mesh(groundGeometry,material),marks=new Mesh(paintGeometry,material);
 const probe=(x,z)=>{ray.set(new Vector3(x,6,z),new Vector3(0,-1,0));return [ray.intersectObject(ground)[0],ray.intersectObject(marks)[0]]};
 let samples=0,hillSamples=0,borderSamples=0,maxError=0;
 for(const path of roads.paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],steps=Math.max(2,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.09));
  for(let j=0;j<=steps;j++){
   const f=j/steps,[g,m]=probe(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);
   assert.ok(g&&m,`seed ${seed}: road hole at ${i},${j}`);
   const error=Math.abs(m.point.y-g.point.y-.019);maxError=Math.max(maxError,error);
   assert.ok(error<.00008,`seed ${seed}: road floating/clipping by ${error}`);
   if(g.point.y>.16)hillSamples++;samples++;
  }
 }
 // Sample every strip's centre rather than only its vertices. This catches
 // missing strips and ground clipping, including concave territorial turns.
 const colourSamples={};
 for(const owner of territory.territories)for(const band of owner.bands){
  const expected=new Color(band.color);let visible=0;
  for(const polygon of band.polygons){
   const x=polygon.reduce((s,p)=>s+p[0],0)/polygon.length,z=polygon.reduce((s,p)=>s+p[1],0)/polygon.length;
   const [g,m]=probe(x,z);assert.ok(g&&m,`seed ${seed}: gap in territorial boundary`);
   const clearance=m.point.y-g.point.y;
   assert.ok(clearance>.0128&&clearance<.0192,'territory is not fitted to the terrain');borderSamples++;
   // A crossing road deliberately covers the border. Else the fitted mesh
   // must carry this band's own colour through the shared vertex-colour batch.
   if(clearance<.015){
    const actual=new Color().fromBufferAttribute(paintGeometry.attributes.color,m.face.a);
    assert.ok(Math.max(Math.abs(actual.r-expected.r),Math.abs(actual.g-expected.g),Math.abs(actual.b-expected.b))<1e-6,'incorrect colour on paired border');
    visible++;
   }
  }
  assert.ok(visible>0,`seed ${seed}: ${band.color} band is entirely missing`);
  colourSamples[band.color]=visible;
 }
 assert.ok(hillSamples>0,'review must exercise sloped road surfaces');
 assert.ok(Array.from(paintGeometry.attributes.position.array).every(Number.isFinite));
 reports.push({seed,withUnits,roadPaths:roads.paths.length,markedTiles:art.tiles.size,roadSamples:samples,hillSamples,borderSamples,colourSamples,maxError,markTriangles:paintGeometry.attributes.position.count/3});
 [...surfaces,...paint,groundGeometry,paintGeometry].forEach(g=>g.dispose());
}
for(const model of Object.values(assets))for(const role of ['fixed','owner'])model[role].dispose();
material.dispose();console.log(JSON.stringify(reports,null,2));
