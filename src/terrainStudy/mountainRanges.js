import {centre,neighbour,isWater,onTileTop,surfaceHeight,tileShape,terrainMapWraps} from './surface.js';
import {NORTH_STAR_CRAGS,NORTH_STAR_RANGE_COUNT,NORTH_STAR_FALLEN_ROCKS} from './northStarTrees.js';

const hash=(x,z,s)=>{let n=Math.imul(x+37,374761393)^Math.imul(z-19,668265263)^Math.imul(s+1,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296};
const mountain=t=>t?.terrain==='mountain';
const biome=t=>['oasis','floodplain'].includes(t.feature)?'grassland':t.terrain;

// A shared placement plan: tall summits, lower connecting saddles, then small
// outcrops in adjacent hills. All records reuse the existing sculpted assets.
export function createMountainRanges(map){
 const wrap=terrainMapWraps(map),period=Math.sqrt(3)*map.width;
 const localCentre=(tile,x)=>{
  const c=centre(tile);
  if(wrap)c.x+=Math.round((x-c.x)/period)*period;
  return c;
 };
 const biomes=new Map(),pieces=new Map(),patches=[],connections=[];
 const mountains=map.tiles.filter(mountain),seen=new Set();
 for(const first of mountains){
  if(seen.has(first))continue;
  const group=[first],votes=new Map();seen.add(first);
  for(let i=0;i<group.length;i++)for(let d=0;d<6;d++){
   const tile=group[i],n=neighbour(tile,map,d);if(!n||!(tile.joinedEdges&(1<<d)))continue;
   if(mountain(n)){if(!seen.has(n)){seen.add(n);group.push(n)}}
   else if(!isWater(n))votes.set(biome(n),(votes.get(biome(n))||0)+(n.hills?3:1));
  }
  const fallback=[...votes].sort((a,b)=>b[1]-a[1])[0]?.[0]||'tundra';
  for(const tile of group){
   const local=new Map();
   for(let d=0;d<6;d++){
    const n=neighbour(tile,map,d);if(!n||mountain(n)||isWater(n)||!(tile.joinedEdges&(1<<d)))continue;
    local.set(biome(n),(local.get(biome(n))||0)+(n.hills?3:1));
   }
   biomes.set(tile,[...local].sort((a,b)=>b[1]-a[1])[0]?.[0]||fallback);
  }
 }
 function add(owner,p,allowed,paint=true){
  // Conservative footprint samples keep the shared assets out of water and
  // neighbouring flat tiles. Dry mountain/hill joins can share the footprint.
  const inside=(x,z)=>allowed.some(t=>{
   const c=localCentre(t,x),shape=tileShape(t);
   const joined=d=>(t.joinedEdges&(1<<d))&&allowed.includes(neighbour(t,map,d));
   return shape.normals.every(([nx,nz],i)=>{
    const d=Math.floor(i/2),internal=i%2?joined(d)&&joined((d+1)%6):joined(d);
    return (x-c.x)*nx+(z-c.z)*nz<=shape.upper[i]+(internal?1e-7:-.025);
   });
  });
  const ca=Math.cos(p.angle),sa=Math.sin(p.angle);
  const saddle=p.kind==='saddle',minimum=saddle?.28:.58;
  let fit=1,fits=false;
  for(;;fit=Math.max(minimum,fit*.88)){
   fits=Array.from({length:12},(_,i)=>{
    const a=i*Math.PI/6,x=Math.cos(a)*p.sx*.83*(saddle?1:fit),z=Math.sin(a)*p.sz*.80*fit;
    return inside(p.x+x*ca+z*sa,p.z-x*sa+z*ca);
   }).every(Boolean);
   if(fits||fit===minimum)break;
  }
  if(!fits)return false;
  // Beside wet corners, narrow a saddle across the ridge while preserving
  // its span between peaks. Uniform shrinking would disconnect the range.
  p.sx*=saddle?1:fit;p.sz*=fit;p.sy*=Math.sqrt(saddle?.75+fit*.25:fit);
  const heights=[];
  for(const [u,v]of [[0,0],[-.25,0],[.25,0],[0,-.25],[0,.25]]){
   const x=p.x+u*p.sx,z=p.z+v*p.sz;
   for(const t of allowed){const c=localCentre(t,x);if(onTileTop(t,x-c.x,z-c.z))heights.push(surfaceHeight(t,x-c.x,z-c.z))}
  }
  p.y=Math.min(...heights)-Math.min(.11,p.sy*.16);
  if(!Number.isFinite(p.y))return false;
  if(!pieces.has(owner))pieces.set(owner,[]);pieces.get(owner).push(p);
  // A loose stone paints no rock on the ground under it.
  if(paint)patches.push({x:p.x,z:p.z,angle:-p.angle,rx:p.sx*.87,rz:p.sz*.85,seed:hash(owner.col,owner.row,940+patches.length),biome:p.biome,kind:p.kind});
  return true;
 }
 for(const tile of mountains){
  const c=centre(tile),h=s=>hash(tile.col,tile.row,s),connected=[];
  for(let d=0;d<6;d++)if(tile.joinedEdges&(1<<d)){
   const n=neighbour(tile,map,d);if(n&&(mountain(n)||n.hills)&&n.feature!=='oasis')connected.push({tile:n,d});
  }
  // A crag is modelled to be seen from the south with the sun in the east (its
  // sheer face is at the front right), so it is turned between the two: from a
  // little west of south to about half way to the east. Its width and depth
  // also vary a little, each on its own, so two of one model do not match. An escarpment
  // turns toward its first neighbour, or anywhere when it stands alone.
  const angle=NORTH_STAR_CRAGS?.3+(h(2)-.5)*1.0:connected.length?-connected[0].d*Math.PI/3+(h(2)-.5)*.7:h(2)*Math.PI*2;
  add(tile,{kind:'summit',x:c.x,z:c.z,sx:NORTH_STAR_CRAGS?.84+h(5)*.14:.92,sz:NORTH_STAR_CRAGS?.84+h(6)*.12:.90,sy:1.0+h(3)*.38,angle,variant:Math.floor(h(4)*NORTH_STAR_RANGE_COUNT),biome:biomes.get(tile)},[tile,...connected.map(n=>n.tile)]);
  for(const {tile:n,d}of connected){
   const nc=localCentre(n,c.x),a=d*Math.PI/3,dx=nc.x-c.x,dz=nc.z-c.z;
   if(mountain(n)){
    if(tile.row*map.width+tile.col>n.row*map.width+n.col)continue;
    const piece={kind:'saddle',asset:'shoulder',x:(c.x+nc.x)/2,z:(c.z+nc.z)/2,sx:1.04,sz:.68+h(20+d)*.10,sy:.36+h(30+d)*.15,angle:-a+(h(40+d)-.5)*.16,variant:(Math.floor(h(4)*3)+1)%3,biome:biomes.get(tile)};
    if(add(tile,piece,[tile,n]))connections.push({from:tile,to:n,kind:'range',piece});
   }else if(!NORTH_STAR_FALLEN_ROCKS){
    const turn=-a+(h(50+d)-.5)*.3,k=biome(n);
    // Unequal shoulders step down in height and footprint into the hill.
    for(const [i,t,size,height]of [[0,.43,.70,.36],[1,.83,.46,.28]]){
     const offset=(h(70+d*3+i)-.5)*.16;
     const piece={kind:'foothill',asset:i?'talus':'shoulder',x:c.x+dx*t-Math.sin(a)*offset,z:c.z+dz*t+Math.cos(a)*offset,sx:size*(.92+h(80+d+i)*.16),sz:size*.92,sy:height,angle:turn+i*.45,variant:(i+d)%3,biome:k};
     if(add(tile,piece,[tile,n])&&i===0)connections.push({from:tile,to:n,kind:'foothill',piece});
    }
   }
  }
  if(NORTH_STAR_FALLEN_ROCKS)fallenRock(tile,c,h,angle,connected.filter(n=>!mountain(n.tile)));
 }
 // The low rock between a mountain and its hills (the user, 2026-11-16: "rocks
 // at the base that feel too evenly distributed, pointed outward radially").
 // Before, every hill beside a mountain got one low block and one stone, at the
 // same two distances and turned along the line to the hill, so a mountain in
 // the hills wore a ring of equal blocks. Now the hills are ranked, a hill under
 // the mountain's sheer face first, and each rank gets less: one large block
 // with stones beside it, then a small block or a few stones, then a single
 // stone or nothing. Each piece has its own place, size and turn.
 function fallenRock(tile,c,h,angle,hills){
  // The sheer face is at the model's front right, which the mountain's turn moves.
  const sheer=Math.PI/4-angle;
  const ranked=hills.map(n=>({...n,score:h(200+n.d)+.6*Math.max(0,Math.cos(n.d*Math.PI/3-sheer))})).sort((p,q)=>q.score-p.score);
  ranked.forEach(({tile:n,d},rank)=>{
   const g=i=>h(210+d*20+i),nc=localCentre(n,c.x),a=d*Math.PI/3,dx=nc.x-c.x,dz=nc.z-c.z,k=biome(n);
   const along=(t,side)=>({x:c.x+dx*t-Math.sin(a)*side,z:c.z+dz*t+Math.cos(a)*side});
   const role=rank===0?'large':rank===1?(g(0)<.55?'small':'stones'):rank===2?(g(0)<.5?'stones':'stray'):g(0)<.3?'stray':'bare';
   if(role==='bare')return;
   let block=null;
   if(role==='large'||role==='small'){
    const size=role==='large'?.58+g(1)*.2:.36+g(1)*.14;
    const piece={kind:'foothill',asset:'shoulder',...along(.34+g(2)*.16,(g(3)-.5)*.34),sx:size*(.85+g(4)*.4),sz:size*(.8+g(5)*.3),sy:(role==='large'?.3:.2)+g(6)*.12,angle:g(7)*Math.PI*2,variant:Math.floor(g(8)*NORTH_STAR_RANGE_COUNT),biome:k};
    if(add(tile,piece,[tile,n])){connections.push({from:tile,to:n,kind:'foothill',piece});block=piece}
   }
   const stones=role==='large'?1+Math.floor(g(9)*2.6):role==='small'?Math.floor(g(9)*2.4):role==='stones'?2+Math.floor(g(9)*1.8):1;
   // The first stone lies beside the block, or by itself on the way to the hill. Each later one lies against the one before, and is smaller.
   let last=null;
   for(let i=0;i<stones;i++){
    const size=last?last.size*(.42+g(10+i)*.36):role==='stray'?.14+g(10)*.12:.26+g(10)*.16,turn=a+(g(13+i)-.5)*(last?5:2.6);
    const from=last||(block?{x:block.x,z:block.z,reach:Math.max(block.sx,block.sz)*.5}:{...along(.46+g(16)*.2,(g(17)-.5)*.5),reach:0});
    const reach=from.reach+size*.42;
    const piece={kind:'foothill',asset:'talus',x:from.x+Math.cos(turn)*reach,z:from.z+Math.sin(turn)*reach,sx:size*(.85+g(19+i)*.4),sz:size*(.8+g(22+i)*.4),sy:size*(.4+g(25+i)*.4),angle:g(28+i)*Math.PI*2,variant:0,biome:k};
    if(add(tile,piece,[tile,n],false))last={x:piece.x,z:piece.z,size,reach:size*.4};
   }
  });
 }
 return {biomes,pieces,patches,connections};
}
