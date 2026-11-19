/**
 * **Bot batch BP7 of bot pass 3, B10: the smaller readings.** The spec is
 * `docs/flags.md` item (ooooooo), entry B10 ("as proposed on the page"; the page
 * is the proposal of 2026-11-12, linked from the item):
 *
 *   - price each Charter through the reading that exists for what it opens, and
 *     keep nought only where the bot cannot use the thing at all;
 *   - price a Boon's unit at the unit's production cost, and a trader at the
 *     route it would run;
 *   - spread a Boon's lump over the turns left in the game, to a limit, in place
 *     of a fixed twenty;
 *   - add the missing forecast for The Grain Census;
 *   - read a Charter technology in the research choice as the draft reads it,
 *     and research a held Charter's technology within fifteen turns.
 */
import { describe, expect, it } from 'vitest';

import { bestTechGoal, valueContext } from '../../src/ai/bot';
import { appraise } from '../../src/ai/decision';
import { techChain } from '../../src/ai/chain';
import { explainYields } from '../../src/ai/prices';
import {
  boonTurns,
  explainCharter,
  explainCharterKnowledge,
  explainCounted,
  explainRite,
  onDraftWorth,
  scoreEffects,
} from '../../src/ai/value';
import { withAiTuning } from '../../src/ai/aiConfig';
import aiJson from '../../data/ai.json';
import { bestMeleeFor, foundCityAt, refreshCityDerived, unitProductionCost } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import { type CardPaysEffect, type OrderId, orderDef } from '../../src/sim/statecraftData';
import { type TechId, techDef } from '../../src/sim/techData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** One grown town for seat 0 on a blank board, at a turn. */
function bench(turn = 60): { state: GameState; player: Player; city: City } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 30, height: 14, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 14).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.turn = turn;
  const city = foundCityAt(state, 0, at(state.map, 6, 6));
  city.population = 6;
  city.queue = [];
  refreshCityDerived(state, city);
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: playerById(state, 0)!, city };
}

const charterTerms = (id: string, ctx: ReturnType<typeof valueContext>) => explainCharter(id as OrderId, ctx)!.terms;

describe('a charter that opens no technology', () => {
  it('prices a building charter at the shelf it opens, and nothing once it is open', () => {
    const { state, player } = bench();
    const ctx = valueContext(state, player);
    const [term] = charterTerms('thePlantersCharter', ctx);
    const shelf = scoreEffects([{ kind: 'unlocksBuilding', building: 'plantationHouse' }], ctx);
    expect(term!.value).toBeCloseTo(shelf, 8);
    player.charteredBuildings.push('plantationHouse');
    bumpRevision(state);
    expect(charterTerms('thePlantersCharter', valueContext(state, player))[0]!.value).toBe(0);
  });

  it('prices a unit charter as a line of soldiers is priced', () => {
    const { state, player } = bench();
    const ctx = valueContext(state, player);
    for (const id of ['numidianCavalryCharter', 'theCharteredCompany']) {
      const unit = orderDef(id as OrderId).charter!.unlocks.unit!;
      expect(charterTerms(id, ctx)[0]!.value, id).toBeCloseTo(scoreEffects([{ kind: 'unlocksUnit', unit }], ctx), 8);
      expect(charterTerms(id, ctx)[0]!.value, id).toBeGreaterThan(0);
    }
  });

  it('prices a rite charter at one town’s blessing times the towns, at nought or more', () => {
    const { state, player } = bench();
    foundCityAt(state, 0, at(state.map, 14, 6));
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(ctx.cities).toBe(2);
    for (const id of ['theFast', 'theSabbathLaws']) {
      const rite = orderDef(id as OrderId).charter!.unlocks.rites![0]!;
      const blessing = explainRite(rite, { ...ctx, cities: 1 }).total;
      expect(charterTerms(id, ctx)[0]!.value, id).toBeCloseTo(Math.max(0, blessing) * 2, 8);
    }
  });

  it('keeps a tended work at nought, because this bot lays none', () => {
    const { state, player } = bench();
    const ctx = valueContext(state, player);
    for (const id of ['theFishTraps', 'theWildOrchards']) {
      const terms = charterTerms(id, ctx);
      expect(terms.map((term) => term.value), id).toEqual([0]);
      expect(aiJson.workers.improvements).not.toContain(orderDef(id as OrderId).charter!.unlocks.improvement);
    }
  });
});

describe('a Boon', () => {
  it('spreads its lump over the turns the game has left, never over more than the horizon', () => {
    const early = bench(30);
    expect(boonTurns(valueContext(early.state, early.player))).toBe(Math.min(HORIZON, aiJson.score.gameTurns - 30));
    const late = bench(aiJson.score.gameTurns - 12);
    expect(boonTurns(valueContext(late.state, late.player))).toBe(12);
    const past = bench(aiJson.score.gameTurns + 40);
    expect(boonTurns(valueContext(past.state, past.player))).toBe(1);
  });

  it('prices The Sword of State’s piece at the hammers it would cost', () => {
    const { state, player } = bench();
    player.techsResearched.push('bronzeWorking' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const type = bestMeleeFor(state, 0)!;
    expect(type).toBeDefined();
    const lump = explainYields({ production: unitProductionCost(state, 0, type) }, ctx).total;
    expect(onDraftWorth('theSwordOfState' as OrderId, ctx)).toBeCloseTo(lump / boonTurns(ctx), 8);
    expect(onDraftWorth('theGeneralSummons' as OrderId, ctx)).toBeCloseTo(3 * lump / boonTurns(ctx), 8);
  });

  it('prices The First Caravan’s trader at the route it would run, and nothing with no slot free', () => {
    const { state, player, city } = bench();
    const ctx = valueContext(state, player);
    const pay = appraise([{ label: 'a route', value: 7 }]);
    const open = { from: city, to: city, mode: 'land', pay } as never;
    const free = { ...ctx, routes: { ...ctx.routes, free: 1, open } };
    expect(onDraftWorth('theFirstCaravan' as OrderId, free)).toBeCloseTo(7, 8);
    const full = { ...ctx, routes: { ...ctx.routes, free: 0, open } };
    expect(onDraftWorth('theFirstCaravan' as OrderId, full)).toBe(0);
  });
});

describe('The Grain Census', () => {
  it('forecasts the towns that pass their largest size, never fewer than the table', () => {
    const { state, player } = bench();
    const ctx = valueContext(state, player);
    const line = orderDef('theGrainCensus' as OrderId).effects.find(
      (effect) => effect.kind === 'pays' && effect.count === 'tally',
    ) as CardPaysEffect;
    const reading = explainCounted(line, ctx, 'theGrainCensus' as OrderId);
    const flat = JSON.stringify(reading);
    expect(flat).not.toContain('no forecast');
    expect(flat).toContain('more towns past their largest size over the horizon');
    expect(reading.total).toBeGreaterThan(0);
  });
});

describe('a charter technology', () => {
  it('reads the same in the research chain as in the draft', () => {
    const { state, player } = bench();
    player.charteredTechs.push('casting' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const chain = techChain(state, player, ctx, 'casting' as TechId);
    const known = chain.terms[0]!.parts!.find((term) => term.label.startsWith('what knowing it gives'));
    expect(known!.parts![0]!.value).toBe(explainCharterKnowledge('casting' as TechId, ctx).total);
  });

  it('is the research goal once its road fits the deadline, and the rule can be turned off', () => {
    const { state, player } = bench();
    // A charter technology whose road is one node from the start of the tree.
    const tech = 'herbals' as TechId;
    expect(techDef(tech).charter).toBe(true);
    for (const parent of techDef(tech).prereqs ?? []) player.techsResearched.push(parent as TechId);
    player.charteredTechs.push(tech);
    bumpRevision(state);
    expect(bestTechGoal(state, player)).toBe(tech);
    // With the rule off, the table's own best is another node on this board, so
    // the charter's road is the goal only because of the deadline.
    const off = withAiTuning({ research: { charterTurns: 0 } } as never, () => bestTechGoal(state, player));
    expect(off).not.toBe(tech);
  });

  it('waits while the road is longer than the deadline', () => {
    const { state, player } = bench();
    // The last charter technology of the tree, many nodes and many turns away.
    const tech = 'navalGunnery' as TechId;
    player.charteredTechs.push(tech);
    bumpRevision(state);
    expect(bestTechGoal(state, player)).not.toBe(tech);
  });
});
