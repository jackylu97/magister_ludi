import * as T from 'three';
import {centre} from './surface.js';
import {unitOwners} from './unitCatalog.js';
import {terrainSampler} from './unitPlan.js';

function pigment(g,value){
 const c=new T.Color(value),n=g.attributes.position.count,a=new Float32Array(n*3);
 for(let i=0;i<n;i++)a.set([c.r,c.g,c.b],i*3);
 g.setAttribute('color',new T.BufferAttribute(a,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(n*2),2));return g;
}
// The units have their own lifetime. This group can update its instance colours
// and selection without rebuilding any of the static terrain or its geometry.
export function createUnitArt(assets,scene){
 const root=new T.Group();root.name='Unit-piece art preview';scene.add(root);
 let plan,owner='enamel',selected='warrior',showRing=false;const ownerBatches=[];
 const ring=new T.Mesh(new T.BufferGeometry(),assets.material);ring.receiveShadow=true;
 function clear(){root.remove(ring);for(const mesh of [...root.children]){root.remove(mesh);mesh.dispose()}ownerBatches.length=0}
 function build(nextPlan,visible=true){
  clear();plan=nextPlan;const buckets=new Map();
  for(const piece of plan.entries.values()){
   const c=centre(piece.tile),matrix=new T.Matrix4().compose(new T.Vector3(c.x+piece.x,piece.y,c.z+piece.z),new T.Quaternion().fromArray(piece.quaternion),new T.Vector3(1,1,1));
   for(const role of ['fixed','owner']){
    const g=assets[piece.type][role];if(!buckets.has(g))buckets.set(g,{role,matrices:[]});buckets.get(g).matrices.push(matrix);
   }
  }
  for(const [g,{role,matrices}]of buckets){
   const mesh=new T.InstancedMesh(g,assets.material,matrices.length);
   matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));
   if(role==='owner'){for(let i=0;i<matrices.length;i++)mesh.setColorAt(i,new T.Color(unitOwners[owner].color));ownerBatches.push(mesh)}
   mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  root.add(ring);root.visible=visible;root.updateMatrixWorld(true);select(selected);
 }
 function setOwner(key){
  owner=unitOwners[key]?key:'enamel';const color=new T.Color(unitOwners[owner].color);
  for(const mesh of ownerBatches){for(let i=0;i<mesh.count;i++)mesh.setColorAt(i,color);mesh.instanceColor.needsUpdate=true}
 }
 function select(type){
  selected=type;const p=plan?.byType[type];ring.visible=showRing&&!!p;
  if(p&&showRing){
   const c=centre(p.tile),height=terrainSampler(p.tile),vertices=[],r=p.radius+.045;
   const point=(i,offset)=>{const a=i*Math.PI/24,x=p.x+Math.cos(a)*(r+offset),z=p.z+Math.sin(a)*(r+offset);return [c.x+x,height(x,z)+.007,c.z+z]};
   for(let i=0;i<48;i++){const a=point(i,-.009),b=point(i,.009),d=point(i+1,-.009),e=point(i+1,.009);vertices.push(...a,...d,...b,...b,...d,...e)}
   ring.geometry.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();ring.geometry=pigment(g,'#d8d3b6');ring.updateMatrixWorld(true);
  }
 }
 return {root,build,setOwner,select,setRing(enabled){showRing=enabled;select(selected)},dispose(){clear();ring.geometry.dispose();scene.remove(root)}};
}
