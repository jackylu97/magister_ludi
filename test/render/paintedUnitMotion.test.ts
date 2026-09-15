import { afterEach, describe, expect, it, vi } from 'vitest';
import { Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, Quaternion, Scene } from 'three';
import { BoardGeometry, unitSculpt } from '../../src/render3d/board3d';
import { MoveAnimations3D } from '../../src/render3d/animation3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { PaintedUnitKit } from '../../src/render3d/paintedUnits';
import { UnitLayer, unitColor } from '../../src/render3d/pieces';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { MaterialLibrary } from '../../src/render3d/toon';
import { UNIT_REVIEW_PEOPLE } from '../../src/flairGallery/unitsFixture';
import { FAMILIES } from '../../src/sim/greatPeopleData';
import { createMap } from '../../src/sim/map';
import { createUnit, newGame } from '../../src/sim/state';
import { VISIBLE, resetVisibility } from '../../src/sim/visibility';
import type { FallenUnit } from '../../src/ui/mapView';

const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); vi.restoreAllMocks(); });

interface MotionHarness {
  spawnWalker(id: number, terrain?: 'coast' | 'grassland'): void;
  stepAnimations(now: number): boolean;
  clearWalkers(): void;
  spawnFaller(unit: FallenUnit): void;
  removeFaller(id: number): void;
  setUnitBadgesVisible(visible: boolean): void;
  pickUnitBadge(x: number, y: number, playerId: number): number | null;
}

/** Exercise the real mesh builders without creating a WebGL context. */
function fixture(painted: boolean) {
  const state = newGame({ seed: 11, sizeName: 'duel', players: [
    { name: 'Viewer', color: '#294979', isHuman: true },
    { name: 'Owner', color: '#8b2635', secondary: '#e0b21a', isHuman: true },
  ] });
  state.map = createMap({ width: 10, height: 6, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const unit = createUnit(state, 1, 'warrior', 4, 3);
  const geometry = new BoardGeometry();
  const materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
  const kit = painted ? new PaintedUnitKit(() => undefined) : null;
  const layer = new UnitLayer(), outlines = new Map<number, MeshBasicMaterial>();
  const walkers = new Map<number, Group>(), fallers = new Map<number, Group>();
  const camera = new OrthographicCamera(), scene = new Scene();
  const runtime = Object.assign(Object.create(Renderer3D.prototype), {
    state, map: state.map, geometry, materials, paintedUnits: kit,
    unitOutlines: outlines, walkerModels: new Map(), walkers, fallers,
    // A standing camera's `facing` is a copy of its own quaternion (R3); the
    // stub answers the same, so a walker faces what a resting piece faces.
    view: { camera, facing: camera.quaternion }, scene, shadows: true, sprites: null, badges: null, fogSeat: 0,
  }) as MotionHarness;
  const build = (): void => layer.build(state, geometry, materials, new Quaternion(), true,
    null, null, null, null, null, 0, kit);
  cleanup.push(() => {
    runtime.clearWalkers(); for (const id of [...fallers.keys()]) runtime.removeFaller(id);
    layer.dispose(); for (const material of outlines.values()) material.dispose();
    kit?.dispose(); geometry.dispose(); materials.dispose();
  });
  return { state, unit, geometry, materials, kit, layer, runtime, walkers, fallers, outlines, build };
}

describe('unit motion uses the resting art and pigments', () => {
  it('hides inspection badges in resting and moving passes, removes their hit targets, and restores them', () => {
    const f = fixture(true), material = new MeshBasicMaterial();
    for (const grid of f.state.visibility) grid.fill(VISIBLE);
    cleanup.push(() => material.dispose());
    Object.assign(f.runtime, {
      units: f.layer, icons: null, selectedUnitId: null, unitBadgesVisible: true,
      badges: { material, wildMaterial: material, materialFor: () => material },
      animations: { activeUnits: () => [] },
      skipAnimations: () => f.runtime.clearWalkers(), invalidate: () => undefined,
    });
    const marks = (group: Group): number => {
      let count = 0;
      group.traverse(object => { if (object instanceof Mesh && object.renderOrder === RENDER_ORDER.badge) count++; });
      return count;
    };
    f.runtime.spawnWalker(f.unit.id);
    expect(marks(f.walkers.get(f.unit.id)!)).toBeGreaterThan(0);
    f.runtime.setUnitBadgesVisible(false);
    expect(f.walkers.size).toBe(0); expect(marks(f.layer.group)).toBe(0);
    expect(f.runtime.pickUnitBadge(100, 100, 1)).toBeNull();
    f.runtime.spawnWalker(f.unit.id);
    expect(marks(f.walkers.get(f.unit.id)!)).toBe(0);
    f.runtime.setUnitBadgesVisible(true);
    expect(marks(f.layer.group)).toBeGreaterThan(0);
    f.runtime.spawnWalker(f.unit.id);
    expect(marks(f.walkers.get(f.unit.id)!)).toBeGreaterThan(0);
  });

  it('switches at the shoreline in both directions, restores the instance, and keeps sea deaths afloat', () => {
    const f = fixture(true), from = { col: 4, row: 3 }, to = { col: 4, row: 4 };
    const animations = new MoveAnimations3D();
    Object.assign(f.runtime, { animations, units: f.layer });
    for (const embarking of [true, false]) {
      f.runtime.clearWalkers(); animations.clear();
      for (const tile of f.state.map.tiles) tile.terrain = tile.row >= 4 ? 'coast' : 'grassland';
      const start = embarking ? from : to, end = embarking ? to : from;
      f.unit.col = end.col; f.unit.row = end.row; f.build();
      f.layer.hide(f.unit.id);
      animations.start(f.unit.id, start, [end], 0);
      f.runtime.spawnWalker(f.unit.id, embarking ? 'grassland' : 'coast');
      const duration = animations.remainingMs(0);
      for (const progress of [.2, .8]) {
        expect(f.runtime.stepAnimations(duration * progress)).toBe(true);
        const water = progress < .5 ? !embarking : embarking;
        const expected = f.kit!.resolve(f.unit, water ? 'coast' : 'grassland')!;
        const group = f.walkers.get(f.unit.id)!;
        for (const copy of group.children) expect((copy.children[0] as Mesh).geometry).toBe(expected.geometry);
        const before = group; f.runtime.stepAnimations(duration * progress + .001);
        expect(f.walkers.get(f.unit.id)).toBe(before); // No rebuild while on the same terrain.
      }
      f.runtime.stepAnimations(duration + 1);
      expect(f.walkers.size).toBe(0);
      expect(f.layer.modelCandidates().some(candidate => candidate.unitId === f.unit.id)).toBe(true);
    }
    f.unit.row = 4; f.runtime.spawnFaller({ ...f.unit });
    const boat = f.kit!.resolve(f.unit, 'coast')!;
    for (const copy of f.fallers.get(f.unit.id)!.children) expect((copy.children[0] as Mesh).geometry).toBe(boat.geometry);
  });

  it('retains each equipment variant when replacing resting pieces with moving and falling copies', () => {
    const f = fixture(true);
    for (const type of ['swordsman', 'legionary', 'longswordsman', 'fireLance', 'khopesh', 'eagleWarrior', 'phalanx', 'spearWall', 'pikeman', 'fubing', 'ponticPeltast', 'bowman', 'compositeBowman', 'crossbowman', 'slinger', 'cataphract', 'knight', 'knightsTemplar', 'tangCavalry', 'chanyuGuard', 'gendarme', 'mandekalu', 'whistlingArrow', 'xiongnuHorseArcher', 'camelArcher', 'chariot', 'scythedChariot', 'chariotArcher', 'catapult', 'trebuchet', 'trireme', 'bireme', 'galley', 'caravel', 'corvette', 'alexandrianGalley', 'warGalley', 'towerShip', 'carrack', 'shipOfTheLine', 'treasureShip', 'fireShip', 'gunGalley', 'frigate', 'augur', 'apostle', 'inquisitor', 'canoness', 'rihlaCaravan'] as const) {
      f.unit.type = type;
      for (const tile of f.state.map.tiles) tile.terrain = f.kit!.resolve(f.unit)?.waterborne ? 'coast' : 'grassland';
      f.build();
      const model = f.kit!.resolve(f.unit, 'grassland')!;
      expect(model.geometry.userData.paintedUnitAsset).toBe(type);
      expect(f.layer.group.children.some(object => object instanceof InstancedMesh && object.geometry === model.geometry)).toBe(true);
      f.runtime.spawnWalker(f.unit.id);
      const moving = f.walkers.get(f.unit.id)!;
      expect(moving.children).toHaveLength(3);
      for (const copy of moving.children) expect((copy.children[0] as Mesh).geometry).toBe(model.geometry);
      f.runtime.clearWalkers();
      f.runtime.spawnFaller({ ...f.unit });
      const falling = f.fallers.get(f.unit.id)!;
      expect(falling.children).toHaveLength(3);
      for (const copy of falling.children) {
        const mesh = copy.children[0] as Mesh;
        expect(mesh.geometry).toBe(model.geometry); expect(mesh.rotation.y).toBe(model.yaw);
      }
      f.runtime.removeFaller(f.unit.id);
      expect(model.geometry.getAttribute('position').count).toBeGreaterThan(0);
    }
  });

  it.each([false, true])('matches actual resting shell RGB for owner, routed and hostile states (painted=%s)', painted => {
    const f = fixture(painted);
    const originalBase = f.materials.outline.color.clone();
    for (const secondary of ['#e0b21a', '#1c3f7a', '#f3ecd8']) {
      f.state.players[1]!.secondary = secondary;
      for (const [routed, hostile] of [[false, false], [true, false], [false, true], [true, true]]) {
        if (routed) f.unit.autoExplore = true; else delete f.unit.autoExplore;
        f.state.wars = hostile ? [{ a: 0, b: 1, declaredTurn: f.state.turn }] : [];
        f.build();
        const standing = f.layer.group.children.find((object): object is InstancedMesh =>
          object instanceof InstancedMesh && object.material === f.materials.unitOutline)!;
        expect(standing).toBeDefined();
        // This is the shader's actual resting output: linear material RGB
        // multiplied by the uploaded Float32 instance colour, not setHex(trim).
        const expected = originalBase.clone();
        expected.r *= standing.instanceColor!.getX(0);
        expected.g *= standing.instanceColor!.getY(0);
        expected.b *= standing.instanceColor!.getZ(0);
        f.runtime.spawnWalker(f.unit.id);
        const group = f.walkers.get(f.unit.id)!;
        expect(group.children).toHaveLength(3);
        for (const copy of group.children) {
          const body = copy.children[0] as Mesh;
          const shell = body.children[0] as Mesh;
          const pigment = shell.material as MeshBasicMaterial;
          expect(pigment.color.r).toBeCloseTo(expected.r, 12);
          expect(pigment.color.g).toBeCloseTo(expected.g, 12);
          expect(pigment.color.b).toBeCloseTo(expected.b, 12);
          expect(shell.geometry.getAttribute('position').array).toEqual(standing.geometry.getAttribute('position').array);
          expect(shell.geometry.index?.array).toEqual(standing.geometry.index?.array);
          const shader = {uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>'} as any;
          pigment.onBeforeCompile(shader, {} as any);
          expect(shader.uniforms.uUnitOutlineWidth.value).toBe(VIEW3D.units.outlineWidth);
          expect(pigment).not.toBe(f.materials.outline);
        }
        if (!routed && !hostile) {
          // Pin why simply setting the target hex on the clone is insufficient.
          const literal = new Color(secondary);
          expect(Math.hypot(expected.r - literal.r, expected.g - literal.g, expected.b - literal.b)).toBeGreaterThan(.01);
        }
        const first = (group.children[0]!.children[0]!.children[0] as Mesh).material;
        const cached = f.outlines.size;
        f.runtime.spawnWalker(f.unit.id);
        expect((f.walkers.get(f.unit.id)!.children[0]!.children[0]!.children[0] as Mesh).material).toBe(first);
        expect(f.outlines.size).toBe(cached);
        expect(f.materials.outline.color).toEqual(originalBase);
      }
    }
    const body = f.walkers.get(f.unit.id)!.children[0]!.children[0] as Mesh;
    expect(body.geometry).toBe(painted ? f.kit!.resolve(f.unit)!.geometry : f.geometry.pieces[unitSculpt(f.unit, 'grassland')].geometry);
    expect(body.material instanceof MeshStandardMaterial).toBe(painted);
  });

  it('preserves every named family and its shader on falling copies, disposing only private materials', () => {
    const f = fixture(true);
    f.unit.type = 'greatPerson';
    for (const family of FAMILIES) {
      f.unit.person = UNIT_REVIEW_PEOPLE[family];
      const model = f.kit!.resolve(f.unit, 'grassland')!;
      const borrowed = f.kit!.material(model, unitColor(f.state, f.unit));
      const borrowedDispose = vi.spyOn(borrowed, 'dispose');
      const before = JSON.stringify(f.state);
      f.runtime.spawnFaller({ ...f.unit });
      const group = f.fallers.get(f.unit.id)!;
      expect(group.children).toHaveLength(3);
      const clones = group.children.map(anchor => {
        const mesh = anchor.children[0] as Mesh;
        expect(mesh.geometry).toBe(model.geometry);
        expect(mesh.geometry.userData.paintedUnitAsset).toBe(`greatPerson:${family}`);
        expect(mesh.rotation.y).toBe(model.yaw);
        const material = mesh.material as MeshStandardMaterial;
        expect(material).not.toBe(borrowed);
        expect(material.onBeforeCompile).toBe(borrowed.onBeforeCompile);
        expect(material.customProgramCacheKey()).toBe(borrowed.customProgramCacheKey());
        expect(material.transparent).toBe(true); expect(material.depthWrite).toBe(false);
        return vi.spyOn(material, 'dispose');
      });
      f.runtime.removeFaller(f.unit.id);
      expect(clones.every(dispose => dispose.mock.calls.length === 1)).toBe(true);
      expect(borrowedDispose).not.toHaveBeenCalled();
      expect(f.fallers.size).toBe(0); expect(JSON.stringify(f.state)).toBe(before);
      borrowedDispose.mockRestore();
    }
  });
});
