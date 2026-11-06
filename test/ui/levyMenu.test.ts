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
import { availableRites, cityRite } from '../../src/sim/religion';
import { RELIGION, type RiteId } from '../../src/sim/religionData';
import { RULES } from '../../src/sim/rulesData';
import { type City, bumpRevision, playerById } from '../../src/sim/state';
import type { DoctrineId, OrderId } from '../../src/sim/statecraftData';
import { riteOfferText as controlsRiteOfferText } from '../../src/ui/controls';
import { levyMenuModel } from '../../src/ui/levyMenu';
import { riteOfferText } from '../../src/ui/riteOffer';
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

describe('the rite line (Human Sacrifice, batch DT19)', () => {
  const FASTING = 'riteOfFasting' as RiteId;
  const VOTIVE = 'votiveOffering' as RiteId;

  function sacrificing(population = 6): { g: Game; city: City } {
    const made = bench(population);
    const player = playerById(made.g.state, 0)!;
    player.statecraft.doctrines.push('humanSacrifice' as DoctrineId);
    player.charteredRites.push(FASTING, VOTIVE);
    bumpRevision(made.g.state);
    return made;
  }

  it('lists the rites the empire knows, each with its words or the gate’s refusal', () => {
    const { g, city } = sacrificing();
    const model = levyMenuModel(g.state, 0, city)!;
    expect(model.lines.map((line) => line.use)).toEqual(['rite']);
    const line = model.lines[0]!;
    expect(line.label).toBe('Perform a rite across your empire');
    expect(line.figure).toBe('1 town');
    expect(line.blocked).toBeNull();
    expect(line.rites!.map((entry) => entry.rite)).toEqual(availableRites(g.state, 0));
    const fasting = line.rites!.find((entry) => entry.rite === FASTING)!;
    expect(fasting.blocked).toBeNull();
    expect(fasting.words).toBe(riteOfferText(g.state, 0, FASTING));
    const votive = line.rites!.find((entry) => entry.rite === VOTIVE)!;
    expect(votive.blocked).toMatch(/said by one city/);
    expect(votive.words).toBe(votive.blocked);
  });

  it('says what the rite costs: the citizen, and the rise in the next rite’s price', () => {
    const { g, city } = sacrificing();
    const line = levyMenuModel(g.state, 0, city)!.lines[0]!;
    expect(line.source).toBe(
      `Human Sacrifice: no faith and no prophet; your next rite costs ${RELIGION.rite.costPerRiteStarted} more faith`,
    );
  });

  it('sends the rite it was pressed for, and the reducer takes that command', () => {
    const { g, city } = sacrificing();
    const command: Command = { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'rite', rite: FASTING };
    expect(dispatch(g, command).ok).toBe(true);
    expect(cityRite(g.state, city)).toBe(FASTING);
    const body = uiSource('cityPanel.ts');
    expect(body).toContain('renderLevyMenuBody(model, (use, rite) => {');
    expect(body).toContain('...(rite === undefined ? {} : { rite }),');
  });

  it('prints the empire’s own wait, and greys the button with the same figure', () => {
    const { g, city } = sacrificing(8);
    const before = levyMenuModel(g.state, 0, city)!;
    expect(before.cost).toBe('Costs 1 citizen (pop 8 → 7). Next levy here in 2 turns.');
    // A line whose wait is the empire's own needs no words of its own.
    expect(before.lines[0]!.source).not.toMatch(/again in/);
    expect(dispatch(g, { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'rite', rite: FASTING }).ok).toBe(true);
    const after = levyMenuModel(g.state, 0, city)!;
    expect(after.disabled).toBe(true);
    expect(after.title).toBe(`${city.name} can levy again in 2 turns`);
  });

  it('greys the rite line with one sentence when no rite can reach every town', () => {
    const { g, city } = sacrificing();
    playerById(g.state, 0)!.charteredRites = [VOTIVE];
    bumpRevision(g.state);
    const model = levyMenuModel(g.state, 0, city)!;
    expect(model.disabled).toBe(true);
    expect(model.lines[0]!.blocked).toBe('You know no rite that can be performed across your empire');
  });

  it('opens the list from the line, and spends the citizen only from a rite', () => {
    const body = braceBody(uiSource('levyMenu.ts'), 'export function renderLevyMenuBody(');
    expect(body).toContain('list.hidden = true;');
    expect(body).toContain('list.hidden = !list.hidden;');
    expect(body).toContain('renderRiteList(line.rites, (rite) => onChoose(line.use, rite))');
    // Pressing the rite line itself sends nothing: a command must name a rite.
    expect(body).toContain('if (line.rites === undefined) {');
  });

  it('reads the rite’s words from a leaf, so the menu does not import the controls', () => {
    // `controls.ts` imports the city panel, and the panel imports this menu.
    expect(uiSource('levyMenu.ts')).not.toContain("from './controls'");
    expect(uiSource('riteOffer.ts')).not.toContain("from './");
    expect(riteOfferText).toBe(controlsRiteOfferText);
  });

  it('gives only the rite line a list', () => {
    const { g, city } = sacrificing();
    seat(g, 'levyOfTheLand');
    const model = levyMenuModel(g.state, 0, city)!;
    expect(model.lines.map((line) => [line.use, line.rites !== undefined])).toEqual([
      ['production', false],
      ['rite', true],
    ]);
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
