/**
 * **The Expansionist levy cards** (batch E1 of
 * `docs/plans/expansionist-build-triage.md`). `expansionist.test.ts` checks the
 * rows against the sheet; this file checks what the cards do:
 *
 *   · "Needs a levy": the gated cards are dealt only to a seat that holds a card
 *     granting a levy, seated or not (the triage's reading 5);
 *   · the four new uses: a worker (The Work Gangs), a settler (The Colonists),
 *     science (The Terraces of Moray) and hammers for the nearest other town
 *     building a world wonder (The Builders' Levy, reading 9);
 *   · the record of citizens levied, and The Labour Rolls' count of it;
 *   · what a levy leaves behind: The Labour Feasts' culture and The Gleaners'
 *     food, for ten turns, at most once every ten turns;
 *   · The Mit'a's citizen coming home twenty turns later, with no growth
 *     riders, and not to a town that changed hands (reading 12);
 *   · The Slack Season's turns with no wait (reading 11);
 *   · The Trained Bands' Veteran start for a levied military unit, and The
 *     General Levy's free upkeep inside your borders for its own conscripts
 *     (reading 13).
 */

import { describe, expect, it } from 'vitest';

import { applyCommand, type Command } from '../../../src/sim/commands';
import { foundCityAt, growthThreshold, refreshCityDerived } from '../../../src/sim/cities';
import { createGame } from '../newGameHelpers';
import { type Game } from '../../../src/sim/game';
import { levyError, levyOptions, returnLeviedCitizens } from '../../../src/sim/levies';
import { getTileAt, neighborTiles, tileHex } from '../../../src/sim/map';
import { rankOf } from '../../../src/sim/ranks';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
  unitById,
} from '../../../src/sim/state';
import {
  cardUpkeepRebateLines,
  eligibleFor,
  explainCardCityYields,
  explainCardPercentYields,
  foldCardYields,
  holdsLevyGrant,
} from '../../../src/sim/statecraft';
import {
  type OrderId,
  DECK_FILE_ORDERS,
  TIER_LADDER,
  orderDef,
  orderIsDealt,
} from '../../../src/sim/statecraftData';
import { TECH_IDS, type TechId, techDef } from '../../../src/sim/techData';
import { unitDef } from '../../../src/sim/unitData';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for seat 0 on the bare board, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

function levy(state: GameState, city: City, use: string): ReturnType<typeof applyCommand> {
  return applyCommand(state, { type: 'levyCitizen', playerId: 0, cityId: city.id, use } as Command);
}

describe('the Expansionist batch E1: the levy gate', () => {
  /** A duel with decks, for the draft's own reading of the gate. */
  function seated(): Game {
    return createGame({
      seed: 11,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true, leader: 'pachacuti' },
        { name: 'Bors', color: '#3a7fe8', leader: 'taizong' },
      ],
    });
  }

  /** Opens every band for this seat: the ladder's last rung and the last age. */
  function openEveryBand(player: Player): void {
    player.statecraft.drafts = TIER_LADDER[TIER_LADDER.length - 1]!.drafts;
    for (const tech of TECH_IDS) {
      if (techDef(tech).age === 4 && !player.techsResearched.includes(tech)) {
        player.techsResearched.push(tech as TechId);
        break;
      }
    }
  }

  it('deals the cards marked "Needs a levy" only to a seat holding a card that grants one', () => {
    const g = seated();
    const seat = playerById(g.state, 0)!;
    openEveryBand(seat);
    const gated = DECK_FILE_ORDERS.expansionist.filter(
      (id) => orderDef(id).needsLevy === true && orderIsDealt(id),
    );
    expect(gated).toEqual(
      expect.arrayContaining(['theLabourFeasts', 'theGleaners', 'theLabourRolls', 'seasonalLevies', 'theMita', 'theSlackSeason', 'theTrainedBands']),
    );
    const everyBand = (): OrderId[] =>
      TIER_LADDER.flatMap((rung) => eligibleFor(g.state, seat, rung.drafts));
    expect(holdsLevyGrant(g.state, 0)).toBe(false);
    const shut = everyBand();
    for (const id of gated) expect(shut, id).not.toContain(id);
    // A card with a levy row that names no use grants no levy (Seasonal Levies
    // reacts to a levy and buys nothing).
    seat.statecraft.orders.push('seasonalLevies' as OrderId);
    expect(holdsLevyGrant(g.state, 0)).toBe(false);
    // A levy card in the collection, not in a chair, opens the gate.
    seat.statecraft.orders.push('levyOfTheLand' as OrderId);
    expect(holdsLevyGrant(g.state, 0)).toBe(true);
    const open = everyBand();
    for (const id of gated) {
      if (seat.statecraft.orders.includes(id)) continue;
      expect(open, id).toContain(id);
    }
  });
});

describe('the Expansionist batch E1: the new levy uses', () => {
  it('The Work Gangs raises a worker from a town of three, marked, and not trained', () => {
    const state = bareState();
    const small = town(state, 2, 2, 2);
    const city = town(state, 8, 6, 3);
    slot(state, 0, 'theWorkGangs');
    expect(levyError(state, 0, small, 'worker')).toMatch(/at least 3 citizens/);
    const [line] = levyOptions(state, 0, city);
    expect(line!.use).toBe('worker');
    expect(line!.blocked).toBeNull();
    const before = state.units.length;
    const built = { ...playerById(state, 0)!.unitsBuilt };
    expect(levy(state, city, 'worker').ok).toBe(true);
    expect(city.population).toBe(2);
    const raised = state.units.slice(before);
    expect(raised).toHaveLength(1);
    expect(unitDef(raised[0]!.type).modelClass).toBe('worker');
    expect(raised[0]!.levied).toBe('worker');
    // Not trained: the escalation ladder does not climb.
    expect(playerById(state, 0)!.unitsBuilt).toEqual(built);
  });

  it('The Colonists raises a settler from a town of six', () => {
    const state = bareState();
    const city = town(state, 5, 5, 6);
    slot(state, 0, 'theColonists');
    const before = state.units.length;
    expect(levy(state, city, 'settler').ok).toBe(true);
    const raised = state.units.slice(before);
    expect(raised).toHaveLength(1);
    expect(unitDef(raised[0]!.type).foundsCity).toBe(true);
    expect(raised[0]!.levied).toBe('settler');
    // A town of five may not.
    city.population = 5;
    state.turn += 5;
    bumpRevision(state);
    expect(levyError(state, 0, city, 'settler')).toMatch(/at least 6 citizens/);
  });

  it('The Terraces of Moray pays science, only in a town beside a mountain', () => {
    const state = bareState();
    const city = town(state, 5, 5, 6);
    slot(state, 0, 'theTerracesOfMoray');
    // No mountain beside the town: the card grants it no levy at all.
    expect(levyOptions(state, 0, city)).toEqual([]);
    const centre = getTileAt(state.map, city.col, city.row)!;
    neighborTiles(state.map, tileHex(centre))[0]!.terrain = 'mountain';
    bumpRevision(state);
    const [line] = levyOptions(state, 0, city);
    expect(line!.use).toBe('science');
    expect(line!.science).toBe(growthThreshold(5));
    const player = playerById(state, 0)!;
    player.researching = null;
    player.researchQueue = [];
    const pool = player.sciencePool;
    expect(levy(state, city, 'science').ok).toBe(true);
    expect(player.sciencePool).toBe(pool + growthThreshold(5));
  });

  it('The Builders\' Levy sends hammers to the nearest other town building a world wonder', () => {
    // Retired in batch E7. A save may still hold the card, so the row is seated
    // directly (the themes triage's reading 7).
    const state = bareState(24, 10);
    const city = town(state, 2, 4, 6);
    slot(state, 0, 'theBuildersLevy');
    expect(levyError(state, 0, city, 'wonder')).toMatch(/building a world wonder/);
    // Nearest of all, but raising the Magnum Opus: not a world wonder. The
    // board wraps east to west, so the towns sit four, eight and twelve hexes
    // east of the levying town, and twelve is also the way round.
    const opus = town(state, 6, 4, 4);
    opus.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    const near = town(state, 10, 4, 4);
    near.queue = [{ kind: 'building', id: 'pyramids' }];
    const far = town(state, 14, 4, 4);
    far.queue = [{ kind: 'building', id: 'hangingGardens' }];
    bumpRevision(state);
    const [line] = levyOptions(state, 0, city);
    expect(line!.use).toBe('wonder');
    expect(line!.targetCityId).toBe(near.id);
    const sent = near.hammerBasket;
    expect(levy(state, city, 'wonder').ok).toBe(true);
    expect(near.hammerBasket).toBe(sent + growthThreshold(5));
    expect(opus.hammerBasket).toBe(0);
    expect(far.hammerBasket).toBe(0);
  });
});

describe('the Expansionist batch E1: the record and what a levy leaves', () => {
  it('counts every citizen levied, and The Labour Rolls pays for every two', () => {
    const state = bareState();
    const city = town(state, 5, 5, 12);
    slot(state, 0, 'levyOfTheLand');
    slot(state, 0, 'theLabourRolls');
    const percent = (key: 'food' | 'production'): number =>
      explainCardPercentYields(state, city)
        .filter((line) => line.card === 'theLabourRolls' && line.yield === key)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(playerById(state, 0)!.citizensLevied).toBeUndefined();
    expect(percent('food')).toBe(0);
    for (let i = 0; i < 4; i++) {
      expect(levy(state, city, 'production').ok).toBe(true);
      state.turn += 5;
      bumpRevision(state);
    }
    expect(playerById(state, 0)!.citizensLevied).toBe(4);
    expect(percent('food')).toBe(2);
    expect(percent('production')).toBe(2);
  });

  it('The Labour Feasts and The Gleaners pay the levying town for ten turns, at most once every ten', () => {
    const state = bareState();
    const city = town(state, 5, 5, 12);
    slot(state, 0, 'levyOfTheLand');
    slot(state, 0, 'theLabourFeasts');
    slot(state, 0, 'theGleaners');
    const start = state.turn;
    expect(levy(state, city, 'production').ok).toBe(true);
    for (const card of ['theLabourFeasts', 'theGleaners']) {
      const hung = (city.timed ?? []).filter((entry) => entry.card === card);
      expect(hung, card).toHaveLength(1);
      expect(hung[0]!.expiresTurn, card).toBe(start + 10);
    }
    const paid = (card: string) =>
      foldCardYields(explainCardCityYields(state, city).filter((line) => line.card === card));
    // Every worked hex of the bare board is wild.
    expect(paid('theLabourFeasts').culture).toBe(city.workedTiles.length);
    expect(paid('theGleaners').food).toBe(3);
    // Five turns on, a second levy hangs nothing new.
    state.turn = start + 5;
    bumpRevision(state);
    expect(levy(state, city, 'production').ok).toBe(true);
    expect((city.timed ?? []).filter((entry) => entry.card === 'theGleaners')).toHaveLength(1);
  });

  it('The Mit\'a sends the citizen home twenty turns later, with no growth riders', () => {
    const state = bareState();
    const city = town(state, 5, 5, 8);
    slot(state, 0, 'levyOfTheLand');
    slot(state, 0, 'theMita');
    // Granary Levies pays fifteen hammers for a growth; a return is not one.
    slot(state, 0, 'expansionistGranaryLevies');
    const start = state.turn;
    expect(levy(state, city, 'production').ok).toBe(true);
    expect(city.population).toBe(7);
    expect(city.levy?.returns).toEqual([{ turn: start + 20, ownerId: 0 }]);
    const basket = city.hammerBasket;
    state.turn = start + 19;
    returnLeviedCitizens(state);
    expect(city.population).toBe(7);
    state.turn = start + 20;
    returnLeviedCitizens(state);
    expect(city.population).toBe(8);
    expect(city.levy?.returns).toBeUndefined();
    expect(city.hammerBasket).toBe(basket);
  });

  it('The Mit\'a sends nobody home to a town that changed hands', () => {
    const state = bareState();
    const city = town(state, 5, 5, 8);
    slot(state, 0, 'levyOfTheLand');
    slot(state, 0, 'theMita');
    const start = state.turn;
    expect(levy(state, city, 'production').ok).toBe(true);
    city.ownerId = 1;
    state.turn = start + 20;
    returnLeviedCitizens(state);
    expect(city.population).toBe(7);
    expect(city.levy?.returns).toBeUndefined();
  });

  it('The Slack Season lifts the wait on every twentieth turn, and only then', () => {
    const state = bareState();
    const city = town(state, 5, 5, 8);
    slot(state, 0, 'levyOfTheLand');
    slot(state, 0, 'theSlackSeason');
    state.turn = 40;
    bumpRevision(state);
    expect(levy(state, city, 'production').ok).toBe(true);
    expect(levy(state, city, 'production').ok).toBe(true);
    state.turn = 41;
    bumpRevision(state);
    expect(levyError(state, 0, city, 'production')).toMatch(/can levy again/);
    // The floor still applies on a slack turn.
    state.turn = 60;
    city.population = 1;
    bumpRevision(state);
    expect(levyError(state, 0, city, 'production')).toMatch(/at least 2 citizens/);
  });
});

describe('the Expansionist batch E1: units a levy raises', () => {
  it('The Trained Bands starts a levied military unit as a Veteran, and nothing else', () => {
    const state = bareState();
    const city = town(state, 5, 5, 8);
    slot(state, 0, 'theMusterOfTheFields');
    slot(state, 0, 'theWorkGangs');
    slot(state, 0, 'theTrainedBands');
    expect(levy(state, city, 'muster').ok).toBe(true);
    const soldier = state.units[state.units.length - 1]!;
    expect(soldier.levied).toBe('muster');
    expect(rankOf(soldier)).toBe('veteran');
    state.turn += 5;
    bumpRevision(state);
    expect(levy(state, city, 'worker').ok).toBe(true);
    const worker = state.units[state.units.length - 1]!;
    expect(rankOf(worker)).toBeNull();
    // A unit no levy raised starts with nothing.
    const plain = createUnit(state, 0, soldier.type, city.col, city.row);
    expect(rankOf(unitById(state, plain.id)!)).toBeNull();
  });

  it('The General Levy frees its own conscripts\' upkeep inside your borders, and no other piece', () => {
    const state = bareState();
    const city = town(state, 5, 5, 8);
    slot(state, 0, 'theGeneralLevy');
    slot(state, 0, 'theMusterOfTheFields');
    const rebate = (): number =>
      cardUpkeepRebateLines(state, 0, () => 1)
        .filter((line) => line.card === 'theGeneralLevy')
        .reduce((sum, line) => sum + line.gold, 0);
    expect(levy(state, city, 'conscript').ok).toBe(true);
    const conscript = state.units[state.units.length - 1]!;
    expect(conscript.levied).toBe('conscript');
    expect(rebate()).toBe(1);
    // A mustered piece is a levy too, but not this card's.
    state.turn += 5;
    bumpRevision(state);
    expect(levy(state, city, 'muster').ok).toBe(true);
    expect(rebate()).toBe(1);
    // Outside your borders the conscript pays its way.
    conscript.col = 11;
    conscript.row = 0;
    bumpRevision(state);
    expect(rebate()).toBe(0);
  });
});
