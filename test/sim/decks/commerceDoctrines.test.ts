/**
 * **Doctrine batch DT3: Commerce's Doctrines that need no new shape**
 * (`docs/plans/doctrines-build-triage.md`). `commerce.test.ts` holds the rows to
 * the sheet. This file checks that each row pays what its text says, in a real
 * fold, and that each drawback bites.
 *
 * Batch DT6 adds The Laurion Leases and The Muda. Batch DT7 adds The Forbidden
 * Silks, The Flying Money and The Sea Ban, whose refusals are checked at the gates
 * and through the reducer. Batch DT8 adds The Opera del Duomo. Batch DT18 adds The
 * Grand Canal, the deck's last Doctrine.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { scoreCard } from '../../../src/ai/council';
import { scoreEffects } from '../../../src/ai/value';
import { arriveOnTile } from '../../../src/sim/arrival';
import { cityBlockaded } from '../../../src/sim/blockade';
import { explainCardImpact } from '../../../src/sim/cardImpact';
import {
  channelSurplus,
  explainFoodCarried,
  explainGrowthPercent,
  explainTilePurchase,
  explainUnitCost,
  foldFoodCarried,
  foldGrowthPercent,
  foldTilePrice,
  foldUnitCost,
  foodAlongRoute,
  foundCityAt,
  growthSurplus,
  refreshCityDerived,
  surplusShareCarried,
  tilePurchasePrice,
} from '../../../src/sim/cities';
import { attackTargetAt } from '../../../src/sim/combat';
import { type Command, applyCommand } from '../../../src/sim/commands';
import { luxuryLendingBan, proposePeaceError } from '../../../src/sim/diplomacy';
import { pruneDeals } from '../../../src/sim/deals';
import { raiseImprovement, tileIndex } from '../../../src/sim/map';
import { explainAuthority, explainFoundingCost, explainHappiness, happinessOf } from '../../../src/sim/meters';
import {
  contributeError,
  explainContribution,
  explainPurchaseCost,
  explainRoutePrice,
  purchaseError,
  routePrice,
} from '../../../src/sim/purchase';
import { foldOnRevision, readRoutes } from '../../../src/sim/readings';
import { layRoad } from '../../../src/sim/roads';
import { explainRouteSenderYield, explainRouteYield, foldRouteYield } from '../../../src/sim/routeYields';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { describeCard, doctrineBagFor, stripRefs } from '../../../src/sim/statecraft';
import {
  cardRenownLines,
  cardRulePercent,
  explainCardPercentYields,
} from '../../../src/sim/statecraft/evaluator';
import {
  type CardEffect,
  type DoctrineId,
  DECK_FILE_DOCTRINES,
  doctrineDef,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { resourceDef } from '../../../src/sim/resourceData';
import {
  endRoutesBannedAbroad,
  hasSendablePair,
  idleTraders,
  routeBannedAbroad,
  routeModesAvailable,
  routeStartable,
  startRouteAt,
} from '../../../src/sim/trade';
import { runEndOfTurn } from '../../../src/sim/turn';
import { openWar } from '../../../src/sim/wars';
import { cityContext, explainTileYield, foldTileLines } from '../../../src/sim/yields/hex';
import { collectYields } from '../../../src/sim/yields/empire';
import { explainCity, explainSurplusMoved, foldCity, productionModifiers } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';
import { lendDoctrineEffects } from '../statecraftHelpers';

/** The rows of batches DT3, DT6, DT7, DT8 and DT18, each with the band its table gives it. */
const ROWS: readonly (readonly [string, number])[] = [
  ['theApoikia', 1],
  ['theLaurionLeases', 1],
  ['theDelianLeague', 1],
  ['theGrandCanal', 2],
  ['theSogdianColonies', 2],
  ['theForbiddenSilks', 2],
  ['theFlyingMoney', 2],
  ['theYearAndADay', 3],
  ['theMuda', 3],
  ['theTurnpikeTrusts', 3],
  ['theSeaBan', 4],
  ['thePeaceOfLodi', 4],
  ['theOperaDelDuomo', 4],
  ['theMonteDiPieta', 4],
];

const TERM = Math.floor(RULES.trade.postEstablishTurns);

/** Lent rows, put back after each test, so a failed test cannot leak one into the next. */
const lent: (() => void)[] = [];
afterEach(() => {
  while (lent.length > 0) lent.pop()!();
});

function seat(state: GameState, id = 0): Player {
  return playerById(state, id)!;
}

/** Gives a seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, id: string, playerId = 0): void {
  seat(state, playerId).statecraft.doctrines.push(id as DoctrineId);
  bumpRevision(state);
}

/** A town of a given size for this seat, with an empty queue. */
function town(state: GameState, col: number, row: number, population = 1, playerId = 0): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** What one hex pays the town working it. */
function hexPays(state: GameState, city: City, col: number, row: number) {
  return foldTileLines(explainTileYield(at(state, col, row), cityContext(state, city)));
}

/** What one town costs seat 0 in authority, as a positive figure. */
function townCost(state: GameState, city: City): number {
  const entry = explainAuthority(state, 0).find(
    (one) => one.part === 'cost' && one.source.startsWith(city.name),
  );
  if (!entry) throw new Error(`no authority line for ${city.name}`);
  return 0 - entry.value;
}

/** Turns a column of hexes into coast, so the towns beside it are coastal. */
function coastAt(state: GameState, col: number): void {
  for (let row = 0; row < state.map.height; row++) at(state, col, row).terrain = 'coast' as never;
  bumpRevision(state);
}

/** The gold price of a unit in a town, and the lines it is the fold of. */
function goldPrice(state: GameState, city: City, id: string) {
  return explainPurchaseCost(state, 0, city.id, { kind: 'unit', id: id as never }, 'gold')!;
}

/**
 * Two towns of seat 0 at peace, with a market in the origin.
 * `commerceRoutes.test.ts`' fixture, with the trader left to the test, and with
 * towns large enough that a road pays each voice more than a share rounds away.
 */
function homePair(): { state: GameState; home: City; other: City } {
  const state = bareState(24, 9);
  state.wars = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const other = foundCityAt(state, 0, at(state, 10, 4));
  home.buildings.push('market', 'granary', 'library', 'monument', 'barracks');
  home.population = 50;
  other.population = 50;
  bumpRevision(state);
  return { state, home, other };
}

/** A caravan of seat 0 running from `from` to `to`. */
function running(state: GameState, from: City, to: City): Unit {
  const trader = createUnit(state, 0, 'trader', from.col, from.row);
  const result = applyCommand(state, {
    type: 'startRoute',
    playerId: 0,
    unitId: trader.id,
    fromCityId: from.id,
    toCityId: to.id,
  });
  if (!result.ok) throw new Error(result.error);
  bumpRevision(state);
  return trader;
}

describe('batch DT3: Commerce’s rows', () => {
  it('deals each row at its tier, from the Commerce bag and no other', () => {
    for (const [id, band] of ROWS) {
      const def = doctrineDef(id as DoctrineId);
      expect(def.band, id).toBe(band);
      expect(def.decks, id).toEqual(['commerce']);
      expect(def.retired, id).toBeUndefined();
      expect(poolDoctrines(def.tier), id).toContain(id);
    }
    expect([...DECK_FILE_DOCTRINES.commerce].sort()).toEqual(ROWS.map(([id]) => id).sort());
  });

  it('offers a Commerce seat its rows when it adopts a tier-4 government', () => {
    const g = createGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'Musa', color: '#a00', isHuman: true, leader: 'mansaMusa' },
        { name: 'Bors', color: '#00a', isHuman: true, leader: 'taizong' },
      ],
    });
    expect(doctrineBagFor(g.state, seat(g.state), 4)).toEqual(
      expect.arrayContaining(['theApoikia', 'theDelianLeague']),
    );
    expect(doctrineBagFor(g.state, seat(g.state, 1), 4)).not.toContain('theApoikia');
  });

  it('gives the bots a finite price for every row, and the impact stamp reads each one', () => {
    const { state } = homePair();
    const player = seat(state);
    for (const [id] of ROWS) {
      const score = scoreCard(player, id as never, valueContext(state, player));
      expect(Number.isFinite(score), id).toBe(true);
      expect(() => explainCardImpact(state, 0, { kind: 'doctrine', id: id as DoctrineId }), id).not.toThrow();
    }
  });
});

describe('The Apoikia', () => {
  it('halves the gold price of settlers and workers, and of nothing else', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const settler = goldPrice(state, city, 'settler').total;
    const worker = goldPrice(state, city, 'worker').total;
    const warrior = goldPrice(state, city, 'warrior').total;
    hold(state, 'theApoikia');
    expect(goldPrice(state, city, 'settler').total).toBe(Math.floor(settler / 2));
    expect(goldPrice(state, city, 'worker').total).toBe(Math.floor(worker / 2));
    expect(goldPrice(state, city, 'warrior').total).toBe(warrior);
    // Rule 5: the line is named, and the price is the fold of the lines.
    const lines = goldPrice(state, city, 'settler').lines;
    expect(lines.some((line) => line.source.includes('The Apoikia'))).toBe(true);
    expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBe(Math.floor(settler / 2));
  });

  it('leaves the production price alone', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    const hammers = foldUnitCost(explainUnitCost(state, 0, 'settler'));
    hold(state, 'theApoikia');
    expect(foldUnitCost(explainUnitCost(state, 0, 'settler'))).toBe(hammers);
  });

  it('has no drawback: it adds no authority, no happiness cost and no other line', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    const before = [explainAuthority(state, 0), explainHappiness(state, 0)];
    hold(state, 'theApoikia');
    expect([explainAuthority(state, 0), explainHappiness(state, 0)]).toEqual(before);
  });
});

describe('The Delian League', () => {
  it('takes 1 off the authority of a coastal town, and off no inland town', () => {
    const state = bareState(24, 10);
    coastAt(state, 9);
    town(state, 2, 2);
    const shore = town(state, 8, 5);
    const inland = town(state, 18, 5);
    const coastal = townCost(state, shore);
    const founded = townCost(state, inland);
    hold(state, 'theDelianLeague');
    expect(townCost(state, shore)).toBe(coastal - 1);
    expect(townCost(state, inland)).toBe(founded);
  });

  it('keeps a coastal capital free, and discounts a captured and a puppet coastal town (batch DT19c)', () => {
    const state = bareState(30, 10);
    coastAt(state, 9);
    const capital = town(state, 8, 2);
    const taken = town(state, 10, 7);
    taken.captured = true;
    const puppet = town(state, 10, 3);
    puppet.captured = true;
    puppet.puppet = true;
    bumpRevision(state);
    expect(townCost(state, taken)).toBe(4);
    expect(townCost(state, puppet)).toBe(3);
    hold(state, 'theDelianLeague');
    expect(townCost(state, capital)).toBe(0);
    expect(townCost(state, taken)).toBe(3);
    expect(townCost(state, puppet)).toBe(2);
  });

  describe('with The Highland Clans, on a coastal town on hills (batch DT19c)', () => {
    /** A capital inland, and a town on hills beside the coast. */
    function shoreHill(): { state: GameState; hill: City } {
      const state = bareState(24, 10);
      coastAt(state, 9);
      town(state, 2, 2);
      at(state, 8, 5).hills = true;
      const hill = town(state, 8, 5);
      return { state, hill };
    }

    it('takes 1 under either Doctrine and 2 under both', () => {
      const { state, hill } = shoreHill();
      // The ladder prices it at the founded price. It priced a coastal town as
      // a cheaper port until batch TT1 removed the coastal discount
      // (`docs/flags.md` (iiiiiii)).
      expect(townCost(state, hill)).toBe(3);
      hold(state, 'theHighlandClans');
      expect(townCost(state, hill)).toBe(2);
      hold(state, 'theDelianLeague');
      expect(townCost(state, hill)).toBe(1);
    });

    it('takes 1 under The Delian League alone', () => {
      const { state, hill } = shoreHill();
      hold(state, 'theDelianLeague');
      expect(townCost(state, hill)).toBe(2);
    });

    it('quotes the same price on the founding preview', () => {
      const state = bareState(24, 10);
      coastAt(state, 9);
      town(state, 2, 2);
      at(state, 8, 5).hills = true;
      bumpRevision(state);
      const quote = () =>
        0 - explainFoundingCost(state, 0, at(state, 8, 5)).find((one) => one.meter === 'authority')!.value;
      expect(quote()).toBe(3);
      hold(state, 'theHighlandClans');
      hold(state, 'theDelianLeague');
      expect(quote()).toBe(1);
      expect(townCost(state, town(state, 8, 5))).toBe(1);
    });

    it('holds a row that prints a minimum to it, and adds a surcharge back', () => {
      const { state, hill } = shoreHill();
      hold(state, 'theHighlandClans');
      // The Commanderies prints "minimum one": from 2 its discount takes 1.
      hold(state, 'theCommanderies');
      expect(townCost(state, hill)).toBe(1);
      // Under both, the two discounts with no minimum bring the town to 1, and
      // The Commanderies' minimum keeps it there.
      hold(state, 'theDelianLeague');
      expect(townCost(state, hill)).toBe(1);
      // The Mandarinate's +1 cancels The Commanderies' -1, so the town stays at 1.
      hold(state, 'theMandarinate');
      expect(townCost(state, hill)).toBe(1);
    });
  });

  it('quotes the cheaper town on the founding preview, and no cheaper inland', () => {
    const state = bareState(24, 10);
    coastAt(state, 9);
    town(state, 2, 2);
    const quote = (col: number) =>
      explainFoundingCost(state, 0, at(state, col, 5)).find((one) => one.meter === 'authority')!.value;
    const before = quote(8);
    const inland = quote(18);
    hold(state, 'theDelianLeague');
    expect(quote(8)).toBe(before + 1);
    expect(quote(18)).toBe(inland);
  });

  it('pays +3 production in a coastal town, and nothing inland', () => {
    const state = bareState(24, 10);
    coastAt(state, 9);
    const shore = town(state, 8, 5, 3);
    const inland = town(state, 18, 5, 3);
    const before = [explainCity(state, shore).flats.production, explainCity(state, inland).flats.production];
    hold(state, 'theDelianLeague');
    expect(explainCity(state, shore).flats.production).toBe(before[0]! + 3);
    expect(explainCity(state, inland).flats.production).toBe(before[1]!);
  });
});

describe('The Sogdian Colonies', () => {
  /** Seat 0's two towns, the first holding its established post. */
  function posted(): { state: GameState; holding: City; plain: City } {
    const state = bareState(24, 9);
    state.wars = [];
    const holding = town(state, 3, 4, 3);
    const plain = town(state, 12, 4, 3);
    holding.posts = [{ by: 0, since: state.turn - TERM }];
    bumpRevision(state);
    return { state, holding, plain };
  }

  it('pays +3 culture in a town holding your post, and nothing elsewhere', () => {
    const { state, holding, plain } = posted();
    const before = [explainCity(state, holding).flats.culture, explainCity(state, plain).flats.culture];
    hold(state, 'theSogdianColonies');
    expect(explainCity(state, holding).flats.culture).toBe(before[0]! + 3);
    expect(explainCity(state, plain).flats.culture).toBe(before[1]!);
  });

  it('pays +3 renown toward merchants for each such town', () => {
    const { state, plain } = posted();
    hold(state, 'theSogdianColonies');
    const lines = () => cardRenownLines(state, 0).filter((line) => line.card === 'theSogdianColonies');
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toEqual(expect.objectContaining({ amount: 3, family: 'merchant' }));
    // A second post makes a second town: the trickle follows the count.
    plain.posts = [{ by: 0, since: state.turn - TERM }];
    bumpRevision(state);
    expect(lines()[0]!.amount).toBe(6);
  });

  it('pays nothing while a foreign hull blockades the town (reading 20)', () => {
    const state = bareState(24, 9);
    coastAt(state, 4);
    const holding = town(state, 3, 4, 3);
    holding.posts = [{ by: 0, since: state.turn - TERM }];
    bumpRevision(state);
    const before = explainCity(state, holding).flats.culture;
    hold(state, 'theSogdianColonies');
    expect(explainCity(state, holding).flats.culture).toBe(before + 3);
    // A heavy hull of another seat stands off the harbour.
    createUnit(state, 1, 'carrack', 4, 4);
    bumpRevision(state);
    expect(cityBlockaded(state, holding)).toBe(true);
    expect(explainCity(state, holding).flats.culture).toBe(before);
    expect(cardRenownLines(state, 0).filter((line) => line.card === 'theSogdianColonies')).toEqual([]);
  });

  it('pays nothing for a post still in its term, or for a post in a foreign town', () => {
    const state = bareState(24, 9);
    state.wars = [];
    const young = town(state, 3, 4, 3);
    const foreign = town(state, 12, 4, 3, 1);
    young.posts = [{ by: 0, since: state.turn }];
    foreign.posts = [{ by: 0, since: state.turn - TERM }];
    bumpRevision(state);
    const before = [explainCity(state, young).flats.culture, explainCity(state, foreign).flats.culture];
    hold(state, 'theSogdianColonies');
    expect(explainCity(state, young).flats.culture).toBe(before[0]!);
    expect(explainCity(state, foreign).flats.culture).toBe(before[1]!);
    expect(cardRenownLines(state, 0).filter((line) => line.card === 'theSogdianColonies')).toEqual([]);
  });
});

describe('The Year and a Day', () => {
  it('grows a town a domestic route reaches 25% faster, and every other town 25% more slowly', () => {
    const { state, home, other } = homePair();
    const third = town(state, 18, 4, 3);
    running(state, home, other);
    const growth = (city: City) => foldGrowthPercent(explainGrowthPercent(state, city));
    const before = [growth(home), growth(other), growth(third)];
    hold(state, 'theYearAndADay');
    // The route arrives at `other`. The town it leaves has no route ending there.
    expect(growth(other)).toBe(before[1]! + 25);
    expect(growth(home)).toBe(before[0]! - 25);
    expect(growth(third)).toBe(before[2]! - 25);
  });

  it('counts a foreign route as no route, and does not reach the partner’s town', () => {
    const state = bareState(24, 9);
    state.wars = [];
    const home = town(state, 3, 4, 3);
    home.buildings.push('market');
    const partner = town(state, 10, 4, 3, 1);
    partner.buildings.push('market');
    createUnit(state, 1, 'worker', 3, 3);
    createUnit(state, 0, 'worker', 10, 3);
    bumpRevision(state);
    // A foreign caravan arrives at seat 0's town. It is not a domestic route.
    const trader = createUnit(state, 1, 'trader', partner.col, partner.row);
    const started = applyCommand(state, {
      type: 'startRoute',
      playerId: 1,
      unitId: trader.id,
      fromCityId: partner.id,
      toCityId: home.id,
    });
    if (!started.ok) throw new Error(started.error);
    bumpRevision(state);
    const growth = (city: City) => foldGrowthPercent(explainGrowthPercent(state, city));
    const before = [growth(home), growth(partner)];
    hold(state, 'theYearAndADay');
    expect(growth(home)).toBe(before[0]! - 25);
    expect(growth(partner)).toBe(before[1]!);
  });
});

describe('The Turnpike Trusts', () => {
  it('halves the price of a caravan in `explainRoutePrice`, as a labelled last line', () => {
    const { state, home } = homePair();
    const plain = foldUnitCost(explainRoutePrice(state, 0, home.id)!);
    hold(state, 'theTurnpikeTrusts');
    const lines = explainRoutePrice(state, 0, home.id)!;
    expect(lines[lines.length - 1]!.source).toContain('The Turnpike Trusts');
    expect(foldUnitCost(lines)).toBe(Math.floor(plain / 2));
  });

  it('halves the whole price, the step for each running route included (batch TR2)', () => {
    // The card applies after the base and the running routes, as its own line.
    const { state, home, other } = homePair();
    const cart = createUnit(state, 0, 'trader', home.col, home.row);
    startRouteAt(state, cart, home, other, 'land');
    bumpRevision(state);
    const stepped = RULES.trade.routePriceBase + RULES.trade.routePricePerRunningRoute;
    expect(routePrice(state, 0, home.id)).toBe(stepped);
    hold(state, 'theTurnpikeTrusts');
    const lines = explainRoutePrice(state, 0, home.id)!;
    expect(lines.map((line) => line.source)).toEqual([
      'Hire a trade route',
      '1 trade route running',
      expect.stringContaining('The Turnpike Trusts'),
    ]);
    expect(foldUnitCost(lines)).toBe(Math.floor(stepped / 2));
  });

  it('charges the halved price when a caravan is bought, and the purse check asks the same figure', () => {
    const { state, home, other } = homePair();
    seat(state).gold = 10_000;
    bumpRevision(state);
    const plain = routePrice(state, 0, home.id);
    hold(state, 'theTurnpikeTrusts');
    const half = Math.floor(plain / 2);
    expect(explainPurchaseCost(state, 0, home.id, { kind: 'route' }, 'gold')!.total).toBe(half);
    const before = seat(state).gold;
    const result = applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: home.id,
      toCityId: other.id,
    });
    expect(result.ok).toBe(true);
    expect(seat(state).gold).toBe(before - half);
  });

  it('lets a seat with only the halved price in its purse buy a caravan', () => {
    const { state, home, other } = homePair();
    const plain = routePrice(state, 0, home.id);
    hold(state, 'theTurnpikeTrusts');
    seat(state).gold = Math.floor(plain / 2);
    bumpRevision(state);
    const result = applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: home.id,
      toCityId: other.id,
    });
    expect(result.ok).toBe(true);
    expect(seat(state).gold).toBe(0);
  });

  it('quotes the Trade screen the price it charges', () => {
    const { state, home } = homePair();
    const plain = readRoutes(state, 0).price;
    hold(state, 'theTurnpikeTrusts');
    expect(readRoutes(state, 0).price).toBe(Math.floor(plain / 2));
    expect(readRoutes(state, 0).price).toBe(routePrice(state, 0, home.id));
  });

  it('pays +1 gold on a hex with a road, and nothing on a hex without one', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    layRoad(at(state, 5, 4), 0);
    bumpRevision(state);
    const paved = hexPays(state, city, 5, 4);
    const bare = hexPays(state, city, 6, 5);
    hold(state, 'theTurnpikeTrusts');
    expect(hexPays(state, city, 5, 4)).toEqual({ ...paved, gold: paved.gold + 1 });
    expect(hexPays(state, city, 6, 5)).toEqual(bare);
  });

  it('pays a road hex that also holds a work', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const site = at(state, 5, 4);
    layRoad(site, 0);
    raiseImprovement(site, 'farm', 0);
    bumpRevision(state);
    const before = hexPays(state, city, 5, 4);
    hold(state, 'theTurnpikeTrusts');
    expect(hexPays(state, city, 5, 4).gold).toBe(before.gold + 1);
  });
});

describe('The Peace of Lodi', () => {
  /** Every voice of a caravan's pay, once the road has a card on it. */
  function pay(state: GameState, trader: Unit) {
    return foldRouteYield(explainRouteYield(state, trader));
  }

  it('pays 50% more on a route while the seat is at peace', () => {
    const { state, home, other } = homePair();
    const trader = running(state, home, other);
    const before = pay(state, trader);
    expect(before.gold).toBeGreaterThanOrEqual(4);
    hold(state, 'thePeaceOfLodi');
    const after = pay(state, trader);
    expect(after.gold).toBeGreaterThan(before.gold);
    for (const voice of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      expect(after[voice], voice).toBe(before[voice] + Math.floor((before[voice] * 50) / 100));
    }
    const lines = explainRouteYield(state, trader).filter((line) => line.source.includes('The Peace of Lodi'));
    expect(lines.length).toBe(1);
    expect(lines[0]!.source).toContain('+50%');
  });

  it('pays 25% less on a route while the seat is at war, through a negative share', () => {
    const { state, home, other } = homePair();
    const trader = running(state, home, other);
    openWar(state, 0, 1);
    bumpRevision(state);
    const before = pay(state, trader);
    expect(before.gold).toBeGreaterThanOrEqual(4);
    hold(state, 'thePeaceOfLodi');
    const after = pay(state, trader);
    expect(after.gold).toBeLessThan(before.gold);
    for (const voice of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      // A share is floored, so a negative one takes the whole number below it:
      // a road paying ten keeps seven, the floor of seven and a half.
      expect(after[voice], voice).toBe(before[voice] + Math.floor((before[voice] * -25) / 100));
      expect(after[voice], voice).toBe(Math.floor(before[voice] * 0.75));
    }
    const lines = explainRouteYield(state, trader).filter((line) => line.source.includes('The Peace of Lodi'));
    expect(lines.length).toBe(1);
    expect(lines[0]!.source).toContain('-25%');
  });

  it('changes sides the turn a war opens and the turn it ends', () => {
    const { state, home, other } = homePair();
    const trader = running(state, home, other);
    hold(state, 'thePeaceOfLodi');
    const named = () =>
      explainRouteYield(state, trader).filter((line) => line.source.includes('The Peace of Lodi'))[0]!.source;
    expect(named()).toContain('+50%');
    openWar(state, 0, 1);
    bumpRevision(state);
    expect(named()).toContain('-25%');
    state.wars = [];
    bumpRevision(state);
    expect(named()).toContain('+50%');
  });
});

describe('The Monte di Pietà', () => {
  it('gives +1 happiness for every 200 gold in the treasury, at most +20', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    hold(state, 'theMonteDiPieta');
    const named = (): number =>
      explainHappiness(state, 0)
        .filter((line) => line.source.includes('The Monte di Pietà'))
        .reduce((sum, line) => sum + line.value, 0);
    const purse = (gold: number): number => {
      seat(state).gold = gold;
      bumpRevision(state);
      return named();
    };
    expect(purse(199)).toBe(0);
    expect(purse(200)).toBe(1);
    expect(purse(1000)).toBe(5);
    expect(purse(4000)).toBe(20);
    expect(purse(9000)).toBe(20);
    // A treasury in debt counts nothing, and costs nothing.
    expect(purse(-400)).toBe(0);
  });

  it('takes 10% off a town’s gold, and leaves its other voices alone', () => {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 4);
    addBuilding(state, city, 'market');
    addBuilding(state, city, 'monument');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const before = foldCity(state, city);
    expect(before.gold).toBeGreaterThan(0);
    hold(state, 'theMonteDiPieta');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const after = foldCity(state, city);
    expect(after.gold).toBeLessThan(before.gold);
    expect(after.culture).toBe(before.culture);
    expect(after.production).toBe(before.production);
    expect(explainCardPercentYields(state, city).filter((line) => line.card === 'theMonteDiPieta')).toEqual([
      expect.objectContaining({ yield: 'gold', percent: -10, stage: 'city' }),
    ]);
  });
});

describe('The Laurion Leases (batch DT6)', () => {
  /** A town of seat 0, with three hexes in its second ring: a seam, a hidden seam and plain ground. */
  function ground(): {
    state: GameState;
    city: City;
    seam: { col: number; row: number };
    hidden: { col: number; row: number };
    plain: { col: number; row: number };
  } {
    const state = bareState(24, 10);
    const city = town(state, 5, 5, 3);
    const seam = { col: 7, row: 5 };
    const hidden = { col: 3, row: 5 };
    const plain = { col: 7, row: 3 };
    at(state, seam.col, seam.row).resource = 'wheat';
    at(state, hidden.col, hidden.row).resource = 'iron';
    // The seat has not learned the technology that shows iron.
    const gate = resourceDef('iron').requiresTech!;
    const player = seat(state);
    player.techsResearched = player.techsResearched.filter((id) => id !== gate);
    bumpRevision(state);
    return { state, city, seam, hidden, plain };
  }

  it('halves the price of a hex with a resource, as a labelled line of the list', () => {
    const { state, city, seam } = ground();
    const before = tilePurchasePrice(state, 0, city.id, seam);
    hold(state, 'theLaurionLeases');
    const lines = explainTilePurchase(state, 0, city.id, seam);
    const named = lines.filter((line) => line.source.includes('The Laurion Leases'));
    expect(named).toHaveLength(1);
    expect(tilePurchasePrice(state, 0, city.id, seam)).toBe(Math.floor(before / 2));
    expect(tilePurchasePrice(state, 0, city.id, seam)).toBe(foldTilePrice(lines));
  });

  it('leaves the price of a hex with no resource alone', () => {
    const { state, city, plain } = ground();
    const before = explainTilePurchase(state, 0, city.id, plain);
    hold(state, 'theLaurionLeases');
    expect(explainTilePurchase(state, 0, city.id, plain)).toEqual(before);
  });

  it('charges the full price for a seam the seat cannot see, so the price reveals nothing (reading 18)', () => {
    const { state, city, hidden } = ground();
    const before = tilePurchasePrice(state, 0, city.id, hidden);
    hold(state, 'theLaurionLeases');
    expect(tilePurchasePrice(state, 0, city.id, hidden)).toBe(before);
    expect(
      explainTilePurchase(state, 0, city.id, hidden).filter((line) => line.source.includes('The Laurion Leases')),
    ).toEqual([]);
    // The turn it learns the technology, the seam is cheap. The technology also
    // moves the era line, so the line is read and not the old price.
    seat(state).techsResearched.push(resourceDef('iron').requiresTech!);
    bumpRevision(state);
    const lines = explainTilePurchase(state, 0, city.id, hidden);
    const discount = lines.filter((line) => line.source.includes('The Laurion Leases'));
    expect(discount).toHaveLength(1);
    expect(foldTilePrice(lines)).toBe(Math.floor((foldTilePrice(lines) - discount[0]!.amount) / 2));
  });

  it('is silent to a caller with no hex in hand', () => {
    const { state } = ground();
    hold(state, 'theLaurionLeases');
    expect(cardRulePercent(state, 0, 'tilePurchase')).toEqual([]);
  });

  it('sums with a discount on every hex before one multiplication', () => {
    const { state, city, seam, plain } = ground();
    const before = { seam: tilePurchasePrice(state, 0, city.id, seam), plain: tilePurchasePrice(state, 0, city.id, plain) };
    lent.push(
      lendDoctrineEffects('theApoikia', [{ kind: 'rulePercent', rule: 'tilePurchase', percent: -10 }]),
    );
    hold(state, 'theApoikia');
    hold(state, 'theLaurionLeases');
    expect(tilePurchasePrice(state, 0, city.id, seam)).toBe(Math.floor(before.seam * 0.4));
    expect(tilePurchasePrice(state, 0, city.id, plain)).toBe(Math.floor(before.plain * 0.9));
  });

  it('charges the discounted price when the hex is bought', () => {
    const { state, city, seam } = ground();
    hold(state, 'theLaurionLeases');
    const player = seat(state);
    player.gold = 1000;
    const price = tilePurchasePrice(state, 0, city.id, seam);
    const result = applyCommand(state, { type: 'purchaseTile', playerId: 0, cityId: city.id, col: seam.col, row: seam.row });
    expect(result.ok).toBe(true);
    expect(player.gold).toBe(1000 - price);
  });

  it('prices only the share of the hexes the seat would buy that hold a resource', () => {
    const { state } = ground();
    const player = seat(state);
    player.tilesPurchased = 5;
    state.turn = 20;
    bumpRevision(state);
    const everywhere: CardEffect = { kind: 'rulePercent', rule: 'tilePurchase', percent: -50 };
    const narrow = doctrineDef('theLaurionLeases').effects;
    const whole = scoreEffects([everywhere], valueContext(state, player));
    const part = scoreEffects(narrow, valueContext(state, player));
    expect(whole).toBeGreaterThan(0);
    expect(part).toBeGreaterThanOrEqual(0);
    expect(part).toBeLessThan(whole);
  });
});

describe('The Muda (batch DT6)', () => {
  /**
   * Seat 0's town, seat 0's second town and seat 1's town, all at peace, and the wild
   * as the party at war with everyone. A caravan bound for each of the two towns
   * stands off the town hexes, because an unbeaten city outranks a cart in its gates.
   */
  function roads(): { state: GameState; home: City; other: City; abroad: City; domestic: Unit; foreign: Unit } {
    const state = bareState(30, 9, true);
    state.wars = [];
    const home = foundCityAt(state, 0, at(state, 3, 4));
    const other = foundCityAt(state, 0, at(state, 10, 4));
    const abroad = foundCityAt(state, 1, at(state, 18, 4));
    home.buildings.push('market', 'library');
    for (const city of [home, other, abroad]) city.population = 10;
    const domestic = createUnit(state, 0, 'trader', 5, 2);
    startRouteAt(state, domestic, home, other, 'land');
    const foreign = createUnit(state, 0, 'trader', 5, 6);
    startRouteAt(state, foreign, home, abroad, 'land');
    bumpRevision(state);
    return { state, home, other, abroad, domestic, foreign };
  }

  /** The seat of the wild, which is at war with everyone. */
  function wildSeat(state: GameState): number {
    return state.players.find((player) => player.barbarian === true)!.id;
  }

  it('pays the sender +3 science and +3 culture on a route abroad, and nothing on a route at home', () => {
    const { state, domestic, foreign } = roads();
    const senderPays = (unit: Unit) => foldRouteYield(explainRouteSenderYield(state, unit));
    const beforeHome = foldRouteYield(explainRouteYield(state, domestic));
    const beforeAbroad = senderPays(foreign);
    hold(state, 'theMuda');
    expect(foldRouteYield(explainRouteYield(state, domestic))).toEqual(beforeHome);
    const after = senderPays(foreign);
    expect(after.science).toBe(beforeAbroad.science + 3);
    expect(after.culture).toBe(beforeAbroad.culture + 3);
    expect(after.gold).toBe(beforeAbroad.gold);
    expect(explainRouteSenderYield(state, foreign).filter((line) => line.source.includes('The Muda'))).toHaveLength(1);
  });

  it('takes a caravan abroad off the target list, and leaves a caravan at home on it', () => {
    const { state, domestic, foreign } = roads();
    const wild = wildSeat(state);
    expect(attackTargetAt(state, foreign.col, foreign.row, wild)?.unit?.id).toBe(foreign.id);
    hold(state, 'theMuda');
    expect(attackTargetAt(state, foreign.col, foreign.row, wild)?.unit ?? null).toBeNull();
    expect(attackTargetAt(state, domestic.col, domestic.row, wild)?.unit?.id).toBe(domestic.id);
  });

  it('leaves a caravan abroad standing when something comes to rest on its hex', () => {
    const { state, foreign } = roads();
    hold(state, 'theMuda');
    const raider = createUnit(state, wildSeat(state), 'warrior', foreign.col, foreign.row);
    bumpRevision(state);
    const report = arriveOnTile(state, raider, at(state, foreign.col, foreign.row));
    expect(report.plundered).toHaveLength(0);
    expect(report.captured).toHaveLength(0);
    expect(state.units.find((unit) => unit.id === foreign.id)?.ownerId).toBe(0);
  });

  it('lets an arrival plunder a caravan at home', () => {
    const { state, domestic } = roads();
    hold(state, 'theMuda');
    const raider = createUnit(state, wildSeat(state), 'warrior', domestic.col, domestic.row);
    bumpRevision(state);
    const report = arriveOnTile(state, raider, at(state, domestic.col, domestic.row));
    expect(report.plundered).toHaveLength(1);
    expect(state.units.some((unit) => unit.id === domestic.id)).toBe(false);
  });

  it('stops covering the cart when a war with the destination’s owner ends its route (reading 19)', () => {
    const { state, foreign } = roads();
    hold(state, 'theMuda');
    expect(attackTargetAt(state, foreign.col, foreign.row, 1)?.unit ?? null).toBeNull();
    openWar(state, 0, 1);
    bumpRevision(state);
    expect(attackTargetAt(state, foreign.col, foreign.row, 1)?.unit?.id).toBe(foreign.id);
  });

  it('leaves an unladen trader open to capture, because the rule is about the route', () => {
    const { state, home } = roads();
    hold(state, 'theMuda');
    const idle = createUnit(state, 0, 'trader', home.col + 2, home.row);
    bumpRevision(state);
    expect(attackTargetAt(state, idle.col, idle.row, wildSeat(state))?.unit?.id).toBe(idle.id);
  });

  it('protects only the seat that holds it', () => {
    const { state, abroad, home } = roads();
    hold(state, 'theMuda', 1);
    const theirs = createUnit(state, 1, 'trader', abroad.col + 2, abroad.row);
    startRouteAt(state, theirs, abroad, home, 'land');
    const mine = state.units.find((unit) => unit.ownerId === 0 && unit.trade?.to === abroad.id)!;
    bumpRevision(state);
    expect(attackTargetAt(state, theirs.col, theirs.row, wildSeat(state))?.unit ?? null).toBeNull();
    expect(attackTargetAt(state, mine.col, mine.row, wildSeat(state))?.unit?.id).toBe(mine.id);
  });
});

describe('The Forbidden Silks (batch DT7)', () => {
  /** Seat 0 holds two silks, seat 1 holds two wines, and the two are at peace. */
  function table(): { state: GameState; mine: City; theirs: City } {
    const state = bareState(24, 9);
    state.wars = [];
    const mine = town(state, 3, 4);
    const theirs = town(state, 12, 4, 1, 1);
    const seam = (city: City, col: number, row: number, id: string): void => {
      const tile = at(state, col, row);
      tile.resource = id as never;
      tile.improvement = 'plantation' as never;
      state.tileOwner[tileIndex(state.map, col, row)] = city.id;
    };
    seam(mine, 2, 3, 'silk');
    seam(mine, 4, 5, 'silk');
    seam(theirs, 11, 3, 'wine');
    seam(theirs, 13, 5, 'wine');
    bumpRevision(state);
    return { state, mine, theirs };
  }

  const lends = (playerId: number, targetId: number, id: string): Command => ({
    type: 'proposeDeal',
    playerId,
    targetId,
    give: { luxuries: [id as never] },
    take: {},
  });

  it('doubles what each luxury pays in happiness', () => {
    const { state } = table();
    const silk = (): number =>
      explainHappiness(state, 0)
        .filter((line) => line.source.includes('Silk'))
        .reduce((sum, line) => sum + line.value, 0);
    const before = silk();
    expect(before).toBeGreaterThan(0);
    hold(state, 'theForbiddenSilks');
    expect(silk()).toBe(before * 2);
  });

  it('refuses a new loan in one sentence, and leaves the state byte-identical', () => {
    const { state } = table();
    hold(state, 'theForbiddenSilks');
    const sentence = luxuryLendingBan(state, 0)!;
    expect(sentence).toContain('The Forbidden Silks');
    const before = JSON.stringify(state);
    const result = applyCommand(state, lends(0, 1, 'silk'));
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toBe(sentence);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('binds the seat that gives, so another empire cannot ask it for a luxury', () => {
    const { state } = table();
    hold(state, 'theForbiddenSilks');
    const asked: Command = {
      type: 'proposeDeal',
      playerId: 1,
      targetId: 0,
      give: {},
      take: { luxuries: ['silk' as never] },
    };
    const before = JSON.stringify(state);
    const result = applyCommand(state, asked);
    expect(result.ok ? '' : result.error).toBe(luxuryLendingBan(state, 0));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('lets the seat receive a luxury, and lets it pay in coin', () => {
    const { state } = table();
    hold(state, 'theForbiddenSilks');
    const paid: Command = {
      type: 'proposeDeal',
      playerId: 0,
      targetId: 1,
      give: { gold: 0 },
      take: { luxuries: ['wine' as never] },
    };
    expect(applyCommand(state, paid).ok).toBe(true);
    expect(luxuryLendingBan(state, 1)).toBeNull();
  });

  it('refuses a luxury in a peace paper too', () => {
    const { state } = table();
    openWar(state, 0, 1);
    hold(state, 'theForbiddenSilks');
    expect(proposePeaceError(state, 0, 1, { give: { luxuries: ['silk' as never] }, take: {} })).toBe(
      luxuryLendingBan(state, 0),
    );
  });

  it('refuses at the signing a paper that was written before the Doctrine', () => {
    const { state } = table();
    const asked = applyCommand(state, {
      type: 'proposeDeal',
      playerId: 1,
      targetId: 0,
      give: {},
      take: { luxuries: ['silk' as never] },
    });
    expect(asked.ok).toBe(true);
    const dealId = state.dealProposals[0]!.id;
    hold(state, 'theForbiddenSilks');
    const before = JSON.stringify(state);
    const result = applyCommand(state, { type: 'acceptDeal', playerId: 0, dealId });
    expect(result.ok ? '' : result.error).toBe(luxuryLendingBan(state, 0));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('lets a luxury lent before the Doctrine run out, and then it may not be lent again', () => {
    const { state } = table();
    expect(applyCommand(state, lends(0, 1, 'silk')).ok).toBe(true);
    const dealId = state.dealProposals[0]!.id;
    expect(applyCommand(state, { type: 'acceptDeal', playerId: 1, dealId }).ok).toBe(true);
    const deal = state.deals[0]!;
    hold(state, 'theForbiddenSilks');
    // The ban asks nothing of a deal already signed.
    pruneDeals(state);
    expect(state.deals).toHaveLength(1);
    state.turn = deal.untilTurn;
    pruneDeals(state);
    expect(state.deals).toHaveLength(0);
    bumpRevision(state);
    expect(applyCommand(state, lends(0, 1, 'silk')).ok).toBe(false);
  });

  it('prices the loans the seat loses, and nothing for a seat with none to lend', () => {
    const { state } = table();
    const player = seat(state);
    const rule: CardEffect[] = [{ kind: 'rule', rule: 'noLuxuryLending' }];
    expect(scoreEffects(rule, valueContext(state, player))).toBeLessThan(0);
    const empty = bareState(12, 9);
    expect(scoreEffects(rule, valueContext(empty, seat(empty)))).toBe(0);
  });
});

describe('The Flying Money (batch DT7)', () => {
  const WARRIOR = { kind: 'unit', id: 'warrior' } as const;
  const LIBRARY = { kind: 'building', id: 'library' } as const;

  /** A town with a Market, a town with none, and a full treasury. */
  function board(): { state: GameState; rich: City; plain: City } {
    const state = bareState(30, 10);
    const rich = town(state, 5, 5, 6);
    const plain = town(state, 20, 5, 6);
    addBuilding(state, rich, 'market');
    seat(state).gold = 5000;
    bumpRevision(state);
    return { state, rich, plain };
  }

  const buy = (cityId: number, item: unknown, currency = 'gold'): Command =>
    ({ type: 'purchaseItem', playerId: 0, cityId, item, currency }) as Command;

  it('takes 20% off a gold price in a town with a gold building, as a labelled line', () => {
    const { state, rich } = board();
    const unit = goldPrice(state, rich, 'warrior').total;
    const house = explainPurchaseCost(state, 0, rich.id, LIBRARY, 'gold')!.total;
    hold(state, 'theFlyingMoney');
    const price = goldPrice(state, rich, 'warrior');
    expect(price.total).toBe(Math.floor((unit * 80) / 100));
    expect(price.lines.some((line) => line.source.includes('The Flying Money'))).toBe(true);
    expect(explainPurchaseCost(state, 0, rich.id, LIBRARY, 'gold')!.total).toBe(Math.floor((house * 80) / 100));
  });

  it('sells in a town with a gold building', () => {
    const { state, rich } = board();
    hold(state, 'theFlyingMoney');
    expect(purchaseError(state, 0, rich.id, WARRIOR, 'gold')).toBeNull();
    expect(applyCommand(state, buy(rich.id, WARRIOR)).ok).toBe(true);
  });

  it('refuses a gold unit and a gold building in any other town, in one sentence, byte-identical', () => {
    const { state, plain } = board();
    hold(state, 'theFlyingMoney');
    for (const item of [WARRIOR, LIBRARY]) {
      const sentence = purchaseError(state, 0, plain.id, item, 'gold')!;
      expect(sentence).toContain('The Flying Money');
      expect(sentence).toContain('a city with a gold building');
      expect(sentence).not.toContain('[[');
      const before = JSON.stringify(state);
      const result = applyCommand(state, buy(plain.id, item));
      expect(result.ok ? '' : result.error).toBe(sentence);
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it('opens a shut town the moment it holds a gold building', () => {
    const { state, plain } = board();
    hold(state, 'theFlyingMoney');
    expect(purchaseError(state, 0, plain.id, WARRIOR, 'gold')).not.toBeNull();
    addBuilding(state, plain, 'market');
    bumpRevision(state);
    expect(purchaseError(state, 0, plain.id, WARRIOR, 'gold')).toBeNull();
  });

  it('prints that the rule is about gold, as the user chose on 2026-11-06', () => {
    expect(doctrineDef('theFlyingMoney').text).toBe(
      'Your towns with a gold building buy units and buildings 20% cheaper. Your other towns cannot buy them with gold.',
    );
    // The clause agrees. 'leaves a shut town its faith' holds a faith purchase open.
    expect(describeCard('theFlyingMoney').map((clause) => clause.text)).toContain(
      'units and buildings may be bought with gold only in a city with a gold building',
    );
  });

  it('leaves a shut town its caravans', () => {
    const { state, rich, plain } = board();
    state.wars = [];
    hold(state, 'theFlyingMoney');
    const result = applyCommand(state, {
      type: 'buyRoute',
      playerId: 0,
      fromCityId: plain.id,
      toCityId: rich.id,
      mode: 'land',
    });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
  });

  it('leaves a shut town its hexes', () => {
    const { state, plain } = board();
    hold(state, 'theFlyingMoney');
    const hex = at(state, plain.col + 2, plain.row);
    const result = applyCommand(state, {
      type: 'purchaseTile',
      playerId: 0,
      cityId: plain.id,
      col: hex.col,
      row: hex.row,
    });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
  });

  it('leaves a shut town its faith, at the full faith price', () => {
    const { state, plain } = board();
    seat(state).faithPool = 100_000;
    // A Cathedral opens faith for what the treasury sells.
    addBuilding(state, plain, 'cathedral');
    bumpRevision(state);
    const before = explainPurchaseCost(state, 0, plain.id, WARRIOR, 'faith')!.total;
    hold(state, 'theFlyingMoney');
    expect(purchaseError(state, 0, plain.id, WARRIOR, 'faith')).toBeNull();
    expect(explainPurchaseCost(state, 0, plain.id, WARRIOR, 'faith')!.total).toBe(before);
    expect(applyCommand(state, buy(plain.id, WARRIOR, 'faith')).ok).toBe(true);
  });

  it('keeps the sentence of a row that is not for sale anywhere', () => {
    const { state, plain } = board();
    hold(state, 'theFlyingMoney');
    expect(purchaseError(state, 0, plain.id, { kind: 'unit', id: 'trader' }, 'gold')).toContain('caravan');
  });

  it('prices the rule by the share of towns it shuts, and at nothing when none is shut', () => {
    const { state, plain } = board();
    const player = seat(state);
    const rule = doctrineDef('theFlyingMoney' as DoctrineId).effects.filter((effect) => effect.kind === 'rule');
    const half = scoreEffects(rule, valueContext(state, player));
    expect(half).toBeLessThanOrEqual(0);
    addBuilding(state, plain, 'market');
    bumpRevision(state);
    expect(scoreEffects(rule, valueContext(state, player))).toBe(0);
  });
});

describe('The Sea Ban (batch DT7)', () => {
  /** Two towns of seat 0 and a town of seat 1, at peace and met, with slots to spare. */
  function board(): { state: GameState; home: City; other: City; abroad: City } {
    const state = bareState(30, 9);
    state.wars = [];
    const home = town(state, 3, 4, 10);
    const other = town(state, 10, 4, 10);
    const abroad = town(state, 17, 4, 10, 1);
    home.buildings.push('market', 'market', 'library', 'granary');
    seat(state).metSeats.push(1);
    seat(state).gold = 5000;
    bumpRevision(state);
    return { state, home, other, abroad };
  }

  /** A caravan of seat 0 already on a route, written as a bench writes one. */
  function sent(state: GameState, from: City, to: City): Unit {
    const cart = createUnit(state, 0, 'trader', from.col, from.row);
    startRouteAt(state, cart, from, to, 'land');
    bumpRevision(state);
    return cart;
  }

  it('pays a domestic route twice as much in each voice, and does not touch a route abroad', () => {
    const { state, home, other, abroad } = board();
    const domestic = sent(state, home, other);
    const foreign = sent(state, home, abroad);
    const before = foldRouteYield(explainRouteYield(state, domestic));
    const beforeAbroad = foldRouteYield(explainRouteSenderYield(state, foreign));
    expect(before.food + before.production + before.gold).toBeGreaterThan(0);
    hold(state, 'theSeaBan');
    const after = foldRouteYield(explainRouteYield(state, domestic));
    expect(after.food).toBe(before.food * 2);
    expect(after.production).toBe(before.production * 2);
    expect(after.gold).toBe(before.gold * 2);
    expect(foldRouteYield(explainRouteSenderYield(state, foreign))).toEqual(beforeAbroad);
  });

  it('refuses a new route abroad at both doors, in one sentence, byte-identical', () => {
    const { state, home, abroad } = board();
    expect(routeStartable(state, 0, home.id, abroad.id)).toBeNull();
    hold(state, 'theSeaBan');
    const sentence = routeStartable(state, 0, home.id, abroad.id)!;
    expect(sentence).toContain('The Sea Ban');
    expect(routeModesAvailable(state, 0, home.id, abroad.id)).toEqual([]);

    const cart = createUnit(state, 0, 'trader', home.col, home.row);
    bumpRevision(state);
    const before = JSON.stringify(state);
    const started = applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: cart.id,
      fromCityId: home.id,
      toCityId: abroad.id,
    });
    expect(started.ok ? '' : started.error).toBe(sentence);
    const hired = applyCommand(state, { type: 'buyRoute', playerId: 0, fromCityId: home.id, toCityId: abroad.id });
    expect(hired.ok ? '' : hired.error).toBe(sentence);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('asks the ban before war and before meeting', () => {
    const { state, home, abroad } = board();
    hold(state, 'theSeaBan');
    const sentence = routeStartable(state, 0, home.id, abroad.id);
    seat(state).metSeats.length = 0;
    bumpRevision(state);
    expect(routeStartable(state, 0, home.id, abroad.id)).toBe(sentence);
    openWar(state, 0, 1);
    bumpRevision(state);
    expect(routeStartable(state, 0, home.id, abroad.id)).toBe(sentence);
  });

  it('does not prompt End Turn for a partner the seat may never send to', () => {
    const { state, home, other } = board();
    // Since batch TR1 a Market gives one route at any town size, so the board's
    // two Markets give two routes and the two home pairs below fill them. A
    // third Market leaves one slot free, so a partner is still worth a prompt.
    home.buildings.push('market');
    bumpRevision(state);
    // Every home pair runs, so only the partner abroad is left.
    sent(state, home, other);
    sent(state, other, home);
    expect(hasSendablePair(state, 0)).toBe(true);
    hold(state, 'theSeaBan');
    expect(hasSendablePair(state, 0)).toBe(false);
  });

  it('leaves a route between two of the seat’s own towns open, and binds no other seat', () => {
    const { state, home, other, abroad } = board();
    hold(state, 'theSeaBan');
    expect(routeStartable(state, 0, home.id, other.id)).toBeNull();
    abroad.buildings.push('market');
    seat(state, 1).metSeats.push(0);
    bumpRevision(state);
    expect(routeStartable(state, 1, abroad.id, home.id)).toBeNull();
  });

  it('ends the routes abroad the moment it is adopted, and leaves the carts idle', () => {
    // Batch TR2's reading: a route has no term, so a route already abroad when
    // the ban came would run for ever. Adopting the Doctrine ends it at once.
    const { state, home, other, abroad } = board();
    const domestic = sent(state, home, other);
    const foreign = sent(state, home, abroad);
    seat(state).statecraft.pendingDoctrine = { options: ['theSeaBan' as DoctrineId] };
    const result = applyCommand(state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    if (!result.ok) return;
    expect(result.routesEnded).toEqual([
      { unitId: foreign.id, ownerId: 0, from: home.id, to: abroad.id, ended: 'ban' },
    ]);
    expect(foreign.trade).toBeUndefined();
    expect(idleTraders(state, 0).map((unit) => unit.id)).toEqual([foreign.id]);
    // The cart stays where it stood, and the home route runs on.
    expect([foreign.col, foreign.row]).toEqual([home.col, home.row]);
    expect(domestic.trade).toMatchObject({ from: home.id, to: other.id });
  });

  it('ends nothing for a seat under no ban, and nothing at home under one', () => {
    const { state, home, other, abroad } = board();
    const domestic = sent(state, home, other);
    const foreign = sent(state, home, abroad);
    expect(endRoutesBannedAbroad(state, 0)).toEqual([]);
    expect(foreign.trade).toBeDefined();
    hold(state, 'theSeaBan');
    expect(routeBannedAbroad(state, domestic)).toBe(false);
    expect(routeBannedAbroad(state, foreign)).toBe(true);
  });

  /** One resolution, and the clock moves on, as `endTurn` moves it. */
  function resolve(state: GameState): void {
    runEndOfTurn(state);
    state.turn += 1;
    bumpRevision(state);
  }

  it('ends a route the march finds abroad under the ban, once its far town has changed hands', () => {
    // A route that was at home when the ban came, and runs abroad later: the
    // far town passes to an empire at peace. The march ends it that turn.
    const { state, home, other } = board();
    hold(state, 'theSeaBan');
    const cart = sent(state, home, other);
    other.ownerId = 1;
    bumpRevision(state);
    const report = runEndOfTurn(state);
    expect(report.routesEnded.map((row) => row.ended)).toEqual(['ban']);
    expect(cart.trade).toBeUndefined();
  });

  it('lets the same route run on with no ban, so the ban is what ended it', () => {
    const { state, home, abroad } = board();
    const cart = sent(state, home, abroad);
    for (let turn = 0; turn < 30; turn++) resolve(state);
    expect(cart.trade).toBeDefined();
    expect(routeBannedAbroad(state, cart)).toBe(false);
  });

  it('lets a route run on once its far end has come into the seat’s own hands', () => {
    const { state, home, abroad } = board();
    const cart = sent(state, home, abroad);
    hold(state, 'theSeaBan');
    expect(routeBannedAbroad(state, cart)).toBe(true);
    abroad.ownerId = 0;
    bumpRevision(state);
    expect(routeBannedAbroad(state, cart)).toBe(false);
    resolve(state);
    expect(cart.trade).toBeDefined();
  });

  it('prices the rule at what the routes abroad pay, and at nothing when none runs and none is open', () => {
    const { state, home, abroad } = board();
    const player = seat(state);
    const rule: CardEffect[] = [{ kind: 'rule', rule: 'noForeignRoutes' }];
    const quiet = bareState(12, 9);
    town(quiet, 3, 4);
    expect(scoreEffects(rule, valueContext(quiet, seat(quiet)))).toBe(0);
    sent(state, home, abroad);
    expect(scoreEffects(rule, valueContext(state, player))).toBeLessThan(0);
  });
});

describe('The Opera del Duomo (batch DT8)', () => {
  const GOLD_RATE = RULES.production.goldPerHammer;
  const FAITH_RATE = RULES.production.faithPerHammer;

  /** A town of seat 0 with one row at the front of its queue. */
  function raising(id: string): { state: GameState; city: City } {
    const state = bareState(24, 9);
    const city = town(state, 5, 4, 5);
    city.queue = [{ kind: 'building', id: id as never }];
    seat(state).gold = 100;
    seat(state).faithPool = 100;
    bumpRevision(state);
    return { state, city };
  }

  it('buys twice as many hammers for gold poured into the Magnum Opus', () => {
    const { state, city } = raising('theMagnumOpus');
    const plain = explainContribution(state, 0, city.id, 'gold')!;
    expect(plain).toMatchObject({ rate: GOLD_RATE, hammers: 100 / GOLD_RATE, spend: 100 });
    hold(state, 'theOperaDelDuomo');
    const offer = explainContribution(state, 0, city.id, 'gold')!;
    expect(offer).toMatchObject({ rate: GOLD_RATE / 2, hammers: (2 * 100) / GOLD_RATE, spend: 100 });
  });

  it('does not touch a Cathedral, which takes contributions too (reading 22)', () => {
    const { state, city } = raising('cathedral');
    const plain = explainContribution(state, 0, city.id, 'gold')!;
    hold(state, 'theOperaDelDuomo');
    expect(explainContribution(state, 0, city.id, 'gold')).toEqual(plain);
    expect(plain.rate).toBe(GOLD_RATE);
  });

  it('does not touch faith poured into the Magnum Opus', () => {
    const { state, city } = raising('theMagnumOpus');
    hold(state, 'theOperaDelDuomo');
    expect(explainContribution(state, 0, city.id, 'faith')).toMatchObject({ rate: FAITH_RATE });
  });

  it('charges through the reducer exactly what the button prints', () => {
    const { state, city } = raising('theMagnumOpus');
    hold(state, 'theOperaDelDuomo');
    seat(state).gold = 90;
    const offer = explainContribution(state, 0, city.id, 'gold')!;
    expect(offer.spend).toBe(90);
    expect(offer.hammers).toBe(Math.floor(90 / (GOLD_RATE / 2)));
    const result = applyCommand(state, { type: 'contribute', playerId: 0, cityId: city.id, currency: 'gold' });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(seat(state).gold).toBe(0);
    // The hammers arrive whole. The quarter is off the town's own making.
    expect(city.hammerBasket).toBe(offer.hammers);
  });

  it('caps the press at what the row still needs, at the new rate', () => {
    const { state, city } = raising('theMagnumOpus');
    hold(state, 'theOperaDelDuomo');
    seat(state).gold = 900;
    const whole = explainContribution(state, 0, city.id, 'gold')!;
    city.hammerBasket = whole.remaining - 3;
    bumpRevision(state);
    expect(explainContribution(state, 0, city.id, 'gold')).toMatchObject({
      hammers: 3,
      spend: 3 * (GOLD_RATE / 2),
    });
  });

  it('asks the gate at the new rate, so a refusal leaves the state byte-identical', () => {
    const { state, city } = raising('theMagnumOpus');
    const half = GOLD_RATE / 2;
    seat(state).gold = half;
    bumpRevision(state);
    expect(contributeError(state, 0, city.id, 'gold')).toMatch(/too little gold/);
    hold(state, 'theOperaDelDuomo');
    expect(contributeError(state, 0, city.id, 'gold')).toBeNull();
    seat(state).gold = half - 1;
    bumpRevision(state);
    expect(contributeError(state, 0, city.id, 'gold')).toMatch(/too little gold/);
    expect(explainContribution(state, 0, city.id, 'gold')).toBeNull();
    const before = JSON.stringify(state);
    const refused = applyCommand(state, { type: 'contribute', playerId: 0, cityId: city.id, currency: 'gold' });
    expect(refused.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('takes a quarter off what a town makes toward the Magnum Opus, and nothing else', () => {
    const { state, city } = raising('theMagnumOpus');
    const lineOn = (id: string) =>
      productionModifiers(state, city, { kind: 'building', id: id as never }).filter(
        (entry) => entry.card === 'theOperaDelDuomo',
      );
    expect(lineOn('theMagnumOpus')).toEqual([]);
    hold(state, 'theOperaDelDuomo');
    expect(lineOn('theMagnumOpus')).toEqual([expect.objectContaining({ percent: -25 })]);
    expect(lineOn('cathedral')).toEqual([]);
    expect(lineOn('granary')).toEqual([]);
  });

  it('prices the rate by the gold made, and at nothing while no town may raise the Opus', () => {
    const rate = doctrineDef('theOperaDelDuomo' as DoctrineId).effects.filter(
      (effect) => effect.kind === 'rulePercent',
    );
    // A seat that lacks the technology that opens the Opus, with nobody else ahead.
    const shut = raising('granary');
    seat(shut.state).techsResearched = [];
    bumpRevision(shut.state);
    expect(scoreEffects(rate, valueContext(shut.state, seat(shut.state)))).toBe(0);

    const { state } = raising('theMagnumOpus');
    const poor = scoreEffects(rate, valueContext(state, seat(state)));
    // Forty more gold a turn in the town, from a row lent for this test.
    lent.push(
      lendDoctrineEffects('theApoikia' as DoctrineId, [
        { kind: 'pays', where: 'city', gold: 40 } as CardEffect,
      ]),
    );
    hold(state, 'theApoikia');
    const rich = scoreEffects(rate, valueContext(state, seat(state)));
    expect(rich).toBeGreaterThan(poor);
  });
});

describe('The Grand Canal (batch DT18)', () => {
  /**
   * Three towns of seat 0 at peace, each with a market so a route has a slot. The farm
   * is small and grows food. The other two are larger. Their own surpluses are read
   * off the fold, so each test states what it needs of them. A lent row keeps the seat
   * content, so no stifle scales a surplus unless a test asks for one.
   */
  function canalBoard(): { state: GameState; farm: City; market: City; other: City } {
    const state = bareState(30, 12);
    state.wars = [];
    lent.push(lendDoctrineEffects('theApoikia' as DoctrineId, [{ kind: 'happiness', amount: 20 }]));
    hold(state, 'theApoikia');
    const farm = town(state, 8, 4, 3);
    const market = town(state, 15, 4, 4);
    const other = town(state, 1, 4, 4);
    for (const city of [farm, market, other]) {
      city.buildings.push('market');
      refreshCityDerived(state, city);
    }
    bumpRevision(state);
    return { state, farm, market, other };
  }

  /** The town's own surplus, as the growth channel computes it. */
  function own(state: GameState, city: City): number {
    return channelSurplus(state, city);
  }

  it('moves half the origin’s surplus, and the realm’s sum does not change', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    const grown = own(state, farm);
    const theirs = own(state, market);
    expect(grown).toBeGreaterThan(0);
    const before = growthSurplus(state, farm) + growthSurplus(state, market);
    expect(growthSurplus(state, farm)).toBe(grown);
    expect(growthSurplus(state, market)).toBe(theirs);

    hold(state, 'theGrandCanal');
    // The fold of what the land makes does not move, because the food is carried.
    expect(own(state, farm)).toBe(grown);
    expect(growthSurplus(state, farm)).toBeCloseTo(grown / 2, 10);
    expect(growthSurplus(state, market)).toBeCloseTo(theirs + grown / 2, 10);
    expect(growthSurplus(state, farm) + growthSurplus(state, market)).toBeCloseTo(before, 10);
  });

  it('lists one labelled line a route in both towns, each the same food', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    hold(state, 'theGrandCanal');
    const fold = (city: City) => foldCity(state, city);
    const out = explainFoodCarried(state, farm, fold);
    const into = explainFoodCarried(state, market, fold);
    expect(out.map((line) => line.source)).toEqual([`Doctrine · The Grand Canal · to ${market.name}`]);
    expect(into.map((line) => line.source)).toEqual([`Doctrine · The Grand Canal · from ${farm.name}`]);
    expect(out[0]!.amount).toBeLessThan(0);
    expect(into[0]!.amount).toBe(0 - out[0]!.amount);
    // Rule 5: the total is the fold of the list.
    expect(foldFoodCarried(into)).toBe(into[0]!.amount);
    expect(growthSurplus(state, market)).toBeCloseTo(own(state, market) + foldFoodCarried(into), 10);
  });

  it('banks what the panel promised, in the real phase', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    hold(state, 'theGrandCanal');
    const grown = own(state, farm);
    const theirs = own(state, market);
    // What a screen reads: the memo's folds, and the list off them.
    const memo = foldOnRevision(state);
    const promised = [farm, market].map((city) =>
      growthSurplus(state, city, memo(city), explainFoodCarried(state, city, memo)),
    );
    const baskets = [farm.foodBasket, market.foodBasket];
    collectYields(state);
    expect(farm.foodBasket - baskets[0]!).toBeCloseTo(promised[0]!, 10);
    expect(market.foodBasket - baskets[1]!).toBeCloseTo(promised[1]!, 10);
    // And the sum across the realm is what the two towns grew by themselves.
    expect(farm.foodBasket + market.foodBasket - baskets[0]! - baskets[1]!).toBeCloseTo(grown + theirs, 10);
  });

  it('gives two routes half each, so the town keeps nothing and stops growing', () => {
    // The card says each route carries half, and the proposal says the farm towns
    // stop growing. This is where those two meet.
    const { state, farm, market, other } = canalBoard();
    running(state, farm, market);
    running(state, farm, other);
    const grown = own(state, farm);
    const first = own(state, market);
    const second = own(state, other);
    hold(state, 'theGrandCanal');
    expect(growthSurplus(state, market)).toBeCloseTo(first + grown / 2, 10);
    expect(growthSurplus(state, other)).toBeCloseTo(second + grown / 2, 10);
    expect(growthSurplus(state, farm)).toBeCloseTo(0, 10);
  });

  it('never sends more than the whole surplus: three routes share it evenly', () => {
    const { state, farm, market, other } = canalBoard();
    const fourth = town(state, 8, 9, 4);
    fourth.buildings.push('market');
    refreshCityDerived(state, fourth);
    bumpRevision(state);
    running(state, farm, market);
    running(state, farm, other);
    running(state, farm, fourth);
    const grown = own(state, farm);
    const theirs = [market, other, fourth].map((city) => own(state, city));
    hold(state, 'theGrandCanal');
    expect(growthSurplus(state, market)).toBeCloseTo(theirs[0]! + grown / 3, 10);
    expect(growthSurplus(state, other)).toBeCloseTo(theirs[1]! + grown / 3, 10);
    expect(growthSurplus(state, fourth)).toBeCloseTo(theirs[2]! + grown / 3, 10);
    // The town does not starve to feed the routes.
    expect(growthSurplus(state, farm)).toBeCloseTo(0, 10);
    expect(surplusShareCarried(50, 1)).toBe(0.5);
    expect(surplusShareCarried(50, 2)).toBe(0.5);
    expect(surplusShareCarried(50, 4)).toBe(0.25);
    expect(surplusShareCarried(50, 0)).toBe(0);
  });

  it('feeds one town from many: each farm sends half of its own', () => {
    // The proposal's size: four routes into one town.
    const { state, farm, market, other } = canalBoard();
    running(state, farm, market);
    running(state, other, market);
    const first = own(state, farm);
    const second = own(state, other);
    const theirs = own(state, market);
    expect(second).toBeGreaterThan(0);
    hold(state, 'theGrandCanal');
    expect(growthSurplus(state, market)).toBeCloseTo(theirs + first / 2 + second / 2, 10);
  });

  it('does not chain: each of a pair carries half of what the other grew by itself', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    running(state, market, farm);
    const a = own(state, farm);
    const b = own(state, market);
    expect(b).toBeGreaterThan(0);
    hold(state, 'theGrandCanal');
    expect(growthSurplus(state, farm)).toBeCloseTo(a - a / 2 + b / 2, 10);
    expect(growthSurplus(state, market)).toBeCloseTo(b - b / 2 + a / 2, 10);
  });

  it('carries nothing from a town in deficit, which starves as before', () => {
    const { state, farm, market } = canalBoard();
    running(state, market, farm);
    market.population = 30;
    refreshCityDerived(state, market);
    bumpRevision(state);
    const deficit = own(state, market);
    expect(deficit).toBeLessThan(0);
    const fed = own(state, farm);
    hold(state, 'theGrandCanal');
    // The town in deficit sends nothing, and starves as before.
    expect(explainFoodCarried(state, market, (city) => foldCity(state, city))).toEqual([]);
    expect(growthSurplus(state, market)).toBe(deficit);
    expect(growthSurplus(state, farm)).toBe(fed);
  });

  it('offsets a deficit at the destination', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    market.population = 30;
    refreshCityDerived(state, market);
    bumpRevision(state);
    const deficit = own(state, market);
    const grown = own(state, farm);
    expect(deficit).toBeLessThan(0);
    hold(state, 'theGrandCanal');
    expect(growthSurplus(state, market)).toBeCloseTo(deficit + grown / 2, 10);
  });

  it('carries nothing along a foreign route', () => {
    const state = bareState(24, 9);
    state.wars = [];
    const home = town(state, 3, 4, 3);
    home.buildings.push('market');
    const partner = town(state, 10, 4, 3, 1);
    partner.buildings.push('market');
    createUnit(state, 1, 'worker', 3, 3);
    createUnit(state, 0, 'worker', 10, 3);
    bumpRevision(state);
    running(state, home, partner);
    const grown = own(state, home);
    expect(grown).toBeGreaterThan(0);
    const theirs = own(state, partner);
    hold(state, 'theGrandCanal');
    hold(state, 'theGrandCanal', 1);
    const fold = (city: City) => foldCity(state, city);
    expect(explainFoodCarried(state, home, fold)).toEqual([]);
    expect(explainFoodCarried(state, partner, fold)).toEqual([]);
    expect(growthSurplus(state, home)).toBe(grown);
    expect(growthSurplus(state, partner)).toBe(theirs);
  });

  it('counts a foreign route as no route when it shares out a town’s surplus', () => {
    const state = bareState(30, 9);
    state.wars = [];
    const home = town(state, 8, 4, 3);
    const mine = town(state, 15, 4, 4);
    const partner = town(state, 1, 4, 3, 1);
    home.buildings.push('market', 'market');
    createUnit(state, 1, 'worker', 8, 3);
    createUnit(state, 0, 'worker', 1, 3);
    refreshCityDerived(state, home);
    bumpRevision(state);
    running(state, home, partner);
    running(state, home, mine);
    const grown = own(state, home);
    const theirs = own(state, mine);
    hold(state, 'theGrandCanal');
    expect(growthSurplus(state, mine)).toBeCloseTo(theirs + grown / 2, 10);
    expect(growthSurplus(state, home)).toBeCloseTo(grown / 2, 10);
  });

  it('carries nothing along a route that has ended', () => {
    const { state, farm, market } = canalBoard();
    const cart = running(state, farm, market);
    hold(state, 'theGrandCanal');
    expect(explainFoodCarried(state, farm, (city) => foldCity(state, city)).length).toBe(1);
    // A route has no term (batch TR2): this one is cancelled once it has
    // reached its far town.
    cart.trade!.reached = true;
    const cancelled = applyCommand(state, { type: 'cancelRoute', playerId: 0, unitId: cart.id });
    expect(cancelled.ok, cancelled.ok ? '' : cancelled.error).toBe(true);
    bumpRevision(state);
    expect(explainFoodCarried(state, farm, (city) => foldCity(state, city))).toEqual([]);
    expect(explainFoodCarried(state, market, (city) => foldCity(state, city))).toEqual([]);
  });

  it('stops at a blockade at either end, and a stopped route takes no share', () => {
    const { state, farm, market, other } = canalBoard();
    coastAt(state, 16);
    const fourth = town(state, 8, 9, 4);
    fourth.buildings.push('market');
    refreshCityDerived(state, fourth);
    bumpRevision(state);
    running(state, farm, market);
    running(state, farm, other);
    running(state, farm, fourth);
    const grown = own(state, farm);
    const theirs = own(state, other);
    hold(state, 'theGrandCanal');
    expect(growthSurplus(state, other)).toBeCloseTo(theirs + grown / 3, 10);
    // A heavy hull of another seat stands off the market's harbour.
    createUnit(state, 1, 'carrack', 16, 4);
    bumpRevision(state);
    expect(cityBlockaded(state, market)).toBe(true);
    const fold = (city: City) => foldCity(state, city);
    expect(explainFoodCarried(state, market, fold)).toEqual([]);
    // The two routes left share the farm's food as two routes do: half each.
    expect(growthSurplus(state, other)).toBeCloseTo(own(state, other) + own(state, farm) / 2, 10);
  });

  it('lets a mover win: a town under The Laws of Lord Shang carries nothing', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    farm.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    const grown = own(state, farm);
    const theirs = own(state, market);
    hold(state, 'theGrandCanal');
    hold(state, 'theLawsOfLordShang');
    const fold = foldCity(state, farm, [], farm.queue[0]);
    expect(explainSurplusMoved(state, farm, fold, farm.queue[0]).map((line) => line.amount)).toEqual([grown]);
    expect(explainFoodCarried(state, farm, (city) => foldCity(state, city))).toEqual([]);
    expect(growthSurplus(state, farm)).toBe(0);
    expect(growthSurplus(state, market)).toBe(theirs);
    // A town the law does not reach goes on carrying.
    farm.queue = [];
    bumpRevision(state);
    expect(growthSurplus(state, farm)).toBeCloseTo(grown / 2, 10);
  });

  it('banks the food at a destination whose own surplus a mover takes', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    market.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    const grown = own(state, farm);
    hold(state, 'theGrandCanal');
    hold(state, 'theLawsOfLordShang');
    expect(growthSurplus(state, market)).toBeCloseTo(grown / 2, 10);
  });

  it('holds a settler’s town back from sending, and feeds a town building one', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    hold(state, 'theGrandCanal');
    const grown = own(state, farm);
    const theirs = own(state, market);
    // At the destination the queue does not matter: its own surplus halts, and the
    // food arrives.
    market.queue = [{ kind: 'unit', id: 'settler' }];
    bumpRevision(state);
    expect(growthSurplus(state, market)).toBeCloseTo(grown / 2, 10);
    market.queue = [];
    expect(growthSurplus(state, market)).toBeCloseTo(theirs + grown / 2, 10);
    // At the origin the surplus is held at nought, so there is nothing to send.
    farm.queue = [{ kind: 'unit', id: 'settler' }];
    bumpRevision(state);
    expect(explainFoodCarried(state, farm, (city) => foldCity(state, city))).toEqual([]);
    expect(growthSurplus(state, market)).toBe(theirs);
  });

  it('reads the surplus after the origin’s own percentages, and applies none at the destination', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    hold(state, 'theGrandCanal');
    const grown = own(state, farm);
    // The Year and a Day grows the town a route reaches faster and every other town
    // more slowly, so the two ends read different percentages.
    const percent = foldGrowthPercent(explainGrowthPercent(state, farm));
    hold(state, 'theYearAndADay');
    const slowed = (grown * (100 + percent - 25)) / (100 + percent);
    expect(slowed).toBeGreaterThan(0);
    expect(own(state, farm)).toBeCloseTo(slowed, 10);
    const theirs = own(state, market);
    expect(growthSurplus(state, market)).toBeCloseTo(theirs + slowed / 2, 10);
  });

  it('reads the food before any town banks, so a treasury crossing a mark cannot make food', () => {
    // The Monte di Pietà ties happiness to the treasury, and happiness scales every
    // surplus. A town banking gold can lift the stifle for the towns after it in the
    // same phase. The farm is founded first, so it banks first.
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    hold(state, 'theGrandCanal');
    hold(state, 'theMonteDiPieta');
    const player = seat(state);
    player.gold = 0;
    bumpRevision(state);
    // Bring happiness to just below nought, with the extra citizens in the far town.
    market.population += happinessOf(state, 0) + 1;
    refreshCityDerived(state, market);
    bumpRevision(state);
    expect(happinessOf(state, 0)).toBe(-1);
    const stifled = own(state, farm);
    expect(stifled).toBeGreaterThan(0);
    const income = foldCity(state, farm).gold;
    expect(income).toBeGreaterThan(0);
    // The farm's own gold takes the treasury over the mark.
    player.gold = 200 - income / 2;
    bumpRevision(state);
    expect(happinessOf(state, 0)).toBe(-1);

    const baskets = [farm.foodBasket, market.foodBasket];
    collectYields(state);
    expect(happinessOf(state, 0)).toBe(0);
    expect(own(state, farm)).toBeGreaterThan(stifled);
    const sent = baskets[0]! + stifled - farm.foodBasket;
    expect(sent).toBeCloseTo(stifled / 2, 10);
    // The far town read the mark as passed for its own surplus, and the same food
    // the farm lost for what arrived.
    expect(market.foodBasket - baskets[1]! - own(state, market)).toBeCloseTo(sent, 10);
  });

  it('reaches only the seat that holds it', () => {
    const { state, farm, market } = canalBoard();
    running(state, farm, market);
    const grown = own(state, farm);
    hold(state, 'theGrandCanal', 1);
    expect(growthSurplus(state, farm)).toBe(grown);
    expect(explainFoodCarried(state, market, (city) => foldCity(state, city))).toEqual([]);
  });

  it('says what the card says', () => {
    expect(doctrineDef('theGrandCanal' as DoctrineId).effects).toEqual([
      { kind: 'rule', rule: 'routesCarrySurplus', percent: 50 },
    ]);
    expect(describeCard('theGrandCanal' as never).map((clause) => stripRefs(clause.text))).toEqual([
      "each of your domestic routes carries half of its origin's surplus food to its destination",
    ]);
  });

  it('says what a route would carry, for a pair running and a pair not yet running', () => {
    const { state, farm, market, other } = canalBoard();
    const fold = (city: City) => foldCity(state, city);
    const grown = own(state, farm);
    expect(foodAlongRoute(state, farm, market, 0, fold)).toBe(0);
    expect(foodAlongRoute(state, farm, market, 50, fold)).toBeCloseTo(grown / 2, 10);
    running(state, farm, market);
    // The same figure for the pair now it runs, and half for a second route.
    expect(foodAlongRoute(state, farm, market, 50, fold)).toBeCloseTo(grown / 2, 10);
    expect(foodAlongRoute(state, farm, other, 50, fold)).toBeCloseTo(grown / 2, 10);
  });
});
