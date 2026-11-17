import * as T from 'three';

// Clip a marking against the exact terrain triangles. Elevation is interpolated
// on each face, including shared hill mounds; no approximate draped height grid.
// `lift` is one height above the ground, or one height for each corner of the
// polygon. With a list, the height is the plane through the first, second and
// last corner, so a band can slope: a river bank, a road's shoulder.
export function surfacePatch(top,polygon,color,lift=.007){
 let liftAt=()=>lift;
 if(Array.isArray(lift)){
  const [a,b,c]=[polygon[0],polygon[1],polygon[polygon.length-1]],[la,lb,lc]=[lift[0],lift[1],lift[lift.length-1]];
  const ux=b[0]-a[0],uz=b[1]-a[1],vx=c[0]-a[0],vz=c[1]-a[1],det=ux*vz-uz*vx;
  if(Math.abs(det)<1e-12)liftAt=()=>la;
  else{
   const gx=((lb-la)*vz-(lc-la)*uz)/det,gz=((lc-la)*ux-(lb-la)*vx)/det,low=Math.min(...lift),high=Math.max(...lift);
   liftAt=(x,z)=>Math.max(low,Math.min(high,la+gx*(x-a[0])+gz*(z-a[1])));
  }
 }
 const p=top.attributes.position,out=[],ink=[];
 const area=polygon.reduce((s,a,i)=>{const b=polygon[(i+1)%polygon.length];return s+a[0]*b[1]-b[0]*a[1]},0);
 const sign=area<0?-1:1;
 const minX=Math.min(...polygon.map(p=>p[0])),maxX=Math.max(...polygon.map(p=>p[0]));
 const minZ=Math.min(...polygon.map(p=>p[1])),maxZ=Math.max(...polygon.map(p=>p[1]));
 for(let i=0;i<p.count;i+=3){
  // The bounds test reads the corners straight from the buffer: most triangles
  // of the hex lie outside a mark, and building their corner lists first made
  // the reject cost several small arrays each (the third render speed pass).
  const x0=p.getX(i),x1=p.getX(i+1),x2=p.getX(i+2),z0=p.getZ(i),z1=p.getZ(i+1),z2=p.getZ(i+2);
  if(Math.max(x0,x1,x2)<minX||Math.min(x0,x1,x2)>maxX||Math.max(z0,z1,z2)<minZ||Math.min(z0,z1,z2)>maxZ)continue;
  let face=[[x0,p.getY(i),z0],[x1,p.getY(i+1),z1],[x2,p.getY(i+2),z2]];
  for(let e=0;e<polygon.length&&face.length;e++){
   const a=polygon[e],b=polygon[(e+1)%polygon.length],next=[];
   const side=v=>sign*((b[0]-a[0])*(v[2]-a[1])-(b[1]-a[1])*(v[0]-a[0]));
   for(let j=0;j<face.length;j++){
    const v=face[j],w=face[(j+1)%face.length],sv=side(v),sw=side(w);
    if(sv>=-1e-9)next.push(v);
    if((sv>=0)!==(sw>=0)){const t=sv/(sv-sw);next.push(v.map((n,k)=>n+(w[k]-n)*t))}
   }face=next;
  }
  for(let j=1;j<face.length-1;j++)for(const v of [face[0],face[j],face[j+1]]){out.push(v[0],v[1]+liftAt(v[0],v[2]),v[2]);ink.push(color.r,color.g,color.b)}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.setAttribute('color',new T.Float32BufferAttribute(ink,3));g.computeVertexNormals();return g;
}
