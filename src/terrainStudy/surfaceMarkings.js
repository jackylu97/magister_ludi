import {Color} from 'three';
import {surfacePatch} from './surfacePatch.js';

const key=p=>p.map(n=>Math.round(n*1e6)).join(',');
const bounds=polygon=>({minX:Math.min(...polygon.map(p=>p[0])),maxX:Math.max(...polygon.map(p=>p[0])),minZ:Math.min(...polygon.map(p=>p[1])),maxZ:Math.max(...polygon.map(p=>p[1]))});

// Plan-view ribbons are clipped onto the real surface below. Shared junction
// caps fill the meeting of any number of roads, without a seam across the join.
// Beds are all drawn below all cores, so a branch cannot cut across another
// road with a dark edge. No transparency or screen-space drawing is involved.
export function roadRibbonPolygons(paths,width){
 const polygons=[],segments=new Set(),joints=new Map(),r=width*.5;
 for(const path of paths)for(let i=0;i<path.length;i++){
  const a=path[i];joints.set(key(a),a);
  if(!i)continue;
  const b=path[i-1],id=[key(a),key(b)].sort().join('|');
  const length=Math.hypot(a[0]-b[0],a[1]-b[1]);
  if(length<1e-6||segments.has(id))continue;segments.add(id);
  const nx=-(a[1]-b[1])/length*r,nz=(a[0]-b[0])/length*r;
  polygons.push([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]]);
 }
 for(const [x,z]of joints.values())polygons.push(Array.from({length:8},(_,i)=>[x+Math.cos(i*Math.PI/4)*r,z+Math.sin(i*Math.PI/4)*r]));
 return polygons;
}

export function marking(polygon,color,lift=.008){
 return {polygon,color:new Color(color),lift,bounds:bounds(polygon)};
}

// Reusable for roads, ownership ink and other terrain markings. Intersections
// interpolate height on each original triangle, including the hill mounds.
export function projectMarkings(top,marks){
 top.computeBoundingBox();const b=top.boundingBox,result=[];
 for(const m of marks){
  const a=m.bounds;
  if(a.maxX<b.min.x||a.minX>b.max.x||a.maxZ<b.min.z||a.minZ>b.max.z)continue;
  const g=surfacePatch(top,m.polygon,m.color,m.lift);
  if(g.attributes.position.count)result.push(g);else g.dispose();
 }
 return result;
}

export function distanceToRoad(paths,x,z){
 let distance=Infinity;
 for(const path of paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz;
  const t=length2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length2)):0;
  distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
 }
 return distance;
}
