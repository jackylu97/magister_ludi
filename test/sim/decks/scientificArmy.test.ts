/**
 * **Scientific batch S9, the army and the Opus**
 * (`docs/plans/scientific-build-triage.md`, the S9 section and readings 9, 11
 * and 41 to 52, and the new readings 95 to 101, which the report lists).
 *
 * What this file checks:
 *
 *   - the nine Scientific rows and the shared The Soldier-Scholars are dealt,
 *     typed and worded as `docs/decks/scientific.md` writes them, and print in
 *     plain words through the describers;
 *   - the new shapes:
 *       - the behaviour rules `upgradeHeals` and `upgradeIgnoresResource`,
 *         read by `upgradeUnits` for a piece, and the mark `Unit.unsupplied`
 *         that keeps a piece upgraded past the gate off the copies ledger;
 *       - `UnitFilter.newestAge`, which `unitMatches` answers only with the
 *         owner's age in hand;
 *       - the combat conditions `nearLearning` and `standingInOwnTown`;
 *       - the `opusBreach` rule and the blow that takes hammers off an Opus;
 *       - the `opusEarly` door and the Opus's completion hold;
 *       - the `closedBook` record on the state and the refusal it brings;
 *       - the `opusCost` commission figure, a reward toward the Opus, and the
 *         `notDealtKnowing` deal gate;
 *       - the `prototypes` arm of `isUnlocked`, its cost line, and the hold on
 *         a row whose research moved on;
 *   - each card on a board, each checking both sides of the line it draws.
 */

import { describe, expect, it } from 'vitest';

import { type BuildingId } from '../../../src/sim/buildingData';
import { applyCombat, cityMaxHp, previewCombat } from '../../../src/sim/combat';
import {
  buildingProductionCost,
  committedCopies,
  explainBuildingCost,
  explainUnitCost,
  foldUnitCost,
  foundCityAt,
  planProduction,
  unitProductionCost,
} from '../../../src/sim/cities';
import { commissionFigure, runCommissions } from '../../../src/sim/commissions';
import { type Tile, createMap, getTileAt, raiseImprovement } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import {
  type City,
  type EarnedBead,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  cardOpusEarlyPercent,
  cardPrototypePercent,
  commissionFulfilledTurn,
  describeCard,
  eligibleFor,
  ownerAgeOf,
  stripRefs,
  unitMatches,
} from '../../../src/sim/statecraft';
import { cardProduction } from '../../../src/sim/statecraft/evaluator';
import { type CardType, type OrderId, type OrderRarity, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import {
  buildError,
  completionHeldFor,
  explainTechCost,
  foldTechCost,
  isUnlocked,
  settleResearch,
  upgradeTargetFor,
  upgradeTargetForType,
  upgradeUnits,
} from '../../../src/sim/tech';
import { BEAD_FEAT_IDS, beadFeatDef } from '../../../src/sim/beadData';
import { BEAD_RULES } from '../../../src/sim/beadData';
import { type TechId } from '../../../src/sim/techData';
import { unitMaxHp } from '../../../src/sim/unitData';
import { unitHealthBonus } from '../../../src/sim/resourceEffects';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { explainCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

// --- the bench -----------------------------------------------------------------

/** Two seats on a flat grassland board, at war, with nothing on it. */
function bench(): GameState {
  const width = 20;
  const height = 12;
  const state = newGame({
    seed: 9,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, decks: ['scientific', 'dominion'] },
      { name: 'Bors', color: '#3a7fe8', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(4242);
  const seats = realPlayers(state);
  openWar(state, seats[0]!.id, seats[1]!.id);
  bumpRevision(state);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A town for a seat, with an empty queue. The first one a seat founds is its capital. */
function town(state: GameState, playerId: number, col: number, row: number, population = 1): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.queue = [];
  city.population = population;
  bumpRevision(state);
  return city;
}

/** Grants a card and seats it, the way `scientific.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Takes a card out of its chair and leaves it in the collection. */
function unseat(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  sc.slots = sc.slots.filter((held) => held?.card !== id);
  bumpRevision(state);
}

/** Teaches a seat technologies, the way a finished research leaves them. */
function learn(state: GameState, playerId: number, ...techs: TechId[]): void {
  const player = playerById(state, playerId)!;
  for (const tech of techs) if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  bumpRevision(state);
}

/** Everything visible to everybody: the fog is not the subject here. */
function seeAll(state: GameState): void {
  for (const player of state.players) state.visibility[player.id]!.fill(2);
}

/** The strength lines on one side of a forecast whose label holds `name`. */
function lines(state: GameState, attacker: Unit, col: number, row: number, side: 'attacker' | 'defender', name: string): number {
  seeAll(state);
  const view = previewCombat(state, attacker.id, { col, row });
  if (!view.ok) throw new Error(view.error);
  const list = side === 'attacker' ? view.attackerLines : view.defenderLines;
  return list.filter((line) => line.source.includes(name)).reduce((sum, line) => sum + line.amount, 0);
}

/** A great person of one seat, standing on a hex. */
function person(state: GameState, playerId: number, col: number, row: number, who: string): Unit {
  const unit = createUnit(state, playerId, 'greatPerson', col, row, who as never);
  bumpRevision(state);
  return unit;
}

/** A full rod of beads, of a row whose boon pays no lasting step. */
function fillRod(state: GameState, playerId: number): void {
  const id = BEAD_FEAT_IDS[0]!;
  const family = beadFeatDef(id).family;
  const rod: EarnedBead[] = Array.from({ length: BEAD_RULES.threshold }, () => ({
    id,
    kind: 'feat' as const,
    family,
    turn: 1,
  }));
  playerById(state, playerId)!.beads = rod;
  bumpRevision(state);
}

/** Completes a technology through the one completion routine, with exactly its price banked. */
function complete(state: GameState, playerId: number, tech: TechId): void {
  const player = playerById(state, playerId)!;
  player.researching = tech;
  player.researchQueue = [];
  player.sciencePool = foldTechCost(explainTechCost(state, player, tech));
  const done = settleResearch(state, player);
  expect(done?.techId, tech).toBe(tech);
  bumpRevision(state);
}

/** The sum of one voice over a town's ledger lines whose label holds `name`. */
function cityLines(state: GameState, city: City, name: string, voice: 'science' | 'production'): number {
  return explainCity(state, city)
    .lines.filter((line) => line.source.includes(name))
    .reduce((sum, line) => sum + line[voice], 0);
}

/** The words a card prints, with the keyword marks stripped. */
function said(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

const OPUS: BuildingId = 'theMagnumOpus';

// --- the rows --------------------------------------------------------------------

const S9: readonly { id: OrderId; band: number; rarity: OrderRarity; type: CardType; decks: string[] }[] = [
  { id: 'theFieldRefits', band: 1, rarity: 'uncommon', type: 'military', decks: ['scientific'] },
  { id: 'theStrategikon', band: 2, rarity: 'uncommon', type: 'military', decks: ['scientific'] },
  { id: 'theArmouryPatterns', band: 2, rarity: 'common', type: 'military', decks: ['scientific'] },
  { id: 'theModelArmy', band: 3, rarity: 'rare', type: 'military', decks: ['scientific'] },
  { id: 'theGreatInstrument', band: 4, rarity: 'rare', type: 'wildcard', decks: ['scientific'] },
  { id: 'theFoundationStone', band: 4, rarity: 'rare', type: 'economic', decks: ['scientific'] },
  { id: 'theClosedBook', band: 4, rarity: 'rare', type: 'civic', decks: ['scientific'] },
  { id: 'theBreachingBatteries', band: 4, rarity: 'uncommon', type: 'military', decks: ['scientific'] },
  { id: 'thePrototypeWorks', band: 4, rarity: 'rare', type: 'economic', decks: ['scientific'] },
  {
    id: 'scientificTheSoldierScholars',
    band: 2,
    rarity: 'uncommon',
    type: 'military',
    decks: ['dominion', 'scientific'],
  },
];

describe('the rows', () => {
  it('deals the ten rows with their band, rarity, type and decks, and prints each in words', () => {
    for (const row of S9) {
      const def = orderDef(row.id);
      expect(orderIsDealt(row.id), row.id).toBe(true);
      expect(def.band, row.id).toBe(row.band);
      expect(def.rarity, row.id).toBe(row.rarity);
      expect(def.type, row.id).toBe(row.type);
      expect(def.decks, row.id).toEqual(row.decks);
      expect(def.deferred, row.id).toBeUndefined();
      expect(def.text, row.id).toBeTruthy();
      const words = said(row.id);
      expect(words.length, row.id).toBeGreaterThan(0);
      for (const line of words) {
        expect(line, row.id).not.toContain('[[');
        expect(line, row.id).not.toMatch(/\bundefined\b|\bNaN\b/);
      }
    }
  });

  it('says what each new shape does in plain words', () => {
    expect(said('theFieldRefits')).toEqual(['each time research upgrades one of your units, it heals fully']);
    expect(said('theStrategikon')).toEqual([
      '+4 combat strength while within 2 hexes of your great general, your great scholar or your Academy',
    ]);
    expect(said('theArmouryPatterns')).toEqual(['+25% production toward units of the newest age you know']);
    expect(said('theModelArmy')).toEqual([
      'research upgrades your units even when you lack the strategic resource the new unit needs',
    ]);
    expect(said('theGreatInstrument')).toContain('not dealt to an empire that knows Alchemy');
    expect(said('theGreatInstrument')).toContain(
      'Reward: production toward the Magnum Opus equal to 10% of its cost at that moment',
    );
    expect(said('theClosedBook')).toEqual([
      'if you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns',
    ]);
    expect(said('theBreachingBatteries')).toEqual([
      '+5 combat strength for siege units against cities',
      'each blow your siege units land on a city building the Magnum Opus removes 5% of the production banked toward it',
    ]);
    expect(said('scientificTheSoldierScholars')).toEqual([
      '+5 combat strength for military units while standing in one of your cities',
      '+2 science in every city per combat unit standing there',
    ]);
  });
});

// --- the army ------------------------------------------------------------------------

describe('The Field Refits (reading 41)', () => {
  it('heals a unit fully when research upgrades it, and only while seated', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const archer = createUnit(state, 0, 'archer', 6, 6);
    const other = createUnit(state, 0, 'archer', 7, 6);
    const empireHp = unitHealthBonus(state, 0);
    archer.hp = Math.floor(unitMaxHp(archer, empireHp) / 2);
    other.hp = Math.floor(unitMaxHp(other, empireHp) / 2);
    // Without the card an upgrade keeps the health fraction.
    learn(state, 0, 'siegecraft');
    upgradeUnits(state, playerById(state, 0)!);
    expect(archer.type).toBe('bowman');
    expect(archer.hp).toBeLessThan(unitMaxHp(archer, empireHp));
    // With it, the next upgrade heals fully.
    slot(state, 0, 'theFieldRefits');
    other.type = 'archer';
    upgradeUnits(state, playerById(state, 0)!);
    expect(other.type).toBe('bowman');
    expect(other.hp).toBe(unitMaxHp(other, empireHp));
  });
});

describe('The Model Army (reading 42)', () => {
  it('upgrades a piece without the resource, marks it as holding no copy, and leaves the build list alone', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const warrior = createUnit(state, 0, 'warrior', 6, 6);
    learn(state, 0, 'bronzePanoply');
    // No copper or obsidian: the ordinary gate stops the climb.
    expect(upgradeTargetFor(state, warrior)).toBeNull();
    upgradeUnits(state, playerById(state, 0)!);
    expect(warrior.type).toBe('warrior');
    slot(state, 0, 'theModelArmy');
    expect(upgradeTargetFor(state, warrior)).toBe('swordsman');
    upgradeUnits(state, playerById(state, 0)!);
    expect(warrior.type).toBe('swordsman');
    expect(warrior.unsupplied).toBe(true);
    // The piece holds no copy, so it claims none on the ledger.
    expect(committedCopies(state, 0, 'copper')).toBe(0);
    expect(committedCopies(state, 0, 'obsidian')).toBe(0);
    // A new unit still needs the resource: the type's reading keeps the gate.
    expect(upgradeTargetForType(state, 0, 'warrior')).toBeNull();
    expect(buildError(state, 0, 'unit', 'swordsman')).toMatch(/needs improved/);
    expect(buildError(state, 0, 'unit', 'warrior')).toBeNull();
  });
});

describe('The Armoury Patterns (reading 43)', () => {
  it('speeds units of the seat’s newest age, which charter technologies do not move', () => {
    const state = bench();
    const city = town(state, 0, 4, 4);
    slot(state, 0, 'theArmouryPatterns');
    const pays = (type: 'warrior' | 'bowman'): number =>
      cardProduction(state, city, 'unit', type)
        .filter((line) => line.card === 'theArmouryPatterns')
        .reduce((sum, line) => sum + line.percent, 0);
    expect(ownerAgeOf(state, 0)).toBe(1);
    expect(pays('warrior')).toBe(25);
    expect(pays('bowman')).toBe(0);
    // A charter technology of a later age moves nothing.
    learn(state, 0, 'surveying');
    expect(ownerAgeOf(state, 0)).toBe(1);
    expect(pays('warrior')).toBe(25);
    // A second-age technology moves the seat into the second age.
    learn(state, 0, 'siegecraft');
    expect(ownerAgeOf(state, 0)).toBe(2);
    expect(pays('warrior')).toBe(0);
    expect(pays('bowman')).toBe(25);
  });

  it('admits nothing when no owner’s age is handed in', () => {
    expect(unitMatches('warrior', { newestAge: true })).toBe(false);
    expect(unitMatches('warrior', { newestAge: true }, 1)).toBe(true);
    expect(unitMatches('warrior', { newestAge: true }, 2)).toBe(false);
  });
});

describe('The Strategikon (readings 11 and 44)', () => {
  it('adds +4 within two hexes of the seat’s own great general, beside the aura', () => {
    const state = bench();
    slot(state, 0, 'theStrategikon');
    const warrior = createUnit(state, 0, 'warrior', 6, 6);
    createUnit(state, 1, 'warrior', 7, 6);
    expect(lines(state, warrior, 7, 6, 'attacker', 'The Strategikon')).toBe(0);
    person(state, 0, 4, 6, 'hannibal');
    expect(lines(state, warrior, 7, 6, 'attacker', 'The Strategikon')).toBe(4);
    // The general's own aura is its own line, and the two stack.
    expect(lines(state, warrior, 7, 6, 'attacker', 'Great general')).toBeGreaterThan(0);
  });

  it('counts a great scholar, and only the seat’s own', () => {
    const state = bench();
    slot(state, 0, 'theStrategikon');
    const warrior = createUnit(state, 0, 'warrior', 6, 6);
    createUnit(state, 1, 'warrior', 7, 6);
    person(state, 1, 5, 6, 'imhotep');
    expect(lines(state, warrior, 7, 6, 'attacker', 'The Strategikon')).toBe(0);
    person(state, 0, 6, 5, 'imhotep');
    expect(lines(state, warrior, 7, 6, 'attacker', 'The Strategikon')).toBe(4);
  });

  it('counts an Academy inside the seat’s own borders, in defence too, and not a rival’s', () => {
    const state = bench();
    slot(state, 0, 'theStrategikon');
    const home = town(state, 0, 4, 4);
    const rival = town(state, 1, 12, 4);
    const defender = createUnit(state, 0, 'warrior', 5, 5);
    const attacker = createUnit(state, 1, 'warrior', 6, 5);
    expect(lines(state, attacker, 5, 5, 'defender', 'The Strategikon')).toBe(0);
    // A rival's Academy counts for nobody else.
    raiseImprovement(at(state, 11, 4), 'academy', state.turn);
    expect(state.tileOwner[11 + 4 * 20]).toBe(rival.id);
    bumpRevision(state);
    expect(lines(state, attacker, 5, 5, 'defender', 'The Strategikon')).toBe(0);
    // One of the seat's own, inside its borders and beside the defender.
    raiseImprovement(at(state, 4, 5), 'academy', state.turn);
    expect(state.tileOwner[4 + 5 * 20]).toBe(home.id);
    bumpRevision(state);
    expect(lines(state, attacker, 5, 5, 'defender', 'The Strategikon')).toBe(4);
    expect(defender.ownerId).toBe(0);
  });
});

describe('The Soldier-Scholars (reading 9)', () => {
  it('adds +5 to a military unit fighting from its own town, in attack and in defence', () => {
    const state = bench();
    slot(state, 0, 'scientificTheSoldierScholars');
    const home = town(state, 0, 4, 4);
    const inTown = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    expect(lines(state, inTown, 5, 4, 'attacker', 'The Soldier-Scholars')).toBe(5);
    // Out of town it is nothing.
    const afield = createUnit(state, 0, 'warrior', 4, 8);
    createUnit(state, 1, 'warrior', 5, 8);
    expect(lines(state, afield, 5, 8, 'attacker', 'The Soldier-Scholars')).toBe(0);
    // Defending its town once the walls are down.
    home.hp = 1;
    const rival = createUnit(state, 1, 'warrior', 4, 5);
    expect(lines(state, rival, 4, 4, 'defender', 'The Soldier-Scholars')).toBe(5);
  });

  it('pays +2 science in a town for each unit standing in it', () => {
    const state = bench();
    const home = town(state, 0, 4, 4);
    createUnit(state, 0, 'warrior', 4, 4);
    bumpRevision(state);
    expect(cityLines(state, home, 'The Soldier-Scholars', 'science')).toBe(0);
    slot(state, 0, 'scientificTheSoldierScholars');
    expect(cityLines(state, home, 'The Soldier-Scholars', 'science')).toBe(2);
  });
});

// --- the Opus ------------------------------------------------------------------------

describe('The Breaching Batteries (reading 52)', () => {
  it('gives siege units +5 against a city, and each blow takes 5% of the banked Opus', () => {
    const state = bench();
    slot(state, 0, 'theBreachingBatteries');
    town(state, 0, 2, 2);
    const target = town(state, 1, 8, 4, 6);
    const catapult = createUnit(state, 0, 'catapult', 6, 4);
    expect(lines(state, catapult, 8, 4, 'attacker', 'The Breaching Batteries')).toBe(5);
    // A town not raising the Opus loses nothing.
    target.queue = [{ kind: 'building', id: 'granary' }];
    target.hammerBasket = 400;
    bumpRevision(state);
    seeAll(state);
    const first = applyCombat(state, catapult.id, { col: 8, row: 4 });
    expect(first.ok).toBe(true);
    expect(target.hammerBasket).toBe(400);
    // Raising the Opus, a blow takes a twentieth of what is banked, floored.
    target.queue = [{ kind: 'building', id: OPUS }];
    target.hammerBasket = 410;
    bumpRevision(state);
    const second = createUnit(state, 0, 'catapult', 6, 5);
    seeAll(state);
    const blow = applyCombat(state, second.id, { col: 8, row: 4 });
    expect(blow.ok).toBe(true);
    expect(target.hammerBasket).toBe(410 - 20);
    if (blow.ok) expect(blow.outcome.opusLoss).toEqual({ cityId: target.id, hammers: 20 });
    // A melee unit is not a siege unit, and takes nothing. The walls are
    // mended first, so the blow is not the one that takes the town.
    target.hp = cityMaxHp(target);
    bumpRevision(state);
    const sword = createUnit(state, 0, 'warrior', 7, 4);
    seeAll(state);
    const melee = applyCombat(state, sword.id, { col: 8, row: 4 });
    expect(melee.ok).toBe(true);
    expect(target.hammerBasket).toBe(390);
  });
});

describe('The Foundation Stone (reading 49)', () => {
  it('opens the Opus once half of Alchemy is banked, and holds it until the seat knows Alchemy', () => {
    const state = bench();
    const city = town(state, 0, 4, 4);
    fillRod(state, 0);
    const player = playerById(state, 0)!;
    expect(isUnlocked(state, 0, 'building', OPUS)).toBe(false);
    slot(state, 0, 'theFoundationStone');
    expect(cardOpusEarlyPercent(state, 0)).toBe(50);
    const cost = foldTechCost(explainTechCost(state, player, 'alchemy'));
    player.techProgress = { alchemy: Math.ceil(cost / 2) - 1 };
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'building', OPUS)).toBe(false);
    expect(buildError(state, 0, 'building', OPUS, city)).toMatch(/your Order opens it once you have put 50%/);
    player.techProgress = { alchemy: Math.ceil(cost / 2) };
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'building', OPUS)).toBe(true);
    expect(buildError(state, 0, 'building', OPUS, city)).toBeNull();
    // A rival without the card may not begin it.
    expect(isUnlocked(state, 1, 'building', OPUS)).toBe(false);
    // Begun, paid for in full, and held until the seat knows Alchemy.
    city.queue = [{ kind: 'building', id: OPUS }];
    city.hammerBasket = buildingProductionCost(OPUS, state, 0) + 10;
    bumpRevision(state);
    expect(completionHeldFor(state, 0, 'building', OPUS, city)).toBe('alchemy');
    expect(planProduction(state, city)).toBeNull();
    learn(state, 0, 'alchemy');
    expect(completionHeldFor(state, 0, 'building', OPUS, city)).toBeNull();
    expect(planProduction(state, city)?.kind).toBe('building');
  });

  it('holds an Opus begun early even after the card leaves, and lets the queue be edited', () => {
    const state = bench();
    const city = town(state, 0, 4, 4);
    fillRod(state, 0);
    const player = playerById(state, 0)!;
    slot(state, 0, 'theFoundationStone');
    player.techProgress = { alchemy: foldTechCost(explainTechCost(state, player, 'alchemy')) };
    city.queue = [{ kind: 'building', id: OPUS }];
    city.hammerBasket = buildingProductionCost(OPUS, state, 0) + 10;
    bumpRevision(state);
    unseat(state, 0, 'theFoundationStone');
    expect(planProduction(state, city)).toBeNull();
    // The standing row is excused at the gate, so the town may still queue more.
    expect(buildError(state, 0, 'building', OPUS, city)).toBeNull();
    // Another empire learning Alchemy opens the door for everyone.
    learn(state, 1, 'alchemy');
    expect(completionHeldFor(state, 0, 'building', OPUS, city)).toBeNull();
  });
});

describe('The Closed Book (reading 50)', () => {
  it('writes its record when the holder completes Alchemy first, and refuses the others for ten turns', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const rivalTown = town(state, 1, 12, 4);
    fillRod(state, 1);
    slot(state, 0, 'theClosedBook');
    state.turn = 40;
    complete(state, 0, 'alchemy');
    expect(state.closedBook).toEqual({ playerId: 0, turn: 40, until: 50 });
    expect(buildError(state, 1, 'building', OPUS, rivalTown)).toMatch(/Closed Book/);
    // The holder itself is never refused by it.
    fillRod(state, 0);
    expect(buildError(state, 0, 'building', OPUS)).toBeNull();
    // On the tenth turn after, the door opens again.
    state.turn = 50;
    bumpRevision(state);
    expect(buildError(state, 1, 'building', OPUS, rivalTown)).toBeNull();
    // And an empire that knows Alchemy is never refused by it.
    state.turn = 45;
    learn(state, 1, 'alchemy');
    expect(buildError(state, 1, 'building', OPUS, rivalTown)).toBeNull();
  });

  it('writes nothing when the card is not seated, or when the holder is second', () => {
    const state = bench();
    town(state, 0, 4, 4);
    town(state, 1, 12, 4);
    complete(state, 0, 'alchemy');
    expect(state.closedBook).toBeUndefined();
    const second = bench();
    town(second, 0, 4, 4);
    town(second, 1, 12, 4);
    slot(second, 0, 'theClosedBook');
    complete(second, 1, 'alchemy');
    complete(second, 0, 'alchemy');
    expect(second.closedBook).toBeUndefined();
  });
});

describe('The Great Instrument (reading 51)', () => {
  it('pays a tenth of the Opus toward the town raising it when Alchemy is completed', () => {
    const state = bench();
    const city = town(state, 0, 4, 4);
    learn(state, 1, 'alchemy');
    city.queue = [{ kind: 'building', id: OPUS }];
    city.hammerBasket = 0;
    bumpRevision(state);
    slot(state, 0, 'theGreatInstrument');
    const tenth = Math.floor(commissionFigure(state, 0, 'opusCost') * 0.1);
    expect(commissionFigure(state, 0, 'opusCost')).toBe(buildingProductionCost(OPUS, state, 0));
    complete(state, 0, 'alchemy');
    runCommissions(state);
    expect(commissionFulfilledTurn(playerById(state, 0)!.statecraft, 'theGreatInstrument')).toBe(state.turn);
    expect(city.hammerBasket).toBe(tenth);
  });

  it('keeps the production toward the Opus when no town raises it', () => {
    const state = bench();
    town(state, 0, 4, 4);
    slot(state, 0, 'theGreatInstrument');
    const tenth = Math.floor(commissionFigure(state, 0, 'opusCost') * 0.1);
    complete(state, 0, 'alchemy');
    runCommissions(state);
    expect(playerById(state, 0)!.opusBank).toBe(tenth);
  });

  it('is not dealt to a seat that knows Alchemy', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const player = playerById(state, 0)!;
    const late = 40;
    expect(eligibleFor(state, player, late)).toContain('theGreatInstrument');
    learn(state, 0, 'alchemy');
    expect(eligibleFor(state, player, late)).not.toContain('theGreatInstrument');
  });
});

describe('The Prototype Works (reading 48)', () => {
  it('opens the rows of the current research at double cost, never a wonder', () => {
    const state = bench();
    const city = town(state, 0, 4, 4);
    const player = playerById(state, 0)!;
    player.researching = 'mathematics';
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'unit', 'catapult')).toBe(false);
    slot(state, 0, 'thePrototypeWorks');
    expect(cardPrototypePercent(state, 0)).toBe(100);
    expect(isUnlocked(state, 0, 'unit', 'catapult')).toBe(true);
    expect(isUnlocked(state, 0, 'building', 'armoury')).toBe(true);
    expect(isUnlocked(state, 0, 'building', 'petra')).toBe(false);
    expect(buildError(state, 0, 'unit', 'catapult', city)).toBeNull();
    // The price: one labelled line, as much again as everything above it.
    const unitLines = explainUnitCost(state, 0, 'catapult');
    const line = unitLines.find((entry) => entry.source === 'Prototype +100%');
    expect(line).toBeDefined();
    expect(line!.amount).toBe(foldUnitCost(unitLines) - line!.amount);
    const building = explainBuildingCost('armoury', state, 0);
    expect(building.some((entry) => entry.source === 'Prototype +100%')).toBe(true);
    // A row of another technology is not opened.
    expect(isUnlocked(state, 0, 'unit', 'bowman')).toBe(false);
  });

  it('never upgrades the army into a prototype', () => {
    const state = bench();
    town(state, 0, 4, 4);
    const archer = createUnit(state, 0, 'archer', 6, 6);
    playerById(state, 0)!.researching = 'siegecraft';
    slot(state, 0, 'thePrototypeWorks');
    expect(isUnlocked(state, 0, 'unit', 'bowman')).toBe(true);
    expect(upgradeTargetFor(state, archer)).toBeNull();
    upgradeUnits(state, playerById(state, 0)!);
    expect(archer.type).toBe('archer');
  });

  it('holds a queued row whose research moved on, at its doubled price, until the technology is known', () => {
    const state = bench();
    const city = town(state, 0, 4, 4);
    const player = playerById(state, 0)!;
    player.researching = 'mathematics';
    slot(state, 0, 'thePrototypeWorks');
    const doubled = unitProductionCost(state, 0, 'catapult');
    city.queue = [{ kind: 'unit', id: 'catapult' }];
    city.hammerBasket = doubled + 5;
    bumpRevision(state);
    // While it is the research under way, the prototype finishes.
    expect(planProduction(state, city)?.kind).toBe('unit');
    // Research moves on: the row keeps its price and waits.
    player.researching = 'philosophy';
    bumpRevision(state);
    expect(unitProductionCost(state, 0, 'catapult')).toBe(doubled);
    expect(completionHeldFor(state, 0, 'unit', 'catapult', city)).toBe('mathematics');
    expect(planProduction(state, city)).toBeNull();
    // The standing row is excused at the gate, and a new one is refused.
    expect(buildError(state, 0, 'unit', 'catapult', city)).toBeNull();
    const other = town(state, 0, 10, 8);
    expect(buildError(state, 0, 'unit', 'catapult', other)).toMatch(/needs Mathematics/);
    // Once the technology is known it finishes at the ordinary price.
    learn(state, 0, 'mathematics');
    expect(unitProductionCost(state, 0, 'catapult')).toBeLessThan(doubled);
    expect(planProduction(state, city)?.kind).toBe('unit');
  });
});
