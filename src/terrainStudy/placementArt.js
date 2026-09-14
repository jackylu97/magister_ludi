import {centre} from './surface.js';
import {roadRibbonPolygons,marking,projectMarkings,distanceToRoad} from './surfaceMarkings.js';

export function createPlacementArt(roads,territory,material){
 const bands=territory.territories.flatMap(owner=>owner.bands);
 const marks=[
  ...roadRibbonPolygons(roads.paths,.14).map(p=>marking(p,'#a3977e',.016)),
  ...roadRibbonPolygons(roads.paths,.114).map(p=>marking(p,'#c2b28f',.019)),
  ...bands.flatMap(band=>band.polygons.map(p=>marking(p,band.color,.013))),
 ];
 const byTile=new Map();
 for(const t of new Set([...roads.tiles,...territory.tiles])){
  const c=centre(t),local=marks.filter(m=>m.bounds.maxX>=c.x-1&&m.bounds.minX<=c.x+1&&m.bounds.maxZ>=c.z-1&&m.bounds.minZ<=c.z+1);
  if(local.length)byTile.set(t,local);
 }
 return {
  tiles:new Set(byTile.keys()),
  reserved(t,x,z){const c=centre(t);return roads.tiles.has(t)&&distanceToRoad(roads.paths,c.x+x,c.z+z)<.23},
  tile(t,top,{push}){for(const g of projectMarkings(top,byTile.get(t)||[]))push(material,g)},
 };
}
