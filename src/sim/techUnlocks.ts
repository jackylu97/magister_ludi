/**
 * Everything a technology hands over, in one list.
 *
 * `data/techs.json` declares only half of it. A tech's `unlocks` block names the
 * units and buildings it enables, but three other tables name technologies from
 * *their* side: `data/resources.json` gates a strategic resource's label behind
 * a `requiresTech` (see `isResourceVisible`), `data/improvements.json` gates a
 * worker's build behind one and hangs punctuated renewals off an
 * `upgrades[].tech` (see `ImprovementUpgrade`), and `data/buildings.json` hangs
 * the same kind of renewal off its own (see `BuildingUpgrade`). All of them are
 * written forwards because that is how a designer reads them, and the question
 * an information surface asks — "what does Mining actually give me?" — is the
 * other way round.
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

import {
  BUILDING_IDS,
  type BuildingId,
  type BuildingYield,
  buildingDef,
} from './buildingData';
import {
  CHOPPABLE_FEATURES,
  IMPROVEMENT_IDS,
  type ImprovementId,
  chopDef,
  chopYield,
  improvementDef,
} from './improvementData';
import { isBeadGrantId } from './beadData';
import { type ProjectId, projectDef } from './projectData';
import { RESOURCE_IDS, type ResourceId, resourceDef } from './resourceData';
import type { CardEffect, TileCondition } from './statecraftData';
import { type FeatureId, type TileYield, featureDef, readTileYield } from './terrainData';
import {
  type AbilityId,
  TECH_IDS,
  type TechId,
  abilityDef,
  isTechId,
  techDef,
} from './techData';
import { type UnitTypeId, unitDef } from './unitData';

/**
 * What kind of gift this is, which is also what surface it changes:
 *
 *   · `unit` / `building` / `project` — a new row in a city's build list. The
 *     third is the repeatable kind (Entry XXVI): a row that never leaves the
 *     queue, which is why it is its own gift rather than a building with an
 *     odd cost.
 *   · `improvement` — a new row on a *worker's* sheet. The same kind of gift as
 *     a building one grade smaller: something a player may now choose to make.
 *   · `ability` — a *verb* an empire gains rather than a thing it may make. Two
 *     tables feed it and neither is named here: the feature clearings in the
 *     `chop` table (Mining hands over the axe), and the `abilities` block in
 *     `techs.json` itself (Sailing hands over embarkation). Both are walked, so
 *     the day the jungle gets a chop row or a node hands over a second verb it
 *     appears on whatever tech it names, with nobody remembering to come back
 *     here. A clearing carries what it `pays`; a named verb does not, which is
 *     the whole of the difference between them.
 *   · `reveal` — a resource this player may now be *told* about. The ore was
 *     always there and always paid its yield; the technology buys the label
 *     (`isResourceVisible`), so this is a gift to the map and not to the city.
 *   · `renewal` — an improvement already on the ground quietly starts paying
 *     more. Nothing is built and nothing is chosen; it is the one gift that
 *     arrives without the player doing anything else.
 *   · `buildingRenewal` — the same thing said of a building, and kept a separate
 *     kind rather than folded in with a `target` field so that a caller which
 *     has checked `kind` still gets the id typed for the table it is about to
 *     reach for.
 *   · `buildingTileYield` — a building a player may already have quietly starts
 *     paying on *ground of a certain kind*: the granary's food on water, which
 *     waits for Sailing. `buildingRenewal`'s sibling and a separate kind for its
 *     reason — the two carry different payloads, because one lands in a city's
 *     totals and the other on a hex.
 */
export type TechGiftKind =
  | 'unit'
  | 'building'
  | 'project'
  | 'improvement'
  | 'ability'
  | 'reveal'
  | 'renewal'
  | 'buildingRenewal'
  /**
   * A **rule** the empire holds for as long as it holds the technology —
   * `TechDef.effects`, `liveEffects`' tenth source (the tree pass of
   * 2026-08-30).
   *
   * The eighth kind, and the first whose gift is not a row in any table: The
   * Imperial Post hands over nothing a city may build and nothing a worker may
   * lay, and what it hands over is nonetheless the whole reason to research it.
   * A node whose only gift were of this kind used to read as connective tissue
   * to `unlockDataProblems`; it now reads as the package it is.
   */
  | 'techEffect';

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
  | (TechGiftBase & { kind: 'project'; id: ProjectId })
  | (TechGiftBase & { kind: 'improvement'; id: ImprovementId })
  | (TechGiftBase & {
      kind: 'ability';
      /**
       * The feature this ability clears, or the verb's own id. Two tables, one
       * kind: a clearing is "a thing a worker may now do" and so is embarking,
       * and a card that told them apart would be a card with two layouts for one
       * sentence.
       */
      id: FeatureId | AbilityId;
      /**
       * What one clearing banks, once, in the city that owns the ground —
       * **absent** for a verb that is not a clearing. Presence is the state, the
       * way it is everywhere else in this codebase.
       */
      pays?: TileYield;
    })
  | (TechGiftBase & { kind: 'reveal'; id: ResourceId })
  | (TechGiftBase & {
      kind: 'renewal';
      id: ImprovementId;
      /** What the renewal adds to every tile it reaches. */
      add: TileYield;
      /** True when it only reaches tiles that can drink. */
      requiresFreshwater?: boolean;
    })
  | (TechGiftBase & {
      kind: 'buildingRenewal';
      id: BuildingId;
      /** What the renewal adds to every city holding the building. */
      add: BuildingYield;
    })
  | (TechGiftBase & {
      kind: 'techEffect';
      /** The node's own id — the card these effects belong to. */
      id: TechId;
      /** The clauses, in row order. Worded by `describeCard`'s vocabulary. */
      effects: readonly CardEffect[];
    })
  | (TechGiftBase & {
      kind: 'buildingTileYield';
      id: BuildingId;
      /** What the building starts paying on every hex that satisfies `on`. */
      add: BuildingYield;
      /** Which hexes. See `tileConditionHolds`. */
      on: TileCondition;
    });

/**
 * Everything `id` hands over: units, then buildings, then projects, then the
 * improvements a worker may now lay, then the abilities it gains, then reveals,
 * then the two kinds of renewal — the order a player reads them in, and the
 * order of consequence. Four of them are things to build, one is a thing a
 * worker may now do, one is a thing to look for, and the last two simply
 * happen.
 *
 * Every list is walked as an array in table order, never as a Map, so the same
 * tech always produces the same list (hard rule 2, and this feeds a screen the
 * player compares against itself between turns).
 */
export function techGifts(id: TechId): TechGift[] {
  const gifts: TechGift[] = [];
  const { units = [], buildings = [], projects = [] } = techDef(id).unlocks;

  for (const unit of units) {
    gifts.push({ kind: 'unit', id: unit, name: unitDef(unit).name, glyph: unitDef(unit).glyph });
  }
  for (const building of buildings) {
    // Buildings declare no glyph of their own — the chart draws them all with
    // the same filled block, which is exactly the reading: a building is a
    // building, and what distinguishes one is its yields, not its badge.
    gifts.push({ kind: 'building', id: building, name: buildingDef(building).name, glyph: '▣' });
  }
  for (const project of projects) {
    // The recycle mark rather than the building block: what distinguishes a
    // project from everything else on this card is that it comes back, and the
    // badge is the one place the card can say so without a sentence.
    gifts.push({ kind: 'project', id: project, name: projectDef(project).name, glyph: '↻' });
  }
  for (const improvement of IMPROVEMENT_IDS) {
    if (improvementDef(improvement).requiresTech !== id) continue;
    gifts.push({
      kind: 'improvement',
      id: improvement,
      name: improvementDef(improvement).name,
      glyph: improvementDef(improvement).emoji,
    });
  }
  for (const feature of CHOPPABLE_FEATURES) {
    const chop = chopDef(feature)!;
    if (chop.tech !== id) continue;
    gifts.push({
      kind: 'ability',
      id: feature,
      // The verb, said as a verb: this is a thing a worker may now *do*, not a
      // thing a city may now build, and the name is what the card prints.
      name: `Clear ${featureDef(feature).name}`,
      glyph: featureDef(feature).glyph ?? '⚒',
      // Copied rather than handed over, like a renewal's `add`: the table is
      // shared module state and a caller that summed into it would retune the
      // game.
      pays: chopYield(feature),
    });
  }
  for (const ability of techDef(id).unlocks.abilities ?? []) {
    // The `chop` table's siblings, and they sort together on purpose: a worker
    // that may now clear a wood and an empire that may now put a worker on the
    // water are the same *kind* of news. No `pays` — a verb that banks nothing
    // says nothing about banking.
    gifts.push({
      kind: 'ability',
      id: ability,
      name: abilityDef(ability).name,
      glyph: abilityDef(ability).glyph,
    });
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
        add: readTileYield(upgrade.add),
        requiresFreshwater: upgrade.requiresFreshwater,
      });
    }
  }
  for (const building of BUILDING_IDS) {
    for (const upgrade of buildingDef(building).upgrades ?? []) {
      if (upgrade.tech !== id) continue;
      gifts.push({
        kind: 'buildingRenewal',
        id: building,
        name: buildingDef(building).name,
        glyph: '▣',
        add: { ...upgrade.add },
      });
    }
  }
  // The rules the node hands over, last: they arrive without the player doing
  // anything else, exactly as a renewal does, and they are the one gift with no
  // row of its own anywhere. One entry for the whole node rather than one per
  // clause, because a card is read as a card.
  const effects = techDef(id).effects;
  if (effects !== undefined && effects.length > 0) {
    gifts.push({
      kind: 'techEffect',
      id,
      name: techDef(id).name,
      // The scroll: what this hands over is a *rule*, and the badge is the one
      // place the card can say so without a sentence.
      glyph: '§',
      // Copied rather than handed over, like every renewal's `add`: the table
      // is shared module state.
      effects: [...effects],
    });
  }
  for (const building of BUILDING_IDS) {
    for (const line of buildingDef(building).tileYields ?? []) {
      if (line.requiresTech !== id) continue;
      gifts.push({
        kind: 'buildingTileYield',
        id: building,
        name: buildingDef(building).name,
        glyph: '▣',
        // Copied rather than handed over, like every other renewal's `add`.
        add: { ...line.add },
        on: line.on,
      });
    }
  }
  return gifts;
}

/**
 * Every way the four tables can disagree about a technology, as human-readable
 * lines. Empty means consistent.
 *
 * The other half of `techDataProblems`, and here rather than there because these
 * are the checks that need to see *all* the tables at once. Two things are
 * asked:
 *
 *   · **Entry V, honestly.** Every node is a package with no connective-tissue
 *     filler. That used to be "`unlocks` is non-empty", which stopped being true
 *     the day Mining's whole gift became an improvement; the question is now
 *     asked of the whole gift list, which is the list a player actually reads
 *     off the node card.
 *   · **Building renewals name real technologies.** `improvementData` and
 *     `resourceData` throw at load for their own dangling ids, and
 *     `buildingData` deliberately cannot: it may only import `TechId` as a type
 *     (see the note on that import), so the check lands here.
 *   · **Every bead a row names is a real grant row.** The two tables that name
 *     one — a node's `paysBead` and a building's `{ grant: 'bead' }` — both hold
 *     `BeadGrantId` as a *type only*, for that same import reason one table
 *     over, so neither can check it. This module already imports both and is
 *     imported by neither, which is exactly what makes it the place a dangling
 *     id is caught (Entry LVIII, the endgame).
 */
export function unlockDataProblems(): string[] {
  const problems: string[] = [];

  for (const id of TECH_IDS) {
    if (techGifts(id).length === 0) {
      problems.push(`tech "${id}" hands over nothing (every node is a package — see Entry V)`);
    }
  }
  for (const building of BUILDING_IDS) {
    for (const upgrade of buildingDef(building).upgrades ?? []) {
      if (isTechId(upgrade.tech)) continue;
      problems.push(
        `building "${building}" is renewed by "${String(upgrade.tech)}", which is not a tech`,
      );
    }
    for (const grant of buildingDef(building).onComplete ?? []) {
      if (grant.grant !== 'bead' || isBeadGrantId(grant.bead)) continue;
      problems.push(
        `building "${building}" pays bead "${String(grant.bead)}", which is not a grant row`,
      );
    }
    const world = buildingDef(building).worldUnlockTech;
    if (world !== undefined && !isTechId(world)) {
      problems.push(
        `building "${building}" is opened by the world reaching "${String(world)}", which is not a tech`,
      );
    }
  }
  for (const id of TECH_IDS) {
    const bead = techDef(id).paysBead;
    if (bead !== undefined && !isBeadGrantId(bead)) {
      problems.push(`tech "${id}" pays bead "${String(bead)}", which is not a grant row`);
    }
  }
  return problems;
}
