/**
 * The city labels floating over the board: name, size, and what is being built.
 *
 * DOM elements rather than geometry, and the reasons are the ones that always
 * decide this: text in WebGL means a font atlas, a texture upload per string and
 * a draw call per label, while a `<div>` is crisp at every zoom, respects the
 * user's font size, and can be clicked. The board is a diorama; the labels are
 * an interface *over* it, and they are allowed to look like one.
 *
 * Positioning
 * -----------
 * Each banner is absolutely positioned from `renderer.projectCell`, which is the
 * inverse of picking, and is repositioned by the renderer's frame listener —
 * never by a loop of its own. That is the whole trick that keeps this compatible
 * with render-on-demand: if the camera did not move, no frame was drawn, the
 * listener did not fire, and nothing here ran. A banner off the edge of the
 * viewport is hidden rather than left to stretch the page.
 *
 * Two kinds of banner
 * -------------------
 * Your own cities are buttons: clicking one opens its panel. Everybody else's
 * are labels — name and size only, no production, no click. There is no fog of
 * war yet, so an enemy banner is visible whether it should be or not; showing
 * *less* on it is the honest version of that, and it is the shape the code will
 * already be in when fog arrives.
 */

import { cityYields, queueItemName, turnsToFill, queueItemCost } from '../sim/cities';
import type { Game } from '../sim/game';
import type { City } from '../sim/state';
import type { MapView } from './mapView';

export interface CityBannersOptions {
  /** An element covering the viewport, above the canvas. */
  container: HTMLElement;
  renderer: MapView;
  getGame: () => Game;
  localPlayerId: () => number;
  /** Called when the player clicks one of their own banners. */
  onOpenCity: (cityId: number) => void;
}

export interface CityBanners {
  /**
   * Re-reads the cities: adds and removes banners, and rewrites their text.
   * Call after anything that could change a city; positioning looks after
   * itself.
   */
  refresh(): void;
  dispose(): void;
}

interface Banner {
  root: HTMLElement;
  name: HTMLElement;
  pop: HTMLElement;
  production: HTMLElement;
  /** Last text written, so an unchanged banner is not rewritten every frame. */
  signature: string;
  col: number;
  row: number;
}

export function createCityBanners(options: CityBannersOptions): CityBanners {
  const { container, renderer, getGame, localPlayerId, onOpenCity } = options;
  const banners = new Map<number, Banner>();

  function build(city: City): Banner {
    const root = document.createElement('div');
    root.className = 'city-banner';

    const name = document.createElement('span');
    name.className = 'city-banner-name';
    const pop = document.createElement('span');
    pop.className = 'city-banner-pop';
    const production = document.createElement('span');
    production.className = 'city-banner-production';

    root.append(pop, name, production);
    // The banner sits inside the viewport, and the viewport turns a pointer
    // press into a pan or a move order. Without this, clicking a banner would
    // also send the selected unit to whichever tile happened to be under the
    // cursor — which is never the city's, because the banner floats above it.
    for (const event of ['pointerdown', 'pointerup'] as const) {
      root.addEventListener(event, (e) => e.stopPropagation());
    }
    container.append(root);
    return { root, name, pop, production, signature: '', col: city.col, row: city.row };
  }

  /**
   * What a banner says. Production and its turn estimate are computed from the
   * same functions the city panel and the simulation use, so a banner can never
   * promise a turn count the panel disagrees with.
   */
  function describe(city: City, mine: boolean): { text: string[]; signature: string } {
    const label = [`${city.population}`, city.name, ''];
    if (!mine) return { text: label, signature: label.join('|') };

    const item = city.queue[0];
    if (item) {
      const cost = queueItemCost(item);
      const perTurn = cityYields(getGame().state, city).production;
      const turns =
        cost === null ? null : turnsToFill(cost - city.hammerBasket, perTurn);
      const suffix = turns === null ? '' : ` ${turns}t`;
      label[2] = `${queueItemName(item)}${suffix}`;
    } else {
      label[2] = 'idle';
    }
    return { text: label, signature: label.join('|') };
  }

  function refresh(): void {
    // Positioning a banner needs `projectCell`, which only the 3D renderer has.
    // Under the frozen 2D pipelines there is nowhere to put these, so there are
    // none — rather than a stack of unpositioned labels in the top-left corner.
    if (!renderer.projectCell) return;

    const { state } = getGame();
    const seen = new Set<number>();

    for (const city of state.cities) {
      seen.add(city.id);
      let banner = banners.get(city.id);
      if (!banner) {
        banner = build(city);
        banners.set(city.id, banner);
      }
      banner.col = city.col;
      banner.row = city.row;

      const mine = city.ownerId === localPlayerId();
      const player = state.players[city.ownerId];
      banner.root.classList.toggle('is-mine', mine);
      banner.root.style.setProperty('--banner-color', player?.color ?? '#9fb0c2');

      const described = describe(city, mine);
      if (described.signature !== banner.signature) {
        banner.signature = described.signature;
        banner.pop.textContent = described.text[0]!;
        banner.name.textContent = described.text[1]!;
        banner.production.textContent = described.text[2]!;
        banner.production.hidden = described.text[2] === '';
      }

      // Rebound every refresh: the seat can change under a banner, and a label
      // that used to be yours must stop being a button.
      banner.root.onclick = mine ? () => onOpenCity(city.id) : null;
    }

    for (const [id, banner] of [...banners]) {
      if (seen.has(id)) continue;
      banner.root.remove();
      banners.delete(id);
    }
    reposition();
  }

  /** Moves every banner to where its city is on screen. Runs per drawn frame. */
  function reposition(): void {
    if (!renderer.projectCell) return;
    for (const banner of banners.values()) {
      const point = renderer.projectCell(banner.col, banner.row);
      if (!point || !point.onScreen) {
        banner.root.style.display = 'none';
        continue;
      }
      banner.root.style.display = '';
      // Rounded to whole pixels: a banner on a half pixel is a blurry banner,
      // and the board moves far enough per frame that nobody sees the snap.
      banner.root.style.transform = `translate(-50%, -100%) translate(${Math.round(
        point.x,
      )}px, ${Math.round(point.y)}px)`;
    }
  }

  renderer.setFrameListener?.(reposition);
  refresh();

  return {
    refresh,
    dispose(): void {
      renderer.setFrameListener?.(null);
      for (const banner of banners.values()) banner.root.remove();
      banners.clear();
    },
  };
}
