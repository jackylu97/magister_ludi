/**
 * **The rates a rider is priced at** (bot batch BP4, `docs/flags.md` (ooooooo)
 * B2, with the user's addition: *"the bonuses towards killing should probably
 * factor in the bot's inclination to go to war"*).
 *
 * A rider is priced at the full value of one firing times the rate its moment
 * comes round (`scoreWindfallRider`, `src/ai/value.ts`). The full value is
 * pinned beside each shape's own test. This file pins the rates the batch
 * changed:
 *
 *   - a kill is the wild at the seat's own record, plus the seat's kill pace at
 *     war times its intent: 1 at war, and at peace its lean toward a war times
 *     `score.warPace.leanShare`;
 *   - the kill pace at war is the rival pieces it killed in the recent window,
 *     never below `score.warPace.killsPerSoldier` for each soldier spare of its
 *     garrisons;
 *   - a capture is the town pace at war times the intent, and reads no threat;
 *   - a death is the seat's own record, or its recent losses when higher;
 *   - a rider that names a piece, a kill of the wild, or a once-a-turn limit
 *     narrows the rate;
 *   - a building finished reads the recent window too, without a town's
 *     founding gifts or what it held before it was taken.
 *
 * Every rate is read through a rider that pays one gold, so the price over the
 * gold price is the rate itself.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { type ValueContext, scoreEffects, stampSight, explainCardStamp, explainCardEffects } from '../../src/ai/value';
import { voiceWeight } from '../../src/ai/prices';
import aiJson from '../../data/ai.json';

import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import {
  type City,
  type GameState,
  type Player,
  type WarLoss,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import type { CardEffect } from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';
import { lendCardEffects } from './aiCardStampHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const PACE = aiJson.score.warPace;
const RECENT = aiJson.score.recentTurns;

/** A blank board with two seats and nothing on it: `aiAppraisal`'s bench. */
function bench(persona?: string): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', ...(persona === undefined ? {} : { persona }) },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 24, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(24 * 12).fill(null);
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

/**
 * Seat 0 with one town and `soldiers` warriors standing in it, so the town's
 * one garrison leaves `soldiers − 1` spare; seat 1 with one town and no army.
 * Turn 40.
 */
function board(soldiers: number, persona?: string): { state: GameState; player: Player; home: City } {
  const state = bench(persona);
  const home = foundCityAt(state, 0, at(state.map, 4, 5));
  home.population = 6;
  foundCityAt(state, 1, at(state.map, 18, 5)).population = 6;
  for (let index = 0; index < soldiers; index++) createUnit(state, 0, 'warrior', 4, 5);
  state.turn = 40;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: seat(state, 0), home };
}

function war(state: GameState): void {
  state.wars.push({ a: 0, b: 1, declaredTurn: state.turn - 1 });
  bumpRevision(state);
}

/** Losses on `loser`'s list, each to `by`, on these turns. */
function losses(state: GameState, loser: number, by: number, kind: WarLoss['kind'], turns: number[]): void {
  const player = seat(state, loser);
  player.warLosses = [...(player.warLosses ?? []), ...turns.map((turn) => ({ turn, by, kind }))];
  bumpRevision(state);
}

/** The rate of a moment, read through a rider that pays one gold on it. */
function rate(ctx: ValueContext, occasion: string, extra: Record<string, unknown> = {}): number {
  const rider = { kind: 'windfallRider', occasion, grant: { yield: 'gold', amount: 1 }, ...extra } as CardEffect;
  return scoreEffects([rider], ctx) / voiceWeight(ctx, 'gold');
}

/** The seat's own record over the turns played, never below the table's figure over the horizon. */
function recordPace(record: number, forecast: number, turn: number): number {
  return Math.max(record / turn, forecast / HORIZON);
}

describe('a kill rider follows the seat’s war plans', () => {
  it('reads the wild at the seat’s record, and rivals at its army’s pace times its intent', () => {
    const { state, player } = board(6);
    player.enemiesKilled = 12;
    bumpRevision(state);
    const peace = valueContext(state, player);
    // The wild's half: twelve kills, none of them a rival's, over forty turns.
    const wild = recordPace(12, aiJson.score.tallyForecast.barbarianKill, 40);
    expect(wild).toBeCloseTo(12 / 40, 10);
    expect(rate(peace, 'kill', { vsBarbarians: true })).toBeCloseTo(wild, 10);
    // Five soldiers spare of the one garrison; the rival has no army, so the
    // seat leans fully toward a war, and at peace a lean counts at its share.
    expect(peace.warOutlook).toMatchObject({ atWar: false, lean: 1, spare: 5, kills: 0 });
    const atWarPace = 5 * PACE.killsPerSoldier;
    expect(rate(peace, 'kill')).toBeCloseTo(wild + PACE.leanShare * atWarPace, 10);
    // At war the intent is whole.
    war(state);
    const fighting = valueContext(state, player);
    expect(rate(fighting, 'kill')).toBeCloseTo(wild + atWarPace, 10);
    expect(rate(fighting, 'kill')).toBeGreaterThan(rate(peace, 'kill'));
  });

  it('prices a seat that will not go to war near the wild’s half alone', () => {
    // A tall seat's bar cannot be reached, so its lean is a tenth of the
    // balanced seat's whole lean, against a rival with no army at all.
    const tall = board(6, 'tall');
    const balanced = board(6);
    const calm = valueContext(tall.state, tall.player);
    expect(calm.warOutlook.lean).toBeLessThan(0.2);
    expect(rate(calm, 'kill')).toBeLessThan(rate(valueContext(balanced.state, balanced.player), 'kill'));
    // Attacked, it is at war, and its army fights.
    war(tall.state);
    const attacked = valueContext(tall.state, tall.player);
    expect(rate(attacked, 'kill')).toBeCloseTo(
      rate(attacked, 'kill', { vsBarbarians: true }) + 5 * PACE.killsPerSoldier,
      10,
    );
  });

  it('reads the recent fighting off the war losses, inside the window only', () => {
    const { state, player } = board(6);
    war(state);
    // Ten of the rival's pieces fell to this seat inside the window, and two
    // long before it.
    losses(state, 1, 0, 'unit', [21, 22, 30, 31, 32, 33, 34, 35, 36, 39, 5, 10]);
    const ctx = valueContext(state, player);
    expect(ctx.warOutlook.kills).toBeCloseTo(10 / RECENT, 10);
    // That is above the army's floor, so it is the pace at war.
    expect(10 / RECENT).toBeGreaterThan(5 * PACE.killsPerSoldier);
    expect(rate(ctx, 'kill') - rate(ctx, 'kill', { vsBarbarians: true })).toBeCloseTo(10 / RECENT, 10);
  });
});

describe('a capture rider follows the same war', () => {
  it('reads the towns taken, or the kill pace at war in towns, times the intent', () => {
    const { state, player } = board(6, 'tall');
    // At peace a tall seat takes almost nothing.
    expect(rate(valueContext(state, player), 'capture')).toBeLessThan(1e-3);
    war(state);
    const ctx = valueContext(state, player);
    expect(rate(ctx, 'capture')).toBeCloseTo(5 * PACE.killsPerSoldier * PACE.townsPerKill, 10);
    // A town taken in the window is a faster pace than the kills say.
    losses(state, 1, 0, 'town', [35]);
    expect(rate(valueContext(state, player), 'capture')).toBeCloseTo(1 / RECENT, 10);
  });

  it('reads no threat, which is danger at this seat’s towns and not its own conquest', () => {
    const { state, player } = board(6);
    const ctx = valueContext(state, player);
    const tense: ValueContext = { ...ctx, threat: 12 };
    expect(rate(tense, 'capture')).toBe(rate(ctx, 'capture'));
    expect(rate(tense, 'kill')).toBe(rate(ctx, 'kill'));
  });
});

describe('a death rider reads the seat’s losses', () => {
  it('reads the record, or the recent losses to rivals when they run higher', () => {
    const { state, player } = board(2);
    player.unitsLost = 4;
    bumpRevision(state);
    expect(rate(valueContext(state, player), 'death')).toBeCloseTo(
      recordPace(4, aiJson.score.tallyForecast.unitLost, 40),
      10,
    );
    // A young record is held up by the table: no loss yet reads its figure.
    player.unitsLost = 0;
    bumpRevision(state);
    expect(rate(valueContext(state, player), 'death')).toBeCloseTo(
      aiJson.score.tallyForecast.unitLost / HORIZON,
      10,
    );
    player.unitsLost = 4;
    bumpRevision(state);
    losses(state, 0, 1, 'unit', [30, 31, 32, 33, 34, 35, 36, 37]);
    expect(rate(valueContext(state, player), 'death')).toBeCloseTo(8 / RECENT, 10);
  });
});

describe('a rider narrowed to a piece, a foe or a turn', () => {
  it('reads a kill by a ship at the share of the army that sails', () => {
    const { state, player } = board(6);
    war(state);
    const ctx = valueContext(state, player);
    // Letters of Marque's narrowing: no warship, so no such kill.
    expect(rate(ctx, 'kill', { class: { category: 'naval' } })).toBe(0);
    // A warrior rider reads the whole army, which is all warriors.
    expect(rate(ctx, 'kill', { class: { type: 'warrior' } })).toBeCloseTo(rate(ctx, 'kill'), 10);
  });

  it('caps a once-a-turn rider at one firing a turn, and a once-in-ten at one in ten', () => {
    const { state, player } = board(6);
    war(state);
    const turns = Array.from({ length: 40 }, (_, index) => 21 + (index % 19));
    losses(state, 1, 0, 'unit', turns);
    const ctx = valueContext(state, player);
    expect(rate(ctx, 'kill')).toBeGreaterThan(1);
    expect(rate(ctx, 'kill', { oncePerTurn: true })).toBe(1);
    expect(rate(ctx, 'kill', { oncePerTurns: 10 })).toBeCloseTo(0.1, 10);
  });
});

describe('a building rider reads the recent window too', () => {
  it('counts what went up lately in this seat’s hands, and not a founding gift or a taken town’s past', () => {
    const { state, player, home } = board(1);
    state.turn = 80;
    const ids = ['monument', 'granary', 'shrine', 'library', 'barracks', 'palisade'] as const;
    home.buildings = [...home.buildings, ...(ids as unknown as never[])];
    home.buildingTurns = { ...(home.buildingTurns ?? {}) };
    // A gift of the founding turn, and five raised inside the window.
    home.buildingTurns.monument = home.foundedTurn;
    for (const [index, id] of ids.slice(1).entries()) home.buildingTurns[id] = 70 + index;
    bumpRevision(state);
    const whole = home.buildings.length / 80;
    expect(whole).toBeLessThan(2 / RECENT);
    expect(rate(valueContext(state, player), 'buildingCompletion')).toBeCloseTo(5 / RECENT, 10);
    // Taken on turn 72: what stood before is the old owner's pace.
    home.capturedOn = 72;
    bumpRevision(state);
    expect(rate(valueContext(state, player), 'buildingCompletion')).toBeCloseTo(2 / RECENT, 10);
  });
});


describe('war-loss relief in a card appraisal', () => {
  it.each(['unit', 'town'] as const)('counts existing %s losses through the stamp only', kind => {
    const { state, player } = board(3);
    war(state);
    losses(state, 0, 1, kind, [38, 39, 40]);
    const effect: CardEffect = {
      kind: 'rulePercent',
      rule: kind === 'unit' ? 'unitLossWeariness' : 'townLossWeariness',
      percent: -50,
    };
    const restore = lendCardEffects('theGloriousDead', [effect]);
    try {
      const ctx = valueContext(state, player);
      const stamp = explainCardStamp(ctx, 'theGloriousDead');
      expect(stampSight(effect)).toBe('books');
      expect(stamp?.total).toBeGreaterThan(0);
      expect(explainCardEffects('theGloriousDead', [effect], ctx, 'stamp').total)
        .toBeCloseTo(stamp!.total, 9);
    } finally {
      restore();
    }
  });
});
