import * as T from 'three';

export const siegeVariants=['catapult','trebuchet'];

/** Static tabletop mechanisms; the production unit layer instances the result. */
export function addSiege(kit,type){
 const {mesh,box,cylinder,sphere,rod,ivory,gold,owner,ownerShade,dark,trim,tier,readable}=kit;
 // The readable machine has a thicker frame and arm and a larger stone and weight. `bold` is how much thicker.
 // Its bands take the seat's second colour: more of them in a later age.
 const bold=readable?1.35:1;
 const beam=(name,a,b,width,depth,material=ivory)=>{
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
  const part=box(name,[width,delta.length(),depth],material,0,0,0);
  part.position.copy(start.add(end).multiplyScalar(.5));
  part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return part;
 };
 const axle=(name,y,z)=>rod(name,[-.34,y,z],[.34,y,z],.022,gold,8);
 const wheel=(side,z)=>{
  const x=side*.30,y=.36;
  const disc=cylinder(`${type} enamel wheel ${side} ${z}`,.122,.043,ownerShade,x,y,z,.122,12);disc.rotation.z=Math.PI/2;
  const rim=mesh(`${type} gilt tyre ${side} ${z}`,new T.TorusGeometry(.112,.010,4,12),gold,x+side*.026,y,z);rim.rotation.y=Math.PI/2;
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3;
   rod(`${type} wheel spoke ${side} ${z} ${i}`,[x+side*.029,y,z],[x+side*.029,y+Math.sin(a)*.10,z+Math.cos(a)*.10],.007,ivory,4);
  }
  const hub=cylinder(`${type} ivory hub ${side} ${z}`,.028,.025,ivory,x+side*.035,y,z,.028,8);hub.rotation.z=Math.PI/2;
 };
 for(const side of [-1,1]){
  box(`${type} enamel chassis ${side}`,[.075,.09,.59],owner,side*.21,.345);
  if(readable&&tier>=1)for(const z of [-.075,.075])box(`Trim chassis band ${side} ${z}`,[.085,.100,.055],trim,side*.21,.345,z);
  for(const z of [-.215,.215])wheel(side,z);
 }
 for(const z of [-.215,.215]){
  axle(`${type} wheel axle ${z}`,.36,z);
  box(`${type} ivory cross sill ${z}`,[.43,.06,.065],ivory,0,.395,z);
 }
 if(type==='catapult'){
  // Low torsion bundle, upright padded stop, and a broad spoon in a ready pose.
  axle('Catapult torsion spindle',.48,-.115);
  for(let i=0;i<9;i++)rod(`Catapult rope winding ${i}`,[-.15+i*.038,.436,-.135],[-.15+i*.038,.524,-.095],.013,ivory,6);
  for(const side of [-1,1]){
   beam(`Catapult upright ${side}`,[side*.21,.40,.13],[side*.21,.79,.13],.066*bold,.066*bold,owner);
   if(readable&&tier>=2)box(`Trim upright band ${side}`,[.066*bold+.014,.050,.066*bold+.014],trim,side*.21,.60,.13);
   beam(`Catapult diagonal brace ${side}`,[side*.21,.40,-.24],[side*.21,.74,.13],.037,.037);
   cylinder(`Catapult gilt upright cap ${side}`,.046,.027,gold,side*.21,.80,.13,.046,8);
  }
  box('Catapult padded cross stop',[.49,.085,.095],ownerShade,0,.745,.13);
  if(readable)box('Trim stop binding',[.11,.095,.105],trim,0,.745,.13);
  else box('Catapult ivory stop binding',[.06,.089,.099],ivory,0,.745,.13);
  beam('Catapult single throwing arm',[0,.46,-.115],[0,.93,.255],.062*bold,.062*bold);
  if(readable&&tier>=3)beam('Trim arm band',[0,.60,-.005],[0,.66,.042],.062*bold+.016,.062*bold+.016,trim);
  // An open bowl, with a visible dark recess beneath the faceted stone.
  const bowl=new T.LatheGeometry([[.025,0],[.055,.012],[.105,.05],[.112,.075],[.086,.075],[.075,.049],[.035,.032],[0,.032]].map(p=>new T.Vector2(...p)),12);
  if(readable)bowl.scale(1.3,1.15,1.3);
  mesh('Catapult ivory throwing cup',bowl,ivory,0,.92,.255);
  cylinder('Catapult cup recess',.076*(readable?1.3:1),.008,dark,0,readable?.965:.959,.255,.076*(readable?1.3:1),12);
  sphere('Catapult loaded stone',readable?.092:.067,gold,0,readable?1.025:1.001,.255,8,5);
  axle('Catapult rear windlass',.49,-.24);
  rod('Catapult crank',[-.345,.49,-.24],[-.345,.61,-.24],.015,ivory,6);
  rod('Catapult windlass rope',[0,.49,-.24],[0,.74,.10],.007,gold,4);
 }else if(type==='trebuchet'){
  const pivot=[0,1.065,0],tip=[0,1.53,-.43],short=[0,.885,.165];
  for(const side of [-1,1]){
   for(const z of [-.25,.25])beam(`Trebuchet A-frame ${side} ${z}`,[side*.21,.40,z],[side*.18,1.065,0],.055*bold,.06*bold,owner);
   beam(`Trebuchet lateral tie ${side}`,[side*.21,.62,-.17],[side*.21,.62,.17],.033,.035);
   const pin=cylinder(`Trebuchet pivot cap ${side}`,.057,.03,gold,side*.255,1.065,0,.057,10);pin.rotation.z=Math.PI/2;
  }
  rod('Trebuchet pivot axle',[-.27,1.065,0],[.27,1.065,0],.031,ivory,8);
  beam('Trebuchet long throwing beam',short,tip,.054*bold,.059*bold);
  if(readable&&tier>=2)for(const t of [.42,.80])beam(`Trebuchet trim beam band ${t}`,short.map((v,i)=>v+(tip[i]-v)*(t-.035)),short.map((v,i)=>v+(tip[i]-v)*(t+.035)),.054*bold+.016,.059*bold+.016,trim);
  if(readable&&tier>=3){
   // A small pennant on the frame, in the seat's second colour.
   rod('Trebuchet pennant staff',[.19,1.065,0],[.19,1.33,0],.012,gold,6);
   const flag=new T.Shape([[0,0],[.19,-.02],[.13,-.075],[.19,-.13],[0,-.11]].map(p=>new T.Vector2(...p)));
   mesh('Trim trebuchet pennant',new T.ExtrudeGeometry(flag,{depth:.016,bevelEnabled:false,steps:1}),trim,.19,1.33,-.008);
  }
  box('Trebuchet fulcrum collar',[.079,.082,.079],gold,...pivot);
  // The hinged weight hangs vertically from the short end of the beam.
  for(const side of [-1,1])rod(`Trebuchet weight hanger ${side}`,[side*.08,short[1],short[2]],[side*.08,.81,short[2]],.014,gold,6);
  box('Trebuchet enamel counterweight',readable?[.29,.25,.21]:[.23,.205,.165],ownerShade,0,readable?.70:.72,.165);
  for(const side of [-1,1]){
   if(readable)box(`Trim weight strap ${side}`,[.040,.258,.218],trim,side*.085,.70,.165);
   else box(`Trebuchet ivory weight strap ${side}`,[.025,.212,.171],ivory,side*.072,.72,.165);
  }
  for(const side of [-1,1])rod(`Trebuchet sling rope ${side}`,tip,[side*.055,1.12,-.45],.009*bold,gold,6);
  const sling=sphere('Trebuchet sling pouch',.078*bold,ownerShade,0,1.105,-.45,8,5);sling.scale.set(1,.45,.7);
  sphere('Trebuchet sling stone',.048*bold,ivory,0,1.14+(readable?.012:0),-.45,8,5);
 }else throw new Error(`Unknown siege model ${type}`);
}
