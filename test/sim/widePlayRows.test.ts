/**
 * The wide-play rows (batch H13 — `docs/flags.md`, "Rulings 2026-09-07 — the
 * early-pacing doc, marked", items cc and ee and the Throne half of dd;
 * `docs/early-pacing.md` §2c–2e).
 *
 * Every row of this batch is a **JSON row** — nothing in the card vocabulary
 * moved, and that claim is the whole point of the file. Six Orders, one
 * Doctrine and two building rows are carried here from the data to the ledger
 * they touch, because "the shape already existed" is a promise nobody has to
 * keep until somebody spends it: `foundingRider.building` had stood unread by
 * any live row since the card pass of 2026-09-03 took The Founders' Road's free
 * Monument away, and a `countScaled` on a `oncePerEmpire` building's own
 * `effects` had never been asked for authority before the Throne asked.
 *
 * It is a file of its own rather than a section of `statecraft.test.ts` for the
 * ordinary reason: that file is the vocabulary's own register and this is one
 * batch's rows.
 */
import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { cityTile, cityYields, foundCityAt } from '../../src/sim/cities';
import { hexDistance } from '../../src/sim/hex';
import { tileHex } from '../../src/sim/map';
import {
  explainAuthority,
  explainHappiness,
  foldMeter,
} from '../../src/sim/meters';
import {
  cardCityYields,
  cardPercentYields,
  cardFoundingRider,
  describeCard,
} from '../../src/sim/statecraft';
import {
  type DoctrineId,
  type OrderId,
  doctrineDef,
  orderDef,
} from '../../src/sim/statecraftData';
import { type City, type GameState, playerById, bumpRevision } from '../../src/sim/state';
import { found, game } from './statecraftHelpers';

// --- harness ----------------------------------------------------------------

/** Slots an Order, growing the spread — `statecraft.test.ts`' own scaffolding. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Adopts a Doctrine, as the ladder would have. Test scaffolding only. */
function adopt(state: GameState, playerId: number, id: DoctrineId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.doctrines.includes(id)) sc.doctrines.push(id);
  bumpRevision(state);
}

/** The empire's writ, as the meter folds it. */
function writ(state: GameState, playerId: number): number {
  return foldMeter(explainAuthority(state, playerId));
}

/**
 * Founds N more towns for a seat on dry land, four hexes clear of every town
 * already standing — far enough apart that no two colonies share a work radius
 * and the citizen assignment of one cannot move the yields of another.
 */
function colonise(state: GameState, playerId: number, count: number): City[] {
  const made: City[] = [];
  for (const tile of state.map.tiles) {
    if (made.length === count) break;
    if (tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'mountain') {
      continue;
    }
    const site = tileHex(tile);
    const clear = state.cities.every(
      (city) => hexDistance(site, tileHex(cityTile(state.map, city))) > 4,
    );
    if (!clear) continue;
    made.push(foundCityAt(state, playerId, tile));
  }
  expect(made, 'the bench had room for the colonies').toHaveLength(count);
  return made;
}

/** The science `cardCityYields` pays this town. */
function cardScience(state: GameState, city: City): number {
  return cardCityYields(state, city).reduce((sum, line) => sum + line.science, 0);
}

// --- the Monument and the Throne (rulings n, dd) -----------------------------

describe('the writ the stones supply', () => {
  /**
   * Ruling (n): the Monument carries a point of writ again, so a fourth town in
   * Æra I is reachable the moment the first three have theirs. Read off the row
   * rather than written down here — `buildingCapacity` names no building and
   * this test should not either.
   */
  it('pays a point of writ for every Monument standing', () => {
    const g = game();
    const capital = found(g.state, 0);
    const capacity = buildingDef('monument').authorityCapacity;
    expect(capacity, 'the Monument declares one').toBe(1);

    const bare = writ(g.state, 0);
    capital.buildings.push('monument');
    bumpRevision(g.state);
    expect(writ(g.state, 0)).toBe(bare + 1);

    const [second, third] = colonise(g.state, 0, 2);
    const three = writ(g.state, 0);
    second!.buildings.push('monument');
    bumpRevision(g.state);
    third!.buildings.push('monument');
    bumpRevision(g.state);
    // One line, counting the type — "Monuments ×3" — and worth three.
    expect(writ(g.state, 0)).toBe(three + 2);
    const line = explainAuthority(g.state, 0).find((entry) => entry.source.includes('Monument'));
    expect(line?.value).toBe(3);
  });

  /**
   * Ruling (dd), the effect half: the Throne's flat five writ becomes **three,
   * and one more for every three cities held**. The second clause is a
   * `countScaled` on the row's own `effects` — a `oncePerEmpire` building is
   * read once per realm by `liveEffects`, which is what lets it say "cities you
   * hold" without being counted once per town.
   */
  it('seats the Throne at three, and widens it by one for every three towns', () => {
    const g = game();
    const capital = found(g.state, 0);
    expect(buildingDef('imperialThrone').authorityCapacity).toBe(3);

    const bare = writ(g.state, 0);
    capital.buildings.push('imperialThrone');
    bumpRevision(g.state);
    // One town: three flat, and nothing from the count.
    expect(writ(g.state, 0)).toBe(bare + 3);

    /** The counted line alone — the flat three is `buildingCapacity`'s own. */
    const counted = (): number =>
      explainAuthority(g.state, 0).find(
        (entry) =>
          entry.source.includes(buildingDef('imperialThrone').name) && entry.source.includes('×'),
      )?.value ?? 0;

    expect(counted(), 'one town buys no helping').toBe(0);
    colonise(g.state, 0, 2);
    expect(counted(), 'three towns, one helping').toBe(1);
    colonise(g.state, 0, 3);
    expect(counted(), 'six towns, two').toBe(2);
  });

  /** Both halves are printed, or the card lies by omission. */
  it('prints the Throne as three flat and one for every three', () => {
    const clauses = describeCard('imperialThrone').map((clause) => clause.text);
    expect(clauses.some((text) => text.includes('+3 authority capacity'))).toBe(true);
    expect(clauses.some((text) => /authority.*3 cities|3 cities.*authority/.test(text))).toBe(true);
  });
});

// --- authority in the Orders (ruling cc) ------------------------------------

describe('the authority Orders', () => {
  it("pays a flat point for The Elders' Writ", () => {
    const g = game();
    found(g.state, 0);
    const bare = writ(g.state, 0);
    slot(g.state, 0, 'theEldersWrit');
    expect(writ(g.state, 0)).toBe(bare + 1);
  });

  it('pays two for The Marches, and takes a point of cheer in every city', () => {
    const g = game();
    found(g.state, 0);
    colonise(g.state, 0, 2);
    const bareWrit = writ(g.state, 0);
    const bareCheer = foldMeter(explainHappiness(g.state, 0));

    slot(g.state, 0, 'theMarches');
    expect(writ(g.state, 0)).toBe(bareWrit + 2);
    // Three towns, a point each — the cost the row prints.
    expect(foldMeter(explainHappiness(g.state, 0))).toBe(bareCheer - 3);
  });

  it('pays The Census a point for each 2 towns, and nothing for the odd one', () => {
    const g = game();
    found(g.state, 0);
    slot(g.state, 0, 'theCensus');

    /** What the Order's own line is worth right now, or nothing at all. */
    const census = (): number =>
      explainAuthority(g.state, 0).find((entry) =>
        entry.source.includes(orderDef('theCensus').name),
      )?.value ?? 0;

    // One town buys no helping at all, and the line is absent rather than zero.
    expect(census()).toBe(0);
    colonise(g.state, 0, 1);
    expect(census()).toBe(1);
    colonise(g.state, 0, 1);
    expect(census(), 'three towns is still one helping').toBe(1);
    colonise(g.state, 0, 1);
    expect(census()).toBe(2);
  });
});

// --- the science Orders (ruling ee) -----------------------------------------

describe('the science Orders', () => {
  it('pays The Tally Sticks only in the towns that raised a Monument', () => {
    const g = game();
    const capital = found(g.state, 0);
    const [second] = colonise(g.state, 0, 1);
    slot(g.state, 0, 'theTallySticks');

    expect(cardScience(g.state, capital), 'no Monument, no beaker').toBe(0);
    capital.buildings.push('monument');
    bumpRevision(g.state);
    expect(cardScience(g.state, capital)).toBe(1);
    expect(cardScience(g.state, second!), 'the town without one still pays nothing').toBe(0);
  });

  it("pays The Scribes' Hall a beaker for each 3 citizens of the town itself", () => {
    const g = game();
    const capital = found(g.state, 0);
    slot(g.state, 0, 'theScribesHall');

    capital.population = 2;
    expect(cardScience(g.state, capital)).toBe(0);
    capital.population = 3;
    expect(cardScience(g.state, capital)).toBe(1);
    capital.population = 7;
    expect(cardScience(g.state, capital)).toBe(2);

    // **The town's own citizens**, not the realm's: a second town of six does
    // not pay the capital for them.
    const [second] = colonise(g.state, 0, 1);
    second!.population = 6;
    expect(cardScience(g.state, capital), 'still the capital’s own seven').toBe(2);
    expect(cardScience(g.state, second!)).toBe(2);
  });

  it('lights The Lamp in the capital and nowhere else', () => {
    const g = game();
    const capital = found(g.state, 0);
    const [second] = colonise(g.state, 0, 1);
    slot(g.state, 0, 'theLampKeptLit');

    const inCapital = cardPercentYields(g.state, capital).filter(
      (line) => line.yield === 'science',
    );
    expect(inCapital).toHaveLength(1);
    expect(inCapital[0]!.percent).toBe(25);
    expect(inCapital[0]!.stage, 'the city stage, Entry XVII’s default').toBe('city');
    expect(cardPercentYields(g.state, second!).filter((l) => l.yield === 'science')).toHaveLength(0);
  });

  it('reaches the town’s own science through the ordinary fold', () => {
    const g = game();
    const capital = found(g.state, 0);
    capital.buildings.push('monument');
    bumpRevision(g.state);
    const bare = cityYields(g.state, capital).science;
    slot(g.state, 0, 'theTallySticks');
    expect(cityYields(g.state, capital).science).toBeGreaterThan(bare);
  });
});

// --- The Founders' Charter (ruling cc, the Doctrine) -------------------------

describe("The Founders' Charter", () => {
  /**
   * The Monument clause is `foundingRider.building` — the shape The Founders'
   * Road left standing, read by `cardFoundingRider` and spent by `foundCityAt`.
   * Nothing was built for this row, which is exactly what this test says.
   */
  it('founds every new town with a Monument, and pays its writ from that turn', () => {
    const g = game();
    found(g.state, 0);
    adopt(g.state, 0, 'foundersCharter');

    expect(cardFoundingRider(g.state, 0).buildings).toContain('monument');

    const before = writ(g.state, 0);
    const [colony] = colonise(g.state, 0, 1);
    expect(colony!.buildings).toContain('monument');
    // The town costs writ and the Monument it opens with pays a point back, so
    // the charter's colony is a point cheaper than a bare one.
    const bare = game();
    found(bare.state, 0);
    const bareBefore = writ(bare.state, 0);
    colonise(bare.state, 0, 1);
    expect(writ(g.state, 0) - before).toBe(writ(bare.state, 0) - bareBefore + 1);
  });

  it('pays two points of writ on its own account', () => {
    const g = game();
    found(g.state, 0);
    const bare = writ(g.state, 0);
    adopt(g.state, 0, 'foundersCharter');
    expect(writ(g.state, 0)).toBe(bare + 2);
  });
});

// --- the rows print at all ---------------------------------------------------

describe('every row of the batch has a face', () => {
  const ROWS = [
    'theEldersWrit',
    'theMarches',
    'theCensus',
    'theTallySticks',
    'theScribesHall',
    'theLampKeptLit',
  ] as const;

  it('describes every new Order from its own effects', () => {
    for (const id of ROWS) {
      const clauses = describeCard(id);
      expect(clauses.length, `${id} prints nothing`).toBeGreaterThan(0);
      for (const clause of clauses) expect(clause.text, id).not.toBe('');
    }
  });

  it('describes the Doctrine as both of its clauses', () => {
    const clauses = describeCard('foundersCharter').map((clause) => clause.text);
    expect(clauses.some((text) => text.includes('+2 authority capacity'))).toBe(true);
    expect(clauses.some((text) => text.includes('new cities are founded with'))).toBe(true);
  });

  /**
   * The rows carry no `deferred` half and no `note`: everything each of them
   * prints is paid by an effect. A row that grows a deferred clause later will
   * fail this and should — the deferral belongs in the doc's own list.
   */
  it('defers nothing', () => {
    for (const id of ROWS) {
      expect(orderDef(id).deferred, id).toBeUndefined();
      expect(orderDef(id).effects.length, id).toBeGreaterThan(0);
    }
    expect(doctrineDef('foundersCharter').deferred).toBeUndefined();
  });
});
