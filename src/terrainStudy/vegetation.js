import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';

// The authored kit, in the order the renderer indexes it: three broadleaves,
// two cypresses, three escarpments, then the limestone block.
export const VEGETATION_SPECIES=[
 ...[0,1,2].map(i=>({name:`grove-sculpt-${i}`,evergreen:false,rock:false})),
 ...[0,1].map(i=>({name:`cypress-sculpt-${i}`,evergreen:true,rock:false})),
 ...[0,1,2].map(i=>({name:`escarpment-${i}`,evergreen:false,rock:true})),
 {name:'limestone',evergreen:false,rock:true},
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

export async function loadVegetation(time,flocking,mineral,{indexed=true}={}) {
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
  return {broadleaves,cypresses,escarpments,limestone,rangeMaterial,broadleaf:broadleaves[0],cypress:cypresses[0],materials:[foliageMaterial,rockMaterial,rangeMaterial]};
  }catch(error){
    for(const geometry of outputs)geometry.dispose();
    for(const material of [foliageMaterial,rockMaterial,rangeMaterial])material.dispose();
    throw error;
  }
}
