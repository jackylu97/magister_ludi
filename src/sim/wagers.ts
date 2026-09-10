/**
 * **The Wager** — the deal, the secret stake, the claim and the judgement
 * (`docs/wager.md` §2/§3/§3b, batch G2).
 *
 * The shape of the thing, in four sentences
 * -----------------------------------------
 *   1. **The deal.** When an age closes and the next one opens, the world is
 *      dealt three cards from that age's deck — the *same* three for everybody,
 *      drawn by `state.rng`, guaranteed to come from three different theme lines
 *      so that every build is offered a bar in a style it could actually play.
 *      Æra I deals nothing (the opening is for learning the board) and neither
 *      will Æra V.
 *   2. **The stake.** Every seat picks one of the three on the deal turn, and
 *      the pick is **secret** — which is a rule of the *screens*, exactly as
 *      `localPlayerId` is: the state carries every stake because a replay must.
 *   3. **The claim.** A card is claimed by a seat the turn that seat first meets
 *      its bar — not at the close (§3b, "redeemed the moment it is true"). The
 *      beads are minted then, so a bar met and lost again to a war still paid,
 *      and a player can watch it land. Any number of seats may clear the same
 *      card; nothing here names a first claimant (§11: no "claimed by" line).
 *   4. **The judgement.** At the age's close the whole job is one question: is
 *      the card this seat staked still unclaimed? If it is, the seat takes a
 *      malice. Everything else was settled the moment it was met.
 *
 * Flow and standing are one subtraction
 * -------------------------------------
 * §3's "this age" counts. A **standing** wager reads the board now. A **flow**
 * reads a *lifetime* total and subtracts what that seat's total was when the
 * cards were dealt (`WagerDeal.opening`). Nothing ticks and nothing resets: the
 * deal writes down a stamp and every later reading is a comparison against it,
 * which is the `TimedEffect` discipline one system over. The lifetime totals
 * themselves are raised once a turn in this module's own phase, out of the very
 * folds the Ledger prints (`ledgerFold.ts`), or written at a verb where a verb
 * can be exact (renown at its grant, the kill ledger at the fall).
 *
 * Why the phase sits where it does
 * -------------------------------
 * `wagers` runs **directly after `worldClock` and directly before `beads`**, and
 * both halves of that are rules:
 *
 *   · *after the clock*, because everything here is about the age — the clock is
 *     what decides an age closed on this turn, and a deal taken before it would
 *     be dealing the age that is ending;
 *   · *before the beads*, because a claim mints beads and the `beads` phase
 *     sweeps the rods immediately afterwards; a wager bead earned this turn is
 *     on the rod the deed table reads.
 *
 * The one `switch`
 * ----------------
 * `wagerCount` is the only place in the game that switches on a `WagerCount`,
 * with the aliased-discriminant exhaustiveness idiom the reducer uses: the day a
 * reading is added to the vocabulary this stops compiling until somebody writes
 * down what it means. That is the same bargain `beadCount`, `classifyCard` and
 * the card evaluator each make, and it buys the same thing — **a new wager is a
 * JSON row**.
 */

import {
  type BeadAward,
  awardBead,
  awardBeadOccasion,
} from './beads';
import { type BeadFamily, isBeadGrantId } from './beadData';
import { type BuildingId, isWonder } from './buildingData';
import { capitalCityOf } from './cities';
import { explainEmpireGold } from './empireGold';
import { foldLedgerClass, ledgerBagOfCity, ledgerBagOfEmpire } from './ledgerFold';
import { authorityOf, happinessOf } from './meters';
import { readEmpire } from './readings';
import { type MaliceSeating, shedMalices, takeMalice } from './statecraft';
import { nextInt } from './rng';
import {
  type GameState,
  type Player,
  type WagerDeal,
  citiesOf,
  realPlayers,
  playerById,
  wondersHeldBy,
} from './state';
import { BUILDING_UNLOCK_TECH, isTechId, techDef } from './techData';
import { isCombatant, unitDef } from './unitData';
import {
  type WagerCount,
  type WagerId,
  type WagerLine,
  WAGER_ACCUMULATORS,
  WAGER_RULES,
  isWagerId,
  wagerAgeIndex,
  wagerBar,
  wagerDef,
  wagerLinesOfAge,
  wagersOfLine,
} from './wagerData';
import { ageClosesThisTurn, currentWorldAge } from './worldClock';

// --- the readings -----------------------------------------------------------

/**
 * **The one `switch` on a `WagerCount`** — what one reading answers for one
 * empire, right now.
 *
 * Every arm is a plain read of the board, of a lifetime counter, or of a fold
 * the Ledger already prints, and none of them mutates or rolls a die: a reading
 * may be asked from a sweep, from a screen or from a test with no consequences
 * at all. That is what lets batch C1's census rank *any* of them across the
 * board without a second implementation.
 *
 * The lifetime arms answer a **total**, never a window. "This age" is applied by
 * `wagerStanding`, one function down, as a subtraction against the deal's stamp
 * — so nothing here has to know what age it is being asked in.
 *
 * The two deferred readings answer nought and say so on their rows. An arm that
 * quietly answered *something* would be a bar a realm might clear by accident.
 */
export function wagerCount(state: GameState, playerId: number, count: WagerCount): number {
  const player = playerById(state, playerId);
  if (!player) return 0;
  const kind = count;
  switch (kind) {
    case 'capitalCitizens':
      return capitalCityOf(state, playerId)?.population ?? 0;
    case 'capitalBuildings':
      return capitalCityOf(state, playerId)?.buildings.length ?? 0;
    case 'capitalWonders': {
      const seat = capitalCityOf(state, playerId);
      if (!seat) return 0;
      let held = 0;
      for (const id of seat.buildings) if (isWonder(id)) held += 1;
      return held;
    }
    case 'cities':
      return citiesOf(state, playerId).length;
    case 'armyStrength': {
      let worth = 0;
      for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        const def = unitDef(unit.type);
        if (!isCombatant(def)) continue;
        worth += def.combatStrength;
      }
      return worth;
    }
    case 'treasury':
      return Math.floor(player.gold);
    case 'foodSurplus':
      // The growth channel, summed: what every town banks toward its basket
      // after its mouths are charged, which is what `readEmpire` already folds.
      return Math.floor(readEmpire(state, playerId).totals.food);
    case 'sciencePerCitizen': {
      const citizens = totalCitizens(state, playerId);
      if (citizens === 0) return 0;
      return readEmpire(state, playerId).totals.science / citizens;
    }
    case 'wondersOfThisAge': {
      const age = currentWorldAge(state);
      return wondersHeldBy(state, playerId, wonderAge, age);
    }
    case 'happiness':
      return happinessOf(state, playerId);
    case 'authority':
      return authorityOf(state, playerId);
    case 'buildingYields':
      return foldLedgerClass(ledgerBagOfEmpire(state, playerId), 'buildings');
    case 'capturedThisAge': {
      // Read against the **deal's own turn** by the caller, because a standing
      // count of "since when" is the one reading that needs the window. Asked
      // bare — from the Compendium, say — it answers the towns this realm holds
      // that it took at any time, which is the honest omniscient reading.
      let held = 0;
      for (const city of citiesOf(state, playerId)) {
        if (city.capturedOn !== undefined) held += 1;
      }
      return held;
    }
    case 'farmFood':
      // *Deferred.* See the row's own line: the food a farm pays is not told
      // apart from the food the ground under it pays anywhere in
      // `docs/yields.md`'s sequence.
      return 0;
    case 'capitalTileYields':
    case 'tradeYields':
    case 'religionYields':
    case 'peopleYields':
    case 'wonderYields':
    case 'deckYields':
    case 'connectionGold':
    case 'science':
    case 'culture':
    case 'gold':
    case 'allVoices':
    case 'happinessSurplus':
      return keptTotal(player, kind);
    case 'renown':
      return player.renownEarned;
    case 'unitHammers':
      // *Deferred.* The work a town puts behind a soldier is folded into its
      // production before anything can tell the two apart.
      return 0;
    case 'killsMinusLosses':
      return player.unitsKilled - player.unitsLost;
    default: {
      const unhandled: never = kind;
      void unhandled;
      return 0;
    }
  }
}

/**
 * **One turn's figure for every kept reading**, taken in one pass.
 *
 * One pass rather than twelve calls, because six of the twelve are classes of
 * the *same* Ledger bag and that bag is the most expensive reading in the game
 * outside a pathfind: `explainLedger` walks every town's labelled list, shares
 * out the two stages' gain over the percentages that supplied it, and rounds
 * eight figures per voice so they still add to the bank. Asking for it once and
 * reading six classes off the answer is the difference between a phase and a
 * stall on a wide realm.
 *
 * Every figure here is what the empire made **this turn**, which is what the
 * accumulators are the running sum of. Two of them are signed on purpose: the
 * treasury's net take, because "everything the realm took in, less what it cost
 * to keep" is what The Solvent Realm asks and an army in the red is going
 * backwards on it; and nothing else.
 */
function turnReadings(state: GameState, playerId: number): Partial<Record<WagerCount, number>> {
  const bag = ledgerBagOfEmpire(state, playerId);
  const seat = capitalCityOf(state, playerId);
  const totals = readEmpire(state, playerId).totals;

  let connections = 0;
  for (const line of explainEmpireGold(state, playerId)) {
    if (line.source.split(' · ')[0] === 'City connections') connections += line.gold;
  }

  return {
    capitalTileYields: seat ? foldLedgerClass(ledgerBagOfCity(state, seat), 'tiles') : 0,
    tradeYields: foldLedgerClass(bag, 'trade'),
    religionYields: foldLedgerClass(bag, 'religion'),
    peopleYields: foldLedgerClass(bag, 'people'),
    wonderYields: foldLedgerClass(bag, 'wonders'),
    deckYields: foldLedgerClass(bag, 'deck'),
    // Only what the roads *pay*: a connection is never a cost, and a realm with
    // none has not gone backwards on this reading.
    connectionGold: Math.max(0, connections),
    science: totals.science,
    culture: totals.culture,
    gold: totals.gold,
    allVoices:
      totals.food +
      totals.production +
      totals.gold +
      totals.science +
      totals.culture +
      totals.faith,
    happinessSurplus: Math.max(0, happinessOf(state, playerId)),
  };
}

/** One reading's lifetime total off the seat's own bag. Missing reads as nought. */
function keptTotal(player: Player, count: WagerCount): number {
  return player.wagerTotals[count] ?? 0;
}

/** Citizens across every town of this empire. `sciencePerCitizen`'s denominator. */
function totalCitizens(state: GameState, playerId: number): number {
  let people = 0;
  for (const city of citiesOf(state, playerId)) people += city.population;
  return people;
}

/**
 * Which age a wonder belongs to — the age of the technology that unlocks it.
 *
 * `beads.ts`' own reading, said again here for its reason: a wonder's era is
 * *when it becomes available*, so a designer who re-parents it in
 * `data/techs.json` has moved it with one edit. `BUILDING_UNLOCK_TECH` is read
 * inside the function rather than hoisted, which is the module-cycle rule.
 */
function wonderAge(id: BuildingId): number {
  const tech = BUILDING_UNLOCK_TECH.get(id);
  if (tech === undefined || !isTechId(tech)) return 1;
  return techDef(tech).age;
}

// --- the standing -----------------------------------------------------------

/**
 * **What one seat has reached on one wager**, in the figure its bar is quoted
 * in — the reading every surface ranks by and the judgement decides on.
 *
 * Pure and exported for exactly that reason: the wager sheet ranks every real
 * seat with it, the Abacus draws a track scaled by it, and batch C1's census
 * ranks the board by any reading in the vocabulary through the same door.
 *
 * Three shapes fold into one number:
 *
 *   · a **clause** row answers *how many of its clauses hold on this very turn*,
 *     which is why its bar is the clause count. A compound wager that reported
 *     three figures could not be ranked, and "2 of 3" is a thing a player reads
 *     off a rival's row at a glance.
 *   · a **flow** row answers `now − opening` — the lifetime total less what this
 *     seat's total was when the cards were dealt.
 *   · a **standing** row answers the board.
 *
 * `capturedThisAge` is the one standing reading that needs the deal's turn, and
 * it takes it here rather than inside the `switch`: "taken this age" is a fact
 * about the window, not about the town.
 */
export function wagerStanding(
  state: GameState,
  playerId: number,
  wager: WagerId,
  age: number,
): number {
  const def = wagerDef(wager);
  const deal = wagerDealOf(state, age);

  if (def.reads.shape === 'clauses') {
    const at = wagerAgeIndex(age);
    let held = 0;
    for (const clause of def.reads.clauses) {
      const bar = at < 0 ? 0 : (clause.bars[at] ?? 0);
      if (clauseFigure(state, playerId, clause.count, deal) >= bar) held += 1;
    }
    return held;
  }

  const figure = clauseFigure(state, playerId, def.reads.count, deal);
  if (def.kind !== 'flow') return figure;
  const opening = openingOf(deal, playerId, wager);
  return figure - opening;
}

/** One reading, windowed where the reading needs a window. See `wagerStanding`. */
function clauseFigure(
  state: GameState,
  playerId: number,
  count: WagerCount,
  deal: WagerDeal | null,
): number {
  if (count !== 'capturedThisAge') return wagerCount(state, playerId, count);
  const since = deal?.dealtOn ?? 0;
  let held = 0;
  for (const city of citiesOf(state, playerId)) {
    if (city.capturedOn !== undefined && city.capturedOn >= since) held += 1;
  }
  return held;
}

/** Where this seat stood on this card at the deal. Nought for a card not dealt. */
function openingOf(deal: WagerDeal | null, playerId: number, wager: WagerId): number {
  if (!deal) return 0;
  const index = deal.dealt.indexOf(wager);
  if (index < 0) return 0;
  const opening = deal.opening.find((one) => one.playerId === playerId);
  return opening?.at[index] ?? 0;
}

/** Has this seat cleared this card's bar at this age? The judgement's question. */
export function wagerMet(
  state: GameState,
  playerId: number,
  wager: WagerId,
  age: number,
): boolean {
  const bar = wagerBar(wager, age);
  if (bar <= 0) return false;
  return wagerStanding(state, playerId, wager, age) >= bar;
}

/** The deal for one age, or `null` while the world has not been dealt one. */
export function wagerDealOf(state: GameState, age: number): WagerDeal | null {
  for (const deal of state.wagers) if (deal.age === age) return deal;
  return null;
}

/** The table on the board now — the current age's deal, or `null`. */
export function openWagerDeal(state: GameState): WagerDeal | null {
  return wagerDealOf(state, currentWorldAge(state));
}

/** Has this seat cleared this card already? Asked of the deal's own register. */
export function wagerClaimedBy(deal: WagerDeal, playerId: number, index: number): boolean {
  return deal.claimed.some((claim) => claim.playerId === playerId && claim.index === index);
}

/** Which of the three this seat staked at this age, or `null`. */
export function wagerStakeOf(player: Player, age: number): number | null {
  const stake = player.wager;
  if (!stake || stake.age !== age) return null;
  return stake.index;
}

// --- the deal ---------------------------------------------------------------

/**
 * Draws the three cards of one age — **three different lines**, guaranteed
 * (§3b's ruling, and §11's default).
 *
 * The Orders' own M/E/W spread read one system over (`draft.ts`): the guarantee
 * is enforced by drawing from *sub-bags* rather than by rejecting a bad hand,
 * so the draw is one pass and cannot loop. A line is picked, a card is picked
 * from inside it, and the line is spent — so a realm is always offered a bar in
 * a style it could play, and never three of one style at once.
 *
 * Everything is drawn out of arrays in file order (`WAGER_IDS`), so the same
 * seed deals the same table on every machine: a seed **is** a deal.
 *
 * A world whose deck has fewer live lines than the deal wants is a data mistake
 * `wagerDataProblems` names; this simply deals what it can rather than throwing
 * in the middle of a turn resolution.
 */
export function drawWagers(state: GameState, age: number): WagerId[] {
  const lines = wagerLinesOfAge(age);
  const drawn: WagerId[] = [];
  const want = Math.max(1, Math.floor(WAGER_RULES.dealt));
  for (let seat = 0; seat < want && lines.length > 0; seat += 1) {
    const line = lines.splice(nextInt(state.rng, 0, lines.length), 1)[0] as WagerLine;
    const pool = wagersOfLine(age, line);
    if (pool.length === 0) continue;
    drawn.push(pool[nextInt(state.rng, 0, pool.length)]!);
  }
  return drawn;
}

/**
 * Opens an age's table: three cards, every seat's opening figures, and every
 * seat's stake cleared.
 *
 * Called from the phase at the one moment an age opens, and never twice for one
 * age — the register is `state.wagers` itself, which is append-only.
 *
 * The **openings are taken after the draw and before anything else moves**, so
 * a flow that a seat has been filling all through the previous age starts this
 * one at nought. `realPlayers` order throughout, which is the order every sweep
 * in this game walks.
 */
function dealWagers(state: GameState, age: number): WagerDeal | null {
  if (wagerAgeIndex(age) < 0) return null;
  if (wagerDealOf(state, age) !== null) return null;
  const dealt = drawWagers(state, age);
  if (dealt.length === 0) return null;

  const deal: WagerDeal = {
    age,
    dealt,
    dealtOn: state.turn,
    opening: [],
    claimed: [],
  };
  for (const player of realPlayers(state)) {
    deal.opening.push({
      playerId: player.id,
      at: dealt.map((id) => flowOpening(state, player, id)),
    });
    // A stake never carries over: the cards are new, so the chair is empty.
    delete player.wager;
  }
  state.wagers.push(deal);
  return deal;
}

/** The lifetime figure a flow row starts this age from. Nought for a standing. */
function flowOpening(state: GameState, player: Player, wager: WagerId): number {
  const def = wagerDef(wager);
  if (def.reads.shape !== 'count' || def.kind !== 'flow') return 0;
  return wagerCount(state, player.id, def.reads.count);
}

// --- the claim --------------------------------------------------------------

/**
 * Mints what one kept wager pays — **two beads for the card this seat staked,
 * one for either of the others** (§2).
 *
 * The bead is an ordinary **grant** row of `data/beads.json`, one per family and
 * every one of them repeatable, so a wager bead lands on the same rod, prints on
 * the same Abacus and is counted by the same threshold as every other bead in
 * the game. Nothing new was needed to pay one, which is the whole reason the
 * families are on the wager rows.
 *
 * `awardBead` is the one place a bead is ever earned, so this reaches it rather
 * than pushing onto `Player.beads` itself.
 */
function payWagerBeads(
  state: GameState,
  playerId: number,
  family: BeadFamily,
  beads: number,
  awards: BeadAward[],
): void {
  const id = WAGER_BEAD_OF_FAMILY[family];
  if (!isBeadGrantId(id)) return;
  for (let paid = 0; paid < beads; paid += 1) {
    const award = awardBead(state, playerId, id, 0);
    if (award) awards.push(award);
  }
}

/**
 * The rod each family's wager bead lands on — one repeatable grant row apiece.
 *
 * Four rows rather than one, because a bead carries the family of the thing that
 * earned it (`EarnedBead.family`) and the Abacus counts rods: a realm that keeps
 * a wager of arms should see it on the conquest rod.
 */
const WAGER_BEAD_OF_FAMILY: Record<BeadFamily, string> = {
  domination: 'theWagerOfArms',
  culture: 'theWagerOfTheMuse',
  science: 'theWagerOfTheLamp',
  economic: 'theWagerOfThePurse',
};

// --- the phase --------------------------------------------------------------

/** What the phase writes into. `TurnReport`'s wager fields and nothing else. */
export interface WagerReport {
  beads: BeadAward[];
  /** Deals opened this resolution — the sheet the interface raises. */
  wagerDealt?: number;
  /** Claims made this resolution, in sweep order. The Abacus flips on them. */
  wagerClaims?: { playerId: number; wager: string; index: number; beads: number }[];
  /**
   * Malices seated at this resolution's judgement, in sweep order (batch G3).
   *
   * `wagerClaims`' opposite number and a **list** for its reason: any number of
   * seats may miss on the one turn an age closes, and each of them is a card in
   * a chair somebody has to be told about.
   */
  maliceSeatings?: MaliceSeated[];
}

/**
 * **The `wagers` phase**, in four beats — the running totals, the claims, the
 * judgement, the deal (`docs/wager.md` §2).
 *
 * Its position in `END_OF_TURN_PHASES` is a rules decision like every other
 * entry: **directly after `worldClock` and directly before `beads`**. After the
 * clock, because every question here is about the age and the clock is what
 * decides an age closed on this turn; before the beads, because a claim mints
 * beads and the deed sweep in the very next phase reads the rod they land on.
 *
 * The beats are in the order they are, and each ordering is a rule:
 *
 *   1. **the totals**, raised for every real seat by this turn's readings — and
 *      only while a table is open, because a flow's window opens at the deal and
 *      nothing counted before one would survive the stamp the deal takes.
 *   2. **the claims**, swept on the same board the totals were just raised on,
 *      so a bar met by this very turn's yields is claimed on this very turn.
 *   3. **the judgement**, on an age that is closing, and *after* the claims — so
 *      a bar cleared on the very last turn of an age is a bar kept rather than a
 *      malice — and *before* the deal, which is about to clear every stake.
 *   4. **the deal**, when a wagering age has just opened.
 *
 * The table being played on is the *closing* age's on the turn an age closes:
 * `worldClock` has already put the world in the next age by the time this runs,
 * and the age that is ending still has one turn of yields to bank and one last
 * bar to clear.
 *
 * The default stake is folded into beat 4's walk: a real seat that has not
 * answered a deal by the end of the turn **after** it was dealt is given its
 * first card (§2 — "a seat that cannot choose is dealt its first card by the
 * reducer's default"). It is a turn late on purpose, because the End Turn
 * blocker holds a *human* on the deal turn and a human must be allowed to answer
 * it; a bot answers the blocker in its own window, and an absent hot-seat player
 * is the only seat that ever reaches the default.
 *
 * `realPlayers` order throughout, so two seats that cross a bar on the same turn
 * always resolve the same way — a fact about the roster rather than about which
 * sweep happened to run first.
 */
export function runWagers(state: GameState, report?: WagerReport): void {
  const awards: BeadAward[] = [];
  const claims: WagerReport['wagerClaims'] = [];

  // **The table this turn is being played on.** On an ordinary turn it is the
  // current age's; on the turn an age *closes* it is the closing age's, because
  // `worldClock` has already put the world in the next age and the age that is
  // ending still has one turn of yields to bank and one last bar to clear.
  const closing = ageClosesThisTurn(state) ? state.ageClose!.age : null;
  const working = wagerDealOf(state, closing ?? currentWorldAge(state));

  if (working !== null) {
    // **Nothing is counted before there is a table**, which is why this is
    // inside the guard: a flow's window opens at the deal and the deal writes
    // down where every seat stood, so a total kept through Æra I would be a
    // number the first deal immediately subtracts back to nought. It would also
    // be a write on every quiet resolution of the opening age, which is a thing
    // the pipeline's own register refuses.
    for (const player of realPlayers(state)) {
      const turn = turnReadings(state, player.id);
      for (const count of WAGER_ACCUMULATORS) {
        player.wagerTotals[count] = keptTotal(player, count) + (turn[count] ?? 0);
      }
    }

    for (const player of realPlayers(state)) {
      fillDefaultStake(state, player, working);
      const staked = wagerStakeOf(player, working.age);
      for (let index = 0; index < working.dealt.length; index += 1) {
        const id = working.dealt[index]!;
        if (!isWagerId(id)) continue;
        if (wagerClaimedBy(working, player.id, index)) continue;
        if (!wagerMet(state, player.id, id, working.age)) continue;
        working.claimed.push({ playerId: player.id, index, turn: state.turn });
        const beads =
          staked === index
            ? Math.max(0, Math.floor(WAGER_RULES.stakeBeads))
            : Math.max(0, Math.floor(WAGER_RULES.otherBeads));
        payWagerBeads(state, player.id, wagerDef(id).family, beads, awards);
        // **Announced** (`occasions.ts`), so a deed may one day name the moment
        // and the Abacus flips on it today. The beads above are what the wager
        // *pays*; this is the world saying it happened.
        awards.push(...awardBeadOccasion(state, player.id, 'wagerClaimed'));
        claims.push({ playerId: player.id, wager: id, index, beads });
      }
    }
  }

  if (closing !== null) {
    // **The judgement, then the deal**, and the order is the rule twice over:
    // the judgement reads the stakes the deal below is about to clear, and it
    // runs after the claims above so that a bar cleared on the very last turn of
    // an age is a bar kept rather than a malice.
    const seated = judgeWagers(state, closing, awards);
    if (seated.length > 0 && report) report.maliceSeatings = seated;
    const deal = dealWagers(state, currentWorldAge(state));
    if (deal && report) report.wagerDealt = deal.age;
  }

  if (report) {
    report.beads.push(...awards);
    if (claims.length > 0) report.wagerClaims = claims;
  }
}

/**
 * Gives a seat that never answered the deal its first card.
 *
 * Only ever on a turn **after** the deal, and only for a seat with no stake at
 * all — see the phase's docblock for why the turn's grace is the whole of the
 * rule. It is written as a plain assignment rather than through the reducer
 * because it is not a decision anybody made: it is what the table does with an
 * empty chair.
 */
function fillDefaultStake(state: GameState, player: Player, deal: WagerDeal): void {
  if (state.turn <= deal.dealtOn) return;
  if (wagerStakeOf(player, deal.age) !== null) return;
  if (deal.dealt.length === 0) return;
  player.wager = { age: deal.age, index: 0 };
}

/**
 * **The judgement** — one question asked of every seat, and then paid (§3b, §4).
 *
 * Every card a seat cleared was claimed and paid the turn it was cleared, so
 * nothing is owed for a bar kept. What is left is the stake: a seat whose own
 * card is still unclaimed takes a **malice**.
 *
 * Two beats, and the split is the batch boundary G2 left rather than an
 * arrangement of convenience. The **mark** is written first — a
 * `pendingMalice` per failure, append-only and age-stamped — and the **deck**
 * then reads the marks and seats a card for each (`seatPendingMalices`). The
 * mark is what a replay carries and what a screen may print; the card is what
 * the realm pays. Keeping them two beats means the record of *who missed* is
 * complete before a single die is rolled, which is what makes the seating order
 * a fact about the roster rather than about the sweep.
 *
 * `judgedOn` is presence-is-state and is the one thing that stops an age being
 * judged twice, which matters on the last age: the Opus pulls the close forward
 * and the backstop would otherwise reach the same age a second time.
 */
export function judgeWagers(state: GameState, age: number, awards?: BeadAward[]): MaliceSeated[] {
  const deal = wagerDealOf(state, age);
  if (!deal || deal.judgedOn !== undefined) return [];
  deal.judgedOn = state.turn;
  for (const player of realPlayers(state)) {
    const staked = wagerStakeOf(player, age);
    if (staked === null) continue;
    if (wagerClaimedBy(deal, player.id, staked)) continue;
    const id = deal.dealt[staked];
    if (id === undefined) continue;
    player.pendingMalices.push({ age, wager: id });
  }
  return seatPendingMalices(state, age, awards);
}

/** One malice seated at a judgement — who took it, and what it cost them. */
export interface MaliceSeated extends MaliceSeating {
  playerId: number;
}

/**
 * **The deck pays the marks** (`docs/wager.md` §4, batch G3).
 *
 * Walked in `realPlayers` order, so two seats that miss on the same turn always
 * draw in the same order — a fact about the roster rather than about which sweep
 * ran first, which is the tie-break every sweep in this game uses.
 *
 * Per seat, one of two things happens and never both:
 *
 *   · **it missed** — every mark left by this age's judgement is spent, one card
 *     drawn and seated for each (`takeMalice`, which owns the chair rule, the
 *     cap and the renewal of whatever it already carried);
 *   · **it kept what it staked** — nothing is dealt, and every malice whose term
 *     names this age or an earlier one **leaves the chair** (`shedMalices`).
 *     *"The comeback is the point — a malice is a debt the next wager pays."*
 *
 * A seat that never staked at all falls in the second arm. That is deliberate
 * rather than incidental: an age nobody could fail is an age that works a debt
 * off, and the alternative — a debt outliving every wager it was ever set
 * against — is a punishment with no door out of it. In practice the phase's own
 * default gives every real seat a stake, so the arm is reached only by a table
 * dealt and closed inside one turn.
 *
 * The marks are **cleared as they are seated**: `pendingMalices` is the handover
 * between the two beats and nothing reads it afterwards. Older marks left by a
 * save written before this batch are spent here too — they name an earlier age,
 * and a debt recorded and never paid is the one thing a batch boundary must not
 * leave behind.
 */
export function seatPendingMalices(
  state: GameState,
  age: number,
  awards?: BeadAward[],
): MaliceSeated[] {
  const seated: MaliceSeated[] = [];
  for (const player of realPlayers(state)) {
    if (player.pendingMalices.length === 0) {
      shedMalices(state, player, age);
      continue;
    }
    const marks = player.pendingMalices.length;
    player.pendingMalices = [];
    for (let mark = 0; mark < marks; mark += 1) {
      // **The term**: until the next age's wager is judged (§4). One age on,
      // which is an absolute stamp the next judgement compares against — never a
      // countdown, and never a number anything ticks. Æra IV's judgement names
      // an age the world never reaches, so a malice taken there stands.
      const taken = takeMalice(state, player, age + 1);
      if (taken === null) continue;
      seated.push({ ...taken, playerId: player.id });
      // **Announced** (`occasions.ts`), like the claim it is the opposite of: the
      // deed sheet and the Abacus both want a moment to flip on, and a deed may
      // one day name it.
      if (awards) awards.push(...awardBeadOccasion(state, player.id, 'maliceSeated'));
      else awardBeadOccasion(state, player.id, 'maliceSeated');
    }
  }
  return seated;
}

// --- what a screen asks -----------------------------------------------------

/** One seat's row against one card — the standings the wager sheet ranks. */
export interface WagerStandingRow {
  playerId: number;
  name: string;
  /** The figure this seat has reached, in the bar's own units. */
  at: number;
  /** True once this seat has cleared it. `WagerDeal.claimed`'s own reading. */
  met: boolean;
}

/**
 * **Every real seat's standing against one of the three dealt cards, ranked.**
 *
 * The one surface in the game that prints another empire's exact figure, and
 * that is the user's ruling of 2026-09-09 in full: the *progress* is public and
 * only the *stake* is private, because a race with no visible field has no
 * stakes. It is the same reading the bars are judged by, so a rival's row is
 * exact rather than an estimate.
 *
 * Ranked highest first, ties broken by `realPlayers` order — a fact about the
 * roster, which is the tie-break every sweep in this game uses.
 *
 * Nothing here says *who claimed it first* and nothing ever will (§11): a wager
 * is a bar any number of seats may meet, so a seat that has met it wears the
 * mark on its own row and no line names a first claimant.
 */
export function wagerStandings(
  state: GameState,
  deal: WagerDeal,
  index: number,
): WagerStandingRow[] {
  const id = deal.dealt[index];
  if (id === undefined || !isWagerId(id)) return [];
  const rows: WagerStandingRow[] = [];
  for (const player of realPlayers(state)) {
    rows.push({
      playerId: player.id,
      name: player.name,
      at: wagerStanding(state, player.id, id, deal.age),
      met: wagerClaimedBy(deal, player.id, index),
    });
  }
  rows.sort((a, b) => b.at - a.at);
  return rows;
}

/**
 * Why this seat may not stake this card, or `null` when it may — **the one
 * gate**, asked by the reducer and printed by the sheet.
 *
 * `buildError`'s discipline: a surface that offers what the reducer will accept,
 * and a refusal a player can read.
 */
export function chooseWagerError(state: GameState, playerId: number, index: number): string | null {
  const player = playerById(state, playerId);
  if (!player || player.barbarian) return 'The wild stakes nothing';
  if (player.eliminated) return 'This empire is no longer in the game';
  const deal = openWagerDeal(state);
  if (!deal) return 'No wager is on the table';
  if (!Number.isInteger(index) || index < 0 || index >= deal.dealt.length) {
    return 'That is not one of the cards on the table';
  }
  if (wagerStakeOf(player, deal.age) !== null) return 'You have already staked this age';
  return null;
}

/**
 * Writes one seat's stake. The reducer's whole body for `chooseWager`.
 *
 * Validated fully by `chooseWagerError` before a byte moves (hard rule 1), and
 * once written it is never rewritten: the pick is the pick, which is what makes
 * a secret stake worth keeping secret.
 */
export function chooseWagerAt(state: GameState, playerId: number, index: number): boolean {
  if (chooseWagerError(state, playerId, index) !== null) return false;
  const player = playerById(state, playerId);
  const deal = openWagerDeal(state);
  if (!player || !deal) return false;
  player.wager = { age: deal.age, index };
  return true;
}

/**
 * Does this seat still owe the table an answer? **The End Turn blocker's rule.**
 *
 * In the simulation rather than in `turnBlockers.ts` for `statecraftBlocker`'s
 * reason exactly: the interface decides what a button *does* about a debt, and
 * the simulation decides what counts as one — so a bot reads the same sentence
 * a screen does.
 *
 * Only on the **deal turn itself**: the cards are dealt as the age opens and
 * every seat answers in the same window (§2, the user's ruling), and a blocker
 * that outlived that window would be a locked button on a table nobody can
 * change. The turn after, the phase's default fills the chair.
 *
 * `dealtOn + 1` rather than `dealtOn`, and the off-by-one is the pipeline's own
 * shape: the deal happens in the *resolution* of turn T (`runWagers`, the last
 * beat), and `applyEndTurn` raises the clock to T+1 immediately afterwards — so
 * the first turn anybody can look at the table on is the turn after the one it
 * was dealt in. The phase's default then fires at the end of that same turn,
 * which is why the two comparisons differ by one and not by nothing.
 */
export function wagerBlocker(state: GameState, playerId: number): WagerDeal | null {
  const player = playerById(state, playerId);
  if (!player || player.barbarian || player.eliminated) return null;
  const deal = openWagerDeal(state);
  if (!deal || deal.dealtOn + 1 !== state.turn) return null;
  if (wagerStakeOf(player, deal.age) !== null) return null;
  return deal;
}

/** Every card of one deal, as ids the screens can look up. Empty for no deal. */
export function dealtWagers(deal: WagerDeal | null): WagerId[] {
  if (!deal) return [];
  const ids: WagerId[] = [];
  for (const id of deal.dealt) if (isWagerId(id)) ids.push(id);
  return ids;
}
