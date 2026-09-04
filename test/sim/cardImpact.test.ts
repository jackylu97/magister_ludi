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
  explainCardImpact,
  foldCardImpact,
  foldCardOccasions,
  hasPerTurnImpact,
} from '../../src/sim/cardImpact';
import {
  type CityYields,
  cityQuote,
  cityYields,
  emptyCityYields,
  foundCityAt,
  refreshCityDerived,
} from '../../src/sim/cities';
import { explainEmpireCardYields } from '../../src/sim/cities';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { empireResourceYields } from '../../src/sim/resourceEffects';
import { explainEmpireGold } from '../../src/sim/empireGold';
import { found, game } from './statecraftHelpers';
import { getTileAt } from '../../src/sim/map';
import { isCoastal } from '../../src/sim/water';
import { terrainDef } from '../../src/sim/terrainData';
import type { GameState } from '../../src/sim/state';

/**
 * Everything one empire banks in a turn, read **independently of the module
 * under test**: every town's own fold, plus the three empire-scale folds
 * `collectYields` banks beside them.
 *
 * Deliberately a second implementation *in the test*, which is the one place a
 * second implementation is worth having: it is what makes "the stamp is the
 * difference the turn resolution would see" an assertion rather than a comment.
 */
function ledger(state: GameState, playerId: number): CityYields {
  const total = emptyCityYields();
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = cityYields(state, city, [], city.queue[0], cityQuote(state, city));
    for (const key of CITY_YIELD_KEYS) total[key] += yields[key];
  }
  for (const line of explainEmpireCardYields(state, playerId)) {
    for (const key of CITY_YIELD_KEYS) total[key] += line[key];
  }
  for (const line of empireResourceYields(state, playerId)) {
    for (const key of CITY_YIELD_KEYS) total[key] += line[key];
  }
  for (const line of explainEmpireGold(state, playerId)) total.gold += line.gold;
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
   * Thalassocracy mints a tenth of a coastal town's food as coin — a share of a
   * *fold*, taken inside `cityQuote` and therefore invisible to any list of
   * flats. It has to reach the stamp, and it does, through the same
   * reconciliation the percentages take.
   */
  it('reaches the stamp through the town it lands in', () => {
    const made = game();
    coastalTown(made.state);
    const lines = explainCardImpact(made.state, 0, { kind: 'doctrine', id: 'thalassocracy' });
    expect(foldCardImpact(lines).gold).toBeGreaterThan(0);
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
    // Scenery: three houses of contentment, so the empire sits just below the
    // tier rather than far under it. The card is the subject, not the buildings.
    city.buildings.push('funeralGames', 'baths', 'circusMaximus');
    refreshCityDerived(state, city);
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' });
    const knock = lines.filter((line) => line.kind === 'knockOn');
    expect(knock).toHaveLength(1);
    expect(knock[0]!.source).toBe('Happiness');
    expect(knock[0]!.meter).toBe('happiness');
    expect(knock[0]!.science).toBeGreaterThan(0);
    // And nothing pretends the card paid a beaker itself.
    expect(lines.filter((line) => line.kind === 'city')).toEqual([]);
  });

  /** An empire nowhere near a rung gains nothing, and says nothing. */
  it('is silent when no tier moves', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'festivalDays' });
    expect(lines.filter((line) => line.kind === 'knockOn')).toEqual([]);
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
    expect(foldCardImpact(lines)).toEqual(emptyCityYields());
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

  /** Provincial Governors pays the writ. Same shape, the other meter. */
  it('reports the card\'s own authority as its own line', () => {
    const { state } = bench();
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'provincialGovernors' });
    const meters = lines.filter((line) => line.kind === 'meter');
    expect(meters).toHaveLength(1);
    expect(meters[0]!.meter).toBe('authority');
    expect(meters[0]!.source).toBe('Authority');
    expect(meters[0]!.amount).toBe(3);
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
    refreshCityDerived(state, city);
    const lines = explainCardImpact(state, 0, { kind: 'order', id: 'theChoir' });
    const meters = lines.filter((line) => line.kind === 'meter');
    expect(meters).toHaveLength(1);
    expect(meters[0]!.meter).toBe('happiness');
    expect(meters[0]!.amount).toBe(1);
    expect(foldCardImpact(lines).culture).toBe(1);
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
    city.buildings.push('funeralGames', 'baths', 'circusMaximus');
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
    // Held and slotted, so the reading is what taking it *out* would cost —
    // the same figure with the same sign, which is the clause the ladder's
    // level argument used to sit beside (2026-09-04).
    const held = explainCardImpact(state, 0, { kind: 'order', id: 'firstRites' });
    expect(foldCardImpact(held).faith).toBe(2);
  });
});
