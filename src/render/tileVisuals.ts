/**
 * The ONLY place that knows what a tile looks like.
 *
 * The rest of the renderer draws through the `TileArtist` interface and never
 * mentions a colour, a glyph or a sprite file. Two implementations exist:
 *
 *   - `SpriteTileArtist` (default) — the isometric diorama: Kenney hex faces
 *     squashed vertically into the ground plane, trees and rocks standing
 *     upright on top of it, units as board-game pieces.
 *   - `CanvasTileArtist` (`?art=flat`) — the original flat-colour top-down
 *     renderer, kept as a debug fallback. It is a handful of `fill()` calls
 *     behind the same interface, which is cheap enough to be worth having when
 *     something looks wrong and the question is "is it the sprites?".
 *
 * `ArtStyle` is what lets one interface serve both without the renderer
 * branching: the flat artist reports `squash: 1` and zero elevation, so all the
 * isometric machinery collapses back to the top-down view by arithmetic rather
 * than by an `if`.
 *
 * Screen space
 * ------------
 * Every method takes the tile's centre in *screen* pixels and `size`, the hex
 * circumradius already scaled by zoom. `rise` is the elevation offset, also in
 * screen pixels, and is the caller's job to compute — the artist just draws the
 * face that much higher and fills the cliff underneath.
 */

import { SQRT3, hexCorners } from '../sim/hex';
import type { Tile } from '../sim/map';
import type { Unit } from '../sim/state';
import {
  TERRAIN_DATA,
  featureDef,
  terrainDef,
  type UiTheme,
} from '../sim/terrainData';
import { unitDef } from '../sim/unitData';
import { frontChain, squashedHexCorners } from './projection';
import {
  TERRAIN_ART,
  decorOverhang,
  decorationsFor,
  hashUnit,
  pieceFile,
} from './spriteManifest';
import type { SpriteSet } from './sprites';
import { VIEW, pieceColorFor } from './viewData';

/**
 * The geometric contract between an artist and the rest of the renderer: how
 * squashed the world is, how high things stand, and how much room the artist
 * needs above a tile. Read by `terrainCache.ts` to build the projection.
 */
export interface ArtStyle {
  /** Vertical squash of the ground plane. 1 is flat top-down. */
  squash: number;
  /** Elevation rise for a hills tile, in world units at base scale. */
  hillRise: number;
  /** Elevation rise for mountain terrain, in world units at base scale. */
  mountainRise: number;
  /** Preferred hex circumradius for the terrain cache. */
  desiredBaseSize: number;
  /** Space needed above a tile centre for standing sprites, in hex widths. */
  overhang: number;
}

/** The drawing-relevant half of a `Player`. */
export interface UnitOwner {
  /** `Player.color`. */
  color: string;
  /** `Player.id`, used to pick a piece colour when `color` is not mapped. */
  index: number;
}

/**
 * Draws one tile's worth of pixels.
 */
export interface TileArtist {
  /** Colours the renderer itself needs (page background, grid, hover ring). */
  readonly theme: UiTheme;

  /** Geometry the renderer needs to lay the board out. See `ArtStyle`. */
  readonly style: ArtStyle;

  /**
   * The tile's ground face, lifted by `rise`, with the cliff strip that makes
   * the lift read as elevation rather than as a floating hex.
   */
  drawTerrainFace(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    tile: Tile,
    rise: number,
  ): void;

  /**
   * Trees, rocks and anything else that stands *up* out of the ground, drawn
   * unsquashed with its base on the (risen) face. Split from the face so the
   * terrain cache can interleave the two passes and let a tree overlap the tile
   * behind it.
   */
  drawStandingDecor(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    tile: Tile,
    rise: number,
  ): void;

  /**
   * Appends the (squashed) hex outline to the current path as a closed subpath.
   * The caller owns the path: call `beginPath()` first and `fill()`/`stroke()`
   * afterwards. Tracing many hexes between one `beginPath` and one `stroke`
   * is how the grid layer stays cheap.
   */
  traceHex(ctx: CanvasRenderingContext2D, px: number, py: number, size: number): void;

  /**
   * Draws a unit standing on the tile centred at `(px, py)`, base on the ground.
   *
   * `owner` carries `Player.color` — the artist chooses the piece colour from
   * it, but never invents an identity colour of its own.
   */
  drawUnit(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    unit: Unit,
    owner: UnitOwner,
    selected: boolean,
  ): void;

  /** Tints a tile the selected unit could move to this turn. */
  drawReachable(ctx: CanvasRenderingContext2D, px: number, py: number, size: number): void;

  /** One waypoint of the hovered route; the last one is drawn as the target. */
  drawPathNode(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    isDestination: boolean,
  ): void;

  /** Human-readable names for the info panel. */
  describe(tile: Tile): TileDescription;

  /** Human-readable summary of a unit for the info panel. */
  describeUnit(unit: Unit): UnitDescription;
}

export interface TileDescription {
  terrain: string;
  feature: string;
  hills: boolean;
}

export interface UnitDescription {
  name: string;
  category: string;
  hp: number;
  maxHp: number;
  movesLeft: number;
  movement: number;
  /** True when the unit is partway through a multi-turn move order. */
  marching: boolean;
}

// --- shared helpers ---------------------------------------------------------

/** Appends a closed polygon to the current path. */
function tracePolygon(ctx: CanvasRenderingContext2D, points: readonly { x: number; y: number }[]): void {
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
  ctx.closePath();
}

function describeTile(tile: Tile): TileDescription {
  return {
    terrain: terrainDef(tile.terrain).name,
    feature: featureDef(tile.feature).name,
    hills: tile.hills,
  };
}

function describeUnitCommon(unit: Unit): UnitDescription {
  const def = unitDef(unit.type);
  return {
    name: def.name,
    category: def.category,
    hp: unit.hp,
    maxHp: def.maxHp,
    movesLeft: unit.movesLeft,
    movement: def.movement,
    marching: unit.path !== undefined && unit.path.length > 0,
  };
}

// --- sprite artist ----------------------------------------------------------

/**
 * The isometric sprite implementation.
 *
 * Holds the loaded `SpriteSet` and nothing else that is mutable: every drawing
 * decision is a lookup into the manifest or `data/view.json`.
 */
export class SpriteTileArtist implements TileArtist {
  readonly theme: UiTheme = TERRAIN_DATA.ui;
  readonly style: ArtStyle;

  private readonly sprites: SpriteSet;

  constructor(sprites: SpriteSet) {
    this.sprites = sprites;
    this.style = {
      squash: VIEW.iso.squash,
      hillRise: VIEW.iso.hillRise,
      mountainRise: VIEW.iso.mountainRise,
      desiredBaseSize: VIEW.board.desiredBaseSize,
      overhang: decorOverhang(),
    };
  }

  traceHex(ctx: CanvasRenderingContext2D, px: number, py: number, size: number): void {
    tracePolygon(ctx, squashedHexCorners(px, py, size, this.style.squash));
  }

  drawTerrainFace(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    tile: Tile,
    rise: number,
  ): void {
    const art = TERRAIN_ART[tile.terrain];
    const top = py - rise;
    // The overdraw is what keeps neighbouring faces from leaving a hairline of
    // background between them once the world lands on fractional pixels.
    const drawSize = size * VIEW.board.faceOverdraw;

    if (rise > 0.5) this.drawCliff(ctx, px, top, drawSize, rise, art.faceColor);

    if (art.file === null) {
      this.drawWaterFace(ctx, px, top, drawSize, tile, art.faceColor);
      return;
    }

    const image = this.sprites.get(art.file);
    const width = SQRT3 * drawSize;
    const height = width * (image.naturalHeight / image.naturalWidth) * this.style.squash;
    ctx.drawImage(image, px - width / 2, top - height / 2, width, height);
  }

  /**
   * The dark strip between a raised face and the ground it was raised from.
   *
   * It is the face's front silhouette (corners 0..4) extruded straight down by
   * `rise`, filled with the terrain's own colour and then washed with black, so
   * a grass plateau gets a green-brown cliff and a snow one a grey-blue cliff
   * without a second palette to maintain.
   */
  private drawCliff(
    ctx: CanvasRenderingContext2D,
    px: number,
    faceY: number,
    size: number,
    rise: number,
    faceColor: string,
  ): void {
    const corners = squashedHexCorners(px, faceY, size, this.style.squash);
    const front = frontChain(corners);
    const skirt = front.map((p) => ({ x: p.x, y: p.y + rise }));
    skirt.reverse();

    ctx.beginPath();
    tracePolygon(ctx, [...front, ...skirt]);
    ctx.fillStyle = faceColor;
    ctx.fill();
    ctx.fillStyle = `rgba(0, 0, 0, ${VIEW.iso.cliffDarken})`;
    ctx.fill();

    // A second, darker wash on the bottom third grounds the cliff in the tile
    // below instead of letting it end on a hard line.
    const gradient = ctx.createLinearGradient(0, faceY, 0, faceY + rise);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${VIEW.iso.cliffRimDarken})`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  /**
   * Water has no sprite in the pack, so it is a flat squashed hex plus a
   * top-to-bottom darkening and a couple of wave ticks. Flat water under sprite
   * land is the art direction, not a shortcut: a textured sea would be the only
   * thing on the board pretending to have detail.
   */
  private drawWaterFace(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    tile: Tile,
    faceColor: string,
  ): void {
    const water = VIEW.water;
    const squash = this.style.squash;

    ctx.beginPath();
    this.traceHex(ctx, px, py, size);
    ctx.fillStyle = faceColor;
    ctx.fill();

    if (water.shoreDarken > 0) {
      const gradient = ctx.createLinearGradient(0, py - size * squash, 0, py + size * squash);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(0, 0, 0, ${water.shoreDarken})`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    const hexW = SQRT3 * size;
    const lineWidth = hexW * water.waveWidth;
    if (water.waveCount <= 0 || lineWidth < 0.6) return;

    ctx.save();
    ctx.globalAlpha = water.waveAlpha;
    ctx.strokeStyle = water.waveColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < water.waveCount; i++) {
      // Hashed from the tile, so the sea does not shimmer when the cache is
      // rebuilt — and so it never reaches for `state.rng`.
      const u = hashUnit(tile.col, tile.row, i * 2 + 11) - 0.5;
      const v = hashUnit(tile.col, tile.row, i * 2 + 12) - 0.5;
      const half = (hexW * water.waveLength) / 2;
      const x = px + u * hexW * 0.4;
      const y = py + v * size * squash * 1.1;
      ctx.moveTo(x - half, y);
      ctx.quadraticCurveTo(x, y - half * squash * 0.9, x + half, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawStandingDecor(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    tile: Tile,
    rise: number,
  ): void {
    const placements = decorationsFor(tile);
    if (placements.length === 0) return;

    const hexW = SQRT3 * size;
    const squash = this.style.squash;
    const top = py - rise;
    const shadowAlpha = VIEW.decor.shadowAlpha;

    for (const placement of placements) {
      const height = placement.height * hexW;
      if (height < 2) continue; // Sub-pixel sprites are mush; skip the work.
      const image = this.sprites.get(placement.file);
      const width = height * (image.naturalWidth / image.naturalHeight);
      const baseX = px + placement.dx * hexW;
      // The offset is a position on the ground, so it squashes; the sprite
      // drawn from it does not. That contrast is the whole isometric effect.
      const baseY = top + placement.dy * hexW * squash;

      if (shadowAlpha > 0 && width > 3) {
        ctx.beginPath();
        ctx.ellipse(baseX, baseY, width * 0.42, width * 0.42 * squash, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.fill();
      }
      ctx.drawImage(image, baseX - width / 2, baseY - height, width, height);
    }
  }

  drawUnit(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    unit: Unit,
    owner: UnitOwner,
    selected: boolean,
  ): void {
    const theme = TERRAIN_DATA.units;
    const cfg = VIEW.units;
    const squash = this.style.squash;
    const hexW = SQRT3 * size;

    // Drop shadow first: it belongs to the ground, everything else stands on it.
    if (cfg.shadowAlpha > 0) {
      ctx.beginPath();
      ctx.ellipse(
        px,
        py,
        (hexW * cfg.shadowWidth) / 2,
        (hexW * cfg.shadowHeight) / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(0, 0, 0, ${cfg.shadowAlpha})`;
      ctx.fill();
    }

    if (selected) {
      const rx = hexW * cfg.selectionScale;
      const ry = rx * squash;
      // Two rings: a dark one underneath so the bright one reads on any terrain.
      ctx.lineWidth = Math.max(3, size * 0.16);
      ctx.strokeStyle = theme.selectionShadow;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, size * 0.09);
      ctx.strokeStyle = theme.selection;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const silhouette = VIEW.pieces.byUnitType[unit.type] ?? VIEW.pieces.byUnitType.warrior!;
    const image = this.sprites.get(pieceFile(pieceColorFor(owner.color, owner.index), silhouette));
    const height = hexW * cfg.pieceScale;
    const width = height * (image.naturalWidth / image.naturalHeight);
    ctx.drawImage(image, px - width / 2, py - height, width, height);

    // A health bar only when there is damage to report; a board full of full
    // bars is noise.
    const def = unitDef(unit.type);
    if (unit.hp < def.maxHp && size >= 6) {
      const fraction = Math.max(0, Math.min(1, unit.hp / def.maxHp));
      const barWidth = hexW * cfg.hpBarWidth;
      const barHeight = Math.max(2, size * 0.12);
      const left = px - barWidth / 2;
      const top = py - height - barHeight * 1.6;
      ctx.fillStyle = theme.hpBack;
      ctx.fillRect(left, top, barWidth, barHeight);
      ctx.fillStyle = fraction > 0.5 ? theme.hpFull : theme.hpLow;
      ctx.fillRect(left, top, barWidth * fraction, barHeight);
    }
  }

  drawReachable(ctx: CanvasRenderingContext2D, px: number, py: number, size: number): void {
    const theme = TERRAIN_DATA.units;
    ctx.beginPath();
    this.traceHex(ctx, px, py, size * 0.92);
    ctx.fillStyle = theme.reachable;
    ctx.fill();
    ctx.lineWidth = Math.max(0.5, size * 0.04);
    ctx.strokeStyle = theme.reachableEdge;
    ctx.stroke();
  }

  drawPathNode(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    isDestination: boolean,
  ): void {
    const theme = TERRAIN_DATA.units;
    if (isDestination) {
      ctx.lineWidth = Math.max(2, size * 0.12);
      ctx.strokeStyle = theme.pathShadow;
      ctx.beginPath();
      this.traceHex(ctx, px, py, size * 0.78);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, size * 0.07);
      ctx.strokeStyle = theme.path;
      ctx.beginPath();
      this.traceHex(ctx, px, py, size * 0.78);
      ctx.stroke();
      return;
    }
    const radius = Math.max(1.5, size * 0.16);
    const squash = this.style.squash;
    ctx.beginPath();
    ctx.ellipse(px, py, radius, radius * squash, 0, 0, Math.PI * 2);
    ctx.fillStyle = theme.pathShadow;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px, py, radius * 0.68, radius * 0.68 * squash, 0, 0, Math.PI * 2);
    ctx.fillStyle = theme.path;
    ctx.fill();
  }

  describe(tile: Tile): TileDescription {
    return describeTile(tile);
  }

  describeUnit(unit: Unit): UnitDescription {
    return describeUnitCommon(unit);
  }
}

// --- flat debug artist ------------------------------------------------------

/**
 * The original flat-colour top-down renderer, behind the same interface.
 *
 * Reports `squash: 1` and no elevation, which turns every projection formula in
 * the renderer into the identity it used to be. Reachable for debugging via
 * `?art=flat`.
 */
export class CanvasTileArtist implements TileArtist {
  readonly theme: UiTheme = TERRAIN_DATA.ui;
  readonly style: ArtStyle = {
    squash: 1,
    hillRise: 0,
    mountainRise: 0,
    desiredBaseSize: 22,
    overhang: 0,
  };

  traceHex(ctx: CanvasRenderingContext2D, px: number, py: number, size: number): void {
    tracePolygon(ctx, hexCorners(px, py, size));
  }

  drawTerrainFace(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    tile: Tile,
  ): void {
    const def = terrainDef(tile.terrain);
    ctx.beginPath();
    // Slightly overdraw so neighbouring fills never leave a hairline gap.
    this.traceHex(ctx, px, py, size + 0.5);
    ctx.fillStyle = def.fillColor;
    ctx.fill();
  }

  drawStandingDecor(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    tile: Tile,
  ): void {
    if (size < 6) return; // Glyphs are illegible below this; skip the work.

    const terrain = terrainDef(tile.terrain);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (terrain.glyph) {
      // Mountains (and any future terrain with its own glyph).
      ctx.fillStyle = terrain.glyphColor;
      ctx.font = `${(size * 1.1).toFixed(1)}px system-ui, sans-serif`;
      ctx.fillText(terrain.glyph, px, py + size * 0.05);
      return;
    }

    if (tile.hills) {
      const hills = TERRAIN_DATA.hills;
      ctx.fillStyle = hills.glyphColor;
      ctx.font = `${(size * 0.72).toFixed(1)}px system-ui, sans-serif`;
      ctx.fillText(hills.glyph, px, py - size * 0.28);
    }

    const feature = featureDef(tile.feature);
    if (feature.glyph) {
      ctx.fillStyle = feature.glyphColor;
      ctx.font = `${(size * 0.62).toFixed(1)}px system-ui, sans-serif`;
      ctx.fillText(feature.glyph, px, py + (tile.hills ? size * 0.3 : size * 0.05));
    }
  }

  drawUnit(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    unit: Unit,
    owner: UnitOwner,
    selected: boolean,
  ): void {
    const theme = TERRAIN_DATA.units;
    const def = unitDef(unit.type);
    const radius = size * 0.52;

    if (selected) {
      // Two rings: a dark one underneath so the bright one reads on any terrain.
      ctx.lineWidth = Math.max(3, radius * 0.34);
      ctx.strokeStyle = theme.selectionShadow;
      ctx.beginPath();
      ctx.arc(px, py, radius * 1.28, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = Math.max(1.5, radius * 0.2);
      ctx.strokeStyle = theme.selection;
      ctx.beginPath();
      ctx.arc(px, py, radius * 1.28, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = owner.color;
    ctx.fill();
    ctx.lineWidth = Math.max(1, radius * 0.16);
    ctx.strokeStyle = theme.rim;
    ctx.stroke();

    if (radius >= 6) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${(radius * 1.15).toFixed(1)}px system-ui, sans-serif`;
      ctx.fillStyle = theme.glyphShadow;
      ctx.fillText(def.glyph, px, py + radius * 0.12);
      ctx.fillStyle = theme.glyph;
      ctx.fillText(def.glyph, px, py + radius * 0.06);
    }

    if (unit.hp < def.maxHp && radius >= 5) {
      const fraction = Math.max(0, Math.min(1, unit.hp / def.maxHp));
      const barWidth = radius * 1.8;
      const barHeight = Math.max(2, radius * 0.24);
      const left = px - barWidth / 2;
      const top = py + radius * 1.05;
      ctx.fillStyle = theme.hpBack;
      ctx.fillRect(left, top, barWidth, barHeight);
      ctx.fillStyle = fraction > 0.5 ? theme.hpFull : theme.hpLow;
      ctx.fillRect(left, top, barWidth * fraction, barHeight);
    }
  }

  drawReachable(ctx: CanvasRenderingContext2D, px: number, py: number, size: number): void {
    const theme = TERRAIN_DATA.units;
    ctx.beginPath();
    this.traceHex(ctx, px, py, size * 0.92);
    ctx.fillStyle = theme.reachable;
    ctx.fill();
    ctx.lineWidth = Math.max(0.5, size * 0.04);
    ctx.strokeStyle = theme.reachableEdge;
    ctx.stroke();
  }

  drawPathNode(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    isDestination: boolean,
  ): void {
    const theme = TERRAIN_DATA.units;
    if (isDestination) {
      ctx.lineWidth = Math.max(2, size * 0.12);
      ctx.strokeStyle = theme.pathShadow;
      ctx.beginPath();
      this.traceHex(ctx, px, py, size * 0.78);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, size * 0.07);
      ctx.strokeStyle = theme.path;
      ctx.beginPath();
      this.traceHex(ctx, px, py, size * 0.78);
      ctx.stroke();
      return;
    }
    const radius = Math.max(1.5, size * 0.16);
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = theme.pathShadow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.68, 0, Math.PI * 2);
    ctx.fillStyle = theme.path;
    ctx.fill();
  }

  describe(tile: Tile): TileDescription {
    return describeTile(tile);
  }

  describeUnit(unit: Unit): UnitDescription {
    return describeUnitCommon(unit);
  }
}

/** Factory — the single place to swap the art implementation. */
export function createTileArtist(sprites: SpriteSet): TileArtist {
  return new SpriteTileArtist(sprites);
}

/** The `?art=flat` fallback. Needs no assets, so it needs no loading step. */
export function createFlatTileArtist(): TileArtist {
  return new CanvasTileArtist();
}
