import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';

/** Release a batch nobody will own, including requests that land later. */
async function releaseScenes(downloads){
 for(const result of await Promise.allSettled(downloads)){
  if(result.status!=='fulfilled')continue;
  const resources=new Set();
  result.value.scene.traverse(o=>{if(o.isMesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m)}});
  for(const resource of resources)resource.dispose();
 }
}

// Authored once in Blender. Each multi-material asset becomes one indexed,
// vertex-coloured mesh so the whole herd/building costs a single instance.
export async function loadSettlementAssets(paintedStyle,mineral,{names=['horse','cattle','bison','deer','elephant','beaver','house','temple','bell-tower','mine','camp','quarry','fishing-boat','resource-shrub','city-house','city-loggia','civic-sanctum','city-spire','city-dome','site-ruin-arch','site-ruin-column','site-ruin-fragment','site-hut','site-longhouse','site-antiquity','site-wreck','site-raider-tent','site-watchtower']}={}){
 const loader=new GLTFLoader(),unique=[...new Set(names)];
 // The kit's download needs no texture. Starting it before the grain resolves
 // is the whole of why the two batches overlap; the settled-batch ownership
 // rules below are unchanged. The idle `catch` only keeps a request that fails
 // before the batch is awaited from being reported as unhandled.
 const downloads=unique.map(name=>{const request=loader.loadAsync(`/terrain-study/settlements/${name}.glb`);request.catch(()=>{});return request});
 let mineralGrain;
 try{mineralGrain=await mineral}
 catch(error){await releaseScenes(downloads);throw error}
 const material=new T.MeshStandardMaterial({color:'white',vertexColors:true,flatShading:true,roughness:.94,metalness:0,bumpMap:mineralGrain,bumpScale:.003});
 paintedStyle.register(material);
 const assets={material};
 const loaded=await Promise.allSettled(downloads.map(async (download,index)=>{
  const name=unique[index];
  const {scene}=await download;scene.updateMatrixWorld(true);
  const pieces=[];let geometry;
  try {
  scene.traverse(o=>{
   if(!o.isMesh)return;
   const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();pieces.push(g);g.applyMatrix4(o.matrixWorld);
   const p=g.attributes.position,color=new Float32Array(p.count*3),uv=new Float32Array(p.count*2),pigment=o.material.color.clone();
   // The reference horses are small, warm chestnut accents in the landscape.
   // Recolour coat and mane separately, retaining the sculpt's material masks.
   if(name==='horse'){
    if(o.material.name==='Chestnut coat')pigment.set('#bd713c');
    if(o.material.name==='Mane and hooves')pigment.set('#70503a');
   }
   for(let i=0;i<p.count;i++){
    color.set([pigment.r,pigment.g,pigment.b],i*3);uv[i*2]=(p.getX(i)+p.getZ(i)*.37)*2;uv[i*2+1]=(p.getY(i)+p.getZ(i)*.23)*2;
   }
   for(const key of Object.keys(g.attributes))if(!['position','normal'].includes(key))g.deleteAttribute(key);
   g.setAttribute('color',new T.BufferAttribute(color,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));
  });
  geometry=mergeGeometries(pieces);if(!geometry)throw new Error(`No settlement geometry: ${name}`);indexGeometry(geometry);
  assets[name]=geometry;
  }catch(error){geometry?.dispose();throw error}
  finally{
   pieces.forEach(g=>g.dispose());
   const resources=new Set();scene.traverse(o=>{if(o.isMesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m)}});
   for(const resource of resources)resource.dispose();
  }
 }));
 // Wait for late downloads before releasing a failed batch. Ownership of a
 // partial kit never escapes to a renderer that could leave it allocated.
 const failed=loaded.find(result=>result.status==='rejected');
 if(failed){for(const resource of Object.values(assets))resource.dispose();throw failed.reason}
 return assets;
}
