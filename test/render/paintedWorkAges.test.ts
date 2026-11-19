/**
 * A work follows the age of its owner, as a town does (the user, 2026-11-16:
 * "the windmills feel out of place with the huts representing the city";
 * `docs/flags.md` item (nnnnnnn), "Improvements by age"). The pictures are
 * judged by eye. These tests pin the rules: the step is the owner's age, an
 * unowned work takes the first step, the fingerprint moves when the age does
 * and at no other time, the table names only models the kit loads, and the
 * switch gives back the models of before.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry, type BufferGeometry, Float32BufferAttribute, MeshStandardMaterial } from 'three';
import { VIEW3D } from '../../src/render3d/lookData';
import { PAINTED_WORK_ASSET_NAMES, PaintedWorksLayer, signPaintedWorks, workAgeSteps, type PaintedWorksAssets } from '../../src/render3d/paintedWorks';
import { foundCityAt } from '../../src/sim/cities';
import type { ImprovementId } from '../../src/sim/improvementData';
import { createMap, getTileAt, tileIndex, type GameMap } from '../../src/sim/map';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { resetVisibility, VISIBLE } from '../../src/sim/visibility';
// @ts-expect-error No declarations for the shared study geometry.
import { NORTH_STAR_AGED_WORK_ASSETS, NORTH_STAR_WORK_AGES, NORTH_STAR_WORK_ASSETS, NORTH_STAR_WORK_STEPS } from '../../src/terrainStudy/northStarAssets.js';
// @ts-expect-error No declarations for the shared study geometry.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
import { newGame } from '../sim/newGameHelpers';

const cleanups: (() => void)[] = [];
const works = VIEW3D.visualTest.works;
const byAge = works.byAge, windmillShare = works.windmillShare;
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); works.byAge = byAge; works.windmillShare = windmillShare; });

/** A town of seat 0 at (3, 2) that owns the six hexes round it, and one work on a hex nobody owns. */
function fixture() {
  const state = newGame({ seed: 9, sizeName: 'duel', players: [
    { name: 'Red', color: '#ac3333', isHuman: true }, { name: 'Blue', color: '#3344ac', isHuman: true },
  ] });
  state.map = createMap({ width: 10, height: 6, terrain: 'grassland' });
  state.units = []; state.cities = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state); state.visibility.forEach(levels => levels.fill(VISIBLE));
  const city = foundCityAt(state, 0, getTileAt(state.map, 3, 2)!);
  const owned: [number, number, ImprovementId][] = [[2, 2, 'farm'], [4, 2, 'mine'], [2, 1, 'quarry'], [3, 1, 'pasture'], [2, 3, 'lumbermill'], [3, 3, 'plantation']];
  const cells = {} as Record<string, number>;
  for (const [col, row, id] of owned) {
    const cell = tileIndex(state.map, col, row);
    getTileAt(state.map, col, row)!.improvement = id; state.tileOwner[cell] = city.id; cells[id] = cell;
  }
  getTileAt(state.map, 7, 2)!.improvement = 'farm'; cells.unowned = tileIndex(state.map, 7, 2);
  const setAge = (age: number): void => { state.players[0]!.techsResearched = TECH_IDS.filter(id => techDef(id).age <= age && techDef(id).charter !== true); };
  const material = new MeshStandardMaterial({ color: 'white', vertexColors: true });
  const names = [...PAINTED_WORK_ASSET_NAMES, ...(NORTH_STAR_WORK_ASSETS as string[])];
  const geometry: Record<string, BufferGeometry> = Object.fromEntries(names.map(name => {
    const g = new BoxGeometry(.3, .3, .3); g.translate(0, .15, 0);
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 3).fill(1), 3));
    return [name, g];
  }));
  const layer = new PaintedWorksLayer({ material, ...geometry } as PaintedWorksAssets, () => undefined);
  cleanups.push(() => { layer.dispose(); material.dispose(); Object.values(geometry).forEach(g => g.dispose()); });
  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  /** The models that stand on a hex, by name. A model placed with no footing (a haystack, a rack) is counted by its instances. */
  const modelsAt = (cell: number): string[] => {
    layer.build(state, prepared, null, null, true);
    const drawn = new Set(layer.placements.filter(p => p.cell === cell).map(p => p.asset));
    for (const mesh of layer.group.children) {
      const name = Object.keys(geometry).find(key => geometry[key] === (mesh as { geometry?: BufferGeometry }).geometry);
      if (name && ((mesh.userData.paintedWorksCells ?? []) as number[]).includes(cell)) drawn.add(name);
    }
    return [...drawn].sort();
  };
  return { state, cells, setAge, modelsAt, layer };
}

describe.skipIf(!VIEW3D.visualTest.northStar)('works by the age of their owner', () => {
  it('has a row of one entry for each age, and names only models the kit loads', () => {
    const loaded = new Set<string>([...PAINTED_WORK_ASSET_NAMES, ...(NORTH_STAR_WORK_ASSETS as string[]), 'lumbermill']);
    const named = new Set<string>();
    for (const [improvement, row] of Object.entries(NORTH_STAR_WORK_AGES as Record<string, unknown[]>)) {
      expect(row, improvement).toHaveLength(NORTH_STAR_WORK_STEPS);
      for (const entry of row) {
        const models = typeof entry === 'string' ? [entry] : Array.isArray(entry) ? [entry[0] as string] : [(entry as { store: string }).store, (entry as { beside: string }).beside];
        for (const model of models) { expect(loaded.has(model), `${improvement}: ${model}`).toBe(true); named.add(model); }
      }
    }
    // The farm's rack has its own switch because it needs extra space in the yard.
    for (const model of NORTH_STAR_AGED_WORK_ASSETS as string[]) expect(named.has(model) || model === 'ns-rack', model).toBe(true);
  });

  it('takes the step from the age of the owner of the hex, and the first step where nobody owns it', () => {
    works.byAge = true;
    const { state, cells, setAge } = fixture();
    for (const age of [1, 2, 3, 4]) {
      setAge(age);
      const stepAt = workAgeSteps(state);
      expect(stepAt(cells.farm!, 'farm')).toBe(age);
      expect(stepAt(cells.mine!, 'mine')).toBe(age);
      expect(stepAt(cells.unowned!, 'farm')).toBe(1);
      // An improvement with no row in the table has no step, so its hex never rebuilds for an age.
      expect(stepAt(cells.farm!, 'camp')).toBe(0);
    }
  });

  it('draws each work with the model of its owner\'s age', () => {
    works.byAge = true; works.windmillShare = 1;
    const { cells, setAge, modelsAt } = fixture();
    const expected: Record<number, Record<string, string>> = {
      1: { farm: 'ns-granary', mine: 'ns-mine-pit', quarry: 'ns-quarry-cut', pasture: 'ns-shelter', lumbermill: 'ns-lumber-camp', plantation: 'ns-granary' },
      2: { farm: 'ns-thatch-barn', mine: 'ns-mine-winch', quarry: 'ns-quarry-frame', pasture: 'ns-shelter', lumbermill: 'ns-lumber-camp', plantation: 'ns-thatch-barn' },
      3: { farm: 'ns-windmill', mine: 'mine', quarry: 'ns-quarry', pasture: 'ns-stable', lumbermill: 'lumbermill', plantation: 'ns-barn' },
      4: { farm: 'ns-windmill', mine: 'ns-mine-headframe', quarry: 'ns-quarry', pasture: 'ns-stable', lumbermill: 'ns-saw-hall', plantation: 'ns-loft-barn' },
    };
    for (const age of [1, 2, 3, 4]) {
      setAge(age);
      for (const [improvement, model] of Object.entries(expected[age]!)) expect(modelsAt(cells[improvement]!), `age ${age} ${improvement}`).toContain(model);
      // No windmill in the first two ages, whatever the share of farms that have one.
      if (age < 3) expect(modelsAt(cells.farm!)).not.toContain('ns-windmill');
    }
    // The first farm has sheaves beside its store (and the drying rack where the yard has room); a later farm has haystacks.
    setAge(1); expect(modelsAt(cells.farm!)).toContain('ns-sheaf'); expect(modelsAt(cells.farm!)).not.toContain('ns-haystack');
    // Both late ages keep the mix of windmills and barns with haystacks.
    works.windmillShare = 0;
    setAge(3); expect(modelsAt(cells.farm!)).toEqual(expect.arrayContaining(['ns-barn', 'ns-haystack']));
    setAge(4); expect(modelsAt(cells.farm!)).toEqual(expect.arrayContaining(['ns-loft-barn', 'ns-haystack']));
    // The owner is in the last age, but a farm nobody owns stays at the first step.
    setAge(4); expect(modelsAt(cells.unowned!)).toContain('ns-granary');
  });

  it('moves the fingerprint when the owner enters a new age, and not for a technology inside an age', () => {
    works.byAge = true;
    const { state, setAge } = fixture();
    setAge(1); const first = signPaintedWorks(state, 0);
    const held = state.players[0]!.techsResearched;
    state.players[0]!.techsResearched = held.slice(0, Math.max(1, held.length - 1));
    expect(signPaintedWorks(state, 0)).toBe(first);
    setAge(2); const second = signPaintedWorks(state, 0);
    expect(second).not.toBe(first);
    // The other seat owns no work here, so its age changes nothing.
    state.players[1]!.techsResearched = [...TECH_IDS];
    expect(signPaintedWorks(state, 0)).toBe(second);
  });

  it('gives back the models of before when the switch is off, at every age', () => {
    works.byAge = false; works.windmillShare = 1;
    const { state, cells, setAge, modelsAt } = fixture();
    setAge(1); const sign = signPaintedWorks(state, 0);
    for (const age of [1, 4]) {
      setAge(age);
      expect(workAgeSteps(state)(cells.farm!, 'farm')).toBe(0);
      expect(signPaintedWorks(state, 0)).toBe(sign);
      expect(modelsAt(cells.farm!)).toContain('ns-windmill');
      expect(modelsAt(cells.mine!)).toContain('mine');
      expect(modelsAt(cells.quarry!)).toContain('ns-quarry');
      expect(modelsAt(cells.lumbermill!)).toContain('lumbermill');
      expect(modelsAt(cells.plantation!)).toContain('ns-barn');
      const all = [...modelsAt(cells.pasture!), ...modelsAt(cells.farm!), ...modelsAt(cells.mine!), ...modelsAt(cells.quarry!), ...modelsAt(cells.lumbermill!), ...modelsAt(cells.plantation!)];
      for (const model of NORTH_STAR_AGED_WORK_ASSETS as string[]) expect(all, model).not.toContain(model);
    }
  });
});
