// The approved study's lighting and materials, without its scene controls or fixtures.
import * as T from 'three';
import {terrainColors} from '../terrainStudy/terrainPigment.js';
import {loadVegetation} from '../terrainStudy/vegetation.js';
import {createLighting} from '../terrainStudy/lighting.js';
import {createPainterlyStyle} from '../terrainStudy/painterly.js';
import {daylightPresets} from '../terrainStudy/daylightPresets.js';
import {separatePaintedShadows,createCounterShadows} from './paintedShadows.js';
import {PAINTED_WORK_ASSET_NAMES} from './paintedWorks';
import {PAINTED_SITE_ASSET_NAMES} from './paintedSites';
import {loadSettlementAssets} from '../terrainStudy/settlementAssets.js';
import {VIEW3D} from './lookData';

export async function createPaintedLook(renderer,scene,camera,key='golden') {
 const resources=new Set();
 const own=resource=>{resources.add(resource);return resource};
 const previous={environment:scene.environment,environmentIntensity:scene.environmentIntensity,background:scene.background,
  toneMapping:renderer.toneMapping,layers:camera.layers.mask,shadowType:renderer.shadowMap.type,shadowAutoUpdate:renderer.shadowMap.autoUpdate,shadowNeedsUpdate:renderer.shadowMap.needsUpdate};
 let lighting,separatedShadows,sun,sky,dynamicSun,disposed=false;
 function dispose(){
  if(disposed)return;disposed=true;
  separatedShadows?.dispose();lighting?.dispose();
  for(const light of [sun,sky,dynamicSun])if(light){scene.remove(light);if(light.target)scene.remove(light.target);light.shadow?.map?.dispose()}
  for(const resource of resources)resource.dispose();resources.clear();
  scene.environment=previous.environment;scene.environmentIntensity=previous.environmentIntensity;scene.background=previous.background;
  renderer.toneMapping=previous.toneMapping;camera.layers.mask=previous.layers;
  renderer.shadowMap.type=previous.shadowType;renderer.shadowMap.autoUpdate=previous.shadowAutoUpdate;renderer.shadowMap.needsUpdate=previous.shadowNeedsUpdate;
 }
 try {
const mat=c=>own(new T.MeshStandardMaterial({color:c,roughness:.88,metalness:0,flatShading:true}));
const colors=terrainColors;
const ground=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,own(new T.MeshStandardMaterial({color:c,roughness:.95,metalness:0,flatShading:true,vertexColors:true}))]));const earth=mat('#948653');
const waterMaterials={bank:mat('#819675'),river:mat('#8198d0'),shallows:mat('#477baa'),foam:mat('#95b1c0')};
for(const m of Object.values(waterMaterials))m.side=T.DoubleSide;
const clockUniform={value:0};
const mineralTexture = own(await new T.TextureLoader().loadAsync('/terrain-study/mineral-grain.png'));
mineralTexture.wrapS = mineralTexture.wrapT = T.RepeatWrapping;
mineralTexture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
const mineralUniform={value:mineralTexture};
const flockTexture=own(await new T.TextureLoader().loadAsync('/terrain-study/flocking-grain.png'));
flockTexture.wrapS=flockTexture.wrapT=T.RepeatWrapping;
flockTexture.anisotropy=mineralTexture.anisotropy;
const flockUniform={value:flockTexture};
const paintTexture=own(await new T.TextureLoader().loadAsync('/terrain-study/gouache-grain.png'));
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
const featureMaterials={shrub:mat('#678447'),stone:mat('#c09e73'),fertile:mat('#8eaa63'),bank:mat('#c5b381'),pool:mat('#4968a8'),shallow:mat('#6aafa5'),reeds:mat('#6b8752')};


 // Finish asynchronous asset loading before changing the live renderer's lighting.
 const assets=await loadVegetation({value:0},flockTexture,mineralTexture,{indexed:true});
 for(const material of assets.materials)own(material);
 for(const asset of [...assets.broadleaves,...assets.cypresses,...assets.escarpments,assets.limestone]){own(asset.geometry);if(asset.shoulderGeometry)own(asset.shoulderGeometry)}
 const cityAssets=await loadSettlementAssets({register(){}},mineralTexture,{names:['city-house','city-loggia','civic-sanctum','city-spire','city-dome','house','temple','bell-tower',...PAINTED_WORK_ASSET_NAMES,...PAINTED_SITE_ASSET_NAMES]});
 for(const resource of Object.values(cityAssets))own(resource);
 lighting=createLighting(renderer,scene,camera,{unitStencil:true});
 const style=createPainterlyStyle(renderer,lighting,paintTexture);
 style.register(cityAssets.material);
 for(const m of [...assets.materials,mergedDetails,earth,featureMaterials.stone,featureMaterials.shrub])style.register(m);
 style.register(mergedLand,{terrain:true});style.register(mergedWater,{water:true});
 sun=new T.DirectionalLight();sky=new T.HemisphereLight();
 // Terrain shadows bake only on world/visibility changes. Moving counters use
 // a separate small map, so panning or a walk never re-renders the whole world.
 dynamicSun=new T.DirectionalLight('#ffffff',.00001);
 const shadowKnobs=VIEW3D.painted.shadows;
 dynamicSun.castShadow=true;dynamicSun.shadow.mapSize.set(shadowKnobs.counterMapSize,shadowKnobs.counterMapSize);
 dynamicSun.shadow.camera.layers.set(2);dynamicSun.shadow.bias=-.0001;dynamicSun.shadow.normalBias=.012;
 sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
 const staticMapSize=Math.min(shadowKnobs.staticMapSize,renderer.capabilities.maxTextureSize);
 sun.castShadow=true;sun.shadow.mapSize.set(staticMapSize,staticMapSize);
 sun.shadow.bias=-.000055;sun.shadow.normalBias=.012;
 scene.add(sun,sun.target,sky,dynamicSun,dynamicSun.target);camera.layers.enable(2);
 renderer.shadowMap.type=T.PCFShadowMap;
 renderer.shadowMap.autoUpdate=false;
 let preset,bounds,period=0;
 separatedShadows=separatePaintedShadows(renderer,sun,dynamicSun);
 function fitShadows(nextBounds=bounds,nextPeriod=period){
  bounds=nextBounds;period=nextPeriod;if(!bounds)return;
  const x=(bounds.minX+bounds.maxX)/2,z=(bounds.minZ+bounds.maxZ)/2;
  const r=Math.hypot(bounds.maxX-bounds.minX+2*period,bounds.maxZ-bounds.minZ)*.5+5;
  const [sx,sy,sz]=preset.sunOffset;
  sun.position.set(x+r*sx,r*sy,z+r*sz);sun.target.position.set(x,0,z);
  sun.updateMatrixWorld();sun.target.updateMatrixWorld();
  const sc=sun.shadow.camera;sc.position.copy(sun.position);sc.lookAt(sun.target.position);sc.updateMatrixWorld();
  const box=new T.Box3();
  for(const xx of [bounds.minX-period-2,bounds.maxX+period+2])for(const yy of [-.5,5])for(const zz of [bounds.minZ-2,bounds.maxZ+2])box.expandByPoint(new T.Vector3(xx,yy,zz).applyMatrix4(sc.matrixWorldInverse));
  Object.assign(sc,{left:box.min.x-2,right:box.max.x+2,bottom:box.min.y-2,top:box.max.y+2,near:Math.max(.5,-box.max.z-3),far:-box.min.z+3});
  sc.updateProjectionMatrix();invalidateShadows();
 }
 function invalidateShadows(){sun.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true}
 // The counter map is re-rendered on a *seam*, never on a frame — see
 // `createCounterShadows` for which seams and why a pan is not one of them.
 const counters=createCounterShadows(renderer,dynamicSun,shadowKnobs.counterCoverage);
 function invalidateDynamicShadows(){counters.invalidate()}
 function updateDynamicShadows(target,radius,reach){return counters.update(target,radius,preset.sunOffset,reach)}
 function setDaylight(value){
  preset=daylightPresets[value]||daylightPresets.golden;
  sun.color.set(preset.sun);sun.intensity=preset.strength;sun.shadow.intensity=preset.shadowIntensity;sun.shadow.radius=preset.shadowRadius;
  dynamicSun.shadow.intensity=preset.shadowIntensity;dynamicSun.shadow.radius=preset.shadowRadius;
  sky.color.set(preset.sky);sky.groundColor.set(preset.earth);sky.intensity=preset.fill;
  scene.background=new T.Color(preset.background);scene.environmentIntensity=preset.environment;
  // The counter rig re-fits itself: it is handed `preset.sunOffset` every frame
  // and a turned sun is one of the three things it watches for.
  style.setDaylight(preset);fitShadows();
 }
 setDaylight(key);
 return {
  assets,cityAssets,workAssets:cityAssets,registerMaterial:(material,options)=>style.register(material,options),
  materials:{ground,earth,mergedLand,mergedWater,mergedDetails,water:waterMaterials,features:featureMaterials},
  sun,sky,setDaylight,fitShadows,invalidateShadows,updateDynamicShadows,invalidateDynamicShadows,
  get shadowBakes(){return separatedShadows.bakes},
  render(){lighting.render()},resize(w,h){lighting.resize(w,h)},
  setContactDetail(pixels){lighting.setContactDetail(pixels)},
  // Static foliage stays at its baked pose; only the gentle water pigment moves.
  updateTime(seconds){clockUniform.value=seconds},
  dispose,
 };
 }catch(error){dispose();throw error}
}
