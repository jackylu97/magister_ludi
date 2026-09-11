/**
 * **The leaders' draft**: the row a figure puts in front of its seat when that
 * seat's own age turns, the one command that answers it, and what a taken card
 * pays.
 *
 * `docs/leaders.md` "The draft" is the rule and `docs/flags.md` (dddd) is the
 * ruling: three cards — a passive, a boon and a unique — when **you** enter an
 * age, take one, the other two are gone. The row itself is `data/leaders.json`
 * (`leaderData.ts`); this file is only the verbs.
 *
 * **There is no draw.** Every other offer in this game deals from `state.rng` —
 * an Order's hand, a god's, a wager's three — and this one does not, because a
 * leader's row for an age is written on the figure's own sheet and is the same
 * three cards every game. That is the whole reason `Player.leaderOffer` carries
 * ids rather than an index into a shared table (`WagerDeal`'s decision the other
 * way round, and its docblock says why), and it is why nothing here touches the
 * generator: a leader draft cannot move a seed.
 *
 * **The offer is a sweep, not a hook** — `reviewLegacies`' shape one system over
 * (`greatPeople.ts`). "This seat has entered an age it has not been dealt a row
 * for" is a *fact* about the board rather than a moment somebody has to
 * remember to announce, so a sweep cannot miss one: a seat that somehow crossed
 * two ages in a turn is dealt the earlier row first and the later one after it
 * has answered, and a seat that never picks is simply still owed.
 *
 * **Æra I is dealt with the board.** The opening row is written in `newGame`
 * (`state.ts`), not here, because a seat owes its first decision on turn one and
 * there is no end-of-turn before that. `state.ts` is the base module every other
 * one imports, so it reads `leaderData.ts` — a leaf — and writes the offer
 * itself rather than importing this file and closing a load-time cycle. The
 * announcement is this file's from Æra II on; the first row arrives with the
 * world, before there is a turn to announce it in.
 */

import { payWindfall, awardBeadOccasion } from './beads';
import type { BeadAward } from './beads';
import { payGrants } from './cities';
import type { CompletionGrantReport } from './cities';
import {
  LEADER_DECK_AGES,
  type LeaderCard,
  type LeaderCardId,
  type LeaderId,
  deckAgeOf,
  leaderCard,
  leaderDef,
} from './leaderData';
import {
  type GameState,
  type LeaderOffer,
  type Player,
  capitalCityOf,
  playerById,
  realPlayers,
} from './state';
import { bumpEconomy } from './slate';
import { forgetTheLaw, refitSlots } from './statecraft';
import { TECH_AGES, type TechAge, highestAge } from './techData';

/**
 * The three cards this figure's sheet deals in this age, in the sheet's own
 * order: the passive, the boon, the unique.
 *
 * The one composition of a row, read by the opener here and by `newGame`'s
 * opening deal — so the first row a seat is shown and every row after it are the
 * same three-card shape from the same table.
 */
export function leaderRowFor(
  leader: LeaderId,
  age: TechAge,
): [LeaderCardId, LeaderCardId, LeaderCardId] {
  const row = leaderDef(leader).deck[deckAgeOf(age)];
  return [row[0].id, row[1].id, row[2].id];
}

/**
 * The lowest age this seat has reached and not yet answered, or `null` when it
 * owes nothing.
 *
 * **Lowest, not highest**, and that is the sweep's whole discipline: a seat that
 * researched its way from Æra II into Æra III in one resolution is dealt Æra
 * II's row first and Æra III's on the sweep after it has answered, so no row of
 * a figure's deck is ever skipped by moving quickly. `highestAge` is the one
 * reading of a seat's own era (`techData.ts`) and this is its only new caller.
 */
export function leaderAgeOwed(player: Player): TechAge | null {
  if (player.leader === undefined) return null;
  const reached = highestAge(player.techsResearched);
  for (const age of TECH_AGES) {
    if (age > reached) break;
    if (player.leaderPicks?.[age] === undefined) return age;
  }
  return null;
}

/**
 * Opens the row a seat is owed, or answers `null` when it is owed none.
 *
 * Idempotent, which is what lets it be swept: a seat already holding an
 * unanswered row keeps the one it has — `periodicOffer`'s precedent word for
 * word, because an offer is a decision the player owes the game and a second one
 * dealt on top of it would destroy the first.
 */
export function openLeaderOfferFor(state: GameState, player: Player): LeaderOffer | null {
  if (player.barbarian || player.eliminated) return null;
  if (player.leaderOffer !== undefined) return null;
  const leader = player.leader;
  if (leader === undefined) return null;
  const age = leaderAgeOwed(player);
  if (age === null) return null;
  const offer: LeaderOffer = { age, cards: leaderRowFor(leader, age), turn: state.turn };
  player.leaderOffer = offer;
  return offer;
}

/** What one resolution of the `leaders` phase had to say. See `runLeaderDraft`. */
export interface LeaderDraftReport {
  /** Every seat dealt a row this resolution, and which age's. */
  opened: { playerId: number; age: TechAge }[];
  /** Whatever the announcement minted. Empty today; the register is `beads.ts`. */
  beads: BeadAward[];
}

/**
 * **The `leaders` phase**: deal every row that is owed, and announce each.
 *
 * It skips the wild for `runStatecraft`'s reason — the wild plays no figure and
 * is dealt nothing — and it announces through `awardBeadOccasion`, which is how
 * every other occasion in this game reaches the deed tables and the Abacus. No
 * row triggers on `leaderOffered` today; the announcement is here so that one
 * may, and so the moment exists to be watched.
 */
export function runLeaderDraft(state: GameState, turn?: { beads: BeadAward[] }): LeaderDraftReport {
  const report: LeaderDraftReport = { opened: [], beads: [] };
  for (const player of realPlayers(state)) {
    const offer = openLeaderOfferFor(state, player);
    if (offer === null) continue;
    report.opened.push({ playerId: player.id, age: offer.age });
    report.beads.push(...awardBeadOccasion(state, player.id, 'leaderOffered'));
  }
  // The turn's own report is filled here rather than by the phase's entry, for
  // `runWagers`' reason: a phase that hands its findings back through a closure
  // in `turn.ts` writes them from a function that is about something else, and
  // the register of announced writes reads the function a write is *in*.
  if (turn) turn.beads.push(...report.beads);
  return report;
}

/**
 * Does this seat still owe its figure an answer? **The End Turn blocker's rule.**
 *
 * In the simulation rather than in `turnBlockers.ts` for `wagerBlocker`'s reason
 * exactly: the interface decides what a button *does* about a debt and the
 * simulation decides what counts as one, so a bot reads the same sentence a
 * screen does.
 *
 * Unlike the wager's, it does **not** expire. A wager's three are dealt to the
 * whole world in one window and the phase fills an empty chair at the end of it;
 * a leader's row is one seat's own and nobody else is waiting on it, so it
 * stands until it is answered — the four offers' rule rather than the fifth's.
 * There is no default pick for the same reason: a card taken is a card held for
 * the rest of the game, and quietly choosing one for an absent player would be
 * the one thing a draft must never do.
 */
export function leaderBlocker(state: GameState, playerId: number): LeaderOffer | null {
  const player = playerById(state, playerId);
  if (!player || player.barbarian || player.eliminated) return null;
  if (player.leaderOffer === undefined) return null;
  // **And not until there is a realm to speak to.** Æra I's row is on the table
  // from the first turn, before a settler has stopped walking, and three of the
  // six figures' opening boons hand over something a *town* receives — a
  // prophet standing outside the gates, two more citizens in the seat. A pick
  // taken before the capital exists would pay those into nothing and say so
  // with a `done: false` nobody asked for.
  //
  // So the debt waits on the founding rather than the boon being bent to work
  // without one: the row is dealt with the board, the blocker holds its tongue
  // until the first town is raised, and `chooseLeaderCardError` refuses a pick
  // in the meantime — one rule, asked by the screen and the reducer both. In
  // an ordinary game that is the same turn, a few clicks apart.
  if (capitalCityOf(state, playerId) === undefined) return null;
  return player.leaderOffer;
}

/**
 * Why this seat may not take that card, or `null` when it may.
 *
 * **The** gate, asked twice by design (`chooseWagerError`'s discipline): the
 * sheet greys what the reducer would refuse, and the bot filters its options
 * through this so it can never propose a command the reducer turns down.
 */
export function chooseLeaderCardError(
  state: GameState,
  playerId: number,
  index: number,
): string | null {
  const player = playerById(state, playerId);
  if (!player || player.barbarian) return 'The wild plays no figure';
  if (player.eliminated) return 'This empire is no longer in the game';
  const offer = player.leaderOffer;
  if (!offer) return 'Your leader has nothing to offer you';
  // `leaderBlocker`'s second clause, said as a sentence. A realm with no town is
  // a realm a boon has nowhere to land in; the row waits, it is not lost.
  if (capitalCityOf(state, playerId) === undefined) {
    return 'Found your first city before your leader speaks';
  }
  if (!Number.isInteger(index) || index < 0 || index >= offer.cards.length) {
    return 'That is not one of the cards on the table';
  }
  return null;
}

/** What a pick did, for the toast and for `CommandResult`. */
export interface LeaderPickOutcome {
  card: LeaderCard;
  age: TechAge;
  /** The boon's things, said the way a wonder's completion says them. */
  grants: CompletionGrantReport[];
  /**
   * True when the boon's lump actually landed somewhere.
   *
   * A **fact and not a figure**: what the lump was is written on the card and
   * the screen reads it there, and `payWindfall` already answers the only
   * question a caller cannot work out for itself — whether there was anywhere
   * for it to go (a realm with no town takes no citizen). `false` for a card
   * whose boon is a grant, or none at all.
   */
  paidLump: boolean;
}

/**
 * Takes one of the three. **The reducer's whole body for `chooseLeaderCard`.**
 *
 * Validated by `chooseLeaderCardError` before a byte moves (hard rule 1), and
 * the three things it does are in the one order that keeps them honest: the pick
 * is written, the offer is spent, and only then is the boon paid — so a boon
 * that grows the town, opens a draft or hands over a piece is settled on a board
 * whose law already carries the card that paid for it.
 *
 * **The other two are gone**, which is what spending the offer means: there is
 * no record of what was not taken, because a row is the figure's own and can be
 * read off its sheet at any time.
 */
export function chooseLeaderCardAt(
  state: GameState,
  playerId: number,
  index: number,
): LeaderPickOutcome | null {
  if (chooseLeaderCardError(state, playerId, index) !== null) return null;
  const player = playerById(state, playerId);
  const offer = player?.leaderOffer;
  if (!player || !offer) return null;
  const id = offer.cards[index];
  if (id === undefined) return null;

  const picks = player.leaderPicks ?? {};
  picks[offer.age] = id;
  player.leaderPicks = picks;
  delete player.leaderOffer;
  // **The law changed under this call**, and the boon below is paid on the far
  // side of it: a lump of hammers may finish a building, a citizen may re-seat a
  // town, and both of those read a law that now carries the card that paid for
  // them. `realiseItem`'s own note is the precedent, and `forgetTheLaw`'s
  // docblock is the register of every seam that does this.
  forgetTheLaw(state);
  // **And the council is re-fitted under the law that just changed** (batch
  // L3a): a card may open a chair (`CardSlotRiderEffect`), and a chair is a fact
  // about `PlayerStatecraft.slots` rather than a figure four readers add up — so
  // the array has to grow the moment the card is taken, on the far side of
  // `forgetTheLaw` so the reading includes the card that paid for it. A resize
  // and not an adoption's rebuild: nothing the player already arranged moves.
  refitSlots(state, player);
  bumpEconomy(state);

  const card = leaderCard(id);
  const outcome: LeaderPickOutcome = { card, age: offer.age, grants: [], paidLump: false };
  const boon = card.boon;
  if (boon !== undefined) {
    if (boon.windfall !== undefined) {
      outcome.paidLump = payWindfall(state, player, boon.windfall);
    }
    // Through the wonder's own grant seam, so a piece a figure hands over is
    // minted, reported and refused by exactly the machinery that mints, reports
    // and refuses a Statue of Zeus' swordsman. A realm with no seat to put it in
    // is handed nothing, which `payGrants` already says with `done: false`.
    const seat = capitalCityOf(state, player.id);
    if (seat && (boon.grants ?? []).length > 0) {
      outcome.grants = payGrants(state, seat, boon.grants ?? []);
    }
  }
  return outcome;
}

/**
 * The cards this seat holds, in the order it took them.
 *
 * Walked through `TECH_AGES` and never through `leaderPicks`' own keys (hard
 * rule 2): the law folds a seat's passives in age order, and object key order is
 * not an order this game is allowed to depend on.
 */
export function heldLeaderCards(player: Player): LeaderCardId[] {
  const held: LeaderCardId[] = [];
  const picks = player.leaderPicks;
  if (!picks) return held;
  for (const age of TECH_AGES) {
    const id = picks[age];
    if (id !== undefined) held.push(id);
  }
  return held;
}

/** Every row of this figure's deck, flattened in sheet order. For the book. */
export function leaderDeckCards(leader: LeaderId): LeaderCard[] {
  return LEADER_DECK_AGES.flatMap((age) => [...leaderDef(leader).deck[age]]);
}
