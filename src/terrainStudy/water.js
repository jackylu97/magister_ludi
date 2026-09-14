import * as T from 'three';
import {centre,isWater,neighbour,tileShape,WATER_LEVEL,LAND_LEVEL,BANK_TOE} from './surface.js';

// Water is a level sheet under each cut land tile. The bank geometry defines
// its visible outline, so joins need no overlapping discs or bulging ribbons.
export function flatWater(tile) {
 const c=centre(tile),positions=[];
 for(let i=0;i<6;i++){
  const a=Math.PI/6+i*Math.PI/3,b=a+Math.PI/3;
  positions.push(c.x,WATER_LEVEL,c.z,c.x+Math.cos(b),WATER_LEVEL,c.z+Math.sin(b),c.x+Math.cos(a),WATER_LEVEL,c.z+Math.sin(a));
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.computeVertexNormals();return geometry;
}
export function waterDetails(tile,map,push,materials){
 if(!isWater(tile)&&(tile.riverEdges||tile.shoreEdges))push(materials.river,flatWater(tile));
}

// Sparse half-submerged shelves give the water a tangible tabletop edge.
// Rivers remain clear; these use the existing instanced limestone asset.
export function shoreStones(tile,map,hash){
 if(isWater(tile)||!tile.shoreEdges||hash(tile.col,tile.row,1400)>.32)return [];
 const edges=Array.from({length:6},(_,d)=>d).filter(d=>isWater(neighbour(tile,map,d)||{}));
 if(!edges.length)return [];
 const d=edges[Math.floor(hash(tile.col,tile.row,1401)*edges.length)],angle=d*Math.PI/3;
 const nx=Math.cos(angle),nz=Math.sin(angle),tx=-nz,tz=nx,shape=tileShape(tile);
 const t=(LAND_LEVEL-WATER_LEVEL)/(LAND_LEVEL-BANK_TOE),distance=shape.upper[d*2]*(1-t)+shape.lower[d*2]*t;
 const along=(hash(tile.col,tile.row,1402)-.5)*.46,stones=[];
 for(const [i,u,v,size]of [[0,0,.055,.15],[1,.15,.10,.09],[2,-.10,.13,.055]]){
  const x=nx*(distance+v)+tx*(along+u),z=nz*(distance+v)+tz*(along+u);
  stones.push({x,z,y:WATER_LEVEL-.045,s:size*(.85+hash(tile.col,tile.row,1410+i)*.25),angle:angle+.4+i*.7});
 }
 return stones;
}
