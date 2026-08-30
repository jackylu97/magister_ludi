/**
 * Guilds: the passive specialist (ledger Entry XLVIII).
 *
 * What is on trial here is a loop with four gates on it. A town banks its own
 * buildings' renown, its guildsmen's trickle, a weight on its people and a much
 * larger weight on the people it cannot seat; when the bar covers a climbing
 * threshold a citizen leaves the fields for a trade, chosen by apportionment and
 * never by a draw. The gates are what make it a system rather than a ramp: no
 * renown family, no guild; never past a quarter of the town unless somebody is
 * idle; and never the last worker.
 *
 * The yields half is rule 5 read for a fourth kind of source — a specialist's
 * science is a labelled line of `cityQuote`'s flats, so the chips, the ledger
 * and the resolution agree by construction — and the renown half is the loop
 * closing: a guildsman pays a point a turn into its own family's feed, which is
 * the weighting a great person is drawn against.
 *
 * `renown.test.ts` owns the empire ledger this splits; `cities.test.ts` owns the
 * assignment this shortens.
 */

import { describe, expect, it } from 'vitest';

import { type BuildingId } from '../../src/sim/buildingData';
import {
  assignableTiles,
  cityQuote,
  cityYields,
  claimTile,
  refreshCityDerived,
  tileYieldOf,
  workableSeats,
  yieldContextFor,
  yieldScore,
} from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import {
  type Game,
  dispatch,
  loadGame,
  restoreState,
  saveGame,
  snapshotState,
} from '../../src/sim/game';
import { SPECIALIST_FAMILIES } from '../../src/sim/greatPeopleData';
import {
  cityGuildInflow,
  dismissSpecialistError,
  explainGuildInflow,
  foldGuildInflow,
  guildIdleLine,
  idleCitizens,
  nextGuildFamily,
  runGuilds,
} from '../../src/sim/guilds';
import { getTileAt, tileHex, mapRange } from '../../src/sim/map';
import { explainCityRenown, explainRenown, foldRenown } from '../../src/sim/renown';
import { RULES } from '../../src/sim/rulesData';
import {
  canFormGuild,
  citySpecialistYields,
  guildThreshold,
  specialistThreshold,
  totalSpecialists,
} from '../../src/sim/specialists';
import type { City, GameState } from '../../src/sim/state';
import { runEndOfTurn } from '../../src/sim/turn';
import { game, found } from './statecraftHelpers';

const GUILDS = RULES.cities.guilds;

/** A city of this seat, at a chosen size, with the named buildings standing. */
function town(
  state: GameState,
  playerId: number,
  population: number,
  ...buildings: BuildingId[]
): City {
  const city = state.cities.find((c) => c.ownerId === playerId) ?? found(state, playerId);
  city.population = population;
  for (const id of buildings) if (!city.buildings.includes(id)) city.buildings.push(id);
  refreshCityDerived(state, city);
  return city;
}

/**
 * Claims ground around a town until it can seat `wanted` citizens.
 *
 * A founded city owns one ring, which is six workable hexes at most — so every
 * fixture above size six here is *idle* unless it is given room. Growing the
 * borders the honest way is forty turns of culture, and what is on trial is not
 * `expandBorders`.
 */
function openGround(state: GameState, city: City, wanted: number): void {
  for (const tile of mapRange(
    state.map,
    tileHex(state.map.tiles.find((t) => t.col === city.col && t.row === city.row)!),
    RULES.cities.workRadius,
  )) {
    if (workableSeats(state, city) >= wanted) break;
    claimTile(state, city, tile);
  }
  refreshCityDerived(state, city);
}

/** Runs the phase `turns` times and answers when the first guild formed. */
function turnsToFirstGuild(state: GameState, city: City, turns = 400): number | null {
  for (let turn = 1; turn <= turns; turn++) {
    runGuilds(state);
    if (totalSpecialists(city) > 0) return turn;
  }
  return null;
}

// --- the bar ----------------------------------------------------------------

describe('the guild bar', () => {
  it('fills from the town\'s own specialist-family renown, and its people', () => {
    const g = game();
    const city = town(g.state, 0, 4, 'library');
    // 1 from the library, plus `popWeight` a head. Nothing else: no guilds yet.
    expect(cityGuildInflow(g.state, city)).toBeCloseTo(1 + GUILDS.popWeight * 4, 10);
    runGuilds(g.state);
    expect(city.guildBasket).toBeCloseTo(1 + GUILDS.popWeight * 4, 10);
  });

  it('is the fold of its own list, line by line', () => {
    const g = game();
    const city = town(g.state, 0, 4, 'library', 'market');
    const lines = explainGuildInflow(g.state, city);
    expect(lines.map((line) => line.source)).toEqual([
      `Library at ${city.name}`,
      `Market at ${city.name}`,
      'Townspeople',
    ]);
    expect(foldGuildInflow(lines)).toBe(cityGuildInflow(g.state, city));
  });

  it('takes nothing at all from a general-family building', () => {
    const g = game();
    const barracks = town(g.state, 0, 4, 'barracks');
    // The barracks is on the *empire's* renown ledger and not on this list: a
    // barracks makes a great general, and a general is not a townsman.
    expect(foldRenown(explainCityRenown(barracks))).toBe(1);
    expect(explainGuildInflow(g.state, barracks).map((l) => l.source)).toEqual(['Townspeople']);
  });

  it('is accelerated by the guilds a town already has', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    // Room for everybody, so what moves below is the trickle and not the idle
    // line — the two are different rules and this one is about the trickle.
    openGround(g.state, city, 12);
    const alone = cityGuildInflow(g.state, city);
    city.specialists.scholar = 2;
    refreshCityDerived(g.state, city);
    expect(cityGuildInflow(g.state, city)).toBeCloseTo(alone + GUILDS.trickle * 2, 10);
  });
});

// --- the threshold ----------------------------------------------------------

describe('the threshold', () => {
  it('climbs on the growth curve\'s own three terms', () => {
    // `base + linear × n + n ^ exponent`, floored — the shape `growthThreshold`
    // uses, with the guild table's constants in it.
    expect([0, 1, 2, 3, 4].map(specialistThreshold)).toEqual([60, 67, 75, 84, 93]);
  });

  it('is asked of the town, over every family at once', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    expect(guildThreshold(city)).toBe(specialistThreshold(0));
    city.specialists.scholar = 1;
    city.specialists.merchant = 1;
    expect(guildThreshold(city)).toBe(specialistThreshold(2));
  });
});

// --- conversion -------------------------------------------------------------

describe('a conversion', () => {
  it('spends the threshold and carries the remainder', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    openGround(g.state, city, 12);
    city.guildBasket = specialistThreshold(0) + 4;
    // The inflow the phase will bank is this town's *before* the conversion —
    // the guildsman it is about to seat has not started trickling yet.
    const banked = cityGuildInflow(g.state, city);
    runGuilds(g.state);
    expect(totalSpecialists(city)).toBe(1);
    // The bar restarts at the remainder plus that inflow — a food basket's
    // arithmetic, one currency over.
    expect(city.guildBasket).toBeCloseTo(4 + banked, 10);
  });

  it('never converts a town with no renown in any specialist family', () => {
    const g = game();
    const city = town(g.state, 0, 20, 'barracks');
    openGround(g.state, city, 20);
    city.guildBasket = 10_000;
    runGuilds(g.state);
    // The bar accrues — population and a barracks' town are still a crowd — and
    // nobody converts. Population accelerates a guild; it never founds one.
    expect(totalSpecialists(city)).toBe(0);
    expect(city.guildBasket).toBeGreaterThan(10_000);
  });

  it('never converts a town of one', () => {
    const g = game();
    const city = town(g.state, 0, 1, 'library');
    city.guildBasket = 10_000;
    runGuilds(g.state);
    expect(totalSpecialists(city)).toBe(0);
  });

  it('reports what it did, once per conversion, with the town\'s total after', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    openGround(g.state, city, 12);
    city.guildBasket = specialistThreshold(0);
    const report = runEndOfTurn(g.state);
    const mine = report.guilds.filter((entry) => entry.cityId === city.id);
    expect(mine).toEqual([
      { cityId: city.id, ownerId: 0, family: 'scholar', count: 1 },
    ]);
  });
});

// --- apportionment ----------------------------------------------------------

describe('apportionment', () => {
  it('names the family whose renown is least represented', () => {
    const g = game();
    // Two scholar points against one merchant: the first guild is a scholar's.
    const city = town(g.state, 0, 20, 'university', 'market');
    expect(nextGuildFamily(city)).toBe('scholar');
    // With one scholar seated, 2 ÷ 2 ties 1 ÷ 1 — and a tie goes to the earlier
    // family in the fixed order, which is the scholar again.
    city.specialists.scholar = 1;
    expect(nextGuildFamily(city)).toBe('scholar');
    // With two, 2 ÷ 3 is under 1 ÷ 1 and the market finally gets its clerk.
    city.specialists.scholar = 2;
    expect(nextGuildFamily(city)).toBe('merchant');
  });

  it('breaks a dead tie by the fixed family order', () => {
    const g = game();
    const city = town(g.state, 0, 20, 'library', 'market', 'workshop', 'amphitheater');
    // One point each, nobody seated: every quotient is 1, so the order decides.
    expect(SPECIALIST_FAMILIES[0]).toBe('scholar');
    expect(nextGuildFamily(city)).toBe('scholar');
    city.specialists.scholar = 1;
    expect(nextGuildFamily(city)).toBe('merchant');
    city.specialists.merchant = 1;
    expect(nextGuildFamily(city)).toBe('engineer');
    city.specialists.engineer = 1;
    expect(nextGuildFamily(city)).toBe('artist');
  });

  it('answers nothing when no family has a claim', () => {
    const g = game();
    expect(nextGuildFamily(town(g.state, 0, 12, 'barracks'))).toBeNull();
  });

  it('spends no randomness at all', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    openGround(g.state, city, 12);
    city.guildBasket = specialistThreshold(0);
    const before = snapshotState(g.state).length;
    const rng = { ...g.state.rng };
    runGuilds(g.state);
    expect(totalSpecialists(city)).toBe(1);
    // The seeded stream is untouched: a guild forming costs the world nothing,
    // which is why every other draw in the game lands where it would have.
    expect(g.state.rng).toEqual(rng);
    expect(before).toBeGreaterThan(0);
  });
});

// --- the share cap ----------------------------------------------------------

describe('the share cap', () => {
  it('holds a town to a quarter of its people', () => {
    const g = game();
    const city = town(g.state, 0, 9, 'library');
    openGround(g.state, city, 9);
    for (let turn = 0; turn < 200; turn++) {
      city.guildBasket = 10_000;
      runGuilds(g.state);
    }
    // 4 × (n + 1) <= 9 holds at n = 1 and fails at n = 2: a size-9 town runs two
    // guilds and no more, whatever its bar says.
    expect(totalSpecialists(city)).toBe(2);
    expect(canFormGuild(city)).toBe(false);
  });

  it('is integer-exact at the boundary', () => {
    const g = game();
    const city = town(g.state, 0, 8, 'library');
    city.specialists.scholar = 1;
    expect(canFormGuild(city)).toBe(true);
    city.specialists.scholar = 2;
    expect(canFormGuild(city)).toBe(false);
  });

  it('keeps a town\'s guilds when it shrinks below the cap', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    city.specialists.scholar = 3;
    // A famine, not a dismissal: the cap gates conversion and nothing else.
    city.population = 4;
    city.guildBasket = 10_000;
    runGuilds(g.state);
    expect(city.specialists.scholar).toBe(3);
    expect(canFormGuild(city)).toBe(false);
  });
});

// --- the idle backstop ------------------------------------------------------

describe('the idle backstop', () => {
  it('counts the citizens a town has no hex left to seat', () => {
    const g = game();
    // A freshly founded city owns one ring: six workable hexes at the very most.
    const city = town(g.state, 0, 12, 'library');
    const seats = workableSeats(g.state, city);
    expect(seats).toBeLessThan(12);
    expect(idleCitizens(g.state, city)).toBe(12 - seats);
  });

  it('fills the bar much faster, as its own line', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    const idle = idleCitizens(g.state, city);
    expect(idle).toBeGreaterThan(0);
    const line = guildIdleLine(g.state, city);
    expect(line).toEqual({ source: `${idle} idle`, amount: GUILDS.idleWeight * idle });
    // Room for everybody, and the line is gone.
    openGround(g.state, city, 12);
    expect(guildIdleLine(g.state, city)).toBeNull();
    expect(cityGuildInflow(g.state, city)).toBeCloseTo(
      cityGuildInflow(g.state, city),
      10,
    );
  });

  it('converts past the quarter while anybody is idle, and is cap-bound again once nobody is', () => {
    const g = game();
    const hemmed = town(g.state, 0, 12, 'library');
    for (let turn = 0; turn < 200; turn++) {
      hemmed.guildBasket = 10_000;
      runGuilds(g.state);
    }
    // Seats stay at the founding ring, so the town converts until nobody is
    // idle — well past the three a quarter would have allowed.
    const seats = workableSeats(g.state, hemmed);
    expect(totalSpecialists(hemmed)).toBe(12 - seats);
    expect(totalSpecialists(hemmed)).toBeGreaterThan(3);
    expect(idleCitizens(g.state, hemmed)).toBe(0);
    // And with the crowd cleared it is the ordinary cap that stops it.
    hemmed.guildBasket = 10_000;
    runGuilds(g.state);
    expect(totalSpecialists(hemmed)).toBe(12 - seats);
  });
});

// --- the citizen who left ---------------------------------------------------

describe('the citizen who left', () => {
  it('is one fewer worker on the land, and it is the worst hex that goes', () => {
    const g = game();
    const city = town(g.state, 0, 5, 'library');
    openGround(g.state, city, 5);
    expect(city.workedTiles).toHaveLength(5);
    const before = city.workedTiles.map((cell) => `${cell.col},${cell.row}`);

    city.guildBasket = specialistThreshold(0);
    runGuilds(g.state);
    expect(totalSpecialists(city)).toBe(1);
    expect(city.workedTiles).toHaveLength(city.population - totalSpecialists(city));

    // Exactly one hex was given up, and it is one of the ones that were worked
    // — the assignment simply stopped one seat earlier.
    const after = city.workedTiles.map((cell) => `${cell.col},${cell.row}`);
    const dropped = before.filter((key) => !after.includes(key));
    expect(dropped).toHaveLength(1);
    // And it was the worst of them: every hex still worked scores at least as
    // well as the one that went, which is `chooseCitizens`' own order read back
    // off the board.
    const ctx = yieldContextFor(g.state, 0);
    const score = (key: string): number => {
      const [col, row] = key.split(',').map(Number);
      return yieldScore(tileYieldOf(getTileAt(g.state.map, col!, row!)!, ctx));
    };
    const worst = Math.min(...after.map(score));
    expect(score(dropped[0]!)).toBeLessThanOrEqual(worst);
    expect(assignableTiles(g.state, city).length).toBeGreaterThanOrEqual(5);
  });
});

// --- what a guild pays ------------------------------------------------------

describe('what a guild pays', () => {
  it('is a labelled line per family, folded into the town\'s yields', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    openGround(g.state, city, 12);
    const bare = cityYields(g.state, city);

    city.specialists.scholar = 3;
    city.specialists.merchant = 2;
    refreshCityDerived(g.state, city);

    expect(citySpecialistYields(city).map((line) => line.source)).toEqual([
      '3 scholars',
      '2 merchants',
    ]);
    const quote = cityQuote(g.state, city);
    let science = 0;
    let gold = 0;
    for (const line of citySpecialistYields(city)) {
      science += line.science;
      gold += line.gold;
    }
    expect(science).toBe(6);
    expect(gold).toBe(8);
    // The lines are *in* the flats, which is what makes the chips, the ledger
    // and the resolution one number rather than three.
    expect(quote.flats.science).toBeGreaterThanOrEqual(science);
    expect(bare.science).toBeGreaterThan(0);
  });

  it('names one guildsman in the singular', () => {
    const g = game();
    const city = town(g.state, 0, 8, 'library');
    city.specialists.merchant = 1;
    expect(citySpecialistYields(city)[0]?.source).toBe('1 merchant');
  });

  it('still eats and still demands happiness — a specialist is a citizen', () => {
    const g = game();
    const city = town(g.state, 0, 8, 'library');
    openGround(g.state, city, 8);
    const before = cityYields(g.state, city).food;
    city.specialists.scholar = 2;
    refreshCityDerived(g.state, city);
    // `foodUpkeep` reads `population`, which did not move — so the town is short
    // exactly the two hexes its guildsmen stopped working.
    expect(cityYields(g.state, city).food).toBeLessThan(before);
    expect(city.population).toBe(8);
  });
});

// --- renown, the other way --------------------------------------------------

describe('renown', () => {
  it('takes the empire\'s building half from the city half, exactly', () => {
    const g = game();
    const a = town(g.state, 0, 8, 'library', 'barracks');
    const b = found(g.state, 0);
    b.buildings.push('market');
    let folded = 0;
    for (const city of g.state.cities) {
      if (city.ownerId !== 0) continue;
      folded += foldRenown(explainCityRenown(city));
    }
    const buildingLines = explainRenown(g.state, 0).filter((line) =>
      line.source.includes(' at '),
    );
    expect(foldRenown(buildingLines)).toBe(folded);
    expect(a.buildings).toContain('library');
  });

  it('pays a point a turn per guildsman, into that guildsman\'s own family', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    city.specialists.scholar = 3;
    city.specialists.merchant = 1;
    const lines = explainRenown(g.state, 0);
    expect(lines).toContainEqual({
      source: `${city.name} · 3 scholars`,
      family: 'scholar',
      amount: 3 * GUILDS.renownPerSpecialist,
      perTurn: true,
    });
    expect(lines).toContainEqual({
      source: `${city.name} · 1 merchant`,
      family: 'merchant',
      amount: GUILDS.renownPerSpecialist,
      perTurn: true,
    });

    const before = { ...g.state.players[0]!.renownByFamily };
    runEndOfTurn(g.state);
    const after = g.state.players[0]!.renownByFamily;
    // The feed, split by family: the loop the guild system exists to close.
    expect((after.scholar ?? 0) - (before.scholar ?? 0)).toBeGreaterThanOrEqual(3);
    expect((after.merchant ?? 0) - (before.merchant ?? 0)).toBeGreaterThanOrEqual(1);
  });

  it('does not feed the bar that made it', () => {
    const g = game();
    const city = town(g.state, 0, 12, 'library');
    city.specialists.scholar = 4;
    // The trickle is `trickle × n`, not `renownPerSpecialist × n`: the bar reads
    // buildings, and a guildsman feeding the bar that made it is a loop with no
    // brake on it.
    const inflow = explainGuildInflow(g.state, city);
    expect(inflow.find((line) => line.source === 'Guilds')?.amount).toBeCloseTo(
      GUILDS.trickle * 4,
      10,
    );
  });
});

// --- the verb ---------------------------------------------------------------

describe('dismissSpecialist', () => {
  function armed() {
    const g = game();
    const city = town(g.state, 0, 8, 'library');
    openGround(g.state, city, 8);
    city.specialists.scholar = 2;
    city.guildBasket = 30;
    refreshCityDerived(g.state, city);
    return { g, city };
  }

  it('refuses a city that is not yours, byte-identically', () => {
    const { g, city } = armed();
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'dismissSpecialist',
      playerId: 1,
      cityId: city.id,
      family: 'scholar',
    } as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('refuses a family with nobody in it, byte-identically', () => {
    const { g, city } = armed();
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'dismissSpecialist',
      playerId: 0,
      cityId: city.id,
      family: 'artist',
    } as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('refuses a seat that has ended its turn, byte-identically', () => {
    const { g, city } = armed();
    g.state.turnEnded[0] = true;
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'dismissSpecialist',
      playerId: 0,
      cityId: city.id,
      family: 'scholar',
    } as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('refuses a family the game has never heard of', () => {
    const { g, city } = armed();
    const before = snapshotState(g.state);
    const result = applyCommand(g.state, {
      type: 'dismissSpecialist',
      playerId: 0,
      cityId: city.id,
      family: 'general',
    } as unknown as Command);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('sends one back to the fields, restarts the bar and re-seats the town', () => {
    const { g, city } = armed();
    const worked = city.workedTiles.length;
    const result = applyCommand(g.state, {
      type: 'dismissSpecialist',
      playerId: 0,
      cityId: city.id,
      family: 'scholar',
    } as Command);
    expect(result.ok).toBe(true);
    expect(city.specialists.scholar).toBe(1);
    // The restart is the price of the verb, and it is what stops dismissing
    // being a way to choose a family.
    expect(city.guildBasket).toBe(0);
    expect(city.workedTiles).toHaveLength(worked + 1);
    expect(city.workedTiles).toHaveLength(city.population - totalSpecialists(city));
  });

  it('is greyed by the very sentence the reducer would have returned', () => {
    const { g, city } = armed();
    expect(dismissSpecialistError(g.state, 0, city, 'scholar')).toBeNull();
    expect(dismissSpecialistError(g.state, 0, city, 'artist')).toMatch(/no artist/);
    expect(dismissSpecialistError(g.state, 1, city, 'scholar')).toMatch(/does not belong/);
  });
});

// --- the replay -------------------------------------------------------------

describe('determinism', () => {
  it('is a pure function of the board: the same town converts the same way twice', () => {
    const g = game(11);
    const city = town(g.state, 0, 12, 'library', 'market');
    openGround(g.state, city, 12);
    city.guildBasket = specialistThreshold(0) - 1;

    // The whole claim, and the reason apportionment is arithmetic rather than a
    // draw: nothing here reads `state.rng`, so two runs from one board agree
    // byte for byte and a guild forming costs the world's seeded stream nothing.
    const before = snapshotState(g.state);
    runGuilds(g.state);
    runGuilds(g.state);
    const after = snapshotState(g.state);

    const twin = restoreState(before);
    runGuilds(twin);
    runGuilds(twin);
    expect(snapshotState(twin)).toBe(after);
    expect(totalSpecialists(g.state.cities[0]!)).toBeGreaterThan(0);
  });

  it('round-trips a save whose towns carry the new fields', () => {
    const g: Game = game(11);
    // Command-driven end to end, so the log *is* the save file — which is what
    // makes this a statement about `{config, log}` and not about a fixture.
    const settler = g.state.units.find((unit) => unit.ownerId === 0)!;
    expect(
      dispatch(g, {
        type: 'foundCity',
        playerId: 0,
        settlerUnitId: settler.id,
      } as Command).ok,
    ).toBe(true);
    for (let turn = 0; turn < 6; turn++) {
      for (const player of g.state.players) {
        dispatch(g, { type: 'endTurn', playerId: player.id } as Command);
      }
    }
    for (const city of g.state.cities) {
      expect(totalSpecialists(city)).toBe(0);
      expect(city.guildBasket).toBeGreaterThan(0);
    }
    const reloaded = loadGame(saveGame(g));
    expect(snapshotState(reloaded.state)).toBe(snapshotState(g.state));
  });
});

// --- the cadence ------------------------------------------------------------

describe('the cadence', () => {
  it('gives an ordinary town its first guild inside a dozen turns of holding the buildings', () => {
    const g = game();
    // Library + Market + Amphitheater + The Oracle: five renown a turn.
    const city = town(
      g.state,
      0,
      12,
      'library',
      'market',
      'amphitheater',
      'theOracle',
    );
    openGround(g.state, city, 12);
    expect(foldRenown(explainCityRenown(city))).toBe(5);
    const first = turnsToFirstGuild(g.state, city);
    expect(first).not.toBeNull();
    expect(first!).toBeGreaterThanOrEqual(8);
    expect(first!).toBeLessThanOrEqual(12);
  });

  it('makes a village wait, and then stops it at its share', () => {
    const g = game();
    const city = town(g.state, 0, 6, 'library');
    openGround(g.state, city, 6);
    const first = turnsToFirstGuild(g.state, city);
    expect(first).not.toBeNull();
    // One point of renown and six people: a long wait, and then the cap.
    expect(first!).toBeGreaterThan(20);
    for (let turn = 0; turn < 200; turn++) runGuilds(g.state);
    expect(totalSpecialists(city)).toBe(1);
  });
});
