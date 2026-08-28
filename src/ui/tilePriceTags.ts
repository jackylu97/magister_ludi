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
 *
 * The plate (art pass, 2026-08-27)
 * --------------------------------
 * It used to be a bare figure on an ink pill, which read as a *label* — a number
 * floating over the ground, in the voice the damage numbers and the tile readout
 * use. A price is not a label, it is an **offer**, and this interface already has
 * a printed language for one: the city panel's `or 60💰` tag, parchment under a
 * hairline ink rim with the figure in the treasury's own gilt. So the tag is now
 * that same plate, laid on the hex.
 *
 * Three things follow from choosing the panel's language rather than inventing a
 * second one, and each is the reason the tag looks the way it does:
 *
 *   · **The coin is drawn, never typed.** `setYieldText` prints `💰` as the
 *     mask-drawn mark from `src/art/yieldMarks.ts`, exactly as every other
 *     figure in the HUD does; the emoji survives only in the `aria-label` and
 *     the `title`, which are strings the platform builds and cannot hold a node.
 *   · **A refusal is greyed, not struck.** The panel greys a buy it cannot pay
 *     for — faint ink, faint rim, the paper gone to `--table` — and a price with
 *     a line through it said "withdrawn" when what it means is "not today".
 *   · **The hovered plate takes the gilt rim**, which is the one state the panel
 *     has no equivalent for: on a board, the tag under the cursor has to say
 *     which hex is about to change hands.
 *
 * The plate's dimensions, inks and lift are CSS custom properties on the class
 * itself (`--price-*` in `style.css`) rather than numbers spread through its
 * rules — this is a DOM surface, so its tunables belong in the stylesheet the
 * way a renderer's belong in `data/view3d.json`.
 *
 * One mechanism, one mode again (2026-08-28)
 * ------------------------------------------
 * The trade pass of 2026-08-27 gave this layer a second supplier: sending a
 * caravan was the same gesture as buying a hex — arm a mode, read a figure on
 * every candidate, click one — so it drew the same plate rather than a second
 * thing that looked like it. The user's ruling of 2026-08-28 deleted that mode
 * outright ("I want to remove all micromanagement of units"): a route is chosen
 * on the Trade screen and the caravan is teleported to the origin, so there is
 * nothing on the board to click.
 *
 * `createMapPlates` survives the mode it was generalised for, and deliberately.
 * It is the *lifecycle* — build on demand, rewrite only on a changed signature,
 * reposition on the renderer's frame beat, hide what has left the screen — and
 * that is worth exactly as much with one supplier as with two; what the split
 * bought was the guarantee that a second armed-mode overlay is a supplier
 * rather than a second layer that merely looks like this one. The price supplier
 * below is the only one today.
 *
 * `createTilePriceTags` is that core with the Buy Tiles supplier bolted on, and
 * it keeps its name and its shape because the *price* plate is a thing this
 * codebase talks about (the flair cabinet has a specimen of it, and
 * `test/ui/tilePriceTags.test.ts` pins its dress).
 */

import { purchasableTiles } from '../sim/cities';
import type { Game } from '../sim/game';
import type { City } from '../sim/state';
import type { MapView } from './mapView';
import { YIELD_GLYPH, setYieldText } from './yieldMark';

/**
 * One plate on one hex, in the voice both modes speak.
 *
 * `text` is composed in `YIELD_GLYPH` and printed through `setYieldText`, so a
 * coin on a price is the same drawn mark the rest of the HUD uses. `spoken` is the same fact as a *string*, because an
 * `aria-label` and a `title` are built by the platform and cannot hold a node —
 * the register in `figures.ts`.
 *
 * `disabled` and `spoken` are one decision made twice on purpose: a refused
 * plate is greyed *and* says the refusal, and the refusal is always the
 * reducer's own sentence rather than a summary of it.
 */
export interface MapPlate {
  col: number;
  row: number;
  /** The plate's face, in `YIELD_GLYPH` tokens. */
  text: string;
  /** The `title` and `aria-label`: the offer in words, or the refusal. */
  spoken: string;
  /** True for a plate that is a figure and a reason rather than a button. */
  disabled: boolean;
}

export interface MapPlatesOptions {
  /** An element covering the viewport, above the canvas. The banners' sheet. */
  container: HTMLElement;
  renderer: MapView;
  /**
   * Every plate that should be on the board right now, re-read on each
   * `refresh`. An empty list is how a mode says it is not up.
   */
  getPlates: () => readonly MapPlate[];
  /** Called when the player clicks a plate that is not disabled. */
  onPick: (plate: MapPlate) => void;
  /**
   * The pointer entered a plate, or left every plate (`null`). Optional, and
   * unused today: it existed for the caravan mode's dashed route preview under
   * the cursor, which went with the mode (2026-08-28). Kept on the shape because
   * "what is under the pointer" is the one thing a plate knows and its supplier
   * does not, and re-deriving it later from a `pointerenter` bound outside this
   * file would be the second lifecycle the split exists to prevent.
   */
  onHover?: (plate: MapPlate | null) => void;
}

export interface MapPlates {
  /** Re-reads the plates: adds, removes and rewrites, then positions them. */
  refresh(): void;
  /** Moves every plate to where its hex is on screen. Runs per drawn frame. */
  reposition(): void;
  dispose(): void;
}

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

/**
 * The price tags' handle. An alias rather than a second declaration of the same
 * three methods: the two modes are one layer (see the module docblock), and two
 * copies of a shape is how they would stop being one.
 */
export type TilePriceTags = MapPlates;

interface Tag {
  root: HTMLButtonElement;
  /** Last text and state written, so an unchanged tag is not rewritten. */
  signature: string;
  plate: MapPlate;
}

/** A stable key for a hex, so a tag survives a refresh that did not move it. */
function keyOf(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * The plate layer itself: a `<div>` per hex somebody is being offered
 * something on. See the module docblock for what the two modes share.
 */
export function createMapPlates(options: MapPlatesOptions): MapPlates {
  const { container, renderer, getPlates, onPick, onHover } = options;
  const tags = new Map<string, Tag>();

  function build(plate: MapPlate): Tag {
    const root = document.createElement('button');
    root.type = 'button';
    root.className = 'tile-price';
    // The tag sits inside the viewport, and the viewport turns a pointer press
    // into a pan. Without this, buying a tile would also drag the camera — the
    // same guard the banners keep, and for the same reason.
    for (const event of ['pointerdown', 'pointerup'] as const) {
      root.addEventListener(event, (e) => e.stopPropagation());
    }
    const tag: Tag = { root, signature: '', plate };
    root.addEventListener('click', (e) => {
      e.stopPropagation();
      if (root.disabled) return;
      onPick(tag.plate);
    });
    // A greyed plate still reports its hover: the route preview under a partner
    // one turn out of range is exactly the picture that explains the refusal.
    if (onHover) {
      root.addEventListener('pointerenter', () => onHover(tag.plate));
      root.addEventListener('pointerleave', () => onHover(null));
    }
    container.append(root);
    return tag;
  }

  function refresh(): void {
    // Positioning needs `projectCell`, which only the 3D renderer has. Under the
    // frozen 2D pipelines there is nowhere to put these, so there are none —
    // rather than a stack of unpositioned tags in the corner.
    const plates = renderer.projectCell === undefined ? [] : getPlates();

    const seen = new Set<string>();
    for (const plate of plates) {
      const key = keyOf(plate.col, plate.row);
      seen.add(key);
      let tag = tags.get(key);
      if (!tag) {
        tag = build(plate);
        tags.set(key, tag);
      }
      // The live plate, always: the click handler reads it through the tag, so
      // a rewritten offer on an unchanged hex is picked as the new offer even
      // when its face happens to read identically.
      tag.plate = plate;

      const signature = `${plate.text}|${plate.spoken}|${plate.disabled ? '1' : '0'}`;
      if (signature !== tag.signature) {
        tag.signature = signature;
        // Printed rather than typed: `setYieldText` swaps each glyph for the
        // drawn mark and the space after one is what gives it air (the lead
        // rule, `yieldMark.ts`).
        setYieldText(tag.root, plate.text);
        // Words only in the spoken form and in the tooltip: the platform builds
        // both out of a string, and a screen reader given the glyph reads its
        // Unicode name before the number it decorates. A refusal here is the
        // reducer's own sentence, which is what clicking the ground under the
        // tag would have answered with.
        tag.root.setAttribute('aria-label', plate.spoken);
        tag.root.title = plate.spoken;
        tag.root.classList.toggle('is-barred', plate.disabled);
        tag.root.disabled = plate.disabled;
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
      const point = project.call(renderer, tag.plate.col, tag.plate.row);
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

/**
 * The Buy Tiles supplier: `purchasableTiles` as plates.
 *
 * The *one* evaluator, exactly as before — the price on the plate is the price
 * the reducer charges and a hex the reducer would refuse wears the reducer's
 * own sentence. Nothing about the offer is decided here.
 */
export function createTilePriceTags(options: TilePriceTagsOptions): TilePriceTags {
  const { container, renderer, getGame, getCity, isActive, onBuy } = options;
  return createMapPlates({
    container,
    renderer,
    getPlates: () => {
      const city = getCity();
      if (!isActive() || !city) return [];
      return purchasableTiles(getGame().state, city).map((offer) => {
        const affordable = offer.error === null;
        return {
          col: offer.col,
          row: offer.row,
          // The coin then the figure. The mark leads here where the city
          // panel's `or 60💰` trails, because that tag is the end of a sentence
          // and this one is a plate with nothing around it — leading with the
          // coin is what says "money" before it says "sixty".
          text: `${YIELD_GLYPH.gold} ${offer.price}`,
          spoken: affordable ? `Buy this tile for ${offer.price} gold` : offer.error ?? '',
          disabled: !affordable,
        };
      });
    },
    onPick: (plate) => onBuy({ col: plate.col, row: plate.row }),
  });
}
