import {centre,isWater,neighbour,onTileTop,surfaceHeight} from './surface.js';
import {farmLayout} from './farmPaint.js';

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const point=t=>{const c=centre(t);return [c.x,c.z]};
function segmentDistance(p,a,b){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
 const u=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length)):0;
 return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz);
}

// Art-only roads: an undirected graph owns every segment once, so the renderer
// can fit one connected ribbon through junctions instead of overlapping routes.
export function createRoadPlan(map,settlements,units){
 const city=settlements.sites.city,paths=[],tiles=new Set(),ownedTiles=new Set(),review={city},inaccessible=[];
 if(!city)return {paths,tiles,ownedTiles,review,inaccessible};
 const origin=point(city),dry=t=>t&&!isWater(t)&&t.terrain!=='mountain'&&t.feature!=='oasis';
 const river=(t,n,d)=>!!(((t.riverEdges||0)&(1<<d))||((n.riverEdges||0)&(1<<((d+3)%6))));
 // Ownership may span a river; the road graph below may not. Keep the territory
 // contiguous and small enough to judge its full outline with the settlement.
 const territoryQueue=[[city,0]];ownedTiles.add(city);
 for(let i=0;i<territoryQueue.length;i++){
  const [t,depth]=territoryQueue[i];if(depth===2)continue;
  for(let d=0;d<6;d++){
   const n=neighbour(t,map,d);if(!n||isWater(n)||ownedTiles.has(n))continue;
   ownedTiles.add(n);territoryQueue.push([n,depth+1]);
  }
 }
 review.borderForest=[...ownedTiles].find(t=>['forest','jungle'].includes(t.feature)&&Array.from({length:6},(_,d)=>neighbour(t,map,d)).some(n=>!ownedTiles.has(n)));

 const nodes=[],parts=new Map(),network=new Set(),usedEdges=new Map();
 const addNode=(t,x,z)=>{const p=point(t),n={id:nodes.length,tile:t,p:[p[0]+x,p[1]+z],edges:[]};nodes.push(n);return n};
 const connect=(a,b,multiplier=1)=>{
  if(!a||!b||a===b)return;
  const cost=distance(a.p,b.p)*multiplier;a.edges.push([b,cost]);b.edges.push([a,cost]);
 };
 const remember=(a,b)=>{const key=a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;usedEdges.set(key,[a,b]);network.add(a);network.add(b);tiles.add(a.tile);tiles.add(b.tile)};
 for(const t of map.tiles){
  const e=settlements.entries.get(t);
  if(t===city||!dry(t)||distance(point(t),origin)>10||e?.site||t.discovery||units?.entries.has(t))continue;
  const farm=e?.improvement==='farm'?farmLayout(t):null;
  const obstacles=[];
  if(e?.resource&&!farm)obstacles.push({p:[0,0],radius:.51});
  if(e?.improvement==='mine')obstacles.push({p:[.06,.23],radius:.34});
  if(e?.improvement==='quarry')obstacles.push({p:[.22,.26],radius:.36});
  if(e?.improvement==='camp')obstacles.push({p:[-.35,.39],radius:.28});
  if(e?.improvement==='plantation')obstacles.push({p:[.42,.42],radius:.23});
  if(farm)obstacles.push({p:[farm.house.x,farm.house.z],radius:.20});
  const c=point(t),local=n=>[n.p[0]-c[0],n.p[1]-c[1]];
  const clear=(a,b)=>obstacles.every(o=>segmentDistance(o.p,local(a),local(b))>o.radius);
  const rim=Array.from({length:12},(_,d)=>{
   const a=d*Math.PI/6;let r=.76;
   while(r>.54&&!onTileTop(t,Math.cos(a)*r,Math.sin(a)*r,.10))r-=.025;
   return addNode(t,Math.cos(a)*r,Math.sin(a)*r);
  });
  for(let d=0;d<12;d++)if(clear(rim[d],rim[(d+1)%12]))connect(rim[d],rim[(d+1)%12],t.hills?1.12:1);
  let middle;
  if(farm||(!e?.resource&&!e?.improvement)){
   middle=addNode(t,0,0);
   for(let d=0;d<6;d++)if(clear(middle,rim[d*2]))connect(middle,rim[d*2],t.hills?1.12:1);
  }
  const edges=Array.from({length:6},(_,d)=>{
   const a=d*Math.PI/3,n=addNode(t,Math.cos(a)*Math.sqrt(3)/2,Math.sin(a)*Math.sqrt(3)/2);
   // Diagonal approaches join the shoulder directly. A forced radial stub at
   // every shared edge creates a little right-angle kink in otherwise quiet
   // bends, especially along a field's headland.
   for(const offset of [-1,0,1]){
    const shoulder=rim[(d*2+offset+12)%12];if(clear(shoulder,n))connect(shoulder,n);
   }return n;
  });
  const targets=[];
  if(farm){
   const h=farm.house;
   for(let d=0;d<12;d++){
    const a=d*Math.PI/6,x=h.x+Math.cos(a)*.22,z=h.z+Math.sin(a)*.22;
    if(!onTileTop(t,x,z,.10))continue;
    const target=addNode(t,x,z);
    for(const n of rim)if(clear(target,n))connect(target,n);
    if(middle&&clear(target,middle))connect(target,middle);
    if(target.edges.length)targets.push(target);
   }
  }else if(['camp','mine','pasture'].includes(e?.improvement)){
   // These are access points, not arbitrary points on the tile rim. The tent
   // door and mine rails face south; the pasture already has a south opening.
   const yards={camp:[[-.17,.65]],mine:[[.06,.60]],pasture:[[0,.63]]};
   for(const [x,z]of yards[e.improvement]){
    if(!onTileTop(t,x,z,.10))continue;
    const target=addNode(t,x,z);
    if(e.improvement==='pasture'){
     // Stay normal to the fence through its opening, clear of the gateposts.
     const approach=addNode(t,0,.74);connect(target,approach);
     for(const n of rim)if(clear(approach,n))connect(approach,n);
    }else for(const n of rim)if(clear(target,n))connect(target,n);
    if(target.edges.length)targets.push(target);
   }
  }
  parts.set(t,{rim,middle,edges,targets});
 }
 for(const [t,part]of parts)for(let d=0;d<3;d++){
  const n=neighbour(t,map,d),other=parts.get(n);
  if(other&&!river(t,n,d))connect(part.edges[d],other.edges[(d+3)%6]);
 }
 // The only road through the city wall uses its existing south gate. Start in
 // the clear forecourt and stay outside the palisade while bending to an edge.
 const gate=addNode(city,0,.28),exit=addNode(city,0,.91);connect(gate,exit);
 network.add(gate);remember(gate,exit);
 const exits=[];
 for(const d of [1,2]){
  const n=neighbour(city,map,d),part=parts.get(n);if(!part||river(city,n,d))continue;
  const sign=d===1?1:-1,bend=addNode(city,sign*.20,.90),edge=addNode(city,sign*Math.sqrt(3)/4,.75);
  connect(exit,bend);connect(bend,edge);connect(edge,part.edges[(d+3)%6]);exits.push(edge);
 }
 if(!exits.length)return {paths:[],tiles:new Set(),ownedTiles,review,inaccessible:['city gate']};

 function route(candidates){
  const goals=new Set(candidates.filter(Boolean));if(!goals.size)return false;
  // This bounded graph has only a few thousand nodes; a stable queue makes
  // route choice deterministic without depending on iteration timing.
  const scores=new Map(),previous=new Map(),queue=[];
  for(const n of network){scores.set(n,0);queue.push(n)}
  while(queue.length){
   queue.sort((a,b)=>scores.get(b)-scores.get(a)||b.id-a.id);
   const n=queue.pop();if(goals.has(n)){
    let current=n;while(previous.has(current)){const before=previous.get(current);remember(before,current);current=before}return n;
   }
   for(const [other,cost]of n.edges){
    const next=scores.get(n)+cost;
    if(next>=(scores.get(other)??Infinity)-1e-8)continue;
    scores.set(other,next);previous.set(other,n);if(!queue.includes(other))queue.push(other);
   }
  }return false;
 }
 for(const name of ['farm','hillFarm','mine','camp','pasture']){
  const t=settlements.sites[name],part=parts.get(t);
  const targets=part?.targets.length?part.targets:part?.rim;
  if(!route(targets||[]))inaccessible.push(name);
 }
 // A hill road is useful even when the staged hill farm is cut off by water.
 if(![...tiles].some(t=>t.hills)){
  const hill=[...parts].filter(([t,p])=>t.hills&&p.middle).sort(([a],[b])=>distance(point(a),origin)-distance(point(b),origin));
  for(const [t,p]of hill)if(route([p.middle])){review.hill=t;break}
 }
 function hillRelief(){
  const relief=new Map();
  for(const [a,b]of usedEdges.values()){
   const length=distance(a.p,b.p),steps=Math.ceil(length/.08);if(!steps)continue;
   for(let i=0;i<=steps;i++){
    const u=i/steps,x=a.p[0]+(b.p[0]-a.p[0])*u,z=a.p[1]+(b.p[1]-a.p[1])*u;
    for(const t of new Set([a.tile,b.tile])){
     if(!t.hills)continue;const c=point(t);if(!onTileTop(t,x-c[0],z-c[1]))continue;
     const h=surfaceHeight(t,x-c[0],z-c[1]),entry=relief.get(t)||{height:0,length:0};
     entry.height=Math.max(entry.height,h);if(h>.24)entry.length+=length/(steps+1);relief.set(t,entry);
    }
   }
  }
  return [...relief].sort(([,a],[,b])=>b.length-a.length||b.height-a.height);
 }
 // A route can touch a hill tile while remaining on its flat apron. Add a
 // short ascent onto a nearby unoccupied mound when that is all this seed
 // offers; this fixture must actually demonstrate the road surface fitting.
 if((hillRelief()[0]?.[1].length||0)<.75){
  const peaks=[];
  for(const [t,p]of parts){
   const e=settlements.entries.get(t);if(!t.hills||!p.middle||e?.resource||e?.improvement||distance(point(t),origin)>5)continue;
   const c=point(t);let peak;
   for(let x=-.4;x<=.401;x+=.2)for(let z=-.4;z<=.401;z+=.2){
    if(!onTileTop(t,x,z,.12))continue;const height=surfaceHeight(t,x,z);
    if(height>.28&&(!peak||height>peak.height))peak={t,p,x,z,height};
   }
   if(peak){
    peak.score=(tiles.has(t)?0:2)+Math.min(...[...network].map(n=>distance(n.p,[c[0]+peak.x,c[1]+peak.z])))-peak.height*.2;
    peaks.push(peak);
   }
  }
  peaks.sort((a,b)=>a.score-b.score);
  for(const peak of peaks){
   const {t,p,x,z}=peak,target=addNode(t,x,z);connect(target,p.middle);
   for(const n of p.rim)connect(target,n);
   if(route([target])){review.hill=t;break}
  }
 }
 review.hill=hillRelief()[0]?.[0]||review.hill;
 const adjacency=new Map();
 for(const [a,b]of usedEdges.values()){
  if(distance(a.p,b.p)<1e-8)continue;
  (adjacency.get(a)||adjacency.set(a,[]).get(a)).push(b);
  (adjacency.get(b)||adjacency.set(b,[]).get(b)).push(a);
 }
 // Equal edge midpoints on neighbouring tiles become a single vertex. This
 // also keeps full-width intersection caps continuous at tile boundaries.
 const canonical=new Map(),joined=new Map();
 for(const [a,others]of adjacency){
  const key=a.p.map(v=>v.toFixed(7)).join(',');if(!canonical.has(key))canonical.set(key,a);
 }
 for(const [a,others]of adjacency){
  const key=a.p.map(v=>v.toFixed(7)).join(','),root=canonical.get(key);
  const neighbours=joined.get(root)||new Set();joined.set(root,neighbours);
  for(const b of others){const other=canonical.get(b.p.map(v=>v.toFixed(7)).join(','));if(other!==root)neighbours.add(other)}
 }
 const walked=new Set(),edgeKey=(a,b)=>a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;
 function walk(start,next){
  const path=[start.p];let before=start,current=next;walked.add(edgeKey(before,current));
  while(true){
   path.push(current.p);const near=[...joined.get(current)];if(near.length!==2)break;
   const following=near.find(n=>n!==before);if(walked.has(edgeKey(current,following)))break;
   walked.add(edgeKey(current,following));before=current;current=following;
  }
  if(path.length>1)paths.push(path);
 }
 for(const [n,others]of joined)if(others.size!==2)for(const other of others)if(!walked.has(edgeKey(n,other)))walk(n,other);
 for(const [n,others]of joined)for(const other of others)if(!walked.has(edgeKey(n,other)))walk(n,other);
 review.hill??=[...tiles].find(t=>t.hills);
 review.junction=[...joined].find(([n,others])=>n.tile!==city&&others.size>=3)?.[0].tile||city;
 return {paths,tiles,ownedTiles,review,inaccessible};
}
