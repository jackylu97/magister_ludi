import * as T from 'three';

// One carved counter shared by the great-person roles. The laurel and ivory
// mantle establish the family; a small side emblem supplies the profession.
export function addGreatPerson(kit,family='scholar'){
 if(!['scholar','artist','engineer','merchant','general'].includes(family))throw new Error(`Unknown great-person family ${family}`);
 const {mesh,cylinder,sphere,ring,rod,box,owner,ownerShade,ivory,gold,dark}=kit;
 const profile=[[.26,.23],[.28,.31],[.235,.45],[.180,.68],[.211,.865],[.135,1.005]];
 mesh('Great person turned enamel body',new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),16),owner);
 cylinder('Great person hem recess',.268,.023,ownerShade,0,.266);
 ring('Great person gilt hem',.277,.307,gold,0,0,.009);
 ring('Great person ivory collar',.142,1.008,ivory,0,0,.014);
 cylinder('Great person ivory neck',.090,.087,ivory,0,1.038);
 sphere('Great person plain ivory head',.147,ivory,0,1.132);

 // Broad connected planes lie directly over the turned body. They suggest
 // one diagonal fold rather than separate arms, a rigid rectangular cape,
 // or the religious unit's robes and headgear.
 const radiusAt=y=>{
  for(let i=1;i<profile.length;i++)if(y<=profile[i][1]){
   const [a,ay]=profile[i-1],[b,by]=profile[i];return T.MathUtils.lerp(a,b,(y-ay)/(by-ay));
  }
  return profile.at(-1)[0];
 };
 const sash=[];
 for(const [x,y,width] of [[-.132,.944,.060],[-.100,.862,.090],[-.023,.744,.103],[.067,.618,.100],[.123,.502,.083]]){
  const r=radiusAt(y);
  sash.push([-1,1].map(sign=>{const px=x+width*.5*sign;return [px,y,Math.sqrt(Math.max(.001,r*r-px*px))+.009]}));
 }
 const sashPositions=[];
 const sashTri=(a,b,c)=>sashPositions.push(...a,...b,...c);
 for(let i=0;i<sash.length-1;i++){
  const [a,b]=sash[i],[c,d]=sash[i+1];
  sashTri(a,c,b);sashTri(b,c,d);
 }
 const mantle=new T.BufferGeometry();mantle.setAttribute('position',new T.Float32BufferAttribute(sashPositions,3));mantle.computeVertexNormals();
 mesh('Great person ivory diagonal mantle',mantle,ivory);
 for(let i=0;i<sash.length-1;i++)rod(`Great person mantle gilt edge ${i}`,sash[i][1],sash[i+1][1],.005,gold,4);
 const fastening=cylinder('Great person mantle brooch',.027,.010,gold,-.105,.884,.184,.027,8);fastening.rotation.x=Math.PI/2;

 // Two short laurel sprigs follow the head itself. No tall coronet or mitre.
 for(const side of [-1,1]){
  const points=[];
  for(let i=0;i<4;i++){
   const a=1.40-i*.31,p=[side*.121*Math.sin(a),1.132+.121*Math.cos(a),.086];points.push(p);
   const leaf=mesh(`Great person laurel leaf ${side} ${i}`,new T.IcosahedronGeometry(1,0),gold,...p);
   leaf.scale.set(.015,.031,.007);leaf.rotation.z=side*(.55-i*.10);
  }
  for(let i=0;i<points.length-1;i++)rod(`Great person laurel stem ${side} ${i}`,points[i],points[i+1],.0045,gold,4);
 }

 if(family==='scholar'){
  // An open ivory scroll with generous rolled ends reads without lettering.
  box('Scholar unfurled ivory scroll',[.206,.302,.022],ivory,.279,.842,.156);
  for(const sign of [-1,1]){
   const roll=cylinder(`Scholar scroll roll ${sign}`,.031,.247,ivory,.279,.842+sign*.153,.155,.031,12);roll.rotation.z=Math.PI/2;
   for(const end of [-1,1]){
    const cap=cylinder(`Scholar gilt scroll cap ${sign} ${end}`,.033,.015,gold,.279+end*.126,.842+sign*.153,.155,.033,8);cap.rotation.z=Math.PI/2;
   }
  }
  for(let i=0;i<3;i++)box(`Scholar incised scroll rule ${i}`,[i===2?.078:.127,.006,.003],ownerShade,.279-(i===2?.025:0),.898-i*.048,.169);
 }else if(family==='artist'){
  // One open lyre silhouette and three strings, with no miniature fingers.
  const shape=new T.Shape([
   [-.128,.183],[-.090,.175],[-.100,.107],[-.080,-.106],
   [-.055,-.139],[.055,-.139],[.080,-.106],[.100,.107],
   [.090,.175],[.128,.183],[.137,.127],[.111,-.127],
   [.073,-.180],[-.073,-.180],[-.111,-.127],[-.137,.127],
  ].map(p=>new T.Vector2(...p)));
  const lyre=new T.ExtrudeGeometry(shape,{depth:.031,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.005,bevelThickness:.004,curveSegments:1});
  mesh('Artist carved ivory lyre',lyre,ivory,.275,.819,.154);
  box('Artist gilt lyre crossbar',[.218,.027,.044],gold,.275,.960,.171);
  for(let i=-1;i<=1;i++)rod(`Artist lyre string ${i}`,[.275+i*.041,.691,.174],[.275+i*.041,.958,.174],.004,gold,4);
  box('Artist enamel lyre soundbox',[.137,.059,.039],ownerShade,.275,.671,.171);
 }else if(family==='engineer'){
  // Large drafting dividers supply a clear engineering emblem.
  rod('Engineer ivory divider left',[.280,1.029,.161],[.130,.665,.161],.023,ivory,6);
  rod('Engineer ivory divider right',[.280,1.029,.161],[.430,.665,.161],.023,ivory,6);
  rod('Engineer gilt divider bridge',[.192,.816,.161],[.368,.816,.161],.010,gold,4);
  for(const sign of [-1,1]){
   const p=.280+sign*.150;
   const point=mesh(`Engineer steel divider point ${sign}`,new T.ConeGeometry(.023,.092,4),dark,p,.632,.161);point.rotation.z=Math.PI+sign*.39;
  }
  const hinge=cylinder('Engineer gilt divider hinge',.048,.045,gold,.280,1.035,.161,.048,12);hinge.rotation.x=Math.PI/2;
  sphere('Engineer ivory divider pin',.018,ivory,.280,1.035,.193,8,5);
 }else if(family==='merchant'){
  // A coin medallion and short stack establish trade rather than religion.
  const rim=cylinder('Merchant gilt coin medallion',.120,.032,gold,.275,.849,.161,.120,16);rim.rotation.x=Math.PI/2;
  const face=cylinder('Merchant enamel coin centre',.093,.035,ownerShade,.275,.849,.169,.093,12);face.rotation.x=Math.PI/2;
  const seal=box('Merchant ivory coin mark',[.072,.072,.009],ivory,.275,.849,.190);seal.rotation.z=Math.PI/4;
  for(let i=0;i<3;i++)cylinder(`Merchant stacked coin ${i}`,.099,.023,gold,.275,.627+i*.032,.121,.099,12);
 }else{
  // The commander uses the same civilian laurel with a straight short sword
  // and transverse baton, avoiding the infantry helmet and shield.
  const blade=new T.Shape([[-.023,0],[.023,0],[.023,.343],[0,.399],[-.023,.343]].map(p=>new T.Vector2(...p)));
  const sword=new T.ExtrudeGeometry(blade,{depth:.020,steps:1,bevelEnabled:false,curveSegments:1});
  mesh('General ivory command sword',sword,ivory,.304,.804,.148);
  box('General gilt sword guard',[.134,.022,.041],gold,.304,.795,.158);
  cylinder('General enamel sword grip',.022,.124,ownerShade,.304,.719,.158,.022,8);
  sphere('General gilt sword pommel',.034,gold,.304,.639,.158,8,5);
  rod('General ivory command baton',[-.174,.766,.174],[-.284,.931,.174],.025,ivory,8);
  for(const [i,p] of [[0,[-.171,.761,.174]],[1,[-.286,.935,.174]]])sphere(`General gilt baton cap ${i}`,.029,gold,...p,8,5);
 }
}
