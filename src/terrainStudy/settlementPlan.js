import {centre,isWater,neighbour} from './surface.js';
import {resourceFamilies} from './resourceCatalog.js';

// Explicit, deterministic art examples on a generated map. Metadata is kept
// outside the tiles, so these farms and the city never change game/mapgen data.
export function createSettlementPlan(map){
 const entries=new Map(map.tiles.map(t=>[t,{resource:t.resource,site:t.discovery}])),sites={},discoverySites={};
 for(const t of map.tiles)if(t.discovery)(discoverySites[t.discovery]??=[]).push(t);
 const distance=(a,b)=>{const x=centre(a),y=centre(b);return Math.hypot(x.x-y.x,x.z-y.z)};
 const dry=t=>!isWater(t)&&t.terrain!=='mountain'&&!['oasis','forest','jungle'].includes(t.feature);
 const fertile=t=>dry(t)&&['grassland','plains'].includes(t.terrain);
 const candidates=map.tiles.filter(t=>fertile(t)&&!t.discovery&&!t.hills&&!t.riverEdges&&!t.shoreEdges);
 const score=t=>{
  let score=-distance(t,{col:map.width*.5,row:map.height*.5})*.09;
  for(let dr=-3;dr<=3;dr++)for(let dc=-3;dc<=3;dc++){
   const row=t.row+dr,col=t.col+dc;
   if(row<0||row>=map.height||col<0||col>=map.width)continue;
   const n=map.tiles[row*map.width+col];if(distance(t,n)>=4.5)continue;
   score+=(fertile(n)?2:0)+(fertile(n)&&n.hills?3:0)-(isWater(n)?2:0)-(n.terrain==='mountain'?3:0);
  }return score;
 };
 candidates.sort((a,b)=>score(b)-score(a));
 const city=candidates[0];if(!city)return {entries,sites,discoverySites};
 for(const tiles of Object.values(discoverySites))tiles.sort((a,b)=>
  (distance(a,city)+(a.hills?8:0)+(a.feature==='forest'?3:0))-(distance(b,city)+(b.hills?8:0)+(b.feature==='forest'?3:0)));
 entries.set(city,{city:true});sites.city=city;
 const used=new Set([city]);
 function choose(name,predicate,entry){
  const options=map.tiles.filter(t=>!used.has(t)&&!t.discovery&&predicate(t));
  options.sort((a,b)=>distance(a,city)-distance(b,city));
  const tile=options[0];if(!tile)return;
  used.add(tile);entries.set(tile,entry);sites[name]=tile;
 }
 choose('hillFarm',t=>fertile(t)&&t.hills&&!Array.from({length:6},(_,d)=>neighbour(t,map,d)).some(n=>n?.terrain==='mountain'),{resource:'wheat',improvement:'farm'});
 choose('farm',t=>fertile(t)&&!t.hills,{resource:'wheat',improvement:'farm'});
 choose('pasture',t=>fertile(t)&&!t.hills,{resource:'horses',improvement:'pasture'});
 choose('cattle',t=>fertile(t)&&!t.hills,{resource:'cattle'});
 choose('bison',t=>fertile(t)&&!t.hills,{resource:'bison'});
 choose('mine',t=>dry(t)&&t.hills,{resource:'iron',improvement:'mine'});
 choose('plantation',t=>fertile(t)&&!t.hills,{resource:'wine',improvement:'plantation'});
 choose('quarry',t=>dry(t)&&!t.hills,{resource:'stone',improvement:'quarry'});
 choose('camp',t=>t.feature==='forest'&&!t.hills,{resource:'deer',improvement:'camp'});
 choose('boats',t=>t.terrain==='coast',{resource:'fish',improvement:'fishingBoats'});
 // Camps live in GameState, not mapgen tiles. This one is explicitly staged.
 choose('barbarianCamp',t=>dry(t)&&!t.hills&&!t.resource&&distance(t,city)>5&&!t.shoreEdges&&!t.riverEdges&&!Array.from({length:6},(_,d)=>neighbour(t,map,d)).some(n=>n?.terrain==='mountain'),{site:'barbarianCamp'});
 if(sites.barbarianCamp)discoverySites.barbarianCamp=[sites.barbarianCamp];
 for(const [tile,{resource}]of entries)if(resource&&!sites[resource])sites[resource]=tile;
 const counts={};for(const {resource}of entries.values())if(resource){const family=resourceFamilies[resource]||'unknown';counts[family]=(counts[family]||0)+1}
 return {entries,sites,counts,discoverySites};
}
