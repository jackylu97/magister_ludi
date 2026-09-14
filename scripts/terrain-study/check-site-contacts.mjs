// CPU-only comparison of exact site contacts: no browser/GPU or game mutations.
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:`
import {createTileSurfaceSampler} from './src/render3d/paintedTileSurface';
import {prepareTerrainMap,centre} from './src/terrainStudy/surface.js';
import {terrainMesh} from './src/terrainStudy/terrainMesh.js';
import {createSiteLayout} from './src/terrainStudy/siteLayout.js';
import {createMap} from './src/sim/map';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function measure(){
 const map=createMap({width:12,height:12,terrain:'grassland'});
 for(const t of map.tiles)t.hills=true;
 const prepared=prepareTerrainMap(map,{wrap:true}),tile=prepared.tiles[7*12+7],c=centre(tile),parts=[];
 let target;
 for(let row=6;row<12;row++)for(let col=6;col<12;col++){
  const t=prepared.tiles[row*12+col],[top,side]=terrainMesh(t);side.dispose();
  parts.push(top);if(t===tile)target=top;
 }
 const geometry=mergeGeometries(parts),material=new MeshBasicMaterial(),mesh=new Mesh(geometry,material);
 mesh.updateMatrixWorld();const ray=new Raycaster();
 const world=(x,z)=>{ray.set(new Vector3(c.x+x,5,c.z+z),new Vector3(0,-1,0));return ray.intersectObject(mesh,false)[0]?.point.y??.12};
 const fast=createTileSurfaceSampler(target,c.x,c.z),local=(x,z)=>fast(x,z)??.12;
 let start=performance.now();const oldLayout=createSiteLayout(tile,'ruins',world);const worldMs=performance.now()-start;
 start=performance.now();const newLayout=createSiteLayout(tile,'ruins',local);const localMs=performance.now()-start;
 let error=0;
 if(oldLayout.pieces.length!==newLayout.pieces.length)throw new Error('Site composition changed');
 for(let i=0;i<oldLayout.pieces.length;i++)for(const key of ['x','y','z','bottom','scale','angle'])error=Math.max(error,Math.abs(oldLayout.pieces[i][key]-newLayout.pieces[i][key]));
 if(error>1e-6)throw new Error('Site contact changed: '+error);
 const result={chunkTiles:36,triangles:geometry.attributes.position.count/3,pieces:newLayout.pieces.length,worldRaycastSearchMs:worldMs,localTriangleSearchMs:localMs,speedup:worldMs/localMs,maxLayoutError:error};
 parts.forEach(g=>g.dispose());geometry.dispose();material.dispose();return result;
}` ,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {measure}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
console.log(JSON.stringify(measure(),null,2));
