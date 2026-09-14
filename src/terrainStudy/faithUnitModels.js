import * as T from 'three';

export const faithVariants=['augur','apostle','inquisitor','canoness'];

/** Emblem equipment on the accepted turned religious pawn. */
export function addFaithEquipment(kit,type){
 const {mesh,box,rod,sphere,cylinder,ring,ivory,gold,ownerShade}=kit;
 const extrude=(name,points,depth,m,x,y,z)=>mesh(name,new T.ExtrudeGeometry(new T.Shape(points.map(p=>new T.Vector2(...p))),{depth,bevelEnabled:false,steps:1}),m,x,y,z-depth/2);
 const book=(open=false)=>{
  if(!open){
   box('Votive ivory pages',[.19,.22,.066],ivory,-.22,.77,.17);
   box('Votive enamel binding',[.215,.245,.018],ownerShade,-.22,.77,.212);
   box('Votive gilt spine',[.024,.245,.085],gold,-.319,.77,.17);
   const seal=box('Votive diamond',[.039,.039,.01],gold,-.22,.77,.226);seal.rotation.z=Math.PI/4;
  }else{
   for(const side of [-1,1]){
    const page=box(`Open choir pages ${side}`,[.174,.216,.029],ivory,side*.084,.83,.264);page.rotation.y=side*.27;
    const cover=box(`Open choir cover ${side}`,[.189,.232,.015],ownerShade,side*.087,.83,.240);cover.rotation.y=side*.27;
    for(const y of [.785,.825,.865]){
     const line=box(`Choir notation ${side} ${y}`,[.113,.007,.005],gold,side*.09,y,.284);line.rotation.y=side*.27;
    }
   }
   rod('Open book spine',[0,.71,.261],[0,.95,.261],.009,gold,6);
  }
 };
 const crook=(x=.315)=>{
  rod('Ivory crozier shaft',[x,.29,.015],[x,1.38,.015],.017,ivory,8);
  const points=[[x,1.37],[x,1.48],[x-.055,1.535],[x-.13,1.535],[x-.172,1.49],[x-.166,1.43],[x-.119,1.412]];
  for(let i=1;i<points.length;i++)rod(`Crozier curve ${i}`,[...points[i-1],.015],[...points[i],.015],.014,gold,6);
 };
 const hood=(veil=false)=>{
  // A continuous open-front hood with solid inner/outer faces. The ivory
  // pawn face remains visible through the front opening.
  const profile=veil?[[.84,.225],[1.06,.199],[1.19,.174],[1.31,.087],[1.34,.006]]:[[.88,.221],[1.08,.207],[1.21,.187],[1.33,.055],[1.345,.006]];
  const pos=[],tri=(a,b,c)=>pos.push(...a,...b,...c),rows=[];
  for(const [y,r] of profile){const row=[];for(let i=0;i<=12;i++){const a=.80+i*(Math.PI*2-1.60)/12;row.push([Math.sin(a)*r,y,Math.cos(a)*r-.025]);}rows.push(row);}
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<12;i++){
   const a=rows[j][i],b=rows[j][i+1],c=rows[j+1][i+1],d=rows[j+1][i];
   const inner=p=>[p[0]*.91,p[1],(p[2]+.025)*.91-.025];
   tri(a,b,c);tri(a,c,d);tri(inner(c),inner(b),inner(a));tri(inner(d),inner(c),inner(a));
   if(i===0){tri(a,d,inner(d));tri(a,inner(d),inner(a));}
   if(i===11){tri(c,b,inner(b));tri(c,inner(b),inner(c));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.computeVertexNormals();
  mesh(veil?'Canoness carved veil':'Inquisitor carved hood',geometry,ownerShade);
  if(veil){
   ring('Canoness ivory brow band',.178,1.176,ivory,0,-.025,.014);
   extrude('Canoness ivory stole',[[-.15,0],[-.105,0],[-.074,.29],[-.11,.40],[-.148,.36]],.016,ivory,0,.49,.20);
   extrude('Canoness second stole',[[.105,0],[.15,0],[.148,.36],[.11,.40],[.074,.29]],.016,ivory,0,.49,.20);
  }
 };
 if(type==='augur'){
  cylinder('Augur ivory cap',.157,.073,ivory,0,1.203,0,.127,10);
  ring('Augur gilt cap band',.156,1.17,gold,0,0,.009);
  crook();
  const bowl=mesh('Augur offering bowl',new T.SphereGeometry(.10,10,5,0,Math.PI*2,0,Math.PI/2),gold,-.239,.755,.14);bowl.rotation.x=Math.PI;
  sphere('Augur ivory offering',.043,ivory,-.239,.756,.14,8,5);
 }else if(type==='apostle'){
  extrude('Apostle ivory mitre',[[-.155,0],[.155,0],[.128,.16],[0,.25],[-.128,.16]],.18,ivory,0,1.139,0);
  box('Apostle mitre band',[.29,.025,.014],gold,0,1.17,.098);
  book();crook();
 }else if(type==='inquisitor'){
  hood();book();
  rod('Inquisitor seal staff',[.316,.29,.015],[.316,1.385,.015],.016,gold,8);
  extrude('Inquisitor ivory seal',[[-.07,0],[0,.10],[.07,0],[0,-.10]],.032,ivory,.316,1.40,.015);
  const seal=box('Inquisitor seal inset',[.05,.05,.008],ownerShade,.316,1.40,.035);seal.rotation.z=Math.PI/4;
 }else{
  hood(true);book(true);
  rod('Canoness choir standard',[.317,.29,.012],[.317,1.40,.012],.015,gold,8);
  mesh('Canoness open halo',new T.TorusGeometry(.077,.014,5,14),ivory,.317,1.47,.012);
  sphere('Canoness halo bead',.026,gold,.317,1.47,.012,8,5);
 }
}

export function addJourneyCargo({box,rod,cylinder,mesh,ivory,gold,ownerShade}){
 // This equipment uses the wagon's original datum, before its wheel-ground shift.
 for(const side of [-1,1]){
  box(`Journey pannier ${side}`,[.094,.145,.15],ownerShade,side*.279,.69,0);
  box(`Journey pannier clasp ${side}`,[.014,.045,.026],gold,side*.332,.70,0);
 }
 const roll=cylinder('Rihla rolled carpet',.063,.39,ownerShade,0,1.018,-.115,.063,10);roll.rotation.z=Math.PI/2;
 for(const x of [-.12,.12]){const tie=mesh(`Carpet ivory tie ${x}`,new T.TorusGeometry(.064,.009,4,10),ivory,x,1.018,-.115);tie.rotation.y=Math.PI/2;}
 rod('Journey pennant pole',[.18,.67,-.235],[.18,1.23,-.235],.011,gold,6);
 const flag=new T.Shape([[0,0],[.15,-.015],[.105,-.072],[0,-.063]].map(p=>new T.Vector2(...p)));
 mesh('Journey enamel pennant',new T.ExtrudeGeometry(flag,{depth:.012,bevelEnabled:false,steps:1}),ownerShade,.18,1.21,-.241);
}
