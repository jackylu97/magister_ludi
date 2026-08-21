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

export interface DecorSpec {
  pine: PineSpec;
  jungle: JungleSpec;
  rock: { radius: number };
  /** How far from the tile centre decorations may scatter, in hex radii. */
  spread: number;
  /** ± fraction of size jitter per decoration. */
  sizeJitter: number;
}

export interface PieceSpec {
  height: number;
  radius: number;
  /** How far stacked pieces on one tile fan out from the centre. */
  stackSpread: number;
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
  /** Valid sites are graded between these two by `startScore`. */
  siteLowColor: number;
  siteHighColor: number;
  siteOpacity: number;
  /** How many grades the range is quantised into. One material bucket each. */
  siteSteps: number;
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
}

export interface HpBarSpec {
  /** Bar width in world units. */
  width: number;
  height: number;
  /** Extra height above the top of the piece. */
  lift: number;
  backColor: number;
  /** Fill colour when the unit is hurt, and when it is nearly whole. */
  fillColor: number;
  goodColor: number;
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
  piece: PieceSpec;
  city: CitySpec;
  table: TableSpec;
  territory: TerritorySpec;
  look: LookSpec;
  camera: CameraSpec;
  lights: LightSpec;
  overlay: OverlaySpec;
  hpBar: HpBarSpec;
  animation: AnimationSpec;
  lens: LensSpec;
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
  decor: viewJson.decor,
  piece: viewJson.piece,
  city: viewJson.city,
  table: {
    color: named(viewJson.table.color, 'table.color'),
    edgeColor: named(viewJson.table.edgeColor, 'table.edgeColor'),
    edgeFalloff: viewJson.table.edgeFalloff,
    edgePad: viewJson.table.edgePad,
    reach: viewJson.table.reach,
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
  },
  hpBar: {
    width: viewJson.hpBar.width,
    height: viewJson.hpBar.height,
    lift: viewJson.hpBar.lift,
    backColor: parseColor(viewJson.hpBar.backColor, 'hpBar.backColor'),
    fillColor: parseColor(viewJson.hpBar.fillColor, 'hpBar.fillColor'),
    goodColor: parseColor(viewJson.hpBar.goodColor, 'hpBar.goodColor'),
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
    siteLowColor: parseColor(viewJson.lens.siteLowColor, 'lens.siteLowColor'),
    siteHighColor: parseColor(viewJson.lens.siteHighColor, 'lens.siteHighColor'),
    siteOpacity: viewJson.lens.siteOpacity,
    siteSteps: viewJson.lens.siteSteps,
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
