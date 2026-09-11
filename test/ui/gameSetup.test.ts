/**
 * **The landing's Seats stepper, held to what each count actually deals.**
 *
 * The user asked for six seats on the standard map and a control that adds and
 * subtracts players rather than a dropdown of named shapes (`docs/flags.md`
 * (nnnn)), and a setup path is exactly the kind of thing that looks right on the
 * screen and is wrong in the config: a bot seated as a human, five rivals all
 * playing the balanced default, two capitals flying the same flag, a six-empire
 * game dealt onto the duel map. None of those is visible until somebody has
 * played twenty turns of it.
 *
 * So the roster arithmetic lives in a leaf with no DOM in it
 * (`src/ui/gameSetup.ts`) and this file holds it: what a count seats, that the
 * personas are real rows of `data/ai.json` rather than strings that once were,
 * that every seat is a distinguishable empire all the way to the palette's end,
 * and — the behavioural half — that the default config really does start a
 * six-player game with the wild appended last.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_PERSONA, PERSONA_IDS } from '../../src/ai/stepper';
import { HERALDRY_IDS, heraldryFor } from '../../src/art/heraldryMarks';
import { MAPGEN_CONFIG, MAP_SIZE_NAMES } from '../../src/sim/mapgen';
import { playerPieceColor } from '../../src/render3d/lookData';
import { RULES } from '../../src/sim/rulesData';
import { newGame, realPlayers } from '../../src/sim/state';
import {
  DEFAULT_SEATS,
  DEFAULT_SIZE,
  FULL_GAME_PERSONAS,
  MAX_SEATS,
  MIN_SEATS,
  SEATS,
  clampSeats,
  rivalPersona,
  rosterFor,
  seatsAskPersona,
} from '../../src/ui/gameSetup';

describe('the stepper the landing offers', () => {
  it('counts from the rules floor to the palette ceiling, and opens on six', () => {
    expect(MIN_SEATS).toBe(RULES.game.minPlayers);
    expect(MAX_SEATS).toBe(Math.min(RULES.game.maxPlayers, SEATS.length));
    // Six is the user's own number, and the map below is wide enough for it.
    expect(DEFAULT_SEATS).toBe(6);
    expect(DEFAULT_SEATS).toBeGreaterThanOrEqual(MIN_SEATS);
    expect(DEFAULT_SEATS).toBeLessThanOrEqual(MAX_SEATS);
    // Solo is the stepper wound all the way down, not a mode with a name.
    expect(MIN_SEATS).toBe(1);
  });

  it('clamps rather than dealing a table it has no ink for', () => {
    expect(clampSeats(0)).toBe(MIN_SEATS);
    expect(clampSeats(-4)).toBe(MIN_SEATS);
    expect(clampSeats(MAX_SEATS + 1)).toBe(MAX_SEATS);
    expect(clampSeats(999)).toBe(MAX_SEATS);
    expect(clampSeats(6)).toBe(6);
    expect(clampSeats(3.4)).toBe(3);
    expect(clampSeats(Number.NaN)).toBe(DEFAULT_SEATS);
    // And the roster obeys the clamp, so nothing downstream has to re-check it.
    expect(rosterFor(99)).toHaveLength(MAX_SEATS);
    expect(rosterFor(0)).toHaveLength(MIN_SEATS);
  });

  it('asks about the opponent only where there is one opponent to ask about', () => {
    expect(seatsAskPersona(2)).toBe(true);
    for (const count of [1, 3, 4, 6, MAX_SEATS]) {
      expect(seatsAskPersona(count), String(count)).toBe(false);
    }
  });

  it('opens on the standard map, and it is the big one', () => {
    expect(DEFAULT_SIZE).toBe('standard');
    expect(MAP_SIZE_NAMES).toContain(DEFAULT_SIZE);
    // Not just a known size — the *big* one. Six empires on the duel map is six
    // capitals inside each other's second ring.
    const duel = MAPGEN_CONFIG.sizes.duel!;
    const size = MAPGEN_CONFIG.sizes[DEFAULT_SIZE]!;
    expect(size.width * size.height).toBeGreaterThan(duel.width * duel.height);
  });
});

describe('one palette, deep enough for every chair', () => {
  it('carries an ink and a charge for every seat the stepper can reach', () => {
    expect(SEATS.length).toBeGreaterThanOrEqual(MAX_SEATS);
    expect(SEATS.length).toBeLessThanOrEqual(HERALDRY_IDS.length);
  });

  it('gives every seat a flag nobody else is flying', () => {
    const names = SEATS.map((spec) => spec.name);
    expect(new Set(names).size).toBe(names.length);
    const colors = SEATS.map((spec) => spec.color);
    expect(new Set(colors).size).toBe(colors.length);
    // No spec names a charge, so heraldry is by seat order — twelve seats, twelve
    // different charges.
    const charges = SEATS.map((spec, index) => heraldryFor(index, spec.charge));
    expect(new Set(charges).size).toBe(charges.length);
  });

  it('writes each seat as the exact hex its own seat-order ink already is', () => {
    // The agreement the roster's docblock claims: the chip in the interface and
    // the flag on the board are the same colour without a third table. A seat
    // whose hex resolved to somebody *else's* ink would put two empires in one
    // colour on the board while the landing showed twelve.
    for (const [index, spec] of SEATS.entries()) {
      expect(playerPieceColor(spec.color, index), spec.name).toBe(playerPieceColor('', index));
    }
    const inks = SEATS.map((spec, index) => playerPieceColor(spec.color, index));
    expect(new Set(inks).size).toBe(inks.length);
  });

  it('is the roster the mapgen lobby seats from too — one palette, two pages', () => {
    const LOBBY = Object.values(
      import.meta.glob('../../src/mapgenPage/main.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    expect(LOBBY).toContain("from '../ui/gameSetup'");
    expect(LOBBY).toContain('SEATS[index]?.color');
    // And no second list of hand-picked hexes beside it.
    expect(LOBBY).not.toContain('GAME_SEAT_COLORS');
  });
});

describe('the roster a count seats', () => {
  const roster = rosterFor(DEFAULT_SEATS);

  it('seats the player and five bots, the player first', () => {
    expect(roster.length).toBe(6);
    expect(roster[0]!.isHuman).toBe(true);
    expect(roster[0]!.name).toBe('Crimson');
    for (const spec of roster.slice(1)) {
      expect(spec.isHuman, spec.name).toBe(false);
    }
  });

  it('deals the three postures to the first rivals and balance to the rest', () => {
    const personas = roster.slice(1).map((spec) => spec.persona);
    // Balanced is no key at all, so a chair past the third is byte-identical to
    // a spec from before personas existed.
    expect(personas).toEqual([...FULL_GAME_PERSONAS, undefined, undefined]);
    for (const id of FULL_GAME_PERSONAS) {
      // A persona renamed in `data/ai.json` fails here rather than quietly
      // seating a balanced bot — `aiConfigFor` falls back on an unknown id.
      expect(PERSONA_IDS, id).toContain(id);
      // Copies of the default would teach a playtester nothing.
      expect(id).not.toBe(DEFAULT_PERSONA);
    }
    expect(new Set(FULL_GAME_PERSONAS).size).toBe(FULL_GAME_PERSONAS.length);
    expect(rivalPersona(FULL_GAME_PERSONAS.length)).toBe(DEFAULT_PERSONA);
  });

  it('seats one bot against the player at two, writing a persona only when it is not the default', () => {
    const balanced = rosterFor(2, { persona: DEFAULT_PERSONA });
    expect(balanced.length).toBe(2);
    expect(balanced[0]!.isHuman).toBe(true);
    expect(balanced[1]!.isHuman).toBe(false);
    expect('persona' in balanced[1]!).toBe(false);
    const zealous = rosterFor(2, { persona: 'zealot' });
    expect(zealous[1]!.persona).toBe('zealot');
    // The picker is only asked at two, so a larger table ignores its answer and
    // deals the postures instead.
    expect(rosterFor(4, { persona: 'zealot' }).slice(1).map((spec) => spec.persona)).toEqual([
      ...FULL_GAME_PERSONAS,
    ]);
  });

  it('seats one chair solo and every chair a person in the hot-seat harness', () => {
    const solo = rosterFor(1);
    expect(solo.length).toBe(1);
    expect(solo[0]!.isHuman).toBe(true);
    const hotSeat = rosterFor(4, { hotSeat: true });
    expect(hotSeat.length).toBe(4);
    expect(hotSeat.every((spec) => spec.isHuman === true)).toBe(true);
    // And nobody is given a posture, because nobody is being driven.
    expect(hotSeat.every((spec) => spec.persona === undefined)).toBe(true);
  });

  it('hands out fresh specs rather than the shared seat table', () => {
    // `rosterFor` writes `isHuman` and `persona` onto its rivals; if the specs
    // were the module's own rows, one game would leave the next one's chairs
    // driven for the rest of the session.
    rosterFor(MAX_SEATS);
    rosterFor(2, { persona: 'warmonger' });
    expect(SEATS.every((spec) => spec.isHuman === true)).toBe(true);
    expect(SEATS.every((spec) => spec.persona === undefined)).toBe(true);
  });

  it('starts a six-player game with the wild appended last', () => {
    const state = newGame({
      seed: 1234,
      sizeName: DEFAULT_SIZE,
      players: roster,
      barbarians: true,
    });
    const seats = realPlayers(state);
    expect(seats.length).toBe(6);
    expect(seats.map((player) => player.id)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(seats[0]!.isHuman).toBe(true);
    expect(seats.slice(1).every((player) => player.isHuman === false)).toBe(true);
    // `seatBarbarians` extends the roster, so the wild is one past the table.
    expect(state.players.length).toBe(7);
    expect(state.players[6]!.barbarian).toBe(true);
    // Every seat was actually placed on the map — six starts, six capitals'
    // worth of units, nobody sharing a hex.
    const starts = seats.map((player) => {
      const unit = state.units.find((u) => u.ownerId === player.id);
      expect(unit, `seat ${player.id} has a unit`).toBeDefined();
      return `${unit!.col},${unit!.row}`;
    });
    expect(new Set(starts).size).toBe(6);
  });

  it('seats the whole palette without the map refusing it', () => {
    const state = newGame({
      seed: 77,
      sizeName: DEFAULT_SIZE,
      players: rosterFor(MAX_SEATS),
      barbarians: false,
    });
    expect(realPlayers(state).length).toBe(MAX_SEATS);
  });
});

describe('the landing screen', () => {
  /**
   * The stepper is DOM and cannot be built without the page, so the one thing
   * this file cannot reach behaviourally is read off the source: the screen asks
   * `gameSetup` its questions rather than keeping a second copy of the answers.
   */
  const MAIN = Object.values(
    import.meta.glob('../../src/main.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  )[0]!;

  const INDEX = Object.values(
    import.meta.glob('../../index.html', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  )[0]!;

  it('builds its stepper, its persona row and its roster from this module', () => {
    expect(MAIN).toContain("from './ui/gameSetup'");
    expect(MAIN).toContain('setSeatCount(DEFAULT_SEATS)');
    expect(MAIN).toContain('seatsAskPersona(seatCount())');
    expect(MAIN).toContain('clampSeats(Number(seatsValue.value))');
    expect(MAIN).toContain('DEFAULT_SIZE');
    // The count reaches the config through the stepper and nowhere else.
    expect(MAIN).toContain('rosterFor(seatCount(), { persona: personaSelect.value, hotSeat: hotSeatToggle.checked })');
    // The mode list is gone, not merely unread.
    for (const dead of ['SEAT_MODES', 'availableSeatModes', 'modeAsksPersona', 'DEFAULT_SEAT_MODE']) {
      expect(MAIN, dead).not.toContain(dead);
    }
  });

  it('keeps one element carrying the count, and real buttons either side', () => {
    // One place the count lives: `id="seats"` is the value *and* the figure on
    // the screen, so `currentConfig` and a test read the same thing.
    expect(INDEX).toContain('<output id="seats"');
    expect(INDEX).not.toContain('<select id="seats">');
    expect(INDEX).toContain('role="spinbutton"');
    // Real buttons, each saying what it does to something that cannot see the
    // glyph on it.
    expect(INDEX).toContain('id="seats-fewer"');
    expect(INDEX).toContain('id="seats-more"');
    expect(INDEX).toContain('aria-label="One seat fewer"');
    expect(INDEX).toContain('aria-label="One seat more"');
    // The harness, in the fine print, off by default.
    expect(INDEX).toContain('id="hot-seat"');
    expect(INDEX).toContain('Hot-seat — every seat is a person');
    expect(INDEX).not.toMatch(/id="hot-seat"[^>]*checked/);
  });

  it('says the count in the tabular face, because it is a number', () => {
    const CSS = Object.values(
      import.meta.glob('../../src/style.css', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    const rule = CSS.slice(CSS.indexOf('.landing-card .seats-count {'));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('var(--face-num)');
  });
});
