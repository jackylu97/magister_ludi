import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';

import type { GameMap } from '../sim/map';

/**
 * The frame at the north and south ends of the map (the visual test,
 * `docs/flags.md` item (nnnnnnn); the user, 2026-11-14: "make it more obvious
 * on the north and south that that's where the map ends").
 *
 * The map wraps from east to west and stops at the north and the south. Before
 * this the ground only ended in a row of hex points against the paper, which
 * looked the same as the edge of what a player has explored. Here each end gets
 * a wooden rail, as the edge of a map case has:
 * - its inner side is cut to the hexes of the last row, so the board sits in it;
 * - its outer side is straight, which no other line on the board is;
 * - a brass line runs along its top with a tick for each column of hexes, like
 *   the scale in the margin of a printed map.
 *
 * There is no rail in the east or the west, so the two ends read as ends and
 * the sides read as open. The rail is always drawn, also beside hexes the
 * player has not explored: the size of the map is not a secret.
 */
export interface MapEndsStyle {
  on: boolean;
  /** How far the rail reaches past the points of the last row, in hex units. */
  width: number;
  /** The rail's top above flat land, and its foot below it. */
  rise: number; foot: number;
  /** The space between the hexes and the rail's cut side. */
  gap: number;
  wood: string; woodShade: string; brass: string;
  /** The brass line: its distance from the outer side, its width, and the length of a tick (every `majorEvery`th is `majorTick` long). */
  inlayAt: number; inlayWidth: number; tick: number; majorTick: number; majorEvery: number;
}

const ROOT3 = Math.sqrt(3);

/** The rails of one map, for all three wrap copies. The caller adds `group` to the scene and calls `dispose` when the board is replaced. */
export function buildMapEnds(map: GameMap, style: MapEndsStyle, register?: (material: MeshStandardMaterial) => void): { group: Group; dispose(): void } {
  const group = new Group(); group.name = 'map-ends';
  const wood = new MeshStandardMaterial({ color: 0xffffff, roughness: .82, metalness: 0, vertexColors: true });
  const brass = new MeshStandardMaterial({ color: new Color(style.brass), roughness: .45, metalness: .35 });
  register?.(wood); register?.(brass);
  const period = ROOT3 * map.width, top = style.rise, foot = -style.foot;
  const light = new Color(style.wood), shade = new Color(style.woodShade);
  const geometries: BufferGeometry[] = [];

  for (const end of [-1, 1] as const) {
    // The last row at this end: where its hexes' points and the notches between them lie.
    const row = end < 0 ? 0 : map.height - 1, shift = (row % 2) * .5;
    const tipZ = row * 1.5 + end * (1 + style.gap), notchZ = row * 1.5 + end * (.5 + style.gap);
    const outerZ = row * 1.5 + end * (1 + style.width);
    const positions: number[] = [], colors: number[] = [];
    const push = (points: [number, number, number][], color: Color): void => {
      // A fan, wound so that the face looks up or out whichever end this is.
      for (let i = 1; i < points.length - 1; i++) for (const p of end > 0 ? [points[0]!, points[i]!, points[i + 1]!] : [points[0]!, points[i + 1]!, points[i]!]) {
        positions.push(p[0], p[1], p[2]); colors.push(color.r, color.g, color.b);
      }
    };
    for (let col = 0; col < map.width; col++) {
      // One hex of the row: a notch on each side of its point.
      const x = ROOT3 * (col + shift), left = x - ROOT3 / 2, right = x + ROOT3 / 2;
      // The top, in two pieces that meet under the hex's point.
      push([[left, top, outerZ], [x, top, outerZ], [x, top, tipZ], [left, top, notchZ]], light);
      push([[x, top, outerZ], [right, top, outerZ], [right, top, notchZ], [x, top, tipZ]], light);
      // The cut side, which faces the board.
      push([[left, top, notchZ], [x, top, tipZ], [x, foot, tipZ], [left, foot, notchZ]], shade);
      push([[x, top, tipZ], [right, top, notchZ], [right, foot, notchZ], [x, foot, tipZ]], shade);
      // The straight outer side.
      push([[right, top, outerZ], [left, top, outerZ], [left, foot, outerZ], [right, foot, outerZ]], shade);
    }
    // A darker moulding along the outer side, up to the brass line, so the top is not one flat colour.
    {
      const x0 = -ROOT3 / 2 + ROOT3 * shift, x1 = x0 + period, y = top + .003, inner = outerZ - end * style.inlayAt;
      push([[x0, y, outerZ], [x1, y, outerZ], [x1, y, inner], [x0, y, inner]], light.clone().lerp(shade, .55));
    }
    const rail = new BufferGeometry();
    rail.setAttribute('position', new Float32BufferAttribute(positions, 3));
    rail.setAttribute('color', new Float32BufferAttribute(colors, 3));
    rail.computeVertexNormals();
    geometries.push(rail);

    // The brass: one long line and a tick for each column.
    const inlay: number[] = [], lift = top + .006;
    const bar = (x0: number, x1: number, z0: number, z1: number): void => {
      const a = Math.min(z0, z1), b = Math.max(z0, z1);
      inlay.push(x0, lift, a, x0, lift, b, x1, lift, b, x0, lift, a, x1, lift, b, x1, lift, a);
    };
    const lineZ = outerZ - end * style.inlayAt;
    bar(-ROOT3 / 2 + ROOT3 * shift, period - ROOT3 / 2 + ROOT3 * shift, lineZ, lineZ - end * style.inlayWidth);
    for (let col = 0; col < map.width; col++) {
      const x = ROOT3 * (col + shift), length = col % style.majorEvery === 0 ? style.majorTick : style.tick;
      bar(x - style.inlayWidth / 2, x + style.inlayWidth / 2, lineZ - end * style.inlayWidth, lineZ - end * (style.inlayWidth + length));
    }
    const marks = new BufferGeometry();
    marks.setAttribute('position', new Float32BufferAttribute(inlay, 3));
    marks.computeVertexNormals();
    geometries.push(marks);

    for (const dx of [-period, 0, period]) {
      const railMesh = new Mesh(rail, wood), markMesh = new Mesh(marks, brass);
      railMesh.castShadow = true; railMesh.receiveShadow = true; markMesh.receiveShadow = true;
      for (const mesh of [railMesh, markMesh]) { mesh.position.x = dx; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); group.add(mesh); }
    }
  }
  return { group, dispose: () => { geometries.forEach(g => g.dispose()); wood.dispose(); brass.dispose(); } };
}
