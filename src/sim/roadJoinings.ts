/**
 * **Towns joined to their capital by road for the first time** (Expansionist
 * batch E2): The Opening of the Roads.
 *
 * One end-of-turn phase, `roadJoinings` (`turn.ts`), asks each real empire
 * still in the game, in seat order, which of its towns the road reaches from
 * its capital. The answer is `connectedCities` (`roads.ts`), the same fill the
 * gold ledger's connection line and the `connected` town scope read. A town
 * whose list of joinings (`City.joinedBy`) does not hold its owner yet gains
 * the owner's id, and the `joinedToCapital` windfall occasion pays the owner's
 * cards with the town's population.
 *
 * Why a phase, and not a hook where a road is laid: a town becomes joined in
 * several ways. A caravan wears a road, a town is founded with a road home, a
 * border that cut the road moves away, or a town is taken. The fill is the one
 * answer to all of them. Asked once a turn, it pays a town on the first turn
 * the fill reaches it while its owner holds it (the triage's reading 18). A
 * town founded with a road home (The Road Home) is paid at the end of the turn
 * it was founded.
 *
 * The id is written whether or not the owner holds a card that pays. So a card
 * seated later pays only for towns joined after it, and nothing is paid for
 * the past. A town that loses its road and is joined again pays nothing more,
 * and a town that changes hands can pay its new owner once.
 */

import { settleGrowthWindfall, settleProductionWindfall } from './cities';
import { connectedCities } from './roads';
import { type GameState, realPlayers } from './state';
// Straight from the two statecraft modules rather than through the index, as
// `cities.ts` takes `windfallPayoutIsEmpty`: the index re-exports across a
// cycle, and the build splits such re-exports into chunks it warns about.
import { settleCultureWindfall } from './statecraft/draft';
import { payWindfallGrants, windfallPayout, windfallPayoutIsEmpty } from './statecraft/evaluator';
import { settleResearchWindfall } from './tech';

/**
 * The `roadJoinings` phase. See the module's docblock.
 *
 * Food and production a rider pays land in the joined town, and each town
 * touched is settled at once, as `endUnrest` (`unrest.ts`) settles its towns.
 * Culture and science settle at once, as every windfall's do. The fill is
 * asked once for each empire, before any payment, and nothing a payment does
 * can move a road or a border.
 */
export function runRoadJoinings(state: GameState): void {
  for (const player of realPlayers(state)) {
    if (player.eliminated) continue;
    for (const { city } of connectedCities(state, player.id)) {
      if (city.joinedBy?.includes(player.id) === true) continue;
      if (city.joinedBy === undefined) city.joinedBy = [];
      city.joinedBy.push(player.id);
      const payout = windfallPayout(state, player.id, 'joinedToCapital', 0, 0, {
        population: city.population,
      });
      if (windfallPayoutIsEmpty(payout)) continue;
      for (const town of payWindfallGrants(state, player, payout, { col: city.col, row: city.row })) {
        if (!settleGrowthWindfall(state, town)) settleProductionWindfall(state, town);
      }
      settleCultureWindfall(state, player);
      settleResearchWindfall(state, player);
    }
  }
}
