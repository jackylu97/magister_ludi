// Shared dimensions and cut planes for terrain, water and prop placement.
import {makeHillMounds,moundSurfaceHeight,createMapHillMounds} from './hillMounds.js';
export const WATER_LEVEL = .04;
export const LAND_LEVEL = .12;
export const BANK_TOE = .005;
export const RIVER_HALF_WIDTH = .075;
const APOTHEM = Math.sqrt(3) / 2;
const normals = Array.from({length:6}, (_,i) => [Math.cos(i*Math.PI/3), Math.sin(i*Math.PI/3)]);
const shapes = new Map();

// The river cut, as three numbers: how far the crest of each bank stands back
// from the hex edge, how far its toe does, and the chamfer at a wet corner.
// The approved study's values are the default. The visual test version
// (batch V1, `src/render3d/visualTest.ts`) can ask for thinner rivers, or for
// `organic` rivers: no cut at all, the ground joined across the river edge,
// and the river painted on it as one smooth ribbon (`organicRivers.js`). A
// change clears the shape cache and moves `riverStyleKey`, which the terrain
// mesh's own cache reads, and the board must then be built again.
const STUDY_RIVER = {crest:.125, toe:RIVER_HALF_WIDTH, corner:.065, organic:false, clearance:0};
let river = STUDY_RIVER, riverKey = 0;
export function setRiverStyle(style = null) {
 const next = style ? {crest:style.crest, toe:style.toe, corner:style.corner, organic:!!style.organic, clearance:style.clearance||0} : STUDY_RIVER;
 if (next.crest === river.crest && next.toe === river.toe && next.corner === river.corner
  && next.organic === river.organic && next.clearance === river.clearance) return false;
 river = next; riverKey++; shapes.clear();
 return true;
}
/** The river edges the ground is cut along: none for an organic river, which is painted. */
export function cutRiverEdges(tile) { return river.organic ? 0 : tile.riverEdges||0; }
export function riverStyleKey() { return riverKey; }
export function riverStyle() { return river === STUDY_RIVER ? null : {...river}; }
// A free coast (the visual test, 2026-11-13): whether the board that is built
// next gives its shore one smooth line (`freeCoast.js`). Like the river style,
// the page sets it and tells the worker.
let freeCoast = false;
export function setCoastStyle(free) { free = !!free; if (free === freeCoast) return false; freeCoast = free; return true; }
export function coastStyle() { return freeCoast; }
// Wrapping belongs to a prepared render map, never to simulation tiles or the
// standalone study's global state.
const wrappingMaps = new WeakSet();
export function terrainMapWraps(map){return wrappingMaps.has(map)}
export function isWater(tile){return ['ocean','coast','lake'].includes(tile.terrain)}
export function centre(tile){return {x:Math.sqrt(3)*(tile.col+(tile.row%2)*.5),z:tile.row*1.5}}

export function neighbour(tile, map, direction) {
 const c=centre(tile),[nx,nz]=normals[direction];
 const row=Math.round((c.z+nz*Math.sqrt(3))/1.5);
 let col=Math.round((c.x+nx*Math.sqrt(3))/Math.sqrt(3)-(row%2)*.5);
 if(wrappingMaps.has(map))col=((col%map.width)+map.width)%map.width;
 return row>=0&&row<map.height&&col>=0&&col<map.width ? map.tiles[row*map.width+col] : null;
}

// Rendering metadata lives on a copy; generation and gameplay data stay intact.
export function prepareTerrainMap(map,{wrap=false}={}) {
 const result={...map,tiles:map.tiles.map(tile=>({...tile}))};
 if(wrap)wrappingMaps.add(result);
 for(const tile of result.tiles){
  let shoreEdges=0,joinedEdges=0;
  for(let d=0;d<6;d++){
   const other=neighbour(tile,result,d);
   if(other&&isWater(other))shoreEdges|=1<<d;
   if(other&&!isWater(tile)&&!isWater(other)&&!(cutRiverEdges(tile)&(1<<d))
     &&!(cutRiverEdges(other)&(1<<((d+3)%6))))joinedEdges|=1<<d;
  }
  Object.assign(tile,{shoreEdges,joinedEdges});
 }
 // At a river junction, one tile can extend beyond the neighbour's chamfer.
 // Retain its bank wall there even though the middle of the edge is joined.
 for(const tile of result.tiles){
  tile.bankJoinEdges=0;
  for(let d=0;d<6;d++)if(tile.joinedEdges&(1<<d)){
   const other=neighbour(tile,result,d),opposite=(d+3)%6;
   const adjacent=k=>(1<<((k+1)%6))|(1<<((k+5)%6));
   if(((cutRiverEdges(tile)|tile.shoreEdges)&adjacent(d))
    ||((cutRiverEdges(other)|other.shoreEdges)&adjacent(opposite)))tile.bankJoinEdges|=1<<d;
  }
 }
 const mounds=createMapHillMounds(result,{centre,neighbour,tileShape,baseHeight:baseSurfaceHeight,wrap});
 for(const [tile,pieces]of mounds)moundCache.set(tile,pieces);
 return result;
}

// Carry the already-built hill contacts across the worker boundary. WeakMap
// entries cannot be structured-cloned; rebuilding them would repeat the most
// expensive part of preparation on the UI thread.
//
// The mounds' faces travel as one Float64Array of corners, nine numbers a
// triangle, and not as arrays of [x, y, z] (the fourth render speed pass).
// Copying nested arrays costs a step for every number and every array; a typed
// array is copied as bytes. A double holds every number exactly, and each
// piece's other fields travel beside it in their own order, so the restored
// mounds equal the built ones field for field. One thing is not kept: in a
// built mound two faces may share one corner array, and restored faces each
// have their own. Nothing writes to a mound's corners after it is built, so
// nothing can tell.
export function packTerrainMap(map) {
 const lists=map.tiles.map(tile=>moundCache.get(tile)||null);
 return {map,wrap:terrainMapWraps(map),mounds:packMounds(lists)??lists};
}
export function restoreTerrainMap({map,wrap,mounds}) {
 if(wrap)wrappingMaps.add(map);
 if(Array.isArray(mounds)){map.tiles.forEach((tile,i)=>{if(mounds[i])moundCache.set(tile,mounds[i])});return map}
 const {present,pieces,faces,corners,rest}=mounds;
 let piece=0,at=0;
 map.tiles.forEach((tile,i)=>{
  if(!present[i])return;
  const list=[];
  for(let k=0;k<pieces[i];k++,piece++){
   const triangles=[];
   for(let f=0;f<faces[piece];f++,at+=9)triangles.push([[corners[at],corners[at+1],corners[at+2]],[corners[at+3],corners[at+4],corners[at+5]],[corners[at+6],corners[at+7],corners[at+8]]]);
   list.push({faces:triangles,...rest[piece]});
  }
  moundCache.set(tile,list);
 });
 return map;
}
/** The packed form of `restoreTerrainMap`, or null when a mound is not made of triangles with `faces` as its first field. */
function packMounds(lists){
 const present=new Uint8Array(lists.length),pieces=new Uint32Array(lists.length),faces=[],rest=[];
 let total=0;
 for(let i=0;i<lists.length;i++){
  const list=lists[i];if(!list)continue;
  present[i]=1;pieces[i]=list.length;
  for(const piece of list){
   if(Object.keys(piece)[0]!=='faces')return null;
   for(const face of piece.faces)if(face.length!==3||face.some(corner=>corner.length!==3))return null;
   const {faces:own,...others}=piece;
   faces.push(own.length);rest.push(others);total+=own.length*9;
  }
 }
 const corners=new Float64Array(total);
 let at=0;
 for(const list of lists)if(list)for(const {faces:own}of list)for(const face of own)for(const corner of face){corners[at++]=corner[0];corners[at++]=corner[1];corners[at++]=corner[2]}
 return {present,pieces,faces:Uint32Array.from(faces),corners,rest};
}

/** The edges where this hex's ground runs on into the next hex with no bank: land joins, and every shore edge of a free coast. */
export function joinedEdgesOf(tile){return tile.coast?(tile.joinedEdges||0)|(tile.shoreEdges||0):tile.joinedEdges||0}
/** The edges that keep a bank wall beside a join. A free coast has no bank, so none. */
export function bankJoinEdgesOf(tile){return tile.coast?0:tile.bankJoinEdges||0}
/** The outline of a water hex that carries a free coast's ground: a plain hex, joined on every side. */
export const OPEN_HEX={joinedEdges:63};

export function tileShape(tile) {
 // A free coast (`tile.coast`) has no bank along a shore edge: the ground runs on and slopes under the water.
 const riverBits=cutRiverEdges(tile),shore=tile.coast?0:tile.shoreEdges||0,joined=joinedEdgesOf(tile),key=riverBits|(shore<<6)|(joined<<12);
 if(shapes.has(key))return shapes.get(key);
 const upper=normals.map((_,d)=>APOTHEM-((riverBits&(1<<d))? river.crest:(shore&(1<<d))? .055:(joined&(1<<d))?0:.005));
 const lower=normals.map((_,d)=>APOTHEM-((riverBits&(1<<d))? river.toe:0));
 const intersect=([ax,az],al,[bx,bz],bl)=>{
  const det=ax*bz-az*bx;
  return [(al*bz-az*bl)/det,(ax*bl-al*bx)/det];
 };
 const cutNormals=[],cutUpper=[],cutLower=[];
 for(let i=0;i<6;i++){
  const j=(i+1)%6,angle=(i+.5)*Math.PI/3,n=[Math.cos(angle),Math.sin(angle)];
  const top=intersect(normals[i],upper[i],normals[j],upper[j]);
  const toe=intersect(normals[i],lower[i],normals[j],lower[j]);
  const wet=((riverBits|shore)&((1<<i)|(1<<j)))!==0;
  // One large cut at a wet corner. No noise along the bank, and no rounded
  // end caps: the outline consists of deliberate, broad planar faces.
  const riverCorner=(riverBits&((1<<i)|(1<<j)))!==0;
  const cut=riverCorner?river.corner:wet?.065:.0008;
  cutNormals.push(normals[i],n);
  cutUpper.push(upper[i],top[0]*n[0]+top[1]*n[1]-cut);
  cutLower.push(lower[i],toe[0]*n[0]+toe[1]*n[1]-cut*.42);
 }
 const polygon=limits=>cutNormals.map((n,i)=>intersect(n,limits[i],cutNormals[(i+1)%12],limits[(i+1)%12]));
 const shape={upper:cutUpper,lower:cutLower,normals:cutNormals,top:polygon(cutUpper),toe:polygon(cutLower)};
 shapes.set(key,shape);return shape;
}

export function bankWeight(tile,x,z) {
 const {upper,lower,normals:planes}=tileShape(tile);
 return planes.reduce((weight,[nx,nz],i)=>{
  const width=lower[i]-upper[i],distance=lower[i]-x*nx-z*nz;
  // Joined dry edges have no bevel. Handle the zero-width plane explicitly.
  return Math.min(weight,width<1e-8?(distance>=-1e-8?1:0):Math.max(0,Math.min(1,distance/width)));
 },1);
}

// Keep props off the cut bank, accounting for their footprint as well as height.
export function onTileTop(tile,x,z,margin=0) {
 if(isWater(tile))return false;
 const {upper,normals:planes}=tileShape(tile);
 // An organic river is painted on joined ground, so nothing else keeps a tree
 // or a stone off it: props stand back `clearance` from each river edge.
 if(river.organic&&tile.riverEdges)for(let d=0;d<6;d++)
  if((tile.riverEdges&(1<<d))&&x*normals[d][0]+z*normals[d][1]>APOTHEM-river.clearance-margin)return false;
 // Nothing stands on a free coast's beach.
 if(tile.coast){const at=coastAt(tile,x,z);if(at.edge<at.beach+margin)return false}
 return planes.every(([nx,nz],i)=>x*nx+z*nz<=upper[i]-margin)
  && surfaceHeight(tile,x,z)>WATER_LEVEL+.035;
}

const moundCache=new WeakMap();
export function hillMounds(tile){
 if(!tile.hills||isWater(tile)||tile.terrain==='mountain'||tile.feature==='oasis')return [];
 if(!moundCache.has(tile))moundCache.set(tile,makeHillMounds(tile,tileShape(tile),(x,z)=>baseSurfaceHeight(tile,x,z)));
 return moundCache.get(tile);
}

export function surfaceHeight(tile,x,z){
 return moundSurfaceHeight(hillMounds(tile),x,z,baseSurfaceHeight(tile,x,z));
}

// The cut of a free river (the visual test, 2026-11-13). A hex near an organic
// river carries `riverCarve`: {depth, bank, key, segments}, where `segments` is
// a flat list of eight numbers a piece of the river's line, in the hex's own
// coordinates: x, z, half width and depth share at each end. The ground drops
// by `depth` under the water and rises in a straight slope over `bank` beside
// it. The board sets it when it is built (`paintedBoard.js`); the terrain mesh
// adds vertices along it (`terrainMesh.js`).
/** How far a point is from the water's edge (negative in the water), and the depth share there. */
export function riverCarveAt(tile,x,z){
 const carve=tile.riverCarve;if(!carve)return null;
 const s=carve.segments;let edge=Infinity,share=0;
 for(let i=0;i<s.length;i+=8){
  const ax=s[i],az=s[i+1],bx=s[i+4],bz=s[i+5],dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz;
  const t=l>1e-12?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l)):0;
  const e=Math.hypot(x-ax-dx*t,z-az-dz*t)-(s[i+2]+(s[i+6]-s[i+2])*t);
  if(e<edge){edge=e;share=s[i+3]+(s[i+7]-s[i+3])*t}
 }
 return {edge,share};
}
function riverCut(tile,x,z){
 const at=riverCarveAt(tile,x,z);if(!at)return 0;
 return tile.riverCarve.depth*at.share*Math.max(0,Math.min(1,1-at.edge/tile.riverCarve.bank));
}

// A free coast (the visual test, 2026-11-13). A hex beside the shore carries
// `coast`: {under, key, segments}. `segments` is a flat list of ten numbers a
// piece of the waterline, in the hex's own coordinates: x, z, the unit normal
// that points to the land, and the beach's width, at each end. The ground is at
// the water's level on the line, rises in one straight slope over the beach's
// width, and goes on down the same slope under the water to `under` below it.
// The board sets it when it is built (`freeCoast.js`); the terrain mesh adds
// vertices along it (`terrainMesh.js`). A water hex carries it too, because the
// line fills a corner of sea as often as it rounds a corner of land.
export const COAST_STRIDE=10;
/** How far a point is from the waterline (negative in the water), and the beach's width there. */
export function coastAt(tile,x,z){
 const coast=tile.coast;if(!coast)return null;
 const s=coast.segments;let best=Infinity,edge=0,beach=0;
 for(let i=0;i<s.length;i+=COAST_STRIDE){
  const ax=s[i],az=s[i+1],dx=s[i+5]-ax,dz=s[i+6]-az,l=dx*dx+dz*dz;
  const t=l>1e-12?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l)):0;
  const px=x-ax-dx*t,pz=z-az-dz*t,d=px*px+pz*pz;
  if(d<best){
   best=d;
   const nx=s[i+2]+(s[i+7]-s[i+2])*t,nz=s[i+3]+(s[i+8]-s[i+3])*t;
   edge=(px*nx+pz*nz>=0?1:-1)*Math.sqrt(d);beach=s[i+4]+(s[i+9]-s[i+4])*t;
  }
 }
 return {edge,beach};
}
function coastGround(tile,x,z,base){
 const at=coastAt(tile,x,z);if(!at||at.edge>=at.beach)return base;
 return Math.max(WATER_LEVEL-tile.coast.under,WATER_LEVEL+(base-WATER_LEVEL)*at.edge/at.beach);
}
/** The ground a free coast lays in a water hex, which is under the water over most of it. */
export function coastApronHeight(tile,x,z){return coastGround(tile,x,z,LAND_LEVEL)}

export function baseSurfaceHeight(tile,x,z){
 // On a water hex a thing stands on the water, or on the beach where the coast's ground is above it.
 if(isWater(tile))return tile.coast?Math.max(WATER_LEVEL,coastGround(tile,x,z,LAND_LEVEL)):WATER_LEVEL;
 const {upper,normals:planes}=tileShape(tile);
 const edge=Math.min(...planes.map(([nx,nz],i)=>upper[i]-x*nx-z*nz));
 const c=centre(tile),u=c.x+x,v=c.z+z;
 // Broad facets carry the shape. Micro relief must not inflate the slab or
 // disturb the deliberate straight riverbank cuts.
 const relief=.008*Math.sin(u*2.7+v*.8)*Math.cos(v*3.1)*Math.max(0,Math.min(1,edge/.18));
 let height=LAND_LEVEL+relief;
 if(tile.feature==='oasis'){
  const r=Math.hypot((x+.1*Math.sin(z*6))/.55,z/.43),t=Math.max(0,Math.min(1,(r-.65)/.65));
  height=.008+(LAND_LEVEL-.008)*t*t*(3-2*t);
 }
 const ground=BANK_TOE+(height-BANK_TOE)*bankWeight(tile,x,z)-riverCut(tile,x,z);
 return tile.coast?coastGround(tile,x,z,ground):ground;
}
