import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';

// The authored kit, in the order the renderer indexes it: three broadleaves,
// two cypresses, three escarpments, then the limestone block. `family` is the
// name the distance sheet calls a group of them by; it is not in the bundle,
// which indexes by `name` alone.
export const VEGETATION_SPECIES=[
 ...[0,1,2].map(i=>({name:`grove-sculpt-${i}`,evergreen:false,rock:false,family:'groves'})),
 ...[0,1].map(i=>({name:`cypress-sculpt-${i}`,evergreen:true,rock:false,family:'groves'})),
 ...[0,1,2].map(i=>({name:`escarpment-${i}`,evergreen:false,rock:true,family:'escarpments'})),
 {name:'limestone',evergreen:false,rock:true,family:'stones'},
];

// Everything the kit needs doing to it is a pure function of the GLB bytes, so
// `scripts/terrain-study/build_asset_bundle.mjs` runs it once and ships the
// result. The runtime keeps this path as the fallback for a missing or
// out-of-date bundle, and it is the definition the bundle is pinned against.
export const VEGETATION_BUNDLE_VERSION='vegetation-1';
export const VEGETATION_BUNDLE_URL=`/terrain-study/asset-bundle/${VEGETATION_BUNDLE_VERSION}.bundle`;
const BUNDLE_MAGIC='MLAB';

/**
 * Expand one authored scene into the renderer's own attributes: pigment baked
 * against the sculpt's cavity shading, a world-projected UV, and the canopy
 * weight the breeze shader reads. Disposes the GLB's own objects and every
 * temporary; only the returned geometry survives.
 */
export function bakeVegetationScene(scene,{name,evergreen=false}){
 const parts=[],temporary=new Set();
 try {
  scene.updateMatrixWorld(true);
  scene.traverse(object=>{
   if(!object.isMesh)return;
   let geometry=object.geometry.clone();temporary.add(geometry);
   if(geometry.index){const indexed=geometry;geometry=geometry.toNonIndexed();temporary.add(geometry);indexed.dispose();temporary.delete(indexed)}
   geometry.applyMatrix4(object.matrixWorld);
   const pigment=object.material.color.clone(),foliage=object.material.name.startsWith('leaf');
   if(foliage)pigment.set(evergreen?'#356d59':['#5e863c','#739744','#8da751','#628449'][parseInt(object.material.name.slice(4),10)%4]);
   const p=geometry.attributes.position,cavity=geometry.getAttribute('color');
   const colors=new Float32Array(p.count*3),uv=new Float32Array(p.count*2);
   for(let i=0;i<p.count;i++){
    const ao=cavity?.getX(i)??1,shade=.62+.38*ao;
    colors.set([pigment.r*shade,pigment.g*shade,pigment.b*shade],i*3);
    uv[i*2]=(p.getX(i)+p.getZ(i)*.61)*.45;uv[i*2+1]=(p.getY(i)+p.getZ(i)*.37)*.45;
   }
   for(const key of Object.keys(geometry.attributes))if(!['position','normal'].includes(key))geometry.deleteAttribute(key);
   geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setAttribute('canopyWeight',new T.Float32BufferAttribute(new Float32Array(p.count).fill(foliage?1:0),1));parts.push(geometry);
  });
  const geometry=mergeGeometries(parts);
  if(!geometry)throw new Error(`Cannot merge vegetation asset ${name}`);
  try {
   // Reuse the main fracture blocks for low shoulders, omitting the tiny
   // rubble already sculpted around the full summit asset.
   const shoulderParts=name.startsWith('escarpment')?parts.filter(g=>{g.computeBoundingBox();return g.boundingBox.max.y-g.boundingBox.min.y>.62}):[];
   const shoulderGeometry=shoulderParts.length?mergeGeometries(shoulderParts):null;
   return {geometry,shoulderGeometry};
  }catch(error){geometry.dispose();throw error}
 }finally{
  for(const geometry of temporary)geometry.dispose();
  // Each GLB owns these source objects; its baked output has independent
  // geometry and the three shared study materials above.
  const source=new Set();
  scene.traverse(object=>{
   if(!object.isMesh)return;
   source.add(object.geometry);
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    source.add(material);
    for(const {value} of Object.values(Object.getOwnPropertyDescriptors(material)))if(value?.isTexture)source.add(value);
   }
  });
  for(const resource of source)resource.dispose();
 }
}

/**
 * The two whole-kit passes: the range-foot weight the mountain pigment shader
 * mixes on, and the weld. Both depend only on the baked geometry, so the build
 * script and the fallback run exactly this and agree byte for byte.
 */
export function finishVegetation({broadleaves,cypresses,escarpments,limestone},{indexed=true}={}){
 for(const [geometry,shoulder]of [...escarpments.flatMap(asset=>[[asset.geometry,false],[asset.shoulderGeometry,true]]),[limestone.geometry,true]]){
  if(!geometry)continue;
  geometry.computeBoundingBox();
  const p=geometry.attributes.position,n=geometry.attributes.normal,weights=new Float32Array(p.count),height=geometry.boundingBox.max.y;
  for(let i=0;i<p.count;i+=3){
   const y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/(3*height);
   const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
   const cut=(shoulder?.32:.19)+.055*Math.sin(x*9+z*6),up=n.getY(i)>.24;
   const weight=Math.max(geometry===limestone.geometry?.46:0,y<cut?(shoulder?.90:.74):y<(shoulder?.62:.38)&&up?(shoulder?.68:.49):0);
   weights.fill(weight,i,i+3);
  }
  geometry.setAttribute('rangeFoot',new T.BufferAttribute(weights,1));
 }
 if(indexed)for(const asset of [...broadleaves,...cypresses,...escarpments,limestone]){
  indexGeometry(asset.geometry);
  if(asset.shoulderGeometry)indexGeometry(asset.shoulderGeometry);
 }
}

/**
 * One sculpt's stand-in at map scale, derived from the sculpt itself.
 *
 * At the overview a grove stands a few pixels tall and the authored crown spends
 * six hundred triangles on facets nobody can resolve. Clustering keeps what
 * survives that scale and drops the rest: the sculpt's own bounding box is cut
 * into a coarse grid, every vertex collapses to its cell's average, a triangle
 * whose corners land in fewer than three cells has collapsed to nothing, and the
 * survivors are stretched back over the original box — an inset crown would read
 * as fewer trees, and thinning the forests is exactly the change this may not
 * make.
 *
 * Every attribute but the normal is averaged with its cell, so the pigment, the
 * canopy weight the breeze reads and the range-foot weight the mountain pigment
 * mixes on all arrive meaning what they meant; normals are recomputed flat,
 * which is what these materials wanted anyway. The original facing decides the
 * survivor's winding, because averaged corners can turn a face inside out and a
 * hole in a crown reads at any scale.
 *
 * Derived, not authored: the bundle ships one artefact and the GLB fallback
 * produces the same stand-in from the same bytes, so there is nothing here that
 * can go stale.
 */
export function farSculpt(geometry,{x=2,y=3,z=2}={}){
 const p=geometry.attributes.position;
 if(!p?.count)return null;
 geometry.computeBoundingBox();
 const box=geometry.boundingBox,low=[box.min.x,box.min.y,box.min.z];
 const span=[box.max.x-box.min.x,box.max.y-box.min.y,box.max.z-box.min.z].map(v=>Math.max(1e-6,v));
 const grid=[x,y,z].map(v=>Math.max(1,Math.round(v))),cells=grid[0]*grid[1]*grid[2];
 const names=Object.keys(geometry.attributes).filter(name=>name!=='normal');
 const sums=Object.fromEntries(names.map(name=>[name,new Float64Array(cells*geometry.attributes[name].itemSize)]));
 const tally=new Uint32Array(cells),cellOf=new Uint32Array(p.count);
 for(let i=0;i<p.count;i++){
  let cell=0;
  for(let a=0;a<3;a++){
   const v=a===0?p.getX(i):a===1?p.getY(i):p.getZ(i);
   cell=cell*grid[a]+Math.min(grid[a]-1,Math.max(0,Math.floor((v-low[a])/span[a]*grid[a])));
  }
  cellOf[i]=cell;tally[cell]++;
  for(const name of names){
   const attribute=geometry.attributes[name],size=attribute.itemSize;
   for(let j=0;j<size;j++)sums[name][cell*size+j]+=attribute.array[i*size+j];
  }
 }
 for(const name of names){
  const size=geometry.attributes[name].itemSize;
  for(let cell=0;cell<cells;cell++)if(tally[cell])for(let j=0;j<size;j++)sums[name][cell*size+j]/=tally[cell];
 }
 const at=sums.position,reach=[[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]];
 for(let cell=0;cell<cells;cell++)if(tally[cell])for(let a=0;a<3;a++){
  const v=at[cell*3+a];if(v<reach[a][0])reach[a][0]=v;if(v>reach[a][1])reach[a][1]=v;
 }
 for(let a=0;a<3;a++){
  const have=reach[a][1]-reach[a][0],scale=have>1e-6?span[a]/have:1;
  for(let cell=0;cell<cells;cell++)if(tally[cell])at[cell*3+a]=low[a]+(at[cell*3+a]-reach[a][0])*scale;
 }
 const index=geometry.index?.array,corners=index?index.length:p.count,faces=new Map();
 const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3(),edge=new T.Vector3(),other=new T.Vector3(),normal=new T.Vector3();
 const place=(cell,out)=>out.set(at[cell*3],at[cell*3+1],at[cell*3+2]);
 const source=(i,out)=>out.set(p.getX(i),p.getY(i),p.getZ(i));
 for(let i=0;i<corners;i+=3){
  const ia=index?index[i]:i,ib=index?index[i+1]:i+1,ic=index?index[i+2]:i+2;
  const a=cellOf[ia],b=cellOf[ib],c=cellOf[ic];
  if(a===b||b===c||a===c)continue;
  const key=[a,b,c].sort((m,n)=>m-n).join(',');
  let face=faces.get(key);
  if(!face)faces.set(key,face={a,b,c,nx:0,ny:0,nz:0});
  source(ia,va);source(ib,vb);source(ic,vc);
  edge.subVectors(vb,va);other.subVectors(vc,va);normal.crossVectors(edge,other);
  face.nx+=normal.x;face.ny+=normal.y;face.nz+=normal.z;
 }
 const kept=[];
 for(const face of faces.values()){
  place(face.a,va);place(face.b,vb);place(face.c,vc);
  edge.subVectors(vb,va);other.subVectors(vc,va);normal.crossVectors(edge,other);
  if(normal.lengthSq()<1e-16)continue;
  const flipped=normal.x*face.nx+normal.y*face.ny+normal.z*face.nz<0;
  if(flipped)normal.negate();
  normal.normalize();
  kept.push({cells:flipped?[face.a,face.c,face.b]:[face.a,face.b,face.c],normal:normal.clone()});
 }
 if(!kept.length)return null;
 const far=new T.BufferGeometry(),count=kept.length*3;
 const normals=new Float32Array(count*3);
 for(const name of names){
  const size=geometry.attributes[name].itemSize,array=new Float32Array(count*size);
  kept.forEach((face,f)=>face.cells.forEach((cell,corner)=>{
   for(let j=0;j<size;j++)array[(f*3+corner)*size+j]=sums[name][cell*size+j];
  }));
  far.setAttribute(name,new T.BufferAttribute(array,size));
 }
 kept.forEach((face,f)=>{for(let corner=0;corner<3;corner++)normals.set([face.normal.x,face.normal.y,face.normal.z],(f*3+corner)*3)});
 far.setAttribute('normal',new T.BufferAttribute(normals,3));
 far.computeBoundingBox();far.computeBoundingSphere();
 // The stand-in answers to the sculpt's name, so a submission attributed at the
 // overview says which sculpt it stood in for and that it stood in at all.
 if(geometry.userData.paintedAsset)far.userData.paintedAsset=`${geometry.userData.paintedAsset} far`;
 return indexGeometry(far);
}

const ARRAYS={Float32Array,Uint32Array,Uint16Array,Uint8Array,Int16Array,Int8Array};

/** One file: a JSON header naming every buffer, then the buffers themselves. */
export function describeVegetationBundle(assets){
 const species=[],chunks=[];let offset=0;
 const put=array=>{
  const padding=(4-(offset%4))%4;
  if(padding){chunks.push(new Uint8Array(padding));offset+=padding}
  const at=offset,bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
  chunks.push(bytes);offset+=bytes.byteLength;
  return {type:array.constructor.name,byteOffset:at,count:array.length};
 };
 const describe=geometry=>{
  if(!geometry)return null;
  const attributes={};
  for(const [name,attribute]of Object.entries(geometry.attributes))
   attributes[name]={itemSize:attribute.itemSize,normalized:attribute.normalized,...put(attribute.array)};
  const box=geometry.boundingBox;
  return {attributes,index:geometry.index?put(geometry.index.array):null,
   boundingBox:box?{min:box.min.toArray(),max:box.max.toArray()}:null};
 };
 const ordered=[...assets.broadleaves,...assets.cypresses,...assets.escarpments,assets.limestone];
 for(const [i,asset]of ordered.entries())
  species.push({name:VEGETATION_SPECIES[i].name,rock:VEGETATION_SPECIES[i].rock,
   geometry:describe(asset.geometry),shoulderGeometry:describe(asset.shoulderGeometry)});
 return {header:{version:VEGETATION_BUNDLE_VERSION,species},chunks,bytes:offset};
}

export function readVegetationBundle(buffer){
 const view=new DataView(buffer);
 if(String.fromCharCode(view.getUint8(0),view.getUint8(1),view.getUint8(2),view.getUint8(3))!==BUNDLE_MAGIC)throw new Error('not an asset bundle');
 const headerBytes=view.getUint32(4,true),dataAt=8+headerBytes+((4-((8+headerBytes)%4))%4);
 const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,headerBytes)));
 if(header.version!==VEGETATION_BUNDLE_VERSION)throw new Error(`asset bundle is ${header.version}, renderer wants ${VEGETATION_BUNDLE_VERSION}`);
 if(header.species.length!==VEGETATION_SPECIES.length)throw new Error('asset bundle species count differs');
 const build=description=>{
  if(!description)return null;
  const geometry=new T.BufferGeometry();
  for(const [name,a]of Object.entries(description.attributes)){
   const Array_=ARRAYS[a.type];if(!Array_)throw new Error(`asset bundle attribute type ${a.type}`);
   geometry.setAttribute(name,new T.BufferAttribute(new Array_(buffer,dataAt+a.byteOffset,a.count),a.itemSize,a.normalized));
  }
  if(description.index){
   const Array_=ARRAYS[description.index.type];if(!Array_)throw new Error(`asset bundle index type ${description.index.type}`);
   geometry.setIndex(new T.BufferAttribute(new Array_(buffer,dataAt+description.index.byteOffset,description.index.count),1));
  }
  if(description.boundingBox)geometry.boundingBox=new T.Box3(new T.Vector3(...description.boundingBox.min),new T.Vector3(...description.boundingBox.max));
  return geometry;
 };
 // Refuse on the header alone, before a single buffer is built: a bundle the
 // renderer will not use must leave nothing behind for the fallback to trip on.
 for(const [i,entry]of header.species.entries())
  if(entry.name!==VEGETATION_SPECIES[i].name)throw new Error(`asset bundle names ${entry.name} where the renderer wants ${VEGETATION_SPECIES[i].name}`);
 const built=[];
 try {
  for(const entry of header.species)built.push({geometry:build(entry.geometry),shoulderGeometry:build(entry.shoulderGeometry)});
  return built;
 }catch(error){
  for(const entry of built){entry.geometry?.dispose();entry.shoulderGeometry?.dispose()}
  throw error;
 }
}

/**
 * The bundle is renderer-ready: one request, no GLB parse, no expansion, no
 * weld. A missing, stale or malformed bundle is not an error — the authored
 * GLBs are still shipped and the loader falls back to preparing them live.
 */
async function loadPreparedAssets(indexed){
 if(!indexed)return null;
 try {
  const response=await fetch(VEGETATION_BUNDLE_URL);
  if(!response.ok)throw new Error(`asset bundle ${response.status}`);
  return readVegetationBundle(await response.arrayBuffer());
 }catch{
  return null;
 }
}

export async function loadVegetation(time,flocking,mineral,{indexed=true,distantCells=null}={}) {
  // The bundle needs no texture, so its download overlaps the grain textures.
  const prepared=loadPreparedAssets(indexed);
  const [flockingGrain,mineralGrain]=await Promise.all([flocking,mineral]);
  const loader=new GLTFLoader();
  const foliageMaterial=new T.MeshStandardMaterial({color:'white',vertexColors:true,roughness:.93,flatShading:true,bumpMap:flockingGrain,bumpScale:.007});
  const rockMaterial=new T.MeshStandardMaterial({color:'white',vertexColors:true,roughness:.9,flatShading:true,bumpMap:mineralGrain,bumpScale:.006});
  const rangeMaterial=rockMaterial.clone();
  rangeMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float rangeFoot;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>',`#include <color_vertex>
      #ifdef USE_INSTANCING_COLOR
      vec3 stonePigment=vColor.xyz/max(instanceColor,vec3(.001));
      vColor.xyz=mix(stonePigment,instanceColor,rangeFoot);
      #endif
    `);
  };
  rangeMaterial.customProgramCacheKey=()=> 'mountain-range-pigments-v1';
  foliageMaterial.onBeforeCompile=shader=>{
    shader.uniforms.groveTime=time;
    shader.vertexShader='uniform float groveTime; attribute float canopyWeight;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>',`#include <color_vertex>
      #ifdef USE_INSTANCING_COLOR
      // Seasonal pigment affects the crown; the carved trunk stays brown.
      vColor.xyz *= mix(1.0/max(instanceColor,vec3(.001)),vec3(1.0),canopyWeight);
      #endif
    `);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      vec3 root=instanceMatrix[3].xyz;
      float bend=smoothstep(.35,1.5,position.y);
      transformed.x+=sin(groveTime*.8+root.x*.7+root.z*.6)*bend*.012;
      transformed.z+=cos(groveTime*.6+root.x*.4)*bend*.006;
      #endif
    `);
  };
  foliageMaterial.customProgramCacheKey=()=> 'sculpted-grove-breeze-v2';
  const outputs=new Set();
  const materialFor=rock=>rock?rockMaterial:foliageMaterial;
  async function species(name,evergreen=false,rock=false) {
    const {scene}=await loader.loadAsync(`/terrain-study/${name}.glb`);
    const baked=bakeVegetationScene(scene,{name,evergreen});
    outputs.add(baked.geometry);
    if(baked.shoulderGeometry)outputs.add(baked.shoulderGeometry);
    return {...baked,material:materialFor(rock)};
  }
  try {
  const bundled=await prepared;
  // A rejected request must also release batches whose downloads finish later.
  // All requests still run concurrently; ownership transfers only as one set.
  const assets=bundled
   ?bundled.map((entry,i)=>{
     outputs.add(entry.geometry);
     if(entry.shoulderGeometry)outputs.add(entry.shoulderGeometry);
     return {...entry,material:materialFor(VEGETATION_SPECIES[i].rock)};
    })
   :await (async()=>{
     const loaded=await Promise.allSettled(VEGETATION_SPECIES.map(row=>species(row.name,row.evergreen,row.rock)));
     const failed=loaded.find(result=>result.status==='rejected');
     if(failed)throw failed.reason;
     return loaded.map(result=>result.value);
    })();
  const broadleaves=assets.slice(0,3),cypresses=assets.slice(3,5),escarpments=assets.slice(5,8),limestone=assets[8];
  if(!bundled)finishVegetation({broadleaves,cypresses,escarpments,limestone},{indexed});
  // Name each sculpt on the geometry itself. A batch submitted at the overview
  // has no other identity to report — the bundle carries none, and a benchmark
  // that had to be handed a map of assets would go stale the day one is added.
  for(const [i,asset]of assets.entries()){
   if(asset.geometry)asset.geometry.userData.paintedAsset=VEGETATION_SPECIES[i].name;
   if(asset.shoulderGeometry)asset.shoulderGeometry.userData.paintedAsset=`${VEGETATION_SPECIES[i].name}-shoulder`;
   // One family gets a map-scale stand-in, and the sheet says which: a family
   // the sheet does not name keeps its own sculpt at every distance, which is
   // what the board drew before there was a stand-in at all.
   const cells=distantCells?.[VEGETATION_SPECIES[i].family];
   if(!cells)continue;
   for(const near of ['geometry','shoulderGeometry']){
    if(!asset[near])continue;
    const far=farSculpt(asset[near],cells);
    if(!far)continue;
    asset[near==='geometry'?'farGeometry':'farShoulderGeometry']=far;
    outputs.add(far);
   }
  }
  return {broadleaves,cypresses,escarpments,limestone,rangeMaterial,broadleaf:broadleaves[0],cypress:cypresses[0],materials:[foliageMaterial,rockMaterial,rangeMaterial]};
  }catch(error){
    for(const geometry of outputs)geometry.dispose();
    for(const material of [foliageMaterial,rockMaterial,rangeMaterial])material.dispose();
    throw error;
  }
}
