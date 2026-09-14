import * as T from 'three';
import {crag} from './shapes.js';
import {centre,surfaceHeight,onTileTop} from './surface.js';
// Low polygon patches share the existing detail batch; no extra texture or animation.
function patch(x,z,rx,rz,y,phase){const positions=[x,y,z],indices=[],n=20;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=1+.1*Math.sin(a*3+phase)+.05*Math.cos(a*5);positions.push(x+Math.cos(a)*rx*r,y,z+Math.sin(a)*rz*r)}for(let i=0;i<n;i++)indices.push(0,1+(i+1)%n,1+i);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g.toNonIndexed()}
export function featureDetails(tile,push,materials,hash,reserved=()=>false){
 const {x,z}=centre(tile),phase=hash(tile.col,tile.row,230)*6.28;
 if(tile.feature==='oasis'){
 // Pool sits below the tile surface in the sculpted terrain basin.
 const n=28,v=[x-.03,.065,z],colors=[1,1,1],idx=[];
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=1+.055*Math.sin(a*3+phase);const dz=Math.sin(a)*.33*r;v.push(x+Math.cos(a)*.43*r-.1*Math.sin(dz*6),.065,z+dz);colors.push(1,1,1)}
 for(let i=0;i<n;i++)idx.push(0,1+(i+1)%n,1+i);
 const pool=new T.BufferGeometry();pool.setAttribute('position',new T.Float32BufferAttribute(v,3));pool.setAttribute('color',new T.Float32BufferAttribute(colors,3));pool.setIndex(idx);pool.computeVertexNormals();push(materials.pool,pool.toNonIndexed());pool.dispose();
 // One substantial weathered shelf and supporting stones, not a bead ring.
 for(const [dx,dz,sx,sy,sz,k]of [[-.42,-.18,.23,.24,.15,2],[-.28,-.30,.18,.15,.12,4],[-.54,-.03,.11,.11,.09,1],[.43,.18,.12,.09,.09,3]]){if(reserved(dx,dz))continue;const g=crag(k);g.scale(sx,sy,sz);g.rotateY(phase+k);g.translate(x+dx,surfaceHeight(tile,dx,dz)-.025,z+dz);push(materials.stone,g)}
 // Low, multi-lobed shrubs frame two banks without reading as forest trees.
 for(const [dx,dz,size]of [[-.55,.28,.13],[-.33,.52,.11],[.42,-.40,.14],[.58,-.13,.10]])for(let j=0;j<3;j++){if(reserved(dx,dz))continue;const g=new T.IcosahedronGeometry(1,1);g.deleteAttribute('uv');const p=g.attributes.position;for(let k=0;k<p.count;k++){const f=1+.12*Math.sin(p.getX(k)*6+p.getY(k)*4+j);p.setXYZ(k,p.getX(k)*f,p.getY(k)*f,p.getZ(k)*f)}g.scale(size*.8,size*.7,size);g.rotateY(phase+j);g.translate(x+dx+Math.sin(j*3)*size*.55,surfaceHeight(tile,dx,dz)+size*.55,z+dz+Math.cos(j*3)*size*.35);g.computeVertexNormals();push(materials.shrub,g)}
 // A few stepping stones leave an open approach to the pool.
 for(let i=0;i<4;i++){const dx=.1+i*.09,dz=.57+i*.055,g=crag(i);if(reserved(dx,dz)){g.dispose();continue}g.scale(.045,.025,.035);g.translate(x+dx,surfaceHeight(tile,dx,dz),z+dz);push(materials.stone,g)}

 }

 if(tile.feature==='floodplain')for(let i=0;i<3;i++){
 const a=hash(tile.col,tile.row,i+241)*6.28,r=.25+hash(tile.col,tile.row,i+250)*.3;
 const dx=Math.cos(a)*r,dz=Math.sin(a)*r;
 if(!onTileTop(tile,dx,dz,.25))continue;
 const g=patch(x+dx,z+dz,.23,.15,0,a),p=g.attributes.position;
 for(let k=0;k<p.count;k++)p.setY(k,surfaceHeight(tile,p.getX(k)-x,p.getZ(k)-z)+.003);
 g.computeVertexNormals();push(materials.fertile,g);
 }
 if(!['oasis','floodplain'].includes(tile.feature))return;
 const v=[];for(let i=0;i<18;i++){const a=tile.feature==='oasis'?(.5+(i%2)*2.8+hash(tile.col,tile.row,i+260)*.6):hash(tile.col,tile.row,i+260)*6.28,r=tile.feature==='oasis'?(.55+hash(tile.col,tile.row,i+280)*.1):.3+hash(tile.col,tile.row,i+280)*.45,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r*.8,h=.045+hash(tile.col,tile.row,i+300)*.065,y=surfaceHeight(tile,px-x,pz-z)+.005;if(reserved(px-x,pz-z))continue;v.push(px-.016,y,pz,px+.016,y,pz,px+.012,y+h,pz)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();push(materials.reeds,g);
}
