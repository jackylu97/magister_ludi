import {Quaternion,Vector3} from 'three';
import {centre,isWater,neighbour,onTileTop} from './surface.js';
import {terrainMesh} from './terrainMesh.js';
import {unitExamples,civilianUnitExamples} from './unitCatalog.js';

// Highest visible face at a tile-local point, using the actual render mesh.
export function terrainSampler(tile){
 const c=centre(tile),[top,side]=terrainMesh(tile),p=top.attributes.position,faces=[];
 for(let i=0;i<p.count;i+=3){
  const a=[p.getX(i)-c.x,p.getY(i),p.getZ(i)-c.z],b=[p.getX(i+1)-c.x,p.getY(i+1),p.getZ(i+1)-c.z],d=[p.getX(i+2)-c.x,p.getY(i+2),p.getZ(i+2)-c.z];
  const den=(b[2]-d[2])*(a[0]-d[0])+(d[0]-b[0])*(a[2]-d[2]);if(Math.abs(den)<1e-10)continue;faces.push({a,b,d,den});
 }
 top.dispose();side.dispose();
 return (x,z)=>{
  let h=-Infinity;
  for(const {a,b,d,den}of faces){
   const u=((b[2]-d[2])*(x-d[0])+(d[0]-b[0])*(z-d[2]))/den,v=((d[2]-a[2])*(x-d[0])+(a[0]-d[0])*(z-d[2]))/den;
   if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)h=Math.max(h,u*a[1]+v*b[1]+(1-u-v)*d[1]);
  }return h;
 };
}

function fitPose(tile,model,x,z,angle,height){
 const yaw=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),angle);
 const contacts=model.contacts.map(p=>new Vector3(...p).applyQuaternion(yaw));
 const samples=contacts.map(p=>({x:p.x,z:p.z,h:height(x+p.x,z+p.z)}));if(samples.some(p=>!Number.isFinite(p.h)))return;
 const n=samples.length,m=samples.reduce((s,p)=>({x:s.x+p.x/n,z:s.z+p.z/n,h:s.h+p.h/n}),{x:0,z:0,h:0});
 let xx=0,zz=0,xz=0,xh=0,zh=0;
 for(const p of samples){const a=p.x-m.x,b=p.z-m.z,h=p.h-m.h;xx+=a*a;zz+=b*b;xz+=a*b;xh+=a*h;zh+=b*h}
 const det=xx*zz-xz*xz;
 let dx=det>1e-9?(xh*zz-zh*xz)/det:0,dz=det>1e-9?(zh*xx-xh*xz)/det:0;
 const slope=Math.hypot(dx,dz);if(slope>.10){dx*=.10/slope;dz*=.10/slope}
 const q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(-dx,1,-dz).normalize()).multiply(yaw);
 const posed=model.contacts.map(p=>new Vector3(...p).applyQuaternion(q));
 if(!posed.every(p=>onTileTop(tile,x+p.x,z+p.z,.026)))return;
 const support=posed.map(p=>height(x+p.x,z+p.z)-p.y);
 const y=Math.max(...support)+.0015,gap=Math.max(...support)-Math.min(...support);
 return {x,z,y,quaternion:q.toArray(),gap,score:gap*12+Math.hypot(dx,dz)*.06+Math.hypot(x,z)*.04};
}

export function createUnitPlan(map,settlements,assets){
 const entries=new Map(),byType={},city=settlements.sites.city;
 if(!city)return {entries,byType};
 const distance=(a,b)=>{const c=centre(a),d=centre(b);return Math.hypot(c.x-d.x,c.z-d.z)};
 for(const type of unitExamples){
  // Keep the new civilian examples near the accepted worker. Earlier pieces
  // retain their existing order, tiles and fitted poses.
  const anchor=['greatPerson','warElephant'].includes(type)&&byType.horseman?byType.horseman.tile:civilianUnitExamples.includes(type)&&byType.worker?byType.worker.tile:city;
  const options=map.tiles.filter(t=>{const e=settlements.entries.get(t);return !isWater(t)&&t.terrain!=='mountain'&&t.feature!=='oasis'&&!t.discovery&&!entries.has(t)&&!e?.city&&!e?.site&&!e?.resource&&!e?.improvement});
  const score=t=>distance(t,anchor)+Array.from({length:6},(_,i)=>neighbour(t,map,i)).filter(n=>n?.terrain==='mountain').length*3+(t.feature==='forest'?2:0)+(t.hills?(type==='spearman'?-1:2):0)+(['grassland','plains'].includes(t.terrain)?0:4);
  options.sort((a,b)=>score(a)-score(b));
  for(const tile of options){
   const height=terrainSampler(tile),angle=['horseman','horseArcher'].includes(type)?-.35:type==='warElephant'?-.58:type==='trader'?-.62:type==='settler'?2.92:type==='warrior'?-.16:.12,points=[];
   for(let i=0;i<49;i++){
    const a=i*2.39996,d=i?Math.sqrt(i/48)*.39:0;
    const fit=fitPose(tile,assets[type],Math.cos(a)*d,Math.sin(a)*d,angle,height);if(fit)points.push(fit);
   }
   points.sort((a,b)=>a.score-b.score);if(!points.length||points[0].gap>.035)continue;
   const piece={type,tile,radius:type==='trader'?assets[type].radius:.29,...points[0]};entries.set(tile,piece);byType[type]=piece;break;
  }
 }
 return {entries,byType};
}
export function unitReserved(piece,x,z){return !!piece&&Math.hypot(x-piece.x,z-piece.z)<piece.radius+.18}
