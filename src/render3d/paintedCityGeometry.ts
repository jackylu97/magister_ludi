import { BoxGeometry, BufferGeometry, Color, ConeGeometry, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function colored(geometry: BufferGeometry, pigment: string): BufferGeometry {
  const color = new Color(pigment), count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(count * 2), 2));
  return geometry;
}

function box(width: number, height: number, depth: number, pigment: string): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(0, height * .5, 0);
  return colored(geometry, pigment);
}

/** The approved study's foundation, pointed stakes and lintel. */
export function paintedCityGeometry(): Record<'foundation' | 'stake' | 'rail' | 'stoneWall', BufferGeometry> {
  const foundation = box(1, 1, 1, '#b7b49d');
  const shaft = box(.034, .16, .034, '#938062');
  const tip = colored(new ConeGeometry(.022, .045, 4), '#b09a72');
  tip.rotateY(Math.PI / 4); tip.translate(0, .177, 0);
  const stake = mergeGeometries([shaft, tip])!; shaft.dispose(); tip.dispose();
  const rail = box(1, .026, .019, '#aa9674');
  // This is the existing wall building's later-age appearance, not another
  // construction. Short stone courses follow the same fitted perimeter.
  const stone = box(1, .16, .055, '#b4b39f');
  const battlement = box(.48, .045, .060, '#c4c1aa'); battlement.translate(0, .16, 0);
  const stoneWall = mergeGeometries([stone, battlement])!; stone.dispose(); battlement.dispose();
  return { foundation, stake, rail, stoneWall };
}
