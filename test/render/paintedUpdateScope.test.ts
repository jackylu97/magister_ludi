import { describe, expect, it, vi } from 'vitest';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { layerVisibility } from '../../src/render3d/layerVisibility';
import { signUnits } from '../../src/render3d/pieces';
import { signCities, signTerritory, signCityCells } from '../../src/render3d/cities3d';
import { signImprovements, signImprovedCells } from '../../src/render3d/improvements3d';
import { signRoadCells } from '../../src/render3d/roads3d';
import { signSites } from '../../src/render3d/sites3d';
import { signFeatureCells } from '../../src/render3d/board3d';
import { newGame, createUnit, type GameState } from '../../src/sim/state';
import { createMap } from '../../src/sim/map';
import { resetVisibility } from '../../src/sim/visibility';
import { foundCityAt } from '../../src/sim/cities';

function fixture() {
  const state = newGame({seed: 7, sizeName: 'duel', players: [{name: 'A', color: '#ac3333', isHuman: true}, {name: 'B', color: '#3344ac', isHuman: true}]});
  state.map = createMap({width: 12, height: 8, terrain: 'grassland'});
  state.units = []; state.cities = []; state.camps = []; state.tileOwner = Array(96).fill(null);
  resetVisibility(state); state.visibility[0]!.fill(2);
  const unit = createUnit(state, 0, 'warrior', 2, 2);
  foundCityAt(state, 0, state.map.tiles[5 * 12 + 8]!);
  state.visibility[0]!.fill(2);
  const signatures = {units: signUnits, cities: signCities, territory: signTerritory, improvements: signImprovements, roads: signRoadCells, sites: signSites};
  const calls = Object.fromEntries(Object.keys(signatures).map(key => [key, vi.fn()])) as Record<keyof typeof signatures, ReturnType<typeof vi.fn>>;
  const data: Record<string, unknown> = {
    state, map: state.map, fogSeat: 0, visibilitySignatures: null, paintedBoard: null,
    paintedWorks: null, paintedCities: null, paintedLook: null, paintedSites: null, paintedRoads: null, paintedTerritory: null,
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
  return {state, unit, runtime, calls};
}

describe('incremental renderer updates', () => {
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
  it('only updates layers whose content changed visibility, including becoming hidden', () => {
    const f = fixture();
    f.state.visibility[0]![0] = 1; f.runtime.setGameState(f.state);
    for (const call of Object.values(f.calls)) expect(call).not.toHaveBeenCalled();
    f.state.visibility[0]![f.unit.row * 12 + f.unit.col] = 0; f.runtime.setGameState(f.state);
    expect(f.calls.units).toHaveBeenCalledOnce(); expect(f.calls.cities).not.toHaveBeenCalled();
    f.state.visibility[0]![5 * 12 + 8] = 1; f.runtime.setGameState(f.state);
    expect(f.calls.cities).toHaveBeenCalledOnce(); expect(f.calls.cities).toHaveBeenCalledWith(false); expect(f.calls.territory).toHaveBeenCalledOnce();
    f.state.visibility[0]![5 * 12 + 8] = 0; f.runtime.setGameState(f.state);
    expect(f.calls.cities).toHaveBeenLastCalledWith(true);
  });
  it('forces presentation refresh for a different state on the same map', () => {
    const f = fixture(), loaded: GameState = {...f.state, players: structuredClone(f.state.players)};
    loaded.players[0]!.color = '#00aacc'; f.runtime.setGameState(loaded);
    for (const call of Object.values(f.calls)) expect(call).toHaveBeenCalledOnce();
  });
  it('tracks work and discovery fog outside visible-only unit cells', () => {
    const f = fixture(), levels = f.state.visibility[0]!;
    f.state.map.tiles[3]!.resource = 'cattle'; f.state.map.tiles[4]!.discovery = 'ruins';
    const before = layerVisibility(f.state, levels, 0);
    levels[3] = 0; levels[4] = 1;
    const after = layerVisibility(f.state, levels, 0);
    expect(after.works).not.toBe(before.works); expect(after.sites).not.toBe(before.sites);
    expect(after.units).toBe(before.units); expect(after.cities).toBe(before.cities);
  });
});
