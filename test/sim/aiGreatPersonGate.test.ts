/**
 * **Batch BP2 of bot pass 3, P3: the great-person gate is priced by what it
 * releases.** The spec is `docs/flags.md` item (ooooooo), entry P3; the audit is
 * `docs/audit/bot-pass-3-competitiveness.md` §3.3 and fault 3.
 *
 * Renown banks from the first turn, but no great person comes until a seat holds
 * the ability that opens the offer (`ancestorRites`). Every ability used to be
 * worth the flat `research.abilityValue`. Now the gate is worth the great people
 * the seat's banked renown and `research.greatPersonTurns` turns of its renown
 * income would call, times the bot's price for a great person (its offer arm's
 * price, averaged over the next offer's bag: `expectedGreatPersonWorth`), with
 * the flat value as the floor.
 *
 * Pinned here:
 *
 *   - a seat with renown banked values the gate's technology above the same seat
 *     with none, and the gate's term is the flat value when little is in reach;
 *   - the count is the sim's own price ladder walked rung by rung, and each
 *     person is priced at the bot's expected worth of its next great person;
 *   - a seat with a large bank aims its research at the gate, where the same
 *     seat with none aims elsewhere.
 */
import { describe, expect, it } from 'vitest';

import { AI } from '../../src/ai/aiConfig';
import { bestTechGoal, valueContext } from '../../src/ai/bot';
import { techChain } from '../../src/ai/chain';
import type { ValueTerm } from '../../src/ai/decision';
import { expectedGreatPersonWorth } from '../../src/ai/value';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { renownThreshold } from '../../src/sim/renown';
import { type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import { researchExpansion } from '../../src/sim/tech';
import { ABILITY_TECH, TECH_IDS, techColumn, techDef } from '../../src/sim/techData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

/** The technology that opens the offer, found through the sim's own inversion. */
const GATE = ABILITY_TECH.get('ancestorRites')!;

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/**
 * Two grown towns have finished the first research column and can research the
 * great-person gate. The banked renown is the difference between the two cases.
 */
function bench(renown: number): { state: GameState; player: Player } {
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
  state.turn = 60;
  for (const col of [6, 14]) {
    const city = foundCityAt(state, 0, at(state.map, col, 6));
    city.population = 6;
    refreshCityDerived(state, city);
  }
  const player = playerById(state, 0)!;
  const road = researchExpansion(state, 0, GATE);
  const opening = TECH_IDS.filter(id => techDef(id).age === 1 && !techDef(id).charter && techColumn(id) <= 1);
  player.techsResearched = [...new Set([...player.techsResearched, ...opening, ...road.filter(id => id !== GATE)])];
  player.renownPool = renown;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player };
}

/** The gate's own term in the gate technology's chain. */
function gateTerm(state: GameState, player: Player): ValueTerm {
  const chain = techChain(state, player, valueContext(state, player), GATE);
  const walk = (terms: readonly ValueTerm[]): ValueTerm | null => {
    for (const term of terms) {
      if (term.label.startsWith('the great-person gate')) return term;
      const inner = walk(term.parts ?? []);
      if (inner !== null) return inner;
    }
    return null;
  };
  // The node has still to land, so the gate's term is wrapped in its wait.
  const found = walk(chain.terms);
  if (found === null) throw new Error('no gate term');
  return found.parts?.find((part) => part.label.startsWith('the great-person gate')) ?? found;
}

describe('the great-person gate', () => {
  it('is worth more to a seat with renown banked, and the flat value when little is in reach', () => {
    const none = bench(0);
    const banked = bench(2000);
    const ctxNone = valueContext(none.state, none.player);
    const ctxBanked = valueContext(banked.state, banked.player);
    expect(techChain(banked.state, banked.player, ctxBanked, GATE).worth).toBeGreaterThan(
      techChain(none.state, none.player, ctxNone, GATE).worth,
    );
    expect(gateTerm(none.state, none.player).value).toBe(AI.research.abilityValue);
    expect(gateTerm(banked.state, banked.player).value).toBeGreaterThan(AI.research.abilityValue);
  });

  it('counts people on the sim’s own price ladder, each at the bot’s price for one', () => {
    const { state, player } = bench(2000);
    const term = gateTerm(state, player);
    const ctx = valueContext(state, player);
    // The ladder by hand: the rungs `renownThreshold` names as the count rises.
    let left = 2000;
    let called = 0;
    for (;;) {
      const cost = renownThreshold(state, { ...player, greatPeopleRecruited: called });
      if (cost > left) break;
      left -= cost;
      called += 1;
    }
    expect(called).toBeGreaterThan(1);
    const each = expectedGreatPersonWorth(ctx).total;
    expect(each).toBeGreaterThan(0);
    expect(term.parts?.[0]?.value).toBe(called);
    expect(term.value).toBe(called * each);
    expect(term.label).toContain(`would call ${called} great people`);
  });

  it('turns a large bank into research aimed at the gate', () => {
    const none = bench(0);
    const banked = bench(6000);
    const aimNone = bestTechGoal(none.state, none.player);
    const aimBanked = bestTechGoal(banked.state, banked.player)!;
    expect(aimNone === null ? [] : researchExpansion(none.state, 0, aimNone)).not.toContain(GATE);
    expect(researchExpansion(banked.state, 0, aimBanked)).toContain(GATE);
  });
});
