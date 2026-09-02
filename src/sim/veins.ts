/**
 * What the hills are hiding: the map's invisible layer.
 *
 * The ratified spec is `docs/themes/11-the-cartographers.md` (Æra III,
 * Prospecting) and the shape it asks for is the one the ruins already have —
 * **placed at generation, revealed later** — because that is the only shape the
 * "a save is `{config, log}`" promise allows. A vein spawned when somebody
 * researched a technology would be a tile the seed did not produce; a vein
 * seeded under a hill on turn zero and turned over by a logged command is the
 * same map every replay.
 *
 * Two halves, and this is only the first
 * --------------------------------------
 * The *scatter* is generation and lives here, in a leaf that knows about a map
 * and a dice stream and nothing else — `discoveryPlacement.ts`'s split against
 * `discoveries.ts`, for its reason. The *survey* is play: `prospectError` and
 * `prospectAt` are worker verbs and live with the other two in
 * `improvements.ts`, where the city rules, the treasury and the windfall
 * pipeline already are.
 *
 * Last of all the passes, and that ordering is load-bearing
 * ---------------------------------------------------------
 * Pass 8, after the ruins, which were themselves after the resources, which were
 * after the rivers, which were after the noise. Every draw made here is a draw
 * nothing before it can see, so terrain, hills, features, rivers, resources and
 * every ruin on a given seed are **bit-identical to what they were before veins
 * existed**. A pass that rolled earlier would have moved every wheat field in
 * the game — the discipline every pass before it keeps, one more time.
 *
 * A vein is a resource the generator could have placed
 * -----------------------------------------------------
 * `placeVeins` asks each candidate row the *same* questions `placeResources`
 * asks — the terrain, the feature, the hills flag — before it may seed one, so a
 * struck hill is a hill mapgen could have produced in the first place. That is
 * not tidiness: `chopErrorAt` already refuses to strip a revealed seam of the
 * ground it was placed on, because a tile mapgen could not have made is a tile
 * every later rule has to grow a special case for. The strike must not open one.
 *
 * Nothing but the survey may read `Tile.vein`
 * --------------------------------------------
 * There is no lens for it, no yield line, no AI heuristic and no hover word. The
 * whole design of the layer is that **certainty costs a worker's turn**, and one
 * consumer that quietly knew would give that away for free. `veinCells` below is
 * for the map inspection page and for tests — surfaces that are *about* the
 * generator rather than about a game — and `test/mapgen/veins.test.ts` reads the
 * sources to keep the list of readers at that.
 */

import { type GameMap, type Tile } from './map';
import type { VeinConfig } from './mapgenData';
import { type ResourceId, resourceDef } from './resourceData';
import { type Rng, nextFloat } from './rng';
import { isWaterTerrain } from './terrainData';

/**
 * May this row legally sit on this tile? The generator's own three questions,
 * asked of a *buried* row.
 *
 * Deliberately a copy of the shape `tileSuitsResource` (`resources.ts`) checks
 * rather than a call to it: that function is the surface scatter's, it also
 * asks about spacing and candidacy, and importing it here would tie a leaf to
 * the largest module in the generator. The three clauses below are the whole of
 * what "a resource may stand here" means on the data, and a row that grew a
 * fourth constraint would fail this file's own test.
 */
export function veinFitsTile(tile: Tile, resource: ResourceId): boolean {
  const def = resourceDef(resource);
  if (!def.validTerrain.includes(tile.terrain)) return false;
  if (def.validFeatures !== undefined && !def.validFeatures.includes(tile.feature)) return false;
  if (def.hills !== undefined && def.hills !== tile.hills) return false;
  return true;
}

/**
 * Could a survey here ever find anything? The eligibility rule, and it is the
 * denominator `VeinConfig.share` is a share *of*.
 *
 * A hill, on land, **carrying no surface resource** — the last clause is what
 * makes the strike a move rather than an overwrite (see `Tile.vein`), and it is
 * why `prospectAt` never has to decide what happens to the iron that was already
 * there.
 */
export function veinGroundAt(tile: Tile): boolean {
  if (!tile.hills) return false;
  if (isWaterTerrain(tile.terrain)) return false;
  if (tile.resource !== undefined) return false;
  return true;
}

/**
 * Seeds the veins, in place. Deterministic in `(map, rng, config)`.
 *
 * One pass in tile order — the order every sweep over the board takes, and the
 * order this one must take, because the roll for a hex has to be a function of
 * where the hex is in the array and not of what came before it on some
 * shuffled list. For each eligible hill: one roll against `share`, and on a hit
 * one weighted draw over the rows that could legally stand there.
 *
 * **Two draws per hit, never one**, and the split matters: the share roll is
 * spent on *every* eligible hill whether or not any row fits it, so a map whose
 * hills happen to be snow-capped rolls the same stream as one whose hills are
 * grass. A conditional roll is the one reliable way to make a replay fall out of
 * step with the game it is replaying.
 *
 * There is deliberately **no spacing rule**. Two ruins four hexes apart read as
 * one site on the board, which is what `minDistanceApart` is for; two veins four
 * hexes apart are two hills nobody can tell apart until somebody digs, and a
 * spacing pass over an invisible layer would be a rule with nothing to show for
 * itself.
 */
export function placeVeins(map: GameMap, rng: Rng, config: VeinConfig): void {
  const share = Math.min(1, Math.max(0, config.share));
  const kinds = config.kinds.filter((kind) => kind.weight > 0);
  if (kinds.length === 0) return;

  for (const tile of map.tiles) {
    if (!veinGroundAt(tile)) continue;
    // The roll happens for every eligible hill, in tile order, whether or not
    // anything can be seeded on it — see the docblock.
    const hit = nextFloat(rng) < share;
    const fits = kinds.filter((kind) => veinFitsTile(tile, kind.resource));
    let total = 0;
    for (const kind of fits) total += kind.weight;
    // The second draw is taken too, and for the first one's reason: a hill with
    // no legal row must spend exactly what a hill with one spends, or the seed
    // is a function of the terrain in a way nothing downstream can reproduce.
    const roll = nextFloat(rng) * total;
    if (!hit || total <= 0) continue;
    let running = 0;
    let chosen = fits[fits.length - 1]!;
    for (const kind of fits) {
      running += kind.weight;
      if (roll < running) {
        chosen = kind;
        break;
      }
    }
    tile.vein = chosen.resource;
  }
}

/**
 * Every tile carrying a vein, in map order.
 *
 * A pure read for the map **inspection page** and for tests — surfaces that are
 * about the generator rather than about a game — and emphatically not for the
 * renderer or for a bot. See the module docblock: `Tile.vein` has exactly one
 * consumer in play, and it is the survey.
 *
 * In map order rather than in placement order, for `discoveryCells`' reason:
 * "what is on the board" is a question about the board, and an order that
 * depended on history would make two identical maps hash differently.
 */
export function veinCells(map: GameMap): { col: number; row: number; resource: ResourceId }[] {
  const out: { col: number; row: number; resource: ResourceId }[] = [];
  for (const tile of map.tiles) {
    if (tile.vein === undefined) continue;
    out.push({ col: tile.col, row: tile.row, resource: tile.vein });
  }
  return out;
}

/**
 * Every hill a survey could ever be spent on, in map order. The denominator the
 * hit rate is measured against — for the inspection page and for the pacing
 * tests that check `share` still means what it says.
 */
export function veinGroundCells(map: GameMap): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  for (const tile of map.tiles) {
    if (!veinGroundAt(tile)) continue;
    out.push({ col: tile.col, row: tile.row });
  }
  return out;
}
