import { MeshStandardMaterial } from 'three';
import { tileIndex } from '../sim/map';
import type { GameState } from '../sim/state';
import { PaintedWorksLayer, type PaintedPropSource, type PaintedWorksAssets } from './paintedWorks';
import { seatSeesKind } from './sites3d';
// @ts-expect-error The approved site compositions remain JavaScript.
import { createSiteArt } from '../terrainStudy/siteArt.js';

export const PAINTED_SITE_ASSET_NAMES = [
  'site-ruin-arch', 'site-ruin-column', 'site-ruin-fragment', 'site-hut',
  'site-longhouse', 'site-antiquity', 'site-wreck', 'site-raider-tent', 'site-watchtower',
] as const;

export function paintedSiteEntries(state: GameState, seat: number | null): Map<number, string> {
  const entries = new Map<number, string>();
  for (const tile of state.map.tiles) if (tile.discovery && seatSeesKind(state, seat, tile.discovery))
    entries.set(tileIndex(state.map, tile.col, tile.row), tile.discovery);
  for (const camp of state.camps) entries.set(tileIndex(state.map, camp.col, camp.row), 'barbarianCamp');
  return entries;
}

const source: PaintedPropSource = {
  name: 'painted-sites', entries: paintedSiteEntries,
  createArt(assets, register) {
    const fields = new MeshStandardMaterial({ color: 'white', vertexColors: true, roughness: .96,
      flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    register(fields, { terrain: true });
    const art = createSiteArt(assets, fields);
    return { ...art, dispose() { art.dispose(); fields.dispose(); } };
  },
};

/** Site art uses the same regional instancing and fog lifecycle as improvements. */
export class PaintedSiteLayer extends PaintedWorksLayer {
  constructor(assets: PaintedWorksAssets, register: (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown) {
    super(assets, register, source);
  }
}
