// Graph and wet-edge invariants; check-placement.mjs verifies the rendered fit.
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const compiled=await build({stdin:{contents:`
 export {generateMap} from './src/sim/mapgen';
 export {prepareTerrainMap,centre,neighbour,isWater} from './src/terrainStudy/surface.js';
 export {createSettlementPlan} from './src/terrainStudy/settlementPlan.js';
 export {createRoadPlan} from './src/terrainStudy/roadPlan.js';
 export {createUnitPlan} from './src/terrainStudy/unitPlan.js';
 export {packUnitAsset} from './src/terrainStudy/unitAssets.js';
 export {createPrimitiveUnitScene} from './src/terrainStudy/primitiveUnitModels.js';
 export {unitExamples} from './src/terrainStudy/unitCatalog.js';
`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {generateMap,prepareTerrainMap,centre,neighbour,isWater,createSettlementPlan,createRoadPlan,createUnitPlan,packUnitAsset,createPrimitiveUnitScene,unitExamples}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const assets=Object.fromEntries(unitExamples.map(type=>[type,packUnitAsset(createPrimitiveUnitScene(type))]));
const coordinate=p=>p.map(v=>v.toFixed(7)).join(','),report=[];
let sampledPoints=0,asymmetricEdges=0;
function locate(map,x,z){
 let selected,best=Infinity;
 const row=Math.round(z/1.5);
 for(let r=row-1;r<=row+1;r++){
  const col=Math.round(x/Math.sqrt(3)-(r%2)*.5);
  for(let c=col-1;c<=col+1;c++){
   if(r<0||r>=map.height||c<0||c>=map.width)continue;
   const t=map.tiles[r*map.width+c],p=centre(t),d=(p.x-x)**2+(p.z-z)**2;
   if(d<best){best=d;selected=t}
  }
 }
 return selected;
}
function verify(map,settlements,units,roads){
 const adjacency=new Map(),edges=new Set(),crossings=[];
 for(const path of roads.paths){
  assert.ok(path.length>=2);
  for(const p of path)assert.ok(p.length===2&&p.every(Number.isFinite));
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],ka=coordinate(a),kb=coordinate(b),edge=[ka,kb].sort().join(':');
   assert.notEqual(ka,kb,'zero-length segment');assert.ok(!edges.has(edge),'duplicate segment');edges.add(edge);
   if(!adjacency.has(ka))adjacency.set(ka,new Set());if(!adjacency.has(kb))adjacency.set(kb,new Set());
   adjacency.get(ka).add(kb);adjacency.get(kb).add(ka);
   let previous;
   const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.035);
   for(let j=0;j<=steps;j++){
    const u=j/steps,t=locate(map,a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u);
    assert.ok(t&&!isWater(t)&&t.terrain!=='mountain'&&t.feature!=='oasis','road crosses impassable terrain');
    assert.ok(!t.discovery&&!settlements.entries.get(t)?.site&&!units.entries.has(t),'road intersects a staged piece/site tile');
    if(previous&&previous!==t){
     const direction=Array.from({length:6},(_,d)=>d).find(d=>neighbour(previous,map,d)===t);
     assert.notEqual(direction,undefined,'road jumps a tile');
     assert.ok(!((previous.riverEdges||0)&(1<<direction))&&!((t.riverEdges||0)&(1<<((direction+3)%6))),'road crosses a river edge');
     crossings.push([previous,t,direction]);
    }
    previous=t;sampledPoints++;
   }
  }
 }
 assert.ok(adjacency.size>0,'missing network');
 const visited=new Set(),queue=[adjacency.keys().next().value];
 for(let i=0;i<queue.length;i++){
  const key=queue[i];if(visited.has(key))continue;visited.add(key);queue.push(...adjacency.get(key));
 }
 assert.equal(visited.size,adjacency.size,'disconnected road network');
 assert.ok([...adjacency.values()].some(n=>n.size>=3),'missing junction proof');
 const ownedVisited=new Set([settlements.sites.city]),ownedQueue=[settlements.sites.city];
 for(let i=0;i<ownedQueue.length;i++)for(let d=0;d<6;d++){
  const n=neighbour(ownedQueue[i],map,d);if(!roads.ownedTiles.has(n)||ownedVisited.has(n))continue;
  assert.ok(!isWater(n),'territory fixture owns water');ownedVisited.add(n);ownedQueue.push(n);
 }
 assert.equal(ownedVisited.size,roads.ownedTiles.size,'disconnected territory');
 return {segments:edges.size,crossings};
}
for(const seed of [1,2,3]){
 const raw=generateMap(seed,'standard'),rawBefore=JSON.stringify(raw),map=prepareTerrainMap(raw),settlements=createSettlementPlan(map),units=createUnitPlan(map,settlements,assets),before=JSON.stringify(map);
 const roads=createRoadPlan(map,settlements,units),stats=verify(map,settlements,units,roads);
 assert.deepEqual(roads.paths,createRoadPlan(map,settlements,units).paths,'unstable graph');
 assert.equal(JSON.stringify(map),before,'road fixture changes terrain');assert.equal(JSON.stringify(raw),rawBefore,'road fixture changes game data');
 for(const name of ['farm','hillFarm','mine','camp','pasture'])assert.ok(roads.tiles.has(settlements.sites[name]),`missing reachable ${name}`);
 for(const [name,x,z]of [['camp',-.17,.65],['mine',.06,.60],['pasture',0,.63]]){
  const c=centre(settlements.sites[name]);
  assert.ok(roads.paths.some(path=>path.some(p=>Math.hypot(p[0]-c.x-x,p[1]-c.z-z)<.00001)),`${name} road stops away from its yard/gate`);
 }
 assert.deepEqual(roads.inaccessible,[],'standard seed has inaccessible required examples');
 assert.ok(roads.review.hill?.hills,'missing hill review');
 if(seed===1){
  // A river recorded by either participant must block the same crossing. Add
  // it to a real used non-city edge, independently on each side, then reroute.
  const [a,b,d]=stats.crossings.find(([a,b])=>a!==settlements.sites.city&&b!==settlements.sites.city);
  for(const [t,bit]of [[a,d],[b,(d+3)%6]]){
   const old=t.riverEdges;t.riverEdges=(old||0)|(1<<bit);
   verify(map,settlements,units,createRoadPlan(map,settlements,units));
   t.riverEdges=old;asymmetricEdges++;
  }
 }
 report.push({seed,paths:roads.paths.length,segments:stats.segments,tiles:roads.tiles.size,territory:roads.ownedTiles.size});
}
for(const asset of Object.values(assets))for(const role of ['fixed','owner'])asset[role].dispose();
console.log(JSON.stringify({maps:report,sampledPoints,asymmetricEdges},null,2));
