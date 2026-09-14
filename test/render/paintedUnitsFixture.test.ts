import { describe, expect, it } from 'vitest';
import { seatInks } from '../../src/art/seatInks';
import {
  INFANTRY_REVIEW_TYPES, INFANTRY_VARIANT_TYPES, INFANTRY_VIEWS, UNIT_LINE_REVIEWS,
  UNIT_CONTEXT_VIEWS, UNIT_REVIEW_LEADERS, UNIT_REVIEW_PEOPLE, UNIT_REVIEW_TYPES, UNIT_VIEWS,
  createUnitsFixture, moveUnitsFixtureUnit, setUnitsFixtureVisibility, unitReviewGroup,
} from '../../src/flairGallery/unitsFixture';
import { PaintedUnitKit } from '../../src/render3d/paintedUnits';
import { seesCell } from '../../src/render3d/fog3d';
import { snapshotState } from '../../src/sim/game';
import { FAMILIES, LIVE_GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { improvementErrorAt } from '../../src/sim/improvements';
import { leaderDef } from '../../src/sim/leaderData';
import { getTileAt, tileIndex } from '../../src/sim/map';
import { canStopOn } from '../../src/sim/pathfind';
import { resourceDef, tileSuitsResource } from '../../src/sim/resourceData';
import { unitDef } from '../../src/sim/unitData';
import { EXPLORED, VISIBLE, visibilityAt } from '../../src/sim/visibility';

describe('painted unit review fixture', () => {
  it.each(['polearm', 'ranged', 'cavalry', 'mountedRanged', 'siege', 'navalLight', 'navalHeavy', 'navalRanged', 'faith', 'caravans'] as const)('routes, renders and moves the complete %s comparison through production contracts', group => {
    const line = UNIT_LINE_REVIEWS[group], state = createUnitsFixture({ group });
    const kit = new PaintedUnitKit(() => undefined);
    try {
      expect(unitReviewGroup(group)).toBe(group);
      expect(state.units.map(unit => unit.type)).toEqual(Object.keys(line.views));
      expect(state.units).toHaveLength(group === 'caravans' ? 2 : group === 'navalLight' ? 6 : group === 'navalRanged' ? 3 : group === 'siege' ? 2 : group === 'cavalry' ? 10 : group === 'polearm' ? 6 : 5);
      expect(state.cities).toEqual([]);
      const models = new Set();
      for (const unit of state.units) {
        expect(unitReviewGroup(unit.type, group)).toBe(group);
        expect(unitReviewGroup(unit.type)).toBe(unit.type === line.base && UNIT_REVIEW_TYPES.some(type => type === unit.type) ? 'representatives' : group);
        const tile = getTileAt(state.map, unit.col, unit.row)!;
        expect(canStopOn(state, unit, tile)).toBe(true);
        if (group.startsWith('naval')) expect(tile.terrain).toBe('coast');
        const model = kit.resolve(unit, tile.terrain)!;
        expect(model.geometry.userData.paintedUnitAsset).toBe(unit.type);
        models.add(model.geometry);
        for (const remembered of [true, false]) {
          setUnitsFixtureVisibility(state, remembered);
          expect(seesCell(state.visibility[0], state.map, unit.col, unit.row)).toBe(!remembered);
        }
        const from = { col: unit.col, row: unit.row };
        const result = moveUnitsFixtureUnit(state, unit.id);
        expect(result.ok, unit.type).toBe(true);
        if (!result.ok) throw new Error(result.error);
        expect(result.walked).toEqual([{ col: from.col, row: from.row + 1 }]);
      }
      expect(models.size).toBe(state.units.length);
    } finally { kit.dispose(); }
  });

  it('offers legal water travel, embarkation and landfall without changing representative routes', () => {
    const state = createUnitsFixture({ group: 'embarked' }), kit = new PaintedUnitKit(() => undefined);
    try {
      expect(unitReviewGroup('embarked')).toBe('embarked');
      for (const unit of state.units) {
        expect(unitReviewGroup(unit.type, 'embarked')).toBe('embarked');
        expect(unitReviewGroup(unit.type)).toBe('representatives');
        const before = getTileAt(state.map, unit.col, unit.row)!;
        expect(canStopOn(state, unit, before)).toBe(true);
        expect(kit.resolve(unit, before.terrain)?.waterborne).toBe(unit.type !== 'settler');
        const result = moveUnitsFixtureUnit(state, unit.id);
        expect(result.ok, unit.type).toBe(true);
        const after = getTileAt(state.map, unit.col, unit.row)!;
        expect(kit.resolve(unit, after.terrain)?.waterborne).toBe(unit.type !== 'warrior');
      }
    } finally { kit.dispose(); }
  });

  it('provides the twelve accepted representatives on distinct legal specimen cells', () => {
    const state = createUnitsFixture(), kit = new PaintedUnitKit(() => undefined);
    const expected = ['warrior', 'spearman', 'archer', 'horseman', 'horseArcher', 'warElephant',
      'scout', 'settler', 'worker', 'trader', 'prophet', 'greatPerson'];
    expect(UNIT_REVIEW_TYPES).toEqual(expected);
    expect(Object.keys(UNIT_VIEWS).sort()).toEqual([...expected].sort());
    const cells = new Set<number>(), before = snapshotState(state);
    try {
      for (const type of UNIT_REVIEW_TYPES) {
        const view = UNIT_VIEWS[type], tile = getTileAt(state.map, view.col, view.row)!;
        const occupants = state.units.filter(unit => unit.col === view.col && unit.row === view.row);
        expect(occupants).toHaveLength(1);
        const unit = occupants[0]!;
        expect(unit.type).toBe(type); expect(unit.hp).toBe(unitDef(type).maxHp);
        expect(canStopOn(state, unit, tile), type).toBe(true);
        expect(kit.resolve(unit, tile.terrain)?.geometry.userData.paintedUnitAsset)
          .toBe(type === 'greatPerson' ? 'greatPerson:scholar' : type);
        expect(tile.hills).toBe(false); expect(tile.feature).toBe('none');
        cells.add(tileIndex(state.map, view.col, view.row));
      }
      expect(cells.size).toBe(12);
      expect(snapshotState(state)).toBe(before);
    } finally { kit.dispose(); }
  });

  it.each(UNIT_REVIEW_LEADERS)('uses %s’s real two-colour owner contract', leader => {
    const state = createUnitsFixture({ leader }), def = leaderDef(leader);
    expect(state.players[0]).toMatchObject({ leader, name: def.name });
    expect(seatInks(state.players[0])).toEqual({ primary: def.colors.primary, secondary: def.colors.secondary });
    expect(state.units.every(unit => unit.ownerId === 0)).toBe(true);
    expect(state.cities[0]!.ownerId).toBe(0);
  });

  it('maps all five family controls through real people to distinct production models', () => {
    const kit = new PaintedUnitKit(() => undefined), models = new Set();
    try {
      for (const family of FAMILIES) {
        const state = createUnitsFixture({ family }), unit = state.units.find(piece => piece.type === 'greatPerson')!;
        expect(unit.person).toBe(UNIT_REVIEW_PEOPLE[family]);
        expect(LIVE_GREAT_PERSON_IDS).toContain(unit.person);
        expect(greatPersonDef(unit.person!).family).toBe(family);
        const before = snapshotState(state), model = kit.resolve(unit, 'grassland')!;
        expect(model.geometry.userData.paintedUnitAsset).toBe(`greatPerson:${family}`);
        models.add(model.geometry);
        expect(snapshotState(state)).toBe(before);
      }
      expect(models.size).toBe(5);
    } finally { kit.dispose(); }
  });

  it('keeps the city stack, hill bases, wagon and farm on coherent game terrain', () => {
    const state = createUnitsFixture(), cityView = UNIT_CONTEXT_VIEWS.city;
    expect(state.cities).toHaveLength(1);
    expect(state.cities[0]).toMatchObject({ col: cityView.col, row: cityView.row, population: 4 });
    expect(state.cities[0]!.buildings).toContain('palisade');
    const garrison = state.units.filter(unit => unit.col === cityView.col && unit.row === cityView.row);
    expect(garrison.map(unit => unit.type)).toEqual(['warrior', 'worker']);
    for (const unit of state.units) expect(canStopOn(state, unit, getTileAt(state.map, unit.col, unit.row)!)).toBe(true);
    for (const [key, type] of [['hill', 'warrior'], ['wagonHills', 'trader']] as const) {
      const view = UNIT_CONTEXT_VIEWS[key], tile = getTileAt(state.map, view.col, view.row)!;
      expect(tile.hills).toBe(true); expect(tile.feature).toBe('none');
      expect(state.units.find(unit => unit.col === view.col && unit.row === view.row)?.type).toBe(type);
    }
    const farm = state.map.tiles.find(tile => tile.improvement === 'farm')!;
    expect(farm.resource).toBe('wheat');
    expect(tileSuitsResource(farm, resourceDef(farm.resource!))).toBe(true);
    expect(improvementErrorAt(state, 0, { ...farm, improvement: undefined }, 'farm')).toBeNull();
    expect(state.units.find(unit => unit.type === 'worker')!.chargesLeft).toBe(unitDef('worker').charges);
  });

  it('has a compact replacement grid with no stale generated entities or sites', () => {
    const state = createUnitsFixture();
    expect(state.map.tiles.length).toBeLessThanOrEqual(256);
    expect(state.map.tiles).toHaveLength(state.map.width * state.map.height);
    expect(state.units).toHaveLength(16); expect(state.camps).toEqual([]);
    expect(state.map.tiles.filter(tile => tile.resource)).toHaveLength(1);
    expect(state.map.tiles.filter(tile => tile.improvement)).toHaveLength(1);
    for (const [index, tile] of state.map.tiles.entries()) {
      expect(tileIndex(state.map, tile.col, tile.row)).toBe(index);
      expect(tile.discovery).toBeUndefined(); expect(tile.vein).toBeUndefined(); expect(tile.surveyed).toBeUndefined();
    }
    const ids = [...state.units, ...state.cities].map(entity => entity.id);
    expect(new Set(ids).size).toBe(ids.length); expect(state.nextEntityId).toBeGreaterThan(Math.max(...ids));
    expect(state.tileOwner).toHaveLength(state.map.tiles.length);
    expect(new Set(state.tileOwner)).toEqual(new Set([state.cities[0]!.id]));
    for (const sightings of state.citySightings) for (const sighting of sightings) {
      expect(state.cities.find(city => city.id === sighting.cityId)).toMatchObject({ col: sighting.col, row: sighting.row });
    }
  });

  it('maps remembered fog onto the new grid and hides specimens through the production predicate', () => {
    const state = createUnitsFixture(), units = JSON.stringify(state.units);
    for (const remembered of [true, false]) {
      setUnitsFixtureVisibility(state, remembered);
      expect(state.visibility).toHaveLength(state.players.length);
      for (const grid of state.visibility) expect(grid).toHaveLength(state.map.tiles.length);
      for (const view of [...Object.values(UNIT_VIEWS), ...Object.values(UNIT_CONTEXT_VIEWS)]) {
        expect(visibilityAt(state, 0, view.col, view.row)).toBe(remembered ? EXPLORED : VISIBLE);
        expect(visibilityAt(state, 0, view.col + state.map.width, view.row)).toBe(remembered ? EXPLORED : VISIBLE);
        expect(seesCell(state.visibility[0], state.map, view.col, view.row)).toBe(!remembered);
      }
      expect(JSON.stringify(state.units)).toBe(units);
    }
  });

  it('demonstrates real movement for every representative and both terrain-fit cases', () => {
    const state = createUnitsFixture();
    for (const unit of state.units) {
      const from = { col: unit.col, row: unit.row }, remaining = unit.movesLeft, revision = state.revision;
      const result = moveUnitsFixtureUnit(state, unit.id);
      expect(result.ok, unit.type).toBe(true);
      if (!result.ok) throw new Error(result.error);
      expect(result.from).toEqual(from);
      expect(result.walked).toEqual([{ col: from.col, row: from.row + 1 }]);
      expect(unit).toMatchObject(result.walked[0]!);
      expect(unit.movesLeft).toBeLessThan(remaining);
      expect(state.revision).toBe(revision + 1);
      expect(unit.path).toBeUndefined();
    }
  });

  it('does not bypass simulation refusals to produce a cosmetic movement', () => {
    const state = createUnitsFixture(), warrior = state.units.find(unit => unit.type === 'warrior')!;
    state.turnEnded[warrior.ownerId] = true;
    const before = snapshotState(state), result = moveUnitsFixtureUnit(state, warrior.id);
    expect(result.ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
  });

  it('opens infantry URLs in their separate group while preserving original routes', () => {
    for (const type of INFANTRY_VARIANT_TYPES) {
      expect(unitReviewGroup(type)).toBe('infantry');
      expect(unitReviewGroup(type, 'representatives')).toBe('infantry');
    }
    expect(unitReviewGroup('infantry')).toBe('infantry');
    expect(unitReviewGroup('warrior', 'infantry')).toBe('infantry');
    for (const type of [...UNIT_REVIEW_TYPES, ...Object.keys(UNIT_CONTEXT_VIEWS), 'all', 'civilian']) {
      expect(unitReviewGroup(type)).toBe('representatives');
    }
    expect(unitReviewGroup('unknown')).toBe('representatives');
  });

  it('adds only the six infantry variants and the accepted warrior to a compact, legal comparison world', () => {
    const expected = ['warrior', 'swordsman', 'legionary', 'longswordsman', 'fireLance', 'khopesh', 'eagleWarrior'];
    expect(INFANTRY_REVIEW_TYPES).toEqual(expected);
    expect(Object.keys(INFANTRY_VIEWS).sort()).toEqual([...expected].sort());
    const kit = new PaintedUnitKit(() => undefined);
    try {
      const baseline = createUnitsFixture();
      const acceptedWarrior = kit.resolve(baseline.units.find(unit => unit.type === 'warrior')!)!;
      for (const leader of UNIT_REVIEW_LEADERS) {
        const state = createUnitsFixture({ group: 'infantry', leader });
        const before = snapshotState(state), models = new Set(), cells = new Set();
        expect(state.map.tiles.length).toBeLessThanOrEqual(140);
        expect(state.units.map(unit => unit.type)).toEqual(expected);
        expect(state.cities).toEqual([]); expect(state.camps).toEqual([]);
        expect(new Set(state.tileOwner)).toEqual(new Set([null]));
        expect(seatInks(state.players[0])).toEqual({
          primary: leaderDef(leader).colors.primary, secondary: leaderDef(leader).colors.secondary,
        });
        for (const type of INFANTRY_REVIEW_TYPES) {
          const view = INFANTRY_VIEWS[type], tile = getTileAt(state.map, view.col, view.row)!;
          const occupants = state.units.filter(unit => unit.col === view.col && unit.row === view.row);
          expect(occupants).toHaveLength(1);
          const unit = occupants[0]!;
          expect(unit.type).toBe(type); expect(unit.ownerId).toBe(0);
          expect(canStopOn(state, unit, tile), type).toBe(true);
          expect(tile.hills).toBe(false); expect(tile.feature).toBe('none');
          const model = kit.resolve(unit, tile.terrain)!;
          expect(model.geometry.userData.paintedUnitAsset).toBe(type);
          if (type === 'warrior') expect(model).toBe(acceptedWarrior);
          models.add(model.geometry); cells.add(tileIndex(state.map, view.col, view.row));
        }
        expect(models.size).toBe(7); expect(cells.size).toBe(7);
        for (const [index, tile] of state.map.tiles.entries()) {
          expect(tileIndex(state.map, tile.col, tile.row)).toBe(index);
          expect(tile.discovery).toBeUndefined(); expect(tile.vein).toBeUndefined();
          expect(tile.resource).toBeUndefined(); expect(tile.improvement).toBeUndefined();
        }
        expect(state.citySightings.every(sightings => sightings.length === 0)).toBe(true);
        expect(snapshotState(state)).toBe(before);
      }
      expect(baseline.units).toHaveLength(16);
      expect(baseline.units.some(unit => INFANTRY_VARIANT_TYPES.some(type => unit.type === type))).toBe(false);
    } finally { kit.dispose(); }
  });

  it('moves every infantry specimen one real step and maps fog onto the smaller world', () => {
    const state = createUnitsFixture({ group: 'infantry' });
    for (const remembered of [true, false]) {
      setUnitsFixtureVisibility(state, remembered);
      for (const grid of state.visibility) expect(grid).toHaveLength(state.map.tiles.length);
      for (const view of Object.values(INFANTRY_VIEWS)) {
        expect(visibilityAt(state, 0, view.col, view.row)).toBe(remembered ? EXPLORED : VISIBLE);
        expect(seesCell(state.visibility[0], state.map, view.col + state.map.width, view.row)).toBe(!remembered);
      }
    }
    for (const unit of state.units) {
      const from = { col: unit.col, row: unit.row }, before = unit.movesLeft, revision = state.revision;
      const result = moveUnitsFixtureUnit(state, unit.id);
      expect(result.ok, unit.type).toBe(true);
      if (!result.ok) throw new Error(result.error);
      expect(result.from).toEqual(from);
      expect(result.walked).toEqual([{ col: from.col, row: from.row + 1 }]);
      expect(unit).toMatchObject(result.walked[0]!);
      expect(unit.movesLeft).toBeLessThan(before); expect(state.revision).toBe(revision + 1);
      expect(unit.path).toBeUndefined();
    }
  });
});
