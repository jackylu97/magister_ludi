// Build the review collection separately so the game keeps its current unit models.
import {build} from 'esbuild';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

const work = mkdtempSync(join(tmpdir(), 'roster-review-'));
const bundle = join(work, 'pieces.mjs');
await build({entryPoints:['src/terrainStudy/primitiveUnitModels.js'],bundle:true,format:'esm',outfile:bundle});
const {createPrimitiveUnitScene:base} = await import(pathToFileURL(bundle));
globalThis.FileReader = class {
 async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};
const out='art/terrain-study/unit-roster-review';
const parts = (scene, pattern) => scene.children.filter(part=>pattern.test(part.name));
function kit(scene){
 const materials={};
 scene.traverse(o=>{if(o.material)materials[o.material.name]=o.material});
 const enamel=materials['Owner enamel'], ivory=materials['Warm ivory'], gold=materials['Antique gold'];
 const trim=materials['Trim gilt']??gold, dark=materials['Incised detail']??new T.MeshStandardMaterial({name:'Incised detail',color:0x303d42});
 function mesh(name,g,m,p){const o=new T.Mesh(g,m);o.name=name;o.position.fromArray(p);scene.add(o);return o}
 const box=(name,p,size,m)=>mesh(name,new T.BoxGeometry(...size),m,p);
 const rod=(name,a,b,r,m,top=r,n=8)=>{
  const start=new T.Vector3(...a),end=new T.Vector3(...b),v=end.clone().sub(start);
  const o=mesh(name,new T.CylinderGeometry(top,r,v.length(),n),m,start.add(end).multiplyScalar(.5).toArray());
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;
 };
 function panel(name,p,xy,depth,m){
  const g=new T.ExtrudeGeometry(new T.Shape(xy.map(v=>new T.Vector2(...v))),{depth,bevelEnabled:false});
  return mesh(name,g,m,p);
 }
 function shield(x,y,r){
  rod('Round shield rim',[x,y,.20],[x,y,.26],r,gold,r,18);
  rod('Round enamel shield',[x,y,.25],[x,y,.28],r*.9,enamel,r*.86,18);
  rod('Raised boss',[x,y,.28],[x,y,.335],r*.29,ivory,r*.14,12);
 }
 function spear(x,dx,top){
  rod('Javelin shaft',[x,.31,.065],[x+dx,top-.13,.065],.018,gold);
  panel('Leaf point',[x+dx,top-.15,.053],[[-.012,0],[-.04,.058],[0,.18],[.04,.058],[.012,0]],.026,ivory);
 }
 return {mesh,box,rod,panel,shield,spear,enamel,ivory,gold,trim,dark};
}
function make(id){
 if(id==='ballistaElephant')return base('siegeElephant',{tier:2});
 if(id==='keshig')return base('xiongnuHorseArcher',{tier:2});
 const source={hypaspist:'swordsman',janissary:'swordsman',condottiere:'longswordsman',qinCrossbowman:'crossbowman',sparabara:'spearWall',hwacha:'catapult',companyGuard:'swordsman',numidianCavalry:'horseman'}[id];
 const scene=base(source,{tier:['janissary','companyGuard','condottiere','hwacha'].includes(id)?2:1});
 const {rod,box,panel,shield,spear,enamel,ivory,gold,trim,dark}=kit(scene);
 const remove=re=>scene.remove(...parts(scene,re));
 if(id==='hypaspist'){
  remove(/buckler/);shield(-.25,.80,.225);
  panel('Swept helmet crest',[-.025,1.25,.08],[[-.10,0],[-.15,.12],[-.11,.19],[.10,.17],[.16,.095],[.13,.055],[.06,.105]],.052,trim).rotation.y=-.40;
 }else if(id==='janissary'){
  remove(/^Swordsman/);
  rod('Ivory felt cap',[0,1.13,0],[0,1.48,-.04],.145,ivory,.110,12);
  box('Folded cap tail',[0,1.25,-.148],[.17,.32,.05],ivory).rotation.x=.16;
  rod('Cap band',[0,1.13,0],[0,1.19,0],.151,enamel,.15,12);
  panel('Matchlock butt',[.32,.37,.10],[[-.057,0],[.037,.018],[.035,.33],[.014,.43],[-.036,.43],[-.023,.21]],.067,enamel);
  rod('Upright matchlock barrel',[.32,.72,.13],[.32,1.48,.13],.031,dark);
  for(const y of [.81,.99,1.435])rod('Gilt barrel band',[.32,y,.13],[.32,y+.036,.13],.037,gold);
 }else if(id==='condottiere'){
  remove(/heater|Longswordsman.*(blade|grip|pommel|crossguard)/);
  const axe=[[-.17,.20],[-.09,.195],[-.026,.153],[0,.31],[.042,.15],[.18,.21],[.139,.10],[.07,.054],[.025,.064],[.012,0],[-.03,.005],[-.032,.079],[-.12,.067]];
  rod('Poleaxe haft',[.315,.30,.09],[.315,1.30,.09],.023,enamel);
  panel('Broad poleaxe head',[.315,1.23,.058],axe,.058,ivory);
  panel('Helmet plume',[0,1.26,-.085],[[0,0],[-.055,.08],[-.18,.14],[-.24,.14],[-.17,.21],[-.06,.18],[.036,.08]],.048,trim);
 }else if(id==='qinCrossbowman'){
  remove(/helmet|brow|cheek|knob|nasal|^Crossbow /i);
  const bow=new T.Group();bow.name='Qin crossbow';scene.add(bow);
  bow.position.set(.24,.91,.25);bow.rotation.z=-.32;
  bow.add(box('Ivory crossbow stock',[0,0,0],[.06,.54,.065],ivory));
  for(const side of [-1,1]){
   bow.add(rod('Crossbow inner limb',[0,.13,.035],[side*.17,.12,.035],.031,enamel));
   bow.add(rod('Crossbow recurved tip',[side*.17,.12,.035],[side*.30,.025,.035],.023,gold));
   bow.add(rod('Crossbow cord',[side*.30,.025,.035],[0,-.12,.035],.008,dark));
  }
  bow.add(rod('Bolt in groove',[0,-.13,.068],[0,.31,.068],.013,gold));
  rod('Wrapped hair',[0,1.13,0],[0,1.29,0],.14,dark,.10);
  rod('Bound topknot',[.035,1.26,-.025],[.055,1.385,-.04],.06,dark,.074);
  rod('Topknot tie',[.039,1.29,-.029],[.043,1.32,-.033],.065,trim);
  for(let i=0;i<3;i++)box('Lamellar chest rows',[0,.68+i*.078,.15+i*.014],[.27,.064,.07],i===1?trim:ivory);
 }else if(id==='sparabara'){
  remove(/Spear wall.*(shield|boss)|helmet spike/i);
  const shape=[[-.19,-.30],[.19,-.30],[.19,.23],[.13,.305],[-.13,.305],[-.19,.23]];
  panel('Tall wicker shield',[-.24,.83,.18],shape,.056,gold);
  for(let i=-2;i<=2;i++)box('Willow ribs',[-.24+i*.064,.815,.245],[.025,.53,.021],ivory);
  for(let i=0;i<4;i++)box('Dyed wicker bands',[-.24,.60+i*.137,.268],[.36,.027,.018],enamel);
 }else if(id==='numidianCavalry'){
  remove(/Cavalry.*(sword|crossguard)/i);
  shield(-.235,.73,.14);spear(.31,-.12,1.51);spear(.31,.13,1.64);
 }else if(id==='companyGuard'){
  remove(/Swordsman.*(helmet|cheek|brow|nasal|buckler|crest)/);
  panel('Broad folded hat brim',[0,1.17,-.09],[[-.24,.075],[-.17,-.05],[.14,-.052],[.24,.10],[.08,.06],[0,.16],[-.09,.064]],.21,enamel);
  rod('Hat crown',[0,1.17,0],[0,1.32,0],.13,enamel,.095,12);
  box('Ivory crossbelt',[0,.737,.176],[.060,.415,.045],ivory).rotation.z=-.57;
  box('Cartridge box',[-.105,.617,.18],[.16,.103,.067],dark);
 }else if(id==='hwacha'){
  remove(/^Catapult |^Trim (upright|stop|arm)/);
  for(const x of [-.16,.16])rod('Rack post',[x,.39,0],[x,.77,0],.045,ivory);
  const rack=new T.Group();rack.name='Tilted rocket rack';scene.add(rack);rack.position.set(0,.83,.04);rack.rotation.x=-.38;
  const mount=o=>{rack.add(o);return o};
  mount(box('Enamel rack back',[0,0,-.11],[.61,.47,.16],enamel));
  for(const x of [-.31,.31])mount(box('Rack side rails',[x,0,0],[.046,.52,.25],ivory));
  for(const y of [-.245,.245])mount(box('Rack cross rails',[0,y,0],[.63,.044,.25],gold));
  for(let x=-2;x<=2;x++)for(let y=-1;y<=1;y++){
   const a=x*.105,b=y*.125;
   mount(rod('Rocket shaft',[a,b,-.22],[a,b,.20],.026,gold));
   mount(rod('Ivory rocket tip',[a,b,.17],[a,b,.29],.044,ivory,0,5));
  }
 }
 scene.name=id;return scene;
}
const models=['hypaspist','janissary','condottiere','qinCrossbowman','sparabara','hwacha','numidianCavalry','companyGuard','ballistaElephant','keshig'];
for(const id of [...models,'swordsman','horseman','catapult']){
 const scene=models.includes(id)?make(id):base(id,{tier:1});
 const data=await new GLTFExporter().parseAsync(scene,{binary:true});
 writeFileSync(join(models.includes(id)?out:work,id+'.glb'),Buffer.from(data));
}
console.log(work);
