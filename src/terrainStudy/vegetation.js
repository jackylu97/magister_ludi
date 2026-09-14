import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';

export async function loadVegetation(time,flocking,mineral,{indexed=true}={}) {
  const loader=new GLTFLoader();
  const foliageMaterial=new T.MeshStandardMaterial({color:'white',vertexColors:true,roughness:.93,flatShading:true,bumpMap:flocking,bumpScale:.007});
  const rockMaterial=new T.MeshStandardMaterial({color:'white',vertexColors:true,roughness:.9,flatShading:true,bumpMap:mineral,bumpScale:.006});
  const rangeMaterial=rockMaterial.clone();
  rangeMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float rangeFoot;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>',`#include <color_vertex>
      #ifdef USE_INSTANCING_COLOR
      vec3 stonePigment=vColor.xyz/max(instanceColor,vec3(.001));
      vColor.xyz=mix(stonePigment,instanceColor,rangeFoot);
      #endif
    `);
  };
  rangeMaterial.customProgramCacheKey=()=> 'mountain-range-pigments-v1';
  foliageMaterial.onBeforeCompile=shader=>{
    shader.uniforms.groveTime=time;
    shader.vertexShader='uniform float groveTime; attribute float canopyWeight;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>',`#include <color_vertex>
      #ifdef USE_INSTANCING_COLOR
      // Seasonal pigment affects the crown; the carved trunk stays brown.
      vColor.xyz *= mix(1.0/max(instanceColor,vec3(.001)),vec3(1.0),canopyWeight);
      #endif
    `);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      vec3 root=instanceMatrix[3].xyz;
      float bend=smoothstep(.35,1.5,position.y);
      transformed.x+=sin(groveTime*.8+root.x*.7+root.z*.6)*bend*.012;
      transformed.z+=cos(groveTime*.6+root.x*.4)*bend*.006;
      #endif
    `);
  };
  foliageMaterial.customProgramCacheKey=()=> 'sculpted-grove-breeze-v2';
  const outputs=new Set();
  async function species(name,evergreen=false,rock=false) {
    const {scene}=await loader.loadAsync(`/terrain-study/${name}.glb`);
    const parts=[],temporary=new Set();
    try {
    scene.updateMatrixWorld(true);
    scene.traverse(object=>{
      if(!object.isMesh)return;
      let geometry=object.geometry.clone();temporary.add(geometry);
      if(geometry.index){const indexed=geometry;geometry=geometry.toNonIndexed();temporary.add(geometry);indexed.dispose();temporary.delete(indexed)}
      geometry.applyMatrix4(object.matrixWorld);
      const pigment=object.material.color.clone(),foliage=object.material.name.startsWith('leaf');
      if(foliage)pigment.set(evergreen?'#356d59':['#5e863c','#739744','#8da751','#628449'][parseInt(object.material.name.slice(4),10)%4]);
      const p=geometry.attributes.position,cavity=geometry.getAttribute('color');
      const colors=new Float32Array(p.count*3),uv=new Float32Array(p.count*2);
      for(let i=0;i<p.count;i++){
        const ao=cavity?.getX(i)??1,shade=.62+.38*ao;
        colors.set([pigment.r*shade,pigment.g*shade,pigment.b*shade],i*3);
        uv[i*2]=(p.getX(i)+p.getZ(i)*.61)*.45;uv[i*2+1]=(p.getY(i)+p.getZ(i)*.37)*.45;
      }
      for(const key of Object.keys(geometry.attributes))if(!['position','normal'].includes(key))geometry.deleteAttribute(key);
      geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setAttribute('canopyWeight',new T.Float32BufferAttribute(new Float32Array(p.count).fill(foliage?1:0),1));parts.push(geometry);
    });
    const geometry=mergeGeometries(parts);
    if(!geometry)throw new Error(`Cannot merge vegetation asset ${name}`);
    outputs.add(geometry);
    // Reuse the main fracture blocks for low shoulders, omitting the tiny
    // rubble already sculpted around the full summit asset.
    const shoulderParts=name.startsWith('escarpment')?parts.filter(g=>{g.computeBoundingBox();return g.boundingBox.max.y-g.boundingBox.min.y>.62}):[];
    const shoulderGeometry=shoulderParts.length?mergeGeometries(shoulderParts):null;
    if(shoulderGeometry)outputs.add(shoulderGeometry);
    return {geometry,shoulderGeometry,material:rock?rockMaterial:foliageMaterial};
    }finally{
      for(const geometry of temporary)geometry.dispose();
      // Each GLB owns these source objects; its baked output has independent
      // geometry and the three shared study materials above.
      const source=new Set();
      scene.traverse(object=>{
        if(!object.isMesh)return;
        source.add(object.geometry);
        for(const material of Array.isArray(object.material)?object.material:[object.material]){
          source.add(material);
          for(const {value} of Object.values(Object.getOwnPropertyDescriptors(material)))if(value?.isTexture)source.add(value);
        }
      });
      for(const resource of source)resource.dispose();
    }
  }
  try {
  // A rejected request must also release batches whose downloads finish later.
  // All requests still run concurrently; ownership transfers only as one set.
  const loaded=await Promise.allSettled([
    ...[0,1,2].map(i=>species(`grove-sculpt-${i}`)),
    ...[0,1].map(i=>species(`cypress-sculpt-${i}`,true)),
    ...[0,1,2].map(i=>species(`escarpment-${i}`,false,true)),
    species('limestone',false,true)
  ]);
  const failed=loaded.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
  const assets=loaded.map(result=>result.value);
  const broadleaves=assets.slice(0,3),cypresses=assets.slice(3,5),escarpments=assets.slice(5,8),limestone=assets[8];
  for(const [geometry,shoulder]of [...escarpments.flatMap(asset=>[[asset.geometry,false],[asset.shoulderGeometry,true]]),[limestone.geometry,true]]){
    if(!geometry)continue;
    geometry.computeBoundingBox();
    const p=geometry.attributes.position,n=geometry.attributes.normal,weights=new Float32Array(p.count),height=geometry.boundingBox.max.y;
    for(let i=0;i<p.count;i+=3){
      const y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/(3*height);
      const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
      const cut=(shoulder?.32:.19)+.055*Math.sin(x*9+z*6),up=n.getY(i)>.24;
      const weight=Math.max(geometry===limestone.geometry?.46:0,y<cut?(shoulder?.90:.74):y<(shoulder?.62:.38)&&up?(shoulder?.68:.49):0);
      weights.fill(weight,i,i+3);
    }
    geometry.setAttribute('rangeFoot',new T.BufferAttribute(weights,1));
  }
  if(indexed)for(const asset of [...broadleaves,...cypresses,...escarpments,limestone]){
    indexGeometry(asset.geometry);
    if(asset.shoulderGeometry)indexGeometry(asset.shoulderGeometry);
  }
  return {broadleaves,cypresses,escarpments,limestone,rangeMaterial,broadleaf:broadleaves[0],cypress:cypresses[0],materials:[foliageMaterial,rockMaterial,rangeMaterial]};
  }catch(error){
    for(const geometry of outputs)geometry.dispose();
    for(const material of [foliageMaterial,rockMaterial,rangeMaterial])material.dispose();
    throw error;
  }
}
