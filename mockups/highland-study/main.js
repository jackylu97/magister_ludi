import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.setClearColor('#d7cebc');document.querySelector('#stage').append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,innerWidth/innerHeight,.1,120);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=30;controls.maxPolarAngle=1.42;
function reset(){camera.position.set(14,14,19);controls.target.set(0,.6,0)}reset();document.querySelector('#reset').onclick=reset;
scene.add(new T.HemisphereLight('#d4dff5','#242c52',1.5));const sun=new T.DirectionalLight('#ffe2b3',3.2);sun.position.set(-7,12,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:35});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;scene.add(sun);
const ramp=new T.DataTexture(new Uint8Array([50,130,210,255]),4,1,T.RedFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
function material(color){return new T.MeshToonMaterial({color,gradientMap:ramp})}
const ground=material('#99ab65'),hill=material('#8f9a61'),stone=material('#969bb0'),stoneLight=material('#b5b8bf'),stoneDark=material('#717e94'),earth=material('#777d62'),path=material('#c5b381'),wall=material('#c6c3b5'),roof=material('#b75e42'),door=material('#374751'),foliage=material('#597e53'),foliageLight=material('#82944b'),pine=material('#345b4b'),bark=material('#716145'),grassMat=material('#7f9251'),flower=material('#d5ba68'),water=material('#637fa4');
const base=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#d7cebc',roughness:1}));base.rotation.x=-Math.PI/2;base.position.y=-.55;base.receiveShadow=true;scene.add(base);
let seed=318;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}const batches=new Map();
function add(g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0){const mat=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),ry),new T.Vector3(sx,sy,sz));const geom=g.index?g.toNonIndexed():g.clone();geom.applyMatrix4(mat);geom.deleteAttribute('uv');const list=batches.get(m)||[];list.push(geom);batches.set(m,list)}
function height(x,z){return .18+.65*Math.exp(-((x+3.4)**2/3+(z-2.2)**2/4))+.10*Math.sin(x*.8)*Math.cos(z*.7)+1.1*Math.exp(-((x+2.8)**2/7+(z+2.3)**2/6))+.55*Math.exp(-((x-3.4)**2/4+(z+.3)**2/6))}
// A compact axial hex world cut. Shared height sampling joins the landforms;
// narrow seams and exposed sides keep the physical hex construction legible.
const hexes=[],R=1.12;
for(let q=-3;q<=3;q++)for(let r=-3;r<=3;r++){if(Math.abs(q+r)>3)continue;hexes.push({x:Math.sqrt(3)*R*(q+r/2),z:1.5*R*r,q,r})}
function insideWorld(x,z,margin=.06){return hexes.some(h=>{const dx=Math.abs(x-h.x),dz=Math.abs(z-h.z);return dx<Math.sqrt(3)*R/2-margin&&dz<R-margin&&Math.sqrt(3)*dz+dx<Math.sqrt(3)*R-margin})}
for(const cell of hexes){
 const vertices=[cell.x,height(cell.x,cell.z),cell.z],colors=[],indices=[],rings=7,segments=36;
 for(let j=1;j<=rings;j++)for(let i=0;i<segments;i++){const u=i/6,k=Math.floor(u),f=u-k,a=k*Math.PI/3+Math.PI/6,b=a+Math.PI/3;const dx=((1-f)*Math.cos(a)+f*Math.cos(b))*R*.985*j/rings,dz=((1-f)*Math.sin(a)+f*Math.sin(b))*R*.985*j/rings;vertices.push(cell.x+dx,height(cell.x+dx,cell.z+dz),cell.z+dz)}
 for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i);
 for(let j=1;j<rings;j++)for(let i=0;i<segments;i++){const a=1+(j-1)*segments+i,b=1+(j-1)*segments+(i+1)%segments;indices.push(a,b,a+segments,b,b+segments,a+segments)}
 for(let i=0;i<vertices.length;i+=3){const x=vertices[i],z=vertices[i+2],v=.88+.075*Math.sin(x*1.2+Math.cos(z*1.8))+.025*Math.cos(z*4);colors.push(v,Math.min(1,v+.015),v*.96)}
 const top=new T.BufferGeometry();top.setAttribute('position',new T.Float32BufferAttribute(vertices,3));top.setAttribute('color',new T.Float32BufferAttribute(colors,3));top.setIndex(indices);top.computeVertexNormals();ground.vertexColors=true;add(top,ground);
 const sides=[];const start=1+(rings-1)*segments;for(let i=0;i<segments;i++){const a=(start+i)*3,b=(start+(i+1)%segments)*3;const p=vertices.slice(a,a+3),q=vertices.slice(b,b+3);sides.push(...p,...q,p[0],-.45,p[2],...q,q[0],-.45,q[2],p[0],-.45,p[2])}const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(sides,3));skirt.computeVertexNormals();add(skirt,earth);
}
// Custom asymmetric rock hulls: staggered rings define shoulders, ledges and broken tops.
function crag(variant){const pts=[],idx=[],n=7,rings=5;for(let j=0;j<rings;j++){const y=[0,.13,.48,.77,1][j],r=[.7,1,.94,.82,.48][j];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const jitter=.84+.22*Math.sin(i*4.7+variant*2+j*.8);pts.push(Math.cos(a)*r*jitter+.19*y*Math.sin(variant),y+(j>0?.045*Math.sin(i*3+variant):0),Math.sin(a)*r*jitter+.14*y)}}for(let j=0;j<rings-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;idx.push(a,a+n,b,b,a+n,b+n)}for(let i=1;i<n-1;i++)idx.push(28,28+i+1,28+i);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setIndex(idx);const flat=g.toNonIndexed();flat.computeVertexNormals();return flat}
const rocks=Array.from({length:6},(_,i)=>crag(i));
function rock(x,z,r,h,variant=0){add(rocks[variant%6],[stone,stoneLight,stoneDark][variant%3],x,height(x,z)-.035,z,r,h*.8,r*.95,variant*.8)}
// Composed mountain chain: dominant slabs, supporting shoulders, then scree.
for(const [x,z,r,h,v]of [[-3.8,-2.8,1.1,3.7,1],[-2.4,-3.1,.85,4.5,3],[-1.5,-2.7,.9,2.5,0],[-4.6,-1.7,.8,2,4],[-2.9,-1.6,.9,2.1,2],[3.9,-2.6,1.05,3.1,1],[3.8,-3.1,.75,3.8,4],[3,-3.2,.9,2.1,0],[4.4,-1.4,.72,1.8,2]])rock(x,z,r,h,v);
for(let i=0;i<140;i++){const x=(rand()-.5)*11,z=-3.4+rand()*3.4;const near=Math.min(Math.hypot(x+3,z+2.5),Math.hypot(x-4,z+2.7));if(near<2.5&&insideWorld(x,z,.35)){const r=.12+rand()*.35;rock(x,z,r,r*(1+rand()*1.9),i)}}
// A winding path follows the rolling terrain.
function strip(points,width,mat){const v=[];for(let i=0;i<points.length-1;i++){const [x,z]=points[i],[xx,zz]=points[i+1];if(!insideWorld(x,z,.2)||!insideWorld(xx,zz,.2))continue;const dx=xx-x,dz=zz-z,len=Math.hypot(dx,dz),nx=-dz/len*width,nz=dx/len*width;const p=[[x+nx,z+nz],[xx+nx,zz+nz],[x-nx,z-nz],[xx-nx,zz-nz]];const a=p.map(([x,z])=>[x,height(x,z)+.018,z]);v.push(...a[0],...a[1],...a[2],...a[1],...a[3],...a[2])}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();add(g,mat)}
const route=[];for(let i=0;i<80;i++){const z=5.4-i*.12;route.push([Math.sin(z*.7)*1.1+.5,z])}strip(route,.18,path);
// Shaped houses: chamfered footprints, roof prisms and inset dark doorways.
function block(w,h,d,bevel=.07){const shape=new T.Shape(),b=Math.min(bevel,w/4,d/4);shape.moveTo(-w/2+b,-d/2);for(const [x,y]of [[w/2-b,-d/2],[w/2,-d/2+b],[w/2,d/2-b],[w/2-b,d/2],[-w/2+b,d/2],[-w/2,d/2-b],[-w/2,-d/2+b]])shape.lineTo(x,y);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelThickness:b*.35,bevelSize:b*.35,bevelSegments:1,steps:1});g.rotateX(-Math.PI/2);return g}
function house(x,z,s=1){const y=height(x,z);add(block(.48,.38,.42),wall,x,y,z,s,s,s);const verts=[-.3,0,-.26,.3,0,-.26,0,.28,-.26,-.3,0,.26,.3,0,.26,0,.28,.26],indices=[0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1];const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();add(g,roof,x,y+.4*s,z,s,s,s);add(block(.1,.2,.025,.02),door,x+.07*s,y,z+.222*s,s,s,s);add(block(.06,.09,.018,.01),door,x-.13*s,y+.23*s,z+.223*s,s,s,s)}
for(const [x,z,s]of [[1.9,2.2,1],[2.5,2.6,.8],[1.75,3,.7],[-1.8,.2,.9]])house(x,z,s);
const towerX=-1.6,towerZ=-.8,ty=height(towerX,towerZ);add(block(.65,.22,.65),wall,towerX,ty,towerZ);add(block(.43,1.45,.46),wall,towerX,ty+.18,towerZ);add(block(.56,.13,.56),stoneLight,towerX,ty+1.48,towerZ);add(new T.ConeGeometry(.42,.48,4),roof,towerX,ty+1.84,towerZ,1,1,1,Math.PI/4);add(block(.14,.32,.03,.025),door,towerX,ty+.2,towerZ+.242);for(let i=0;i<3;i++)add(block(.07,.16,.025,.01),door,towerX,ty+.65+i*.26,towerZ+.24);
// A small courtly sanctuary: stairs, substantial cornices, fluted columns,
// and an actual arch opening. It remains a landscape landmark, not a city screen.
const templeX=-2.9,templeZ=1.4,templeY=height(templeX,templeZ);
for(let i=0;i<5;i++)add(block(1.12-i*.07,.065,.13),wall,templeX,templeY+i*.064,templeZ+.72-i*.12);
add(block(1.15,.18,.82),wall,templeX,templeY+.24,templeZ);
for(const dx of [-.46,-.19,.19,.46]){
 add(new T.CylinderGeometry(.075,.09,.72,12),wall,templeX+dx,templeY+.75,templeZ+.25);
 for(let k=0;k<8;k++){const a=k*Math.PI/4;add(new T.CylinderGeometry(.01,.01,.64,4),stoneLight,templeX+dx+Math.sin(a)*.075,templeY+.75,templeZ+.25+Math.cos(a)*.075)}
 add(block(.19,.08,.19),wall,templeX+dx,templeY+1.08,templeZ+.25);
 add(block(.18,.065,.18),stoneLight,templeX+dx,templeY+.39,templeZ+.25);
}
add(block(1.24,.13,.9),wall,templeX,templeY+1.15,templeZ);
const pediment=new T.Shape();pediment.moveTo(-.63,0);pediment.lineTo(.63,0);pediment.lineTo(0,.32);pediment.closePath();add(new T.ExtrudeGeometry(pediment,{depth:.14,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1}),roof,templeX,templeY+1.3,templeZ+.35);
// Curved back-wall opening, assembled as masonry voussoirs around empty space.
for(let i=0;i<11;i++){const a=i*Math.PI/10;const archStone=block(.17,.19,.16,.02);archStone.rotateZ(a-Math.PI/2);add(archStone,wall,templeX+Math.cos(a)*.36,templeY+.88+Math.sin(a)*.36,templeZ-.22)}
for(const dx of [-.36,.36])add(block(.18,.48,.18),wall,templeX+dx,templeY+.41,templeZ-.22);
// Broken column fragments nearby echo the landmark at a smaller scale.
for(let i=0;i<3;i++){const x=templeX+.86+i*.15,z=templeZ-.1+i*.21;add(new T.CylinderGeometry(.075,.08,.13+i*.04,9),stoneLight,x,height(x,z)+.08,z)}
// Vegetation uses reusable sculpted crowns and tapering bent cypresses.
const crowns=Array.from({length:4},(_,k)=>{const g=new T.IcosahedronGeometry(1,1);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.15*Math.sin(x*5+y*3+k)*Math.cos(z*4);p.setXYZ(i,x*f,y*f,z*f)}g.computeVertexNormals();return g});
const trunkGeo=new T.CylinderGeometry(.018,.035,.3,5);
const objects=[];function tree(x,z,s,type){const y=height(x,z);objects.push({g:trunkGeo,m:bark,x,y:y+.15*s,z,sx:s,sy:s,sz:s});if(type){objects.push({g:rocks[type%6],m:pine,x,y:y+.03,z,sx:.14*s,sy:.8*s,sz:.15*s})}else{for(let j=0;j<3;j++)objects.push({g:crowns[j],m:j%2?foliage:foliageLight,x:x+Math.sin(j*3)*.13*s,y:y+(.4+j*.05)*s,z:z+Math.cos(j*3)*.1*s,sx:.23*s,sy:.24*s,sz:.22*s})}}
for(let i=0;i<260;i++){const x=(rand()-.5)*11.5,z=(rand()-.5)*9.8;const pathX=Math.sin(z*.7)*1.1+.5;if(!insideWorld(x,z,.2)||Math.abs(x-pathX)<.45||Math.hypot(x-2.1,z-2.6)<1||Math.hypot(x-templeX,z-templeZ)<1||z<-2)continue;if(Math.sin(x*1.5+z)*Math.cos(z*1.2)>.1)tree(x,z,.45+rand()*.65,i%3)}
// Grass grows in patches; keep the open paths and building footprints clear.
const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.014,0,0,.014,0,0,.007,.09,0,0,0,-.012,0,0,.012,-.007,.07,.003],3));blade.computeVertexNormals();
for(let i=0;i<10000;i++){const x=(rand()-.5)*12.7,z=(rand()-.5)*10.7;if(!insideWorld(x,z,.08)||Math.abs(x-(Math.sin(z*.7)*1.1+.5))<.3||Math.hypot(x-2.1,z-2.6)<.85||Math.hypot(x-templeX,z-templeZ)<.9||Math.sin(x*2+Math.sin(z))*Math.cos(z*1.4)<.1)continue;objects.push({g:blade,m:i%9?grassMat:flower,x,y:height(x,z)+.015,z,sx:1,sy:.5+rand(),sz:1})}
// Static terrain batches and instanced foliage; no per-frame surface rebuilding.
for(const [m,list]of batches){const mesh=new T.Mesh(mergeGeometries(list),m);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);list.forEach(g=>g.dispose())}
const grouped=new Map();for(const o of objects){const key=o.g.uuid+o.m.uuid;const group=grouped.get(key)||[];group.push(o);grouped.set(key,group)}const dummy=new T.Object3D();for(const group of grouped.values()){const inst=new T.InstancedMesh(group[0].g,group[0].m,group.length);group.forEach((o,i)=>{dummy.position.set(o.x,o.y,o.z);dummy.scale.set(o.sx,o.sy,o.sz);dummy.rotation.y=i*2.4;dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)});inst.castShadow=group[0].g!==blade;inst.receiveShadow=true;scene.add(inst)}
const palettes={meadow:['#99ab65','#597e53','#82944b','#345b4b','#7f9251','#c5b381'],ochre:['#cba565','#b85835','#db783f','#3d5a4d','#8a8651','#dfb778']};document.querySelector('#palette').onchange=e=>{[ground,foliage,foliageLight,pine,grassMat,path].forEach((m,i)=>m.color.set(palettes[e.target.value][i]));};
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});let last=0;renderer.setAnimationLoop(t=>{controls.update();renderer.render(scene,camera);if(t-last>1000){document.querySelector('#stats').textContent=`${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k triangles`;last=t}});
