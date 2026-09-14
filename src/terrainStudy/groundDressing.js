import {onTileTop,surfaceHeight} from './surface.js';

// Scenic accents on open land are deliberately smaller and much sparser
// than the five-tree forest treatment. No terrain/feature data is changed.
export function openLandTree(tile,hash){
 if(!['grassland','plains'].includes(tile.terrain))return null;
 if((tile.feature&&tile.feature!=='none')||tile.resource)return null;
 const chance=tile.terrain==='grassland'?.14:.075;
 if(hash(tile.col,tile.row,1200)>=chance)return null;
 for(let attempt=0;attempt<4;attempt++){
  const angle=hash(tile.col,tile.row,1210+attempt)*Math.PI*2;
  const radius=.49+hash(tile.col,tile.row,1220+attempt)*.15;
  const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
  if(!onTileTop(tile,x,z,.17))continue;
  const y=surfaceHeight(tile,x,z);
  // Keep roots on a nearly level footprint, including on polygon hills.
  const heights=[[.08,0],[-.08,0],[0,.08],[0,-.08]].map(([dx,dz])=>surfaceHeight(tile,x+dx,z+dz));
  if(Math.max(y,...heights)-Math.min(y,...heights)>.04)continue;
  return {x,y,z,angle,scale:.20+hash(tile.col,tile.row,1230)*.075,cypress:hash(tile.col,tile.row,1231)>.78};
 }
 return null;
}

export function stoneCluster(tile,hash){
 if(!['grassland','plains','tundra'].includes(tile.terrain))return [];
 if(hash(tile.col,tile.row,400)<.70)return [];
 const angle=hash(tile.col,tile.row,410)*Math.PI*2;
 const x=Math.cos(angle)*.57,z=Math.sin(angle)*.57,result=[];
 // One low slab and two smaller broken pieces, instead of a miniature peak.
 for(const [i,dx,dz,size]of [[0,0,0,.17],[1,.16,.05,.095],[2,-.11,.13,.06]]){
  const px=x+Math.cos(angle)*dx-Math.sin(angle)*dz;
  const pz=z+Math.sin(angle)*dx+Math.cos(angle)*dz;
  if(!onTileTop(tile,px,pz,size*.75))continue;
  const s=size*(.88+hash(tile.col,tile.row,1260+i)*.24);
  result.push({x:px,y:surfaceHeight(tile,px,pz),z:pz,s,angle:angle+i*.43});
 }
 return result;
}
