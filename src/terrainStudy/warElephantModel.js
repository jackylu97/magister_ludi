import * as T from 'three';

// A carved elephant finial, on the same enamel socket as the chess knights.
// The forehead, chest and curled trunk share one silhouette. Its broad ears
// and paired tusks distinguish it without requiring a miniature rider.
export function addWarElephant(kit){
 const {group,mesh,cylinder,ring,rod,box,owner,ownerShade,ivory,gold,dark}=kit;
 const seat=[[.26,.23],[.27,.29],[.265,.33],[.295,.38],[.315,.40],[.315,.43]];
 mesh('Elephant low enamel socket',new T.LatheGeometry(seat.map(p=>new T.Vector2(...p)),16),owner);
 cylinder('Elephant solid socket',.315,.025,owner,0,.417);
 cylinder('Elephant socket recess',.262,.022,ownerShade,0,.264);
 ring('Elephant gilt seat bead',.266,.294);
 ring('Elephant gilt socket rim',.315,.425,gold,0,0,.006);
 const firstSculpturePart=group.children.length;

 // Coordinates are front/back and height, viewed from the side. A short,
 // broad curl belongs to the forehead instead of projecting like a nozzle.
 const profile=[
  [-.205,.423],[-.263,.590],[-.263,.780],[-.234,.966],
  [-.234,1.115],[-.183,1.257],[-.093,1.331],[.020,1.360],
  [.145,1.335],[.254,1.257],[.296,1.119],[.312,.963],
  [.335,.813],[.393,.736],[.463,.747],[.493,.841],
  [.531,.860],[.561,.813],[.545,.709],[.480,.646],
  [.383,.638],[.293,.701],[.232,.820],[.165,.821],
  [.176,.650],[.219,.521],[.215,.423],
 ];
 const core=new T.ExtrudeGeometry(new T.Shape(profile.map(p=>new T.Vector2(...p))),{
  depth:.290,steps:1,bevelEnabled:true,bevelSegments:1,
  bevelSize:.028,bevelThickness:.031,curveSegments:1,
 });
 core.translate(0,0,-.145);core.rotateY(-Math.PI/2);
 const p=core.getAttribute('position');
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),z=p.getZ(i);
  const shoulders=T.MathUtils.lerp(1.57,1.16,T.MathUtils.clamp((y-.60)/.63,0,1));
  const trunk=T.MathUtils.smoothstep(z,.245,.385);
  const width=T.MathUtils.lerp(shoulders,.50,trunk);
  p.setX(i,p.getX(i)*width);
 }
 core.computeVertexNormals();
 mesh('Continuous carved elephant and curled trunk',core,ivory);

 // Flat, deliberately lobed ear planes, each flaring out from the head.
 const earOutline=[
  [.089,1.191],[-.022,1.253],[-.175,1.255],[-.298,1.170],
  [-.338,1.018],[-.285,.873],[-.181,.810],[-.059,.854],[.086,1.015],
 ];
 for(const side of [-1,1]){
  const ear=new T.ExtrudeGeometry(new T.Shape(earOutline.map(v=>new T.Vector2(...v))),{
   depth:.040,steps:1,bevelEnabled:true,bevelSegments:1,
   bevelSize:.017,bevelThickness:.012,curveSegments:1,
  });
  ear.translate(0,0,-.020);ear.rotateY(-Math.PI/2);
  const ep=ear.getAttribute('position');
  for(let i=0;i<ep.count;i++){
   const y=ep.getY(i),z=ep.getZ(i);
   const flare=.028+Math.max(0,-z)*.26+Math.max(0,1.16-y)*.18;
   ep.setX(i,ep.getX(i)+side*(.203+flare));
   ep.setY(i,1.10+(y-1.10)*.88);
   ep.setZ(i,.045+(z-.045)*.88);
  }
  ear.computeVertexNormals();
  mesh(`Elephant carved ear ${side}`,ear,ivory);

  // Tapered ivory arcs originate at the cheeks, outside the thick trunk.
  const tuskPoints=[
   [side*.159,.919,.249],[side*.201,.849,.343],
   [side*.216,.844,.437],[side*.210,.905,.502],
   [side*.192,.953,.512],
  ];
  const radii=[.036,.030,.024,.014,.0015];
  const vertices=[],rings=[];
  for(let j=0;j<tuskPoints.length;j++){
   const c=new T.Vector3(...tuskPoints[j]);
   const before=new T.Vector3(...tuskPoints[Math.max(0,j-1)]);
   const after=new T.Vector3(...tuskPoints[Math.min(tuskPoints.length-1,j+1)]);
   const tangent=after.sub(before).normalize();
   const across=new T.Vector3(1,0,0).cross(tangent).normalize();
   const other=tangent.clone().cross(across).normalize();
   const row=[];
   for(let k=0;k<7;k++){
    const a=k*Math.PI*2/7;
    row.push(c.clone().addScaledVector(across,Math.cos(a)*radii[j]).addScaledVector(other,Math.sin(a)*radii[j]).toArray());
   }
   rings.push(row);
  }
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<7;k++){
   const n=(k+1)%7,a=rings[j][k],b=rings[j][n],c=rings[j+1][n],d=rings[j+1][k];
   vertices.push(...a,...b,...c,...a,...c,...d);
  }
  const tusk=new T.BufferGeometry();tusk.setAttribute('position',new T.Float32BufferAttribute(vertices,3));tusk.computeVertexNormals();
  mesh(`Elephant upward ivory tusk ${side}`,tusk,ivory);
  const eye=box(`Elephant small incised eye ${side}`,[.008,.014,.034],dark,side*.229,1.153,.173);
  eye.rotation.y=-side*.37;eye.rotation.x=.18;
 }

 // A single enamel brow cloth is enough military dress for this simple kit.
 // It follows the broad head rather than becoming another crown or rider.
 const clothPositions=[],clothRows=[];
 const probe=new T.Mesh(core,ivory);probe.updateMatrixWorld();
 const ray=new T.Raycaster(),forward=new T.Vector3(0,0,-1);
 const foreheadPoint=(x,y)=>{
  ray.set(new T.Vector3(x,y,2),forward);
  const hit=ray.intersectObject(probe,false)[0];
  return [x,y,(hit?hit.point.z:.30)+.007];
 };
 for(const [y,w] of [[1.302,.167],[1.278,.160],[1.257,.151],[1.235,.142],[1.120,.088],[1.109,.083],[1.030,0]]){
  clothRows.push([-1,-.5,0,.5,1].map(s=>foreheadPoint(s*w,y)));
 }
 const clothTriangle=(a,b,c)=>{
  clothPositions.push(...a,...b,...c,...c,...b,...a);
 };
 for(let r=0;r<clothRows.length-1;r++)for(let c=0;c<4;c++){
  const a=clothRows[r][c],b=clothRows[r][c+1],d=clothRows[r+1][c],e=clothRows[r+1][c+1];
  if(r===clothRows.length-2)clothTriangle(a,d,b);
  else{clothTriangle(a,d,e);clothTriangle(a,e,b)}
 }
 const cloth=new T.BufferGeometry();cloth.setAttribute('position',new T.Float32BufferAttribute(clothPositions,3));cloth.computeVertexNormals();
 mesh('Elephant enamel war brow cloth',cloth,owner);
 for(const side of [0,4])for(let r=0;r<clothRows.length-1;r++){
  rod(`Elephant gilt brow edging ${side} ${r}`,clothRows[r][side],clothRows[r+1][side],.005,gold,4);
 }
 const sealPoint=foreheadPoint(0,1.218);
 const insignia=box('Elephant small gilt brow diamond',[.047,.047,.010],gold,sealPoint[0],sealPoint[1],sealPoint[2]+.005);insignia.rotation.z=Math.PI/4;

 const parts=group.children.slice(firstSculpturePart),bust=new T.Group();
 bust.name='Carved chess war elephant';bust.rotation.y=-.46;group.add(bust);
 // Slim the finial while retaining its height and the common plinth. Moving
 // the complete sculpture together preserves cloth, eye and tusk attachments.
 bust.scale.set(.80,1,.87);
 for(const part of parts)bust.add(part);
}
