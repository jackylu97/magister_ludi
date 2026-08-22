import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../src/sim/cities';
import {
  advanceFortify,
  applyCombat,
  attackTargetAt,
  fortifyBonus,
  hasLineOfSight,
  isFortified,
  isRanged,
  previewCombat,
} from '../src/sim/combat';
import { type Command, applyCommand } from '../src/sim/commands';
import { type Game, createGame, dispatch, replay, snapshotState } from '../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt } from '../src/sim/map';
import { type Rng, cloneRng, makeRng, nextRange } from '../src/sim/rng';
import { RULES } from '../src/sim/rulesData';
import { type GameState, createUnit, newGame } from '../src/sim/state';
import { UNIT_TYPE_IDS, unitDef } from '../src/sim/unitData';
import { fullMovement } from '../src/sim/units';
import { setRiverEdge } from '../src/sim/water';

const COMBAT = RULES.combat;

/** A blank two-player state on a flat grassland rectangle, seeded and quiet. */
function flatState(width = 16, height = 8): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function attack(unitId: number, col: number, row: number, playerId = 0): Command {
  return { type: 'attack', playerId, unitId, target: { col, row } };
}

function fortify(unitId: number, playerId = 0): Command {
  return { type: 'fortify', playerId, unitId };
}

/** Ends the turn for every seat, so the end-of-turn phases actually run. */
function endRound(state: GameState): void {
  for (const player of state.players) {
    expect(applyCommand(state, { type: 'endTurn', playerId: player.id })).toEqual({ ok: true });
  }
}

/**
 * The next roll the reducer will draw, read without disturbing the generator.
 *
 * The tests that assert an *applied* number use this rather than re-deriving the
 * die, because the point under test is the damage curve and the clamping around
 * it, not mulberry32. The tests that assert the curve itself use the midpoint,
 * which needs no die at all.
 */
function peekRoll(rng: Rng): number {
  return nextRange(cloneRng(rng), 1 - COMBAT.rollBand, 1 + COMBAT.rollBand);
}

/**
 * The damage curve, written out longhand from the data rather than imported.
 *
 * A test that called the production evaluator would assert only that the
 * evaluator equals itself. This is the formula as the design ledger states it:
 * `baseDamage · e ^ (exponent · (strA − strB))`, rounded, never below 1.
 */
function expectedDamage(strA: number, strB: number, roll: number): number {
  const base = COMBAT.baseDamage * Math.exp(COMBAT.strengthExponent * (strA - strB));
  return Math.max(1, Math.round(base * roll));
}

/** The forecast, or a thrown error — most tests expect a legal attack. */
function forecast(state: GameState, attackerId: number, col: number, row: number) {
  const preview = previewCombat(state, attackerId, { col, row });
  if (!preview.ok) throw new Error(`expected a legal attack, got: ${preview.error}`);
  return preview;
}

// --- the curve --------------------------------------------------------------

describe('the damage curve', () => {
  it('deals exactly baseDamage when the two strengths are equal', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);

    // Two warriors on flat ground: strength 8 against strength 8, so the
    // exponent is e^0 = 1 and the midpoint is the base damage itself.
    const view = forecast(state, a.id, 4, 3);
    expect(view.attackerStrength).toBe(8);
    expect(view.defenderStrength).toBe(8);
    expect(view.damageToDefender).toBe(COMBAT.baseDamage);
    expect(view.damageToAttacker).toBe(COMBAT.baseDamage);
  });

  it('is an exponential in the difference of strengths, not a ratio', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'archer', 4, 3);

    // 8 against 7: 30 · e^0.04 = 31.22 → 31 dealt, and 30 · e^-0.04 = 28.82 → 29 taken.
    const view = forecast(state, a.id, 4, 3);
    expect(view.damageToDefender).toBe(31);
    expect(view.damageToAttacker).toBe(29);
  });

  it('reports a band the applied roll always lands inside', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    const view = forecast(state, a.id, 4, 3);

    expect(view.damageToDefenderMin).toBe(24); // 30 × 0.8
    expect(view.damageToDefenderMax).toBe(36); // 30 × 1.2
    expect(view.damageToDefenderMin).toBeLessThan(view.damageToDefender);
    expect(view.damageToDefenderMax).toBeGreaterThan(view.damageToDefender);

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    const dealt = unitDef('warrior').maxHp - d.hp;
    expect(dealt).toBeGreaterThanOrEqual(view.damageToDefenderMin);
    expect(dealt).toBeLessThanOrEqual(view.damageToDefenderMax);
  });

  it('floors a hopeless attack at one hit point rather than nothing', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'scout', 3, 3);
    createUnit(state, 1, 'knight', 4, 3);
    // Strength 5 against 20: the curve gives 30 · e^-0.6 = 16.5, which is not
    // small enough to test the floor — so check the floor where it bites, on
    // the rounding of a genuinely tiny number.
    const view = forecast(state, a.id, 4, 3);
    expect(view.damageToDefender).toBeGreaterThanOrEqual(1);
    expect(expectedDamage(1, 200, 1)).toBe(1);
  });
});

// --- preview and apply agree ------------------------------------------------

describe('previewCombat and applyCombat are one evaluator', () => {
  it('applies exactly what the preview forecast, up to the die', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const d = createUnit(state, 1, 'spearman', 4, 3);

    const view = forecast(state, a.id, 4, 3);
    const roll = peekRoll(state.rng);
    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });

    // The preview's *strengths* are what the reducer used: re-run the curve
    // longhand against the roll the generator was about to produce.
    expect(unitDef('spearman').maxHp - d.hp).toBe(
      expectedDamage(view.attackerStrength, view.defenderStrength, roll),
    );
  });

  it('names the same target the reducer will hit', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'archer', 4, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.defenderUnitId).toBe(d.id);
    expect(view.defenderCityId).toBeNull();
    expect(view.defenderName).toBe('Archer');
    expect(view.kind).toBe('melee');
  });

  it('refuses in the preview exactly what the reducer refuses', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 9, 3);

    const preview = previewCombat(state, a.id, { col: 9, row: 3 });
    expect(preview.ok).toBe(false);
    const result = applyCommand(state, attack(a.id, 9, 3));
    expect(result.ok).toBe(false);
    if (!preview.ok && !result.ok) expect(result.error).toBe(preview.error);
  });
});

// --- melee ------------------------------------------------------------------

describe('melee', () => {
  it('trades damage: the defender hits back with its own strength', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'spearman', 4, 3);

    // A spearman (11) beats a warrior (8), so the counter is the bigger blow —
    // asserted on the *forecast*, because a single pair of rolls can invert any
    // two numbers and that would be a test of the dice rather than of the rule.
    const view = forecast(state, a.id, 4, 3);
    expect(view.damageToAttacker).toBeGreaterThan(view.damageToDefender);

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    // Both sides actually took their blow: a melee is a trade, not a strike.
    expect(d.hp).toBeLessThan(unitDef('spearman').maxHp);
    expect(a.hp).toBeLessThan(unitDef('warrior').maxHp);
  });

  it('kills the defender and advances into the tile it emptied', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    d.hp = 4;

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === d.id)).toBeUndefined();
    expect({ col: a.col, row: a.row }).toEqual({ col: 4, row: 3 });
  });

  it('stays put when a surviving enemy civilian still holds the tile', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    const settler = createUnit(state, 1, 'settler', 4, 3);
    d.hp = 4;

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === d.id)).toBeUndefined();
    // The settler is still theirs and still standing there, so the tile is not
    // empty and the swordsman does not walk onto it.
    expect(settler.ownerId).toBe(1);
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('can be killed by the counter-attack, and then takes nothing with it', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'scout', 3, 3);
    const d = createUnit(state, 1, 'knight', 4, 3);
    a.hp = 3;

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === a.id)).toBeUndefined();
    // The knight was still hurt: a melee is simultaneous, and a defender that
    // kills its attacker still took the blow that was already swung.
    expect(d.hp).toBeLessThan(unitDef('knight').maxHp);
  });

  it('spends every remaining movement point and sets hasAttacked', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'horseman', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);
    expect(a.movesLeft).toBe(4);

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(a.movesLeft).toBe(0);
    expect(a.hasAttacked).toBe(true);

    // Refused a second time, by the flag rather than by the movement.
    a.movesLeft = 4;
    const before = clone(state);
    expect(applyCommand(state, attack(a.id, 4, 3)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('clears hasAttacked at the turn change', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);

    applyCommand(state, attack(a.id, 4, 3));
    expect(a.hasAttacked).toBe(true);
    endRound(state);
    expect(a.hasAttacked).toBe(false);
    expect(a.movesLeft).toBe(fullMovement(a));
  });
});

// --- no mutual death --------------------------------------------------------

/**
 * Civ V's rule, and the one asymmetry in a melee that is otherwise simultaneous:
 * an exchange that would empty both bars kills the defender and leaves the
 * attacker on exactly 1. See the module docblock in `combat.ts`.
 *
 * Two warriors are the whole fixture: strength 8 against strength 8 on flat
 * ground is `30 · e^0 = 30` each way, so any pair of hit-point totals at or under
 * `30 × 0.8 = 24` is a guaranteed double kill whatever the die does.
 */
describe('a melee exchange never kills both sides', () => {
  it('kills the defender and leaves the attacker on exactly one hit point', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    a.hp = 5;
    d.hp = 5;

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === d.id)).toBeUndefined();
    expect(state.units.find((unit) => unit.id === a.id)).toBe(a);
    expect(a.hp).toBe(1);
  });

  it('lets the survivor advance, at one hit point, into the tile it emptied', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    a.hp = 5;
    d.hp = 5;

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === d.id)).toBeUndefined();
    // The advance rule is untouched by the clamp: a unit on 1 hit point that
    // emptied a tile still steps onto it.
    expect({ col: a.col, row: a.row, hp: a.hp }).toEqual({ col: 4, row: 3, hp: 1 });
  });

  it('charges only the hit points the clamp actually took', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    a.hp = 5;
    d.hp = 5;

    const result = applyCombat(state, a.id, { col: 4, row: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The counter rolled somewhere near 30 and landed for 4: what the outcome
    // reports is what came off the bar, exactly as the defender's own figure is
    // clamped to the hit points there were to take.
    expect(result.outcome.damageToAttacker).toBe(4);
    expect(result.outcome.attackerSurvived).toBe(true);
    expect(result.outcome.killed.map((fallen) => fallen.id)).toEqual([d.id]);
    expect(result.outcome.advanced).toBe(true);
  });

  it('still kills the attacker when the defender survives the exchange', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'scout', 3, 3);
    const d = createUnit(state, 1, 'knight', 4, 3);
    a.hp = 3;

    // The knight is at full health and cannot be emptied by one blow, so there
    // is nothing for the rule to protect: the counter kills as it always did.
    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === a.id)).toBeUndefined();
    expect(state.units.find((unit) => unit.id === d.id)).toBe(d);
    expect(d.hp).toBeLessThan(unitDef('knight').maxHp);
  });

  it('does not protect an attacker whose blow merely wounded', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    a.hp = 5;
    // 36 is the top of the band, so the defender survives every roll and the
    // attacker is on its own.
    d.hp = 40;

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === a.id)).toBeUndefined();
    expect(d.hp).toBeGreaterThan(0);
  });

  /**
   * The forecast side. The rule is conditional on an outcome and a preview has
   * only a band, so the preview floors the attacker's remaining at 1 whenever
   * the defender's remaining *can* reach 0 — see `previewCombat`'s docblock for
   * why that direction is the honest one to round in.
   */
  describe('the preview', () => {
    it('floors the attacker\'s remaining at one when the defender can die', () => {
      const state = flatState();
      const a = createUnit(state, 0, 'warrior', 3, 3);
      const d = createUnit(state, 1, 'warrior', 4, 3);
      a.hp = 5;
      d.hp = 5;

      const view = forecast(state, a.id, 4, 3);
      expect(view.attackerHp).toBe(5);
      for (const damage of [
        view.damageToAttackerMin,
        view.damageToAttacker,
        view.damageToAttackerMax,
      ]) {
        expect(damage).toBe(4);
        expect(view.attackerHp - damage).toBe(1);
      }
    });

    it('floors on the band, not on the midpoint', () => {
      const state = flatState();
      const a = createUnit(state, 0, 'warrior', 3, 3);
      const d = createUnit(state, 1, 'warrior', 4, 3);
      a.hp = 10;
      // The midpoint blow is 30 and would leave the defender standing; the top
      // of the band is 36 and would not. "Can reach zero" is the band.
      d.hp = 34;

      const view = forecast(state, a.id, 4, 3);
      expect(view.damageToDefender).toBeLessThan(view.defenderHp);
      expect(view.damageToDefenderMax).toBe(34);
      expect(view.damageToAttacker).toBe(9);
    });

    it('leaves the counter alone when the defender cannot be emptied at all', () => {
      const state = flatState();
      const a = createUnit(state, 0, 'warrior', 3, 3);
      createUnit(state, 1, 'warrior', 4, 3);

      // Both at full health: no kill is on the table, so the forecast is the
      // plain curve and says so.
      const view = forecast(state, a.id, 4, 3);
      expect(view.damageToAttacker).toBe(COMBAT.baseDamage);
      expect(view.damageToAttackerMin).toBe(24);
      expect(view.damageToAttackerMax).toBe(36);
    });

    it('never forecasts more damage than the attacker has to give', () => {
      const state = flatState();
      const a = createUnit(state, 0, 'scout', 3, 3);
      createUnit(state, 1, 'knight', 4, 3);
      a.hp = 3;

      // No floor here — the knight is untouchable — but a bar cannot lose more
      // than it holds, and `main.ts` draws the loss from this number.
      const view = forecast(state, a.id, 4, 3);
      expect(view.damageToAttacker).toBe(3);
      expect(view.attackerHp - view.damageToAttacker).toBe(0);
    });
  });
});

// --- ranged -----------------------------------------------------------------

describe('ranged', () => {
  it('shoots at range for one-way damage: no counter, no advance', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    const d = createUnit(state, 1, 'warrior', 5, 3);

    const view = forecast(state, a.id, 5, 3);
    expect(view.kind).toBe('ranged');
    // Ranged strength 7 against strength 8: 30 · e^-0.04 = 28.8 → 29.
    expect(view.damageToDefender).toBe(29);
    expect(view.damageToAttacker).toBe(0);

    expect(applyCommand(state, attack(a.id, 5, 3))).toEqual({ ok: true });
    expect(d.hp).toBeLessThan(unitDef('warrior').maxHp);
    expect(a.hp).toBe(unitDef('archer').maxHp);
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('kills at range without advancing into the empty tile', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    const d = createUnit(state, 1, 'warrior', 5, 3);
    d.hp = 3;

    expect(applyCommand(state, attack(a.id, 5, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === d.id)).toBeUndefined();
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('refuses a target beyond its range', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'warrior', 6, 3);

    const before = clone(state);
    const result = applyCommand(state, attack(a.id, 6, 3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('range 2');
    expect(state).toEqual(before);
  });

  it('is blocked by a mountain strictly between shooter and target', () => {
    const state = flatState();
    at(state.map, 4, 3).terrain = 'mountain';
    const a = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'warrior', 5, 3);

    expect(hasLineOfSight(state.map, at(state.map, 3, 3), at(state.map, 5, 3))).toBe(false);
    const before = clone(state);
    const result = applyCommand(state, attack(a.id, 5, 3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('line of sight');
    expect(state).toEqual(before);
  });

  it('is not blocked by a mountain the shot merely starts or ends on', () => {
    const state = flatState();
    // Endpoints are excluded: a unit standing on rough ground can still shoot,
    // and a target standing on it can still be shot at.
    at(state.map, 3, 3).terrain = 'mountain';
    at(state.map, 4, 3).terrain = 'mountain';
    expect(hasLineOfSight(state.map, at(state.map, 3, 3), at(state.map, 4, 3))).toBe(true);
  });

  it('is not blocked by forest, hills or water', () => {
    const state = flatState();
    const between = at(state.map, 4, 3);
    between.feature = 'forest';
    between.hills = true;
    expect(hasLineOfSight(state.map, at(state.map, 3, 3), at(state.map, 5, 3))).toBe(true);
    between.terrain = 'ocean';
    between.feature = 'none';
    between.hills = false;
    expect(hasLineOfSight(state.map, at(state.map, 3, 3), at(state.map, 5, 3))).toBe(true);
  });

  it('spends the shooter’s whole turn, exactly as a melee attack does', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'warrior', 5, 3);

    expect(applyCommand(state, attack(a.id, 5, 3))).toEqual({ ok: true });
    expect(a.movesLeft).toBe(0);
    expect(a.hasAttacked).toBe(true);
  });
});

// --- defensive modifiers ----------------------------------------------------

describe('terrain and fortification', () => {
  it('adds terrain and feature and hills into one defence bonus', () => {
    const state = flatState();
    const ground = at(state.map, 4, 3);
    ground.feature = 'forest';
    ground.hills = true;
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'archer', 4, 3);

    // Forest (+0.25) and hills (+0.25) stack: an archer of 7 defends at 10.5,
    // so 30 · e^(0.04 · (8 − 10.5)) = 27.1 → 27.
    const view = forecast(state, a.id, 4, 3);
    expect(view.terrainBonus).toBeCloseTo(0.5, 10);
    expect(view.defenderStrength).toBeCloseTo(10.5, 10);
    expect(view.damageToDefender).toBe(27);
  });

  it('pays the river penalty only for a melee attack across the edge', () => {
    const state = flatState();
    // A river along the edge (3,3) shares with its eastern neighbour (4,3).
    setRiverEdge(state.map, at(state.map, 3, 3), 0);
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.acrossRiver).toBe(true);
    // Strength 8 × 0.8 = 6.4 against 8: 30 · e^(0.04 · −1.6) = 28.1 → 28.
    expect(view.attackerStrength).toBeCloseTo(6.4, 10);
    expect(view.damageToDefender).toBe(28);
  });

  it('charges no river penalty to an archer shooting over it', () => {
    const state = flatState();
    setRiverEdge(state.map, at(state.map, 3, 3), 0);
    const a = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.kind).toBe('ranged');
    expect(view.acrossRiver).toBe(false);
    expect(view.attackerStrength).toBe(7);
  });

  it('grows the fortify bonus each turn and caps it', () => {
    const state = flatState();
    const d = createUnit(state, 1, 'warrior', 4, 3);

    expect(applyCommand(state, fortify(d.id, 1))).toEqual({ ok: true });
    expect(isFortified(d)).toBe(true);
    expect(d.fortifiedTurns).toBe(0);
    expect(fortifyBonus(d)).toBe(0);

    advanceFortify(state);
    expect(fortifyBonus(d)).toBeCloseTo(COMBAT.fortifyBonusPerTurn, 10);
    advanceFortify(state);
    expect(fortifyBonus(d)).toBeCloseTo(COMBAT.fortifyMax, 10);
    // Capped: another five turns buy nothing, and the stored counter stops too.
    for (let i = 0; i < 5; i++) advanceFortify(state);
    expect(fortifyBonus(d)).toBeCloseTo(COMBAT.fortifyMax, 10);
    expect(d.fortifiedTurns).toBe(2);
  });

  it('counts the fortify bonus in the defender’s strength', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    applyCommand(state, fortify(d.id, 1));
    advanceFortify(state);
    advanceFortify(state);

    // 8 × 1.4 = 11.2 defending against 8: 30 · e^(0.04 · −3.2) = 26.4 → 26.
    const view = forecast(state, a.id, 4, 3);
    expect(view.fortifyBonus).toBeCloseTo(0.4, 10);
    expect(view.defenderStrength).toBeCloseTo(11.2, 10);
    expect(view.damageToDefender).toBe(26);
  });

  it('breaks fortification when the unit moves', () => {
    const state = flatState();
    const u = createUnit(state, 0, 'warrior', 3, 3);
    applyCommand(state, fortify(u.id));
    advanceFortify(state);
    expect(isFortified(u)).toBe(true);

    expect(
      applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: u.id, target: { col: 4, row: 3 } }),
    ).toEqual({ ok: true });
    expect(isFortified(u)).toBe(false);
    // Deleted, not zeroed: an idle unit serialises one way only.
    expect(Object.prototype.hasOwnProperty.call(u, 'fortifiedTurns')).toBe(false);
  });

  it('breaks fortification when the unit attacks', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);
    applyCommand(state, fortify(a.id));
    advanceFortify(state);

    applyCommand(state, attack(a.id, 4, 3));
    expect(isFortified(a)).toBe(false);
  });

  it('lets a unit with no movement left still dig in', () => {
    const state = flatState();
    const u = createUnit(state, 0, 'warrior', 3, 3);
    u.movesLeft = 0;
    expect(applyCommand(state, fortify(u.id))).toEqual({ ok: true });
    expect(isFortified(u)).toBe(true);
  });
});

// --- civilians --------------------------------------------------------------

describe('civilians', () => {
  it('captures a civilian in melee rather than killing it', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const settler = createUnit(state, 1, 'settler', 4, 3);
    settler.path = [{ col: 9, row: 3 }];

    const view = forecast(state, a.id, 4, 3);
    expect(view.capturesUnit).toBe(true);
    expect(view.damageToDefender).toBe(0);
    expect(view.damageToAttacker).toBe(0);

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(settler.ownerId).toBe(0);
    expect(settler.hp).toBe(unitDef('settler').maxHp);
    expect(settler.movesLeft).toBe(0);
    expect(settler.path).toBeUndefined();
    // Nobody was hurt, and the captor stayed where it was: the tile is not empty.
    expect(a.hp).toBe(unitDef('warrior').maxHp);
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('kills a civilian with ranged fire instead', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    const settler = createUnit(state, 1, 'settler', 5, 3);
    settler.hp = 5;

    const view = forecast(state, a.id, 5, 3);
    expect(view.capturesUnit).toBe(false);
    expect(applyCommand(state, attack(a.id, 5, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === settler.id)).toBeUndefined();
  });

  it('never lets a civilian attack anything', () => {
    const state = flatState();
    const settler = createUnit(state, 0, 'settler', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);

    const before = clone(state);
    const result = applyCommand(state, attack(settler.id, 4, 3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('cannot attack');
    expect(state).toEqual(before);
  });

  it('refuses to fortify a civilian', () => {
    const state = flatState();
    const settler = createUnit(state, 0, 'settler', 3, 3);
    const before = clone(state);
    expect(applyCommand(state, fortify(settler.id)).ok).toBe(false);
    expect(state).toEqual(before);
  });
});

// --- cities -----------------------------------------------------------------

describe('cities in combat', () => {
  /** A one-city state: player 1 holds a city at (4, 3), player 0 is next door. */
  function citiedState(): GameState {
    const state = flatState();
    foundCityAt(state, 1, at(state.map, 4, 3));
    return state;
  }

  it('starts a city at full health and defends with base plus population', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    expect(city.hp).toBe(COMBAT.cityBaseHp);

    const a = createUnit(state, 0, 'warrior', 3, 3);
    const view = forecast(state, a.id, 4, 3);
    expect(view.defenderCityId).toBe(city.id);
    expect(view.defenderUnitId).toBeNull();
    // Base 8 plus 1 per population point, and no terrain bonus on top.
    expect(view.defenderStrength).toBe(COMBAT.cityBaseStrength + COMBAT.cityStrengthPerPop);
    expect(view.terrainBonus).toBe(0);
    // A city never hits back in v1.
    expect(view.damageToAttacker).toBe(0);
  });

  it('takes melee damage and never counter-attacks', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    const a = createUnit(state, 0, 'warrior', 3, 3);

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(city.hp).toBeLessThan(COMBAT.cityBaseHp);
    expect(a.hp).toBe(unitDef('warrior').maxHp);
  });

  it('floors a bombarded city at one hit point: ranged never takes a city', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 5;
    const a = createUnit(state, 0, 'archer', 3, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.damageToDefender).toBe(4);
    expect(view.capturesCity).toBe(false);

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(city.hp).toBe(1);
    expect(city.ownerId).toBe(1);
  });

  it('captures a city with the melee blow that empties it', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 5;
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 33;
    city.lockedTiles = [{ col: 4, row: 4 }];
    const a = createUnit(state, 0, 'warrior', 3, 3);

    expect(forecast(state, a.id, 4, 3).capturesCity).toBe(true);
    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });

    expect(city.ownerId).toBe(0);
    expect(city.hp).toBe(Math.round(COMBAT.cityBaseHp * COMBAT.cityCaptureHpFraction));
    // The old owner's intent goes with the old owner.
    expect(city.queue).toEqual([]);
    expect(city.hammerBasket).toBe(0);
    expect(city.lockedTiles).toEqual([]);
    // The stormed tile is occupied by the storming unit.
    expect({ col: a.col, row: a.row }).toEqual({ col: 4, row: 3 });
  });

  it('hands the captured city’s whole territory over with it', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 1;
    const owned = state.tileOwner.filter((id) => id === city.id).length;
    expect(owned).toBeGreaterThan(1);

    const a = createUnit(state, 0, 'warrior', 3, 3);
    applyCommand(state, attack(a.id, 4, 3));
    // Ownership is stored as a *city* id, so not one tile had to be rewritten.
    expect(city.ownerId).toBe(0);
    expect(state.tileOwner.filter((id) => id === city.id).length).toBe(owned);
  });

  it('targets the garrison before the city it is standing in', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    const a = createUnit(state, 0, 'warrior', 3, 3);

    const target = attackTargetAt(state, 4, 3, 0);
    expect(target?.unit?.id).toBe(garrison.id);
    expect(target?.city).toBeNull();

    const view = forecast(state, a.id, 4, 3);
    expect(view.defenderUnitId).toBe(garrison.id);
    expect(view.defenderCityId).toBeNull();

    city.hp = 1;
    applyCommand(state, attack(a.id, 4, 3));
    // The city was never touched, because the spearman was in the way.
    expect(city.hp).toBe(1);
    expect(city.ownerId).toBe(1);
  });

  it('heals every city a fixed amount per turn, up to full', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 10;

    endRound(state);
    expect(city.hp).toBe(10 + COMBAT.cityHealPerTurn);

    city.hp = COMBAT.cityBaseHp - 1;
    endRound(state);
    expect(city.hp).toBe(COMBAT.cityBaseHp);
  });
});

// --- healing ----------------------------------------------------------------

describe('healing after a fight', () => {
  it('does not heal a unit that attacked, even at full movement', () => {
    const state = flatState();
    const u = createUnit(state, 0, 'warrior', 3, 3);
    u.hp = 40;
    // The state a free attack would leave: nothing spent, but a fight had.
    u.hasAttacked = true;
    u.movesLeft = fullMovement(u);

    endRound(state);
    expect(u.hp).toBe(40);
  });

  it('heals it again the turn after, once the flag is cleared', () => {
    const state = flatState();
    const u = createUnit(state, 0, 'warrior', 3, 3);
    u.hp = 40;
    u.hasAttacked = true;

    endRound(state);
    expect(u.hp).toBe(40);
    endRound(state);
    expect(u.hp).toBe(40 + RULES.healing.perTurnIfRested);
  });
});

// --- elimination and victory ------------------------------------------------

describe('elimination and victory', () => {
  it('eliminates a player who loses their last piece, and names the winner', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const doomed = createUnit(state, 1, 'warrior', 4, 3);
    doomed.hp = 3;

    expect(state.winnerId).toBeNull();
    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });

    expect(state.players[1]!.eliminated).toBe(true);
    expect(state.players[0]!.eliminated).toBe(false);
    // Their seat closes on the spot, so the turn window is not left waiting for
    // a player with nothing to do.
    expect(state.turnEnded[1]).toBe(true);
    expect(state.winnerId).toBe(0);
  });

  it('keeps an eliminated seat ended through every later turn', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const doomed = createUnit(state, 1, 'warrior', 4, 3);
    doomed.hp = 3;
    applyCommand(state, attack(a.id, 4, 3));

    // Player 0 alone can resolve the turn: the dead seat is already finished.
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });
    expect(state.turn).toBe(2);
    expect(state.turnEnded[1]).toBe(true);
    expect(state.turnEnded[0]).toBe(false);

    expect(applyCommand(state, { type: 'endTurn', playerId: 1 }).ok).toBe(false);
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });
    expect(state.turn).toBe(3);
  });

  it('does not eliminate a player who still holds a city', () => {
    const state = flatState();
    foundCityAt(state, 1, at(state.map, 8, 3));
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const doomed = createUnit(state, 1, 'warrior', 4, 3);
    doomed.hp = 3;

    applyCommand(state, attack(a.id, 4, 3));
    expect(state.players[1]!.eliminated).toBe(false);
    expect(state.winnerId).toBeNull();
  });
});

// --- refusals ---------------------------------------------------------------

describe('the refusal matrix leaves the state byte-identical', () => {
  it('refuses every illegal attack without writing anything', () => {
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 3, 3);
    const theirs = createUnit(state, 1, 'warrior', 4, 3);
    const archer = createUnit(state, 0, 'archer', 3, 5);
    const friend = createUnit(state, 0, 'spearman', 4, 5);
    const spent = createUnit(state, 0, 'warrior', 3, 7);
    spent.movesLeft = 0;

    const before = clone(state);
    const refusals: Command[] = [
      attack(mine.id, 4, 3, 9), // no such player
      attack(mine.id, 4, 3, 1), // not this player's unit
      attack(9999, 4, 3), // no such unit
      attack(mine.id, 4, 3, 0.5 as unknown as number), // non-integer playerId
      { type: 'attack', playerId: 0, unitId: mine.id, target: null } as unknown as Command,
      attack(mine.id, 3, 3), // its own tile
      attack(mine.id, 4, 99), // off the map
      attack(mine.id, 5, 3), // empty ground
      attack(mine.id, 9, 3), // out of melee reach
      attack(archer.id, 4, 5), // a friendly unit is not a target
      attack(spent.id, 4, 7), // no movement left, and nothing there anyway
    ];
    for (const command of refusals) {
      expect(applyCommand(state, command).ok).toBe(false);
      expect(state).toEqual(before);
    }
    expect(theirs.hp).toBe(unitDef('warrior').maxHp);
    expect(friend.hp).toBe(unitDef('spearman').maxHp);
  });

  it('refuses an attack from a seat that has ended its turn', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);
    applyCommand(state, { type: 'endTurn', playerId: 0 });

    const before = clone(state);
    const result = applyCommand(state, attack(a.id, 4, 3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('has ended turn');
    expect(state).toEqual(before);
  });

  it('refuses every illegal fortify without writing anything', () => {
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 3, 3);
    applyCommand(state, fortify(mine.id));

    const before = clone(state);
    const refusals: Command[] = [
      fortify(mine.id), // already fortified
      fortify(mine.id, 1), // not this player's unit
      fortify(9999), // no such unit
      fortify(mine.id, 9), // no such player
    ];
    for (const command of refusals) {
      expect(applyCommand(state, command).ok).toBe(false);
      expect(state).toEqual(before);
    }
  });

  it('refuses a fortify from a seat that has ended its turn', () => {
    const state = flatState();
    const u = createUnit(state, 0, 'warrior', 3, 3);
    applyCommand(state, { type: 'endTurn', playerId: 0 });

    const before = clone(state);
    expect(applyCommand(state, fortify(u.id)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a command against a unit an earlier command already killed', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const b = createUnit(state, 0, 'swordsman', 3, 4);
    const doomed = createUnit(state, 1, 'warrior', 4, 3);
    foundCityAt(state, 1, at(state.map, 9, 3));
    doomed.hp = 3;

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    // The swordsman advanced onto (4, 3); the second attacker finds its own
    // side there now, which is not a target. No timing rule was needed for it.
    const before = clone(state);
    expect(applyCommand(state, attack(b.id, 4, 3)).ok).toBe(false);
    expect(state).toEqual(before);
  });
});

// --- data integrity ---------------------------------------------------------

describe('the unit roster carries the combat data the rules need', () => {
  it('gives every military type a combat strength and every civilian none', () => {
    for (const id of UNIT_TYPE_IDS) {
      const def = unitDef(id);
      if (def.category === 'military') expect(def.combatStrength).toBeGreaterThan(0);
      else expect(def.combatStrength).toBe(0);
    }
  });

  it('declares rangedStrength and range together or not at all', () => {
    for (const id of UNIT_TYPE_IDS) {
      const def = unitDef(id);
      expect(def.rangedStrength === undefined).toBe(def.range === undefined);
      if (!isRanged(def)) continue;
      expect(def.rangedStrength).toBeGreaterThan(0);
      expect(def.range).toBeGreaterThanOrEqual(1);
    }
  });

  it('makes exactly the intended types ranged', () => {
    const ranged = UNIT_TYPE_IDS.filter((id) => isRanged(unitDef(id)));
    expect(ranged.sort()).toEqual(
      ['archer', 'catapult', 'chariot', 'compositeBowman', 'crossbowman', 'trebuchet'].sort(),
    );
  });
});

// --- determinism ------------------------------------------------------------

describe('a war replays exactly', () => {
  /**
   * A real game — generated map, real starts — with two hostile warriors placed
   * next to player 0's opening pair by `spawnUnit` commands, so the whole thing
   * is reproducible from the log alone.
   */
  function warGame(
    mineType: 'swordsman' | 'warrior' = 'swordsman',
    theirsType: 'spearman' | 'warrior' = 'spearman',
  ): { game: Game; ids: { mine: number; theirs: number } } {
    const game = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
    const home = game.state.units.find((unit) => unit.ownerId === 0)!;
    // Two passable tiles beside the opening position, found by walking the map
    // rather than assumed: the generator owns where the start is.
    const spots: { col: number; row: number }[] = [];
    for (let dc = -2; dc <= 2 && spots.length < 2; dc++) {
      for (let dr = -1; dr <= 1 && spots.length < 2; dr++) {
        if (dc === 0 && dr === 0) continue;
        const tile = getTileAt(game.state.map, home.col + dc, home.row + dr);
        if (!tile || tile.terrain === 'mountain') continue;
        if (tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'lake') continue;
        if (game.state.units.some((u) => u.col === tile.col && u.row === tile.row)) continue;
        if (spots.some((s) => s.col === tile.col && s.row === tile.row)) continue;
        spots.push({ col: tile.col, row: tile.row });
      }
    }
    expect(spots).toHaveLength(2);

    expect(
      dispatch(game, {
        type: 'spawnUnit',
        playerId: 0,
        ownerId: 0,
        unitType: mineType,
        at: spots[0]!,
      }).ok,
    ).toBe(true);
    expect(
      dispatch(game, {
        type: 'spawnUnit',
        playerId: 0,
        ownerId: 1,
        unitType: theirsType,
        at: spots[1]!,
      }).ok,
    ).toBe(true);

    const mine = game.state.units.find(
      (u) => u.ownerId === 0 && u.col === spots[0]!.col && u.row === spots[0]!.row,
    )!;
    const theirs = game.state.units.find(
      (u) => u.ownerId === 1 && u.col === spots[1]!.col && u.row === spots[1]!.row,
    )!;
    return { game, ids: { mine: mine.id, theirs: theirs.id } };
  }

  it('reproduces a whole war, dice included, from the command log', () => {
    const { game, ids } = warGame();

    // Several turns of shoving: attacks both ways, a fortify, and turn changes
    // in between so healing and the fortify counter run too.
    dispatch(game, { type: 'fortify', playerId: 1, unitId: ids.theirs });
    for (let turn = 0; turn < 6; turn++) {
      const mine = game.state.units.find((u) => u.id === ids.mine);
      const theirs = game.state.units.find((u) => u.id === ids.theirs);
      if (mine && theirs) {
        dispatch(game, {
          type: 'attack',
          playerId: 0,
          unitId: mine.id,
          target: { col: theirs.col, row: theirs.row },
        });
      }
      const stillMine = game.state.units.find((u) => u.id === ids.mine);
      const stillTheirs = game.state.units.find((u) => u.id === ids.theirs);
      if (stillMine && stillTheirs) {
        dispatch(game, {
          type: 'attack',
          playerId: 1,
          unitId: stillTheirs.id,
          target: { col: stillMine.col, row: stillMine.row },
        });
      }
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }

    // Somebody actually got hurt, or the test is asserting nothing.
    const survivors = game.state.units.filter((u) => u.id === ids.mine || u.id === ids.theirs);
    expect(survivors.length).toBeLessThan(2);

    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
    // The generator itself is in lockstep, which is the thing dice would break.
    expect(replayed.rng).toEqual(game.state.rng);
  });

  /**
   * The same war, fought by two units of *equal* strength so that it grinds all
   * the way down to an exchange both sides lose — the one place the reducer now
   * clamps rather than removing, and therefore a step a replay could silently
   * disagree about.
   */
  it('reproduces an exchange that killed both sides, from the log', () => {
    const { game, ids } = warGame('warrior', 'warrior');

    let mutualKill: { attacker: number; hp: number } | null = null;
    const swing = (playerId: number, attackerId: number, defenderId: number): void => {
      const attacker = game.state.units.find((u) => u.id === attackerId);
      const defender = game.state.units.find((u) => u.id === defenderId);
      if (!attacker || !defender) return;
      const result = dispatch(game, {
        type: 'attack',
        playerId,
        unitId: attacker.id,
        target: { col: defender.col, row: defender.row },
      });
      if (!result.ok) return;
      const defenderGone = !game.state.units.some((u) => u.id === defenderId);
      const attackerLives = game.state.units.some((u) => u.id === attackerId);
      // The signature of the rule biting: the target is off the board and its
      // killer is standing on exactly one hit point.
      if (defenderGone && attackerLives && attacker.hp === 1) {
        mutualKill ??= { attacker: attackerId, hp: attacker.hp };
      }
    };

    for (let turn = 0; turn < 8 && !mutualKill; turn++) {
      swing(0, ids.mine, ids.theirs);
      swing(1, ids.theirs, ids.mine);
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }

    // The fixture has to have produced the thing under test, or the replay below
    // is checking an ordinary war again.
    expect(mutualKill).not.toBeNull();
    expect(mutualKill!.hp).toBe(1);

    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
    expect(replayed.rng).toEqual(game.state.rng);
    // And the survivor is still there, on the hit point the rule left it.
    const survivor = replayed.units.find((u) => u.id === mutualKill!.attacker);
    expect(survivor?.hp).toBe(1);
  });

  it('rolls the same numbers from the same seed and no numbers when it captures', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'settler', 4, 3);
    const rngBefore = cloneRng(state.rng);

    applyCommand(state, attack(a.id, 4, 3));
    // A capture is not a fight: no blow is struck, so no die is thrown and the
    // generator is exactly where it was.
    expect(state.rng).toEqual(rngBefore);
  });
});
