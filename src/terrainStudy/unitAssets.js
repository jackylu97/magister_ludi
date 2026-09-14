import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';
import {unitExamples,greatPersonFamilies} from './unitCatalog.js';
import {createPrimitiveUnitScene} from './primitiveUnitModels.js';

export function packUnitAsset(scene){
 scene.updateMatrixWorld(true);const parts={fixed:[],owner:[]};
 scene.traverse(o=>{
  if(!o.isMesh)return;
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
  const p=g.attributes.position,c=o.material.color,colors=new Float32Array(p.count*3),uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){colors.set([c.r,c.g,c.b],i*3);uv[i*2]=(p.getX(i)+p.getZ(i)*.37)*2;uv[i*2+1]=(p.getY(i)+p.getZ(i)*.23)*2}
  for(const key of Object.keys(g.attributes))if(!['position','normal'].includes(key))g.deleteAttribute(key);
  g.setAttribute('color',new T.BufferAttribute(colors,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));
  parts[o.material.name.startsWith('Owner')?'owner':'fixed'].push(g);
 });
 const model={};let floor=Infinity;
 for(const [role,geometries]of Object.entries(parts)){
  if(!geometries.length)throw new Error(`Missing ${role} material role`);
  const g=mergeGeometries(geometries);indexGeometry(g);g.computeBoundingBox();model[role]=g;floor=Math.min(floor,g.boundingBox.min.y);geometries.forEach(g=>g.dispose());
 }
 // Contact vertices come from the actual model underside, including its base.
 const contacts=new Map();
 for(const g of [model.fixed,model.owner]){
  g.translate(0,-floor,0);g.computeBoundingBox();const p=g.attributes.position;
  for(let i=0;i<p.count;i++)if(p.getY(i)<.002){const x=p.getX(i),z=p.getZ(i);contacts.set(`${x.toFixed(5)},${z.toFixed(5)}`,[x,p.getY(i),z])}
  // Include underside interiors: a hill crest can rise between the corners.
  const indices=g.index;
  for(let i=0;i<(indices?.count??p.count);i+=3){
   const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,indices?indices.getX(i+k):i+k));
   if(v.some(v=>v.y>=.002))continue;
   for(let a=0;a<=4;a++)for(let b=0;b<=4-a;b++){
    const s=v[0].clone().multiplyScalar(a/4).addScaledVector(v[1],b/4).addScaledVector(v[2],1-(a+b)/4);
    contacts.set(`${s.x.toFixed(5)},${s.z.toFixed(5)}`,s.toArray());
   }
  }
 }
 model.contacts=[...contacts.values()];
 model.height=Math.max(model.fixed.boundingBox.max.y,model.owner.boundingBox.max.y);
 model.radius=0;
 for(const g of [model.fixed,model.owner]){
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++)model.radius=Math.max(model.radius,Math.hypot(p.getX(i),p.getZ(i)));
 }
 scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});
 return model;
}

// Original memory-table chess language: built once from small reusable
// primitives, then packed and instanced exactly like the other board assets.
export async function loadUnitAssets(material){
 const assets={material};
 for(const type of unitExamples)assets[type]=packUnitAsset(createPrimitiveUnitScene(type));
 assets.greatPeople={scholar:assets.greatPerson};
 for(const family of Object.keys(greatPersonFamilies))if(family!=='scholar')assets.greatPeople[family]=packUnitAsset(createPrimitiveUnitScene('greatPerson',{family}));
 return assets;
}
