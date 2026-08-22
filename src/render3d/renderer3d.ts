/**
 * The playable 3D renderer: scene, lights, board, pieces, overlays, input glue.
 *
 * This is the prototype in `src/proto3d/` grown up. The look is unchanged and
 * deliberately so — same palette, same three-band toon ramp, same inverted-hull
 * outlines, same warm-key/cool-fill rig, same 57° orthographic angle, same
 * grout-line substrate. What was added is everything a look test did not need:
 * picking, the east–west wrap, overlays, unit animation, and a board that can be
 * rebuilt while the game runs.
 *
 * Lighting recipe
 * ---------------
 * One warm directional key (the sun), one cool hemisphere fill (sky above, warm
 * bounce off the ground below), and a small flat ambient so nothing ever goes
 * fully unlit. The key is warm and the fill is cool because that temperature
 * split is what makes a flat-shaded facet read as *lit* rather than merely
 * coloured — the shadowed band is not just darker, it is a different colour, and
 * the toon ramp's hard edge between them is where the illustration quality comes
 * from.
 *
 * Shadows do a disproportionate amount of the work: the contact shadow under a
 * tree or a game piece is what glues it to the tile. The shadow camera is
 * therefore kept *tight* — it tracks the pan target and scales with the zoom, so
 * a 2048² map covers only the visible region and stays sharp instead of being
 * stretched over an 80×52 board. Because the pan target wraps with the camera,
 * the shadow rig wraps with it too and the seam needs no special case.
 *
 * Render on demand
 * ----------------
 * A frame is drawn only when something changed: the camera moved, the selection
 * changed, the board was rebuilt, a piece is mid-walk, or the camera is mid-pan
 * to a player's units. Idle cost is one `requestAnimationFrame` that returns
 * immediately. A 4X spends most of its time with a still board and a thinking
 * player, and burning a GPU to redraw an unchanged diorama sixty times a second
 * is exactly the kind of thing that makes a browser game hot to the touch.
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PCFSoftShadowMap,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

import { type GameMap, getTileAt, offsetToAxial, tileIndex } from '../sim/map';
import type { GameState } from '../sim/state';
import { UNIT_TYPE_IDS, type UnitTypeId } from '../sim/unitData';
import type {
  CellRef,
  FallenUnit,
  HoverInfo,
  LensView,
  MapView,
  ScreenPoint,
} from '../ui/mapView';

import { DeathAnimations3D, MoveAnimations3D } from './animation3d';
import { UnitBadges } from './badges3d';
import { type BuiltBoard, BoardGeometry, buildBoard, modelClassFor } from './board3d';
import { DioramaCamera } from './camera3d';
import {
  CityLayer,
  TerritoryLayer,
  signCities,
  signCityCells,
  signTerritory,
} from './cities3d';
import { LensLayer, NO_LENS, sameLens } from './lens3d';
import { VIEW3D, playerPieceColor } from './lookData';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { OverlayLayer } from './overlays';
import {
  UnitLayer,
  buildBadge,
  buildSpriteUnit,
  unitVisualHeight,
  pieceMaterials,
  placePiece,
  unitColor,
} from './pieces';
import { pickTile } from './picking';
import { UnitSprites } from './sprites3d';
import { MaterialLibrary, computeHullNormals } from './toon';

const DEG = Math.PI / 180;
const LOOK = VIEW3D.look;
const LIGHTS = VIEW3D.lights;

export interface BoardStats {
  tiles: number;
  /** Instances uploaded, wrap copies included. */
  instances: number;
  /** Draw calls the last frame actually issued, straight from three. */
  drawCalls: number;
  /** Milliseconds spent building the board's instance buffers. */
  buildMs: number;
}

export class Renderer3D implements MapView {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly view = new DioramaCamera();

  private readonly materials: MaterialLibrary;
  private readonly geometry = new BoardGeometry();
  private readonly key: DirectionalLight;
  private readonly units = new UnitLayer();
  private readonly cities = new CityLayer();
  private readonly territory = new TerritoryLayer();
  private readonly overlays = new OverlayLayer();
  private readonly lens = new LensLayer();
  private readonly animations = new MoveAnimations3D();
  /**
   * Pieces currently falling over. Separate from `animations` because a walker
   * belongs to a unit that still exists and a faller does not — nothing about
   * a corpse can be looked up in the state, so its visual is all there is.
   */
  private readonly deaths = new DeathAnimations3D();
  /** Temporary meshes for pieces mid-walk, one group of wrap copies per unit. */
  private readonly walkers = new Map<number, Group>();
  /** The same, for pieces mid-topple. See `animateDeath`. */
  private readonly fallers = new Map<number, Group>();

  private board: BuiltBoard | null = null;
  private state: GameState | null = null;
  private map: GameMap | null = null;
  private hover: HoverInfo | null = null;
  private selectedUnitId: number | null = null;
  private reachable: readonly CellRef[] = [];
  /** Tiles the selected unit could attack. See `setAttackable`. */
  private attackable: readonly CellRef[] = [];
  private pathPreview: readonly CellRef[] = [];
  /** The selected unit's stored order. See `MapView.setCommittedPath`. */
  private committedPath: readonly CellRef[] = [];
  private workedTiles: readonly CellRef[] = [];
  private lockedTiles: readonly CellRef[] = [];
  /** Which lens the UI has up. See `setLens` and `lens3d.ts`. */
  private lensView: LensView = NO_LENS;
  /** Move mode armed in the UI: draw the selection ring live. See the setter. */
  private moveMode = false;

  private shadows = LOOK.shadows;
  /**
   * The painted unit billboards, once they have loaded — null in `pieces` style
   * and for the moments before the images arrive in `sprites` style. See
   * `loadSprites` and `sprites3d.ts`.
   */
  private sprites: UnitSprites | null = null;
  /**
   * The floating unit badges, once the icon atlas has rasterised. Null for the
   * moments before it does, and if it could not be built at all — in which case
   * the units simply stand untagged rather than the board failing to draw. See
   * `loadBadges` and `badges3d.ts`.
   */
  private badges: UnitBadges | null = null;
  /** Fingerprint of the units the layer was last built from. See `loop`. */
  private unitsSignature = 0;
  /** The same for the towns and for the borders. See `loop`. */
  private citiesSignature = 0;
  private territorySignature = 0;
  /** Which tiles held a city when the *board* was last baked. See `cityCells`. */
  private boardCitiesSignature = 0;
  /** Called after every frame that was actually drawn. See `setFrameListener`. */
  private frameListener: (() => void) | null = null;
  /** Set when a board is framed against a viewport that was not laid out yet. */
  private needsFit = false;
  private dirty = true;
  private running = true;
  private buildMs = 0;
  private lastDrawCalls = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // No tone mapping: the palette is already muted, and a filmic curve would
    // pull the highlights grey and undo the work.
    this.renderer.shadowMap.enabled = this.shadows;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    // The table's own lit tone, so anything beyond the surface itself — the far
    // corners at full zoom-out — is the same material rather than a sky the
    // board is floating in. See `TableSpec` and `buildTable`.
    this.scene.background = new Color(VIEW3D.table.color);
    // No fog. `Fog` measures distance from the camera, and an orthographic eye
    // sits an arbitrary 240 units back from the board, so any range tuned to
    // look right on the board also washed the whole scene out to the background
    // colour. This board is far too shallow to need aerial perspective anyway.

    this.materials = new MaterialLibrary(LOOK.rampSteps, VIEW3D.palette.ink!);
    this.materials.outlineWidth.value = LOOK.outline;

    this.key = new DirectionalLight(LIGHTS.keyColor, LIGHTS.keyIntensity);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(LOOK.shadowMapSize, LOOK.shadowMapSize);
    // Small negative bias plus a normal bias: the flat hex tops are large
    // coplanar surfaces and are exactly where shadow acne shows first.
    this.key.shadow.bias = LOOK.shadowBias;
    this.key.shadow.normalBias = LOOK.shadowNormalBias;
    this.scene.add(this.key);
    this.scene.add(this.key.target);

    this.scene.add(
      new HemisphereLight(LIGHTS.skyColor, LIGHTS.groundColor, LIGHTS.hemiIntensity),
    );
    this.scene.add(new AmbientLight(LIGHTS.ambientColor, LIGHTS.ambientIntensity));

    this.scene.add(this.units.group);
    this.scene.add(this.cities.group);
    this.scene.add(this.territory.group);
    // Under the overlays: a lens is information about the ground, and the
    // selection ring and route have to stay readable on top of it.
    this.scene.add(this.lens.group);
    this.scene.add(this.overlays.group);

    this.resize();
    this.applyLight();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.loadSprites();
    this.loadBadges();
  }

  /**
   * Rasterises the badge icons into their atlas, in the background.
   *
   * Not awaited, for the same reason `loadSprites` is not: the board is playable
   * the moment it is built, and eight small SVGs arriving a frame later add the
   * tags to units that were already standing there. A failure is silent — see
   * `UnitBadges.load` — and leaves a board of untagged pieces, which is exactly
   * what the board was before badges existed.
   */
  private loadBadges(): void {
    void UnitBadges.load().then((badges) => {
      if (!badges) return;
      if (!this.running) {
        badges.dispose();
        return;
      }
      this.badges = badges;
      this.rebuildUnits();
      this.invalidate();
    });
  }

  /**
   * Fetches the painted unit art, in `sprites` style only.
   *
   * Deliberately *not* awaited by anything. The board is playable the instant it
   * is built and the units are already on it as procedural pieces; when the
   * images arrive the layer is rebuilt and they become billboards. A renderer
   * that could not start until two megabytes of illustration had decoded would
   * be a worse renderer for an experiment that might be reverted.
   */
  private loadSprites(): void {
    if (VIEW3D.units.style !== 'sprites') return;
    void UnitSprites.load().then((sprites) => {
      // The renderer may have been disposed while the images were decoding.
      if (!this.running) {
        sprites.dispose();
        return;
      }
      if (!sprites.any) return;
      this.sprites = sprites;
      // Anything mid-walk is holding a piece-shaped walker; the simplest honest
      // thing is to end the walks and redraw everyone in the new style.
      this.skipAnimations();
      this.rebuildUnits();
      this.invalidate();
    });
  }

  // --- state ---------------------------------------------------------------

  /**
   * Points the renderer at a game state. A new map means a new board — the
   * expensive rebuild, and the only one that reframes the camera. Everything
   * else is a units-and-overlays refresh, which is what happens after every
   * ordinary command.
   */
  setGameState(state: GameState | null): void {
    this.state = state;
    if (!state) {
      this.invalidate();
      return;
    }
    if (state.map !== this.map) {
      this.setMap(state.map);
    } else if (signCityCells(state) !== this.boardCitiesSignature) {
      this.rebuildBoard(state.map);
    }
    this.rebuildUnits();
    this.rebuildCities();
    this.rebuildTerritory();
    this.rebuildOverlays();
    this.rebuildLens();
    this.invalidate();
  }

  getGameState(): GameState | null {
    return this.state;
  }

  private setMap(map: GameMap): void {
    this.hover = null;
    this.reachable = [];
    this.attackable = [];
    this.pathPreview = [];
    this.committedPath = [];
    this.workedTiles = [];
    this.lockedTiles = [];
    this.selectedUnitId = null;
    this.moveMode = false;
    this.animations.clear();
    this.deaths.clear();
    this.clearWalkers();
    this.clearFallers();

    this.rebuildBoard(map);
    // Open on the whole map, exactly as the 2D game does. It is the only view
    // that answers "what did I just generate?". If the canvas has not been laid
    // out yet the framing is a guess, so it is redone on the first real resize.
    this.view.frameBoard(this.board!.bounds);
    this.needsFit = this.canvas.clientWidth <= 1;
    this.invalidate();
  }

  /**
   * Rebuilds the terrain instance buffers for a map, leaving the camera and
   * every scrap of interaction state alone. Called for a new map, and again
   * whenever shadows are toggled — `castShadow` is baked into an
   * `InstancedMesh` when it is built, so that flag is a rebuild.
   */
  /**
   * The tiles that hold a city. The board suppresses their decorations, so a
   * town is never hidden inside the forest it was founded in.
   */
  private cityCells(map: GameMap): Set<number> {
    const cells = new Set<number>();
    for (const city of this.state?.cities ?? []) {
      cells.add(tileIndex(map, city.col, city.row));
    }
    return cells;
  }

  private rebuildBoard(map: GameMap): void {
    if (this.board) {
      this.scene.remove(this.board.group);
      this.board.dispose();
    }
    const started = performance.now();
    this.board = buildBoard(map, this.geometry, this.materials, this.shadows, this.cityCells(map));
    this.boardCitiesSignature = this.state ? signCityCells(this.state) : 0;
    this.buildMs = performance.now() - started;
    this.map = map;
    this.scene.add(this.board.group);
    this.view.setBoard(this.board.bounds, this.board.wrapWidth);
    this.invalidate();
  }

  /** Board build cost and size, for the on-page stats line. */
  get stats(): BoardStats {
    return {
      tiles: this.board?.tileCount ?? 0,
      instances: this.board?.instanceCount ?? 0,
      drawCalls: this.lastDrawCalls,
      buildMs: this.buildMs,
    };
  }

  private rebuildUnits(): void {
    if (!this.state) return;
    this.units.build(
      this.state,
      this.geometry,
      this.materials,
      // The camera angle never changes, so "face the camera" is one constant
      // rotation, resolved here and baked into the HP bar instance matrices.
      this.view.camera.quaternion.clone(),
      this.shadows,
      this.sprites,
      this.badges,
      this.selectedUnitId,
    );
    // A walk in flight keeps its piece hidden across the rebuild; the sample
    // loop restores it when the animation ends.
    for (const unitId of this.animations.activeUnits()) this.units.hide(unitId);
    this.unitsSignature = signUnits(this.state);
  }

  private rebuildCities(): void {
    if (!this.state) return;
    this.cities.build(
      this.state,
      this.geometry,
      this.materials,
      this.view.camera.quaternion.clone(),
      this.shadows,
    );
    this.citiesSignature = signCities(this.state);
  }

  private rebuildTerritory(): void {
    if (!this.state) return;
    this.territory.build(this.state, this.geometry, this.materials);
    this.territorySignature = signTerritory(this.state);
  }

  private rebuildOverlays(): void {
    if (!this.map) return;
    const selected =
      this.selectedUnitId === null
        ? null
        : (this.state?.units.find((unit) => unit.id === this.selectedUnitId) ?? null);
    this.overlays.build(
      this.map,
      {
        reachable: this.reachable,
        attackable: this.attackable,
        path: this.pathPreview,
        committed: this.committedPath,
        hover: this.hover ? { col: this.hover.tile.col, row: this.hover.tile.row } : null,
        selection: selected ? { col: selected.col, row: selected.row } : null,
        worked: this.workedTiles,
        locked: this.lockedTiles,
        moveMode: this.moveMode,
      },
      this.geometry,
      this.materials,
    );
    this.invalidate();
  }

  /**
   * Rebuilds the lens layer. Called when the lens changes, when the state is
   * replaced, and — through the signatures in `loop` — when a border moves or a
   * city appears under a lens that is showing one of those things. Never per
   * frame; see the docblock in `lens3d.ts`.
   */
  private rebuildLens(): void {
    this.lens.build(this.state, this.lensView, this.geometry, this.materials);
    this.invalidate();
  }

  // --- MapView: selection and overlays -------------------------------------

  setSelectedUnitId(id: number | null): void {
    if (this.selectedUnitId === id) return;
    this.selectedUnitId = id;
    // The selected unit's badge rim brightens with it, and the badges live in
    // the units layer, so the selection has to reach it. Rebuilding the whole
    // layer for one rim sounds extravagant and is not: it is a few dozen
    // matrices, it happens on a click rather than on a frame, and the
    // alternative — patching one instance's colour in place — would mean
    // teaching the collector about mutable per-instance ink for one highlight.
    this.rebuildUnits();
    this.rebuildOverlays();
  }

  /**
   * Brightens the selection ring while the UI has move mode armed.
   *
   * The renderer is told a boolean and nothing else: what move mode *is* belongs
   * to `src/ui/controls.ts`, and all the board has to know is that this ring
   * should look live. See `MapView.setMoveModeHighlight`.
   */
  setMoveModeHighlight(on: boolean): void {
    if (this.moveMode === on) return;
    this.moveMode = on;
    this.rebuildOverlays();
  }

  setReachable(cells: readonly CellRef[]): void {
    if (sameCells(this.reachable, cells)) return;
    this.reachable = cells;
    this.rebuildOverlays();
  }

  /**
   * Tiles the selected unit could attack. See `MapView.setAttackable` — which
   * tiles those are is the UI's question, asked of `previewCombat`; the board
   * only tints what it is told.
   */
  setAttackable(cells: readonly CellRef[]): void {
    if (sameCells(this.attackable, cells)) return;
    this.attackable = cells;
    this.rebuildOverlays();
  }

  setPathPreview(cells: readonly CellRef[]): void {
    if (sameCells(this.pathPreview, cells)) return;
    this.pathPreview = cells;
    this.rebuildOverlays();
  }

  /**
   * The route the selected unit has already committed to. Drawn quietly, under
   * the hovered preview — see `OverlayState.committed`.
   */
  setCommittedPath(cells: readonly CellRef[]): void {
    if (sameCells(this.committedPath, cells)) return;
    this.committedPath = cells;
    this.rebuildOverlays();
  }

  setWorkedTiles(cells: readonly CellRef[], locked: readonly CellRef[] = []): void {
    if (sameCells(this.workedTiles, cells) && sameCells(this.lockedTiles, locked)) return;
    this.workedTiles = cells;
    this.lockedTiles = locked;
    this.rebuildOverlays();
  }

  /**
   * Puts a lens over the board, or takes it away.
   *
   * The renderer is told *what to show*, never *why*: which lens is up, whether
   * it was chosen from the menu or turned on automatically by an open city
   * panel, and which tiles it covers are all decisions `src/ui/controls.ts`
   * makes. See `MapView.setLens`.
   */
  setLens(lens: LensView): void {
    if (sameLens(this.lensView, lens)) return;
    this.lensView = lens;
    this.rebuildLens();
  }

  setHover(hover: HoverInfo | null): void {
    const same =
      (hover === null && this.hover === null) ||
      (hover !== null && this.hover !== null && hover.tile === this.hover.tile);
    if (same) return;
    this.hover = hover;
    this.rebuildOverlays();
  }

  getHover(): HoverInfo | null {
    return this.hover;
  }

  // --- MapView: picking and camera -----------------------------------------

  /**
   * The tile under a viewport position. Closed-form; see `picking.ts` for the
   * height-plane walk and the approximations it makes at cliff edges.
   */
  pick(screenX: number, screenY: number): HoverInfo | null {
    if (!this.map) return null;
    const hit = pickTile(this.map, this.view.screenRay(screenX, screenY));
    if (!hit) return null;
    return {
      tile: hit.tile,
      worldCol: hit.worldCol,
      row: hit.row,
      axial: offsetToAxial(hit.col, hit.row),
    };
  }

  /**
   * Where a tile's top face lands on screen, in viewport CSS pixels — the
   * inverse of `pick`, and what the DOM city banners are positioned with.
   *
   * The wrap is handled the way `panToCells` handles it: the cell is first
   * resolved to the copy of the cylinder nearest the camera's own target, so a
   * banner belonging to a city just over the seam appears beside its city rather
   * than a whole map width away. `onScreen` is generous by design — a banner is
   * anchored at its city's *centre* but is wider and taller than the point, so
   * culling exactly at the viewport edge would pop one out while half of it was
   * still visible.
   */
  projectCell(col: number, row: number): ScreenPoint | null {
    if (!this.map) return null;
    const tile = getTileAt(this.map, col, row);
    if (!tile) return null;

    const centre = cellCenter(col, row);
    const period = wrapWidth(this.map);
    const reference = this.view.target.x;
    let delta = (((centre.x - reference) % period) + period) % period;
    if (delta > period / 2) delta -= period;

    const point = new Vector3(reference + delta, tileTopY(tile), centre.z).project(
      this.view.camera,
    );
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    return {
      x: (point.x * 0.5 + 0.5) * width,
      y: (-point.y * 0.5 + 0.5) * height,
      onScreen: Math.abs(point.x) <= 1.25 && Math.abs(point.y) <= 1.25,
    };
  }

  /**
   * Registers a callback run at the end of every frame the renderer actually
   * draws. One listener, not a list: there is one consumer (the DOM banner
   * overlay), and a list would invite the loop to grow a subscription system.
   *
   * It fires only on drawn frames, which is exactly the contract the banners
   * want under render-on-demand — if the camera did not move, neither did they.
   */
  setFrameListener(listener: (() => void) | null): void {
    this.frameListener = listener;
  }

  panByScreen(dx: number, dy: number): void {
    this.view.pan(dx, dy);
    this.invalidate();
  }

  zoomBy(factor: number, screenX: number, screenY: number): void {
    this.view.zoomByFactor(factor, screenX, screenY);
    this.invalidate();
  }

  /**
   * Centres the view on a group of cells — the seat-change gesture, and the one
   * camera move the game makes on the player's behalf.
   *
   * The centroid is computed *wrap-aware*. Each cell's world x is first pulled
   * into the copy of the cylinder nearest the current pan target, so a player
   * whose units straddle the seam averages out to the tile they are actually
   * clustered on rather than to the far side of the map; the camera then takes
   * the short way there (see `camera3d.ts`). Rows do not wrap, so z is a plain
   * mean.
   *
   * The zoom is not touched: this answers "where", not "how close".
   */
  panToCells(cells: readonly CellRef[], animate: boolean): void {
    if (!this.map || cells.length === 0) return;
    const period = wrapWidth(this.map);
    const reference = this.view.target.x;

    let sumX = 0;
    let sumZ = 0;
    for (const cell of cells) {
      const point = cellCenter(cell.col, cell.row);
      let delta = ((point.x - reference) % period + period) % period;
      if (delta > period / 2) delta -= period;
      sumX += reference + delta;
      sumZ += point.z;
    }

    this.view.panTo(sumX / cells.length, sumZ / cells.length, animate, performance.now());
    this.invalidate();
  }

  /** Re-frames the whole board, as a fresh map does. */
  fitToViewport(): void {
    if (!this.board) return;
    this.view.frameBoard(this.board.bounds);
    this.invalidate();
  }

  resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // `false`: the canvas is sized by CSS (`inset: 0`), and letting three write
    // inline styles would fight the stylesheet on every resize.
    this.renderer.setSize(width, height, false);
    this.view.resize(width, height);
    if (this.needsFit && this.board) {
      this.view.frameBoard(this.board.bounds);
      this.needsFit = false;
    }
    this.invalidate();
  }

  // --- MapView: animation ---------------------------------------------------

  /**
   * Slides a piece along the tiles it just walked.
   *
   * The unit's resting instance is zero-scaled for the duration and a temporary
   * standalone mesh — one per wrap copy — carries the motion. Purely cosmetic:
   * the simulation already has the unit at its destination.
   */
  animateMove(unitId: number, from: CellRef, walked: readonly CellRef[]): void {
    if (!this.state) return;
    this.animations.start(unitId, from, walked, performance.now());
    if (this.animations.activeUnits().includes(unitId)) {
      this.units.hide(unitId);
      this.spawnWalker(unitId);
    }
    this.invalidate();
  }

  /**
   * Topples a piece that has just been killed.
   *
   * Everything about it arrives in the argument, because the unit is already
   * gone from the state (see `MapView.animateDeath`). The mesh built here is
   * the same sculpt the resting instance was, in the same colour, so the piece
   * that falls over is visibly the piece that was standing there — but it is a
   * standalone group with its own material, because it is about to be rotated
   * and faded and neither is a thing an instanced bucket can do to one member.
   */
  animateDeath(fallen: FallenUnit): void {
    if (!this.map || !this.state) return;
    this.deaths.start(fallen.id, performance.now());
    if (!this.deaths.activeUnits().includes(fallen.id)) return;
    this.spawnFaller(fallen);
    this.invalidate();
  }

  skipAnimations(): void {
    this.animations.clear();
    this.deaths.clear();
    this.clearWalkers();
    this.clearFallers();
    this.units.clearHidden();
    if (this.state) this.rebuildUnits();
    this.invalidate();
  }

  /**
   * Builds the temporary meshes for one walking piece: the body plus its
   * inverted-hull shell, cloned once per wrap copy so the walk is visible on
   * whichever side of the seam the camera happens to be on.
   *
   * In sprite style the walker is the same billboard-plus-shadow-plus-ring group
   * the resting unit is built from (`buildSpriteUnit`), so a unit looks
   * identical standing still and mid-stride. That shared builder is the whole
   * reason animation needed no second implementation for the new art.
   */
  private spawnWalker(unitId: number): void {
    if (!this.state || !this.map) return;
    const unit = this.state.units.find((u) => u.id === unitId);
    if (!unit) return;

    this.removeWalker(unitId);
    const faceCamera = this.view.camera.quaternion.clone();
    const color = unitColor(this.state, unit);
    const period = wrapWidth(this.map);
    const group = new Group();

    /**
     * The walker's own badge, or null while the atlas is still rasterising.
     *
     * Built fresh per wrap copy rather than cloned, because a badge is two
     * meshes and three of them is six draws for the fraction of a second a unit
     * is in flight — against the alternative of teaching the instanced badge
     * buckets to move, which is the thing hiding-and-respawning exists to avoid.
     */
    const badgeFor = (): Group | null =>
      this.badges
        ? buildBadge(
            this.geometry,
            this.materials,
            this.badges,
            modelClassFor(unit.type),
            color,
            faceCamera,
            unitVisualHeight(unit.type, this.sprites),
          )
        : null;

    const spriteMaterial = this.sprites?.materialFor(unit.type) ?? null;
    if (spriteMaterial) {
      for (const dx of [-period, 0, period]) {
        const copy = buildSpriteUnit(
          this.geometry,
          this.materials,
          spriteMaterial,
          color,
          faceCamera,
        );
        copy.position.x = dx;
        const badge = badgeFor();
        if (badge) copy.add(badge);
        group.add(copy);
      }
      this.scene.add(group);
      this.walkers.set(unitId, group);
      return;
    }

    const piece = this.geometry.pieces[modelClassFor(unit.type)];
    const shape = piece.geometry;
    computeHullNormals(shape);
    const material = pieceMaterials(this.materials, piece, color);

    // The piece's own turn goes on each mesh, never on the group: the group
    // carries the wrap offsets, and a rotation above them would swing the two
    // outer copies out of the seam and onto the wrong part of the board.
    const facing = placePiece(this.map, unit, 0).quaternion;
    for (const dx of [-period, 0, period]) {
      // One wrapper per copy, so the badge can be a *sibling* of the piece: as a
      // child it would inherit the piece's hashed yaw and stop facing the
      // camera, which is the one thing a tag must never do.
      const copy = new Group();
      copy.position.x = dx;
      const mesh = new Mesh(shape, material);
      mesh.castShadow = this.shadows;
      mesh.receiveShadow = this.shadows;
      mesh.quaternion.copy(facing);
      mesh.frustumCulled = false;
      const shell = new Mesh(shape, this.materials.outline);
      shell.castShadow = false;
      shell.receiveShadow = false;
      shell.frustumCulled = false;
      mesh.add(shell);
      copy.add(mesh);
      const badge = badgeFor();
      if (badge) copy.add(badge);
      group.add(copy);
    }
    // The whole group is moved each frame; the per-copy offset lives on the
    // children, so one position write drives all three.
    this.scene.add(group);
    this.walkers.set(unitId, group);
  }

  /**
   * Builds the meshes for one falling piece, one per wrap copy.
   *
   * Each copy is wrapped in a group whose origin is the *tile centre*, so the
   * tilt applied to the child rotates the figure about its own feet rather than
   * swinging it across the board — a piece that pivoted about the world origin
   * would fly off the table instead of falling over on it.
   *
   * Its material is a private, transparent clone: the shared `MaterialLibrary`
   * entry is used by every other piece of the same colour on the board, and
   * fading it would fade the whole army. `disposeFaller` gives the clone back.
   */
  private spawnFaller(fallen: FallenUnit): void {
    if (!this.map || !this.state) return;
    this.removeFaller(fallen.id);

    const piece = this.geometry.pieces[modelClassFor(fallen.type)];
    computeHullNormals(piece.geometry);
    const player = this.state.players[fallen.ownerId];
    const color = playerPieceColor(player?.color ?? '', fallen.ownerId);

    const tile = getTileAt(this.map, fallen.col, fallen.row);
    const centre = cellCenter(fallen.col, fallen.row);
    const height = tile ? tileTopY(tile) : 0;
    const period = wrapWidth(this.map);
    const group = new Group();

    for (const dx of [-period, 0, period]) {
      const anchor = new Group();
      anchor.position.set(centre.x + dx, height, centre.z);
      // Cloned per copy so the three wrap copies can share nothing mutable; the
      // geometry is still the shared sculpt, which is the expensive half.
      const materials = pieceMaterials(this.materials, piece, color);
      const cloned = Array.isArray(materials)
        ? materials.map((material) => material.clone())
        : materials.clone();
      for (const material of Array.isArray(cloned) ? cloned : [cloned]) {
        material.transparent = true;
        material.depthWrite = false;
      }
      const mesh = new Mesh(piece.geometry, cloned);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      anchor.add(mesh);
      group.add(anchor);
    }

    this.scene.add(group);
    this.fallers.set(fallen.id, group);
  }

  /**
   * Samples every fall in flight, laying each piece a little further over.
   * Returns true while at least one is still going, exactly as `stepAnimations`
   * does for the walks.
   */
  private stepDeaths(now: number): boolean {
    let active = false;
    for (const unitId of [...this.fallers.keys()]) {
      const sample = this.deaths.sample(unitId, now);
      if (!sample) {
        this.removeFaller(unitId);
        continue;
      }
      const group = this.fallers.get(unitId)!;
      for (const anchor of group.children) {
        // Rolled about the board's x axis: the camera looks down the z, so a
        // roll about x is the one that reads as "toppling toward the viewer".
        anchor.rotation.x = sample.tilt;
        const mesh = anchor.children[0] as Mesh | undefined;
        if (!mesh) continue;
        mesh.position.y = -sample.sink;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          material.opacity = sample.opacity;
        }
      }
      active = true;
    }
    return active;
  }

  private removeFaller(unitId: number): void {
    const group = this.fallers.get(unitId);
    if (!group) return;
    this.scene.remove(group);
    // The cloned materials were made for this fall and nothing else holds them.
    for (const anchor of group.children) {
      const mesh = anchor.children[0] as Mesh | undefined;
      if (!mesh) continue;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        material.dispose();
      }
    }
    this.fallers.delete(unitId);
  }

  private clearFallers(): void {
    for (const unitId of [...this.fallers.keys()]) this.removeFaller(unitId);
  }

  private removeWalker(unitId: number): void {
    const group = this.walkers.get(unitId);
    if (!group) return;
    this.scene.remove(group);
    this.walkers.delete(unitId);
  }

  private clearWalkers(): void {
    for (const unitId of [...this.walkers.keys()]) this.removeWalker(unitId);
  }

  /**
   * Samples every in-flight walk. Returns true while at least one is still
   * moving, which is what keeps the render loop awake.
   */
  private stepAnimations(now: number): boolean {
    if (!this.map) return false;
    let active = false;
    for (const unitId of [...this.walkers.keys()]) {
      const sample = this.animations.sample(unitId, now, this.map);
      if (!sample) {
        // Finished (or forgotten): the piece goes back to being an instance.
        this.removeWalker(unitId);
        this.units.restore(unitId);
        continue;
      }
      const group = this.walkers.get(unitId)!;
      group.position.set(sample.x, sample.y, sample.z);
      active = true;
    }
    return active;
  }

  // --- look ----------------------------------------------------------------

  get shadowsEnabled(): boolean {
    return this.shadows;
  }

  /**
   * Turns shadows on or off.
   *
   * `castShadow`/`receiveShadow` are baked into the instanced meshes when they
   * are built, so this rebuilds the board and the pieces — which is why it is a
   * control the player flips when the frame rate hurts, not something the
   * renderer touches by itself. The camera, the selection and the overlays are
   * all left exactly as they were.
   */
  setShadows(enabled: boolean): void {
    if (this.shadows === enabled) return;
    this.shadows = enabled;
    this.renderer.shadowMap.enabled = enabled;
    // Toggling the shadow map invalidates every compiled program that sampled
    // it; three needs telling explicitly.
    this.materials.invalidatePrograms();
    if (this.map) this.rebuildBoard(this.map);
    this.rebuildUnits();
    this.rebuildCities();
    this.invalidate();
  }

  // --- frame ---------------------------------------------------------------

  invalidate(): void {
    this.dirty = true;
  }

  private applyLight(): void {
    const el = LOOK.lightElevation * DEG;
    const az = LOOK.lightAzimuth * DEG;
    const direction = new Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    );
    // The rig hangs off the pan target, which is wrapped modulo the board
    // period — so crossing the seam moves the light with the camera and the
    // shadows do not swing.
    this.key.position.copy(this.view.target).addScaledVector(direction, LOOK.lightDistance);
    this.key.target.position.copy(this.view.target);
    this.key.target.updateMatrixWorld();

    // Track the visible region rather than the whole map. On a standard map
    // this is the difference between crisp contact shadows and mush.
    const extent = this.view.radius * LOOK.shadowExtent;
    const shadow = this.key.shadow.camera;
    shadow.left = -extent;
    shadow.right = extent;
    shadow.top = extent;
    shadow.bottom = -extent;
    shadow.near = 1;
    shadow.far = LOOK.lightDistance * 2.5;
    shadow.updateProjectionMatrix();
  }

  private loop(): void {
    if (!this.running) return;
    requestAnimationFrame(this.loop);

    const now = performance.now();
    // A frame that had a walker in it always draws, even if that walker just
    // finished — the piece it removed has to be replaced by the instanced one.
    const hadWalkers = this.walkers.size > 0;
    if (hadWalkers) this.stepAnimations(now);
    // Falls force frames exactly as walks do, and for the same reason: the
    // frame that finished one has to draw the board without it.
    const hadFallers = this.fallers.size > 0;
    if (hadFallers) this.stepDeaths(now);
    // An animating camera forces frames the same way a walking piece does: it
    // moved the target, so the frame it moved it on has to be drawn.
    const panned = this.view.stepPan(now);
    if (!this.dirty && !hadWalkers && !hadFallers && !panned) return;

    this.dirty = false;
    // The pieces are instanced, so unlike the 2D units layer they are not
    // re-read from the state every frame — they have to be rebuilt when the
    // state moves them. Rather than making every caller remember to say so,
    // the layer is fingerprinted and rebuilt when the fingerprint changes: it
    // is a handful of integers per unit, it runs only on frames that were
    // already going to be drawn, and it cannot be forgotten. Moves, spawns,
    // damage, deaths and the stored orders that resolve during a turn change
    // are all caught by it.
    if (this.state && signUnits(this.state) !== this.unitsSignature) {
      this.rebuildUnits();
      this.rebuildOverlays();
    }
    // Towns and borders are fingerprinted separately from the units and from
    // each other, because they change on completely different events: a city
    // growing must not rebuild every border on the map, and a border moving
    // must not rebuild every town.
    // A city founded since the last frame also clears its tile, which is baked
    // into the board — the one mid-game board rebuild besides toggling shadows.
    if (this.state && this.map && signCityCells(this.state) !== this.boardCitiesSignature) {
      this.rebuildBoard(this.map);
      // A new city changes where the next one may go: the settler lens is
      // showing exactly that rule and would otherwise keep the old answer.
      if (this.lensView.mode === 'settler') this.rebuildLens();
    }
    if (this.state && signCities(this.state) !== this.citiesSignature) this.rebuildCities();
    if (this.state && signTerritory(this.state) !== this.territorySignature) {
      this.rebuildTerritory();
      // Borders decide whose ground a settler may stand on, so the same applies.
      if (this.lensView.mode === 'settler') this.rebuildLens();
    }
    // The light rig follows the pan target, so it must be recomputed on any
    // frame the camera could have moved — which is every frame we draw.
    this.applyLight();
    this.renderer.render(this.scene, this.view.camera);
    this.lastDrawCalls = this.renderer.info.render.calls;
    // After the draw, so anything the listener projects sees the camera the
    // frame was rendered with rather than the one before it.
    this.frameListener?.();
  }

  dispose(): void {
    this.running = false;
    this.frameListener = null;
    this.clearWalkers();
    this.clearFallers();
    this.sprites?.dispose();
    this.badges?.dispose();
    this.units.dispose();
    this.cities.dispose();
    this.territory.dispose();
    this.lens.dispose();
    this.overlays.dispose();
    if (this.board) this.board.dispose();
    this.geometry.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }
}

/**
 * A cheap order-sensitive fingerprint of everything about the units that the
 * pieces layer draws: who they are, *what* they are, where they stand, and how
 * hurt they are. FNV-1a over integers, so it allocates nothing per frame.
 *
 * The type is in here because a unit can change type without moving: research
 * upgrades a warrior into a swordsman in place (see `upgradeUnits` in
 * `tech.ts`), and every other field stays identical — a fingerprint without it
 * would leave the old silhouette on the board until the unit next walked.
 */
function signUnits(state: GameState): number {
  let h = 2166136261 ^ state.units.length;
  for (const unit of state.units) {
    h = Math.imul(h ^ unit.id, 16777619);
    h = Math.imul(h ^ unit.col, 16777619);
    h = Math.imul(h ^ unit.row, 16777619);
    h = Math.imul(h ^ unit.hp, 16777619);
    h = Math.imul(h ^ unit.ownerId, 16777619);
    h = Math.imul(h ^ (UNIT_TYPE_INDEX.get(unit.type) ?? -1), 16777619);
  }
  return h >>> 0;
}

/** Unit types as small integers, so the fingerprint stays integer arithmetic. */
const UNIT_TYPE_INDEX = new Map<UnitTypeId, number>(
  UNIT_TYPE_IDS.map((id, index) => [id, index]),
);

/** Cheap equality for overlay cell lists, so a repaint is not a rebuild. */
function sameCells(a: readonly CellRef[], b: readonly CellRef[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.col !== b[i]!.col || a[i]!.row !== b[i]!.row) return false;
  }
  return true;
}
