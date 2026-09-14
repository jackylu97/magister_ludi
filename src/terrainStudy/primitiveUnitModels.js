import {faithVariants,addFaithEquipment,addJourneyCargo} from './faithUnitModels.js';
import {addNaval,navalVariants} from './navalUnitModels.js';
import * as T from 'three';
import {addSiege,siegeVariants} from './siegeUnitModels.js';
import {addGreatPerson} from './greatPersonModel.js';
import {addWarElephant} from './warElephantModel.js';
import {addMountedEquipment,addCamelBust,addChariot,mountedVariants,mountedRangedVariants,chariotVariants} from './mountedUnitModels.js';
import {addInfantryVariant} from './infantryUnitModels.js';
import {addPolearmRangedVariant,polearmVariants,rangedVariants} from './polearmRangedModels.js';

// The original memory-table figures: concentric enamel plinths, turned robes,
// ivory faces and a few gilt marks. Unit identity lives in the finial/tool.
export function createPrimitiveUnitScene(type,{family='scholar'}={}){
 const mounted=mountedVariants.includes(type);
 const infantry=['swordsman','legionary','longswordsman','fireLance','khopesh','eagleWarrior'].includes(type);
 const equipment=polearmVariants.includes(type)||rangedVariants.includes(type);
 if(type!=='embarked'&&!faithVariants.includes(type)&&type!=='rihlaCaravan'&&!navalVariants.includes(type)&&!siegeVariants.includes(type)&&!mounted&&!infantry&&!equipment&&!['warrior','spearman','horseman','archer','horseArcher','worker','prophet','scout','settler','trader','greatPerson','warElephant'].includes(type))throw new Error(`Unknown primitive unit ${type}`);
 const group=new T.Group();group.name=`Primitive chess ${type}`;group.scale.setScalar(.72);
 const material=(name,color)=>{const m=new T.MeshStandardMaterial({color,roughness:.8,metalness:0});m.name=name;return m};
 const owner=material('Owner enamel','#ffffff'),ownerShade=material('Owner turned recess','#c3c5c6');
 const ivory=material('Warm ivory','#e8d8b2'),gold=material('Antique gold','#b69045'),dark=material('Incised detail','#303d42');
 const mesh=(name,geometry,m,x=0,y=0,z=0)=>{
  const o=new T.Mesh(geometry,m);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;
 };
 const cylinder=(name,r,h,m,x,y,z=0,top=r,n=16)=>mesh(name,new T.CylinderGeometry(top,r,h,n),m,x,y,z);
 const sphere=(name,r,m,x,y,z=0,w=12,h=8)=>{
  const geometry=new T.SphereGeometry(r,w,h).toNonIndexed();geometry.computeVertexNormals();
  return mesh(name,geometry,m,x,y,z);
 };
 const ring=(name,r,y,m=gold,x=0,z=0,tube=.008)=>{
  const o=mesh(name,new T.TorusGeometry(r,tube,4,16),m,x,y,z);o.rotation.x=Math.PI/2;return o;
 };
 const rod=(name,a,b,r,m=gold,n=6)=>{
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
  const o=mesh(name,new T.CylinderGeometry(r,r,delta.length(),n),m);
  o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
 };
 const box=(name,size,m,x,y,z=0)=>mesh(name,new T.BoxGeometry(...size),m,x,y,z);
 const ivoryFace=(y=1.075)=>{
  sphere('Faceted ivory face',.145,ivory,0,y);
  const nose=mesh('Small carved nose',new T.ConeGeometry(.027,.072,4),ivory,0,y-.013,.145);nose.rotation.x=Math.PI/2;
 };
 const augurCap=()=>{
  mesh('Simple augur cap',new T.ConeGeometry(.166,.307,8),ivory,0,1.279);
  ring('Gilt cap brim',.162,1.135,gold,0,0,.008);
 };
 const bowAndQuiver=(mounted=false)=>{
  const x=mounted?.34:.223,y=mounted?.835:.974,z=mounted?.08:.155;
  // The bent stave and one uninterrupted string make a legible bow symbol.
  const stave=[[-.014,-.279],[.073,-.208],[.126,-.110],[.143,0],[.126,.110],[.073,.208],[-.014,.279],
   [.009,.250],[.055,.191],[.100,.098],[.117,0],[.100,-.098],[.055,-.191],[.009,-.250]];
  const geometry=new T.ExtrudeGeometry(new T.Shape(stave.map(p=>new T.Vector2(...p))),{depth:.018,steps:1,bevelEnabled:false,curveSegments:1});
  geometry.translate(0,0,-.009);
  mesh('Curved gilt bow',geometry,gold,x,y,z);
  rod('Taut ivory bowstring',[x-.014,y-.279,z],[x-.014,y+.279,z],.004,ivory,4);
  box('Enamel bow grip',[.035,.088,.032],ownerShade,x+.130,y,z);
  const qx=mounted?-.184:-.215,qy=mounted?.625:.797,qz=mounted?-.074:-.027;
  cylinder('Small enamel quiver',.047,.257,ownerShade,qx,qy,qz,.044,8);
  ring('Gilt quiver mouth',.048,qy+.130,gold,qx,qz,.005);
  for(let i=0;i<3;i++){
   const ax=qx+(i-1)*.024,az=qz+(i%2)*.021-.011,top=qy+.252+(i%2)*.037;
   rod(`Quiver arrow shaft ${i}`,[ax,qy+.108,az],[ax,top,az],.0045,gold,4);
   const feather=box(`Ivory arrow fletching ${i}`,[.024,.046,.006],ivory,ax,top-.013,az);feather.rotation.z=-.25;
  }
 };

 // Shared stepped plinth from mockups/memory-table/study-01.js.
 if(type!=='embarked'&&type!=='trader'&&type!=='rihlaCaravan'&&!navalVariants.includes(type)){
  cylinder('Gilt plinth',.37,.09,gold,0,.045,0,.37,24);
  cylinder('Enamel base',.32,.12,owner,0,.13,0,.32,24);
  cylinder('Ivory base bead',.29,.045,ivory,0,.21,0,.29,24);
 }
 const kit={group,mesh,cylinder,sphere,ring,rod,box,owner,ownerShade,ivory,gold,dark};
 if(type==='embarked'||navalVariants.includes(type))addNaval(kit,type);
 else if(siegeVariants.includes(type))addSiege(kit,type);
 else if(chariotVariants.includes(type))addChariot(kit,type);
 else if(type==='greatPerson')addGreatPerson(kit,family);
 else if(type==='warElephant')addWarElephant(kit);
 else if(type==='scout'){
  // A full-sized military pawn in one carved hooded mantle. The open front
  // preserves the ivory face and turned body without adding human limbs.
  const profile=[[.26,.23],[.27,.3],[.22,.44],[.17,.63],[.2,.85],[.14,.96]];
  mesh('Scout turned enamel stem',new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),16),owner);
  cylinder('Scout hem recess',.262,.027,ownerShade,0,.263);
  ring('Scout gilt hem',.267,.293);
  ring('Scout collar bead',.146,.963,gold,0,0,.009);
  cylinder('Scout ivory neck',.09,.073,ivory,0,.982);
  sphere('Scout ivory pawn finial',.155,ivory,0,1.075);
  // y, shoulder width, depth, rearward offset, opening half-angle. Broad
  // folds spread at the hem and taper into a small rearward hood peak.
  const mantleProfile=[
   [.326,.281,.273,0,.74],[.460,.249,.249,0,.68],
   [.657,.204,.205,-.006,.65],[.850,.231,.226,-.012,.57],
   [.949,.198,.187,-.013,.48],[1.076,.201,.176,-.024,.80],
   [1.191,.179,.165,-.032,.77],[1.275,.111,.115,-.064,.39],
   [1.326,.019,.023,-.100,.12],
  ];
  const mantlePositions=[],outer=[],inner=[],sides=12;
  const triangle=(a,b,c)=>mantlePositions.push(...a,...b,...c);
  const quad=(a,b,c,d)=>{triangle(a,b,c);triangle(a,c,d)};
  for(const [y,rx,rz,cz,gap] of mantleProfile){
   const row=[],lining=[];
   for(let i=0;i<=sides;i++){
    const a=gap+(Math.PI*2-gap*2)*i/sides;
    const fold=y<.96?((i%2===0)?.010:-.007)*(1-(y-.326)*.6):0;
    const hem=y===.326?Math.cos(a*3)*.018:0;
    row.push([Math.sin(a)*(rx+fold),y+hem,cz+Math.cos(a)*(rz+fold)]);
    lining.push([Math.sin(a)*Math.max(.003,rx+fold-.014),y+hem,cz+Math.cos(a)*Math.max(.003,rz+fold-.014)]);
   }
   outer.push(row);inner.push(lining);
  }
  for(let r=0;r<outer.length-1;r++){
   for(let i=0;i<sides;i++){
    quad(outer[r][i],outer[r][i+1],outer[r+1][i+1],outer[r+1][i]);
    quad(inner[r][i+1],inner[r][i],inner[r+1][i],inner[r+1][i+1]);
   }
   quad(outer[r][0],outer[r+1][0],inner[r+1][0],inner[r][0]);
   quad(outer[r+1][sides],outer[r][sides],inner[r][sides],inner[r+1][sides]);
  }
  for(let i=0;i<sides;i++){
   quad(outer[0][i+1],outer[0][i],inner[0][i],inner[0][i+1]);
   const top=outer.length-1;
   quad(outer[top][i],outer[top][i+1],inner[top][i+1],inner[top][i]);
  }
  const mantle=new T.BufferGeometry();mantle.setAttribute('position',new T.Float32BufferAttribute(mantlePositions,3));mantle.computeVertexNormals();
  mesh('Scout continuous carved hood and cloak',mantle,ownerShade);
  rod('Scout gilt cloak clasp',[-.085,.943,.157],[.085,.943,.157],.008,gold,6);
  sphere('Scout small ivory cloak fastening',.020,ivory,0,.943,.163,8,5);
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3+Math.PI/6,s=Math.sin(angle),c=Math.cos(angle);
   rod(`Scout gilt piping ${i}`,[s*.245,.34,c*.245],[s*.174,.627,c*.174],.0055);
  }
  rod('Scout upright ivory staff',[.319,.230,.035],[.319,1.390,.035],.020,ivory,8);
  cylinder('Scout gilt staff grip',.025,.125,gold,.319,.866,.035,.025,8);
  cylinder('Scout gilt staff ferrule',.023,.066,gold,.319,.261,.035,.023,8);
  sphere('Scout round staff finial',.040,ivory,.319,1.420,.035,8,5);
 }else if(type==='settler'){
  // A plain pawn carrying a folded banner, held clear above its head.
  const profile=[[.26,.23],[.275,.31],[.23,.45],[.17,.64],[.135,.79],[.135,.85]];
  mesh('Settler turned enamel stem',new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),16),owner);
  cylinder('Settler hem recess',.262,.027,ownerShade,0,.263);
  ring('Settler gilt hem',.267,.293);
  ring('Settler collar bead',.140,.845,gold,0,0,.009);
  cylinder('Settler ivory neck',.09,.073,ivory,0,.862);
  sphere('Settler plain ivory pawn finial',.160,ivory,0,.950);
  rod('Settler upright ivory flagpole',[.300,.230,.060],[.300,1.510,.060],.018,ivory,8);
  cylinder('Settler gilt flagpole grip',.023,.109,gold,.300,.770,.060,.023,8);
  sphere('Settler gilt flagpole finial',.032,gold,.300,1.538,.060,8,5);
  // Three broad bent planes give the swallowtail a deliberate cloth fold.
  // Both sides and the narrow edge are real faces, so the flag reads when
  // viewed from behind without relying on a double-sided source material.
  const flagColumns=[
   {x:.310,z:.060,top:1.479,bottom:1.242},
   {x:.427,z:.095,top:1.465,bottom:1.231},
   {x:.549,z:.053,top:1.482,bottom:1.253},
  ];
  const flagPositions=[],thickness=.007;
  const flagTriangle=(a,b,c)=>flagPositions.push(...a,...b,...c);
  const flagFace=(a,b,c,d)=>{flagTriangle(a,b,c);flagTriangle(a,c,d)};
  const top=flagColumns.map(c=>[c.x,c.top,c.z]),bottom=flagColumns.map(c=>[c.x,c.bottom,c.z]);
  const polygon=[...top,[.672,1.463,.069],[.593,1.357,.064],[.672,1.278,.069],...bottom.slice().reverse()];
  const front=p=>[p[0],p[1],p[2]+thickness/2],back=p=>[p[0],p[1],p[2]-thickness/2];
  for(let i=0;i<flagColumns.length-1;i++){
   flagFace(front(bottom[i]),front(bottom[i+1]),front(top[i+1]),front(top[i]));
   flagFace(back(top[i]),back(top[i+1]),back(bottom[i+1]),back(bottom[i]));
  }
  const tailTop=polygon[3],notch=polygon[4],tailBottom=polygon[5];
  for(const side of [1,-1]){
   const p=side===1?front:back;
   const tri=(a,b,c)=>side===1?flagTriangle(p(a),p(b),p(c)):flagTriangle(p(c),p(b),p(a));
   tri(bottom[2],notch,top[2]);tri(top[2],notch,tailTop);tri(bottom[2],tailBottom,notch);
  }
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length];
   flagFace(front(a),back(a),back(b),front(b));
  }
  const flag=new T.BufferGeometry();flag.setAttribute('position',new T.Float32BufferAttribute(flagPositions,3));flag.computeVertexNormals();
  mesh('Settler folded enamel swallowtail flag',flag,owner);
  for(let i=0;i<top.length-1;i++)rod(`Settler gilt flag upper seam ${i}`,top[i],top[i+1],.005,gold,4);
  rod('Settler gilt flag fly seam',top[2],tailTop,.005,gold,4);
 }else if(type==='trader'||type==='rihlaCaravan'){
  // A freestanding wagon. Its four wheels supply the actual ground contacts;
  // there is no token base or display stand beneath the carriage.
  box('Caravan ivory floor',[.500,.070,.638],ivory,0,.525);
  for(const sign of [-1,1]){
   box(`Enamel wagon side ${sign}`,[.035,.156,.580],owner,sign*.234,.630);
   box(`Gilt wagon rail ${sign}`,[.041,.022,.600],gold,sign*.234,.713);
   rod(`Ivory wagon axle ${sign}`,[-.339,.545,sign*.213],[.339,.545,sign*.213],.027,ivory,8);
   for(const side of [-1,1]){
    const x=side*.315,z=sign*.213;
    const wheel=cylinder(`Caravan enamel wheel ${side} ${sign}`,.132,.050,ownerShade,x,.545,z,.132,12);wheel.rotation.z=Math.PI/2;
    const tyre=mesh(`Gilt wheel rim ${side} ${sign}`,new T.TorusGeometry(.118,.011,4,12),gold,side*.345,.545,z);tyre.rotation.y=Math.PI/2;
    for(let spoke=0;spoke<4;spoke++){
     const a=spoke*Math.PI/2;
     rod(`Wheel spoke ${side} ${sign} ${spoke}`,[side*.346,.545,z],[side*.346,.545+Math.cos(a)*.108,z+Math.sin(a)*.108],.008,gold,4);
    }
    const hub=cylinder(`Ivory wheel hub ${side} ${sign}`,.034,.023,ivory,side*.353,.545,z,.034,8);hub.rotation.z=Math.PI/2;
   }
  }
  // One faceted barrel cover gives the wagon a strong arched silhouette.
  const canopyOutline=[[-.224,0],[-.224,.065]];
  for(let i=1;i<=8;i++){const a=Math.PI-i*Math.PI/8;canopyOutline.push([Math.cos(a)*.224,.065+Math.sin(a)*.207])}
  canopyOutline.push([.224,0]);
  const canopy=new T.ExtrudeGeometry(new T.Shape(canopyOutline.map(p=>new T.Vector2(...p))),{depth:.548,steps:1,bevelEnabled:false,curveSegments:1});canopy.translate(0,0,-.274);
  mesh('Faceted ivory wagon cover',canopy,ivory,0,.702);
  for(const z of [-.271,0,.271]){
   for(let i=0;i<8;i++){
    const a=Math.PI-i*Math.PI/8,b=Math.PI-(i+1)*Math.PI/8;
    rod(`Gilt canopy bow ${z} ${i}`,[Math.cos(a)*.227,.767+Math.sin(a)*.211,z],[Math.cos(b)*.227,.767+Math.sin(b)*.211,z],.005,gold,4);
   }
  }
  const openingOutline=[[-.130,0],[-.130,.054]];
  for(let i=1;i<=6;i++){const a=Math.PI-i*Math.PI/6;openingOutline.push([Math.cos(a)*.130,.054+Math.sin(a)*.138])}
  openingOutline.push([.130,0]);
  mesh('Dark caravan entrance',new T.ShapeGeometry(new T.Shape(openingOutline.map(p=>new T.Vector2(...p)))),dark,0,.703,.275);
  box('Ivory cargo chest',[.165,.107,.089],ivory,-.035,.718,.283);
  box('Enamel chest band',[.020,.110,.093],ownerShade,-.035,.718,.286);
  box('Gilt chest clasp',[.035,.027,.006],gold,-.035,.727,.335);
  // Proportional scale keeps it a low carriage about .61 world units wide.
  // The old wheel datum was .545 with a .132 radius; put its tyres at y=0.
  if(type==='rihlaCaravan')addJourneyCargo(kit);
  for(const part of group.children)part.position.y-=.413;
  group.scale.setScalar(.84);
 }else if(type==='horseman'||type==='horseArcher'||mounted){
  // A knight is one continuous bust on a low turned seat. Its broad foot
  // grows into the neck; it does not reuse the standing figures' robe/stem.
  const seat=[[.26,.23],[.27,.29],[.265,.33],[.295,.38],[.315,.40],[.315,.43]];
  mesh('Low enamel knight seat',new T.LatheGeometry(seat.map(p=>new T.Vector2(...p)),16),owner);
  cylinder('Solid enamel socket',.315,.025,owner,0,.417);
  cylinder('Seat recess',.262,.022,ownerShade,0,.264);
  ring('Gilt seat bead',.266,.294);
  ring('Gilt socket rim',.315,.425,gold,0,0,.006);
  const emblem=box('Knight seat insignia',[.035,.035,.011],gold,0,.350,.280);emblem.rotation.z=Math.PI/4;
  const firstHeadPart=group.children.length;
  if(type!=='camelArcher'){
  const outline=new T.Shape([
   [.220,0],[-.220,0],[-.241,.10],[-.235,.25],[-.225,.43],
   [-.197,.63],[-.146,.77],[-.080,.849],[-.026,.872],
   [.042,.854],[.103,.797],[.182,.711],[.243,.636],
   [.248,.589],[.198,.568],[.123,.609],[.067,.561],
   [.051,.455],[.084,.303],[.151,.145],
  ].map(p=>new T.Vector2(...p)));
  const carved=new T.ExtrudeGeometry(outline,{depth:.20,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.023,bevelThickness:.018,curveSegments:1});
  carved.translate(0,0,-.10);carved.rotateY(-Math.PI/2);
  // Fuller across the shoulders/foot, narrowing into the carved cheeks.
  const positions=carved.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   const t=T.MathUtils.clamp(positions.getY(i)/.72,0,1);
   positions.setX(i,positions.getX(i)*T.MathUtils.lerp(1.63,.83,t));
  }
  carved.computeVertexNormals();
  mesh('Continuous ivory knight bust',carved,ivory);
  for(const sign of [-1,1]){
   const ear=mesh(`Small knight ear ${sign}`,new T.ConeGeometry(.030,.126,4),ivory,sign*.047,.899,-.035);ear.rotation.x=-.10;
   const eye=box(`Engraved eye ${sign}`,[.005,.011,.029],dark,sign*.100,.771,.077);eye.rotation.x=-.25;
  }
  rod('Gilt mane lower',[0,.12,-.262],[0,.43,-.248],.008,gold);
  rod('Gilt mane middle',[0,.43,-.248],[0,.63,-.220],.008,gold);
  rod('Gilt mane crest',[0,.63,-.220],[0,.77,-.169],.008,gold);
  }
  const headParts=group.children.slice(firstHeadPart),bust=new T.Group();bust.name='Integrated chess knight';bust.position.y=.415;bust.rotation.y=-.8;group.add(bust);
  for(const part of headParts)bust.add(part);
  if(type==='camelArcher')addCamelBust(kit,bust);
  if(type==='horseArcher'||mountedRangedVariants.includes(type))bowAndQuiver(true);
  if(mounted)addMountedEquipment(kit,type,bust);
  else if(type!=='horseArcher'){
   const blade=new T.Shape([[-.025,0],[.025,0],[.025,.475],[0,.560],[-.025,.475]].map(p=>new T.Vector2(...p)));
   const sword=new T.ExtrudeGeometry(blade,{depth:.021,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.003,bevelThickness:.003,curveSegments:1});
   mesh('Cavalry upright ivory sword',sword,ivory,.365,.835,.119);
   box('Cavalry gilt crossguard',[.152,.025,.041],gold,.365,.823,.130);
   cylinder('Cavalry enamel sword grip',.022,.132,ownerShade,.365,.743,.130,.022,8);
   sphere('Cavalry gilt sword pommel',.032,gold,.365,.665,.130,8,5);
  }
 }else{
  const worker=type==='worker';
  const profile=worker?[[.26,.23],[.275,.31],[.23,.45],[.17,.64],[.135,.79],[.135,.85]]:[[.26,.23],[.27,.3],[.22,.44],[.17,.63],[.2,.85],[.14,.96]];
  mesh('Turned enamel robe',new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),16),owner);
  cylinder('Hem shadow',.262,.027,ownerShade,0,.263);
  ring('Gilt hem',.267,.293);
  ring('Small collar bead',worker?.140:.146,worker?.845:.963,gold,0,0,.009);
  cylinder('Ivory neck',.09,.073,ivory,0,worker?.862:.982);
  // Six restrained lines describe the turned robe instead of separate limbs.
  for(let i=0;i<(worker?0:6);i++){
   const angle=i*Math.PI/3+Math.PI/6,s=Math.sin(angle),c=Math.cos(angle);
   rod(`Gilt piping ${i}`,[s*.245,.34,c*.245],[s*.174,.627,c*.174],.0055);
  }
  if(!worker){const emblem=box('Single diamond insignia',[.04,.04,.011],gold,0,.795,.195);emblem.rotation.z=Math.PI/4}
  if(worker)sphere('Plain ivory pawn finial',.160,ivory,0,.950);
  else ivoryFace();
  if(type==='warrior'||type==='spearman'||type==='archer'||equipment)augurCap();
  if(faithVariants.includes(type))addFaithEquipment(kit,type);
  else if(equipment)addPolearmRangedVariant(kit,type);
  else if(infantry)addInfantryVariant(kit,type);
  else if(type==='warrior'){
   // A single stout wooden club identifies the earliest infantry counter.
   // Its broad faceted head reads at game scale without spikes or a shield.
   const wood=material('Warm tool wood','#98754b');
   const club=new T.Group();club.name='Warrior simple club';club.position.set(.306,.611,.045);club.rotation.z=-.085;group.add(club);
   const profile=[[0,0],[.028,0],[.032,.050],[.027,.120],[.031,.238],[.049,.309],[.075,.376],[.084,.472],[.069,.557],[.036,.599],[0,.604]];
   club.add(mesh('Warrior carved wooden club',new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),10),wood));
   for(const y of [.108,.177])club.add(ring(`Warrior ivory grip binding ${y}`,.030,y,ivory,0,0,.004));
  }else if(type==='spearman'){
   cylinder('Upright spear',.019,1.245,gold,.319,.827,0,.019,8);
   const point=mesh('Ivory spear point',new T.ConeGeometry(.049,.195,4),ivory,.319,1.528);point.scale.z=.43;
   cylinder('Spear socket',.027,.052,dark,.319,1.442,0,.027,8);
  }else if(type==='archer'){
   bowAndQuiver();
  }else if(type==='worker'){
   // The worker is a plain pawn; the single pickaxe supplies its role.
   const wood=material('Warm tool wood','#98754b');
   rod('Wooden pickaxe haft',[.282,.292,.088],[.340,1.135,.088],.017,wood,8);
   const pick=new T.Shape([[-.145,-.065],[-.095,-.018],[-.025,.006],[.030,.010],[.108,-.014],[.145,-.061],[.090,-.042],[.021,-.025],[-.024,-.029],[-.090,-.042]].map(p=>new T.Vector2(...p)));
   const pickGeometry=new T.ExtrudeGeometry(pick,{depth:.036,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.005,bevelThickness:.004,curveSegments:1});
   mesh('Carved ivory pickaxe head',pickGeometry,ivory,.340,1.130,.070);
   box('Pickaxe binding',[.043,.045,.053],gold,.339,1.112,.088);
  }else if(type==='prophet'){
   // An ivory mitre, closed book and solar staff give a quiet votive silhouette.
   const mitre=new T.Shape([[-.146,1.137],[.146,1.137],[.125,1.305],[0,1.453],[-.125,1.305]].map(p=>new T.Vector2(...p)));
   const mitreGeometry=new T.ExtrudeGeometry(mitre,{depth:.187,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.008,bevelThickness:.008,curveSegments:1});
   mesh('Faceted ivory mitre',mitreGeometry,ivory,0,0,-.0935);
   box('Gilt mitre band',[.281,.023,.010],gold,0,1.167,.103);
   const seal=box('Solar mitre seal',[.033,.033,.012],gold,0,1.276,.105);seal.rotation.z=Math.PI/4;
   box('Book ivory pages',[.157,.206,.067],ivory,-.221,.765,.156);
   box('Book enamel front cover',[.183,.230,.014],ownerShade,-.221,.765,.198);
   box('Book enamel back cover',[.183,.230,.014],ownerShade,-.221,.765,.114);
   box('Gilt book spine',[.020,.231,.094],gold,-.307,.765,.156);
   const bookSeal=box('Book diamond seal',[.037,.037,.009],gold,-.221,.765,.211);bookSeal.rotation.z=Math.PI/4;
   rod('Solar staff shaft',[.306,.286,.005],[.306,1.363,.005],.014,gold,8);
   mesh('Open solar staff halo',new T.TorusGeometry(.091,.012,4,16),gold,.306,1.442,.005);
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4,s=Math.sin(a),c=Math.cos(a);
    rod(`Solar staff ray ${i}`,[.306+s*.101,1.442+c*.101,.005],[.306+s*.139,1.442+c*.139,.005],.006,gold,4);
   }
   sphere('Solar staff ivory heart',.029,ivory,.306,1.442,.005,8,5);
  }
 }
 return group;
}
