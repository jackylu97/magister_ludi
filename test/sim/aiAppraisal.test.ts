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
 *   · **the ghost's tile lines** — `cityYields(state, city, [lighthouse])` now
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
 * Batch 4 is one ruling across four call sites — **the potential weight**
 * (`score.potentialWeight`, λ = 0.4): `realized + λ × (potential − realized)`,
 * wherever this bot can tell a thing it already collects from a thing it would
 * collect once somebody built, ploughed or researched. The beeline's per-town
 * building gift, a node's renewal riders, a counted card's buildable subjects
 * and a worker's anticipation of a node already on the seat's own research plan
 * each print the discount as a term of their own — which is what section 8
 * reads, term by term. The same batch stops a counted card being priced at a
 * nominal guess at all: it is counted by `countOf`, the simulation's own.
 */

import { describe, expect, it } from 'vitest';

import { explainCard, nextBotDecision, valueContext } from '../../src/ai/bot';
import {
  type BotCandidate,
  type BotDecision,
  type ValueTerm,
  foldTerms,
} from '../../src/ai/decision';
import { type PlanEntry, buildImprovementPlan, rankWorkSites } from '../../src/ai/plan';
import { explainCounted } from '../../src/ai/value';
import aiJson from '../../data/ai.json';

import { type BuildingId } from '../../src/sim/buildingData';
import { cityYields, foundCityAt } from '../../src/sim/cities';
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
} from '../../src/sim/state';
import { anyCardDef } from '../../src/sim/statecraft';
import {
  ORDER_IDS,
  TALLY_OCCASIONS,
  type CardCountScaledEffect,
  type OrderId,
  type TallyOccasion,
} from '../../src/sim/statecraftData';
import { researchExpansion } from '../../src/sim/tech';
import { isExploredBy, recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';

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
    home.buildings.push(...shelves);
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
    const now = cityYields(state, city);
    const withIt = cityYields(state, city, ['lighthouse']);
    // +2💰 off the row itself, and the +1🌾 on the water hex that used to be
    // invisible to the what-if (2026-09-04).
    expect(withIt.food - now.food).toBe(1);
    expect(withIt.gold - now.gold).toBeGreaterThan(now.gold - now.gold);
  });

  it('promises exactly what building it actually pays', () => {
    const { state, city } = coastal();
    const promised = cityYields(state, city, ['lighthouse']);
    // The ghost-city reading (`explainBuildingPreview`'s idiom) and the
    // hypothetical parameter are now the same answer, which is what "one
    // evaluator" means for a preview.
    const ghost: City = { ...city, buildings: [...city.buildings, 'lighthouse' as BuildingId] };
    expect(cityYields(state, ghost)).toEqual(promised);
    // And so is the town once the thing is actually standing in it.
    city.buildings.push('lighthouse');
    expect(cityYields(state, city)).toEqual(promised);
  });

  it('changes nothing about a reading that asked no what-if', () => {
    const { state, city } = coastal();
    const before = cityYields(state, city);
    // A hypothetical is a question, never a mutation: asking it leaves the town,
    // its shelves and its plain reading exactly where they were.
    cityYields(state, city, ['lighthouse']);
    cityYields(state, city, ['harbour']);
    expect(city.buildings).toEqual([]);
    expect(cityYields(state, city)).toEqual(before);
    expect(cityYields(state, city, [])).toEqual(before);
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
      }
    }
    player.gold = 200;
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
    // Re-aimed 2026-09-04 (the potential weight). Six river-bank hexes; two of
    // them already ploughed. Both halves still collect the day the node lands,
    // but they are no longer worth the same: the two standing farms are a fact
    // and the four bare banks are a promise, folded `2 + λ × 4` against the bare
    // board's `0 + λ × 6`.
    const ploughed = riverside(6);
    for (const [col, row] of [
      [4, 5],
      [6, 5],
    ] as const) {
      at(ploughed.map, col, row).improvement = 'farm';
    }
    const lambda = aiJson.score.potentialWeight;
    const rows = techRow(ploughed, 'Irrigation').terms;
    const standing = findTerm(rows, /Farm renewal — on \d+ hexes? that can drink already carrying one/);
    const buildable = findTerm(rows, /Farm renewal — on \d+ hexes? that can drink this empire could put one on/);
    expect(labelsOf([standing!])).toMatch(/on 2 hexes that can drink already carrying one/);
    expect(labelsOf([buildable!])).toMatch(/on 4 hexes that can drink this empire could put one on/);
    // The rider's bag per hex, read off the standing line, prices both.
    const each = standing!.value / 2;
    expect(buildable!.value).toBeCloseTo(each * 4 * lambda, 10);
    // And the ploughed board is worth strictly more than the bare one: two
    // farms in the ground beat two farms somebody has still to walk out and lay.
    const bare = findTerm(
      techRow(riverside(6), 'Irrigation').terms,
      /Farm renewal — on \d+ hexes? that can drink this empire could put one on/,
    );
    expect(standing!.value + buildable!.value).toBeGreaterThan(bare!.value);
    expect(bare!.value).toBeCloseTo(each * 6 * lambda, 10);
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

  it('wants no more soldiers than the standing levy in a quiet world', () => {
    // Two towns' worth of levy for one town is exactly what is standing, so the
    // candidate is not merely cheap — the empire does not want one at all.
    expect(soldierRow(levy([]))).toBeNull();
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
    expect(soldierRow(dark)).toBeNull();
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

// --- 8. the potential weight ------------------------------------------------

/**
 * **λ, the potential weight** (`docs/flags.md`, ruled 2026-09-04):
 * `value = realized + λ × (potential − realized)`, one knob, and every call site
 * prints its own discount.
 *
 * Four of the five claims below are about a *term* rather than about a score,
 * and that is the ruling's own emphasis: the seat is allowed to want what it
 * cannot yet collect, and a reader of the feed has to be able to see how much
 * less it wants it. The fifth — the growing card — is about an *order*, because
 * a counter twelve occasions deep and an empty one are the same row and used to
 * be worth the same number.
 */
describe('the potential weight', () => {
  const LAMBDA = aiJson.score.potentialWeight;

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
        if (effect.kind === 'countScaled' && effect.count === 'tally') return id;
      }
    }
    throw new Error('no growing card in the Order table');
  }

  it('discounts the beeline’s per-town building gift, and says so in the fold', () => {
    const { state } = towns(2);
    const decision = decisionOfType(state, 0, 'chooseResearch');
    expect(decision).not.toBeNull();
    const row = decision!.candidates.find(
      (entry) => findTerm(entry.terms, /its flat yields, in every town/) !== null,
    );
    expect(row).toBeDefined();
    const flats = findTerm(row!.terms, /its flat yields, in every town/)!;
    // The discount is a term of its own, beside the town count it discounts —
    // not a number folded into the value where nobody can see it.
    const discount = flats.parts!.find((term) => /towns that must still build it/.test(term.label));
    expect(discount).toBeDefined();
    expect(discount!.op).toBe('mul');
    expect(discount!.value).toBe(LAMBDA);
    // And the term is still its own arithmetic, as is the candidate holding it.
    expect(foldTerms(flats.parts!)).toBeCloseTo(flats.value, 10);
    expect(foldTerms(row!.terms)).toBe(row!.score);
  });

  it('folds a node’s renewal as standing + λ × buildable', () => {
    // Five river-bank hexes, two of them already ploughed: 2 standing and 3
    // buildable, which is the ruling's own worked example.
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
    expect(buildable.value).toBeCloseTo(each * 3 * LAMBDA, 10);
    expect(standing.value + buildable.value).toBeCloseTo(each * (2 + LAMBDA * 3), 10);
    expect(foldTerms(row.terms)).toBe(row.score);
  });

  it('prices a counted card by what the empire counts, plus λ of what it could', () => {
    // Six towns, two of which have already raised the row the card counts. The
    // other four could raise it today (`buildError` is null in a fresh town), so
    // the fold is 2 + λ × 4 = 3.6 helpings, and the pin is that arithmetic.
    const { state, player, cities } = towns(6);
    for (const city of cities.slice(0, 2)) city.buildings.push('monument');
    // The row's own gate is the simulation's: without Stonecraft `buildError`
    // refuses every town and the potential is honestly nought.
    for (const step of researchExpansion(state, 0, 'stonecraft')) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
    }
    const effect: CardCountScaledEffect = {
      kind: 'countScaled',
      count: 'buildingsOfKind',
      building: 'monument',
      pays: { to: 'yield', yield: 'culture', amount: 1, where: 'empire' },
    };
    const ctx = valueContext(state, player);
    const appraisal = explainCounted(effect, ctx);
    expect(appraisal.terms[0]!.value).toBe(2);
    expect(labelsOf([appraisal.terms[0]!])).toMatch(/2 buildingsOfKind today/);
    expect(appraisal.terms[1]!.value).toBeCloseTo(4 * LAMBDA, 10);
    expect(labelsOf([appraisal.terms[1]!])).toMatch(/4 more the towns could raise/);
    const pays = appraisal.terms[appraisal.terms.length - 1]!;
    expect(pays.op).toBe('mul');
    expect(pays.value).toBeGreaterThan(0);
    expect(appraisal.total).toBeCloseTo((2 + LAMBDA * 4) * pays.value, 10);
    expect(foldTerms(appraisal.terms)).toBe(appraisal.total);
    // And the same card on a board where nothing is built anywhere is worth
    // strictly less: every subject a promise, and a promise is worth λ.
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
    // The whole of the fifth call site: the same row, the same board, twelve
    // occasions apart — and until this ruling the two numbers were equal.
    expect(deep).toBeGreaterThan(empty);
  });

  it('forecasts a tally per occasion, and says out loud when it cannot', () => {
    const { state, player } = towns(1);
    const ctx = valueContext(state, player);
    const id = growingCard();
    const known = TALLY_OCCASIONS[0]!;
    const pays = { to: 'yield', yield: 'culture', amount: 1, where: 'empire' } as const;
    const forecast = explainCounted(
      { kind: 'countScaled', count: 'tally', tally: known, pays },
      ctx,
      id,
    );
    const promise = forecast.terms[1]!;
    expect(promise.value).toBeCloseTo((aiJson.score.tallyForecast[known] ?? 0) * LAMBDA, 10);
    expect(labelsOf([promise])).toMatch(new RegExp(`more ${known} to come`));
    // An occasion the table does not name is **visibly** unpriced rather than
    // quietly guessed at — which is what makes a sixth occasion safe to add.
    const unpriced = explainCounted(
      { kind: 'countScaled', count: 'tally', tally: 'aMomentNobodyHasPriced' as TallyOccasion, pays },
      ctx,
      id,
    );
    expect(unpriced.terms[1]!.value).toBe(0);
    expect(labelsOf([unpriced.terms[1]!])).toMatch(/no forecast/);
    expect(unpriced.total).toBe(0);
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
    }
    const entryFor = (): PlanEntry | undefined => {
      const ctx = valueContext(state, player);
      const plan = buildImprovementPlan(state, player, ctx);
      return plan.byTile.get(tileIndex(state.map, tile.col, tile.row));
    };

    player.researching = 'irrigation';
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
});
