/**
 * **Reading rivals** (Scientific batch S3, feature B of
 * `docs/plans/scientific-themes.md`, section 6): what this seat knows compared
 * with the empires it has met.
 *
 * The questions:
 *
 *   · **the lead** (`techLead`): technologies the seat knows that no met
 *     empire knows. Its charter technologies count (the triage's reading 17).
 *     The lead is empty while the seat has met nobody (reading 18), so an
 *     isolated seat is not paid for being alone;
 *   · **the gap** (`techGap`): technologies a met empire knows that the seat
 *     does not. A rival's charter technologies are left out (reading 2),
 *     because the seat could never research them. Asked of one empire, it is
 *     the gap to that empire alone (Books from the Ships, the owner at the far
 *     end of a trade route);
 *   · **does a met empire know this technology** (`metEmpireKnows`), and the
 *     two "ahead" readings built on it: `aheadOfMet` for a technology (The
 *     Great Designs, reading 46) and `unitAheadOfMet` for a unit type (Greek
 *     Fire, reading 45). Both are false while the seat has met nobody, for
 *     reading 18's reason;
 *   · **does another empire know fewer, or more, technologies than this
 *     seat** (`knowsFewerTechs`, `knowsMoreTechs`): The Edge of the Sword
 *     reads the first, and Dominion's The Upstarts will read the second.
 *
 * **Who counts.** Only the seats in `Player.metSeats`, so a card shows nothing
 * the player has not seen. The barbarian seat never counts: it is not an
 * empire (the user's ruling, themes doc section 15), and `recordMeetings`
 * never writes it into the register anyway. An eliminated empire does not
 * count either: it has no towns and no units, so it is no longer a rival.
 *
 * **Computed when asked.** Every list here is short (a seat knows at most a
 * few dozen technologies, and meets at most a handful of empires), so nothing
 * is stored and nothing can go stale.
 *
 * **A leaf.** It imports values from `techData.ts` alone, and only types from
 * `state.ts`, so the evaluator and `tech.ts` can both read it without an
 * import cycle (`test/mapgen/moduleCycles.test.ts`). For the same reason it
 * walks `state.players` itself and does not call `playerById`.
 */

import type { GameState, Player } from './state';
import { type TechId, TECH_IDS, UNIT_UNLOCK_TECH, isTechId } from './techData';
import type { UnitTypeId } from './unitData';

/** The seat with this id, or `undefined`. `playerById` without the import. */
function seatOf(state: GameState, playerId: number): Player | undefined {
  for (const player of state.players) {
    if (player.id === playerId) return player;
  }
  return undefined;
}

/**
 * The empires this seat has met that still count as rivals: in its
 * `metSeats` register, not itself, not the barbarian seat and not
 * eliminated. In `metSeats` order, which is sorted by seat.
 */
export function metRivals(state: GameState, playerId: number): Player[] {
  const seat = seatOf(state, playerId);
  if (!seat) return [];
  const rivals: Player[] = [];
  for (const id of seat.metSeats) {
    if (id === playerId) continue;
    const other = seatOf(state, id);
    if (!other || other.barbarian === true || other.eliminated === true) continue;
    rivals.push(other);
  }
  return rivals;
}

/**
 * Adds the technologies this player knows to `into`, skipping stray ids. The
 * set answers membership only; every answer below walks an array, so no
 * outcome depends on a set's order (hard rule 2).
 */
function addKnown(into: Set<TechId>, player: Player): Set<TechId> {
  for (const id of player.techsResearched) {
    if (isTechId(id)) into.add(id);
  }
  return into;
}

/** The technologies this player knows, without repeats and without stray ids. */
function knownTechs(player: Player): Set<TechId> {
  return addKnown(new Set<TechId>(), player);
}

/**
 * How many technologies this player knows, its charter technologies included
 * (reading 17). The count `knowsFewerTechs` and `knowsMoreTechs` compare.
 */
export function techsKnownCount(player: Player): number {
  return knownTechs(player).size;
}

/**
 * **The lead**: the technologies this seat knows that no empire it has met
 * knows, its charter technologies included. Empty while the seat has met
 * nobody (reading 18).
 *
 * In the seat's own research order, so a surface that lists them (the star
 * chart's gilt corners, batch S10) lists them in the order they were learned.
 */
export function techLead(state: GameState, playerId: number): TechId[] {
  const seat = seatOf(state, playerId);
  if (!seat) return [];
  const rivals = metRivals(state, playerId);
  if (rivals.length === 0) return [];
  const theirs = new Set<TechId>();
  for (const rival of rivals) addKnown(theirs, rival);
  // Walked as the seat's own array, not as a set, so the order is the
  // research order by construction (hard rule 2).
  const lead: TechId[] = [];
  for (const id of seat.techsResearched) {
    if (!isTechId(id) || theirs.has(id) || lead.includes(id)) continue;
    lead.push(id);
  }
  return lead;
}

/**
 * **The gap**: the technologies a met empire knows that this seat does not.
 * Charter technologies are left out (reading 2): a rival's charter
 * technology is one this seat may never research.
 *
 * With `fromId`, the gap to that one empire, which must still be a met rival;
 * without it, the gap to every met empire together, each technology once. In
 * the tree's own order (`TECH_IDS`), so the answer does not depend on which
 * rival learned a technology first.
 */
export function techGap(state: GameState, playerId: number, fromId?: number): TechId[] {
  const seat = seatOf(state, playerId);
  if (!seat) return [];
  const rivals = metRivals(state, playerId).filter((rival) => fromId === undefined || rival.id === fromId);
  if (rivals.length === 0) return [];
  const mine = knownTechs(seat);
  const theirs = new Set<TechId>();
  for (const rival of rivals) addKnown(theirs, rival);
  // `TECH_IDS` holds the ordinary rows only, so no charter technology joins.
  const gap: TechId[] = [];
  for (const id of TECH_IDS) {
    if (theirs.has(id) && !mine.has(id)) gap.push(id);
  }
  return gap;
}

/** Does at least one empire this seat has met know this technology? */
export function metEmpireKnows(state: GameState, playerId: number, tech: TechId): boolean {
  for (const rival of metRivals(state, playerId)) {
    if (rival.techsResearched.includes(tech)) return true;
  }
  return false;
}

/**
 * Is this seat **ahead of every empire it has met** on this technology: it
 * has met at least one, and none of them knows it? The Great Designs' test
 * (reading 46). False while the seat has met nobody, for reading 18's reason.
 */
export function aheadOfMet(state: GameState, playerId: number, tech: TechId): boolean {
  if (metRivals(state, playerId).length === 0) return false;
  return !metEmpireKnows(state, playerId, tech);
}

/**
 * Can an empire this seat has met build this unit type? It can when it knows
 * the technology that opens the type (reading 45). A type that no technology
 * opens can be built by anybody, so the answer is yes.
 */
export function metEmpireCanBuild(state: GameState, playerId: number, type: UnitTypeId): boolean {
  const gate = UNIT_UNLOCK_TECH.get(type);
  if (gate === undefined) return true;
  return metEmpireKnows(state, playerId, gate);
}

/**
 * Is this unit type **one no met empire can build**: the seat has met at least
 * one empire, a technology opens the type, and no met empire knows it? Greek
 * Fire's test (reading 45). A type no technology opens never passes.
 */
export function unitAheadOfMet(state: GameState, playerId: number, type: UnitTypeId): boolean {
  const gate = UNIT_UNLOCK_TECH.get(type);
  if (gate === undefined) return false;
  return aheadOfMet(state, playerId, gate);
}

/**
 * The other empire, when it is a real one that can be compared: not this
 * seat, not the barbarian seat and not missing. Meeting is not asked: a fight
 * shows the other side, so the two have met by then.
 */
function comparableRival(state: GameState, playerId: number, otherId: number): Player | undefined {
  if (otherId === playerId) return undefined;
  const other = seatOf(state, otherId);
  if (!other || other.barbarian === true) return undefined;
  return other;
}

/**
 * Does `otherId` know **fewer** technologies than `playerId`? The Edge of the
 * Sword's test. Charter technologies count on both sides (reading 17). Never
 * true of the barbarian seat (reading 7).
 */
export function knowsFewerTechs(state: GameState, playerId: number, otherId: number): boolean {
  const seat = seatOf(state, playerId);
  const other = comparableRival(state, playerId, otherId);
  if (!seat || !other) return false;
  return techsKnownCount(other) < techsKnownCount(seat);
}

/**
 * Does `otherId` know **more** technologies than `playerId`? The mirror of
 * `knowsFewerTechs`, for Dominion's The Upstarts. Never true of the barbarian
 * seat.
 */
export function knowsMoreTechs(state: GameState, playerId: number, otherId: number): boolean {
  const seat = seatOf(state, playerId);
  const other = comparableRival(state, playerId, otherId);
  if (!seat || !other) return false;
  return techsKnownCount(other) > techsKnownCount(seat);
}
