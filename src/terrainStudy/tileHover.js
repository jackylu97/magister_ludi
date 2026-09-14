import {BufferGeometry,Float32BufferAttribute,LineLoop,LineBasicMaterial} from 'three';
import {centre,tileShape,surfaceHeight,isWater} from './surface.js';

// A single depth-tested line reveals the logical tile only on interaction.
export function createTileHover(scene){
 const line=new LineLoop(new BufferGeometry(),new LineBasicMaterial({color:'#f5e4b1',transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));
 line.visible=false;line.renderOrder=2;scene.add(line);
 let current;
 function show(tile){
  if(tile===current)return;
  current=tile;line.visible=!!tile;if(!tile)return;
  const c=centre(tile),outline=isWater(tile)?Array.from({length:6},(_,i)=>[Math.cos(Math.PI/6+i*Math.PI/3),Math.sin(Math.PI/6+i*Math.PI/3)]):tileShape(tile).top;
  const positions=[];
  for(let i=0;i<outline.length;i++){
   const a=outline[i],b=outline[(i+1)%outline.length];
   const steps=tile.sharedHillEdges?Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.045)):1;
   for(let j=0;j<steps;j++){
    const t=j/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
    positions.push(c.x+x,surfaceHeight(tile,x,z)+.012,c.z+z);
   }
  }
  line.geometry.dispose();line.geometry=new BufferGeometry();
  line.geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 }
 return {show};
}
