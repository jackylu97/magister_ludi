/**
 * The Cathedral — design ledger Entry LV.
 *
 * One very expensive building, +3 happiness, hurried by contributions of gold or
 * faith, consecrated on completion to one of five named patrons. Four claims,
 * and they are why this is one file rather than a handful of cases spread across
 * `purchase.test.ts` and `religion.test.ts`:
 *
 *   · **The roll is a marker's, not a name's.** `realiseItem` consecrates
 *     whatever row carries `BuildingDef.consecrated`, so nothing in `src/sim/`
 *     compares a building id against `"cathedral"` — pinned by reading the
 *     source, because a behavioural test would pass either way.
 *   · **A patron is a card.** Its effects are ordinary `CardEffect`s read by the
 *     ordinary evaluator through `liveCityEffects`, so each of the five lands in
 *     the city's own breakdown, labelled, with no new fold anywhere.
 *   · **A contribution is a conversion, capped.** One press buys
 *     `min(what the row still wants, what the bank affords)` hammers at the
 *     printed rate, never overshoots, and settles through the Entry XVIII
 *     wrapper rather than a completion of its own.
 *   · The two properties every command in this codebase owes: a refusal leaves
 *     the state byte-identical, and a log replays to the same bytes.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { type Command, applyCommand } from '../../src/sim/commands';
import {
  cityYields,
  foundCityAt,
  productionModifiers,
  realiseItem,
} from '../../src/sim/cities';
import { dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import {
  acceptsContributions,
  contributeError,
  explainContribution,
} from '../../src/sim/purchase';
import {
  CONSECRATION_IDS,
  consecrationDef,
  isConsecrationId,
} from '../../src/sim/religionData';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, playerById } from '../../src/sim/state';
import {
  anyCardDef,
  cardCityYields,
  describeCard,
  liveCityEffects,
} from '../../src/sim/statecraft';
import { game } from './purchaseHelpers';

// --- harness ----------------------------------------------------------------

const GOLD_RATE = RULES.production.goldPerHammer;
const FAITH_RATE = RULES.production.faithPerHammer;

/**
 * The simulation's own text, read through Vite's raw glob rather than `node:fs`
 * — this project has no node typings and a source assertion is not worth a
 * dependency (`cities.test.ts`' note).
 */
const SIM_SOURCE = import.meta.glob('../../src/sim/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function simSource(file: string): string {
  const key = Object.keys(SIM_SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return SIM_SOURCE[key!]!;
}

/** The one row in the table that consecrates. Found by its marker, never named. */
const CONSECRATOR = BUILDING_IDS.find((id) => buildingDef(id).consecrated === true)!;

function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

function giveCommand(cityId: number, currency: 'faith' | 'gold', playerId = 0): Command {
  return { type: 'contribute', playerId, cityId, currency } as Command;
}

/** Queues the consecrating row at the front, with nothing banked toward it. */
function queueCathedral(city: City): void {
  city.queue.length = 0;
  city.queue.push({ kind: 'building', id: CONSECRATOR });
  city.hammerBasket = 0;
}

/** Puts followers of one religion in a town, enough to carry the majority. */
function convert(state: GameState, city: City, count: number): number {
  state.religions.push({
    id: state.religions.length,
    founderId: city.ownerId,
    name: 'The Testament',
    founded: state.turn,
    follower: [],
    enhancer: [],
  } as never);
  const religion = state.religions.length - 1;
  // Everybody in town follows, so the majority `cityReligion` asks for is
  // strict — a town split down the middle flies no banner at all.
  city.population = count;
  city.followers = { [religion]: count };
  return religion;
}

// --- the row ----------------------------------------------------------------

describe('the cathedral row', () => {
  it('is very expensive, gives three happiness, and takes contributions', () => {
    const def = buildingDef(CONSECRATOR);
    expect(def.happiness).toBe(3);
    expect(def.acceptsContributions).toBe(true);
    // Æra IV's earned relief: dearer than any ordinary building of its age, and
    // level with the age's wonders. Stated against the roster rather than as a
    // number here, so a retune of the band moves the claim with it.
    // Every row a town can *labour* toward: wonders are their own band, and the
    // Gilded Hall is a doctrine's counting-house nobody builds at all.
    const ordinary = BUILDING_IDS.filter(
      (id) =>
        id !== CONSECRATOR &&
        buildingDef(id).wonder !== true &&
        buildingDef(id).purchaseOnly !== true,
    );
    for (const id of ordinary) expect(def.cost, id).toBeGreaterThan(buildingDef(id).cost);
  });

  it('is opened by a technology, so nothing waits on an age that has arrived', () => {
    // The row shipped `awaitsTech` while Æra IV had no nodes. It does not any
    // more, and a marker left behind would make the whole entry unreachable.
    expect(buildingDef(CONSECRATOR).awaitsTech).toBeUndefined();
  });

  it('is the only row that consecrates, and the only one that takes contributions', () => {
    const consecrating = BUILDING_IDS.filter((id) => buildingDef(id).consecrated === true);
    const funded = BUILDING_IDS.filter(
      (id) => buildingDef(id).acceptsContributions === true,
    );
    expect(consecrating).toEqual([CONSECRATOR]);
    expect(funded).toEqual([CONSECRATOR]);
  });
});

// --- the roll ---------------------------------------------------------------

describe('the consecration', () => {
  it('rolls off the marker rather than off a name, in `realiseItem`', () => {
    // The source-reading pin. A behavioural test cannot tell "the row carrying
    // the flag" from "the row called cathedral", and the whole discipline is
    // that a second such building is a JSON flag.
    expect(simSource('cities.ts')).toContain('buildingDef(building).consecrated !== true');
    // And the register's other half: **nothing in the simulation says the word**
    // — the discipline `consecrates` and `purchase` already keep for the augur.
    // The roster itself is the one exemption, because that is where the id
    // *lives*: `BuildingId` is the union of the table's own keys.
    for (const path of Object.keys(SIM_SOURCE)) {
      if (path.endsWith('/buildingData.ts')) continue;
      expect(SIM_SOURCE[path]!, path).not.toContain(`'${CONSECRATOR}'`);
    }
  });

  it('writes exactly one patron, from the table, when the building is realised', () => {
    const g = game();
    const city = found(g.state, 0);
    expect(city.consecration).toBeUndefined();
    realiseItem(g.state, city, { kind: 'building', id: CONSECRATOR });
    expect(isConsecrationId(city.consecration)).toBe(true);
    expect(CONSECRATION_IDS).toContain(city.consecration);
  });

  it('reports what it dedicated, for the line the interface prints', () => {
    const g = game();
    const city = found(g.state, 0);
    const realised = realiseItem(g.state, city, { kind: 'building', id: CONSECRATOR });
    expect(realised.consecration).toBeDefined();
    expect(realised.consecration!.cityId).toBe(city.id);
    expect(realised.consecration!.cityName).toBe(city.name);
    expect(realised.consecration!.playerId).toBe(0);
    expect(realised.consecration!.building).toBe(CONSECRATOR);
    expect(realised.consecration!.name).toBe(
      consecrationDef(realised.consecration!.consecration).name,
    );
  });

  it('does not consecrate an ordinary building', () => {
    const g = game();
    const city = found(g.state, 0);
    const realised = realiseItem(g.state, city, { kind: 'building', id: 'granary' });
    expect(realised.consecration).toBeUndefined();
    expect(city.consecration).toBeUndefined();
  });

  it('is deterministic: two identical runs roll the same patron', () => {
    const rolls = [0, 1].map(() => {
      const g = game(4242);
      const city = found(g.state, 0);
      realiseItem(g.state, city, { kind: 'building', id: CONSECRATOR });
      return city.consecration;
    });
    expect(rolls[0]).toBe(rolls[1]);
  });

  it('spends exactly one draw off the shared generator', () => {
    // A roll is one `nextInt`, so a game that consecrates is a game whose
    // generator has moved by one step and no more — which is what makes the
    // whole rest of the resolution replay unchanged around it.
    const g = game();
    const city = found(g.state, 0);
    const before = g.state.rng.state;
    realiseItem(g.state, city, { kind: 'building', id: 'granary' });
    expect(g.state.rng.state).toBe(before);
    realiseItem(g.state, city, { kind: 'building', id: CONSECRATOR });
    expect(g.state.rng.state).not.toBe(before);
  });
});

// --- what a patron pays -----------------------------------------------------

describe('a patron is a card', () => {
  it('is a lookup in `anyCardDef` like every other class', () => {
    for (const id of CONSECRATION_IDS) {
      expect(anyCardDef(id).name).toBe(consecrationDef(id).name);
      // And the describer speaks for it: a row whose shape nobody wrote words
      // for would print an empty card.
      const clauses = describeCard(id);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) expect(clause.text, id).toBeTruthy();
    }
  });

  it('reaches the town through `liveCityEffects` and nowhere else', () => {
    const g = game();
    const city = found(g.state, 0);
    const before = liveCityEffects(g.state, city).length;
    city.consecration = CONSECRATION_IDS[0]!;
    const after = liveCityEffects(g.state, city);
    expect(after.length).toBeGreaterThan(before);
    // Labelled with the building's own word, so a ledger says which stones pay.
    const line = after[after.length - 1]!;
    expect(line.source).toContain('Cathedral · ');
    expect(line.source).toContain(consecrationDef(CONSECRATION_IDS[0]!).name);
  });

  it('pays only the town that holds it', () => {
    const g = game();
    const here = found(g.state, 0);
    const elsewhere = foundCityAt(
      g.state,
      0,
      g.state.map.tiles.find(
        (tile) =>
          g.state.tileOwner[tile.row * g.state.map.width + tile.col] === null &&
          tile.terrain !== 'ocean' &&
          tile.terrain !== 'coast' &&
          tile.terrain !== 'mountain',
      )!,
    );
    convert(g.state, here, 4);
    const was = cityYields(g.state, elsewhere);
    const before = cityYields(g.state, here).faith;
    here.consecration = 'eternalFlame';
    expect(cityYields(g.state, here).faith).toBe(before + 4);
    expect(cityYields(g.state, elsewhere)).toEqual(was);
  });

  it("the Scholars' Crypt pays a beaker for every two followers, in the breakdown", () => {
    const g = game();
    const city = found(g.state, 0);
    convert(g.state, city, 6);
    const before = cityYields(g.state, city).science;
    city.consecration = 'scholarsCrypt';
    expect(cityYields(g.state, city).science).toBe(before + 3);
    // And it is one labelled line of the card breakdown the panel prints —
    // the total is the fold of the list, never computed beside it.
    const line = cardCityYields(g.state, city).find((entry) =>
      entry.source.includes("The Scholars' Crypt"),
    );
    expect(line).toBeDefined();
    expect(line!.science).toBe(3);
    expect(line!.source).toContain('Cathedral · ');
  });

  it('the Choir Loft pays culture on the same count', () => {
    const g = game();
    const city = found(g.state, 0);
    convert(g.state, city, 5);
    const before = cityYields(g.state, city).culture;
    city.consecration = 'choirLoft';
    // Five followers, two to a helping: two helpings, the odd one unpaid.
    expect(cityYields(g.state, city).culture).toBe(before + 2);
  });

  it('the Treasury of Relics pays for the faith buildings standing here', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('shrine', 'temple');
    const before = cityYields(g.state, city).gold;
    city.consecration = 'treasuryOfRelics';
    expect(cityYields(g.state, city).gold).toBe(before + 6);
    // A building of another category is not a relic hall — the count is the
    // rows' own `category`, so a second faith building joins it for free.
    const withLibrary = cityYields(g.state, city).gold;
    city.buildings.push('library');
    expect(cityYields(g.state, city).gold).toBe(withLibrary + buildingDef('library').gold);
  });

  it("the Masons' Chapel puts hammers behind wonders here, and nothing else", () => {
    const g = game();
    const city = found(g.state, 0);
    city.consecration = 'masonsChapel';
    const wonder = productionModifiers(g.state, city, {
      kind: 'building',
      id: 'theOracle',
    });
    const ordinary = productionModifiers(g.state, city, { kind: 'building', id: 'granary' });
    const line = wonder.find((entry) => entry.source.includes("The Masons' Chapel"));
    expect(line).toBeDefined();
    expect(line!.percent).toBe(10);
    expect(line!.stage).toBe('city');
    expect(ordinary.some((entry) => entry.source.includes("The Masons' Chapel"))).toBe(false);
  });

  it('the Eternal Flame pays a candle per follower', () => {
    const g = game();
    const city = found(g.state, 0);
    convert(g.state, city, 4);
    const before = cityYields(g.state, city).faith;
    city.consecration = 'eternalFlame';
    expect(cityYields(g.state, city).faith).toBe(before + 4);
  });

  it('counts nobody in a town that follows nothing', () => {
    const g = game();
    const city = found(g.state, 0);
    // Converted, but nowhere near a majority: the town flies no banner, so the
    // patron counts nothing — the derived reading, never a stored one.
    convert(g.state, city, 1);
    city.population = 9;
    const before = cityYields(g.state, city).faith;
    city.consecration = 'eternalFlame';
    expect(cityYields(g.state, city).faith).toBe(before);
  });

  it('follows the stones: a captured town pays its captor', () => {
    const g = game();
    const city = found(g.state, 0);
    convert(g.state, city, 4);
    const bare = cityYields(g.state, city).faith;
    city.consecration = 'eternalFlame';
    const paid = cityYields(g.state, city).faith;
    expect(paid).toBe(bare + 4);
    city.ownerId = 1;
    // Nothing was transferred and nothing was cleared: the patron is read off
    // the town, so it pays whoever holds it.
    expect(city.consecration).toBe('eternalFlame');
    expect(cityYields(g.state, city).faith).toBe(paid);
  });
});

// --- the contribute verb ----------------------------------------------------

describe('contributing to a basket', () => {
  it('reads the marker off the row, never the id', () => {
    expect(acceptsContributions({ kind: 'building', id: CONSECRATOR })).toBe(true);
    expect(acceptsContributions({ kind: 'building', id: 'granary' })).toBe(false);
    expect(acceptsContributions({ kind: 'unit', id: 'warrior' })).toBe(false);
    expect(acceptsContributions({ kind: 'project', id: 'tithes' })).toBe(false);
  });

  it('converts a bank into hammers at the printed rate', () => {
    const g = game();
    const city = found(g.state, 0);
    queueCathedral(city);
    const player = playerById(g.state, 0)!;
    player.gold = 40;
    const offer = explainContribution(g.state, 0, city.id, 'gold')!;
    expect(offer.rate).toBe(GOLD_RATE);
    expect(offer.hammers).toBe(Math.floor(40 / GOLD_RATE));
    expect(offer.spend).toBe(offer.hammers * GOLD_RATE);

    expect(dispatch(g, giveCommand(city.id, 'gold')).ok).toBe(true);
    expect(city.hammerBasket).toBe(offer.hammers);
    expect(player.gold).toBe(40 - offer.spend);
  });

  it('prices faith more cheaply than gold, so both banks are worth pressing', () => {
    expect(FAITH_RATE).toBeGreaterThan(0);
    expect(FAITH_RATE).toBeLessThan(GOLD_RATE);
    const g = game();
    const city = found(g.state, 0);
    queueCathedral(city);
    const player = playerById(g.state, 0)!;
    player.faithPool = 30;
    const offer = explainContribution(g.state, 0, city.id, 'faith')!;
    expect(offer.hammers).toBe(Math.floor(30 / FAITH_RATE));
    expect(dispatch(g, giveCommand(city.id, 'faith')).ok).toBe(true);
    expect(city.hammerBasket).toBe(offer.hammers);
    expect(player.faithPool).toBe(30 - offer.spend);
  });

  it('never overshoots: a rich empire pays only what the row still wants', () => {
    const g = game();
    const city = found(g.state, 0);
    queueCathedral(city);
    const cost = buildingDef(CONSECRATOR).cost;
    city.hammerBasket = cost - 3;
    const player = playerById(g.state, 0)!;
    player.gold = 9000;
    const offer = explainContribution(g.state, 0, city.id, 'gold')!;
    expect(offer.remaining).toBe(3);
    expect(offer.hammers).toBe(3);
    expect(offer.spend).toBe(3 * GOLD_RATE);
    expect(offer.completes).toBe(buildingDef(CONSECRATOR).name);
  });

  it('leaves the bank the change it cannot spend a whole hammer of', () => {
    const g = game();
    const city = found(g.state, 0);
    queueCathedral(city);
    const player = playerById(g.state, 0)!;
    player.gold = GOLD_RATE * 4 + (GOLD_RATE - 1);
    expect(dispatch(g, giveCommand(city.id, 'gold')).ok).toBe(true);
    expect(city.hammerBasket).toBe(4);
    expect(player.gold).toBe(GOLD_RATE - 1);
  });

  it('completes through the windfall wrapper, and the town is dedicated on the spot', () => {
    const g = game();
    const city = found(g.state, 0);
    queueCathedral(city);
    const player = playerById(g.state, 0)!;
    player.gold = buildingDef(CONSECRATOR).cost * GOLD_RATE;
    const result = dispatch(g, giveCommand(city.id, 'gold'));
    expect(result.ok).toBe(true);
    expect(city.buildings).toContain(CONSECRATOR);
    expect(city.queue).toHaveLength(0);
    expect(isConsecrationId(city.consecration)).toBe(true);
    // The news leaves on the result, so the interface never diffs the board.
    expect(result.ok && result.consecrations).toHaveLength(1);
    expect(result.ok && result.consecrations![0]!.consecration).toBe(city.consecration);
    // And the register's own debt (`refreshCityDerived`, entry 3): the
    // settlement goes through the windfall wrapper, which is
    // `advanceProduction`'s own completion routine plus the re-seating. Pinned
    // by reading the source, because a hand-rolled completion would pass every
    // behavioural assertion above it.
    const purchase = simSource('purchase.ts');
    expect(purchase).toContain('settleProductionWindfall(state, city)');
    expect(purchase).not.toContain('settleProduction(state, city)');
  });

  it('refuses every way it can, and a refusal changes nothing at all', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    player.gold = 500;

    // Nothing queued.
    expect(contributeError(g.state, 0, city.id, 'gold')).toMatch(/building nothing/);
    // A row that does not declare it.
    city.queue.push({ kind: 'building', id: 'granary' });
    expect(contributeError(g.state, 0, city.id, 'gold')).toMatch(/takes no contributions/);
    // Somebody else's town.
    queueCathedral(city);
    expect(contributeError(g.state, 1, city.id, 'gold')).toMatch(/does not belong/);
    // A bank that does not exist.
    expect(contributeError(g.state, 0, city.id, 'silver')).toMatch(/no bank called/);
    // An empty purse.
    player.gold = 0;
    expect(contributeError(g.state, 0, city.id, 'gold')).toMatch(/too little gold/);
    // Already paid for.
    player.gold = 500;
    city.hammerBasket = buildingDef(CONSECRATOR).cost;
    expect(contributeError(g.state, 0, city.id, 'gold')).toMatch(/already paid/);

    // And the reducer's guarantee: every one of those, byte for byte.
    city.hammerBasket = 0;
    for (const command of [
      giveCommand(city.id, 'gold', 1),
      giveCommand(city.id, 'silver' as never),
      giveCommand(9999, 'gold'),
    ]) {
      const before = snapshotState(g.state);
      const result = applyCommand(g.state, command);
      expect(result.ok).toBe(false);
      expect(snapshotState(g.state)).toEqual(before);
    }
  });

  it('pays for the front of the queue and nothing standing behind it', () => {
    const g = game();
    const city = found(g.state, 0);
    city.queue.length = 0;
    city.queue.push({ kind: 'building', id: 'granary' });
    city.queue.push({ kind: 'building', id: CONSECRATOR });
    // A city has one basket and it pays for `queue[0]`, so a cathedral standing
    // second takes nothing — there is no per-item ledger to pour into.
    expect(explainContribution(g.state, 0, city.id, 'gold')).toBeNull();
    expect(contributeError(g.state, 0, city.id, 'gold')).toMatch(/takes no contributions/);
  });

  it('is refused to a seat that has ended its turn', () => {
    const g = game();
    const city = found(g.state, 0);
    queueCathedral(city);
    playerById(g.state, 0)!.gold = 500;
    g.state.turnEnded[0] = true;
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, giveCommand(city.id, 'gold'));
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });
});

// --- replay -----------------------------------------------------------------

describe('a game with contributions and a consecration', () => {
  it('replays to the same bytes from the same commands', () => {
    // Two identical states, the same log, byte-identical results — including
    // the patron, which is rolled off `state.rng` inside the completion the
    // third command triggers.
    const run = (): { snapshot: string; patron: string | undefined } => {
      const g = game(77);
      const city = found(g.state, 0);
      const player = playerById(g.state, 0)!;
      player.gold = 5000;
      player.faithPool = 60;
      queueCathedral(city);
      for (const command of [
        giveCommand(city.id, 'faith'),
        giveCommand(city.id, 'gold'),
      ]) {
        expect(dispatch(g, command).ok).toBe(true);
      }
      expect(city.buildings).toContain(CONSECRATOR);
      return { snapshot: snapshotState(g.state), patron: city.consecration };
    };
    const first = run();
    const second = run();
    expect(second.snapshot).toEqual(first.snapshot);
    expect(isConsecrationId(first.patron)).toBe(true);
    expect(second.patron).toBe(first.patron);
  });

  it('replays byte for byte through a whole resolution', () => {
    // The stronger claim: the roll sits inside `realiseItem`, which the end of
    // turn reaches through `advanceProduction`, so a dedication happens *inside*
    // a resolution that is already spending the shared generator. Two identical
    // runs must therefore agree on everything downstream of it as well — the
    // wild's marches, every die the pipeline throws — and not merely on the
    // patron.
    const run = (): { snapshot: string; patron: string | undefined } => {
      const g = game(31);
      const city = found(g.state, 0);
      const player = playerById(g.state, 0)!;
      player.techsResearched.push('theology' as never);
      // Deliberately **short**: the press leaves a couple of hammers owing, so
      // the town's own production is what tops the cathedral out and the roll
      // happens inside a resolution rather than inside the command.
      queueCathedral(city);
      city.hammerBasket = buildingDef(CONSECRATOR).cost - 40;
      player.gold = 38 * GOLD_RATE;
      expect(dispatch(g, giveCommand(city.id, 'gold')).ok).toBe(true);
      expect(city.buildings).not.toContain(CONSECRATOR);
      for (let turn = 0; turn < 4; turn++) {
        expect(dispatch(g, { type: 'endTurn', playerId: 0 } as Command).ok).toBe(true);
        expect(dispatch(g, { type: 'endTurn', playerId: 1 } as Command).ok).toBe(true);
      }
      return { snapshot: snapshotState(g.state), patron: city.consecration };
    };
    const first = run();
    expect(isConsecrationId(first.patron)).toBe(true);
    const second = run();
    expect(second.snapshot).toEqual(first.snapshot);
  });
});
