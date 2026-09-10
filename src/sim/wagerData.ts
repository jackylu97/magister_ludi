/**
 * Typed access to `data/wagers.json` — **the deck the age deals** (`docs/wager.md`
 * §3/§3b, batch G2).
 *
 * A wager is a **bar, not a race** (§3): three cards are dealt to the whole world
 * when an age opens, every seat stakes one of them in secret, and anybody who
 * clears a bar clears it. What makes the deck worth a file of its own is the same
 * bargain every other table in this game keeps — **a new wager is a JSON row**:
 * the row names a reading, the reading is one member of a small closed union, and
 * the one `switch` over that union lives in `wagers.ts` and nowhere else.
 *
 * The reading vocabulary
 * ----------------------
 * `WagerCount` is the whole of what a card may ask, and every member is a fold
 * the simulation already prints somewhere: the Ledger's own classes
 * (`ledgerFold.ts` — what your buildings pay, what your caravans pay, what your
 * great people pay), the empire's reading (`readings.ts`), the two meters
 * (`meters.ts`), and a handful of plain counts of the board. That is §3's rule
 * stated as a type: *only readings the Ledger already prints*, so a card cannot
 * promise a number the game has no way to answer.
 *
 * A row wanting a reading that does **not** exist yet is **deferred and
 * annotated** rather than bent into a near-fit — the discipline the cards, the
 * beliefs and the Triumphs all keep. Two rows are deferred in this first cut and
 * both say why on their own face: The Harvest wants the food a *farm* pays told
 * apart from the food the ground pays, and The Arsenal wants the hammers a town
 * put behind a *soldier* told apart from its other work. Neither line exists in
 * `docs/yields.md`'s sequence today; both rows keep their bodies so the day it
 * does, shipping them is deleting a `deferred`.
 *
 * Flow and standing, and why the difference is one subtraction
 * -----------------------------------------------------------
 * §3's "this age" counts: a **flow** ("everything your caravans paid this age")
 * counts from the deal, a **standing** ("twelve citizens in one town") reads the
 * board now. Both are the *same* reading function — every flow member answers a
 * **lifetime** figure that only ever rises — and the deal writes down what each
 * seat's figure was when it was dealt (`WagerDeal.opening`). A flow's standing is
 * then `now − opening`, which is the `TimedEffect` discipline one system over:
 * an absolute stamp and a comparison, never a counter somebody has to remember to
 * reset at the age's close.
 *
 * A **clause** row is the compound wager (§3's "every clause at once"): its
 * reading is *how many of its clauses hold on this very turn* and its bar is the
 * clause count, so a compound card ranks and draws a track exactly like a plain
 * one — "2 of 3" is a figure a player can read off a rival's row, where three
 * separate figures on one card would not be.
 */

import wagersJson from '../../data/wagers.json';

import { type BeadFamily, isBeadFamily } from './beadData';
import type { CardLine } from './statecraftData';

/**
 * The thread a wager is dealt under — the Orders' own theme lines
 * (`docs/orders-and-doctrines.md` §Themes), plus **the Banner**.
 *
 * `CardLine` is a closed union in the simulation and gaining a member costs a
 * drawn mark, an ink and a row in the flair gallery (CLAUDE.md's rule for a new
 * visual asset), which is a pass of its own. The Banner is a thread the wager
 * deck needs on the day it ships and the Orders have not claimed yet, so it is
 * declared here as the one addition and the sheet falls back to the Forge Levy's
 * mark for it. The day `CardLine` adopts it this alias collapses to nothing.
 */
export type WagerLine = CardLine | 'banner';

/** Every wager the deck holds, in file order. */
export type WagerId = keyof typeof wagersJson.wagers & string;

/** Flow counts from the deal; standing reads the board now. See the docblock. */
export type WagerKind = 'flow' | 'standing';

/**
 * **The one reading vocabulary.** Every member is answered by exactly one arm of
 * `wagerCount` (`wagers.ts`) and by nothing else in the game.
 *
 * The members marked *(lifetime)* only ever rise and are the ones a `flow` row
 * may name; the rest read the board as it stands. Nothing enforces the pairing —
 * a standing row naming a lifetime reading would simply ask for the lifetime
 * figure, which is a sentence, just not a useful one — so `wagerDataProblems`
 * says so instead.
 */
export type WagerCount =
  /** Citizens in the seat of government. */
  | 'capitalCitizens'
  /** Buildings standing in the seat of government, wonders among them. */
  | 'capitalBuildings'
  /** Wonders standing in the seat of government. */
  | 'capitalWonders'
  /** Towns held. */
  | 'cities'
  /** Combat strength of every piece in the field. */
  | 'armyStrength'
  /** Gold in the treasury. */
  | 'treasury'
  /** Food to spare across the realm in one turn — the growth channel, summed. */
  | 'foodSurplus'
  /** Learning in one turn, divided by the citizens who make it. */
  | 'sciencePerCitizen'
  /** Wonders of the age the world is in, standing in this realm's towns. */
  | 'wondersOfThisAge'
  /** The contentment meter as it stands. */
  | 'happiness'
  /** The authority meter as it stands. */
  | 'authority'
  /** Everything the realm's buildings pay in one turn (the Ledger's class). */
  | 'buildingYields'
  /** Towns taken by force since the deal and still held. */
  | 'capturedThisAge'
  /** *Deferred.* Food paid by farms in one turn. See the module docblock. */
  | 'farmFood'
  /** *(lifetime)* Everything the seat of government's land has paid. */
  | 'capitalTileYields'
  /** *(lifetime)* Everything trade has paid — the Ledger's trade class. */
  | 'tradeYields'
  /** *(lifetime)* Everything religion has paid — the Ledger's religion class. */
  | 'religionYields'
  /** *(lifetime)* Everything great people have paid — the Ledger's people class. */
  | 'peopleYields'
  /** *(lifetime)* Everything wonders have paid — the Ledger's wonders class. */
  | 'wonderYields'
  /** *(lifetime)* Everything the slotted cards have paid — the Ledger's deck class. */
  | 'deckYields'
  /** *(lifetime)* Gold paid by city connections. */
  | 'connectionGold'
  /** *(lifetime)* Learning made. */
  | 'science'
  /** *(lifetime)* Culture made. */
  | 'culture'
  /** *(lifetime)* The treasury's net take. */
  | 'gold'
  /** *(lifetime)* Renown earned, whether or not it was spent. */
  | 'renown'
  /** *(lifetime)* The six voices summed, every turn. */
  | 'allVoices'
  /** *(lifetime)* Contentment to spare, counted every turn. */
  | 'happinessSurplus'
  /** *Deferred.* *(lifetime)* Hammers put behind soldiers. */
  | 'unitHammers'
  /** *(lifetime)* Rivals' soldiers killed, less this realm's own lost. */
  | 'killsMinusLosses';

/** Every reading, in declaration order. The register the arms are pinned by. */
export const WAGER_COUNTS: readonly WagerCount[] = [
  'capitalCitizens',
  'capitalBuildings',
  'capitalWonders',
  'cities',
  'armyStrength',
  'treasury',
  'foodSurplus',
  'sciencePerCitizen',
  'wondersOfThisAge',
  'happiness',
  'authority',
  'buildingYields',
  'capturedThisAge',
  'farmFood',
  'capitalTileYields',
  'tradeYields',
  'religionYields',
  'peopleYields',
  'wonderYields',
  'deckYields',
  'connectionGold',
  'science',
  'culture',
  'gold',
  'renown',
  'allVoices',
  'happinessSurplus',
  'unitHammers',
  'killsMinusLosses',
];

/**
 * The readings that are **kept**, turn by turn, rather than read off the board.
 *
 * `Player.wagerTotals` is a bag of these and nothing else: each is raised once a
 * turn in the `wagers` phase by whatever that turn's reading was, so the bag is a
 * set of lifetime totals a deal can stamp and a flow can subtract from. The two
 * lifetime readings **not** here are the ones a *seam* already keeps —
 * `Player.renownEarned` is raised where renown is granted and the kill ledger
 * where a piece falls — because a figure a verb can write exactly is better than
 * the same figure sampled once a turn.
 *
 * Order is the register: the phase walks this array, never the object's keys
 * (hard rule 2).
 */
export const WAGER_ACCUMULATORS: readonly WagerCount[] = [
  'capitalTileYields',
  'tradeYields',
  'religionYields',
  'peopleYields',
  'wonderYields',
  'deckYields',
  'connectionGold',
  'science',
  'culture',
  'gold',
  'allVoices',
  'happinessSurplus',
];

/** One clause of a compound wager: a reading and the figure it must reach. */
export interface WagerClause {
  count: WagerCount;
  /** One figure per wagering age — Æra II, III, IV. */
  bars: readonly number[];
}

/** What a card reads. One number, or how many of several clauses hold at once. */
export type WagerReads =
  | { shape: 'count'; count: WagerCount }
  | { shape: 'clauses'; clauses: readonly WagerClause[] };

export interface WagerDef {
  name: string;
  /**
   * Which rod the beads it mints land on.
   *
   * **Every card names one**, which is the one place this table departs from the
   * worksheet: §3b left The Six Voices unfamilied, and a bead has to land
   * somewhere. Keeping it family-less would have meant a fifth rod for one card.
   */
  family: BeadFamily;
  /** The thread it is dealt under. The deal guarantees three different ones. */
  line: WagerLine;
  kind: WagerKind;
  reads: WagerReads;
  /** One figure per wagering age. Absent on a clause row — its bar is the count. */
  bars?: readonly number[];
  /** The first age this card may be dealt in, when it is not every age. */
  fromAge?: number;
  /** Why this row cannot be read in this build. Never dealt while it is set. */
  deferred?: readonly string[];
  /**
   * What it asks, in a first-time player's words — **the reading, the span, and
   * nothing else** (the user's ruling of 2026-09-09; hard rule 7).
   *
   * The thing counted leads, then the window it is counted in: one turn, added
   * up over the age, or held at once. No flavour, no metaphor, no identifier and
   * no figure — the bar prints beside the note on every surface that shows one,
   * so a note that restated it would go stale the turn the row is retuned. There
   * is deliberately no `flavor` or `epigram` field beside this one: the test of a
   * note is that a player who has never seen the card knows what to do from it,
   * and a second string is where the flavour that had to be cut comes back.
   * `test/sim/wagers.test.ts` pins all of that; `docs/wager.md`'s table carries
   * the same string and is sync-tested against it.
   */
  note: string;
}

interface WagerRules {
  /** How many cards a deal turns face up. */
  dealt: number;
  /** Beads for keeping the card you staked. */
  stakeBeads: number;
  /** Beads for clearing one of the other two. */
  otherBeads: number;
}

const TABLE = wagersJson as unknown as {
  rules: WagerRules;
  wagers: Record<WagerId, WagerDef>;
};

export const WAGER_RULES: WagerRules = TABLE.rules;

/** Every wager id, in file order — the order every draw and every sweep walks. */
export const WAGER_IDS: readonly WagerId[] = Object.keys(TABLE.wagers) as WagerId[];

export function isWagerId(value: unknown): value is WagerId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TABLE.wagers, value);
}

export function wagerDef(id: WagerId): WagerDef {
  const def = TABLE.wagers[id];
  if (!def) throw new Error(`Unknown wager "${String(id)}"`);
  return def;
}

/**
 * The ages a wager may be dealt in — Æra II, III and IV (`docs/wager.md` §2).
 *
 * Æra I deals nothing (the opening is for learning the board) and Æra V will
 * deal nothing when it lands (the Opus is its whole business). The list is the
 * *index* into every row's `bars` array as well as the calendar, which is why it
 * is one constant rather than two.
 */
export const WAGER_AGES: readonly number[] = [2, 3, 4];

/** Which slot of a `bars` array this age reads, or `-1` for an age with no wager. */
export function wagerAgeIndex(age: number): number {
  return WAGER_AGES.indexOf(age);
}

/** Is this a row the deck may deal at all? Deferred rows are kept and never dealt. */
export function wagerIsLive(id: WagerId): boolean {
  const def = wagerDef(id);
  return def.deferred === undefined || def.deferred.length === 0;
}

/**
 * The bar this card asks at this age — for a clause row, how many clauses must
 * hold, which is all of them.
 *
 * One reading for both shapes, so nothing that draws a track has to know which
 * kind of card it is looking at.
 */
export function wagerBar(id: WagerId, age: number): number {
  const def = wagerDef(id);
  if (def.reads.shape === 'clauses') return def.reads.clauses.length;
  const at = wagerAgeIndex(age);
  return at < 0 ? 0 : (def.bars?.[at] ?? 0);
}

/** May this card be dealt in this age? `fromAge` is the one gate. */
export function wagerDealtInAge(id: WagerId, age: number): boolean {
  if (!wagerIsLive(id)) return false;
  if (wagerAgeIndex(age) < 0) return false;
  const def = wagerDef(id);
  if (def.fromAge !== undefined && age < def.fromAge) return false;
  return wagerBar(id, age) > 0;
}

/** Every line that carries at least one card dealable in this age, in file order. */
export function wagerLinesOfAge(age: number): WagerLine[] {
  const lines: WagerLine[] = [];
  for (const id of WAGER_IDS) {
    if (!wagerDealtInAge(id, age)) continue;
    const line = wagerDef(id).line;
    if (!lines.includes(line)) lines.push(line);
  }
  return lines;
}

/** Every card of one line dealable in this age, in file order. */
export function wagersOfLine(age: number, line: WagerLine): WagerId[] {
  const pool: WagerId[] = [];
  for (const id of WAGER_IDS) {
    if (!wagerDealtInAge(id, age)) continue;
    if (wagerDef(id).line === line) pool.push(id);
  }
  return pool;
}

/**
 * Every way `data/wagers.json` can be wrong, as human-readable lines.
 *
 * `beadDataProblems`' sibling and here for its reason: a card with no bar at an
 * age it is dealt in, or a flow row reading a figure that is not kept, is a data
 * mistake that would otherwise surface as a wager nobody in the world can clear.
 */
export function wagerDataProblems(): string[] {
  const problems: string[] = [];
  const kept = new Set<string>([
    ...WAGER_ACCUMULATORS,
    'renown',
    'killsMinusLosses',
    'unitHammers',
  ]);
  for (const id of WAGER_IDS) {
    const def = wagerDef(id);
    if (!isBeadFamily(def.family)) problems.push(`${id} names no bead family`);
    if (def.reads.shape === 'clauses') {
      if (def.reads.clauses.length === 0) problems.push(`${id} asks no clause`);
      for (const clause of def.reads.clauses) {
        if (!WAGER_COUNTS.includes(clause.count)) {
          problems.push(`${id} reads "${clause.count}", which nothing answers`);
        }
        if (clause.bars.length !== WAGER_AGES.length) {
          problems.push(`${id} has a clause with no figure for every age`);
        }
      }
      continue;
    }
    if (!WAGER_COUNTS.includes(def.reads.count)) {
      problems.push(`${id} reads "${def.reads.count}", which nothing answers`);
    }
    if (def.kind === 'flow' && !kept.has(def.reads.count)) {
      problems.push(`${id} counts a flow of "${def.reads.count}", which is not kept`);
    }
    const bars = def.bars ?? [];
    if (bars.length !== WAGER_AGES.length) problems.push(`${id} has no figure for every age`);
    if (!wagerIsLive(id)) continue;
    for (const age of WAGER_AGES) {
      if (def.fromAge !== undefined && age < def.fromAge) continue;
      if (wagerBar(id, age) <= 0) problems.push(`${id} asks nothing in age ${age}`);
    }
  }
  for (const age of WAGER_AGES) {
    if (wagerLinesOfAge(age).length < WAGER_RULES.dealt) {
      problems.push(`age ${age} has fewer than ${WAGER_RULES.dealt} lines to deal from`);
    }
  }
  return problems;
}
