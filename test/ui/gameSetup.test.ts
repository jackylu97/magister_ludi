/**
 * **The landing's Seats picker, held to what each of its options actually
 * deals.**
 *
 * The playtest notes asked for a whole game — four seats on the standard map —
 * and a setup path is exactly the kind of thing that looks right on the screen
 * and is wrong in the config: a bot seated as a human, three rivals all playing
 * the balanced default, two capitals flying the same flag, a four-empire game
 * dealt onto the duel map. None of those is visible until somebody has played
 * twenty turns of it.
 *
 * So the roster arithmetic lives in a leaf with no DOM in it
 * (`src/ui/gameSetup.ts`) and this file holds it: what each mode seats, that the
 * personas are real rows of `data/ai.json` rather than strings that once were,
 * that the four seats are four distinguishable empires, and — the behavioural
 * half — that the config it builds really does start a four-player game with the
 * wild appended last.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_PERSONA, PERSONA_IDS } from '../../src/ai/stepper';
import { heraldryFor } from '../../src/art/heraldryMarks';
import { MAPGEN_CONFIG, MAP_SIZE_NAMES } from '../../src/sim/mapgen';
import { playerPieceColor } from '../../src/render3d/lookData';
import { RULES } from '../../src/sim/rulesData';
import { newGame, realPlayers } from '../../src/sim/state';
import {
  DEFAULT_SEAT_MODE,
  FULL_GAME_PERSONAS,
  FULL_GAME_SIZE,
  SEATS,
  availableSeatModes,
  modeAsksPersona,
  rosterFor,
} from '../../src/ui/gameSetup';

describe('the seat modes the landing offers', () => {
  it('offers the full game, and every mode fits the rules seat limits', () => {
    const modes = availableSeatModes();
    const full = modes.find((mode) => mode.value === 'full');
    expect(full?.seats).toBe(4);
    // Plain words, and no identifier in them (CLAUDE.md rule 7).
    expect(full?.label).toBe('Full game (you and three bots)');
    for (const mode of modes) {
      expect(mode.seats, mode.value).toBeGreaterThanOrEqual(RULES.game.minPlayers);
      expect(mode.seats, mode.value).toBeLessThanOrEqual(RULES.game.maxPlayers);
    }
    // The one-bot game is still what the screen opens on: the quickest way in.
    expect(DEFAULT_SEAT_MODE).toBe('bot');
    expect(modes.map((mode) => mode.value)).toEqual(['bot', 'full', 'solo', 'sandbox']);
  });

  it('asks about the opponent only where there is one opponent to ask about', () => {
    expect(modeAsksPersona('bot')).toBe(true);
    for (const mode of ['full', 'solo', 'sandbox']) {
      expect(modeAsksPersona(mode), mode).toBe(false);
    }
  });

  it('deals a full game on the standard map', () => {
    expect(FULL_GAME_SIZE).toBe('standard');
    expect(MAP_SIZE_NAMES).toContain(FULL_GAME_SIZE);
    // Not just a known size — the *big* one. A four-empire game on the duel map
    // is four capitals inside each other's second ring.
    const duel = MAPGEN_CONFIG.sizes.duel!;
    const size = MAPGEN_CONFIG.sizes[FULL_GAME_SIZE]!;
    expect(size.width * size.height).toBeGreaterThan(duel.width * duel.height);
  });
});

describe('the full game roster', () => {
  const roster = rosterFor('full');

  it('seats the player and three bots, the player first', () => {
    expect(roster.length).toBe(4);
    expect(roster[0]!.isHuman).toBe(true);
    expect(roster[0]!.name).toBe('Crimson');
    for (const spec of roster.slice(1)) {
      expect(spec.isHuman, spec.name).toBe(false);
    }
  });

  it('gives each bot a persona of its own, and a real one', () => {
    const personas = roster.slice(1).map((spec) => spec.persona);
    expect(personas).toEqual([...FULL_GAME_PERSONAS]);
    expect(new Set(personas).size).toBe(personas.length);
    for (const id of FULL_GAME_PERSONAS) {
      // A persona renamed in `data/ai.json` fails here rather than quietly
      // seating a balanced bot — `aiConfigFor` falls back on an unknown id.
      expect(PERSONA_IDS, id).toContain(id);
      // Three copies of the default would teach a playtester nothing.
      expect(id).not.toBe(DEFAULT_PERSONA);
    }
  });

  it('gives each seat a flag nobody else is flying', () => {
    const colors = roster.map((spec) => spec.color);
    expect(new Set(colors).size).toBe(colors.length);
    // No spec names a charge, so heraldry is by seat order — and four seats get
    // four different charges.
    const charges = roster.map((_spec, index) => heraldryFor(index, roster[index]!.charge));
    expect(new Set(charges).size).toBe(charges.length);
    // And the piece ink each seat resolves to, which is the one that is painted
    // on the board. Gilt and Lapis are written as the exact hexes their seat's
    // fallback ink already is, so this also pins that agreement.
    const inks = roster.map((spec, index) => playerPieceColor(spec.color, index));
    expect(new Set(inks).size).toBe(inks.length);
  });

  it('starts a four-player game with the wild appended last', () => {
    const state = newGame({
      seed: 1234,
      sizeName: FULL_GAME_SIZE,
      players: roster,
      barbarians: true,
    });
    const seats = realPlayers(state);
    expect(seats.length).toBe(4);
    expect(seats.map((player) => player.id)).toEqual([0, 1, 2, 3]);
    expect(seats[0]!.isHuman).toBe(true);
    expect(seats.slice(1).every((player) => player.isHuman === false)).toBe(true);
    // `seatBarbarians` extends the roster, so the wild is one past the table.
    expect(state.players.length).toBe(5);
    expect(state.players[4]!.barbarian).toBe(true);
    // Every seat was actually placed on the map — four starts, four capitals'
    // worth of units, nobody sharing a hex.
    const starts = seats.map((player) => {
      const unit = state.units.find((u) => u.ownerId === player.id);
      expect(unit, `seat ${player.id} has a unit`).toBeDefined();
      return `${unit!.col},${unit!.row}`;
    });
    expect(new Set(starts).size).toBe(4);
  });
});

describe('the other seat modes, unchanged', () => {
  it('seats one bot against the player, writing a persona only when it is not the default', () => {
    const balanced = rosterFor('bot', DEFAULT_PERSONA);
    expect(balanced.length).toBe(2);
    expect(balanced[0]!.isHuman).toBe(true);
    expect(balanced[1]!.isHuman).toBe(false);
    expect('persona' in balanced[1]!).toBe(false);
    const zealous = rosterFor('bot', 'zealot');
    expect(zealous[1]!.persona).toBe('zealot');
  });

  it('seats one chair solo and two for the hot-seat sandbox, both of them people', () => {
    const solo = rosterFor('solo');
    expect(solo.length).toBe(1);
    expect(solo[0]!.isHuman).toBe(true);
    const sandbox = rosterFor('sandbox');
    expect(sandbox.length).toBe(2);
    expect(sandbox.every((spec) => spec.isHuman === true)).toBe(true);
  });

  it('hands out fresh specs rather than the shared seat table', () => {
    // `rosterFor` writes `isHuman` and `persona` onto its rivals; if the specs
    // were the module's own rows, one bot game would leave the sandbox's second
    // chair driven for the rest of the session.
    rosterFor('full');
    rosterFor('bot', 'warmonger');
    expect(SEATS.every((spec) => spec.isHuman === true)).toBe(true);
    expect(SEATS.every((spec) => spec.persona === undefined)).toBe(true);
  });
});

describe('the landing screen', () => {
  /**
   * The picker is DOM and cannot be built without the page, so the one thing
   * this file cannot reach behaviourally is read off the source: the screen asks
   * `gameSetup` its three questions rather than keeping a second copy of the
   * answers. A mode added here and not listed there is a mode nobody can pick.
   */
  const MAIN = Object.values(
    import.meta.glob('../../src/main.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  )[0]!;

  it('builds its options, its persona row and its roster from this module', () => {
    expect(MAIN).toContain("from './ui/gameSetup'");
    expect(MAIN).toContain('availableSeatModes()');
    expect(MAIN).toContain('modeAsksPersona(seatsSelect.value)');
    expect(MAIN).toContain('rosterFor(seatsSelect.value, personaSelect.value)');
    expect(MAIN).toContain('FULL_GAME_SIZE');
  });
});
