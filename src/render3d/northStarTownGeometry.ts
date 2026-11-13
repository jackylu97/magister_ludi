import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function colored(geometry: BufferGeometry, pigment: string): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  const color = new Color(pigment), count = flat.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
  flat.setAttribute('color', new Float32BufferAttribute(colors, 3));
  flat.setAttribute('uv', new Float32BufferAttribute(new Float32Array(count * 2), 2));
  return flat;
}
function merged(parts: BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  return geometry;
}

/** The height of one wall course before it is stretched over a slope. */
export const NORTH_STAR_WALL_HEIGHT = .15;
/** The height of a tower's shaft. */
export const NORTH_STAR_TOWER_HEIGHT = .27;

/**
 * The wall of a town under the north-star look (the visual test of 2026-11-12,
 * `docs/flags.md` item (nnnnnnn)): a warm stone course one unit long, a round
 * tower with a tiled cap for the corners and the gate, and the gate's lintel.
 * Thicker and warmer than the study's wall, so the ring reads at play zoom.
 */
export function northStarTownGeometry(): Record<'wall' | 'tower' | 'lintel', BufferGeometry> {
  const course = new BoxGeometry(1, NORTH_STAR_WALL_HEIGHT, .075); course.translate(0, NORTH_STAR_WALL_HEIGHT * .5, 0);
  const merlon = new BoxGeometry(.5, .045, .085); merlon.translate(0, NORTH_STAR_WALL_HEIGHT + .0225, 0);
  const wall = merged([colored(course, '#d8ccab'), colored(merlon, '#e6dcbf')]);
  const shaft = new CylinderGeometry(.078, .086, NORTH_STAR_TOWER_HEIGHT, 8); shaft.translate(0, NORTH_STAR_TOWER_HEIGHT * .5, 0);
  const crown = new CylinderGeometry(.098, .098, .045, 8); crown.translate(0, NORTH_STAR_TOWER_HEIGHT + .0225, 0);
  const cap = new ConeGeometry(.105, .13, 8); cap.translate(0, NORTH_STAR_TOWER_HEIGHT + .045 + .065, 0);
  const tower = merged([colored(shaft, '#d8ccab'), colored(crown, '#e6dcbf'), colored(cap, '#cb6a43')]);
  const beam = new BoxGeometry(1, .07, .085); beam.translate(0, .035, 0);
  const lintel = colored(beam, '#e6dcbf');
  return { wall, tower, lintel };
}
