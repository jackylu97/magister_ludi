import {Color,Float32BufferAttribute} from 'three';
import {centre,isWater,neighbour,baseSurfaceHeight,terrainMapWraps} from './surface.js';

export const terrainColors={oasis:'#789747',floodplain:'#94a856',grassland:'#799741',plains:'#ac9b59',desert:'#d8bc86',tundra:'#929b86',snow:'#dce0db',mountain:'#969bb0',ocean:'#536eac',coast:'#8198d0',lake:'#758bc8'};
const dryColors={grassland:'#8f9f49',plains:'#bca663',desert:'#e7c385',tundra:'#a4a78b',snow:'#e8e4d7',mountain:'#aba99e',oasis:'#92a35b',floodplain:'#aab360'};
const richColors={grassland:'#69883e',plains:'#979552',desert:'#c8ad79',tundra:'#82937f',snow:'#c6d1d7',mountain:'#859894',oasis:'#688f49',floodplain:'#83a050'};
const pigments=Object.fromEntries(Object.entries(terrainColors).map(([kind,color])=>[kind,{
 base:new Color(color),dry:new Color(dryColors[kind]||color),rich:new Color(richColors[kind]||color),
}]));
function hash(x,z){let n=Math.imul(x,374761393)^Math.imul(z,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296}
function kind(tile){return ['oasis','floodplain'].includes(tile.feature)?tile.feature:tile.terrain}

// A broad, clipped brush shape, rather than another triangulated noise field.
// Keeping the footprint convex lets us cut it into the existing terrain faces
// without a decal, floating overlay, or an additional material/draw call.
function patch(x,z,angle,rx,rz,seed,color){
 const s=Math.sin(angle),c=Math.cos(angle);
 const outlines=[
  [[-1,-.28],[-.64,-.87],[.28,-1],[.92,-.37],[1,.22],[.40,.82],[-.43,1],[-.94,.46]],
  [[-1,-.5],[-.1,-1],[1,-.8],[.63,.37],[-.4,.85],[-.9,.28]],
  [[-1,-.8],[.68,-.6],[1,.1],[.14,1],[-.6,.57]],
  [[-1,-.33],[-.35,-.8],[1,-.45],[.48,.45],[-.76,.93]],
 ];
 const outline=outlines[Math.min(3,Math.floor(seed*4))];
 const points=outline.map(([u,v])=>{
  const px=(u+v*.18*(seed-.5))*rx,pz=v*rz;
  return [x+px*c-pz*s,z+px*s+pz*c];
 });
 const planes=points.map(([ax,az],i)=>{
  const [bx,bz]=points[(i+1)%points.length],nx=bz-az,nz=ax-bx;
  return [nx,nz,nx*ax+nz*az];
 });
 return {color,planes,bounds:[Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[1]))]};
}

// Split a convex fragment at a vertical plane. New vertices interpolate the
// original triangle's height, so both banks and approved hill planes survive.
function split(polygon,[nx,nz,limit]){
 const inside=[],outside=[];
 let a=polygon[polygon.length-1],da=a[0]*nx+a[2]*nz-limit;
 for(const b of polygon){
  const db=b[0]*nx+b[2]*nz-limit,ain=da<=0,bin=db<=0;
  if(ain!==bin){
   const t=da/(da-db),p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
   inside.push(p);outside.push(p);
  }
  (bin?inside:outside).push(b);a=b;da=db;
 }
 return [inside,outside];
}

// Colours are discrete pigments. Neighbouring biomes exchange whole patches,
// never averaged gradients. Everything is baked once when the map is built.
export function createTerrainPainter(map,mountainRanges){
 const cache=new WeakMap(),groups=new Map();
 const period=terrainMapWraps(map)?Math.sqrt(3)*map.width:0;
 const shifted=new WeakMap();
 function translated(region,offset){
  if(!offset)return region;
  if(!shifted.has(region))shifted.set(region,new Map());
  const copies=shifted.get(region);if(copies.has(offset))return copies.get(offset);
  const copy={...region,planes:region.planes.map(([nx,nz,l])=>[nx,nz,l+nx*offset]),bounds:[region.bounds[0]+offset,region.bounds[1]+offset,region.bounds[2],region.bounds[3]]};
  copies.set(offset,copy);return copy;
 }
 const terrainKind=tile=>mountainRanges?.biomes.get(tile)||kind(tile);
 const rockPatches=(mountainRanges?.patches||[]).map(p=>{
  const color=new Color('#a0a99c').lerp(pigments[p.biome].base,p.kind==='summit'?.30:.52);
  return patch(p.x,p.z,p.angle,p.rx,p.rz,p.seed,color);
 });
 // Query local rock pigments instead of scanning the entire mountain range
 // for every tile. Keep source order: later pigments still paint over earlier.
 const rockBins=new Map(),rockBinSize=4;
 rockPatches.forEach((source,index)=>{
  // Include enough wrapped images even on tiny maps with broad rock patches.
  const reach=period?Math.ceil((source.bounds[1]-source.bounds[0]+2)/period)+1:0;
  for(let wrap=-reach;wrap<=reach;wrap++){
   const b=translated(source,wrap*period).bounds;
   for(let z=Math.floor(b[2]/rockBinSize);z<=Math.floor(b[3]/rockBinSize);z++)
    for(let x=Math.floor(b[0]/rockBinSize);x<=Math.floor(b[1]/rockBinSize);x++){
     const key=`${x}:${z}`;
     if(!rockBins.has(key))rockBins.set(key,new Set());
     rockBins.get(key).add(index);
    }
  }
 });
 const spacingX=2.55,spacingZ=2.15;
 function tileAt(x,z){
  const row=Math.round(z/1.5);let nearest=null,distance=Infinity;
  for(let r=Math.max(0,row-1);r<=Math.min(map.height-1,row+1);r++){
   const col=Math.round(x/Math.sqrt(3)-(r%2)*.5);
   if(col<0||col>=map.width)continue;
   const t=map.tiles[r*map.width+col],c=centre(t),d=(c.x-x)**2+(c.z-z)**2;
   if(d<distance){distance=d;nearest=t;}
  }
  return nearest;
 }
 function brushGroup(col,row){
  const key=`${col}:${row}`;
  if(groups.has(key))return groups.get(key);
  const h=hash(col+73,row-41),k=hash(col-29,row+137);
  const x=(col+.5)*spacingX+(h-.5)*.60,z=(row+.5)*spacingZ+(k-.5)*.55;
  const owner=tileAt(x,z),patches=[];
  if(owner&&!isWater(owner)){
   const p=pigments[terrainKind(owner)],turn=.35+.42*Math.sin(x*.20+z*.13)+(h-.5)*.55;
   const tangent=[Math.cos(turn),Math.sin(turn)],normal=[-tangent[1],tangent[0]];
   const add=(u,v,rx,rz,color,seed,twist=0)=>patches.push(patch(x+tangent[0]*u+normal[0]*v,z+tangent[1]*u+normal[1]*v,turn+twist,rx,rz,seed,color));
   // One broad area, a medium flank and a few small angular breaks. The
   // darker pieces touch or sit just outside the main shape's edge, so they
   // read as one irregular contour rather than uniformly scattered confetti.
   const length=1.18+h*.42,width=.40+k*.16;
   add(0,0,length,width,p.rich,h);
   add(.18,-.66,.62+k*.16,.24+h*.06,p.dry,k,-.18);
   add(-length*.44,width*.64,.27+h*.12,.13+k*.07,p.rich,k,.22);
   // A small recess and neighbouring fragments break the long boundary at
   // a different scale without adding a noisy sawtooth to its whole length.
   add(length*.20,width*.65,.16+k*.07,.09+h*.03,p.base,1-k,.40);
   add(length*.72,width*.61,.15+k*.10,.09+h*.04,p.rich,1-h,-.35);
   if(k>.40)add(-length*.65,-width*1.27,.12+h*.06,.07+k*.04,p.rich,1-k,.32);
   // A finer register of strokes: narrow dashes, short wedges and tiny cuts
   // near the larger brush edges. Their alignment follows the same gesture.
   for(let i=0;i<3+Math.floor(h*3);i++){
    const a=hash(col*17+i+41,row*23-19),b=hash(col*31-i-13,row*11+71);
    const u=(a*2-1)*length*1.12,v=(i%2?1:-1)*(width+.10+b*.26);
    add(u,v,.06+a*.14,.025+b*.035,i%3===0?p.dry:p.rich,b,(a-.5)*.48);
   }
  }
  patches.forEach((p,i)=>{p.order=[row,col,i]});
  groups.set(key,patches);return patches;
 }
 function regions(tile){
  if(cache.has(tile))return cache.get(tile);
  const c=centre(tile),p=pigments[terrainKind(tile)],patches=[];
  const row=Math.floor(c.z/spacingZ);
  // Painting belongs to the landscape, not the hex. Neighbours clip the same
  // large/small shapes, in the same order, so colour continues across joins.
  for(const offset of period?[-period,0,period]:[0]){
   const col=Math.floor((c.x-offset)/spacingX);
   for(let r=row-2;r<=row+2;r++)for(let q=col-2;q<=col+2;q++)for(const source of brushGroup(q,r)){
   const region=translated(source,offset);
   const [left,right,top,bottom]=region.bounds;
   if(right<c.x-1||left>c.x+1||bottom<c.z-1||top>c.z+1)continue;
   patches.push(region);
   }
  }
  if(period)patches.sort((a,b)=>a.order[0]-b.order[0]||a.order[1]-b.order[1]||a.order[2]-b.order[2]);
  const candidates=new Set();
  for(let z=Math.floor((c.z-1)/rockBinSize);z<=Math.floor((c.z+1)/rockBinSize);z++)
   for(let x=Math.floor((c.x-1)/rockBinSize);x<=Math.floor((c.x+1)/rockBinSize);x++)
    for(const index of rockBins.get(`${x}:${z}`)||[])candidates.add(index);
  for(const index of [...candidates].sort((a,b)=>a-b)){
   const source=rockPatches[index];
   const region=translated(source,period?Math.round((c.x-(source.bounds[0]+source.bounds[1])*.5)/period)*period:0);
   const [left,right,top,bottom]=region.bounds;
   if(right>=c.x-1&&left<=c.x+1&&bottom>=c.z-1&&top<=c.z+1)patches.push(region);
  }
  const result={base:p.base,patches};cache.set(tile,result);return result;
 }
 function sample(tile,x,z,out=new Color()){
  const {base,patches}=regions(tile);out.copy(base);
  for(const p of patches)if(p.planes.every(([nx,nz,l])=>x*nx+z*nz<=l))out.copy(p.color);
  return out;
 }
 function paint(geometry,tile){
  if(isWater(tile))return;
  const source=geometry.attributes.position,normals=geometry.attributes.normal;
  const {base,patches}=regions(tile),positions=[],colors=[],outputNormals=[];
  const plateCount=geometry.userData.plateVertexCount||0;
  const moundPigments=geometry.userData.moundPigments||[];let moundIndex=0;
  for(let i=0;i<source.count;i+=3){
   const triangle=[[source.getX(i),source.getY(i),source.getZ(i)],
    [source.getX(i+1),source.getY(i+1),source.getZ(i+1)],
    [source.getX(i+2),source.getY(i+2),source.getZ(i+2)]];
   const bounds=[Math.min(triangle[0][0],triangle[1][0],triangle[2][0]),Math.max(triangle[0][0],triangle[1][0],triangle[2][0]),
    Math.min(triangle[0][2],triangle[1][2],triangle[2][2]),Math.max(triangle[0][2],triangle[1][2],triangle[2][2])];
   while(moundIndex<moundPigments.length-1&&i>=moundPigments[moundIndex].end)moundIndex++;
   const moundKind=i>=plateCount?moundPigments[moundIndex]?.kind:null;
   let fragments=[{polygon:triangle,color:moundKind?pigments[moundKind].base:base}];
   // The established hill shapes read through their lighting planes. Leave
   // them intact instead of fragmenting every slope with more painted cuts.
   for(const p of i<plateCount?patches:[]){
    if(bounds[1]<p.bounds[0]||bounds[0]>p.bounds[1]||bounds[3]<p.bounds[2]||bounds[2]>p.bounds[3])continue;
    const next=[];
    for(const f of fragments){
     // Reject a separated fragment before slicing it with the other planes.
     // Otherwise an off-patch triangle gains needless same-colour slivers.
     if(p.planes.some(([nx,nz,l])=>f.polygon.every(v=>v[0]*nx+v[2]*nz>l))){next.push(f);continue}
     let remainder=f.polygon;
     for(const plane of p.planes){
      const [inside,outside]=split(remainder,plane);
      if(outside.length>=3)next.push({polygon:outside,color:f.color});
      remainder=inside;if(remainder.length<3)break;
     }
     if(remainder.length>=3)next.push({polygon:remainder,color:p.color});
    }
    fragments=next;
   }
   for(const {polygon,color}of fragments)for(let j=1;j<polygon.length-1;j++){
    const [a,b,c]=[polygon[0],polygon[j],polygon[j+1]];
    if(Math.abs((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]))<1e-10)continue;
    for(const v of [a,b,c]){
     positions.push(v[0],v[1],v[2]);colors.push(color.r,color.g,color.b);
     outputNormals.push(normals.getX(i),normals.getY(i),normals.getZ(i));
    }
   }
   if(i+3===plateCount)geometry.userData.plateVertexCount=positions.length/3;
  }
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  geometry.setAttribute('normal',new Float32BufferAttribute(outputNormals,3));
  geometry.userData.paintedSurfaceVertexCount=positions.length/3;
  // The chunk builder normally multiplies vertex colour by biome material.
  // These are already final linear pigments; do not apply that tint twice.
  geometry.userData.pigmentBaked=true;
  creases(geometry,tile);
 }
 function creases(geometry,tile){
  const c=centre(tile),positions=[],colors=[],color=new Color();
  for(let d=0;d<6;d++){
   if(!((tile.joinedEdges||0)&(1<<d)))continue;
   const other=neighbour(tile,map,d);
   if(!other||tile.row*map.width+tile.col>other.row*map.width+other.col)continue;
   const a=d*Math.PI/3,nx=Math.cos(a),nz=Math.sin(a),tx=-nz,tz=nx;
   const mx=c.x+nx*Math.sqrt(3)/2,mz=c.z+nz*Math.sqrt(3)/2;
   const seed=hash(Math.round(mx*32),Math.round(mz*32));
   const start=-.475+seed*.055,end=seed>.75?.22:.475,rings=[];
   for(let j=0;j<3;j++){
    const t=j/2,along=start+(end-start)*t,width=j===1?.0035:.0018;
    const bend=j===1?.003*Math.sin(mx+mz):0;
    const ring=[];
    for(const sign of [-1,1]){
     const x=mx+tx*along+nx*(bend+sign*width),z=mz+tz*along+nz*(bend+sign*width);
     // The crease straddles a joined edge; sample its owner side for height.
     const y=baseSurfaceHeight(tile,x-c.x-nx*.025,z-c.z-nz*.025)+.003;
     ring.push([x,y,z]);
    }
    rings.push(ring);
   }
   for(let j=0;j<2;j++)for(const triangle of [[rings[j][0],rings[j+1][0],rings[j][1]],[rings[j][1],rings[j+1][0],rings[j+1][1]]]){
    const [a,b,c]=triangle;
    if((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0])>0)triangle.reverse();
    for(const p of triangle){
     sample(tile,p[0],p[2],color);
     const middle=rings[1].includes(p),strength=middle?.78:.94;
     positions.push(...p);colors.push(color.r*strength,color.g*strength,color.b*strength);
    }
   }
  }
  if(!positions.length)return;
  for(const [name,extra]of [['position',positions],['color',colors],['normal',positions.map((_,i)=>i%3===1?1:0)]]){
   const old=geometry.attributes[name].array,combined=new Float32Array(old.length+extra.length);
   combined.set(old);combined.set(extra,old.length);geometry.setAttribute(name,new Float32BufferAttribute(combined,3));
  }
 }
 return {paint,sample};
}
