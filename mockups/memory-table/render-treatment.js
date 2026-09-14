import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Art studies, deliberately different rendering languages; not production settings.
export function treatment({simple,renderer,scene,camera,board,cabinet,sun}){
 const hemisphere=scene.children.find(o=>o.isHemisphereLight);
 hemisphere.intensity=simple?.65:.55;hemisphere.color.set('#c8d2db');hemisphere.groundColor.set('#141b2b');
 sun.intensity=simple?3:3.1;sun.color.set(simple?'#fff1cf':'#ffd8a3');sun.position.set(-5,9,3);
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=simple?1.05:.82;
 const converted=new Map();
 if(simple){
  const ramp=new T.DataTexture(new Uint8Array([22,78,178,255]),4,1,T.RedFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
  const ink=new T.MeshBasicMaterial({color:'#152334',side:T.BackSide});
  const outlineMaterial=new T.LineBasicMaterial({color:'#182c38',transparent:true,opacity:.8});
  for(const root of [board,cabinet]){const originals=[];root.traverse(o=>{if(o.isMesh&&!o.material.transparent)originals.push(o)});
   for(const o of originals){const old=o.material;if(!converted.has(old))converted.set(old,new T.MeshToonMaterial({color:old.color,gradientMap:ramp,side:old.side}));o.material=converted.get(old);
    // Small separate sculpts get a silhouette hull; merged land gets crease ink.
    if(o.geometry.attributes.position.count<12000){const outline=new T.Mesh(o.geometry,ink);outline.scale.setScalar(1.025);outline.castShadow=false;outline.receiveShadow=false;o.add(outline)}
    if(o.geometry.attributes.position.count>5000){const edges=new T.LineSegments(new T.EdgesGeometry(o.geometry,35),outlineMaterial);o.add(edges)}
   }
  }
  const floor=scene.children.find(o=>o.isMesh);floor.material.color.set('#9eacac');renderer.setClearColor('#9eacac');
  return {render:()=>renderer.render(scene,camera),resize:()=>{}};
 }
 // Hand-built pigment/fibre and hammered relief maps, shared across materials.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');const im=ctx.createImageData(512,512);
 let seed=122;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;const vein=Math.sin(x*.07+Math.sin(y*.023)*5)+Math.sin(y*.11+x*.012);const n=130+vein*19+(rand()-.5)*70;im.data.set([n,n,n,255],i)}ctx.putImageData(im,0,0);
 const relief=new T.CanvasTexture(canvas);relief.wrapS=relief.wrapT=T.RepeatWrapping;relief.repeat.set(3,3);
 const env=new T.PMREMGenerator(renderer);const room=new RoomEnvironment();const envTarget=env.fromScene(room,.04);scene.environment=envTarget.texture;env.dispose();room.dispose();
 for(const root of [board,cabinet])root.traverse(o=>{if(!o.isMesh||o.material.transparent)return;const old=o.material;if(!converted.has(old)){
 const color=old.color.clone(),hsl={};color.getHSL(hsl);const metallic=old.metalness>.4;const water=hsl.h>.47&&hsl.h<.59&&hsl.s>.25;
 const material=new T.MeshPhysicalMaterial({color,map:old.map,bumpMap:relief,bumpScale:metallic?.022:water?.014:.065,roughnessMap:water?null:relief,roughness:metallic?.45:water?.22:1,metalness:metallic?.8:0,clearcoat:water?.7:metallic?.25:.08,envMapIntensity:metallic?.75:water?.3:.08,side:old.side});converted.set(old,material)}o.material=converted.get(old)});
 const floor=scene.children.find(o=>o.isMesh);floor.material.color.set('#777b73');renderer.setClearColor('#777b73');
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight);ao.kernelRadius=6;ao.minDistance=.003;ao.maxDistance=.16;composer.addPass(ao);composer.addPass(new OutputPass());
 return {render:()=>composer.render(),resize:(w,h)=>composer.setSize(w,h)};
}
