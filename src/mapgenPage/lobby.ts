/**
 * The lobby: which figures are sitting down, and how many chairs there are.
 *
 * The page's own question, asked of the generator the game asks it of. A leader
 * biases where its seat stands, what grows near it and what the fairness pass
 * furnishes it with (`docs/mapgen.md`, "The leaders' three stages"), and the
 * only honest way to look at that is to seat a roster and generate the world it
 * makes — which is exactly what `generate()` does with what this module builds:
 * the same `PlayerSpec[]` a real game is configured with, through the same
 * `createGame` → `generateMap(seed, size, overrides, seats)`.
 *
 * **It is a module and not a hundred lines inside `main.ts`** for one reason:
 * `main.ts` is a page entry that reaches for the document at import, so nothing
 * in it can be tested without a DOM. What a test wants to hold still here is not
 * the markup — it is that the choices *walk the leader table* (a seventh figure
 * must appear in the lobby with no page edit) and that a roster with one figure
 * in it is a roster with one figure in it. Both are questions about data, so
 * they live where data can be asked.
 *
 * The empty string is "nobody", and it is the empty string rather than
 * `undefined` because a `<select>`'s value is a string and a lobby is a row of
 * selects. `rosterFor` is where it becomes an absent key — which is the shape
 * `normalizeConfig` wants, and the shape that makes a leaderless lobby generate
 * the map it always generated.
 */

import { LEADER_IDS, type LeaderId, leaderDef } from '../sim/leaderData';
import { RULES } from '../sim/rulesData';
import type { PlayerSpec } from '../sim/state';

/** A chair: a figure, or nobody. */
export type LobbySeat = LeaderId | '';

/** One option in a seat's select. */
export interface LobbyChoice {
  id: LobbySeat;
  name: string;
}

/**
 * Every choice a chair offers: nobody, then the sheet's own figures in its own
 * order.
 *
 * Read off `LEADER_IDS` and `leaderDef` rather than written out, so a seventh
 * leader is a row in `data/leaders.json` and nothing else. Nothing on this page
 * may name a figure — the same rule the arena page keeps about bot knobs.
 */
export const LOBBY_CHOICES: readonly LobbyChoice[] = [
  { id: '', name: 'No leader' },
  ...LEADER_IDS.map((id) => ({ id: id as LobbySeat, name: leaderDef(id).name })),
];

/** The chair count's floor and ceiling — the game's own roster limits. */
export const MIN_SEATS = RULES.game.minPlayers;
export const MAX_SEATS = RULES.game.maxPlayers;

/**
 * A lobby of `seats` empty chairs.
 *
 * Empty rather than dealt, deliberately: the page's first question is still
 * *"is the generator making good ground"*, which wants nobody's thumb on the
 * scale, and a lobby you fill in is one click from the other question.
 */
export function emptyLobby(seats: number): LobbySeat[] {
  return new Array<LobbySeat>(clampSeats(seats)).fill('');
}

/** Chairs, held inside the roster limits. */
export function clampSeats(seats: number): number {
  return Math.max(MIN_SEATS, Math.min(MAX_SEATS, Math.round(seats)));
}

/** One more chair, empty, or the lobby unchanged when it is already full. */
export function withSeatAdded(lobby: readonly LobbySeat[]): LobbySeat[] {
  if (lobby.length >= MAX_SEATS) return [...lobby];
  return [...lobby, ''];
}

/** One chair fewer — the last one — or the lobby unchanged at the floor. */
export function withSeatRemoved(lobby: readonly LobbySeat[]): LobbySeat[] {
  if (lobby.length <= MIN_SEATS) return [...lobby];
  return lobby.slice(0, -1);
}

/** The same lobby with one chair's figure changed. */
export function withSeatSet(
  lobby: readonly LobbySeat[],
  index: number,
  leader: LobbySeat,
): LobbySeat[] {
  const next = [...lobby];
  if (index >= 0 && index < next.length) next[index] = leader;
  return next;
}

/** Is this a figure the sheet carries? A select can only offer real ones. */
export function isSeatedLeader(seat: LobbySeat): seat is LeaderId {
  return seat !== '' && LEADER_IDS.includes(seat);
}

/**
 * The lobby as a **game roster** — the config `createGame` takes.
 *
 * `name` is the figure's own name where there is one, so the start table and the
 * capital walk say "Akhenaten" rather than "Seat 4"; a chair with nobody in it
 * keeps its seat name and, crucially, **no `leader` key at all**, which is what
 * makes an empty lobby generate the map it always generated.
 */
export function rosterFor(
  lobby: readonly LobbySeat[],
  seatColor: (index: number) => string,
): PlayerSpec[] {
  return lobby.map((seat, index) => ({
    name: isSeatedLeader(seat) ? leaderDef(seat).name : `Seat ${index + 1}`,
    color: seatColor(index),
    isHuman: true,
    ...(isSeatedLeader(seat) ? { leader: seat } : {}),
  }));
}
