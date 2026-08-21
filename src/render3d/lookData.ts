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
  territory: TerritorySpec;
  look: LookSpec;
  camera: CameraSpec;
  lights: LightSpec;
  overlay: OverlaySpec;
  hpBar: HpBarSpec;
  animation: AnimationSpec;
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
  territory: {
    tintScale: viewJson.territory.tintScale,
    tintOpacity: viewJson.territory.tintOpacity,
    borderOpacity: viewJson.territory.borderOpacity,
    workedColor: named(viewJson.territory.workedColor, 'territory.workedColor'),
    workedOpacity: viewJson.territory.workedOpacity,
    workedScale: viewJson.territory.workedScale,
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
