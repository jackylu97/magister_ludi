/**
 * **The bounds sheet against the tuning sheet** (`docs/plans/bot-evolution.md`
 * §3.2, ruling 2): `data/ai.bounds.json` is one row per tunable leaf of
 * `data/ai.json`, and this is the sync test that keeps the two honest — the
 * `statecraftDocSync.test.ts` pattern one sheet over.
 *
 * The rules pinned:
 *   · every bounds row names a real numeric leaf of the base (a stale row is a
 *     knob the tuner would move that nothing reads);
 *   · every default lies within its bounds, and an integer row's default is
 *     whole;
 *   · no frozen block has a row — `driver.*`, `search.*` (compute caps, not
 *     skill: a tuner would learn to spend more CPU), `solvency.*` (ruling 3),
 *     `puppetProfile` (the puppet seam folds the file's profile, not a seat's)
 *     and the two dead dials; a leaf with no row is frozen by omission;
 *   · the integer-by-use leaves of the audit's §1.4 are marked `integer`;
 *   · the operators keep every promise the sheet makes: a mutant stays within
 *     bounds, a frozen leaf never moves, a sentinel override never moves, the
 *     persona shape holds, only the warmonger has an appetite, the mix keeps its
 *     sum, and a crossover child's blocks each come whole from one parent.
 */

import { describe, expect, it } from 'vitest';

import aiSheet from '../../data/ai.json';
import boundsSheet from '../../data/ai.bounds.json';
import { makeRng } from '../../src/sim/rng';
import {
  type Bounds,
  type Genome,
  type Json,
  allLeafPaths,
  canonicalJson,
  crossover,
  genomeId,
  genomeOfSheet,
  genomeProblems,
  getPath,
  isSentinel,
  mutate,
  numericLeafPaths,
  seatSheet,
  sheetOfGenome,
} from '../../scripts/evolveGenome';

const BOUNDS = boundsSheet as Bounds;
const FILE = genomeOfSheet(aiSheet as unknown as Json);

/** The blocks ruled out of the search, by omission from the bounds sheet. */
const FROZEN_BLOCKS = ['driver', 'search', 'solvency'];

/** Retired by E1a (dead dials, read by nothing before that); no row, no leaf. */
const DEAD_DIALS = ['military.huntRadius', 'score.nominalTiles'];

/**
 * Leaves whose default is a sentinel rather than a point on a scale — `-999`
 * is "no floor" (`aiConfig.ts`'s `meters` docblock) and `0` is "read the deck"
 * for the malice — frozen by omission, like `driver.*`.
 */
const SENTINEL_LEAVES = ['meters.happinessFloor', 'meters.authorityFloor', 'wager.malicePenalty'];

/**
 * Integer by use (the audit's §1.4): radii, counts, turns, loop bounds — a
 * fraction floors or misbehaves. The frozen blocks' integers are not listed:
 * they have no row to mark.
 */
const INTEGER_LEAVES = [
  'priorities.horizonTurns',
  'expansion.siteSearchRadius',
  'expansion.hexOffersPriced',
  'workers.searchRadius',
  'workers.planTopN',
  'workers.planRadius',
  'growth.smallCityPop',
  'military.campHuntRadius',
  'military.garrisonPerCity',
  'military.armyPerCity',
  'military.scoutCap',
  'military.scoutEarlyTurns',
  'military.screenRadius',
  'war.reachRadius',
  'war.dogpileSeats',
  'war.strikeForce',
  'war.musterDistance',
  'war.musterRadius',
  'war.escortRadius',
  'war.refusalMemoryTurns',
  'war.siegePiecesWanted',
  'war.siegeWithin',
  'war.goalTowns',
  'score.nominalCount',
  'score.patienceTurns',
  'score.lumpTurns',
  'threat.radius',
  'threat.sightedArmyCap',
  'research.goalHorizon',
  'wager.ageTurns',
];

describe('the bounds sheet', () => {
  const leaves = numericLeafPaths(FILE.base);
  const leafSet = new Set(leaves);

  it('names only real numeric leaves of the base', () => {
    const stale = Object.keys(BOUNDS).filter((path) => !leafSet.has(path));
    expect(stale).toEqual([]);
  });

  it('holds every default inside its row, whole where the row says so', () => {
    const outside: string[] = [];
    for (const [path, row] of Object.entries(BOUNDS)) {
      expect({ path, ordered: row.min < row.max }).toEqual({ path, ordered: true });
      const value = getPath(FILE.base, path);
      const points = typeof value === 'number' ? [value] : (value as number[]);
      for (const point of points) {
        if (point < row.min || point > row.max) outside.push(`${path} ${point} ∉ [${row.min}, ${row.max}]`);
        if (row.integer === true && !Number.isInteger(point)) outside.push(`${path} ${point} is not whole`);
      }
    }
    expect(outside).toEqual([]);
  });

  it('leaves the frozen blocks, the puppet profile and the dead dials without a row', () => {
    const rowed = Object.keys(BOUNDS).filter(
      (path) => FROZEN_BLOCKS.some((block) => path.startsWith(`${block}.`)) || path.startsWith('puppetProfile.'),
    );
    expect(rowed).toEqual([]);
    for (const dial of DEAD_DIALS) {
      expect({ dial, rowed: dial in BOUNDS, leaf: leafSet.has(dial) }).toEqual({ dial, rowed: false, leaf: false });
    }
    for (const path of SENTINEL_LEAVES) {
      expect({ path, rowed: path in BOUNDS, leaf: leafSet.has(path) }).toEqual({ path, rowed: false, leaf: true });
    }
  });

  it('marks the integer-by-use leaves', () => {
    for (const path of INTEGER_LEAVES) {
      // A leaf E1a retires leaves this list in the same pass.
      expect({ path, present: leafSet.has(path) }).toEqual({ path, present: true });
      expect({ path, integer: BOUNDS[path]?.integer === true }).toEqual({ path, integer: true });
    }
    // And nothing outside the list is marked: a row marked whole that the
    // reader takes as a fraction would be a knob the tuner could never place.
    const marked = Object.entries(BOUNDS)
      .filter(([, row]) => row.integer === true)
      .map(([path]) => path)
      .sort();
    expect(marked).toEqual([...INTEGER_LEAVES].sort());
  });

  it('reads the two sentinels as sentinels', () => {
    expect(isSentinel(999, BOUNDS['war.declareThresholdPeaceful'])).toBe(true);
    expect(isSentinel(60, BOUNDS['war.acceptCeiling'])).toBe(true);
    expect(isSentinel(getPath(FILE.base, 'war.acceptCeiling'), BOUNDS['war.acceptCeiling'])).toBe(false);
    expect(isSentinel(1, undefined)).toBe(true);
  });
});

describe('the operators', () => {
  const frozen = numericLeafPaths(FILE.base).filter((path) => BOUNDS[path] === undefined);
  const basePaths = allLeafPaths(FILE.base).sort();

  function assertWellFormed(child: Genome, label: string): void {
    expect({ label, problems: genomeProblems(child) }).toEqual({ label, problems: [] });
    // The file's shape, exactly: the same blocks, the same persona keys, and
    // every merged persona the base's own leaf paths — aiPersona.test.ts's pin.
    expect(Object.keys(child.base)).toEqual(Object.keys(FILE.base));
    expect(Object.keys(child.personas)).toEqual(Object.keys(FILE.personas));
    for (const id of Object.keys(FILE.personas)) {
      expect({ id, shape: allLeafPaths(seatSheet(child, id)).sort() }).toEqual({ id, shape: basePaths });
      expect({ id, overrides: numericLeafPaths(child.personas[id]).sort() }).toEqual({
        id,
        overrides: numericLeafPaths(FILE.personas[id]).sort(),
      });
    }
    expect(canonicalJson(child.puppetProfile)).toBe(canonicalJson(FILE.puppetProfile));
    for (const path of frozen) {
      expect({ label, path, value: getPath(child.base, path) }).toEqual({ label, path, value: getPath(FILE.base, path) });
    }
    for (const [path, row] of Object.entries(BOUNDS)) {
      const value = getPath(child.base, path);
      const points = typeof value === 'number' ? [value] : (value as number[]);
      for (const point of points) {
        expect({ label, path, inside: point >= row.min && point <= row.max }).toEqual({ label, path, inside: true });
        if (row.integer === true) expect({ label, path, whole: Number.isInteger(point) }).toEqual({ label, path, whole: true });
      }
      for (const id of Object.keys(child.personas)) {
        const over = getPath(child.personas[id], path);
        if (over === undefined) continue;
        const was = getPath(FILE.personas[id], path);
        if (isSentinel(was, row)) {
          // A sentinel is never a point on the scale: it stays what it was.
          expect({ label, id, path, over }).toEqual({ label, id, path, over: was });
        } else {
          const overs = typeof over === 'number' ? [over] : (over as number[]);
          for (const point of overs) {
            expect({ label, id, path, inside: point >= row.min && point <= row.max }).toEqual({ label, id, path, inside: true });
          }
        }
      }
    }
  }

  it('mutates within the sheet, moving something and freezing the rest', () => {
    const rng = makeRng(7);
    let moved = 0;
    for (let index = 0; index < 40; index += 1) {
      const child = mutate(FILE, BOUNDS, rng);
      assertWellFormed(child, `mutant ${index}`);
      if (genomeId(child) !== genomeId(FILE)) moved += 1;
      // The parent is never touched.
      expect(genomeId(FILE)).toBe(genomeId(genomeOfSheet(aiSheet as unknown as Json)));
      // The orderings hold in every merged sheet.
      for (const id of Object.keys(child.personas)) {
        const sheet = seatSheet(child, id);
        expect(getPath(sheet, 'priorities.priceBandLow')).toBeLessThanOrEqual(getPath(sheet, 'priorities.priceBandHigh') as number);
        expect(getPath(sheet, 'military.withdrawBelowHealth')).toBeLessThan(getPath(sheet, 'military.healBelowHealth') as number);
        expect(getPath(sheet, 'war.tributeFloor')).toBeLessThan(getPath(sheet, 'war.sueFloor') as number);
        expect(getPath(sheet, 'war.sueFloor')).toBeLessThan(0);
        expect(getPath(sheet, 'war.acceptCeiling')).toBeGreaterThan(0);
        // Each mix keeps the parent's appetite.
        const sum = (bag: Record<string, number>): number => Object.values(bag).reduce((a, b) => a + b, 0);
        for (const path of ['military.mixDefend', 'military.mixCampaign']) {
          const mix = getPath(sheet, path) as Record<string, number>;
          const was = getPath(seatSheet(FILE, id), path) as Record<string, number>;
          expect({ id, path, kept: Math.abs(sum(mix) - sum(was)) < 0.01 }).toEqual({ id, path, kept: true });
        }
      }
    }
    expect(moved).toBeGreaterThan(30);
  });

  it('crosses over by block, personas travelling with their block', () => {
    const rng = makeRng(11);
    const a = mutate(FILE, BOUNDS, rng);
    const b = mutate(FILE, BOUNDS, rng);
    for (let index = 0; index < 20; index += 1) {
      const child = crossover(a, b, rng);
      assertWellFormed(child, `cross ${index}`);
      for (const block of Object.keys(child.base)) {
        const fromA = canonicalJson(child.base[block]) === canonicalJson(a.base[block]);
        const fromB = canonicalJson(child.base[block]) === canonicalJson(b.base[block]);
        expect({ block, whole: fromA || fromB }).toEqual({ block, whole: true });
        for (const id of Object.keys(child.personas)) {
          const source = fromA && !fromB ? a : fromB && !fromA ? b : null;
          if (source === null) continue;
          expect({ block, id, over: canonicalJson(child.personas[id]![block]) }).toEqual({
            block,
            id,
            over: canonicalJson(source.personas[id]![block]),
          });
        }
      }
    }
  });

  it('round-trips the file through the genome, byte for byte', () => {
    expect(canonicalJson(sheetOfGenome(FILE))).toBe(canonicalJson(aiSheet));
    // The file's own shape order too — the sheet a champion is written in is
    // the one a reader diffs against `data/ai.json`.
    expect(Object.keys(sheetOfGenome(FILE))).toEqual(Object.keys(aiSheet));
  });
});
