import {Color,Float32BufferAttribute} from 'three';
import {coastPaths,riverPaths,riverMouths,ribbonPolygons} from './waterContours.js';
import {terrainMapWraps} from './surface.js';

// Flat pigments suggest shelves and depth. There is no displaced water, radial
// gradient or independently coloured hex: the same shapes cross every join.
const palette=Object.fromEntries(Object.entries({
 body:'#4b7db6',deep:'#4775af',light:'#5082b9',
 shelf:'#5b8eb8',shallow:'#78a5b7',lakeShelf:'#669bab',
 lip:'#3c6797',river:'#5786b2',channel:'#4974aa',glint:'#96b9ce',
}).map(([k,c])=>[k,new Color(c)]));
function hash(x,z,salt=0){let n=Math.imul(x+37,374761393)^Math.imul(z-19,668265263)^Math.imul(salt+1,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296}

function polygon(points,color,layer){
 // A highly unequal pair of shelf widths can make an intermediate corner
 // concave. Use its convex silhouette so clipping never invents inner cuts.
 const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const chain=list=>{const out=[];for(const p of list){while(out.length>1&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p)}return out};
 points=[...chain(sorted).slice(0,-1),...chain(sorted.reverse()).slice(0,-1)];
 return {color,layer,planes:points.map(([ax,az],i)=>{const [bx,bz]=points[(i+1)%points.length],nx=bz-az,nz=ax-bx;return [nx,nz,nx*ax+nz*az]}),
  bounds:[Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[1]))]};
}
function brush(x,z,rx,rz,angle,color,layer,seed){
 const c=Math.cos(angle),s=Math.sin(angle);
 const outline=seed>.5?[[-1,-.25],[-.65,-.83],[.36,-1],[1,-.2],[.64,.70],[-.43,.86]]:
  [[-1,-.6],[.3,-.92],[1,-.15],[.45,.8],[-.7,.58]];
 return polygon(outline.map(([u,v])=>[x+u*rx*c-v*rz*s,z+u*rx*s+v*rz*c]),color,layer);
}

function split(points,[nx,nz,limit]){
 const inside=[],outside=[];let a=points[points.length-1],da=a[0]*nx+a[2]*nz-limit;
 for(const b of points){
  const db=b[0]*nx+b[2]*nz-limit;
  if((da<=0)!==(db<=0)){const t=da/(da-db),p=a.map((v,i)=>v+(b[i]-v)*t);inside.push(p);outside.push(p)}
  (db<=0?inside:outside).push(b);a=b;da=db;
 }
 return [inside,outside];
}

export function createWaterPainter(map){
 const buckets=new Map(),bucketSize=3;
 const period=terrainMapWraps(map)?Math.sqrt(3)*map.width:0;
 let id=0;
 function add(region){
  const originalId=id++;
  // Repeat the complete pigment field. Querying x and x+period must find
  // the same ordered shapes, including coast shelves and river mouths.
  const first=period?Math.ceil((-2-region.bounds[1])/period):0;
  const last=period?Math.floor((period+2-region.bounds[0])/period):0;
  for(let copy=first;copy<=last;copy++){
   const offset=copy*period;
   const source=region;
   region={...source,id:originalId,copyKey:`${originalId}:${offset}`,planes:source.planes.map(([nx,nz,l])=>[nx,nz,l+nx*offset]),bounds:[source.bounds[0]+offset,source.bounds[1]+offset,source.bounds[2],source.bounds[3]]};
   addToBuckets(region);region=source;
  }
 }
 function addToBuckets(region){
  const [x0,x1,z0,z1]=region.bounds;
  for(let z=Math.floor(z0/bucketSize);z<=Math.floor(z1/bucketSize);z++)for(let x=Math.floor(x0/bucketSize);x<=Math.floor(x1/bucketSize);x++){
   const key=`${x}:${z}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(region);
  }
 }
 // Restrained, large fields break up open water without making it cloudy or
 // assigning a visible fan of triangles to each game tile.
 for(let row=-1;row<=Math.ceil(map.height*1.5/4.9);row++)for(let col=-1;col<=Math.ceil(map.width*Math.sqrt(3)/6.3);col++){
  const h=hash(col,row,1),k=hash(col,row,2),x=(col+.5)*6.3+(h-.5)*1.9,z=(row+.5)*4.9+(k-.5)*1.4;
  if(h>.20)add(brush(x,z,2.8+h*1.9,.82+k*1.25,.06+(h-.5)*.25,h>.60?palette.light:palette.deep,0,k));
  // Two unequal short, tapered strokes give open water a calm surface scale.
  if(k>.36)for(let i=0;i<2;i++)add(brush(x-.8+i*.38,z+.8+i*.09,.19+h*.28-i*.07,.006+i*.002,.015,palette.glint,5,h));
 }
 // Every coastal edge belongs to a shared path, including one-sided shores,
 // headlands, islands and lake basins. Width changes slowly in world space.
 const coasts=coastPaths(map);
 const shelfWidth=([x,z])=>.37+.045*Math.sin(x*.65+z*.32)+.025*Math.cos(z*.8-x*.24);
 const shallowWidth=([x,z])=>.145+.018*Math.sin(x*.65+z*.32);
 for(const path of coasts){
  for(const [width,color,layer]of [[shelfWidth,palette.shelf,1],[shallowWidth,path.lake?palette.lakeShelf:palette.shallow,2],[.012,palette.lip,4]]){
   const ribbon=ribbonPolygons(path.points,-.035,width,path.closed);
   for(const points of ribbon.polygons)add(polygon(points,color,layer));
  }
 }
 const rivers=riverPaths(map),junctions=new Map();
 for(const path of rivers.paths){
  const {points,side,closed}=path;
  for(const p of ribbonPolygons(points,-.24,.24,closed).polygons)add(polygon(p,palette.channel,6));
  // The light occupies a readable part of one bank. Its inner and outer
  // contours are continuous mitered paths, so bends share their actual joins.
  const ribbon=ribbonPolygons(points,side*.010,side*.13,closed);
  for(const p of ribbon.polygons)add(polygon(p,palette.river,7));
  if(!closed)for(const [node,i]of [[path.start,0],[path.end,points.length-1]]){
   if(node.edges.length<3)continue;
   if(!junctions.has(node))junctions.set(node,[]);
   for(const p of [ribbon.inner[i],ribbon.outer[i]])junctions.get(node).push(period?[p[0]+Math.round((node.point[0]-p[0])/period)*period,p[1]]:p);
  }
 }
 // At confluences the branches share a single planar join, rather than
 // letting three independently capped strips cross or leave pinholes.
 for(const [node,points]of junctions){
  const [x,z]=node.point;
  add(polygon(Array.from({length:6},(_,i)=>[x+Math.cos(i*Math.PI/3)*.28,z+Math.sin(i*Math.PI/3)*.28]),palette.channel,6));
  add(polygon(points,palette.river,7));
 }
 for(const mouth of riverMouths(rivers)){
  add(polygon(mouth.points,mouth.water==='lake'?palette.lakeShelf:palette.shallow,8));
 }
 function regions(bounds){
  const found=new Map(),[x0,x1,z0,z1]=bounds;
  for(let z=Math.floor(z0/bucketSize);z<=Math.floor(z1/bucketSize);z++)for(let x=Math.floor(x0/bucketSize);x<=Math.floor(x1/bucketSize);x++)for(const p of buckets.get(`${x}:${z}`)||[]){
   if(p.bounds[0]>x1||p.bounds[1]<x0||p.bounds[2]>z1||p.bounds[3]<z0)continue;
   found.set(p.copyKey,p);
  }
  return [...found.values()].sort((a,b)=>a.layer-b.layer||a.id-b.id);
 }
 function sample(x,z){
  let color=palette.body;
  for(const p of regions([x,x,z,z]))if(p.planes.every(([nx,nz,l])=>x*nx+z*nz<=l))color=p.color;
  return color;
 }
 function paint(geometry){
  const source=geometry.attributes.position;
  if(!source.count)return;
  geometry.computeBoundingBox();const b=geometry.boundingBox,patches=regions([b.min.x,b.max.x,b.min.z,b.max.z]);
  const positions=[],colors=[];
  for(let i=0;i<source.count;i+=3){
   const triangle=Array.from({length:3},(_,j)=>[source.getX(i+j),source.getY(i+j),source.getZ(i+j)]);
   const xs=triangle.map(v=>v[0]),zs=triangle.map(v=>v[2]),bounds=[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];
   let fragments=[{points:triangle,color:palette.body}];
   for(const p of patches){
    if(p.bounds[0]>bounds[1]||p.bounds[1]<bounds[0]||p.bounds[2]>bounds[3]||p.bounds[3]<bounds[2])continue;
    const next=[];
    for(const f of fragments){
     if(p.planes.some(([nx,nz,l])=>f.points.every(v=>v[0]*nx+v[2]*nz>l))){next.push(f);continue}
     let remaining=f.points;
     for(const plane of p.planes){
      const [inside,outside]=split(remaining,plane);if(outside.length>=3)next.push({points:outside,color:f.color});
      remaining=inside;if(remaining.length<3)break;
     }
     if(remaining.length>=3)next.push({points:remaining,color:p.color});
    }
    fragments=next;
   }
   for(const {points,color}of fragments)for(let j=1;j<points.length-1;j++){
    // Validate at the GPU's actual precision. Very small clipped fragments
    // can collapse when world coordinates are stored in Float32 buffers.
    let [a,b,c]=[points[0],points[j],points[j+1]].map(p=>p.map(Math.fround));
    const signed=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
    if(Math.abs(signed)<1e-10)continue;
    if(signed>0)[b,c]=[c,b];
    for(const p of [a,b,c]){positions.push(...p);colors.push(color.r,color.g,color.b)}
   }
  }
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();geometry.userData.pigmentBaked=true;
 }
 return {paint,sample};
}
