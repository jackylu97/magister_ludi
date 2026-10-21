/**
 * **Dominion batch D4, "unrest, authority, and 'this game' counts"**
 * (`docs/plans/dominion-build-triage.md`). `dominion.test.ts` checks the rows
 * against the sheet. This file checks that the shapes the batch added do what
 * the cards say:
 *
 *   · the writ counts a town-by-town count over the towns (The Garrison
 *     Captains, and The Acropolis' old row, which Dominion batch D10 moved to
 *     citadels and which this file keeps as a probe);
 *   · three lifetime records are counts (The Captured Arms, The Hall of the
 *     Slain, Spear-won Land), and the kill record counts the wild's raiders;
 *   · pacification has a card line (The Satraps), a moment that pays (The
 *     Provincial Census), a rule that ends unrest at once in the unrest phase
 *     (The Bakufu, The Consular Roads) and a rule that ends it at capture (Pax
 *     Romana);
 *   · a town's writ price can be set or scaled (The Proconsuls, The Universal
 *     Monarchy);
 *   · and the D3 follow-ups: every town The Outriders feed settles at once, and
 *     the bot prices the D3 grants.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { scoreEffects } from '../../../src/ai/value';
import { settleCampBounty } from '../../../src/sim/camps';
import { foundCityAt, queueItemCost } from '../../../src/sim/cities';
import { applyCombat } from '../../../src/sim/combat';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { explainAuthority } from '../../../src/sim/meters';
import { bumpEconomy } from '../../../src/sim/slate';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  describeCard,
  explainCardCityYields,
  explainCardEmpireYields,
  explainCardPercentYields,
  foldCardYields,
  stripRefs,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { type CardEffect, type DoctrineId, type OrderId } from '../../../src/sim/statecraftData';
import {
  type UnrestReport,
  explainPacification,
  foldPacification,
  runUnrest,
  startUnrest,
} from '../../../src/sim/unrest';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { newGame } from '../newGameHelpers';

/** Two seats, and the wild, on a flat grassland rectangle, at war. */
function flat(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: true,
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const seats = realPlayers(state);
  openWar(state, seats[0]!.id, seats[1]!.id);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
  bumpEconomy(state);
}

/** Gives this seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, playerId: number, id: string): void {
  playerById(state, playerId)!.statecraft.doctrines.push(id as DoctrineId);
  bumpRevision(state);
  bumpEconomy(state);
}

/** Re-reads the board after a write the test made by hand. */
function touch(state: GameState): void {
  bumpRevision(state);
  bumpEconomy(state);
}

/**
 * Seat 1's town at (6, 4), taken by seat 0's warrior, which stands in it.
 * Seat 0's capital is at (1, 1). The town has three citizens after the capture.
 * `science` is what seat 0's science pool gained during the capture; seat 0
 * researches nothing, so no technology spends it.
 */
function captured(cards: { orders?: string[]; doctrines?: string[] } = {}): {
  state: GameState;
  city: City;
  home: City;
  science: number;
} {
  const state = flat();
  const home = foundCityAt(state, 0, at(state, 1, 1))!;
  foundCityAt(state, 1, at(state, 13, 7));
  const city = foundCityAt(state, 1, at(state, 6, 4))!;
  city.population = 6;
  city.hp = 1;
  for (const id of cards.orders ?? []) slot(state, 0, id);
  for (const id of cards.doctrines ?? []) hold(state, 0, id);
  const raider = createUnit(state, 0, 'warrior', 5, 4);
  const player = playerById(state, 0)!;
  player.researching = null;
  delete player.researchQueue;
  const before = player.sciencePool;
  expect(applyCombat(state, raider.id, { col: 6, row: 4 }).ok).toBe(true);
  expect(city.ownerId).toBe(0);
  touch(state);
  return { state, city, home, science: player.sciencePool - before };
}

/** The writ line of one card, or 0. */
function cardWrit(state: GameState, card: string): number {
  return explainAuthority(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.value, 0);
}

/** What one town costs seat 0's writ, as a positive figure. */
function townWrit(state: GameState, city: City): number {
  const line = explainAuthority(state, 0).find(
    (entry) => entry.part === 'cost' && entry.source.startsWith(city.name),
  );
  if (!line) throw new Error(`no writ line for ${city.name}`);
  // `0 - x` rather than `-x`, so a town that costs nothing reads as 0, not -0.
  return 0 - line.value;
}

/** The percentage one card's count adds to a voice in this town. */
function percentOf(state: GameState, city: City, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

describe('Dominion D4: the writ counts town by town', () => {
  it('The Garrison Captains pay a point of writ for each unit standing in a town', () => {
    const state = flat();
    const a = foundCityAt(state, 0, at(state, 2, 2))!;
    const b = foundCityAt(state, 0, at(state, 9, 5))!;
    slot(state, 0, 'theGarrisonCaptains');
    expect(cardWrit(state, 'theGarrisonCaptains')).toBe(0);
    createUnit(state, 0, 'warrior', a.col, a.row);
    createUnit(state, 0, 'warrior', b.col, b.row);
    createUnit(state, 0, 'spearman', b.col, b.row);
    // A unit outside a town is no garrison.
    createUnit(state, 0, 'warrior', 4, 4);
    touch(state);
    expect(cardWrit(state, 'theGarrisonCaptains')).toBe(3);
  });

  it('a scoped town count pays a point of writ for each building in the capital, and only there', () => {
    // The Acropolis' row read this way until Dominion batch D10 moved it to
    // citadels. No row reads a scoped town count into the writ now, so its old
    // effect is hung on the empire as a timed effect, to keep the scope on
    // this walk covered.
    const state = flat();
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    const other = foundCityAt(state, 0, at(state, 9, 5))!;
    playerById(state, 0)!.timed = [
      {
        card: 'theAcropolis' as OrderId,
        effect: {
          kind: 'pays',
          where: 'empire',
          basis: 'count',
          to: 'authority',
          amount: 1,
          count: 'buildingsInCity',
          scope: { test: 'capital' },
        },
        expiresTurn: state.turn + 10,
      },
    ];
    capital.buildings.push('monument', 'granary');
    other.buildings.push('library', 'monument');
    touch(state);
    expect(capital.buildings.length).toBeGreaterThanOrEqual(2);
    expect(cardWrit(state, 'theAcropolis')).toBe(capital.buildings.length);
  });
});

describe('Dominion D4: the counts over this game', () => {
  it('counts every kill for The Captured Arms, the wild’s raiders included, and the wild keeps no record', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    slot(state, 0, 'theCapturedArms');
    const wild = state.players.find((player) => player.barbarian === true)!;
    const raider = createUnit(state, wild.id, 'warrior', 6, 5);
    raider.hp = 1;
    const sword = createUnit(state, 0, 'warrior', 5, 5);
    expect(applyCombat(state, sword.id, { col: 6, row: 5 }).ok).toBe(true);
    const player = playerById(state, 0)!;
    expect(player.enemiesKilled).toBe(1);
    // The rivals-only record leaves the wild out, as it always has.
    expect(player.unitsKilled).toBe(0);
    touch(state);
    expect(foldCardYields(explainCardEmpireYields(state, 0)).science).toBe(1);
    // The wild's own kill writes no record for the wild.
    const victim = createUnit(state, 0, 'warrior', 9, 8);
    victim.hp = 1;
    const brute = createUnit(state, wild.id, 'warrior', 10, 8);
    expect(applyCombat(state, brute.id, { col: 9, row: 8 }).ok).toBe(true);
    expect(wild.enemiesKilled).toBeUndefined();
  });

  it('The Hall of the Slain pays +1% for every two units lost, at most +30%', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    slot(state, 0, 'theHallOfTheSlain');
    const player = playerById(state, 0)!;
    player.unitsLost = 7;
    touch(state);
    expect(percentOf(state, home, 'production')).toBe(3);
    expect(percentOf(state, home, 'culture')).toBe(3);
    player.unitsLost = 100;
    touch(state);
    expect(percentOf(state, home, 'production')).toBe(30);
  });

  it('Spear-won Land pays +3% for every town captured, at most +30%', () => {
    const { state, home } = captured({ orders: ['spearWonLand'] });
    expect(playerById(state, 0)!.citiesCaptured).toBe(1);
    expect(percentOf(state, home, 'production')).toBe(3);
    expect(percentOf(state, home, 'science')).toBe(3);
    playerById(state, 0)!.citiesCaptured = 20;
    touch(state);
    expect(percentOf(state, home, 'science')).toBe(30);
  });
});

describe('Dominion D4: pacification', () => {
  it('The Satraps add a line worth the rest of the rate in a garrisoned town, and none without a garrison', () => {
    const { state, city } = captured({ orders: ['theSatraps'] });
    const lines = explainPacification(state, city);
    const card = lines.filter((line) => line.source.includes('The Satraps'));
    expect(card).toHaveLength(1);
    const rest = foldPacification(lines.filter((line) => !line.source.includes('The Satraps')));
    expect(card[0]!.amount).toBe(rest);
    // The garrison walks out: no garrison line and no card line.
    const warrior = state.units.find((unit) => unit.col === city.col && unit.row === city.row)!;
    warrior.col = 7;
    touch(state);
    expect(explainPacification(state, city).some((line) => line.source.includes('The Satraps'))).toBe(
      false,
    );
  });

  it('The Provincial Census pays twenty science a citizen when a town is pacified', () => {
    expect(windfallPayout(captured({ orders: ['theProvincialCensus'] }).state, 0, 'pacified', 0, 0, {
      population: 3,
    }).grants).toEqual([
      expect.objectContaining({ yield: 'science', amount: 60 }),
    ]);
    const { state, city } = captured({ orders: ['theProvincialCensus'] });
    const player = playerById(state, 0)!;
    player.researching = null;
    delete player.researchQueue;
    city.unrest!.progress = city.unrest!.target - 1;
    const before = player.sciencePool;
    const reports: UnrestReport[] = [];
    runUnrest(state, reports, () => null);
    expect(city.unrest).toBeUndefined();
    expect(reports.map((report) => report.kind)).toEqual(['pacified']);
    expect(player.sciencePool - before).toBe(20 * city.population);
  });

  it('The Bakufu: a great general on the town’s own hex pays +25% and pacifies it at once; one beside it does not', () => {
    const beside = captured({ orders: ['theBakufu'] });
    createUnit(beside.state, 0, 'greatPerson', 7, 4, 'hannibal');
    touch(beside.state);
    expect(percentOf(beside.state, beside.city, 'science')).toBe(0);
    runUnrest(beside.state, [], () => null);
    expect(beside.city.unrest).toBeDefined();

    const inside = captured({ orders: ['theBakufu'] });
    createUnit(inside.state, 0, 'greatPerson', inside.city.col, inside.city.row, 'hannibal');
    touch(inside.state);
    expect(percentOf(inside.state, inside.city, 'science')).toBe(25);
    expect(percentOf(inside.state, inside.city, 'culture')).toBe(25);
    expect(inside.city.unrest!.progress).toBe(0);
    const reports: UnrestReport[] = [];
    runUnrest(inside.state, reports, () => null);
    expect(inside.city.unrest).toBeUndefined();
    expect(reports.map((report) => report.kind)).toEqual(['pacified']);
  });

  it('Pax Romana ends the unrest at the moment of capture, and the census pays at once', () => {
    const roman = captured({ orders: ['paxRomana', 'theProvincialCensus'] });
    expect(roman.city.unrest).toBeUndefined();
    expect(roman.science).toBe(20 * roman.city.population);
    // Without Pax Romana the same capture starts the unrest, and the census
    // waits for the unrest to end.
    const plain = captured({ orders: ['theProvincialCensus'] });
    expect(plain.city.unrest).toBeDefined();
    expect(plain.science).toBe(0);
  });

  it('Pax Romana makes a captured town cost one less writ', () => {
    // A town taken here is a puppet, so it costs the captured price less the
    // puppet's relief; Pax Romana takes one more off the captured price.
    const plain = captured();
    const roman = captured({ orders: ['paxRomana'] });
    expect(plain.city.puppet).toBe(true);
    expect(townWrit(plain.state, plain.city)).toBeGreaterThanOrEqual(2);
    expect(townWrit(roman.state, roman.city)).toBe(townWrit(plain.state, plain.city) - 1);
  });

  it('The Consular Roads: a town joined to the capital by road and garrisoned pays +5 and is pacified at once', () => {
    const state = flat();
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    const town = foundCityAt(state, 0, at(state, 6, 2))!;
    hold(state, 0, 'theConsularRoads');
    for (const col of [3, 4, 5]) at(state, col, 2).road = 0;
    touch(state);
    // Joined but not garrisoned: nothing yet.
    const science = (): number =>
      explainCardCityYields(state, town).reduce((sum, line) => sum + line.science, 0);
    expect(science()).toBe(0);
    createUnit(state, 0, 'warrior', town.col, town.row);
    touch(state);
    expect(science()).toBe(5);
    expect(explainCardCityYields(state, town).reduce((sum, line) => sum + line.culture, 0)).toBe(5);
    // The capital is what the others are joined to, so it is never "connected".
    createUnit(state, 0, 'warrior', capital.col, capital.row);
    touch(state);
    expect(explainCardCityYields(state, capital).reduce((sum, line) => sum + line.science, 0)).toBe(0);
    // A town in unrest that the rule admits is pacified in the unrest phase.
    startUnrest(town);
    const reports: UnrestReport[] = [];
    runUnrest(state, reports, () => null);
    expect(town.unrest).toBeUndefined();
    expect(reports.map((report) => report.cityId)).toEqual([town.id]);
  });
});

describe('Dominion D4: what a town costs the writ', () => {
  it('The Proconsuls: a captured town with a garrison costs nothing; without one it costs what it did', () => {
    const plain = captured();
    const { state, city } = captured({ orders: ['dominionTheProconsuls'] });
    expect(townWrit(state, city)).toBe(0);
    const warrior = state.units.find((unit) => unit.col === city.col && unit.row === city.row)!;
    warrior.col = 7;
    touch(state);
    expect(townWrit(state, city)).toBe(townWrit(plain.state, plain.city));
  });

  it('The Universal Monarchy: a captured town costs nothing and a founded one costs twice as much', () => {
    const { state, city } = captured({ doctrines: ['theUniversalMonarchy'] });
    const founded = foundCityAt(state, 0, at(state, 12, 2))!;
    touch(state);
    expect(townWrit(state, city)).toBe(0);
    const plain = captured();
    const plainFounded = foundCityAt(plain.state, 0, at(plain.state, 12, 2))!;
    touch(plain.state);
    expect(townWrit(state, founded)).toBe(2 * townWrit(plain.state, plainFounded));
  });
});

describe('Dominion D4: the words', () => {
  it('describes each card in a first-time player’s words', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theGarrisonCaptains')).toEqual([
      '+1 authority capacity per combat unit standing in your cities',
    ]);
    expect(said('theCapturedArms')).toEqual(['+1 science per unit you have killed this game']);
    expect(said('theSatraps')).toEqual([
      'unrest ends twice as fast, in every city with a unit standing in it',
    ]);
    // Since Dominion batch D10 The Acropolis pays for citadels.
    expect(said('theAcropolis')).toEqual([
      '+2 culture on every hex with a Citadel',
      '+1 authority capacity per hex with a Citadel in your borders',
    ]);
    expect(said('theHallOfTheSlain')).toEqual([
      '+1% production per 2 units you have lost this game (at most +30% production)',
      '+1% culture per 2 units you have lost this game (at most +30% culture)',
    ]);
    expect(said('theProvincialCensus')).toEqual([
      'pacifying a city grants science equal to 20 times its population',
    ]);
    expect(said('spearWonLand')).toEqual([
      '+3% production per city you have captured this game (at most +30% production)',
      '+3% science per city you have captured this game (at most +30% science)',
    ]);
    expect(said('theBakufu')).toEqual([
      '+25% science in every city with a great general standing in it',
      '+25% culture in every city with a great general standing in it',
      'unrest ends at once in every city with a great general standing in it',
    ]);
    expect(said('paxRomana')).toEqual([
      'a city you capture is pacified at once',
      'the authority a captured city costs falls by 1',
    ]);
    expect(said('dominionTheProconsuls')).toEqual([
      'the authority a captured city with a unit standing in it costs is 0',
      'every captured city with a unit standing in it: +10 city defence',
    ]);
    expect(said('theConsularRoads')).toEqual([
      '+5 science, +5 culture in every city joined to your capital by road with a unit standing in it',
      'unrest ends at once in every city joined to your capital by road with a unit standing in it',
    ]);
    expect(said('theUniversalMonarchy')).toEqual([
      'the authority a captured city costs is 0',
      'the authority a city you founded costs doubles',
    ]);
  });
});

describe('Dominion D3 follow-ups', () => {
  it('The Outriders’ hammers settle at once in every town, not only the one nearest the camp', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    const far = foundCityAt(state, 0, at(state, 12, 7))!;
    slot(state, 0, 'theOutriders');
    far.queue = [{ kind: 'unit', id: 'warrior' }];
    far.hammerBasket = queueItemCost(state, 0, far.queue[0]!)! - 3;
    const units = state.units.length;
    settleCampBounty(state, 0, { col: 2, row: 3 });
    // The warrior was finished the moment the hammers landed.
    expect(state.units.length).toBe(units + 1);
    expect(far.queue).toEqual([]);
  });

  it('prices the D3 grants: the four pillage extras, every town, and the nearest town a scope admits', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 0, at(state, 9, 5));
    foundCityAt(state, 0, at(state, 13, 2));
    const player = playerById(state, 0)!;
    player.techsResearched.push('pottery' as never);
    state.turn = 20;
    touch(state);
    const ctx = valueContext(state, player);
    const rider = (grant: object): CardEffect[] => [
      { kind: 'windfallRider', occasion: 'tech', grant } as unknown as CardEffect,
    ];
    for (const grant of [
      { healFull: true },
      { strike: { range: 3, percent: 50 } },
      { unrestBeside: true },
      { pillageBeside: true },
    ]) {
      expect(scoreEffects(rider(grant), ctx), JSON.stringify(grant)).toBeGreaterThan(0);
    }
    const one = scoreEffects(rider({ yield: 'production', amount: 8 }), ctx);
    const every = scoreEffects(rider({ yield: 'production', amount: 8, toEveryTown: true }), ctx);
    expect(one).toBeGreaterThan(0);
    expect(every).toBeCloseTo(3 * one);
    // A grant to the nearest town a scope admits is worth one town when a town
    // qualifies, and nothing when none does (this realm holds no puppet).
    const capital = rider({ yield: 'production', amount: 8, toNearest: { test: 'capital' } });
    expect(scoreEffects(capital, ctx)).toBeCloseTo(one);
    const puppet = rider({ yield: 'production', amount: 8, toNearest: { test: 'puppet' } });
    expect(scoreEffects(puppet, ctx)).toBe(0);
  });
});
