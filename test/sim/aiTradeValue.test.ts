import { describe, expect, it } from 'vitest';
import { aiConfigFor } from '../../src/ai/aiConfig';
import { valueContext } from '../../src/ai/bot';
import { answerProposal, counterTerms, diplomacyDecision } from '../../src/ai/diplomacy';
import { tilePurchaseForecast } from '../../src/ai/tilePurchaseForecast';
import { dealIncomeValue, tradeCityValue, tradeResourcePrices } from '../../src/ai/tradeValue';
import { availableCopies, foundCityAt, tilePurchasePrice } from '../../src/sim/cities';
import { type DealProposal } from '../../src/sim/deals';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { happinessOf } from '../../src/sim/meters';
import { bumpRevision, createUnit } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

function table() {
  const state = newGame({ seed: 17, sizeName: 'duel', players: [
    { name: 'Ada', color: '#a00' }, { name: 'Bors', color: '#00a' },
  ] });
  state.map = createMap({ width: 24, height: 12, terrain: 'grassland' });
  state.tileOwner = new Array(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  resetVisibility(state);
  const cities = [3, 18].map((col, playerId) => foundCityAt(state, playerId, getTileAt(state.map, col, 5)!));
  const player = state.players[0]!;
  player.gold = 5000;
  bumpRevision(state);
  return { state, cities, player, ai: aiConfigFor(player.persona, player.id) };
}

describe('trade prices follow the receiving empire', () => {
  it('values one gold per turn at fifteen gold now', () => {
    const { ai, state, player } = table();
    expect(dealIncomeValue(ai)).toBe(15);
    const ctx = valueContext(state, player);
    const counter = counterTerms(state, 0, 1, { goldPerTurn: 1 }, {}, ctx)!;
    expect(counter.take.gold).toBe(Math.floor(15 / (1 + ai.war.counterMarkup)));
  });

  it('values a happiness resource more when the empire is unhappy', () => {
    const { state, cities, player, ai } = table();
    const happy = happinessOf(state, player.id);
    const comfortable = tradeResourcePrices(state, player.id, ai)('wine', 1, false).total;
    cities[0]!.population += 20;
    bumpRevision(state);
    expect(happinessOf(state, player.id)).toBeLessThan(happy);
    const unhappy = tradeResourcePrices(state, player.id, ai)('wine', 1, false).total;
    expect(unhappy).toBeGreaterThan(comfortable);
  });

  it('keeps a positive price for duplicates, below the first copy', () => {
    const { state, player, ai } = table();
    const first = tradeResourcePrices(state, player.id, ai)('wine', 1, false).total;
    const city = state.cities[0]!;
    const tile = getTileAt(state.map, city.col, city.row)!;
    tile.resource = 'wine';
    tile.improvement = 'plantation';
    bumpRevision(state);
    const duplicate = tradeResourcePrices(state, player.id, ai)('wine', 1, false).total;
    expect(duplicate).toBeGreaterThan(0);
    expect(first).toBeGreaterThan(duplicate);
  });

  it('raises strategic value when research opens a usable recruit, then tapers spare copies', () => {
    const { state, player, ai } = table();
    player.techsResearched.push('mining', 'bronzePanoply');
    bumpRevision(state);
    const locked = tradeResourcePrices(state, player.id, ai)('iron', 1, false).total;
    player.techsResearched.push('steel');
    bumpRevision(state);
    const open = tradeResourcePrices(state, player.id, ai)('iron', 1, false);
    expect(open.total).toBeGreaterThan(locked);
    const recruit = (copies: number) => tradeResourcePrices(state, player.id, ai)('iron', copies, false)
      .terms.find((line) => line.label.includes('available recruits'))!.value;
    expect(recruit(4)).toBeGreaterThan(recruit(1));
    expect(recruit(4)).toBeLessThan(4 * recruit(1));
  });

  it('reduces the second resource premium when the same deal already supplies an alternative', () => {
    const { state, player, ai } = table();
    player.techsResearched.push('husbandry', 'theWheel');
    bumpRevision(state);
    const quote = tradeResourcePrices(state, player.id, ai);
    const alone = quote('camels', 4, false).total;
    const together = quote('camels', 4, false, {}, { strategics: [{ id: 'horses', copies: 4 }] }).total;
    expect(together).toBeLessThan(alone);
    expect(together).toBeGreaterThan(0);
  });

  it('counts city population, buildings and age separately', () => {
    const { state, cities, player, ai } = table();
    const city = cities[0]!;
    const start = tradeCityValue(city, state, ai);
    expect(start).toBeGreaterThan(ai.weights.city);
    city.population++;
    const grown = tradeCityValue(city, state, ai);
    expect(grown).toBeGreaterThan(start);
    city.buildings.push('library');
    const built = tradeCityValue(city, state, ai);
    expect(built).toBeGreaterThan(grown);
    player.techsResearched.push('steel');
    expect(tradeCityValue(city, state, ai)).toBeGreaterThan(built);
  });

  it('reduces the value of camels when spare horses can supply the same units', () => {
    const { state, cities, player, ai } = table();
    player.techsResearched.push('husbandry', 'theWheel');
    bumpRevision(state);
    const before = tradeResourcePrices(state, player.id, ai)('camels', 1, false).total;
    const tile = getTileAt(state.map, cities[0]!.col, cities[0]!.row)!;
    tile.resource = 'horses';
    tile.resourceCopies = 8;
    tile.improvement = 'pasture';
    bumpRevision(state);
    expect(tradeResourcePrices(state, player.id, ai)('camels', 1, false).total).toBeLessThan(before);
  });

  it('proposes several strategic copies while keeping a free copy at each end', () => {
    const { state, cities, player } = table();
    for (const city of cities) {
      state.players[city.ownerId]!.techsResearched.push('mining', 'bronzePanoply');
      const tile = getTileAt(state.map, city.col, city.row)!;
      tile.resource = city.ownerId === player.id ? 'obsidian' : 'copper';
      tile.resourceCopies = 5;
      tile.improvement = 'mine';
    }
    bumpRevision(state);
    const command = diplomacyDecision(state, player, valueContext(state, player))?.command;
    expect(command).toMatchObject({ type: 'proposeDeal',
      give: { strategics: [{ id: 'obsidian', copies: 4 }] },
      take: { strategics: [{ id: 'copper', copies: 4 }] },
    });
  });

  it('accepts a spare luxury exchange even when both incoming kinds are already held', () => {
    const { state, cities, player } = table();
    for (const city of cities) {
      for (const [dx, resource] of [[-1, 'wine'], [0, 'wine'], [1, 'silk'], [2, 'silk']] as const) {
        const tile = getTileAt(state.map, city.col + dx, city.row)!;
        tile.resource = resource;
        tile.improvement = 'plantation';
        state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
      }
    }
    bumpRevision(state);
    const paper: DealProposal = { id: 100, by: 1, to: player.id, turn: state.turn,
      give: { luxuries: ['silk'] }, take: { luxuries: ['wine'] } };
    state.dealProposals.push(paper);
    expect(answerProposal(state, player, paper, valueContext(state, player)).command.type).toBe('acceptDeal');
  });

  it('does not mutate the board and reuses each resource quote within a decision', () => {
    const { state, player, ai } = table();
    player.techsResearched.push('mining', 'bronzePanoply');
    createUnit(state, player.id, 'swordsman', 4, 5);
    bumpRevision(state);
    const before = JSON.stringify(state);
    const spare = availableCopies(state, player.id, 'iron');
    const quote = tradeResourcePrices(state, player.id, ai);
    const first = quote('iron', 4, false);
    expect(quote('iron', 4, false)).toBe(first);
    quote('wine', 1, false);
    expect(JSON.stringify(state)).toBe(before);
    expect(availableCopies(state, player.id, 'iron')).toBe(spare);
  });
});

describe('tile price forecasts', () => {
  it('uses frontier prices when the cash purchase list is empty, including age and ring', () => {
    const { state, player, cities } = table();
    player.techsResearched.push('steel');
    player.gold = 0;
    const city = cities[0]!;
    // Extend the border so the forecast includes both inner and outer rings.
    state.tileOwner[tileIndex(state.map, city.col + 2, city.row)] = city.id;
    bumpRevision(state);
    const base = valueContext(state, player);
    const ctx = { ...base, wants: { ...base.wants, gold: [] } };
    const forecast = tilePurchaseForecast(ctx);
    expect(forecast.length).toBeGreaterThan(0);
    expect(forecast.some((row) => row.price === 120)).toBe(true);
    expect(forecast.some((row) => row.price === 240)).toBe(true);
    for (const row of forecast) {
      expect(state.tileOwner[tileIndex(state.map, row.tile.col, row.tile.row)]).toBeNull();
      expect(row.price).toBe(tilePurchasePrice(state, player.id, city.id, row.tile));
    }
    expect(tilePurchaseForecast(ctx)).toBe(forecast);
  });
});
