/**
 * The Diplomacy screen: every empire in the world, where you stand with each,
 * and everything you may do about it.
 *
 * The sixth full-screen overlay and the fourth parchment one, and it is
 * deliberately the Trade sheet's sibling rather than a new language: same bones
 * (`.sc-*`), the same keyboard contract — and since batch H5 the same *frame*,
 * `modalShell.ts`, where `hidden` is the whole of the screen state, the ×,
 * Escape and a press on the ground arrive at one `close`, and opening closes
 * whatever else was up — and the same rule that every write is a **command**.
 *
 * The user's ruling of 2026-09-03 put it here rather than in a seat-strip
 * popover: *"lets have it be a new menu, it can sit alongside the statecraft/
 * religion icons"* — so the third door on the HUD dock opens this.
 *
 * The roster, and the table beside it
 * -----------------------------------
 * A seat's card says exactly one of three things — at peace, at war since a
 * named turn, or bound by a truce with a countdown — and choosing it puts that
 * empire's **table** in the pane beside the roster. The table is the shape the
 * user asked for on 2026-09-03 (*"steal inspiration from civ and make our trade
 * screen a bit more similar"*): what you may offer on the left, what they may
 * offer on the right, and the paper being written between them, with the verbs
 * that change the relation itself over the top and the standing papers and
 * running bargains under it.
 *
 * That replaced a panel that unfolded *inside* a row. The old shape's argument
 * was that a bargain is a fact about one relationship — which is still true, and
 * is now said by the roster's selection instead of by nesting: one empire is on
 * the table at a time, and the two columns get the width a treaty needs. What
 * the old shape could not do at all was show a player the paper they were
 * building; the middle column is that.
 *
 * There is no relation *meter* and no opinion: v1 has none
 * (`docs/war-diplomacy.md`, section 6), and a screen that implied one would be
 * promising a system nobody has built.
 *
 * Only empires you have met
 * -------------------------
 * The other half of the same ruling: an empire appears here once you have seen
 * its land, its town or its pieces — or signed something with it. That reading
 * is `hasMetSeat` in `src/sim/diplomacy.ts`, derived from what the fog already
 * remembers and stored nowhere, and this sheet applies it through
 * `metDiplomacyRows`. It is a **UI gate**, exactly as `localPlayerId` is: the
 * reducer refuses nothing on met-ness, because a bot may know things a human has
 * not scouted.
 *
 * Nothing here is a new rule
 * --------------------------
 * Every sentence comes out of the simulation. `declareWarError` greys the
 * Declare button and is the same string the reducer refuses with;
 * `truceTurnsLeft` gives the countdown; `warBetween` gives the turn a war
 * opened and who has offered peace. A greyed button is therefore a command the
 * reducer would refuse, and an offered one is a command it takes — the bargain
 * every screen in this interface keeps.
 *
 * Declaring carries a confirm
 * ---------------------------
 * The one irreversible thing on the sheet (a truce means you cannot take it
 * back for ten turns), and the ruling asks for the step by name. It goes
 * through `confirmCard.ts` — this interface's own card, never `window.confirm`
 * — handed in as `askConfirm` so this module needs no opinion about where the
 * card lives.
 *
 * The pure half of this file is everything above `createDiplomacyScreen`, for
 * `figures.ts`' reason: this suite has no jsdom, and the half of a panel that
 * can be *quietly wrong* — which relation a row claims, which verb it offers,
 * what the sentence says — has to be a function somebody can call.
 */

import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';
import {
  answerDealError,
  bargainSeatError,
  declareWarError,
  declinePeaceError,
  diplomaticSeats,
  hasMetSeat,
  openBordersError,
  proposePeaceError,
  withdrawDealError,
  withdrawPeaceError,
} from '../sim/diplomacy';
import { hasPeaceOffer, peaceTermsOn, truceTurnsLeft, warBetween } from '../sim/wars';
import {
  type DealTerms,
  dealTurnsLeft,
  dealsBetween,
  otherSeatOf,
  sideGivenBy,
  sideTakenBy,
  termsAreEmpty,
} from '../sim/deals';
import { capitalCityOf, controlledHoldings, resourceCopies } from '../sim/cities';
import { type ResourceId, resourceDef } from '../sim/resourceData';
import { figure } from './figures';
import type { ConfirmRequest } from './confirmCard';
import { element } from './dom';
import { createModalShell } from './modalShell';

// --- the row model ----------------------------------------------------------

/** Where two empires stand. Exactly one of three, and they are exclusive. */
export type RelationKind = 'peace' | 'war' | 'truce';

/**
 * One empire's row, as the sheet reads it.
 *
 * Everything a row draws is here and nothing is recomputed in the DOM half —
 * the split this file's docblock states. `declareError` and `peaceError` are
 * the reducer's own sentences, `null` when the verb is legal, which is what
 * makes "greyed with a reason" and "offered" one decision rather than two.
 */
export interface DiplomacyRow {
  playerId: number;
  name: string;
  /** The seat's ink, for the swatch. Never interpreted — see `heraldryFor`. */
  color: string;
  relation: RelationKind;
  /** "At peace" · "At war since turn 41" · "Truce — 7 turns". */
  status: string;
  /** Turn the war opened, for a war row; `null` otherwise. */
  since: number | null;
  /** Turns of truce left, for a truce row; zero otherwise. */
  truceLeft: number;
  /** This seat has a standing white-peace offer out to them. */
  weOffered: boolean;
  /** They have one standing to us — the half a player most needs to see. */
  theyOffered: boolean;
  /** Why Declare War is refused, or `null` when it is offered. */
  declareError: string | null;
  /** Why the peace offer (or its withdrawal) is refused, or `null`. */
  peaceError: string | null;
  /** Bargains running with them right now — the roster's own clock. */
  bargains: number;
  /** Papers standing on the table between you, written by either hand. */
  papers: number;
  /**
   * You have met them: seen their land, their town or their pieces, or signed
   * something with them (`hasMetSeat`, `src/sim/diplomacy.ts`).
   *
   * On the row rather than a filter of its own, so the sheet's register
   * (`metDiplomacyRows`) is one reading of this list and not a second rule.
   */
  met: boolean;
}

/**
 * Every empire this seat may have a relation with, in seat order.
 *
 * `diplomaticSeats` is the register of who is at the table (`diplomacy.ts`) —
 * the wild and the fallen are not — so this file has no roster filter of its
 * own, which is `realPlayers`' rule read from the interface's side.
 *
 * The status sentence is built here and only here, so the row, the toast and
 * any future chronicle line cannot drift about what "at war since" means.
 */
export function diplomacyRows(state: GameState, seat: number): DiplomacyRow[] {
  const rows: DiplomacyRow[] = [];
  for (const id of diplomaticSeats(state, seat)) {
    const player = playerById(state, id);
    if (!player) continue;
    const war = warBetween(state, seat, id);
    const truceLeft = truceTurnsLeft(state, seat, id);
    const relation: RelationKind = war ? 'war' : truceLeft > 0 ? 'truce' : 'peace';
    rows.push({
      playerId: id,
      name: player.name,
      color: player.color,
      relation,
      status: relationSentence(relation, war?.declaredTurn ?? null, truceLeft),
      since: war?.declaredTurn ?? null,
      truceLeft,
      weOffered: hasPeaceOffer(state, seat, id),
      theyOffered: hasPeaceOffer(state, id, seat),
      declareError: declareWarError(state, seat, id),
      peaceError: hasPeaceOffer(state, seat, id)
        ? withdrawPeaceError(state, seat, id)
        : proposePeaceError(state, seat, id),
      bargains: dealsBetween(state, seat, id).length,
      papers: state.dealProposals.filter(
        (paper) =>
          (paper.by === seat && paper.to === id) || (paper.by === id && paper.to === seat),
      ).length,
      met: hasMetSeat(state, seat, id),
    });
  }
  return rows;
}

/**
 * The rows the **sheet** draws: every empire this seat has met.
 *
 * The user's ruling, 2026-09-03 — an empire you have never seen is not on the
 * screen. One line rather than a filter written into the DOM half, because it is
 * exactly the kind of decision a panel can be quietly wrong about (this file's
 * docblock), and `diplomacyRows` stays the whole world so a test, a chronicle or
 * a spectator's feed can still read a relation nobody has met.
 *
 * A **UI gate and only that**, the way `localPlayerId` is: the reducer refuses
 * nothing on met-ness (`declareWarError`), and a bot may know what a human has
 * not scouted.
 */
export function metDiplomacyRows(state: GameState, seat: number): DiplomacyRow[] {
  return diplomacyRows(state, seat).filter((row) => row.met);
}

/**
 * The second line on a roster card: the one thing about this relation a player
 * must not have to open the row to find out.
 *
 * In the order a player would want to be told, and never more than one: their
 * standing peace offer first (it is the button that ends a war), then a paper
 * waiting for an answer, then a bargain quietly running. No figures — the counts
 * are drawn as their own marks beside the name (hard rule 7).
 */
export function rosterNote(row: DiplomacyRow): string | null {
  if (row.relation === 'war' && row.theyOffered && !row.weOffered) {
    return 'They have offered peace.';
  }
  if (row.papers > 0) return 'A paper waits on the table.';
  if (row.bargains > 0) return 'A bargain is running.';
  return null;
}

/**
 * "At peace" · "At war since turn 41" · "Truce — 7 turns".
 *
 * One function so the row and the button's tooltip say the same thing, and the
 * turn is printed as a *figure* (tabular mono) because every number on every
 * surface in this game is (the specimen's rule).
 */
export function relationSentence(
  relation: RelationKind,
  since: number | null,
  truceLeft: number,
): string {
  if (relation === 'war') {
    return since === null ? 'At war' : `At war since turn ${figure(since)}`;
  }
  if (relation === 'truce') {
    return truceLeft === 1 ? 'Truce — one turn left' : `Truce — ${figure(truceLeft)} turns left`;
  }
  return 'At peace';
}

/**
 * What the peace button says on a row.
 *
 * Four faces, and the fourth is the one that matters: when *they* have offered
 * and you have not, the button is the thing that ends the war. It says so.
 */
export function peaceButtonLabel(row: DiplomacyRow): string {
  if (row.relation !== 'war') return 'Offer peace';
  if (row.weOffered) return 'Withdraw offer';
  return row.theyOffered ? 'Accept peace' : 'Offer peace';
}

/**
 * The line under a war row that says what the offers on it add up to.
 *
 * The whole of the peace mechanism said in a player's own terms: an offer is a
 * standing flag, and the **second signature ends the war** there and then
 * (§12). It is the one place the screen has to explain a rule rather than
 * report a fact, so it is written once, here, and tested.
 *
 * The first line is deliberately kept even though two flags standing on a live
 * war is now something only an older save can show: a sentence that would be
 * wrong about such a save is worse than one that is rarely drawn.
 */
export function offerSentence(row: DiplomacyRow): string | null {
  if (row.relation !== 'war') return null;
  if (row.weOffered && row.theyOffered) return 'Both sides have signed — the war ends this turn.';
  if (row.theyOffered) return 'They have offered peace.';
  if (row.weOffered) return 'Your offer stands. The war ends the moment they sign it.';
  return null;
}

// --- the deal panel's model -------------------------------------------------

/**
 * One thing a side may put on the table, as the panel offers it.
 *
 * A row is drawn **whether or not it is offerable** and carries its own reason
 * when it is not — this interface's rule everywhere a gate exists, and the one
 * that makes a deal panel teachable: a player who cannot see that open borders
 * exist until both empires can write will never find out that they do.
 */
export interface DealChoice {
  /** The luxury's own id, for a luxury row; absent on the others. */
  id?: ResourceId;
  /** The town's own id, for a city row; absent on the others. */
  cityId?: number;
  /** "Silk", "Open borders", "Uruk". */
  label: string;
  /** "spare" on a duplicate luxury, "seat of government" on a refused town. */
  note: string | null;
  /** Why this cannot be put on the table, or `null` when it can. */
  error: string | null;
}

/** What one column of the panel offers — one empire's side of the bargain. */
export interface DealSideModel {
  playerId: number;
  name: string;
  /** Coin in the treasury: the ceiling on a lump, and printed as one. */
  gold: number;
  /** Every luxury this empire holds, in the resource table's own order. */
  luxuries: DealChoice[];
  /** The right of way, with the technology named when it is refused. */
  openBorders: DealChoice;
  /** Towns that may be ceded. Empty unless a peace is being written. */
  cities: DealChoice[];
}

/** A standing paper, as both seats' screens draw it. */
export interface DealProposalRow {
  id: number;
  /** True when this seat wrote it — the Withdraw face rather than Accept. */
  mine: boolean;
  /** "You offer the Crimson Banner", "The Crimson Banner offer you". */
  heading: string;
  /** What the proposer hands over, one plain line each. */
  give: string[];
  /** What the proposer asks for. */
  take: string[];
  /** Why Accept is refused, or `null`. Always `null` on your own paper. */
  acceptError: string | null;
  /** Why Withdraw is refused, or `null`. Only asked of your own paper. */
  withdrawError: string | null;
}

/** A live bargain and what is left of it. */
export interface ActiveDealRow {
  id: number;
  /** The other empire's name. */
  name: string;
  /** What this seat hands over under it. */
  give: string[];
  /** What this seat receives. */
  take: string[];
  /** Turns still to run. Absolute expiry — nothing counts down (`deals.ts`). */
  turnsLeft: number;
}

/** Everything the Deal panel draws for one empire's row. */
export interface DealPanelModel {
  /** True when this row is a war, so the paper is a peace paper. */
  peace: boolean;
  yours: DealSideModel;
  theirs: DealSideModel;
  proposals: DealProposalRow[];
  active: ActiveDealRow[];
  /**
   * The terms standing on this **war**, when somebody has written any.
   *
   * A peace paper does not live in the proposals register — it rides on the war
   * row (`WarState.terms`), because a peace is agreed by two signatures rather
   * than by an acceptance — so it is drawn from here rather than from
   * `proposals`, and it is the thing the row's own "Accept peace" button would
   * be signing. A player pressing that button without being shown this would be
   * signing a paper they cannot read.
   */
  peacePaper: {
    /** True when this seat wrote it. */
    mine: boolean;
    /** "You offer the Bors" · "The Bors offer you". */
    heading: string;
    /** What this seat hands over under it. */
    give: string[];
    /** What this seat receives. */
    take: string[];
    /**
     * Why their envoy cannot be sent home, or `null` when he can
     * (`declinePeaceError`). Always a sentence about *their* offer: your own
     * paper is taken back with the peace button's Withdraw face instead.
     */
    declineError: string | null;
  } | null;
  /** Why nothing may be proposed at all right now, or `null`. */
  blocked: string | null;
}

/**
 * The whole Deal panel for one row, out of the simulation's own gates.
 *
 * The pure half's largest function, and it exists for this file's stated
 * reason: what a panel can be *quietly* wrong about is which side may offer
 * what, and every one of those decisions is a sentence somebody already wrote
 * in `diplomacy.ts`. `openBordersError` greys the right of way and names the
 * technology; `dealSideError` — asked here one term at a time, through a probe
 * proposal — greys a luxury an empire has already lent away; `answerDealError`
 * greys Accept. Nothing on this panel is a rule of its own.
 *
 * **Towns appear only on a war row**, because a city changes hands in a peace
 * deal and nowhere else (the ruling, 9b). A seat of government never appears at
 * all, on either side, which is the same clause said where a player can see it.
 */
export function dealPanel(state: GameState, seat: number, targetId: number): DealPanelModel {
  const war = warBetween(state, seat, targetId) !== undefined;
  const yours = dealSide(state, seat, targetId, war);
  const theirs = dealSide(state, targetId, seat, war);
  const proposals: DealProposalRow[] = [];
  for (const row of state.dealProposals) {
    const mine = row.by === seat && row.to === targetId;
    const theirsToUs = row.by === targetId && row.to === seat;
    if (!mine && !theirsToUs) continue;
    const byName = playerById(state, row.by)?.name ?? 'an empire';
    const toName = playerById(state, row.to)?.name ?? 'an empire';
    proposals.push({
      id: row.id,
      mine,
      heading: mine ? `You offer the ${toName}` : `The ${byName} offer you`,
      give: termLines(state, row.give),
      take: termLines(state, row.take),
      acceptError: mine ? null : answerDealError(state, seat, row.id, true),
      withdrawError: mine ? withdrawDealError(state, seat, row.id) : null,
    });
  }
  const active: ActiveDealRow[] = [];
  for (const deal of dealsBetween(state, seat, targetId)) {
    const other = otherSeatOf(deal, seat);
    active.push({
      id: deal.id,
      name: playerById(state, other ?? targetId)?.name ?? 'an empire',
      give: termLines(state, sideGivenBy(deal, seat)),
      take: termLines(state, sideTakenBy(deal, seat)),
      turnsLeft: dealTurnsLeft(state, deal),
    });
  }
  const standing = peaceTermsOn(state, seat, targetId);
  const them = playerById(state, targetId)?.name ?? 'an empire';
  return {
    peace: war,
    yours,
    theirs,
    proposals,
    active,
    peacePaper:
      standing === null
        ? null
        : {
            mine: standing.by === seat,
            heading: standing.by === seat ? `You offer the ${them}` : `The ${them} offer you`,
            give: termLines(state, sideOfPeace(standing, seat, targetId)),
            take: termLines(state, sideOfPeace(standing, targetId, seat)),
            declineError: declinePeaceError(state, seat, targetId),
          },
    // The one sentence the panel says about itself: whether these two may
    // bargain at all. `bargainSeatError` is the seat half of the reducer's own
    // gate and nothing else — a note about the half-written paper below ("there
    // is nothing on the table") belongs on the button, not on the panel.
    blocked: war ? null : bargainSeatError(state, seat, targetId),
  };
}

/**
 * Which half of a peace paper belongs to a seat.
 *
 * `PeaceTerms` is keyed by the **war row's** own two ids, not by proposer and
 * answerer, so the reading is "which of the pair am I" and the low id is `a`.
 * One function so the panel and any later chronicle line agree about whose
 * promise is whose.
 */
function sideOfPeace(
  terms: { a: DealTerms; b: DealTerms },
  seat: number,
  other: number,
): DealTerms {
  return seat < other ? terms.a : terms.b;
}

/** One column of the panel. See `dealPanel`. */
function dealSide(
  state: GameState,
  giverId: number,
  receiverId: number,
  war: boolean,
): DealSideModel {
  const giver = playerById(state, giverId);
  const luxuries: DealChoice[] = [];
  for (const holding of controlledHoldings(state, giverId, 'luxury')) {
    const copies = resourceCopies(state, giverId, holding.id);
    luxuries.push({
      id: holding.id,
      label: resourceDef(holding.id).name,
      // A **spare** is what the panel marks, not what it enforces: an empire
      // may lend its only copy and simply hand the contentment across, which is
      // the ruling. The mark is there so a player can see which lending costs
      // them nothing.
      note: copies > 1 ? 'spare' : null,
      // A seam already lent away is not in `controlledHoldings` at all, so
      // there is nothing here to grey — the list *is* the gate.
      error: null,
    });
  }
  const cities: DealChoice[] = [];
  if (war) {
    const capital = capitalCityOf(state, giverId);
    for (const city of state.cities) {
      if (city.ownerId !== giverId) continue;
      cities.push({
        cityId: city.id,
        label: city.name,
        note: capital?.id === city.id ? 'seat of government' : null,
        error:
          capital?.id === city.id
            ? `${city.name} is a seat of government and cannot be given`
            : null,
      });
    }
  }
  return {
    playerId: giverId,
    name: giver?.name ?? 'an empire',
    gold: giver?.gold ?? 0,
    luxuries,
    openBorders: {
      label: 'Open borders',
      note: null,
      error: openBordersError(state, giverId, receiverId),
    },
    cities,
  };
}

/**
 * One half of a bargain, as plain lines a player reads.
 *
 * The one place terms become words, so the standing proposal, the live bargain
 * and any later chronicle line cannot drift about what a paper says. Nothing
 * folded: a bargain is a list of promises and a player is entitled to read them
 * one at a time.
 *
 * A town is named rather than numbered, and a town that is no longer on the
 * board — ceded on, razed — reads as "a town", which is the honest answer for a
 * paper written about a place that has gone.
 */
export function termLines(state: GameState, terms: DealTerms): string[] {
  const lines: string[] = [];
  const gold = terms.gold ?? 0;
  if (gold > 0) lines.push(`${figure(gold)} gold`);
  const perTurn = terms.goldPerTurn ?? 0;
  if (perTurn > 0) lines.push(`${figure(perTurn)} gold a turn`);
  for (const id of terms.luxuries ?? []) lines.push(resourceDef(id).name);
  if (terms.openBorders === true) lines.push('Open borders');
  for (const cityId of terms.cities ?? []) {
    lines.push(state.cities.find((city) => city.id === cityId)?.name ?? 'a town');
  }
  if (lines.length === 0) lines.push('Nothing');
  return lines;
}

/**
 * What the button under the two columns says.
 *
 * Three faces, and the middle one is the whole of the peace-with-terms rule
 * said in a player's own words: on a war row this button writes the *peace*
 * paper, not an ordinary bargain, and a player who does not know that will
 * wonder where their treaty went.
 */
export function dealButtonLabel(model: DealPanelModel, empty: boolean): string {
  if (empty) return 'Nothing on the table';
  return model.peace ? 'Offer this peace' : 'Offer this bargain';
}

/**
 * The sentence under the active-bargain list.
 *
 * The one thing a player has to be told rather than shown: a bargain runs for a
 * fixed span and then simply stops, and a declaration ends it early. Said once,
 * at the foot, for the reason the sheet's own standing sentence is.
 */
export function dealFootSentence(): string {
  return (
    'A bargain runs for a set number of turns and then lapses on its own; anything lent comes ' +
    'home and any tribute stops. Declaring war on an empire ends every bargain with it at once.'
  );
}

// --- the audience -----------------------------------------------------------

/**
 * **What the envoy said**, as this sheet prints it.
 *
 * The interface's own shape rather than the bot's `BotDecision`, and that is
 * this file's standing bargain read one system further: the sheet never imports
 * the AI, so `main.ts` asks `answerAudience` and hands the answer down as
 * plain words. What arrives here is a sentence and its reasons — both of them
 * the bot's own, never rewritten — and one flag, because "they signed" and
 * "they sent it back" are drawn differently and a screen that had to parse a
 * sentence to tell them apart would eventually parse it wrong.
 */
export interface EnvoyAnswer {
  /** True when the answer was yes: the bargain is signed, or the peace is. */
  accepted: boolean;
  /** The envoy's sentence — the bot's own summary of what it decided. */
  sentence: string;
  /** The reasons under it, one plain line each. The bot's own terms. */
  reasons: string[];
}

/**
 * **What this empire would sign**, as the two counter questions bring it back.
 *
 * `terms` is written from *your* side, exactly as the draft is (`DealDraft`),
 * so the sheet writes it straight in and the player may edit it before sending
 * it. `refusal` is the seat's own sentence when it will not treat at all, which
 * is a different answer from "there is no paper that would do it" and is said
 * differently (`counterNote`).
 */
export interface CounterAnswer {
  terms: { give: DealTerms; take: DealTerms } | null;
  /** The bot's reasons for the counter, one plain line each. */
  reasons: string[];
  /** The seat's own sentence when it refuses to treat, or `null`. */
  refusal: string | null;
}

/** Which of the two questions was put to them. See `counterNote`. */
export type CounterQuestion = 'work' | 'give';

/**
 * The sentence under a counter that brought nothing back.
 *
 * Two answers a player must not confuse: an empire that **will not treat**
 * (§12's winning-war clause) has said something about the war, and an empire
 * that brought no terms has said something about the table. The seat's own
 * words win when it has any, because a sentence out of the simulation is always
 * better than one written here.
 */
export function counterNote(answer: CounterAnswer, question: CounterQuestion): string | null {
  if (answer.refusal !== null) return answer.refusal;
  if (answer.terms !== null) return null;
  return question === 'work'
    ? 'Nothing you hold would make this work.'
    : 'There is nothing they would give for this.';
}

/**
 * The lines the middle column draws under a counter: what changed on the paper,
 * in the seat's own terms.
 *
 * The terms come back as the bot's arithmetic and are printed as they are —
 * this is the one place a player can see *why* the number moved, and a screen
 * that summarised it would be a screen making the bot's argument for it.
 */
export function counterLines(answer: CounterAnswer, question: CounterQuestion): string[] {
  const note = counterNote(answer, question);
  if (note !== null) return [note];
  return answer.reasons;
}

/**
 * The envoy's sentence and the reasons under it, in the order they are drawn.
 *
 * One function so the middle column and any later chronicle line cannot drift
 * about what the answer was. Nothing is added: the sheet says what the bot said.
 */
export function envoyLines(answer: EnvoyAnswer): string[] {
  return [answer.sentence, ...answer.reasons];
}

/** The confirm card a declaration raises. See the module docblock. */
export function declareConfirm(name: string): ConfirmRequest {
  return {
    title: `Declare war on the ${name}?`,
    body:
      'Your armies may enter their land and strike their people, and theirs may do the same. ' +
      'Every caravan running between you comes home. Peace can only be made if they agree to it.',
    confirmLabel: 'Declare war',
    cancelLabel: 'Keep the peace',
  };
}

// --- the sheet --------------------------------------------------------------

export interface DiplomacyScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /** Sends `declareWar`. The screen never mutates state itself. */
  declareWar: (targetId: number) => void;
  /**
   * Sends `proposePeace` or `withdrawPeace` — `standing` says which.
   *
   * `offered` is the paper, when the player wrote one: absent means the P1
   * offer, which signs whatever is already on the table (`setPeaceOffer`).
   */
  offerPeace: (
    targetId: number,
    standing: boolean,
    offered?: { give: DealTerms; take: DealTerms },
  ) => void;
  /** Sends `proposeDeal`. The screen never mutates state itself. */
  proposeDeal: (targetId: number, give: DealTerms, take: DealTerms) => void;
  /** Sends `acceptDeal` or `declineDeal` — `accept` says which. */
  answerDeal: (dealId: number, accept: boolean) => void;
  /**
   * Sends `declinePeace`: their envoy goes home, and the paper with him.
   *
   * `offerPeace`'s third face rather than a fourth argument to it, because it
   * is a different sentence about a different flag — that one writes and takes
   * back *your* offer, this one refuses *theirs*.
   */
  declinePeace: (targetId: number) => void;
  /**
   * **The audience** (`docs/war-diplomacy.md` §12): the paper just sent is put
   * to the empire it was sent to, and their answer comes back at once.
   *
   * `null` when nobody answered — a human seat across the table, a paper that
   * is no longer there — and then the paper simply stands, which is what it has
   * always done. Handed in rather than reached for, exactly as `askConfirm` is:
   * the answer is the bot's and this file has never heard of the bot.
   *
   * `dealId` names a standing bargain; absent means the peace paper, which has
   * no id of its own (it rides on the war row).
   */
  askAudience?: (targetId: number, dealId?: number) => EnvoyAnswer | null;
  /**
   * *"What would make this work?"* and its mirror — a **pure read**, and
   * nothing is sent: the terms come back and are written into the draft, where
   * the player may edit them before proposing.
   *
   * The question is the paper (see `counterTerms`): terms that ask for
   * something are "what would make this work", and terms that ask for nothing
   * are "what would you give for this".
   */
  askCounter?: (targetId: number, give: DealTerms, take: DealTerms) => CounterAnswer | null;
  /** Sends `withdrawDeal`. */
  withdrawDeal: (dealId: number) => void;
  /** Raises the interface's own confirm card. See `confirmCard.ts`. */
  askConfirm: (request: ConfirmRequest, run: () => void) => void;
  onOpen?: () => void;
}

export interface DiplomacyScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  dispose(): void;
}

function button(className: string, label: string): HTMLButtonElement {
  const node = element('button', className, label) as HTMLButtonElement;
  node.type = 'button';
  return node;
}

/**
 * One empire's half of a paper being written, kept between redraws.
 *
 * The panel's only state, and it is deliberately **the interface's own**: a
 * draft is not a command, nothing in the simulation has heard of it, and it
 * lives exactly as long as the sheet does. It is held per empire, so a player
 * who writes half a bargain, looks at another seat's row and comes back finds
 * their paper where they left it — `draw()` replaces every child on every
 * refresh, and a draft that lived in the DOM would be swept away by the
 * acceptance of an unrelated bargain.
 */
interface DealDraft {
  give: DealTerms;
  take: DealTerms;
}

/** A whole number off a field, floored at nothing. Never `NaN`. */
function readAmount(value: string): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function createDiplomacyScreen(options: DiplomacyScreenOptions): DiplomacyScreen {
  const { overlay, body, closeButton, trigger } = options;

  /** The half-written papers, one per empire, by seat id. See `DealDraft`. */
  const drafts = new Map<number, DealDraft>();

  /**
   * Which empire's table the right-hand pane is showing.
   *
   * A fact about *this* opening, exactly as the Trade sheet's chooser and sort
   * are: a sheet opened tomorrow starts on the first empire on the roster rather
   * than on whoever the player last argued with.
   */
  let selectedId: number | null = null;

  /**
   * **The last thing the empire across the table said**, and which empire said
   * it — the audience's whole state.
   *
   * Per opening, and one at a time: an envoy's answer is about the paper that
   * was just sent, so a second paper replaces it and a different empire's table
   * does not show it at all. It is not a draft — nothing here outlives the
   * sheet, because a sentence about a board that has since moved is a sentence
   * that has quietly become false.
   */
  let envoy: { seatId: number; answer: EnvoyAnswer } | null = null;
  /** The counter last brought back, and which question brought it. */
  let counter: { seatId: number; question: CounterQuestion; answer: CounterAnswer } | null = null;

  function draftFor(playerId: number): DealDraft {
    let draft = drafts.get(playerId);
    if (!draft) {
      draft = { give: {}, take: {} };
      drafts.set(playerId, draft);
    }
    return draft;
  }

  /** The empire the pane is drawing: the chosen one, or the first on the sheet. */
  function chosenRow(rows: DiplomacyRow[]): DiplomacyRow | null {
    return rows.find((row) => row.playerId === selectedId) ?? rows[0] ?? null;
  }

  /** A small counted mark — a figure and what it counts. Never a sentence. */
  function countMark(count: number, label: string): HTMLElement {
    const chip = element('span', 'diplo-mark');
    chip.append(element('span', 'diplo-mark-figure', figure(count)));
    chip.append(element('span', 'diplo-mark-label', label));
    return chip;
  }

  /**
   * One empire's card in the roster: the swatch and the name, where you stand,
   * and the one thing about the relation a player must not have to click to
   * find out (`rosterNote`).
   *
   * A button rather than an article, because the roster's whole job in the new
   * shape is to choose whose table is on the right — the Civ trade sheet's
   * bones, where the seat you are treating with is picked once and the paper is
   * written beside it, instead of a bargain unfolding inside a row and pushing
   * every other empire down the page.
   */
  function drawSeatCard(row: DiplomacyRow, active: boolean): HTMLElement {
    const card = button(`diplo-seat is-${row.relation}${active ? ' is-active' : ''}`, '');
    card.setAttribute('aria-pressed', String(active));

    const head = element('span', 'diplo-row-head');
    const swatch = element('span', 'diplo-swatch');
    swatch.style.background = row.color;
    swatch.setAttribute('aria-hidden', 'true');
    head.append(swatch);
    head.append(element('span', 'diplo-name', row.name));
    head.append(element('span', 'diplo-status', row.status));
    card.append(head);

    const note = rosterNote(row);
    if (note !== null) card.append(element('span', 'hint diplo-note', note));

    if (row.papers > 0 || row.bargains > 0) {
      const marks = element('span', 'diplo-marks');
      if (row.papers > 0) marks.append(countMark(row.papers, 'on the table'));
      if (row.bargains > 0) marks.append(countMark(row.bargains, 'running'));
      card.append(marks);
    }

    card.addEventListener('click', () => {
      selectedId = row.playerId;
      // What one empire said is about one table: choosing another empire's puts
      // the last answer away rather than leaving it to be found again later.
      envoy = null;
      counter = null;
      draw();
    });
    return card;
  }

  /**
   * The left column: every empire this seat has **met**, and nobody else.
   *
   * `metDiplomacyRows` is the whole of that gate (the user's ruling,
   * 2026-09-03) and it is a reading rather than a rule — see its docblock.
   */
  function drawRoster(rows: DiplomacyRow[], chosen: DiplomacyRow | null): HTMLElement {
    const column = element('section', 'sc-column diplo-column');
    column.append(element('p', 'eyebrow sc-eyebrow', 'the world'));

    const scroller = element('div', 'sc-column-body');
    if (rows.length === 0) {
      scroller.append(
        element(
          'p',
          'sc-none',
          'You have met nobody yet. Send somebody out to look: an empire whose land, ' +
            'town or people you find appears here.',
        ),
      );
    }
    for (const row of rows) {
      scroller.append(drawSeatCard(row, row.playerId === chosen?.playerId));
    }
    column.append(scroller);

    // The sheet's one standing sentence: what a war costs and what a peace
    // takes. Said once at the foot rather than on every row, for the Trade
    // sheet's reason — a rule repeated per row is a rule the eye skips.
    const foot = element('div', 'diplo-foot');
    foot.append(
      element(
        'p',
        'hint',
        'At peace your soldiers may not enter another empire’s land, and may not strike ' +
          'its people or burn its works. A war opens both. A peace closes them again and walks ' +
          'every army home.',
      ),
    );
    column.append(foot);
    return column;
  }

  /**
   * The head of the right pane: whose table this is, and the two verbs that
   * change the relation itself.
   *
   * A refused verb is **drawn and disabled with its reason on the hover**
   * rather than hidden, which is this interface's rule everywhere a gate exists
   * (the Trade sheet's greyed rows, the city panel's greyed buys): a button
   * that vanishes is a rule a player cannot learn.
   */
  function drawTableHead(row: DiplomacyRow): HTMLElement {
    const head = element('header', `diplo-head is-${row.relation}`);

    const titles = element('div', 'diplo-head-titles');
    const line = element('p', 'diplo-head-line');
    const swatch = element('span', 'diplo-swatch');
    swatch.style.background = row.color;
    swatch.setAttribute('aria-hidden', 'true');
    line.append(swatch);
    line.append(element('span', 'diplo-head-name', row.name));
    titles.append(line);
    titles.append(element('p', 'diplo-head-status', row.status));
    head.append(titles);

    const verbs = element('div', 'diplo-row-verbs');

    const declare = button('btn btn-quiet btn-tiny', 'Declare war');
    if (row.declareError !== null) {
      declare.disabled = true;
      declare.title = row.declareError;
    } else {
      declare.title = `Open a war with the ${row.name}`;
      declare.addEventListener('click', () => {
        options.askConfirm(declareConfirm(row.name), () => {
          options.declareWar(row.playerId);
          draw();
        });
      });
    }
    verbs.append(declare);

    const peace = button(
      row.theyOffered && !row.weOffered ? 'btn btn-primary btn-tiny' : 'btn btn-quiet btn-tiny',
      peaceButtonLabel(row),
    );
    if (row.peaceError !== null) {
      peace.disabled = true;
      peace.title = row.peaceError;
    } else {
      const standing = !row.weOffered;
      peace.title = standing
        ? 'Put a standing offer of peace on the table'
        : 'Take your offer back off the table';
      peace.addEventListener('click', () => {
        options.offerPeace(row.playerId, standing);
        // A peace put up is a paper like any other, and it is answered at once
        // (§12). Taking one back is not a question, so nobody is asked.
        if (standing) askAudienceFor(row.playerId, true);
        draw();
      });
    }
    verbs.append(peace);
    head.append(verbs);
    return head;
  }

  /**
   * The right pane: one empire's table, in three columns.
   *
   * The shape the user asked for (2026-09-03: *"steal inspiration from civ and
   * make our trade screen a bit more similar"*): what you may offer on the left,
   * what they may offer on the right, and **the paper being written between
   * them** — which is the half the old panel did not draw at all. A player
   * ticking boxes in two columns could not read back what they had built until
   * they had sent it.
   *
   * Every greyed control carries the simulation's own sentence on its hover
   * (`dealPanel`), and every write is a command handed out through `options` —
   * this file never touches the state, which is the bargain
   * `diplomacyScreen.test.ts` pins by reading the source.
   */
  function drawTable(row: DiplomacyRow | null): HTMLElement {
    const pane = element('div', 'sc-pane diplo-table');
    if (row === null) {
      pane.append(element('p', 'sc-none', 'There is nobody to bargain with yet.'));
      return pane;
    }
    const state = options.getState();
    const seat = options.getPlayerId();
    const model = dealPanel(state, seat, row.playerId);
    const draft = draftFor(row.playerId);

    pane.append(drawTableHead(row));
    const note = offerSentence(row);
    if (note !== null) pane.append(element('p', 'hint diplo-note', note));

    const board = element('div', 'diplo-board');
    board.append(drawSide(model, model.yours, draft, 'give', 'You offer'));
    board.append(drawMiddle(state, model, draft, row));
    board.append(drawSide(model, model.theirs, draft, 'take', `The ${row.name} offer`));
    pane.append(board);

    pane.append(drawPapers(model, row));
    pane.append(element('p', 'hint diplo-note', dealFootSentence()));
    return pane;
  }

  /** A titled block inside one side of the table. */
  function group(title: string): HTMLElement {
    const block = element('section', 'diplo-group');
    block.append(element('p', 'eyebrow diplo-group-head', title));
    return block;
  }

  /**
   * One side of the table: everything that empire may put on it, in the order a
   * treaty is read out — coin, then seams, then rights, then towns.
   *
   * Every group is drawn even when it is empty, and an empty one says why. A
   * column that dropped its own headings would be a different shape on every
   * relation, and a player could never learn where to look for a thing.
   */
  function drawSide(
    model: DealPanelModel,
    side: DealSideModel,
    draft: DealDraft,
    half: 'give' | 'take',
    heading: string,
  ): HTMLElement {
    const terms = draft[half];
    const column = element('div', 'diplo-side');

    const head = element('div', 'diplo-side-head');
    head.append(element('span', 'diplo-side-name', heading));
    head.append(element('span', 'diplo-side-purse', `${figure(side.gold)} in hand`));
    column.append(head);

    const coin = group('coin');
    coin.append(
      amountField('Gold', terms.gold ?? 0, (value) => {
        // Presence is the state on a term, exactly as it is in the register:
        // a zero is *deleted* rather than written, so a paper with nothing on
        // this line is the empty object it would have been.
        if (value > 0) terms.gold = value;
        else delete terms.gold;
      }),
    );
    coin.append(
      amountField('Gold a turn', terms.goldPerTurn ?? 0, (value) => {
        if (value > 0) terms.goldPerTurn = value;
        else delete terms.goldPerTurn;
      }),
    );
    column.append(coin);

    const seams = group('luxuries');
    if (side.luxuries.length === 0) {
      seams.append(element('p', 'hint diplo-none', 'Nothing spare to send.'));
    }
    for (const choice of side.luxuries) {
      const id = choice.id;
      if (id === undefined) continue;
      seams.append(
        checkRow(choice, (terms.luxuries ?? []).includes(id), (on) => {
          const held = (terms.luxuries ?? []).filter((held) => held !== id);
          if (on) held.push(id);
          if (held.length > 0) terms.luxuries = held;
          else delete terms.luxuries;
        }),
      );
    }
    column.append(seams);

    const rights = group('rights');
    rights.append(
      checkRow(side.openBorders, terms.openBorders === true, (on) => {
        if (on) terms.openBorders = true;
        else delete terms.openBorders;
      }),
    );
    column.append(rights);

    const towns = group('towns');
    if (!model.peace) {
      towns.append(element('p', 'hint diplo-none', 'Towns change hands only in a peace.'));
    } else if (side.cities.length === 0) {
      towns.append(element('p', 'hint diplo-none', 'There is no town to give.'));
    }
    for (const choice of side.cities) {
      const cityId = choice.cityId;
      if (cityId === undefined) continue;
      towns.append(
        checkRow(choice, (terms.cities ?? []).includes(cityId), (on) => {
          const held = (terms.cities ?? []).filter((kept) => kept !== cityId);
          if (on) held.push(cityId);
          if (held.length > 0) terms.cities = held;
          else delete terms.cities;
        }),
      );
    }
    column.append(towns);
    return column;
  }

  /**
   * The middle column: the paper as it stands, and the button that sends it.
   *
   * `termLines` is the same function the standing papers and the running
   * bargains are printed with, so what a player reads while writing a bargain is
   * word for word what the other seat will read when it lands.
   */
  function drawMiddle(
    state: GameState,
    model: DealPanelModel,
    draft: DealDraft,
    row: DiplomacyRow,
  ): HTMLElement {
    const middle = element('div', 'diplo-middle');
    middle.append(element('p', 'eyebrow diplo-group-head', 'on the table'));

    const paper = element('article', 'diplo-paper is-draft');
    paper.append(drawHalf('You give', termLines(state, draft.give)));
    paper.append(drawHalf(`The ${row.name} give`, termLines(state, draft.take)));
    middle.append(paper);

    const empty = termsAreEmpty(draft.give) && termsAreEmpty(draft.take);
    const send = button('btn btn-primary btn-tiny', dealButtonLabel(model, empty));
    if (model.blocked !== null) {
      send.disabled = true;
      send.title = model.blocked;
    } else if (empty) {
      send.disabled = true;
      send.title = 'Put something on the table first';
    } else {
      send.addEventListener('click', () => {
        if (model.peace) options.offerPeace(row.playerId, true, { give: draft.give, take: draft.take });
        else options.proposeDeal(row.playerId, draft.give, draft.take);
        draft.give = {};
        draft.take = {};
        // **The answer, at once** (§12). The paper has just been logged, so the
        // empire it was put to is asked before anything else happens — which is
        // the whole of the audience: a player who proposes gets an answer while
        // they are still standing at the table.
        askAudienceFor(row.playerId, model.peace);
        draw();
      });
    }
    middle.append(send);

    middle.append(drawCounterVerbs(model, draft, row));

    // Clearing is the interface's own verb and the only one on this sheet that
    // is: the draft is not a command and nothing in the simulation has heard of
    // it, so taking it back off the table asks nobody's permission.
    if (!empty) {
      const clear = button('btn btn-quiet btn-tiny', 'Clear the table');
      clear.addEventListener('click', () => {
        draft.give = {};
        draft.take = {};
        draw();
      });
      middle.append(clear);
    }

    if (envoy !== null && envoy.seatId === row.playerId) {
      const card = element(
        'article',
        `diplo-paper is-envoy${envoy.answer.accepted ? ' is-live' : ''}`,
      );
      card.append(
        element(
          'p',
          'diplo-paper-head',
          envoy.answer.accepted ? `The ${row.name} agree` : `The ${row.name} send it back`,
        ),
      );
      for (const line of envoyLines(envoy.answer)) card.append(element('p', 'hint', line));
      middle.append(card);
    }

    if (counter !== null && counter.seatId === row.playerId) {
      const card = element('article', 'diplo-paper is-envoy');
      card.append(
        element(
          'p',
          'diplo-paper-head',
          counter.answer.terms === null
            ? `The ${row.name} answer`
            : `The ${row.name} would sign this`,
        ),
      );
      for (const line of counterLines(counter.answer, counter.question)) {
        card.append(element('p', 'hint', line));
      }
      middle.append(card);
    }

    if (model.peace) {
      middle.append(
        element(
          'p',
          'hint diplo-note',
          'These terms become the peace. Writing new terms takes back whatever either of you ' +
            'had already signed. A peace ends the war the moment you have both signed it.',
        ),
      );
    }
    return middle;
  }

  /**
   * The two questions a player may put to the empire across the table before
   * they send anything (§12).
   *
   * Both are **pure reads**: nothing is proposed, the answer is written into the
   * draft, and the player sends it — or edits it first, which is the whole point
   * of writing it into the draft rather than onto a card of its own.
   *
   * Each is greyed with its own reason when it has nothing to ask about, this
   * interface's rule everywhere a gate exists: a button that vanishes is a rule
   * a player cannot learn.
   */
  function drawCounterVerbs(
    model: DealPanelModel,
    draft: DealDraft,
    row: DiplomacyRow,
  ): HTMLElement {
    const verbs = element('div', 'diplo-row-verbs');
    const offering = !termsAreEmpty(draft.give);
    const anything = offering || !termsAreEmpty(draft.take);

    const work = button('btn btn-quiet btn-tiny', 'What would make this work?');
    if (model.blocked !== null) {
      work.disabled = true;
      work.title = model.blocked;
    } else if (!anything && !model.peace) {
      work.disabled = true;
      work.title = 'Put something on the table first';
    } else {
      work.title = `Ask the ${row.name} what would make this paper work`;
      work.addEventListener('click', () => {
        askCounterFor(row.playerId, draft, 'work');
        draw();
      });
    }
    verbs.append(work);

    const gift = button('btn btn-quiet btn-tiny', 'What would you give for this?');
    if (model.blocked !== null) {
      gift.disabled = true;
      gift.title = model.blocked;
    } else if (!offering) {
      // The question is "for this", and there has to be a *this*: the paper it
      // asks about offers something and asks for nothing (`counterTerms`).
      gift.disabled = true;
      gift.title = 'Offer something first';
    } else {
      gift.title = `Ask the ${row.name} what they would give for what you offer`;
      gift.addEventListener('click', () => {
        askCounterFor(row.playerId, draft, 'give');
        draw();
      });
    }
    verbs.append(gift);
    return verbs;
  }

  /**
   * Puts the paper that was just sent to the empire it was sent to.
   *
   * The bargain has an id and the peace paper has none — it rides on the war row
   * (`wars.ts`) — so the id is looked up here, off the register, rather than
   * being remembered from the command: the reducer allocates it, and reading it
   * back is the one way this file can be sure it is naming the paper that
   * actually landed.
   */
  function askAudienceFor(targetId: number, peace: boolean): void {
    envoy = null;
    counter = null;
    const ask = options.askAudience;
    if (ask === undefined) return;
    if (peace) {
      const answer = ask(targetId);
      if (answer !== null) envoy = { seatId: targetId, answer };
      return;
    }
    const seat = options.getPlayerId();
    const papers = options
      .getState()
      .dealProposals.filter((paper) => paper.by === seat && paper.to === targetId);
    const paper = papers[papers.length - 1];
    if (!paper) return;
    const answer = ask(targetId, paper.id);
    if (answer !== null) envoy = { seatId: targetId, answer };
  }

  /**
   * Asks one of the two counter questions and writes what comes back into the
   * draft.
   *
   * *"What would you give for this?"* is the same read with **nothing asked
   * for**: the paper put to them offers what you have written and asks for
   * nothing, and they answer with their own side. That is how `counterTerms`
   * tells the two questions apart, and it is why this sends `{}` rather than a
   * flag.
   */
  function askCounterFor(targetId: number, draft: DealDraft, question: CounterQuestion): void {
    envoy = null;
    counter = null;
    const ask = options.askCounter;
    if (ask === undefined) return;
    const answer = ask(targetId, draft.give, question === 'give' ? {} : draft.take);
    if (answer === null) return;
    counter = { seatId: targetId, question, answer };
    if (answer.terms !== null) {
      draft.give = answer.terms.give;
      draft.take = answer.terms.take;
    }
  }

  /** One half of the paper in the middle: a heading and its promises. */
  function drawHalf(heading: string, lines: string[]): HTMLElement {
    const half = element('div', 'diplo-half');
    half.append(element('p', 'diplo-half-head', heading));
    const list = element('ul', 'diplo-half-lines');
    for (const line of lines) list.append(element('li', 'diplo-half-line', line));
    half.append(list);
    return half;
  }

  /**
   * The papers under the table: the peace being signed, whatever either seat has
   * proposed, and the bargains already running with their clocks.
   *
   * The peace paper comes first when there is one: it is what the row's own
   * "Accept peace" button would be signing, and a player must be able to read it
   * before they press that.
   */
  function drawPapers(model: DealPanelModel, row: DiplomacyRow): HTMLElement {
    const block = element('section', 'diplo-papers');
    block.append(element('p', 'eyebrow diplo-group-head', 'the papers'));

    if (model.peacePaper !== null) {
      const paper = element('article', 'diplo-paper');
      paper.append(element('p', 'diplo-paper-head', model.peacePaper.heading));
      paper.append(element('p', 'hint', `You give: ${model.peacePaper.give.join(' · ')}`));
      paper.append(element('p', 'hint', `You receive: ${model.peacePaper.take.join(' · ')}`));
      paper.append(
        element(
          'p',
          'hint',
          model.peacePaper.mine
            ? 'Your terms stand. The war ends the moment they sign them.'
            : 'Answer these terms with the peace button above, write your own on the table, ' +
              'or send their envoy home.',
        ),
      );
      // The third answer, and the one a peace offer never had: a paper put to
      // you may be **refused**, which takes it off the table (§12). Only theirs
      // — your own is taken back with the peace button's Withdraw face.
      if (!model.peacePaper.mine) {
        const verbs = element('div', 'diplo-row-verbs');
        const send = button('btn btn-quiet btn-tiny', 'Send them home');
        if (model.peacePaper.declineError !== null) {
          send.disabled = true;
          send.title = model.peacePaper.declineError;
        } else {
          send.title = `Refuse the ${row.name}' terms and take them off the table`;
          send.addEventListener('click', () => {
            options.declinePeace(row.playerId);
            envoy = null;
            counter = null;
            draw();
          });
        }
        verbs.append(send);
        paper.append(verbs);
      }
      block.append(paper);
    }
    for (const proposal of model.proposals) block.append(drawProposal(proposal));
    for (const deal of model.active) block.append(drawActiveDeal(deal));

    if (model.peacePaper === null && model.proposals.length === 0 && model.active.length === 0) {
      block.append(
        element('p', 'hint diplo-none', `Nothing stands between you and the ${row.name}.`),
      );
    }
    return block;
  }

  /** A labelled whole-number field. Writes on every keystroke; never redraws. */
  function amountField(
    label: string,
    value: number,
    write: (amount: number) => void,
  ): HTMLElement {
    const wrap = element('label', 'diplo-field');
    wrap.append(element('span', 'diplo-field-label', label));
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.value = value > 0 ? String(value) : '';
    input.className = 'diplo-field-input';
    // No redraw on input, deliberately: rebuilding the sheet under a cursor is
    // how a number field loses focus mid-figure. The draft is read when the
    // button is pressed, and the button's own greying is refreshed then.
    input.addEventListener('input', () => {
      write(readAmount(input.value));
    });
    wrap.append(input);
    return wrap;
  }

  /**
   * One tick-box row, drawn **and disabled with its reason** when the term is
   * refused — the greyed-button rule this whole interface keeps.
   */
  function checkRow(
    choice: DealChoice,
    checked: boolean,
    write: (on: boolean) => void,
  ): HTMLElement {
    const wrap = element('label', 'diplo-check');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked && choice.error === null;
    if (choice.error !== null) {
      input.disabled = true;
      wrap.title = choice.error;
    } else {
      input.addEventListener('change', () => {
        write(input.checked);
        draw();
      });
    }
    wrap.append(input);
    wrap.append(element('span', 'diplo-check-label', choice.label));
    if (choice.note !== null) wrap.append(element('span', 'diplo-check-note', choice.note));
    return wrap;
  }

  /** A standing paper, with the verbs that answer it. */
  function drawProposal(proposal: DealProposalRow): HTMLElement {
    const card = element('article', 'diplo-paper');
    card.append(element('p', 'diplo-paper-head', proposal.heading));
    card.append(element('p', 'hint', `They receive: ${proposal.take.join(' · ')}`));
    card.append(element('p', 'hint', `You receive: ${proposal.give.join(' · ')}`));
    const verbs = element('div', 'diplo-row-verbs');
    if (proposal.mine) {
      const take = button('btn btn-quiet btn-tiny', 'Withdraw');
      if (proposal.withdrawError !== null) {
        take.disabled = true;
        take.title = proposal.withdrawError;
      } else {
        take.addEventListener('click', () => {
          options.withdrawDeal(proposal.id);
          draw();
        });
      }
      verbs.append(take);
    } else {
      const accept = button('btn btn-primary btn-tiny', 'Accept');
      if (proposal.acceptError !== null) {
        accept.disabled = true;
        accept.title = proposal.acceptError;
      } else {
        accept.addEventListener('click', () => {
          options.answerDeal(proposal.id, true);
          draw();
        });
      }
      verbs.append(accept);
      const decline = button('btn btn-quiet btn-tiny', 'Decline');
      decline.addEventListener('click', () => {
        options.answerDeal(proposal.id, false);
        draw();
      });
      verbs.append(decline);
    }
    card.append(verbs);
    return card;
  }

  /** A bargain already running, and what is left of it. */
  function drawActiveDeal(deal: ActiveDealRow): HTMLElement {
    const card = element('article', 'diplo-paper is-live');
    card.append(
      element(
        'p',
        'diplo-paper-head',
        deal.turnsLeft === 1
          ? 'In force — one turn left'
          : `In force — ${figure(deal.turnsLeft)} turns left`,
      ),
    );
    card.append(element('p', 'hint', `You give: ${deal.give.join(' · ')}`));
    card.append(element('p', 'hint', `You receive: ${deal.take.join(' · ')}`));
    return card;
  }

  function draw(): void {
    // The shell never paints a sheet that is down (`refresh` guards, `open`
    // shows first), and every gesture below only exists while it is up.
    const state = options.getState();
    const seat = options.getPlayerId();
    body.replaceChildren();

    // Only the empires this seat has met (the ruling). The roster and the table
    // read the same list, so the pane can never be drawing a relation the
    // column beside it is hiding.
    const rows = metDiplomacyRows(state, seat);
    const chosen = chosenRow(rows);
    selectedId = chosen?.playerId ?? null;

    // The split is an element *inside* the sheet's body rather than the body
    // itself — the Trade and Statecraft sheets' own shape, and not a stylistic
    // echo: `.statecraft-body` is a column, and a `.sc-split` worn by the body
    // would inherit that and stack the two panes.
    const split = element('div', 'sc-split');
    split.append(drawRoster(rows, chosen));
    split.append(drawTable(chosen));
    body.append(split);
  }

  /**
   * The frame (`modalShell.ts`) — `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`, and the
   * disposer is the game's.
   *
   * What it hangs on the shell is the Trade sheet's rule for its own chooser:
   * **which empire was on the table is a fact about this opening**, so a sheet
   * opened tomorrow starts at the top of the roster. The half-written papers are
   * not — a draft is the player's own work and outlives the screen.
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    draw,
    onClose: () => {
      selectedId = null;
      envoy = null;
      counter = null;
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
