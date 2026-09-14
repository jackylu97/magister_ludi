// Run from the repository root: node scripts/terrain-study/check-performance.mjs
// CPU-side invariants for the optimized preview; no server or GPU required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BufferAttribute,PlaneGeometry,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {build} from 'esbuild';
import {indexGeometry} from '../../src/terrainStudy/indexGeometry.js';
import {prepareTerrainMap,centre,isWater} from '../../src/terrainStudy/surface.js';
import {terrainMesh} from '../../src/terrainStudy/terrainMesh.js';
import {createTerrainPainter} from '../../src/terrainStudy/terrainPigment.js';
import {createWaterPainter} from '../../src/terrainStudy/waterPigment.js';
const compiled=await build({entryPoints:['src/sim/mapgen.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {generateMap}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

{
let beforeBytes=0,afterBytes=0,beforeVertices=0,afterVertices=0,count=0;
function verify(g){
 const original=g.clone(),p=g.attributes.position.count;
 beforeVertices+=p;beforeBytes+=Object.values(g.attributes).reduce((s,a)=>s+a.array.byteLength,0);
 indexGeometry(g);afterVertices+=g.attributes.position.count;afterBytes+=Object.values(g.attributes).reduce((s,a)=>s+a.array.byteLength,0)+(g.index?.array.byteLength||0);count++;
 assert.equal(g.index?.count??g.attributes.position.count,p);
 for(const [name,a]of Object.entries(original.attributes)){
  const actual=g.attributes[name];assert.equal(actual.normalized,a.normalized);
  const bits=a.array instanceof Float32Array?new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length):a.array;
  const got=actual.array instanceof Float32Array?new Uint32Array(actual.array.buffer,actual.array.byteOffset,actual.array.length):actual.array;
  for(let i=0;i<p;i++)for(let j=0;j<a.itemSize;j++)assert.equal(got[(g.index?.getX(i)??i)*a.itemSize+j],bits[i*a.itemSize+j],name+' changed');
 }
 const snapshot=g.clone();assert.equal(indexGeometry(g),g);assert.deepEqual(g.index?.array,snapshot.index?.array);
 original.dispose();snapshot.dispose();g.dispose();
}
// High-sharing grid exercises collisions and uint32 index selection.
verify(new PlaneGeometry(20,20,270,270).toNonIndexed());
// Coincident positions with distinct normals/colours/shader weights cannot weld.
const split=new PlaneGeometry(1,1).toNonIndexed();split.setAttribute('color',new BufferAttribute(new Float32Array(18).map((_,i)=>i<9?.2:.8),3));split.setAttribute('rangeFoot',new BufferAttribute(new Float32Array([0,0,0,1,1,1]),1));verify(split);
for(const name of ['grove-sculpt-0','cypress-sculpt-0','escarpment-0','limestone']){
 const b=fs.readFileSync(`public/terrain-study/${name}.glb`),asset=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 asset.scene.traverse(o=>{if(o.isMesh)verify(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone())});
}
const map=prepareTerrainMap(generateMap(1,'standard')),paint=createTerrainPainter(map),water=createWaterPainter(map);
for(const tile of map.tiles.filter((t,i)=>i%29===0||t.terrain==='lake').slice(0,100)){
 const [top,side]=terrainMesh(tile);if(['coast','ocean','lake'].includes(tile.terrain))water.paint(top);else paint.paint(top,tile);verify(top);verify(side);
}
console.log(JSON.stringify({geometries:count,beforeVertices,afterVertices,beforeBytes,afterBytes,checks:'Every attribute recovered bit-for-bit in original triangle order; colour/normal/shader boundaries preserved; index types, collisions, idempotency; real terrain, water and GLB assets.'},null,2));
}

{
let trianglesNear=0,trianglesFar=0,maxHeightError=0,checked=0;
for(const seed of [1,2,3]){
 const map=prepareTerrainMap(generateMap(seed,'standard')),raw=JSON.stringify(map.tiles.map(t=>[t.terrain,t.hills,t.feature,t.riverEdges]));
 const sample=map.tiles.filter((t,i)=>!isWater(t)&&(i%31===0||t.riverEdges&&i%7===0)).slice(0,100);
 for(const tile of sample){
  const [near,nearSide]=terrainMesh(tile),[far,farSide]=terrainMesh(tile,{distant:true});
  assert.deepEqual(farSide.attributes.position.array,nearSide.attributes.position.array,'shore/riverside contour changed');
  const from=near.userData.plateVertexCount,to=far.userData.plateVertexCount;
  assert.deepEqual(near.attributes.position.array.slice(from*3),far.attributes.position.array.slice(to*3),'hill faces changed');
  const a=new Mesh(near,new MeshBasicMaterial()),b=new Mesh(far,new MeshBasicMaterial()),ray=new Raycaster(),c=centre(tile);
  for(let i=0;i<12;i++){
   const ang=i*2.39,r=.2+(i%4)*.14;
   ray.set(new Vector3(c.x+Math.cos(ang)*r,5,c.z+Math.sin(ang)*r),new Vector3(0,-1,0));
   const ah=ray.intersectObject(a)[0],bh=ray.intersectObject(b)[0];
   assert.equal(!!ah,!!bh,'footprint changed');
   if(ah&&bh){const error=Math.abs(ah.point.y-bh.point.y);assert.ok(error<.015,JSON.stringify({error,terrain:tile.terrain,feature:tile.feature,col:tile.col,row:tile.row}));maxHeightError=Math.max(error,maxHeightError);checked++;}
  }
  trianglesNear+=near.attributes.position.count/3;trianglesFar+=far.attributes.position.count/3;
  near.dispose();far.dispose();nearSide.dispose();farSide.dispose();a.material.dispose();b.material.dispose();
 }
 assert.equal(raw,JSON.stringify(map.tiles.map(t=>[t.terrain,t.hills,t.feature,t.riverEdges])));
}
console.log(JSON.stringify({seeds:3,surfaceSamples:checked,trianglesNear,trianglesFar,maxHeightError,checks:'identical bank contours and all hill-face positions; ground coverage and elevation within tolerance; game data unchanged'},null,2));
}
