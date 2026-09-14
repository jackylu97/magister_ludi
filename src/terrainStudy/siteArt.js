import * as T from 'three';
import {centre,onTileTop,surfaceHeight,WATER_LEVEL} from './surface.js';
import {surfacePatch} from './surfacePatch.js';
import {createSiteLayout,siteReserved} from './siteLayout.js';

function coloredBox(w,h,d,color){
 const g=new T.BoxGeometry(w,h,d);g.translate(0,h/2,0);
 const c=new T.Color(color),n=g.attributes.position.count,a=new Float32Array(n*3);
 for(let i=0;i<n;i++)a.set([c.r,c.g,c.b],i*3);
 g.setAttribute('color',new T.BufferAttribute(a,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(n*2),2));return g;
}
export function createSiteArt(assets,fields){
 const material=assets.material,cache=new WeakMap();
 const foundation=coloredBox(1,1,1,'#b2a589'),timber=coloredBox(1,1,1,'#8d7557');
 const stake=coloredBox(.040,.17,.038,'#897255');
 function layout(tile,entry){
  if(!entry?.site)return;
  const cached=cache.get(tile);if(cached?.kind===entry.site)return cached;
  const result=createSiteLayout(tile,entry.site);cache.set(tile,result);return result;
 }
 function reserved(tile,entry,x,z){return siteReserved(layout(tile,entry),x,z)}
 function tile(tile,entry,top,{prop,push,sampleSurface}){
  const height=sampleSurface??((x,z)=>surfaceHeight(tile,x,z));
  const site=sampleSurface?createSiteLayout(tile,entry.site,height):layout(tile,entry);if(!site)return;
  const c=centre(tile),seed=tile.col*43+tile.row*71,rand=n=>{const a=Math.sin(seed+n*127.1)*43758.5453;return a-Math.floor(a)};
  function stretch(g,x,y,z,sx,sy,sz,a=0){prop(g,material,c.x+x,y,c.z+z,sx,sy,sz,a)}
  function patch(x,z,rx,rz,color,phase=0){
   const points=Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4+phase,r=.88+rand(i+5)*.12;return [c.x+x+Math.cos(a)*rx*r,c.z+z+Math.sin(a)*rz*r];
   });
   const g=surfacePatch(top,points,new T.Color(color),.006);
   if(g.attributes.position.count)push(fields,g);else g.dispose();
  }
  if(tile.feature==='oasis'){
   // Keep the pool open. Tiny yards live only beneath the bank-side pieces.
   for(const p of site.pieces)patch(p.x,p.z,.13,.11,'#b6a474');
  }else if(site.kind==='ruins'){
   patch(0,.07,.53,.49,'#b0ae83',.12);
   patch(-.08,.14,.24,.20,'#c1b791',.31);
  }else if(site.kind==='village')patch(0,.06,.57,.53,'#b6a474',.06);
  else if(site.kind==='antiquity'){
   patch(-.03,.03,.43,.37,'#a59168',.05);
   patch(.03,.02,.29,.26,'#bdab7e',.22);
  }else if(site.kind==='barbarianCamp')patch(0,0,.60,.57,'#a49770',.12);
  for(const piece of site.pieces){
   const {name,x,y,z,scale,angle,bottom}=piece,g=assets[name];
   if(site.kind!=='wreck'){
    // Fitted, low masonry/earth skirts under each rigid piece. The search in
    // siteLayout avoids large plinths; fragments seat directly into the soil.
    if(!name.endsWith('fragment')){
     g.computeBoundingBox();const bb=g.boundingBox,w=(bb.max.x-bb.min.x)*scale,d=(bb.max.z-bb.min.z)*scale;
     const localX=(bb.min.x+bb.max.x)*scale*.5,localZ=(bb.min.z+bb.max.z)*scale*.5;
     const xx=x+localX*Math.cos(angle)+localZ*Math.sin(angle),zz=z+localZ*Math.cos(angle)-localX*Math.sin(angle);
     stretch(foundation,xx,bottom,zz,w*.86,y-bottom,d*.86,angle);
    }
   }
   stretch(g,x,y,z,scale,scale,scale,angle);
  }
  if(site.kind==='wreck'){
   // Flotsam stays flat at the common water datum, never as a hovering marker.
   for(const [x,z,a]of [[-.49,.24,.32],[.36,.38,-.4]])stretch(timber,x,WATER_LEVEL+.003,z,.17,.012,.028,a);
  }
  if(site.kind==='barbarianCamp'){
   for(let i=0;i<82;i++){
    const a=i*Math.PI*2/82;if(a>1.10&&a<1.89)continue;
    const r=.64+Math.sin(a*5)*.023,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(onTileTop(tile,x,z,.04))stretch(stake,x,height(x,z)-.006,z,1,.8+rand(i+20)*.5,1,a);
   }
   // Quiet central hearth; no point lights, particles or per-frame updates.
   patch(.05,.25,.085,.07,'#675e50');
   stretch(timber,.035,height(.035,.25)+.007,.25,.105,.017,.023,.55);
   stretch(timber,.055,height(.055,.25)+.017,.25,.105,.017,.023,-.55);
  }
 }
 return {tile,reserved,layout,dispose(){foundation.dispose();timber.dispose();stake.dispose()}};
}
