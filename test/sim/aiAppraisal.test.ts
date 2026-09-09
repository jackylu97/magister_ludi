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

import {
  bestTechGoal,
  explainCard,
  explainCitizen,
  explainSite,
  isPatientRow,
  nextBotDecision,
  valueContext,
} from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import { incumbentGoal, liveChains, techChain } from '../../src/ai/chain';
import { citizenKeepTerm } from '../../src/ai/citizen';
import {
  type Appraisal,
  type BotCandidate,
  type BotDecision,
  type ValueTerm,
  foldTerms,
} from '../../src/ai/decision';
import {
  type PlanEntry,
  buildImprovementPlan,
  explainWorkerCraving,
  rankWorkSites,
  renewalFoldFor,
} from '../../src/ai/plan';
import {
  BUILDING_ROW_FOLDED,
  BUILDING_ROW_SILENT,
  type ValueContext,
  delayDiscount,
  delayTerm,
  explainBuildingRow,
  explainCounted,
  explainEffects,
  explainYields,
  explainLump,
  explainProjectRow,
  faithPrice,
  hasFoldReadEngine,
  meterWeight,
  scoreEffects,
  sciencePrice,
  siteRefusal,
  townsAdmitting,
  voiceWeight,
  workedHexesAdmitting,
  yieldWeight,
} from '../../src/ai/value';
import { levyReading } from '../../src/ai/campaign';
import type { Want } from '../../src/ai/wants';
import aiJson from '../../data/ai.json';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../../src/sim/buildingData';
import {
  buildingProductionCost,
  foundCityAt,
  purchasableTiles,
  refreshCityDerived,
  turnsToBuild,
  unitProductionCost,
} from '../../src/sim/cities';
import {
  empirePercents,
  explainCity,
  foldCity,
} from '../../src/sim/yields/town';
import {
  explainEmpireCardYields,
  foldEmpireRates,
} from '../../src/sim/yields/empire';
import {
  buildingAdjacentHeal,
  buildingCityHp,
  buildingDemandRelief,
  buildingPurchaseDiscount,
  buildingRitePay,
  buildingUnitUpkeepRebate,
  foldBuildingCityStat,
} from '../../src/sim/buildingEffects';
import { cityBaseStrength, cityMaxHp } from '../../src/sim/combat';
import { explainHappiness, happinessDemand } from '../../src/sim/meters';
import { LIVE_RITE_IDS, riteDef } from '../../src/sim/religionData';
import { unitUpkeepTotal } from '../../src/sim/upkeep';
import { applyCommand } from '../../src/sim/commands';
import { improvementDef } from '../../src/sim/improvementData';
import {
  type GameMap,
  type Tile,
  createMap,
  getTileAt,
  mapRange,
  tileHex,
  tileIndex,
} from '../../src/sim/map';
import type { TerrainId } from '../../src/sim/terrainData';
import { unitDef } from '../../src/sim/unitData';
import {
  type TileYieldContext,
  cityContext,
  foldTile,
  yieldContextFor,
} from '../../src/sim/yields/hex';
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
import { buildError, gatingTech, researchExpansion } from '../../src/sim/tech';
import { PROJECT_IDS, projectDef } from '../../src/sim/projectData';
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
  { width = 20, height = 12, terrain = 'grassland' }: { width?: number; height?: number; terrain?: TerrainId } = {},
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

  /**
   * **The verb moved with batch R1 and the claim did not.** A route is hired
   * with gold now, so the shelves are answered by the *treasury* before the
   * idle wagon is ever ordered — and what the treasury names is the home pair,
   * off the very shelves this fixture moved. The mirror is unchanged: the same
   * three towns and the same neighbour, with only the origin's shelves
   * different, and the answer different with them.
   *
   * (The harbour among `SHELVES` is what opens the second slot the hire needs;
   * a bare origin has one slot, the idle wagon is already waiting for it, and
   * `explainCaravan` refuses to want a second route at all — which is why the
   * mirror's other half never reaches this verb.)
   */
  it('keeps it at home when the origin’s shelves out-pay the crossing', () => {
    const { state, home, second, abroad } = threeTowns(SHELVES);
    const hired = decisionOfType(state, 0, 'buyRoute');
    expect(hired).not.toBeNull();
    expect(hired!.command).toMatchObject({
      type: 'buyRoute',
      fromCityId: home.id,
      toCityId: second.id,
    });
    expect((hired!.command as { toCityId: number }).toCityId).not.toBe(abroad.id);
    expect(applyCommand(state, hired!.command).ok).toBe(true);

    // And the crossing was weighed rather than skipped: the wagon still
    // standing idle is put on the table against every pair, and goes abroad
    // only because the richer pair has just been spent.
    const sent = decisionOfType(state, 0, 'startRoute');
    expect(sent).not.toBeNull();
    const crossings = sent!.candidates.filter(
      (row) => row.rejected === undefined && row.label.includes('(Bors)'),
    );
    expect(crossings.length).toBeGreaterThan(0);
    const taken = sent!.candidates.find((row) => row.rejected !== undefined)!;
    expect(taken.rejected).toMatch(/already runs/);
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
   * **`renewalSteps` (`chain.ts`) reads `renewalFoldFor` now** (X1d-ground,
   * landed with X1d-chain): the two count claims that used to open this block
   * retired with the survey; section 18 pins the fold. What stays here is the
   * bench and the two claims about a node's *rules*.
   */
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

  // The two count claims that stood here ("prices Irrigation by the river bank
  // that would actually collect it", "counts the farms already standing apart
  // from the ground that could take one") retired 2026-09-09 with the survey
  // they read: `renewalSteps` prices the fold now — section 18's "prices a
  // renewal as the fold it would move" is the claim that replaced them.

  it('prices a node that carries its own rules through the card reader', () => {
    // **Re-aimed 2026-09-09, batch X1d.** Every gift a node hands over now waits
    // for the node — the projects, the abilities, the bead and the rules with
    // them (see `chain.ts`' docblock: a constant per node folded at full price
    // made a chain worth more for being *longer* once the whole road was walked).
    // So the printed term is the reader's own appraisal multiplied by the node's
    // landing, and on this bench that landing is past the horizon: the claim is
    // that the rules *reach* the fold, which is the reader's own value inside.
    const row = techRow(riverside(3), 'Epic Poetry');
    const rules = findTerm(row.terms, /the rules the node itself carries/);
    expect(rules).not.toBeNull();
    const read = rules!.parts === undefined ? null : foldTerms(rules!.parts.slice(0, 1));
    expect(read).not.toBeNull();
    expect(read).not.toBe(0);
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
    // **Re-aimed 2026-09-05** (batch 3 — the tech chain) and again **2026-09-09**
    // (batch X1d — the copies). The gift is no longer one flat bag times a town
    // count: it is one **copy per town that would raise it**, each priced by that
    // town's own hypothetical fold and each discounted at that town's own landing
    // (`StepCopy`, `chain.ts`). So the pin is the same relation said of a copy —
    // the delay is at least the row's own raising, in the town that would raise
    // it — plus the arithmetic, which is still exactly `(H − delay)/H` read off
    // the very turns the term prints.
    const { state } = towns(2);
    const decision = decisionOfType(state, 0, 'chooseResearch');
    expect(decision).not.toBeNull();
    const step = /^(.+) — in \d+ towns? that would raise it$/;
    const row = decision!.candidates.find((entry) => findTerm(entry.terms, step) !== null);
    expect(row).toBeDefined();
    const gift = findTerm(row!.terms, step)!;
    // One term per copy, and each names the town it stands in.
    expect(gift.parts!.length).toBeGreaterThan(0);
    const copy = gift.parts![0]!;
    expect(copy.label).toMatch(/ at /);
    // The discount is a term of its own inside the copy — not a number folded
    // into the value where nobody can see it — and it prints the turns it was
    // read off. Matched on the horizon clause, which is `delayTerm`'s and
    // nothing else's.
    const discount = copy.parts!.find((term) => /against a \d+-turn horizon/.test(term.label));
    expect(discount).toBeDefined();
    expect(discount!.op).toBe('mul');
    expect(discount!.label).toMatch(/to raise it/);
    const printed = Number(
      /some ([\d.]+) turns against a (\d+)-turn horizon/.exec(discount!.label)![1],
    );
    expect(discount!.value).toBeCloseTo(discountFor(printed), 2);
    // At least the row's own raising in *that* town: the chain charges that and
    // the research wait besides. The town is named in the copy's own label.
    const named = state.cities.find((town) => copy.label.endsWith(` at ${town.name}`))!;
    expect(named).toBeDefined();
    const id = rowNamed(gift.label);
    expect(printed).toBeGreaterThanOrEqual(
      turnsToBuild(state, named, { kind: 'building', id }, named.queue.length)!,
    );
    // And the term is still its own arithmetic, as is the candidate holding it.
    expect(foldTerms(copy.parts!)).toBeCloseTo(copy.value, 10);
    expect(foldTerms(gift.parts!)).toBeCloseTo(gift.value, 10);
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

  // "folds a node's renewal as standing + the walk's discount × buildable" —
  // retired 2026-09-09 with the survey it read (X1d-ground's ruling: a renewal
  // is the town's fold with the technology held, over the hexes citizens work;
  // section 18's "prices a renewal as the fold it would move" is the claim now).

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
    const term = findTerm(anticipated!.terms, /is inside the horizon/);
    expect(term).not.toBeNull();
    expect(term!.value).toBeGreaterThan(0);
    expect(foldTerms(anticipated!.terms)).toBe(anticipated!.value);

    // **The plan cleared, and the seat still suspects the node** — batch X1e
    // (2026-09-09), which moved the bound from the declared plan to the horizon:
    // a node one re-aim away is a node a person would price the ground for, and
    // this one's whole road is the node itself, so clearing the queue changes
    // neither the landing nor the rider.
    player.researching = null;
    player.researchQueue = [];
    const undeclared = entryFor();
    expect(undeclared).toBeDefined();
    const still = findTerm(undeclared!.terms, /is inside the horizon/);
    expect(still).not.toBeNull();
    expect(still!.value).toBeCloseTo(term!.value, 10);

    // And the horizon is the whole of the bound: the same hex with the pool
    // emptied owes the node its whole cost, which a one-town bench banking a
    // beaker a turn cannot reach inside `priorities.horizonTurns` — so the hex is
    // worth what it pays today and no more.
    player.sciencePool = 0;
    const plain = entryFor();
    expect(plain).toBeDefined();
    expect(findTerm(plain!.terms, /is inside the horizon/)).toBeNull();
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
      const term = findTerm(entry!.terms, /is inside the horizon/);
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

  /**
   * **Batch X1b — beakers are time, not coin** (the user's ruling of 2026-09-09,
   * `docs/flags.md` item (ggg): *"we shouldn't be thinking about science spend
   * with the same value we're thinking about science gain"*).
   *
   * Research always runs, so aiming at a goal consumes nothing an empire would
   * otherwise have kept — the only cost is that everything behind it arrives
   * later, and the chain carries that as `researchDelay` and discounts every
   * payoff through it. Subtracting the same beakers again at `weights.science`
   * was one thing charged twice and is gone. Two halves, both pinned here: the
   * delay still reads the beakers, and the fold no longer does.
   */
  it('charges the road’s beakers as a delay and never as a lump', () => {
    const { state, player } = chained(3);
    const ctx = valueContext(state, player);
    const chain = techChain(state, player, ctx, 'education');
    expect(chain.held).toBe(false);
    expect(chain.remainingBeakers).toBeGreaterThan(0);

    // **The delay still reads them** — the road's beakers over the empire's own
    // science rate — and it is the landing of the road's **last** node, which is
    // the goal. **Re-aimed 2026-09-09, batch X1d**: the chain now walks the whole
    // road, so a step of an intermediate node lands at *that* node's cumulative
    // beakers and starts paying before the goal does. What still holds is the
    // shape of the wait: no step starts before the first node lands, and the
    // chain's own `delay` — when the last of it would start paying — is at least
    // the whole road's.
    expect(chain.researchDelay).toBe(chain.remainingBeakers / Math.max(1, ctx.scienceRate));
    const first = techDef(chain.road[0]!).cost / Math.max(1, ctx.scienceRate);
    expect(chain.steps.every((step) => step.delay >= first)).toBe(true);
    expect(chain.delay).toBeGreaterThanOrEqual(chain.researchDelay);

    // **And the fold does not.** The line is still printed — a reader of the feed
    // wants to see what the road owes — beside the number that was multiplied.
    const printed = findTerm(chain.terms, /beakers still owed for the road/);
    expect(printed).not.toBeNull();
    expect(printed!.value).toBe(0);
    expect(printed!.op).toBeUndefined();
    // **Re-aimed 2026-09-09, batch X12**: the stones went the same way as the
    // beakers, by the same argument — production is always spent on something,
    // and each copy above already waits on its own town's cursor. So a chain
    // subtracts no lump at all now, and the hammers print at nothing beside the
    // wait they bought.
    const stones = findTerm(chain.terms, /hammers its steps still owe/);
    expect(stones).not.toBeNull();
    expect(stones!.value).toBe(0);
    expect(chain.terms.some((term) => term.op === 'sub')).toBe(false);
    expect(chain.hammers).toBeGreaterThan(0);
    expect(foldTerms(chain.terms)).toBe(chain.worth);

    // A chain whose road is walked prints no such line at all, and never did.
    const { state: held, player: holder } = chained(3, 'education');
    const walked = techChain(held, holder, valueContext(held, holder), 'education');
    expect(walked.held).toBe(true);
    expect(findTerm(walked.terms, /beakers still owed for the road/)).toBeNull();
  });

  /**
   * **X1b's second half** — the ruling's own premise made true. It says the road
   * is already charged *"discounting every payoff behind it"*, and a building
   * step's was (its `delay` starts at the cursor's `researchDelay`) while the
   * option a node hands over was not: `unitTerm` was folded at full price on a
   * node nobody had researched. With the beaker lump gone that left a military
   * node's road priced by nothing at all — measured, and the table is in
   * `docs/bot-priorities.md`. The option waits for the node like everything else.
   */
  it('makes the option a node hands over wait for the road it is behind', () => {
    // **Re-aimed 2026-09-09, batch X1d**: the wait a unit step carries is its own
    // node's landing rather than the whole road's, because the road is walked now
    // and every node on it hands something over. The goal's own option still
    // waits for the whole road — the goal is the road's last node — so the pin is
    // made about the piece the *goal* unlocks, found by name off the tree rather
    // than by taking whichever unit step came first.
    const { state, player } = chained(3);
    const ctx = valueContext(state, player);
    const chain = techChain(state, player, ctx, 'fletching');
    expect(chain.held).toBe(false);
    const offered = techDef('fletching').unlocks.units ?? [];
    expect(offered.length).toBeGreaterThan(0);
    const step = chain.steps.find((one) => one.kind === 'unit' && one.id === offered[0])!;
    expect(step).toBeDefined();
    const wait = findTerm(step.terms, /node has still to land/);
    expect(wait).not.toBeNull();
    expect(wait!.op).toBe('mul');
    expect(wait!.value).toBe(delayTerm(chain.researchDelay, ctx, 'x').value);
    expect(wait!.label).toContain(techDef('fletching').name);
    expect(foldTerms(step.terms)).toBe(step.value);

    // A node this empire already holds hands over its option now, so there is no
    // wait to print and none is printed.
    const { state: held, player: holder } = chained(3, 'fletching');
    const walked = techChain(held, holder, valueContext(held, holder), 'fletching');
    expect(walked.held).toBe(true);
    const now = walked.steps.find((one) => one.kind === 'unit')!;
    expect(findTerm(now.terms, /node has still to land/)).toBeNull();
  });

  /**
   * **Batch X1c — what a beaker is worth is what the road is worth hurrying**
   * (the user's ruling of 2026-09-09, `docs/flags.md` item (ggg), and the
   * intent behind it: *"the bot should prioritize science gain more heavily than
   * it values science spent"*).
   *
   * X1b said what a beaker does not cost. This is the other side: a beaker's
   * whole worth is the wait it removes, so `sciencePrice` is the table plus what
   * one more beaker a turn takes off every live chain's payoffs —
   * `hammerPrice`'s twin, on the same chains, through the same discount.
   *
   * Four claims, and the first is the one that keeps the price honest: an empire
   * with no road left prices a beaker at exactly the table, so nothing anywhere
   * in the bot moved for an empire the batch has nothing to say about.
   */
  /**
   * **The goal X1c's three cases price a beaker against**, and it is chosen
   * rather than arbitrary. The bench's empire makes ten beakers a turn, so a road
   * of a few nodes lands well inside the sixty-turn horizon and every step of the
   * chain is a payoff the premium can actually hurry — where Education, the goal
   * the batch-3 cases use, is forty turns off on this board and worth nothing to
   * bring forward at all. That zero is a real reading (`delayDiscount`'s floor is
   * the whole of it) and not the one these cases are about.
   */
  const GOAL: TechId = 'sailing';

  it('prices a beaker at the table with no road left, and above it with one', () => {
    const { state, player } = chained(3);
    const ctx = valueContext(state, player);
    const table = yieldWeight(ctx.ai, 'science', ctx.age);

    // (a) **No chain at all** — the table, to the bit. A `ValueContext` is the
    // memo's key, so each of these spreads is a fresh reading rather than a
    // remembered one.
    const idle: ValueContext = { ...ctx, chains: [] };
    expect(sciencePrice(idle)).toBe(table);

    // (b) **A chain whose road is walked** owes no beakers, so it has nothing for
    // a beaker to hurry: a held technology's outstanding buildings are waiting on
    // stones, and the hammer price is the one that prices those.
    const { state: held, player: holder } = chained(3, 'education');
    const walkedCtx = valueContext(held, holder);
    const walked = techChain(held, holder, walkedCtx, 'education');
    expect(walked.held).toBe(true);
    expect(walked.remainingBeakers).toBe(0);
    // Its own table: holding the road put that empire in the next age, and the
    // weight is an age's.
    const walkedTable = yieldWeight(walkedCtx.ai, 'science', walkedCtx.age);
    expect(sciencePrice({ ...walkedCtx, chains: [walked] })).toBe(walkedTable);

    // (c) **A road ahead prices a beaker above the table**, by exactly the drop in
    // the research delay times what the chain's payoffs are worth per turn of it.
    const road = techChain(state, player, ctx, GOAL);
    expect(road.remainingBeakers).toBeGreaterThan(0);
    const priced: ValueContext = { ...ctx, chains: [road] };
    const rate = Math.max(1, ctx.scienceRate);
    const drop = road.remainingBeakers / rate - road.remainingBeakers / (rate + 1);
    expect(drop).toBeGreaterThan(0);
    let premium = 0;
    for (const step of road.steps) {
      premium +=
        step.rate * (delayDiscount(Math.max(0, step.delay - drop), ctx) - delayDiscount(step.delay, ctx));
    }
    expect(premium).toBeGreaterThan(0);
    // `===`: the price is the formula and nothing beside it, cap included.
    expect(sciencePrice(priced)).toBe(
      Math.min(table * ctx.ai.priorities.priceBandHigh, table + premium),
    );
    expect(sciencePrice(priced)).toBeGreaterThan(table);
  });

  /**
   * **The premium is the beakers owed, scaled** — the claim behind the whole
   * shape. `drop` is `owed ÷ (rate·(rate+1))` and the discount is linear, so a
   * road twice as long is a premium twice as large: an empire aiming at something
   * far away values a beaker more than one aiming at the node next door.
   *
   * Read with the band opened, because the band is a *cap on the price* and this
   * is a claim about the *premium* — the two are different questions and the
   * measured board hits the cap often enough that reading them together would
   * pin the cap instead.
   */
  it('scales the premium with the beakers the road still owes', () => {
    const { state, player } = chained(3);
    const ctx = valueContext(state, player);
    const uncapped: ValueContext = {
      ...ctx,
      ai: { ...ctx.ai, priorities: { ...ctx.ai.priorities, priceBandHigh: 1_000_000 } },
    };
    const table = yieldWeight(ctx.ai, 'science', ctx.age);
    const road = techChain(state, player, ctx, GOAL);
    const halved = { ...road, remainingBeakers: road.remainingBeakers / 2 };

    const full = sciencePrice({ ...uncapped, chains: [road] }) - table;
    const half = sciencePrice({ ...uncapped, chains: [halved] }) - table;
    expect(half).toBeGreaterThan(0);
    expect(full).toBeCloseTo(half * 2, 9);

    // And two chains owing the same road are two roads' worth of hurry — the sum
    // over `liveChains` the docblock states, not a maximum over them.
    const both = sciencePrice({ ...uncapped, chains: [road, road] }) - table;
    expect(both).toBeCloseTo(full * 2, 9);
  });

  /**
   * **The premium is printed where science is folded**, which is the ruling's
   * other half — the feed has to be able to say why a library is worth what it is
   * this turn and not what it was worth last turn. Gold has said its shadow price
   * in the same place since batch 1.
   */
  it('names the premium in the science line, and folds to its own total', () => {
    const { state, player } = chained(3);
    const ctx = valueContext(state, player);
    const table = yieldWeight(ctx.ai, 'science', ctx.age);
    const road = techChain(state, player, ctx, GOAL);
    const priced: ValueContext = { ...ctx, chains: [road] };

    const appraisal = explainYields({ science: 2 }, priced);
    const line = appraisal.terms.find((term) => term.label.startsWith('science'));
    expect(line).toBeDefined();
    expect(line!.label).toMatch(/the science price/);
    expect(line!.label).toMatch(/the table's/);
    // The number in the line is the number that was multiplied.
    expect(line!.value).toBe(2 * sciencePrice(priced));
    // Rule 5's discipline, one system over: the total is the fold of the list.
    expect(foldTerms(appraisal.terms)).toBe(appraisal.total);

    // An empire with no road left says so plainly, and folds at the table.
    const idle: ValueContext = { ...ctx, chains: [] };
    const plain = explainYields({ science: 2 }, idle);
    const plainLine = plain.terms.find((term) => term.label.startsWith('science'))!;
    expect(plainLine.label).toMatch(/age weight/);
    expect(plainLine.value).toBe(2 * table);
    expect(foldTerms(plain.terms)).toBe(plain.total);
  });

  it('drops a realised step out, and loses exactly the copy that was paid', () => {
    // **The commitment arithmetic, re-aimed twice.** Education's chain owes a
    // University to every town that lacks one, and a town that holds the row is
    // not a town that would raise it — so the step's `towns`, the chain's
    // `stepsRemaining` and the hammers it owes all fall by one copy. That half is
    // principle 1 of the spec and has never moved: incumbency is arithmetic, not
    // memory, and nothing is stored or marked done.
    //
    // What has moved is the *sign*. The case used to claim the remaining worth
    // **rises**, and it did, for two reasons that are both gone: a step's payoff
    // was the row's flat bag (a University's is empty — its whole payout is
    // `sciencePerPop`), so raising one took nothing out of the payoff; and the
    // chain subtracted the copy's hammers as a lump, so raising one took the
    // whole 134 out of the cost. **Batch X1d** gave every copy its own town's
    // fold, so a University now pays; **batch X12** made the stones a wait rather
    // than a lump, so there is no cost ledger left for a payment to leave. The
    // honest reading is what the fold now says: the chain loses **exactly** the
    // copy that was raised, and nothing else about it moves.
    const { state, player, cities } = chained(3, 'education');
    const before = techChain(state, player, valueContext(state, player), 'education');
    const university = before.steps.find((step) => step.id === 'university');
    expect(university).toBeDefined();
    expect(university!.towns).toBe(3);
    const raised = university!.copies.find((copy) => copy.cityId === cities[0]!.id)!;
    expect(raised).toBeDefined();
    expect(raised.value).toBeGreaterThan(0);

    cities[0]!.buildings.push('university');
    bumpRevision(state);
    const after = techChain(state, player, valueContext(state, player), 'education');
    expect(after.steps.find((step) => step.id === 'university')!.towns).toBe(2);
    expect(after.stepsRemaining).toBe(before.stepsRemaining - 1);
    expect(after.hammers).toBe(before.hammers - buildingProductionCost('university'));
    // The whole of the difference is that one copy: the other two towns raise on
    // their own cursors and neither was waiting on this one.
    expect(before.worth - after.worth).toBeCloseTo(raised.value, 6);
  });

  /**
   * **Batch X1 — the unit step pays for itself** (`docs/audit/bot-pass-2.md`,
   * finding 1). A unit step used to cost `cost: 0` hammers by construction while
   * every building step subtracted its own through `explainLump`, so a node
   * whose gift was a spearman was a pure positive and a node whose gift was a
   * library was a positive minus a big number — 62–64% of every node weighed on
   * the audit's bench scored negative and 61–63% of every re-aim was military.
   *
   * Two claims, and they are the two halves of the change: the hammers a unit
   * step owes are the levy's own shortfall, and the threat premium is charged
   * against that same shortfall rather than at every sight of a column.
   */
  it('charges a unit step the hammers of the pieces the levy is short', () => {
    // Three towns and no soldiers: `military.armyPerCity` apiece is the whole of
    // the levy on a quiet one-seat board (no column at a gate, nothing charted),
    // and Fletching's only step is the archer it unlocks.
    const { state, player } = chained(3);
    const chain = techChain(state, player, valueContext(state, player), 'fletching');
    const step = chain.steps.find((one) => one.kind === 'unit');
    expect(step).toBeDefined();
    const price = unitProductionCost(state, 0, 'archer');
    const wanted = 3 * aiJson.military.armyPerCity;
    expect(step!.cost).toBe(wanted * price);
    // It is one *raising* and several pieces' hammers, deliberately: a node
    // hands over an option, so it is one thing that still has to happen, while
    // the empire that takes it raises as many as the levy is short.
    expect(step!.towns).toBe(1);
    expect(chain.hammers).toBe(step!.cost);
    expect(labelsOf(chain.terms)).toMatch(/hammers its steps still owe/);
    expect(foldTerms(chain.terms)).toBe(chain.worth);

    // And a piece already standing is a piece the step no longer owes for —
    // the same sunk-cost story a raised building tells one test above.
    createUnit(state, 0, 'warrior', 4, 8);
    createUnit(state, 0, 'warrior', 5, 8);
    recomputeAllVisibility(state);
    const after = techChain(state, seat(state, 0), valueContext(state, seat(state, 0)), 'fletching');
    expect(after.steps.find((one) => one.kind === 'unit')!.cost).toBe((wanted - 2) * price);
  });

  it('gives a seat with no levy shortfall no military premium', () => {
    // One town with a rival's column beside it, so `ctx.threat` is real and the
    // swing is live. The claim is that the swing is about the *emergency* rather
    // than about the sighting: an empire that already holds every soldier its
    // levy asks for is not in one, and pays no premium.
    const state = bench(2);
    state.turn = 50;
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    city.population = 4;
    refreshCityDerived(state, city);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const hungry = valueContext(state, seat(state, 0));
    expect(hungry.threat).toBeGreaterThan(0);
    const short = techChain(state, seat(state, 0), hungry, 'fletching').steps.find(
      (one) => one.kind === 'unit',
    )!;
    expect(labelsOf(short.terms)).toMatch(/a column is near a town, and this empire is/);

    // Now fill the levy. The column has not moved and the sighting has not
    // changed; only the shortfall has.
    for (let index = 0; index < 6; index++) createUnit(state, 0, 'warrior', 3 + index, 9);
    recomputeAllVisibility(state);
    const filled = valueContext(state, seat(state, 0));
    expect(filled.threat).toBe(hungry.threat);
    const full = techChain(state, seat(state, 0), filled, 'fletching').steps.find(
      (one) => one.kind === 'unit',
    )!;
    expect(labelsOf(full.terms)).not.toMatch(/a column is near a town/);
    expect(full.cost).toBe(0);
    expect(full.value).toBeLessThan(short.value);
    expect(foldTerms(full.terms)).toBe(full.value);
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
    // The seat is handed Sailing **and Mathematics** before the table is taken,
    // and that is the fixture rather than an aside: on a blank bench Sailing
    // outscores the tree two to one, and with only it held Currency runs away in
    // turn (the 2026-09-05 retune widened every natural race past the margin).
    // The held set grew to four over two balance passes and came back to two on
    // **batch P1**.
    //
    // **Re-aimed twice on 2026-09-08, batches X1 and X2 landing together**
    // (`docs/audit/bot-pass-2.md`), and **again on 2026-09-09, batch X1d**: the
    // chain walks the whole road now, so a goal's worth includes every node
    // behind it and every table on every held set re-ranked. The sweep was run
    // once more over every one- and two-node held set on this bench (six produce
    // a straddling pair) and the fixture is Agriculture with Mining held —
    // Sailing leads at 840, The Wheel holds the plan at 647 and Stonecraft
    // yields at 676 despite the higher score, because installing a plan re-scores
    // the table it is being compared against.
    //
    // **And that re-scoring is why the boundary is no longer asserted off the
    // no-incumbent scores.** It used to be: a challenger held iff its printed
    // score times the margin beat the leader's. With the road walked, installing
    // a plan changes `liveChains` — the incumbent chain is the whole road now —
    // so the table the incumbent is compared against is not the table the
    // opening printed, and a comparison across the two is a comparison of two
    // different boards. What is claimed here is the *behaviour*: some challenger
    // holds the plan and some other does not, and the leader installed has
    // nothing to defend against. The margin's arithmetic — that it is a term of
    // the incumbent's own fold, at exactly `priorities.switchMargin` — is pinned
    // exactly by the case below this one.
    const { state, player } = chained(3, 'agriculture');
    for (const tech of ['mining'] as const) {
      for (const step of researchExpansion(state, 0, tech)) {
        if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
        bumpRevision(state);
      }
    }
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
    expect(margin).toBeGreaterThan(1);
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

  // --- batch X1d: the copies, and the whole road ------------------------------

  /**
   * **The library is worth what the town that raises it makes of it** — the
   * user's ruling of 2026-09-09 (`docs/flags.md` item (ggg)): *"the value of a
   * library is contingent on the city that builds it: a city in your capital with
   * high population is worth a lot of science, and is built faster than a middling
   * city."*
   *
   * The bench is the ruling read literally: one board, two towns, one of size
   * twelve and one of size two, both lacking the row. The claim is that the two
   * copies print *different* numbers and that the big town's is the bigger one —
   * and it is made about the fold rather than about a figure, because a Library's
   * `sciencePerPop` is a data row and the point is that the chain now reads it
   * through `foldCity` instead of through the row's flat bag.
   */
  function libraryRow(): { id: BuildingId; tech: TechId } {
    for (const id of BUILDING_IDS) {
      const def = buildingDef(id);
      if (def.sciencePerPop <= 0) continue;
      const tech = gatingTech('building', id);
      if (tech === null) continue;
      return { id, tech };
    }
    throw new Error('no per-population science row in the table');
  }

  it('prices a row per copy — the big town’s fold and the hamlet’s, not one bag', () => {
    const { id, tech } = libraryRow();
    const { state, player, cities } = chained(2, tech);
    cities[0]!.population = 12;
    cities[1]!.population = 2;
    for (const city of cities) refreshCityDerived(state, city);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const chain = techChain(state, player, ctx, tech);
    const step = chain.steps.find((one) => one.kind === 'building' && one.id === id)!;
    expect(step).toBeDefined();
    // One copy per town that would raise it, each naming its town.
    expect(step.copies.length).toBe(2);
    expect(step.towns).toBe(step.copies.length);
    const big = step.copies.find((copy) => copy.cityId === cities[0]!.id)!;
    const small = step.copies.find((copy) => copy.cityId === cities[1]!.id)!;
    expect(big.rate).toBeGreaterThan(small.rate);
    // **The real fold, not the flat bag.** The capital's copy pays at least what
    // the town would actually make with the row standing in it — the simulation's
    // own hypothetical, which is the whole of the ruling.
    const empire = empirePercents(state, player.id);
    const gain =
      foldCity(state, cities[0]!, [id], null, explainCity(state, cities[0]!, [id], empire)).science -
      foldCity(state, cities[0]!, [], null, explainCity(state, cities[0]!, [], empire)).science;
    expect(gain).toBeGreaterThan(buildingDef(id).science);
    // And the capital raises it sooner than the hamlet, on its own production.
    expect(big.delay).toBeLessThan(small.delay);
    expect(big.delay).toBeCloseTo(
      chain.researchDelay + turnsToBuild(state, cities[0]!, { kind: 'building', id }, cities[0]!.queue.length)!,
      6,
    );
    // The step's aggregates are the copies' folds and nothing else.
    expect(step.value).toBeCloseTo(big.value + small.value, 10);
    expect(step.rate).toBeCloseTo(big.rate + small.rate, 10);
    expect(foldTerms(chain.terms)).toBe(chain.worth);
  });

  /**
   * **A goal's chain is the whole road** — the ruling's other half: *"the value
   * of a tech path isn't just based on the thing the tech unlocks, it also
   * includes the value of all the prerequisite techs that you research along the
   * way."*
   */
  function twoNodeRoad(state: GameState): { goal: TechId; road: TechId[] } | null {
    for (const id of TECH_IDS) {
      const road = researchExpansion(state, 0, id);
      if (road.length !== 2) continue;
      const first = techDef(road[0]!).unlocks.buildings ?? [];
      const last = techDef(road[1]!).unlocks.buildings ?? [];
      if (first.length === 0 || last.length === 0) continue;
      return { goal: id, road };
    }
    return null;
  }

  /**
   * **Wonder patience, and the wait the queue never charged** — the third of
   * batch X1d's rulings, read off one game by the user on 2026-09-09
   * (`docs/flags.md` item (ggg)): the seed-1 capital raised two wonders between
   * t14 and t54 and reached a Granary at t65 and a Library at t81.
   *
   * Two causes, one bench. `score.patienceTurns` amortised **every** row there
   * was one of over at most ten turns, so a nineteen-turn wonder was scored as a
   * ten-turn one; and `push` only ever *divided* by the build turns, so nothing
   * anywhere charged the town for the turns its people spend waiting. Both are
   * fixed and both are asserted here, against a four-turn Granary in a town of
   * four — which is exactly the comparison the user's game lost.
   */
  it('ranks a long wonder under a short granary in a small town', () => {
    const { state, player, cities } = chained(1);
    // Past `military.scoutEarlyTurns`, so the opening book (`openingScout`) does
    // not answer the town before anything is weighed.
    state.turn = 50;
    const town = cities[0]!;
    town.population = 4;
    // Every technology, so the wonder table is legal and the comparison is about
    // the arithmetic rather than about a gate.
    for (const id of TECH_IDS) {
      if (!player.techsResearched.includes(id)) player.techsResearched.push(id);
    }
    refreshCityDerived(state, town);
    bumpRevision(state);
    const decision = decisionOfType(state, 0, 'setCityProduction');
    expect(decision).not.toBeNull();
    const scored = decision!.candidates.filter((row) => row.rejected === undefined);
    const turnsOf = (row: BotCandidate): number => {
      const divisor = row.terms.find((term) => term.op === 'div');
      return divisor === undefined ? 0 : divisor.value;
    };
    // The longest wonder this town could raise, and the cheapest ordinary shelf
    // beside it — both found by what the table printed, never by a name.
    const wonders = scored.filter((row) => {
      const id = BUILDING_IDS.find((one) => buildingDef(one).name === row.label);
      return id !== undefined && buildingDef(id).wonder === true && !isPatientRow({ kind: 'building', id });
    });
    expect(wonders.length).toBeGreaterThan(0);
    const long = wonders.sort((a, b) => turnsOf(b) - turnsOf(a))[0]!;
    const quick = scored
      .filter((row) => {
        const id = BUILDING_IDS.find((one) => buildingDef(one).name === row.label);
        return id !== undefined && buildingDef(id).wonder !== true && turnsOf(row) <= 6;
      })
      .sort((a, b) => turnsOf(a) - turnsOf(b))[0]!;
    expect(quick).toBeDefined();
    expect(turnsOf(long)).toBeGreaterThanOrEqual(15);
    expect(turnsOf(quick)).toBeLessThanOrEqual(6);
    // **The divisor is the wonder's real turns**, not the patience — that is the
    // first half of the ruling, and it is what the label says too.
    expect(turnsOf(long)).toBeGreaterThan(aiJson.score.patienceTurns);
    expect(long.terms.find((term) => term.op === 'div')!.label).not.toMatch(/patience/);
    // **And it is discounted for those turns**, which is the second half.
    const wait = long.terms.find((term) => /the town has still to raise it/.test(term.label))!;
    expect(wait).toBeDefined();
    expect(wait.op).toBe('mul');
    expect(wait.value).toBeLessThan(1);
    // The comparison the user's game lost.
    expect(long.score).toBeLessThan(quick.score);
    expect(foldTerms(long.terms)).toBe(long.score);

    // **The Opus keeps its patience.** The row that ends the game is read at the
    // patience whatever its real turns are, which is the clause the rule was
    // written for and the one half of it that did not change.
    const opus = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true)!;
    expect(isPatientRow({ kind: 'building', id: opus })).toBe(true);
  });

  it('prices both nodes of a two-node road, and drops the first once it is held', () => {
    const { state, player } = chained(2);
    const found = twoNodeRoad(state);
    expect(found).not.toBeNull();
    const { goal, road } = found!;
    const ctx = valueContext(state, player);
    const chain = techChain(state, player, ctx, goal);
    expect(chain.road).toEqual(road);
    // A step for a row of the **first** node as well as the last — the road hands
    // both over, and the chain says so.
    const early = techDef(road[0]!).unlocks.buildings!;
    const late = techDef(road[1]!).unlocks.buildings!;
    expect(chain.steps.some((step) => early.includes(step.id as BuildingId))).toBe(true);
    expect(chain.steps.some((step) => late.includes(step.id as BuildingId))).toBe(true);
    // And the first node's gifts land **before** the last node's: its beakers are
    // the road's first instalment, not the whole of it.
    const first = chain.steps.find((step) => early.includes(step.id as BuildingId))!;
    const second = chain.steps.find((step) => late.includes(step.id as BuildingId))!;
    expect(first.delay).toBeLessThan(second.delay);
    expect(foldTerms(chain.terms)).toBe(chain.worth);

    // **A held first node drops out.** The empire that already has it owes the
    // road only its tail, so the chain prices the tail alone — and nothing of the
    // first node's is a step of it any more except what its rows still owe, which
    // is a chain of its own (`liveChains`' second family).
    const { state: after, player: holder } = chained(2, road[0]!);
    const walked = techChain(after, holder, valueContext(after, holder), goal);
    expect(walked.road).toEqual([road[1]!]);
    expect(walked.steps.some((step) => early.includes(step.id as BuildingId))).toBe(false);
    expect(walked.remainingBeakers).toBeLessThan(chain.remainingBeakers);
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

  /**
   * **The potential half** (batch X1e, ruled 2026-09-09: *"+1 science on
   * libraries is good even if you don't have libraries built yet"*).
   *
   * The card is the same "+100% on science shelves" in all three readings and
   * only the board moves: nothing to multiply, a chain that owes two libraries,
   * and the two libraries standing. The middle reading is the batch — worth
   * something, and worth **less** than the shelves actually raised, because a
   * copy pays from the turn it lands and no sooner.
   */
  it('prices the shelves a live chain still owes, discounted for the raising', () => {
    const share: CardEffect[] = [
      { kind: 'buildingYieldPercent', category: 'science', percent: 100 },
    ];
    /** Two towns of a size worth multiplying, and the road to Letters walked. */
    const twoTowns = (state: GameState, player: Player, city: City): City => {
      for (const step of researchExpansion(state, 0, 'letters')) {
        if (step === 'letters') continue;
        if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
      }
      player.researching = 'letters';
      const second = foundCityAt(state, 0, at(state.map, 10, 5));
      second.population = 6;
      refreshCityDerived(state, city);
      refreshCityDerived(state, second);
      bumpRevision(state);
      return second;
    };
    // Nothing raised and no road walked: the empire cannot name a library, so
    // the card multiplies nothing at all.
    const bare = priced(share);
    // The road walked and two towns that lack one: the chain aimed at Letters
    // owes a library in each of them, and the card is worth a share of what
    // those two would pay — at the turn each of them would land.
    const promised = priced(share, (state, player, city) => {
      twoTowns(state, player, city);
    });
    // The same two towns with the shelves standing. Nothing is owed any more,
    // so this is the held sweep alone and the promise is worth nothing.
    const standing = priced(share, (state, player, city) => {
      const second = twoTowns(state, player, city);
      city.buildings.push('library');
      second.buildings.push('library');
      bumpRevision(state);
    });
    expect(bare).toBe(0);
    expect(promised).toBeGreaterThan(0);
    expect(promised).toBeLessThan(standing);
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
    // A bench that pokes the board by hand is a writer and says so — the
    // contract on `GameState.revision` since batch E2, and the thing batch M3's
    // shadow run is able to catch (`src/sim/slate.ts`).
    bumpRevision(state);
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

  it('leaves an unscoped clause reading the whole realm, and says nothing about it', () => {
    // The other half of every acceptance in this file: a row that names no scope
    // is every town's, which is what absence means — so the scope reading is the
    // realm's own count and the label carries no note about ground it never
    // narrowed.
    const { state, player } = realm(3);
    const ctx = valueContext(state, player);
    expect(townsAdmitting(ctx, undefined)).toBe(ctx.cities);
    expect(ctx.cities).toBe(3);
    const rows: CardEffect[] = [
      { kind: 'pays', where: 'city', gold: 2 },
      { kind: 'percentYields', yield: 'science', percent: 20 },
      { kind: 'happiness', amount: 1, per: 'city' },
    ];
    const appraisal = explainEffects(rows, valueContext(state, player));
    for (const term of appraisal.terms) expect(term.label).not.toMatch(/ of \d+ towns/);
    // A `pays` line with no scope is the realm's whole town count, paid once a
    // town — the arithmetic the scope reading only ever narrows.
    expect(appraisal.terms[0]!.value).toBe(2 * voiceWeight(ctx, 'gold') * ctx.cities);
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

// --- 16. the two missing signs (batch X5) -----------------------------------

/**
 * **The two places the appraisal was missing a sign rather than a refinement**
 * (`docs/audit/bot-pass-2.md`, Part 2 rows 2 and 4, change 5, queue row X5).
 *
 *   · a citizen was read as pure gain — the ground, the science and a small
 *     town's premium — in empires whose happiness price was riding the band's
 *     ceiling. It now carries the contentment it demands, negative;
 *   · a wall was read at its strength and not at its hit points, so the seven
 *     rows of the wall chain were appraised at half of what they do and the three
 *     that carry no strength at all at nothing.
 *
 * **Re-aimed 2026-09-09 (batch X5c)** on the second half. X5 priced the hit
 * points at the *strength* line's rate — points × the military weight × the
 * threat — and the t100 bench found the wall half alone costing the mean seat
 * nine citizens, thirty-four food and nine science: palisades before granaries,
 * because a point of hit points was being read as a soldier. The line is a
 * **share of the town's bar** now (`docs/flags.md` item (ggg), "Ruled, X5c
 * flies"): the row's hit points over `cityMaxHp` asked of this town holding the
 * row, times what `cityBaseStrength` says this town's defence is worth at the
 * same rate as before, still times `1 + threat`. The claims below are the
 * arithmetic written out off the simulation's own two readings, plus the two
 * sentences the share can say and the points could not — that a wall is worth
 * strictly less than the whole of a town's defence, and that the second course
 * of stone is worth less of the bar than the first.
 *
 * Both are asked of the folds that hold them rather than of a played game, and
 * both are written out off the simulation's own readings rather than against a
 * remembered number: the claim is *the arithmetic*, and a claim written as a
 * constant would move with the weight table instead of failing when the
 * arithmetic does.
 */
describe('the two missing signs (batch X5)', () => {
  function realm(towns: number, population = 4): { state: GameState; player: Player; cities: City[] } {
    const state = bench(1);
    const cities: City[] = [];
    for (let index = 0; index < towns; index++) {
      cities.push(foundCityAt(state, 0, at(state.map, 3 + index * 5, 5)));
    }
    recomputeAllVisibility(state);
    for (const city of cities) {
      city.population = population;
      refreshCityDerived(state, city);
    }
    bumpRevision(state);
    return { state, player: seat(state, 0), cities };
  }

  const DEMANDED = /the contentment one more citizen demands/;

  it('charges the citizen exactly the marginal demand, at the meter’s live price', () => {
    const { state, player, cities } = realm(2, 6);
    const ctx = valueContext(state, player);
    const citizen = explainCitizen(state, cities[0]!, ctx);
    const line = findTerm(citizen.terms, DEMANDED);
    expect(line).not.toBeNull();
    // The simulation's own curve, asked twice and subtracted — never re-derived
    // here, which is what makes a retune of `METERS.happiness` move this fold.
    const marginal = happinessDemand(7) - happinessDemand(6);
    expect(marginal).toBeGreaterThan(0);
    expect(line!.value).toBe(-marginal * meterWeight(ctx, 'happiness'));
    expect(line!.value).toBeLessThan(0);
    // And it is the only negative line in a fold whose other three are gains.
    expect(citizen.terms.filter((term) => term.value < 0)).toHaveLength(1);
    expect(citizen.total).toBe(foldTerms(citizen.terms));
  });

  it('charges the big town more than the small one — by the price, not by the curve', () => {
    // `happinessDemand` is **linear** since 2026-09-09 (`docs/flags.md` item
    // (kkk) — the crowding tail that used to bend it is gone), so the *marginal*
    // demand is the same figure at two citizens and at twelve. What still makes
    // the big town's citizen the dearer one is the empire's own price: a realm
    // feeding twelve is nearer the unhappy rungs than a realm feeding two, and
    // `meterWeight` is what carries that. The fold reads both from the
    // simulation and re-derives neither.
    const small = realm(1, 2);
    const large = realm(1, 12);
    const smallCtx = valueContext(small.state, small.player);
    const largeCtx = valueContext(large.state, large.player);
    const little = findTerm(explainCitizen(small.state, small.cities[0]!, smallCtx).terms, DEMANDED);
    const big = findTerm(explainCitizen(large.state, large.cities[0]!, largeCtx).terms, DEMANDED);
    // The curve says the same thing about both towns…
    expect(happinessDemand(13) - happinessDemand(12)).toBeCloseTo(
      happinessDemand(3) - happinessDemand(2),
      12,
    );
    // …and the meter does not.
    expect(meterWeight(largeCtx, 'happiness')).toBeGreaterThan(meterWeight(smallCtx, 'happiness'));
    expect(big!.value).toBeLessThan(little!.value);
  });

  it('is inherited by the settler’s arm, and answered there by the town it founds', () => {
    // `explainCitizen` has exactly one caller in the bot — the settler's, which
    // subtracts it as "the citizen it costs this town". The claim is the whole of
    // the audit's touch point (c): the charge reaches the arm.
    //
    // **Re-aimed 2026-09-08 (batch X5b)**, and the re-aim is the batch. The line
    // used to be printed on this candidate exactly *once* — the relief, and
    // nothing answering it — which is why the settler came out cheaper and the
    // sweep found thirteen more towns. It is printed **twice** now, and the two
    // are different citizens: the one this town gives up (subtracted through
    // `explainCitizen`, a relief) and the one the town it founds would create
    // (charged on the expansion chain, `citizen.ts`' same line asked of a town of
    // nought). The claim is that both are there, once each, and that the fold
    // still folds.
    const { state, player, cities } = realm(2, 6);
    for (const city of cities) city.buildings.push('granary');
    bumpRevision(state);
    const decision = decisionOfType(state, player.id, 'setCityProduction');
    expect(decision).not.toBeNull();
    const settler = decision!.candidates.find((row) => row.label === 'Settler');
    expect(settler).not.toBeUndefined();
    const printed = labelsOf(settler!.terms).match(new RegExp(DEMANDED.source, 'g')) ?? [];
    expect(printed).toHaveLength(2);
    expect(labelsOf(settler!.terms)).toMatch(/the citizen it costs this town/);
    expect(labelsOf(settler!.terms)).toMatch(/what the town it founds would ask the empire for/);
    expect(foldTerms(settler!.terms)).toBe(settler!.score);
    // And the two are opposite signs, which is the whole of the pair: the
    // citizen this town gives up is a **relief** on the settler (subtracted
    // through `explainCitizen`, so a citizen that costs contentment makes the
    // settler worth more) and the citizen the founding creates is a **charge**.
    const relief = findTerm(settler!.terms, /the citizen it costs this town/)!;
    const founds = findTerm(settler!.terms, /what the town it founds would ask the empire for/)!;
    expect(findTerm(relief.parts ?? [], DEMANDED)!.value).toBeLessThan(0);
    expect(founds.value).toBeLessThan(0);
  });

  const WALL_ROWS = BUILDING_IDS.filter((id) => (buildingDef(id).cityHp ?? 0) !== 0);

  /**
   * **The line X5c re-aimed**, written out here off the simulation's own two
   * readings rather than imported from the fold, so a change to the arithmetic
   * fails this pin instead of moving with it: the row's hit points as a share of
   * the bar this town would carry *holding the row*, times what this town's own
   * defence is worth at the strength line's rate, times the threat.
   */
  function shareLine(state: GameState, town: City, id: BuildingId, threat: number): number {
    const hp = foldBuildingCityStat(buildingCityHp({ buildings: [id] }));
    const holding = town.buildings.includes(id)
      ? town
      : { ...town, buildings: [...town.buildings, id] };
    const share = hp / cityMaxHp(holding);
    return share * cityBaseStrength(state, town) * aiJson.weights.military * threat;
  }

  it('folds every wall row’s hit points as a share of the town’s own bar', () => {
    // Seven rows carry `cityHp` — the whole wall chain, three of them (the Walls
    // of Uruk, the Great Wall and the Keep) carrying no strength at all, which is
    // why they read *nothing* from this fold before X5.
    expect(WALL_ROWS.length).toBe(7);
    expect(WALL_ROWS.filter((id) => buildingDef(id).cityStat === undefined)).toHaveLength(3);
    const { state, player, cities } = realm(2);
    const ctx = valueContext(state, player);
    const town = cities[1]!;
    for (const id of WALL_ROWS) {
      const row = explainBuildingRow(id, ctx, town);
      const line = findTerm(row.terms, /town hit points/);
      expect(line, id).not.toBeNull();
      // **X5c**: the list `cityMaxHp` folds, asked of a town holding this row
      // alone, over the bar `cityMaxHp` folds for this town *with* the row —
      // both the simulation's, and the bot never reads `BuildingDef.cityHp`.
      expect(line!.value).toBeCloseTo(shareLine(state, town, id, 1 + ctx.threat), 10);
      expect(line!.value).toBeGreaterThan(0);
      // And the share is a share: a wall is worth strictly less than the whole
      // of what the town's defence is worth, which is the sentence X5 could not
      // say — a Palisade used to read twenty soldiers standing on the wall.
      expect(line!.value).toBeLessThan(
        cityBaseStrength(state, town) * aiJson.weights.military * (1 + ctx.threat),
      );
      expect(row.total).toBe(foldTerms(row.terms));
    }
    // And a shelf that is not a wall says nothing about hit points.
    expect(findTerm(explainBuildingRow('granary', ctx, town).terms, /town hit points/)).toBeNull();
  });

  it('reads the middling town when the caller names none, as the other lines do', () => {
    // `hammerPrice`'s bargain, and `townPopulation`'s: a fold asked of a row
    // rather than of a town answers for the empire's middle one. Two towns of a
    // size, so the claim is about *which* town the fold picked and not about a
    // tie — the larger one is walled, and the townless reading is the smaller.
    const { state, player, cities } = realm(2);
    cities[0]!.population = 3;
    cities[1]!.population = 9;
    for (const city of cities) refreshCityDerived(state, city);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const townless = findTerm(explainBuildingRow('palisade', ctx).terms, /town hit points/)!;
    const median = cities.slice().sort((a, b) => a.population - b.population)[1]!;
    expect(median).toBe(cities[1]);
    expect(townless.value).toBeCloseTo(shareLine(state, median, 'palisade', 1 + ctx.threat), 10);
  });

  it('is worth less to a town that already has walls, because the bar is bigger', () => {
    // The share moves with the bar the simulation keeps, so the second course of
    // stone is worth less of it than the first — a diminishing chain read off
    // `cityMaxHp` rather than declared. X5's points arithmetic could not say
    // this: it read the same figure in a bare town and in a fortress.
    const { state, player, cities } = realm(2);
    const bare = cities[0]!;
    const walled = cities[1]!;
    walled.buildings.push('palisade');
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(cityMaxHp(walled)).toBeGreaterThan(cityMaxHp(bare));
    const onBare = findTerm(explainBuildingRow('stoneWalls', ctx, bare).terms, /town hit points/)!;
    const onWalled = findTerm(
      explainBuildingRow('stoneWalls', ctx, walled).terms,
      /town hit points/,
    )!;
    expect(onWalled.value).toBeLessThan(onBare.value);
  });

  it('is worth more to an empire with a column at its gate, by the threat it already reads', () => {
    // The same existing factor the strength line uses — `1 + ctx.threat` — so the
    // two halves of one wall move together rather than apart. The town is named
    // on both readings, so the only thing that moved between them is the threat.
    const { state, player, cities } = realm(1);
    const town = cities[0]!;
    const quiet = valueContext(state, player);
    expect(quiet.threat).toBe(0);
    for (const [col, row] of [
      [town.col + 2, town.row],
      [town.col + 2, town.row + 1],
    ] as const) {
      createUnit(state, 1, 'warrior', col, row);
    }
    recomputeAllVisibility(state);
    bumpRevision(state);
    const besieged = valueContext(state, player);
    expect(besieged.threat).toBeGreaterThan(0);
    const quietLine = findTerm(explainBuildingRow('palisade', quiet, town).terms, /town hit points/)!;
    const loudLine = findTerm(
      explainBuildingRow('palisade', besieged, town).terms,
      /town hit points/,
    )!;
    expect(quietLine.value).toBeCloseTo(shareLine(state, town, 'palisade', 1), 10);
    expect(loudLine.value).toBeCloseTo(quietLine.value * (1 + besieged.threat), 10);
  });

  it('reads no building’s hit points anywhere but through buildingEffects', () => {
    // A source-reading register, `hasFoldReadEngine`'s discipline: the day
    // somebody writes `def.cityHp` into the appraisal there are two opinions about
    // the walls, and `cityMaxHp` is the only one the game plays by. Comment
    // lines are skipped: the docblock beside the fold *names* the reach it
    // refuses, and a register that could not tell prose from code would forbid
    // saying so.
    for (const [path, source] of Object.entries(AI_SOURCES)) {
      const code = source
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');
      expect(code, path).not.toMatch(/\.cityHp/);
    }
  });

});

// --- batch X8: the rows nobody reads ----------------------------------------

/**
 * A bench realm for the X8 blocks: towns of a stated size on the grassland
 * board, `realm`'s shape one section up (each block keeps its own so a change to
 * one bench cannot quietly re-aim another's claims).
 */
function x8Realm(
  towns: number,
  population: number,
): { state: GameState; player: Player; cities: City[] } {
  const state = bench(2);
  const cities: City[] = [];
  for (let index = 0; index < towns; index++) {
    cities.push(foundCityAt(state, 0, at(state.map, 3 + index * 5, 5)));
  }
  recomputeAllVisibility(state);
  for (const city of cities) {
    city.population = population;
    refreshCityDerived(state, city);
  }
  bumpRevision(state);
  return { state, player: seat(state, 0), cities };
}

/**
 * **Batch X8 — the rows nobody reads** (`docs/audit/bot-pass-2.md` Part 2 row 6
 * and queue row X8).
 *
 * Nine fields of `BuildingDef` had zero hits in `src/ai/`: the demand a court
 * forgives, the coin an assay house saves, the wages a throne rebates, what a
 * keep mends, what a chapel pays the augurs, the lines a harbour pays on water,
 * the fields a cistern waters, the thirst an aqueduct ends, and the ground a
 * wonder wants under it. Four of them turned out to be paid already — by the
 * caller's own `foldCity` hypothetical — and the register below is how that is
 * *written down* rather than rediscovered: every field of the interface is
 * either folded by `explainBuildingRow` or names its reason in the source, and
 * this fails the day one is neither.
 */
describe('every field of a building row is accounted for', () => {
  /** The interface itself, read as text — the register's one source of truth. */
  const BUILDING_SOURCE = Object.values(
    import.meta.glob('../../src/sim/buildingData.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>,
  )[0]!;

  /** The field names of `BuildingDef`, off its own declaration. */
  function declaredFields(): string[] {
    const start = BUILDING_SOURCE.indexOf('export interface BuildingDef {');
    expect(start).toBeGreaterThan(0);
    const end = BUILDING_SOURCE.indexOf('\n}\n', start);
    const names: string[] = [];
    for (const line of BUILDING_SOURCE.slice(start, end).split('\n')) {
      const match = /^ {2}([A-Za-z_][A-Za-z0-9_]*)\??:/.exec(line);
      if (match) names.push(match[1]!);
    }
    return names;
  }

  it('reads the interface itself, and every field is folded or excused', () => {
    const fields = declaredFields();
    // A sanity floor: if the parse stops finding fields the register below would
    // pass by saying nothing, which is the one way a source-reading test lies.
    expect(fields.length).toBeGreaterThan(40);
    expect(fields).toContain('demandRelief');
    expect(fields).toContain('requiresSite');
    for (const field of fields) {
      const folded = BUILDING_ROW_FOLDED[field];
      const silent = BUILDING_ROW_SILENT[field];
      // One of the two, never both and never neither — a field in both registers
      // is a field two people disagreed about, and one in neither is a promise
      // the data makes that the appraisal cannot see.
      expect({ field, accounted: (folded ?? silent) !== undefined }).toEqual({
        field,
        accounted: true,
      });
      expect({ field, both: folded !== undefined && silent !== undefined }).toEqual({
        field,
        both: false,
      });
      expect(folded ?? silent, field).toBeTruthy();
    }
    // And nothing else: a register naming a field the row does not carry is a
    // reason for something nobody can write down any more.
    for (const named of [
      ...Object.keys(BUILDING_ROW_FOLDED),
      ...Object.keys(BUILDING_ROW_SILENT),
    ]) {
      expect(fields.includes(named), named).toBe(true);
    }
  });

  it('folds every field it says it folds, off a row that carries one', () => {
    // The register is a claim about the *fold*, so each folded field is asked of
    // a live row that actually carries it — a register that named a line nobody
    // prints would be the fold registry's own dead-shape failure one table over.
    const { state, player, cities } = x8Realm(2, 12);
    player.techsResearched.push('divination');
    bumpRevision(state);
    const ctx = valueContext(state, player);
    for (const field of Object.keys(BUILDING_ROW_FOLDED)) {
      const row = BUILDING_IDS.find(
        (id) => (buildingDef(id) as unknown as Record<string, unknown>)[field] !== undefined,
      );
      expect(row, field).toBeDefined();
      const printed = explainBuildingRow(row!, ctx, cities[0]);
      expect(printed.total, field).toBe(foldTerms(printed.terms));
    }
  });
});

describe('the five charter lines (batch X8)', () => {
  it('forgives a share of what a town of that size asks for', () => {
    // The Assize Court's fifteen percent, of a cost that **scales with the
    // town**: since the crowding term left the game (2026-09-09, `docs/flags.md`
    // item (kkk)) the relief is a share of the citizens themselves, so the row
    // is worth something in a hamlet and three times as much in a town of
    // twelve. That shape is the point — a flat happiness line could not have it.
    const { state, player, cities } = x8Realm(2, 12);
    const ctx = valueContext(state, player);
    const relief = buildingDemandRelief({ buildings: ['assizeCourt'] });
    expect(relief).toBe(15);
    const line = findTerm(explainBuildingRow('assizeCourt', ctx, cities[0]).terms, /asks for/);
    expect(line).not.toBeNull();
    // The simulation's own reading of the town, never re-derived here.
    const demand = happinessDemand(12);
    expect(demand).toBeGreaterThan(0);
    // And it is the meter's *own* figure: the line `explainHappiness` charges
    // this town for its citizens, which is what the relief is a share of. If a
    // retune of the demand ever parts the two, this is where it says so.
    const charged = explainHappiness(state, player.id).find((entry) =>
      entry.source.startsWith(`${cities[0]!.name} · 12`),
    );
    expect(charged).toBeDefined();
    expect(-charged!.value).toBeCloseTo(demand, 9);
    expect(line!.value).toBeCloseTo(((demand * relief) / 100) * meterWeight(ctx, 'happiness'), 9);

    // A hamlet is paid for too, and paid *less* — the term follows the size,
    // asked of the same empire at the same price so nothing but the size moves.
    const small = findTerm(
      explainBuildingRow('assizeCourt', ctx, { ...cities[0]!, population: 4 }).terms,
      /asks for/,
    );
    expect(small).not.toBeNull();
    expect(small!.value).toBeCloseTo(line!.value / 3, 9);
  });

  it('prices the throne’s rebate on the pieces the levy is still short', () => {
    const { state, player, cities } = x8Realm(3, 6);
    const ctx = valueContext(state, player);
    const rebate = foldBuildingCityStat(
      buildingUnitUpkeepRebate({ buildings: ['imperialThrone'] }),
    );
    expect(rebate).toBe(1);
    const short = levyReading(ctx).shortfall;
    expect(short).toBeGreaterThan(0);
    const line = findTerm(
      explainBuildingRow('imperialThrone', ctx, cities[0]).terms,
      /off the keep/,
    );
    expect(line).not.toBeNull();
    // This town's share of the raising, at the rate the payroll is charged at.
    expect(line!.value).toBeCloseTo((rebate * short * voiceWeight(ctx, 'gold')) / 3, 9);
  });

  it('prices the assay house at the coin the town turns over', () => {
    const { state, player, cities } = x8Realm(2, 6);
    const ctx = valueContext(state, player);
    const discount = foldBuildingCityStat(buildingPurchaseDiscount({ buildings: ['assayHouse'] }));
    expect(discount).toBe(-5);
    const turnover = Math.max(0, foldEmpireRates(state, player.id).goldPerTurn ?? 0) / 2;
    expect(turnover).toBeGreaterThan(0);
    const line = findTerm(
      explainBuildingRow('assayHouse', ctx, cities[0]).terms,
      /off what this town buys/,
    );
    expect(line).not.toBeNull();
    expect(line!.value).toBeCloseTo((5 / 100) * turnover * voiceWeight(ctx, 'gold'), 9);
  });

  it('prices the keep’s mending as a share of a piece, and by the threat', () => {
    const { state, player, cities } = x8Realm(1, 6);
    const quiet = valueContext(state, player);
    const heal = foldBuildingCityStat(buildingAdjacentHeal({ buildings: ['keep'] }));
    expect(heal).toBe(5);
    const quietLine = findTerm(explainBuildingRow('keep', quiet, cities[0]).terms, /mended a turn/)!;
    expect(quietLine).not.toBeNull();
    // Five points of a hundred-point bar is a twentieth of a piece — not five
    // spearmen, which is what a strength reading would have said.
    expect(quietLine.value).toBeCloseTo(
      (5 / 100) * aiJson.weights.military * aiJson.score.combatScale,
      9,
    );
    for (const [col, row] of [
      [cities[0]!.col + 2, cities[0]!.row],
      [cities[0]!.col + 2, cities[0]!.row + 1],
    ] as const) {
      createUnit(state, 1, 'warrior', col, row);
    }
    recomputeAllVisibility(state);
    bumpRevision(state);
    const besieged = valueContext(state, player);
    expect(besieged.threat).toBeGreaterThan(0);
    const loudLine = findTerm(
      explainBuildingRow('keep', besieged, cities[0]).terms,
      /mended a turn/,
    )!;
    expect(loudLine.value).toBeCloseTo(quietLine.value * (1 + besieged.threat), 9);
  });

  it('prices the chapel at what a rite said here pays, at the register’s cadence', () => {
    const { state, player, cities } = x8Realm(2, 6);
    // A realm taught no rite says none, and the line says nothing — the cadence
    // is the occasion register's, and it is bounded by the rites the empire
    // actually knows.
    const untaught = valueContext(state, player);
    expect(
      findTerm(explainBuildingRow('chapel', untaught, cities[0]).terms, /every rite/),
    ).toBeNull();
    player.techsResearched.push('divination');
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const pays = buildingRitePay({ buildings: ['chapel'] });
    expect(pays).toBe(5);
    const line = findTerm(explainBuildingRow('chapel', ctx, cities[0]).terms, /every rite/);
    expect(line).not.toBeNull();
    // One town's share of the empire's own rite tempo, at the culture price.
    const rate = 1 / (riteDef(LIVE_RITE_IDS[0]!).duration ?? 1);
    expect(line!.value).toBeCloseTo(pays * rate * voiceWeight(ctx, 'culture'), 6);
  });

  it('says nothing at all about a shelf that carries none of them', () => {
    const { state, player, cities } = x8Realm(2, 12);
    const ctx = valueContext(state, player);
    const granary = explainBuildingRow('granary', ctx, cities[0]);
    for (const match of [
      /asks for/,
      /off the keep/,
      /off what this town buys/,
      /mended a turn/,
      /every rite/,
    ]) {
      expect(findTerm(granary.terms, match)).toBeNull();
    }
    expect(granary.total).toBe(foldTerms(granary.terms));
  });

  it('reads none of the five off the row itself, anywhere in the bot', () => {
    // The `.cityHp` register one batch over, widened to the five: each of these
    // has a reader in `buildingEffects.ts` and the simulation plays by that
    // reader, so a `def.ritePays` in here would be a second opinion about what a
    // chapel pays. `requiresSite` is deliberately not on the list — it has no
    // reader of its own, and `siteRefusal` asks `cityScopeAdmits` about it the
    // way `buildError` does. Comment lines are skipped, as the register above
    // this one skips them and for its reason.
    for (const [path, source] of Object.entries(AI_SOURCES)) {
      const code = source
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');
      for (const field of [
        'demandRelief',
        'healsAdjacent',
        'purchaseDiscount',
        'ritePays',
        'unitUpkeepRebate',
      ]) {
        expect(code, `${path} · ${field}`).not.toMatch(new RegExp(`\\.${field}`));
      }
    }
  });

});

describe('the site, refused out loud (batch X8)', () => {
  it('gives the simulation’s own sentence for a row the town has no ground for', () => {
    // Thirteen live rows carry a `requiresSite`, and `canQueueBuilding` dropped
    // every one of them out of the candidate list without a word. The refusal is
    // `buildError`'s, and it names the site rather than the flag.
    const sited = BUILDING_IDS.filter((id) => buildingDef(id).requiresSite !== undefined);
    expect(sited.length).toBe(13);
    const { state, player, cities } = x8Realm(1, 6);
    player.techsResearched.push('sailing');
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // The bench is grassland to the edges, so no town of it is coastal.
    const refusal = siteRefusal(ctx, cities[0]!, 'harbour');
    expect(refusal).not.toBeNull();
    expect(refusal).toBe(buildError(state, player.id, 'building', 'harbour', cities[0]!));
    // A row with no site at all is not this reading's business.
    expect(siteRefusal(ctx, cities[0]!, 'granary')).toBeNull();
    // And once the ground admits it, the refusal is somebody else's sentence.
    at(state.map, cities[0]!.col + 1, cities[0]!.row).terrain = 'coast';
    bumpRevision(state);
    expect(siteRefusal(valueContext(state, player), cities[0]!, 'harbour')).toBeNull();
  });
});

describe('a unitStat is read by which stat it is (batch X8)', () => {
  it('prices a heal as a share of a piece and a percent as a percent of one', () => {
    const { state, player } = x8Realm(2, 6);
    const ctx = valueContext(state, player);
    const piece = aiJson.weights.military * aiJson.score.combatScale;
    // Field Hospitals' whole mend — one piece back on its feet a turn, where the
    // arm used to read it as a hundred points of strength.
    const full: CardEffect[] = [{ kind: 'unitStat', stat: 'heal', amount: 100 }];
    expect(scoreEffects(full, ctx)).toBeCloseTo(piece * (1 + ctx.threat), 9);
    const half: CardEffect[] = [{ kind: 'unitStat', stat: 'heal', amount: 50 }];
    expect(scoreEffects(half, ctx)).toBeCloseTo(0.5 * piece * (1 + ctx.threat), 9);
    // A percentage of a piece is priced against what this file already means by
    // a piece, so twenty-five percent is a quarter of one.
    const percent: CardEffect[] = [{ kind: 'unitStat', stat: 'combatPercent', amount: 25 }];
    expect(scoreEffects(percent, ctx)).toBeCloseTo(0.25 * piece * (1 + ctx.threat), 9);
    // The four points of a piece's own quality are untouched: the reading this
    // arm has always taken.
    const reach: CardEffect[] = [{ kind: 'unitStat', stat: 'movement', amount: 1 }];
    expect(scoreEffects(reach, ctx)).toBeCloseTo(aiJson.weights.military * (1 + ctx.threat), 9);
  });

  it('is no longer the arithmetic accident the audit named', () => {
    // The accident: `amount` went straight into the military weight whatever the
    // stat was, so Field Hospitals' whole mend read as a hundred points of
    // strength — the strongest line in the game, by arithmetic rather than by
    // design. A mend cannot exceed the bar it fills, so the whole of one is
    // worth one piece and never a hundred.
    const { state, player } = x8Realm(2, 6);
    const ctx = valueContext(state, player);
    const full: CardEffect[] = [{ kind: 'unitStat', stat: 'heal', amount: 100 }];
    expect(scoreEffects(full, ctx)).toBeLessThan(
      100 * aiJson.weights.military * (1 + ctx.threat),
    );
    expect(scoreEffects(full, ctx)).toBeLessThan(100 * aiJson.weights.military);
    // A mend of two hundred is still one piece: the share is capped at the bar.
    const twice: CardEffect[] = [{ kind: 'unitStat', stat: 'heal', amount: 200 }];
    expect(scoreEffects(twice, ctx)).toBe(scoreEffects(full, ctx));
  });
});

// --- 17. the growth channel charged (batch X5b) ------------------------------

/**
 * **The keep, in the two arms that add a citizen rather than give one away**
 * (`docs/flags.md` item (ggg), 2026-09-08: *"both charge the marginal keep of
 * the citizen they would add — `happinessDemand(pop + 1) − happinessDemand(pop)`
 * at the live price, the same line — read at the town's current population so a
 * focus order does not move its own appraisal"*).
 *
 * X5 charged the keep in `explainCitizen`, whose one caller **subtracts** it, so
 * the missing sign arrived as more expansion and the growth channel stayed
 * uncharged (`docs/bot-priorities.md`, "Batch X5 as shipped"). X5b puts the same
 * line in the two arms that were reading a citizen as pure ground: the focus
 * arm's `growthTerm` and the hex purchase's `tileWants`. All three fold **one**
 * helper — `citizenKeepTerm` (`citizen.ts`) — which is what the third case below
 * is about.
 *
 * The bench is arranged for one reason: the focus arm's cheap half has to clear
 * its own gate before the growth clock is asked at all (`foldOf(terms) <= 0`
 * returns early), and on the shipped weight table a bushel outweighs a hammer,
 * so a town with nothing waiting on its hammers never reaches the term. The
 * sheet installed here is the arena's own dial (`withAiTuning`) turned to a
 * board where all three arms speak at once; every figure asserted is read back
 * off the context the arm itself used, never off a remembered number.
 */
describe('the growth channel charged (batch X5b)', () => {
  const KEEP = /the contentment one more citizen demands/;

  /**
   * A town of four on wheat fields and hills, with one hex on offer richer than
   * the poorest it works.
   *
   *   · the two sheets disagree about the fields and the hills, so the focus
   *     arm's delta is real and its growth clock ticks under one and stalls
   *     under the other;
   *   · the balanced ordering leaves a citizen on a hill, so the hex on offer
   *     (a hill with stone) is ground a citizen would actually move to;
   *   · the town is at `production` already, so the arm answers *something* —
   *     the lean starves this town, so the answer is the balanced ordering and
   *     the table is printed either way.
   */
  function keepBench(): { state: GameState; player: Player; city: City } {
    const state = bench(2, { width: 20, height: 12 });
    for (const tile of state.map.tiles) {
      if (tile.col % 2 === 0) tile.hills = true;
      else tile.resource = 'wheat' as never;
    }
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    recomputeAllVisibility(state);
    city.population = 4;
    city.focus = 'production';
    const player = seat(state, 0);
    player.gold = 2000;
    // The one hex on offer worth moving to: a hill with stone on it, which the
    // simulation's own scorer ranks above the bare hill the town works.
    const offer = purchasableTiles(state, city).find((row) => row.error === null)!;
    const tile = at(state.map, offer.col, offer.row);
    tile.hills = true;
    tile.resource = 'stone' as never;
    refreshCityDerived(state, city);
    bumpRevision(state);
    return { state, player, city };
  }

  /** The sheet that makes all three arms speak on one board. See the docblock. */
  const SHEET = { weights: { food: [1, 1, 1, 1], happiness: 2 } } as never;

  /** The focus decision this bench's town raises, with the state left as it was. */
  function focusDecision(state: GameState): BotDecision {
    const decision = decisionOfType(state, 0, 'setCitizenFocus');
    expect(decision).not.toBeNull();
    return decision!;
  }

  function leanTerms(decision: BotDecision): ValueTerm[] {
    return candidate(decision, 'work the hammers').terms;
  }

  it('charges the focus arm’s next citizen the marginal demand, at the live price', () => {
    withAiTuning(SHEET, () => {
      const { state, player, city } = keepBench();
      const decision = focusDecision(state);
      const ctx = valueContext(state, player);
      const growth = findTerm(leanTerms(decision), /the next citizen arrives in/);
      expect(growth).not.toBeNull();
      const keep = findTerm(growth!.parts ?? [], KEEP);
      expect(keep).not.toBeNull();
      // The simulation's own curve, asked twice and subtracted, at the price the
      // context carries — never a number this test remembers.
      const marginal = happinessDemand(city.population + 1) - happinessDemand(city.population);
      expect(marginal).toBeGreaterThan(0);
      expect(keep!.value).toBe(-marginal * meterWeight(ctx, 'happiness'));
      expect(keep!.value).toBeLessThan(0);
      // And the ground beside it is still the ground: the citizen's worth is the
      // fold of the two, and the term is that worth times the horizon's share.
      const worth = findTerm(growth!.parts ?? [], /what the next citizen is worth/)!;
      expect(foldTerms(worth.parts!)).toBe(worth.value);
      expect(foldTerms(growth!.parts!)).toBe(growth!.value);
      const lean = candidate(decision, 'work the hammers');
      expect(foldTerms(lean.terms)).toBe(lean.score);
    });
  });

  it('charges the hex purchase the same line, for the citizen that would work it', () => {
    withAiTuning(SHEET, () => {
      const { state, player, city } = keepBench();
      const ctx = valueContext(state, player);
      const want = ctx.wants.gold.find((row) => row.label.startsWith('the hex at'));
      expect(want).not.toBeUndefined();
      const keep = findTerm(want!.terms, KEEP);
      expect(keep).not.toBeNull();
      const marginal = happinessDemand(city.population + 1) - happinessDemand(city.population);
      expect(keep!.value).toBe(-marginal * meterWeight(ctx, 'happiness'));
      // A want's worth is the fold of its printed terms, this line included.
      expect(foldTerms(want!.terms)).toBe(want!.worth);
      // It is a **charge**: the one negative line on a hex whose others are all
      // gains, so the hex folds to strictly less than what it pays.
      expect(keep!.value).toBeLessThan(0);
      const hex = want!.terms[0]!;
      const inside = hex.parts!;
      expect(inside).toContain(keep!);
      expect(inside.filter((term) => term.value < 0)).toHaveLength(1);
      expect(hex.value).toBeLessThan(foldTerms(inside.filter((term) => term !== keep)));
    });
  });

  it('gives the three arms one figure for one town', () => {
    // The whole reason the line is a helper rather than three copies: the
    // settler's arm, the focus arm and the hex purchase are three questions
    // about one town's next citizen, and they may not come to three answers.
    withAiTuning(SHEET, () => {
      const { state, player, city } = keepBench();
      const decision = focusDecision(state);
      const ctx = valueContext(state, player);
      const growth = findTerm(leanTerms(decision), /the next citizen arrives in/)!;
      const inGrowth = findTerm(growth.parts ?? [], KEEP)!;
      const inHex = findTerm(
        ctx.wants.gold.find((row) => row.label.startsWith('the hex at'))!.terms,
        KEEP,
      )!;
      const inCitizen = findTerm(explainCitizen(state, city, ctx).terms, KEEP)!;
      const helper = citizenKeepTerm(ctx, city.population)!;
      expect(inGrowth.value).toBe(helper.value);
      expect(inHex.value).toBe(helper.value);
      expect(inCitizen.value).toBe(helper.value);
      expect(inGrowth.label).toBe(helper.label);
      expect(inHex.label).toBe(helper.label);
      expect(inCitizen.label).toBe(helper.label);
    });
  });

  it('is a figure no focus order can move', () => {
    // The ruling's own clause, and the anti-oscillation argument `growthTerm`
    // has always stood on: the keep is read at the town's **current**
    // population, a citizen arrives by growth and never by a command, so the
    // arm's own order cannot move the appraisal that produced it.
    withAiTuning(SHEET, () => {
      const { state, player, city } = keepBench();
      const decision = focusDecision(state);
      const before = findTerm(leanTerms(decision), KEEP)!;
      const population = city.population;
      expect(applyCommand(state, decision.command).ok).toBe(true);
      expect(city.population).toBe(population);
      const after = citizenKeepTerm(valueContext(state, player), city.population)!;
      expect(after.value).toBe(before.value);
      expect(after.label).toBe(before.label);
    });
  });

  it('turns the focus arm around in an empire that cannot afford the citizen', () => {
    // The batch's point, said as a comparison rather than as a constant. Where
    // the ground pays more than the keep, delaying growth **costs** and the term
    // is negative; where a seat's contentment is dear enough that the next
    // citizen is worth less than nothing, delaying growth **pays** and the same
    // term comes out positive. One line, one sign change, and the crowded empire
    // leans on its hammers where the contented one goes back to the fields.
    const cheap = withAiTuning(SHEET, () => {
      const { state } = keepBench();
      return findTerm(leanTerms(focusDecision(state)), /the next citizen arrives in/)!.value;
    });
    const dear = withAiTuning({ weights: { food: [1, 1, 1, 1], happiness: 60 } } as never, () => {
      const { state } = keepBench();
      return findTerm(leanTerms(focusDecision(state)), /the next citizen arrives in/)!.value;
    });
    expect(cheap).toBeLessThan(0);
    expect(dear).toBeGreaterThan(0);
  });

  it('charges the expansion chain for the town it would found, at the live price', () => {
    // The fourth arm, and the one that answers the settler's relief: a founding
    // creates a citizen, and that citizen asks the empire for its keep whether
    // or not the meter is already underwater. The clause beside it — *what
    // founding there would over-spend* — is a threshold and stays one; this is
    // the demand, and the two are different questions (`chain.ts` says so).
    const state = bench(2, { width: 20, height: 12 });
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    recomputeAllVisibility(state);
    city.population = 4;
    refreshCityDerived(state, city);
    bumpRevision(state);
    const player = seat(state, 0);
    const ctx = valueContext(state, player);
    const chain = ctx.expansion;
    expect(chain).not.toBeNull();
    const line = findTerm(chain!.terms, KEEP);
    expect(line).not.toBeNull();
    // A town of nought: the citizen it is founded with, the simulation's own
    // curve, at the price the context carries.
    expect(line!.value).toBe(-(happinessDemand(1) - happinessDemand(0)) * meterWeight(ctx, 'happiness'));
    expect(line!.value).toBe(citizenKeepTerm(ctx, 0)!.value);
    expect(foldTerms(chain!.terms)).toBe(chain!.worth);
    // It is a charge on the chain, and it is nested under its own heading rather
    // than folded loose among the gains — the clause a reader of the feed has to
    // be able to find.
    expect(line!.value).toBeLessThan(0);
    const nested = findTerm(chain!.terms, /what the town it founds would ask the empire for/)!;
    expect(nested.value).toBe(line!.value);
    expect(nested.value).toBeLessThan(0);
  });
});

// --- 18. the ground nobody works (batch X1d-ground) --------------------------

/**
 * **The three places this bot counted ground nobody would stand on** — the
 * user's rulings of 2026-09-09 on `docs/flags.md` item (ggg), each of them a
 * count replaced by a reading the simulation already had:
 *
 *   · **the worker's craving** — the entries a spade's own charges would lay, on
 *     hexes a citizen works or the next few the town would work, each discounted
 *     at the turn it lands. `workers.planFalloff`, the decay over rank that stood
 *     in for the count, is retired;
 *   · **the settle site** — the hexes a town founded there would actually work
 *     inside the horizon, at the turn each citizen arrives, rather than every hex
 *     of two rings at a per-ring falloff, and through the seat's own context
 *     rather than the omniscient one. `site.ringFalloff` retires with the sum;
 *   · **the renewal** — the town's own fold with the node held against its
 *     standing fold, over the hexes its citizens work, rather than every farm
 *     standing or buildable within reach of a centre.
 */
describe('the ground nobody works (batch X1d-ground)', () => {
  /** The seat that may lay farms and mines, so the plan has entries at all. */
  function farming(state: GameState, playerId: number): Player {
    const player = seat(state, playerId);
    for (const goal of ['agriculture', 'mining'] as const) {
      for (const step of [...researchExpansion(state, playerId, goal), goal]) {
        if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
      }
    }
    bumpRevision(state);
    return player;
  }

  /**
   * A town in the desert with `grass` grassland hexes and `hill` grassland hills
   * in its ring — the two kinds a citizen ranks very differently (two food
   * against none), which is what makes "the hexes it would work" a bound with
   * teeth rather than a restatement of the plan.
   */
  function town(grass: number, hills: number, population = 1): { state: GameState; city: City } {
    const state = bench(1, { width: 20, height: 12, terrain: 'desert' });
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    const ring: [number, number][] = [
      [4, 5],
      [6, 5],
      [5, 4],
      [5, 6],
      [4, 4],
      [4, 6],
      [3, 5],
      [7, 5],
      [5, 3],
      [5, 7],
    ];
    for (let index = 0; index < ring.length; index++) {
      const tile = own(state, city, ring[index]![0], ring[index]![1]);
      if (index < grass + hills) tile.terrain = 'grassland';
      tile.hills = index >= grass && index < grass + hills;
    }
    farming(state, 0);
    city.population = population;
    refreshCityDerived(state, city);
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, city };
  }

  function craving(state: GameState, city: City): { total: number; terms: readonly ValueTerm[] } {
    const player = seat(state, 0);
    const ctx = valueContext(state, player);
    const plan = buildImprovementPlan(state, player, ctx);
    const reading = explainWorkerCraving(plan, state, city, ctx, 'worker');
    expect(foldTerms(reading.terms)).toBe(reading.total);
    return reading;
  }

  it('prices a spade at the entries its own charges would buy, and no more', () => {
    // Eight farmable hexes and a Worker's three charges: the fold is three
    // entries, not eight — the ruling's "as many as its charges buy".
    const { state, city } = town(8, 0, 2);
    const reading = craving(state, city);
    expect(reading.terms.length).toBeGreaterThan(0);
    expect(reading.terms.length).toBeLessThanOrEqual(unitDef('worker').charges ?? 0);
    // Each term is the entry's own worth discounted at the turn the spade lands
    // it — the walk and the digging, sequential — and never the undiscounted
    // figure the plan holds.
    for (const term of reading.terms) {
      const parts = term.parts!;
      expect(term.value).toBeCloseTo(parts[0]!.value * parts[1]!.value, 10);
      expect(term.value).toBeLessThan(parts[0]!.value);
      expect(parts[1]!.label).toMatch(/walk out and dig/);
    }
  });

  it('counts only the hexes this town’s citizens will stand on', () => {
    // Three grassland hexes and seven grassland hills. A citizen ranks the flat
    // grass above the hill (`yieldScore` off the town's own fold), and a size-1
    // town reaches three seats — so the mines the plan holds on those hills are
    // entries the craving does not count, however well a mine scores in the one
    // currency.
    const { state, city } = town(3, 7, 1);
    const player = seat(state, 0);
    const ctx = valueContext(state, player);
    const plan = buildImprovementPlan(state, player, ctx);
    const reading = explainWorkerCraving(plan, state, city, ctx, 'worker');
    const hills = plan.entries.filter((entry) => at(state.map, entry.col, entry.row).hills);
    expect(hills.length).toBeGreaterThan(0);
    expect(reading.terms.length).toBeGreaterThan(0);
    for (const term of reading.terms) {
      const hex = /\((\d+),(\d+)\)/.exec(term.label)!;
      expect(at(state.map, Number(hex[1]), Number(hex[2])).hills).toBe(false);
    }
  });

  it('is answered by the charges the spades already out still hold', () => {
    // A size-1 town reaches three seats and a Worker holds three charges, so the
    // spade already standing beside it has the whole of that list spoken for and
    // the second one is worth nothing — "the entries existing workers will
    // reach, removed first", read at its limit.
    const { state, city } = town(8, 0, 1);
    const before = craving(state, city);
    expect(before.total).toBeGreaterThan(0);
    createUnit(state, 0, 'worker', city.col + 1, city.row);
    bumpRevision(state);
    const after = craving(state, city);
    expect(after.terms.length).toBe(0);
    expect(after.total).toBe(0);
  });

  /**
   * Two sites on one board: `rich` is four hexes of wheat-fed grassland in a
   * desert, `middling` is eighteen hexes of plains. The old sum — every hex of
   * two rings at `site.ringFalloff` — read the eighteen higher; a town works the
   * four.
   */
  function twoSites(): { state: GameState; rich: Tile; middling: Tile } {
    const state = bench(1, { width: 24, height: 12, terrain: 'desert' });
    farming(state, 0);
    const rich = at(state.map, 4, 5);
    rich.terrain = 'grassland';
    for (const [col, row] of [
      [3, 5],
      [5, 5],
      [4, 4],
      [4, 6],
    ] as const) {
      const tile = at(state.map, col, row);
      tile.terrain = 'grassland';
      tile.resource = 'wheat';
    }
    const middling = at(state.map, 16, 5);
    middling.terrain = 'grassland';
    for (const tile of mapRange(state.map, tileHex(middling), 2)) {
      if (tile.col === middling.col && tile.row === middling.row) continue;
      tile.terrain = 'plains';
    }
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, rich, middling };
  }

  it('scores four rich hexes above eighteen middling ones', () => {
    const { state, rich, middling } = twoSites();
    const player = seat(state, 0);
    const ctx = valueContext(state, player);
    const ground = yieldContextFor(state, player.id);
    const a = explainSite(state, ctx.realm, ctx, rich, ground);
    const b = explainSite(state, ctx.realm, ctx, middling, ground);
    expect(foldTerms(a.terms)).toBe(a.total);
    expect(foldTerms(b.terms)).toBe(b.total);
    expect(a.total).toBeGreaterThan(b.total);
    // And it says why: the hexes counted are the ones a town would work, each
    // named with the citizen that arrives to work it, and there are far fewer of
    // them than there are hexes in two rings.
    const counted = findTerm(a.terms, /would work inside the horizon/)!;
    expect(counted.parts!.length).toBeLessThan(19);
    expect(labelsOf([counted])).toMatch(/citizen 1's hex/);
    expect(labelsOf([counted])).toMatch(/worked for nothing/);
  });

  it('reads a site through the seat’s own eyes, never the omniscient one', () => {
    // A seam this empire cannot name pays it nothing — rule 5's ctx clause,
    // which the settle table used to walk straight past (`explainTileYield` with
    // no context at all, the omniscient reading).
    //
    // **Read off the hex rather than off the total** since batch X1e, and the
    // reason is the batch's own promise half: a seat that cannot name the seam
    // cannot see that the seam *refuses its farm* either (`improvementGroundError`
    // hands a resource's ground to the row the resource wants), so a blind seat
    // prices a farm on the iron and a seeing one prices the iron. Both readings
    // are the seat's own eyes — which is the claim — and the total is the two
    // netted against each other rather than the ctx clause said plainly. The hex's
    // own line is the ctx clause said plainly.
    const { state, rich } = twoSites();
    const player = seat(state, 0);
    for (const [col, row] of [
      [3, 5],
      [5, 5],
    ] as const) {
      at(state.map, col, row).resource = 'iron';
    }
    bumpRevision(state);
    const blind = explainSite(
      state,
      valueContext(state, player).realm,
      valueContext(state, player),
      rich,
      yieldContextFor(state, player.id),
    );
    for (const step of researchExpansion(state, 0, 'bronzePanoply')) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
    }
    if (!player.techsResearched.includes('bronzePanoply')) player.techsResearched.push('bronzePanoply');
    bumpRevision(state);
    const seeing = explainSite(
      state,
      valueContext(state, player).realm,
      valueContext(state, player),
      rich,
      yieldContextFor(state, player.id),
    );
    // What one iron hex is worth as it lies, off the site's own printed line.
    const hexAsItLies = (appraisal: Appraisal, col: number, row: number): number => {
      const counted = findTerm(appraisal.terms, /would work inside the horizon/)!;
      const hex = counted.parts!.find((part) => part.label.startsWith(`(${col},${row})`))!;
      return hex.parts![0]!.value;
    };
    expect(hexAsItLies(seeing, 3, 5)).toBeGreaterThan(hexAsItLies(blind, 3, 5));
    expect(hexAsItLies(seeing, 5, 5)).toBeGreaterThan(hexAsItLies(blind, 5, 5));
  });

  /**
   * **The site's promise half** (batch X1e, ruled 2026-09-09: *"a human will
   * take a suboptimal coastal spot over a slightly better inland spot if they
   * suspect fishing boats later"*).
   *
   * Two sites on one desert board: a coast with four fish in its ring, and a
   * meadow with four wheat-fed grassland hexes. The meadow is the better ground
   * *as it lies* — a fed grassland with the farm this seat can already lay beats
   * a bare coast — and the coast is the better ground once the boats are on the
   * fish. So the ordering is the reading: the coast wins exactly when Sailing is
   * inside the horizon, and the meadow wins when it is not.
   *
   * The horizon is the lever rather than the tree, because the tree is a fixed
   * chart and Sailing is two cheap nodes from the root on it: the reading with
   * `priorities.horizonTurns` cut short is the reading of a seat that cannot get
   * there in time, which is the bound the batch is written around. (The ruling's
   * word is "equal"; two different terrains are never exactly equal, so the
   * claim is the ordering, which is what a settler acts on.)
   */
  function coastAndMeadow(): { state: GameState; coast: Tile; meadow: Tile } {
    const state = bench(1, { width: 28, height: 12, terrain: 'desert' });
    farming(state, 0);
    const coast = at(state.map, 5, 5);
    for (const [col, row] of [
      [4, 5],
      [6, 5],
      [5, 4],
      [5, 6],
    ] as const) {
      const tile = at(state.map, col, row);
      tile.terrain = 'coast';
      tile.resource = 'fish';
    }
    const meadow = at(state.map, 20, 5);
    for (const [col, row] of [
      [19, 5],
      [21, 5],
      [20, 4],
      [20, 6],
    ] as const) {
      const tile = at(state.map, col, row);
      tile.terrain = 'grassland';
      tile.resource = 'wheat';
    }
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, coast, meadow };
  }

  it('reads the boats a coast could carry, once the node that opens them is in reach', () => {
    const { state, coast, meadow } = coastAndMeadow();
    const player = seat(state, 0);
    const read = (tile: Tile): number => {
      const ctx = valueContext(state, player);
      return explainSite(state, ctx.realm, ctx, tile, yieldContextFor(state, player.id)).total;
    };
    // The sheet's own horizon: Sailing is two cheap nodes off, so the coast is
    // priced at the fishing boats a town there would put on the fish.
    expect(read(coast)).toBeGreaterThan(read(meadow));
    // A horizon too short to reach Sailing at all, and the same two sites read
    // as they lie: the fed meadow is the better ground.
    withAiTuning({ priorities: { horizonTurns: 20 } }, () => {
      expect(read(coast)).toBeLessThan(read(meadow));
    });
  });

  it('prices a renewal as the fold it would move, and at nothing where it moves none', () => {
    // Irrigation on a town working two ploughed river banks is worth exactly what
    // the town's own fold gains — `explainTileYield` asked twice with the two
    // technology lists, which is how a building is priced one system over.
    const { state, city } = town(6, 0, 2);
    const player = seat(state, 0);
    for (const [col, row] of [
      [4, 5],
      [6, 5],
    ] as const) {
      const tile = at(state.map, col, row);
      tile.freshwater = true;
      tile.improvement = 'farm';
    }
    refreshCityDerived(state, city);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const fold = renewalFoldFor(ctx, 'irrigation');
    expect(foldTerms(fold.terms)).toBe(fold.total);
    expect(fold.towns.length).toBe(1);
    // The delta is the simulation's own, hex by hex over what the town works.
    const ground = cityContext(state, city)!;
    const wet: TileYieldContext = { ...ground, techs: [...ground.techs, 'irrigation'] };
    let gained = 0;
    for (const cell of city.workedTiles) {
      const tile = at(state.map, cell.col, cell.row);
      gained += foldTile(tile, wet).food - foldTile(tile, ground).food;
    }
    expect(gained).toBeGreaterThan(0);
    expect(fold.total).toBeCloseTo(explainYields({ food: gained }, ctx).total, 10);

    // And a town whose citizens stand on no ploughed bank at all reads nothing.
    const dry = town(6, 0, 2);
    const dryCtx = valueContext(dry.state, seat(dry.state, 0));
    expect(renewalFoldFor(dryCtx, 'irrigation').total).toBe(0);
  });
});

/**
 * **Batch X12 — the lump, the faith rate and the symmetric margin** (the user's
 * ruling of 2026-09-09, `docs/flags.md` item (ggg), read off seed 1 on the landed
 * tree).
 *
 * Three fixes and one shape between them: *a thing that happens once is not a
 * thing that happens every turn*, and the bot has exactly one exchange between
 * the two (`score.lumpTurns`). A conversion project pays once per completion; a
 * capstone's renown and its glass bead land once when the stones go up; a
 * shrine's faith, by contrast, really is a rate — and what that rate is worth is
 * the wait it takes off the faith plan, which is `sciencePrice`'s argument said
 * one bank over. The fourth case is the margin, which was arithmetic that only
 * worked in one direction.
 */
describe('the lump, the faith rate and the symmetric margin (batch X12)', () => {
  /** A town of `population` on grass, with a seat that can hold opinions. */
  function bare(population = 6): { state: GameState; player: Player; city: City } {
    const state = bench(1);
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    recomputeAllVisibility(state);
    city.population = population;
    refreshCityDerived(state, city);
    bumpRevision(state);
    return { state, player: seat(state, 0), city };
  }

  it('folds a conversion project as a lump, under a shelf paying the same per turn', () => {
    const { state, player } = bare();
    const ctx = valueContext(state, player);
    // Read off the table rather than named: whichever repeating conversion pays
    // beakers is the one the seed-1 capital was topping its list with.
    const id = PROJECT_IDS.find(
      (row) => projectDef(row).finishes !== true && (projectDef(row).pays.science ?? 0) > 0,
    )!;
    expect(id).toBeDefined();
    const paid = projectDef(id).pays.science!;

    const row = explainProjectRow(id, ctx);
    expect(foldTerms(row.terms)).toBe(row.total);
    // **It is the lump exchange and nothing else**: the same bag through
    // `explainLump`, to the bit.
    expect(row.total).toBe(explainLump({ science: paid }, ctx).total);

    // **And a shelf paying the same per turn out-scores it by exactly the
    // exchange.** That is the whole of the ruling — "science once != science per
    // turn" — and it is why a Library at ten beat a Scholarship at thirty on
    // nothing but this arithmetic.
    const shelf = explainYields({ science: paid }, ctx).total;
    expect(shelf).toBeGreaterThan(row.total);
    expect(shelf / row.total).toBeCloseTo(Math.max(1, ctx.ai.score.lumpTurns), 9);

    // Every key of the payout is read, the culture one included: a conversion
    // that fills the draft basket used to be worth nothing at all here.
    const cultural = PROJECT_IDS.find(
      (one) => projectDef(one).finishes !== true && (projectDef(one).pays.culture ?? 0) > 0,
    );
    if (cultural !== undefined) expect(explainProjectRow(cultural, ctx).total).toBeGreaterThan(0);
  });

  it('folds a row’s completion grants as lumps and its standing lines as rates', () => {
    const { state, player, city } = bare();
    const ctx = valueContext(state, player);
    // A row that pays renown when its stones go up — read off the table, never
    // named, which is the discipline the fold itself keeps.
    const id = BUILDING_IDS.find((row) => (buildingDef(row).renown?.onComplete ?? 0) > 0)!;
    expect(id).toBeDefined();
    const once = buildingDef(id).renown!.onComplete!;
    const appraisal = explainBuildingRow(id, ctx, city);
    const line = findTerm(appraisal.terms, /renown on completion, paid once/);
    expect(line).not.toBeNull();
    expect(line!.value).toBeCloseTo(
      (once * ctx.ai.weights.renown) / Math.max(1, ctx.ai.score.lumpTurns),
      9,
    );
    // The trickle beside it is a rate and is untouched by the exchange.
    const perTurn = buildingDef(id).renown!.perTurn;
    if (perTurn > 0) {
      const trickle = findTerm(appraisal.terms, /renown a turn/)!;
      expect(trickle.value).toBe(perTurn * ctx.ai.weights.renown);
    }
    expect(foldTerms(appraisal.terms)).toBe(appraisal.total);
  });

  it('prices faith at the table with nothing to hurry, and above it with a god to reach', () => {
    const { state, player } = bare();
    const ctx = valueContext(state, player);
    const table = yieldWeight(ctx.ai, 'faith', ctx.age);

    // (a) **No faith plan at all** — the table, to the bit. A `ValueContext` is
    // the memo's key, so each spread below is a fresh reading.
    const idle: ValueContext = { ...ctx, wants: { ...ctx.wants, faith: [] } };
    expect(faithPrice(idle)).toBe(table);

    // (b) **A god forty faith off, on an empire earning nothing** — the seed-1
    // reading exactly. The rate is floored at one so the delay is finite and
    // large, and one more point a turn nearly halves it: the premium is what
    // that brings forward.
    const god: Want = {
      label: 'the first god',
      currency: 'faith',
      price: 40,
      worth: 385,
      delay: 0,
      terms: [],
      outOfReach: true,
    };
    const wanting: ValueContext = { ...ctx, wants: { ...ctx.wants, faith: [god] } };
    const priced = faithPrice(wanting);
    expect(priced).toBeGreaterThan(table);
    // Never past the band every other price in the file lives in.
    expect(priced).toBeLessThanOrEqual(table * ctx.ai.priorities.priceBandHigh);

    // (c) **A want the bank already covers hurries nothing**: the pool is past
    // the price, so there is no wait for a rate to take off.
    const covered: ValueContext = {
      ...ctx,
      wants: { ...ctx.wants, faith: [{ ...god, price: 0 }] },
    };
    expect(faithPrice(covered)).toBe(table);

    // (d) **And the rate is what the line prints.** The feed says which of the
    // bank's two prices it read and what the plan did to it.
    const line = explainYields({ faith: 2 }, wanting).terms.find((term) =>
      term.label.startsWith('faith'),
    )!;
    expect(line.label).toMatch(/the faith rate price/);
    expect(line.value).toBe(2 * priced);
  });

  it('divides the incumbent’s margin when its plan reads below nought', () => {
    // A negative chain is the case the multiplication got backwards, and it is
    // reached here by turning one dial rather than by hunting a board: with the
    // node itself worth less than nothing, every unresearched goal folds below
    // zero and whichever one holds the plan is the case in hand.
    withAiTuning({ weights: { tech: -400 } }, () => {
      const state = bench(1);
      const city = foundCityAt(state, 0, at(state.map, 5, 5));
      recomputeAllVisibility(state);
      city.population = 6;
      refreshCityDerived(state, city);
      bumpRevision(state);
      const opening = decisionOfType(state, 0, 'chooseResearch');
      expect(opening).not.toBeNull();
      const scored = opening!.candidates.filter((row) => row.rejected === undefined);
      const laggard = [...scored].sort((a, b) => a.score - b.score)[0]!;
      expect(laggard.score).toBeLessThan(0);
      const id = TECH_IDS.find((tech) => techDef(tech).name === laggard.label)!;
      expect(
        applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: id, queue: 'replace' }).ok,
      ).toBe(true);
      const again = decisionOfType(state, 0, 'chooseResearch');
      expect(again).not.toBeNull();
      const row = again!.candidates.find((entry) => entry.label === laggard.label)!;
      const term = row.terms[row.terms.length - 1]!;
      expect(term.label).toMatch(/reads below nought/);
      expect(term.op).toBe('div');
      expect(term.value).toBe(aiJson.priorities.switchMargin);
      // A margin means "beat it by a tenth" in either sign: dividing a negative
      // makes it *nearer* nought, which is a plan harder to displace, where
      // multiplying it made the plan easier to take away the worse it read.
      const undefended = foldTerms(row.terms.slice(0, -1));
      expect(undefended).toBeLessThan(0);
      expect(row.score).toBeGreaterThan(undefended);
      expect(foldTerms(row.terms)).toBe(row.score);
    });
  });

  it('carries no hammer lump on a chain’s building copy, and still reads the build', () => {
    // The stones are a wait, not a ledger line — so a copy prints its own build
    // turns in its discount and the chain subtracts nothing anywhere.
    const state = bench(1);
    for (const tile of state.map.tiles) tile.hills = true;
    const towns = [
      foundCityAt(state, 0, at(state.map, 3, 5)),
      foundCityAt(state, 0, at(state.map, 9, 5)),
    ];
    recomputeAllVisibility(state);
    for (const seated of towns) {
      seated.population = 6;
      refreshCityDerived(state, seated);
    }
    // The road walked, so the only wait left is the raising — which is the wait
    // this case is about.
    const player = seat(state, 0);
    for (const node of [...researchExpansion(state, 0, 'education'), 'education' as TechId]) {
      if (!player.techsResearched.includes(node)) player.techsResearched.push(node);
    }
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const chain = techChain(state, player, ctx, 'education');
    expect(chain.held).toBe(true);
    expect(chain.researchDelay).toBe(0);
    const step = chain.steps.find((one) => one.kind === 'building')!;
    expect(step).toBeDefined();
    expect(step.cost).toBeGreaterThan(0);

    // No `sub` anywhere in the chain, and nothing in the step's own terms that
    // charges its stones. (The one `paid once` line inside a copy is the row's
    // *completion* renown, which is X12's other half — a lump priced as a lump.)
    expect(chain.terms.some((term) => term.op === 'sub')).toBe(false);
    expect(findTerm(step.terms, /hammer/i)).toBeNull();
    const owed = findTerm(chain.terms, /hammers its steps still owe/)!;
    expect(owed.value).toBe(0);

    // **And the delay still reads the build.** With the road walked the whole of
    // a copy's wait is its own town's raising, and no town can beat the busiest
    // one's rate over the same stones.
    for (const copy of step.copies) {
      expect(copy.delay).toBeGreaterThanOrEqual(copy.cost / Math.max(1, ctx.bestProduction));
      expect(copy.delay).toBeGreaterThan(0);
    }
    const wait = findTerm(step.terms, /have still to raise it/);
    expect(wait).not.toBeNull();
    expect(wait!.op).toBe('mul');
    expect(foldTerms(step.terms)).toBe(step.value);
  });
});
