/**
 * The test scene's world (batch V1, `docs/flags.md` item (nnnnnnn)): one small,
 * hand-made, fixed world for judging the visual test version by eye, drawn by
 * the real `Renderer3D` with no game running. The user, 2026-11-12: "for the
 * sake of testing, could we create a test scene that we use to render
 * changes?"
 *
 * Everything the visual changes touch is here, at fixed places: every terrain
 * and feature; coast beside ocean, and a lake; a river with two sources, a join
 * and a mouth; hills and mountains with a border crossing them; roads with a
 * junction, a bend and a river crossing; three towns of different sizes, one
 * walled; the improvements and resources with their pins; one piece of each
 * kind and a ship; visible, remembered and uncharted ground side by side; and
 * two empires sharing a border, with a small unowned gap inside one.
 *
 * The map is 26 by 18 and wraps, as every board does. Nothing here is random:
 * the state is built from literals, so two screenshots of one view differ only
 * by what was switched.
 */

import { foundCityAt } from '../sim/cities';
import type { ImprovementId } from '../sim/improvementData';
import { createMap, getTileAt, type Tile } from '../sim/map';
import type { ResourceId } from '../sim/resourceData';
import { bumpRevision, createUnit, newGame } from '../sim/state';
import { TECH_IDS } from '../sim/techData';
import type { TerrainId } from '../sim/terrainData';
import type { UnitTypeId } from '../sim/unitData';
import { EXPLORED, HIDDEN, resetVisibility, VISIBLE } from '../sim/visibility';
// @ts-expect-error The terrain modules remain JavaScript. Their direction numbering is the one a river edge bit uses.
import { neighbour } from '../terrainStudy/surface.js';

/** The named camera views: a hex to centre on and how far to zoom in. */
export const SCENE_VIEWS = {
  overview: { col: 12, row: 9, zoom: 1, label: 'Overview' },
  coast: { col: 19, row: 8, zoom: 3.2, label: 'Coast and ocean' },
  rivers: { col: 13, row: 8, zoom: 3.4, label: 'River: sources, join, mouth' },
  roads: { col: 10, row: 8, zoom: 3.4, label: 'Roads: junction, bend, crossing' },
  hillsBorder: { col: 6, row: 5, zoom: 3.4, label: 'Hills and mountains with a border' },
  city: { col: 3, row: 7, zoom: 3.6, label: 'Towns' },
  units: { col: 15, row: 13, zoom: 3.4, label: 'Pieces and a ship' },
  fog: { col: 9, row: 15, zoom: 2.4, label: 'Visible, remembered, uncharted' },
} as const;
export type SceneView = keyof typeof SCENE_VIEWS;

const WIDTH = 26, HEIGHT = 18;

/** The scene's world. A fixture, never a saved game. */
export function createSceneFixture() {
  const state = newGame({ seed: 23, sizeName: 'duel', players: [
    { name: 'Western court', color: '#714291', secondary: '#c9ccd6', isHuman: true },
    { name: 'Eastern court', color: '#b34e37', secondary: '#e8c672', isHuman: true },
  ] });
  state.map = createMap({ width: WIDTH, height: HEIGHT, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const tile = (col: number, row: number): Tile => getTileAt(state.map, col, row)!;
  const paint = (cols: [number, number], rows: [number, number], terrain: TerrainId): void => {
    for (let row = rows[0]; row <= rows[1]; row++) for (let col = cols[0]; col <= cols[1]; col++) tile(col, row).terrain = terrain;
  };

  for (const t of state.map.tiles) t.moisture = .55;
  // Water: the east coast beside the open ocean, and a lake in the west.
  paint([19, 21], [0, 17], 'coast');
  paint([22, 25], [0, 17], 'ocean');
  for (const [col, row] of [[5, 13], [6, 13], [5, 14]] as const) tile(col, row).terrain = 'lake';
  // Cold north, a desert south-west, plains south-east, grassland between.
  paint([0, 8], [0, 1], 'snow');
  paint([9, 18], [0, 2], 'tundra');
  paint([0, 8], [2, 2], 'tundra');
  paint([0, 7], [9, 12], 'desert');
  paint([9, 12], [9, 10], 'desert');
  paint([13, 18], [9, 11], 'plains');
  paint([0, 18], [15, 17], 'plains');
  for (const [col, row] of [[6, 4], [7, 4], [7, 3]] as const) tile(col, row).terrain = 'mountain';
  for (let row = 5; row <= 7; row++) for (let col = 4; col <= 9; col++) if (!(col === 4 && row === 7)) tile(col, row).hills = true;
  for (let row = 5; row <= 7; row++) for (let col = 0; col <= 2; col++) tile(col, row).feature = 'forest';
  for (let row = 12; row <= 13; row++) for (let col = 15; col <= 17; col++) tile(col, row).feature = 'jungle';
  for (let row = 3; row <= 4; row++) for (let col = 10; col <= 12; col++) tile(col, row).feature = 'forest';
  tile(2, 10).feature = 'oasis';
  tile(10, 9).feature = 'floodplain'; tile(11, 9).feature = 'floodplain';

  // The river: a main run along the line between rows 8 and 9 from col 9 to
  // the coast, and a branch down the line between cols 13 and 14 from row 4,
  // which joins it. Both banks of every river edge carry the edge.
  const riverBetween = (side: (t: Tile) => boolean, other: (t: Tile) => boolean, within: (t: Tile) => boolean): void => {
    for (const t of state.map.tiles) {
      if (!side(t) || !within(t) || isWater(t)) continue;
      for (let d = 0; d < 6; d++) {
        const n = neighbour(t, state.map, d) as Tile | null;
        if (!n || !other(n) || !within(n) || isWater(n)) continue;
        t.riverEdges = (t.riverEdges ?? 0) | (1 << d);
        n.riverEdges = (n.riverEdges ?? 0) | (1 << ((d + 3) % 6));
      }
    }
  };
  riverBetween(t => t.row <= 8, t => t.row >= 9, t => t.col >= 9 && t.col <= 18);
  riverBetween(t => t.col <= 13, t => t.col >= 14, t => t.row >= 4 && t.row <= 8);

  // Resources, then the improvements that work them. Set by hand: this is a
  // picture, so the rules a worker would be held to are not asked.
  const resources: [number, number, ResourceId][] = [
    [2, 6, 'wheat'], [5, 6, 'iron'], [8, 6, 'gold'], [2, 5, 'deer'], [13, 10, 'horses'], [12, 11, 'stone'],
    [19, 9, 'fish'], [20, 4, 'pearls'], [23, 10, 'whales'], [14, 11, 'wine'], [16, 12, 'spices'],
    [12, 2, 'furs'], [1, 1, 'silver'], [17, 10, 'cotton'], [4, 11, 'incense'],
  ];
  for (const [col, row, id] of resources) tile(col, row).resource = id;
  const works: [number, number, ImprovementId][] = [
    [2, 6, 'farm'], [5, 6, 'mine'], [8, 6, 'mine'], [2, 5, 'camp'], [13, 10, 'pasture'], [12, 11, 'quarry'],
    [19, 9, 'fishingBoats'], [14, 11, 'plantation'], [16, 12, 'plantation'], [1, 7, 'lumbermill'],
    [3, 10, 'farm'], [11, 12, 'academy'], [8, 13, 'landmark'], [6, 10, 'holySite'], [9, 5, 'citadel'],
    [16, 8, 'manufactory'], [18, 5, 'customsHouse'], [5, 14, 'floatingGardens'],
  ];
  for (const [col, row, id] of works) tile(col, row).improvement = id;

  // Roads: west to east along row 7, a bend up to the eastern town, and a
  // branch south from the junction at (10, 7) that crosses the river.
  for (let col = 3; col <= 13; col++) tile(col, 7).road = 0;
  tile(14, 6).road = 1; tile(15, 6).road = 1;
  for (const [col, row] of [[10, 8], [10, 9], [10, 10], [9, 11]] as const) tile(col, row).road = 0;

  // Three towns: a large walled capital, a small town and a middling one.
  const capital = foundCityAt(state, 0, tile(3, 7));
  capital.population = 9;
  capital.buildings.push('palisade' as never, 'shrine' as never, 'temple' as never, 'pyramids' as never, 'stonehenge' as never);
  const hamlet = foundCityAt(state, 0, tile(9, 11));
  hamlet.population = 2;
  const east = foundCityAt(state, 1, tile(15, 6));
  east.population = 5;
  east.buildings.push('shrine' as never, 'greatLighthouse' as never);
  // The west owns cols 0 to 11 from row 5 down to row 13, with one unowned
  // hex inside; the east owns cols 12 to 18 from row 3 to row 12. They meet
  // along the line between cols 11 and 12, and the west's north border runs
  // over the hills under the mountains.
  for (const t of state.map.tiles) {
    if (isWater(t)) continue;
    const cell = t.row * WIDTH + t.col;
    if (t.col <= 11 && t.row >= 5 && t.row <= 13) state.tileOwner[cell] = t.row >= 10 && t.col >= 7 ? hamlet.id : capital.id;
    else if (t.col >= 12 && t.col <= 18 && t.row >= 3 && t.row <= 12) state.tileOwner[cell] = east.id;
  }
  state.tileOwner[8 * WIDTH + 7] = null;

  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  bumpRevision(state);

  // One piece of each kind, and a ship on the coast.
  const pieces: [number, number, UnitTypeId, number][] = [
    [10, 13, 'warrior', 0], [11, 13, 'spearman', 0], [12, 13, 'archer', 1], [13, 13, 'horseman', 1],
    [14, 13, 'catapult', 1], [12, 14, 'settler', 1], [13, 14, 'worker', 1], [14, 14, 'trader', 1],
    [15, 14, 'prophet', 1], [16, 14, 'scout', 1], [20, 12, 'trireme', 1], [20, 14, 'galley', 1],
  ];
  for (const [col, row, type, seat] of pieces) createUnit(state, seat, type, col, row);

  // Fog for the western seat: the south-west is remembered, the south-middle
  // is uncharted, everything else is in sight.
  const levels = state.visibility[0]!;
  for (const t of state.map.tiles) {
    const cell = t.row * WIDTH + t.col;
    levels[cell] = t.row >= 15 && t.col <= 8 ? EXPLORED : t.row >= 15 && t.col >= 9 && t.col <= 17 ? HIDDEN : VISIBLE;
  }
  state.visibility[1]?.fill(VISIBLE);
  return state;
}

function isWater(tile: Tile): boolean {
  return tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'lake';
}
