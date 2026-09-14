import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AlwaysStencilFunc, Group, InstancedMesh, Matrix4, MeshToonMaterial,
  NotEqualStencilFunc, Quaternion, ReplaceStencilOp,
} from 'three';
import { BoardGeometry, unitSculpt } from '../../src/render3d/board3d';
import { InstanceCollector, RENDER_ORDER, disposeInstancedGroup } from '../../src/render3d/instances';
import { VIEW3D } from '../../src/render3d/lookData';
import { PaintedUnitKit } from '../../src/render3d/paintedUnits';
import { UnitLayer, pieceColors, pieceMaterials, terrainUnder, unitColor } from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { createMap, tileIndex } from '../../src/sim/map';
import { newGame, type Unit } from '../../src/sim/state';
import { unitDef, type UnitTypeId } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); vi.restoreAllMocks(); });

function fixture() {
  const board = new BoardGeometry(), library = new MaterialLibrary(VIEW3D.look.rampSteps, 0x303030);
  cleanup.push(() => { library.dispose(); board.dispose(); });
  return { board, library };
}

function expectBodyStencil(material: MeshToonMaterial): void {
  expect(material).toMatchObject({
    stencilWrite: true, stencilRef: 1, stencilFunc: AlwaysStencilFunc,
    stencilZPass: ReplaceStencilOp, stencilWriteMask: 1,
    depthTest: true, depthWrite: true, transparent: false, opacity: 1,
  });
}

describe('opaque fallback unit bodies', () => {
  it('caches unit surfaces separately without changing shared terrain pigments or shading', () => {
    const { library } = fixture(), color = 0xc48739;
    const terrain = library.get(color), unit = library.unit(color);
    expect(unit).not.toBe(terrain);
    expect(library.unit(color)).toBe(unit); expect(library.get(color)).toBe(terrain);
    expectBodyStencil(unit); expect(terrain.stencilWrite).toBe(false);
    expect(unit.color).toEqual(terrain.color); expect(unit.gradientMap).toBe(terrain.gradientMap);
    expect(unit.vertexColors).toBe(terrain.vertexColors);
    const vertexUnit = library.unit(color, { vertexColors: true });
    expect(vertexUnit).not.toBe(unit); expect(vertexUnit.vertexColors).toBe(true);
    expect(library.unit(color, { vertexColors: true })).toBe(vertexUnit);
    const faded = library.unit(color, { opacity: .5, vertexColors: true });
    expect(faded).not.toBe(vertexUnit); expect(faded.opacity).toBe(.5); expect(faded.transparent).toBe(true);
  });

  it('keeps unit pigment, ramp and program lifecycle in the ordinary material library', () => {
    const { library } = fixture(), color = 0x5c9d37;
    const unit = library.unit(color), terrain = library.get(color);
    library.setSaturation(.35); expect(unit.color).toEqual(terrain.color);
    const initial = unit.color.clone();
    library.setSaturation(.35); expect(unit.color).toEqual(initial);
    const late = library.unit(0x975038); expect(late.color).toEqual(library.get(0x975038).color);
    const oldRamp = unit.gradientMap!, disposeRamp = vi.fn(); oldRamp.addEventListener('dispose', disposeRamp);
    library.setRampSteps(5);
    expect(unit.gradientMap).not.toBe(oldRamp); expect(unit.gradientMap).toBe(terrain.gradientMap);
    expect(late.gradientMap).toBe(unit.gradientMap); expect(disposeRamp).toHaveBeenCalledTimes(1);
    const unitVersion = unit.version, terrainVersion = terrain.version;
    library.invalidatePrograms();
    expect(unit.version).toBe(unitVersion + 1); expect(terrain.version).toBe(terrainVersion + 1);
    expectBodyStencil(unit); expect(terrain.stencilWrite).toBe(false);
  });

  it('disposes each cached unit surface exactly once alongside its shared ramp', () => {
    const library = new MaterialLibrary(3, 0x303030), unit = library.unit(0xa8634f), terrain = library.get(0xa8634f);
    const unitDisposed = vi.fn(), terrainDisposed = vi.fn(), rampDisposed = vi.fn();
    unit.addEventListener('dispose', unitDisposed); terrain.addEventListener('dispose', terrainDisposed);
    unit.gradientMap!.addEventListener('dispose', rampDisposed);
    expect(library.unit(0xa8634f)).toBe(unit);
    library.dispose();
    expect(unitDisposed).toHaveBeenCalledTimes(1); expect(terrainDisposed).toHaveBeenCalledTimes(1);
    expect(rampDisposed).toHaveBeenCalledTimes(1);
  });

  it('uses the unit cache for every fallback body group while ordinary scenery keeps the terrain cache', () => {
    const { board, library } = fixture(), collector = new InstanceCollector({ copyOffsets: [0] }), group = new Group();
    cleanup.push(() => disposeInstancedGroup(group));
    const piece = board.pieces.melee, colors = pieceColors(piece, 0xb46440);
    collector.add(piece.geometry, colors, new Matrix4(), { unitOutline: true, ghost: library.silhouette(0xb46440), order: RENDER_ORDER.unitBody });
    collector.add(piece.geometry, colors, new Matrix4().makeTranslation(3, 0, 0), { outlined: false });
    collector.flush(group, library, false);
    const meshes = group.children.filter((object): object is InstancedMesh => object instanceof InstancedMesh);
    const bodies = meshes.filter(object => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      return materials.every(material => material instanceof MeshToonMaterial);
    });
    expect(bodies).toHaveLength(2);
    const unit = bodies.find(object => object.renderOrder === RENDER_ORDER.unitBody)!;
    const scenery = bodies.find(object => object !== unit)!;
    const unitMaterials = Array.isArray(unit.material) ? unit.material : [unit.material];
    const sceneryMaterials = Array.isArray(scenery.material) ? scenery.material : [scenery.material];
    colors.forEach((color, i) => {
      expect(unitMaterials[i]).toBe(library.unit(color)); expectBodyStencil(unitMaterials[i] as MeshToonMaterial);
      expect(sceneryMaterials[i]).toBe(library.get(color)); expect(sceneryMaterials[i]!.stencilWrite).toBe(false);
    });
    const ghost = meshes.find(object => object.renderOrder === RENDER_ORDER.silhouette)!;
    expect(ghost.material).toMatchObject({ stencilWrite: true, stencilRef: 1, stencilFunc: NotEqualStencilFunc, stencilFuncMask: 1, stencilWriteMask: 0 });
  });

  it('keeps the legacy renderer’s embarked and laden bodies identically at rest and while walking', () => {
    const { board, library } = fixture(), layer = new UnitLayer(), kit = new PaintedUnitKit(() => {});
    cleanup.push(() => { layer.dispose(); kit.dispose(); });
    const state = newGame({ seed: 7, sizeName: 'duel', players: [{ name: 'A', color: '#b46440', isHuman: true }] });
    state.map = createMap({ width: 10, height: 6, terrain: 'grassland' }); state.cities = [];
    state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
    state.units = (['rihlaCaravan', 'settler', 'trader'] as UnitTypeId[]).map((type, i) => ({
      id: i + 1, type, ownerId: 0, col: 2 + i * 2, row: 2,
      hp: unitDef(type).maxHp, movesLeft: 2, hasAttacked: false,
    }));
    state.map.tiles[tileIndex(state.map, 4, 2)]!.terrain = 'coast';
    state.units[2]!.trade = { from: 1, to: 2, expiresTurn: 20, outbound: true, autoResend: false } as NonNullable<Unit['trade']>;
    state.units[0]!.trade = { ...state.units[2]!.trade! };
    resetVisibility(state);
    layer.build(state, board, library, new Quaternion(), false, null, null, null, null, null, 0, null);
    for (const unit of state.units) {
      const terrain = terrainUnder(state.map, unit);
      const piece = board.pieces[unitSculpt(unit, terrain)];
      const body = layer.modelCandidates().find(candidate => candidate.unitId === unit.id)!.object;
      expect(body.geometry).toBe(piece.geometry);
      const resting = Array.isArray(body.material) ? body.material : [body.material];
      const moving = pieceMaterials(library, piece, unitColor(state, unit));
      expect(moving).toEqual(body.material);
      expect(resting.length).toBeGreaterThan(0);
      for (const material of resting) expectBodyStencil(material as MeshToonMaterial);
      for (const color of pieceColors(piece, unitColor(state, unit))) expect(library.get(color).stencilWrite).toBe(false);
    }
  });
});
