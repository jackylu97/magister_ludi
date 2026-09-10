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
 * The garrison row
 * ----------------
 * The user's ruling of 2026-09-09 (`docs/flags.md` (ooo), U8): *"I'm still
 * unhappy with the city banners and unit visibility. Is it difficult to have the
 * list of units in a city appear above the banner?"* — and it is not. The pieces
 * standing on a town's own hex are listed **above the plate** as a row of
 * roundels, one per piece, centred over the pill and overlapping its top edge by
 * a few pixels so the row reads as standing *in* the town (the user, 2026-09-10:
 * *"so it's clearer that the unit is 'in' the city"* — U8 shipped with a clear
 * gap, and a day of play said the gap read as floating). The U6 objection
 * (*"it makes it look like the unit is part of the city"*) was to a badge set
 * *into* the plate's face; a roundel resting on its edge is a piece at the gate,
 * not a field of the label, and the overlap is kept small for that reason
 * (`style.css`, `.city-banner-garrison`).
 *
 * Four passes came before it and each is worth a line, because the failures are
 * all the same failure. U4 hung a mark over the 3D flagpole and the plate
 * covered it. U5 set a roundel at the pill's fly and the user could not find it.
 * U6 moved it to the hoist and hid the piece's own tag — *part of the city*. U7
 * gave up on the plate carrying anything and lifted it above the pole so the
 * pieces' own 3D roundels could stand under it, and the pieces stayed invisible:
 * a tag forty pixels wide floating on a diorama is not a list, however correctly
 * it is placed. So the list is DOM, on the surface that is already an interface.
 *
 * What a roundel is, precisely:
 *
 *   the drawing   the atlas's own cell for that unit class, printed into a small
 *                 canvas (`ui/unitRoundels.ts`) — the same mark the board floats
 *                 over the piece, and the wild's red print for a wild one (the
 *                 user's V2 ruling). One drawing, two printers.
 *   the rim       the piece's **owner's** ink, which is the board's rule read off
 *                 `unitColor`: a captured town garrisoned by its captor shows the
 *                 captor's colour, because the row is about pieces and not about
 *                 the town under them.
 *   the wound     a hit bar under the roundel of a piece that is hurt, and under
 *                 nobody else's — `hpBarFill`'s rule, asked rather than restated,
 *                 so a wounded warrior and a wounded town appear and disappear by
 *                 one law. The pip floor is `hpBarFillWidth`'s, for its reason.
 *   the selection the piece in hand is ringed the way the board rings it:
 *                 `badges.selectedRimShade`, the same lift toward white.
 *   the press     a click selects that piece, through the one seam every other
 *                 way of aiming at a piece ends at (`controls.selectPiece`). Only
 *                 your own answer, which is `ownUnitsAt`'s rule.
 *
 * Past four it **fans** — the roundels overlap rather than widening a row that
 * would otherwise outgrow the plate it hangs over — and past eight the remainder
 * is a `+N` chip, which is the numeral the board's own stack marks stop at.
 *
 * The row is rebuilt off the board's own piece fingerprint (`signUnits`) and
 * never per frame: `refresh` re-walks the pieces only when that hash moves, and
 * the row's own signature term decides whether the DOM under one banner is
 * rewritten. The *projection* still runs per drawn frame, which is what the
 * plate has always done — see `reposition`.
 *
 * A **remembered** town carries no row at all. An army is not something a chart
 * remembers, and a twenty-turn-old garrison quoted as current is the worst
 * reading this surface could offer: it is the one a player would march at.
 *
 * Where the plate hangs
 * ---------------------
 * At the top of the flagpole, plus one dialled gap (`city.bannerClearance`) —
 * which is where it hung before U7 and where it hangs again. U7's rise cleared
 * everything a piece could float on that hex, because the pieces' own roundels
 * had to be legible *under* the plate; the row above the plate carries those
 * icons now, so there is nothing over the pole left to clear and the plate comes
 * back down to the town it is labelling. `tallestPieceRise` retired with the
 * arrangement it measured.
 *
 * `reposition` projects a point `BANNER_RISE` above the tile's top face rather
 * than the face itself (`projectCell`'s `rise`). A world rise and not a pixel
 * margin, which is the one part of U7 worth keeping: the plate's foot sits where
 * the camera says it sits at every zoom, where the `-46px` it replaced was right
 * at exactly one.
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
import { type City, type GameState, type Unit, isBarbarian } from '../sim/state';
import { unitDef, unitMaxHp } from '../sim/unitData';
import { type CitySighting, isExploredBy, isVisibleTo } from '../sim/visibility';
import { cityDisplayName } from './cityDisplay';
import { cityMarkDataUri } from '../art/cityMarks';
import { type BadgeClass, cssHex } from '../render3d/badges3d';
import { badgeClassFor } from '../render3d/board3d';
import { VIEW3D, shade } from '../render3d/lookData';
import { hpBarFill, hpBarFillWidth, signUnits, unitColor } from '../render3d/pieces';
import { dressRoundel, roundelZoom } from './unitRoundels';
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
   * The piece in hand, or `null` — read fresh every `refresh()`, exactly as the
   * open city is, so the ring on the row follows the selection with no event to
   * forget to send.
   */
  selectedUnitId?: () => number | null;
  /**
   * The player pressed a roundel in a town's garrison row: select that piece.
   *
   * The **unit** and not its tile, which is where this parts company with the
   * board's own badge (`selectOnTile` cycles a stack, because a fan of tags
   * round one hex centre gives the pointer no way to say which piece it meant).
   * A row is a list: the third roundel is the third piece, and a press on it
   * that selected the first would be the list lying about what it is. It still
   * ends at the one seam every other way of aiming at a piece ends at — see
   * `controls.selectPiece`, whose own rule decides which pieces answer at all.
   */
  onSelectPiece?: (unitId: number) => void;
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
  /** The channel on the banner's foot. See "The wound on the foot". */
  health: HealthParts;
  /**
   * The row of roundels above the plate. One box per banner, its children
   * rebuilt when the pieces standing in the town change — see "The garrison
   * row".
   */
  garrison: HTMLElement;
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
   * What is standing on the town's own hex, or `null` for a hex with nothing on
   * it — and for a remembered town, which keeps no army at all. See "The
   * garrison row".
   *
   * On the watched side of the `mine` gate for the wound's reason exactly: a
   * garrison is a thing this seat is *looking at*, and the board already draws
   * every piece it can see whoever owns it.
   */
  garrison: GarrisonRow | null;
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

// --- the garrison row -------------------------------------------------------

/**
 * How long the row is allowed to get, and when it starts overlapping.
 *
 * Both are the user's ruling of 2026-09-09 (`docs/flags.md` (ooo)) rather than
 * numbers chosen here, and both are about the row staying a *glance*: four
 * roundels sit side by side over a plate whose own width is a town's name, five
 * would start to outgrow it, and past eight a player is counting rather than
 * reading — which is the point the board's own stack marks stop at too.
 */
export const GARRISON_ROW = { cap: 8, fanFrom: 4 } as const;

/** One piece in a town, as the row draws it. */
export interface GarrisonPiece {
  unitId: number;
  /** The atlas cell its mark is printed from — `badgeClassFor`, the board's own. */
  badge: BadgeClass;
  ownerId: number;
  /** The wild's roundel is printed on red, mark inverted to bone (the V2 ruling). */
  wild: boolean;
  /** The rim's ink, as CSS: the *piece's owner's*, exactly as the board rims it. */
  ink: string;
  /**
   * How full its hit bar is, or `null` for a piece that is whole and draws none.
   * `hpBarFill`'s rule and its figure — never a second reading of a wound.
   */
  hurt: number | null;
  /** The piece in hand, which is ringed the way the board rings it. */
  selected: boolean;
  /** This seat may command it, so its roundel is a control. See `commandable`. */
  mine: boolean;
  /** What it is, in plain words, for the tooltip and the screen reader. */
  label: string;
}

/** A town's row: what it draws, whether it fans, and what it could not fit. */
export interface GarrisonRow {
  /** In the stack's own order (`state.units`), capped at `GARRISON_ROW.cap`. */
  pieces: GarrisonPiece[];
  /** How many more are standing there than the row drew. Zero, or the `+N`. */
  more: number;
  /** True once the roundels overlap rather than standing apart. */
  fanned: boolean;
}

/**
 * Every unit standing on a town's own hex, by the tile that town stands on.
 *
 * One walk over the pieces rather than one walk per city, for `tileOwnerField`'s
 * reason a layer down: a map-wide question asked once per town is quadratic on
 * the boards this interface is meant to survive. Hoisted once per refresh and
 * handed to `visibleCityBanners`, exactly as a sweep hoists a field — and, since
 * U8, re-walked only when the board's own piece fingerprint moves (see
 * `createCityBanners`).
 *
 * `state.units` order throughout, which is the state's own and therefore the
 * order the board fans a stack in and the order a click cycles it in. A row that
 * sorted by strength would put the third roundel over the second piece.
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
 * Whether a press on this piece's roundel is a control for this seat.
 *
 * `ownUnitsAt`'s rule in `controls.ts`, read one surface over rather than
 * re-derived: your own piece, and not a caravan walking a route — a trader on
 * its route answers no orders at all (the user, 2026-09-06), so a roundel that
 * offered to pick one up would be offering an empty hand. A rival's roundel is
 * a reading and not a control, which is the `mine` rule this banner has always
 * kept for its buttons.
 */
export function commandable(unit: Unit, seat: number): boolean {
  return unit.ownerId === seat && unit.trade === undefined;
}

/**
 * One town's row, read off the pieces standing on its hex.
 *
 * The list is passed in rather than looked up, so the map-wide walk happens once
 * per refresh (see `garrisonsByCell`) and this stays a function of a stack.
 *
 * `null` for an empty hex, which is the health bar's rule and its reason: a row
 * of nothing over every quiet town on the map is forty pieces of furniture
 * saying nothing, and what a player needs to see from across the board is which
 * of their towns is *held*.
 */
export function garrisonRow(
  state: GameState,
  garrison: readonly Unit[],
  seat: number,
  selectedUnitId: number | null,
): GarrisonRow | null {
  if (garrison.length === 0) return null;
  const pieces: GarrisonPiece[] = [];
  for (const unit of garrison.slice(0, GARRISON_ROW.cap)) {
    const wild = isBarbarian(state, unit.ownerId);
    const hurt = hpBarFill(unit);
    const name = unitDef(unit.type).name;
    const selected = unit.id === selectedUnitId;
    // The board's own rim: `unitColor` rather than the player's raw colour, so a
    // caravan on a route reads as busy here exactly as it does out on the map.
    // The wild takes the parchment rim the board gives it — its ink is the disc
    // now, and a red ring round a red disc is a ring nobody sees.
    const rim = wild ? VIEW3D.badges.wildRimColor : unitColor(state, unit);
    pieces.push({
      unitId: unit.id,
      badge: badgeClassFor(unit.type),
      ownerId: unit.ownerId,
      wild,
      ink: selected ? selectedRim(rim) : cssHex(rim),
      hurt,
      selected,
      mine: commandable(unit, seat),
      // The figures follow the town's own hover (`healthBar`): the same order,
      // the same words, one hover away from a drawing that is only a glance.
      label: hurt === null ? name : `${name} · ${unit.hp}/${unitMaxHp(unit)} hp`,
    });
  }
  return {
    pieces,
    more: Math.max(0, garrison.length - GARRISON_ROW.cap),
    fanned: garrison.length > GARRISON_ROW.fanFrom,
  };
}

/**
 * The rim a *selected* piece's roundel takes: the board's own lift toward white.
 *
 * `shade` at `badges.selectedRimShade`, which is the one line in `addBadge` that
 * says what a selection looks like on a badge. Asked rather than restated, so
 * the row and the board cannot mark the piece in hand two different ways.
 */
export function selectedRim(ink: number): string {
  return cssHex(shade(ink, VIEW3D.badges.selectedRimShade));
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
  seat: number,
  garrison: readonly Unit[],
  selectedUnitId: number | null,
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
    // On this side of the gate for the wound's reason exactly — a garrison is a
    // thing this seat is watching. See "The garrison row".
    garrison: garrisonRow(state, garrison, seat, selectedUnitId),
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
    // Nor what was standing in it. An army is not something a chart remembers,
    // and a twenty-turn-old garrison quoted as current is the worst reading on
    // this surface — it is the one a player would march at.
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
 *
 * The last two arguments are the garrison row's, and both default to the honest
 * answer for a caller that has none: nothing selected, and the walk done here.
 * The live surface passes its own **cached** walk (see `createCityBanners`),
 * which is the whole of "the row rebuilds off `signUnits`".
 */
export function visibleCityBanners(
  state: GameState,
  seat: number,
  hiddenCityId: number | null,
  selectedUnitId: number | null = null,
  garrisons: ReadonlyMap<number, Unit[]> = garrisonsByCell(state),
): BannerFacts[] {
  const facts: BannerFacts[] = [];
  const shown = new Set<number>();

  for (const city of state.cities) {
    if (!isVisibleTo(state, seat, city.col, city.row)) continue;
    shown.add(city.id);
    if (city.id === hiddenCityId) continue;
    facts.push(
      watchedFacts(
        state,
        city,
        city.ownerId === seat,
        seat,
        garrisons.get(tileIndex(state.map, city.col, city.row)) ?? [],
        selectedUnitId,
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

// --- the garrison row, as elements ------------------------------------------

/**
 * The row as an element: an empty box, built once per banner and filled when the
 * pieces standing in the town change.
 *
 * Exported with its painter so `flair.html` can show the real row rather than a
 * drawing of one. That is the cabinet's standing bargain (`flairGallery/main.ts`,
 * "Nothing is reproduced"): the gallery may lay this out and give it a ground,
 * and it may not own a second copy of what a roundel, a fan or a `+N` means.
 */
export function buildGarrisonRow(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'city-banner-garrison';
  // The zoom that makes the printed cell's *paper* fill the element it is worn
  // on, written once per row from the atlas's own overlap rather than typed into
  // the stylesheet. See `roundelZoom`.
  root.style.setProperty('--roundel-zoom', `${(roundelZoom() * 100).toFixed(2)}%`);
  return root;
}

/**
 * Paints one row, or takes it away.
 *
 * **Rebuilt wholesale**, which is the one place this module does that and is
 * exactly what its caller's gate buys: the children of this box are a list whose
 * *length* changes, so a patch would be a diff of the same information the
 * signature already carries. It is rebuilt when the pieces move and at no other
 * time — never per frame, and never per refresh.
 *
 * `display` and not the `hidden` attribute, for the size box's reason: the
 * stylesheet gives this element a `display` of its own and an author rule
 * outranks `[hidden]`.
 */
export function paintGarrisonRow(
  root: HTMLElement,
  row: GarrisonRow | null,
  onSelectPiece?: (unitId: number) => void,
): void {
  root.style.display = row === null ? 'none' : '';
  root.replaceChildren();
  // Toggled before the empty case returns: a row that emptied while it was
  // fanned would otherwise keep the class, and the next piece to walk in would
  // find it already overlapping.
  root.classList.toggle('is-fanned', row?.fanned === true);
  if (row === null) return;

  for (const piece of row.pieces) {
    const seat = document.createElement('span');
    seat.className = 'city-banner-piece';
    seat.classList.toggle('is-selected', piece.selected);
    seat.classList.toggle('is-wild', piece.wild);
    seat.style.setProperty('--roundel-ink', piece.ink);
    // The drawing is a glance and the name is one hover away — the ring's
    // bargain, and the bar's. `role="img"` is what makes a label on a span
    // reliably the element's accessible *name* rather than a hint some readers
    // drop.
    seat.title = piece.label;
    seat.setAttribute('role', 'img');
    seat.setAttribute('aria-label', piece.label);

    const disc = document.createElement('span');
    disc.className = 'city-banner-piece-disc';
    // The atlas's own cell, printed for this class and this pair of inks. It may
    // arrive a moment later (a file has to be fetched), and the roundel is a
    // roundel in the meantime — see `dressRoundel`.
    dressRoundel(disc, piece.badge, piece.wild);
    seat.append(disc);

    if (piece.hurt !== null) {
      const bar = document.createElement('span');
      bar.className = 'city-banner-piece-bar';
      const fill = document.createElement('span');
      fill.className = 'city-banner-piece-fill';
      // The board's own two colours and its own pip floor: `hpBarFillWidth` as a
      // fraction of the bar it is drawn in, so a piece at one hit point still
      // draws something here exactly as it does out on the map, and neither
      // surface can decide on its own how hurt a piece looks.
      fill.style.width = `${((hpBarFillWidth(piece.hurt) / VIEW3D.hpBar.width) * 100).toFixed(2)}%`;
      fill.style.background = cssHex(
        piece.hurt > 0.5 ? VIEW3D.hpBar.goodColor : VIEW3D.hpBar.fillColor,
      );
      bar.append(fill);
      seat.append(bar);
    }

    // A press is a control only on your own piece, and the class is what hands
    // the disc the pointer back and says so with the cursor. The handler stops
    // the press reaching the pill under it, or selecting a piece would also open
    // the city screen it is standing in.
    if (piece.mine && onSelectPiece) {
      seat.classList.add('is-own');
      seat.onclick = (event: MouseEvent): void => {
        event.stopPropagation();
        onSelectPiece(piece.unitId);
      };
    }
    root.append(seat);
  }

  if (row.more > 0) {
    const more = document.createElement('span');
    more.className = 'city-banner-piece-more';
    more.textContent = `+${row.more}`;
    root.append(more);
  }
}

/**
 * The row's signature: what has to change before its DOM is rewritten.
 *
 * Every term is something the row *draws* — which piece, in what mark, in whose
 * ink, how hurt, and whether it is the one in hand — so a stack that has not
 * moved costs a string compare, and a blow landing on the second piece rewrites
 * the row it is drawn in. The `+N` is in it because a ninth piece arriving
 * changes the chip and nothing else.
 */
export function garrisonSignature(row: GarrisonRow | null): string {
  if (row === null) return '';
  const pieces = row.pieces
    .map(
      (piece) =>
        `${piece.unitId}:${piece.badge}:${piece.ink}:${piece.hurt?.toFixed(3) ?? ''}:${
          piece.selected ? 1 : 0
        }:${piece.mine ? 1 : 0}`,
    )
    .join(',');
  return `${pieces}+${row.more}${row.fanned ? 'f' : ''}`;
}

// --- where the plate hangs --------------------------------------------------

const CITY_LOOK = VIEW3D.city;

/**
 * How far above the tile's top face the banner's foot is anchored, in world
 * units. See "Where the plate hangs".
 *
 * The flagpole the town flies its own colours from, plus the one dialled gap —
 * which is where the plate hung before U7 and where U8 puts it back. U7 raised
 * it over everything a *piece* could float on that hex, because the pieces' own
 * roundels had to be legible under it; the garrison row above the plate carries
 * those icons now, so nothing over the pole is left to clear and the label comes
 * back down to the town it names. `tallestPieceRise` retired with the
 * arrangement it measured.
 */
export function bannerRise(): number {
  return CITY_LOOK.poleHeight + CITY_LOOK.bannerClearance;
}

/**
 * The rise, resolved once for the page.
 *
 * Nothing in it can change while a game is running — the look table is loaded
 * data and the roster is fixed — so `reposition`, which runs per drawn frame,
 * reads a constant rather than walking the roster sixty times a second.
 */
export const BANNER_RISE = bannerRise();

export function createCityBanners(options: CityBannersOptions): CityBanners {
  const {
    container,
    renderer,
    getGame,
    localPlayerId,
    onOpenCity,
    openCity,
    onHoverCity,
    selectedUnitId,
    onSelectPiece,
  } = options;
  const banners = new Map<number, Banner>();

  /**
   * The pieces standing in each town, re-walked only when the board's own piece
   * fingerprint moves.
   *
   * `signUnits` is the hash the 3D unit layer rebuilds on (`render3d/pieces.ts`)
   * — id, hex, hit points, owner, type, charges, person, route — which is
   * exactly the set of facts a roundel draws. So this layer is a fingerprint
   * reader like that one, and for the same reason: `refresh()` runs on every
   * accepted command and every selection, and a walk over the whole army each
   * time to answer "did anybody move" is the walk the fingerprint exists to
   * replace.
   *
   * The state object is part of the key beside the hash. A load or a new game
   * hands this module a different `GameState` that could in principle hash the
   * same, and the cached list would then be pieces from a game that is over.
   */
  let walked: { state: GameState; stamp: number; cells: Map<number, Unit[]> } | null = null;
  function garrisons(state: GameState): ReadonlyMap<number, Unit[]> {
    const stamp = signUnits(state);
    if (walked && walked.state === state && walked.stamp === stamp) return walked.cells;
    walked = { state, stamp, cells: garrisonsByCell(state) };
    return walked.cells;
  }

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
    // Last in the DOM and first on the eye: the channel is positioned on the
    // pill's foot rather than laid out in its row, so the order here is the
    // reading order — name, queue, and then the wound underneath both.
    const health = buildHealthBar();
    // And the garrison row, which is positioned *above* the pill rather than laid
    // out in its row (see "The garrison row"): last in the DOM because it is the
    // only child that is not part of the label, and first in the reading because
    // it is what the eye lands on over a town somebody is holding.
    const garrison = buildGarrisonRow();

    root.append(size, name, yoke, production, health.root, garrison);
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
      health,
      garrison,
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
    return visibleCityBanners(
      state,
      localPlayerId(),
      openCity()?.id ?? null,
      selectedUnitId?.() ?? null,
      garrisons(state),
    );
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
      // **The garrison row is a signature term too**, and this is the whole of
      // "it rebuilds when the pieces move and never otherwise": the walk above
      // it is gated on `signUnits`, and this decides whether *this* town's row
      // is rewritten from the walk's answer. A piece marching in or out, a blow
      // landing on one of them, a seat capturing one, the player picking one up
      // — each moves a term, and a quiet garrison moves none.
      const held = garrisonSignature(facts.garrison);
      const signature = `${facts.pop}|${arcs}|${growth?.label ?? ''}|${wound}|${held}|${
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
        paintGarrisonRow(banner.garrison, facts.garrison, onSelectPiece);
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

  /**
   * Moves every banner to where its city is on screen. Runs per drawn frame.
   *
   * The point is `BANNER_RISE` above the tile's top face rather than the face
   * itself, which is the whole of U7: the plate hangs from a world point over
   * the flagpole, so the pieces standing on the hex keep their own roundels
   * underneath it at every zoom. See "Where the plate hangs".
   */
  function reposition(): void {
    if (!renderer.projectCell) return;
    for (const banner of banners.values()) {
      const point = renderer.projectCell(banner.col, banner.row, BANNER_RISE);
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
