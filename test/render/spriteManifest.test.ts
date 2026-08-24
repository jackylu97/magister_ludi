import { describe, expect, it } from 'vitest';
import { FEATURE_IDS, TERRAIN_IDS, type FeatureId, type TerrainId } from '../../src/sim/terrainData';
import { UNIT_TYPE_IDS } from '../../src/sim/unitData';
import {
  FEATURE_DECOR,
  HILLS_DECOR,
  PIECE_COLORS,
  PIECE_SILHOUETTES,
  TERRAIN_ART,
  TERRAIN_DECOR,
  allSpriteFiles,
  decorOverhang,
  decorationsFor,
  hash3,
  hashUnit,
  manifestProblems,
  pieceFile,
} from '../../src/render/spriteManifest';
import { VIEW, pieceColorFor } from '../../src/render/viewData';

function tile(col: number, row: number, over: Partial<{
  terrain: TerrainId;
  feature: FeatureId;
  hills: boolean;
}> = {}) {
  return {
    col,
    row,
    terrain: over.terrain ?? 'grassland',
    feature: over.feature ?? 'none',
    hills: over.hills ?? false,
  };
}

describe('manifest completeness', () => {
  it('has no problems to report', () => {
    expect(manifestProblems()).toEqual([]);
  });

  it('covers every terrain in data/terrain.json', () => {
    for (const id of TERRAIN_IDS) {
      expect(TERRAIN_ART[id]).toBeDefined();
    }
    expect(Object.keys(TERRAIN_ART).sort()).toEqual([...TERRAIN_IDS].sort());
  });

  it('covers every feature in data/terrain.json', () => {
    for (const id of FEATURE_IDS) {
      expect(id in FEATURE_DECOR).toBe(true);
    }
    expect(Object.keys(FEATURE_DECOR).sort()).toEqual([...FEATURE_IDS].sort());
  });

  it('gives every unit type a vendored silhouette', () => {
    for (const type of UNIT_TYPE_IDS) {
      const silhouette = VIEW.pieces.byUnitType[type];
      expect(silhouette, `unit type ${type}`).toBeDefined();
      expect(PIECE_SILHOUETTES).toContain(silhouette);
    }
  });

  it('names only vendored piece colours in view.json', () => {
    for (const color of Object.values(VIEW.pieces.byPlayerColor)) {
      expect(PIECE_COLORS).toContain(color);
    }
    for (const color of VIEW.pieces.fallbackOrder) {
      expect(PIECE_COLORS).toContain(color);
    }
  });

  it('lists every referenced file exactly once, with no water sprite', () => {
    const files = allSpriteFiles();
    expect(new Set(files).size).toBe(files.length);

    for (const id of TERRAIN_IDS) {
      const art = TERRAIN_ART[id];
      if (art.file === null) {
        // Only water is procedural; anything else missing a file is a bug.
        expect(art.water).toBe(true);
      } else {
        expect(files).toContain(art.file);
      }
    }
    for (const rule of [
      ...Object.values(TERRAIN_DECOR),
      ...Object.values(FEATURE_DECOR),
      HILLS_DECOR,
    ]) {
      if (!rule) continue;
      for (const sprite of rule.sprites) expect(files).toContain(sprite);
    }
    for (const color of PIECE_COLORS) {
      for (const silhouette of PIECE_SILHOUETTES) {
        expect(files).toContain(pieceFile(color, silhouette));
      }
    }
  });

  it('reports the tallest decoration so the cache can pad for it', () => {
    const overhang = decorOverhang();
    expect(overhang).toBeGreaterThan(0);
    for (const rule of [
      ...Object.values(TERRAIN_DECOR),
      ...Object.values(FEATURE_DECOR),
      HILLS_DECOR,
    ]) {
      if (!rule) continue;
      expect(overhang).toBeGreaterThanOrEqual(rule.height);
    }
  });
});

describe('piece colour mapping', () => {
  it('prefers the explicit table and falls back by player index', () => {
    for (const [playerColor, pieceColor] of Object.entries(VIEW.pieces.byPlayerColor)) {
      expect(pieceColorFor(playerColor, 5)).toBe(pieceColor);
      expect(pieceColorFor(playerColor.toUpperCase(), 5)).toBe(pieceColor);
    }
    const order = VIEW.pieces.fallbackOrder;
    expect(pieceColorFor('#123456', 0)).toBe(order[0]);
    expect(pieceColorFor('#123456', order.length)).toBe(order[0]);
    expect(pieceColorFor('#123456', -1)).toBe(order[order.length - 1]);
  });
});

describe('deterministic decoration jitter', () => {
  it('hashes to a stable 32-bit unsigned integer', () => {
    for (let i = 0; i < 50; i++) {
      const h = hash3(i, i * 7, i * 13);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
      expect(hashUnit(i, i * 7, i * 13)).toBeGreaterThanOrEqual(0);
      expect(hashUnit(i, i * 7, i * 13)).toBeLessThan(1);
    }
  });

  it('gives the same tile the same layout every time it is asked', () => {
    for (const t of [
      tile(0, 0, { feature: 'forest' }),
      tile(17, 41, { feature: 'jungle', hills: true }),
      tile(3, 9, { terrain: 'mountain' }),
      tile(80, 2, { terrain: 'tundra', hills: true, feature: 'forest' }),
    ]) {
      const first = decorationsFor(t);
      const second = decorationsFor({ ...t });
      expect(second).toEqual(first);
    }
  });

  it('gives different tiles different layouts', () => {
    const a = decorationsFor(tile(4, 4, { feature: 'forest' }));
    const b = decorationsFor(tile(5, 4, { feature: 'forest' }));
    const c = decorationsFor(tile(4, 5, { feature: 'forest' }));
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('never depends on anything but col, row and the rules', () => {
    // Interleaving unrelated queries must not shift a tile's own layout: the
    // placement hash has no state to carry between calls.
    const expected = decorationsFor(tile(11, 22, { feature: 'jungle' }));
    decorationsFor(tile(0, 0, { feature: 'forest' }));
    decorationsFor(tile(9, 9, { terrain: 'mountain', hills: true }));
    expect(decorationsFor(tile(11, 22, { feature: 'jungle' }))).toEqual(expected);
  });

  it('places exactly the sprites the rules ask for, back to front', () => {
    const forest = FEATURE_DECOR.forest!;
    const placements = decorationsFor(tile(6, 7, { feature: 'forest', hills: true }));
    expect(placements).toHaveLength(forest.count + HILLS_DECOR.count);
    for (let i = 1; i < placements.length; i++) {
      expect(placements[i]!.dy).toBeGreaterThanOrEqual(placements[i - 1]!.dy);
    }
    for (const placement of placements) {
      expect([...forest.sprites, ...HILLS_DECOR.sprites]).toContain(placement.file);
      expect(placement.height).toBeGreaterThan(0);
      // Inside the jitter disc, whichever rule placed it.
      const spread = Math.max(
        forest.spread ?? VIEW.decor.spread,
        HILLS_DECOR.spread ?? VIEW.decor.spread,
      );
      expect(Math.hypot(placement.dx, placement.dy)).toBeLessThanOrEqual(spread + 1e-9);
    }
  });

  it('places nothing on plain, flat, featureless land', () => {
    expect(decorationsFor(tile(2, 3))).toEqual([]);
    expect(decorationsFor(tile(2, 3, { terrain: 'ocean' }))).toEqual([]);
  });

  it('keeps the trees where they were when a rock is added to the tile', () => {
    const flat = decorationsFor(tile(12, 30, { feature: 'forest' }));
    const hilly = decorationsFor(tile(12, 30, { feature: 'forest', hills: true }));
    // Each rule has its own hash stream, so the trees do not move when the
    // hills rule starts contributing a rock.
    for (const tree of flat) {
      expect(hilly).toContainEqual(tree);
    }
  });
});
