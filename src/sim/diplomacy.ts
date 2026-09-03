/**
 * The verbs of war and peace: declaring, suing, annexing, razing — and the two
 * consequences that are nobody's command (the routes a declaration drops, and
 * the armies a peace sends home).
 *
 * `wars.ts` is the register and its readings; this is everything that *changes*
 * it. The split is a layering one and it is the whole reason both files exist:
 * `atWar` is asked by the movement evaluator, the combat planner and the raid
 * gate, so it may import nothing that imports them, while every verb here has
 * to reach `arriveOnTile`, the trade rules and the city rules. Nothing in the
 * simulation imports this module except the reducer and the turn pipeline.
 *
 * Every gate is a `…Error` and every mechanism is a `…At`
 * -------------------------------------------------------
 * `foundingError`'s bargain, kept for five more verbs: the sentence a greyed
 * button shows and the sentence a refused command returns are the same string
 * from the same function, so an offered button is a command the reducer takes.
 * The mechanisms validate nothing and are only ever called behind their gate.
 *
 * Peace is a **standing offer on both sides**, resolved in the pipeline
 * ---------------------------------------------------------------------
 * Turns are simultaneous, so "we agree" cannot be a handshake inside one
 * command: the two seats are acting in the same window and neither is waiting.
 * So `proposePeace` writes a flag that stands until it is withdrawn or the war
 * ends, and `settlePeace` — an end-of-turn phase — closes every war both sides
 * have signed. That is the same shape `turnEnded` already uses for the one
 * other thing every seat must agree to, and it means a peace resolves at a
 * moment the whole world shares rather than at a moment one client chose.
 *
 * Expulsion happens at **peace**, never at declaration (the user's ruling,
 * 2026-09-03: *"once war starts, units are not expelled, but they are expelled
 * after a peace deal"*). So a war opens the borders and a peace closes them, and
 * the armies standing on the wrong side of a border that has just closed are
 * walked out through `arriveOnTile` — the one seam a piece may come to rest at.
 */

import { arriveOnTile } from './arrival';
import { type City, cityById, playerById, realPlayers } from './state';
import type { GameState, Unit } from './state';
import { capitalCityOf, refreshCityDerived, tileOwnerPlayerId } from './cities';
import { updateElimination } from './combat';
import { type Cell, canStopOn, moveProfile } from './pathfind';
import { getTileAt, tileIndex, tileNeighbors } from './map';
import type { Tile } from './map';
import { type RouteEndReport, cancelRoutesAt, cancelRoutesBetween } from './trade';
import { isCivilian, unitDef } from './unitData';
import { recomputeAllVisibility, recomputeVisibilityFor } from './visibility';
import {
  atWar,
  closeWar,
  hasPeaceOffer,
  openWar,
  setPeaceOffer,
  truceTurnsLeft,
  warBetween,
} from './wars';

// --- what the verbs report --------------------------------------------------

/**
 * A war opening, as the world hears it.
 *
 * News to **every seat** — the worksheet's section 1 settles that ("public to
 * all seats; everyone hears a declaration"), and it is why this carries the two
 * empires rather than a "you" and a "them": the reducer has no opinion about
 * who is watching, exactly as `CombatOutcome` has none.
 */
export interface WarDeclaredReport {
  /** Who declared. */
  byId: number;
  /** Who was declared on. */
  onId: number;
  /** `state.turn` at the declaration, so a screen can say "since". */
  turn: number;
}

/** A war ending, and the truce it bought. `a < b`, the register's own key. */
export interface PeaceReport {
  a: number;
  b: number;
  /** Absolute turn the truce runs to. Nothing counts down (`wars.ts`). */
  truceUntilTurn: number;
}

/**
 * One piece walked out of ground it may no longer stand on.
 *
 * A *difference* that stops existing the instant the command returns —
 * `ArrivalReport`'s argument exactly: by the time this is read the piece is
 * simply somewhere else, and no diff of two boards can say it was sent home
 * rather than having marched.
 */
export interface ExpulsionReport {
  unitId: number;
  ownerId: number;
  /** The empire whose ground it was standing on. */
  fromOwnerId: number;
  /** Where it was. */
  from: Cell;
  /** Where it ended up — the same hex when nowhere legal was found. */
  to: Cell;
  /**
   * True when the search found nowhere at all and the piece was left standing.
   *
   * The honest failure rather than a deletion: a unit ringed by mountains,
   * water and other empires' fields is a board state a peace deal did not
   * create and must not destroy an army over. It is reported so an interface
   * can say so, and it is the one case where a peace leaves somebody's soldier
   * inside somebody else's borders.
   */
  stranded: boolean;
}

/** Everything one peace did, as the pipeline and the reducer both report it. */
export interface PeaceOutcome {
  peace: PeaceReport;
  expulsions: ExpulsionReport[];
}

// --- declaring --------------------------------------------------------------

/**
 * Why this empire cannot declare war on that one, or `null` when it can.
 *
 * **THE** gate: the Diplomacy screen greys its button with this sentence and
 * the reducer refuses with it, so an offered button is a command that is taken.
 * Five clauses, in the order a player meets them:
 *
 *   · **not yourself** — there is no civil war in this game;
 *   · **not the wild.** A barbarian is not a party to anything: it has no seat
 *     at a table, nothing to sign and no peace to break, and `atWar` already
 *     answers *true* for it without a row. Declaring on it would be writing a
 *     row that means nothing and can never be closed;
 *   · **not an empire that is gone.** Eliminated seats keep their row in
 *     `state.players` (nothing is ever removed — see `realPlayers`), so this is
 *     the clause that stops a war with a ghost;
 *   · **not one you are already at war with**, which is the ordinary
 *     idempotence refusal every verb in this codebase makes;
 *   · **not through a truce.** The one thing a finished war leaves behind (the
 *     worksheet, section 1: no history, no grudges, ten turns of quiet), and
 *     the sentence prints the figure `truceTurnsLeft` gives the screen, so the
 *     refusal and the countdown beside the seat's name cannot disagree.
 *
 * There is deliberately **no cost and no casus belli** — declaring is free in
 * v1 (the worksheet, section 2) — and deliberately no "have you met them"
 * clause, because this game has no meeting relation to ask: what a seat has
 * *seen* is `citySightings`, which is a memory of towns rather than a
 * recognition of empires, and inventing a met-ness here would be inventing a
 * rule the worksheet did not ask for.
 */
export function declareWarError(
  state: GameState,
  playerId: number,
  targetId: number,
): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return `No player with id ${String(playerId)}`;
  const target = playerById(state, targetId);
  if (!target) return `No player with id ${String(targetId)}`;
  if (target.id === actor.id) return 'You cannot declare war on yourself';
  if (actor.barbarian === true || target.barbarian === true) {
    return 'The wild keeps no treaties — there is nothing to declare';
  }
  if (target.eliminated) return `The ${target.name} are gone`;
  if (atWar(state, actor.id, target.id)) return `You are already at war with the ${target.name}`;
  const left = truceTurnsLeft(state, actor.id, target.id);
  if (left > 0) {
    return left === 1
      ? `The peace with the ${target.name} holds for one more turn`
      : `The peace with the ${target.name} holds for ${String(left)} more turns`;
  }
  return null;
}

/**
 * Opens the war and drops the trade between the two. **Validates nothing** —
 * `declareWarError` is the gate.
 *
 * The routes go **on the declaration** rather than on the first blow (the
 * worksheet, section 5), and they go in one breath with the row rather than in
 * the reducer, for `captureCity`'s reason exactly: this is the one place a war
 * starts, so a consequence that had to be remembered by a caller is a
 * consequence somebody forgets.
 *
 * **Nobody is expelled here.** That is the ruling, said out loud because it is
 * the surprising half: a declaration *opens* the borders, so the columns
 * standing in each other's fields are now standing in enemy territory legally,
 * and it is the peace that sends them home (`settlePeace`).
 *
 * Any standing peace offers go with the war row itself (`WarState.offers`), so
 * a second war between the same pair opens with nobody suing — which is exactly
 * right, and is a property of where the offers live rather than of a line here.
 */
export function declareWarAt(
  state: GameState,
  playerId: number,
  targetId: number,
): { report: WarDeclaredReport; routesEnded: RouteEndReport[] } {
  openWar(state, playerId, targetId);
  return {
    report: { byId: playerId, onId: targetId, turn: state.turn },
    routesEnded: cancelRoutesBetween(state, playerId, targetId),
  };
}

// --- suing for peace --------------------------------------------------------

/**
 * Why this empire cannot put a white-peace offer on the table, or `null`.
 *
 * The offer is a **standing, revocable flag** and not an act: it says "we would
 * stop", it stands until it is withdrawn or the war ends, and nothing happens
 * until the other seat says the same thing (see the module docblock). So the
 * gate is only about whether there is a war to sue over and whether the offer
 * would change anything.
 *
 * An offer already standing is refused rather than logged, which is the same
 * bargain every idempotent verb in this codebase makes: a command that provably
 * does nothing is a command that should never have been sent, and refusing it
 * keeps the log a record of *changes*.
 */
export function proposePeaceError(
  state: GameState,
  playerId: number,
  targetId: number,
): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return `No player with id ${String(playerId)}`;
  const target = playerById(state, targetId);
  if (!target) return `No player with id ${String(targetId)}`;
  if (target.id === actor.id) return 'You cannot make peace with yourself';
  if (actor.barbarian === true || target.barbarian === true) {
    return 'The wild keeps no treaties — there is nobody to talk to';
  }
  if (warBetween(state, actor.id, target.id) === undefined) {
    return `You are not at war with the ${target.name}`;
  }
  if (hasPeaceOffer(state, actor.id, target.id)) {
    return `Your offer to the ${target.name} already stands`;
  }
  return null;
}

/** `proposePeaceError`'s mirror: why the offer cannot be taken back. */
export function withdrawPeaceError(
  state: GameState,
  playerId: number,
  targetId: number,
): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return `No player with id ${String(playerId)}`;
  const target = playerById(state, targetId);
  if (!target) return `No player with id ${String(targetId)}`;
  if (warBetween(state, actor.id, target.id) === undefined) {
    return `You are not at war with the ${target.name}`;
  }
  if (!hasPeaceOffer(state, actor.id, target.id)) {
    return `You have offered the ${target.name} nothing to withdraw`;
  }
  return null;
}

/** Writes or clears one seat's offer. Validates nothing; the gates are above. */
export function setPeaceOfferAt(
  state: GameState,
  playerId: number,
  targetId: number,
  standing: boolean,
): void {
  setPeaceOffer(state, playerId, targetId, standing);
}

/**
 * Closes every war both sides have signed, and sends the armies home.
 *
 * The end-of-turn phase (`settleDiplomacy` in `turn.ts`), and the only place a
 * war ends. Wars are walked in `state.wars` order — declaration order, which is
 * an order the state itself carries (`GameState.wars`) — so two peaces
 * resolving in the same resolution always resolve the same way, and the
 * expulsions they produce come out in the same order every replay.
 *
 * The **rows are collected before anything is closed**, because `closeWar`
 * rewrites `state.wars`; iterating an array while a callee filters it is the
 * one bug this shape cannot afford.
 *
 * Expulsion runs *after* the war row is gone and the truce is written, and that
 * ordering is the rule rather than a convenience: `moveProfile` reads `atWar`
 * to decide which borders bar a piece, so a column walked out while the war was
 * still open would be walked out into ground it is about to be barred from.
 */
export function settlePeace(state: GameState): PeaceOutcome[] {
  const signed = state.wars.filter(
    (war) => war.offers?.includes(war.a) === true && war.offers.includes(war.b),
  );
  const outcomes: PeaceOutcome[] = [];
  for (const war of signed) {
    const { a, b } = war;
    const truceUntilTurn = closeWar(state, a, b);
    const expulsions = [...expelFrom(state, a, b), ...expelFrom(state, b, a)];
    outcomes.push({ peace: { a, b, truceUntilTurn }, expulsions });
  }
  return outcomes;
}

// --- expulsion --------------------------------------------------------------

/**
 * Walks every piece of `moverId`'s that is standing in `holderId`'s territory
 * out to the nearest hex it may legally occupy.
 *
 * Deterministic three times over, because a teleport that picked a different
 * hex on a replay would be the end of the replay guarantee:
 *
 *   · **units in `state.units` order**, which is part of the state, so two
 *     pieces contending for the same refuge always resolve the same way (the
 *     first one takes it and the second finds it occupied, exactly as log order
 *     resolves two players reaching for a tile);
 *   · **hexes by ring, then by tile index** — a breadth-first walk out from
 *     where the piece stands, with each ring's candidates settled in map order,
 *     so "nearest" never depends on the order `mapNeighbors` happened to return;
 *   · **`canStopOn` decides**, which is the same evaluator an ordinary march
 *     ends on, so a piece is never put somewhere a player could not have
 *     marched it. It refuses the ground the piece is leaving too, since that
 *     ground is now barred to it.
 *
 * Only pieces the border rule actually binds are moved: a civilian may stand in
 * a neighbour's fields at peace (that is the whole of "civilians pass"), so
 * only combatants are sent home. The search is capped at `EXPULSION_RANGE`
 * rings — a piece with no refuge inside that is reported `stranded` and left
 * where it is, which is the honest failure (see `ExpulsionReport.stranded`).
 *
 * The piece comes to rest through `arriveOnTile`, the one seam for that
 * (`arrival.ts`), and its standing order is dropped: a path computed from a hex
 * the unit is no longer on is an order describing a march nobody made.
 */
export function expelFrom(state: GameState, moverId: number, holderId: number): ExpulsionReport[] {
  const reports: ExpulsionReport[] = [];
  for (const unit of [...state.units]) {
    if (unit.ownerId !== moverId) continue;
    if (isCivilian(unitDef(unit.type))) continue;
    if (tileOwnerPlayerId(state, unit.col, unit.row) !== holderId) continue;
    const from: Cell = { col: unit.col, row: unit.row };
    const refuge = nearestRefuge(state, unit);
    if (refuge === null) {
      reports.push({
        unitId: unit.id,
        ownerId: moverId,
        fromOwnerId: holderId,
        from,
        to: from,
        stranded: true,
      });
      continue;
    }
    unit.col = refuge.col;
    unit.row = refuge.row;
    // The order it was under described a march from a hex it is no longer on.
    delete unit.path;
    arriveOnTile(state, unit, refuge);
    reports.push({
      unitId: unit.id,
      ownerId: moverId,
      fromOwnerId: holderId,
      from,
      to: { col: refuge.col, row: refuge.row },
      stranded: false,
    });
  }
  if (reports.some((report) => !report.stranded)) {
    // Both seats' eyes moved: the one whose columns left, and the one whose
    // ground they were lighting. Spelled out rather than refreshing the world,
    // which is `recomputeVisibilityFor`'s own argument.
    recomputeVisibilityFor(state, [moverId, holderId]);
  }
  return reports;
}

/**
 * How far out an expulsion will look for a hex a piece may stand on.
 *
 * A rule and not a tunable, which is why it is here and not in `rules.json`:
 * there is nothing to dial. It is large enough that a piece anywhere near the
 * edge of an empire finds ground on the first or second ring, and finite so a
 * pathological board cannot turn one peace deal into a full-map flood fill per
 * unit. A piece that finds nothing inside it is reported `stranded`, which is a
 * real outcome rather than a failure.
 */
const EXPULSION_RANGE = 6;

/**
 * The nearest hex this piece may legally come to rest on, or `null`.
 *
 * Breadth-first from the piece's own tile; each ring's candidates are settled in
 * ascending tile-index order so the answer is a function of the board alone.
 * See `expelFrom` for why every part of that matters.
 */
function nearestRefuge(state: GameState, unit: Unit): Tile | null {
  const start = getTileAt(state.map, unit.col, unit.row);
  if (!start) return null;
  const mover = moveProfile(state, unit);
  const seen = new Set<number>([tileIndex(state.map, start.col, start.row)]);
  let ring: Tile[] = [start];
  for (let step = 0; step < EXPULSION_RANGE; step++) {
    const next: Tile[] = [];
    for (const tile of ring) {
      for (const neighbor of tileNeighbors(state.map, tile)) {
        const index = tileIndex(state.map, neighbor.col, neighbor.row);
        if (seen.has(index)) continue;
        seen.add(index);
        next.push(neighbor);
      }
    }
    // Map order inside the ring, so nothing depends on the order neighbours
    // came back in — `findPath`'s determinism rule, one search over.
    next.sort(
      (x, y) =>
        tileIndex(state.map, x.col, x.row) - tileIndex(state.map, y.col, y.row),
    );
    for (const tile of next) {
      if (canStopOn(state, unit, tile, mover)) return tile;
    }
    ring = next;
    if (ring.length === 0) break;
  }
  return null;
}

// --- what to do with a town you took ----------------------------------------

/** Why this town cannot be annexed, or `null` when it can. */
export function annexCityError(
  state: GameState,
  playerId: number,
  cityId: number,
): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return `No player with id ${String(playerId)}`;
  const city = cityById(state, cityId);
  if (!city) return `No city with id ${String(cityId)}`;
  if (city.ownerId !== actor.id) return `${city.name} is not yours`;
  if (city.puppet !== true) return `${city.name} is already part of your empire`;
  return null;
}

/**
 * Takes a puppet into the empire proper. Validates nothing.
 *
 * One line, and it is the whole verb: the two readings a puppet has are both
 * derived from the flag (`cityAuthorityCost`, `explainHappiness`), so deleting
 * it is the annexation. **Irreversible** by the plainest possible mechanism —
 * there is no verb that writes the flag back, and the only thing that ever sets
 * it is a fresh capture (the ruling, 9b).
 *
 * The town is re-seated because its meters just moved and the panel it would
 * otherwise lie to is this one — the mid-turn register's rule
 * (`refreshCityDerived`).
 */
export function annexCityAt(state: GameState, city: City): void {
  delete city.puppet;
  refreshCityDerived(state, city);
}

/**
 * Why this town cannot be razed, or `null` when it can.
 *
 * **Immediate and with no window** (the ruling, 9b: "raze immediate"), so there
 * is deliberately no "you took this city recently" clause — a captor may pull
 * down anything they hold, whenever they hold it, and the price is that it is
 * gone.
 *
 * Two towns are safe from it and both are palaces:
 *
 *   · **your own capital** (`capitalCityOf`), because an empire that razed its
 *     own seat of government would be deleting the thing every meter in the
 *     game is anchored to;
 *   · **any town that has ever been a capital** (`City.wasCapital`, written the
 *     moment a palace is taken). That is the orchestrator's ruling — capitals
 *     are never razeable — said with the one field that survives a conquest;
 *     `capitalCityOf` cannot answer it, because a seized palace stops reading
 *     as one the instant the flag changes hands.
 */
export function razeCityError(
  state: GameState,
  playerId: number,
  cityId: number,
): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return `No player with id ${String(playerId)}`;
  const city = cityById(state, cityId);
  if (!city) return `No city with id ${String(cityId)}`;
  if (city.ownerId !== actor.id) return `${city.name} is not yours`;
  if (city.wasCapital === true || capitalCityOf(state, actor.id)?.id === city.id) {
    return `${city.name} is a seat of government and cannot be pulled down`;
  }
  return null;
}

/** What razing a town took with it, for the sentence somebody announces it in. */
export interface RazeReport {
  /** Who pulled it down. */
  ownerId: number;
  cityId: number;
  name: string;
  col: number;
  row: number;
  /** Hexes that went back to nobody's. */
  tilesReleased: number;
}

/**
 * Pulls a town down. Validates nothing — `razeCityError` is the gate.
 *
 * What it does, and what it deliberately does not:
 *
 *   · **the city is removed from the roster** and every hex it held goes back
 *     to unclaimed. `state.tileOwner` holds *city* ids (see `state.ts`), so
 *     releasing the ground is one sweep over the parallel array and no second
 *     register has to be told;
 *   · **the improvements stay.** Nothing regenerates a tile mid-game (CLAUDE.md's
 *     hardest mapgen rule), so the farms and the mines and the roads are still
 *     there for whoever settles the ash — which is also the honest picture: an
 *     army burns a town, not a valley;
 *   · **no ruin, no discovery, no rubble state.** A razed site is simply an
 *     empty hex. Adding a discovery here would be placing one after `newGame`,
 *     which is the one thing the discovery rules forbid;
 *   · **the pieces standing on it stay standing.** The hex is ordinary ground
 *     now and they are on it; a rule that scattered them would be a second
 *     expulsion mechanism with no ruling behind it;
 *   · **every route with an end here is dropped**, on both sides, because a
 *     caravan cannot arrive at a town that is not there;
 *   · **every seat's memory of it is forgotten** (`citySightings`), or an
 *     empire that once saw it would keep a banner over an empty field forever.
 *
 * `updateElimination` is asked at the end because razing can be the blow that
 * finishes an empire — a seat whose last town this was, with nothing left on
 * the board, is out — and that verdict has exactly one implementation.
 */
export function razeCityAt(
  state: GameState,
  city: City,
): { report: RazeReport; routesEnded: RouteEndReport[] } {
  const routesEnded = cancelRoutesAt(state, city.id);
  let tilesReleased = 0;
  for (let index = 0; index < state.tileOwner.length; index++) {
    if (state.tileOwner[index] !== city.id) continue;
    state.tileOwner[index] = null;
    tilesReleased += 1;
  }
  const report: RazeReport = {
    ownerId: city.ownerId,
    cityId: city.id,
    name: city.name,
    col: city.col,
    row: city.row,
    tilesReleased,
  };
  state.cities = state.cities.filter((row) => row.id !== city.id);
  state.citySightings = state.citySightings.map((list) =>
    list.filter((sighting) => sighting.cityId !== city.id),
  );
  // Every seat, and not only the two: a town lights the ground it holds for its
  // owner and it is a landmark on everybody else's remembered map, so the
  // cheapest honest answer is the whole world's eyes. It happens once, on a
  // verb a player issues by hand.
  recomputeAllVisibility(state);
  updateElimination(state);
  return { report, routesEnded };
}

/**
 * Every empire that still counts, for a screen that lists relations.
 *
 * `realPlayers` with the reader's own seat and the fallen left out — the one
 * place that filter is written down, so the Diplomacy screen and any later
 * roster of relations cannot disagree about who is at the table.
 */
export function diplomaticSeats(state: GameState, playerId: number): number[] {
  const seats: number[] = [];
  for (const player of realPlayers(state)) {
    if (player.id === playerId || player.eliminated) continue;
    seats.push(player.id);
  }
  return seats;
}
