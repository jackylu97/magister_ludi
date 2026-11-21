// @ts-expect-error Node is provided by the test runner, outside the browser TS target.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node is provided by the test runner, outside the browser TS target.
import { gunzipSync } from 'node:zlib';
import { MeshBasicMaterial, Quaternion } from 'three';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import { LensLayer, NO_LENS } from '../../src/render3d/lens3d';
import { BoardTileYields, type TileYieldSample, seenTileYields, yieldLightTiles } from '../../src/render3d/boardTileYields';
import { foldTile } from '../../src/sim/yields/hex';
import { signPaintedWorks } from '../../src/render3d/paintedWorks';
import { yieldLightHex } from '../../src/render3d/paintedYieldLight';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { MaterialLibrary } from '../../src/render3d/toon';
import { applyCommand } from '../../src/sim/commands';
import { type GameState, bumpRevision } from '../../src/sim/state';
import { discardSlates, economyStamp } from '../../src/sim/slate';
import { orderDef } from '../../src/sim/statecraftData';

function fixture(seat: number) {
  const path = new URL('../../scripts/input-latency/fixtures/turn120.json.gz', import.meta.url);
  const { state } = JSON.parse(gunzipSync(readFileSync(path)).toString()) as { state: GameState };
  const price = vi.fn(foldTile);
  const cache = new BoardTileYields(price);
  const shown = new Map();
  const build = vi.fn((_state: GameState, _map: GameState['map'], _levels: number[], _seat: number, _period: number, sample: TileYieldSample) => {
    shown.clear();
    sample.tiles.forEach((tile, i) => {
      const light = yieldLightHex(sample.values[i]!);
      if (light) shown.set(tile.row * state.map.width + tile.col, light);
    });
  });
  const renderer = Object.assign(Object.create(Renderer3D.prototype), {
    state, fogSeat: seat, tileYields: cache, yieldLightSignature: null,
    fogLevels: () => state.visibility[seat],
    paintedBoard: { renderMap: state.map }, paintedYieldLight: { group: {}, build, shown },
  }) as { rebuildYieldLight(works: number): void; yieldLightSample: TileYieldSample };
  const draw = () => renderer.rebuildYieldLight(signPaintedWorks(state, seat));
  const sample = () => renderer.yieldLightSample;
  return { state, price, cache, build, draw, sample };
}

describe('tile yields on the board', () => {
  it('reuses all prices still in sight after a move and shares them with the glyphs', () => {
    const { state, cache, price, draw, sample, build } = fixture(0);
    draw();
    expect(sample().tiles).toHaveLength(254);
    price.mockClear();
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: 256, target: {col: 54, row: 19} }).ok).toBe(true);
    draw();
    expect(sample().tiles).toHaveLength(253);
    expect(build).toHaveBeenCalledTimes(1);
    const { tiles, values } = sample();
    expect(values).toEqual(seenTileYields(state, 0, tiles));

    const geometry = new BoardGeometry();
    const materials = new MaterialLibrary(3, 0);
    const ink = new MeshBasicMaterial();
    const lens = new LensLayer(cache);
    onTestFinished(() => { lens.dispose(); ink.dispose(); geometry.dispose(); materials.dispose(); });
    lens.build(state, { ...NO_LENS, playerId: 0, yields: true, yieldCells: tiles }, geometry, materials,
      { material: ink } as TileIcons, new Quaternion(), state.visibility[0]!);
    expect(price.mock.calls.length).toBe(0);
    const draws = build.mock.calls.length;
    bumpRevision(state);
    draw();
    expect(build).toHaveBeenCalledTimes(draws);
    expect(lens.glyphValuesChanged(state)).toBe(false);
    expect(price.mock.calls.length).toBe(253);
  });

  it('refreshes visible motes and glyph inputs after The Highlands leaves the council', () => {
    const { state, cache, draw, sample, build } = fixture(1);
    draw();
    const start = sample();
    expect(start.tiles).toHaveLength(97);
    const cell = start.tiles.findIndex(tile => tile.col === 7 && tile.row === 40);
    expect(yieldLightHex(start.values[cell]!)?.score).toBe(8.5);
    const extra = state.map.tiles.find(tile => !start.tiles.includes(tile))!;
    cache.sample(state, 1, [extra]);
    expect(applyCommand(state, { type: 'unslotOrder', playerId: 1, slotIndex: 5 }).ok).toBe(true);
    draw();
    expect(build).toHaveBeenCalledTimes(2);
    const end = sample();
    expect(end.tiles).toEqual(start.tiles);
    expect(end.values).toEqual(seenTileYields(state, 1, end.tiles));
    expect(end.values.filter((v, i) => yieldLightHex(v)?.step !== yieldLightHex(start.values[i]!)?.step)).toHaveLength(14);
    expect(yieldLightHex(end.values[cell]!)?.score).toBe(4.5);
    expect(cache.sample(state, 1, [extra]).values).toEqual(seenTileYields(state, 1, [extra]));
  });

  it('drops just the newly hidden cell when a move changes sight alone', () => {
    const { state, price, draw, sample } = fixture(0);
    draw();
    price.mockClear();
    const before = economyStamp(state);
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: 364, target: {col: 59, row: 6} }).ok).toBe(true);
    expect(economyStamp(state)).toBe(before);
    draw();
    expect(sample().tiles).toHaveLength(253);
    expect(sample().values).toEqual(seenTileYields(state, 0, sample().tiles));
    expect(price.mock.calls.length).toBe(0);
  });

  it('keeps the visible yield sample when the swordsman passes through Dawnreach', () => {
    const { state, price, draw, sample } = fixture(0);
    draw();
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: 1293, target: {col: 53, row: 26} }).ok).toBe(true);
    draw();
    const before = sample();
    price.mockClear();
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: 818, target: {col: 51, row: 24} }).ok).toBe(true);
    draw();
    expect(sample()).toBe(before);
    expect(price).not.toHaveBeenCalled();
    expect(sample().values).toEqual(seenTileYields(state, 0, sample().tiles));
  });

  it('updates resource tiles when a garrison leaves a city under The Soldier-Farmers', () => {
    const { state, price, draw, sample } = fixture(0);
    const card = 'dominionTheSoldierFarmers';
    (state.players[0]!.timed ??= []).push({ card, expiresTurn: state.turn + 1, effect: orderDef(card).effects[0]! });
    bumpRevision(state);
    draw();
    const quote = () => sample().values[sample().tiles.findIndex(t => t.col === 54 && t.row === 19)]!;
    const before = quote();
    price.mockClear();
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: 256, target: {col: 54, row: 19} }).ok).toBe(true);
    draw();
    expect(quote().gold).toBeLessThan(before.gold);
    expect(quote().production).toBeLessThan(before.production);
    expect(sample().values).toEqual(seenTileYields(state, 0, sample().tiles));
    expect(price.mock.calls.length).toBeGreaterThan(0);
    expect(price.mock.calls.length).toBeLessThan(sample().tiles.length);
  });

  it('prices a newly requested tile once per viewer and resets on a board replacement', () => {
    const { state, price, cache } = fixture(0);
    const tiles = yieldLightTiles(state, state.visibility[0]!);
    cache.sample(state, 0, tiles.slice(0, 1));
    cache.sample(state, 0, tiles.slice(0, 2));
    expect(cache.sample(state, 1, tiles.slice(0, 2)).values).toEqual(seenTileYields(state, 1, tiles.slice(0, 2)));
    const loaded = structuredClone(state);
    cache.sample(loaded, 1, [loaded.map.tiles[0]!]);
    cache.reset();
    cache.sample(loaded, 1, [loaded.map.tiles[0]!]);
    discardSlates();
    cache.sample(loaded, 1, [loaded.map.tiles[0]!]);
    expect(price.mock.calls.length).toBe(7);
  });
});
