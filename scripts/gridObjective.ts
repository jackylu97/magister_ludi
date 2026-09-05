/**
 * **The judge** — what a played game is worth, in the game's own currency.
 *
 * Split out of `scripts/gridSearch.ts` for two reasons, and the second is the
 * load-bearing one: a test that wanted to pin this arithmetic would, importing
 * the harness, *start a grid search* (the script's entry point runs on import,
 * which is what a script is). And the objective is the half of a self-play search
 * that has to be argued about — a search is only ever as honest as its judge.
 *
 * The fold is
 *
 *     beads × weights.bead + techs × weights.tech + Σ voice rates × weights[voice][age]
 *
 * read at the final turn, off the same books the arena's meters read
 * (`empireRateReading` for the four banked voices; the towns' own `cityYields`
 * summed for food and hammers, because the simulation has no empire-scale fold of
 * a basket or a hammer).
 *
 * **Both seats are scored at the file's own weights** (`AI`), never at the sheet
 * the candidate is playing. That is the one way a self-play objective can be
 * quietly circular: a candidate that trebles `weights.science` and is then scored
 * at treble the science weight has won nothing but the scoring. The *age* is the
 * seat's own, because a voice's weight is age-banded and an empire two ages ahead
 * really is being paid a different rate for the same bushel.
 */

import { AI } from '../src/ai/aiConfig';
import { VOICES, type Voice, yieldWeight } from '../src/ai/value';
import { cityYields, empireRateReading } from '../src/sim/cities';
import type { GameState } from '../src/sim/state';
import { highestAge } from '../src/sim/techData';

/** One seat's standing at the final turn, in the voices the fold is made of. */
export interface Standing {
  beads: number;
  techs: number;
  rates: Record<Voice, number>;
  age: number;
}

/**
 * What one seat has made of its game — the six per-turn voices, the rod and the
 * tree, read exactly as the arena's meters read them.
 */
export function standingOf(state: GameState, playerId: number): Standing {
  const player = state.players[playerId]!;
  const banked = empireRateReading(state, playerId);
  let food = 0;
  let production = 0;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    // The town priced toward what it is actually building, which is the reading
    // `empireRates` takes for the other four voices — one set of books.
    const yields = cityYields(state, city, [], city.queue[0]);
    food += yields.food;
    production += yields.production;
  }
  return {
    beads: player.beads.length,
    techs: player.techsResearched.length,
    age: highestAge(player.techsResearched),
    rates: {
      food,
      production,
      gold: banked.goldPerTurn ?? 0,
      science: banked.sciencePerTurn ?? 0,
      culture: banked.culturePerTurn ?? 0,
      faith: banked.faithPerTurn ?? 0,
    },
  };
}

/**
 * **The fold, at the file's own weights** — the judge's glasses, never the
 * candidate's.
 *
 * `AI` rather than the seat's merged sheet, deliberately and load-bearingly: a
 * candidate that trebles `weights.science` and is then scored at treble the
 * science weight has won nothing but the scoring. The age is the *seat's* own,
 * because a voice's weight is age-banded and an empire two ages ahead is
 * genuinely being paid at a different rate for the same bushel.
 */
export function foldStanding(standing: Standing): { total: number; voices: Record<Voice, number> } {
  const voices = {} as Record<Voice, number>;
  let total = standing.beads * AI.weights.bead + standing.techs * AI.weights.tech;
  for (const voice of VOICES) {
    const line = standing.rates[voice] * yieldWeight(AI, voice, standing.age as 1 | 2 | 3 | 4);
    voices[voice] = line;
    total += line;
  }
  return { total, voices };
}

