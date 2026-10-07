import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';

// Broad broken glass flakes, with dark faces and narrow blue-grey fracture
// edges. The colour is baked so the deposit uses the ordinary instanced kit.
export function createObsidianGeometry(){
 const parts=[];
 for(const [x,z,yaw,scale] of [[0,0,-.22,1],[-.50,.14,.65,.63],[.43,.23,-.80,.48]]){
  const shape=new T.Shape([[-.56,0],[.55,0],[.39,.60],[.12,1.15],[-.26,.87]].map(p=>new T.Vector2(...p)));
  const g=new T.ExtrudeGeometry(shape,{depth:.33,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.07,bevelThickness:.045,curveSegments:1});
  g.translate(0,.07,-.165);g.scale(scale,scale,scale);g.rotateY(yaw);g.translate(x,0,z);
  const p=g.attributes.position,n=g.attributes.normal,colors=new Float32Array(p.count*3),uv=new Float32Array(p.count*2);
  const face=new T.Color('#292e3d'),edge=new T.Color('#697b90'),shade=new T.Color('#414151');
  for(let i=0;i<p.count;i++){
   const c=n.getY(i)>.25?edge:Math.abs(n.getY(i))>.06?shade:face;
   colors.set([c.r,c.g,c.b],i*3);uv[i*2]=p.getX(i)*2;uv[i*2+1]=p.getZ(i)*2;
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));parts.push(g);
 }
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());indexGeometry(geometry);
 geometry.name='Obsidian fractured glass';return geometry;
}
