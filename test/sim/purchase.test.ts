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
  buildingProductionCost,
  foundCityAt,
  queueItemName,
  tilePurchaseError,
  unitProductionCost,
  unitRosterCost,
} from '../../src/sim/cities';
import {
  foldCity,
} from '../../src/sim/yields/town';
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
import {
  type City,
  type GameState,
  SCHEMA_VERSION,
  playerById,
  bumpRevision,
} from '../../src/sim/state';
import { buildError, gatingTech } from '../../src/sim/tech';
import { unitDef } from '../../src/sim/unitData';
import { buyCommand, game } from './purchaseHelpers';

// --- harness ----------------------------------------------------------------

const WARRIOR: PurchasableItem = { kind: 'unit', id: 'warrior' };
const SETTLER: PurchasableItem = { kind: 'unit', id: 'settler' };
const WORKER: PurchasableItem = { kind: 'unit', id: 'worker' };
const GRANARY: PurchasableItem = { kind: 'building', id: 'granary' };
const AUGUR: PurchasableItem = { kind: 'unit', id: 'augur' };
/**
 * The row that stands for "bought, never built" since the augur was withdrawn
 * (2026-09-06). Same shape, same bank, same exclusivity — and one that is still
 * on sale, which is what most of this file needs.
 */
const PROPHET: PurchasableItem = { kind: 'unit', id: 'prophet' };
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
      bumpRevision(state);
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
  it('marks the holy orders purchase-only, and nothing else in the roster', () => {
    // The rule the city panel filters its unit list with, and it is read off the
    // roster row rather than off a name.
    expect(isPurchaseOnly(PROPHET)).toBe(true);
    expect(isPurchaseOnly(AUGUR)).toBe(true);
    expect(isPurchaseOnly(WARRIOR)).toBe(false);
    expect(isPurchaseOnly(GRANARY)).toBe(false);
  });

  it('refuses the production queue with the bank named, even with the tech', () => {
    const g = game();
    learn(g.state, 0, 'theHighTemple');
    const city = found(g.state, 0);

    // The reducer's own sentence, and the one the panel would have to grey a row
    // with if it drew one at all.
    const blocked = buildError(g.state, 0, 'unit', 'prophet');
    expect(blocked).toMatch(/not built/);
    expect(blocked).toMatch(/faith/);

    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'unit', id: 'prophet' }],
    } as Command);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(blocked);
    // A refused command is a command that never happened.
    expect(snapshotState(g.state)).toEqual(before);
    expect(city.queue).toHaveLength(0);
  });

  it('refuses a withdrawn row before the bank is ever named', () => {
    // The augur went with the fewer-things pass and the row is kept for replay
    // (`UnitDef.retired`). Its own sentence stands in front of the bank's,
    // because "bought with faith, not gold" would send a player to a bank that
    // no longer sells it.
    const g = game();
    learn(g.state, 0, 'divination');
    const city = found(g.state, 0);
    playerById(g.state, 0)!.faithPool = 500;
    expect(buildError(g.state, 0, 'unit', 'augur')).toBe('Augurs are no longer called');
    expect(purchaseError(g.state, 0, city.id, AUGUR, 'faith')).toBe(
      'A Augur is no longer called',
    );
  });

  it('offers it in the bank it is actually sold in, with a verb off its row', () => {
    // What the city panel's foot-of-the-units row prints. The verb is data, so a
    // prophet is *called* and a mercenary would be *hired* without this file (or
    // the panel) learning either name.
    expect(purchaseVerb(PROPHET)).toBe('Call a prophet');
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
    // difference it makes — which is what lets the ladder and the column
    // through. The first line is the row's **size** since batch P1, because
    // that is what the row says about its price.
    expect(price.lines[0]!.source).toBe('Light unit');
    expect(price.lines[price.lines.length - 1]!.source).toBe(`×${RATE} in gold`);
  });

  it('prices a building off its folded cost, size and column and all', () => {
    // **Re-aimed 2026-09-06** (`docs/flags.md` item y), and again in batch P1.
    // It used to be the row's flat `cost` — a building had no fold, so the tag
    // converted the printed figure. A building's price is now
    // `explainBuildingCost`: its size, then what the tree's column does to it,
    // and the purchase converts *that*. The till and the basket ask the same
    // evaluator, which is the whole of `explainPurchaseCost`'s second shape.
    const g = game();
    const city = found(g.state, 0);
    const price = explainPurchaseCost(g.state, 0, city.id, GRANARY, 'gold')!;
    expect(price.total).toBe(buildingProductionCost('granary') * RATE);
    // And the fold is the row's size, never a number on the row — which no
    // longer carries one at all.
    expect(buildingProductionCost('granary')).toBe(
      RULES.production.sizeHammers[buildingDef('granary').size],
    );
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
    // The roster's own price — the ladder is what this case is about, and it
    // starts from the sized figure (batch P1).
    expect(before).toBe(unitRosterCost('worker'));
    expect(dispatch(g, buyCommand(city.id, WORKER)).ok).toBe(true);
    expect(player.unitsBuilt.worker).toBe(1);
    expect(player.unitsBuilt.settler).toBeUndefined();
    // The empire's *next* worker is dearer; its settler ladder never moved.
    expect(unitProductionCost(g.state, 0, 'worker')).toBeGreaterThan(before);
    expect(unitProductionCost(g.state, 0, 'settler')).toBe(unitRosterCost('settler'));
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
    learn(g.state, 0, 'theHighTemple');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 500;
    player.gold = 4000;

    expect(dispatch(g, buyCommand(city.id, WARRIOR)).ok).toBe(true);
    expect(dispatch(g, buyCommand(city.id, WORKER)).ok).toBe(true);
    expect(dispatch(g, buyCommand(city.id, PROPHET, 'faith')).ok).toBe(true);
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
    const prophetBlocked = dispatch(g, buyCommand(city.id, PROPHET, 'faith'));
    expect(prophetBlocked.ok).toBe(false);
    expect(prophetBlocked.ok === false && prophetBlocked.error).toMatch(
      /already bought a unit with faith this turn/,
    );
  });

  it('still buys a prophet with faith, into the same routine', () => {
    const g = game();
    learn(g.state, 0, 'theHighTemple');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.faithPool = 200;

    expect(dispatch(g, buyCommand(city.id, PROPHET, 'faith')).ok).toBe(true);
    expect(bankOf(player, 'faith')).toBe(80);
    expect(player.prophetsPurchased).toBe(1);
    expect(g.state.units.some((u) => u.type === 'prophet')).toBe(true);
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
        command: buyCommand(city.id, PROPHET, 'gold'),
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
    bumpRevision(g.state);
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
    bumpRevision(g.state);
    expect(explainPurchaseCost(g.state, 0, city.id, GRANARY, 'gold')!.total).toBe(bare.total);
  });
});

// --- determinism -------------------------------------------------------------

// --- the Cathedral's faith bank ---------------------------------------------

/**
 * **The faith bank a building opens** — the Reliquary's until the fewer-things
 * cut, the **Cathedral's** since (`docs/history/fewer-things.md` §2: the Reliquary is
 * withdrawn and its door moves onto the row that was always the faith line's
 * house).
 *
 * The whole point of the marker is that it is a marker: nothing in `src/sim/`
 * ever named the Reliquary, so moving the door was one field in one JSON row and
 * every claim below reads identically. Three claims, and they are the three the
 * docblock on `faithBankOpen` makes: units only, never a row that names its own
 * bank, and the rate is the one a contribution already buys a hammer at.
 */
describe('a town holding a Cathedral sells its units for faith', () => {
  const CATHEDRAL: PurchasableItem = { kind: 'building', id: 'cathedral' };
  const FAITH_RATE = RULES.production.faithPerHammer;

  /** A town with the stones standing in it, and a full faith bank. */
  function withReliquary() {
    const g = game();
    learn(g.state, 0, 'divination', 'theHighTemple', 'theology');
    const city = found(g.state, 0);
    city.buildings.push('cathedral');
    bumpRevision(g.state);
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

  it('sells no building out of it, and does not overrule the prophet’s own bank', () => {
    const { g, city } = withReliquary();
    // Units only: a granary bought with faith would make the Reliquary a second,
    // quieter treasury.
    expect(explainPurchaseCost(g.state, 0, city.id, GRANARY, 'faith')).toBeNull();
    expect(applyCommand(g.state, buyCommand(city.id, GRANARY, 'faith')).ok).toBe(false);
    // The prophet still names its own bank, and is still refused gold there.
    expect(explainPurchaseCost(g.state, 0, city.id, PROPHET, 'faith')?.currency).toBe('faith');
    const refused = applyCommand(g.state, buyCommand(city.id, PROPHET, 'gold'));
    expect(refused.ok === false && refused.error).toMatch(/bought with faith, not gold/);
  });

  it('is a build row like any other, unlocked by Theology', () => {
    const g = game();
    const city = found(g.state, 0);
    expect(isPurchaseOnly(CATHEDRAL)).toBe(false);
    expect(gatingTech('building', 'cathedral')).toBe('theology');
    expect(buildError(g.state, 0, 'building', 'cathedral', city)).not.toBeNull();
    learn(g.state, 0, 'divination', 'theHighTemple', 'theology');
    expect(buildError(g.state, 0, 'building', 'cathedral', city)).toBeNull();
    // The happiness is the row's own plain field, as it always was.
    expect(buildingDef('cathedral').happiness).toBe(3);
    // A **word** since the charters (2026-09-04): the Almshouse opens the same
    // bank for civilians alone, so the marker names whose roster it sells.
    expect(buildingDef('cathedral').faithPurchases).toBe('all');
  });

  it('leaves the withdrawn Reliquary in the table and out of every queue', () => {
    // The cut's whole discipline in one claim: the row is **kept** so a save
    // that raised one still replays, and refused so nobody raises another. Its
    // own door is gone with it — a town holding a Reliquary and nothing else
    // sells no unit for faith, because the marker went with the row.
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'divination', 'theHighTemple', 'theology', 'theHolyOffice');
    expect(buildingDef('reliquary').retired).toBe(true);
    expect(buildError(g.state, 0, 'building', 'reliquary', city)).toBe('The Reliquary is no longer built');
    const before = snapshotState(g.state);
    const refused = applyCommand(g.state, buyCommand(city.id, { kind: 'building', id: 'reliquary' }, 'gold'));
    expect(refused.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('pays a quarter more faith in the town the High Temple stands in', () => {
    // The clause the Reliquary used to carry, re-homed on one of the five
    // uniques (`docs/history/tech-gifts.md` §7) and written the same way: an ordinary
    // `percentYields` scoped to the building, read through the empire's own
    // walk because a `oncePerEmpire` row belongs to it. Nothing in the evaluator
    // learned a building's name either time, which is why the move was a JSON
    // edit.
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('shrine', 'temple');
    bumpRevision(g.state);
    const before = foldCity(g.state, city).faith;
    expect(before).toBeGreaterThan(0);
    city.buildings.push('highTemple');
    bumpRevision(g.state);
    // Exact since batch X: a quarter more on three faith is three and three
    // quarters, and the pool keeps the three quarters.
    expect(foldCity(g.state, city).faith).toBe((before * 125) / 100);
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
    expect(snapshotState(g.state)).toEqual(before);
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
      expect(snapshotState(g.state)).toEqual(before);
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

/**
 * **A building may name its own bank** (batch B3, the four faith houses).
 *
 * `UnitDef.purchase`'s one sentence — *a row that names its own bank is sold out
 * of that bank and no other* — read of a building for the first time. What is
 * asserted here is the transaction: which bank, at what price, refused how. Who
 * may have the row at all and in which town it may stand are the belief's
 * questions and are tested where the belief is (`religion.test.ts`).
 */
describe('a building that names its own bank', () => {
  /** The four rows, off the marker rather than off their names. */
  const HOUSES = BUILDING_IDS.filter((id) => buildingDef(id).purchase !== undefined);

  it('is sold out of that bank, at the ordinary price converted', () => {
    const g = game();
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!);
    playerById(g.state, 0)!.faithPool = 900;
    expect(HOUSES.length).toBeGreaterThan(0);

    for (const id of HOUSES) {
      const item: PurchasableItem = { kind: 'building', id };
      const bank = buildingDef(id).purchase!.currency;
      const other = bank === 'faith' ? 'gold' : 'faith';
      // The other bank does not sell it at all — `null`, not a dearer price.
      expect(explainPurchaseCost(g.state, 0, city.id, item, other), id).toBe(null);
      const price = explainPurchaseCost(g.state, 0, city.id, item, bank)!;
      expect(price.currency, id).toBe(bank);
      // **No figure on the row**: the price is `explainBuildingCost`'s own list
      // with the conversion as one more line, so the column and the age band
      // ride in exactly as they do for a building bought with gold.
      const hammers = buildingProductionCost(id, g.state, 0);
      const rate =
        bank === 'faith' ? RULES.production.faithPerHammer : RULES.production.goldPerHammer;
      expect(price.total, id).toBe(Math.floor(hammers * rate));
      // Rule 5, for a price.
      expect(price.lines.reduce((sum, line) => sum + line.amount, 0), id).toBe(price.total);
    }
  });

  it('says which bank it is priced in when the wrong coin is offered', () => {
    const g = game();
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!);
    playerById(g.state, 0)!.gold = 9000;
    for (const id of HOUSES) {
      const bank = buildingDef(id).purchase!.currency;
      const other = bank === 'faith' ? 'gold' : 'faith';
      expect(purchaseError(g.state, 0, city.id, { kind: 'building', id }, other), id).toBe(
        `A ${buildingDef(id).name} is bought with ${bank}, not ${other}`,
      );
    }
  });

  it('is never also hammerable — a named bank and a queue would be two prices', () => {
    // The augur's argument one table over: a row sold out of a special bank that
    // a town could also labour its way to would make the bank a suggestion. So
    // every row naming one carries `purchaseOnly` too, and `buildError` is the
    // sentence the queue is refused with.
    for (const id of HOUSES) {
      expect(buildingDef(id).purchaseOnly, id).toBe(true);
      expect(buildingDef(id).wonder, id).toBeUndefined();
    }
  });
});

describe('the schema witness', () => {
  it('carries the version that says a puppet buys nothing', () => {
    // v58: two clauses, one in `purchaseError` and one in `tilePurchaseError`.
    // A legality reversal rather than a table that moved — a v57 log may
    // contain a puppet's purchase this reducer refuses, so it is a different
    // game rather than an older one. The other eleven witnesses are listed in
    // `test/sim/state.test.ts`'s own migration note.
    // 71 since batch C1 (2026-09-06): the dice leave; the faith ladder and the reroll arrive.
    // 73 since batch D (2026-09-06): the buildings cut with chains — twelve
    // ordinary rows withdrawn, five uniques added, the chain field, the
    // Throne's per-unit rebate and the base beaker halved. 74 since batch C2
    // landed the rites beside it on the same day.
    // 75 since batch X (2026-09-06): yields are exact — no fold floors, every
    // bank and pool holds the fraction, so a v74 log banks different figures
    // from its second turn on.
    expect(SCHEMA_VERSION).toBe(98);
  });
});
