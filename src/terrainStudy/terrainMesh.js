import * as T from 'three';
import { centre, isWater, baseSurfaceHeight, hillMounds, tileShape, BANK_TOE } from './surface.js';
import { flatWater } from './water.js';

// A small library of irregular triangulations avoids concentric hex fans.
// The flat tile topology is shared across the board. Hill polygons are added
// explicitly so each mound retains its few broad planes.
function triangulate(points) {
  const p = [...points, [-20,-10], [20,-10], [0,20]], n = points.length;
  function face(a,b,c) {
    const [ax,ay]=p[a], [bx,by]=p[b], [cx,cy]=p[c];
    const d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by));
    if(Math.abs(d)<1e-10)return {indices:[a,b,c],circle:null};
    const aa=ax*ax+ay*ay,bb=bx*bx+by*by,cc=cx*cx+cy*cy;
    const ux=(aa*(by-cy)+bb*(cy-ay)+cc*(ay-by))/d;
    const uy=(aa*(cx-bx)+bb*(ax-cx)+cc*(bx-ax))/d;
    return {indices:[a,b,c],circle:[ux,uy,(ax-ux)**2+(ay-uy)**2+1e-10]};
  }
  // A live face is tested against many later points. Its circumcircle is
  // immutable; compute it once instead of repeating the determinant/divides.
  let faces = [face(n,n+1,n+2)];
  for(let i=0;i<n;i++){
    const edges=new Map(),keep=[];
    for(const current of faces){
      const circle=current.circle,[x,y]=p[i];
      if(!circle||(x-circle[0])**2+(y-circle[1])**2>circle[2]){keep.push(current);continue}
      for(let j=0;j<3;j++){
        const a=current.indices[j],b=current.indices[(j+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;
        if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);
      }
    }
    faces=keep.concat([...edges.values()].map(([a,b])=>face(a,b,i)));
  }
  return faces.map(f=>f.indices).filter(f=>f.every(i=>i<n)).flatMap(([a,b,c])=>{
    const area=(p[b][0]-p[a][0])*(p[c][1]-p[a][1])-(p[b][1]-p[a][1])*(p[c][0]-p[a][0]);
    return area>0?[a,c,b]:[a,b,c];
  });
}
const topologies=new Map();
function topology(tile,distant=false) {
  const variant=(tile.col*3+tile.row*5)%8;
  const key=`${tile.riverEdges||0}:${tile.shoreEdges||0}:${tile.joinedEdges||0}:${variant}:${distant}`;
  if(topologies.has(key))return topologies.get(key);
  const shape=tileShape(tile),points=[],toes=[];
  // Explicit vertices on the crest and toe keep river cuts straight. Sampling
  // an unaligned grid at the waterline used to produce a serrated bank.
  for(let side=0;side<shape.top.length;side++)for(let j=0;j<2;j++){
    const a=shape.top[side],b=shape.top[(side+1)%shape.top.length],t=j/2;
    const la=shape.toe[side],lb=shape.toe[(side+1)%shape.toe.length];
    points.push([a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t]);
    toes.push([la[0]*(1-t)+lb[0]*t,la[1]*(1-t)+lb[1]*t]);
  }
  const spacing=distant?.45:.17,extent=distant?2:5;
  for(let row=-extent;row<=extent;row++)for(let col=-extent;col<=extent;col++){
    const x=col*spacing+(row%2)*spacing*.5+.025*Math.sin(col*13+row*17+variant*8);
    const z=row*spacing+.025*Math.sin(col*21+row*11+variant*3);
    if(shape.normals.every(([nx,nz],i)=>x*nx+z*nz<shape.upper[i]-.035))points.push([x,z]);
  }
  const result={points,toes,indices:triangulate(points)};
  topologies.set(key,result);return result;
}

export function terrainMesh(tile,{distant=false}={}){
  // The oasis basin intersects its pool. Keep that cut exact at every zoom.
  distant=distant&&tile.feature!=='oasis';
  const c=centre(tile),sides=[];
  if(isWater(tile)){
    const empty=new T.BufferGeometry();
    empty.setAttribute('position',new T.Float32BufferAttribute([],3));empty.computeVertexNormals();
    return [flatWater(tile),empty];
  }
  const {points,toes,indices}=topology(tile,distant),v=[],colors=[];
  for(const [x,z] of points){
    v.push(x+c.x,baseSurfaceHeight(tile,x,z),z+c.z);
    const pigment=.985+.018*Math.sin((c.x+x)*2.1+Math.cos((c.z+z)*1.8));
    colors.push(pigment,pigment,pigment*.985);
  }
  const indexed=new T.BufferGeometry();
  indexed.setAttribute('position',new T.Float32BufferAttribute(v,3));
  indexed.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  indexed.setIndex(indices);
  const top=indexed.toNonIndexed();indexed.dispose();
  top.userData.plateVertexCount=top.attributes.position.count;
  const mounds=hillMounds(tile);
  if(mounds.length){
    const positions=top.attributes.position.array,colors=top.attributes.color.array;
    const length=positions.length+mounds.reduce((n,m)=>n+m.faces.length*9,0);
    const topVertices=new Float32Array(length),topColors=new Float32Array(length);
    topVertices.set(positions);topColors.set(colors);
    let offset=positions.length;
    top.userData.moundPigments=[];
    for(const {faces,pigmentKind}of mounds){
      for(const face of faces)for(const [x,y,z]of face){
       topVertices.set([c.x+x,y,c.z+z],offset);
       topColors.set([.985,.985,.970],offset);offset+=3;
      }
      top.userData.moundPigments.push({end:offset/3,kind:pigmentKind});
    }
    top.setAttribute('position',new T.BufferAttribute(topVertices,3));
    top.setAttribute('color',new T.BufferAttribute(topColors,3));
  }
  top.computeVertexNormals();
  for(let i=0;i<toes.length;i++){
    const plane=(Math.floor(i/2)+1)%12;
    // Interior land joins need neither a visible skirt nor a shadow caster.
    if(plane%2===0&&((tile.joinedEdges||0)&(1<<(plane/2)))
      &&!((tile.bankJoinEdges||0)&(1<<(plane/2))))continue;
    const next=(i+1)%toes.length;
    const a=v.slice(i*3,i*3+3),b=v.slice(next*3,next*3+3);
    const la=[toes[i][0]+c.x,BANK_TOE,toes[i][1]+c.z];
    const lb=[toes[next][0]+c.x,BANK_TOE,toes[next][1]+c.z];
    sides.push(...a,...b,...la,...b,...lb,...la);
    sides.push(...la,...lb,la[0],-.13,la[2],...lb,lb[0],-.13,lb[2],la[0],-.13,la[2]);
  }
  const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(sides,3));skirt.computeVertexNormals();
  return [top,skirt];
}
