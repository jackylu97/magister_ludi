import { improvementDef, type ImprovementId } from './improvementData';
import { neighborTiles, tileHex, tileIndex, type Tile } from './map';
import { slateMemo } from './slate';
import type { GameState } from './state';

interface ImprovementFields {
  watering: number[];
  renown: number[];
  gifts?: Record<number, ImprovementId[]>;
  freshWater?: Record<number, true>;
}

/** Cities share the same board. Index the few works that affect other tiles or pay renown once per ground change. */
export function improvementFields(state: GameState): ImprovementFields {
  return slateMemo(state, 'ground', 'improvementFields', 'map', () => {
    const fields: ImprovementFields = { watering: [], renown: [] };
    const map = state.map;
    for (let index = 0; index < map.tiles.length; index++) {
      const tile = map.tiles[index]!;
      if (!tile.improvement) continue;
      const def = improvementDef(tile.improvement);
      if (def.renown) fields.renown.push(index);
      if (def.watersBeside) fields.watering.push(index);
      if (!def.givesNeighbours && !def.watersAllNeighbours) continue;
      for (const next of neighborTiles(map, tileHex(tile))) {
        const cell = tileIndex(map, next.col, next.row);
        if (def.watersAllNeighbours) (fields.freshWater ??= {})[cell] = true;
        if (def.givesNeighbours) {
          const gifts = fields.gifts ??= {};
          (gifts[cell] ??= []).push(tile.improvement);
        }
      }
    }
    return fields;
  });
}

export function tileHasFreshWater(state: GameState, tile: Tile): boolean {
  return tile.freshwater || improvementFields(state).freshWater?.[tileIndex(state.map, tile.col, tile.row)] === true;
}
