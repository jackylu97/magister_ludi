/**
 * **Scientific batch S1, the line traits** (`docs/plans/scientific-build-
 * triage.md`, the S1 section and readings 22 to 27; the rulings are in
 * `docs/plans/scientific-themes.md` section 3).
 *
 * A charter technology gives one line of units a trait: a small bonus and one
 * ability, kept through every upgrade. What this file checks:
 *
 *   - the register: every effect in a trait names the trait's line, and the
 *     six traits sit on the four technologies the rulings name;
 *   - the line filter: a line is the named unit and every unit its upgrade
 *     chain reaches, and nothing before it (reading 22);
 *   - the label "<technology> · <trait>" (reading 23), `unitTraits`, and the
 *     tally of pieces that gained a trait;
 *   - each trait in a fight or on the move: the Hoplite (reading 26), the
 *     Maryannu, the Grenadier (reading 27), the Onager and the Repeating
 *     Crossbow (reading 24). The Galleass and its blockade are in
 *     `test/sim/naval.test.ts`, beside the other blockade tests;
 *   - the three charters that are dealt now, and their words.
 */

import { describe, expect, it } from 'vitest';

import { applyCombat, previewCombat } from '../../../src/sim/combat';
import { foundCityAt } from '../../../src/sim/cities';
import { dispatch } from '../../../src/sim/game';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import { RULES } from '../../../src/sim/rulesData';
import {
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  describeCard,
  eligibleFor,
  filterWords,
  liveEffects,
  stripRefs,
  unitMatches,
} from '../../../src/sim/statecraft';
import { cardUnitStat, combatLineAmount } from '../../../src/sim/statecraft/evaluator';
import { type CardEffect, type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import {
  describeTraitGain,
  researchSince,
  researchSnapshot,
  settleResearch,
  unitTraits,
} from '../../../src/sim/tech';
import {
  ALL_TECH_IDS,
  CHARTER_TECH_IDS,
  type TechId,
  isCharterTech,
  techDataProblems,
  techDef,
} from '../../../src/sim/techData';
import { unitLine } from '../../../src/sim/unitData';
import { fullMovement } from '../../../src/sim/units';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { createGame, newGame } from '../newGameHelpers';
import { choose, researchingGame } from '../techHelpers';

/** Two seats on a flat grassland rectangle, at war, each able to see everything. */
function flat(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
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
  state.rng = makeRng(12345);
  const seats = realPlayers(state);
  openWar(state, seats[0]!.id, seats[1]!.id);
  return state;
}

/**
 * Everything visible to everybody. A shot at three hexes is past a catapult's
 * sight, and the fog is not the subject here. Called after the pieces are
 * placed, because placing one recomputes what its owner sees.
 */
function seeAll(state: GameState): void {
  for (const player of state.players) state.visibility[player.id]!.fill(2);
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Teaches a seat technologies, the way a finished research leaves them. */
function learn(state: GameState, playerId: number, ...techs: TechId[]): void {
  playerById(state, playerId)!.techsResearched.push(...techs);
  bumpRevision(state);
}

/** The strength lines on one side of a forecast whose label holds `name`. */
function lines(state: GameState, attacker: Unit, col: number, row: number, side: 'attacker' | 'defender', name: string): number {
  seeAll(state);
  const view = previewCombat(state, attacker.id, { col, row });
  if (!view.ok) throw new Error(view.error);
  const list = side === 'attacker' ? view.attackerLines : view.defenderLines;
  return list.filter((line) => line.source.includes(name)).reduce((sum, line) => sum + line.amount, 0);
}

/** Every technology that carries a trait, with its traits. */
const WITH_TRAITS = ALL_TECH_IDS.filter((id) => (techDef(id).traits ?? []).length > 0);

// --- the register ------------------------------------------------------------

describe('the register', () => {
  it('names the trait’s line in every effect of a trait, and nests nothing', () => {
    expect(WITH_TRAITS.length).toBeGreaterThan(0);
    for (const tech of WITH_TRAITS) {
      for (const trait of techDef(tech).traits!) {
        expect(trait.effects.length, `${tech} · ${trait.name}`).toBeGreaterThan(0);
        for (const effect of trait.effects) {
          const filter = (effect as CardEffect & { class?: { line?: string } }).class;
          expect(filter?.line, `${tech} · ${trait.name}: ${effect.kind}`).toBe(trait.line);
        }
      }
    }
    expect(techDataProblems()).toEqual([]);
  });

  it('puts the six traits on the four technologies the rulings name, and only on charter rows', () => {
    const traits = Object.fromEntries(
      WITH_TRAITS.map((id) => [id, techDef(id).traits!.map((trait) => [trait.name, trait.line])]),
    );
    expect(traits).toEqual({
      casting: [
        ['Hoplite', 'spearman'],
        ['Maryannu', 'chariot'],
      ],
      mechanics: [
        ['Onager', 'catapult'],
        ['Repeating Crossbow', 'archer'],
      ],
      chemistry: [['Grenadier', 'warrior']],
      navalGunnery: [['Galleass', 'gunGalley']],
    });
    for (const id of WITH_TRAITS) expect(isCharterTech(id), id).toBe(true);
  });

  it('gives the Mechanists’ traits no strength (the ruling of section 14)', () => {
    for (const trait of techDef('mechanics').traits!) {
      for (const effect of trait.effects) expect(effect.kind, trait.name).not.toBe('combatLine');
    }
  });
});

// --- the line ----------------------------------------------------------------

describe('a unit line (reading 22)', () => {
  it('is the named unit and every unit its upgrade chain reaches, in order', () => {
    expect(unitLine('spearman')).toEqual(['spearman', 'phalanx', 'spearWall', 'pikeman']);
    expect(unitLine('chariot')).toEqual(['chariot', 'horseman', 'knight']);
    expect(unitLine('archer')).toEqual(['archer', 'bowman', 'compositeBowman', 'crossbowman']);
    expect(unitLine('catapult')).toEqual(['catapult', 'trebuchet']);
    expect(unitLine('warrior')).toEqual(['warrior', 'swordsman', 'legionary', 'longswordsman']);
    expect(unitLine('gunGalley')).toEqual(['gunGalley', 'frigate']);
  });

  it('admits no unit before the named one, and no unique until it upgrades into the chain', () => {
    expect(unitMatches('pikeman', { line: 'spearman' })).toBe(true);
    expect(unitMatches('frigate', { line: 'gunGalley' })).toBe(true);
    expect(unitMatches('fireShip', { line: 'gunGalley' })).toBe(false);
    expect(unitMatches('fubing', { line: 'spearman' })).toBe(false);
    expect(unitMatches('slinger', { line: 'archer' })).toBe(false);
    expect(unitMatches('chariotArcher', { line: 'chariot' })).toBe(false);
    // A line beside another narrowing must satisfy both, as every pair does.
    expect(unitMatches('knight', { line: 'chariot', modelClass: 'mounted' })).toBe(true);
    expect(unitMatches('knight', { line: 'chariot', modelClass: 'melee' })).toBe(false);
  });

  it('is said in a first-time player’s words', () => {
    expect(filterWords({ line: 'spearman' })).toBe('units of the Spearman line');
    expect(filterWords({ line: 'gunGalley' })).toBe('units of the Gun Galley line');
  });
});

// --- the label, the piece and the tally ---------------------------------------

describe('what reaches a piece', () => {
  it('labels each line “<technology> · <trait>” and reads nothing before the technology is known', () => {
    const state = flat();
    const sources = (): string[] => liveEffects(state, 0).map((entry) => entry.source);
    expect(sources().some((source) => source.startsWith('Mechanics'))).toBe(false);
    learn(state, 0, 'mechanics');
    expect(sources()).toContain('Mechanics · Onager');
    expect(sources()).toContain('Mechanics · Repeating Crossbow');
    // The other seat knows nothing of it.
    expect(liveEffects(state, 1).some((entry) => entry.source.startsWith('Mechanics'))).toBe(false);
  });

  it('names the traits a piece holds, through every upgrade', () => {
    const state = flat();
    const catapult = createUnit(state, 0, 'catapult', 4, 4);
    const archer = createUnit(state, 0, 'compositeBowman', 4, 5);
    const warrior = createUnit(state, 0, 'warrior', 4, 6);
    expect(unitTraits(state, catapult)).toEqual([]);
    learn(state, 0, 'mechanics', 'casting');
    expect(unitTraits(state, catapult)).toEqual(['Onager']);
    expect(unitTraits(state, archer)).toEqual(['Repeating Crossbow']);
    expect(unitTraits(state, warrior)).toEqual([]);
    // It becomes a Trebuchet and keeps the trait: the piece carries no field.
    catapult.type = 'trebuchet';
    expect(unitTraits(state, catapult)).toEqual(['Onager']);
    // A captured piece holds its captor's traits, not its maker's.
    const theirs = createUnit(state, 1, 'catapult', 8, 4);
    expect(unitTraits(state, theirs)).toEqual([]);
  });

  it('tallies the pieces that gained a trait when the technology lands', () => {
    const g = researchingGame();
    const player = playerById(g.state, 0)!;
    const home = g.state.cities.find((city) => city.ownerId === 0)!;
    player.techsResearched.push('bronzeWorking');
    player.charteredTechs.push('casting');
    expect(dispatch(g, choose(0, 'casting')).ok).toBe(true);
    createUnit(g.state, 0, 'spearman', home.col, home.row);
    createUnit(g.state, 0, 'spearman', home.col, home.row);
    createUnit(g.state, 0, 'chariot', home.col, home.row);
    createUnit(g.state, 0, 'archer', home.col, home.row);
    const before = researchSnapshot(g.state, 0);
    // A piece made after the snapshot was made with the trait, and gained none.
    createUnit(g.state, 0, 'spearman', home.col, home.row);
    player.sciencePool = 100_000;
    expect(settleResearch(g.state, player)?.techId).toBe('casting');
    const report = researchSince(g.state, 0, before);
    expect(report.techs).toEqual(['casting']);
    expect(report.traits).toEqual([
      { type: 'spearman', trait: 'Hoplite', tech: 'casting', count: 2 },
      { type: 'chariot', trait: 'Maryannu', tech: 'casting', count: 1 },
    ]);
    expect(report.traits.map(describeTraitGain)).toEqual([
      '2 spearmen gained Hoplite',
      '1 war chariot gained Maryannu',
    ]);
  });

  it('tallies a unique that upgrades into a line, and nothing for an upgrade inside one', () => {
    const state = flat();
    learn(state, 0, 'casting');
    const fubing = createUnit(state, 0, 'fubing', 4, 4);
    const spear = createUnit(state, 0, 'spearman', 4, 5);
    const before = researchSnapshot(state, 0);
    fubing.type = 'spearWall';
    spear.type = 'phalanx';
    const report = researchSince(state, 0, before);
    expect(report.traits).toEqual([{ type: 'spearWall', trait: 'Hoplite', tech: 'casting', count: 1 }]);
    expect(report.upgrades).toHaveLength(2);
  });
});

// --- the traits in a fight -----------------------------------------------------

describe('the Hoplite (reading 26)', () => {
  it('adds one, and one more for every four citizens of its own town, attacking from it', () => {
    const state = flat();
    learn(state, 0, 'casting');
    const town = foundCityAt(state, 0, at(state, 4, 4));
    town.population = 9;
    const inTown = createUnit(state, 0, 'spearman', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    expect(lines(state, inTown, 5, 4, 'attacker', 'Casting · Hoplite')).toBe(1 + 2);
    // Out in the field it is the flat point alone.
    const afield = createUnit(state, 0, 'pikeman', 4, 8);
    createUnit(state, 1, 'warrior', 5, 8);
    expect(lines(state, afield, 5, 8, 'attacker', 'Casting · Hoplite')).toBe(1);
  });

  it('counts its own town defending too, once the walls are down', () => {
    const state = flat();
    learn(state, 0, 'casting');
    const town = foundCityAt(state, 0, at(state, 4, 4));
    town.population = 12;
    town.hp = 1;
    createUnit(state, 0, 'phalanx', 4, 4);
    const rival = createUnit(state, 1, 'warrior', 5, 4);
    expect(lines(state, rival, 4, 4, 'defender', 'Casting · Hoplite')).toBe(1 + 3);
  });

  it('counts no town but its own empire’s', () => {
    const state = flat();
    learn(state, 0, 'casting');
    const town = foundCityAt(state, 0, at(state, 4, 4));
    town.population = 12;
    const spear = createUnit(state, 0, 'spearman', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    town.ownerId = 1;
    expect(lines(state, spear, 5, 4, 'attacker', 'Casting · Hoplite')).toBe(1);
  });
});

describe('the Maryannu', () => {
  it('adds one, and five more attacking a unit below half health', () => {
    const state = flat();
    learn(state, 0, 'casting');
    const rider = createUnit(state, 0, 'horseman', 4, 4);
    const fresh = createUnit(state, 1, 'warrior', 5, 4);
    expect(lines(state, rider, 5, 4, 'attacker', 'Casting · Maryannu')).toBe(1);
    fresh.hp = 30;
    expect(lines(state, rider, 5, 4, 'attacker', 'Casting · Maryannu')).toBe(1 + 5);
  });

  it('pays the five only in attack, where the wounded unit is the one struck', () => {
    const state = flat();
    learn(state, 0, 'casting');
    const rider = createUnit(state, 0, 'chariot', 4, 4);
    rider.hp = 30;
    const rival = createUnit(state, 1, 'warrior', 5, 4);
    expect(lines(state, rival, 4, 4, 'defender', 'Casting · Maryannu')).toBe(1);
  });
});

describe('the Grenadier (reading 27)', () => {
  it('adds one, and one more for each charter technology the empire knows', () => {
    const state = flat();
    const sword = createUnit(state, 0, 'swordsman', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    expect(lines(state, sword, 5, 4, 'attacker', 'Grenadier')).toBe(0);
    learn(state, 0, 'chemistry');
    expect(lines(state, sword, 5, 4, 'attacker', 'Chemistry · Grenadier')).toBe(1 + 1);
    // A charter drafted and not researched does not count.
    playerById(state, 0)!.charteredTechs.push('herbals', 'optics');
    bumpRevision(state);
    expect(lines(state, sword, 5, 4, 'attacker', 'Chemistry · Grenadier')).toBe(1 + 1);
    learn(state, 0, 'herbals', 'optics');
    expect(lines(state, sword, 5, 4, 'attacker', 'Chemistry · Grenadier')).toBe(1 + 3);
    // A spearman is not of the line.
    const spear = createUnit(state, 0, 'spearman', 4, 6);
    createUnit(state, 1, 'warrior', 5, 6);
    expect(lines(state, spear, 5, 6, 'attacker', 'Grenadier')).toBe(0);
  });

  it('reads the same count a card’s clause would (one function for both)', () => {
    const state = flat();
    learn(state, 0, 'chemistry', 'casting', 'mechanics');
    const sword = createUnit(state, 0, 'longswordsman', 4, 4);
    const scaled = techDef('chemistry').traits![0]!.effects[1]!;
    if (scaled.kind !== 'combatLine') throw new Error('the Grenadier’s second effect is its scale');
    const amount = combatLineAmount(
      state,
      {
        unit: sword,
        side: 'attack',
        tile: at(state, 5, 4),
        vsBarbarians: false,
        vsCity: false,
        targetHp: 100,
        targetMaxHp: 100,
      },
      scaled,
    );
    expect(amount).toBe(3);
  });
});

describe('the Onager and the Repeating Crossbow (reading 24)', () => {
  it('lets the catapult line shoot from three hexes, with no strength', () => {
    const state = flat();
    const catapult = createUnit(state, 0, 'catapult', 2, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    seeAll(state);
    const refused = previewCombat(state, catapult.id, { col: 5, row: 4 });
    expect(refused.ok ? 'ok' : refused.error).toBe('Catapult has range 2 and the target is 3 tiles away');
    learn(state, 0, 'mechanics');
    expect(cardUnitStat(state, catapult, 'range')).toBe(1);
    const shot = previewCombat(state, catapult.id, { col: 5, row: 4 });
    expect(shot.ok ? 'ok' : shot.error).toBe('ok');
    expect(lines(state, catapult, 5, 4, 'attacker', 'Onager')).toBe(0);
    catapult.type = 'trebuchet';
    expect(cardUnitStat(state, catapult, 'range')).toBe(1);
    // An archer is not of the catapult line.
    const archer = createUnit(state, 0, 'archer', 2, 6);
    expect(cardUnitStat(state, archer, 'range')).toBe(0);
  });

  it('lets the archer line move after it shoots, at one point', () => {
    const shoot = (known: boolean, type: 'archer' | 'crossbowman' | 'horseArcher'): Unit => {
      const state = flat();
      if (known) learn(state, 0, 'mechanics');
      const piece = createUnit(state, 0, type, 3, 4);
      createUnit(state, 1, 'warrior', 5, 4);
      seeAll(state);
      piece.movesLeft = fullMovement(piece, state);
      const result = applyCombat(state, piece.id, { col: 5, row: 4 });
      if (!result.ok) throw new Error(result.error);
      return piece;
    };
    expect(shoot(false, 'archer').movesLeft).toBe(0);
    const archer = shoot(true, 'archer');
    expect(archer.hasAttacked).toBe(true);
    expect(archer.movesLeft).toBe(unitFull('archer') - RULES.naval.hitAndRunCost);
    expect(shoot(true, 'crossbowman').movesLeft).toBe(unitFull('crossbowman') - RULES.naval.hitAndRunCost);
    // A horse archer is of another line, and pays the whole turn.
    expect(shoot(true, 'horseArcher').movesLeft).toBe(0);
  });
});

/** A fresh piece's whole allowance on the flat bench. */
function unitFull(type: 'archer' | 'crossbowman'): number {
  const state = flat();
  return fullMovement(createUnit(state, 0, type, 3, 4), state);
}

// --- the cards -----------------------------------------------------------------

describe('the charters', () => {
  const DEALT: readonly OrderId[] = ['theBronzeFoundersCharter', 'theMechanistsCharter', 'theNavalGunnersCharter'];

  it('deals the three whose gift is whole, and the Alchemists’ once Niter Beds are built', () => {
    for (const id of DEALT) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(orderDef(id).deferred, id).toBeUndefined();
      expect(orderDef(id).text, id).toBeTruthy();
    }
    // Batch S5 built Niter Beds, so the Alchemists' Charter is dealt too
    // (`scientificLand.test.ts`).
    expect(orderIsDealt('theAlchemistsCharter')).toBe(true);
    expect(orderDef('theAlchemistsCharter').deferred).toBeUndefined();
    // Every charter technology but these four still gives no trait.
    const traited = new Set<TechId>(WITH_TRAITS);
    for (const id of CHARTER_TECH_IDS) {
      expect(traited.has(id), id).toBe(['casting', 'mechanics', 'chemistry', 'navalGunnery'].includes(id));
    }
  });

  it('deals the Bronze-Founders’ Charter to a Scientific seat’s opening hand', () => {
    const g = createGame({
      seed: 13,
      sizeName: 'duel',
      players: [
        { name: 'Hypatia', color: '#d4502e', isHuman: true, leader: 'hypatiaOfAlexandria' },
        { name: 'Rival', color: '#3a7fe8', leader: 'pachacuti' },
      ],
    });
    expect(eligibleFor(g.state, playerById(g.state, 0)!)).toContain('theBronzeFoundersCharter');
    expect(eligibleFor(g.state, playerById(g.state, 1)!)).not.toContain('theBronzeFoundersCharter');
  });

  it('prints the research it opens, then each trait in the technology’s own words', () => {
    const said = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(said('theMechanistsCharter')).toEqual([
      'once drafted, opens Mechanics for you to research; only an empire holding this charter may research it; this card takes no chair',
      'once you know Mechanics, the Catapult line (Catapult and Trebuchet) gains the Onager trait and keeps it through every upgrade',
      'units of the Catapult line: +1 range',
      'once you know Mechanics, the Archer line (Archer to Crossbowman) gains the Repeating Crossbow trait and keeps it through every upgrade',
      'units of the Archer line may move after attacking',
    ]);
    expect(said('theBronzeFoundersCharter')).toContain(
      '+1 combat strength for units of the Spearman line, +1 more per 4 citizens of your city it stands in',
    );
    // The technology says the same of itself, without the lead.
    expect(describeCard('navalGunnery' as never).map((clause) => clause.text)).toEqual([
      'the Gun Galley line (Gun Galley and Frigate) gains the Galleass trait and keeps it through every upgrade',
      '+3 combat strength for units of the Gun Galley line',
      'units of the Gun Galley line blockade a foreign city they stand beside on the water: its sea lanes close and its trade routes pay nothing',
    ]);
  });
});
