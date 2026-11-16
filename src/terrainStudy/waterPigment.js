import {Color,Float32BufferAttribute} from 'three';
import {coastPaths,riverPaths,riverMouths,ribbonPolygons} from './waterContours.js';
import {centre,terrainMapWraps} from './surface.js';

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

// `bank` is optional: {color, inner, outer}. When it is given, each river gets
// a pale line on both banks at the waterline, `inner` to `outer` from the
// river's own line (the visual test version's thinner rivers, batch V1).
// `brush` is optional too: {spacingX, spacingZ}. When it is given, the painter
// also lays the land's brush strokes across each edge between coast and ocean
// (the visual test version's sea, switch 1), and `paint(geometry, tile)` marks
// every fragment coast (0) or ocean (1) in a `seaKind` attribute. The strokes
// are the land painter's shapes at the land's sizes, owned by the hex under
// each stroke's centre, so the two kinds of water swap whole patches across
// the hex line instead of meeting on it, and never blend into a gradient.
// `river` is optional: {channel, light}, two colours for the river's water in
// place of the study's blues (the visual test's edge river, 2026-11-12).
export function createWaterPainter(map,{bank=null,brush:seaBrush=null,river:riverInk=null}={}){
 const channelInk=riverInk?new Color(riverInk.channel):palette.channel,lightInk=riverInk?new Color(riverInk.light):palette.river;
 const buckets=new Map(),bucketSize=3;
 const bankColor=bank?new Color(bank.color):null;
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
  // The sea painted as the land is (`seaBrush.tones`) has strokes of the land's size and none of these large fields or glints.
  if(seaBrush?.tones)continue;
  if(h>.20)add(brush(x,z,2.8+h*1.9,.82+k*1.25,.06+(h-.5)*.25,h>.60?palette.light:palette.deep,0,k));
  // Two unequal short, tapered strokes give open water a calm surface scale.
  if(k>.36)for(let i=0;i<2;i++)add(brush(x-.8+i*.38,z+.8+i*.09,.19+h*.28-i*.07,.006+i*.002,.015,palette.glint,5,h));
 }
 // Every coastal edge belongs to a shared path, including one-sided shores,
 // headlands, islands and lake basins. Width changes slowly in world space.
 const coasts=coastPaths(map);
 const shelfWidth=([x,z])=>.37+.045*Math.sin(x*.65+z*.32)+.025*Math.cos(z*.8-x*.24);
 const shallowWidth=([x,z])=>.145+.018*Math.sin(x*.65+z*.32);
 for(const path of seaBrush?.tones?[]:coasts){
  for(const [width,color,layer]of [[shelfWidth,palette.shelf,1],[shallowWidth,path.lake?palette.lakeShelf:palette.shallow,2],[.012,palette.lip,4]]){
   const ribbon=ribbonPolygons(path.points,-.035,width,path.closed);
   for(const points of ribbon.polygons)add(polygon(points,color,layer));
  }
 }
 const rivers=riverPaths(map),junctions=new Map();
 for(const path of rivers.paths){
  const {points,side,closed}=path;
  for(const p of ribbonPolygons(points,-.24,.24,closed).polygons)add(polygon(p,channelInk,6));
  // The light occupies a readable part of one bank. Its inner and outer
  // contours are continuous mitered paths, so bends share their actual joins.
  const ribbon=ribbonPolygons(points,side*.010,side*.13,closed);
  for(const p of ribbon.polygons)add(polygon(p,lightInk,7));
  if(bankColor)for(const s of [1,-1])for(const p of ribbonPolygons(points,s*bank.inner,s*bank.outer,closed).polygons)add(polygon(p,bankColor,9));
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
  add(polygon(Array.from({length:6},(_,i)=>[x+Math.cos(i*Math.PI/3)*.28,z+Math.sin(i*Math.PI/3)*.28]),channelInk,6));
  add(polygon(points,lightInk,7));
 }
 for(const mouth of riverMouths(rivers)){
  add(polygon(mouth.points,mouth.water==='lake'?palette.lakeShelf:palette.shallow,8));
 }
 if(seaBrush)for(const stroke of seaStrokes(map,seaBrush)){
  const tone=stroke.tone===undefined?null:palette.body.clone().multiplyScalar(stroke.tone===1?seaBrush.tones[0]:stroke.tone===2?seaBrush.tones[1]:1);
  const region=polygon(stroke.points,tone,10);region.kind=stroke.kind;add(region);
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
  for(const p of regions([x,x,z,z]))if(p.kind===undefined&&p.planes.every(([nx,nz,l])=>x*nx+z*nz<=l))color=p.color;
  return color;
 }
 function paint(geometry,tile=null){
  const source=geometry.attributes.position;
  if(!source.count)return;
  geometry.computeBoundingBox();const b=geometry.boundingBox,patches=regions([b.min.x,b.max.x,b.min.z,b.max.z]);
  const positions=[],colors=[],kinds=[],baseKind=tile?.terrain==='ocean'?1:0;
  for(let i=0;i<source.count;i+=3){
   const triangle=Array.from({length:3},(_,j)=>[source.getX(i+j),source.getY(i+j),source.getZ(i+j)]);
   const xs=triangle.map(v=>v[0]),zs=triangle.map(v=>v[2]),bounds=[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];
   let fragments=[{points:triangle,color:palette.body,kind:baseKind}];
   for(const p of patches){
    if(p.bounds[0]>bounds[1]||p.bounds[1]<bounds[0]||p.bounds[2]>bounds[3]||p.bounds[3]<bounds[2])continue;
    const next=[];
    for(const f of fragments){
     if(p.planes.some(([nx,nz,l])=>f.points.every(v=>v[0]*nx+v[2]*nz>l))){next.push(f);continue}
     let remaining=f.points;
     for(const plane of p.planes){
      const [inside,outside]=split(remaining,plane);if(outside.length>=3)next.push({points:outside,color:f.color,kind:f.kind});
      remaining=inside;if(remaining.length<3)break;
     }
     // A sea stroke changes which kind of water the fragment is, not its paint.
     if(remaining.length>=3)next.push(p.kind===undefined?{points:remaining,color:p.color,kind:f.kind}:{points:remaining,color:p.color??f.color,kind:p.kind});
    }
    fragments=next;
   }
   for(const {points,color,kind}of fragments)for(let j=1;j<points.length-1;j++){
    // Validate at the GPU's actual precision. Very small clipped fragments
    // can collapse when world coordinates are stored in Float32 buffers.
    let [a,b,c]=[points[0],points[j],points[j+1]].map(p=>p.map(Math.fround));
    const signed=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
    if(Math.abs(signed)<1e-10)continue;
    if(signed>0)[b,c]=[c,b];
    for(const p of [a,b,c]){positions.push(...p);colors.push(color.r,color.g,color.b);kinds.push(kind)}
   }
  }
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  if(seaBrush)geometry.setAttribute('seaKind',new Float32BufferAttribute(kinds,1));
  geometry.computeVertexNormals();geometry.userData.pigmentBaked=true;
 }
 return {paint,sample};
}

// The land painter's brush shapes (`terrainPigment.js`), laid on a lattice of
// the same spacing across the water. Each group is owned by the coast or ocean
// hex under its centre and takes that hex's kind. Only a stroke that reaches
// water of the other kind is kept: everywhere else it would change nothing.
const strokeOutlines=[
 [[-1,-.28],[-.64,-.87],[.28,-1],[.92,-.37],[1,.22],[.40,.82],[-.43,1],[-.94,.46]],
 [[-1,-.5],[-.1,-1],[1,-.8],[.63,.37],[-.4,.85],[-.9,.28]],
 [[-1,-.8],[.68,-.6],[1,.1],[.14,1],[-.6,.57]],
 [[-1,-.33],[-.35,-.8],[1,-.45],[.48,.45],[-.76,.93]],
];
function seaStrokes(map,{spacingX,spacingZ,tones=null}){
 const width=map.width,wraps=terrainMapWraps(map);
 const tileAt=(x,z)=>{
  const row=Math.round(z/1.5);let nearest=null,distance=Infinity;
  for(let r=Math.max(0,row-1);r<=Math.min(map.height-1,row+1);r++){
   let col=Math.round(x/Math.sqrt(3)-(r%2)*.5);
   if(wraps)col=((col%width)+width)%width;else if(col<0||col>=width)continue;
   const t=map.tiles[r*width+col],c=centre(t);
   const dx=wraps?((x-c.x)%(Math.sqrt(3)*width)+Math.sqrt(3)*width*1.5)%(Math.sqrt(3)*width)-Math.sqrt(3)*width*.5:x-c.x;
   const d=dx**2+(c.z-z)**2;
   if(d<distance){distance=d;nearest=t;}
  }
  return nearest;
 };
 const kindAt=(x,z)=>{const t=tileAt(x,z);return t?.terrain==='ocean'?1:t?.terrain==='coast'?0:-1};
 const strokes=[];
 const columns=Math.ceil(width*Math.sqrt(3)/spacingX),rows=Math.ceil(map.height*1.5/spacingZ);
 for(let row=-1;row<=rows;row++)for(let col=-1;col<=columns;col++){
  const h=hash(col+73,row-41,7),k=hash(col-29,row+137,7);
  const x=(col+.5)*spacingX+(h-.5)*.60,z=(row+.5)*spacingZ+(k-.5)*.55,kind=kindAt(x,z);
  if(kind<0)continue;
  const turn=.35+.42*Math.sin(x*.20+z*.13)+(h-.5)*.55,tangent=[Math.cos(turn),Math.sin(turn)],normal=[-tangent[1],tangent[0]];
  const length=1.18+h*.42,breadth=.40+k*.16,group=[];
  // `tone` is the land painter's own choice for the same stroke: 1 its deeper tone, 2 its lighter one, 0 the ground's.
  const add=(u,v,rx,rz,seed,twist=0,tone=1)=>{
   const cx=x+tangent[0]*u+normal[0]*v,cz=z+tangent[1]*u+normal[1]*v,angle=turn+twist,s=Math.sin(angle),c=Math.cos(angle);
   const outline=strokeOutlines[Math.min(3,Math.floor(seed*4))];
   const points=outline.map(([a,b])=>{const px=(a+b*.18*(seed-.5))*rx,pz=b*rz;return [cx+px*c-pz*s,cz+px*s+pz*c]});points.tone=tone;
   group.push(points);
  };
  add(0,0,length,breadth,h);
  add(.18,-.66,.62+k*.16,.24+h*.06,k,-.18,2);
  add(-length*.44,breadth*.64,.27+h*.12,.13+k*.07,k,.22);
  add(length*.20,breadth*.65,.16+k*.07,.09+h*.03,1-k,.40,0);
  add(length*.72,breadth*.61,.15+k*.10,.09+h*.04,1-h,-.35);
  for(let i=0;i<3+Math.floor(h*3);i++){
   const a=hash(col*17+i+41,row*23-19,8),b=hash(col*31-i-13,row*11+71,8);
   add((a*2-1)*length*1.12,(i%2?1:-1)*(breadth+.10+b*.26),.06+a*.14,.025+b*.035,b,(a-.5)*.48,i%3===0?2:1);
  }
  for(const points of group){
   const cx=points.reduce((n,p)=>n+p[0],0)/points.length,cz=points.reduce((n,p)=>n+p[1],0)/points.length;
   // With `tones`, every stroke is kept and carries its tone, so the water is painted as the land is. Without, only the strokes that cross from one kind of water to the other are kept, for their kind alone.
   if(tones||[...points,[cx,cz]].some(([px,pz])=>{const other=kindAt(px,pz);return other>=0&&other!==kind}))strokes.push({points,kind,tone:tones?points.tone:undefined});
  }
 }
 return strokes;
}
