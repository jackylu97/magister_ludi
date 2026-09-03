/**
 * The city labels floating over the board: name, size, when it grows, and what
 * is being built.
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
 * The growth ring
 * ---------------
 * The Civ staple, and the user's ruling of 2026-09-03 (`docs/flags.md`, "Batch:
 * city banner growth countdown", look re-ruled the same day): a town shows how
 * close its next citizen is as a **circular bar around the size figure** it
 * already prints. No icon and no second figure — the ring is drawn on the badge
 * that was already there, so the banner gains a reading and not a chip.
 *
 * Two arcs, and they are two different tenses:
 *
 *   the fill    the basket against the threshold — *what has been banked*, a
 *               fact about now, in the lifted food green.
 *   the ahead   what this turn's surplus would add on top of it, in the same
 *               green at low opacity — *what the next resolution does*, drawn
 *               beyond the fill and clamped at the rim, because a ring that
 *               wrapped would say a town is further from growing than it is.
 *
 * Three states fall out of the two arcs and one colour:
 *
 *   growing    both arcs, green. The pale one is the step the town takes when
 *              End Turn lands.
 *   stalled    the fill alone: nothing is being banked (a settler at the front
 *              of the queue, or a happiness deficit at the bottom of the
 *              ladder), so there is no step to draw. The ring simply stops.
 *   starving   the fill in the alarm ink, and no pale arc — the basket is
 *              *falling*, which is not a slower version of stalled but the
 *              opposite direction, and the one state on this banner worth
 *              flinching at.
 *
 * The turn count did not go away, it moved off the glass: `GrowthRing.label`
 * carries "grows in 3 turns" / "growth stalled" / "starving" as the badge's
 * tooltip and its accessible name. A ring is a *glance*, and the exact figure is
 * one hover (or one screen reader) away — which is also why the ring is drawn
 * with no text of its own to read out.
 *
 * It is your own cities' ring and nobody else's, which is production's rule
 * rather than the size's, and for production's reason: a rival's countdown is
 * that empire's food surplus read off tiles this seat cannot see, and a banner
 * is not a place to hand one seat another's ledger. The size on a rival's
 * banner is a thing you can *count* by looking; the turn to its next citizen is
 * not.
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
 *
 * The open city has no banner
 * ----------------------------
 * While a city's screen is open, that city's own banner is missing — its name
 * already lives in the panel, and a label floating over the same ground the
 * panel is about would be the interface saying it twice, right where the panel
 * blocks the yield pips on the tiles just north of it.
 *
 * `hiddenCityId` (read from `CityBannersOptions.openCity` every `refresh()`,
 * never pushed in as an event) is the whole of that rule: whichever city that
 * returns is left out of the list built for this frame, full stop. Nothing
 * here asks *why* a screen is closed, so every way one closes — Escape, a
 * click-out, picking up a unit, the End Turn blocker landing on a different
 * city, a seat change, the city itself being captured or destroyed, a load or
 * a new game — brings the banner back for free the next time `refresh()` runs,
 * because the derived value simply stops naming it. An imperative
 * hide()/show() pair would have to be called from every one of those paths and
 * would drift the day a new one was added; a value re-read from the source of
 * truth cannot.
 */

import {
  growthSurplus,
  growthThreshold,
  queueItemName,
  turnsToBuild,
  turnsToFill,
} from '../sim/cities';
import type { Game } from '../sim/game';
import type { City, GameState } from '../sim/state';
import { type CitySighting, isExploredBy, isVisibleTo } from '../sim/visibility';
import { cityDisplayName } from './cityDisplay';
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
   * The city whose screen is open, or `null`.
   *
   * Read fresh at the top of every `refresh()` — see the module docblock's
   * "The open city has no banner" — rather than told imperatively, so this
   * module never has to special-case any of the ways a city screen closes.
   */
  openCity: () => City | null;
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
  /** The badge and its ring, one box: what carries the growth tooltip. */
  size: HTMLElement;
  pop: HTMLElement;
  ring: RingParts;
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
  /**
   * When the next citizen arrives, or `null` on a banner that has no business
   * saying — a rival's, and a memory of your own. See "The growth ring".
   */
  growth: GrowthRing | null;
  production: string;
  mine: boolean;
  /** Drawn from `citySightings` rather than from the city itself. */
  stale: boolean;
}

/**
 * The ring's own geometry, in the units of its `viewBox`.
 *
 * Here rather than in the stylesheet because the arcs are *drawn* from it — a
 * dash length is a fraction of the circumference, so JavaScript has to know the
 * radius — and a second copy in CSS is how a ring ends up with its stroke on a
 * different circle than its dashes were cut for. The stylesheet keeps the inks
 * and nothing else.
 *
 * The box is a hair wider than the size badge inside it (see
 * `.city-banner-size`), so the ring stands clear of the badge's rim rather than
 * doubling it. Exported for the one thing no assertion about either half alone
 * can catch: that the badge still *fits* inside the ring drawn around it.
 */
export const RING = { box: 26, radius: 11.5, width: 2.5 } as const;

/** The circumference the two dash patterns are cut from. */
const RING_CIRCUMFERENCE = 2 * Math.PI * RING.radius;

/** What a banner says about a town's next citizen. See "The growth ring". */
export interface GrowthRing {
  /** 0…1 of the circle: the basket against the threshold, banked. */
  filled: number;
  /** 0…1 of the circle beyond `filled`: what this turn adds. Zero when nothing is. */
  ahead: number;
  /** The one state that takes the alarm ink. */
  starving: boolean;
  /** The turn count in plain words, for the tooltip and the screen reader. */
  label: string;
}

/**
 * The ring from what a town has banked, what it banks this turn and what it
 * owes: the arithmetic half, with no state and no DOM in it.
 *
 * Split from `cityGrowthRing` for `visibleCityBanners`' reason — the three
 * states are the part that can be quietly wrong on every banner at once, and
 * this way each of them is one assertion rather than a manufactured empire.
 *
 * Two rules do the work, and both are about not lying at the rim:
 *
 *   · **the ahead arc is clamped, not wrapped.** A town one turn from growing
 *     often banks more than it owes; drawn honestly that arc would run past
 *     twelve o'clock and start again, which reads as *further away*. It stops
 *     at the rim, and the tooltip says `Grows next turn`.
 *   · **a deficit draws no ahead arc at all.** There is no step forward to
 *     draw. The fill turns vermilion instead, which is the whole of the alarm.
 *
 * `turnsToFill` is the sim's own estimate and is asked rather than divided here,
 * exactly as the city panel's Growth line asks it: a ring promising a turn count
 * the panel disagrees with is worse than a ring with no count behind it. Its two
 * honest answers do the work — `0` when the basket already covers the threshold
 * (the citizen lands at the next resolution, whatever the surplus is doing),
 * `null` when nothing is being banked.
 */
export function growthRing(surplus: number, basket: number, threshold: number): GrowthRing {
  // A threshold of nothing is not reachable through `growthThreshold`, but a
  // hand-edited save is a thing and a division by zero would paint `NaN` dashes
  // — which SVG renders as no ring at all, silently, on every town.
  const filled = threshold <= 0 ? 1 : clamp01(basket / threshold);
  if (surplus < 0) return { filled, ahead: 0, starving: true, label: 'Starving' };
  const reached = threshold <= 0 ? 1 : clamp01((basket + surplus) / threshold);
  return {
    filled,
    ahead: Math.max(0, reached - filled),
    starving: false,
    label: growthWords(turnsToFill(threshold - basket, surplus)),
  };
}

/** A fraction of the circle: nothing before the start, nothing past the rim. */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The countdown's words as the second clause of a sentence.
 *
 * `GrowthRing.label` is written as a line on its own — it is a tooltip, and a
 * tooltip is a sentence — so the badge's accessible name, which reads "Size 4 ·
 * grows in 3 turns", lowers its first letter rather than keeping a second
 * capital mid-line. One helper so the two readings cannot drift.
 */
function lower(words: string): string {
  return words.charAt(0).toLowerCase() + words.slice(1);
}

/** The countdown spoken: what the tooltip and the screen reader get. */
function growthWords(turns: number | null): string {
  if (turns === null) return 'Growth stalled';
  if (turns === 0) return 'Grows next turn';
  return `Grows in ${turns} ${turns === 1 ? 'turn' : 'turns'}`;
}

/**
 * One town's ring, read off the simulation.
 *
 * `growthSurplus` and not the subtraction, for the city panel's stated reason:
 * what a town banks is its harvest less what its citizens eat, less a settler at
 * the front of the queue, less whatever a happiness deficit takes — and the ring
 * must show the step the basket will actually take.
 */
export function cityGrowthRing(state: GameState, city: City): GrowthRing {
  return growthRing(
    growthSurplus(state, city),
    city.foodBasket,
    growthThreshold(city.population),
  );
}

/**
 * What a live, watched city's banner says.
 *
 * Production and its turn estimate are computed from the same functions the
 * city panel and the simulation use, so a banner can never promise a turn
 * count the panel disagrees with.
 */
function watchedFacts(state: GameState, city: City, mine: boolean): BannerFacts {
  const facts: BannerFacts = {
    cityId: city.id,
    col: city.col,
    row: city.row,
    name: cityDisplayName(state, city),
    ownerId: city.ownerId,
    pop: `${city.population}`,
    growth: null,
    production: '',
    mine,
    stale: false,
  };
  if (!mine) return facts;

  // Yours only, on the far side of the `mine` gate it shares with production —
  // see "The growth ring".
  facts.growth = cityGrowthRing(state, city);
  const item = city.queue[0];
  if (item) {
    // `turnsToBuild` at the front of the queue rather than the subtraction
    // spelled out here: it is the same arithmetic every other estimate in the
    // interface reads, and since the Age I rework it also knows that a
    // barracks fills the basket faster while a unit is at the front.
    const turns = turnsToBuild(state, city, item, 0);
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
 * No population, no growth and no production even on your own city, because
 * none of the three is a thing a chart remembers — a size on a banner over
 * ground nobody is watching would be the interface quoting a number twenty
 * turns stale as though it were current, and a countdown there would be worse:
 * it would be counting. The name and the flag are exactly what a paper map
 * keeps.
 */
function rememberedFacts(state: GameState, sighting: CitySighting, mine: boolean): BannerFacts {
  return {
    cityId: sighting.cityId,
    col: sighting.col,
    row: sighting.row,
    // Checked against the *current* capital (see `cityDisplayName`), not the
    // sighting's own stale facts: the palace is live state, so a remembered
    // town still gets a true star, never a stale one.
    name: cityDisplayName(state, {
      id: sighting.cityId,
      ownerId: sighting.ownerId,
      name: sighting.name,
    }),
    ownerId: sighting.ownerId,
    pop: '',
    growth: null,
    production: '',
    mine,
    stale: true,
  };
}

/**
 * Every banner that should be on screen: the rule per city is one of three
 * (see the module docblock's "Three states"), asked of the simulation's own
 * visibility rather than re-derived here, plus the one further exclusion —
 * `hiddenCityId`'s banner is left out no matter which of the three it would
 * otherwise be, because its name is on a panel instead (see "The open city
 * has no banner").
 *
 * Exported and pure — `state`, `seat` and `hiddenCityId` are plain arguments
 * rather than closures — so the derivation can be pinned by a test with no
 * renderer, no `container`, and no DOM.
 */
export function visibleCityBanners(
  state: GameState,
  seat: number,
  hiddenCityId: number | null,
): BannerFacts[] {
  const facts: BannerFacts[] = [];
  const shown = new Set<number>();

  for (const city of state.cities) {
    if (!isVisibleTo(state, seat, city.col, city.row)) continue;
    shown.add(city.id);
    if (city.id === hiddenCityId) continue;
    facts.push(watchedFacts(state, city, city.ownerId === seat));
  }
  for (const sighting of state.citySightings[seat] ?? []) {
    if (shown.has(sighting.cityId)) continue;
    // A memory of a site the seat has never explored is not reachable — the
    // sighting was recorded by looking at it — but a hand-edited save could
    // hold one, and a banner floating over Terra Incognita would be the fog
    // leaking through the one surface that is meant to respect it.
    if (!isExploredBy(state, seat, sighting.col, sighting.row)) continue;
    facts.push(rememberedFacts(state, sighting, sighting.ownerId === seat));
  }
  return facts;
}

/** The three circles of one ring, kept so a repaint is two attribute writes. */
interface RingParts {
  svg: SVGSVGElement;
  ahead: SVGCircleElement;
  fill: SVGCircleElement;
}

/**
 * The ring as elements: a track, the pale arc, the banked arc — in that order,
 * so the fill is painted last and a rounding overlap never eats into it.
 *
 * SVG rather than a conic gradient, for two reasons that both come from what
 * this has to do: an arc that *starts* partway round the circle (the pale one
 * begins where the fill ends) is one `stroke-dashoffset` here and a hand-built
 * multi-stop gradient string there, and a stroked circle is antialiased on a
 * curve while a conic gradient's edges stair-step at this size.
 *
 * Built once per banner and never rebuilt: a repaint writes dash lengths onto
 * the two circles, which is the same discipline the text half of this module
 * has always kept.
 */
function buildRing(): RingParts {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'city-banner-ring');
  svg.setAttribute('viewBox', `0 0 ${RING.box} ${RING.box}`);
  // Decoration: the words it stands for are the badge's accessible name, and a
  // reader that announced the drawing too would say the town twice.
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const circle = (role: string): SVGCircleElement => {
    const node = document.createElementNS(NS, 'circle');
    node.setAttribute('class', `city-banner-ring-${role}`);
    node.setAttribute('cx', `${RING.box / 2}`);
    node.setAttribute('cy', `${RING.box / 2}`);
    node.setAttribute('r', `${RING.radius}`);
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke-width', `${RING.width}`);
    return node;
  };

  const track = circle('track');
  const ahead = circle('ahead');
  const fill = circle('fill');
  svg.append(track, ahead, fill);
  return { svg, ahead, fill };
}

/**
 * Paints one arc: `span` of the circle, starting `from` (both 0…1).
 *
 * A dash pattern of "as much as the arc, then the whole circle" leaves exactly
 * one run of ink; a negative offset walks its start round to where the previous
 * arc stopped. Rounded to a hundredth of a unit, because a dash length carried
 * to the fifteenth decimal place is a longer attribute string than the whole
 * element and moves nothing.
 */
function paintArc(circle: SVGCircleElement, span: number, from: number): void {
  const length = span * RING_CIRCUMFERENCE;
  circle.setAttribute('stroke-dasharray', `${length.toFixed(2)} ${RING_CIRCUMFERENCE.toFixed(2)}`);
  circle.setAttribute('stroke-dashoffset', `${(-from * RING_CIRCUMFERENCE).toFixed(2)}`);
}

export function createCityBanners(options: CityBannersOptions): CityBanners {
  const { container, renderer, getGame, localPlayerId, onOpenCity, openCity, onHoverCity } =
    options;
  const banners = new Map<number, Banner>();

  function build(cityId: number): Banner {
    const root = document.createElement('div');
    root.className = 'city-banner';

    const name = document.createElement('span');
    name.className = 'city-banner-name';
    const pop = document.createElement('span');
    pop.className = 'city-banner-pop';
    // The badge and the ring share one box and one centre — the ring is *about*
    // the size figure, so it is drawn on it rather than beside it.
    const size = document.createElement('span');
    size.className = 'city-banner-size';
    const ring = buildRing();
    size.append(ring.svg, pop);
    const production = document.createElement('span');
    production.className = 'city-banner-production';

    root.append(size, name, production);
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
    return {
      root,
      name,
      size,
      pop,
      ring,
      production,
      signature: '',
      col: 0,
      row: 0,
    };
  }

  /**
   * Every banner that should be on screen this frame: `visibleCityBanners`
   * plus the two live reads it takes as plain arguments, so the pure
   * derivation stays testable without either of them.
   */
  function visibleBanners(): BannerFacts[] {
    const { state } = getGame();
    return visibleCityBanners(state, localPlayerId(), openCity()?.id ?? null);
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

      // The alarm ink is a class and is toggled outside the signature gate,
      // beside the other two: a class costs nothing to re-apply and a flag that
      // only *sometimes* took part in the signature is exactly how a starving
      // town keeps its calm colour until its arc happens to move.
      banner.size.classList.toggle('is-bad', facts.growth?.starving === true);

      const growth = facts.growth;
      // **The ring's two arcs are signature terms**, at the precision a dash is
      // actually cut to (`paintArc` rounds a length to the hundredth of a unit,
      // which is about the fourth decimal of a fraction) rather than raw: the
      // module's rule is that a banner is rewritten when what it says changes,
      // and a basket filling is a thing it says. Without them a town's ring
      // would sit still until its name, size or queue happened to move.
      const arcs = growth === null ? '' : `${growth.filled.toFixed(4)}/${growth.ahead.toFixed(4)}`;
      const signature = `${facts.pop}|${arcs}|${growth?.label ?? ''}|${facts.name}|${
        facts.production
      }|${facts.stale ? 1 : 0}`;
      if (signature !== banner.signature) {
        banner.signature = signature;
        banner.pop.textContent = facts.pop;
        banner.pop.hidden = facts.pop === '';
        // A memory keeps neither figure, so the whole box goes rather than
        // leaving the banner with a hole where a badge used to be. Hidden with
        // `display` and not the attribute, because the rules below give this
        // box a `display` of its own and an author rule outranks `[hidden]`.
        banner.size.style.display = facts.pop === '' && growth === null ? 'none' : '';
        // The words the ring stands for, on the box that holds it: the drawing
        // is `aria-hidden` and a bare size figure read aloud says nothing about
        // growth. `role="img"` is what makes a label on a span reliably the
        // element's accessible *name* rather than a hint some readers drop.
        if (growth) {
          banner.size.title = growth.label;
          banner.size.setAttribute('role', 'img');
          banner.size.setAttribute('aria-label', `Size ${facts.pop} · ${lower(growth.label)}`);
        } else {
          banner.size.removeAttribute('title');
          banner.size.removeAttribute('role');
          banner.size.removeAttribute('aria-label');
        }
        // The pale arc starts where the banked one stops, which is the whole of
        // "what this turn adds *on top of* what is already in".
        paintArc(banner.ring.fill, growth?.filled ?? 0, 0);
        paintArc(banner.ring.ahead, growth?.ahead ?? 0, growth?.filled ?? 0);
        banner.ring.svg.style.display = growth === null ? 'none' : '';
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
