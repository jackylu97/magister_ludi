/**
 * **What the landing screen's Seats picker means** — the seats a new game can be
 * dealt into, and the roster each shape hands to `newGame`.
 *
 * It lives beside the screen rather than inside `main.ts` because it is the one
 * part of setup that is *arithmetic about seats* rather than a DOM wiring: a
 * roster is a list of `PlayerSpec`s, it is decided before any element exists,
 * and it is the half a test can hold. `main.ts` keeps the picker, the labels and
 * the change listener; everything a config is built out of is here.
 *
 * Nothing in this module touches the simulation. A roster is config — it rides
 * into the save with the game (`GameConfig.players`) and replays a year from now
 * as the same table of seats.
 */

import { RULES } from '../sim/rulesData';
import type { PlayerSpec } from '../sim/state';

/**
 * The table's chairs, in seat order.
 *
 * Seat 0 is the person at the keyboard in every mode. The rest are filled or
 * left empty by the mode; an empty chair is a bot (`isHuman` absent — see
 * `rosterFor`).
 *
 * The colours are the only thing the simulation cannot make up for itself, so
 * they live in the interface rather than in `data/`. Each renderer maps them
 * onto its own inks — `data/view.json` for the sprite pieces, `data/view3d.json`
 * for the diorama ones. Crimson and Teal are named explicitly in both tables
 * (`pieces.byPlayerColor`, `players.byColor`); Gilt and Lapis are written as the
 * exact hexes their seat's *fallback* ink already is (`players.fallbackOrder`
 * seats 2 and 3 on `gilt` and `lapis`), so the chip in the interface and the
 * flag on the board are the same colour without a fourth table to keep in step.
 *
 * No `charge`: absent means by seat order (`heraldryFor`), which gives four
 * seats four different charges for free — a crescent, a stag, a key and a wheel.
 */
export const SEATS: readonly PlayerSpec[] = [
  { name: 'Crimson', color: '#d4502e', isHuman: true },
  { name: 'Teal', color: '#1f8a85', isHuman: true },
  { name: 'Gilt', color: '#c08a2b', isHuman: true },
  { name: 'Lapis', color: '#3f639f', isHuman: true },
];

/**
 * The four shapes a new game can be seated in, and why the one-bot game is the
 * default.
 *
 * Single-player-against-an-AI is the product (CLAUDE.md, Direction), so from the
 * day a bot exists it is what the landing screen opens on. The others each stay
 * for a reason of their own: **Full game** is a whole world with rivals in it —
 * the four-seat playtest the notes asked for — **Solo** is the quiet world a
 * pacing measurement or a look at the map wants, and **Sandbox** is the hot-seat
 * dev harness, one tester driving both chairs from the seat chips, and the shape
 * remote multiplayer will arrive in.
 *
 * A bot seat needs **no schema change and no new field**: `normalizeConfig`
 * already defaults `PlayerSpec.isHuman` to false, so "a seat nobody is sitting
 * in" is the roster entry with `isHuman` left off, and `driveBots`
 * (`src/ai/driver.ts`) is the only thing in the program that asks. It sweeps
 * every such seat, so three bots need nothing one bot did not.
 */
export type SeatMode = 'bot' | 'full' | 'solo' | 'sandbox';

/** How many chairs the hot-seat harness deals. Two: it is one tester's game. */
const SANDBOX_SEATS = 2;

export const SEAT_MODES: readonly { value: SeatMode; label: string; seats: number }[] = [
  { value: 'bot', label: 'You vs one bot', seats: 2 },
  { value: 'full', label: 'Full game (you and three bots)', seats: SEATS.length },
  { value: 'solo', label: 'Solo (1 player)', seats: 1 },
  { value: 'sandbox', label: `Sandbox (${SANDBOX_SEATS} players, one tester)`, seats: SANDBOX_SEATS },
];

export const DEFAULT_SEAT_MODE: SeatMode = 'bot';

/**
 * The map a full game is dealt on.
 *
 * Four empires want room to be four empires: the standard map is the size the
 * pacing was measured on and the smallest one that seats four without their
 * borders touching on turn one. Choosing the mode moves the Size picker to it
 * rather than overriding it at Start — the player sees the map change and is
 * free to choose another, which is the difference between a default and a rule.
 */
export const FULL_GAME_SIZE = 'standard';

/**
 * The three rivals a full game seats, in seat order.
 *
 * Distinct on purpose, and distinct in *posture* rather than in numbers: a wide
 * empire that will be everywhere, a tall one that will out-build, and a
 * warmonger that will come for somebody. Four seats all playing the balanced
 * default is one opponent copied three times, which teaches a playtester nothing
 * about how a game with rivals in it goes.
 *
 * The ids are `data/ai.json`'s own persona sheet (`PERSONA_IDS`), pinned by
 * `test/ui/gameSetup.test.ts` so that a persona renamed in the data fails the
 * build here rather than quietly seating a balanced bot.
 */
export const FULL_GAME_PERSONAS: readonly string[] = ['wide', 'tall', 'warmonger'];

/**
 * The roster one mode seats.
 *
 * Seat 0 is always Crimson and always the person at the keyboard, so a bot game
 * is the two-seat game with the second chair *driven* rather than a different
 * game — which is what keeps the seat strip, the status line and every save
 * exactly as they were. A full game is the same sentence with three chairs
 * driven instead of one.
 *
 * `persona` is the landing's Opponent picker, and it is only ever asked about
 * the single-rival game (`modeAsksPersona`). It is written onto the spec only
 * when it is not the default, exactly as `normalizeConfig` writes a charge: a
 * balanced opponent leaves no key behind, so the default game's config is
 * byte-identical to one from before personas existed.
 */
export function rosterFor(mode: string, persona?: string): PlayerSpec[] {
  if (mode === 'solo') return [{ ...SEATS[0]! }];
  if (mode === 'sandbox') return SEATS.slice(0, SANDBOX_SEATS).map((spec) => ({ ...spec }));
  if (mode === 'full') {
    return [
      { ...SEATS[0]! },
      ...FULL_GAME_PERSONAS.map((id, index) => ({
        ...SEATS[index + 1]!,
        isHuman: false,
        persona: id,
      })),
    ];
  }
  const rival: PlayerSpec = { ...SEATS[1]!, isHuman: false };
  if (persona !== undefined && persona !== DEFAULT_PERSONA_ID) rival.persona = persona;
  return [{ ...SEATS[0]! }, rival];
}

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
 * Whether the Opponent picker is a question in this mode.
 *
 * It asks about *the* rival, singular, so it belongs to the one-bot game alone:
 * a solo or sandbox game seats nobody to ask about, and a full game's three
 * rivals are dealt their own postures (`FULL_GAME_PERSONAS`) rather than three
 * copies of one answer.
 */
export function modeAsksPersona(mode: string): boolean {
  return mode === 'bot';
}

/** The modes this build can actually deal, given the rules' seat limits. */
export function availableSeatModes(): readonly { value: SeatMode; label: string; seats: number }[] {
  const { minPlayers, maxPlayers } = RULES.game;
  return SEAT_MODES.filter(
    (mode) => mode.seats >= minPlayers && mode.seats <= Math.min(maxPlayers, SEATS.length),
  );
}
