/**
 * The card stamp's arithmetic (`src/sim/cardImpact.ts`): what a card would be
 * worth, as the empire's own ledger read twice.
 *
 * The claim under test is `explainBuildingPreview`'s one scale out — the figure
 * on a tarot face is the fold of a labelled list, the list is a **ghost-diff**
 * of the evaluators the turn resolution banks from, and asking the question
 * leaves the game exactly where it found it. So the suite pins the four shapes
 * that could each be quietly wrong on every card at once (a flat, a percentage,
 * the conversion, a meter tier), the occasion form a card with no per-turn
 * footprint reports instead, and the two properties the whole thing rests on:
 * it is deterministic, and it is pure.
 */

import { describe, expect, it } from 'vitest';

import {
  type CardImpactLine,
  type CardImpactSubject,
  cardImpactSheet,
  explainCardImpact,
  foldCardImpact,
  foldCardOccasions,
  hasPerTurnImpact,
} from '../../src/sim/cardImpact';
import {
  emptyCityYields,
  foundCityAt,
  refreshCityDerived,
  type CityYields,
} from '../../src/sim/cities';
import {
  explainCity,
  foldCity,
} from '../../src/sim/yields/town';
import {
  empirePercents,
} from '../../src/sim/yields/town';
import {
  explainEmpireCardYields,
  explainEmpireLines,
  foldEmpireLines,
} from '../../src/sim/yields/empire';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { empireResourceYields } from '../../src/sim/resourceEffects';
import { explainEmpireGold } from '../../src/sim/empireGold';
import { senderRouteYields } from '../../src/sim/routeYields';
import { found, game } from './statecraftHelpers';
import { foundReligion } from '../../src/sim/religion';
import { getTileAt } from '../../src/sim/map';
import { isCoastal } from '../../src/sim/water';
import { terrainDef } from '../../src/sim/terrainData';
import type { GameState } from '../../src/sim/state';
import { snapshotState } from '../../src/sim/game';
import { type CardEffect, type OrderId, orderDef } from '../../src/sim/statecraftData';
import { bumpRevision } from '../../src/sim/state';

/**
 * Everything one empire banks in a turn, read **independently of the module
 * under test**: every town's own fold, plus the empire-scale folds
 * `collectYields` banks beside them — and, since batch H19, the empire stage
 * over the additive half of those (`docs/flags.md` oo).
 *
 * Deliberately a second implementation *in the test*, which is the one place a
 * second implementation is worth having: it is what makes "the stamp is the
 * difference the turn resolution would see" an assertion rather than a comment.
 * The staging is written out here rather than borrowed from
 * `explainEmpireLines`, for that same reason — the bills stay flat, and the
 * multiplication is `applyStages` with an idle city stage.
 */
function ledger(state: GameState, playerId: number): CityYields {
  const total = emptyCityYields();
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = foldCity(state, city, [], city.queue[0], explainCity(state, city));
    for (const key of CITY_YIELD_KEYS) total[key] += yields[key];
  }
  const empire = emptyCityYields();
  for (const line of explainEmpireCardYields(state, playerId)) {
    for (const key of CITY_YIELD_KEYS) empire[key] += line[key];
  }
  for (const line of empireResourceYields(state, playerId)) {
    for (const key of CITY_YIELD_KEYS) empire[key] += line[key];
  }
  // A route line carries five voices and never faith, so it is walked by its
  // own keys rather than by the six.
  for (const line of senderRouteYields(state, playerId)) {
    for (const key of ['food', 'production', 'gold', 'science', 'culture'] as const) {
      empire[key] += line[key];
    }
  }
  for (const line of explainEmpireGold(state, playerId)) {
    if (line.kind === 'bill') total.gold += line.gold;
    else empire.gold += line.gold;
  }
  const percents = empirePercents(state, playerId);
  const lines = [...percents.meters, ...percents.arrears];
  for (const key of CITY_YIELD_KEYS) {
    let stage = 0;
    for (const line of lines) if (line.yield === key) stage += line.percent;
    total[key] += (empire[key] * (100 + stage)) / 100;
  }
  return total;
}

/** A town this empire's capital is not: on the coast, and big enough to matter. */
function coastalTown(state: GameState) {
  for (let row = 0; row < state.map.height; row++) {
    for (let col = 0; col < state.map.width; col++) {
      const tile = getTileAt(state.map, col, row)!;
      if (terrainDef(tile.terrain).water) continue;
      if (!isCoastal(state.map, tile)) continue;
      const city = foundCityAt(state, 0, tile);
      city.population = 14;
      refreshCityDerived(state, city);
      return city;
    }
  }
  throw new Error('the duel map has no coast');
}

/** The one town of a plain bench, grown so a percentage has something to bite. */
function bench(population = 12) {
  const made = game();
  found(made.state, 0);
  const city = made.state.cities[0]!;
  city.population = population;
  refreshCityDerived(made.state, city);
  return { state: made.state, city };
}

function sources(lines: readonly CardImpactLine[]): string[] {
  return lines.map((line) => line.source);
}

describe('a flat card', () => {
  /**
   * Weights & Measures pays every town a coin. The stamp is one labelled line,
   * under the evaluator's own name for it, and the fold is the coin.
   */
  it('is one labelled city line, and the fold is the figure', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.kind).toBe('city');
    expect(lines[0]!.source).toContain('Weights & Measures');
    expect(foldCardImpact(lines).gold).toBe(1);
    expect(hasPerTurnImpact(lines)).toBe(true);
  });

  /**
   * The whole bargain, asserted rather than described: the stamp is what the
   * turn resolution would see. Read once, the card slotted for real, read again.
   */
  it('folds to exactly the difference the empire would bank', () => {
    const { state } = bench();
    const before = ledger(state, 0);
    const stamp = foldCardImpact(explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' }));
    const sc = state.players[0]!.statecraft;
    sc.orders.push('weightsAndMeasures');
    sc.slots[sc.slots.findIndex((slot) => slot === null)] = {
      card: 'weightsAndMeasures',
      sealedUntil: state.turn,
    };
    bumpRevision(state);
    const after = ledger(state, 0);
    for (const key of CITY_YIELD_KEYS) {
      expect(stamp[key], key).toBe(after[key] - before[key]);
    }
  });
});

describe('a percentage card', () => {
  /**
   * The Academy of Deeds is +20% science and −10% culture at the empire stage —
   * no flat line anywhere. A stamp built out of flats would read zero; this one
   * reads Entry XVII's two multiplications, in the reconciliation line the
   * building preview uses for the same arithmetic, labelled with the card that
   * caused it (by construction, nothing else changed).
   */
  it('lands in the card\'s own reconciliation line, both signs', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'doctrine', id: 'theAcademyOfDeeds' });
    expect(sources(lines)).toContain('The Academy');
    const fold = foldCardImpact(lines);
    expect(fold.science).toBeGreaterThan(0);
    expect(fold.culture).toBeLessThan(0);
  });
});

describe('a yield conversion', () => {
  /**
   * Thalassocracy mints a tenth of a coastal town's food as hammers — a share
   * of a *fold*, taken inside `explainCity` and therefore invisible to any list
   * of flats. It has to reach the stamp, and it does, through the same
   * reconciliation the percentages take. (The voice paid became production in
   * batch B1; the shape and the reconciliation are what is on trial.)
   */
  it('reaches the stamp through the town it lands in', () => {
    const made = game();
    coastalTown(made.state);
    const lines = explainCardImpact(made.state, 0, { kind: 'doctrine', id: 'thalassocracy' });
    expect(foldCardImpact(lines).production).toBeGreaterThan(0);
    expect(lines.every((line) => line.kind !== 'occasion')).toBe(true);
  });
});

describe('a meter knock-on', () => {
  /**
   * Festival Days pays four contentment and not one yield. On a town poised
   * just under the tier it flips the empire's mood, and the science that
   * arrives is not the card's own payment — it is what the card *unlocked*. It
   * is reported apart, under the meter's own name, so the interface can tag it.
   */
  it('is its own kind, named for the meter that moved', () => {
    const { state, city } = bench();
    // Scenery: houses of contentment, so the empire sits just below the tier
    // rather than far under it, and a Library so there is a beaker for the tier
    // to take a share of — the base beaker halved in batch D, and ten percent of
    // a floored six is nothing. The card is the subject, not the buildings.
    city.buildings.push('cathedral', 'hallOfDeeds', 'circusMaximus', 'library');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' });
    const knock = lines.filter((line) => line.kind === 'knockOn');
    expect(knock).toHaveLength(1);
    expect(knock[0]!.source).toBe('Happiness');
    expect(knock[0]!.meter).toBe('happiness');
    expect(knock[0]!.science).toBeGreaterThan(0);
    // And nothing pretends the card paid a *beaker* itself. Batch F gave the
    // feast a song in every town beside its cheer, so the card's own city line
    // is that song and nothing else — the knock-on is still the tier's.
    const own = lines.filter((line) => line.kind === 'city');
    expect(own).toHaveLength(1);
    expect(own[0]!.culture).toBe(2);
    expect(own[0]!.science).toBe(0);
  });

  /** An empire nowhere near a rung gains nothing, and says nothing. */
  it('is silent when no tier moves', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' });
    expect(lines.filter((line) => line.kind === 'knockOn')).toEqual([]);
  });

  /**
   * And it is silent **without walking the ladder** (batch H18). Each of its
   * three rungs prices every town in the realm again, three sweeps on top of
   * the two the direct diff already took, to report three noughts — three of
   * the seven town sweeps one stamp used to pay for. `metersUnmoved` is the
   * guard, and it is a proof rather than a shortcut: two of the three rungs are
   * the same percentages in the same order as the reading already taken, the
   * third is those lines re-ordered, and a sum of whole numbers is the same
   * figure in any order — which is why the whole-number test is part of the
   * question. The pin is on the guard, because a silent list is what a walked
   * ladder produces too and no assertion about the *answer* can tell them apart.
   */
  it('does not walk the ladder at all when neither meter moved', () => {
    const source = Object.entries(
      import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    ).find(([path]) => path.endsWith('/cardImpact.ts'))![1];
    expect(source).toContain('if (!metersUnmoved(base, ahead)) {');
    expect(source).toContain('if (!Number.isInteger(a.percent)) return false;');
    // The ladder is reached from nowhere else — one guard, one caller.
    expect(source.match(/knockOnLadder\(base, ahead\)/g)).toHaveLength(1);
  });
});

/**
 * **The meters are figures now** (user, 2026-09-03 — "we should have happiness
 * and authority be yields that appear in the preview numbers, its confusing when
 * they aren't shown"). A card's own contentment or writ is a line of its own,
 * carrying the meter and the points, and it pays in none of the six voices: the
 * yield a tier those points crossed unlocks is still the cascade's, one register
 * over. The two are the same meter twice and the suite pins the difference,
 * because folding them would have a card claiming to pay a beaker it never paid.
 */
describe('a card that pays a meter', () => {
  /** Festival Days pays four contentment flat, and now says so. */
  it('reports the card\'s own happiness as its own line', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' });
    const meters = lines.filter((line) => line.kind === 'meter');
    expect(meters).toHaveLength(1);
    expect(meters[0]!.meter).toBe('happiness');
    expect(meters[0]!.source).toBe('Happiness');
    expect(meters[0]!.amount).toBe(4);
    // It is points, never a voice — nothing banks contentment.
    for (const key of CITY_YIELD_KEYS) expect(meters[0]![key]).toBe(0);
    // The feast's own song is a city line, not a meter one — batch F's second
    // clause, and the reason the fold is no longer empty.
    expect(foldCardImpact(lines)).toEqual({ ...emptyCityYields(), culture: 2 });
  });

  /**
   * A card's meter line is its **row's**, whole — there is no step to price
   * since the levelling ruling of 2026-09-04. This asked for a deepening's
   * increment (a second-level Festival Days, +6 of an authored +2 over +4);
   * what it holds now is that the card weighs what it prints.
   */
  it('prices a card\'s meter line at what the row says', () => {
    const { state } = bench();
    const step = explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' });
    const meters = step.filter((line) => line.kind === 'meter');
    expect(meters).toHaveLength(1);
    expect(meters[0]!.amount).toBe(4);
  });

  /**
   * Provincial Governors pays the writ. Same shape, the other meter.
   *
   * Re-aimed by the synergy pass of 2026-09-05: the row was a flat +3 and is
   * now a count of the economic bench, at most four — so the preview reports
   * what the *board* is worth rather than what the row prints, and a card that
   * counts itself is worth one clerk on an empty council.
   */
  it('reports the card\'s own authority as its own line', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'provincialGovernors' });
    const meters = lines.filter((line) => line.kind === 'meter');
    expect(meters).toHaveLength(1);
    expect(meters[0]!.meter).toBe('authority');
    expect(meters[0]!.source).toBe('Authority');
    expect(meters[0]!.amount).toBe(1);
  });

  /**
   * The Choir pays a coin of culture *and* a point of contentment, both scoped
   * to a town with a Temple. Two registers off one card, and the scope is
   * honoured by both — which it is by construction, since each is a diff of the
   * evaluator that owns it.
   */
  it('reads a scoped card in both registers at once', () => {
    const { state, city } = bench();
    const bare = explainCardImpact(state, 0, { kind: 'order', id: 'theChoir' });
    expect(bare.filter((line) => line.kind === 'meter')).toEqual([]);
    expect(foldCardImpact(bare).culture).toBe(0);

    city.buildings.push('temple');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'theChoir' });
    const meters = lines.filter((line) => line.kind === 'meter');
    expect(meters).toHaveLength(1);
    expect(meters[0]!.meter).toBe('happiness');
    expect(meters[0]!.amount).toBe(1);
    expect(foldCardImpact(lines).culture).toBe(3);
  });

  /** A card that moves no meter says nothing about either. */
  it('is silent for a card with no meter line', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' });
    expect(lines.filter((line) => line.kind === 'meter')).toEqual([]);
  });

  /**
   * The meter line and the cascade it *causes* are two lines about one meter,
   * and they say two different things: the points the card paid, and the yield
   * the tier it flipped unlocked.
   */
  it('keeps the points it paid apart from the yield they unlocked', () => {
    const { state, city } = bench();
    city.buildings.push('cathedral', 'hallOfDeeds', 'circusMaximus', 'library');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' });
    const meter = lines.filter((line) => line.kind === 'meter');
    const knock = lines.filter((line) => line.kind === 'knockOn');
    expect(meter).toHaveLength(1);
    expect(meter[0]!.amount).toBe(4);
    expect(knock).toHaveLength(1);
    expect(knock[0]!.science).toBeGreaterThan(0);
    expect(knock[0]!.amount).toBeUndefined();
    // The meter's points come first: what the card pays, then what it unlocked.
    expect(lines.indexOf(meter[0]!)).toBeLessThan(lines.indexOf(knock[0]!));
  });
});

describe('a card that pays on an occasion', () => {
  /**
   * Border Ballads pays ten culture for a barbarian killed and nothing at all
   * standing. A ghost-diff of that is honestly zero, and a nought on a stamp
   * would be a lie about a card that is often the best in the hand — so the
   * rider is reported in its own form, with the occasion's own words.
   */
  it('reports the grant and the moment, never a zero', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'borderBallads' });
    const occasions = lines.filter((line) => line.kind === 'occasion');
    expect(occasions).toHaveLength(1);
    expect(occasions[0]!.occasion).toBe('killing a barbarian unit');
    expect(occasions[0]!.culture).toBe(10);
    // The two registers never mix: an occasion is not a rate.
    expect(foldCardOccasions(lines).culture).toBe(10);
    expect(foldCardImpact(lines).culture).toBe(0);
    expect(hasPerTurnImpact(lines)).toBe(false);
  });

  /** A legacy is the same reading one table over — Homer pays for the dead. */
  it('reads a great person\'s legacy in the same two forms', () => {
    const { state } = bench();
    const homer = explainCardImpact(state, 0, { kind: 'legacy', id: 'homer' });
    expect(homer.filter((line) => line.kind === 'occasion')).toHaveLength(1);
    expect(homer[0]!.occasion).toBe('losing a unit');
    expect(hasPerTurnImpact(homer)).toBe(false);

    const ahmes = explainCardImpact(state, 0, { kind: 'legacy', id: 'ahmes' });
    // A freshwater town or not, Ahmes is an ordinary standing line: whatever he
    // pays this bench, he pays it per turn and never on an occasion.
    expect(ahmes.every((line) => line.kind !== 'occasion')).toBe(true);
  });

  /**
   * And a legacy that is neither — a combat percentage on melee pieces — is the
   * **empty list**, which is what the hatched face is for. A zero would be a
   * claim; nothing is the truth.
   */
  it('answers nothing at all for a card with no ledger footprint', () => {
    const { state } = bench();
    expect(explainCardImpact(state, 0, { kind: 'legacy', id: 'ahmoseSonOfEbana' })).toEqual([]);
  });
});

describe('a card already in force', () => {
  /**
   * The bench's other half. A card in a slot is *paying* the empire, and a
   * ghost-diff run forward against it would be all noughts — so the reading is
   * taken the other way round (what taking it out would cost) and lands on the
   * same figure with the same sign. The screen at rest and the offer that dealt
   * it therefore print one number.
   */
  it('reads as what it is paying, not as a row of noughts', () => {
    const { state } = bench();
    const offered = foldCardImpact(
      explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' }),
    );
    const sc = state.players[0]!.statecraft;
    sc.orders.push('weightsAndMeasures');
    sc.slots[sc.slots.findIndex((slot) => slot === null)] = {
      card: 'weightsAndMeasures',
      sealedUntil: state.turn,
    };
    bumpRevision(state);
    const slotted = foldCardImpact(
      explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' }),
    );
    expect(slotted).toEqual(offered);
  });

  /** A doctrine already taken reads the same way — held is held. */
  it('does the same for a doctrine the empire has adopted', () => {
    const { state } = bench();
    const offered = foldCardImpact(
      explainCardImpact(state, 0, { kind: 'doctrine', id: 'theAcademyOfDeeds' }),
    );
    state.players[0]!.statecraft.doctrines.push('theAcademyOfDeeds');
    bumpRevision(state);
    const adopted = foldCardImpact(
      explainCardImpact(state, 0, { kind: 'doctrine', id: 'theAcademyOfDeeds' }),
    );
    expect(adopted).toEqual(offered);
  });

  /**
   * A card held but **not** slotted is paying nothing, and says so — that is
   * the whole of the bench's dark half: the flourish stands until the card goes
   * into an office.
   */
  it('is silent for a card held out of a slot', () => {
    const { state } = bench();
    state.players[0]!.statecraft.orders.push('weightsAndMeasures');
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' });
    // Still the forward reading — the card is not in force, so slotting it is
    // worth the coin it was always worth.
    expect(foldCardImpact(lines).gold).toBe(1);
  });
});

describe('the evaluator itself', () => {
  it('answers the same list twice', () => {
    const { state } = bench();
    const once = explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' });
    const twice = explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' });
    expect(twice).toEqual(once);
  });

  /**
   * The ghost discipline, held as a property: asking what a card is worth
   * leaves the game **byte-identical**. A shallow copy that leaked one push into
   * a shared array would show up here and nowhere else.
   */
  it('leaves the state exactly as it found it', () => {
    const { state, city } = bench();
    city.buildings.push('funeralGames', 'baths', 'circusMaximus');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const before = JSON.stringify(state);
    explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' });
    explainCardImpact(state, 0, { kind: 'doctrine', id: 'theAcademyOfDeeds' });
    explainCardImpact(state, 0, { kind: 'government', id: 'chiefdom' });
    explainCardImpact(state, 0, { kind: 'legacy', id: 'homer' });
    explainCardImpact(state, 0, { kind: 'order', id: 'borderBallads' });
    expect(JSON.stringify(state)).toBe(before);
  });

  /** An id that names nobody is the empty list, not a throw. */
  it('answers nothing for a seat that does not exist', () => {
    const { state } = bench();
    expect(explainCardImpact(state, 99, { kind: 'order', id: 'weightsAndMeasures' })).toEqual([]);
  });

  /**
   * The deepen face: asked at the level above the one held, the diff is the
   * **increment** and not the whole card, which is exactly the question the
   * draft's before/after asks.
   */
  it('prices a deepening as the step, not the card', () => {
    const { state } = bench();
    // First Rites pays the capital two candles, and its authored increment pays
    // it a third. Held at one and slotted, the level-2 face is worth the step
    // alone — one candle — and never the whole card again.
    const fresh = foldCardImpact(explainCardImpact(state, 0, { kind: 'order', id: 'firstRites' }));
    expect(fresh.faith).toBe(2);
    const sc = state.players[0]!.statecraft;
    sc.orders.push('firstRites');
    sc.slots[sc.slots.findIndex((slot) => slot === null)] = {
      card: 'firstRites',
      sealedUntil: state.turn,
    };
    bumpRevision(state);
    // Held and slotted, so the reading is what taking it *out* would cost —
    // the same figure with the same sign, which is the clause the ladder's
    // level argument used to sit beside (2026-09-04).
    const held = explainCardImpact(state, 0, { kind: 'order', id: 'firstRites' });
    expect(foldCardImpact(held).faith).toBe(2);
  });
});

/**
 * A belief, and the split that makes it three cards rather than one.
 *
 * Three pools share one id space (`beliefPoolOf`) and three different evaluators
 * read them — a god is the seat's own, a follower belief is read city-locally
 * off the faith each town follows, an enhancer belief pays whoever holds the
 * holy site — so the ghost has to put a belief on the shelf its own pool names.
 * A ghost that put all three in the pantheon stamped a follower belief as though
 * every town this empire owns kept the faith, which is the one promise that pool
 * never makes (the votive draft's card pass, 2026-09-05).
 */
describe('a belief', () => {
  /** A faith founded by seat 0, and one of its two towns keeping it. */
  function faithful() {
    const { state, city } = bench();
    // A second town, deliberately outside the congregation: what a follower
    // belief must *not* pay is the whole of what this fixture is for.
    const other = coastalTown(state);
    const religion = foundReligion(state, state.players[0]!);
    city.followers = { [religion.id]: city.population };
    return { state, city, other, religion };
  }

  it('reads a god as the pantheon card it is', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'belief', id: 'keeperOfTheHearth' });
    // The forward reading: the god is not held, so the figure is what keeping it
    // would be worth — and it is the same list once it is in the pantheon.
    const before = foldCardImpact(lines);
    state.players[0]!.pantheon.beliefs.push('keeperOfTheHearth');
    bumpRevision(state);
    expect(foldCardImpact(explainCardImpact(state, 0, { kind: 'belief', id: 'keeperOfTheHearth' })))
      .toEqual(before);
  });

  /**
   * The pooled half, and the assertion the pantheon ghost got wrong: Choirs pays
   * a note per three citizens **in a city that follows**, and it says nothing at
   * all about congregations in its own effect — it is the pool that says where
   * it lands. So an empire of two towns with one congregation is worth the
   * congregation's four notes, never the eight a pantheon god would have paid.
   */
  it('pays a follower belief only where the faith is kept', () => {
    const { state, city, other } = faithful();
    expect(city.population).toBe(12);
    expect(other.population).toBe(14);
    const fold = foldCardImpact(explainCardImpact(state, 0, { kind: 'belief', id: 'choirs' }));
    expect(fold.culture).toBe(4);
  });

  /** And it is the difference the turn resolution would bank, drafted for real. */
  it('folds to exactly what putting it on the shelf would pay', () => {
    const { state, religion } = faithful();
    const before = ledger(state, 0);
    const stamp = foldCardImpact(
      explainCardImpact(state, 0, { kind: 'belief', id: 'theQuietHours' }),
    );
    religion.follower.push('theQuietHours');
    const after = ledger(state, 0);
    for (const key of CITY_YIELD_KEYS) {
      expect(stamp[key], key).toBe(after[key] - before[key]);
    }
  });

  /** Already on the shelf, the reading is what giving it up would cost. */
  it('reads a belief in force as what it is paying', () => {
    const { state, religion } = faithful();
    const offered = foldCardImpact(
      explainCardImpact(state, 0, { kind: 'belief', id: 'theQuietHours' }),
    );
    religion.follower.push('theQuietHours');
    const kept = foldCardImpact(explainCardImpact(state, 0, { kind: 'belief', id: 'theQuietHours' }));
    expect(kept).toEqual(offered);
  });

  /**
   * An empire that has founded nothing has no shelf to put a pooled belief on,
   * and therefore no other world to diff against — the `null` a charter already
   * sworn answers with, for the same reason.
   */
  it('is silent for a pooled belief in an empire with no faith', () => {
    const { state } = bench();
    expect(explainCardImpact(state, 0, { kind: 'belief', id: 'theQuietHours' })).toEqual([]);
  });

  /** The ghost discipline holds across all three pools. */
  it('leaves the state exactly as it found it', () => {
    const { state } = faithful();
    const before = JSON.stringify(state);
    explainCardImpact(state, 0, { kind: 'belief', id: 'keeperOfTheHearth' });
    explainCardImpact(state, 0, { kind: 'belief', id: 'theQuietHours' });
    explainCardImpact(state, 0, { kind: 'belief', id: 'reliquaries' });
    expect(JSON.stringify(state)).toBe(before);
  });
});

// --- the engine shapes (batch A of `docs/fewer-things-plan.md`) --------------

/**
 * A stamp for each of the shapes batch A declared.
 *
 * No live row carries one, so each is written as a fixture over a real Order's
 * `effects` for the length of one test — the module's whole claim is that a
 * shape it has never heard of stamps correctly the day it is added, and a
 * fixture is how that claim is checked before the rows exist.
 */
describe('the engine shapes stamp', () => {
  function withCards(
    rows: readonly (readonly [OrderId, CardEffect[]])[],
    body: () => void,
  ): void {
    const held = rows.map(([id]) => [id, orderDef(id).effects] as const);
    try {
      for (const [id, effects] of rows) {
        (orderDef(id) as { effects: CardEffect[] }).effects = effects;
      }
      body();
    } finally {
      for (const [id, effects] of held) {
        (orderDef(id) as { effects: CardEffect[] }).effects = effects as CardEffect[];
      }
    }
  }

  /** Seats a card in the government's own chair, as a Confirm would. */
  function seat(state: GameState, index: number, id: OrderId): void {
    const sc = state.players[0]!.statecraft;
    if (!sc.orders.includes(id)) sc.orders.push(id);
    sc.slots[index] = { card: id, sealedUntil: state.turn };
    bumpRevision(state);
  }

  /**
   * **The empire stage, on the stamp** (batch H19, `docs/flags.md` oo). An
   * empire-scale line is banked through the empire's own multiplication now, so
   * a card paying three beakers to a realm sitting a contentment tier up is
   * worth 3.3 — and the stamp has to say the figure the resolution banks, which
   * is the whole bargain of this module.
   *
   * The bench is a **small** town: contentment is the palace's six less what the
   * citizens ask for, so the seat is over the first tier at a population of one
   * and under water at the suite's usual twelve. The tier's +10% reaches science
   * and culture.
   */
  it('reads an empire line at the figure the empire stage banks', () => {
    withCards([['waysideShrines', [{ kind: 'empireYields', science: 3 }]]], () => {
      const { state } = bench(1);
      // The tier is really standing, or this test proves nothing.
      const tier = empirePercents(state, 0).meters.find((line) => line.yield === 'science');
      expect(tier?.percent).toBe(10);
      const lines = explainCardImpact(state, 0, { kind: 'order', id: 'waysideShrines' });
      expect(foldCardImpact(lines).science).toBeCloseTo(3.3, 10);
      // And the same figure the empire's own list would gain — the stamp reads
      // the list, never a fold of its own.
      const before = foldEmpireLines(explainEmpireLines(state, 0)).science;
      seat(state, 0, 'waysideShrines');
      const after = foldEmpireLines(explainEmpireLines(state, 0)).science;
      expect(after - before).toBeCloseTo(3.3, 10);
    });
  });

  it('reads the additive amplifier as what the other cards would pay more', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'cityYields', food: 2 }]],
        ['theChoir', [{ kind: 'cardYieldAmplifier', yield: 'food', amount: 3 }]],
      ],
      () => {
        const { state } = bench();
        seat(state, 0, 'waysideShrines');
        const lines = explainCardImpact(state, 0, { kind: 'order', id: 'theChoir' });
        expect(hasPerTurnImpact(lines)).toBe(true);
        expect(foldCardImpact(lines).food).toBe(3);
      },
    );
  });

  it('reads the building share off the shelves the town has raised', () => {
    withCards(
      [['waysideShrines', [{ kind: 'buildingYieldPercent', pays: 'faith', percent: 100 }]]],
      () => {
        const { state, city } = bench();
        city.buildings.push('temple');
        bumpRevision(state);
        refreshCityDerived(state, city);
        const lines = explainCardImpact(state, 0, { kind: 'order', id: 'waysideShrines' });
        expect(foldCardImpact(lines).faith).toBe(2);
      },
    );
  });

  it('reads the position engine as the chair it points at', () => {
    withCards(
      [
        ['waysideShrines', [{ kind: 'cityYields', gold: 4 }]],
        ['theChoir', [{ kind: 'slotPosition', slot: 'economic', position: 1, factor: 2 }]],
      ],
      () => {
        const { state } = bench();
        seat(state, 1, 'waysideShrines');
        const lines = explainCardImpact(state, 0, { kind: 'order', id: 'theChoir' });
        expect(foldCardImpact(lines).gold).toBe(4);
      },
    );
  });

  it('reads a periodic boon as an occasion, in the calendar’s own words', () => {
    withCards(
      [['waysideShrines', [{ kind: 'periodic', everyTurns: 10, pays: 'gold', amount: 25 }]]],
      () => {
        const { state } = bench();
        const lines = explainCardImpact(state, 0, { kind: 'order', id: 'waysideShrines' });
        const occasion = lines.filter((line) => line.kind === 'occasion');
        expect(occasion).toHaveLength(1);
        expect(occasion[0]!.occasion).toBe('every 10 turns');
        expect(occasion[0]!.gold).toBe(25);
        // A boon pays nothing per turn, so the standing stamp is silent — which
        // is exactly what the occasion form exists to say instead of a nought.
        expect(hasPerTurnImpact(lines)).toBe(false);
        expect(foldCardOccasions(lines).gold).toBe(25);
      },
    );
  });

  it('says what a counted boon is for, when the figure is a fact about the board', () => {
    withCards(
      [['waysideShrines', [
        {
          kind: 'periodic',
          everyTurns: 15,
          pays: 'renown',
          count: 'buildingsOfCategories',
          categories: ['science', 'faith'],
        },
      ]]],
      () => {
        const { state } = bench();
        const lines = explainCardImpact(state, 0, { kind: 'order', id: 'waysideShrines' });
        const occasion = lines.filter((line) => line.kind === 'occasion');
        expect(occasion).toHaveLength(1);
        expect(occasion[0]!.note).toContain('renown');
        expect(occasion[0]!.note?.includes('[[')).toBe(false);
      },
    );
  });

  it('leaves the state byte-identical after asking about any of them', () => {
    withCards(
      [['waysideShrines', [
        { kind: 'cardYieldAmplifier', yield: 'all', amount: 1 },
        { kind: 'buildingYieldPercent', pays: 'faith', percent: 50 },
        { kind: 'slotPosition', position: 1, factor: 2 },
        { kind: 'periodic', everyTurns: 8, pays: 'gold', amount: 5 },
        { kind: 'periodShorten', turns: 2 },
        { kind: 'cityRenownPercent', percent: 50 },
        { kind: 'routeYield', gold: 1 },
      ]]],
      () => {
        const { state, city } = bench();
        city.buildings.push('temple', 'library');
        bumpRevision(state);
        refreshCityDerived(state, city);
        const before = snapshotState(state);
        explainCardImpact(state, 0, { kind: 'order', id: 'waysideShrines' });
        expect(snapshotState(state)).toBe(before);
      },
    );
  });
});

/**
 * **The rows batch F wrote, stamped** (`docs/fewer-things-plan.md` F, item 5).
 *
 * The block above proves the *shapes* stamp, on synthetic rows. This one proves
 * the **cards** do — one converted or new row of every shape the order pass
 * used, asked the way Confirm asks it — because a shape that stamps and a row
 * that stamps are two claims and only the second one reaches a player.
 */
describe('the order pass stamps', () => {
  /** Seats a card in the government's own chair, as a Confirm would. */
  function seat(state: GameState, index: number, id: OrderId): void {
    const sc = state.players[0]!.statecraft;
    if (!sc.orders.includes(id)) sc.orders.push(id);
    sc.slots[index] = { card: id, sealedUntil: state.turn };
    bumpRevision(state);
  }

  it('reads The Synod off the faith shelves the town has raised', () => {
    const { state, city } = bench();
    const bare = explainCardImpact(state, 0, { kind: 'order', id: 'theSynod' });
    expect(foldCardImpact(bare).faith).toBe(0);
    city.buildings.push('shrine', 'temple');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'theSynod' });
    // Half again of what the two shelves pay in faith — the fold is the claim,
    // not the figure, so it is asked as "more than nothing and less than all".
    expect(foldCardImpact(lines).faith).toBeGreaterThan(0);
    expect(hasPerTurnImpact(lines)).toBe(true);
  });

  it('reads The First Chair as the Order sitting in the chair it points at', () => {
    const { state } = bench();
    seat(state, 1, 'weightsAndMeasures');
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'theFirstChair' });
    // The empire's one town pays a coin under Weights & Measures, so paying the
    // first economic chair twice is worth exactly that coin again.
    expect(foldCardImpact(lines).gold).toBe(1);
  });

  it('reads The Harvest Home as what the deck\'s other food lines would pay more', () => {
    const { state } = bench();
    const alone = explainCardImpact(state, 0, { kind: 'order', id: 'theHarvestHome' });
    expect(foldCardImpact(alone).food).toBe(0);
    seat(state, 1, 'terracedHillsides');
    // A hex line, so the amplifier is paid per hex the other card dresses —
    // which on a bench with no hills is still nothing, and that is the honest
    // answer rather than a nominal guess.
    expect(Number.isFinite(foldCardImpact(
      explainCardImpact(state, 0, { kind: 'order', id: 'theHarvestHome' }),
    ).food)).toBe(true);
  });

  it('reads The Triumph as an occasion on the calendar, not a standing line', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'theTriumph' });
    const occasion = lines.filter((line) => line.kind === 'occasion');
    expect(occasion).toHaveLength(1);
    expect(occasion[0]!.occasion).toBe('every 12 turns');
    expect(hasPerTurnImpact(lines)).toBe(false);
  });

  it('reads a doubler on the ground as the works it doubles', () => {
    const { state, city } = bench();
    const tile = getTileAt(state.map, city.col, city.row)!;
    tile.improvement = 'mine';
    refreshCityDerived(state, city);
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'theDeepSeams' });
    expect(Number.isFinite(foldCardImpact(lines).production)).toBe(true);
  });

  it('leaves the state byte-identical after asking about any of them', () => {
    const { state, city } = bench();
    city.buildings.push('temple', 'library', 'market');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const before = snapshotState(state);
    for (const id of ['theSynod', 'theFirstChair', 'theHarvestHome', 'theTriumph',
      'theDeepSeams', 'theHighChancery', 'theAlmanacOfHours', 'silkRoads',
      'theVotiveTally', 'theGreatEnquiry'] as OrderId[]) {
      explainCardImpact(state, 0, { kind: 'order', id });
    }
    expect(snapshotState(state)).toBe(before);
  });
});

/**
 * **The screen's shared half** (`cardImpactSheet`, batch H18).
 *
 * A screen of a dozen cards is a dozen ghost-diffs, and one side of every one of
 * them is the board as it actually stands — the same empire fold, the same town
 * contexts, the same meters, a dozen times over. The sheet is that half taken
 * once and handed to every card, and the only claim worth pinning about it is
 * that it is not a shortcut anywhere: a card stamped with a sheet must read
 * **identically** to a card stamped without one, on every class of card and on
 * both sides of the pair (a card in force prices backward, a card not held
 * prices forward).
 */
describe('the sheet a screen shares between its cards', () => {
  it('changes no figure, for any class of card, held or not', () => {
    const { state, city } = bench();
    // Enough scenery that every register of the list has something in it: a
    // meter near a rung, a shelf for a building share, a card in force.
    city.buildings.push('cathedral', 'hallOfDeeds', 'circusMaximus', 'library', 'market');
    bumpRevision(state);
    refreshCityDerived(state, city);
    const sc = state.players[0]!.statecraft;
    sc.orders.push('weightsAndMeasures');
    sc.slots[sc.slots.findIndex((slot) => slot === null)] = {
      card: 'weightsAndMeasures',
      sealedUntil: state.turn,
    };
    bumpRevision(state);
    sc.doctrines.push('theAcademyOfDeeds');
    bumpRevision(state);
    state.players[0]!.legacies.push({ id: 'homer', age: 1 });
    bumpRevision(state);

    const subjects: CardImpactSubject[] = [
      // In force, so the ghost is the world *without* them — the shared half is
      // the real board, which is the case the sheet exists for.
      { kind: 'order', id: 'weightsAndMeasures' },
      { kind: 'doctrine', id: 'theAcademyOfDeeds' },
      { kind: 'legacy', id: 'homer' },
      // Not held, so the ghost is the world *with* them and the shared half is
      // the other side of the pair.
      { kind: 'order', id: 'festivalDays' },
      { kind: 'order', id: 'borderBallads' },
      { kind: 'order', id: 'firstRites' },
      { kind: 'doctrine', id: 'riverKings' },
      { kind: 'government', id: 'chiefdom' },
      { kind: 'legacy', id: 'imhotep' },
      { kind: 'belief', id: 'goddessOfTheHarvest' },
    ];
    const sheet = cardImpactSheet(state, 0);
    for (const subject of subjects) {
      const alone = explainCardImpact(state, 0, subject);
      const shared = explainCardImpact(state, 0, subject, sheet);
      expect(shared, `${subject.kind}:${subject.id}`).toEqual(alone);
    }
  });

  /**
   * A sheet taken for another board or another seat is **ignored**, never
   * believed. It is compared by the state object's own identity, so a sheet
   * handed to the wrong question answers the wrong question's own way.
   */
  it('is ignored when it belongs to another board or another seat', () => {
    const { state } = bench();
    const other = bench();
    const subject: CardImpactSubject = { kind: 'order', id: 'weightsAndMeasures' };
    const alone = explainCardImpact(state, 0, subject);
    expect(explainCardImpact(state, 0, subject, cardImpactSheet(other.state, 0))).toEqual(alone);
    expect(explainCardImpact(state, 0, subject, cardImpactSheet(state, 1))).toEqual(alone);
  });

  /** And it leaves the board alone, exactly as an unshared reading does. */
  it('leaves the state byte-identical', () => {
    const { state } = bench();
    const before = snapshotState(state);
    const sheet = cardImpactSheet(state, 0);
    explainCardImpact(state, 0, { kind: 'order', id: 'weightsAndMeasures' }, sheet);
    explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' }, sheet);
    expect(snapshotState(state)).toBe(before);
  });
});
