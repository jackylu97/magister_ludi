import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import {
  advanceFortify,
  applyCombat,
  attackTargetAt,
  cityAttackPhase,
  cityBaseStrength,
  cityBeatenDown,
  cityMaxHp,
  describeCombat,
  explainCityMaxHp,
  explainCityStrength,
  foldCityLines,
  foldCombatStrength,
  fortifyBonus,
  generalAuraLines,
  hasLineOfSight,
  healCities,
  isFortified,
  isRanged,
  previewCombat,
  siegeField,
  underSiege,
} from '../../src/sim/combat';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type Game, createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { greatPersonDef } from '../../src/sim/greatPeopleData';
import {
  type GameMap,
  type Tile,
  createMap,
  getTileAt,
  neighborTiles,
  tileHex,
  tileIndex,
} from '../../src/sim/map';
import { advanceAlongPath } from '../../src/sim/movement';
import { findPath } from '../../src/sim/pathfind';
import { type Rng, cloneRng, makeRng, nextRange } from '../../src/sim/rng';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  createUnit,
  newGame,
  realPlayers,
  bumpRevision,
} from '../../src/sim/state';
import { openWar } from '../../src/sim/wars';
import { UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef, unitMaxHp } from '../../src/sim/unitData';
import { fullMovement } from '../../src/sim/units';
import { techsGrant } from '../../src/sim/techData';
import { defenseBonus, explainTerrainDefense } from '../../src/sim/terrainData';
import { setRiverEdge } from '../../src/sim/water';
import { resetVisibility } from '../../src/sim/visibility';

const COMBAT = RULES.combat;

/**
 * A blank two-player state on a flat grassland rectangle, seeded and quiet.
 *
 * `seats` is for the one question that needs a third empire — the joint siege,
 * where two besiegers ring one town and only one of them holds Siegecraft — and
 * `wild` seats the barbarians, for the question of what a raiding band may do to
 * a town it has surrounded.
 *
 * **Every pair of real seats is at war** (schema 56). Since the war ruling a
 * blow between two empires at peace is refused before a single strength is
 * folded, so a combat fixture that did not declare would be testing the refusal
 * over and over rather than the fight. The declaration is written straight into
 * the register rather than issued as a command for the same reason every other
 * line here writes the board directly: this file's subject is what a blow does,
 * not how a war is opened, and `test/sim/war.test.ts` owns the verb. The wild
 * is deliberately left out — it needs no row and `atWar` answers for it.
 */
function flatState(width = 16, height = 8, seats = 2, wild = false): GameState {
  const colors = ['#a00', '#00a', '#0a0', '#aa0'];
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    ...(wild ? { barbarians: true } : {}),
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: String.fromCharCode(65 + index),
      color: colors[index]!,
      isHuman: true,
    })),
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  // The board was replaced, so anything the generator placed on the old one is
  // pointing at hexes that may not exist. Camps are the wild's own state and
  // this file's fixtures place every piece by hand.
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  declareEveryWar(state);
  return state;
}

/**
 * Opens a war between every pair of real seats. See `flatState`.
 *
 * Exported-in-spirit and duplicated nowhere: the two other fixtures in this
 * file that build a state of their own call it too, so "the fixture is a world
 * at war" is one line rather than a fact each test has to remember.
 */
function declareEveryWar(state: GameState): void {
  const seats = realPlayers(state);
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      openWar(state, seats[i]!.id, seats[j]!.id);
    }
  }
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

    // Two warriors on flat ground: the row's own strength against itself, so
    // the exponent is e^0 = 1 and the midpoint is the base damage itself. The
    // figure is read off the row rather than written here — U9 re-cut the whole
    // ladder and this test is about the exponent, not about what a warrior is.
    const view = forecast(state, a.id, 4, 3);
    expect(view.attackerStrength).toBe(unitDef('warrior').combatStrength);
    expect(view.defenderStrength).toBe(unitDef('warrior').combatStrength);
    expect(view.damageToDefender).toBe(COMBAT.baseDamage);
    expect(view.damageToAttacker).toBe(COMBAT.baseDamage);
  });

  it('is an exponential in the difference of strengths, not a ratio', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'archer', 4, 3);

    // 20 against 15 (U9's ladder): 30 · e^0.2 = 36.6 → 37 dealt, and
    // 30 · e^-0.2 = 24.6 → 25 taken. Both sides of the same exponent, which is
    // the point: a five-point edge is the same multiplier wherever it sits.
    const warrior = unitDef('warrior').combatStrength;
    const archer = unitDef('archer').combatStrength;
    const view = forecast(state, a.id, 4, 3);
    expect(view.damageToDefender).toBe(expectedDamage(warrior, archer, 1));
    expect(view.damageToAttacker).toBe(expectedDamage(archer, warrior, 1));
    expect(view.damageToDefender).toBe(37);
    expect(view.damageToAttacker).toBe(25);
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
    // A scout against a knight: the curve gives something small but nowhere
    // near small enough to test the floor — so check the floor where it bites,
    // on the rounding of a genuinely tiny number.
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

  it('settles a kill’s beakers rather than dropping them in the pool (War Chief)', () => {
    // The first battle rider in the game to pay science, and the rule it has to
    // obey is `tech.ts`': every windfall that pays beakers goes through
    // `settleResearchWindfall`, so a kill that covers the last of a technology
    // finishes it on the spot instead of a turn later.
    const state = flatState();
    const player = state.players[0]!;
    player.statecraft.government = 'warChief';
    bumpRevision(state);
    player.statecraft.orders.push('bloodedSpears');
    player.statecraft.slots = [{ card: 'bloodedSpears', sealedUntil: 0 }];
    bumpRevision(state);
    player.researching = 'husbandry';
    player.sciencePool = techDef('husbandry').cost - 5;

    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    d.hp = 4;
    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });

    expect(player.techsResearched).toContain('husbandry');
    expect(player.sciencePool).toBe(0);
  });

  it('takes the civilians sheltering behind the defender it killed', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    const settler = createUnit(state, 1, 'settler', 4, 3);
    d.hp = 4;

    const result = applyCommand(state, attack(a.id, 4, 3));
    expect(result.ok).toBe(true);
    expect(state.units.find((unit) => unit.id === d.id)).toBeUndefined();
    // The ground and the people on it change hands together (Entry XX.H): the
    // escort died, so the swordsman walks on and the settler is his. Reported
    // through `arriveOnTile`, which is the one place a hex's contents change
    // hands — the same rule that hands a stolen laborer back when its camp is
    // stormed.
    expect({ col: a.col, row: a.row }).toEqual({ col: 4, row: 3 });
    expect(settler.ownerId).toBe(0);
    expect(settler.movesLeft).toBe(0);
    expect(result.ok && result.arrivals?.[0]?.captured).toEqual([
      { id: settler.id, type: 'settler', fromOwnerId: 1, fromWild: false },
    ]);
  });

  it('leaves a civilian alone when the defender it attacked survived', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    createUnit(state, 1, 'spearman', 4, 3);
    const settler = createUnit(state, 1, 'settler', 4, 3);

    expect(applyCommand(state, attack(a.id, 4, 3)).ok).toBe(true);
    // Nothing was emptied, so nothing was taken: the widened advance rule turns
    // on the *kill*, not on the presence of a civilian.
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
    // Ranged strength 20 against strength 20 (U9's ladder): the exponent is
    // e^0, so an even shot is the base damage exactly.
    expect(view.damageToDefender).toBe(
      expectedDamage(unitDef('archer').rangedStrength ?? 0, unitDef('warrior').combatStrength, 1),
    );
    expect(view.damageToDefender).toBe(30);
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

    // Forest (+5) and hills (+6) stack as **points** — U9 rescaled the ground
    // with the ladder: an archer of 15 defends at 26, so
    // 30 · e^(0.04 · (20 − 26)) = 23.6 → 24.
    const view = forecast(state, a.id, 4, 3);
    expect(view.terrainBonus).toBe(11);
    expect(view.defenderStrength).toBe(26);
    expect(view.damageToDefender).toBe(24);
  });

  it('itemises the ground one line per reason, never one summed "terrain"', () => {
    const state = flatState();
    const ground = at(state.map, 4, 3);
    ground.feature = 'forest';
    ground.hills = true;
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'archer', 4, 3);

    const view = forecast(state, a.id, 4, 3);
    // The table's own names, in the table's own order, and both of them flat.
    expect(view.defenderLines).toContainEqual({ source: 'Forest', amount: 5 });
    expect(view.defenderLines).toContainEqual({ source: 'Hills', amount: 6 });
    expect(foldCombatStrength(view.defenderLines)).toBe(view.defenderStrength);
    // And the table agrees with the fight about what the hex is worth.
    expect(defenseBonus('grassland', 'forest', true)).toBe(11);
    expect(
      explainTerrainDefense('grassland', 'forest', true).reduce((sum, l) => sum + l.amount, 0),
    ).toBe(11);
    // Bare ground says nothing at all rather than saying zero.
    expect(explainTerrainDefense('grassland', 'none', false)).toEqual([]);
  });

  it('pays the river penalty only for a melee attack across the edge', () => {
    const state = flatState();
    // A river along the edge (3,3) shares with its eastern neighbour (4,3).
    setRiverEdge(state.map, at(state.map, 3, 3), 0);
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.acrossRiver).toBe(true);
    // Strength 20 × 0.8 = 16 against 20: 30 · e^(0.04 · −4) = 25.6 → 26.
    expect(view.attackerStrength).toBeCloseTo(16, 10);
    expect(view.damageToDefender).toBe(26);
  });

  it('charges no river penalty to an archer shooting over it', () => {
    const state = flatState();
    setRiverEdge(state.map, at(state.map, 3, 3), 0);
    const a = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.kind).toBe('ranged');
    expect(view.acrossRiver).toBe(false);
    expect(view.attackerStrength).toBe(unitDef('archer').rangedStrength);
  });

  it('grows the fortify bonus each turn and caps it', () => {
    const state = flatState();
    const d = createUnit(state, 1, 'warrior', 4, 3);

    expect(applyCommand(state, fortify(d.id, 1))).toEqual({ ok: true });
    expect(isFortified(d)).toBe(true);
    expect(d.fortifiedTurns).toBe(0);
    expect(fortifyBonus(d)).toBe(0);

    advanceFortify(state);
    // Strength **points**, since 2026-08-28: +3 a turn, capped at +6 (U9's
    // figures, Civ 6's, rescaled with the ladder).
    expect(fortifyBonus(d)).toBe(COMBAT.fortifyBonusPerTurn);
    advanceFortify(state);
    expect(fortifyBonus(d)).toBe(COMBAT.fortifyMax);
    // Capped: another five turns buy nothing, and the stored counter stops too.
    for (let i = 0; i < 5; i++) advanceFortify(state);
    expect(fortifyBonus(d)).toBe(COMBAT.fortifyMax);
    expect(d.fortifiedTurns).toBe(2);
  });

  it('counts the fortify bonus in the defender’s strength', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    applyCommand(state, fortify(d.id, 1));
    advanceFortify(state);
    advanceFortify(state);

    // 20 + 6 = 26 defending against 20: 30 · e^(0.04 · −6) = 23.6 → 24.
    const view = forecast(state, a.id, 4, 3);
    expect(view.fortifyBonus).toBe(6);
    expect(view.defenderStrength).toBe(26);
    expect(view.damageToDefender).toBe(24);
    // One line, named for the trench and not for a percentage of anything.
    expect(view.defenderLines).toContainEqual({ source: 'Fortified', amount: 6 });
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

/**
 * **A capture is an advance** (user, 2026-08-28: "when a unit attacks a civilian
 * unit, it should move onto the tile the civilian is on and take control of the
 * unit").
 *
 * The claim under test is not "a worker changes hands" — that was always true —
 * but *where* it happens: `applyCombat` performs no change of hands for a
 * civilian at all any more, it steps onto the hex, and `arriveOnTile` hands over
 * everything standing there. That is what makes the camp, the bounty and the
 * prisoner one command result rather than three rules that have to be kept in
 * step (see `barbarians.test.ts` for the camp half).
 */
describe('civilians', () => {
  it('advances onto the hex and takes the civilian standing on it', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const settler = createUnit(state, 1, 'settler', 4, 3);
    settler.path = [{ col: 9, row: 3 }];

    const view = forecast(state, a.id, 4, 3);
    expect(view.capturesUnit).toBe(true);
    expect(view.damageToDefender).toBe(0);
    expect(view.damageToAttacker).toBe(0);

    const result = applyCommand(state, attack(a.id, 4, 3));
    expect(result.ok).toBe(true);
    expect(settler.ownerId).toBe(0);
    expect(settler.hp).toBe(unitDef('settler').maxHp);
    expect(settler.movesLeft).toBe(0);
    expect(settler.path).toBeUndefined();
    // Nobody was hurt, and the attacker is standing where the settler is: the
    // blow *was* the step onto the hex.
    expect(a.hp).toBe(unitDef('warrior').maxHp);
    expect({ col: a.col, row: a.row }).toEqual({ col: 4, row: 3 });
    expect(a.movesLeft).toBe(0);
    expect(a.hasAttacked).toBe(true);
    // And the transfer is reported by the arrival, because that is where it
    // happened — one seam for "somebody came to rest here", camp or no camp.
    expect(result.ok && result.arrivals?.[0]?.captured).toEqual([
      { id: settler.id, type: 'settler', fromOwnerId: 1, fromWild: false },
    ]);
  });

  it('names the taken defender on the outcome, for the victim’s notice', () => {
    // `reportRaids` (`controls.ts`) narrates a loss from the *victim's* side and
    // never sees an `ArrivalReport`, so the outcome still has to say which piece
    // was taken. A report of the transfer, not a second transfer.
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const worker = createUnit(state, 1, 'worker', 4, 3);

    const result = applyCombat(state, a.id, { col: 4, row: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome.capturedUnitId).toBe(worker.id);
    expect(result.outcome.defenderUnitId).toBe(worker.id);
    expect(result.outcome.advanced).toBe(true);
    expect(result.outcome.killed).toEqual([]);
    expect(result.outcome.damageToDefender).toBe(0);
  });

  it('takes every civilian on the hex, not only the one it aimed at', () => {
    // The hand-over is a rule about the *hex* (`arriveOnTile`), so an unladen
    // caravan sharing the ground comes along with the worker — traders stack
    // freely, which is the only way two civilians are there to begin with.
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const worker = createUnit(state, 1, 'worker', 4, 3);
    const cart = createUnit(state, 1, 'trader', 4, 3);

    expect(applyCommand(state, attack(a.id, 4, 3)).ok).toBe(true);
    expect(worker.ownerId).toBe(0);
    expect(cart.ownerId).toBe(0);
    expect({ col: a.col, row: a.row }).toEqual({ col: 4, row: 3 });
  });

  it('shoots the ground down instead when the ground cannot be taken', () => {
    // The one case the ruling cannot mean literally: an embarked civilian stands
    // on water no land unit can advance onto, so `capturesUnit` is false and the
    // forecast promises a *fight*. A capture with nowhere to happen would be a
    // card that lied — see `canAdvanceOnto`, asked in `planCombat`.
    //
    // **Re-pinned, 2026-09-09.** The sword used to be what rode it down. It may
    // not strike at the water at all any more, so the bow is what reaches it —
    // the same rule read from the other end, and the capture clause still says
    // "a fight, not a taking".
    const state = flatState();
    at(state.map, 4, 3).terrain = 'coast';
    const a = createUnit(state, 0, 'archer', 3, 3);
    const worker = createUnit(state, 1, 'worker', 4, 3);
    worker.hp = 1;

    const view = forecast(state, a.id, 4, 3);
    expect(view.capturesUnit).toBe(false);
    expect(view.damageToDefender).toBeGreaterThan(0);

    expect(applyCommand(state, attack(a.id, 4, 3)).ok).toBe(true);
    expect(state.units.find((unit) => unit.id === worker.id)).toBeUndefined();
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('plunders a laden caravan and advances onto its hex', () => {
    // The plunder rule is untouched by the ruling and rides the same advance it
    // always did: the cargo is taken, the piece is dead, and the soldier ends up
    // standing where the caravan was.
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 2, 3));
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const cart = createUnit(state, 1, 'trader', 4, 3);
    cart.trade = { from: 1, to: 2, expiresTurn: 40, outbound: true, autoResend: false };

    const result = applyCombat(state, a.id, { col: 4, row: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome.plundered).not.toBeNull();
    expect(result.outcome.capturedUnitId).toBeNull();
    expect(state.units.find((unit) => unit.id === cart.id)).toBeUndefined();
    expect({ col: a.col, row: a.row }).toEqual({ col: 4, row: 3 });
  });

  it('fights the guard and stays put when a soldier is standing over the civilian', () => {
    // The targeting priority is what protects a civilian, and it is unchanged:
    // there is no advance until the thing that can swing back is dead.
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const guard = createUnit(state, 1, 'spearman', 4, 3);
    const worker = createUnit(state, 1, 'worker', 4, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.capturesUnit).toBe(false);
    expect(view.defenderUnitId).toBe(guard.id);

    expect(applyCommand(state, attack(a.id, 4, 3)).ok).toBe(true);
    expect(worker.ownerId).toBe(1);
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('performs no change of hands of its own, and says so in the source', () => {
    /**
     * The register test for the ruling. Behavioural tests would all still pass
     * if somebody re-added a capture-in-place beside the advance — the worker
     * would change hands twice and nobody would notice until a camp went
     * uncleared — so this reads the sources.
     *
     * `combat.ts` is allowed **one** `captureUnit`, and it is not a civilian's:
     * it is Wolf-Mother's Pact turning a barbarian a blow already killed, which
     * is a disposal rule for a *death* rather than a taking of ground.
     * `arrival.ts` owns the other one, and it is the only place a civilian
     * changes hands.
     */
    const modules = import.meta.glob('../../src/sim/{arrival,combat}.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const text = (name: string): string =>
      Object.entries(modules).find(([path]) => path.endsWith(`/${name}.ts`))![1];

    const calls = (source: string): string[] => source.match(/captureUnit\(state/g) ?? [];
    expect(calls(text('combat'))).toHaveLength(1);
    expect(calls(text('arrival'))).toHaveLength(1);

    // And the one in `combat.ts` is the convert, not a civilian: the clause it
    // sits in is guarded by the pact's behaviour rule.
    const combat = text('combat');
    const call = combat.indexOf('captureUnit(state');
    const clause = combat.slice(combat.lastIndexOf('if (', call), call);
    expect(clause).toMatch(/barbarianKillsConvert/);
  });

  /**
   * **An archer does not shoot a settler; it walks over and takes it** (user,
   * 2026-09-05: "archers should capture civilian units when right clicking them,
   * right now they ranged attack" — `docs/flags.md` note 22).
   *
   * The ruling is stated in the *reducer* rather than in the pointer, so these
   * ask the command and not the interface: a bow aimed at a hex holding nothing
   * but somebody else's civilians is refused in the ruling's own words, and the
   * capture that replaces it is the ordinary march every other capture is.
   */
  it('refuses a ranged blow on a lone civilian, naming the march instead', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    const settler = createUnit(state, 1, 'settler', 5, 3);
    settler.hp = 5;

    const before = clone(state);
    const result = applyCommand(state, attack(a.id, 5, 3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('A Settler is taken by walking onto it, not shot at');
    // Refused is refused: nothing moved, nothing was spent, nobody was hurt.
    expect(state).toEqual(before);
    // And the forecast says the same thing, so the tint and the card never offer
    // a shot the reducer would refuse.
    const preview = previewCombat(state, a.id, { col: 5, row: 3 });
    expect(preview.ok).toBe(false);
  });

  it('takes the civilian when the archer walks onto its hex', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    const settler = createUnit(state, 1, 'settler', 4, 3);

    const result = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: a.id,
      target: { col: 4, row: 3 },
    });
    expect(result.ok).toBe(true);
    // Through the one capture seam, and reported by it: the ground and the
    // people standing on it changed hands together (`arriveOnTile`).
    expect(settler.ownerId).toBe(0);
    expect({ col: a.col, row: a.row }).toEqual({ col: 4, row: 3 });
    expect(result.ok && result.arrivals?.[0]?.captured).toEqual([
      { id: settler.id, type: 'settler', fromOwnerId: 1, fromWild: false },
    ]);
  });

  it('still shoots the soldier when one is standing over the civilian', () => {
    // The shield is the targeting priority and the ruling does not touch it: the
    // hex is not civilians-only, so there is nothing to refuse.
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    const guard = createUnit(state, 1, 'spearman', 5, 3);
    const worker = createUnit(state, 1, 'worker', 5, 3);

    const view = forecast(state, a.id, 5, 3);
    expect(view.defenderUnitId).toBe(guard.id);
    expect(applyCommand(state, attack(a.id, 5, 3))).toEqual({ ok: true });
    expect(guard.hp).toBeLessThan(unitDef('spearman').maxHp);
    expect(worker.ownerId).toBe(1);
  });

  it('still shoots a civilian standing where no landsman could follow', () => {
    // The refusal is `canStopOn` underneath, so it is true wherever it is spoken:
    // an embarked worker on the coast is not taken by walking onto anything, and
    // a bow that could not shoot it would leave it untouchable.
    const state = flatState();
    at(state.map, 5, 3).terrain = 'coast';
    const a = createUnit(state, 0, 'archer', 3, 3);
    const worker = createUnit(state, 1, 'worker', 5, 3);
    worker.hp = 1;

    expect(applyCommand(state, attack(a.id, 5, 3))).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === worker.id)).toBeUndefined();
  });

  it('says a laden caravan is plundered rather than taken', () => {
    // Walking onto a caravan carrying a route destroys it and banks the cargo
    // (`arrival.ts`), so the sentence that sends the player there says so.
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 2, 3));
    const a = createUnit(state, 0, 'archer', 3, 3);
    const cart = createUnit(state, 1, 'trader', 5, 3);
    cart.trade = { from: 1, to: 2, expiresTurn: 40, outbound: true, autoResend: false };

    const result = applyCommand(state, attack(a.id, 5, 3));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('A Trader is plundered by walking onto it, not shot at');
    }
  });

  it('lets the wild take a civilian by walking, and never by shooting', () => {
    // The wild is not excused: `atWar` answers true for it without a register,
    // so a raider's bow is refused exactly as an empire's is — and the theft it
    // is refused in favour of is the theft barbarians have always done.
    const state = flatState(16, 8, 2, true);
    const wild = realPlayers(state).length;
    // The wild's seat is finished the moment it is seated, and it acts through
    // the evaluator rather than through the log (`barbarians.ts`) — so this asks
    // the evaluator, which is the same plan a player's command resolves with.
    const a = createUnit(state, wild, 'archer', 3, 3);
    const worker = createUnit(state, 1, 'worker', 5, 3);

    const shot = applyCombat(state, a.id, { col: 5, row: 3 });
    expect(shot.ok).toBe(false);
    if (!shot.ok) expect(shot.error).toBe('A Worker is taken by walking onto it, not shot at');

    const path = findPath(state, a, at(state.map, 5, 3));
    expect(path).not.toBeNull();
    advanceAlongPath(state, a, path!);
    expect(worker.ownerId).toBe(wild);
  });

  it('says "cannot see" first, so the refusal never names an unseen piece', () => {
    // The refusal names the piece standing on the hex, so it is asked *after*
    // the fog clause: a sentence that identified a settler on ground the empire
    // has not charted would hand a player the game's own memory, which is the
    // one thing the fog clause exists to refuse.
    const state = flatState();
    const a = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'settler', 5, 3);
    state.visibility[0]![tileIndex(state.map, 5, 3)] = 0;

    const result = applyCommand(state, attack(a.id, 5, 3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('cannot see');
  });

  it('leaves an empire at peace with them exactly where it was', () => {
    // Taking somebody's people is a blow and a blow needs a war. At peace the
    // hex is a wall again, the bow has nothing to be refused in favour of, and
    // the sentence a player reads is the war's, not the ruling's.
    const state = flatState();
    state.wars = [];
    const a = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'settler', 5, 3);

    const shot = applyCommand(state, attack(a.id, 5, 3));
    expect(shot.ok).toBe(false);
    if (!shot.ok) expect(shot.error).toContain('not at war');
    const march = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: a.id,
      target: { col: 5, row: 3 },
    });
    expect(march.ok).toBe(false);
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

  it('starts a city at full health and defends with its best trainable unit', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    expect(city.hp).toBe(cityMaxHp(city));
    expect(cityMaxHp(city)).toBe(COMBAT.cityBaseHp);

    const a = createUnit(state, 0, 'warrior', 3, 3);
    const view = forecast(state, a.id, 4, 3);
    expect(view.defenderCityId).toBe(city.id);
    expect(view.defenderUnitId).toBeNull();
    // The best unit this empire could train is the warrior it starts with, so
    // the town defends at 8 — and takes no terrain bonus on top.
    expect(cityBaseStrength(state, city)).toBe(unitDef('warrior').combatStrength);
    expect(view.defenderStrength).toBe(unitDef('warrior').combatStrength);
    expect(view.terrainBonus).toBe(0);
    // **Re-pinned, 2026-08-28**: a city hits back. It used to be silent — the
    // clause read "unless it is a civilian or a city" — and now it swings with
    // the strength it defends at, which here is the warrior's 8 against the
    // warrior's 8, so the counter is the base damage exactly like any even fight.
    expect(view.damageToAttacker).toBe(COMBAT.baseDamage);
    // The first blow on a town at full health is the walls, and it says so.
    expect(view.cityPhase).toBe('walls');
    expect(view.capturesCity).toBe(false);
  });

  it('re-arms the walls the moment the roster does — the tech, then the iron', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    const owner = state.players[1]!;
    const warrior = unitDef('warrior').combatStrength;
    expect(cityBaseStrength(state, city)).toBe(warrior);

    // Bronze Working alone is not enough: a spearman is a unit, a swordsman is
    // a unit **plus improved iron**, and "could train" is `buildError`'s word.
    owner.techsResearched.push('bronzeWorking');
    bumpRevision(state);
    expect(cityBaseStrength(state, city)).toBe(unitDef('spearman').combatStrength);
    expect(cityBaseStrength(state, city)).toBeGreaterThan(warrior);

    // The floor is what a seat with no army at all defends with.
    const bare = state.players[0]!;
    bare.techsResearched = [];
    bumpRevision(state);
    const theirs = foundCityAt(state, 0, at(state.map, 8, 6));
    expect(explainCityStrength(state, theirs)[0]!.amount).toBe(COMBAT.cityMinStrength);
  });

  it('takes melee damage and swings back with the strength it defends at', () => {
    // **Re-pinned, 2026-08-28.** This test used to be called "never
    // counter-attacks" and asserted the attacker came away untouched. A town can
    // no longer be taken by one lucky roll, so a battering that cost the
    // besieger nothing would have made a siege a formality with extra steps.
    const state = citiedState();
    const city = state.cities[0]!;
    const a = createUnit(state, 0, 'warrior', 3, 3);

    const view = forecast(state, a.id, 4, 3);
    // Two draws in a fixed order — the blow, then the counter — exactly as an
    // ordinary melee has always drawn them.
    const dice = cloneRng(state.rng);
    nextRange(dice, 1 - COMBAT.rollBand, 1 + COMBAT.rollBand);
    const counterRoll = nextRange(dice, 1 - COMBAT.rollBand, 1 + COMBAT.rollBand);

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(city.hp).toBeLessThan(COMBAT.cityBaseHp);
    // And it is the ordinary curve read the ordinary way round: the town's
    // strength against the attacker's.
    expect(unitDef('warrior').maxHp - a.hp).toBe(
      expectedDamage(view.defenderStrength, view.attackerStrength, counterRoll),
    );
    expect(a.hp).toBeLessThan(unitDef('warrior').maxHp);
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

  it('beats the walls down to the floor and stops there, however hard the blow', () => {
    // **Re-pinned, 2026-08-28.** This used to be "captures a city with the melee
    // blow that empties it": five hit points and a warrior took the town in one.
    // The floor that was ranged-only is now every attack's, so the same blow
    // leaves it standing on one.
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 5;
    const a = createUnit(state, 0, 'warrior', 3, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.cityPhase).toBe('walls');
    expect(view.capturesCity).toBe(false);
    // Four is all there is to take: 30-odd damage against five hit points and a
    // floor of one.
    expect(view.damageToDefender).toBe(4);
    expect(view.damageToDefenderMax).toBe(4);

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(city.hp).toBe(1);
    expect(city.ownerId).toBe(1);
    // No advance either: nothing was emptied.
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('captures a beaten, undefended town with the next melee blow', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 5;
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 33;
    city.lockedTiles = [{ col: 4, row: 4 }];
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const b = createUnit(state, 0, 'warrior', 5, 3);

    // Beat one: the walls.
    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(city.hp).toBe(1);

    // Beat three, with no garrison to have made a beat two: the town is walked
    // into. A capture is an *arrival*, so it strikes no blow and takes none.
    const view = forecast(state, b.id, 4, 3);
    expect(view.cityPhase).toBe('capture');
    expect(view.capturesCity).toBe(true);
    expect(view.damageToDefender).toBe(0);
    expect(view.damageToAttacker).toBe(0);

    // `toMatchObject` rather than `toEqual`: taking a seat of government now
    // clacks a bead (The Fallen Palace), and the result carries what it earned.
    expect(applyCommand(state, attack(b.id, 4, 3))).toMatchObject({ ok: true });
    expect(b.hp).toBe(unitDef('warrior').maxHp);

    expect(city.ownerId).toBe(0);
    expect(city.hp).toBe(Math.round(COMBAT.cityBaseHp * COMBAT.cityCaptureHpFraction));
    // The old owner's intent goes with the old owner.
    expect(city.queue).toEqual([]);
    expect(city.hammerBasket).toBe(0);
    expect(city.lockedTiles).toEqual([]);
    // The stormed tile is occupied by the storming unit.
    expect({ col: b.col, row: b.row }).toEqual({ col: 4, row: 3 });
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

  it('targets the walls before the garrison sheltering behind them', () => {
    // **Re-pinned, 2026-08-28**, and it is the inversion the ruling asked for.
    // This test was called "targets the garrison before the city it is standing
    // in" and asserted the town was untouched while a spearman lived. The order
    // is now the other way round: the walls, then the man behind them.
    const state = citiedState();
    const city = state.cities[0]!;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const before = garrison.hp;

    const target = attackTargetAt(state, 4, 3, 0);
    expect(target?.city?.id).toBe(city.id);
    expect(target?.unit).toBeNull();

    const view = forecast(state, a.id, 4, 3);
    expect(view.defenderCityId).toBe(city.id);
    expect(view.defenderUnitId).toBeNull();
    expect(view.cityPhase).toBe('walls');
    // The town's own strength, not the spearman's — the derived garrison is what
    // is on the parapet, whoever is actually standing in the square.
    expect(view.defenderStrength).toBe(cityBaseStrength(state, city));

    applyCommand(state, attack(a.id, 4, 3));
    // The spearman was never touched, because the wall was in the way.
    expect(garrison.hp).toBe(before);
    expect(city.hp).toBeLessThan(COMBAT.cityBaseHp);
    expect(city.ownerId).toBe(1);
  });

  it('turns on the garrison once the walls are down, and not before', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    const a = createUnit(state, 0, 'warrior', 3, 3);

    city.hp = 1;
    const target = attackTargetAt(state, 4, 3, 0);
    expect(target?.unit?.id).toBe(garrison.id);
    expect(target?.city).toBeNull();

    const view = forecast(state, a.id, 4, 3);
    expect(view.cityPhase).toBe('garrison');
    expect(view.defenderUnitId).toBe(garrison.id);
    expect(view.defenderCityId).toBeNull();
    // Ordinary unit-against-unit combat: the spearman's own strength, and it
    // hits back the way a spearman does.
    expect(view.defenderStrength).toBe(unitDef('spearman').combatStrength);
    expect(view.damageToAttacker).toBeGreaterThan(0);
    expect(view.capturesCity).toBe(false);

    applyCommand(state, attack(a.id, 4, 3));
    expect(garrison.hp).toBeLessThan(unitDef('spearman').maxHp);
    // The town takes nothing: it is already on the floor and there is nothing
    // left to knock off it.
    expect(city.hp).toBe(1);
    expect(city.ownerId).toBe(1);
  });

  it('refuses the capture while anything that can swing back is still standing', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    garrison.hp = unitDef('spearman').maxHp;
    city.hp = 1;
    const a = createUnit(state, 0, 'warrior', 3, 3);

    // A blow that lands on the garrison and does not kill it leaves the town
    // exactly where it was: at the floor, and its owner's.
    expect(forecast(state, a.id, 4, 3).capturesCity).toBe(false);
    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(city.ownerId).toBe(1);
    expect(city.hp).toBe(1);
    // And the attacker did not walk in: the gate is still held.
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('takes the town with the blow that kills the garrison', () => {
    // **Re-pinned, 2026-09-09** (the user: "a melee unit attacking and killing
    // the unit protecting a city should take the city"). This test was called
    // "walks in the moment the last defender falls" and needed two swordsmen:
    // one to kill the garrison and a neighbour to walk in the beat after. The
    // kill and the taking are one blow now.
    const state = citiedState();
    const city = state.cities[0]!;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    garrison.hp = 1;
    city.hp = 1;
    const a = createUnit(state, 0, 'swordsman', 3, 3);

    // The card promises it *conditionally*: the beat is still the garrison's,
    // and the taking rides on the kill.
    const view = forecast(state, a.id, 4, 3);
    expect(view.cityPhase).toBe('garrison');
    expect(view.capturesCity).toBe(false);
    expect(view.capturesCityOnKill).toBe(true);

    expect(applyCommand(state, attack(a.id, 4, 3))).toMatchObject({ ok: true });
    expect(state.units.find((unit) => unit.id === garrison.id)).toBeUndefined();
    expect(city.ownerId).toBe(0);
    // And the winner is standing in the gate: the capture is an advance, made
    // through `arriveOnTile` like every other one.
    expect({ col: a.col, row: a.row }).toEqual({ col: 4, row: 3 });
    expect(city.hp).toBe(Math.round(COMBAT.cityBaseHp * COMBAT.cityCaptureHpFraction));
  });

  it('keeps the walls beat first: a garrison behind standing walls is unreachable', () => {
    // The half of the ruling that did *not* change. A siege of a walled town is
    // still two acts at least — the walls, then the man — so this shortens a
    // siege from three blows to two and never from two to one.
    const state = citiedState();
    const city = state.cities[0]!;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    garrison.hp = 1;
    const a = createUnit(state, 0, 'swordsman', 3, 3);

    const view = forecast(state, a.id, 4, 3);
    expect(view.cityPhase).toBe('walls');
    expect(view.capturesCityOnKill).toBe(false);
    expect(view.defenderCityId).toBe(city.id);

    expect(applyCommand(state, attack(a.id, 4, 3))).toMatchObject({ ok: true });
    // The walls took it; the man behind them is untouched and the town is still
    // its owner's.
    expect(garrison.hp).toBe(1);
    expect(city.ownerId).toBe(1);
    expect({ col: a.col, row: a.row }).toEqual({ col: 3, row: 3 });
  });

  it('leaves the town standing when a bow kills the garrison', () => {
    // The other half of the ruling in the user's own words: it is a *melee*
    // unit that takes the city. An archer that empties the gate has emptied the
    // gate, and somebody still has to walk through it.
    const state = citiedState();
    const city = state.cities[0]!;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    garrison.hp = 1;
    city.hp = 1;
    const a = createUnit(state, 0, 'archer', 3, 3);
    const b = createUnit(state, 0, 'warrior', 5, 3);

    expect(forecast(state, a.id, 4, 3).capturesCityOnKill).toBe(false);
    expect(applyCommand(state, attack(a.id, 4, 3))).toMatchObject({ ok: true });
    expect(state.units.find((unit) => unit.id === garrison.id)).toBeUndefined();
    expect(city.ownerId).toBe(1);
    // And the beat after is the capture beat, which is what it always was.
    expect(forecast(state, b.id, 4, 3).cityPhase).toBe('capture');
    expect(applyCommand(state, attack(b.id, 4, 3))).toMatchObject({ ok: true });
    expect(city.ownerId).toBe(0);
  });

  it('refuses the taking to the wild, garrison or no garrison', () => {
    // `capturesCityOnKill` carries the barbarian clause `capturesCity` has
    // carried since the wild was excused from taking towns: the raider's blow
    // lands and the town stays the owner's.
    const state = flatState(16, 8, 2, true);
    foundCityAt(state, 1, at(state.map, 4, 3));
    const city = state.cities[0]!;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    garrison.hp = 1;
    city.hp = 1;
    const wildId = state.players.findIndex((player) => player.barbarian === true);
    expect(wildId).toBeGreaterThan(0);
    const raider = createUnit(state, wildId, 'warrior', 3, 3);

    const view = previewCombat(state, raider.id, { col: 4, row: 3 });
    expect(view.ok).toBe(true);
    if (!view.ok) return;
    expect(view.cityPhase).toBe('garrison');
    expect(view.capturesCityOnKill).toBe(false);

    expect(applyCombat(state, raider.id, { col: 4, row: 3 }).ok).toBe(true);
    expect(state.units.find((unit) => unit.id === garrison.id)).toBeUndefined();
    expect(city.ownerId).toBe(1);
  });

  it('hands over the civilians inside the town it captures', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 1;
    const worker = createUnit(state, 1, 'worker', 4, 3);
    const a = createUnit(state, 0, 'warrior', 3, 3);

    // A civilian is not a defender: the walls are down and nothing holds the
    // gate, so this is the capture beat and not a hunt for the worker.
    expect(forecast(state, a.id, 4, 3).cityPhase).toBe('capture');
    const result = applyCombat(state, a.id, { col: 4, row: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(city.ownerId).toBe(0);
    expect(result.outcome.capturedCityId).toBe(city.id);
    // The ground and the people standing on it change hands together — the
    // arrival is the one place that happens, exactly as it is for a lone worker.
    expect(state.units.find((unit) => unit.id === worker.id)!.ownerId).toBe(0);
    expect(result.outcome.arrival?.captured).toEqual([
      { id: worker.id, type: 'worker', fromOwnerId: 1, fromWild: false },
    ]);
  });

  it('never lets a ranged attack take a town, at any hit point', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 1;
    const archer = createUnit(state, 0, 'archer', 3, 3);

    // The phase is a fact about the *board*, so an archer is told the walls are
    // down too — and `capturesCity` is what says this weapon cannot finish it.
    const view = forecast(state, archer.id, 4, 3);
    expect(view.cityPhase).toBe('capture');
    expect(view.capturesCity).toBe(false);
    expect(view.damageToDefender).toBe(0);

    expect(applyCommand(state, attack(archer.id, 4, 3))).toEqual({ ok: true });
    expect(city.ownerId).toBe(1);
    expect(city.hp).toBe(1);
  });

  it('names the three beats and nothing at all on open ground', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    const a = createUnit(state, 0, 'warrior', 3, 3);

    expect(cityAttackPhase(state, 4, 3, 0)).toBe('walls');
    expect(forecast(state, a.id, 4, 3).cityPhase).toBe('walls');

    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    city.hp = 1;
    expect(cityBeatenDown(city)).toBe(true);
    expect(cityAttackPhase(state, 4, 3, 0)).toBe('garrison');
    expect(forecast(state, a.id, 4, 3).cityPhase).toBe('garrison');

    state.units = state.units.filter((unit) => unit.id !== garrison.id);
    expect(cityAttackPhase(state, 4, 3, 0)).toBe('capture');
    expect(forecast(state, a.id, 4, 3).cityPhase).toBe('capture');

    // The town's own owner sees no phase at all — there is no city of anybody
    // *else's* on that hex, which is the question `cityAttackPhase` asks.
    expect(cityAttackPhase(state, 4, 3, 1)).toBeNull();

    // And a fight on open ground carries no field: absence is the answer.
    const prey = createUnit(state, 1, 'warrior', 2, 3);
    void prey;
    expect(cityAttackPhase(state, 2, 3, 0)).toBeNull();
    expect(forecast(state, a.id, 2, 3).cityPhase).toBeUndefined();
  });

  it('says which beat it was in the one line the log prints', () => {
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 5;
    const a = createUnit(state, 0, 'warrior', 3, 3);

    const walls = applyCombat(state, a.id, { col: 4, row: 3 });
    expect(walls.ok).toBe(true);
    if (!walls.ok) return;
    expect(describeCombat(walls.outcome)).toContain('battering the walls');
    expect(city.hp).toBe(1);

    const b = createUnit(state, 0, 'warrior', 5, 3);
    const taken = applyCombat(state, b.id, { col: 4, row: 3 });
    expect(taken.ok).toBe(true);
    if (!taken.ok) return;
    // A taking is an arrival, so it prints no numbers: there were none.
    expect(describeCombat(taken.outcome)).toBe(`Warrior captures ${city.name}`);
    expect(taken.outcome.cityPhase).toBe('capture');
  });

  it('tells the garrison beat’s taking as the two things it is', () => {
    // The one blow that is a fight *and* a taking (2026-09-09): the man is named
    // because he is what was fought, and the town is not, because
    // `defenderName` is his.
    const state = citiedState();
    const city = state.cities[0]!;
    city.hp = 1;
    const garrison = createUnit(state, 1, 'spearman', 4, 3);
    garrison.hp = 1;
    const a = createUnit(state, 0, 'swordsman', 3, 3);

    const won = applyCombat(state, a.id, { col: 4, row: 3 });
    expect(won.ok).toBe(true);
    if (!won.ok) return;
    expect(won.outcome.cityPhase).toBe('garrison');
    expect(won.outcome.capturedCityId).toBe(city.id);
    expect(describeCombat(won.outcome)).toBe('Swordsman kills Spearman and takes the city');
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

// --- the waterline ----------------------------------------------------------

/**
 * The four rules of fighting across the waterline (batch N1, the user's ruling
 * of 2026-09-09; `docs/war-diplomacy.md` §5b). They live here rather than in
 * `naval.test.ts` because every one of them is a clause of `planCombat` — a
 * refusal, two attacker-side percentages and a share of the counter — and this
 * is the file that holds the evaluator still.
 *
 * The bench is `flatState` with a strip of coast down column 4, so a hull and a
 * landsman can stand a hex apart with the waterline between them.
 */
describe('fighting across the waterline', () => {
  /** Grassland with column 4 flooded: (4, 3) is water, (3, 3) is dry. */
  function shoreState(): GameState {
    const state = flatState();
    for (let row = 0; row < 8; row++) at(state.map, 4, row).terrain = 'coast';
    return state;
  }

  it('refuses a land melee piece the water, whoever is floating on it', () => {
    const state = shoreState();
    const warrior = createUnit(state, 0, 'warrior', 3, 3);
    const hull = createUnit(state, 1, 'trireme', 4, 3);

    // The board still says there is something there — that reading is about the
    // *hex* — and the reading with a piece in hand says this piece cannot reach it.
    expect(attackTargetAt(state, 4, 3, 0)?.unit?.id).toBe(hull.id);
    expect(attackTargetAt(state, 4, 3, 0, warrior)).toBeNull();

    const view = previewCombat(state, warrior.id, { col: 4, row: 3 });
    expect(view.ok).toBe(false);
    if (view.ok) return;
    expect(view.error).toBe('Warrior cannot strike at the water');

    // And the refusal leaves the state byte-identical, like every other one.
    const before = snapshotState(state);
    expect(applyCommand(state, attack(warrior.id, 4, 3))).toEqual({
      ok: false,
      error: 'Warrior cannot strike at the water',
    });
    expect(snapshotState(state)).toBe(before);
  });

  it('refuses it the water even when a worker is what is floating there', () => {
    // Asked of the *ground*, not of the target: there is nothing to stand on and
    // swing from, whoever happens to be out there.
    const state = shoreState();
    const rider = createUnit(state, 0, 'horseman', 3, 3);
    createUnit(state, 1, 'worker', 4, 3);
    const view = previewCombat(state, rider.id, { col: 4, row: 3 });
    expect(view.ok).toBe(false);
    if (view.ok) return;
    expect(view.error).toBe('Horseman cannot strike at the water');
  });

  it('lets a bow shoot at a hull, at half strength, on a named line', () => {
    const state = shoreState();
    const archer = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'trireme', 4, 3);

    const view = forecast(state, archer.id, 4, 3);
    const stat = unitDef('archer').rangedStrength!;
    const share = RULES.naval.landRangedVsShipPercent;
    const line = view.attackerLines.find((one) => one.source.startsWith('Against a hull'));
    expect(line, 'the shot at a hull').toBeDefined();
    expect(line!.source).toBe('Against a hull -50%');
    expect(line!.amount).toBe(Math.floor((stat * (100 + share)) / 100) - stat);
    // Rule 5: the headline is the fold of the list and never a second sum.
    expect(foldCombatStrength(view.attackerLines)).toBeCloseTo(view.attackerStrength, 9);
  });

  it('lets a siege engine shoot at a hull, at half again', () => {
    const state = shoreState();
    const catapult = createUnit(state, 0, 'catapult', 3, 3);
    createUnit(state, 1, 'trireme', 4, 3);

    const view = forecast(state, catapult.id, 4, 3);
    const stat = unitDef('catapult').rangedStrength!;
    const share = RULES.naval.landSiegeVsShipPercent;
    const line = view.attackerLines.find((one) => one.source.startsWith('Against a hull'));
    expect(line!.source).toBe('Against a hull +50%');
    expect(line!.amount).toBe(Math.floor((stat * (100 + share)) / 100) - stat);
    expect(line!.amount).toBeGreaterThan(0);
    expect(foldCombatStrength(view.attackerLines)).toBeCloseTo(view.attackerStrength, 9);
  });

  it('pays neither share against anything that is not a hull', () => {
    // The clause reads the *target's* category, so a bow against a soldier on a
    // beach is an ordinary shot.
    const state = shoreState();
    const archer = createUnit(state, 0, 'archer', 3, 3);
    createUnit(state, 1, 'spearman', 2, 3);
    const view = forecast(state, archer.id, 2, 3);
    expect(view.attackerLines.some((one) => one.source.startsWith('Against a hull'))).toBe(false);
  });

  it('halves the counter a hull takes from a column at sea, and names it', () => {
    const state = shoreState();
    const hull = createUnit(state, 0, 'trireme', 4, 4);
    createUnit(state, 1, 'spearman', 4, 3);

    const view = forecast(state, hull.id, 4, 3);
    const share = RULES.naval.embarkedCounterPercent;
    expect(view.counterPercents).toEqual([{ source: 'Boarding at sea', percent: share }]);
    // The at-sea penalty is the *other* half of the picture and is still a
    // strength line on the defender — the two compose, neither replaces the other.
    expect(view.defenderLines.some((one) => one.source === 'At sea')).toBe(true);

    // Half of the blow the same strengths would otherwise have sent back.
    const whole = expectedDamage(view.defenderStrength, view.attackerStrength, 1);
    expect(view.damageToAttacker).toBe(
      expectedDamage(view.defenderStrength, view.attackerStrength, share / 100),
    );
    expect(view.damageToAttacker).toBeLessThan(whole);
  });

  it('leaves the counter whole when the piece it boards is ashore', () => {
    // Same two pieces, dry ground: nothing is boarding anything, so the counter
    // is the ordinary one and the list is empty.
    const state = shoreState();
    const hull = createUnit(state, 0, 'trireme', 4, 4);
    createUnit(state, 1, 'spearman', 5, 4);
    const view = forecast(state, hull.id, 5, 4);
    expect(view.counterPercents).toEqual([]);
    expect(view.damageToAttacker).toBe(
      expectedDamage(view.defenderStrength, view.attackerStrength, 1),
    );
  });

  it('refuses an embarked piece a hull, whether it would close or shoot', () => {
    const state = shoreState();
    const spearman = createUnit(state, 0, 'spearman', 4, 3);
    const bowman = createUnit(state, 0, 'archer', 4, 5);
    const hull = createUnit(state, 1, 'trireme', 4, 4);

    expect(attackTargetAt(state, 4, 4, 0)?.unit?.id).toBe(hull.id);
    expect(attackTargetAt(state, 4, 4, 0, spearman)).toBeNull();
    expect(attackTargetAt(state, 4, 4, 0, bowman)).toBeNull();

    const closing = previewCombat(state, spearman.id, { col: 4, row: 4 });
    expect(closing.ok).toBe(false);
    if (closing.ok) return;
    expect(closing.error).toBe('Spearman is afloat and cannot fight a ship');

    const shooting = previewCombat(state, bowman.id, { col: 4, row: 4 });
    expect(shooting.ok).toBe(false);
    if (shooting.ok) return;
    expect(shooting.error).toBe('Archer is afloat and cannot fight a ship');

    const before = snapshotState(state);
    expect(applyCommand(state, attack(spearman.id, 4, 4)).ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
  });

  it('still lets an embarked piece attack the shore, exactly as before', () => {
    // Stated rather than assumed: the ruling is about hulls, and nothing in it
    // touches a bow in a boat looking at dry land.
    const state = shoreState();
    const bowman = createUnit(state, 0, 'archer', 4, 3);
    const prey = createUnit(state, 1, 'spearman', 3, 3);
    const view = forecast(state, bowman.id, 3, 3);
    expect(view.defenderUnitId).toBe(prey.id);
    expect(applyCommand(state, attack(bowman.id, 3, 3)).ok).toBe(true);
    expect(prey.hp).toBeLessThan(unitDef('spearman').maxHp);
  });

  it('leaves a fight between two hulls to the triangle', () => {
    // The percentages are a *land* piece's, and a fight at sea is the roster's
    // own lines — nothing here should have joined it.
    const state = shoreState();
    const mine = createUnit(state, 0, 'trireme', 4, 3);
    createUnit(state, 1, 'galley', 4, 4);
    const view = forecast(state, mine.id, 4, 4);
    expect(view.attackerLines.some((one) => one.source.startsWith('Against a hull'))).toBe(false);
    expect(view.counterPercents).toEqual([]);
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
      // A ship is a combatant too, and takes the same claim: the naval category
      // is about *where a piece may be*, never about whether it fights.
      if (def.category === 'military' || def.category === 'naval') {
        expect(def.combatStrength).toBeGreaterThan(0);
      } else expect(def.combatStrength).toBe(0);
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
      // The war chariot left this list in the Age I rework: it became the
      // mounted shock unit ("stronger than a horseman") and the chariot archer
      // took over the bow, which is the split the tech's two gifts describe.
      [
        'archer',
        // Siegecraft's rung of the bow line (the re-cut of 2026-09-02).
        'bowman',
        'catapult',
        // The mounted ranged premier of Æra III (the tree pass of 2026-08-30),
        // and the chariot archer's successor: the bow that does not stop.
        'horseArcher',
        'chariotArcher',
        'compositeBowman',
        'crossbowman',
        'trebuchet',
        // And the naval ranged line, whose three hulls shoot for the same
        // reason and by the same pair of fields (2026-08-29).
        'fireShip',
        'gunGalley',
        'frigate',
      ].sort(),
    );
  });
});

// --- the strength ladder (batch U9) -----------------------------------------

/**
 * **The ladder, as rules rather than as a list of figures** — batch U9
 * (`docs/flags.md` (ttt); the user, 2026-09-10: *"There should be a larger gap
 * between units in combat strength … i'd love for the fire lancer to end as an
 * 80 strength unit"*).
 *
 * Every claim below is derived from the rows and from the tree, never written
 * out: the era a piece belongs to is **the age of the node that unlocks it**,
 * read at test time, so the tech pass that moves a unit from one node to another
 * moves this test's own reading with it and the shape of the ladder is what is
 * pinned. A row no node opens (the wild's, the hulls that await an age, a
 * retired orphan) is skipped rather than guessed at — it has no era to be in.
 */
describe('the strength ladder', () => {
  /** Live rows only: a retired row keeps its figures for saves and is nobody's rung. */
  const live = UNIT_TYPE_IDS.filter((id) => unitDef(id).retired !== true);

  /** The age of the node that unlocks this row, or `null` when no node names it. */
  function eraOf(id: (typeof UNIT_TYPE_IDS)[number]): number | null {
    const tech = UNIT_UNLOCK_TECH.get(id);
    return tech === undefined ? null : techDef(tech).age;
  }

  it('keeps every era’s bows under its best melee or horse', () => {
    const CLOSES = new Set(['melee', 'mounted']);
    const SHOOTS = new Set(['ranged', 'mountedRanged', 'siege']);
    const byEra = new Map<number, { closes: number; shoots: number }>();
    for (const id of live) {
      const era = eraOf(id);
      if (era === null) continue;
      const def = unitDef(id);
      const row = byEra.get(era) ?? { closes: 0, shoots: 0 };
      if (CLOSES.has(def.modelClass)) row.closes = Math.max(row.closes, def.combatStrength);
      if (SHOOTS.has(def.modelClass)) row.shoots = Math.max(row.shoots, def.rangedStrength ?? 0);
      byEra.set(era, row);
    }
    // The four ages that have a roster at all — a guard against the walk finding
    // nothing and the loop below passing vacuously.
    expect([...byEra.keys()].sort()).toEqual([1, 2, 3, 4]);
    for (const [era, row] of byEra) {
      expect(row.closes, `era ${era} has something that closes`).toBeGreaterThan(0);
      expect(row.shoots, `era ${era} has something that shoots`).toBeGreaterThan(0);
      // The user's rule, in one line: a bow is never the best piece of its age.
      expect(row.shoots, `era ${era}: the best bow under the best sword`).toBeLessThan(row.closes);
    }
  });

  it('never lets an upgrade be weaker than the piece it replaces', () => {
    let chains = 0;
    for (const id of live) {
      const def = unitDef(id);
      const next = def.upgradesTo;
      if (next === undefined) continue;
      const to = unitDef(next);
      // A retired successor is not a rung anybody climbs, but the data has none
      // today and a silent skip would hide one.
      expect(to.retired, `${id} upgrades to a retired row`).not.toBe(true);
      chains += 1;
      expect(to.combatStrength, `${id} → ${next}`).toBeGreaterThanOrEqual(def.combatStrength);
      if (def.rangedStrength !== undefined && to.rangedStrength !== undefined) {
        expect(to.rangedStrength, `${id} → ${next} (shooting)`).toBeGreaterThanOrEqual(
          def.rangedStrength,
        );
      }
    }
    expect(chains).toBeGreaterThan(10);
  });
});

/**
 * **The matchup table** — what a blow is actually worth once the ladder is Civ
 * 6's, at the midpoint roll, on flat ground, nobody dug in.
 *
 * The curve is an exponential in the *difference* of two strengths, so the only
 * way to know whether a ladder is any good is to read the damage off it. These
 * are the figures the user's ruling asked to see, and they are what makes the
 * gap between rungs mean something: a bow that used to trade evenly with the
 * sword of its own age now loses that trade, and the age's capstone one-shots
 * the age before it.
 */
describe('the matchup table of the strength ladder', () => {
  /** Damage at the midpoint roll from `a` closing on (or shooting) `b`. */
  function blow(attacker: string, defender: string, apart = 1): number {
    const state = flatState();
    const a = createUnit(state, 0, attacker as never, 3, 3);
    createUnit(state, 1, defender as never, 3 + apart, 3);
    return forecast(state, a.id, 3 + apart, 3).damageToDefender;
  }

  it('prints the era premieres against the bows of their own age', () => {
    // **Re-pinned, batch U9b** (`docs/flags.md` (yyy)): the user re-cut the
    // middle of the ladder by hand, so every figure below moved with the rows.
    // Æra I — the War Chariot against the Chariot Archer, and the shot back.
    // The chariots are the I/II bridge, so the archer's 26 stands over the
    // Spearman's 25 by the user's own ruling and the chariot at 33 is still
    // the age's best horse.
    expect(blow('chariot', 'chariotArcher')).toBe(50);
    expect(blow('chariotArcher', 'chariot', 2)).toBe(23);
    // Æra II — the Swordsman against the Bowman (untouched by U9b).
    expect(blow('swordsman', 'bowman')).toBe(55);
    expect(blow('bowman', 'swordsman', 2)).toBe(23);
    // Æra III — the War Elephant against the Catapult. The engine came up
    // fifteen points (20/35 → 35/42), so the elephant's charge no longer
    // three-quarters-kills it in one pass and the shot back is a little worse.
    expect(blow('warElephant', 'catapult')).toBe(55);
    expect(blow('catapult', 'warElephant', 2)).toBe(22);
    // Æra IV — The Fire Lance against the Trebuchet, which is barely a fight.
    expect(blow('trebuchet', 'fireLance', 2)).toBe(8);
  });

  it('lets The Fire Lance kill a Swordsman outright and take two thirds of a Knight', () => {
    // The capstone the user asked for by name: *"should one-shot a swordsman,
    // or nearly"*. Thirty points is a kill on this curve and the gap is
    // forty-five, so the forecast is the defender's whole bar.
    const swordsman = unitDef('swordsman').maxHp;
    expect(blow('fireLance', 'swordsman')).toBe(swordsman);
    // **Re-pinned, batch U9b.** The Knight came up to 60, which closes the gap
    // to twenty and takes the blow from all-but-lethal to two thirds of the
    // bar — the figure the ruling names ("67 into a Knight now"). The capstone
    // still ends the age; it no longer ends a Knight in one pass.
    expect(blow('fireLance', 'knight')).toBe(67);
    expect(blow('fireLance', 'knight')).toBeLessThan(unitDef('knight').maxHp);
  });

  it('makes the anti-cavalry line worth the same everywhere it appears', () => {
    // The user's second ruling of the day: *"all anti-cav should have +10
    // against mounted across the board"*. The Spearman gained the line it
    // never had, the Spear Wall came down from 12 and the Pikeman from 15, so
    // what an anti-cav piece is worth against a horse is now its own strength
    // and nothing else — read here off the ledger rather than off the rows.
    const state = flatState();
    const horse = createUnit(state, 1, 'knight', 4, 3);
    for (const id of ['spearman', 'phalanx', 'spearWall', 'pikeman'] as const) {
      const def = unitDef(id);
      const line = (def.combatLines ?? []).find((one) => one.vsModelClass === 'mounted');
      expect(line?.amount, `${id} against mounted`).toBe(10);
      // And the ledger prints it: the defender's fold against a charging horse
      // is the row's strength plus the ten, nothing multiplied.
      const foot = createUnit(state, 0, id, 3, 3);
      const plan = previewCombat(state, horse.id, { col: 3, row: 3 });
      expect(plan.ok).toBe(true);
      if (plan.ok) expect(foldCombatStrength(plan.defenderLines)).toBe(def.combatStrength + 10);
      state.units.splice(state.units.indexOf(foot), 1);
    }
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
    theirsType: 'spearman' | 'warrior' | 'worker' = 'spearman',
    seed = 4242,
  ): { game: Game; ids: { mine: number; theirs: number } } {
    const game = createGame({
      seed,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
    // The declaration is a **command**, so the war is part of the log this
    // suite replays — which is the whole point of the block: a war that was
    // written straight into the register would replay from a config that never
    // had one, and the first blow would be refused.
    expect(dispatch(game, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);
    const home = game.state.units.find((unit) => unit.ownerId === 0)!;
    // Two passable tiles beside the opening position, found by walking the map
    // rather than assumed: the generator owns where the start is. The second
    // must **touch** the first — the fights below are one blow across one
    // edge, and a scan that happened to land the two a hex apart (the H9 board
    // did, 2026-09-06) is a refused attack, not a war.
    const spots: { col: number; row: number }[] = [];
    const passable = (tile: Tile): boolean =>
      tile.terrain !== 'mountain' &&
      tile.terrain !== 'ocean' &&
      tile.terrain !== 'coast' &&
      tile.terrain !== 'lake' &&
      !game.state.units.some((u) => u.col === tile.col && u.row === tile.row);
    for (let dc = -2; dc <= 2 && spots.length < 2; dc++) {
      for (let dr = -1; dr <= 1 && spots.length < 2; dr++) {
        if (dc === 0 && dr === 0) continue;
        const tile = getTileAt(game.state.map, home.col + dc, home.row + dr);
        if (!tile || !passable(tile)) continue;
        if (spots.some((s) => s.col === tile.col && s.row === tile.row)) continue;
        if (
          spots.length === 1 &&
          !neighborTiles(game.state.map, tileHex(tile)).some(
            (n) => n.col === spots[0]!.col && n.row === spots[0]!.row,
          )
        ) {
          continue;
        }
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

  /**
   * A town of player 1's with a ring of hexes to camp on, at war with player 0 —
   * everything placed by logged commands so a siege fought on it replays from
   * `{config, log}` alone.
   */
  function siegeGame(): { game: Game; city: City; camps: Tile[] } {
    const game = createGame({
      seed: 909,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
    const settler = game.state.units.find(
      (unit) => unit.ownerId === 1 && unitDef(unit.type).foundsCity === true,
    )!;
    expect(dispatch(game, { type: 'foundCity', playerId: 1, settlerUnitId: settler.id }).ok).toBe(
      true,
    );
    const city = game.state.cities.find((one) => one.ownerId === 1)!;
    // A logged declaration, so the siege replays from `{config, log}` alone.
    expect(dispatch(game, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);

    const ring = neighborTiles(game.state.map, tileHex(at(game.state.map, city.col, city.row)));
    const camps = ring.filter((tile) => {
      if (tile.terrain === 'mountain') return false;
      if (tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'lake') {
        return false;
      }
      return !game.state.units.some((unit) => unit.col === tile.col && unit.row === tile.row);
    });
    expect(camps.length).toBeGreaterThanOrEqual(4);
    return { game, city, camps };
  }

  /** Everybody of player 0's swings at the town, every turn, until it falls. */
  function hammer(game: Game, city: { col: number; row: number; ownerId: number }): Set<string> {
    const beats = new Set<string>();
    for (let turn = 0; turn < 40 && city.ownerId === 1; turn++) {
      for (const besieger of game.state.units.filter((unit) => unit.ownerId === 0)) {
        const seen = previewCombat(game.state, besieger.id, { col: city.col, row: city.row });
        if (seen.ok && seen.cityPhase !== undefined) beats.add(seen.cityPhase);
        dispatch(game, {
          type: 'attack',
          playerId: 0,
          unitId: besieger.id,
          target: { col: city.col, row: city.row },
        });
      }
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    return beats;
  }

  it('reproduces a garrisoned siege, dice included, from the command log', () => {
    // **Re-pinned, 2026-09-09.** This was "a siege in three beats" and asserted
    // all three of them out of one fixture. A melee blow that kills the garrison
    // now takes the town in the same blow, so a *defended* town falls in two
    // beats — the walls, then the man — and the third has its own fixture below.
    // Two code paths here, a counter-attacking city and an ordinary unit fight,
    // and the one thing they have to agree on is the die sequence.
    const { game, city, camps } = siegeGame();
    for (const spot of camps.slice(0, 5)) {
      expect(
        dispatch(game, {
          type: 'spawnUnit',
          playerId: 0,
          ownerId: 0,
          unitType: 'swordsman',
          at: { col: spot.col, row: spot.row },
        }).ok,
      ).toBe(true);
    }
    // A garrison in the gate — the opening escort if it is still standing there,
    // and a spearman otherwise. The point is that beat two happens at all.
    const standing = game.state.units.some(
      (unit) =>
        unit.ownerId === 1 &&
        unit.col === city.col &&
        unit.row === city.row &&
        unitDef(unit.type).category === 'military',
    );
    if (!standing) {
      expect(
        dispatch(game, {
          type: 'spawnUnit',
          playerId: 0,
          ownerId: 1,
          unitType: 'spearman',
          at: { col: city.col, row: city.row },
        }).ok,
      ).toBe(true);
    }

    const beats = hammer(game, city);
    // The fixture has to have produced the thing under test before the replay is
    // asked to reproduce it: the walls, then the man, and the town with him.
    expect([...beats].sort()).toEqual(['garrison', 'walls']);
    expect(city.ownerId).toBe(0);

    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
    expect(replayed.rng).toEqual(game.state.rng);
  });

  it('reproduces an undefended siege — the walls, then the taking', () => {
    // The third code path, and the one the ruling left exactly where it was: a
    // capture that strikes no blow at all. The gate is held by a **worker**, who
    // is not a defender, so the beat after the walls is the taking — and the
    // worker changes hands with the ground like any other civilian.
    const { game, city, camps } = siegeGame();
    // The opening escort out of the gate first, onto a hex nobody is camped on.
    const escort = game.state.units.find(
      (unit) =>
        unit.ownerId === 1 &&
        unit.col === city.col &&
        unit.row === city.row &&
        unitDef(unit.type).category === 'military',
    );
    const yard = camps[0]!;
    if (escort) {
      expect(
        dispatch(game, {
          type: 'moveUnit',
          playerId: 1,
          unitId: escort.id,
          target: { col: yard.col, row: yard.row },
        }).ok,
      ).toBe(true);
      expect(escort.col).toBe(yard.col);
      expect(escort.row).toBe(yard.row);
    }
    expect(
      dispatch(game, {
        type: 'spawnUnit',
        playerId: 0,
        ownerId: 1,
        unitType: 'worker',
        at: { col: city.col, row: city.row },
      }).ok,
    ).toBe(true);
    for (const spot of camps.slice(1, 5)) {
      expect(
        dispatch(game, {
          type: 'spawnUnit',
          playerId: 0,
          ownerId: 0,
          unitType: 'swordsman',
          at: { col: spot.col, row: spot.row },
        }).ok,
      ).toBe(true);
    }

    const beats = hammer(game, city);
    expect([...beats].sort()).toEqual(['capture', 'walls']);
    expect(city.ownerId).toBe(0);
    // The people in the town went with it.
    expect(
      game.state.units.some((unit) => unitDef(unit.type).category === 'civilian' && unit.ownerId === 0),
    ).toBe(true);

    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
    expect(replayed.rng).toEqual(game.state.rng);
  });

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
    // Seed 2 rather than the suite's usual 4242: whether two even warriors
    // grind all the way down to a mutual kill depends on the defence bonus of
    // the two hexes they happen to be standing on, and the elevation/moisture
    // rework moved the ground under 4242's opening. The fixture has to *produce*
    // the clamp for the replay below to be testing it, and the assertion two
    // lines down is what says so out loud.
    //
    // Re-aimed from seed 1 on 2026-09-03: the default map became a pangaea, so
    // seed 1's opening pair now stand on ground that ends the grind early. And
    // re-aimed from seed 2 to seed 3 on 2026-09-09 (schema 102): retiring the
    // reckonings takes four cards out of each age's deck, so the shuffle at
    // `newGame` spends fewer rolls and the opening pair stand somewhere else
    // again. And from seed 3 to seed 4 on 2026-09-09 (schema 106): the census
    // draws its first interval at `newGame`, one roll before the opening pair
    // stand. The fixture is a *seed that produces the clamp*, not a claim about
    // any particular number.
    const { game, ids } = warGame('warrior', 'warrior', 4);

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

  it('reproduces a capture-by-advance byte for byte', () => {
    // The taking of a civilian now *moves* a piece, so a replay has one more
    // thing to agree about than it used to: where the attacker ended up, and
    // everything `arriveOnTile` did on the way. Fought through the real command
    // log so the whole chain is on trial, not just the reducer.
    const { game, ids } = warGame('swordsman', 'worker');
    const prey = game.state.units.find((u) => u.id === ids.theirs)!;
    const at = { col: prey.col, row: prey.row };

    expect(
      dispatch(game, { type: 'attack', playerId: 0, unitId: ids.mine, target: at }).ok,
    ).toBe(true);
    const taken = game.state.units.find((u) => u.id === ids.theirs)!;
    expect(taken.ownerId).toBe(0);
    const captor = game.state.units.find((u) => u.id === ids.mine)!;
    expect({ col: captor.col, row: captor.row }).toEqual(at);

    for (const player of game.state.players) {
      dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
    expect(replayed.rng).toEqual(game.state.rng);
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

/**
 * **The forecast's headline is a fold** (user, 2026-08-26: "combat info should
 * show attack strength of each unit").
 *
 * Hard rule 5 read at the card: `attackerStrength` and `defenderStrength` are
 * the sum of `attackerLines` and `defenderLines` and are never computed beside
 * them. The identity is what makes the card printable without arithmetic on the
 * interface's side, so it is asserted directly rather than through the numbers
 * it happens to produce today — a retune of the river penalty or the wild's tax
 * must not be able to break the card without breaking this.
 */
describe('the strength breakdown', () => {
  it('folds to the two strengths, on the plainest possible fight', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);
    const view = forecast(state, a.id, 4, 3);

    expect(foldCombatStrength(view.attackerLines)).toBe(view.attackerStrength);
    expect(foldCombatStrength(view.defenderLines)).toBe(view.defenderStrength);
    // On bare ground against an unfortified equal, each side is one line: its
    // own printed strength. A card with more lines than that would be inventing
    // reasons.
    expect(view.attackerLines).toEqual([
      { source: 'Warrior', amount: unitDef('warrior').combatStrength },
    ]);
    expect(view.defenderLines).toEqual([
      { source: 'Warrior', amount: unitDef('warrior').combatStrength },
    ]);
  });

  it('keeps folding once the ground, the trench and the ford are in it', () => {
    const state = flatState();
    const tile = at(state.map, 4, 3);
    tile.hills = true;
    tile.feature = 'forest';
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    setRiverEdge(state.map, at(state.map, 3, 3), 0);
    // Two turns of digging in, so the fortification line is a real one.
    d.fortifiedTurns = 2;

    const view = forecast(state, a.id, 4, 3);
    expect(view.acrossRiver).toBe(true);
    expect(foldCombatStrength(view.attackerLines)).toBeCloseTo(view.attackerStrength, 10);
    expect(foldCombatStrength(view.defenderLines)).toBeCloseTo(view.defenderStrength, 10);

    // The attacker's ford is a line of its own, and it takes points away.
    const ford = view.attackerLines.find((line) => line.source.startsWith('Across a river'));
    expect(ford).toBeDefined();
    expect(ford!.amount).toBeLessThan(0);
    // The defender's two reasons are apart, because they are two decisions: the
    // hex it stands on, and the turns it spent standing there.
    const sources = view.defenderLines.map((line) => line.source);
    expect(sources).toContain('Forest');
    expect(sources).toContain('Hills');
    expect(sources).toContain('Fortified');
  });

  it('itemises a city as walls, citizens and whatever the cards added', () => {
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    const a = createUnit(state, 0, 'warrior', 7, 4);
    const view = forecast(state, a.id, 8, 4);

    expect(foldCombatStrength(view.defenderLines)).toBe(view.defenderStrength);
    // The garrison line names the unit it is worth, so a player can see *why*
    // the town got harder the turn Iron Working landed.
    expect(view.defenderLines[0]).toEqual({
      source: `Garrison strength · ${unitDef('warrior').name}`,
      amount: unitDef('warrior').combatStrength,
    });
    // The citizens line is at zero today and is therefore not printed at all: a
    // breakdown does not carry rows worth nothing.
    expect(COMBAT.cityStrengthPerPop).toBe(0);
    expect(view.defenderLines.some((line) => line.source.includes('citizen'))).toBe(false);
    void city;
  });

  it('adds a palisade to both the strength and the hit points', () => {
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    const a = createUnit(state, 0, 'warrior', 7, 4);
    const bare = forecast(state, a.id, 8, 4);
    expect(cityMaxHp(city)).toBe(COMBAT.cityBaseHp);

    city.buildings.push('palisade');
    bumpRevision(state);
    const walled = forecast(state, a.id, 8, 4);
    // Two fields, two questions: `cityStat.defense` is what it fights with and
    // `cityHp` is what a besieger has to spend.
    const stat = buildingDef('palisade').cityStat!.amount;
    expect(walled.defenderStrength).toBe(bare.defenderStrength + stat);
    expect(walled.defenderLines).toContainEqual({ source: 'Palisade', amount: stat });
    // The palisade's own row, read off the table rather than written down here:
    // the user's 2026-08-28 ruling moved it and U9 moved it again with the
    // ladder, and this test is about the *two channels*, not about either figure.
    const walls = buildingDef('palisade').cityHp!;
    expect(cityMaxHp(city)).toBe(COMBAT.cityBaseHp + walls);
    expect(explainCityMaxHp(city)).toContainEqual({ source: 'Palisade', amount: walls });
    expect(foldCityLines(explainCityMaxHp(city))).toBe(cityMaxHp(city));
    // The forecast reports the maximum the walls actually give it.
    expect(walled.defenderMaxHp).toBe(COMBAT.cityBaseHp + walls);
  });

  /**
   * A standing great general's aura (user, 2026-08-28).
   *
   * The passive half of a general, and it is tested here rather than in
   * `greatPeople.test.ts` because it is a line of `planCombat`'s fold and
   * nothing else — the same place the citadel and the wild's tax are pinned.
   */
  it('gives a standing great general\'s aura to both sides, and names him', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    const bare = forecast(state, a.id, 4, 3);

    // One general behind each line, both within reach of their own soldier.
    createUnit(state, 0, 'greatPerson', 2, 3, 'hannibal');
    createUnit(state, 1, 'greatPerson', 5, 3, 'boudica');
    const view = forecast(state, a.id, 4, 3);

    const aura = RULES.greatPeople.generalAuraStrength;
    expect(view.attackerStrength).toBe(bare.attackerStrength + aura);
    expect(view.defenderStrength).toBe(bare.defenderStrength + aura);
    // Named, so a player can see which piece is doing it.
    expect(view.attackerLines).toContainEqual({
      source: `Great general · ${greatPersonDef('hannibal').name}`,
      amount: aura,
    });
    expect(view.defenderLines).toContainEqual({
      source: `Great general · ${greatPersonDef('boudica').name}`,
      amount: aura,
    });
    // And it folds like every other line.
    expect(foldCombatStrength(view.attackerLines)).toBe(view.attackerStrength);
    expect(foldCombatStrength(view.defenderLines)).toBe(view.defenderStrength);
    void d;
  });

  it('reaches exactly generalAuraRange and no hex further', () => {
    const state = flatState();
    const soldier = createUnit(state, 0, 'warrior', 3, 3);
    const range = RULES.greatPeople.generalAuraRange;
    const general = createUnit(state, 0, 'greatPerson', 3 + range, 3, 'hannibal');
    expect(generalAuraLines(state, soldier)).toHaveLength(1);

    // One hex beyond, and the line is simply not there.
    general.col = 3 + range + 1;
    expect(generalAuraLines(state, soldier)).toEqual([]);
  });

  it('does not stack: a second general beside the same column is worth nothing', () => {
    const state = flatState();
    const soldier = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 0, 'greatPerson', 2, 3, 'hannibal');
    createUnit(state, 0, 'greatPerson', 4, 3, 'hanXin');
    expect(generalAuraLines(state, soldier)).toHaveLength(1);
  });

  it('is a friendly aura, and reaches soldiers rather than the general himself', () => {
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 3, 3);
    const theirs = createUnit(state, 1, 'warrior', 4, 3);
    const general = createUnit(state, 0, 'greatPerson', 2, 3, 'hannibal');

    expect(generalAuraLines(state, mine)).toHaveLength(1);
    // The enemy standing just as close gets nothing from somebody else's man.
    expect(generalAuraLines(state, theirs)).toEqual([]);
    // And the general is a civilian: he leads, he does not hold the hex.
    expect(generalAuraLines(state, general)).toEqual([]);
  });

  it('is the general\'s family and not merely a great person', () => {
    const state = flatState();
    const soldier = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 0, 'greatPerson', 2, 3, 'imhotep');
    expect(greatPersonDef('imhotep').family).not.toBe('general');
    expect(generalAuraLines(state, soldier)).toEqual([]);
  });

  it('gives the wild\'s tax to the side that is actually owed it', () => {
    const game = createGame({
      seed: 1,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
      barbarians: true,
    });
    const state = game.state;
    state.map = createMap({ width: 16, height: 8, terrain: 'grassland' });
    resetVisibility(state);
    state.tileOwner = new Array<number | null>(16 * 8).fill(null);
    state.units = [];
    state.cities = [];
    state.nextEntityId = 1;
    const wildId = state.players.length - 1;

    const mine = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, wildId, 'warrior', 4, 3);
    const view = forecast(state, mine.id, 4, 3);

    expect(foldCombatStrength(view.attackerLines)).toBe(view.attackerStrength);
    expect(view.attackerLines.map((line) => line.source)).toContain('Against barbarians');
    expect(view.defenderLines.map((line) => line.source)).not.toContain('Against barbarians');
  });
});

// --- siege ------------------------------------------------------------------

describe('siege', () => {
  /** The six hexes around a town, in `neighborTiles` order. */
  function ring(state: GameState, city: { col: number; row: number }): Tile[] {
    return neighborTiles(state.map, tileHex(at(state.map, city.col, city.row)));
  }

  /** Fresh field for the town's owner. Hoisted per sweep in the phase itself. */
  function besieged(state: GameState, city: Parameters<typeof underSiege>[1]): boolean {
    return underSiege(state, city, siegeField(state, city.ownerId));
  }

  /**
   * Hand a seat Siegecraft — the technology that buys the *starving*, since the
   * Themes Build. Every fixture below that expects a town to be cut off has to
   * say so out loud now, which is the gate stated once per test rather than
   * hidden in a helper.
   */
  function learnsSiege(state: GameState, playerId: number): void {
    const player = state.players[playerId]!;
    if (!player.techsResearched.includes('siegecraft')) player.techsResearched.push('siegecraft');
    bumpRevision(state);
  }

  function encircled(): { state: GameState; city: ReturnType<typeof foundCityAt> } {
    const state = flatState();
    learnsSiege(state, 0);
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    for (const hex of ring(state, city)) createUnit(state, 0, 'warrior', hex.col, hex.row);
    return { state, city };
  }

  it('closes only when every hex around the town is denied', () => {
    const { state, city } = encircled();
    expect(besieged(state, city)).toBe(true);

    // Open one hex **and its two ring neighbours**, because a ring hex is next
    // door to the two beside it: pulling one soldier off r0 leaves r0 still
    // overlooked by r1 and r5, which is the zone-of-control reading and the
    // right one. Clear all three and the road out is genuinely a road.
    const hexes = ring(state, city);
    const open = [hexes[0]!, hexes[1]!, hexes[5]!];
    state.units = state.units.filter(
      (unit) => !open.some((hex) => hex.col === unit.col && hex.row === unit.row),
    );
    expect(besieged(state, city)).toBe(false);
  });

  it('counts a hex an enemy merely overlooks, so five hexes is not a siege', () => {
    const state = flatState();
    learnsSiege(state, 0);
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    const hexes = ring(state, city);
    // Three besiegers standing on r2, r3 and r4 deny five of the six: r1 and r5
    // are next door to r2 and r4. r0 touches none of them and is the road out.
    for (const index of [2, 3, 4]) {
      const hex = hexes[index]!;
      createUnit(state, 0, 'warrior', hex.col, hex.row);
    }
    expect(besieged(state, city)).toBe(false);

    // Close the road and the town is cut off, with nobody standing on r0 at all.
    const shut = hexes[1]!;
    createUnit(state, 0, 'warrior', shut.col, shut.row);
    expect(besieged(state, city)).toBe(true);
  });

  it('leaves a port open: the sea is denied only by somebody standing on it', () => {
    const state = flatState();
    learnsSiege(state, 0);
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    const hexes = ring(state, city);
    const water = hexes[0]!;
    water.terrain = 'ocean';
    for (const hex of hexes.slice(1)) createUnit(state, 0, 'warrior', hex.col, hex.row);
    // Every landward hex is held and the town is still not besieged: an open sea
    // lane is a supply line, and nothing blockades it by standing beside it.
    expect(besieged(state, city)).toBe(false);

    // A piece **on** the water closes it. (Poked straight onto the hex: what is
    // under test is the siege rule, not who may embark.)
    createUnit(state, 0, 'warrior', water.col, water.row);
    expect(besieged(state, city)).toBe(true);
  });

  it('starves rather than heals, and reports what it cost', () => {
    const { state, city } = encircled();
    city.hp = 100;
    const report = { sieges: [] as { cityId: number; ownerId: number; damage: number }[] };
    healCities(state, report);

    expect(city.hp).toBe(100 - COMBAT.siegeDamagePerTurn);
    expect(report.sieges).toEqual([
      { cityId: city.id, ownerId: city.ownerId, damage: COMBAT.siegeDamagePerTurn },
    ]);
  });

  it('heals normally the turn the siege lifts', () => {
    const { state, city } = encircled();
    // Wounded by more than one turn's heal, so the recovery is the *rate* and
    // not the cap: a bare town's health is `cityBaseHp`, and since the
    // 2026-08-28 halving that is only a few turns of healing away from full.
    city.hp = cityMaxHp(city) - COMBAT.cityHealPerTurn - 10;
    const wounded = city.hp;
    state.units = [];
    const report = { sieges: [] as { cityId: number; ownerId: number; damage: number }[] };
    healCities(state, report);

    expect(city.hp).toBe(wounded + COMBAT.cityHealPerTurn);
    expect(report.sieges).toEqual([]);
  });

  it('never takes a town on its own: the chip floors at one hit point', () => {
    const { state, city } = encircled();
    city.hp = 3;
    healCities(state);
    expect(city.hp).toBe(1);
    // And again, forever: a siege is a race a soldier still has to finish.
    healCities(state);
    expect(city.hp).toBe(1);
    expect(state.cities).toHaveLength(1);
  });

  it('waits for Siegecraft: an army without it starves nobody', () => {
    // The Themes Build's ruling (Entry LVIII): war before Siegecraft is a raid.
    // The ring is exactly the one that closes above — every hex held by a real
    // army — and the town is not besieged, because that army does not know how
    // to sit outside a wall.
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    for (const hex of ring(state, city)) createUnit(state, 0, 'warrior', hex.col, hex.row);
    expect(besieged(state, city)).toBe(false);

    // And the heal phase treats it as any town at peace: it recovers.
    city.hp = cityMaxHp(city) - COMBAT.cityHealPerTurn - 10;
    const wounded = city.hp;
    const report = { sieges: [] as { cityId: number; ownerId: number; damage: number }[] };
    healCities(state, report);
    expect(city.hp).toBe(wounded + COMBAT.cityHealPerTurn);
    expect(report.sieges).toEqual([]);

    // The same board, the same soldiers, one technology later: cut off.
    learnsSiege(state, 0);
    expect(besieged(state, city)).toBe(true);
    const after = city.hp;
    healCities(state, report);
    expect(city.hp).toBe(after - COMBAT.siegeDamagePerTurn);
    expect(report.sieges).toHaveLength(1);
  });

  it('leaves the storming of a town legal without it', () => {
    // The other half of the ruling, and the reason the gate is in `siegeField`
    // and not in the fight: an empire with no Siegecraft still marches up and
    // hits the place. Only the starving waits.
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    const hex = ring(state, city)[0]!;
    const attacker = createUnit(state, 0, 'warrior', hex.col, hex.row);
    const seen = previewCombat(state, attacker.id, { col: city.col, row: city.row });
    expect(seen.ok).toBe(true);
    const before = city.hp;
    expect(applyCombat(state, attacker.id, { col: city.col, row: city.row }).ok).toBe(true);
    expect(city.hp).toBeLessThan(before);
  });

  it('counts only the hexes a tech-holder projects, so a joint siege needs both', () => {
    // Two besiegers, one ring. A hex denied by an empire without Siegecraft is
    // not denied at all — an ally camped in the road without the technology is a
    // gap in the line, which is the simplest honest rule and the one the
    // docblock states.
    const state = flatState(16, 8, 3);
    learnsSiege(state, 0);
    const city = foundCityAt(state, 2, at(state.map, 8, 4));
    const hexes = ring(state, city);
    // Three tech-holders on r2, r3 and r4 deny five of the six hexes — r1 and r5
    // are overlooked from beside them — and the ally holds the sixth, r0, which
    // nothing else touches. So the whole line rests on that one hex.
    for (const index of [2, 3, 4]) {
      const hex = hexes[index]!;
      createUnit(state, 0, 'warrior', hex.col, hex.row);
    }
    createUnit(state, 1, 'warrior', hexes[0]!.col, hexes[0]!.row);
    expect(besieged(state, city)).toBe(false);

    // The second empire learns it and the line closes, with nobody moving.
    learnsSiege(state, 1);
    expect(besieged(state, city)).toBe(true);
  });

  it('is never laid by the wild, which holds no technologies at all', () => {
    const state = flatState(16, 8, 2, true);
    const wild = state.players[state.players.length - 1]!;
    expect(wild.barbarian).toBe(true);
    expect(wild.techsResearched).toEqual([]);
    expect(techsGrant(wild.techsResearched, 'siege')).toBe(false);

    // A whole band around the gates, and the town still heals: a raid burns what
    // it can reach and storms what it can take, and starves nothing.
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    for (const hex of ring(state, city)) createUnit(state, wild.id, 'warrior', hex.col, hex.row);
    expect(besieged(state, city)).toBe(false);
  });

  it('reads the gate as an ability, and keeps the siege derived', () => {
    // The register pin. The technology is asked through `techsGrant` — the same
    // seam embarkation is read at — so nothing in the fight compares a tech id
    // against a string, and there is still no siege *field* on a city: the
    // answer is recomputed from where the armies are standing.
    const modules = import.meta.glob('../../src/sim/combat.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const source = Object.values(modules)[0]!;
    expect(source).toMatch(/techsGrant\(player\.techsResearched, 'siege'\)/);
    expect(source).not.toMatch(/'siegecraft'/);

    const { state, city } = encircled();
    healCities(state);
    expect(besieged(state, city)).toBe(true);
    // Nothing was written down about it.
    expect(Object.keys(city).some((key) => /siege|besieg/i.test(key))).toBe(false);
  });

  it('is a derived fact, so a resolution over it replays byte-identically', () => {
    const { state } = encircled();
    const twin = clone(state);
    const resolve = (board: GameState): void => {
      for (const player of board.players) {
        expect(applyCommand(board, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
      }
    };
    resolve(state);
    resolve(twin);
    expect(snapshotState(twin)).toEqual(snapshotState(state));
  });

  it('rides the turn out through the command result', () => {
    const { state, city } = encircled();
    city.hp = 100;
    let sieges: unknown;
    for (const player of state.players) {
      const result = applyCommand(state, { type: 'endTurn', playerId: player.id });
      expect(result.ok).toBe(true);
      if (result.ok && result.sieges) sieges = result.sieges;
    }
    expect(sieges).toEqual([
      { cityId: city.id, ownerId: city.ownerId, damage: COMBAT.siegeDamagePerTurn },
    ]);
  });
});

// --- what a card and a stamp are worth in a fight ----------------------------

/**
 * The three ways the Orders pass of 2026-08-29 reaches this module: Hill Forts'
 * conditioned defence, Drums of War's stamp on the piece itself, and The
 * Oath-Bound's heal for whoever struck the blow.
 *
 * Every one of them is a **labelled line** in `planCombat`'s fold or a cap read
 * through `unitMaxHp` — never a multiplier and never a number quietly larger
 * than the roster's — which is hard rule 5 at the scale of one soldier.
 */
describe('cards and stamps on the strength ledger', () => {
  /** Slots one Order for a seat, growing the spread. Test scaffolding only. */
  function slot(state: GameState, playerId: number, id: string): void {
    const sc = state.players[playerId]!.statecraft;
    sc.orders.push(id as never);
    sc.slots.push({ card: id as never, sealedUntil: 0 });
    bumpRevision(state);
  }

  it('Hill Forts pays the defender on hills, and nobody on the flat', () => {
    const state = flatState();
    slot(state, 1, 'hillForts');
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);

    const flat = forecast(state, a.id, 4, 3);
    expect(flat.defenderLines.some((l) => l.source.includes('Hill Forts'))).toBe(false);

    at(state.map, 4, 3).hills = true;
    const hill = forecast(state, a.id, 4, 3);
    const line = hill.defenderLines.find((l) => l.source.includes('Hill Forts'))!;
    // U9 doubled the card's own points with the ladder.
    expect(line.amount).toBe(4);
    // The fold is the sum of the list, hills bonus and all.
    expect(hill.defenderStrength).toBe(
      foldCombatStrength(hill.defenderLines),
    );
    // And it is the *defender's* line only: attacking uphill buys nothing.
    void d;
  });

  it('a stamped veteran carries its own labelled point, on either side', () => {
    const state = flatState();
    slot(state, 0, 'drumsOfWar');
    // Created *after* the card is slotted, so the stamp is written at the birth.
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    // U9 doubled the stamp with the ladder (Drums of War: +4).
    expect(a.stamp).toEqual({ strength: 4 });

    const attacking = forecast(state, a.id, 4, 3);
    const mine = attacking.attackerLines.find((l) => l.source === 'Veteran')!;
    expect(mine.amount).toBe(4);
    expect(attacking.defenderLines.some((l) => l.source === 'Veteran')).toBe(false);
    expect(attacking.attackerStrength).toBe(foldCombatStrength(attacking.attackerLines));

    // The same point defends. `d` swings at the veteran and finds it steadier.
    const defending = forecast(state, d.id, 3, 3);
    expect(defending.defenderLines.find((l) => l.source === 'Veteran')!.amount).toBe(4);
  });

  it('The Muster Roll raises the bar a heal fills, not just the number on it', () => {
    const state = flatState();
    slot(state, 0, 'theMusterRoll');
    const a = createUnit(state, 0, 'warrior', 3, 3);
    const plain = createUnit(state, 1, 'warrior', 4, 3);
    expect(unitMaxHp(a)).toBe(unitDef('warrior').maxHp + 10);
    expect(unitMaxHp(plain)).toBe(unitDef('warrior').maxHp);
    // Both bars on the forecast read the piece's own maximum, so a veteran at
    // full health does not show as wounded.
    const view = forecast(state, a.id, 4, 3);
    expect(view.attackerMaxHp).toBe(unitMaxHp(a));
    expect(view.defenderMaxHp).toBe(unitMaxHp(plain));
  });

  it('The Oath-Bound heals the killer, capped at that piece’s own maximum', () => {
    const state = flatState();
    slot(state, 0, 'theOathBound');
    const a = createUnit(state, 0, 'swordsman', 3, 3);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    d.hp = 4;
    a.hp = 30;

    expect(applyCommand(state, attack(a.id, 4, 3))).toEqual({ ok: true });
    expect(state.units.find((u) => u.id === d.id)).toBeUndefined();
    // 30 − whatever the counter took, then +15, and never above the maximum.
    expect(a.hp).toBeGreaterThan(30 - unitDef('warrior').maxHp);
    expect(a.hp).toBeLessThanOrEqual(unitMaxHp(a));

    // A killer already whole gains nothing it can keep — the cap is the rule.
    const b = createUnit(state, 0, 'swordsman', 6, 3);
    const e = createUnit(state, 1, 'warrior', 7, 3);
    e.hp = 1;
    expect(applyCommand(state, attack(b.id, 7, 3))).toEqual({ ok: true });
    expect(b.hp).toBeLessThanOrEqual(unitMaxHp(b));
  });
});

// --- the floor does not mend under the enemy's eyes --------------------------

/**
 * The user, 2026-09-07: *"once a city is at 0 hp, it should stop healing every
 * turn (its walls are broken)."* A siege needs every hex denied; one column at
 * the gate is not one, and a beaten-down town that mended twenty points a turn
 * beside it made the three beats a treadmill. `enemyAtTheGate` is the smaller
 * question, read off the same field.
 */
describe('a town at the floor beside an enemy', () => {
  it('does not heal while an enemy stands adjacent, and mends the turn they withdraw', () => {
    const state = flatState();
    state.players[0]!.techsResearched.push('siegecraft');
    bumpRevision(state);
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    const gate = neighborTiles(state.map, tileHex(at(state.map, city.col, city.row)))[0]!;
    const enemy = createUnit(state, 0, 'warrior', gate.col, gate.row);
    city.hp = 1;
    expect(cityBeatenDown(city)).toBe(true);
    healCities(state);
    expect(city.hp).toBe(1);
    // The enemy withdraws: the walls are mended at the ordinary rate.
    state.units = state.units.filter((unit) => unit.id !== enemy.id);
    healCities(state);
    expect(city.hp).toBe(1 + COMBAT.cityHealPerTurn);
  });

  it('still heals a town above the floor beside an enemy — its walls stand', () => {
    const state = flatState();
    state.players[0]!.techsResearched.push('siegecraft');
    bumpRevision(state);
    const city = foundCityAt(state, 1, at(state.map, 8, 4));
    const gate = neighborTiles(state.map, tileHex(at(state.map, city.col, city.row)))[0]!;
    createUnit(state, 0, 'warrior', gate.col, gate.row);
    city.hp = 30;
    healCities(state);
    expect(city.hp).toBe(30 + COMBAT.cityHealPerTurn);
  });
});

/**
 * The two strength conditions batch E4a added, and the one it found already
 * built (`docs/audit/deferred-rows.md`).
 *
 * Both are read in `combatConditionHolds` and nowhere else, and both are asked
 * of the same `(attacker, target, tile)` triple every other condition is — so
 * what is pinned here is the *fight*, on the ledger, in the forecast the player
 * reads before committing.
 */
describe('the strength conditions of batch E4a', () => {
  /** Slots one Order for a seat. `cards and stamps`' scaffolding, once more. */
  function slotOrder(state: GameState, playerId: number, id: string): void {
    const sc = state.players[playerId]!.statecraft;
    sc.orders.push(id as never);
    sc.slots.push({ card: id as never, sealedUntil: 0 });
    bumpRevision(state);
  }

  it('The Siege Train pays at a wall, beside an engine, and in no other case', () => {
    const state = flatState();
    slotOrder(state, 0, 'theSiegeTrain');
    const town = foundCityAt(state, 1, at(state.map, 8, 3));
    expect(town).toBeDefined();
    const a = createUnit(state, 0, 'warrior', 7, 3);
    bumpRevision(state);
    const paid = (col: number, row: number): number =>
      forecast(state, a.id, col, row)
        .attackerLines.filter((line) => line.source.includes('Siege Train'))
        .reduce((sum, line) => sum + line.amount, 0);

    // At the wall with nobody beside it: the escort half of the composite fails.
    expect(paid(8, 3)).toBe(0);
    // An engine next door, and the line is worth its twelve (U9's ladder).
    createUnit(state, 0, 'catapult', 7, 2);
    bumpRevision(state);
    expect(paid(8, 3)).toBe(12);
    // And the wall half: an engine beside a soldier storming a *piece* pays
    // nothing, because `all` asks for both. The escort is placed on a hex the
    // board itself calls adjacent, so the case is never vacuously true.
    const b = createUnit(state, 0, 'warrior', 3, 3);
    const beside = neighborTiles(state.map, tileHex(at(state.map, 3, 3)))
      .map((hex) => at(state.map, hex.col, hex.row))
      .find((tile) => tile.col !== 4 || tile.row !== 3)!;
    createUnit(state, 0, 'catapult', beside.col, beside.row);
    createUnit(state, 1, 'warrior', 4, 3);
    bumpRevision(state);
    expect(
      forecast(state, b.id, 4, 3).attackerLines.some((line) =>
        line.source.includes('Siege Train'),
      ),
    ).toBe(false);
  });

  it('Castellany answers arrows and nothing that closes', () => {
    const state = flatState();
    // A technology is `liveEffects`' tenth source, so the node's own card
    // effects reach the fight the moment it is held.
    state.players[1]!.techsResearched.push('feudalism');
    bumpRevision(state);
    const d = createUnit(state, 1, 'warrior', 4, 3);
    void d;
    const archer = createUnit(state, 0, 'archer', 3, 3);
    const shot = forecast(state, archer.id, 4, 3);
    const line = shot.defenderLines.find((entry) => entry.source.includes('Castellany'))!;
    expect(line).toBeDefined();
    // U9 doubled the node's own line with the ladder.
    expect(line.amount).toBe(10);
    // A piece that closes is not an arrow: `vsClass` names the *other* side, and
    // for a defender's line that is whoever charged in.
    const beside = neighborTiles(state.map, tileHex(at(state.map, 4, 3)))
      .map((hex) => at(state.map, hex.col, hex.row))
      .find((tile) => tile.col !== 3 || tile.row !== 3)!;
    const melee = createUnit(state, 0, 'warrior', beside.col, beside.row);
    const charge = forecast(state, melee.id, 4, 3);
    expect(charge.defenderLines.some((entry) => entry.source.includes('Castellany'))).toBe(false);
  });

  it('the Statue of Zeus takes its share off a wall and off nothing else', () => {
    const state = flatState();
    const home = foundCityAt(state, 0, at(state.map, 2, 3))!;
    home.buildings.push('statueOfZeus');
    state.wonders.push({ building: 'statueOfZeus', playerId: 0, cityId: home.id, turn: 1 });
    foundCityAt(state, 1, at(state.map, 8, 3));
    bumpRevision(state);
    const a = createUnit(state, 0, 'warrior', 7, 3);
    const wall = forecast(state, a.id, 8, 3);
    const share = wall.attackerLines.find((line) => line.source.startsWith('Cards'))!;
    expect(share).toBeDefined();
    // A percentage of the roster's own strength, printed in points — the one
    // attacker-side share there is, and it names itself in the label.
    expect(share.source).toContain('+15%');
    // And a piece in the open is not a wall.
    createUnit(state, 1, 'warrior', 6, 3);
    bumpRevision(state);
    const open = forecast(state, a.id, 6, 3);
    expect(open.attackerLines.some((line) => line.source.startsWith('Cards'))).toBe(false);
  });
});
