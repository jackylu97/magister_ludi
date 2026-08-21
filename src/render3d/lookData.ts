/**
 * Typed access to `data/view3d.json` — every look-and-feel number of the 3D
 * renderer in one place.
 *
 * The sibling of `render/viewData.ts` on the 3D side of the fence. The rule is
 * the same one that file exists to enforce: no module under `src/render3d/`
 * writes a tunable literal. Heights, jitter amplitudes, light intensities, the
 * palette itself and the overlay tints are all data a designer edits without
 * touching TypeScript, and Vite hot-reloads the JSON exactly as it does
 * `view.json`.
 *
 * What stays in TypeScript is *structure*: which shapes exist, how a prism is
 * lathed, what a hex ring is made of. A number that could sensibly be nudged
 * lives here; a number that would change what a thing *is* lives in the code.
 *
 * Colours are written as CSS hex strings because that is what a designer types
 * and what a colour picker emits, and are parsed once, at load, into the
 * 0xRRGGBB integers `THREE.Color` wants. Palette entries are referenced by
 * *name* from the terrain and feature tables, so the "twelve colours and no
 * more" discipline that produces the one-artist look is visible in the data
 * rather than being a convention nobody can check.
 */

import viewJson from '../../data/view3d.json';

import type { FeatureId, TerrainId } from '../sim/terrainData';

import type { MiniAccent, MiniClass } from './geometry';

// --- shapes ----------------------------------------------------------------

export interface PineSpec {
  trunkR: number;
  trunkH: number;
  coneR: number;
  coneH: number;
}

export interface JungleSpec {
  trunkR: number;
  trunkH: number;
  ballR: number;
}

/** Top-face height above the waterline, per elevation class. */
export interface HeightSpec {
  ocean: number;
  coast: number;
  land: number;
  hills: number;
  mountain: number;
}

export interface BoardSpec {
  /** Hex circumradius in world units. Everything else is expressed in these. */
  hexRadius: number;
  /** Fraction of the radius each prism shrinks by, leaving the grout line. */
  tileGap: number;
  height: HeightSpec;
  /** Every prism's bottom face sits here, so nothing shows daylight beneath. */
  floorY: number;
  peak: { height: number; radius: number };
  /** ± fraction of uniform scale jitter applied per tile. */
  heightJitter: number;
  /** ± radians of yaw jitter applied per tile. */
  yawJitter: number;
  /** Substrate slab overhang past the board bounds, in hex radii. */
  substratePad: number;
  /** How far under the ocean top face the substrate's own top sits. */
  substrateDrop: number;
  /** `shade` amount applied to `earth` for the substrate colour. */
  substrateShade: number;
}

/**
 * A tuft of grass or a bed of reeds: a ring of thin cones out of one root.
 * `blades` is the count in the *shape*; how many tufts a tile gets is `max`.
 */
export interface TuftSpec {
  coneR: number;
  coneH: number;
  blades: number;
  cluster: number;
}

/** How much of a scatter a kind of clutter is: chance the tile has any, and a cap. */
export interface ScatterSpec {
  chance: number;
  max: number;
}

/**
 * Per-instance colour wobble, as fractions.
 *
 * The single cheapest diorama win there is. Ten thousand identical greens read
 * as a tileset; ten thousand greens that disagree by five percent read as a
 * painted model. It costs one float3 per instance and no extra draw call at all
 * (see `Tint` in `instances.ts` for why it cannot be done by varying the ink).
 */
export interface VariationSpec {
  /** ± fraction of value jitter on decorations. */
  value: number;
  /** ± fraction of opposed red/blue tilt — a hue drift, not a value change. */
  hue: number;
  /** The same two, weaker, for the terrain prisms themselves. */
  terrainValue: number;
  terrainHue: number;
}

/**
 * The contact darkening baked into every prism's vertex colours.
 *
 * See `bakeContactShading` in `geometry.ts`: `aoBand` is how far below a tile's
 * top face the shading reaches, in world units, and `aoStrength` how dark it
 * gets at the bottom of that band.
 */
export interface GroundSpec {
  aoBand: number;
  aoStrength: number;
}

/** Snow on the mountains: the top `fraction` of both cones of the peak. */
export interface SnowCapSpec {
  fraction: number;
  color: number;
}

/** The pale band on the top face of a land tile that touches the sea. */
export interface ShoreSpec {
  color: number;
  opacity: number;
  /** Outer radius and band width as fractions of the hex radius. */
  outer: number;
  width: number;
  lift: number;
}

export interface ClutterSpec {
  tuft: TuftSpec & ScatterSpec & { color: number; shade: number };
  flower: {
    stemR: number;
    stemH: number;
    headR: number;
    /** One ink per flower, picked by hash. Three is a meadow; six is confetti. */
    colors: number[];
  } & ScatterSpec;
  cactus: {
    bodyR: number;
    bodyH: number;
    armR: number;
    armH: number;
    color: number;
    shade: number;
  } & ScatterSpec;
  /** Pebbles reuse the boulder shape at `scale`, which costs no new geometry. */
  pebble: { scale: number; color: number; shade: number } & ScatterSpec;
}

/**
 * What grows where the land meets fresh water.
 *
 * Rivers arrived as blue bands in the grout and lakes as flat tiles, and both
 * read as *drawn on* until something is standing in them. Reeds are placed
 * toward the water rather than scattered over the tile — `edgeOffset` is how far
 * from the tile centre, in hex radii, the clump sits along the direction of the
 * river edge or the lake next door — which is the difference between a tile with
 * reeds on it and a river bank.
 */
export interface ReedSpec extends TuftSpec, ScatterSpec {
  color: number;
  shade: number;
  edgeOffset: number;
  jitter: number;
  bankPebbleChance: number;
  bankPebbleMax: number;
  bankPebbleScale: number;
}

export interface DecorSpec {
  pine: PineSpec;
  /** A second conifer silhouette, so a forest is not one tree stamped twice. */
  pineAlt: PineSpec;
  jungle: JungleSpec;
  jungleAlt: JungleSpec;
  rock: { radius: number };
  /** How far from the tile centre decorations may scatter, in hex radii. */
  spread: number;
  /** ± fraction of size jitter per decoration. */
  sizeJitter: number;
  /** Chance any one tree takes the alternate silhouette. */
  altChance: number;
  variation: VariationSpec;
  ground: GroundSpec;
  snowCap: SnowCapSpec;
  shore: ShoreSpec;
  clutter: ClutterSpec;
  reeds: ReedSpec;
}

/**
 * The unit miniatures: the kit every sculpt in `geometry.ts` is cut from.
 *
 * Four numbers and three inks decide the whole roster's family resemblance. The
 * base disc is the load-bearing one — uniform radius and thickness across every
 * sculpt is what makes a catapult and a settler read as two pieces from the
 * same box rather than as two models — and the per-class heights are the other
 * half: a set of toys is a set because the toys are the same size.
 *
 * `heights` is keyed by *size* class, which is not the model class the board
 * draws by (`ModelClass`): several models share a size, and `polearm` and
 * `engine` currently have no model at all — they belong to the bench sculpts in
 * `geometry.ts`, and they stay because those sculpts are built to them.
 */
export interface PiecesSpec {
  /** How far stacked pieces on one tile fan out from the centre. */
  stackSpread: number;
  base: { radius: number; thickness: number };
  /** Shoulder radius of the abstract humanoid token. */
  tokenRadius: number;
  /** Total silhouette height, base included, per size class. */
  heights: Record<MiniClass, number>;
  /** The fixed inks the equipment is painted in. The body is the player's. */
  colors: Record<MiniAccent, number>;
}

export interface HouseSpec {
  width: number;
  depth: number;
  bodyH: number;
  roofH: number;
}

/** The little town on a city tile: a cluster of houses under a banner. */
export interface CitySpec {
  /** Most houses ever drawn, however large the city grows. */
  houseCap: number;
  house: HouseSpec;
  /** How far from the tile centre houses scatter, in hex radii. */
  houseSpread: number;
  /** ± fraction of size jitter per house. */
  houseJitter: number;
  wallColor: string;
  roofColor: string;
  poleRadius: number;
  poleHeight: number;
  poleColor: string;
  flagWidth: number;
  flagHeight: number;
  /** How far below the top of the pole the flag hangs. */
  flagDrop: number;
}

/**
 * Rivers: the water running in the grout between two prisms.
 *
 * A river here is not a tile, it is an *edge*, so it is drawn as a flat ribbon
 * lying across the gap the tile inset already leaves between neighbours. The
 * ribbon is much wider than that gap on purpose: its middle shows, and both ends
 * are buried inside the two prisms it runs between, which is what lets it look
 * like water in a channel rather than a blue stripe painted on the table.
 *
 * `drop` is the one number that has to be small. The gap is about 0.08 of a hex
 * radius wide and the camera looks down at 57°, so anything more than a few
 * hundredths below the tile face is hidden by the prism's own lip and the river
 * simply disappears. Dropping to the substrate — where the grout shadow actually
 * lives — would be invisible at every zoom.
 */
export interface RiverSpec {
  /** Palette name of the water. */
  color: number;
  /** Ribbon width across the gap, in hex radii. Most of it is buried. */
  width: number;
  /** Ribbon length as a multiple of the edge; over 1 so corners close up. */
  overhang: number;
  /** How far below the lower of the two tiles' top faces the ribbon sits. */
  drop: number;
}

/** Borders, and the dots marking which tiles a city's citizens work. */
export interface TerritorySpec {
  /** Territory tint size as a fraction of the hex radius. */
  tintScale: number;
  tintOpacity: number;
  /** Opacity of the ring drawn on tiles at the edge of an empire. */
  borderOpacity: number;
  workedColor: number;
  workedOpacity: number;
  /** Worked-tile dot size, as a multiple of the path dot. */
  workedScale: number;
  /** A pinned tile's dot: bigger, in the player's own accent, and ringed. */
  lockedColor: number;
  lockedScale: number;
  lockedRingScale: number;
  lockedRingOpacity: number;
}

/**
 * The lenses: yield pips, and the settler site tint.
 *
 * The pip colours are written out as hex rather than referenced from the board
 * palette on purpose. They are the *interface's* yield voices — the same green,
 * orange and gilt the city panel and the top bar count in — muted a step for the
 * diorama. A player who has learned that green means food in the HUD must not
 * have to learn a second vocabulary on the board.
 */
export interface LensSpec {
  /** Pip radius and thickness in world units. */
  pipRadius: number;
  pipHeight: number;
  /** Gap between pips along a row, and between the rows themselves. */
  pipSpacing: number;
  rowSpacing: number;
  /** Most pips ever drawn for one yield; beyond it the last pip grows. */
  pipCap: number;
  pipMoreScale: number;
  pipOpacity: number;
  foodColor: number;
  productionColor: number;
  goldColor: number;
  /** Tiles no city may be founded on are simply darkened. */
  siteInvalidColor: number;
  siteInvalidOpacity: number;
  /**
   * The two things that decide a city site, each with its own ink: a tile
   * touching the sea, and a tile with fresh water. See `lens3d.ts`.
   */
  siteCoastColor: number;
  siteFreshColor: number;
  siteOpacity: number;
  /** An estuary is both: the two inks blended by `mix`, ringed, and stronger. */
  siteEstuaryMix: number;
  siteEstuaryOpacity: number;
  siteEstuaryRingOpacity: number;
}

/**
 * How the units are drawn.
 *
 * `style` is the whole of the art-direction switch: `pieces` is the sculpted
 * toon miniature the board was designed around and the default, `sprites` swaps
 * in painted billboards for the unit types that have artwork and falls back to
 * the sculpt for the ones that do not. Both paths are maintained — see
 * `pieces.ts` — so this is a one-word edit in `data/view3d.json` and nothing
 * else. `pieces.html` shows both side by side.
 */
export interface UnitStyleSpec {
  style: 'pieces' | 'sprites';
  sprite: SpriteSpec;
}

/**
 * The billboard sprites: how the source art is keyed, and how big it stands.
 *
 * The source images are opaque illustrations on a white ground with no alpha
 * channel at all, so the transparency is *made* at load time by thresholding
 * whiteness (see `sprites3d.ts`). Both ends of that threshold are here because
 * they are the two numbers anybody re-tuning a new drop of art will reach for
 * first, and neither of them is a fact about the code.
 */
export interface SpriteSpec {
  /**
   * Card height as a multiple of a hex's width (twice the circumradius).
   *
   * The one number that decides whether the art belongs on the board. A standee
   * wants to be *slightly* larger than the sculpt it stands beside
   * (`pieces.heights.foot`, 0.94 world units) — a printed figure is a figure, not a
   * monument — and the source art fills about 92% of its own frame, so the
   * figure ends up a shade over one world unit tall against houses of about a
   * half. Raising this past ~0.8 is what made the first pass tower over the town
   * it was walking through.
   */
  heightInHexWidths: number;
  /** How far above the tile face the billboard's base sits. */
  lift: number;
  /** Whiteness (0..1) at and above which a pixel becomes fully transparent. */
  keyThreshold: number;
  /** Width of the ramp below the threshold, over which alpha falls to 0. */
  keyFeather: number;
  /** Alpha below which a fragment is discarded outright. */
  alphaTest: number;
  /** The blob shadow that glues a billboard to its tile. */
  shadowRadius: number;
  shadowOpacity: number;
  shadowColor: number;
  standee: StandeeSpec;
}

/** The foot the card stands in. All lengths in hex radii. See `standeeBase`. */
export interface StandeeBaseSpec {
  radius: number;
  thickness: number;
  /** How much the ellipse is squashed across the card's plane. 1 is a circle. */
  squash: number;
  collarScale: number;
  collarThickness: number;
  tabWidth: number;
  tabHeight: number;
  tabThickness: number;
  /** How far above the tile face the foot sits, clearing the blob shadow. */
  lift: number;
}

/**
 * The die cut: how a keyed illustration is turned into a printed standee.
 *
 * See the `sprites3d.ts` docblock for why the art is reframed as print at all.
 * The pixel widths are authored at `referencePx` and scaled to whatever
 * resolution the image actually arrives at, so re-exporting the art larger keeps
 * the same border rather than halving it.
 */
export interface StandeeSpec {
  referencePx: number;
  /** Parchment margin dilated out of the figure's silhouette, in pixels. */
  borderPx: number;
  /** Ink line printed around the outside of that margin, in pixels. */
  rimPx: number;
  /** Ramp fading the ink line's outer edge, so `alphaTest` has a middle to cut. */
  edgeFeatherPx: number;
  /** Keyed alpha (0..255) at and above which a pixel counts as the figure. */
  maskAlpha: number;
  paperColor: number;
  rimColor: number;
  base: StandeeBaseSpec;
}

/**
 * The chart-table: the surface the board is lying on.
 *
 * The board is a diorama and it has to be *somewhere*. A flat colour behind it
 * reads as a void — the pieces float in nothing — so what surrounds the board is
 * a table: aged vellum, lit toward the middle and falling off into the dark at
 * the far edges of the room. It is deliberately a shade deeper than the HUD's
 * parchment, so a panel laid over it still lifts off the page.
 *
 * This surface is where the fog of war will eventually live: unexplored ground
 * is not black, it is *chart the magister has not drawn yet* — blank vellum with
 * faint hex ghost-lines ruled on it. That is not built (see `docs/design-notes`
 * Entry VII), but it is why this is its own block rather than two loose keys
 * under `look`: the ghost-line colour, weight and opacity join it here when the
 * time comes, and the unexplored-tile fill is `color` by definition.
 */
export interface TableSpec {
  /** The lit table tone, and the colour the scene clears to. */
  color: number;
  /** What it falls off to at the far edge of the room. */
  edgeColor: number;
  /** World units, past the board's rim, over which it reaches `edgeColor`. */
  edgeFalloff: number;
  /** Hex radii of table left lit past the board's rim before the fall-off. */
  edgePad: number;
  /** How far past the board the surface extends, in world units. */
  reach: number;
}

export interface LookSpec {
  lightAzimuth: number;
  lightElevation: number;
  /** Inverted-hull thickness in world units. 0 disables the outline pass. */
  outline: number;
  rampSteps: number;
  /** How dark the bottom band of the toon ramp is allowed to get. */
  rampFloor: number;
  saturation: number;
  shadows: boolean;
  shadowMapSize: number;
  shadowBias: number;
  shadowNormalBias: number;
  lightDistance: number;
  /** Shadow frustum half-extent, as a multiple of the camera's frustum. */
  shadowExtent: number;
}

export interface CameraSpec {
  elevation: number;
  azimuth: number;
  frustum: number;
  minFrustum: number;
  maxFrustum: number;
  eyeDistance: number;
  /** Slack left around the board when framing it. */
  fitPadding: number;
  /** Duration of an animated pan to a point, in milliseconds. 0 disables it. */
  panMs: number;
  /**
   * World-unit distance below which an animated pan just jumps. A 600 ms tween
   * across a third of a hex is not a camera move, it is lag.
   */
  panSnapDistance: number;
}

export interface LightSpec {
  keyColor: number;
  keyIntensity: number;
  skyColor: number;
  groundColor: number;
  hemiIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
}

export interface OverlaySpec {
  /** How far above a tile's top face a decal floats, in world units. */
  lift: number;
  reachableColor: number;
  reachableOpacity: number;
  /** Reachable decal size as a fraction of the hex radius. */
  reachableScale: number;
  pathColor: number;
  pathOpacity: number;
  pathDotRadius: number;
  pathDotHeight: number;
  /** The last waypoint's dot is this much larger than the rest. */
  destinationScale: number;
  hoverColor: number;
  selectionColor: number;
  /** Outer radius of a highlight ring, as a fraction of the hex radius. */
  ringOuter: number;
  /** Ring band width, as a fraction of the hex radius. */
  ringWidth: number;
  ringOpacity: number;
  /**
   * The selected unit's *stored* order, drawn under the hovered preview.
   *
   * Quieter than the preview on every axis — dimmer, smaller, and only every
   * `committedStride`-th waypoint, which is what turns a line of chips into a
   * dashed one. A committed route that looked like a proposal would be read as
   * one.
   */
  committedColor: number;
  committedOpacity: number;
  committedScale: number;
  committedStride: number;
}

export interface HpBarSpec {
  /** Bar width in world units. */
  width: number;
  height: number;
  /**
   * How far the bar's centre floats above whatever is under it.
   *
   * That used to be the top of the piece and is now the top of the *badge* (see
   * `BadgeSpec` and `hpBarY` in `badges3d.ts`), which is why the number shrank
   * when the badges landed: the bar climbed a badge's worth on its own.
   */
  lift: number;
  backColor: number;
  /** Fill colour when the unit is hurt, and when it is nearly whole. */
  fillColor: number;
  goodColor: number;
}

/**
 * The floating unit badges: the parchment roundel over every piece.
 *
 * Fifteen sculpts became eight model classes (`ModelClass` in
 * `src/sim/unitData.ts`) because the differences between a swordsman and a
 * longswordsman were real and invisible. What tells them apart now is this: a
 * small camera-facing disc above the unit, parchment with an ink class icon,
 * rimmed in the owner's colour. It is the Civ convention and it works for the
 * Civ reason — the silhouette says *what kind of thing*, the tag says *which
 * one*, and only the tag has to be legible at a glance.
 *
 * Deliberately a thing in the world and not an interface overlay. Badges are
 * depth-tested like the piece they name, so a unit behind a mountain has a badge
 * behind a mountain; the alternative — the `onTop` treatment the HP bars and the
 * route dots get — would leave a field of tags hovering over a ridge with
 * nothing under them.
 */
export interface BadgeSpec {
  /** Roundel diameter in world units. */
  diameter: number;
  /** Clearance between the top of the unit's visual and the disc's underside. */
  lift: number;
  /** Width of the player-coloured rim, in world units. */
  rimWidth: number;
  /** Segments around the rim ring. See `discRing`. */
  rimSegments: number;
  /**
   * How far under the rim the parchment reaches, as a fraction of the rim's
   * width. The rim is geometry and the parchment is texture, so this is what
   * keeps the disc's antialiased edge hidden behind an opaque band instead of
   * fringing against the board.
   */
  paperOverlap: number;
  /** Palette names: the roundel's paper, and the ink the icon is drawn in. */
  paperColor: number;
  inkColor: number;
  /** `shade` amount applied to the rim of the selected unit's badge. */
  selectedRimShade: number;
  /** Atlas cell size in pixels, and how many cells per row. */
  atlasCell: number;
  atlasColumns: number;
  /** Icon box side, as a fraction of the cell. */
  iconScale: number;
  /** Alpha below which a badge fragment is discarded outright. */
  alphaTest: number;
}

export interface AnimationSpec {
  msPerHex: number;
  maxMs: number;
  /** Peak of the per-hex hop, in world units. 0 disables it. */
  hopHeight: number;
}

export interface View3DData {
  palette: Record<string, number>;
  terrainColor: Record<TerrainId, number>;
  featureColor: Record<FeatureId, number>;
  players: { byColor: Record<string, number>; fallbackOrder: number[] };
  sideDarken: number;
  board: BoardSpec;
  decor: DecorSpec;
  pieces: PiecesSpec;
  city: CitySpec;
  table: TableSpec;
  rivers: RiverSpec;
  territory: TerritorySpec;
  look: LookSpec;
  camera: CameraSpec;
  lights: LightSpec;
  overlay: OverlaySpec;
  hpBar: HpBarSpec;
  badges: BadgeSpec;
  animation: AnimationSpec;
  lens: LensSpec;
  units: UnitStyleSpec;
}

// --- parsing ---------------------------------------------------------------

/** `#rrggbb` (or `rrggbb`) → 0xRRGGBB. Throws loudly rather than rendering black. */
function parseColor(value: string, where: string): number {
  const hex = value.startsWith('#') ? value.slice(1) : value;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`view3d.json: ${where} is not a #rrggbb colour: ${value}`);
  }
  return Number.parseInt(hex, 16);
}

const rawPalette = viewJson.palette as Record<string, string>;

const palette: Record<string, number> = {};
for (const [name, value] of Object.entries(rawPalette)) {
  palette[name] = parseColor(value, `palette.${name}`);
}

/** Resolves a palette *name* to its colour, so the tables cannot invent inks. */
function named(name: string, where: string): number {
  const color = palette[name];
  if (color === undefined) {
    throw new Error(`view3d.json: ${where} names an unknown palette colour: ${name}`);
  }
  return color;
}

function namedTable<K extends string>(
  table: Record<string, string>,
  where: string,
): Record<K, number> {
  const out: Record<string, number> = {};
  for (const [key, name] of Object.entries(table)) {
    out[key] = named(name, `${where}.${key}`);
  }
  return out as Record<K, number>;
}

/**
 * The unit art switch, checked rather than cast: it is the one value in this
 * file a person is expected to flip by hand while looking at the board, and a
 * typo that silently fell back to procedural pieces would look exactly like a
 * renderer that had not implemented sprites.
 */
function parseUnitStyle(value: string): 'pieces' | 'sprites' {
  if (value === 'pieces' || value === 'sprites') return value;
  throw new Error(`view3d.json: units.style must be "pieces" or "sprites", got ${value}`);
}

const rawPlayers = viewJson.players as {
  byColor: Record<string, string>;
  fallbackOrder: string[];
};

export const VIEW3D: View3DData = {
  palette,
  terrainColor: namedTable<TerrainId>(viewJson.terrainColor, 'terrainColor'),
  featureColor: namedTable<FeatureId>(viewJson.featureColor, 'featureColor'),
  players: {
    byColor: namedTable<string>(rawPlayers.byColor, 'players.byColor'),
    fallbackOrder: rawPlayers.fallbackOrder.map((name, i) =>
      named(name, `players.fallbackOrder[${i}]`),
    ),
  },
  sideDarken: viewJson.sideDarken,
  board: viewJson.board,
  decor: {
    pine: viewJson.decor.pine,
    pineAlt: viewJson.decor.pineAlt,
    jungle: viewJson.decor.jungle,
    jungleAlt: viewJson.decor.jungleAlt,
    rock: viewJson.decor.rock,
    spread: viewJson.decor.spread,
    sizeJitter: viewJson.decor.sizeJitter,
    altChance: viewJson.decor.altChance,
    variation: viewJson.decor.variation,
    ground: viewJson.decor.ground,
    snowCap: {
      fraction: viewJson.decor.snowCap.fraction,
      color: named(viewJson.decor.snowCap.color, 'decor.snowCap.color'),
    },
    shore: {
      color: named(viewJson.decor.shore.color, 'decor.shore.color'),
      opacity: viewJson.decor.shore.opacity,
      outer: viewJson.decor.shore.outer,
      width: viewJson.decor.shore.width,
      lift: viewJson.decor.shore.lift,
    },
    clutter: {
      tuft: {
        ...viewJson.decor.clutter.tuft,
        color: named(viewJson.decor.clutter.tuft.color, 'decor.clutter.tuft.color'),
      },
      flower: {
        ...viewJson.decor.clutter.flower,
        colors: viewJson.decor.clutter.flower.colors.map((name, i) =>
          named(name, `decor.clutter.flower.colors[${i}]`),
        ),
      },
      cactus: {
        ...viewJson.decor.clutter.cactus,
        color: named(viewJson.decor.clutter.cactus.color, 'decor.clutter.cactus.color'),
      },
      pebble: {
        ...viewJson.decor.clutter.pebble,
        color: named(viewJson.decor.clutter.pebble.color, 'decor.clutter.pebble.color'),
      },
    },
    reeds: {
      ...viewJson.decor.reeds,
      color: named(viewJson.decor.reeds.color, 'decor.reeds.color'),
    },
  },
  pieces: {
    stackSpread: viewJson.pieces.stackSpread,
    base: viewJson.pieces.base,
    tokenRadius: viewJson.pieces.tokenRadius,
    heights: viewJson.pieces.heights,
    colors: namedTable<MiniAccent>(viewJson.pieces.colors, 'pieces.colors'),
  },
  city: viewJson.city,
  table: {
    color: named(viewJson.table.color, 'table.color'),
    edgeColor: named(viewJson.table.edgeColor, 'table.edgeColor'),
    edgeFalloff: viewJson.table.edgeFalloff,
    edgePad: viewJson.table.edgePad,
    reach: viewJson.table.reach,
  },
  rivers: {
    color: named(viewJson.rivers.color, 'rivers.color'),
    width: viewJson.rivers.width,
    overhang: viewJson.rivers.overhang,
    drop: viewJson.rivers.drop,
  },
  territory: {
    tintScale: viewJson.territory.tintScale,
    tintOpacity: viewJson.territory.tintOpacity,
    borderOpacity: viewJson.territory.borderOpacity,
    workedColor: named(viewJson.territory.workedColor, 'territory.workedColor'),
    workedOpacity: viewJson.territory.workedOpacity,
    workedScale: viewJson.territory.workedScale,
    lockedColor: named(viewJson.territory.lockedColor, 'territory.lockedColor'),
    lockedScale: viewJson.territory.lockedScale,
    lockedRingScale: viewJson.territory.lockedRingScale,
    lockedRingOpacity: viewJson.territory.lockedRingOpacity,
  },
  look: viewJson.look,
  camera: viewJson.camera,
  lights: {
    keyColor: parseColor(viewJson.lights.keyColor, 'lights.keyColor'),
    keyIntensity: viewJson.lights.keyIntensity,
    skyColor: parseColor(viewJson.lights.skyColor, 'lights.skyColor'),
    groundColor: parseColor(viewJson.lights.groundColor, 'lights.groundColor'),
    hemiIntensity: viewJson.lights.hemiIntensity,
    ambientColor: parseColor(viewJson.lights.ambientColor, 'lights.ambientColor'),
    ambientIntensity: viewJson.lights.ambientIntensity,
  },
  overlay: {
    lift: viewJson.overlay.lift,
    reachableColor: parseColor(viewJson.overlay.reachableColor, 'overlay.reachableColor'),
    reachableOpacity: viewJson.overlay.reachableOpacity,
    reachableScale: viewJson.overlay.reachableScale,
    pathColor: parseColor(viewJson.overlay.pathColor, 'overlay.pathColor'),
    pathOpacity: viewJson.overlay.pathOpacity,
    pathDotRadius: viewJson.overlay.pathDotRadius,
    pathDotHeight: viewJson.overlay.pathDotHeight,
    destinationScale: viewJson.overlay.destinationScale,
    hoverColor: parseColor(viewJson.overlay.hoverColor, 'overlay.hoverColor'),
    selectionColor: parseColor(viewJson.overlay.selectionColor, 'overlay.selectionColor'),
    ringOuter: viewJson.overlay.ringOuter,
    ringWidth: viewJson.overlay.ringWidth,
    ringOpacity: viewJson.overlay.ringOpacity,
    committedColor: parseColor(viewJson.overlay.committedColor, 'overlay.committedColor'),
    committedOpacity: viewJson.overlay.committedOpacity,
    committedScale: viewJson.overlay.committedScale,
    // At least 1, or the modulo that dashes the run divides by zero and every
    // waypoint disappears.
    committedStride: Math.max(1, Math.round(viewJson.overlay.committedStride)),
  },
  hpBar: {
    width: viewJson.hpBar.width,
    height: viewJson.hpBar.height,
    lift: viewJson.hpBar.lift,
    backColor: parseColor(viewJson.hpBar.backColor, 'hpBar.backColor'),
    fillColor: parseColor(viewJson.hpBar.fillColor, 'hpBar.fillColor'),
    goodColor: parseColor(viewJson.hpBar.goodColor, 'hpBar.goodColor'),
  },
  badges: {
    diameter: viewJson.badges.diameter,
    lift: viewJson.badges.lift,
    rimWidth: viewJson.badges.rimWidth,
    rimSegments: viewJson.badges.rimSegments,
    paperOverlap: viewJson.badges.paperOverlap,
    // Named from the palette, not written out: the roundel is parchment and ink
    // like every other piece of paper in this game, and a badge that drifted off
    // the twelve-colour discipline would be the one thing on the board that did.
    paperColor: named(viewJson.badges.paperColor, 'badges.paperColor'),
    inkColor: named(viewJson.badges.inkColor, 'badges.inkColor'),
    selectedRimShade: viewJson.badges.selectedRimShade,
    atlasCell: viewJson.badges.atlasCell,
    atlasColumns: viewJson.badges.atlasColumns,
    iconScale: viewJson.badges.iconScale,
    alphaTest: viewJson.badges.alphaTest,
  },
  animation: viewJson.animation,
  lens: {
    pipRadius: viewJson.lens.pipRadius,
    pipHeight: viewJson.lens.pipHeight,
    pipSpacing: viewJson.lens.pipSpacing,
    rowSpacing: viewJson.lens.rowSpacing,
    pipCap: viewJson.lens.pipCap,
    pipMoreScale: viewJson.lens.pipMoreScale,
    pipOpacity: viewJson.lens.pipOpacity,
    foodColor: parseColor(viewJson.lens.foodColor, 'lens.foodColor'),
    productionColor: parseColor(viewJson.lens.productionColor, 'lens.productionColor'),
    goldColor: parseColor(viewJson.lens.goldColor, 'lens.goldColor'),
    siteInvalidColor: parseColor(viewJson.lens.siteInvalidColor, 'lens.siteInvalidColor'),
    siteInvalidOpacity: viewJson.lens.siteInvalidOpacity,
    siteCoastColor: parseColor(viewJson.lens.siteCoastColor, 'lens.siteCoastColor'),
    siteFreshColor: parseColor(viewJson.lens.siteFreshColor, 'lens.siteFreshColor'),
    siteOpacity: viewJson.lens.siteOpacity,
    siteEstuaryMix: viewJson.lens.siteEstuaryMix,
    siteEstuaryOpacity: viewJson.lens.siteEstuaryOpacity,
    siteEstuaryRingOpacity: viewJson.lens.siteEstuaryRingOpacity,
  },
  units: {
    style: parseUnitStyle(viewJson.units.style),
    sprite: {
      heightInHexWidths: viewJson.units.sprite.heightInHexWidths,
      lift: viewJson.units.sprite.lift,
      keyThreshold: viewJson.units.sprite.keyThreshold,
      keyFeather: viewJson.units.sprite.keyFeather,
      alphaTest: viewJson.units.sprite.alphaTest,
      shadowRadius: viewJson.units.sprite.shadowRadius,
      shadowOpacity: viewJson.units.sprite.shadowOpacity,
      shadowColor: parseColor(viewJson.units.sprite.shadowColor, 'units.sprite.shadowColor'),
      standee: {
        referencePx: viewJson.units.sprite.standee.referencePx,
        borderPx: viewJson.units.sprite.standee.borderPx,
        rimPx: viewJson.units.sprite.standee.rimPx,
        edgeFeatherPx: viewJson.units.sprite.standee.edgeFeatherPx,
        maskAlpha: viewJson.units.sprite.standee.maskAlpha,
        paperColor: parseColor(
          viewJson.units.sprite.standee.paperColor,
          'units.sprite.standee.paperColor',
        ),
        rimColor: parseColor(
          viewJson.units.sprite.standee.rimColor,
          'units.sprite.standee.rimColor',
        ),
        base: viewJson.units.sprite.standee.base,
      },
    },
  },
};

// --- colour maths ----------------------------------------------------------

/**
 * Mixes a colour toward black (`amount` < 0) or white (`amount` > 0) in plain
 * sRGB. Crude on purpose: a perceptual space would preserve saturation through
 * the mix, and losing a little saturation in the highlights is exactly the
 * chalky, gouache-ish quality this look wants.
 */
export function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (c: number): number => Math.round(c + (target - c) * t) & 0xff;
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/**
 * Blends two colours in plain sRGB. `t` 0 is `a`, 1 is `b`.
 *
 * The same crude, deliberately non-perceptual mix `shade` makes, for the same
 * reason: the slight desaturation through the middle of a ramp is the chalky
 * quality this palette wants, not an artefact to correct.
 */
export function mixColor(a: number, b: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const channel = (shift: number): number => {
    const from = (a >> shift) & 0xff;
    const to = (b >> shift) & 0xff;
    return Math.round(from + (to - from) * clamped) & 0xff;
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Pulls a colour toward its own grey. `amount` 0 = unchanged, 1 = grey. */
export function desaturate(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const grey = 0.299 * r + 0.587 * g + 0.114 * b;
  const mix = (c: number): number => Math.round(c + (grey - c) * amount) & 0xff;
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/** `desaturate` with the sign flipped, so the UI slider reads "saturation". */
export function saturate(color: number, factor: number): number {
  return desaturate(color, 1 - factor);
}

/**
 * The diorama ink for a player.
 *
 * The simulation's `Player.color` is a CSS string chosen for the *panel* — a
 * bright screen red that would tear a hole in this palette if it were painted
 * onto a game piece. The explicit table maps each known player colour onto the
 * muted body colour that belongs to it; anything unrecognised falls back by
 * index, so a third player is never colourless.
 */
export function playerPieceColor(playerColor: string, playerIndex: number): number {
  const explicit = VIEW3D.players.byColor[playerColor.toLowerCase()];
  if (explicit !== undefined) return explicit;
  const order = VIEW3D.players.fallbackOrder;
  return order[((playerIndex % order.length) + order.length) % order.length]!;
}
