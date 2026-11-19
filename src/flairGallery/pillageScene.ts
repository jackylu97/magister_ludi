import { damageImprovement, getTileAt, raiseImprovement } from '../sim/map';
import { bumpRevision, type GameState } from '../sim/state';
import { VISIBLE } from '../sim/visibility';
// @ts-expect-error The painted terrain kit is JavaScript.
import { isWater } from '../terrainStudy/surface.js';

export const PILLAGE_VIEWS = [
  ['intact', 'Working'], ['models', 'Broken models'], ['ash', 'Ash'], ['embers', 'Ash and embers'],
] as const;
export type PillagePreview = typeof PILLAGE_VIEWS[number][0];

// The scene includes three land improvements and one fishing site.
const samples = [
  { col: 16, row: 6 }, { col: 17, row: 5 },
  { col: 14, row: 7 }, { col: 19, row: 9 },
];

/** The gallery holds each damage stage so the reviewer can compare it from the same camera. */
export function pillageScene(state: GameState, seat: number, stress: boolean) {
  const shown = [...samples];
  if (stress) {
    for (const tile of state.map.tiles) {
      if (shown.some(at => at.row === tile.row && at.col === tile.col)) continue;
      if (!tile.improvement && tile.terrain === 'grassland' && !state.cities.some(city => city.col === tile.col && city.row === tile.row)) {
        raiseImprovement(tile, 'farm', state.turn);
      }
      if (tile.improvement) shown.push({ col: tile.col, row: tile.row });
    }
  }
  const changed = shown.flatMap(sample => {
    const tile = getTileAt(state.map, sample.col, sample.row);
    if (!tile?.improvement) return [];
    return [{ tile, work: tile.improvement, built: tile.improvedOn }];
  });
  const landWorks = changed.filter(({tile}) => state.visibility[seat]?.[tile.row * state.map.width + tile.col] === VISIBLE && !isWater(tile)).length;
  return { landWorks, show(mode: PillagePreview) {
    for (const { tile, work, built } of changed) {
      if (mode === 'intact' && tile.damagedImprovement) raiseImprovement(tile, work, built ?? state.turn);
      if (mode !== 'intact' && tile.improvement) damageImprovement(tile, state.turn);
    }
    bumpRevision(state);
  }};
}
