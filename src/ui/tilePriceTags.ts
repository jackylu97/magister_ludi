/**
 * The price tags that float over buyable ground while the city screen's Buy
 * Tiles mode is up.
 *
 * DOM over the board, for `cityBanners.ts`' reasons exactly: text in WebGL means
 * a font atlas and a draw call per string, while a `<div>` is crisp at every
 * zoom, carries the specimen's mono numerals, and can be clicked. It shares that
 * module's whole shape — build on demand, position from `renderer.projectCell`,
 * reposition on the renderer's frame beat rather than on a loop of its own — so
 * the two read as one family and neither fights render-on-demand.
 *
 * What it draws, and what it deliberately does not
 * ------------------------------------------------
 * One tag per entry in `purchasableTiles` (`cities.ts`), which is the *one*
 * evaluator: the price on the tag is the price the reducer charges, and a hex
 * the reducer would refuse wears a greyed tag carrying the reducer's own
 * sentence rather than no tag at all. That is the mode's whole content — a
 * player who cannot afford the wheat field needs to see what it costs and be
 * told why not, and a tag that vanished would answer neither question.
 *
 * Ground that is not on offer at all — the sea, a rival's territory, hexes off
 * the frontier — gets nothing. There is no price to quote on a tile nobody is
 * selling, and a ring full of struck-through tags would bury the ones that mean
 * something.
 *
 * Clicking
 * --------
 * An affordable tag is a button and buys on the spot; the board underneath does
 * the same job for the hex itself (see the precedence table in `controls.ts`),
 * so both the label and the ground answer. A greyed tag is not a button — it is
 * a price and a reason, and pressing it does nothing but say so again.
 */

import { purchasableTiles } from '../sim/cities';
import type { Game } from '../sim/game';
import type { City } from '../sim/state';
import type { MapView } from './mapView';

export interface TilePriceTagsOptions {
  /** An element covering the viewport, above the canvas. The banners' sheet. */
  container: HTMLElement;
  renderer: MapView;
  getGame: () => Game;
  /** The open city, or `null`. Tags are always about one city's rings. */
  getCity: () => City | null;
  /** Whether Buy Tiles mode is up. Nothing is drawn while it is not. */
  isActive: () => boolean;
  /** Called when the player clicks an affordable tag. */
  onBuy: (cell: { col: number; row: number }) => void;
}

export interface TilePriceTags {
  /** Re-reads the offers: adds, removes and rewrites tags, then positions them. */
  refresh(): void;
  /** Moves every tag to where its hex is on screen. Runs per drawn frame. */
  reposition(): void;
  dispose(): void;
}

interface Tag {
  root: HTMLButtonElement;
  /** Last text and state written, so an unchanged tag is not rewritten. */
  signature: string;
  col: number;
  row: number;
}

/** A stable key for a hex, so a tag survives a refresh that did not move it. */
function keyOf(col: number, row: number): string {
  return `${col},${row}`;
}

export function createTilePriceTags(options: TilePriceTagsOptions): TilePriceTags {
  const { container, renderer, getGame, getCity, isActive, onBuy } = options;
  const tags = new Map<string, Tag>();

  function build(col: number, row: number): Tag {
    const root = document.createElement('button');
    root.type = 'button';
    root.className = 'tile-price';
    // The tag sits inside the viewport, and the viewport turns a pointer press
    // into a pan. Without this, buying a tile would also drag the camera — the
    // same guard the banners keep, and for the same reason.
    for (const event of ['pointerdown', 'pointerup'] as const) {
      root.addEventListener(event, (e) => e.stopPropagation());
    }
    root.addEventListener('click', (e) => {
      e.stopPropagation();
      if (root.disabled) return;
      onBuy({ col, row });
    });
    container.append(root);
    return { root, signature: '', col, row };
  }

  function refresh(): void {
    // Positioning needs `projectCell`, which only the 3D renderer has. Under the
    // frozen 2D pipelines there is nowhere to put these, so there are none —
    // rather than a stack of unpositioned tags in the corner.
    const city = getCity();
    const live = isActive() && city !== null && renderer.projectCell !== undefined;
    const offers = live && city ? purchasableTiles(getGame().state, city) : [];

    const seen = new Set<string>();
    for (const offer of offers) {
      const key = keyOf(offer.col, offer.row);
      seen.add(key);
      let tag = tags.get(key);
      if (!tag) {
        tag = build(offer.col, offer.row);
        tags.set(key, tag);
      }

      const affordable = offer.error === null;
      const signature = `${offer.price}|${offer.error ?? ''}`;
      if (signature !== tag.signature) {
        tag.signature = signature;
        // The figure alone, in mono. The glyph is the gold coin the top bar and
        // the yield lines already use, so a price reads as a price everywhere.
        tag.root.textContent = `${offer.price}`;
        // The reducer's own sentence, which is what the refusal will say if the
        // player clicks the ground under the tag anyway.
        tag.root.title = affordable
          ? `Buy this tile for ${offer.price} gold`
          : offer.error ?? '';
        tag.root.classList.toggle('is-barred', !affordable);
        tag.root.disabled = !affordable;
      }
    }

    for (const [key, tag] of [...tags]) {
      if (seen.has(key)) continue;
      tag.root.remove();
      tags.delete(key);
    }
    reposition();
  }

  function reposition(): void {
    const project = renderer.projectCell;
    if (!project) return;
    for (const tag of tags.values()) {
      const point = project.call(renderer, tag.col, tag.row);
      if (!point || !point.onScreen) {
        tag.root.style.display = 'none';
        continue;
      }
      tag.root.style.display = '';
      // Rounded to whole pixels, like the banners: a tag on a half pixel is a
      // blurry tag, and the board moves far enough per frame to hide the snap.
      tag.root.style.transform = `translate(-50%, -50%) translate(${Math.round(
        point.x,
      )}px, ${Math.round(point.y)}px)`;
    }
  }

  return {
    refresh,
    reposition,
    dispose(): void {
      for (const tag of tags.values()) tag.root.remove();
      tags.clear();
    },
  };
}
