import * as T from 'three';

export const polearmVariants=['phalanx','spearWall','pikeman','fubing','ponticPeltast'];
export const rangedVariants=['bowman','compositeBowman','crossbowman','slinger'];

// Equipment only. The caller retains the approved pawn, ivory face and cap.
export function addPolearmRangedVariant(kit,type){
 const {mesh,cylinder,sphere,ring,rod,box,owner,ownerShade,ivory,gold,dark}=kit;
 const relief=(name,points,depth,material,x,y,z)=>{
  const g=new T.ExtrudeGeometry(new T.Shape(points.map(p=>new T.Vector2(...p))),{
   depth,steps:1,bevelEnabled:false,curveSegments:1,
  });g.translate(0,0,-depth/2);return mesh(name,g,material,x,y,z);
 };
 const spear=(label,top=1.63,blade=.17)=>{
  rod(`${label} ivory shaft`,[.31,.27,.035],[.31,top-blade,.035],.016,ivory,8);
  cylinder(`${label} gilt grip`,.022,.115,gold,.31,.80,.035,.022,8);
  relief(`${label} gilt leaf point`,[[0,0],[-.047,blade*.36],[0,blade],[.047,blade*.36]],.022,gold,.31,top-blade,.035);
 };
 const shield=(label,points)=>{
  relief(`${label} gilt shield rim`,points,.028,gold,-.22,.80,.193);
  relief(`${label} enamel shield`,points.map(([x,y])=>[x*.86,y*.86]),.030,ownerShade,-.22,.80,.213);
  sphere(`${label} ivory boss`,.032,ivory,-.22,.80,.239,8,5);
 };
 const roundShield=(label,r)=>{
  const rim=cylinder(`${label} round gilt shield`,r,.031,gold,-.205,.80,.16,r,14);rim.rotation.x=Math.PI/2;
  const face=cylinder(`${label} enamel shield`,r-.018,.035,ownerShade,-.205,.80,.180,r-.018,14);face.rotation.x=Math.PI/2;
  sphere(`${label} ivory boss`,.040,ivory,-.205,.80,.209,8,5);
 };
 const quiver=()=>{
  cylinder(`${type} enamel quiver`,.049,.27,ownerShade,-.215,.80,-.025,.045,8);
  ring(`${type} quiver mouth`,.048,.936,gold,-.215,-.025,.006);
  for(let i=0;i<3;i++){
   const x=-.215+(i-1)*.023,top=1.08+(i%2)*.025;
   rod(`${type} arrow ${i}`,[x,.89,-.025],[x,top,-.025],.0045,gold,4);
   box(`${type} fletching ${i}`,[.024,.041,.009],ivory,x,top-.018,-.025);
  }
 };
 const bow=(label,points)=>{
  const x=.245,y=.99,z=.17;
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1];
   rod(`${label} stave ${i}`,[x+a[0],y+a[1],z],[x+b[0],y+b[1],z],.014,gold,6);
  }
  const a=points[0],b=points.at(-1);
  rod(`${label} taut string`,[x+a[0],y+a[1],z],[x+b[0],y+b[1],z],.004,ivory,4);
  box(`${label} enamel grip`,[.034,.09,.037],ownerShade,x+Math.max(...points.map(p=>p[0])),y,z);
  quiver();
 };
 if(type==='phalanx'){
  spear('Phalanx long spear',1.78,.18);roundShield('Phalanx',.185);
  ring('Phalanx shield bead',.135,.80,ivory,-.205,.205,.005).rotation.x=0;
 }else if(type==='spearWall'){
  spear('Spear wall',1.66,.17);
  shield('Spear wall',[[-.15,.23],[.15,.23],[.16,-.12],[.10,-.24],[-.10,-.24],[-.16,-.12]]);
  box('Spear wall ivory shield spine',[.018,.38,.013],ivory,-.22,.80,.242);
 }else if(type==='pikeman'){
  spear('Pikeman long pike',1.94,.22);
  shield('Pikeman',[[-.10,.13],[.10,.13],[.09,-.05],[0,-.17],[-.09,-.05]]);
  box('Pikeman ivory nasal',[.018,.13,.02],ivory,0,1.08,.155);
 }else if(type==='fubing'){
  spear('Fubing broad spear',1.58,.25);roundShield('Fubing',.105);
  relief('Fubing short enamel pennant',[[0,0],[.16,-.025],[.11,-.08],[.15,-.13],[0,-.11]],.012,owner,.32,1.27,.035);
 }else if(type==='ponticPeltast'){
  spear('Peltast javelin',1.54,.16);
  shield('Peltast crescent',[[-.17,.15],[-.09,.09],[0,.035],[.09,.09],[.17,.15],[.18,-.03],[.12,-.16],[0,-.21],[-.12,-.16],[-.18,-.03]]);
 }else if(type==='bowman'){
  bow('Bowman longbow',[[0,-.38],[.09,-.27],[.15,-.13],[.17,0],[.15,.13],[.09,.27],[0,.38]]);
 }else if(type==='compositeBowman'){
  bow('Composite recurved bow',[[.075,-.31],[.025,-.25],[.10,-.14],[.145,0],[.10,.14],[.025,.25],[.075,.31]]);
  for(const side of [-1,1])rod(`Composite ivory horn tip ${side}`,[.27,.99+side*.25,.17],[.32,.99+side*.31,.17],.019,ivory,6);
 }else if(type==='crossbowman'){
  // Transverse limbs, stock and bolt make a clear mechanical silhouette.
  relief('Crossbow ivory stock',[[-.026,-.25],[.026,-.25],[.032,.23],[-.032,.23]],.046,ivory,.21,.92,.22);
  const points=[[-.27,-.05],[-.18,.03],[0,.065],[.18,.03],[.27,-.05]];
  for(let i=0;i<points.length-1;i++)rod(`Crossbow gilt limb ${i}`,[.21+points[i][0],1.04+points[i][1],.252],[.21+points[i+1][0],1.04+points[i+1][1],.252],.023,gold,6);
  rod('Crossbow taut cord',[-.06,.99,.252],[.48,.99,.252],.005,ivory,4);
  rod('Crossbow seated bolt',[.21,.88,.257],[.21,1.19,.257],.006,dark,6);
  box('Crossbow enamel winding block',[.087,.09,.033],ownerShade,.21,.85,.255);
  quiver();
 }else if(type==='slinger'){
  // A hanging leather loop and stone pouch, without a stave or arrow quiver.
  rod('Slinger outer cord',[.30,1.28,.14],[.42,.96,.14],.010,gold,6);
  rod('Slinger inner cord',[.30,1.28,.14],[.245,.96,.14],.010,gold,6);
  const pouch=sphere('Slinger ivory sling cradle',.067,ivory,.332,.93,.14,8,5);pouch.scale.set(1.45,.62,.65);
  rod('Slinger cradle left',[.245,.96,.14],[.29,.93,.14],.011,gold,6);
  rod('Slinger cradle right',[.42,.96,.14],[.38,.93,.14],.011,gold,6);
  cylinder('Slinger enamel finger grip',.023,.085,ownerShade,.30,1.28,.14,.023,8);
  const bag=sphere('Slinger enamel stone bag',.09,ownerShade,-.22,.75,.10,10,6);bag.scale.set(.85,1.25,.7);
  ring('Slinger ivory pouch binding',.048,.842,ivory,-.22,.10,.008);
 }else throw new Error(`Unknown polearm/ranged variant ${type}`);
}
