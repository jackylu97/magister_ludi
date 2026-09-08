/**
 * Maintenance: what an empire pays for what it has, and what happens when it
 * cannot (the user's rulings, 2026-08-28).
 *
 * Six separable claims are defended here and they are kept apart because they
 * fail for different reasons:
 *
 *   1. **The price is the age**, read off the tree rather than off the roster —
 *      so a designer moving the swordsman to a different node moves its upkeep
 *      with it and nobody has to remember to come back;
 *   2. **The exemptions are three readings and a marker.** A civilian, an
 *      explorer and a trader are exempt by *type*; a piece nobody paid for is
 *      exempt by `Unit.freeUpkeep`, which is written at five seams and — the
 *      load-bearing half — is *not* written by a completion or a purchase;
 *   3. **The ledger is one fold of four lines** (rule 5). `explainEmpireGold` is
 *      what the treasury moves by, and the two per-item lists are what a hover
 *      prints;
 *   4. **The palace is a line**, in the capital and nowhere else;
 *   5. **Debt is an Entry XVII line, not a multiplication.** The −25% joins
 *      `cityYieldPercents` at the empire stage so it *sums* with a meter tier
 *      before one rounding;
 *   6. **The creditors take one piece a turn**, the dearest first, and never
 *      from the wild.
 *
 * The pacing half — what all this does to a treasury over sixty turns — is
 * measured in `upkeep.slow.test.ts`, because it is a scripted empire and that is
 * slow by kind.
 */
import { describe, expect, it } from 'vitest';

import {
  foundCityAt,
  realiseItem,
} from '../../src/sim/cities';
import {
  cityYieldPercents,
  explainCity,
  explainPalaceYield,
  foldCity,
} from '../../src/sim/yields/town';
import {
  collectYields,
} from '../../src/sim/yields/empire';
import { applyCommand } from '../../src/sim/commands';
import { type Game, createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { RULES } from '../../src/sim/rulesData';
import {
  type GameState,
  barbarianPlayer,
  captureUnit,
  createUnit,
  unitById,
  bumpRevision,
} from '../../src/sim/state';
import { empireGold, explainEmpireGold } from '../../src/sim/trade';
import { emptyTurnReport, runEndOfTurn } from '../../src/sim/turn';
import { unitDef } from '../../src/sim/unitData';
import {
  buildingUpkeep,
  disbandCandidate,
  explainBuildingUpkeep,
  explainUnitUpkeep,
  explainUnitUpkeepRebate,
  explainUnitUpkeepSurcharge,
  treasuryInDebt,
  unitUpkeep,
  unitUpkeepOf,
} from '../../src/sim/upkeep';
import { at, bareState } from './improvementHelpers';

const UPKEEP = RULES.upkeep;

/** A blank world with one player-0 city at (5, 5). */
function world(): { state: GameState; city: ReturnType<typeof foundCityAt> } {
  const state = bareState();
  const city = foundCityAt(state, 0, at(state, 5, 5));
  return { state, city };
}

// --- the price --------------------------------------------------------------

describe('what a unit costs to keep', () => {
  it('is the age of the technology that unlocks it', () => {
    // The ruling's own examples, re-read against the re-cut of 2026-09-02:
    // Agriculture (I), Wayfinding (II), Bronze Panoply (II — the swordsman is
    // bronze now), Iron Working (III), Chivalry (IV). The **rule** never moved —
    // upkeep is the age of the node that unlocks the row — and every number here
    // moved with the tree, which is the rule working.
    expect(unitUpkeep('warrior')).toBe(1);
    expect(unitUpkeep('bireme')).toBe(2);
    expect(unitUpkeep('swordsman')).toBe(2);
    expect(unitUpkeep('legionary')).toBe(3);
    expect(unitUpkeep('knight')).toBe(4);
    // And the rate is the rule rather than a table of prices: every combat row
    // is exactly its node's age.
    expect(unitUpkeep('spearman')).toBe(1 * UPKEEP.goldPerUnitAge);
    expect(unitUpkeep('phalanx')).toBe(2 * UPKEEP.goldPerUnitAge);
    expect(unitUpkeep('catapult')).toBe(3 * UPKEEP.goldPerUnitAge);
    expect(unitUpkeep('trebuchet')).toBe(4 * UPKEEP.goldPerUnitAge);
  });

  it('exempts every non-combatant, the explorer and the trader', () => {
    // Three different sentences, and none of them collapses into the others.
    for (const type of ['settler', 'worker', 'augur', 'prophet', 'greatPerson'] as const) {
      expect(unitUpkeep(type)).toBe(0);
    }
    // The scout is the one the *code's* reading and the *ruling's* reading
    // disagree about: it carries five strength, so `isCombatant` calls it a
    // soldier, and the ruling lists it among the civilians. `isExplorer` is the
    // tiebreak, and it has to be — the opening kit is a settler and a scout, and
    // an empire that opened one gold in the red every game would be a rule
    // nobody meant to write.
    expect(unitDef('scout').combatStrength).toBeGreaterThan(0);
    expect(unitUpkeep('scout')).toBe(0);
    // The caravan is the thing that *pays*.
    expect(unitUpkeep('trader')).toBe(0);
  });

  it('exempts a piece the empire never paid for, whatever its type', () => {
    const { state } = world();
    const bought = createUnit(state, 0, 'warrior', 5, 4);
    const gift = createUnit(state, 0, 'warrior', 5, 3);
    gift.freeUpkeep = true;
    expect(unitUpkeepOf(bought)).toBe(1);
    expect(unitUpkeepOf(gift)).toBe(0);
  });
});

describe('what a building costs to keep', () => {
  it('is the age of its unlocking tech, for the rows that pay renown', () => {
    // The ruling's list, in full — it is exactly the set of rows that feed the
    // renown bucket, which is the set of rows that are *institutions*.
    expect(buildingUpkeep('barracks')).toBe(1);
    expect(buildingUpkeep('library')).toBe(1);
    // Re-read against the four-age tree of 2026-08-30: the market is a Heroes
    // institution now, the workshop and the university are Empire ones, and the
    // printing house is the first Cathedrals row to draw a wage.
    expect(buildingUpkeep('market')).toBe(2);
    // The bazaar moved to Paper Money (Æra III) with the re-cut of 2026-09-02.
    // Paper Money is Æra IV since revision 4.2 (the user's column ruling).
    expect(buildingUpkeep('bazaar')).toBe(4);
    expect(buildingUpkeep('workshop')).toBe(3);
    expect(buildingUpkeep('watermill')).toBe(3);
    expect(buildingUpkeep('amphitheater')).toBe(2);
    // Scholarship is Æra IV since revision 4.2, and the university with it.
    expect(buildingUpkeep('university')).toBe(4);
    expect(buildingUpkeep('printingHouse')).toBe(4);
  });

  it('charges nothing for a monument, a granary or a wonder', () => {
    // No `renown` on the row: a thing you built once, not a payroll.
    expect(buildingUpkeep('monument')).toBe(0);
    expect(buildingUpkeep('granary')).toBe(0);
    expect(buildingUpkeep('palisade')).toBe(0);
    expect(buildingUpkeep('temple')).toBe(0);
    // A wonder pays renown by the same field and is exempt anyway — the
    // orchestrator's decision, and the one line that carries it.
    expect(buildingUpkeep('pyramids')).toBe(0);
    expect(buildingUpkeep('greatLibrary')).toBe(0);
  });
});

// --- the marker -------------------------------------------------------------

describe('the free-upkeep marker', () => {
  it('is set by capture, and stays set', () => {
    const { state } = world();
    const taken = createUnit(state, 1, 'warrior', 6, 5);
    expect(taken.freeUpkeep).toBeUndefined();
    captureUnit(state, taken, 0);
    expect(taken.freeUpkeep).toBe(true);
    expect(unitUpkeepOf(taken)).toBe(0);
    // Taken back: still nobody's purchase. The mark is about the piece's
    // history, not about who holds it now.
    captureUnit(state, taken, 1);
    expect(taken.freeUpkeep).toBe(true);
  });

  it('is set by a gift and never by a completion', () => {
    const { state, city } = world();
    const tile = at(state, 5, 5);
    // The windfall path's call, verbatim: `realiseItem(…, { free: true })`.
    const gifted = realiseItem(state, city, { kind: 'unit', id: 'warrior', tile }, { free: true });
    // The completion path's call — the same routine, no options.
    const built = realiseItem(state, city, { kind: 'unit', id: 'warrior', tile });
    expect(unitById(state, gifted.unitId!)!.freeUpkeep).toBe(true);
    expect(unitById(state, built.unitId!)!.freeUpkeep).toBeUndefined();
  });

  it('is written at every seam that issues a piece for free', () => {
    // A source-reading register, for the property no behavioural test would
    // catch losing: a *sixth* way to hand a unit over would silently start
    // charging rent on it. `state.ts` is `captureUnit`, `cities.ts` is
    // `realiseItem` and the wonder grants, `discoveries.ts` is the ruin's
    // escort, `greatPeople.ts` is the called person.
    const modules = import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const writers = Object.entries(modules)
      .filter(([, text]) => /freeUpkeep\s*=\s*true/.test(text))
      .map(([path]) => path.slice(path.indexOf('/sim/') + '/sim/'.length))
      .sort();
    expect(writers).toEqual(['cities.ts', 'discoveries.ts', 'greatPeople.ts', 'state.ts']);
  });

  it('is set by a wonder’s completion grant', () => {
    // The Statue of Zeus' swordsman, taken through the routine that pays it:
    // `realiseItem` on the building, which claims the wonder and hands over
    // what its row grants.
    const { state, city } = world();
    const before = state.units.length;
    realiseItem(state, city, { kind: 'building', id: 'statueOfZeus' });
    const born = state.units.slice(before);
    expect(born.length).toBeGreaterThan(0);
    for (const unit of born) expect(unit.freeUpkeep).toBe(true);
    expect(explainUnitUpkeep(state, 0)).toEqual([]);
  });
});

// --- the ledger -------------------------------------------------------------

describe('the empire ledger', () => {
  it('lists one line per piece and per building, omitting the exempt', () => {
    const { state, city } = world();
    createUnit(state, 0, 'warrior', 5, 4);
    createUnit(state, 0, 'swordsman', 5, 3);
    createUnit(state, 0, 'worker', 5, 6);
    const free = createUnit(state, 0, 'knight', 6, 6);
    free.freeUpkeep = true;
    city.buildings.push('library', 'market', 'granary');
    bumpRevision(state);

    expect(explainUnitUpkeep(state, 0).map((line) => [line.source, line.gold])).toEqual([
      ['Warrior', 1],
      ['Swordsman', 2],
    ]);
    expect(explainBuildingUpkeep(state, 0).map((line) => [line.source, line.gold])).toEqual([
      [`Library · ${city.name}`, 1],
      [`Market · ${city.name}`, 2],
    ]);
  });

  it('folds into four lines the treasury moves by', () => {
    const { state, city } = world();
    createUnit(state, 0, 'warrior', 5, 4);
    createUnit(state, 0, 'warrior', 5, 3);
    city.buildings.push('university');
    bumpRevision(state);

    // No roads and no connection in this world, so two of the four are absent —
    // which is the list's own rule: a line worth nothing is never printed.
    // Each line says which half of the treasury it is since batch H19
    // (`TradeGoldKind`): maintenance is a **bill**, and a bill is charged flat
    // where the empire's income lines take the empire stage.
    expect(explainEmpireGold(state, 0)).toEqual([
      { source: 'Unit maintenance · 2 units', gold: -2, kind: 'bill' },
      // Revision 4.2 re-aged this building's unlocking tech to Æra IV.
      { source: 'Building maintenance · 1 building', gold: -4, kind: 'bill' },
    ]);
  });

  it('charges the wild nothing', () => {
    const state = bareState();
    // `bareState` seats no wild (its config does not ask for one), so the second
    // seat is made one — which is all the rule reads: `Player.barbarian`.
    state.players[1]!.barbarian = true;
    expect(barbarianPlayer(state)).toBe(state.players[1]);
    const wild = state.players[1]!;
    createUnit(state, wild.id, 'warrior', 8, 8);
    createUnit(state, wild.id, 'swordsman', 8, 7);
    foundCityAt(state, wild.id, at(state, 8, 2)).buildings.push('barracks');
    bumpRevision(state);
    expect(explainUnitUpkeep(state, wild.id)).toEqual([]);
    expect(explainBuildingUpkeep(state, wild.id)).toEqual([]);
    expect(explainEmpireGold(state, wild.id)).toEqual([]);
    expect(disbandCandidate(state, wild.id)).toBeNull();
  });

  it('is what the phase actually banks', () => {
    const { state, city } = world();
    createUnit(state, 0, 'swordsman', 5, 4);
    city.buildings.push('market');
    bumpRevision(state);
    const player = state.players[0]!;
    player.gold = 100;

    const empire = explainEmpireGold(state, 0).reduce((sum, line) => sum + line.gold, 0);
    const towns = state.cities
      .filter((c) => c.ownerId === 0)
      .reduce((sum, c) => sum + foldCity(state, c, [], c.queue[0]).gold, 0);
    collectYields(state);
    expect(player.gold).toBe(100 + towns + empire);
  });
});

// --- what the law does to a payroll -----------------------------------------

/**
 * **A surcharge is a charge, and it lands in the one fold.**
 *
 * The Reckless Levy is *"+50% production toward units · every unit costs one
 * more coin to keep"* (the user's ruling of 2026-09-06), and until that day the
 * empire kept the hammers and paid nothing at all: the charge had no shape (the
 * flat per-piece vocabulary was give-backs only) and the percentage rule's one
 * reader opened its arm with `if (percent >= 0) return out;`, so a payroll a
 * card made dearer was read, folded and thrown away either way.
 *
 * Four claims, and they fail for different reasons: the **line** exists and is
 * labelled with the card that spoke; it is a coin **per piece the empire pays
 * for**, so an exempt piece is no dearer; the **treasury** actually moves by it;
 * and it **composes** with the give-back halves in the fold's stated order — the
 * army's price, then what the law added, then what the law forgives.
 */
describe('a levy on the payroll', () => {
  /** Puts an Order in a seat's hand and in a slot. Test scaffolding only. */
  function slot(state: GameState, playerId: number, id: string): void {
    const sc = state.players[playerId]!.statecraft;
    if (!sc.orders.includes(id as never)) sc.orders.push(id as never);
    sc.slots.push({ card: id as never, sealedUntil: state.turn });
    bumpRevision(state);
  }

  /**
   * A world with an army worth paying for, and the coin to pay it.
   *
   * **Mixed on purpose**: three warriors at a coin and a swordsman at two, so
   * the head count (4) and the payroll (5) are different numbers and a test
   * cannot pass by confusing "one per piece" with "one fifth of the bill". A
   * settler stands beside them, exempt, so "every unit" is read against the
   * pieces the empire actually pays for.
   */
  function army(): { state: GameState; gross: number; soldiers: number } {
    const { state } = world();
    for (let i = 0; i < 3; i++) createUnit(state, 0, 'warrior', 5, 4 - (i % 2));
    createUnit(state, 0, 'swordsman', 5, 6);
    createUnit(state, 0, 'settler', 5, 7);
    state.players[0]!.gold = 500;
    const paid = explainUnitUpkeep(state, 0);
    const gross = paid.reduce((sum, line) => sum + line.gold, 0);
    expect(gross).toBe(5);
    expect(paid).toHaveLength(4);
    return { state, gross, soldiers: paid.length };
  }

  it('charges a coin a soldier, as its own labelled line beside the charge', () => {
    const { state, gross, soldiers } = army();
    const before = explainEmpireGold(state, 0);
    expect(before.some((line) => line.source.includes('Reckless'))).toBe(false);

    slot(state, 0, 'theRecklessLevy');
    const after = explainEmpireGold(state, 0);
    // The gross is **untouched**: the per-piece list is what a hover prints and
    // what the creditors pick off, and a levy is not a fact about a warrior.
    expect(explainUnitUpkeep(state, 0).reduce((sum, line) => sum + line.gold, 0)).toBe(gross);
    expect(after.find((line) => line.source.startsWith('Unit maintenance'))?.gold).toBe(-gross);
    // **One coin per piece the empire pays for** — the head count, not a share
    // of the bill: four soldiers on a payroll of five is a charge of four, and
    // the settler standing with them is charged nothing.
    const levy = after.find((line) => line.source.includes('Reckless'));
    expect(levy?.gold).toBe(-soldiers);
    expect(soldiers).not.toBe(gross);
    // And it is one line of its own, immediately after the charge it rides on.
    expect(after.indexOf(levy!)).toBe(
      after.findIndex((line) => line.source.startsWith('Unit maintenance')) + 1,
    );
    // One fold, and the treasury's figure is it.
    expect(empireGold(state, 0)).toBe(after.reduce((sum, line) => sum + line.gold, 0));
    expect(empireGold(state, 0)).toBe(
      before.reduce((sum, line) => sum + line.gold, 0) - soldiers,
    );
  });

  it('is what the phase actually banks', () => {
    // The ledger's own pin one block up, said again with a card in the slot:
    // a line nothing charges is a line that reads well and costs nothing.
    const plain = army();
    const levied = army();
    slot(levied.state, 0, 'theRecklessLevy');
    const purse = (state: GameState): number => state.players[0]!.gold;
    const opened = { plain: purse(plain.state), levied: purse(levied.state) };
    collectYields(plain.state);
    collectYields(levied.state);
    expect(purse(levied.state) - opened.levied).toBe(
      purse(plain.state) - opened.plain - plain.soldiers,
    );
  });

  it('composes with the give-backs, in the fold’s stated order', () => {
    // The flat give-back is counted off the **pieces** and so is the levy, and
    // neither is a share of the other: The Quartermasters take a shilling off
    // each soldier and the Levy puts a coin back on, and both lines stand.
    const { state, gross, soldiers } = army();
    slot(state, 0, 'theQuartermasters');
    const flat = explainUnitUpkeepRebate(state, 0);
    expect(flat).toHaveLength(1);
    slot(state, 0, 'theRecklessLevy');
    expect(explainUnitUpkeepRebate(state, 0).map((line) => line.gold)).toEqual(
      flat.map((line) => line.gold),
    );
    expect(explainUnitUpkeepSurcharge(state, 0).reduce((sum, l) => sum + l.gold, 0)).toBe(soldiers);

    // And the **percentage** give-back is a third sentence again: Tyranny takes
    // its thirty percent of the gross, which the levy has not moved.
    state.players[0]!.statecraft.government = 'tyranny' as never;
    bumpRevision(state);
    const rebates = explainUnitUpkeepRebate(state, 0);
    expect(rebates.some((line) => line.source.includes('Tyranny'))).toBe(true);
    expect(explainUnitUpkeepSurcharge(state, 0).reduce((sum, l) => sum + l.gold, 0)).toBe(soldiers);

    // The order in the one fold: the army's price, what the law added, then
    // every give-back. A ledger that printed the forgiveness before the charge
    // would be a ledger read backwards.
    const ledger = explainEmpireGold(state, 0);
    const at = (needle: string): number =>
      ledger.findIndex((line) => line.source.includes(needle));
    expect(at('Unit maintenance')).toBeGreaterThanOrEqual(0);
    expect(at('Reckless')).toBe(at('Unit maintenance') + 1);
    expect(at('Quartermasters')).toBeGreaterThan(at('Reckless'));
    expect(at('Tyranny')).toBeGreaterThan(at('Quartermasters'));
    // And the whole of it is still one sum: the charge, the levy, the two
    // give-backs, and the gross untouched underneath them all.
    expect(explainUnitUpkeep(state, 0).reduce((sum, line) => sum + line.gold, 0)).toBe(gross);
    expect(empireGold(state, 0)).toBe(ledger.reduce((sum, line) => sum + line.gold, 0));
  });

  it('charges the wild nothing, like every other line', () => {
    const state = bareState();
    state.players[1]!.barbarian = true;
    createUnit(state, 1, 'warrior', 8, 8);
    slot(state, 1, 'theRecklessLevy');
    expect(explainUnitUpkeepSurcharge(state, 1)).toEqual([]);
  });
});

// --- the palace -------------------------------------------------------------

describe('the palace', () => {
  it('pays its line in the capital and nowhere else', () => {
    const { state, city } = world();
    const second = foundCityAt(state, 0, at(state, 9, 5));
    expect(explainPalaceYield(state, city)).toEqual([
      {
        source: 'Palace',
        gold: RULES.cities.palaceGold,
        science: RULES.cities.palaceScience,
        culture: RULES.cities.palaceCulture,
      },
    ]);
    expect(explainPalaceYield(state, second)).toEqual([]);
    // Folded, never added beside — the capital's gold carries it, and since
    // 2026-09-08 its beaker and its note too (the user's ruling).
    expect(foldCity(state, city).gold - foldCity(state, second).gold).toBe(
      RULES.cities.palaceGold,
    );
    expect(foldCity(state, city).science - foldCity(state, second).science).toBe(
      RULES.cities.palaceScience,
    );
    expect(foldCity(state, city).culture - foldCity(state, second).culture).toBe(
      RULES.cities.palaceCulture,
    );
  });

  it('follows the capital when the palace falls', () => {
    const { state, city } = world();
    const second = foundCityAt(state, 0, at(state, 9, 5));
    city.captured = true;
    expect(explainPalaceYield(state, city)).toEqual([]);
    expect(explainPalaceYield(state, second)).toEqual([
      {
        source: 'Palace',
        gold: RULES.cities.palaceGold,
        science: RULES.cities.palaceScience,
        culture: RULES.cities.palaceCulture,
      },
    ]);
  });
});

// --- debt -------------------------------------------------------------------

describe('a treasury under water', () => {
  it('joins the percent list at the empire stage, on science and culture only', () => {
    const { state, city } = world();
    const player = state.players[0]!;
    player.gold = -1;
    expect(treasuryInDebt(player)).toBe(true);

    const lines = cityYieldPercents(state, city).filter(
      (line) => line.source === 'Treasury in debt',
    );
    expect(lines).toEqual([
      { source: 'Treasury in debt', yield: 'science', percent: UPKEEP.debtPercent, stage: 'empire' },
      { source: 'Treasury in debt', yield: 'culture', percent: UPKEEP.debtPercent, stage: 'empire' },
    ]);
    // Nothing on the three that would turn a penalty into a spiral.
    for (const key of ['gold', 'food', 'production'] as const) {
      expect(lines.some((line) => line.yield === key)).toBe(false);
    }

    player.gold = 0;
    expect(treasuryInDebt(player)).toBe(false);
    expect(cityYieldPercents(state, city).some((l) => l.source === 'Treasury in debt')).toBe(false);
  });

  it('sums with a meter tier rather than compounding after it', () => {
    // Entry XVII's whole claim, said of the new line. A city with a library
    // makes real science; put the empire in the red and the science falls by
    // exactly the empire-stage sum, floored once.
    const { state, city } = world();
    city.buildings.push('library');
    bumpRevision(state);
    city.population = 6;
    const before = foldCity(state, city).science;
    state.players[0]!.gold = -50;
    const after = foldCity(state, city).science;

    const empire = cityYieldPercents(state, city)
      .filter((line) => line.yield === 'science' && line.stage === 'empire')
      .reduce((sum, line) => sum + line.percent, 0);
    // Recompute the same arithmetic the evaluator does: the base is what the
    // town made when the only empire-stage lines were the meters'.
    // The base is read off the town's own flats rather than backed out of the
    // staged figure by a rounding: since the palace pays a beaker beside the
    // citizens' halves (2026-09-08) the flats carry a fraction, and a `round`
    // of the staged figure divided back out landed a quarter-beaker off.
    // And no floor: the fold has been exact since batch X (`exactYields.test.ts`
    // — the pools bank the staged figure, tier and all). The old `Math.floor`
    // here was only ever a no-op on an integral base.
    const base = explainCity(state, city).flats.science;
    expect(after).toBeCloseTo(base * (1 + empire / 100), 9);
    expect(after).toBeLessThan(before);
  });

  it('leaves an empire that is merely poor alone', () => {
    const { state, city } = world();
    state.players[0]!.gold = 3;
    expect(cityYieldPercents(state, city).some((l) => l.source === 'Treasury in debt')).toBe(false);
  });
});

// --- the creditors ----------------------------------------------------------

describe('the creditors', () => {
  it('take nobody until the treasury is below the threshold', () => {
    const { state } = world();
    createUnit(state, 0, 'warrior', 5, 4);
    const player = state.players[0]!;

    player.gold = UPKEEP.disbandBelow;
    expect(disbandCandidate(state, 0)).toBeNull();
    player.gold = UPKEEP.disbandBelow - 1;
    expect(disbandCandidate(state, 0)).not.toBeNull();
  });

  it('take the dearest first, then the oldest', () => {
    const { state } = world();
    const oldWarrior = createUnit(state, 0, 'warrior', 5, 4);
    createUnit(state, 0, 'knight', 5, 3);
    const youngWarrior = createUnit(state, 0, 'warrior', 5, 6);
    createUnit(state, 0, 'knight', 6, 6);
    state.players[0]!.gold = -40;

    // The knight, and the *first* knight: ids are minted in order, so "oldest"
    // is a fact a replay reproduces.
    const first = disbandCandidate(state, 0)!;
    expect(first.type).toBe('knight');
    expect(first.gold).toBe(4);
    expect(first.unitId).toBeLessThan(youngWarrior.id);

    // With both knights gone the warriors are next, oldest first.
    state.units = state.units.filter((unit) => unit.type !== 'knight');
    expect(disbandCandidate(state, 0)!.unitId).toBe(oldWarrior.id);
  });

  it('never take a settler, a worker or a gift', () => {
    const { state } = world();
    createUnit(state, 0, 'settler', 5, 4);
    createUnit(state, 0, 'worker', 5, 3);
    const gift = createUnit(state, 0, 'knight', 5, 6);
    gift.freeUpkeep = true;
    state.players[0]!.gold = -100;
    // Nothing on the payroll, so nothing to take — an empire in arrears does
    // not lose its people.
    expect(disbandCandidate(state, 0)).toBeNull();
  });

  it('take exactly one a turn, and report it', () => {
    const { state } = world();
    createUnit(state, 0, 'knight', 5, 4);
    createUnit(state, 0, 'knight', 5, 3);
    createUnit(state, 0, 'knight', 5, 6);
    state.players[0]!.gold = -60;
    const before = state.units.length;

    const report = emptyTurnReport();
    collectYields(state, report);
    expect(state.units.length).toBe(before - 1);
    expect(report.disbanded).toEqual([
      { unitId: expect.any(Number), ownerId: 0, type: 'knight', upkeep: 4 },
    ]);

    // And again next turn, because disbanding banks no gold — it only lowers the
    // next bill. That is the spiral the ruling describes, one step at a time.
    const second = emptyTurnReport();
    collectYields(state, second);
    expect(second.disbanded).toHaveLength(1);
    expect(state.units.length).toBe(before - 2);
  });
});

// --- the opening ------------------------------------------------------------

describe('the opening kit', () => {
  it('is a settler and a scout', () => {
    expect(RULES.startingUnits).toEqual(['settler', 'scout']);
    const game = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const mine = game.state.units.filter((unit) => unit.ownerId === 0).map((unit) => unit.type);
    expect(mine.sort()).toEqual(['scout', 'settler']);
    expect(mine).not.toContain('warrior');
  });

  it('opens the game paying nothing at all', () => {
    // The whole reason the scout is exempt: an empire on turn one owes its
    // treasury nothing, and the first ledger it can open is empty.
    const game = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    expect(explainEmpireGold(game.state, 0)).toEqual([]);
  });
});

// --- determinism ------------------------------------------------------------

describe('determinism', () => {
  it('replays a game with maintenance in it byte for byte', () => {
    const config = {
      seed: 99,
      sizeName: 'duel' as const,
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bo', color: '#2e6fd4', isHuman: false },
      ],
    };
    const game: Game = createGame(config);
    for (let turn = 0; turn < 12; turn++) {
      for (const player of [0, 1]) dispatch(game, { type: 'endTurn', playerId: player });
    }
    const replayed = replay(config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
  });

  it('serialises a piece nobody paid for differently in kind', () => {
    const { state } = world();
    const plain = createUnit(state, 0, 'warrior', 5, 4);
    const gift = createUnit(state, 0, 'warrior', 5, 3);
    gift.freeUpkeep = true;
    // Presence is the state: a `false` would make a game with no gifts in it
    // fail to compare equal to itself before the field existed.
    expect(JSON.stringify(plain)).not.toContain('freeUpkeep');
    expect(JSON.stringify(gift)).toContain('"freeUpkeep":true');
  });

  it('prices every city against one treasury, whatever the founding order', () => {
    // The two-loop rule in `collectYields`. Put the empire in the red, resolve,
    // and every town's science must have been staged with the debt line — a
    // single interleaved loop would have let the first town's gold lift the
    // treasury out of debt before the second was priced.
    const { state, city } = world();
    const second = foundCityAt(state, 0, at(state, 9, 5));
    city.buildings.push('library');
    bumpRevision(state);
    second.buildings.push('library');
    bumpRevision(state);
    city.population = 5;
    second.population = 5;
    state.players[0]!.gold = -2;

    const expected =
      foldCity(state, city).science + foldCity(state, second).science;
    const before = state.players[0]!.sciencePool;
    collectYields(state);
    expect(state.players[0]!.sciencePool - before).toBe(expected);
  });
});

// --- the reducer ------------------------------------------------------------

describe('maintenance and the rest of the game', () => {
  it('does not stop a rejected command leaving the state byte-identical', () => {
    const { state } = world();
    state.players[0]!.gold = -20;
    const before = snapshotState(state);
    expect(applyCommand(state, { type: 'endTurn', playerId: 99 }).ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
  });

  it('runs the whole pipeline with an empire in arrears', () => {
    const { state, city } = world();
    createUnit(state, 0, 'knight', 5, 4);
    city.buildings.push('university');
    bumpRevision(state);
    state.players[0]!.gold = -30;
    expect(() => runEndOfTurn(state)).not.toThrow();
  });
});
