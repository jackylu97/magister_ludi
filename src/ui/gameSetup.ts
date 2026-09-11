/**
 * **What the landing screen's Seats stepper means** — how many chairs a new game
 * is dealt into, and the roster that count hands to `newGame`.
 *
 * It lives beside the screen rather than inside `main.ts` because it is the one
 * part of setup that is *arithmetic about seats* rather than a DOM wiring: a
 * roster is a list of `PlayerSpec`s, it is decided before any element exists,
 * and it is the half a test can hold. `main.ts` keeps the stepper, the labels and
 * the listeners; everything a config is built out of is here.
 *
 * **A count, not a mode** (batch L4, `docs/flags.md` (nnnn)). The picker used to
 * be a list of four named shapes — one bot, a full game, solo, sandbox — which
 * meant every question about the table ("how many rivals?", "is anybody else a
 * person?") had to be answered by choosing a *name*, and a five-seat game was
 * not on the list at all. It is one number now, from the rules' own floor to the
 * palette's ceiling, and the two questions the number cannot answer are the two
 * controls beside it: which posture the single opponent plays, and whether the
 * other chairs are people. Solo is the stepper at its floor; the hot-seat
 * harness is the checkbox.
 *
 * Nothing in this module touches the simulation. A roster is config — it rides
 * into the save with the game (`GameConfig.players`) and replays a year from now
 * as the same table of seats.
 */

import { RULES } from '../sim/rulesData';
import type { PlayerSpec } from '../sim/state';

/**
 * The table's chairs, in seat order — **one roster for the whole product**.
 *
 * Seat 0 is the person at the keyboard in every game. The rest are filled or
 * left empty by the count and the hot-seat toggle; an empty chair is a bot
 * (`isHuman` absent — see `rosterFor`).
 *
 * The colours are the only thing the simulation cannot make up for itself, so
 * they live in the interface rather than in `data/`. Each renderer maps them
 * onto its own inks — `data/view.json` for the sprite pieces, `data/view3d.json`
 * for the diorama ones. Crimson and Teal are named explicitly in both tables
 * (`pieces.byPlayerColor`, `players.byColor`); **every seat after them is
 * written as the exact hex its seat's *fallback* ink already is**
 * (`players.fallbackOrder` walked against `players.palette`), so the chip in the
 * interface and the flag on the board are the same colour without a third table
 * to keep in step. `test/ui/gameSetup.test.ts` holds that agreement: a seat
 * whose hex does not resolve to its own seat-order ink fails the build.
 *
 * **Twelve**, because `players.fallbackOrder` has twelve inks and `HERALDRY_IDS`
 * twelve charges — a thirteenth seat would be sharing both halves of its
 * identity with somebody, which is the same sentence `heraldryMarks.ts` writes
 * about its own table. The rules' `maxPlayers` is the other ceiling, and
 * `MAX_SEATS` is whichever of the two is lower.
 *
 * The mapgen lobby reads this list too (`src/mapgenPage/main.ts`), which is what
 * "one palette, two pages" means: the swatch beside a chair on that page and the
 * flag over a capital in a real game are the same seat's ink by construction.
 *
 * No `charge`: absent means by seat order (`heraldryFor`), which gives twelve
 * seats twelve different charges for free.
 */
export const SEATS: readonly PlayerSpec[] = [
  { name: 'Crimson', color: '#d4502e', isHuman: true },
  { name: 'Teal', color: '#1f8a85', isHuman: true },
  { name: 'Gilt', color: '#c08a2b', isHuman: true },
  { name: 'Lapis', color: '#3f639f', isHuman: true },
  { name: 'Grape', color: '#7c5f8c', isHuman: true },
  { name: 'Brook', color: '#8ac6bd', isHuman: true },
  { name: 'Timber', color: '#8a6a45', isHuman: true },
  { name: 'Steel', color: '#9aa3a8', isHuman: true },
  { name: 'Ink', color: '#2f2b32', isHuman: true },
  { name: 'Brass', color: '#c2a35c', isHuman: true },
  { name: 'Sky', color: '#d3ddd2', isHuman: true },
  { name: 'Earth', color: '#6a5c4c', isHuman: true },
];

/**
 * The stepper's floor and ceiling.
 *
 * The floor is the rules' own (`minPlayers`), which is one: a solo world is a
 * real thing to want — a pacing measurement, a look at the map, a first quiet
 * hour — and it is the stepper wound all the way down rather than a mode with a
 * name. The ceiling is the rules' `maxPlayers` held against the palette, because
 * a thirteenth chair would have no ink and no charge to fly.
 */
export const MIN_SEATS = RULES.game.minPlayers;
export const MAX_SEATS = Math.min(RULES.game.maxPlayers, SEATS.length);

/**
 * **Six**, and the reason is that a world wants neighbours in it.
 *
 * Two seats is a duel, and a duel is what the screen used to open on because it
 * was the quickest way to reach a bot at all. A game of this kind is about
 * somebody else settling the river you were walking towards, and four empires on
 * the standard map still leave most of it empty. Six is the count the user asked
 * for (`docs/flags.md` (nnnn)) and the one the standard map was drawn wide
 * enough to hold.
 */
export const DEFAULT_SEATS = 6;

/**
 * A count, held inside the stepper's two ends — the one clamp, so the buttons,
 * the arrow keys and a hand-edited value cannot disagree about what is seatable.
 */
export function clampSeats(seats: number): number {
  if (!Number.isFinite(seats)) return DEFAULT_SEATS;
  return Math.max(MIN_SEATS, Math.min(MAX_SEATS, Math.round(seats)));
}

/**
 * The map a new game is dealt on unless the player says otherwise.
 *
 * The standard map is the size the pacing was measured on and the one the seat
 * count above was chosen against. It is a *default* and not a rule: the Size
 * picker opens here and the player is free to move it, which is the whole
 * difference.
 */
export const DEFAULT_SIZE = 'standard';

/**
 * The postures the rivals play, in seat order, before the table runs out of
 * them.
 *
 * Distinct on purpose, and distinct in *posture* rather than in numbers: a wide
 * empire that will be everywhere, a tall one that will out-build, and a
 * warmonger that will come for somebody. A table all playing the balanced
 * default is one opponent copied five times, which teaches a playtester nothing
 * about how a game with rivals in it goes.
 *
 * The ids are `data/ai.json`'s own persona sheet (`PERSONA_IDS`), pinned by
 * `test/ui/gameSetup.test.ts` so that a persona renamed in the data fails the
 * build here rather than quietly seating a balanced bot.
 */
export const FULL_GAME_PERSONAS: readonly string[] = ['wide', 'tall', 'warmonger'];

/**
 * What a seat with nothing said about it plays as.
 *
 * Spelled here rather than imported from `src/ai/` so that the landing's seat
 * arithmetic stays a leaf — `src/ai/stepper.ts` pulls in the whole appraisal
 * stack, and this module is asked its questions before a game exists. The two
 * are pinned equal by `test/ui/gameSetup.test.ts`.
 */
const DEFAULT_PERSONA_ID = 'balanced';

/**
 * Which posture the rival in a given chair plays: the three above, then
 * balanced.
 *
 * The three run out at the fourth rival and the rest of the table is balanced
 * rather than a second lap of wide-tall-warmonger, because the postures are
 * there to make the *first* rivals different from each other, and a second wide
 * empire teaches nothing the first one did not. Balanced is written as no key at
 * all (`rosterFor`), so a chair past the third leaves a spec byte-identical to
 * one from before personas existed.
 */
export function rivalPersona(rival: number): string {
  return FULL_GAME_PERSONAS[rival] ?? DEFAULT_PERSONA_ID;
}

/** What the Seats stepper cannot say about the table on its own. */
export interface RosterOptions {
  /**
   * The Opponent picker's answer. Asked of the two-seat game alone
   * (`seatsAskPersona`) — a larger table deals its rivals their own postures.
   */
  persona?: string;
  /**
   * Hot-seat: every chair is a person, one tester driving all of them from the
   * seat chips. A dev harness (CLAUDE.md, Direction) and the shape remote
   * multiplayer will arrive in, so it stays reachable — as a checkbox in the
   * fine print rather than as an entry in a list of modes.
   */
  hotSeat?: boolean;
}

/**
 * The roster a count seats.
 *
 * Seat 0 is always Crimson and always the person at the keyboard, so a six-seat
 * game is the two-seat game with five chairs *driven* rather than a different
 * game — which is what keeps the seat strip, the status line and every save
 * exactly as they were.
 *
 * A bot seat needs **no schema change and no new field**: `normalizeConfig`
 * already defaults `PlayerSpec.isHuman` to false, so "a seat nobody is sitting
 * in" is the roster entry with `isHuman` left off, and `driveBots`
 * (`src/ai/driver.ts`) is the only thing in the program that asks. It sweeps
 * every such seat, so eleven bots need nothing one bot did not.
 *
 * `persona` is written onto a spec only when it is not the default, exactly as
 * `normalizeConfig` writes a charge: a balanced opponent leaves no key behind,
 * so the default game's config is byte-identical to one from before personas
 * existed.
 */
export function rosterFor(seats: number, options: RosterOptions = {}): PlayerSpec[] {
  const count = clampSeats(seats);
  const table = SEATS.slice(0, count).map((spec) => ({ ...spec }));
  if (options.hotSeat === true) return table;
  return table.map((spec, seat) => {
    if (seat === 0) return spec;
    const rival = seat - 1;
    const persona = count === 2 ? (options.persona ?? DEFAULT_PERSONA_ID) : rivalPersona(rival);
    const driven: PlayerSpec = { ...spec, isHuman: false };
    if (persona !== DEFAULT_PERSONA_ID) driven.persona = persona;
    return driven;
  });
}

/**
 * Whether the Opponent picker is a question at this count.
 *
 * It asks about *the* rival, singular, so it belongs to the two-seat game alone:
 * a solo game seats nobody to ask about, and a larger table's rivals are dealt
 * their own postures (`rivalPersona`) rather than five copies of one answer.
 */
export function seatsAskPersona(seats: number): boolean {
  return clampSeats(seats) === 2;
}
