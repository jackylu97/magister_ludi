// Three study meshes in the painted board's coordinate system. Each base sits at y = 0.
import { BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry, Vector3, Quaternion, Float32BufferAttribute, Color } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const stone = '#d4bf93', litStone = '#efdab0', shadowStone = '#857961', blue = '#314d52';
const bronze = '#89593a', brass = '#dfaa53', teal = '#39716f', tile = '#994e3f';

export function wonderSculpt(name) {
  const parts = [];
  function place(g, color, x, y, z, rotation = [0, 0, 0]) {
    g.rotateX(rotation[0]); g.rotateY(rotation[1]); g.rotateZ(rotation[2]); g.translate(x, y, z);
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    flat.computeVertexNormals();
    flat.deleteAttribute('uv');
    const paint = new Color(color), rgb = [];
    for (let i = 0; i < flat.getAttribute('position').count; ++i) rgb.push(paint.r, paint.g, paint.b);
    flat.setAttribute('color', new Float32BufferAttribute(rgb, 3)); parts.push(flat);
  }
  const box = (x,y,z,w,h,d,c,rz=0) => place(new BoxGeometry(w,h,d),c,x,y,z,[0,0,rz]);
  const round = (x,y,z,r0,r1,h,c,sides=8) => place(new CylinderGeometry(r1,r0,h,sides),c,x,y,z,[0,Math.PI/sides,0]);
  function bar(a,b,r,c) {
    const delta = new Vector3(...b).sub(new Vector3(...a)), mid = new Vector3(...a).add(new Vector3(...b)).multiplyScalar(.5);
    const g = new CylinderGeometry(r,r,delta.length(),6);
    g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),delta.normalize()));
    place(g,c,mid.x,mid.y,mid.z);
  }
  if (name === 'gate') {
    box(0,.05,0,1,.10,.64,shadowStone); box(0,.13,0,.92,.08,.56,litStone);
    for(const sign of [-1,1]) {
      const x=sign*.335;
      box(x,.24,0,.28,.16,.43,stone); box(x,.35,0,.25,.055,.42,brass);
      box(x,.59,0,.23,.46,.37,stone); box(x,.83,0,.27,.08,.41,litStone);
      box(x,.57,.19,.038,.35,.026,tile); box(x,.57,-.19,.038,.35,.026,tile);
    }
    const count=9, cy=.855;
    for(let i=0;i<count;i++) {
      const angle=(i+.5)*Math.PI/count;
      box(.332*Math.cos(angle),cy+.332*Math.sin(angle),0,.13,.187,.40,i===4?brass:(i%2?litStone:stone),angle-Math.PI/2);
    }
    box(0,1.265,0,.16,.11,.36,bronze);
    place(new CylinderGeometry(.158,.158,.10,12),brass,0,1.446,0,[Math.PI/2,0,0]);
    place(new CylinderGeometry(.100,.100,.11,12),tile,0,1.446,0,[Math.PI/2,0,0]);
  } else if (name === 'dial') {
    round(0,.06,0,.51,.48,.12,shadowStone);round(0,.15,0,.44,.41,.09,litStone);
    round(0,.35,0,.25,.17,.34,teal);round(0,.54,0,.22,.22,.06,brass);
    for(const s of [-1,1]) bar([s*.12,.51,0],[s*.375,.80,0],.047,bronze);
    place(new TorusGeometry(.40,.072,6,24),teal,0,1.00,0,[0,.10,0]);
    place(new TorusGeometry(.407,.023,5,24),brass,0,1.00,.055,[0,.10,0]);
    bar([-.314,.75,.06],[.36,1.37,.06],.045,brass);
    place(new SphereGeometry(.108,10,6),litStone,0,1,.07);
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]) box(.40*Math.cos(a),1+.40*Math.sin(a),.015,.115,.115,.145,brass,a);
  } else if (name === 'lantern') {
    round(0,.065,0,.51,.49,.13,shadowStone);round(0,.17,0,.43,.38,.08,stone);
    round(0,.34,0,.345,.32,.28,blue);round(0,.505,0,.36,.38,.065,brass);
    round(0,.575,0,.44,.435,.085,litStone);
    for(let i=0;i<6;++i) {
      const a=i*Math.PI/3+Math.PI/6, x=.30*Math.cos(a), z=.30*Math.sin(a);
      round(x,.83,z,.043,.041,.47,stone,6);
    }
    round(0,.72,0,.15,.11,.18,bronze);round(0,.845,0,.095,.15,.17,'#eca745',6);
    round(0,.977,0,.15,.025,.12,'#f3d186',6);
    round(0,1.085,0,.47,.45,.085,brass);round(0,1.24,0,.48,.14,.24,blue);
    round(0,1.395,0,.14,.09,.075,teal);round(0,1.48,0,.095,.008,.13,brass);
  } else throw new Error('Unknown city landmark');
  const result = mergeGeometries(parts); for(const part of parts) part.dispose();
  result.rotateY(-.24); result.computeBoundingBox(); result.computeBoundingSphere(); return result;
}
