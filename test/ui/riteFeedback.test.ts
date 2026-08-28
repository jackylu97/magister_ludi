/**
 * What the interface says after a rite is performed.
 *
 * The user's note (playtest, 2026-08-27): *"there should be some indication
 * after performing a rite"*. There was none. An augur is bought outright out of
 * the faith bank and carries three charges; spending one paid its grant, hung a
 * blessing on a town for twenty turns, and said nothing at all — the only sign
 * was a number changing somewhere else on the screen, in a different panel, that
 * the player was not looking at.
 *
 * Two claims, and the second is the one with teeth:
 *
 *   1. **The sentence is the simulation's own words.** `ritePreview` is what the
 *      rite's row on the augur's sheet promised, so the offer and the report are
 *      one string. A sentence composed here out of the performance report would
 *      be a second description of what a rite does, and the two would drift the
 *      first time a rite's grant was retuned.
 *   2. **It is composed *before* the command and announced after.** A rite may
 *      spend the augur's last charge and take it off the board, and its grant
 *      lands on a town chosen by where the piece was standing — so the sentence
 *      is a fact only the moment before the dispatch can answer. `commit`'s
 *      caravan snapshot keeps the same rule for the same reason.
 *
 * No jsdom in this suite (`controls.test.ts`'s note), so `riteSentence` is pure
 * and module-level and the ordering is read off the source.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { type GameState, type Unit, createUnit, newGame } from '../../src/sim/state';
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

/** One town called Uruk, with an augur standing in it. */
function world(): { state: GameState; augur: Unit } {
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
  const augur = createUnit(state, 0, 'augur', 5, 5);
  return { state, augur };
}

describe('riteSentence', () => {
  it('names the rite, the town and what it did', () => {
    const { state, augur } = world();
    // The user's own example line, in the shape they asked for. The star is
    // `cityDisplayName`'s capital mark, which is the point of asking it rather
    // than reading `city.name`: a town is named here the way it is named
    // everywhere else in the interface.
    expect(riteSentence(state, augur, 'omenReading')).toBe(
      '✶ Omen Reading at Uruk ✶ · +15 science · 20 turns of blessing',
    );
  });

  it('says how long the blessing runs, because that is half of what was spent', () => {
    const { state, augur } = world();
    expect(riteSentence(state, augur, 'riteOfPlenty')).toContain('20 turns of blessing');
  });

  it('names the town through the one city-name formatter', () => {
    const { state, augur } = world();
    state.cities[0]!.name = 'Lagash';
    expect(riteSentence(state, augur, 'riteOfTheHarvest')).toContain('at Lagash');
  });

  it('quotes the sheet’s own preview, word for word', () => {
    // Not "the same figures" — the same string. The augur's sheet and the
    // announcement are one sentence produced once.
    const { state, augur } = world();
    const line = riteSentence(state, augur, 'consecrationOfTheBounds');
    expect(line).toContain("+15 culture to Uruk's bounds");
  });

  it('names the piece instead when the rite is aimed at one', () => {
    const { state, augur } = world();
    createUnit(state, 0, 'warrior', 5, 5);
    const line = riteSentence(state, augur, 'blessingOfArms');
    expect(line).toContain('over the warrior');
    expect(line).toContain('heals the Warrior whole');
  });

  it('names no place when there is no town to aim at', () => {
    // An augur in a field. The empire-wide half of the grant is still what the
    // rite would pay, and the sentence simply stops naming a town rather than
    // inventing one.
    const { state, augur } = world();
    state.cities = [];
    expect(riteSentence(state, augur, 'omenReading')).toBe(
      '✶ Omen Reading · +15 science · 20 turns of blessing',
    );
  });

  it('falls back to the card’s own text when the preview has nothing to say', () => {
    // A city grant with no town to land on and no duration: `ritePreview`
    // answers `null`, and the sentence is still a sentence. The reducer refuses
    // the command anyway — a blank announcement is what this guards against.
    const { state, augur } = world();
    state.cities = [];
    expect(riteSentence(state, augur, 'riteOfTheHarvest')).toMatch(
      /^✶ Rite of the Harvest/,
    );
  });
});

describe('when the sentence is composed', () => {
  const controls = controlsSource();
  const perform = controls.slice(controls.indexOf('function performRite(id: RiteId)'));
  const body = perform.slice(0, perform.indexOf('\n  }\n'));

  it('reads the board before the dispatch and speaks after it', () => {
    // The augur may be gone by the time this returns, and the grant is already
    // banked in a town somewhere else. Both halves of the sentence stop being
    // askable the instant the command lands.
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

  it('pans to the hex the augur stood on', () => {
    // The chronicle line leads back to the town that received the grant, which
    // is the town the augur was standing in.
    expect(body).toContain('const cell = { col: unit.col, row: unit.row };');
  });

  it('refreshes the sheet, so the spent charge shows at once', () => {
    expect(body).toContain('onUpdate(selectedUnit(), renderer.getHover())');
    // And lets go of an augur the last charge emptied, exactly as a worker is.
    expect(body).toContain('if (!unitById(getGame().state, unit.id))');
  });
});
