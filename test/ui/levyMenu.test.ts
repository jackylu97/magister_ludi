/**
 * The levy control in the city panel (batch L, `src/ui/levyMenu.ts`): a
 * "Levy a citizen" button and its short menu.
 *
 * No jsdom, so the pure half (`levyMenuModel`) is tested directly and the
 * panel's wiring is read from its source, as the other city-panel suites do.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, growthThreshold, refreshCityDerived } from '../../src/sim/cities';
import { type Command } from '../../src/sim/commands';
import { dispatch, type Game } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type City, bumpRevision, playerById } from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { levyMenuModel } from '../../src/ui/levyMenu';
import { braceBody, uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

function bench(population = 6): { g: Game; city: City } {
  const g = createGame({
    seed: 31,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: 'pachacuti' },
      { name: 'Bors', color: '#3a7fe8', leader: 'taizong' },
    ],
  });
  const unit = g.state.units.find((u) => u.ownerId === 0)!;
  const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!)!;
  city.population = population;
  city.queue = [];
  refreshCityDerived(g.state, city);
  bumpRevision(g.state);
  return { g, city };
}

function seat(g: Game, card: string): void {
  const sc = playerById(g.state, 0)!.statecraft;
  sc.orders.push(card as OrderId);
  sc.slots.push({ card: card as OrderId, sealedUntil: g.state.turn });
  bumpRevision(g.state);
}

describe('the levy menu', () => {
  it('has no button when no held card grants a levy', () => {
    const { g, city } = bench();
    expect(levyMenuModel(g.state, 0, city)).toBeNull();
  });

  it('lists only the uses the held cards grant, with the figure and the card', () => {
    const { g, city } = bench(6);
    seat(g, 'levyOfTheLand');
    const model = levyMenuModel(g.state, 0, city)!;
    expect(model.lines.map((line) => line.use)).toEqual(['production']);
    const [line] = model.lines;
    expect(line!.label).toBe('Production here');
    expect(line!.figure).toBe(`+${growthThreshold(5)}⚙`);
    expect(line!.source).toMatch(/^Levy of the Land: /);
    expect(model.disabled).toBe(false);
    expect(model.cost).toBe(
      `Costs 1 citizen (pop 6 → 5). Next levy here in ${RULES.cities.levy.everyTurns} turns.`,
    );

    seat(g, 'theMusterOfTheFields');
    const both = levyMenuModel(g.state, 0, city)!;
    expect(both.lines.map((row) => row.use)).toEqual(['production', 'muster']);
    expect(both.lines[1]!.source).toMatch(/^The Muster of the Fields: /);
  });

  it('greys the button while the town waits, with the turns left on its hover', () => {
    const { g, city } = bench(8);
    seat(g, 'levyOfTheLand');
    const command: Command = { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'production' };
    expect(dispatch(g, command).ok).toBe(true);
    const model = levyMenuModel(g.state, 0, city)!;
    expect(model.disabled).toBe(true);
    expect(model.title).toBe(
      `${city.name} can levy again in ${RULES.cities.levy.everyTurns} turns`,
    );
  });
});

describe('the city panel wiring', () => {
  const PANEL = uiSource('cityPanel.ts');

  it('mounts the levy control in the town rail', () => {
    expect(braceBody(PANEL, 'function renderTownRail(')).toContain('renderLevy(city)');
  });

  it('sends levyCitizen through its own reporter, never a dispatcher of the menu’s', () => {
    const body = braceBody(PANEL, 'function renderLevy(');
    expect(body).toContain("type: 'levyCitizen'");
    expect(body).toContain('report(command, dispatch(getGame(), command))');
    expect(uiSource('levyMenu.ts')).not.toMatch(/\bdispatch\(/);
  });
});
