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
 * settles; a great person through `drawGreatPersonOffer`, or through
 * `settleRenownWindfall` when an offer cannot be dealt right now.
 */

import { bestMeleeFor, resourceCopies, settleGrowthWindfall } from './cities';
import type { Family } from './greatPeopleData';
import { drawGreatPersonOffer } from './greatPeople';
import { getTileAt } from './map';
import { planRecruitment, renownThreshold, settleRenownWindfall } from './renown';
import { resourcesOfKind } from './resourceData';
import { bumpEconomy } from './slate';
import { type GameState, type Player, capitalCityOf, realPlayers, tileOwnerField } from './state';
import {
  type PlayerStatecraft,
  type WindfallPayout,
  commissionFulfilledTurn,
  payWindfallGrants,
  settleCultureWindfall,
  slotOf,
  tallyOf,
} from './statecraft';
import {
  type CommissionFigure,
  type CommissionGoal,
  type CommissionReward,
  type CommissionSpec,
  type OrderId,
  isOrderId,
  orderDef,
} from './statecraftData';
import { hasAbility } from './tech';
import { type UnitTypeId, unitDef } from './unitData';
import { signedPlain } from './yieldFormat';

// --- the figures ------------------------------------------------------------

/**
 * One figure about this empire, as it stands now. The one place each
 * `CommissionFigure` is measured, so a goal, its reward and the HUD chip read
 * the same number.
 */
export function commissionFigure(
  state: GameState,
  playerId: number,
  figure: CommissionFigure,
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
      let worked = 0;
      for (const city of state.cities) {
        if (city.ownerId !== playerId) continue;
        for (const at of city.workedTiles) {
          if (getTileAt(state.map, at.col, at.row)?.improvement !== undefined) worked += 1;
        }
      }
      return worked;
    }
  }
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
      goal.kind === 'counted' ? tallyOf(sc, card) : commissionFigure(state, playerId, goal.figure);
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
  for (const reward of spec.reward) {
    const amount = rewardAmount(state, player.id, reward);
    if (reward.yield !== undefined && amount !== 0) {
      payout.grants.push({ card, source, yield: reward.yield, amount });
      const where =
        (reward.yield === 'food' || reward.yield === 'production') && capital ? ` in ${capital.name}` : '';
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
  }
  const realized: { type: UnitTypeId; cityName: string }[] = [];
  const touched = payWindfallGrants(state, player, payout, undefined, realized);
  // The settlement register's own rule, as `payPeriodicBoon` keeps it: a grant
  // that filled a basket settles it the instant it lands.
  for (const city of touched) settleGrowthWindfall(state, city);
  settleCultureWindfall(state, player);
  for (const piece of realized) lines.push(`a free ${unitDef(piece.type).name} in ${piece.cityName}`);
  for (const family of people) lines.push(grantGreatPerson(state, player, family));
  return lines;
}

/** One reward line's figure: flat, or a share of a figure read now. */
function rewardAmount(state: GameState, playerId: number, reward: CommissionReward): number {
  const amount = reward.amount ?? 0;
  if (reward.fromFigure === undefined) return amount;
  return amount * commissionFigure(state, playerId, reward.fromFigure);
}

/**
 * A great person as a reward. When the empire may call great people and has
 * none waiting, an offer is dealt now, narrowed to the family the card names
 * (the same draw the Academy's scholar draft uses). Otherwise the ladder is
 * filled to its next rung instead (the same grant The Laureate pays), so the
 * person arrives as soon as the waiting one is chosen or the rites are known.
 */
function grantGreatPerson(state: GameState, player: Player, family: Family | 'any'): string {
  const narrowed = family === 'any' ? undefined : family;
  const word = narrowed === undefined ? 'a great person' : `a great ${narrowed}`;
  if (player.greatPersonOffer === undefined && hasAbility(state, player.id, 'ancestorRites')) {
    const offer = drawGreatPersonOffer(state, player, narrowed);
    if (offer.options.length > 0) {
      player.greatPersonOffer = offer;
      bumpEconomy(state);
      return `${word} to call`;
    }
  }
  const plan = planRecruitment(player);
  const owed = plan === null ? renownThreshold(player) - player.renownPool : 0;
  settleRenownWindfall(state, player, [{ family: narrowed ?? null, amount: Math.max(0, owed) }]);
  return `renown for ${word}`;
}
