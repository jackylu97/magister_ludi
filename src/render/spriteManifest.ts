/**
 * What every tile is made of: which face sprite, which standing objects, and
 * where those objects stand.
 *
 * Pure data and pure functions — no DOM, no `Image`, no canvas. That is what
 * lets the completeness rules ("every terrain has a face", "every feature has a
 * decoration rule") and the placement jitter be unit-tested in Node. The loader
 * that turns these paths into `HTMLImageElement`s is `sprites.ts`.
 *
 * Determinism
 * -----------
 * Tree and rock positions are hashed from the tile's own `(col, row)` and the
 * slot index — never from `state.rng`. Rendering must not touch simulation
 * randomness: the terrain cache is rebuilt on resize, on a new map and
 * (eventually) on a reload, and a renderer that advanced the gameplay generator
 * would desync a replay. Hashing the coordinates also means a tile's trees stand
 * in the same spot for the whole game, which is the point.
 *
 * Water
 * -----
 * The Kenney hexagon pack has no water tile, so `ocean` and `coast` carry a
 * `file: null` and a flat `faceColor`. Flat water under sprite land is a
 * deliberate art choice, not a gap: a photo-real sea would fight the flat-colour
 * board, and the sprite palette has a matching blue.
 */

import { FEATURE_IDS, TERRAIN_IDS, type FeatureId, type TerrainId } from '../sim/terrainData';
import { UNIT_TYPE_IDS } from '../sim/unitData';
import { VIEW } from './viewData';

/** How one terrain's ground face is drawn. */
export interface TerrainArt {
  /** Sprite path relative to `public/sprites/`, or null for procedural water. */
  file: string | null;
  /**
   * The face's flat colour. Read for the cliff strip under a raised tile, for
   * the water fill, and as the cache's clear colour. Kept in step with the
   * sprite by hand — it is the sprite's dominant pixel value.
   */
  faceColor: string;
  /** True for the two water terrains, which get the wave treatment. */
  water?: boolean;
}

/** One family of standing sprites a tile may contribute. */
export interface DecorRule {
  /** Candidate sprite paths; the slot hash picks one. */
  sprites: string[];
  /** How many sprites this rule places. */
  count: number;
  /** Sprite *height* as a fraction of hex width, before jitter. */
  height: number;
  /** Jitter radius in hex widths. Defaults to `VIEW.decor.spread`. */
  spread?: number;
}

/** A resolved standing sprite: what to draw and where, relative to the centre. */
export interface DecorPlacement {
  file: string;
  /** Sprite height as a fraction of hex width, jitter applied. */
  height: number;
  /** Offset from the tile centre in *plane* space, as a fraction of hex width. */
  dx: number;
  dy: number;
}

/** The rise-and-decoration inputs; a `Tile` satisfies it structurally. */
export interface DecorTile {
  col: number;
  row: number;
  terrain: TerrainId;
  feature: FeatureId;
  hills: boolean;
}

// --- the manifest -----------------------------------------------------------

export const TERRAIN_ART: Record<TerrainId, TerrainArt> = {
  ocean: { file: null, faceColor: VIEW.water.ocean, water: true },
  coast: { file: null, faceColor: VIEW.water.coast, water: true },
  grassland: { file: 'terrain/grassland.png', faceColor: '#27ae60' },
  plains: { file: 'terrain/plains.png', faceColor: '#a89b52' },
  desert: { file: 'terrain/desert.png', faceColor: '#ecdcb8' },
  tundra: { file: 'terrain/tundra.png', faceColor: '#a4afaf' },
  snow: { file: 'terrain/snow.png', faceColor: '#e4eaec' },
  mountain: { file: 'terrain/mountain.png', faceColor: '#8b9393' },
};

const PINES = ['objects/treePine_large.png', 'objects/treePine_small.png'];
const ROUND_TREES = ['objects/treeRound_large.png', 'objects/treeRound_small.png'];

/**
 * Decoration contributed by the terrain itself. Only mountains have any: their
 * boulder is what tells a mountain from a tundra hill at a glance, since both
 * faces are grey stone.
 */
export const TERRAIN_DECOR: Partial<Record<TerrainId, DecorRule>> = {
  mountain: {
    sprites: ['objects/rockGrey_large.png'],
    count: 1,
    height: 0.95,
    spread: 0.08,
  },
};

/**
 * Decoration contributed by the feature. Forest is a handful of pines; jungle is
 * the same idea denser and taller with round canopies, which is the whole visual
 * difference between them (they cost the same to enter).
 */
export const FEATURE_DECOR: Record<FeatureId, DecorRule | null> = {
  none: null,
  forest: { sprites: PINES, count: 3, height: 0.42 },
  jungle: { sprites: ROUND_TREES, count: 5, height: 0.5, spread: 0.34 },
};

/** Decoration contributed by the hills flag, on top of the elevation rise. */
export const HILLS_DECOR: DecorRule = {
  sprites: ['objects/rockGrey_small1.png', 'objects/rockGrey_medium1.png', 'objects/rockBrown_small.png'],
  count: 1,
  height: 0.22,
  spread: 0.26,
};

/** Silhouettes vendored under `public/sprites/pieces/<colour>/`. */
export const PIECE_SILHOUETTES = ['pawn', 'person', 'house', 'tower', 'boat', 'flag'] as const;

/** Piece colour folders vendored under `public/sprites/pieces/`. */
export const PIECE_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'black',
  'white',
] as const;

export function pieceFile(color: string, silhouette: string): string {
  return `pieces/${color}/${silhouette}.png`;
}

/** Every file the loader has to fetch before the first frame. */
export function allSpriteFiles(): string[] {
  const files = new Set<string>();
  for (const art of Object.values(TERRAIN_ART)) {
    if (art.file) files.add(art.file);
  }
  for (const rule of [
    ...Object.values(TERRAIN_DECOR),
    ...Object.values(FEATURE_DECOR),
    HILLS_DECOR,
  ]) {
    if (!rule) continue;
    for (const sprite of rule.sprites) files.add(sprite);
  }
  for (const color of PIECE_COLORS) {
    for (const silhouette of PIECE_SILHOUETTES) files.add(pieceFile(color, silhouette));
  }
  return [...files].sort();
}

// --- completeness -----------------------------------------------------------

/**
 * Every way the manifest can be out of step with `data/`, as human-readable
 * lines. Empty means consistent.
 *
 * Called by `sprites.ts` before the first fetch (a missing rule is a hard error,
 * never a silently blank tile) and asserted by `test/spriteManifest.test.ts`, so
 * adding a terrain to `data/terrain.json` fails the suite rather than the frame.
 */
export function manifestProblems(): string[] {
  const problems: string[] = [];

  for (const id of TERRAIN_IDS) {
    const art = TERRAIN_ART[id];
    if (!art) {
      problems.push(`terrain "${id}" has no entry in TERRAIN_ART`);
      continue;
    }
    if (!/^#[0-9a-f]{6}$/i.test(art.faceColor)) {
      problems.push(`terrain "${id}" has a malformed faceColor "${art.faceColor}"`);
    }
  }
  for (const id of Object.keys(TERRAIN_ART)) {
    if (!(TERRAIN_IDS as string[]).includes(id)) {
      problems.push(`TERRAIN_ART has "${id}", which is not a terrain in data/terrain.json`);
    }
  }

  for (const id of FEATURE_IDS) {
    if (!(id in FEATURE_DECOR)) {
      problems.push(`feature "${id}" has no entry in FEATURE_DECOR (use null for "no decor")`);
    }
  }
  for (const id of Object.keys(FEATURE_DECOR)) {
    if (!(FEATURE_IDS as string[]).includes(id)) {
      problems.push(`FEATURE_DECOR has "${id}", which is not a feature in data/terrain.json`);
    }
  }

  const rules: (DecorRule | null | undefined)[] = [
    ...Object.values(TERRAIN_DECOR),
    ...Object.values(FEATURE_DECOR),
    HILLS_DECOR,
  ];
  for (const rule of rules) {
    if (!rule) continue;
    if (rule.sprites.length === 0) problems.push('a decoration rule has no sprites');
    if (rule.count < 0) problems.push('a decoration rule has a negative count');
    if (rule.height <= 0) problems.push('a decoration rule has a non-positive height');
  }

  for (const type of UNIT_TYPE_IDS) {
    const silhouette = VIEW.pieces.byUnitType[type];
    if (!silhouette) {
      problems.push(`unit type "${type}" has no piece in view.json pieces.byUnitType`);
    } else if (!(PIECE_SILHOUETTES as readonly string[]).includes(silhouette)) {
      problems.push(
        `unit type "${type}" maps to silhouette "${silhouette}", which is not vendored`,
      );
    }
  }

  const colors: string[] = [
    ...Object.values(VIEW.pieces.byPlayerColor),
    ...VIEW.pieces.fallbackOrder,
  ];
  for (const color of colors) {
    if (!(PIECE_COLORS as readonly string[]).includes(color)) {
      problems.push(`view.json names piece colour "${color}", which is not vendored`);
    }
  }
  if (VIEW.pieces.fallbackOrder.length === 0) {
    problems.push('view.json pieces.fallbackOrder is empty');
  }

  return problems;
}

// --- deterministic placement ------------------------------------------------

/**
 * A 32-bit hash of three small integers. Multiplying by large odd constants and
 * folding the high bits down is enough mixing for scatter that reads as random;
 * it is not a PRNG and nothing depends on its statistical quality.
 */
export function hash3(a: number, b: number, c: number): number {
  let h = (a | 0) * 0x27d4eb2d;
  h = (h ^ ((b | 0) * 0x165667b1)) >>> 0;
  h = (h ^ ((c | 0) * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2545f491) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** `hash3` mapped to `[0, 1)`. */
export function hashUnit(a: number, b: number, c: number): number {
  return hash3(a, b, c) / 4294967296;
}

function placeRule(
  rule: DecorRule,
  tile: DecorTile,
  stream: number,
  out: DecorPlacement[],
): void {
  const spread = rule.spread ?? VIEW.decor.spread;
  const jitter = VIEW.decor.scaleJitter;
  for (let i = 0; i < rule.count; i++) {
    const slot = stream * 64 + i;
    // Four independent draws per sprite: which one, and where and how big.
    const pick = hashUnit(tile.col, tile.row, slot * 4);
    const angle = hashUnit(tile.col, tile.row, slot * 4 + 1) * Math.PI * 2;
    // sqrt keeps the scatter uniform over the disc instead of clumping at the
    // centre, which is what makes a five-tree jungle look planted, not piled.
    const radius = Math.sqrt(hashUnit(tile.col, tile.row, slot * 4 + 2)) * spread;
    const size = hashUnit(tile.col, tile.row, slot * 4 + 3) * 2 - 1;
    const file = rule.sprites[Math.floor(pick * rule.sprites.length) % rule.sprites.length]!;
    out.push({
      file,
      height: rule.height * (1 + size * jitter),
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius,
    });
  }
}

/**
 * Everything standing on a tile, back to front.
 *
 * Terrain first, then hills, then the feature, each on its own hash stream so
 * that adding a rock to a hill never shifts the trees that were already there.
 * The result is sorted by `dy` so a nearer tree paints over a farther one.
 */
export function decorationsFor(tile: DecorTile): DecorPlacement[] {
  const out: DecorPlacement[] = [];
  const terrainRule = TERRAIN_DECOR[tile.terrain];
  if (terrainRule) placeRule(terrainRule, tile, 0, out);
  if (tile.hills) placeRule(HILLS_DECOR, tile, 1, out);
  const featureRule = FEATURE_DECOR[tile.feature];
  if (featureRule) placeRule(featureRule, tile, 2, out);
  out.sort((a, b) => a.dy - b.dy);
  return out;
}

/**
 * The tallest a standing sprite can reach above a tile centre, in hex widths.
 * The terrain cache pads its canvas top by this much so the trees on row 0 are
 * not clipped. Sprite aspect ratios are not known here (they come from the
 * loaded images) and do not matter: heights are already expressed relative to
 * hex width. The jitter radius is added because a sprite may also be *placed*
 * above the centre — an overestimate, since that offset is squashed at draw
 * time, and an overestimate is exactly what padding should be.
 */
export function decorOverhang(): number {
  let max = 0;
  const rules: (DecorRule | null | undefined)[] = [
    ...Object.values(TERRAIN_DECOR),
    ...Object.values(FEATURE_DECOR),
    HILLS_DECOR,
  ];
  for (const rule of rules) {
    if (!rule) continue;
    const spread = rule.spread ?? VIEW.decor.spread;
    max = Math.max(max, rule.height * (1 + VIEW.decor.scaleJitter) + spread);
  }
  return max;
}
