import * as T from 'three';

export const cavalryVariants=['cataphract','knight','knightsTemplar','tangCavalry','chanyuGuard','gendarme','mandekalu'];
export const mountedRangedVariants=['whistlingArrow','xiongnuHorseArcher','camelArcher'];
export const chariotVariants=['chariot','scythedChariot','chariotArcher'];
export const mountedVariants=[...cavalryVariants,...mountedRangedVariants,...chariotVariants];

const plate=(kit,name,points,depth,mat,x=0,y=0,z=0)=>{
 const g=new T.ExtrudeGeometry(new T.Shape(points.map(p=>new T.Vector2(...p))),{depth,steps:1,bevelEnabled:false,curveSegments:1});
 g.translate(0,0,-depth/2);return kit.mesh(name,g,mat,x,y,z);
};

// Equipment stays outside the approved continuous horse silhouette. Armour
// panels sit against its broad lower neck, rather than changing its head.
export function addMountedEquipment(kit,type,bust){
 const {mesh,box,rod,cylinder,sphere,ring,owner,ownerShade,ivory,gold}=kit;
 const lance=(top=1.67,pennant=false)=>{
  rod(`${type} ivory lance`,[.34,.29,.10],[.34,top-.14,.10],.018,ivory,8);
  plate(kit,`${type} lance point`,[[0,0],[-.038,.035],[0,.16],[.038,.035]],.021,gold,.34,top-.15,.10);
  cylinder(`${type} lance grip`,.024,.14,ownerShade,.34,.76,.10,.024,8);
  if(pennant)plate(kit,`${type} forked pennant`,[[0,0],[.18,-.02],[.13,-.09],[.18,-.15],[0,-.13]],.016,owner,.35,top-.23,.10);
 };
 const shield=(cross=false)=>{
  const p=[[-.12,.16],[.12,.16],[.11,-.07],[0,-.21],[-.11,-.07]];
  plate(kit,`${type} shield rim`,p,.027,gold,-.24,.71,.23);
  plate(kit,`${type} enamel shield`,p.map(([x,y])=>[x*.84,y*.84]),.03,ownerShade,-.24,.71,.25);
  if(cross){
   box('Templar ivory vertical cross',[.031,.25,.018],ivory,-.24,.70,.274);
   box('Templar ivory cross arms',[.145,.031,.018],ivory,-.24,.75,.274);
  }else sphere(`${type} shield boss`,.026,ivory,-.24,.71,.278,8,5);
 };
 const barding=(rows=3,quilted=false)=>{
  // Match the original bust's narrowing shoulder width at every height.
  const width=y=>.118*T.MathUtils.lerp(1.63,.83,T.MathUtils.clamp(y/.72,0,1));
  for(const side of [-1,1]){
   const p=plate(kit,`${type} fitted neck armour ${side}`,[[-.16,0],[.14,0],[.14,.33],[-.04,.33]],.012,ownerShade,side*.143,.055,-.06);
   p.rotation.y=Math.PI/2;p.updateMatrix();p.geometry.applyMatrix4(p.matrix);
   p.position.set(0,0,0);p.rotation.set(0,0,0);
   const vertices=p.geometry.getAttribute('position');
   for(let i=0;i<vertices.count;i++)vertices.setX(i,side*(width(vertices.getY(i))+.010)+(vertices.getX(i)-side*.143));
   p.geometry.computeVertexNormals();bust.add(p);
   for(let i=0;i<rows;i++){
    const y=.105+i*.065,x=side*(width(y)+.021);
    const seam=rod(`${type} armour band ${side} ${i}`,[x,y,-.19],[x,y,.075-i*.024],.005,gold,4);bust.add(seam);
   }
   if(quilted)for(let i=0;i<3;i++){
    const seam=rod(`${type} quilt seam ${side} ${i}`,[side*(width(.075)+.021),.075,-.17+i*.07],[side*(width(.34)+.021),.34,-.19+i*.055],.004,ivory,4);bust.add(seam);
   }
  }
 };
 if(mountedRangedVariants.includes(type)){
  if(type==='whistlingArrow'){
   rod('Whistling arrow display shaft',[.32,.78,-.12],[.32,1.59,-.12],.010,gold,6);
   sphere('Whistling arrow hollow bulb',.046,ivory,.32,1.50,-.12,8,5);
   plate(kit,'Whistling arrow leaf',[[0,0],[-.027,.04],[0,.11],[.027,.04]],.015,gold,.32,1.55,-.12);
  }else if(type==='xiongnuHorseArcher'){
   const p=plate(kit,'Steppe saddlecloth',[[-.19,0],[.19,0],[.16,-.15],[0,-.20],[-.16,-.15]],.027,ownerShade,0,.48,.27);
   box('Steppe ivory saddlecloth bar',[.27,.025,.017],ivory,0,.415,.29);
   for(const x of [-.11,0,.11])rod(`Steppe fringe ${x}`,[x,.34,.29],[x,.29,.29],.009,gold,4);
  }else{
   ring('Camel enamel collar',.15,.83,ownerShade,0,-.045,.018);
   box('Camel saddlecloth',[.30,.13,.034],ownerShade,0,.49,.24);
  }
  return;
 }
 if(type==='cataphract'){lance(1.70);barding(4);}
 else if(type==='knight'){lance(1.62);shield();}
 else if(type==='knightsTemplar'){lance(1.62);shield(true);}
 else if(type==='tangCavalry'){lance(1.62,true);barding(3);}
 else if(type==='chanyuGuard'){lance(1.76,true);shield();barding(2);}
 else if(type==='gendarme'){lance(1.84);shield();barding(3);sphere('Gendarme enamel crest',.061,owner,.02,1.41,-.025,8,5).scale.set(.65,1.6,.7);}
 else if(type==='mandekalu'){lance(1.58);barding(3,true);}
 else throw new Error(`Unknown mounted equipment ${type}`);
}

export function addCamelBust(kit,bust){
 const {ivory,gold,dark,rod,box,sphere}=kit;
 // A tall curved neck returning into a compact, blunt head. The broad foot
 // and two low shoulder lobes keep the camel a carved game counter.
 const outline=[[-.23,0],[.22,0],[.12,.16],[.035,.30],[.018,.47],[.075,.66],[.18,.71],[.29,.70],[.32,.76],[.29,.83],[.15,.89],[.035,.88],[-.045,.78],[-.115,.59],[-.15,.40],[-.21,.25]];
 const body=plate(kit,'Continuous ivory camel bust',outline,.22,ivory);
 body.geometry.rotateY(-Math.PI/2);bust.add(body);
 for(const side of [-1,1]){
  const ear=sphere(`Camel small ear ${side}`,.035,ivory,side*.10,.91,.04,8,5);ear.scale.set(.7,1.45,.7);bust.add(ear);
  bust.add(box(`Camel engraved eye ${side}`,[.006,.014,.022],dark,side*.114,.821,.181));
  bust.add(rod(`Camel cheek rein ${side}`,[side*.12,.77,.27],[side*.12,.48,-.01],.009,gold,6));
 }
 const hump=sphere('Camel shoulder hump',.12,ivory,0,.22,-.17,10,6);hump.scale.set(1,1.4,1);bust.add(hump);
}

export function addChariot(kit,type){
 const {box,rod,cylinder,mesh,ring,ivory,owner,ownerShade,gold}=kit;
 // An open two-wheel carriage on the common token base, no tiny rider or
 // horse team. The wheel and curved breastwork are the identifying shapes.
 box('Chariot ivory deck',[.48,.055,.46],ivory,0,.45);
 rod('Chariot axle',[-.38,.43,0],[.38,.43,0],.027,gold,8);
 for(const side of [-1,1]){
  const wheel=cylinder(`Chariot wheel ${side}`,.19,.045,ownerShade,side*.30,.44,0,.19,16);wheel.rotation.z=Math.PI/2;
  const rim=mesh(`Chariot gilt tyre ${side}`,new T.TorusGeometry(.18,.013,4,16),gold,side*.328,.44);rim.rotation.y=Math.PI/2;
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;
   rod(`Chariot spoke ${side} ${i}`,[side*.332,.44,0],[side*.332,.44+Math.sin(a)*.165,Math.cos(a)*.165],.010,ivory,4);
  }
  const hub=cylinder(`Chariot ivory hub ${side}`,.039,.065,ivory,side*.345,.44,0,.039,8);hub.rotation.z=Math.PI/2;
  box(`Chariot side ${side}`,[.033,.22,.33],owner,side*.22,.58,-.01);
  rod(`Chariot rail ${side}`,[side*.22,.70,-.18],[side*.22,.70,.19],.015,gold,6);
  if(type==='scythedChariot')plate(kit,`Chariot scythe ${side}`,[[0,0],[side*.19,.025],[side*.27,.10],[side*.21,-.035],[0,-.04]],.023,ivory,side*.35,.46,.015);
 }
 plate(kit,'Chariot curved breastwork',[[-.24,0],[.24,0],[.23,.20],[.15,.27],[-.15,.27],[-.23,.20]],.035,owner,0,.47,.205);
 box('Chariot breastwork ivory crest',[.26,.025,.02],ivory,0,.714,.231);
 rod('Chariot short drawbar',[0,.44,.24],[0,.34,.49],.027,ivory,8);
 if(type==='chariotArcher'){
  const p=[[-.015,-.28],[.12,-.14],[.15,0],[.12,.14],[-.015,.28]];
  for(let i=0;i<p.length-1;i++)rod(`Chariot bow ${i}`,[.10+p[i][0],.94+p[i][1],0],[.10+p[i+1][0],.94+p[i+1][1],0],.016,gold,6);
  rod('Chariot bowstring',[.085,.66,0],[.085,1.22,0],.005,ivory,4);
  cylinder('Chariot quiver',.052,.23,ownerShade,-.11,.76,-.08,.045,8);
  for(let i=0;i<3;i++)rod(`Chariot arrow ${i}`,[-.13+i*.024,.83,-.08],[-.13+i*.024,1.10,-.08],.006,ivory,4);
 }else{
  rod('Chariot upright spear',[-.11,.46,-.07],[-.11,1.30,-.07],.019,gold,8);
  plate(kit,'Chariot ivory spearhead',[[0,0],[-.04,.035],[0,.17],[.04,.035]],.023,ivory,-.11,1.25,-.07);
 }
}
