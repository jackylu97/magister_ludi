/**
 * Where a farm meets the edge of an empire — the pin on who is painted last.
 *
 * `docs/flags.md` (ccccc), the user: *"farms are colliding with the city
 * border, we should have them sit under"*. A field patch and a territory ribbon
 * are both flat pigment clipped to the same terrain triangles, so which one the
 * player sees is decided twice over — by the lift each carries along Y, and by
 * the `polygonOffset` its material asks the depth test for. The lifts always
 * said the ribbon was on top; the offsets said the crop was, and the offsets
 * won, because the factor multiplies a slope and the diorama's ground is steep
 * in depth. The border came through only in the headland gaps between parcels.
 *
 * Both halves are pinned here, and both are read off the **built layers** — the
 * meshes the renderer would put in the scene — rather than out of the source,
 * because the fact that matters is the one the GPU is handed.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  BoxGeometry, type BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial,
  Raycaster, Vector3,
} from 'three';
import { PaintedGroundLayer, planPaintedTerritory } from '../../src/render3d/paintedGround';
import {
  PAINTED_WORK_ASSET_NAMES, PaintedWorksLayer, type PaintedWorksAssets,
} from '../../src/render3d/paintedWorks';
import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { VISIBLE, resetVisibility } from '../../src/sim/visibility';
// @ts-expect-error The approved study modules remain JavaScript.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
// @ts-expect-error The approved study modules remain JavaScript.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';

const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); });

/** Odd-r offset neighbours, the map's own arrangement. */
const around = (col: number, row: number): [number, number][] => {
  const shift = row % 2 === 1 ? 1 : 0;
  return [[col + 1, row], [col - 1, row], [col - 1 + shift, row - 1], [col + shift, row - 1],
    [col - 1 + shift, row + 1], [col + shift, row + 1]];
};

/**
 * A town, the ring it owns, and a farm on one hex of that ring.
 *
 * The farmed hex has to be a *frontier* hex or the ribbon never reaches it,
 * which is the whole subject: the ring is owned and nothing beyond it is.
 */
function fixture() {
  const state: GameState = newGame({ seed: 11, sizeName: 'duel', players: [
    { name: 'A', color: '#ac3333', isHuman: true }, { name: 'B', color: '#3344ac', isHuman: true },
  ] });
  const width = 9, height = 7;
  state.map = { ...state.map, width, height, tiles: state.map.tiles.slice(0, width * height) };
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const tile = state.map.tiles[row * width + col]!;
    tile.col = col; tile.row = row; tile.terrain = 'grassland'; tile.feature = 'none';
    tile.hills = false; tile.elevation = 0; tile.riverEdges = 0;
    delete tile.resource; delete tile.improvement; delete tile.road;
  }
  state.units = []; state.cities = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  resetVisibility(state); state.visibility.forEach(levels => levels.fill(VISIBLE));

  const town = foundCityAt(state, 0, getTileAt(state.map, 4, 3)!);
  state.tileOwner[tileIndex(state.map, 4, 3)] = town.id;
  for (const [col, row] of around(4, 3)) state.tileOwner[tileIndex(state.map, col, row)] = town.id;
  const farmed = around(4, 3)[0]!;
  getTileAt(state.map, farmed[0], farmed[1])!.improvement = 'farm';

  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;

  const material = new MeshStandardMaterial({ color: 'white', vertexColors: true });
  const geometry: Record<string, BufferGeometry> = Object.fromEntries(PAINTED_WORK_ASSET_NAMES.map(name => {
    const g = new BoxGeometry(.4, .4, .4);
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 3).fill(1), 3));
    return [name, g];
  }));
  cleanup.push(() => { material.dispose(); Object.values(geometry).forEach(g => g.dispose()); });

  const works = new PaintedWorksLayer({ material, ...geometry } as PaintedWorksAssets, () => undefined);
  cleanup.push(() => works.dispose());
  works.build(state, prepared, null, null, false);
  works.group.updateMatrixWorld(true);

  const ink = new PaintedGroundLayer('test-territory', () => undefined);
  cleanup.push(() => ink.dispose());
  ink.build(state, prepared, planPaintedTerritory(state, prepared), null, false);
  ink.group.updateMatrixWorld(true);

  const cell = tileIndex(state.map, farmed[0], farmed[1]);
  // The hex's own top, to tell flat pigment from the farmhouse's foundation:
  // both ride the works layer's one field material, and only the pigment is a
  // thing the ribbon is supposed to cover.
  const [top, side] = terrainMesh(prepared.tiles[cell]) as [BufferGeometry, BufferGeometry];
  side.dispose();
  const groundMaterial = new MeshStandardMaterial();
  const ground = new Mesh(top, groundMaterial);
  ground.updateMatrixWorld(true);
  cleanup.push(() => { top.dispose(); groundMaterial.dispose(); });

  return { state, prepared, works, ink, ground, farmed: cell };
}

/** The meshes of a layer that sit at the unwrapped copy of the world. */
const centreMeshes = (group: { children: unknown[] }): Mesh[] =>
  (group.children as Mesh[]).filter(mesh => mesh.position.x === 0);

const materialOf = (mesh: Mesh): MeshStandardMaterial => mesh.material as MeshStandardMaterial;

describe('the painted ground ink over the works it crosses', () => {
  /**
   * The depth half. Every ground decal in the painted look asks for `-1`; the
   * ink asks for one step more, so the field pigment cannot pull itself in
   * front of a border that is geometrically above it.
   */
  it('gives the ground ink a deeper polygon offset than the field patches', () => {
    const { works, ink } = fixture();
    const fields = centreMeshes(works.group).map(materialOf);
    expect(fields.length).toBeGreaterThan(0);
    const inks = centreMeshes(ink.group).map(materialOf);
    expect(inks.length).toBeGreaterThan(0);
    for (const material of inks) {
      expect(material.polygonOffset).toBe(true);
      for (const field of fields) {
        const asked = field.polygonOffset ? field.polygonOffsetFactor : 0;
        const askedUnits = field.polygonOffset ? field.polygonOffsetUnits : 0;
        expect(material.polygonOffsetFactor).toBeLessThan(asked);
        expect(material.polygonOffsetUnits).toBeLessThan(askedUnits);
      }
    }
  });

  /**
   * The geometry half, and the reason the depth half is worth asking for: the
   * ribbon already stands above the crop everywhere the two overlap. A vertex
   * of ink is dropped straight down onto the works' own pigment; where it lands
   * on a field at all, it landed on something below it.
   */
  it('lays every ink vertex above the field pigment under it', () => {
    const { works, ink, ground, farmed } = fixture();
    const fields = centreMeshes(works.group)
      .filter(mesh => (mesh.userData.paintedWorksCells as number[] | undefined)?.includes(farmed));
    expect(fields.length).toBeGreaterThan(0);
    const inked = centreMeshes(ink.group)
      .filter(mesh => (mesh.userData.paintedGroundCells as number[] | undefined)?.includes(farmed));
    expect(inked.length).toBeGreaterThan(0);

    const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
    let overlaps = 0;
    for (const mesh of inked) {
      const position = mesh.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const point = new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        ray.ray.origin.set(point.x, point.y + 1, point.z);
        const floor = ray.intersectObject(ground, false)[0];
        if (!floor) continue;
        // Flat pigment hugs the hex top; the farmhouse's foundation prism rides
        // the same material and is a building, not a mark to be painted over.
        const pigment = ray.intersectObjects(fields, false)
          .filter(hit => hit.point.y - floor.point.y < .025);
        for (const hit of pigment) { expect(point.y).toBeGreaterThan(hit.point.y); overlaps++; }
      }
    }
    // A farm covers all but the rim of its hex, so the ribbon must cross it.
    expect(overlaps).toBeGreaterThan(20);
  });
});
