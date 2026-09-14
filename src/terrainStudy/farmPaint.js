import {BufferGeometry,BufferAttribute,Color} from 'three';
import {centre,tileShape,onTileTop,surfaceHeight} from './surface.js';
import {surfacePatch} from './surfacePatch.js';
import {farmContours} from './farmContours.js';

const hash=(x,z,n)=>{
 let v=Math.imul(x+29,374761393)^Math.imul(z+73,668265263)^Math.imul(n+1,1274126177);
 v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;
};

// Cut a convex parcel along a long field boundary. Offset secondary cuts keep
// the layout from becoming a four-square grid; small gaps expose the headland.
function cut(polygon,nx,nz,limit){
 const result=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const da=a[0]*nx+a[1]*nz-limit,db=b[0]*nx+b[1]*nz-limit;
  if(da<=0)result.push(a);
  if((da<=0)!==(db<=0)){const t=da/(da-db);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}
 }
 return result;
}

export function farmLayout(tile){
 const h=n=>hash(tile.col,tile.row,n),angle=.30+(h(0)-.5)*.95;
 const ca=Math.cos(angle),sa=Math.sin(angle);
 const local=(u,v)=>[u*ca-v*sa,u*sa+v*ca];
 const footprint=tileShape(tile).top.map(([x,z])=>[x*.955,z*.955]);
 const rotated=footprint.map(([x,z])=>[x*ca+z*sa,-x*sa+z*ca]);
 const slope=(h(1)-.5)*.50,offset=(h(2)-.5)*.34,gap=.012;
 const parcels=[];
 for(const side of [-1,1]){
  const half=cut(rotated,side,-side*slope,side*offset-gap);
  const level=(side<0?-.20:.23)+(h(side+4)-.5)*.28,lean=(h(side+7)-.5)*.35;
  parcels.push(cut(half,lean,1,level-gap),cut(half,-lean,-1,-level-gap));
 }
 // The house sits beside the main access strip. Prefer a low, level shoulder
 // on hills, rather than balancing its foundation on the top of a mound.
 const candidates=[];
 for(const v of [-.60,-.48,.48,.60])for(const side of [-1,1]){
  const [x,z]=local(offset+slope*v+side*.085,v);
  if(!onTileTop(tile,x,z,.16))continue;
  const heights=[[-.08,-.08],[.08,-.08],[.08,.08],[-.08,.08],[0,0]].map(([dx,dz])=>surfaceHeight(tile,x+dx,z+dz));
  candidates.push({x,z,angle:-angle,score:(Math.max(...heights)-Math.min(...heights))*5+Math.max(...heights)-Math.abs(v)*.04});
 }
 candidates.sort((a,b)=>a.score-b.score);
 const house=candidates[0]||{x:0,z:0,angle:-angle};
 return {footprint,parcels:parcels.map(p=>p.map(([u,v])=>local(u,v))),angle,house};
}

// Large adjoining crop parcels are flat pigment on the existing landscape.
// Each has its own harvest colour and stroke direction, with no raised rows.
export function farmPaint(tile,top,layout=farmLayout(tile)){
 const c=centre(tile),h=n=>hash(tile.col,tile.row,n);
 const world=p=>p.map(([x,z])=>[c.x+x,c.z+z]);
 // Hill cultivation stops at the actual mound feet. Exclude the flat plate
 // before clipping any pigments, so neither crops nor their base colour can
 // spill into the uncultivated ground between hills.
 let fieldSurface=top;
 if(tile.hills){
  fieldSurface=new BufferGeometry();
  const p=top.attributes.position,start=top.userData.plateVertexCount??p.count;
  fieldSurface.setAttribute('position',new BufferAttribute(p.array.subarray(start*3),3));
 }
 const base=surfacePatch(fieldSurface,world(layout.footprint),new Color('#a09d65'),.006),pieces=[base];
 if(fieldSurface!==top)fieldSurface.dispose();
 const harvests=[
  ['#c4a15e','#d2b476','#b69a5c'],
  ['#d0b57b','#dfc58c','#c1a267'],
  ['#b58354','#c79662','#a97c52'],
  ['#aaa66b','#bcb47c','#97965b'],
 ];
 const order=h(8)>.5?[1,2,0,3]:[0,1,2,0];
 for(const [i,polygon]of layout.parcels.entries()){
  if(polygon.length<3)continue;
  const [ground,light,dark]=harvests[order[i]];
  const parcel=surfacePatch(base,world(polygon),new Color(ground),.001);
  if(!parcel.attributes.position.count){parcel.dispose();continue}pieces.push(parcel);
  if(tile.hills){
   const contours=farmContours(parcel,tile,{angle:layout.angle,light,dark});
   if(contours.attributes.position.count)pieces.push(contours);else contours.dispose();
   continue;
  }
  const middle=polygon.reduce((p,q)=>[p[0]+q[0]/polygon.length,p[1]+q[1]/polygon.length],[0,0]);
  const direction=layout.angle+[.10,1.28,-.37,.83][i]+(h(20+i)-.5)*.23;
  const ca=Math.cos(direction),sa=Math.sin(direction);
  const strokePoint=(u,v)=>[c.x+middle[0]+u*ca-v*sa,c.z+middle[1]+u*sa+v*ca];
  let strokeOrder=0;
  function stroke(u,v,length,width,ink,seed){
   const lean=(seed-.5)*.12;
   const shape=[[-1,-.26],[-.73,-.50],[.72,-.43],[1,.12],[.65,.48],[-.84,.41]]
    .map(([x,z])=>strokePoint(u+x*length+z*lean,v+z*width));
   const g=surfacePatch(parcel,shape,new Color(ink),.0015+(strokeOrder++)*.000035);
   if(g.attributes.position.count)pieces.push(g);else g.dispose();
  }
  // Long, uneven brush passes supply the planted rhythm; restrained shorter
  // marks keep neighbouring parcels from reading as identical striped decals.
  let v=-1.12,j=0;
  while(v<1.15){
   const seed=h(50+i*50+j),width=.055+seed*.052;
   stroke((h(260+i*30+j)-.5)*.14,v,1.32,width*1.3,j%3===0?dark:light,seed);
   v+=width*1.75;j++;
  }
  for(let j=0;j<5;j++)stroke((h(410+i*10+j)-.5)*.75,(h(460+i*10+j)-.5)*.75,.13+h(510+i*10+j)*.17,.020+h(560+i*10+j)*.012,j%2?light:dark,h(610+i*10+j));
 }
 const {x,z,angle}=layout.house,ca=Math.cos(angle),sa=Math.sin(angle);
 const yard=[[-.14,-.11],[.10,-.13],[.16,.04],[.07,.16],[-.15,.12]]
  .map(([u,v])=>[c.x+x+u*ca+v*sa,c.z+z-u*sa+v*ca]);
 // The tiny house can sit beside the hills, with its own local dirt yard.
 pieces.push(surfacePatch(top,yard,new Color('#bda47b'),.012));
 return pieces;
}
