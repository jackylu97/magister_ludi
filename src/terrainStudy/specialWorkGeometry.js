import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';

const stone='#d0c9b2',lightStone='#e0d7bd',shadeStone='#aaa794',plaster='#d9d0b5';
const terra='#b57554',terraLight='#c58a62',terraDark='#96583f',recess='#514f49',gilt='#c5a34d';
const interior='#747b78';

function colored(geometry,pigment){
 if(!geometry.attributes.normal)geometry.computeVertexNormals();
 const color=new T.Color(pigment),p=geometry.attributes.position,colors=new Float32Array(p.count*3),uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  colors.set([color.r,color.g,color.b],i*3);
  uv[i*2]=(p.getX(i)+p.getZ(i)*.37)*2;uv[i*2+1]=(p.getY(i)+p.getZ(i)*.23)*2;
 }
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));return geometry;
}
function box(w,h,d,x,y,z,pigment=stone){const g=new T.BoxGeometry(w,h,d);g.translate(x,y+h/2,z);return colored(g,pigment)}
function cylinder(top,bottom,h,x,y,z,pigment=stone,sides=8,open=false){
 const g=new T.CylinderGeometry(top,bottom,h,sides,1,open);g.translate(x,y+h/2,z);return colored(g,pigment);
}
function pyramid(w,d,h,x,y,z,pigment){return taper(w,d,0,0,h,x,y,z,pigment)}
function taper(w,d,tw,td,h,x,y,z,pigment){
 const v=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-tw/2,h,-td/2],[tw/2,h,-td/2],[tw/2,h,td/2],[-tw/2,h,td/2]];
 const faces=[[0,2,1],[0,3,2],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
 if(tw&&td)faces.push([4,5,6],[4,6,7]);
 // A pointed cap has one triangle per side, not a collapsed second face.
 const good=faces.filter(face=>{
  const [a,b,c]=face.map(i=>new T.Vector3(...v[i]));return b.sub(a).cross(c.sub(a)).lengthSq()>1e-16;
 });
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(good.flatMap(face=>[face[0],face[2],face[1]].flatMap(i=>[v[i][0]+x,v[i][1]+y,v[i][2]+z])),3));return colored(g,pigment);
}
function column(parts,x,z,y,h,r=.037){
 parts.push(box(r*2.65,.026,r*2.65,x,y,z,shadeStone));
 parts.push(cylinder(r*.82,r,h-.062,x,y+.026,z,lightStone,8));
 parts.push(box(r*2.8,.036,r*2.8,x,y+h-.036,z,stone));
}
function arcadeInterior(parts,{w,front,back,y,h}){
 // At the game camera's steep angle, bright portico floors fill the gaps
 // between columns. Muted interior pigment preserves those openings even in
 // the flat daylight preset; the exterior masonry remains pale limestone.
 const floor=new T.PlaneGeometry(w,front-back);floor.rotateX(-Math.PI/2);floor.translate(0,y,(front+back)/2);parts.push(colored(floor,interior));
 const rear=new T.PlaneGeometry(w,h);rear.translate(0,y+h/2,back);parts.push(colored(rear,interior));
}
function arch(parts,x,z,y,w,h,{dark=true,pigment=lightStone,depth=.045}={}){
 const radius=w/2,spring=y+h-radius,thickness=.028;
 if(dark){
  parts.push(box(w,h-radius,.009,x,y,z-.016,recess));
  const disk=new T.CircleGeometry(radius,12,0,Math.PI);disk.translate(x,spring,z-.010);parts.push(colored(disk,recess));
 }
 for(const side of [-1,1])parts.push(box(thickness,spring-y,depth,x+side*(radius+thickness/2),y,z,pigment));
 for(let i=0;i<7;i++){
  const a=(i+.5)*Math.PI/7,r=radius+thickness/2;
  const g=new T.BoxGeometry(2*r*Math.sin(Math.PI/14)+.003,thickness,depth);
  g.rotateZ(a+Math.PI/2);g.translate(x+Math.cos(a)*r,spring+Math.sin(a)*r,z);parts.push(colored(g,i%3===0?stone:pigment));
 }
}
function gable(parts,{x=0,z=0,y,w,d,rise,ridge=false,pediment=false}){
 const half=w/2,slope=Math.hypot(half,rise),pitch=Math.atan2(rise,half);
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const roof=new T.BoxGeometry(slope,.025,d/5+.002);roof.rotateZ(-side*pitch);
  roof.translate(x+side*half/2,y+rise/2,z-d*.4+i*d/5);parts.push(colored(roof,(i+Number(side>0))%3===0?terraLight:side<0?terra:terraDark));
 }
 if(pediment)for(const side of [-1,1]){
  const g=new T.BufferGeometry();
  const points=side>0?[-w/2,0,0,w/2,0,0,0,rise,0]:[w/2,0,0,-w/2,0,0,0,rise,0];
  g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.translate(x,y,z+side*(d/2-.010));parts.push(colored(g,lightStone));
 }
 const cap=new T.CylinderGeometry(.018,.018,d+.022,4);cap.rotateY(Math.PI/4);cap.rotateX(Math.PI/2);cap.translate(x,y+rise+.009,z);parts.push(colored(cap,ridge?gilt:terraLight));
}
function finish(parts,name,court=false){
 const flat=parts.map(part=>{if(!part.index)return part;const g=part.toNonIndexed();part.dispose();return g});
 const geometry=mergeGeometries(flat);flat.forEach(part=>part.dispose());indexGeometry(geometry);
 geometry.name=name;geometry.userData.paintedWorkAsset=name;
 if(court)geometry.userData.paintedCourtRadius=.30;
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function rectangle(w,d,x=0,z=0){return [[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]]}

function academy(){
 const p=[];
 p.push(box(.94,.045,.70,0,0,0,shadeStone),box(.86,.035,.62,0,.045,0,stone));
 p.push(box(.74,.35,.060,0,.08,-.205,plaster));
 for(const x of [-.34,.34])p.push(box(.048,.35,.30,x,.08,-.035,plaster));
 arcadeInterior(p,{w:.627,front:.207,back:-.174,y:.0805,h:.349});
 arch(p,0,-.157,.08,.135,.265,{pigment:shadeStone});
 for(const x of [-.32,-.16,0,.16,.32])column(p,x,.21,.08,.365,.035);
 p.push(box(.87,.038,.59,0,.445,0,stone),box(.92,.025,.64,0,.483,0,lightStone));
 for(let i=0;i<13;i++)p.push(box(.028,.026,.034,-.36+i*.06,.466,.329,shadeStone));
 gable(p,{y:.515,w:.93,d:.665,rise:.165,ridge:true,pediment:true});
 // Carved tympanum tablets and a paired stone bench mark a place of study.
 p.push(box(.092,.036,.008,0,.538,.338,shadeStone));
 for(const side of [-1,1]){
  p.push(box(.12,.022,.055,side*.25,.137,.05,lightStone));
  for(const x of [-.045,.045])p.push(box(.025,.057,.035,side*.25+x,.08,.05,shadeStone));
 }
 return finish(p,'academy');
}

function landmark(){
 const p=[];
 p.push(box(.55,.045,.55,0,0,0,shadeStone),box(.43,.046,.43,0,.045,0,stone),box(.29,.07,.29,0,.091,0,lightStone));
 p.push(taper(.238,.238,.146,.146,.76,0,.161,0,stone));
 p.push(pyramid(.146,.146,.19,0,.921,0,gilt));
 p.push(box(.155,.035,.006,0,.107,.148,recess));
 // Short incised strokes descend the stele; they follow its taper exactly.
 for(const [i,width]of [.059,.033,.069,.042,.055].entries()){
  const y=.29+i*.105,face=.119-(y-.161)/.76*(.119-.073);
  p.push(box(width,.014,.004,0,y,face+.001,shadeStone));
 }
 return finish(p,'landmark');
}

function manufactory(){
 const p=[];
 p.push(box(.94,.045,.66,0,0,0,shadeStone));
 p.push(box(.56,.32,.42,-.16,.045,0,plaster));
 for(const x of [-.435,.115])p.push(box(.035,.345,.46,x,.045,0,stone));
 gable(p,{x:-.16,y:.392,w:.605,d:.49,rise:.12,pediment:true});
 arch(p,-.22,.226,.05,.145,.235);
 p.push(box(.075,.047,.011,-.22,.292,.253,gilt));
 for(const x of [-.395,.035]){
  p.push(box(.073,.091,.012,x,.209,.217,recess));
  p.push(box(.097,.021,.030,x,.19,.224,stone));
 }
 // An open, broad kiln mouth distinguishes the works from a chimneyed hall.
 p.push(cylinder(.108,.165,.62,.306,.045,-.018,terra,10,true));
 for(const y of [.105,.275,.455,.630]){
  const r=.165-(y-.045)/.62*(.165-.108)+.006;
  p.push(cylinder(r,r,.022,.306,y,-.018,terraLight,10));
 }
 const mouth=new T.CircleGeometry(.104,10);mouth.rotateX(-Math.PI/2);mouth.translate(.306,.643,-.018);p.push(colored(mouth,recess));
 const rim=new T.TorusGeometry(.113,.017,4,10);rim.rotateX(Math.PI/2);rim.translate(.306,.667,-.018);p.push(colored(rim,lightStone));
 arch(p,.306,.14,.054,.10,.185,{pigment:terraLight,depth:.028});
 for(const [x,z]of [[-.36,.29],[-.26,.29]])p.push(cylinder(.036,.043,.09,x,.045,z,terraLight,8));
 return finish(p,'manufactory');
}

function customsHouse(){
 const p=[];
 p.push(box(.90,.04,.72,0,0,0,shadeStone),box(.81,.036,.62,0,.04,0,stone));
 // The open lower arcade and three deep eaves retain the warehouse's stack.
 p.push(box(.69,.25,.055,0,.076,-.21,plaster));
 for(const x of [-.35,.35])p.push(box(.045,.25,.39,x,.076,-.005,plaster));
 arcadeInterior(p,{w:.653,front:.235,back:-.181,y:.0765,h:.249});
 for(const x of [-.235,0,.235])arch(p,x,.234,.076,.173,.218,{dark:false});
 p.push(box(.83,.036,.62,0,.325,0,stone));
 p.push(taper(.91,.71,.66,.48,.085,0,.361,0,terra));
 p.push(box(.60,.168,.43,0,.426,0,plaster));
 for(const x of [-.21,0,.21])arch(p,x,.221,.437,.072,.112,{pigment:stone,depth:.018});
 p.push(box(.70,.023,.53,0,.585,0,lightStone),taper(.73,.56,.45,.31,.077,0,.608,0,terraLight));
 p.push(box(.39,.132,.29,0,.666,0,plaster));
 for(const x of [-.125,.125])p.push(box(.066,.067,.01,x,.702,.148,recess));
 p.push(box(.49,.023,.39,0,.792,0,stone),taper(.54,.42,.16,.11,.093,0,.815,0,terra));
 // One directional gilt vane, rather than another pyramid-shaped finial.
 p.push(cylinder(.009,.013,.123,0,.901,0,gilt,6));
 p.push(box(.15,.014,.016,0,1.002,0,gilt));
 const arrow=new T.ConeGeometry(.029,.065,3);arrow.rotateZ(-Math.PI/2);arrow.translate(.092,1.009,0);p.push(colored(arrow,gilt));
 p.push(box(.048,.039,.012,-.054,.978,0,gilt));
 return finish(p,'customsHouse');
}

function citadel(){
 const p=[],supports=[],apothem=.36,radius=apothem/Math.cos(Math.PI/6),run=radius+.012;
 for(let i=0;i<6;i++){
  const a=Math.PI/2+i*Math.PI/3,x=Math.cos(a)*apothem,z=Math.sin(a)*apothem;
  const lengths=i===0?[(run-.25)/2,(run-.25)/2]:[run];
  for(const [j,length]of lengths.entries()){
   const offset=i===0?(j?1:-1)*(.125+length/2):0;
   const yaw=-a-Math.PI/2;
   supports.push(rectangle(length,.102,offset,0).map(([xx,zz])=>[x+xx*Math.cos(yaw)+zz*Math.sin(yaw),z-xx*Math.sin(yaw)+zz*Math.cos(yaw)]));
   for(const [h,y,depth,pigment]of [[.065,0,.102,shadeStone],[.22,.065,.067,stone],[.028,.285,.078,terraLight]]){
    const g=box(length,h,depth,offset,y,0,pigment);g.rotateY(-a-Math.PI/2);g.translate(x,0,z);p.push(g);
   }
   const count=Math.max(1,Math.round(length/.09));
   for(let k=0;k<count;k++){
    const g=box(.039,.050,.078,offset-length/2+(k+.5)*length/count,.313,0,lightStone);
    g.rotateY(-a-Math.PI/2);g.translate(x,0,z);p.push(g);
   }
  }
 }
 for(let i=0;i<6;i++){
  const a=Math.PI/2+(i+.5)*Math.PI/3,x=Math.cos(a)*radius,z=Math.sin(a)*radius;
  supports.push(Array.from({length:6},(_,j)=>[x+Math.sin(j*Math.PI/3)*.083,z+Math.cos(j*Math.PI/3)*.083]));
  p.push(cylinder(.077,.083,.065,x,0,z,shadeStone,6),cylinder(.069,.072,.306,x,.065,z,stone,6));
  p.push(cylinder(.080,.080,.028,x,.371,z,terraLight,6));
  for(let k=0;k<4;k++){
   const b=k*Math.PI/2;p.push(box(.037,.052,.037,x+Math.cos(b)*.049,.399,z+Math.sin(b)*.049,lightStone));
  }
 }
 // The gate arch is open; its one gilt escutcheon sits over the entrance.
 arch(p,0,.36,.022,.25,.26,{dark:false,depth:.080});
 const shield=new T.Shape();shield.moveTo(-.032,0);shield.lineTo(.032,0);shield.lineTo(.027,-.052);shield.lineTo(0,-.069);shield.lineTo(-.027,-.052);shield.closePath();
 const badge=new T.ExtrudeGeometry(shield,{depth:.01,bevelEnabled:false});badge.translate(0,.376,.407);p.push(colored(badge,gilt));
 const geometry=finish(p,'citadel',true);geometry.userData.supportFootprints=supports;return geometry;
}

function holySite(){
 const p=[],supports=[],radius=.407;
 // Separate bases leave the inner ground available
 // for a standing unit. The altar occupies the gap between the rear stones.
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=Math.cos(a)*radius,z=Math.sin(a)*radius,h=[.59,.67,.57,.63,.58,.65][i];
  supports.push(rectangle(.135,.135,x,z));
  p.push(box(.135,.035,.135,x,0,z,shadeStone));
  const monolith=new T.CylinderGeometry(.056,.078,h,4);monolith.rotateY(a+Math.PI/4);monolith.rotateZ((i%2?1:-1)*.018);monolith.translate(x,.035+h/2,z);p.push(colored(monolith,i%2?stone:lightStone));
  const cap=new T.BoxGeometry(.084,.026,.084);cap.rotateY(a);cap.translate(x,.035+h,z);p.push(colored(cap,terraLight));
 }
 p.push(box(.19,.125,.115,0,0,-.38,stone),box(.218,.032,.132,0,.125,-.38,lightStone));
 supports.push(rectangle(.19,.115,0,-.38));
 p.push(box(.083,.052,.005,0,.037,-.32,recess));
 p.push(cylinder(.045,.058,.036,0,.157,-.38,terra,8));
 // A single low votive flame is distinct from the landmark's tall gilt cap.
 const flame=new T.ConeGeometry(.036,.132,5);flame.translate(0,.255,-.38);p.push(colored(flame,gilt));
 const geometry=finish(p,'holySite',true);geometry.userData.supportFootprints=supports;return geometry;
}

/** Deterministic shared sculpt kit. Each returned geometry belongs to caller. */
export function createSpecialWorkGeometry(){
 return {academy:academy(),landmark:landmark(),manufactory:manufactory(),customsHouse:customsHouse(),citadel:citadel(),holySite:holySite()};
}
