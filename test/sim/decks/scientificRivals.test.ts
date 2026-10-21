/**
 * **Scientific batch S3, feature B: reading rivals**
 * (`docs/plans/scientific-build-triage.md`, the S3 section and readings 2, 6,
 * 7, 15, 17, 18, 45 and 46; `docs/plans/scientific-themes.md`, sections 6, 14
 * and 15).
 *
 * The readings live in one leaf, `src/sim/rivals.ts`, over the empires a seat
 * has met (`Player.metSeats`). What this file checks:
 *
 *   - the leaf: who counts as a met rival, the lead, the gap, "a met empire
 *     knows this", "a met empire can build this", and the two comparisons of
 *     how many technologies two empires know;
 *   - that it stays a leaf: it imports values from `techData.ts` alone;
 *   - each card on a board: The Secret Arts, The Translation Movement, The
 *     Edge of the Sword, The Great Designs, Greek Fire, The Proving Ground,
 *     and the shared Books from the Ships;
 *   - the rows and their words.
 */

import { describe, expect, it } from 'vitest';

import { previewCombat } from '../../../src/sim/combat';
import { foundCityAt, realiseItem } from '../../../src/sim/cities';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import {
  aheadOfMet,
  knowsFewerTechs,
  knowsMoreTechs,
  metEmpireCanBuild,
  metEmpireKnows,
  metRivals,
  techGap,
  techLead,
  unitAheadOfMet,
} from '../../../src/sim/rivals';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import { cardRouteYieldLines, countOf, describeCard, stripRefs } from '../../../src/sim/statecraft';
import { type CardPaysEffect, type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { explainTechCost, foldTechCost, settleResearch } from '../../../src/sim/tech';
import {
  BUILDING_UNLOCK_TECH,
  CHARTER_TECH_IDS,
  TECH_IDS,
  type TechId,
  UNIT_UNLOCK_TECH,
  techDef,
} from '../../../src/sim/techData';
import { unitDef } from '../../../src/sim/unitData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { explainCity, productionModifiers } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

// --- benches -----------------------------------------------------------------

/**
 * A bare world for the leaf: `rivals.ts` reads `state.players` and nothing
 * else, so the seats are written out by hand.
 */
function seats(
  rows: { met?: number[]; techs?: TechId[]; barbarian?: boolean; eliminated?: boolean }[],
): GameState {
  const players = rows.map(
    (row, id) =>
      ({
        id,
        metSeats: row.met ?? [],
        techsResearched: row.techs ?? [],
        barbarian: row.barbarian === true,
        eliminated: row.eliminated === true,
      }) as unknown as Player,
  );
  return { players } as unknown as GameState;
}

/** Two seats on a flat grassland rectangle, at war. `scientificTraits.test.ts`' board. */
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
  const real = realPlayers(state);
  openWar(state, real[0]!.id, real[1]!.id);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Everything visible to everybody, so the fog is not the subject. */
function seeAll(state: GameState): void {
  for (const player of state.players) state.visibility[player.id]!.fill(2);
}

/** Writes who a seat has met, the way `recordMeetings` leaves it. */
function meet(state: GameState, playerId: number, ...others: number[]): void {
  playerById(state, playerId)!.metSeats = [...others];
  bumpRevision(state);
}

/** Teaches a seat technologies, the way a finished research leaves them. */
function learn(state: GameState, playerId: number, ...techs: TechId[]): void {
  const player = playerById(state, playerId)!;
  for (const tech of techs) if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  bumpRevision(state);
}

/** Grants a card and seats it, the way `scientific.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** The strength lines on one side of a forecast whose label holds `name`. */
function strength(
  state: GameState,
  attacker: Unit,
  col: number,
  row: number,
  side: 'attacker' | 'defender',
  name: string,
): number {
  seeAll(state);
  const view = previewCombat(state, attacker.id, { col, row });
  if (!view.ok) throw new Error(view.error);
  const list = side === 'attacker' ? view.attackerLines : view.defenderLines;
  return list.filter((line) => line.source.includes(name)).reduce((sum, line) => sum + line.amount, 0);
}

/** Ordinary technologies no seat starts with, in tree order: knowledge to hand out. */
function spareTechs(state: GameState, count: number): TechId[] {
  const known = new Set<TechId>();
  for (const player of state.players) for (const id of player.techsResearched) known.add(id);
  const spare = TECH_IDS.filter((id) => !known.has(id)).slice(0, count);
  expect(spare).toHaveLength(count);
  return spare;
}

// --- the leaf ----------------------------------------------------------------

describe('rivals.ts, the leaf', () => {
  it('counts only met empires: never itself, the barbarian seat or an eliminated empire', () => {
    const state = seats([
      { met: [0, 1, 2, 3, 4] },
      {},
      { barbarian: true },
      { eliminated: true },
      {},
    ]);
    expect(metRivals(state, 0).map((p) => p.id)).toEqual([1, 4]);
    expect(metRivals(state, 1)).toEqual([]);
    expect(metRivals(state, 99)).toEqual([]);
  });

  it('finds the lead: what the seat knows that no met empire knows, charter technologies included', () => {
    const charter = CHARTER_TECH_IDS[0]!;
    const state = seats([
      { met: [1], techs: ['agriculture', 'bronzeWorking', 'stonecraft', charter] },
      { techs: ['agriculture', 'stonecraft', 'sailing'] },
      // Not met: what it knows does not count against the lead.
      { techs: ['bronzeWorking'] },
    ]);
    expect(techLead(state, 0)).toEqual(['bronzeWorking', charter]);
    // Meeting the third seat closes the bronze half of the lead.
    playerById(state, 0)!.metSeats = [1, 2];
    expect(techLead(state, 0)).toEqual([charter]);
  });

  it('gives no lead to a seat that has met nobody (reading 18)', () => {
    const state = seats([{ techs: ['agriculture', 'bronzeWorking'] }, { techs: ['agriculture'] }]);
    expect(techLead(state, 0)).toEqual([]);
    // The barbarian seat is not company either.
    const wild = seats([{ met: [1], techs: ['agriculture', 'bronzeWorking'] }, { barbarian: true }]);
    expect(techLead(wild, 0)).toEqual([]);
  });

  it('finds the gap: what a met empire knows and the seat does not, charter technologies left out (reading 2)', () => {
    const charter = CHARTER_TECH_IDS[0]!;
    const state = seats([
      { met: [1, 2], techs: ['agriculture'] },
      { techs: ['agriculture', 'sailing', charter] },
      { techs: ['agriculture', 'bronzeWorking', 'sailing'] },
    ]);
    // Every met empire together, each technology once, in the tree's order.
    const both = techGap(state, 0);
    expect(new Set(both)).toEqual(new Set<TechId>(['sailing', 'bronzeWorking']));
    expect(both).toEqual(TECH_IDS.filter((id) => both.includes(id)));
    expect(both).not.toContain(charter);
    // One empire alone.
    expect(techGap(state, 0, 1)).toEqual(['sailing']);
    expect(techGap(state, 0, 2).slice().sort()).toEqual(['bronzeWorking', 'sailing']);
    // An empire the seat has not met has no gap to it.
    expect(techGap(state, 1, 2)).toEqual([]);
  });

  it('answers whether a met empire knows a technology, or can build a unit', () => {
    const spearGate = UNIT_UNLOCK_TECH.get('spearman')!;
    const state = seats([
      { met: [1], techs: ['agriculture'] },
      { techs: ['agriculture'] },
      { techs: ['agriculture', spearGate] },
    ]);
    expect(metEmpireKnows(state, 0, 'agriculture')).toBe(true);
    expect(metEmpireKnows(state, 0, spearGate)).toBe(false);
    expect(aheadOfMet(state, 0, spearGate)).toBe(true);
    expect(metEmpireCanBuild(state, 0, 'spearman')).toBe(false);
    expect(unitAheadOfMet(state, 0, 'spearman')).toBe(true);
    // A warrior's technology is known to all.
    expect(metEmpireCanBuild(state, 0, 'warrior')).toBe(true);
    expect(unitAheadOfMet(state, 0, 'warrior')).toBe(false);
    // Meeting the seat that knows it ends the lead on the spear.
    playerById(state, 0)!.metSeats = [1, 2];
    expect(aheadOfMet(state, 0, spearGate)).toBe(false);
    expect(unitAheadOfMet(state, 0, 'spearman')).toBe(false);
    // With nobody met, nothing is "ahead" (reading 18's reason).
    playerById(state, 0)!.metSeats = [];
    expect(aheadOfMet(state, 0, spearGate)).toBe(false);
    expect(unitAheadOfMet(state, 0, 'spearman')).toBe(false);
  });

  it('compares how many technologies two empires know, charter ones included, never the wild', () => {
    const charter = CHARTER_TECH_IDS[0]!;
    const state = seats([
      { techs: ['agriculture', charter] },
      { techs: ['agriculture'] },
      { techs: ['agriculture', 'sailing', 'stonecraft'] },
      { barbarian: true },
    ]);
    expect(knowsFewerTechs(state, 0, 1)).toBe(true);
    expect(knowsMoreTechs(state, 0, 1)).toBe(false);
    expect(knowsMoreTechs(state, 0, 2)).toBe(true);
    expect(knowsFewerTechs(state, 0, 2)).toBe(false);
    // Equal is neither.
    playerById(state, 1)!.techsResearched.push('sailing');
    expect(knowsFewerTechs(state, 0, 1)).toBe(false);
    expect(knowsMoreTechs(state, 0, 1)).toBe(false);
    // The barbarian seat is not an empire (reading 7), and a seat is not its own rival.
    expect(knowsFewerTechs(state, 0, 3)).toBe(false);
    expect(knowsFewerTechs(state, 0, 0)).toBe(false);
  });

  it('stays a leaf: values from techData.ts alone, types from state.ts', () => {
    const sources = import.meta.glob('../../../src/sim/rivals.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    });
    const source = Object.values(sources)[0] as string;
    const imports = [...source.matchAll(/^import (type )?[^;]*from '([^']+)';/gm)].map((match) => ({
      typeOnly: match[1] !== undefined,
      from: match[2]!,
    }));
    const valueImports = imports.filter((entry) => !entry.typeOnly).map((entry) => entry.from);
    expect(valueImports).toEqual(['./techData']);
  });
});

// --- the cards on a board ----------------------------------------------------

describe('The Secret Arts', () => {
  it('pays each town +1 production for each technology in the lead, at most +5', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 3, 3));
    const away = foundCityAt(state, 0, at(state, 3, 7));
    bumpRevision(state);
    const effect = orderDef('theSecretArts').effects[0] as CardPaysEffect;
    const count = (): number => countOf(state, 0, 'theSecretArts', effect, home);
    slot(state, 0, 'theSecretArts');
    const lines = (city: City): number =>
      explainCity(state, city)
        .lines.filter((line) => line.source.includes('The Secret Arts'))
        .reduce((sum, line) => sum + line.production, 0);
    learn(state, 0, ...spareTechs(state, 3));
    // Met nobody: no lead, no pay.
    meet(state, 0);
    expect(count()).toBe(0);
    expect(lines(home)).toBe(0);
    // Met the rival, who knows none of the three.
    meet(state, 0, 1);
    expect(count()).toBe(3);
    expect(lines(home)).toBe(3);
    expect(lines(away)).toBe(3);
    // Seven in the lead pays the cap.
    learn(state, 0, ...spareTechs(state, 4));
    expect(count()).toBe(7);
    expect(lines(home)).toBe(5);
  });
});

describe('The Translation Movement', () => {
  it('takes 20% off a technology a met empire knows, as one line of the price', () => {
    const state = flat();
    const seat = playerById(state, 0)!;
    const [known, unknown] = spareTechs(state, 2) as [TechId, TechId];
    learn(state, 1, known);
    meet(state, 0, 1);
    const column = techDef(known).cost;
    expect(explainTechCost(state, seat, known)).toHaveLength(1);
    slot(state, 0, 'theTranslationMovement');
    const lines = explainTechCost(state, seat, known);
    expect(lines).toHaveLength(2);
    expect(lines[1]!.source).toContain('The Translation Movement');
    expect(foldTechCost(lines)).toBe(Math.floor((column * 80) / 100));
    // A technology no met empire knows costs its column.
    expect(explainTechCost(state, seat, unknown)).toHaveLength(1);
    // An empire the seat has not met teaches it nothing.
    meet(state, 0);
    expect(explainTechCost(state, seat, known)).toHaveLength(1);
  });

  it('never discounts a charter technology (reading 15)', () => {
    const state = flat();
    const seat = playerById(state, 0)!;
    const charter = CHARTER_TECH_IDS[0]!;
    learn(state, 1, charter);
    meet(state, 0, 1);
    const before = explainTechCost(state, seat, charter);
    slot(state, 0, 'theTranslationMovement');
    expect(explainTechCost(state, seat, charter)).toEqual(before);
  });

  it('is what research charges', () => {
    const state = flat();
    const seat = playerById(state, 0)!;
    const [known] = spareTechs(state, 1) as [TechId];
    learn(state, 1, known);
    meet(state, 0, 1);
    slot(state, 0, 'theTranslationMovement');
    // Prerequisites in hand, so the node may be finished.
    learn(state, 0, ...techDef(known).prereqs);
    seat.researching = known;
    seat.researchQueue = [];
    const price = foldTechCost(explainTechCost(state, seat, known));
    expect(price).toBeLessThan(techDef(known).cost);
    seat.sciencePool = price;
    const done = settleResearch(state, seat);
    expect(done?.techId).toBe(known);
    expect(done?.cost).toBe(price);
  });
});

describe('The Edge of the Sword', () => {
  it('adds +3 in a fight with an empire that knows fewer technologies, attacking and defending', () => {
    const state = flat();
    slot(state, 0, 'theEdgeOfTheSword');
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    const theirs = createUnit(state, 1, 'warrior', 5, 4);
    // Level: no line.
    expect(strength(state, mine, 5, 4, 'attacker', 'The Edge of the Sword')).toBe(0);
    // Ahead by one: the line, on both sides of the fight.
    learn(state, 0, ...spareTechs(state, 1));
    expect(strength(state, mine, 5, 4, 'attacker', 'The Edge of the Sword')).toBe(3);
    expect(strength(state, theirs, 4, 4, 'defender', 'The Edge of the Sword')).toBe(3);
    // The rival's own lines carry no such thing.
    expect(strength(state, theirs, 4, 4, 'attacker', 'The Edge of the Sword')).toBe(0);
    // Behind: no line.
    learn(state, 1, ...spareTechs(state, 2));
    expect(strength(state, mine, 5, 4, 'attacker', 'The Edge of the Sword')).toBe(0);
  });
});

describe('The Proving Ground', () => {
  it('adds +1 for each technology in the lead, at most +8, and nothing with nobody met', () => {
    const state = flat();
    slot(state, 0, 'theProvingGround');
    const mine = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'warrior', 5, 4);
    learn(state, 0, ...spareTechs(state, 3));
    meet(state, 0);
    expect(strength(state, mine, 5, 4, 'attacker', 'The Proving Ground')).toBe(0);
    meet(state, 0, 1);
    expect(strength(state, mine, 5, 4, 'attacker', 'The Proving Ground')).toBe(3);
    learn(state, 0, ...spareTechs(state, 7));
    expect(techLead(state, 0)).toHaveLength(10);
    expect(strength(state, mine, 5, 4, 'attacker', 'The Proving Ground')).toBe(8);
  });
});

describe('The Great Designs', () => {
  const wonder = 'pyramids';
  const gate = BUILDING_UNLOCK_TECH.get(wonder)!;

  function townBuilding(state: GameState): City {
    const city = foundCityAt(state, 0, at(state, 4, 4));
    bumpRevision(state);
    return city;
  }
  const designs = (state: GameState, city: City, id: string): number =>
    productionModifiers(state, city, { kind: 'building', id } as never)
      .filter((line) => line.source.includes('The Great Designs'))
      .reduce((sum, line) => sum + line.percent, 0);

  it('adds 30% to a wonder while no met empire knows the technology that opens it (reading 46)', () => {
    expect(gate).toBeDefined();
    const state = flat();
    const city = townBuilding(state);
    learn(state, 0, gate);
    slot(state, 0, 'theGreatDesigns');
    // Met nobody: no bonus.
    meet(state, 0);
    expect(designs(state, city, wonder)).toBe(0);
    meet(state, 0, 1);
    expect(designs(state, city, wonder)).toBe(30);
    // The rival learns it, and the bonus stops.
    learn(state, 1, gate);
    expect(designs(state, city, wonder)).toBe(0);
  });

  it('reaches wonders only', () => {
    const state = flat();
    const city = townBuilding(state);
    const granaryGate = BUILDING_UNLOCK_TECH.get('granary');
    if (granaryGate !== undefined) learn(state, 0, granaryGate);
    meet(state, 0, 1);
    slot(state, 0, 'theGreatDesigns');
    expect(designs(state, city, 'granary')).toBe(0);
  });
});

describe('Greek Fire', () => {
  it('grants science and culture equal to the strength of a unit no met empire can build (reading 45)', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4));
    bumpRevision(state);
    const seat = playerById(state, 0)!;
    // Far up the ladder, so the culture stays in the pool rather than buying a
    // draft at once, and no research to finish.
    seat.statecraft.drafts = 25;
    seat.researching = null;
    seat.researchQueue = [];
    learn(state, 0, UNIT_UNLOCK_TECH.get('spearman')!);
    meet(state, 0, 1);
    slot(state, 0, 'greekFire');
    const tile = at(state, city.col, city.row);
    const gained = (type: 'spearman' | 'warrior'): { science: number; culture: number } => {
      const science = seat.sciencePool;
      const culture = seat.culturePool;
      realiseItem(state, city, { kind: 'unit', id: type, tile });
      return { science: seat.sciencePool - science, culture: seat.culturePool - culture };
    };
    const spear = unitDef('spearman').combatStrength;
    expect(gained('spearman')).toEqual({ science: spear, culture: spear });
    // Everybody can build a warrior: nothing.
    expect(gained('warrior')).toEqual({ science: 0, culture: 0 });
    // Once the rival knows bronze, the spear pays nothing either.
    learn(state, 1, UNIT_UNLOCK_TECH.get('spearman')!);
    expect(gained('spearman')).toEqual({ science: 0, culture: 0 });
  });
});

describe('Books from the Ships (shared with Commerce)', () => {
  it('pays a foreign route +1 science for each technology its destination’s owner knows, at most +4', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 3, 3));
    const second = foundCityAt(state, 0, at(state, 3, 7));
    const abroad = foundCityAt(state, 1, at(state, 10, 4));
    bumpRevision(state);
    meet(state, 0, 1);
    slot(state, 0, 'booksFromTheShips');
    const science = (to?: City): number =>
      cardRouteYieldLines(state, home, to)
        .filter((line) => line.card === 'booksFromTheShips')
        .reduce((sum, line) => sum + line.science, 0);
    // The rival knows nothing the seat does not.
    expect(science(abroad)).toBe(0);
    learn(state, 1, ...spareTechs(state, 2));
    expect(science(abroad)).toBe(2);
    learn(state, 1, ...spareTechs(state, 4));
    expect(science(abroad)).toBe(4);
    // A route between two of the seat's own towns is not foreign, and a
    // preview with no far end promises nothing.
    expect(science(second)).toBe(0);
    expect(science(undefined)).toBe(0);
    // A rival's charter technology is not in the gap.
    learn(state, 0, ...techGap(state, 0));
    learn(state, 1, CHARTER_TECH_IDS[0]!);
    expect(science(abroad)).toBe(0);
  });
});

// --- the rows ----------------------------------------------------------------

describe('the rows', () => {
  const ROWS: [OrderId, number, string][] = [
    ['theSecretArts', 1, 'economic'],
    ['theEdgeOfTheSword', 1, 'military'],
    ['theTranslationMovement', 2, 'civic'],
    ['theGreatDesigns', 2, 'economic'],
    ['greekFire', 3, 'civic'],
    ['theProvingGround', 3, 'military'],
  ];

  it('are dealt, typed and banded as the sheet says', () => {
    for (const [id, band, type] of ROWS) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(def.decks, id).toEqual(['scientific']);
      expect(def.band, id).toBe(band);
      expect(def.type, id).toBe(type);
      expect(def.deferred, id).toBeUndefined();
    }
    const books = orderDef('booksFromTheShips');
    expect(orderIsDealt('booksFromTheShips')).toBe(true);
    expect(books.decks).toEqual(['commerce', 'scientific']);
    expect(books.band).toBe(2);
    expect(books.type).toBe('civic');
  });

  it('are said in a first-time player’s words', () => {
    const said = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(said('theSecretArts')).toEqual([
      '+1 production in every city per technology you know that no empire you have met knows (at most +5 production)',
    ]);
    expect(said('theEdgeOfTheSword')).toEqual([
      '+3 combat strength against an empire that knows fewer technologies than you',
    ]);
    expect(said('theTranslationMovement')).toEqual([
      'technologies that an empire you have met already knows cost you 20% less research',
    ]);
    expect(said('theGreatDesigns')).toEqual([
      '+30% production toward wonders, while no empire you have met knows the technology that opens it',
    ]);
    expect(said('greekFire')).toEqual([
      'gaining a unit that no empire you have met can build grants science equal to its strength',
      'gaining a unit that no empire you have met can build grants culture equal to its strength',
    ]);
    expect(said('theProvingGround')).toEqual([
      '+1 combat strength per technology you know that no empire you have met knows (at most +8)',
    ]);
    expect(said('booksFromTheShips')).toEqual([
      '+1 science per technology the destination’s owner knows that you do not (at most +4 science), on trade routes that end in another empire’s city',
    ]);
  });
});
