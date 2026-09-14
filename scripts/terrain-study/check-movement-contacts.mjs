// Exact movement-height query comparison. CPU only; no game commands or saves.
import {build} from 'esbuild';
const compiled = await build({stdin: {contents: `
import {createMap} from './src/sim/map';
import {prepareTerrainMap,centre} from './src/terrainStudy/surface.js';
import {terrainMesh} from './src/terrainStudy/terrainMesh.js';
import {installPaintedSurface,samplePaintedWorld,uninstallPaintedSurface} from './src/render3d/paintedSurface';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function measure(){
 const map=createMap({width:12,height:12,terrain:'grassland'});
 for(const t of map.tiles)t.hills=true;
 const prepared=prepareTerrainMap(map,{wrap:true}),parts=[];
 for(let row=6;row<12;row++)for(let col=6;col<12;col++){
   const [top,side]=terrainMesh(prepared.tiles[row*12+col]);side.dispose();parts.push(top);
 }
 const geometry=mergeGeometries(parts), material=new MeshBasicMaterial(),mesh=new Mesh(geometry,material);
 mesh.updateMatrixWorld();installPaintedSurface(map,prepared,[mesh]);
 const c=centre(prepared.tiles[7*12+7]), points=Array.from({length:240},(_,i)=>[c.x+(i%24)/23*1.73,c.z+(Math.floor(i/24)-4.5)*.035]);
 const ray=new Raycaster(),start=performance.now();
 const original=points.map(([x,z])=>{ray.set(new Vector3(x,5,z),new Vector3(0,-1,0));return ray.intersectObject(mesh,false)[0]?.point.y;});
 const raycastMs=performance.now()-start;
 let at=performance.now();const cold=points.map(([x,z])=>samplePaintedWorld(map,x,z));const indexedColdMs=performance.now()-at;
 at=performance.now();const warm=points.map(([x,z])=>samplePaintedWorld(map,x,z));const indexedWarmMs=performance.now()-at;
 let maxError=0;
 for(let i=0;i<points.length;i++){
  if(original[i]===undefined){if(cold[i]!==undefined||warm[i]!==undefined)throw new Error('Unexpected terrain contact');}
  else {if(cold[i]===undefined||warm[i]===undefined)throw new Error('Missing terrain contact');maxError=Math.max(maxError,Math.abs(original[i]-cold[i]),Math.abs(original[i]-warm[i]));}
 }
 if(maxError>1e-6)throw new Error('Surface changed: '+maxError);
 const result={samples:points.length,chunkTiles:36,triangles:geometry.attributes.position.count/3,raycastMs,indexedColdMs,indexedWarmMs,maxHeightError:maxError};
 uninstallPaintedSurface(map);parts.forEach(g=>g.dispose());geometry.dispose();material.dispose();return result;
}`, resolveDir: process.cwd(), loader:'ts'}, bundle:true,write:false,platform:'node',format:'esm'});
const {measure}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
console.log(JSON.stringify(measure(),null,2));
