/**
 * Typed access to `data/triumphs.json` — the seventeen notable things an empire
 * can do, and what renown each is worth.
 *
 * A triumph is the *lumpy* half of the renown bucket (`docs/great-people.md`):
 * buildings and wonders pay a trickle you can plan around, and a triumph pays
 * for something you did. Two rules of the list, both from the doc and both worth
 * restating because they are what keep it honest:
 *
 *   · **no triumph is the only way over a threshold** — the building floor
 *     always gets there, so a peaceful empire is slower to a great person and
 *     never barred from one;
 *   · **no triumph rewards a bank statement** (Entry VI) — every row is a claim
 *     on the world, never a private milestone.
 *
 * The trigger kinds are the **one new hook shape** this whole pass adds, and
 * they live in one `switch` in `triumphs.ts`. This file only types them and
 * checks that a row names one the evaluator knows.
 */

import triumphsJson from '../../data/triumphs.json';

import { type Family, isFamily } from './greatPeopleData';

export type TriumphId = keyof typeof triumphsJson.triumphs & string;

/**
 * When a triumph is earned.
 *
 * Two shapes in one union, and the split is the whole of how they are evaluated
 * (see `triumphs.ts`):
 *
 *   · an **occasion** — something happened, and the seam it happened at asks.
 *     `cityFounded` carries a count because "your third city" is a question
 *     about the board asked *at* the founding.
 *   · a **standing count** — something is now true of the empire. Nothing has to
 *     announce it; the renown phase sweeps them once a turn from state, which is
 *     simpler than a hook and cannot miss (a city that reaches size 10 by
 *     starving back and growing again is still a city of size 10).
 *
 * The three that wait on content are in the union anyway, so a row can name them
 * and be *deferred* rather than silently absent — the same discipline a card's
 * unbuilt half keeps.
 */
export type TriumphTrigger =
  /** A city was founded, and the empire now holds at least `count`. */
  | { kind: 'cityFounded'; count: number }
  /** This empire's highest age rose. Contested: the world's first into an era. */
  | { kind: 'ageEntered' }
  /** A wonder was completed by this empire. */
  | { kind: 'wonderCompleted' }
  /** A battle was won against a defender of greater strength. */
  | { kind: 'battleWonAgainstStronger' }
  /** A barbarian camp was cleared. */
  | { kind: 'campCleared' }
  /** A ruin or a village was claimed. */
  | { kind: 'discoveryClaimed' }
  /** A government was adopted. */
  | { kind: 'governmentAdopted' }
  /** A pantheon belief was consecrated. */
  | { kind: 'beliefConsecrated' }
  /** A city was founded on a landmass this empire did not start on. */
  | { kind: 'cityOnOtherContinent' }
  /** A city was taken by force. */
  | { kind: 'cityCaptured' }
  /** Some city of this empire is at least `count` citizens. Standing count. */
  | { kind: 'cityPopulation'; count: number }
  /** At least `count` distinct luxuries held **through an improvement**. Standing. */
  | { kind: 'luxuriesImproved'; count: number }
  /** At least `count` cities held. Standing count. */
  | { kind: 'cityCount'; count: number }
  /** Some one city holds at least `count` wonders. Standing count. */
  | { kind: 'wondersInOneCity'; count: number }
  /** *Deferred.* A unit lost in a battle that was then won. Needs Epic Poetry. */
  | { kind: 'unitLostThenWon' }
  /**
   * A naval unit was built. Announced at `realiseItem` as `navalUnitBuilt`; the
   * row's `once` scope is what makes it the *first* one.
   */
  | { kind: 'navalUnitBuilt' }
  /**
   * At least `count` of this empire's cities are joined to its capital by road.
   * A **standing count**, swept by the renown phase.
   *
   * It was written as an occasion and is one no longer, and the reason is the
   * union's own docblock: a connection is a *fact about the board* — roads are
   * laid, borders move, a town changes hands — rather than a moment anybody
   * announces. `connectedCities` (`roads.ts`) is the reading, the same one the
   * treasury's ledger counts its coin from, so the road that pays gold and the
   * road that earns a Triumph are one answer.
   */
  | { kind: 'citiesConnected'; count: number }
  /**
   * **A census named this empire first** (batch C1, `docs/wager.md` §10/§11).
   * Announced by the `census` phase to the leader alone (`censusTaken`).
   *
   * An occasion rather than a standing count, and the difference is the whole
   * of what a census is: "you lead the world in learning" is a fact about the
   * board at every instant, and nobody would ever be told it. What is worth a
   * sheet is the *measurement* — one figure, chosen by the world, on one turn —
   * so the moment is announced and the row is `perEvent`, because the world is
   * measured again and again.
   */
  | { kind: 'censusTaken' };

/** Every trigger kind, for the register test that pins the evaluator's switch. */
export type TriumphTriggerKind = TriumphTrigger['kind'];

/**
 * How often one triumph may be earned.
 *
 *   · **once** — once per game per seat.
 *   · **perAge** — the first time in each of the empire's ages.
 *   · **contested** — the first seat *in the world*, once per age, by log and
 *     sweep order (Entry V's feats). The one contested row is First Light of the
 *     Æra, whose whole content is being first into an era, so "once per age" is
 *     what contested means here and the type says so rather than carrying a
 *     second flag no row would use.
 *   · **perEvent** — unbounded. A wonder is worth a triumph every time.
 */
export type TriumphScope = 'once' | 'perAge' | 'contested' | 'perEvent';

export interface TriumphDef {
  name: string;
  /** One line, in the voice of the tech tree's aphorisms. Never a rule. */
  epigram: string;
  /**
   * **What earned it**, in a first-time player's words (user ruling, 2026-08-28:
   * *"a one-liner that describes what the triumph was caused by"*).
   *
   * A row's `name` is a title and its `epigram` is a poem, and neither of them
   * says *why the sheet just came up* — "A Marvel Raised" over a card that pays
   * ten renown left a new player with no idea which of the six things they did
   * this turn had done it. This is the cause, second person, present tense, one
   * sentence, and it is a **rule** rather than flavour: hard rule 7's voice, so
   * no identifiers and no digits (the renown figure is `pays`, a field, and is
   * printed as a figure — a number written into this sentence would be the same
   * fact in two places, one of which a balance pass would not find).
   *
   * Every surface that names a Triumph prints it: the sheet under the name, the
   * Compendium's shelf as the entry's first clause. Required, so a new row
   * cannot ship as a title and a poem with nothing between them.
   */
  text: string;
  when: TriumphTrigger;
  /** Renown paid, once, the turn it is earned. */
  pays: number;
  scope: TriumphScope;
  /**
   * Which family this feeds, or absent for a triumph that feeds none.
   *
   * The feed record (`Player.renownByFamily`) is what biases the draw, so a war
   * fought pays the generals and a ruin read pays the scholars — which is the
   * doc's own family table read from the lumpy side. Absent is legal and means
   * the pool grows without any family growing with it.
   */
  family?: Family;
  /**
   * A row that is **shown somewhere else** and must not raise the Triumph sheet
   * on top of it (batch C1). The census's own row is the only one today: the
   * user's ruling of 2026-09-09 is that the leader's Triumph appears *inside*
   * the census sheet and nowhere else — "let's not show both a triumph modal
   * for winning the census and the census modal".
   *
   * A **marker on the row**, never a name compared in code: `reportTriumphs`
   * (`controls.ts`) reads this field, and keeps its chronicle line either way,
   * because the log is the record whatever surface announced the moment. The
   * renown, the record on `Player.triumphs` and the family feed are untouched —
   * this is a fact about which sheet says so, and nothing else.
   */
  quiet?: boolean;
  /**
   * Why this row cannot be earned in this build, or absent for a live one.
   *
   * A deferred triumph is **never awarded** — `awardTriumph` refuses it — and it
   * is in the table anyway so the hover can print the whole list greyed, which
   * is what `docs/great-people.md` asks for. A row, not a comment: a comment in
   * JSON is a lie waiting to happen.
   */
  deferred?: string;
}

export interface TriumphData {
  triumphs: Record<TriumphId, TriumphDef>;
}

export const TRIUMPH_DATA = triumphsJson as unknown as TriumphData;

/** Every id in **file order** — the order the hover lists them and awards sweep. */
export const TRIUMPH_IDS = Object.keys(TRIUMPH_DATA.triumphs) as TriumphId[];

export function triumphDef(id: TriumphId): TriumphDef {
  const def = TRIUMPH_DATA.triumphs[id];
  if (!def) throw new Error(`Unknown triumph "${String(id)}"`);
  return def;
}

/** Every trigger kind a row may name. The register the evaluator's switch answers. */
const TRIGGER_KINDS: readonly TriumphTriggerKind[] = [
  'cityFounded',
  'ageEntered',
  'wonderCompleted',
  'battleWonAgainstStronger',
  'campCleared',
  'discoveryClaimed',
  'governmentAdopted',
  'beliefConsecrated',
  'cityOnOtherContinent',
  'cityCaptured',
  'cityPopulation',
  'luxuriesImproved',
  'cityCount',
  'wondersInOneCity',
  'unitLostThenWon',
  'navalUnitBuilt',
  'citiesConnected',
  'censusTaken',
];

const SCOPES: readonly TriumphScope[] = ['once', 'perAge', 'contested', 'perEvent'];

/** The load validator. `greatPeopleData.ts`'s, one table over. */
function validateTable(): void {
  for (const id of TRIUMPH_IDS) {
    const def = triumphDef(id);
    const where = `triumphs.json: ${id}`;
    if (!TRIGGER_KINDS.includes(def.when.kind)) {
      throw new Error(`${where} names unknown trigger "${String(def.when.kind)}"`);
    }
    if (!SCOPES.includes(def.scope)) {
      throw new Error(`${where} names unknown scope "${String(def.scope)}"`);
    }
    if (!(def.pays > 0)) throw new Error(`${where} pays nothing`);
    // The cause line, and the two things the ruling asks of it. A row with no
    // `text` is a sheet that says what it is called and never what you did; a
    // digit in it is hard rule 7's prose rule broken, and the figure it would
    // be duplicating is `pays` two lines up.
    if (typeof def.text !== 'string' || def.text.length === 0) {
      throw new Error(`${where} says nothing about what earned it`);
    }
    if (/\d/.test(def.text)) throw new Error(`${where} writes a number into its prose`);
    if (def.family !== undefined && !isFamily(def.family)) {
      throw new Error(`${where} names unknown family "${String(def.family)}"`);
    }
  }
}

validateTable();
