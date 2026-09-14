import { treatment } from './render-treatment.js';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const direction=new URLSearchParams(location.search).get('direction')||'lush';
const simple=direction==='graphic';
const stage=document.querySelector('#stage');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.setClearColor('#e5ddca');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;stage.append(renderer.domElement);
const scene=new T.Scene();const camera=new T.PerspectiveCamera(35,1,.1,100);camera.position.set(10,12,15);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.1,0);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=28;controls.maxPolarAngle=Math.PI*.46;
scene.add(new T.HemisphereLight(0xfff5db,0x727d89,2));const sun=new T.DirectionalLight(0xffecd0,2.5);sun.position.set(-6,12,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12});sun.shadow.bias=-.0004;scene.add(sun);
const mat=(color,metalness=0,roughness=.7)=>new T.MeshStandardMaterial({color,metalness,roughness});
const gold=mat('#b69045',.65,.35),ivory=mat('#e8d8b2'),blue=mat('#294979',.1,.48),red=mat('#b54832'),wood=mat('#4f5146'),green=mat('#718779'),dark=mat('#303d42');
const board=new T.Group(), cabinet=new T.Group(),ornaments=new T.Group(),inlay=new T.Group(),beads=new T.Group();scene.add(board,cabinet);board.add(ornaments,inlay,beads);beads.visible=false;cabinet.visible=false;
function mesh(g,m,parent,x=0,y=0,z=0){if(!simple&&g.type==='IcosahedronGeometry'&&g.parameters.radius===.23){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const f=1+.18*Math.sin(x*39+y*21)*Math.cos(z*33);p.setXYZ(i,x*f,y*(1+.14*Math.sin(x*44+z*28)),z*f)}g.computeVertexNormals()}const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cyl(parent,r,h,m,x=0,y=0,z=0,rt=r,n=48){return mesh(new T.CylinderGeometry(rt,r,h,n),m,parent,x,y,z)}
function ball(parent,r,m,x,y,z){return mesh(new T.IcosahedronGeometry(r,2),m,parent,x,y,z)}
function line(parent,pts,m=gold,r=.012){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),Math.max(8,pts.length*4),r,5,false),m,parent)}
function ring(parent,r,y,m=gold,x=0,z=0){const o=mesh(new T.TorusGeometry(r,.012,6,72),m,parent,x,y,z);o.rotation.x=Math.PI/2;return o}
const floor=mesh(new T.PlaneGeometry(200,200),mat('#e5ddca'),scene,0,-.62,0);floor.rotation.x=-Math.PI/2;
cyl(board,6.25,.25,wood,0,-.43,0,6.25,96);cyl(board,6.28,.06,gold,0,-.27,0,6.28,96);cyl(board,6.15,.12,blue,0,-.19,0,6.15,96);
ring(ornaments,5.98,-.118);ring(ornaments,5.8,-.117);
// One small shared grain texture; no external maps or per-tile textures.
const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=128;
const ctx=grainCanvas.getContext('2d'),pixels=ctx.createImageData(128,128);
let seed=73;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
for(let i=0;i<pixels.data.length;i+=4){const v=190+random()*65;pixels.data.set([v,v,v,255],i)}ctx.putImageData(pixels,0,0);
const grain=new T.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(5,5);grain.colorSpace=T.SRGBColorSpace;
const ramp=new T.DataTexture(new Uint8Array([70,145,220,255]),4,1,T.RedFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
const toon=(color,texture=false)=>simple?new T.MeshToonMaterial({color,gradientMap:ramp}):new T.MeshStandardMaterial({color,map:texture?grain:null,roughness:.92});
const turf=toon(simple?'#78b77b':'#759743',true),meadow=toon(simple?'#acd49a':'#b4b665',true),ochre=toon(simple?'#e4c585':'#d1b074',true),rock=toon('#777965',true),snow=toon('#e4dac0'),soil=toon('#887153',true),waterMat=toon(simple?'#71bdbc':'#286987'),leaf=toon(simple?'#3d8c77':'#294f3d'),leafLight=toon(simple?'#67ad78':'#638249'),trunk=toon('#635137');
const terrain=new T.Group();board.add(terrain);
const tiles=new Map(),rad=.85,coords=(q,r)=>[Math.sqrt(3)*rad*(q+r/2),1.5*rad*r];
function bump(x,z,q,r){const protectedTile=['0,-1','1,0','-1,1','0,0','1,-1'].includes(`${q},${r}`);if(protectedTile)return .22;const k=Math.sin(q*7+r*4);return .24+Math.max(0,k)*.62*Math.exp(-((x-.16)**2+(z+.1)**2)*2.8)+.045*Math.sin(x*7+q)*Math.cos(z*6+r)}
for(let q=-3;q<=3;q++)for(let r=-3;r<=3;r++){
 if(Math.abs(q+r)>3)continue;const [x,z]=coords(q,r),water=r>=2||(q===3&&r>=-1);const h=water?.02:bump(0,0,q,r);tiles.set(`${q},${r}`,{x,z,h,water,q,r});
 if(water)continue;
 const vertices=[],uvs=[],indices=[];const rings=simple?5:12,sectors=simple?24:60;
 vertices.push(0,h,0);uvs.push(.5,.5);
 for(let j=1;j<=rings;j++)for(let i=0;i<sectors;i++){const a=i/sectors*Math.PI*2+Math.PI/6;const segment=i/(sectors/6),side=Math.floor(segment),f=segment-side;const a0=side*Math.PI/3+Math.PI/6,a1=a0+Math.PI/3;const px=((1-f)*Math.cos(a0)+f*Math.cos(a1))*rad*.995*j/rings,pz=((1-f)*Math.sin(a0)+f*Math.sin(a1))*rad*.995*j/rings;vertices.push(px,bump(px,pz,q,r),pz);uvs.push(px*.5+.5,pz*.5+.5)}
 for(let i=0;i<sectors;i++)indices.push(0,1+(i+1)%sectors,1+i);
 for(let j=1;j<rings;j++)for(let i=0;i<sectors;i++){const a=1+(j-1)*sectors+i,b=1+(j-1)*sectors+(i+1)%sectors,c=a+sectors,d=b+sectors;indices.push(a,b,c,b,d,c)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();mesh(g,q>1?ochre:(q+r)%3===0?meadow:turf,terrain,x,0,z);
 // Exposed earth underneath the gently sculpted surface.
 cyl(terrain,.844,.29,soil,x,.015,z,.844,6);
}
// A single continuous sea, with quiet graphic ripples along the coast.
cyl(terrain,5.55,.06,waterMat,0,-.005,0,5.55,96);
const foam=toon('#8bc6bf');for(const t of tiles.values())if(t.water)for(let j=0;j<3;j++){const xx=t.x-.4+random()*.16,zz=t.z-.32+j*.26;line(terrain,[[xx,.036,zz],[xx+.22,.036,zz+.028],[xx+.46,.036,zz]],foam,.012)}
function tree(x,z,h,s=1){cyl(terrain,.047*s,.5*s,trunk,x,h+.25*s,z,.035*s,7);for(let j=0;j<(simple?1:4);j++){const crown=mesh(new T.IcosahedronGeometry((simple?.42:(.29-j*.035))*s,simple?1:2),j%2?leafLight:leaf,terrain,x+Math.sin(j*3)*.12*s,h+(.54+j*.15)*s,z+Math.cos(j*3)*.09*s);crown.scale.y=1.05}}
// Forests are landscape texture; the magister's pieces tower over them.
for(const t of tiles.values()){
 if(t.water||['0,-1','1,0','-1,1','0,0','1,-1'].includes(`${t.q},${t.r}`))continue;
 const count=simple?(t.q<1?12:5):(t.q<1?90:25);
 for(let i=0;i<count;i++){const x=(random()-.5)*1.25,z=(random()-.5)*1.22;if(x*x+z*z>.38)continue;tree(t.x+x,t.z+z,bump(x,z,t.q,t.r),.17+random()*.16)}
}
// Broken ridgelines, rather than a single mountain token on each hex.
for(const key of ['-2,-1','-1,-2','1,-3']){const t=tiles.get(key);for(let i=0;i<9;i++){const x=(i-4)*.13,z=Math.sin(i*1.7)*.16;const height=.25+random()*.5;const m=mesh(new T.IcosahedronGeometry(.23,simple?0:2),rock,terrain,t.x+x,t.h+height*.38,t.z+z);m.scale.set(.9,height/.23, .7);m.rotation.y=i*2;const cap=mesh(new T.IcosahedronGeometry(.085,0),snow,terrain,t.x+x,t.h+height*.95,t.z+z);cap.scale.set(1,.8,1)}}
// Low-cost ground detail, merged below with its material family.
for(const t of tiles.values()){if(t.water||['0,-1','1,0','-1,1'].includes(`${t.q},${t.r}`))continue;for(let i=0;i<(simple?0:100);i++){const x=(random()-.5)*1.15,z=(random()-.5)*1.1;if(x*x+z*z>.4)continue;const h=bump(x,z,t.q,t.r);const o=mesh(new T.ConeGeometry(.008,.025+random()*.025,3),leafLight,terrain,t.x+x,h+.016,t.z+z);o.rotation.z=(random()-.5)*.4}}
// The inhabited world: farms, roads, villages and sacred architecture in miniature.
const plaster=toon('#ead6ac',true),terracotta=toon('#a64d35'),roofBlue=toon('#344f69'),pathMat=toon('#cfb783',true),fieldGold=toon('#d2ae45',true),fieldGreen=toon('#7c9441',true);
function house(x,z,h,size=.1){mesh(new T.BoxGeometry(size,.085,size*.75),plaster,terrain,x,h+.043,z);const roof=mesh(new T.ConeGeometry(size*.83,.07,4),random()>.5?terracotta:roofBlue,terrain,x,h+.12,z);roof.rotation.y=Math.PI/4;roof.scale.z=.8}
for(const key of ['0,1','2,-1','-2,1','1,1']){const t=tiles.get(key);for(let i=0;i<(simple?7:45);i++){const angle=random()*Math.PI*2,r=.12+random()*.32;const x=Math.cos(angle)*r,z=Math.sin(angle)*r;house(t.x+x,t.z+z,bump(x,z,t.q,t.r),.06+random()*.045)}
 const x=t.x,z=t.z,h=t.h;cyl(terrain,.075,.24,plaster,x,h+.12,z,.065,8);mesh(new T.ConeGeometry(.1,.11,8),roofBlue,terrain,x,h+.295,z);
 for(let j=0;j<4;j++){const x0=t.x-.48+j*.19,z0=t.z+.36;const g=new T.PlaneGeometry(.15,.22,3,4);g.rotateX(-Math.PI/2);const ps=g.attributes.position;for(let i=0;i<ps.count;i++)ps.setY(i,bump(ps.getX(i)+x0-t.x,ps.getZ(i)+z0-t.z,t.q,t.r)+.008);g.computeVertexNormals();mesh(g,j%2?fieldGold:fieldGreen,terrain,x0,0,z0);for(let k=0;k<(simple?0:4);k++)line(terrain,[[x0-.06+k*.04,bump(x0-t.x,z0-t.z-.1,t.q,t.r)+.016,z0-.1],[x0-.06+k*.04,bump(x0-t.x,z0-t.z+.1,t.q,t.r)+.016,z0+.1]],pathMat,.003)}
}
// A procession road linking the capital to its agricultural hinterland.
for(const key of ['0,0','0,1','1,-1','2,-1']){const t=tiles.get(key);const pts=[];for(let i=0;i<=16;i++){const z=-.6+i*.075,x=Math.sin(i*.22)*.12;pts.push([t.x+x,bump(x,z,t.q,t.r)+.014,t.z+z])}line(terrain,pts,pathMat,.027)}
// The memory theatre rises from a dense ring of lesser monuments.
const capital=tiles.get('0,-1');for(let i=0;i<(simple?8:24);i++){const a=i*Math.PI/(simple?4:12),r=.68;const x=capital.x+Math.cos(a)*r,z=capital.z+Math.sin(a)*r;house(x,z,.22,.065)}
// A miniature aqueduct: repeated piers and an elevated channel.
const aqueduct=tiles.get('-1,0');for(let i=0;i<11;i++){const x=aqueduct.x-.6+i*.12,z=aqueduct.z+.14,h=bump(x-aqueduct.x,.14,aqueduct.q,aqueduct.r);mesh(new T.BoxGeometry(.035,.18,.055),plaster,terrain,x,h+.09,z);mesh(new T.BoxGeometry(.13,.035,.075),plaster,terrain,x,h+.19,z)}
// The capital's stepped ceremonial approach and flanking obelisks.
for(let i=0;i<7;i++){mesh(new T.BoxGeometry(.22+i*.045,.028,.06),plaster,terrain,capital.x,.245+(6-i)*.023,capital.z+.47+i*.055)}
for(const dx of [-.31,.31]){cyl(terrain,.037,.42,plaster,capital.x+dx,.43,capital.z+.66,.02,4);mesh(new T.ConeGeometry(.028,.07,4),fieldGold,terrain,capital.x+dx,.675,capital.z+.66)}
// Curving strips of turquoise distinguish river valleys from the blue sea.
for(const key of ['-3,1','-2,1','-2,2']){const t=tiles.get(key);if(t.water)continue;const pts=[];for(let i=0;i<=24;i++){const z=-.62+i*.052,x=Math.sin(i*.23)*.21;pts.push([t.x+x,bump(x,z,t.q,t.r)+.021,t.z+z])}line(terrain,pts,pathMat,.057);line(terrain,pts,waterMat,.039)}
// Tiny lateen sails make the surrounding sea feel navigated.
const sailMat=new T.MeshToonMaterial({color:'#eee0b7',side:T.DoubleSide,gradientMap:ramp});
for(const [x,z]of [[-1.7,3.1],[.4,3.6],[2.7,2.3],[-3.1,2.6]]){const hull=mesh(new T.SphereGeometry(.12,8,4),trunk,terrain,x,.055,z);hull.scale.set(.5,.35,1.8);cyl(terrain,.007,.27,plaster,x,.17,z,.007,5);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,.25,0,.17,.025,0],3));g.computeVertexNormals();const sail=mesh(g,sailMat,terrain,x,.1,z);sail.rotation.y=-.6}
// Lush direction: geology, garden courts, harbour works and a ruined sanctuary.
if(!simple){
 const blossom=toon('#d78b81'),lichen=toon('#b8b180'),window=toon('#33423e');
 for(const t of tiles.values())if(!t.water&&!['0,-1','1,0','-1,1'].includes(`${t.q},${t.r}`)){
  for(let i=0;i<30;i++){const x=(random()-.5)*1.1,z=(random()-.5)*1.1;if(x*x+z*z>.32)continue;const h=bump(x,z,t.q,t.r);const o=mesh(new T.IcosahedronGeometry(.018+random()*.025,1),i%5===0?blossom:lichen,terrain,t.x+x,h+.014,t.z+z);o.scale.y=.45}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const x=Math.cos(a)*.82,z=Math.sin(a)*.82;const o=mesh(new T.IcosahedronGeometry(.075,1),soil,terrain,t.x+x,.1,t.z+z);o.scale.set(1,.7, .55)}
 }
 const ruin=tiles.get('2,-2');for(let i=0;i<8;i++){const a=i*Math.PI/4,x=ruin.x+Math.cos(a)*.3,z=ruin.z+Math.sin(a)*.3,h=bump(x-ruin.x,z-ruin.z,2,-2);cyl(terrain,.033,i===2?.1:.27,plaster,x,h+.13,z,.027,12);cyl(terrain,.05,.025,plaster,x,h+.275,z,.05,8);if(i<5){const beam=mesh(new T.BoxGeometry(.24,.035,.07),plaster,terrain,x,h+.3,z);beam.rotation.y=-a}}
 const port=tiles.get('1,1');for(let i=0;i<3;i++){mesh(new T.BoxGeometry(.075,.08,.5),trunk,terrain,port.x-.22+i*.2,.04,port.z+.61);for(let j=0;j<5;j++)mesh(new T.BoxGeometry(.09,.009,.018),pathMat,terrain,port.x-.22+i*.2,.086,port.z+.4+j*.09)}
 for(let i=0;i<20;i++){const a=i*Math.PI/10,x=capital.x+Math.cos(a)*.82,z=capital.z+Math.sin(a)*.82;cyl(terrain,.046,.19,plaster,x,.32,z,.04,10);mesh(new T.SphereGeometry(.051,10,6),roofBlue,terrain,x,.43,z);mesh(new T.BoxGeometry(.025,.07,.007),window,terrain,x,.33,z+.04)}
 // Stepped gardens tucked beneath the eastern hill.
 const garden=tiles.get('2,-1');for(let j=0;j<5;j++){const x=garden.x+.1,z=garden.z-.35+j*.12,h=.25+j*.04;mesh(new T.BoxGeometry(.52-j*.05,.04,.1),plaster,terrain,x,h,z);for(let i=0;i<6;i++)ball(terrain,.026,leafLight,x-.2+i*.075,h+.035,z)}
}
// Merge static terrain by material: hundreds of details, a handful of draw calls.
terrain.updateMatrixWorld(true);const batches=new Map();for(const o of terrain.children){if(!o.isMesh)continue;const g=o.geometry.clone().applyMatrix4(o.matrix);const list=batches.get(o.material)||[];list.push(g.toNonIndexed());batches.set(o.material,list)}
for(const o of [...terrain.children]){terrain.remove(o);o.geometry.dispose()}
for(const [material,geometries]of batches){mesh(mergeGeometries(geometries),material,terrain);geometries.forEach(g=>g.dispose())}
// Tiny moving signs of life, kept subordinate to the board's pieces.
const life=new T.Group();board.add(life);const drifters=[];
for(let i=0;i<(simple?4:9);i++){const bird=new T.Group();life.add(bird);line(bird,[[-.065,0,0],[0,-.025,.018],[.065,0,0]],dark,simple?.012:.007);bird.userData.phase=i*1.7;drifters.push(bird)}
const clouds=[];for(let i=0;i<(simple?3:5);i++){const cloud=new T.Group();life.add(cloud);const cloudMat=new T.MeshBasicMaterial({color:'#f4ecda',transparent:true,opacity:simple?.7:.22,depthWrite:false});for(let j=0;j<3;j++){const puff=mesh(new T.SphereGeometry(.16+j*.035,10,6),cloudMat,cloud,(j-1)*.18,0,0);puff.scale.set(1,.28,.7);puff.castShadow=false}cloud.position.set(-3+i*1.4,1.3+(i%2)*.3,-1.9);clouds.push(cloud)}
function piece(parent,x,z,y,color,kind,scale=1){const p=new T.Group();parent.add(p);p.position.set(x,y,z);p.scale.setScalar(scale);cyl(p,.37,.09,gold,0,.045);cyl(p,.32,.12,color,0,.13);cyl(p,.29,.045,ivory,0,.21);const profile=[[.26,.23],[.27,.3],[.22,.44],[.17,.63],[.2,.85],[.14,.96]].map(([a,b])=>new T.Vector2(a,b));mesh(new T.LatheGeometry(profile,12),color,p);ball(p,.145,ivory,0,1.075,0);const nose=mesh(new T.ConeGeometry(.045,.13,4),ivory,p,0,1.065,.15);nose.rotation.x=Math.PI/2;
const deco=new T.Group();p.add(deco);p.userData.deco=deco;
for(let i=0;i<8;i++){const a=i*Math.PI/4;ball(deco,.022,gold,Math.sin(a)*.31,.15,Math.cos(a)*.31);line(deco,[[Math.sin(a)*.245,.32,Math.cos(a)*.245],[Math.sin(a)*.175,.7,Math.cos(a)*.175]],gold,.009)}
if(kind==='king'){cyl(p,.158,.075,gold,0,1.2);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;mesh(new T.ConeGeometry(.045,.14,4),gold,p,Math.sin(a)*.14,1.28,Math.cos(a)*.14)}mesh(new T.SphereGeometry(.23,12,8,0,Math.PI*2,0,Math.PI/2),color,p,0,.92,-.03);cyl(p,.025,.95,gold,.31,.7,.04);ball(p,.075,ivory,.31,1.21,.04)}else{mesh(new T.ConeGeometry(.18,.35,8),ivory,p,0,1.28,0);cyl(p,.022,1.3,gold,.33,.84,0);const halo=mesh(new T.TorusGeometry(.15,.018,6,32),gold,deco,.33,1.57,0);halo.rotation.y=.5;ball(deco,.065,blue,.33,1.57,0)}return p}
const t1=tiles.get('1,0'),t2=tiles.get('-1,1');const figures=[piece(board,t1.x,t1.z,t1.h,blue,'king'),piece(board,t2.x,t2.z,t2.h,red,'sage')];
function city(){const t=tiles.get('0,-1');const p=new T.Group();p.position.set(t.x,t.h,t.z);board.add(p);cyl(p,.65,.12,gold,0,.06,0,.65,8);cyl(p,.57,.15,ivory,0,.18,0,.57,8);for(let i=0;i<8;i++){const a=i*Math.PI/4;const x=Math.sin(a)*.44,z=Math.cos(a)*.44;cyl(p,.064,.55,ivory,x,.52,z);cyl(p,.09,.05,gold,x,.79,z)}cyl(p,.55,.1,ivory,0,.85,0,.55,8);mesh(new T.SphereGeometry(.43,16,8,0,Math.PI*2,0,Math.PI/2),blue,p,0,.9,0);cyl(p,.025,.3,gold,0,1.43);ball(p,.075,gold,0,1.6,0);const a=new T.Group();a.position.set(t.x,t.h+1.65,t.z);ornaments.add(a);for(let i=0;i<3;i++){const o=mesh(new T.TorusGeometry(.31,.012,6,60),gold,a);o.rotation.set(i*.8,.5+i*.8,0)}return a}const celestial=city();
// The sovereign's disc borrows the symbolic scale of a tarot sun.
const sovereign=figures[0],disc=sovereign.userData.deco;
const halo=mesh(new T.TorusGeometry(.29,.014,5,48),gold,disc,0,1.2,-.12);
for(let i=0;i<16;i++){const a=i*Math.PI/8;line(disc,[[Math.cos(a)*.32,1.2+Math.sin(a)*.32,-.12],[Math.cos(a)*.38,1.2+Math.sin(a)*.38,-.12]],gold,.01)}
// Paired gilt leaves give the robe an engraved rhythm at close range.
for(const p of figures)for(let j=0;j<3;j++)for(const side of [-1,1]){const y=.38+j*.14;line(p.userData.deco,[[0,y, .25-j*.028],[side*.07,y+.045,.245-j*.028],[side*.09,y+.085,.23-j*.028]],gold,.008)}
// Detailed direction: fluted cloaks and openwork celestial furniture.
if(!simple){
 for(const p of figures){for(let i=0;i<24;i++){const a=i*Math.PI/12;const pts=[];for(let j=0;j<12;j++){const y=.28+j*.052,r=.255-j*.007+Math.sin(j*.8+i)*.006;pts.push([Math.sin(a)*r,y,Math.cos(a)*r])}line(p,pts,i%3===0?gold:p===figures[0]?blue:red,.012)}
  for(let j=0;j<3;j++){const band=ring(p,.29-j*.025,.3+j*.1,gold);band.scale.y=1;}
 }
 // An arcaded rotunda: pierced windows read as depth, not a painted stripe.
 const palace=new T.Group();board.add(palace);palace.position.set(capital.x,.22,capital.z);
 for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.cos(a)*.57,z=Math.sin(a)*.57;
  const column=cyl(palace,.018,.42,ivory,x,.51,z,.023,12);
  const arch=mesh(new T.TorusGeometry(.105,.018,8,16,Math.PI),ivory,palace,x,.71,z);arch.rotation.y=-a;
  const cornice=cyl(palace,.035,.027,gold,x,.74,z,.035,12);
 }
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const pts=[];for(let j=0;j<=16;j++){const t=j/16*Math.PI/2;pts.push([capital.x+Math.cos(a)*Math.cos(t)*.435,1.12+Math.sin(t)*.43,capital.z+Math.sin(a)*Math.cos(t)*.435])}line(board,pts,gold,.009)}
}
const region=['0,0','1,0','0,-1','1,-1'];const edges=new Map();for(const key of region){const t=tiles.get(key);for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6;const b=a+Math.PI/3;const p=[t.x+Math.cos(a)*rad,.245,t.z+Math.sin(a)*rad],q=[t.x+Math.cos(b)*rad,.245,t.z+Math.sin(b)*rad];const code=[`${Math.round(p[0]*1000)},${Math.round(p[2]*1000)}`,`${Math.round(q[0]*1000)},${Math.round(q[2]*1000)}`].sort().join('|');if(edges.has(code))edges.delete(code);else edges.set(code,[p,q])}}
for(const [a,b]of edges.values()){line(inlay,[a,b],dark,.038)}
const selection=new T.Group();ornaments.add(selection);selection.position.set(t1.x,t1.h+.02,t1.z);ring(selection,.48,0,ivory);for(let i=0;i<4;i++){const a=i*Math.PI/2;const o=mesh(new T.OctahedronGeometry(.055),gold,selection,Math.cos(a)*.55,.015,Math.sin(a)*.55);o.scale.y=.3}
cyl(cabinet,3.5,.18,wood,0,-.1,0);ring(cabinet,3.3,.005);figures.push(piece(cabinet,-1.1,0,0,blue,'king',2),piece(cabinet,1.1,0,0,red,'sage',2));
if(simple){const map=new Map();for(const root of [board,cabinet])root.traverse(o=>{if(!o.isMesh||o.parent===life||o.material.transparent)return;if(o.material===gold||o.material===blue||o.material===red||o.material===ivory){if(!map.has(o.material))map.set(o.material,new T.MeshToonMaterial({color:o.material.color,gradientMap:ramp}));o.material=map.get(o.material)}});figures.forEach(p=>p.userData.deco.visible=false);document.querySelector('#ornament').checked=false;ornaments.visible=false}
const title=simple?'The painted world.':'The sovereign’s cabinet.';
document.querySelector('h1').textContent=title;document.querySelector('h2').textContent=simple?'Few shapes. Much life.':'An empire in miniature.';
document.querySelector('aside > p').textContent=simple?'Flat pigments, rounded groves, little houses and drifting clouds. The land carries the colour; the pieces carry the ceremony.':'Dense woodland, weathered stone, terraces, harbours and garden courts. A tiny inhabited world beneath monumental sovereigns.';
document.querySelector('.caption p').textContent=simple?'Pigment, silhouette and a breath of motion.':'A landscape to explore, an object to treasure.';
document.querySelectorAll('[data-direction]').forEach(a=>a.setAttribute('aria-current',a.dataset.direction===direction?'page':'false'));
let motion=true;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduce){motion=false;document.querySelector('#motion').checked=false}
document.querySelector('#motion').onchange=e=>motion=e.target.checked;document.querySelector('#borders').onchange=e=>inlay.visible=e.target.checked;document.querySelector('#ornament').onchange=e=>{ornaments.visible=e.target.checked;figures.forEach(p=>p.userData.deco.visible=e.target.checked)};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const close=b.dataset.view==='pieces';board.visible=!close;cabinet.visible=close;renderer.shadowMap.needsUpdate=true;camera.position.set(...(close?[5,5,9]:[10,12,15]));controls.target.set(0,close?1:0,0);document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelector('#note-title').textContent=close?'02 / The pieces':'01 / The world';document.querySelector('#note').textContent=close?'A lacquered sovereign and an ivory augur. Crown, staff and silhouette remain legible; gilt and astronomical details appear up close.':'Forests, farming villages, roads, an aqueduct and little sails establish a world far smaller than the pieces that command it.';});
const artRenderer=treatment({simple,renderer,scene,camera,board,cabinet,sun});
function resize(){renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();artRenderer.resize(stage.clientWidth,stage.clientHeight)}new ResizeObserver(resize).observe(stage);resize();let previous=0;renderer.setAnimationLoop(time=>{const dt=Math.min((time-previous)/1000,.05);previous=time;if(motion){celestial.rotation.y+=dt*.18;selection.rotation.y+=dt*.08;for(const b of drifters){const a=time*.00009+b.userData.phase;b.position.set(Math.cos(a)*3.8,1.25+Math.sin(a*3)*.13,Math.sin(a)*2.8);b.rotation.y=-a;b.scale.y=.65+Math.sin(time*.006+b.userData.phase)*.35}clouds.forEach((c,i)=>c.position.x=-3+i*1.4+Math.sin(time*.00007+i)*.4)}controls.update();artRenderer.render()});

if(new URLSearchParams(location.search).has("benchmark")){import("./benchmark.js").then(({benchmark})=>benchmark({renderer,scene,camera,controls,board,cabinet,terrain}));}
