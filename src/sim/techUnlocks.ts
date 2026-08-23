/**
 * Everything a technology hands over, in one list.
 *
 * `data/techs.json` declares only half of it. A tech's `unlocks` block names the
 * units and buildings it enables, but two other tables name technologies from
 * *their* side: `data/resources.json` gates a strategic resource's label behind
 * a `requiresTech` (see `isResourceVisible`), and `data/improvements.json` hangs
 * punctuated renewals off an `upgrades[].tech` (see `ImprovementUpgrade`). Both
 * are written forwards because that is how a designer reads them, and the
 * question an information surface asks — "what does Bronze Working actually give
 * me?" — is the other way round.
 *
 * So this module inverts them, the same way `techData.ts` inverts `unlocks` into
 * `UNIT_UNLOCK_TECH`. It lives beside `techData` rather than inside it because
 * `resourceData` and `improvementData` already import `techData` for `TechId`,
 * and a table that imported them back would close a cycle around three modules
 * that all build their indexes at load.
 *
 * It is deliberately structure and not prose. A gift carries its id, its name
 * and the mark its own table already declares for it, and nothing else — the
 * *price* of a unit is `unitProductionCost`'s to answer and the *worth* of a
 * building is `buildingYieldDelta`'s, both of which need a player and neither of
 * which may be re-derived here (hard rule 5). The star chart asks this what a
 * node hands over and asks those two what it is worth, which is one evaluator
 * per question and no second opinion about either.
 */

import { type BuildingId, buildingDef } from './buildingData';
import {
  IMPROVEMENT_IDS,
  type ImprovementId,
  improvementDef,
} from './improvementData';
import { RESOURCE_IDS, type ResourceId, resourceDef } from './resourceData';
import type { TileYield } from './terrainData';
import { type TechId, techDef } from './techData';
import { type UnitTypeId, unitDef } from './unitData';

/**
 * What kind of gift this is, which is also what surface it changes:
 *
 *   · `unit` / `building` — a new row in a city's build list.
 *   · `reveal` — a resource this player may now be *told* about. The ore was
 *     always there and always paid its yield; the technology buys the label
 *     (`isResourceVisible`), so this is a gift to the map and not to the city.
 *   · `renewal` — an improvement already on the ground quietly starts paying
 *     more. Nothing is built and nothing is chosen; it is the one gift that
 *     arrives without the player doing anything else.
 */
export type TechGiftKind = 'unit' | 'building' | 'reveal' | 'renewal';

/** What every gift carries, whichever table it came out of. */
interface TechGiftBase {
  name: string;
  /** The mark the gift's own table declares: a disc letter, or an emoji. */
  glyph: string;
}

/**
 * A union rather than one struct with optional fields, so that a caller which
 * has checked `kind` gets the id typed for the evaluator it is about to reach
 * for — `unitProductionCost` on a unit, `buildingDef` on a building — with no
 * cast in the middle to be wrong about later.
 */
export type TechGift =
  | (TechGiftBase & { kind: 'unit'; id: UnitTypeId })
  | (TechGiftBase & { kind: 'building'; id: BuildingId })
  | (TechGiftBase & { kind: 'reveal'; id: ResourceId })
  | (TechGiftBase & {
      kind: 'renewal';
      id: ImprovementId;
      /** What the renewal adds to every tile it reaches. */
      add: TileYield;
      /** True when it only reaches tiles that can drink. */
      requiresFreshwater?: boolean;
    });

/**
 * Everything `id` hands over, units first, then buildings, then reveals, then
 * renewals — the order a player reads them in, and the order of consequence:
 * two of them are things to build, one is a thing to look for, and the last is
 * a thing that simply happens.
 *
 * Every list is walked as an array in table order, never as a Map, so the same
 * tech always produces the same list (hard rule 2, and this feeds a screen the
 * player compares against itself between turns).
 */
export function techGifts(id: TechId): TechGift[] {
  const gifts: TechGift[] = [];
  const { units = [], buildings = [] } = techDef(id).unlocks;

  for (const unit of units) {
    gifts.push({ kind: 'unit', id: unit, name: unitDef(unit).name, glyph: unitDef(unit).glyph });
  }
  for (const building of buildings) {
    // Buildings declare no glyph of their own — the chart draws them all with
    // the same filled block, which is exactly the reading: a building is a
    // building, and what distinguishes one is its yields, not its badge.
    gifts.push({ kind: 'building', id: building, name: buildingDef(building).name, glyph: '▣' });
  }
  for (const resource of RESOURCE_IDS) {
    if (resourceDef(resource).requiresTech !== id) continue;
    gifts.push({
      kind: 'reveal',
      id: resource,
      name: resourceDef(resource).name,
      glyph: resourceDef(resource).emoji,
    });
  }
  for (const improvement of IMPROVEMENT_IDS) {
    for (const upgrade of improvementDef(improvement).upgrades ?? []) {
      if (upgrade.tech !== id) continue;
      gifts.push({
        kind: 'renewal',
        id: improvement,
        name: improvementDef(improvement).name,
        glyph: improvementDef(improvement).emoji,
        // Copied rather than handed over: the table is shared module state and
        // a caller that summed into it would retune the game, exactly as
        // `improvementYield` guards against.
        add: { ...upgrade.add },
        requiresFreshwater: upgrade.requiresFreshwater,
      });
    }
  }
  return gifts;
}
