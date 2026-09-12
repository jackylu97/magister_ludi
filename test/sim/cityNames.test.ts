/**
 * **What a new town is called** — batch L5, `docs/flags.md` (pppp), spec of
 * record the table "## The cities" in `docs/leaders.md`.
 *
 * One function is the whole subject: `nextCityName(state, ownerId)`. It used to
 * be an index — the list's *n*th name for the seat's *n*th town — and it is now
 * a **skip**: the seat's figure's own towns in order of importance, then the
 * plain list, then a number, and at every step the first name no standing city
 * anywhere already wears. The claims below are the difference that makes:
 *
 *   · a figure's empire is named after the empire, in the sheet's order;
 *   · two seats under one figure do not twin — the second takes the next name;
 *   · a razed town's name comes back, but only once nothing standing wears it;
 *   · two seats under no figure at all do not twin either, which the index
 *     reading could never manage (there was one list and both started at its
 *     top);
 *   · the number past both lists is the number it always was;
 *   · and a log of foundings under figures replays byte for byte, because the
 *     whole of it is a pure function of the board (hard rule 2).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, nextCityName } from '../../src/sim/cities';
import { razeCityAt } from '../../src/sim/diplomacy';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { LEADER_IDS, type LeaderId, leaderDef } from '../../src/sim/leaderData';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, newGame } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

const PLAIN = RULES.cities.cityNames;

// --- the bench --------------------------------------------------------------

/**
 * Two seats on a blank desert rectangle, each under whichever figure is asked
 * for (or none at all).
 *
 * `cities.test.ts`' own bench, trimmed to what a name needs: a board wide
 * enough to stand forty towns on and no starting pieces to get in the way.
 */
function bench(first?: LeaderId, second?: LeaderId, width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true, ...(first ? { leader: first } : {}) },
      { name: 'B', color: '#00a', isHuman: true, ...(second ? { leader: second } : {}) },
    ],
  });
  state.map = createMap({ width, height, terrain: 'desert' });
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/**
 * Plants the seat's `index`-th town, on its own hex.
 *
 * Every hex distinct and two rows apart, so a bench that stands forty towns up
 * to reach the numbered fallback never plants two on one tile — which is the
 * one thing that would make the board lie about what is standing.
 */
function plant(state: GameState, ownerId: number, index: number): City {
  return foundCityAt(state, ownerId, at(state.map, index % 16, (Math.floor(index / 16) * 2) % 12));
}

/** The names a seat's first `count` towns take, founded one after another. */
function founds(state: GameState, ownerId: number, count: number, from = 0): string[] {
  const names: string[] = [];
  for (let index = 0; index < count; index++) names.push(plant(state, ownerId, from + index).name);
  return names;
}

// --- a figure's own towns ----------------------------------------------------

describe('a seat under a figure', () => {
  it('founds the figure’s own cities, in the sheet’s order', () => {
    const state = bench('pachacuti');
    expect(founds(state, 0, 2)).toEqual(['Cusco', 'Quito']);
    expect(leaderDef('pachacuti').cities.slice(0, 2)).toEqual(['Cusco', 'Quito']);
  });

  it('walks its whole list before it ever reaches the plain one', () => {
    const state = bench('taizong');
    const towns = leaderDef('taizong').cities;
    expect(founds(state, 0, towns.length)).toEqual([...towns]);
    expect(nextCityName(state, 0)).toBe(PLAIN[0]);
  });

  it('gives every figure a list nobody else’s first town takes', () => {
    // Not a rule the code enforces — the sheet's business — but a twin here
    // would make the skip look broken on the board on turn one.
    const firsts = LEADER_IDS.map((id) => leaderDef(id).cities[0]);
    expect(new Set(firsts).size).toBe(LEADER_IDS.length);
  });
});

// --- the skip ----------------------------------------------------------------

describe('a name a standing town already wears', () => {
  it('is skipped, whoever is wearing it', () => {
    // Two seats twinned under one figure: the rival's Cusco is standing, so the
    // second seat's first town is the next name down the same list.
    const state = bench('pachacuti', 'pachacuti');
    expect(plant(state, 0, 0).name).toBe('Cusco');
    expect(plant(state, 1, 20).name).toBe('Quito');
    expect(plant(state, 0, 21).name).toBe('Tumebamba');
  });

  it('comes round again once nothing standing wears it', () => {
    const state = bench('pachacuti');
    const [cusco] = [plant(state, 0, 0), plant(state, 0, 1)];
    expect(state.cities.map((city) => city.name)).toEqual(['Cusco', 'Quito']);
    // While it stands, the next town is the third name and not the first.
    expect(nextCityName(state, 0)).toBe('Tumebamba');
    razeCityAt(state, cusco!);
    expect(nextCityName(state, 0)).toBe('Cusco');
    expect(plant(state, 0, 2).name).toBe('Cusco');
    // And it does not come round twice: the new Cusco is standing now.
    expect(nextCityName(state, 0)).toBe('Tumebamba');
  });

  it('leaves the razed town’s neighbours holding the names they were given', () => {
    // The result is stored on the city, which is the reason the skip is safe:
    // razing the first town must not rename the second.
    const state = bench('akhenaten');
    const [first, second] = [plant(state, 0, 0), plant(state, 0, 1)];
    razeCityAt(state, first!);
    expect(second!.name).toBe('Thebes');
  });
});

// --- a seat under nobody -----------------------------------------------------

describe('a seat under no figure', () => {
  it('walks the plain list, and two such seats no longer twin', () => {
    const state = bench();
    expect(plant(state, 0, 0).name).toBe(PLAIN[0]);
    expect(plant(state, 1, 20).name).toBe(PLAIN[1]);
    expect(plant(state, 0, 21).name).toBe(PLAIN[2]);
  });

  it('numbers past the end of the plain list exactly as it always did', () => {
    const state = bench();
    const names = founds(state, 0, PLAIN.length);
    expect(names).toEqual([...PLAIN]);
    // `owned + 1 −` the figure's list (none) `−` the plain list: the seat's
    // twenty-fifth town is its first number.
    expect(nextCityName(state, 0)).toBe('A 1');
    expect(plant(state, 0, PLAIN.length).name).toBe('A 1');
    expect(nextCityName(state, 0)).toBe('A 2');
  });

  it('numbers a figure’s seat past both lists', () => {
    const state = bench('mithridates');
    const towns = leaderDef('mithridates').cities;
    founds(state, 0, towns.length + PLAIN.length);
    expect(state.cities).toHaveLength(towns.length + PLAIN.length);
    expect(nextCityName(state, 0)).toBe('A 1');
  });
});

// --- the log -----------------------------------------------------------------

/** As many figures as one table seats. See the pin below. */
const SEATED = LEADER_IDS.slice(0, 12);

describe('the board’s own memory', () => {
  /**
   * The determinism pin (hard rule 2). A full table of seats, each under its own
   * figure, each founding by **command** — so the log is a save file and the
   * names in it are whatever `nextCityName` said at the moment the settler
   * stopped walking. A name read off anything but the state would show up here.
   *
   * The roster is capped at the table's own size (`rules.maxPlayers`), which the
   * thirteen figures outgrew in batch L6a: the claim is about the *log*, and it
   * is made by as many figures as may sit down at once.
   */
  it('replays a log of foundings under figures byte for byte', () => {
    const game = createGame({
      seed: 4242,
      sizeName: 'standard',
      players: SEATED.map((leader, index) => ({
        name: leaderDef(leader).name,
        color: `#${(0x204060 + index * 0x101010).toString(16)}`,
        isHuman: index === 0,
        leader,
      })),
    });
    for (const player of game.state.players) {
      const settler = game.state.units.find(
        (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity,
      );
      if (!settler) continue;
      expect(
        dispatch(game, { type: 'foundCity', playerId: player.id, settlerUnitId: settler.id }).ok,
      ).toBe(true);
    }
    expect(game.state.cities).toHaveLength(SEATED.length);
    for (const city of game.state.cities) {
      const leader = game.state.players[city.ownerId]!.leader!;
      expect(city.name).toBe(leaderDef(leader).cities[0]);
    }

    for (let round = 0; round < 3; round++) {
      for (const player of game.state.players) {
        expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
      }
    }

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });
});
