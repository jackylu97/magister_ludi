import {centre,isWater,neighbour} from './surface.js';

// Staged ownership stays separate from mapgen. Colours follow docs/leaders.md;
// the reusable planner accepts the primary/secondary pair of any civilization.
export function createTerritoryStudy(map,cityTiles){
 const tiles=[...cityTiles],territories=[{
  id:'mithridates',label:'Mithridates · purple / silver',
  colors:['#6b2d7a','#d8d8e0'],tiles
 }];
 // Find an open boundary face for inspecting both bands at normal close zoom.
 const candidates=tiles.flatMap(t=>{
  if(isWater(t)||t.terrain==='mountain')return [];
  return Array.from({length:6},(_,d)=>{
   const other=neighbour(t,map,d);if(!other||cityTiles.has(other))return null;
   const a=centre(t),b=centre(other);
   return {x:a.x+(b.x-a.x)*.38,z:a.z+(b.z-a.z)*.38,
    score:(t.feature&&t.feature!=='none'?4:0)+(t.hills?2:0)+(t.riverEdges?4:0)+(isWater(other)?2:0)};
  }).filter(Boolean);
 }).sort((a,b)=>a.score-b.score||b.z-a.z||a.x-b.x);
 return {territories,borderFocus:candidates[0]||null};
}
