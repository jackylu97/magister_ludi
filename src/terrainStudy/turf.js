import * as T from 'three';
import {centre,surfaceHeight,onTileTop} from './surface.js';

// Composed tufts use a few broad, folded blades. Each tuft reads as a small
// silhouette rather than a spray of tiny dark strokes across the ground.
export function sculptedTurf(tile,push,material,hash){
 if(!['grassland','plains','tundra'].includes(tile.terrain))return;
 const c=centre(tile),positions=[],colors=[];
 const groups=tile.feature==='forest'||tile.feature==='jungle'?2:1+(hash(tile.col,tile.row,799)>.40?1:0);
 for(let group=0;group<groups;group++){
  const a=hash(tile.col,tile.row,800+group)*Math.PI*2,d=.48+hash(tile.col,tile.row,810+group)*.23;
  for(let i=0;i<5;i++){
   const id=group*5+i,angle=a+(hash(tile.col,tile.row,820+id)-.5)*1.8;
   const r=Math.sqrt(hash(tile.col,tile.row,880+id))*.085;
   const x=Math.cos(a)*d+Math.cos(angle)*r,z=Math.sin(a)*d+Math.sin(angle)*r;
   if(!onTileTop(tile,x,z,.065))continue;
   const y=surfaceHeight(tile,x,z)-.003,h=(i===0?.095:.042)+hash(tile.col,tile.row,940+id)*.030;
   const width=.012+hash(tile.col,tile.row,960+id)*.010;
   const dx=Math.cos(angle)*width,dz=Math.sin(angle)*width;
   const left=[c.x+x-dx,y,c.z+z-dz],right=[c.x+x+dx,y,c.z+z+dz];
   const ridge=[c.x+x-Math.sin(angle)*.016,y+h*.52,c.z+z+Math.cos(angle)*.016];
   const tip=[c.x+x+Math.sin(angle)*.025,y+h,c.z+z-Math.cos(angle)*.025];
   for(const [face,shade]of [[[left,right,ridge],.90],[[left,ridge,tip],1.08],[[ridge,right,tip],.94]]){
    // Both sides remain visible with the shared front-sided ground material.
    for(const winding of [face,[...face].reverse()])for(const v of winding){positions.push(...v);colors.push(shade,shade,shade*.91);}
   }
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();push(material,g);
}
