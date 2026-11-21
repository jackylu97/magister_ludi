import { InstancedMesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { DioramaCamera } from '../../src/render3d/camera3d';
import { layerVisibility } from '../../src/render3d/layerVisibility';
import { FogView } from '../../src/render3d/fog3d';
import { NO_LENS } from '../../src/render3d/lens3d';
import { applyCommand } from '../../src/sim/commands';
import { badgeAnchors, signUnits, UnitLayer, unitVisualHeight } from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { VIEW3D } from '../../src/render3d/lookData';
import { signCities, signTerritory, signCityCells } from '../../src/render3d/cities3d';
import { signImprovements, signImprovedCells } from '../../src/render3d/improvements3d';
import { signRoadCells } from '../../src/render3d/roads3d';
import { signSites } from '../../src/render3d/sites3d';
import { BoardGeometry, signFeatureCells } from '../../src/render3d/board3d';
import { createUnit, type GameState } from '../../src/sim/state';
import { createMap } from '../../src/sim/map';
import { resetVisibility } from '../../src/sim/visibility';
import { foundCityAt } from '../../src/sim/cities';
import { newGame } from '../sim/newGameHelpers';

function fixture() {
  const state = newGame({seed: 7, sizeName: 'duel', players: [{name: 'A', color: '#ac3333', isHuman: true}, {name: 'B', color: '#3344ac', isHuman: true}]});
  state.map = createMap({width: 12, height: 8, terrain: 'grassland'});
  state.units = []; state.cities = []; state.camps = []; state.tileOwner = Array(96).fill(null);
  resetVisibility(state); state.visibility[0]!.fill(2);
  const unit = createUnit(state, 0, 'warrior', 2, 2);
  foundCityAt(state, 0, state.map.tiles[5 * 12 + 8]!);
  state.visibility[0]!.fill(2);
  const signatures = {cities: signCities, territory: signTerritory, improvements: signImprovements, roads: signRoadCells, sites: signSites};
  const scenery = Object.fromEntries(Object.keys(signatures).map(key => [key, vi.fn()])) as Record<keyof typeof signatures, ReturnType<typeof vi.fn>>;
  const units = new UnitLayer(), geometry = new BoardGeometry();
  const materials = new MaterialLibrary(VIEW3D.look.rampSteps, 0);
  const badgeMaterial = new MeshBasicMaterial();
  onTestFinished(() => { units.dispose(); geometry.dispose(); materials.dispose(); badgeMaterial.dispose(); });
  const calls = { ...scenery, units: vi.spyOn(units, 'build') };
  const dynamicShadows = vi.fn();
  const data: Record<string, unknown> = {
    state, map: state.map, fogSeat: 0, visibilitySignatures: null, paintedBoard: null,
    paintedWorks: null, paintedCities: null, paintedLook: {invalidateDynamicShadows: dynamicShadows}, paintedSites: null, paintedRoads: null, paintedTerritory: null,
    units, geometry, materials, badges: {materialFor: () => badgeMaterial},
    view: {facing: new Quaternion()}, animations: {activeUnits: () => []},
    lensView: {mode: 'none', yields: false, resources: false}, religionSignature: 0,
    clearedCitiesSignature: signCityCells(state), clearedImprovementsSignature: signImprovedCells(state), clearedFeaturesSignature: signFeatureCells(state.map),
    applyFog: () => ({tiles: 0}), applyReveal: () => null, reveal: null,
    setHoveredUnitId: vi.fn(), rebuildOverlays: vi.fn(), rebuildLens: vi.fn(),
    cityBannerAnchors: new Map(), clearGround: vi.fn(),
  };
  const runtime = Object.assign(Object.create(Renderer3D.prototype), data) as Renderer3D;
  for (const [key, sign] of Object.entries(signatures)) Object.assign(runtime, {
    [`rebuild${key[0]!.toUpperCase()}${key.slice(1)}`]: (shadowChanged?: boolean) => {
      calls[key as keyof typeof signatures](shadowChanged);
      Object.assign(runtime, {[`${key}Signature`]: sign(runtime.getGameState()!, 0)});
    },
  });
  runtime.setGameState(state);
  for (const call of Object.values(calls)) call.mockClear();
  dynamicShadows.mockClear();
  return {state, unit, units, runtime, calls, dynamicShadows, badgeMaterial};
}

describe('incremental renderer updates', () => {
  it.each([
    {mode: 'explorer', chartNewCell: false, rebuild: false},
    {mode: 'none', chartNewCell: false, rebuild: false},
    {mode: 'explorer', chartNewCell: true, rebuild: true},
    {mode: 'settler', chartNewCell: false, rebuild: true},
    {mode: 'faith', chartNewCell: false, rebuild: true},
  ] as const)('updates a $mode lens after a move when its inputs change (new chart cell: $chartNewCell)', ({mode, chartNewCell, rebuild}) => {
    const {state, runtime, unit, calls} = fixture(), levels = state.visibility[0]!;
    const fog = new FogView(state.map, { own: new Map(), shared: [] });
    onTestFinished(() => fog.dispose());
    // This distant farm, ruin and city's borders will fade into memory when the mover's sight is recomputed.
    state.map.tiles[0]!.improvement = 'farm';
    state.map.tiles[1]!.discovery = 'ruins';
    if (chartNewCell) levels[3 + 12] = 0;
    fog.apply(levels);
    const workFog = vi.fn(() => true);
    const view = Object.assign(runtime as unknown as {
      syncStateLayers(): void; lensDirty: boolean;
    }, {
      lens: {glyphValuesChanged: () => false},
      lensView: {...NO_LENS, mode, yields: true, resources: true},
      clearedImprovementsSignature: signImprovedCells(state),
      rebuildPaintedWorks: workFog,
      applyFog: () => fog.apply(levels),
    });
    view.syncStateLayers();
    view.lensDirty = false;
    calls.sites.mockClear();
    calls.improvements.mockClear();
    const result = applyCommand(state, {type: 'moveUnit', playerId: 0, unitId: unit.id, target: {col: 3, row: 2}});
    expect(result.ok).toBe(true);
    runtime.noteStateChanged('moveUnit');
    view.syncStateLayers();
    expect(levels[0]).toBe(1);
    expect(calls.sites).toHaveBeenCalled();
    expect(calls.improvements).toHaveBeenCalled();
    expect(view.lensDirty).toBe(rebuild);
  });

  it('updates pins with yields off when a resource becomes known or its city disappears', () => {
    const {runtime, state} = fixture();
    const view = Object.assign(runtime as unknown as {syncStateLayers(): void; lensDirty: boolean}, {
      lensView: {...NO_LENS, resources: true},
      applyReveal: () => ({cells: 1, matrixWrites: 0}),
    });
    view.syncStateLayers();
    expect(view.lensDirty).toBe(true);
    view.lensDirty = false;
    view.applyReveal = () => ({cells: 0, matrixWrites: 0});
    view.syncStateLayers();
    expect(view.lensDirty).toBe(false);
    state.cities.length = 0;
    view.syncStateLayers();
    expect(view.lensDirty).toBe(true);
  });

  it('moves and damages a unit without rebuilding unrelated scenery', () => {
    const f = fixture(); f.unit.col++;
    f.runtime.setGameState(f.state);
    expect(f.calls.units).toHaveBeenCalledOnce();
    for (const [name, call] of Object.entries(f.calls)) if (name !== 'units') expect(call).not.toHaveBeenCalled();
    f.runtime.setGameState(f.state); expect(f.calls.units).toHaveBeenCalledOnce();
    f.unit.hp--; f.runtime.setGameState(f.state); expect(f.calls.units).toHaveBeenCalledTimes(2);
  });
  it('handles in-place command changes on the drawn frame as well as setGameState', () => {
    const f = fixture(); f.unit.col++;
    // Private entry point exercised without WebGL; this is the real frame path.
    (f.runtime as unknown as {syncStateLayers(): void}).syncStateLayers();
    expect(f.calls.units).toHaveBeenCalledOnce(); expect(f.calls.cities).not.toHaveBeenCalled();
    f.state.map.tiles[4]!.road = 0;
    (f.runtime as unknown as {syncStateLayers(): void}).syncStateLayers();
    expect(f.calls.roads).toHaveBeenCalledOnce(); expect(f.calls.sites).not.toHaveBeenCalled();
  });
  it('keeps the unit batches and moving shadows when units change outside sight', () => {
    const {state, unit, units, runtime, calls, dynamicShadows} = fixture();
    const levels = state.visibility[0]!;
    const enemy = createUnit(state, 1, 'warrior', 3, 3);
    levels[3 * 12 + 3] = 1;
    levels[3 * 12 + 4] = 0;
    runtime.setGameState(state);
    enemy.col++;
    enemy.hp--;
    runtime.setGameState(state);
    expect(calls.units).not.toHaveBeenCalled();
    expect(dynamicShadows).not.toHaveBeenCalled();
    expect(units.isDrawing(unit.id)).toBe(true);
    expect(units.isDrawing(enemy.id)).toBe(false);

    levels[3 * 12 + 4] = 2;
    runtime.setGameState(state);
    expect(calls.units).toHaveBeenCalledOnce();
    expect(dynamicShadows).toHaveBeenCalledOnce();
    expect(units.isDrawing(enemy.id)).toBe(true);

    enemy.col--;
    runtime.setGameState(state);
    expect(calls.units).toHaveBeenCalledTimes(2);
    expect(dynamicShadows).toHaveBeenCalledTimes(2);
    expect(units.isDrawing(enemy.id)).toBe(false);

    runtime.setFogSeat(null);
    expect(units.isDrawing(enemy.id)).toBe(true);
    enemy.col++;
    runtime.setGameState(state);
    expect(calls.units).toHaveBeenCalledTimes(4);
    expect(dynamicShadows).toHaveBeenCalledTimes(4);
  });
  it('only updates layers whose content changed visibility, including becoming hidden', () => {
    const f = fixture();
    f.state.visibility[0]![0] = 1; f.runtime.setGameState(f.state);
    for (const call of Object.values(f.calls)) expect(call).not.toHaveBeenCalled();
    f.state.visibility[0]![f.unit.row * 12 + f.unit.col] = 0; f.runtime.setGameState(f.state);
    expect(f.calls.units).toHaveBeenCalledOnce(); expect(f.calls.cities).not.toHaveBeenCalled();
    // The argument is only "force a bake"; whether a fog move re-bakes the static
    // shadows is decided inside the rebuild from what the layer drew, and is
    // pinned in `paintedShadowBakes.test.ts`.
    f.state.visibility[0]![5 * 12 + 8] = 1; f.runtime.setGameState(f.state);
    expect(f.calls.cities).toHaveBeenCalledOnce(); expect(f.calls.cities).toHaveBeenCalledWith(false); expect(f.calls.territory).toHaveBeenCalledOnce();
    f.state.visibility[0]![5 * 12 + 8] = 0; f.runtime.setGameState(f.state);
    expect(f.calls.cities).toHaveBeenCalledTimes(2); expect(f.calls.cities).toHaveBeenLastCalledWith(false);
  });
  it('moves a standing unit’s badge and click target to a new town and back after razing', () => {
    const {state, unit, units, runtime, calls, badgeMaterial} = fixture();
    const drawsBadge = () => units.group.children.some(mesh =>
      mesh instanceof InstancedMesh && mesh.material === badgeMaterial && mesh.count > 0);
    const canPickBadge = () => badgeAnchors(state, 0, () => 1).some(anchor => anchor.unitId === unit.id);
    expect(drawsBadge()).toBe(true);
    expect(canPickBadge()).toBe(true);
    const city = foundCityAt(state, 0, state.map.tiles[unit.row * state.map.width + unit.col]!);
    runtime.setGameState(state);
    expect(calls.units).toHaveBeenCalledOnce();
    expect(units.isDrawing(unit.id)).toBe(true);
    expect(drawsBadge()).toBe(false);
    expect(canPickBadge()).toBe(false);
    state.cities = state.cities.filter(town => town.id !== city.id);
    runtime.setGameState(state);
    expect(calls.units).toHaveBeenCalledTimes(2);
    expect(drawsBadge()).toBe(true);
    expect(canPickBadge()).toBe(true);
  });
  it('reuses badge positions across pointer samples and projects them through the current view', () => {
    const {state, unit, runtime} = fixture();
    const canvas = {clientWidth: 840, clientHeight: 560};
    const view = new DioramaCamera();
    view.resize(canvas.clientWidth, canvas.clientHeight);
    view.openAt(4, 3);
    const camera = view.camera;
    Object.assign(runtime, {view, canvas});
    const samples = (seat: number) => badgeAnchors(state, seat, type => unitVisualHeight(type, null));
    const hit = (anchor: ReturnType<typeof samples>[number], seat: number) => {
      const p = new Vector3(anchor.x, anchor.y, anchor.z).project(camera);
      return runtime.pickUnitBadge((p.x + 1) * canvas.clientWidth / 2, (1 - p.y) * canvas.clientHeight / 2, seat);
    };
    const initial = samples(0);
    const scans = vi.spyOn(state.units, Symbol.iterator);
    expect(hit(initial[0]!, 0)).toBe(unit.id);
    expect(scans).toHaveBeenCalledTimes(4);
    scans.mockClear();
    camera.zoom = 1.8;
    canvas.clientWidth = 660;
    view.resize(canvas.clientWidth, canvas.clientHeight);
    for (let sample = 0; sample < 20; sample++) {
      for (const anchor of initial) expect(hit(anchor, 0)).toBe(unit.id);
    }
    expect(scans).not.toHaveBeenCalled();

    unit.col++;
    const trader = createUnit(state, 0, 'trader', unit.col, unit.row);
    const ally = createUnit(state, 1, 'worker', 9, 3);
    runtime.noteStateChanged();
    const moved = samples(0);
    expect(moved.map(anchor => anchor.unitId)).toEqual([unit.id, unit.id, unit.id]);
    expect(hit(initial[1]!, 0)).toBeNull();
    expect(hit(moved[1]!, 0)).toBe(unit.id);
    for (const anchor of samples(1)) expect(hit(anchor, 1)).toBe(ally.id);

    unit.col = 8; unit.row = 5;
    runtime.invalidate();
    const freed = samples(0);
    expect(freed.map(anchor => anchor.unitId)).toEqual([trader.id, trader.id, trader.id]);
    for (const anchor of freed) expect(hit(anchor, 0)).toBe(trader.id);
  });
  it('forces presentation refresh for a different state on the same map', () => {
    const f = fixture(), loaded: GameState = {...f.state, players: structuredClone(f.state.players)};
    loaded.players[0]!.color = '#00aacc'; f.runtime.setGameState(loaded);
    for (const call of Object.values(f.calls)) expect(call).toHaveBeenCalledOnce();
  });
  it('tracks work and discovery fog outside visible-only unit cells', () => {
    const f = fixture(), levels = f.state.visibility[0]!;
    f.state.map.tiles[3]!.resource = 'cattle'; f.state.map.tiles[4]!.discovery = 'ruins';
    const before = layerVisibility(f.state, levels, 0), pieces = signUnits(f.state, 0);
    levels[3] = 0; levels[4] = 1;
    const after = layerVisibility(f.state, levels, 0);
    expect(after.works).not.toBe(before.works); expect(after.sites).not.toBe(before.sites);
    expect(signUnits(f.state, 0)).toBe(pieces); expect(after.cities).toBe(before.cities);
  });
});
