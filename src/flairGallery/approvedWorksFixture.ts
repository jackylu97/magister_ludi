import { APPROVED_WORK_IDS, type ApprovedWorkId, workGalleryPreviews } from '../render3d/approvedWorkCatalog';
import { IMPROVEMENT_IDS } from '../sim/improvementData';
import { createMap, tileIndex } from '../sim/map';
import { newGame } from '../sim/state';
import { computeFreshwater, setRiverEdge } from '../sim/water';
import { resetVisibility, VISIBLE } from '../sim/visibility';

export const APPROVED_WORK_VIEWS = {
  nazcaLines: { col: 3, row: 3, label: 'Nazca Lines', note: 'White lines bordered by dark gravel trace the hummingbird across the sand.' },
  stepwell: { col: 6, row: 3, label: 'Stepwell', note: 'Sandstone stairs descend to a pool below the colonnade.' },
  inuksuk: { col: 9, row: 3, label: 'Inuksuk', note: 'Two stone stacks support the broad upper slab.' },
  totemPole: { col: 3, row: 6, label: 'Totem Pole', note: 'Carved cedar and painted wings stand in a forest clearing.' },
  hillfort: { col: 6, row: 6, label: 'Hillfort', note: 'The earth banks follow the hillside beneath the palisade.' },
  baray: { col: 9, row: 6, label: 'Baray', note: 'The double sluice faces the river.' },
  wildOrchard: { col: 3, row: 9, label: 'Wild Orchard', note: 'Three fruit trees surround a picking ladder and two baskets.' },
  paradiseGarden: { col: 6, row: 9, label: 'Paradise Garden', note: 'Water channels meet at the fountain between four planted beds.' },
  fishTraps: { col: 9, row: 9, label: 'Fish Traps', note: 'Willow fences lead into a reed basket at sea level.' },
} satisfies Record<ApprovedWorkId, { col: number; row: number; label: string; note: string }>;

export function createApprovedWorksFixture() {
  const state = newGame({ seed: 19, sizeName: 'duel', players: [
    { name: 'Model review', leader: 'cyrusTheGreat', color: '#984d36', isHuman: true },
  ] });
  state.map = createMap({ width: 14, height: 13, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.nextEntityId = 1;
  state.tileOwner = Array(state.map.tiles.length).fill(null);
  state.citySightings = state.players.map(() => []);
  resetVisibility(state);
  state.visibility[0]!.fill(VISIBLE);
  for (const t of state.map.tiles) {
    t.moisture = .55;
    if (t.row <= 4) t.terrain = t.col < 8 ? 'desert' : 'snow';
    else if (t.row >= 8 && t.col >= 8) t.terrain = t.col > 10 ? 'ocean' : 'coast';
    else if (t.col <= 4) t.feature = 'forest';
    else if (t.row === 6 && t.col <= 7) t.hills = true;
  }
  const previews = new Map<number, ApprovedWorkId>();
  for (const id of APPROVED_WORK_IDS) {
    const { col, row } = APPROVED_WORK_VIEWS[id];
    const cell = tileIndex(state.map, col, row), tile = state.map.tiles[cell]!;
    const live = IMPROVEMENT_IDS.find(rowId => rowId === id);
    if (live) tile.improvement = live;
    else previews.set(cell, id);
  }
  setRiverEdge(state.map, state.map.tiles[tileIndex(state.map, 9, 6)]!, 0);
  setRiverEdge(state.map, state.map.tiles[tileIndex(state.map, 6, 9)]!, 4);
  computeFreshwater(state.map);
  workGalleryPreviews.set(state.map, previews);
  return state;
}
