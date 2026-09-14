import { afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry, BufferGeometry, InstancedMesh, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { createWorldFixture } from '../../src/flairGallery/worldFixture';
import { PaintedGroundLayer, planPaintedRoads, planPaintedTerritory } from '../../src/render3d/paintedGround';
import { PAINTED_SITE_ASSET_NAMES, PaintedSiteLayer, paintedSiteEntries } from '../../src/render3d/paintedSites';
import { type PaintedWorksAssets, PAINTED_WORK_ASSET_NAMES } from '../../src/render3d/paintedWorks';
import { playerColor, playerSecondaryColor } from '../../src/render3d/cities3d';
import { discoveryKindTech } from '../../src/sim/discoveryData';
import { HIDDEN, EXPLORED } from '../../src/sim/visibility';
// @ts-expect-error Approved terrain JavaScript.
import { prepareTerrainMap, centre } from '../../src/terrainStudy/surface.js';

// @ts-expect-error Approved terrain JavaScript.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); });
const world = () => { const state = createWorldFixture(); return { state, prepared: prepareTerrainMap(state.map, { wrap: true }) }; };
function ground() { const layer = new PaintedGroundLayer('test-world', () => {}); cleanup.push(() => layer.dispose()); return layer; }
function sites() {
  const material = new MeshStandardMaterial({ vertexColors: true });
  const assets = { material, ...Object.fromEntries([...PAINTED_SITE_ASSET_NAMES, ...PAINTED_WORK_ASSET_NAMES].map(name => [name, new BoxGeometry(.12, .24, .12)])) } as PaintedWorksAssets;
  cleanup.push(() => Object.values(assets).forEach(asset => asset.dispose()));
  const layer = new PaintedSiteLayer(assets, () => {}); cleanup.push(() => layer.dispose()); return layer;
}
function geometryOf(layer: PaintedGroundLayer): BufferGeometry[] {
  return [...new Set(layer.group.children.map(object => (object as Mesh).geometry))];
}

describe('painted world layers', () => {
  it('draws only paved land, including isolated cells, junctions and wrap half-links', () => {
    const { state, prepared } = world(), before = JSON.stringify(state);
    const plan = planPaintedRoads(state, prepared);
    expect(plan.size).toBe(state.map.tiles.filter(t => t.road !== undefined).length);
    const cell = 7 * state.map.width, c = centre(prepared.tiles[cell]);
    const points = plan.get(cell)!.flatMap(mark => mark.polygon);
    expect(Math.min(...points.map(p => p[0]))).toBeLessThan(c.x - .8);
    expect(Math.max(...points.map(p => p[0]))).toBeGreaterThan(c.x + .8);
    expect(plan.get(10 * state.map.width + 3)!.length).toBe(2); // lone hub, two tones
    expect(JSON.stringify(state)).toBe(before);
    delete state.map.tiles[cell]!.road;
    expect(planPaintedRoads(state, prepared).has(cell)).toBe(false);
  });

  it('fits road marks to the actual hill faces and keeps depth testing enabled', () => {
    const { state, prepared } = world(), layer = ground();
    const cell = 9 * state.map.width + 9, plan = planPaintedRoads(state, prepared);
    layer.build(state, prepared, new Map([[cell, plan.get(cell)!]]));
    const c = centre(prepared.tiles[cell]);
    let low = Infinity, high = -Infinity;
    for (const geometry of geometryOf(layer)) {
      const p = geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        expect(Number.isFinite(x + y + z)).toBe(true);
        low = Math.min(low, y); high = Math.max(high, y);
      }
    }
    expect(high - low).toBeGreaterThan(.04);
    const marks = layer.group.children.filter(object => object.position.x === 0);
    const ray = new Raycaster();
    const [top, side] = terrainMesh(prepared.tiles[cell]) as BufferGeometry[];
    const material = new MeshStandardMaterial(), terrain = new Mesh(top, material);
    terrain.updateMatrixWorld(true); cleanup.push(() => { top!.dispose(); side!.dispose(); material.dispose(); });
    for (let step = -5; step <= 5; step++) {
      const x = c.x + step * .1, z = c.z;
      ray.set(new Vector3(x, 5, z), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(marks, false)[0];
      expect(hit).toBeDefined();
      const floor = ray.intersectObject(terrain, false)[0]!;
      expect(hit!.point.y - floor.point.y).toBeCloseTo(.019, 4);
    }
    expect(layer.group.children).toHaveLength(3);
    for (const child of layer.group.children) {
      const material = (child as Mesh).material as MeshStandardMaterial;
      expect(material.depthTest).toBe(true); expect(material.transparent).toBe(false);
      expect(child.renderOrder).toBe(0);
    }
  });

  it('uses both empire inks, omits internal city borders and closes wrap joins', () => {
    const { state, prepared } = world();
    const plan = planPaintedTerritory(state, prepared);
    const colors = new Set([...plan.values()].flat().map(m => m.color.getHex()));
    for (const seat of [0, 1]) for (const color of [playerColor(state, seat), playerSecondaryColor(state, seat)]) expect(colors.has(color)).toBe(true);
    // Mid-row seam is owned by the same empire on both sides: no vertical frontier.
    const c = centre(prepared.tiles[6 * state.map.width]);
    const nearSeam = [...plan.values()].flat().filter(m => m.bounds.minZ > c.z - .5 && m.bounds.maxZ < c.z + .5 && Math.abs(m.bounds.minX + .866) < .4);
    expect(nearSeam).toHaveLength(0);
    const frontierCount = [...plan.values()].flat().length;
    state.cities[1]!.ownerId = 0;
    const joined = planPaintedTerritory(state, prepared);
    expect([...joined.values()].flat().length).toBeLessThan(frontierCount);
    expect(new Set([...joined.values()].flat().map(m => m.color.getHex())).size).toBe(2);
    const layer = ground(); layer.build(state, prepared, joined);
    for (const g of geometryOf(layer)) expect(Array.from(g.getAttribute('position').array).every(Number.isFinite)).toBe(true);
  });

  it('meets both banks at the same river-crossing height without painting hidden halves', () => {
    const { state, prepared } = world(), plan = planPaintedRoads(state, prepared), layer = ground();
    const west = 7 * state.map.width + 11, east = west + 1;
    const a = plan.get(west)!.filter(mark => mark.deck !== undefined), b = plan.get(east)!.filter(mark => mark.deck !== undefined);
    expect(a).toHaveLength(2); expect(b).toHaveLength(2);
    expect(a[0]!.deck).toBeCloseTo(b[0]!.deck!, 10);
    const seam = (centre(prepared.tiles[west]).x + centre(prepared.tiles[east]).x) / 2;
    expect(Math.max(...a.flatMap(mark => mark.polygon.map(p => p[0])))).toBeCloseTo(seam, 10);
    expect(Math.min(...b.flatMap(mark => mark.polygon.map(p => p[0])))).toBeCloseTo(seam, 10);
    state.visibility[0]![east] = HIDDEN;
    layer.build(state, prepared, new Map([[west, plan.get(west)!], [east, plan.get(east)!]]), state.visibility[0]);
    expect([...layer.cells]).toEqual([west]);
    delete state.map.tiles[east]!.road;
    expect(planPaintedRoads(state, prepared).get(west)!.some(mark => mark.deck !== undefined)).toBe(false);
  });

  it('washes remembered markings and removes all geometry on uncharted ground', () => {
    const { state, prepared } = world(), layer = ground(), plan = planPaintedTerritory(state, prepared);
    layer.build(state, prepared, plan, state.visibility[0]);
    const lit = (layer.group.children[0] as Mesh).material;
    state.visibility[0]!.fill(EXPLORED); layer.build(state, prepared, plan, state.visibility[0]);
    expect(layer.cells.size).toBeGreaterThan(0);
    expect((layer.group.children[0] as Mesh).material).not.toBe(lit);
    state.visibility[0]!.fill(HIDDEN); layer.build(state, prepared, plan, state.visibility[0]);
    expect(layer.group.children).toHaveLength(0);
  });

  it('uses approved discovery compositions with reveal gates and live claim/camp removal', () => {
    const { state, prepared } = world(), layer = sites(), before = JSON.stringify(state);
    layer.build(state, prepared, state.visibility[0], 0);
    expect(layer.entries.map(e => e.site).sort()).toEqual(['antiquity', 'barbarianCamp', 'ruins', 'village', 'wreck']);
    expect(layer.group.children.some(mesh => mesh instanceof InstancedMesh)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    const tech = discoveryKindTech('antiquity'); state.players[0]!.techsResearched = state.players[0]!.techsResearched.filter(t => t !== tech);
    expect([...paintedSiteEntries(state, 0).values()]).not.toContain('antiquity');
    expect([...paintedSiteEntries(state, null).values()]).toContain('antiquity');
    delete state.map.tiles[12 * state.map.width + 5]!.discovery; state.camps = [];
    layer.build(state, prepared, state.visibility[0], 0);
    expect(layer.entries.map(e => e.site).sort()).toEqual(['village', 'wreck']);
    state.visibility[0]!.fill(HIDDEN); layer.build(state, prepared, state.visibility[0], 0);
    expect(layer.entries).toHaveLength(0); expect(layer.group.children).toHaveLength(0);
  });
});
