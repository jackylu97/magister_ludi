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
import type {
  CellRef,
  FallenUnit,
  HoverInfo,
  LensView,
  MapView,
  ScreenPoint,
} from '../ui/mapView';

import { DeathAnimations3D, MoveAnimations3D } from './animation3d';
import { TileIcons, UnitBadges, badgeHitRadius } from './badges3d';
import {
  type BuiltBoard,
  BoardGeometry,
  buildBoard,
  modelClassFor,
  signFeatureCells,
} from './board3d';
import { DioramaCamera } from './camera3d';
import {
  CityLayer,
  TerritoryLayer,
  signCities,
  signCityCells,
  signTerritory,
} from './cities3d';
import { type FogLevels, type FogStats, FogView, seesCell } from './fog3d';
import {
  ImprovementLayer,
  clearsClutter,
  signImprovedCells,
  signImprovements,
} from './improvements3d';
import { type SuppressScope, RENDER_ORDER, SUPPRESS } from './instances';
import { LensLayer, NO_LENS, sameLens } from './lens3d';
import { VIEW3D, playerPieceColor } from './lookData';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { OverlayLayer } from './overlays';
import {
  UnitLayer,
  badgeAnchors,
  buildBadge,
  buildSpriteUnit,
  unitVisualHeight,
  pieceMaterials,
  placePiece,
  signUnits,
  unitColor,
} from './pieces';
import { type WorldPoint, pickBadge, pickTile } from './picking';
import { UnitSprites } from './sprites3d';
import { type TileTint, TintLayer } from './tint3d';
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
  /**
   * A free-form per-tile wash, empty in the game (see `setTileTints`). Held
   * beside the territory layer because it is the same kind of thing — scenery
   * that keeps the depth test — and drawn just under it, so a country's border
   * still reads over whatever partition somebody is inspecting.
   */
  private readonly tints = new TintLayer();
  private tintList: readonly TileTint[] = [];
  private readonly improvements = new ImprovementLayer();
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
  /**
   * The fog of war: the blank-chart layer, and the per-instance patching that
   * hides and knocks back the board. Rebuilt with the board and never after —
   * see `fog3d.ts` for the constraint that is about.
   */
  private fog: FogView | null = null;
  /**
   * Whose eyes the board is drawn through, or `null` for an omniscient view.
   *
   * A *view* concept and not a simulation one, exactly like `localPlayerId` in
   * `controls.ts` (CLAUDE.md, hard rule 3): the reducer is omniscient, and this
   * is the mask the interface reads. Null is the honest default — until the UI
   * says whose seat this is, there is no seat, and a board that guessed player 0
   * would show one player's fog to a spectator.
   */
  private fogSeat: number | null = null;
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
  /**
   * The tile-icon atlas — resource roundels, yield glyphs, numerals — once it
   * has rasterised. Null until then, and forever in a browser with no 2D
   * context; the lens layer draws neither half without it. See `loadIcons`.
   */
  private icons: TileIcons | null = null;
  /** Fingerprint of the units the layer was last built from. See `loop`. */
  private unitsSignature = 0;
  /** The same for the towns and for the borders. See `loop`. */
  private citiesSignature = 0;
  private territorySignature = 0;
  /** The same for the works on the ground. See `signImprovements`. */
  private improvementsSignature = 0;
  /** The works whose cleared ground has already been applied. See `clearGround`. */
  private clearedImprovementsSignature = 0;
  /** The towns whose cleared ground has already been applied. See `clearGround`. */
  private clearedCitiesSignature = 0;
  /** The standing features the sweep has already accounted for. See `clearGround`. */
  private clearedFeaturesSignature = 0;
  /**
   * The scope each tile's dressing has already been suppressed at, so a sweep
   * costs writes only on the tiles that have newly been built on.
   *
   * Board-lifetime state: cleared with the board, because the handles it is
   * talking about are the board's. See `clearGround`.
   */
  private cleared = new Map<number, SuppressScope>();
  /** Called after every frame that was actually drawn. See `setFrameListener`. */
  private frameListener: (() => void) | null = null;
  /** Set when a board is framed against a viewport that was not laid out yet. */
  private needsFit = false;
  private dirty = true;
  private running = true;
  private buildMs = 0;
  private lastDrawCalls = 0;
  /** What the last fog repaint cost. See `FogStats`. */
  private lastFogStats: FogStats | null = null;

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
    this.scene.add(this.tints.group);
    this.scene.add(this.territory.group);
    this.scene.add(this.improvements.group);
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
    this.loadIcons();
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
   * Rasterises the tile icons into their atlas, in the background.
   *
   * The sibling of `loadBadges`, and not awaited for the same reason: the board
   * is playable the moment it is built, and the resource lens is a thing the
   * player has to ask for. A failure is silent — the lens shows nothing and the
   * yield switch shows nothing, which is what they showed before this atlas
   * existed.
   *
   * The units layer reads it too now, for the worker charge badge's numeral
   * boss (`UnitLayer.build`'s `icons` parameter), so a units rebuild joins the
   * lens and the chart the moment this atlas is ready — otherwise a worker
   * placed before it arrived would carry no charge marker until some unrelated
   * change next touched `signUnits`.
   */
  private loadIcons(): void {
    void TileIcons.load().then((icons) => {
      if (!icons) return;
      if (!this.running) {
        icons.dispose();
        return;
      }
      this.icons = icons;
      this.rebuildLens();
      this.rebuildUnits();
      // The blank chart's serpents are cells of this atlas, so the one layer
      // that could not be finished without it is finished now. The single
      // re-build of the chart layer in a session, and deliberately not a rebuild
      // of the *board*: the fog's own instances are the only ones affected.
      this.rebuildFog();
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
    } else if (
      signCityCells(state) !== this.clearedCitiesSignature ||
      signImprovedCells(state) !== this.clearedImprovementsSignature ||
      signFeatureCells(state.map) !== this.clearedFeaturesSignature
    ) {
      this.clearGround();
    }
    this.rebuildUnits();
    this.rebuildCities();
    this.rebuildTerritory();
    this.rebuildImprovements();
    this.rebuildOverlays();
    this.rebuildLens();
    this.applyFog();
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
    // The tints named cells on the map being replaced; a caller that wants a
    // wash on the new one says so again once it has computed it.
    this.tintList = [];
    this.tints.dispose();
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
   * Switches off the dressing on every tile something has been built on, and
   * costs writes only where that is *news*.
   *
   * The whole of the "the board builds once per game" claim. A town clears the
   * ground it stands on — otherwise the forest it was founded in grows straight
   * through it, and since the houses are the size of the population that would
   * hide the one thing on the board showing a city grow — and a farm or a mine
   * ploughs the meadow under, for the reason `addDecorations` gives. Both used
   * to be baked, so both cost a full re-bake of ninety thousand instances plus a
   * chart rebuild plus a full fog repaint, every time one landed. They are now a
   * dozen matrix writes on the tile that changed (`BuiltBoard.suppressTile`), and
   * they compose with fog rather than racing it (`instances.ts`, the two-bit
   * state machine).
   *
   * **Three** sources now, the third arriving with the chop (2026-08-23): a hex
   * whose feature is gone but whose bake planted a canopy on it. It is the one
   * source that cannot be read off the state alone — see the loop — and it is
   * swept at `decor`, so a chopped tile reads as cleared ground.
   *
   * Monotonic on purpose, and `this.cleared` is what makes it so: a tile is only
   * ever moved *up* the scale, so a sweep over a board of forty farms after the
   * forty-first is built writes on one tile. Nothing walks it back. A town is
   * never un-founded; pillaging destroys the *improvement* — which is the
   * improvements layer's business, and it does disappear — while the ground it
   * cleared stays cleared, which is the Civ rule and also what a ploughed meadow
   * actually does.
   *
   * Called after a board build (where `cleared` is empty, so it applies the lot —
   * a save with thirty farms in it) and whenever either fingerprint moves.
   */
  private clearGround(): void {
    const state = this.state;
    const board = this.board;
    if (!state || !board) return;
    const map = state.map;

    // Towns first, and at the wider scope: a farm can never be built on a city
    // tile, but the two loops are independent and a tile that took `decor` must
    // not be talked back down to `clutter` by an ordering accident.
    for (const city of state.cities) {
      this.clearCell(tileIndex(map, city.col, city.row), SUPPRESS.decor);
    }
    for (let cell = 0; cell < map.tiles.length; cell++) {
      const id = map.tiles[cell]!.improvement;
      if (id === undefined || !clearsClutter(id)) continue;
      this.clearCell(cell, SUPPRESS.clutter);
    }
    // The chopped woods, at the town's scope rather than the farm's — because
    // what has to go is a *canopy*, and the canopy is `decor`. The tile then
    // reads exactly like ground a settlement cleared: the trees go, and so does
    // anything that was standing among them, which is the honest picture of a
    // felled wood and is why the protection rule in `chopErrorAt` keeps a
    // revealed, unimproved resource off the axe in the first place.
    //
    // Asked of the *board's* memory (`treedCells`) and not of the state, and
    // that is the crux: after the chop the state says `none` and the buffers
    // still hold pines, so only the bake can say which hexes are owed a sweep.
    for (const cell of board.treedCells) {
      if (map.tiles[cell]!.feature !== 'none') continue;
      this.clearCell(cell, SUPPRESS.decor);
    }

    this.clearedCitiesSignature = signCityCells(state);
    this.clearedImprovementsSignature = signImprovedCells(state);
    this.clearedFeaturesSignature = signFeatureCells(map);
    this.invalidate();
  }

  /** One tile, moved up the suppression scale but never down. */
  private clearCell(cell: number, scope: SuppressScope): void {
    if ((this.cleared.get(cell) ?? SUPPRESS.never) >= scope) return;
    this.cleared.set(cell, scope);
    this.board?.suppressTile(cell, scope);
  }

  /**
   * Builds the fog view over whatever board is currently up, and paints it.
   *
   * Tied to the board's own lifetime because it holds that board's tile→instance
   * map: a rebuilt board has new buffers and every handle the old fog was
   * holding points at meshes that have been disposed. Called from exactly two
   * places — after a board build, and when the icon atlas lands and the chart
   * can finally grow its marginalia — and from nowhere per frame.
   */
  private rebuildFog(): void {
    if (this.fog) {
      this.scene.remove(this.fog.group);
      this.fog.dispose();
      this.fog = null;
    }
    if (!this.board || !this.map) return;
    this.fog = new FogView(this.map, this.board.tiles);
    this.fog.buildChart(this.geometry, this.materials, this.icons);
    this.scene.add(this.fog.group);
    this.applyFog();
  }

  /**
   * The local seat's visibility grid, or null when there is no seat (or no
   * state, or a seat id that names nobody).
   */
  private fogLevels(): FogLevels {
    if (this.fogSeat === null || !this.state) return null;
    return this.state.visibility[this.fogSeat] ?? null;
  }

  /**
   * Repaints the board for the current seat's visibility, and returns what that
   * cost. Per-instance writes only; see `fog3d.ts`.
   */
  private applyFog(): FogStats | null {
    const levels = this.fogLevels();
    if (!this.fog || !levels) return null;
    return this.fog.apply(levels);
  }

  /**
   * Draws the board through one player's eyes, or through nobody's.
   *
   * The seat-change gesture. It repaints the whole board — every tile's level
   * differs from the one before it — which is a large per-instance sweep and
   * still not a rebuild, and it is a dev-harness action rather than something
   * the product does (CLAUDE.md: hot-seat is a harness). See `MapView.setFogSeat`.
   */
  setFogSeat(playerId: number | null): void {
    if (this.fogSeat === playerId) return;
    this.fogSeat = playerId;
    this.applyFog();
    // Everything that filters by the seat's own eyes has to follow it.
    this.rebuildUnits();
    this.rebuildCities();
    this.rebuildTerritory();
    this.rebuildImprovements();
    this.rebuildLens();
    this.invalidate();
  }

  /** What the last fog repaint cost, for the on-page stats line. */
  get fogStats(): FogStats | null {
    return this.lastFogStats;
  }

  /**
   * Is the local seat watching this cell right now? True everywhere when there
   * is no seat, which is the omniscient board the 2D pipelines and the galleries
   * draw. The predicate the *animations* filter on — the layers use `seesCell`
   * on the grid directly.
   */
  private canSeeCell(col: number, row: number): boolean {
    if (!this.map) return true;
    return seesCell(this.fogLevels(), this.map, col, row);
  }

  /**
   * Rebuilds the terrain instance buffers for a map, leaving the camera and
   * every scrap of interaction state alone.
   *
   * Called for a new map, and again whenever shadows are toggled — `castShadow`
   * is baked into an `InstancedMesh` when it is built, so that flag is a
   * rebuild. That is now the *whole* list: founding a city and finishing a farm
   * used to be on it too, and are a per-tile patch instead (`clearGround`). The
   * board is built once per game.
   */
  private rebuildBoard(map: GameMap): void {
    if (this.board) {
      this.scene.remove(this.board.group);
      this.board.dispose();
    }
    const started = performance.now();
    this.board = buildBoard(map, this.geometry, this.materials, this.shadows);
    // A fresh board carries the full dressing on every hex, so everything
    // already built on this map has to be applied to it once. See `clearGround`.
    this.cleared.clear();
    this.clearedCitiesSignature = 0;
    this.clearedImprovementsSignature = 0;
    this.clearedFeaturesSignature = 0;
    this.clearGround();
    this.buildMs = performance.now() - started;
    this.map = map;
    this.scene.add(this.board.group);
    this.rebuildFog();
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
      this.fogLevels(),
      // The tile atlas, for the worker charge badge's numeral boss — the same
      // atlas and the same loading rhythm as the lens's yield glyphs.
      this.icons,
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
      this.fogLevels(),
    );
    this.citiesSignature = signCities(this.state);
  }

  private rebuildTerritory(): void {
    if (!this.state) return;
    this.territory.build(this.state, this.geometry, this.materials, this.fogLevels());
    this.territorySignature = signTerritory(this.state);
  }

  /**
   * Rebuilds the improvement props. One instance per improved tile, so this is
   * cheap enough to run on a worker's every action — which is the whole reason
   * improvements are a layer and not part of the board (see `improvements3d.ts`).
   *
   * The layer paints its own fog on the way out, so a rebuild on remembered
   * ground comes up washed rather than lit.
   */
  private rebuildImprovements(): void {
    if (!this.state) return;
    this.improvements.build(
      this.state,
      this.geometry,
      this.materials,
      this.shadows,
      this.fogLevels(),
    );
    this.improvementsSignature = signImprovements(this.state);
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
        // The pinned rings wear the seat's own piece colour — worked tiles are
        // only ever shown for the local seat's cities, so the seat is the one
        // player whose colour can be right here. No seat, no colour: the
        // overlay falls back to the data-file accent.
        lockedColor:
          this.fogSeat === null
            ? undefined
            : playerPieceColor(
                this.state?.players[this.fogSeat]?.color ?? '',
                this.fogSeat,
              ),
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
    this.lens.build(
      this.state,
      this.lensView,
      this.geometry,
      this.materials,
      this.icons,
      // The resource markers stand up and face the camera, which never moves:
      // one constant rotation, resolved here exactly as it is for the badges.
      this.view.camera.quaternion.clone(),
      this.fogLevels(),
    );
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

  /**
   * Washes named tiles in named inks, or clears the wash with `null`.
   *
   * Not a lens and deliberately not part of `LensView`: a lens is a question the
   * *game* asks about the board (where may a settler go, what may this seat be
   * told about), and this is a caller handing over a partition it computed
   * itself. The renderer draws the list and knows nothing about what it means —
   * see `tint3d.ts` for the drawing and why it keeps the depth test.
   *
   * Its only consumer today is the mapgen inspection page's continent overlay.
   * The list is cleared by a new map, because the cells in it named the old one.
   */
  setTileTints(tints: readonly TileTint[] | null): void {
    this.tintList = tints ?? [];
    this.rebuildTints();
  }

  private rebuildTints(): void {
    if (!this.map) return;
    this.tints.build(this.map, this.tintList, this.geometry, this.materials);
    this.invalidate();
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

    const point = this.projectPoint({ x: reference + delta, y: tileTopY(tile), z: centre.z });
    return {
      x: point.x,
      y: point.y,
      onScreen: Math.abs(point.ndcX) <= 1.25 && Math.abs(point.ndcY) <= 1.25,
    };
  }

  /**
   * A world point in viewport CSS pixels, with the normalised coordinates it
   * came from kept so a caller can ask how far off screen it fell.
   *
   * The one place this renderer turns world into screen. `projectCell` and the
   * badge hit test are the same arithmetic asked about different things, and a
   * second copy of the NDC-to-pixel conversion is the kind of duplication that
   * survives right up until somebody changes how the canvas is measured.
   */
  private projectPoint(point: WorldPoint): {
    x: number;
    y: number;
    ndcX: number;
    ndcY: number;
  } {
    const ndc = new Vector3(point.x, point.y, point.z).project(this.view.camera);
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    return {
      x: (ndc.x * 0.5 + 0.5) * width,
      y: (-ndc.y * 0.5 + 0.5) * height,
      ndcX: ndc.x,
      ndcY: ndc.y,
    };
  }

  /**
   * The unit whose badge is under a viewport position, or `null`.
   *
   * Only `playerId`'s own units are candidates, and the filtering is done here
   * rather than in the caller because it is the whole of the rule: a badge is a
   * way to *select*, and there is nothing to select on somebody else's piece. A
   * click that lands on an enemy tag therefore falls through to the ordinary
   * tile contract — hover, information, and no selection — exactly as a click on
   * the enemy piece under it does. Filtering here also keeps the candidate list
   * to one seat's units, which is what makes projecting every one of them per
   * click cheap enough not to think about.
   *
   * Badges are placed off the *resting* position of a piece, which is the
   * position the simulation agrees with: a unit mid-walk is already at its
   * destination in the state (see `animation3d.ts`), and its badge is briefly
   * drawn somewhere between the two. Clicking a sliding badge therefore misses
   * for a few hundred milliseconds, and the tile contract answers instead — the
   * same powerless-animation trade the rest of the renderer makes, and the
   * alternative would be a click target that moves while it is being aimed at.
   *
   * See `pickBadge` in `picking.ts` for the screen-space arithmetic and for why
   * the radius is projected rather than assumed.
   */
  pickUnitBadge(screenX: number, screenY: number, playerId: number): number | null {
    // No atlas yet means no badges are drawn, and a target nobody can see is
    // not a target: until the icons rasterise, a click is the tile contract.
    if (!this.state || !this.badges) return null;

    const anchors = badgeAnchors(this.state, playerId, (type) =>
      unitVisualHeight(type, this.sprites),
    );
    return pickBadge(
      anchors,
      screenX,
      screenY,
      (point) => this.projectPoint(point),
      this.badgeRimOffset(),
    );
  }

  /**
   * The world-space step from a badge's centre to the edge of its click target.
   *
   * Along the camera's own right vector, because that is the axis a
   * camera-facing quad's width lies on — the badge is turned by the same fixed
   * rotation every frame — and because a horizontal offset projects to a pure
   * horizontal pixel offset, which is the cleanest thing to measure a radius
   * from. Read off the live camera matrix rather than stored: the elevation and
   * azimuth are data (`view3d.json`), and a hand-derived vector would be a
   * number that quietly stopped being true the day one of them moved.
   */
  private badgeRimOffset(): WorldPoint {
    const right = new Vector3().setFromMatrixColumn(this.view.camera.matrixWorld, 0).normalize();
    const radius = badgeHitRadius();
    return { x: right.x * radius, y: right.y * radius, z: right.z * radius };
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

  /**
   * Back to the diorama's default zoom, leaving the pan target alone.
   *
   * `panToCells` deliberately answers "where" and not "how close" — yanking the
   * zoom around under a player who has settled on one is how a camera starts to
   * feel possessed. But a *tool* that jumps between named places wants the
   * complement: after `fitToViewport` has zoomed all the way out to frame a
   * whole map, "go to this capital" means nothing at that scale. So the two
   * verbs stay separate and a caller that wants both says both.
   */
  resetZoom(): void {
    this.view.resetZoom();
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
    // Fog refuses the animation outright rather than letting a walker slide
    // across it. The resting piece is already filtered by the unit layer, so
    // without this an enemy column marching out of sight would be the one thing
    // on the board that ignored the fog — and a *standalone* mesh at that, which
    // no per-instance patch could reach. Judged at the destination, which is
    // where the simulation already has the unit.
    const arrival = walked[walked.length - 1] ?? from;
    if (!this.canSeeCell(arrival.col, arrival.row)) return;
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
    // The same rule as `animateMove`, for the same reason: a piece toppling on
    // ground this seat is not watching would be a death it is not entitled to
    // have seen.
    if (!this.canSeeCell(fallen.col, fallen.row)) return;
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
      // The walker's own x-ray ghost, so a piece does not stop showing through
      // the canopy for exactly the length of its walk — which is the moment a
      // player is most likely to be watching that particular hex. A child of the
      // mesh, so it inherits the piece's turn and cannot come apart from it; the
      // resting instance gets the same pass from the collector (see `pieces.ts`).
      const ghost = new Mesh(shape, this.materials.silhouette(color));
      ghost.castShadow = false;
      ghost.receiveShadow = false;
      ghost.frustumCulled = false;
      ghost.renderOrder = RENDER_ORDER.silhouette;
      mesh.add(ghost);
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
    // Fog first, because everything below filters by it.
    //
    // Repainted per drawn frame rather than off a fingerprint of its own, and
    // the cost of that is a single integer compare per tile — `apply` writes
    // only where a level actually moved (see `fog3d.ts`). A fingerprint would
    // have to hash four thousand integers to answer the same question, and a
    // *notification* would have to be plumbed through every command, every turn
    // phase and every seat change without ever being forgotten. The frame the
    // renderer was already going to draw is the honest place to ask.
    const fogged = this.applyFog();
    if (fogged) this.lastFogStats = fogged;
    // Any tile that changed level can add or remove a piece, a town, a border
    // or a mark, so the layers that filter by the seat's eyes are rebuilt with
    // the same one call the ordinary fingerprints would have made.
    const fogMoved = (fogged?.tiles ?? 0) > 0;
    if (this.state && (fogMoved || signUnits(this.state) !== this.unitsSignature)) {
      this.rebuildUnits();
      this.rebuildOverlays();
    }
    // Towns and borders are fingerprinted separately from the units and from
    // each other, because they change on completely different events: a city
    // growing must not rebuild every border on the map, and a border moving
    // must not rebuild every town.
    // A city founded since the last frame clears the ground it stands on, and a
    // farm or a mine finished since the last frame ploughs its tile's meadow
    // under. Both used to re-bake the board here — the only mid-game rebuild
    // besides toggling shadows — and both are now a handful of per-instance
    // writes on the tile that changed. See `clearGround`. Only farms and mines
    // move the improvement fingerprint (`signImprovedCells`), so a worker
    // fencing a herd or pitching a camp still costs the board nothing. A wood
    // felled since the last frame is the third source and moves a third
    // fingerprint (`signFeatureCells`), for the same handful of writes.
    const foundings = this.state ? signCityCells(this.state) : 0;
    if (
      this.state &&
      (foundings !== this.clearedCitiesSignature ||
        signImprovedCells(this.state) !== this.clearedImprovementsSignature ||
        signFeatureCells(this.state.map) !== this.clearedFeaturesSignature)
    ) {
      const founded = foundings !== this.clearedCitiesSignature;
      this.clearGround();
      // A new city changes where the next one may go: the settler lens is
      // showing exactly that rule and would otherwise keep the old answer.
      if (founded && this.lensView.mode === 'settler') this.rebuildLens();
    }
    if (this.state && (fogMoved || signCities(this.state) !== this.citiesSignature)) {
      this.rebuildCities();
    }
    // Improvements are terrain-ish, so they follow the fog on explored ground
    // rather than disappearing with it — which means a fog move has to reach
    // this layer too, exactly as it reaches the towns and the borders.
    if (this.state && (fogMoved || signImprovements(this.state) !== this.improvementsSignature)) {
      this.rebuildImprovements();
    }
    if (this.state && (fogMoved || signTerritory(this.state) !== this.territorySignature)) {
      this.rebuildTerritory();
      // Borders decide whose ground a settler may stand on, so the same applies.
      if (this.lensView.mode === 'settler') this.rebuildLens();
    }
    // The lens draws nothing on Terra Incognita, so the ground it covers moved.
    if (fogMoved && this.lensView.mode === 'none' && !this.lensView.yields) {
      // Nothing is up but the roundels; they are scoped by fog too.
      if (this.lensView.resources) this.rebuildLens();
    } else if (fogMoved) {
      this.rebuildLens();
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
    this.icons?.dispose();
    this.units.dispose();
    this.cities.dispose();
    this.territory.dispose();
    this.tints.dispose();
    this.improvements.dispose();
    this.lens.dispose();
    this.overlays.dispose();
    this.fog?.dispose();
    if (this.board) this.board.dispose();
    this.geometry.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }
}

/** Cheap equality for overlay cell lists, so a repaint is not a rebuild. */
function sameCells(a: readonly CellRef[], b: readonly CellRef[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.col !== b[i]!.col || a[i]!.row !== b[i]!.row) return false;
  }
  return true;
}
