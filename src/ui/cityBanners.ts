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
 * The listener itself is *not* claimed here. There is one slot on the renderer
 * and, since the floating damage numbers arrived, more than one thing that
 * needs the beat — so `reposition` is exported and `main.ts`, which owns the
 * page, holds the slot and calls everybody who wants it.
 *
 * Two kinds of banner
 * -------------------
 * Your own cities are buttons: clicking one opens its panel. Everybody else's
 * are labels — name and size only, no production, no click.
 *
 * Three states, since fog of war
 * ------------------------------
 * The shape that was predicted here before M8 turned out to be right, and it
 * grew a third case rather than changing:
 *
 *   watched     a city on a tile the local seat can see. The banner it always
 *               had, read live from the city itself.
 *   remembered  a city on a tile the seat has *explored* and is not watching.
 *               The banner is drawn from `state.citySightings` — the name and
 *               the flag as they were when last seen — and marked stale, so a
 *               town that has since changed hands or been renamed says what the
 *               player actually knows rather than what is true. No size, and no
 *               production even on your own: a besieged city you cannot see is
 *               not a city you can report the queue of.
 *   unseen      no banner at all.
 *
 * Your own cities are always watched (a city sees its own centre), so the button
 * half of this is untouched by fog — which is the property that made it safe to
 * add the third state without rewriting the first two.
 */

import { cityYields, queueItemName, turnsToFill, queueItemCost } from '../sim/cities';
import type { Game } from '../sim/game';
import type { City } from '../sim/state';
import { type CitySighting, isExploredBy, isVisibleTo } from '../sim/visibility';
import type { MapView } from './mapView';

export interface CityBannersOptions {
  /** An element covering the viewport, above the canvas. */
  container: HTMLElement;
  renderer: MapView;
  getGame: () => Game;
  localPlayerId: () => number;
  /** Called when the player clicks one of their own banners. */
  onOpenCity: (cityId: number) => void;
  /**
   * The pointer moved onto a banner, or off one (`null`).
   *
   * A banner is DOM floating *above* its city, so the board's own hover picking
   * never sees it — the tile under the cursor is whatever is behind the label.
   * This is how "hovering a city" still means the city when the pointer is on
   * its name rather than on its ground.
   */
  onHoverCity?: (cityId: number | null) => void;
}

export interface CityBanners {
  /**
   * Re-reads the cities: adds and removes banners, and rewrites their text.
   * Call after anything that could change a city; this repositions them too.
   */
  refresh(): void;
  /**
   * Moves every banner to where its city is on screen. Runs per drawn frame.
   *
   * Exposed rather than self-registered, because the renderer has exactly one
   * frame-listener slot (see `MapView.setFrameListener`) and there is now more
   * than one thing that wants the beat — the banners and the floating damage
   * numbers. Composition belongs to whoever owns the page, so `main.ts` holds
   * the slot and calls both. One listener, one owner, no subscription system.
   */
  reposition(): void;
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

/**
 * What one banner should say, whoever it is about and however it is known.
 *
 * A single shape for the watched case and the remembered one, because the DOM
 * element is the same element: a city that slips out of sight must *become*
 * stale rather than being torn down and rebuilt somewhere else, or every banner
 * on a contested frontier would flicker as the fog breathed.
 */
interface BannerFacts {
  cityId: number;
  col: number;
  row: number;
  name: string;
  ownerId: number;
  /** Empty on a remembered city: population is not something memory keeps. */
  pop: string;
  production: string;
  mine: boolean;
  /** Drawn from `citySightings` rather than from the city itself. */
  stale: boolean;
}

export function createCityBanners(options: CityBannersOptions): CityBanners {
  const { container, renderer, getGame, localPlayerId, onOpenCity, onHoverCity } = options;
  const banners = new Map<number, Banner>();

  function build(cityId: number): Banner {
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
    // Enter/leave rather than over/out: these do not fire for movement between
    // the banner's own children, so hovering the name and then the production
    // line is one hover, not four events.
    root.addEventListener('pointerenter', () => onHoverCity?.(cityId));
    root.addEventListener('pointerleave', () => onHoverCity?.(null));
    container.append(root);
    return { root, name, pop, production, signature: '', col: 0, row: 0 };
  }

  /**
   * What a live, watched city's banner says.
   *
   * Production and its turn estimate are computed from the same functions the
   * city panel and the simulation use, so a banner can never promise a turn
   * count the panel disagrees with.
   */
  function watched(city: City, mine: boolean): BannerFacts {
    const facts: BannerFacts = {
      cityId: city.id,
      col: city.col,
      row: city.row,
      name: city.name,
      ownerId: city.ownerId,
      pop: `${city.population}`,
      production: '',
      mine,
      stale: false,
    };
    if (!mine) return facts;

    const item = city.queue[0];
    if (item) {
      const cost = queueItemCost(getGame().state, city.ownerId, item);
      const perTurn = cityYields(getGame().state, city).production;
      const turns =
        cost === null ? null : turnsToFill(cost - city.hammerBasket, perTurn);
      const suffix = turns === null ? '' : ` · ${turns}t`;
      facts.production = `${queueItemName(item)}${suffix}`;
    } else {
      facts.production = 'idle';
    }
    return facts;
  }

  /**
   * What a remembered city's banner says: its name and its flag as they were,
   * and nothing else.
   *
   * No population and no production even on your own city, because neither is a
   * thing a chart remembers — a size on a banner over ground nobody is watching
   * would be the interface quoting a number twenty turns stale as though it were
   * current. The name and the flag are exactly what a paper map keeps.
   */
  function remembered(sighting: CitySighting, mine: boolean): BannerFacts {
    return {
      cityId: sighting.cityId,
      col: sighting.col,
      row: sighting.row,
      name: sighting.name,
      ownerId: sighting.ownerId,
      pop: '',
      production: '',
      mine,
      stale: true,
    };
  }

  /**
   * Every banner that should be on screen, in `state.cities` order.
   *
   * The rule per city is one of three (see the module docblock), and it is asked
   * of the simulation's own visibility rather than re-derived here: a banner that
   * disagreed with the board about whether a town is in sight would be the one
   * element on the page contradicting the diorama under it.
   */
  function visibleBanners(): BannerFacts[] {
    const { state } = getGame();
    const seat = localPlayerId();
    const facts: BannerFacts[] = [];
    const shown = new Set<number>();

    for (const city of state.cities) {
      if (!isVisibleTo(state, seat, city.col, city.row)) continue;
      shown.add(city.id);
      facts.push(watched(city, city.ownerId === seat));
    }
    for (const sighting of state.citySightings[seat] ?? []) {
      if (shown.has(sighting.cityId)) continue;
      // A memory of a site the seat has never explored is not reachable — the
      // sighting was recorded by looking at it — but a hand-edited save could
      // hold one, and a banner floating over Terra Incognita would be the fog
      // leaking through the one surface that is meant to respect it.
      if (!isExploredBy(state, seat, sighting.col, sighting.row)) continue;
      facts.push(remembered(sighting, sighting.ownerId === seat));
    }
    return facts;
  }

  function refresh(): void {
    // Positioning a banner needs `projectCell`, which only the 3D renderer has.
    // Under the frozen 2D pipelines there is nowhere to put these, so there are
    // none — rather than a stack of unpositioned labels in the top-left corner.
    if (!renderer.projectCell) return;

    const { state } = getGame();
    const seen = new Set<number>();

    for (const facts of visibleBanners()) {
      seen.add(facts.cityId);
      let banner = banners.get(facts.cityId);
      if (!banner) {
        banner = build(facts.cityId);
        banners.set(facts.cityId, banner);
      }
      banner.col = facts.col;
      banner.row = facts.row;

      const player = state.players[facts.ownerId];
      banner.root.classList.toggle('is-mine', facts.mine);
      // The stale class is what dims it. A separate class rather than a second
      // colour, so the styling of "remembered" is one rule in the stylesheet and
      // applies to the name, the flag rim and the whole card at once.
      banner.root.classList.toggle('is-stale', facts.stale);
      banner.root.style.setProperty('--banner-color', player?.color ?? '#9fb0c2');

      const signature = `${facts.pop}|${facts.name}|${facts.production}|${facts.stale ? 1 : 0}`;
      if (signature !== banner.signature) {
        banner.signature = signature;
        banner.pop.textContent = facts.pop;
        banner.pop.hidden = facts.pop === '';
        banner.name.textContent = facts.name;
        banner.production.textContent = facts.production;
        banner.production.hidden = facts.production === '';
      }

      // Rebound every refresh: the seat can change under a banner, and a label
      // that used to be yours must stop being a button. A remembered city is
      // never a button either — there is no panel to open on a memory.
      banner.root.onclick =
        facts.mine && !facts.stale ? () => onOpenCity(facts.cityId) : null;
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

  refresh();

  return {
    refresh,
    reposition,
    dispose(): void {
      for (const banner of banners.values()) banner.root.remove();
      banners.clear();
    },
  };
}
