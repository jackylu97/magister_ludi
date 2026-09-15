/**
 * **The score** — what a game came to, as a list a player can check
 * (`docs/flags.md` item (uuuuu); the user, 2026-09-15: *"give the player a score
 * based on their empire results and the yields from their deck."*).
 *
 * A rule-5 list and nothing else
 * ------------------------------
 * `explainScore` returns the labelled lines and `foldScore` is their one sum,
 * so the figure at the foot of the victory sheet is never computed beside the
 * table it stands under. Every line is the same three facts — **what was
 * counted, how many there are, and what one is worth** — and the third comes
 * from `rules.score` rather than from this file: a score is balance, and a
 * weight written into a function is a balance number nobody can retune.
 *
 * That shape is also what makes the sheet honest. A player who disagrees with
 * their score can read the row that produced it and count the things themselves
 * — which is the whole argument for rule 5 applied to the one number the game
 * ends on.
 *
 * Every line, every time
 * ----------------------
 * A line with nothing in it is still a line, which is the one place this reading
 * differs from the yield folds it is modelled on. The victory sheet prints a
 * **column per seat** over one set of rows, and a table whose rows depended on
 * which empire the column belongs to is not a table — a seat that never took a
 * town would silently shift every row under it. So the labels are fixed, the
 * count carries the nothing, and the standings line up.
 *
 * What the deck produced, and what is missing from it
 * ---------------------------------------------------
 * The last six lines are the **statecraft class of the Ledger** — `ledgerFold`'s
 * own classification of the very lines `collectYields` banks, per voice, each
 * weighted by `rules.score.perDeckYield`. The ruling asks for the deck's
 * **lifetime** tally, the one the Ledger's third band prints; there is no such
 * figure. That band is an eyebrow and a sentence saying the figures are not kept
 * (`LEDGER_BAND3_NOTE`), the curve beside it is a UI-side ring buffer that is
 * not saved, and the simulation keeps no history at all. So this reads **what
 * the deck pays on the turn the score is asked**, which is the honest reading
 * available: an empire whose deck compounded for two hundred turns and an empire
 * that drafted the same cards last turn score the same here. The day
 * `PlayerStatecraft` grows a tally and `collectYields` writes it, these six
 * lines read that instead and nothing else on the sheet moves.
 *
 * A leaf, beside `ledgerFold.ts`
 * ------------------------------
 * It imports the empire's own registers, the building table and the Ledger's
 * fold, and **nothing imports it back** — the victory sheet is its only reader.
 * Markers, never names (CLAUDE.md's rule for the Opus as for everything else):
 * the closing wonder is found by `BuildingDef.endsTheGame`, which is the same
 * marker `realiseItem` reads to bring the curtain down.
 */

import { BUILDING_IDS, buildingDef, type BuildingId } from './buildingData';
import { explainLedger } from './ledgerFold';
import { CITY_YIELD_KEYS, type CityYieldKey } from './resourceData';
import { RULES } from './rulesData';
import { citiesOf, playerById, wondersHeldBy, type GameState } from './state';
import { highestAge } from './techData';

/**
 * One line of a score: what it counts, how many, what one is worth, and the
 * product.
 *
 * `label` carries **no figure** — hard rule 7, and the reason the count and the
 * weight are their own fields: the sheet prints them in the ledger's own tabular
 * columns ("Towns held · 7 · ×12 · 84"), where a number belongs, rather than in
 * a sentence, where it does not.
 */
export interface ScoreLine {
  /** What was counted, in a first-time player's words. */
  label: string;
  /** How many of it there are. Zero is a real answer and still prints. */
  count: number;
  /** What one is worth — a figure off `rules.score` and never off this file. */
  weight: number;
  /** `count × weight`, floored. The only arithmetic on a line. */
  value: number;
  /**
   * The voice, on the six lines the deck pays and on nothing else.
   *
   * A **marker**, so the sheet's "what your statecraft paid" line can find those
   * six without reading their labels — a label is words, and words are the one
   * thing on this list that is allowed to be rewritten.
   */
  voice?: CityYieldKey;
}

/**
 * The wonder that ends the game, off its own marker.
 *
 * `undefined` is a table with no closing wonder in it, which is not a state any
 * shipped build is in — and is still answered rather than thrown over, because a
 * score is read on a screen and a screen that throws is worse than a score with
 * one line missing.
 */
export function opusBuildingId(): BuildingId | undefined {
  return BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true);
}

/** `count × weight`, with the count taken as whole. */
function line(label: string, count: number, weight: number): ScoreLine {
  const whole = Math.floor(count);
  return { label, count: whole, weight, value: Math.floor(whole * weight) };
}

/** The voice's own word, capitalised for the head of a label. */
function voiceLabel(key: string): string {
  return `${key.charAt(0).toUpperCase()}${key.slice(1)} from statecraft`;
}

/**
 * **What this empire's game came to**, line by line.
 *
 * The empire's results first, in the order a player would count them — the towns
 * and the people in them, what was learned, what was raised, what is on the rod,
 * who was called, what was taken, how far the era got, and the Opus — then what
 * the deck pays, a line a voice.
 *
 * The Opus line follows **the stones** — the town that holds the closing row —
 * because that row is a once-per-empire culture building rather than a
 * `wonder: true` one and nothing writes it into the claim register. The clause
 * beside it says so. The *win* is not this line: `state.winnerId` is the builder
 * and stays the builder whatever happens to the town afterwards.
 */
export function explainScore(state: GameState, playerId: number): ScoreLine[] {
  const rules = RULES.score;
  const player = playerById(state, playerId);
  const towns = citiesOf(state, playerId);
  let citizens = 0;
  for (const town of towns) citizens += town.population;

  const opus = opusBuildingId();
  // **The stones, not a claim register.** The Opus is a once-per-empire culture
  // row rather than a `wonder: true` one (`data/buildings.json`), so
  // `claimWonder` never writes it into `GameState.wonders` and there is no
  // history of who raised it to read. So the line follows the stones, which is
  // the rule every other building's pay already follows — and the close itself
  // is unaffected either way: `state.winnerId` is the *builder*, written once
  // by `closeTheGreatWork` and never moved by a conquest afterwards.
  const holdsTheOpus =
    opus !== undefined && towns.some((town) => town.buildings.includes(opus));

  const lines: ScoreLine[] = [
    line('Towns held', towns.length, rules.perTown),
    line('Citizens', citizens, rules.perCitizen),
    line('Technologies', player?.techsResearched.length ?? 0, rules.perTechnology),
    line('Wonders raised or held', wondersHeldBy(state, playerId), rules.perWonder),
    line('Beads kept', player?.beads.length ?? 0, rules.perBead),
    line('Great people called', player?.greatPeopleRecruited ?? 0, rules.perGreatPerson),
    line('Towns taken by force', player?.citiesCaptured ?? 0, rules.perTownTaken),
    line('The age reached', highestAge(player?.techsResearched ?? []), rules.perAge),
    line(
      opus === undefined ? 'The great work' : buildingDef(opus).name,
      holdsTheOpus ? 1 : 0,
      rules.theOpus,
    ),
  ];

  // The deck's half. `explainLedger` is the Ledger's own reading, asked here
  // rather than re-derived, so the sheet and the Ledger can never come to
  // disagree about what statecraft pays this empire.
  const ledger = player === undefined || player.barbarian ? [] : explainLedger(state, playerId);
  for (const key of CITY_YIELD_KEYS) {
    const voice = ledger.find((one) => one.key === key);
    lines.push({
      ...line(voiceLabel(key), voice?.byClass.deck ?? 0, rules.perDeckYield[key]),
      voice: key,
    });
  }
  return lines;
}

/** The one sum of that list, and the only figure the sheet prints at its foot. */
export function foldScore(lines: readonly ScoreLine[]): number {
  let total = 0;
  for (const entry of lines) total += entry.value;
  return total;
}
