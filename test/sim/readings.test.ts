/**
 * **The readings** — batch E2 (`docs/flags.md` item pp;
 * `docs/audit/evaluations.md` §2b, §3a, §4b step 8).
 *
 * The user, 2026-09-07: *"information flows one way; downstream subscribers
 * never publish upwards and subscribe to a single source of truth rather than
 * recalculating; variables are cached and updated with the user's actions, so
 * yields that have not changed are not recalculated."*
 *
 * Three claims, and each is a way the batch could be wrong while every number
 * still added up:
 *
 *   1. **The list is the artefact.** `explainCity` returns the labelled list its
 *      flats are the fold of, every line carries a step of `docs/yields.md` and
 *      a class, and `flats` is `foldCityFlats(lines)` and nothing else. A
 *      summand folded without a line would balance and would be invisible.
 *   2. **The revision is the subscription.** A reading is handed back unchanged
 *      while the world has not moved and rebuilt the moment it has — and the
 *      counter moves on an accepted command, never on a refused one, and once
 *      per end-of-turn phase.
 *   3. **Nobody rebuilds the list any more.** The four private copies
 *      (§3a — the panel, the Ledger, the ghost-diff, the bot) are read out of
 *      the source: `cityFlatsByClass` is gone and each reader imports the
 *      reading rather than the sources.
 *
 * Core tier: a fold over one small board plus a source register (CLAUDE.md — a
 * source-reading register test is always core).
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import {
  claimTile,
  controlledHoldings,
  emptyCityYields,
  foundCityAt,
  foundingErrorAt,
} from '../../src/sim/cities';
import { meterEffects } from '../../src/sim/meters';
import { economyStamp, setSlatePhase, setSlateShadow, slateShadow } from '../../src/sim/slate';
import { getTile, getTileAt, mapNeighbors, tileHex, tileIndex } from '../../src/sim/map';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { resourceDef, withExtraResources } from '../../src/sim/resourceData';
import {
  explainCity,
  foldCity,
  foldCityFlats,
} from '../../src/sim/yields/town';
import { LEDGER_CLASSES } from '../../src/sim/ledgerClass';
import { readCity, readEmpire, readEmpirePercents, readRoutes } from '../../src/sim/readings';
import { routePrice } from '../../src/sim/purchase';
import { explainRouteYieldBetween, foldRouteYield } from '../../src/sim/routeYields';
import {
  routeModesAvailable,
  routeSlots,
  routeStartable,
  usedRouteSlots,
} from '../../src/sim/trade';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { type City, type GameState, bumpRevision, newGame, playerById } from '../../src/sim/state';
import { snapshotState } from '../../src/sim/game';
import { END_OF_TURN_PHASES, runEndOfTurn } from '../../src/sim/turn';
import { found, game } from './statecraftHelpers';

/** The steps a town's list may carry — `docs/yields.md`'s 1 through 10. */
const TOWN_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe('the town publishes its list', () => {
  it('folds to its own flats, voice for voice', () => {
    const { state } = game();
    const city = found(state, 0)!;
    city.population = 5;
    city.buildings.push('monument', 'library');
    const quote = explainCity(state, city);
    const fold = foldCityFlats(quote.lines);
    for (const key of CITY_YIELD_KEYS) {
      expect(fold[key], key).toBe(quote.flats[key]);
    }
    // Not vacuous: a town with people, ground and two buildings makes something.
    expect(quote.lines.length).toBeGreaterThan(3);
  });

  it('gives every line a step of the sequence and a class of the eight', () => {
    const { state } = game();
    const city = found(state, 0)!;
    city.buildings.push('monument');
    for (const line of explainCity(state, city).lines) {
      expect(TOWN_STEPS, `${line.source} step ${line.step}`).toContain(line.step);
      expect(LEDGER_CLASSES, `${line.source} class`).toContain(line.class);
    }
  });

  it('runs its steps in the sequence of record, never doubling back', () => {
    // `docs/yields.md`'s order, read off the list rather than off the source —
    // the sync test reads the source, and this reads what the source produced.
    const { state } = game();
    const city = found(state, 0)!;
    city.buildings.push('monument', 'library');
    let last = 0;
    for (const line of explainCity(state, city).lines) {
      expect(line.step, `${line.source} after step ${last}`).toBeGreaterThanOrEqual(last);
      last = line.step;
    }
  });

  it('keeps the centre and the town’s own two terms apart', () => {
    // The centre is a *hex* and files under the land; a citizen's beaker and the
    // culture a settlement makes by being one belong to no tile, no building and
    // no card, which is what `other` means.
    const { state } = game();
    const city = found(state, 0)!;
    const centre = explainCity(state, city).lines.filter((line) => line.step === 1);
    expect(centre).toHaveLength(2);
    expect(centre[0]!.class).toBe('tiles');
    expect(centre[1]!.class).toBe('other');
    expect(centre[1]!.science).toBeGreaterThan(0);
  });
});

describe('the revision is the subscription', () => {
  it('hands the same reading back until the world moves', () => {
    const { state } = game();
    const city = found(state, 0)!;
    expect(readCity(state, city)).toBe(readCity(state, city));
    expect(readEmpire(state, 0)).toBe(readEmpire(state, 0));
    expect(readEmpirePercents(state, 0)).toBe(readEmpirePercents(state, 0));

    const held = readCity(state, city);
    bumpRevision(state);
    expect(readCity(state, city)).not.toBe(held);
    // A fresh object, and the same answer: the memo is a cache and never a rule.
    for (const key of CITY_YIELD_KEYS) {
      expect(readCity(state, city).flats[key], key).toBe(held.flats[key]);
    }
  });

  it('keys on the board, so a second game reads its own', () => {
    const first = game().state;
    const cityA = found(first, 0)!;
    const second = game().state;
    const cityB = found(second, 0)!;
    expect(readCity(first, cityA)).not.toBe(readCity(second, cityB));
  });

  it('never reaches the snapshot', () => {
    // `snapshotState` is `JSON.stringify(state)` and every replay in the suite
    // compares it byte for byte, so a cache hung on the state would not be a
    // cache — it would be a rule. The memos are `WeakMap`s beside it.
    const { state } = game();
    found(state, 0);
    const clean = snapshotState(state);
    void readEmpire(state, 0);
    void readCity(state, state.cities[0]!);
    expect(snapshotState(state)).toBe(clean);
  });

  it('moves on an accepted command and stands still on a refused one', () => {
    const { state } = game();
    const was = state.revision;
    // A command that cannot be: no such unit. A refusal leaves the state
    // byte-identical, and a counter that moved would be a byte that moved.
    const refused = applyCommand(state, { type: 'fortify', playerId: 0, unitId: 99_999 });
    expect(refused.ok).toBe(false);
    expect(state.revision).toBe(was);

    const taken = applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: 'mining' });
    expect(taken.ok).toBe(true);
    expect(state.revision).toBe(was + 1);
  });

  it('moves once per phase across a resolution', () => {
    const state = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e' },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    const was = state.revision;
    runEndOfTurn(state);
    // The whole reason the counter is not `game.log.length`: a resolution moves
    // the world without a command behind it (`docs/audit/evaluations.md` §2b).
    expect(state.revision - was).toBe(END_OF_TURN_PHASES.length);
  });

  it('starts at nought and is in the save', () => {
    const state = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e' },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    expect(state.revision).toBe(0);
    expect(JSON.parse(snapshotState(state)).revision).toBe(0);
  });
});

/**
 * **The routes on offer, remembered** — batch R1 (`docs/flags.md` item (iii),
 * the user's *"please look into the performance of the trade screen, it gets
 * quite laggy"*).
 *
 * The screen's cost was the gate, not the drawing: `routeStartable` runs A* per
 * mode and `pathTurns` over what it finds, and every open re-asked it for every
 * ordered pair. `readRoutes` is the third verb over the lot — the gate, the two
 * yield folds, the price and the post's reach — memoised on the revision.
 *
 * Three claims, and each is a way this could be wrong while every figure still
 * added up: it is the *simulation's* gate rather than a second one; it is a
 * cache rather than a rule (a fresh object with the same answer once the world
 * moves, and never a byte of the snapshot); and it is actually cheaper.
 */
describe('the routes on offer are remembered on the revision', () => {
  /** Two towns of one seat, a market, a purse — a board with a route to hire. */
  function trading(): { state: GameState; home: City; partner: City } {
    const { state } = game(19);
    const home = found(state, 0)!;
    // The nearest hex the simulation's own gate will take a second town on, so
    // the pair is a pair the reading is allowed to have an opinion about.
    const site = state.map.tiles.find(
      (tile) => foundingErrorAt(state, 0, tile) === null,
    );
    expect(site).toBeDefined();
    const partner = foundCityAt(state, 0, site!);
    home.buildings.push('market');
    playerById(state, 0)!.gold = 5_000;
    bumpRevision(state);
    return { state, home, partner };
  }

  it('hands the same reading back until the world moves', () => {
    const { state } = trading();
    const held = readRoutes(state, 0);
    expect(readRoutes(state, 0)).toBe(held);
    bumpRevision(state);
    const fresh = readRoutes(state, 0);
    expect(fresh).not.toBe(held);
    // A cache, never a rule: the same answer in a new object.
    expect(fresh.rows.length).toBe(held.rows.length);
    expect(fresh.price).toBe(held.price);
  });

  it('never reaches the snapshot', () => {
    const { state } = trading();
    const clean = snapshotState(state);
    void readRoutes(state, 0);
    expect(snapshotState(state)).toBe(clean);
  });

  it('is the simulation’s own gate, price and folds', () => {
    const { state, home, partner } = trading();
    const reading = readRoutes(state, 0);
    expect(reading.price).toBe(routePrice(state, 0));
    expect(reading.slots).toBe(routeSlots(state, 0));
    expect(reading.used).toBe(usedRouteSlots(state, 0));

    const row = reading.rows.find((entry) => entry.from.id === home.id && entry.to.id === partner.id);
    expect(row).toBeDefined();
    expect(row!.modes).toEqual(routeModesAvailable(state, 0, home.id, partner.id));
    expect(row!.available).toBe(row!.modes.length > 0);
    for (const paid of row!.pays) {
      // Rule 5 twice over: the lines are `routeYields.ts`' own, and the total is
      // the fold of them and never a sum taken beside it.
      expect(paid.lines).toEqual(explainRouteYieldBetween(state, home, partner, paid.mode));
      expect(paid.total).toEqual(foldRouteYield(paid.lines));
    }
    // A refused pair carries the gate's own sentence and no pay at all.
    const refused = reading.rows.find((entry) => !entry.available);
    if (refused) {
      expect(refused.pays).toEqual([]);
      expect(refused.refusal).toBe(
        routeStartable(state, 0, refused.from.id, refused.to.id, 'land'),
      );
    }
  });

  it('counts the hexes a land cart would pave, the origin’s own excepted', () => {
    const { state, home, partner } = trading();
    const row = readRoutes(state, 0).rows.find(
      (entry) => entry.from.id === home.id && entry.to.id === partner.id,
    )!;
    if (row.modes.includes('land')) {
      expect(row.roadHexes).not.toBeNull();
      expect(row.roadHexes!).toBeGreaterThan(0);
      // Every hex of the leg but the gates it starts in, and never more.
      expect(row.turns).not.toBeNull();
    }
  });

  it('is cheaper on the second ask than on the first', () => {
    // The batch's own measurement, as an assertion rather than a note: a walk
    // that costs a few hundred pathfinding searches must not be paid twice in
    // one revision. A ratio rather than a millisecond figure, so the pin is
    // about the memo and not about this machine.
    const { state } = trading();
    const first = performance.now();
    void readRoutes(state, 0);
    const walked = performance.now() - first;
    const second = performance.now();
    for (let ask = 0; ask < 50; ask += 1) void readRoutes(state, 0);
    const hits = performance.now() - second;
    expect(hits).toBeLessThan(walked);
  });
});

/**
 * **The two empire walks, remembered** — batch M1 (`docs/flags.md` item (ggg),
 * the M1 paragraph; `docs/bot-priorities.md`, "Batch X6 as shipped", known gaps).
 *
 * `meterEffects` and `controlledHoldings` are the two largest single costs in a
 * bot's turn and neither was remembered. They are not `read…` verbs and cannot
 * be: both are asked from *inside* the simulation — `empirePercents`,
 * `borderGrowth`, `explainGrowthPercent`, `tilePurchaseError` — by modules that
 * would make a runtime cycle out of importing `readings.ts`. So they sit on the
 * same slate, under them, and the three claims below are what makes that a cache
 * rather than a rule.
 */
describe('the two empire walks are remembered on the same slate', () => {
  it('hands the same list back until the world moves', () => {
    const { state } = game();
    found(state, 0);
    expect(meterEffects(state, 0)).toBe(meterEffects(state, 0));
    expect(controlledHoldings(state, 0, 'luxury')).toBe(controlledHoldings(state, 0, 'luxury'));

    const held = meterEffects(state, 0);
    const holdings = controlledHoldings(state, 0, 'luxury');
    bumpRevision(state);
    expect(meterEffects(state, 0)).not.toBe(held);
    expect(controlledHoldings(state, 0, 'luxury')).not.toBe(holdings);
    // A fresh object, and the same answer — which is the whole claim.
    expect(meterEffects(state, 0)).toEqual(held);
    expect(controlledHoldings(state, 0, 'luxury')).toEqual(holdings);
  });

  it('keeps the kinds apart, and the seats', () => {
    // One bucket per `(kind, seat)`: a memo that answered "which strategics"
    // with "which luxuries" would be silent and total.
    const { state } = game();
    found(state, 0);
    found(state, 1);
    expect(controlledHoldings(state, 0, 'luxury')).not.toBe(
      controlledHoldings(state, 0, 'strategic'),
    );
    expect(meterEffects(state, 0)).not.toBe(meterEffects(state, 1));
  });

  it('remembers a reading taken after a write (batch M3)', () => {
    // The window is **gone**. M1 suspended the slate for the length of every
    // handler and every phase, because the revision is raised after the fact, so
    // a phase that asked the same question a hundred times walked the empire a
    // hundred times — 8% of a bot's game, measured. M3 announces at the mutation
    // instead, so the pair below is one walk: the write threw the old answer
    // away, and the answer *after* it is remembered like any other.
    //
    // Written with a real write (`claimTile`, `expandBorders`' own seam) rather
    // than by pretending to be a phase, because since M3 there is no difference
    // between the two — which is the whole claim. The phase name is set anyway,
    // since that is the state a resolution is really in.
    const { state } = game();
    const city = found(state, 0)!;
    const before = meterEffects(state, 0);
    const free = state.map.tiles.find(
      (tile) => state.tileOwner[tileIndex(state.map, tile.col, tile.row)] === null,
    );
    expect(claimTile(state, city, free!)).toBe(true);
    setSlatePhase('expandBorders');
    try {
      const after = meterEffects(state, 0);
      expect(after).not.toBe(before);
      expect(meterEffects(state, 0)).toBe(after);
    } finally {
      setSlatePhase('');
    }
  });

  it('throws the answer away on the line a write happens', () => {
    // The other half of the same claim, and the one that makes it a cache: a
    // hex claimed inside a phase changes what the empire holds *there*, not when
    // the phase is over. `claimTile` is the announcement's own site, and the
    // holdings walk is the reading a claimed hex actually moves.
    const { state } = game();
    found(state, 0);
    const city = state.cities[0]!;
    const held = controlledHoldings(state, 0, 'luxury');
    const free = state.map.tiles.find(
      (tile) => state.tileOwner[tileIndex(state.map, tile.col, tile.row)] === null,
    );
    expect(free).toBeDefined();
    expect(claimTile(state, city, free!)).toBe(true);
    expect(controlledHoldings(state, 0, 'luxury')).not.toBe(held);
  });

  it('shadow mode agrees with itself across a whole resolution', () => {
    // The proof of the register (`setSlateShadow`): every hit recomputes and the
    // two must be deeply equal. A resolution is the hardest case there is —
    // every phase writes, and `collectYields` asks the meters once a town.
    const { state } = game();
    found(state, 0);
    found(state, 1);
    const was = slateShadow();
    setSlateShadow(true);
    try {
      expect(() => runEndOfTurn(state)).not.toThrow();
    } finally {
      // **Restored, never switched off.** The workers keep their module graph
      // between files (`isolate: false`), and the whole suite is run with the
      // shadow on when the reducer changes — a `false` here would quietly end
      // that run for every file after this one.
      setSlateShadow(was);
    }
  });

  it('shadow mode catches a write that said nothing', () => {
    // And it fails when it should: a field poked by hand — the thing a bench
    // does and a new unannounced write in `src/sim` would do — is exactly the
    // stale answer the shadow check exists to name. `city.population` is a line
    // of `explainHappiness`.
    const { state } = game();
    found(state, 0);
    void meterEffects(state, 0);
    state.cities[0]!.population += 3;
    const was = slateShadow();
    setSlateShadow(true);
    try {
      expect(() => meterEffects(state, 0)).toThrowError(/slate shadow/);
    } finally {
      setSlateShadow(was);
    }
  });

  it('never reaches the snapshot', () => {
    const { state } = game();
    found(state, 0);
    const clean = snapshotState(state);
    void meterEffects(state, 0);
    void controlledHoldings(state, 0, 'luxury');
    expect(snapshotState(state)).toBe(clean);
  });

  it('is void when the table under it is swapped', () => {
    // `withExtraResources` installs an invented row for the length of a body — a
    // proof obligation, not a mechanic — and a board's revision cannot see it.
    // The slate's second integer can (`discardSlates`).
    const { state } = game();
    const city = found(state, 0);
    const seam = state.map.tiles.find(
      (tile) => state.tileOwner[tileIndex(state.map, tile.col, tile.row)] === city.id,
    )!;
    seam.resource = 'silk';
    seam.improvement = 'plantation';
    bumpRevision(state);
    const before = controlledHoldings(state, 0, 'luxury').map((holding) => holding.id);
    expect(before).toContain('silk');
    const inside = withExtraResources(
      {
        silk: {
          ...(resourceDef('silk') as unknown as Record<string, unknown>),
          kind: 'strategic',
        } as never,
      },
      () => controlledHoldings(state, 0, 'luxury').map((holding) => holding.id),
    );
    expect(inside).not.toContain('silk');
    // And put back, with no revision having moved on either side of it.
    expect(controlledHoldings(state, 0, 'luxury').map((holding) => holding.id)).toEqual(before);
  });
});

/**
 * **The second clock** — batch M2.
 *
 * M1's closing finding: *"what remains is misses — the revision moves on every
 * command, so a seat pays one walk per command rather than one per question."* A
 * seat sends dozens of commands a turn that move a piece and nothing else, and
 * every one of them threw away the empire's holdings and meters, which no step
 * can reach. The economy clock is the answer, and the three claims below are the
 * ways it could be wrong: still when it should have moved (a stale reading, the
 * only real failure), moving when it needn't (merely slow), and the one command
 * kind whose honest answer is not a property of its kind.
 */
describe('the economy clock is the coarser subscription', () => {
  /** The seat's own piece, and a hex beside it that it may walk onto. */
  const stepOut = (
    state: ReturnType<typeof game>['state'],
    unitId: number,
  ): { col: number; row: number } => {
    const unit = state.units.find((piece) => piece.id === unitId)!;
    const from = getTileAt(state.map, unit.col, unit.row)!;
    for (const hex of mapNeighbors(state.map, tileHex(from))) {
      const tile = getTile(state.map, hex);
      if (tile && !isWaterTerrain(tile.terrain)) return { col: tile.col, row: tile.row };
    }
    throw new Error('no dry hex beside the piece');
  };

  it('keeps the ground still when a piece steps, and moves the meters with it', () => {
    // **The correction batch M3's shadow run made to M2's table.** M2 claimed a
    // step could not reach the empire's happiness, because `meters.ts` never
    // opens `state.units`. It does not — but the card evaluator it folds does:
    // The Long Watch pays "+1 happiness for each unit standing in one of your
    // cities", so where a piece *stands* is a line of `explainHappiness`. The
    // ground it walks over is a different question, and `controlledHoldings`
    // still cannot see a piece at all.
    const { state } = game();
    found(state, 0);
    const town = state.cities[0]!;
    const holdings = controlledHoldings(state, 0, 'luxury');
    const meters = meterEffects(state, 0);
    const list = readCity(state, town);
    const revision = state.revision;

    const scout = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'scout')!;
    const marched = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: scout.id,
      target: stepOut(state, scout.id),
    });
    expect(marched).toEqual({ ok: true });

    // The world moved — the revision says so, and the town's own list is a fresh
    // object because a piece is exactly the kind of thing a town's list can see.
    expect(state.revision).toBe(revision + 1);
    expect(readCity(state, town)).not.toBe(list);
    // The step announced itself where it happened (`advanceAlongPath`), so the
    // meters are taken again — and answer the same thing, because this scout is
    // not standing in a town.
    expect(meterEffects(state, 0)).not.toBe(meters);
    expect(meterEffects(state, 0)).toEqual(meters);
    // The holdings walk is the ground and nothing else, so the answer is the
    // same — an *equal* list rather than the same object, because a clock throws
    // its whole half away and the two walks share one (`slate.ts`'s third fact).
    // What the narrow door still buys is the four order-only commands below.
    expect(controlledHoldings(state, 0, 'luxury')).toEqual(holdings);
  });

  it('stands still on the other four orders too', () => {
    const { state } = game();
    found(state, 0);
    const settler = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'settler')!;
    const scout = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'scout')!;
    const economy = economyStamp(state);
    void meterEffects(state, 0);
    const held = meterEffects(state, 0);

    // Sleep, then never mind; explore, then never mind. Four accepted orders,
    // four turns of the revision, and one still economy clock.
    expect(applyCommand(state, { type: 'sleepUnit', playerId: 0, unitId: settler.id }).ok).toBe(
      true,
    );
    expect(applyCommand(state, { type: 'cancelOrder', playerId: 0, unitId: settler.id }).ok).toBe(
      true,
    );
    expect(
      applyCommand(state, { type: 'setAutoExplore', playerId: 0, unitId: scout.id, on: true }).ok,
    ).toBe(true);
    expect(applyCommand(state, { type: 'cancelOrder', playerId: 0, unitId: scout.id }).ok).toBe(
      true,
    );
    expect(state.revision).toBeGreaterThan(0);
    expect(economyStamp(state)).toBe(economy);
    expect(meterEffects(state, 0)).toBe(held);
  });

  it('moves on a command that changes what the walks read', () => {
    const { state } = game();
    found(state, 0);
    const meters = meterEffects(state, 0);
    const economy = economyStamp(state);
    const taken = applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: 'mining' });
    expect(taken.ok).toBe(true);
    // A technology is one of `liveEffects`' sources and the meters fold them.
    expect(economyStamp(state)).toBe(economy + 1);
    expect(meterEffects(state, 0)).not.toBe(meters);
    expect(meterEffects(state, 0)).toEqual(meters);
  });

  it('moves when a march arrives on a ruin', () => {
    // The one kind whose answer is not a property of its kind. A march ends in
    // `arriveOnTile` on every step, and arriving is how a ruin is claimed and a
    // camp is burnt out — each of which pays somebody. The decision is made from
    // the *result*, after the command, so it is exact rather than by category.
    // Since batch M3 the steps themselves announce as well, so the count below
    // is a floor: what this pins is that a march which *found* something is an
    // economy command however few steps it took.
    const { state } = game();
    found(state, 0);
    const scout = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'scout')!;
    const target = stepOut(state, scout.id);
    getTileAt(state.map, target.col, target.row)!.discovery = 'ruins';
    bumpRevision(state);
    const meters = meterEffects(state, 0);
    const economy = economyStamp(state);

    const marched = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: scout.id,
      target,
    });
    expect(marched.ok && marched.arrivals?.length).toBe(1);
    expect(economyStamp(state)).toBeGreaterThan(economy);
    expect(meterEffects(state, 0)).not.toBe(meters);
  });

  it('moves at least once per phase across a resolution', () => {
    // A phase is a writer that says nothing about how much it moved, so both
    // clocks follow it — `bumpRevision` is that announcement, and it is still
    // taken once per phase. Since batch M3 the writes *inside* a phase announce
    // themselves as well (a hex claimed, a citizen born, a technology learnt),
    // so the count is a floor rather than an equality: the phase's own bump is
    // what guarantees the floor, and anything above it is the register doing its
    // work. See `slate.ts`'s M3 section.
    const { state } = game();
    found(state, 0);
    const economy = economyStamp(state);
    const revision = state.revision;
    runEndOfTurn(state);
    expect(economyStamp(state) - economy).toBeGreaterThanOrEqual(END_OF_TURN_PHASES.length);
    // The revision is unchanged in every respect: exactly one per phase.
    expect(state.revision - revision).toBe(END_OF_TURN_PHASES.length);
  });

  it('never reaches the snapshot', () => {
    // The revision is a serialised field and this is not: the state is
    // `JSON.stringify`d into every save hash, and a second counter on it would
    // be a schema change for a key no rule reads.
    const { state } = game();
    found(state, 0);
    const clean = snapshotState(state);
    bumpRevision(state);
    expect(economyStamp(state)).toBeGreaterThan(0);
    expect(snapshotState(state).replace(/"revision":\d+/, '')).toBe(
      clean.replace(/"revision":\d+/, ''),
    );
  });
});

describe('the empire’s reading is what the surfaces read', () => {
  it('totals exactly what the top bar prints', () => {
    const { state } = game();
    const city = found(state, 0)!;
    city.buildings.push('monument', 'library');
    bumpRevision(state);
    const totals = readEmpire(state, 0).totals;
    const headline = readEmpire(state, 0).totals;
    for (const key of CITY_YIELD_KEYS) expect(totals[key], key).toBe(headline[key]);
  });

  it('is the towns’ own totals plus the empire’s own lines, and nothing else', () => {
    const { state } = game();
    found(state, 0);
    const reading = readEmpire(state, 0);
    const sum = emptyCityYields();
    for (const town of reading.towns) {
      const banked = foldCity(state, town.city, [], town.city.queue[0], town.reading);
      for (const key of CITY_YIELD_KEYS) sum[key] += banked[key];
    }
    for (const line of reading.lines) {
      for (const key of CITY_YIELD_KEYS) sum[key] += line[key];
    }
    for (const key of CITY_YIELD_KEYS) expect(sum[key], key).toBe(reading.totals[key]);
  });
});

// --- the register -----------------------------------------------------------

describe('nobody rebuilds the town’s list', () => {
  const SOURCE = {
    ...(import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>),
    ...(import.meta.glob('../../src/ui/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>),
    ...(import.meta.glob('../../src/ai/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>),
    ...(import.meta.glob('../../src/main.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>),
  };

  const read = (name: string): string => {
    const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${name}`));
    expect(key, `${name} readable`).toBeDefined();
    return SOURCE[key!]!;
  };

  /** The file with its prose taken out — a docblock naming a function is not a call. */
  const code = (text: string): string =>
    text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');

  it('has no `cityFlatsByClass` left anywhere', () => {
    // The Ledger's mirror of `explainCity` — eleven lists walked a second time —
    // is the largest of the four private copies §3a names, and it is gone rather
    // than merely unused: the class is on the line now.
    for (const [path, text] of Object.entries(SOURCE)) {
      expect(`${path}: ${text.includes('cityFlatsByClass')}`).toBe(`${path}: false`);
    }
  });

  it('has each reader subscribing to the reading', () => {
    // The five surfaces §3a names, each reading `readings.ts` rather than
    // walking the layers itself.
    for (const [file, what] of [
      ['ledgerScreen.ts', 'readEmpire'],
      ['cityPanel.ts', 'readCity'],
      ['topBar.ts', 'readEmpire'],
      ['cardImpact.ts', 'readCity'],
      ['value.ts', 'readCity'],
      ['bot.ts', 'readCity'],
    ] as const) {
      const text = read(file);
      expect(`${file} imports`).toBe(
        /from '(\.\.\/sim|\.)\/readings'/.test(text) ? `${file} imports` : `${file} does not import`,
      );
      expect(`${file}: ${text.includes(what)}`).toBe(`${file}: true`);
    }
  });

  it('keys no memo in the simulation on the log', () => {
    // `game.log.length` was the interface's revision and the right idea one
    // layer too high — the sim's own phases move the state without moving the
    // log, and nothing in `src/sim` can see a log at all. The state carries the
    // counter now, and `main.ts` reads it off the state.
    // One stated exception, and it is not a memo: `game.ts` replays a save by
    // walking the log it was handed.
    for (const [path, text] of Object.entries(SOURCE)) {
      if (!path.includes('/sim/') || path.endsWith('/game.ts')) continue;
      expect(`${path}: ${text.includes('log.length')}`).toBe(`${path}: false`);
    }
    expect(read('main.ts')).toContain('getRevision: () => game.state.revision');
  });

  it('keys no memo anywhere on a print of what it is remembering', () => {
    // Batch E3a finished the job §3c started. `liveReading` was the last memo in
    // the game trusted on a *walk* of its own inputs — every slot, belief,
    // building, legacy, timed effect, bead, technology and held religion, read
    // again as values on every one of the fifty-four `effectsOfKind` asks — plus
    // a re-ask of every empire condition the build consulted. It is two integers
    // and an object identity now, like the three memos above it.
    //
    // The names, not the prose: `liveReading`'s docblock explains what went and
    // why, which it cannot do without saying the words.
    for (const [path, text] of Object.entries(SOURCE)) {
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, ''))
        .join('\n');
      for (const gone of ['livePrint', 'printsAgree', 'gatesAgree']) {
        expect(`${path} ${gone}: ${code.includes(gone)}`).toBe(`${path} ${gone}: false`);
      }
    }
    // And the one `WeakMap` in the game that is not keyed on the revision is the
    // topBar's fit observer, which is keyed on a DOM element and remembers no
    // reading at all. Every other one carries a revision beside it.
    for (const [path, text] of Object.entries(SOURCE)) {
      if (!text.includes('new WeakMap<GameState')) continue;
      if (path.endsWith('/dealMemory.ts')) {
        // **The one exception, since X4, and it is not a memo.** It remembers
        // something that *happened* — a paper a rival sent back — rather than a
        // reading derived from the board, so a revision would erase it on the
        // next command and the loop it closes would open again. What keeps a
        // stale entry from answering is the memo discipline read one layer up:
        // its own fingerprint of what the rival holds, and an absolute turn.
        expect(`${path} says what it keys on`).toBe(
          /fingerprint/.test(text) && /turn/.test(text)
            ? `${path} says what it keys on`
            : `${path} says nothing about what it keys on`,
        );
        continue;
      }
      expect(`${path} keys on the revision`).toBe(
        /revision/.test(text) ? `${path} keys on the revision` : `${path} keys on something else`,
      );
    }
  });

  it('holds the slate in one file, and keys it on the two clocks', () => {
    // Batch M1: the machinery moved into `slate.ts` so that the two tenants
    // below it — `meterEffects` and `controlledHoldings`, which are asked from
    // *inside* the simulation and cannot import `readings.ts` — sit on the same
    // slate as the three readings above it. Two `WeakMap`s keyed on the same
    // integer would be two caches with two lifetimes.
    const slate = read('slate.ts');
    expect(slate).toContain('new WeakMap<GameState, Slate>');
    // Batch M2: one slate still, in two halves, each thrown away by its own
    // clock — the revision as it always was, and the economy clock beside it.
    expect(slate).toContain("clock === 'revision' ? state.revision : economyStamp(state)");
    expect(slate).toContain('half.stamp !== stamp || half.epoch !== epoch');
    expect(read('readings.ts')).toContain("from './slate'");
    // And nowhere else keeps one: the readings' own `WeakMap` is gone.
    expect(read('readings.ts').includes('new WeakMap')).toBe(false);
  });

  it('keeps the economy clock off the state, where the revision is', () => {
    // The first of the slate's three facts, applied to the second counter: the
    // state is `JSON.stringify`d into every save hash, so a field would be a
    // schema change and a different byte in every snapshot for a key no rule
    // reads. The revision earned its place there by being replayed; this is a
    // cache key and lives with the cache.
    expect(read('slate.ts')).toContain('new WeakMap<GameState, number>');
    expect(read('state.ts').includes('economyRevision:')).toBe(false);
    // And the broad announcement moves both, so a hand that pokes the board is
    // conservative by default (`bumpRevision`) and only `applyCommand` may say
    // the narrow thing.
    const state = read('state.ts');
    expect(state).toContain('state.revision += 1;\n  bumpEconomy(state);');
    expect(state).toContain('export function bumpPiecesOnly');
    const callers = Object.entries(SOURCE).filter(
      ([path, text]) => !path.endsWith('/state.ts') && code(text).includes('bumpPiecesOnly'),
    );
    expect(callers.map(([path]) => path.slice(path.lastIndexOf('/') + 1))).toEqual([
      'commands.ts',
    ]);
  });

  it('registers every command kind on exactly one clock', () => {
    // The rule of record (batch M2). A kind in neither list is a kind whose
    // memos nobody thought about, and the failure it causes is a stale reading
    // rather than a slow one — so it fails here, beside the `Record` that
    // already fails the typecheck.
    const source = read('commands.ts');
    const table = /export const COMMAND_CLOCKS: Record<CommandType, CommandClock> = \{([\s\S]*?)\n\};/
      .exec(source);
    expect(table, 'COMMAND_CLOCKS readable').not.toBeNull();
    const registered = new Map<string, string>();
    for (const line of table![1]!.split('\n')) {
      if (line.trim() === '') continue;
      const row = /^\s*([A-Za-z]+): '(economy|movement)',$/.exec(line);
      expect(row, `registered row: ${line}`).not.toBeNull();
      expect(registered.has(row![1]!), `${row![1]!} listed once`).toBe(false);
      registered.set(row![1]!, row![2]!);
    }
    // Every kind the reducer dispatches, read off the switch itself.
    const switchBody = /function runCommand\(state: GameState, command: Command\): CommandResult \{([\s\S]*?)\n\}/
      .exec(source);
    expect(switchBody, 'runCommand readable').not.toBeNull();
    const dispatched = [...switchBody![1]!.matchAll(/case '([A-Za-z]+)':/g)].map((hit) => hit[1]!);
    expect(dispatched.length).toBeGreaterThan(50);
    expect([...registered.keys()].sort()).toEqual([...dispatched].sort());
    // And the five that are not economy are the orders that only move a piece.
    const movement = [...registered.entries()]
      .filter(([, clock]) => clock === 'movement')
      .map(([kind]) => kind)
      .sort();
    expect(movement).toEqual(
      ['cancelOrder', 'fortify', 'moveUnit', 'setAutoExplore', 'sleepUnit'].sort(),
    );
  });

  it('keeps the reading leaf out of `cities.ts`', () => {
    // `readings.ts` imports `cities.ts`; the reverse would be a runtime cycle
    // (`test/mapgen/moduleCycles.test.ts` is the gate, and the symptom is "X is
    // not a function" everywhere). It is why `collectYields` still takes its own
    // readings — see the phase's docblock for the second reason.
    expect(read('cities.ts').includes("from './readings'")).toBe(false);
    expect(read('readings.ts').includes("from './cities'")).toBe(true);
  });
});
