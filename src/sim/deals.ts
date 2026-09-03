/**
 * What two empires have agreed to — the register, its readings, and nothing
 * that *does* anything.
 *
 * `wars.ts`' sibling, and deliberately the same shape twice over: a deal is a
 * **symmetric pair relation** written with the lower player id in `a`, its
 * expiry is an **absolute turn** compared against `state.turn`, and the file
 * that changes it is a layer up (`diplomacy.ts`) where a verb can reach the
 * treasury, the city rules and the trade rules. Nothing here validates
 * anything; every gate is a `…Error` in `diplomacy.ts`.
 *
 * Why this is a leaf
 * ------------------
 * Three of the lowest modules in the simulation read it — the movement
 * evaluator (open borders is a clause beside `atWar` in `closedBordersFor`),
 * the resource rule (`openedResource` in `cities.ts`), and the empire ledger
 * (`explainEmpireGold`) — so it may import nothing that imports them. It takes
 * `state.ts`, the resource table and the rule book and stops there, exactly as
 * `wars.ts` does one system over. `state.ts` names the shapes below in a
 * **type-only** import, the documented exception: nothing runs across that
 * arrow.
 *
 * A proposal is not a deal
 * ------------------------
 * They live in two arrays — `state.deals` and `state.dealProposals` — rather
 * than in one array with a flag, and that is the whole reason nothing in this
 * file has to remember to filter. Every row in `deals` is a bargain both seats
 * signed, so a reader that walked the register and forgot a `proposed` check
 * would be a reader that let one empire lend itself another's silk by *asking*
 * for it. There is no such check to forget.
 *
 * Nothing here counts down
 * ------------------------
 * `DealState.untilTurn` is absolute, the discipline `TimedEffect` and
 * `Truce.untilTurn` keep: a deal that has run out is already inert — every
 * reading below asks `dealIsLive` first — and `pruneDeals` is a broom rather
 * than a clock, so deleting nothing would change no outcome.
 */

import { RULES } from './rulesData';
import { type ResourceId, resourceDef } from './resourceData';
import { type GameState, isBarbarian, playerById } from './state';

/**
 * One side's half of a bargain: everything one empire hands the other.
 *
 * Every key is optional and **presence is the state**, so an empire that gives
 * nothing is `{}` and serialises as such. The five shapes are the whole of what
 * v1 trades (`docs/war-diplomacy.md`, section 7), and each one is executed
 * through a seam that already existed rather than through a mechanism of its
 * own — which is what keeps a term a *line* on somebody's ledger instead of a
 * second arithmetic beside it.
 */
export interface DealTerms {
  /** Coin moved **once**, at the moment the bargain is struck. */
  gold?: number;
  /**
   * Coin moved **every turn** for the deal's life — a line in both empires'
   * `explainEmpireGold` ("Tribute to the …", "Tribute from the …").
   */
  goldPerTurn?: number;
  /**
   * Luxuries **lent**, by id: for the deal's life they count as held by the
   * receiver and not by the giver (`openedResource` in `cities.ts`). The
   * happiness simply moves — see `lentAwayBy` for why lending your only copy
   * is legal.
   */
  luxuries?: ResourceId[];
  /**
   * This side's borders are open: the other empire's soldiers may cross its
   * territory at peace. Granted per side, so a one-sided right of way is
   * expressible; the *gate* is mutual (both empires must hold the writing
   * ability — `diplomacy.ts`).
   */
  openBorders?: true;
  /**
   * Cities ceded, by id. **Peace deals only** (the ruling, 9b) — an ordinary
   * deal naming a city is refused in plain words.
   */
  cities?: number[];
}

/**
 * A struck bargain, as the unordered pair it is.
 *
 * `a < b` always, `WarState`'s key exactly and for its reason: it is what makes
 * "is there a row for this pair" one comparison, and `terms.a` / `terms.b` are
 * keyed by the same two ids so a reading never has to work out whose half is
 * whose. `openDeal` is the only place a row is built and it orders the pair
 * itself.
 *
 * Unlike a war there may be **several** rows for one pair: two empires can hold
 * a tribute struck ten turns ago and a right of way struck this turn, each with
 * its own clock. Rows are appended, so `state.deals` is in signing order — an
 * order the state itself carries, which is what every contention in this
 * codebase resolves by.
 */
export interface DealState {
  id: number;
  a: number;
  b: number;
  /** What each side hands over. Keyed by the row's own `a` and `b`. */
  terms: { a: DealTerms; b: DealTerms };
  /** Absolute turn it runs to. Nothing counts down (see the docblock). */
  untilTurn: number;
}

/**
 * A bargain one empire has put to another and that nobody has signed.
 *
 * Written from the **proposer's** side — `give` is what they are offering,
 * `take` what they are asking — because that is how both the screen's two
 * columns and the sentence a player reads are shaped, and translating once at
 * acceptance is cheaper than translating at every surface. `turn` is kept for
 * the sentence a screen says and for nothing else; no rule reads it.
 */
export interface DealProposal {
  id: number;
  /** Who proposed it. */
  by: number;
  /** Who is being asked. */
  to: number;
  /** What the proposer hands over. */
  give: DealTerms;
  /** What the proposer asks for. */
  take: DealTerms;
  /** `state.turn` when it was made. */
  turn: number;
}

/**
 * Terms riding on a standing peace offer (`WarState.terms`).
 *
 * Peace with terms is **not** two independent flags the way a white peace is:
 * one seat writes the paper and the other signs it, so the row records who
 * wrote it. `a` and `b` are keyed by the war row's own two ids, exactly as
 * `DealState.terms` is, so the settlement never has to work out whose half is
 * whose. See `proposePeaceError` for what a counter-offer does to a signature
 * already on the table.
 */
export interface PeaceTerms {
  /** Who put this paper on the table. */
  by: number;
  a: DealTerms;
  b: DealTerms;
}

/** The pair, ordered — the key every row in the register is written with. */
function pair(x: number, y: number): { a: number; b: number } {
  return x <= y ? { a: x, b: y } : { a: y, b: x };
}

/**
 * A canonical string for one half of a bargain — the one place two sets of
 * terms are compared for sameness.
 *
 * Written field by field in a fixed order rather than through `JSON.stringify`,
 * because the key order of an object built by a command that arrived over a
 * wire is not something this simulation may depend on. Lists are printed in the
 * order they were named, which is deliberate: a proposal offering wine then
 * silk is a different paper from one offering silk then wine only in the sense
 * that re-sending it is a *change*, and refusing an identical re-send is all
 * this is for.
 */
export function termsKey(terms: DealTerms): string {
  return [
    String(terms.gold ?? 0),
    String(terms.goldPerTurn ?? 0),
    (terms.luxuries ?? []).join('+'),
    terms.openBorders === true ? 'open' : '',
    (terms.cities ?? []).join('+'),
  ].join('/');
}

/** Is there anything in this half of a bargain at all? */
export function termsAreEmpty(terms: DealTerms): boolean {
  return (
    (terms.gold ?? 0) === 0 &&
    (terms.goldPerTurn ?? 0) === 0 &&
    (terms.luxuries ?? []).length === 0 &&
    terms.openBorders !== true &&
    (terms.cities ?? []).length === 0
  );
}

/**
 * Does this half of a bargain leave anything **standing** once it is struck?
 *
 * The question that decides whether a signature writes a row at all. Coin and
 * cities move once and are then simply history — a treasury that has been paid
 * and a town that has changed hands are facts about the board, not clauses
 * anybody has to keep reading — so a deal made entirely of those opens no row
 * and has nothing to expire. A tribute, a lent seam and a right of way are the
 * three that go on being true, and they are what `untilTurn` is for.
 */
export function termsAreOngoing(terms: DealTerms): boolean {
  return (
    (terms.goldPerTurn ?? 0) > 0 ||
    (terms.luxuries ?? []).length > 0 ||
    terms.openBorders === true
  );
}

/** True when both halves are instantaneous — see `termsAreOngoing`. */
export function dealIsOngoing(give: DealTerms, take: DealTerms): boolean {
  return termsAreOngoing(give) || termsAreOngoing(take);
}

/**
 * The part of a half that goes on being true — the only part a row keeps.
 *
 * **A deal row is what still stands, not what was agreed.** The lump has been
 * paid and the town has changed hands by the time the row is written, so
 * carrying them would leave a register saying "this empire gives forty coins"
 * about a payment that is already history — a sentence a screen would print
 * every turn for twenty turns, and a figure a later reader could pay twice. The
 * bargain as struck is in the log, which is where a record of what happened
 * belongs.
 */
export function ongoingPart(terms: DealTerms): DealTerms {
  const kept: DealTerms = {};
  if ((terms.goldPerTurn ?? 0) > 0) kept.goldPerTurn = terms.goldPerTurn;
  if ((terms.luxuries ?? []).length > 0) kept.luxuries = [...terms.luxuries!];
  if (terms.openBorders === true) kept.openBorders = true;
  return kept;
}

/**
 * Is this row still in force?
 *
 * **Live** is the whole of every reading below, `truceBetween`'s discipline
 * exactly: a row whose `untilTurn` has arrived is already spent, whether or not
 * the broom has got to it, so the comparison lives here once and nothing
 * downstream ever compares a turn itself.
 */
export function dealIsLive(state: GameState, deal: DealState): boolean {
  return state.turn < deal.untilTurn;
}

/** Every live deal this empire is party to, in signing order. */
export function dealsOf(state: GameState, playerId: number): DealState[] {
  const list: DealState[] = [];
  for (const deal of state.deals) {
    if (deal.a !== playerId && deal.b !== playerId) continue;
    if (!dealIsLive(state, deal)) continue;
    list.push(deal);
  }
  return list;
}

/** Every live deal between this pair, in signing order. */
export function dealsBetween(state: GameState, x: number, y: number): DealState[] {
  if (x === y) return [];
  const { a, b } = pair(x, y);
  const list: DealState[] = [];
  for (const deal of state.deals) {
    if (deal.a !== a || deal.b !== b) continue;
    if (!dealIsLive(state, deal)) continue;
    list.push(deal);
  }
  return list;
}

/** The row with this id, live or spent, or `undefined`. */
export function dealById(state: GameState, id: number): DealState | undefined {
  for (const deal of state.deals) {
    if (deal.id === id) return deal;
  }
  return undefined;
}

/** Turns this deal still has to run, or zero when it is spent. */
export function dealTurnsLeft(state: GameState, deal: DealState): number {
  return Math.max(0, deal.untilTurn - state.turn);
}

/** What `playerId` hands over under this row; `{}` when they are not party. */
export function sideGivenBy(deal: DealState, playerId: number): DealTerms {
  if (deal.a === playerId) return deal.terms.a;
  if (deal.b === playerId) return deal.terms.b;
  return {};
}

/** What `playerId` receives under this row. `sideGivenBy`'s mirror. */
export function sideTakenBy(deal: DealState, playerId: number): DealTerms {
  if (deal.a === playerId) return deal.terms.b;
  if (deal.b === playerId) return deal.terms.a;
  return {};
}

/** The other empire on this row, or `null` when this seat is not on it. */
export function otherSeatOf(deal: DealState, playerId: number): number | null {
  if (deal.a === playerId) return deal.b;
  if (deal.b === playerId) return deal.a;
  return null;
}

// --- the three standing readings --------------------------------------------

/**
 * May `moverId`'s soldiers walk through `holderId`'s fields?
 *
 * The **only** reader outside this file is `closedBordersFor` (`pathfind.ts`),
 * where it sits as one clause beside `atWar`: a border is closed to an army at
 * peace unless the empire that holds it has opened it. Asked of the *holder's*
 * half of the bargain, because that is who is granting the passage — a
 * one-sided right of way is a bargain this vocabulary can express, and reading
 * it as mutual here would be reading a term the two seats did not sign.
 *
 * The wild grants and is granted nothing: it has no diplomacy, and a row naming
 * it cannot exist (`proposeDealError` refuses it).
 */
export function bordersOpenTo(state: GameState, holderId: number, moverId: number): boolean {
  if (holderId === moverId) return false;
  for (const deal of state.deals) {
    if (!dealIsLive(state, deal)) continue;
    if (deal.a === holderId && deal.b === moverId) {
      if (deal.terms.a.openBorders === true) return true;
    } else if (deal.b === holderId && deal.a === moverId) {
      if (deal.terms.b.openBorders === true) return true;
    }
  }
  return false;
}

/**
 * Every luxury this empire has **lent out**, in signing order, once each.
 *
 * Read by `openedResource` (`cities.ts`) as the clause right after the reveal
 * gate: a seam an empire has promised away is not in its hands, however it is
 * worked. The lending is of the **kind**, not of a tile — two improved silk
 * seams are one silk in anybody's hands (`controlledHoldings`), so lending
 * "silk" lends the silk, and an empire with two seams that lends silk keeps
 * neither.
 *
 * A player **may lend their only copy**, and that is the ruling rather than an
 * oversight: the happiness simply moves across the table, which is what makes a
 * one-for-one swap of duplicates a *good* bargain and lending your last wine an
 * expensive one. The bot only ever trades duplicates (P3); a human may do the
 * other thing.
 */
export function lentAwayBy(state: GameState, playerId: number): ResourceId[] {
  const list: ResourceId[] = [];
  for (const deal of state.deals) {
    if (!dealIsLive(state, deal)) continue;
    for (const id of sideGivenBy(deal, playerId).luxuries ?? []) {
      if (!list.includes(id)) list.push(id);
    }
  }
  return list;
}

/**
 * Every luxury lent **to** this empire, in signing order, once each.
 *
 * `lentAwayBy`'s mirror and the half that cannot live in `openedResource`: the
 * receiver owns no tile carrying the seam, and `openedResource` answers about a
 * *tile*. So the giver's side is a clause in that rule and the receiver's side
 * joins `controlledHoldings`, `hasResource` and `resourceCopies` at empire
 * scale — the asymmetry is stated there, where a reader will meet it.
 */
export function lentToPlayer(state: GameState, playerId: number): ResourceId[] {
  const list: ResourceId[] = [];
  for (const deal of state.deals) {
    if (!dealIsLive(state, deal)) continue;
    for (const id of sideTakenBy(deal, playerId).luxuries ?? []) {
      if (!list.includes(id)) list.push(id);
    }
  }
  return list;
}

/** One turn's tribute, as a line in somebody's ledger. */
export interface TributeLine {
  /** "Tribute to the Crimson Banner" · "Tribute from the Crimson Banner". */
  source: string;
  /** Signed: a tribute paid is negative, a tribute received positive. */
  gold: number;
}

/**
 * What this empire's treaties cost and pay it every turn, as labelled lines.
 *
 * Folded into `explainEmpireGold` (`empireGold.ts`) rather than into a second
 * ledger — CLAUDE.md's rule for a new recurring cost, kept: there is one list
 * the per-turn figure is the fold of, and a tribute joins it. One line per
 * deal per direction, in signing order, so an empire paying two tributes to the
 * same neighbour reads two lines and can tell which bargain to let lapse.
 *
 * Empires with no name (a hand-edited save) print "an empire", the same fallback
 * every diplomatic sentence in the interface uses.
 */
export function tributeLines(state: GameState, playerId: number): TributeLine[] {
  const lines: TributeLine[] = [];
  for (const deal of state.deals) {
    if (!dealIsLive(state, deal)) continue;
    const other = otherSeatOf(deal, playerId);
    if (other === null) continue;
    const them = playerById(state, other)?.name ?? 'an empire';
    const owed = sideGivenBy(deal, playerId).goldPerTurn ?? 0;
    if (owed > 0) lines.push({ source: `Tribute to the ${them}`, gold: -owed });
    const due = sideTakenBy(deal, playerId).goldPerTurn ?? 0;
    if (due > 0) lines.push({ source: `Tribute from the ${them}`, gold: due });
  }
  return lines;
}

// --- the proposals register -------------------------------------------------

/** Every standing proposal this seat made or was made, in log order. */
export function proposalsFor(state: GameState, playerId: number): DealProposal[] {
  const list: DealProposal[] = [];
  for (const row of state.dealProposals) {
    if (row.by === playerId || row.to === playerId) list.push(row);
  }
  return list;
}

/** The proposal with this id, or `undefined`. */
export function proposalById(state: GameState, id: number): DealProposal | undefined {
  for (const row of state.dealProposals) {
    if (row.id === id) return row;
  }
  return undefined;
}

/** Is this a luxury the deal vocabulary may lend? See `DealTerms.luxuries`. */
export function isLendableResource(id: ResourceId): boolean {
  return resourceDef(id).kind === 'luxury';
}

/** Neither seat may be the wild, and neither may be nobody. See the docblock. */
export function seatsMayBargain(state: GameState, x: number, y: number): boolean {
  if (x === y) return false;
  if (playerById(state, x) === undefined || playerById(state, y) === undefined) return false;
  return !isBarbarian(state, x) && !isBarbarian(state, y);
}

// --- the writers ------------------------------------------------------------

/**
 * Writes a struck bargain into the register and returns the row.
 *
 * **Validates nothing** — the gates are `proposeDealError` and `acceptDealError`
 * in `diplomacy.ts`, asked in full before this is called (the reducer's
 * contract). The terms are handed in from the proposer's side and keyed onto
 * the pair here, in the one place that knows which id is `a`.
 *
 * `rules.war.dealTurns` from the turn it is signed, absolute the moment it is
 * written (the ruling, 9b: twenty turns).
 */
export function openDeal(
  state: GameState,
  id: number,
  byId: number,
  toId: number,
  give: DealTerms,
  take: DealTerms,
): DealState {
  const { a, b } = pair(byId, toId);
  // Only what still stands — see `ongoingPart`.
  const mine = ongoingPart(give);
  const theirs = ongoingPart(take);
  const row: DealState = {
    id,
    a,
    b,
    terms: a === byId ? { a: mine, b: theirs } : { a: theirs, b: mine },
    untilTurn: state.turn + RULES.war.dealTurns,
  };
  state.deals.push(row);
  return row;
}

/** Why a deal left the register, for the sentence somebody announces it in. */
export interface DealEndReport {
  id: number;
  a: number;
  b: number;
  /** `expired` — its twenty turns ran out; `war` — one of them declared. */
  reason: 'expired' | 'war';
}

/**
 * Drops every deal and every standing proposal between this pair, returning
 * what went.
 *
 * The declaration's own consequence (the ruling, 9b: *"deals auto-cancel on
 * declaration"*), and it takes the proposals with it for the same reason a war
 * takes the peace offers on it: a paper nobody can sign is not a paper. Called
 * from `declareWarAt`, in one breath with the row, so a consequence a caller
 * had to remember is a consequence nobody forgets.
 */
export function cancelDealsBetween(state: GameState, x: number, y: number): DealEndReport[] {
  const { a, b } = pair(x, y);
  const ended: DealEndReport[] = [];
  const kept: DealState[] = [];
  for (const deal of state.deals) {
    if (deal.a === a && deal.b === b) {
      if (dealIsLive(state, deal)) ended.push({ id: deal.id, a, b, reason: 'war' });
      continue;
    }
    kept.push(deal);
  }
  state.deals = kept;
  state.dealProposals = state.dealProposals.filter(
    (row) => !((row.by === a && row.to === b) || (row.by === b && row.to === a)),
  );
  return ended;
}

/**
 * Sweeps out the deals that have run out, reporting each.
 *
 * A **broom, not a clock** (`pruneTruces`' twin): every reading above already
 * compares an absolute turn, so a spent row is inert and deleting it changes no
 * outcome. It reports because an empire whose silk has just gone home is
 * entitled to be told — the sweep is the only moment anything can say so, since
 * a moment later there is simply no row.
 */
export function pruneDeals(state: GameState): DealEndReport[] {
  const ended: DealEndReport[] = [];
  const kept: DealState[] = [];
  for (const deal of state.deals) {
    if (dealIsLive(state, deal)) {
      kept.push(deal);
      continue;
    }
    ended.push({ id: deal.id, a: deal.a, b: deal.b, reason: 'expired' });
  }
  state.deals = kept;
  return ended;
}
