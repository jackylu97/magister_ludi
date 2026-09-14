import * as T from 'three';
import {daylightPresets} from './daylightPresets.js';

// Preserve the same geometry, texture inputs and actual cast-shadow map in
// both treatments. Painted shading uses three colour families, independent
// of exposure and physical specular response.
export function createPainterlyStyle(renderer,lighting,grain) {
 const materials=new Set(),paperAmount={value:.28};let painted=true;
 const uniforms={};
 const parameters={Sun:['sun',3],Water:['water',3],Fill:['fill',3],FillLift:['fillLift',3],
  Shadow:['shadow',3],ShadowLift:['shadowLift',3],Desaturate:['desaturate',3],GreenShadow:['greenShadow',2],
  Middle:['middle',2],Faces:['faces',2],Ground:['ground',2],CastFill:['castFill',0],Shoulder:['shoulder',0]};
 for(const [name,[key,size]]of Object.entries(parameters)){
  const value=daylightPresets.original.paint[key];
  uniforms['paint'+name]={value:size===3?new T.Vector3(...value):size===2?new T.Vector2(...value):value};
 }
 const declarations=Object.entries(parameters).map(([name,[,size]])=>`uniform ${size?'vec'+size:'float'} paint${name};`).join('\n');
 function setDaylight(preset){
  for(const [name,[key,size]]of Object.entries(parameters)){
   const uniform=uniforms['paint'+name],value=preset.paint[key];
   if(size)uniform.value.fromArray(value);else uniform.value=value;
  }
 }
 function register(material,{water=false,terrain=false}={}){
  if(materials.has(material))return material;
  materials.add(material);
  const original=material.onBeforeCompile,cacheKey=material.customProgramCacheKey.bind(material);
  const baseKey=cacheKey();
  material.onBeforeCompile=shader=>{
   original.call(material,shader,renderer);
   if(!painted)return;
   shader.uniforms.paintGrain={value:grain};
   shader.uniforms.paintPaperAmount=paperAmount;
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec3 paintPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec4 paintWorld=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
     paintWorld=instanceMatrix*paintWorld;
    #endif
    paintPosition=(modelMatrix*paintWorld).xyz;
   `);
   shader.fragmentShader=declarations+'\nvarying vec3 paintPosition; uniform sampler2D paintGrain; uniform float paintPaperAmount;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>','#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>');
   // MeshStandardMaterial has no transmission/clearcoat in this study.
   // Remove physical light evaluation in this variant, not merely its output.
   for(const chunk of ['lights_physical_fragment','lights_fragment_begin','lights_fragment_maps','lights_fragment_end','aomap_fragment'])
    shader.fragmentShader=shader.fragmentShader.replace(`#include <${chunk}>`,'');
   shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
     float facing=dot(nonPerturbedNormal,directionalLights[0].direction);
     // Broad sky fill lets away-facing rock planes retain their shape.
     float middle=smoothstep(paintMiddle.x,paintMiddle.y,facing);
     // Broad transitions on shallow landforms reveal each sloping facet;
     // the narrower prop bands would reduce an entire hill to a dark patch.
     float light=${terrain?'smoothstep(paintGround.x,paintGround.y,facing)':'smoothstep(paintFaces.x,paintFaces.y,facing)'};
     // Cast shadows belong to the cool pigment family, even on upward
     // faces. Do not leak the yellow sunlight back into the shadow fill.
     float visible=smoothstep(.10,.95,getShadowMask());
     vec3 pigment=diffuseColor.rgb;
     float value=dot(pigment,vec3(.2126,.7152,.0722));
     float greenPigment=smoothstep(.0,.06,pigment.g-max(pigment.r,pigment.b));
     vec3 shadePigment=mix(pigment,vec3(value),paintDesaturate.z*${water?'.2':'1.0'});
     vec3 shadowPaint=shadePigment*(paintShadow-vec3(0,0,greenPigment*paintGreenShadow.x))
       +paintShadowLift-vec3(0,0,greenPigment*paintGreenShadow.y);
     vec3 middlePaint=mix(pigment,vec3(value),paintDesaturate.y)*paintFill+paintFillLift;
     vec3 castPaint=mix(shadowPaint,middlePaint,paintCastFill);
     vec3 sunPaint=mix(pigment,vec3(value),paintDesaturate.x)*${water?'paintWater':'paintSun'};
     vec3 facePaint=mix(shadowPaint,middlePaint,middle);
     facePaint=mix(facePaint,sunPaint,light);
     // Project onto the dominant surface plane, in world units. Grain is
     // attached to the land/props and naturally filters away as we zoom out.
     vec3 paintNormal=abs(cross(dFdx(paintPosition),dFdy(paintPosition)));
     vec2 paperUv=paintNormal.y>=max(paintNormal.x,paintNormal.z)?paintPosition.xz:
       (paintNormal.x>paintNormal.z?paintPosition.zy:paintPosition.xy);
     paperUv*=.85;
     float paper=texture2D(paintGrain,paperUv).r;
     float adjacent=texture2D(paintGrain,paperUv+vec2(.0012,.0007)).r;
     float tooth=clamp((paper-adjacent)*3.8+(paper-.5)*.24,-.18,.18);
     vec3 outgoingLight=mix(castPaint,facePaint,visible)*(1.0+tooth*paintPaperAmount*${water?'.35':'1.0'});
     // A gentle highlight shoulder preserves amber hues on pale sand/stone
     // instead of clipping the red channel into a flat yellow patch.
     if(paintShoulder>0.0){
      float peak=max(outgoingLight.r,max(outgoingLight.g,outgoingLight.b));
      if(peak>paintShoulder){float excess=peak-paintShoulder,room=1.0-paintShoulder;
       outgoingLight*=(paintShoulder+room*excess/(room+excess))/peak;}
     }
   `);
  };
  material.customProgramCacheKey=()=>`${baseKey}:painted-v7:${water}:${terrain}:${painted}`;
  return material;
 }
 function setPainted(value){
  painted=value;renderer.toneMapping=painted?T.NoToneMapping:T.ACESFilmicToneMapping;
  lighting.setPainted(painted);for(const m of materials)m.needsUpdate=true;
 }
 setPainted(true);
 return {register,setPainted,setDaylight,setPaper(value){paperAmount.value=value}};
}
