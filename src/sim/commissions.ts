/**
 * **Commissions** — Order cards with a goal and a reward (batch C of
 * `docs/plans/deck-implementation.md`; rulings (qqqqqq) 5, 6 and 15 in
 * `docs/flags.md`).
 *
 * A commission is an ordinary Order row with a `commission` field
 * (`CommissionSpec`, `statecraftData.ts`). While it sits in a chair its goal can
 * be met; when it is met, at a fixed point in the end-of-turn phases, the reward
 * is paid, the card leaves its chair, and it is marked fulfilled so it can never
 * be seated or paid again. It stays in the collection.
 *
 * What this module owns:
 *
 *   · **the figures** a goal can ask for (`commissionFigure`), each about the
 *     seat's own empire only, because commissions are private (ruling 6);
 *   · **progress** (`commissionProgress`), which the card face and the HUD chips
 *     read. A counted goal reads the card's own tally (`tallyOf`); the tally is
 *     written by `recordScalingOccasion` (`statecraft/draft.ts`) only while the
 *     card is seated, and kept when it is unseated (ruling 5);
 *   · **the phase** (`runCommissions`), which checks every seated commission,
 *     pays what is met, and unseats it.
 *
 * Rewards are paid through the existing paths and nothing else: the yields, the
 * unit and the timed effects through `payWindfallGrants`, then
 * `settleGrowthWindfall` and `settleCultureWindfall` exactly as a periodic boon
 * settles; a great person through `grantGreatPersonOffer` (`greatPeople.ts`),
 * which deals an offer or, when one cannot be dealt right now, fills the
 * ladder through `settleRenownWindfall`. Since
 * Dominion batch D6 a reward may also grant citizens (`settlePopulationWindfall`),
 * raise a building in the town that met the goal (`realiseItem`), or add
 * Wildcard chairs for the rest of the game (`refitSlots`). Since Commerce
 * batch T4 a reward may also write the empire's trading post, established at
 * once, in the capital of each empire its routes reach
 * (`writeEstablishedPost`, `trade.ts`).
 */

import {
  bestMeleeFor,
  buildingProductionCost,
  payOccasionRiders,
  realiseItem,
  resourceCopies,
  settleGrowthWindfall,
  settlePopulationWindfall,
  settleProductionWindfall,
} from './cities';
import type { Family } from './greatPeopleData';
import { grantGreatPersonOffer } from './greatPeople';
import { isTendedWork } from './improvementData';
import { getTileAt } from './map';
import { resourcesOfKind } from './resourceData';
import { bumpEconomy } from './slate';
import {
  type City,
  type GameState,
  type Player,
  capitalCityOf,
  citiesOf,
  cityReligion,
  realPlayers,
  tileOwnerField,
} from './state';
import { BUILDING_IDS, buildingDef } from './buildingData';
import { explainEmpireLines, foldEmpireLines } from './yields/empire';
import { cityContext, foldTile } from './yields/hex';
import { foldCity } from './yields/town';
import {
  type PlayerStatecraft,
  type WindfallPayout,
  cityScopeAdmits,
  commissionFulfilledTurn,
  groundFactsFor,
  heldReligions,
  opusCityOf,
  payWindfallGrants,
  settleCultureWindfall,
  slotOf,
  tallyOf,
  tileConditionHolds,
} from './statecraft';
// Straight from its own layer rather than through the `statecraft.ts` index:
// through the index, the build warns of a circular import between chunks.
import { refitSlots } from './statecraft/draft';
import {
  countCitiesAdmitted,
  countTilesInBorders,
  tradePartnerSeats,
} from './statecraft/evaluator';
import {
  type CitizensTarget,
  type CommissionFigure,
  type CommissionGoal,
  type CommissionReward,
  type CommissionSpec,
  type GoalMeasure,
  type OrderId,
  type TileCondition,
  isOrderId,
  orderDef,
} from './statecraftData';
// Commerce batch T4: The World's Fair writes posts through the third writer.
import { writeEstablishedPost } from './trade';
import { type UnitTypeId, unitDef } from './unitData';
import { signedPlain } from './yieldFormat';

// --- the figures ------------------------------------------------------------

/** The cards' `tended` test, asked by the `tendedTiles` figure. */
const TENDED: TileCondition = { test: 'tended' };

/**
 * One figure about this empire, as it stands now. The one place each
 * `CommissionFigure` is measured, so a goal, its reward and the HUD chip read
 * the same number.
 */
export function commissionFigure(
  state: GameState,
  playerId: number,
  figure: CommissionFigure,
  /**
   * The goal the figure is asked for, when it carries a floor on the hexes it
   * counts (`hexYieldAtLeast`, Expansionist batch E5). Every other figure
   * ignores it.
   */
  goal?: CommissionGoal,
): number {
  const player = state.players[playerId];
  if (!player) return 0;
  switch (figure) {
    case 'treasury':
      return player.gold;
    case 'luxuryCopies': {
      // The luxury this empire holds most copies of. `resourceCopies` is the
      // net figure, so copies received in a deal count and copies lent away do
      // not — the sheet's "counting copies you receive in deals".
      let most = 0;
      for (const id of resourcesOfKind('luxury')) {
        most = Math.max(most, resourceCopies(state, playerId, id));
      }
      return most;
    }
    case 'tradeRoutes': {
      let routes = 0;
      for (const unit of state.units) {
        if (unit.ownerId === playerId && unit.trade !== undefined) routes += 1;
      }
      return routes;
    }
    case 'hexesOwned': {
      const owners = tileOwnerField(state);
      let hexes = 0;
      for (let index = 0; index < state.tileOwner.length; index++) {
        if (owners.at(index) === playerId) hexes += 1;
      }
      return hexes;
    }
    case 'improvedTilesWorked': {
      // Any work counts, improved or tended, and a hex counts once. So The Two
      // Harvests (Expansionist batch E9), which makes a farm tended as well as
      // improved, changes nothing here (the triage's reading 14).
      let worked = 0;
      for (const city of state.cities) {
        if (city.ownerId !== playerId) continue;
        for (const at of city.workedTiles) {
          if (getTileAt(state.map, at.col, at.row)?.improvement !== undefined) worked += 1;
        }
      }
      return worked;
    }
    case 'improvedOnlyTilesWorked': {
      // Commission: Break the Sod (Expansionist batch E5): the cards' `improved`
      // reading, so a tended work does not count (the triage's reading 2).
      let worked = 0;
      for (const city of citiesOf(state, playerId)) worked += townFigure(state, city, figure) ?? 0;
      return worked;
    }
    case 'oneTownWorkedHexes': {
      // The Heartland (Expansionist batch E5): the best one town does.
      const best = bestTownFor(state, playerId, goal?.kind === 'reached' ? goal.hexYieldAtLeast : undefined);
      return best === null ? 0 : best.hexes;
    }
    case 'originalCapitalsHeld': {
      // Another empire's first town (`City.originalCapitalOf`, Dominion batch
      // D6) that this empire holds now, however it came to. The empire's own
      // first town never counts, even taken back.
      let held = 0;
      for (const city of citiesOf(state, playerId)) {
        if (city.originalCapitalOf !== undefined && city.originalCapitalOf !== playerId) held += 1;
      }
      return held;
    }
    case 'garrisonedTowns': {
      // Commission: Man the Walls (Dominion batch D11): the towns with a unit
      // standing in them, asked through the `garrisoned` scope so the goal and
      // the reward's scope cannot disagree (the triage's reading 17).
      let manned = 0;
      for (const city of citiesOf(state, playerId)) {
        if (cityScopeAdmits(state, city, { test: 'garrisoned' }, playerId)) manned += 1;
      }
      return manned;
    }
    case 'tendedTiles': {
      // Owned, not worked: Six Gardens asks for tended land the empire holds.
      // The map's tile list and the owner field share one index.
      //
      // Asked through the cards' own `tended` test with this empire's ground
      // facts (Expansionist batch E9), so under The Two Harvests a farm, mine
      // or lumber mill counts here exactly as it counts for a card, and once
      // (the triage's reading 14).
      const owners = tileOwnerField(state);
      const tiles = state.map.tiles;
      const ground = groundFactsFor(state, playerId);
      let tended = 0;
      for (let index = 0; index < tiles.length; index++) {
        const tile = tiles[index]!;
        if (tile.improvement === undefined || owners.at(index) !== playerId) continue;
        if (tileConditionHolds(tile, TENDED, undefined, undefined, state.turn, ground)) tended += 1;
      }
      return tended;
    }
    case 'goldIncome': {
      // The headline the top bar shows, floored: every town's fold plus the
      // empire's own lines, the same sum the empire reading makes. Folded here
      // rather than read through `readEmpire`, because this runs inside an
      // end-of-turn phase and the readings stay out of reach of the reducer
      // (test/sim/slateRegister.test.ts).
      let gold = 0;
      for (const city of citiesOf(state, playerId)) gold += foldCity(state, city, [], city.queue[0]).gold;
      gold += foldEmpireLines(explainEmpireLines(state, playerId)).gold;
      return Math.floor(gold);
    }
    case 'followingCityShare': {
      // The world's towns, every seat's, against the ones flying a faith this
      // empire is paid by. Rounded down, so "more than half" is asked as 51.
      const follows = followsHeldReligion(state, playerId);
      let total = 0;
      let following = 0;
      for (const city of state.cities) {
        total += 1;
        if (follows(city)) following += 1;
      }
      return total === 0 ? 0 : Math.floor((following * 100) / total);
    }
    case 'rivalCapitalsFollowing': {
      const follows = followsHeldReligion(state, playerId);
      let capitals = 0;
      for (const rival of realPlayers(state)) {
        if (rival.id === playerId) continue;
        const capital = capitalCityOf(state, rival.id);
        if (capital && follows(capital)) capitals += 1;
      }
      return capitals;
    }
    case 'academyHexes':
      // The Lynx-Eyed Academy (Scientific batch S8, the triage's reading 53):
      // the count The Republic of Letters pays by, asked through the same walk
      // (`countTilesInBorders`), so the two cards cannot disagree about how
      // many Academies an empire holds, and a work The Studium Generale counts
      // as an Academy counts here too.
      return countTilesInBorders(state, playerId, ACADEMY);
    case 'opusCost': {
      // The Great Instrument (Scientific batch S9, the triage's reading 51):
      // what the row that ends the game costs this empire now, through the
      // one building fold. Found by its marker, never by name.
      const opus = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true);
      return opus === undefined ? 0 : buildingProductionCost(opus, state, playerId);
    }
    case 'citiesAdmitted': {
      // Commission: The Great Fair (Commerce batch T4, the triage's reading
      // 10): the towns the goal's own scope admits, through the
      // `citiesAdmitted` count's walk. With no scope it counts nothing, as the
      // count does.
      const scope = goal?.kind === 'reached' ? goal.admits : undefined;
      return scope === undefined ? 0 : countCitiesAdmitted(state, playerId, scope);
    }
    case 'tradePartnerEmpires':
      // The World's Fair (Commerce batch T4, the triage's reading 11): the
      // `tradePartnerEmpires` count's walk, which the reward reads again.
      return tradePartnerSeats(state, playerId).length;
  }
}

/** An Academy, as The Republic of Letters' tile test names it. */
const ACADEMY: TileCondition = { test: 'improvement', improvement: 'academy' };

/**
 * **A figure read for one town alone**, or `null` when the figure has no town
 * reading (Expansionist batch E5). The Domesday Survey's reward pays each town
 * from its own count of the improved or tended hexes it works, and Break the
 * Sod's goal sums its own count over the towns.
 */
export function townFigure(state: GameState, city: City, figure: CommissionFigure): number | null {
  if (figure !== 'improvedTilesWorked' && figure !== 'improvedOnlyTilesWorked') return null;
  let worked = 0;
  for (const at of city.workedTiles) {
    const work = getTileAt(state.map, at.col, at.row)?.improvement;
    if (work === undefined) continue;
    if (figure === 'improvedOnlyTilesWorked' && isTendedWork(work)) continue;
    worked += 1;
  }
  return worked;
}

/**
 * **The town that works the most rich hexes** (The Heartland, Expansionist
 * batch E5; the triage's reading 40), with its count, or `null` for an empire
 * with no town. A hex counts when it carries a work, improved or tended, and
 * its six yields, as the town works it, add up to at least `atLeast` (any work
 * counts when the floor is absent). Ties go to the earlier town.
 */
export function bestTownFor(
  state: GameState,
  playerId: number,
  atLeast: number | undefined,
): { city: City; hexes: number } | null {
  let best: { city: City; hexes: number } | null = null;
  for (const city of citiesOf(state, playerId)) {
    const ctx = cityContext(state, city);
    let hexes = 0;
    for (const at of city.workedTiles) {
      const tile = getTileAt(state.map, at.col, at.row);
      if (!tile || tile.improvement === undefined) continue;
      if (atLeast !== undefined) {
        const paid = foldTile(tile, ctx);
        const total = paid.food + paid.production + paid.gold + paid.science + paid.culture + paid.faith;
        if (total < atLeast) continue;
      }
      hexes += 1;
    }
    if (best === null || hexes > best.hexes) best = { city, hexes };
  }
  return best;
}

/** Does a town follow a religion this empire is paid by? `heldReligions`' reading. */
function followsHeldReligion(state: GameState, playerId: number): (city: City) => boolean {
  const held = heldReligions(state, playerId).map((religion) => religion.id);
  return (city) => {
    const kept = cityReligion(city);
    return kept !== null && held.includes(kept);
  };
}

// --- progress ---------------------------------------------------------------

/** How far one part of a goal has come. `have` is capped by nothing. */
export interface CommissionGoalProgress {
  goal: CommissionGoal;
  have: number;
  need: number;
  met: boolean;
}

/**
 * What every part of this card's goal stands at for this empire. Empty for a
 * card that is not a commission.
 *
 * A counted part reads the card's tally, which only grows while the card is
 * seated, so an unseated commission shows the progress it kept. A reached part
 * reads the empire as it is now, seated or not; it is only *checked* while the
 * card is seated.
 */
export function commissionProgress(
  state: GameState,
  playerId: number,
  card: OrderId,
): CommissionGoalProgress[] {
  const spec = orderDef(card).commission;
  const sc = state.players[playerId]?.statecraft;
  if (!spec || !sc) return [];
  return spec.goals.map((goal) => {
    const have =
      goal.kind === 'counted' ? tallyOf(sc, card) : commissionFigure(state, playerId, goal.figure, goal);
    return { goal, have, need: goal.count, met: have >= goal.count };
  });
}

/** The seated commissions, in chair order, fulfilled ones excluded. The HUD's list. */
export function seatedCommissions(sc: PlayerStatecraft): OrderId[] {
  const seated: OrderId[] = [];
  for (const slot of sc.slots) {
    const card = slot?.card;
    if (card === undefined || !isOrderId(card)) continue;
    if (orderDef(card).commission === undefined) continue;
    if (commissionFulfilledTurn(sc, card) !== undefined) continue;
    seated.push(card);
  }
  return seated;
}

// --- the phase --------------------------------------------------------------

/**
 * One commission fulfilled during a turn's resolution, for the turn report.
 * `lines` say what was paid, in plain words.
 */
export interface CommissionReport {
  playerId: number;
  card: OrderId;
  name: string;
  /** The turn the goal was met on (the turn that was ending). */
  turn: number;
  lines: string[];
}

/**
 * **The commissions phase.** For every real empire, in seat order, and every
 * chair, in chair order: a seated commission whose every goal part is met pays
 * its reward, leaves its chair, and is marked fulfilled.
 *
 * Its place in `END_OF_TURN_PHASES` is directly after `periodicBoons` and for
 * that phase's reason: the treasury, the routes and the baskets have been
 * settled for the turn, culture paid here reaches the draft in `statecraft`,
 * and renown reaches `renown`. The seal does not hold a met commission in its
 * chair; the seal limits the player, not the card.
 *
 * Deterministic: seat order, chair order and the reward's own row order, and
 * the only randomness is the great-person draw from `state.rng`.
 */
export function runCommissions(state: GameState): CommissionReport[] {
  const reports: CommissionReport[] = [];
  for (const player of realPlayers(state)) {
    const sc = player.statecraft;
    for (let index = 0; index < sc.slots.length; index++) {
      const card = sc.slots[index]?.card;
      if (card === undefined || !isOrderId(card)) continue;
      const spec = orderDef(card).commission;
      if (!spec) continue;
      if (commissionFulfilledTurn(sc, card) !== undefined) continue;
      const progress = commissionProgress(state, player.id, card);
      if (progress.length === 0 || !progress.every((part) => part.met)) continue;
      // Marked and unseated before the reward is paid, so nothing the reward
      // triggers can find the card still in its chair.
      sc.commissionsFulfilled = [...(sc.commissionsFulfilled ?? []), { card, turn: state.turn }];
      if (slotOf(sc, card) === index) sc.slots[index] = null;
      bumpEconomy(state);
      const lines = payCommission(state, player, card, spec);
      // **The moment a commission is met** (Dominion batch D11, The Ovation;
      // the triage's reading 34), once for each commission and after its
      // reward, so a rider sees the empire the reward left.
      payOccasionRiders(state, player, 'commissionMet');
      reports.push({ playerId: player.id, card, name: orderDef(card).name, turn: state.turn, lines });
    }
  }
  return reports;
}

/**
 * Pays one commission's reward and says what it paid.
 *
 * Every figure is read first, before anything is banked, so a reward scaled by
 * the treasury reads the treasury as it stood when the goal was met.
 */
function payCommission(
  state: GameState,
  player: Player,
  card: OrderId,
  spec: CommissionSpec,
): string[] {
  const source = orderDef(card).name;
  const payout: WindfallPayout = {
    amount: 0,
    grants: [],
    heal: 0,
    units: [],
    healAll: false,
    timed: [],
    renown: [],
    pressure: [],
    lines: [],
    claims: [],
  };
  const lines: string[] = [];
  const people: (Family | 'any')[] = [];
  const capital = capitalCityOf(state, player.id);
  // The town that met the goal, read before anything is paid (Dominion batch
  // D6): Take the City's Barracks goes up there.
  const goalTown = commissionGoalTown(state, player.id, card);
  // The empires the routes reach, read before anything is paid (Commerce batch
  // T4, The World's Fair): the goal's own walk, read again now.
  const partners = spec.reward.some((reward) => reward.postsInPartnerCapitals === true)
    ? tradePartnerSeats(state, player.id)
    : [];
  // Citizens, buildings and chairs land after the windfall, so they are kept
  // here in row order.
  const citizens: { amount: number; to: CitizensTarget }[] = [];
  const buildings: CommissionReward['building'][] = [];
  // The rewards paid to each town from its own figure (The Domesday Survey),
  // and whether the goal's town is marked (The Heartland), Expansionist batch E5.
  const eachTown: CommissionReward[] = [];
  let mark = false;
  let chairs = 0;
  for (const reward of spec.reward) {
    if (reward.markTown === true) mark = true;
    if (reward.eachTown === true) {
      eachTown.push(reward);
      continue;
    }
    const amount = rewardAmount(state, player.id, card, reward);
    if (reward.yield !== undefined && amount !== 0) {
      // **Toward the Magnum Opus** (Scientific batch S9, The Great Instrument):
      // the grant's own `toOpus`, so it lands in the town raising the Opus, or
      // in `Player.opusBank` when no town is (`payWindfallGrants`).
      const toOpus = reward.toOpus === true && reward.yield === 'production';
      payout.grants.push({ card, source, yield: reward.yield, amount, ...(toOpus ? { toOpus: true } : {}) });
      const opusTown = toOpus ? opusCityOf(state, player.id) : null;
      const where = toOpus
        ? opusTown !== null
          ? ` toward the Magnum Opus in ${opusTown.name}`
          : ' kept toward the Magnum Opus'
        : (reward.yield === 'food' || reward.yield === 'production') && capital
          ? ` in ${capital.name}`
          : '';
      lines.push(`${signedPlain(amount)} ${reward.yield}${where}`);
    }
    if (reward.unit !== undefined) {
      const type = reward.unit === 'bestMelee' ? bestMeleeFor(state, player.id) : reward.unit;
      if (type !== null) payout.units.push({ card, source, type });
    }
    if (reward.timed !== undefined) {
      payout.timed.push({ card, source, turns: reward.timed.turns, effects: reward.timed.effects });
      lines.push(`${source}'s reward holds for ${reward.timed.turns} turns`);
    }
    if (reward.greatPerson !== undefined) people.push(reward.greatPerson);
    if (reward.citizens !== undefined && reward.citizens > 0) {
      citizens.push({ amount: Math.floor(reward.citizens), to: reward.citizensTo ?? 'capital' });
    }
    if (reward.building !== undefined) buildings.push(reward.building);
    if (reward.wildcardChairs !== undefined && reward.wildcardChairs > 0) {
      chairs += Math.floor(reward.wildcardChairs);
    }
  }
  const realized: { type: UnitTypeId; cityName: string }[] = [];
  const touched = payWindfallGrants(state, player, payout, undefined, realized);
  // The settlement register's own rule, as `payPeriodicBoon` keeps it: a grant
  // that filled a basket settles it the instant it lands.
  for (const city of touched) settleGrowthWindfall(state, city);
  settleCultureWindfall(state, player);
  for (const piece of realized) lines.push(`a free ${unitDef(piece.type).name} in ${piece.cityName}`);
  for (const family of people) lines.push(grantGreatPersonOffer(state, player, family));
  // **Citizens** (Dominion batch D6, Commission: Clear the Frontier) through
  // the population windfall, which pays the growth riders for each one and
  // re-seats the town (`refreshCityDerived`'s register, entry 13).
  for (const grant of citizens) {
    for (const town of citizenTowns(state, player.id, grant.to)) {
      settlePopulationWindfall(state, town, grant.amount);
      lines.push(`${signedPlain(grant.amount)} citizens in ${town.name}`);
    }
  }
  // **A building in the town that met the goal** (Commission: Take the City),
  // through `realiseItem` as a building grant is. Nothing when that town is no
  // longer this empire's or already has it.
  for (const id of buildings) {
    if (id === undefined || !goalTown || goalTown.ownerId !== player.id) continue;
    if (goalTown.buildings.includes(id)) continue;
    realiseItem(state, goalTown, { kind: 'building', id });
    lines.push(`a free ${buildingDef(id).name} in ${goalTown.name}`);
  }
  // **Each town from its own figure** (The Domesday Survey, Expansionist batch
  // E5): read for every town before anything is paid, then paid town by town.
  for (const reward of eachTown) lines.push(...payEachTown(state, player, card, reward));
  // **Your trading post in each partner's capital** (Commerce batch T4, The
  // World's Fair; the triage's reading 11), in the order the routes first
  // reach the partners. Each post is written established, and the writer pays
  // the moment a post is established once for it (The Fondaci). A capital
  // that already holds your established post, and a partner with no capital,
  // give nothing.
  for (const seat of partners) {
    const capital = capitalCityOf(state, seat);
    if (!capital) continue;
    if (writeEstablishedPost(state, capital, player.id)) {
      lines.push(`your trading post in ${capital.name}`);
    }
  }
  // **The goal's town is marked** (The Heartland): its lasting effects are
  // scoped to it (`markedBy`), and they live from this turn on.
  if (mark && goalTown && goalTown.ownerId === player.id) {
    markGoalTown(state, goalTown, card);
    lines.push(`${goalTown.name} is marked for the rest of the game`);
  }
  // **Wildcard chairs for the rest of the game** (Commission: A Victor's
  // Peace). Written down, then the council is resized to them, keeping every
  // card where it sits (`refitSlots`, which announces the new chair).
  if (chairs > 0) {
    player.statecraft.chairsWon = (player.statecraft.chairsWon ?? 0) + chairs;
    refitSlots(state, player);
    lines.push(chairs === 1 ? 'one more Wildcard chair' : `${chairs} more Wildcard chairs`);
  }
  return lines;
}

/**
 * **The town that met a commission's goal**, or `null` (Dominion batch D6). For
 * a counted goal it is the last town the goal counted (`OrderTally.town`): the
 * town Take the City or The Captured Marvel took. `null` when the goal counts
 * no towns, or when the town has since been razed.
 *
 * The one reading of "that town" for a reward, so a later goal that one town
 * meets (The Heartland's) names its town here and every reward that reads it
 * follows.
 */
export function commissionGoalTown(state: GameState, playerId: number, card: OrderId): City | null {
  const sc = state.players[playerId]?.statecraft;
  if (!sc) return null;
  // **A goal one town meets by a figure** (The Heartland, Expansionist batch
  // E5): the town that holds the figure's best count now.
  for (const goal of orderDef(card).commission?.goals ?? []) {
    if (goal.kind !== 'reached' || goal.figure !== 'oneTownWorkedHexes') continue;
    return bestTownFor(state, playerId, goal.hexYieldAtLeast)?.city ?? null;
  }
  const id = sc.tallies.find((row) => row.card === card)?.town;
  if (id === undefined) return null;
  return state.cities.find((city) => city.id === id) ?? null;
}

/**
 * **Pays one reward to every town, each from its own figure** (Expansionist
 * batch E5, The Domesday Survey; the triage's reading 44). Every town's figure
 * is read first, in founding order, and then each town is paid through the
 * one windfall delivery, at its own centre, so the food or production lands in
 * that town and settles at once. Says what it paid, town by town.
 *
 * Since Dominion batch D11 (Commission: Man the Walls) a reward with no
 * `fromFigure` pays its `amount` flat, and `scope` says which towns are paid.
 * The scope is asked of every town before anything is paid, as the figures
 * are, so a payment cannot change which towns the reward reaches.
 */
function payEachTown(state: GameState, player: Player, card: OrderId, reward: CommissionReward): string[] {
  const source = orderDef(card).name;
  const lines: string[] = [];
  if (reward.yield === undefined) return lines;
  const figure = reward.fromFigure;
  const owed = citiesOf(state, player.id).map((city) => ({
    city,
    amount: !cityScopeAdmits(state, city, reward.scope, player.id)
      ? 0
      : figure === undefined
        ? (reward.amount ?? 0)
        : (reward.amount ?? 0) * (townFigure(state, city, figure) ?? 0),
  }));
  for (const { city, amount } of owed) {
    if (amount === 0) continue;
    const payout: WindfallPayout = {
      amount: 0,
      grants: [{ card, source, yield: reward.yield, amount }],
      heal: 0,
      units: [],
      healAll: false,
      timed: [],
      renown: [],
      pressure: [],
      lines: [],
      claims: [],
    };
    for (const town of payWindfallGrants(state, player, payout, { col: city.col, row: city.row })) {
      if (!settleGrowthWindfall(state, town)) settleProductionWindfall(state, town);
    }
    lines.push(`${signedPlain(amount)} ${reward.yield} in ${city.name}`);
  }
  return lines;
}

/**
 * **Marks a town for a commission**, for the empire that holds it now
 * (Expansionist batch E5, The Heartland). The one writer of `City.markedBy`.
 * The mark is read by the `markedBy` town scope, which can reach the meters,
 * so the write is announced (the slate register).
 */
export function markGoalTown(state: GameState, city: City, card: OrderId): void {
  const marks = city.markedBy ?? [];
  if (marks.some((mark) => mark.card === card && mark.owner === city.ownerId)) return;
  city.markedBy = [...marks, { card, owner: city.ownerId }];
  bumpEconomy(state);
}

/**
 * What a reward reads off the goal it pays for (`CommissionReward.fromGoal`,
 * Dominion batch D6): the citizens of the towns the goal counted, or the world
 * wonders in them, as kept by the tally (`OrderTally`). Nought for a goal that
 * kept nothing.
 */
export function commissionGoalMeasure(
  state: GameState,
  playerId: number,
  card: OrderId,
  measure: GoalMeasure,
): number {
  const held = state.players[playerId]?.statecraft.tallies.find((row) => row.card === card);
  if (!held) return 0;
  return measure === 'population' ? (held.people ?? 0) : (held.wonders ?? 0);
}

/**
 * The towns a reward's citizens go to (Dominion batch D6): the capital, or the
 * `n` smallest towns, ties going to the earlier town (The Wide Country, the
 * Expansionist triage's reading 35).
 */
function citizenTowns(state: GameState, playerId: number, to: CitizensTarget): City[] {
  if (to === 'capital') {
    const capital = capitalCityOf(state, playerId);
    return capital ? [capital] : [];
  }
  const towns = citiesOf(state, playerId).map((city, order) => ({ city, order }));
  towns.sort((x, y) => x.city.population - y.city.population || x.order - y.order);
  return towns.slice(0, Math.max(0, Math.floor(to.smallest))).map((entry) => entry.city);
}

/**
 * One reward line's figure: flat, a share of a figure read now, or (Dominion
 * batch D6) a share of what the goal counted.
 */
function rewardAmount(
  state: GameState,
  playerId: number,
  card: OrderId,
  reward: CommissionReward,
): number {
  const amount = reward.amount ?? 0;
  if (reward.fromGoal !== undefined) return amount * commissionGoalMeasure(state, playerId, card, reward.fromGoal);
  if (reward.fromFigure === undefined) return amount;
  const scaled = amount * commissionFigure(state, playerId, reward.fromFigure);
  // A basket holds whole food and whole hammers (Scientific batch S9, The
  // Great Instrument's tenth of the Opus), so a share of a figure paid into
  // one is floored. The banks keep their figure as it comes.
  return reward.yield === 'food' || reward.yield === 'production' ? Math.floor(scaled) : scaled;
}
