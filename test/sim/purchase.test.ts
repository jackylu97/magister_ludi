/**
 * Buying things outright — the M9 gold sink and the faith bank it generalised
 * (design ledger Entry XXIX; Entry XXVIII is the augur half).
 *
 * Three claims, and they are the reason this is one file rather than a few more
 * cases in `religion.test.ts`:
 *
 *   · **One price evaluator.** A tag's figure is the fold of its printed lines,
 *     and the lines are the *production cost's* lines plus a conversion — so the
 *     settler ladder and the age band reach a price tag without either knowing
 *     the other exists. Tested by moving the ladder and watching the coin move.
 *   · **One completion routine.** A bought thing arrives exactly as a built one
 *     does: the spawn convention, `unitsBuilt`, the completion riders and the
 *     panel's refresh. Tested by buying a settler and asking the *next* one's
 *     price.
 *   · **One gate.** Gold's refusals are production's refusals, asked through
 *     `buildError` itself, which is what keeps gold away from the augur with no
 *     clause in `purchase.ts` that knows what an augur is.
 *
 * Plus the two properties every command in this codebase owes: a refusal leaves
 * the state byte-identical, and a log replays to the same bytes.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import {
  cityYields,
  foundCityAt,
  queueItemName,
  tilePurchaseError,
  unitProductionCost,
} from '../../src/sim/cities';
import { dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt, tileHex, wrappedDistance } from '../../src/sim/map';
import {
  type PurchasableItem,
  bankOf,
  contributeError,
  explainPurchaseCost,
  isPurchaseOnly,
  purchaseError,
  purchaseVerb,
} from '../../src/sim/purchase';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, SCHEMA_VERSION, playerById } from '../../src/sim/state';
import { buildError, gatingTech } from '../../src/sim/tech';
import { unitDef } from '../../src/sim/unitData';
import { buyCommand, game } from './purchaseHelpers';

// --- harness ----------------------------------------------------------------

const WARRIOR: PurchasableItem = { kind: 'unit', id: 'warrior' };
const SETTLER: PurchasableItem = { kind: 'unit', id: 'settler' };
const WORKER: PurchasableItem = { kind: 'unit', id: 'worker' };
const GRANARY: PurchasableItem = { kind: 'building', id: 'granary' };
const AUGUR: PurchasableItem = { kind: 'unit', id: 'augur' };
const RATE = RULES.production.goldPerHammer;

/** A city for a player, on the tile their first unit is standing on. */
function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

function learn(state: GameState, playerId: number, ...techs: string[]): void {
  const player = playerById(state, playerId)!;
  for (const tech of techs) {
    if (!player.techsResearched.includes(tech as never)) {
      player.techsResearched.push(tech as never);
    }
  }
}

/** How far a piece ended up from the town that bought it. */
function stepsFrom(state: GameState, city: City, unitId: number): number {
  const unit = state.units.find((u) => u.id === unitId)!;
  return wrappedDistance(
    state.map,
    tileHex(getTileAt(state.map, unit.col, unit.row)!),
    tileHex(getTileAt(state.map, city.col, city.row)!),
  );
}

// --- the augur is not a build row -------------------------------------------

describe('a thing that is bought is not a thing that is built', () => {
  it('marks the augur purchase-only, and nothing else in the roster', () => {
    // The rule the city panel filters its unit list with, and it is read off the
    // roster row rather than off a name.
    expect(isPurchaseOnly(AUGUR)).toBe(true);
    expect(isPurchaseOnly(WARRIOR)).toBe(false);
    expect(isPurchaseOnly(GRANARY)).toBe(false);
  });

  it('refuses the production queue with the bank named, even with the tech', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);

    // The reducer's own sentence, and the one the panel would have to grey a row
    // with if it drew one at all.
    const blocked = buildError(g.state, 0, 'unit', 'augur');
    expect(blocked).toMatch(/not built/);
    expect(blocked).toMatch(/faith/);

    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'augur' }],
    } as Command);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(blocked);
    // A refused command is a command that never happened.
    expect(snapshotState(g.state)).toEqual(before);
    expect(city.queue).toHaveLength(0);
  });

  it('offers it in the bank it is actually sold in, with a verb off its row', () => {
    // What the city panel's foot-of-the-units row prints. The verb is data, so a
    // prophet is *called* and a mercenary would be *hired* without this file (or
    // the panel) learning either name.
    expect(purchaseVerb(AUGUR)).toBe('Call an augur');
    expect(purchaseVerb(WARRIOR)).toBe('Buy a Warrior');
  });
});

// --- the price ---------------------------------------------------------------

describe('what gold costs', () => {
  it('is the full production cost at the treasury rate, and the fold of its lines', () => {
    const g = game();
    const city = found(g.state, 0);
    const hammers = unitProductionCost(g.state, 0, 'warrior');

    const price = explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'gold')!;
    expect(price.currency).toBe('gold');
    expect(price.total).toBe(hammers * RATE);
    // Rule 5 for a price: the fold of the printed lines *is* the figure.
    expect(price.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(price.total);
    // The production cost's own lines, then the conversion carrying the
    // difference it makes — which is what lets the ladder and the band through.
    expect(price.lines[0]!.source).toBe('Warrior');
    expect(price.lines[price.lines.length - 1]!.source).toBe(`×${RATE} in gold`);
  });

  it('prices a building off its flat cost', () => {
    const g = game();
    const city = found(g.state, 0);
    const price = explainPurchaseCost(g.state, 0, city.id, GRANARY, 'gold')!;
    expect(price.total).toBe(buildingDef('granary').cost * RATE);
  });

  /**
   * **The treasury's rate, doubled** (user ruling, 2026-09-03: "gold is way too
   * strong. Gold costs need to be 2x across the board ... for the sake of
   * bonuses, keep the conversion at 2:1 between gold and other yields").
   *
   * The one number in this file pinned literally, because the ruling *is* the
   * number: what a hammer costs at the till went 2 → 4, while every conversion
   * that pays gold *out* — a chop's coin, a project's payout, a windfall's
   * riders — stays where it was. Faith is pinned beside it as the control: the
   * ruling was about gold's flexibility and touched no other bank.
   */
  it('charges the doubled treasury rate the 9/3 ruling named, and leaves faith alone', () => {
    expect(RULES.production.goldPerHammer).toBe(4);
    expect(RULES.production.faithPerHammer).toBe(1);

    const g = game();
    const city = found(g.state, 0);
    const hammers = unitProductionCost(g.state, 0, 'warrior');
    const price = explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'gold')!;
    expect(price.total).toBe(hammers * 4);
    // Twice what the same warrior cost before the ruling, said as the ruling
    // says it — the price paid in gold, not the gold a yield converts into.
    expect(price.total).toBe(2 * (hammers * 2));
  });

  it('carries the settler ladder into the tag, because the ladder is a cost line', () => {
    const g = game();
    const city = found(g.state, 0);
    const first = explainPurchaseCost(g.state, 0, city.id, SETTLER, 'gold')!;

    const player = playerById(g.state, 0)!;
    player.unitsBuilt.settler = (player.unitsBuilt.settler ?? 0) + 1;
    const second = explainPurchaseCost(g.state, 0, city.id, SETTLER, 'gold')!;
    expect(second.total).toBeGreaterThan(first.total);
    expect(second.total).toBe(unitProductionCost(g.state, 0, 'settler') * RATE);
    // And the reason is a **line**, not an adjustment somebody made afterwards.
    expect(second.lines.length).toBeGreaterThan(first.lines.length);
  });

  it('sells each thing out of exactly one bank', () => {
    const g = game();
    const city = found(g.state, 0);
    // A row that names its own bank is sold out of that bank and no other.
    expect(explainPurchaseCost(g.state, 0, city.id, AUGUR, 'gold')).toBeNull();
    expect(explainPurchaseCost(g.state, 0, city.id, AUGUR, 'faith')).not.toBeNull();
    // And everything the roster leaves silent is sold out of the treasury.
    expect(explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'faith')).toBeNull();
    expect(explainPurchaseCost(g.state, 0, city.id, GRANARY, 'faith')).toBeNull();
  });
});

// --- buying ------------------------------------------------------------------

describe('buying a unit', () => {
  it('charges the treasury, stands the piece where a built one would, and leaves the basket alone', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.gold = 500;
    city.hammerBasket = 17;
    const price = explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'gold')!;
    const before = g.state.units.length;

    expect(dispatch(g, buyCommand(city.id, WARRIOR)).ok).toBe(true);

    expect(player.gold).toBe(500 - price.total);
    expect(g.state.units.length).toBe(before + 1);
    const bought = g.state.units[g.state.units.length - 1]!;
    expect(bought.type).toBe('warrior');
    expect(bought.ownerId).toBe(0);
    // The city tile if it has room, else a neighbour — `spawnTileFor`, shared
    // with the production queue.
    expect(stepsFrom(g.state, city, bought.id)).toBeLessThanOrEqual(1);
    // Born through `createUnit`, so it can act this turn.
    expect(bought.movesLeft).toBe(unitDef('warrior').movement);
    // **Purchasing does not consume the banked basket.** The hammers this town
    // had put toward something else are still there.
    expect(city.hammerBasket).toBe(17);
  });

  it('climbs the settler ladder, because it is the same completion routine', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.gold = 2000;
    city.population = 3;

    const before = unitProductionCost(g.state, 0, 'settler');
    expect(dispatch(g, buyCommand(city.id, SETTLER)).ok).toBe(true);
    expect(player.unitsBuilt.settler).toBe(1);
    // The empire's *next* settler is dearer from this instant, bought or built.
    expect(unitProductionCost(g.state, 0, 'settler')).toBeGreaterThan(before);
  });

  it('climbs the worker ladder too, on its own count', () => {
    // The generalisation (user ruling, 2026-08-28): a purchase inherits
    // whichever escalating type it names, priced off that type's own count in
    // `Player.unitsBuilt`, not the settler's.
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.gold = 2000;

    const before = unitProductionCost(g.state, 0, 'worker');
    expect(before).toBe(unitDef('worker').cost);
    expect(dispatch(g, buyCommand(city.id, WORKER)).ok).toBe(true);
    expect(player.unitsBuilt.worker).toBe(1);
    expect(player.unitsBuilt.settler).toBeUndefined();
    // The empire's *next* worker is dearer; its settler ladder never moved.
    expect(unitProductionCost(g.state, 0, 'worker')).toBeGreaterThan(before);
    expect(unitProductionCost(g.state, 0, 'settler')).toBe(unitDef('settler').cost);
  });

  it('strikes the bought thing off the queue and keeps the hammers', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.gold = 2000;
    // Whatever node hands over a granary, asked of the tree rather than named.
    const gate = gatingTech('building', 'granary');
    if (gate) learn(g.state, 0, gate);

    expect(
      dispatch(g, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue: [{ kind: 'building', id: 'granary' }, { kind: 'unit', id: 'warrior' }],
      } as Command).ok,
    ).toBe(true);
    city.hammerBasket = 9;

    expect(dispatch(g, buyCommand(city.id, GRANARY)).ok).toBe(true);
    expect(city.buildings).toContain('granary');
    // The row is gone and the warrior behind it has moved up; the hammers that
    // were behind the granary pay for the warrior.
    expect(city.queue.map((item) => queueItemName(item))).toEqual(['Warrior']);
    expect(city.hammerBasket).toBe(9);
  });

  it('sells one soldier a turn and no more, byte-identically, and buildings anyway', () => {
    // User, 2026-08-28: "cities can only purchase a single unit per turn",
    // widened 2026-09-02 to one *of each class*. A treasury that can turn coin
    // into a garrison as fast as a player can click is the thing being refused;
    // a town that buys a granary and a library on one afternoon has bought two
    // things it then has to feed.
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.gold = 2000;
    const gate = gatingTech('building', 'granary');
    if (gate) learn(g.state, 0, gate);

    expect(city.purchasedUnitTurns).toBeUndefined();
    expect(dispatch(g, buyCommand(city.id, WARRIOR)).ok).toBe(true);
    // An absolute turn, stamped into the bucket the purchase fell in — never a
    // countdown, and never a stamp on the town as a whole.
    expect(city.purchasedUnitTurns).toEqual({ militaryGold: g.state.turn });

    const goldAfterOne = player.gold;
    const before = snapshotState(g.state);
    const second = dispatch(g, buyCommand(city.id, WARRIOR));
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.error).toMatch(/already bought a military unit this turn/);
    expect(snapshotState(g.state)).toEqual(before);
    expect(player.gold).toBe(goldAfterOne);

    // A building is untouched by the rule, on the same afternoon.
    expect(dispatch(g, buyCommand(city.id, GRANARY)).ok).toBe(true);
    expect(city.buildings).toContain('granary');

    // And the day rolls over on its own: nothing clears the stamp, the
    // comparison simply stops matching.
    for (const seat of g.state.players) dispatch(g, { type: 'endTurn', playerId: seat.id });
    expect(city.purchasedUnitTurns!.militaryGold).toBeLessThan(g.state.turn);
    expect(dispatch(g, buyCommand(city.id, WARRIOR)).ok).toBe(true);
    expect(city.purchasedUnitTurns!.militaryGold).toBe(g.state.turn);
  });

  it('keeps the three classes on their own allowances', () => {
    // The user's widening, 2026-09-02: "cities should be able to only buy one
    // unit of each *type* — faith buying, buying a civilian unit, and buying a
    // military unit all counted separately". A town calling an augur has not
    // spent the afternoon it would have given a spearman, and a worker is not a
    // garrison. Three buckets, one apiece, all on the same day.
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    player.gold = 4000;

    expect(dispatch(g, buyCommand(city.id, WARRIOR)).ok).toBe(true);
    expect(dispatch(g, buyCommand(city.id, WORKER)).ok).toBe(true);
    expect(dispatch(g, buyCommand(city.id, AUGUR, 'faith')).ok).toBe(true);
    expect(city.purchasedUnitTurns).toEqual({
      militaryGold: g.state.turn,
      civilianGold: g.state.turn,
      faith: g.state.turn,
    });

    // And each bucket is now spent, in its own words.
    for (const [item, words] of [
      [WARRIOR, /already bought a military unit this turn/],
      [WORKER, /already bought a civilian unit this turn/],
    ] as const) {
      const blocked = dispatch(g, buyCommand(city.id, item));
      expect(blocked.ok).toBe(false);
      expect(blocked.ok === false && blocked.error).toMatch(words);
    }
    const prophetBlocked = dispatch(g, buyCommand(city.id, AUGUR, 'faith'));
    expect(prophetBlocked.ok).toBe(false);
    expect(prophetBlocked.ok === false && prophetBlocked.error).toMatch(
      /already bought a unit with faith this turn/,
    );
  });

  it('still buys an augur with faith, into the same routine', () => {
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 100;

    expect(dispatch(g, buyCommand(city.id, AUGUR, 'faith')).ok).toBe(true);
    expect(bankOf(player, 'faith')).toBe(60);
    expect(player.augursPurchased).toBe(1);
    expect(g.state.units.some((u) => u.type === 'augur')).toBe(true);
  });
});

// --- the gate ----------------------------------------------------------------

describe('every refusal, and each leaves the state byte-identical', () => {
  it('refuses in the reducer’s own words', () => {
    const g = game();
    const city = found(g.state, 0);
    playerById(g.state, 0)!.gold = 5000;

    const cases: { why: string; command: Command; match: RegExp }[] = [
      {
        why: 'no such player',
        command: buyCommand(city.id, WARRIOR, 'gold', 9),
        match: /No player/,
      },
      {
        why: 'somebody else’s city',
        command: buyCommand(city.id, WARRIOR, 'gold', 1),
        match: /does not belong/,
      },
      { why: 'no such city', command: buyCommand(999, WARRIOR), match: /No city/ },
      {
        why: 'a thing this game has never heard of',
        command: buyCommand(city.id, { kind: 'unit', id: 'dragon' } as unknown as PurchasableItem),
        match: /for sale/,
      },
      {
        why: 'a project, which never completes and so cannot be delivered',
        command: buyCommand(city.id, { kind: 'project', id: 'tithes' } as unknown as PurchasableItem),
        match: /for sale/,
      },
      {
        why: 'a bank that does not exist',
        command: buyCommand(city.id, WARRIOR, 'beads' as 'gold'),
        match: /no bank called/,
      },
      {
        why: 'gold asked for a thing priced in faith',
        command: buyCommand(city.id, AUGUR, 'gold'),
        match: /bought with faith, not gold/,
      },
      {
        why: 'a technology this empire does not hold',
        command: buyCommand(city.id, { kind: 'unit', id: 'swordsman' }),
        match: /needs/,
      },
      {
        why: 'a building this town already has',
        command: buyCommand(city.id, { kind: 'building', id: 'monument' }),
        match: /already built|needs/,
      },
      {
        why: 'a city too small for the unit',
        command: buyCommand(city.id, SETTLER),
        match: /needs population/,
      },
    ];

    for (const testCase of cases) {
      const before = snapshotState(g.state);
      const result = applyCommand(g.state, testCase.command);
      expect(result.ok, testCase.why).toBe(false);
      expect(result.ok === false && result.error, testCase.why).toMatch(testCase.match);
      expect(snapshotState(g.state), testCase.why).toEqual(before);
    }
  });

  it('refuses a treasury that does not cover the price, and says what it holds', () => {
    const g = game();
    const city = found(g.state, 0);
    const price = explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'gold')!;
    playerById(g.state, 0)!.gold = price.total - 1;

    const before = snapshotState(g.state);
    const result = applyCommand(g.state, buyCommand(city.id, WARRIOR));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(
      new RegExp(`costs ${price.total} gold`),
    );
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('refuses a seat that has ended its turn', () => {
    const g = game();
    const city = found(g.state, 0);
    playerById(g.state, 0)!.gold = 5000;
    dispatch(g, { type: 'endTurn', playerId: 0 } as Command);

    const before = snapshotState(g.state);
    expect(applyCommand(g.state, buyCommand(city.id, WARRIOR)).ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('is not barred by the authority freeze, and says so in one place', () => {
    // The freeze is about **ground** — the accrual, the expansion and
    // `purchaseTile` — because land follows the writ. An overdrawn empire is
    // short of legitimacy, not of coin. Asserted by reading the source, because
    // the failure this guards against is somebody *adding* the clause on the
    // grounds that it looks like the tile purchase.
    // Vite's raw glob rather than `node:fs`: this project has no node typings
    // and a source assertion is not worth a dependency (`cities.test.ts`).
    const modules = import.meta.glob('../../src/sim/purchase.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const source = Object.values(modules)[0]!;
    expect(source).not.toMatch(/bordersFrozen\(|meterEffects\(/);
  });

  it('takes a card\'s discount off a **building** too, as one labelled line', () => {
    // Crassus: "units and buildings cost −20% to buy" (−30% until the user's
    // great-people pass of 2026-09-03). The unit half has had a rider hook
    // since the wonders pass; the building half was the deferred sentence on
    // his row until 2026-08-28. Asserted through the price, because the price
    // is the fold of the printed lines and nothing else.
    const g = game();
    const city = found(g.state, 0);
    const bare = explainPurchaseCost(g.state, 0, city.id, GRANARY, 'gold')!;

    g.state.players[0]!.legacies.push({ id: 'crassus', age: 1 });
    const cut = explainPurchaseCost(g.state, 0, city.id, GRANARY, 'gold')!;

    expect(cut.lines).toHaveLength(bare.lines.length + 1);
    expect(cut.total).toBe(Math.floor((bare.total * 80) / 100));
    expect(cut.lines[cut.lines.length - 1]!.source).toContain('Crassus');
    // Rule 5 holds: the fold is still the price.
    expect(cut.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(cut.total);
    // And the unit half is untouched by the same one card.
    const warrior = explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'gold')!;
    expect(warrior.lines[warrior.lines.length - 1]!.source).toContain('Crassus');
  });

  it('leaves a units-only rider at the door of a building', () => {
    // The Great Ziggurat says "religious units", and `on` defaults to units —
    // so every row written before the field existed prices a granary exactly as
    // it did. A rider that leaked onto buildings would be a discount nobody
    // ratified.
    const g = game();
    const city = found(g.state, 0);
    const bare = explainPurchaseCost(g.state, 0, city.id, GRANARY, 'gold')!;
    city.buildings.push('greatZiggurat');
    expect(explainPurchaseCost(g.state, 0, city.id, GRANARY, 'gold')!.total).toBe(bare.total);
  });
});

// --- determinism -------------------------------------------------------------

// --- the Reliquary's faith bank ---------------------------------------------

/**
 * **The Reliquary** (ledger Entry LVIII, The Holy Office).
 *
 * The one marker on a building row that opens a *second bank* for the rows the
 * treasury already sells. Three claims, and they are the three the docblock on
 * `faithBankOpen` makes: units only, never a row that names its own bank, and
 * the rate is the one a contribution already buys a hammer at.
 */
describe('a town holding a Reliquary sells its units for faith', () => {
  const RELIQUARY: PurchasableItem = { kind: 'building', id: 'reliquary' };
  const FAITH_RATE = RULES.production.faithPerHammer;

  /** A town with the stones standing in it, and a full faith bank. */
  function withReliquary() {
    const g = game();
    learn(g.state, 0, 'divination', 'theHighTemple', 'theology', 'theHolyOffice');
    const city = found(g.state, 0);
    city.buildings.push('reliquary');
    playerById(g.state, 0)!.faithPool = 2000;
    return { g, city };
  }

  it('refuses faith for an ordinary unit in a town without one', () => {
    const g = game();
    const city = found(g.state, 0);
    expect(explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'faith')).toBeNull();
    const blocked = applyCommand(g.state, buyCommand(city.id, WARRIOR, 'faith'));
    expect(blocked.ok).toBe(false);
    expect(blocked.ok === false && blocked.error).toMatch(/bought with gold, not faith/);
  });

  it('prices it out of the faith bank at the contribution rate', () => {
    const { g, city } = withReliquary();
    const price = explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'faith')!;
    expect(price.currency).toBe('faith');
    // The **same production cost** gold converts, at faith's own rate — so the
    // two banks disagree about the coin and never about the thing.
    const hammers = unitProductionCost(g.state, 0, 'warrior');
    expect(price.total).toBe(Math.floor(hammers * FAITH_RATE));
    // Rule 5: the fold of the printed lines is the figure charged.
    expect(price.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(price.total);
    expect(price.lines.some((line) => line.source.includes('in faith'))).toBe(true);
    // And gold still works in the same town: a Reliquary widens, never replaces.
    expect(explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'gold')?.currency).toBe('gold');
  });

  it('charges the faith bank and delivers the piece through the one routine', () => {
    const { g, city } = withReliquary();
    const player = playerById(g.state, 0)!;
    const price = explainPurchaseCost(g.state, 0, city.id, WARRIOR, 'faith')!;
    const bank = bankOf(player, 'faith');
    const gold = player.gold;

    expect(applyCommand(g.state, buyCommand(city.id, WARRIOR, 'faith')).ok).toBe(true);
    expect(bankOf(player, 'faith')).toBe(bank - price.total);
    expect(player.gold).toBe(gold);
    expect(g.state.units.some((u) => u.ownerId === 0 && u.type === 'warrior')).toBe(true);
    // One unit per city per turn, whichever bank paid for it.
    expect(applyCommand(g.state, buyCommand(city.id, WARRIOR, 'faith')).ok).toBe(false);
  });

  it('sells no building out of it, and does not overrule the augur’s own bank', () => {
    const { g, city } = withReliquary();
    // Units only: a granary bought with faith would make the Reliquary a second,
    // quieter treasury.
    expect(explainPurchaseCost(g.state, 0, city.id, GRANARY, 'faith')).toBeNull();
    expect(applyCommand(g.state, buyCommand(city.id, GRANARY, 'faith')).ok).toBe(false);
    // The augur still names its own bank, and is still refused gold there.
    expect(explainPurchaseCost(g.state, 0, city.id, AUGUR, 'faith')?.currency).toBe('faith');
    const refused = applyCommand(g.state, buyCommand(city.id, AUGUR, 'gold'));
    expect(refused.ok === false && refused.error).toMatch(/bought with faith, not gold/);
  });

  it('is a build row like any other, unlocked by The Holy Office', () => {
    const g = game();
    const city = found(g.state, 0);
    expect(isPurchaseOnly(RELIQUARY)).toBe(false);
    expect(gatingTech('building', 'reliquary')).toBe('theHolyOffice');
    expect(buildError(g.state, 0, 'building', 'reliquary', city)).not.toBeNull();
    learn(g.state, 0, 'divination', 'theHighTemple', 'theology', 'theHolyOffice');
    expect(buildError(g.state, 0, 'building', 'reliquary', city)).toBeNull();
    // The happiness is the row's own plain field, like the cathedral's.
    expect(buildingDef('reliquary').happiness).toBe(4);
    expect(buildingDef('reliquary').faithPurchases).toBe(true);
  });

  it('pays a tenth more faith in the town it stands in', () => {
    // The row's third clause, written as an ordinary `percentYields` scoped to
    // the building — read through `liveCityEffects`' ordinary-building source,
    // exactly as the observatory's science is, so nothing in the evaluator
    // learned the Reliquary's name.
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('shrine', 'temple');
    const before = cityYields(g.state, city).faith;
    expect(before).toBeGreaterThan(0);
    city.buildings.push('reliquary');
    expect(cityYields(g.state, city).faith).toBe(Math.floor((before * 110) / 100));
  });
});

// --- the puppet's purse -----------------------------------------------------

/**
 * **A puppet spends nothing** — ruled 2026-09-03 (Civ V's rule), schema 58.
 *
 * The ruling is one sentence and it is deliberately absolute: a town taken by
 * force and not yet annexed may buy no unit, no building and no ground.
 * Annexation is the verb that opens its purse, and it is the whole of the
 * decision a captor is offered about a conquest — so the refusal is a *clause*
 * in the two gates every surface already asks, and not a fourth gate somewhere.
 *
 * **Three** clauses since 2026-09-04 (schema 64), one voice, tested here
 * together for that reason: the wording is the same in `purchaseError`,
 * `tilePurchaseError` and `contributeError`, because a player meeting it in the
 * city panel, in the Buy Tiles overlay and at the cathedral's own two buttons is
 * meeting the same rule.
 */
describe('a puppet spends nothing', () => {
  /** A capital, and a puppet beside it — the shape `captureCity` leaves. */
  function withPuppet(): { g: ReturnType<typeof game>; own: City; puppet: City } {
    const g = game();
    const own = found(g.state, 0);
    const spot = g.state.map.tiles.find(
      (tile) =>
        wrappedDistance(
          g.state.map,
          tileHex(tile),
          tileHex(getTileAt(g.state.map, own.col, own.row)!),
        ) === 5 && tile.terrain === 'grassland',
    )!;
    const puppet = foundCityAt(g.state, 0, spot);
    // Exactly what a capture writes (`captureCity`), and nothing else: the
    // rule under test is the marker, not the way the town was taken.
    puppet.puppet = true;
    puppet.captured = true;
    g.state.players[0]!.gold = 5000;
    return { g, own, puppet };
  }

  it('refuses every unit and every building, in one sentence', () => {
    const { g, own, puppet } = withPuppet();
    for (const item of [WARRIOR, WORKER, GRANARY] as PurchasableItem[]) {
      const refusal = applyCommand(g.state, buyCommand(puppet.id, item));
      expect(refusal.ok).toBe(false);
      expect(refusal.ok === false && refusal.error).toMatch(/puppet spends nothing/);
      // And the price evaluator says the same thing, so no surface can offer a
      // button the reducer would refuse.
      expect(purchaseError(g.state, 0, puppet.id, item, 'gold')).toMatch(/annex it to invest/);
    }
    // The same empire's own town is untouched: this is about the *town*.
    expect(purchaseError(g.state, 0, own.id, WARRIOR, 'gold')).toBeNull();
  });

  it('refuses ground, in the same sentence', () => {
    const { g, puppet } = withPuppet();
    const cell = { col: puppet.col + 2, row: puppet.row };
    expect(tilePurchaseError(g.state, 0, puppet.id, cell)).toMatch(/puppet spends nothing/);
    const before = snapshotState(g.state);
    const refused = applyCommand(g.state, {
      type: 'purchaseTile',
      playerId: 0,
      cityId: puppet.id,
      ...cell,
    } as Command);
    expect(refused.ok).toBe(false);
    // Hard rule 1: a refused command leaves the state byte-identical.
    expect(snapshotState(g.state)).toBe(before);
  });

  it('refuses a contribution too, in the same sentence', () => {
    // Ruled 2026-09-04 (schema 64), the third clause of one rule: a pour into a
    // puppet's basket is the same purse being opened as a purchase, and it is
    // refused before the bank is even named. The row is found by its marker, so
    // this test names no building.
    const { g, puppet } = withPuppet();
    const takesContributions = BUILDING_IDS.find(
      (id) => buildingDef(id).acceptsContributions === true,
    )!;
    puppet.queue.length = 0;
    puppet.queue.push({ kind: 'building', id: takesContributions });
    puppet.hammerBasket = 0;
    g.state.players[0]!.faithPool = 5000;

    for (const currency of ['gold', 'faith'] as const) {
      expect(contributeError(g.state, 0, puppet.id, currency)).toMatch(/puppet spends nothing/);
      const before = snapshotState(g.state);
      const refused = applyCommand(g.state, {
        type: 'contribute',
        playerId: 0,
        cityId: puppet.id,
        currency,
      } as Command);
      expect(refused.ok).toBe(false);
      // Hard rule 1: a refused command leaves the state byte-identical.
      expect(snapshotState(g.state)).toBe(before);
    }

    // And the moment it is annexed the pour is legal, which is the whole of the
    // rule: the refusal is about the town, not about the coin.
    expect(applyCommand(g.state, { type: 'annexCity', playerId: 0, cityId: puppet.id }).ok).toBe(
      true,
    );
    expect(contributeError(g.state, 0, puppet.id, 'gold')).toBeNull();
  });

  it('opens the purse the moment the town is annexed', () => {
    const { g, puppet } = withPuppet();
    expect(purchaseError(g.state, 0, puppet.id, WARRIOR, 'gold')).not.toBeNull();
    expect(applyCommand(g.state, { type: 'annexCity', playerId: 0, cityId: puppet.id }).ok).toBe(
      true,
    );
    expect(puppet.puppet).toBeUndefined();
    expect(purchaseError(g.state, 0, puppet.id, WARRIOR, 'gold')).toBeNull();
  });
});

describe('the schema witness', () => {
  it('carries the version that says a puppet buys nothing', () => {
    // v58: two clauses, one in `purchaseError` and one in `tilePurchaseError`.
    // A legality reversal rather than a table that moved — a v57 log may
    // contain a puppet's purchase this reducer refuses, so it is a different
    // game rather than an older one. The other eleven witnesses are listed in
    // `test/sim/state.test.ts`'s own migration note.
    expect(SCHEMA_VERSION).toBe(64);
  });
});
