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
import { type City, allocateEntityId, cityById, playerById, realPlayers } from './state';
import type { GameState, Unit } from './state';
import {
  capitalCityOf,
  hasResource,
  refreshCityDerived,
  tileOwnerField,
  tileOwnerPlayerId,
} from './cities';
import { handOverCity, updateElimination } from './combat';
import {
  type DealEndReport,
  type DealProposal,
  type DealTerms,
  cancelDealsBetween,
  dealIsOngoing,
  dealsBetween,
  isLendableResource,
  openDeal,
  proposalById,
  seatsMayBargain,
  termsAreEmpty,
} from './deals';
import { isResourceId, resourceDef } from './resourceData';
// The ability register, asked rather than a technology named: `openBordersError`
// is the one reader of the `openBorders` verb, and it prints the tech's own name
// so a greyed row says what would ungrey it.
import { ABILITY_TECH, techDef, techsGrant } from './techData';
import { type Cell, canStopOn, moveProfile } from './pathfind';
import { getTileAt, tileIndex, tileNeighbors } from './map';
import type { Tile } from './map';
import { type RouteEndReport, cancelRoutesAt, cancelRoutesBetween } from './trade';
import { isCivilian, unitDef } from './unitData';
import {
  HIDDEN,
  isVisibleTo,
  recomputeAllVisibility,
  recomputeVisibilityFor,
} from './visibility';
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
  /**
   * What the terms on the paper moved, when there was a paper.
   *
   * Absent for a white peace, which is what P1 could make and still the common
   * one — so a peace with nothing on the table reports exactly what it always
   * did. `ExpulsionReport`'s argument in a second currency: the coin is spent,
   * the town has changed hands and the row is open by the time anybody reads
   * this, and no diff of two boards could say which peace did it.
   */
  execution?: DealExecution;
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
): { report: WarDeclaredReport; routesEnded: RouteEndReport[]; dealsEnded: DealEndReport[] } {
  openWar(state, playerId, targetId);
  // **Every bargain between the two goes with the caravans** (the ruling, 9b:
  // deals auto-cancel on declaration), in the same breath and for the same
  // reason: this is the one place a war starts, and a consequence a caller had
  // to remember is a consequence somebody forgets. The standing proposals go
  // too — a paper nobody may sign is not a paper.
  const dealsEnded = cancelDealsBetween(state, playerId, targetId);
  // The lent seams have just gone home and the tributes have just stopped, so
  // both empires' towns are being priced off a different list of luxuries than
  // they were a line ago — the mid-turn register's entry for the deal verbs.
  if (dealsEnded.length > 0) {
    reseatEmpire(state, playerId);
    reseatEmpire(state, targetId);
  }
  return {
    report: { byId: playerId, onId: targetId, turn: state.turn },
    routesEnded: cancelRoutesBetween(state, playerId, targetId),
    dealsEnded,
  };
}

/**
 * Re-seats every town of one empire, because something empire-wide has just
 * changed what its hexes are worth.
 *
 * The **17th entry in the mid-turn register** (`refreshCityDerived`), and the
 * one whose subject is neither a city nor a tile: a lent luxury moves a
 * signature that pays across a whole empire, so the towns that have to be told
 * are all of them and on both sides of the table. `settleResearchWindfall`
 * takes the same shape one system over and for the same reason — a technology
 * is not a city either.
 *
 * Every deal verb calls it for both seats: acceptance, expiry, and the
 * declaration that cancels one.
 */
function reseatEmpire(state: GameState, playerId: number): void {
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    refreshCityDerived(state, city);
  }
}

// --- the terms vocabulary ---------------------------------------------------

/**
 * Why this empire cannot hand over this half of a bargain, or `null` when it
 * can.
 *
 * **THE** gate on a set of terms, asked twice for every bargain — once of each
 * side — and asked again at acceptance, because a paper written six turns ago
 * may name a mine that has since been pillaged or coin that has since been
 * spent. That double asking is the whole reason this is a function rather than
 * five clauses inside a verb: the proposal's refusal, the acceptance's refusal
 * and the screen's greyed row are one sentence from one place.
 *
 * The clauses, in the order a player meets them:
 *
 *   · **coin they have** — a lump is checked against the treasury *now*, and
 *     again at acceptance, because that is the only moment it actually moves.
 *     A tribute is not: an empire may promise more per turn than it earns and
 *     go into arrears for it, which is a real decision the creditors already
 *     price (`upkeep.ts`);
 *   · **seams they hold** — a luxury, named once each, that this empire
 *     actually controls (`hasResource`, which already answers *false* for
 *     anything it has lent to somebody else, so a seam cannot be promised
 *     twice). Only luxuries: iron and horses are what an army is made of, and
 *     trading the strategic table is a design decision nobody has taken;
 *   · **a right of way both may write** — the mutual technology gate below;
 *   · **towns they own, in a peace** — a city may change hands only in a peace
 *     deal (the ruling, 9b), never in an ordinary bargain, and never a seat of
 *     government: an empire that could sign its own palace away could sign
 *     itself out of existence at the table.
 */
export function dealSideError(
  state: GameState,
  giverId: number,
  receiverId: number,
  terms: DealTerms,
  /** True in a peace deal, where towns may be ceded. See the clause. */
  citiesAllowed: boolean,
): string | null {
  const giver = playerById(state, giverId);
  if (!giver) return `No player with id ${String(giverId)}`;
  const receiver = playerById(state, receiverId);
  if (!receiver) return `No player with id ${String(receiverId)}`;

  const gold = terms.gold ?? 0;
  if (!Number.isInteger(gold) || gold < 0) return 'A payment must be a whole number of coins';
  // Asked only of a payment that exists. A treasury may be *in arrears* — the
  // creditors are already taking pieces off it (`upkeep.ts`) — and a clause
  // that compared a zero against a negative balance would refuse a side of a
  // bargain that promises no coin at all.
  if (gold > 0 && gold > giver.gold) {
    return giverId === receiverId
      ? 'There is not that much in the treasury'
      : `The ${giver.name} do not have that much coin`;
  }
  const perTurn = terms.goldPerTurn ?? 0;
  if (!Number.isInteger(perTurn) || perTurn < 0) {
    return 'A tribute must be a whole number of coins a turn';
  }

  const named = terms.luxuries ?? [];
  const seen: string[] = [];
  for (const id of named) {
    if (!isResourceId(id)) return `There is no such thing as ${String(id)}`;
    if (!isLendableResource(id)) {
      return `${resourceDef(id).name} is not a luxury and cannot be lent`;
    }
    if (seen.includes(id)) return `${resourceDef(id).name} is named twice`;
    seen.push(id);
    if (!hasResource(state, giverId, id)) {
      return `The ${giver.name} have no ${resourceDef(id).name.toLowerCase()} to lend`;
    }
  }

  if (terms.openBorders === true) {
    const refusal = openBordersError(state, giverId, receiverId);
    if (refusal !== null) return refusal;
  }

  const towns = terms.cities ?? [];
  if (towns.length > 0 && !citiesAllowed) {
    return 'Towns change hands only in a peace';
  }
  const capital = capitalCityOf(state, giverId);
  const namedTowns: number[] = [];
  for (const cityId of towns) {
    const city = cityById(state, cityId);
    if (!city) return `No city with id ${String(cityId)}`;
    if (city.ownerId !== giverId) return `${city.name} is not theirs to give`;
    if (namedTowns.includes(cityId)) return `${city.name} is named twice`;
    namedTowns.push(cityId);
    if (capital?.id === city.id) return `${city.name} is a seat of government and cannot be given`;
  }
  return null;
}

/**
 * Why these two empires may not write a right of way, or `null`.
 *
 * The **one** reader of the `openBorders` ability, so no rule in the simulation
 * names the technology (`ABILITY_TECH`, `techData.ts`). The gate is **mutual**
 * and that is the ruling read plainly: a treaty is a document, and it takes
 * scribes on both sides of the table — so an empire that has learned to write
 * still cannot open its border to one that has not, whichever way the passage
 * runs.
 *
 * The sentence names the technology, because a greyed row that does not say
 * what would ungrey it is a rule a player cannot learn.
 */
export function openBordersError(
  state: GameState,
  x: number,
  y: number,
): string | null {
  const one = playerById(state, x);
  const two = playerById(state, y);
  if (!one || !two) return 'There is nobody to open a border with';
  const gate = ABILITY_TECH.get('openBorders');
  const named = gate === undefined ? 'the writing of treaties' : techDef(gate).name;
  if (!techsGrant(one.techsResearched, 'openBorders')) {
    return `Open borders are written down, and the ${one.name} have not learned ${named}`;
  }
  if (!techsGrant(two.techsResearched, 'openBorders')) {
    return `Open borders are written down, and the ${two.name} have not learned ${named}`;
  }
  return null;
}

/** What executing a bargain actually moved, for the sentences that report it. */
export interface DealExecution {
  /** Every lump of coin that changed hands, in the order it moved. */
  payments: { fromId: number; toId: number; gold: number }[];
  /** Every town that changed hands. */
  cededCities: { cityId: number; name: string; fromId: number; toId: number }[];
  /** The row this bargain opened, or `null` when nothing was left standing. */
  dealId: number | null;
}

/**
 * Moves everything a bargain moves **once**, and opens the row for everything
 * it leaves standing. Validates nothing — the gates are above, asked in full.
 *
 * The order is the ruling and not a convenience: coin, then towns, then the
 * row. The coin first because a treasury is the simplest thing on the table and
 * a town changing hands cannot alter it; the towns before the row because a
 * lent seam is priced off ground somebody owns, and the empire that is about to
 * receive one may be about to receive the hill it stands on as well.
 *
 * Both empires are re-seated at the end, once, however many terms moved — the
 * mid-turn register's rule (`reseatEmpire`).
 */
export function settleDealAt(
  state: GameState,
  byId: number,
  toId: number,
  give: DealTerms,
  take: DealTerms,
): DealExecution {
  const execution: DealExecution = { payments: [], cededCities: [], dealId: null };
  payLump(state, byId, toId, give.gold ?? 0, execution);
  payLump(state, toId, byId, take.gold ?? 0, execution);
  cedeTowns(state, byId, toId, give.cities ?? [], execution);
  cedeTowns(state, toId, byId, take.cities ?? [], execution);
  if (dealIsOngoing(give, take)) {
    execution.dealId = openDeal(state, allocateEntityId(state), byId, toId, give, take).id;
  }
  reseatEmpire(state, byId);
  reseatEmpire(state, toId);
  // **Only when a town actually moved.** A ceded city can be the last one an
  // empire had, and that verdict has exactly one implementation wherever it is
  // reached from — but a bargain of coin and seams moves nobody off the board,
  // and asking the question anyway would let a treaty close a seat that a
  // fixture, a scenario or a hand-edited save happened to leave empty.
  if (execution.cededCities.length > 0) updateElimination(state);
  return execution;
}

/** One lump across the table, through the treasuries and nothing else. */
function payLump(
  state: GameState,
  fromId: number,
  toId: number,
  gold: number,
  execution: DealExecution,
): void {
  if (gold <= 0) return;
  const from = playerById(state, fromId);
  const to = playerById(state, toId);
  if (!from || !to) return;
  from.gold -= gold;
  to.gold += gold;
  execution.payments.push({ fromId, toId, gold });
}

/**
 * Hands towns over, in the order the paper named them.
 *
 * The handover is the **capture machinery's own** (`handOverCity`, `combat.ts`)
 * with the combat half left behind: the flag moves, the territory follows it
 * for free (`state.tileOwner` holds city ids), the queue and the pinned
 * citizens go with the old owner's intent, and the town arrives a **puppet** —
 * consistent with a conquest, and the same decision its new owner is offered
 * there. What a treaty does not do is batter the walls, earn a triumph, raise a
 * bead or count toward anybody's conquests: nobody stormed anything.
 *
 * Routes and sightings are treated exactly as a capture treats them — which is
 * to say left alone. A caravan whose road ends in a town that has changed hands
 * is running to a foreign city, and that is as true of a ceded town as of a
 * stormed one; a rule that dropped it here and not there would be two answers
 * to one question.
 *
 * Both seats' eyes move, so both are named — `recomputeVisibilityFor`'s own
 * argument, the same one `expelFrom` makes two functions down.
 */
function cedeTowns(
  state: GameState,
  fromId: number,
  toId: number,
  cityIds: readonly number[],
  execution: DealExecution,
): void {
  let moved = false;
  for (const cityId of cityIds) {
    const city = cityById(state, cityId);
    if (!city || city.ownerId !== fromId) continue;
    handOverCity(state, city, toId);
    execution.cededCities.push({ cityId: city.id, name: city.name, fromId, toId });
    moved = true;
  }
  if (moved) recomputeVisibilityFor(state, [fromId, toId]);
}

// --- bargains outside a war -------------------------------------------------

/**
 * Why these two empires cannot bargain **at all** right now, or `null`.
 *
 * The seat half of `proposeDealError`, split out because the Diplomacy screen
 * needs exactly this and not the rest: a panel with nothing typed into it yet
 * must be able to say "you are at war with them" without also saying "there is
 * nothing on the table", which is a note about the player's own half-written
 * paper rather than about whether a table exists.
 *
 * Two of the five clauses are this system's own: a bargain is refused while
 * there is a war on (terms belong in a peace — section 4), and one paper at a
 * time, so the other side is never answering a question that has changed under
 * them.
 */
export function bargainSeatError(
  state: GameState,
  playerId: number,
  targetId: number,
): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return `No player with id ${String(playerId)}`;
  const target = playerById(state, targetId);
  if (!target) return `No player with id ${String(targetId)}`;
  if (target.id === actor.id) return 'You cannot bargain with yourself';
  if (!seatsMayBargain(state, actor.id, target.id)) {
    return 'The wild keeps no treaties — there is nobody to talk to';
  }
  if (target.eliminated) return `The ${target.name} are gone`;
  if (atWar(state, actor.id, target.id)) {
    return `You are at war with the ${target.name} — terms belong in a peace`;
  }
  if (state.dealProposals.some((row) => row.by === actor.id && row.to === target.id)) {
    return `You already have an offer standing with the ${target.name}`;
  }
  return null;
}

/**
 * Why this empire cannot put this bargain to that one, or `null` when it can.
 *
 * A proposal is a **standing, revocable paper** rather than an act, exactly as
 * a peace offer is: nothing moves until the other seat accepts, and the seat
 * that wrote it may take it back. So the gate asks who may bargain at all, and
 * then asks `dealSideError` of each half — which is where every rule about what
 * a term may contain lives, once.
 *
 * Two clauses are this verb's own:
 *
 *   · **not at war.** Terms belong in a peace while there is a war on (section
 *     4), and an ordinary bargain struck across a battle line would be a second
 *     way to write the same paper with none of the peace's consequences;
 *   · **one paper at a time.** A second standing proposal from the same seat to
 *     the same seat is refused rather than silently replacing the first, so the
 *     other side is never answering a question that has changed under them.
 */
export function proposeDealError(
  state: GameState,
  playerId: number,
  targetId: number,
  give: DealTerms,
  take: DealTerms,
): string | null {
  const seats = bargainSeatError(state, playerId, targetId);
  if (seats !== null) return seats;
  const actor = playerById(state, playerId)!;
  const target = playerById(state, targetId)!;
  if (termsAreEmpty(give) && termsAreEmpty(take)) return 'There is nothing on the table';
  const mine = dealSideError(state, actor.id, target.id, give, false);
  if (mine !== null) return mine;
  return dealSideError(state, target.id, actor.id, take, false);
}

/** Writes the proposal. Validates nothing — `proposeDealError` is the gate. */
export function proposeDealAt(
  state: GameState,
  playerId: number,
  targetId: number,
  give: DealTerms,
  take: DealTerms,
): DealProposal {
  const row: DealProposal = {
    id: allocateEntityId(state),
    by: playerId,
    to: targetId,
    give,
    take,
    turn: state.turn,
  };
  state.dealProposals.push(row);
  return row;
}

/**
 * Why this seat cannot answer that proposal, or `null` when it can.
 *
 * `accepting` decides which half of the question is asked: **declining is
 * always legal** for the seat that was asked — a paper you did not write can be
 * refused whatever has happened to the board since — while accepting
 * re-validates *both* halves from scratch. That second reading is the whole
 * point of the gate: the coin may have been spent, the mine may have been
 * pillaged, the town may have fallen, and a bargain that is no longer possible
 * must be refused rather than half-executed. Hard rule 1 read at its plainest.
 */
export function answerDealError(
  state: GameState,
  playerId: number,
  proposalId: number,
  accepting: boolean,
): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return `No player with id ${String(playerId)}`;
  const row = proposalById(state, proposalId);
  if (!row) return 'That offer is no longer on the table';
  if (row.to !== actor.id) return 'That offer was not put to you';
  if (!accepting) return null;
  if (atWar(state, row.by, row.to)) {
    const them = playerById(state, row.by)?.name ?? 'them';
    return `You are at war with the ${them} — terms belong in a peace`;
  }
  const theirs = dealSideError(state, row.by, row.to, row.give, false);
  if (theirs !== null) return theirs;
  return dealSideError(state, row.to, row.by, row.take, false);
}

/** Why this seat cannot take its own paper back, or `null`. */
export function withdrawDealError(
  state: GameState,
  playerId: number,
  proposalId: number,
): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return `No player with id ${String(playerId)}`;
  const row = proposalById(state, proposalId);
  if (!row) return 'That offer is no longer on the table';
  if (row.by !== actor.id) return 'That offer is not yours to withdraw';
  return null;
}

/** Takes a proposal off the table, whoever ended it. Validates nothing. */
export function dropProposal(state: GameState, proposalId: number): void {
  state.dealProposals = state.dealProposals.filter((row) => row.id !== proposalId);
}

/**
 * Signs a proposal: executes it, opens the row, and takes the paper off the
 * table. Validates nothing — `answerDealError` is the gate.
 *
 * The paper is dropped **first**, so nothing downstream can see a proposal and
 * the bargain it became standing at the same moment.
 */
export function acceptDealAt(state: GameState, row: DealProposal): DealExecution {
  dropProposal(state, row.id);
  return settleDealAt(state, row.by, row.to, row.give, row.take);
}

// --- suing for peace --------------------------------------------------------

/**
 * Why this empire cannot put a peace offer on the table, or `null`.
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
 *
 * **Terms are optional and change what "already standing" means** (schema 57).
 * A bare offer signs whatever paper is on the table — with nothing there, P1's
 * white peace exactly — so it is refused only when this seat has already signed.
 * An offer *with* terms is a new paper, and a new paper is always a change:
 * writing it voids every signature on the old one (`setPeaceOffer`), so it is
 * refused only when it is byte-for-byte the paper this seat already put up.
 * A peace is the one bargain where **towns may be ceded** (the ruling, 9b),
 * which is the single difference between this gate and `proposeDealError`'s.
 */
export function proposePeaceError(
  state: GameState,
  playerId: number,
  targetId: number,
  offered?: { give: DealTerms; take: DealTerms },
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
  if (offered !== undefined) {
    const mine = dealSideError(state, actor.id, target.id, offered.give, true);
    if (mine !== null) return mine;
    const theirs = dealSideError(state, target.id, actor.id, offered.take, true);
    if (theirs !== null) return theirs;
  }
  // The idempotence clause, asked last because the two above are about the
  // paper and this one is about the signature. `setPeaceOffer` answers whether
  // the write would change anything, so the gate and the writer cannot disagree
  // about what "already standing" means — it is asked of a throwaway copy of
  // the state so that a refusal leaves the board byte-identical (hard rule 1).
  if (!wouldChangePeaceOffer(state, actor.id, target.id, offered)) {
    return `Your offer to the ${target.name} already stands`;
  }
  return null;
}

/**
 * Would this offer actually change the table?
 *
 * Asked of a **copy** of the two rows the write touches rather than of the real
 * state, because `setPeaceOffer` is the one place the answer lives and hard
 * rule 1 says a refused command leaves the state byte-identical. Copying one
 * war row is cheap — there are a handful in a whole game — and the alternative
 * is a second implementation of "is this the same paper" that could drift from
 * the writer it is guarding.
 */
function wouldChangePeaceOffer(
  state: GameState,
  playerId: number,
  targetId: number,
  offered?: { give: DealTerms; take: DealTerms },
): boolean {
  const war = warBetween(state, playerId, targetId);
  if (!war) return false;
  const probe: GameState = { ...state, wars: state.wars.map((row) => ({ ...row })) };
  return setPeaceOffer(probe, playerId, targetId, true, offered);
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
  offered?: { give: DealTerms; take: DealTerms },
): void {
  setPeaceOffer(state, playerId, targetId, standing, offered);
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
 *
 * **The terms execute before any of that**, and the whole sequence is a ruling:
 * the paper is honoured while the war is still on, the war is then closed and
 * the truce written, the row (if the bargain left anything standing) is opened,
 * and only then are the armies walked home. Two of those orderings are
 * load-bearing —
 *
 *   · a **town ceded** must change hands before the expulsion, or the column
 *     standing in it would be walked out of ground its own empire is about to
 *     hold;
 *   · a **right of way** must be open before the expulsion, or a peace that
 *     bought passage would begin by sending home the very armies it just
 *     granted a road to.
 *
 * — and the third is the plain reading of what a peace deal is: you pay, and
 * then it is peace.
 */
export function settlePeace(state: GameState): PeaceOutcome[] {
  const signed = state.wars.filter(
    (war) => war.offers?.includes(war.a) === true && war.offers.includes(war.b),
  );
  const outcomes: PeaceOutcome[] = [];
  for (const war of signed) {
    const { a, b } = war;
    const paper = war.terms;
    // The terms are executed from `a`'s side, which is the register's own key
    // and not a proposer's — the paper is keyed to the pair (`PeaceTerms`), so
    // the settlement never has to know who wrote it.
    const execution = paper === undefined
      ? undefined
      : settleDealAt(state, a, b, paper.a, paper.b);
    const truceUntilTurn = closeWar(state, a, b);
    const expulsions = [...expelFrom(state, a, b), ...expelFrom(state, b, a)];
    outcomes.push({
      peace: { a, b, truceUntilTurn },
      expulsions,
      ...(execution === undefined ? {} : { execution }),
    });
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

/**
 * Has this seat **met** that one — is there anything in the world it knows them
 * by? (The user's ruling, 2026-09-03: *"the diplomacy screen should only show
 * players once you've met them (gain visibility of one of their units or their
 * land)"*.)
 *
 * **Derived, never stored.** There is no meeting register and no `met` flag on a
 * player — a flag would be a second copy of a fact the board already draws, and
 * it would have to be written at every seam an empire can be glimpsed from. So
 * this asks the four things that *are* remembered, and each one is something the
 * player can point at on their own chart:
 *
 *   · **a standing relation** — a war row, a truce, a bargain running, a paper
 *     on the table. Two empires that have signed anything have met, and this
 *     clause is the load-bearing one rather than a nicety: a seat declared upon
 *     by an empire it never scouted must still be able to open the sheet and sue
 *     for peace, and a roster that hid the declarer would hide the peace with it;
 *   · **a remembered town of theirs** (`citySightings`) — the one memory of
 *     another empire this simulation keeps, and it carries `ownerId`, which is a
 *     recognition of an empire and not merely of a place;
 *   · **their land on your chart** — a tile you have explored that their towns
 *     own now. That is exactly what the board paints for you: the territory
 *     layer draws the *current* owner on any explored hex (`TerritoryLayer`,
 *     `cities3d.ts`), so this clause says "you have seen their border" in the
 *     same words the renderer does;
 *   · **one of their pieces under your eye**, right now.
 *
 * **The stated gap.** "You once saw a unit of theirs" is not derivable: fog
 * memory remembers terrain and towns, and nothing at all remembers a column that
 * walked past a scout and walked away. A meeting made by a fleeting sighting
 * therefore lasts as long as the sighting does, unless it left one of the other
 * three marks. Closing it honestly means a stored, per-seat met set — new state,
 * a schema bump, and a save-format decision — and that is a ruling, not a patch
 * (`docs/flags.md`).
 *
 * **This is not a rule of war.** The verbs of war stay unrestricted:
 * `declareWarError` has deliberately no met-ness clause (see its docblock), and
 * a bot may know things a human has not scouted.
 *
 * It became a rule of **trade** on 2026-09-03, and that is the one gate in the
 * reducer that asks it: a route may end in a foreign town only when the two
 * empires are at peace *and have met* (`routeStartable`, `trade.ts`). The
 * clause reads the same way it does on a screen — a partner you have never run
 * into is nobody you can send a caravan to — and it is deliberately not asked
 * of a route already running, because a meeting made by a fleeting sighting can
 * lapse (the stated gap above) and a caravan must not lapse with it.
 */
export function hasMetSeat(state: GameState, playerId: number, otherId: number): boolean {
  if (playerId === otherId) return true;
  const seat = playerById(state, playerId);
  const other = playerById(state, otherId);
  if (!seat || !other) return false;

  // 1 · anything signed, offered or fought between the two.
  if (warBetween(state, playerId, otherId) !== undefined) return true;
  if (truceTurnsLeft(state, playerId, otherId) > 0) return true;
  if (dealsBetween(state, playerId, otherId).length > 0) return true;
  for (const proposal of state.dealProposals) {
    if (proposal.by === playerId && proposal.to === otherId) return true;
    if (proposal.by === otherId && proposal.to === playerId) return true;
  }

  // 2 · a town of theirs this seat remembers, under whatever flag it last flew.
  for (const sighting of state.citySightings[playerId] ?? []) {
    if (sighting.ownerId === otherId) return true;
  }

  // 3 · one of their pieces standing where this seat can see it now.
  for (const unit of state.units) {
    if (unit.ownerId !== otherId) continue;
    if (isVisibleTo(state, playerId, unit.col, unit.row)) return true;
  }

  // 4 · their border on this seat's chart. A map-wide loop asks the field (the
  // standing rule), hoisted here for the one sweep it lives in.
  const grid = state.visibility[playerId];
  if (!grid) return false;
  const owners = tileOwnerField(state);
  for (let index = 0; index < grid.length; index++) {
    if ((grid[index] ?? HIDDEN) === HIDDEN) continue;
    if (owners.at(index) === otherId) return true;
  }
  return false;
}

/**
 * Every empire at the table this seat has met, in seat order.
 *
 * `diplomaticSeats` narrowed by `hasMetSeat` — the register a *screen* draws,
 * where `diplomaticSeats` stays the register of who exists. Two readings rather
 * than one filter written twice.
 */
export function metSeats(state: GameState, playerId: number): number[] {
  return diplomaticSeats(state, playerId).filter((id) => hasMetSeat(state, playerId, id));
}
