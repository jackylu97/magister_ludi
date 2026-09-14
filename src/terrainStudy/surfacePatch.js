import * as T from 'three';

// Clip a marking against the exact terrain triangles. Elevation is interpolated
// on each face, including shared hill mounds; no approximate draped height grid.
export function surfacePatch(top,polygon,color,lift=.007){
 const p=top.attributes.position,out=[],ink=[];
 const area=polygon.reduce((s,a,i)=>{const b=polygon[(i+1)%polygon.length];return s+a[0]*b[1]-b[0]*a[1]},0);
 const sign=area<0?-1:1;
 const minX=Math.min(...polygon.map(p=>p[0])),maxX=Math.max(...polygon.map(p=>p[0]));
 const minZ=Math.min(...polygon.map(p=>p[1])),maxZ=Math.max(...polygon.map(p=>p[1]));
 for(let i=0;i<p.count;i+=3){
  let face=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]);
  if(Math.max(...face.map(v=>v[0]))<minX||Math.min(...face.map(v=>v[0]))>maxX||Math.max(...face.map(v=>v[2]))<minZ||Math.min(...face.map(v=>v[2]))>maxZ)continue;
  for(let e=0;e<polygon.length&&face.length;e++){
   const a=polygon[e],b=polygon[(e+1)%polygon.length],next=[];
   const side=v=>sign*((b[0]-a[0])*(v[2]-a[1])-(b[1]-a[1])*(v[0]-a[0]));
   for(let j=0;j<face.length;j++){
    const v=face[j],w=face[(j+1)%face.length],sv=side(v),sw=side(w);
    if(sv>=-1e-9)next.push(v);
    if((sv>=0)!==(sw>=0)){const t=sv/(sv-sw);next.push(v.map((n,k)=>n+(w[k]-n)*t))}
   }face=next;
  }
  for(let j=1;j<face.length-1;j++)for(const v of [face[0],face[j],face[j+1]]){out.push(v[0],v[1]+lift,v[2]);ink.push(color.r,color.g,color.b)}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.setAttribute('color',new T.Float32BufferAttribute(ink,3));g.computeVertexNormals();return g;
}
