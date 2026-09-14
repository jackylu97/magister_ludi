import {BufferAttribute} from 'three';

// Weld only bit-identical attribute tuples. Triangle order, hard normals,
// pigment boundaries, UVs and shader weights stay exactly the same; the GPU
// can reuse vertices instead of transforming three fresh ones per triangle.
export function indexGeometry(geometry){
 if(geometry.index||!geometry.attributes.position?.count)return geometry;
 const attrs=Object.entries(geometry.attributes),count=geometry.attributes.position.count;
 if(attrs.some(([,a])=>a.isInterleavedBufferAttribute)||Object.keys(geometry.morphAttributes).length)return geometry;
 const streams=attrs.map(([,a])=>({size:a.itemSize,bits:a.array instanceof Float32Array?new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length):a.array}));
 const position=streams[attrs.findIndex(([name])=>name==='position')];
 let capacity=1;while(capacity<count*1.5)capacity*=2;
 const table=new Uint32Array(capacity),canonical=new Uint32Array(count),unique=new Uint32Array(count),indices=new Uint32Array(count),mask=capacity-1;
 let total=0;
 function equal(a,b){
  for(const {bits,size}of streams)for(let j=0;j<size;j++)if(bits[a*size+j]!==bits[b*size+j])return false;
  return true;
 }
 for(let i=0;i<count;i++){
  let hash=2166136261;
  // Position chooses a bucket; every attribute still participates in equality.
  // Hashing the many fog/pigment/UV inputs again on every vertex costs more
  // than resolving the occasional coincident corner with different shading.
  for(let j=0;j<position.size;j++)hash=Math.imul(hash^position.bits[i*position.size+j],16777619);
  hash^=hash>>>16;let slot=hash&mask;
  while(table[slot]&&!equal(i,table[slot]-1))slot=(slot+1)&mask;
  if(!table[slot]){table[slot]=i+1;canonical[i]=total;unique[total++]=i;}
  indices[i]=canonical[table[slot]-1];
 }
 const stride=attrs.reduce((sum,[,a])=>sum+a.itemSize*a.array.BYTES_PER_ELEMENT,0),indexBytes=count*(total<=65535?2:4);
 if((count-total)*stride<=indexBytes)return geometry;
 for(const [name,attr]of attrs){
  const array=new attr.array.constructor(total*attr.itemSize);
  for(let i=0;i<total;i++)for(let j=0;j<attr.itemSize;j++)array[i*attr.itemSize+j]=attr.array[unique[i]*attr.itemSize+j];
  geometry.setAttribute(name,new BufferAttribute(array,attr.itemSize,attr.normalized));
 }
 geometry.setIndex(new BufferAttribute(total<=65535?new Uint16Array(indices):indices,1));
 return geometry;
}
