/**
 * Typed access to `data/view.json` — every look-and-feel number in one place.
 *
 * The sibling of `sim/terrainData.ts`, on the render side of the fence: nothing
 * here reaches the simulation, and nothing in `src/sim/` may import it. The rule
 * the file exists to enforce is that a renderer module never writes a tunable
 * literal. Squash, elevation rises, shadow alpha, animation timings, piece
 * scale, the player-colour → piece-colour table: all of it is data a designer
 * edits without touching TypeScript.
 *
 * Colours that describe *terrain* still live in `data/terrain.json`; this file
 * only holds colours the sprite pipeline invents (water, cliffs, waves), because
 * those have no sprite to take them from.
 */

import viewJson from '../../data/view.json';

/** The vertical squash and the elevation offsets that make the board a diorama. */
export interface IsoConfig {
  /** Screen y = world y × this. 1 would be the old flat top-down view. */
  squash: number;
  /** Pixels (world units) a hills tile's face is lifted by. */
  hillRise: number;
  /** Same, for mountain terrain. Should be the largest rise. */
  mountainRise: number;
  /** Alpha of the black wash over a raised tile's cliff strip. */
  cliffDarken: number;
  /** Extra alpha on the cliff's bottom edge, so it reads as a lit top face. */
  cliffRimDarken: number;
}

export interface BoardConfig {
  /** Preferred hex circumradius in the terrain cache; capped for big maps. */
  desiredBaseSize: number;
  /** Hard cap on either cache-canvas dimension (browser canvas limits). */
  maxCacheDimension: number;
  /** Faces are drawn this much oversized so neighbours never leave a hairline. */
  faceOverdraw: number;
  /** Below this zoom the grid is hidden — it would be pure moiré. */
  gridMinZoom: number;
}

/** The pack has no water hex, so water is drawn procedurally. See `sprites.ts`. */
export interface WaterConfig {
  ocean: string;
  coast: string;
  /** Inland fresh water. Drawn exactly like the sea, in a fresher blue. */
  lake: string;
  waveColor: string;
  waveAlpha: number;
  /** Wave glyphs per water tile. 0 disables them. */
  waveCount: number;
  /** Wave dash length, as a fraction of hex width. */
  waveLength: number;
  /** Wave stroke width, as a fraction of hex width. */
  waveWidth: number;
  /** Alpha of the black wash on the lower half of a water hex. */
  shoreDarken: number;
}

export interface DecorConfig {
  /** Jitter radius of a standing sprite from the tile centre, in hex widths. */
  spread: number;
  /** ± this fraction of size, per sprite, from the deterministic hash. */
  scaleJitter: number;
  /** Alpha of the ellipse under a standing sprite. */
  shadowAlpha: number;
}

export interface UnitViewConfig {
  /** Piece height as a fraction of hex width. */
  pieceScale: number;
  shadowAlpha: number;
  /** Shadow ellipse radii, as fractions of hex width. */
  shadowWidth: number;
  shadowHeight: number;
  /** Selection ellipse radius, as a fraction of hex width. */
  selectionScale: number;
  /** Damage bar width, as a fraction of hex width. */
  hpBarWidth: number;
  /** Below this on-screen hex size the unit layer is skipped entirely. */
  minScreenSize: number;
}

export interface AnimationConfig {
  /** Milliseconds a piece takes to cross one hex. */
  msPerHex: number;
  /** Ceiling on a whole walk, however long the path. */
  maxMs: number;
  /** Peak of the per-hex hop, as a fraction of hex width. 0 disables it. */
  hopHeight: number;
}

export interface PieceConfig {
  /** Unit type id → silhouette name under `public/sprites/pieces/<colour>/`. */
  byUnitType: Record<string, string>;
  /** `Player.color` (lower-case hex) → piece colour folder. */
  byPlayerColor: Record<string, string>;
  /** Used for players whose colour is not in the table, by player index. */
  fallbackOrder: string[];
}

export interface ViewData {
  iso: IsoConfig;
  board: BoardConfig;
  water: WaterConfig;
  decor: DecorConfig;
  units: UnitViewConfig;
  animation: AnimationConfig;
  pieces: PieceConfig;
}

export const VIEW: ViewData = viewJson as ViewData;

/**
 * The piece colour folder for a player.
 *
 * Explicit mapping first (a designer pairing "Crimson" with the red pieces),
 * then a stable per-index fallback so a third player is never colourless.
 */
export function pieceColorFor(playerColor: string, playerIndex: number): string {
  const explicit = VIEW.pieces.byPlayerColor[playerColor.toLowerCase()];
  if (explicit) return explicit;
  const order = VIEW.pieces.fallbackOrder;
  return order[((playerIndex % order.length) + order.length) % order.length]!;
}
