import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {centre,isWater,onTileTop,surfaceHeight,WATER_LEVEL} from './surface.js';
import {surfacePatch} from './surfacePatch.js';
import {resourceFamilies,animalAsset,resourceColors} from './resourceCatalog.js';
import {crag} from './shapes.js';
import {indexGeometry} from './indexGeometry.js';
import {farmPaint,farmLayout} from './farmPaint.js';
import {createLumbermillGeometry} from './lumbermillGeometry.js';
import {createSpecialWorkGeometry} from './specialWorkGeometry.js';

function colored(g,color){
 const c=new T.Color(color),p=g.attributes.position,colors=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++)colors.set([c.r,c.g,c.b],i*3);
 g.setAttribute('color',new T.BufferAttribute(colors,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(p.count*2),2));return g;
}
function box(w,h,d,color){const g=new T.BoxGeometry(w,h,d);g.translate(0,h/2,0);return colored(g,color)}

// A wall or column gets its own support. Keeping these separate leaves the
// original terrain exposed inside courtyards, including a unit's standing spot.
function supportPrism(points,bottom,top){
 const polygon=[...points];
 const area=polygon.reduce((sum,p,i)=>{const next=polygon[(i+1)%polygon.length];return sum+p.x*next.z-next.x*p.z},0);
 if(area>0)polygon.reverse();
 const positions=[],add=(a,b,c)=>positions.push(...a,...b,...c);
 for(let i=1;i<polygon.length-1;i++)add([polygon[0].x,top,polygon[0].z],[polygon[i].x,top,polygon[i].z],[polygon[i+1].x,top,polygon[i+1].z]);
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  add([a.x,top,a.z],[a.x,bottom,a.z],[b.x,bottom,b.z]);
  add([a.x,top,a.z],[b.x,bottom,b.z],[b.x,top,b.z]);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();
 colored(g,'#b7b49d');g.deleteAttribute('uv');return g;
}

export function createSettlementArt(assets,paintedStyle){
 const material=assets.material;
 const mill=createLumbermillGeometry();
 const special=createSpecialWorkGeometry();
 const fields=new T.MeshStandardMaterial({color:'white',vertexColors:true,roughness:.96,flatShading:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 paintedStyle.register(fields,{terrain:true});
 const peg=box(.026,.16,.026,'#988363'),rail=box(1,.026,.019,'#aa9674');
 const pointedTop=colored(new T.ConeGeometry(.022,.045,4),'#b09a72');pointedTop.rotateY(Math.PI/4);pointedTop.translate(0,.177,0);
 const shaft=box(.034,.16,.034,'#938062'),palisade=mergeGeometries([shaft,pointedTop]);shaft.dispose();pointedTop.dispose();
 const gateRail=rail.clone(),wallGeometries=new Set([palisade,gateRail]);
 const foundation=box(1,1,1,'#b7b49d'),grain=colored(new T.ConeGeometry(.018,.12,5),'#cab166');grain.translate(0,.06,0);
 const cropStem=colored(new T.CylinderGeometry(.004,.006,.10,4),'#a4a36b');cropStem.translate(0,.05,0);
 const oreModels=Object.fromEntries(Object.entries(resourceColors).filter(([id])=>resourceFamilies[id]==='ore').map(([id,color],k)=>{
  const g=colored(crag(k),color),p=g.attributes.position,c=g.attributes.color;
  const dark=new T.Color(color).multiplyScalar(.58),vein=new T.Color(color).lerp(new T.Color('#e5dbb0'),.32);
  for(let i=0;i<p.count;i+=3){const band=(i/3+k)%9,v=band===0?vein:band===2?dark:new T.Color(color);for(let j=0;j<3;j++)c.setXYZ(i+j,v.r,v.g,v.b)}
  indexGeometry(g);return [id,g];
 }));
 const fish=(()=>{
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.12,0,0,0,.018,-.035,.10,0,0,-.12,0,0,.10,0,0,0,.018,.035,.10,0,0,.16,0,-.04,.16,0,.04],3));g.computeVertexNormals();return colored(g,'#a9c6bd');
 })();
 const whale=colored(new T.SphereGeometry(.22,10,6),'#738ca0');whale.scale(1.8,.25,.7);
 const marine={fish};
 // Small resource silhouettes sit at the water datum: schools, shell beds,
 // coral branches and crabs have different outlines even before a boat arrives.
 for(const id of ['pearls','tyrian']){
  const g=new T.SphereGeometry(.07,7,3,0,Math.PI*2,0,Math.PI*.5);g.scale(1,.18,1.25);
  marine[id]=colored(g,id==='pearls'?'#babaaa':'#9c90a1');
 }
 const crabParts=[colored(new T.SphereGeometry(.043,6,4),'#be8868')];
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const g=box(.072,.008,.010,'#be8868');g.rotateY(side*(.45-i*.4));g.translate(side*.043,0,(i-1)*.024);crabParts.push(g);
 }
 marine.crabs=mergeGeometries(crabParts);crabParts.forEach(g=>g.dispose());
 const coralParts=[];
 for(let i=0;i<4;i++){
  const g=colored(new T.ConeGeometry(.016,.12,5),'#b78987');g.rotateZ((i-1.5)*.4);g.translate((i-1.5)*.022,.025,0);coralParts.push(g);
 }
 marine.coral=mergeGeometries(coralParts);coralParts.forEach(g=>g.dispose());

 // Keeps animals, buildings and trees from occupying the same footprint.
 function reserved(entry,x,z){
  if(entry?.improvement==='farm')return true;
  if(entry?.city)return Math.hypot(x,z)<.88;
  if(entry?.improvement==='lumbermill')return Math.hypot(x,z)<.50;
  if(entry?.improvement&&entry.improvement!=='camp')return Math.hypot(x,z)<.72;
  return entry?.resource?Math.hypot(x,z)<.54:false;
 }
 function tile(tile,entry,top,{prop,push,walls=true,sampleSurface,preciseFit=false,onBuilding}){
  if(!entry?.resource&&!entry?.improvement&&!entry?.city)return;
  const c=centre(tile),seed=tile.col*73+tile.row*19;
  const rand=n=>{const x=Math.sin(seed*17+n*131.7)*43758.5453;return x-Math.floor(x)};
  const local=(x,z,angle=0)=>[x*Math.cos(angle)-z*Math.sin(angle),x*Math.sin(angle)+z*Math.cos(angle)];
  // Production supplies the registered triangle surface; the finite study
  // keeps its existing analytic placements unless this hook is supplied.
  const height=sampleSurface??((x,z)=>surfaceHeight(tile,x,z));
  function put(g,x,z,scale=1,angle=0,tint=0xffffff,yOverride){
   prop(g,material,c.x+x,yOverride??(isWater(tile)?WATER_LEVEL:height(x,z)),c.z+z,scale,scale,scale,angle,tint);
  }
  function stretch(g,x,y,z,sx,sy,sz,angle=0){prop(g,material,c.x+x,y,c.z+z,sx,sy,sz,angle)}
  function patch(polygon,color,lift=.007){
   const g=surfacePatch(top,polygon.map(([x,z])=>[x+c.x,z+c.z]),new T.Color(color),lift);
   if(g.attributes.position.count)push(fields,g);else g.dispose();
  }
  function building(name,x,z,s=1,angle=0){
   const geometry=assets[name]??mill[name]??special[name];if(!geometry)return;
   if(preciseFit){
    geometry.computeBoundingBox();const bounds=geometry.boundingBox,desired=s;
    const corners=[[bounds.min.x,bounds.min.z],[bounds.max.x,bounds.min.z],[bounds.max.x,bounds.max.z],[bounds.min.x,bounds.max.z]];
    let footprint=[],fits=false;
    for(const factor of [1,.94,.86,.76,.64,.50]){
     s=desired*factor;
     footprint=corners.map(([xx,zz])=>{const [dx,dz]=local(xx*s,zz*s,-angle);return {x:x+dx,z:z+dz}});
     fits=footprint.every(p=>onTileTop(tile,p.x,p.z,.018));if(fits)break;
    }
    if(!fits)return;
    const world=footprint.map(p=>({x:p.x+c.x,z:p.z+c.z}));
    const supports=geometry.userData.supportFootprints?.map(polygon=>polygon.map(([xx,zz])=>{
     const [dx,dz]=local(xx*s,zz*s,-angle);return {x:c.x+x+dx,z:c.z+z+dz};
    }));
    let min=Infinity,max=-Infinity;
    for(const polygon of supports??[world]){
     for(const p of polygon){const y=height(p.x-c.x,p.z-c.z);min=Math.min(min,y);max=Math.max(max,y)}
     const clipped=surfacePatch(top,polygon.map(p=>[p.x,p.z]),new T.Color('white'),0),p=clipped.attributes.position;
     for(let i=0;i<p.count;i++){min=Math.min(min,p.getY(i));max=Math.max(max,p.getY(i))}clipped.dispose();
    }
    const floor=max+.006,[dx,dz]=local((bounds.min.x+bounds.max.x)*s*.5,(bounds.min.z+bounds.max.z)*s*.5,-angle);
    if(supports)for(const polygon of supports)push(fields,supportPrism(polygon,min-.02,floor));
    else stretch(foundation,x+dx,min-.02,z+dz,(bounds.max.x-bounds.min.x)*s,floor-min+.02,(bounds.max.z-bounds.min.z)*s,angle);
    put(geometry,x,z,s,angle,0xffffff,floor);
    onBuilding?.({asset:name,x:c.x+x,y:floor,z:c.z+z,scale:s,yaw:angle,footprint:world,foundationMin:min-.02,foundationMax:floor});return;
   }
   // A fitted plinth reaches the lowest point under each rigid footprint.
   const width=({'temple':.65,'bell-tower':.30,'civic-sanctum':.65,'city-house':.49,'city-loggia':.50,'city-spire':.29,'city-dome':.39})[name]??.48,half=width*s*.5;
   const samples=[[0,0],[-half,-half],[half,-half],[half,half],[-half,half]].map(([dx,dz])=>{const p=local(dx,dz,-angle);return height(x+p[0],z+p[1])});
   const min=Math.min(...samples),max=Math.max(...samples)+.006;
   stretch(foundation,x,min-.02,z,width*s,max-min+.022,width*s,angle);
   put(geometry,x,z,s,angle,0xffffff,max);
  }
  function fence(){
   const points=[[-.56,-.38],[-.18,-.58],[.27,-.54],[.58,-.21],[.57,.22],[.22,.56],[-.2,.56],[-.58,.22],[-.56,-.38]];
   for(let i=0;i<points.length-1;i++){
    const [x,z]=points[i];if(onTileTop(tile,x,z,.05))put(peg,x,z);
    if(i===5)continue; // An intentional gate opening.
    const [xx,zz]=points[i+1],length=Math.hypot(xx-x,zz-z),a=-Math.atan2(zz-z,xx-x);
    if(preciseFit){
     const spans=Math.ceil(length/.13);
     for(let j=0;j<spans;j++){
      const ax=x+(xx-x)*j/spans,az=z+(zz-z)*j/spans,bx=x+(xx-x)*(j+1)/spans,bz=z+(zz-z)*(j+1)/spans;
      if(!onTileTop(tile,ax,az,.025)||!onTileTop(tile,bx,bz,.025))continue;
      const y=Math.max(height(ax,az),height(bx,bz),height((ax+bx)/2,(az+bz)/2))+.10;
      stretch(rail,(ax+bx)/2,y,(az+bz)/2,length/spans,1,1,a);
     }
     continue;
    }
    const y=(height(x,z)+height(xx,zz))*.5+.10;
    // Short spans retain the hand-built fence silhouette without crossing hills.
    stretch(rail,(x+xx)/2,y,(z+zz)/2,length,1,1,a);
   }
  }

  if(entry.city){
   patch([[-.54,-.49],[.38,-.58],[.68,-.18],[.55,.52],[-.51,.57],[-.69,.11]],'#b8b693');
   building('civic-sanctum',-.06,-.07,.84);
   for(const [name,x,z,s,a]of [
    ['city-house',-.46,-.27,.66,.10],['city-dome',.55,-.29,.79,-.15],
    ['city-loggia',-.38,.38,.65,-.10],['city-house',.36,.36,.61,.15],
    ['city-loggia',-.55,.07,.51,.12],
   ])building(name,x,z,s,a);
   patch([[-.11,.79],[.11,.79],[.105,.27],[-.10,.27]],'#cdc3a0',.009);
   building('city-spire',.305,.05,.73);
   if(walls){
    // The current game wall is a palisade; do not invent a stone-wall upgrade.
    for(let i=0;i<92;i++){
     const a=i*Math.PI*2/92;if(a>1.28&&a<1.86)continue;
     const radius=.78+.014*Math.sin(a*5),x=Math.cos(a)*radius,z=Math.sin(a)*radius;
     if(onTileTop(tile,x,z,.03))stretch(palisade,x,height(x,z),z,1.42,1.10+rand(i+200)*.20,1.42,a);
    }
    for(const x of [-.22,.22])stretch(palisade,x,height(x,.75),.75,2,1.6,2);
    stretch(gateRail,0,height(0,.75)+.26,.75,.47,1.5,1.5);
   }
   return;
  }
  const resource=entry.resource,family=resourceFamilies[resource],improvement=entry.improvement;
  const lumber=improvement==='lumbermill';
  const monumental=Object.prototype.hasOwnProperty.call(special,improvement);
  const frontResource=lumber||monumental;
  if(monumental){
   // Broken paving follows the terrain. No disc or solid hex competes with
   // the surrounding painted strokes or fills the walkable court.
   for(const [polygon,color]of [
    [[[-.36,-.69],[.24,-.74],[.40,-.58],[.30,-.22],[-.30,-.18],[-.41,-.37]],'#a6ad97'],
    [[[-.20,-.16],[-.08,-.18],[.06,.18],[-.10,.20]],'#afb298'],
    [[[.32,-.10],[.40,-.13],[.45,.08],[.36,.14],[.30,.07]],'#a6ad97'],
    [[[-.06,.28],[.07,.27],[.11,.38],[-.03,.40]],'#b2b49b'],
    [[[.03,.47],[.14,.44],[.18,.52],[.08,.56]],'#a6ad97'],
   ])patch(polygon,color);
  }
  if(improvement==='plantation'){
   // Beds are the improvement, including reed plantations and temporarily
   // suppressed resource silhouettes. They follow the actual terrain faces.
   for(const z of [-.28,.05,.36])patch([[-.43,z-.09],[.44,z-.09],[.42,z+.09],[-.44,z+.09]],'#9a956a');
  }
  if(improvement==='mine'){
   // Exposed bedrock is the map-scale mine silhouette. Paint the actual hill
   // faces so this clearing shares their relief, lighting and cast shadows.
   const angle=(rand(81)-.5)*.4;
   const stone=(points,color,lift=.007,scale=.84)=>patch(points.map(([x,z])=>local(x*scale,z*scale,angle)),color,lift);
   stone([[-.70,-.38],[-.40,-.64],[.19,-.68],[.64,-.32],[.70,.23],[.40,.59],[-.19,.68],[-.70,.24]],'#aaaeba');
   stone([[-.66,-.30],[-.39,-.59],[-.12,-.61],[-.22,-.22],[-.56,.05]],'#bec1c9',.009);
   stone([[.17,-.61],[.60,-.30],[.65,.18],[.37,.36],[.20,.05]],'#959eae',.009);
   // A few larger strokes meet the edge; small dashes leave grass between
   // them. Their shared direction echoes the surrounding terrain pigment.
   for(const [points,color]of [
    [[[-.72,-.13],[-.51,-.18],[-.40,-.12],[-.49,-.05],[-.68,-.02]],'#aaaeba'],
    [[[.27,-.42],[.54,-.47],[.68,-.42],[.61,-.35],[.40,-.33]],'#aaaeba'],
    [[[-.40,.62],[-.23,.59],[-.16,.63],[-.34,.67]],'#bec1c9'],
    [[[.43,.45],[.57,.40],[.62,.44],[.49,.49]],'#aaaeba'],
    [[[-.70,.24],[-.62,.21],[-.59,.24],[-.68,.27]],'#959eae'],
   ])stone(points,color,.010,1);
  }
  if(improvement==='farm'){
   const layout=farmLayout(tile);
   for(const g of farmPaint(tile,top,layout))push(fields,g);
   building('house',layout.house.x,layout.house.z,.30,layout.house.angle);
  }
  if(family==='animal'){
   const name=animalAsset[resource],count=resource==='ivory'?2:3;
   for(let i=0;i<count;i++){
    const s=(resource==='ivory'?.47:resource==='furs'?.45:.41+rand(i+1)*.045)*.48;
    const x=(frontResource?[-.32,0,.32]:[-.23,.23,-.03])[i],z=(monumental?[.55,.65,.55]:lumber?[.38,.48,.38]:[-.20,.16,.38])[i];
    const a=-.45+rand(i+10)*1.1+(i===1?Math.PI:0);
    if(!onTileTop(tile,x,z,s*.53))continue;
    const g=assets[name];
    const samples=[[-.28,-.11],[-.28,.11],[.23,-.11],[.23,.11]].map(([px,pz])=>{const [dx,dz]=local(px*s,pz*s,preciseFit?-a:a);return height(x+dx,z+dz)});
    put(g,x,z,s,a,0xffffff,Math.max(...samples)-.004);
   }
  }else if(family==='ore'){
   for(let i=0;i<6;i++){
    const a=i*2.399+rand(10)*6.28,d=i?(frontResource?.09+rand(i)*.06:.20+rand(i)*.18):0,x=Math.cos(a)*d,z=Math.sin(a)*d+(monumental?.64:lumber?.48:0);
    if(!onTileTop(tile,x,z,.16))continue;
    const s=(i===0?.22:.08+rand(i+8)*.08)*(frontResource?.72:1);
    stretch(oreModels[resource],x,height(x,z)-.025,z,s,s*(i===0?1.5:1.05),s*.85,a);
   }
  }else if(family==='shrub'){
   const points=improvement==='plantation'?[[-.28,-.28],[.03,-.28],[.32,-.28],[-.28,.05],[.03,.05],[.32,.05],[-.25,.36],[.10,.36]]:monumental?[[-.32,.56],[0,.65],[.32,.56]]:lumber?[[-.30,.40],[0,.49],[.30,.40]]:[[-.26,-.1],[.13,-.25],[.25,.15],[-.12,.28]];
   for(const [i,[x,z]]of points.entries())if(onTileTop(tile,x,z,.17))put(assets['resource-shrub'],x,z,(.64+rand(i+5)*.16)*(monumental?.65:1),rand(i)*6.28,new T.Color(resourceColors[resource]||'#b8caa0'));
  }else if(family==='crop'&&improvement!=='farm'){
   for(let i=0;i<3;i++){
    const x=(i-1)*.23,z=monumental?.61:lumber?.43:Math.sin(i*3)*.19;
    for(let j=0;j<9;j++){
     const a=j*2.399,d=Math.sqrt(j/9)*.12,xx=improvement==='plantation'?-.34+j*.085:x+Math.cos(a)*d,zz=improvement==='plantation'?[-.28,.05,.36][i]:z+Math.sin(a)*d;
     if(onTileTop(tile,xx,zz,.04)){put(grain,xx,zz,.7+rand(j)*.3,a);put(cropStem,xx,zz,1)}
    }
   }
  }else if(family==='marine'){
   const boat=improvement==='fishingBoats';
   if(resource==='whales')put(whale,boat?-.15:0,boat?-.43:0,1,.3,0xffffff,WATER_LEVEL-.015);
   else for(let i=0;i<5;i++){
    const [x,z]=boat?[[-.40,-.35],[-.18,-.48],[.08,-.49],[.34,-.36],[-.43,-.11]][i]:[Math.sin(i*4)*.27,Math.cos(i*3)*.25];
    put(marine[resource]||fish,x,z,.65+rand(i)*.3,-.5,0xffffff,WATER_LEVEL+.004);
   }
  }
  if(improvement==='pasture')fence();
  if(improvement==='mine')building('mine',.06,.23,.72,0);
  if(improvement==='quarry')building('quarry',.22,.26,.84,0);
  if(improvement==='camp')building('camp',-.35,.39,.65,.25);
  if(improvement==='plantation')building('house',.42,.42,.32,0);
  if(lumber){building('lumbermill',-.13,.03,.90,-.13);building('lumber-stockpile',.27,0,.92,.10)}
  if(improvement==='fishingBoats')put(assets['fishing-boat'],.12,.1,.85,-.4,0xffffff,WATER_LEVEL-.016);
  if(monumental){
   if(improvement==='citadel'||improvement==='holySite')building(improvement,0,0,1);
   else building(improvement,0,-.50,.64);
  }
 }
 const generated=new Set([peg,rail,palisade,gateRail,foundation,grain,cropStem,...Object.values(oreModels),whale,...Object.values(marine),...Object.values(mill),...Object.values(special)]);
 let disposed=false;
 // GLB meshes and their material belong to the caller. Each emitted field
 // patch belongs to push(); only this reusable procedural kit is owned here.
 function dispose(){if(disposed)return;disposed=true;for(const g of generated)g.dispose();fields.dispose()}
 return {tile,reserved,fields,wallGeometries,dispose};
}
