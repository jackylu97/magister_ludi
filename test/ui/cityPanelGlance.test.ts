/**
 * The town at a glance (batch UX6): what the band says the town is short of,
 * the citizen line, stepping between towns, and the turns a rite would last.
 *
 * The chips' own lists, and that each adds up to its chip, are
 * `cityModifiers.test.ts`'s. This file holds the rest of the batch: each piece
 * is a pure function asked of the simulation, so a suite with no document can
 * check what it says, and the wiring that only the source can show is read off
 * the source.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, growthSurplus } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { happinessOf } from '../../src/sim/meters';
import { readCity } from '../../src/sim/readings';
import { riteTurnsFor } from '../../src/sim/religion';
import { resourceDef } from '../../src/sim/resourceData';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { gatingTech } from '../../src/sim/tech';
import { pacificationTurnsLeft } from '../../src/sim/unrest';
import { resetVisibility } from '../../src/sim/visibility';
import { foldCity } from '../../src/sim/yields/town';
import {
  citizenLineText,
  citizenParts,
  shortOfChips,
  steppedTownId,
  townsInOrder,
} from '../../src/ui/cityPanel';
import { riteOfferText, riteSentence } from '../../src/ui/controls';
import { turnsLabel } from '../../src/ui/figures';
import { between, braceBody, uiSource } from './sourceHelpers';
import { newGame } from '../sim/newGameHelpers';

/** A blank board for two seats. */
function bench(terrain: 'grassland' | 'desert' = 'grassland'): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function town(state: GameState, seat: number, col: number, row: number): City {
  const city = foundCityAt(state, seat, getTileAt(state.map, col, row)!);
  bumpRevision(state);
  return city;
}

/** A mined iron seam in a town's ground, with the technology that names it. */
function ironSeam(state: GameState, city: City, col: number, row: number, copies: number): void {
  const tile = getTileAt(state.map, col, row)!;
  tile.resource = 'iron';
  tile.resourceCopies = copies;
  tile.improvement = 'mine';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  const gate = resourceDef('iron').requiresTech;
  const player = playerById(state, city.ownerId)!;
  if (gate !== undefined && !player.techsResearched.includes(gate)) player.techsResearched.push(gate);
  bumpRevision(state);
}

function chips(state: GameState, city: City) {
  return shortOfChips(state, city, readCity(state, city));
}

describe('what a town is short of', () => {
  it('says nothing at all for a town that is fine', () => {
    const state = bench();
    const city = town(state, 0, 5, 5);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    expect(chips(state, city)).toEqual([]);
  });

  it('says Idle when nothing is queued, and points at the build list', () => {
    const state = bench();
    const city = town(state, 0, 5, 5);
    city.queue = [];
    bumpRevision(state);
    expect(chips(state, city)).toEqual([
      expect.objectContaining({ id: 'idle', label: 'Idle', target: 'buildList' }),
    ]);
    // A puppet chooses for itself, so it is never told it is idle.
    city.puppet = true;
    bumpRevision(state);
    expect(chips(state, city).map((chip) => chip.id)).not.toContain('idle');
  });

  it('says Starving when the town eats more than it makes, and points at Focus', () => {
    const state = bench('desert');
    const city = town(state, 0, 5, 5);
    city.population = 5;
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    // The same figure the Growth row prints "starving" off.
    const quote = readCity(state, city);
    expect(growthSurplus(state, city, foldCity(state, city, [], undefined, quote))).toBeLessThan(0);
    expect(chips(state, city)).toContainEqual(
      expect.objectContaining({ id: 'starving', label: 'Starving', target: 'focus' }),
    );
  });

  it('says In unrest first, with the turns left, and points at the unrest card', () => {
    const state = bench();
    const city = town(state, 0, 5, 5);
    city.queue = [];
    city.unrest = { target: 12, progress: 3, unguarded: 1 };
    bumpRevision(state);
    const said = chips(state, city);
    expect(said[0]).toMatchObject({
      id: 'unrest',
      label: 'In unrest',
      figure: turnsLabel(pacificationTurnsLeft(state, city)),
      target: 'unrest',
    });
    // Idle too, after it.
    expect(said.map((chip) => chip.id)).toEqual(['unrest', 'idle']);
  });

  it('says Unhappy when the empire is unhappy, and points at the Growth row', () => {
    const state = bench();
    const capital = town(state, 0, 4, 4);
    const second = town(state, 0, 11, 4);
    capital.population = 8;
    second.population = 4;
    capital.queue = [{ kind: 'unit', id: 'warrior' }];
    second.queue = [{ kind: 'unit', id: 'warrior' }];
    playerById(state, 0)!.gold = -40;
    bumpRevision(state);
    expect(happinessOf(state, 0)).toBeLessThan(0);
    expect(chips(state, capital)).toContainEqual(
      expect.objectContaining({ id: 'unhappy', label: 'Unhappy', target: 'growth' }),
    );
  });

  it('says No Iron spare when every copy is spoken for and a row here needs one', () => {
    const state = bench();
    const city = town(state, 0, 5, 5);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    ironSeam(state, city, 4, 5, 1);
    const gate = gatingTech('unit', 'legionary');
    if (gate !== null) playerById(state, 0)!.techsResearched.push(gate);
    bumpRevision(state);
    // One copy, held and spare: nothing to say.
    expect(chips(state, city).map((chip) => chip.id)).not.toContain('resource');
    // A legionary in the field speaks for it, and the legionary's row here wants one.
    createUnit(state, 0, 'legionary', 9, 5);
    bumpRevision(state);
    expect(chips(state, city)).toContainEqual({
      id: 'resource',
      label: 'No Iron spare',
      figure: '0/1',
      why: 'Iron: 0 spare of 1. The Legionary needs one.',
      target: 'row:legionary',
    });
  });

  it('is drawn as links in the middle of the band, said in words for a screen reader', () => {
    const panel = uiSource('cityPanel.ts');
    expect(braceBody(panel, 'function renderBand(')).toContain('band.append(renderShortOf(city, quote));');
    const short = braceBody(panel, 'function renderShortOf(');
    expect(short).toContain("button.addEventListener('click', () => pointTo(chip.target));");
    expect(short).toContain('button.setAttribute(\'aria-label\', `${chip.label}: ${chip.why}`);');
    // The old badges beside the name are gone: each problem is said once.
    expect(panel).not.toContain("'city-size is-siege'");
  });
});

describe('the citizen line', () => {
  it('says where every citizen is, and the parts add up to the town', () => {
    expect(citizenLineText({ population: 11, land: 8, specialists: 2, idle: 1 })).toBe(
      'Citizens 11: 8 on land · 2 specialists · 1 idle',
    );
    // A part with nobody in it is left out, except the land.
    expect(citizenLineText({ population: 5, land: 5, specialists: 0, idle: 0 })).toBe(
      'Citizens 5: 5 on land',
    );
    expect(citizenLineText({ population: 3, land: 2, specialists: 1, idle: 0 })).toBe(
      'Citizens 3: 2 on land · 1 specialist',
    );
  });

  it('reads the town: worked hexes, specialists, and the rest idle', () => {
    const state = bench();
    const city = town(state, 0, 5, 5);
    city.population = 5;
    city.specialists.scholar = 1;
    city.workedTiles = city.workedTiles.slice(0, 2);
    const parts = citizenParts(city);
    const land = city.workedTiles.length;
    expect(land).toBeGreaterThan(0);
    expect(parts).toEqual({ population: 5, land, specialists: 1, idle: 5 - land - 1 });
    expect(parts.idle).toBeGreaterThan(0);
    expect(parts.land + parts.specialists + parts.idle).toBe(parts.population);
  });

  it('replaced "8/11 working" on the Growth row', () => {
    const panel = uiSource('cityPanel.ts');
    expect(braceBody(panel, 'function renderCitizens(')).toContain(
      'citizenLineText(citizenParts(city))',
    );
    expect(panel).not.toContain('working`');
  });
});

describe('stepping between towns', () => {
  function realm(): { state: GameState; first: City; puppet: City; last: City } {
    const state = bench();
    const first = town(state, 0, 2, 2);
    town(state, 1, 7, 2);
    const puppet = town(state, 0, 12, 2);
    puppet.puppet = true;
    const last = town(state, 0, 2, 7);
    bumpRevision(state);
    return { state, first, puppet, last };
  }

  it('walks the seat’s towns in founding order, puppets included, and no one else’s', () => {
    const { state, first, puppet, last } = realm();
    expect(townsInOrder(state, 0).map((city) => city.id)).toEqual([first.id, puppet.id, last.id]);
  });

  it('steps forward and back, and wraps at both ends', () => {
    const { state, first, puppet, last } = realm();
    expect(steppedTownId(state, 0, first.id, 1)).toBe(puppet.id);
    expect(steppedTownId(state, 0, puppet.id, 1)).toBe(last.id);
    expect(steppedTownId(state, 0, last.id, 1)).toBe(first.id);
    expect(steppedTownId(state, 0, first.id, -1)).toBe(last.id);
    expect(steppedTownId(state, 0, puppet.id, -1)).toBe(first.id);
  });

  it('has nowhere to step with only one town', () => {
    const state = bench();
    const only = town(state, 0, 5, 5);
    expect(steppedTownId(state, 0, only.id, 1)).toBeNull();
    expect(steppedTownId(state, 0, only.id, -1)).toBeNull();
  });

  it('binds comma and period while a town is open, never with a modifier, through setOpenCity', () => {
    const controls = uiSource('controls.ts');
    const keys = controls.slice(controls.indexOf("window.addEventListener('keydown'"));
    const branch = keys.slice(keys.indexOf("(event.key === ',' || event.key === '.')"));
    expect(branch.indexOf('!event.ctrlKey')).toBeGreaterThan(-1);
    expect(branch.indexOf('!event.metaKey')).toBeGreaterThan(-1);
    expect(branch.indexOf('openCity() !== null')).toBeGreaterThan(-1);
    expect(branch).toContain("stepOpenCity(event.key === ',' ? -1 : 1);");
    // After the guard that hands every key but Escape to a field being typed in.
    expect(keys.indexOf("if (typing && event.key !== 'Escape') return;")).toBeLessThan(
      keys.indexOf("(event.key === ',' || event.key === '.')"),
    );
    const step = braceBody(controls, 'function stepOpenCity(');
    expect(step).toContain('steppedTownId(getGame().state, localPlayerId, city.id, step)');
    expect(step).toContain('setOpenCity(next)');
  });

  it('draws ‹ and › beside the name only when the page hands in a way to open a town', () => {
    const panel = uiSource('cityPanel.ts');
    // Sliced rather than brace-matched: the function's return type has braces of its own.
    const arrows = between(panel, 'function stepButtons(', 'function renderShortOf(');
    expect(arrows).toContain('const open = options.onOpenCity;');
    expect(arrows).toContain('if (open === undefined) return null;');
    expect(arrows).toContain('steppedTownId(state, localPlayerId(), city.id, step)');
    expect(arrows).toContain("button.addEventListener('click', () => open(target));");
  });
});

describe('the turns a rite would last', () => {
  function chapelTown(): { state: GameState; city: City } {
    const state = bench();
    const city = town(state, 0, 5, 5);
    city.name = 'Uruk';
    bumpRevision(state);
    return { state, city };
  }

  it('says the base turns when nothing lengthens a rite', () => {
    const { state, city } = chapelTown();
    expect(riteOfferText(state, 0, 'omenReading')).toContain(
      `lasts ${riteTurnsFor(state, 0, 'omenReading')} turns`,
    );
    expect(riteSentence(state, city, 'omenReading')).toContain('lasts 10 turns');
  });

  it('says the longer turns when Chichen Itza stands, on the row and in the announcement', () => {
    const { state, city } = chapelTown();
    city.buildings.push('chichenItza');
    bumpRevision(state);
    const turns = riteTurnsFor(state, 0, 'omenReading');
    expect(turns).toBe(15);
    expect(riteOfferText(state, 0, 'omenReading')).toContain('lasts 15 turns');
    expect(riteSentence(state, city, 'omenReading')).toContain('lasts 15 turns');
  });

  it('prints the same words on the city’s rite row as in the announcement', () => {
    const controls = uiSource('controls.ts');
    expect(braceBody(controls, 'function riteOptions(')).toContain(
      'preview: riteOfferText(state, localPlayerId, id),',
    );
    expect(braceBody(controls, 'export function riteSentence(')).toContain(
      'riteOfferText(state, city.ownerId, id)',
    );
  });

  it('says one turn, not one turns, on the Rites shelf', () => {
    const rail = braceBody(uiSource('cityPanel.ts'), 'function renderTownRail(');
    expect(rail).toContain("${left} ${left === 1 ? 'turn' : 'turns'} left");
    expect(rail).not.toContain('more turns');
  });
});
