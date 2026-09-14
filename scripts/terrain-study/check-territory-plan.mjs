// node scripts/terrain-study/check-territory-plan.mjs
import assert from 'node:assert/strict';
import {Color} from 'three';
import {createTerritoryPlan,createTerritoriesPlan,TERRITORY_INSET,TERRITORY_WIDTH,TERRITORY_PRIMARY_WIDTH,TERRITORY_SECONDARY_WIDTH} from '../../src/terrainStudy/territoryPlan.js';
import {centre,neighbour} from '../../src/terrainStudy/surface.js';

const EPS=1e-8,HEX_AREA=3*Math.sqrt(3)/2;
const makeMap=(width,height)=>({width,height,tiles:Array.from({length:width*height},(_,i)=>({col:i%width,row:Math.floor(i/width),terrain:'grassland'}))});
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<EPS,`${message}: ${a} versus ${b}`);
const key=p=>p.map(n=>Math.round(n*1e7)).join(',');
const segmentKey=(a,b)=>[key(a),key(b)].sort().join('|');
const insideHex=(point,tile)=>{
 const c=centre(tile),x=point[0]-c.x,z=point[1]-c.z;
 return Array.from({length:6},(_,i)=>i*Math.PI/3).every(a=>x*Math.cos(a)+z*Math.sin(a)<=Math.sqrt(3)/2+EPS);
};
const insideConvex=(p,polygon)=>polygon.every((a,i)=>cross(a,polygon[(i+1)%polygon.length],p)>=-EPS);
const intersects=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-EPS&&cross(c,d,a)*cross(c,d,b)<-EPS;
let checks=0,quads=0;
function check(map,owned,expectedLoops){
 const before=JSON.stringify(map),plan=createTerritoryPlan(map,owned),set=new Set(owned);
 assert.equal(JSON.stringify(map),before,'planning must not mutate the map');
 if(expectedLoops!==undefined)assert.equal(plan.loops.length,expectedLoops,'island / hole count');
 assert.deepEqual(createTerritoryPlan(map,[...owned].reverse().flatMap(t=>[t,{...t}])),plan,'ownership order and duplicate tiles must not affect the result');
 close(plan.loops.reduce((s,p)=>s+area(p),0),set.size*HEX_AREA,'signed perimeter area must equal owned hex area');
 const expectedBoundary=new Set();let expectedEdges=0;
 for(const tile of set)for(let d=0;d<6;d++)if(!set.has(neighbour(tile,map,d))){expectedBoundary.add(tile);expectedEdges++}
 assert.deepEqual(new Set(plan.tiles),expectedBoundary,'only boundary owner tiles should be touched');
 assert.equal(plan.polygons.length,expectedEdges,'one ribbon quad per exposed edge, no internal edges');
 assert.equal(plan.loops.reduce((s,p)=>s+p.length,0),expectedEdges);
 const seenEdges=new Set(),ribbonEdges=new Map();let cursor=0;
 for(const loop of plan.loops){
  assert.ok(loop.length>=6);assert.notEqual(key(loop[0]),key(loop.at(-1)),'loop must not repeat its last point');
  for(let i=0;i<loop.length;i++){
   const a=loop[i],b=loop[(i+1)%loop.length],q=plan.polygons[cursor+i],edge=segmentKey(a,b);
   assert.ok(!seenEdges.has(edge),'duplicate perimeter segment');seenEdges.add(edge);
   close(Math.hypot(b[0]-a[0],b[1]-a[1]),1,'hex perimeter edge length');
   const distance=p=>cross(a,b,p); // Original edges have unit length.
   close(distance(q[0]),TERRITORY_INSET,'outer rail inset');close(distance(q[1]),TERRITORY_INSET,'outer rail inset');
   close(distance(q[2]),TERRITORY_INSET+TERRITORY_WIDTH,'inner rail inset');close(distance(q[3]),TERRITORY_INSET+TERRITORY_WIDTH,'inner rail inset');
   const next=plan.polygons[cursor+(i+1)%loop.length];
   assert.equal(q[1],next[0],'adjacent quads must share the same outer miter vertex');
   assert.equal(q[2],next[3],'adjacent quads must share the same inner miter vertex');
   assert.ok(area(q)>EPS,'ribbon must be positive-area, CCW');
   assert.ok(q.every((p,j)=>cross(p,q[(j+1)%4],q[(j+2)%4])>EPS),'ribbon must stay strictly convex');
   assert.ok(q.flat().every(Number.isFinite));
   // Probe the entire quad, including miter corners, against the actual union.
   for(let s=0;s<=4;s++)for(let t=0;t<=4;t++){
    const u=s/4,v=t/4,point=[0,1].map(k=>(q[0][k]*(1-u)+q[1][k]*u)*(1-v)+(q[3][k]*(1-u)+q[2][k]*u)*v);
    assert.ok([...set].some(tile=>insideHex(point,tile)),'ribbon leaks outside owned land');
    assert.ok([...plan.tiles].some(tile=>insideHex(point,tile)),'touched tiles omit part of the ribbon');
   }
   for(let j=0;j<q.length;j++){const k=segmentKey(q[j],q[(j+1)%q.length]);ribbonEdges.set(k,(ribbonEdges.get(k)||0)+1)}
  }
  cursor+=loop.length;
 }
 // Joining caps occur twice; every inner / outer rail edge occurs once.
 assert.equal([...ribbonEdges.values()].filter(n=>n===2).length,expectedEdges,'each miter cap must be joined exactly twice');
 assert.equal([...ribbonEdges.values()].filter(n=>n===1).length,expectedEdges*2,'both rails must be uninterrupted loops');
 assert.ok([...ribbonEdges.values()].every(n=>n<=2));
 for(let i=0;i<plan.polygons.length;i++)for(let j=i+1;j<plan.polygons.length;j++){
  const a=plan.polygons[i],b=plan.polygons[j];
  for(let m=0;m<4;m++)for(let n=0;n<4;n++)assert.ok(!intersects(a[m],a[(m+1)%4],b[n],b[(n+1)%4]),'ribbon edges intersect');
  const centreOf=p=>[0,1].map(k=>p.reduce((s,v)=>s+v[k],0)/p.length);
  assert.ok(!insideConvex(centreOf(a),b)&&!insideConvex(centreOf(b),a),'ribbons overlap instead of meeting at shared caps');
 }
 checks++;quads+=plan.polygons.length;return plan;
}
const map=makeMap(9,9),tile=(col,row)=>map.tiles[row*map.width+col],middle=tile(4,4);
check(map,[],0);check(map,[middle],1);check(map,[middle,neighbour(middle,map,0)],1);
const ring=Array.from({length:6},(_,d)=>neighbour(middle,map,d));
const hole=check(map,ring,2);assert.equal(hole.loops.filter(p=>area(p)<0).length,1,'hole must have clockwise winding');
check(map,[middle,...ring],1);
check(map,[middle,ring[0],ring[1],ring[3]],1); // Convex and concave corners.
check(map,[tile(0,0),tile(8,8),middle],3);
check(map,map.tiles,1); // A filled map should have no interior grid borders.
check(map,map.tiles.filter(t=>t.col===0||t.row===0||t.col===8||t.row===8),2);

// Repeat an asymmetric axial fixture after rotation and translation, including
// odd-row offsets. Topology, perimeter and ribbon area must remain invariant.
const axial=[[0,0],[1,0],[1,-1],[2,-1],[0,1],[-1,1]],transformedMap=makeMap(20,20);
let originalArea;
for(let turns=0;turns<6;turns++)for(const [offsetQ,offsetR]of [[6,6],[6,7],[9,10]]){
 const transformed=axial.map(pair=>{
  let [q,r]=pair;for(let n=0;n<turns;n++)[q,r]=[-r,q+r];q+=offsetQ;r+=offsetR;
  const col=q+(r-r%2)/2;return transformedMap.tiles[r*transformedMap.width+col];
 });
 const plan=check(transformedMap,transformed,1),paintedArea=plan.polygons.reduce((s,p)=>s+area(p),0);
 if(originalArea===undefined)originalArea=paintedArea;else close(paintedArea,originalArea,'rotation and translation must preserve ribbon area');
}
// Exhaustive local ownership catches narrow concavities and boundary cases.
const small=makeMap(3,3);
for(let mask=1;mask<512;mask++)check(small,small.tiles.filter((_,i)=>mask&(1<<i)));

let ownerFixtures=0;
function checkOwners(records,expectedOwners,expectedSharedEdges){
 const before=JSON.stringify({map,records}),plan=createTerritoriesPlan(map,records);
 assert.equal(JSON.stringify({map,records}),before,'multi-owner planning must not mutate map or ownership');
 assert.equal(plan.territories.length,expectedOwners);
 assert.deepEqual(createTerritoriesPlan(map,[...records].reverse().map(r=>({...r,tiles:[...r.tiles].reverse().map(t=>({...t}))}))),plan,'owner / tile input order must not change the result');
 assert.deepEqual(plan.loops,plan.territories.flatMap(t=>t.loops));
 assert.deepEqual(plan.polygons,plan.territories.flatMap(t=>t.polygons));
 assert.deepEqual(plan.tiles,new Set(plan.territories.flatMap(t=>[...t.tiles])));
 const borders=new Map();
 for(const territory of plan.territories){
  const owned=[...new Set(records.filter(r=>r.id===territory.id).flatMap(r=>[...r.tiles]).map(t=>tile(t.col,t.row)))];
  assert.deepEqual(territory.colors,records.find(r=>r.id===territory.id).colors.map(c=>'#'+new Color(c).getHexString()));
  const {loops,polygons,tiles,bands}=territory,legacy=check(map,owned);
  assert.deepEqual(loops,legacy.loops,'paired bands must retain the merged land perimeter');
  assert.deepEqual(tiles,legacy.tiles);
  assert.equal(bands.length,2);assert.deepEqual(bands.map(b=>b.color),territory.colors);
  assert.deepEqual(polygons,bands.flatMap(b=>b.polygons));
  assert.ok(bands.every(b=>b.polygons.length===legacy.polygons.length),'both colours must run around the full perimeter');
  let cursor=0;
  for(const loop of loops){
   for(let i=0;i<loop.length;i++){
    const a=loop[i],b=loop[(i+1)%loop.length],key=segmentKey(a,b),primary=bands[0].polygons[cursor+i],secondary=bands[1].polygons[cursor+i];
    assert.equal(primary[3],secondary[0],'colours must share the same middle rail vertex');
    assert.equal(primary[2],secondary[1],'colours must share the same middle rail vertex');
    const envelope=[primary[0],primary[1],secondary[2],secondary[3]];
    close(area(primary)+area(secondary),area(envelope),'paired colours must exactly fill the .08 ribbon');
    for(let band=0;band<2;band++){
     const q=bands[band].polygons[cursor+i],next=bands[band].polygons[cursor+(i+1)%loop.length];
     const outer=TERRITORY_INSET+(band?TERRITORY_PRIMARY_WIDTH:0),inner=outer+(band?TERRITORY_SECONDARY_WIDTH:TERRITORY_PRIMARY_WIDTH);
     for(const index of [0,1])close(cross(a,b,q[index]),outer,'paired outer rail inset');
     for(const index of [2,3])close(cross(a,b,q[index]),inner,'paired inner rail inset');
     assert.equal(q[1],next[0],'both colour bands must join at corners');
     assert.equal(q[2],next[3],'both colour bands must join at corners');
     assert.ok(q.every((p,j)=>cross(p,q[(j+1)%4],q[(j+2)%4])>EPS),'paired quad must be convex and CCW');
     for(let s=0;s<=4;s++)for(let t=0;t<=4;t++){
      const u=s/4,v=t/4,p=[0,1].map(k=>(q[0][k]*(1-u)+q[1][k]*u)*(1-v)+(q[3][k]*(1-u)+q[2][k]*u)*v);
      assert.ok(owned.some(tile=>insideHex(p,tile)),'paired ribbon leaks outside its owner');
     }
    }
    if(!borders.has(key))borders.set(key,[]);
    borders.get(key).push({a,b,polygon:envelope,id:territory.id});
   }
   cursor+=loop.length;
  }
  // Shared edges are permitted; any proper crossing or interior overlap is not.
  const strictlyInside=(p,q)=>q.every((a,i)=>cross(a,q[(i+1)%4],p)>EPS);
  for(const a of bands[0].polygons)for(const b of bands[1].polygons){
   for(let m=0;m<4;m++)for(let n=0;n<4;n++)assert.ok(!intersects(a[m],a[(m+1)%4],b[n],b[(n+1)%4]),'paired bands cross at a corner');
   assert.ok(!a.some(p=>strictlyInside(p,b))&&!b.some(p=>strictlyInside(p,a)),'paired colours overlap');
  }
 }
 const shared=[...borders.values()].filter(owners=>owners.length>1);
 assert.equal(shared.length,expectedSharedEdges,'touching owners must retain their common borders');
 for(const pair of shared){
  assert.equal(pair.length,2);const [a,b]=pair;
  assert.notEqual(a.id,b.id);assert.equal(key(a.a),key(b.b));assert.equal(key(a.b),key(b.a));
  // Opposite inward rails leave a gap; neither colour spills into its neighbour.
  assert.ok(a.polygon.every(p=>cross(a.a,a.b,p)>=TERRITORY_INSET-EPS));
  assert.ok(b.polygon.every(p=>cross(a.a,a.b,p)<=-TERRITORY_INSET+EPS));
 }
 for(let i=0;i<plan.territories.length;i++)for(let j=i+1;j<plan.territories.length;j++){
  for(const a of plan.territories[i].polygons)for(const b of plan.territories[j].polygons){
   for(let m=0;m<4;m++)for(let n=0;n<4;n++)assert.ok(!intersects(a[m],a[(m+1)%4],b[n],b[(n+1)%4]),'different owner ribbons intersect');
   assert.ok(!a.some(p=>insideConvex(p,b))&&!b.some(p=>insideConvex(p,a)),'different owner ribbons overlap at a corner');
  }
 }
 ownerFixtures++;return plan;
}
checkOwners([],0,0);
const first={id:'enamel',colors:['#31507f','#d7d7dd'],tiles:[middle]},second={id:'vermilion',colors:['#bc5748','#eddbb5'],tiles:[ring[0]]},third={id:'ochre',colors:['#bc923f','#324e56'],tiles:[ring[1]]};
checkOwners([first,second],2,1);
checkOwners([first,second,third],3,3); // Three owners meet at one hex vertex.
checkOwners([first,{...second,colors:first.colors}],2,1); // Colour is not identity.
const merged=checkOwners([first,{...first,tiles:[ring[0],{...middle}]},{...third,tiles:[tile(8,8)]}],2,0);
assert.equal(merged.territories.find(t=>t.id===first.id).polygons.length,20,'adjacent same-owner cities need two bands and no internal edge');
const surrounded=checkOwners([{...first,tiles:ring},{...second,tiles:[middle]}],2,6);
assert.equal(surrounded.territories[0].loops.filter(p=>area(p)<0).length,1,'enclosed other owner must preserve the hole winding');
checkOwners([{...first,tiles:[middle,ring[0],ring[1],ring[3],tile(0,0)]}],1,0); // Concave joins and an island, in both colours.
const numeric=checkOwners([{...first,id:12},{...second,id:2}],2,1);
assert.deepEqual(numeric.territories.map(t=>t.id),[2,12],'numeric owner IDs must have stable numeric order');
checkOwners([{...first,colors:[0x31507f,new Color('#d7d7dd')]},first],1,0);
checkOwners([{...first,colors:['#AbC','silver']},{...first,colors:['#aabbcc',0xc0c0c0],tiles:[ring[0]]}],1,0);
assert.throws(()=>createTerritoriesPlan(map,[first,{...second,tiles:[{...middle}]}]),/claimed by multiple owners/,'canonical copies must not bypass conflicting claims');
assert.throws(()=>createTerritoriesPlan(map,[first,{...first,colors:[...first.colors].reverse(),tiles:[ring[0]]}]),/Inconsistent territory colour pair/,'one owner cannot reverse the primary / secondary roles');
assert.throws(()=>createTerritoriesPlan(map,[first,{...first,colors:[first.colors[0],'#ffffff'],tiles:[ring[0]]}]),/Inconsistent territory colour pair/,'one owner cannot silently switch one colour');
for(const colors of [undefined,[],['#ffffff'],['#ffffff','#000000','#888888']])assert.throws(()=>createTerritoriesPlan(map,[{...first,colors}]),/exactly two colours/);
for(const color of ['',null,'bad-colour','#gggggg',NaN,-1,0x1000000])assert.throws(()=>createTerritoriesPlan(map,[{...first,colors:[color,'#ffffff']}]),/Territory colours must/,'invalid colours must not silently render white');
assert.throws(()=>createTerritoriesPlan(map,[{...first,id:{name:'owner'}}]),/owner ID/,'IDs must have a stable sortable identity');
console.log(JSON.stringify({fixtures:checks,ownerFixtures,ribbonQuads:quads,inset:TERRITORY_INSET,legacyWidth:TERRITORY_WIDTH,pairedWidths:[TERRITORY_PRIMARY_WIDTH,TERRITORY_SECONDARY_WIDTH],topology:'two joined colour bands per owner, including holes, islands and shared borders'},null,2));
