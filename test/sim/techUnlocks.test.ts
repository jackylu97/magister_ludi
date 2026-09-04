/**
 * What a technology hands over, gathered from the tables that say so.
 *
 * `techGifts` exists because only half of a tech's gifts are written in
 * `data/techs.json`: a resource's `requiresTech`, an improvement's own
 * `requiresTech` and `upgrades[].tech`, a chop entry's `tech`, and a building's
 * `upgrades[].tech` all name the technology from their own side, and a screen
 * that read only the `unlocks` block would quietly promise a player less than
 * the technology actually gives them — or, since the Age I rework, nothing at all, which is
 * what Mining's `unlocks` block says. So what is covered here is exactly that —
 * the inversion, its order, and the fact that every table's entry is accounted
 * for exactly once across the whole tree.
 *
 * The star chart's card itself is DOM and is not covered, as with every other UI
 * pass: this suite has no jsdom.
 */

import { describe, expect, it } from 'vitest';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import {
  CHOPPABLE_FEATURES,
  IMPROVEMENT_IDS,
  chopDef,
  chopYield,
  improvementDef,
} from '../../src/sim/improvementData';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import {
  ABILITY_BEARERS,
  ABILITY_IDS,
  TECH_IDS,
  abilityDef,
  isAbilityId,
  techDef,
} from '../../src/sim/techData';
import { featureDef, readTileYield } from '../../src/sim/terrainData';
import { techGifts, unlockDataProblems } from '../../src/sim/techUnlocks';
import { unitDef } from '../../src/sim/unitData';

describe('techGifts', () => {
  it('lists the units and buildings the tech declares, in the tech\'s own order', () => {
    // Agriculture is the one node that hands over four units at once — and
    // since the Age I rework it gates the farm as well, which is the whole
    // opening kit in one node and the reason it is the tree's only root.
    expect(techGifts('agriculture').map((gift) => gift.id)).toEqual([
      'settler',
      'warrior',
      'scout',
      'worker',
      'farm',
    ]);
    expect(techGifts('agriculture').map((gift) => gift.kind)).toEqual([
      'unit',
      'unit',
      'unit',
      'unit',
      'improvement',
    ]);
    // Earthenware is the jar and nothing else after the playtest notes of
    // 2026-09-03: the plantation moved to the Calendar, where the year being cut
    // into pieces is what a crop that ripens on a date wants, and the granary is
    // all the jar hands over.
    expect(techGifts('earthenware').map((gift) => [gift.kind, gift.id])).toEqual([
      ['building', 'granary'],
    ]);
    expect(techGifts('calendar').map((gift) => [gift.kind, gift.id])).toEqual([
      ['building', 'hangingGardens'],
      ['project', 'tithes'],
      ['improvement', 'plantation'],
    ]);
  });

  it('puts units before buildings when a tech hands over both', () => {
    // Mathematics and Bronzeworking are the nodes that do; the order is the
    // reading order the node card already uses. Mathematics hands over the
    // catapult and the composite bowman the pruned Construction used to carry,
    // and then Petra — a wonder is an ordinary building on the list. The
    // library's renewal used to sort after all three; it was struck by the
    // renewals axe (2026-09-04), so the node is three gifts rather than four.
    expect(techGifts('mathematics').map((gift) => gift.kind)).toEqual([
      'unit',
      'unit',
      'building',
    ]);
    // Engineering took Construction's works: four buildings, the Circus Maximus
    // among them, because a wonder is an ordinary building on this list. The
    // lumbermill left for Siegecraft on 2026-09-03 (user: "lumbermills need to
    // be way earlier in the tech tree, early age 2 probably"), so Engineering
    // hands over buildings and nothing else.
    expect(techGifts('engineering').map((gift) => gift.kind)).toEqual([
      'building',
      'building',
      'building',
      'building',
    ]);
    // And Siegecraft is where it went: the bowman, the walls, then the
    // improvement, and the siege ability last with the other verbs — the same
    // reading order, one age earlier.
    expect(techGifts('siegecraft').map((gift) => [gift.kind, gift.id])).toEqual([
      ['unit', 'bowman'],
      ['building', 'stoneWalls'],
      ['improvement', 'lumbermill'],
      ['ability', 'siege'],
    ]);
    // Bronzeworking hands over three buildings — the barracks and the funeral
    // games from the Age I sinks, and the Walls of Uruk from the wonders — and
    // all of them come after the spearman. Two *abilities* follow: the jungle
    // chop, which the chop table surfaces on whatever tech it names (2026-08-27,
    // user: "that should probably be in bronzeworking"), and the religion pass's
    // rite (Blessing of Arms). Both sort with the verbs at the end.
    // The **reveal** left this list in the re-cut of 2026-09-02: iron is named
    // by Iron Working now, which is what the worksheet means by "gates this
    // line". Bronzeworking keeps the spear, the three buildings and the verbs.
    expect(techGifts('bronzeWorking').map((gift) => gift.kind)).toEqual([
      'unit',
      'building',
      'building',
      'building',
      'ability',
      'ability',
    ]);
    expect(techGifts('bronzeWorking').find((gift) => gift.id === 'jungle')?.name).toBe(
      'Clear Jungle',
    );
  });

  it('carries each gift\'s own name and mark, never a stand-in', () => {
    const [archer] = techGifts('fletching');
    expect(archer).toMatchObject({
      kind: 'unit',
      id: 'archer',
      name: unitDef('archer').name,
      glyph: unitDef('archer').glyph,
    });
    const [library] = techGifts('letters');
    expect(library).toMatchObject({ kind: 'building', id: 'library', name: buildingDef('library').name });
  });

  it('finds the resource a tech reveals, which techs.json never mentions', () => {
    // Iron is on the map from turn one and pays its production to whoever works
    // the tile; **Iron Working** buys the *label* (see `isResourceVisible`) since
    // the re-cut of 2026-09-02 moved the reveal off Bronzeworking. The gift is
    // real and the `unlocks` block does not know about it.
    expect(techDef('ironWorking').unlocks.buildings).toEqual(['terracottaArmy', 'statueOfZeus']);
    // Iron's reveal moved to Bronze Panoply on 2026-09-04 (the user's ruling:
    // the swordsman needs a real window before its legionary).
    const reveals = techGifts('bronzePanoply').filter((gift) => gift.kind === 'reveal');
    expect(reveals.map((gift) => gift.id)).toEqual(['iron']);
    expect(reveals[0]).toMatchObject({
      name: resourceDef('iron').name,
      glyph: resourceDef('iron').emoji,
    });
    // Alchemy is the second reveal the closing node buys, and the only other
    // strategic seam the tree names.
    expect(
      techGifts('alchemy')
        .filter((gift) => gift.kind === 'reveal')
        .map((gift) => gift.id),
    ).toEqual(['niter']);
  });

  it('finds the improvement renewals a tech switches on, with what they add', () => {
    // The farm's freshwater renewal moved from Feudalism to **Irrigation** in
    // the tree pass of 2026-08-30 — growth belongs with the Hanging Gardens, and
    // Feudalism took the castle instead. The gift itself is unchanged, which is
    // the point: a renewal's home is one line of `improvements.json`.
    const renewals = techGifts('irrigation').filter((gift) => gift.kind === 'renewal');
    expect(renewals.map((gift) => gift.id)).toEqual(['farm']);
    const farm = renewals[0]!;
    if (farm.kind !== 'renewal') throw new Error('expected a renewal');
    expect(farm.name).toBe(improvementDef('farm').name);
    expect(farm.requiresFreshwater).toBe(true);
    expect(farm.add).toEqual(readTileYield(improvementDef('farm').upgrades![0]!.add));
  });

  it('hands over a copy of a renewal\'s yield, not the shared table', () => {
    const before = { ...improvementDef('farm').upgrades![0]!.add };
    const gift = techGifts('irrigation').find((entry) => entry.kind === 'renewal')!;
    if (gift.kind !== 'renewal') throw new Error('expected a renewal');
    gift.add.food += 99;
    expect(improvementDef('farm').upgrades![0]!.add).toEqual(before);
  });

  it('finds the improvement a tech unlocks, which techs.json never mentions', () => {
    // The mirror of the reveal above, and the reason `techDataProblems` handed
    // Entry V's "every node is a package" check over to `unlockDataProblems`:
    // Mining's `unlocks` block is empty and its gift is real.
    expect(techDef('mining').unlocks).toEqual({});
    expect(techGifts('mining').filter((gift) => gift.kind === 'improvement')).toEqual([
      {
        kind: 'improvement',
        id: 'mine',
        name: improvementDef('mine').name,
        glyph: improvementDef('mine').emoji,
      },
    ]);
  });

  it('finds the feature clearings a tech unlocks, off the chop table', () => {
    // The generic claim, and the one that matters: nothing here names Mining or
    // the forest. `techGifts` walks the chop table and files each entry under
    // whatever tech that entry names, so the day the jungle gets a row it
    // appears on its own node with no edit to this module.
    for (const feature of CHOPPABLE_FEATURES) {
      const chop = chopDef(feature)!;
      const gifts = techGifts(chop.tech).filter((gift) => gift.kind === 'ability');
      const mine = gifts.find((gift) => gift.id === feature);
      expect(mine, feature).toBeDefined();
      expect(mine!.name).toBe(`Clear ${featureDef(feature).name}`);
      // What it pays is the table's number, so the tech card and the worker
      // sheet cannot quote different timber.
      expect(mine!.pays!.production).toBe(chopYield(feature).production);
    }
    // And the forest is on Mining, which is the ratified gate.
    const mining = techGifts('mining').filter((gift) => gift.kind === 'ability');
    expect(mining.map((gift) => gift.id)).toEqual(['forest']);
  });

  it('hands the ability list a copy, so a caller cannot retune the chop', () => {
    // `improvementYield`'s guarantee, kept for the third table: the payout is
    // shared module state and a reader that summed into it would rebalance the
    // game from an information surface.
    const before = chopYield('forest').production;
    const gift = techGifts('mining').find((entry) => entry.kind === 'ability')!;
    gift.pays!.production += 99;
    expect(chopYield('forest').production).toBe(before);
  });

  /**
   * **No node renews a building** (the renewals axe, 2026-09-04). The Wheel used
   * to hand every granary a fourth point of food off `BuildingDef.upgrades`, and
   * eight more nodes did the same for the barracks, the library and the market.
   * The rows went and the gift kind went with them, so the pin is the shape's
   * *absence*: the nine nodes hand over what they always handed over minus the
   * free growth, and nothing in the tree carries a city-side building gift.
   */
  it('hands over no building renewals at all — the shape is gone', () => {
    const renewed = [
      'theWheel',
      'irrigation',
      'bronzePanoply',
      'ironWorking',
      'mathematics',
      'theQadisCourt',
      'movableType',
      'paperMoney',
      'banking',
    ] as const;
    for (const id of renewed) {
      const kinds = techGifts(id).map((gift) => String(gift.kind));
      expect(kinds, id).not.toContain('buildingRenewal');
    }
    // Swept, not spot-checked: no node anywhere hands one over, and no building
    // row is left carrying an `upgrades` list for one to be read off.
    for (const id of TECH_IDS) {
      expect(techGifts(id).map((gift) => String(gift.kind)), id).not.toContain('buildingRenewal');
    }
    for (const building of BUILDING_IDS) {
      expect(Object.keys(buildingDef(building)), building).not.toContain('upgrades');
    }
    // The tile lines are the survivors and are not the same bargain: the
    // lighthouse's food lands on *ground the town works*, and it rides on the
    // building rather than on a node. The shape that would gate one behind a
    // technology stays declared and unfed, which is where the water pass left
    // it (`water.test.ts`) and not this ruling's business.
    expect(buildingDef('lighthouse').tileYields).toEqual([
      { on: { test: 'water' }, add: { food: 1 } },
    ]);
  });

  it('reports a node that hands over nothing at all', () => {
    expect(unlockDataProblems()).toEqual([]);
    // Mining's package is the mine *and* the axe, so both have to be taken away
    // before the node is the connective tissue Entry V forbids — and nothing in
    // `techs.json` would have changed either time, which is exactly why this
    // check moved out of `techDataProblems`. That the chop counts is the point:
    // a node whose whole gift is a verb is still a package.
    const authored = improvementDef('mine').requiresTech;
    const chop = chopDef('forest')!;
    try {
      delete (improvementDef('mine') as { requiresTech?: unknown }).requiresTech;
      // The axe alone still makes Mining a package.
      expect(techGifts('mining')).toHaveLength(1);
      expect(unlockDataProblems()).toEqual([]);

      chop.tech = 'earthenware';
      expect(techGifts('mining')).toEqual([]);
      expect(unlockDataProblems()).toContain(
        'tech "mining" hands over nothing (every node is a package — see Entry V)',
      );
    } finally {
      (improvementDef('mine') as { requiresTech?: unknown }).requiresTech = authored;
      chop.tech = 'mining';
    }
    expect(unlockDataProblems()).toEqual([]);
  });

  it('says nothing rather than something empty for a tech with no gifts', () => {
    // Every node in the tree currently gives something, which is itself worth
    // asserting: a node that hands over nothing is a data bug in waiting.
    for (const id of TECH_IDS) {
      expect(techGifts(id).length).toBeGreaterThan(0);
    }
  });

  it('accounts for every unit, building, reveal and renewal exactly once', () => {
    // The inversion's real invariant: nothing that names a technology has been
    // dropped on the floor, and no *buildable* is reachable from two nodes —
    // which is the data bug `techDataProblems` reports. Renewals are exempt on
    // purpose: an improvement is allowed to be renewed twice down the tree.
    const seen = TECH_IDS.flatMap((id) => techGifts(id).map((gift) => `${gift.kind}:${gift.id}`));
    const buildables = seen.filter((key) => key.startsWith('unit:') || key.startsWith('building:'));
    expect(new Set(buildables).size).toBe(buildables.length);

    for (const resource of RESOURCE_IDS) {
      const gate = resourceDef(resource).requiresTech;
      if (gate === undefined) continue;
      expect(seen).toContain(`reveal:${resource}`);
      expect(techGifts(gate).some((gift) => gift.id === resource)).toBe(true);
    }
    for (const improvement of IMPROVEMENT_IDS) {
      const gate = improvementDef(improvement).requiresTech;
      if (gate !== undefined) {
        expect(seen).toContain(`improvement:${improvement}`);
        expect(techGifts(gate).some((gift) => gift.id === improvement)).toBe(true);
      }
      for (const upgrade of improvementDef(improvement).upgrades ?? []) {
        expect(techGifts(upgrade.tech).some((gift) => gift.id === improvement)).toBe(true);
      }
    }
    // A building's own side of the sweep is its **tech-gated tile line** since
    // the renewals axe (2026-09-04) — the `upgrades` list this used to walk is
    // gone from the table. Vacuous today (no row gates a line yet) and kept
    // because the shape is live: the day one does, the node has to announce it.
    for (const building of BUILDING_IDS) {
      for (const line of buildingDef(building).tileYields ?? []) {
        if (line.requiresTech === undefined) continue;
        expect(techGifts(line.requiresTech).some((gift) => gift.id === building)).toBe(true);
      }
    }
  });
});

/**
 * **Who gains the verb** (`AbilityDef.bearer`, the playtest notes of
 * 2026-09-03).
 *
 * The user's report was that every rite an augur may spend was introduced on the
 * tech card by "Workers may also", which is the one thing an augur is not. The
 * fix is a field on the row, and the register test is here rather than in a UI
 * suite for the reason this whole file exists: the star chart's heading is one
 * lookup off this data, so the data is what can be wrong.
 */
describe('an ability names its bearer', () => {
  it('gives every verb in the table a bearer the union knows', () => {
    for (const ability of ABILITY_IDS) {
      const bearer = abilityDef(ability).bearer;
      expect(bearer, ability).toBeDefined();
      expect(ABILITY_BEARERS, ability).toContain(bearer!);
    }
  });

  it('files the rites under the augur and the crossings under who may cross', () => {
    // The rows the mislabelling was actually about. Named here rather than
    // derived, because "which of these is a rite" is a design fact about the
    // religion pass and not something the table can be asked.
    for (const rite of [
      'riteOfTheHarvest',
      'recastingTheOmens',
      'omenReading',
      'consecrationOfTheBounds',
      'blessingOfArms',
      'thePreaching',
      'riteOfPlenty',
    ] as const) {
      expect(abilityDef(rite).bearer, rite).toBe('augur');
    }
    // The two crossings are the pair the tree deliberately splits: civilians at
    // Sailing, soldiers at Wayfinding. A heading that filed the second under the
    // spade is what made Sea Legs unreadable.
    expect(abilityDef('embark').bearer).toBe('civilian');
    expect(abilityDef('militaryEmbark').bearer).toBe('military');
    expect(abilityDef('siege').bearer).toBe('military');
    // And a verb nobody carries says so, rather than being filed under a piece
    // that has nothing to do with it.
    expect(abilityDef('oceanGoing').bearer).toBe('empire');
    expect(abilityDef('theLongCount').bearer).toBe('empire');
  });

  it('says what Sea Legs actually does, in a first-time player\u2019s words', () => {
    // The user could not tell what the row was for. A name is not a rule, so
    // the summary states the crossing plainly — and since the encyclopedic
    // rewrite (2026-09-03) it states ONLY the crossing: the bearer heading
    // carries the who, and the Sailing cross-reference lives in the
    // Compendium rather than a one-line note. Hard rule 7 still: no figure,
    // no identifier.
    const summary = abilityDef('militaryEmbark').summary;
    expect(summary).toContain('coastal water');
    expect(summary).not.toMatch(/[0-9]/);
  });

  it('leaves a clearing to the spade, with no row in the block at all', () => {
    // A chop's gift id is a `FeatureId`, so it has no ability row — which is why
    // the heading falls back to the worker's rather than being written on every
    // feature. `isAbilityId` is the guard that keeps the two tables apart.
    for (const feature of CHOPPABLE_FEATURES) {
      expect(isAbilityId(feature), feature).toBe(false);
    }
  });
});
