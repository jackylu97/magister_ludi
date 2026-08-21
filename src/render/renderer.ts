/**
 * Canvas renderer: three stacked layers (terrain / overlay / units).
 *
 * - terrain: the cached isometric map, blitted with the camera transform and
 *   repeated horizontally so the east–west wrap is seamless while panning.
 * - overlay: hex grid lines (toggleable), the movement range highlight, the
 *   hovered route and the hover highlight — all traced as *squashed* hexes.
 * - units: the pieces themselves, drawn every frame — they move.
 *
 * The renderer reads simulation state and never mutates it, and it never names
 * a colour, a glyph or a sprite — everything visual comes from the `TileArtist`,
 * and every tunable number from `data/view.json` by way of the artist's
 * `ArtStyle` and the cache's `Projection`.
 *
 * Wrapping
 * --------
 * The world repeats horizontally every `worldWidth` pixels, so anything anchored
 * to a tile has to be drawn once per visible repeat, not once. `forEachRepeat`
 * is the one place that loop lives; the terrain blit, the units and the
 * overlays all go through it, which is what keeps a unit visible on both sides
 * of the seam instead of vanishing at the edge.
 *
 * Elevation
 * ---------
 * Everything anchored to a tile is drawn at the tile's *face* — ground position
 * minus its elevation rise — so a unit on a hill stands on the hill rather than
 * inside it. Picking, by contrast, unprojects to the ground plane; see the
 * docblock in `projection.ts` for why that approximation is the right trade.
 */

import { SQRT3, pixelToHex } from '../sim/hex';
import { type GameMap, axialToOffset, getTileAt } from '../sim/map';
import type { GameState, Unit } from '../sim/state';
import type { HoverInfo, MapView } from '../ui/mapView';
import { type Cell, MoveAnimations } from './animation';
import {
  type Camera,
  type Viewport,
  createCamera,
  normalizeCamera,
  screenToWorld,
  visibleWorldRect,
  worldToScreen,
  zoomAt,
} from './camera';
import {
  hexWidth,
  isoToAxial,
  isoToPlane,
  planeToHexPixel,
  planeToIso,
  tileIsoCenter,
  tileRise,
} from './projection';
import { type TerrainCache, buildTerrainCache } from './terrainCache';
import type { TileArtist } from './tileVisuals';
import { VIEW } from './viewData';

/**
 * Re-exported for the modules that already import it from here. The type itself
 * now lives in `src/ui/mapView.ts`, with the interface both renderers implement:
 * the 2D and 3D views must describe a hovered tile in the same words, or
 * `controls.ts` cannot drive both.
 */
export type { HoverInfo };

export interface RendererLayers {
  terrain: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
  units: HTMLCanvasElement;
}

/** An offset cell the overlays are anchored to. */
export interface CellRef {
  col: number;
  row: number;
}

export class Renderer implements MapView {
  readonly camera: Camera;
  showGrid = true;

  private readonly layers: RendererLayers;
  private readonly artist: TileArtist;
  private readonly contexts: {
    terrain: CanvasRenderingContext2D;
    overlay: CanvasRenderingContext2D;
    units: CanvasRenderingContext2D;
  };

  private map: GameMap;
  private cache: TerrainCache;
  private viewport: Viewport = { width: 1, height: 1 };
  private dpr = 1;
  private hover: HoverInfo | null = null;
  private state: GameState | null = null;
  private selectedUnitId: number | null = null;
  private reachable: readonly CellRef[] = [];
  private pathPreview: readonly CellRef[] = [];
  private dirty = true;
  private frameHandle = 0;
  /** Set when a new map arrives, so the next resize frames it in the viewport. */
  private needsFit = true;
  private readonly animations = new MoveAnimations();

  constructor(layers: RendererLayers, artist: TileArtist, map: GameMap) {
    this.layers = layers;
    this.artist = artist;
    this.map = map;

    const terrain = layers.terrain.getContext('2d');
    const overlay = layers.overlay.getContext('2d');
    const units = layers.units.getContext('2d');
    if (!terrain || !overlay || !units) {
      throw new Error('Could not acquire 2D contexts for the renderer layers');
    }
    this.contexts = { terrain, overlay, units };

    this.cache = buildTerrainCache(map, artist);
    this.camera = createCamera(this.cache);
    this.resize();
  }

  /** Swaps in a new map and rebuilds the terrain cache. */
  setMap(map: GameMap): void {
    this.map = map;
    this.cache = buildTerrainCache(map, this.artist);
    this.hover = null;
    this.animations.clear();
    this.needsFit = true;
    this.fitToViewport();
  }

  /**
   * Points the renderer at a game state and, when the map changed, rebuilds the
   * terrain cache. The state is *read live* every frame rather than copied, so
   * `invalidate()` is all a mutation needs.
   */
  setGameState(state: GameState | null): void {
    this.state = state;
    if (state && state.map !== this.map) {
      this.setMap(state.map);
    }
    this.invalidate();
  }

  getGameState(): GameState | null {
    return this.state;
  }

  /** The unit drawn with a selection ring, or `null`. */
  setSelectedUnitId(id: number | null): void {
    if (this.selectedUnitId === id) return;
    this.selectedUnitId = id;
    this.invalidate();
  }

  /** Tiles tinted as "you can move here this turn". */
  setReachable(cells: readonly CellRef[]): void {
    this.reachable = cells;
    this.invalidate();
  }

  /** The route drawn under the cursor, start tile excluded. */
  setPathPreview(cells: readonly CellRef[]): void {
    if (this.pathPreview.length === 0 && cells.length === 0) return;
    this.pathPreview = cells;
    this.invalidate();
  }

  // --- movement animation --------------------------------------------------

  /**
   * Slides a piece along the tiles it just walked. Purely cosmetic: the unit is
   * already at `walked[walked.length - 1]` in the state. See `animation.ts`.
   */
  animateMove(unitId: number, from: Cell, walked: readonly Cell[]): void {
    this.animations.start(unitId, from, walked, performance.now());
    this.invalidate();
  }

  /** Snaps every in-flight piece to its real tile. Called before a new order. */
  skipAnimations(): void {
    this.animations.clear();
    this.invalidate();
  }

  /** Centres the map and picks the zoom that shows it top to bottom. */
  fitToViewport(): void {
    this.camera.x = this.cache.worldWidth / 2;
    this.camera.y = this.cache.worldHeight / 2;
    this.camera.zoom = this.viewport.height / this.cache.worldHeight;
    this.needsFit = false;
    normalizeCamera(this.camera, this.cache, this.viewport);
    this.invalidate();
  }

  getMap(): GameMap {
    return this.map;
  }

  /** Marks the next animation frame as needing a redraw. */
  invalidate(): void {
    this.dirty = true;
    if (this.frameHandle === 0) {
      this.frameHandle = requestAnimationFrame(() => {
        this.frameHandle = 0;
        if (this.dirty) this.draw();
      });
    }
  }

  /** Resizes all layers to the viewport, honouring devicePixelRatio. */
  resize(): void {
    const width = Math.max(1, this.layers.terrain.clientWidth);
    const height = Math.max(1, this.layers.terrain.clientHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewport = { width, height };

    for (const key of ['terrain', 'overlay', 'units'] as const) {
      const canvas = this.layers[key];
      canvas.width = Math.round(width * this.dpr);
      canvas.height = Math.round(height * this.dpr);
      this.contexts[key].setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    if (this.needsFit) {
      this.fitToViewport();
    } else {
      normalizeCamera(this.camera, this.cache, this.viewport);
    }
    this.invalidate();
  }

  // --- interaction ---------------------------------------------------------

  panByScreen(dx: number, dy: number): void {
    this.camera.x -= dx / this.camera.zoom;
    this.camera.y -= dy / this.camera.zoom;
    normalizeCamera(this.camera, this.cache, this.viewport);
    this.invalidate();
  }

  zoomBy(factor: number, screenX: number, screenY: number): void {
    zoomAt(this.camera, this.cache, this.viewport, factor, screenX, screenY);
    this.invalidate();
  }

  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.invalidate();
  }

  /**
   * Screen position -> hovered tile (wrap-aware). Returns null off the poles.
   * Unprojects to the ground plane, so a tall raised tile is picked slightly
   * low; see `projection.ts`.
   */
  pick(screenX: number, screenY: number): HoverInfo | null {
    const world = screenToWorld(this.camera, this.viewport, screenX, screenY);
    const axial = isoToAxial(world.x, world.y, this.cache.projection);
    const { col, row } = axialToOffset(axial);
    const tile = getTileAt(this.map, col, row);
    if (!tile) return null;
    return { tile, worldCol: col, row, axial };
  }

  setHover(hover: HoverInfo | null): void {
    const same =
      (hover === null && this.hover === null) ||
      (hover !== null &&
        this.hover !== null &&
        hover.tile === this.hover.tile &&
        hover.worldCol === this.hover.worldCol);
    if (same) return;
    this.hover = hover;
    this.invalidate();
  }

  getHover(): HoverInfo | null {
    return this.hover;
  }

  // --- drawing -------------------------------------------------------------

  private draw(): void {
    this.dirty = false;
    this.drawTerrainLayer();
    this.drawOverlayLayer();
    this.drawUnitsLayer();
  }

  /**
   * Calls `fn` once per horizontally visible copy of the world, with the world-x
   * offset of that copy. See the module docblock.
   */
  private forEachRepeat(fn: (offsetX: number) => void): void {
    const { worldWidth } = this.cache;
    const rect = visibleWorldRect(this.camera, this.viewport);
    const first = Math.floor(rect.left / worldWidth) - 1;
    const last = Math.floor(rect.right / worldWidth) + 1;
    for (let k = first; k <= last; k++) fn(k * worldWidth);
  }

  /** Elevation rise of the tile at an offset cell, in world units. */
  private riseAt(col: number, row: number): number {
    const tile = getTileAt(this.map, col, row);
    return tile ? tileRise(tile, this.cache.projection) : 0;
  }

  /**
   * Screen position of an offset cell's *face* within the world copy at
   * `offsetX` — ground position lifted by the tile's elevation, so overlays and
   * pieces sit on top of a hill rather than in it.
   */
  private cellScreen(col: number, row: number, offsetX: number): { x: number; y: number } {
    const iso = tileIsoCenter(col, row, this.cache.projection);
    return worldToScreen(
      this.camera,
      this.viewport,
      iso.x + offsetX,
      iso.y - this.riseAt(col, row),
    );
  }

  private drawTerrainLayer(): void {
    const ctx = this.contexts.terrain;
    const { width, height } = this.viewport;
    const { zoom } = this.camera;
    const { worldWidth, worldHeight, canvas } = this.cache;

    ctx.fillStyle = this.artist.theme.background;
    ctx.fillRect(0, 0, width, height);

    // Nearest-neighbour-ish crispness is not wanted; keep smoothing for zoom-out.
    ctx.imageSmoothingEnabled = true;

    const top = worldToScreen(this.camera, this.viewport, 0, 0).y;
    this.forEachRepeat((offsetX) => {
      const left = worldToScreen(this.camera, this.viewport, offsetX, 0).x;
      ctx.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        left,
        top,
        // One extra pixel of width: consecutive copies land on fractional
        // positions, and without the overlap the antialiased edges leave a
        // 1px background-coloured line at every wrap boundary. Copies are
        // drawn left to right, so the overlap is painted over by the next one.
        worldWidth * zoom + 1,
        worldHeight * zoom,
      );
    });
  }

  private drawOverlayLayer(): void {
    const ctx = this.contexts.overlay;
    const { width, height } = this.viewport;
    ctx.clearRect(0, 0, width, height);

    if (this.showGrid && this.camera.zoom >= VIEW.board.gridMinZoom) {
      this.drawGrid(ctx);
    }
    // Range first, then the route on top of it, then the cursor on top of both.
    this.drawCells(ctx, this.reachable, (c, x, y, size) =>
      this.artist.drawReachable(c, x, y, size),
    );
    this.drawCells(ctx, this.pathPreview, (c, x, y, size, index) =>
      this.artist.drawPathNode(c, x, y, size, index === this.pathPreview.length - 1),
    );
    if (this.hover) {
      this.drawHover(ctx, this.hover);
    }
  }

  /** Draws one artist call per cell, per visible copy of the world. */
  private drawCells(
    ctx: CanvasRenderingContext2D,
    cells: readonly CellRef[],
    paint: (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      index: number,
    ) => void,
  ): void {
    if (cells.length === 0) return;
    const screenSize = this.cache.baseSize * this.camera.zoom;
    ctx.save();
    this.forEachRepeat((offsetX) => {
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]!;
        const screen = this.cellScreen(cell.col, cell.row, offsetX);
        paint(ctx, screen.x, screen.y, screenSize, i);
      }
    });
    ctx.restore();
  }

  private drawUnitsLayer(): void {
    const ctx = this.contexts.units;
    const { width, height } = this.viewport;
    ctx.clearRect(0, 0, width, height);

    const state = this.state;
    if (!state) return;
    const screenSize = this.cache.baseSize * this.camera.zoom;
    if (screenSize < VIEW.units.minScreenSize) return; // Pieces would be mush.

    // Back to front, so a piece in front overlaps the one behind it. `col` and
    // then `id` break ties, and both come from the state, so overlapping units
    // always stack the same way.
    const ordered = [...state.units].sort(
      (a, b) => a.row - b.row || a.col - b.col || a.id - b.id,
    );

    const now = performance.now();
    ctx.save();
    this.forEachRepeat((offsetX) => {
      for (const unit of ordered) {
        this.drawUnit(ctx, unit, offsetX, screenSize, now);
      }
    });
    ctx.restore();

    // Animations are sampled, not stepped: as long as one is live, ask for
    // another frame. When they all finish the loop stops by itself.
    if (this.animations.isActive(now)) this.invalidate();
  }

  private drawUnit(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    offsetX: number,
    screenSize: number,
    now: number,
  ): void {
    const player = this.state?.players[unit.ownerId];
    if (!player) return;

    const { projection, baseSize, worldWidth } = this.cache;
    const sample = this.animations.sample(unit.id, now, baseSize, worldWidth);

    let screen: { x: number; y: number };
    if (sample) {
      const iso = planeToIso(sample.plane, projection);
      // The ground under a moving piece steps at hex boundaries, so read the
      // rise from whatever tile the piece is currently over.
      const local = planeToHexPixel(sample.plane.x, sample.plane.y, baseSize);
      const { col, row } = axialToOffset(pixelToHex(local.x, local.y, baseSize));
      const hop = sample.hop * hexWidth(baseSize) * VIEW.animation.hopHeight;
      screen = worldToScreen(
        this.camera,
        this.viewport,
        iso.x + offsetX,
        iso.y - this.riseAt(col, row) - hop,
      );
    } else {
      screen = this.cellScreen(unit.col, unit.row, offsetX);
    }

    // Cheap cull: everything off-screen by more than two hexes is skipped. Two,
    // not one, because a piece stands well above the tile it is anchored to.
    const margin = screenSize * 2;
    if (
      screen.x < -margin ||
      screen.x > this.viewport.width + margin ||
      screen.y < -margin ||
      screen.y > this.viewport.height + margin
    ) {
      return;
    }

    this.artist.drawUnit(
      ctx,
      screen.x,
      screen.y,
      screenSize,
      unit,
      { color: player.color, index: player.id },
      unit.id === this.selectedUnitId,
    );
  }

  /** Visible (un-wrapped) offset cell range for the current camera. */
  private visibleCellRange(): {
    colMin: number;
    colMax: number;
    rowMin: number;
    rowMax: number;
  } {
    const { projection, baseSize } = this.cache;
    const rect = visibleWorldRect(this.camera, this.viewport);
    const rowSpacing = 1.5 * baseSize;
    const colSpacing = SQRT3 * baseSize;

    // The visible band is a screen-space rectangle; rows live in plane space.
    const planeTop = isoToPlane(0, rect.top, projection).y;
    const planeBottom = isoToPlane(0, rect.bottom, projection).y;

    const rowMin = Math.max(0, Math.floor((planeTop - baseSize) / rowSpacing) - 1);
    const rowMax = Math.min(
      this.map.height - 1,
      Math.ceil((planeBottom - baseSize) / rowSpacing) + 1,
    );
    const colMin = Math.floor(rect.left / colSpacing) - 1;
    const colMax = Math.ceil(rect.right / colSpacing) + 1;
    return { colMin, colMax, rowMin, rowMax };
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const { colMin, colMax, rowMin, rowMax } = this.visibleCellRange();
    const screenSize = this.cache.baseSize * this.camera.zoom;

    ctx.save();
    ctx.strokeStyle = this.artist.theme.grid;
    ctx.lineWidth = Math.max(0.5, 0.06 * screenSize);
    ctx.beginPath();
    for (let row = rowMin; row <= rowMax; row++) {
      for (let col = colMin; col <= colMax; col++) {
        const screen = this.cellScreen(col, row, 0);
        this.artist.traceHex(ctx, screen.x, screen.y, screenSize);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawHover(ctx: CanvasRenderingContext2D, hover: HoverInfo): void {
    const screen = this.cellScreen(hover.worldCol, hover.row, 0);
    const screenSize = this.cache.baseSize * this.camera.zoom;

    ctx.save();
    // Dark under-stroke first so the highlight reads on light and dark terrain.
    ctx.lineWidth = Math.max(3, 0.16 * screenSize);
    ctx.strokeStyle = this.artist.theme.hoverShadow;
    ctx.beginPath();
    this.artist.traceHex(ctx, screen.x, screen.y, screenSize * 0.94);
    ctx.stroke();

    ctx.lineWidth = Math.max(1.5, 0.09 * screenSize);
    ctx.strokeStyle = this.artist.theme.hover;
    ctx.beginPath();
    this.artist.traceHex(ctx, screen.x, screen.y, screenSize * 0.94);
    ctx.stroke();
    ctx.restore();
  }
}
