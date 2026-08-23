/**
 * What a technology hands over, gathered from the three tables that say so.
 *
 * `techGifts` exists because only half of a tech's gifts are written in
 * `data/techs.json`: a resource's `requiresTech`, an improvement's own
 * `requiresTech` and `upgrades[].tech`, and a building's `upgrades[].tech` all
 * name the technology from their own side, and a screen that read only the
 * `unlocks` block would quietly promise a player less than the technology
 * actually gives them — or, since the Age I rework, nothing at all, which is
 * what Mining's `unlocks` block says. So what is covered here is exactly that —
 * the inversion, its order, and the fact that every table's entry is accounted
 * for exactly once across the whole tree.
 *
 * The star chart's card itself is DOM and is not covered, as with every other UI
 * pass: this suite has no jsdom.
 */

import { describe, expect, it } from 'vitest';
import { BUILDING_IDS, buildingDef } from '../src/sim/buildingData';
import { IMPROVEMENT_IDS, improvementDef } from '../src/sim/improvementData';
import { RESOURCE_IDS, resourceDef } from '../src/sim/resourceData';
import { TECH_IDS, techDef } from '../src/sim/techData';
import { readTileYield } from '../src/sim/terrainData';
import { techGifts, unlockDataProblems } from '../src/sim/techUnlocks';
import { unitDef } from '../src/sim/unitData';

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
    expect(techGifts('earthenware').map((gift) => [gift.kind, gift.id])).toEqual([
      ['building', 'granary'],
    ]);
  });

  it('puts units before buildings when a tech hands over both', () => {
    // Construction and Bronzeworking are the nodes that do; the order is the
    // reading order the node card already uses.
    expect(techGifts('construction').map((gift) => gift.kind)).toEqual(['unit', 'building']);
    expect(techGifts('bronzeWorking').map((gift) => gift.kind)).toEqual([
      'unit',
      'building',
      'reveal',
    ]);
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
    // the tile; Bronze Working buys the *label* (see `isResourceVisible`). The
    // gift is real and the `unlocks` block does not know about it.
    expect(techDef('bronzeWorking').unlocks.buildings).toEqual(['barracks']);
    const reveals = techGifts('bronzeWorking').filter((gift) => gift.kind === 'reveal');
    expect(reveals.map((gift) => gift.id)).toEqual(['iron']);
    expect(reveals[0]).toMatchObject({
      name: resourceDef('iron').name,
      glyph: resourceDef('iron').emoji,
    });
  });

  it('finds the improvement renewals a tech switches on, with what they add', () => {
    const renewals = techGifts('feudalism').filter((gift) => gift.kind === 'renewal');
    expect(renewals.map((gift) => gift.id)).toEqual(['farm']);
    const farm = renewals[0]!;
    if (farm.kind !== 'renewal') throw new Error('expected a renewal');
    expect(farm.name).toBe(improvementDef('farm').name);
    expect(farm.requiresFreshwater).toBe(true);
    expect(farm.add).toEqual(readTileYield(improvementDef('farm').upgrades![0]!.add));
  });

  it('hands over a copy of a renewal\'s yield, not the shared table', () => {
    const before = { ...improvementDef('farm').upgrades![0]!.add };
    const gift = techGifts('feudalism').find((entry) => entry.kind === 'renewal')!;
    if (gift.kind !== 'renewal') throw new Error('expected a renewal');
    gift.add.food += 99;
    expect(improvementDef('farm').upgrades![0]!.add).toEqual(before);
  });

  it('finds the improvement a tech unlocks, which techs.json never mentions', () => {
    // The mirror of the reveal above, and the reason `techDataProblems` handed
    // Entry V's "every node is a package" check over to `unlockDataProblems`:
    // Mining's `unlocks` block is empty and its gift is real.
    expect(techDef('mining').unlocks).toEqual({});
    expect(techGifts('mining')).toEqual([
      {
        kind: 'improvement',
        id: 'mine',
        name: improvementDef('mine').name,
        glyph: improvementDef('mine').emoji,
      },
    ]);
  });

  it('finds the building renewals a tech switches on, with what they add', () => {
    // The Wheel gives every granary a fourth point of food — the building half
    // of the renewal hook, and the only one in the tree today.
    const renewals = techGifts('theWheel').filter((gift) => gift.kind === 'buildingRenewal');
    expect(renewals.map((gift) => gift.id)).toEqual(['granary']);
    const granary = renewals[0]!;
    if (granary.kind !== 'buildingRenewal') throw new Error('expected a building renewal');
    expect(granary.name).toBe(buildingDef('granary').name);
    expect(granary.add).toEqual(buildingDef('granary').upgrades?.[0]?.add);
    // Copied, not the shared table — the same guarantee the improvement
    // renewal above keeps.
    const before = { ...buildingDef('granary').upgrades![0]!.add };
    granary.add.food = (granary.add.food ?? 0) + 99;
    expect(buildingDef('granary').upgrades![0]!.add).toEqual(before);
  });

  it('reports a node that hands over nothing at all', () => {
    expect(unlockDataProblems()).toEqual([]);
    // Mining's whole package is the mine, so taking the gate off the mine makes
    // it the connective tissue Entry V forbids — and nothing in `techs.json`
    // would have changed, which is exactly why this check moved out of
    // `techDataProblems`.
    const authored = improvementDef('mine').requiresTech;
    try {
      delete (improvementDef('mine') as { requiresTech?: unknown }).requiresTech;
      expect(techGifts('mining')).toEqual([]);
      expect(unlockDataProblems()).toContain(
        'tech "mining" hands over nothing (every node is a package — see Entry V)',
      );
    } finally {
      (improvementDef('mine') as { requiresTech?: unknown }).requiresTech = authored;
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
    for (const building of BUILDING_IDS) {
      for (const upgrade of buildingDef(building).upgrades ?? []) {
        expect(techGifts(upgrade.tech).some((gift) => gift.id === building)).toBe(true);
      }
    }
  });
});
