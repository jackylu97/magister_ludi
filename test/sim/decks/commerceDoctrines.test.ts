/**
 * **Doctrine batch DT3: Commerce's Doctrines that need no new shape**
 * (`docs/plans/doctrines-build-triage.md`). `commerce.test.ts` holds the rows to
 * the sheet. This file checks that each row pays what its text says, in a real
 * fold, and that each drawback bites.
 *
 * Later batches add the deck's other seven Doctrines to this file.
 */

import { describe, expect, it } from 'vitest';

import { scoreCard, valueContext } from '../../../src/ai/bot';
import { cityBlockaded } from '../../../src/sim/blockade';
import { explainCardImpact } from '../../../src/sim/cardImpact';
import {
  explainGrowthPercent,
  explainUnitCost,
  foldGrowthPercent,
  foldUnitCost,
  foundCityAt,
  refreshCityDerived,
} from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { raiseImprovement } from '../../../src/sim/map';
import { explainAuthority, explainFoundingCost, explainHappiness } from '../../../src/sim/meters';
import {
  explainPurchaseCost,
  explainRoutePrice,
  routePrice,
} from '../../../src/sim/purchase';
import { readRoutes } from '../../../src/sim/readings';
import { layRoad } from '../../../src/sim/roads';
import { explainRouteYield, foldRouteYield } from '../../../src/sim/routeYields';
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
import { doctrineBagFor } from '../../../src/sim/statecraft';
import {
  cardRenownLines,
  explainCardPercentYields,
} from '../../../src/sim/statecraft/evaluator';
import {
  type DoctrineId,
  DECK_FILE_DOCTRINES,
  doctrineDef,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { openWar } from '../../../src/sim/wars';
import { cityContext, explainTileYield, foldTileLines } from '../../../src/sim/yields/hex';
import { explainCity, foldCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';

/** The seven rows of batch DT3 in this deck, each with the band its table gives it. */
const ROWS: readonly (readonly [string, number])[] = [
  ['theApoikia', 1],
  ['theDelianLeague', 1],
  ['theSogdianColonies', 2],
  ['theYearAndADay', 3],
  ['theTurnpikeTrusts', 3],
  ['thePeaceOfLodi', 4],
  ['theMonteDiPieta', 4],
];

const TERM = Math.floor(RULES.trade.routeTurns);

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

  it('keeps a coastal capital free, and charges a captured coastal town as before', () => {
    const state = bareState(24, 10);
    coastAt(state, 9);
    const capital = town(state, 8, 2);
    const taken = town(state, 10, 7);
    taken.captured = true;
    bumpRevision(state);
    const price = townCost(state, taken);
    hold(state, 'theDelianLeague');
    expect(townCost(state, capital)).toBe(0);
    expect(townCost(state, taken)).toBe(price);
  });

  it('quotes the cheaper town on the founding preview', () => {
    const state = bareState(24, 10);
    coastAt(state, 9);
    town(state, 2, 2);
    const quote = () =>
      explainFoundingCost(state, 0, at(state, 8, 5)).find((one) => one.meter === 'authority')!.value;
    const before = quote();
    hold(state, 'theDelianLeague');
    expect(quote()).toBe(before + 1);
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
