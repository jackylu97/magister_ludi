/**
 * **Levies** (batch L, `docs/plans/deck-implementation.md`): a town gives up one
 * of its citizens and gets something for it.
 *
 * What a levy can buy comes entirely from the cards the empire holds — the
 * `levy` effect kind, read in `statecraft/evaluator.ts` (`cardLevyGrants`,
 * `cardLevyAftermaths`). An empire with no levy card has no levy at all, and the
 * city panel shows no button. The uses are listed on `LevyUse`.
 *
 * The rules that do not depend on a card live in `rules.cities.levy`: a town
 * needs at least two citizens, and waits five turns between levies. Every use
 * shares that one waiting period; a card may shorten it for its own use while
 * the empire is at war (The General Levy), or lift it on some turns of the
 * world's calendar (The Slack Season). The waiting period is read from an
 * absolute stamp on the town (`City.levy.turn`, the last levy), never counted
 * down.
 *
 * Expansionist batch E1 added four uses (a worker, a settler, science, and
 * hammers for a world wonder in another town), a lifetime record of citizens
 * levied (`Player.citizensLevied`, written by `recordLevy`), the mark a levy
 * leaves on the piece it raises (`Unit.levied`), and citizens who come home
 * twenty turns later (The Mit'a: `CityLevyRecord.returns`, given back by the
 * `levyReturns` phase, `returnLeviedCitizens`).
 *
 * Three functions, in the shape `guilds.ts` uses for its own verb:
 *
 *   · `levyOptions` — what the panel lists, each with its figure and the card
 *     that grants it, and the reason it is greyed if it is;
 *   · `levyError` — the one refusal, asked by the panel and by the command;
 *   · `levyAt` — the mutation, called only after `levyError` said yes.
 *
 * All three ask `levyGrantFor` which card's row governs a use in a town, since
 * Dominion batch D1 made a row's reach depend on the town (The Devshirme's
 * captured towns) and gave a row a starting rank for the unit it raises.
 *
 * Bots ignore levies for now.
 */

import {
  growthThreshold,
  loseCitizen,
  realiseItem,
  refreshCityDerived,
  settlePopulationWindfall,
  settleProductionWindfall,
  bestMeleeFor,
  bestOfClassFor,
  spawnTileFor,
} from './cities';
import { buildingDef, isBuildingId, isWonder } from './buildingData';
import { RULES } from './rulesData';
import { totalSpecialists } from './specialists';
import { bumpEconomy } from './slate';
import { type City, type GameState, citiesOf, hasEndedTurn, playerById } from './state';
import {
  type LevyGrant,
  anyCardDef,
  cardLevyAftermaths,
  cardLevyGrants,
  cardLevyNoWait,
  cardLevyReturnDelay,
} from './statecraft/evaluator';
import { type CardId, type LevyUse, LEVY_USES } from './statecraftData';
import { type Tile, getTileAt, tileHex, wrappedDistance } from './map';
import { settleResearchWindfall } from './tech';
import { type UnitTypeId, unitDef } from './unitData';
import { rankThreshold } from './ranks';

const LEVY = RULES.cities.levy;

/** One line of the levy menu. See `levyOptions`. */
export interface LevyOption {
  use: LevyUse;
  /** The card that grants this use, and its name for the line under it. */
  card: CardId;
  cardName: string;
  /** What the citizen buys, in the player's words: "Production here". */
  label: string;
  /** Hammers paid, for the uses that pay hammers; otherwise `null`. */
  hammers: number | null;
  /** Beakers paid, for the use that pays science; otherwise `null`. */
  science: number | null;
  /** The piece raised, for the uses that raise one; otherwise `null`. */
  unit: UnitTypeId | null;
  /**
   * The town the hammers go to, for The Corvée and The Builders' Levy;
   * otherwise `null`.
   */
  targetCityId: number | null;
  /** Turns this town would wait after this levy before it may levy again. */
  every: number;
  /** Why this line cannot be chosen now, or `null` when it can. */
  blocked: string | null;
}

/** What a levy did, for the caller that reports it. */
export interface LevyReport {
  use: LevyUse;
  cityId: number;
  /** The town's population after the levy. */
  population: number;
  hammers?: number;
  /** The beakers banked, for the use that pays science. */
  science?: number;
  /** The town the hammers went to, when it was not the levying town. */
  targetCityId?: number;
  unitId?: number;
}

/** Is the empire at war with another empire? The wild does not count. */
function atWarWithAnEmpire(state: GameState, playerId: number): boolean {
  return state.wars.some((war) => war.a === playerId || war.b === playerId);
}

/** The smallest town a row lets levy: its own floor, never below the rule's. */
function floorOf(grant: LevyGrant): number {
  return Math.max(LEVY.minPopulation, Math.floor(grant.minPopulation ?? 0));
}

/** A row's starting rank as a number to compare: its threshold, or 0 for none. */
function rankWeight(grant: LevyGrant): number {
  return grant.rank === undefined ? 0 : rankThreshold(grant.rank);
}

/**
 * **The row that governs this use in this town**, or `undefined` when no card
 * the empire holds lets this town levy for it (Dominion batch D1).
 *
 * Two cards may grant the same use: The Muster of the Fields lets any town of
 * five muster a melee unit, and The Devshirme lets a captured town of six muster
 * one as a Veteran. The town's menu shows one line for the use, so one row has
 * to govern it, and the choice must not depend on the order the cards sit in:
 *
 *   · among the rows whose floor this town meets, the one whose unit starts at
 *     the highest rank, then the first in the law's order;
 *   · when the town meets no row's floor, the row with the lowest floor, then
 *     the first in the law's order, so the refusal names the smallest town that
 *     would do.
 *
 * Rows whose scope does not admit the town never reach this function
 * (`cardLevyGrants`).
 */
export function levyGrantFor(
  state: GameState,
  playerId: number,
  city: City,
  use: LevyUse,
): LevyGrant | undefined {
  const rows = cardLevyGrants(state, playerId, city).filter((row) => row.use === use);
  let best: LevyGrant | undefined;
  for (const row of rows) {
    if (city.population < floorOf(row)) continue;
    if (best === undefined || rankWeight(row) > rankWeight(best)) best = row;
  }
  if (best !== undefined) return best;
  for (const row of rows) {
    if (best === undefined || floorOf(row) < floorOf(best)) best = row;
  }
  return best;
}

/** Turns a town waits after a levy of this use. */
function waitFor(state: GameState, playerId: number, grant: LevyGrant): number {
  if (grant.everyAtWar !== undefined && atWarWithAnEmpire(state, playerId)) {
    return Math.max(1, Math.floor(grant.everyAtWar));
  }
  return Math.max(1, Math.floor(LEVY.everyTurns));
}

/**
 * Turns until this town may levy again for this use, or 0 when it may now.
 * Read off the absolute stamp of its last levy.
 */
export function levyTurnsLeft(
  state: GameState,
  city: City,
  every: number,
): number {
  const last = city.levy?.turn;
  if (last === undefined) return 0;
  return Math.max(0, last + every - state.turn);
}

/** The food it took this town to grow its newest citizen: what a levy pays. */
export function levyHammers(city: City): number {
  return growthThreshold(Math.max(1, city.population - 1));
}

/**
 * The empire's town with the Magnum Opus at the front of its queue, other than
 * `except`, or `null`. The first such town in founding order, so a replay picks
 * the same one. The Opus is found by its marker, never by name.
 */
export function opusWorkshop(state: GameState, playerId: number, except: City): City | null {
  for (const city of citiesOf(state, playerId)) {
    if (city.id === except.id) continue;
    const front = city.queue[0];
    if (!front || front.kind !== 'building' || !isBuildingId(front.id)) continue;
    if (buildingDef(front.id).endsTheGame === true) return city;
  }
  return null;
}

/**
 * The empire's **other** town with a world wonder at the front of its queue
 * that lies nearest this one, or `null`, for The Builders' Levy (Expansionist
 * batch E1). Nearest by hex distance; a tie goes to the town founded first, so
 * a replay picks the same one. A world wonder is a row the roster marks as a
 * wonder (`isWonder`); the Magnum Opus is not one, and The Corvée sends hammers
 * there.
 */
export function wonderWorkshop(state: GameState, playerId: number, from: City): City | null {
  const here = getTileAt(state.map, from.col, from.row);
  let best: City | null = null;
  let bestDistance = Infinity;
  for (const city of citiesOf(state, playerId)) {
    if (city.id === from.id) continue;
    const front = city.queue[0];
    if (!front || front.kind !== 'building' || !isBuildingId(front.id) || !isWonder(front.id)) continue;
    const there = getTileAt(state.map, city.col, city.row);
    const distance = here && there ? wrappedDistance(state.map, tileHex(here), tileHex(there)) : 0;
    // Strictly nearer, so the first in founding order keeps a tie.
    if (best === null || distance < bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * The piece a use raises for this empire, or `null` when it can build none
 * yet: the best melee unit for `muster` and `conscript`, and the first worker
 * or settler row it can build for `worker` and `settler` (Expansionist batch
 * E1). The model class is the roster's own word for a line (`bestOfClassFor`),
 * so a leader's own worker or settler is the one raised, and nothing here
 * compares a unit type against a name.
 */
function levyUnitFor(state: GameState, playerId: number, use: LevyUse): UnitTypeId | null {
  if (use === 'muster' || use === 'conscript') return bestMeleeFor(state, playerId);
  if (use === 'worker') return bestOfClassFor(state, playerId, 'worker');
  if (use === 'settler') return bestOfClassFor(state, playerId, 'settler');
  return null;
}

/** What one use pays from this town, and where — before the citizen leaves. */
interface LevyPlan {
  hammers: number | null;
  science: number | null;
  unit: UnitTypeId | null;
  tile: Tile | null;
  target: City | null;
}

function planLevy(state: GameState, city: City, use: LevyUse): LevyPlan {
  const none: LevyPlan = { hammers: null, science: null, unit: null, tile: null, target: null };
  switch (use) {
    case 'production':
      return { ...none, hammers: levyHammers(city), target: city };
    case 'opus':
      return { ...none, hammers: levyHammers(city), target: opusWorkshop(state, city.ownerId, city) };
    case 'wonder':
      return { ...none, hammers: levyHammers(city), target: wonderWorkshop(state, city.ownerId, city) };
    case 'science':
      return { ...none, science: levyHammers(city) };
    case 'muster':
    case 'conscript':
    case 'worker':
    case 'settler': {
      const unit = levyUnitFor(state, city.ownerId, use);
      const tile = unit === null ? null : spawnTileFor(state, city, unit);
      return { ...none, unit, tile };
    }
    default: {
      const unhandled: never = use;
      void unhandled;
      return none;
    }
  }
}

/** The menu line's words for a use. */
function labelFor(use: LevyUse, plan: LevyPlan): string {
  if (use === 'production') return 'Production here';
  if (use === 'opus') return 'Send to the Magnum Opus';
  if (use === 'science') return 'Science';
  if (use === 'wonder') {
    const front = plan.target?.queue[0];
    return front && front.kind === 'building' && isBuildingId(front.id)
      ? `Send to ${buildingDef(front.id).name}`
      : 'Send to a world wonder';
  }
  return plan.unit === null ? 'Raise a unit' : `Raise ${unitDef(plan.unit).name}`;
}

/** The plain word for what a use raises, for a refusal. */
function raisedWord(use: LevyUse): string {
  if (use === 'worker') return 'a worker';
  if (use === 'settler') return 'a settler';
  return 'a melee unit';
}

/**
 * Why this town may not levy for this use, or `null` when it may.
 *
 * The one refusal: the city panel greys a line with it and the command returns
 * it, so the sentence on the hover is the sentence the reducer would give.
 */
export function levyError(
  state: GameState,
  playerId: number,
  city: City,
  use: LevyUse,
): string | null {
  if (city.ownerId !== playerId) return `${city.name} does not belong to you`;
  if (hasEndedTurn(state, playerId)) return `You have ended turn ${state.turn}`;
  if (city.puppet === true) return `${city.name} is a puppet and chooses for itself`;
  const grant = levyGrantFor(state, playerId, city, use);
  if (grant === undefined) return `None of your cards lets ${city.name} levy for that`;
  return grantError(state, city, grant);
}

/** The refusals that depend on the town and on the granting card. */
function grantError(state: GameState, city: City, grant: LevyGrant): string | null {
  const least = floorOf(grant);
  if (city.population < least) {
    return `A town needs at least ${least} citizens to levy for this`;
  }
  if (city.population - totalSpecialists(city) < 1) {
    return `Every citizen of ${city.name} works in a guild`;
  }
  // The Slack Season (Expansionist batch E1): on a turn with no wait, the
  // stamp is not read. Every other refusal still is.
  const left = cardLevyNoWait(state, city.ownerId)
    ? 0
    : levyTurnsLeft(state, city, waitFor(state, city.ownerId, grant));
  if (left > 0) {
    return `${city.name} can levy again in ${left} ${left === 1 ? 'turn' : 'turns'}`;
  }
  const plan = planLevy(state, city, grant.use);
  if (grant.use === 'opus' && plan.target === null) {
    return 'None of your other towns is building the Magnum Opus';
  }
  if (grant.use === 'wonder' && plan.target === null) {
    return 'None of your other towns is building a world wonder';
  }
  const raises =
    grant.use === 'muster' ||
    grant.use === 'conscript' ||
    grant.use === 'worker' ||
    grant.use === 'settler';
  if (raises && plan.unit === null) {
    return `You cannot build ${raisedWord(grant.use)} yet`;
  }
  if (raises && plan.tile === null) {
    return `There is no room beside ${city.name} for a new unit`;
  }
  return null;
}

/**
 * The levy menu for one town: one line per use the empire's cards grant, in
 * `LEVY_USES` order, each with its figure, its card and its refusal. Empty when
 * no card grants a levy, which is the panel's signal to show no button.
 */
export function levyOptions(state: GameState, playerId: number, city: City): LevyOption[] {
  const options: LevyOption[] = [];
  for (const use of LEVY_USES) {
    const grant = levyGrantFor(state, playerId, city, use);
    if (grant === undefined) continue;
    const plan = planLevy(state, city, use);
    options.push({
      use,
      card: grant.card,
      cardName: anyCardDef(grant.card).name,
      label: labelFor(use, plan),
      hammers: plan.hammers,
      science: plan.science,
      unit: plan.unit,
      targetCityId: use === 'opus' || use === 'wonder' ? (plan.target?.id ?? null) : null,
      every: waitFor(state, playerId, grant),
      blocked: levyError(state, playerId, city, use),
    });
  }
  return options;
}

/**
 * Spends one of this town's citizens on `use`. Call only after `levyError`
 * answered `null`.
 *
 * The order is the rule:
 *
 *   1. what the levy pays is read off the town **as it stood**, so the food it
 *      took to grow the citizen is the citizen being spent;
 *   2. the town's stamp is written, so the waiting period starts this turn;
 *   3. the citizen leaves through `loseCitizen`, the same routine a famine uses,
 *      and the empire's record of citizens levied goes up (`recordLevy`);
 *   4. the payment lands: hammers through `settleProductionWindfall` (into this
 *      town, into the town building the Magnum Opus, or into the nearest town
 *      building a world wonder), beakers through `settleResearchWindfall`, a
 *      piece through `realiseItem`. The piece counts as trained for The Muster
 *      of the Fields only, at the rank the governing row names (The Devshirme's
 *      Veteran), and marked with the use that raised it (`Unit.levied`);
 *   5. any card that reacts to a levy hangs its effects on the town, and a card
 *      that sends the citizen home later writes the turn it returns (The Mit'a);
 *   6. the town is re-seated (`refreshCityDerived`, register entry 23).
 *
 * The governing row is read before the citizen leaves, like the payment in
 * step 1, so The Devshirme's floor of six is checked against the town as it
 * was when it chose to levy.
 */
export function levyAt(state: GameState, city: City, use: LevyUse): LevyReport {
  const plan = planLevy(state, city, use);
  const rank = levyGrantFor(state, city.ownerId, city, use)?.rank;
  city.levy = { ...city.levy, turn: state.turn };
  loseCitizen(state, city);
  recordLevy(state, city);

  const report: LevyReport = { use, cityId: city.id, population: city.population };
  if (plan.hammers !== null && plan.target !== null) {
    plan.target.hammerBasket += plan.hammers;
    settleProductionWindfall(state, plan.target);
    report.hammers = plan.hammers;
    if (plan.target.id !== city.id) report.targetCityId = plan.target.id;
  }
  // The Terraces of Moray (Expansionist batch E1): beakers for the empire,
  // banked at once and settled the way every one-time grant of science is.
  const player = playerById(state, city.ownerId);
  if (plan.science !== null && player !== undefined) {
    player.sciencePool += plan.science;
    // A bank is a line of the meters' fold (`slate.ts`), so the write announces.
    bumpEconomy(state);
    settleResearchWindfall(state, player);
    report.science = plan.science;
  }
  if (plan.unit !== null && plan.tile !== null) {
    // Only The Muster of the Fields' unit counts as trained: its text says so.
    // A conscript, a worker and a settler a levy raised are gained, not trained.
    const trained = use === 'muster';
    const realised = realiseItem(
      state,
      city,
      { kind: 'unit', id: plan.unit, tile: plan.tile },
      {
        ...(trained ? {} : { untrained: true }),
        ...(rank !== undefined ? { rank } : {}),
        levied: use,
      },
    );
    if (realised.unitId !== undefined) report.unitId = realised.unitId;
  }
  hangAftermaths(state, city);
  scheduleReturn(state, city);
  refreshCityDerived(state, city);
  return report;
}

/**
 * **The empire's record of citizens levied** goes up by one. It is The Labour
 * Rolls' count (`Player.citizensLevied`, Expansionist batch E1). The one writer
 * of the record, called only by `levyAt`. A count can reach the meters, so the
 * write announces itself.
 */
function recordLevy(state: GameState, city: City): void {
  const player = playerById(state, city.ownerId);
  if (player === undefined) return;
  player.citizensLevied = (player.citizensLevied ?? 0) + 1;
  bumpEconomy(state);
}

/**
 * **Writes the turn a levied citizen comes home**, when a card the empire holds
 * says it does: The Mit'a (Expansionist batch E1). The turn is absolute, and
 * the empire that levied is written beside it, so a town that changes hands
 * gives its new owner nothing (`returnLeviedCitizens`).
 */
function scheduleReturn(state: GameState, city: City): void {
  const delay = cardLevyReturnDelay(state, city.ownerId);
  if (delay === null) return;
  const record = city.levy ?? { turn: state.turn };
  record.returns = [...(record.returns ?? []), { turn: state.turn + delay, ownerId: city.ownerId }];
  city.levy = record;
}

/**
 * **The `levyReturns` phase**: every citizen whose return turn has come goes
 * back to its town, for The Mit'a (Expansionist batch E1).
 *
 * A citizen comes home through `settlePopulationWindfall` with its growth
 * riders off: the town had that citizen before the levy took it, so its return
 * is not growth. An entry written by an empire that no longer holds the town is
 * dropped without paying. Towns are walked in founding order and each town's
 * entries in the order they were written, so a replay returns the same
 * citizens on the same turn.
 */
export function returnLeviedCitizens(state: GameState): void {
  for (const city of state.cities) {
    const due = city.levy?.returns;
    if (due === undefined || due.length === 0) continue;
    const waiting: { turn: number; ownerId: number }[] = [];
    let back = 0;
    for (const entry of due) {
      if (entry.ownerId !== city.ownerId) continue;
      if (entry.turn > state.turn) {
        waiting.push(entry);
        continue;
      }
      back += 1;
    }
    const record = city.levy!;
    if (waiting.length > 0) record.returns = waiting;
    else delete record.returns;
    if (back > 0) settlePopulationWindfall(state, city, back, { riders: false });
  }
}

/**
 * Hangs every levy aftermath the empire's cards carry on the town that levied
 * (Seasonal Levies). Each card hangs at most once every `after.every` turns per
 * town, read off `City.levy.after`; the effects run for `after.turns` turns as
 * ordinary `City.timed` entries, folded by the readers that fold a rite.
 */
function hangAftermaths(state: GameState, city: City): void {
  let hung = false;
  for (const { card, after } of cardLevyAftermaths(state, city.ownerId)) {
    const last = city.levy?.after?.[card];
    if (last !== undefined && state.turn < last + Math.max(1, Math.floor(after.every))) continue;
    const expiresTurn = state.turn + Math.max(1, Math.floor(after.turns));
    const list = city.timed ?? [];
    for (const effect of after.effects) list.push({ card, effect, expiresTurn });
    city.timed = list;
    // Spread first, so a record's other fields (The Mit'a's due returns) stay.
    city.levy = {
      ...city.levy,
      turn: city.levy?.turn ?? state.turn,
      after: { ...city.levy?.after, [card]: state.turn },
    };
    hung = true;
  }
  // A timed effect on a town is folded into the empire's meters (a rite's
  // reason, `stampRite`), so the write is announced.
  if (hung) bumpEconomy(state);
}
