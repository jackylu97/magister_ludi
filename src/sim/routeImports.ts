/**
 * **What a road would bring home** — the loan half of The Silk Road, asked of a
 * pair that is *not* running yet.
 *
 * `resourceEffects.ts`'s `importedLuxuries` answers the rule's own question:
 * which kinds this empire is holding on loan right now. That is the only
 * question the simulation ever had to ask, because a loan is worth something
 * only once a caravan is on the road. The **sheet** asks two more, and neither
 * can be got out of that list:
 *
 *   · *which* road is lending each kind — the running ledger prints the mark on
 *     the route's own row, and a list of kinds in table order does not say which
 *     caravan fetched which;
 *   · what a pair **would** lend if it were sent — the whole of the card line
 *     ("Brings Silk — half a copy") and of the Recommended group that ranks by
 *     it, both of which have to answer before there is a route to read.
 *
 * A leaf, and the answers in one walk
 * -----------------------------------
 * The assignment is a *sweep*: the routes are walked in `state.units` order and
 * each takes the first kind the ones before it left, which is the contention
 * rule the whole game uses and the only one a replay reproduces. So both
 * questions are one walk (`runningRouteImports`) remembered on the **revision**
 * clock, for `importedLuxuries`' own reason — a route is a fact about a piece,
 * and the economy half is the ground and nothing but (see "The two clocks" in
 * `slate.ts`).
 *
 * The walk is written here rather than beside the rule because this file is a
 * leaf — the state, the towns, the pair resolution, the tree and the card
 * evaluator, and nothing that imports it back — and because what the sheet
 * needs is a *finer* reading than the rule's rather than a second one.
 * `test/ui/tradeImports.test.ts` pins the two together: with the rule held, the
 * kinds this walk assigns are `importedLuxuries`' list exactly. If the rule ever
 * changes shape that pin is what fails, and the two are folded rather than left
 * to drift.
 *
 * **The rule gates the pay, not the forecast.** The walk takes live
 * international routes whether or not the seat holds the rule, so a sheet drawn
 * before The Silk Road is known still says which kind each road *would* fetch
 * and does not promise two roads the same one. What the rule gates is whether
 * anything is actually held — `routesLendLuxuries` — and that is asked at the
 * surface, where the difference between "brings" and "would bring" is the
 * sentence being written.
 */

import { type ResourceId } from './resourceData';
import { cityResources, controlledResources } from './cities';
import { routeCities, routeIsInternational, routeIsLive } from './routes';
import { slateMemo } from './slate';
import { cardBehaviorRule } from './statecraft';
import { type City, type GameState } from './state';
import { type TechId, TECH_IDS, techDef } from './techData';

/** One live road and the kind it is fetching. `unitId` is the caravan's. */
export interface RouteImport {
  unitId: number;
  id: ResourceId;
}

/**
 * Does this seat's law let a foreign road lend it a luxury at all?
 *
 * The rule (`BehaviorRuleId`'s `routesImportLuxuries`) asked in one place, so no
 * surface names it. It is a *behaviour* rather than a technology — the node
 * carries the clause today and a card could carry it tomorrow — which is why the
 * predicate is the rule and only `importRuleTech` knows about a node at all.
 */
export function routesLendLuxuries(state: GameState, playerId: number): boolean {
  return cardBehaviorRule(state, playerId, 'routesImportLuxuries');
}

let ruleTech: TechId | null | undefined;

/**
 * **The node that teaches the rule**, for the one line that has to name it: the
 * card's wanting voice, "would bring Silk — needs The Silk Road".
 *
 * Found by asking which technology carries the clause rather than by writing an
 * id down, so the sentence follows the tree. The name is never composed here — a
 * surface takes `techDef(id).name` and marks it as a keyword ref, which is what
 * hard rule 7 says about a named thing.
 *
 * Read once and remembered: the tree is data loaded at start and cannot move
 * under a running game.
 */
export function importRuleTech(): TechId | null {
  if (ruleTech === undefined) {
    ruleTech =
      TECH_IDS.find((id) =>
        (techDef(id).effects ?? []).some(
          (effect) => effect.kind === 'rule' && effect.rule === 'routesImportLuxuries',
        ),
      ) ?? null;
  }
  return ruleTech;
}

/**
 * The sweep: every live international road of this seat, in `state.units` order,
 * with the kind it claims.
 *
 * An array of pairs rather than a map because the slate's shadow check prints
 * what it remembered (`JSON.stringify`) and a `Map` prints as nothing at all — a
 * remembered reading that cannot be disbelieved is one that goes stale in
 * silence.
 */
export function runningRouteImports(state: GameState, playerId: number): readonly RouteImport[] {
  return slateMemo(state, 'revision', 'routeImports', String(playerId), () => {
    const held = new Set<ResourceId>(controlledResources(state, playerId, 'luxury'));
    const claimed = new Set<ResourceId>();
    const list: RouteImport[] = [];
    for (const unit of state.units) {
      if (unit.ownerId !== playerId || unit.trade === undefined) continue;
      if (!routeIsLive(state, unit)) continue;
      const pair = routeCities(state, unit);
      if (!pair || !routeIsInternational(pair.from, pair.to)) continue;
      for (const id of cityResources(state, pair.to, 'luxury')) {
        if (held.has(id) || claimed.has(id)) continue;
        claimed.add(id);
        list.push({ unitId: unit.id, id });
        // **One luxury per route** — a caravan carries a cargo, not a manifest.
        break;
      }
    }
    return list;
  });
}

/**
 * **What a road from here to there would fetch** — the kind, or nothing.
 *
 * The rule's own clauses in the rule's own order: the pair must cross a border,
 * the kind must be one the destination has *opened* (`cityResources`, the one
 * reading of what a town holds), and it must be neither a kind this empire digs
 * for itself nor one another of its roads is already carrying. The first such
 * kind in the destination's table order is the one, because that is the kind the
 * sweep would hand this road if it were on the board.
 *
 * Independent of whether the rule is held: this answers what *would* happen, and
 * the surface decides whether that is a promise or a want.
 */
export function wouldImportFor(
  state: GameState,
  playerId: number,
  from: City,
  to: City,
): ResourceId | null {
  if (!routeIsInternational(from, to)) return null;
  const spoken = new Set<ResourceId>(controlledResources(state, playerId, 'luxury'));
  for (const claim of runningRouteImports(state, playerId)) spoken.add(claim.id);
  for (const id of cityResources(state, to, 'luxury')) {
    if (!spoken.has(id)) return id;
  }
  return null;
}
