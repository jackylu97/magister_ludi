import {BufferGeometry,Float32BufferAttribute,Color} from 'three';
import {centre,LAND_LEVEL} from './surface.js';

// Slice the actual field faces with gently tilted height planes. Bands then
// turn together at a hill's ridges, instead of stretching downhill like a
// top-down decal. The slight grade keeps rows readable on the broad summits.
export function farmContours(parcel,tile,{angle,light,dark}){
 const c=centre(tile),ca=Math.cos(angle),sa=Math.sin(angle),p=parcel.attributes.position;
 const value=v=>v[1]-LAND_LEVEL+.10*(-(v[0]-c.x)*sa+(v[2]-c.z)*ca);
 const spacing=.034,phase=.011;
 const positions=[],colors=[],lightColor=new Color(light),darkColor=new Color(dark);
 const clip=(face,level,above)=>{
  const out=[];
  for(let j=0;j<face.length;j++){
   const a=face[j],b=face[(j+1)%face.length];
   const da=(value(a)-level)*(above?1:-1),db=(value(b)-level)*(above?1:-1);
   if(da>=0)out.push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((x,k)=>x+(b[k]-x)*t))}
  }
  return out;
 };
 function band(face,lo,hi,ink,lift){
  const clipped=clip(clip(face,lo,true),hi,false);
  for(let j=1;j<clipped.length-1;j++)for(const v of [clipped[0],clipped[j],clipped[j+1]]){
   positions.push(v[0],v[1]+lift,v[2]);colors.push(ink.r,ink.g,ink.b);
  }
 }
 for(let i=0;i<p.count;i+=3){
  const face=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]),levels=face.map(value);
  const first=Math.floor((Math.min(...levels)-phase)/spacing),last=Math.floor((Math.max(...levels)-phase)/spacing);
  for(let row=first;row<=last;row++){
   const low=row*spacing+phase,width=spacing*(.41+.07*Math.sin(row*2.4));
   band(face,low,low+width,lightColor,.002);
   if(((row%3)+3)%3!==1)band(face,low+width+.003,low+width+.006,darkColor,.0022);
  }
 }
 const g=new BufferGeometry();
 g.setAttribute('position',new Float32BufferAttribute(positions,3));
 g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();
 return g;
}
