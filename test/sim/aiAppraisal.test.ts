/**
 * **The bot appraisal batches of 2026-09-04** (`docs/flags.md`, "bot appraisal
 * batch — routes · great people · tile lines", and "bot batch 2 — scouts · tech
 * riders · yield weights" below it).
 *
 * Three things the seat used to price at nothing, or at a position in a list,
 * and each of them is asked here of the pure function that holds it rather than
 * of a played game — `aiWar.test.ts`' bench, for its reason: every claim below
 * is about *one decision on a board somebody arranged*, and a generated map
 * would arrange it differently every time the mapgen is tuned.
 *
 *   · **the route scorer** — one table over own and foreign partners, priced by
 *     the simulation's own route folds. The pin is a mirror: the *same* three
 *     towns, one board where the crossing pays more and one where the origin's
 *     shelves do, and the seat takes whichever is worth more. Greed, not a
 *     preference either way;
 *   · **a work's second-order gifts** — the seam it opens under itself and the
 *     defender line a citadel plants, the latter off a knob in `data/ai.json`
 *     rather than a number in the code;
 *   · **the ghost's tile lines** — `foldCity(state, city, [lighthouse])` now
 *     sees the coastal food, which is the whole worth of that row, and a real
 *     reading is untouched.
 *
 * Batch 2 adds two more, in the same idiom:
 *
 *   · **the scout brake** — the t75 diagnostics found twelve to forty rangers a
 *     seat, so a further scout past `military.scoutCap` is charged a steep
 *     printed penalty and the whole explorer value decays with the turn count.
 *     Both are read off the *candidate's own terms*, which is where the ruling
 *     says they have to be visible;
 *   · **the tech riders** — a node's improvement renewals, priced by how much of
 *     this empire's ground would actually collect them, and a node's own card
 *     effects, priced by the reader the drafts use.
 *
 * Batch 3 (the military brain) adds the two halves of it that are *appraisals*
 * — the third, the tactics, is a unit order and lives in `aiWar.test.ts`:
 *
 *   · **the sighted levy** — the wanted army grows with the camps this seat has
 *     charted and the hostile pieces it can see, and the pin that matters is the
 *     one where it *cannot* see: the same camp on the far side of the map moves
 *     nothing at all. The bot's one fog-honest reading, so the honesty is what
 *     is tested;
 *   · **the unit mix** — an army that is all spearmen craves a bow, an army that
 *     is all bows craves a spearman, and the craving is a term in the fold
 *     rather than a gate on the list.
 *
 * Batch 4 is one ruling across four call sites — **the delay discount**
 * (`docs/bot-priorities.md` batch 2, which retired the flat potential weight it
 * shipped with): `realized + (H − delay)/H × (potential − realized)`, wherever
 * this bot can tell a thing it already collects from a thing it would collect
 * once somebody built, ploughed or researched. The beeline's per-town building
 * gift waits for the towns to raise the row, a node's renewal riders for a spade
 * to walk out, a counted card's buildable subjects for the same raising, and a
 * worker's anticipation for the beakers the seat banks — each printing its
 * discount *and its turns* as a term of its own, which is what section 8 reads,
 * term by term. A `tally` forecast is the one promise that carries no discount
 * at all. The same batch stops a counted card being priced at a nominal guess:
 * it is counted by `countOf`, the simulation's own.
 */

import { describe, expect, it } from 'vitest';

import { bestTechGoal, explainCard, nextBotDecision, valueContext } from '../../src/ai/bot';
import { incumbentGoal, liveChains, techChain } from '../../src/ai/chain';
import {
  type BotCandidate,
  type BotDecision,
  type ValueTerm,
  foldTerms,
} from '../../src/ai/decision';
import { type PlanEntry, buildImprovementPlan, rankWorkSites } from '../../src/ai/plan';
import {
  delayTerm,
  explainBuildingRow,
  explainCounted,
  explainEffects,
  hasFoldReadEngine,
  scopeDoor,
  scoreEffects,
  townsAdmitting,
  workedHexesAdmitting,
} from '../../src/ai/value';
import aiJson from '../../data/ai.json';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../../src/sim/buildingData';
import {
  buildingProductionCost,
  foundCityAt,
  refreshCityDerived,
} from '../../src/sim/cities';
import {
  foldCity,
} from '../../src/sim/yields/town';
import {
  explainEmpireCardYields,
  foldEmpireRates,
} from '../../src/sim/yields/empire';
import { happinessDemand } from '../../src/sim/meters';
import { unitUpkeepTotal } from '../../src/sim/upkeep';
import { applyCommand } from '../../src/sim/commands';
import { improvementDef } from '../../src/sim/improvementData';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import {
  type City,
  type GameState,
  type Player,
  createUnit,
  newGame,
  playerById,
  bumpRevision,
} from '../../src/sim/state';
import { anyCardDef } from '../../src/sim/statecraft';
import {
  ORDER_IDS,
  TALLY_OCCASIONS,
  type CardPaysEffect,
  type CardEffect,
  type OrderId,
  type TallyOccasion,
  orderDef,
} from '../../src/sim/statecraftData';
import { researchExpansion } from '../../src/sim/tech';
import { TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { isExploredBy, recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';

/**
 * Every source of the bot, read as text — for the one claim below that is about
 * what the tree *does not say* any more.
 */
const AI_SOURCES = import.meta.glob('../../src/ai/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// --- the delay discount, computed off the sheet ------------------------------

/**
 * `(H − delay) / H`, floored at nothing — the bot's own arithmetic, written out
 * here off `data/ai.json` rather than imported, so a change to the formula fails
 * these pins instead of moving with them.
 */
const HORIZON = aiJson.priorities.horizonTurns;

function discountFor(delay: number): number {
  return Math.max(0, (HORIZON - delay) / HORIZON);
}

/**
 * The improvement rider's own delay, and the one estimate the bot states as a
 * constant: `workers.planRadius` turns of walking, plus the turn that lays the
 * spade.
 */
const SPADE_DISCOUNT = discountFor(aiJson.workers.planRadius + 1);

/** What a middling town of this seat makes — the build delays' denominator. */
function medianProduction(state: GameState, playerId: number): number {
  const made: number[] = [];
  for (const city of state.cities) {
    if (city.ownerId === playerId) made.push(foldCity(state, city).production);
  }
  made.sort((a, b) => a - b);
  if (made.length === 0) return 1;
  const middle = Math.floor(made.length / 2);
  const median = made.length % 2 === 1 ? made[middle]! : (made[middle - 1]! + made[middle]!) / 2;
  return Math.max(1, median);
}

/** The turns the bot would give a town to raise a row of this cost. */
function raisingTurns(cost: number, state: GameState, playerId: number): number {
  return Math.ceil(cost / medianProduction(state, playerId));
}

// --- the bench --------------------------------------------------------------

/** `aiWar.test.ts`' bench: a blank board, seats seated, nothing on it. */
function bench(
  seats = 2,
  { width = 20, height = 12, terrain = 'grassland' as const } = {},
): GameState {
  const colors = ['#a00', '#00a', '#0a0'];
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: ['Ada', 'Bors', 'Cyra'][index]!,
      color: colors[index]!,
    })),
  });
  state.map = createMap({ width, height, terrain });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function seat(state: GameState, playerId: number): Player {
  const player = playerById(state, playerId);
  if (!player) throw new Error(`no seat ${playerId}`);
  return player;
}

/** A hex written into a town's territory, `aiWar`'s `giveLuxury` half. */
function own(state: GameState, city: City, col: number, row: number): Tile {
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  return at(state.map, col, row);
}

/**
 * How a bench empire **meets** another: a town of theirs this seat remembers
 * (`hasMetSeat`'s second clause). Memory rather than a filled-in chart, because
 * a chart is recomputed the moment the seat moves a piece and the meeting would
 * come undone halfway through the decisions below.
 */
function meet(state: GameState, playerId: number, city: City): void {
  const seen = state.citySightings[playerId] ?? [];
  seen.push({ cityId: city.id, col: city.col, row: city.row, name: city.name, ownerId: city.ownerId });
  state.citySightings[playerId] = seen;
}

/**
 * The seat's decisions, played out until it proposes one of a kind — the way a
 * unit order is reached without hand-picking which piece the blocker names
 * first. Everything before it is applied, so the board the route is decided on
 * is the board the bot actually reached.
 */
function decisionOfType(
  state: GameState,
  playerId: number,
  type: string,
  budget = 40,
): BotDecision | null {
  for (let guard = 0; guard < budget; guard++) {
    const decision = nextBotDecision(state, playerId);
    if (decision === null) return null;
    if (decision.command.type === type) return decision;
    if (!applyCommand(state, decision.command).ok) return null;
  }
  return null;
}

/** Every label in a term tree, flattened — `aiWar.test.ts`' reader. */
function labelsOf(terms: readonly ValueTerm[]): string {
  return terms
    .map((term) => (term.parts === undefined ? term.label : `${term.label} | ${labelsOf(term.parts)}`))
    .join(' | ');
}

/** The first term anywhere in a tree whose label matches. Depth-first, in order. */
function findTerm(terms: readonly ValueTerm[], match: RegExp): ValueTerm | null {
  for (const term of terms) {
    if (match.test(term.label)) return term;
    const inside = term.parts === undefined ? null : findTerm(term.parts, match);
    if (inside !== null) return inside;
  }
  return null;
}

/** The candidate one decision weighed under a printed name. */
function candidate(decision: BotDecision, label: string): BotCandidate {
  const row = decision.candidates.find((entry) => entry.label === label);
  if (!row) throw new Error(`no candidate "${label}" among ${decision.candidates.map((c) => c.label).join(', ')}`);
  return row;
}

// --- 1. the route scorer ----------------------------------------------------

describe('the route scorer', () => {
  /**
   * Three towns: two of the seat's own and one of a neighbour's, met and at
   * peace. The market is in the *second* town so the empire has a route slot
   * without putting a building on the origin whose shelves are the thing under
   * test.
   */
  function threeTowns(shelves: readonly BuildingId[]): {
    state: GameState;
    home: City;
    second: City;
    abroad: City;
  } {
    const state = bench(2);
    const home = foundCityAt(state, 0, at(state.map, 4, 5));
    const second = foundCityAt(state, 0, at(state.map, 8, 5));
    const abroad = foundCityAt(state, 1, at(state.map, 13, 5));
    second.buildings.push('market');
    bumpRevision(state);
    home.buildings.push(...shelves);
    bumpRevision(state);
    // Met: the neighbour's town is one this seat remembers seeing.
    meet(state, 0, abroad);
    // Both towns held, and the neighbour out-arming this seat three to one:
    // otherwise the diplomatic arm declares before the caravan is ever ordered,
    // and a route abroad is refused by the war rather than weighed.
    createUnit(state, 0, 'warrior', home.col, home.row);
    createUnit(state, 0, 'warrior', second.col, second.row);
    for (let index = 0; index < 6; index++) {
      createUnit(state, 1, 'warrior', abroad.col, abroad.row + index);
    }
    createUnit(state, 0, 'trader', home.col, home.row);
    // A treasury that is not an emergency, so the appraisal's gold pressure is
    // the ordinary one rather than the arrears pin.
    seat(state, 0).gold = 400;
    bumpRevision(state);
    return { state, home, second, abroad };
  }

  /** Food, culture and science shelves — what a caravan's food line counts. */
  const SHELVES: readonly BuildingId[] = [
    'granary',
    'aqueduct',
    'harbour',
    'library',
    'university',
    'monument',
    'funeralGames',
    'amphitheater',
    'baths',
    'forum',
    'courthouse',
    'examinationHall',
    'hallOfDeeds',
    'steleOfLaws',
  ];

  it('sends the caravan abroad when the crossing is what pays', () => {
    const { state, abroad } = threeTowns([]);
    const decision = decisionOfType(state, 0, 'startRoute');
    expect(decision).not.toBeNull();
    // A bare origin's own towns pay a caravan nothing at all; the ruling's flat
    // international table is the only thing on the board worth anything.
    expect(decision!.command).toMatchObject({ type: 'startRoute', toCityId: abroad.id });
    const chosen = decision!.candidates.find((row) => row.chosen)!;
    const home = decision!.candidates.filter(
      (row) => row.rejected === undefined && !row.label.includes('(Bors)'),
    );
    expect(chosen.score).toBeGreaterThan(0);
    for (const row of home) expect(row.score).toBeLessThan(chosen.score);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('keeps it at home when the origin’s shelves out-pay the crossing', () => {
    const { state, second, abroad } = threeTowns(SHELVES);
    const decision = decisionOfType(state, 0, 'startRoute');
    expect(decision).not.toBeNull();
    // The same three towns, the same neighbour, the same rules — only the
    // shelves moved, and the answer moved with them. That is greed rather than
    // a preference for or against a border.
    expect(decision!.command).toMatchObject({ type: 'startRoute', toCityId: second.id });
    expect((decision!.command as { toCityId: number }).toCityId).not.toBe(abroad.id);
    // And the crossing was weighed rather than skipped: it is on the table,
    // scored, and beaten.
    const chosen = decision!.candidates.find((row) => row.chosen)!;
    const crossings = decision!.candidates.filter(
      (row) => row.rejected === undefined && row.label.includes('(Bors)'),
    );
    expect(crossings.length).toBeGreaterThan(0);
    for (const row of crossings) expect(row.score).toBeLessThan(chosen.score);
    expect(applyCommand(state, decision!.command).ok).toBe(true);
  });

  it('takes the best-scoring pair it weighed, and every term folds to its score', () => {
    const { state } = threeTowns(SHELVES);
    const decision = decisionOfType(state, 0, 'startRoute');
    expect(decision).not.toBeNull();
    const scored = decision!.candidates.filter((row) => row.rejected === undefined);
    // Both directions of the home pair and both crossings were weighed, not just
    // the first legal one.
    expect(scored.length).toBeGreaterThan(1);
    const chosen = scored.find((row) => row.chosen);
    expect(chosen).toBeDefined();
    for (const row of scored) {
      // `decision.ts`' first rule, which `aiDecision.slow.test.ts` walks over a
      // whole game and this pins on the arm that just learnt to score.
      expect(foldTerms(row.terms)).toBe(row.score);
      expect(row.score).toBeLessThanOrEqual(chosen!.score);
    }
    // And the summary is no longer the old confession.
    expect(decision!.summary).not.toMatch(/does not price routes/);
    expect(decision!.summary).toMatch(/the best of \d+ pairs/);
  });

  it('prices a foreign partner by the sender’s books and a home one by the destination’s', () => {
    const { state } = threeTowns(SHELVES);
    const decision = decisionOfType(state, 0, 'startRoute');
    expect(decision).not.toBeNull();
    const labels = decision!.candidates.map((row) => labelsOf(row.terms)).join(' || ');
    expect(labels).toMatch(/what a foreign market pays the seat that sent it/);
    expect(labels).toMatch(/banks off .*’s shelves|banks off .*'s shelves/);
  });
});

// --- 2. a work's second-order gifts -----------------------------------------

describe('a great person’s work', () => {
  /** A town, a piece standing in it, and two owned hexes either side of it. */
  function ground(): { state: GameState; city: City; unit: ReturnType<typeof createUnit> } {
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    own(state, city, 4, 5);
    own(state, city, 6, 5);
    const unit = createUnit(state, 0, 'settler', city.col, city.row);
    return { state, city, unit };
  }

  function rank(state: GameState, unit: ReturnType<typeof createUnit>, work: 'academy' | 'citadel') {
    const player = seat(state, 0);
    return rankWorkSites(state, player, valueContext(state, player), work, unit, 2);
  }

  it('scores a hex whose seam it would open above the same ground without one', () => {
    const { state, unit } = ground();
    // The two hexes are identical ground; only one has a seam nobody has opened.
    at(state.map, 6, 5).resource = 'gems';
    const ranked = rank(state, unit, 'academy');
    const withSeam = ranked.find((row) => row.entry.col === 6 && row.entry.row === 5);
    const without = ranked.find((row) => row.entry.col === 4 && row.entry.row === 5);
    expect(withSeam).toBeDefined();
    expect(without).toBeDefined();
    expect(withSeam!.score).toBeGreaterThan(without!.score);
    expect(labelsOf(withSeam!.terms)).toMatch(/it opens the Gems under it/);
    expect(labelsOf(without!.terms)).not.toMatch(/opens the/);
    // The score is still the fold of its own terms, gifts and walk included.
    for (const row of ranked) expect(foldTerms(row.terms)).toBe(row.score);
  });

  it('says nothing about a bonus seam, whose whole worth is on its own hex', () => {
    const { state, unit } = ground();
    // Wheat is not "held" by anybody in the sense a luxury is: the delta above
    // has already counted the only thing it pays.
    at(state.map, 6, 5).resource = 'wheat';
    const ranked = rank(state, unit, 'academy');
    const withSeam = ranked.find((row) => row.entry.col === 6 && row.entry.row === 5);
    expect(withSeam).toBeDefined();
    expect(labelsOf(withSeam!.terms)).not.toMatch(/it opens the/);
  });

  it('says nothing about a seam the empire already holds', () => {
    const { state, city, unit } = ground();
    at(state.map, 6, 5).resource = 'gems';
    // A second gems seam, already opened by the improvement that opens it: the
    // empire can name gems, so a third copy is not the gift it was.
    const held = own(state, city, 5, 6);
    held.resource = 'gems';
    held.improvement = 'mine';
    const ranked = rank(state, unit, 'academy');
    const withSeam = ranked.find((row) => row.entry.col === 6 && row.entry.row === 5);
    const without = ranked.find((row) => row.entry.col === 4 && row.entry.row === 5);
    expect(withSeam).toBeDefined();
    expect(labelsOf(withSeam!.terms)).not.toMatch(/it opens the/);
    expect(withSeam!.score).toBe(without!.score);
  });

  it('prices a citadel’s defender line off the knob in data/ai.json', () => {
    const { state, unit } = ground();
    const ranked = rank(state, unit, 'citadel');
    expect(ranked.length).toBeGreaterThan(0);
    const defense = improvementDef('citadel').defense ?? 0;
    expect(defense).toBeGreaterThan(0);
    const knob = aiJson.workers.workDefenseValue;
    const line = ranked[0]!.terms.find((term) => term.label.includes('strength for whoever holds'));
    expect(line).toBeDefined();
    // The number is the row's own defence times the data file's knob — not a
    // literal in `plan.ts`, which is the rule the whole tuning surface keeps.
    expect(line!.value).toBe(defense * knob);
    for (const row of ranked) expect(foldTerms(row.terms)).toBe(row.score);
  });

  it('gives a work with no defence line no defence term', () => {
    const { state, unit } = ground();
    const ranked = rank(state, unit, 'academy');
    expect(improvementDef('academy').defense).toBeUndefined();
    expect(labelsOf(ranked[0]!.terms)).not.toMatch(/strength for whoever holds/);
  });

  it('keeps the knob in the data file rather than in the code', async () => {
    const sources = import.meta.glob('../../src/ai/plan.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const source = Object.values(sources)[0]!;
    expect(source).toMatch(/workers\.workDefenseValue/);
    // And the sheet the bot actually reads carries it.
    expect(typeof aiJson.workers.workDefenseValue).toBe('number');
  });
});

// --- 3. the ghost's tile lines ----------------------------------------------

describe('the hypothetical building’s own tile lines', () => {
  /** A town beside water, working one water hex. */
  function coastal(): { state: GameState; city: City } {
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    const water = own(state, city, 6, 5);
    water.terrain = 'coast';
    // The one hex it works, written down rather than assigned: which citizen
    // stands where is `cities.test.ts`' subject, not this one's.
    city.workedTiles = [{ col: 6, row: 5 }];
    return { state, city };
  }

  it('sees a lighthouse’s coastal food, which is the whole worth of the row', () => {
    const { state, city } = coastal();
    const now = foldCity(state, city);
    const withIt = foldCity(state, city, ['lighthouse']);
    // +2💰 off the row itself, and the +1🌾 on the water hex that used to be
    // invisible to the what-if (2026-09-04).
    expect(withIt.food - now.food).toBe(1);
    expect(withIt.gold - now.gold).toBeGreaterThan(now.gold - now.gold);
  });

  it('promises exactly what building it actually pays', () => {
    const { state, city } = coastal();
    const promised = foldCity(state, city, ['lighthouse']);
    // The ghost-city reading (`explainBuildingPreview`'s idiom) and the
    // hypothetical parameter are now the same answer, which is what "one
    // evaluator" means for a preview.
    const ghost: City = { ...city, buildings: [...city.buildings, 'lighthouse' as BuildingId] };
    expect(foldCity(state, ghost)).toEqual(promised);
    // And so is the town once the thing is actually standing in it.
    city.buildings.push('lighthouse');
    bumpRevision(state);
    expect(foldCity(state, city)).toEqual(promised);
  });

  it('changes nothing about a reading that asked no what-if', () => {
    const { state, city } = coastal();
    const before = foldCity(state, city);
    // A hypothetical is a question, never a mutation: asking it leaves the town,
    // its shelves and its plain reading exactly where they were.
    foldCity(state, city, ['lighthouse']);
    foldCity(state, city, ['harbour']);
    expect(city.buildings).toEqual([]);
    expect(foldCity(state, city)).toEqual(before);
    expect(foldCity(state, city, [])).toEqual(before);
  });
});

// --- 4. the scout brake -----------------------------------------------------

describe('a further scout', () => {
  /**
   * One town, `rangers` scouts already out, on a given turn.
   *
   * At least one ranger in every case on purpose: with none at all the opening
   * book answers the town before anything is weighed (`openingScout`), and the
   * book is a ruling rather than an appraisal — it is not what this is about.
   */
  function ranging(rangers: number, turn: number): GameState {
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    state.turn = turn;
    for (let index = 0; index < rangers; index++) {
      createUnit(state, 0, 'scout', city.col, city.row + 1 + index);
    }
    seat(state, 0).gold = 200;
    bumpRevision(state);
    return state;
  }

  function scoutRow(state: GameState): BotCandidate {
    const decision = decisionOfType(state, 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    return candidate(decision!, 'Scout');
  }

  it('is charged a printed penalty once the empire is already at the cap', () => {
    const cap = aiJson.military.scoutCap;
    const glutted = scoutRow(ranging(cap + 1, 0));
    // Not a silent `null` and not merely a lower place in the list: the charge
    // is a term a reader of the feed can see, and it takes the candidate below
    // zero so nothing this town could start loses to it.
    expect(labelsOf(glutted.terms)).toMatch(/already ranging — this empire wants no more than/);
    expect(glutted.score).toBeLessThan(0);
    expect(foldTerms(glutted.terms)).toBe(glutted.score);
  });

  it('is worth having while the map is dark and the empire is under the cap', () => {
    const young = scoutRow(ranging(1, 0));
    expect(young.score).toBeGreaterThan(0);
    expect(labelsOf(young.terms)).toMatch(/the opening wants eyes/);
    expect(labelsOf(young.terms)).not.toMatch(/already ranging — this empire wants no more/);
    // And the same board with a glut of them is the same piece, priced far
    // below it — the whole of the ruling in one comparison.
    expect(scoutRow(ranging(aiJson.military.scoutCap + 1, 0)).score).toBeLessThan(young.score);
  });

  it('fades with the turn count even while the empire is under the cap', () => {
    const early = scoutRow(ranging(1, 0));
    const later = scoutRow(ranging(1, 20));
    expect(labelsOf(early.terms)).toMatch(/a lit map has less left to find/);
    expect(labelsOf(later.terms)).toMatch(/a lit map has less left to find/);
    expect(later.score).toBeLessThan(early.score);
    expect(later.score).toBeGreaterThan(0);
    // The decay is a divide by `1 + turn × scoutDecayPerTurn`, so twenty turns
    // at 0.05 is exactly half. Read off the term rather than off the score,
    // which also carries the build effort and the upkeep.
    const decay = findTerm(later.terms, /a lit map has less left to find/);
    expect(decay!.op).toBe('div');
    expect(decay!.value).toBe(1 + 20 * aiJson.military.scoutDecayPerTurn);
    for (const row of [early, later]) expect(foldTerms(row.terms)).toBe(row.score);
  });
});

// --- 5. what a node's riders are worth --------------------------------------

describe('the beeline’s tech riders', () => {
  /**
   * A town whose ring is `wet` hexes of farmable river bank and the rest dry,
   * with the road to Irrigation and to a rule-carrying node already walked.
   *
   * The ring is `foundCityAt`'s own claim — the ground the empire holds — which
   * is exactly the bound `surveyUpgradeSites` sweeps.
   */
  function riverside(wet: number): GameState {
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    const ring: [number, number][] = [
      [4, 5],
      [6, 5],
      [5, 4],
      [5, 6],
      [4, 4],
      [4, 6],
    ];
    for (let index = 0; index < ring.length; index++) {
      const tile = own(state, city, ring[index]![0], ring[index]![1]);
      tile.freshwater = index < wet;
    }
    const player = seat(state, 0);
    for (const goal of ['agriculture', 'irrigation', 'epicPoetry'] as const) {
      for (const step of researchExpansion(state, 0, goal)) {
        if (step === goal && goal !== 'agriculture') continue;
        if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
        bumpRevision(state);
      }
    }
    player.gold = 200;
    bumpRevision(state);
    return state;
  }

  function techRow(state: GameState, name: string): BotCandidate {
    const decision = decisionOfType(state, 0, 'chooseResearch');
    expect(decision).not.toBeNull();
    return candidate(decision!, name);
  }

  it('prices Irrigation by the river bank that would actually collect it', () => {
    // Re-aimed 2026-09-04 (the potential weight): the rider is two terms now,
    // and on a board where nothing is ploughed the whole of it is the buildable
    // half — the same proportionality, read off the promise's own line.
    const bank = /Farm renewal — on \d+ hexes? that can drink this empire could put one on/;
    const dry = findTerm(techRow(riverside(0), 'Irrigation').terms, bank);
    const damp = findTerm(techRow(riverside(2), 'Irrigation').terms, bank);
    const wet = findTerm(techRow(riverside(5), 'Irrigation').terms, bank);
    // A term on every board, so a reader can tell "worth nothing here" from "a
    // family this appraisal has never heard of".
    for (const term of [dry, damp, wet]) expect(term).not.toBeNull();
    expect(dry!.value).toBe(0);
    expect(damp!.value).toBeGreaterThan(0);
    // Proportional: the count is the multiplier, and the rider's bag is the
    // same on every hex.
    expect(wet!.value).toBeCloseTo(damp!.value * 2.5, 10);
    expect(labelsOf([wet!])).toMatch(/on 5 hexes that can drink/);
  });

  it('counts the farms already standing apart from the ground that could take one', () => {
    // Re-aimed 2026-09-05 (the delay discount; the flat potential weight before
    // it). Six river-bank hexes; two of them already ploughed. Both halves still
    // collect the day the node lands, but they are no longer worth the same: the
    // two standing farms are a fact and the four bare banks are a promise a walk
    // away, folded `2 + d × 4` against the bare board's `0 + d × 6`, `d` being
    // the walk's own discount.
    const ploughed = riverside(6);
    for (const [col, row] of [
      [4, 5],
      [6, 5],
    ] as const) {
      at(ploughed.map, col, row).improvement = 'farm';
    }
    const walk = SPADE_DISCOUNT;
    const rows = techRow(ploughed, 'Irrigation').terms;
    const standing = findTerm(rows, /Farm renewal — on \d+ hexes? that can drink already carrying one/);
    const buildable = findTerm(rows, /Farm renewal — on \d+ hexes? that can drink this empire could put one on/);
    expect(labelsOf([standing!])).toMatch(/on 2 hexes that can drink already carrying one/);
    expect(labelsOf([buildable!])).toMatch(/on 4 hexes that can drink this empire could put one on/);
    // The rider's bag per hex, read off the standing line, prices both.
    const each = standing!.value / 2;
    expect(buildable!.value).toBeCloseTo(each * 4 * walk, 10);
    // And the ploughed board is worth strictly more than the bare one: two
    // farms in the ground beat two farms somebody has still to walk out and lay.
    const bare = findTerm(
      techRow(riverside(6), 'Irrigation').terms,
      /Farm renewal — on \d+ hexes? that can drink this empire could put one on/,
    );
    expect(standing!.value + buildable!.value).toBeGreaterThan(bare!.value);
    expect(bare!.value).toBeCloseTo(each * 6 * walk, 10);
  });

  it('prices a node that carries its own rules through the card reader', () => {
    const row = techRow(riverside(3), 'Epic Poetry');
    const rules = findTerm(row.terms, /the rules the node itself carries/);
    expect(rules).not.toBeNull();
    expect(rules!.value).not.toBe(0);
    expect(foldTerms(row.terms)).toBe(row.score);
  });

  it('leaves every candidate folding to its own score', () => {
    const decision = decisionOfType(riverside(4), 0, 'chooseResearch');
    expect(decision).not.toBeNull();
    const scored = decision!.candidates.filter((row) => row.rejected === undefined);
    expect(scored.length).toBeGreaterThan(1);
    for (const row of scored) expect(foldTerms(row.terms)).toBe(row.score);
  });
});

// --- 6. the sighted levy ----------------------------------------------------

describe('the wanted army reads what the seat has sighted', () => {
  /**
   * One town at the standing levy — `military.armyPerCity` soldiers for one
   * city, one of them its garrison — with camps written onto the board.
   *
   * Both soldiers are **fortified**, which is what makes the claim a claim: a
   * fortified piece is not idle (`unitAwaitsOrders`), so the seat's next
   * decision is the town's queue rather than a march that would walk one of them
   * onto the very camp under test.
   *
   * Turn 50 puts the board past `military.scoutEarlyTurns`, so the opening book
   * (`openingScout`) does not answer the town before anything is weighed.
   */
  function levy(camps: readonly [number, number][]): GameState {
    const state = bench(1);
    state.turn = 50;
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    for (const [col, row] of [
      [city.col, city.row],
      [city.col + 1, city.row],
    ] as const) {
      const piece = createUnit(state, 0, 'warrior', col, row);
      piece.fortifiedTurns = 0;
    }
    for (const [col, row] of camps) state.camps.push({ col, row, foundedTurn: 0 });
    recomputeAllVisibility(state);
    return state;
  }

  /** The soldier row of this town's build table, or `null` when it has none. */
  function soldierRow(state: GameState): BotCandidate | null {
    const decision = decisionOfType(state, 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    return decision!.candidates.find((row) => row.label === 'Warrior') ?? null;
  }

  /**
   * **Re-aimed 2026-09-05, batch 4 of `docs/bot-priorities.md`.** These two used
   * to assert `toBeNull()` — the levy was a *gate*, and an army at its size
   * refused the candidate outright. The wage-aware levy replaced the gate with a
   * comparison, so the row is now present and *charged*: the surplus already
   * standing takes the soldier's own worth back off it, and what the assertion
   * checks is the charge rather than the absence.
   */
  it('charges a soldier the levy it already has, in a quiet world', () => {
    // Two towns' worth of levy for one town is exactly what is standing, so the
    // whole of the piece's worth is charged back and it is worth nothing at all.
    const row = soldierRow(levy([]));
    expect(row).not.toBeNull();
    expect(labelsOf(row!.terms)).toMatch(/100% of a levy already standing/);
    expect(row!.score).toBeLessThanOrEqual(0);
    expect(foldTerms(row!.terms)).toBe(row!.score);
  });

  it('wants one more once a camp near the town has been charted', () => {
    const row = soldierRow(levy([[5, 7]]));
    expect(row).not.toBeNull();
    // The appetite is printed, so a reader of the feed can see *why* the levy
    // grew rather than having to trust that it did.
    expect(labelsOf(row!.terms)).toMatch(/1 camp charted and 0 hostile pieces in sight/);
    expect(foldTerms(row!.terms)).toBe(row!.score);
  });

  it('counts nothing it has never seen — the same camp, off this seat’s chart', () => {
    // The whole of the fog honesty in one board: an identical camp, thirteen
    // hexes off, on ground no piece and no town of this empire has ever lit.
    const dark = levy([[18, 11]]);
    expect(isExploredBy(dark, 0, 18, 11)).toBe(false);
    // The charge is the *unsighted* levy's — a full one, exactly as the quiet
    // world's above, and strictly heavier than the charge the same camp in
    // sight would earn (the next assertion is that comparison, made by hand).
    const row = soldierRow(dark)!;
    expect(labelsOf(row.terms)).toMatch(/0 camps charted and 0 hostile pieces in sight/);
    expect(row.score).toBeLessThan(soldierRow(levy([[5, 7]]))!.score);
    // And the omniscient reading would have counted it: the camp is on the
    // board, it is simply not on this seat's map.
    expect(dark.camps).toHaveLength(1);
  });

  it('is capped, so a lit continent cannot talk an empire into an army', () => {
    // Ten charted camps at half a soldier each is five, over the cap of four.
    const many: [number, number][] = [];
    for (let index = 0; index < 10; index++) many.push([4 + (index % 3), 4 + Math.floor(index / 3)]);
    const state = levy(many);
    const ctx = valueContext(state, seat(state, 0));
    expect(ctx.sighted.camps).toBe(10);
    const wanted = 1 * aiJson.military.armyPerCity + Math.min(
      aiJson.threat.sightedArmyCap,
      ctx.sighted.camps * aiJson.threat.armyPerSightedCamp,
    );
    expect(wanted).toBe(aiJson.military.armyPerCity + aiJson.threat.sightedArmyCap);
  });
});

// --- 7. the unit mix --------------------------------------------------------

describe('the levy craves the trade it lacks', () => {
  /**
   * Two towns and a three-piece army of one trade, with the roads to the warrior
   * and the archer both walked.
   *
   * Two towns rather than one so the standing levy (`armyPerCity` × 2 = four)
   * leaves room for a fourth piece: the mix is a *term*, and a term nobody can
   * reach because the cap closed the branch is a term nobody can test.
   */
  function army(kind: 'warrior' | 'archer'): GameState {
    const state = bench(1);
    state.turn = 50;
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    foundCityAt(state, 0, at(state.map, 12, 5));
    seat(state, 0).techsResearched.push('agriculture', 'fletching');
    bumpRevision(state);
    for (let index = 0; index < 3; index++) {
      const piece = createUnit(state, 0, kind, city.col, city.row + 1 + index);
      piece.fortifiedTurns = 0;
    }
    recomputeAllVisibility(state);
    return state;
  }

  function row(state: GameState, name: string): BotCandidate {
    const decision = decisionOfType(state, 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    return candidate(decision!, name);
  }

  const CRAVING = /in this army (?:is|are) \w+, and the mix wants/;

  it('pays a bow a craving in an army of spearmen, and charges the next spearman', () => {
    const melee = army('warrior');
    const bow = findTerm(row(melee, 'Archer').terms, CRAVING);
    const spear = findTerm(row(melee, 'Warrior').terms, CRAVING);
    expect(bow).not.toBeNull();
    expect(spear).not.toBeNull();
    // The whole army is melee, so the bow is paid its whole target share and the
    // spearman is charged everything the other three trades were owed.
    expect(bow!.value).toBeGreaterThan(0);
    expect(spear!.value).toBeLessThan(0);
    expect(bow!.value).toBeCloseTo(aiJson.military.mixBonus * aiJson.military.mix.ranged, 10);
    expect(spear!.value).toBeCloseTo(aiJson.military.mixBonus * (aiJson.military.mix.melee - 1), 10);
  });

  it('reads the same sentence backwards in an army of bowmen', () => {
    const ranged = army('archer');
    expect(findTerm(row(ranged, 'Archer').terms, CRAVING)!.value).toBeLessThan(0);
    expect(findTerm(row(ranged, 'Warrior').terms, CRAVING)!.value).toBeGreaterThan(0);
  });

  it('scores the same bow higher in the army that has none of them', () => {
    // The mirror, and the claim the ruling actually makes: two boards identical
    // but for what the three standing pieces are, and the candidate the empire
    // lacks is worth more. Everything else — the age, the treasury, the town,
    // the build effort — is the same on both.
    const wanted = row(army('warrior'), 'Archer');
    const glutted = row(army('archer'), 'Archer');
    expect(wanted.score).toBeGreaterThan(glutted.score);
    // And the term is a term, not a gate: the over-served bow is still on the
    // table, still scored, still readable.
    expect(glutted.rejected).toBeUndefined();
    for (const entry of [wanted, glutted]) expect(foldTerms(entry.terms)).toBe(entry.score);
  });

  it('leaves every soldier row folding to its own score', () => {
    const decision = decisionOfType(army('warrior'), 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    const scored = decision!.candidates.filter((entry) => entry.rejected === undefined);
    expect(scored.length).toBeGreaterThan(1);
    for (const entry of scored) expect(foldTerms(entry.terms)).toBe(entry.score);
  });
});

// --- 8. the delay discount --------------------------------------------------

/**
 * **The delay discount** (`docs/bot-priorities.md`, batch 2, 2026-09-05):
 * `max(0, (H − delay) / H)` at every site that used to multiply a promise by the
 * flat potential weight, `H` being `priorities.horizonTurns`.
 *
 * The ruling's emphasis is unchanged and the arithmetic underneath it is not:
 * the seat is still allowed to want what it cannot yet collect, a reader of the
 * feed must still be able to see how much less it wants it — but *how much less*
 * is now a reading rather than a constant, and each site reads a different
 * thing. So four of the claims below are about a *term* and its printed turns:
 * the beeline's per-town building gift waits for the towns to raise the row, a
 * node's renewal riders wait for a spade to walk, a counted card's buildable
 * subjects wait for the same raising, and a worker's anticipation waits for the
 * beakers. The fifth is the one that stopped discounting: a `tally` forecast is
 * an estimate over the horizon already, and multiplying it was doubt charged
 * twice.
 */
describe('the delay discount', () => {
  /** A blank board with `count` towns of the seat's, nothing built in any. */
  function towns(count: number): { state: GameState; player: Player; cities: City[] } {
    const state = bench(1);
    const cities: City[] = [];
    for (let index = 0; index < count; index++) {
      cities.push(foundCityAt(state, 0, at(state.map, 2 + index * 3, 5)));
    }
    recomputeAllVisibility(state);
    return { state, player: seat(state, 0), cities };
  }

  /** The first Order in the table that watches an occasion. Never a name. */
  function growingCard(): OrderId {
    for (const id of ORDER_IDS) {
      for (const effect of anyCardDef(id).effects ?? []) {
        if (effect.kind === 'pays' && effect.count === 'tally') return id;
      }
    }
    throw new Error('no growing card in the Order table');
  }

  /** The building row a printed gift term names, found by the name it printed. */
  function rowNamed(label: string): BuildingId {
    const name = label.split(' — ')[0]!;
    for (const id of BUILDING_IDS) {
      if (buildingDef(id).name === name) return id;
    }
    throw new Error(`no building called ${name}`);
  }

  it('discounts the beeline’s per-town building gift by the whole chain’s wait', () => {
    // **Re-aimed 2026-09-05** (batch 3 of `docs/bot-priorities.md` — the tech
    // chain). The wait a building gift is discounted for used to be one row's
    // own build; it is now the *chain's*: the beakers still owed over the
    // science rate, and then every step queued ahead of this one. So the pin is
    // the relation — the delay is at least the row's own raising — plus the
    // arithmetic, which is still exactly `(H − delay)/H` read off the very turns
    // the term prints.
    const { state } = towns(2);
    const decision = decisionOfType(state, 0, 'chooseResearch');
    expect(decision).not.toBeNull();
    const row = decision!.candidates.find(
      (entry) => findTerm(entry.terms, /its flat yields, in every town/) !== null,
    );
    expect(row).toBeDefined();
    const flats = findTerm(row!.terms, /its flat yields, in every town/)!;
    // The discount is a term of its own, beside the town count it discounts —
    // not a number folded into the value where nobody can see it — and it prints
    // the turns it was read off. Matched on the horizon clause, which is
    // `delayTerm`'s and nothing else's.
    const discount = flats.parts!.find((term) => /against a \d+-turn horizon/.test(term.label));
    expect(discount).toBeDefined();
    expect(discount!.op).toBe('mul');
    expect(discount!.label).toMatch(/to raise it/);
    const printed = Number(
      /some ([\d.]+) turns against a (\d+)-turn horizon/.exec(discount!.label)![1],
    );
    expect(discount!.value).toBeCloseTo(discountFor(printed), 2);
    // At least the row's own raising: the chain charges that and the research
    // wait besides.
    expect(printed).toBeGreaterThanOrEqual(
      raisingTurns(buildingProductionCost(rowNamed(flats.label), state, 0), state, 0),
    );
    // And the term is still its own arithmetic, as is the candidate holding it.
    expect(foldTerms(flats.parts!)).toBeCloseTo(flats.value, 10);
    expect(foldTerms(row!.terms)).toBe(row!.score);
  });

  it('prices a promise past the horizon at nothing, and says so', () => {
    // The floor is the spec's own `max(0, H − delay)`, and it is worth pinning
    // on the arithmetic itself: no board can be relied on to hold a row nobody
    // could finish, and the claim is about the formula rather than about a seat.
    const { state, player } = towns(1);
    const ctx = valueContext(state, player);
    const far = delayTerm(HORIZON * 3, ctx, 'nobody alive will see it');
    expect(far.value).toBe(0);
    expect(far.label).toMatch(/^× 0 — nobody alive will see it, some \d+ turns against a 60-turn horizon$/);
    // And a promise that lands this very turn is worth the whole of itself.
    expect(delayTerm(0, ctx, 'it is already here').value).toBe(1);
  });

  it('folds a node’s renewal as standing + the walk’s discount × buildable', () => {
    // Five river-bank hexes, two of them already ploughed: 2 standing and 3
    // buildable. The standing farms wait for the node alone — a wait the
    // candidate's beaker denominator already charges — and the bare banks wait
    // for the node *and* a spade, which is the whole of the split.
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    const bank: [number, number][] = [
      [4, 5],
      [6, 5],
      [5, 4],
      [5, 6],
      [4, 4],
    ];
    for (const [col, row] of bank) own(state, city, col, row).freshwater = true;
    for (const [col, row] of bank.slice(0, 2)) at(state.map, col, row).improvement = 'farm';
    const player = seat(state, 0);
    for (const goal of ['agriculture', 'irrigation'] as const) {
      for (const step of researchExpansion(state, 0, goal)) {
        if (step === goal && goal !== 'agriculture') continue;
        if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
        bumpRevision(state);
      }
    }
    const decision = decisionOfType(state, 0, 'chooseResearch');
    expect(decision).not.toBeNull();
    const row = candidate(decision!, 'Irrigation');
    const standing = findTerm(row.terms, /already carrying one/)!;
    const buildable = findTerm(row.terms, /could put one on/)!;
    expect(labelsOf([standing])).toMatch(/on 2 hexes that can drink already carrying one/);
    expect(labelsOf([buildable])).toMatch(/on 3 hexes that can drink this empire could put one on/);
    const each = standing.value / 2;
    expect(each).toBeGreaterThan(0);
    expect(buildable.value).toBeCloseTo(each * 3 * SPADE_DISCOUNT, 10);
    expect(standing.value + buildable.value).toBeCloseTo(each * (2 + SPADE_DISCOUNT * 3), 10);
    // The walk is printed, crude estimate and all: the plan radius plus the turn
    // that lays the spade.
    expect(labelsOf([buildable])).toMatch(
      new RegExp(`the spades have still to get there, some ${aiJson.workers.planRadius + 1} turns`),
    );
    expect(foldTerms(row.terms)).toBe(row.score);
  });

  it('prices a counted card by what the empire counts, plus what raising the rest is worth', () => {
    // Six towns, two of which have already raised the row the card counts. The
    // other four could raise it today (`buildError` is null in a fresh town), so
    // the fold is 2 + d × 4 helpings — `d` the discount for the raising — and
    // the pin is that arithmetic, printed turns included.
    const { state, player, cities } = towns(6);
    for (const city of cities.slice(0, 2)) city.buildings.push('monument');
    bumpRevision(state);
    // The row's own gate is the simulation's: without Stonecraft `buildError`
    // refuses every town and the potential is honestly nought.
    for (const step of researchExpansion(state, 0, 'stonecraft')) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
      bumpRevision(state);
    }
    const effect: CardPaysEffect = {
      kind: 'pays',
      where: 'empire',
      basis: 'count',
      to: 'culture',
      amount: 1,
      count: 'buildingsOfKind',
      building: 'monument',
    };
    const ctx = valueContext(state, player);
    const appraisal = explainCounted(effect, ctx);
    expect(appraisal.terms[0]!.value).toBe(2);
    expect(labelsOf([appraisal.terms[0]!])).toMatch(/2 buildingsOfKind today/);
    // The folded price (H10's age band), which is what the arm raises against.
    const turns = raisingTurns(buildingProductionCost('monument'), state, 0);
    const discount = discountFor(turns);
    expect(discount).toBeGreaterThan(0);
    expect(appraisal.terms[1]!.value).toBeCloseTo(4 * discount, 10);
    expect(labelsOf([appraisal.terms[1]!])).toMatch(/4 more the towns could raise/);
    // The promise's own arithmetic is a part list, so the discount and the turns
    // behind it are readable rather than folded into a number.
    expect(foldTerms(appraisal.terms[1]!.parts!)).toBeCloseTo(appraisal.terms[1]!.value, 10);
    expect(labelsOf(appraisal.terms[1]!.parts!)).toMatch(
      new RegExp(`the towns must still raise it, some ${turns} turns`),
    );
    const pays = appraisal.terms[appraisal.terms.length - 1]!;
    expect(pays.op).toBe('mul');
    expect(pays.value).toBeGreaterThan(0);
    expect(appraisal.total).toBeCloseTo((2 + discount * 4) * pays.value, 10);
    expect(foldTerms(appraisal.terms)).toBe(appraisal.total);
    // And the same card on a board where nothing is built anywhere is worth
    // strictly less: every subject a promise, and a promise waits.
    const bare = towns(6);
    expect(explainCounted(effect, valueContext(bare.state, bare.player)).total).toBeLessThan(
      appraisal.total,
    );
  });

  it('ranks a growing card by its own counter, not by a nominal guess', () => {
    const id = growingCard();
    const { state, player } = towns(1);
    const empty = explainCard(player, id, valueContext(state, player)).total;
    player.statecraft.tallies = [{ card: id, count: 12 }];
    const deep = explainCard(player, id, valueContext(state, player)).total;
    // The same row, the same board, twelve occasions apart — and until the
    // counted-card ruling the two numbers were equal.
    expect(deep).toBeGreaterThan(empty);
  });

  it('takes a tally forecast at face value — the estimate is not discounted twice', () => {
    // Batch 2's removal, pinned as arithmetic: nothing counted yet, a forecast
    // of `F` occasions to come, and two culture a helping. The card is worth
    // exactly `F × what two culture pays` — under the flat weight it was worth
    // four tenths of that, which was the forecast's own uncertainty charged a
    // second time.
    const { state, player } = towns(1);
    const ctx = valueContext(state, player);
    const id = growingCard();
    const known = TALLY_OCCASIONS[0]!;
    const forecast = aiJson.score.tallyForecast[known] ?? 0;
    expect(forecast).toBeGreaterThan(0);
    const appraisal = explainCounted(
      {
        kind: 'pays',
        where: 'empire',
        basis: 'count',
        to: 'culture',
        amount: 2,
        count: 'tally',
        tally: known,
      },
      ctx,
      id,
    );
    expect(appraisal.terms[0]!.value).toBe(0);
    const promise = appraisal.terms[1]!;
    expect(promise.value).toBe(forecast);
    expect(labelsOf([promise])).toMatch(new RegExp(`${forecast} more ${known} to come, over the horizon`));
    // Nothing multiplies the promise but the payout itself.
    const pays = appraisal.terms[appraisal.terms.length - 1]!;
    expect(pays.op).toBe('mul');
    expect(appraisal.total).toBeCloseTo(forecast * pays.value, 10);
    expect(foldTerms(appraisal.terms)).toBe(appraisal.total);
  });

  it('says out loud when it cannot forecast an occasion at all', () => {
    const { state, player } = towns(1);
    const ctx = valueContext(state, player);
    const id = growingCard();
    const pays = { where: 'empire', to: 'culture', amount: 1 } as const;
    // An occasion the table does not name is **visibly** unpriced rather than
    // quietly guessed at — which is what makes a sixth occasion safe to add.
    const unpriced = explainCounted(
      {
        kind: 'pays',
        basis: 'count',
        ...pays,
        count: 'tally',
        tally: 'aMomentNobodyHasPriced' as TallyOccasion,
      },
      ctx,
      id,
    );
    expect(unpriced.terms[1]!.value).toBe(0);
    expect(labelsOf([unpriced.terms[1]!])).toMatch(/no forecast/);
    expect(unpriced.total).toBe(0);
  });

  it('keeps no flat potential discount anywhere in the bot', () => {
    // The knob is gone from `data/ai.json` and from `aiConfig.ts`, and this is
    // the pin that keeps it gone: every promise in this bot is discounted by a
    // delay it can name, so a reader that resurrected a constant one would be
    // reintroducing the thing batch 2 retired.
    const files = Object.keys(AI_SOURCES);
    expect(files.length).toBeGreaterThan(4);
    for (const path of files) {
      expect(AI_SOURCES[path], path).not.toMatch(/potentialWeight/);
    }
    expect(JSON.stringify(aiJson.score)).not.toMatch(/potentialWeight/);
  });

  it('anticipates a renewal only while the technology is on the seat’s own plan', () => {
    // One river-bank hex a farm could go on, and the seat's declared plan the
    // only thing that changes between the two readings.
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    const tile = own(state, city, 4, 5);
    tile.freshwater = true;
    const player = seat(state, 0);
    for (const step of researchExpansion(state, 0, 'irrigation')) {
      if (step === 'irrigation') continue;
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
      bumpRevision(state);
    }
    const entryFor = (): PlanEntry | undefined => {
      const ctx = valueContext(state, player);
      const plan = buildImprovementPlan(state, player, ctx);
      return plan.byTile.get(tileIndex(state.map, tile.col, tile.row));
    };

    player.researching = 'irrigation';
    // Re-aimed 2026-09-05 (the delay discount): the anticipation is now worth
    // what the *wait* leaves of it, and a one-town bench banking a beaker a turn
    // is two centuries from Irrigation. The pool put twenty beakers short of the
    // node is what makes this a claim about the plan rather than about the wait.
    player.sciencePool = techDef('irrigation').cost - 20;
    const anticipated = entryFor();
    expect(anticipated).toBeDefined();
    const term = findTerm(anticipated!.terms, /is on the plan/);
    expect(term).not.toBeNull();
    expect(term!.value).toBeGreaterThan(0);
    expect(foldTerms(anticipated!.terms)).toBe(anticipated!.value);

    // The plan cleared, and the same hex is worth what it pays today and no more
    // — no tree lookahead, only what the seat has actually declared.
    player.researching = null;
    player.researchQueue = [];
    const plain = entryFor();
    expect(plain).toBeDefined();
    expect(findTerm(plain!.terms, /is on the plan/)).toBeNull();
    expect(plain!.value).toBeLessThan(anticipated!.value);
    expect(anticipated!.value - plain!.value).toBeCloseTo(term!.value, 10);
  });

  it('moves the anticipation’s delay with the beakers the seat actually banks', () => {
    // The same hex, the same declared plan, and the only thing that changes is
    // how fast the node arrives: a pool halfway to the node is a node half as
    // far off, and the rider is worth more for it. Under the flat weight both
    // readings were the identical number.
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    const tile = own(state, city, 4, 5);
    tile.freshwater = true;
    const player = seat(state, 0);
    for (const step of researchExpansion(state, 0, 'irrigation')) {
      if (step === 'irrigation') continue;
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
      bumpRevision(state);
    }
    player.researching = 'irrigation';
    const riderTerm = (): ValueTerm => {
      const ctx = valueContext(state, player);
      const plan = buildImprovementPlan(state, player, ctx);
      const entry = plan.byTile.get(tileIndex(state.map, tile.col, tile.row));
      expect(entry).toBeDefined();
      const term = findTerm(entry!.terms, /is on the plan/);
      expect(term).not.toBeNull();
      return term!;
    };

    // Twenty beakers short of the node, and one beaker a turn: twenty turns out.
    player.sciencePool = techDef('irrigation').cost - 20;
    const slow = riderTerm();
    // The same twenty beakers owed, and a library standing: the node arrives in
    // a third of the turns and the rider is worth more for it. Nothing about the
    // hex, the plan or the node changed — only the rate.
    city.buildings.push('library');
    bumpRevision(state);
    const quick = riderTerm();
    expect(quick.value).toBeGreaterThan(slow.value);
    // And the turns are printed on both, so the feed says why the number moved.
    const turnsOf = (term: ValueTerm): number => {
      const discount = term.parts!.find((part) => /the node has still to land/.test(part.label))!;
      const match = /some ([\d.]+) turns/.exec(discount.label);
      expect(match).not.toBeNull();
      return Number(match![1]);
    };
    expect(turnsOf(quick)).toBeLessThan(turnsOf(slow));
  });
});

// --- 9. the tech chain, and the margin that defends it ----------------------

/**
 * **Batch 3 of `docs/bot-priorities.md`** — the chain (`src/ai/chain.ts`) and the
 * switching margin that finally reads `priorities.switchMargin`.
 *
 * Four claims, and each is about arithmetic rather than about a played game:
 *
 *   · a chain's **worth is the fold of its printed terms**, exactly;
 *   · a **realised step drops out by construction**, and the chain is worth more
 *     for it — the sunk-cost story, pinned on the one row whose whole payout is
 *     its effects (the University pays no flat yield at all), so what leaves the
 *     ledger when a town raises one is the hammers and nothing else;
 *   · the **university fix**: a bench empire handed the technology raises the row
 *     it unlocked, in every town, because the chain says so;
 *   · the **margin** holds an incumbent a challenger has not beaten by a tenth,
 *     and yields to one that has. Both sides, off the same board.
 */
describe('the tech chain', () => {
  /**
   * A board with `count` towns of the seat's, a granted technology, and enough
   * hammers under the towns to have opinions with: every hex is hilly and every
   * town is grown, so a row's build turns are a handful rather than the whole
   * horizon and the chain's delays mean something.
   */
  function chained(count: number, tech?: TechId): { state: GameState; player: Player; cities: City[] } {
    const state = bench(1);
    for (const tile of state.map.tiles) tile.hills = true;
    const cities: City[] = [];
    for (let index = 0; index < count; index++) {
      cities.push(foundCityAt(state, 0, at(state.map, 2 + index * 4, 5)));
    }
    recomputeAllVisibility(state);
    for (const city of cities) {
      city.population = 6;
      refreshCityDerived(state, city);
    }
    const player = seat(state, 0);
    if (tech !== undefined) {
      for (const step of researchExpansion(state, 0, tech)) player.techsResearched.push(step);
      bumpRevision(state);
    }
    return { state, player, cities };
  }

  /** The technology whose name a candidate printed. Never a hand-written id. */
  function techNamed(name: string): TechId {
    for (const id of TECH_IDS) {
      if (techDef(id).name === name) return id;
    }
    throw new Error(`no technology called ${name}`);
  }

  it('folds every chain’s worth out of its own printed terms, exactly', () => {
    const { state, player } = chained(3, 'education');
    const ctx = valueContext(state, player);
    const chains = liveChains(state, player, ctx);
    expect(chains.length).toBeGreaterThan(0);
    for (const chain of chains) {
      // `===`, not `toBeCloseTo`: a regrouped sum is a different number and the
      // bot's contract is that the same board produces the same command.
      expect({ goal: chain.goal, folds: foldTerms(chain.terms) === chain.worth }).toEqual({
        goal: chain.goal,
        folds: true,
      });
    }
  });

  it('drops a realised step out, and is worth more for the one that was paid', () => {
    // **The commitment arithmetic.** Education's chain owes a University to every
    // town that lacks one. A University pays no flat yield — its whole payout is
    // `sciencePerPop` and a renown trickle, neither of which the chain multiplies
    // by towns — so raising one in one town takes nothing out of the payoff and
    // takes its whole 134 hammers out of what the chain still owes. The remaining
    // worth therefore rises, which is principle 1 of the spec: incumbency is
    // arithmetic, not memory.
    const { state, player, cities } = chained(3, 'education');
    const before = techChain(state, player, valueContext(state, player), 'education');
    const university = before.steps.find((step) => step.id === 'university');
    expect(university).toBeDefined();
    expect(university!.towns).toBe(3);

    cities[0]!.buildings.push('university');
    bumpRevision(state);
    const after = techChain(state, player, valueContext(state, player), 'education');
    expect(after.steps.find((step) => step.id === 'university')!.towns).toBe(2);
    expect(after.stepsRemaining).toBe(before.stepsRemaining - 1);
    expect(after.hammers).toBe(before.hammers - buildingProductionCost('university'));
    expect(after.worth).toBeGreaterThan(before.worth);
  });

  it('makes a held technology’s unbuilt rows a live chain — the university fix', () => {
    // The end of the loop the beeline used to leave open: an empire could bank
    // the whole "in every town" promise in the appraisal that chose the node and
    // then never raise the row. A technology held is a chain with **no beakers
    // left to pay** and its buildings still outstanding, so every town's build
    // arm sees them as steps — which is the next test, and the measured half of
    // it is in `docs/bot-priorities.md` (buildings standing at t75, 30 → 55).
    const { state, player, cities } = chained(2, 'letters');
    const ctx = valueContext(state, player);
    const chain = liveChains(state, player, ctx).find((live) => live.goal === 'letters');
    expect(chain).toBeDefined();
    expect(chain!.held).toBe(true);
    expect(chain!.remainingBeakers).toBe(0);
    const library = chain!.steps.find((step) => step.id === 'library');
    expect(library).toBeDefined();
    expect(library!.towns).toBe(cities.length);
    // And it stops being live the moment the empire has actually raised them:
    // the step is owed by nobody, so there is no step, and a chain with nothing
    // left to do is not in the book at all.
    for (const city of cities) city.buildings.push('library');
    bumpRevision(state);
    const after = liveChains(state, player, valueContext(state, player));
    const still = after.find((live) => live.goal === 'letters');
    expect(still?.steps.some((step) => step.id === 'library') ?? false).toBe(false);
  });

  it('prints the chain’s share on the candidate that is one of its steps', () => {
    // **The chain is read off the board rather than named** (batch P1). Which
    // engine is worth running is a balance reading that moves with every price
    // pass — the production standard moved it again, and the Writing engine
    // this case used to name stopped clearing its own hammers — while the claim
    // under test is the mechanism: a candidate that *is* a step of a live chain
    // carries the chain's share as a printed term of its own fold.
    const { state } = chained(2, 'letters');
    const decision = decisionOfType(state, 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    const ctx = valueContext(state, seat(state, 0));
    const owns = (chain: { steps: readonly { name: string }[] }): boolean =>
      chain.steps.some((step) => decision!.candidates.some((row) => row.label === step.name));
    const chain = ctx.chains.find(owns);
    expect(chain, 'no live chain owns a candidate on this board').toBeDefined();
    const step = chain!.steps.find((one) =>
      decision!.candidates.some((row) => row.label === one.name),
    )!;
    const candidate = decision!.candidates.find((row) => row.label === step.name)!;
    const share = findTerm(
      candidate.terms,
      new RegExp(`a step of the ${techDef(chain!.goal).name} engine`),
    );
    expect(share).not.toBeNull();
    expect(share!.label).toMatch(/one of \d+ things? still to happen/);
    expect(foldTerms(candidate.terms)).toBe(candidate.score);
  });

  it('holds the plan against a challenger inside the margin, and yields past it', () => {
    // **Both sides of the boundary, off one board.** With no plan installed the
    // table has a leader; installing a *different* goal as the plan puts the
    // printed `× switchMargin` term on it, and whether it survives is exactly
    // whether the leader beat it by that much.
    //
    // The seat is handed **Sailing** before the table is taken, and that is the
    // fixture rather than an aside: on a blank bench Sailing outscores the tree
    // two to one, so it is held to get it out of the way, and what the claim
    // needs beyond that is a near-tie at the top with a clear third behind it.
    // The held set has moved with the balance — four over two passes, two on
    // batch P1, and **one on batch X2**, which is the re-aim this comment
    // records. Evaluating a clause's scope took the Currency chain's own
    // scope-blind windfall out of the table, and with Currency no longer running
    // away it does not need holding: the near-tie is Bronze Panoply against
    // Bronzeworking (within the margin, which keeps the plan) with Divination a
    // clear step behind it (outside, which does not). No claim moved; the board
    // the claim is made on did.
    const { state } = chained(3, 'sailing');
    const opening = decisionOfType(state, 0, 'chooseResearch');
    expect(opening).not.toBeNull();
    const scored = opening!.candidates.filter((row) => row.rejected === undefined);
    const winner = scored.find((row) => row.chosen)!;
    const margin = aiJson.priorities.switchMargin;
    const trials = scored
      .filter((row) => row.label !== winner.label)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    let held: BotCandidate | null = null;
    let yielded: BotCandidate | null = null;
    for (const row of trials) {
      const id = techNamed(row.label);
      expect(
        applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: id, queue: 'replace' }).ok,
      ).toBe(true);
      if (bestTechGoal(state, seat(state, 0)) === id) held = held ?? row;
      else yielded = yielded ?? row;
    }
    expect(held).not.toBeNull();
    expect(yielded).not.toBeNull();
    // The boundary itself, read off the scores the table printed with no
    // incumbent: what held was inside the margin of the leader, what yielded was
    // outside it. That is the whole of `priorities.switchMargin`.
    expect(held!.score * margin).toBeGreaterThanOrEqual(winner.score);
    expect(yielded!.score * margin).toBeLessThan(winner.score);
    // And with the leader itself installed there is nothing to defend against.
    const free = techNamed(winner.label);
    expect(
      applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: free, queue: 'replace' }).ok,
    ).toBe(true);
    expect(bestTechGoal(state, seat(state, 0))).toBe(free);
  });

  it('prints the margin as a term of the incumbent’s own arithmetic', () => {
    // The margin is not a rule applied over the table — it is a term *inside*
    // the incumbent's own fold, so the argmax below it is a plain maximum and
    // the feed shows a reader exactly what the plan was defended by.
    const { state } = chained(3, 'sailing');
    const opening = decisionOfType(state, 0, 'chooseResearch');
    expect(opening).not.toBeNull();
    const scored = opening!.candidates.filter((row) => row.rejected === undefined);
    // A laggard, so the table is still asked for (an incumbent that keeps the
    // plan sends no command at all — the beeline is idempotent by construction).
    const laggard = scored.sort((a, b) => a.score - b.score)[0]!;
    const id = techNamed(laggard.label);
    expect(
      applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: id, queue: 'replace' }).ok,
    ).toBe(true);
    const player = seat(state, 0);
    // `incumbentGoal` is the plan's own last node, derived and never stored.
    expect(incumbentGoal(player)).toBe(id);
    const again = decisionOfType(state, 0, 'chooseResearch');
    expect(again).not.toBeNull();
    const row = again!.candidates.find((entry) => entry.label === laggard.label)!;
    const term = row.terms[row.terms.length - 1]!;
    expect(term.label).toMatch(/holds the plan; a challenger must beat it by that much/);
    expect(term.op).toBe('mul');
    expect(term.value).toBe(aiJson.priorities.switchMargin);
    // And the score is still the fold of the terms, margin included.
    expect(foldTerms(row.terms)).toBe(row.score);
    expect(foldTerms(row.terms.slice(0, -1)) * term.value).toBeCloseTo(row.score, 10);
  });
});

// --- 10. the expansion chain and the constraint prices -----------------------

/**
 * **Batch 4 of `docs/bot-priorities.md`** — the expansion chain, the two
 * constraint prices, and the levy that became a comparison.
 *
 * Every claim is made about *one board somebody arranged*, for this file's own
 * stated reason. The two arrangements the section needs are one town (an empire
 * with writ to spare) and two towns (an empire whose third would over-spend it):
 * the palace supplies four points of writ, a capital costs nothing, and every
 * further town costs three — so a second town leaves one point standing and a
 * third asks for three, which is a shortfall of exactly two that no reading has
 * to be tuned to produce.
 */
describe('the expansion chain', () => {
  /** Towns on the bench, in a row, with room to found more inside the radius. */
  function settled(towns: number): GameState {
    const state = bench(1, { width: 30, height: 16 });
    // Past `military.scoutEarlyTurns`, so the opening book (`openingScout`) does
    // not answer the town before anything is weighed.
    state.turn = 50;
    for (let index = 0; index < towns; index++) {
      const city = foundCityAt(state, 0, at(state.map, 3 + index * 5, 6));
      city.population = 4;
      refreshCityDerived(state, city);
    }
    recomputeAllVisibility(state);
    return state;
  }

  it('folds its worth out of its own printed terms, exactly', () => {
    const state = settled(1);
    const chain = valueContext(state, seat(state, 0)).expansion;
    expect(chain).not.toBeNull();
    expect(foldTerms(chain!.terms)).toBe(chain!.worth);
    // The site is a legal one the simulation itself would accept, and the walk
    // is what the chain is discounted for.
    expect(chain!.site.distance).toBeGreaterThan(0);
    expect(labelsOf(chain!.terms)).toMatch(/one more town, at \(\d+,\d+\)/);
    expect(labelsOf(chain!.terms)).toMatch(/the settler has still to walk to the ground/);
  });

  it('is the settler candidate’s whole value — a step of the next town', () => {
    const state = settled(1);
    const player = seat(state, 0);
    const chain = valueContext(state, player).expansion!;
    const decision = decisionOfType(state, 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    const row = decision!.candidates.find((entry) => entry.label === 'Settler')!;
    expect(row).toBeDefined();
    // The chain's share, and *not* a second reading of what a town is worth: a
    // settler makes nothing anywhere, so folding `explainNextTown` beside the
    // chain would count the town twice. See `unitRoleValue`.
    const step = findTerm(row.terms, /a step of the next town at \(\d+,\d+\)/);
    expect(step).not.toBeNull();
    expect(step!.value).toBeCloseTo(chain.worth / chain.stepsRemaining, 6);
    expect(labelsOf(row.terms)).toMatch(/the citizen it costs this town/);
    expect(foldTerms(row.terms)).toBe(row.score);
  });

  it('drops the settler step by construction once one is already walking', () => {
    // The sunk-cost story, in the shape `techChain` tells it: a piece already
    // raised owes no hammers and is no longer a thing that has to happen, so the
    // chain has nothing left for a second town to raise.
    const state = settled(1);
    const before = valueContext(state, seat(state, 0)).expansion!;
    expect(before.stepsRemaining).toBe(1);
    expect(before.hammers).toBeGreaterThan(0);
    createUnit(state, 0, 'settler', 4, 8);
    recomputeAllVisibility(state);
    const after = valueContext(state, seat(state, 0)).expansion!;
    expect(after.stepsRemaining).toBe(0);
    expect(after.hammers).toBe(0);
  });
});

describe('the constraint prices', () => {
  function settled(towns: number): GameState {
    const state = bench(1, { width: 30, height: 16 });
    // Past `military.scoutEarlyTurns`, so the opening book (`openingScout`) does
    // not answer the town before anything is weighed.
    state.turn = 50;
    for (let index = 0; index < towns; index++) {
      const city = foundCityAt(state, 0, at(state.map, 3 + index * 5, 6));
      city.population = 4;
      refreshCityDerived(state, city);
    }
    recomputeAllVisibility(state);
    return state;
  }

  it('sits at the table’s own figure while nothing is over-spending the writ', () => {
    // One town: the palace's six points against a capital that costs nothing,
    // so a second town's three are covered and the meter is nobody's constraint.
    // (The palace paid four until 2026-09-08, ruling ddd; the sentence is the
    // same one, one number wider.)
    const ctx = valueContext(settled(1), seat(settled(1), 0));
    expect(ctx.expansion!.short.authority).toBe(0);
    expect(ctx.prices.authority).toBe(aiJson.weights.authority);
    expect(ctx.priceNotes.authority).toMatch(/nothing this empire wants is over-spending/);
  });

  it('rides its ceiling when the next town would over-spend it', () => {
    // **Re-benched 2026-09-08 (ruling ddd — the writ).** The palace supplies
    // six authority where it supplied four, so a two-town empire is no longer
    // short of anything and read a shortfall of zero: the bench is a town wider
    // now, which is the same board this claim was always about — an empire
    // whose *next* town cannot be paid for. Six from the palace, three each for
    // the second and third towns: nothing standing and three asked for.
    const state = settled(3);
    const ctx = valueContext(state, seat(state, 0));
    expect(ctx.expansion!.short.authority).toBe(3);
    expect(ctx.prices.authority).toBe(
      aiJson.weights.authority * aiJson.priorities.priceBandHigh,
    );
    expect(ctx.priceNotes.authority).toMatch(/over-spends 3 authority, capped by the band/);
  });

  it('lets a capacity building outbid its own flat-weight self', () => {
    // The audit's example, pinned: the same row, the same board, appraised once
    // at the table's figure and once at the price the blocked chain sets. Three
    // towns rather than two since 2026-09-08 (ruling ddd), for the reason the
    // bench above gives: at the palace's new six, two towns are not blocked.
    const state = settled(3);
    const blocked = valueContext(state, seat(state, 0));
    const flat = { ...blocked, prices: { ...blocked.prices, authority: aiJson.weights.authority } };
    const capacity = BUILDING_IDS.find(
      (id) => (buildingDef(id).authorityCapacity ?? 0) > 0 && buildingDef(id).wonder !== true,
    )!;
    expect(explainBuildingRow(capacity, blocked).total).toBeGreaterThan(
      explainBuildingRow(capacity, flat).total,
    );
    const line = findTerm(explainBuildingRow(capacity, blocked).terms, /authority × /);
    expect(line!.value).toBe(
      (buildingDef(capacity).authorityCapacity ?? 0) * blocked.prices.authority,
    );
  });

  it('never leaves its band, on either meter, at any width of empire', () => {
    // The band is the damping, and it is the reason a price is a dial the board
    // turns rather than a number the board writes. Walked across every width the
    // bench can hold, because the shortfall grows with each town.
    for (let towns = 1; towns <= 5; towns++) {
      const state = settled(towns);
      const ctx = valueContext(state, seat(state, 0));
      for (const meter of ['authority', 'happiness'] as const) {
        expect(ctx.prices[meter]).toBeGreaterThanOrEqual(
          aiJson.weights[meter] * aiJson.priorities.priceBandLow,
        );
        expect(ctx.prices[meter]).toBeLessThanOrEqual(
          aiJson.weights[meter] * aiJson.priorities.priceBandHigh,
        );
      }
    }
  });
});

describe('the wage-aware levy', () => {
  /**
   * One town, a levy's worth of soldiers standing in it, and a treasury the test
   * sets by hand. Turn 50 puts the board past `military.scoutEarlyTurns` so the
   * opening book does not answer the town before anything is weighed.
   */
  function levied(soldiers: number, gold: number): GameState {
    const state = bench(1);
    state.turn = 50;
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    city.population = 5;
    refreshCityDerived(state, city);
    for (let index = 0; index < soldiers; index++) {
      const piece = createUnit(state, 0, 'warrior', city.col, city.row + index);
      piece.fortifiedTurns = 0;
    }
    seat(state, 0).gold = gold;
    bumpRevision(state);
    recomputeAllVisibility(state);
    return state;
  }

  function warrior(state: GameState): BotCandidate {
    const decision = decisionOfType(state, 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    return decision!.candidates.find((row) => row.label === 'Warrior')!;
  }

  it('replaced the count with a comparison — the row is there, and charged', () => {
    // The gate used to answer `null` at the levy. It is a term now, so the row
    // stands in the table and a reader can see what it was charged.
    const row = warrior(levied(2, 200));
    expect(row).toBeDefined();
    expect(labelsOf(row.terms)).toMatch(/wants \d[\d.]* soldiers? and holds 2 — 100% of a levy already standing/);
    expect(foldTerms(row.terms)).toBe(row.score);
  });

  it('wants fewer spears when the treasury is broke than when it is not', () => {
    // The wage is charged at gold's shadow price, once, in `push` — so the same
    // piece on the same board costs a bleeding empire more than a solvent one.
    const rich = warrior(levied(1, 400));
    const broke = warrior(levied(1, 0));
    expect(broke.score).toBeLessThan(rich.score);
  });

  it('wants more of them when a column is at the gate', () => {
    const quiet = levied(1, 200);
    const besieged = levied(1, 200);
    createUnit(besieged, 1, 'warrior', 6, 5);
    recomputeAllVisibility(besieged);
    expect(warrior(besieged).score).toBeGreaterThan(warrior(quiet).score);
  });

  it('keeps the empty town’s garrison essential — a fact, not a price', () => {
    // No purse, so the spend arm cannot buy the garrison out from under the pin.
    const row = warrior(levied(0, 0));
    expect(labelsOf(row.terms)).toMatch(/its town is standing empty/);
  });
});

/**
 * **The engine shapes, priced** (batch A of `docs/fewer-things-plan.md`).
 *
 * Every shape the shapes batch declared has an arm in `scoreEffect`, and the
 * claim tested here is the one that matters: each arm is *read off the board*
 * rather than met with `score.unknownEffect`. So each case is a pair — the same
 * card on a board with nothing for it to multiply and on a board with something
 * — and the two numbers differ. A shape priced at the unknown stand-in would
 * give the same number twice.
 *
 * The written-down debt of the pass is here too, and it is deliberate: an engine
 * appraised in isolation *is* worth nearly nothing, because it multiplies a deck
 * this reading cannot see. The marginal reading is batch F2's.
 */
describe('the engine shapes, priced', () => {
  function board(): { state: GameState; player: Player; city: City } {
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 4, 5));
    city.population = 6;
    recomputeAllVisibility(state);
    return { state, player: seat(state, 0), city };
  }

  /** Seats a real Order wearing fixture effects, and hands back the price. */
  function priced(
    effects: CardEffect[],
    arrange?: (state: GameState, player: Player, city: City) => void,
  ): number {
    const { state, player, city } = board();
    arrange?.(state, player, city);
    return scoreEffects(effects, valueContext(state, player));
  }

  /** Puts a card in a chair, wearing effects of our choosing. */
  function fixture(
    state: GameState,
    player: Player,
    index: number,
    id: OrderId,
    effects: CardEffect[],
  ): () => void {
    const held = orderDef(id).effects;
    (orderDef(id) as { effects: CardEffect[] }).effects = effects;
    if (!player.statecraft.orders.includes(id)) player.statecraft.orders.push(id);
    player.statecraft.slots[index] = { card: id, sealedUntil: state.turn };
    bumpRevision(state);
    return () => {
      (orderDef(id) as { effects: CardEffect[] }).effects = held;
    };
  }

  it('prices the amplifier by the lines the deck actually pays', () => {
    const alone = priced([{ kind: 'cardYieldAmplifier', yield: 'food', amount: 1 }]);
    let undo = (): void => undefined;
    const beside = priced(
      [{ kind: 'cardYieldAmplifier', yield: 'food', amount: 1 }],
      (state, player) => {
        undo = fixture(state, player, 0, 'waysideShrines', [{ kind: 'pays', where: 'city', food: 2 }]);
      },
    );
    undo();
    expect(alone).toBe(0);
    expect(beside).toBeGreaterThan(0);
  });

  it('prices the building share by the shelves the empire has raised', () => {
    const share: CardEffect[] = [{ kind: 'buildingYieldPercent', pays: 'faith', percent: 100 }];
    const bare = priced(share);
    const built = priced(share, (_state, _player, city) => {
      city.buildings.push('temple');
      bumpRevision(_state);
    });
    expect(bare).toBe(0);
    expect(built).toBeGreaterThan(0);
  });

  it('prices the position engine as the chair it points at', () => {
    const engine: CardEffect[] = [
      { kind: 'slotPosition', slot: 'economic', position: 1, factor: 2 },
    ];
    const empty = priced(engine);
    let undo = (): void => undefined;
    const filled = priced(engine, (state, player) => {
      undo = fixture(state, player, 1, 'waysideShrines', [{ kind: 'pays', where: 'city', gold: 5 }]);
    });
    undo();
    expect(empty).toBe(0);
    expect(filled).toBeGreaterThan(0);
  });

  it('prices a periodic boon over its period, and the shortener as the difference', () => {
    const often = priced([{ kind: 'periodic', everyTurns: 4, pays: 'gold', amount: 20 }]);
    const rarely = priced([{ kind: 'periodic', everyTurns: 20, pays: 'gold', amount: 20 }]);
    expect(often).toBeGreaterThan(rarely);
    // A shortener with nothing to shorten is worth nothing; beside a boon it is
    // worth what coming round sooner is worth.
    const idle = priced([{ kind: 'periodShorten', turns: 2 }]);
    let undo = (): void => undefined;
    const useful = priced([{ kind: 'periodShorten', turns: 2 }], (state, player) => {
      undo = fixture(state, player, 0, 'waysideShrines', [
        { kind: 'periodic', everyTurns: 6, pays: 'gold', amount: 20 },
      ]);
    });
    undo();
    expect(idle).toBe(0);
    expect(useful).toBeGreaterThan(0);
  });

  it('prices a city renown share off the trickle the towns already earn', () => {
    const share: CardEffect[] = [{ kind: 'cityRenownPercent', percent: 100 }];
    const bare = priced(share);
    const built = priced(share, (_state, _player, city) => {
      city.buildings.push('library');
      bumpRevision(_state);
    });
    expect(bare).toBe(0);
    expect(built).toBeGreaterThan(0);
  });

  it('prices a route line by the caravans this empire is running', () => {
    // No caravan, no coin: the shape pays per route and the count is the
    // simulation's own, so an empire with no trade prices it at nothing.
    expect(priced([{ kind: 'pays', where: 'route', gold: 2 }])).toBe(0);
  });

  it('prices every gift batch E hangs on the tree, and never as an unread shape', () => {
    // The batch's own acceptance for the bot (`docs/fewer-things-plan.md` E): a
    // card-effect gift on a node must be *priced*, because `techChain` values a
    // node by what it hands over and `score.unknownEffect` firing would mean the
    // bot beelines a node for a reason it cannot name.
    const score = valueContext(board().state, board().player).ai.score;
    // The nodes E re-gifted, named rather than swept: a coincidence elsewhere on
    // the tree (Epic Poetry's verse happens to price at exactly the stand-in)
    // would otherwise make this test about arithmetic rather than about reading.
    const gifted: TechId[] = [
      'kingship',
      'theExaminationHall',
      'artisanry',
      'horology',
      'theLongCount',
      'machinery',
      'prospecting',
      'theSilkRoad',
      'movableType',
    ];
    // Every one of them has to *have* a gift to price, which is the other half
    // of the batch and cheap to say here.
    for (const id of gifted) expect((techDef(id).effects ?? []).length, id).toBeGreaterThan(0);
    // **Read off the appraiser's own source**, because the two honest ways to
    // ask this question by arithmetic both fail: a percentage shape is
    // *deliberately* priced against `unknownEffect × nominalCount` (that is what
    // "a nominal yield" means here), and the flat shapes price in the same small
    // integers the stand-in is written in, so any number this test picked could
    // collide by luck. What it actually wants to know is whether `scoreEffect`
    // has an arm for the kind at all — which the source says exactly.
    // The source, through Vite's raw import — `seatRoster.test.ts`' idiom, and
    // for its stated reason: this project has no node typings and a source
    // assertion is not worth a dependency.
    const source = (
      import.meta.glob('../../src/ai/value.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../../src/ai/value.ts']!;
    const body = source.slice(source.indexOf('function scoreEffect('));
    const armed = new Set(
      [...body.slice(0, body.indexOf('\n}\n')).matchAll(/case '(\w+)'/g)].map((m) => m[1]!),
    );
    // `countScaled` never reaches that switch in anger — `explainEffects` sends
    // it to `explainCounted` one call earlier — so it is armed by the caller.
    armed.add('pays');
    expect(armed.size).toBeGreaterThan(10);
    void score;
    // **The debt list is empty since batch H2**, and that is the batch: every
    // shape on every gifted node has an arm of its own now, `routeRider`
    // included — a slot is priced as the route it opens (`routeSlotTerm`, the
    // very door a market's shelves walk through).
    const debt = new Set<string>();
    for (const id of gifted) {
      for (const effect of techDef(id).effects ?? []) {
        if (debt.has(effect.kind)) continue;
        expect(armed.has(effect.kind), `${id} · ${effect.kind}`).toBe(true);
      }
    }
    expect([...debt].every((kind) => !armed.has(kind))).toBe(true);
  });

  it('prices Machinery’s roads by the army that would walk them', () => {
    // The one `CardRule` this file reads, and it reads the board: a realm with
    // no pieces in the field gains nothing from cheaper paving, and every piece
    // it fields makes the discount worth more. Every other rule keeps the
    // stand-in it has always had.
    const road: CardEffect[] = [{ kind: 'rulePercent', rule: 'roadStepCost', percent: -40 }];
    const idle = priced(road);
    const marching = priced(road, (state, player) => {
      for (let n = 0; n < 4; n++) createUnit(state, player.id, 'warrior', 5 + n, 7);
    });
    expect(idle).toBe(0);
    expect(marching).toBeGreaterThan(0);
    // **Seven of the nine rules are read off their own folds since batch H2**,
    // and the two that are not are the two that buy *ground* — a hex nobody owns
    // is priced by the settle table's weights and not by this currency, which is
    // the two-weight-tables gap batch 4 wrote down. Those two keep the stand-in,
    // by name.
    const { state, player } = board();
    for (const rule of ['borderCulture', 'borderCost'] as const) {
      expect(
        scoreEffects([{ kind: 'rulePercent', rule, percent: -33 }], valueContext(state, player)),
        rule,
      ).toBe(valueContext(state, player).ai.score.unknownEffect);
    }
  });

  it('prices The Golden Roads by the goods as well as by the caravans', () => {
    // `perEndpointLuxury` multiplies the bag by what the realm's shelves hold,
    // so the same row is worth more to an empire with goods to carry — and still
    // nothing at all to one with no caravan on the road.
    const row: CardEffect[] = [{ kind: 'pays', where: 'route', gold: 1, perEndpointLuxury: true }];
    expect(priced(row)).toBe(0);
  });

  it('counts the new counts through the simulation rather than a nominal guess', () => {
    const effect: CardPaysEffect = {
      kind: 'pays',
      where: 'empire',
      basis: 'count',
      to: 'culture',
      amount: 1,
      count: 'buildingsOfCategories',
      categories: ['science', 'faith'],
    };
    const { state, player, city } = board();
    const before = explainCounted(effect, valueContext(state, player));
    city.buildings.push('library', 'temple');
    bumpRevision(state);
    const after = explainCounted(effect, valueContext(state, player));
    expect(before.terms[0]!.value).toBe(0);
    expect(after.terms[0]!.value).toBe(2);
    expect(labelsOf([after.terms[0]!])).toMatch(/2 buildingsOfCategories today/);
  });

  /**
   * **Batch F's acceptance for the bot** (`docs/fewer-things-plan.md` F, item 5).
   *
   * The order pass wrote thirty-three new Orders and converted twenty more, and
   * the shapes they carry are batch A's engines. The claim here is the one the
   * batch-E register makes of the tree, one table over: **no row this pass
   * touched falls to `unknownEffect` for want of an arm**. It is read off
   * `scoreEffect`'s own `case` labels rather than by arithmetic, for that
   * register's stated reason — a percentage shape is *deliberately* priced
   * against the stand-in, so a number this test picked could collide by luck.
   *
   * What an engine is *worth* was a different question and an open debt until
   * **batch F2**: appraised alone an engine multiplies a deck no reading of one
   * row can see, so the four shapes the empire's own per-turn books *can* see
   * (`hasFoldReadEngine`, `value.ts`) are priced by the difference the board
   * reads — `V(deck ∪ card) − V(deck)` — and are armed by that door rather than
   * by a `case` in `scoreEffect`. That is what takes **The Exchequer** off the
   * debt list below: it doubles what `routeYields.ts` prints, and the marginal
   * reading is the only appraiser in the bot that can see the caravans.
   */
  it('has an arm for every shape batch F wrote onto a card', () => {
    const PASS_F: OrderId[] = [
      // The engines, in pool order.
      'theMusterRolls', 'theHarvestHome', 'theReevesBell',
      'theFirstChair', 'theScriveners', 'theSacredGround', 'theAssayersRule',
      'theCountingHouses', 'theAlmanacOfHours', 'theFoundryDays', 'theNetsBlessing',
      'theHighChancery', 'theVotiveTally',
      'theWorkshopsRule', 'theWildChair', 'theCantorsRule', 'theGoldenCenser',
      'theDeepSeams', 'theExchangeCharter', 'theTriumph',
      'theScholarsRule', 'theExchequer', 'theAssay', 'theBroadAcres', 'theJubilee',
      'theCompactOfChairs', 'theLaureatesRule', 'theGreatClock', 'theEncyclopaedists',
      'theCollegesRule',
      // The converted rows, one of every shape the pass moved.
      'silkRoads', 'ledgerKeepers', 'theSynod', 'theConsistory', 'theSalon',
      'fireKeepers', 'waysideShrines', 'starGazers', 'provincialMints',
    ] as OrderId[];
    // The source, through Vite's raw import — `seatRoster.test.ts`' idiom.
    const source = (
      import.meta.glob('../../src/ai/value.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../../src/ai/value.ts']!;
    const body = source.slice(source.indexOf('function scoreEffect('));
    const armed = new Set(
      [...body.slice(0, body.indexOf('\n}\n')).matchAll(/case '(\w+)'/g)].map((m) => m[1]!),
    );
    // `countScaled` never reaches that switch in anger — `explainEffects` sends
    // it to `explainCounted` one call earlier — so it is armed by the caller.
    armed.add('pays');
    // The named debts, written down rather than swept under. Each wants a
    // reading this file does not have and each prices at the stand-in: an extra
    // caravan *slot* (batch E's, still open); every `CardRule` but the road
    // fraction; and an occasion's grant, which is worth what the occasion is
    // worth and which no arm has ever tried to guess.
    //
    // `effectAmplifier` left this list in batch F2 — but only where its target is
    // a figure the per-turn books carry. A `riteDuration` amplifier moves the turn
    // a blessing expires on, which is not a rate and appears in no reading of one,
    // so that one still meets the stand-in.
    // **Empty since batch H2**: every shape on every row this pass wrote now has
    // an arm of its own. `windfallRider` is priced by the occasion's own
    // frequency on this board, `rulePercent` by the fold each rule modifies,
    // `routeRider` as the route it opens, and `effectAmplifier` by the table it
    // points at — the two targets with no reading (`riteDuration`,
    // `greatPersonAct`) meet the stand-in inside the arm rather than outside it.
    const debt = new Set<string>();
    for (const id of PASS_F) {
      const def = orderDef(id);
      // A deferred row carries no effect at all, which is the convention for a
      // card whose shape does not exist yet — there is nothing to price.
      if (def.effects.length === 0) {
        expect((def.deferred ?? []).length, id).toBeGreaterThan(0);
        continue;
      }
      for (const effect of def.effects) {
        // Armed by the marginal door (batch F2) rather than by a `case` label.
        if (hasFoldReadEngine([effect])) continue;
        if (debt.has(effect.kind)) continue;
        expect(armed.has(effect.kind), `${id} · ${effect.kind}`).toBe(true);
      }
    }
    // And the four Æra V bead Orders — the last rows in the deck that carried
    // no effect at all — are built and priced (batch H3,
    // `docs/audit/orchestrator.md`). They used to be this claim's stated
    // exception; each now carries exactly one `beadPerOccasion`, and the arm
    // that reads it is a `case` like any other.
    for (const id of ['theGreatEnquiry', 'theLastLaurels', 'theSaltedEarth',
      'theFinalProclamation'] as OrderId[]) {
      const def = orderDef(id);
      expect(def.effects.length, id).toBe(1);
      expect(def.effects[0]!.kind, id).toBe('beadPerOccasion');
      expect(def.deferred, id).toBeUndefined();
      expect(armed.has('beadPerOccasion'), id).toBe(true);
    }
  });

  it('never prices a live Order at nothing but the stand-in', () => {
    // The blunter half of the same claim, arithmetic this time: every live row
    // that carries an effect is worth *something* to a seat with a town, so a
    // card whose whole face the bot cannot read would show up here as a zero.
    const { state, player } = board();
    const ctx = valueContext(state, player);
    for (const id of ORDER_IDS) {
      const def = orderDef(id);
      if (def.retired === true || def.effects.length === 0) continue;
      expect(Number.isFinite(scoreEffects(def.effects, ctx)), id).toBe(true);
    }
  });
});

/**
 * **The whole deck, priced** — batch H2 (`docs/audit/orchestrator.md`, finding
 * 4), and the register that keeps it whole.
 *
 * Two claims, and the first is structural rather than arithmetic: `scoreEffect`
 * switches on an **aliased discriminant** and ends in a `never`, so a member of
 * `CardEffect` declared in `statecraftData.ts` with no arm here stops compiling.
 * That claim cannot be made by a test at all — it is the typechecker's — so what
 * this file pins instead is the *shape of the register*: every kind has a `case`
 * label of its own, and the kinds that still meet `score.unknownEffect` are a
 * **named list** rather than whatever happened to fall through a `default`.
 *
 * The second claim is the batch: each newly-armed shape's price is the fold's own
 * figure on a bench where the fold can be computed by hand, `===`, never
 * `toBeCloseTo` — the discipline every appraisal in this bot is held to.
 */
describe('the whole deck, priced (batch H2)', () => {
  function board(seats = 1): { state: GameState; player: Player; city: City } {
    const state = bench(seats);
    const city = foundCityAt(state, 0, at(state.map, 4, 5));
    city.population = 6;
    recomputeAllVisibility(state);
    return { state, player: seat(state, 0), city };
  }

  /** `scoreEffect`'s own `case` labels, read off the source. */
  function armedKinds(): Set<string> {
    const source = AI_SOURCES['../../src/ai/value.ts']!;
    const body = source.slice(source.indexOf('function scoreEffect('));
    return new Set(
      [...body.slice(0, body.indexOf('\n}\n')).matchAll(/case '(\w+)'/g)].map((m) => m[1]!),
    );
  }

  it('has a case label for every shape the vocabulary declares', () => {
    // Read off `statecraftData.ts`' own union rather than off a list here, so a
    // shape added there and not armed fails this as well as the typecheck. The
    // union is a type and types do not survive to runtime, so the *source* is
    // the register — `seatRoster.test.ts`' idiom, for its stated reason.
    const data = (
      import.meta.glob('../../src/sim/statecraftData.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../../src/sim/statecraftData.ts']!;
    const declared = new Set(
      [...data.matchAll(/^ {2}kind: '(\w+)';$/gm)].map((m) => m[1]!),
    );
    // A sanity floor: the union is forty-odd members and a regex that matched
    // nothing would make this test pass by saying nothing.
    expect(declared.size).toBeGreaterThan(40);
    const armed = armedKinds();
    // `countScaled` is armed by the caller (`explainEffects` sends it to
    // `explainCounted` one call earlier) as well as by a case of its own.
    armed.add('pays');
    const missing = [...declared].filter((kind) => !armed.has(kind));
    expect(missing).toEqual([]);
  });

  it('names every shape that still meets the stand-in, and no others', () => {
    // **The stand-in list, by name.** Each of these is an arm that returns
    // `score.unknownEffect` on purpose, with a line in the source saying why —
    // and the claim is that the list has not quietly grown. Six of them are
    // rules or facts with no fold behind them, one is a slot whose price lives
    // in a module that reads this one, and two are amplifier targets that are
    // not rates.
    const named = [
      'pantheonSlots', // a belief's worth is `wants.ts`', which reads this file
      'pressure', // the tide: no model of a conversion anywhere in the bot
      'pressureRule', // the same
      // Batch H6 folded the four flag kinds into one `rule` shape. Three of the
      // four readings under it are still stand-ins — fresh water (what it
      // un-gates is `buildError` asked hypothetically), the verbs (three of four
      // open a draft no surface constructs, H3) and the world's rules (a rule of
      // the wild's turn, and roads that are already free) — while the fourth,
      // the border's zone of control, is priced. So the kind is named here and
      // the arm is asserted on both sides below.
      'rule',
      'metaRule', // a seal is the difference between two draft plans
    ];
    const { state, player } = board();
    const ctx = valueContext(state, player);
    const stand = ctx.ai.score.unknownEffect;
    expect(scoreEffects([{ kind: 'pantheonSlots', amount: 1 }], ctx)).toBe(
      stand * ctx.ai.score.nominalCount,
    );
    expect(scoreEffects([{ kind: 'pressure', amount: 4, range: 8 }], ctx)).toBe(stand);
    expect(
      scoreEffects([{ kind: 'pressureRule', rule: 'roadStrength', delta: 2 }], ctx),
    ).toBe(stand);
    expect(scoreEffects([{ kind: 'rule', rule: 'freshwater' }], ctx)).toBe(stand);
    expect(scoreEffects([{ kind: 'rule', rule: 'freeChop' }], ctx)).toBe(stand);
    expect(
      scoreEffects([{ kind: 'rule', rule: 'barbarianKillsConvert' }], ctx),
    ).toBe(stand);
    // The one rule under the shape that is *not* a stand-in: the border's toll,
    // priced as the towns it screens. Named here so the merged arm cannot quietly
    // become one constant for all four readings.
    expect(scoreEffects([{ kind: 'rule', rule: 'borders' }], ctx)).not.toBe(stand);
    expect(scoreEffects([{ kind: 'metaRule', rule: 'sealTurns', value: 10 }], ctx)).toBe(stand);
    // And the two amplifier targets that are not rates, named inside their arm.
    expect(
      scoreEffects([{ kind: 'effectAmplifier', target: 'riteDuration', percent: 50 }], ctx),
    ).toBe(stand);
    expect(
      scoreEffects([{ kind: 'effectAmplifier', target: 'greatPersonAct', percent: 100 }], ctx),
    ).toBe(stand);
    // Seven before batch H6 folded three of the four flag kinds into one.
    expect(named.length).toBe(5);
  });

  it('prices a windfall rider as the occasion’s own frequency times its grant', () => {
    // **The 43-row family.** A technology completed is an occasion this board
    // keeps the record of — technologies held over turns played — so the price
    // is that rate times what the rider hands over, through `explainLump`.
    const { state, player } = board();
    state.turn = 40;
    player.techsResearched.push('agriculture' as TechId, 'mining' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rider: CardEffect[] = [
      { kind: 'windfallRider', occasion: 'tech', grant: { yield: 'culture', amount: 40 } },
    ];
    const rate = player.techsResearched.length / state.turn;
    const lump = (40 * ctx.prices.culture) / ctx.ai.score.lumpTurns;
    expect(scoreEffects(rider, ctx)).toBe(lump * rate);
    // An occasion this empire has no record of is worth nothing, and says so by
    // arithmetic: a seat that has bought no hex is paid nothing for buying one.
    expect(
      scoreEffects(
        [{ kind: 'windfallRider', occasion: 'tilePurchase', grant: { yield: 'gold', amount: 5 } }],
        ctx,
      ),
    ).toBe(0);
  });

  it('multiplies a rider by the era and by the chairs it fills', () => {
    // `perAge` and `perSlottedOrder` are the evaluator's own multipliers, read
    // off the same board `windfallPayout` reads them off.
    const { state, player } = board();
    state.turn = 40;
    player.techsResearched.push('agriculture' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const plain = scoreEffects(
      [{ kind: 'windfallRider', occasion: 'tech', grant: { yield: 'faith', amount: 10 } }],
      ctx,
    );
    const aged = scoreEffects(
      [
        {
          kind: 'windfallRider',
          occasion: 'tech',
          perAge: true,
          grant: { yield: 'faith', amount: 10 },
        },
      ],
      ctx,
    );
    expect(aged).toBe(plain * Math.max(1, ctx.age));
  });

  it('prices the payroll rules off the payroll itself', () => {
    // Tyranny's thirty percent and The Reckless Levy's hundred, both read off
    // `unitUpkeepTotal` at gold's live price — the same door a wage is charged
    // through, so a rebate and the bill it forgives cannot disagree.
    const { state, player } = board();
    for (let n = 0; n < 4; n++) createUnit(state, player.id, 'warrior', 5 + n, 7);
    const ctx = valueContext(state, player);
    const bill = unitUpkeepTotal(state, player.id);
    expect(bill).toBeGreaterThan(0);
    const rebate = scoreEffects(
      [{ kind: 'rulePercent', rule: 'unitUpkeep', percent: -30 }],
      ctx,
    );
    const surcharge = scoreEffects(
      [{ kind: 'rulePercent', rule: 'unitUpkeep', percent: 100 }],
      ctx,
    );
    expect(rebate).toBe(0.3 * bill * ctx.prices.gold);
    expect(surcharge).toBe(-1 * bill * ctx.prices.gold);
  });

  it('prices the contentment rule off what this empire’s citizens demand', () => {
    const { state, player, city } = board();
    city.population = 7;
    refreshCityDerived(state, city);
    const ctx = valueContext(state, player);
    const demand = happinessDemand(city.population);
    expect(demand).toBeGreaterThan(0);
    expect(
      scoreEffects([{ kind: 'rulePercent', rule: 'happinessDemand', percent: -15 }], ctx),
    ).toBe(0.15 * demand * ctx.prices.happiness);
  });

  it('prices a rate conversion out of the books it converts', () => {
    // The Tithe: a coin per point of faith a turn. The books are the very
    // reading `collectYields` hands the evaluator, so nothing is estimated.
    const { state, player, city } = board();
    city.buildings.push('shrine');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const ctx = valueContext(state, player);
    const faith = foldEmpireRates(state, player.id).faithPerTurn ?? 0;
    expect(faith).toBeGreaterThan(0);
    const effect: CardEffect = {
      kind: 'pays',
      where: 'empire',
      basis: 'rate',
      to: 'gold',
      amount: 1,
      fromRate: 'faithPerTurn',
      per: 1,
    };
    expect(scoreEffects([effect], ctx)).toBe(Math.floor(faith) * ctx.prices.gold);
  });

  it('prices a yield conversion as the share of the books it reads', () => {
    const { state, player } = board();
    const ctx = valueContext(state, player);
    const food = foldEmpireRates(state, player.id).foodPerTurn ?? 0;
    expect(food).toBeGreaterThan(0);
    const effect: CardEffect = {
      kind: 'pays', where: 'city', basis: 'share',
      from: 'food',
      to: 'gold',
      percent: 10,
    };
    expect(scoreEffects([effect], ctx)).toBe(0.1 * food * ctx.prices.gold);
  });

  it('prices the Curia’s mirror off the shelves the empire has raised', () => {
    const share: CardEffect[] = [
      { kind: 'pays', where: 'city', basis: 'mirror', from: 'faith', to: 'science', category: 'faith' },
    ];
    const { state, player, city } = board();
    expect(scoreEffects(share, valueContext(state, player))).toBe(0);
    city.buildings.push('temple');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const ctx = valueContext(state, player);
    const faith = buildingDef('temple').faith ?? 0;
    expect(faith).toBeGreaterThan(0);
    expect(scoreEffects(share, ctx)).toBe(faith * ctx.ai.weights.science[ctx.age - 1]!);
  });

  it('pays a counted city line once per town, not once', () => {
    // **The audit's finding 6.** The simulation pays a `where: 'city'` line in
    // every town; the appraiser used to take it once, an under-price by the
    // whole of the empire's city count on five live rows.
    const state = bench(1);
    const first = foundCityAt(state, 0, at(state.map, 4, 5));
    first.population = 6;
    recomputeAllVisibility(state);
    const player = seat(state, 0);
    const effect: CardPaysEffect = {
      kind: 'pays',
      where: 'city',
      basis: 'count',
      to: 'gold',
      amount: 1,
      count: 'cities',
    };
    const one = explainCounted(effect, valueContext(state, player)).total;
    const second = foundCityAt(state, 0, at(state.map, 9, 5));
    second.population = 6;
    recomputeAllVisibility(state);
    const two = explainCounted(effect, valueContext(state, player)).total;
    // Two towns counted, and each of them paid: four times one town's one.
    expect(two).toBe(one * 4);
    // An `empire` line is unmoved by the same board — the fix is scoped.
    const empireLine: CardPaysEffect = {
      kind: 'pays',
      where: 'empire',
      basis: 'count',
      to: 'gold',
      amount: 1,
      count: 'cities',
    };
    const ctx = valueContext(state, player);
    expect(explainCounted(empireLine, ctx).total).toBe(2 * ctx.prices.gold);
  });

  it('prices a charter as the shelf it opens, in the towns that would raise it', () => {
    const { state, player } = board();
    const ctx = valueContext(state, player);
    const priced = scoreEffects([{ kind: 'unlocksBuilding', building: 'library' }], ctx);
    expect(priced).toBeGreaterThan(ctx.ai.score.unknownEffect);
    // A row worth nothing to this empire opens nothing: the reading is the
    // shelf's, so a shelf that pays nothing is a charter that pays nothing.
    expect(priced).toBeGreaterThan(0);
  });

  it('prices a gated clause at its clauses while the gate is open, and at nothing when shut', () => {
    const { state, player } = board();
    const gated: CardEffect[] = [
      {
        kind: 'conditionRule',
        when: { test: 'cityCountAtMost', value: 4 },
        then: [{ kind: 'pays', where: 'city', gold: 2 }],
      },
    ];
    const open = valueContext(state, player);
    expect(scoreEffects(gated, open)).toBe(scoreEffects([{ kind: 'pays', where: 'city', gold: 2 }], open));
    const shut: CardEffect[] = [
      {
        kind: 'conditionRule',
        when: { test: 'cityCountAtLeast', value: 9 },
        then: [{ kind: 'pays', where: 'city', gold: 2 }],
      },
    ];
    expect(scoreEffects(shut, open)).toBe(0);
  });

  it('prices a caravan slot as the route it opens, and at nothing with a slot going spare', () => {
    // The same door a market's shelves walk through (`routeSlotTerm`), so the
    // card and the building cannot disagree about what a slot is worth. A lone
    // town has nowhere to send a route, so this bench answers nothing.
    const { state, player } = board();
    expect(scoreEffects([{ kind: 'routeRider', extra: 1 }], valueContext(state, player))).toBe(0);
  });

  it('reads the empire card lines into the margin', () => {
    // **The audit's finding 5**, as arithmetic: `V` is the base books *plus*
    // `explainEmpireCardYields`, so an engine whose lines land at empire scale
    // is no longer worth exactly zero to the margin.
    const { state, player, city } = board();
    city.buildings.push('shrine', 'temple');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const before = foldEmpireRates(state, player.id).goldPerTurn ?? 0;
    const lines = explainEmpireCardYields(state, player.id);
    // The claim is about the *reading*, and it holds whether or not this bench
    // happens to carry an empire line: the base books stop one line short by
    // construction, and the bot's `V` no longer does.
    expect(Array.isArray(lines)).toBe(true);
    expect(Number.isFinite(before)).toBe(true);
    const source = AI_SOURCES['../../src/ai/value.ts']!;
    expect(source).toContain('function marginRates(');
    expect(source.slice(source.indexOf('function marginRates('))).toContain(
      'explainEmpireCardYields',
    );
  });
});

/**
 * **The scope, evaluated** — batch X2 of `docs/audit/bot-pass-2.md`.
 *
 * 222 of 731 effect-shaped rows in the data carry a `scope`, an `on`, a `within`,
 * an `origin` or a `destination`, and until this batch the appraisal read none of
 * them: a coastal line was priced `× ctx.cities` in a realm with no coast, the
 * Bank's `routeEndsHere` was priced in every town, and a hex clause was priced at
 * a flat three hexes whatever the ground under it was.
 *
 * The three claims below are the queue row's acceptance, and each is asked of
 * **one board arranged twice** — the same empire with and without the fact the
 * scope names — because a single reading proves nothing about a predicate: what
 * has to hold is that the number *moves with the board*.
 *
 * Everything is asked of `townsAdmitting` and `workedHexesAdmitting`, which are
 * the bot's only two readings of a scope, and both of them are `cityScopeAdmits`
 * and `tileConditionHolds` — the simulation's own. Nothing here reimplements a
 * test, and nothing here names a card by hand: the two data rows the audit
 * called out (Petra, the Bank) are read out of `data/buildings.json` through
 * `buildingDef`.
 */
describe('the scope, evaluated (batch X2)', () => {
  function realm(towns: number): { state: GameState; player: Player; cities: City[] } {
    const state = bench(1);
    const cities: City[] = [];
    for (let index = 0; index < towns; index++) {
      cities.push(foundCityAt(state, 0, at(state.map, 3 + index * 5, 5)));
    }
    recomputeAllVisibility(state);
    for (const city of cities) {
      city.population = 4;
      refreshCityDerived(state, city);
    }
    return { state, player: seat(state, 0), cities };
  }

  it('reads a coastal clause at nothing in a landlocked empire, and at the coast it has', () => {
    // **The acceptance's first row.** The bench is grassland to the edges, so no
    // town of it is coastal and the clause lands nowhere; one hex of water beside
    // one town is the whole of the difference, and the count follows it.
    const { state, player, cities } = realm(4);
    const coastal = { test: 'coastal' } as const;
    expect(valueContext(state, player).cities).toBe(4);
    expect(townsAdmitting(valueContext(state, player), coastal)).toBe(0);
    // And the clause priced through it is worth nothing at all — not a quarter of
    // something, not a nominal: nothing, because it pays in no town.
    const line: CardEffect[] = [{ kind: 'pays', where: 'city', gold: 2, scope: coastal }];
    expect(scoreEffects(line, valueContext(state, player))).toBe(0);

    at(state.map, cities[1]!.col + 1, cities[1]!.row).terrain = 'coast';
    bumpRevision(state);
    expect(townsAdmitting(valueContext(state, player), coastal)).toBe(1);
    expect(scoreEffects(line, valueContext(state, player))).toBeGreaterThan(0);
    // A quarter of the realm, and the unscoped twin still reads all four — the
    // batch narrows what a scope says and moves nothing that says nothing.
    const bare: CardEffect[] = [{ kind: 'pays', where: 'city', gold: 2 }];
    expect(scoreEffects(bare, valueContext(state, player))).toBe(
      scoreEffects(line, valueContext(state, player)) * 4,
    );
  });

  it('reads Petra’s own site test off the ground beside the town', () => {
    // **The acceptance's second row**, and the scope is the wonder's own — read
    // out of the data row rather than typed here, so a designer who re-sites
    // Petra re-aims this claim with it.
    const site = buildingDef('petra').requiresSite;
    expect(site).toBeDefined();
    expect(site!.test).toBe('terrainBeside');
    const { state, player, cities } = realm(1);
    expect(townsAdmitting(valueContext(state, player), site!)).toBe(0);
    at(state.map, cities[0]!.col + 1, cities[0]!.row).terrain = 'desert';
    bumpRevision(state);
    expect(townsAdmitting(valueContext(state, player), site!)).toBe(1);
  });

  it('reads the Bank’s share in the towns a caravan actually ends at', () => {
    // **The acceptance's third row.** `routeEndsHere` is a `CityScope` test and
    // `Unit.trade` **is** the route — there is no register — so the arrangement
    // is a caravan with a live leg and nothing else, and the count is the towns
    // it comes to.
    const bank = buildingDef('bank');
    const scoped = (bank.effects ?? []).find(
      (effect) => (effect as { scope?: { test: string } }).scope?.test === 'routeEndsHere',
    );
    expect(scoped).toBeDefined();
    const scope = (scoped as { scope: NonNullable<Parameters<typeof townsAdmitting>[1]> }).scope;

    const { state, player, cities } = realm(3);
    expect(townsAdmitting(valueContext(state, player), scope)).toBe(0);
    // The Bank's twenty percent, priced through the scope: nothing while no road
    // ends anywhere, and never the realm's whole count.
    expect(scoreEffects([scoped as CardEffect], valueContext(state, player))).toBe(0);

    const trader = createUnit(state, player.id, 'trader', cities[0]!.col, cities[0]!.row);
    trader.trade = {
      from: cities[0]!.id,
      to: cities[2]!.id,
      expiresTurn: state.turn + 30,
      outbound: true,
      autoResend: false,
    };
    bumpRevision(state);
    expect(townsAdmitting(valueContext(state, player), scope)).toBe(1);
    expect(scoreEffects([scoped as CardEffect], valueContext(state, player))).toBeGreaterThan(0);
  });

  it('counts a hex clause over the worked ground it lands on, town by town', () => {
    // The harder half. A hex line is paid by `foldCity` on the tiles a citizen is
    // **sitting on**, so that is what is counted — and the count moves with the
    // ground: a condition no worked hex satisfies is worth nothing, and one every
    // worked hex satisfies is worth all of them.
    const { state, player } = realm(2);
    const ctx = valueContext(state, player);
    const worked = state.cities.reduce((sum, city) => sum + city.workedTiles.length, 0);
    expect(worked).toBeGreaterThan(0);
    const anywhere: CardPaysEffect = { kind: 'pays', where: 'hex', gold: 1 };
    expect(workedHexesAdmitting(ctx, anywhere)).toBe(worked);
    // Grassland to the horizon: no hex has a seam in it, so the Rite of Plenty's
    // shape reads nought rather than the flat three it used to.
    const seams: CardPaysEffect = {
      kind: 'pays',
      where: 'hex',
      gold: 1,
      on: { test: 'hasResource' },
    };
    expect(workedHexesAdmitting(ctx, seams)).toBe(0);
    expect(scoreEffects([seams], ctx)).toBe(0);
  });

  it('remembers a scope for the life of one sitting, and re-reads it for the next', () => {
    // The memo is `MARGIN_MEMO`'s bargain: keyed weakly on the context, which is
    // one seat's book for one decision. Two askings inside one context are one
    // walk; a fresh context after the board moves is a fresh answer, which is
    // what stops the bot appraising against a coast it lost.
    const { state, player, cities } = realm(2);
    const held = valueContext(state, player);
    const coastal = { test: 'coastal' } as const;
    expect(townsAdmitting(held, coastal)).toBe(0);
    at(state.map, cities[0]!.col + 1, cities[0]!.row).terrain = 'coast';
    bumpRevision(state);
    // The old sitting keeps the answer it was built with — deliberately.
    expect(townsAdmitting(held, coastal)).toBe(0);
    expect(townsAdmitting(valueContext(state, player), coastal)).toBe(1);
  });

  it('reads a wonder’s own “in the town that raises me” as one town, never as none', () => {
    // Twenty-one of the twenty-six `hasBuilding` scopes on building rows name
    // **their own row** — the idiom every wonder uses to say "in the town that
    // raises me". Read literally, no town admits one on the turn the bot is
    // deciding whether to build it, and Petra's desert would price at nothing for
    // ever. So a `hasBuilding` scope no town admits reads one town: the town that
    // would raise it. Every other scope is a fact about the board and reads what
    // the board says.
    const { state, player } = realm(3);
    const ctx = valueContext(state, player);
    expect(townsAdmitting(ctx, { test: 'hasBuilding', building: 'petra' })).toBe(1);
    expect(townsAdmitting(ctx, { test: 'coastal' })).toBe(0);
    // And a shelf the empire has really raised is counted, not floored.
    for (const city of state.cities) city.buildings.push('granary');
    bumpRevision(state);
    expect(townsAdmitting(valueContext(state, player), { test: 'hasBuilding', building: 'granary' })).toBe(3);
  });

  it('leaves an unscoped clause exactly where it was', () => {
    // The other half of every acceptance in this file: a row that names no scope
    // is priced by the same arithmetic it always was. The door is the proof —
    // the same board, the same effects, the same number with the reading off.
    const { state, player } = realm(3);
    const rows: CardEffect[] = [
      { kind: 'pays', where: 'city', gold: 2 },
      { kind: 'percentYields', yield: 'science', percent: 20 },
      { kind: 'happiness', amount: 1, per: 'city' },
    ];
    const open = scoreEffects(rows, valueContext(state, player));
    scopeDoor.towns = false;
    scopeDoor.hexes = false;
    try {
      expect(scoreEffects(rows, valueContext(state, player))).toBe(open);
    } finally {
      scopeDoor.towns = true;
      scopeDoor.hexes = true;
    }
  });

  it('says the count in the label, so a nought in the feed can be accounted for', () => {
    // Rule 5's discipline one system over: every changed line is still a
    // `ValueTerm` and its label carries the reading that made it what it is.
    const { state, player } = realm(4);
    const appraisal = explainEffects(
      [{ kind: 'pays', where: 'city', gold: 2, scope: { test: 'coastal' } }],
      valueContext(state, player),
    );
    expect(appraisal.terms[0]!.label).toMatch(/in 0 of 4 towns/);
    const hexes = explainEffects(
      [{ kind: 'pays', where: 'hex', gold: 1, on: { test: 'hasResource' } }],
      valueContext(state, player),
    );
    expect(hexes.terms[0]!.label).toMatch(/on 0 worked hexes/);
  });
});
