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
 * Layout B with the strip of courts (Quiet Table, fourth pass)
 * -------------------------------------------------------------
 * The user approved layout B, "the large portrait", with the strip of courts
 * ("love this, great"; `docs/plans/ui-critique-2026-10-16.md`, and the frames
 * `frame-2-strip` and `frame-2-drawer` in
 * `docs/plans/mockups/scholars-study/quiet-table-fourth-pass/`). The sheet has
 * three parts, left to right:
 *
 * - the strip of courts: one small mark for each other empire at the table,
 *   with a dot for war and a dot for an offer that waits. It scrolls when the
 *   courts do not fit, so eleven courts fit the sheet at any size;
 * - the chosen court's portrait window (3:4, `leaderPortraitNode`), with its
 *   name and standing over the foot, and the slip with the court's last words;
 * - the desk: the act tabs, one tray a side with what it can give as chips,
 *   "On the table" (the deal, one column a side, each clause with a × that
 *   takes it back), the two questions, and the foot with Declare war, the
 *   "Standing and deals" button and Propose.
 *
 * "Standing and deals" opens a drawer over the desk. It lists where you stand,
 * the deals in force, the offers waiting for your answer and your own offers
 * (`standingAndDeals`). An offer of theirs opens on the table, with Accept,
 * Decline and "Change the terms" in place of the two questions.
 *
 * There is no relation *meter* and no opinion: v1 has none
 * (`docs/war-diplomacy.md`, section 6), and a screen that implied one would be
 * promising a system nobody has built.
 *
 * Only empires you have met
 * -------------------------
 * The other half of the same ruling: you can choose a court once you have seen
 * its land, its town or its pieces, or signed something with it. That reading
 * is `hasMetSeat` in `src/sim/diplomacy.ts`, and this sheet applies it through
 * `courtStrip`. A court you have not met is on the strip as a blank, faded
 * mark, so the count of courts is plain, but its name, its colours and its
 * charge stay off the sheet and it cannot be chosen. It is a **UI gate**,
 * exactly as `localPlayerId` is: the reducer refuses nothing on met-ness,
 * because a bot may know things a human has not scouted.
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

import { leaderBannerInk } from '../art/leaderBanners';
import type { GameState } from '../sim/state';
import { playerById } from '../sim/state';
import { seatName, seatPeople } from '../sim/leaderData';
import {
  answerDealError,
  bargainSeatError,
  dealSideError,
  declareWarError,
  declinePeaceError,
  diplomaticSeats,
  hasMetSeat,
  openBordersError,
  proposePeaceError,
  type WarConsequences,
  warConsequences,
  withdrawDealError,
  withdrawPeaceError,
} from '../sim/diplomacy';
import { hasPeaceOffer, peaceTermsOn, truceTurnsLeft, warBetween } from '../sim/wars';
import {
  type DealTerms,
  bordersOpenTo,
  dealIsOngoing,
  dealTurnsLeft,
  dealsBetween,
  otherSeatOf,
  sideGivenBy,
  sideTakenBy,
  termsAreEmpty,
} from '../sim/deals';
import {
  lendableCopies,
  availableCopies,
  capitalCityOf,
  controlledHoldings,
  resourceCopies,
} from '../sim/cities';
import { lentCopiesToPlayer, loanedResources } from '../sim/deals';
import { type ResourceId, resourceDef, resourceIsVisibleTo } from '../sim/resourceData';
import { techDef } from '../sim/techData';
import { RULES } from '../sim/rulesData';
import { figure } from './figures';
import type { ConfirmRequest } from './confirmCard';
import { element } from './dom';
import { leaderFaces, leaderPortraitNode } from './leaderSelect';
import { createModalShell } from './modalShell';
import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { seatInks } from '../art/seatInks';
import { type CourtMarkId, COURT_MARKS, courtMarkDataUri } from '../art/courtMarks';
import { resourceMarkNode } from './resourceMark';
import './diplomacyScreen.css';

// --- the row model ----------------------------------------------------------

/** Where two empires stand. Exactly one of three, and they are exclusive. */
type RelationKind = 'peace' | 'war' | 'truce';

/**
 * One empire's row, as the sheet reads it.
 *
 * Everything a row draws is here and nothing is recomputed in the DOM half —
 * the split this file's docblock states. `declareError` and `peaceError` are
 * the reducer's own sentences, `null` when the verb is legal, which is what
 * makes "greyed with a reason" and "offered" one decision rather than two.
 */
interface DiplomacyRow {
  playerId: number;
  /** Who sits there: the figure, or the ink's name for a seat under nobody. */
  name: string;
  /**
   * What their country is called — the word the sentences below put after
   * "the". Two fields rather than one because a card names a person and a
   * sentence names a nation (`seatName` / `seatPeople`, `docs/flags.md` (ppppp)).
   */
  people: string;
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
  /** What a declaration would end, read off the sim (`warConsequences`). */
  war: WarConsequences;
  /** Why the peace offer (or its withdrawal) is refused, or `null`. */
  peaceError: string | null;
  /** Bargains running with them right now — the roster's own clock. */
  bargains: number;
  /** Papers standing on the table between you, written by either hand. */
  papers: number;
  /**
   * Offers from them waiting for this seat's answer: their bargains put to
   * you, and their standing peace (batch SS6). The envelope on the rail.
   */
  waiting: number;
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
      name: seatName(state, id),
      people: seatPeople(state, id),
      color: player.color,
      relation,
      status: relationSentence(relation, war?.declaredTurn ?? null, truceLeft),
      since: war?.declaredTurn ?? null,
      truceLeft,
      weOffered: hasPeaceOffer(state, seat, id),
      theyOffered: hasPeaceOffer(state, id, seat),
      declareError: declareWarError(state, seat, id),
      war: warConsequences(state, seat, id),
      peaceError: hasPeaceOffer(state, seat, id)
        ? withdrawPeaceError(state, seat, id)
        : proposePeaceError(state, seat, id),
      bargains: dealsBetween(state, seat, id).length,
      papers: state.dealProposals.filter(
        (paper) =>
          (paper.by === seat && paper.to === id) || (paper.by === id && paper.to === seat),
      ).length,
      waiting:
        state.dealProposals.filter((paper) => paper.by === id && paper.to === seat).length +
        (hasPeaceOffer(state, id, seat) && !hasPeaceOffer(state, seat, id) ? 1 : 0),
      met: hasMetSeat(state, seat, id),
    });
  }
  return rows;
}

/**
 * The courts the sheet lets a player choose: every empire this seat has met.
 * The strip of courts (`courtStrip`) shows the others too, as blank marks
 * that say nothing about who they are; this list and the strip's chosen
 * courts are the same rows.
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

// --- the deal panel's model -------------------------------------------------

/**
 * One thing a side may put on the table, as the panel offers it.
 *
 * A row is drawn **whether or not it is offerable** and carries its own reason
 * when it is not — this interface's rule everywhere a gate exists, and the one
 * that makes a deal panel teachable: a player who cannot see that open borders
 * exist until both empires can write will never find out that they do.
 */
interface DealChoice {
  /** The resource's own id, for a luxury or strategic row; absent on the others. */
  id?: ResourceId;
  /** The town's own id, for a city row; absent on the others. */
  cityId?: number;
  copies?: number;
  /**
   * Copies of this luxury that could actually be promised: `lendableCopies`,
   * the copies this empire owns and has not lent, never more than it could
   * spend (ruling 4, "only trade away available copies", and the ruling "A
   * borrowed luxury cannot be lent on"). A borrowed copy counts in `copies`
   * and never here.
   *
   * Beside `copies` rather than instead of it, because the two answer different
   * questions and a player at the table asks both: *how much of this do I have*
   * and *how much of it can I move*. Absent on the rows that are not a resource.
   */
  spare?: number;
  population?: number;
  /** "Silk", "Open borders", "Uruk". */
  label: string;
  /** "spare" on a duplicate luxury, "seat of government" on a refused town. */
  note: string | null;
  /** Why this cannot be put on the table, or `null` when it can. */
  error: string | null;
  /**
   * A luxury row the other side holds **only on loan** (batch SS4, the luxury
   * rule's option 1): the row is drawn greyed, with who lent it and the turns
   * its deal has left. Still chosen like any row the reducer accepts, because a
   * copy lent now still counts when that loan ends. Absent on every other row.
   */
  onLoan?: LoanNote;
  /**
   * The turns left on the soonest of the receiver's loans, beside `onLoan`
   * (batch SS6): the figure a chip prints, "5t". Absent when `onLoan` is.
   */
  onLoanTurns?: number;
  /**
   * A luxury row whose giver holds **only a borrowed copy**. The user's ruling
   * "A borrowed luxury cannot be lent on" (`docs/flags.md`) has the reducer
   * refuse it, so the row carries `dealSideError`'s sentence in `error`, and
   * this says where the copy came from.
   */
  borrowed?: LoanNote;
  /** The turns left on the giver's soonest borrowed copy, beside `borrowed`. */
  borrowedTurns?: number;
  /**
   * A strategic row the receiver cannot use yet, because it has not researched
   * the resource's reveal technology: "They cannot use iron until they learn
   * Bronze Panoply". The reducer takes the loan (the ruling: "The borrower can
   * use it after researching its reveal technology"), so this is a note in the
   * chip's hover and never a refusal. Absent on every other row.
   */
  unusable?: string;
  /**
   * A strategic row whose giver has exactly one copy free to build with
   * (`availableCopies`), so lending it stops the next unit that needs it.
   * Units already built keep fighting. Absent on every other row.
   */
  lastFree?: true;
}

/** What one column of the panel offers — one empire's side of the bargain. */
interface DealSideModel {
  playerId: number;
  name: string;
  /** Coin in the treasury: the ceiling on a lump, and printed as one. */
  gold: number;
  /**
   * Every luxury this empire may put on this table, in the resource table's own
   * order. Since batch SS4 a luxury the other side has its own copy of is left
   * off (`luxuryRowShow`).
   */
  luxuries: DealChoice[];
  /**
   * The luxuries this empire holds that the table leaves off, because the
   * other side has its own copy (`luxuryRowShow`, batch SS4). The tray says
   * so in one line: "Not shown: Gold and Honey. You both own them."
   */
  hidden: string[];
  /**
   * What this empire holds of luxuries, whatever the table shows: kinds, and
   * copies (`resourceCopies`, lent copies counted as the copies ruling counts
   * them). The column's head and the list's foot print it.
   */
  stock: { kinds: number; copies: number };
  /**
   * Every strategic resource this empire holds that the seat whose screen this
   * is can name, in the resource table's order (`strategicChoices`). A row with
   * no free copy carries the reducer's sentence in `error`.
   */
  strategics: DealChoice[];
  /** The right of way, with the technology named when it is refused. */
  openBorders: DealChoice;
  /** Towns that may be ceded. Empty unless a peace is being written. */
  cities: DealChoice[];
}

/** A standing paper, as both seats' screens draw it. */
interface DealProposalRow {
  id: number;
  /** True when this seat wrote it — the Withdraw face rather than Accept. */
  mine: boolean;
  /** "You offer the Alexandrians", "The Alexandrians offer you". */
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
interface ActiveDealRow {
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
interface DealPanelModel {
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
  const yours = dealSide(state, seat, targetId, war, seat);
  const theirs = dealSide(state, targetId, seat, war, seat);
  const proposals: DealProposalRow[] = [];
  for (const row of state.dealProposals) {
    const mine = row.by === seat && row.to === targetId;
    const theirsToUs = row.by === targetId && row.to === seat;
    if (!mine && !theirsToUs) continue;
    const byName = seatPeople(state, row.by);
    const toName = seatPeople(state, row.to);
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
      name: seatName(state, other ?? targetId),
      give: termLines(state, sideGivenBy(deal, seat)),
      take: termLines(state, sideTakenBy(deal, seat)),
      turnsLeft: dealTurnsLeft(state, deal),
    });
  }
  const standing = peaceTermsOn(state, seat, targetId);
  const them = seatPeople(state, targetId);
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
export function sideOfPeace(
  terms: { a: DealTerms; b: DealTerms },
  seat: number,
  other: number,
): DealTerms {
  return seat < other ? terms.a : terms.b;
}

/**
 * One loan of one resource to one empire: who lent it, and the turns its deal
 * has left (`dealTurnsLeft`, an absolute expiry read against the turn).
 */
export interface ResourceLoan {
  lenderId: number;
  turnsLeft: number;
}

/**
 * One empire's hold on one luxury or strategic resource, split the way the
 * lending rules need it: the copies that are its **own**, and the loans that
 * make up the rest.
 *
 * Read off the simulation's two figures and nothing else. `resourceCopies` is
 * the net count (own ground, less what was lent away, plus what was lent in,
 * the reveal gate applied); `lentCopiesToPlayer` is the lent-in half of it. So
 * an empire's own copies are the one less the other. An empire that cannot
 * name the resource holds none of it, own or lent, which is the reveal gate's
 * answer, so its loans are not listed either.
 *
 * A loan is found on a deal by `loanedResources`, the sim's one reading of
 * both lists, so the same walk answers for a luxury and a strategic resource.
 */
export interface ResourceHold {
  own: number;
  loans: ResourceLoan[];
}

export function resourceHold(state: GameState, playerId: number, id: ResourceId): ResourceHold {
  const total = resourceCopies(state, playerId, id);
  if (total <= 0) return { own: 0, loans: [] };
  const lentIn = lentCopiesToPlayer(state, playerId)[id] ?? 0;
  const loans: ResourceLoan[] = [];
  // The register in its own order: an outcome is never read off a keyed walk.
  for (const deal of state.deals) {
    const turnsLeft = dealTurnsLeft(state, deal);
    if (turnsLeft <= 0) continue;
    if (!loanedResources(sideTakenBy(deal, playerId)).includes(id)) continue;
    const lenderId = otherSeatOf(deal, playerId);
    if (lenderId === null) continue;
    loans.push({ lenderId, turnsLeft });
  }
  return { own: Math.max(0, total - lentIn), loans };
}

/**
 * What a luxury row shows, by the receiving side's hold on it (batch SS4; the
 * user, 2026-11-16, and the ruling "option 1" in
 * `docs/plans/ui-critique-2026-10-16.md`):
 *
 * - **hidden** when the receiver has a copy of its own. The giver holds the
 *   luxury too (it is on the giver's list), so both have it and a copy across
 *   the table would add nothing;
 * - **onLoan** when the receiver holds it only on loan from a deal that will
 *   end: drawn greyed, with the lender and the turns left;
 * - **open** when the receiver does not hold it at all.
 */
export type LuxuryRowShow = 'hidden' | 'onLoan' | 'open';

export function luxuryRowShow(receiver: ResourceHold): LuxuryRowShow {
  if (receiver.own > 0) return 'hidden';
  if (receiver.loans.length > 0) return 'onLoan';
  return 'open';
}

/**
 * A row's loan line, as the table prints it: the words, then each loan's turns
 * as a figure. "They have it only on loan from you" over "4 turns left".
 */
export interface LoanNote {
  /** "They have it only on loan", "Your copy is on loan". */
  head: string;
  /** One part a loan: "from you", "from them", "from the Tang". */
  parts: { from: string; turns: string }[];
}

/**
 * The words of a loan line, from the seat's side of the table.
 *
 * `holderId` is the empire holding the borrowed copy; `otherId` is the other
 * empire at this table. `kind` says which rule the line belongs to: the
 * receiver's loan (the greyed row) or the giver's own borrowed copy. A lender
 * is "you" when it is the seat, "them" when it is the other empire at the
 * table, and the people's name otherwise.
 */
export function loanNote(
  state: GameState,
  seat: number,
  otherId: number,
  holderId: number,
  loans: readonly ResourceLoan[],
  kind: 'receiver' | 'giver',
): LoanNote {
  const mine = holderId === seat;
  const head =
    kind === 'receiver'
      ? mine
        ? 'You have it only on loan'
        : 'They have it only on loan'
      : mine
        ? 'Your copy is on loan'
        : 'Their copy is on loan';
  const lender = (id: number): string => {
    if (id === seat) return 'from you';
    if (id === otherId) return 'from them';
    return `from the ${seatPeople(state, id)}`;
  };
  return {
    head,
    parts: loans.map((loan) => ({
      from: lender(loan.lenderId),
      turns: loan.turnsLeft === 1 ? '1 turn left' : `${figure(loan.turnsLeft)} turns left`,
    })),
  };
}

/** One column of the panel. See `dealPanel`. `seat` is whose screen it is. */
function dealSide(
  state: GameState,
  giverId: number,
  receiverId: number,
  war: boolean,
  seat: number,
): DealSideModel {
  const giver = playerById(state, giverId);
  const luxuries: DealChoice[] = [];
  const hidden: string[] = [];
  const other = giverId === seat ? receiverId : giverId;
  const holdings = controlledHoldings(state, giverId, 'luxury');
  const stock = {
    kinds: holdings.length,
    copies: holdings.reduce((sum, holding) => sum + resourceCopies(state, giverId, holding.id), 0),
  };
  for (const holding of holdings) {
    // The luxury rule (batch SS4): the receiver's hold decides whether the row
    // is drawn at all, and whether it is drawn greyed.
    const theirs = resourceHold(state, receiverId, holding.id);
    const show = luxuryRowShow(theirs);
    if (show === 'hidden') {
      hidden.push(resourceDef(holding.id).name);
      continue;
    }
    const mine = resourceHold(state, giverId, holding.id);
    const copies = resourceCopies(state, giverId, holding.id);
    // **What may actually be promised** (batch R1, ruling 4 — "only trade away
    // available copies"). A copy a unit of this empire is standing on is spoken
    // for, and `dealSideError` refuses it, so the row has to say so rather than
    // offer a bargain the reducer will throw out.
    //
    // No shipped luxury is spent by a unit today (ivory became strategic in
    // batch R3), so for a luxury this subtraction is nought. It stays because
    // the rule is the reducer's, not this list's. Strategic resources, which
    // units do spend, have their own group (`strategicChoices`) on the same
    // gate.
    // The reducer's own sentence for this one term, asked through a probe side
    // (`dealSideError`): the Forbidden Silks' ban (batch DT7), a copy that is
    // already spoken for and a copy that is only borrowed are all its words, so
    // the row greys before a player writes a paper the reducer would throw out.
    //
    // What can be given is `lendableCopies`, the reading the gate asks, and not
    // `availableCopies`: an empire with its own silk and a borrowed silk can use
    // two and lend one (the ruling "A borrowed luxury cannot be lent on").
    const error = dealSideError(state, giverId, receiverId, { luxuries: [holding.id] }, war);
    const spare = error !== null ? 0 : lendableCopies(state, giverId, holding.id);
    luxuries.push({
      id: holding.id,
      label: resourceDef(holding.id).name,
      copies,
      spare,
      // A **spare** is what the panel marks, not what it enforces: an empire
      // may lend its last copy and simply hand the contentment across, which is
      // the ruling. The mark is there so a player can see which lending costs
      // them nothing: a copy can be given, and one is still held after it.
      // `copies` is `resourceCopies`, which has already taken off everything
      // promised elsewhere and counts a borrowed copy, so one own silk and one
      // borrowed silk is a spare (the borrowed one stays).
      note: spare >= 1 && copies > 1 ? 'spare' : null,
      // A kind with no **net** copy left is not in `controlledHoldings` at all,
      // so the list still does most of the gating. What it cannot see since
      // batch R1 is a copy this empire's own army has spoken for, and that is
      // what this greys; the row prints both figures beside it (batch R4), so a
      // player reads why before the refusal rather than after it.
      error,
      ...(show === 'onLoan'
        ? {
            onLoan: loanNote(state, seat, other, receiverId, theirs.loans, 'receiver'),
            onLoanTurns: soonestLoan(theirs.loans),
          }
        : {}),
      ...(mine.own === 0 && mine.loans.length > 0
        ? {
            borrowed: loanNote(state, seat, other, giverId, mine.loans, 'giver'),
            borrowedTurns: soonestLoan(mine.loans),
          }
        : {}),
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
        population: city.population,
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
    name: seatName(state, giverId),
    gold: giver?.gold ?? 0,
    luxuries,
    hidden,
    stock,
    strategics: strategicChoices(state, giverId, receiverId, war, seat),
    openBorders: {
      label: 'Open borders',
      note: null,
      error: openBordersError(state, giverId, receiverId),
    },
    cities,
  };
}

/**
 * The strategic resources one side may lend, as chips (the ruling: "A deal can
 * lend a free copy of a strategic resource. The borrower can use it after
 * researching its reveal technology. Units already in play keep fighting when
 * the loan ends.", `docs/flags.md`).
 *
 * - **Which rows.** Every strategic resource the giver holds
 *   (`controlledHoldings`), and of those only the ones the seat whose screen
 *   this is can name. The giver can always name its own, so the filter acts on
 *   the other side's tray: a resource this seat has not revealed is not shown
 *   to it, as the board does not show it.
 * - **The figure** is the free copies, `lendableCopies`: copies the giver owns,
 *   has not lent and no unit or queue has spoken for. That is the reading
 *   `dealSideError` asks, so a chip never offers a copy the reducer refuses.
 * - **A row with no free copy** carries the reducer's own sentence in `error`
 *   ("every copy is already spoken for", "only on loan"), and the chip is drawn
 *   struck through with that sentence on hover, as Open borders is.
 * - **Unlike a luxury, no row is hidden** when the receiver holds its own
 *   copies: each unit spends a copy, so one more can always be of use.
 * - **A receiver that cannot use it yet** (no reveal technology) may still be
 *   lent it, because the reducer takes the loan. The chip says so on hover
 *   (`unusable`).
 * - **The last copy free to build with** is marked (`lastFree`), and the paper
 *   warns when it is offered: units already built keep fighting, but the next
 *   one cannot be raised while the loan runs.
 */
function strategicChoices(
  state: GameState,
  giverId: number,
  receiverId: number,
  war: boolean,
  seat: number,
): DealChoice[] {
  const viewer = playerById(state, seat);
  const receiver = playerById(state, receiverId);
  const other = giverId === seat ? receiverId : giverId;
  const rows: DealChoice[] = [];
  for (const holding of controlledHoldings(state, giverId, 'strategic')) {
    const id = holding.id;
    if (!viewer || !resourceIsVisibleTo(id, viewer.techsResearched)) continue;
    const copies = resourceCopies(state, giverId, id);
    const error = dealSideError(state, giverId, receiverId, { strategics: [id] }, war);
    const spare = error !== null ? 0 : lendableCopies(state, giverId, id);
    // A borrowed copy can be built with but not lent, so the last copy to lend
    // is not always the last one to build with: ask the build gate's reading.
    const lastFree = spare >= 1 && availableCopies(state, giverId, id) === 1;
    const mine = resourceHold(state, giverId, id);
    const gate = resourceDef(id).requiresTech;
    const blind = receiver !== undefined && !resourceIsVisibleTo(id, receiver.techsResearched);
    rows.push({
      id,
      label: resourceDef(id).name,
      copies,
      spare,
      note: null,
      error,
      ...(blind && gate !== undefined ? { unusable: unusableNote(state, receiverId, seat, id, gate) } : {}),
      ...(lastFree ? { lastFree: true as const } : {}),
      ...(mine.own === 0 && mine.loans.length > 0
        ? {
            borrowed: loanNote(state, seat, other, giverId, mine.loans, 'giver'),
            borrowedTurns: soonestLoan(mine.loans),
          }
        : {}),
    });
  }
  return rows;
}

/** The strategic group's own sentences. */
export const STRATEGIC_WORDS = {
  /** The group's line when a side has no strategic resource to show. */
  none: 'No strategic resources to lend.',
} as const;

/**
 * The warning under the paper when this seat offers its last free copy of a
 * strategic resource. Units already built keep fighting; what the seat loses
 * is the copy a new unit would need.
 */
export function lastFreeCopyLine(names: readonly string[]): string {
  return (
    `You are offering your last free copy of ${names.join(', ')}. ` +
    'You cannot build more units that need it while the exchange runs.'
  );
}

/**
 * "The Bors cannot use iron until they learn Bronze Panoply." The hover note
 * on a strategic chip whose receiver lacks the reveal technology. The receiver
 * is the other empire on this screen, because this seat cannot see a resource
 * it has not revealed (`strategicChoices`).
 */
export function unusableNote(
  state: GameState,
  receiverId: number,
  seat: number,
  id: ResourceId,
  gate: Parameters<typeof techDef>[0],
): string {
  const name = resourceDef(id).name.toLowerCase();
  const tech = techDef(gate).name;
  if (receiverId === seat) return `You cannot use ${name} until you learn ${tech}`;
  return `The ${seatPeople(state, receiverId)} cannot use ${name} until they learn ${tech}`;
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
  const lines = termItems(state, terms).map((item) => item.text);
  if (lines.length === 0) lines.push('Nothing');
  return lines;
}

/**
 * One clause of a side's terms, as the paper prints it, with the key that
 * takes it back off the table (batch SS6): `gold`, `goldPerTurn`,
 * `luxury:<id>`, `strategic:<id>`, `openBorders` or `city:<id>`.
 */
export interface TermItem {
  key: string;
  text: string;
}

/**
 * The clauses of a side's terms, in `termLines`' order and words. `termLines`
 * is these words, with "Nothing" for an empty side; the paper draws these, so
 * each clause can be taken back on its own.
 */
export function termItems(state: GameState, terms: DealTerms): TermItem[] {
  const items: TermItem[] = [];
  const gold = terms.gold ?? 0;
  if (gold > 0) items.push({ key: 'gold', text: `${figure(gold)} gold` });
  const perTurn = terms.goldPerTurn ?? 0;
  if (perTurn > 0) items.push({ key: 'goldPerTurn', text: `${figure(perTurn)} gold a turn` });
  for (const id of terms.luxuries ?? []) items.push({ key: `luxury:${id}`, text: resourceDef(id).name });
  for (const id of terms.strategics ?? []) items.push({ key: `strategic:${id}`, text: resourceDef(id).name });
  if (terms.openBorders === true) items.push({ key: 'openBorders', text: 'Open borders' });
  for (const cityId of terms.cities ?? []) {
    items.push({
      key: `city:${cityId}`,
      text: state.cities.find((city) => city.id === cityId)?.name ?? 'a town',
    });
  }
  return items;
}

/**
 * Takes one clause back off a side's terms (batch SS6, the × on the paper).
 * Presence is the state on a term, exactly as in the register: a side with
 * nothing left on a line has the line deleted rather than set to nothing.
 */
export function removeTerm(terms: DealTerms, key: string): void {
  if (key === 'gold') delete terms.gold;
  else if (key === 'goldPerTurn') delete terms.goldPerTurn;
  else if (key === 'openBorders') delete terms.openBorders;
  else if (key.startsWith('luxury:') || key.startsWith('strategic:')) {
    const group = key.startsWith('luxury:') ? 'luxuries' : 'strategics';
    const id = key.slice(key.indexOf(':') + 1);
    const kept = (terms[group] ?? []).filter((held) => held !== id);
    if (kept.length > 0) terms[group] = kept;
    else delete terms[group];
  } else if (key.startsWith('city:')) {
    const id = Number(key.slice('city:'.length));
    const kept = (terms.cities ?? []).filter((held) => held !== id);
    if (kept.length > 0) terms.cities = kept;
    else delete terms.cities;
  }
}

/** The turns left on the loan that ends first. Called only with loans. */
function soonestLoan(loans: readonly ResourceLoan[]): number {
  return loans.reduce((least, loan) => Math.min(least, loan.turnsLeft), loans[0]?.turnsLeft ?? 0);
}

/**
 * The shortest form of a loan for a chip: the turns left on the loan that ends
 * first, "5t" (batch SS6). The lender and the whole sentence are in the chip's
 * title.
 */
export function loanTurnsMark(turns: number): string {
  return `${figure(turns)}t`;
}

/** A loan note as one plain sentence, for a chip's title: "They have it only on loan from you · 5 turns left". */
export function loanSentence(note: LoanNote): string {
  return `${note.head} ${note.parts.map((part) => `${part.from} · ${part.turns}`).join('; ')}`;
}

/**
 * "Not shown: Gold and Honey. You both own them." The tray's one line about the
 * luxuries the table leaves off (batch SS4's rule), or `null` when none are.
 */
export function hiddenLuxuriesLine(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  const list =
    names.length === 1
      ? names[0]!
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]!}`;
  return `Not shown: ${list}. You both own ${names.length === 1 ? 'it' : 'them'}.`;
}

/**
 * The reducer's sentence for one coin term on one side, or `null` when it
 * stands (batch SS6). The gold chip's field asks it on every figure typed, so a
 * lump larger than the treasury reads as refused before it is sent.
 */
export function coinTermError(
  state: GameState,
  giverId: number,
  receiverId: number,
  key: 'gold' | 'goldPerTurn',
  amount: number,
  war: boolean,
): string | null {
  return dealSideError(state, giverId, receiverId, { [key]: amount }, war);
}

/**
 * The reducer's sentence for a whole draft, your side first, or `null` when
 * both sides stand (batch SS6). The propose control is greyed with it, so a
 * paper the reducer would throw out is not sent.
 */
export function draftError(
  state: GameState,
  seat: number,
  targetId: number,
  draft: { give: DealTerms; take: DealTerms },
  war: boolean,
): string | null {
  return (
    dealSideError(state, seat, targetId, draft.give, war) ??
    dealSideError(state, targetId, seat, draft.take, war)
  );
}

/**
 * The line under the paper's title (batch SS6): how long the paper runs.
 * A peace says when it takes effect; an exchange with a lasting term runs the
 * deal length (`rules.war.dealTurns`) from this turn; a paper of coin and towns
 * alone is paid once.
 */
export function paperRunsLine(
  turn: number,
  peace: boolean,
  give: DealTerms,
  take: DealTerms,
): string {
  if (peace) return 'A peace ends the war the moment you have both signed it.';
  if (termsAreEmpty(give) && termsAreEmpty(take)) return 'Nothing on the table';
  if (!dealIsOngoing(give, take)) return 'Paid once, on signing';
  const length = RULES.war.dealTurns;
  return `Runs ${figure(length)} turns, to turn ${figure(turn + length)}`;
}

/**
 * What the propose button at the foot of the desk says.
 *
 * Two faces, and the first is the whole of the peace-with-terms rule said in
 * a player's own words: on a war row this button writes the *peace* paper,
 * not an ordinary bargain, and a player who does not know that will wonder
 * where their treaty went. An empty exchange keeps its words and is greyed
 * with "Put something on the table first" (layout B draws one Propose; the
 * table above it already says "Nothing" on each side).
 */
export function dealButtonLabel(model: DealPanelModel, _empty: boolean): string {
  return model.peace ? 'Propose peace' : 'Propose exchange';
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
  peace?: boolean;
  lastCopy?: string;
}

/**
 * **What this empire would sign**, as the two counter questions bring it back.
 *
 * `terms` is written from *your* side, exactly as the draft is (`DealDraft`),
 * so the sheet writes it straight in and the player may edit it before sending
 * it. `refusal` is the seat's own sentence when it will not treat at all, which
 * is a different answer from "there is no paper that would do it".
 */
interface CounterAnswer {
  terms: { give: DealTerms; take: DealTerms } | null;
  /** The bot's reasons for the counter, one plain line each. */
  reasons: string[];
  /** The seat's own sentence when it refuses to treat, or `null`. */
  refusal: string | null;
}

/** Which of the two questions was put to them. */
type CounterQuestion = 'work' | 'give';

/** Voiced response and actionable explanation, separate from the AI's score ledger. */
export function audienceCopy(answer: EnvoyAnswer): { quote: string; detail: string } {
  if(answer.accepted) return answer.peace
    ? {quote:'Let the fighting end. We have an agreement.',detail:'Peace agreed. The war has ended and the agreed terms have taken effect.'}
    : {quote:'A fair exchange. My merchants will see it done.',detail:'Agreement signed. Its terms are listed under In force.'};
  if(answer.peace) return {quote:'Not yet. I am not ready to end this war.',detail:'Peace declined. You remain at war; revise the terms below or return later.'};
  if(answer.lastCopy) return {quote:`I will not part with our last ${answer.lastCopy.toLowerCase()}. Ask for something we can spare.`,detail:`They have only one copy of ${answer.lastCopy} to spare. Choose another resource or ask for revised terms.`};
  return {quote:'These terms do not suit us. What else can you offer?',detail:'Offer declined. Add something they need, reduce your request, or ask what would make this work.'};
}

/** Draft towns cease to be offerable as soon as the relationship returns to peace. */
export function trimTownTerms(terms: DealTerms, choices: DealChoice[]): void {
  const valid = new Set(choices.filter(c=>c.error===null).map(c=>c.cityId));
  const kept = (terms.cities??[]).filter(id=>valid.has(id));
  if(kept.length)terms.cities=kept;else delete terms.cities;
}

/** The words of the Declare war card's list, one line for each thing a war ends or opens. */
export const WAR_CONFIRM_WORDS = {
  body: 'This is what follows.',
  deals: 'Every deal between you ends now.',
  proposals: 'The offers on the table between you are withdrawn.',
  routes: 'Every caravan running between you comes home.',
  borders: 'Your armies may enter their land and strike their people, and theirs may do the same.',
  peace: 'Peace can only be made if they agree to it.',
} as const;

/**
 * **The confirm card a declaration raises** (Declare war, version A; the user,
 * 2026-11-19: "great go with A"): the question, then what follows, one line
 * each, read off the sim (`warConsequences`, the same lists the act
 * empties). A line for deals, offers or caravans appears only when there are
 * some. The borders and the peace are always so. The card is grave: its
 * confirm is the war red with the blade, and Enter does not confirm.
 */
export function declareConfirm(name: string, war: WarConsequences): ConfirmRequest {
  const points: string[] = [];
  if (war.deals > 0) points.push(WAR_CONFIRM_WORDS.deals);
  if (war.proposals > 0) points.push(WAR_CONFIRM_WORDS.proposals);
  if (war.routes > 0) points.push(WAR_CONFIRM_WORDS.routes);
  points.push(WAR_CONFIRM_WORDS.borders, WAR_CONFIRM_WORDS.peace);
  return {
    title: `Declare war on the ${name}?`,
    body: WAR_CONFIRM_WORDS.body,
    points,
    confirmLabel: 'Declare war',
    cancelLabel: 'Keep the peace',
    tone: 'war',
  };
}

// --- the strip of courts (layout B) -----------------------------------------

/** The strip's words. */
export const STRIP_WORDS = {
  label: 'Courts',
} as const;

/**
 * One court on the strip of courts (Quiet Table, fourth pass, frame 2: "love
 * this, great"). The strip shows the courts this seat has met and no others
 * (the user, 2026-11-19, on a blank mark for an unmet court: "just hide them
 * fully"). A court not yet met is not on the strip, is not counted in the
 * head, and the desk never draws it.
 */
export interface StripCourt {
  playerId: number;
  /** The court's row. */
  row: DiplomacyRow;
  /** What the hover label and a screen reader say about the mark. */
  label: string;
}

/** The first letter in lower case, for a status inside a label: "at war since turn 41". */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * The strip, in seat order: `diplomacyRows`, which reads `diplomaticSeats`
 * (every real player but this seat and the fallen; never the barbarians).
 * A met court's label is its name, where you stand, and `rosterNote`'s one
 * sentence when there is one: "Akhenaten · at war since turn 41".
 */
export function courtStrip(state: GameState, seat: number): StripCourt[] {
  return diplomacyRows(state, seat).filter((row) => row.met).map((row) => {
    const note = rosterNote(row);
    const parts = [row.name, lowerFirst(row.status)];
    if (note !== null) parts.push(lowerFirst(note.replace(/\.$/, '')));
    return { playerId: row.playerId, row, label: parts.join(' · ') };
  });
}

/**
 * The court the desk draws: the chosen one if this seat has met it, and the
 * first met court on the strip otherwise. `null` when the seat has met nobody.
 * The strip and the desk read the same list, so the desk can never draw a
 * court the strip hides.
 */
export function chosenCourt(strip: readonly StripCourt[], selectedId: number | null): DiplomacyRow | null {
  return (strip.find((court) => court.playerId === selectedId) ?? strip[0])?.row ?? null;
}

/**
 * Where an arrow key moves the keyboard on the strip, or `null` for a key the
 * strip does not take. Only met courts take the keyboard. Up and Left go to
 * the court before, Down and Right to the court after, and Home and End to the
 * ends. The strip does not wrap round. Moving does not choose: Enter does.
 */
export function stripStep(strip: readonly StripCourt[], fromId: number | null, key: string): number | null {
  const met = strip.map((court) => court.playerId);
  if (met.length === 0) return null;
  const at = fromId === null ? -1 : met.indexOf(fromId);
  switch (key) {
    case 'Home':
      return met[0]!;
    case 'End':
      return met[met.length - 1]!;
    case 'ArrowUp':
    case 'ArrowLeft':
      return met[Math.max(0, at - 1)]!;
    case 'ArrowDown':
    case 'ArrowRight':
      return met[at < 0 ? 0 : Math.min(met.length - 1, at + 1)]!;
    default:
      return null;
  }
}


// --- the drawer: standing and deals -----------------------------------------

/** The words of the "Standing and deals" drawer. Plain, and no figures. */
export const DRAWER_WORDS = {
  title: 'Standing and deals',
  back: 'back to the table',
  close: 'Close standing and deals',
  standing: 'Standing',
  inForce: 'In force',
  turnsLeft: 'turns left',
  waiting: 'Waiting for your answer',
  mine: 'Your offers',
  none: 'None',
  read: 'Read',
  withdraw: 'Withdraw',
} as const;

/** One line of where you stand: "Their borders" · "Open to you". */
export interface StandingLine {
  label: string;
  value: string;
  /** Set on the relation line only, for its colour. */
  relation?: RelationKind;
}

/** One offer in the drawer, as one line: the heading apart, so it can be set bold. */
export interface OfferLine {
  /** The bargain's id, or `'peace'` for a peace offer, which rides on the war row and has no id. */
  paper: number | 'peace';
  head: string;
  text: string;
}

/** One of your own offers, with the button that takes it back. */
export interface OwnOfferLine extends OfferLine {
  /** The button's words: "Withdraw", or the peace button's own face. */
  action: string;
  /** Why the button is refused, or `null`. */
  error: string | null;
}

/**
 * Everything the "Standing and deals" drawer lists for one court. Every part
 * is a reading the sheet already had: the relation sentence, `bordersOpenTo`
 * both ways, and the deal panel's own deals in force, offers and peace paper
 * (`dealPanel`). Nothing here is a new figure.
 */
export interface StandingAndDeals {
  standing: StandingLine[];
  inForce: ActiveDealRow[];
  waiting: OfferLine[];
  mine: OwnOfferLine[];
}

/**
 * "The Tang offer you" and "Lapis Lazuli for 6 gold a turn": one offer as one
 * line, the heading apart so it can be set bold.
 */
export function offerLine(head: string, give: string[], take: string[], tail = ''): [string, string] {
  const gives = give.filter((line) => line !== 'Nothing');
  const asks = take.filter((line) => line !== 'Nothing');
  const what = gives.length > 0 ? ` ${gives.join(', ')}` : '';
  return [head, `${what}${asks.length > 0 ? ` for ${asks.join(', ')}` : ''}${tail}`];
}

export function standingAndDeals(
  state: GameState,
  seat: number,
  row: DiplomacyRow,
  model: DealPanelModel,
): StandingAndDeals {
  const standing: StandingLine[] = [
    { label: 'Relation', value: row.status, relation: row.relation },
    { label: 'Their borders', value: bordersOpenTo(state, row.playerId, seat) ? 'Open to you' : 'Closed to you' },
    { label: 'Your borders', value: bordersOpenTo(state, seat, row.playerId) ? 'Open to them' : 'Closed to them' },
  ];
  const waiting: OfferLine[] = [];
  if (row.theyOffered && !row.weOffered) {
    const [head, text] =
      model.peacePaper && !model.peacePaper.mine
        ? offerLine(model.peacePaper.heading, model.peacePaper.take, model.peacePaper.give, ', for peace')
        : [rosterNote(row) ?? 'They have offered peace.', ''];
    waiting.push({ paper: 'peace', head, text });
  }
  const mine: OwnOfferLine[] = [];
  for (const proposal of model.proposals) {
    const [head, text] = offerLine(proposal.heading, proposal.give, proposal.take);
    if (proposal.mine) {
      mine.push({ paper: proposal.id, head, text, action: DRAWER_WORDS.withdraw, error: proposal.withdrawError });
    } else {
      waiting.push({ paper: proposal.id, head, text });
    }
  }
  if (row.relation === 'war' && row.weOffered) {
    const [head, text] = model.peacePaper?.mine
      ? offerLine(model.peacePaper.heading, model.peacePaper.give, model.peacePaper.take, ', for peace')
      : ['Your offer of peace stands.', ''];
    mine.push({ paper: 'peace', head, text, action: peaceButtonLabel(row), error: row.peaceError });
  }
  return { standing, inForce: model.active, waiting, mine };
}

/**
 * What the court says on the slip under its portrait while one of their
 * offers is open on the table. The other lines are the envoy's
 * (`audienceCopy`) and the sheet's own opening words.
 */
export const SLIP_WORDS = {
  offer: 'Here is what I propose.',
  peaceOffer: 'Here are my terms for peace.',
  offerDetail: 'Accept or decline, or change the terms and send them as your own offer.',
} as const;

// --- the sheet --------------------------------------------------------------

interface DiplomacyScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  /**
   * The other controls that open this sheet, for the focus return and the
   * `aria-expanded` mirror. Batch SS2 used it for a bar tab beside the corner
   * panel's quick button; since batch SS2b each sheet has one door, so nothing
   * passes it today. See `modalShell.ts`.
   */
  doors?: () => readonly (HTMLElement | null | undefined)[];
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
   *
   * May answer later, as a promise: the game page asks the bot in a worker so
   * the click does not freeze the page while the bot thinks. The sheet then
   * shows the envoy considering until the answer arrives.
   */
  askAudience?: (targetId: number, dealId?: number) => EnvoyAnswer | null | Promise<EnvoyAnswer | null>;
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
  /**
   * Opens the sheet on a court. `offer` opens one of their offers on the
   * paper (a bargain's id, or `'peace'`), as the deal notice does (batch SS6).
   */
  open(targetId?: number, offer?: number | 'peace'): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  dispose(): void;
}

/**
 * A court's shield: cut from the seat's colour, with its charge in the metal
 * (`heraldryFor`). Two sizes, the rail's and the column's. Exported for the
 * deal notice by the turn button, so the two places that name a court draw it
 * the same way (batch SS6).
 */
export function courtSeal(state: GameState, playerId: number, size: 'small' | 'large'): HTMLElement {
  const player = playerById(state, playerId);
  const inks = seatInks(player);
  const badge = element('span', `dp-seal is-${size}`);
  badge.style.setProperty('--court', inks.primary);
  badge.style.setProperty('--metal', leaderBannerInk(player?.leader, inks.primary, inks.secondary));
  const mark = element('span', 'dp-seal-mark');
  mark.style.setProperty(
    '--charge',
    `url("${heraldryMarkDataUri(heraldryFor(playerId, player?.charge, player?.leader))}")`,
  );
  badge.setAttribute('aria-hidden', 'true');
  badge.append(mark);
  return badge;
}

/**
 * A court mark (`src/art/courtMarks.ts`) as a span that masks `currentColor`
 * through the mark, so it takes the ink of the text beside it. Its size is the
 * board's box, handed to the stylesheet as two custom properties so a rule
 * may draw it smaller. Exported for the deal notice.
 */
export function courtMarkNode(id: CourtMarkId, className: string): HTMLElement {
  const node = element('span', `court-mark is-${id} ${className}`);
  node.setAttribute('aria-hidden', 'true');
  node.style.setProperty('--court-mark', `url("${courtMarkDataUri(id)}")`);
  node.style.setProperty('--court-mark-w', `${COURT_MARKS[id].width}px`);
  node.style.setProperty('--court-mark-h', `${COURT_MARKS[id].height}px`);
  return node;
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

/**
 * What the stepper beside a gold field adds or takes away. An interface
 * convenience, not a rule: any whole figure can be typed.
 */
const AMOUNT_STEP = { gold: 10, goldPerTurn: 1 } as const;

/** An offer from the other empire, opened on the paper (batch SS6). */
type OfferOnPaper = { seatId: number; paper: number | 'peace' };

/** Terms copied, so a draft written from an offer never shares arrays with the register. */
function copyTerms(terms: DealTerms): DealTerms {
  return JSON.parse(JSON.stringify(terms)) as DealTerms;
}

/**
 * Every leader's face, by id, built once when the sheet first draws a court.
 * The portrait window (`leaderPortraitNode`) takes a face; `leaderFaces`
 * words every leader's cards, so it is asked once and kept.
 */
let leaderFaceById: Map<string, ReturnType<typeof leaderFaces>[number]> | null = null;

function leaderFaceOf(leader: string | undefined): ReturnType<typeof leaderFaces>[number] | null {
  if (leader === undefined) return null;
  leaderFaceById ??= new Map(leaderFaces().map((face) => [face.id, face]));
  return leaderFaceById.get(leader) ?? null;
}

/**
 * A court's picture: the setup step's 3:4 portrait window
 * (`leaderPortraitNode`), with the leader's portrait when one exists and the
 * seat's charge on its ink until then. The charge is resolved here, by seat,
 * because the window's own fallback reads seat order from the first seat. The
 * strip draws the same window, small and square.
 */
function courtPicture(state: GameState, playerId: number): HTMLElement {
  const player = playerById(state, playerId);
  return leaderPortraitNode(leaderFaceOf(player?.leader), {
    color: player?.color ?? '',
    ...(player?.secondary === undefined ? {} : { secondary: player.secondary }),
    charge: heraldryFor(playerId, player?.charge, player?.leader),
  });
}

export function createDiplomacyScreen(options: DiplomacyScreenOptions): DiplomacyScreen {
  const { overlay, body, closeButton, trigger } = options;

  /** The half-written papers, one per empire, by seat id. See `DealDraft`. */
  const drafts = new Map<number, DealDraft>();

  /**
   * Which court the desk is showing.
   *
   * A fact about *this* opening, exactly as the Trade sheet's chooser and sort
   * are: a sheet opened tomorrow starts on the first court on the strip rather
   * than on whoever the player last argued with.
   */
  let selectedId: number | null = null;
  let draftSeat = options.getPlayerId();
  let draftGame = options.getState();

  /**
   * **The last thing the empire across the table said**, and which empire said
   * it: the audience's whole state.
   *
   * Per opening, and one at a time: an envoy's answer is about the paper that
   * was just sent, so a second paper replaces it and a different empire's table
   * does not show it at all. It is not a draft. Nothing here outlives the
   * sheet, because a sentence about a board that has since moved can quietly
   * become false.
   */
  let envoy: { seatId: number; answer: EnvoyAnswer } | null = null;
  /** The seat whose answer is on its way from the bot worker, or `null`. */
  let considering: number | null = null;
  /** Counts audiences asked, so an answer that arrives after a newer question is dropped. */
  let audiencesAsked = 0;
  /** The counter last brought back, and which question brought it. */
  let counter: { seatId: number; question: CounterQuestion; answer: CounterAnswer } | null = null;
  /**
   * The offer open on the table in place of the draft, or `null` (batch SS6).
   * "Read" in the drawer opens one; answering it, changing its terms or going
   * back to your own paper puts it away.
   */
  let reading: OfferOnPaper | null = null;
  /**
   * The gold chips whose amount field is open, by `seat:half:key` (batch SS6).
   * A field opens empty when the chip is picked, and the term is written only
   * once a figure above nothing is typed, so "open" cannot be read off the
   * draft alone.
   */
  const openAmounts = new Set<string>();
  /**
   * The last refused chip pressed, and the reducer's sentence for it, shown in
   * its tray under the group that holds the chip.
   */
  let refusal: { seatId: number; half: 'give' | 'take'; group: string; text: string } | null = null;
  /** A control to focus after the next draw, by its `data-focus` key. */
  let focusAfter: string | null = null;
  /**
   * The "Standing and deals" drawer, open or shut. Open, it covers the trays
   * and the table; the strip, the portrait and the court's words stay in view
   * (fourth pass, `frame-2-drawer`). Choosing another court keeps it open, so
   * a player can read where they stand with each court in turn.
   */
  let drawerOpen = false;
  /** The hover label of the strip, one per draw. See `showTip`. */
  let tip: HTMLElement | null = null;
  /**
   * While an offer of theirs is open on the table, its terms are shown in the
   * trays and on the table as if they were your draft. The first edit (a chip,
   * a figure, a ×) makes them your draft: this is that step, set on every
   * draw, and `null` when no offer is open.
   */
  let adoptOffer: (() => void) | null = null;

  /** Turns the open offer into your draft before an edit. See `adoptOffer`. */
  function takeOffer(): void {
    adoptOffer?.();
  }

  function draftFor(playerId: number): DealDraft {
    let draft = drafts.get(playerId);
    if (!draft) {
      draft = { give: {}, take: {} };
      drafts.set(playerId, draft);
    }
    return draft;
  }

  /** Forgets the per-table talk when the player turns to another empire. */
  function forgetTalk(): void {
    envoy = null;
    counter = null;
    reading = null;
    refusal = null;
  }

  /** A section heading in the sheet's voice, with an optional note at its right. */
  function heading(text: string, note?: string): HTMLElement {
    const head = element('h3', 'dp-hd', text);
    if (note !== undefined) head.append(element('span', 'dp-hd-note', note));
    return head;
  }

  /**
   * The fact line in the sheet's head: the turn, and how many of the courts
   * this seat has met ("turn 101 · 9 courts met"). It does not say how many
   * courts there are in all. Figures
   * in mono, words in small capitals, as the board draws it.
   */
  function paintFacts(state: GameState, strip: readonly StripCourt[]): void {
    const line = overlay.querySelector<HTMLElement>('.dp-facts');
    if (!line) return;
    const met = strip.length;
    const parts: (string | HTMLElement)[] = ['turn ', element('b', '', figure(state.turn))];
    if (met > 0) parts.push(' · ', element('b', '', figure(met)), met === 1 ? ' court met' : ' courts met');
    line.replaceChildren(...parts);
  }

  /** Puts another court on the desk and keeps the keyboard on its mark. */
  function choose(playerId: number): void {
    if (playerId !== selectedId) {
      selectedId = playerId;
      // What one empire said is about one table: choosing another empire's
      // puts the last answer away rather than leaving it to be found later.
      forgetTalk();
    }
    focusAfter = `court:${playerId}`;
    draw();
  }

  /**
   * One court on the strip: its picture, small and square, with a dot for war
   * (the war red) or a truce (deep gilt), and a cinnabar dot when an offer of
   * theirs waits for your answer. The chosen court is ringed in ink.
   *
   * The strip is a list box: the chosen court holds the one tab stop, the
   * arrow keys move between met courts (`stripStep`), and Enter or a click
   * chooses.
   */
  function drawCourt(court: StripCourt, chosenId: number | null): HTMLElement {
    const row = court.row;
    const active = row.playerId === chosenId;
    const node = button(`dp-court is-${row.relation}${active ? ' is-sel' : ''}`, '');
    node.setAttribute('role', 'option');
    node.setAttribute('aria-selected', String(active));
    node.setAttribute('aria-label', court.label);
    node.tabIndex = active ? 0 : -1;
    node.dataset.focus = `court:${row.playerId}`;
    node.dataset.court = String(row.playerId);
    const said = [row.name, row.status];
    const note = rosterNote(row);
    if (note !== null) said.push(note);
    if (row.bargains > 0) said.push(`${figure(row.bargains)} in force`);
    node.title = said.join('. ');
    node.append(courtPicture(options.getState(), row.playerId));
    if (row.relation !== 'peace') node.append(element('i', `dp-court-dot is-${row.relation}`));
    if (row.waiting > 0) node.append(element('i', 'dp-court-dot is-offer'));
    node.addEventListener('pointerenter', () => showTip(node, court.label));
    node.addEventListener('focus', () => showTip(node, court.label));
    node.addEventListener('pointerleave', hideTip);
    node.addEventListener('blur', hideTip);
    node.addEventListener('click', () => choose(row.playerId));
    return node;
  }

  /**
   * The hover label beside a mark on the strip: the court's name and where
   * you stand ("Akhenaten · at war"), as the board draws it. One element for
   * the sheet, placed beside the mark it names, because a label inside the
   * strip would be cut off by the strip's own scroll.
   */
  function showTip(mark: HTMLElement, label: string): void {
    if (!tip) return;
    const box = mark.getBoundingClientRect();
    const frame = body.getBoundingClientRect();
    const [name, ...rest] = label.split(' · ');
    tip.replaceChildren(element('b', '', name ?? ''));
    if (rest.length > 0) tip.append(` · ${rest.join(' · ')}`);
    tip.style.left = `${box.right - frame.left + 10}px`;
    tip.style.top = `${box.top - frame.top + box.height / 2}px`;
    tip.hidden = false;
  }

  function hideTip(): void {
    if (tip) tip.hidden = true;
  }

  /**
   * **The strip of courts** (fourth pass, `frame-2-strip`; the user: "love
   * this, great"): one small mark a court, down the left of the portrait, for
   * every other empire at the table. It answers the user's worry that a row of
   * faces in the head would not have room for every court: the strip scrolls
   * when the courts outgrow the sheet.
   */
  function drawStrip(strip: readonly StripCourt[], chosen: DiplomacyRow | null): HTMLElement {
    const list = element('div', 'dp-strip');
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', STRIP_WORDS.label);
    list.setAttribute('aria-orientation', 'vertical');
    list.dataset.scroll = 'strip';
    for (const court of strip) list.append(drawCourt(court, chosen?.playerId ?? null));
    return list;
  }

  /**
   * **The chosen court, large** (layout B, the user: "the main focus being on
   * the portrait of the leader, i'd like their speaking to be more prominent
   * too"): the 3:4 portrait window, the name, the people and where you stand
   * over its foot, and the slip with the court's last words under them.
   */
  function drawFigure(state: GameState, row: DiplomacyRow, model: DealPanelModel, offerOpen: boolean): HTMLElement {
    const figureNode = element('section', `dp-figure is-${row.relation}`);
    figureNode.setAttribute('aria-label', row.name);
    figureNode.append(courtPicture(state, row.playerId), element('span', 'dp-figure-fade'));
    const foot = element('div', 'dp-figure-foot');
    foot.append(
      element('p', 'dp-nameplate', `${row.name} · the ${row.people} · ${lowerFirst(row.status)}`),
      drawSlip(row, model, offerOpen),
    );
    figureNode.append(foot);
    return figureNode;
  }

  /**
   * The slip under the portrait: the court's last word. While their answer is
   * on its way it says so; after a paper it is the answer; after a counter
   * question it is what they would sign; with an offer of theirs open it asks
   * for your answer. The longer sentence under each answer (`audienceCopy`) is
   * the slip's title.
   */
  function drawSlip(row: DiplomacyRow, model: DealPanelModel, offerOpen: boolean): HTMLElement {
    let label = 'Their last word';
    let quote = model.peace ? 'You have my attention. Speak.' : 'Let us put something useful on the table.';
    let detail = model.peace
      ? 'You may include towns in the terms. Nothing changes hands until peace is agreed.'
      : 'Choose a luxury or a strategic resource on either side to add one copy to the offer.';
    let declined = false;
    if (offerOpen) {
      label = DRAWER_WORDS.waiting;
      quote = model.peace ? SLIP_WORDS.peaceOffer : SLIP_WORDS.offer;
      detail = SLIP_WORDS.offerDetail;
    } else if (considering === row.playerId) {
      label = 'Their answer';
      quote = 'One moment. Let me consider it.';
      detail = 'Their answer will appear here.';
    } else if (envoy?.seatId === row.playerId) {
      ({ quote, detail } = audienceCopy(envoy.answer));
      label = envoy.answer.accepted ? 'Agreement reached' : 'Offer declined';
      declined = !envoy.answer.accepted;
    } else if (counter?.seatId === row.playerId) {
      label = 'Their answer';
      quote = counter.answer.terms
        ? 'These are terms I could agree to.'
        : model.peace
          ? 'I am not ready to offer terms.'
          : 'There is no exchange I can offer you today.';
      detail = counter.answer.terms
        ? 'The proposed terms are on the table. You can edit them before sending.'
        : 'No counteroffer was made. You can revise your offer or return later.';
    }
    const slip = element('div', `dp-slip${declined ? ' is-declined' : ''}`);
    slip.setAttribute('role', 'status');
    slip.setAttribute('aria-live', 'polite');
    slip.title = detail;
    const said = element('p', 'dp-quote');
    said.append(element('span', 'dp-q', '“'), quote, element('span', 'dp-q', '”'));
    slip.append(element('span', 'dp-slip-label', label), said);
    return slip;
  }

  /** Declare war, with the confirm the ruling asks for. `key` keeps the focus. */
  function declareButton(row: DiplomacyRow, key: string): HTMLButtonElement {
    const declare = button('btn is-war-solid dp-war', '');
    declare.dataset.focus = key;
    declare.append(courtMarkNode('war', 'dp-war-mark'), document.createTextNode('Declare war'));
    if (row.declareError !== null) {
      declare.disabled = true;
      declare.title = row.declareError;
    } else {
      declare.title = `Open a war with the ${row.people}`;
      declare.addEventListener('click', () => {
        options.askConfirm(declareConfirm(row.people, row.war), () => {
          options.declareWar(row.playerId);
          forgetTalk();
          draw();
        });
      });
    }
    return declare;
  }

  /**
   * "Standing and deals", with the count of deals in force, and a cinnabar
   * dot when an offer of theirs waits for your answer (the board: "its button
   * says 2 deals and has a dot"). It opens the drawer over the trays.
   */
  function dealsButton(row: DiplomacyRow, model: DealPanelModel): HTMLButtonElement {
    const open = button(`btn dp-deals-btn${drawerOpen ? ' is-on' : ''}`, '');
    open.dataset.focus = 'drawer';
    open.setAttribute('aria-expanded', String(drawerOpen));
    open.setAttribute('aria-controls', 'diplomacy-standing');
    open.append(document.createTextNode(DRAWER_WORDS.title), element('b', 'dp-fig', figure(model.active.length)));
    const said = [`${figure(model.active.length)} in force`];
    if (row.waiting > 0) {
      open.append(element('i', 'dp-dot'));
      said.push(row.waiting === 1 ? 'An offer waits for your answer' : `${figure(row.waiting)} offers wait for your answer`);
    }
    open.title = said.join('. ');
    open.addEventListener('click', () => {
      drawerOpen = !drawerOpen;
      focusAfter = drawerOpen ? 'drawer-close' : 'drawer';
      draw();
    });
    return open;
  }

  /** Shuts the drawer and gives the keyboard back to its button. */
  function closeDrawer(): void {
    drawerOpen = false;
    focusAfter = 'drawer';
    draw();
  }

  /**
   * The act tabs over the desk. Exchange is the act at peace and Peace terms
   * the act at war; the other is drawn greyed with the reducer's sentence, so
   * a player can see both exist. The row has room for the acts to come.
   */
  function drawActs(row: DiplomacyRow, model: DealPanelModel): HTMLElement {
    const acts = element('nav', 'dp-acts');
    acts.setAttribute('aria-label', 'Acts');
    const exchange = button(`dp-act${model.peace ? ' is-off' : ' is-cur'}`, 'Exchange');
    const peace = button(`dp-act${model.peace ? ' is-cur' : ' is-off'}`, 'Peace terms');
    exchange.setAttribute('aria-current', model.peace ? 'false' : 'true');
    peace.setAttribute('aria-current', model.peace ? 'true' : 'false');
    if (model.peace) {
      exchange.setAttribute('aria-disabled', 'true');
      exchange.title =
        bargainSeatError(options.getState(), options.getPlayerId(), row.playerId) ?? 'Not at war';
    } else {
      peace.setAttribute('aria-disabled', 'true');
      peace.title = row.peaceError ?? 'Not at war';
    }
    acts.append(exchange, peace);
    return acts;
  }

  /** A group of chips inside a tray, with a label only when it needs one. */
  function group(label: string | null, note: string | null, className: string): { block: HTMLElement; chips: HTMLElement } {
    const block = element('section', `dp-group ${className}`);
    if (label !== null) {
      const head = element('p', 'dp-gl');
      head.append(element('span', '', label));
      if (note !== null) head.append(element('span', 'dp-gl-note', note));
      block.append(head);
    }
    const chips = element('div', 'dp-chips');
    block.append(chips);
    return { block, chips };
  }

  /**
   * One side's tray: everything that empire may put on the table, as chips,
   * in the board's order. The head says whose side it is and the gold in
   * hand. Then gold, the right of way, the luxuries (only this group scrolls
   * when a side has more than fit) and, in a peace, the towns.
   *
   * The chips carry their own words, so the groups have no labels, as the
   * board draws them. The towns keep one, because a town is given for good.
   */
  function drawTray(
    row: DiplomacyRow,
    model: DealPanelModel,
    side: DealSideModel,
    draft: DealDraft,
    half: 'give' | 'take',
  ): HTMLElement {
    const terms = draft[half];
    const tray = element('section', `dp-tray is-${half}`);
    tray.setAttribute('aria-label', half === 'give' ? 'You can give' : 'They can give');
    const head = element('div', 'dp-colh');
    const hand = element('span', 'dp-colh-gold');
    hand.append(element('b', 'dp-fig', figure(side.gold)), ' gold');
    head.append(element('b', '', half === 'give' ? 'You can give' : 'They can give'), hand);
    head.title = side.name;
    tray.append(head);

    const coin = group(null, null, 'is-gold');
    coin.chips.append(amountChip(row, model, side, draft, half, 'gold', 'Gold, once', null));
    coin.chips.append(
      amountChip(row, model, side, draft, half, 'goldPerTurn', 'Gold a turn', `${figure(RULES.war.dealTurns)} turns`),
    );
    tray.append(coin.block);

    const rights = group(null, null, 'is-rights');
    rights.chips.append(
      choiceChip(row, half, side.openBorders, 'openBorders', terms.openBorders === true, half === 'give' ? 'they may cross' : 'you may cross', (on) => {
        if (on) terms.openBorders = true;
        else delete terms.openBorders;
      }),
    );
    tray.append(rights.block);

    const seams = group(null, null, 'is-luxuries');
    seams.block.title = `One copy, lent ${figure(RULES.war.dealTurns)} turns.`;
    seams.chips.dataset.scroll = `luxuries:${half}`;
    if (side.luxuries.length === 0) seams.chips.append(element('p', 'dp-hid', 'No luxuries held.'));
    for (const choice of side.luxuries) {
      const id = choice.id;
      if (id === undefined) continue;
      seams.chips.append(
        choiceChip(row, half, choice, `luxury:${id}`, (terms.luxuries ?? []).includes(id), null, (on) => {
          const held = (terms.luxuries ?? []).filter((kept) => kept !== id);
          if (on) held.push(id);
          if (held.length > 0) terms.luxuries = held;
          else delete terms.luxuries;
        }),
      );
    }
    const hidden = hiddenLuxuriesLine(side.hidden);
    if (hidden !== null) seams.chips.append(element('p', 'dp-hid', hidden));
    tray.append(seams.block);

    // The strategic resources: their own short group after the luxuries, with
    // no heading because the luxuries have none. The chips carry the free
    // copies, and a chip with none is struck through (`strategicChoices`).
    const ores = group(null, null, 'is-strategics');
    ores.block.title =
      `One copy, lent ${figure(RULES.war.dealTurns)} turns. ` +
      'Units built with it keep fighting when the loan ends.';
    ores.chips.dataset.scroll = `strategics:${half}`;
    if (side.strategics.length === 0) ores.chips.append(element('p', 'dp-hid', STRATEGIC_WORDS.none));
    for (const choice of side.strategics) {
      const id = choice.id;
      if (id === undefined) continue;
      ores.chips.append(
        choiceChip(row, half, choice, `strategic:${id}`, (terms.strategics ?? []).includes(id), null, (on) => {
          const held = (terms.strategics ?? []).filter((kept) => kept !== id);
          if (on) held.push(id);
          if (held.length > 0) terms.strategics = held;
          else delete terms.strategics;
        }),
      );
    }
    tray.append(ores.block);

    // Towns change hands in a peace and nowhere else (ruling 9b), so the group
    // is drawn only on the peace terms.
    if (model.peace) {
      const towns = group('Towns', 'given for good', 'is-towns');
      if (side.cities.length === 0) towns.chips.append(element('p', 'dp-hid', 'There is no town to give.'));
      for (const choice of side.cities) {
        const cityId = choice.cityId;
        if (cityId === undefined) continue;
        towns.chips.append(
          choiceChip(row, half, choice, `city:${cityId}`, (terms.cities ?? []).includes(cityId), null, (on) => {
            const held = (terms.cities ?? []).filter((kept) => kept !== cityId);
            if (on) held.push(cityId);
            if (held.length > 0) terms.cities = held;
            else delete terms.cities;
          }),
        );
      }
      towns.chips.dataset.scroll = `towns:${half}`;
      tray.append(towns.block);
    }

    if (refusal !== null && refusal.seatId === row.playerId && refusal.half === half) {
      const say = element('p', 'dp-say', refusal.text);
      say.setAttribute('role', 'status');
      const under = tray.querySelector(`.dp-group.${refusal.group}`);
      if (under) under.after(say);
      else tray.append(say);
    }
    return tray;
  }

  /**
   * One chip for a term a side may put on the table: a luxury, a strategic
   * resource, the right of way, or a town.
   *
   * A strategic chip is a luxury chip with two differences: its figure is the
   * free copies and its short note is "last free" on the last one, and its
   * hover says when the receiver cannot use it yet (`DealChoice.unusable`).
   *
   * A luxury chip carries its mark, its name and the copies it can offer, and
   * a short note: "last" on a last copy, and the turns left on a copy the
   * other side holds only on loan (the luxury rule, batch SS4). A chip the
   * other side holds on loan is greyed, and still picked like any other,
   * because a copy lent now still counts when that loan ends. Picked, it names
   * the lender as well. The whole sentence is in its title.
   *
   * A chip the reducer refuses (`dealSideError`, `openBordersError`, a seat of
   * government) cannot be picked: a press shows the reducer's sentence in the
   * tray instead. It stays focusable, so a keyboard can reach the reason.
   */
  function choiceChip(
    row: DiplomacyRow,
    half: 'give' | 'take',
    choice: DealChoice,
    key: string,
    checked: boolean,
    hint: string | null,
    write: (on: boolean) => void,
  ): HTMLElement {
    const picked = checked && choice.error === null;
    const chip = button(`dp-chip${picked?' is-on':''}${choice.error!==null?' is-refused':''}${choice.onLoan?' is-greyed':''}`, '');
    chip.dataset.focus = `chip:${half}:${key}`;
    chip.setAttribute('aria-pressed', String(picked));
    if (choice.id !== undefined) chip.append(resourceMarkNode(choice.id));
    chip.append(element('span', 'dp-chip-name', choice.label));
    const titles: string[] = [];
    let short: string | null = hint;
    if (choice.copies !== undefined) {
      // **The figure is what can be offered, not what is held** (batch R4,
      // ruling 4: "only trade away available copies"). `spare` is
      // `lendableCopies`, which is `dealSideError`'s own reading, so the chip
      // and the refusal are one answer. The held count is in the title when
      // the two differ ("2 held" for one own copy and one borrowed). "last"
      // reads the held count: giving this copy leaves none.
      const spare = choice.spare ?? choice.copies;
      chip.append(element('b', 'dp-chip-count', figure(spare)));
      // A refused chip says why in the reducer's own words (`dealSideError`).
      const note = choice.error !== null ? choice.error
        : spare < 1 ? 'None to offer'
        : choice.copies === 1 ? 'Last copy'
        : spare < choice.copies ? `${figure(choice.copies)} held`
        : null;
      if (note !== null) titles.push(note);
      // A strategic chip marks the last *free* copy: units already built hold
      // the others, and lending this one stops the next unit, not the army.
      if (key.startsWith('strategic:')) {
        if (choice.lastFree === true && choice.error === null) short = 'last free';
      } else if (choice.copies === 1 && choice.error === null) short = 'last';
      // A receiver that has not revealed it can take it and use it later.
      if (choice.unusable !== undefined) titles.push(choice.unusable);
      // The luxury rule's two notes (batch SS4): the other side holds it only
      // on loan (the chip is greyed), or the giver's own copy is borrowed.
      if (choice.borrowed && choice.borrowedTurns !== undefined) {
        short = loanTurnsMark(choice.borrowedTurns);
        titles.push(loanSentence(choice.borrowed));
      }
      if (choice.onLoan && choice.onLoanTurns !== undefined) {
        short = loanTurnsMark(choice.onLoanTurns);
        if (picked) short += ` · ${choice.onLoan.parts.map((part) => part.from).join(', ')}`;
        titles.push(loanSentence(choice.onLoan));
      }
    } else if (choice.population !== undefined) {
      chip.append(element('b', 'dp-chip-count', figure(choice.population)));
      titles.push(choice.error ?? `Population ${figure(choice.population)}`);
    } else if (choice.error !== null) {
      titles.push(choice.error);
    }
    if (short !== null) chip.append(element('i', 'dp-chip-note', short));
    if (titles.length > 0) chip.title = titles.join('. ');
    if (choice.error !== null) {
      chip.setAttribute('aria-disabled', 'true');
      chip.addEventListener('click', () => {
        const group = key.startsWith('luxury:')
          ? 'is-luxuries'
          : key.startsWith('strategic:')
            ? 'is-strategics'
            : key.startsWith('city:') ? 'is-towns' : 'is-rights';
        refusal = { seatId: row.playerId, half, group, text: choice.error ?? '' };
        draw();
      });
    } else {
      chip.addEventListener('click', () => {
        takeOffer();
        write(!picked);
        refusal = null;
        draw();
      });
    }
    return chip;
  }

  /**
   * A gold chip. Gold is not on or off, so the chip opens a small amount field
   * when picked: a stepper and a typed figure, read with `readAmount` as the
   * old fields were. A figure the reducer refuses (more than the treasury
   * holds) marks the chip with `coinTermError`'s sentence. Pressing the chip's
   * name again takes the gold back off the table.
   */
  function amountChip(
    row: DiplomacyRow,
    model: DealPanelModel,
    side: DealSideModel,
    draft: DealDraft,
    half: 'give' | 'take',
    key: 'gold' | 'goldPerTurn',
    label: string,
    note: string | null,
  ): HTMLElement {
    const terms = draft[half];
    const value = terms[key] ?? 0;
    const openKey = `${row.playerId}:${half}:${key}`;
    const focusKey = `amount:${half}:${key}`;
    if (value <= 0 && !openAmounts.has(openKey)) {
      const chip = button('dp-chip is-amount', '');
      chip.dataset.focus = `chip:${half}:${key}`;
      chip.setAttribute('aria-pressed', 'false');
      chip.append(element('span', 'dp-chip-name', label));
      if (note !== null) chip.append(element('i', 'dp-chip-note', note));
      chip.addEventListener('click', () => {
        takeOffer();
        openAmounts.add(openKey);
        refusal = null;
        focusAfter = focusKey;
        draw();
      });
      return chip;
    }
    const receiver = half === 'give' ? row.playerId : options.getPlayerId();
    const errorOf = (amount: number): string | null =>
      amount > 0 ? coinTermError(options.getState(), side.playerId, receiver, key, amount, model.peace) : null;
    const wrap = element('span', 'dp-chip is-amount is-on is-open');
    const mark = (amount: number): void => {
      const error = errorOf(amount);
      wrap.classList.toggle('is-refused', error !== null);
      wrap.title = error ?? '';
    };
    // Presence is the state on a term, exactly as it is in the register: a
    // zero is *deleted* rather than written, so a paper with nothing on this
    // line is the empty object it would have been.
    const write = (amount: number): void => {
      if (amount > 0) terms[key] = amount;
      else delete terms[key];
    };
    const name = button('dp-chip-toggle', label);
    name.dataset.focus = `chip:${half}:${key}`;
    name.setAttribute('aria-pressed', 'true');
    name.title = 'Take it off the table';
    name.addEventListener('click', () => {
      takeOffer();
      delete terms[key];
      openAmounts.delete(openKey);
      draw();
    });
    const less = button('dp-step', '−');
    less.setAttribute('aria-label', `Less ${label.toLowerCase()}`);
    less.dataset.focus = `less:${half}:${key}`;
    less.disabled = value <= 0;
    less.addEventListener('click', () => {
      takeOffer();
      write(Math.max(0, (terms[key] ?? 0) - AMOUNT_STEP[key]));
      draw();
    });
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.inputMode = 'numeric';
    input.value = value > 0 ? String(value) : '';
    input.className = 'dp-amount';
    input.dataset.focus = focusKey;
    input.setAttribute('aria-label', label);
    // No full redraw on input, deliberately: rebuilding the sheet under a
    // cursor is how a number field loses focus mid-figure. The table under
    // the trays is redrawn, so the clause and the propose control follow
    // every figure.
    input.addEventListener('input', () => {
      const amount = readAmount(input.value);
      takeOffer();
      write(amount);
      mark(amount);
      less.disabled = amount <= 0;
      repaintTable();
    });
    const more = button('dp-step', '+');
    more.setAttribute('aria-label', `More ${label.toLowerCase()}`);
    more.dataset.focus = `more:${half}:${key}`;
    more.addEventListener('click', () => {
      takeOffer();
      write((terms[key] ?? 0) + AMOUNT_STEP[key]);
      draw();
    });
    wrap.append(name, less, input, more);
    // The note ("20 turns") moves to the title while the field is open, so the
    // open chip still fits a tray at the narrowest sheet.
    if (note !== null) name.title = `Take it off the table. ${note}`;
    mark(value);
    return wrap;
  }

  /** One side's clauses on the table, each with the × that takes it back. */
  function clauseList(heading: string, items: TermItem[], half: 'give' | 'take', draft: DealDraft | null): HTMLElement {
    const block = element('div', 'dp-cl');
    block.append(element('p', 'dp-cl-head', heading));
    const list = element('ul', 'dp-clauses-list');
    if (items.length === 0) list.append(element('li', 'is-nil', 'Nothing'));
    for (const item of items) {
      const line = element('li', '');
      line.append(element('span', 'dp-clause', item.text));
      if (draft !== null) {
        const take = button('dp-strike', '×');
        take.setAttribute('aria-label', `Take ${item.text} off the table`);
        take.dataset.focus = `clause:${half}:${item.key}`;
        take.addEventListener('click', () => {
          takeOffer();
          removeTerm(draft[half], item.key);
          if (item.key === 'gold' || item.key === 'goldPerTurn') {
            openAmounts.delete(`${selectedId ?? ''}:${half}:${item.key}`);
          }
          draw();
        });
        line.append(take);
      }
      list.append(line);
    }
    block.append(list);
    return block;
  }

  /**
   * "On the table": the deal as it stands, one column a side, as the board
   * draws it under the trays. `termItems` gives the same words `termLines`
   * prints for the offers and the deals in force, so what a player reads
   * while writing a bargain is word for word what the other seat will read
   * when it lands. Each clause has a × that takes it back. `extra` is the
   * head's last control: "Clear the table" under your own paper.
   */
  function paperBand(
    state: GameState,
    model: DealPanelModel,
    draft: DealDraft,
    title: string,
    runs: string | null,
    sentence: boolean,
    label: string,
    extra: HTMLElement | null,
  ): HTMLElement {
    const paper = element('article', 'dp-paper');
    paper.setAttribute('aria-label', label);
    const head = element('div', 'dp-paper-head');
    head.append(element('h3', 'dp-paper-title', title));
    if (runs !== null) head.append(element('p', `dp-runs${sentence ? ' is-sentence' : ''}`, runs));
    if (extra !== null) head.append(extra);
    const clauses = element('div', 'dp-clauses');
    clauses.dataset.scroll = 'paper';
    clauses.append(clauseList(`${model.yours.name} gives`, termItems(state, draft.give), 'give', draft));
    clauses.append(clauseList(`${model.theirs.name} gives`, termItems(state, draft.take), 'take', draft));
    paper.append(head, clauses);
    return paper;
  }

  /**
   * The table under the trays: the paper ("On the table"), the reducer's
   * sentence when the paper cannot be sent, the two questions, and the foot:
   * Declare war at its left, then "Standing and deals" and Propose at its
   * right (the board). With an offer of theirs open, the paper is their offer
   * and the answers take the questions' place (`drawOffer`).
   */
  function drawTable(state: GameState, model: DealPanelModel, draft: DealDraft, row: DiplomacyRow): HTMLElement {
    const table = element('div', 'dp-table');
    const foot = element('div', 'dp-foot');
    if (row.relation !== 'war') foot.append(declareButton(row, 'declare'));
    foot.append(element('span', 'dp-foot-gap'), dealsButton(row, model));
    if (reading !== null && reading.seatId === row.playerId) {
      const offer = drawOffer(state, model, row, reading.paper, draft);
      if (offer !== null) {
        table.append(offer.paper, offer.answers, foot);
        return table;
      }
      reading = null;
    }
    // Clearing is the interface's own verb and the only one on this sheet that
    // is: the draft is not a command and nothing in the simulation has heard of
    // it, so taking it back off the table asks nobody's permission.
    const empty = termsAreEmpty(draft.give) && termsAreEmpty(draft.take);
    const clear = button('dp-link', 'Clear the table');
    clear.dataset.focus = 'clear';
    if (empty) clear.classList.add('is-idle');
    clear.disabled = empty;
    clear.addEventListener('click', () => {
      draft.give = {};
      draft.take = {};
      openAmounts.clear();
      draw();
    });
    table.append(
      paperBand(
        state,
        model,
        draft,
        'On the table',
        // An empty exchange says nothing under the title: each side already
        // says "Nothing".
        empty && !model.peace ? null : paperRunsLine(state.turn, model.peace, draft.give, draft.take),
        model.peace,
        'The paper',
        clear,
      ),
    );

    const refused = empty ? null : draftError(state, options.getPlayerId(), row.playerId, draft, model.peace);
    const note = model.blocked ?? refused;
    if (note !== null) table.append(element('p', 'dp-say', note));
    const last = model.yours.luxuries.filter((c) => c.copies === 1 && c.id && (draft.give.luxuries ?? []).includes(c.id));
    if (last.length) {
      table.append(
        element(
          'p',
          'dp-warn',
          `You are offering your last copy of ${last.map((c) => c.label).join(', ')}. You will lose access while the exchange runs.`,
        ),
      );
    }
    const lastFree = model.yours.strategics.filter(
      (c) => c.lastFree === true && c.id !== undefined && (draft.give.strategics ?? []).includes(c.id),
    );
    if (lastFree.length) table.append(element('p', 'dp-warn', lastFreeCopyLine(lastFree.map((c) => c.label))));

    const ask = element('div', 'dp-ask');
    ask.append(...drawCounterVerbs(model, draft, row));
    table.append(ask);

    const send = button('btn btn-primary dp-send', dealButtonLabel(model, empty));
    send.dataset.focus = 'send';
    if (model.blocked !== null) {
      send.disabled = true;
      send.title = model.blocked;
    } else if (considering === row.playerId) {
      send.disabled = true;
      send.title = 'Waiting for their answer';
    } else if (empty && !model.peace) {
      send.disabled = true;
      send.title = 'Put something on the table first';
    } else if (refused !== null) {
      send.disabled = true;
      send.title = refused;
    } else {
      if (model.peace) {
        send.title =
          'These terms become the peace. Writing new terms takes back whatever either of you had already signed.';
      }
      send.addEventListener('click', () => {
        const prior = new Set(options.getState().dealProposals.map((p) => p.id));
        if (model.peace) options.offerPeace(row.playerId, true, { give: draft.give, take: draft.take });
        else options.proposeDeal(row.playerId, draft.give, draft.take);
        // **The answer, at once** (§12). The paper has just been logged, so the
        // empire it was put to is asked before anything else happens. That is
        // the whole of the audience: a player who proposes gets an answer while
        // they are still standing at the table.
        if (model.peace || options.getState().dealProposals.some((p) => p.by === options.getPlayerId() && p.to === row.playerId && !prior.has(p.id))) {
          askAudienceFor(row.playerId, model.peace, true);
        }
        draw();
      });
    }
    foot.append(send);
    table.append(foot);
    return table;
  }

  /**
   * The terms of an offer of theirs, from your side (`give` is what you would
   * hand over), or `null` when it is no longer there. A copy, so the offer in
   * the register is never edited through the trays.
   */
  function offerDraft(state: GameState, row: DiplomacyRow, which: number | 'peace'): DealDraft | null {
    const seat = options.getPlayerId();
    if (which === 'peace') {
      if (!row.theyOffered || row.weOffered) return null;
      const standing = peaceTermsOn(state, seat, row.playerId);
      if (standing === null) return { give: {}, take: {} };
      return {
        give: copyTerms(sideOfPeace(standing, seat, row.playerId)),
        take: copyTerms(sideOfPeace(standing, row.playerId, seat)),
      };
    }
    const raw = state.dealProposals.find((paper) => paper.id === which && paper.by === row.playerId && paper.to === seat);
    return raw ? { give: copyTerms(raw.take), take: copyTerms(raw.give) } : null;
  }

  /**
   * An offer from the other empire, opened on the table (batch SS6): their
   * bargain, or their peace. Their terms are loaded on the table and shown in
   * the trays, and the slip under the portrait asks for your answer. The
   * answers sit under the table: Accept and Decline (for a peace, the peace
   * button and "Send them home"), and "Change the terms", which makes their
   * terms your draft to edit and send as your own proposal. Any edit to a chip
   * or a clause does the same. Their offer stands until it is answered.
   *
   * `null` when the offer is no longer there.
   */
  function drawOffer(
    state: GameState,
    model: DealPanelModel,
    row: DiplomacyRow,
    which: number | 'peace',
    shown: DealDraft,
  ): { paper: HTMLElement; answers: HTMLElement } | null {
    const seat = options.getPlayerId();
    const answers = element('div', 'dp-ask is-answer');
    let title: string;
    let runs: string;
    if (which === 'peace') {
      if (!row.theyOffered || row.weOffered) return null;
      title = 'Their peace terms';
      runs = paperRunsLine(state.turn, true, shown.give, shown.take);
      const accept = button('btn btn-primary', peaceButtonLabel(row));
      accept.dataset.focus = 'offer-accept';
      if (row.peaceError !== null) {
        accept.disabled = true;
        accept.title = row.peaceError;
      } else {
        accept.title = 'Sign their terms. The war ends now.';
        accept.addEventListener('click', () => {
          options.offerPeace(row.playerId, true);
          // A peace put up is a paper like any other, and it is answered at
          // once (§12).
          askAudienceFor(row.playerId, true);
          reading = null;
          draw();
        });
      }
      answers.append(accept);
      // The third answer, and the one a peace offer never had: a paper put to
      // you may be **refused**, which takes it off the table (§12).
      const home = button('btn', 'Send them home');
      home.dataset.focus = 'offer-decline';
      const declineError = model.peacePaper?.declineError ?? declinePeaceError(state, seat, row.playerId);
      if (declineError !== null) {
        home.disabled = true;
        home.title = declineError;
      } else {
        home.title = `Refuse the ${row.people}' terms and take them off the table`;
        home.addEventListener('click', () => {
          options.declinePeace(row.playerId);
          forgetTalk();
          draw();
        });
      }
      answers.append(home);
    } else {
      const proposal = model.proposals.find((paper) => paper.id === which && !paper.mine);
      if (!proposal) return null;
      title = 'Their offer';
      runs = paperRunsLine(state.turn, false, shown.give, shown.take);
      const accept = button('btn btn-primary', 'Accept');
      accept.dataset.focus = 'offer-accept';
      if (proposal.acceptError !== null) {
        accept.disabled = true;
        accept.title = proposal.acceptError;
      } else {
        accept.addEventListener('click', () => {
          options.answerDeal(proposal.id, true);
          reading = null;
          draw();
        });
      }
      const decline = button('btn', 'Decline');
      decline.dataset.focus = 'offer-decline';
      decline.addEventListener('click', () => {
        options.answerDeal(proposal.id, false);
        reading = null;
        draw();
      });
      answers.append(accept, decline);
    }
    const change = button('btn', 'Change the terms');
    change.dataset.focus = 'offer-change';
    change.title = 'Make their terms your paper, to edit and send as your own proposal';
    change.addEventListener('click', () => {
      takeOffer();
      focusAfter = 'send';
      draw();
    });
    const back = button('btn btn-quiet', 'Back to your paper');
    back.dataset.focus = 'offer-back';
    back.addEventListener('click', () => {
      reading = null;
      draw();
    });
    answers.append(change, back);
    const paper = paperBand(state, model, shown, title, runs, which === 'peace', 'Their offer', null);
    paper.classList.add('is-offer');
    return { paper, answers };
  }

  /**
   * Redraws the table under the trays alone, and the court's slip, so a
   * figure being typed keeps its field and its cursor. A figure typed into
   * their offer makes it your draft, so the slip stops asking for an answer.
   */
  function repaintTable(): void {
    const state = options.getState();
    const row = chosenCourt(courtStrip(state, options.getPlayerId()), selectedId);
    if (!row) return;
    const model = dealPanel(state, options.getPlayerId(), row.playerId);
    body.querySelector('.dp-table')?.replaceWith(drawTable(state, model, draftFor(row.playerId), row));
    const offerOpen = reading !== null && reading.seatId === row.playerId;
    body.querySelector('.dp-slip')?.replaceWith(drawSlip(row, model, offerOpen));
    markOverflow();
  }

  /**
   * Fades the foot of a list that has more below it than it shows (the
   * paper's clauses, a long luxury group, the strip), so a cut row reads as
   * "scroll for more" rather than as a fault. Asked after layout, on every
   * draw.
   */
  function markOverflow(): void {
    for (const node of body.querySelectorAll<HTMLElement>('[data-scroll]')) {
      const mark = (): void => {
        node.classList.toggle('is-overflow', node.scrollTop + node.clientHeight < node.scrollHeight - 1);
      };
      mark();
      node.onscroll = mark;
    }
  }

  /**
   * The two questions a player may put to the empire across the table before
   * they send anything (§12).
   *
   * Both are **pure reads**: nothing is proposed, the answer is written into the
   * draft, and the player sends it, or edits it first, which is the reason it
   * goes into the draft rather than onto a card of its own.
   *
   * Each is greyed with its own reason when it has nothing to ask about, this
   * interface's rule everywhere a gate exists: a button that vanishes is a rule
   * a player cannot learn.
   */
  function drawCounterVerbs(model: DealPanelModel, draft: DealDraft, row: DiplomacyRow): HTMLElement[] {
    const offering = !termsAreEmpty(draft.give);
    const anything = offering || !termsAreEmpty(draft.take);

    const work = button('btn', 'What would make this work?');
    work.dataset.focus = 'work';
    if (model.blocked !== null) {
      work.disabled = true;
      work.title = model.blocked;
    } else if (!anything && !model.peace) {
      work.disabled = true;
      work.title = 'Put something on the table first';
    } else {
      work.title = `Ask the ${row.people} what would make this paper work`;
      work.addEventListener('click', () => {
        askCounterFor(row.playerId, draft, 'work');
        draw();
      });
    }

    const gift = button('btn', 'What would you give for this?');
    gift.dataset.focus = 'gift';
    if (model.blocked !== null) {
      gift.disabled = true;
      gift.title = model.blocked;
    } else if (!offering) {
      // The question is "for this", and there has to be a *this*: the paper it
      // asks about offers something and asks for nothing (`counterTerms`).
      gift.disabled = true;
      gift.title = 'Offer something first';
    } else {
      gift.title = `Ask the ${row.people} what they would give for what you offer`;
      gift.addEventListener('click', () => {
        askCounterFor(row.playerId, draft, 'give');
        draw();
      });
    }
    return [work, gift];
  }

  /**
   * Puts the paper that was just sent to the empire it was sent to.
   *
   * The bargain has an id and the peace paper has none (it rides on the war
   * row, `wars.ts`), so the id is looked up here, off the register, rather
   * than being remembered from the command: the reducer allocates it, and
   * reading it back is the one way this file can be sure it is naming the
   * paper that actually landed.
   */
  function askAudienceFor(targetId: number, peace: boolean, clearOnYes = false): void {
    envoy = null;
    counter = null;
    considering = null;
    audiencesAsked += 1;
    const ask = options.askAudience;
    if (ask === undefined) return;
    if (peace) {
      hear(targetId, ask(targetId), (answer) => ({ ...answer, peace: true }), clearOnYes);
      return;
    }
    const seat = options.getPlayerId();
    const papers = options
      .getState()
      .dealProposals.filter((paper) => paper.by === seat && paper.to === targetId);
    const paper = papers[papers.length - 1];
    if (!paper) return;
    // A luxury they hold one copy of, or a strategic resource they have one
    // free copy of: the copy the envoy's refusal is most likely about.
    const state = options.getState();
    const lastCopy =
      (paper.take.luxuries ?? []).find((id) => resourceCopies(state, targetId, id) === 1) ??
      (paper.take.strategics ?? []).find((id) => lendableCopies(state, targetId, id) === 1);
    hear(
      targetId,
      ask(targetId, paper.id),
      (answer) => ({ ...answer, ...(lastCopy ? { lastCopy: resourceDef(lastCopy).name } : {}) }),
      clearOnYes,
    );
  }

  /**
   * Takes the envoy's answer, now or when it arrives. A later answer redraws the
   * sheet, unless a newer question has been asked since or the sheet is down.
   * `clearOnYes` empties that seat's draft on a yes, as the send button does.
   */
  function hear(
    targetId: number,
    reply: EnvoyAnswer | null | Promise<EnvoyAnswer | null>,
    dress: (answer: EnvoyAnswer) => EnvoyAnswer,
    clearOnYes: boolean,
  ): void {
    const settle = (answer: EnvoyAnswer | null): void => {
      if (answer === null) return;
      envoy = { seatId: targetId, answer: dress(answer) };
      if (clearOnYes && answer.accepted) {
        const draft = drafts.get(targetId);
        if (draft) {
          draft.give = {};
          draft.take = {};
        }
      }
    };
    if (!(reply instanceof Promise)) {
      settle(reply);
      return;
    }
    const asked = audiencesAsked;
    considering = targetId;
    void reply.then((answer) => {
      if (asked !== audiencesAsked) return;
      considering = null;
      settle(answer);
      if (shell.isOpen) draw();
    });
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
      openAmounts.clear();
    }
  }

  /** One offer in the drawer, with the button that answers it. */
  function waitRow(text: OfferLine, action: HTMLButtonElement, mine: boolean): HTMLElement {
    const wait = element('div', `dp-wait${mine ? ' is-mine' : ''}`);
    if (!mine) wait.append(courtMarkNode('envelope', 'dp-envelope'));
    const words = element('span', 'dp-wait-text');
    words.append(element('b', '', text.head), document.createTextNode(text.text));
    wait.append(words, action);
    return wait;
  }

  /**
   * **The drawer** (fourth pass, `frame-2-drawer`, the answer to the user's
   * "What happens if you click standing and deals?"): it covers the trays and
   * the table, and lists where you stand with this court and the deals
   * between you, every line from `standingAndDeals`. The × and Escape close
   * it back to the trays. Reading an offer closes it and opens the offer on
   * the table.
   */
  function drawDrawer(state: GameState, row: DiplomacyRow, model: DealPanelModel): HTMLElement {
    const read = standingAndDeals(state, options.getPlayerId(), row, model);
    const drawer = element('aside', 'dp-drawer');
    drawer.id = 'diplomacy-standing';
    drawer.setAttribute('aria-label', DRAWER_WORDS.title);

    const head = element('div', 'dp-drawer-head');
    const shut = button('statecraft-close dp-drawer-close', '×');
    shut.setAttribute('aria-label', DRAWER_WORDS.close);
    shut.dataset.focus = 'drawer-close';
    shut.addEventListener('click', closeDrawer);
    head.append(element('h3', 'dp-drawer-title', DRAWER_WORDS.title), element('span', 'dp-drawer-back', DRAWER_WORDS.back), shut);
    drawer.append(head);

    drawer.append(heading(DRAWER_WORDS.standing));
    for (const line of read.standing) {
      const node = element('div', `dp-ln${line.relation === undefined ? '' : ` is-${line.relation}`}`);
      node.append(element('span', '', line.label), element('b', '', line.value));
      drawer.append(node);
    }

    const force = heading(DRAWER_WORDS.inForce, DRAWER_WORDS.turnsLeft);
    force.title = dealFootSentence();
    drawer.append(force);
    if (read.inForce.length === 0) drawer.append(element('p', 'dp-none', `Nothing stands between you and the ${row.people}.`));
    for (const deal of read.inForce) {
      const line = element('div', 'dp-deal');
      const terms = element('span', 'dp-deal-terms');
      terms.append(
        element('span', '', `You give ${deal.give.join(', ')}`),
        element('span', '', `You receive ${deal.take.join(', ')}`),
      );
      const left = element('b', 'dp-deal-left', figure(deal.turnsLeft));
      left.title = deal.turnsLeft === 1 ? 'One turn left' : `${figure(deal.turnsLeft)} turns left`;
      line.append(terms, left);
      drawer.append(line);
    }

    drawer.append(heading(DRAWER_WORDS.waiting));
    if (read.waiting.length === 0) drawer.append(element('p', 'dp-none', DRAWER_WORDS.none));
    for (const item of read.waiting) {
      const open = button('btn dp-small', DRAWER_WORDS.read);
      open.append(courtMarkNode('arrow', 'dp-arrow'));
      open.dataset.focus = `read:${item.paper}`;
      open.addEventListener('click', () => {
        reading = { seatId: row.playerId, paper: item.paper };
        drawerOpen = false;
        draw();
      });
      drawer.append(waitRow(item, open, false));
    }

    drawer.append(heading(DRAWER_WORDS.mine));
    if (read.mine.length === 0) drawer.append(element('p', 'dp-none', DRAWER_WORDS.none));
    for (const item of read.mine) {
      const take = button('btn dp-small', item.action);
      take.dataset.focus = item.paper === 'peace' ? 'peace' : `withdraw:${item.paper}`;
      if (item.error !== null) {
        take.disabled = true;
        take.title = item.error;
      } else {
        const paper = item.paper;
        if (paper === 'peace') {
          take.title = 'Take your offer back off the table';
          take.addEventListener('click', () => {
            options.offerPeace(row.playerId, false);
            draw();
          });
        } else {
          take.addEventListener('click', () => {
            options.withdrawDeal(paper);
            draw();
          });
        }
      }
      drawer.append(waitRow(item, take, true));
    }
    return drawer;
  }

  /**
   * The desk: the act tabs, one tray a side, and the table under them, with
   * the drawer over all three while it is open.
   *
   * The shape the user asked for (2026-09-03: *"steal inspiration from civ and
   * make our trade screen a bit more similar"*), laid out as layout B with the
   * strip of courts. Every greyed control carries the simulation's own
   * sentence, and every write is a command handed out through `options`: this
   * file never touches the state, which is the bargain
   * `diplomacyScreen.test.ts` pins by reading the source.
   */
  function drawDesk(state: GameState, row: DiplomacyRow, model: DealPanelModel, shown: DealDraft, offerOpen: boolean): HTMLElement {
    const desk = element('section', `dp-desk${offerOpen ? ' is-reading' : ''}`);
    desk.setAttribute('aria-label', `The table with the ${row.people}`);
    desk.append(drawActs(row, model));
    const trays = element('div', 'dp-trays');
    trays.append(drawTray(row, model, model.yours, shown, 'give'), drawTray(row, model, model.theirs, shown, 'take'));
    desk.append(trays, drawTable(state, model, shown, row));
    if (drawerOpen) desk.append(drawDrawer(state, row, model));
    return desk;
  }

  function draw(): void {
    // The shell never paints a sheet that is down (`refresh` guards, `open`
    // shows first), and every gesture below only exists while it is up.
    const state = options.getState();
    const seat = options.getPlayerId();
    if (draftGame !== state || draftSeat !== seat) {
      drafts.clear();
      forgetTalk();
      considering = null;
      audiencesAsked += 1;
      openAmounts.clear();
      selectedId = null;
      drawerOpen = false;
      draftGame = state;
      draftSeat = seat;
    }
    // The focus and the scrolled lists are kept by key across the redraw, so a
    // chip picked with the keyboard keeps the focus, and a long luxury list
    // stays where it was scrolled.
    const active = document.activeElement;
    const focusKey =
      focusAfter ?? (active instanceof HTMLElement && body.contains(active) ? (active.dataset.focus ?? null) : null);
    focusAfter = null;
    const scrolls = new Map<string, number>();
    for (const node of body.querySelectorAll<HTMLElement>('[data-scroll]')) {
      scrolls.set(node.dataset.scroll ?? '', node.scrollTop);
    }
    body.replaceChildren();

    // Every other court at the table is on the strip; only the courts this
    // seat has met can be chosen (the ruling). The strip and the desk read the
    // same list, so the desk can never be drawing a court the strip hides.
    const strip = courtStrip(state, seat);
    const chosen = chosenCourt(strip, selectedId);
    if (chosen?.playerId !== selectedId) reading = null;
    selectedId = chosen?.playerId ?? null;
    paintFacts(state, strip);

    const room = element('div', 'dp-room');
    tip = element('div', 'dp-tip');
    tip.hidden = true;
    tip.setAttribute('aria-hidden', 'true');
    room.append(drawStrip(strip, chosen));
    if (chosen === null) {
      const empty = element('section', 'dp-desk is-empty');
      empty.append(
        element(
          'p',
          'dp-none',
          strip.length === 0
            ? 'There is nobody to bargain with yet.'
            : 'You have met nobody yet. Send somebody out to look: an empire whose land, ' +
                'town or people you find appears here.',
        ),
      );
      room.append(empty);
      adoptOffer = null;
    } else {
      const model = dealPanel(state, seat, chosen.playerId);
      const draft = draftFor(chosen.playerId);
      trimTownTerms(draft.give, model.yours.cities);
      trimTownTerms(draft.take, model.theirs.cities);
      const offer = reading !== null && reading.seatId === chosen.playerId ? offerDraft(state, chosen, reading.paper) : null;
      if (offer === null) reading = null;
      adoptOffer =
        offer === null
          ? null
          : () => {
              drafts.set(chosen.playerId, offer);
              reading = null;
              envoy = null;
              counter = null;
              openAmounts.clear();
              adoptOffer = null;
            };
      room.append(drawFigure(state, chosen, model, offer !== null));
      room.append(drawDesk(state, chosen, model, offer ?? draft, offer !== null));
    }
    body.append(room, tip);

    for (const node of body.querySelectorAll<HTMLElement>('[data-scroll]')) {
      const top = scrolls.get(node.dataset.scroll ?? '');
      if (top !== undefined) node.scrollTop = top;
    }
    markOverflow();
    if (focusKey !== null) {
      const target = Array.from(body.querySelectorAll<HTMLElement>('[data-focus]')).find(
        (node) => node.dataset.focus === focusKey,
      );
      target?.focus({ preventScroll: true });
    }
  }

  /**
   * The arrow keys on the strip: move the keyboard to the next met court
   * (`stripStep`). Moving does not choose; Enter (a press of the mark) does.
   * `true` when the key was the strip's.
   */
  function stepStrip(event: KeyboardEvent): boolean {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active.dataset.court === undefined || !body.contains(active)) return false;
    const strip = courtStrip(options.getState(), options.getPlayerId());
    const next = stripStep(strip, Number(active.dataset.court), event.key);
    if (next === null) return false;
    event.preventDefault();
    body.querySelector<HTMLElement>(`[data-court="${next}"]`)?.focus();
    return true;
  }

  /**
   * The frame (`modalShell.ts`): `hidden` is the whole of the screen state, the
   * ×, Escape and a press on the ground all arrive at one `close`, and the
   * disposer is the game's.
   *
   * What it hangs on the shell is the Trade sheet's rule for its own chooser:
   * **which court was on the desk is a fact about this opening**, so a sheet
   * opened tomorrow starts at the top of the strip. The half-written papers are
   * not: a draft is the player's own work and outlives the screen.
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    doors: options.doors,
    onOpen: () => options.onOpen?.(),
    draw,
    onKey: (event) => {
      if(event.defaultPrevented)return true;
      // Escape shuts the "Standing and deals" drawer before it shuts the sheet.
      if (event.key === 'Escape' && drawerOpen) {
        closeDrawer();
        return true;
      }
      if (stepStrip(event)) return true;
      if(event.key!=='Tab')return false;
      // The strip keeps one tab stop (the chosen court); its other marks are
      // reached with the arrow keys, so they are not counted here.
      const nodes=Array.from(overlay.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]),input:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length);
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();return true;}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();return true;}
      return false;
    },
    onClose: () => {
      selectedId = null;
      forgetTalk();
      openAmounts.clear();
      drawerOpen = false;
      hideTip();
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open(targetId?: number, offer?: number | 'peace') {
      const state = options.getState(), seat = options.getPlayerId();
      if (draftGame !== state || draftSeat !== seat) {
        drafts.clear(); forgetTalk(); openAmounts.clear(); selectedId = null; drawerOpen = false;
        draftGame = state; draftSeat = seat;
      }
      if (targetId !== undefined && targetId !== selectedId) {
        selectedId = targetId;
        forgetTalk();
      }
      if (targetId !== undefined && offer !== undefined) {
        reading = { seatId: targetId, paper: offer };
        drawerOpen = false;
      }
      if (shell.isOpen) shell.refresh(); else shell.open();
    },
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
