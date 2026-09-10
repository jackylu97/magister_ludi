/**
 * **The census** — the world measured on one figure, and everybody's place in
 * it (`docs/wager.md` §10/§11, batch C1).
 *
 * The shape of the thing, in four sentences
 * -----------------------------------------
 *   1. **The calendar.** Every thirteen to seventeen turns the clerks take a
 *      census. The exact gap is drawn uniformly from `state.rng` at each census
 *      (`drawCensusInterval`, `state.ts`) and stamped as one absolute
 *      `GameState.census.nextTurn`, so a **seed is a calendar** and no empire
 *      can count the turns to the next one.
 *   2. **The figure.** One reading out of a closed list of thirteen —
 *      `CensusStat` — drawn from the same generator, and **never the same one
 *      twice running**: the world does not measure learning two censuses in a
 *      row, so a realm that is behind on one figure is asked a different
 *      question soon.
 *   3. **The ranking.** Every living seat's figure, highest first, ties by seat
 *      order. Every figure is a fold the simulation already prints for the
 *      local seat, which is what makes a rival's row *exact* rather than an
 *      estimate — the wager's own ruling of 2026-09-09, read one system over.
 *   4. **The pay.** The seat at the head takes a repeatable Triumph worth
 *      `rules.census.renown`, through `awardOccasion` → `awardTriumph` →
 *      `settleRenownWindfall`, which is the one place renown is ever added. It
 *      is shown *inside the census sheet* and never as a Triumph card of its
 *      own (the row's `quiet` marker).
 *
 * Why this is a phase and where it sits
 * -------------------------------------
 * `census` runs **directly after `wagers` and directly before `beads`**, and
 * both halves are rules: after the wagers, because the Triumph it mints pays
 * renown and a claim settled above it may have moved a seat's rod already; and
 * before the beads, because the renown lands on the register the deed sweep in
 * the very next phase reads.
 *
 * The one `switch`
 * ----------------
 * `censusFigure` is the only place in the game that switches on a `CensusStat`,
 * with the aliased-discriminant exhaustiveness idiom the reducer uses. Two of
 * its arms are `wagerCount`'s (`wagers.ts`) rather than second implementations
 * — the towns held and the strength in the field are the same questions the
 * deck already asks — and the six per-turn voices come off `foldEmpireRates`,
 * the same fold the top bar's headline and the conversions read. **Nothing here
 * folds a yield a second time**, which is the whole of rule 5 at this scale.
 *
 * What it deliberately is not
 * ---------------------------
 * It is not a wager reading. A wager is a *bar* — a figure to reach — and a
 * census is a *rank*, which is the race the user has been careful to keep out
 * of the deck (§10c). They share readings because both are honest about the
 * board; they do not share a vocabulary, because the wager's is what a card may
 * ask and this one is what the world may measure.
 */

import { LIVE_GREAT_PERSON_IDS, greatPersonDef } from './greatPeopleData';
import { awardOccasion } from './triumphs';
import { TRIUMPH_IDS, type TriumphId, triumphDef } from './triumphData';
import { nextInt } from './rng';
import { RULES } from './rulesData';
import {
  type CensusRecord,
  type CensusRow,
  type GameState,
  type Player,
  capitalCityOf,
  cityReligion,
  citiesOf,
  drawCensusInterval,
  followerCount,
  playerById,
  realPlayers,
} from './state';
import { foldEmpireRates } from './yields/empire';
import { wagerCount } from './wagers';

// --- the vocabulary ---------------------------------------------------------

/**
 * **What the world may be measured on** — the user's own list (`docs/wager.md`
 * §10: *"total technologies, culture/science/food/production/gold per turn,
 * total statecraft drafts, number of followers of each religion"*, plus the
 * cities, the citizens, the army and the beads the orchestrator's row added).
 *
 * A closed union, so adding a figure is a decision somebody makes and a `switch`
 * that stops compiling until they have written down what it means — `beadCount`
 * and `wagerCount`'s bargain, made a third time.
 *
 * Every member is a **fold the game already prints**, and that is the property
 * the whole feature rests on: a census that ranked a number nobody could see on
 * their own sheet would be the world telling a player something about
 * themselves that their own Ledger does not.
 */
export type CensusStat =
  /** Technologies researched. */
  | 'technologies'
  /** Learning made in one turn. */
  | 'science'
  /** Culture made in one turn. */
  | 'culture'
  /** Food to spare in one turn, across every town. */
  | 'food'
  /** Hammers swung in one turn, across every town. */
  | 'production'
  /** The treasury's net take in one turn — what it earns less what it keeps. */
  | 'gold'
  /** Faith made in one turn. */
  | 'faith'
  /** Statecraft drafts taken — the empire's tier. */
  | 'drafts'
  /** Citizens of this realm who follow the faith its seat of government does. */
  | 'followers'
  /** Towns held. */
  | 'cities'
  /** Citizens across every town. */
  | 'citizens'
  /** Combat strength of every piece in the field. */
  | 'armyStrength'
  /** Beads on the rod. */
  | 'beads';

/**
 * Every figure, in declaration order — **the bag the rotation draws from** and
 * the register the `switch` is pinned by.
 *
 * Order is part of the state in the sense hard rule 2 means: the draw is an
 * index into this array, so a row moved is a different game from the same seed.
 */
export const CENSUS_STATS: readonly CensusStat[] = [
  'technologies',
  'science',
  'culture',
  'food',
  'production',
  'gold',
  'faith',
  'drafts',
  'followers',
  'cities',
  'citizens',
  'armyStrength',
  'beads',
];

export function isCensusStat(value: unknown): value is CensusStat {
  return typeof value === 'string' && (CENSUS_STATS as readonly string[]).includes(value);
}

// --- the readings -----------------------------------------------------------

/**
 * **The one `switch` on a `CensusStat`** — what one figure reads for one empire,
 * right now.
 *
 * Pure, like `wagerCount` beside it: it may be asked from the phase, from a
 * screen or from a test with no consequences at all, which is what lets the
 * sheet, the Abacus band and the ranking all be one answer.
 *
 * The six voices are asked **once** through `foldEmpireRates` rather than one
 * call apiece, because that fold prices every town in the realm and asking it
 * six times for six of its own fields would be six sweeps for one reading. It
 * is the same books the top bar's headline and a card's rate conversion read,
 * so the census cannot disagree with the Ledger about what a turn is worth.
 */
export function censusFigure(state: GameState, playerId: number, stat: CensusStat): number {
  const player = playerById(state, playerId);
  if (!player) return 0;
  const kind = stat;
  switch (kind) {
    case 'technologies':
      return player.techsResearched.length;
    case 'science':
      return Math.floor(foldEmpireRates(state, playerId).sciencePerTurn);
    case 'culture':
      return Math.floor(foldEmpireRates(state, playerId).culturePerTurn);
    case 'food':
      return Math.floor(foldEmpireRates(state, playerId).foodPerTurn);
    case 'production':
      return Math.floor(foldEmpireRates(state, playerId).productionPerTurn);
    case 'gold':
      // The **net** take, bills and all: an empire whose upkeep eats its
      // connections made less, and a census that printed the gross would be
      // ranking a number no treasury ever saw. `foldEmpireRates` folds the
      // maintenance in for that reason and this reads what it says.
      return Math.floor(foldEmpireRates(state, playerId).goldPerTurn);
    case 'faith':
      return Math.floor(foldEmpireRates(state, playerId).faithPerTurn);
    case 'drafts':
      return player.statecraft.drafts;
    case 'followers':
      return ownFaithful(state, playerId);
    case 'cities':
    case 'armyStrength':
      // **The deck's own readings**, asked through the deck's own door
      // (`wagerCount`): "towns held" and "strength in the field" are the same
      // two questions a wager asks, and a second implementation of either would
      // be two answers to one question waiting to disagree.
      return wagerCount(state, playerId, kind);
    case 'citizens': {
      let people = 0;
      for (const city of citiesOf(state, playerId)) people += city.population;
      return people;
    }
    case 'beads':
      return player.beads.length;
    default: {
      const unhandled: never = kind;
      void unhandled;
      return 0;
    }
  }
}

/**
 * **Citizens of this realm who follow the faith its seat of government does** —
 * the census's reading of the user's "followers of each religion".
 *
 * The user's line names a faith and this names a *seat*, and the translation is
 * the one thing that made the figure rankable at all: a census ranks empires,
 * and "how many follow Zoroastrianism" is a fact about a religion that two
 * empires would read the same number off. So the question asked is *how much of
 * your own realm keeps your own faith* — a real per-seat measure, and the one a
 * player can act on.
 *
 * Which faith is "your own" is the **capital's** derived banner (`cityReligion`),
 * never a stored field: a conquest that takes the palace takes the question with
 * it, which is the honest reading of a realm whose seat of government has
 * changed gods. A capital that follows nothing reads nought, and a world where
 * nobody has founded a faith yet ranks every seat at nought — which is a census
 * that names no leader at all (see `censusRanking`).
 */
function ownFaithful(state: GameState, playerId: number): number {
  const seat = capitalCityOf(state, playerId);
  if (!seat) return 0;
  const faith = cityReligion(seat);
  if (faith === null) return 0;
  let kept = 0;
  for (const city of citiesOf(state, playerId)) kept += followerCount(city, faith);
  return kept;
}

// --- the ranking ------------------------------------------------------------

/**
 * Which seats a census counts: every real player still in the game.
 *
 * `realPlayers` minus the eliminated, which is `worldClock`'s own cut and taken
 * for its reason: a conquered empire has no towns, no citizens and no turn of
 * anything, so a row for it would be a nought at the foot of every page for the
 * rest of the game. The wild is not a nation and is not counted either — that is
 * `realPlayers`' own job.
 */
export function censusSeats(state: GameState): Player[] {
  return realPlayers(state).filter((player) => !player.eliminated);
}

/**
 * **Every counted seat's figure, ranked** — highest first, ties by seat order.
 *
 * The tie-break is the roster's, which is the tie-break every sweep in this game
 * uses: a fact about the table rather than about which loop happened to run
 * first. A **tie for first is still a leader** — the lower seat id takes it —
 * because a census that named nobody on a draw would be a page with no head, and
 * the alternative (both, or neither) is a rule with a second sentence in it.
 */
export function censusRanking(state: GameState, stat: CensusStat): CensusRow[] {
  const rows: CensusRow[] = censusSeats(state).map((player) => ({
    playerId: player.id,
    figure: censusFigure(state, player.id, stat),
  }));
  // A stable sort on the figure alone: `Array.prototype.sort` is required to be
  // stable, and the array was built in `realPlayers` order, so equal figures
  // come out in seat order without a second comparison.
  rows.sort((a, b) => b.figure - a.figure);
  return rows;
}

/**
 * The seat a ranking names first, or `null`.
 *
 * `null` on two boards and both are deliberate: a world with nobody left to
 * count, and a world where the head row reads **nought** — leading at nothing is
 * not a deed, so the earliest censuses of a game (nobody has founded a faith,
 * nobody has taken a draft) name no leader and pay nobody.
 */
export function censusLeaderOf(rows: readonly CensusRow[]): number | null {
  const head = rows[0];
  if (!head) return null;
  return head.figure > 0 ? head.playerId : null;
}

// --- the draw ---------------------------------------------------------------

/**
 * **Which figure this census measures** — one draw, never the figure the last
 * census measured (§11's "no stat twice running").
 *
 * Written as a draw from a *smaller bag* rather than as a reroll on a collision,
 * which is `drawWagers`' own discipline one system over: the draw is one call on
 * the generator and cannot loop, so a seed reaches the same page on every
 * machine and a world of one figure (which cannot happen, but the arithmetic
 * should not care) still answers something.
 */
export function drawCensusStat(state: GameState, previous: CensusStat | null): CensusStat {
  const bag = CENSUS_STATS.filter((stat) => stat !== previous);
  const pool = bag.length > 0 ? bag : CENSUS_STATS;
  return pool[nextInt(state.rng, 0, pool.length)]!;
}

/**
 * **Who signed the page** — a great person's name off the live roster, drawn
 * from `state.rng`.
 *
 * Flavour and nothing else (§10: *"the great person's name on the census is
 * flavour"*), and the mock's mark of 2026-09-09 says it prints **without a
 * flavour label**: the masthead reads "Hipparchus has taken the census of the
 * world's science" and that is the whole of it. Nobody is recruited, nothing is
 * spent, no roster moves and no draw is barred — the same name may sign two
 * censuses in one game, exactly as two ages may raise the same wonder.
 *
 * `LIVE_GREAT_PERSON_IDS` rather than the age's own roster, deliberately: the
 * clerks are not somebody the empire could have called, and a taker drawn from
 * the age would make an early census a list of three names.
 */
export function drawCensusTaker(state: GameState): string {
  const roster = LIVE_GREAT_PERSON_IDS;
  if (roster.length === 0) return 'The clerks';
  return greatPersonDef(roster[nextInt(state.rng, 0, roster.length)]!).name;
}

// --- the register -----------------------------------------------------------

/** The last census taken, or `null` in a world that has not been measured yet. */
export function lastCensus(state: GameState): CensusRecord | null {
  const taken = state.census?.taken ?? [];
  return taken.length > 0 ? taken[taken.length - 1]! : null;
}

/** The figure the last census measured, or `null`. The rotation's memory. */
function lastStat(state: GameState): CensusStat | null {
  const last = lastCensus(state);
  if (!last || !isCensusStat(last.stat)) return null;
  return last.stat;
}

// --- the phase --------------------------------------------------------------

/**
 * What the phase writes into. `TurnReport`'s census field and nothing else.
 *
 * There is deliberately **no triumphs field**: the leader's Triumph reaches the
 * resolution's report the way every other Triumph in the game does, as a diff of
 * the append-only `Player.triumphs` taken across the whole pipeline
 * (`triumphsSince`, `runEndOfTurn`). A phase that reported its own would be the
 * sink `triumphs.ts` was written to avoid.
 */
export interface CensusReport {
  /** The census taken this resolution, or absent — which is nearly every turn. */
  censusTaken?: CensusRecord;
}

/**
 * **The `census` phase**, in five beats — the calendar, the figure, the
 * ranking, the Triumph, the next date.
 *
 * Its position in `END_OF_TURN_PHASES` is a rules decision like every other
 * entry: **directly after `wagers` and directly before `beads`**. After the
 * wagers, because a bar cleared on this very turn has already minted its beads
 * and a census of the rods should count them; before the beads, because the
 * leader's Triumph pays renown and the deed sweep in the very next phase reads
 * the register it lands on.
 *
 * The order of the three draws is the rule: **the figure, the taker, then the
 * next gap.** A replay reaches the same page because it spends the generator in
 * the same order, and the gap is drawn last so that a census which names nobody
 * still moves the calendar exactly as far as one that does.
 *
 * `state.turn >= nextTurn` rather than `===`, which is the same defence
 * `pruneTimedEffects` takes: a comparison cannot be missed by a phase that did
 * not run, and a world loaded from a save written before this batch simply takes
 * its first census on the next resolution rather than never.
 */
export function runCensus(state: GameState, report?: CensusReport): void {
  const register = state.census;
  if (!register) return;
  if (state.turn < register.nextTurn) return;

  const stat = drawCensusStat(state, lastStat(state));
  const taker = drawCensusTaker(state);
  const rows = censusRanking(state, stat);
  const leaderId = censusLeaderOf(rows);

  const record: CensusRecord = { turn: state.turn, stat, rows, leaderId, taker };
  register.taken.push(record);
  register.nextTurn = state.turn + drawCensusInterval(state.rng);

  if (leaderId !== null) {
    // **The one door renown comes through.** `awardOccasion` walks the Triumph
    // table for every row that names this moment and hands each to
    // `awardTriumph`, which pays through `settleRenownWindfall` — so a census
    // that fills the ladder opens a great-person offer before this returns,
    // exactly as a wonder finished in `advanceProduction` does. It also
    // announces the moment to the Bead Race in the same call, which is what
    // makes `censusTaken` a word in the shared vocabulary rather than a private
    // signal.
    awardOccasion(state, leaderId, 'censusTaken');
  }

  if (report) report.censusTaken = record;
}

// --- the blocker and its answer ---------------------------------------------

/**
 * The census this seat still owes a look at, or `null`. **The End Turn
 * blocker's rule.**
 *
 * In the simulation rather than in `turnBlockers.ts` for `wagerBlocker`'s reason
 * exactly: the interface decides what a button *does* about a debt, and the
 * simulation decides what counts as one — so a bot reads the same sentence a
 * screen does.
 *
 * Only ever the **last** census: they do not stack. A seat that was away for two
 * of them is shown the one the world is actually on, because a queue of stale
 * measurements is a queue of button presses and none of them is news.
 *
 * The comparison is `censusSeen < the census's turn`, absolute on both sides —
 * the discipline every timed fact in this game keeps, and what makes the answer
 * survive a save, a reload and a hot-seat change of chair.
 */
export function censusBlocker(state: GameState, playerId: number): CensusRecord | null {
  const player = playerById(state, playerId);
  if (!player || player.barbarian || player.eliminated) return null;
  const last = lastCensus(state);
  if (!last) return null;
  if ((player.censusSeen ?? -1) >= last.turn) return null;
  return last;
}

/**
 * Why this seat may not close the book, or `null` when it may — **the one
 * gate**, asked by the reducer and by the sheet.
 *
 * `chooseWagerError`'s discipline: a surface that offers exactly what the
 * reducer will accept, and a refusal a player can read. A seat that has already
 * closed it is refused rather than quietly re-stamped, which is what makes the
 * command idempotent in the way hard rule 1 means — a second one changes not one
 * byte.
 */
export function dismissCensusError(state: GameState, playerId: number): string | null {
  const player = playerById(state, playerId);
  if (!player || player.barbarian) return 'The wild takes no census';
  if (player.eliminated) return 'This empire is no longer in the game';
  const last = lastCensus(state);
  if (!last) return 'No census has been taken';
  if ((player.censusSeen ?? -1) >= last.turn) return 'You have already read this census';
  return null;
}

/**
 * Marks the last census read by this seat. The reducer's whole body for
 * `dismissCensus`.
 *
 * Validated fully by `dismissCensusError` before a byte moves (hard rule 1). It
 * writes an **absolute turn** rather than a flag, so a census taken later puts
 * the sheet up again with nothing to clear in between.
 */
export function dismissCensusAt(state: GameState, playerId: number): boolean {
  if (dismissCensusError(state, playerId) !== null) return false;
  const player = playerById(state, playerId);
  const last = lastCensus(state);
  if (!player || !last) return false;
  player.censusSeen = last.turn;
  return true;
}

/**
 * **The Triumph row the census pays**, found by its trigger rather than by its
 * name.
 *
 * The census sheet prints the Triumph *inside itself* (the user's ruling), so it
 * needs the row's own words and figure — and CLAUDE.md's rule holds one screen
 * out as firmly as it holds in the simulation: **markers, not names**. Nothing
 * anywhere compares an id against `'censusLeader'`; the marker is the trigger
 * kind, and the day the row is renamed or a second one is added the sheet finds
 * them without an edit.
 *
 * File order, like every other walk of this table.
 */
export function censusTriumphIds(): TriumphId[] {
  return TRIUMPH_IDS.filter((id) => triumphDef(id).when.kind === 'censusTaken');
}

// --- the data validator -----------------------------------------------------

/**
 * Every way the census's own figures can disagree with each other, as
 * human-readable lines. `wagerDataProblems`' sibling and here for its reason.
 *
 * The one thing it has to say is the one thing this feature writes down twice:
 * `rules.census.renown` is the census's statement of what leading is worth, and
 * `data/triumphs.json`'s `censusLeader` row is what actually pays. Two places
 * for one number, held together by a check that fails the build rather than by
 * somebody remembering — which is the bargain `docs/`'s sync tests make one
 * scale up.
 */
export function censusProblems(): string[] {
  const problems: string[] = [];
  const rows = censusTriumphIds();
  if (rows.length === 0) {
    problems.push('no Triumph row names the census, so leading it pays nothing');
  }
  for (const id of rows) {
    const def = triumphDef(id);
    if (def.pays !== RULES.census.renown) {
      problems.push(
        `${id} pays ${def.pays} renown where rules.census.renown says ${RULES.census.renown}`,
      );
    }
    if (def.scope !== 'perEvent') {
      problems.push(`${id} is not repeatable, and the world is measured again and again`);
    }
    if (def.quiet !== true) {
      problems.push(`${id} would raise a Triumph sheet on top of the census sheet`);
    }
  }
  if (RULES.census.min > RULES.census.max) problems.push('the census calendar runs backwards');
  if (RULES.census.min < 1) problems.push('the census would be taken every turn or oftener');
  return problems;
}
