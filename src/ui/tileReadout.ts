/**
 * What a tile *is*, in words and marks — the vocabulary the hover card speaks.
 *
 * Four describers, lifted out of `src/main.ts` when the mapgen inspection page
 * grew a hover card of its own. They were always the right shape for sharing —
 * each one is a pure function of `(state, seat, tile)` that returns text or
 * nodes and touches no element — and the only reason they lived in the entry
 * point was that nothing else had asked yet.
 *
 * Now two surfaces ask, which is exactly the situation this codebase answers the
 * same way every time: **one place turns the vocabulary into words**. The game's
 * info panel and the mapgen page's card must not be able to describe the same
 * hex two ways, any more than the hover card, the lens roundel and the city
 * panel may describe the same luxury three ways (`describeResourceEffect`).
 *
 * What stays with the caller is the *placement* — which element each row is
 * written into, and how the card is shown and hidden. That is page business and
 * the two pages genuinely differ: the game has a fog to respect and a seat whose
 * eyes it looks through, the inspection page is a spectator with neither.
 */

import { tileYieldOf, yieldContextFor } from '../sim/cities';
import { improvementDef } from '../sim/improvementData';
import type { Tile } from '../sim/map';
import { resourceDef } from '../sim/resourceData';
import { describeResourceEffect } from '../sim/resourceEffects';
import type { GameState } from '../sim/state';
import { visibleResourceAt } from '../sim/tech';
import { TILE_YIELD_KEYS, featureDef, terrainDef } from '../sim/terrainData';
import { YIELD_GLYPH } from './figures';
import { resourceMarkNode } from './resourceMark';

/** Terrain and feature by name, plus whether the hex is hilly. */
export function describeTile(tile: Tile): { terrain: string; feature: string; hills: boolean } {
  return {
    terrain: terrainDef(tile.terrain).name,
    feature: featureDef(tile.feature).name,
    hills: tile.hills,
  };
}

/**
 * The tile's yields as one span per voice, each figure in the colour that yield
 * is always drawn in — food green, production orange, gold gilt, and so on
 * through all six — and in the mono face, because they are numbers. A tile that
 * produces nothing hands back an empty list, so the caller can print its own
 * "nothing here" rather than six zeroes.
 *
 * `tileYieldOf` is the same function the citizens are assigned with, so what the
 * card promises is what a city working the tile would actually collect — and it
 * is asked through the **given seat's** yield context, so a renewal that empire
 * has researched (a Feudalism farm on fresh water) is in the figure. The tile
 * itself is the same tile for everybody; what it is worth is not.
 */
export function tileYieldNodes(state: GameState, playerId: number, tile: Tile): HTMLElement[] {
  const value = tileYieldOf(tile, yieldContextFor(state, playerId));
  // The glyph table is `figures.ts`'s, which is the one place a yield's mark is
  // written down — a second copy here is exactly the drift that module exists
  // to stop.
  return TILE_YIELD_KEYS.filter((key) => value[key] > 0).map((key) => {
    const span = document.createElement('span');
    span.className = `tile-yield is-${key}`;
    span.textContent = `${value[key]}${YIELD_GLYPH[key]}`;
    return span;
  });
}

/**
 * What has been *built* on the tile.
 *
 * No technology gate and no seat: an improvement is a thing somebody put on the
 * ground, and unlike a strategic resource there is nothing about it to
 * recognise.
 */
export function describeImprovement(tile: Tile): string {
  const id = tile.improvement;
  if (id === undefined) return '—';
  const def = improvementDef(id);
  return `${def.emoji} ${def.name}`;
}

/**
 * The resource row: the drawn mark, the name, and the kind.
 *
 * Nodes rather than a string, which is what the drawn mark costs and all it
 * costs: the mark is an element carrying a CSS mask (see
 * `src/ui/resourceMark.ts`), so this row is the one line of the card that
 * cannot be a `textContent` assignment. The em dash case still is.
 *
 * Asked of `visibleResourceAt`, which is the simulation's own answer and the
 * same one the resource lens draws from, so the card and the board cannot
 * disagree about whether this empire has heard of iron yet. A tile whose
 * resource is hidden reads as an empty row, exactly like a tile with nothing on
 * it: the honest report of "you do not know of anything here".
 */
export function resourceRowNode(state: GameState, playerId: number, tile: Tile): Node {
  const id = visibleResourceAt(state, playerId, tile);
  if (id === null) return document.createTextNode('—');
  const def = resourceDef(id);
  // A luxury's *signature* is the reason to want this seam rather than the next
  // one, so the readout names it — through `describeResourceEffect`, the one
  // place the vocabulary is turned into words.
  const signature = describeResourceEffect(id);
  const kind = signature === null ? def.kind : `${def.kind} · ${signature}`;
  const row = document.createDocumentFragment();
  row.append(resourceMarkNode(id));
  row.append(document.createTextNode(` ${def.name} (${kind})`));
  return row;
}
