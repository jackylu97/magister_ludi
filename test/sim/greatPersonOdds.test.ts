/**
 * **The odds of the next great-person offer** (batch GP1 of 2026-11-12,
 * `docs/flags.md` item (mmmmmmm)).
 *
 * The Renown tab prints the chance that a name in the next offer comes from
 * each family. The user's rule is that the figures are the draw's own. So
 * `greatPersonOdds` reads the bag and weights the draw reads
 * (`greatPersonBag`), and this file checks:
 *
 *   - the chances add up to one, and a family with no name left shows none;
 *   - they equal an exact count over every ordered hand the draw could deal,
 *     worked from the draw's own pool and weights;
 *   - the draw itself, run many times, deals each family at about that rate;
 *   - the draw and the odds read the bag through one function (source test);
 *   - the ages in the bag, and how many names the empire's own age has left.
 *
 * Core, not slow: one small board and a few thousand cheap draws.
 */

import { describe, expect, it } from 'vitest';

import {
  drawGreatPersonOffer,
  greatPersonBag,
  greatPersonOdds,
  greatPersonPool,
  greatPersonWeights,
} from '../../src/sim/greatPeople';
import {
  FAMILIES,
  type Family,
  type GreatPersonId,
  GREAT_PERSON_IDS,
  greatPersonDef,
  rosterOfAge,
} from '../../src/sim/greatPeopleData';
import { offerSize } from '../../src/sim/statecraft';
import { type GameState, type Player, bumpRevision } from '../../src/sim/state';
import { game } from './statecraftHelpers';

/**
 * The expected share of the hand for each family, by walking every ordered
 * hand the draw could deal. Each pick's chance is its weight over the weight
 * left, which is the draw's own rule. Built from the pool and the weights the
 * draw asks for, not from `greatPersonBag`, so the two are checked against
 * each other.
 */
function bruteForce(state: GameState, player: Player): Record<Family, number> {
  const size = offerSize(state, player.id, 'greatPerson');
  const candidates = greatPersonPool(state, player, size);
  const weights = greatPersonWeights(player, candidates);
  const wanted = Math.min(size, candidates.length);
  const counts: Record<Family, number> = { scholar: 0, artist: 0, engineer: 0, merchant: 0, general: 0 };
  const walk = (left: number[], chance: number, depth: number): void => {
    if (depth === wanted) return;
    let total = 0;
    for (const at of left) total += weights[at]!;
    for (const at of left) {
      const here = (chance * weights[at]!) / total;
      counts[greatPersonDef(candidates[at]!).family] += here;
      walk(
        left.filter((other) => other !== at),
        here,
        depth + 1,
      );
    }
  };
  walk(
    candidates.map((_, at) => at),
    1,
    0,
  );
  for (const family of FAMILIES) counts[family] /= wanted;
  return counts;
}

/** A seat with a lopsided feed and a short family, so the odds are not flat. */
function lopsided(): { state: GameState; player: Player } {
  const g = game(41);
  const player = g.state.players[0]!;
  player.renownByFamily.scholar = 60;
  player.renownByFamily.general = 20;
  // Every general of the empire's age but one is taken, so generals are few in
  // the bag while their weight is high.
  const generals = rosterOfAge(2).filter((id) => greatPersonDef(id).family === 'general');
  expect(generals.length).toBeGreaterThan(1);
  g.state.recruited.push(...generals.slice(1));
  bumpRevision(g.state);
  return { state: g.state, player };
}

describe('the odds of the next great-person offer', () => {
  it('add up to one across the five families', () => {
    const { state, player } = lopsided();
    const odds = greatPersonOdds(state, player);
    expect(odds.families.map((entry) => entry.family)).toEqual([...FAMILIES]);
    const total = odds.families.reduce((sum, entry) => sum + entry.chance, 0);
    expect(total).toBeCloseTo(1, 9);
    expect(odds.wanted).toBe(offerSize(state, player.id, 'greatPerson'));
  });

  it('match an exact count over every hand the draw could deal', () => {
    const { state, player } = lopsided();
    const odds = greatPersonOdds(state, player);
    const exact = bruteForce(state, player);
    for (const entry of odds.families) {
      expect(entry.chance, entry.family).toBeCloseTo(exact[entry.family], 9);
    }
    // The hand is drawn without replacement, so the odds are not simply each
    // family's share of the bag's weight. One general is left: he can fill
    // one place in the hand at most.
    const general = odds.families.find((entry) => entry.family === 'general')!;
    expect(general.names).toBe(1);
    expect(general.chance).toBeLessThanOrEqual(1 / odds.wanted);
    const bag = greatPersonBag(state, player);
    const totalWeight = bag.weights.reduce((sum, weight) => sum + weight, 0);
    let apart = 0;
    for (const entry of odds.families) {
      const weight = bag.candidates.reduce(
        (sum, id, at) => sum + (greatPersonDef(id).family === entry.family ? bag.weights[at]! : 0),
        0,
      );
      apart += Math.abs(entry.chance - weight / totalWeight);
    }
    expect(apart).toBeGreaterThan(0);
  });

  it('are what the draw really deals, over many hands', () => {
    const { state, player } = lopsided();
    const odds = greatPersonOdds(state, player);
    const dealt: Record<Family, number> = { scholar: 0, artist: 0, engineer: 0, merchant: 0, general: 0 };
    const hands = 3000;
    let names = 0;
    for (let n = 0; n < hands; n++) {
      // The draw reads the state and spends only the generator, so each hand
      // is dealt from the same bag.
      for (const id of drawGreatPersonOffer(state, player).options) {
        dealt[greatPersonDef(id).family] += 1;
        names += 1;
      }
    }
    expect(names).toBe(hands * odds.wanted);
    for (const entry of odds.families) {
      expect(Math.abs(dealt[entry.family] / names - entry.chance), entry.family).toBeLessThan(0.03);
    }
  });

  it('rise for the family that fed the renown', () => {
    const g = game(41);
    const player = g.state.players[0]!;
    const chanceOf = (family: Family): number =>
      greatPersonOdds(g.state, player).families.find((entry) => entry.family === family)!.chance;
    const flat = chanceOf('scholar');
    player.renownByFamily.scholar = 60;
    bumpRevision(g.state);
    expect(chanceOf('scholar')).toBeGreaterThan(flat);
  });

  it('give a family with no name left no chance at all', () => {
    const g = game(43);
    const player = g.state.players[0]!;
    player.renownByFamily.scholar = 100;
    // Every scholar in the world is taken: the fed family is spent.
    g.state.recruited.push(
      ...GREAT_PERSON_IDS.filter((id) => greatPersonDef(id).family === 'scholar'),
    );
    bumpRevision(g.state);
    const odds = greatPersonOdds(g.state, player);
    const scholar = odds.families.find((entry) => entry.family === 'scholar')!;
    expect(scholar.names).toBe(0);
    expect(scholar.chance).toBe(0);
    const total = odds.families.reduce((sum, entry) => sum + entry.chance, 0);
    expect(total).toBeCloseTo(1, 9);
  });

  it('deal nothing and promise nothing once the roster is spent', () => {
    const g = game(47);
    g.state.recruited.push(...GREAT_PERSON_IDS);
    bumpRevision(g.state);
    const odds = greatPersonOdds(g.state, g.state.players[0]!);
    expect(odds.wanted).toBe(0);
    expect(odds.ages).toEqual([]);
    for (const entry of odds.families) expect(entry.chance).toBe(0);
  });

  it('name the ages in the bag, and how many names the empire’s own age has left', () => {
    const g = game(53);
    const player = g.state.players[0]!;
    const own = rosterOfAge(2);
    let odds = greatPersonOdds(g.state, player);
    expect(odds.age).toBe(2);
    expect(odds.ages).toEqual([2]);
    expect(odds.ageLeft).toBe(own.length);
    // One name left in the empire's age: the draw reaches into the next age
    // (there is no earlier one), and the odds say so.
    g.state.recruited.push(...own.slice(1));
    bumpRevision(g.state);
    odds = greatPersonOdds(g.state, player);
    expect(odds.ageLeft).toBe(1);
    expect(odds.ages).toEqual([2, 3]);
  });

  it('are read through the one bag the draw deals from', () => {
    const source = Object.values(
      import.meta.glob('../../src/sim/greatPeople.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    const body = (name: string): string => {
      const start = source.indexOf(`export function ${name}(`);
      expect(start, name).toBeGreaterThanOrEqual(0);
      return source.slice(start, source.indexOf('\n}\n', start));
    };
    // The draw asks the bag and never builds its own pool or weights.
    expect(body('drawGreatPersonOffer')).toContain('greatPersonBag(state, player, family)');
    expect(body('drawGreatPersonOffer')).not.toContain('greatPersonWeights(');
    expect(body('drawGreatPersonOffer')).not.toContain('greatPersonPool(');
    // The odds ask the same bag.
    expect(body('greatPersonOdds')).toContain('greatPersonBag(state, player)');
    expect(body('greatPersonOdds')).not.toContain('greatPersonWeights(');
    // And the bag is where the pool and the weights are asked.
    expect(body('greatPersonBag')).toContain('greatPersonWeights(player, candidates)');
  });

  it('leave the bag unchanged for the draw: the same candidates in the same order', () => {
    const { state, player } = lopsided();
    const bag = greatPersonBag(state, player);
    const size = offerSize(state, player.id, 'greatPerson');
    expect(bag.size).toBe(size);
    expect(bag.candidates).toEqual(greatPersonPool(state, player, size));
    expect(bag.weights).toEqual(greatPersonWeights(player, bag.candidates));
    expect(bag.family).toBeUndefined();
    const ids: GreatPersonId[] = drawGreatPersonOffer(state, player).options;
    for (const id of ids) expect(bag.candidates).toContain(id);
  });
});
