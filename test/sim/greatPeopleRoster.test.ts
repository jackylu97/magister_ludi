import { describe, expect, it } from 'vitest';
import type { BuildingId } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import { previewCombat } from '../../src/sim/combat';
import { GREAT_PERSON_IDS, greatPersonDef, type GreatPersonId } from '../../src/sim/greatPeopleData';
import { barbarianPlayer, bumpRevision, createUnit, type GameState } from '../../src/sim/state';
import { anyCardDef, cardPurchaseRiders, explainCardEmpireYields } from '../../src/sim/statecraft';
import { cityContext, explainTileYield } from '../../src/sim/yields/hex';
import { at, bareState } from './improvementHelpers';
import { found, game } from './statecraftHelpers';

function legacy(state: GameState, ...ids: GreatPersonId[]): void {
  for (const id of ids) state.players[0]!.legacies.push({ id, age: 2 });
  bumpRevision(state);
}

function battle(person: GreatPersonId) {
  const { state } = game(179);
  const city = found(state, 0);
  const mine = createUnit(state, 0, 'warrior', city.col + 2, city.row);
  const foe = createUnit(state, 1, 'warrior', mine.col + 1, mine.row);
  for (const unit of [mine, foe]) at(state, unit.col, unit.row).terrain = 'grassland';
  legacy(state, person);
  function forecast(defend: boolean) {
    const [attacker, target] = defend ? [foe, mine] : [mine, foe];
    const plan = previewCombat(state, attacker.id, { col: target.col, row: target.row });
    if (!plan.ok) throw new Error(plan.error);
    const lines = defend ? plan.defenderLines : plan.attackerLines;
    return lines.filter(row => row.source.includes(greatPersonDef(person).name)).map(row => row.amount);
  }
  return { state, mine, foe, forecast };
}

describe('great person roster rulings', () => {
  it('keeps old save IDs and gives each person a distinct card ID', () => {
    expect(greatPersonDef('ibnBattuta').name).toBe('Ibn Jubayr');
    expect(greatPersonDef('cosimoDeMedici').name).toBe('Jacques Cœur');
    expect(greatPersonDef('heroOfAlexandria').name).toBe('Amanitore');
    expect(greatPersonDef('heronOfAlexandria').name).toBe('Hero of Alexandria');
    expect(greatPersonDef('hildegardOfBingen').name).toBe('Hildegard of Bingen');
    for (const id of GREAT_PERSON_IDS) {
      const person = greatPersonDef(id);
      expect(anyCardDef(id).effects, id).toBe(person.legacy);
      expect(JSON.stringify(person.legacy), id).not.toContain('combatPercent');
    }
  });

  it('pays Cai Yan only for recruits of other real empires', () => {
    const state = bareState(16, 10, true);
    legacy(state, 'caiYan');
    const culture = () => explainCardEmpireYields(state, 0).find(line => line.card === 'caiYan')?.culture ?? 0;
    state.players[0]!.greatPeopleRecruited = 3;
    barbarianPlayer(state)!.greatPeopleRecruited = 7;
    bumpRevision(state);
    expect(culture()).toBe(0);
    state.players[1]!.greatPeopleRecruited = 2;
    bumpRevision(state);
    expect(culture()).toBe(8);
  });

  it('pays Lü Buwei and Dante from empire income and keeps fractions', () => {
    const state = bareState();
    legacy(state, 'luBuwei', 'dante');
    const gains = explainCardEmpireYields(state, 0, { goldPerTurn: 13.5, faithPerTurn: 7 });
    expect(gains.find(row => row.card === 'luBuwei')?.culture).toBeCloseTo(1.35);
    expect(gains.find(row => row.card === 'dante')?.culture).toBe(1.75);
    expect(explainCardEmpireYields(state, 0, { goldPerTurn: -40 }).some(row => row.card === 'luBuwei')).toBe(false);
  });

  it('pays Li Bai once for ground beside both a mountain and a river', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 4));
    const tile = at(state, 5, 5);
    legacy(state, 'liBai');
    const gain = () => explainTileYield(tile, cityContext(state, city)).filter(row => row.source.includes('Li Bai')).reduce((sum, row) => sum + row.culture, 0);
    expect(gain()).toBe(0);
    tile.mountainsBeside = 1;
    bumpRevision(state);
    expect(gain()).toBe(1);
    tile.riverEdges = 1;
    bumpRevision(state);
    expect(gain()).toBe(1);
    tile.mountainsBeside = 0;
    bumpRevision(state);
    expect(gain()).toBe(1);
  });

  it('discounts a building once when it supplies both science and faith', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 4));
    legacy(state, 'fatimaAlFihri');
    const amounts = (id: BuildingId) => cardPurchaseRiders(state, 0, 'building', undefined, city, id, 'gold')
      .filter(row => row.source.includes('Fatima')).map(row => row.percent);
    for (const id of ['library', 'shrine', 'kulliye'] as const) expect(amounts(id)).toEqual([-30]);
    expect(amounts('granary')).toEqual([]);
  });

  it('gives Trưng Trắc a defensive bonus against a larger empire', () => {
    const { state, forecast } = battle('trungTrac');
    const rival = found(state, 1);
    expect(forecast(true)).toEqual([]);
    foundCityAt(state, 1, at(state, rival.col + 3, rival.row));
    bumpRevision(state);
    expect(forecast(true)).toEqual([6]);
    expect(forecast(false)).toEqual([]);
  });

  it('uses the opposing unit’s health when Sun Tzu attacks or defends', () => {
    const { mine, foe, forecast } = battle('sunTzu');
    mine.hp -= 1;
    for (const defend of [false, true]) expect(forecast(defend)).toEqual([]);
    foe.hp -= 1;
    for (const defend of [false, true]) expect(forecast(defend)).toEqual([4]);
  });
});
