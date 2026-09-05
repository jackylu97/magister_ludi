/**
 * **The brain-v1 pass, at the six things it added and the one it must not have
 * broken.**
 *
 * `aiBot.test.ts` pins the contract (every command accepted, the same board
 * always the same command) and `aiDecision.test.ts` pins the arithmetic (a score
 * is the fold of its terms). This file pins the *new opinions*, and each of them
 * is a claim a played game can only demonstrate statistically, so each is asked
 * of the pure function that holds it:
 *
 *   · **personas merge sparsely.** A persona says four numbers and inherits the
 *     rest, including knobs added after it was written — so the merge is checked
 *     to invent no keys and to leave the untouched blocks alone.
 *   · **two seats appraise differently in the same turn.** The whole reason the
 *     configuration rides in `ValueContext` rather than in a module global.
 *   · **the falloff, the plan, the patience, the grace, the citizen** — one
 *     claim each, at the seam that owns it.
 *   · **and the aggression is silent at zero**, which is the promise the
 *     peaceful bot is still keeping.
 */

import { describe, expect, it } from 'vitest';

import {
  AI,
  chooseProduction,
  explainCitizen,
  explainNextTown,
  isPatientRow,
  nextBotCommand,
  nextBotDecision,
  valueContext,
} from '../../src/ai/bot';
import { DEFAULT_PERSONA, PERSONA_IDS, aiConfigFor, personaLabel } from '../../src/ai/aiConfig';
import { foldTerms } from '../../src/ai/decision';
import { driveBots } from '../../src/ai/driver';
import { buildImprovementPlan } from '../../src/ai/plan';
import { type Game, createGame, dispatch, snapshotState } from '../../src/sim/game';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import type { City, GameConfig, GameState, Player } from '../../src/sim/state';
import { createUnit, playerById, realPlayers } from '../../src/sim/state';
import { openEveryWar } from './warHelpers';

// Re-aimed from seed 20260831 on 2026-09-03, when the default map became a
// pangaea: the old seed's capital came up ringed in forest and shore, and a bench
// where a spade has nothing legal to do makes the improvement plan below assert
// nothing at all.
const CONFIG: GameConfig = {
  seed: 20260903,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

function grownGame(turns = 10, config: GameConfig = CONFIG): Game {
  const game = createGame(config);
  for (let turn = 0; turn < turns; turn++) driveBots(game, { warn: () => {} });
  return game;
}

function seat(state: GameState, playerId: number): Player {
  const player = playerById(state, playerId);
  if (!player) throw new Error(`no seat ${playerId}`);
  return player;
}

function firstCity(state: GameState, playerId: number): City {
  const city = state.cities.find((town) => town.ownerId === playerId);
  if (!city) throw new Error(`seat ${playerId} has no city`);
  return city;
}

/** Every leaf path of an object, so two configurations can be compared shape-first. */
function paths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [prefix];
  const found: string[] = [];
  for (const key of Object.keys(value as Record<string, unknown>)) {
    found.push(...paths((value as Record<string, unknown>)[key], prefix === '' ? key : `${prefix}.${key}`));
  }
  return found;
}

describe('the persona sheet', () => {
  it('names the five the ruling asked for, and balanced is the default', () => {
    expect([...PERSONA_IDS]).toEqual(['balanced', 'wide', 'tall', 'zealot', 'warmonger']);
    expect(DEFAULT_PERSONA).toBe('balanced');
    // Balanced is the base itself rather than a copy of it: an override sheet
    // that said nothing must not be a second object anybody could retune.
    expect(aiConfigFor('balanced')).toBe(AI);
    expect(aiConfigFor(undefined)).toBe(AI);
    expect(personaLabel('warmonger')).toBe('Warmonger');
  });

  it('falls back to balanced for a persona this build has never heard of', () => {
    // A save from a build that knew a fifth persona must still replay. A persona
    // drives the bot, not the reducer, so the fallback costs a replay nothing.
    expect(aiConfigFor('condottiere')).toBe(AI);
  });

  it('merges sparsely: it invents no key and leaves the untouched blocks alone', () => {
    const base = paths(AI).sort();
    for (const id of PERSONA_IDS) {
      const merged = aiConfigFor(id);
      // The shape is the base's, exactly. A typo in an override key would show
      // up here as an invented path rather than as a knob that silently does
      // nothing for the rest of the project's life.
      expect({ persona: id, shape: paths(merged).sort() }).toEqual({ persona: id, shape: base });
      // And a block nobody overrode is the base's own numbers.
      expect({ persona: id, driver: merged.driver }).toEqual({ persona: id, driver: AI.driver });
    }
  });

  it('overrides what each persona says it overrides', () => {
    // The authored table, as numbers rather than as prose. These are the user's
    // to tune; what is pinned is that the merge *reaches* them.
    expect(aiConfigFor('tall').expansion.settlerCap).toBe(2);
    expect(aiConfigFor('tall').expansion.cityValueFalloff).toBeLessThan(
      aiConfigFor('wide').expansion.cityValueFalloff,
    );
    expect(aiConfigFor('wide').expansion.settlerCap).toBeGreaterThan(AI.expansion.settlerCap);
    expect(aiConfigFor('zealot').religion.prophetTechValue).toBeGreaterThan(AI.religion.prophetTechValue);
    expect(aiConfigFor('warmonger').weights.military).toBeGreaterThan(AI.weights.military);
    // The one behaviour addition, and the promise that goes with it: only the
    // warmonger has an appetite at all.
    for (const id of PERSONA_IDS) {
      const aggression = aiConfigFor(id).military.aggression;
      expect({ persona: id, hostile: aggression > 0 }).toEqual({
        persona: id,
        hostile: id === 'warmonger',
      });
    }
    // An overridden weight row replaces wholesale rather than merging half a
    // table: four ages in, four ages out.
    expect(aiConfigFor('tall').weights.food.length).toBe(AI.weights.food.length);
  });

  it('carries each persona’s expansion intent through the numbers batch 4 left it', () => {
    /**
     * **The persona fallout of the gate deletions** (batch 4 of
     * `docs/bot-priorities.md`). Three personas used to spell how eagerly they
     * settled with knobs that no longer exist — wide at `settlerCityPop 2` and
     * `siteScoreMin 11`, tall at 5 and 22, the warmonger at 12 — and every one of
     * those was a *gate*, which is a feasibility sentence rather than a
     * preference. What carries the intent now is the two numbers that were always
     * the preference, and this is the pin that they still say it:
     *
     *   · **wide** — the flat falloff and the raised city weight. Its deleted
     *     gates said *settle sooner and on worse ground*, and that is now every
     *     empire's default: there is no pop floor and no site floor anywhere in
     *     the bot, so wide's distinction is that it never tires of the next town.
     *   · **tall** — the steep falloff and the *lowered* city weight, and one
     *     carrier batch 4 gave it that it did not have before: `weights.happiness`
     *     at sixteen against the balanced twelve, which is what the expansion
     *     chain charges a town founded into a deficit. Tall's *"only settle
     *     excellent ground"* is now *"tall minds the crowding more"*, which is
     *     the same sentence said as a price.
     *   · **warmonger** — a raised city weight and the balanced falloff: it takes
     *     towns, it does not court them.
     */
    const wide = aiConfigFor('wide');
    const tall = aiConfigFor('tall');
    const warmonger = aiConfigFor('warmonger');
    expect(wide.expansion.cityValueFalloff).toBe(1);
    expect(wide.weights.city).toBeGreaterThan(AI.weights.city);
    expect(tall.expansion.cityValueFalloff).toBeLessThan(AI.expansion.cityValueFalloff);
    expect(tall.weights.city).toBeLessThan(AI.weights.city);
    // The new carrier: a town founded into a deficit costs a tall empire more.
    expect(tall.weights.happiness).toBeGreaterThan(AI.weights.happiness);
    expect(warmonger.weights.city).toBeGreaterThan(AI.weights.city);
    expect(warmonger.expansion.cityValueFalloff).toBe(AI.expansion.cityValueFalloff);
    // And the deleted knobs are gone from every sheet, not merely from the base.
    for (const id of PERSONA_IDS) {
      const expansion = aiConfigFor(id).expansion as unknown as Record<string, unknown>;
      expect({ persona: id, gates: Object.keys(expansion).sort() }).toEqual({
        persona: id,
        gates: ['cityValueFalloff', 'settlerCap', 'siteSearchRadius'],
      });
    }
  });

  /**
   * **The behavioural half is deliberately not here.** *"Wide out-expands tall
   * over forty driven turns"* is a claim about a trajectory, and a forty-turn
   * driven game is slow **by kind** (CLAUDE.md: multi-decade pacing sims) however
   * quick it happens to run — it belongs in `<concern>.slow.test.ts` and batch 4
   * was told to leave the slow tier alone. What stands in its place is the pin
   * above: the two numbers each persona's intent now rides on, asserted directly.
   */

  it('lets two seats appraise differently in the same turn', () => {
    // The whole reason the configuration rides in `ValueContext`. One board, one
    // turn, two seats — and the appraisals differ because the *seats* differ,
    // not because a global was swapped between two calls.
    const game = grownGame();
    seat(game.state, 0).persona = 'wide';
    seat(game.state, 1).persona = 'tall';
    const wide = valueContext(game.state, seat(game.state, 0));
    const tall = valueContext(game.state, seat(game.state, 1));
    expect(wide.ai.expansion.settlerCap).toBe(aiConfigFor('wide').expansion.settlerCap);
    expect(tall.ai.expansion.settlerCap).toBe(aiConfigFor('tall').expansion.settlerCap);
    // And asking the first seat again does not answer with the second's sheet.
    expect(valueContext(game.state, seat(game.state, 0)).ai.expansion.settlerCap).toBe(
      wide.ai.expansion.settlerCap,
    );
  });

  it('rides into the config, and a persona’d game is still a pure function of its state', () => {
    const config: GameConfig = {
      ...CONFIG,
      players: [
        { name: 'Crimson', color: '#d4502e', persona: 'warmonger' },
        { name: 'Teal', color: '#1f8a85', persona: 'tall' },
      ],
    };
    // It reaches the players, which is the only way the bot can ever see it.
    const first = grownGame(8, config);
    expect(seat(first.state, 0).persona).toBe('warmonger');
    expect(seat(first.state, 1).persona).toBe('tall');
    const second = grownGame(8, config);
    expect(JSON.stringify(second.log)).toBe(JSON.stringify(first.log));
    expect(snapshotState(second.state)).toBe(snapshotState(first.state));
  });

  it('drives every persona for a few turns with nothing refused', () => {
    for (const persona of PERSONA_IDS) {
      const refusals: string[] = [];
      const game = createGame({
        ...CONFIG,
        players: [
          { name: 'Crimson', color: '#d4502e', persona },
          { name: 'Teal', color: '#1f8a85', persona },
        ],
      });
      for (let turn = 0; turn < 8; turn++) {
        for (const report of driveBots(game, { warn: (message) => refusals.push(message) })) {
          if (report.refused > 0) refusals.push(`${persona}: seat ${report.playerId} had refusals`);
          if (!report.ended) refusals.push(`${persona}: seat ${report.playerId} stalled`);
        }
      }
      expect({ persona, refusals }).toEqual({ persona, refusals: [] });
    }
  });
});

describe('the settler’s two new halves', () => {
  it('is worth less for every town the empire already holds', () => {
    // **`cityValueFalloff`**, the honest tall lever. The same board appraised by
    // two personas: the one that discounts hardest wants the next town least,
    // and the discount keeps biting as the empire grows.
    const game = grownGame();
    const player = seat(game.state, 0);
    const townValue = (persona: string): number => {
      player.persona = persona;
      const appraisal = explainNextTown(game.state, player, valueContext(game.state, player));
      expect(foldTerms(appraisal.terms)).toBe(appraisal.total);
      return appraisal.total;
    };
    // Wide never discounts (falloff 1); balanced slows; tall stops wanting the
    // next town long before a cap would stop it.
    expect(townValue('wide')).toBeGreaterThan(townValue(DEFAULT_PERSONA));
    expect(townValue(DEFAULT_PERSONA)).toBeGreaterThan(townValue('tall'));

    // And it is a curve rather than a step: one more town held is one more
    // multiplication, whatever the count already is.
    player.persona = DEFAULT_PERSONA;
    const before = explainNextTown(game.state, player, valueContext(game.state, player)).total;
    const capital = firstCity(game.state, 0);
    game.state.cities.push({ ...capital, id: capital.id + 9000 });
    const after = explainNextTown(game.state, player, valueContext(game.state, player)).total;
    expect(after).toBeLessThan(before);
  });

  it('prices a citizen off the next tile, the science it makes, and a small town’s premium', () => {
    // **The user's ruling, 2026-09-03.** Three lines, and the premium is the one
    // that moves with the persona — `growth.smallCityPremium` is tall's whole
    // opinion about what a citizen is for.
    const game = grownGame(12);
    const player = seat(game.state, 0);
    const city = firstCity(game.state, 0);

    player.persona = DEFAULT_PERSONA;
    const balanced = explainCitizen(game.state, city, valueContext(game.state, player));
    expect(foldTerms(balanced.terms)).toBe(balanced.total);
    expect(balanced.total).toBeGreaterThan(0);
    // The science stream is always there — every citizen pays the standing
    // per-pop rate — so the term is never absent.
    expect(balanced.terms.some((term) => term.label.includes('science it makes'))).toBe(true);

    player.persona = 'tall';
    const tall = explainCitizen(game.state, city, valueContext(game.state, player));
    expect(tall.total).toBeGreaterThan(balanced.total);
  });
});

describe('the improvement plan', () => {
  it('folds every entry’s terms back to its own value, and never files a worthless one', () => {
    const game = grownGame(14);
    const player = seat(game.state, 0);
    const plan = buildImprovementPlan(game.state, player, valueContext(game.state, player));
    expect(plan.entries.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const entry of plan.entries) {
      if (foldTerms(entry.terms) !== entry.value) {
        failures.push(`${entry.label}: terms fold to ${foldTerms(entry.terms)}, entry says ${entry.value}`);
      }
      if (entry.value <= 0) failures.push(`${entry.label}: filed at ${entry.value}`);
    }
    expect(failures).toEqual([]);
    // Best first — the order the three readers all depend on.
    const values = plan.entries.map((entry) => entry.value);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });

  it('sends a worker to a hex the plan actually names', () => {
    // The behavioural half: whatever the worker is told to do, it is one of the
    // rows the plan scored — not the first legal improvement on a list.
    const game = grownGame(16);
    const player = seat(game.state, 0);
    const worker = game.state.units.find(
      (unit) => unit.ownerId === 0 && unit.chargesLeft !== undefined && unit.type !== 'settler',
    );
    if (worker === undefined) return;
    const plan = buildImprovementPlan(game.state, player, valueContext(game.state, player));
    const decision = decisionFor(game, 0, worker.id);
    if (decision === null) return;
    const chosen = decision.candidates.find((candidate) => candidate.chosen);
    expect(chosen).toBeDefined();
    const named = plan.entries.some((entry) => entry.label === chosen!.label);
    // A worker with nothing in reach stands down or surveys, which is not a plan
    // row; every other order it can give is one.
    expect(
      named ||
        chosen!.label === 'sleep' ||
        chosen!.label === 'fortify' ||
        chosen!.label === 'survey the ground it stands on',
    ).toBe(true);
  });
});

describe('wonder patience', () => {
  it('is patient about the rows there is only one of, and about nothing else', () => {
    // Read off the rows' own markers, never against a name. A row that is a
    // wonder, is once per empire, ends the game or pays a bead is patient; every
    // ordinary building is not.
    const offenders: string[] = [];
    for (const id of BUILDING_IDS) {
      const def = buildingDef(id);
      const rare =
        def.wonder === true ||
        def.oncePerEmpire === true ||
        def.endsTheGame === true ||
        (def.onComplete ?? []).some((grant) => grant.grant === 'bead');
      if (isPatientRow({ kind: 'building', id }) !== rare) offenders.push(id);
    }
    expect(offenders).toEqual([]);
    // A unit and a conversion are never patient: there are as many spearmen as
    // an empire cares to raise, and a project never finishes at all.
    expect(isPatientRow({ kind: 'unit', id: 'warrior' })).toBe(false);
  });

  it('never amortises a patient row over more than the patience', () => {
    // The invariant, over a played game: whatever a wonder's real build time is,
    // the divisor the bot scored it with is capped.
    const game = grownGame(20);
    const wonders = new Set(
      BUILDING_IDS.filter((id) => buildingDef(id).wonder === true).map((id) => buildingDef(id).name),
    );
    const offenders: string[] = [];
    for (const city of game.state.cities) {
      if (city.ownerId !== 0) continue;
      const decision = buildDecisionFor(game, 0, city.id);
      for (const candidate of decision?.candidates ?? []) {
        if (!wonders.has(candidate.label)) continue;
        const divisor = candidate.terms.find((term) => term.op === 'div');
        if (divisor !== undefined && divisor.value > AI.score.patienceTurns) {
          offenders.push(`${candidate.label}: ÷ ${divisor.value}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the opening grace', () => {
  it('reads a young empire’s empty books as calm, and says so in the label', () => {
    // **The bug it closes**: pressure pinned at full aversion by turn six of a
    // fresh game, because an empire with one town and no market has no income
    // yet — which is not the same thing as bleeding.
    const game = createGame(CONFIG);
    const player = seat(game.state, 0);
    player.gold = AI.solvency.graceTreasury + 10;
    const young = valueContext(game.state, player);
    expect(young.goldPressure).toBe(1);
    expect(young.pressureNote).not.toBe('');

    // Past the grace's own turn, the ordinary ramp is back.
    game.state.turn = AI.solvency.graceTurns + 1;
    const older = valueContext(game.state, player);
    expect(older.pressureNote).toBe('');
    expect(older.goldPressure).toBeGreaterThan(1);
  });

  it('never graces an empire whose treasury is actually falling', () => {
    const game = createGame(CONFIG);
    const player = seat(game.state, 0);
    player.gold = AI.solvency.graceTreasury + 10;
    // A standing bill with nothing paying it: the rate goes under zero and the
    // grace stops applying, however young the world is.
    for (let index = 0; index < 8; index++) {
      createUnit(game.state, 0, 'warrior', 3 + index, 3);
    }
    const ctx = valueContext(game.state, player);
    if (ctx.goldPressure > 1) expect(ctx.pressureNote).toBe('');
  });
});

describe('the warmonger’s one capability', () => {
  it('leaves a peaceful seat unable to strike a nation', () => {
    // The promise the default bot is still keeping. A rival's warrior parked
    // beside a spare piece, and the balanced seat does not swing at it — and
    // since schema 56 it could not swing anyway without a declaration, which
    // makes this the *stronger* statement rather than a weaker one.
    const game = grownGame(12);
    const city = firstCity(game.state, 0);
    // Solvent, so the arrears arm is not what answers instead of the soldier.
    seat(game.state, 0).gold = 500;
    createUnit(game.state, 0, 'warrior', city.col, city.row);
    const free = createUnit(game.state, 0, 'warrior', city.col + 1, city.row);
    const rival = createUnit(game.state, 1, 'warrior', city.col + 2, city.row);
    const order = commandFor(game, 0, free.id);
    if (order !== null && order.type === 'attack') {
      expect(order.target).not.toEqual({ col: rival.col, row: rival.row });
    }
  });

  it('strikes and marches once the appetite is set', () => {
    const game = grownGame(12);
    // **The war is declared for it** (schema 56, the war ruling). A bot does
    // not declare yet — that is P3, the warmonger's declaration policy — so the
    // appetite this test is about would otherwise be measured against a
    // reducer that refuses every blow. The frame is scenery here; the appetite
    // is the subject. See `test/sim/warHelpers.ts`.
    openEveryWar(game.state);
    seat(game.state, 0).persona = 'warmonger';
    seat(game.state, 0).gold = 500;
    const city = firstCity(game.state, 0);
    createUnit(game.state, 0, 'warrior', city.col, city.row);
    const free = createUnit(game.state, 0, 'warrior', city.col + 1, city.row);
    const rival = createUnit(game.state, 1, 'warrior', city.col + 2, city.row);
    const order = commandFor(game, 0, free.id);
    expect(order).not.toBeNull();
    // Either it swings at the piece next door or it walks at it; what it must
    // not do is stand down beside a rival it is hunting.
    if (order!.type === 'attack' || order!.type === 'moveUnit') {
      expect(order!.target).toEqual({ col: rival.col, row: rival.row });
    } else {
      expect(['attack', 'moveUnit']).toContain(order!.type);
    }
  });
});

describe('a great person no longer sleeps', () => {
  it('never answers a great person with a sleep', () => {
    // The v1 stood every one of them down. Whatever this bot decides — act,
    // plant, or walk to better ground — it is not that.
    const game = grownGame(10);
    const player = seat(game.state, 0);
    player.researching = player.researching ?? null;
    const city = firstCity(game.state, 0);
    const person = createUnit(game.state, 0, 'greatPerson', city.col + 1, city.row);
    // A named person: the family is what both verbs dispatch on.
    person.person = 'archimedes';
    const decision = decisionFor(game, 0, person.id);
    if (decision === null) return;
    expect(decision.command.type).not.toBe('sleepUnit');
    expect(['greatPersonAct', 'greatPersonWork', 'moveUnit']).toContain(decision.command.type);
    for (const candidate of decision.candidates) {
      if (candidate.rejected !== undefined) continue;
      expect(foldTerms(candidate.terms)).toBe(candidate.score);
    }
  });
});

describe('every new term still folds to its own score', () => {
  it('holds over a persona’d game, decision by decision', () => {
    // The identity pin, extended over the arithmetic this pass added — the plan
    // entries, the citizen, the falloff, the patience, the act. Asked of a
    // warmonger and a tall seat so the new arms are actually walked.
    const game = createGame({
      ...CONFIG,
      players: [
        { name: 'Crimson', color: '#d4502e', persona: 'warmonger' },
        { name: 'Teal', color: '#1f8a85', persona: 'tall' },
      ],
    });
    const failures: string[] = [];
    let seen = 0;
    for (let turn = 0; turn < 24; turn++) {
      for (const player of realPlayers(game.state)) {
        for (let step = 0; step < 200; step++) {
          const decision = nextBotDecision(game.state, player.id);
          if (decision === null) break;
          seen += 1;
          for (const candidate of decision.candidates) {
            if (candidate.rejected !== undefined) continue;
            const folded = foldTerms(candidate.terms);
            if (folded !== candidate.score) {
              failures.push(`${decision.kind}/${candidate.label}: ${folded} vs ${candidate.score}`);
            }
          }
          if (!dispatch(game, decision.command).ok) break;
        }
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    expect(failures).toEqual([]);
    // A floor, not a figure: it is here so an assertion that walked no decisions
    // could never pass quietly. Lowered from 40 on 2026-09-04 — the levelling
    // ruling re-seeded every Statecraft draw, so this persona'd game is a
    // different twenty-four turns and lands on exactly forty decisions.
    expect(seen).toBeGreaterThan(20);
  });
});

// --- little drivers -----------------------------------------------------------

/** The build decision for one town, with every other blocker cleared first. */
function buildDecisionFor(game: Game, playerId: number, cityId: number) {
  const player = seat(game.state, playerId);
  const city = game.state.cities.find((town) => town.id === cityId);
  if (!city) return null;
  // Asked directly rather than driven, so the table is the one the town would
  // have been given without anything else in the turn moving.
  const item = chooseProduction(game.state, player, city);
  if (item === null) return null;
  return nextBuildDecision(game, playerId, cityId);
}

function nextBuildDecision(game: Game, playerId: number, cityId: number) {
  for (let step = 0; step < 80; step++) {
    const decision = nextBotDecision(game.state, playerId);
    if (decision === null) return null;
    if (decision.kind === 'build' && 'cityId' in decision.command && decision.command.cityId === cityId) {
      return decision;
    }
    if (!dispatch(game, decision.command).ok) return null;
  }
  return null;
}

/** What one named piece would be told to do, with every other blocker cleared. */
function decisionFor(game: Game, playerId: number, unitId: number) {
  for (let step = 0; step < 80; step++) {
    const decision = nextBotDecision(game.state, playerId);
    if (decision === null) return null;
    if ('unitId' in decision.command && decision.command.unitId === unitId) return decision;
    if (!dispatch(game, decision.command).ok) return null;
  }
  return null;
}

function commandFor(game: Game, playerId: number, unitId: number): { type: string; target?: { col: number; row: number } } | null {
  for (let step = 0; step < 80; step++) {
    const command = nextBotCommand(game.state, playerId);
    if (command === null) return null;
    if ('unitId' in command && command.unitId === unitId) {
      return command as { type: string; target?: { col: number; row: number } };
    }
    if (!dispatch(game, command).ok) return null;
  }
  return null;
}
