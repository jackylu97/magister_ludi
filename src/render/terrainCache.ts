/**
 * Cached terrain layer, baked in isometric space.
 *
 * The whole map is drawn once into an offscreen canvas at a fixed base hex size;
 * each frame the visible slice is blitted with the camera transform. The cache
 * is rebuilt only when the map itself changes.
 *
 * The cache canvas is exactly `worldWidth = √3 · baseSize · width` pixels wide,
 * which is precisely the wrap period, so tiling it horizontally is seamless. The
 * squash is vertical only, so that is as true here as it was in the flat
 * renderer. Tiles whose sprites overhang an edge are also drawn on the opposite
 * side.
 *
 * Painter's order
 * ---------------
 * A diorama is a depth-sorted pile, and the two constraints are:
 *
 *   1. a tile's standing sprites must be drawn after its own ground face;
 *   2. they must also be drawn after the face of the row *in front* of it,
 *      because a raised face reaches up towards the tile behind it and would
 *      otherwise slice a tree off at the ankles.
 *
 * Both are satisfied by lagging the decoration pass one row behind the face
 * pass — `faces(0), faces(1), decor(0), faces(2), decor(1), …` — which is
 * exactly what the loop below does. Rows further away than one cannot interfere:
 * the vertical row pitch is `1.5 · size` while a hex is only `2 · size` tall, so
 * a face never reaches more than half a hex past its neighbour's centre.
 *
 * Within a row, decorations are sorted by their own depth (see
 * `decorationsFor`), so a nearer tree paints over a farther one.
 */

import { type GameMap } from '../sim/map';
import {
  type Projection,
  cacheIsoHeight,
  cacheIsoWidth,
  createProjection,
  hexWidth,
  tileIsoCenter,
  tileRise,
} from './projection';
import type { TileArtist } from './tileVisuals';

export interface TerrainCache {
  canvas: HTMLCanvasElement;
  /** How world (iso) space maps to the hex plane. The renderer's only copy. */
  projection: Projection;
  /** Hex circumradius used for the cached drawing (plane units). */
  baseSize: number;
  /** Horizontal wrap period in world units == canvas width. */
  worldWidth: number;
  /** Canvas height in world units. */
  worldHeight: number;
}

export interface TerrainCacheOptions {
  /** Preferred hex circumradius; reduced automatically for big maps. */
  desiredBaseSize?: number;
  /** Hard cap on either canvas dimension (browser canvas limits). */
  maxDimension?: number;
}

/**
 * The largest base size whose cache canvas still fits inside `maxDimension`.
 *
 * Both dimensions are solved in world units, which is where the squash pays for
 * itself: the vertical extent is `squash` times what the flat renderer needed,
 * so a tall map can afford a bigger hex than it used to. The elevation rises are
 * a constant offset rather than a multiple of the size, so they come off the
 * budget before the division.
 */
export function chooseBaseSize(
  map: GameMap,
  artist: TileArtist,
  desired: number,
  maxDimension: number,
): number {
  const { squash, overhang, mountainRise } = artist.style;
  const byWidth = maxDimension / (Math.sqrt(3) * map.width);
  const verticalBudget = Math.max(1, maxDimension - mountainRise);
  const perSize = Math.sqrt(3) * overhang + (1.5 * (map.height - 1) + 2) * squash;
  const byHeight = verticalBudget / perSize;
  return Math.max(4, Math.min(desired, byWidth, byHeight));
}

/** Renders the whole map to an offscreen canvas. */
export function buildTerrainCache(
  map: GameMap,
  artist: TileArtist,
  options: TerrainCacheOptions = {},
): TerrainCache {
  const maxDimension = options.maxDimension ?? 8192;
  const baseSize = chooseBaseSize(
    map,
    artist,
    options.desiredBaseSize ?? artist.style.desiredBaseSize,
    maxDimension,
  );

  const hexW = hexWidth(baseSize);
  const padTop = artist.style.overhang * hexW + artist.style.mountainRise;
  const projection = createProjection(
    baseSize,
    artist.style.squash,
    padTop,
    artist.style.hillRise,
    artist.style.mountainRise,
  );

  const worldWidth = cacheIsoWidth(map.width, baseSize);
  const worldHeight = cacheIsoHeight(map.height, projection);

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(worldWidth);
  canvas.height = Math.ceil(worldHeight);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire a 2D context for the terrain cache');

  ctx.fillStyle = artist.theme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;

  // Generous: a standing sprite can lean a good deal further out of its tile
  // than a hex corner does, and an extra off-canvas draw costs nothing.
  const wrapMargin = hexW;

  /** The x positions a tile must be drawn at, wrap copies included. */
  const xsFor = (x: number): number[] => {
    const xs = [x];
    if (x - wrapMargin < 0) xs.push(x + worldWidth);
    if (x + wrapMargin > worldWidth) xs.push(x - worldWidth);
    return xs;
  };

  const paintRow = (
    row: number,
    paint: (x: number, y: number, tile: (typeof map.tiles)[number], rise: number) => void,
  ): void => {
    for (let col = 0; col < map.width; col++) {
      const tile = map.tiles[row * map.width + col]!;
      const center = tileIsoCenter(col, row, projection);
      const rise = tileRise(tile, projection);
      for (const x of xsFor(center.x)) paint(x, center.y, tile, rise);
    }
  };

  const faces = (row: number): void =>
    paintRow(row, (x, y, tile, rise) =>
      artist.drawTerrainFace(ctx, x, y, baseSize, tile, rise),
    );
  const decor = (row: number): void =>
    paintRow(row, (x, y, tile, rise) =>
      artist.drawStandingDecor(ctx, x, y, baseSize, tile, rise),
    );

  for (let row = 0; row < map.height; row++) {
    faces(row);
    if (row >= 1) decor(row - 1);
  }
  if (map.height >= 1) decor(map.height - 1);

  return { canvas, projection, baseSize, worldWidth, worldHeight };
}
