/**
 * Unit ranks (batch WC3, `docs/flags.md` (rrrrrr) part 3).
 *
 * The rule, part by part, on a small flat board:
 *
 *   · the ladder: no rank below the first threshold, Veteran from it, Elite
 *     from the second, and the figures the ruling set as its defaults;
 *   · experience from a fight: surviving and killing, attacking and defending,
 *     a ranged attacker that takes no counter-blow, a blow at a town's walls,
 *     and the blows that are not fights at all;
 *   · the barbarian cap: barbarian fights stop at Veteran, a fight with an
 *     empire goes on to Elite, and barbarian units earn nothing;
 *   · the strength line: one flat line per rank, on both sides, the same in
 *     every age, folded into the forecast and the fight alike;
 *   · persistence: an automatic upgrade and a change of owner keep it;
 *   · the register: one writer of `Unit.experience`, the three ways to raise
 *     it (a fight, a card's grant, a rank a card names) and who calls each, and
 *     that every caller hands the ranks reached to `settleRanksEarned`;
 *   · the interface's readouts of it (the unit panel's figures);
 *   · the bots, which keep a wounded veteran out of a fight it is likely to
 *     lose;
 *   · and a war that made a veteran, replaying from its log.
 */

import { describe, expect, it } from 'vitest';

import { aiConfigFor, withAiTuning } from '../../src/ai/aiConfig';
import { nextBotDecision } from '../../src/ai/bot';
import { type BotDecision, type ValueTerm, foldTerms } from '../../src/ai/decision';
import { applyCombat, foldCombatStrength, previewCombat } from '../../src/sim/combat';
import { applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { dispatch, replay, snapshotState } from '../../src/sim/game';
import { type Tile, createMap, getTileAt, tileNeighbors } from '../../src/sim/map';
import { isPassable } from '../../src/sim/pathfind';
import {
  RANK_IDS,
  awardExperience,
  experienceAfter,
  grantExperience,
  nextRankOf,
  raiseToRank,
  rankFor,
  rankOf,
  rankStrength,
  rankStrengthLines,
  rankThreshold,
  ranksReached,
} from '../../src/sim/ranks';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  captureUnit,
  createUnit,
} from '../../src/sim/state';
import { upgradeUnits } from '../../src/sim/tech';
import { UNIT_UNLOCK_TECH } from '../../src/sim/techData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { experienceFigure, rankNote } from '../../src/ui/unitPanel';
import { createGame, newGame } from './newGameHelpers';

const RANKS = RULES.combat.ranks;
const SURVIVE = RANKS.survive;
const KILL = RANKS.kill;
const VETERAN = RANKS.ladder.veteran.experience;
const ELITE = RANKS.ladder.elite.experience;

/**
 * A blank flat board with two empires at war and, when asked, the wild. Every
 * town and piece is placed by hand below.
 */
function bench(wild = false): GameState {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    ...(wild ? { barbarians: true } : {}),
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  openWar(state, 0, 1);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function wildId(state: GameState): number {
  const wild = state.players.find((player) => player.barbarian === true);
  if (!wild) throw new Error('no wild seat');
  return wild.id;
}

/** Resolves a blow and insists the rules accepted it. */
function strike(state: GameState, attacker: Unit, col: number, row: number) {
  const result = applyCombat(state, attacker.id, { col, row });
  if (!result.ok) throw new Error(result.error);
  return result.outcome;
}

/** Gives a piece its turn back, so one archer can shoot several times in a test. */
function rested(unit: Unit): void {
  unit.hasAttacked = false;
  unit.movesLeft = 2;
}

/** A piece's forecast against a hex, insisting the rules allow the blow. */
function forecast(state: GameState, unit: Unit, col: number, row: number) {
  const preview = previewCombat(state, unit.id, { col, row });
  if (!preview.ok) throw new Error(preview.error);
  return preview;
}

// --- the ladder -------------------------------------------------------------

describe('the ladder', () => {
  it('holds the figures the ruling set as its defaults', () => {
    // `docs/flags.md` (rrrrrr) part 3. A retune changes these on purpose, and
    // this is the test that says so.
    expect(RANKS.survive).toBe(1);
    expect(RANKS.kill).toBe(2);
    expect(RANKS.ladder.veteran).toEqual({ experience: 4, strength: 3 });
    expect(RANKS.ladder.elite).toEqual({ experience: 10, strength: 6 });
    expect(RANKS.barbarianCap).toBe('veteran');
  });

  it('runs lowest first, and each rank is worth more than the one below it', () => {
    expect(RANK_IDS).toEqual(['veteran', 'elite']);
    for (let index = 1; index < RANK_IDS.length; index++) {
      expect(rankThreshold(RANK_IDS[index]!)).toBeGreaterThan(rankThreshold(RANK_IDS[index - 1]!));
      expect(rankStrength(RANK_IDS[index]!)).toBeGreaterThan(rankStrength(RANK_IDS[index - 1]!));
    }
  });

  it('holds no rank below the first threshold, Veteran from it and Elite from the second', () => {
    expect(rankFor(0)).toBeNull();
    expect(rankFor(VETERAN - 1)).toBeNull();
    expect(rankFor(VETERAN)).toBe('veteran');
    expect(rankFor(ELITE - 1)).toBe('veteran');
    expect(rankFor(ELITE)).toBe('elite');
    expect(rankFor(ELITE * 5)).toBe('elite');
    expect(rankOf({})).toBeNull();
    expect(rankOf({ experience: VETERAN })).toBe('veteran');
  });

  it('names the next rank up, and nothing past the top', () => {
    expect(nextRankOf({})).toBe('veteran');
    expect(nextRankOf({ experience: VETERAN })).toBe('elite');
    expect(nextRankOf({ experience: ELITE })).toBeNull();
  });

  it('pays a kill in place of a survival, not on top of it', () => {
    expect(experienceAfter(0, 'survived', false)).toBe(SURVIVE);
    expect(experienceAfter(0, 'kill', false)).toBe(KILL);
    expect(experienceAfter(7, 'kill', false)).toBe(7 + KILL);
  });
});

// --- experience from a fight ------------------------------------------------

describe('experience from a fight', () => {
  it('pays a melee attacker that kills its defender the kill', () => {
    const state = bench();
    const attacker = createUnit(state, 0, 'swordsman', 4, 4);
    const doomed = createUnit(state, 1, 'warrior', 5, 4);
    doomed.hp = 3;
    const outcome = strike(state, attacker, 5, 4);
    expect(outcome.killed.map((fallen) => fallen.id)).toContain(doomed.id);
    expect(attacker.experience).toBe(KILL);
  });

  it('pays both sides of a melee that both live through', () => {
    const state = bench();
    const attacker = createUnit(state, 0, 'warrior', 4, 4);
    const defender = createUnit(state, 1, 'warrior', 5, 4);
    const outcome = strike(state, attacker, 5, 4);
    expect(outcome.attackerSurvived).toBe(true);
    expect(outcome.killed).toEqual([]);
    expect(attacker.experience).toBe(SURVIVE);
    expect(defender.experience).toBe(SURVIVE);
  });

  it('pays a defender whose counter-blow kills the attacker the kill, and the attacker nothing', () => {
    const state = bench();
    const attacker = createUnit(state, 0, 'warrior', 4, 4);
    attacker.hp = 1;
    const defender = createUnit(state, 1, 'swordsman', 5, 4);
    const outcome = strike(state, attacker, 5, 4);
    expect(outcome.attackerSurvived).toBe(false);
    expect(defender.experience).toBe(KILL);
    expect(attacker.experience).toBeUndefined();
  });

  it('pays a ranged attacker that takes no counter-blow, and the unit it shot', () => {
    const state = bench();
    const archer = createUnit(state, 0, 'archer', 4, 4);
    const target = createUnit(state, 1, 'warrior', 6, 4);
    const outcome = strike(state, archer, 6, 4);
    expect(outcome.kind).toBe('ranged');
    expect(outcome.damageToAttacker).toBe(0);
    expect(archer.experience).toBe(SURVIVE);
    expect(target.experience).toBe(SURVIVE);
  });

  it('pays a ranged attacker whose shot kills the kill', () => {
    const state = bench();
    const archer = createUnit(state, 0, 'archer', 4, 4);
    const doomed = createUnit(state, 1, 'warrior', 6, 4);
    doomed.hp = 2;
    strike(state, archer, 6, 4);
    expect(state.units.some((unit) => unit.id === doomed.id)).toBe(false);
    expect(archer.experience).toBe(KILL);
  });

  it('pays an attacker that lives through a town’s walls, and never the town or its garrison', () => {
    const state = bench();
    foundCityAt(state, 0, at(state, 1, 1));
    const town = foundCityAt(state, 1, at(state, 8, 4));
    const garrison = createUnit(state, 1, 'warrior', 8, 4);
    const attacker = createUnit(state, 0, 'warrior', 7, 4);
    const outcome = strike(state, attacker, 8, 4);
    expect(outcome.cityPhase).toBe('walls');
    expect(outcome.attackerSurvived).toBe(true);
    expect(attacker.experience).toBe(SURVIVE);
    // The walls took the blow in the garrison's place, and a town has no
    // experience to earn.
    expect(garrison.experience).toBeUndefined();
    expect('experience' in town).toBe(false);
  });

  it('pays nothing for taking a civilian, plundering a caravan or walking into an empty town', () => {
    const state = bench();
    foundCityAt(state, 0, at(state, 1, 1));
    // A civilian taken.
    const captor = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'worker', 5, 4);
    strike(state, captor, 5, 4);
    expect(captor.experience).toBeUndefined();
    // A laden caravan plundered.
    const from = foundCityAt(state, 1, at(state, 9, 1));
    const to = foundCityAt(state, 1, at(state, 9, 8));
    const cart = createUnit(state, 1, 'trader', 6, 7);
    cart.trade = { from: from.id, to: to.id, expiresTurn: state.turn + 10, outbound: true, autoResend: false };
    const raider = createUnit(state, 0, 'warrior', 5, 7);
    const plunder = strike(state, raider, 6, 7);
    expect(plunder.plundered).not.toBeNull();
    expect(raider.experience).toBeUndefined();
    // A beaten town with nobody in the gate, walked into.
    const town = foundCityAt(state, 1, at(state, 13, 4));
    town.hp = 1;
    const walker = createUnit(state, 0, 'warrior', 12, 4);
    const taken = strike(state, walker, 13, 4);
    expect(taken.capturedCityId).toBe(town.id);
    expect(walker.experience).toBeUndefined();
  });

  it('leaves the key absent on a unit that has never fought', () => {
    const state = bench();
    const fresh = createUnit(state, 0, 'warrior', 4, 4);
    expect('experience' in fresh).toBe(false);
  });

  it('adds up over several fights', () => {
    const state = bench();
    const archer = createUnit(state, 0, 'archer', 4, 4);
    createUnit(state, 1, 'warrior', 6, 4);
    strike(state, archer, 6, 4);
    rested(archer);
    strike(state, archer, 6, 4);
    expect(archer.experience).toBe(2 * SURVIVE);
  });
});

// --- the barbarian cap ------------------------------------------------------

describe('the barbarian cap', () => {
  it('takes a unit to Veteran on barbarian fights and no further', () => {
    const state = bench(true);
    const wild = wildId(state);
    const archer = createUnit(state, 0, 'archer', 4, 4);
    archer.experience = VETERAN - 1;
    // A kill would pay past the threshold; the cap stops it at Veteran.
    const raider = createUnit(state, wild, 'warrior', 6, 4);
    raider.hp = 2;
    strike(state, archer, 6, 4);
    expect(state.units.some((unit) => unit.id === raider.id)).toBe(false);
    expect(archer.experience).toBe(VETERAN);
    expect(rankOf(archer)).toBe('veteran');
    // Another barbarian kill, and a barbarian fight it merely survives, add
    // nothing at all.
    rested(archer);
    const second = createUnit(state, wild, 'warrior', 6, 4);
    second.hp = 2;
    strike(state, archer, 6, 4);
    rested(archer);
    createUnit(state, wild, 'warrior', 6, 4);
    strike(state, archer, 6, 4);
    expect(archer.experience).toBe(VETERAN);
  });

  it('takes the same unit on to Elite with fights against an empire', () => {
    const state = bench(true);
    const archer = createUnit(state, 0, 'archer', 4, 4);
    archer.experience = VETERAN;
    let shots = 0;
    while ((archer.experience ?? 0) < ELITE) {
      const doomed = createUnit(state, 1, 'warrior', 6, 4);
      doomed.hp = 2;
      rested(archer);
      strike(state, archer, 6, 4);
      expect(state.units.some((unit) => unit.id === doomed.id)).toBe(false);
      shots += 1;
      if (shots > 10) throw new Error('never reached Elite');
    }
    expect(archer.experience).toBe(VETERAN + shots * KILL);
    expect(rankOf(archer)).toBe('elite');
  });

  it('pays a barbarian fight from below the cap up to it, and a fight with an empire in full', () => {
    expect(experienceAfter(0, 'kill', true)).toBe(KILL);
    expect(experienceAfter(VETERAN - 1, 'kill', true)).toBe(VETERAN);
    expect(experienceAfter(VETERAN, 'survived', true)).toBe(VETERAN);
    expect(experienceAfter(ELITE, 'kill', true)).toBe(ELITE);
    expect(experienceAfter(VETERAN, 'survived', false)).toBe(VETERAN + SURVIVE);
  });

  it('never pays a barbarian unit', () => {
    const state = bench(true);
    const wild = wildId(state);
    const raider = createUnit(state, wild, 'warrior', 6, 4);
    const ours = createUnit(state, 0, 'warrior', 5, 4);
    const outcome = strike(state, raider, 5, 4);
    expect(outcome.attackerSurvived).toBe(true);
    expect(raider.experience).toBeUndefined();
    // The piece it struck lived, and earns its survival under the cap.
    expect(ours.experience).toBe(SURVIVE);
    // And the seam refuses the wild directly, whoever is on the other side.
    awardExperience(state, raider, 'kill', 0);
    expect(raider.experience).toBeUndefined();
  });

  it('counts a barbarian won over by Blood Brothers as a kill, under the cap', () => {
    const state = bench(true);
    const wild = wildId(state);
    state.players[0]!.statecraft.doctrines.push('wolfMothersPact' as never);
    bumpRevision(state);
    const archer = createUnit(state, 0, 'archer', 4, 4);
    archer.experience = VETERAN - 1;
    const raider = createUnit(state, wild, 'warrior', 6, 4);
    raider.hp = 2;
    const outcome = strike(state, archer, 6, 4);
    expect(outcome.capturedUnitId).toBe(raider.id);
    expect(raider.ownerId).toBe(0);
    expect(archer.experience).toBe(VETERAN);
    // The raider joined with what it had, which for a barbarian is nothing.
    expect(raider.experience).toBeUndefined();
  });
});

// --- the strength line ------------------------------------------------------

describe('the strength line', () => {
  it('is one flat line for the rank held, labelled with its name, and nothing below the first rank', () => {
    expect(rankStrengthLines({})).toEqual([]);
    expect(rankStrengthLines({ experience: VETERAN - 1 })).toEqual([]);
    expect(rankStrengthLines({ experience: VETERAN })).toEqual([
      { source: 'Veteran', amount: rankStrength('veteran') },
    ]);
    // One line for an Elite, never the Veteran line beside it.
    expect(rankStrengthLines({ experience: ELITE })).toEqual([
      { source: 'Elite', amount: rankStrength('elite') },
    ]);
  });

  it('joins the attacker’s ledger and the defender’s, and each strength is still the fold', () => {
    const state = bench();
    const attacker = createUnit(state, 0, 'warrior', 4, 4);
    const defender = createUnit(state, 1, 'warrior', 5, 4);
    attacker.experience = ELITE;
    defender.experience = VETERAN;
    const card = forecast(state, attacker, 5, 4);
    expect(card.attackerLines).toContainEqual({ source: 'Elite', amount: rankStrength('elite') });
    expect(card.attackerLines.some((line) => line.source === 'Veteran')).toBe(false);
    expect(card.defenderLines).toContainEqual({ source: 'Veteran', amount: rankStrength('veteran') });
    expect(card.attackerStrength).toBe(foldCombatStrength(card.attackerLines));
    expect(card.defenderStrength).toBe(foldCombatStrength(card.defenderLines));
    // Two warriors: the whole difference between the strengths is the ranks.
    expect(card.attackerStrength - card.defenderStrength).toBe(
      rankStrength('elite') - rankStrength('veteran'),
    );
  });

  it('moves the forecast, and the fight lands inside the forecast it moved', () => {
    const plain = bench();
    const a = createUnit(plain, 0, 'warrior', 4, 4);
    createUnit(plain, 1, 'warrior', 5, 4);
    const before = forecast(plain, a, 5, 4);

    const ranked = bench();
    const b = createUnit(ranked, 0, 'warrior', 4, 4);
    createUnit(ranked, 1, 'warrior', 5, 4);
    b.experience = VETERAN;
    const after = forecast(ranked, b, 5, 4);
    expect(after.damageToDefender).toBeGreaterThan(before.damageToDefender);
    expect(after.damageToAttacker).toBeLessThan(before.damageToAttacker);

    const outcome = strike(ranked, b, 5, 4);
    expect(outcome.damageToDefender).toBeGreaterThanOrEqual(after.damageToDefenderMin);
    expect(outcome.damageToDefender).toBeLessThanOrEqual(after.damageToDefenderMax);
  });

  it('is the same flat figure in every age, not a share of the unit’s own strength', () => {
    const state = bench();
    const early = createUnit(state, 0, 'warrior', 4, 2);
    const late = createUnit(state, 0, 'longswordsman', 4, 6);
    createUnit(state, 1, 'warrior', 5, 2);
    createUnit(state, 1, 'warrior', 5, 6);
    early.experience = VETERAN;
    late.experience = VETERAN;
    const veteranLine = (unit: Unit, col: number, row: number) =>
      forecast(state, unit, col, row).attackerLines.find((line) => line.source === 'Veteran')!.amount;
    expect(veteranLine(early, 5, 2)).toBe(rankStrength('veteran'));
    expect(veteranLine(late, 5, 6)).toBe(rankStrength('veteran'));
  });

  it('gives a town defending its walls no rank, whatever stands in it', () => {
    const state = bench();
    foundCityAt(state, 0, at(state, 1, 1));
    foundCityAt(state, 1, at(state, 8, 4));
    const garrison = createUnit(state, 1, 'warrior', 8, 4);
    garrison.experience = ELITE;
    const attacker = createUnit(state, 0, 'warrior', 7, 4);
    attacker.experience = VETERAN;
    const card = forecast(state, attacker, 8, 4);
    expect(card.cityPhase).toBe('walls');
    expect(card.attackerLines).toContainEqual({ source: 'Veteran', amount: rankStrength('veteran') });
    expect(card.defenderLines.some((line) => line.source === 'Elite')).toBe(false);
  });
});

// --- persistence ------------------------------------------------------------

// --- experience from a card (Dominion batch D1) ------------------------------

describe('experience from a card', () => {
  it('names the ranks a raise reaches, lowest first', () => {
    expect(ranksReached(0, VETERAN - 1)).toEqual([]);
    expect(ranksReached(0, VETERAN)).toEqual(['veteran']);
    expect(ranksReached(VETERAN - 1, ELITE)).toEqual(['veteran', 'elite']);
    expect(ranksReached(VETERAN, ELITE)).toEqual(['elite']);
    expect(ranksReached(ELITE, ELITE + 5)).toEqual([]);
    expect(ranksReached(ELITE, 0)).toEqual([]);
  });

  it('adds a card’s experience with no barbarian cap, and says what it reached', () => {
    const state = bench(true);
    const piece = createUnit(state, 0, 'warrior', 4, 4);
    expect(grantExperience(state, piece, VETERAN)).toEqual(['veteran']);
    // A card's grant is not a fight with the wild, so the cap does not stop it.
    expect(grantExperience(state, piece, ELITE - VETERAN)).toEqual(['elite']);
    expect(piece.experience).toBe(ELITE);
    // Nothing below one point is written.
    expect(grantExperience(state, piece, 0.5)).toEqual([]);
    expect(piece.experience).toBe(ELITE);
  });

  it('gives a civilian and a barbarian unit nothing', () => {
    const state = bench(true);
    const worker = createUnit(state, 0, 'worker', 4, 4);
    expect(grantExperience(state, worker, ELITE)).toEqual([]);
    expect(raiseToRank(state, worker, 'veteran')).toEqual([]);
    expect(worker.experience).toBeUndefined();
    const raider = createUnit(state, wildId(state), 'warrior', 6, 6);
    expect(grantExperience(state, raider, ELITE)).toEqual([]);
    expect(raider.experience).toBeUndefined();
  });

  it('raises a unit to a rank, and leaves one already there alone', () => {
    const state = bench();
    const fresh = createUnit(state, 0, 'warrior', 4, 4);
    expect(raiseToRank(state, fresh, 'veteran')).toEqual(['veteran']);
    expect(fresh.experience).toBe(VETERAN);
    const seasoned = createUnit(state, 0, 'warrior', 6, 4);
    seasoned.experience = VETERAN + 2;
    expect(raiseToRank(state, seasoned, 'veteran')).toEqual([]);
    expect(seasoned.experience).toBe(VETERAN + 2);
  });
});

describe('experience stays with the unit', () => {
  it('survives an automatic upgrade, and so does the rank', () => {
    const state = bench();
    const archer = createUnit(state, 0, 'archer', 4, 4);
    archer.experience = VETERAN + 1;
    const player = state.players[0]!;
    const tech = UNIT_UNLOCK_TECH.get('bowman');
    expect(tech).toBeDefined();
    player.techsResearched.push(tech!);
    bumpRevision(state);
    upgradeUnits(state, player);
    const after = state.units.find((unit) => unit.id === archer.id)!;
    expect(after.type).toBe('bowman');
    expect(after.experience).toBe(VETERAN + 1);
    expect(rankOf(after)).toBe('veteran');
  });

  it('survives a change of owner', () => {
    const state = bench();
    const piece = createUnit(state, 1, 'warrior', 4, 4);
    piece.experience = ELITE;
    captureUnit(state, piece, 0);
    expect(piece.ownerId).toBe(0);
    expect(piece.experience).toBe(ELITE);
    expect(rankOf(piece)).toBe('elite');
  });
});

// --- the register -----------------------------------------------------------

/**
 * The simulation's sources, read as text: a writer and a caller are facts
 * about the file, which is how `weariness.test.ts` pins its own register.
 */
const SOURCES = {
  ...import.meta.glob('../../src/sim/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../src/sim/*/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../src/ai/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../src/ui/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../src/render3d/*.ts', { eager: true, query: '?raw', import: 'default' }),
} as Record<string, string>;

const FUNCTION_START =
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/;

/** `file#function` for every line matching `pattern`, comments skipped. */
function sitesOf(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const [path, text] of Object.entries(SOURCES)) {
    const file = path.slice(path.lastIndexOf('/') + 1);
    const lines = text.split('\n');
    for (const [index, raw] of lines.entries()) {
      const code = raw.split('//')[0]!;
      if (code.trim().startsWith('*')) continue;
      if (!pattern.test(code)) continue;
      let fn = '(top level)';
      for (let back = index; back >= 0; back--) {
        const match = FUNCTION_START.exec(lines[back]!);
        if (match) {
          fn = match[1] ?? match[2] ?? fn;
          break;
        }
      }
      found.push(`${file}#${fn}`);
    }
  }
  return found.sort();
}

describe('the register', () => {
  it('writes a unit’s experience in one place', () => {
    const writes = sitesOf(/\.experience\s*=[^=]|delete\s+\w+(\.\w+)*\.experience\b/);
    expect(writes).toEqual(['ranks.ts#writeExperience']);
    // And the writer is reached only through the three ways to raise it.
    expect(sitesOf(/(?<!function )\bwriteExperience\(/)).toEqual([
      'ranks.ts#awardExperience',
      'ranks.ts#grantExperience',
      'ranks.ts#raiseToRank',
    ]);
  });

  it('pays a fight’s experience from the fight and nowhere else', () => {
    // One for the attacker and one for a defending unit, both at the end of
    // `applyCombat`. A new way to fight joins this list, or it is a fight
    // nobody learns from.
    const callers = sitesOf(/(?<!function )\bawardExperience\(/);
    expect(callers).toEqual(['combat.ts#applyCombat', 'combat.ts#applyCombat']);
  });

  it('pays a card’s experience from the drill and the gaining of a unit, and a rank from a founding', () => {
    // Dominion batch D1. The drill phase (The Drill Grounds, The Regimental
    // Schools, The Tactica) and `realiseItem` (The Training Cadre, The Drill
    // Masters, The Devshirme) grant experience; a founding (The Armed Colony)
    // raises its escort to a rank. Since Dominion batch D8 a capture (The
    // Soldiers' Share) raises the units around it a rank too (`rallyAround`).
    // A new way for a card to hand out experience joins one of these lists.
    expect(sitesOf(/(?<!function )\bgrantExperience\(/)).toEqual([
      'cities.ts#realiseItem',
      'evaluator.ts#drillUnits',
    ]);
    expect(sitesOf(/(?<!function )\braiseToRank\(/)).toEqual([
      'cities.ts#foundCityAt',
      'evaluator.ts#rallyAround',
    ]);
  });

  it('settles the ranks reached wherever experience rises, and keeps the record in one place', () => {
    // Every caller of the three raises hands what it reached to
    // `settleRanksEarned`, so a rank earned in any of the four ways pays the
    // cards that pay on the moment. The lifetime record is written there and
    // nowhere else.
    expect(sitesOf(/(?<!function )\bsettleRanksEarned\(/)).toEqual([
      'cities.ts#foundCityAt',
      'cities.ts#realiseItem',
      'combat.ts#applyCombat',
      'combat.ts#applyCombat',
      'evaluator.ts#drillUnits',
      'evaluator.ts#rallyAround',
    ]);
    expect(sitesOf(/\.ranksEarned\s*(=[^=]|\+=)/)).toEqual(['cities.ts#settleRanksEarned']);
  });
});

// --- the interface's readouts ----------------------------------------------

describe('the unit panel’s figures', () => {
  it('counts experience toward the next rank, and alone at the top', () => {
    const state = bench();
    const piece = createUnit(state, 0, 'warrior', 4, 4);
    expect(experienceFigure(piece)).toBe(`0/${VETERAN}`);
    piece.experience = VETERAN + 1;
    expect(experienceFigure(piece)).toBe(`${VETERAN + 1}/${ELITE}`);
    piece.experience = ELITE + 2;
    expect(experienceFigure(piece)).toBe(String(ELITE + 2));
  });

  it('notes the rank’s strength beside its name, and nothing for a piece without one', () => {
    const state = bench();
    const piece = createUnit(state, 0, 'warrior', 4, 4);
    expect(rankNote(piece)).toBeNull();
    piece.experience = VETERAN;
    expect(rankNote(piece)).toBe(`+${rankStrength('veteran')} Veteran`);
    piece.experience = ELITE;
    expect(rankNote(piece)).toBe(`+${rankStrength('elite')} Elite`);
  });
});

// --- the bots ---------------------------------------------------------------

describe('the bots keep a wounded veteran out of a fight it is likely to lose', () => {
  /**
   * A bot seat with a held town far from the action, at war with its neighbour,
   * and a spearman of its own on open ground with an enemy swordsman next to
   * it. The swordsman is the stronger piece, so the blow deals less than it
   * takes. The seat is tuned to take any blow that deals anything (no strike
   * floor, full appetite), so the only thing that can refuse the blow is the
   * clause under test.
   */
  function front(rank: number | undefined, hp: number, enemyHp = 100) {
    const state = newGame({
      seed: 11,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00' },
        { name: 'Bors', color: '#00a' },
      ],
    });
    state.map = createMap({ width: 20, height: 12, terrain: 'grassland' });
    resetVisibility(state);
    state.tileOwner = new Array<number | null>(20 * 12).fill(null);
    state.units = [];
    state.cities = [];
    state.camps = [];
    state.nextEntityId = 1;
    const city = foundCityAt(state, 0, at(state, 2, 2));
    const garrison = createUnit(state, 0, 'warrior', city.col, city.row);
    garrison.fortifiedTurns = 0;
    state.players[0]!.gold = 120;
    openWar(state, 0, 1);
    const piece = createUnit(state, 0, 'spearman', 8, 6);
    if (rank !== undefined) piece.experience = rank;
    piece.hp = hp;
    const enemy = createUnit(state, 1, 'swordsman', 9, 6);
    enemy.hp = enemyHp;
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, piece };
  }

  /** The seat's decisions, driven until one is an order to this piece. */
  function orderFor(state: GameState, unitId: number, budget = 8): BotDecision | null {
    for (let guard = 0; guard < budget; guard++) {
      const decision = nextBotDecision(state, 0);
      if (decision === null) return null;
      if ((decision.command as { unitId?: number }).unitId === unitId) return decision;
      if (!applyCommand(state, decision.command).ok) return null;
    }
    return null;
  }

  /** Every label in a decision's term trees, flattened. */
  function labels(decision: BotDecision): string {
    const walk = (terms: readonly ValueTerm[]): string =>
      terms
        .map((term) => (term.parts === undefined ? term.label : `${term.label} | ${walk(term.parts)}`))
        .join(' | ');
    return decision.candidates.map((row) => `${row.label}: ${walk(row.terms)}`).join(' || ');
  }

  const RECKLESS = { military: { strikeFloor: 0, aggression: 1 } };

  it('ships the threshold as a plain knob on the sheet, which every persona reads', () => {
    const below = aiConfigFor().military.veteranCautionBelow;
    expect(below).toBeGreaterThan(0);
    expect(below).toBeLessThanOrEqual(1);
    expect(aiConfigFor('warmonger').military.veteranCautionBelow).toBe(below);
  });

  it('takes the losing blow with an unranked piece, as the tuning asks', () => {
    // The control: the same board without a rank swings, so the refusal below
    // is the clause and not the board.
    withAiTuning(RECKLESS, () => {
      const { state, piece } = front(undefined, 60);
      const blow = forecast(state, piece, 9, 6);
      expect(blow.damageToDefender).toBeLessThan(blow.damageToAttacker);
      const decision = orderFor(state, piece.id);
      expect(decision?.command).toMatchObject({ type: 'attack', target: { col: 9, row: 6 } });
    });
  });

  it('holds a wounded Veteran out of the same blow, and prints why', () => {
    withAiTuning(RECKLESS, () => {
      const { state, piece } = front(VETERAN, 60);
      const blow = forecast(state, piece, 9, 6);
      // Still a losing blow with the rank's strength in it.
      expect(blow.damageToDefender).toBeLessThanOrEqual(blow.damageToAttacker);
      const decision = orderFor(state, piece.id);
      expect(decision).not.toBeNull();
      expect(decision!.command.type).not.toBe('attack');
      expect(labels(decision!)).toMatch(/a wounded Veteran on 60 of 100 hit points/);
      expect(labels(decision!)).toMatch(/keeps its veterans out of a fight they are losing/);
      for (const row of decision!.candidates) {
        if (row.rejected !== undefined) continue;
        expect(foldTerms(row.terms)).toBe(row.score);
      }
      expect(applyCommand(state, decision!.command).ok).toBe(true);
    });
  });

  it('takes it again with the knob at nought, which turns the clause off', () => {
    withAiTuning({ military: { ...RECKLESS.military, veteranCautionBelow: 0 } }, () => {
      const { state, piece } = front(VETERAN, 60);
      const decision = orderFor(state, piece.id);
      expect(decision?.command).toMatchObject({ type: 'attack', target: { col: 9, row: 6 } });
    });
  });

  it('lets a Veteran at full health take it', () => {
    withAiTuning(RECKLESS, () => {
      const { state, piece } = front(VETERAN, 100);
      const decision = orderFor(state, piece.id);
      expect(decision?.command).toMatchObject({ type: 'attack', target: { col: 9, row: 6 } });
    });
  });

  it('lets a wounded Veteran take a blow that finishes the enemy', () => {
    withAiTuning(RECKLESS, () => {
      const { state, piece } = front(VETERAN, 60, 1);
      const decision = orderFor(state, piece.id);
      expect(decision?.command).toMatchObject({ type: 'attack', target: { col: 9, row: 6 } });
    });
  });
});

// --- the log ----------------------------------------------------------------

describe('the log', () => {
  /** A free dry hex beside this one, in the map's own neighbour order. */
  function besideOf(state: GameState, col: number, row: number): Tile {
    const here = at(state, col, row);
    const free = tileNeighbors(state.map, here).find(
      (tile) =>
        isPassable(tile) &&
        !state.units.some((unit) => unit.col === tile.col && unit.row === tile.row) &&
        !state.cities.some((city: City) => city.col === tile.col && city.row === tile.row),
    );
    if (!free) throw new Error(`nothing free beside (${col}, ${row})`);
    return free;
  }

  it('replays a war that made a veteran to the same state', () => {
    const config = {
      seed: 909,
      sizeName: 'duel' as const,
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };
    const game = createGame(config);
    const state = game.state;
    for (const owner of [0, 1]) {
      const settler = state.units.find((unit) => unit.ownerId === owner && unit.type === 'settler')!;
      expect(dispatch(game, { type: 'foundCity', playerId: owner, settlerUnitId: settler.id }).ok).toBe(true);
    }
    expect(dispatch(game, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);

    // One fire lance of seat 0's, beside seat 1's town, and a warrior of seat
    // 1's spawned beside it again and again until the lance has killed enough
    // of them to be a Veteran.
    const home = state.cities.find((city) => city.ownerId === 1)!;
    const prey = besideOf(state, home.col, home.row);
    const post = besideOf(state, prey.col, prey.row);
    expect(
      dispatch(game, { type: 'spawnUnit', playerId: 0, ownerId: 0, unitType: 'fireLance', at: { col: post.col, row: post.row } }).ok,
    ).toBe(true);
    const lance = state.units.find((unit) => unit.col === post.col && unit.row === post.row && unit.ownerId === 0)!;
    for (let guard = 0; guard < 12 && rankOf(lance) === null; guard++) {
      const target = besideOf(state, lance.col, lance.row);
      expect(
        dispatch(game, { type: 'spawnUnit', playerId: 1, ownerId: 1, unitType: 'warrior', at: { col: target.col, row: target.row } }).ok,
      ).toBe(true);
      dispatch(game, { type: 'attack', playerId: 0, unitId: lance.id, target: { col: target.col, row: target.row } });
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    expect(rankOf(lance)).toBe('veteran');
    for (let turn = 0; turn < 2; turn++) {
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(state));
  });
});
