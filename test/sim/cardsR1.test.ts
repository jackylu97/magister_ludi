/**
 * **Batch R1, parts B and C: the changed cards, the new shared card, and the
 * tier-26 rises on the meters and renown** (the user's rulings of 2026-11-11,
 * `docs/flags.md` item (jjjjjjj)).
 *
 * What this file pins:
 *
 *   1. The Apprentices: finishing a world wonder or the Magnum Opus grants
 *      nothing, and every other building grants 5 science;
 *   2. The Scholars' Roads: +50% science and culture on routes, and no lost
 *      route capacity;
 *   3. Market Gardens at Tier II, and The Country Fair at Tier 0: +1 gold on a
 *      worked luxury hex, improved or not;
 *   4. a tier-26 government raises the happiness, authority and renown a seated
 *      card of its type gives, each rise its own labelled line, and leaves a
 *      negative figure alone.
 *
 * Letters of Credit's tests are in `test/sim/decks/commercePurse.test.ts`, and
 * the three moments' in `test/sim/momentsR1.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { scoreEffects } from '../../src/ai/value';
import { foundCityAt, ownedTiles, refreshCityDerived } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type Tile, raiseImprovement } from '../../src/sim/map';
import { explainAuthority, explainHappiness } from '../../src/sim/meters';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { explainRenown } from '../../src/sim/renown';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import {
  CARD_TYPE_RAISED_KINDS,
  cardAuthority,
  cardEmpireRenownShares,
  cardHappiness,
  cardRenownLines,
  describeCard,
  stripRefs,
  windfallPayout,
} from '../../src/sim/statecraft';
import {
  type ChairType,
  type GovernmentId,
  type OrderId,
  orderDef,
  orderIsDealt,
  slotLayout,
} from '../../src/sim/statecraftData';
import { routeSlots } from '../../src/sim/trade';
import { explainTileYield, yieldContextFor } from '../../src/sim/yields/hex';
import { at, bareState } from './improvementHelpers';

const APPRENTICES = 'theApprentices' as OrderId;
const SCHOLARS_ROADS = 'theScholarsRoads' as OrderId;
const MARKET_GARDENS = 'marketGardens' as OrderId;
const COUNTRY_FAIR = 'theCountryFair' as OrderId;

/** Puts an Order in a chair for seat 0, past the government's own chairs. */
function seat(state: GameState, id: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for seat 0 on the bare board, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * Lays out a government's council for seat 0 and seats each card in the first
 * free chair of the type named beside it (`governmentsG1.test.ts`'s helper).
 */
function council(state: GameState, government: GovernmentId, cards: readonly [OrderId, ChairType][]): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.government = government;
  const layout = slotLayout(government);
  sc.slots = layout.map(() => null);
  for (const [card, chair] of cards) {
    const index = layout.findIndex((type, place) => type === chair && sc.slots[place] === null);
    expect(index, `a free ${chair} chair for ${card}`).toBeGreaterThanOrEqual(0);
    if (!sc.orders.includes(card)) sc.orders.push(card);
    sc.slots[index] = { card, sealedUntil: 0 };
  }
  bumpRevision(state);
}

// --- 1. The Apprentices -------------------------------------------------------------

describe('The Apprentices (batch R1)', () => {
  it('keeps its text, and its rider leaves out wonders and the Magnum Opus', () => {
    expect(orderDef(APPRENTICES).text).toBe('Finishing a building grants 5 science.');
    expect(orderDef(APPRENTICES).effects).toEqual([
      {
        kind: 'windfallRider',
        occasion: 'buildingCompletion',
        exceptWonders: true,
        grant: { yield: 'science', amount: 5 },
      },
    ]);
    // The generated sentence is the one the card printed before, now true.
    expect(describeCard(APPRENTICES).map((clause) => stripRefs(clause.text))).toEqual([
      'completing a building grants +5 science',
    ]);
  });

  it('pays 5 science for a building, and nothing for a wonder or the Magnum Opus', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    seat(state, APPRENTICES);
    const science = (facts: Parameters<typeof windfallPayout>[5]): number =>
      windfallPayout(state, 0, 'buildingCompletion', 0, 0, facts)
        .grants.filter((grant) => grant.card === APPRENTICES)
        .reduce((sum, grant) => sum + grant.amount, 0);
    expect(science({ building: 'granary', wonder: false })).toBe(5);
    expect(science({ building: 'library', wonder: false })).toBe(5);
    expect(science({ building: 'pyramids', wonder: true })).toBe(0);
    expect(science({ building: 'theMagnumOpus', wonder: false })).toBe(0);
    // A moment that names no building never pays it.
    expect(science({})).toBe(0);
  });

  it('pays through the one completion routine, for a building bought', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    seat(state, APPRENTICES);
    const player = playerById(state, 0)!;
    player.researching = null;
    player.researchQueue = [];
    player.gold = 1000;
    bumpRevision(state);
    const pool = player.sciencePool;
    const result = applyBuy(state, city, 'granary');
    expect(result).toBe(true);
    expect(player.sciencePool).toBe(pool + 5);
  });
});

// --- 2. The Scholars' Roads -----------------------------------------------------------

describe('The Scholars’ Roads (batch R1)', () => {
  it('pays +50% science and culture on routes, and costs no route capacity', () => {
    const def = orderDef(SCHOLARS_ROADS);
    expect(def.text).toBe('Your routes gain +50% science and culture.');
    expect(def.effects.some((effect) => effect.kind === 'routeRider')).toBe(false);
    expect(def.effects).toEqual([
      {
        kind: 'pays',
        where: 'route',
        share: [
          { yield: 'science', percent: 50 },
          { yield: 'culture', percent: 50 },
        ],
      },
    ]);
    const state = bareState();
    const city = town(state, 5, 5, 4);
    city.buildings.push('market');
    bumpRevision(state);
    const before = routeSlots(state, 0);
    seat(state, SCHOLARS_ROADS);
    expect(routeSlots(state, 0)).toBe(before);
    expect(describeCard(SCHOLARS_ROADS).map((clause) => stripRefs(clause.text))).toEqual([
      '+50% science and culture on every trade route you send',
    ]);
  });
});

// --- 3. Market Gardens and The Country Fair --------------------------------------------

describe('Market Gardens and The Country Fair (batch R1)', () => {
  it('moves Market Gardens to Tier II and deals The Country Fair at Tier 0 to both decks', () => {
    expect(orderDef(MARKET_GARDENS).band).toBe(2);
    const fair = orderDef(COUNTRY_FAIR);
    expect([fair.decks, fair.band, fair.type, fair.rarity]).toEqual([['expansionist', 'commerce'], 0, 'economic', 'common']);
    expect(fair.text).toBe('Luxury resources gain +1 gold.');
    expect(fair.flavor).toBeTruthy();
    expect(orderIsDealt(COUNTRY_FAIR)).toBe(true);
    expect(describeCard(COUNTRY_FAIR).map((clause) => stripRefs(clause.text))).toEqual([
      '+1 gold on every hex carrying a luxury resource',
    ]);
  });

  it('pays +1 gold on a luxury hex, improved or not, and on no other hex', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    const luxury = RESOURCE_IDS.find((id) => resourceDef(id).kind === 'luxury' && resourceDef(id).requiresTech === undefined)!;
    expect(luxury).toBeDefined();
    const hexes = ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
    const [wild, farm] = [hexes[0]!, hexes[1]!];
    wild.resource = luxury as never;
    raiseImprovement(farm, 'farm', state.turn);
    bumpRevision(state);
    seat(state, COUNTRY_FAIR);
    expect(fairGold(state, wild)).toBe(1);
    expect(fairGold(state, farm)).toBe(0);
  });
});

/** The gold The Country Fair's line pays on one hex. */
function fairGold(state: GameState, tile: Tile): number {
  const name = orderDef(COUNTRY_FAIR).name;
  let gold = 0;
  for (const line of explainTileYield(tile, yieldContextFor(state, 0))) {
    if (line.source.includes(name)) gold += line.gold;
  }
  return gold;
}

// --- 4. the tier-26 rises on the meters and renown ---------------------------------------

describe('a tier-26 government on happiness, authority and renown (batch R1)', () => {
  it('names the three meters’ kinds among the kinds it raises', () => {
    for (const kind of ['happiness', 'authority', 'renown', 'cityRenownPercent'] as const) {
      expect(CARD_TYPE_RAISED_KINDS, kind).toContain(kind);
    }
  });

  it('raises a seated card’s happiness as a line of its own, and the meter is the fold of its list', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    city.buildings.push('aqueduct');
    bumpRevision(state);
    // The Waterworks: +3 happiness in a town with an Aqueduct. 30% of 3 is
    // 0.9, which rounds to 1.
    const waterworks = 'expansionistTheWaterworks' as OrderId;
    council(state, 'theCuria', [[waterworks, 'civic']]);
    const lines = cardHappiness(state, 0);
    expect(lines.filter((line) => line.card === waterworks).map((line) => line.amount)).toEqual([3]);
    const rise = lines.filter((line) => line.card === 'theCuria');
    expect(rise.map((line) => [line.source, line.amount])).toEqual([
      ['Government · The Curia · The Waterworks', 1],
    ]);
    // The meter's own list carries the rise, and the Estates (Economic) does not.
    expect(explainHappiness(state, 0).some((line) => line.source === 'Government · The Curia · The Waterworks')).toBe(true);
    council(state, 'theEstates', [[waterworks, 'civic']]);
    expect(cardHappiness(state, 0).some((line) => line.card === 'theEstates')).toBe(false);
  });

  it('raises a seated card’s authority as a line of its own', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    city.buildings.push('granary');
    bumpRevision(state);
    // The Horrea: +1 authority for each Granary. 30% of 1 rounds to nothing,
    // so the floor of one applies.
    const horrea = 'theHorrea' as OrderId;
    council(state, 'theCuria', [[horrea, 'civic']]);
    const lines = cardAuthority(state, 0);
    expect(lines.filter((line) => line.card === horrea).map((line) => line.amount)).toEqual([1]);
    expect(lines.filter((line) => line.card === 'theCuria').map((line) => line.amount)).toEqual([1]);
    expect(explainAuthority(state, 0).some((line) => line.source.startsWith('Government · The Curia · The Horrea'))).toBe(true);
  });

  it('raises a seated card’s renown trickle and its share of renown, each as its own line', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    city.buildings.push('pyramids');
    bumpRevision(state);
    // The Workshop at Olympia: +3 renown for each wonder. 30% of 3 rounds to 1.
    const olympia = 'theWorkshopAtOlympia' as OrderId;
    // A Court of Engineers: +50% of the renown trickle. 30% of 50 is 15.
    const engineers = 'aCourtOfEngineers' as OrderId;
    council(state, 'theCuria', [
      [olympia, 'civic'],
      [engineers, 'civic'],
    ]);
    const trickle = cardRenownLines(state, 0);
    expect(trickle.filter((line) => line.card === olympia).map((line) => line.amount)).toEqual([3]);
    expect(trickle.filter((line) => line.card === 'theCuria').map((line) => line.amount)).toEqual([1]);
    const shares = cardEmpireRenownShares(state, 0);
    expect(shares.map((share) => [share.card, share.percent])).toEqual([
      [engineers, 50],
      ['theCuria', 15],
    ]);
    // Both reach the renown list, so the pool's figure is the fold of it.
    const sources = explainRenown(state, 0).map((line) => line.source);
    expect(sources.some((source) => source.startsWith('Government · The Curia · The Workshop at Olympia'))).toBe(true);
    expect(sources).toContain('Government · The Curia · A Court of Engineers');
  });

  it('raises the renown a one-time reward grants, as a grant of its own', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    // The Court Painter: 15 renown for each card drafted. 30% of 15 is 4.5,
    // which rounds to 5.
    const painter = 'theCourtPainter' as OrderId;
    council(state, 'theCuria', [[painter, 'civic']]);
    const payout = windfallPayout(state, 0, 'cardDrafted');
    expect(payout.renown.map((grant) => [grant.card, grant.amount])).toEqual([
      [painter, 15],
      ['theCuria', 5],
    ]);
  });

  it('does not raise a negative figure', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    // Total War: −3 happiness in each town. A larger cost is not a stronger card.
    const totalWar = 'totalWar' as OrderId;
    council(state, 'theSultanate', [[totalWar, 'military']]);
    const lines = cardHappiness(state, 0);
    expect(lines.filter((line) => line.card === totalWar).every((line) => line.amount < 0)).toBe(true);
    expect(lines.some((line) => line.card === 'theSultanate')).toBe(false);
  });

  it('is priced by the bots over the meter cards too', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    city.buildings.push('granary');
    bumpRevision(state);
    council(state, 'theCuria', [['theHorrea' as OrderId, 'civic']]);
    const player = playerById(state, 0)!;
    const ctx = valueContext(state, player);
    const card = scoreEffects(orderDef('theHorrea' as OrderId).effects, ctx);
    const curia = [{ kind: 'cardTypeAmplifier', type: 'civic', percent: 30 }] as const;
    expect(card).toBeGreaterThan(0);
    expect(scoreEffects(curia as never, ctx)).toBeCloseTo(card * 0.3, 8);
  });
});

/** Buys one building with gold in a town, through the command. */
function applyBuy(state: GameState, city: City, id: string): boolean {
  return applyCommandOk(state, {
    type: 'purchaseItem',
    playerId: 0,
    cityId: city.id,
    item: { kind: 'building', id },
    currency: 'gold',
  });
}

function applyCommandOk(state: GameState, command: unknown): boolean {
  const result = applyCommand(state, command as Command);
  if (!result.ok) throw new Error(result.error);
  return true;
}
