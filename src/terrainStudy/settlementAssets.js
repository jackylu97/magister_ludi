import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';

// The authored kit, in the order the bundle indexes it: the herds, the working
// buildings, the town's own houses, then the sites. Authored once in Blender and
// never touched at runtime, so — exactly as for the vegetation next door — every
// load used to re-parse twenty-eight GLBs, clone and de-index their meshes,
// transform the vertices into world space, bake each material's pigment into a
// colour attribute, project a UV, merge and weld. That is a pure function of the
// GLB bytes, so `scripts/terrain-study/build_settlement_bundle.mjs` runs it once
// and the renderer downloads what it is going to use. The authored files are
// still shipped and this module still knows how to prepare them, which is what a
// missing or out-of-date bundle falls back to.
export const SETTLEMENT_ASSET_NAMES=['horse','cattle','bison','deer','elephant','beaver','house','temple','bell-tower',
 'mine','camp','quarry','fishing-boat','resource-shrub','city-house','city-loggia','civic-sanctum','city-spire','city-dome',
 'site-ruin-arch','site-ruin-column','site-ruin-fragment','site-hut','site-longhouse','site-antiquity','site-wreck',
 'site-raider-tent','site-watchtower'];
export const SETTLEMENT_BUNDLE_VERSION='settlements-1';
export const SETTLEMENT_BUNDLE_URL=`/terrain-study/asset-bundle/${SETTLEMENT_BUNDLE_VERSION}.bundle`;
const BUNDLE_MAGIC='MLAB';

/**
 * Expand one authored scene into the renderer's own attributes: the sculpt's
 * material masks baked down to a colour attribute, a world-projected UV, and
 * the whole multi-material asset welded into one indexed mesh so a herd or a
 * building costs a single instance. Disposes the GLB's own objects and every
 * temporary; only the returned geometry survives.
 */
export function bakeSettlementScene(scene,name){
 scene.updateMatrixWorld(true);
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
  return geometry;
 }catch(error){geometry?.dispose();throw error}
 finally{
  pieces.forEach(g=>g.dispose());
  const resources=new Set();scene.traverse(o=>{if(o.isMesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m)}});
  for(const resource of resources)resource.dispose();
 }
}

const ARRAYS={Float32Array,Uint32Array,Uint16Array,Uint8Array,Int16Array,Int8Array};

/** One file: a JSON header naming every buffer, then the buffers themselves. */
export function describeSettlementBundle(assets){
 const kit=[],chunks=[];let offset=0;
 const put=array=>{
  const padding=(4-(offset%4))%4;
  if(padding){chunks.push(new Uint8Array(padding));offset+=padding}
  const at=offset,bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
  chunks.push(bytes);offset+=bytes.byteLength;
  return {type:array.constructor.name,byteOffset:at,count:array.length};
 };
 const describe=geometry=>{
  const attributes={};
  for(const [name,attribute]of Object.entries(geometry.attributes))
   attributes[name]={itemSize:attribute.itemSize,normalized:attribute.normalized,...put(attribute.array)};
  const box=geometry.boundingBox;
  return {attributes,index:geometry.index?put(geometry.index.array):null,
   boundingBox:box?{min:box.min.toArray(),max:box.max.toArray()}:null};
 };
 for(const name of SETTLEMENT_ASSET_NAMES){
  const geometry=assets[name];
  if(!geometry)throw new Error(`settlement bundle is missing ${name}`);
  kit.push({name,geometry:describe(geometry)});
 }
 return {header:{version:SETTLEMENT_BUNDLE_VERSION,kit},chunks,bytes:offset};
}

export function readSettlementBundle(buffer){
 const view=new DataView(buffer);
 if(String.fromCharCode(view.getUint8(0),view.getUint8(1),view.getUint8(2),view.getUint8(3))!==BUNDLE_MAGIC)throw new Error('not an asset bundle');
 const headerBytes=view.getUint32(4,true),dataAt=8+headerBytes+((4-((8+headerBytes)%4))%4);
 const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,headerBytes)));
 if(header.version!==SETTLEMENT_BUNDLE_VERSION)throw new Error(`settlement bundle is ${header.version}, renderer wants ${SETTLEMENT_BUNDLE_VERSION}`);
 if(header.kit.length!==SETTLEMENT_ASSET_NAMES.length)throw new Error('settlement bundle kit size differs');
 // Refuse on the header alone, before a single buffer is built: a bundle the
 // renderer will not use must leave nothing behind for the fallback to trip on.
 for(const [i,entry]of header.kit.entries())
  if(entry.name!==SETTLEMENT_ASSET_NAMES[i])throw new Error(`settlement bundle names ${entry.name} where the renderer wants ${SETTLEMENT_ASSET_NAMES[i]}`);
 const build=description=>{
  const geometry=new T.BufferGeometry();
  for(const [name,a]of Object.entries(description.attributes)){
   const Array_=ARRAYS[a.type];if(!Array_)throw new Error(`settlement bundle attribute type ${a.type}`);
   geometry.setAttribute(name,new T.BufferAttribute(new Array_(buffer,dataAt+a.byteOffset,a.count),a.itemSize,a.normalized));
  }
  if(description.index){
   const Array_=ARRAYS[description.index.type];if(!Array_)throw new Error(`settlement bundle index type ${description.index.type}`);
   geometry.setIndex(new T.BufferAttribute(new Array_(buffer,dataAt+description.index.byteOffset,description.index.count),1));
  }
  if(description.boundingBox)geometry.boundingBox=new T.Box3(new T.Vector3(...description.boundingBox.min),new T.Vector3(...description.boundingBox.max));
  return geometry;
 };
 const built=new Map();
 try {
  for(const entry of header.kit)built.set(entry.name,build(entry.geometry));
  return built;
 }catch(error){
  for(const geometry of built.values())geometry.dispose();
  throw error;
 }
}

/**
 * The bundle is renderer-ready: one request, no GLB parse, no expansion, no
 * weld. A missing, stale or malformed bundle is not an error — the authored
 * GLBs are still shipped and the loader falls back to preparing them live.
 */
async function loadPreparedKit(names){
 // A caller asking for something the bundle does not carry takes the GLB path
 // whole, rather than a kit assembled from two sources.
 if(names.some(name=>!SETTLEMENT_ASSET_NAMES.includes(name)))return null;
 try {
  const response=await fetch(SETTLEMENT_BUNDLE_URL);
  if(!response.ok)throw new Error(`settlement bundle ${response.status}`);
  return readSettlementBundle(await response.arrayBuffer());
 }catch{
  return null;
 }
}

// Authored once in Blender. Each multi-material asset becomes one indexed,
// vertex-coloured mesh so the whole herd/building costs a single instance.
export async function loadSettlementAssets(paintedStyle,mineral,{names=SETTLEMENT_ASSET_NAMES}={}){
 const unique=[...new Set(names)];
 // The kit needs no texture, so its one request overlaps the grain textures —
 // which is the whole of why the two batches used to be started together.
 const prepared=loadPreparedKit(unique);
 let mineralGrain;
 try{mineralGrain=await mineral}
 catch(error){for(const geometry of (await prepared)?.values()??[])geometry.dispose();throw error}
 const material=new T.MeshStandardMaterial({color:'white',vertexColors:true,flatShading:true,roughness:.94,metalness:0,bumpMap:mineralGrain,bumpScale:.003});
 paintedStyle.register(material);
 const assets={material};
 const bundled=await prepared;
 if(bundled){
  for(const name of unique)assets[name]=bundled.get(name);
  // Everything the caller did not ask for is a view onto the same buffer and
  // nobody's to own; dropping the references is the whole of releasing it.
  for(const [name,geometry] of bundled)if(!assets[name])geometry.dispose();
  return assets;
 }
 const loader=new GLTFLoader();
 // The idle `catch` only keeps a request that fails before the batch is awaited
 // from being reported as unhandled.
 const downloads=unique.map(name=>{const request=loader.loadAsync(`/terrain-study/settlements/${name}.glb`);request.catch(()=>{});return request});
 const loaded=await Promise.allSettled(downloads.map(async (download,index)=>{
  const {scene}=await download;
  assets[unique[index]]=bakeSettlementScene(scene,unique[index]);
 }));
 // Wait for late downloads before releasing a failed batch. Ownership of a
 // partial kit never escapes to a renderer that could leave it allocated.
 const failed=loaded.find(result=>result.status==='rejected');
 if(failed){for(const resource of Object.values(assets))resource.dispose();throw failed.reason}
 return assets;
}
