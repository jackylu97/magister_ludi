/**
 * What the interface says after a rite is performed.
 *
 * The user's note (playtest, 2026-08-27): *"there should be some indication
 * after performing a rite"*. There was none, and there is more reason for one
 * now than there was then: since the fewer-things pass a rite is a **town's**
 * verb bought out of the faith bank for a season, so the only sign it worked
 * would otherwise be a number changing somewhere else on the screen.
 *
 * Two claims, and the second is the one with teeth:
 *
 *   1. **The sentence is the simulation's own words.** `ritePreview` is what the
 *      rite's row on the city's sheet promised, so the offer and the report are
 *      one string. A sentence composed here out of the performance report would
 *      be a second description of what a rite does, and the two would drift the
 *      first time a rite was retuned.
 *   2. **It is composed *before* the command and announced after.** `commit`'s
 *      caravan snapshot keeps the same rule for the same reason, and it still
 *      holds: the town's name is read off the board and the board is what the
 *      command changes.
 *
 * No jsdom in this suite (`controls.test.ts`'s note), so `riteSentence` is pure
 * and module-level and the ordering is read off the source.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { type City, type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { riteSentence } from '../../src/ui/controls';

const SOURCES = import.meta.glob(['../../src/ui/controls.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function controlsSource(): string {
  const text = Object.values(SOURCES)[0];
  if (typeof text !== 'string' || text.length === 0) throw new Error('controls.ts came back empty');
  return text;
}

/** One town called Uruk. */
function world(): { state: GameState; city: City } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: false },
    ],
  });
  state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  computeFreshwater(state.map);
  const tile = getTileAt(state.map, 5, 5)!;
  foundCityAt(state, 0, tile);
  state.cities[0]!.name = 'Uruk';
  return { state, city: state.cities[0]! };
}

describe('riteSentence', () => {
  it('names the rite, the town and what it does', () => {
    const { state, city } = world();
    // The star is `cityDisplayName`'s capital mark, which is the point of asking
    // it rather than reading `city.name`: a town is named here the way it is
    // named everywhere else in the interface.
    const line = riteSentence(state, city, 'omenReading');
    expect(line).toContain('✶ Omen Reading at Uruk ✶');
    expect(line).toContain('lasts 10 turns');
  });

  it('says how long the blessing runs, because that is the whole of what was bought', () => {
    const { state, city } = world();
    expect(riteSentence(state, city, 'riteOfPlenty')).toContain('lasts 10 turns');
  });

  it('names the town through the one city-name formatter', () => {
    const { state, city } = world();
    city.name = 'Lagash';
    expect(riteSentence(state, city, 'riteOfTheHarvest')).toContain('at Lagash');
  });

  it('quotes the sheet’s own preview, word for word', () => {
    // Not "the same figures" — the same string. The city's sheet and the
    // announcement are one sentence produced once.
    const { state, city } = world();
    const line = riteSentence(state, city, 'consecrationOfTheBounds');
    expect(line).toContain('bounds walk outward faster');
  });

  it('says what the military rite does, in a first-time player’s words', () => {
    const { state, city } = world();
    expect(riteSentence(state, city, 'blessingOfArms')).toContain('harder to storm');
  });
});

describe('when the sentence is composed', () => {
  const controls = controlsSource();
  const perform = controls.slice(controls.indexOf('function performRite(cityId: number'));
  const body = perform.slice(0, perform.indexOf('\n  }\n'));

  it('reads the board before the dispatch and speaks after it', () => {
    expect(body.indexOf('const sentence = riteSentence(')).toBeLessThan(
      body.indexOf('const result = commit({'),
    );
    expect(body.indexOf('announce(sentence, { cell })')).toBeGreaterThan(
      body.indexOf('const result = commit({'),
    );
  });

  it('says nothing at all when the rite was refused', () => {
    // `reject` returns first — a rejected command leaves the state
    // byte-identical (hard rule 1), and an announcement of a thing that did not
    // happen is worse than silence.
    expect(body.indexOf('reject(result.error);')).toBeLessThan(
      body.indexOf('announce(sentence, { cell })'),
    );
    expect(body).toContain('if (!result.ok) {');
  });

  it('pans to the town that received it', () => {
    expect(body).toContain('const cell = { col: city.col, row: city.row };');
  });

  it('refreshes the sheet, so the spent faith shows at once', () => {
    expect(body).toContain('onUpdate(selectedUnit(), renderer.getHover())');
  });
});
