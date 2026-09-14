import {Matrix4,ShaderMaterial,NoBlending} from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

// Reconstruct the contact pass's normal buffer from the depth already drawn
// with scene colour. Choose the nearer continuous depth slope at silhouettes,
// matching GTAO's depth-normal reconstruction without doing it per AO sample.
export function createDepthNormals(){
 const material=new ShaderMaterial({
  uniforms:{depthMap:{value:null},inverseProjection:{value:new Matrix4()}},
  vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
  fragmentShader:`
   precision highp float;
   uniform sampler2D depthMap;
   uniform mat4 inverseProjection;
   varying vec2 vUv;
   float depthAt(ivec2 p){return texelFetch(depthMap,clamp(p,ivec2(0),textureSize(depthMap,0)-1),0).r;}
   vec3 viewAt(vec2 uv,float depth){vec4 p=inverseProjection*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);return p.xyz/p.w;}
   void main(){
    vec2 size=vec2(textureSize(depthMap,0));ivec2 p=ivec2(vUv*size);
    float c=depthAt(p);if(c>=1.0){gl_FragColor=vec4(.5,.5,1.0,1.0);return;}
    float l=depthAt(p-ivec2(1,0)),r=depthAt(p+ivec2(1,0));
    float b=depthAt(p-ivec2(0,1)),t=depthAt(p+ivec2(0,1));
    float ll=depthAt(p-ivec2(2,0)),rr=depthAt(p+ivec2(2,0));
    float bb=depthAt(p-ivec2(0,2)),tt=depthAt(p+ivec2(0,2));
    vec3 center=viewAt(vUv,c);
    vec3 dx=abs(2.0*l-ll-c)<abs(2.0*r-rr-c)?center-viewAt(vUv-vec2(1.0/size.x,0),l):viewAt(vUv+vec2(1.0/size.x,0),r)-center;
    vec3 dy=abs(2.0*b-bb-c)<abs(2.0*t-tt-c)?center-viewAt(vUv-vec2(0,1.0/size.y),b):viewAt(vUv+vec2(0,1.0/size.y),t)-center;
    gl_FragColor=vec4(normalize(cross(dx,dy))*.5+.5,1.0);
   }`,depthTest:false,depthWrite:false,blending:NoBlending,
 });
 const quad=new FullScreenQuad(material);
 return {
  render(renderer,target,depth,camera){material.uniforms.depthMap.value=depth;material.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);renderer.setRenderTarget(target);quad.render(renderer);},
  dispose(){quad.dispose();material.dispose();},
 };
}
