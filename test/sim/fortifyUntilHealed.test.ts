/**
 * A dug-in unit and when it asks for orders again: "fortify until healed" (the
 * `fortify` command with `untilHealed: true`) and the wake of a plain fortified
 * unit (the user's rulings of 2026-11-21, `docs/flags.md`).
 *
 * The properties, and they are the whole feature:
 *
 *   1. **The command validates fully before it mutates.** Only a hurt unit
 *      that may fortify, of the seat's own, on a turn the seat has not ended;
 *      the flag is `true` or absent. A refusal leaves the state byte-identical
 *      (hard rule 1).
 *   2. **The unit waits in silence.** It digs in as usual and does not ask for
 *      orders while it heals, even on a turn it heals nothing.
 *   3. **It wakes, dug in.** At full health (until healed only), with a new
 *      enemy in its sight, or when it is attacked, `Unit.dugIn` becomes
 *      `'awake'`: the trench and its bonus stay, and the unit asks for orders
 *      again. A plain fortified unit wakes for an enemy and an attack too.
 *   4. **One alert per threat.** A unit told to fortify while an enemy is in
 *      sight stays quiet until its sight is clear and an enemy next enters it
 *      (`Unit.enemyInSight`).
 *   5. **Any other order clears it**, as an order clears sleep. A plain
 *      fortify on an awake unit keeps the trench and stops the asking.
 *   6. **The heal is one list.** `explainUnitHeal` is what the `healUnits`
 *      phase adds, cap included. The unit sheet's figure is held against the
 *      phase in `test/ui/unitPanel.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { explainUnitHeal, foldUnitHeal, unitHealRefusal } from '../../src/sim/healing';
import { createMap } from '../../src/sim/map';
import { unitHealthBonus } from '../../src/sim/resourceEffects';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, type Unit, createUnit } from '../../src/sim/state';
import { runEndOfTurn } from '../../src/sim/turn';
import { unitMaxHp } from '../../src/sim/unitData';
import { unitAwaitsOrders } from '../../src/sim/units';
import { resetVisibility } from '../../src/sim/visibility';
import { firstBlocker } from '../../src/ui/turnBlockers';
import { openEveryWar } from './warHelpers';
import { newGame } from './newGameHelpers';

/** The bot's source, read for the one register below. */
const BOT_SOURCE = import.meta.glob('../../src/ai/bot.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** A blank two-seat state on flat grassland, at war, with no wild to wander in. */
function flatState(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 24, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  // Nobody owns a hex of the new board: the old board's owners would be read
  // at the wrong indices.
  state.tileOwner = new Array<number | null>(24 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  openEveryWar(state);
  return state;
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function maxHpOf(state: GameState, unit: Unit): number {
  return unitMaxHp(unit, unitHealthBonus(state, unit.ownerId));
}

/** A warrior of seat 0 at (5, 5), hurt to `hp`. */
function hurtWarrior(state: GameState, hp: number): Unit {
  const warrior = createUnit(state, 0, 'warrior', 5, 5);
  warrior.hp = hp;
  return warrior;
}

function untilHealed(unitId: number, playerId = 0): Command {
  return { type: 'fortify', playerId, unitId, untilHealed: true };
}

function fortify(unitId: number, playerId = 0): Command {
  return { type: 'fortify', playerId, unitId };
}

/** Ends the turn for every seat, so the end-of-turn phases run once. */
function endRound(state: GameState): void {
  for (const player of state.players) {
    expect(applyCommand(state, { type: 'endTurn', playerId: player.id })).toEqual({ ok: true });
  }
}

describe('the fortify-until-healed command', () => {
  it('digs a hurt unit in and marks the wait by the presence of the key', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    expect(applyCommand(state, untilHealed(warrior.id))).toEqual({ ok: true });
    expect(warrior.fortified).toBe(true);
    expect(warrior.dugIn).toBe('untilHealed');
  });

  it('refuses a unit at full health, and leaves the state byte-identical', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    const before = clone(state);
    const result = applyCommand(state, untilHealed(warrior.id));
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('full health');
    expect(state).toEqual(before);
  });

  it('refuses a civilian', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    worker.hp = 1;
    const before = clone(state);
    expect(applyCommand(state, untilHealed(worker.id)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a flag that is not `true`', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    const before = clone(state);
    for (const flag of [false, 'yes', 1, null]) {
      const command = { type: 'fortify', playerId: 0, unitId: warrior.id, untilHealed: flag } as unknown as Command;
      expect(applyCommand(state, command).ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('refuses somebody else’s unit, a missing unit and a seat that has ended its turn', () => {
    const state = flatState();
    const theirs = createUnit(state, 1, 'warrior', 9, 5);
    theirs.hp = 40;
    const mine = hurtWarrior(state, 40);
    let before = clone(state);
    expect(applyCommand(state, untilHealed(theirs.id, 0)).ok).toBe(false);
    expect(applyCommand(state, untilHealed(999)).ok).toBe(false);
    expect(state).toEqual(before);

    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });
    before = clone(state);
    expect(applyCommand(state, untilHealed(mine.id)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a unit that is already waiting, and refuses a plain fortify on it', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    applyCommand(state, untilHealed(warrior.id));
    const before = clone(state);
    expect(applyCommand(state, untilHealed(warrior.id)).ok).toBe(false);
    // The grey Fortify button: a waiting unit is already fortified.
    expect(applyCommand(state, fortify(warrior.id)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('takes a unit that is already dug in, and keeps its trench', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    applyCommand(state, fortify(warrior.id));
    expect(applyCommand(state, untilHealed(warrior.id))).toEqual({ ok: true });
    expect(warrior.fortified).toBe(true);
    expect(warrior.dugIn).toBe('untilHealed');
  });

  it('does not require movement, like fortify', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    warrior.movesLeft = 0;
    expect(applyCommand(state, untilHealed(warrior.id))).toEqual({ ok: true });
  });
});

describe('a unit waiting to heal', () => {
  it('does not ask for orders and does not block End Turn', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: warrior.id });
    applyCommand(state, untilHealed(warrior.id));
    expect(unitAwaitsOrders(warrior)).toBe(false);
    expect(firstBlocker(state, 0)?.kind).not.toBe('idleUnit');
  });

  it('heals and keeps waiting while it is still hurt', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    applyCommand(state, untilHealed(warrior.id));
    endRound(state);
    expect(warrior.hp).toBe(40 + RULES.healing.perTurnIfRested);
    expect(warrior.dugIn).toBe('untilHealed');
    expect(unitAwaitsOrders(warrior)).toBe(false);
  });

  it('still waits on a turn it heals nothing, and says why', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: warrior.id, target: { col: 6, row: 5 } }).ok).toBe(true);
    expect(applyCommand(state, untilHealed(warrior.id))).toEqual({ ok: true });
    expect(explainUnitHeal(state, warrior)).toEqual([]);
    expect(unitHealRefusal(state, warrior)).toBe('It moved or acted this turn.');
    endRound(state);
    expect(warrior.hp).toBe(40);
    expect(warrior.dugIn).toBe('untilHealed');
  });
});

describe('waking from the wait', () => {
  it('wakes at full health, still dug in, and asks for orders again', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 0);
    warrior.hp = maxHpOf(state, warrior) - 5;
    applyCommand(state, untilHealed(warrior.id));
    endRound(state);
    expect(warrior.hp).toBe(maxHpOf(state, warrior));
    expect(warrior.dugIn).toBe('awake');
    // The trench and its bonus stay.
    expect(warrior.fortified).toBe(true);
    expect(unitAwaitsOrders(warrior)).toBe(true);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: warrior.id });
  });

  it('wakes when a foreign combatant comes inside its own sight', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    applyCommand(state, untilHealed(warrior.id));
    // A warrior sees 2 (`data/units.json`); two hexes east is inside it.
    createUnit(state, 1, 'warrior', 7, 5);
    runEndOfTurn(state);
    expect(warrior.dugIn).toBe('awake');
    expect(warrior.fortified).toBeDefined();
  });

  it('keeps waiting when the enemy is outside its sight', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    applyCommand(state, untilHealed(warrior.id));
    createUnit(state, 1, 'warrior', 12, 5);
    runEndOfTurn(state);
    expect(warrior.dugIn).toBe('untilHealed');
  });

  it('wakes when it is attacked, and keeps its trench', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 70);
    applyCommand(state, untilHealed(warrior.id));
    const raider = createUnit(state, 1, 'warrior', 6, 5);
    expect(
      applyCommand(state, { type: 'attack', playerId: 1, unitId: raider.id, target: { col: 5, row: 5 } }).ok,
    ).toBe(true);
    // A blow of about thirty leaves a seventy-point warrior standing.
    expect(state.units.includes(warrior)).toBe(true);
    expect(warrior.dugIn).toBe('awake');
    expect(warrior.fortified).toBeDefined();
  });
});

describe('an order clears the wait', () => {
  it('clears on a move order, with the trench', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    applyCommand(state, untilHealed(warrior.id));
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: warrior.id, target: { col: 6, row: 5 } }).ok).toBe(true);
    expect('dugIn' in warrior).toBe(false);
    expect('fortified' in warrior).toBe(false);
  });

  it('clears on any other order that names the unit', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    applyCommand(state, untilHealed(warrior.id));
    expect(applyCommand(state, { type: 'setAutoExplore', playerId: 0, unitId: warrior.id, on: true }).ok).toBe(true);
    expect('dugIn' in warrior).toBe(false);
  });

  it('does not clear on a refused order', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    applyCommand(state, untilHealed(warrior.id));
    const before = clone(state);
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: warrior.id, target: { col: 5, row: -4 } }).ok).toBe(false);
    expect(state).toEqual(before);
    expect(warrior.dugIn).toBe('untilHealed');
  });

  it('lets a woken unit fortify again, keeping its bonus and going quiet', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 0);
    warrior.hp = maxHpOf(state, warrior) - 5;
    applyCommand(state, untilHealed(warrior.id));
    endRound(state);
    expect(warrior.dugIn).toBe('awake');
    expect(applyCommand(state, fortify(warrior.id))).toEqual({ ok: true });
    expect('dugIn' in warrior).toBe(false);
    expect(warrior.fortified).toBe(true);
    expect(unitAwaitsOrders(warrior)).toBe(false);
  });

  it('serialises a cleared unit exactly as one that never took the order', () => {
    const state = flatState();
    const never = createUnit(state, 0, 'warrior', 15, 5);
    const ordered = hurtWarrior(state, 40);
    never.hp = 40;
    applyCommand(state, untilHealed(ordered.id));
    applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: ordered.id, target: { col: 6, row: 5 } });
    applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: never.id, target: { col: 16, row: 5 } });
    const shape = (unit: Unit): string => JSON.stringify(Object.keys(unit).sort());
    expect(shape(ordered)).toBe(shape(never));
  });
});

/**
 * "plain fortify should wake if an enemy is in sight" (the user, 2026-11-21,
 * `docs/flags.md`, "Rulings before the beta").
 */
describe('a plain fortified unit', () => {
  /** A warrior of seat 0 at (5, 5), dug in. */
  function dugIn(state: GameState): Unit {
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    expect(applyCommand(state, fortify(warrior.id))).toEqual({ ok: true });
    return warrior;
  }

  it('stays quiet with no enemy in sight', () => {
    const state = flatState();
    const warrior = dugIn(state);
    runEndOfTurn(state);
    expect('dugIn' in warrior).toBe(false);
    expect('enemyInSight' in warrior).toBe(false);
    expect(unitAwaitsOrders(warrior)).toBe(false);
  });

  it('wakes when an enemy soldier comes into its own sight, and keeps its trench', () => {
    const state = flatState();
    const warrior = dugIn(state);
    // A warrior sees 2 (`data/units.json`); two hexes east is inside it.
    createUnit(state, 1, 'warrior', 7, 5);
    runEndOfTurn(state);
    expect(warrior.dugIn).toBe('awake');
    expect(warrior.enemyInSight).toBe(true);
    // The trench is not broken.
    expect(warrior.fortified).toBe(true);
    expect(unitAwaitsOrders(warrior)).toBe(true);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: warrior.id });
  });

  it('does not wake for an enemy civilian or one outside its sight', () => {
    const state = flatState();
    const warrior = dugIn(state);
    createUnit(state, 1, 'worker', 6, 5);
    createUnit(state, 1, 'warrior', 12, 5);
    runEndOfTurn(state);
    expect('dugIn' in warrior).toBe(false);
  });

  it('wakes when it is attacked', () => {
    const state = flatState();
    const warrior = dugIn(state);
    const raider = createUnit(state, 1, 'warrior', 6, 5);
    expect(
      applyCommand(state, { type: 'attack', playerId: 1, unitId: raider.id, target: { col: 5, row: 5 } }).ok,
    ).toBe(true);
    expect(state.units.includes(warrior)).toBe(true);
    expect(warrior.dugIn).toBe('awake');
    expect(warrior.fortified).toBe(true);
  });

  it('alerts once a threat: fortified again, it stays quiet while the same enemy stays', () => {
    const state = flatState();
    const warrior = dugIn(state);
    const enemy = createUnit(state, 1, 'warrior', 7, 5);
    runEndOfTurn(state);
    expect(warrior.dugIn).toBe('awake');

    // The player answers the alert: fortify again. The trench and its bonus stay.
    expect(applyCommand(state, fortify(warrior.id))).toEqual({ ok: true });
    expect('dugIn' in warrior).toBe(false);
    expect(warrior.fortified).toBe(true);
    expect(warrior.enemyInSight).toBe(true);

    // The enemy stays in view: no second alert.
    runEndOfTurn(state);
    runEndOfTurn(state);
    expect('dugIn' in warrior).toBe(false);
    expect(unitAwaitsOrders(warrior)).toBe(false);

    // The enemy leaves its sight: the mark clears, and the unit stays quiet.
    enemy.col = 14;
    runEndOfTurn(state);
    expect('enemyInSight' in warrior).toBe(false);
    expect('dugIn' in warrior).toBe(false);

    // An enemy enters its sight again: a new alert.
    enemy.col = 7;
    runEndOfTurn(state);
    expect(warrior.dugIn).toBe('awake');
  });

  it('takes an order given in front of an enemy as the answer to that threat', () => {
    const state = flatState();
    createUnit(state, 1, 'warrior', 7, 5);
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    expect(applyCommand(state, fortify(warrior.id))).toEqual({ ok: true });
    expect(warrior.enemyInSight).toBe(true);
    runEndOfTurn(state);
    expect('dugIn' in warrior).toBe(false);
  });

  it('does not change how a sleeper wakes: every turn an enemy is in sight', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    createUnit(state, 1, 'warrior', 7, 5);
    expect(applyCommand(state, { type: 'sleepUnit', playerId: 0, unitId: worker.id })).toEqual({ ok: true });
    runEndOfTurn(state);
    expect(worker.sleeping).toBeUndefined();
    expect(applyCommand(state, { type: 'sleepUnit', playerId: 0, unitId: worker.id })).toEqual({ ok: true });
    runEndOfTurn(state);
    expect(worker.sleeping).toBeUndefined();
  });

  it('clears both marks with the trench', () => {
    const state = flatState();
    const warrior = dugIn(state);
    createUnit(state, 1, 'warrior', 7, 5);
    runEndOfTurn(state);
    expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: warrior.id, target: { col: 4, row: 5 } }).ok).toBe(true);
    expect('fortified' in warrior).toBe(false);
    expect('dugIn' in warrior).toBe(false);
    expect('enemyInSight' in warrior).toBe(false);
  });

  it('is set aside by the bots, which never heard of a dug-in piece through the blockers', () => {
    const bot = BOT_SOURCE['../../src/ai/bot.ts'] ?? '';
    expect(bot).toContain('const blocker = firstBlocker(state, player.id, awakeTrenches(state, player.id));');
    expect(bot).toContain('const blocker = firstBlocker(state, playerId, awakeTrenches(state, playerId));');
    // And no call reaches the blockers without the set: none with two arguments.
    expect(bot.match(/firstBlocker\(state, [\w.]+\)/g) ?? []).toEqual([]);
  });
});

describe('the heal is one list', () => {
  it('adds what the list folds to, and the cap is a line of its own', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 0);
    const max = maxHpOf(state, warrior);
    warrior.hp = max - 3;
    const lines = explainUnitHeal(state, warrior);
    expect(lines[0]).toEqual({ label: 'Resting', amount: RULES.healing.perTurnIfRested });
    expect(lines[lines.length - 1]?.label).toBe('Capped at full health');
    expect(foldUnitHeal(lines)).toBe(3);
    endRound(state);
    expect(warrior.hp).toBe(max);
  });

  it('is empty, with a reason, for a unit at full health', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    expect(explainUnitHeal(state, warrior)).toEqual([]);
    expect(unitHealRefusal(state, warrior)).toBe('It is at full health.');
  });

  it('names an attack as the reason a unit heals nothing', () => {
    const state = flatState();
    const warrior = hurtWarrior(state, 40);
    warrior.hasAttacked = true;
    expect(unitHealRefusal(state, warrior)).toBe('It attacked this turn.');
    expect(foldUnitHeal(explainUnitHeal(state, warrior))).toBe(0);
  });
});
