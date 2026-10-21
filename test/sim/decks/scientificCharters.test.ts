/**
 * **Scientific batch S4, the building charters** (`docs/plans/scientific-build-
 * triage.md`, the S4 section and readings 28 and 56; the rulings are in
 * `docs/plans/scientific-themes.md` sections 14 and 15).
 *
 * Eight charters open a charter technology, and knowing that technology lets
 * the seat build something nobody else can: five new buildings (the
 * Specularium, the Mouseion, the Aldine Press, the Bimaristan and the Tophane),
 * the Scriptorium and the Bastion, and the Physic Garden, a worker row. Herbals
 * also pays happiness for each garden, and Printing gives one more trade route.
 * What this file checks:
 *
 *   - the register: the eight charters are dealt with their sheet text, and
 *     each gift sits on its charter technology, never on the card;
 *   - only a seat that knows the technology may build the row, and only a seat
 *     that drafted the charter may research the technology;
 *   - each gift on a board, read through the ledger it lands in;
 *   - the Mouseion's premium, one labelled line of `explainBuildingCost`
 *     (reading 56);
 *   - the words the eight charters print.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_UNLOCK_TECH } from '../../../src/sim/techData';
import { type BuildingId, buildingDef } from '../../../src/sim/buildingData';
import {
  buildingProductionCost,
  explainBuildingCost,
  foldUnitCost,
  foundCityAt,
  refreshCityDerived,
} from '../../../src/sim/cities';
import { improvementDef } from '../../../src/sim/improvementData';
import { improvementGroundError, improvementTechError } from '../../../src/sim/improvements';
import { type Tile, createMap, getTileAt, raiseImprovement } from '../../../src/sim/map';
import { explainRenown } from '../../../src/sim/renown';
import {
  type City,
  type GameState,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import {
  cardHappiness,
  cardProduction,
  cardRouteYieldLines,
  cardUnitStamp,
  cardUnitStat,
  explainCardPercentYields,
} from '../../../src/sim/statecraft/evaluator';
import { type OrderId, isCharter, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { buildError, gatingTech, isUnlocked, researchError } from '../../../src/sim/tech';
import { type TechId, techDef } from '../../../src/sim/techData';
import { explainRouteSlots } from '../../../src/sim/trade';
import { resetVisibility } from '../../../src/sim/visibility';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { explainCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

// --- the bench -----------------------------------------------------------------

/** A blank grassland board, twenty by twelve, with two seats and nothing on it. */
function bench(): GameState {
  const width = 20;
  const height = 12;
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A town for a seat. The first one a seat founds is its capital. */
function town(state: GameState, playerId: number, col: number, row: number): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  bumpRevision(state);
  return city;
}

/** Teaches a seat technologies, as a finished research leaves them. */
function learn(state: GameState, playerId: number, ...techs: TechId[]): void {
  playerById(state, playerId)!.techsResearched.push(...techs);
  bumpRevision(state);
}

/** Raises a building in a town, as a finished queue row leaves it. */
function raise(state: GameState, city: City, id: BuildingId): void {
  addBuilding(state, city, id);
  bumpRevision(state);
  refreshCityDerived(state, city);
}

/** The sum of one voice over a town's ledger lines whose label holds `name`. */
function townLines(
  state: GameState,
  city: City,
  name: string,
  voice: 'food' | 'science' | 'culture',
): number {
  return explainCity(state, city)
    .lines.filter((line) => line.source.includes(name))
    .reduce((sum, line) => sum + line[voice], 0);
}

// --- the register ----------------------------------------------------------------

/** Each charter, its technology, and the row knowing it opens. */
const GIFTS: readonly { charter: OrderId; tech: TechId; building?: BuildingId }[] = [
  { charter: 'theHerbalistsCharter', tech: 'herbals' },
  { charter: 'theGlassmakersCharter', tech: 'optics', building: 'specularium' },
  { charter: 'theLibrariansCharter', tech: 'cataloguing', building: 'mouseion' },
  { charter: 'thePaperMakersCharter', tech: 'papermaking', building: 'scriptorium' },
  { charter: 'thePhysiciansCharter', tech: 'medicine', building: 'bimaristan' },
  { charter: 'thePrintersCharter', tech: 'printing', building: 'aldinePress' },
  { charter: 'theGunfoundersCharter', tech: 'gunfounding', building: 'tophane' },
  { charter: 'theMilitaryEngineersCharter', tech: 'militaryArchitecture', building: 'bastion' },
];

describe('the register', () => {
  it('deals the eight charters with the sheet’s text, and no deferred sentence', () => {
    for (const { charter, tech } of GIFTS) {
      const def = orderDef(charter);
      expect(isCharter(charter), charter).toBe(true);
      expect(orderIsDealt(charter), charter).toBe(true);
      expect(def.deferred, charter).toBeUndefined();
      // A charter takes no chair, so it carries no effects: the gift is the
      // technology's.
      expect(def.effects, charter).toEqual([]);
      expect(def.charter!.unlocks.tech, charter).toBe(tech);
      expect(def.charter!.unlocks.building, charter).toBeUndefined();
      expect(def.text, charter).toMatch(new RegExp(`^Drafting this opens ${techDef(tech).name} for research\\. `));
      expect(def.text, charter).toMatch(/ No chair required\.$/);
    }
  });

  it('leaves the Surveyors’ and the Alchemists’ charters deferred for batch S5', () => {
    for (const charter of ['theSurveyorsCharter', 'theAlchemistsCharter'] as OrderId[]) {
      expect(orderIsDealt(charter), charter).toBe(false);
      expect(orderDef(charter).deferred, charter).toBeDefined();
    }
  });

  it('puts each building on its charter technology, and the Physic Garden on Herbals', () => {
    for (const { tech, building } of GIFTS) {
      if (building === undefined) continue;
      expect(techDef(tech).unlocks.buildings, tech).toEqual([building]);
      expect(BUILDING_UNLOCK_TECH.get(building), building).toBe(tech);
      expect(gatingTech('building', building), building).toBe(tech);
    }
    expect(improvementDef('physicGarden').requiresTech).toBe('herbals');
    // The two technologies that also carry card effects.
    expect(techDef('herbals').effects).toEqual([
      {
        kind: 'pays',
        where: 'empire',
        basis: 'count',
        count: 'tilesInBorders',
        tile: { test: 'improvement', improvement: 'physicGarden' },
        to: 'happiness',
        amount: 2,
      },
    ]);
    expect(techDef('printing').effects).toEqual([{ kind: 'routeRider', extra: 1 }]);
  });

  it('gives each new row a size and never a figure, and the Mouseion its premium', () => {
    for (const id of ['specularium', 'mouseion', 'aldinePress', 'bimaristan', 'tophane'] as BuildingId[]) {
      const def = buildingDef(id) as unknown as Record<string, unknown>;
      expect(def['size'], id).toBeDefined();
      expect(def['cost'], id).toBeUndefined();
      expect(def['column'], id).toBeUndefined();
    }
    // The three great houses, and the two city buildings.
    for (const id of ['mouseion', 'bimaristan', 'tophane'] as BuildingId[]) {
      expect(buildingDef(id).oncePerEmpire, id).toBe(true);
      expect(buildingDef(id).empireBuilding, id).toBe(true);
    }
    for (const id of ['specularium', 'aldinePress'] as BuildingId[]) {
      expect(buildingDef(id).oncePerEmpire, id).toBeUndefined();
      expect(buildingDef(id).empireBuilding, id).toBeUndefined();
    }
    expect(buildingDef('mouseion').costPercent).toBe(30);
  });

  it('opens the Scriptorium and the Bastion by their technologies, not by a card or a later age', () => {
    expect(buildingDef('scriptorium').unlockedByCard).toBeUndefined();
    expect(buildingDef('scriptorium').column).toBeUndefined();
    expect(buildingDef('bastion').awaitsTech).toBeUndefined();
    expect(buildingDef('bastion').column).toBeUndefined();
  });
});

// --- the gate --------------------------------------------------------------------

describe('only a charter’s holder can build its rows', () => {
  it('shuts each row until its technology is known, and opens it after', () => {
    for (const { tech, building } of GIFTS) {
      if (building === undefined) continue;
      const state = bench();
      const city = town(state, 0, 4, 5);
      expect(isUnlocked(state, 0, 'building', building), `${building} before`).toBe(false);
      expect(buildError(state, 0, 'building', building, city), building).toContain(techDef(tech).name);
      learn(state, 0, tech);
      expect(isUnlocked(state, 0, 'building', building), `${building} after`).toBe(true);
      expect(buildError(state, 0, 'building', building, city), building).toBeNull();
    }
  });

  it('refuses the technology to a seat that has not drafted the charter', () => {
    for (const { tech } of GIFTS) {
      const state = bench();
      expect(researchError(state, 0, tech), tech).toMatch(/opened by a charter/);
      playerById(state, 0)!.charteredTechs.push(tech);
      expect(researchError(state, 0, tech) ?? '', tech).not.toMatch(/opened by a charter/);
    }
  });
});

// --- the Physic Garden -----------------------------------------------------------

describe('the Physic Garden', () => {
  it('needs Herbals, flat land and fresh water, and one to a town', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const ground = at(state, 5, 5);
    ground.freshwater = true;
    expect(improvementTechError(state, 0, 'physicGarden')).toMatch(/Herbals/);
    learn(state, 0, 'herbals');
    expect(improvementTechError(state, 0, 'physicGarden')).toBeNull();
    expect(improvementGroundError(state, 0, ground, 'physicGarden')).toBeNull();
    // Dry ground is refused for the water.
    ground.freshwater = false;
    expect(improvementGroundError(state, 0, ground, 'physicGarden')).toMatch(/fresh water/);
    // A watered hill is refused for the hill.
    ground.freshwater = true;
    ground.hills = true;
    expect(improvementGroundError(state, 0, ground, 'physicGarden')).toMatch(/flat|hill/);
    ground.hills = false;
    // Watered desert and tundra take it; watered snow does not.
    for (const terrain of ['plains', 'desert', 'tundra'] as const) {
      ground.terrain = terrain;
      expect(improvementGroundError(state, 0, ground, 'physicGarden'), terrain).toBeNull();
    }
    ground.terrain = 'snow';
    expect(improvementGroundError(state, 0, ground, 'physicGarden')).not.toBeNull();
    ground.terrain = 'grassland';
    // One in each town: a second hex of the same town is refused.
    raiseImprovement(ground, 'physicGarden', state.turn);
    bumpRevision(state);
    const second = at(state, 3, 5);
    second.freshwater = true;
    expect(improvementGroundError(state, 0, second, 'physicGarden')).toMatch(/already has/);
  });

  it('pays two science on its hex, as any worked hex pays', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const ground = at(state, 5, 5);
    const before = explainTileYield(ground, yieldContextFor(state, 0)).reduce((sum, line) => sum + line.science, 0);
    raiseImprovement(ground, 'physicGarden', state.turn);
    bumpRevision(state);
    const after = explainTileYield(ground, yieldContextFor(state, 0)).reduce((sum, line) => sum + line.science, 0);
    expect(after - before).toBe(2);
  });

  it('gladdens the realm by two for each garden in its borders, worked or not, while it knows Herbals', () => {
    // Reading 28: the gardens inside the borders count, worked or not, and the
    // happiness needs Herbals. A captured garden pays its captor science, and
    // happiness only if the captor knows Herbals.
    const state = bench();
    const first = town(state, 0, 4, 5);
    const second = town(state, 0, 12, 5);
    raiseImprovement(at(state, first.col + 1, first.row), 'physicGarden', state.turn);
    raiseImprovement(at(state, second.col - 1, second.row), 'physicGarden', state.turn);
    bumpRevision(state);
    const glad = () => cardHappiness(state, 0).filter((line) => line.card === 'herbals');
    expect(glad(), 'gardens without Herbals pay no happiness').toEqual([]);
    learn(state, 0, 'herbals');
    expect(glad()).toHaveLength(1);
    expect(glad()[0]!.amount).toBe(4);
    // A garden outside the borders counts for nobody.
    raiseImprovement(at(state, 18, 10), 'physicGarden', state.turn);
    bumpRevision(state);
    expect(glad()[0]!.amount).toBe(4);
  });
});

// --- the five buildings, and the two rewired ------------------------------------

describe('what each building does', () => {
  it('Specularium: three food, and a beaker for every two citizens of its town', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    city.population = 7;
    learn(state, 0, 'optics');
    raise(state, city, 'specularium');
    expect(townLines(state, city, 'Specularium', 'food')).toBe(3);
    expect(townLines(state, city, 'Specularium', 'science')).toBe(3);
    city.population = 8;
    refreshCityDerived(state, city);
    expect(townLines(state, city, 'Specularium', 'science')).toBe(4);
  });

  it('Mouseion: four renown for scholars, and two culture in its town for each empire building', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    learn(state, 0, 'cataloguing');
    raise(state, city, 'mouseion');
    const renown = explainRenown(state, 0).filter((line) => line.source.includes('Mouseion'));
    expect(renown.reduce((sum, line) => sum + line.amount, 0)).toBe(4);
    expect(renown.every((line) => line.family === 'scholar')).toBe(true);
    // Itself included.
    expect(townLines(state, city, 'Mouseion', 'culture')).toBe(2);
    // A second great house anywhere in the realm counts too, and the culture
    // lands in the Mouseion's town alone.
    raise(state, other, 'forum');
    expect(townLines(state, city, 'Mouseion', 'culture')).toBe(4);
    expect(townLines(state, other, 'Mouseion', 'culture')).toBe(0);
  });

  it('Mouseion: thirty percent dearer than the same great house without the premium (reading 56)', () => {
    const lines = explainBuildingCost('mouseion');
    expect(lines.map((line) => line.source)).toEqual(['Large building', 'Column 4 ×2.25', 'Mouseion +30%']);
    const ordinary = foldUnitCost(lines.slice(0, -1));
    expect(lines[lines.length - 1]!.amount).toBe(Math.floor((ordinary * 30) / 100));
    expect(buildingProductionCost('mouseion')).toBe(ordinary + Math.floor((ordinary * 30) / 100));
    // With an empire in hand the empire's line comes first, and the premium is a
    // share of what the house would cost that empire without it.
    const state = bench();
    town(state, 0, 4, 5);
    const priced = explainBuildingCost('mouseion', state, 0);
    expect(priced.map((line) => line.source)).toEqual([
      'Large building',
      'Column 4 ×2.25',
      'Empire of 1 cities ×0.50',
      'Mouseion +30%',
    ]);
    const before = foldUnitCost(priced.slice(0, -1));
    expect(priced[priced.length - 1]!.amount).toBe(Math.floor((before * 30) / 100));
    expect(foldUnitCost(priced)).toBe(buildingProductionCost('mouseion', state, 0));
    // No other row carries a premium line.
    expect(explainBuildingCost('forum').some((line) => line.source.includes('%'))).toBe(false);
  });

  it('Aldine Press: two culture, and two science and two culture on each route that leaves its town', () => {
    const state = bench();
    const press = town(state, 0, 4, 5);
    const far = town(state, 0, 12, 5);
    learn(state, 0, 'printing');
    raise(state, press, 'aldinePress');
    expect(townLines(state, press, 'Aldine Press', 'culture')).toBe(2);
    const from = (origin: City, to: City) =>
      cardRouteYieldLines(state, origin, to).filter((line) => line.source.includes('Aldine Press'));
    const out = from(press, far);
    expect(out).toHaveLength(1);
    expect(out[0]!.science).toBe(2);
    expect(out[0]!.culture).toBe(2);
    // A route from the other town carries nothing from the press.
    expect(from(far, press)).toEqual([]);
  });

  it('Printing: one more trade route, from the technology itself', () => {
    const state = bench();
    town(state, 0, 4, 5);
    const printed = () => explainRouteSlots(state, 0).filter((line) => line.source.includes('Printing'));
    expect(printed()).toEqual([]);
    learn(state, 0, 'printing');
    expect(printed()).toHaveLength(1);
    expect(printed()[0]!.slots).toBe(1);
  });

  it('Bimaristan: a quarter more food in its town, and ten more healing in your land', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    learn(state, 0, 'medicine');
    const home = createUnit(state, 0, 'warrior', 5, 5);
    const abroad = createUnit(state, 0, 'warrior', 8, 10);
    expect(cardUnitStat(state, home, 'heal')).toBe(0);
    raise(state, city, 'bimaristan');
    const food = (target: City) =>
      explainCardPercentYields(state, target).filter(
        (line) => line.source.includes('Bimaristan') && line.yield === 'food',
      );
    expect(food(city).map((line) => line.percent)).toEqual([25]);
    expect(food(other)).toEqual([]);
    expect(cardUnitStat(state, home, 'heal')).toBe(10);
    expect(cardUnitStat(state, abroad, 'heal')).toBe(0);
  });

  it('Tophane: soldiers raised in its town start four stronger, and it raises them a quarter faster', () => {
    const state = bench();
    const city = town(state, 0, 4, 5);
    const other = town(state, 0, 12, 5);
    learn(state, 0, 'gunfounding');
    raise(state, city, 'tophane');
    const here = { col: city.col, row: city.row };
    expect(cardUnitStamp(state, 0, here, 'swordsman').strength).toBe(4);
    expect(cardUnitStamp(state, 0, here, 'worker').strength ?? 0).toBe(0);
    expect(cardUnitStamp(state, 0, { col: other.col, row: other.row }, 'swordsman').strength ?? 0).toBe(0);
    const faster = (target: City, type: 'swordsman' | 'worker') =>
      cardProduction(state, target, 'unit', type).filter((line) => line.card === 'tophane');
    expect(faster(city, 'swordsman').map((line) => line.percent)).toEqual([25]);
    expect(faster(city, 'worker')).toEqual([]);
    expect(faster(other, 'swordsman')).toEqual([]);
  });

  it('Scriptorium and Bastion: priced at their technologies’ columns', () => {
    expect(explainBuildingCost('scriptorium')[1]!.source).toMatch(/^Column 7 /);
    expect(explainBuildingCost('bastion')[1]!.source).toMatch(/^Column 11 /);
  });
});

// --- the words -------------------------------------------------------------------

describe('the words', () => {
  const said = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));

  it('prints the research, then each gift led by “once you know”, with nothing struck through', () => {
    for (const { charter, tech, building } of GIFTS) {
      const clauses = describeCard(charter);
      expect(clauses.some((clause) => clause.deferred === true), charter).toBe(false);
      const words = said(charter);
      const name = techDef(tech).name;
      expect(words[0], charter).toBe(
        `once drafted, opens ${name} for you to research; only an empire holding this charter may research it; this card takes no chair`,
      );
      if (building !== undefined) {
        expect(
          words.some((text) => text.startsWith(`once you know ${name}, you may build the ${buildingDef(building).name}: `)),
          charter,
        ).toBe(true);
      }
    }
  });

  it('says the Physic Garden’s ground and pay, and Herbals’ happiness', () => {
    expect(said('theHerbalistsCharter')).toEqual([
      'once drafted, opens Herbals for you to research; only an empire holding this charter may research it; this card takes no chair',
      'once you know Herbals, your workers may build the Physic Garden: +2 science; on flat land with fresh water, one in each city',
      'once you know Herbals, +2 happiness per hex with a Physic Garden in your borders',
    ]);
  });

  it('says Printing’s trade route beside the press', () => {
    expect(said('thePrintersCharter')).toContain('once you know Printing, +1 trade route');
  });
});
