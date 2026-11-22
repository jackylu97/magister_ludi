import { describe, expect, it } from 'vitest';
import { buildingProductionCost, explainBuildingCost, explainGrowthPercent, explainUnitCost, foundCityAt, unitProductionCost } from '../../src/sim/cities';
import { explainCityStrength, previewCombat } from '../../src/sim/combat';
import { MAX_DIFFICULTY_TIER, humanOrderRarity } from '../../src/sim/difficulty';
import { dispatch, isSavedConfig, loadGame, saveGame, snapshotState } from '../../src/sim/game';
import { explainPurchaseCost } from '../../src/sim/purchase';
import { foundAgeCloseCamps } from '../../src/sim/barbarians';
import { RULES } from '../../src/sim/rulesData';
import { createUnit, normalizeConfig, type GameConfig, type GameState } from '../../src/sim/state';
import { drawOrderOffer, rarityOdds } from '../../src/sim/statecraft/draft';
import { applyCommand } from '../../src/sim/commands';
import { cityYieldPercents } from '../../src/sim/yields/town';
import { recomputeAllVisibility } from '../../src/sim/visibility';
import { at, bareState } from './improvementHelpers';
import { createGame, newGame } from './newGameHelpers';

const config: GameConfig = {
  seed: 42, sizeName: 'duel', barbarians: true,
  players: [{ name: 'Rival', color: '#123' }, { name: 'Human', color: '#abc', isHuman: true }],
};

describe('beta difficulty', () => {
  it('treats tier zero and a missing tier as the same game', () => {
    expect(MAX_DIFFICULTY_TIER).toBe(5);
    expect(normalizeConfig({ ...config, tier: 0 })).toEqual(normalizeConfig(config));
    expect(snapshotState(newGame({ ...config, tier: 0 }))).toBe(snapshotState(newGame(config)));
    for (const tier of [-1, 6, 2.5, NaN, null, '1']) {
      const input = { ...config, tier };
      expect(isSavedConfig(input)).toBe(false);
      expect(() => normalizeConfig(input as GameConfig)).toThrow(/difficulty tier/);
    }
  });

  it('replays an enabled tier with the original player roles', () => {
    const game = createGame({ ...config, tier: 5 });
    for (const playerId of [0, 1]) expect(dispatch(game, { type: 'endTurn', playerId }).ok).toBe(true);
    const restored = loadGame(saveGame(game));
    expect(restored.config.tier).toBe(5);
    expect(snapshotState(restored.state)).toBe(snapshotState(game.state));
  });

  function board(tier: number): GameState {
    const state = bareState(20, 12, true);
    state.tier = tier;
    state.players[0]!.isHuman = false;
    return state;
  }

  it('adds flat strength to both computer sides and keeps the ordinary barbarian modifier', () => {
    const state = board(1);
    const rival = createUnit(state, 0, 'warrior', 4, 4);
    const wild = createUnit(state, 2, 'warrior', 5, 4);
    recomputeAllVisibility(state);
    for (const [attacker, defender] of [[rival, wild], [wild, rival]] as const) {
      const view = previewCombat(state, attacker.id, defender);
      if (!view.ok) throw new Error(view.error);
      expect(view.attackerLines.filter(line => line.source === 'Difficulty')).toEqual([{ source: 'Difficulty', amount: 2 }]);
      expect(view.defenderLines.filter(line => line.source === 'Difficulty')).toEqual([{ source: 'Difficulty', amount: 2 }]);
      expect([...view.attackerLines, ...view.defenderLines]).toContainEqual({ source: 'Against barbarians', amount: RULES.barbarians.combatBonus });
    }
    const human = createUnit(state, 1, 'warrior', 6, 4);
    recomputeAllVisibility(state);
    const shot = previewCombat(state, human.id, wild);
    if (!shot.ok) throw new Error(shot.error);
    expect(shot.attackerLines.some(line => line.source === 'Difficulty')).toBe(false);
    const city = foundCityAt(state, 0, at(state, 9, 4));
    expect(explainCityStrength(state, city)).toContainEqual({ source: 'Difficulty', amount: 2 });
  });

  it('adds production and growth surplus to computer cities without multiplying food', () => {
    const state = board(2);
    const rival = foundCityAt(state, 0, at(state, 4, 4));
    const human = foundCityAt(state, 1, at(state, 13, 4));
    expect(cityYieldPercents(state, rival).filter(line => line.source === 'Difficulty')).toEqual([
      { source: 'Difficulty', yield: 'production', percent: 20, stage: 'empire' },
    ]);
    expect(explainGrowthPercent(state, rival)).toContainEqual({ source: 'Difficulty', percent: 20 });
    expect(cityYieldPercents(state, human).some(line => line.source === 'Difficulty')).toBe(false);
    expect(explainGrowthPercent(state, human).some(line => line.source === 'Difficulty')).toBe(false);
    state.tier = 1;
    expect(explainGrowthPercent(state, rival).some(line => line.source === 'Difficulty')).toBe(false);
  });

  it('starts new camps with two units when the world age closes', () => {
    const fresh = (): GameState => newGame({ ...config, tier: 3, sizeName: 'standard' });
    const end = (state: GameState) => {
      for (const playerId of [0, 1]) expect(applyCommand(state, { type: 'endTurn', playerId }).ok).toBe(true);
    };
    const run = (state: GameState) => {
      state.ageClose = { age: 1, turn: state.turn };
      end(state);
    };
    const game = fresh();
    const quiet = fresh();
    quiet.tier = 2;
    run(quiet);
    expect(quiet.camps).toHaveLength(0);
    run(game);
    expect(game.camps).toHaveLength(RULES.barbarians.campsPerSpawn);
    expect(game.units.filter(unit => unit.ownerId === 2)).toHaveLength(2 * game.camps.length);
    const next = game.camps.length;
    end(game);
    expect(game.camps).toHaveLength(next);
    const disabled = newGame({ ...config, tier: 3, barbarians: false });
    run(disabled);
    expect(disabled.camps).toHaveLength(0);
  });

  it('keeps the camp cap and leaves no camp when there is no legal site', () => {
    const state = board(3);
    for (const tile of state.map.tiles) tile.terrain = 'ocean';
    foundAgeCloseCamps(state);
    expect(state.camps).toHaveLength(0);
    for (const tile of state.map.tiles) tile.terrain = 'grassland';
    for (let index = 0; index < RULES.barbarians.maxCamps; index++) {
      state.camps.push({col: index % state.map.width, row: Math.floor(index / state.map.width), foundedTurn: 1});
    }
    foundAgeCloseCamps(state);
    expect(state.camps).toHaveLength(RULES.barbarians.maxCamps);
    expect(state.units).toHaveLength(0);
  });

  it('adds a quarter to human production costs and leaves an unowned roster price alone', () => {
    const state = board(3);
    const city = foundCityAt(state, 1, at(state, 4, 4));
    const purchase = () => explainPurchaseCost(state, 1, city.id, { kind: 'building', id: 'granary' }, 'gold')!.total;
    const normalPurchase = purchase();
    const wonder = buildingProductionCost('hangingGardens', state, 1);
    const building = buildingProductionCost('granary', state, 1);
    const unit = unitProductionCost(state, 1, 'warrior');
    state.tier = 4;
    expect(buildingProductionCost('granary', state, 1)).toBe(building + Math.floor(building / 4));
    expect(explainBuildingCost('granary', state, 1)).toContainEqual({ source: 'Difficulty +25%', amount: Math.floor(building / 4) });
    expect(purchase()).toBeGreaterThan(normalPurchase);
    expect(buildingProductionCost('hangingGardens', state, 1)).toBe(wonder + Math.floor(wonder / 4));
    expect(unitProductionCost(state, 1, 'warrior')).toBe(unit + Math.floor(unit / 4));
    expect(explainUnitCost(state, 1, 'warrior')).toContainEqual({ source: 'Difficulty +25%', amount: Math.floor(unit / 4) });
    expect(buildingProductionCost('granary', state, 0)).toBe(building);
    expect(buildingProductionCost('granary')).toBe(building);
    state.players[1]!.isHuman = false;
    expect(unitProductionCost(state, 1, 'warrior')).toBe(unit);
  });

  it('uses the human rarity table before applying skip pity and rare-card bonuses', () => {
    const state = newGame({ ...config, tier: 5 });
    const rival = state.players[0]!;
    const human = state.players[1]!;
    expect(rarityOdds(0, 0, humanOrderRarity(state, human))).toEqual({ common: 75, uncommon: 20, rare: 5 });
    expect(rarityOdds(0, 0, humanOrderRarity(state, rival))).toEqual({ common: 60, uncommon: 30, rare: 10 });
    expect(rarityOdds(1, 100, humanOrderRarity(state, human))).toEqual({ common: 60, uncommon: 30, rare: 20 });
    const same = newGame({ ...config, tier: 4 });
    expect(drawOrderOffer(state, rival)).toEqual(drawOrderOffer(same, same.players[0]!));
    expect(drawOrderOffer(state, human)).not.toEqual(drawOrderOffer(same, same.players[1]!));
  });
});
