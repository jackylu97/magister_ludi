import { BufferGeometry, Color, Float32BufferAttribute } from 'three';

type Point = [number, number];
type Vertex = [number, number, number];

/**
 * A self-contained cultivated hillside, in hex-radius units. This replaces the hill's relief rather
 * than draping a second set of slopes over an arbitrary mountain of triangles.
 * Nested footprints give every crop bed a genuinely horizontal planting face.
 */
export function terraceFarmGeometry(): BufferGeometry {
  const positions: number[] = [], colors: number[] = [];
  const outline: Point[] = [
    [.82, .15], [.70, .48], [.39, .70], [.05, .79], [-.32, .74], [-.63, .54],
    [-.81, .23], [-.74, -.17], [-.49, -.48], [-.08, -.60], [.34, -.54], [.64, -.28],
  ];
  const pigment = new Color();
  function triangle(a: Vertex, b: Vertex, c: Vertex, color: string) {
    // The summit's inner ring collapses to a point; omit that empty half-quad.
    if ((a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) ||
        (b[0] === c[0] && b[1] === c[1] && b[2] === c[2]) ||
        (a[0] === c[0] && a[1] === c[1] && a[2] === c[2])) return;
    pigment.set(color);
    for (const v of [a, b, c]) { positions.push(...v); colors.push(pigment.r, pigment.g, pigment.b); }
  }
  function quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex, color: string) {
    triangle(a, b, c, color); triangle(a, c, d, color);
  }
  const at = (p: Point, y: number): Vertex => [p[0], y, p[1]];
  const mix = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const ring = (level: number): Point[] => outline.map(([x, z]) => [
    x * (1 - level * .15) + level * .018,
    z * (1 - level * .15) - level * .078,
  ]);
  const beds = ['#b4b16b', '#ccba7c', '#93a456', '#c6b068', '#a9ac62'];
  const furrows = ['#e2cd90', '#dfc88a', '#b4c171', '#e3c988', '#c9c582'];
  const masonry = ['#989383', '#aaa391', '#b9af98', '#a7a393', '#b4ab96'];

  for (let level = 0; level < 5; level++) {
    const outer = ring(level), inner = level === 4 ? outline.map((): Point => [.072, -.312]) : ring(level + 1);
    const bottom = level * .078, top = bottom + .078;
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      const a = outer[i]!, b = outer[j]!, c = inner[j]!, d = inner[i]!;
      // Mortar is the actual retaining face; inset masonry leaves narrow joints.
      quad(at(a, bottom), at(a, top), at(b, top), at(b, bottom), '#999383');
      const blocks = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .105));
      for (let course = 0; course < 2; course++) {
        const offset = course * .5;
        for (let brick = -1; brick < blocks; brick++) {
          const start = Math.max(.006, (brick + offset) / blocks + .009);
          const end = Math.min(.994, (brick + 1 + offset) / blocks - .009);
          if (end <= start) continue;
          const normal: Point = [b[1] - a[1], a[0] - b[0]];
          const length = Math.hypot(...normal);
          const project = (p: Point): Point => [p[0] + normal[0] / length * .0015, p[1] + normal[1] / length * .0015];
          const p = project(mix(a, b, start)), q = project(mix(a, b, end));
          const low = bottom + course * .039 + .002, high = low + .034;
          quad(at(p, low), at(p, high), at(q, high), at(q, low), masonry[(i + level + brick + course + 5) % masonry.length]!);
        }
      }
      const field = (Math.floor(i / 3) + level * 2) % beds.length;
      quad(at(a, top), at(d, top), at(c, top), at(b, top), '#949b58');
      // Stone coping provides a continuous lip; no bright outline around crops.
      quad(at(a, top + .002), at(mix(a, d, .10), top + .002), at(mix(b, c, .10), top + .002), at(b, top + .002), '#bab29b');
      // One narrow access lane breaks the rings and meets the stair below.
      if (i === 5 || i >= 7 || (level === 4 && i >= 4)) continue;
      const edgeA = mix(a, b, .035), edgeB = mix(a, b, .965);
      const edgeD = mix(d, c, .035), edgeC = mix(d, c, .965);
      const strip = (start: number, end: number, y: number, color: string) => quad(
        at(mix(edgeA, edgeD, start), y), at(mix(edgeA, edgeD, end), y),
        at(mix(edgeB, edgeC, end), y), at(mix(edgeB, edgeC, start), y), color,
      );
      strip(.15, .92, top + .003, beds[field]!);
      for (let row = 0; row < 4; row++) {
        const start = .22 + row * .165;
        strip(start, start + .055 + (i % 3) * .006, top + .004, furrows[field]!);
      }
    }
    // Three broad stone treads per retaining wall. The lane follows the same
    // interpolated footprints as the terraces, so its ends cannot float.
    const a = mix(outer[5]!, outer[6]!, .5), b = mix(inner[5]!, inner[6]!, .5);
    for (let step = 0; step < 3 && level < 4; step++) {
      const p = mix(a, b, step / 3), q = mix(a, b, (step + 1) / 3);
      const y = top + (step + 1) * .078 / 3;
      const left = (v: Point): Point => [v[0], v[1] - .038];
      const right = (v: Point): Point => [v[0], v[1] + .038];
      quad(at(left(p), y), at(right(p), y), at(right(q), y), at(left(q), y), '#c4b79a');
      quad(at(right(p), top), at(right(p), y), at(left(p), y), at(left(p), top), '#9b947f');
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
