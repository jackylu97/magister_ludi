import {Color} from 'three';
import {centre,neighbour} from './surface.js';

export const TERRITORY_INSET=.16;
export const TERRITORY_WIDTH=.05;
export const TERRITORY_PRIMARY_WIDTH=.045;
export const TERRITORY_SECONDARY_WIDTH=.035;
const APOTHEM=Math.sqrt(3)/2;
// Exact integer vertex keys on the pointy hex lattice, in units of
// (sqrt(3)/2, 1/2). World coordinates alone accumulate rounding differences.
const corners=[[1,-1],[1,1],[0,2],[-1,1],[-1,-1],[0,-2]];
const tileKey=t=>`${t.col},${t.row}`;
const canonicalTile=(map,tile)=>{
 const {col,row}=tile;
 if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||row<0||col>=map.width||row>=map.height)
  throw new RangeError('Territory tile is outside the map');
 return map.tiles[row*map.width+col];
};

/**
 * Plan flat territory markings without changing map or ownership data.
 * Loops follow the original hex perimeter, without a repeated final vertex.
 * Owned land is always on the left: outer loops are CCW, holes are CW.
 * Polygons are convex, CCW ribbon quads ready for surfacePatch projection.
 * Tiles contains canonical map tiles touched by those quads, not interior tiles.
 * Uses the study's bounded, non-wrapping, unit-radius hex lattice.
 */
export function createTerritoryPlan(map,ownedTiles){
 const {loops,ribbons,tiles}=planRibbons(map,ownedTiles,[TERRITORY_INSET,TERRITORY_INSET+TERRITORY_WIDTH]);
 return {loops,polygons:ribbons[0],tiles};
}

function planRibbons(map,ownedTiles,offsets){
 const owned=new Map();
 for(const tile of ownedTiles){
  const canonical=canonicalTile(map,tile);
  owned.set(tileKey(canonical),canonical);
 }
 const vertices=new Map(),outgoing=new Map(),tiles=new Set();
 const vertex=(tile,corner)=>{
  const [u,v]=corners[corner],key=`${2*tile.col+tile.row%2+u},${3*tile.row+v}`;
  if(!vertices.has(key)){
   const c=centre(tile);
   vertices.set(key,{key,point:[c.x+u*APOTHEM,c.z+v*.5]});
  }
  return vertices.get(key);
 };
 // Sorting also makes duplicate / reordered ownership inputs produce identical
 // loops, ribbon polygons and touched-tile order.
 for(const tile of [...owned.values()].sort((a,b)=>a.row-b.row||a.col-b.col)){
  for(let d=0;d<6;d++){
   const other=neighbour(tile,map,d);
   if(other&&owned.has(tileKey(other)))continue;
   const a=vertex(tile,d),b=vertex(tile,(d+1)%6);
   outgoing.set(a.key,{a,b});tiles.add(tile);
  }
 }
 const loops=[],ribbons=offsets.slice(1).map(()=>[]),unvisited=new Set(outgoing.keys());
 while(unvisited.size){
  const start=unvisited.values().next().value,loop=[];
  let key=start;
  do{
   const edge=outgoing.get(key);
   if(!edge||!unvisited.delete(key))throw new Error('Territory perimeter is not a closed simple loop');
   loop.push(edge.a.point);key=edge.b.key;
  }while(key!==start);
  loops.push(loop);
  const left=(a,b)=>{
   const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   return [-dz/length,dx/length];
  };
  // Intersect adjacent offset edges once per corner. Reuse these exact rail
  // vertices on both quads, including concave corners and clockwise holes.
  const rails=loop.map((p,i)=>{
   const a=left(loop[(i+loop.length-1)%loop.length],p),b=left(p,loop[(i+1)%loop.length]);
   const denominator=1+a[0]*b[0]+a[1]*b[1];
   return offsets.map(distance=>[
    p[0]+(a[0]+b[0])*distance/denominator,
    p[1]+(a[1]+b[1])*distance/denominator
   ]);
  });
  for(let i=0;i<loop.length;i++){
   const a=rails[i],b=rails[(i+1)%loop.length];
   for(let band=0;band<ribbons.length;band++)ribbons[band].push([a[band],b[band],b[band+1],a[band+1]]);
  }
 }
 return {loops,ribbons,tiles};
}

// Canonical hex output keeps equivalent supported Three colour inputs stable
// under record reordering, and avoids Three silently accepting an invalid CSS
// value as white. Hex, CSS names, RGB integers and Color objects are supported.
function normalizeColor(value){
 if(typeof value==='string'){
  const hex=value.trim().toLowerCase();
  if(/^#[0-9a-f]{6}$/.test(hex))return hex;
  if(/^#[0-9a-f]{3}$/.test(hex))return '#'+[...hex.slice(1)].map(n=>n+n).join('');
  if(Object.hasOwn(Color.NAMES,hex))return '#'+Color.NAMES[hex].toString(16).padStart(6,'0');
 }
 if(typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=0xffffff)
  return '#'+value.toString(16).padStart(6,'0');
 if(value instanceof Color&&[value.r,value.g,value.b].every(n=>Number.isFinite(n)&&n>=0&&n<=1))
  return '#'+value.getHexString();
 throw new TypeError('Territory colours must be valid hex, CSS names, RGB integers or Three Color values');
}

/**
 * Combine records {id,colors:[primary,secondary],tiles}, merging all cities of
 * each owner before finding their perimeter. IDs are strings or finite numbers.
 * Primary is the outer .045 band; secondary is the inner .035 band. Both share
 * their middle rail exactly, including corners and holes. Colours normalize to
 * #rrggbb and each owner's records must agree on the same ordered pair.
 * Flat polygons / loops / tiles remain available for ground-fit checks.
 */
export function createTerritoriesPlan(map,territories){
 const owners=new Map(),claims=new Map();
 for(const {id,colors,tiles}of territories){
  if(typeof id!=='string'&&(typeof id!=='number'||!Number.isFinite(id)))
   throw new TypeError('Territory owner ID must be a string or finite number');
  if(!Array.isArray(colors)||colors.length!==2)throw new TypeError('Territory owners need exactly two colours');
  const pair=colors.map(normalizeColor);
  if(owners.has(id)&&owners.get(id).colors.some((color,i)=>color!==pair[i]))
   throw new Error(`Inconsistent territory colour pair for owner ${id}`);
  if(!owners.has(id))owners.set(id,{id,colors:pair,tiles:new Set()});
  const owner=owners.get(id);
  for(const tile of tiles){
   const canonical=canonicalTile(map,tile),key=tileKey(canonical);
   if(claims.has(key)&&claims.get(key)!==id)
    throw new Error(`Territory tile ${key} is claimed by multiple owners (${claims.get(key)}, ${id})`);
   claims.set(key,id);owner.tiles.add(canonical);
  }
 }
 const ordered=[...owners.values()].sort((a,b)=>{
  if(typeof a.id!==typeof b.id)return typeof a.id<typeof b.id?-1:1;
  return a.id<b.id?-1:a.id>b.id?1:0;
 });
 const offsets=[TERRITORY_INSET,TERRITORY_INSET+TERRITORY_PRIMARY_WIDTH,TERRITORY_INSET+TERRITORY_PRIMARY_WIDTH+TERRITORY_SECONDARY_WIDTH];
 const plans=ordered.map(({id,colors,tiles:owned})=>{
  const {loops,ribbons,tiles}=planRibbons(map,owned,offsets);
  const bands=colors.map((color,i)=>({color,polygons:ribbons[i]}));
  return {id,colors,bands,loops,polygons:ribbons.flat(),tiles};
 });
 return {
  territories:plans,
  loops:plans.flatMap(plan=>plan.loops),
  polygons:plans.flatMap(plan=>plan.polygons),
  tiles:new Set(plans.flatMap(plan=>[...plan.tiles]))
 };
}
