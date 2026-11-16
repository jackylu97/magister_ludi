import * as T from 'three';
import {centre,tileShape,onTileTop} from './surface.js';
import {surfacePatch} from './surfacePatch.js';
import {NORTH_STAR_GREAT_WORKS,NORTH_STAR_WORK_AGES,NORTH_STAR_WORK_STEPS} from './northStarAssets.js';

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

// The paving of a great person's work: flat stones on the ground, in the hex's
// own coordinates (x east, z south). A pad lies under the piece that stands on
// the hex, and a broken path runs from it to the hex's south edge. `front` is
// for a work at the back of the hex; `court` for one that stands round the
// middle, where the path leaves through the gap in its front.
const GREAT_PAVING={
 front:[
  [[-.20,-.08],[-.02,-.10],[0,.04],[-.17,.07],[-.25,0]],[[.02,-.11],[.19,-.09],[.25,.01],[.15,.08],[.03,.05]],
  [[-.15,.10],[-.01,.08],[.01,.19],[-.11,.20]],[[.03,.08],[.14,.11],[.11,.20],[.04,.19]],
  [[-.39,-.07],[-.29,-.09],[-.28,.0],[-.37,.03]],[[.30,-.06],[.40,-.07],[.41,.03],[.32,.05]],
  [[-.07,.24],[.07,.23],[.09,.34],[-.06,.35]],[[-.05,.40],[.08,.39],[.06,.50],[-.07,.49]],[[.0,.55],[.10,.54],[.09,.63],[-.02,.64]],
 ],
 court:[
  [[-.29,-.13],[-.14,-.30],[-.02,-.28],[-.03,-.04],[-.27,-.02]],[[.01,-.29],[.13,-.31],[.30,-.14],[.29,-.03],[.0,-.05]],
  [[-.31,.01],[-.03,-.01],[-.02,.27],[-.15,.29],[-.31,.12]],[[.01,-.02],[.31,0],[.32,.10],[.17,.28],[.01,.27]],
  [[-.09,.33],[.09,.32],[.10,.45],[-.08,.46]],[[-.07,.50],[.08,.49],[.07,.60],[-.06,.61]],[[-.04,.65],[.06,.64],[.05,.73],[-.03,.74]],
 ],
};

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

/**
 * What a work draws at this age of its owner: the entry of its row in
 * `NORTH_STAR_WORK_AGES`. `step` is the owner's age, 1 to 4. With no step (the
 * study page, or a caller that knows no owner) it is the last entry. It is
 * nothing when the table is off (`works.byAge`) or the improvement has no row,
 * and the caller then draws the work as it did before the table.
 */
export function northStarWorkAge(works,improvement,step){
 if(!works?.byAge)return undefined;
 const row=NORTH_STAR_WORK_AGES[improvement];
 return row?.[Math.max(1,Math.min(NORTH_STAR_WORK_STEPS,step??NORTH_STAR_WORK_STEPS))-1];
}

export function northStarWork(works,{tile,entry,top,assets,patch,building,put,height,onBuilding}){
 const improvement=entry.improvement,c=centre(tile);
 // A model the table names but the kit did not load is not drawn: the work keeps the model it had before.
 const aged=northStarWorkAge(works,improvement,entry.step);
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
 // A great person's work is one large model on its own plinth, with paving on the ground round it.
 const great=works.greatWorks?.models?.[improvement],model=NORTH_STAR_GREAT_WORKS[improvement];
 if(great&&model&&assets[model]){
  if(!sunk(model,great.at,great.size))return false;
  // Every second stone is a little darker, so the paving reads as stones and not as one sheet.
  const pale=new T.Color(works.greatWorks.paving),deep=pale.clone().multiplyScalar(.9);
  for(const [i,stone]of GREAT_PAVING[great.court?'court':'front'].entries())patch(stone,i%2?deep:pale,.007);
  return true;
 }
 if(improvement==='mine')return works.newMine?sunk('ns-mine',works.mineAt,works.mineSize):false;
 if(improvement==='quarry')return sunk(assets[aged]?aged:'ns-quarry',works.quarryAt,works.quarrySize);
 if(improvement!=='farm')return false;
 const plan=northStarFarmPlan(tile,works),h=n=>hash(tile.col,tile.row,n);
 // Flat colour only: no rows, no strokes. Neighbouring plots never share a colour.
 // A farm takes one colour set, so one farm is mostly green and the next gold or red.
 const colours=works.fieldSets?.length?works.fieldSets[Math.floor(h(6)*works.fieldSets.length)]:works.fields;
 const first=Math.floor(h(5)*colours.length);
 for(const [i,field]of plan.fields.entries())patch(field,colours[(first+i)%colours.length],.007);
 if(!plan.yard)return true;
 patch(plan.yard,works.yard,.007);
 const [mx,mz]=middle(plan.yard),ca=Math.cos(plan.angle),sa=Math.sin(plan.angle);
 // The yard follows the age of the farm's owner. Before the table (`works.byAge` off) every farm is the last entry.
 const yard=aged&&assets[aged.store]&&assets[aged.beside]?aged:{store:'ns-barn',size:1,beside:'ns-haystack',besideSize:1,count:works.haystacks,mill:true};
 // Some farms have a tower mill in place of the barn. Its sails are a separate
 // layer (`paintedSails.ts`), which finds the mill by this placement.
 if(yard.mill&&assets['ns-windmill']&&h(7)<works.windmillShare){
  const mill=assets['ns-windmill'];mill.computeBoundingBox();
  const span=mill.boundingBox.getSize(new T.Vector3());
  building('ns-windmill',mx,mz,works.windmillSize/Math.max(span.x,span.z),works.windmillYaw*(h(8)>.5?1:-1));
  return true;
 }
 const barn=assets[yard.store];barn.computeBoundingBox();
 const size=barn.boundingBox.getSize(new T.Vector3()),barnSize=works.barnSize*yard.size;
 building(yard.store,mx,mz,barnSize/Math.max(size.x,size.z),-plan.angle);
 // The haystacks, or the sheaves of the first age, stand in a row beside the barn, along the strip.
 const stack=assets[yard.beside];stack.computeBoundingBox();
 const stackSize=works.haystackSize*yard.besideSize,s=stackSize/stack.boundingBox.getSize(new T.Vector3()).x;
 const inside=(x,z,margin=stackSize*.35)=>plan.yard.every((p,i)=>{
  const q=plan.yard[(i+1)%plan.yard.length],cross=(q[0]-p[0])*(z-p[1])-(q[1]-p[1])*(x-p[0]);
  const turn=(q[0]-p[0])*(mz-p[1])-(q[1]-p[1])*(mx-p[0]);
  return cross*turn>=0&&Math.abs(cross)/Math.hypot(q[0]-p[0],q[1]-p[1])>margin;
 });
 // The drying rack takes one side of the store, so the sheaves take the other.
 const rack=yard.rack?assets['ns-rack']:null,sides=[1,-1];
 if(rack){
  rack.computeBoundingBox();
  const rs=stackSize*1.9/rack.boundingBox.getSize(new T.Vector3()).x;
  for(const side of [1,-1]){
   const along=side*(barnSize*.5+stackSize*1.25),x=mx+along*ca,z=mz+along*sa;
   if(!inside(x,z,stackSize*.5)||!onTileTop(tile,x,z,stackSize))continue;
   put(rack,x,z,rs,-plan.angle+Math.PI/2);sides.splice(sides.indexOf(side),1);break;
  }
 }
 let placed=0;
 for(const side of sides)for(const step of [1,2,3]){
  if(placed>=yard.count)break;
  const along=side*(barnSize*.5+stackSize*(step-.3)*1.15),across=(h(10+placed)-.5)*.08;
  const x=mx+along*ca-across*sa,z=mz+along*sa+across*ca;
  if(!inside(x,z)||!onTileTop(tile,x,z,stackSize*.6))continue;
  put(stack,x,z,s*(.9+h(20+placed)*.25),h(30+placed)*6.28);placed++;
 }
 return true;
}
