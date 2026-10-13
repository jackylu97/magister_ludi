/**
 * The copies vocabulary the interface prints — batch R4, the surfaces half of
 * `docs/strategic-resources-proposal.md`.
 *
 * The rules are `test/sim/resourceCopies.test.ts`'s. What can go quietly wrong
 * on a *surface* is its own list, and it is what this covers:
 *
 *   1. **The reading is the simulation's, not a second one.** `spare` is
 *      `availableCopies`, floored, and not `held − committed` recomputed beside
 *      it — the two differ exactly when an empire has lost ground under a
 *      standing army, which is ruling 3 and the state a player most needs the
 *      rail to be honest about.
 *   2. **A row worth printing.** A resource the empire has never had is left
 *      out; one it has spent and then lost is not.
 *   3. **A pair reads as a choice.** Horses-or-camels prints a figure each,
 *      joined by "or", so nothing suggests a row needs both.
 *   4. **A hex's own quantity.** Only a strategic seam has one, and the rule is
 *      read off the row rather than off the presence of the number.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the node builders are read
 * through the source and the pure halves are exercised directly.
 */

import { describe, expect, it } from 'vitest';
import { uiSource } from './sourceHelpers';

import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { resetVisibility } from '../../src/sim/visibility';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { copiesFigure, copiesWords } from '../../src/ui/figures';
import {
  copyCount,
  requirementWords,
  strategicHoldings,
  tileCopyCount,
} from '../../src/ui/resourceCopies';
import { newGame } from '../sim/newGameHelpers';

function bench(): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 14, height: 8, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(14 * 8).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function town(state: GameState, seat: number, col: number, row: number): City {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error('no tile');
  return foundCityAt(state, seat, tile);
}

/**
 * A worked seam of one strategic resource, with a quantity on it.
 *
 * The improvement is the one the resource's own row names, so `openedResource`
 * answers the way it would in a played game; the technology is granted for the
 * same reason. A bench writing the board by hand is a writer and announces
 * (`bumpRevision`, the slate's contract — `test/sim/benches.test.ts`).
 */
function giveSeam(
  state: GameState,
  city: City,
  col: number,
  row: number,
  resource: 'iron' | 'horses' | 'camels' | 'copper',
  copies: number,
): void {
  const tile = getTileAt(state.map, col, row)!;
  tile.resource = resource;
  tile.resourceCopies = copies;
  tile.improvement = resource === 'horses' ? 'pasture' : resource === 'camels' ? 'camp' : 'mine';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  const gate = resourceDef(resource).requiresTech;
  const player = playerById(state, city.ownerId)!;
  if (gate !== undefined && !player.techsResearched.includes(gate)) {
    player.techsResearched.push(gate);
  }
  bumpRevision(state);
}

describe('one resource’s standing', () => {
  it('reports held, committed and spare from the simulation’s own readings', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    giveSeam(state, mine, 2, 3, 'iron', 5);

    const idle = copyCount(state, 0, 'iron');
    expect(idle.name).toBe('Iron');
    expect(idle.held).toBe(5);
    expect(idle.committed).toBe(0);
    expect(idle.spare).toBe(5);

    // Two legionaries hold two copies for as long as they live.
    createUnit(state, 0, 'legionary', 3, 3);
    createUnit(state, 0, 'legionary', 4, 3);
    bumpRevision(state);
    const spent = copyCount(state, 0, 'iron');
    expect(spent.held).toBe(5);
    expect(spent.committed).toBe(2);
    expect(spent.spare).toBe(3);
  });

  it('floors spare at nothing when an empire has run past its holdings', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    giveSeam(state, mine, 2, 3, 'iron', 3);
    for (let n = 0; n < 5; n += 1) {
      createUnit(state, 0, 'legionary', 3 + n, 6);
    }
    bumpRevision(state);
    const count = copyCount(state, 0, 'iron');
    expect(count.held).toBe(3);
    expect(count.committed).toBe(5);
    // Not −2. The simulation floors it, and this reading takes that floor rather
    // than subtracting for itself — a negative number is not a debt anybody can
    // pay off (ruling 3).
    expect(count.spare).toBe(0);
  });
});

describe('the rows worth printing', () => {
  it('lists only the strategic resources an empire holds or has spent', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    expect(strategicHoldings(state, 0)).toEqual([]);

    giveSeam(state, mine, 2, 3, 'iron', 4);
    const rows = strategicHoldings(state, 0);
    expect(rows.map((row) => row.id)).toEqual(['iron']);
    expect(rows[0]!.held).toBe(4);
  });

  it('keeps a resource whose copies are spent but whose ground is gone', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    giveSeam(state, mine, 2, 3, 'iron', 4);
    createUnit(state, 0, 'legionary', 3, 3);
    bumpRevision(state);

    // The mine is pillaged out from under the army.
    delete getTileAt(state.map, 2, 3)!.improvement;
    bumpRevision(state);

    const rows = strategicHoldings(state, 0);
    expect(rows.map((row) => row.id)).toEqual(['iron']);
    expect(rows[0]!.held).toBe(0);
    expect(rows[0]!.committed).toBe(1);
    // The one state the rail must not hide: nothing held, and units still
    // holding copies the empire no longer has.
    expect(rows[0]!.spare).toBe(0);
  });

  it('answers nothing for a seat that is not at the table', () => {
    expect(strategicHoldings(bench(), 9)).toEqual([]);
  });

  it('keeps the resource table’s own order', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    giveSeam(state, mine, 2, 3, 'iron', 4);
    giveSeam(state, mine, 4, 3, 'horses', 6);
    giveSeam(state, mine, 2, 5, 'copper', 3);
    const ids = strategicHoldings(state, 0).map((row) => row.id);
    const table = RESOURCE_IDS.filter((id) => ids.includes(id));
    expect(ids).toEqual(table);
  });
});

describe('the words', () => {
  it('writes a single requirement as one resource with its two figures', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    giveSeam(state, mine, 2, 3, 'iron', 5);
    createUnit(state, 0, 'legionary', 3, 3);
    bumpRevision(state);
    expect(requirementWords(state, 0, ['iron'])).toBe('Iron, 4 spare of 5');
  });

  it('writes a pair as a choice, each half with its own figures', () => {
    const state = bench();
    const mine = town(state, 0, 3, 4);
    giveSeam(state, mine, 2, 3, 'horses', 6);
    giveSeam(state, mine, 4, 3, 'camels', 5);
    const words = requirementWords(state, 0, ['horses', 'camels']);
    expect(words).toBe('Horses, 6 spare of 6 or Camels, 5 spare of 5');
    // The one misreading the brief names: a pair must never read as a bill.
    expect(words).not.toContain(' and ');
  });

  it('writes nothing for a row that needs nothing', () => {
    expect(requirementWords(bench(), 0, [])).toBe('');
  });

  it('sets the figure pair in the house grammar, and speaks it in words', () => {
    // The same grammar `poolFigure` gives renown against its ladder.
    expect(copiesFigure(2, 3)).toBe('2/3');
    expect(copiesFigure(0, 8)).toBe('0/8');
    // A screen reader given "0/8" says "zero slash eight", so every printed
    // figure carries this beside it.
    expect(copiesWords(0, 8)).toBe('0 spare of 8');
  });
});

describe('a hex’s own quantity', () => {
  it('reports the roll on a strategic seam', () => {
    const state = bench();
    const tile = getTileAt(state.map, 5, 5)!;
    tile.resource = 'iron';
    tile.resourceCopies = 7;
    expect(tileCopyCount(tile)).toBe(7);
  });

  it('reports nothing for a seam whose row has no range to roll in', () => {
    const state = bench();
    const tile = getTileAt(state.map, 5, 5)!;
    tile.resource = 'silk';
    // The rule is the **row's**, not the presence of the number: a hand-poked
    // board must not make a luxury print a quantity it never had.
    tile.resourceCopies = 7;
    expect(resourceDef('silk').copiesPerSource).toBeUndefined();
    expect(tileCopyCount(tile)).toBeNull();
  });

  it('reports nothing for a bare hex', () => {
    expect(tileCopyCount(getTileAt(bench().map, 5, 5)!)).toBeNull();
  });

  it('falls back to one where a strategic row’s tile was never rolled', () => {
    const state = bench();
    const tile = getTileAt(state.map, 5, 5)!;
    tile.resource = 'iron';
    expect(tileCopyCount(tile)).toBe(1);
  });
});

describe('who prints it', () => {
  it('is the one module the four surfaces ask', () => {
    for (const file of ['cityPanel.ts', 'tileReadout.ts', 'holdingsRail.ts']) {
      expect(uiSource(file)).toContain("from './resourceCopies'");
    }
  });

  it('keeps the refusal’s own words on the surface that greys a build row', () => {
    // `buildError` (`src/sim/tech.ts`) is where the sentence is written. The
    // build row cannot print that string — it needs the drawn marks, which are
    // elements — so what it must do instead is use the same words and the same
    // gate. Anything else would be a second refusal for a player to reconcile.
    const panel = uiSource('cityPanel.ts');
    expect(panel).toContain("price.append('needs improved ')");
    expect(panel).toContain('canSpareAnyOf');
    // And it must not have grown a sentence of its own about copies.
    expect(panel).not.toMatch(/already spoken for/);
  });

  it('greys a build row on “can the empire spare one”, never on “does it hold one”', () => {
    const panel = uiSource('cityPanel.ts');
    expect(panel).not.toMatch(/needsResource\s*=\s*[^;]*controlsAnyOf/);
  });
});
