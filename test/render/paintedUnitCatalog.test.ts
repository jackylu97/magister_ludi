import { beforeAll, describe, expect, it } from 'vitest';
import units from '../../data/units.json';
import leaders from '../../data/leaders.json';
// @ts-expect-error The shared study catalog remains JavaScript.
import { unitLines, unitArtSpecs, leaderUnitArtSpecs, unitExamples, unitReviewVariants, paintedUnitTypes, civilianUnitExamples, newUnitExamples, greatPersonFamilies, greatPersonFamily } from '../../src/terrainStudy/unitCatalog.js';

// The doc-sync tests keep Node imports behind a variable specifier so the
// project's type surface remains vite/client without adding Node typings.
const FS_SPECIFIER = 'node:fs';
let readFileSync: (path: URL, encoding: string) => string;
beforeAll(async () => {
  const fs = (await import(/* @vite-ignore */ FS_SPECIFIER)) as { readFileSync: typeof readFileSync };
  readFileSync = fs.readFileSync;
});

// The accepted pre-leader inventory. Existing ranks are stable addresses, not
// a fresh ordering to derive whenever the data roster grows.
const original = {
  infantry: ['warrior', 'swordsman', 'legionary', 'longswordsman', 'fireLance'],
  polearm: ['spearman', 'phalanx', 'spearWall', 'pikeman'],
  ranged: ['archer', 'bowman', 'compositeBowman', 'crossbowman'],
  cavalry: ['chariot', 'horseman', 'cataphract', 'knight', 'knightsTemplar'],
  mountedRanged: ['chariotArcher', 'horseArcher'], elephant: ['warElephant'],
  siege: ['catapult', 'trebuchet'], scout: ['scout'], worker: ['worker'], settler: ['settler'],
  trader: ['trader'], faith: ['augur', 'prophet', 'apostle', 'inquisitor'], greatPerson: ['greatPerson'],
  navalLight: ['trireme', 'bireme', 'galley', 'caravel', 'corvette'],
  navalHeavy: ['warGalley', 'towerShip', 'carrack', 'shipOfTheLine'],
  navalRanged: ['fireShip', 'gunGalley', 'frigate'],
};
type Art = { line: string; rank: number; ready: boolean; implemented: boolean; variant?: string };
const art = unitArtSpecs as Record<string, Art>;
const lines = unitLines as Record<string, { label: string; types: string[] }>;
const additions = leaderUnitArtSpecs as Record<string, Omit<Art, 'ready' | 'implemented'>>;

describe('painted unit inventory after leader integration', () => {
  it('covers all 61 roster IDs exactly once and preserves every original rank and example', () => {
    const ids = Object.values(lines).flatMap(line => line.types);
    expect(ids).toHaveLength(61); expect(new Set(ids).size).toBe(61);
    expect([...ids].sort()).toEqual(Object.keys(units.units).sort());
    expect(Object.keys(art).sort()).toEqual([...ids].sort());
    expect(Object.values(original).flat()).toHaveLength(44);
    for (const [line, types] of Object.entries(original)) {
      expect(lines[line]!.types.slice(0, types.length)).toEqual(types);
      for (const [rank, id] of types.entries()) expect(art[id]).toMatchObject({ line, rank });
    }
    expect(unitExamples).toEqual(['warrior', 'spearman', 'horseman', 'archer', 'horseArcher', 'worker', 'prophet', 'scout', 'settler', 'trader', 'greatPerson', 'warElephant']);
    expect(civilianUnitExamples).toEqual(['worker', 'scout', 'settler', 'trader', 'greatPerson']);
    expect(newUnitExamples).toEqual(['horseman', 'horseArcher', 'greatPerson', 'warElephant']);
    expect(Object.keys(art).filter(id => art[id]!.ready).sort()).toEqual([...unitExamples].sort());
  });

  it('assigns all 17 new IDs explicitly without approving models or inventing later ranks', () => {
    const originalIds = new Set(Object.values(original).flat());
    const extra = Object.keys(units.units).filter(id => !originalIds.has(id));
    expect(Object.keys(additions).sort()).toEqual(extra.sort()); expect(extra).toHaveLength(17);
    for (const id of extra) {
      const spec = additions[id]!;
      expect(art[id]).toEqual({ ...spec, ready: false, implemented: paintedUnitTypes.includes(id) });
      expect(lines[spec.line]!.types).toContain(id);
      expect(spec.variant).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(Number.isInteger(spec.rank)).toBe(true); expect(spec.rank).toBeGreaterThanOrEqual(0);
      expect(spec.rank).toBeLessThan(original[spec.line as keyof typeof original].length);
    }
    expect(art.fubing).toMatchObject({ line: 'polearm', rank: art.spearman!.rank });
    expect(art.ponticPeltast).toMatchObject({ line: 'polearm', rank: art.spearman!.rank });
    expect(art.camelArcher).toMatchObject({ line: 'mountedRanged', rank: art.horseArcher!.rank, variant: 'camel-bow' });
    expect(art.scythedChariot).toMatchObject({ line: 'cavalry', rank: art.chariot!.rank });
    expect(art.canoness).toMatchObject({ line: 'faith', rank: art.apostle!.rank });
    expect(art.rihlaCaravan).toMatchObject({ line: 'trader', rank: art.trader!.rank });
    for (const [id, equivalent] of [['treasureShip', 'carrack'], ['alexandrianGalley', 'galley']] as const) {
      expect(units.units[id].masts).toBe(units.units[equivalent].masts);
      expect(units.units[id].canton).toBe(units.units[equivalent].canton);
      expect(art[id]).toMatchObject({ line: art[equivalent]!.line, rank: art[equivalent]!.rank });
    }
  });

  it('tracks six implemented infantry variants separately from the accepted examples', () => {
    const variants = ['swordsman', 'legionary', 'longswordsman', 'fireLance', 'khopesh', 'eagleWarrior'];
    expect(unitReviewVariants).toEqual(variants);
    expect(paintedUnitTypes).toEqual([...unitExamples, ...variants, 'phalanx', 'spearWall', 'pikeman', 'fubing', 'ponticPeltast', 'bowman', 'compositeBowman', 'crossbowman', 'slinger', 'cataphract', 'knight', 'knightsTemplar', 'tangCavalry', 'chanyuGuard', 'gendarme', 'mandekalu', 'whistlingArrow', 'xiongnuHorseArcher', 'camelArcher', 'chariot', 'scythedChariot', 'chariotArcher', 'catapult', 'trebuchet', 'trireme', 'bireme', 'galley', 'caravel', 'corvette', 'alexandrianGalley', 'warGalley', 'towerShip', 'carrack', 'shipOfTheLine', 'treasureShip', 'fireShip', 'gunGalley', 'frigate', 'augur', 'apostle', 'inquisitor', 'canoness', 'rihlaCaravan']);
    expect(new Set(paintedUnitTypes).size).toBe(61);
    expect(Object.keys(art).filter(id => art[id]!.implemented).sort()).toEqual([...paintedUnitTypes].sort());
    for (const id of variants) expect(art[id]).toMatchObject({ line: 'infantry', ready: false, implemented: true });
    expect([...lines.infantry!.types].sort()).toEqual(['warrior', ...variants].sort());
  });

  it('keeps the documented mapping synchronized with the thirteen active and four parked alternatives', () => {
    const active = new Set(Object.values(leaders.leaders).map(leader => leader.unit));
    expect(active.size).toBe(13);
    const parked = Object.keys(additions).filter(id => !active.has(id));
    expect(parked.sort()).toEqual(['chanyuGuard', 'fubing', 'scythedChariot', 'whistlingArrow']);
    const doc = readFileSync(new URL('../../docs/plans/terrain-study-units.md', import.meta.url), 'utf8');
    const rows = [...doc.matchAll(/^\| `([^`]+)` \| `([^`]+)` \| (\d+) \| `([^`]+)` \| (active|parked) \|$/gm)];
    expect(rows).toHaveLength(17); expect(rows.map(row => row[1]).sort()).toEqual(Object.keys(additions).sort());
    for (const [, id, line, rank, variant, status] of rows) {
      expect(additions[id!]).toEqual({ line, rank: Number(rank), variant });
      expect(status).toBe(active.has(id!) ? 'active' : 'parked');
    }
  });

  it('preserves the five great-person families and their safe fallback', () => {
    expect(Object.keys(greatPersonFamilies)).toEqual(['scholar', 'artist', 'engineer', 'merchant', 'general']);
    for (const family of Object.keys(greatPersonFamilies)) expect(greatPersonFamily(family)).toBe(family);
    expect(greatPersonFamily(undefined)).toBe('scholar'); expect(greatPersonFamily('unknown')).toBe('scholar');
    expect(art.greatPerson).toEqual({ line: 'greatPerson', rank: 0, ready: true, implemented: true });
  });
});
