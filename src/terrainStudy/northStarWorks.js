import * as T from 'three';
import {centre,tileShape,onTileTop} from './surface.js';
import {surfacePatch} from './surfacePatch.js';

// The mine, the quarry and the farm of the north-star look (the visual test of
// 2026-11-12, docs/flags.md (nnnnnnn), "Towns and works in the test scene").
// `createSettlementArt` calls `northStarWork` first when the look is on and the
// new models are loaded. If it returns true, the study's own drawing of that
// improvement is skipped. The numbers are `visualTest.works` in
// data/view3d.json, handed in by the caller, so this module loads in Node too.

const hash=(x,z,n)=>{
 let v=Math.imul(x+29,374761393)^Math.imul(z+73,668265263)^Math.imul(n+1,1274126177);
 v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;
};

// Keep the part of a convex polygon where x*nx+z*nz <= limit.
function clip(polygon,nx,nz,limit){
 const result=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const da=a[0]*nx+a[1]*nz-limit,db=b[0]*nx+b[1]*nz-limit;
  if(da<=0)result.push(a);
  if((da<=0)!==(db<=0)){const t=da/(da-db);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}
 }
 return result;
}
const middle=polygon=>polygon.reduce((p,q)=>[p[0]+q[0]/polygon.length,p[1]+q[1]/polygon.length],[0,0]);
const area=polygon=>Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1]},0))/2;

/**
 * A farm's plan: three strips across the hex, two of them cut once, so the
 * hex holds five plots. Four are fields and the smallest of the cut ones is the
 * yard, where the barn and the haystacks stand. The strips run along one of the
 * three directions of the hex's own sides, hashed from the tile's coordinates,
 * so a farm looks tidy and two farms side by side differ.
 */
export function northStarFarmPlan(tile,works){
 const h=n=>hash(tile.col,tile.row,n);
 const angle=Math.floor(h(0)*3)*Math.PI/3+(h(1)-.5)*2*works.angleJitter;
 const ca=Math.cos(angle),sa=Math.sin(angle);
 // Strip coordinates: u runs along a strip, v across the strips.
 const toStrip=([x,z])=>[x*ca+z*sa,-x*sa+z*ca],toHex=([u,v])=>[u*ca-v*sa,u*sa+v*ca];
 const outline=tileShape(tile).top.map(([x,z])=>toStrip([x*works.fieldInset,z*works.fieldInset]));
 const gap=works.fieldGap*.5,at=works.stripAt,plots=[];
 const strips=[clip(outline,0,1,-at-gap),clip(clip(outline,0,1,at-gap),0,-1,at-gap),clip(outline,0,-1,-at-gap)];
 const cutAt=[(h(2)-.5)*.5,null,(h(3)-.5)*.5];
 if(h(4)>.5)[cutAt[0],cutAt[1]]=[cutAt[1],cutAt[0]];
 for(const [i,strip]of strips.entries()){
  if(cutAt[i]===null){plots.push(strip);continue}
  plots.push(clip(strip,1,0,cutAt[i]-gap),clip(strip,-1,0,-cutAt[i]-gap));
 }
 const usable=plots.filter(p=>p.length>=3);
 // The yard is the smallest plot that still holds the barn.
 const yard=usable.filter(p=>area(p)>works.barnSize*works.barnSize*2.4).sort((a,b)=>area(a)-area(b))[0]??usable[0];
 return {angle,yard:yard?.map(toHex),fields:usable.filter(p=>p!==yard).map(p=>p.map(toHex))};
}

export function northStarWork(works,{tile,entry,top,assets,patch,building,put,height,onBuilding}){
 const improvement=entry.improvement,c=centre(tile);
 // A mine or a quarry is one large model. It has its own floor, which reaches
 // below the ground line, so it sits into a slope with no plinth.
 const sunk=(name,[x,z],size)=>{
  const geometry=assets[name];geometry.computeBoundingBox();
  const b=geometry.boundingBox,span=Math.max(b.max.x-b.min.x,b.max.z-b.min.z);
  for(const factor of [1,.92,.84,.76,.68,.6]){
   const s=size*factor/span;
   const corners=[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]].map(([xx,zz])=>({x:x+xx*s,z:z+zz*s}));
   if(!corners.every(p=>onTileTop(tile,p.x,p.z,.018)))continue;
   let floor=-Infinity,low=Infinity;
   for(const u of [.15,.5,.85])for(const v of [.15,.5,.85]){
    const y=height(x+(b.min.x+(b.max.x-b.min.x)*u)*s,z+(b.min.z+(b.max.z-b.min.z)*v)*s);
    floor=Math.max(floor,y);low=Math.min(low,y);
   }
   put(geometry,x,z,s,0,0xffffff,floor);
   onBuilding?.({asset:name,x:c.x+x,y:floor,z:c.z+z,scale:s,yaw:0,footprint:corners.map(p=>({x:c.x+p.x,z:c.z+p.z})),foundationMin:Math.min(low,floor+b.min.y*s),foundationMax:floor});
   return true;
  }
  return false;
 };
 if(improvement==='mine')return sunk('ns-mine',works.mineAt,works.mineSize);
 if(improvement==='quarry')return sunk('ns-quarry',works.quarryAt,works.quarrySize);
 if(improvement!=='farm')return false;
 const plan=northStarFarmPlan(tile,works),h=n=>hash(tile.col,tile.row,n);
 // Flat colour only: no rows, no strokes. Neighbouring plots never share a colour.
 const first=Math.floor(h(5)*works.fields.length);
 for(const [i,field]of plan.fields.entries())patch(field,works.fields[(first+i)%works.fields.length],.007);
 if(!plan.yard)return true;
 patch(plan.yard,works.yard,.007);
 const [mx,mz]=middle(plan.yard),ca=Math.cos(plan.angle),sa=Math.sin(plan.angle);
 const barn=assets['ns-barn'];barn.computeBoundingBox();
 const size=barn.boundingBox.getSize(new T.Vector3());
 building('ns-barn',mx,mz,works.barnSize/Math.max(size.x,size.z),-plan.angle);
 // The haystacks stand in a row beside the barn, along the strip.
 const stack=assets['ns-haystack'];stack.computeBoundingBox();
 const s=works.haystackSize/stack.boundingBox.getSize(new T.Vector3()).x;
 const inside=(x,z)=>plan.yard.every((p,i)=>{
  const q=plan.yard[(i+1)%plan.yard.length],cross=(q[0]-p[0])*(z-p[1])-(q[1]-p[1])*(x-p[0]);
  const turn=(q[0]-p[0])*(mz-p[1])-(q[1]-p[1])*(mx-p[0]);
  return cross*turn>=0&&Math.abs(cross)/Math.hypot(q[0]-p[0],q[1]-p[1])>works.haystackSize*.35;
 });
 let placed=0;
 for(const side of [1,-1])for(const step of [1,2,3]){
  if(placed>=works.haystacks)break;
  const along=side*(works.barnSize*.5+works.haystackSize*(step-.3)*1.15),across=(h(10+placed)-.5)*.08;
  const x=mx+along*ca-across*sa,z=mz+along*sa+across*ca;
  if(!inside(x,z)||!onTileTop(tile,x,z,works.haystackSize*.6))continue;
  put(stack,x,z,s*(.9+h(20+placed)*.25),h(30+placed)*6.28);placed++;
 }
 return true;
}
