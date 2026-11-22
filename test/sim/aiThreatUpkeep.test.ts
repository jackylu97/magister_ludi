/**
 * **Batch BP1 of bot pass 3: the threat count and the soldiers a seat can pay
 * for.** The spec is `docs/flags.md` item (ooooooo), entries P1 and P2; the
 * audit is `docs/audit/bot-pass-3-competitiveness.md` §3.1 and §3.2.
 *
 * Pinned here:
 *
 *   - P1: a peaceful neighbour's army beside a town counts at a share scaled by
 *     that neighbour's lean toward a war, so it no longer drives soldier builds;
 *     the same army at war counts in full and the town arms; an empty town still
 *     trains its one defender;
 *   - P2: a broke seat does not train a soldier its gold cannot pay for, and
 *     does not disband a unit it raised in the last ten turns unless its
 *     treasury is about to run out; gold is dearer while the levy waits on the
 *     income; a seat reads its books once a turn, however many decisions it
 *     makes.
 */
import { describe, expect, it } from 'vitest';

import { AI } from '../../src/ai/aiConfig';
import { armySupport, soldiersCarried } from '../../src/ai/armySupport';
import {
  type BotSitting,
  chooseProduction,
  nextBotDecision,
  valueContext,
} from '../../src/ai/bot';
import { declarationLean } from '../../src/ai/diplomacy';
import { markMusterTurn, musterRollSize, raisedWithin } from '../../src/ai/musterRoll';
import { createBotStepper } from '../../src/ai/stepper';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type City, type GameState, type Player, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { isCombatant, unitDef } from '../../src/sim/unitData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { createGame, newGame } from './newGameHelpers';
import { rosterFor } from '../../src/ui/gameSetup';

/** A blank grassland board with two seats and no wild: a claim is about one town. */
function bench(): GameState {
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
  state.turn = 50;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function seat(state: GameState, id: number): Player {
  return playerById(state, id)!;
}

/** A grown town for seat 0 at (6, 6), with one warrior holding it. */
function homeTown(state: GameState, gold = 200): City {
  const city = foundCityAt(state, 0, at(state.map, 6, 6));
  city.population = 5;
  refreshCityDerived(state, city);
  createUnit(state, 0, 'warrior', city.col, city.row);
  seat(state, 0).gold = gold;
  return city;
}

function isSoldierItem(item: { kind: string; id: string } | null): boolean {
  return item !== null && item.kind === 'unit' && isCombatant(unitDef(item.id as 'warrior'));
}

describe('P1: the threat count weighs a peaceful army by its owner’s lean', () => {
  /**
   * Seat 0 holds a town, its garrison and three warriors in the field. Seat 1,
   * at peace, has a far town and six warriors standing two hexes from seat 0's
   * town. The old count read six enemy pieces near a town.
   */
  function neighbourAtTheGate(): { state: GameState; city: City } {
    const state = bench();
    const city = homeTown(state);
    // Both cases use the same established town with its opening buildings finished.
    city.buildings.push('granary', 'hallOfDeeds');
    refreshCityDerived(state, city);
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 3, 3 + i);
    const far = foundCityAt(state, 1, at(state.map, 24, 6));
    refreshCityDerived(state, far);
    createUnit(state, 1, 'warrior', far.col, far.row);
    for (let i = 0; i < 6; i++) createUnit(state, 1, 'warrior', city.col + 2, city.row - 3 + i);
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, city };
  }

  it('reads the neighbour’s lean off its own declaration and counts its pieces at a share of one', () => {
    const { state } = neighbourAtTheGate();
    const lean = declarationLean(state, seat(state, 1), seat(state, 0));
    expect(lean).toBeGreaterThan(0);
    expect(lean).toBeLessThan(1);
    const threat = valueContext(state, seat(state, 0)).threat;
    expect(threat).toBeCloseTo(6 * AI.threat.peaceShare * lean, 9);
    expect(threat).toBeLessThan(1);
  });

  it('no longer builds a soldier because a peaceful army stands beside the town', () => {
    const { state, city } = neighbourAtTheGate();
    expect(isSoldierItem(chooseProduction(state, seat(state, 0), city))).toBe(false);
  });

  it('counts the same army in full at war, and arms', () => {
    const { state, city } = neighbourAtTheGate();
    openWar(state, 0, 1);
    bumpRevision(state);
    expect(valueContext(state, seat(state, 0)).threat).toBe(6);
    expect(chooseProduction(state, seat(state, 0), city)).toEqual({ kind: 'unit', id: 'warrior' });
  });

  it('still trains the one defender of an empty town', () => {
    const { state, city } = neighbourAtTheGate();
    // Every piece of seat 0 off the board, and the treasury empty, so neither
    // the threat nor the books argue for a soldier: only the floor does.
    state.units = state.units.filter((unit) => unit.ownerId !== 0);
    seat(state, 0).gold = 0;
    bumpRevision(state);
    expect(isSoldierItem(chooseProduction(state, seat(state, 0), city))).toBe(true);
  });
});

describe('P2: a broke seat does not build what it would disband', () => {
  /**
   * Seat 0 with its town, its garrison, and warriors in the field until its
   * books read under nought. Seat 1 has no pieces, so nothing threatens.
   */
  function bleeding(gold: number): { state: GameState; city: City; net: number } {
    const state = bench();
    const city = homeTown(state, gold);
    let net = foldEmpireRates(state, 0).goldPerTurn;
    for (let i = 0; net >= 0 && i < 20; i++) {
      createUnit(state, 0, 'warrior', 2 + (i % 4), 2 + Math.floor(i / 4));
      bumpRevision(state);
      net = foldEmpireRates(state, 0).goldPerTurn;
    }
    expect(net).toBeLessThan(0);
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, city, net };
  }

  it('forecasts no soldier it can pay for, and refuses one in the build table', () => {
    const { state, city } = bleeding(AI.solvency.arrearsTreasury + 5);
    const player = seat(state, 0);
    const ctx = valueContext(state, player);
    const support = armySupport(state, player, AI, ctx.books, city);
    expect(support.threat).toBeNull();
    expect(soldiersCarried(support, 1, AI)).toBeLessThan(1);
    expect(isSoldierItem(chooseProduction(state, player, city))).toBe(false);
  });

  it('trains it once the treasury can carry the wage', () => {
    const { state, city } = bleeding(5000);
    const player = seat(state, 0);
    const ctx = valueContext(state, player);
    expect(soldiersCarried(armySupport(state, player, AI, ctx.books, city), 1, AI)).toBeGreaterThanOrEqual(1);
  });

  it('at war trains past the disband line, but not into a treasury that runs out', () => {
    // A war is a real threat, so the line moves to the guard's own exception:
    // the treasury must not reach nought within `recruitRunwayTurns` turns.
    const { state, city } = bleeding(AI.solvency.arrearsTreasury + 5);
    const player = seat(state, 0);
    openWar(state, 0, 1);
    bumpRevision(state);
    const books = valueContext(state, player).books;
    const war = armySupport(state, player, AI, books, city);
    expect(war.threat).toMatch(/at war/);
    expect(soldiersCarried(war, 1, AI)).toBeGreaterThanOrEqual(1);
    player.gold = 0;
    bumpRevision(state);
    const broke = armySupport(state, player, AI, valueContext(state, player).books, city);
    expect(soldiersCarried(broke, 1, AI)).toBeLessThan(1);
    expect(isSoldierItem(chooseProduction(state, player, city))).toBe(false);
  });

  it('does not disband a unit it raised in the last ten turns while the treasury lasts', () => {
    // The books are headed into arrears inside the runway, but the treasury
    // does not reach nought within `recruitRunwayTurns`: every spare is new, so
    // none is let go.
    const { state, net } = bleeding(0);
    const player = seat(state, 0);
    // The roll's mark is written before the spares are raised, so all of them
    // are new: the bench's warriors were made before it, and are moved to the
    // town's own hex, where the garrison guard keeps all but the spares.
    state.units = state.units.filter((unit) => unit.ownerId !== 0 || unit.col === 6);
    state.turn = 45;
    markMusterTurn(state);
    state.turn = 50;
    const spares = [];
    for (let i = 0; i < 6; i++) spares.push(createUnit(state, 0, 'warrior', 2 + i, 10));
    player.gold = AI.solvency.arrearsTreasury;
    bumpRevision(state);
    const now = foldEmpireRates(state, 0).goldPerTurn;
    expect(now).toBeLessThan(0);
    expect(player.gold + now * AI.solvency.recruitRunwayTurns).toBeGreaterThanOrEqual(0);
    for (const unit of spares) expect(raisedWithin(state, unit, AI.solvency.keepRecruitsTurns)).toBe(true);
    void net;
    const decision = nextBotDecision(state, 0);
    expect(decision?.command.type).not.toBe('disbandUnit');
  });

  it('at war keeps even its old units until the treasury would run out', () => {
    // The build arm trains past the disband line under a real threat, so the
    // disband arm reads the same line then: the treasury reaching nought within
    // `recruitRunwayTurns` turns. The spares here are old (no mark of the roll
    // is later than them), so only the war keeps them.
    const { state } = bleeding(AI.solvency.arrearsTreasury);
    const player = seat(state, 0);
    for (let i = 0; i < 6; i++) createUnit(state, 0, 'warrior', 2 + i, 10);
    bumpRevision(state);
    const net = foldEmpireRates(state, 0).goldPerTurn;
    expect(player.gold + net * AI.solvency.recruitRunwayTurns).toBeGreaterThanOrEqual(0);
    const quiet = nextBotDecision(state, 0);
    expect(quiet?.command.type).toBe('disbandUnit');
    openWar(state, 0, 1);
    bumpRevision(state);
    expect(nextBotDecision(state, 0)?.command.type).not.toBe('disbandUnit');
  });

  it('lets a new unit go once the treasury would run out within a few turns', () => {
    const { state } = bleeding(0);
    const player = seat(state, 0);
    state.units = state.units.filter((unit) => unit.ownerId !== 0 || unit.col === 6);
    state.turn = 45;
    markMusterTurn(state);
    state.turn = 50;
    for (let i = 0; i < 6; i++) createUnit(state, 0, 'warrior', 2 + i, 10);
    player.gold = 1;
    bumpRevision(state);
    const decisions = [];
    for (let guard = 0; guard < 10; guard++) {
      const decision = nextBotDecision(state, 0);
      if (decision === null) break;
      decisions.push(decision.command.type);
      if (decision.command.type === 'disbandUnit') break;
      // Anything else the seat says first is spent so the next ask is the books.
      if (decision.command.type === 'endTurn') break;
      state.units.forEach((unit) => {
        if (unit.ownerId === 0) unit.movesLeft = 0;
      });
      bumpRevision(state);
    }
    expect(decisions).toContain('disbandUnit');
  });
});

describe('P2: gold is dearer while the levy waits on the income', () => {
  it('holds an army wage row, and a coin is worth more for it', () => {
    // A town whose levy is short (one soldier against the two a town wants)
    // and whose books cannot pay a second: the treasury on the arrears bar.
    const state = bench();
    homeTown(state, AI.solvency.arrearsTreasury);
    recomputeAllVisibility(state);
    bumpRevision(state);
    const ctx = valueContext(state, seat(state, 0));
    const row = ctx.wants.gold.find((want) => want.holding === 'army');
    expect(row).toBeDefined();
    expect(row!.worth).toBeGreaterThan(0);
    // The same board with a treasury that pays the levy: no wage row.
    seat(state, 0).gold = 5000;
    bumpRevision(state);
    const rich = valueContext(state, seat(state, 0));
    expect(rich.wants.gold.some((want) => want.holding === 'army')).toBe(false);
    // And the coin of the seat the levy is waiting on is dearer.
    expect(ctx.prices.gold).toBeGreaterThan(rich.prices.gold);
    expect(ctx.priceNotes.gold).toContain('the levy wants');
  });
});

describe('P2: the books are read once a turn', () => {
  it('reads netGoldPerTurn once per seat per turn, however many decisions it makes', () => {
    const roster = rosterFor(2).map((spec) => ({ ...spec, isHuman: false }));
    const game = createGame({ seed: 5, sizeName: 'duel', players: roster, barbarians: true });
    const sittings: { playerId: number; turn: number; sitting: BotSitting }[] = [];
    const decisions = new Map<string, number>();
    const stepper = createBotStepper(game, {
      warn: () => {},
      decide: (state, playerId, sitting) => {
        const key = `${state.turn}:${playerId}`;
        decisions.set(key, (decisions.get(key) ?? 0) + 1);
        if (sitting !== undefined && !sittings.some((entry) => entry.sitting === sitting)) {
          sittings.push({ playerId, turn: state.turn, sitting });
        }
        return nextBotDecision(state, playerId, sitting);
      },
    });
    for (let turn = 0; turn < 12; turn++) stepper.playTurn();
    expect(sittings.length).toBeGreaterThanOrEqual(20);
    let busy = 0;
    for (const entry of sittings) {
      expect(entry.sitting.booksRead).toBe(1);
      if ((decisions.get(`${entry.turn}:${entry.playerId}`) ?? 0) > 3) busy += 1;
    }
    // The claim is about turns with many decisions in them.
    expect(busy).toBeGreaterThan(0);
    // The roll took one mark a turn.
    expect(musterRollSize(game.state)).toBe(12);
  });
});
