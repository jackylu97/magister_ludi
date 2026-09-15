import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {pixelToHex} from '../sim/hex';
import {axialToOffset} from '../sim/map';
import {generateMap} from '../sim/mapgen';
import {featureDetails} from './features.js';
import {waterDetails,shoreStones} from './water.js';
import {createWaterPainter} from './waterPigment.js';
import {sculptedTurf} from './turf.js';
import {openLandTree,stoneCluster} from './groundDressing.js';
import {terrainMesh} from './terrainMesh.js';
import {terrainColors,createTerrainPainter} from './terrainPigment.js';
import {createTileHover} from './tileHover.js';
import {loadVegetation} from './vegetation.js';
import {createMountainRanges} from './mountainRanges.js';
import {createBenchmark} from './benchmark.js';
import {indexGeometry} from './indexGeometry.js';
import {createLighting} from './lighting.js';
import {createPainterlyStyle} from './painterly.js';
import {loadSettlementAssets} from './settlementAssets.js';
import {createSettlementArt} from './settlementArt.js';
import {createSettlementPlan} from './settlementPlan.js';
import {createRoadPlan} from './roadPlan.js';
import {createTerritoriesPlan} from './territoryPlan.js';
import {createTerritoryStudy} from './territoryStudy.js';
import {createPlacementArt} from './placementArt.js';
import {createSiteArt} from './siteArt.js';
import {siteLabels} from './siteLayout.js';
import {loadUnitAssets} from './unitAssets.js';
import {createUnitArt} from './unitArt.js';
import {createUnitPlan,unitReserved} from './unitPlan.js';
import {unitExamples,civilianUnitExamples,newUnitExamples,greatPersonFamilies,greatPersonFamily,unitDefinitions,unitOwners,unitNotes} from './unitCatalog.js';
import {resourceDefinitions} from './resourceCatalog.js';
import {daylightPresets,daylightKey} from './daylightPresets.js';
import {createFogReview} from './fogReview.js';
let timeOfDay=daylightKey(location.search),activeDaylight=daylightPresets[timeOfDay];
import {centre,isWater,surfaceHeight,onTileTop,prepareTerrainMap,neighbour,hillMounds} from './surface.js';
const canvas=document.querySelector('#terrain'),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#d7cebc');renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
const scene=new T.Scene(),camera=new T.OrthographicCamera(),controls=new OrbitControls(camera,canvas);controls.enableRotate=false;controls.mouseButtons.LEFT=T.MOUSE.PAN;controls.enableDamping=false;controls.panSpeed=1;controls.minZoom=.5;controls.maxZoom=80;camera.near=.1;camera.far=700;
const skyFill=new T.HemisphereLight('#d5e6ff','#9aa487',.45);scene.add(skyFill);const sun=new T.DirectionalLight('#fff0dc',3.3);sun.position.set(7,12,-3);sun.castShadow=true;const shadowResolution=Math.min(8192,renderer.capabilities.maxTextureSize);sun.shadow.mapSize.set(shadowResolution,shadowResolution);sun.shadow.radius=2.0;sun.shadow.intensity=.82;Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:.5,far:65});sun.shadow.bias=-.000055;sun.shadow.normalBias=.012;scene.add(sun,sun.target);
// The generated board is static: cover it once, independent of the viewer.
let shadowBuilds=0;
const renderShadowMap=renderer.shadowMap.render.bind(renderer.shadowMap);
renderer.shadowMap.render=(lights,scene,camera)=>{
 const baking=renderer.shadowMap.enabled&&(renderer.shadowMap.autoUpdate||renderer.shadowMap.needsUpdate)&&lights.some(l=>l.shadow.autoUpdate||l.shadow.needsUpdate);
 renderShadowMap(lights,scene,camera);if(baking)shadowBuilds++;
};
function prepareShadows(){const x=Math.sqrt(3)*map.width/2,z=map.height*.75,r=Math.hypot(Math.sqrt(3)*map.width,map.height*1.5)*.5+5;const [sx,sy,sz]=activeDaylight.sunOffset;sun.position.set(x+r*sx,r*sy,z+r*sz);sun.target.position.set(x,0,z);Object.assign(sun.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:.5,far:r*6});sun.updateMatrixWorld();sun.target.updateMatrixWorld();const sc=sun.shadow.camera;sc.position.copy(sun.position);sc.lookAt(sun.target.position);sc.updateMatrixWorld();const bounds=new T.Box3();for(const xx of [-2,Math.sqrt(3)*(map.width+.5)])for(const yy of [-.5,5])for(const zz of [-2,map.height*1.5+1])bounds.expandByPoint(new T.Vector3(xx,yy,zz).applyMatrix4(sc.matrixWorldInverse));Object.assign(sc,{left:bounds.min.x-2,right:bounds.max.x+2,bottom:bounds.min.y-2,top:bounds.max.y+2,near:Math.max(.5,-bounds.max.z-3),far:-bounds.min.z+3});sc.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true}

const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.88,metalness:0,flatShading:true});
const colors=terrainColors;
const ground=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,new T.MeshStandardMaterial({color:c,roughness:.95,metalness:0,flatShading:true,vertexColors:true})]));const earth=mat('#948653'),stone=mat('#969bb0'),light=mat('#b5b8bf'),leaf=mat('#597e53'),pine=mat('#345b4b'),jungle=mat('#346d52'),bark=mat('#716145');
const waterMaterials={bank:mat('#819675'),river:mat('#8198d0'),shallows:mat('#477baa'),foam:mat('#95b1c0')};
for(const m of Object.values(waterMaterials))m.side=T.DoubleSide;
const clockUniform={value:0};
const mineralTexture = new T.TextureLoader().load('/terrain-study/mineral-grain.png');
mineralTexture.wrapS = mineralTexture.wrapT = T.RepeatWrapping;
mineralTexture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
const mineralUniform={value:mineralTexture};
const flockTexture=new T.TextureLoader().load('/terrain-study/flocking-grain.png');
flockTexture.wrapS=flockTexture.wrapT=T.RepeatWrapping;
flockTexture.anisotropy=mineralTexture.anisotropy;
const flockUniform={value:flockTexture};
const paintTexture=new T.TextureLoader().load('/terrain-study/gouache-grain.png');
paintTexture.wrapS=paintTexture.wrapT=T.RepeatWrapping;paintTexture.anisotropy=mineralTexture.anisotropy;

// World-space pigment variation preserves a continuous scale across hexes.
for(const [kind,m]of Object.entries(ground)){const water=['coast','ocean','lake'].includes(kind);m.onBeforeCompile=shader=>{shader.uniforms.studyTime=clockUniform;shader.uniforms.studyMineral=mineralUniform;shader.uniforms.studyFlock=flockUniform;shader.vertexShader='varying vec3 studyPosition;\n'+(water?'':'attribute float turfWeight; varying float vTurfWeight;\n')+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstudyPosition=position;'+(water?'':'vTurfWeight=turfWeight;'));shader.fragmentShader='varying vec3 studyPosition; uniform float studyTime; uniform sampler2D studyMineral; uniform sampler2D studyFlock;\n'+(water?'':'varying float vTurfWeight;\n')+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=studyPosition.xz;
 float patches=sin(p.x*8.0+sin(p.y*5.0))*sin(p.y*7.0);
 ${water?'':'float mineral=texture2D(studyMineral,p*.32).r; float flock=texture2D(studyFlock,p*.55).r; diffuseColor.rgb *= .95 + mineral*.065 + patches*.012 + (flock-.5)*.19*vTurfWeight;'}
 ${water?`float wave=sin(p.y*24.0+p.x*3.0+sin(p.x*2.0)+studyTime*.35);
 float streak=step(.93,wave)*step(.3,sin(p.x*4.0+p.y));
 diffuseColor.rgb *= 1.0+streak*.045 + sin(p.x*1.4+p.y*.65)*sin(p.y*1.6)*.008;`:''}
 `)};m.customProgramCacheKey=()=>water?'study-water-v3':'study-land-v2'}

const mergedLand=mat('#ffffff'),mergedWater=mat('#ffffff'),mergedDetails=mat('#ffffff');
for(const [m,source]of [[mergedLand,ground.grassland],[mergedWater,ground.ocean]]){m.vertexColors=true;m.onBeforeCompile=source.onBeforeCompile;m.customProgramCacheKey=source.customProgramCacheKey}
mergedWater.emissive.set('#263c61');mergedWater.emissiveIntensity=.4;
mergedLand.flatShading=true;mergedLand.bumpMap=mineralTexture;mergedLand.bumpScale=.009;
mergedDetails.vertexColors=true;mergedDetails.side=T.DoubleSide;
const terrainMaterials=new Set(Object.values(ground));
const waterSurfaceMaterials=new Set([ground.ocean,ground.coast,ground.lake]);
const featureMaterials={shrub:mat('#678447'),stone:mat('#c09e73'),fertile:mat('#8eaa63'),bank:mat('#c5b381'),pool:mat('#4968a8'),shallow:mat('#6aafa5'),reeds:mat('#6b8752')};
terrainMaterials.add(waterMaterials.river);waterSurfaceMaterials.add(waterMaterials.river);
const detailMaterials=new Set([...Object.values(waterMaterials).filter(m=>m!==waterMaterials.river),...Object.values(featureMaterials).filter(m=>m!==featureMaterials.stone&&m!==featureMaterials.shrub)]);

const referenceRendering=new URLSearchParams(location.search).has('reference');
const distantTerrain=!referenceRendering&&!new URLSearchParams(location.search).has('nolod');
const indexedRendering=!referenceRendering&&!new URLSearchParams(location.search).has('noindex');
let vegetation;
const vegetationReady=loadVegetation(clockUniform,flockTexture,mineralTexture,{indexed:indexedRendering}).then(assets=>{vegetation=assets;assets.materials.forEach(m=>paintedStyle.register(m))});
const lighting=createLighting(renderer,scene,camera);
const paintedStyle=createPainterlyStyle(renderer,lighting,paintTexture);
let settlementAssets,settlementArt,settlementPlan,siteArt;
const settlementReady=loadSettlementAssets(paintedStyle,mineralTexture).then(assets=>{settlementAssets=assets;settlementArt=createSettlementArt(assets,paintedStyle);siteArt=createSiteArt(assets,settlementArt.fields)});
let settled=new URLSearchParams(location.search).has('settled');
let cityWalls=true;
let placementEnabled=new URLSearchParams(location.search).has('placement')||new URLSearchParams(location.search).get('view')==='placement';
if(placementEnabled)settled=true;
let roadPlan,territoryFixture,territoryPlan,placementArt;
let unitPlan,unitArt,unitAssets,unitsEnabled=new URLSearchParams(location.search).has('units');
let activeGreatPersonFamily=greatPersonFamily(new URLSearchParams(location.search).get('family'));
const unitsReady=settlementReady.then(async()=>{unitAssets=await loadUnitAssets(settlementAssets.material);unitAssets.greatPerson=unitAssets.greatPeople[activeGreatPersonFamily];unitArt=createUnitArt(unitAssets,scene);unitArt.setOwner(new URLSearchParams(location.search).get('owner')||'enamel')});
function studyEntry(t){const entry=settlementPlan?.entries.get(t);return settled?entry:{resource:t.resource,site:t.discovery}}
const meadow=mat('#859b59');
const tuft=new T.BufferGeometry();tuft.setAttribute('position',new T.Float32BufferAttribute([-.025,0,0,.025,0,0,-.01,.12,0,0,0,-.022,0,0,.022,.014,.085,0,-.02,0,-.015,.02,0,.015,.035,.07,.02],3));tuft.computeVertexNormals();meadow.side=T.DoubleSide;

[mergedDetails,earth,stone,light,meadow,featureMaterials.stone,featureMaterials.shrub].forEach(m=>paintedStyle.register(m));
paintedStyle.register(mergedWater,{water:true});
paintedStyle.register(mergedLand,{terrain:true});

// The fog review is the one view that builds the *production* board instead of
// the study's own world, so it replaces build() wholesale rather than adding to
// it. Everything it owns lives in fogReview.js and comes out in one piece.
const fogReviewMode=new URLSearchParams(location.search).get('review')==='fog';
let fogReview=null;

const tileHover=createTileHover(scene);
let world=new T.Group(),map,picks=[],buildMs=0,genMs=0,geometryStats='',terrainLevels=[],nearProps=[],farProps=[],cityWallMeshes=[];scene.add(world);
function hash(a,b,n=0){let x=Math.imul(a+53,374761393)^Math.imul(b+71,668265263)^Math.imul(n+1,1274126177);x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296}
function dispose(){terrainLevels=[];nearProps=[];farProps=[];cityWallMeshes=[];tileHover.show(undefined);fogReview?.dispose();fogReview=null;world.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)o.geometry.dispose();if(o.isInstancedMesh)o.dispose()});scene.remove(world);world=new T.Group();scene.add(world);picks=[]}
function build(){dispose();
 if(fogReviewMode){
  fogReview=createFogReview({world,map,assets:vegetation,register:m=>paintedStyle.register(m),
   materials:{ground,earth,mergedLand,mergedWater,mergedDetails,water:waterMaterials,features:featureMaterials},
   focusWidth:(x,z,width)=>focus(x,z,(camera.right-camera.left)/width),
   invalidateShadows:()=>{renderer.shadowMap.needsUpdate=sun.castShadow}});
  world.updateMatrixWorld(true);geometryStats='Production painted board · staged fog levels';prepareShadows();return;
 }
 settlementPlan=createSettlementPlan(map);unitPlan=createUnitPlan(map,settlementPlan,unitAssets);roadPlan=settled&&placementEnabled?createRoadPlan(map,settlementPlan,unitsEnabled?unitPlan:undefined):null;territoryFixture=roadPlan?createTerritoryStudy(map,roadPlan.ownedTiles):null;territoryPlan=roadPlan?createTerritoriesPlan(map,territoryFixture.territories):null;syncTerritoryLegend();placementArt=roadPlan?createPlacementArt(roadPlan,territoryPlan,settlementArt.fields):null;const ranges=createMountainRanges(map);{const clearings=[...settlementPlan.entries].filter(([t])=>{const e=studyEntry(t);return e?.site||(settled&&(e?.city||e?.improvement==='farm'))||(unitsEnabled&&unitPlan.entries.has(t))}).map(([t])=>centre(t));for(const [t,pieces]of ranges.pieces)ranges.pieces.set(t,pieces.filter(p=>p.kind==='summit'||!clearings.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<.65+Math.max(p.sx,p.sz)*.6)))}const painter=createTerrainPainter(map,ranges),waterPainter=createWaterPainter(map),chunks=new Map(),mapProps=new Map();for(const tile of map.tiles){const key=`${Math.floor(tile.col/6)},${Math.floor(tile.row/6)}`;if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(tile)}
 for(const tiles of chunks.values()){const surfaces=new Map(),farSurfaces=new Map(),props=new Map();const push=(m,g,farGeometry,bucket=surfaces)=>{if(distantTerrain&&bucket===surfaces&&terrainMaterials.has(m)&&!waterSurfaceMaterials.has(m))push(m,farGeometry||g.clone(),undefined,farSurfaces);if(waterSurfaceMaterials.has(m))waterPainter.paint(g);const turfStrength=m===ground.grassland?1:[ground.plains,ground.oasis,ground.floodplain].includes(m)?.65:m===ground.tundra?.3:0;if(terrainMaterials.has(m)||detailMaterials.has(m)){let color=g.getAttribute('color');if(!color){color=new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*3).fill(1),3);g.setAttribute('color',color)}if(!g.userData.pigmentBaked)for(let i=0;i<color.count;i++)color.setXYZ(i,color.getX(i)*m.color.r,color.getY(i)*m.color.g,color.getZ(i)*m.color.b);m=detailMaterials.has(m)?mergedDetails:waterSurfaceMaterials.has(m)?mergedWater:mergedLand}if(m===mergedLand){g.setAttribute('turfWeight',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(turfStrength),1));const p=g.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)*.6;uv[i*2+1]=p.getZ(i)*.6}g.setAttribute('uv',new T.BufferAttribute(uv,2))}if(!bucket.has(m))bucket.set(m,[]);bucket.get(m).push(g)};
 const prop=(g,m,x,y,z,sx,sy,sz,angle=0,tint=0xffffff)=>{const key=g.uuid+m.uuid;if(!props.has(key))props.set(key,{g,m,matrices:[],tints:[]});const matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),new T.Vector3(sx,sy,sz));props.get(key).tints.push(tint);props.get(key).matrices.push(matrix);if(distantTerrain){if(!mapProps.has(key))mapProps.set(key,{g,m,matrices:[],tints:[]});mapProps.get(key).matrices.push(matrix);mapProps.get(key).tints.push(tint)}};
 for(const t of tiles){const entry=studyEntry(t);const reserved=(x,z)=>settlementArt.reserved(entry,x,z)||placementArt?.reserved(t,x,z)||siteArt.reserved(t,entry,x,z)||(unitsEnabled&&unitReserved(unitPlan.entries.get(t),x,z));const [top,side]=terrainMesh(t);settlementArt.tile(t,entry,top,{push,prop,walls:true});siteArt.tile(t,entry,top,{push,prop});placementArt?.tile(t,top,{push});painter.paint(top,t);let farTop;if(distantTerrain&&!isWater(t)){if(entry?.improvement==='mine'||placementArt?.tiles.has(t)){/* Keep surface markings fitted at both terrain LODs. */farTop=top.clone()}else{const far=terrainMesh(t,{distant:true});farTop=far[0];far[1].dispose();painter.paint(farTop,t)}}push(ground[['floodplain','oasis'].includes(t.feature)?t.feature:t.terrain],top,farTop);push(earth,side);const c=centre(t);waterDetails(t,map,push,waterMaterials);featureDetails(t,push,featureMaterials,hash,reserved);if(!entry?.city&&!entry?.improvement&&!entry?.site)sculptedTurf(t,push,ground[t.terrain],hash);
 for(const piece of ranges.pieces.get(t)||[]){
  const rock=piece.asset==='talus'?vegetation.limestone:vegetation.escarpments[piece.variant];
  const geometry=piece.asset==='shoulder'?rock.shoulderGeometry:rock.geometry;
  prop(geometry,vegetation.rangeMaterial,piece.x,piece.y,piece.z,piece.sx,piece.sy,piece.sz,piece.angle,new T.Color(colors[piece.biome]));
 }
 for(const r of stoneCluster(t,hash)){
  if(reserved(r.x,r.z))continue;
  const rock=vegetation.limestone;
  prop(rock.geometry,rock.material,c.x+r.x,r.y-.008,c.z+r.z,r.s,r.s*.45,r.s*.80,r.angle,new T.Color('#dbe0c7'));
 }
 for(const r of shoreStones(t,map,hash)){
  if(reserved(r.x,r.z))continue;
  const rock=vegetation.limestone;
  prop(rock.geometry,rock.material,c.x+r.x,r.y,c.z+r.z,r.s,r.s*.70,r.s*.85,r.angle,new T.Color('#dbe0cf'));
 }
 // Scenic saplings can read as part of a piece's staff or weapon. Keep
 // occupied example tiles clear of these optional open-land accents.
 const sapling=unitsEnabled&&unitPlan.entries.has(t)?null:openLandTree(t,hash);
 if(sapling&&!reserved(sapling.x,sapling.z)){
  const variant=(Math.floor(t.col/6)+Math.floor(t.row/6)*2);
  const tree=sapling.cypress?vegetation.cypresses[variant%2]:vegetation.broadleaves[variant%3],s=sapling.scale;
  prop(tree.geometry,tree.material,c.x+sapling.x,sapling.y-.008,c.z+sapling.z,s*(sapling.cypress?1.15:1),s*.92,s*(sapling.cypress?1.15:1),sapling.angle,new T.Color('#d7e5c5'));
 }
 if(t.terrain==='grassland'&&hash(t.col,t.row,700)>.65){
  const angle=hash(t.col,t.row,710)*6.28;
  for(let i=0;i<3;i++){
   const dx=Math.cos(angle)*.5+Math.sin(i*3)*.13,dz=Math.sin(angle)*.5+Math.cos(i*3)*.13,y=surfaceHeight(t,dx,dz);
   if(!onTileTop(t,dx,dz,.09)||reserved(dx,dz))continue;
   const s=.10+hash(t.col,t.row,720+i)*.06;
   prop(vegetation.broadleaf.geometry,vegetation.broadleaf.material,c.x+dx,y-s*.45,c.z+dz,s*1.2,s*.75,s*1.2,angle+i);
  }
 }
 if(!isWater(t)&&t.terrain!=='mountain'){
   const forest=['forest','jungle'].includes(t.feature),count=forest?5:0;
   for(let i=0;i<count;i++){
     const a=hash(t.col,t.row,i+90)*6.28,d=Math.sqrt(hash(t.col,t.row,i+110))*.72;
     const x=Math.cos(a)*d,z=Math.sin(a)*d,y=surfaceHeight(t,x,z);
     if(!onTileTop(t,x,z,.1)||reserved(x,z))continue;
     const hero=i===1&&hash(t.col,t.row,75)>.55;
     const s=hero?.68:.32+hash(t.col,t.row,i+140)*.24;
     const variant=Math.floor(t.col/6)+Math.floor(t.row/6)*2;
     const tree=i%3===0?vegetation.cypresses[variant%2]:vegetation.broadleaves[variant%3];
     const warm=i%3!==0&&t.feature!=='jungle'&&t.terrain!=='snow'&&hash(t.col,t.row,170+i)>.91;
     const tint=warm?new T.Color(2.55,.48,.5):new T.Color([0xffffff,0xc3dec9,0xd6ddbd][i%3]);
     prop(tree.geometry,tree.material,c.x+x,y-.012,c.z+z,s*(i%3===0?1.5:hero?1.13:1),s*(i%3===0?1.05:.93),s*(i%3===0?1.5:1),a,tint);
   }
 }

 }
 for(const [m,list]of surfaces){const geometry=mergeGeometries(list);if(indexedRendering)indexGeometry(geometry);const mesh=new T.Mesh(geometry,m);mesh.receiveShadow=true;mesh.castShadow=m===earth||m===mergedLand||m===featureMaterials.stone||m===featureMaterials.shrub;world.add(mesh);if(m===mergedLand&&farSurfaces.has(m)){const farList=farSurfaces.get(m),farGeometry=mergeGeometries(farList);if(indexedRendering)indexGeometry(farGeometry);const farMesh=new T.Mesh(farGeometry,m);farMesh.receiveShadow=true;farMesh.visible=false;world.add(farMesh);terrainLevels.push({near:mesh,far:farMesh});farList.forEach(g=>g.dispose())}if(m===mergedLand||m===mergedWater){geometry.computeBoundingBox();picks.push(mesh);}for(const g of list)g.dispose()}
 for(const {g,m,matrices,tints}of props.values()){const inst=new T.InstancedMesh(g,m,matrices.length);matrices.forEach((v,i)=>{inst.setMatrixAt(i,v);inst.setColorAt(i,new T.Color(tints[i]))});inst.computeBoundingSphere();inst.castShadow=g!==tuft;inst.receiveShadow=true;world.add(inst);nearProps.push(inst);if(settlementArt.wallGeometries.has(g))cityWallMeshes.push(inst)}
 }for(const {g,m,matrices,tints}of mapProps.values()){const inst=new T.InstancedMesh(g,m,matrices.length);matrices.forEach((v,i)=>{inst.setMatrixAt(i,v);inst.setColorAt(i,new T.Color(tints[i]))});inst.computeBoundingSphere();inst.receiveShadow=true;inst.visible=false;world.add(inst);farProps.push(inst);if(settlementArt.wallGeometries.has(g))cityWallMeshes.push(inst)}world.updateMatrixWorld(true);
 const totals={ground:0,foliage:0,rocks:0},unique=new Set();let bytes=0,vertices=0;
 world.traverse(o=>{
  if(!o.isMesh)return;
  const g=o.geometry,n=(g.index?.count??g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);
  if(o.visible)totals[o.material===vegetation.broadleaf.material?'foliage':o.isInstancedMesh?'rocks':'ground']+=n;
  if(!unique.has(g)){unique.add(g);vertices+=g.attributes.position.count;bytes+=Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength||0);}
  if(!referenceRendering){o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;}
 });
 geometryStats=`Geometry ${(bytes/1048576).toFixed(1)} MiB · ${(vertices/1000).toFixed(0)}k vertices\nTriangles: ground ${(totals.ground/1000).toFixed(0)}k · foliage ${(totals.foliage/1000).toFixed(0)}k · rocks ${(totals.rocks/1000).toFixed(0)}k`;
 unitArt.build(unitPlan,unitsEnabled);prepareShadows()}
// Only the micro-subdivisions of the tile plate change at map scale.
// Painted boundaries, bank vertices, mound faces and all props are retained.
// Bake sun shadows using the full geometry, independent of the current zoom.
let showingDistant=false;
function updateTerrainDetail(){
 const pixelsPerTile=Math.sqrt(3)*innerWidth*renderer.getPixelRatio()*camera.zoom/(camera.right-camera.left);
 lighting.setContactDetail(pixelsPerTile);
 if(fogReview){fogReview.board.updateDetail(pixelsPerTile);return}
 showingDistant=pixelsPerTile<(showingDistant?29:25);
 const baking=sun.castShadow&&renderer.shadowMap.enabled&&renderer.shadowMap.needsUpdate;
 const distant=distantTerrain&&showingDistant&&!baking;
 for(const pair of terrainLevels){pair.near.visible=!distant;pair.far.visible=distant;}
 for(const mesh of nearProps)mesh.visible=!distant;
 for(const mesh of farProps)mesh.visible=distant;
 if(!cityWalls)for(const mesh of cityWallMeshes)mesh.visible=false;
}
function focus(x,z,zoom,height=0){controls.target.set(x,height,z);camera.position.set(x,100+height,z+100);camera.zoom=zoom;camera.updateProjectionMatrix();controls.update()}
function frame(){focus(Math.sqrt(3)*map.width/2,map.height*.75,1)}
function close(){const tile=map.tiles.find(t=>t.hills&&t.feature==='forest'&&t.col>map.width*.25&&t.col<map.width*.75)||map.tiles.find(t=>t.hills);const c=centre(tile);focus(c.x,c.z,5)}
function resize(){renderer.setSize(innerWidth,innerHeight);lighting.resize(innerWidth,innerHeight);const extent=map?Math.max(map.height*.8,map.width*Math.sqrt(3)/2/(innerWidth/innerHeight))*1.08:50;camera.left=-extent*innerWidth/innerHeight;camera.right=-camera.left;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix()}addEventListener('resize',resize);
async function generate(){document.querySelector('#error').textContent='';document.querySelector('#stats').textContent='Generating…';await new Promise(r=>requestAnimationFrame(r));try{await Promise.all([vegetationReady,settlementReady,unitsReady]);const start=performance.now();map=prepareTerrainMap(generateMap(Number(document.querySelector('#seed').value),document.querySelector('#size').value));genMs=performance.now()-start;const t=performance.now();build();buildMs=performance.now()-t;resize();syncDiscoveryControls();syncUnitControls();if(fogReviewMode){fogReview.frame();document.querySelector('#readout').textContent=fogReview.describe()}else if(new URLSearchParams(location.search).get('view')==='placement')placementView(new URLSearchParams(location.search).get('detail')||'overview');else if(new URLSearchParams(location.search).get('view')==='units')unitView(new URLSearchParams(location.search).get('unit')||'warrior');else if(new URLSearchParams(location.search).get('view')==='discoveries')discoveryView(new URLSearchParams(location.search).get('site')||'ruins');else if(new URLSearchParams(location.search).get('view')==='settlement')settlementView('city');else if(new URLSearchParams(location.search).get('view')==='workshops')settlementView('hillFarm');else if(new URLSearchParams(location.search).get('view')==='range')rangeView();else if(new URLSearchParams(location.search).get('view')==='rocks')rockView();else if(new URLSearchParams(location.search).get('view')==='hills')hillView();else if(new URLSearchParams(location.search).get('view')==='coast')inspectWater(t=>t.terrain==='coast',11);else if(new URLSearchParams(location.search).get('view')==='lake')inspectWater(t=>t.terrain==='lake',8);else if(new URLSearchParams(location.search).get('view')==='headlands')coastalCorners();else grove()}catch(e){document.querySelector('#error').textContent=e.message;console.error(e)}}
document.querySelector('#generate').onsubmit=e=>{e.preventDefault();generate()};document.querySelector('#frame').onclick=frame;document.querySelector('#close').onclick=close;
const ray=new T.Raycaster(),pointer=new T.Vector2();let hovered,down,lastHover=0;
function hit(e){pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);const candidates=picks.filter(m=>ray.ray.intersectsBox(m.geometry.boundingBox));const found=ray.intersectObjects(candidates,false)[0];if(!found)return;const {row,col}=axialToOffset(pixelToHex(found.point.x,found.point.z,1));if(row<0||row>=map.height||col<0||col>=map.width)return;return map.tiles[row*map.width+col]}
canvas.addEventListener('pointermove',e=>{if(benchmark.running||e.buttons||performance.now()-lastHover<60)return;lastHover=performance.now();hovered=hit(e);tileHover.show(hovered);document.querySelector('#readout').textContent=hovered?`${hovered.col},${hovered.row} · ${hovered.terrain}${hovered.hills?' · hills':''} · ${hovered.feature} · resource: ${studyEntry(hovered)?.resource||'none'}${studyEntry(hovered)?.improvement?' · '+studyEntry(hovered).improvement:''}${studyEntry(hovered)?.city?' · city example':''}${studyEntry(hovered)?.site?' · '+siteLabels[studyEntry(hovered).site]:''}${unitsEnabled&&unitPlan?.entries.has(hovered)?' · '+unitDefinitions[unitPlan.entries.get(hovered).type].name+' example':''}${hovered.riverEdges?' · river':''}`:'Outside map'});
canvas.addEventListener('pointerleave',()=>tileHover.show(undefined));
canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];tileHover.show(undefined)});canvas.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<4){const t=hit(e);if(t){const c=centre(t);focus(c.x,c.z,camera.zoom);tileHover.show(t)}}});
const benchmark=createBenchmark({renderer,camera,controls,lighting,views:{range:rangeView,grove,overview:frame},shadowCount:()=>shadowBuilds});
document.querySelector('#run-benchmark').onclick=()=>{tileHover.show(undefined);benchmark.start()};
renderer.info.autoReset=false;
let last=performance.now(),frames=0;renderer.setAnimationLoop(now=>{const measuring=benchmark.before(now);clockUniform.value=measuring?0:now*.001;controls.update();fogReview?.tick(now);updateTerrainDetail();renderer.info.reset();for(let i=0;i<benchmark.renders;i++)lighting.render();benchmark.after();frames++;if(now-last>1000){document.querySelector('#stats').textContent=`${map?.tiles.length||0} tiles · ${(frames*1000/(now-last)).toFixed(0)} fps\n${renderer.info.render.calls} draws · ${(renderer.info.render.triangles/1000).toFixed(0)}k triangles · ${shadowBuilds} shadow bake(s)\nMapgen ${genMs.toFixed(0)}ms · mesh build ${buildMs.toFixed(0)}ms\n${geometryStats}`;last=now;frames=0}});generate();

function inspectWater(predicate,width){const candidates=map.tiles.filter(predicate);candidates.sort((a,b)=>Math.hypot(a.col-map.width/2,a.row-map.height/2)-Math.hypot(b.col-map.width/2,b.row-map.height/2));const t=candidates[0];if(t){const c=centre(t);focus(c.x,c.z,width?(camera.right-camera.left)/width:8)}else document.querySelector('#readout').textContent='No example on this seed.'}
document.querySelector('#lake-view').onclick=()=>inspectWater(t=>t.terrain==='lake',8);
document.querySelector('#river-view').onclick=()=>inspectWater(t=>t.riverEdges&&!isWater(t)&&t.terrain!=='mountain');
document.querySelector('#coast-view').onclick=()=>inspectWater(t=>t.terrain==='coast',11);

function coastalCorners(){
 const exposure=t=>(t.shoreEdges||0).toString(2).replace(/0/g,'').length;
 const candidates=map.tiles.filter(t=>!isWater(t)&&t.terrain!=='mountain'&&exposure(t)>=3);
 const score=t=>exposure(t)*3-Math.hypot(t.col-map.width/2,t.row-map.height/2)*.18-(['forest','jungle'].includes(t.feature)?2:0);
 candidates.sort((a,b)=>score(b)-score(a));
 if(candidates[0]){const c=centre(candidates[0]);focus(c.x,c.z,(camera.right-camera.left)/7.5)}
}
document.querySelector('#coastal-corners-view').onclick=coastalCorners;

// Opt-in repeatable CPU picking diagnostic; samples the same screen positions.
if(new URLSearchParams(location.search).has('profile'))setTimeout(()=>{
 const report={viewport:[innerWidth,innerHeight],samples:100,picking:{}};
 for(const bounded of [false,true]){const times=[];for(let i=0;i<110;i++){pointer.set(Math.sin(i*2.39)*.8,Math.cos(i*1.71)*.8);ray.setFromCamera(pointer,camera);const start=performance.now();const candidates=bounded?picks.filter(m=>{if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();return ray.ray.intersectsBox(m.geometry.boundingBox)}):picks;ray.intersectObjects(candidates,false);if(i>=10)times.push(performance.now()-start)}times.sort((a,b)=>a-b);report.picking[bounded?'chunkBounds':'current']={medianMs:times[50],p95Ms:times[95],totalMs:times.reduce((a,b)=>a+b,0)}}
 const el=document.createElement('pre');el.id='profile-results';el.style.cssText='position:fixed;bottom:10px;right:10px;background:#fff;padding:12px;z-index:50';el.textContent=JSON.stringify(report,null,2);document.body.append(el);
},1500);

document.querySelector('#resolution').onchange=e=>{renderer.setPixelRatio(Math.min(devicePixelRatio,Number(e.target.value)));renderer.setSize(innerWidth,innerHeight);lighting.resize(innerWidth,innerHeight);lighting.setContact(Number(e.target.value)>1&&document.querySelector('#contact-shadows').checked)};

document.querySelector('#oasis-view').onclick=()=>inspectWater(t=>t.feature==='oasis');
document.querySelector('#floodplain-view').onclick=()=>inspectWater(t=>t.feature==='floodplain');

function grove(){
 const branches=t=>(t.riverEdges||0).toString(2).replace(/0/g,'').length;
 const candidates=map.tiles.filter(t=>branches(t)===2&&t.terrain==='grassland'&&!t.hills);
 const score=t=>map.tiles.filter(n=>Math.abs(n.col-t.col)<3&&Math.abs(n.row-t.row)<4).reduce((s,n)=>s+(n.feature==='forest'?3:0)+(n.terrain==='grassland'?1:0)-(n.terrain==='mountain'?6:0)-(n.hills?10:0)-(branches(n)>2?4:0)-(isWater(n)?15:0)-(['snow','tundra','desert'].includes(n.terrain)?4:0),0);
 candidates.sort((a,b)=>score(b)-score(a));
 const tile=candidates[0]||map.tiles.find(t=>t.feature==='forest');
 const c=centre(tile);focus(c.x,c.z-2.2,(camera.right-camera.left)/5.8);
}
document.querySelector('#grove-view').onclick=grove;
document.querySelector('#toggle-panel').onclick=()=>document.body.classList.toggle('controls-hidden');
if(new URLSearchParams(location.search).has('review'))document.body.classList.add('controls-hidden');

document.querySelector('#contact-shadows').onchange=e=>lighting.setContact(e.target.checked);
document.querySelector('#sun-shadows').onchange=e=>{sun.castShadow=e.target.checked;renderer.shadowMap.needsUpdate=e.target.checked};

document.querySelector('#shading-style').onchange=e=>{const painted=e.target.value==='painted';paintedStyle.setPainted(painted);document.querySelector('#paper-grain').disabled=!painted};
function rockView(){
 const candidates=map.tiles.filter(t=>t.terrain==='mountain');
 const score=t=>map.tiles.filter(n=>Math.abs(n.col-t.col)<3&&Math.abs(n.row-t.row)<3).reduce((s,n)=>s+(n.feature==='forest'?3:0)+(n.terrain==='grassland'?2:0)-(n.terrain==='mountain'?1:0)-(['snow','tundra','desert'].includes(n.terrain)?4:0),0);
 candidates.sort((a,b)=>score(b)-score(a));
 if(candidates[0]){const c=centre(candidates[0]);focus(c.x,c.z,(camera.right-camera.left)/8)}
}
document.querySelector('#rock-view').onclick=rockView;

document.querySelector('#paper-grain').oninput=e=>paintedStyle.setPaper(Number(e.target.value));

function hillView(){
 const candidates=map.tiles.filter(t=>t.hills&&['grassland','plains'].includes(t.terrain)&&!['forest','jungle','oasis'].includes(t.feature));
 const ridgeScore=t=>{
  if(!t.sharedHillEdges)return 0;
  const edge=Array.from({length:6},(_,i)=>i).find(i=>t.sharedHillEdges&(1<<i));
  const other=neighbour(t,map,edge);
  if(['forest','jungle'].includes(other.feature))return -20;
  return 12+[t,other].reduce((s,tile)=>s+Math.max(0,...hillMounds(tile).filter(m=>m.shared).map(({bounds:b})=>Math.hypot(b.maxX-b.minX,b.maxZ-b.minZ)))*18,0);
 };
 const score=t=>ridgeScore(t)+map.tiles.filter(n=>Math.abs(n.col-t.col)<3&&Math.abs(n.row-t.row)<3).reduce((s,n)=>s+(n.terrain==='grassland'?2.8:n.terrain==='plains'?1:0)+(n.hills?1:2)+(n.riverEdges?1:0)-(n.terrain==='mountain'?8:0)-(['forest','jungle'].includes(n.feature)?3:0)-(isWater(n)?8:0),0);
 candidates.sort((a,b)=>score(b)-score(a));
 if(candidates[0]){
  const tile=candidates[0],c=centre(tile),d=Array.from({length:6},(_,i)=>i).find(i=>tile.sharedHillEdges&(1<<i));
  const other=d===undefined?null:neighbour(tile,map,d),oc=other?centre(other):c;
  focus((c.x+oc.x)/2,(c.z+oc.z)/2,(camera.right-camera.left)/7.6);
 }
}
document.querySelector('#hill-view').onclick=hillView;

function rangeView(){
 const candidates=map.tiles.filter(t=>t.terrain==='mountain');
 const score=t=>{
  let value=0;
  for(let d=0;d<6;d++){
   const n=neighbour(t,map,d);if(!n)continue;
   const joined=t.joinedEdges&(1<<d);
   value+=joined&&n.terrain==='mountain'?14:joined&&n.hills?7:0;
   value-=isWater(n)?5:0;value-=n.feature==='forest'?2:0;
  }
  return value-Math.hypot(t.col-map.width/2,t.row-map.height/2)*.2;
 };
 candidates.sort((a,b)=>score(b)-score(a));
 if(candidates[0]){const c=centre(candidates[0]);focus(c.x,c.z,(camera.right-camera.left)/10)}
}
document.querySelector('#range-view').onclick=rangeView;

// Palette changes are uniform updates. Only changing the sun direction
// requests a new full-map shadow bake; geometry and instancing stay intact.
const timeSelect=document.querySelector('#time-of-day');
timeSelect.innerHTML=Object.entries(daylightPresets).map(([key,p])=>`<option value="${key}">${p.label}</option>`).join('');
const daylightSwitcher=document.createElement('nav');daylightSwitcher.className='daylight-switcher';daylightSwitcher.setAttribute('aria-label','Lighting studies');
daylightSwitcher.innerHTML=Object.entries(daylightPresets).map(([key,p])=>`<button type="button" data-light="${key}" title="${p.note}" aria-pressed="false">${p.label}</button>`).join('');
document.body.append(daylightSwitcher);
function applyDaylight(key,updateUrl=true){
 if(!Object.hasOwn(daylightPresets,key))return;
 const next=daylightPresets[key],moved=next.sunOffset.some((v,i)=>v!==activeDaylight.sunOffset[i]);
 timeOfDay=key;activeDaylight=next;paintedStyle.setDaylight(next);
 sun.color.set(next.sun);sun.intensity=next.strength;
 sun.shadow.intensity=next.shadowIntensity;sun.shadow.radius=next.shadowRadius;
 skyFill.color.set(next.sky);skyFill.groundColor.set(next.earth);skyFill.intensity=next.fill;
 scene.environmentIntensity=next.environment;renderer.setClearColor(next.background);
 timeSelect.value=key;document.querySelector('#daylight-note').textContent=next.note;
 for(const button of daylightSwitcher.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.light===key));
 if(map&&moved)prepareShadows();
 if(updateUrl){const url=new URL(location.href);url.searchParams.set('light',key);history.replaceState(null,'',url);}
}
timeSelect.onchange=e=>applyDaylight(e.target.value);
daylightSwitcher.onclick=e=>{const button=e.target.closest('button[data-light]');if(button)applyDaylight(button.dataset.light)};
applyDaylight(timeOfDay,false);


function settlementView(key,close=false){
 const tile=settlementPlan?.sites[key];if(!tile)return;
 const c=centre(tile);focus(c.x,c.z,(camera.right-camera.left)/(close?3.7:key==='city'?6.7:4.7));
 document.querySelector('#readout').textContent=key==='city'?'Settlement art study · illustrative city and worked land':key==='hillFarm'?'Hill farm · painted crop strokes follow the existing surface':resourceDefinitions[key]?.name||key;
}
document.querySelector('#settlement-view').onclick=()=>settlementView('city');
document.querySelector('#hill-farm-view').onclick=()=>settlementView('hillFarm',true);
document.querySelector('#herd-view').onclick=()=>settlementView('pasture',true);
const resourceSelect=document.querySelector('#resource-view');
resourceSelect.innerHTML='<option value="">Find a resource…</option>'+Object.entries(resourceDefinitions).map(([id,d])=>`<option value="${id}">${d.name}</option>`).join('');
resourceSelect.onchange=e=>{
 const id=e.target.value;
 const tile=map.tiles.find(t=>studyEntry(t)?.resource===id);
 if(tile){const c=centre(tile);focus(c.x,c.z,(camera.right-camera.left)/3.7);document.querySelector('#readout').textContent=resourceDefinitions[id].name}
 else document.querySelector('#readout').textContent='This seed has no '+resourceDefinitions[id]?.name+'.';
};
const settlementToggle=document.querySelector('#settled-preview');settlementToggle.checked=settled;
settlementToggle.onchange=e=>{
 settled=e.target.checked;const url=new URL(location.href);if(settled)url.searchParams.set('settled','');else url.searchParams.delete('settled');history.replaceState(null,'',url);
 if(!settled){
  placementEnabled=false;document.querySelector('#placement-preview').checked=false;url.searchParams.delete('placement');
  if(url.searchParams.get('view')==='placement')url.searchParams.set('view','settlement');history.replaceState(null,'',url);
 }
 const start=performance.now();build();buildMs=performance.now()-start;if(settled)settlementView('city');
};
document.querySelector('#city-walls').onchange=e=>{cityWalls=e.target.checked;renderer.shadowMap.needsUpdate=sun.castShadow};

const workSelect=document.querySelector('#work-view');
workSelect.onchange=e=>settlementView(e.target.value,true);
function syncSettlementControls(){
 for(const id of ['settlement-view','hill-farm-view','herd-view','city-walls','work-view'])document.getElementById(id).disabled=!settled;
}
syncSettlementControls();settlementToggle.addEventListener('change',syncSettlementControls);

const placementToggle=document.querySelector('#placement-preview');placementToggle.checked=placementEnabled;
function syncTerritoryLegend(){
 const key=document.querySelector('#territory-key');key.replaceChildren();
 for(const owner of territoryFixture?.territories||[]){
  const item=document.createElement('span'),swatch=document.createElement('span');
  item.style.cssText='display:inline-flex;align-items:center;gap:6px';
  swatch.style.cssText=`width:24px;height:10px;background:linear-gradient(to bottom,${owner.colors[0]} 55%,${owner.colors[1]} 55%);border:1px solid #8c826f`;
  swatch.setAttribute('aria-hidden','true');item.append(swatch,owner.label);key.append(item);
 }
}
function placementView(detail='overview'){
 if(!placementEnabled||!settled||!roadPlan){
  placementEnabled=true;settled=true;placementToggle.checked=true;settlementToggle.checked=true;
  const start=performance.now();build();buildMs=performance.now()-start;syncSettlementControls();syncDiscoveryControls();
 }
 if(!roadPlan)return;
 const tile=['overview','gate','colours'].includes(detail)?settlementPlan.sites.city:roadPlan.review[detail];
 if(!tile){document.querySelector('#readout').textContent='No '+detail+' example on this seed.';return}
 const c=detail==='colours'&&territoryFixture?.borderFocus?territoryFixture.borderFocus:centre(tile),width=detail==='overview'?12:detail==='gate'?3.8:detail==='hill'?5.8:5;
 focus(c.x,c.z+(detail==='gate'?.5:0),(camera.right-camera.left)/width);
 const descriptions={overview:'Roads & territory · staged placement review',junction:'Joined paths · continuous intersections',hill:'Hill road · follows the sculpted slope',gate:'City entrance · path through the palisade gate',borderForest:'Territory · ground-level ink beneath the grove',colours:'Mithridates · Tyrian purple and silver border'};
 document.querySelector('#readout').textContent=descriptions[detail]||descriptions.overview;
 const url=new URL(location.href);url.searchParams.set('view','placement');url.searchParams.set('detail',detail);url.searchParams.set('placement','');url.searchParams.set('settled','');history.replaceState(null,'',url);
}
for(const button of document.querySelectorAll('[data-placement]'))button.onclick=()=>placementView(button.dataset.placement);
placementToggle.onchange=e=>{
 placementEnabled=e.target.checked;
 if(placementEnabled){placementView();return}
 const url=new URL(location.href);url.searchParams.delete('placement');if(url.searchParams.get('view')==='placement')url.searchParams.set('view','settlement');history.replaceState(null,'',url);
 const start=performance.now();build();buildMs=performance.now()-start;
};


function discoveryView(kind,index=0){
 const tile=settlementPlan?.discoverySites[kind]?.[index];
 if(!tile||(kind==='barbarianCamp'&&!settled))return;
 const c=centre(tile);focus(c.x,c.z,(camera.right-camera.left)/3.7);
 const origin=kind==='barbarianCamp'?'staged camp example':kind==='antiquity'?'generated site · revealed for art review':'generated discovery';
 document.querySelector('#readout').textContent=`${siteLabels[kind]} · ${origin} · ${tile.col},${tile.row}`;
 document.querySelector('#site-occurrence').value=`${kind}:${index}`;
 const url=new URL(location.href);url.searchParams.set('view','discoveries');url.searchParams.set('site',kind);history.replaceState(null,'',url);
}
for(const button of document.querySelectorAll('[data-site]'))button.onclick=()=>discoveryView(button.dataset.site);
function syncDiscoveryControls(){
 for(const button of document.querySelectorAll('[data-site]'))button.disabled=!settlementPlan?.discoverySites[button.dataset.site]?.length||(button.dataset.site==='barbarianCamp'&&!settled);
 const select=document.querySelector('#site-occurrence');
 select.innerHTML='<option value="">Inspect another site…</option>'+Object.entries(settlementPlan?.discoverySites||{}).filter(([kind])=>kind!=='barbarianCamp'||settled).map(([kind,tiles])=>`<optgroup label="${siteLabels[kind]}">${tiles.map((t,i)=>`<option value="${kind}:${i}">${siteLabels[kind]} · ${t.col},${t.row}${t.feature!=='none'?' · '+t.feature:''}${t.hills?' · hills':''}</option>`).join('')}</optgroup>`).join('');
}
document.querySelector('#site-occurrence').onchange=e=>{if(!e.target.value)return;const [kind,index]=e.target.value.split(':');discoveryView(kind,Number(index))};
settlementToggle.addEventListener('change',syncDiscoveryControls);


function unitView(type='warrior',overview=false){
 if(!unitsEnabled)return;
 if(type==='civilian'){compareUnits(1.28,'civilian');return}
 if(type==='new'){compareUnits(1.28,'new');return}
 if(type==='all'||overview){compareUnits(overview?1.65:1.28);return}
 if(!unitPlan?.byType[type])type='warrior';const piece=unitPlan?.byType[type];if(!piece)return;
 const c=centre(piece.tile);
 focus(c.x+piece.x,c.z+piece.z,(camera.right-camera.left)/3.25,piece.y+unitAssets[type].height*.46);
 unitArt.select(type);document.querySelector('#unit-type').value=type;
 document.querySelector('#readout').textContent=`${type==='greatPerson'?`Great ${greatPersonFamilies[activeGreatPersonFamily]}`:unitDefinitions[type].name} · ${unitNotes[type]} · staged example`;
 const url=new URL(location.href);url.searchParams.set('view','units');url.searchParams.set('unit',type);history.replaceState(null,'',url);
}
const unitToggle=document.querySelector('#unit-preview');unitToggle.checked=unitsEnabled;
unitToggle.onchange=e=>{
 unitsEnabled=e.target.checked;const url=new URL(location.href);if(unitsEnabled)url.searchParams.set('units','');else url.searchParams.delete('units');history.replaceState(null,'',url);
 const start=performance.now();build();buildMs=performance.now()-start;syncUnitControls();if(unitsEnabled)unitView('warrior');
};
const unitType=document.querySelector('#unit-type');
unitType.innerHTML='<option value="all">All unit pieces</option><option value="civilian">Civilian pieces</option><option value="new">New unit pieces</option>'+unitExamples.map(id=>`<option value="${id}">${unitDefinitions[id].name}</option>`).join('');unitType.onchange=e=>unitView(e.target.value);
const greatFamily=document.querySelector('#great-person-family');
greatFamily.innerHTML=Object.entries(greatPersonFamilies).map(([id,label])=>`<option value="${id}">${label}</option>`).join('');greatFamily.value=activeGreatPersonFamily;
greatFamily.disabled=true;
greatFamily.onchange=e=>{
 activeGreatPersonFamily=greatPersonFamily(e.target.value);
 unitAssets.greatPerson=unitAssets.greatPeople[activeGreatPersonFamily];
 // All family variants share their plinth and contact points. Swap only the
 // small unit batches; terrain generation and its fitted poses stay intact.
 unitArt.build(unitPlan,unitsEnabled);renderer.shadowMap.needsUpdate=sun.castShadow;
 const url=new URL(location.href);url.searchParams.set('family',activeGreatPersonFamily);history.replaceState(null,'',url);unitView('greatPerson');
};
const unitOwner=document.querySelector('#unit-owner');
unitOwner.innerHTML=Object.entries(unitOwners).map(([id,o])=>`<option value="${id}">${o.label}</option>`).join('');
const requestedOwner=new URLSearchParams(location.search).get('owner');unitOwner.value=unitOwners[requestedOwner]?requestedOwner:'enamel';
unitOwner.onchange=e=>{unitArt.setOwner(e.target.value);const url=new URL(location.href);url.searchParams.set('owner',e.target.value);history.replaceState(null,'',url)};
document.querySelector('#unit-ring').onchange=e=>unitArt.setRing(e.target.checked);
document.querySelector('#unit-lineup').onclick=()=>unitView('warrior',true);
function compareUnits(padding=1.28,group='all'){
 if(!unitsEnabled||!unitPlan?.entries.size)return;
 const subset=group==='civilian'?civilianUnitExamples:group==='new'?newUnitExamples:null;
 const pieces=[...unitPlan.entries.values()].filter(p=>!subset||subset.includes(p.type));
 if(!pieces.length)return;
 // Fit the actual posed meshes, including bows, tools and raised terrain.
 // The fixed 45-degree camera projects world (y-z) onto screen vertical.
 let minX=Infinity,maxX=-Infinity,minV=Infinity,maxV=-Infinity;
 for(const p of pieces){
  const c=centre(p.tile),q=new T.Quaternion().fromArray(p.quaternion);
  for(const role of ['fixed','owner']){
   const b=unitAssets[p.type][role].boundingBox;
   for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
    const v=new T.Vector3(x,y,z).applyQuaternion(q).add(new T.Vector3(c.x+p.x,p.y,c.z+p.z)),vertical=(v.y-v.z)*Math.SQRT1_2;
    minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minV=Math.min(minV,vertical);maxV=Math.max(maxV,vertical);
   }
  }
 }
 const width=Math.max(maxX-minX,(maxV-minV)*innerWidth/innerHeight)*padding;
 focus((minX+maxX)/2,-(minV+maxV)*Math.SQRT1_2,(camera.right-camera.left)/width);
 unitArt.select(group);unitType.value=group;
 document.querySelector('#readout').textContent=`${group==='civilian'?'Civilian':group==='new'?'New unit':'Chess-piece'} study · ${pieces.length} unit lines · staged examples`;
 const url=new URL(location.href);url.searchParams.set('view','units');url.searchParams.set('unit',group);history.replaceState(null,'',url);
}
document.querySelector('#infantry-pair').onclick=()=>compareUnits();
document.querySelector('#civilian-pieces').onclick=()=>unitView('civilian');
document.querySelector('#new-pieces').onclick=()=>unitView('new');
function syncUnitControls(){for(const id of ['unit-type','unit-owner','unit-lineup','infantry-pair','civilian-pieces','new-pieces','great-person-family','unit-ring'])document.querySelector('#'+id).disabled=!unitsEnabled}
