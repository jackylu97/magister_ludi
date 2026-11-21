import { tileContextAt, tileOwnerCityId } from '../sim/cities';
import type { GameMap, Tile } from '../sim/map';
import { slateMemo, standingYieldRevision } from '../sim/slate';
import type { GameState } from '../sim/state';
import type { TileCondition } from '../sim/statecraftData';
import { isWaterTerrain } from '../sim/terrainData';
import { foldTile, type TileYieldContext } from '../sim/yields/hex';
import { YIELD_KEYS } from './badges3d';
import { type FogLevels, seesCell } from './fog3d';

/** The fresh reading uses each tile's owner. Unowned ground uses the viewer's technologies and Orders. */
export function seenTileYields(state: GameState, playerId: number, tiles: readonly Tile[]): ReturnType<typeof foldTile>[] {
  const contexts = new Map<number | 'wild', TileYieldContext | undefined>();
  return tiles.map((tile) => {
    const cityId = tileOwnerCityId(state, tile.col, tile.row) ?? 'wild';
    if (!contexts.has(cityId)) contexts.set(cityId, tileContextAt(state, playerId, tile));
    return foldTile(tile, contexts.get(cityId));
  });
}

type TileYields = ReturnType<typeof foldTile>;
export interface TileYieldSample {
  tiles: readonly Tile[];
  values: TileYields[];
}

/** The painted yield layers share this display filter. The glyph lens can also show water or a city centre. */
export function yieldLightTiles(state: GameState, levels: FogLevels, showcase?: ReadonlyMap<number, unknown> | null): Tile[] {
  const { map } = state;
  const cities = new Set(state.cities.map(city => city.row * map.width + city.col));
  return map.tiles.filter((tile, cell) => !isWaterTerrain(tile.terrain) && tile.terrain !== 'mountain' &&
    !cities.has(cell) && (showcase?.has(cell) || seesCell(levels, map, tile.col, tile.row)));
}

/** Membership and order matter for the instances. Equal yields keep their object across economy changes. */
export function sameTileYieldSamples(a: TileYieldSample, b: TileYieldSample): boolean {
  return a.tiles.length === b.tiles.length &&
    a.tiles.every((tile, i) => tile === b.tiles[i] && a.values[i] === b.values[i]);
}

// These selectors read the static ground or the explicit numbers in the context. A new selector gets a fresh fold.
const GROUND_SELECTORS = new Set([
  'hasResource', 'hills', 'feature', 'anyFeature', 'improved', 'unimproved', 'tended', 'surveyed', 'any',
  'water', 'river', 'wonderTown', 'townCentre', 'surfaced', 'improvement', 'anyImprovement', 'greatWork',
  'terrain', 'resourceKind', 'resource', 'freshwater', 'adjacentMountain', 'yields', 'road',
  'standingSince', 'beside', 'all', 'workLine',
]);

function groundSelector(on: TileCondition): boolean {
  if (on.test === 'all' || on.test === 'any') return on.of.every(groundSelector);
  if (on.test === 'beside') return groundSelector(on.of);
  return GROUND_SELECTORS.has(on.test);
}

/** Compare the resolved city or viewer context once per change. Ground callbacks use this token's board.
 * Fortified positions can change at a city gate. Irrigation and work substitutions can depend on current law.
 * A context that asks one of those questions, or introduces another callback, needs fresh tile folds. */
function comparableContext(ctx: TileYieldContext | undefined): string | undefined {
  if (!ctx) return '';
  const { neighbours, ground, ...inputs } = ctx;
  const { townCentre, wonderCentre, copiedHexes, workLine, fortified, ...facts } = ground ?? {};
  // Unrecognised functions, including watered and standsIn, cannot be compared by value.
  if (Object.values(inputs).some(value => typeof value === 'function') ||
      Object.values(facts).some(value => typeof value === 'function')) return undefined;
  for (const line of inputs.lines ?? []) {
    if (!groundSelector(line.on) || (line.perNeighbour && !groundSelector(line.perNeighbour)) ||
        Object.values(line).some(value => typeof value === 'function')) return undefined;
  }
  return JSON.stringify([inputs, facts, !!neighbours, !!townCentre, !!wonderCentre, !!copiedHexes, !!workLine, !!fortified]);
}

interface CityTileContext {
  revision: object;
  ground: object;
  key?: string;
  context: TileYieldContext | undefined;
  inputs: object;
}

interface ViewerTileYields {
  cities: Map<number | null, CityTileContext>;
  tiles: Map<Tile, { revision: object; inputs: object; value: TileYields }>;
}

/** A renderer owns this cache. It retains quoted cells across sight changes and shares the quote between layers. */
export class BoardTileYields {
  private state?: GameState;
  private map?: GameMap;
  private readonly viewers = new Map<number, ViewerTileYields>();

  constructor(private readonly price: typeof foldTile = foldTile) {}

  reset(): void {
    this.viewers.clear();
    this.state = undefined;
    this.map = undefined;
  }

  sample(state: GameState, seat: number, tiles: readonly Tile[]): TileYieldSample {
    if (this.state !== state || this.map !== state.map) {
      this.reset();
      this.state = state;
      this.map = state.map;
    }
    let cache = this.viewers.get(seat);
    if (!cache) {
      cache = { cities: new Map(), tiles: new Map() };
      this.viewers.set(seat, cache);
    }
    const revision = standingYieldRevision(state);
    const ground = slateMemo(state, 'ground', 'boardTileYieldGround', '', () => ({}));
    const values: TileYields[] = [];
    for (const tile of tiles) {
      const held = cache.tiles.get(tile);
      if (held?.revision === revision) {
        values.push(held.value);
        continue;
      }
      const city = tileOwnerCityId(state, tile.col, tile.row);
      let group = cache.cities.get(city);
      if (group?.revision !== revision) {
        const context = tileContextAt(state, seat, tile);
        const key = comparableContext(context);
        const inputs = group?.ground === ground && key !== undefined && group.key === key ? group.inputs : {};
        group = { revision, ground, key, context, inputs };
        cache.cities.set(city, group);
      }
      if (held?.inputs === group.inputs) {
        held.revision = revision;
        values.push(held.value);
      } else {
        const fresh = this.price(tile, group.context);
        const value = held && YIELD_KEYS.every(key => held.value[key] === fresh[key]) ? held.value : fresh;
        cache.tiles.set(tile, { revision, inputs: group.inputs, value });
        values.push(value);
      }
    }
    return { tiles, values };
  }
}
