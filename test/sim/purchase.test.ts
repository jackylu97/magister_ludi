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
 *     does: the spawn convention, `settlersBuilt`, the completion riders and the
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
import { buildingDef } from '../../src/sim/buildingData';
import {
  foundCityAt,
  queueItemName,
  unitProductionCost,
} from '../../src/sim/cities';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { getTileAt, tileHex, wrappedDistance } from '../../src/sim/map';
import {
  type PurchasableItem,
  bankOf,
  explainPurchaseCost,
  isPurchaseOnly,
  purchaseVerb,
} from '../../src/sim/purchase';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, playerById } from '../../src/sim/state';
import { buildError, gatingTech } from '../../src/sim/tech';
import { unitDef } from '../../src/sim/unitData';

// --- harness ----------------------------------------------------------------

const WARRIOR: PurchasableItem = { kind: 'unit', id: 'warrior' };
const SETTLER: PurchasableItem = { kind: 'unit', id: 'settler' };
const GRANARY: PurchasableItem = { kind: 'building', id: 'granary' };
const AUGUR: PurchasableItem = { kind: 'unit', id: 'augur' };
const RATE = RULES.production.goldPerHammer;

function game(seed = 11) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

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

function buyCommand(
  cityId: number,
  item: PurchasableItem,
  currency: 'faith' | 'gold' = 'gold',
  playerId = 0,
): Command {
  return { type: 'purchaseItem', playerId, cityId, item, currency } as Command;
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

  it('carries the settler ladder into the tag, because the ladder is a cost line', () => {
    const g = game();
    const city = found(g.state, 0);
    const first = explainPurchaseCost(g.state, 0, city.id, SETTLER, 'gold')!;

    playerById(g.state, 0)!.settlersBuilt += 1;
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
    expect(player.settlersBuilt).toBe(1);
    // The empire's *next* settler is dearer from this instant, bought or built.
    expect(unitProductionCost(g.state, 0, 'settler')).toBeGreaterThan(before);
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
});

// --- determinism -------------------------------------------------------------

describe('determinism', () => {
  it('replays a log with purchases in it, byte for byte', () => {
    // Every act is a **command** and the treasury is earned rather than handed
    // over, because a save is `{config, log}` and nothing else: a game whose
    // gold arrived by reaching into the state is a game the replay cannot
    // reproduce, and it would prove nothing about the command.
    const live = game();
    const settler = live.state.units.find((u) => unitDef(u.type).foundsCity)!;
    expect(
      dispatch(live, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id } as Command).ok,
    ).toBe(true);
    const town = live.state.cities[0]!;

    for (let turn = 0; turn < 40; turn++) {
      dispatch(live, { type: 'endTurn', playerId: 0 } as Command);
      dispatch(live, { type: 'endTurn', playerId: 1 } as Command);
    }
    expect(playerById(live.state, 0)!.gold).toBeGreaterThan(
      explainPurchaseCost(live.state, 0, town.id, WARRIOR, 'gold')!.total,
    );

    expect(dispatch(live, buyCommand(town.id, WARRIOR)).ok).toBe(true);
    dispatch(live, { type: 'endTurn', playerId: 0 } as Command);
    dispatch(live, { type: 'endTurn', playerId: 1 } as Command);
    expect(dispatch(live, buyCommand(town.id, WARRIOR)).ok).toBe(true);

    const replayed = replay(live.config, live.log);
    expect(snapshotState(replayed)).toEqual(snapshotState(live.state));
  });
});
