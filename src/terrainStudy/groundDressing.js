import {onTileTop,surfaceHeight} from './surface.js';

// Scenic accents on open land are deliberately smaller and much sparser
// than the five-tree forest treatment. No terrain/feature data is changed.
// `dense` (the visual test, 2026-11-12) asks for fuller tiles, as in the
// north-star games: several trees a hex (`slot` 0, 1, 2 ...), more often, and
// larger. Without it the placement is exactly the approved study's.
export function openLandTree(tile,hash,slot=0,dense=null){
 if(!['grassland','plains'].includes(tile.terrain))return null;
 if((tile.feature&&tile.feature!=='none')||tile.resource)return null;
 if(dense?.groves)return groveTree(tile,hash,slot,dense);
 const salt=slot*37;
 const chance=dense?(tile.terrain==='grassland'?dense.grassChance:dense.plainsChance):(tile.terrain==='grassland'?.14:.075);
 if(hash(tile.col,tile.row,1200+salt)>=chance)return null;
 for(let attempt=0;attempt<4;attempt++){
  const angle=hash(tile.col,tile.row,1210+attempt+salt)*Math.PI*2;
  const radius=(dense?.40:.49)+hash(tile.col,tile.row,1220+attempt+salt)*(dense?.26:.15);
  const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
  if(!onTileTop(tile,x,z,.17))continue;
  const y=surfaceHeight(tile,x,z);
  // Keep roots on a nearly level footprint, including on polygon hills.
  const heights=[[.08,0],[-.08,0],[0,.08],[0,-.08]].map(([dx,dz])=>surfaceHeight(tile,x+dx,z+dz));
  if(Math.max(y,...heights)-Math.min(y,...heights)>.04)continue;
  return {x,y,z,angle,scale:(dense?dense.scaleMin:.20)+hash(tile.col,tile.row,1230+salt)*(dense?dense.scaleSpan:.075),cypress:hash(tile.col,tile.row,1231+salt)>.78};
 }
 return null;
}

// Groves (the visual test, 2026-11-12): the reference games group their trees
// and leave meadow between the groups. A tile either has one grove, a few
// trees round one point, or no tree.
function groveTree(tile,hash,slot,dense){
 const chance=tile.terrain==='grassland'?dense.groveGrass:dense.grovePlains;
 if(hash(tile.col,tile.row,1300)>=chance)return null;
 const count=2+Math.floor(hash(tile.col,tile.row,1301)*(dense.groveSize-1));
 if(slot>=count)return null;
 const turn=hash(tile.col,tile.row,1302)*Math.PI*2,ax=Math.cos(turn)*.34,az=Math.sin(turn)*.34;
 for(let attempt=0;attempt<4;attempt++){
  const salt=slot*11+attempt;
  const angle=slot*2.4+hash(tile.col,tile.row,1310+salt)*1.2,radius=slot?dense.groveSpread*(.55+hash(tile.col,tile.row,1340+salt)*.45):0;
  const x=ax+Math.cos(angle)*radius,z=az+Math.sin(angle)*radius;
  if(!onTileTop(tile,x,z,.15))continue;
  const y=surfaceHeight(tile,x,z);
  const heights=[[.08,0],[-.08,0],[0,.08],[0,-.08]].map(([dx,dz])=>surfaceHeight(tile,x+dx,z+dz));
  if(Math.max(y,...heights)-Math.min(y,...heights)>.04)continue;
  // The first tree is the largest; the others step down round it.
  return {x,y,z,angle,scale:(dense.scaleMin+hash(tile.col,tile.row,1370+slot)*dense.scaleSpan)*(slot?.78:1.12),cypress:hash(tile.col,tile.row,1380+slot)>.8};
 }
 return null;
}

export function stoneCluster(tile,hash,dense=null){
 if(!['grassland','plains','tundra'].includes(tile.terrain)&&!(dense&&tile.terrain==='desert'))return [];
 if(hash(tile.col,tile.row,400)<(dense?1-dense.stoneChance:.70))return [];
 const angle=hash(tile.col,tile.row,410)*Math.PI*2;
 const x=Math.cos(angle)*.57,z=Math.sin(angle)*.57,result=[];
 // One low slab and two smaller broken pieces, instead of a miniature peak.
 for(const [i,dx,dz,size]of [[0,0,0,.17],[1,.16,.05,.095],[2,-.11,.13,.06]]){
  const px=x+Math.cos(angle)*dx-Math.sin(angle)*dz;
  const pz=z+Math.sin(angle)*dx+Math.cos(angle)*dz;
  if(!onTileTop(tile,px,pz,size*.75))continue;
  const s=size*(.88+hash(tile.col,tile.row,1260+i)*.24)*(dense?dense.stoneScale:1);
  result.push({x:px,y:surfaceHeight(tile,px,pz),z:pz,s,angle:angle+i*.43});
 }
 return result;
}
