/**
 * **The tile context, hoisted once per sweep** — `tileOwnerField`'s bargain
 * (CLAUDE.md) read one system across, and batch 9's answer to the second of the
 * two costs the late-game profile named.
 *
 * `tileContextAt` (`cities.ts`) is the coordinate reading: *what context does
 * this one hex price through* — the owning town's, so a lighthouse's food and a
 * rite's gold on a worked seam land exactly where the citizen is paid. It is the
 * right question from a verb, and it is the wrong one from a **sweep**: every
 * arm of this bot that walks a town's ring asked it once per hex, and the answer
 * is the same object for every hex of the same town. A town of twenty workable
 * hexes therefore paid for twenty readings of its own shelves, its rites, its
 * scoped cards and its consecration — and the improvement plan, which walks
 * every owned hex against every improvement on the roster, paid for one *per
 * candidate*.
 *
 * A field is the sweep's reading: ask it for a hex, get the same answer
 * `tileContextAt` would have given, computed once per **owning town** and then
 * looked up. Nothing here is a policy and nothing here is cached across the
 * question — the lifetime is one sweep, exactly as `tileOwnerField`'s and
 * `zocField`'s is, because a context is a photograph of a town at an instant and
 * a hex bought, chopped or improved since is a hex the photograph is wrong
 * about. Take one at the top of a loop, spend it inside, and let it go.
 *
 * Determinism: the memo is keyed by city id and read by lookup — nothing ever
 * iterates it, so no outcome can depend on the order hexes happened to be asked
 * in (CLAUDE.md's rule 2).
 */

import {
  type TileYieldContext,
  cityContext,
  tileOwnerCityId,
  yieldContextFor,
} from '../sim/cities';
import type { Tile } from '../sim/map';
import { type GameState, cityById } from '../sim/state';

/** What one hex prices through. `tileContextAt`'s answer, by lookup. */
export type TileContextField = (tile: Tile) => TileYieldContext | undefined;

/**
 * The reading for a whole sweep, from one seat's point of view.
 *
 * `viewerId` is the fallback context for unclaimed ground, which is the seat's
 * own — the reveal gate on a wild seam stays the asker's, exactly as
 * `tileContextAt` leaves it.
 */
export function tileContextField(state: GameState, viewerId: number): TileContextField {
  const byCity = new Map<number, TileYieldContext | undefined>();
  let mine: TileYieldContext | undefined;
  let minedYet = false;
  const viewer = (): TileYieldContext | undefined => {
    if (!minedYet) {
      mine = yieldContextFor(state, viewerId);
      minedYet = true;
    }
    return mine;
  };
  return (tile: Tile): TileYieldContext | undefined => {
    const cityId = tileOwnerCityId(state, tile.col, tile.row);
    if (cityId === null) return viewer();
    if (byCity.has(cityId)) return byCity.get(cityId);
    const city = cityById(state, cityId);
    // A stale owner id is unclaimed ground as far as a reading goes, which is
    // the clause `tileContextAt` falls through on and not a case of its own.
    if (!city) return viewer();
    const ctx = cityContext(state, city);
    byCity.set(cityId, ctx);
    return ctx;
  };
}
