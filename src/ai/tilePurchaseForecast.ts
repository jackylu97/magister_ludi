import type { ValueContext } from './value';
import { tileBuyingError, tilePurchasePrice, workRadiusTiles } from '../sim/cities';
import { type Tile, getTileAt, neighborTiles, tileHex, tileIndex } from '../sim/map';
import { citiesOf, tileOwnerField } from '../sim/state';

interface PricedTile {
  tile: Tile;
  price: number;
}

const FORECASTS = new WeakMap<ValueContext, { book: ValueContext['wants']; tiles: readonly PricedTile[] }>();

/**
 * Reuse the purchase list. If cash or poor yields leave it empty, sample the
 * current frontier. This keeps a future purchase reward priced at the actual
 * age, ring and discounts without building another spending plan.
 */
export function tilePurchaseForecast(ctx: ValueContext): readonly PricedTile[] {
  const cached = FORECASTS.get(ctx);
  if (cached !== undefined && cached.book === ctx.wants) return cached.tiles;
  const { state, playerId } = ctx;
  const result: PricedTile[] = [];
  for (const want of ctx.wants.gold) {
    if (want.ground === undefined) continue;
    const tile = getTileAt(state.map, want.ground.col, want.ground.row);
    if (tile !== undefined) result.push({ tile, price: want.price });
  }
  if (result.length === 0) {
    const owners = tileOwnerField(state);
    const seen = new Map<number, PricedTile>();
    for (const city of citiesOf(state, playerId)) {
      if (tileBuyingError(state, playerId, city.id) !== null) continue;
      for (const tile of workRadiusTiles(state, city)) {
        const index = tileIndex(state.map, tile.col, tile.row);
        if (state.tileOwner[index] !== null) continue;
        if (!neighborTiles(state.map, tileHex(tile)).some(
          (near) => owners.at(tileIndex(state.map, near.col, near.row)) === playerId,
        )) continue;
        const price = tilePurchasePrice(state, playerId, city.id, tile);
        const prior = seen.get(index);
        if (prior !== undefined) {
          // A shared frontier tile is bought through the cheaper city.
          prior.price = Math.min(prior.price, price);
        } else {
          const row = { tile, price };
          seen.set(index, row);
          result.push(row);
        }
      }
    }
  }
  FORECASTS.set(ctx, { book: ctx.wants, tiles: result });
  return result;
}
