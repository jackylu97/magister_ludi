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
 * The wound on the foot
 * ---------------------
 * The user, 2026-09-07 (`docs/flags.md`, "In flight right now", item ii): "we
 * need an hp bar for cities, maybe it can be integrated with the city banner".
 * It is integrated, and the whole of the design is that **a whole town has no
 * bar at all** — the piece's own rule (`hpBarFill` in `render3d/pieces.ts`
 * returns `null` at full health), taken as read rather than re-argued: a full
 * bar over every town on the map is forty pieces of furniture saying nothing,
 * and the reading a player needs is *which* of their towns is hurt, from across
 * the board, without opening one.
 *
 * Where it is drawn, precisely, so it can be judged on `flair.html`:
 *
 *   · a **channel** absolutely positioned inside the banner pill, on its foot —
 *     `bottom: 2px`, three pixels tall, rounded like the pill. It starts to the
 *     right of the size badge (`left: 33px`) rather than at the pill's left
 *     edge, because the badge is a 26px roundel in a 32px box and a bar run
 *     under it would cut across the seat's own tincture; it ends 11px short of
 *     the right edge, which is what clears the pill's 999px cap at that height.
 *     So the bar is a rule under the *name and the queue*, inside the plate,
 *     which is what "integrated with the banner" has to mean on a pill.
 *   · the channel's ground is parchment at a whisper — the growth ring's track
 *     ink exactly. The specimen's ink-outlined channel is for parchment ground;
 *     the banner's ground is ink, and an ink rim on ink is not a channel, it is
 *     nothing. One convention on this surface, and the ring already set it.
 *   · the fill is `hp / cityMaxHp` of the channel, in the **alarm ink** and only
 *     that ink. The board's bar carries a second, calmer colour above half
 *     because it is drawn on every hurt piece in a battle line and has to sort
 *     them; a banner shows one town, and the two other things on this pill that
 *     can change colour (the ring's green, the ring's alarm) are about food. A
 *     third hue here would be a third quantity to learn. Present-and-vermilion
 *     is the reading: this town is hurt.
 *   · the fill never draws as nothing (`min-width` in the stylesheet). That is
 *     `hpBarFillWidth`'s rule and its reason, one surface over: a town at the
 *     floor is a town that still stands, and an empty channel over a live city
 *     reads as a razed one.
 *
 * **Walls are not a second bar**, and that is the sim's ruling rather than a
 * layout choice: a town has one pool of hit points and its walls are *in* it
 * (`explainCityMaxHp` folds `combat.cityBaseHp` plus every `BuildingDef.cityHp`
 * into one figure). So a palisade lengthens the bar rather than adding a
 * segment to it, and the one state the three beats turn on — `cityBeatenDown`,
 * the floor a besieger cannot push past — is the bar sitting on its minimum. It
 * is said in words rather than drawn a second time: the hover reads "Walls down
 * · 1/115 hp" there and "84/115 hp" everywhere else, the same figures in the
 * same order as the city panel's own chip, so the glance and the panel cannot
 * disagree.
 *
 * The siege badge stays on the panel. A besieged town is a *condition* and the
 * bar is a *quantity*; the panel names the condition in a sentence, and a second
 * badge on a pill that already carries a roundel, a ring, a name and a queue is
 * the chip the growth ruling refused.
 *
 * Whose banners carry one: **every watched town, yours and theirs**, which is
 * the size figure's rule and not the ring's. A rival's countdown is that
 * empire's food ledger read off tiles this seat cannot see; a rival's hit points
 * are a fact about a thing this seat is looking at, and the board already draws
 * exactly that bar over every hurt *piece* on the map whoever owns it. A
 * remembered town has none at all — memory keeps a name and a flag (see
 * `rememberedFacts`), and hit points twenty turns stale would be the worst
 * number on this surface to quote as current.
 *
 * The garrison slot
 * -----------------
 * The user, 2026-09-09 (`docs/flags.md`, (hhh) 6): *"units stationed in a city
 * should have their unit icon display on top of the banner"* — Civ 5 and 6's
 * pattern, and the one thing a player wants to know about a town across the
 * table is **whether anything is holding it**.
 *
 * U4 built that as a drawn mark floating over the 3D flagpole
 * (`render3d/garrison3d.ts`) and the user could not see it, for a reason that is
 * structural rather than a matter of dialling: *this* plate is HTML positioned
 * over the canvas, it covers the town's own hex, and a badge hung at the pole's
 * height is behind it. The piece's own sculpt is behind it too. So the badge
 * came **into the plate**, the 3D layer was retired, and there is one badge in
 * one place — which is what Civ draws, and for this reason.
 *
 * U5 set it at the pill's **fly**, after the queue, at a disc of twenty pixels,
 * and the user could still not spot it (2026-09-09, `docs/flags.md` (hhh) 6
 * again): the fly is the end of a pill whose length is the town's name, so the
 * one mark on the plate that answers "is anything holding this" sat wherever the
 * name happened to stop, at two thirds the size of the figure beside it. U6 puts
 * it where Civ V has always had it — **the hoist**, immediately after the size
 * roundel and before the name, on the size badge's own box — so the plate opens
 * with two discs of the same diameter: how big the town is, and what is standing
 * in it. The wound on the foot follows: its *left* inset clears both now, where
 * U5 had moved the right one to clear the fly.
 *
 * Three consequences, and all three are the same idea — **the banner's icon is
 * the piece**:
 *
 *   it is a control  a press on your own piece's icon selects that piece, by the
 *                    tile it stands on and not by the badge that was struck
 *                    (`selectOnTile` in `controls.ts`, the board badge's own
 *                    path, so the pill and the tag cycle a stack the same way).
 *                    A rival's icon is not a control: it shows, it does nothing,
 *                    and the cursor says so — which is the `mine` rule this
 *                    banner has always kept for its buttons.
 *   the piece's own roundel goes  while the banner is carrying it. The *sculpt*
 *                    stays — the piece is still standing on the map — but its
 *                    floating tag would be a second copy of this one, hidden
 *                    behind this very plate, which is the whole of U5's
 *                    complaint. The rule lives with the layer that draws the tag
 *                    (`render3d/pieces.ts`, `banneredTownCells`) and follows
 *                    this gate exactly: a remembered town shows no garrison, so
 *                    a piece on one keeps its roundel.
 *   one badge, one place  the U4 ruling, now true in both directions.
 *
 * What it says, and what it deliberately does not:
 *
 *   one badge      the **strongest** piece standing on the town's own hex
 *                  (`strongestGarrison`) — highest `combatStrength`, ties by the
 *                  order `state.units` is iterated, which is the determinism
 *                  rule read at the surface. A civilian's zero still qualifies:
 *                  the question is *what is in there*, and a worker alone in a
 *                  town is the answer a player most needs, because it is the one
 *                  that means nobody is holding it. A scout, a settler, a
 *                  caravan and a great person all take the slot.
 *   a count        a small numeral bossing the roundel once more than one is in.
 *                  A stack of roundels on a pill is a wall of paper.
 *   the piece's ink, not the town's — a captured town whose captor has walked in
 *                  wears the captor's colour, and that is the whole reason to
 *                  draw one. Read off the *unit*, so a rival's garrison in a
 *                  rival's town shows in the rival's ink.
 *
 * Strongest rather than "the defender `planCombat` would pick", deliberately:
 * the real defender is a whole ledger (terrain, fortification, walls, auras) and
 * a badge that quietly disagreed with the combat forecast would be worse than
 * one that plainly answers a simpler question.
 *
 * It rides the **watched** gate and nothing else — not `mine`. An army is not
 * something a chart remembers, so a remembered town's plate carries no slot at
 * all (`rememberedFacts`), exactly as the size figure and the wound are absent
 * there; and a rival's garrison on ground this seat is looking at is a fact
 * about a thing it can see, which is the size figure's rule rather than the
 * ring's.
 *
 * The mark is the badge the piece's own roundel wears — `badgeClassFor`, the
 * board's one sentence about what a piece is — printed here as a **mask** in the
 * banner's ink on a parchment disc rimmed in the seat's colour, which is the
 * board's badge exactly (paper, ink, seat rim) and the yoke's trick beside it.
 * One drawing, two printers: `garrisonBadgeUri` names the same file the atlas
 * rasterises, and composes the same two marks for a ship that the atlas composes.
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
import { cityBeatenDown, cityMaxHp } from '../sim/combat';
import type { Game } from '../sim/game';
import { tileIndex } from '../sim/map';
import type { City, GameState, Unit } from '../sim/state';
import { unitDef } from '../sim/unitData';
import { type CitySighting, isExploredBy, isVisibleTo } from '../sim/visibility';
import { cityDisplayName } from './cityDisplay';
import { cityMarkDataUri } from '../art/cityMarks';
import {
  NAVAL_CANTON_MARKS,
  NAVAL_HULLS,
  NAVAL_MARK_BOX,
  NAVAL_MARK_STROKE,
} from '../art/navalMarks';
import { markSvg } from '../art/resourceMarks';
import { type BadgeClass, BADGE_ICON_FILES, BADGE_MARK_PAIRS } from '../render3d/badges3d';
import { badgeClassFor } from '../render3d/board3d';
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
  /**
   * The player pressed the garrison icon on a banner: select what is standing
   * on that town's hex.
   *
   * The **tile** rather than the unit, deliberately, and it is the board badge's
   * own rule read one surface over (`selectOnTile` in `controls.ts`): a stack is
   * cycled by repeated presses on the hex it stands on, so a plate that named a
   * unit id would hand the player a different cycling order than the tag over
   * the same pieces does.
   *
   * Only ever called for the local seat's own piece — see `garrisonSelectable`.
   */
  onSelectGarrison?: (col: number, row: number) => void;
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
  /**
   * The yoke beside the name, drawn iff this town is a puppet. One node, shown
   * and hidden — building it per banner and toggling `hidden` is what every
   * other part of this card does, and a node created on demand would be a
   * fourth lifecycle in a file that has three.
   */
  yoke: HTMLElement;
  /** The roundel at the pill's fly. See "The garrison slot". */
  garrison: GarrisonParts;
  /** The channel on the banner's foot. See "The wound on the foot". */
  health: HealthParts;
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
  /**
   * The wound on the banner's foot, or `null` for a town that is whole — and
   * for a remembered one, which keeps no figures at all. See "The wound on the
   * foot". Not behind the `mine` gate the ring and the queue sit behind: this
   * is the size figure's kind of fact, not the food ledger's.
   */
  health: HealthBar | null;
  /**
   * What is standing on the town's own hex, or `null` for a town nothing is in
   * — and for a remembered one, which keeps no armies. See "The garrison slot".
   *
   * Beside the health bar rather than behind the `mine` gate: a garrison on
   * ground this seat is watching is a fact about a thing it can see, and the
   * board already draws the piece itself over every visible hex whoever owns it.
   */
  garrison: GarrisonSlot | null;
  production: string;
  /**
   * True while this is **your** town and it is held as a puppet (`City.puppet`).
   *
   * The user's ruling of 2026-09-09, and the DOM half of it: the 3D banner flies
   * a yoke under the seat's charge (`CityLook.puppet`), and this is the same
   * mark beside the name, where the name actually is. "Which of my six towns are
   * puppets" is otherwise a question answered by opening six city panels.
   *
   * Behind the `mine` gate with the queue and the ring, not beside the health
   * bar: whether a rival's conquest has been annexed yet is a fact about the
   * inside of somebody else's empire, and this banner does not report those.
   */
  puppet: boolean;
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

/** What a banner says about a town's hurt. See "The wound on the foot". */
export interface HealthBar {
  /** 0…1 of the channel: the hit points still standing, against `cityMaxHp`. */
  filled: number;
  /**
   * The walls are down — `cityBeatenDown`, the floor a besieger cannot push a
   * town past and the predicate the three beats of an assault turn on. Not a
   * second drawing: it is what the hover's first clause says.
   */
  breached: boolean;
  /** The figures in plain words, for the tooltip and the screen reader. */
  label: string;
}

/**
 * The bar from a town's hit points against its maximum, or `null` for a town
 * with no bar to draw: the arithmetic half, with no state and no DOM in it.
 *
 * Split from `cityHealthBar` for `growthRing`'s reason exactly — the states are
 * the part that can be quietly wrong on every banner at once — and pure so the
 * gallery can drive it from a slider without a game running.
 *
 * `null` at full health is **the** rule of this bar and not an optimisation:
 * a banner at full health is the banner that shipped yesterday, and the reading
 * asked for is which towns are hurt. It is the piece's own rule (`hpBarFill`),
 * so a wounded town and a wounded warrior appear and disappear by one law.
 *
 * `breached` is passed in rather than derived from the two figures, because
 * "the walls are down" is a floor the simulation owns (`cityBeatenDown`) and a
 * banner that compared hit points against one of its own would be a second copy
 * of the rule the assault is resolved by.
 */
export function healthBar(hp: number, max: number, breached: boolean): HealthBar | null {
  // A maximum of nothing is not reachable through `cityMaxHp`, but a
  // hand-edited save is a thing and a division by zero paints a `NaN` width —
  // which the DOM resolves to no width at all, silently, on every hurt town.
  if (!(max > 0)) return null;
  const filled = clamp01(hp / max);
  if (filled >= 1) return null;
  // The panel's own chip, word for word (`renderBand`), so the glance and the
  // screen a click away cannot print the same town's toughness two ways. The
  // breach takes a clause in front of it rather than a colour of its own.
  const figures = `${hp}/${max} hp`;
  return { filled, breached, label: breached ? `Walls down · ${figures}` : figures };
}

/**
 * One town's bar, read off the simulation.
 *
 * `cityMaxHp` and not `combat.cityBaseHp`, which is the trap CLAUDE.md names:
 * a town's maximum is the base plus every wall it has built, and a bar measured
 * against the base would report a town with stone walls as wounded the day it
 * finished them.
 */
export function cityHealthBar(city: City): HealthBar | null {
  return healthBar(city.hp, cityMaxHp(city), cityBeatenDown(city));
}

// --- the garrison slot ------------------------------------------------------

/** What a banner says about what is standing in a town. See "The garrison slot". */
export interface GarrisonSlot {
  /** The badge cell the strongest piece wears — `badgeClassFor`'s answer. */
  badge: BadgeClass;
  /** Whose the *piece* is, which is not always whose the town is. */
  ownerId: number;
  /** How many are in. One draws no numeral. */
  count: number;
  /** The seat ink the roundel is rimmed in — the piece's owner's. */
  ink: string;
  /** What is in there, in plain words, for the tooltip and the screen reader. */
  label: string;
}

/**
 * Every unit standing on a town's own hex, by the tile that town stands on.
 *
 * One walk over the pieces rather than one walk per city, for `tileOwnerField`'s
 * reason a layer down: a map-wide question asked once per town is quadratic on
 * the boards this interface is meant to survive. Hoisted once per `refresh` and
 * handed to `watchedFacts`, exactly as a sweep hoists a field.
 */
export function garrisonsByCell(state: GameState): Map<number, Unit[]> {
  const towns = new Set<number>();
  for (const city of state.cities) towns.add(tileIndex(state.map, city.col, city.row));
  const out = new Map<number, Unit[]>();
  for (const unit of state.units) {
    const cell = tileIndex(state.map, unit.col, unit.row);
    if (!towns.has(cell)) continue;
    const list = out.get(cell);
    if (list) list.push(unit);
    else out.set(cell, [unit]);
  }
  return out;
}

/**
 * Which piece the badge names: the strongest thing standing there.
 *
 * `state.units` order is the tie-break, which is the determinism rule read at
 * the surface — an array, never a map, and never a sort that could reorder two
 * equal rows differently on two clients. A civilian's strength of nothing still
 * wins an empty field, and that is the case this slot exists for: a town held by
 * one worker is a town nobody is holding.
 */
export function strongestGarrison(garrison: readonly Unit[]): Unit | null {
  let best: Unit | null = null;
  let bestStrength = -1;
  for (const unit of garrison) {
    const strength = unitDef(unit.type).combatStrength;
    if (strength <= bestStrength) continue;
    bestStrength = strength;
    best = unit;
  }
  return best;
}

/**
 * The badge's artwork as something the DOM can wear: a URL for the half of the
 * set that is a file, a `data:` document for the half that is drawn.
 *
 * `BADGE_ICON_FILES` is asked rather than a second table written here — it is
 * the same file the atlas rasterises for the piece's own roundel, so the mark on
 * the plate and the mark on the board cannot drift. Relative, and resolved
 * against the document exactly as `loadIcon`'s `image.src` is.
 *
 * The eighteen composed naval cells have no file, and the rig is the half of a
 * ship's badge that says which line it is in — so they are composed here from
 * the same two mark tables the atlas composes, hull under canton. The
 * arrangement is restated rather than shared because the atlas prints a roundel
 * of paper at a hundred-odd pixels and this is an alpha mask at thirteen; the
 * two constants below are that restatement and the only numbers this file owns
 * about a drawing.
 */
const CANTON_SCALE = 0.42;
const CANTON_CENTRE = 0.72;

const badgeUriCache = new Map<BadgeClass, string>();

export function garrisonBadgeUri(badge: BadgeClass): string {
  const cached = badgeUriCache.get(badge);
  if (cached !== undefined) return cached;
  const file = (BADGE_ICON_FILES as Record<string, string | undefined>)[badge];
  const uri = file ?? navalBadgeUri(badge);
  badgeUriCache.set(badge, uri);
  return uri;
}

/**
 * A ship's mark as one document: the hull at full box, the canton at
 * `CANTON_SCALE` in the fly corner.
 *
 * Nested `<svg>` rather than a hand-built transform, so both halves come out of
 * `markSvg` — the one printer of a `MarkPath` list — and this file never learns
 * what a dash or a cap is. The canton is stroked heavier for the atlas's own
 * reason: a mark that kept the set's weight through a two-and-a-half-times
 * reduction comes out a hairline and disappears at this size.
 */
function navalBadgeUri(badge: BadgeClass): string {
  const pair = BADGE_MARK_PAIRS.get(badge as never);
  const box = NAVAL_MARK_BOX;
  const canton = pair
    ? NAVAL_CANTON_MARKS[pair.canton]
    : NAVAL_CANTON_MARKS.chevrons;
  const size = box * CANTON_SCALE;
  const at = box * CANTON_CENTRE - size / 2;
  const place = (doc: string, x: number, y: number, span: number): string =>
    doc.replace('<svg ', `<svg x="${x}" y="${y}" width="${span}" height="${span}" `);
  const parts = pair
    ? place(markSvg(NAVAL_HULLS[pair.rig].paths, box, NAVAL_MARK_STROKE), 0, 0, box) +
      place(markSvg(canton.paths, box, NAVAL_MARK_STROKE * 1.8), at, at, size)
    : place(markSvg(canton.paths, box, NAVAL_MARK_STROKE), 0, 0, box);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}">${parts}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * One town's slot, read off the pieces standing on its hex.
 *
 * The list is passed in rather than looked up, so the map-wide walk happens once
 * per refresh (see `garrisonsByCell`) and this stays a function of a stack.
 */
export function garrisonSlot(
  state: GameState,
  garrison: readonly Unit[],
): GarrisonSlot | null {
  const held = strongestGarrison(garrison);
  if (!held) return null;
  const name = unitDef(held.type).name;
  const others = garrison.length - 1;
  return {
    badge: badgeClassFor(held.type),
    ownerId: held.ownerId,
    count: garrison.length,
    // The seat's own ink, read from the *piece's* owner. Falls back to the
    // banner's own default rather than to nothing: a colourless rim is a badge
    // that reads as a hole, and a hand-edited save with a dangling owner is the
    // only way here.
    ink: state.players[held.ownerId]?.color ?? '#9fb0c2',
    label:
      others > 0
        ? `Standing here: ${name} and ${others} more`
        : `Standing here: ${name}`,
  };
}

/**
 * Whether this slot is a **control** for this seat, or only a reading.
 *
 * Three clauses, and each is a rule this card already keeps somewhere else:
 * there is something in there at all; the plate is live rather than a memory (a
 * banner drawn from `citySightings` is never a button — there is nothing to
 * select on ground nobody is watching, and the piece may have marched off twenty
 * turns ago); and the piece is **this seat's own**, read off the *unit* rather
 * than off the town, because a captured town garrisoned by its captor wears the
 * captor's icon and a player may only command their own pieces.
 *
 * Pure and exported for the reason `healthBar` and `growthRing` are: what a
 * press does is the part of this that can be quietly wrong on every banner at
 * once, and the suite that pins it cannot mount a DOM.
 */
export function garrisonSelectable(
  slot: GarrisonSlot | null,
  seat: number,
  stale: boolean,
): boolean {
  if (slot === null || stale) return false;
  return slot.ownerId === seat;
}

/**
 * What a live, watched city's banner says.
 *
 * Production and its turn estimate are computed from the same functions the
 * city panel and the simulation use, so a banner can never promise a turn
 * count the panel disagrees with.
 */
function watchedFacts(
  state: GameState,
  city: City,
  mine: boolean,
  garrison: readonly Unit[],
): BannerFacts {
  const facts: BannerFacts = {
    cityId: city.id,
    col: city.col,
    row: city.row,
    name: cityDisplayName(state, city),
    ownerId: city.ownerId,
    pop: `${city.population}`,
    growth: null,
    // On this side of the `mine` gate, deliberately: a town's hurt is a fact
    // about a thing this seat is watching, exactly like the size figure, and
    // the board already draws the same bar over every hurt piece it can see
    // whoever owns it. See "The wound on the foot".
    health: cityHealthBar(city),
    // On this side of the gate for the wound's reason exactly — see "The
    // garrison slot".
    garrison: garrisonSlot(state, garrison),
    production: '',
    puppet: mine && city.puppet === true,
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
 * No population, no growth, no hurt and no production even on your own city,
 * because none of the four is a thing a chart remembers — a size on a banner over
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
    // Nor its hurt: a sighting is a name and a flag, and a bar drawn from a
    // twenty-turn-old assault would be the interface reporting a siege that may
    // already have been lifted or lost.
    health: null,
    // Nor what was in it. An army is not something a chart remembers, and a
    // twenty-turn-old garrison quoted as current is the worst reading on this
    // surface — it is the one a player would march at.
    garrison: null,
    production: '',
    // A memory keeps a name and a flag and nothing else — see the docblock. Who
    // governs a town this seat has not looked at in twenty turns is exactly the
    // kind of figure that would be stale and read as current.
    puppet: false,
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
  // Hoisted once for the whole sweep, never asked per town — see
  // `garrisonsByCell`.
  const garrisons = garrisonsByCell(state);

  for (const city of state.cities) {
    if (!isVisibleTo(state, seat, city.col, city.row)) continue;
    shown.add(city.id);
    if (city.id === hiddenCityId) continue;
    facts.push(
      watchedFacts(
        state,
        city,
        city.ownerId === seat,
        garrisons.get(tileIndex(state.map, city.col, city.row)) ?? [],
      ),
    );
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

/** The channel and the ink in it, kept so a repaint is one width write. */
export interface HealthParts {
  root: HTMLElement;
  fill: HTMLElement;
}

/**
 * The bar as elements: a channel with one fill in it, built once per banner and
 * never rebuilt — the ring's discipline, and the text half's before it.
 *
 * Exported with its painter so `flair.html` can show the real bar rather than a
 * drawing of one. That is the cabinet's standing bargain (`flairGallery/main.ts`,
 * "Nothing is reproduced"): the gallery may lay this out and give it a ground,
 * and it may not own a second copy of what a width means.
 */
export function buildHealthBar(): HealthParts {
  const root = document.createElement('div');
  root.className = 'city-banner-health';
  const fill = document.createElement('span');
  fill.className = 'city-banner-health-fill';
  root.append(fill);
  return { root, fill };
}

/**
 * Paints one bar, or takes it away.
 *
 * The width is a **percentage of the channel** rather than a pixel count,
 * because the channel is as wide as the banner is and a banner is as wide as
 * its town's name: a fraction resolved in CSS cannot go stale when a city is
 * renamed or its queue changes length. Rounded to a hundredth of a percent for
 * `paintArc`'s reason — a width carried to the fifteenth decimal place is a
 * longer string than the element and moves nothing.
 *
 * `display` and not the `hidden` attribute, for the size box's reason: the
 * stylesheet gives this element a `display` of its own and an author rule
 * outranks `[hidden]`.
 */
export function paintHealthBar(parts: HealthParts, bar: HealthBar | null): void {
  parts.root.style.display = bar === null ? 'none' : '';
  if (bar === null) {
    parts.root.removeAttribute('title');
    parts.root.removeAttribute('role');
    parts.root.removeAttribute('aria-label');
    return;
  }
  parts.fill.style.width = `${(bar.filled * 100).toFixed(2)}%`;
  // The drawing is a glance and the figures are one hover away — the ring's
  // bargain. `role="img"` is what makes a label on a plain element reliably its
  // accessible *name* rather than a hint some readers drop.
  parts.root.title = bar.label;
  parts.root.setAttribute('role', 'img');
  parts.root.setAttribute('aria-label', bar.label);
}

/** The roundel and the numeral bossing it, kept so a repaint is three writes. */
export interface GarrisonParts {
  root: HTMLElement;
  mark: HTMLElement;
  count: HTMLElement;
}

/**
 * The slot as elements: a rimmed disc with a masked mark in it and a numeral in
 * its corner, built once per banner and never rebuilt — the ring's discipline
 * and the bar's before it.
 *
 * Exported with its painter for the health bar's reason, which is the cabinet's
 * standing bargain (`flairGallery/main.ts`, "Nothing is reproduced"): the
 * gallery may lay this out and give it a ground, and it may not own a second
 * copy of what a badge or a count means.
 */
export function buildGarrison(): GarrisonParts {
  const root = document.createElement('span');
  root.className = 'city-banner-garrison';
  const mark = document.createElement('span');
  mark.className = 'city-banner-garrison-mark';
  const count = document.createElement('span');
  count.className = 'city-banner-garrison-count';
  root.append(mark, count);
  return { root, mark, count };
}

/**
 * Paints one slot, or takes it away.
 *
 * `display` and not the `hidden` attribute, for the size box's reason: the
 * stylesheet gives this element a `display` of its own and an author rule
 * outranks `[hidden]`.
 *
 * The mark is a **mask** rather than an `<img>`, which is the yoke's trick and
 * is what lets the drawing take the plate's own ink and dim with the card. The
 * rim is the piece's seat ink through a custom property, so the one element
 * serves every seat and the wild.
 */
export function paintGarrison(parts: GarrisonParts, slot: GarrisonSlot | null): void {
  parts.root.style.display = slot === null ? 'none' : '';
  if (slot === null) {
    parts.root.removeAttribute('title');
    parts.root.removeAttribute('role');
    parts.root.removeAttribute('aria-label');
    return;
  }
  parts.root.style.setProperty('--garrison-color', slot.ink);
  parts.mark.style.setProperty('--garrison-mark', `url("${garrisonBadgeUri(slot.badge)}")`);
  // A stack's numeral, clamped to a digit for the board's own reason: nothing
  // stacks past nine, and a boss on a badge is not the place to find out
  // otherwise.
  parts.count.textContent = `${Math.min(9, slot.count)}`;
  parts.count.style.display = slot.count > 1 ? '' : 'none';
  // The drawing is a glance and the words are one hover away — the ring's
  // bargain. `role="img"` is what makes a label on a span reliably the element's
  // accessible *name* rather than a hint some readers drop.
  parts.root.title = slot.label;
  parts.root.setAttribute('role', 'img');
  parts.root.setAttribute('aria-label', slot.label);
}

export function createCityBanners(options: CityBannersOptions): CityBanners {
  const {
    container,
    renderer,
    getGame,
    localPlayerId,
    onOpenCity,
    openCity,
    onHoverCity,
    onSelectGarrison,
  } = options;
  const banners = new Map<number, Banner>();

  function build(cityId: number): Banner {
    const root = document.createElement('div');
    root.className = 'city-banner';

    const name = document.createElement('span');
    name.className = 'city-banner-name';
    // The town's own mark, in the same hand as the flag's — one drawing, two
    // printers (`src/art/cityMarks.ts`): the board traces it into the icon
    // atlas, and here it is a mask in `currentColor`, so the yoke on the banner
    // and the yoke on the flag are the same yoke.
    const yoke = document.createElement('span');
    yoke.className = 'city-banner-yoke';
    yoke.setAttribute('role', 'img');
    yoke.setAttribute('aria-label', 'Held as a puppet');
    yoke.title = 'Held as a puppet — annex it to govern it';
    yoke.style.setProperty('--yoke-mark', `url("${cityMarkDataUri('puppet')}")`);
    yoke.hidden = true;
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
    // At the **hoist**, between the size roundel and the name (U6): the two
    // discs that open the plate are how big the town is and what is standing in
    // it, at one diameter, in the corner the eye lands on. See "The garrison
    // slot" for what the fly cost.
    const garrison = buildGarrison();
    // Last in the DOM and first on the eye: the channel is positioned on the
    // pill's foot rather than laid out in its row, so the order here is the
    // reading order — name, queue, and then the wound underneath both.
    const health = buildHealthBar();

    root.append(size, garrison.root, name, yoke, production, health.root);
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
      yoke,
      garrison,
      health,
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
    // Whose screen this is, read once for the sweep: the ring, the queue and now
    // the icon's press all turn on it, and it can change under a banner.
    const seat = localPlayerId();

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
      // A garrisoned pill is a wider pill, and the wound on its foot has to stop
      // short of the roundel exactly as it stops short of the size badge at the
      // hoist. A class rather than a written inset, so the geometry stays in the
      // stylesheet where the rest of the pill's geometry is.
      banner.root.classList.toggle('is-held', facts.garrison !== null);
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
      // **The bar is a signature term too**, and this is the whole of "it
      // rebuilds only when the town's hit points move": nothing here polls, and
      // a banner is rewritten exactly when what it says changes. The label
      // carries the figures and the breach, so a blow that lands and a wall
      // that finishes both move it; the fraction is carried beside it at the
      // precision the width is written to, so a town healing a point at a time
      // repaints and a town at rest does not. The 3D city fingerprint
      // (`signCities`/`CityLook`) is deliberately *not* where this lives: that
      // one gates the houses, the pole and the walls, and hit points change
      // none of them — a town would rebuild its sculpt every time it was
      // scratched, and the banner is not in that layer at all.
      const hurt = facts.health;
      const wound = hurt === null ? '' : `${hurt.filled.toFixed(4)}/${hurt.label}`;
      // **The garrison is a signature term too**, and it is the whole of "the
      // plate repaints when the stack changes and not otherwise": what the slot
      // draws is a badge, a rim ink and a count, so all three are in and nothing
      // else about the pieces is. A scout crossing empty ground on the far side
      // of the map moves `signUnits` and must not move this — which is why the
      // term is the *slot* rather than anything about `state.units`.
      const held = facts.garrison;
      const stack = held === null ? '' : `${held.badge}/${held.ownerId}/${held.count}`;
      const signature = `${facts.pop}|${arcs}|${growth?.label ?? ''}|${wound}|${stack}|${
        facts.name
      }|${facts.production}|${facts.stale ? 1 : 0}|${facts.puppet ? 1 : 0}`;
      if (signature !== banner.signature) {
        banner.signature = signature;
        // A signature term for the reason every other one is: annexing a town
        // is a thing this banner says, so it is rewritten when that changes and
        // never polled.
        banner.yoke.hidden = !facts.puppet;
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
        paintHealthBar(banner.health, facts.health);
        paintGarrison(banner.garrison, facts.garrison);
        banner.name.textContent = facts.name;
        banner.production.textContent = facts.production;
        banner.production.hidden = facts.production === '';
      }

      // Rebound every refresh: the seat can change under a banner, and a label
      // that used to be yours must stop being a button. A remembered city is
      // never a button either — there is no panel to open on a memory.
      banner.root.onclick =
        facts.mine && !facts.stale ? () => onOpenCity(facts.cityId) : null;

      // And the icon at the hoist, on the same beat and for the same reason —
      // the piece in a town changes far more often than the town does. The class
      // is what gives the disc the pointer back (the pill takes it away on
      // everybody else's banner) and what says so with the cursor; the handler
      // stops the press reaching the pill under it, or selecting a piece would
      // also open the city screen it is standing in.
      const own = garrisonSelectable(facts.garrison, seat, facts.stale);
      banner.garrison.root.classList.toggle('is-own', own);
      banner.garrison.root.onclick = own
        ? (event: MouseEvent) => {
            event.stopPropagation();
            onSelectGarrison?.(facts.col, facts.row);
          }
        : null;
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
