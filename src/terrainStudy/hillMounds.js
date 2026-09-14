// Deliberately small polygon meshes, not samples of a rounded height field.
// Local hills and landscape strokes use the same broad, tilted polygon planes.
function random(col,row,salt){
 let n=Math.imul(col+31,73856093)^Math.imul(row+17,19349663)^Math.imul(salt+1,83492791);
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967296;
}

export function makeHillMounds(tile,shape,baseHeight,options={}){
 const r=salt=>random(tile.col,tile.row,salt);
 const turn=options.turn??r(0)*Math.PI*2,ca=Math.cos(turn),sa=Math.sin(turn);
 const layouts=[
  [[-.08,.02,.66,.49,.25],[.38,-.37,.29,.22,.105]],
  [[-.29,-.10,.47,.36,.23],[.28,.25,.43,.31,.17]],
  [[.04,-.03,.69,.54,.24]],
  [[-.19,-.18,.55,.40,.22],[.29,.28,.33,.27,.15],[-.39,.39,.23,.19,.095]],
 ];
 const layout=options.layout??layouts[Math.floor(r(1)*layouts.length)];
 return layout.map(([cx,cz,rx,rz,height],i)=>{
  const salt=20+i*20,angle=(r(salt)-.5)*1.1+(i===1?.8:0),a=Math.cos(angle),b=Math.sin(angle);
  rx*=.90+r(salt+1)*.20;rz*=.86+r(salt+2)*.28;height*=.82+r(salt+3)*.36;
  const locate=(x,z)=>{
   const u=cx+x*a-z*b,v=cz+x*b+z*a;
   return [u*ca-v*sa,u*sa+v*ca];
  };
  const sides=options.outline?.length??(i===0?6:5);
  const rim=Array.from({length:sides},(_,j)=>{
   if(options.outline){const [x,z]=options.outline[j];return [x*rx,z*rz]}
   const theta=j*Math.PI*2/sides,scale=.86+r(salt+5+j)*.28;
   return [Math.cos(theta)*rx*scale,Math.sin(theta)*rz*scale];
  });
  const footprint=rim.map(([x,z])=>locate(x,z));
  // Fit the whole footprint inside the actual river/coast cuts. Overlapping
  // feet join the group into low, broken ridges as in the supplied reference.
  let fit=1;
  for(const [x,z]of footprint)for(let j=0;j<shape.normals.length;j++){
   const [nx,nz]=shape.normals[j],d=x*nx+z*nz;
   if(d>0)fit=Math.min(fit,(shape.upper[j]-.055)/d);
  }
  if(options.fit)fit=Math.min(fit,options.fit(footprint));
  // A brush reduced by the available terrain must also get lower, otherwise
  // a small clipped footprint becomes a steep little spike.
  if(options.fit)height*=Math.sqrt(fit);
  const point=([x,z],rise=0)=>{
   x*=fit;z*=fit;
   return [x,baseHeight(x,z)+rise+.002,z];
  };
  const vertices=footprint.map(p=>point(p)),indices=[];
  const origin=locate(0,0),topBase=baseHeight(origin[0]*fit,origin[1]*fit)+.002;
  // An irregular, slightly tilted plateau produces a broad top plane. The
  // lower shoulders remain distinct instead of becoming little pyramids.
  const capX=options.capX??(.46+r(salt+11)*.16),capZ=options.capZ??(.27+r(salt+12)*.16);
  for(const [x,z]of rim){
   const u=x*capX+rx*.08,v=z*capZ-rz*.07,[px,pz]=locate(u,v);
   vertices.push([px*fit,topBase+height*(1+u/rx*.12-v/rz*.10),pz*fit]);
  }
  for(let j=0;j<sides;j++){
   const k=(j+1)%sides;
   indices.push(j,k,sides+j,k,sides+k,sides+j);
  }
  for(let j=1;j<sides-1;j++)indices.push(sides,sides+j,sides+j+1);
  const faces=[];
  for(let j=0;j<indices.length;j+=3){
   let [p,q,s]=indices.slice(j,j+3).map(k=>vertices[k]);
   const area=(q[0]-p[0])*(s[2]-p[2])-(q[2]-p[2])*(s[0]-p[0]);
   if(area>0)[q,s]=[s,q]; // Upward normals on every face.
   faces.push([p,q,s]);
  }
  return boundedMound(faces);
 });
}

function boundedMound(faces,extra={}){
 const vertices=faces.flat();
 return {faces,...extra,bounds:{
  minX:Math.min(...vertices.map(p=>p[0])),maxX:Math.max(...vertices.map(p=>p[0])),
  minZ:Math.min(...vertices.map(p=>p[2])),maxZ:Math.max(...vertices.map(p=>p[2])),
 }};
}

// All hill placement is in landscape coordinates. A brush can straddle any
// number of connected hill hexes; the tiles only clip the finished geometry.
function clipPolygon(polygon,planes){
 for(const [nx,nz,limit]of planes){
  const next=[];
  let a=polygon[polygon.length-1],da=a[0]*nx+a[2]*nz-limit;
  for(const b of polygon){
   const db=b[0]*nx+b[2]*nz-limit;
   if((da<=0)!==(db<=0)){const t=da/(da-db);next.push(a.map((v,i)=>v+(b[i]-v)*t))}
   if(db<=0)next.push(b);
   a=b;da=db;
  }
  polygon=next;if(polygon.length<3)return [];
 }
 return polygon;
}
function area(polygon){
 let sum=0;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];sum+=a[0]*b[2]-b[0]*a[2];
 }
 return Math.abs(sum)*.5;
}
function clippedMound(mound,planes,cx,cz,extra){
 const faces=[];
 for(const face of mound.faces){
  const polygon=clipPolygon(face,planes);
  for(let i=1;i<polygon.length-1;i++){
   const triangle=[polygon[0],polygon[i],polygon[i+1]].map(([x,y,z])=>[x-cx,y,z-cz]);
   if(area(triangle)>1e-10)faces.push(triangle);
  }
 }
 return faces.length?boundedMound(faces,extra):null;
}

export function createMapHillMounds(map,{centre,neighbour,tileShape,baseHeight,wrap=false}){
 const period=map.width*Math.sqrt(3),wrapX=x=>((x%period)+period)%period;
 const eligible=t=>t?.hills&&!['mountain','ocean','coast','lake'].includes(t.terrain)&&t.feature!=='oasis';
 const result=new Map(),records=new Map();
 for(const tile of map.tiles){
  tile.sharedHillEdges=0;
  if(!eligible(tile))continue;
  const c=centre(tile),shape=tileShape(tile);
  const joined=d=>(tile.joinedEdges&(1<<d))&&eligible(neighbour(tile,map,d));
  const planes=shape.normals.map(([nx,nz],i)=>[nx,nz,shape.upper[i]+nx*c.x+nz*c.z]);
  // Inset the outside of the hill region, including all river/coastal banks.
  // Internal edges have no inset, so a brush flows through them untouched.
  const inset=planes.map(([nx,nz,l],i)=>{
   const d=Math.floor(i/2),internal=i%2?joined(d)&&joined((d+1)%6):joined(d);
   return [nx,nz,l-(internal?0:.035)];
  });
  records.set(tile,{tile,c,planes,inset,region:-1});result.set(tile,[]);
 }
 // Never bridge two pieces of hill terrain separated by a river or flat tile.
 let region=0;
 for(const record of records.values())if(record.region<0){
  const queue=[record];record.region=region++;
  for(let i=0;i<queue.length;i++)for(let d=0;d<6;d++){
   if(!(queue[i].tile.joinedEdges&(1<<d)))continue;
   const next=records.get(neighbour(queue[i].tile,map,d));
   if(next&&next.region<0){next.region=record.region;queue.push(next)}
  }
 }
 function nearby(x,z,radius){
  const found=[],row=Math.round(z/1.5),extent=Math.ceil(radius/1.5)+1;
  for(let r=Math.max(0,row-extent);r<=Math.min(map.height-1,row+extent);r++){
   const col=Math.round(x/Math.sqrt(3)-(r%2)*.5);
   for(let q=wrap?col-extent:Math.max(0,col-extent);q<=(wrap?col+extent:Math.min(map.width-1,col+extent));q++){
    const canonical=wrap?((q%map.width)+map.width)%map.width:q;
    let record=records.get(map.tiles[r*map.width+canonical]);
    if(record&&q!==canonical){
     // A neighbour keeps its canonical identity while its planes sit beside
     // this brush. Clipping then returns tile-local faces for the usual copies.
     const offset=(q-canonical)*Math.sqrt(3);
     record={...record,c:{x:record.c.x+offset,z:record.c.z},
      planes:record.planes.map(([nx,nz,l])=>[nx,nz,l+nx*offset]),
      inset:record.inset.map(([nx,nz,l])=>[nx,nz,l+nx*offset])};
    }
    if(record&&Math.hypot(record.c.x-x,record.c.z-z)<radius+1)found.push(record);
   }
  }
  return found;
 }
 const contains=(planes,x,z)=>planes.every(([nx,nz,l])=>x*nx+z*nz<=l+1e-8);
 const outlines=[
  [[-1,-.28],[-.64,-.87],[.28,-1],[.92,-.37],[1,.22],[.40,.82],[-.43,1],[-.94,.46]],
  [[-1,-.45],[-.3,-.95],[.62,-.85],[1,-.05],[.42,.82],[-.72,.65]],
  [[-1,-.7],[.55,-.92],[1,.12],[.1,1],[-.65,.52]],
  [[-1,-.45],[.15,-.78],[1,-.1],[.48,.56],[-.65,.88]],
 ];
 const wideShape={normals:[[1,0],[-1,0],[0,1],[0,-1]],upper:[8,8,8,8]};
 let strokeId=0;
 function stroke(x,z,rx,rz,height,turn,seed,minScale=.52){
  if(wrap)x=wrapX(x);
  const near=nearby(x,z,Math.max(rx,rz)*1.5);
  const owner=near.find(r=>contains(r.inset,x,z));if(!owner)return false;
  const allowed=near.filter(r=>r.region===owner.region);
  let fitted=0;
  const fit=footprint=>{
   for(let scale=1;scale>=minScale;scale*=.90){
    const polygon=footprint.map(([u,v])=>[x+u*scale,0,z+v*scale]),total=area(polygon);
    // Compare clipped areas, not just rim samples: even a hole enclosed by a
    // big brush must stay clear. Tiny dry-corner chamfers are subpixel gaps.
    const covered=allowed.reduce((s,r)=>s+area(clipPolygon(polygon,r.inset)),0);
    if(total-covered<Math.max(2e-6,total*2e-6)){fitted=scale;return scale}
   }
   return 0;
  };
  const base=(u,v)=>{
   const r=allowed.find(r=>contains(r.planes,x+u,z+v))??owner;
   return baseHeight(r.tile,x+u-r.c.x,z+v-r.c.z);
  };
  const pseudoTile={col:seed,row:seed*7+19};
  const mound=makeHillMounds(pseudoTile,wideShape,base,{
   turn,layout:[[0,0,rx,rz,height]],outline:outlines[seed%outlines.length],
   capX:.48+random(seed,17,20)*.16,capZ:.45+random(seed,23,21)*.18,fit,
  })[0];
  if(!fitted)return false;
  const world={faces:mound.faces.map(f=>f.map(([u,y,v])=>[x+u,y,z+v]))};
  const parts=[];
  for(const record of allowed){
   const part=clippedMound(world,record.planes,record.c.x,record.c.z,{pigmentKind:owner.tile.terrain,strokeId});
   if(part)parts.push({record,part});
  }
  for(const {record,part}of parts){
   part.shared=parts.length>1;result.get(record.tile).push(part);
   for(let d=0;d<6;d++)if(record.tile.joinedEdges&(1<<d)){
    const other=parts.find(p=>p.record.tile===neighbour(record.tile,map,d));if(!other)continue;
    const [nx,nz,l]=record.planes[d*2];
    const raised=part.faces.some(f=>f.some(([u,y,v])=>Math.abs((u+record.c.x)*nx+(v+record.c.z)*nz-l)<1e-7&&y>baseHeight(record.tile,u,v)+.008));
    if(raised){record.tile.sharedHillEdges|=1<<d;other.record.tile.sharedHillEdges|=1<<((d+3)%6)}
   }
  }
  strokeId++;return true;
 }
 // Like the pigment patches: a jittered landscape field, broad gestures with
 // smaller flanks, and deliberate gaps. No hill is anchored to a hex pair.
 const spacingX=2.05,spacingZ=1.85;
 const direction=(x,z,h)=>.35+.65*Math.sin(x*.20+z*.13)+(h-.5)*1.25;
 for(let r=-1;r<=Math.ceil(map.height*1.5/spacingZ);r++)for(let q=wrap?0:-1;q<=(wrap?Math.ceil(period/spacingX)-1:Math.ceil(period/spacingX));q++){
  const h=random(q,r,600),k=random(q,r,601);if(h<.08)continue;
  const x=(q+.5)*spacingX+(h-.5)*1.55,z=(r+.5)*spacingZ+(k-.5)*1.45;
  // Borrow the pigment patches' placement, not their thin brush proportions.
  // Width tracks length so even a long hill has substantial grassy shoulders.
  const turn=direction(x,z,k),length=.90+random(q,r,602)*.95,width=length*(.68+random(q,r,603)*.22);
  const seed=Math.floor(random(q,r,604)*1000000);
  if(!stroke(x,z,length,width,.20+h*.13,turn,seed,.59))continue;
  const ca=Math.cos(turn),sa=Math.sin(turn);
  for(let j=0;j<1+Math.floor(k*3);j++){
   const a=random(q,r,610+j*3),b=random(q,r,611+j*3);
   const u=(a*2-1)*length*.95,v=(b>.5?1:-1)*(width*.8+.12+b*.24);
   const size=.30+a*.32;
   stroke(x+u*ca-v*sa,z+u*sa+v*ca,size,size*(.72+b*.22),.11+a*.10,turn+(b-.5)*1.2,seed+j+1,.62);
  }
 }
 // Fill real gaps in the relief, rather than summing overlapping footprints.
 // The earlier area threshold allowed a tiny hill to stand in for a whole
 // hill tile. Sample the visible surface and fill until a broad group reads.
 // Shuffled tiles and jittered candidates avoid reinstating a regular layout.
 const ordered=[...records.values()].sort((a,b)=>random(a.tile.col,a.tile.row,700)-random(b.tile.col,b.tile.row,700));
 for(const {tile,c}of ordered){
  const pieces=result.get(tile),shape=tileShape(tile),samples=[];
  for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){
   const salt=(i+3)*7+j+3,x=i*.23+(random(tile.col,tile.row,740+salt)-.5)*.10,z=j*.23+(random(tile.col,tile.row,800+salt)-.5)*.10;
   if(shape.normals.every(([nx,nz],k)=>x*nx+z*nz<=shape.upper[k]-.075))samples.push([x,z,baseHeight(tile,x,z)]);
  }
  const h=random(tile.col,tile.row,701),k=random(tile.col,tile.row,702),turn=direction(c.x,c.z,h),target=.63+k*.10;
  const seed=Math.floor(random(tile.col,tile.row,703)*1000000);
  for(let pass=0;pass<5;pass++){
   const vacant=samples.filter(([x,z,y])=>moundSurfaceHeight(pieces,x,z,y)<y+.028);
   if(1-vacant.length/samples.length>=target)break;
   // Start in the largest open pocket; random tie-breaking keeps the pockets
   // asymmetric. A tiny exposed corner alone does not demand another hill.
   const ranked=vacant.map(([x,z],i)=>({x,z,score:vacant.reduce((n,[u,v])=>n+(Math.hypot(u-x,v-z)<.47?1:0),0)+random(seed,i,850+pass)*3})).sort((a,b)=>b.score-a.score);
   let placed=false;
   for(let attempt=0;attempt<Math.min(6,ranked.length)&&!placed;attempt++){
    const {x,z}=ranked[attempt],a=random(seed,pass,860+attempt),b=random(seed,pass,870+attempt);
    const size=(pass===0?.69:.48)+a*(pass===0?.30:.24);
    placed=stroke(c.x+x,c.z+z,size,size*(.72+b*.22),.17+a*.11,turn+(b-.5)*1.4,seed+pass*7+attempt,.53);
   }
   if(!placed)break;
  }
  if(!pieces.length)pieces.push(...makeHillMounds(tile,shape,(x,z)=>baseHeight(tile,x,z),{
   turn,layout:[[(h-.5)*.3,(k-.5)*.3,.65,.54,.22]],outline:outlines[seed%4],
  }));
 }
 return result;
}

// Props, terrain picking and later road placement must agree with the actual
// polygon faces. Interpolate those planes, rather than a separate smooth hill.
export function moundSurfaceHeight(mounds,x,z,ground){
 let height=ground;
 for(const {faces,bounds:b}of mounds){
  if(x<b.minX-1e-8||x>b.maxX+1e-8||z<b.minZ-1e-8||z>b.maxZ+1e-8)continue;
  for(const [a,b,c]of faces){
   const d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
   const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d;
   const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;
   if(Math.min(u,v,w)>=-1e-8)height=Math.max(height,u*a[1]+v*b[1]+w*c[1]);
  }
 }
 return height;
}
