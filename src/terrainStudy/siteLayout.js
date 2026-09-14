import {onTileTop,surfaceHeight,WATER_LEVEL} from './surface.js';

export const siteLabels={ruins:'Ancient ruins',village:'Tribal village',antiquity:'Buried antiquities',wreck:'Sea wreck',barbarianCamp:'Barbarian camp'};
// Horizontal bounds of the authored GLBs, including projecting roof/arch pieces.
const bounds={
 'site-ruin-arch':[-.255,.253,-.130,.100],
 'site-ruin-column':[-.090,.090,-.090,.090],
 'site-ruin-fragment':[-.129,.109,-.084,.075],
 'site-hut':[-.193,.193,-.193,.193],
 'site-longhouse':[-.240,.240,-.190,.190],
 'site-antiquity':[-.171,.202,-.269,.111],
 'site-wreck':[-.460,.460,-.229,.253],
 'site-raider-tent':[-.227,.350,-.190,.240],
 'site-watchtower':[-.135,.135,-.135,.161],
};
const compositions={
 ruins:[['site-ruin-arch',-.02,-.19,1.08,.03],['site-ruin-column',-.38,.16,1.02,-.12],['site-ruin-column',.36,-.04,.68,.2],['site-ruin-fragment',.19,.32,1.05,.5],['site-ruin-fragment',-.23,.41,.76,-.5]],
 village:[['site-longhouse',-.17,-.24,.87,.08],['site-hut',.32,.06,.81,-.7],['site-hut',-.25,.31,.76,.4]],
 antiquity:[['site-antiquity',-.06,.04,1.10,-.12],['site-ruin-fragment',.32,.20,.69,.5],['site-ruin-fragment',-.35,-.22,.62,-.3]],
 wreck:[['site-wreck',0,0,1.03,.22]],
 barbarianCamp:[['site-raider-tent',-.29,.09,.80,-.2],['site-raider-tent',.28,-.07,.74,.3],['site-watchtower',-.08,-.39,.85,.04]],
};
export function footprintPoints(piece,steps=4){
 const [x0,x1,z0,z1]=bounds[piece.name],points=[],c=Math.cos(piece.angle),s=Math.sin(piece.angle);
 for(let i=0;i<=steps;i++)for(let j=0;j<=steps;j++){
  const x=(x0+(x1-x0)*i/steps)*piece.scale,z=(z0+(z1-z0)*j/steps)*piece.scale;
  points.push([piece.x+x*c+z*s,piece.z+z*c-x*s]);
 }
 return points;
}
export function createSiteLayout(tile,kind,height=(x,z)=>surfaceHeight(tile,x,z)){
 const seed=tile.col*73+tile.row*19,rand=n=>{const x=Math.sin(seed*17+n*131.7)*43758.5453;return x-Math.floor(x)};
 const oasis=tile.feature==='oasis',turn=oasis?0:(rand(3)-.5)*.54,cos=Math.cos(turn),sin=Math.sin(turn),pieces=[];
 const composition=oasis?(compositions[kind]||[]).map(([name,,,scale,angle],i)=>{
  const [x,z]=[[0,-.73],[.66,.15],[-.65,.20],[.10,.73],[-.43,-.51]][i];return [name,x,z,scale*.66,angle];
 }):compositions[kind]||[];
 for(const [i,[name,ox,oz,scale,angle]]of composition.entries()){
  const tx=ox*cos+oz*sin,tz=oz*cos-ox*sin,base={name,scale:scale*(.95+rand(i+10)*.09),angle:angle+turn+(rand(i+40)-.5)*.12};
  if(kind==='wreck'){pieces.push({...base,x:tx,z:tz,y:WATER_LEVEL,bottom:WATER_LEVEL});continue}
  let best;
  // Short local search chooses a quiet facet without regularising the site.
  // If the bank leaves little room, reduce the piece, never extend into water.
  for(const shrink of [1,.82,.65]){
   for(let j=0;j<25;j++){
    const a=j*2.39996,d=j===0?0:Math.sqrt(j/24)*.23;
    const p={...base,scale:base.scale*shrink,x:tx+Math.cos(a)*d,z:tz+Math.sin(a)*d};
    const samples=footprintPoints(p);
    if(!samples.every(([x,z])=>onTileTop(tile,x,z,.035)&&(!oasis||height(x,z)>.119)))continue;
    const heights=samples.map(([x,z])=>height(x,z)),low=Math.min(...heights),high=Math.max(...heights);
    const radius=Math.max(...samples.map(([x,z])=>Math.hypot(x-p.x,z-p.z)));
    if(pieces.some(b=>Math.hypot(b.x-p.x,b.z-p.z)<(b.radius+radius)*.78))continue;
    const score=(high-low)*6+d*.75+(1-shrink)*.4;
    if(!best||score<best.score)best={...p,bottom:low-.009,y:high+.003,radius,score};
   }
   if(best&&best.y-best.bottom<.075)break;
  }
  if(best)pieces.push(best);
 }
 return {kind,pieces};
}

export function siteReserved(layout,x,z){
 if(!layout)return false;
 if(layout.kind==='barbarianCamp'&&Math.hypot(x,z)<.77)return true;
 return layout.pieces.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+.17)||Math.hypot(x,z)<.32;
}
