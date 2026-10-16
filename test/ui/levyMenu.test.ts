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
import { getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
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

  it('prints the newer uses with their own figure and words (Expansionist batch E1)', () => {
    const { g, city } = bench(6);
    seat(g, 'theWorkGangs');
    seat(g, 'theTerracesOfMoray');
    // The Terraces of Moray grants its levy only to a town beside a mountain.
    const centre = getTileAt(g.state.map, city.col, city.row)!;
    neighborTiles(g.state.map, tileHex(centre))[0]!.terrain = 'mountain';
    bumpRevision(g.state);
    const model = levyMenuModel(g.state, 0, city)!;
    expect(model.lines.map((line) => line.use)).toEqual(['worker', 'science']);
    const [worker, science] = model.lines;
    expect(worker!.label).toBe('Raise Worker');
    expect(worker!.source).toBe('The Work Gangs: a worker, not counted as trained');
    expect(science!.label).toBe('Science');
    expect(science!.figure).toBe(`+${growthThreshold(5)}🔬`);
    expect(science!.source).toBe(
      'The Terraces of Moray: the food it took to grow this citizen, as science',
    );
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

  it('mounts the levy control on the Growth card’s population line', () => {
    // Since batch UX7 (A1: "the levy sits on the town's population line ...
    // because it spends a citizen"), at the end of the citizen line, with its
    // menu, or the reason it is greyed, under the line.
    const growth = braceBody(PANEL, 'function renderGrowth(');
    expect(growth).toContain('const levy = renderLevy(city);');
    expect(growth).toContain('box.append(renderCitizens(city, levy?.trigger ?? null));');
    expect(growth).toContain('if (levy?.below) box.append(levy.below);');
    expect(braceBody(PANEL, 'function renderTownRail(')).not.toContain('renderLevy(city)');
  });

  it('says why a greyed levy is greyed on a line, never only in a tooltip', () => {
    expect(PANEL).toContain(
      "if (model.disabled) return { trigger, below: refusalLineElement(model.title, 'row') };",
    );
    expect(uiSource('levyMenu.ts')).not.toMatch(/\.title = /);
  });

  it('sends levyCitizen through its own reporter, never a dispatcher of the menu’s', () => {
    const body = PANEL.slice(
      PANEL.indexOf('  function renderLevy('),
      PANEL.indexOf('  /** The quiet Dismiss beside one trade.'),
    );
    expect(body).toContain("type: 'levyCitizen'");
    expect(body).toContain('report(command, dispatch(getGame(), command))');
    expect(uiSource('levyMenu.ts')).not.toMatch(/\bdispatch\(/);
  });
});
