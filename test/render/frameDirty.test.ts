/**
 * The renderer keeps two reasons to draw apart: "the state may have changed"
 * (runs `syncStateLayers`, every fingerprint on the map) and "only the picture
 * is stale" (camera, hover, overlays). A pan used to pay the whole sweep on
 * every frame (WebGL audit 2026-10-06, finding 4). These tests drive the real
 * frame loop with WebGL stubbed out and count the sweeps.
 */
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { DeathAnimations3D, MoveAnimations3D } from '../../src/render3d/animation3d';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { TraitGlows } from '../../src/render3d/traitGlow';
import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import { LensLayer, NO_LENS } from '../../src/render3d/lens3d';
import { MaterialLibrary } from '../../src/render3d/toon';
import { applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, raiseImprovement } from '../../src/sim/map';
import { layRoad } from '../../src/sim/roads';
import { orderFitsSlot, slotLayout } from '../../src/sim/statecraftData';
import { resetVisibility } from '../../src/sim/visibility';
import { newGame } from '../sim/newGameHelpers';

interface Loop { loop(): void; syncStateLayers(): void }

function fixture(state: unknown = null) {
  const sync = vi.fn();
  const setBadgeSelection = vi.fn();
  const clearHidden = vi.fn();
  const isDrawing = vi.fn();
  const animations = new MoveAnimations3D();
  const deaths = new DeathAnimations3D();
  const glows = new TraitGlows();
  const walkers = new Map<number, Group>();
  const fallers = new Map<number, Group>();
  const walkerModels = new Map<number, unknown>();
  const remove = vi.fn();
  const rebuildUnits = vi.fn();
  const buildOverlays = vi.fn();
  const view = { pan: vi.fn(), zoomByFactor: vi.fn(() => true), stepPan: () => false, camera: { right: 1, left: -1 } };
  const data: Record<string, unknown> = {
    running: true, stateDirty: false, frameDirty: false,
    state, map: null, fogSeat: null, hover: null, hoveredUnitId: null,
    overlays: {build: buildOverlays}, reachable: [], attackable: [],
    animations, deaths, glows, walkers, fallers, walkerModels,
    vignette: { step: () => false, place: vi.fn(), focus: () => null, setFocus: vi.fn() },
    view, paintedBoard: null, paintedLook: null,
    canvas: { clientWidth: 800, clientHeight: 600 },
    renderer: { render: vi.fn(), info: { render: { calls: 0, triangles: 0 } } },
    units: { modelCandidates: () => [], setHoveredUnitId: vi.fn(), setBadgeSelection, clearHidden, isDrawing },
    selectedUnitId: null, rebuildUnits,
    scene: { remove, children: [] }, frameListener: null,
    syncStateLayers: sync, applyLight: vi.fn(), cityFocusAnchor: () => null,
  };
  const runtime = Object.assign(Object.create(Renderer3D.prototype), data) as Renderer3D;
  const frame = (): void => (runtime as unknown as Loop).loop();
  const drawn = (): number => (data.renderer as { render: ReturnType<typeof vi.fn> }).render.mock.calls.length;
  return {
    runtime, sync, frame, drawn, view, buildOverlays, setBadgeSelection, clearHidden, isDrawing, rebuildUnits,
    animations, deaths, glows, walkers, fallers, walkerModels, remove,
  };
}

describe('a camera frame draws without re-reading the state', () => {
  beforeEach(() => { vi.stubGlobal('requestAnimationFrame', () => 0); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('pans and zooms draw a frame and run no state sweep', () => {
    const f = fixture();
    for (let i = 0; i < 10; i++) {
      f.runtime.panByScreen(4, 2);
      f.frame();
      f.runtime.zoomBy(1.05, 400, 300);
      f.frame();
    }
    expect(f.drawn()).toBe(20);
    expect(f.sync).not.toHaveBeenCalled();
  });

  it('keeps the hover outline and waits for another reason to draw at a zoom limit', () => {
    const f = fixture();
    f.runtime.setHoveredUnitId(4);
    f.frame();
    const hover = vi.spyOn(f.runtime, 'setHoveredUnitId');
    f.view.zoomByFactor.mockReturnValue(false);
    f.runtime.zoomBy(1.05, 400, 300);
    f.frame();
    expect(hover).not.toHaveBeenCalled();
    expect(f.drawn()).toBe(1);
  });

  it('a hover move draws a frame and runs no state sweep', () => {
    const f = fixture();
    const tile = (n: number) => ({ tile: { col: n, row: 0 } }) as never;
    for (let i = 0; i < 5; i++) { f.runtime.setHover(tile(i)); f.frame(); }
    expect(f.drawn()).toBe(5);
    expect(f.sync).not.toHaveBeenCalled();
  });

  it('draws the first walking pose at the time the board finishes its updates', () => {
    const f = fixture();
    const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
    Object.assign(f.runtime, { map });
    const now = vi.spyOn(performance, 'now').mockReturnValue(100);
    onTestFinished(() => now.mockRestore());
    const from = { col: 2, row: 3 }, to = { col: 3, row: 3 };
    f.animations.start(7, from, [to], 100);
    const walker = new Group();
    f.walkers.set(7, walker);
    f.sync.mockImplementationOnce(() => { now.mockReturnValue(125); });
    f.runtime.invalidate();
    f.frame();
    const sample = f.animations.sample(7, 125, map)!;
    expect(walker.position.x).toBeCloseTo(sample.x, 8);
    expect(walker.position.z).toBeCloseTo(sample.z, 8);
    expect(f.drawn()).toBe(1);
  });

  it('selection patches badge rims and draws a frame without rebuilding units', () => {
    const f = fixture();
    f.runtime.setSelectedUnitId(4);
    f.frame();
    f.runtime.setSelectedUnitId(4);
    f.frame();
    f.runtime.setSelectedUnitId(7);
    f.frame();
    f.runtime.setSelectedUnitId(null);
    f.frame();
    expect(f.setBadgeSelection.mock.calls).toEqual([[null, 4], [4, 7], [7, null]]);
    expect(f.rebuildUnits).not.toHaveBeenCalled();
    expect(f.sync).not.toHaveBeenCalled();
    expect(f.drawn()).toBe(3);
  });

  it('builds the final selection and range in the next frame even when a pick comes first', () => {
    const unit = {id: 7, col: 2, row: 3};
    const map = createMap({width: 8, height: 6, terrain: 'grassland'});
    const f = fixture({units: [unit]});
    Object.assign(f.runtime, {map});
    Object.assign(f.view, {screenRay: () => ({origin: new Vector3(2, 10, 3), direction: new Vector3(0, -1, 0)})});
    const reachable = [{col: 3, row: 3}];
    const attackable = [{col: 3, row: 4}];
    f.runtime.setSelectedUnitId(unit.id);
    f.runtime.setReachable(reachable);
    f.runtime.setAttackable(attackable);
    expect(f.buildOverlays).not.toHaveBeenCalled();
    const rebuildLens = vi.fn(() => Object.assign(f.runtime, {lensDirty: false}));
    Object.assign(f.runtime, {lensDirty: true, rebuildLens});
    expect(f.runtime.pickUnitModel(0, 0, 0)).toBeNull();
    expect(rebuildLens).not.toHaveBeenCalled();
    expect(f.buildOverlays).not.toHaveBeenCalled();
    f.frame();
    expect(rebuildLens).toHaveBeenCalledOnce();
    expect(f.buildOverlays).toHaveBeenCalledOnce();
    expect(f.buildOverlays.mock.calls[0]![1]).toMatchObject({
      selection: {col: unit.col, row: unit.row}, reachable, attackable,
    });
    f.frame();
    expect(f.buildOverlays).toHaveBeenCalledOnce();
    expect(f.drawn()).toBe(1);
  });

  it('refreshes changed lens markers before deciding whether a body hit is visible', () => {
    const map = createMap({width: 8, height: 6, terrain: 'grassland'});
    const unit = {id: 7, ownerId: 0, col: 2, row: 3};
    const f = fixture({ map, units: [unit], visibility: [map.tiles.map(() => 2)] });
    const geometry = new BoxGeometry(), material = new MeshBasicMaterial();
    onTestFinished(() => { geometry.dispose(); material.dispose(); });
    const body = new Mesh(geometry, material), pin = new Mesh(geometry, material);
    pin.position.z = 2;
    const scene = new Group();
    let showPin = true;
    const rebuildLens = vi.fn(() => {
      if (showPin) scene.add(pin);
      else scene.remove(pin);
      Object.assign(f.runtime, { lensDirty: false });
    });
    Object.assign(f.runtime, { map, scene, units: {modelCandidates: () => [{unitId: unit.id, object: body}]},
      lensDirty: true, rebuildLens });
    Object.assign(f.view, {screenRay: () => ({origin: new Vector3(0, 0, 10), direction: new Vector3(0, 0, -1)})});
    expect(f.runtime.pickUnitModel(0, 0, 0)).toBeNull();
    expect(rebuildLens).toHaveBeenCalledOnce();
    showPin = false;
    Object.assign(f.runtime, {lensDirty: true});
    expect(f.runtime.pickUnitModel(0, 0, 0)).toBe(unit.id);
    expect(rebuildLens).toHaveBeenCalledTimes(2);
  });

  it('invalidate, the verb a command calls, runs the sweep once and then idles', () => {
    const f = fixture();
    f.runtime.invalidate();
    f.frame();
    expect(f.sync).toHaveBeenCalledOnce();
    expect(f.drawn()).toBe(1);
    // Nothing asked since: the loop returns without drawing.
    f.frame();
    expect(f.drawn()).toBe(1);
    // A pan after a command: the command's sweep has already run.
    f.runtime.panByScreen(3, 0);
    f.frame();
    expect(f.sync).toHaveBeenCalledOnce();
    expect(f.drawn()).toBe(2);
  });

  it('an overlay rebuilt inside the sweep does not ask for a second sweep', () => {
    const f = fixture();
    f.sync.mockImplementation(function (this: { rebuildOverlays(): void }) { this.rebuildOverlays(); });
    f.runtime.invalidate();
    f.frame();
    f.frame();
    expect(f.sync).toHaveBeenCalledOnce();
    expect(f.drawn()).toBe(1);
  });

  it('draws the final yield glyphs once for multiple Council commands and board changes', () => {
    const state = newGame({seed: 4, sizeName: 'duel', players: [
      {name: 'A', color: '#a00', isHuman: true}, {name: 'B', color: '#00a', isHuman: true},
    ]});
    state.map = createMap({width: 12, height: 8, terrain: 'grassland'});
    state.units = []; state.cities = []; state.camps = [];
    state.tileOwner = Array(state.map.tiles.length).fill(null);
    resetVisibility(state);
    const field = state.map.tiles[4 * 12 + 6]!;
    foundCityAt(state, 0, state.map.tiles[4 * 12 + 5]!);
    layRoad(field, 0);
    state.visibility[0]!.fill(2);
    const council = state.players[0]!.statecraft;
    council.government = 'councilOfElders';
    const chairs = slotLayout(council.government);
    council.slots = chairs.map(() => null);
    const cards = ['lightKit', 'marketGardens', 'lettersOfMarque', 'fieldAcademies'] as const;
    council.orders.push(...cards);

    const f = fixture(state);
    const geometry = new BoardGeometry(), materials = new MaterialLibrary(4, 0);
    const layer = new LensLayer(), reference = new LensLayer();
    const atlas = new MeshBasicMaterial();
    const icons = {material: atlas, standingMaterial: atlas} as unknown as TileIcons;
    const facing = new Quaternion();
    const lens = {...NO_LENS, yields: true, yieldCells: [{col: field.col, row: field.row}]};
    Object.assign(f.view, {facing});
    Object.assign(f.runtime, {
      map: state.map, fogSeat: 0, lens: layer, lensView: NO_LENS, geometry, materials, icons,
      applyFog: vi.fn(), applyReveal: vi.fn(), rebuildImprovements: vi.fn(), rebuildCities: vi.fn(),
      rebuildTerritory: vi.fn(), rebuildRoads: vi.fn(), rebuildSites: vi.fn(),
    });
    onTestFinished(() => { layer.dispose(); reference.dispose(); geometry.dispose(); materials.dispose(); atlas.dispose(); });
    const builds = vi.spyOn(layer, 'build');
    const instances = (value: LensLayer) => value.group.children.flatMap(mesh => mesh instanceof InstancedMesh
      ? [{shape: mesh.geometry.uuid, x: mesh.position.x, count: mesh.count, transforms: Array.from(mesh.instanceMatrix.array)}]
      : []);
    const expectCurrent = (seat: number) => {
      reference.build(state, lens, geometry, materials, icons, facing, state.visibility[seat]!);
      expect(instances(layer)).toEqual(instances(reference));
    };
    f.runtime.setLens(lens);
    expectCurrent(0);
    const initial = instances(layer);
    builds.mockClear();
    for (const cardId of cards) {
      const slotIndex = chairs.findIndex((chair, index) => council.slots[index] === null && orderFitsSlot(cardId, chair));
      expect(slotIndex, cardId).toBeGreaterThanOrEqual(0);
      const result = applyCommand(state, {type: 'slotOrder', playerId: 0, cardId, slotIndex});
      expect(result.ok, JSON.stringify(result)).toBe(true);
      f.runtime.noteStateChanged();
    }
    f.runtime.noteStateChanged();
    f.runtime.invalidate();
    expect(builds).not.toHaveBeenCalled();
    f.frame();
    expect(builds).toHaveBeenCalledOnce();
    expectCurrent(0);
    expect(instances(layer)).not.toEqual(initial);
    f.frame();
    expect(builds).toHaveBeenCalledOnce();

    foundCityAt(state, 0, state.map.tiles[12 + 9]!);
    f.runtime.noteStateChanged();
    raiseImprovement(field, 'farm', state.turn);
    f.runtime.noteStateChanged();
    f.frame();
    expect(builds).toHaveBeenCalledTimes(2);
    expectCurrent(0);
    f.runtime.noteStateChanged();
    f.runtime.setFogSeat(1);
    expect(builds).toHaveBeenCalledTimes(3);
    expectCurrent(1);
    f.frame();
    expect(builds).toHaveBeenCalledTimes(3);
  });
});

describe('skipping unit animations', () => {
  it('defers an idle unit layer to the next dirty frame', () => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    try {
      const f = fixture({});
      f.runtime.skipAnimations();
      expect(f.clearHidden).toHaveBeenCalledOnce();
      expect(f.rebuildUnits).not.toHaveBeenCalled();
      expect(f.sync).not.toHaveBeenCalled();
      f.frame();
      f.frame();
      expect(f.sync).toHaveBeenCalledOnce();
      expect(f.drawn()).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each(['walk', 'walker mesh', 'fall', 'glow'] as const)('restores the unit layer when it skips a %s', (kind) => {
    const f = fixture({});
    const id = 1;
    const mesh = new Group();
    if (kind === 'walk') f.animations.start(id, { col: 0, row: 0 }, [{ col: 1, row: 0 }], 0);
    if (kind === 'walker mesh') {
      f.walkers.set(id, mesh);
      f.walkerModels.set(id, {});
    }
    if (kind === 'fall') {
      f.deaths.start(id, 0);
      f.fallers.set(id, mesh);
    }
    if (kind === 'glow') f.glows.start([id], 0);

    f.runtime.skipAnimations();
    expect(f.animations.pending).toBe(false);
    expect(f.deaths.activeUnits()).toEqual([]);
    expect(f.glows.pending).toBe(false);
    expect(f.walkers.size + f.fallers.size + f.walkerModels.size).toBe(0);
    if (kind === 'walker mesh' || kind === 'fall') expect(f.remove).toHaveBeenCalledWith(mesh);
    expect(f.clearHidden.mock.invocationCallOrder[0]).toBeLessThan(f.rebuildUnits.mock.invocationCallOrder[0]!);
    expect(f.rebuildUnits).toHaveBeenCalledOnce();
  });

  it('checks the updated unit layer when the handover starts a glow before the next frame', () => {
    const f = fixture({ units: [], wars: [] });
    f.rebuildUnits.mockImplementation(() => f.isDrawing.mockReturnValue(true));
    f.runtime.skipAnimations();
    expect(f.rebuildUnits).not.toHaveBeenCalled();

    f.runtime.glowUnits([1]);
    expect(f.rebuildUnits.mock.invocationCallOrder[0]).toBeLessThan(f.isDrawing.mock.invocationCallOrder[0]!);
    expect(f.glows.activeUnits()).toEqual([1]);
  });
});
