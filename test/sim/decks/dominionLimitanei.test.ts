/**
 * **Dominion batch D13, The Limitanei** (`docs/plans/dominion-themes-
 * triage.md`, the D13 section, and reading 24). `dominion.test.ts` checks the
 * row against the sheet, and `test/fixtures/cardText.json` pins its words.
 * This file checks that the `garrisonWorks` rule does what the card says:
 *
 *   · each combat unit of the owner on a town's hex lets the town work one
 *     more hex, ships included, up to the row's `max` of two;
 *   · a civilian or a great general adds nothing, and nothing changes without
 *     the card;
 *   · the extra hexes are filled after the citizens' hexes, eat no food, and
 *     count as worked hexes for every card;
 *   · they are seated at the next assignment, not when a unit walks in.
 *
 * The register pins on `assignCitizens` (`test/sim/cities.test.ts`,
 * `test/sim/slateRegister.test.ts`) are not moved: the rule is read inside
 * `chooseCitizens`, and no new caller assigns citizens.
 */

import { describe, expect, it } from 'vitest';

import { foodUpkeep, foundCityAt, refreshCityDerived, workableSeats } from '../../../src/sim/cities';
import { type Tile, createMap, getTileAt, neighborTiles, tileHex } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import { type City, type GameState, bumpRevision, createUnit, playerById } from '../../../src/sim/state';
import { cardGarrisonSeats, countOf, describeCard, stripRefs } from '../../../src/sim/statecraft';
import { type CardPaysEffect, type OrderId, orderDef } from '../../../src/sim/statecraftData';
import { resetVisibility } from '../../../src/sim/visibility';
import { foldCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

const LIMITANEI = 'theLimitanei' as OrderId;

/** Two seats on a flat grassland rectangle, at peace. */
function flat(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: false,
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Puts an Order in a chair for seat 0, the way the reading sees it. */
function slot(state: GameState, id: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/**
 * Seat 0's town at (6, 6) with this many citizens, one neighbour turned to
 * coast so a ship may stand in it, and its citizens seated.
 */
function town(population: number): { state: GameState; city: City } {
  const state = flat();
  const water = neighborTiles(state.map, tileHex(at(state, 6, 6)))[0]!;
  water.terrain = 'coast';
  const city = foundCityAt(state, 0, at(state, 6, 6));
  city.population = population;
  bumpRevision(state);
  refreshCityDerived(state, city);
  return { state, city };
}

/** A piece of seat 0's standing on the town's hex. */
function stand(state: GameState, city: City, type: string, person?: string): void {
  createUnit(state, 0, type as never, city.col, city.row, person as never);
  bumpRevision(state);
}

function worked(city: City): string[] {
  return city.workedTiles.map((cell) => `${cell.col},${cell.row}`);
}

describe('Dominion D13 — The Limitanei', () => {
  it('is a rare Economic Order of Tier III with one rule, capped at two', () => {
    const def = orderDef(LIMITANEI);
    expect(def.band).toBe(3);
    expect(def.rarity).toBe('rare');
    expect(def.type).toBe('economic');
    expect(def.effects).toEqual([{ kind: 'rule', rule: 'garrisonWorks', max: 2 }]);
  });

  it('says the rule and its cap in its words', () => {
    const words = describeCard(LIMITANEI)
      .map((clause) => stripRefs(clause.text))
      .join(' | ');
    expect(words).toBe('each military unit in one of your cities lets that city work one more hex, at most 2 more');
  });

  it('gives a soldier no hex without the card', () => {
    const { state, city } = town(2);
    stand(state, city, 'warrior');
    refreshCityDerived(state, city);
    expect(cardGarrisonSeats(state, city)).toBe(0);
    expect(city.workedTiles).toHaveLength(2);
  });

  it('lets a land soldier work one more hex, and a ship in a coastal town a second', () => {
    const { state, city } = town(2);
    slot(state, LIMITANEI);
    stand(state, city, 'warrior');
    refreshCityDerived(state, city);
    expect(cardGarrisonSeats(state, city)).toBe(1);
    expect(city.workedTiles).toHaveLength(3);

    stand(state, city, 'trireme');
    refreshCityDerived(state, city);
    expect(cardGarrisonSeats(state, city)).toBe(2);
    expect(city.workedTiles).toHaveLength(4);
  });

  it('stops at two more, even with a third combat unit on the hex', () => {
    // Stacking holds one land soldier and one ship, so a third piece is put
    // there directly. The cap still holds.
    const { state, city } = town(2);
    slot(state, LIMITANEI);
    stand(state, city, 'warrior');
    stand(state, city, 'trireme');
    stand(state, city, 'spearman');
    refreshCityDerived(state, city);
    expect(cardGarrisonSeats(state, city)).toBe(2);
    expect(city.workedTiles).toHaveLength(4);
  });

  it('counts no civilian and no great general', () => {
    const { state, city } = town(2);
    slot(state, LIMITANEI);
    stand(state, city, 'worker');
    stand(state, city, 'greatPerson', 'hannibal');
    refreshCityDerived(state, city);
    expect(cardGarrisonSeats(state, city)).toBe(0);
    expect(city.workedTiles).toHaveLength(2);
  });

  it('counts only the soldiers standing in that town', () => {
    const { state, city } = town(2);
    slot(state, LIMITANEI);
    createUnit(state, 0, 'warrior', city.col + 2, city.row);
    bumpRevision(state);
    refreshCityDerived(state, city);
    expect(cardGarrisonSeats(state, city)).toBe(0);
    expect(city.workedTiles).toHaveLength(2);
  });

  it('fills the soldiers’ hexes after the citizens’, so the citizens keep the hexes they had', () => {
    const { state, city } = town(3);
    const before = worked(city);
    slot(state, LIMITANEI);
    stand(state, city, 'warrior');
    refreshCityDerived(state, city);
    const after = worked(city);
    expect(after).toHaveLength(4);
    for (const cell of before) expect(after).toContain(cell);
  });

  it('adds a soldier’s seat to the citizens left on the land after the specialists', () => {
    const { state, city } = town(3);
    city.specialists.scholar = 1;
    bumpRevision(state);
    refreshCityDerived(state, city);
    expect(city.workedTiles).toHaveLength(2);
    slot(state, LIMITANEI);
    stand(state, city, 'warrior');
    refreshCityDerived(state, city);
    expect(city.workedTiles).toHaveLength(3);
  });

  it('gives the soldiers nothing when the citizens already work every hex the town can, and leaves the idle count alone', () => {
    const { state, city } = town(1);
    const seats = workableSeats(state, city);
    city.population = seats;
    bumpRevision(state);
    slot(state, LIMITANEI);
    stand(state, city, 'warrior');
    refreshCityDerived(state, city);
    expect(city.workedTiles).toHaveLength(seats);
    expect(workableSeats(state, city)).toBe(seats);
  });

  it('feeds the town from the extra hexes and eats nothing for them', () => {
    const { state, city } = town(2);
    const upkeep = foodUpkeep(city);
    const food = foldCity(state, city).food;
    slot(state, LIMITANEI);
    stand(state, city, 'warrior');
    refreshCityDerived(state, city);
    expect(city.population).toBe(2);
    expect(foodUpkeep(city)).toBe(upkeep);
    expect(foldCity(state, city).food).toBeGreaterThan(food);
  });

  it('counts the extra hexes as worked hexes for every card', () => {
    const { state, city } = town(2);
    const worked = { kind: 'pays', where: 'city', basis: 'count', count: 'workedTilesInCity' } as CardPaysEffect;
    expect(countOf(state, 0, LIMITANEI, worked, city)).toBe(2);
    slot(state, LIMITANEI);
    stand(state, city, 'warrior');
    stand(state, city, 'trireme');
    refreshCityDerived(state, city);
    expect(countOf(state, 0, LIMITANEI, worked, city)).toBe(4);
  });

  it('seats a soldier at the next assignment, not when it walks in, and drops the hex at the next one after it leaves', () => {
    const { state, city } = town(2);
    slot(state, LIMITANEI);
    refreshCityDerived(state, city);
    expect(city.workedTiles).toHaveLength(2);

    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    bumpRevision(state);
    expect(city.workedTiles).toHaveLength(2);
    refreshCityDerived(state, city);
    expect(city.workedTiles).toHaveLength(3);

    soldier.col = city.col + 2;
    bumpRevision(state);
    expect(city.workedTiles).toHaveLength(3);
    refreshCityDerived(state, city);
    expect(city.workedTiles).toHaveLength(2);
  });

  it('gives nothing once the card leaves its chair', () => {
    const { state, city } = town(2);
    slot(state, LIMITANEI);
    stand(state, city, 'warrior');
    refreshCityDerived(state, city);
    expect(city.workedTiles).toHaveLength(3);
    const sc = playerById(state, 0)!.statecraft;
    sc.slots = sc.slots.filter((held) => held?.card !== LIMITANEI);
    bumpRevision(state);
    refreshCityDerived(state, city);
    expect(city.workedTiles).toHaveLength(2);
  });
});
