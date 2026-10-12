/**
 * **Levies** (batch L, `docs/plans/deck-implementation.md`): a town gives up one
 * of its citizens and gets something for it.
 *
 * What a levy can buy comes entirely from the cards the empire holds — the
 * `levy` effect kind, read in `statecraft/evaluator.ts` (`cardLevyGrants`,
 * `cardLevyAftermaths`). An empire with no levy card has no levy at all, and the
 * city panel shows no button. The four uses are listed on `LevyUse`.
 *
 * The rules that do not depend on a card live in `rules.cities.levy`: a town
 * needs at least two citizens, and waits five turns between levies. Every use
 * shares that one waiting period; a card may shorten it for its own use while
 * the empire is at war (The General Levy). The waiting period is read from an
 * absolute stamp on the town (`City.levy.turn`, the last levy), never counted
 * down.
 *
 * Three functions, in the shape `guilds.ts` uses for its own verb:
 *
 *   · `levyOptions` — what the panel lists, each with its figure and the card
 *     that grants it, and the reason it is greyed if it is;
 *   · `levyError` — the one refusal, asked by the panel and by the command;
 *   · `levyAt` — the mutation, called only after `levyError` said yes.
 *
 * Bots ignore levies for now.
 */

import {
  growthThreshold,
  loseCitizen,
  realiseItem,
  refreshCityDerived,
  settleProductionWindfall,
  bestMeleeFor,
  spawnTileFor,
} from './cities';
import { buildingDef, isBuildingId } from './buildingData';
import { RULES } from './rulesData';
import { totalSpecialists } from './specialists';
import { bumpEconomy } from './slate';
import { type City, type GameState, citiesOf, hasEndedTurn } from './state';
import {
  type LevyGrant,
  anyCardDef,
  cardLevyAftermaths,
  cardLevyGrants,
} from './statecraft/evaluator';
import { type CardId, type LevyUse, LEVY_USES } from './statecraftData';
import { type Tile } from './map';
import { type UnitTypeId, unitDef } from './unitData';

const LEVY = RULES.cities.levy;

/** One line of the levy menu. See `levyOptions`. */
export interface LevyOption {
  use: LevyUse;
  /** The card that grants this use, and its name for the line under it. */
  card: CardId;
  cardName: string;
  /** What the citizen buys, in the player's words: "Production here". */
  label: string;
  /** Hammers paid, for the two uses that pay hammers; otherwise `null`. */
  hammers: number | null;
  /** The piece raised, for the two uses that raise one; otherwise `null`. */
  unit: UnitTypeId | null;
  /** The town the hammers go to, for The Corvée; otherwise `null`. */
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
  /** The town the hammers went to, when it was not the levying town. */
  targetCityId?: number;
  unitId?: number;
}

/** Is the empire at war with another empire? The wild does not count. */
function atWarWithAnEmpire(state: GameState, playerId: number): boolean {
  return state.wars.some((war) => war.a === playerId || war.b === playerId);
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

/** What one use pays from this town, and where — before the citizen leaves. */
interface LevyPlan {
  hammers: number | null;
  unit: UnitTypeId | null;
  tile: Tile | null;
  target: City | null;
}

function planLevy(state: GameState, city: City, use: LevyUse): LevyPlan {
  switch (use) {
    case 'production':
      return { hammers: levyHammers(city), unit: null, tile: null, target: city };
    case 'opus':
      return {
        hammers: levyHammers(city),
        unit: null,
        tile: null,
        target: opusWorkshop(state, city.ownerId, city),
      };
    case 'muster':
    case 'conscript': {
      const unit = bestMeleeFor(state, city.ownerId);
      const tile = unit === null ? null : spawnTileFor(state, city, unit);
      return { hammers: null, unit, tile, target: null };
    }
    default: {
      const unhandled: never = use;
      void unhandled;
      return { hammers: null, unit: null, tile: null, target: null };
    }
  }
}

/** The menu line's words for a use. */
function labelFor(use: LevyUse, plan: LevyPlan): string {
  if (use === 'production') return 'Production here';
  if (use === 'opus') return 'Send to the Magnum Opus';
  return plan.unit === null ? 'Raise a unit' : `Raise ${unitDef(plan.unit).name}`;
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
  const grant = cardLevyGrants(state, playerId).find((row) => row.use === use);
  if (grant === undefined) return 'None of your cards lets a town levy for that';
  return grantError(state, city, grant);
}

/** The refusals that depend on the town and on the granting card. */
function grantError(state: GameState, city: City, grant: LevyGrant): string | null {
  const least = Math.max(LEVY.minPopulation, Math.floor(grant.minPopulation ?? 0));
  if (city.population < least) {
    return `A town needs at least ${least} citizens to levy for this`;
  }
  if (city.population - totalSpecialists(city) < 1) {
    return `Every citizen of ${city.name} works in a guild`;
  }
  const left = levyTurnsLeft(state, city, waitFor(state, city.ownerId, grant));
  if (left > 0) {
    return `${city.name} can levy again in ${left} ${left === 1 ? 'turn' : 'turns'}`;
  }
  const plan = planLevy(state, city, grant.use);
  if (grant.use === 'opus' && plan.target === null) {
    return 'None of your other towns is building the Magnum Opus';
  }
  if ((grant.use === 'muster' || grant.use === 'conscript') && plan.unit === null) {
    return 'You cannot build a melee unit yet';
  }
  if ((grant.use === 'muster' || grant.use === 'conscript') && plan.tile === null) {
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
  const grants = cardLevyGrants(state, playerId);
  const options: LevyOption[] = [];
  for (const use of LEVY_USES) {
    const grant = grants.find((row) => row.use === use);
    if (grant === undefined) continue;
    const plan = planLevy(state, city, use);
    options.push({
      use,
      card: grant.card,
      cardName: anyCardDef(grant.card).name,
      label: labelFor(use, plan),
      hammers: plan.hammers,
      unit: plan.unit,
      targetCityId: use === 'opus' ? (plan.target?.id ?? null) : null,
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
 *   3. the citizen leaves through `loseCitizen`, the same routine a famine uses;
 *   4. the payment lands: hammers through `settleProductionWindfall` (into this
 *      town, or into the town building the Magnum Opus), a piece through
 *      `realiseItem` — counted as trained for The Muster of the Fields, not for
 *      The General Levy;
 *   5. any card that reacts to a levy hangs its effects on the town;
 *   6. the town is re-seated (`refreshCityDerived`, register entry 23).
 */
export function levyAt(state: GameState, city: City, use: LevyUse): LevyReport {
  const plan = planLevy(state, city, use);
  city.levy = { ...city.levy, turn: state.turn };
  loseCitizen(state, city);

  const report: LevyReport = { use, cityId: city.id, population: city.population };
  if (plan.hammers !== null && plan.target !== null) {
    plan.target.hammerBasket += plan.hammers;
    settleProductionWindfall(state, plan.target);
    report.hammers = plan.hammers;
    if (plan.target.id !== city.id) report.targetCityId = plan.target.id;
  }
  if (plan.unit !== null && plan.tile !== null) {
    const realised = realiseItem(
      state,
      city,
      { kind: 'unit', id: plan.unit, tile: plan.tile },
      use === 'conscript' ? { untrained: true } : {},
    );
    if (realised.unitId !== undefined) report.unitId = realised.unitId;
  }
  hangAftermaths(state, city);
  refreshCityDerived(state, city);
  return report;
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
    city.levy = { turn: city.levy?.turn ?? state.turn, after: { ...city.levy?.after, [card]: state.turn } };
    hung = true;
  }
  // A timed effect on a town is folded into the empire's meters (a rite's
  // reason, `stampRite`), so the write is announced.
  if (hung) bumpEconomy(state);
}
