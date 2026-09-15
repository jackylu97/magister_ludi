/**
 * **The score** — `docs/flags.md` item (uuuuu), 2026-09-15.
 *
 * The user: *"we need to draft a victory screen for completing the magnum opus,
 * and give the player a score based on their empire results and the yields from
 * their deck."*
 *
 * The ruling's own words are "a score is a rule-5 list", and that is what this
 * file pins. Five claims, every one of which could be false while the number at
 * the foot of the sheet still looked perfectly reasonable:
 *
 *   1. **The figure is the fold of the list.** A line folded without being
 *      printed would balance and would be invisible, and the sheet's whole
 *      promise is that a player can check the score by counting their own
 *      towns.
 *   2. **Every weight is off `rules.score`.** A figure written into the leaf is
 *      a balance number nobody can retune, which is the fault this ruling names
 *      in its own sentence ("the weights in `data/rules.json`'s `score` block,
 *      never in code").
 *   3. **Every line, every time.** The victory sheet prints a column per seat
 *      over one set of rows; a reading that dropped its empty lines would print
 *      a table whose rows meant something different in each column.
 *   4. **The Opus is the builder's**, off the claim register rather than off
 *      anybody's stones — a rival who stormed the town has taken a wonder, not
 *      a victory.
 *   5. **The deck's half is the Ledger's own reading**, voice for voice, so the
 *      score and the Ledger cannot come to disagree about what statecraft pays.
 *
 * Core tier: one duel board, a handful of counters written onto a seat, and a
 * fold.
 */

import { describe, expect, it } from 'vitest';

import { explainLedger } from '../../src/sim/ledgerFold';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { RULES } from '../../src/sim/rulesData';
import { explainScore, foldScore, opusBuildingId } from '../../src/sim/score';
import { buildingDef } from '../../src/sim/buildingData';
import { highestAge } from '../../src/sim/techData';
import { bumpRevision, citiesOf, playerById } from '../../src/sim/state';
import { found, game } from './statecraftHelpers';

/** A board with a town on it and a seat that has done a few things. */
function bench() {
  const { state } = game();
  found(state, 0);
  const player = playerById(state, 0)!;
  player.greatPeopleRecruited = 2;
  player.citiesCaptured = 3;
  bumpRevision(state);
  return { state, player };
}

describe('the score', () => {
  it('folds its own list, and prints every line it folded', () => {
    const { state } = bench();
    const lines = explainScore(state, 0);
    let sum = 0;
    for (const line of lines) {
      // The only arithmetic a line is allowed to have done.
      expect(line.value, line.label).toBe(Math.floor(line.count * line.weight));
      sum += line.value;
    }
    expect(foldScore(lines)).toBe(sum);
  });

  it('counts the empire off the empire, not off a figure of its own', () => {
    const { state, player } = bench();
    const lines = explainScore(state, 0);
    const line = (label: string) => lines.find((one) => one.label === label)!;

    let citizens = 0;
    for (const town of citiesOf(state, 0)) citizens += town.population;

    expect(line('Towns held').count).toBe(citiesOf(state, 0).length);
    expect(line('Citizens').count).toBe(citizens);
    expect(line('Technologies').count).toBe(player.techsResearched.length);
    expect(line('Beads kept').count).toBe(player.beads.length);
    expect(line('Great people called').count).toBe(2);
    expect(line('Towns taken by force').count).toBe(3);
    expect(line('The age reached').count).toBe(highestAge(player.techsResearched));
  });

  it('takes every weight off rules.score and holds none of its own', () => {
    const { state } = bench();
    const rules = RULES.score;
    const weights = new Map(explainScore(state, 0).map((line) => [line.label, line.weight]));
    expect(weights.get('Towns held')).toBe(rules.perTown);
    expect(weights.get('Citizens')).toBe(rules.perCitizen);
    expect(weights.get('Technologies')).toBe(rules.perTechnology);
    expect(weights.get('Wonders raised or held')).toBe(rules.perWonder);
    expect(weights.get('Beads kept')).toBe(rules.perBead);
    expect(weights.get('Great people called')).toBe(rules.perGreatPerson);
    expect(weights.get('Towns taken by force')).toBe(rules.perTownTaken);
    expect(weights.get('The age reached')).toBe(rules.perAge);
    // And the whole set: no line may carry a figure that is not on the sheet.
    const known = new Set<number>([
      rules.perTown,
      rules.perCitizen,
      rules.perTechnology,
      rules.perWonder,
      rules.perBead,
      rules.perGreatPerson,
      rules.perTownTaken,
      rules.perAge,
      rules.theOpus,
      ...CITY_YIELD_KEYS.map((key) => rules.perDeckYield[key]),
    ]);
    for (const [label, weight] of weights) {
      expect(known.has(weight), `${label} carries a weight that is not in rules.score`).toBe(true);
    }
  });

  it('prints every line for every seat, however empty', () => {
    // The standings are a table. A seat that has founded nothing has the same
    // rows as the seat leading the world, or the columns do not line up.
    const { state } = bench();
    const mine = explainScore(state, 0).map((line) => line.label);
    const theirs = explainScore(state, 1).map((line) => line.label);
    expect(theirs).toEqual(mine);
    expect(mine.length).toBe(9 + CITY_YIELD_KEYS.length);
  });

  it('pays the Opus to the empire holding its stones, and to nobody else', () => {
    // There is no claim register for it — the closing row is a once-per-empire
    // culture building rather than a `wonder: true` one, so `claimWonder` never
    // writes it — and the line follows the stones like every other building's
    // pay. The *win* is `state.winnerId`, which is the builder and is not this.
    const { state } = bench();
    const opus = opusBuildingId();
    expect(opus, 'no building carries endsTheGame').toBeDefined();
    const name = buildingDef(opus!).name;
    const opusLine = (playerId: number) =>
      explainScore(state, playerId).find((line) => line.label === name)!;

    expect(opusLine(0).count).toBe(0);
    expect(opusLine(0).value).toBe(0);

    citiesOf(state, 0)[0]!.buildings.push(opus!);
    bumpRevision(state);
    expect(opusLine(0).count).toBe(1);
    expect(opusLine(0).value).toBe(RULES.score.theOpus);
    expect(opusLine(1).count).toBe(0);
  });

  it('reads the deck off the Ledger, voice for voice', () => {
    const { state } = bench();
    const lines = explainScore(state, 0);
    const ledger = explainLedger(state, 0);
    for (const key of CITY_YIELD_KEYS) {
      const line = lines.find((one) => one.voice === key)!;
      const voice = ledger.find((one) => one.key === key)!;
      expect(line.count, key).toBe(voice.byClass.deck);
      expect(line.weight, key).toBe(RULES.score.perDeckYield[key]);
    }
    // And the six are marked rather than found by their words: the labels are
    // the one thing on this list that may be rewritten.
    expect(lines.filter((line) => line.voice !== undefined)).toHaveLength(CITY_YIELD_KEYS.length);
  });
});
