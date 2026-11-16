import * as T from 'three';

// Alternate designs for the scout and the settler (the user, 2026-11-15: "Could you come up with a few more alternate
// designs for the scout and the settler?"). `a` is the present piece, built in `primitiveUnitModels.js`. `b`, `c`
// and `d` are built here on the foot pieces' body. The game draws the variant that `UNIT_VARIANTS` names, so nothing
// changes until the user chooses.
export const UNIT_VARIANT_IDS={scout:['a','b','c','d'],settler:['a','b','c','d']};
export const UNIT_VARIANTS={scout:'a',settler:'a'};

// The foot pieces' turned body with a plain ivory head: one body and one height for every piece on foot.
// `at` moves it on the plinth and `shade` gives a second figure the darker enamel.
export function addPawnBody(kit,label,{shade=false}={}){
 const {mesh,cylinder,sphere,ring,owner,ownerShade,ivory,trim}=kit;
 const profile=[[.26,.23],[.27,.3],[.22,.44],[.17,.63],[.2,.85],[.14,.96]];
 return [
  mesh(`${label} turned enamel robe`,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),16),shade?ownerShade:owner),
  cylinder(`${label} hem recess`,.262,.027,ownerShade,0,.263),
  ring(`${label} trim hem`,.267,.293,trim,0,0,.016),
  ring(`${label} trim collar bead`,.146,.963,trim,0,0,.014),
  cylinder(`${label} ivory neck`,.09,.073,ivory,0,.982),
  sphere(`${label} plain ivory head`,.155,ivory,0,1.075),
 ];
}

// A part that is carved with the body. It keeps its size when the piece's tools are made bolder.
const body=part=>{part.userData.body=true;return part};

export function addScoutVariant(kit,variant){
 const {group,mesh,cylinder,sphere,ring,rod,box,owner,ownerShade,ivory,gold,dark,trim}=kit;
 addPawnBody(kit,'Scout');
 if(variant==='b'){
  // A traveller: a wide-brimmed hat, a short cloak over the shoulders and a short walking staff.
  cylinder('Scout short cloak',.262,.250,ownerShade,0,.845,0,.150,12);
  ring('Scout trim cloak edge',.262,.725,trim,0,0,.018);
  // The hat is tipped back on the head, so the face shows under the brim from the board's camera.
  const first=group.children.length;
  cylinder('Scout hat brim',.240,.026,owner,0,.130,0,.240,16);
  cylinder('Scout hat crown',.160,.130,owner,0,.200,0,.118,12);
  ring('Scout trim hat band',.158,.157,trim,0,0,.022);
  const hat=new T.Group();hat.name='Scout tipped hat';hat.position.set(0,1.075,0);hat.rotation.x=-.50;
  for(const part of group.children.slice(first))hat.add(part);
  group.add(hat);
  rod('Scout walking staff',[.319,.230,.035],[.319,1.180,.035],.022,ivory,8);
  cylinder('Scout gilt staff grip',.027,.120,gold,.319,.800,.035,.027,8);
  sphere('Scout round staff knob',.045,ivory,.319,1.205,.035,8,5);
 }else if(variant==='c'){
  // A lookout: a headband, a satchel on a strap and a large spyglass held up to the eye.
  ring('Scout trim headband',.152,1.135,trim,0,0,.018);
  const strap=box('Scout trim satchel strap',[.036,.520,.030],trim,0,.740,.176);strap.rotation.z=.62;body(strap);
  body(box('Scout satchel',[.170,.160,.090],ownerShade,-.170,.560,.160));
  body(box('Scout gilt satchel clasp',[.050,.040,.012],gold,-.170,.590,.210));
  // Three tubes, each wider than the last, with a dark lens at the far end.
  const from=new T.Vector3(.090,1.085,.120),to=new T.Vector3(.560,1.160,.250),at=t=>from.clone().lerp(to,t).toArray();
  body(rod('Scout spyglass eyepiece',at(0),at(.36),.036,gold,8));
  body(rod('Scout spyglass middle tube',at(.34),at(.70),.050,ivory,8));
  body(rod('Scout spyglass great tube',at(.68),at(1),.064,gold,8));
  body(rod('Scout trim spyglass ring',at(.66),at(.72),.070,trim,8));
  body(rod('Scout spyglass dark lens',at(.995),at(1.012),.052,dark,8));
 }else if(variant==='d'){
  // A pathfinder: a headband, a pack and a bedroll on the back, and a lantern on a pole.
  ring('Scout trim headband',.152,1.135,trim,0,0,.018);
  // The rolled blanket crosses the chest, where the board's camera sees it. The pack is on the back.
  const blanket=body(box('Scout ivory blanket roll',[.095,.600,.090],ivory,0,.730,.165));blanket.rotation.z=-.66;
  for(const t of [-.19,.19]){const tie=body(box(`Scout trim blanket tie ${t}`,[.105,.050,.100],trim,Math.sin(.66)*t,.730+Math.cos(.66)*t,.165));tie.rotation.z=-.66}
  box('Scout pack',[.280,.300,.160],ownerShade,0,.770,-.225);
  for(const side of [-1,1])box(`Scout trim pack strap ${side}`,[.044,.310,.170],trim,side*.085,.770,-.225);
  const roll=cylinder('Scout ivory bedroll',.080,.440,ivory,0,.985,-.240,.080,10);roll.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const tie=mesh(`Scout trim bedroll tie ${side}`,new T.TorusGeometry(.082,.014,4,10),trim,side*.125,.985,-.240);tie.rotation.y=Math.PI/2}
  rod('Scout lantern pole',[.319,.230,.035],[.319,1.300,.035],.020,ivory,8);
  cylinder('Scout gilt pole grip',.026,.120,gold,.319,.800,.035,.026,8);
  rod('Scout lantern arm',[.319,1.285,.035],[.440,1.285,.035],.014,gold,6);
  cylinder('Scout gilt lantern cap',.062,.034,gold,.440,1.232,.035,.030,8);
  cylinder('Scout ivory lantern light',.050,.100,ivory,.440,1.165,.035,.050,8);
  cylinder('Scout gilt lantern foot',.062,.026,gold,.440,1.102,.035,.062,8);
 }else throw new Error(`Unknown scout variant ${variant}`);
}

/** The settler's alternates. `b` keeps the present flag, which the caller builds. */
export function addSettlerVariant(kit,variant){
 const {group,mesh,cylinder,sphere,ring,rod,box,owner,ownerShade,ivory,gold,trim}=kit;
 const adult=addPawnBody(kit,'Settler');
 if(variant==='b'){
  // The flag as now, with a sack and a bedroll on the back.
  const sack=sphere('Settler sack',.170,ownerShade,0,.760,-.235,10,6);sack.scale.set(1,1.15,.82);
  ring('Settler trim sack tie',.090,.930,trim,0,-.235,.020);
  const roll=cylinder('Settler ivory bedroll',.075,.420,ivory,0,1.000,-.240,.075,10);roll.rotation.z=Math.PI/2;
 }else if(variant==='c'){
  // A figure beside a loaded barrow, which stands beside the plinth.
  // It is built about its own middle and then set beside the figure, larger, so it shows at the board's distance.
  const first=group.children.length;
  box('Settler barrow tray',[.230,.100,.420],owner,0,.225,.020);
  box('Settler trim barrow rim',[.246,.030,.436],trim,0,.285,.020);
  const wheel=cylinder('Settler barrow wheel',.115,.056,ownerShade,0,.115,.290,.115,12);wheel.rotation.z=Math.PI/2;
  const tyre=mesh('Settler gilt barrow tyre',new T.TorusGeometry(.108,.014,4,12),gold,0,.115,.290);tyre.rotation.y=Math.PI/2;
  for(const side of [-1,1]){
   rod(`Settler barrow handle ${side}`,[side*.085,.235,-.170],[side*.085,.400,-.420],.018,ivory,6);
   rod(`Settler barrow leg ${side}`,[side*.085,.190,-.130],[side*.085,0,-.150],.018,ivory,6);
  }
  // The load: a sack, a crate and a jar.
  sphere('Settler ivory sack',.120,ivory,0,.400,-.060,10,6).scale.set(1,1.1,1);
  box('Settler crate',[.170,.150,.150],ownerShade,0,.375,.130);
  box('Settler trim crate band',[.180,.036,.160],trim,0,.375,.130);
  cylinder('Settler gilt jar',.055,.130,gold,0,.520,.110,.035,8);
  const barrow=body(new T.Group());barrow.name='Settler barrow';barrow.scale.setScalar(1.5);
  // It stands a hair over the ground, so the plinth alone carries the piece, as on every other piece.
  barrow.position.set(.560,.016,0);
  // The settler stands with its back to the board's camera, so the barrow is turned to show its wheel.
  barrow.rotation.y=Math.PI;
  for(const part of group.children.slice(first))barrow.add(part);
  group.add(barrow);
 }else if(variant==='d'){
  // A family: a grown figure and a child on one plinth, with a bundle on a stick over the shoulder.
  for(const part of adult)part.position.x-=.100;
  const first=group.children.length;
  addPawnBody(kit,'Settler child',{shade:true});
  const child=new T.Group();child.name='Settler child';child.scale.setScalar(.68);child.position.set(.235,.23*(1-.68),.070);body(child);
  for(const part of group.children.slice(first))child.add(part);
  group.add(child);
  body(rod('Settler bundle stick',[-.050,.860,.200],[-.300,1.110,-.200],.020,ivory,6));
  const bundle=body(sphere('Settler bundle',.135,ownerShade,-.310,1.050,-.250,10,6));bundle.scale.set(1,1.1,1);
  body(mesh('Settler trim bundle tie',new T.TorusGeometry(.060,.020,4,10),trim,-.300,1.172,-.235)).rotation.x=Math.PI/2;
 }else throw new Error(`Unknown settler variant ${variant}`);
}
