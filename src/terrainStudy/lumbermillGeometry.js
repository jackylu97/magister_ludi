import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {indexGeometry} from './indexGeometry.js';

// An open timber saw shed and a small stack of cut logs. The hand-worked
// silhouette belongs beside the plaster and terracotta kit, without a modern
// circular saw or a waterwheel that would imply a river requirement.
export function createLumbermillGeometry(){
 const wood='#927352',darkWood='#69533e',cutWood='#c5aa79',stone='#b8b49d';
 function colored(geometry,pigment){
  const c=new T.Color(pigment),p=geometry.attributes.position,colors=new Float32Array(p.count*3),uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){colors.set([c.r,c.g,c.b],i*3);uv[i*2]=(p.getX(i)+p.getZ(i)*.37)*2;uv[i*2+1]=(p.getY(i)+p.getZ(i)*.23)*2}
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));return geometry;
 }
 function box(w,h,d,x,y,z,color){const g=new T.BoxGeometry(w,h,d);g.translate(x,y+h/2,z);return colored(g,color)}
 function beam(a,b,width,color){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
  const g=new T.BoxGeometry(width,delta.length(),width);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray());return colored(g,color);
 }
 function merge(parts,name){
  const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());indexGeometry(g);
  g.name=name;g.userData.paintedWorkAsset=name;g.computeBoundingBox();return g;
 }
 const shed=[];
 for(const x of [-.185,.185])for(const z of [-.15,.15]){
  shed.push(box(.062,.045,.060,x,0,z,stone),box(.035,.295,.035,x,.035,z,wood));
  shed.push(beam([x,.225,z],[x*.53,.322,z],.021,darkWood));
 }
 // A low plaster windbreak leaves the front and both working sides open.
 shed.push(box(.355,.12,.026,0,.045,-.17,'#c8c0a1'));
 for(const z of [-.15,.15])shed.push(box(.43,.027,.032,0,.321,z,darkWood));
 for(const x of [-.185,.185])shed.push(box(.034,.026,.34,x,.323,0,wood));
 const roofSlope=Math.atan2(.11,.255),roofLength=Math.hypot(.255,.11);
 for(const side of [-1,1])for(let strip=0;strip<5;strip++){
  const g=new T.BoxGeometry(roofLength,.022,.098);
  g.rotateZ(-side*roofSlope);g.translate(side*.1275,.393,-.196+strip*.098);
  shed.push(colored(g,(strip+Number(side>0))%3===0?'#b46f51':side<0?'#c1805a':'#a96048'));
 }
 shed.push(box(.034,.024,.502,0,.438,0,'#ce9168'));
 // A braced trestle and a long timber waiting beneath a simple frame saw.
 for(const z of [-.11,.10])for(const side of [-1,1])shed.push(beam([side*.084,.047,z],[side*.048,.163,z],.026,darkWood));
 shed.push(box(.19,.033,.25,0,.153,0,cutWood),box(.062,.042,.39,.024,.184,.034,wood));
 for(const x of [-.083,.083])shed.push(box(.018,.165,.018,x,.166,.04,darkWood));
 shed.push(box(.19,.018,.024,0,.316,.04,wood),box(.19,.014,.020,0,.168,.04,wood));
 shed.push(box(.008,.136,.012,0,.181,.04,'#9b9d96'));

 const stock=[];
 // Bark cylinders and inset golden cut ends read as logs even at game zoom.
 for(const [x,y,z,length,radius]of [[-.043,.044,-.014,.39,.039],[.043,.043,.015,.42,.038],[0,.105,0,.35,.036]]){
  const bark=new T.CylinderGeometry(radius*.94,radius,length,7);bark.rotateX(Math.PI/2);bark.translate(x,y,z);stock.push(colored(bark,darkWood));
  for(const side of [-1,1]){
   const end=new T.CylinderGeometry(radius*.81,radius*.81,.003,7);end.rotateX(Math.PI/2);end.translate(x,y,z+side*length*.5);stock.push(colored(end,cutWood));
  }
 }
 for(const z of [-.115,.12])stock.push(box(.19,.022,.037,0,0,z,wood));
 return {lumbermill:merge(shed,'lumbermill'),'lumber-stockpile':merge(stock,'lumber-stockpile')};
}
