import { afterEach, describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { LIVE_RITE_IDS } from '../../src/sim/religionData';
import {
  type City,
  type GameState,
  bumpRevision,
  citiesOf,
  playerById,
} from '../../src/sim/state';
import {
  type CardEffect,
  type CardPaysEffect,
  type CityScope,
  type OrderId,
  ORDER_IDS,
  orderDef,
} from '../../src/sim/statecraftData';
import {
  anyCardDef,
  cityScopeAdmits,
  countOf,
  describeCard,
  explainBuildingPackage,
  explainCardCityYields,
  foldBuildingPackage,
  stripRefs,
} from '../../src/sim/statecraft';
import { TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { explainCardBuildingYields, explainCity, foldCity } from '../../src/sim/yields/town';
import { found, game } from './statecraftHelpers';

/**
 * **Batch R2b: a building's package, and the buildings that supply a yield**
 * (`docs/plans/devotion-review-2026-10-28.md`).
 *
 * The user, 2026-10-28: *"a card that says 'double the yields on temples'
 * paired with a card that says '+2 science on temples' should supply +4
 * science."* A building's package is its row plus every line a card or a
 * luxury puts on it in the town (`explainBuildingPackage`). Step 9's shares are
 * taken over it, a building supplies a voice when its category is that voice
 * or its package pays it, and the `buildingsSupplying` count reads that.
 *
 * The cards here are real Order rows wearing effects the test chooses, put
 * back after each test. The luxury half is in `resourceEffects.test.ts`, beside
 * the luxury benches.
 */

/** Effects swapped onto a row, to put back after the test. */
const restores: (() => void)[] = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()!();
});

/** The Orders the tests dress, in table order. */
const CARD_A = ORDER_IDS[0]!;
const CARD_B = ORDER_IDS[1]!;

/** Puts an Order in a chair, wearing effects of the test's choosing. */
function seat(state: GameState, id: OrderId, effects: CardEffect[]): void {
  const def = orderDef(id) as { effects: CardEffect[] };
  const held = def.effects;
  def.effects = effects;
  restores.push(() => {
    def.effects = held;
  });
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** A bench town that holds these buildings. */
function town(...buildings: string[]): { state: GameState; city: City } {
  const g = game(905);
  const city = found(g.state, 0);
  for (const id of buildings) city.buildings.push(id as never);
  bumpRevision(g.state);
  return { state: g.state, city };
}

/** "Double the yields on temples". */
const DOUBLE_TEMPLES: CardEffect = { kind: 'buildingYieldPercent', building: 'temple', percent: 100 };

/** "+2 science on temples", written by scope. */
const SCIENCE_BY_SCOPE: CardEffect = {
  kind: 'pays',
  where: 'city',
  science: 2,
  scope: { test: 'hasBuilding', building: 'temple' },
};

/** "+2 science on temples", written by count: two for each Temple in the town. */
const SCIENCE_BY_COUNT: CardEffect = {
  kind: 'pays',
  where: 'city',
  basis: 'count',
  count: 'buildingsOfKind',
  building: 'temple',
  within: 'city',
  to: 'science',
  amount: 2,
};

/** The card lines in a building's package, summed: the package without its row. */
function cardLinesOn(state: GameState, city: City, id: string): Record<string, number> {
  return foldBuildingPackage(
    explainBuildingPackage(state, city, id as never).filter((line) => line.card !== undefined),
  );
}

/** How many buildings in this town supply this voice. */
function suppliers(state: GameState, city: City, voice: CardPaysEffect['voice']): number {
  const probe: CardPaysEffect = {
    kind: 'pays',
    where: 'city',
    basis: 'count',
    count: 'buildingsSupplying',
    voice,
    within: 'city',
  };
  return countOf(state, 0, CARD_A, probe, city);
}

describe('a building’s package', () => {
  it('holds the row, with the per-citizen science taken at the town’s size', () => {
    const { state, city } = town('library');
    city.population = 4;
    bumpRevision(state);
    const lines = explainBuildingPackage(state, city, 'library');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.building).toBe('library');
    const row = buildingDef('library');
    expect(foldBuildingPackage(lines).science).toBe(row.science + 4 * row.sciencePerPop);
  });

  it('gives +4 science for a doubler on temples beside “+2 science on temples”, written by scope', () => {
    const { state, city } = town('temple');
    const before = explainCity(state, city).flats.science;
    seat(state, CARD_A, [DOUBLE_TEMPLES]);
    // The doubler alone has no science to double: the Temple's row pays none.
    expect(explainCity(state, city).flats.science).toBe(before);
    seat(state, CARD_B, [SCIENCE_BY_SCOPE]);

    // The line is on the Temple, as the card's own line.
    expect(cardLinesOn(state, city, 'temple').science).toBe(2);
    // It banks once, at step 3, and the doubler takes its share over it at step 9.
    const banked = explainCardCityYields(state, city).filter((line) => line.card === CARD_B);
    expect(banked.reduce((sum, line) => sum + line.science, 0)).toBe(2);
    const doubled = explainCardBuildingYields(state, city).find((line) => line.card === CARD_A)!;
    expect(doubled.science).toBe(2);
    expect(explainCity(state, city).flats.science - before).toBe(4);
  });

  it('gives the same +4 science when the line is written as a count of Temples in the town', () => {
    const { state, city } = town('temple');
    const before = explainCity(state, city).flats.science;
    seat(state, CARD_A, [DOUBLE_TEMPLES]);
    seat(state, CARD_B, [SCIENCE_BY_COUNT]);
    expect(cardLinesOn(state, city, 'temple').science).toBe(2);
    const doubled = explainCardBuildingYields(state, city).find((line) => line.card === CARD_A)!;
    expect(doubled.science).toBe(2);
    expect(explainCity(state, city).flats.science - before).toBe(4);
  });

  it('puts a line counted by category on each building of that category, one helping each', () => {
    const { state, city } = town('shrine', 'temple', 'library');
    seat(state, CARD_B, [
      {
        kind: 'pays',
        where: 'city',
        basis: 'count',
        count: 'buildingsOfCategory',
        category: 'faith',
        within: 'city',
        to: 'culture',
        amount: 1,
      },
    ]);
    expect(cardLinesOn(state, city, 'shrine').culture).toBe(1);
    expect(cardLinesOn(state, city, 'temple').culture).toBe(1);
    // The Library is a science building: no helping is on it.
    expect(cardLinesOn(state, city, 'library').culture).toBe(0);
    // The town still banks the whole line once.
    const banked = explainCardCityYields(state, city).filter((line) => line.card === CARD_B);
    expect(banked.reduce((sum, line) => sum + line.culture, 0)).toBe(2);

    // A doubler on temples doubles the Temple's helping and not the Shrine's.
    seat(state, CARD_A, [DOUBLE_TEMPLES]);
    const doubled = explainCardBuildingYields(state, city).find((line) => line.card === CARD_A)!;
    expect(doubled.culture).toBe(1);
  });

  it('leaves a rite’s line out of the package, and the town still banks it', () => {
    const { state, city } = town('temple');
    const rite = LIVE_RITE_IDS[0]!;
    city.timed = [{ card: rite, effect: SCIENCE_BY_SCOPE, expiresTurn: state.turn + 10 }];
    bumpRevision(state);
    expect(cardLinesOn(state, city, 'temple').science).toBe(0);
    const banked = explainCardCityYields(state, city).filter((line) => line.card === rite);
    expect(banked.reduce((sum, line) => sum + line.science, 0)).toBe(2);
    // So a doubler on temples has no science to double.
    seat(state, CARD_A, [DOUBLE_TEMPLES]);
    const doubled = explainCardBuildingYields(state, city).find((line) => line.card === CARD_A)!;
    expect(doubled.science).toBe(0);
  });

  it('keeps a technology’s line in the package', () => {
    const { state, city } = town('temple');
    const player = playerById(state, 0)!;
    // A technology the seat does not know and whose row carries no effects, so
    // the line below is the whole of what it adds.
    const tech = TECH_IDS.find(
      (id) => !player.techsResearched.includes(id) && (techDef(id).effects ?? []).length === 0,
    ) as TechId;
    // The evaluator keeps one adapted copy of each card's row, shared across
    // every test in the worker (`anyCardDef`'s cache). So the line goes on the
    // row and on that copy, and both are put back exactly. Changing the row
    // alone left the copy holding the line, and the snapshot of every card's
    // words, run later in the same worker, printed it.
    const def = techDef(tech) as { effects?: CardEffect[] };
    const card = anyCardDef(tech) as { effects: readonly CardEffect[] };
    const held = def.effects;
    const cardHeld = card.effects;
    def.effects = [SCIENCE_BY_SCOPE];
    card.effects = [SCIENCE_BY_SCOPE];
    restores.push(() => {
      if (held === undefined) delete def.effects;
      else def.effects = held;
      card.effects = cardHeld;
    });
    player.techsResearched.push(tech);
    bumpRevision(state);
    const onIt = explainBuildingPackage(state, city, 'temple').filter((line) => line.card === tech);
    expect(onIt).toHaveLength(1);
    expect(onIt[0]!.science).toBe(2);
  });

  it('counts a conditional line only while its condition holds', () => {
    const { state, city } = town('temple');
    const scope: CityScope = {
      test: 'all',
      of: [
        { test: 'hasBuilding', building: 'temple' },
        { test: 'populationAtLeast', value: 5 },
      ],
    };
    seat(state, CARD_B, [{ kind: 'pays', where: 'city', science: 2, scope }]);
    seat(state, CARD_A, [DOUBLE_TEMPLES]);
    city.population = 1;
    bumpRevision(state);
    expect(cardLinesOn(state, city, 'temple').science).toBe(0);
    expect(explainCardBuildingYields(state, city).find((l) => l.card === CARD_A)!.science).toBe(0);
    city.population = 5;
    bumpRevision(state);
    expect(cardLinesOn(state, city, 'temple').science).toBe(2);
    expect(explainCardBuildingYields(state, city).find((l) => l.card === CARD_A)!.science).toBe(2);
  });

  it('carries only its row for a building the town does not hold', () => {
    const { state, city } = town();
    seat(state, CARD_B, [SCIENCE_BY_SCOPE]);
    const lines = explainBuildingPackage(state, city, 'temple');
    expect(lines.map((line) => line.building)).toEqual(['temple']);
  });
});

describe('the buildings that supply a yield', () => {
  it('counts a faith building with no faith of its own as supplying faith', () => {
    // The Almshouse is a faith building whose row pays culture and no faith.
    expect(buildingDef('almshouse').category).toBe('faith');
    expect(buildingDef('almshouse').faith ?? 0).toBe(0);
    const { state, city } = town('almshouse');
    expect(suppliers(state, city, 'faith')).toBe(1);
    expect(
      cityScopeAdmits(state, city, { test: 'hasBuildingYielding', yields: 'faith' }, 0),
    ).toBe(true);
  });

  it('counts the buildings in a town that supply a yield, and a building a card makes pay it', () => {
    const { state, city } = town('shrine', 'temple', 'library');
    const before = suppliers(state, city, 'faith');
    // The Shrine and the Temple, and whatever the new town already held.
    expect(before).toBeGreaterThanOrEqual(2);
    expect(suppliers(state, city, 'science')).toBeGreaterThanOrEqual(1);
    // A card that puts faith on the Library makes it supply faith too.
    seat(state, CARD_B, [
      { kind: 'pays', where: 'city', faith: 1, scope: { test: 'hasBuilding', building: 'library' } },
    ]);
    expect(suppliers(state, city, 'faith')).toBe(before + 1);
    // A rite's line does not: it is on no building.
    const goldBefore = suppliers(state, city, 'gold');
    const rite = LIVE_RITE_IDS[0]!;
    city.timed = [
      {
        card: rite,
        effect: { kind: 'pays', where: 'city', gold: 3, scope: { test: 'hasBuilding', building: 'shrine' } },
        expiresTurn: state.turn + 10,
      },
    ];
    bumpRevision(state);
    expect(suppliers(state, city, 'gold')).toBe(goldBefore);
  });

  it('counts across the realm without `within`', () => {
    const { state, city } = town('shrine', 'temple');
    // A second town of the seat's, some hexes away, with one faith building.
    const far = state.map.tiles.find(
      (tile) =>
        Math.abs(tile.col - city.col) >= 5 &&
        Math.abs(tile.row - city.row) <= 2 &&
        tile.terrain !== 'ocean' &&
        tile.terrain !== 'coast' &&
        tile.terrain !== 'lake' &&
        tile.terrain !== 'mountain',
    )!;
    const second = foundCityAt(state, 0, getTileAt(state.map, far.col, far.row)!);
    second.buildings.push('shrine');
    bumpRevision(state);
    const empire: CardPaysEffect = {
      kind: 'pays',
      where: 'empire',
      basis: 'count',
      count: 'buildingsSupplying',
      voice: 'faith',
    };
    const each = citiesOf(state, 0).map((one) => suppliers(state, one, 'faith'));
    expect(each.length).toBe(2);
    expect(countOf(state, 0, CARD_A, empire)).toBe(each[0]! + each[1]!);
    // A row that names no voice counts nothing.
    expect(countOf(state, 0, CARD_A, { ...empire, voice: undefined })).toBe(0);
  });

  it('pays a line counted per supplier, and says so in plain words', () => {
    const { state, city } = town('shrine', 'temple');
    const line: CardEffect = {
      kind: 'pays',
      where: 'city',
      basis: 'count',
      count: 'buildingsSupplying',
      voice: 'faith',
      within: 'city',
      to: 'science',
      amount: 2,
    };
    seat(state, CARD_B, [line]);
    const paid = explainCardCityYields(state, city).filter((one) => one.card === CARD_B);
    expect(paid.reduce((sum, one) => sum + one.science, 0)).toBe(2 * suppliers(state, city, 'faith'));
    expect(describeCard(CARD_B).map((clause) => stripRefs(clause.text))).toEqual([
      '+2 science in every city per building there that supplies faith',
    ]);
  });

  it('ends a line whose scope asks which buildings supply the voice it pays', () => {
    // "+1 faith on the Library in a town with a building that supplies faith":
    // reading the Library's package asks the scope, the scope asks whether a
    // building supplies faith, and that asks the Library's package again. The
    // depth guard answers the second question from the rows alone.
    const scope: CityScope = {
      test: 'all',
      of: [
        { test: 'hasBuilding', building: 'library' },
        { test: 'hasBuildingYielding', yields: 'faith' },
      ],
    };
    const { state, city } = town('library');
    seat(state, CARD_B, [{ kind: 'pays', where: 'city', faith: 1, scope }]);
    const before = suppliers(state, city, 'faith');
    // No faith building, so the line is on nothing and the Library supplies none.
    expect(cardLinesOn(state, city, 'library').faith).toBe(0);
    city.buildings.push('temple');
    bumpRevision(state);
    expect(cardLinesOn(state, city, 'library').faith).toBe(1);
    // The Temple and now the Library.
    expect(suppliers(state, city, 'faith')).toBe(before + 2);
  });

  it('lets Hero of Alexandria’s scope admit a wonder a card makes supply science', () => {
    // The scope Hero of Alexandria's legacy was written on: a town holding a
    // wonder that supplies science (`greatPeople.test.ts` keeps the scope's
    // first test). The Oracle is a faith wonder and pays no science.
    const { state, city } = town('theOracle');
    const scope: CityScope = { test: 'hasBuildingYielding', yields: 'science', wonder: true };
    playerById(state, 0)!.timed = [
      {
        card: 'heroOfAlexandria',
        effect: { kind: 'pays', where: 'city', production: 5, scope },
        expiresTurn: state.turn + 10,
      },
    ];
    bumpRevision(state);
    expect(cityScopeAdmits(state, city, scope, 0)).toBe(false);
    const bare = foldCity(state, city).production;
    // A card puts science on the Oracle, so it supplies science.
    seat(state, CARD_B, [
      { kind: 'pays', where: 'city', science: 1, scope: { test: 'hasBuilding', building: 'theOracle' } },
    ]);
    expect(cityScopeAdmits(state, city, scope, 0)).toBe(true);
    expect(foldCity(state, city).production).toBeGreaterThan(bare);
  });
});
