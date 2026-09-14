import { describe, expect, it } from 'vitest';
import { BoxGeometry, Float32BufferAttribute, InstancedMesh, Mesh, MeshStandardMaterial } from 'three';
import { createWorksFixture, WORKS_VIEWS, type WorksView } from '../../src/flairGallery/worksFixture';
import { PAINTED_WORK_ASSET_NAMES, PaintedWorksLayer, type PaintedWorksAssets } from '../../src/render3d/paintedWorks';
import { snapshotState } from '../../src/sim/game';
import { improvementErrorAt } from '../../src/sim/improvements';
import { getTileAt, tileIndex, type GameMap } from '../../src/sim/map';
import { resourceDef, tileSuitsResource } from '../../src/sim/resourceData';
import { visibleResourceAt } from '../../src/sim/tech';
import { EXPLORED, HIDDEN, VISIBLE, visibilityAt } from '../../src/sim/visibility';
// @ts-expect-error The approved terrain preparation remains JavaScript.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';

const expectedWorks = [
  [4, 6, 'plantation', 'wine'], [5, 8, 'plantation', 'tea'], [4, 10, 'plantation', 'reeds'],
  [9, 6, 'lumbermill', null], [10, 8, 'lumbermill', null],
  [13, 6, 'fishingBoats', 'fish'], [13, 8, 'fishingBoats', 'pearls'], [15, 7, 'fishingBoats', 'whales'],
  [6, 10, 'farm', 'wheat'],
  [4, 13, 'academy', null], [7, 13, 'landmark', 'horses'], [10, 13, 'manufactory', 'iron'],
  [11, 16, 'customsHouse', null], [4, 16, 'citadel', null], [7, 16, 'holySite', 'wine'],
  [4, 18, 'academy', null], [7, 18, 'holySite', null],
] as const;

describe('painted improvement review fixture', () => {
  it('places every resource and improvement on ground the simulation accepts', () => {
    const state = createWorksFixture();
    for (const tile of state.map.tiles) {
      if (tile.resource) {
        expect(tileSuitsResource(tile, resourceDef(tile.resource)), `${tile.resource} at (${tile.col}, ${tile.row})`).toBe(true);
        expect(visibleResourceAt(state, 0, tile)).toBe(tile.resource);
      }
      if (tile.improvement) {
        // Ask whether the existing work could be built here, excluding only
        // the rule that refuses a duplicate of an already standing work.
        expect(improvementErrorAt(state, 0, { ...tile, improvement: undefined }, tile.improvement),
          `${tile.improvement} at (${tile.col}, ${tile.row})`).toBeNull();
      }
    }
  });

  it('keeps each camera target on the named work and ground variant', () => {
    const state = createWorksFixture();
    const targets = {
      plantation: { improvement: 'plantation', resource: 'wine', hills: false },
      plantationHills: { improvement: 'plantation', resource: 'tea', hills: true },
      reeds: { improvement: 'plantation', resource: 'reeds', hills: false },
      lumbermill: { improvement: 'lumbermill', feature: 'forest', hills: false },
      lumbermillHills: { improvement: 'lumbermill', feature: 'jungle', hills: true },
      fishingBoats: { improvement: 'fishingBoats', resource: 'fish', terrain: 'coast' },
      academy: { improvement: 'academy', hills: false },
      landmark: { improvement: 'landmark', resource: 'horses', hills: false },
      manufactory: { improvement: 'manufactory', resource: 'iron', hills: true, feature: 'none' },
      customsHouse: { improvement: 'customsHouse', terrain: 'grassland', hills: false },
      citadel: { improvement: 'citadel', hills: true },
      holySite: { improvement: 'holySite', resource: 'wine', hills: false },
      academyHills: { improvement: 'academy', hills: true },
      holySiteHills: { improvement: 'holySite', hills: true },
    } satisfies Record<WorksView, object>;
    expect(Object.keys(WORKS_VIEWS).sort()).toEqual(Object.keys(targets).sort());
    for (const [key, view] of Object.entries(WORKS_VIEWS)) {
      expect(view.col).toBeGreaterThanOrEqual(0); expect(view.col).toBeLessThan(state.map.width);
      expect(view.row).toBeGreaterThanOrEqual(0); expect(view.row).toBeLessThan(state.map.height);
      expect(getTileAt(state.map, view.col, view.row)).toMatchObject(targets[key as WorksView]);
    }
  });

  it('contains only the authored works, resources and entities after replacing the generated map', () => {
    const state = createWorksFixture();
    expect(state.map.tiles).toHaveLength(state.map.width * state.map.height);
    const works = state.map.tiles.filter(tile => tile.improvement)
      .map(tile => [tile.col, tile.row, tile.improvement, tile.resource ?? null]);
    expect(works).toEqual([...expectedWorks].sort((a, b) => a[1] - b[1] || a[0] - b[0]));
    expect(state.map.tiles.filter(tile => tile.resource)).toHaveLength(10);
    for (const [index, tile] of state.map.tiles.entries()) {
      expect(tileIndex(state.map, tile.col, tile.row)).toBe(index);
      expect(tile.discovery).toBeUndefined(); expect(tile.vein).toBeUndefined(); expect(tile.surveyed).toBeUndefined();
    }
    expect(state.camps).toEqual([]);
    expect(state.cities).toHaveLength(1);
    expect(state.cities[0]).toMatchObject({ ownerId: 0, col: 8, row: 10, population: 4 });
    expect(state.units.map(unit => [unit.type, unit.ownerId, unit.col, unit.row]))
      .toEqual([['worker', 0, 8, 9], ['warrior', 0, 7, 10]]);
    const ids = [...state.cities, ...state.units].map(entity => entity.id);
    expect(new Set(ids).size).toBe(ids.length); expect(state.nextEntityId).toBeGreaterThan(Math.max(...ids));
    expect(state.tileOwner).toHaveLength(state.map.tiles.length);
    expect(new Set(state.tileOwner)).toEqual(new Set([state.cities[0]!.id]));
    for (const sightings of state.citySightings) for (const sighting of sightings) {
      expect(state.cities.find(city => city.id === sighting.cityId)).toMatchObject({ col: sighting.col, row: sighting.row });
    }
  });

  it('maps the visible and remembered controls to every review tile in the replacement grid', () => {
    const state = createWorksFixture();
    expect(state.visibility).toHaveLength(state.players.length);
    for (const grid of state.visibility) expect(grid).toHaveLength(state.map.tiles.length);
    expect(new Set(state.visibility[0])).toEqual(new Set([VISIBLE]));
    for (const level of [EXPLORED, VISIBLE]) {
      state.visibility[0]!.fill(level);
      for (const view of Object.values(WORKS_VIEWS)) {
        expect(visibilityAt(state, 0, view.col, view.row)).toBe(level);
        expect(visibilityAt(state, 0, view.col + state.map.width, view.row)).toBe(level);
      }
    }
    const focus = WORKS_VIEWS.lumbermillHills;
    state.visibility[0]![tileIndex(state.map, focus.col, focus.row)] = HIDDEN;
    expect(visibilityAt(state, 0, focus.col, focus.row)).toBe(HIDDEN);
    expect(visibilityAt(state, 0, WORKS_VIEWS.lumbermill.col, WORKS_VIEWS.lumbermill.row)).toBe(VISIBLE);
  });

  it('draws the authored resource and work cells through the production layer without changing the fixture', () => {
    const state = createWorksFixture(), prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
    const material = new MeshStandardMaterial({ vertexColors: true });
    const geometry = Object.fromEntries(PAINTED_WORK_ASSET_NAMES.map(name => {
      const shape = new BoxGeometry(.3, .4, .3); shape.translate(0, .2, 0);
      shape.setAttribute('color', new Float32BufferAttribute(new Float32Array(shape.getAttribute('position').count * 3).fill(1), 3));
      return [name, shape];
    }));
    const layer = new PaintedWorksLayer({ material, ...geometry } as PaintedWorksAssets, () => undefined);
    try {
      for (const level of [VISIBLE, EXPLORED]) {
        state.visibility[0]!.fill(level);
        const before = snapshotState(state);
        layer.build(state, prepared, state.visibility[0], 0);
        expect(snapshotState(state)).toBe(before);
        expect(layer.entries).toHaveLength(expectedWorks.length);
        const drawn = new Set(layer.group.children.filter((object): object is Mesh => object instanceof Mesh)
          .flatMap(mesh => mesh.userData.paintedWorksCells as number[]));
        for (const [col, row, improvement, resource] of expectedWorks) {
          const cell = tileIndex(state.map, col, row);
          expect(layer.entries.find(entry => entry.cell === cell)).toMatchObject({ improvement, resource, level });
          expect(drawn.has(cell)).toBe(true);
        }
        const boats = layer.group.children.filter((object): object is InstancedMesh =>
          object instanceof InstancedMesh && object.geometry === geometry['fishing-boat']);
        expect(boats.reduce((count, mesh) => count + mesh.count, 0)).toBe(9);
      }
      const focus = WORKS_VIEWS.fishingBoats, cell = tileIndex(state.map, focus.col, focus.row);
      state.visibility[0]![cell] = HIDDEN;
      layer.build(state, prepared, state.visibility[0], 0);
      expect(layer.entries.some(entry => entry.cell === cell)).toBe(false);
      expect(layer.group.children.filter((object): object is Mesh => object instanceof Mesh)
        .every(mesh => !(mesh.userData.paintedWorksCells as number[]).includes(cell))).toBe(true);
    } finally {
      layer.dispose(); material.dispose(); Object.values(geometry).forEach(shape => shape.dispose());
    }
  });
});
