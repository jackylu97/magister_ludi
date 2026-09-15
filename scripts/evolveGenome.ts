/**
 * **The genome, the bounds and the operators** of the evolutionary tuner
 * (`docs/plans/bot-evolution.md` §1.1, §3.2) — pure over plain objects, so the
 * core suite can pin the operators (`test/sim/aiBounds.test.ts`) without a
 * child process or a game. `scripts/evolve.ts` is the harness around this.
 *
 * The genome is the file's shape, exactly
 * ---------------------------------------
 * `data/ai.json` is seventeen blocks plus two override sheets, `puppetProfile`
 * and `personas`. A genome keeps that shape whole: the base blocks, the
 * personas with **exactly today's keys** (an override may change value, never
 * gain or lose a leaf, so `aiPersona.test.ts`'s pins hold by construction and
 * `balanced` stays `{}`), and `puppetProfile` carried frozen — the puppet seam
 * folds the *file's* profile, not a seat's (§3.1's known gap).
 *
 * A seat plays a genome as persona P through the per-seat tuning door with the
 * whole merged sheet `merge(base, personas[P])`, no persona key written; the
 * merge here is `aiConfig.ts`'s `deepMerge` restated (objects key by key, arrays
 * and scalars replace, the base's key order kept) because the harness owns the
 * merge and `aiConfigFor` never sees the genome's persona tables.
 *
 * Bounds
 * ------
 * `data/ai.bounds.json` is one row per tunable leaf, keyed by path: `{min, max,
 * integer?}`; an age row (an array leaf) carries one row for the whole row. **A
 * numeric leaf without a row is frozen** — a new knob never enters the search
 * unannounced — which is how `driver.*`, `search.*`, `solvency.*`,
 * `puppetProfile`, the two meter floors (`-999` is "no floor") and
 * `wager.malicePenalty` (0 is "read the deck", a mode) stay out: by omission.
 * A persona override whose value lies *outside* its leaf's bounds is a
 * **sentinel** (999 "never declare", 60 "always sign"), not a point on the
 * scale: never mutated, never carried by a base delta.
 *
 * Mutation
 * --------
 * Gaussian per knob, σ = `sigmaShare × (max − min)`, each knob with probability
 * `pMutate`; integers rounded then clamped. An age row is mutated as **one
 * scalar on the whole row** (the grid search's `scale` — the curve's shape is a
 * design opinion) plus, at a lower probability, one band's jitter. A persona's
 * override moves **relative to the base**: a base leaf that moves by Δ carries
 * every in-range override of it by Δ, and the override is then mutated at the
 * same rate on its own. Each army mix (`military.mixDefend`, `mixCampaign`) is
 * renormalised to its own pre-mutation sum — four numbers summing to more are
 * simply hungrier, and hunger is `mixBonus`'s knob, not the mix's.
 *
 * Crossover
 * ---------
 * Uniform **by block**: a child takes each top-level block whole from one of two
 * parents, and every persona's override of that block travels with it. Never
 * across personas and never within a block — the knobs of a block were tuned
 * against each other (`strikeForce` read three times is the argument).
 *
 * Repair
 * ------
 * The knob-against-knob orderings §1.4 lists and nothing enforces are repaired
 * after mutation, in the merged sheet every seat reads: `priceBandLow ≤
 * priceBandHigh`, `withdrawBelowHealth < healBelowHealth`, `tributeFloor <
 * sueFloor < 0 < acceptCeiling`; and the persona pin that only the warmonger
 * has an appetite (`military.aggression > 0`). These paths are named here
 * because the plan names them as invariants; everything else is walked.
 */

import { type Rng, nextFloat, nextInt } from '../src/sim/rng';

export type Json = Record<string, unknown>;

export interface BoundsRow {
  min: number;
  max: number;
  integer?: boolean;
}

export type Bounds = Record<string, BoundsRow>;

export interface Genome {
  /** The seventeen blocks, in the file's order. */
  base: Json;
  /** Sparse overrides, exactly the file's keys. */
  personas: Record<string, Json>;
  /** Frozen; carried so the sheet written out is the file's whole shape. */
  puppetProfile: Json;
}

export interface MutationOptions {
  /** σ as a share of a leaf's range. */
  sigmaShare: number;
  /** Probability a leaf moves at all. */
  pMutate: number;
  /** Probability one band of an age row is jittered on its own. */
  pBand: number;
}

export const DEFAULT_MUTATION: MutationOptions = { sigmaShare: 0.1, pMutate: 0.15, pBand: 0.05 };

/** The one persona allowed an appetite, and the leaf that is the appetite. */
const HOSTILE_PERSONA = 'warmonger';
const AGGRESSION = 'military.aggression';
/** The army mixes by posture (E1a): each keeps its own sum. */
const MIXES = ['military.mixDefend', 'military.mixCampaign'] as const;

// --- plain-object helpers ------------------------------------------------------

export function isPlainObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** `aiConfig.ts`'s `deepMerge`, restated: objects merge, arrays and scalars replace. */
export function mergeSheets(base: unknown, override: unknown): unknown {
  if (override === undefined) return deepCopy(base);
  if (!isPlainObject(base) || !isPlainObject(override)) return deepCopy(override);
  const merged: Json = {};
  for (const key of Object.keys(base)) merged[key] = base[key];
  for (const key of Object.keys(override)) merged[key] = mergeSheets(base[key], override[key]);
  return merged;
}

export function getPath(node: unknown, path: string): unknown {
  let here: unknown = node;
  for (const key of path.split('.')) {
    if (!isPlainObject(here)) return undefined;
    here = here[key];
  }
  return here;
}

export function setPath(node: Json, path: string, value: unknown): void {
  const keys = path.split('.');
  let here: Json = node;
  for (const key of keys.slice(0, -1)) {
    const next = here[key];
    if (!isPlainObject(next)) {
      const made: Json = {};
      here[key] = made;
      here = made;
    } else {
      here = next;
    }
  }
  here[keys[keys.length - 1]!] = value;
}

/**
 * Every **numeric** leaf of an object — a number or an array of numbers — as a
 * dotted path, depth first in key order. A string array (`workers.improvements`)
 * is not a numeric leaf and never a knob here.
 */
export function numericLeafPaths(node: unknown, prefix = ''): string[] {
  const found: string[] = [];
  if (!isPlainObject(node)) return found;
  for (const key of Object.keys(node)) {
    const value = node[key];
    const here = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'number') found.push(here);
    else if (Array.isArray(value)) {
      if (value.every((entry) => typeof entry === 'number')) found.push(here);
    } else if (isPlainObject(value)) found.push(...numericLeafPaths(value, here));
  }
  return found;
}

/** Every leaf path of any kind — the shape test `aiPersona.test.ts` runs. */
export function allLeafPaths(node: unknown, prefix = ''): string[] {
  if (!isPlainObject(node)) return [prefix];
  const found: string[] = [];
  for (const key of Object.keys(node)) {
    found.push(...allLeafPaths(node[key], prefix === '' ? key : `${prefix}.${key}`));
  }
  return found;
}

// --- the genome ----------------------------------------------------------------

/** Splits `data/ai.json`'s shape into a genome. */
export function genomeOfSheet(sheet: Json): Genome {
  const base: Json = {};
  for (const key of Object.keys(sheet)) {
    if (key === 'personas' || key === 'puppetProfile') continue;
    base[key] = deepCopy(sheet[key]);
  }
  return {
    base,
    personas: deepCopy((sheet.personas ?? {}) as Record<string, Json>),
    puppetProfile: deepCopy((sheet.puppetProfile ?? {}) as Json),
  };
}

/** The genome back in the file's shape: the blocks, then `puppetProfile`, then `personas`. */
export function sheetOfGenome(genome: Genome): Json {
  const sheet: Json = {};
  for (const key of Object.keys(genome.base)) sheet[key] = deepCopy(genome.base[key]);
  sheet.puppetProfile = deepCopy(genome.puppetProfile);
  sheet.personas = deepCopy(genome.personas);
  return sheet;
}

/** The whole sheet one seat reads when it plays `genome` as `persona`. */
export function seatSheet(genome: Genome, persona: string): Json {
  return mergeSheets(genome.base, genome.personas[persona] ?? {}) as Json;
}

/** JSON with every object's keys sorted — one text for one genome, whatever built it. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** FNV-1a of the canonical sheet, eight hex digits: a genome's name. */
export function genomeId(genome: Genome): string {
  const text = canonicalJson(sheetOfGenome(genome));
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// --- the operators -------------------------------------------------------------

/** A standard normal by Box–Muller off the sim's own generator. */
export function gaussian(rng: Rng): number {
  const u = 1 - nextFloat(rng);
  const v = nextFloat(rng);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value: number, row: BoundsRow): number {
  const held = Math.min(row.max, Math.max(row.min, value));
  return row.integer === true ? Math.round(held) : Math.round(held * 1000) / 1000;
}

/** A tenth, the grid search's print for an age row. */
function tenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function within(value: number, row: BoundsRow): boolean {
  return value >= row.min && value <= row.max;
}

/**
 * Whether an override at `path` is a sentinel — a number the scale has no point
 * for. `999` and `60` are the two today; the rule is the bounds, not the numbers.
 */
export function isSentinel(value: unknown, row: BoundsRow | undefined): boolean {
  if (row === undefined) return true;
  if (typeof value === 'number') return !within(value, row);
  if (Array.isArray(value)) return !value.every((entry) => typeof entry === 'number' && within(entry, row));
  return true;
}

/**
 * One child by mutation. The parent is never touched.
 *
 * Walks every tunable leaf of the base (a row in `bounds`), then every persona's
 * in-range override of a tunable leaf; the order is the file's, so a seeded run
 * is a run.
 */
export function mutate(
  parent: Genome,
  bounds: Bounds,
  rng: Rng,
  options: MutationOptions = DEFAULT_MUTATION,
): Genome {
  const child = deepCopy(parent);
  const personaIds = Object.keys(child.personas);

  for (const path of numericLeafPaths(child.base)) {
    const row = bounds[path];
    if (row === undefined) continue;
    const held = getPath(child.base, path);

    if (typeof held === 'number') {
      if (nextFloat(rng) >= options.pMutate) continue;
      const moved = clamp(held + gaussian(rng) * options.sigmaShare * (row.max - row.min), row);
      const delta = moved - held;
      setPath(child.base, path, moved);
      // The base carries its personas with it: an in-range override keeps its
      // distance from the base rather than its absolute figure.
      for (const id of personaIds) {
        const over = getPath(child.personas[id], path);
        if (typeof over !== 'number' || isSentinel(over, row)) continue;
        setPath(child.personas[id]!, path, clamp(over + delta, row));
      }
    } else if (Array.isArray(held)) {
      const factor = nextFloat(rng) < options.pMutate ? 1 + gaussian(rng) * options.sigmaShare : 1;
      const band = nextFloat(rng) < options.pBand ? nextInt(rng, 0, held.length) : -1;
      const jitter = band >= 0 ? gaussian(rng) * options.sigmaShare * (row.max - row.min) : 0;
      if (factor === 1 && band < 0) continue;
      const scaled = (held as number[]).map((point, index) =>
        clamp(tenth(point * factor + (index === band ? jitter : 0)), row),
      );
      setPath(child.base, path, scaled);
      for (const id of personaIds) {
        const over = getPath(child.personas[id], path);
        if (!Array.isArray(over) || isSentinel(over, row)) continue;
        setPath(
          child.personas[id]!,
          path,
          (over as number[]).map((point, index) =>
            clamp(tenth(point * factor + (index === band ? jitter : 0)), row),
          ),
        );
      }
    }
  }

  // The personas' own moves, at the same rate, on the leaves they override.
  for (const id of personaIds) {
    const sheet = child.personas[id]!;
    for (const path of numericLeafPaths(sheet)) {
      const row = bounds[path];
      if (row === undefined) continue;
      const over = getPath(sheet, path);
      if (isSentinel(over, row)) continue;
      if (nextFloat(rng) >= options.pMutate) continue;
      if (typeof over === 'number') {
        setPath(sheet, path, clamp(over + gaussian(rng) * options.sigmaShare * (row.max - row.min), row));
      } else if (Array.isArray(over)) {
        const factor = 1 + gaussian(rng) * options.sigmaShare;
        setPath(
          sheet,
          path,
          (over as number[]).map((point) => clamp(tenth(point * factor), row)),
        );
      }
    }
  }

  repair(child, parent, bounds);
  return child;
}

/**
 * One child by block-wise uniform crossover of two parents, personas travelling
 * with their block. `puppetProfile` is frozen and comes from `a`.
 */
export function crossover(a: Genome, b: Genome, rng: Rng): Genome {
  const child: Genome = { base: {}, personas: {}, puppetProfile: deepCopy(a.puppetProfile) };
  const blocks = Object.keys(a.base);
  const personaIds = Object.keys(a.personas);
  for (const id of personaIds) child.personas[id] = {};
  for (const block of blocks) {
    const from = nextFloat(rng) < 0.5 ? a : b;
    child.base[block] = deepCopy(from.base[block]);
    for (const id of personaIds) {
      const over = from.personas[id]?.[block];
      if (over !== undefined) child.personas[id]![block] = deepCopy(over);
    }
  }
  return child;
}

/**
 * The orderings and the pin, restored after a mutation — on the base, then on
 * every persona's override as the merged sheet would read it. `military.mix`
 * is renormalised to the parent's sum.
 */
export function repair(child: Genome, parent: Genome, bounds: Bounds): void {
  const orderings: readonly [string, string][] = [
    ['priorities.priceBandLow', 'priorities.priceBandHigh'],
    ['military.withdrawBelowHealth', 'military.healBelowHealth'],
    ['war.tributeFloor', 'war.sueFloor'],
  ];

  const order = (sheet: Json, own: Json, low: string, high: string): void => {
    const a = getPath(sheet, low);
    const b = getPath(sheet, high);
    if (typeof a !== 'number' || typeof b !== 'number' || a < b) return;
    // The persona's own leaf yields; a base violation has both.
    if (typeof getPath(own, low) === 'number') setPath(own, low, b - Math.max(0.001, Math.abs(b) * 0.05));
    else if (typeof getPath(own, high) === 'number') setPath(own, high, a + Math.max(0.001, Math.abs(a) * 0.05));
  };

  for (const [low, high] of orderings) order(child.base, child.base, low, high);
  for (const id of Object.keys(child.personas)) {
    const own = child.personas[id]!;
    for (const [low, high] of orderings) order(seatSheet(child, id), own, low, high);
  }

  // Each mix keeps its appetite: four numbers summing to what the parent's did —
  // **inside every band's row**. A plain rescale can push a band back over its
  // bound (0.6 × 1.25 is 0.75), so a band that would leave its row is pinned
  // there and the remainder is spread over the free bands, until nothing new
  // pins. The sum is exact whenever the rows admit it, which they do here.
  const renormalise = (target: Json, source: Json): void => {
    for (const path of MIXES) {
      const mix = getPath(target, path);
      const was = getPath(source, path);
      if (!isPlainObject(mix) || !isPlainObject(was)) continue;
      const keys = Object.keys(mix).filter((key) => typeof mix[key] === 'number');
      const wanted = keys.reduce((total, key) => total + (typeof was[key] === 'number' ? (was[key] as number) : 0), 0);
      if (wanted <= 0) continue;
      const pinned = new Set<string>();
      for (let pass = 0; pass < keys.length; pass += 1) {
        const free = keys.filter((key) => !pinned.has(key));
        const held = keys.filter((key) => pinned.has(key)).reduce((total, key) => total + (mix[key] as number), 0);
        const sum = free.reduce((total, key) => total + (mix[key] as number), 0);
        if (free.length === 0 || sum <= 0) break;
        const factor = (wanted - held) / sum;
        let newlyPinned = false;
        for (const key of free) {
          const row = bounds[`${path}.${key}`];
          const scaled = (mix[key] as number) * factor;
          if (row !== undefined && (scaled < row.min || scaled > row.max)) {
            mix[key] = clamp(scaled, row);
            pinned.add(key);
            newlyPinned = true;
          }
        }
        if (!newlyPinned) {
          for (const key of free) mix[key] = Math.round((mix[key] as number) * factor * 1000) / 1000;
          break;
        }
      }
    }
  };
  renormalise(child.base, parent.base);
  for (const id of Object.keys(child.personas)) {
    const own = child.personas[id]!;
    const was = parent.personas[id];
    if (was !== undefined) renormalise(own, was);
  }

  // The pin: only the warmonger has an appetite.
  if (bounds[AGGRESSION] !== undefined) {
    if (typeof getPath(child.base, AGGRESSION) === 'number') setPath(child.base, AGGRESSION, 0);
    for (const id of Object.keys(child.personas)) {
      if (id === HOSTILE_PERSONA) continue;
      if (typeof getPath(child.personas[id], AGGRESSION) === 'number') setPath(child.personas[id]!, AGGRESSION, 0);
    }
  }
}

/**
 * The two invariants checked before a child is played, as problems (empty is
 * well-formed): every persona's paths ⊂ the base's, and only the warmonger's
 * merged `military.aggression` is above nought.
 */
export function genomeProblems(genome: Genome): string[] {
  const problems: string[] = [];
  const basePaths = new Set(allLeafPaths(genome.base));
  for (const id of Object.keys(genome.personas)) {
    for (const path of allLeafPaths(genome.personas[id])) {
      if (path === '') continue;
      if (!basePaths.has(path)) problems.push(`${id} overrides ${path}, which the base has no leaf for`);
    }
    const merged = getPath(seatSheet(genome, id), AGGRESSION);
    if (typeof merged === 'number' && merged > 0 && id !== HOSTILE_PERSONA) {
      problems.push(`${id} has an appetite (${AGGRESSION} ${merged}); only the ${HOSTILE_PERSONA} may`);
    }
  }
  return problems;
}

/**
 * The tunable leaves' values, one line each, where two genomes differ — the
 * knob print of `knobs.ts`'s `describeEdit` (`weights.food 9.8, 8.4, 7, 5.6 → …`),
 * with a persona's line prefixed by its id.
 */
export function describeDiff(from: Genome, to: Genome): string[] {
  const lines: string[] = [];
  const print = (value: unknown): string => (Array.isArray(value) ? value.join(', ') : String(value));
  const same = (a: unknown, b: unknown): boolean => canonicalJson(a) === canonicalJson(b);
  for (const path of numericLeafPaths(to.base)) {
    const a = getPath(from.base, path);
    const b = getPath(to.base, path);
    if (!same(a, b)) lines.push(`${path} ${print(a)} → ${print(b)}`);
  }
  for (const id of Object.keys(to.personas)) {
    for (const path of numericLeafPaths(to.personas[id])) {
      const a = getPath(from.personas[id], path);
      const b = getPath(to.personas[id], path);
      if (!same(a, b)) lines.push(`${id}: ${path} ${print(a)} → ${print(b)}`);
    }
  }
  return lines;
}

/**
 * The sparse override that turns `from` into `to` — the shape the arena's sheet
 * loader takes (`sheetOfEdits`). Base leaves only; the personas are printed by
 * `describeDiff` beside it.
 */
export function sparseDiff(from: Genome, to: Genome): Json {
  const sheet: Json = {};
  for (const path of numericLeafPaths(to.base)) {
    const a = getPath(from.base, path);
    const b = getPath(to.base, path);
    if (canonicalJson(a) !== canonicalJson(b)) setPath(sheet, path, deepCopy(b));
  }
  return sheet;
}
