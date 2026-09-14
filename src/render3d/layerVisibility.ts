import type { GameState } from '../sim/state';
import type { FogLevels } from './fog3d';
import { seatSeesSleepingVein } from '../sim/improvements';

export type LayerVisibility = Record<'units' | 'cities' | 'improvements' | 'works' | 'roads' | 'sites' | 'territory', number>;

/** Only visibility on cells a layer can draw affects its buffers. No sim writes. */
export function layerVisibility(state: GameState, levels: FogLevels, seat: number | null, shadowOnly = false): LayerVisibility {
  const hashes: LayerVisibility = {units: 0, cities: 0, improvements: 0, works: 0, roads: 0, sites: 0, territory: 0};
  const add = (key: keyof LayerVisibility, cell: number): void => {
    const level = levels === null ? 2 : levels[cell] ?? 0;
    hashes[key] = Math.imul(hashes[key] ^ cell, 16777619) ^ (shadowOnly ? Number(level > 0) : level);
  };
  for (const unit of state.units) add('units', unit.row * state.map.width + unit.col);
  for (const city of state.cities) add('cities', city.row * state.map.width + city.col);
  for (const camp of state.camps) add('sites', camp.row * state.map.width + camp.col);
  for (let cell = 0; cell < state.map.tiles.length; cell++) {
    const tile = state.map.tiles[cell]!;
    if (tile.improvement) add('improvements', cell);
    if (tile.improvement || tile.resource) add('works', cell);
    if (tile.road !== undefined) add('roads', cell);
    if (tile.discovery || (seat !== null && seatSeesSleepingVein(state, seat, tile))) add('sites', cell);
    if (state.tileOwner[cell] != null) add('territory', cell);
  }
  return hashes;
}
