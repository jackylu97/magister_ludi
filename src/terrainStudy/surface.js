// Shared dimensions and cut planes for terrain, water and prop placement.
import {makeHillMounds,moundSurfaceHeight,createMapHillMounds} from './hillMounds.js';
export const WATER_LEVEL = .04;
export const LAND_LEVEL = .12;
export const BANK_TOE = .005;
export const RIVER_HALF_WIDTH = .075;
const APOTHEM = Math.sqrt(3) / 2;
const normals = Array.from({length:6}, (_,i) => [Math.cos(i*Math.PI/3), Math.sin(i*Math.PI/3)]);
const shapes = new Map();
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
   if(other&&!isWater(tile)&&!isWater(other)&&!((tile.riverEdges||0)&(1<<d))
     &&!((other.riverEdges||0)&(1<<((d+3)%6))))joinedEdges|=1<<d;
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
   if(((tile.riverEdges|tile.shoreEdges)&adjacent(d))
    ||((other.riverEdges|other.shoreEdges)&adjacent(opposite)))tile.bankJoinEdges|=1<<d;
  }
 }
 const mounds=createMapHillMounds(result,{centre,neighbour,tileShape,baseHeight:baseSurfaceHeight,wrap});
 for(const [tile,pieces]of mounds)moundCache.set(tile,pieces);
 return result;
}

// Carry the already-built hill contacts across the worker boundary. WeakMap
// entries cannot be structured-cloned; rebuilding them would repeat the most
// expensive part of preparation on the UI thread.
export function packTerrainMap(map) {
 return {map,wrap:terrainMapWraps(map),mounds:map.tiles.map(tile=>moundCache.get(tile)||null)};
}
export function restoreTerrainMap({map,wrap,mounds}) {
 if(wrap)wrappingMaps.add(map);
 map.tiles.forEach((tile,i)=>{if(mounds[i])moundCache.set(tile,mounds[i])});
 return map;
}

export function tileShape(tile) {
 const river=tile.riverEdges||0,shore=tile.shoreEdges||0,joined=tile.joinedEdges||0,key=river|(shore<<6)|(joined<<12);
 if(shapes.has(key))return shapes.get(key);
 const upper=normals.map((_,d)=>APOTHEM-((river&(1<<d))? .125:(shore&(1<<d))? .055:(joined&(1<<d))?0:.005));
 const lower=normals.map((_,d)=>APOTHEM-((river&(1<<d))? RIVER_HALF_WIDTH:0));
 const intersect=([ax,az],al,[bx,bz],bl)=>{
  const det=ax*bz-az*bx;
  return [(al*bz-az*bl)/det,(ax*bl-al*bx)/det];
 };
 const cutNormals=[],cutUpper=[],cutLower=[];
 for(let i=0;i<6;i++){
  const j=(i+1)%6,angle=(i+.5)*Math.PI/3,n=[Math.cos(angle),Math.sin(angle)];
  const top=intersect(normals[i],upper[i],normals[j],upper[j]);
  const toe=intersect(normals[i],lower[i],normals[j],lower[j]);
  const wet=((river|shore)&((1<<i)|(1<<j)))!==0;
  // One large cut at a wet corner. No noise along the bank, and no rounded
  // end caps: the outline consists of deliberate, broad planar faces.
  const cut=wet?.065:.0008;
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

export function baseSurfaceHeight(tile,x,z){
 if(isWater(tile))return WATER_LEVEL;
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
 return BANK_TOE+(height-BANK_TOE)*bankWeight(tile,x,z);
}
