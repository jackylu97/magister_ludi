/**
 * The whole look of the 3D prototype in one file.
 *
 * PROTOTYPE ONLY. Nothing here is read by the shipping renderer, and nothing
 * here reads `data/view.json` — the 2D artist's palette is tuned for flat
 * sprites lit by nothing, and reusing it would drag its saturation along.
 *
 * The palette is deliberately tiny: twelve named colours plus two player inks,
 * and every material in the scene is one of them or a mechanical derivation
 * (`shade`, `tint`, `desaturate`). Keeping the count low is what produces the
 * "one artist made this" feel that Messenger has — a board where forty tile
 * types each got their own hand-picked green reads as noise.
 *
 * Colours are 0xRRGGBB integers so they can be handed straight to
 * `THREE.Color`, and they are muted on purpose: nothing here is above ~55%
 * saturation, because a toon ramp *adds* contrast (it quantises a smooth
 * falloff into hard bands) and a saturated base colour comes out of the ramp
 * looking like a cartoon rather than a painted diorama.
 */

import type { FeatureId, TerrainId } from '../sim/terrainData';

// --- the twelve ------------------------------------------------------------

export const PALETTE = {
  /** Outlines, grout, the darkest thing on screen. Never pure black. */
  ink: 0x2f2b32,
  /** The board's substrate — what shows through the gaps between tiles. */
  earth: 0x6a5c4c,
  /** Background sky. Soft teal-cream; deliberately lighter than the board. */
  sky: 0xd3ddd2,

  /** Grassland. The anchor green everything else is judged against. */
  sage: 0x93a877,
  /** Plains — sage pushed toward straw. */
  wheat: 0xbcb07c,
  /** Desert. */
  sand: 0xdcc9a1,
  /** Tundra — a green-grey, not a blue-grey, so it sits beside sage. */
  lichen: 0x9ea08e,
  /** Snow. Warm white; a cold white would fight the key light. */
  bone: 0xe8e6dc,
  /** Mountain rock and boulders. */
  slate: 0x8c857a,

  /** Forest canopy. */
  pine: 0x53694f,
  /** Jungle canopy — darker and bluer than pine so the two read apart. */
  frond: 0x3f5a48,

  /** Deep water. Teal-leaning, never navy. */
  lagoon: 0x5e8a90,
  /** Shallow water. */
  shoal: 0x86aeae,

  /** The one warm accent. Player 1, and anything that must be noticed. */
  crimson: 0xb35843,
  /** Player 2. Cool counterweight to crimson. */
  teal: 0x477f7e,
} as const;

export type PaletteName = keyof typeof PALETTE;

// --- derivations -----------------------------------------------------------

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

// --- terrain mapping -------------------------------------------------------

/** Top-face colour for each terrain. Water entries are used by the sea plane. */
export const TERRAIN_COLOR: Record<TerrainId, number> = {
  ocean: PALETTE.lagoon,
  // The look-dev prototype predates lakes and never generates one; it maps to
  // the coast blue so the `TerrainId` record stays total.
  coast: PALETTE.shoal,
  lake: PALETTE.shoal,
  grassland: PALETTE.sage,
  plains: PALETTE.wheat,
  desert: PALETTE.sand,
  tundra: PALETTE.lichen,
  snow: PALETTE.bone,
  mountain: PALETTE.slate,
};

/** Canopy colour per feature. `none` is unused but keeps the record total. */
export const FEATURE_COLOR: Record<FeatureId, number> = {
  none: PALETTE.sage,
  forest: PALETTE.pine,
  jungle: PALETTE.frond,
};

/**
 * Prism sides are the same hue as the top, darkened.
 *
 * This is load-bearing, not decoration: with the side darker than the top the
 * silhouette of every tile is legible *without* an outline, which is what let
 * the outline pass stay subtle instead of having to carry the whole read.
 */
export const SIDE_DARKEN = -0.26;

/** Player body colours, indexed by player id. Wraps for >2 players. */
export const PLAYER_COLORS: readonly number[] = [PALETTE.crimson, PALETTE.teal];

export function playerColor(id: number): number {
  return PLAYER_COLORS[id % PLAYER_COLORS.length]!;
}

// --- scene tunables --------------------------------------------------------

/**
 * Board geometry, in world units where a hex circumradius is 1.
 *
 * `tileGap` is what makes this look like a set of pieces on a table rather than
 * an extruded heightmap: each prism is drawn slightly under-sized, and the
 * substrate slab shows through the seam as a dark grout line. It also buys the
 * per-tile rotation jitter — a hexagon rotated even 2 degrees no longer tiles,
 * and without a gap to absorb it the board would visibly crack.
 */
export const BOARD = {
  hexRadius: 1,
  /** Fraction of the radius each prism shrinks by. */
  tileGap: 0.045,
  /** Top-face height above the waterline, per elevation class. */
  height: {
    ocean: -0.34,
    coast: -0.16,
    land: 0,
    hills: 0.4,
    mountain: 0.8,
  },
  /** Every prism's bottom face sits here, so nothing shows daylight beneath. */
  floorY: -1.5,
  /** Peak cone stack on a mountain tile, as (height, radius, yOffset). */
  peak: { height: 1.15, radius: 0.62 },
  /** ± fraction of random height jitter applied per tile. */
  heightJitter: 0.035,
  /** ± radians of random yaw applied per tile. */
  yawJitter: 0.045,
} as const;

/** Decoration sizing. All of it is scaled by a per-instance hash at build time. */
export const DECOR = {
  pine: { trunkR: 0.055, trunkH: 0.16, coneR: 0.24, coneH: 0.62 },
  jungle: { trunkR: 0.06, trunkH: 0.14, ballR: 0.27 },
  rock: { radius: 0.19 },
  /** How far from the tile centre decorations may scatter, in hex radii. */
  spread: 0.44,
  /** ± fraction of size jitter per decoration. */
  sizeJitter: 0.22,
} as const;

/** Toy-piece sizing for units. */
export const PIECE = {
  /**
   * Taller than a tree on purpose. A game piece that is shorter than the
   * scenery stops being the subject of the tile and becomes another shrub —
   * this was 0.62 and the settler read as a red smudge.
   */
  height: 0.92,
  radius: 0.2,
} as const;

/** Defaults for everything the look-dev sliders drive. */
export const LOOK_DEFAULTS = {
  /** Key light azimuth in degrees, measured like a compass from +x. */
  lightAzimuth: 135,
  /** Key light elevation in degrees above the horizon. */
  lightElevation: 52,
  /**
   * Inverted-hull thickness in world units (0 disables the pass).
   *
   * World units, not pixels, so the rim thickens as you zoom in — which reads
   * as a physical bevel on the piece rather than an ink line over it, and is
   * the right choice for this look. 0.022 was the first guess and rendered
   * sub-pixel at default zoom, i.e. invisible.
   */
  outline: 0.06,
  /** Bands in the toon ramp. */
  rampSteps: 3,
  /** Global saturation multiplier applied to every material colour. */
  saturation: 1,
  shadows: true,
} as const;

/** Camera framing. Fixed angle — the prototype has no orbit control. */
export const CAMERA = {
  /** Degrees above the ground plane. Civ V sits around here. */
  elevation: 57,
  /** Degrees around the ground plane, so hex sides catch the light. */
  azimuth: 38,
  /** Half-height of the ortho frustum at zoom 1, in world units. */
  frustum: 14,
  minFrustum: 5,
  maxFrustum: 46,
} as const;

/** Light intensities. Warm key, cool fill — the whole colour-temperature read. */
export const LIGHTS = {
  keyColor: 0xffe9c8,
  keyIntensity: 2.35,
  skyColor: 0xcfe0e6,
  groundColor: 0x8a7a63,
  hemiIntensity: 1.15,
  ambientColor: 0xbcd0d6,
  ambientIntensity: 0.35,
} as const;
