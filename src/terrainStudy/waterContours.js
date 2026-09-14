import {centre,isWater,neighbour,tileShape,LAND_LEVEL,WATER_LEVEL,BANK_TOE,terrainMapWraps} from './surface.js';

const key=p=>`${Math.round(p[0]*1e6)}:${Math.round(p[1]*1e6)}`;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const corner=(c,d)=>[c.x+Math.cos(d*Math.PI/3),c.z+Math.sin(d*Math.PI/3)];
function periodicCoordinates(map){
 const period=terrainMapWraps(map)?Math.sqrt(3)*map.width:0;
 const nodeKey=p=>{
  if(!period)return key(p);
  let x=((p[0]%period)+period)%period;
  if(Math.min(x,period-x)<1e-6)x=0;
  return key([x,p[1]]);
 };
 const nearby=(p,previous)=>period&&previous?[p[0]+Math.round((previous[0]-p[0])/period)*period,p[1]]:p;
 return {period,nodeKey,nearby};
}

// Trace the land/water boundary across the map, before adding any pigment.
// Hex corners identify neighbours; the rendered bank supplies the actual path.
export function coastPaths(map){
 const {period,nodeKey,nearby}=periodicCoordinates(map);
 const edges=[],starts=new Map(),ends=new Map();
 const t=(LAND_LEVEL-WATER_LEVEL)/(LAND_LEVEL-BANK_TOE);
 for(const tile of map.tiles){
  if(isWater(tile))continue;
  const c=centre(tile),shape=tileShape(tile);
  for(let d=0;d<6;d++){
   const other=neighbour(tile,map,d);if(!other||!isWater(other))continue;
   const edge={start:nodeKey(corner(c,d-.5)),end:nodeKey(corner(c,d+.5)),lake:other.terrain==='lake',
    points:[(d*2+11)%12,d*2].map(i=>[c.x+shape.top[i][0]*(1-t)+shape.toe[i][0]*t,c.z+shape.top[i][1]*(1-t)+shape.toe[i][1]*t])};
   edges.push(edge);starts.set(edge.start,edge);ends.set(edge.end,edge);
  }
 }
 const seen=new Set(),paths=[];
 for(const first of [...edges.filter(e=>!ends.has(e.start)),...edges]){
  if(seen.has(first))continue;
  const points=[];let edge=first,lake=false;
  while(edge&&!seen.has(edge)){
   seen.add(edge);for(const p of edge.points)points.push(nearby(p,points.at(-1)));lake||=edge.lake;edge=starts.get(edge.end);
  }
  let closed=edge===first;
  // A coast can circle the cylinder. Keep its planar ribbon local at the
  // cut and supply neighbouring points so its endpoint miters agree.
  if(closed&&period){
   const winding=Math.round((points.at(-1)[0]-points[0][0])/period);
   if(winding){
    const beginning=points.slice(0,2).map(p=>[p[0]+winding*period,p[1]]);
    const ending=points.slice(-2).map(p=>[p[0]-winding*period,p[1]]);
    points.unshift(...ending);points.push(...beginning);closed=false;
   }
  }
  paths.push({points:points.filter((p,i)=>!i||distance(p,points[i-1])>1e-7),closed,lake});
 }
 return paths;
}

// Shared miter vertices, including both sides of each join. A ribbon segment
// uses exactly the same endpoint as its neighbour, rather than overlapping
// independent tapered stamps. Offsets are world-space distances.
export function offsetPath(points,width,closed=false){
 return points.map((p,i)=>{
  const before=i?points[i-1]:closed?points.at(-1):p;
  const after=i<points.length-1?points[i+1]:closed?points[0]:p;
  const normal=(a,b)=>{const l=distance(a,b);return l>1e-8?[(b[1]-a[1])/l,-(b[0]-a[0])/l]:null};
  let a=normal(before,p),b=normal(p,after);a||=b;b||=a;
  const dot=a[0]*b[0]+a[1]*b[1],w=typeof width==='function'?width(p):width;
  const scale=w/Math.max(.35,1+dot);
  return [p[0]+(a[0]+b[0])*scale,p[1]+(a[1]+b[1])*scale];
 });
}

export function ribbonPolygons(points,innerWidth,outerWidth,closed=false){
 const inner=offsetPath(points,innerWidth,closed),outer=offsetPath(points,outerWidth,closed),polygons=[];
 for(let i=0;i<points.length-(closed?0:1);i++){
  const next=(i+1)%points.length;
  polygons.push([inner[i],inner[next],outer[next],outer[i]]);
 }
 return {polygons,inner,outer};
}

// Branches are split only at confluences, never at tile boundaries. Keeping a
// bank side for the whole path prevents a highlight jumping across each bend.
export function riverPaths(map){
 const {period,nodeKey,nearby}=periodicCoordinates(map);
 const nodes=new Map(),edges=new Map(),waterCorners=new Map();
 for(const tile of map.tiles)if(isWater(tile)){
  const c=centre(tile);
  for(let d=0;d<6;d++)waterCorners.set(nodeKey(corner(c,d+.5)),tile.terrain);
 }
 function node(p){const k=nodeKey(p);if(!nodes.has(k))nodes.set(k,{point:p,edges:[],water:waterCorners.get(k)});return nodes.get(k)}
 for(const tile of map.tiles){
  if(isWater(tile))continue;
  const c=centre(tile);
  for(let d=0;d<6;d++)if((tile.riverEdges||0)&(1<<d)){
   const a=node(corner(c,d-.5)),b=node(corner(c,d+.5)),k=[nodeKey(a.point),nodeKey(b.point)].sort().join('/');
   if(edges.has(k))continue;
   const edge={a,b};edges.set(k,edge);a.edges.push(edge);b.edges.push(edge);
  }
 }
 const seen=new Set(),paths=[];
 function walk(start,first){
  const points=[start.point];let current=start,edge=first;
  while(edge&&!seen.has(edge)){
   seen.add(edge);current=edge.a===current?edge.b:edge.a;points.push(nearby(current.point,points.at(-1)));
   if(current.edges.length!==2)break;
   edge=current.edges.find(e=>!seen.has(e));
  }
  let closed=current===start;
  const winding=period?Math.round((points.at(-1)[0]-points[0][0])/period):0;
  if(closed&&!winding)points.pop();
  if(closed&&winding){
   const beginning=points.slice(1,3).map(p=>[p[0]+winding*period,p[1]]);
   const ending=points.slice(-3,-1).map(p=>[p[0]-winding*period,p[1]]);
   points.unshift(...ending);points.push(...beginning);closed=false;
  }
  let facing=0;
  for(let i=1;i<points.length;i++)facing+=(points[i][1]-points[i-1][1])*1.7+(points[i][0]-points[i-1][0])*1.2;
  if(Math.abs(facing)<1e-8)facing=(points[1][1]-points[0][1])*1.7+(points[1][0]-points[0][0])*1.2;
  const path={points,closed,side:facing>=0?-1:1,start,end:current};paths.push(path);
 }
 for(const n of nodes.values())if(n.edges.length!==2)for(const e of n.edges)if(!seen.has(e))walk(n,e);
 for(const e of edges.values())if(!seen.has(e))walk(e.a,e);
 return {paths,nodes:[...nodes.values()]};
}

// Carry the receiving water's shallow pigment around the mouth and up its
// light bank. The asymmetric tip ends inside the river, never across its
// full width. Keeping the shape on the level water also opens the contact
// line where the coast contour would otherwise close across the mouth.
export function riverMouths(network){
 const mouths=[];
 for(const path of network.paths){
  if(path.closed)continue;
  for(const [node,i,next]of [[path.start,0,1],[path.end,path.points.length-1,path.points.length-2]]){
   if(!node.water||node.edges.length!==1)continue;
   const p=path.points[i],q=path.points[next],length=distance(p,q),u=[(q[0]-p[0])/length,(q[1]-p[1])/length];
   const side=i===0?path.side:-path.side,n=[u[1]*side,-u[0]*side];
   const shape=[[-.18,-.16],[.11,-.105],[.38,-.015],[.72,.014],[.54,.13],[.08,.17],[-.18,.23]];
   mouths.push({water:node.water,point:p,direction:u,normal:n,
    points:shape.map(([along,across])=>[p[0]+u[0]*along+n[0]*across,p[1]+u[1]*along+n[1]*across])});
  }
 }
 return mouths;
}
