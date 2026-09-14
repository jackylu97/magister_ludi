import view from '../../data/view3d.json';
import units from '../../data/units.json';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.setClearColor('#d7cebc');document.querySelector('#stage').append(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-8*innerWidth/innerHeight,8*innerWidth/innerHeight,8,-8,.1,120);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=30;controls.enableRotate=false;controls.mouseButtons.LEFT=T.MOUSE.PAN;controls.minZoom=.65;controls.maxZoom=2.4;
function reset(){const el=view.camera.elevation*Math.PI/180,az=view.camera.azimuth*Math.PI/180;camera.position.set(Math.cos(el)*Math.cos(az)*25,Math.sin(el)*25,Math.cos(el)*Math.sin(az)*25);controls.target.set(0,.3,0);camera.zoom=1;camera.updateProjectionMatrix()}reset();document.querySelector('#reset').onclick=reset;
scene.add(new T.HemisphereLight('#d4dff5','#242c52',1.5));const sun=new T.DirectionalLight('#ffe2b3',3.2);sun.position.set(-7,12,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:35});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;scene.add(sun);
const ramp=new T.DataTexture(new Uint8Array([50,130,210,255]),4,1,T.RedFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
function material(color){return new T.MeshToonMaterial({color,gradientMap:ramp})}
const ground=material('#99ab65'),hill=material('#8f9a61'),stone=material('#969bb0'),stoneLight=material('#b5b8bf'),stoneDark=material('#717e94'),earth=material('#777d62'),path=material('#c5b381'),wall=material('#c6c3b5'),roof=material('#b75e42'),door=material('#374751'),foliage=material('#597e53'),foliageLight=material('#82944b'),pine=material('#345b4b'),bark=material('#716145'),grassMat=material('#7f9251'),flower=material('#d5ba68'),water=material('#637fa4');
const base=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#d7cebc',roughness:1}));base.rotation.x=-Math.PI/2;base.position.y=-.55;base.receiveShadow=true;scene.add(base);
let seed=318;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}const batches=new Map();
function add(g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0){const mat=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),ry),new T.Vector3(sx,sy,sz));const geom=g.index?g.toNonIndexed():g.clone();geom.applyMatrix4(mat);geom.deleteAttribute('uv');const list=batches.get(m)||[];list.push(geom);batches.set(m,list)}
function height(x,z){
 const h=cellAt(x,z);if(!h.hills)return h.elevation;
 const dx=x-h.x,dz=z-h.z;
 // A small height step marks hills even beneath forest. Push the crest
 // toward the light so the visible opposite slope has a broad shaded face.
 const radius=Math.max(Math.abs(dx)/.8660254,(Math.sqrt(3)*Math.abs(dz)+Math.abs(dx))/Math.sqrt(3));
 const crown=Math.pow(Math.max(0,1-radius*radius),1.45);
 const shoulder=.95-.35*dx+.13*dz+.09*Math.sin(dx*3+dz*2+h.q*.8+h.r);
 return h.elevation+.78*crown*shoulder;
}
// A compact axial hex world cut. Shared height sampling joins the landforms;
// narrow seams and exposed sides keep the physical hex construction legible.
const hexes=[],R=1;
for(let q=-3;q<=3;q++)for(let r=-3;r<=3;r++){if(Math.abs(q+r)>3)continue;hexes.push({x:Math.sqrt(3)*R*(q+r/2),z:1.5*R*r,q,r})}
function insideWorld(x,z,margin=.06){return hexes.some(h=>{const dx=Math.abs(x-h.x),dz=Math.abs(z-h.z);return dx<Math.sqrt(3)*R/2-margin&&dz<R-margin&&Math.sqrt(3)*dz+dx<Math.sqrt(3)*R-margin})}
const coastMat=material('#719fa4'),oceanMat=material('#426485'),plainsMat=material('#b4a16a'),desertMat=material('#d8bc86');
function cellAt(x,z){let chosen=hexes[0],distance=Infinity;for(const h of hexes){const d=Math.hypot(x-h.x,z-h.z);if(d<distance){distance=d;chosen=h}}return chosen}
for(const h of hexes){h.terrain=h.r>=2&&h.q>=-1?(h.r===3?'ocean':'coast'):h.q>=2?'desert':h.q<=-2?'plains':'grassland';h.water=h.terrain==='coast'||h.terrain==='ocean'}
// Hills are a discrete gameplay state, not an inference from rolling terrain.
const hillCells=new Set(['-2,1','-2,2','0,-1','1,-1','2,0','0,-2']);
for(const h of hexes){h.hills=!h.water&&hillCells.has(`${h.q},${h.r}`);h.elevation=h.water?.04:h.hills?.40:.22;}
const pickTiles=[];
for(const cell of hexes){
 const vertices=[cell.x,cell.water?.04:height(cell.x,cell.z),cell.z],colors=[],indices=[],rings=10,segments=36;
 for(let j=1;j<=rings;j++)for(let i=0;i<segments;i++){const u=i/6,k=Math.floor(u),f=u-k,a=k*Math.PI/3+Math.PI/6,b=a+Math.PI/3;const dx=((1-f)*Math.cos(a)+f*Math.cos(b))*R*.985*j/rings,dz=((1-f)*Math.sin(a)+f*Math.sin(b))*R*.985*j/rings;vertices.push(cell.x+dx,cell.water?.04:height(cell.x+dx,cell.z+dz),cell.z+dz)}
 for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i);
 for(let j=1;j<rings;j++)for(let i=0;i<segments;i++){const a=1+(j-1)*segments+i,b=1+(j-1)*segments+(i+1)%segments;indices.push(a,b,a+segments,b,b+segments,a+segments)}
 for(let i=0;i<vertices.length;i+=3){const x=vertices[i],z=vertices[i+2],v=.88+.075*Math.sin(x*1.2+Math.cos(z*1.8))+.025*Math.cos(z*4);colors.push(v,Math.min(1,v+.015),v*.96)}
 const top=new T.BufferGeometry();top.setAttribute('position',new T.Float32BufferAttribute(vertices,3));top.setAttribute('color',new T.Float32BufferAttribute(colors,3));top.setIndex(indices);top.computeVertexNormals();ground.vertexColors=true;const surface=cell.water?(cell.terrain==='ocean'?oceanMat:coastMat):cell.terrain==='desert'?desertMat:cell.terrain==='plains'?plainsMat:ground;surface.vertexColors=true;add(top,surface);const pick=new T.Mesh(top,surface);pick.userData.cell=cell;pick.updateMatrixWorld();pickTiles.push(pick);
 const sides=[];const start=1+(rings-1)*segments;for(let i=0;i<segments;i++){const a=(start+i)*3,b=(start+(i+1)%segments)*3;const p=vertices.slice(a,a+3),q=vertices.slice(b,b+3);sides.push(...p,...q,p[0],-.45,p[2],...q,q[0],-.45,q[2],p[0],-.45,p[2])}const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(sides,3));skirt.computeVertexNormals();add(skirt,earth);
}
// Custom asymmetric rock hulls: staggered rings define shoulders, ledges and broken tops.
function crag(variant){const pts=[],idx=[],n=7,rings=5;for(let j=0;j<rings;j++){const y=[0,.13,.48,.77,1][j],r=[.7,1,.94,.82,.48][j];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const jitter=.84+.22*Math.sin(i*4.7+variant*2+j*.8);pts.push(Math.cos(a)*r*jitter+.19*y*Math.sin(variant),y+(j>0?.045*Math.sin(i*3+variant):0),Math.sin(a)*r*jitter+.14*y)}}for(let j=0;j<rings-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;idx.push(a,a+n,b,b,a+n,b+n)}for(let i=1;i<n-1;i++)idx.push(28,28+i+1,28+i);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setIndex(idx);const flat=g.toNonIndexed();flat.computeVertexNormals();return flat}
const rocks=Array.from({length:6},(_,i)=>crag(i));
function rock(x,z,r,h,variant=0){add(rocks[variant%6],[stone,stoneLight,stoneDark][variant%3],x,height(x,z)-.035,z,r,h*.8,r*.95,variant*.8)}
// Composed mountain chain: dominant slabs, supporting shoulders, then scree.
for(const [x,z,r,h,v]of [[-3.8,-2.8,1.1,3.7,1],[-2.4,-3.1,.85,4.5,3],[-1.5,-2.7,.9,2.5,0],[-4.6,-1.7,.8,2,4],[-2.9,-1.6,.9,2.1,2],[3.9,-2.6,1.05,3.1,1],[3.8,-3.1,.75,3.8,4],[3,-3.2,.9,2.1,0],[4.4,-1.4,.72,1.8,2]])rock(x,z,r,h,v);
for(let i=0;i<140;i++){const x=(rand()-.5)*11,z=-3.4+rand()*3.4;const near=Math.min(Math.hypot(x+3,z+2.5),Math.hypot(x-4,z+2.7));if(near<2.5&&insideWorld(x,z,.35)&&!cellAt(x,z).water){const r=.12+rand()*.35;rock(x,z,r,r*(1+rand()*1.9),i)}}
// A winding path follows the rolling terrain.
function strip(points,width,mat){const v=[];for(let i=0;i<points.length-1;i++){const [x,z]=points[i],[xx,zz]=points[i+1];if(!insideWorld(x,z,.2)||!insideWorld(xx,zz,.2)||cellAt(x,z).water||cellAt(xx,zz).water)continue;const dx=xx-x,dz=zz-z,len=Math.hypot(dx,dz),nx=-dz/len*width,nz=dx/len*width;const p=[[x+nx,z+nz],[xx+nx,zz+nz],[x-nx,z-nz],[xx-nx,zz-nz]];const a=p.map(([x,z])=>[x,height(x,z)+.018,z]);v.push(...a[0],...a[1],...a[2],...a[1],...a[3],...a[2])}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();add(g,mat)}
const route=[];for(let i=0;i<80;i++){const z=5.4-i*.12;route.push([Math.sin(z*.7)*1.1+.5,z])}strip(route,.18,path);
// Shaped houses: chamfered footprints, roof prisms and inset dark doorways.
function block(w,h,d,bevel=.07){const shape=new T.Shape(),b=Math.min(bevel,w/4,d/4);shape.moveTo(-w/2+b,-d/2);for(const [x,y]of [[w/2-b,-d/2],[w/2,-d/2+b],[w/2,d/2-b],[w/2-b,d/2],[-w/2+b,d/2],[-w/2,d/2-b],[-w/2,-d/2+b]])shape.lineTo(x,y);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelThickness:b*.35,bevelSize:b*.35,bevelSegments:1,steps:1});g.rotateX(-Math.PI/2);return g}
function house(x,z,s=1){const y=height(x,z);add(block(.48,.38,.42),wall,x,y,z,s,s,s);const verts=[-.3,0,-.26,.3,0,-.26,0,.28,-.26,-.3,0,.26,.3,0,.26,0,.28,.26],indices=[0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1];const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();add(g,roof,x,y+.4*s,z,s,s,s);add(block(.1,.2,.025,.02),door,x+.07*s,y,z+.222*s,s,s,s);add(block(.06,.09,.018,.01),door,x-.13*s,y+.23*s,z+.223*s,s,s,s)}
// One city occupies one hex. A compact silhouette, with a prominent civic centre.
const templeX=0,templeZ=0;
for(const [x,z,scale]of [[-.42,.25,.46],[.4,.27,.4],[-.34,-.37,.5],[.35,-.34,.42],[.05,.56,.36]])house(x,z,scale);
add(block(.43,.48,.38),wall,0,.22,-.04);
add(block(.53,.08,.45),stoneLight,0,.7,-.04);
add(new T.SphereGeometry(.24,12,6,0,Math.PI*2,0,Math.PI/2),roof,0,.78,-.04);
for(const dx of [-.17,0,.17])add(new T.CylinderGeometry(.025,.03,.24,8),wall,dx,.44,.2);
add(block(.46,.06,.18),stoneLight,0,.57,.19);
for(let i=0;i<3;i++)add(block(.35+i*.06,.035,.09),wall,0,.23+i*.03,.41-i*.075);
// A sculpted warrior counter: asymmetric cloak, bent arm, spear and broad shield.
const unitX=Math.sqrt(3),unitZ=0,unitY=.22,cloth=material('#a84736'),bronze=material('#b39559'),skin=material('#ceb08a'),ink=material('#283749');
add(new T.CylinderGeometry(.26,.3,.085,24),bronze,unitX,unitY+.04,0);
const robeVertices=[],robeIndices=[],rings=[[.22,.10,0],[.24,.25,-.035],[.15,.52,.015],[.19,.73,-.03],[.13,.84,0]];
for(let j=0;j<rings.length;j++)for(let i=0;i<9;i++){const a=i/9*Math.PI*2,[r,y,shift]=rings[j];robeVertices.push(Math.cos(a)*(r+(i%2?.025:0))+shift,y,Math.sin(a)*r*.68)}
for(let j=0;j<4;j++)for(let i=0;i<9;i++){const a=j*9+i,b=j*9+(i+1)%9;robeIndices.push(a,a+9,b,b,a+9,b+9)}
const robe=new T.BufferGeometry();robe.setAttribute('position',new T.Float32BufferAttribute(robeVertices,3));robe.setIndex(robeIndices);const robeFlat=robe.toNonIndexed();robeFlat.computeVertexNormals();add(robeFlat,cloth,unitX,unitY,unitZ);
add(new T.IcosahedronGeometry(.11,1),skin,unitX-.025,unitY+.96,0,.82,1.15,.9);
add(new T.SphereGeometry(.12,10,5,0,Math.PI*2,0,Math.PI/2),bronze,unitX-.025,unitY+1.01,0);
add(block(.055,.15,.18,.02),cloth,unitX-.025,unitY+1.1,-.01);
const arm=block(.085,.3,.1,.025);arm.rotateZ(-.45);add(arm,cloth,unitX+.16,unitY+.53,.01);
add(new T.IcosahedronGeometry(.055,0),skin,unitX+.28,unitY+.71,.03);
add(new T.CylinderGeometry(.013,.013,1.22,6),ink,unitX+.28,unitY+.66,.03);
add(new T.ConeGeometry(.055,.17,4),bronze,unitX+.28,unitY+1.33,.03);
const shield=new T.CylinderGeometry(.18,.18,.035,12);shield.rotateX(Math.PI/2);add(shield,bronze,unitX-.19,unitY+.56,.17,1,1.15,1);
const shieldFace=new T.CylinderGeometry(.145,.145,.039,12);shieldFace.rotateX(Math.PI/2);add(shieldFace,cloth,unitX-.19,unitY+.56,.175,1,1.15,1);
// Selected piece and connected territorial perimeter, kept readable over terrain.
const ring=new T.TorusGeometry(.36,.017,5,48);ring.rotateX(Math.PI/2);add(ring,bronze,unitX,unitY+.02,unitZ);
const owned=hexes.filter(h=>Math.max(Math.abs(h.q),Math.abs(h.r),Math.abs(h.q+h.r))<=1),edgeMap=new Map();
for(const h of owned)for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6,b=a+Math.PI/3,p=[h.x+Math.cos(a),h.z+Math.sin(a)],q=[h.x+Math.cos(b),h.z+Math.sin(b)];const key=[p,q].map(v=>v.map(n=>Math.round(n*1000)).join(',')).sort().join('|');if(edgeMap.has(key))edgeMap.delete(key);else edgeMap.set(key,[p,q])}
// One depth-tested, terrain-following flat ribbon. Shared miter vertices
// keep hex corners crisp; the inset places it on land rather than in seams.
const remaining=[...edgeMap.values()],outline=[];
const vertexKey=p=>p.map(n=>Math.round(n*1000)).join(',');
if(remaining.length){const first=remaining.shift();outline.push(first[0],first[1]);while(remaining.length){const end=vertexKey(outline[outline.length-1]);const i=remaining.findIndex(([a,b])=>vertexKey(a)===end||vertexKey(b)===end);if(i<0)throw new Error('Territory perimeter is not contiguous');const [a,b]=remaining.splice(i,1)[0];outline.push(vertexKey(a)===end?b:a)}}
outline.pop();
const area=outline.reduce((sum,p,i)=>{const q=outline[(i+1)%outline.length];return sum+p[0]*q[1]-q[0]*p[1]},0);
const inward=(a,b)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]),sign=Math.sign(area);return [-(b[1]-a[1])/d*sign,(b[0]-a[0])/d*sign]};
const rails=outline.map((p,i)=>{const n=inward(outline[(i+outline.length-1)%outline.length],p),m=inward(p,outline[(i+1)%outline.length]),d=1+n[0]*m[0]+n[1]*m[1];return [.045,.085].map(w=>[p[0]+(n[0]+m[0])*w/d,p[1]+(n[1]+m[1])*w/d])});
const borderVertices=[],borderIndices=[];
for(let i=0;i<rails.length;i++)for(let j=0;j<24;j++){const t=j/24;for(let side=0;side<2;side++){const a=rails[i][side],b=rails[(i+1)%rails.length][side],x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;borderVertices.push(x,height(x,z)+.025,z)}}
const pairs=borderVertices.length/6;
for(let i=0;i<pairs;i++){const a=i*2,b=((i+1)%pairs)*2;borderIndices.push(a,b,a+1,b,b+1,a+1)}
const borderGeometry=new T.BufferGeometry();borderGeometry.setAttribute('position',new T.Float32BufferAttribute(borderVertices,3));borderGeometry.setIndex(borderIndices);
const borderMesh=new T.Mesh(borderGeometry,new T.MeshBasicMaterial({color:'#a84736',side:T.DoubleSide,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));scene.add(borderMesh);

// Vegetation uses reusable sculpted crowns and tapering bent cypresses.
const crowns=Array.from({length:4},(_,k)=>{const g=new T.IcosahedronGeometry(1,1);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.15*Math.sin(x*5+y*3+k)*Math.cos(z*4);p.setXYZ(i,x*f,y*f,z*f)}g.computeVertexNormals();return g});
const trunkGeo=new T.CylinderGeometry(.018,.035,.3,5);
const objects=[];function tree(x,z,s,type){const y=height(x,z);objects.push({g:trunkGeo,m:bark,x,y:y+.15*s,z,sx:s,sy:s,sz:s});if(type){objects.push({g:rocks[type%6],m:pine,x,y:y+.03,z,sx:.14*s,sy:.8*s,sz:.15*s})}else{for(let j=0;j<3;j++)objects.push({g:crowns[j],m:j%2?foliage:foliageLight,x:x+Math.sin(j*3)*.13*s,y:y+(.4+j*.05)*s,z:z+Math.cos(j*3)*.1*s,sx:.23*s,sy:.24*s,sz:.22*s})}}
for(let i=0;i<260;i++){const x=(rand()-.5)*11.5,z=(rand()-.5)*9.8;const pathX=Math.sin(z*.7)*1.1+.5;if(!insideWorld(x,z,.2)||cellAt(x,z).water||cellAt(x,z).terrain==='desert'||Math.hypot(x,z)<1.1||Math.hypot(x-1.732,z)<.8||Math.abs(x-pathX)<.45||Math.hypot(x-2.1,z-2.6)<1||Math.hypot(x-templeX,z-templeZ)<1||z<-2)continue;if(Math.sin(x*1.5+z)*Math.cos(z*1.2)>.1)tree(x,z,.45+rand()*.65,i%3)}
// Deliberate forest hexes remain legible as a feature at the normal game angle.
for(const [q,r]of [[-1,-1],[-2,1],[0,-2]]){const h=hexes.find(t=>t.q===q&&t.r===r);h.feature='Forest';for(let i=0;i<20;i++){const a=rand()*Math.PI*2,d=Math.sqrt(rand())*.66,x=h.x+Math.cos(a)*d,z=h.z+Math.sin(a)*d;tree(x,z,.42+rand()*.24,i%3)}}
// A worked plains tile: small furrows, kept separate from the city sculpt.
const farm=hexes.find(h=>h.q===-1&&h.r===1);for(let i=0;i<7;i++){const x=farm.x-.45+i*.14;const points=[];for(let j=0;j<9;j++)points.push([x,farm.z-.45+j*.11]);strip(points,.021,path)}
// Grass grows in patches; keep the open paths and building footprints clear.
const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.014,0,0,.014,0,0,.007,.09,0,0,0,-.012,0,0,.012,-.007,.07,.003],3));blade.computeVertexNormals();
for(let i=0;i<10000;i++){const x=(rand()-.5)*12.7,z=(rand()-.5)*10.7;if(!insideWorld(x,z,.08)||cellAt(x,z).water||cellAt(x,z).terrain==='desert'||Math.hypot(x,z)<1.1||Math.hypot(x-1.732,z)<.8||Math.abs(x-(Math.sin(z*.7)*1.1+.5))<.3||Math.hypot(x-2.1,z-2.6)<.85||Math.hypot(x-templeX,z-templeZ)<.9||Math.sin(x*2+Math.sin(z))*Math.cos(z*1.4)<.1)continue;objects.push({g:blade,m:i%9?grassMat:flower,x,y:height(x,z)+.015,z,sx:1,sy:.5+rand(),sz:1})}
// Static terrain batches and instanced foliage; no per-frame surface rebuilding.
for(const [m,list]of batches){const mesh=new T.Mesh(mergeGeometries(list),m);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);list.forEach(g=>g.dispose())}
const grouped=new Map();for(const o of objects){const key=o.g.uuid+o.m.uuid;const group=grouped.get(key)||[];group.push(o);grouped.set(key,group)}const dummy=new T.Object3D();for(const group of grouped.values()){const inst=new T.InstancedMesh(group[0].g,group[0].m,group.length);group.forEach((o,i)=>{dummy.position.set(o.x,o.y,o.z);dummy.scale.set(o.sx,o.sy,o.sz);dummy.rotation.y=i*2.4;dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)});inst.castShadow=group[0].g!==blade;inst.receiveShadow=true;scene.add(inst)}
const palettes={meadow:['#99ab65','#597e53','#82944b','#345b4b','#7f9251','#c5b381'],ochre:['#cba565','#b85835','#db783f','#3d5a4d','#8a8651','#dfb778']};document.querySelector('#palette').onchange=e=>{[ground,foliage,foliageLight,pine,grassMat,path].forEach((m,i)=>m.color.set(palettes[e.target.value][i]));};
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.left=-8*innerWidth/innerHeight;camera.right=8*innerWidth/innerHeight;camera.updateProjectionMatrix()});let last=0;renderer.setAnimationLoop(t=>{controls.update();renderer.render(scene,camera);for(const [id,x,y,z]of [['city-label',0,1.05,0],['unit-label',unitX,1.8,unitZ]]){const p=new T.Vector3(x,y,z).project(camera),el=document.getElementById(id);el.style.left=(p.x*.5+.5)*innerWidth+'px';el.style.top=(-p.y*.5+.5)*innerHeight+'px';}if(t-last>1000){document.querySelector('#stats').textContent=`${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k triangles`;last=t}});

const warrior=units.units.warrior;document.getElementById('unit-details').textContent=`${warrior.name} · Strength ${warrior.combatStrength} · Movement ${warrior.movement}`;

// Raycast the displayed tile tops so raised hills receive the correct label.
const hover=document.getElementById('terrain-hover'),ray=new T.Raycaster(),pointer=new T.Vector2();
renderer.domElement.addEventListener('pointermove',e=>{pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pickTiles,false)[0];if(hit){const h=hit.object.userData.cell;hover.textContent=h.terrain.charAt(0).toUpperCase()+h.terrain.slice(1)+(h.feature?' · '+h.feature:'')+(h.hills?' · Hills':h.water?'':' · Flat');}else hover.textContent='';});

if(new URLSearchParams(location.search).has('benchmark'))import('./benchmark.js').then(({benchmark})=>benchmark({renderer,scene,camera,controls,base}));
