import type { AiConfig } from './aiConfig';
import { appraise, type Appraisal } from './decision';
import { yieldWeight } from './prices';
import { availableCopies, buildingProductionCost, unitProductionCost } from '../sim/cities';
import { loanedCopies, type DealTerms } from '../sim/deals';
import { happinessOf } from '../sim/meters';
import { cityResourceYields, empireResourceYields, foldResourceYields } from '../sim/resourceEffects';
import { type ResourceId, resourceDef, resourceIsVisibleTo } from '../sim/resourceData';
import { RULES } from '../sim/rulesData';
import { type City, type GameState, citiesOf, playerById } from '../sim/state';
import { buildError } from '../sim/tech';
import { highestAge } from '../sim/techData';
import { UNIT_TYPE_IDS, requiredResourcesOf, unitDef } from '../sim/unitData';

/** Deferred income is discounted independently of any resource's price. */
export function dealIncomeValue(ai: AiConfig): number {
  return RULES.war.dealTurns * ai.war.dealIncomeShare;
}

/** A city is a permanent asset, so its price includes its existing investment. */
export function tradeCityValue(city: City, state: GameState, ai: AiConfig): number {
  const owner = playerById(state, city.ownerId)!;
  const age = highestAge(owner.techsResearched);
  const buildings = city.buildings.reduce((sum, id) => sum + buildingProductionCost(id), 0);
  return (ai.war.cityBaseGold + city.population * ai.war.cityCitizenGold) *
    (1 + (age - 1) * ai.war.cityAgePremium) +
    buildings * RULES.production.goldPerHammer * ai.war.cityBuildingShare;
}

/**
 * Build these prices once per trade decision. Resource effects are evaluated
 * by the simulation on a separate state with one hypothetical loan. Nothing
 * writes to the live state, its random generator or its cached readings.
 *
 * This is a bounded estimate: it counts flat resource yields, happiness and
 * usable strategic copies. It does not forecast future buildings or armies.
 */
export function tradeResourcePrices(state: GameState, playerId: number, ai: AiConfig) {
  const player = playerById(state, playerId)!;
  const age = highestAge(player.techsResearched);
  const weight = (voice: 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith') =>
    yieldWeight(ai, voice, age);
  const goldWeight = Math.max(Number.EPSILON, weight('gold'));
  const cities = citiesOf(state, playerId);
  const memo = new Map<string, Appraisal>();
  // These states already belong to this decision's transfer list. Keep the
  // cache local too; it is not persistent bot memory. Discard the quote
  // function when the board changes.
  const economies = new Map<GameState, { happiness: number; yields: number }>();
  const transferWorlds = new Map<string, GameState>();
  function economy(world: GameState) {
    const cached = economies.get(world);
    if (cached !== undefined) return cached;
    const yields = foldResourceYields([
      ...empireResourceYields(world, playerId),
      ...cities.flatMap((city) => cityResourceYields(world, city)),
    ]);
    let worth = 0;
    for (const voice of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      worth += yields[voice] * weight(voice) / goldWeight;
    }
    const result = { happiness: happinessOf(world, playerId), yields: worth };
    economies.set(world, result);
    return result;
  }
  const loan = (before: GameState, give: DealTerms, take: DealTerms): GameState => ({
    ...before, deals: [...before.deals, {
      id: -(before.deals.length + 1), a: playerId, b: -1,
      terms: { a: give, b: take }, untilTurn: before.turn + RULES.war.dealTurns,
    }],
  });
  return (id: ResourceId, copies: number, outgoing: boolean,
    given: DealTerms = {}, received: DealTerms = {}): Appraisal => {
    const giving = loanedCopies(given);
    const taking = loanedCopies(received);
    const transferKey = JSON.stringify([giving, taking]);
    const key = `${id}:${copies}:${outgoing}:${transferKey}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    if (!resourceIsVisibleTo(id, player.techsResearched)) return appraise([]);
    const def = resourceDef(id);
    const terms: DealTerms = def.kind === 'strategic'
      ? { strategics: [{ id, copies }] } : { luxuries: [id] };
    // Only resource and happiness readers see this loan. The other party has
    // no role in those calculations; no new-partner reward is priced here.
    let before = state;
    if (giving.length + taking.length > 0) {
      const found = transferWorlds.get(transferKey);
      before = found ?? loan(state,
        { luxuries: given.luxuries, strategics: given.strategics },
        { luxuries: received.luxuries, strategics: received.strategics });
      if (found === undefined) transferWorlds.set(transferKey, before);
    }
    const world = loan(before, outgoing ? terms : {}, outgoing ? {} : terms);
    const base = economy(before);
    const next = economy(world);
    const direction = outgoing ? -1 : 1;
    const happiness = Math.max(0, direction * (next.happiness - base.happiness));
    const comfort = Math.max(1, ai.war.luxuryComfort);
    const urgency = base.happiness < 0 ? 1 - base.happiness / comfort : 1 / (1 + base.happiness / comfort);
    const parts = [{
      label: `${def.name}: value of spare copies`,
      value: copies * (def.kind === 'strategic' ? ai.war.strategicReserveGold :
        ai.war.luxuryGoldBaseline * ai.war.luxuryDuplicateShare),
    }, {
      label: `${def.name}: happiness at the current empire balance`,
      value: happiness * ai.war.happinessGoldValue * urgency,
    }, {
      label: `${def.name}: change in flat resource yields over the deal`,
      value: Math.max(0, direction * (next.yields - base.yields)) * dealIncomeValue(ai),
    }];
    if (def.kind === 'strategic') {
      const supplied = outgoing ? before : world;
      let best = 0;
      const reserve = Math.max(1, ai.war.strategicReserveCopies);
      for (const type of UNIT_TYPE_IDS) {
        const accepted = requiredResourcesOf(unitDef(type));
        if (!accepted.includes(id)) continue;
        if (!cities.some((city) => buildError(supplied, playerId, 'unit', type, city) === null)) continue;
        // Interchangeable resources supply the same recruits. Spare horses
        // reduce the need for camels, just as spare camels do.
        const spare = accepted.reduce((sum, resource) => sum + Math.max(0,
          availableCopies(before, playerId, resource) - (outgoing && resource === id ? copies : 0)), 0);
        let useful = 0;
        for (let copy = 0; copy < copies; copy++) useful += reserve / (reserve + spare + copy);
        best = Math.max(best, useful * unitProductionCost(state, playerId, type));
      }
      parts.push({ label: `${def.name}: available recruits, reduced by spare supply`,
        value: best * RULES.production.goldPerHammer * ai.war.strategicUnitShare });
    }
    const result = appraise(parts);
    memo.set(key, result);
    return result;
  };
}
