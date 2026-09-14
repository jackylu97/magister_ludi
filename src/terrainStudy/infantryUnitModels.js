import * as T from 'three';

// Equipment on the accepted turned warrior pawn. The shared caller supplies
// every material, the untouched robe and face, and the same ground contacts.
export function addInfantryVariant(kit,type){
 const {mesh,cylinder,sphere,ring,box,owner,ownerShade,ivory,gold,dark}=kit;
 const relief=(name,points,depth,material,x,y,z,bevel=.003)=>{
  const geometry=new T.ExtrudeGeometry(new T.Shape(points.map(p=>new T.Vector2(...p))),{
   depth,steps:1,bevelEnabled:bevel>0,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1,
  });
  geometry.translate(0,0,-depth/2);
  return mesh(name,geometry,material,x,y,z);
 };
 const lowHelmet=label=>{
  mesh(`${label} low ivory helmet`,new T.SphereGeometry(.165,12,5,0,Math.PI*2,0,Math.PI/2),ivory,0,1.165,0);
  ring(`${label} gilt brow rim`,.165,1.165,gold,0,0,.007);
 };
 const grip=(label,x=.312,y=.718,z=.04)=>{
  cylinder(`${label} enamel grip`,.020,.116,ownerShade,x,y,z,.020,8);
  sphere(`${label} gilt pommel`,.027,gold,x,y-.075,z,8,5);
 };
 const sword=(label,length=.48,width=.045,guard=.138)=>{
  relief(`${label} pointed ivory blade`,[[-width/2,0],[width/2,0],[width/2,length-.067],[0,length],[-width/2,length-.067]],.023,ivory,.312,.783,.04);
  box(`${label} small gilt crossguard`,[guard,.021,.038],gold,.312,.772,.04);
  grip(label);
 };
 const buckler=label=>{
  const rim=cylinder(`${label} gilt buckler rim`,.113,.027,gold,-.218,.800,.165,.113,10);rim.rotation.x=Math.PI/2;
  const face=cylinder(`${label} enamel buckler`,.096,.030,ownerShade,-.218,.800,.182,.096,10);face.rotation.x=Math.PI/2;
  sphere(`${label} ivory buckler boss`,.024,ivory,-.218,.800,.204,8,5);
 };
 if(type==='swordsman'){
  lowHelmet('Swordsman');
  box('Swordsman narrow gilt nasal',[.017,.115,.015],gold,0,1.125,.174);
  sword('Swordsman');buckler('Swordsman');
 }else if(type==='legionary'){
  lowHelmet('Legionary');
  // A low fore-and-aft crest follows the skull; it is not a tall crown.
  const crest=relief('Legionary restrained enamel crest',[[-.165,0],[-.157,.060],[-.070,.139],[.060,.139],[.160,.052],[.163,0]],.034,ownerShade,0,1.250,-.014);
  crest.rotation.y=Math.PI/2;
  for(const side of [-1,1])box(`Legionary ivory cheek guard ${side}`,[.029,.133,.076],ivory,side*.133,1.072,.085);
  const shield=(name,w,h,depth,material,z)=>{
   const points=[[-w/2,-h/2+.036],[-w/2+.036,-h/2],[w/2-.036,-h/2],[w/2,-h/2+.036],
    [w/2,h/2-.036],[w/2-.036,h/2],[-w/2+.036,h/2],[-w/2,h/2-.036]];
   const part=relief(name,points,depth,material,-.225,.796,z,.006),p=part.geometry.attributes.position;
   for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.035*(1-(p.getX(i)/(w/2))**2));
   part.geometry.computeVertexNormals();return part;
  };
  shield('Legionary broad gilt shield rim',.318,.428,.030,gold,.183);
  shield('Legionary bowed enamel shield',.282,.390,.033,owner,.203);
  const boss=cylinder('Legionary ivory shield boss',.037,.028,ivory,-.225,.796,.256,.037,8);boss.rotation.x=Math.PI/2;
  box('Legionary gilt shield spine',[.017,.342,.012],gold,-.225,.796,.258);
  sword('Legionary gladius',.348,.050,.115);
 }else if(type==='longswordsman'){
  // Enclose the existing ivory head without changing the pawn underneath it.
  cylinder('Longswordsman enclosed ivory helm',.170,.262,ivory,0,1.191,0,.145,8);
  relief('Longswordsman ivory visor',[[-.118,-.099],[.118,-.099],[.136,.046],[.097,.104],[-.097,.104],[-.136,.046]],.021,ivory,0,1.162,.189);
  for(const side of [-1,1])box(`Longswordsman dark visor slit ${side}`,[.083,.020,.005],dark,side*.058,1.184,.204);
  box('Longswordsman gilt visor ridge',[.015,.190,.011],gold,0,1.161,.211);
  ring('Longswordsman low gilt helm edge',.167,1.061,gold,0,0,.006);
  sword('Longswordsman',.626,.046,.170);
  relief('Longswordsman gilt heater rim',[[-.114,.140],[.114,.140],[.104,-.035],[0,-.165],[-.104,-.035]],.030,gold,-.215,.800,.170);
  relief('Longswordsman enamel heater shield',[[-.094,.120],[.094,.120],[.084,-.027],[0,-.140],[-.084,-.027]],.031,ownerShade,-.215,.800,.188);
 }else if(type==='fireLance'){
  lowHelmet('Fire lance');
  // The dark open bore and two collars distinguish a tube from a spear point.
  cylinder('Fire lance upright enamel shaft',.022,1.073,ownerShade,.315,.756,.028,.022,8);
  cylinder('Fire lance ivory tube',.053,.244,ivory,.315,1.380,.028,.053,10);
  for(const y of [1.283,1.475])cylinder(`Fire lance gilt tube collar ${y}`,.058,.022,gold,.315,y,.028,.058,10);
  cylinder('Fire lance dark open bore',.039,.005,dark,.315,1.504,.028,.039,10);
  ring('Fire lance gilt muzzle lip',.048,1.509,gold,.315,.028,.005);
  cylinder('Fire lance gilt shaft binding',.028,.090,gold,.315,.889,.028,.028,8);
  buckler('Fire lance');
 }else if(type==='khopesh'){
  lowHelmet('Khopesh');
  for(const side of [-1,1]){
   const cloth=relief(`Khopesh short enamel temple cloth ${side}`,[[-.047,.072],[.031,.065],[.047,-.117],[-.018,-.141]],.048,ownerShade,side*.141,1.128,-.019,.002);
   cloth.rotation.y=side*Math.PI/2;
  }
  // One thick curved blade with an open inner shoulder reads in silhouette.
  relief('Khopesh curved ivory blade',[[-.019,0],[.019,0],[.025,.198],[.087,.226],[.142,.292],[.164,.377],
   [.141,.450],[.117,.405],[.105,.355],[.076,.326],[.031,.316],[-.016,.322],[-.039,.283],[-.036,.207]],.026,ivory,.295,.783,.040,.003);
  box('Khopesh gilt blade socket',[.064,.025,.037],gold,.295,.777,.040);
  grip('Khopesh',.295);buckler('Khopesh');
 }else if(type==='eagleWarrior'){
  lowHelmet('Eagle warrior');
  // A compact eagle hood: a projecting beak and two swept cheek feathers.
  // The ivory face is still visible below it; there is no articulated rider.
  const beak=relief('Eagle warrior carved ivory beak',[[-.027,.029],[.073,.004],[.119,-.065],[.049,-.033],[-.030,-.013]],.078,ivory,0,1.226,.154,.002);
  beak.rotation.y=-Math.PI/2;
  for(const side of [-1,1]){
   relief(`Eagle warrior swept enamel cheek feather ${side}`,[[-.021,.075],[.073,.112],[.037,.009],[.011,-.084],[-.045,-.042]].map(([x,y])=>[x*side,y]),.055,ownerShade,side*.143,1.204,-.006,.002);
   sphere(`Eagle warrior dark carved eye ${side}`,.015,dark,side*.074,1.227,.135,8,5);
  }
  // A short edged club balances the hood without repeating a straight sword.
  relief('Eagle warrior ivory club',[[-.037,0],[.037,0],[.048,.337],[.030,.373],[-.030,.373],[-.048,.337]],.029,ivory,.313,.788,.040,.003);
  for(const side of [-1,1])for(let i=0;i<4;i++)box(`Eagle warrior incised club edge ${side} ${i}`,[.018,.042,.033],dark,.313+side*.046,.877+i*.063,.040);
  box('Eagle warrior gilt club collar',[.073,.024,.037],gold,.313,.786,.040);
  grip('Eagle warrior',.313);buckler('Eagle warrior');
 }else throw new Error(`Unknown infantry variant ${type}`);
}
