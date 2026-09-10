/**
 * The leaders, and the only thing a leader is allowed to be today: a **start
 * bias**.
 *
 * `docs/leaders.md` is the casting call — six figures, three decks each, a
 * passive and a boon and a unique per age — and none of that is built. What is
 * built is the one half of a leader that the *map generator* can honour, ruled
 * in `docs/flags.md` (cccc) as **three stages**, each riding a pass that already
 * exists:
 *
 *   1. the ground a seat is given (`startBias.terrain` and `startBias.wants`,
 *      read by `startPositions.ts` — a soft score and, over it, a hard want with
 *      a fallback);
 *   2. what grows near it (`startBias.resources` and `startBias.luxuries`, read
 *      by the scatter and by the continent's deal in `resources.ts`);
 *   3. what the fairness pass furnishes it with (`startBias.furnish`, read by
 *      `ensureStartFurnishing`) — an improvement kind, or one row by name where
 *      the figure's need is that row.
 *
 * A row is data and nothing else. The weights, the multipliers and the kinds all
 * live in `data/leaders.json`; the three stages hold algorithms and no numbers,
 * which is the same division `mapgen.json` and `mapgen.ts` keep.
 *
 * **A leaf.** Nothing here imports a pass, so the two modules that read a bias —
 * `startPositions.ts` and `resources.ts`, which already import each other's
 * neighbourhood — can both name it without closing a load-time cycle. The
 * validation below runs at module load, so a mistyped terrain or an unknown
 * resource is a boot error rather than a weight that silently never fires.
 */

import leadersJson from '../../data/leaders.json';

import { type ImprovementId, improvementForResource } from './improvementData';
import { RESOURCE_IDS, type ResourceId, resourceDef } from './resourceData';
import { FEATURE_IDS, TERRAIN_IDS, type TerrainId } from './terrainData';

/**
 * What a terrain weight may name: a terrain, a feature, or one of the two facts
 * a hex carries beside them.
 *
 * A closed vocabulary rather than a free string, for `HillsWaiver`'s reason: a
 * typo in the sheet is a load error and not a line that quietly never scores.
 * `hills` and `river` are here because neither is a terrain — a hill is a flag
 * on a grassland and a river is a set of edges — and both are exactly what a
 * leader's ground is described in.
 */
export type StartBiasKey = TerrainId | 'forest' | 'jungle' | 'oasis' | 'floodplain' | 'hills' | 'river';

/** Every key a `terrain` block may use, in the order the lines are printed. */
export const START_BIAS_KEYS: readonly StartBiasKey[] = [
  ...TERRAIN_IDS,
  ...(FEATURE_IDS.filter((id) => id !== 'none') as StartBiasKey[]),
  'hills',
  'river',
];

/**
 * One leader's pull on the world it starts in. Every field optional: a leader
 * with no bias at all is a legal row, and it is exactly what an unbiased seat
 * scores.
 */
export interface StartBias {
  /**
   * Weight per matching hex in the site and its scored rings, keyed by ground.
   *
   * Negative is lawful and means *away from* — Modu's steppe reads "grassland
   * and plains, away from hills" and says so with a minus rather than with a
   * second field.
   */
  terrain?: Partial<Record<StartBiasKey, number>>;
  /**
   * Multipliers on the scatter's **tile** draw, within
   * `resources.startBiasRadius` of this leader's own start. A bonus or
   * strategic row; a luxury is dealt rather than scattered and belongs below.
   */
  resources?: Partial<Record<ResourceId, number>>;
  /**
   * Multipliers on the **continent's hand**: a continent seating this leader
   * draws these kinds more heavily. The cap and the hostability filter are
   * untouched — see `dealContinentLuxuries`.
   */
  luxuries?: Partial<Record<ResourceId, number>>;
  /**
   * What this leader's start is furnished with: one suitable resource per
   * entry, within `resources.startFurnishRadius`.
   *
   * An entry is an **improvement kind** — "plantations and camps", which is what
   * Mithridates' own text pays on, and which wine or which deer is the ground's
   * business — **or a resource row** by name, for the figure whose need is that
   * row and no sibling of it. Modu's steppe is the case: `pasture` would furnish
   * the first pastured row the table lists, and cattle are not horses.
   */
  furnish?: FurnishEntry[];
  /**
   * The ground this figure will not do without, if the map has any going.
   *
   * A **hard want with a fallback**, and both halves are the design (M1b). The
   * soft score measured out: a capped weight moves the odds a few points and
   * cannot deliver a need — Pachacuti found a mountain within two hexes on a
   * fifth of seeds biased or not, because a mountain is worth the same handful
   * of points wherever it is and the ceiling would not let it be worth more.
   * A want is asked as a *filter over the sites the chooser already stands
   * behind*: the seat takes its best-scoring accepted site that meets every
   * want, and where the map offers none it takes the soft-scored best instead.
   *
   * So it is **never a rejection** — no map is refused, no seat goes unseated,
   * and every sweep that proves a roster seats legally still holds — and it is
   * never a guarantee either. The figure asks; the ground answers.
   */
  wants?: StartWants;
}

/** An improvement kind, or one resource row by name. See `StartBias.furnish`. */
export type FurnishEntry = ImprovementId | ResourceId;

/**
 * The wants vocabulary: what may be asked for, and how far away it may be.
 *
 * A closed set of keys, each a **radius** — "a mountain within two hexes" — for
 * `START_BIAS_KEYS`' reason: a typo is a load error rather than a need that
 * silently never fires. Each asks for *one* such hex in reach, the site's own
 * included; a figure that needs a whole neighbourhood of something states that
 * with a terrain weight, which is what weights are for.
 */
export interface StartWants {
  /** A mountain in reach — the terraces' own ground. */
  mountainWithin?: number;
  /** A river hex in reach. */
  riverWithin?: number;
  /** A river hex **or** a floodplain — the valley, either way it was made. */
  riverOrFloodplainWithin?: number;
  /** Grassland in reach. */
  grasslandWithin?: number;
  /** A hex a pasture could ever stand on: flat grassland or plains. */
  pastureGroundWithin?: number;
}

/** Every want key, in the order they are asked and printed. */
export const START_WANT_KEYS: readonly (keyof StartWants)[] = [
  'mountainWithin',
  'riverWithin',
  'riverOrFloodplainWithin',
  'grasslandWithin',
  'pastureGroundWithin',
];

/**
 * How many wants a seat carries — the key to the seating order.
 *
 * The seats with the most needs choose first (`chooseStartPositionsFor`), so a
 * figure with two hard wants is not left picking over what four flexible seats
 * have already taken. A count rather than a weighting because the question is
 * "how constrained is this chair", and a chair with two needs is more
 * constrained than a chair with one however the needs are phrased.
 */
export function wantCount(bias: StartBias | undefined): number {
  const wants = bias?.wants;
  if (!wants) return 0;
  return START_WANT_KEYS.filter((key) => wants[key] !== undefined).length;
}

/**
 * Does this furnishing entry name this resource row?
 *
 * The one rule, read by the pass that plants (`ensureStartFurnishing`), the
 * report that prints what is standing there, and the tests. Improvement kinds
 * and resource ids share no name, so one string decides it.
 */
export function furnishMatches(entry: FurnishEntry, id: ResourceId): boolean {
  return entry === id || improvementForResource(id) === entry;
}

export interface LeaderDef {
  /** The figure's name, as every surface prints it. */
  name: string;
  startBias: StartBias;
}

interface LeaderTable {
  leaders: Record<string, LeaderDef>;
}

const LEADER_DATA = leadersJson as unknown as LeaderTable;

/**
 * Every figure the sheet names — read off the JSON's keys, exactly as
 * `ResourceId` is, so a seventh leader is a new member of this type with no
 * edit here.
 */
export type LeaderId = keyof typeof leadersJson.leaders & string;

/** Every leader id, in sheet order. The roster's own order. */
export const LEADER_IDS: readonly LeaderId[] = Object.keys(LEADER_DATA.leaders) as LeaderId[];

export function isLeaderId(value: unknown): value is LeaderId {
  return typeof value === 'string' && value in LEADER_DATA.leaders;
}

export function leaderDef(id: LeaderId): LeaderDef {
  const def = LEADER_DATA.leaders[id];
  if (!def) throw new Error(`Unknown leader "${id}"`);
  return def;
}

/** The bias a seat carries, or `undefined` when it sits under no figure at all. */
export function startBiasOf(leader: LeaderId | undefined): StartBias | undefined {
  return leader === undefined ? undefined : leaderDef(leader).startBias;
}

/** Does this bias ask the world for anything? An empty one is not a bias. */
export function biasIsEmpty(bias: StartBias | undefined): boolean {
  if (!bias) return true;
  return (
    Object.keys(bias.terrain ?? {}).length === 0 &&
    Object.keys(bias.resources ?? {}).length === 0 &&
    Object.keys(bias.luxuries ?? {}).length === 0 &&
    (bias.furnish ?? []).length === 0 &&
    wantCount(bias) === 0
  );
}

// --- the load validator -------------------------------------------------------
// At module load, so a sheet that names a terrain nobody has heard of is a boot
// error. A weight that silently never fires is the failure mode this whole file
// exists to prevent: a designer would read the row and believe it.
for (const id of LEADER_IDS) {
  const def = LEADER_DATA.leaders[id]!;
  const where = `leaders.json: ${id}`;
  if (typeof def.name !== 'string' || def.name.length === 0) {
    throw new Error(`${where} has no name`);
  }
  const bias = def.startBias ?? {};
  for (const key of Object.keys(bias.terrain ?? {})) {
    if (!START_BIAS_KEYS.includes(key as StartBiasKey)) {
      throw new Error(`${where} weights unknown ground "${key}"`);
    }
  }
  for (const key of Object.keys(bias.resources ?? {})) {
    if (!RESOURCE_IDS.includes(key as ResourceId)) {
      throw new Error(`${where} names unknown resource "${key}"`);
    }
    if (resourceDef(key as ResourceId).kind === 'luxury') {
      // A luxury is *dealt* per continent and never scattered on its own, so a
      // multiplier here would be a number nothing reads. It belongs in
      // `luxuries`, which is the deal's own dial.
      throw new Error(`${where} biases the luxury "${key}" in resources`);
    }
  }
  for (const key of Object.keys(bias.luxuries ?? {})) {
    if (!RESOURCE_IDS.includes(key as ResourceId)) {
      throw new Error(`${where} names unknown luxury "${key}"`);
    }
    if (resourceDef(key as ResourceId).kind !== 'luxury') {
      throw new Error(`${where} biases the non-luxury "${key}" in luxuries`);
    }
  }
  for (const entry of bias.furnish ?? []) {
    // Asked of the table rather than of a list of names here: an entry is worth
    // furnishing only if some row answers to it — a kind that opens one, or a
    // row by its own name — and that mapping is `improvements.json`'s.
    const opens = RESOURCE_IDS.some((resource) => furnishMatches(entry, resource));
    if (!opens) throw new Error(`${where} furnishes "${entry}", which names no resource`);
  }
  for (const key of Object.keys(bias.wants ?? {})) {
    if (!START_WANT_KEYS.includes(key as keyof StartWants)) {
      throw new Error(`${where} wants unknown ground "${key}"`);
    }
    const within = (bias.wants as Record<string, unknown>)[key];
    if (typeof within !== 'number' || !Number.isFinite(within) || within < 0) {
      throw new Error(`${where} wants "${key}" at no honest distance`);
    }
  }
}
