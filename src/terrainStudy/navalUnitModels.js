import * as T from 'three';
import roster from '../../data/units.json';

export const navalVariants=['trireme','bireme','galley','caravel','corvette','alexandrianGalley','warGalley','towerShip','carrack','shipOfTheLine','treasureShip','fireShip','gunGalley','frigate'];

export function addNaval(kit,type){
 const {mesh,box,rod,cylinder,sphere,ivory,gold,owner,ownerShade,dark}=kit;
 const transport=type==='embarked';
 const def=transport?{modelClass:'transport',masts:1}:roster.units[type],heavy=def.modelClass==='navalHeavy',ranged=def.modelClass==='navalRanged';
 const width=transport?1.05:heavy?1.12:ranged?1.02:.88,depth=transport?.20:heavy?.23:.17;
 const outline=[[0,.66],[.15,.50],[.245,.22],[.235,-.33],[.15,-.55],[-.15,-.55],[-.235,-.33],[-.245,.22],[-.15,.50]].map(([x,z])=>[x*width,z]);
 const shape=(name,low,high,bottomScale,topScale,material)=>{
  const pos=[],tri=(a,b,c)=>pos.push(...a,...b,...c);
  const ring=(y,s)=>outline.map(([x,z])=>[x*s,y,z*s]);
  const a=ring(low,bottomScale),b=ring(high,topScale);
  for(let i=0;i<a.length;i++){
   const j=(i+1)%a.length;
   tri(a[i],a[j],b[j]);tri(a[i],b[j],b[i]);
   tri([0,high,0],b[i],b[j]);tri([0,low,0],a[j],a[i]);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();mesh(name,g,material);
 };
 shape('Carved enamel lower hull',0,depth*.47,.70,.93,ownerShade);
 shape('Carved enamel upper hull',depth*.47,depth,.93,1,owner);
 shape('Ivory inset deck',depth,depth+.019,.90,.90,ivory);
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length];
  rod(`Gilt gunwale ${i}`,[a[0],depth+.015,a[1]],[b[0],depth+.015,b[1]],.010,gold,6);
 }
 for(let i=0;i<5;i++)box(`Deck plank seam ${i}`,[.31*width,.005,.009],gold,0,depth+.021,-.29+i*.145);
 const beam=(name,a,b,r=.012,m=gold)=>rod(name,a,b,r,m,6);
 if(!transport&&def.masts<=3){
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const z=-.28+i*.125;
   beam(`Ivory oar ${side} ${i}`,[side*.18*width,depth+.025,z],[side*.43*width,.045,z-.065],.011,ivory);
   const blade=box(`Oar blade ${side} ${i}`,[.10,.018,.036],ownerShade,side*.435*width,.04,z-.067);blade.rotation.z=side*.22;
  }
 }
 // Mast counts are game data; even the smaller late rigs retain that cue.
 for(let i=0;i<def.masts;i++){
  const z=def.masts===1?0:-.34+i*.72/(def.masts-1);
  const middle=1-Math.abs(i-(def.masts-1)/2)/Math.max(1,def.masts/2);
  const top=depth+.65+middle*.24,span=def.masts===1?.53:def.masts===2?.43:def.masts===3?.35:.30;
  beam(`Mast ${i}`,[0,depth,z],[0,top+.08,z],.017,ivory);
  cylinder(`Mast collar ${i}`,.027,.065,gold,0,depth+.043,z,.027,8);
  beam(`Yard ${i}`,[-span*.55,top,z],[span*.55,top,z],.013,gold);
  const bottom=top-(def.masts<=2?.43:.34);
  // Five broad planes form a slight belly in the sail, with real thickness.
  const p=[[-span*.50,top,z],[-span*.50,bottom+.025,z+.015],[0,bottom-.018,z+.07],[span*.50,bottom+.025,z+.015],[span*.50,top,z],[0,top,z+.045]];
  const pos=[],tri=(a,b,c)=>pos.push(...a,...b,...c),back=v=>[v[0],v[1],v[2]-.010];
  const faces=[[0,1,2],[0,2,5],[5,2,3],[5,3,4]];
  for(const [a,b,c]of faces){tri(p[a],p[b],p[c]);tri(back(p[c]),back(p[b]),back(p[a]));}
  for(let n=0;n<p.length;n++){const a=p[n],b=p[(n+1)%p.length];tri(a,back(a),back(b));tri(a,back(b),b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();mesh(`Faceted ivory sail ${i}`,g,ivory);
  box(`Enamel sail canton ${i}`,[span*.26,.082,.013],owner,-span*.26,top-.075,z+.034);
  // A compact line emblem on the foremost sail supplements the hull shape.
  if(!transport&&i===def.masts-1){
   const x=-span*.26,y=top-.075;
   if(heavy){box('Heavy sail tower',[.032,.045,.014],ivory,x,y,z+.043);box('Heavy sail battlement',[.05,.015,.014],ivory,x,y+.025,z+.043);}
   else if(ranged){const target=mesh('Ranged sail target',new T.TorusGeometry(.024,.004,4,10),ivory,x,y,z+.044);}
   else{beam('Light sail chevron left',[x-.022,y-.012,z+.044],[x,y+.016,z+.044],.004,ivory);beam('Light sail chevron right',[x,y+.016,z+.044],[x+.022,y-.012,z+.044],.004,ivory);}
  }
  const pennant=new T.Shape([[0,0],[.10,-.015],[.07,-.043],[0,-.034]].map(p=>new T.Vector2(...p)));
  mesh(`Enamel mast pennant ${i}`,new T.ExtrudeGeometry(pennant,{depth:.008,bevelEnabled:false,steps:1}),owner,0,top+.064,z);
 }
 if(transport){
  // A broad merchant hull: one simple sail and travel cargo, no ram or guns.
  for(const side of [-1,1]){
   box(`Transport cargo chest ${side}`,[.14,.115,.21],ownerShade,side*.105,depth+.076,-.34);
   box(`Transport cargo lid ${side}`,[.15,.020,.22],ivory,side*.105,depth+.141,-.34);
   box(`Transport chest binding ${side}`,[.024,.126,.224],gold,side*.105,depth+.080,-.34);
  }
  box('Transport passenger bench',[.31,.036,.09],ivory,0,depth+.074,.32);
  for(const side of [-1,1])box(`Bench support ${side}`,[.026,.05,.065],ownerShade,side*.12,depth+.040,.32);
  rod('Transport stern tiller',[0,depth+.045,-.47],[.095,depth+.07,-.57],.014,gold,6);
 }
 if(heavy||type==='caravel'||type==='corvette'){
  box('Raised enamel sterncastle',[.28*width,.13,.19],ownerShade,0,depth+.075,-.37);
  box('Ivory sterncastle roof',[.30*width,.024,.21],ivory,0,depth+.15,-.37);
  for(const side of [-1,1])box(`Sterncastle gilt rail ${side}`,[.015,.06,.21],gold,side*.145*width,depth+.19,-.37);
 }
 if(type==='towerShip'){
  box('Forward enamel fighting tower',[.21,.27,.19],ownerShade,0,depth+.15,.40);
  box('Ivory fighting platform',[.25,.025,.23],ivory,0,depth+.292,.40);
  for(const x of [-.095,0,.095])box(`Fighting tower merlon ${x}`,[.039,.055,.032],gold,x,depth+.325,.51);
 }
 if(type==='trireme'||type==='bireme'||type==='warGalley')beam('Ivory bow ram',[0,.07,.50],[0,.075,.78],.024,ivory);
 if(type==='alexandrianGalley'){
  cylinder('Alexandrian lookout platform',.073,.033,ownerShade,0,depth+.925,0,.073,10);
  beam('Lookout standard',[0,depth+.93,0],[0,depth+1.09,0],.012,ivory);
  sphere('Lookout gilt beacon',.034,gold,0,depth+1.10,0,8,5);
 }
 if(type==='treasureShip'){
  for(const side of [-1,1]){
   box(`Treasure deckhouse ${side}`,[.12,.085,.14],ownerShade,side*.13,depth+.065,-.17);
   box(`Treasure gilt roof ${side}`,[.15,.025,.17],gold,side*.13,depth+.12,-.17);
  }
 }
 const gunRows=type==='shipOfTheLine'?2:1;
 if(ranged||type==='shipOfTheLine'||type==='corvette'){
  if(type==='fireShip'){
   cylinder('Fire ship brazier',.075,.066,gold,0,depth+.055,.47,.095,10);
   const flame=mesh('Carved ivory flame',new T.ConeGeometry(.047,.16,5),ivory,0,depth+.15,.47);flame.rotation.z=-.16;
   for(const side of [-1,1])beam(`Fire ship bronze nozzle ${side}`,[side*.10,depth+.08,.33],[side*.17,depth+.08,.57],.028,gold);
  }else for(const side of [-1,1])for(let row=0;row<gunRows;row++)for(let i=0;i<4;i++){
   const z=-.24+i*.15,y=depth*.55+row*.075;
   box(`Gunport ${side} ${row} ${i}`,[.009,.045,.05],dark,side*.242*width,y,z);
   beam(`Gilt cannon ${side} ${row} ${i}`,[side*.235*width,y,z],[side*.31*width,y,z],.018,gold);
  }
 }
}
