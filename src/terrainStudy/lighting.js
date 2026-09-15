import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Color, DataTexture, DepthTexture, UnsignedIntType, UnsignedInt248Type, DepthStencilFormat, RGBAFormat, FloatType, EquirectangularReflectionMapping, PMREMGenerator } from 'three';
import {createDepthNormals} from './depthNormals.js';
import {VIEW3D} from '../render3d/lookData';

function daylightEnvironment(renderer, scene) {
  // A broad sky and a muted earth hemisphere provide indirect illumination
  // to physical materials. This is lighting only, never a visible backdrop.
  const width=64,height=32,data=new Float32Array(width*height*4);
  const zenith=new Color('#bbd4ee'),horizon=new Color('#e4e7dc'),earth=new Color('#8b9879');
  for(let y=0;y<height;y++){
    const elevation=Math.cos((y+.5)/height*Math.PI);
    const color=elevation>=0?horizon.clone().lerp(zenith,Math.sqrt(elevation)):
      horizon.clone().lerp(earth,Math.sqrt(-elevation));
    color.multiplyScalar(elevation>=0?1:.55);
    for(let x=0;x<width;x++)data.set([color.r,color.g,color.b,1],(y*width+x)*4);
  }
  const texture=new DataTexture(data,width,height,RGBAFormat,FloatType);
  texture.mapping=EquirectangularReflectionMapping;texture.needsUpdate=true;
  const pmrem=new PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(texture);
  scene.environment=environment.texture;scene.environmentIntensity=.8;
  texture.dispose();pmrem.dispose();
  return environment;
}

export function createLighting(renderer, scene, camera, {unitStencil = false} = {}) {
  const reference=new URLSearchParams(location.search).has('reference');
  const fused=!reference&&!new URLSearchParams(location.search).has('nofuse');
  const environment=daylightEnvironment(renderer,scene);
  const composer = new EffectComposer(renderer);
  // Production unit ghosts need the visible-body stencil in the scene target,
  // including when AO is off. The standalone terrain study has no such pass.
  if(unitStencil)for(const target of [composer.renderTarget1,composer.renderTarget2])target.stencilBuffer=true;
  composer.addPass(new RenderPass(scene, camera));
  // Every figure of the contact pass is a row of `data/view3d.json`'s `painted`
  // block: this is the pass a weak device turns down, and a device profile is
  // an edit to the sheet rather than to this file.
  const knobs=VIEW3D.painted.contact;
  const contact = new GTAOPass(scene, camera, knobs.resolution, knobs.resolution, undefined,
    { radius: knobs.radius, thickness: knobs.thickness, distanceExponent: knobs.distanceExponent, samples: knobs.samples },
    { radius: knobs.denoiseRadius, depthPhi: knobs.denoiseDepthPhi, normalPhi: knobs.denoiseNormalPhi });
  contact.blendIntensity = knobs.blendIntensity;
  let contactRequested=true,contactScale=1;
  const fullContact=reference||new URLSearchParams(location.search).has('fullAO');
  let depthNormals;
  if(!reference){
    for(const target of [composer.renderTarget1,composer.renderTarget2]){
      target.depthTexture=new DepthTexture(target.width,target.height,unitStencil?UnsignedInt248Type:UnsignedIntType);
      if(unitStencil)target.depthTexture.format=DepthStencilFormat;
    }
    depthNormals=createDepthNormals();
    const nativeSize=contact.setSize.bind(contact);
    contact.setSize=(width,height)=>nativeSize(Math.ceil(width*knobs.renderScale),Math.ceil(height*knobs.renderScale));
    contact.updatePdMaterial({radius:knobs.scaledDenoiseRadius});
    const nativeRender=contact.render.bind(contact);
    contact.render=(renderer,writeBuffer,readBuffer,...args)=>{
      contact.setGBuffer(readBuffer.depthTexture,contact.normalRenderTarget.texture);
      depthNormals.render(renderer,contact.normalRenderTarget,readBuffer.depthTexture,camera);
      nativeRender(renderer,writeBuffer,readBuffer,...args);
    };
  }
  composer.addPass(contact);
  const output=new OutputPass();
  if(fused){
    // GTAO still computes and denoises contact shade, but the output pass
    // applies it before tone mapping. Avoid a full-resolution copy + blend.
    contact.output=GTAOPass.OUTPUT.Off;
    contact.needsSwap=false;
    output.uniforms.studyAO={value:contact.pdRenderTarget.texture};
    output.uniforms.studyAOIntensity={value:contact.blendIntensity};
    output.material.fragmentShader=output.material.fragmentShader.replace('uniform sampler2D tDiffuse;',
      'uniform sampler2D tDiffuse;\nuniform sampler2D studyAO;\nuniform float studyAOIntensity;');
    output.material.fragmentShader=output.material.fragmentShader.replace(
      'gl_FragColor = texture2D( tDiffuse, vUv );',
      `gl_FragColor = texture2D( tDiffuse, vUv );
       if(studyAOIntensity>0.0)gl_FragColor.rgb*=mix(vec3(1.0),texture2D(studyAO,vUv).rgb,studyAOIntensity);`
    );
  }
  composer.addPass(output);
  return {
    render() {
      contact.enabled=contactRequested&&contactScale>0;
      if(fused)output.uniforms.studyAOIntensity.value=contact.enabled?contact.blendIntensity*contactScale:0;
      composer.render();
    },
    resize(width, height) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    setContact(enabled) { contactRequested = enabled; },
    getContact() { return contactRequested; },
    getEffectiveContact() { return contactRequested?contactScale:0; },
    setContactDetail(pixelsPerTile) {
      // At map scale the contact radius is subpixel. Fade smoothly before
      // skipping those passes; retain full shade at play zoom.
      const radiusPixels=knobs.radius*pixelsPerTile/Math.sqrt(3);
      const t=Math.max(0,Math.min(1,(radiusPixels-knobs.fadeStartPixels)/knobs.fadeRangePixels));
      contactScale=fullContact||!fused?1:t*t*(3-2*t);
    },
    setPainted(enabled) {
      contact.blendIntensity = enabled ? knobs.paintedBlendIntensity : knobs.blendIntensity;
    },
    dispose() { depthNormals?.dispose();composer.dispose(); output.dispose(); contact.dispose(); environment.dispose(); },
  };
}
