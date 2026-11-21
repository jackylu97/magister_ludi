import {
  BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute,
  Quaternion, SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const WONDER_LANDMARKS = ['sun-gate', 'lantern-tower', 'meridian-dial'] as const;
export type WonderLandmark = typeof WONDER_LANDMARKS[number];

export function wonderLandmarkForAge(age: number): WonderLandmark {
  if (age >= 4) return 'meridian-dial';
  return age === 3 ? 'lantern-tower' : 'sun-gate';
}

type Point = [number, number, number];
const stone = '#d4bf93', ivory = '#efdab0', plinth = '#857961', slate = '#314d52';
const bronze = '#89593a', brass = '#dfaa53', verdigris = '#39716f', clay = '#994e3f';

/** Bake each landmark into one coloured mesh so cities can share its draw call. */
export function wonderGeometry(name: WonderLandmark): BufferGeometry {
  const parts: BufferGeometry[] = [];
  function place(shape: BufferGeometry, pigment: string, x: number, y: number, z: number, rotation: Point = [0, 0, 0]) {
    shape.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]).translate(x, y, z);
    const flat = shape.index ? shape.toNonIndexed() : shape;
    if (flat !== shape) shape.dispose();
    flat.computeVertexNormals();
    const positions = flat.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const color = new Color(pigment);
    for (let i = 0; i < positions.count; i++) color.toArray(colors, i * 3);
    flat.setAttribute('color', new Float32BufferAttribute(colors, 3));
    parts.push(flat);
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, tilt = 0) {
    place(new BoxGeometry(w, h, d), color, x, y, z, [0, 0, tilt]);
  }
  function drum(y: number, bottom: number, top: number, h: number, color: string, sides = 8, x = 0, z = 0) {
    place(new CylinderGeometry(top, bottom, h, sides), color, x, y, z, [0, Math.PI / sides, 0]);
  }
  function bar(start: Point, end: Point, radius: number, pigment = brass) {
    const a = new Vector3(...start), b = new Vector3(...end);
    const axis = b.clone().sub(a);
    const shape = new CylinderGeometry(radius, radius, axis.length(), 6);
    shape.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis.normalize()));
    const mid = a.lerp(b, .5);
    place(shape, pigment, mid.x, mid.y, mid.z);
  }

  if (name === 'sun-gate') {
    box(0, .05, 0, 1, .10, .64, plinth);
    box(0, .13, 0, .92, .08, .56, ivory);
    for (const x of [-.335, .335]) {
      box(x, .24, 0, .28, .16, .43, stone);
      box(x, .35, 0, .25, .055, .42, brass);
      box(x, .59, 0, .23, .46, .37, stone);
      box(x, .83, 0, .27, .08, .41, ivory);
      for (const z of [-.19, .19]) box(x, .57, z, .038, .35, .026, clay);
    }
    for (let i = 0; i < 9; i++) {
      const angle = (i + .5) * Math.PI / 9;
      const color = i === 4 ? brass : i % 2 ? ivory : stone;
      box(.332 * Math.cos(angle), .855 + .332 * Math.sin(angle), 0, .13, .187, .40, color, angle - Math.PI / 2);
    }
    box(0, 1.265, 0, .16, .11, .36, bronze);
    place(new CylinderGeometry(.158, .158, .10, 12), brass, 0, 1.446, 0, [Math.PI / 2, 0, 0]);
    place(new CylinderGeometry(.100, .100, .11, 12), clay, 0, 1.446, 0, [Math.PI / 2, 0, 0]);
  } else if (name === 'lantern-tower') {
    drum(.065, .51, .49, .13, plinth);
    drum(.17, .43, .38, .08, stone);
    drum(.34, .345, .32, .28, slate);
    drum(.505, .36, .38, .065, brass);
    drum(.575, .44, .435, .085, ivory);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3 + Math.PI / 6;
      drum(.83, .043, .041, .47, stone, 6, .30 * Math.cos(angle), .30 * Math.sin(angle));
    }
    drum(.72, .15, .11, .18, bronze);
    drum(.845, .095, .15, .17, '#eca745', 6);
    drum(.977, .15, .025, .12, '#f3d186', 6);
    drum(1.085, .47, .45, .085, brass);
    drum(1.24, .48, .14, .24, slate);
    drum(1.395, .14, .09, .075, verdigris);
    drum(1.48, .095, .008, .13, brass);
  } else {
    drum(.06, .51, .48, .12, plinth);
    drum(.15, .44, .41, .09, ivory);
    drum(.35, .25, .17, .34, verdigris);
    drum(.54, .22, .22, .06, brass);
    for (const sign of [-1, 1]) bar([sign * .12, .51, 0], [sign * .375, .80, 0], .047, bronze);
    place(new TorusGeometry(.40, .072, 6, 24), verdigris, 0, 1, 0, [0, .10, 0]);
    place(new TorusGeometry(.407, .023, 5, 24), brass, 0, 1, .055, [0, .10, 0]);
    bar([-.314, .75, .06], [.36, 1.37, .06], .045);
    place(new SphereGeometry(.108, 10, 6), ivory, 0, 1, .07);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      box(.40 * Math.cos(angle), 1 + .40 * Math.sin(angle), .015, .115, .115, .145, brass, angle);
    }
  }
  const geometry = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  geometry.name = name;
  geometry.rotateY(-.24);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createWonderGeometries(): Record<WonderLandmark, BufferGeometry> {
  return { 'sun-gate': wonderGeometry('sun-gate'), 'lantern-tower': wonderGeometry('lantern-tower'), 'meridian-dial': wonderGeometry('meridian-dial') };
}
