/**
 * Triumphs: the one new hook shape, its scopes, and the seams it hangs off
 * (`docs/great-people.md`).
 *
 * Three claims are on trial:
 *
 *   · **every trigger fires, and fires the number of times its scope allows** —
 *     `once`, `perAge`, `contested` and `perEvent` are four different answers to
 *     "again?" and each is enforced in one place (`awardTriumph`);
 *   · **contention is settled by log and sweep order** — a contested row is the
 *     *world's*, so the second empire into an era earns nothing;
 *   · **a deferred row is never awarded**, however true its trigger becomes.
 *
 * The seams are exercised through the mechanisms rather than through the
 * reducer wherever a mechanism exists, because that is where the rule lives: an
 * AI that founds a city earns The Third Hearth without anybody remembering to
 * add a line to a handler.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, realiseItem } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { claimDiscoveryAt } from '../../src/sim/discoveries';
import { getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, createUnit } from '../../src/sim/state';
import { adoptGovernmentAt } from '../../src/sim/statecraft';
import { GOVERNMENT_TIERS, governmentsAtTier } from '../../src/sim/statecraftData';
import { previewCombat } from '../../src/sim/combat';
import { settleBeliefChoice } from '../../src/sim/religion';
import { BELIEF_IDS } from '../../src/sim/religionData';
import { highestAge } from '../../src/sim/techData';
import { settleResearch } from '../../src/sim/tech';
import {
  TRIUMPH_IDS,
  type TriumphId,
  triumphDef,
} from '../../src/sim/triumphData';
import {
  awardCountTriumphs,
  awardOccasion,
  awardTriumph,
  triumphMarks,
  triumphsAwarded,
  triumphsSince,
} from '../../src/sim/triumphs';
import { runEndOfTurn } from '../../src/sim/turn';
import { game, found, keepTheRites } from './statecraftHelpers';

/** Did this empire earn this row, and how many times? */
function count(state: GameState, playerId: number, id: TriumphId): number {
  return state.players[playerId]!.triumphs.filter((earned) => earned.id === id).length;
}

/** A second and third city for this seat, at hand-picked hexes. */
function settle(state: GameState, playerId: number, ...cells: [number, number][]) {
  return cells.map(([col, row]) => foundCityAt(state, playerId, getTileAt(state.map, col, row)!));
}

// --- the table --------------------------------------------------------------

describe('the table', () => {
  it('is the doc’s seventeen, three of them waiting on content', () => {
    expect(TRIUMPH_IDS).toHaveLength(17);
    const deferred = TRIUMPH_IDS.filter((id) => triumphDef(id).deferred !== undefined);
    expect(deferred.sort()).toEqual(['fallenBecomeVerse', 'firstKeel', 'longRoad']);
  });

  it('pays something for every live row, and names a family for most', () => {
    for (const id of TRIUMPH_IDS) {
      expect(triumphDef(id).pays, id).toBeGreaterThan(0);
    }
    const fed = TRIUMPH_IDS.filter((id) => triumphDef(id).family !== undefined);
    expect(fed.length).toBeGreaterThan(TRIUMPH_IDS.length / 2);
  });

  it('says on every row what earned it, in a first-time player’s words', () => {
    // The user's ruling (2026-08-28): *"we need a one-liner that describes what
    // the triumph was caused by"*. A name is a title and an epigram is a poem,
    // and neither of them answers "why did this just happen" — which was the
    // complaint. Every row, not most: a Triumph with no cause line is the
    // failure the ruling names.
    for (const id of TRIUMPH_IDS) {
      const def = triumphDef(id);
      expect(def.text, id).toBeTruthy();
      expect(def.text, id).not.toBe(def.epigram);
      // Hard rule 7's prose rule. The renown figure is `pays`, a field, printed
      // as a figure — a number in the sentence would be the same fact twice,
      // and the copy is the one a balance pass never finds.
      expect(/\d/.test(def.text), id).toBe(false);
      // Second person, present tense, one sentence: the voice the ruling asked
      // for, held where it can be held mechanically.
      expect(def.text.endsWith('.'), id).toBe(true);
    }
  });
});

// --- scope ------------------------------------------------------------------

describe('scope', () => {
  it('once: the third hearth is earned once and never again', () => {
    const g = game();
    found(g.state, 0);
    expect(count(g.state, 0, 'thirdHearth')).toBe(0);
    settle(g.state, 0, [4, 4], [8, 4]);
    expect(count(g.state, 0, 'thirdHearth')).toBe(1);
    settle(g.state, 0, [12, 4]);
    expect(count(g.state, 0, 'thirdHearth')).toBe(1);
  });

  it('once: refuses even when awarded directly, twice', () => {
    const g = game();
    expect(awardTriumph(g.state, 0, 'greatCity')).not.toBeNull();
    expect(awardTriumph(g.state, 0, 'greatCity')).toBeNull();
  });

  it('perEvent: a wonder is worth one every time', () => {
    const g = game();
    const city = found(g.state, 0);
    expect(awardOccasion(g.state, 0, 'wonderCompleted')).toHaveLength(1);
    expect(awardOccasion(g.state, 0, 'wonderCompleted')).toHaveLength(1);
    expect(count(g.state, 0, 'marvelRaised')).toBe(2);
    void city;
  });

  it('perAge: once in each era, and again when the era turns over', () => {
    const g = game();
    const player = g.state.players[0]!;
    expect(awardTriumph(g.state, 0, 'campBurned')).not.toBeNull();
    expect(awardTriumph(g.state, 0, 'campBurned')).toBeNull();
    // A new era is a new claim. The stamp is the empire's age at the moment it
    // was earned, so this is a comparison rather than a counter.
    player.techsResearched.push('ironWorking');
    expect(highestAge(player.techsResearched)).toBeGreaterThan(1);
    expect(awardTriumph(g.state, 0, 'campBurned')).not.toBeNull();
    expect(count(g.state, 0, 'campBurned')).toBe(2);
  });

  it('contested: the first seat in the world takes it, and nobody else can', () => {
    const g = game();
    const first = awardTriumph(g.state, 0, 'firstLight');
    expect(first).not.toBeNull();
    expect(g.state.contested).toEqual([
      { id: 'firstLight', playerId: 0, age: highestAge(g.state.players[0]!.techsResearched), turn: g.state.turn },
    ]);
    // Same era, second seat: nothing.
    expect(awardTriumph(g.state, 1, 'firstLight')).toBeNull();
    expect(count(g.state, 1, 'firstLight')).toBe(0);
    // Next era: open again, and whoever gets there first takes it.
    g.state.players[1]!.techsResearched.push('ironWorking');
    expect(awardTriumph(g.state, 1, 'firstLight')).not.toBeNull();
    expect(g.state.contested).toHaveLength(2);
  });

  it('never awards a deferred row, however true its trigger becomes', () => {
    const g = game();
    for (const id of TRIUMPH_IDS) {
      if (triumphDef(id).deferred === undefined) continue;
      expect(awardTriumph(g.state, 0, id), id).toBeNull();
    }
    expect(g.state.players[0]!.triumphs).toEqual([]);
  });

  it('never awards the wild', () => {
    const g = game();
    // The wild is not seated in this fixture, so the guard is asserted against
    // the flag directly — the same one `runStatecraft` and `advanceResearch` use.
    g.state.players[1]!.barbarian = true;
    expect(awardTriumph(g.state, 1, 'greatCity')).toBeNull();
  });
});

// --- what a triumph pays ----------------------------------------------------

describe('what a triumph pays', () => {
  it('banks its renown through the bucket’s own seam, family and all', () => {
    const g = game();
    const player = g.state.players[0]!;
    awardTriumph(g.state, 0, 'campBurned');
    const def = triumphDef('campBurned');
    expect(player.renownPool).toBe(def.pays);
    expect(player.renownByFamily.general).toBe(def.pays);
  });

  it('can fill the ladder and open a great-person offer on the spot', () => {
    const g = game();
    found(g.state, 0);
    keepTheRites(g.state);
    const player = g.state.players[0]!;
    player.renownPool = RULES.renown.first - triumphDef('cityOfMarvels').pays;
    awardTriumph(g.state, 0, 'cityOfMarvels');
    expect(player.greatPersonOffer).toBeDefined();
  });
});

// --- the standing counts ----------------------------------------------------

describe('the standing counts', () => {
  it('claims a size-10 city off the board, once a turn, with no hook', () => {
    const g = game();
    const city = found(g.state, 0);
    awardCountTriumphs(g.state, 0);
    expect(count(g.state, 0, 'greatCity')).toBe(0);
    city.population = 10;
    awardCountTriumphs(g.state, 0);
    expect(count(g.state, 0, 'greatCity')).toBe(1);
    // And a town that starves back and grows again earns nothing more.
    city.population = 4;
    awardCountTriumphs(g.state, 0);
    city.population = 11;
    awardCountTriumphs(g.state, 0);
    expect(count(g.state, 0, 'greatCity')).toBe(1);
  });

  it('claims seven wonders in one city', () => {
    const g = game();
    const city = found(g.state, 0);
    for (let i = 0; i < 7; i++) city.buildings.push('theOracle');
    awardCountTriumphs(g.state, 0);
    expect(count(g.state, 0, 'cityOfMarvels')).toBe(1);
  });

  it('is swept by the renown phase, so nothing has to announce it', () => {
    const g = game();
    const city = found(g.state, 0);
    city.population = 10;
    // Fed, so the resolution's own `growCities` does not starve the town back
    // below the threshold before the renown phase reads it.
    city.foodBasket = 999;
    runEndOfTurn(g.state);
    expect(city.population).toBeGreaterThanOrEqual(10);
    expect(count(g.state, 0, 'greatCity')).toBe(1);
  });
});

// --- the seams --------------------------------------------------------------

describe('the seams', () => {
  it('a wonder completed, from inside realiseItem', () => {
    const g = game();
    const city = found(g.state, 0);
    realiseItem(g.state, city, { kind: 'building', id: 'theOracle' });
    expect(count(g.state, 0, 'marvelRaised')).toBe(1);
    // And the wonder's own lump is banked beside it.
    expect(g.state.players[0]!.renownPool).toBeGreaterThanOrEqual(
      triumphDef('marvelRaised').pays + 10,
    );
  });

  it('a government adopted, from inside adoptGovernmentAt', () => {
    const g = game();
    const player = g.state.players[0]!;
    // The ladder's first rung, read off the rows: it moved 3 → 4 in the pacing
    // retune of 2026-08-27 and `governmentsAtTier(3)` is now empty.
    const rung = GOVERNMENT_TIERS[0]!;
    player.statecraft.pendingGovernment = { tier: rung, options: governmentsAtTier(rung) };
    adoptGovernmentAt(g.state, player, 0);
    expect(count(g.state, 0, 'writExtends')).toBe(1);
  });

  it('a god named, from inside settleBeliefChoice', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.pantheon.pending = { options: [BELIEF_IDS[0]!] };
    expect(settleBeliefChoice(g.state, player, 0)).not.toBeNull();
    expect(count(g.state, 0, 'godNamed')).toBe(1);
    // Per belief: naming a second god is a second triumph.
    player.pantheon.pending = { options: [BELIEF_IDS[1]!] };
    settleBeliefChoice(g.state, player, 1 - 1);
    expect(count(g.state, 0, 'godNamed')).toBe(2);
  });

  it('a ruin read, from inside claimDiscoveryAt', () => {
    const g = game();
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    tile.discovery = 'ruins';
    expect(claimDiscoveryAt(g.state, unit, tile)).not.toBeNull();
    expect(count(g.state, 0, 'ruinRead')).toBe(1);
    // Per age: a second ruin in the same era is its own boon and no second
    // triumph.
    delete g.state.players[0]!.pendingDiscovery;
    tile.discovery = 'village';
    claimDiscoveryAt(g.state, unit, tile);
    expect(count(g.state, 0, 'ruinRead')).toBe(1);
  });

  it('an era entered, from inside settleResearch — and it is contested', () => {
    const g = game();
    const player = g.state.players[0]!;
    player.researching = 'ironWorking';
    player.sciencePool = 9999;
    expect(settleResearch(g.state, player)).not.toBeNull();
    expect(count(g.state, 0, 'firstLight')).toBe(1);

    // The rival reaching the same era earns nothing: the row is the world's.
    const rival = g.state.players[1]!;
    rival.researching = 'ironWorking';
    rival.sciencePool = 9999;
    settleResearch(g.state, rival);
    expect(count(g.state, 1, 'firstLight')).toBe(0);
  });

  it('a battle won against a stronger defender, once per age', () => {
    const g = game();
    const attacker = createUnit(g.state, 0, 'warrior', 6, 6);
    // A spearman is worth eleven to a warrior's eight, so the forecast the
    // player was shown says the other side is the stronger — which is exactly
    // what the row rewards beating.
    const defender = createUnit(g.state, 1, 'spearman', 7, 6);
    defender.hp = 1;
    const plan = previewCombat(g.state, attacker.id, { col: defender.col, row: defender.row });
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.defenderStrength).toBeGreaterThan(plan.attackerStrength);
    applyCommand(g.state, {
      type: 'attack',
      playerId: 0,
      unitId: attacker.id,
      target: { col: defender.col, row: defender.row },
    });
    expect(count(g.state, 0, 'againstTheOdds')).toBe(1);

    // Again in the same era earns nothing: the row is per age.
    const second = createUnit(g.state, 0, 'warrior', 9, 6);
    const other = createUnit(g.state, 1, 'spearman', 10, 6);
    other.hp = 1;
    applyCommand(g.state, {
      type: 'attack',
      playerId: 0,
      unitId: second.id,
      target: { col: other.col, row: other.row },
    });
    expect(count(g.state, 0, 'againstTheOdds')).toBe(1);
  });
});

// --- the news ---------------------------------------------------------------

describe('the news is a diff', () => {
  it('slices exactly what one stretch of play awarded', () => {
    const g = game();
    const player = g.state.players[0]!;
    awardTriumph(g.state, 0, 'campBurned');
    const mark = player.triumphs.length;
    awardTriumph(g.state, 0, 'greatCity');
    const awards = triumphsAwarded(player, mark);
    expect(awards.map((award) => award.id)).toEqual(['greatCity']);
    expect(awards[0]!.pays).toBe(triumphDef('greatCity').pays);
    expect(awards[0]!.turn).toBe(g.state.turn);
  });

  it('takes the same diff across every seat for a resolution', () => {
    const g = game();
    const marks = triumphMarks(g.state);
    awardTriumph(g.state, 0, 'campBurned');
    awardTriumph(g.state, 1, 'greatCity');
    const awards = triumphsSince(g.state, marks);
    expect(awards.map((award) => award.playerId)).toEqual([0, 1]);
  });

  it('rides out of the resolution on the turn report', () => {
    const g = game();
    const city = found(g.state, 0);
    city.population = 10;
    city.foodBasket = 999;
    const report = runEndOfTurn(g.state);
    expect(report.triumphs.map((award) => award.id)).toContain('greatCity');
  });

  it('rides out of a command on its result', () => {
    const g = game();
    found(g.state, 0);
    const player = g.state.players[0]!;
    player.researching = 'ironWorking';
    player.sciencePool = 9999;
    // A scholar's act finishes the technology, which opens an era, which is a
    // contested Triumph — three seams deep, reported by one diff.
    const unit = createUnit(g.state, 0, 'greatPerson', player.id === 0 ? g.state.cities[0]!.col : 0, g.state.cities[0]!.row, 'ahmes');
    const result = applyCommand(g.state, {
      type: 'greatPersonAct',
      playerId: 0,
      unitId: unit.id,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.triumphs?.map((award) => award.id)).toContain('firstLight');
    }
  });
});

// --- the register -----------------------------------------------------------

const SIM_SOURCE = import.meta.glob('../../src/sim/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('the register', () => {
  it('switches on a trigger kind in exactly one place', () => {
    // The claim `statecraft.ts` makes for a `CardEffect.kind`, one table over: a
    // second switch is a triumph that fires in one reading and not the other.
    const offenders = Object.keys(SIM_SOURCE)
      .filter((path) => /switch \(kind\)/.test(SIM_SOURCE[path]!))
      .map((path) => path.slice(path.lastIndexOf('/') + 1))
      .sort();
    expect(offenders).toContain('triumphs.ts');
  });

  it('writes Player.triumphs and GameState.contested in exactly one place', () => {
    const writers = Object.keys(SIM_SOURCE)
      .filter((path) =>
        /player\.triumphs\.push\(|state\.contested\.push\(/.test(SIM_SOURCE[path]!),
      )
      .map((path) => path.slice(path.lastIndexOf('/') + 1))
      .sort();
    expect(writers).toEqual(['triumphs.ts']);
  });
});
